import { z } from 'zod';
import {
  VocalizationType,
  ContextIntent,
  UserRole,
  CatSex,
  RecordingSource,
  EnvironmentContext,
  ActivityContext
} from '@mewsense/shared-types';

export const ALLOWED_AUDIO_MIME_TYPES = [
  'audio/wav',
  'audio/x-wav',
  'audio/wave',
  'audio/mpeg',
  'audio/mp3',
  'audio/mp4',
  'audio/x-m4a',
  'audio/m4a',
  'audio/aac',
  'audio/ogg',
  'audio/webm'
] as const;

export const MAX_AUDIO_FILE_SIZE_BYTES = 15 * 1024 * 1024; // 15MB
export const MIN_RECORDING_DURATION_SECONDS = 0.4;
export const MAX_RECORDING_DURATION_SECONDS = 60.0;

// Auth Schemas
export const registerSchema = z.object({
  email: z.string().email('Please enter a valid email address').max(255),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters long')
    .max(128)
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number'),
  fullName: z.string().min(2, 'Name must be at least 2 characters').max(128),
  allowTrainingConsent: z.boolean().default(false),
  languagePreference: z.enum(['en', 'bn']).default('en')
});

export const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required')
});

// Context Schema
export const recordingContextSchema = z.object({
  environment: z
    .nativeEnum(EnvironmentContext)
    .or(z.string())
    .optional()
    .default(EnvironmentContext.INDOOR),
  activity: z
    .nativeEnum(ActivityContext)
    .or(z.string())
    .optional()
    .default(ActivityContext.UNKNOWN),
  foodPresent: z.boolean().optional(),
  otherAnimalsPresent: z.boolean().optional(),
  userNotes: z.string().max(1000).optional(),
  userSelectedContext: z.string().max(100).optional()
});

// Cat Schemas
export const createCatSchema = z.object({
  name: z.string().min(1, 'Cat name is required').max(64),
  breed: z.string().max(64).optional().nullable(),
  birthDate: z.string().datetime().or(z.string().regex(/^\d{4}-\d{2}-\d{2}$/)).optional().nullable(),
  sex: z.nativeEnum(CatSex).default(CatSex.UNKNOWN),
  isNeutered: z.boolean().default(true),
  avatarUrl: z.string().url().max(512).optional().nullable(),
  medicalNotes: z.string().max(2000).optional().nullable()
});

export const updateCatSchema = createCatSchema.partial();

// Audio Presign Schema
export const presignUploadSchema = z.object({
  catId: z.string().uuid().optional().nullable(),
  filename: z.string().min(1).max(255),
  mimeType: z.string().refine(
    (mime) => (ALLOWED_AUDIO_MIME_TYPES as readonly string[]).includes(mime.toLowerCase()),
    { message: 'Unsupported audio format. Supported: .wav, .mp3, .m4a, .ogg, .webm' }
  ),
  fileSizeBytes: z
    .number()
    .int()
    .positive()
    .max(MAX_AUDIO_FILE_SIZE_BYTES, 'Audio file exceeds maximum 15MB limit'),
  source: z.nativeEnum(RecordingSource).default(RecordingSource.MICROPHONE_WEB),
  context: recordingContextSchema.optional()
});

// Analysis Schemas
export const enqueueAnalysisSchema = z.object({
  recordingId: z.string().uuid('Valid recording ID is required'),
  priority: z.enum(['normal', 'high']).default('normal')
});

// Feedback Schema
export const submitFeedbackSchema = z.object({
  analysisId: z.string().uuid('Valid analysis ID is required'),
  isAccurate: z.boolean(),
  userPerceivedSound: z.nativeEnum(VocalizationType).or(z.string()).optional().nullable(),
  userPerceivedContext: z.nativeEnum(ContextIntent).or(z.string()).optional().nullable(),
  notes: z.string().max(1000).optional().nullable()
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type CreateCatInput = z.infer<typeof createCatSchema>;
export type UpdateCatInput = z.infer<typeof updateCatSchema>;
export type PresignUploadInput = z.infer<typeof presignUploadSchema>;
export type EnqueueAnalysisInput = z.infer<typeof enqueueAnalysisSchema>;
export type SubmitFeedbackInput = z.infer<typeof submitFeedbackSchema>;
export type RecordingContextInput = z.infer<typeof recordingContextSchema>;
