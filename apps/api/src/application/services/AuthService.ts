import * as argon2 from 'argon2';
import jwt from 'jsonwebtoken';
import { IUserRepository } from '../../domain/repositories/index.js';
import { UserEntity, UserRole, AuthResponseData } from '@mewsense/shared-types';
import { RegisterInput, LoginInput } from '@mewsense/validation';

export interface TokenPayload {
  userId: string;
  email: string;
  role: UserRole;
}

export class AuthService {
  private jwtSecret: string;
  private refreshSecret: string;
  private accessExpiresIn: string;
  private refreshExpiresIn: string;

  constructor(private userRepo: IUserRepository) {
    this.jwtSecret = process.env.JWT_SECRET || 'mewsense-default-jwt-secret-min-32-chars';
    this.refreshSecret = process.env.REFRESH_TOKEN_SECRET || 'mewsense-default-refresh-secret-min-32';
    this.accessExpiresIn = process.env.JWT_EXPIRES_IN || '15m';
    this.refreshExpiresIn = process.env.REFRESH_TOKEN_EXPIRES_IN || '7d';
  }

  async register(input: RegisterInput): Promise<AuthResponseData> {
    const existing = await this.userRepo.findByEmail(input.email);
    if (existing) {
      const err = new Error('An account with this email address already exists.');
      (err as any).statusCode = 409;
      (err as any).code = 'EMAIL_ALREADY_REGISTERED';
      throw err;
    }

    const passwordHash = await argon2.hash(input.password);
    const user = await this.userRepo.create({
      email: input.email,
      fullName: input.fullName,
      passwordHash,
      role: UserRole.USER,
      isEmailVerified: false,
      allowTrainingConsent: input.allowTrainingConsent ?? false,
      languagePreference: input.languagePreference ?? 'en'
    });

    const accessToken = this.generateAccessToken(user);

    return {
      user: {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        role: user.role,
        isEmailVerified: user.isEmailVerified,
        avatarUrl: user.avatarUrl,
        allowTrainingConsent: user.allowTrainingConsent,
        languagePreference: user.languagePreference,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt
      },
      accessToken,
      expiresIn: 900 // 15 mins
    };
  }

  async login(input: LoginInput): Promise<AuthResponseData & { refreshToken: string }> {
    const authUser = await this.userRepo.findAuthByEmail(input.email);
    if (!authUser) {
      const err = new Error('Invalid email or password.');
      (err as any).statusCode = 401;
      (err as any).code = 'INVALID_CREDENTIALS';
      throw err;
    }

    const isValid = await argon2.verify(authUser.passwordHash, input.password);
    if (!isValid) {
      const err = new Error('Invalid email or password.');
      (err as any).statusCode = 401;
      (err as any).code = 'INVALID_CREDENTIALS';
      throw err;
    }

    const accessToken = this.generateAccessToken(authUser);
    const refreshToken = this.generateRefreshToken(authUser);

    return {
      user: {
        id: authUser.id,
        email: authUser.email,
        fullName: authUser.fullName,
        role: authUser.role,
        isEmailVerified: authUser.isEmailVerified,
        avatarUrl: authUser.avatarUrl,
        allowTrainingConsent: authUser.allowTrainingConsent,
        languagePreference: authUser.languagePreference,
        createdAt: authUser.createdAt,
        updatedAt: authUser.updatedAt
      },
      accessToken,
      refreshToken,
      expiresIn: 900
    };
  }

  generateAccessToken(user: UserEntity): string {
    const payload: TokenPayload = {
      userId: user.id,
      email: user.email,
      role: user.role
    };
    return jwt.sign(payload, this.jwtSecret, { expiresIn: '15m' });
  }

  generateRefreshToken(user: UserEntity): string {
    const payload: TokenPayload = {
      userId: user.id,
      email: user.email,
      role: user.role
    };
    return jwt.sign(payload, this.refreshSecret, { expiresIn: '7d' });
  }

  verifyAccessToken(token: string): TokenPayload {
    return jwt.verify(token, this.jwtSecret) as TokenPayload;
  }

  verifyRefreshToken(token: string): TokenPayload {
    return jwt.verify(token, this.refreshSecret) as TokenPayload;
  }
}
