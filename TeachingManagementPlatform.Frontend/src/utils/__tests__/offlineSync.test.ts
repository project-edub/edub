import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  addToQueue,
  getQueue,
  saveQueue,
  removeFromQueue,
  getPendingCount,
  syncOfflineChanges,
  isOnline,
  onConnectivityChange,
  type PendingChange,
  type ScoreApiClient,
} from '../offlineSync';

describe('offlineSync', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  // ── Queue Management ─────────────────────────────────────────────────────

  describe('getQueue', () => {
    it('returns empty array when localStorage is empty', () => {
      expect(getQueue()).toEqual([]);
    });

    it('returns parsed queue from localStorage', () => {
      const change: PendingChange = {
        id: 'uuid-1',
        entryId: 1,
        columnName: 'Miệng',
        value: '8',
        timestamp: 1000,
        status: 'pending',
      };
      localStorage.setItem('scoreChanges', JSON.stringify([change]));
      expect(getQueue()).toEqual([change]);
    });

    it('returns empty array on invalid JSON', () => {
      localStorage.setItem('scoreChanges', 'not-json');
      expect(getQueue()).toEqual([]);
    });
  });

  describe('addToQueue', () => {
    it('adds a change to the queue in localStorage', () => {
      const change: PendingChange = {
        id: 'uuid-1',
        entryId: 1,
        columnName: 'Hs15p',
        value: '7.5',
        timestamp: 1000,
        status: 'pending',
      };
      addToQueue(change);
      expect(getQueue()).toEqual([change]);
    });

    it('appends to existing queue', () => {
      const change1: PendingChange = {
        id: 'uuid-1',
        entryId: 1,
        columnName: 'Hs15p',
        value: '7',
        timestamp: 1000,
        status: 'pending',
      };
      const change2: PendingChange = {
        id: 'uuid-2',
        entryId: 2,
        columnName: 'Hs1T',
        value: '9',
        timestamp: 2000,
        status: 'pending',
      };
      addToQueue(change1);
      addToQueue(change2);
      expect(getQueue()).toHaveLength(2);
    });
  });

  describe('removeFromQueue', () => {
    it('removes items by ID from the queue', () => {
      const changes: PendingChange[] = [
        { id: 'a', entryId: 1, columnName: 'c1', value: '1', timestamp: 100, status: 'pending' },
        { id: 'b', entryId: 2, columnName: 'c2', value: '2', timestamp: 200, status: 'pending' },
        { id: 'c', entryId: 3, columnName: 'c3', value: '3', timestamp: 300, status: 'pending' },
      ];
      saveQueue(changes);
      removeFromQueue(['a', 'c']);
      expect(getQueue()).toEqual([changes[1]]);
    });
  });

  describe('getPendingCount', () => {
    it('returns count of pending and failed items', () => {
      const changes: PendingChange[] = [
        { id: 'a', entryId: 1, columnName: 'c1', value: '1', timestamp: 100, status: 'pending' },
        { id: 'b', entryId: 2, columnName: 'c2', value: '2', timestamp: 200, status: 'syncing' },
        { id: 'c', entryId: 3, columnName: 'c3', value: '3', timestamp: 300, status: 'failed' },
      ];
      saveQueue(changes);
      // pending + failed = 2
      expect(getPendingCount()).toBe(2);
    });
  });

  // ── Sync Algorithm ─────────────────────────────────────────────────────────

  describe('syncOfflineChanges', () => {
    it('syncs all pending changes successfully', async () => {
      const queue: PendingChange[] = [
        { id: 'a', entryId: 1, columnName: 'Miệng', value: '8', timestamp: 100, status: 'pending' },
        { id: 'b', entryId: 2, columnName: 'Hs15p', value: '7', timestamp: 200, status: 'pending' },
      ];
      const mockClient: ScoreApiClient = {
        updateCell: vi.fn().mockResolvedValue(undefined),
      };

      const result = await syncOfflineChanges(queue, mockClient);

      expect(result.synced).toEqual(['a', 'b']);
      expect(result.failed).toEqual([]);
      expect(mockClient.updateCell).toHaveBeenCalledTimes(2);
    });

    it('deduplicates changes for same cell, keeping latest', async () => {
      const queue: PendingChange[] = [
        { id: 'a', entryId: 1, columnName: 'Miệng', value: '5', timestamp: 100, status: 'pending' },
        { id: 'b', entryId: 1, columnName: 'Miệng', value: '8', timestamp: 300, status: 'pending' },
        { id: 'c', entryId: 1, columnName: 'Miệng', value: '6', timestamp: 200, status: 'pending' },
      ];
      const mockClient: ScoreApiClient = {
        updateCell: vi.fn().mockResolvedValue(undefined),
      };

      const result = await syncOfflineChanges(queue, mockClient);

      // Only the latest (id='b', value='8') should be synced
      expect(result.synced).toEqual(['b']);
      expect(result.failed).toEqual([]);
      expect(mockClient.updateCell).toHaveBeenCalledTimes(1);
      expect(mockClient.updateCell).toHaveBeenCalledWith(1, 'Miệng', '8', undefined);
    });

    it('syncs in timestamp order (FIFO)', async () => {
      const queue: PendingChange[] = [
        { id: 'b', entryId: 2, columnName: 'Hs1T', value: '9', timestamp: 300, status: 'pending' },
        { id: 'a', entryId: 1, columnName: 'Miệng', value: '7', timestamp: 100, status: 'pending' },
      ];
      const callOrder: number[] = [];
      const mockClient: ScoreApiClient = {
        updateCell: vi.fn().mockImplementation(async (entryId: number) => {
          callOrder.push(entryId);
        }),
      };

      await syncOfflineChanges(queue, mockClient);

      // entry 1 (timestamp 100) before entry 2 (timestamp 300)
      expect(callOrder).toEqual([1, 2]);
    });

    it('marks failed items and continues', async () => {
      const queue: PendingChange[] = [
        { id: 'a', entryId: 1, columnName: 'c1', value: '5', timestamp: 100, status: 'pending' },
        { id: 'b', entryId: 2, columnName: 'c2', value: '8', timestamp: 200, status: 'pending' },
      ];
      const mockClient: ScoreApiClient = {
        updateCell: vi.fn()
          .mockRejectedValueOnce(new Error('Network error'))
          .mockResolvedValueOnce(undefined),
      };

      const result = await syncOfflineChanges(queue, mockClient);

      expect(result.synced).toEqual(['b']);
      expect(result.failed).toEqual(['a']);
      expect(queue[0].status).toBe('failed');
    });

    it('passes note to apiClient when present', async () => {
      const queue: PendingChange[] = [
        { id: 'a', entryId: 1, columnName: 'Miệng', value: '8', note: 'Sửa điểm', timestamp: 100, status: 'pending' },
      ];
      const mockClient: ScoreApiClient = {
        updateCell: vi.fn().mockResolvedValue(undefined),
      };

      await syncOfflineChanges(queue, mockClient);

      expect(mockClient.updateCell).toHaveBeenCalledWith(1, 'Miệng', '8', 'Sửa điểm');
    });

    it('returns empty arrays for empty queue', async () => {
      const mockClient: ScoreApiClient = {
        updateCell: vi.fn(),
      };

      const result = await syncOfflineChanges([], mockClient);

      expect(result.synced).toEqual([]);
      expect(result.failed).toEqual([]);
      expect(mockClient.updateCell).not.toHaveBeenCalled();
    });
  });

  // ── Connectivity Detection ─────────────────────────────────────────────────

  describe('isOnline', () => {
    it('returns navigator.onLine value', () => {
      // jsdom defaults navigator.onLine to true
      expect(isOnline()).toBe(true);
    });
  });

  describe('onConnectivityChange', () => {
    it('calls listener on online event', () => {
      const listener = vi.fn();
      const unsubscribe = onConnectivityChange(listener);

      window.dispatchEvent(new Event('online'));
      expect(listener).toHaveBeenCalledWith(true);

      unsubscribe();
    });

    it('calls listener on offline event', () => {
      const listener = vi.fn();
      const unsubscribe = onConnectivityChange(listener);

      window.dispatchEvent(new Event('offline'));
      expect(listener).toHaveBeenCalledWith(false);

      unsubscribe();
    });

    it('unsubscribe removes event listeners', () => {
      const listener = vi.fn();
      const unsubscribe = onConnectivityChange(listener);
      unsubscribe();

      window.dispatchEvent(new Event('online'));
      window.dispatchEvent(new Event('offline'));
      expect(listener).not.toHaveBeenCalled();
    });
  });
});
