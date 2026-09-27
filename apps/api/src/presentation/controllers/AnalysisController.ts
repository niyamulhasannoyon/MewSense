import { Request, Response, NextFunction } from 'express';
import { AnalysisService } from '../../application/services/AnalysisService.js';
import { AnalysisEventBus } from '../../infrastructure/queue/index.js';
import { enqueueAnalysisSchema } from '@mewsense/validation';
import { AnalysisProgressEvent } from '@mewsense/shared-types';

export class AnalysisController {
  constructor(
    private analysisService: AnalysisService,
    private eventBus: AnalysisEventBus = AnalysisEventBus.getInstance()
  ) {}

  enqueue = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const validated = enqueueAnalysisSchema.parse(req.body);
      const result = await this.analysisService.enqueueAnalysis(req.user!.userId, validated.recordingId);

      return res.status(202).json({
        success: true,
        data: result,
        error: null,
        meta: { requestId: req.requestId || '', timestamp: new Date().toISOString() }
      });
    } catch (err) {
      next(err);
    }
  };

  getById = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await this.analysisService.getAnalysisById(req.user!.userId, req.params.id);
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

  getHistory = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const limit = parseInt(req.query.limit as string, 10) || 20;
      const offset = parseInt(req.query.offset as string, 10) || 0;
      const history = await this.analysisService.getUserHistory(req.user!.userId, limit, offset);

      return res.status(200).json({
        success: true,
        data: history,
        error: null,
        meta: { requestId: req.requestId || '', timestamp: new Date().toISOString() }
      });
    } catch (err) {
      next(err);
    }
  };

  streamProgress = async (req: Request, res: Response, next: NextFunction) => {
    const analysisId = req.params.id;

    // Set Server-Sent Events headers
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache, no-transform');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no'); // Disable nginx buffering
    res.flushHeaders?.();

    // Send initial connection event
    res.write(`event: connected\ndata: ${JSON.stringify({ analysisId, connectedAt: new Date().toISOString() })}\n\n`);

    // Keepalive ping every 15s to prevent intermediary timeouts
    const pingInterval = setInterval(() => {
      res.write(': ping\n\n');
    }, 15000);

    const onProgress = (event: AnalysisProgressEvent) => {
      res.write(`event: progress\ndata: ${JSON.stringify(event)}\n\n`);

      if (event.status === 'COMPLETED' || event.status === 'FAILED') {
        cleanup();
        res.end();
      }
    };

    const cleanup = () => {
      clearInterval(pingInterval);
      this.eventBus.unsubscribe(analysisId, onProgress);
    };

    this.eventBus.subscribe(analysisId, onProgress);

    req.on('close', cleanup);
    req.on('error', cleanup);
  };
}
