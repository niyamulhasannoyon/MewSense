import EventEmitter from 'node:events';
import { AnalysisProgressEvent, AnalysisStatus, AnalysisStage } from '@mewsense/shared-types';

export interface AnalysisJobData {
  analysisId: string;
  recordingId: string;
  userId: string;
  storageKey: string;
  originalFilename: string;
  mimeType: string;
  context?: any;
}

export interface IAnalysisQueue {
  enqueue(data: AnalysisJobData): Promise<string>;
  registerWorker(processor: (job: AnalysisJobData) => Promise<void>): void;
}

// Global SSE & WebSocket event bus
export class AnalysisEventBus extends EventEmitter {
  private static instance: AnalysisEventBus;

  public static getInstance(): AnalysisEventBus {
    if (!AnalysisEventBus.instance) {
      AnalysisEventBus.instance = new AnalysisEventBus();
      AnalysisEventBus.instance.setMaxListeners(100);
    }
    return AnalysisEventBus.instance;
  }

  public publishProgress(event: AnalysisProgressEvent) {
    this.emit(`analysis:${event.analysisId}`, event);
  }

  public subscribe(analysisId: string, listener: (event: AnalysisProgressEvent) => void) {
    this.on(`analysis:${analysisId}`, listener);
  }

  public unsubscribe(analysisId: string, listener: (event: AnalysisProgressEvent) => void) {
    this.off(`analysis:${analysisId}`, listener);
  }
}

// In-Memory Queue with automatic background task worker for seamless local dev & testing
export class InMemoryAnalysisQueue implements IAnalysisQueue {
  private queue: AnalysisJobData[] = [];
  private isProcessing = false;
  private processor?: (job: AnalysisJobData) => Promise<void>;

  registerWorker(processor: (job: AnalysisJobData) => Promise<void>): void {
    this.processor = processor;
  }

  async enqueue(data: AnalysisJobData): Promise<string> {
    this.queue.push(data);
    // Trigger asynchronous execution without blocking API
    setImmediate(() => this.processNext());
    return data.analysisId;
  }

  private async processNext(): Promise<void> {
    if (this.isProcessing || this.queue.length === 0 || !this.processor) {
      return;
    }
    this.isProcessing = true;
    const job = this.queue.shift();
    if (job) {
      try {
        await this.processor(job);
      } catch (err) {
        console.error(`Error processing job ${job.analysisId}:`, err);
      }
    }
    this.isProcessing = false;
    if (this.queue.length > 0) {
      setImmediate(() => this.processNext());
    }
  }
}
