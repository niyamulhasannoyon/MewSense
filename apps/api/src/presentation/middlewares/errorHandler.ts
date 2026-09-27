import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';

export function errorHandler(err: any, req: Request, res: Response, next: NextFunction) {
  const requestId = req.requestId || 'req_err';
  const timestamp = new Date().toISOString();

  // Zod Validation Errors
  if (err instanceof ZodError) {
    const details = err.errors.map((e) => ({
      field: e.path.join('.'),
      message: e.message
    }));

    return res.status(400).json({
      success: false,
      data: null,
      error: {
        code: 'VALIDATION_FAILED',
        message: 'Invalid request parameters',
        details
      },
      meta: { requestId, timestamp }
    });
  }

  // Explicit Application Errors
  const statusCode = err.statusCode || 500;
  const errorCode = err.code || (statusCode === 500 ? 'INTERNAL_SERVER_ERROR' : 'BAD_REQUEST');
  const message =
    statusCode === 500 && process.env.NODE_ENV === 'production'
      ? 'An unexpected error occurred. Please try again later.'
      : err.message || 'Unknown server error';

  if (statusCode === 500) {
    console.error(`[${requestId}] Server Error:`, err);
  }

  return res.status(statusCode).json({
    success: false,
    data: null,
    error: {
      code: errorCode,
      message
    },
    meta: { requestId, timestamp }
  });
}
