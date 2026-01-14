import { kmClient } from '@/services/km-client';
import { colorActions } from '@/state/actions/color-actions';
import { scoringActions } from '@/state/actions/scoring-actions';
import type { ColorFactionState } from '@/state/stores/color-store';
import {
	globalStore,
	type ColorName,
	type PlayerRoundScore
} from '@/state/stores/global-store';
import { generateColorArray } from '@/utils/color-utils';
import type { KokimokiStore } from '@kokimoki/app';
import { useSnapshot } from '@kokimoki/app';
import { useEffect, useRef } from 'react';
import { useServerTimer } from './useServerTime';

// Global cache for color stores - managed via useDynamicStore in other components
const colorStoresCache = new Map<ColorName, KokimokiStore<ColorFactionState>>();

/**
 * Register a color faction store in the global cache
 * Called by ColorSortingView and ColorPresenterView when they join stores
 */
export function registerColorStore(
	color: ColorName,
	store: KokimokiStore<ColorFactionState>
) {
	colorStoresCache.set(color, store);
}

/**
 * Get the color stores cache for clearing during game reset
 */
export function getColorStoresCache(): Map<
	ColorName,
	KokimokiStore<ColorFactionState>
> {
	return colorStoresCache;
}

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

	// Get dynamic colors based on numberOfColors
	const COLORS = generateColorArray(numberOfColors);

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
	}, [connectionIds, controllerConnectionId, numberOfColors]);

	// Clear color stores when a new round starts
	// IMPORTANT: Clear AFTER results are calculated (not immediately)
	// This ensures calculation has access to all connection data
	useEffect(() => {
		if (!isGlobalController || roundStartTimestamp === 0) return;
		if (roundStartTimestamp <= lastRoundStartRef.current) return;

		// New round started - clear stores AFTER a longer delay
		// to ensure previous round's results calculation is complete
		lastRoundStartRef.current = roundStartTimestamp;

		const timeout = setTimeout(async () => {
			try {
				const localCOLORS = generateColorArray(numberOfColors);

				// Clear all color stores - both cached and all 10 possible colors
				// This ensures connections are reset even if some stores aren't in the cache
				const allPossibleColors = generateColorArray(10); // all 10 possible colors
				const storesToClear = [
					...localCOLORS.map((c) => colorStoresCache.get(c)),
					...allPossibleColors.map((c) => colorStoresCache.get(c))
				].filter((store) => store !== undefined);

				// Remove duplicates by store reference
				const uniqueStores = Array.from(
					new Map(storesToClear.map((s) => [s, s])).values()
				);

				// Clear each store's faction data
				for (const store of uniqueStores) {
					if (store) {
						await colorActions.clearFaction(store);
					}
				}
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

				// Calculate largest faction for each color - PARALLELIZED
				const calculateRoundResults = async () => {
					// Wait for all stores to sync their data before calculating results
					// This ensures all player connections and edges are propagated
					await new Promise((resolve) => setTimeout(resolve, 250));

					const localCOLORS = generateColorArray(numberOfColors);
					// Initialize results with all colors (not just the hardcoded 4)
					const results: Record<ColorName, number> = {};
					localCOLORS.forEach((color) => {
						results[color] = 0;
					});

					try {
						// Calculate all faction sizes from currently accessible stores
						for (const color of localCOLORS) {
							const store = colorStoresCache.get(color);
							if (store) {
								const factionSize = colorActions.calculateLargestFaction(store);
								results[color] = factionSize;
							}
						}
					} catch (error) {
						console.error('Error calculating round results:', error);
					}

					// Find winning color(s) - support ties
					const maxSize = Math.max(...localCOLORS.map((c) => results[c]), 0);
					const winningColors: ColorName[] = localCOLORS.filter(
						(c) => results[c] === maxSize && maxSize > 0
					);

					// Get current state values before transact
					const currentRoundNumber = globalStore.proxy.roundNumber;
					const colorNamesMap = globalStore.proxy.colorNames;
					const winBonus = globalStore.proxy.winBonus || 10;

					// Calculate individual player scores for each color
					const playerScoresThisRound: Record<string, PlayerRoundScore> = {};

					for (const color of localCOLORS) {
						const colorStore = colorStoresCache.get(color);
						if (!colorStore) continue;

						// Get connection points for each player in this color
						const connectionPoints =
							scoringActions.calculatePlayerConnectionPoints(colorStore);

						// Get players in winning faction
						const winningPlayers =
							scoringActions.getWinningFactionPlayers(colorStore);

						// Score each player in this color
						for (const [playerId, points] of Object.entries(connectionPoints)) {
							const isWinner =
								winningColors.includes(color) && winningPlayers.has(playerId);
							const bonusPoints = isWinner ? winBonus : 0;
							const totalRoundPoints = points + bonusPoints;

							playerScoresThisRound[playerId] = {
								roundNumber: currentRoundNumber,
								color,
								colorName: colorNamesMap[color],
								factionSize: winningPlayers.size,
								connectionPoints: points,
								bonusPoints,
								totalRoundPoints
							};
						}
					}

					// Update global state with results and player scores
					await kmClient.transact([globalStore], ([globalState]) => {
						globalState.roundResults = results;
						globalState.roundActive = false;

						// Save round result to history (now with all winning colors for ties)
						globalState.roundHistory[globalState.roundNumber.toString()] = {
							winningColors,
							winningColorNames: winningColors.map(
								(c) => globalState.colorNames[c]
							),
							largestFactionSize: maxSize,
							bonusPointsPerPlayer: winBonus
						};

						// Update individual player scores
						for (const [playerId, roundScore] of Object.entries(
							playerScoresThisRound
						)) {
							if (!globalState.playerScores[playerId]) {
								const playerName =
									globalState.players[playerId]?.name || 'Unknown';
								globalState.playerScores[playerId] = {
									name: playerName,
									totalScore: 0,
									roundScores: {}
								};
							}

							globalState.playerScores[playerId].roundScores[
								globalState.roundNumber.toString()
							] = roundScore;
							globalState.playerScores[playerId].totalScore +=
								roundScore.totalRoundPoints;
						}

						// Check if all rounds complete
						if (globalState.roundNumber >= globalState.totalRounds) {
							globalState.gameComplete = true;
						}
					});
				};

				calculateRoundResults().catch(console.error);
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
		numberOfColors,
		COLORS
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
	}, [
		isGlobalController,
		roundActive,
		connectionIds,
		numberOfColors,
		serverTime
	]);

	return isGlobalController;
}
