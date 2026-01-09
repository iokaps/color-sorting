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

			// Reset round results
			globalState.roundResults = { red: 0, blue: 0, green: 0, yellow: 0 };

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

		// Update global state with results
		await kmClient.transact([globalStore], ([globalState]) => {
			globalState.roundResults = results;
			globalState.roundActive = false;
		});
	},

	async nextRound() {
		// Reset color factions and prepare for next assignment
		await kmClient.transact([globalStore], ([globalState]) => {
			globalState.playerColors = {};
		});
	}
};
