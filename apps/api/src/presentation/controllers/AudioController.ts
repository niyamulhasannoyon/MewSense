import { Request, Response, NextFunction } from 'express';
import { AudioService } from '../../application/services/AudioService.js';
import { presignUploadSchema } from '@mewsense/validation';
import { RecordingSource } from '@mewsense/shared-types';

export class AudioController {
  constructor(private audioService: AudioService) {}

  presignUpload = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const validated = presignUploadSchema.parse(req.body);
      const result = await this.audioService.preparePresignedUpload(req.user!.userId, validated);

      return res.status(200).json({
        success: true,
        data: result,
        error: null,
        meta: { requestId: req.requestId || '', timestamp: new Date().toISOString() }
      });
    } catch (err) {
      next(err);
    }
  };

  directUpload = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const file = req.file;
      if (!file) {
        return res.status(400).json({
          success: false,
          data: null,
          error: {
            code: 'FILE_REQUIRED',
            message: 'An audio file must be uploaded under the "audio" form field'
          },
          meta: { requestId: req.requestId || '', timestamp: new Date().toISOString() }
        });
      }

      let parsedContext: any = {};
      if (req.body.context) {
        try {
          parsedContext = typeof req.body.context === 'string' ? JSON.parse(req.body.context) : req.body.context;
        } catch {
          parsedContext = {};
        }
      }

      const source = (req.body.source as RecordingSource) || RecordingSource.FILE_UPLOAD;
      const recording = await this.audioService.handleDirectUpload(
        req.user!.userId,
        file.buffer,
        file.originalname,
        file.mimetype,
        source,
        req.body.catId || undefined,
        parsedContext
      );

      return res.status(201).json({
        success: true,
        data: recording,
        error: null,
        meta: { requestId: req.requestId || '', timestamp: new Date().toISOString() }
      });
    } catch (err) {
      next(err);
    }
  };

  streamAudio = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { stream, mimeType, filename } = await this.audioService.getDownloadStream(
        req.user!.userId,
        req.params.id
      );

      res.setHeader('Content-Type', mimeType);
      res.setHeader('Content-Disposition', `inline; filename="${filename}"`);
      stream.pipe(res);
    } catch (err) {
      next(err);
    }
  };
}
