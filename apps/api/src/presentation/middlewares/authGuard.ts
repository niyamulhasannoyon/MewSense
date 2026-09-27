import { Request, Response, NextFunction } from 'express';
import { AuthService, TokenPayload } from '../../application/services/AuthService.js';
import { UserRole } from '@mewsense/shared-types';

declare global {
  namespace Express {
    interface Request {
      user?: TokenPayload;
      requestId?: string;
    }
  }
}

export function createAuthGuard(authService: AuthService) {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      // Support Authorization: Bearer <token> or query param ?token= (for SSE EventSource)
      const authHeader = req.headers.authorization;
      let token: string | undefined;

      if (authHeader && authHeader.startsWith('Bearer ')) {
        token = authHeader.substring(7);
      } else if (typeof req.query.token === 'string') {
        token = req.query.token;
      }

      if (!token) {
        return res.status(401).json({
          success: false,
          data: null,
          error: {
            code: 'UNAUTHORIZED',
            message: 'Authentication token required.'
          },
          meta: {
            requestId: req.requestId || 'req_unknown',
            timestamp: new Date().toISOString()
          }
        });
      }

      const decoded = authService.verifyAccessToken(token);
      req.user = decoded;
      next();
    } catch (err: any) {
      return res.status(401).json({
        success: false,
        data: null,
        error: {
          code: 'TOKEN_INVALID_OR_EXPIRED',
          message: 'The provided access token is invalid or has expired.'
        },
        meta: {
          requestId: req.requestId || 'req_unknown',
          timestamp: new Date().toISOString()
        }
      });
    }
  };
}

export function requireRole(...allowedRoles: UserRole[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        data: null,
        error: { code: 'UNAUTHORIZED', message: 'Authentication required' },
        meta: { requestId: req.requestId || '', timestamp: new Date().toISOString() }
      });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        data: null,
        error: { code: 'FORBIDDEN', message: 'You do not have permission to access this resource' },
        meta: { requestId: req.requestId || '', timestamp: new Date().toISOString() }
      });
    }

    next();
  };
}
