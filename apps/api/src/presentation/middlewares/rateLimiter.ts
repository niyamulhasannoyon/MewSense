import { Request, Response, NextFunction } from 'express';

interface RateLimitRecord {
  count: number;
  resetAt: number;
}

const memoryStore = new Map<string, RateLimitRecord>();

export function createRateLimiter(options: { maxRequests: number; windowMs: number }) {
  const { maxRequests, windowMs } = options;

  return (req: Request, res: Response, next: NextFunction) => {
    const key = (req.user?.userId || req.ip || 'anonymous').toString();
    const now = Date.now();

    let record = memoryStore.get(key);
    if (!record || record.resetAt <= now) {
      record = { count: 1, resetAt: now + windowMs };
      memoryStore.set(key, record);
    } else {
      record.count += 1;
    }

    res.setHeader('X-RateLimit-Limit', maxRequests);
    res.setHeader('X-RateLimit-Remaining', Math.max(0, maxRequests - record.count));
    res.setHeader('X-RateLimit-Reset', Math.ceil(record.resetAt / 1000));

    if (record.count > maxRequests) {
      return res.status(429).json({
        success: false,
        data: null,
        error: {
          code: 'RATE_LIMIT_EXCEEDED',
          message: 'Too many requests. Please slow down and try again shortly.'
        },
        meta: {
          requestId: req.requestId || '',
          timestamp: new Date().toISOString()
        }
      });
    }

    next();
  };
}
