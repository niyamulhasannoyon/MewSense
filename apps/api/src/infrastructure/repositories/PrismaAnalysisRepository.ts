import { PrismaClient, AnalysisStatus as PrismaAnalysisStatus } from '@prisma/client';
import {
  IAnalysisRepository,
  IPredictionRepository,
  IFeedbackRepository,
  IModelVersionRepository
} from '../../domain/repositories/index.js';
import {
  AnalysisEntity,
  AnalysisStatus,
  AnalysisStage,
  PredictionEntity,
  FeedbackEntity,
  VocalizationType,
  ContextIntent
} from '@mewsense/shared-types';

export class PrismaAnalysisRepository implements IAnalysisRepository {
  constructor(private prisma: PrismaClient) {}

  async findById(id: string): Promise<AnalysisEntity | null> {
    const analysis = await this.prisma.analysis.findUnique({
      where: { id }
    });
    if (!analysis) return null;
    return this.mapToEntity(analysis);
  }

  async findByRecordingId(recordingId: string): Promise<AnalysisEntity[]> {
    const list = await this.prisma.analysis.findMany({
      where: { recordingId },
      orderBy: { createdAt: 'desc' }
    });
    return list.map((a) => this.mapToEntity(a));
  }

  async findByUserId(userId: string, limit = 20, offset = 0): Promise<any[]> {
    const list = await this.prisma.analysis.findMany({
      where: {
        recording: { userId, deletedAt: null }
      },
      include: {
        recording: {
          include: {
            cat: true,
            metadata: true
          }
        },
        predictions: {
          include: {
            modelVersion: true
          },
          take: 1
        },
        feedbacks: {
          take: 1
        }
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip: offset
    });
    return list;
  }

  async create(recordingId: string): Promise<AnalysisEntity> {
    const analysis = await this.prisma.analysis.create({
      data: {
        recordingId,
        status: PrismaAnalysisStatus.QUEUED,
        stage: AnalysisStage.UPLOADING
      }
    });
    return this.mapToEntity(analysis);
  }

  async updateStage(id: string, stage: AnalysisStage, status?: AnalysisStatus): Promise<AnalysisEntity> {
    const updated = await this.prisma.analysis.update({
      where: { id },
      data: {
        stage,
        ...(status && { status: status as unknown as PrismaAnalysisStatus }),
        ...(status === AnalysisStatus.PROCESSING && { processingStartedAt: new Date() })
      }
    });
    return this.mapToEntity(updated);
  }

  async markCompleted(id: string, latencyMs: number): Promise<AnalysisEntity> {
    const updated = await this.prisma.analysis.update({
      where: { id },
      data: {
        status: PrismaAnalysisStatus.COMPLETED,
        stage: AnalysisStage.COMPLETED,
        completedAt: new Date(),
        latencyMs
      }
    });
    return this.mapToEntity(updated);
  }

  async markFailed(id: string, errorMessage: string): Promise<AnalysisEntity> {
    const updated = await this.prisma.analysis.update({
      where: { id },
      data: {
        status: PrismaAnalysisStatus.FAILED,
        stage: AnalysisStage.FAILED,
        errorMessage
      }
    });
    return this.mapToEntity(updated);
  }

  private mapToEntity(record: any): AnalysisEntity {
    return {
      id: record.id,
      recordingId: record.recordingId,
      status: record.status as unknown as AnalysisStatus,
      stage: record.stage as unknown as AnalysisStage,
      errorMessage: record.errorMessage,
      processingStartedAt: record.processingStartedAt,
      completedAt: record.completedAt,
      latencyMs: record.latencyMs,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt
    };
  }
}

export class PrismaModelVersionRepository implements IModelVersionRepository {
  constructor(private prisma: PrismaClient) {}

  async findActive(): Promise<{ id: string; version: string } | null> {
    const model = await this.prisma.modelVersion.findFirst({
      where: { status: 'ACTIVE' },
      orderBy: { deployedAt: 'desc' }
    });
    if (!model) return null;
    return { id: model.id, version: model.version };
  }
}

export class PrismaPredictionRepository implements IPredictionRepository {
  constructor(private prisma: PrismaClient) {}

