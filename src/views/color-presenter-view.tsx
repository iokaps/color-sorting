import { AnimatedPulseRings } from '@/components/animated-pulse-rings';
import { BubbleChart } from '@/components/bubble-chart';
import { NetworkVisualization } from '@/components/network-visualization';
import { PieChart } from '@/components/pie-chart';
import { RacingBars } from '@/components/racing-bars';
import { config } from '@/config';
import { useServerTimer } from '@/hooks/useServerTime';
import {
	factionsStore,
	getFactionData,
	type ColorFactionData
} from '@/state/stores/factions-store';
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

	// Get faction data from unified store (no dynamic stores needed)
	const factionsSnapshot = useSnapshot(factionsStore.proxy);

	// Create faction snapshots for each color
	const dynamicSnapshotsAll = React.useMemo(() => {
		const result: Record<ColorName, ColorFactionData> = {};
		for (const color of colors) {
			result[color] = getFactionData(factionsSnapshot, color);
		}
		return result;
	}, [factionsSnapshot, colors]);

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
				<div className="rounded-3xl border border-blue-400/20 bg-blue-950/40 px-10 py-6 text-center shadow-2xl backdrop-blur-md">
					<p className="text-lg font-semibold tracking-wide text-blue-300/80">
						{config.roundNumber} {roundNumber}
					</p>
					<p
						className={`mt-2 text-7xl font-extrabold tracking-tight text-blue-200 tabular-nums ${remainingMs < 10000 ? 'km-timer-urgent' : ''}`}
					>
						<KmTimeCountdown ms={remainingMs} />
					</p>
					{remainingMs < 10000 && (
						<p className="mt-2 text-lg font-semibold text-red-400">
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
				<div className="rounded-2xl border border-white/10 bg-white/5 px-8 py-5 text-center shadow-2xl backdrop-blur-md lg:px-10 lg:py-6">
					<p className="text-4xl font-extrabold text-white tabular-nums lg:text-5xl">
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
