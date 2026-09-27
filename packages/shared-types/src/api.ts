import {
  UserEntity,
  CatEntity,
  AudioRecordingEntity,
  AudioMetadataEntity,
  AnalysisEntity,
  PredictionEntity,
  RecordingContext
} from './domain.js';
import {
  AnalysisStatus,
  AnalysisStage,
  VocalizationType,
  ContextIntent,
  RecordingSource,
  CatDetectionStatus,
  PredictionStatus,
  OpenSetAudioStatus
} from './enums.js';

export interface ApiSuccessResponse<T> {
  success: true;
  data: T;
  error: null;
  meta: {
    requestId: string;
    timestamp: string;
  };
}

export interface ApiFieldError {
  field: string;
  message: string;
}

export interface ApiErrorResponse {
  success: false;
  data: null;
  error: {
    code: string;
    message: string;
    details?: ApiFieldError[];
  };
  meta: {
    requestId: string;
    timestamp: string;
  };
}

export type ApiResponse<T> = ApiSuccessResponse<T> | ApiErrorResponse;

// Auth DTOs
export interface AuthResponseData {
  user: Omit<UserEntity, 'passwordHash'>;
  accessToken: string;
  expiresIn: number;
}

// Cat DTOs
export interface CatWithStats extends CatEntity {
  recordingCount: number;
}

// Audio Presign DTO
export interface PresignUploadRequest {
  catId?: string;
  filename: string;
  mimeType: string;
  fileSizeBytes: number;
  source: RecordingSource;
  context?: RecordingContext;
}

export interface PresignUploadResponseData {
  recordingId: string;
  uploadUrl: string;
  fileKey: string;
  requiredHeaders: Record<string, string>;
  expiresInSeconds: number;
}

// Analysis Enqueue DTO
export interface EnqueueAnalysisRequest {
  recordingId: string;
  priority?: 'normal' | 'high';
}

export interface EnqueueAnalysisResponseData {
  analysisId: string;
  status: AnalysisStatus;
  streamUrl: string;
  estimatedWaitMs: number;
}

// Analysis Full Result DTO
export interface AnalysisResultResponseData {
  id: string;
  status: AnalysisStatus;
  stage: AnalysisStage;
  createdAt: string;
  completedAt?: string | null;
  latencyMs?: number | null;
  recording: {
    id: string;
    originalFilename: string;
    audioUrl?: string;
    cat?: {
      id: string;
      name: string;
      breed?: string | null;
    } | null;
    context: RecordingContext;
  };
  audioCharacteristics?: {
    durationSeconds: number;
    sampleRate: number;
    rmsEnergy: number;
    pitchF0Mean?: number | null;
    pitchF0Min?: number | null;
    pitchF0Max?: number | null;
    spectralCentroidHz: number;
    zeroCrossingRate: number;
    snrDb?: number | null;
    spectrogramUrl?: string | null;
  } | null;
  prediction?: {
    detectionStatus?: CatDetectionStatus | string;
    predictionStatus?: PredictionStatus | string;
    openSetStatus?: OpenSetAudioStatus | string;
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
  } | null;
  error?: string | null;
}

// SSE Event Stream Payload
export interface AnalysisProgressEvent {
  analysisId: string;
  status: AnalysisStatus;
  stage: AnalysisStage;
  percent: number;
  message: string;
  result?: AnalysisResultResponseData | null;
}

// Feedback Request DTO
export interface SubmitFeedbackRequest {
  analysisId: string;
  isAccurate: boolean;
  userPerceivedSound?: VocalizationType | string;
  userPerceivedContext?: ContextIntent | string;
  notes?: string;
}
