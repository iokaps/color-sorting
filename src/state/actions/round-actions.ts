import { kmClient } from '@/services/km-client';
import { generateColorArray } from '@/utils/color-utils';
import { globalStore, type ColorName } from '../stores/global-store';
import { factionActions } from './faction-actions';

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
 * Generates a unique 6-character alphanumeric code
 */
function generateShortCode(existingCodes: Set<string>): string {
	const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Exclude confusing chars: 0, O, I, 1
	let code: string;
	let attempts = 0;
	const maxAttempts = 100;

	do {
		code = '';
		for (let i = 0; i < 6; i++) {
			code += chars.charAt(Math.floor(Math.random() * chars.length));
		}
		attempts++;
	} while (existingCodes.has(code) && attempts < maxAttempts);

	return code;
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
		const filteredColors = previousColor
			? COLORS.filter((c) => c !== previousColor)
			: COLORS;
		const availableColors =
			filteredColors.length > 0 ? filteredColors : COLORS;

		// Find the minimum count among available colors
		const minCount = Math.min(...availableColors.map((c) => colorCounts[c]));
		// Get all colors with the minimum count (for random tie-breaking)
		const colorsWithMinCount = availableColors.filter(
			(c) => colorCounts[c] === minCount
		);
		// Randomly pick one of the least-used colors to avoid bias
		const bestColor =
			colorsWithMinCount[Math.floor(Math.random() * colorsWithMinCount.length)];

		newColors[playerId] = bestColor;
		colorCounts[bestColor]++;
	}

	return newColors;
}

export const roundActions = {
	async assignColorsAndStartRound() {
		// Check if max rounds reached - don't start another round
		if (globalStore.proxy.roundNumber >= globalStore.proxy.totalRounds) {
			return;
		}

		// Clear all faction data from previous round
		await factionActions.clearAllFactions();

		// Assign colors to players
		await kmClient.transact([globalStore], ([globalState]) => {
			// Double-check round limit inside transaction
			if (globalState.roundNumber >= globalState.totalRounds) {
				return;
			}

			// Get list of online player IDs
			const onlinePlayerIds = Array.from(globalStore.connections.clientIds);

			// Reset round results based on configured numberOfColors
			const emptyResults: Record<ColorName, number> = {};
			const COLORS_INNER = generateColorArray(globalState.numberOfColors);
			for (const color of COLORS_INNER) {
				emptyResults[color] = 0;
			}
			globalState.roundResults = emptyResults;

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

			// Generate short codes for all players (for simpler QR codes)
			const existingCodes = new Set(
				Object.values(globalState.playerShortCodes)
			);
			for (const playerId of onlinePlayerIds) {
				// Only generate new code if player doesn't have one
				if (!globalState.playerShortCodes[playerId]) {
					const shortCode = generateShortCode(existingCodes);
					globalState.playerShortCodes[playerId] = shortCode;
					existingCodes.add(shortCode);
				}
			}

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
		// Clear all faction data from the previous game
		try {
			await factionActions.clearAllFactions();
		} catch (error) {
			console.error('Error clearing factions during reset:', error);
			// Continue with game reset even if faction clearing fails
		}

		// Reset global state
		await kmClient.transact([globalStore], ([globalState]) => {
			globalState.roundNumber = 0;
			globalState.roundActive = false;
			globalState.roundStartTimestamp = 0;
			globalState.roundHistory = {};
			globalState.playerScores = {};
			const resetResults: Record<ColorName, number> = {};
			const COLORS_LOCAL = generateColorArray(globalState.numberOfColors);
			for (const color of COLORS_LOCAL) {
				resetResults[color] = 0;
			}
			globalState.roundResults = resetResults;
			globalState.playerColors = {};
			globalState.playerShortCodes = {};
			globalState.gameComplete = false;
			globalState.started = false;
		});
	}
};
