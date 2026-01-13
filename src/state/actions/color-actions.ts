import { kmClient } from '@/services/km-client';
import type { KokimokiStore } from '@kokimoki/app';
import {
	createEdgeKey,
	parseEdgeKey,
	type ColorFactionState
} from '../stores/color-store';

export const colorActions = {
	/**
	 * Clear all edges and players from a color faction (called at start of each round)
	 */
	async clearFaction(store: KokimokiStore<ColorFactionState>): Promise<void> {
		if (!store) return;

		try {
			// Check if store has valid proxy before transacting
			if (!store.proxy) {
				console.warn('Cannot clear faction: store proxy is undefined');
				return;
			}

			await kmClient.transact([store], ([state]) => {
				// Initialize state if undefined (defensive)
				if (!state) return;
				if (!state.edges) state.edges = {};
				if (!state.players) state.players = {};

				// Clear faction
				state.edges = {};
				state.players = {};
			});
		} catch (error) {
			// Suppress expected "Room not joined" errors
			if (
				error instanceof Error &&
				error.message?.includes('Room not joined')
			) {
				return;
			}
			// Also suppress "not found" errors which are expected during cleanup
			if (error instanceof Error && error.message?.includes('not found')) {
				return;
			}
			throw error;
		}
	},

	/**
	 * Join a player to the color faction by creating an edge between scanner and scanned
	 * Includes retry logic to handle "Room not joined" errors during initial store sync
	 */
	async joinColorFaction(
		store: KokimokiStore<ColorFactionState>,
		scannedClientId: string
	): Promise<{ success: boolean; alreadyConnected: boolean }> {
		const currentPlayerId = kmClient.id;
		const edgeKey = createEdgeKey(currentPlayerId, scannedClientId);

		let alreadyConnected = false;
		const maxRetries = 3;
		let lastError: Error | null = null;

		// Retry up to 3 times if store is not ready
		for (let attempt = 1; attempt <= maxRetries; attempt++) {
			try {
				await kmClient.transact([store], ([state]) => {
					const now = kmClient.serverTimestamp();

					// Initialize objects if not exists (defensive check for sync race)
					if (!state.players) {
						state.players = {};
					}
					if (!state.edges) {
						state.edges = {};
					}

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

				// Success - return result
				return { success: true, alreadyConnected };
			} catch (error) {
				lastError = error as Error;

				// If it's a "Room not joined" error and we have retries left, wait and retry
				if (
					lastError?.message?.includes('Room not joined') &&
					attempt < maxRetries
				) {
					const waitMs = 300 * attempt;
					// Wait 300ms before retrying
					await new Promise((resolve) => setTimeout(resolve, waitMs));
					continue;
				}

				// For other errors or final attempt, throw
				throw error;
			}
		}

		// If we got here, all retries failed
		throw lastError || new Error('Failed to join color faction');
	},

	/**
	 * Calculate the largest connected faction using iterative DFS (no stack overflow)
	 * This reads from the centralized edges so any client gets the full graph
	 */
	calculateLargestFaction(store: KokimokiStore<ColorFactionState>): number {
		if (!store || !store.proxy) return 1;

		const state = store.proxy;
		if (!state?.players) return 1;
		if (Object.keys(state.players).length === 0) return 1;

		// Build adjacency list from ALL edges (centralized graph)
		const adjacencyList = new Map<string, Set<string>>();
		const allPlayerIds = new Set(Object.keys(state.players));

		// Process all edges to build the graph
		if (state.edges) {
			for (const edgeKey of Object.keys(state.edges)) {
				const [a, b] = parseEdgeKey(edgeKey);
				allPlayerIds.add(a);
				allPlayerIds.add(b);

				if (!adjacencyList.has(a)) adjacencyList.set(a, new Set());
				if (!adjacencyList.has(b)) adjacencyList.set(b, new Set());
				adjacencyList.get(a)!.add(b);
				adjacencyList.get(b)!.add(a);
			}
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
	 * Calculate all connected faction clusters, returning their sizes
	 * Useful for presenter visualization showing faction distribution
	 * @returns Array of cluster sizes sorted largest to smallest
	 */
	getAllFactionClusters(store: KokimokiStore<ColorFactionState>): number[] {
		if (!store || !store.proxy) return [];

		const state = store.proxy;
		if (!state?.players) return [];
		if (Object.keys(state.players).length === 0) return [];

		// Build adjacency list from ALL edges
		const adjacencyList = new Map<string, Set<string>>();
		const allPlayerIds = new Set(Object.keys(state.players));

		// Process all edges to build the graph
		if (state.edges) {
			for (const edgeKey of Object.keys(state.edges)) {
				const [a, b] = parseEdgeKey(edgeKey);
				allPlayerIds.add(a);
				allPlayerIds.add(b);

				if (!adjacencyList.has(a)) adjacencyList.set(a, new Set());
				if (!adjacencyList.has(b)) adjacencyList.set(b, new Set());
				adjacencyList.get(a)!.add(b);
				adjacencyList.get(b)!.add(a);
			}
		}

		// Find all connected components using iterative DFS
		const visited = new Set<string>();
		const clusterSizes: number[] = [];

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

			clusterSizes.push(componentSize);
		}

		// Sort by size descending
		clusterSizes.sort((a, b) => b - a);
		return clusterSizes;
	},

	/**
	 * Calculate the faction size of a specific player (the faction they belong to)
	 * @param store The color faction store
	 * @param playerId The player ID to find the faction for
	 * @returns The size of the faction that player belongs to
	 */
	getPlayerFactionSize(
		store: KokimokiStore<ColorFactionState>,
		playerId: string
	): number {
		const state = store.proxy;
		if (!state?.players) return 1;
		if (!state.players[playerId]) return 1; // Player not in store, isolated

		// Build adjacency list
		const adjacencyList = new Map<string, Set<string>>();
		const allPlayerIds = new Set(Object.keys(state.players));

		// Process all edges
		for (const edgeKey of Object.keys(state.edges || {})) {
			const [a, b] = parseEdgeKey(edgeKey);
			allPlayerIds.add(a);
			allPlayerIds.add(b);

			if (!adjacencyList.has(a)) adjacencyList.set(a, new Set());
			if (!adjacencyList.has(b)) adjacencyList.set(b, new Set());
			adjacencyList.get(a)!.add(b);
			adjacencyList.get(b)!.add(a);
		}

		// Find the connected component containing this player using iterative DFS
		const visited = new Set<string>();
		const stack = [playerId];
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

		return Math.max(1, componentSize);
	}
};
