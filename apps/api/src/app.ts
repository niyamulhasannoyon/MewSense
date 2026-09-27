import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import crypto from 'node:crypto';
import { prisma } from './infrastructure/database/prisma.js';
import { PrismaUserRepository } from './infrastructure/repositories/PrismaUserRepository.js';
import { PrismaCatRepository } from './infrastructure/repositories/PrismaCatRepository.js';
import { PrismaAudioRecordingRepository } from './infrastructure/repositories/PrismaAudioRecordingRepository.js';
import {
  PrismaAnalysisRepository,
  PrismaPredictionRepository,
  PrismaFeedbackRepository,
  PrismaModelVersionRepository
} from './infrastructure/repositories/PrismaAnalysisRepository.js';
import { LocalStorageProvider } from './infrastructure/storage/index.js';
import { InMemoryAnalysisQueue } from './infrastructure/queue/index.js';
import { MLServiceClient } from './infrastructure/ml-client/index.js';

import { AuthService } from './application/services/AuthService.js';
import { CatService } from './application/services/CatService.js';
import { AudioService } from './application/services/AudioService.js';
import { AnalysisService } from './application/services/AnalysisService.js';
import { FeedbackService } from './application/services/FeedbackService.js';

import { AuthController } from './presentation/controllers/AuthController.js';
import { CatController } from './presentation/controllers/CatController.js';
import { AudioController } from './presentation/controllers/AudioController.js';
import { AnalysisController } from './presentation/controllers/AnalysisController.js';
import { FeedbackController } from './presentation/controllers/FeedbackController.js';

import { createApiRouter } from './presentation/routes/index.js';
import { createRateLimiter } from './presentation/middlewares/rateLimiter.js';
import { errorHandler } from './presentation/middlewares/errorHandler.js';

export function createApp() {
  const app = express();

  // 1. Dependency Injection Composition Root
  const userRepo = new PrismaUserRepository(prisma);
  const catRepo = new PrismaCatRepository(prisma);
  const audioRepo = new PrismaAudioRecordingRepository(prisma);
  const analysisRepo = new PrismaAnalysisRepository(prisma);
  const predictionRepo = new PrismaPredictionRepository(prisma);
  const feedbackRepo = new PrismaFeedbackRepository(prisma);
  const modelRepo = new PrismaModelVersionRepository(prisma);

  const storage = new LocalStorageProvider(process.env.STORAGE_LOCAL_DIR || './storage/uploads');
  const queue = new InMemoryAnalysisQueue();
  const mlClient = new MLServiceClient();

  const authService = new AuthService(userRepo);
  const catService = new CatService(catRepo);
  const audioService = new AudioService(audioRepo, catRepo, storage);
  const analysisService = new AnalysisService(
    analysisRepo,
    audioRepo,
    predictionRepo,
    catRepo,
    queue,
    storage,
    modelRepo
  );
  const feedbackService = new FeedbackService(feedbackRepo, analysisRepo);

  // Register worker on the queue
  queue.registerWorker(async (job) => {
    await analysisService.processJob(job, mlClient);
  });

  const authController = new AuthController(authService);
  const catController = new CatController(catService);
  const audioController = new AudioController(audioService);
  const analysisController = new AnalysisController(analysisService);
  const feedbackController = new FeedbackController(feedbackService);

  // 2. Global Middlewares
  app.use(helmet({ contentSecurityPolicy: false }));
  app.use(
    cors({
      origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
      credentials: true,
      methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS']
    })
  );
  app.use(express.json({ limit: '500mb' }));
  app.use(express.urlencoded({ extended: true, limit: '500mb' }));

  // Attach Request ID
  app.use((req, res, next) => {
    req.requestId = crypto.randomUUID();
    res.setHeader('X-Request-Id', req.requestId);
    next();
  });

  // Global Rate Limiting (300 reqs / min)
  app.use(createRateLimiter({ maxRequests: 300, windowMs: 60000 }));

  // 3. Mount API Routes
  const apiRouter = createApiRouter(
    authController,
    catController,
    audioController,
    analysisController,
    feedbackController,
    authService
  );
  app.use('/api/v1', apiRouter);

  // 4. Fallback 404 Handler
  app.use((req, res) => {
    res.status(404).json({
      success: false,
      data: null,
      error: {
        code: 'NOT_FOUND',
        message: `Endpoint ${req.method} ${req.originalUrl} not found`
      },
      meta: {
        requestId: req.requestId || '',
        timestamp: new Date().toISOString()
      }
    });
  });

  // 5. Standard Global Error Handler
  app.use(errorHandler);

  return { app, authService, analysisService };
}
