import { useDynamicStore } from '@/hooks/useDynamicStore';
import { kmClient } from '@/services/km-client';
import { colorActions } from '@/state/actions/color-actions';
import {
	createColorFactionState,
	getColorStoreName
} from '@/state/stores/color-store';
import { globalStore, type ColorName } from '@/state/stores/global-store';
import { useSnapshot } from '@kokimoki/app';
import { useEffect, useMemo, useRef } from 'react';
import { useServerTimer } from './useServerTime';

const COLORS: ColorName[] = ['red', 'blue', 'green', 'yellow'];

/**
 * Hook to control and modify the global state
 * @returns A boolean indicating if the current client is the global controller
 */
export function useGlobalController() {
	const { controllerConnectionId, roundActive, roundStartTimestamp } =
		useSnapshot(globalStore.proxy);
	const connections = useSnapshot(globalStore.connections);
	const connectionIds = connections.connectionIds;
	const isGlobalController = controllerConnectionId === kmClient.connectionId;
	const serverTime = useServerTimer(1000); // tick every second
	const roundEndedRef = useRef(false);

	// Get or create dynamic stores for each color - only call hooks outside loop
	const colorStoreRed = useDynamicStore(
		getColorStoreName('red'),
		createColorFactionState()
	);
	const colorStoreBlue = useDynamicStore(
		getColorStoreName('blue'),
		createColorFactionState()
	);
	const colorStoreGreen = useDynamicStore(
		getColorStoreName('green'),
		createColorFactionState()
	);
	const colorStoreYellow = useDynamicStore(
		getColorStoreName('yellow'),
		createColorFactionState()
	);

	const colorStores = useMemo(
		() => ({
			red: colorStoreRed.store,
			blue: colorStoreBlue.store,
			green: colorStoreGreen.store,
			yellow: colorStoreYellow.store
		}),
		[
			colorStoreRed.store,
			colorStoreBlue.store,
			colorStoreGreen.store,
			colorStoreYellow.store
		]
	);

	// Maintain connection that is assigned to be the global controller
	useEffect(() => {
		// Check if global controller is online
		if (connectionIds.has(controllerConnectionId)) {
			return;
		}

		// Select new host, sorting by connection id
		kmClient
			.transact([globalStore], ([globalState]) => {
				const connectionIdsArray = Array.from(connectionIds);
				connectionIdsArray.sort();
				globalState.controllerConnectionId = connectionIdsArray[0] || '';
			})
			.then(() => {})
			.catch(() => {});
	}, [connectionIds, controllerConnectionId]);

	// Run global controller-specific logic
	useEffect(() => {
		if (!isGlobalController) {
			roundEndedRef.current = false;
			return;
		}

		// Auto-end round after customizable duration
		if (roundActive) {
			const roundDurationMs =
				(globalStore.proxy.roundDurationSeconds || 90) * 1000;
			const elapsedMs = Math.max(0, serverTime - roundStartTimestamp);

			if (elapsedMs >= roundDurationMs && !roundEndedRef.current) {
				roundEndedRef.current = true;

				// Calculate largest faction for each color
				const calculateRoundResults = async () => {
					const results: Record<ColorName, number> = {
						red: 0,
						blue: 0,
						green: 0,
						yellow: 0
					};

					for (const color of COLORS) {
						const store = colorStores[color];
						if (store) {
							const factionSize =
								await colorActions.calculateLargestFaction(store);
							results[color] = factionSize;
						}
					}

					// Update global state with results and end the round
					await kmClient.transact([globalStore], ([globalState]) => {
						globalState.roundResults = results;
						globalState.roundActive = false;
					});
				};

				calculateRoundResults().catch(console.error);
			}
		} else {
			// Reset flag when round ends
			roundEndedRef.current = false;
		}
	}, [
		isGlobalController,
		serverTime,
		roundActive,
		roundStartTimestamp,
		colorStores
	]);

	return isGlobalController;
}
