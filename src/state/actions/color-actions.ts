import { kmClient } from '@/services/km-client';
import type { KokimokiStore } from '@kokimoki/app';
import {
	createEdgeKey,
	parseEdgeKey,
	type ColorFactionState
} from '../stores/color-store';

export const colorActions = {
	/**
	 * Join a player to the color faction by creating an edge between scanner and scanned
	 */
	async joinColorFaction(
		store: KokimokiStore<ColorFactionState>,
		scannedClientId: string
	): Promise<{ success: boolean; alreadyConnected: boolean }> {
		const currentPlayerId = kmClient.id;
		const edgeKey = createEdgeKey(currentPlayerId, scannedClientId);

		let alreadyConnected = false;
		await kmClient.transact([store], ([state]) => {
			const now = kmClient.serverTimestamp();

			// Register both players in the faction
			if (!state.players[currentPlayerId]) {
				state.players[currentPlayerId] = { joinedAt: now };
			}
			if (!state.players[scannedClientId]) {
				state.players[scannedClientId] = { joinedAt: now };
			}

			// Add edge if not exists
			if (state.edges[edgeKey]) {
				alreadyConnected = true;
			} else {
				state.edges[edgeKey] = now;
			}
		});

		return { success: true, alreadyConnected };
	},

	/**
	 * Register a player in the color faction (called when player gets assigned a color)
	 */
	async registerPlayer(store: KokimokiStore<ColorFactionState>): Promise<void> {
		const currentPlayerId = kmClient.id;
		await kmClient.transact([store], ([state]) => {
			if (!state.players[currentPlayerId]) {
				state.players[currentPlayerId] = {
					joinedAt: kmClient.serverTimestamp()
				};
			}
		});
	},

	/**
	 * Calculate the largest connected faction using iterative DFS (no stack overflow)
	 * This reads from the centralized edges so any client gets the full graph
	 */
	calculateLargestFaction(store: KokimokiStore<ColorFactionState>): number {
		const state = store.proxy;
		if (!state?.edges || !state?.players) return 1;

		// Build adjacency list from ALL edges (centralized graph)
		const adjacencyList = new Map<string, Set<string>>();
		const allPlayerIds = new Set(Object.keys(state.players));

		// Process all edges to build the graph
		for (const edgeKey of Object.keys(state.edges)) {
			const [a, b] = parseEdgeKey(edgeKey);
			allPlayerIds.add(a);
			allPlayerIds.add(b);

			if (!adjacencyList.has(a)) adjacencyList.set(a, new Set());
			if (!adjacencyList.has(b)) adjacencyList.set(b, new Set());
			adjacencyList.get(a)!.add(b);
			adjacencyList.get(b)!.add(a);
		}

		// Find largest connected component using iterative DFS (prevents stack overflow)
		const visited = new Set<string>();
		let largestSize = 0;

		for (const startId of allPlayerIds) {
			if (visited.has(startId)) continue;

			// Iterative DFS
			const stack = [startId];
			let componentSize = 0;

			while (stack.length > 0) {
				const node = stack.pop()!;
				if (visited.has(node)) continue;
				visited.add(node);
				componentSize++;

				for (const neighbor of adjacencyList.get(node) || []) {
					if (!visited.has(neighbor)) stack.push(neighbor);
				}
			}

			largestSize = Math.max(largestSize, componentSize);
		}

		return Math.max(1, largestSize);
	},

	/**
	 * Get total player count in this color faction
	 */
	getPlayerCount(store: KokimokiStore<ColorFactionState>): number {
		const state = store.proxy;
		if (!state?.players) return 0;
		return Object.keys(state.players).length;
	},

	/**
	 * Reset color faction for new round
	 */
	async resetColorFaction(
		store: KokimokiStore<ColorFactionState>
	): Promise<void> {
		await kmClient.transact([store], ([state]) => {
			state.edges = {};
			state.players = {};
		});
	}
};
