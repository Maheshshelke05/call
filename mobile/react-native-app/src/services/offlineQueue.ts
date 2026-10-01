import AsyncStorage from '@react-native-async-storage/async-storage';
import { Api } from './api';
import { OfflineCallItem } from '../types';

const QUEUE_STORAGE_KEY = 'offline_calls_queue_v1';
const CONTACTS_CACHE_KEY = 'cached_assigned_contacts_v1';

export const OfflineQueue = {
  async getQueue(): Promise<OfflineCallItem[]> {
    try {
      const raw = await AsyncStorage.getItem(QUEUE_STORAGE_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  },

  async enqueueCall(callItem: OfflineCallItem): Promise<void> {
    const queue = await this.getQueue();
    // Verify idempotency: do not add duplicate client_event_id
    const existingIndex = queue.findIndex((q) => q.client_event_id === callItem.client_event_id);
    if (existingIndex >= 0) {
      queue[existingIndex] = callItem; // Update existing
    } else {
      queue.push(callItem);
    }
    await AsyncStorage.setItem(QUEUE_STORAGE_KEY, JSON.stringify(queue));
    // Trigger background sync attempt immediately
    this.flushQueue();
  },

  async flushQueue(): Promise<{ synced: number; failed: number }> {
    const queue = await this.getQueue();
    if (queue.length === 0) return { synced: 0, failed: 0 };

    let syncedCount = 0;
    let failedCount = 0;
    const remainingQueue: OfflineCallItem[] = [];

    for (const item of queue) {
      if (item.sync_status === 'SYNCED') continue;

      try {
        await Api.syncCall({
          client_event_id: item.client_event_id,
          contact_id: item.contact_id,
          campaign_id: item.campaign_id,
          phone_number_snapshot: item.phone_number_snapshot,
          sim_slot: item.sim_slot,
          started_at: item.started_at,
          answered_at: item.answered_at,
          ended_at: item.ended_at,
          duration_seconds: item.duration_seconds,
          status: item.status,
          disposition_code: item.disposition_code,
          notes: item.notes,
          callback_at: item.callback_at,
        });
        syncedCount++;
      } catch (err: any) {
        failedCount++;
        item.retry_count = (item.retry_count || 0) + 1;
        item.sync_status = 'FAILED';
        remainingQueue.push(item);
      }
    }

    await AsyncStorage.setItem(QUEUE_STORAGE_KEY, JSON.stringify(remainingQueue));
    return { synced: syncedCount, failed: failedCount };
  },

  async cacheContacts(contacts: any[]): Promise<void> {
    await AsyncStorage.setItem(CONTACTS_CACHE_KEY, JSON.stringify(contacts));
  },

  async getCachedContacts(): Promise<any[]> {
    try {
      const raw = await AsyncStorage.getItem(CONTACTS_CACHE_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  },

  async getPendingCount(): Promise<number> {
    const queue = await this.getQueue();
    return queue.filter((i) => i.sync_status !== 'SYNCED').length;
  }
};