  async create(data: Omit<PredictionEntity, 'id' | 'createdAt'>): Promise<PredictionEntity> {
    const created = await this.prisma.prediction.create({
      data: {
        analysisId: data.analysisId,
        modelVersionId: data.modelVersionId,
        detectionStatus: data.detectionStatus || 'CAT_VOCALIZATION',
        predictionStatus: data.predictionStatus || 'VALID',
        openSetStatus: data.openSetStatus || 'KNOWN_CAT_SOUND',
        catProbability: data.catProbability ?? 1.0,
        primarySoundType: data.primarySoundType,
        probableContext: data.probableContext,
        confidence: data.confidence,
        soundProbabilities: data.probabilities.sound,
        contextProbabilities: data.probabilities.context,
        explanationText: data.explanationText,
        scientificDisclaimer: data.scientificDisclaimer,
        isDistressPattern: data.isDistressPattern
      }
    });

    return {
      id: created.id,
      analysisId: created.analysisId,
      modelVersionId: created.modelVersionId,
      detectionStatus: created.detectionStatus || 'CAT_VOCALIZATION',
      predictionStatus: created.predictionStatus || 'VALID',
      openSetStatus: created.openSetStatus || 'KNOWN_CAT_SOUND',
      catProbability: created.catProbability ?? 1.0,
      primarySoundType: created.primarySoundType as VocalizationType,
      probableContext: created.probableContext as ContextIntent,
      confidence: created.confidence,
      probabilities: {
        sound: created.soundProbabilities as Record<string, number>,
        context: created.contextProbabilities as Record<string, number>
      },
      explanationText: created.explanationText,
      scientificDisclaimer: created.scientificDisclaimer,
      isDistressPattern: created.isDistressPattern,
      createdAt: created.createdAt
    };
  }

  async findByAnalysisId(analysisId: string): Promise<PredictionEntity | null> {
    const pred = await this.prisma.prediction.findFirst({
      where: { analysisId }
    });
    if (!pred) return null;
    return {
      id: pred.id,
      analysisId: pred.analysisId,
      modelVersionId: pred.modelVersionId,
      detectionStatus: pred.detectionStatus || 'CAT_VOCALIZATION',
      predictionStatus: pred.predictionStatus || 'VALID',
      openSetStatus: pred.openSetStatus || 'KNOWN_CAT_SOUND',
      catProbability: pred.catProbability ?? 1.0,
      primarySoundType: pred.primarySoundType as VocalizationType,
      probableContext: pred.probableContext as ContextIntent,
      confidence: pred.confidence,
      probabilities: {
        sound: pred.soundProbabilities as Record<string, number>,
        context: pred.contextProbabilities as Record<string, number>
      },
      explanationText: pred.explanationText,
      scientificDisclaimer: pred.scientificDisclaimer,
      isDistressPattern: pred.isDistressPattern,
      createdAt: pred.createdAt
    };
  }
}

export class PrismaFeedbackRepository implements IFeedbackRepository {
  constructor(private prisma: PrismaClient) {}

  async create(data: Omit<FeedbackEntity, 'id' | 'createdAt'>): Promise<FeedbackEntity> {
    const fb = await this.prisma.feedback.create({
      data: {
        userId: data.userId,
        analysisId: data.analysisId,
        isAccurate: data.isAccurate,
        userPerceivedSound: data.userPerceivedSound,
        userPerceivedContext: data.userPerceivedContext,
        notes: data.notes
      }
    });
    return {
      id: fb.id,
      userId: fb.userId,
      analysisId: fb.analysisId,
      isAccurate: fb.isAccurate,
      userPerceivedSound: fb.userPerceivedSound as VocalizationType,
      userPerceivedContext: fb.userPerceivedContext as ContextIntent,
      notes: fb.notes,
      createdAt: fb.createdAt
    };
  }

  async findByAnalysisId(analysisId: string): Promise<FeedbackEntity | null> {
    const fb = await this.prisma.feedback.findFirst({
      where: { analysisId }
    });
    if (!fb) return null;
    return {
      id: fb.id,
      userId: fb.userId,
      analysisId: fb.analysisId,
      isAccurate: fb.isAccurate,
      userPerceivedSound: fb.userPerceivedSound as VocalizationType,
      userPerceivedContext: fb.userPerceivedContext as ContextIntent,
      notes: fb.notes,
      createdAt: fb.createdAt
    };
  }
}
