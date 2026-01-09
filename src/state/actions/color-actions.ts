import { kmClient } from '@/services/km-client';
import type { KokimokiStore } from '@kokimoki/app';
import type { ColorFactionState } from '../stores/color-store';

export const colorActions = {
	async joinColorFaction(
		store: KokimokiStore<ColorFactionState>,
		scannedClientId: string
	): Promise<{ success: boolean; alreadyConnected: boolean }> {
		// Check if already connected
		let alreadyConnected = false;
		await kmClient.transact([store], ([state]) => {
			if (state.connections[scannedClientId]) {
				alreadyConnected = true;
			} else {
				// Add player to faction
				state.connections[scannedClientId] = {
					joinedAt: kmClient.serverTimestamp()
				};
			}
		});

		return { success: true, alreadyConnected };
	},

	async calculateLargestFaction(
		store: KokimokiStore<ColorFactionState>
	): Promise<number> {
		// Get snapshot of current state
		const state = store.proxy;
		const connectionCount = Object.keys(state.connections).length;
		// Add 1 for the player themselves
		return connectionCount + 1;
	},

	async resetColorFaction(
		store: KokimokiStore<ColorFactionState>
	): Promise<void> {
		await kmClient.transact([store], ([state]) => {
			state.connections = {};
		});
	}
};
