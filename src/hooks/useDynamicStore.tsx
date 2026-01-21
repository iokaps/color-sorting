import { kmClient } from '@/services/km-client';
import type { KokimokiStore } from '@kokimoki/app';
import { useSyncExternalStore } from 'react';

interface StoreEntry {
	store: KokimokiStore<object>;
	joining: boolean; // synchronous flag to prevent race conditions
	joined: boolean;
	listeners: Set<() => void>;
}

// Global store cache - stores persist for the entire app lifecycle
// This prevents EventEmitter memory leaks from repeated join/leave cycles
const storeCache = new Map<string, StoreEntry>();

// In dev mode with multiple iframes (host, players, presenter), each frame has its own
// module instance but shares the SDK's EventEmitter. This causes MaxListenersExceededWarning
// when joining many stores. This is expected in dev mode and not a real memory leak.
// In production, there's only one app instance so this doesn't occur.

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
		entry = { store, joining: false, joined: false, listeners: new Set() };
		storeCache.set(roomName, entry);
	}

	// Start joining immediately during store creation (synchronous check)
	// This prevents race conditions from multiple components mounting simultaneously
	if (!entry.joined && !entry.joining) {
		entry.joining = true;
		// Schedule the async join - this runs after render but the flag is already set
		Promise.resolve().then(() => {
			kmClient
				.join(entry.store)
				.then(() => {
					entry.joined = true;
					notifyListeners(entry);
				})
				.catch((error) => {
					console.error(
						`[useDynamicStore] Failed to join store ${roomName}:`,
						error
					);
					entry.joining = false;
					notifyListeners(entry);
				});
		});
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
		() => entry.joining && !entry.joined,
		() => entry.joining && !entry.joined
	);

	// Join is now initiated in getOrCreateEntry - no useEffect needed for joining
	// This ensures the joining flag is set synchronously during render before any effects run

	return {
		store,
		isConnected,
		isConnecting
	};
}
