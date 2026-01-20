import type { ColorFactionState } from '@/state/stores/color-store';
import type { ColorName } from '@/state/stores/global-store';
import { cn } from '@/utils/cn';
import { getColorHex } from '@/utils/color-utils';
import * as React from 'react';

interface NetworkVisualizationProps {
	color: ColorName;
	colorName: string;
	factionState: ColorFactionState | undefined;
}

interface NodePosition {
	x: number;
	y: number;
	id: string;
}

/**
 * Network graph visualization showing players as nodes and connections as edges
 * Players are positioned in a circle with SVG lines connecting them
 */
export const NetworkVisualization: React.FC<NetworkVisualizationProps> = ({
	color,
	colorName,
	factionState
}) => {
	const colorHex = getColorHex(color);
	const containerSize = 200;
	const centerX = containerSize / 2;
	const centerY = containerSize / 2;
	const radius = 70;
	const nodeRadius = 8;

	const players = Object.keys(factionState?.players || {});
	const edges = Object.keys(factionState?.edges || {});
	const playerCount = players.length;
	const edgeCount = edges.length;

	// Calculate node positions in a circle
	const nodePositions = React.useMemo<NodePosition[]>(() => {
		if (playerCount === 0) return [];
		if (playerCount === 1) {
			return [{ x: centerX, y: centerY, id: players[0] }];
		}

		return players.map((id, index) => {
			const angle = (index / playerCount) * 2 * Math.PI - Math.PI / 2;
			return {
				x: centerX + radius * Math.cos(angle),
				y: centerY + radius * Math.sin(angle),
				id
			};
		});
	}, [players, playerCount, centerX, centerY]);

	// Create a map for quick position lookup
	const positionMap = React.useMemo(() => {
		const map = new Map<string, NodePosition>();
		nodePositions.forEach((pos) => map.set(pos.id, pos));
		return map;
	}, [nodePositions]);

	// Parse edges to get connection pairs
	const connections = React.useMemo(() => {
		return edges.map((edge) => {
			const [playerA, playerB] = edge.split(':');
			return { playerA, playerB };
		});
	}, [edges]);

	if (playerCount === 0) {
		return (
			<div className="flex flex-col items-center justify-center gap-3">
				<div
					className="flex items-center justify-center rounded-2xl border-2 border-dashed"
					style={{
						width: `${containerSize}px`,
						height: `${containerSize}px`,
						borderColor: `${colorHex}40`
					}}
				>
					<p className="text-sm text-slate-500">No players</p>
				</div>
				<div className="text-center">
					<p className="text-base font-semibold text-white">{colorName}</p>
					<p className="text-sm text-slate-400">0 connected</p>
				</div>
			</div>
		);
	}

	return (
		<div className="flex flex-col items-center justify-center gap-3">
			{/* SVG Network Graph */}
			<div
				className="relative"
				style={{ width: `${containerSize}px`, height: `${containerSize}px` }}
			>
				{/* Glow background */}
				<div
					className="absolute inset-0 rounded-full opacity-20 blur-xl"
					style={{ backgroundColor: colorHex }}
				/>

				<svg
					width={containerSize}
					height={containerSize}
					className="relative"
					style={{ overflow: 'visible' }}
				>
					{/* Connection edges */}
					{connections.map(({ playerA, playerB }, index) => {
						const posA = positionMap.get(playerA);
						const posB = positionMap.get(playerB);
						if (!posA || !posB) return null;

						return (
							<line
								key={`edge-${index}`}
								x1={posA.x}
								y1={posA.y}
								x2={posB.x}
								y2={posB.y}
								stroke={colorHex}
								strokeWidth={2}
								strokeOpacity={0.6}
								className="animate-pulse"
								style={{
									strokeDasharray: '0',
									animation: `draw-line 0.5s ease-out forwards`
								}}
							/>
						);
					})}

					{/* Player nodes */}
					{nodePositions.map((pos, index) => (
						<g key={pos.id}>
							{/* Outer glow */}
							<circle
								cx={pos.x}
								cy={pos.y}
								r={nodeRadius + 4}
								fill={colorHex}
								opacity={0.3}
								className="animate-pulse"
							/>
							{/* Main node */}
							<circle
								cx={pos.x}
								cy={pos.y}
								r={nodeRadius}
								fill={colorHex}
								stroke="white"
								strokeWidth={2}
								className={cn(
									'transition-all duration-300',
									index === nodePositions.length - 1 && 'animate-bounce'
								)}
							/>
						</g>
					))}

					{/* Center count */}
					<text
						x={centerX}
						y={centerY}
						textAnchor="middle"
						dominantBaseline="middle"
						fill="white"
						fontSize="24"
						fontWeight="bold"
						className="drop-shadow-lg"
					>
						{playerCount}
					</text>
				</svg>
			</div>

			{/* Label */}
			<div className="text-center">
				<p className="text-base font-semibold text-white">{colorName}</p>
				<p className="text-sm text-slate-400">
					{playerCount} players · {edgeCount} links
				</p>
			</div>
		</div>
	);
};
