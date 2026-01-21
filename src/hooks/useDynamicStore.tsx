import { kmClient } from '@/services/km-client';
import type { KokimokiStore } from '@kokimoki/app';
import { useEffect, useRef, useState } from 'react';

interface StoreEntry {
	store: KokimokiStore<object>;
	refCount: number;
	joined: boolean;
	cleanupTimeout?: ReturnType<typeof setTimeout>;
}

const kokimokiStores = new Map<string, StoreEntry>();

// Track mounted components to prevent state updates after unmount
const mountedComponents = new Set<string>();

interface ConnectionState {
	connected: boolean;
	connecting: boolean;
}

export interface UseDynamicStoreResult<T extends object> {
	store: KokimokiStore<T>;
	isConnected: boolean;
	isConnecting: boolean;
}

/**
 * Hook to manage dynamic Kokimoki stores with connection state
 * @param roomName - The unique name of the Kokimoki store (room)
 * @param initialState - The initial state for the Kokimoki store
 * @returns An object containing the Kokimoki store and connection states
 */
export function useDynamicStore<T extends object>(
	roomName: string,
	initialState: T
): UseDynamicStoreResult<T> {
	const [connection, setConnection] = useState<ConnectionState>({
		connected: false,
		connecting: false
	});

	// Initialize or get cached store
	if (!kokimokiStores.has(roomName)) {
		const store = kmClient.store<T>(roomName, initialState, false);
		kokimokiStores.set(roomName, { store, refCount: 0, joined: false });
	}

	const entry = kokimokiStores.get(roomName)!;
	const store = entry.store as KokimokiStore<T>;

	// Generate a unique ID for this hook instance to track mounting
	const instanceIdRef = useRef<string>('');
	if (!instanceIdRef.current) {
		instanceIdRef.current = `${roomName}-${Date.now()}-${Math.random().toString(36).slice(2)}`;
	}
	const instanceId = instanceIdRef.current;

	useEffect(() => {
		// Mark this instance as mounted
		mountedComponents.add(instanceId);

		// Cancel any pending cleanup (handles React Strict Mode double-mounting)
		if (entry.cleanupTimeout) {
			clearTimeout(entry.cleanupTimeout);
			entry.cleanupTimeout = undefined;
		}

		// Increment reference count
		entry.refCount += 1;

		// Join store if not already joined
		if (!entry.joined) {
			entry.joined = true;
			setConnection({
				connecting: true,
				connected: false
			});

			kmClient
				.join(entry.store)
				.then(() => {
					// Only update state if this specific component instance is still mounted
					if (mountedComponents.has(instanceId)) {
						setConnection({
							connecting: false,
							connected: true
						});
					}
				})
				.catch((error) => {
					console.error(
						`[useDynamicStore] Failed to join store ${roomName}:`,
						error
					);
					if (mountedComponents.has(instanceId)) {
						setConnection({
							connecting: false,
							connected: false
						});
					}
					entry.joined = false;
				});
		} else {
			// Already joined by another instance
			setConnection({
				connecting: false,
				connected: true
			});
		}

		// Cleanup on unmount
		return () => {
			// Mark this instance as unmounted
			mountedComponents.delete(instanceId);

			const cleanupEntry = kokimokiStores.get(roomName);
			if (!cleanupEntry) return;

			// Decrement reference count
			cleanupEntry.refCount -= 1;

			// Schedule cleanup with debounce to handle React Strict Mode
			if (cleanupEntry.refCount <= 0) {
				cleanupEntry.cleanupTimeout = setTimeout(async () => {
					// Double-check refCount in case component remounted during timeout
					if (cleanupEntry.refCount > 0) return;

					// Leave store if joined
					if (cleanupEntry.joined) {
						cleanupEntry.joined = false;
						try {
							await kmClient.leave(cleanupEntry.store);
						} catch (error) {
							// Suppress expected "Room not joined" errors
							if (
								error instanceof Error &&
								!error.message?.includes('Room not joined')
							) {
								console.error(`Failed to leave store ${roomName}:`, error);
							}
						}
					}

					// Remove from cache to prevent stale store references
					kokimokiStores.delete(roomName);
				}, 250);
			}
		};
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [roomName, instanceId]);

	return {
		store,
		isConnected: connection.connected,
		isConnecting: connection.connecting
	};
}
