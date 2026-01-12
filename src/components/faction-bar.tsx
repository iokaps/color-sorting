import { cn } from '@/utils/cn';
import * as React from 'react';

export interface FactionBarProps {
	color: string; // hex color code
	colorName: string; // display name (Ruby, Sapphire, etc)
	clusterSizes: number[]; // sizes of all faction clusters, sorted largest first
}

/**
 * Displays a segmented bar visualization of faction clusters
 * Shows the largest cluster with a star, remaining clusters as smaller segments,
 * and isolated players (size 1) as dashes
 */
export const FactionBar: React.FC<FactionBarProps> = ({
	color,
	colorName,
	clusterSizes
}) => {
	if (clusterSizes.length === 0) {
		return (
			<div className="flex w-full items-center gap-4">
				<div className="w-32 text-sm font-semibold text-white">{colorName}</div>
				<div className="flex-1 rounded-lg bg-slate-700/50 px-4 py-3 text-center text-sm text-slate-400">
					No players
				</div>
				<div className="w-20 text-right text-sm font-semibold text-slate-400">
					0 total
				</div>
			</div>
		);
	}

	const totalPlayers = clusterSizes.reduce((a, b) => a + b, 0);
	const largestCluster = clusterSizes[0];
	const remainingClusters =
		clusterSizes.length > 1 ? clusterSizes.slice(1) : [];
	const remainingTotal = remainingClusters.reduce((a, b) => a + b, 0);
	const isolatedCount = remainingClusters.filter((size) => size === 1).length;

	// Calculate segment widths as percentage of total
	const largestPercent = (largestCluster / totalPlayers) * 100;

	return (
		<div className="flex w-full items-center gap-4">
			{/* Color name */}
			<div className="w-32 text-sm font-semibold text-white">{colorName}</div>

			{/* Segmented bar */}
			<div className="flex flex-1 items-center gap-2 rounded-lg bg-slate-700/30 p-3">
				{/* Largest faction segment */}
				<div
					className={cn(
						'relative flex items-center justify-center rounded px-2 py-1 font-bold text-white transition-all duration-300'
					)}
					style={{
						backgroundColor: color,
						width: `${Math.max(5, largestPercent)}%`,
						minWidth: '60px'
					}}
				>
					<span className="text-center text-sm">{largestCluster}</span>
					<span className="absolute -top-6 left-1/2 -translate-x-1/2 text-lg">
						⭐
					</span>
				</div>

				{/* Remaining clusters visualization */}
				{remainingTotal > 0 && (
					<div className="flex items-center gap-1">
						{/* Show individual clusters up to 3, then summarize */}
						{remainingClusters.slice(0, 2).map((size, idx) => (
							<div
								key={idx}
								className={cn(
									'flex items-center justify-center rounded px-1 py-1 font-semibold text-white transition-all duration-300'
								)}
								style={{
									backgroundColor: color,
									opacity: 0.6,
									width: `${Math.max(3, (size / totalPlayers) * 100)}%`,
									minWidth: '24px'
								}}
								title={`Cluster: ${size} players`}
							>
								{size > 2 && <span className="text-xs">{size}</span>}
							</div>
						))}

						{/* If more clusters exist, show count */}
						{remainingClusters.length > 2 && (
							<div className="flex items-center gap-1 px-2 text-xs font-semibold text-slate-300">
								{remainingClusters.length > 2 && (
									<span>
										+{remainingClusters.length - 2} cluster
										{remainingClusters.length - 2 > 1 ? 's' : ''}
									</span>
								)}
								{isolatedCount > 0 && (
									<span className="text-slate-400">
										({isolatedCount} isolated)
									</span>
								)}
							</div>
						)}

						{/* Show individual isolated if only a few remaining */}
						{remainingClusters.length === 2 && isolatedCount > 0 && (
							<span className="text-xs text-slate-400">
								({isolatedCount} isolated)
							</span>
						)}
					</div>
				)}
			</div>

			{/* Stats */}
			<div className="w-32 text-right">
				<div className="text-sm font-bold text-white">{totalPlayers}</div>
				<div className="text-xs text-slate-400">total connected</div>
			</div>
		</div>
	);
};
