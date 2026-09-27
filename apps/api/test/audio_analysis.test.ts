import { describe, it, expect, beforeEach } from 'vitest';
import { AudioService } from '../src/application/services/AudioService.js';
import { AnalysisService } from '../src/application/services/AnalysisService.js';
import { MLServiceClient } from '../src/infrastructure/ml-client/index.js';
import { LocalStorageProvider } from '../src/infrastructure/storage/index.js';
import { InMemoryAnalysisQueue } from '../src/infrastructure/queue/index.js';
import { RecordingSource, VocalizationType, ContextIntent } from '@mewsense/shared-types';
import fs from 'node:fs';

class MockAudioRepository {
  private recordings: any[] = [];
  private metadata: any[] = [];

  async findById(id: string) {
    return this.recordings.find((r) => r.id === id) || null;
  }
  async findByHash(hash: string) {
    return this.recordings.find((r) => r.sha256Hash === hash) || null;
  }
  async findByUserId(userId: string) {
    return this.recordings.filter((r) => r.userId === userId);
  }
  async create(data: any) {
    const rec = { id: `rec_${this.recordings.length + 1}`, createdAt: new Date(), updatedAt: new Date(), ...data };
    this.recordings.push(rec);
    return rec;
  }
  async saveMetadata(data: any) {
    const meta = { id: `meta_${this.metadata.length + 1}`, createdAt: new Date(), ...data };
    this.metadata.push(meta);
    return meta;
  }
  async getMetadata(recordingId: string) {
    return this.metadata.find((m) => m.recordingId === recordingId) || null;
  }
  async softDelete(id: string) {
    const rec = await this.findById(id);
    if (rec) rec.deletedAt = new Date();
  }
}

class MockCatRepository {
  private cats: any[] = [
    { id: 'cat_123', userId: 'user_1', name: 'Mochi', breed: 'Scottish Fold' }
  ];
  async findById(id: string) {
    return this.cats.find((c) => c.id === id) || null;
  }
  async findByUserId(userId: string) {
    return this.cats.filter((c) => c.userId === userId);
  }
  async create(data: any) {
    const cat = { id: `cat_${this.cats.length + 1}`, ...data };
    this.cats.push(cat);
    return cat;
  }
  async update(id: string, data: any) {
    const cat = await this.findById(id);
    Object.assign(cat, data);
    return cat;
  }
  async softDelete(id: string) {
    const cat = await this.findById(id);
    if (cat) cat.deletedAt = new Date();
  }
  async countByUserId(userId: string) {
    return this.cats.filter((c) => c.userId === userId).length;
  }
}

class MockAnalysisRepository {
  private analyses: any[] = [];
  async findById(id: string) {
    return this.analyses.find((a) => a.id === id) || null;
  }
  async findByRecordingId(recordingId: string) {
    return this.analyses.filter((a) => a.recordingId === recordingId);
  }
  async findByUserId() {
    return this.analyses;
  }
  async create(recordingId: string) {
    const a = {
      id: `analysis_${this.analyses.length + 1}`,
      recordingId,
      status: 'QUEUED',
      stage: 'uploading',
      createdAt: new Date(),
      updatedAt: new Date()
    };
    this.analyses.push(a);
    return a;
  }
  async updateStage(id: string, stage: string, status?: string) {
    const a = await this.findById(id);
    a.stage = stage;
    if (status) a.status = status;
    return a;
  }
  async markCompleted(id: string, latencyMs: number) {
    const a = await this.findById(id);
    a.status = 'COMPLETED';
    a.stage = 'completed';
    a.latencyMs = latencyMs;
    a.completedAt = new Date();
    return a;
  }
  async markFailed(id: string, errorMessage: string) {
    const a = await this.findById(id);
    a.status = 'FAILED';
    a.stage = 'failed';
    a.errorMessage = errorMessage;
    return a;
  }
}

class MockPredictionRepository {
  private predictions: any[] = [];
  async create(data: any) {
    const pred = { id: `pred_${this.predictions.length + 1}`, createdAt: new Date(), ...data };
    this.predictions.push(pred);
    return pred;
  }
  async findByAnalysisId(analysisId: string) {
    return this.predictions.find((p) => p.analysisId === analysisId) || null;
  }
}

