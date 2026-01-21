import { kmClient } from '@/services/km-client';
import {
	buildAdjacencyList,
	findConnectedComponent,
	findLargestComponentSize,
	getAllComponentSizes
} from '@/utils/graph-utils';
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
					// Defensive: ensure state exists
					if (!state) return;

					const now = kmClient.serverTimestamp();

					// Initialize objects if not exists (defensive check for sync race)
					if (!state.players || typeof state.players !== 'object') {
						state.players = {};
					}
					if (!state.edges || typeof state.edges !== 'object') {
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
	 * Calculate the largest connected faction using graph utilities
	 */
	calculateLargestFaction(store: KokimokiStore<ColorFactionState>): number {
		if (!store || !store.proxy) return 1;

		const state = store.proxy;
		if (!state?.players) return 1;
		if (Object.keys(state.players).length === 0) return 1;

		const edgeKeys = Object.keys(state.edges || {});
		const adjacencyList = buildAdjacencyList(edgeKeys, parseEdgeKey);
		const allPlayerIds = new Set(Object.keys(state.players));

		// Add players from edges that might not be in players map
		for (const edgeKey of edgeKeys) {
			const [a, b] = parseEdgeKey(edgeKey);
			allPlayerIds.add(a);
			allPlayerIds.add(b);
		}

		const largestSize = findLargestComponentSize(allPlayerIds, adjacencyList);
		return Math.max(1, largestSize);
	},

	/**
	 * Calculate all connected faction clusters, returning their sizes
	 */
	getAllFactionClusters(store: KokimokiStore<ColorFactionState>): number[] {
		if (!store || !store.proxy) return [];

		const state = store.proxy;
		if (!state?.players) return [];
		if (Object.keys(state.players).length === 0) return [];

		const edgeKeys = Object.keys(state.edges || {});
		const adjacencyList = buildAdjacencyList(edgeKeys, parseEdgeKey);
		const allPlayerIds = new Set(Object.keys(state.players));

		// Add players from edges that might not be in players map
		for (const edgeKey of edgeKeys) {
			const [a, b] = parseEdgeKey(edgeKey);
			allPlayerIds.add(a);
			allPlayerIds.add(b);
		}

		return getAllComponentSizes(allPlayerIds, adjacencyList);
	},

	/**
	 * Calculate the faction size of a specific player
	 */
	getPlayerFactionSize(
		store: KokimokiStore<ColorFactionState>,
		playerId: string
	): number {
		const state = store.proxy;
		if (!state?.players) return 1;
		if (!state.players[playerId]) return 1;

		const edgeKeys = Object.keys(state.edges || {});
		const adjacencyList = buildAdjacencyList(edgeKeys, parseEdgeKey);

		const component = findConnectedComponent(playerId, adjacencyList);
		return Math.max(1, component.size);
	}
};
