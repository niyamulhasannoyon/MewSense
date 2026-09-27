import { Request, Response, NextFunction } from 'express';
import { AuthService } from '../../application/services/AuthService.js';
import { registerSchema, loginSchema } from '@mewsense/validation';

export class AuthController {
  constructor(private authService: AuthService) {}

  register = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const validated = registerSchema.parse(req.body);
      const result = await this.authService.register(validated);

      return res.status(201).json({
        success: true,
        data: result,
        error: null,
        meta: {
          requestId: req.requestId || '',
          timestamp: new Date().toISOString()
        }
      });
    } catch (err) {
      next(err);
    }
  };

  login = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const validated = loginSchema.parse(req.body);
      const { user, accessToken, refreshToken, expiresIn } = await this.authService.login(validated);

      // Set HTTP-only secure cookie for refresh token
      res.cookie('refreshToken', refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
      });

      return res.status(200).json({
        success: true,
        data: { user, accessToken, expiresIn },
        error: null,
        meta: {
          requestId: req.requestId || '',
          timestamp: new Date().toISOString()
        }
      });
    } catch (err) {
      next(err);
    }
  };

  me = async (req: Request, res: Response, next: NextFunction) => {
    try {
      return res.status(200).json({
        success: true,
        data: {
          user: req.user
        },
        error: null,
        meta: {
          requestId: req.requestId || '',
          timestamp: new Date().toISOString()
        }
      });
    } catch (err) {
      next(err);
    }
  };
}
