import { useDynamicStore } from '@/hooks/useDynamicStore';
import { registerColorStore } from '@/hooks/useGlobalController';
import {
	createColorFactionState,
	getColorStoreName,
	type ColorFactionState
} from '@/state/stores/color-store';
import type { ColorName } from '@/state/stores/global-store';
import { useSnapshot } from '@kokimoki/app';
import { useEffect, useMemo } from 'react';

/**
 * Hook that manages all color faction stores at once.
 * Required because React hooks must be called unconditionally.
 * Initializes all 10 color stores and returns their snapshots.
 *
 * @returns Record mapping color name to faction state snapshot
 */
export function useColorStores(): Record<ColorName, ColorFactionState> {
	// Initialize all 10 stores unconditionally (React Rules of Hooks)
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

	// Register all stores with the global controller
	useEffect(() => {
		registerColorStore('red', redStore.store);
		registerColorStore('blue', blueStore.store);
		registerColorStore('green', greenStore.store);
		registerColorStore('yellow', yellowStore.store);
		registerColorStore('purple', purpleStore.store);
		registerColorStore('pink', pinkStore.store);
		registerColorStore('indigo', indigoStore.store);
		registerColorStore('cyan', cyanStore.store);
		registerColorStore('orange', orangeStore.store);
		registerColorStore('lime', limeStore.store);
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, []);

	// Get snapshots for all colors (unconditional - required by React)
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

	// Memoize the result to prevent unnecessary re-renders
	return useMemo<Record<ColorName, ColorFactionState>>(
		() => ({
			red: redSnapshot,
			blue: blueSnapshot,
			green: greenSnapshot,
			yellow: yellowSnapshot,
			purple: purpleSnapshot,
			pink: pinkSnapshot,
			indigo: indigoSnapshot,
			cyan: cyanSnapshot,
			orange: orangeSnapshot,
			lime: limeSnapshot
		}),
		[
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
		]
	);
}
