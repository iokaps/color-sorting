import { kmClient } from '@/services/km-client';
import { factionActions } from '@/state/actions/faction-actions';
import { scoringActions } from '@/state/actions/scoring-actions';
import { globalStore, type ColorName } from '@/state/stores/global-store';
import { generateColorArray } from '@/utils/color-utils';
import { useSnapshot } from '@kokimoki/app';
import { useEffect, useRef } from 'react';
import { useServerTimer } from './useServerTime';

/**
 * Hook to control and modify the global state
 * @returns A boolean indicating if the current client is the global controller
 */
export function useGlobalController() {
	const {
		controllerConnectionId,
		roundActive,
		roundStartTimestamp,
		numberOfColors
	} = useSnapshot(globalStore.proxy);
	const connections = useSnapshot(globalStore.connections);
	const connectionIds = connections.connectionIds;
	const isGlobalController = controllerConnectionId === kmClient.connectionId;
	const serverTime = useServerTimer(1000); // tick every second
	const roundEndedRef = useRef(false);
	const lastRoundStartRef = useRef(0);

	// Maintain connection that is assigned to be the global controller
	useEffect(() => {
		// Check if global controller is online
		if (connectionIds.has(controllerConnectionId)) {
			return;
		}

		// Select new host, sorting by connection id
		kmClient
			.transact([globalStore], ([globalState]) => {
				const connectionIdsArray = Array.from(connectionIds);
				connectionIdsArray.sort();
				globalState.controllerConnectionId = connectionIdsArray[0] || '';
			})
			.then(() => {})
			.catch(() => {});
	}, [connectionIds, controllerConnectionId]);

	// Clear factions when a new round starts
	// IMPORTANT: Clear AFTER results are calculated (not immediately)
	// This ensures calculation has access to all connection data
	useEffect(() => {
		if (!isGlobalController || roundStartTimestamp === 0) return;
		if (roundStartTimestamp <= lastRoundStartRef.current) return;

		// New round started - clear factions AFTER a longer delay
		// to ensure previous round's results calculation is complete
		lastRoundStartRef.current = roundStartTimestamp;

		const timeout = setTimeout(async () => {
			try {
				// Clear all faction data in the unified store
				await factionActions.clearAllFactions();
			} catch {
				// Silently ignore errors
			}
		}, 500); // Wait 500ms to allow previous round results calculation to complete

		return () => clearTimeout(timeout);
	}, [isGlobalController, roundStartTimestamp, numberOfColors]);

	// Run global controller-specific logic
	useEffect(() => {
		if (!isGlobalController) {
			roundEndedRef.current = false;
			return;
		}

		// Auto-end round after customizable duration
		if (roundActive) {
			const roundDurationMs =
				(globalStore.proxy.roundDurationSeconds || 90) * 1000;
			const elapsedMs = Math.max(0, serverTime - roundStartTimestamp);

			if (elapsedMs >= roundDurationMs && !roundEndedRef.current) {
				roundEndedRef.current = true;

				const localCOLORS = generateColorArray(numberOfColors);
				scoringActions
					.calculateAndSaveRoundResults(localCOLORS)
					.catch(console.error);
			}
		} else {
			// Reset flag when round ends
			roundEndedRef.current = false;
		}
	}, [
		isGlobalController,
		serverTime,
		roundActive,
		roundStartTimestamp,
		numberOfColors
	]);

	// Assign colors to late-joining players during active round
	useEffect(() => {
		if (!isGlobalController || !roundActive) return;

		const assignColorToLateJoiners = async () => {
			const playerColors = globalStore.proxy.playerColors;
			const onlinePlayerIds = Array.from(connectionIds);

			// Find players without color assignment
			const playersWithoutColor = onlinePlayerIds.filter(
				(id) => !playerColors[id]
			);

			if (playersWithoutColor.length === 0) return;

			// Count current color assignments for balance
			const colorCounts: Record<ColorName, number> = {};
			const COLORS = generateColorArray(numberOfColors);

			// Initialize counts for all available colors
			for (const color of COLORS) {
				colorCounts[color] = 0;
			}

			for (const color of Object.values(playerColors)) {
				if (color && color in colorCounts) {
					colorCounts[color]++;
				}
			}

			// Assign colors to late joiners (pick least-used color)
			await kmClient.transact([globalStore], ([globalState]) => {
				const localCOLORS = generateColorArray(numberOfColors);
				for (const playerId of playersWithoutColor) {
					// Find the color with fewest players
					const bestColor = localCOLORS.reduce((best, color) =>
						colorCounts[color] < colorCounts[best] ? color : best
					);

					globalState.playerColors[playerId] = bestColor;
					colorCounts[bestColor]++;
				}
			});
		};

		assignColorToLateJoiners().catch(console.error);
	}, [isGlobalController, roundActive, connectionIds, numberOfColors]);

	return isGlobalController;
}
