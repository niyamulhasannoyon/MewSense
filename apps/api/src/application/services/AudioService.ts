import crypto from 'node:crypto';
import path from 'node:path';
import { IAudioRecordingRepository, ICatRepository } from '../../domain/repositories/index.js';
import { IObjectStorage } from '../../infrastructure/storage/index.js';
import { PresignUploadInput } from '@mewsense/validation';
import { PresignUploadResponseData, AudioRecordingEntity, RecordingSource } from '@mewsense/shared-types';

export class AudioService {
  constructor(
    private audioRepo: IAudioRecordingRepository,
    private catRepo: ICatRepository,
    private storage: IObjectStorage
  ) {}

  async preparePresignedUpload(userId: string, input: PresignUploadInput): Promise<PresignUploadResponseData> {
    if (input.catId) {
      const cat = await this.catRepo.findById(input.catId);
      if (!cat || cat.userId !== userId) {
        const err = new Error('Associated cat profile not found');
        (err as any).statusCode = 404;
        (err as any).code = 'CAT_NOT_FOUND';
        throw err;
      }
    }

    const fileId = crypto.randomUUID();
    const ext = path.extname(input.filename) || '.wav';
    const storageKey = `recordings/${userId}/${fileId}${ext}`;

    const signedResult = await this.storage.generatePresignedUploadUrl({
      key: storageKey,
      contentType: input.mimeType,
      maxSizeBytes: input.fileSizeBytes
    });

    const recording = await this.audioRepo.create({
      userId,
      catId: input.catId ?? null,
      storageKey,
      storageProvider: 'local',
      originalFilename: input.filename,
      mimeType: input.mimeType,
      fileSizeBytes: input.fileSizeBytes,
      sha256Hash: `pending_${fileId}`,
      source: input.source,
      context: input.context ?? {},
      isConsentedForResearch: false
    });

    return {
      recordingId: recording.id,
      uploadUrl: signedResult.uploadUrl,
      fileKey: storageKey,
      requiredHeaders: {
        'Content-Type': input.mimeType
      },
      expiresInSeconds: signedResult.expiresInSeconds
    };
  }

  async handleDirectUpload(
    userId: string,
    fileBuffer: Buffer,
    filename: string,
    mimeType: string,
    source: RecordingSource,
    catId?: string,
    context?: any
  ): Promise<AudioRecordingEntity> {
    if (catId) {
      const cat = await this.catRepo.findById(catId);
      if (!cat || cat.userId !== userId) {
        const err = new Error('Associated cat profile not found');
        (err as any).statusCode = 404;
        (err as any).code = 'CAT_NOT_FOUND';
        throw err;
      }
    }

    const sha256Hash = crypto.createHash('sha256').update(fileBuffer).digest('hex');
    const existing = await this.audioRepo.findByHash(sha256Hash);
    if (existing && existing.userId === userId) {
      const existsOnDisk = await this.storage.verifyObjectExists(existing.storageKey);
      if (!existsOnDisk) {
        await this.storage.uploadBuffer(existing.storageKey, fileBuffer, mimeType);
      }
      return existing;
    }

    const fileId = crypto.randomUUID();
    const ext = path.extname(filename) || '.wav';
    const storageKey = `recordings/${userId}/${fileId}${ext}`;

    await this.storage.uploadBuffer(storageKey, fileBuffer, mimeType);

    return this.audioRepo.create({
      userId,
      catId: catId ?? null,
      storageKey,
      storageProvider: 'local',
      originalFilename: filename,
      mimeType,
      fileSizeBytes: fileBuffer.length,
      sha256Hash,
      source,
      context: context ?? {},
      isConsentedForResearch: false
    });
  }

  async getRecordingById(userId: string, recordingId: string): Promise<AudioRecordingEntity> {
    const recording = await this.audioRepo.findById(recordingId);
    if (!recording || recording.userId !== userId) {
      const err = new Error('Recording not found');
      (err as any).statusCode = 404;
      (err as any).code = 'RECORDING_NOT_FOUND';
      throw err;
    }
    return recording;
  }

  async getDownloadStream(userId: string, recordingId: string) {
    const recording = await this.getRecordingById(userId, recordingId);
    return {
      stream: await this.storage.downloadStream(recording.storageKey),
      mimeType: recording.mimeType,
      filename: recording.originalFilename
    };
  }
}
