import {
  IAnalysisRepository,
  IAudioRecordingRepository,
  IPredictionRepository,
  ICatRepository
} from '../../domain/repositories/index.js';
import { IAnalysisQueue, AnalysisEventBus } from '../../infrastructure/queue/index.js';
import { IObjectStorage } from '../../infrastructure/storage/index.js';
import {
  AnalysisStatus,
  AnalysisStage,
  VocalizationType,
  ContextIntent,
  AnalysisResultResponseData
} from '@mewsense/shared-types';

export interface MLInferenceResult {
  audioCharacteristics: {
    durationSeconds: number;
    sampleRate: number;
    rmsEnergy: number;
    pitchF0Mean?: number;
    pitchF0Min?: number;
    pitchF0Max?: number;
    spectralCentroidHz: number;
    zeroCrossingRate: number;
    snrDb?: number;
  };
  prediction: {
    detectionStatus?: string;
    predictionStatus?: string;
    openSetStatus?: string;
    catProbability?: number;
    primarySoundType: VocalizationType;
    probableContext: ContextIntent;
    confidence: number;
    isDistressPattern: boolean;
    probabilities: {
      sound: Record<string, number>;
      context: Record<string, number>;
      detection?: Record<string, number>;
    };
    explanationText: string;
    scientificDisclaimer: string;
    modelVersion: string;
  };
}

export class AnalysisService {
  constructor(
    private analysisRepo: IAnalysisRepository,
    private audioRepo: IAudioRecordingRepository,
    private predictionRepo: IPredictionRepository,
    private catRepo: ICatRepository,
    private queue: IAnalysisQueue,
    private storage: IObjectStorage,
    private modelRepo?: { findActive: () => Promise<{ id: string; version: string } | null> },
    private eventBus: AnalysisEventBus = AnalysisEventBus.getInstance()
  ) {}

  async enqueueAnalysis(userId: string, recordingId: string): Promise<{ analysisId: string; status: AnalysisStatus; streamUrl: string }> {
    const recording = await this.audioRepo.findById(recordingId);
    if (!recording || recording.userId !== userId) {
      const err = new Error('Audio recording not found');
      (err as any).statusCode = 404;
      (err as any).code = 'RECORDING_NOT_FOUND';
      throw err;
    }

    const analysis = await this.analysisRepo.create(recordingId);

    await this.queue.enqueue({
      analysisId: analysis.id,
      recordingId: recording.id,
      userId,
      storageKey: recording.storageKey,
      originalFilename: recording.originalFilename,
      mimeType: recording.mimeType,
      context: recording.context
    });

    return {
      analysisId: analysis.id,
      status: analysis.status,
      streamUrl: `/api/v1/analysis/${analysis.id}/stream`
    };
  }

  async getAnalysisById(userId: string, analysisId: string): Promise<AnalysisResultResponseData> {
    const analysis = await this.analysisRepo.findById(analysisId);
    if (!analysis) {
      const err = new Error('Analysis not found');
      (err as any).statusCode = 404;
      (err as any).code = 'ANALYSIS_NOT_FOUND';
      throw err;
    }

    const recording = await this.audioRepo.findById(analysis.recordingId);
    if (!recording || recording.userId !== userId) {
      const err = new Error('Analysis not found or access denied');
      (err as any).statusCode = 404;
      (err as any).code = 'ANALYSIS_NOT_FOUND';
      throw err;
    }

    const cat = recording.catId ? await this.catRepo.findById(recording.catId) : null;
    const metadata = await this.audioRepo.getMetadata(recording.id);
    const prediction = await this.predictionRepo.findByAnalysisId(analysis.id);

    return {
      id: analysis.id,
      status: analysis.status,
      stage: analysis.stage,
      createdAt: typeof analysis.createdAt === 'string' ? analysis.createdAt : analysis.createdAt.toISOString(),
      completedAt: analysis.completedAt ? (typeof analysis.completedAt === 'string' ? analysis.completedAt : analysis.completedAt.toISOString()) : null,
      latencyMs: analysis.latencyMs,
      recording: {
        id: recording.id,
        originalFilename: recording.originalFilename,
        cat: cat ? { id: cat.id, name: cat.name, breed: cat.breed } : null,
        context: recording.context
      },
      audioCharacteristics: metadata ? {
        durationSeconds: metadata.durationSeconds,
        sampleRate: metadata.sampleRate,
        rmsEnergy: metadata.rmsEnergy,
        pitchF0Mean: metadata.pitchF0Mean,
        pitchF0Min: metadata.pitchF0Min,
        pitchF0Max: metadata.pitchF0Max,
        spectralCentroidHz: metadata.spectralCentroidMean,
        zeroCrossingRate: metadata.zeroCrossingRateMean,
        snrDb: metadata.snrDb,
        spectrogramUrl: metadata.spectrogramThumbnailUrl
      } : null,
      prediction: prediction ? {
        detectionStatus: prediction.detectionStatus || 'CAT_VOCALIZATION',
        predictionStatus: prediction.predictionStatus || 'VALID',
        openSetStatus: prediction.openSetStatus || 'KNOWN_CAT_SOUND',
        catProbability: prediction.catProbability ?? 1.0,
        primarySoundType: prediction.primarySoundType,
        probableContext: prediction.probableContext,
        confidence: prediction.confidence,
        isDistressPattern: prediction.isDistressPattern,
        probabilities: prediction.probabilities,
        explanationText: prediction.explanationText,
        scientificDisclaimer: prediction.scientificDisclaimer,
        modelVersion: 'mewsense-acoustic-v1.0'
      } : null,
      error: analysis.errorMessage
    };
  }

