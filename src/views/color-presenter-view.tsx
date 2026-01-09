import { useDynamicStore } from '@/hooks/useDynamicStore';
import { useServerTimer } from '@/hooks/useServerTime';
import { colorActions } from '@/state/actions/color-actions';
import {
	createColorFactionState,
	getColorStoreName,
	type ColorFactionState
} from '@/state/stores/color-store';
import { globalStore, type ColorName } from '@/state/stores/global-store';
import { useSnapshot } from '@kokimoki/app';
import { KmTimeCountdown, useKmConfettiContext } from '@kokimoki/shared';
import * as React from 'react';

const COLOR_CLASSES: Record<ColorName, string> = {
	red: 'bg-rose-600',
	blue: 'bg-blue-700',
	green: 'bg-emerald-600',
	yellow: 'bg-amber-600'
};

const COLOR_EMOJIS: Record<ColorName, string> = {
	red: '🔴',
	blue: '🔵',
	green: '🟢',
	yellow: '🟡'
};

const COLORS: ColorName[] = ['red', 'blue', 'green', 'yellow'];

export const ColorPresenterView: React.FC = () => {
	// Create dynamic stores for each color and track faction counts
	const {
		colorNames,
		logoUrl,
		roundNumber,
		roundStartTimestamp,
		roundActive,
		roundDurationSeconds,
		roundResults
	} = useSnapshot(globalStore.proxy);
	const serverTime = useServerTimer(250); // Update timer every 250ms for smooth display
	const confetti = useKmConfettiContext();
	const [confettiTriggered, setConfettiTriggered] = React.useState(false);

	// Calculate elapsed time and remaining time
	const elapsedMs = Math.max(0, serverTime - roundStartTimestamp);
	const roundDurationMs = (roundDurationSeconds || 90) * 1000;
	const remainingMs = Math.max(0, roundDurationMs - elapsedMs);

	// Join all 4 color faction stores - call hooks outside loop
	const { store: storeRed } = useDynamicStore(
		getColorStoreName('red'),
		createColorFactionState()
	);
	const { store: storeBlue } = useDynamicStore(
		getColorStoreName('blue'),
		createColorFactionState()
	);
	const { store: storeGreen } = useDynamicStore(
		getColorStoreName('green'),
		createColorFactionState()
	);
	const { store: storeYellow } = useDynamicStore(
		getColorStoreName('yellow'),
		createColorFactionState()
	);

	const snapshotRed = useSnapshot(storeRed.proxy);
	const snapshotBlue = useSnapshot(storeBlue.proxy);
	const snapshotGreen = useSnapshot(storeGreen.proxy);
	const snapshotYellow = useSnapshot(storeYellow.proxy);

	// Memoize color stores map for faction calculation
	const colorStores = React.useMemo(
		() => ({
			red: storeRed,
			blue: storeBlue,
			green: storeGreen,
			yellow: storeYellow
		}),
		[storeRed, storeBlue, storeGreen, storeYellow]
	);

	// Memoize faction counts - only recalculate when snapshots change
	const factionCounts = React.useMemo(() => {
		const counts: Record<ColorName, number> = {
			red: 0,
			blue: 0,
			green: 0,
			yellow: 0
		};

		// Use snapshots to get player counts (triggers reactivity)
		const snapshots: Record<ColorName, ColorFactionState> = {
			red: snapshotRed,
			blue: snapshotBlue,
			green: snapshotGreen,
			yellow: snapshotYellow
		};

		for (const color of COLORS) {
			const snapshot = snapshots[color];
			if (snapshot?.players) {
				// Use player count from centralized store
				counts[color] = Object.keys(snapshot.players).length;
			}
			// Also calculate largest faction for more accurate display
			const store = colorStores[color];
			if (store) {
				const largestFaction = colorActions.calculateLargestFaction(store);
				counts[color] = Math.max(counts[color], largestFaction);
			}
		}

		return counts;
	}, [snapshotRed, snapshotBlue, snapshotGreen, snapshotYellow, colorStores]);

	// Trigger confetti when round ends
	React.useEffect(() => {
		if (roundActive || confettiTriggered) {
			// Reset confetti flag when round becomes active
			if (roundActive) {
				setConfettiTriggered(false);
			}
			return;
		}

		// Check if we have results
		const hasResults = Object.values(roundResults).some((count) => count > 0);

		if (confetti && !confettiTriggered && hasResults) {
			setConfettiTriggered(true);
			// Use 'massive' preset for bigger celebration on presenter screen
			confetti.triggerConfetti({ preset: 'massive' });
		}
	}, [roundActive, confetti, confettiTriggered, roundResults]);

	return (
		<div className="flex h-full w-full max-w-7xl flex-col items-center justify-center space-y-12">
			{/* Logo display */}
			{logoUrl && logoUrl.length > 0 && (
				<div className="mb-4">
					<img src={logoUrl} alt="Event logo" className="h-32 object-contain" />
				</div>
			)}

			{/* Round info and timer */}
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

			{/* Large color blocks display - grid layout */}
			<div className="w-full">
				<div className="grid w-full grid-cols-2 gap-6 md:gap-8 lg:grid-cols-4">
					{COLORS.map((color) => (
						<div
							key={color}
							className={`flex flex-col items-center justify-center rounded-2xl px-6 py-10 shadow-2xl lg:rounded-3xl lg:px-8 lg:py-12 ${COLOR_CLASSES[color]} transition-all duration-300 hover:scale-105`}
						>
							{/* Color emoji */}
							<p className="text-5xl lg:text-6xl">{COLOR_EMOJIS[color]}</p>

							{/* Color name */}
							<p className="mt-3 text-lg font-bold text-white lg:mt-4 lg:text-2xl">
								{colorNames[color]}
							</p>

							{/* Faction count */}
							<p className="mt-4 text-4xl font-bold text-white/90 lg:mt-6 lg:text-5xl">
								{factionCounts[color]}
							</p>
							<p className="text-sm font-semibold text-white/80 lg:text-lg">
								{factionCounts[color] === 1 ? 'player' : 'players'}
							</p>
						</div>
					))}
				</div>
			</div>

			{/* Summary */}
			<div className="rounded-2xl border border-slate-600/50 bg-slate-700/50 px-6 py-4 text-center backdrop-blur-sm lg:px-8 lg:py-6">
				<p className="text-3xl font-bold text-white lg:text-4xl">
					{Object.values(factionCounts).reduce((a, b) => a + b, 0)}
				</p>
				<p className="text-base text-slate-300 lg:text-lg">Total connected</p>
			</div>
		</div>
	);
};
