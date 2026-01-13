import { kmClient } from '@/services/km-client';
import { generateColorArray } from '@/utils/color-utils';
import type { KokimokiStore } from '@kokimoki/app';
import type { ColorFactionState } from '../stores/color-store';
import { globalStore, type ColorName } from '../stores/global-store';
import { colorActions } from './color-actions';

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
	previousColors: Record<string, ColorName>,
	numberOfColors: number
): Record<string, ColorName> {
	const COLORS = generateColorArray(numberOfColors);
	const shuffledPlayers = shuffleArray(playerIds);
	const newColors: Record<string, ColorName> = {};
	const colorCounts: Record<ColorName, number> = {};

	// Initialize color counts for all available colors
	for (const color of COLORS) {
		colorCounts[color] = 0;
	}

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
		// Get numberOfColors first to determine COLORS
		const numberOfColors = globalStore.proxy.numberOfColors || 4;
		const COLORS = generateColorArray(numberOfColors);

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

			// Reset round results based on configured numberOfColors
			const emptyResults: Record<ColorName, number> = {};
			const COLORS_INNER = generateColorArray(globalState.numberOfColors);
			for (const color of COLORS_INNER) {
				emptyResults[color] = 0;
			}
			globalState.roundResults = emptyResults;
			globalState.gameComplete = false;

			// Store previous colors before reassignment
			const previousColors = { ...globalState.playerColors };

			// Assign colors with constraints:
			// - Equal distribution (within ±1)
			// - Different color from previous round
			globalState.playerColors = assignColorsWithConstraints(
				onlinePlayerIds,
				previousColors,
				globalState.numberOfColors
			);

			// Initialize round state
			globalState.roundNumber += 1;
			globalState.roundStartTimestamp = kmClient.serverTimestamp();
			globalState.roundActive = true;
		});
	},

	async nextRound() {
		// Reset color factions and prepare for next assignment
		await kmClient.transact([globalStore], ([globalState]) => {
			globalState.playerColors = {};
		});
	},

	async resetGame() {
		await kmClient.transact([globalStore], ([globalState]) => {
			globalState.roundNumber = 0;
			globalState.roundHistory = {};
			const resetResults: Record<ColorName, number> = {};
			const COLORS = generateColorArray(globalState.numberOfColors);
			for (const color of COLORS) {
				resetResults[color] = 0;
			}
			globalState.roundResults = resetResults;
			globalState.playerColors = {};
			globalState.gameComplete = false;
		});
	}
};
