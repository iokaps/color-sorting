import type { ColorFactionState } from '@/state/stores/color-store';
import type { ColorName } from '@/state/stores/global-store';
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
 */
export const AnimatedPulseRings: React.FC<AnimatedPulseRingsProps> = ({
	color,
	colorName,
	factionState
}) => {
	const colorHex = getColorHex(color);
	const playerCount = Object.keys(factionState?.players || {}).length;

	// Scale ring size based on player count (20-200px)
	const maxRingSize = Math.max(80, Math.min(200, playerCount * 15));

	return (
		<>
			<style>{`
				@keyframes pulse-${color} {
					0%, 100% {
						transform: scale(1);
						opacity: 0.8;
					}
					50% {
						transform: scale(1.05);
						opacity: 1;
					}
				}

				.pulse-ring-${color} {
					animation: pulse-${color} 2s ease-in-out infinite;
				}
			`}</style>

			<div className="flex flex-col items-center justify-center gap-2">
				{/* Animated rings container */}
				<div
					className="relative flex items-center justify-center"
					style={{
						width: `${maxRingSize + 40}px`,
						height: `${maxRingSize + 40}px`
					}}
				>
					{/* Outer ring */}
					<div
						className={`pulse-ring-${color} absolute rounded-full border-4`}
						style={{
							borderColor: colorHex,
							width: `${maxRingSize + 20}px`,
							height: `${maxRingSize + 20}px`,
							opacity: 0.4
						}}
					/>

					{/* Middle ring */}
					<div
						className={`pulse-ring-${color} absolute rounded-full border-4`}
						style={{
							borderColor: colorHex,
							width: `${maxRingSize}px`,
							height: `${maxRingSize}px`,
							opacity: 0.6,
							animationDelay: '0.3s'
						}}
					/>

					{/* Center filled circle */}
					<div
						className="relative flex items-center justify-center rounded-full font-bold text-white shadow-lg"
						style={{
							backgroundColor: colorHex,
							width: `${Math.max(60, playerCount * 4)}px`,
							height: `${Math.max(60, playerCount * 4)}px`,
							fontSize: `${Math.min(20, playerCount)}px`
						}}
					>
						{playerCount}
					</div>
				</div>

				{/* Label */}
				<div className="text-center">
					<p className="text-sm font-semibold text-white">{colorName}</p>
					<p className="text-xs text-slate-400">{playerCount} connected</p>
				</div>
			</div>
		</>
	);
};
