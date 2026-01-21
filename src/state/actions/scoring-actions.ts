import { kmClient } from '@/services/km-client';
import {
	buildAdjacencyList,
	findAllConnectedComponents
} from '@/utils/graph-utils';
import type { KokimokiStore } from '@kokimoki/app';
import type { ColorFactionState } from '../stores/color-store';
import { parseEdgeKey } from '../stores/color-store';
import {
	globalStore,
	type ColorName,
	type PlayerRoundScore
} from '../stores/global-store';
import { colorActions } from './color-actions';

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

		const edgeKeys = Object.keys(state.edges);
		const adjacencyList = buildAdjacencyList(edgeKeys, parseEdgeKey);
		const allPlayerIds = new Set(Object.keys(state.players));

		// Find all components and return the largest
		const components = findAllConnectedComponents(allPlayerIds, adjacencyList);
		if (components.length === 0) return new Set();

		return components.reduce((largest, current) =>
			current.size > largest.size ? current : largest
		);
	},

	/**
	 * Calculate and save round results to global state
	 * @param colors Array of colors in play this round
	 * @param colorStoresCache Map of color to faction store
	 */
	async calculateAndSaveRoundResults(
		colors: ColorName[],
		colorStoresCache: Map<ColorName, KokimokiStore<ColorFactionState>>
	): Promise<void> {
		// Wait for all stores to sync their data before calculating results
		await new Promise((resolve) => setTimeout(resolve, 250));

		// Initialize results with all colors
		const results: Record<ColorName, number> = {};
		colors.forEach((color) => {
			results[color] = 0;
		});

		try {
			// Calculate all faction sizes from currently accessible stores
			for (const color of colors) {
				const store = colorStoresCache.get(color);
				if (store) {
					const factionSize = colorActions.calculateLargestFaction(store);
					results[color] = factionSize;
				}
			}
		} catch (error) {
			console.error('Error calculating round results:', error);
		}

		// Find winning color(s) - support ties
		const maxSize = Math.max(...colors.map((c) => results[c]), 0);
		const winningColors: ColorName[] = colors.filter(
			(c) => results[c] === maxSize && maxSize > 0
		);

		// Get current state values before transact
		const currentRoundNumber = globalStore.proxy.roundNumber;
		const colorNamesMap = globalStore.proxy.colorNames;
		const winBonus = globalStore.proxy.winBonus || 10;

		// Calculate individual player scores for each color
		const playerScoresThisRound: Record<string, PlayerRoundScore> = {};

		for (const color of colors) {
			const colorStore = colorStoresCache.get(color);
			if (!colorStore) continue;

			// Get connection points for each player in this color
			const connectionPoints =
				scoringActions.calculatePlayerConnectionPoints(colorStore);

			// Get players in winning faction
			const winningPlayers =
				scoringActions.getWinningFactionPlayers(colorStore);

			// Score each player in this color
			for (const [playerId, points] of Object.entries(connectionPoints)) {
				const isWinner =
					winningColors.includes(color) && winningPlayers.has(playerId);
				const bonusPoints = isWinner ? winBonus : 0;
				const totalRoundPoints = points + bonusPoints;

				playerScoresThisRound[playerId] = {
					roundNumber: currentRoundNumber,
					color,
					colorName: colorNamesMap[color],
					factionSize: winningPlayers.size,
					connectionPoints: points,
					bonusPoints,
					totalRoundPoints
				};
			}
		}

		// Update global state with results and player scores
		await kmClient.transact([globalStore], ([globalState]) => {
			globalState.roundResults = results;
			globalState.roundActive = false;

			// Save round result to history (supports ties)
			globalState.roundHistory[globalState.roundNumber.toString()] = {
				winningColors,
				winningColorNames: winningColors.map((c) => globalState.colorNames[c]),
				largestFactionSize: maxSize,
				bonusPointsPerPlayer: winBonus
			};

			// Update individual player scores
			for (const [playerId, roundScore] of Object.entries(
				playerScoresThisRound
			)) {
				if (!globalState.playerScores[playerId]) {
					const playerName = globalState.players[playerId]?.name || 'Unknown';
					globalState.playerScores[playerId] = {
						name: playerName,
						totalScore: 0,
						roundScores: {}
					};
				}

				globalState.playerScores[playerId].roundScores[
					globalState.roundNumber.toString()
				] = roundScore;
				globalState.playerScores[playerId].totalScore +=
					roundScore.totalRoundPoints;
			}

			// Check if all rounds complete
			if (globalState.roundNumber >= globalState.totalRounds) {
				globalState.gameComplete = true;
			}
		});
	}
};
