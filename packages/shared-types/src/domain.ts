import {
  VocalizationType,
  ContextIntent,
  UserRole,
  AnalysisStatus,
  AnalysisStage,
  CatSex,
  RecordingSource,
  EnvironmentContext,
  ActivityContext
} from './enums.js';

export interface UserEntity {
  id: string;
  email: string;
  fullName: string;
  role: UserRole;
  isEmailVerified: boolean;
  avatarUrl?: string | null;
  allowTrainingConsent: boolean;
  languagePreference: string;
  createdAt: Date | string;
  updatedAt: Date | string;
  deletedAt?: Date | string | null;
}

export interface CatEntity {
  id: string;
  userId: string;
  name: string;
  breed?: string | null;
  birthDate?: Date | string | null;
  sex: CatSex;
  isNeutered: boolean;
  avatarUrl?: string | null;
  medicalNotes?: string | null;
  createdAt: Date | string;
  updatedAt: Date | string;
  deletedAt?: Date | string | null;
}

export interface RecordingContext {
  environment?: EnvironmentContext | string;
  activity?: ActivityContext | string;
  foodPresent?: boolean;
  otherAnimalsPresent?: boolean;
  userNotes?: string;
  userSelectedContext?: string;
}

export interface AudioRecordingEntity {
  id: string;
  userId: string;
  catId?: string | null;
  storageKey: string;
  storageProvider: string;
  originalFilename: string;
  mimeType: string;
  fileSizeBytes: number;
  sha256Hash: string;
  source: RecordingSource;
  context: RecordingContext;
  isConsentedForResearch: boolean;
  createdAt: Date | string;
  updatedAt: Date | string;
  deletedAt?: Date | string | null;
}

export interface AudioMetadataEntity {
  id: string;
  recordingId: string;
  durationSeconds: number;
  sampleRate: number;
  channels: number;
  bitDepth?: number | null;
  rmsEnergy: number;
  pitchF0Min?: number | null;
  pitchF0Max?: number | null;
  pitchF0Mean?: number | null;
  spectralCentroidMean: number;
  zeroCrossingRateMean: number;
  snrDb?: number | null;
  spectrogramThumbnailUrl?: string | null;
  createdAt: Date | string;
}

export interface PredictionProbabilities {
  sound: Record<VocalizationType | string, number>;
  context: Record<ContextIntent | string, number>;
}

export interface PredictionEntity {
  id: string;
  analysisId: string;
  modelVersionId: string;
  primarySoundType: VocalizationType;
  probableContext: ContextIntent;
  confidence: number; // 0.0 - 1.0 calibrated
  probabilities: PredictionProbabilities;
  explanationText: string;
  scientificDisclaimer: string;
  isDistressPattern: boolean;
  createdAt: Date | string;
}

export interface ModelVersionEntity {
  id: string;
  name: string;
  version: string;
  description: string;
  metrics: {
    macroF1: number;
    accuracy: number;
    perClassMetrics: Record<string, { precision: number; recall: number; f1: number }>;
    datasetVersion?: string;
  };
  status: 'ACTIVE' | 'CANDIDATE' | 'DEPRECATED' | 'ROLLED_BACK';
  deployedAt: Date | string;
  createdAt: Date | string;
}

export interface AnalysisEntity {
  id: string;
  recordingId: string;
  status: AnalysisStatus;
  stage: AnalysisStage;
  errorMessage?: string | null;
  processingStartedAt?: Date | string | null;
  completedAt?: Date | string | null;
  latencyMs?: number | null;
  createdAt: Date | string;
  updatedAt: Date | string;
}

export interface FeedbackEntity {
  id: string;
  userId: string;
  analysisId: string;
  isAccurate: boolean;
  userPerceivedSound?: VocalizationType | string | null;
  userPerceivedContext?: ContextIntent | string | null;
  notes?: string | null;
  createdAt: Date | string;
}