  async getUserHistory(userId: string, limit = 20, offset = 0) {
    return this.analysisRepo.findByUserId(userId, limit, offset);
  }

  // Processing orchestrator invoked by the Queue Worker
  async processJob(job: {
    analysisId: string;
    recordingId: string;
    userId: string;
    storageKey: string;
    context?: any;
  }, mlClient: { infer: (buffer: Buffer, context: any) => Promise<MLInferenceResult> }) {
    const startTime = Date.now();
    const { analysisId, recordingId, storageKey, context } = job;

    try {
      // Step 1: Audio Prep
      await this.analysisRepo.updateStage(analysisId, AnalysisStage.AUDIO_PREPARATION, AnalysisStatus.PROCESSING);
      this.eventBus.publishProgress({
        analysisId,
        status: AnalysisStatus.PROCESSING,
        stage: AnalysisStage.AUDIO_PREPARATION,
        percent: 20,
        message: 'Validating audio integrity and sample format'
      });

      const audioBuffer = await this.storage.downloadBuffer(storageKey);

      // Step 2: Feature Extraction
      await this.analysisRepo.updateStage(analysisId, AnalysisStage.EXTRACTING_FEATURES);
      this.eventBus.publishProgress({
        analysisId,
        status: AnalysisStatus.PROCESSING,
        stage: AnalysisStage.EXTRACTING_FEATURES,
        percent: 45,
        message: 'Extracting Mel Spectrogram, MFCCs, and pitch contours'
      });

      // Step 3: AI Model Inference
      await this.analysisRepo.updateStage(analysisId, AnalysisStage.RUNNING_AI_MODEL);
      this.eventBus.publishProgress({
        analysisId,
        status: AnalysisStatus.PROCESSING,
        stage: AnalysisStage.RUNNING_AI_MODEL,
        percent: 70,
        message: 'Running calibrated acoustic ensemble and context estimator'
      });

      const mlResult = await mlClient.infer(audioBuffer, context);

      // Step 4: Generating Interpretation
      await this.analysisRepo.updateStage(analysisId, AnalysisStage.GENERATING_INTERPRETATION);
      this.eventBus.publishProgress({
        analysisId,
        status: AnalysisStatus.PROCESSING,
        stage: AnalysisStage.GENERATING_INTERPRETATION,
        percent: 90,
        message: 'Synthesizing transparent explanation and behavioral probability distribution'
      });

      // Save AudioMetadata
      await this.audioRepo.saveMetadata({
        recordingId,
        durationSeconds: mlResult.audioCharacteristics.durationSeconds,
        sampleRate: mlResult.audioCharacteristics.sampleRate,
        channels: 1,
        rmsEnergy: mlResult.audioCharacteristics.rmsEnergy,
        pitchF0Mean: mlResult.audioCharacteristics.pitchF0Mean,
        pitchF0Min: mlResult.audioCharacteristics.pitchF0Min,
        pitchF0Max: mlResult.audioCharacteristics.pitchF0Max,
        spectralCentroidMean: mlResult.audioCharacteristics.spectralCentroidHz,
        zeroCrossingRateMean: mlResult.audioCharacteristics.zeroCrossingRate,
        snrDb: mlResult.audioCharacteristics.snrDb
      });

      // Fetch or use active model version ID
      const activeModel = this.modelRepo ? await this.modelRepo.findActive() : null;
      if (!activeModel) {
        throw new Error('No active model version deployed to handle inference.');
      }
      const modelVersionId = activeModel.id;

      // Save Prediction
      await this.predictionRepo.create({
        analysisId,
        modelVersionId,
        detectionStatus: mlResult.prediction.detectionStatus || 'CAT_VOCALIZATION',
        predictionStatus: mlResult.prediction.predictionStatus || 'VALID',
        openSetStatus: mlResult.prediction.openSetStatus || 'KNOWN_CAT_SOUND',
        catProbability: mlResult.prediction.catProbability ?? 1.0,
        primarySoundType: mlResult.prediction.primarySoundType,
        probableContext: mlResult.prediction.probableContext,
        confidence: mlResult.prediction.confidence,
        probabilities: mlResult.prediction.probabilities,
        explanationText: mlResult.prediction.explanationText,
        scientificDisclaimer: mlResult.prediction.scientificDisclaimer,
        isDistressPattern: mlResult.prediction.isDistressPattern
      });

      const latencyMs = Date.now() - startTime;
      await this.analysisRepo.markCompleted(analysisId, latencyMs);

      const finalResult = await this.getAnalysisById(job.userId, analysisId);

      this.eventBus.publishProgress({
        analysisId,
        status: AnalysisStatus.COMPLETED,
        stage: AnalysisStage.COMPLETED,
        percent: 100,
        message: 'Analysis completed successfully',
        result: finalResult
      });

    } catch (error: any) {
      console.error(`Analysis failed for job ${analysisId}:`, error);
      const safeErrorMessage = error.message || 'An unexpected error occurred during audio inference.';
      await this.analysisRepo.markFailed(analysisId, safeErrorMessage);

      this.eventBus.publishProgress({
        analysisId,
        status: AnalysisStatus.FAILED,
        stage: AnalysisStage.FAILED,
        percent: 100,
        message: safeErrorMessage
      });
    }
  }
}
