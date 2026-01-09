import { kmClient } from '@/services/km-client';
import type { KokimokiStore } from '@kokimoki/app';
import type { ColorFactionState } from '../stores/color-store';
import { globalStore, type ColorName } from '../stores/global-store';
import { colorActions } from './color-actions';

const COLORS: ColorName[] = ['red', 'blue', 'green', 'yellow'];

export const roundActions = {
	async assignColorsAndStartRound() {
		// Assign colors to players
		await kmClient.transact([globalStore], ([globalState]) => {
			// Get list of online player IDs
			const onlinePlayerIds = Array.from(globalStore.connections.clientIds);

			// Reset round results and game complete flag
			globalState.roundResults = { red: 0, blue: 0, green: 0, yellow: 0 };
			globalState.gameComplete = false;

			// Assign colors equally to players
			const playersPerColor = Math.ceil(onlinePlayerIds.length / COLORS.length);
			const shuffledPlayerIds = [...onlinePlayerIds].sort(
				() => Math.random() - 0.5
			);

			globalState.playerColors = {};
			shuffledPlayerIds.forEach((playerId, index) => {
				const colorIndex = Math.floor(index / playersPerColor) % COLORS.length;
				globalState.playerColors[playerId] = COLORS[colorIndex];
			});

			// Initialize round state
			globalState.roundNumber += 1;
			globalState.roundStartTimestamp = kmClient.serverTimestamp();
			globalState.roundActive = true;
		});
	},

	async endRound(
		colorStores: Record<ColorName, KokimokiStore<ColorFactionState>>
	) {
		// Calculate largest faction size for each color
		const results: Record<ColorName, number> = {
			red: 0,
			blue: 0,
			green: 0,
			yellow: 0
		};

		for (const color of COLORS) {
			const store = colorStores[color];
			if (store) {
				const factionSize = await colorActions.calculateLargestFaction(store);
				results[color] = factionSize;
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
