import { kmClient } from '@/services/km-client';
import type { ColorName } from './global-store';

/**
 * Single faction data for one color
 */
export interface ColorFactionData {
	// Edges stored as "playerA:playerB" keys (sorted to avoid duplicates)
	// Value is timestamp when connection was made
	edges: Record<string, number>;
	// Track all players in this color faction
	players: Record<string, { joinedAt: number }>;
}

/**
 * Unified factions store that holds all color faction data in a single store.
 * This avoids the EventEmitter memory leak warning from having 10+ separate stores.
 */
export interface FactionsState {
	// Map of color name to faction data
	factions: Record<ColorName, ColorFactionData>;
}

/**
 * Creates initial empty faction data for a color
 */
export function createEmptyFactionData(): ColorFactionData {
	return {
		edges: {},
		players: {}
	};
}

/**
 * Creates initial factions state with empty data for all colors
 */
function createInitialFactionsState(): FactionsState {
	return {
		factions: {}
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

/**
 * Gets faction data for a specific color, initializing if needed
 */
export function getFactionData(
	state: FactionsState,
	color: ColorName
): ColorFactionData {
	if (!state.factions[color]) {
		return createEmptyFactionData();
	}
	return state.factions[color];
}

// Create the unified factions store - this is auto-joined by the SDK
export const factionsStore = kmClient.store<FactionsState>(
	'factions',
	createInitialFactionsState()
);
