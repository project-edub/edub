/**
 * Offline sync utilities for the ScoreGrid.
 *
 * Provides a localStorage-backed queue for pending score changes
 * and automatic sync when connectivity is restored.
 *
 * Requirements: 4.1, 4.2, 4.3
 */

// ── Types ────────────────────────────────────────────────────────────────────

export interface PendingChange {
  id: string;                    // UUID
  entryId: number;
  columnName: string;
  value: string;
  note?: string;
  timestamp: number;
  status: 'pending' | 'syncing' | 'failed';
}

/** Minimal API client interface used by syncOfflineChanges. */
export interface ScoreApiClient {
  updateCell(
    entryId: number,
    columnName: string,
    value: string,
    note?: string,
  ): Promise<void>;
}

// ── Constants ────────────────────────────────────────────────────────────────

const STORAGE_KEY = 'scoreChanges';

// ── Queue Management ─────────────────────────────────────────────────────────

/**
 * Reads the current pending-changes queue from localStorage.
 */
export function getQueue(): PendingChange[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as PendingChange[];
  } catch {
    return [];
  }
}

/**
 * Persists the given queue to localStorage.
 */
export function saveQueue(queue: PendingChange[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(queue));
}

/**
 * Adds a new pending change to the localStorage queue.
 *
 * Req 4.1: saves change with status 'pending' when offline.
 */
export function addToQueue(change: PendingChange): void {
  const queue = getQueue();
  queue.push(change);
  saveQueue(queue);
}

/**
 * Removes synced items from the queue by their IDs.
 */
export function removeFromQueue(ids: string[]): void {
  const idSet = new Set(ids);
  const queue = getQueue().filter((item) => !idSet.has(item.id));
  saveQueue(queue);
}

/**
 * Returns the count of pending (not yet synced) items in the queue.
 *
 * Req 4.2: used to display pending count in SaveStatus.
 */
export function getPendingCount(): number {
  return getQueue().filter((c) => c.status === 'pending' || c.status === 'failed').length;
}

// ── Sync Algorithm ───────────────────────────────────────────────────────────

/**
 * Syncs offline changes to the server.
 *
 * Algorithm:
 * 1. Dedup: for each cell (entryId + columnName), keep only the latest change (highest timestamp).
 * 2. Sort remaining changes by timestamp ascending (FIFO).
 * 3. Send each change to the API sequentially.
 *
 * Req 4.3: auto-sync pending changes in FIFO order when online.
 * Req 4.4 (design): dedup keeps only latest value per cell.
 *
 * @param queue - Array of pending changes to sync
 * @param apiClient - API client with updateCell method
 * @returns Object with arrays of synced and failed change IDs
 */
export async function syncOfflineChanges(
  queue: PendingChange[],
  apiClient: ScoreApiClient,
): Promise<{ synced: string[]; failed: string[] }> {
  const synced: string[] = [];
  const failed: string[] = [];

  // Dedup: giữ lại change mới nhất cho mỗi cell
  const latestByCell = new Map<string, PendingChange>();
  for (const change of queue) {
    const key = `${change.entryId}:${change.columnName}`;
    const existing = latestByCell.get(key);
    if (!existing || change.timestamp > existing.timestamp) {
      latestByCell.set(key, change);
    }
  }

  // Sync theo thứ tự timestamp (FIFO)
  const toSync = [...latestByCell.values()].sort((a, b) => a.timestamp - b.timestamp);

  for (const change of toSync) {
    try {
      change.status = 'syncing';
      await apiClient.updateCell(change.entryId, change.columnName, change.value, change.note);
      synced.push(change.id);
    } catch {
      change.status = 'failed';
      failed.push(change.id);
    }
  }

  return { synced, failed };
}

// ── Online/Offline Detection ─────────────────────────────────────────────────

export type ConnectivityListener = (online: boolean) => void;

/**
 * Returns the current online status.
 */
export function isOnline(): boolean {
  return navigator.onLine;
}

/**
 * Subscribes to connectivity changes via the `online` and `offline` events.
 *
 * Returns an unsubscribe function for cleanup.
 *
 * Req 4.3: when connectivity is restored, caller can trigger syncOfflineChanges.
 */
export function onConnectivityChange(listener: ConnectivityListener): () => void {
  const handleOnline = () => listener(true);
  const handleOffline = () => listener(false);

  window.addEventListener('online', handleOnline);
  window.addEventListener('offline', handleOffline);

  return () => {
    window.removeEventListener('online', handleOnline);
    window.removeEventListener('offline', handleOffline);
  };
}
