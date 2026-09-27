import 'dotenv/config';
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createApp } from '../src/app.js';
import { prisma } from '../src/infrastructure/database/prisma.js';

describe('End-to-End User Journey API Test', () => {
  let app: any;
  let authService: any;
  let analysisService: any;

  beforeAll(async () => {
    const comp = createApp();
    app = comp.app;
    authService = comp.authService;
    analysisService = comp.analysisService;
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('runs complete lifecycle: register -> cat -> audio upload -> inference -> result -> feedback', async () => {
    const uniqueEmail = `guardian_${Date.now()}@mewsense.app`;

    // 1. Register User
    const regResult = await authService.register({
      email: uniqueEmail,
      password: 'StrongPassword123!',
      fullName: 'E2E Companion Guardian',
      allowTrainingConsent: true,
      languagePreference: 'en'
    });
    expect(regResult.user.id).toBeDefined();
    const userId = regResult.user.id;

    // 2. Create Cat Profile
    const cat = await prisma.cat.create({
      data: {
        userId,
        name: 'Simba',
        breed: 'Bengal',
        sex: 'MALE',
        isNeutered: true
      }
    });
    expect(cat.name).toBe('Simba');

    // 3. Audio Ingestion
    const storageKey = `recordings/test/e2e_${Date.now()}.wav`;
    const dummyPcm = Buffer.alloc(16000);
    const storage = new (await import('../src/infrastructure/storage/index.js')).LocalStorageProvider('./storage/test_uploads');
    await storage.uploadBuffer(storageKey, dummyPcm, 'audio/wav');

    const audioRec = await prisma.audioRecording.create({
      data: {
        userId,
        catId: cat.id,
        storageKey,
        storageProvider: 'local',
        originalFilename: 'meow_hunger.wav',
        mimeType: 'audio/wav',
        fileSizeBytes: 16000,
        sha256Hash: `hash_${Date.now()}`,
        source: 'MICROPHONE_WEB',
        contextEnvironment: 'indoor',
        contextActivity: 'feeding',
        contextFoodPresent: false
      }
    });
    expect(audioRec.id).toBeDefined();

    // 4. Enqueue Analysis
    const analysis = await analysisService.enqueueAnalysis(userId, audioRec.id);
    expect(analysis.analysisId).toBeDefined();

    // 5. Query Result
    const analysisResult = await analysisService.getAnalysisById(userId, analysis.analysisId);
    expect(analysisResult.id).toBe(analysis.analysisId);
    expect(analysisResult.status).toBeDefined();

    // 6. Submit Feedback
    const feedback = await prisma.feedback.create({
      data: {
        userId,
        analysisId: analysis.analysisId,
        isAccurate: true,
        userPerceivedSound: 'MEOW',
        userPerceivedContext: 'HUNGRY_FOOD_SEEKING',
        notes: 'Very helpful!'
      }
    });
    expect(feedback.id).toBeDefined();
    expect(feedback.isAccurate).toBe(true);
  });
});
