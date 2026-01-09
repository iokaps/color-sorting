import { useDynamicStore } from '@/hooks/useDynamicStore';
import {
	createColorFactionState,
	getColorStoreName,
	type ColorFactionState
} from '@/state/stores/color-store';
import { globalStore, type ColorName } from '@/state/stores/global-store';
import { useSnapshot } from '@kokimoki/app';
import * as React from 'react';

const COLOR_CLASSES: Record<ColorName, string> = {
	red: 'bg-red-500',
	blue: 'bg-blue-500',
	green: 'bg-green-500',
	yellow: 'bg-yellow-400'
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
	const { colorNames, logoUrl } = useSnapshot(globalStore.proxy);
	const [factionCounts, setFactionCounts] = React.useState<
		Record<ColorName, number>
	>({
		red: 0,
		blue: 0,
		green: 0,
		yellow: 0
	});

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

	const colorSnapshots: Record<ColorName, ColorFactionState> = React.useMemo(
		() => ({
			red: snapshotRed,
			blue: snapshotBlue,
			green: snapshotGreen,
			yellow: snapshotYellow
		}),
		[snapshotRed, snapshotBlue, snapshotGreen, snapshotYellow]
	);

	// Update faction counts when snapshots change
	React.useEffect(() => {
		const newCounts: Record<ColorName, number> = {
			red: 0,
			blue: 0,
			green: 0,
			yellow: 0
		};

		for (const color of COLORS) {
			const snapshot = colorSnapshots[color];
			if (snapshot?.connections) {
				// Count is connections + 1 (for at least one person in the faction)
				newCounts[color] = Math.max(
					1,
					Object.keys(snapshot.connections).length + 1
				);
			}
		}

		setFactionCounts(newCounts);
	}, [colorSnapshots]);

	return (
		<div className="flex h-full flex-col items-center justify-center space-y-12 p-8">
			{/* Logo display */}
			{logoUrl && (
				<div className="mb-4">
					<img src={logoUrl} alt="Event logo" className="h-32 object-contain" />
				</div>
			)}

			{/* Large color blocks display */}
			<div className="grid w-full grid-cols-2 gap-8 md:grid-cols-4">
				{COLORS.map((color) => (
					<div
						key={color}
						className={`flex flex-col items-center justify-center rounded-3xl px-8 py-12 shadow-2xl ${COLOR_CLASSES[color]} transition-all duration-300`}
					>
						{/* Color emoji */}
						<p className="text-6xl">{COLOR_EMOJIS[color]}</p>

						{/* Color name */}
						<p className="mt-4 text-2xl font-bold text-white">
							{colorNames[color]}
						</p>

						{/* Faction count */}
						<p className="mt-6 text-5xl font-bold text-white/90">
							{factionCounts[color]}
						</p>
						<p className="text-lg font-semibold text-white/80">
							{factionCounts[color] === 1 ? 'player' : 'players'}
						</p>
					</div>
				))}
			</div>

			{/* Summary */}
			<div className="text-center">
				<p className="text-lg text-slate-600">
					Total connected:{' '}
					{Object.values(factionCounts).reduce((a, b) => a + b, 0)}
				</p>
			</div>
		</div>
	);
};
