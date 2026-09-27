import { IFeedbackRepository, IAnalysisRepository } from '../../domain/repositories/index.js';
import { SubmitFeedbackInput } from '@mewsense/validation';
import { FeedbackEntity } from '@mewsense/shared-types';

export class FeedbackService {
  constructor(
    private feedbackRepo: IFeedbackRepository,
    private analysisRepo: IAnalysisRepository
  ) {}

  async submitFeedback(userId: string, input: SubmitFeedbackInput): Promise<FeedbackEntity> {
    const analysis = await this.analysisRepo.findById(input.analysisId);
    if (!analysis) {
      const err = new Error('Target analysis not found');
      (err as any).statusCode = 404;
      (err as any).code = 'ANALYSIS_NOT_FOUND';
      throw err;
    }

    const existing = await this.feedbackRepo.findByAnalysisId(input.analysisId);
    if (existing) {
      const err = new Error('Feedback has already been submitted for this analysis');
      (err as any).statusCode = 409;
      (err as any).code = 'FEEDBACK_ALREADY_EXISTS';
      throw err;
    }

    return this.feedbackRepo.create({
      userId,
      analysisId: input.analysisId,
      isAccurate: input.isAccurate,
      userPerceivedSound: input.userPerceivedSound,
      userPerceivedContext: input.userPerceivedContext,
      notes: input.notes
    });
  }
}
