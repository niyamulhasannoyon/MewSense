import { Router } from 'express';
import multer from 'multer';
import { AuthController } from '../controllers/AuthController.js';
import { CatController } from '../controllers/CatController.js';
import { AudioController } from '../controllers/AudioController.js';
import { AnalysisController } from '../controllers/AnalysisController.js';
import { FeedbackController } from '../controllers/FeedbackController.js';
import { createAuthGuard } from '../middlewares/authGuard.js';
import { AuthService } from '../../application/services/AuthService.js';
import { checkDatabaseHealth } from '../../infrastructure/database/prisma.js';

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 15 * 1024 * 1024 } // 15MB max
});

export function createApiRouter(
  authController: AuthController,
  catController: CatController,
  audioController: AudioController,
  analysisController: AnalysisController,
  feedbackController: FeedbackController,
  authService: AuthService
): Router {
  const router = Router();
  const authGuard = createAuthGuard(authService);

  // Health Probe
  router.get('/health', async (req, res) => {
    const isDbOk = await checkDatabaseHealth();
    res.status(isDbOk ? 200 : 503).json({
      status: isDbOk ? 'healthy' : 'unhealthy',
      timestamp: new Date().toISOString(),
      services: {
        database: isDbOk ? 'up' : 'down',
        storage: 'up',
        queue: 'up'
      }
    });
  });

  // Auth Routes
  router.post('/auth/register', authController.register);
  router.post('/auth/login', authController.login);
  router.get('/auth/me', authGuard, authController.me);

  // Cat Profile Routes
  router.get('/cats', authGuard, catController.listCats);
  router.post('/cats', authGuard, catController.createCat);
  router.get('/cats/:id', authGuard, catController.getCat);
  router.patch('/cats/:id', authGuard, catController.updateCat);
  router.delete('/cats/:id', authGuard, catController.deleteCat);

  // Audio Routes
  router.post('/audio/presign-upload', authGuard, audioController.presignUpload);
  router.post('/audio/direct-upload', authGuard, upload.single('audio'), audioController.directUpload);
  router.get('/audio/stream/:id', authGuard, audioController.streamAudio);

  // Analysis Routes
  router.post('/analysis', authGuard, analysisController.enqueue);
  router.get('/analysis/history', authGuard, analysisController.getHistory);
  router.get('/analysis/:id/stream', authGuard, analysisController.streamProgress);
  router.get('/analysis/:id', authGuard, analysisController.getById);

  // Feedback Routes
  router.post('/feedback', authGuard, feedbackController.submit);

  return router;
}
