import { AnimatedPulseRings } from '@/components/animated-pulse-rings';
import { BubbleChart } from '@/components/bubble-chart';
import { NetworkVisualization } from '@/components/network-visualization';
import { PieChart } from '@/components/pie-chart';
import { RacingBars } from '@/components/racing-bars';
import { config } from '@/config';
import { useColorStores } from '@/hooks/useColorStores';
import { useServerTimer } from '@/hooks/useServerTime';
import {
	globalStore,
	type ColorName,
	type PresenterVisualizationMode
} from '@/state/stores/global-store';
import { generateColorArray } from '@/utils/color-utils';
import { useSnapshot } from '@kokimoki/app';
import { KmTimeCountdown, useKmConfettiContext } from '@kokimoki/shared';
import * as React from 'react';

interface ColorPresenterInnerProps {
	colors: ColorName[];
	colorNames: Record<ColorName, string>;
	logoUrl: string | null;
	roundNumber: number;
	roundStartTimestamp: number;
	roundActive: boolean;
	roundDurationSeconds: number;
	roundResults: Record<ColorName, number>;
	visualizationMode: PresenterVisualizationMode;
}

/**
 * Inner component that initializes stores only for active colors
 */
const ColorPresenterInner: React.FC<ColorPresenterInnerProps> = ({
	colors,
	colorNames,
	logoUrl,
	roundNumber,
	roundStartTimestamp,
	roundActive,
	roundDurationSeconds,
	roundResults,
	visualizationMode
}) => {
	const serverTime = useServerTimer(250);
	const confetti = useKmConfettiContext();
	const [confettiTriggered, setConfettiTriggered] = React.useState(false);

	const elapsedMs = Math.max(0, serverTime - roundStartTimestamp);
	const roundDurationMs = (roundDurationSeconds || 90) * 1000;
	const remainingMs = Math.max(0, roundDurationMs - elapsedMs);

	// Use consolidated hook for all color stores
	const dynamicSnapshotsAll = useColorStores();

	// Trigger confetti when round ends
	React.useEffect(() => {
		if (roundActive || confettiTriggered) {
			if (roundActive) {
				setConfettiTriggered(false);
			}
			return;
		}

		const hasResults = Object.values(roundResults).some((count) => count > 0);

		if (confetti && !confettiTriggered && hasResults) {
			setConfettiTriggered(true);
			confetti.triggerConfetti({ preset: 'massive' });
		}
	}, [roundActive, confetti, confettiTriggered, roundResults]);

	return (
		<div className="flex h-full w-full max-w-7xl flex-col items-center justify-center space-y-12">
			{logoUrl && logoUrl.length > 0 && (
				<div className="mb-4">
					<img src={logoUrl} alt="Event logo" className="h-32 object-contain" />
				</div>
			)}

			{roundActive && (
				<div className="rounded-2xl border border-blue-400/30 bg-blue-50/20 px-8 py-6 text-center backdrop-blur-sm">
					<p className="text-lg font-semibold text-blue-200">
						{config.roundNumber} {roundNumber}
					</p>
					<p className="mt-2 text-6xl font-bold text-blue-300">
						<KmTimeCountdown ms={remainingMs} />
					</p>
					{remainingMs < 10000 && (
						<p className="mt-2 animate-pulse text-lg font-semibold text-red-400">
							{config.almostTimeMd}
						</p>
					)}
				</div>
			)}

			{/* Visualization based on selected mode */}
			{visualizationMode === 'pulse' && (
				<div className="grid w-full max-w-6xl grid-cols-2 gap-6 lg:grid-cols-3 xl:grid-cols-5">
					{colors.map((color) => (
						<AnimatedPulseRings
							key={color}
							color={color}
							colorName={colorNames[color]}
							factionState={dynamicSnapshotsAll[color]}
						/>
					))}
				</div>
			)}

			{visualizationMode === 'network' && (
				<div className="grid w-full max-w-6xl grid-cols-2 gap-6 lg:grid-cols-3 xl:grid-cols-5">
					{colors.map((color) => (
						<NetworkVisualization
							key={color}
							color={color}
							colorName={colorNames[color]}
							factionState={dynamicSnapshotsAll[color]}
						/>
					))}
				</div>
			)}

			{visualizationMode === 'bars' && (
				<RacingBars
					colors={colors}
					colorNames={colorNames}
					factionStates={dynamicSnapshotsAll}
				/>
			)}

			{visualizationMode === 'bubbles' && (
				<BubbleChart
					colors={colors}
					colorNames={colorNames}
					factionStates={dynamicSnapshotsAll}
				/>
			)}

			{visualizationMode === 'pie' && (
				<PieChart
					colors={colors}
					colorNames={colorNames}
					factionStates={dynamicSnapshotsAll}
				/>
			)}

			{/* Summary - total players across all colors (only for pulse and network modes) */}
			{(visualizationMode === 'pulse' || visualizationMode === 'network') && (
				<div className="rounded-2xl border border-slate-600/50 bg-slate-700/50 px-6 py-4 text-center backdrop-blur-sm lg:px-8 lg:py-6">
					<p className="text-3xl font-bold text-white lg:text-4xl">
						{colors.reduce((sum, color) => {
							const players = Object.keys(
								dynamicSnapshotsAll[color]?.players || {}
							);
							return sum + players.length;
						}, 0)}
					</p>
					<p className="text-base text-slate-300 lg:text-lg">
						{config.totalConnectedLabel}
					</p>
				</div>
			)}
		</div>
	);
};

/**
 * Outer wrapper component that only renders inner component when numberOfColors changes
 * This ensures we reinitialize hooks when the number of colors changes
 */
export const ColorPresenterView: React.FC = () => {
	const {
		colorNames,
		logoUrl,
		roundNumber,
		roundStartTimestamp,
		roundActive,
		roundDurationSeconds,
		roundResults,
		numberOfColors,
		presenterVisualizationMode
	} = useSnapshot(globalStore.proxy);

	const COLORS = generateColorArray(numberOfColors);

	return (
		<ColorPresenterInner
			key={`${numberOfColors}-${roundNumber}`}
			colors={COLORS}
			colorNames={colorNames}
			logoUrl={logoUrl}
			roundNumber={roundNumber}
			roundStartTimestamp={roundStartTimestamp}
			roundActive={roundActive}
			roundDurationSeconds={roundDurationSeconds}
			roundResults={roundResults}
			visualizationMode={presenterVisualizationMode}
		/>
	);
};
