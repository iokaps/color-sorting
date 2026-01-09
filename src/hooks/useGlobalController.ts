import { kmClient } from '@/services/km-client';
import { colorActions } from '@/state/actions/color-actions';
import {
	createColorFactionState,
	getColorStoreName,
	type ColorFactionState
} from '@/state/stores/color-store';
import { globalStore, type ColorName } from '@/state/stores/global-store';
import type { KokimokiStore } from '@kokimoki/app';
import { useSnapshot } from '@kokimoki/app';
import { useEffect, useRef } from 'react';
import { useServerTimer } from './useServerTime';

const COLORS: ColorName[] = ['red', 'blue', 'green', 'yellow'];

/**
 * Hook to control and modify the global state
 * @returns A boolean indicating if the current client is the global controller
 */
export function useGlobalController() {
	const {
		controllerConnectionId,
		roundActive,
		roundStartTimestamp,
		roundNumber
	} = useSnapshot(globalStore.proxy);
	const connections = useSnapshot(globalStore.connections);
	const connectionIds = connections.connectionIds;
	const isGlobalController = controllerConnectionId === kmClient.connectionId;
	const serverTime = useServerTimer(1000); // tick every second
	const roundEndedRef = useRef(false);
	const lastRoundRef = useRef(0);
	const colorStoresRef = useRef<
		Partial<Record<ColorName, KokimokiStore<ColorFactionState>>>
	>({});

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

	// Clear color stores when a new round starts (global controller responsibility)
	useEffect(() => {
		if (!isGlobalController) return;
		if (roundNumber <= lastRoundRef.current) return;

		// New round started - clear all color stores
		lastRoundRef.current = roundNumber;

		const clearAllStores = async () => {
			try {
				// Join all color stores in parallel if not already joined
				const storePromises = COLORS.map(async (color) => {
					const storeName = getColorStoreName(color);
					if (!colorStoresRef.current[color]) {
						colorStoresRef.current[color] = kmClient.store<ColorFactionState>(
							storeName,
							createColorFactionState(),
							false
						);
						try {
							await kmClient.join(colorStoresRef.current[color]);
						} catch (error) {
							if (
								error instanceof Error &&
								!error.message?.includes('not found')
							) {
								console.warn(`Could not join store ${storeName}:`, error);
							}
						}
					}
					return colorStoresRef.current[color];
				});

				const stores = await Promise.all(storePromises);

				// Clear all stores in parallel
				await Promise.all(
					stores.map((store) => {
						if (store) {
							return colorActions.clearFaction(store);
						}
						return Promise.resolve();
					})
				);
			} catch (error) {
				console.error('Error clearing color stores:', error);
			}
		};

		clearAllStores();
	}, [isGlobalController, roundNumber]);

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
					const results: Record<ColorName, number> = {
						red: 0,
						blue: 0,
						green: 0,
						yellow: 0
					};

					try {
						// Join all color stores in parallel
						const storePromises = COLORS.map(async (color) => {
							const storeName = getColorStoreName(color);
							if (!colorStoresRef.current[color]) {
								colorStoresRef.current[color] =
									kmClient.store<ColorFactionState>(
										storeName,
										createColorFactionState(),
										false
									);
								try {
									await kmClient.join(colorStoresRef.current[color]);
								} catch (error) {
									if (
										error instanceof Error &&
										!error.message?.includes('not found')
									) {
										console.warn(`Could not join store ${storeName}:`, error);
									}
								}
							}
							return { color, store: colorStoresRef.current[color] };
						});

						const stores = await Promise.all(storePromises);

						// Calculate all faction sizes (synchronous now with iterative DFS)
						for (const { color, store } of stores) {
							if (store) {
								results[color] = colorActions.calculateLargestFaction(store);
							}
						}
					} catch (error) {
						console.error('Error calculating round results:', error);
					}

					// Find winning color
					const winningColor = COLORS.reduce((prev, curr) =>
						results[curr] > results[prev] ? curr : prev
					);

					// Update global state with results, history, and end the round
					await kmClient.transact([globalStore], ([globalState]) => {
						globalState.roundResults = results;
						globalState.roundActive = false;

						// Save round result to history
						globalState.roundHistory[globalState.roundNumber.toString()] = {
							winningColor,
							winningColorName: globalState.colorNames[winningColor],
							connectionCount: results[winningColor]
						};

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
	}, [isGlobalController, serverTime, roundActive, roundStartTimestamp]);

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
			const colorCounts: Record<ColorName, number> = {
				red: 0,
				blue: 0,
				green: 0,
				yellow: 0
			};

			for (const color of Object.values(playerColors)) {
				if (color) {
					colorCounts[color]++;
				}
			}

			// Assign colors to late joiners (pick least-used color)
			await kmClient.transact([globalStore], ([globalState]) => {
				for (const playerId of playersWithoutColor) {
					// Find the color with fewest players
					const bestColor = COLORS.reduce((best, color) =>
						colorCounts[color] < colorCounts[best] ? color : best
					);

					globalState.playerColors[playerId] = bestColor;
					colorCounts[bestColor]++;
				}
			});
		};

		assignColorToLateJoiners().catch(console.error);
	}, [isGlobalController, roundActive, connectionIds]);

	return isGlobalController;
}