describe('Audio & Analysis Pipeline Tests', () => {
  let audioService: AudioService;
  let analysisService: AnalysisService;
  let audioRepo: MockAudioRepository;
  let catRepo: MockCatRepository;
  let analysisRepo: MockAnalysisRepository;
  let predictionRepo: MockPredictionRepository;
  let storage: LocalStorageProvider;
  let queue: InMemoryAnalysisQueue;
  let mlClient: MLServiceClient;

  beforeEach(() => {
    audioRepo = new MockAudioRepository();
    catRepo = new MockCatRepository();
    analysisRepo = new MockAnalysisRepository();
    predictionRepo = new MockPredictionRepository();
    storage = new LocalStorageProvider('./storage/test_uploads');
    queue = new InMemoryAnalysisQueue();
    mlClient = new MLServiceClient();

    audioService = new AudioService(audioRepo as any, catRepo as any, storage);
    analysisService = new AnalysisService(
      analysisRepo as any,
      audioRepo as any,
      predictionRepo as any,
      catRepo as any,
      queue,
      storage,
      { findActive: async () => ({ id: 'model_1', version: 'v1.0.0' }) }
    );
  });

  it('handles direct audio upload and persists recording', async () => {
    // Generate dummy audio buffer (16-bit PCM)
    const dummyPcm = Buffer.alloc(16000);
    const recording = await audioService.handleDirectUpload(
      'user_1',
      dummyPcm,
      'test_meow.wav',
      'audio/wav',
      RecordingSource.FILE_UPLOAD,
      'cat_123',
      { environment: 'indoor', activity: 'feeding' }
    );

    expect(recording.id).toBeDefined();
    expect(recording.userId).toBe('user_1');
    expect(recording.catId).toBe('cat_123');
    expect(recording.fileSizeBytes).toBe(16000);
  });

  it('enqueues and processes an analysis job with calibrated output', async () => {
    const dummyPcm = Buffer.alloc(16000);
    const recording = await audioService.handleDirectUpload(
      'user_1',
      dummyPcm,
      'test_purr.wav',
      'audio/wav',
      RecordingSource.MICROPHONE_WEB,
      'cat_123',
      { environment: 'indoor', activity: 'resting' }
    );

    const { analysisId, status } = await analysisService.enqueueAnalysis('user_1', recording.id);
    expect(analysisId).toBeDefined();
    expect(status).toBe('QUEUED');

    // Run processing
    await analysisService.processJob(
      {
        analysisId,
        recordingId: recording.id,
        userId: 'user_1',
        storageKey: recording.storageKey,
        context: recording.context
      },
      mlClient
    );

    const finalResult = await analysisService.getAnalysisById('user_1', analysisId);
    expect(finalResult.status).toBe('COMPLETED');
    expect(finalResult.prediction).toBeDefined();
    expect(finalResult.prediction?.confidence).toBeGreaterThanOrEqual(0.0);
    expect(finalResult.prediction?.confidence).toBeLessThanOrEqual(1.0);
    expect(finalResult.prediction?.scientificDisclaimer).toContain('not a literal translation');
    expect(finalResult.audioCharacteristics?.durationSeconds).toBeGreaterThan(0);
  });

  it('rejects human meow sound with NON_CAT_SOUND status and NO_VALID_PREDICTION', async () => {
    const dummyPcm = Buffer.alloc(4000); // short low-energy PCM payload
    const recording = await audioService.handleDirectUpload(
      'user_1',
      dummyPcm,
      'human_fake_meow.wav',
      'audio/wav',
      RecordingSource.MICROPHONE_WEB,
      'cat_123',
      { environment: 'indoor', activity: 'feeding', isHumanSpeech: true, userNotes: 'human saying meow meow' }
    );

    const { analysisId } = await analysisService.enqueueAnalysis('user_1', recording.id);

    await analysisService.processJob(
      {
        analysisId,
        recordingId: recording.id,
        userId: 'user_1',
        storageKey: recording.storageKey,
        context: recording.context
      },
      mlClient
    );

    const finalResult = await analysisService.getAnalysisById('user_1', analysisId);
    expect(finalResult.status).toBe('COMPLETED');
    expect(finalResult.prediction?.detectionStatus).toBe('NON_CAT_SOUND');
    expect(finalResult.prediction?.predictionStatus).toBe('NO_VALID_PREDICTION');
    expect(finalResult.prediction?.probableContext).toBe('UNKNOWN_INSUFFICIENT_CONFIDENCE');
    expect(finalResult.prediction?.scientificDisclaimer).toContain('No cat vocalization detected');
  });
});
