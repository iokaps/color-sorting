import { kmClient } from '@/services/km-client';
import { colorActions } from '@/state/actions/color-actions';
import { scoringActions } from '@/state/actions/scoring-actions';
import {
	createColorFactionState,
	getColorStoreName,
	type ColorFactionState
} from '@/state/stores/color-store';
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

/**
 * Hook to control and modify the global state
 * @returns A boolean indicating if the current client is the global controller
 */
export function useGlobalController() {
	const {
		controllerConnectionId,
		roundActive,
		roundStartTimestamp,
		roundNumber,
		numberOfColors
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
	}, [isGlobalController, roundNumber, numberOfColors, COLORS]);

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
					const localCOLORS = generateColorArray(numberOfColors);
					const results: Record<ColorName, number> = {
						red: 0,
						blue: 0,
						green: 0,
						yellow: 0
					};

					try {
						// Join all color stores in parallel
						const storePromises = localCOLORS.map(async (color) => {
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
						const colorStore = colorStoresRef.current[color];
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
	}, [
		isGlobalController,
		roundActive,
		connectionIds,
		numberOfColors,
		serverTime
	]);

	return isGlobalController;
}
