import type { ColorFactionData } from '@/state/stores/factions-store';
import type { ColorName } from '@/state/stores/global-store';
import { getColorHex } from '@/utils/color-utils';
import * as React from 'react';

interface BubbleChartProps {
	colors: ColorName[];
	colorNames: Record<ColorName, string>;
	factionStates: Record<ColorName, ColorFactionData | undefined>;
}

interface Bubble {
	color: ColorName;
	colorName: string;
	playerCount: number;
	colorHex: string;
	x: number;
	y: number;
	vx: number;
	vy: number;
	radius: number;
}

/**
 * Bubble chart visualization with physics-based floating bubbles
 * Bubble size represents player count, bubbles float and bounce off each other
 */
export const BubbleChart: React.FC<BubbleChartProps> = ({
	colors,
	colorNames,
	factionStates
}) => {
	const containerRef = React.useRef<HTMLDivElement>(null);
	const animationRef = React.useRef<number | undefined>(undefined);
	const [bubbles, setBubbles] = React.useState<Bubble[]>([]);

	const containerWidth = 700;
	const containerHeight = 400;

	// Initialize and update bubbles when data changes
	React.useEffect(() => {
		const newBubbles: Bubble[] = colors.map((color, index) => {
			const playerCount = Object.keys(
				factionStates[color]?.players || {}
			).length;
			// Radius based on player count (min 30, max 100)
			const radius = Math.max(30, Math.min(100, 30 + playerCount * 5));

			// Get existing bubble position or initialize new one
			const existing = bubbles.find((b) => b.color === color);
			const angle = (index / colors.length) * 2 * Math.PI;
			const initialX =
				existing?.x || containerWidth / 2 + Math.cos(angle) * 150;
			const initialY =
				existing?.y || containerHeight / 2 + Math.sin(angle) * 100;

			return {
				color,
				colorName: colorNames[color] || color,
				playerCount,
				colorHex: getColorHex(color),
				x: initialX,
				y: initialY,
				vx: existing?.vx || (Math.random() - 0.5) * 2,
				vy: existing?.vy || (Math.random() - 0.5) * 2,
				radius
			};
		});

		setBubbles(newBubbles);
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [colors, colorNames, factionStates]);

	// Animation loop for bubble physics
	React.useEffect(() => {
		const animate = () => {
			setBubbles((prevBubbles) => {
				return prevBubbles.map((bubble) => {
					let { x, y, vx, vy } = bubble;
					const { radius } = bubble;

					// Apply velocity
					x += vx;
					y += vy;

					// Bounce off walls
					if (x - radius < 0) {
						x = radius;
						vx = Math.abs(vx) * 0.8;
					}
					if (x + radius > containerWidth) {
						x = containerWidth - radius;
						vx = -Math.abs(vx) * 0.8;
					}
					if (y - radius < 0) {
						y = radius;
						vy = Math.abs(vy) * 0.8;
					}
					if (y + radius > containerHeight) {
						y = containerHeight - radius;
						vy = -Math.abs(vy) * 0.8;
					}

					// Apply gentle floating motion
					vx += (Math.random() - 0.5) * 0.1;
					vy += (Math.random() - 0.5) * 0.1;

					// Damping
					vx *= 0.99;
					vy *= 0.99;

					// Limit max velocity
					const maxVel = 3;
					vx = Math.max(-maxVel, Math.min(maxVel, vx));
					vy = Math.max(-maxVel, Math.min(maxVel, vy));

					return { ...bubble, x, y, vx, vy };
				});
			});

			animationRef.current = requestAnimationFrame(animate);
		};

		animationRef.current = requestAnimationFrame(animate);

		return () => {
			if (animationRef.current) {
				cancelAnimationFrame(animationRef.current);
			}
		};
	}, []);

	const totalPlayers = bubbles.reduce((sum, b) => sum + b.playerCount, 0);

	return (
		<div className="flex flex-col items-center gap-6">
			{/* Bubble container */}
			<div
				ref={containerRef}
				className="relative overflow-hidden rounded-3xl border border-slate-600/30 bg-slate-800/30 backdrop-blur-sm"
				style={{ width: containerWidth, height: containerHeight }}
			>
				{bubbles.map((bubble) => (
					<div
						key={bubble.color}
						className="absolute flex flex-col items-center justify-center rounded-full shadow-2xl transition-[width,height] duration-500"
						style={{
							left: bubble.x - bubble.radius,
							top: bubble.y - bubble.radius,
							width: bubble.radius * 2,
							height: bubble.radius * 2,
							backgroundColor: bubble.colorHex,
							boxShadow: `0 0 ${bubble.radius}px ${bubble.colorHex}60`
						}}
					>
						{/* Player count */}
						<span
							className="font-bold text-white drop-shadow-lg"
							style={{
								fontSize: `${Math.max(14, Math.min(32, bubble.radius * 0.5))}px`
							}}
						>
							{bubble.playerCount}
						</span>
						{/* Color name (only show if bubble is big enough) */}
						{bubble.radius > 40 && (
							<span
								className="text-center text-white/80"
								style={{
									fontSize: `${Math.max(10, Math.min(14, bubble.radius * 0.2))}px`
								}}
							>
								{bubble.colorName}
							</span>
						)}
					</div>
				))}
			</div>

			{/* Total count */}
			<div className="text-center">
				<p className="text-4xl font-bold text-white">{totalPlayers}</p>
				<p className="text-lg text-slate-400">Total connected</p>
			</div>
		</div>
	);
};
