import type { ColorFactionState } from '@/state/stores/color-store';
import type { ColorName } from '@/state/stores/global-store';
import { cn } from '@/utils/cn';
import { getColorHex } from '@/utils/color-utils';
import * as React from 'react';

interface RacingBarsProps {
	colors: ColorName[];
	colorNames: Record<ColorName, string>;
	factionStates: Record<ColorName, ColorFactionState | undefined>;
}

interface ColorData {
	color: ColorName;
	colorName: string;
	playerCount: number;
	colorHex: string;
}

/**
 * Racing bars visualization showing animated horizontal bars ranked by player count
 * Bars animate smoothly when rankings change
 */
export const RacingBars: React.FC<RacingBarsProps> = ({
	colors,
	colorNames,
	factionStates
}) => {
	// Calculate data for each color
	const colorData = React.useMemo<ColorData[]>(() => {
		return colors
			.map((color) => ({
				color,
				colorName: colorNames[color] || color,
				playerCount: Object.keys(factionStates[color]?.players || {}).length,
				colorHex: getColorHex(color)
			}))
			.sort((a, b) => b.playerCount - a.playerCount);
	}, [colors, colorNames, factionStates]);

	const maxCount = Math.max(...colorData.map((d) => d.playerCount), 1);

	const getMedal = (index: number) => {
		if (index === 0) return '🥇';
		if (index === 1) return '🥈';
		if (index === 2) return '🥉';
		return `${index + 1}`;
	};

	return (
		<div className="w-full max-w-4xl space-y-4 px-4">
			{colorData.map((data, index) => {
				const barWidth =
					data.playerCount > 0 ? (data.playerCount / maxCount) * 100 : 2;

				return (
					<div
						key={data.color}
						className="flex items-center gap-4"
						style={{
							// Animate position when rank changes
							transform: `translateY(0)`,
							transition: 'transform 0.5s ease-out'
						}}
					>
						{/* Rank medal/number */}
						<div className="flex w-12 items-center justify-center text-2xl">
							{getMedal(index)}
						</div>

						{/* Color name */}
						<div className="w-28 text-right">
							<span className="text-base font-semibold text-white">
								{data.colorName}
							</span>
						</div>

						{/* Bar container */}
						<div className="relative flex-1">
							{/* Background track */}
							<div className="h-10 w-full rounded-lg bg-slate-700/50" />

							{/* Animated bar */}
							<div
								className={cn(
									'absolute top-0 left-0 flex h-10 items-center justify-end rounded-lg pr-3 transition-all duration-700 ease-out'
								)}
								style={{
									width: `${barWidth}%`,
									backgroundColor: data.colorHex,
									minWidth: data.playerCount > 0 ? '60px' : '8px',
									boxShadow:
										data.playerCount > 0
											? `0 0 20px ${data.colorHex}60`
											: 'none'
								}}
							>
								{data.playerCount > 0 && (
									<span className="text-lg font-bold text-white drop-shadow">
										{data.playerCount}
									</span>
								)}
							</div>

							{/* Pulse effect for leader */}
							{index === 0 && data.playerCount > 0 && (
								<div
									className="absolute top-0 left-0 h-10 animate-pulse rounded-lg opacity-30"
									style={{
										width: `${barWidth}%`,
										backgroundColor: data.colorHex,
										minWidth: '60px'
									}}
								/>
							)}
						</div>
					</div>
				);
			})}

			{/* Total count */}
			<div className="mt-6 text-center">
				<p className="text-3xl font-bold text-white">
					{colorData.reduce((sum, d) => sum + d.playerCount, 0)}
				</p>
				<p className="text-base text-slate-400">Total connected</p>
			</div>
		</div>
	);
};
