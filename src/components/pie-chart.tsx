import type { ColorFactionData } from '@/state/stores/factions-store';
import type { ColorName } from '@/state/stores/global-store';
import { getColorHex } from '@/utils/color-utils';
import * as React from 'react';

interface PieChartProps {
	colors: ColorName[];
	colorNames: Record<ColorName, string>;
	factionStates: Record<ColorName, ColorFactionData | undefined>;
}

interface Segment {
	color: ColorName;
	colorName: string;
	playerCount: number;
	colorHex: string;
	percentage: number;
	startAngle: number;
	endAngle: number;
}

/**
 * Animated donut/pie chart visualization showing faction proportions
 * Segments grow and shrink smoothly as players connect
 */
export const PieChart: React.FC<PieChartProps> = ({
	colors,
	colorNames,
	factionStates
}) => {
	const size = 320;
	const centerX = size / 2;
	const centerY = size / 2;
	const outerRadius = 140;
	const innerRadius = 70; // Creates donut hole

	// Calculate segment data
	const segments = React.useMemo<Segment[]>(() => {
		const data = colors.map((color) => ({
			color,
			colorName: colorNames[color] || color,
			playerCount: Object.keys(factionStates[color]?.players || {}).length,
			colorHex: getColorHex(color)
		}));

		const total = data.reduce((sum, d) => sum + d.playerCount, 0) || 1;

		// Calculate percentages first
		const dataWithPercentages = data.map((d) => ({
			...d,
			percentage: d.playerCount / total
		}));

		// Calculate start angles using reduce to accumulate
		const startAngles = dataWithPercentages.reduce<number[]>((acc, _d, i) => {
			if (i === 0) {
				acc.push(-Math.PI / 2); // Start from top
			} else {
				const prevEnd =
					acc[i - 1] + dataWithPercentages[i - 1].percentage * 2 * Math.PI;
				acc.push(prevEnd);
			}
			return acc;
		}, []);

		// Combine into final segments
		return dataWithPercentages.map((d, i) => ({
			...d,
			startAngle: startAngles[i],
			endAngle: startAngles[i] + d.percentage * 2 * Math.PI
		}));
	}, [colors, colorNames, factionStates]);

	const totalPlayers = segments.reduce((sum, s) => sum + s.playerCount, 0);

	// Create SVG arc path
	const createArcPath = (
		startAngle: number,
		endAngle: number,
		innerR: number,
		outerR: number
	) => {
		// Handle full circle case
		if (endAngle - startAngle >= 2 * Math.PI - 0.01) {
			return `
				M ${centerX + outerR} ${centerY}
				A ${outerR} ${outerR} 0 1 1 ${centerX - outerR} ${centerY}
				A ${outerR} ${outerR} 0 1 1 ${centerX + outerR} ${centerY}
				M ${centerX + innerR} ${centerY}
				A ${innerR} ${innerR} 0 1 0 ${centerX - innerR} ${centerY}
				A ${innerR} ${innerR} 0 1 0 ${centerX + innerR} ${centerY}
				Z
			`;
		}

		const startX1 = centerX + outerR * Math.cos(startAngle);
		const startY1 = centerY + outerR * Math.sin(startAngle);
		const endX1 = centerX + outerR * Math.cos(endAngle);
		const endY1 = centerY + outerR * Math.sin(endAngle);
		const startX2 = centerX + innerR * Math.cos(endAngle);
		const startY2 = centerY + innerR * Math.sin(endAngle);
		const endX2 = centerX + innerR * Math.cos(startAngle);
		const endY2 = centerY + innerR * Math.sin(startAngle);

		const largeArcFlag = endAngle - startAngle > Math.PI ? 1 : 0;

		return `
			M ${startX1} ${startY1}
			A ${outerR} ${outerR} 0 ${largeArcFlag} 1 ${endX1} ${endY1}
			L ${startX2} ${startY2}
			A ${innerR} ${innerR} 0 ${largeArcFlag} 0 ${endX2} ${endY2}
			Z
		`;
	};

	// Find the leading color
	const leadingSegment = segments.reduce(
		(max, s) => (s.playerCount > max.playerCount ? s : max),
		segments[0]
	);

	return (
		<div className="flex flex-col items-center gap-8">
			{/* Pie chart */}
			<div className="relative" style={{ width: size, height: size }}>
				{/* Glow effect for leader */}
				{leadingSegment && leadingSegment.playerCount > 0 && (
					<div
						className="absolute inset-0 animate-pulse rounded-full opacity-30 blur-2xl"
						style={{ backgroundColor: leadingSegment.colorHex }}
					/>
				)}

				<svg
					width={size}
					height={size}
					className="relative drop-shadow-2xl"
					style={{ transform: 'rotate(0deg)' }}
				>
					{/* Background circle */}
					<circle
						cx={centerX}
						cy={centerY}
						r={outerRadius}
						fill="none"
						stroke="#334155"
						strokeWidth={outerRadius - innerRadius}
						opacity={0.3}
					/>

					{/* Segments */}
					{segments.map((segment) => {
						if (segment.playerCount === 0) return null;

						return (
							<path
								key={segment.color}
								d={createArcPath(
									segment.startAngle,
									segment.endAngle,
									innerRadius,
									outerRadius
								)}
								fill={segment.colorHex}
								className="transition-all duration-700 ease-out"
								style={{
									filter:
										segment === leadingSegment
											? `drop-shadow(0 0 10px ${segment.colorHex})`
											: 'none'
								}}
							/>
						);
					})}

					{/* Center text */}
					<text
						x={centerX}
						y={centerY - 10}
						textAnchor="middle"
						dominantBaseline="middle"
						fill="white"
						fontSize="36"
						fontWeight="bold"
					>
						{totalPlayers}
					</text>
					<text
						x={centerX}
						y={centerY + 20}
						textAnchor="middle"
						dominantBaseline="middle"
						fill="#94a3b8"
						fontSize="14"
					>
						connected
					</text>
				</svg>
			</div>

			{/* Legend */}
			<div className="flex flex-wrap justify-center gap-4">
				{segments.map((segment) => (
					<div key={segment.color} className="flex items-center gap-2">
						<div
							className="size-4 rounded-full"
							style={{ backgroundColor: segment.colorHex }}
						/>
						<span className="text-sm text-white">{segment.colorName}</span>
						<span className="text-sm font-bold text-slate-300">
							{segment.playerCount}
						</span>
						{segment.playerCount > 0 && (
							<span className="text-xs text-slate-500">
								({Math.round(segment.percentage * 100)}%)
							</span>
						)}
					</div>
				))}
			</div>
		</div>
	);
};
