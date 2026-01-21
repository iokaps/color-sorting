import { config } from '@/config';
import type { ColorFactionState } from '@/state/stores/color-store';
import type { ColorName } from '@/state/stores/global-store';
import { getColorHex } from '@/utils/color-utils';
import * as React from 'react';

interface ConnectionHeatmapProps {
	color: ColorName;
	colorName: string;
	factionState: ColorFactionState | undefined;
}

/**
 * Analyzes edges to determine which players are connected
 * @param edges Record with keys in format "playerA:playerB"
 * @param playerA First player ID
 * @param playerB Second player ID
 * @returns true if players are connected
 */
function arePlayersConnected(
	edges: Record<string, number>,
	playerA: string,
	playerB: string
): boolean {
	const key1 =
		playerA < playerB ? `${playerA}:${playerB}` : `${playerB}:${playerA}`;
	return key1 in edges;
}

/**
 * Calculates connection count for each player
 * @param edges Record with connection keys
 * @param playerIds Array of player IDs
 * @returns Record mapping player ID to connection count
 */
function getConnectionCounts(
	edges: Record<string, number>,
	playerIds: string[]
): Record<string, number> {
	const counts: Record<string, number> = {};

	playerIds.forEach((id) => {
		counts[id] = 0;
	});

	Object.keys(edges).forEach((edgeKey) => {
		const [playerA, playerB] = edgeKey.split(':');
		if (playerA in counts) counts[playerA]++;
		if (playerB in counts) counts[playerB]++;
	});

	return counts;
}

/**
 * Gets the 8 most-connected players from a faction
 * Falls back to first 8 by join time if no connections
 */
function getMostConnectedPlayers(
	factionState: ColorFactionState | undefined,
	maxPlayers = 8
): string[] {
	if (!factionState) return [];

	const playerIds = Object.keys(factionState.players);
	if (playerIds.length === 0) return [];

	// Calculate connection counts
	const connectionCounts = getConnectionCounts(factionState.edges, playerIds);

	// Sort by connection count (descending), then by join time (ascending)
	const sorted = [...playerIds].sort((a, b) => {
		const countDiff = connectionCounts[b] - connectionCounts[a];
		if (countDiff !== 0) return countDiff;

		const joinA = factionState.players[a]?.joinedAt || 0;
		const joinB = factionState.players[b]?.joinedAt || 0;
		return joinA - joinB;
	});

	return sorted.slice(0, maxPlayers);
}

/**
 * Renders a heat map grid showing player-to-player connections
 * Diagonal = self (full color), Connected = darker (0.7 opacity), Empty = slate (0.5 opacity)
 */
export const ConnectionHeatmap: React.FC<ConnectionHeatmapProps> = ({
	color,
	colorName,
	factionState
}) => {
	const colorHex = getColorHex(color);
	const mostConnected = React.useMemo(
		() => getMostConnectedPlayers(factionState),
		[factionState]
	);

	if (!factionState || mostConnected.length === 0) {
		return (
			<div className="rounded-2xl border border-slate-600/50 bg-slate-700/50 px-6 py-4 text-center backdrop-blur-sm">
				<p className="text-slate-300">
					{config.noPlayersInFactionLabel.replace('{color}', colorName)}
				</p>
			</div>
		);
	}

	const gridSize = mostConnected.length;
	const cellSize = 25; // pixels - compact for multiple heat maps

	return (
		<div className="space-y-1">
			{/* Compact header */}
			<div className="flex items-center justify-between rounded bg-slate-700/30 px-2 py-1">
				<h3 className="text-xs font-semibold text-white">{colorName}</h3>
				<span className="text-xs text-slate-400">
					{Object.keys(factionState.players).length}p
				</span>
			</div>

			{/* Heat map container */}
			<div className="overflow-x-auto rounded border border-slate-600/50 bg-slate-700/50 p-2 backdrop-blur-sm">
				<div
					className="inline-block"
					style={{
						display: 'grid',
						gridTemplateColumns: `repeat(${gridSize}, ${cellSize}px)`,
						gap: '1px',
						padding: '4px'
					}}
				>
					{mostConnected.map((playerA, i) =>
						mostConnected.map((playerB, j) => {
							const isConnected = arePlayersConnected(
								factionState.edges,
								playerA,
								playerB
							);
							const isSelf = playerA === playerB;

							// Self = full color (1.0 opacity)
							// Connected = darker shade (0.7 opacity)
							// Not connected = slate (0.5 opacity)
							const cellColor = isSelf
								? colorHex
								: isConnected
									? colorHex
									: '#334155'; // slate-700

							const opacity = isSelf ? 1 : isConnected ? 0.7 : 0.5;

							return (
								<div
									key={`${i}-${j}`}
									className="group relative transition-all hover:scale-110 hover:shadow-lg"
									style={{
										width: `${cellSize}px`,
										height: `${cellSize}px`,
										backgroundColor: cellColor,
										opacity,
										borderRadius: '4px',
										cursor: 'pointer'
									}}
									title={
										isSelf
											? `${playerA} (self)`
											: isConnected
												? `${playerA} ↔ ${playerB}`
												: `${playerA} × ${playerB}`
									}
								>
									{/* Tooltip on hover */}
									<div className="pointer-events-none absolute -top-8 left-1/2 -translate-x-1/2 rounded bg-slate-900 px-2 py-1 text-xs whitespace-nowrap text-white opacity-0 transition-opacity group-hover:opacity-100">
										{isSelf
											? `${playerA.slice(0, 4)}...`
											: isConnected
												? config.connectedTooltipLabel
												: config.notConnectedTooltipLabel}
									</div>
								</div>
							);
						})
					)}
				</div>
			</div>
		</div>
	);
};
