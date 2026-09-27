export interface QueuedRecording {
  id: string;
  localUri: string;
  filename: string;
  catId?: string;
  context: any;
  timestamp: number;
  syncAttempts: number;
}

export class OfflineRecordingQueue {
  private queue: QueuedRecording[] = [];

  enqueue(item: Omit<QueuedRecording, 'id' | 'timestamp' | 'syncAttempts'>): QueuedRecording {
    const queuedItem: QueuedRecording = {
      ...item,
      id: `offline_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      timestamp: Date.now(),
      syncAttempts: 0
    };
    this.queue.push(queuedItem);
    return queuedItem;
  }

  getQueue(): QueuedRecording[] {
    return [...this.queue];
  }

  remove(id: string): void {
    this.queue = this.queue.filter((q) => q.id !== id);
  }

  async syncAll(uploadFn: (item: QueuedRecording) => Promise<boolean>): Promise<{ synced: number; remaining: number }> {
    let synced = 0;
    const items = [...this.queue];

    for (const item of items) {
      try {
        item.syncAttempts += 1;
        const success = await uploadFn(item);
        if (success) {
          this.remove(item.id);
          synced += 1;
        }
      } catch (err) {
        console.warn(`Failed to sync offline recording ${item.id}:`, err);
      }
    }

    return { synced, remaining: this.queue.length };
  }
}

export const offlineQueue = new OfflineRecordingQueue();
