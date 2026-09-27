import {
  UserEntity,
  CatEntity,
  AudioRecordingEntity,
  AudioMetadataEntity,
  AnalysisEntity,
  PredictionEntity,
  FeedbackEntity,
  AnalysisStatus,
  AnalysisStage
} from '@mewsense/shared-types';

export interface IUserRepository {
  findById(id: string): Promise<UserEntity | null>;
  findByEmail(email: string): Promise<UserEntity | null>;
  findAuthByEmail(email: string): Promise<(UserEntity & { passwordHash: string }) | null>;
  create(data: Omit<UserEntity, 'id' | 'createdAt' | 'updatedAt'> & { passwordHash: string }): Promise<UserEntity>;
  update(id: string, data: Partial<UserEntity>): Promise<UserEntity>;
  softDelete(id: string): Promise<void>;
}

export interface ICatRepository {
  findById(id: string): Promise<CatEntity | null>;
  findByUserId(userId: string): Promise<CatEntity[]>;
  create(data: Omit<CatEntity, 'id' | 'createdAt' | 'updatedAt'>): Promise<CatEntity>;
  update(id: string, data: Partial<CatEntity>): Promise<CatEntity>;
  softDelete(id: string): Promise<void>;
  countByUserId(userId: string): Promise<number>;
}

export interface IAudioRecordingRepository {
  findById(id: string): Promise<AudioRecordingEntity | null>;
  findByHash(sha256Hash: string): Promise<AudioRecordingEntity | null>;
  findByUserId(userId: string, limit?: number, offset?: number): Promise<AudioRecordingEntity[]>;
  create(data: Omit<AudioRecordingEntity, 'id' | 'createdAt' | 'updatedAt'>): Promise<AudioRecordingEntity>;
  saveMetadata(data: Omit<AudioMetadataEntity, 'id' | 'createdAt'>): Promise<AudioMetadataEntity>;
  getMetadata(recordingId: string): Promise<AudioMetadataEntity | null>;
  softDelete(id: string): Promise<void>;
}

export interface IAnalysisRepository {
  findById(id: string): Promise<AnalysisEntity | null>;
  findByRecordingId(recordingId: string): Promise<AnalysisEntity[]>;
  findByUserId(userId: string, limit?: number, offset?: number): Promise<AnalysisEntity[]>;
  create(recordingId: string): Promise<AnalysisEntity>;
  updateStage(id: string, stage: AnalysisStage, status?: AnalysisStatus): Promise<AnalysisEntity>;
  markCompleted(id: string, latencyMs: number): Promise<AnalysisEntity>;
  markFailed(id: string, errorMessage: string): Promise<AnalysisEntity>;
}

export interface IModelVersionRepository {
  findActive(): Promise<{ id: string; version: string } | null>;
}

export interface IPredictionRepository {
  create(data: Omit<PredictionEntity, 'id' | 'createdAt'>): Promise<PredictionEntity>;
  findByAnalysisId(analysisId: string): Promise<PredictionEntity | null>;
}

export interface IFeedbackRepository {
  create(data: Omit<FeedbackEntity, 'id' | 'createdAt'>): Promise<FeedbackEntity>;
  findByAnalysisId(analysisId: string): Promise<FeedbackEntity | null>;
}
