import type { KokimokiStore } from '@kokimoki/app';
import type { ColorFactionState } from '../stores/color-store';
import { parseEdgeKey } from '../stores/color-store';

export const scoringActions = {
	/**
	 * Calculate individual player scores for a round based on connections
	 * Returns: clientId -> connection points (1 per edge)
	 */
	calculatePlayerConnectionPoints(
		store: KokimokiStore<ColorFactionState>
	): Record<string, number> {
		const state = store.proxy;
		const connectionPoints: Record<string, number> = {};

		if (!state?.edges) return connectionPoints;

		// Count edges per player (1 point per edge)
		for (const edgeKey of Object.keys(state.edges)) {
			const [playerA, playerB] = parseEdgeKey(edgeKey);
			connectionPoints[playerA] = (connectionPoints[playerA] || 0) + 1;
			connectionPoints[playerB] = (connectionPoints[playerB] || 0) + 1;
		}

		return connectionPoints;
	},

	/**
	 * Get all players in largest connected component (winning faction)
	 */
	getWinningFactionPlayers(
		store: KokimokiStore<ColorFactionState>
	): Set<string> {
		const state = store.proxy;
		if (!state?.edges || !state?.players) return new Set();

		// Build adjacency list
		const adjacencyList = new Map<string, Set<string>>();
		const allPlayerIds = new Set(Object.keys(state.players));

		for (const edgeKey of Object.keys(state.edges)) {
			const [a, b] = parseEdgeKey(edgeKey);
			if (!adjacencyList.has(a)) adjacencyList.set(a, new Set());
			if (!adjacencyList.has(b)) adjacencyList.set(b, new Set());
			adjacencyList.get(a)!.add(b);
			adjacencyList.get(b)!.add(a);
		}

		// Find largest connected component
		const visited = new Set<string>();
		let largestComponent = new Set<string>();
		let maxSize = 0;

		for (const startId of allPlayerIds) {
			if (visited.has(startId)) continue;

			const stack = [startId];
			const component = new Set<string>();

			while (stack.length > 0) {
				const node = stack.pop()!;
				if (visited.has(node)) continue;
				visited.add(node);
				component.add(node);

				for (const neighbor of adjacencyList.get(node) || []) {
					if (!visited.has(neighbor)) stack.push(neighbor);
				}
			}

			if (component.size > maxSize) {
				maxSize = component.size;
				largestComponent = component;
			}
		}

		return largestComponent;
	}
};
