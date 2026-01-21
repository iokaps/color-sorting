import { kmClient } from '@/services/km-client';
import type { KokimokiStore } from '@kokimoki/app';
import { useEffect, useSyncExternalStore } from 'react';

interface StoreEntry {
	store: KokimokiStore<object>;
	joinPromise: Promise<void> | null;
	joined: boolean;
	listeners: Set<() => void>;
}

// Global store cache - stores persist for the entire app lifecycle
// This prevents EventEmitter memory leaks from repeated join/leave cycles
const storeCache = new Map<string, StoreEntry>();

export interface UseDynamicStoreResult<T extends object> {
	store: KokimokiStore<T>;
	isConnected: boolean;
	isConnecting: boolean;
}

function getOrCreateEntry<T extends object>(
	roomName: string,
	initialState: T
): StoreEntry {
	let entry = storeCache.get(roomName);
	if (!entry) {
		const store = kmClient.store<T>(roomName, initialState, false);
		entry = { store, joinPromise: null, joined: false, listeners: new Set() };
		storeCache.set(roomName, entry);
	}
	return entry;
}

function notifyListeners(entry: StoreEntry) {
	entry.listeners.forEach((listener) => listener());
}

/**
 * Hook to manage dynamic Kokimoki stores with connection state.
 * Stores are created once and persist for the app lifetime to prevent memory leaks.
 *
 * @param roomName - The unique name of the Kokimoki store (room)
 * @param initialState - The initial state for the Kokimoki store
 * @returns An object containing the Kokimoki store and connection states
 */
export function useDynamicStore<T extends object>(
	roomName: string,
	initialState: T
): UseDynamicStoreResult<T> {
	const entry = getOrCreateEntry(roomName, initialState);
	const store = entry.store as KokimokiStore<T>;

	// Use useSyncExternalStore to subscribe to connection state changes
	const isConnected = useSyncExternalStore(
		(onStoreChange) => {
			entry.listeners.add(onStoreChange);
			return () => {
				entry.listeners.delete(onStoreChange);
			};
		},
		() => entry.joined,
		() => entry.joined
	);

	const isConnecting = useSyncExternalStore(
		(onStoreChange) => {
			entry.listeners.add(onStoreChange);
			return () => {
				entry.listeners.delete(onStoreChange);
			};
		},
		() => entry.joinPromise !== null && !entry.joined,
		() => entry.joinPromise !== null && !entry.joined
	);

	// Join store on mount (only once per store)
	useEffect(() => {
		const currentEntry = storeCache.get(roomName);
		if (!currentEntry) return;

		// If already joined or joining, nothing to do
		if (currentEntry.joined || currentEntry.joinPromise) {
			return;
		}

		// Start joining
		const joinPromise = kmClient
			.join(currentEntry.store)
			.then(() => {
				currentEntry.joined = true;
				currentEntry.joinPromise = null;
				notifyListeners(currentEntry);
			})
			.catch((error) => {
				console.error(
					`[useDynamicStore] Failed to join store ${roomName}:`,
					error
				);
				currentEntry.joinPromise = null;
				notifyListeners(currentEntry);
			});

		currentEntry.joinPromise = joinPromise;
		notifyListeners(currentEntry);

		// NO CLEANUP - stores persist for app lifetime to prevent memory leaks
		// The SDK adds event listeners on join that aren't properly cleaned up on leave
	}, [roomName]);

	return {
		store,
		isConnected,
		isConnecting
	};
}
