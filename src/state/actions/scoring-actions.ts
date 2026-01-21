import { kmClient } from '@/services/km-client';
import {
	buildAdjacencyList,
	findAllConnectedComponents
} from '@/utils/graph-utils';
import {
	factionsStore,
	getFactionData,
	parseEdgeKey,
	type ColorFactionData
} from '../stores/factions-store';
import {
	globalStore,
	type ColorName,
	type PlayerRoundScore
} from '../stores/global-store';

export const scoringActions = {
	/**
	 * Calculate individual player scores for a round based on connections
	 * Returns: clientId -> connection points (1 per edge)
	 */
	calculatePlayerConnectionPoints(
		factionData: ColorFactionData
	): Record<string, number> {
		const connectionPoints: Record<string, number> = {};

		if (!factionData?.edges) return connectionPoints;

		// Count edges per player (1 point per edge)
		for (const edgeKey of Object.keys(factionData.edges)) {
			const [playerA, playerB] = parseEdgeKey(edgeKey);
			connectionPoints[playerA] = (connectionPoints[playerA] || 0) + 1;
			connectionPoints[playerB] = (connectionPoints[playerB] || 0) + 1;
		}

		return connectionPoints;
	},

	/**
	 * Get all players in largest connected component (winning faction)
	 */
	getWinningFactionPlayers(factionData: ColorFactionData): Set<string> {
		if (!factionData?.edges || !factionData?.players) return new Set();

		const edgeKeys = Object.keys(factionData.edges);
		const adjacencyList = buildAdjacencyList(edgeKeys, parseEdgeKey);
		const allPlayerIds = new Set(Object.keys(factionData.players));

		// Find all components and return the largest
		const components = findAllConnectedComponents(allPlayerIds, adjacencyList);
		if (components.length === 0) return new Set();

		return components.reduce((largest, current) =>
			current.size > largest.size ? current : largest
		);
	},

	/**
	 * Calculate the largest connected component size for a faction
	 */
	calculateLargestFaction(factionData: ColorFactionData): number {
		if (!factionData?.edges || !factionData?.players) return 0;

		const edgeKeys = Object.keys(factionData.edges);
		if (edgeKeys.length === 0) {
			// No connections - each player is a component of size 1
			return Object.keys(factionData.players).length > 0 ? 1 : 0;
		}

		const adjacencyList = buildAdjacencyList(edgeKeys, parseEdgeKey);
		const allPlayerIds = new Set(Object.keys(factionData.players));
		const components = findAllConnectedComponents(allPlayerIds, adjacencyList);

		if (components.length === 0) return 0;

		return Math.max(...components.map((c) => c.size));
	},

	/**
	 * Calculate and save round results to global state
	 * @param colors Array of colors in play this round
	 */
	async calculateAndSaveRoundResults(colors: ColorName[]): Promise<void> {
		// Wait for store to sync data before calculating results
		await new Promise((resolve) => setTimeout(resolve, 250));

		const factionsSnapshot = factionsStore.proxy;

		// Initialize results with all colors
		const results: Record<ColorName, number> = {};
		colors.forEach((color) => {
			results[color] = 0;
		});

		try {
			// Calculate all faction sizes from unified store
			for (const color of colors) {
				const factionData = getFactionData(factionsSnapshot, color);
				const factionSize = scoringActions.calculateLargestFaction(factionData);
				results[color] = factionSize;
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
			const factionData = getFactionData(factionsSnapshot, color);

			// Get connection points for each player in this color
			const connectionPoints =
				scoringActions.calculatePlayerConnectionPoints(factionData);

			// Get players in winning faction
			const winningPlayers =
				scoringActions.getWinningFactionPlayers(factionData);

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
