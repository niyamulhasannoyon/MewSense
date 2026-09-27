import 'dotenv/config';
import { PrismaClient, UserRole, CatSex, RecordingSource, AnalysisStatus } from '@prisma/client';
import * as argon2 from 'argon2';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting MewSense database seed...');

  // 1. Create Default Model Version
  const defaultModel = await prisma.modelVersion.upsert({
    where: { version: 'v1.0.0' },
    update: {},
    create: {
      name: 'mewsense-acoustic-ensemble',
      version: 'v1.0.0',
      description: 'Production baseline classifier combining 128-band Mel Spectrograms, 20 MFCCs, pitch F0 contours, and calibrated context-weighted inference.',
      metrics: {
        macroF1: 0.824,
        accuracy: 0.856,
        kappa: 0.791,
        perClassMetrics: {
          MEOW: { precision: 0.89, recall: 0.91, f1: 0.90 },
          PURR: { precision: 0.94, recall: 0.96, f1: 0.95 },
          HISS: { precision: 0.87, recall: 0.85, f1: 0.86 },
          GROWL: { precision: 0.83, recall: 0.81, f1: 0.82 },
          CHIRP_TRILL: { precision: 0.78, recall: 0.76, f1: 0.77 },
          CATERWAUL: { precision: 0.75, recall: 0.72, f1: 0.73 },
          YOWL: { precision: 0.79, recall: 0.77, f1: 0.78 },
          OTHER_UNKNOWN: { precision: 0.72, recall: 0.70, f1: 0.71 }
        }
      },
      status: 'ACTIVE'
    }
  });
  console.log(`✅ Model version registered: ${defaultModel.name} (${defaultModel.version})`);

  // 2. Hash Seed Passwords
  const commonPassword = await argon2.hash('MewSense2026!');

  // Super Admin
  const admin = await prisma.user.upsert({
    where: { email: 'admin@mewsense.app' },
    update: {},
    create: {
      email: 'admin@mewsense.app',
      fullName: 'Chief Administrator',
      passwordHash: commonPassword,
      role: UserRole.SUPER_ADMIN,
      isEmailVerified: true,
      allowTrainingConsent: true,
      languagePreference: 'en'
    }
  });

  // Researcher / Annotator
  const researcher = await prisma.user.upsert({
    where: { email: 'research@mewsense.app' },
    update: {},
    create: {
      email: 'research@mewsense.app',
      fullName: 'Dr. Sarah Feline',
      passwordHash: commonPassword,
      role: UserRole.RESEARCHER,
      isEmailVerified: true,
      allowTrainingConsent: true,
      languagePreference: 'en'
    }
  });

  // Demo User
  const demoUser = await prisma.user.upsert({
    where: { email: 'guardian@mewsense.app' },
    update: {},
    create: {
      email: 'guardian@mewsense.app',
      fullName: 'Alex Johnson',
      passwordHash: commonPassword,
      role: UserRole.USER,
      isEmailVerified: true,
      allowTrainingConsent: true,
      languagePreference: 'en'
    }
  });
  console.log(`✅ Seed users created (Admin: ${admin.email}, User: ${demoUser.email})`);

  // 3. Cats for Demo User
  const mochi = await prisma.cat.create({
    data: {
      userId: demoUser.id,
      name: 'Mochi',
      breed: 'Scottish Fold',
      birthDate: new Date('2023-05-15'),
      sex: CatSex.FEMALE,
      isNeutered: true,
      medicalNotes: 'Occasional seasonal allergies; very vocal around breakfast.'
    }
  });

  const luna = await prisma.cat.create({
    data: {
      userId: demoUser.id,
      name: 'Luna',
      breed: 'Domestic Shorthair',
      birthDate: new Date('2022-09-01'),
      sex: CatSex.FEMALE,
      isNeutered: true,
      medicalNotes: 'Healthy, active rescue cat.'
    }
  });
  console.log(`✅ Seed cats created: ${mochi.name}, ${luna.name}`);

  // 4. Sample Audio Recording + Metadata + Analysis + Prediction
  const sampleRecording = await prisma.audioRecording.create({
    data: {
      userId: demoUser.id,
      catId: mochi.id,
      storageKey: 'recordings/seed/mochi_morning_meow.wav',
      storageProvider: 'local',
      originalFilename: 'mochi_morning_meow.wav',
      mimeType: 'audio/wav',
      fileSizeBytes: 245760,
      sha256Hash: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
      source: RecordingSource.MICROPHONE_WEB,
      contextEnvironment: 'indoor',
      contextActivity: 'feeding',
      contextFoodPresent: false,
      contextOtherAnimals: false,
      contextUserNotes: 'Pacing near food bowl at 7:30 AM',
      contextSelected: 'Hungry / Food-seeking',
      isConsentedForResearch: true,
      metadata: {
        create: {
          durationSeconds: 1.54,
          sampleRate: 16000,
          channels: 1,
          bitDepth: 16,
          rmsEnergy: 0.088,
          pitchF0Mean: 540.2,
          pitchF0Min: 420.0,
          pitchF0Max: 680.5,
          spectralCentroidMean: 1720.0,
          zeroCrossingRateMean: 0.075,
          snrDb: 21.4
        }
      }
    }
  });

  const analysis = await prisma.analysis.create({
    data: {
      recordingId: sampleRecording.id,
      status: AnalysisStatus.COMPLETED,
      stage: 'done',
      processingStartedAt: new Date(Date.now() - 3000),
      completedAt: new Date(),
      latencyMs: 1250,
      predictions: {
        create: {
          modelVersionId: defaultModel.id,
          primarySoundType: 'MEOW',
          probableContext: 'HUNGRY_FOOD_SEEKING',
          confidence: 0.88,
          soundProbabilities: {
            MEOW: 0.88,
            CHIRP_TRILL: 0.07,
            PURR: 0.02,
            OTHER_UNKNOWN: 0.03
          },
          contextProbabilities: {
            HUNGRY_FOOD_SEEKING: 0.85,
            ATTENTION_SEEKING: 0.10,
            GREETING_SOCIAL: 0.03,
            UNKNOWN_INSUFFICIENT_CONFIDENCE: 0.02
          },
          explanationText: 'Audio analysis shows a rising fundamental frequency contour (420 Hz to 680 Hz) and high spectral energy in the solicitation formant range. Combined with the absence of food at typical feeding time, the model identifies high probability of food-seeking vocalization.',
          scientificDisclaimer: 'This is an AI-generated probabilistic interpretation of cat vocalizations, not a literal translation or medical diagnosis. Context and individual feline temperament influence acoustic output.',
          isDistressPattern: false
        }
      },
      feedbacks: {
        create: {
          userId: demoUser.id,
          isAccurate: true,
          userPerceivedSound: 'MEOW',
          userPerceivedContext: 'HUNGRY_FOOD_SEEKING',
          notes: 'Spot on! Gave her breakfast and she stopped meowing.'
        }
      }
    }
  });

  console.log(`✅ Seed analysis & prediction created (Analysis ID: ${analysis.id})`);
  console.log('✨ Database seed completed successfully!');
}

main()
  .catch((e) => {
    console.error('❌ Error during seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
