import { kmClient } from '@/services/km-client';
import type { KokimokiStore } from '@kokimoki/app';
import type { ColorFactionState } from '../stores/color-store';
import { globalStore, type ColorName } from '../stores/global-store';
import { colorActions } from './color-actions';

const COLORS: ColorName[] = ['red', 'blue', 'green', 'yellow'];

/**
 * Fisher-Yates shuffle for unbiased randomization (O(n) time, O(1) extra space)
 */
function shuffleArray<T>(array: T[]): T[] {
	const shuffled = [...array];
	for (let i = shuffled.length - 1; i > 0; i--) {
		const j = Math.floor(Math.random() * (i + 1));
		[shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
	}
	return shuffled;
}

/**
 * Assigns colors to players ensuring:
 * 1. Equal distribution (within ±1 player per color)
 * 2. No player gets the same color as previous round
 */
function assignColorsWithConstraints(
	playerIds: string[],
	previousColors: Record<string, ColorName>
): Record<string, ColorName> {
	const shuffledPlayers = shuffleArray(playerIds);
	const newColors: Record<string, ColorName> = {};
	const colorCounts: Record<ColorName, number> = {
		red: 0,
		blue: 0,
		green: 0,
		yellow: 0
	};

	// For each player, assign the least-used color that's different from their previous
	for (const playerId of shuffledPlayers) {
		const previousColor = previousColors[playerId];

		// Get available colors (exclude previous color if they had one)
		const availableColors = previousColor
			? COLORS.filter((c) => c !== previousColor)
			: COLORS;

		// Pick the color with the fewest assignments (maintains balance)
		const bestColor = availableColors.reduce((best, color) =>
			colorCounts[color] < colorCounts[best] ? color : best
		);

		newColors[playerId] = bestColor;
		colorCounts[bestColor]++;
	}

	return newColors;
}

export const roundActions = {
	async assignColorsAndStartRound(
		colorStores?: Record<ColorName, KokimokiStore<ColorFactionState>>
	) {
		// Clear all color faction stores from previous round
		if (colorStores) {
			await Promise.all(
				COLORS.map((color) => {
					const store = colorStores[color];
					if (store) {
						return colorActions.clearFaction(store);
					}
					return Promise.resolve();
				})
			);
		}

		// Assign colors to players
		await kmClient.transact([globalStore], ([globalState]) => {
			// Get list of online player IDs
			const onlinePlayerIds = Array.from(globalStore.connections.clientIds);

			// Reset round results and game complete flag
			globalState.roundResults = { red: 0, blue: 0, green: 0, yellow: 0 };
			globalState.gameComplete = false;

			// Store previous colors before reassignment
			const previousColors = { ...globalState.playerColors };

			// Assign colors with constraints:
			// - Equal distribution (within ±1)
			// - Different color from previous round
			globalState.playerColors = assignColorsWithConstraints(
				onlinePlayerIds,
				previousColors
			);

			// Initialize round state
			globalState.roundNumber += 1;
			globalState.roundStartTimestamp = kmClient.serverTimestamp();
			globalState.roundActive = true;
		});
	},

	async endRound(
		colorStores: Record<ColorName, KokimokiStore<ColorFactionState>>
	) {
		// Calculate largest faction size for each color (synchronous with iterative DFS)
		const results: Record<ColorName, number> = {
			red: 0,
			blue: 0,
			green: 0,
			yellow: 0
		};

		for (const color of COLORS) {
			const store = colorStores[color];
			if (store) {
				// calculateLargestFaction is now synchronous
				results[color] = colorActions.calculateLargestFaction(store);
			}
		}

		// Find winning color
		const winningColor = COLORS.reduce((prev, curr) =>
			results[curr] > results[prev] ? curr : prev
		);

		// Update global state with results and history
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
	},

	async nextRound() {
		// Reset color factions and prepare for next assignment
		await kmClient.transact([globalStore], ([globalState]) => {
			globalState.playerColors = {};
		});
	},

	async setRoundNumber(roundNumber: number) {
		await kmClient.transact([globalStore], ([globalState]) => {
			globalState.roundNumber = Math.max(0, roundNumber);
		});
	},

	async setTotalRounds(totalRounds: number) {
		await kmClient.transact([globalStore], ([globalState]) => {
			globalState.totalRounds = Math.max(1, totalRounds);
		});
	},

	async resetGame() {
		await kmClient.transact([globalStore], ([globalState]) => {
			globalState.roundNumber = 0;
			globalState.roundHistory = {};
			globalState.roundResults = { red: 0, blue: 0, green: 0, yellow: 0 };
			globalState.playerColors = {};
			globalState.gameComplete = false;
		});
	}
};
