import { describe, it, expect, beforeEach } from 'vitest';
import { AuthService } from '../src/application/services/AuthService.js';
import { UserRole } from '@mewsense/shared-types';

class MockUserRepository {
  private users: any[] = [];

  async findById(id: string) {
    return this.users.find((u) => u.id === id) || null;
  }

  async findByEmail(email: string) {
    return this.users.find((u) => u.email === email) || null;
  }

  async findAuthByEmail(email: string) {
    return this.users.find((u) => u.email === email) || null;
  }

  async create(data: any) {
    const user = {
      id: `user_${this.users.length + 1}`,
      createdAt: new Date(),
      updatedAt: new Date(),
      ...data
    };
    this.users.push(user);
    return user;
  }

  async update(id: string, data: any) {
    const user = await this.findById(id);
    Object.assign(user, data);
    return user;
  }

  async softDelete(id: string) {
    const user = await this.findById(id);
    if (user) user.deletedAt = new Date();
  }
}

describe('AuthService Unit Tests', () => {
  let authService: AuthService;
  let userRepo: MockUserRepository;

  beforeEach(() => {
    userRepo = new MockUserRepository();
    authService = new AuthService(userRepo as any);
  });

  it('successfully registers a new user with hashed password', async () => {
    const result = await authService.register({
      email: 'tester@mewsense.app',
      password: 'SecurePassword123!',
      fullName: 'Test Guardian',
      allowTrainingConsent: true,
      languagePreference: 'en'
    });

    expect(result.user.email).toBe('tester@mewsense.app');
    expect(result.user.role).toBe(UserRole.USER);
    expect(result.accessToken).toBeDefined();
    expect(result.expiresIn).toBe(900);
  });

  it('rejects duplicate email registrations', async () => {
    await authService.register({
      email: 'duplicate@mewsense.app',
      password: 'SecurePassword123!',
      fullName: 'First Guardian',
      allowTrainingConsent: false,
      languagePreference: 'en'
    });

    await expect(
      authService.register({
        email: 'duplicate@mewsense.app',
        password: 'AnotherPassword456!',
        fullName: 'Second Guardian',
        allowTrainingConsent: false,
        languagePreference: 'en'
      })
    ).rejects.toThrow('An account with this email address already exists.');
  });

  it('successfully logs in with valid credentials', async () => {
    await authService.register({
      email: 'login@mewsense.app',
      password: 'CorrectPassword123!',
      fullName: 'Login User',
      allowTrainingConsent: false,
      languagePreference: 'en'
    });

    const loginResult = await authService.login({
      email: 'login@mewsense.app',
      password: 'CorrectPassword123!'
    });

    expect(loginResult.accessToken).toBeDefined();
    expect(loginResult.refreshToken).toBeDefined();
    expect(loginResult.user.email).toBe('login@mewsense.app');
  });

  it('rejects login with incorrect password', async () => {
    await authService.register({
      email: 'wrongpass@mewsense.app',
      password: 'OriginalPassword123!',
      fullName: 'User',
      allowTrainingConsent: false,
      languagePreference: 'en'
    });

    await expect(
      authService.login({
        email: 'wrongpass@mewsense.app',
        password: 'WrongPassword999!'
      })
    ).rejects.toThrow('Invalid email or password.');
  });
});
