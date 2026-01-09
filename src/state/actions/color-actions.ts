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
		// Get snapshot of current state with defensive check
		const state = store.proxy;
		if (!state || !state.connections) {
			// If store not synced yet, assume 1 player (the one calling this)
			return 1;
		}

		// Build adjacency graph from connections
		// Each player has scanned other players, creating edges
		const allPlayerIds = new Set<string>();
		const adjacencyList = new Map<string, Set<string>>();

		// Add the current player (kmClient.id)
		const currentPlayerId = kmClient.id;
		allPlayerIds.add(currentPlayerId);
		adjacencyList.set(currentPlayerId, new Set());

		// Add all scanned players and build edges
		for (const [scannedId, _] of Object.entries(state.connections)) {
			allPlayerIds.add(scannedId);
			if (!adjacencyList.has(scannedId)) {
				adjacencyList.set(scannedId, new Set());
			}
			// Create bidirectional edges (if A scanned B, they're connected)
			adjacencyList.get(currentPlayerId)?.add(scannedId);
			adjacencyList.get(scannedId)?.add(currentPlayerId);
		}

		// Find all connected components using DFS
		const visited = new Set<string>();
		let largestComponentSize = 0;

		for (const playerId of allPlayerIds) {
			if (!visited.has(playerId)) {
				// DFS to find component size
				const componentSize = dfsComponentSize(
					playerId,
					adjacencyList,
					visited
				);
				largestComponentSize = Math.max(largestComponentSize, componentSize);
			}
		}

		return Math.max(1, largestComponentSize);
	},

	async resetColorFaction(
		store: KokimokiStore<ColorFactionState>
	): Promise<void> {
		await kmClient.transact([store], ([state]) => {
			state.connections = {};
		});
	}
};

/**
 * Helper function to calculate connected component size using DFS
 */
function dfsComponentSize(
	playerId: string,
	adjacencyList: Map<string, Set<string>>,
	visited: Set<string>
): number {
	visited.add(playerId);
	let size = 1;

	const neighbors = adjacencyList.get(playerId) || new Set();
	for (const neighbor of neighbors) {
		if (!visited.has(neighbor)) {
			size += dfsComponentSize(neighbor, adjacencyList, visited);
		}
	}

	return size;
}
