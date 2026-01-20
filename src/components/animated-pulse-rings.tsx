import type { ColorFactionState } from '@/state/stores/color-store';
import type { ColorName } from '@/state/stores/global-store';
import { cn } from '@/utils/cn';
import { getColorHex } from '@/utils/color-utils';
import * as React from 'react';

interface AnimatedPulseRingsProps {
	color: ColorName;
	colorName: string;
	factionState: ColorFactionState | undefined;
}

/**
 * Animated pulse rings visualization showing faction size
 * Larger rings = more players connected in faction
 * Features: glow effect, ripple on new connections, smooth size transitions
 */
export const AnimatedPulseRings: React.FC<AnimatedPulseRingsProps> = ({
	color,
	colorName,
	factionState
}) => {
	const colorHex = getColorHex(color);
	const playerCount = Math.max(
		0,
		Object.keys(factionState?.players || {}).length || 0
	);

	// Track previous count to detect new connections
	const prevCountRef = React.useRef(playerCount);
	const [isRippling, setIsRippling] = React.useState(false);

	// Trigger ripple animation when count increases
	React.useEffect(() => {
		if (playerCount > prevCountRef.current) {
			setIsRippling(true);
			const timeout = setTimeout(() => setIsRippling(false), 600);
			return () => clearTimeout(timeout);
		}
		prevCountRef.current = playerCount;
	}, [playerCount]);

	// Logarithmic scaling for better visualization with large counts
	// Min 80px base, scales smoothly up to ~280px for many players
	const scaleFactor = playerCount > 0 ? Math.log2(playerCount + 1) * 40 : 0;
	const maxRingSize = Math.max(80, Math.min(280, 80 + scaleFactor));

	// Glow intensity based on player count (more players = stronger glow)
	const glowIntensity = Math.min(0.8, 0.2 + playerCount * 0.03);
	const glowSize = Math.min(60, 20 + playerCount * 2);

	return (
		<>
			<style>{`
				@keyframes pulse-${color} {
					0%, 100% {
						transform: scale(1);
						opacity: 0.7;
					}
					50% {
						transform: scale(1.08);
						opacity: 1;
					}
				}

				@keyframes ripple-${color} {
					0% {
						transform: scale(1);
						opacity: 0.8;
					}
					100% {
						transform: scale(1.8);
						opacity: 0;
					}
				}

				.pulse-ring-${color} {
					animation: pulse-${color} 2s ease-in-out infinite;
				}

				.ripple-${color} {
					animation: ripple-${color} 0.6s ease-out forwards;
				}
			`}</style>

			<div className="flex flex-col items-center justify-center gap-3">
				{/* Animated rings container with smooth transitions */}
				<div
					className="relative flex items-center justify-center transition-all duration-500 ease-out"
					style={{
						width: `${maxRingSize + 60}px`,
						height: `${maxRingSize + 60}px`
					}}
				>
					{/* Glow effect behind rings */}
					<div
						className="absolute rounded-full transition-all duration-500"
						style={{
							backgroundColor: colorHex,
							width: `${maxRingSize - 20}px`,
							height: `${maxRingSize - 20}px`,
							opacity: glowIntensity,
							filter: `blur(${glowSize}px)`
						}}
					/>

					{/* Ripple effect on new connection */}
					{isRippling && (
						<div
							className={`ripple-${color} absolute rounded-full border-4`}
							style={{
								borderColor: colorHex,
								width: `${maxRingSize}px`,
								height: `${maxRingSize}px`
							}}
						/>
					)}

					{/* Outer ring */}
					<div
						className={cn(
							`pulse-ring-${color} absolute rounded-full border-4 transition-all duration-500`
						)}
						style={{
							borderColor: colorHex,
							width: `${maxRingSize + 30}px`,
							height: `${maxRingSize + 30}px`,
							opacity: 0.3
						}}
					/>

					{/* Middle ring */}
					<div
						className={cn(
							`pulse-ring-${color} absolute rounded-full border-4 transition-all duration-500`
						)}
						style={{
							borderColor: colorHex,
							width: `${maxRingSize + 10}px`,
							height: `${maxRingSize + 10}px`,
							opacity: 0.5,
							animationDelay: '0.3s'
						}}
					/>

					{/* Inner ring */}
					<div
						className={cn(
							`pulse-ring-${color} absolute rounded-full border-3 transition-all duration-500`
						)}
						style={{
							borderColor: colorHex,
							width: `${maxRingSize - 10}px`,
							height: `${maxRingSize - 10}px`,
							opacity: 0.7,
							animationDelay: '0.6s'
						}}
					/>

					{/* Center filled circle */}
					<div
						className={cn(
							'relative flex items-center justify-center rounded-full font-bold text-white shadow-2xl transition-all duration-500',
							isRippling && 'scale-110'
						)}
						style={{
							backgroundColor: colorHex,
							width: `${Math.max(70, 50 + Math.log2(playerCount + 1) * 15)}px`,
							height: `${Math.max(70, 50 + Math.log2(playerCount + 1) * 15)}px`,
							fontSize: `${Math.max(20, Math.min(36, 16 + playerCount * 0.8))}px`,
							boxShadow: `0 0 ${glowSize}px ${colorHex}40`
						}}
					>
						{playerCount}
					</div>
				</div>

				{/* Label */}
				<div className="text-center">
					<p className="text-base font-semibold text-white">{colorName}</p>
					<p className="text-sm text-slate-400">{playerCount} connected</p>
				</div>
			</div>
		</>
	);
};
