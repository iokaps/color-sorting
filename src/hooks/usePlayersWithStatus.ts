import { globalStore } from '@/state/stores/global-store';
import { useSnapshot } from '@kokimoki/app';

/**
 * Hook to get the list of players with their online status.
 * @returns An array of players with their id, player value and online status.
 */
export function usePlayersWithStatus() {
	const { players } = useSnapshot(globalStore.proxy);
	const { clientIds: onlinePlayerIds } = useSnapshot(globalStore.connections);

	const playersList = Object.entries(players).map(([id, player]) => ({
		id,
		...player,
		isOnline: onlinePlayerIds.has(id)
	}));

	return { players: playersList };
}
