import { PrismaClient, RecordingSource } from '@prisma/client';
import { IAudioRecordingRepository } from '../../domain/repositories/index.js';
import { AudioRecordingEntity, AudioMetadataEntity } from '@mewsense/shared-types';

export class PrismaAudioRecordingRepository implements IAudioRecordingRepository {
  constructor(private prisma: PrismaClient) {}

  async findById(id: string): Promise<AudioRecordingEntity | null> {
    const record = await this.prisma.audioRecording.findFirst({
      where: { id, deletedAt: null }
    });
    if (!record) return null;
    return this.mapToEntity(record);
  }

  async findByHash(sha256Hash: string): Promise<AudioRecordingEntity | null> {
    const record = await this.prisma.audioRecording.findFirst({
      where: { sha256Hash, deletedAt: null }
    });
    if (!record) return null;
    return this.mapToEntity(record);
  }

  async findByUserId(userId: string, limit = 20, offset = 0): Promise<AudioRecordingEntity[]> {
    const records = await this.prisma.audioRecording.findMany({
      where: { userId, deletedAt: null },
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip: offset
    });
    return records.map((r) => this.mapToEntity(r));
  }

  async create(data: Omit<AudioRecordingEntity, 'id' | 'createdAt' | 'updatedAt'>): Promise<AudioRecordingEntity> {
    const record = await this.prisma.audioRecording.create({
      data: {
        userId: data.userId,
        catId: data.catId,
        storageKey: data.storageKey,
        storageProvider: data.storageProvider,
        originalFilename: data.originalFilename,
        mimeType: data.mimeType,
        fileSizeBytes: data.fileSizeBytes,
        sha256Hash: data.sha256Hash,
        source: data.source as RecordingSource,
        contextEnvironment: data.context?.environment,
        contextActivity: data.context?.activity,
        contextFoodPresent: data.context?.foodPresent,
        contextOtherAnimals: data.context?.otherAnimalsPresent,
        contextUserNotes: data.context?.userNotes,
        contextSelected: data.context?.userSelectedContext,
        isConsentedForResearch: data.isConsentedForResearch ?? false
      }
    });
    return this.mapToEntity(record);
  }

  async saveMetadata(data: Omit<AudioMetadataEntity, 'id' | 'createdAt'>): Promise<AudioMetadataEntity> {
    const metadata = await this.prisma.audioMetadata.upsert({
      where: { recordingId: data.recordingId },
      update: {
        durationSeconds: data.durationSeconds,
        sampleRate: data.sampleRate,
        channels: data.channels,
        bitDepth: data.bitDepth,
        rmsEnergy: data.rmsEnergy,
        pitchF0Min: data.pitchF0Min,
        pitchF0Max: data.pitchF0Max,
        pitchF0Mean: data.pitchF0Mean,
        spectralCentroidMean: data.spectralCentroidMean,
        zeroCrossingRateMean: data.zeroCrossingRateMean,
        snrDb: data.snrDb,
        spectrogramThumbnailUrl: data.spectrogramThumbnailUrl
      },
      create: {
        recordingId: data.recordingId,
        durationSeconds: data.durationSeconds,
        sampleRate: data.sampleRate,
        channels: data.channels,
        bitDepth: data.bitDepth,
        rmsEnergy: data.rmsEnergy,
        pitchF0Min: data.pitchF0Min,
        pitchF0Max: data.pitchF0Max,
        pitchF0Mean: data.pitchF0Mean,
        spectralCentroidMean: data.spectralCentroidMean,
        zeroCrossingRateMean: data.zeroCrossingRateMean,
        snrDb: data.snrDb,
        spectrogramThumbnailUrl: data.spectrogramThumbnailUrl
      }
    });

    return {
      id: metadata.id,
      recordingId: metadata.recordingId,
      durationSeconds: metadata.durationSeconds,
      sampleRate: metadata.sampleRate,
      channels: metadata.channels,
      bitDepth: metadata.bitDepth,
      rmsEnergy: metadata.rmsEnergy,
      pitchF0Min: metadata.pitchF0Min,
      pitchF0Max: metadata.pitchF0Max,
      pitchF0Mean: metadata.pitchF0Mean,
      spectralCentroidMean: metadata.spectralCentroidMean,
      zeroCrossingRateMean: metadata.zeroCrossingRateMean,
      snrDb: metadata.snrDb,
      spectrogramThumbnailUrl: metadata.spectrogramThumbnailUrl,
      createdAt: metadata.createdAt
    };
  }

  async getMetadata(recordingId: string): Promise<AudioMetadataEntity | null> {
    const meta = await this.prisma.audioMetadata.findUnique({
      where: { recordingId }
    });
    if (!meta) return null;
    return {
      id: meta.id,
      recordingId: meta.recordingId,
      durationSeconds: meta.durationSeconds,
      sampleRate: meta.sampleRate,
      channels: meta.channels,
      bitDepth: meta.bitDepth,
      rmsEnergy: meta.rmsEnergy,
      pitchF0Min: meta.pitchF0Min,
      pitchF0Max: meta.pitchF0Max,
      pitchF0Mean: meta.pitchF0Mean,
      spectralCentroidMean: meta.spectralCentroidMean,
      zeroCrossingRateMean: meta.zeroCrossingRateMean,
      snrDb: meta.snrDb,
      spectrogramThumbnailUrl: meta.spectrogramThumbnailUrl,
      createdAt: meta.createdAt
    };
  }

  async softDelete(id: string): Promise<void> {
    await this.prisma.audioRecording.update({
      where: { id },
      data: { deletedAt: new Date() }
    });
  }

  private mapToEntity(record: any): AudioRecordingEntity {
    return {
      id: record.id,
      userId: record.userId,
      catId: record.catId,
      storageKey: record.storageKey,
      storageProvider: record.storageProvider,
      originalFilename: record.originalFilename,
      mimeType: record.mimeType,
      fileSizeBytes: record.fileSizeBytes,
      sha256Hash: record.sha256Hash,
      source: record.source,
      context: {
        environment: record.contextEnvironment,
        activity: record.contextActivity,
        foodPresent: record.contextFoodPresent,
        otherAnimalsPresent: record.contextOtherAnimals,
        userNotes: record.contextUserNotes,
        userSelectedContext: record.contextSelected
      },
      isConsentedForResearch: record.isConsentedForResearch,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
      deletedAt: record.deletedAt
    };
  }
}
