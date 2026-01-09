import type { ColorName } from './global-store';

/**
 * Optimized color faction state for large-scale events (100+ players)
 * Stores edges centrally so any client can see the full connection graph
 */
export interface ColorFactionState {
	// Edges stored as "playerA:playerB" keys (sorted to avoid duplicates)
	// Value is timestamp when connection was made
	edges: Record<string, number>;
	// Track all players in this color faction
	players: Record<string, { joinedAt: number }>;
}

export function createColorFactionState(): ColorFactionState {
	return {
		edges: {},
		players: {}
	};
}

/**
 * Creates a unique edge key from two player IDs (sorted to ensure consistency)
 */
export function createEdgeKey(playerA: string, playerB: string): string {
	return playerA < playerB ? `${playerA}:${playerB}` : `${playerB}:${playerA}`;
}

/**
 * Parses an edge key back into player IDs
 */
export function parseEdgeKey(edgeKey: string): [string, string] {
	const [a, b] = edgeKey.split(':');
	return [a, b];
}

export function getColorStoreName(color: ColorName): string {
	return `color-${color}-faction`;
}
