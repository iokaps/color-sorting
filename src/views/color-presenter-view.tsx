import { FactionBar } from '@/components/faction-bar';
import { useDynamicStore } from '@/hooks/useDynamicStore';
import { useServerTimer } from '@/hooks/useServerTime';
import { colorActions } from '@/state/actions/color-actions';
import {
	createColorFactionState,
	getColorStoreName,
	type ColorFactionState
} from '@/state/stores/color-store';
import { globalStore, type ColorName } from '@/state/stores/global-store';
import { generateColorArray, getColorHex } from '@/utils/color-utils';
import { useSnapshot, type KokimokiStore } from '@kokimoki/app';
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
	roundResults
}) => {
	const serverTime = useServerTimer(250);
	const confetti = useKmConfettiContext();
	const [confettiTriggered, setConfettiTriggered] = React.useState(false);

	const elapsedMs = Math.max(0, serverTime - roundStartTimestamp);
	const roundDurationMs = (roundDurationSeconds || 90) * 1000;
	const remainingMs = Math.max(0, roundDurationMs - elapsedMs);

	// Initialize stores for all 10 colors (unconditional hook calls)
	const redStore = useDynamicStore(
		getColorStoreName('red'),
		createColorFactionState()
	);
	const blueStore = useDynamicStore(
		getColorStoreName('blue'),
		createColorFactionState()
	);
	const greenStore = useDynamicStore(
		getColorStoreName('green'),
		createColorFactionState()
	);
	const yellowStore = useDynamicStore(
		getColorStoreName('yellow'),
		createColorFactionState()
	);
	const purpleStore = useDynamicStore(
		getColorStoreName('purple'),
		createColorFactionState()
	);
	const pinkStore = useDynamicStore(
		getColorStoreName('pink'),
		createColorFactionState()
	);
	const indigoStore = useDynamicStore(
		getColorStoreName('indigo'),
		createColorFactionState()
	);
	const cyanStore = useDynamicStore(
		getColorStoreName('cyan'),
		createColorFactionState()
	);
	const orangeStore = useDynamicStore(
		getColorStoreName('orange'),
		createColorFactionState()
	);
	const limeStore = useDynamicStore(
		getColorStoreName('lime'),
		createColorFactionState()
	);

	// Get snapshots for all colors (unconditional hook calls - required by React Rules of Hooks)
	// These capture reactive updates from the stores
	const redSnapshot = useSnapshot(redStore.store.proxy);
	const blueSnapshot = useSnapshot(blueStore.store.proxy);
	const greenSnapshot = useSnapshot(greenStore.store.proxy);
	const yellowSnapshot = useSnapshot(yellowStore.store.proxy);
	const purpleSnapshot = useSnapshot(purpleStore.store.proxy);
	const pinkSnapshot = useSnapshot(pinkStore.store.proxy);
	const indigoSnapshot = useSnapshot(indigoStore.store.proxy);
	const cyanSnapshot = useSnapshot(cyanStore.store.proxy);
	const orangeSnapshot = useSnapshot(orangeStore.store.proxy);
	const limeSnapshot = useSnapshot(limeStore.store.proxy);

	// Build a map of all stores for easy access
	const dynamicStoresAll = React.useMemo<
		Record<ColorName, KokimokiStore<ColorFactionState>>
	>(
		() => ({
			red: redStore.store,
			blue: blueStore.store,
			green: greenStore.store,
			yellow: yellowStore.store,
			purple: purpleStore.store,
			pink: pinkStore.store,
			indigo: indigoStore.store,
			cyan: cyanStore.store,
			orange: orangeStore.store,
			lime: limeStore.store
		}),
		[
			redStore.store,
			blueStore.store,
			greenStore.store,
			yellowStore.store,
			purpleStore.store,
			pinkStore.store,
			indigoStore.store,
			cyanStore.store,
			orangeStore.store,
			limeStore.store
		]
	);

	// Calculate all faction clusters for active colors (for visualization)
	const factionClusters = React.useMemo(() => {
		const clusters: Record<ColorName, number[]> = {};

		for (const color of colors) {
			const store = dynamicStoresAll[color];
			if (store) {
				clusters[color] = colorActions.getAllFactionClusters(store);
			} else {
				clusters[color] = [];
			}
		}

		return clusters;
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [
		colors,
		dynamicStoresAll,
		redSnapshot,
		blueSnapshot,
		greenSnapshot,
		yellowSnapshot,
		purpleSnapshot,
		pinkSnapshot,
		indigoSnapshot,
		cyanSnapshot,
		orangeSnapshot,
		limeSnapshot
	]);

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
						Round {roundNumber}
					</p>
					<p className="mt-2 text-6xl font-bold text-blue-300">
						<KmTimeCountdown ms={remainingMs} />
					</p>
					{remainingMs < 10000 && (
						<p className="mt-2 animate-pulse text-lg font-semibold text-red-400">
							Almost time!
						</p>
					)}
				</div>
			)}

			{/* Faction bars display - shows cluster distribution */}
			<div className="w-full max-w-6xl space-y-3">
				{colors.map((color) => (
					<FactionBar
						key={color}
						color={getColorHex(color)}
						colorName={colorNames[color]}
						clusterSizes={factionClusters[color] || []}
					/>
				))}
			</div>

			{/* Summary - total players across all colors */}
			<div className="rounded-2xl border border-slate-600/50 bg-slate-700/50 px-6 py-4 text-center backdrop-blur-sm lg:px-8 lg:py-6">
				<p className="text-3xl font-bold text-white lg:text-4xl">
					{colors.reduce((sum, color) => {
						const clusters = factionClusters[color] || [];
						return sum + clusters.reduce((a, b) => a + b, 0);
					}, 0)}
				</p>
				<p className="text-base text-slate-300 lg:text-lg">Total connected</p>
			</div>
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
		numberOfColors
	} = useSnapshot(globalStore.proxy);

	const COLORS = generateColorArray(numberOfColors);

	return (
		<ColorPresenterInner
			key={numberOfColors}
			colors={COLORS}
			colorNames={colorNames}
			logoUrl={logoUrl}
			roundNumber={roundNumber}
			roundStartTimestamp={roundStartTimestamp}
			roundActive={roundActive}
			roundDurationSeconds={roundDurationSeconds}
			roundResults={roundResults}
		/>
	);
};
