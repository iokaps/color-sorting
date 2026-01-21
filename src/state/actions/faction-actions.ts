import { kmClient } from '@/services/km-client';
import {
	createEdgeKey,
	createEmptyFactionData,
	factionsStore
} from '../stores/factions-store';
import type { ColorName } from '../stores/global-store';

export const factionActions = {
	/**
	 * Join a player to a color faction
	 */
	async joinFaction(color: ColorName, playerId: string) {
		await kmClient.transact([factionsStore], ([state]) => {
			if (!state.factions[color]) {
				state.factions[color] = createEmptyFactionData();
			}
			if (!state.factions[color].players[playerId]) {
				state.factions[color].players[playerId] = {
					joinedAt: kmClient.serverTimestamp()
				};
			}
		});
	},

	/**
	 * Connect two players in the same color faction
	 */
	async connectPlayers(color: ColorName, playerA: string, playerB: string) {
		const edgeKey = createEdgeKey(playerA, playerB);

		await kmClient.transact([factionsStore], ([state]) => {
			if (!state.factions[color]) {
				state.factions[color] = createEmptyFactionData();
			}

			// Add edge if it doesn't exist
			if (!state.factions[color].edges[edgeKey]) {
				state.factions[color].edges[edgeKey] = kmClient.serverTimestamp();
			}

			// Ensure both players are in the faction
			if (!state.factions[color].players[playerA]) {
				state.factions[color].players[playerA] = {
					joinedAt: kmClient.serverTimestamp()
				};
			}
			if (!state.factions[color].players[playerB]) {
				state.factions[color].players[playerB] = {
					joinedAt: kmClient.serverTimestamp()
				};
			}
		});

		return edgeKey;
	},

	/**
	 * Check if two players are already connected
	 */
	isConnected(color: ColorName, playerA: string, playerB: string): boolean {
		const factionData = factionsStore.proxy.factions[color];
		if (!factionData) return false;

		const edgeKey = createEdgeKey(playerA, playerB);
		return Boolean(factionData.edges[edgeKey]);
	},

	/**
	 * Clear all factions (used when starting a new round)
	 */
	async clearAllFactions() {
		await kmClient.transact([factionsStore], ([state]) => {
			state.factions = {};
		});
	},

	/**
	 * Clear a specific color's faction
	 */
	async clearFaction(color: ColorName) {
		await kmClient.transact([factionsStore], ([state]) => {
			if (state.factions[color]) {
				state.factions[color] = createEmptyFactionData();
			}
		});
	}
};
