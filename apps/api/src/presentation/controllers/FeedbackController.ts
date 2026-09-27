import { Request, Response, NextFunction } from 'express';
import { FeedbackService } from '../../application/services/FeedbackService.js';
import { submitFeedbackSchema } from '@mewsense/validation';

export class FeedbackController {
  constructor(private feedbackService: FeedbackService) {}

  submit = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const validated = submitFeedbackSchema.parse(req.body);
      const feedback = await this.feedbackService.submitFeedback(req.user!.userId, validated);

      return res.status(201).json({
        success: true,
        data: feedback,
        error: null,
        meta: { requestId: req.requestId || '', timestamp: new Date().toISOString() }
      });
    } catch (err) {
      next(err);
    }
  };
}
