import { PrismaClient, UserRole } from '@prisma/client';
import { IUserRepository } from '../../domain/repositories/index.js';
import { UserEntity } from '@mewsense/shared-types';

export class PrismaUserRepository implements IUserRepository {
  constructor(private prisma: PrismaClient) {}

  async findById(id: string): Promise<UserEntity | null> {
    const user = await this.prisma.user.findFirst({
      where: { id, deletedAt: null }
    });
    if (!user) return null;
    return this.mapToEntity(user);
  }

  async findByEmail(email: string): Promise<UserEntity | null> {
    const user = await this.prisma.user.findFirst({
      where: { email: email.toLowerCase(), deletedAt: null }
    });
    if (!user) return null;
    return this.mapToEntity(user);
  }

  async findAuthByEmail(email: string): Promise<(UserEntity & { passwordHash: string }) | null> {
    const user = await this.prisma.user.findFirst({
      where: { email: email.toLowerCase(), deletedAt: null }
    });
    if (!user) return null;
    return {
      ...this.mapToEntity(user),
      passwordHash: user.passwordHash
    };
  }

  async create(data: Omit<UserEntity, 'id' | 'createdAt' | 'updatedAt'> & { passwordHash: string }): Promise<UserEntity> {
    const user = await this.prisma.user.create({
      data: {
        email: data.email.toLowerCase(),
        passwordHash: data.passwordHash,
        fullName: data.fullName,
        role: data.role as UserRole,
        isEmailVerified: data.isEmailVerified ?? false,
        avatarUrl: data.avatarUrl,
        allowTrainingConsent: data.allowTrainingConsent ?? false,
        languagePreference: data.languagePreference ?? 'en'
      }
    });
    return this.mapToEntity(user);
  }

  async update(id: string, data: Partial<UserEntity>): Promise<UserEntity> {
    const updated = await this.prisma.user.update({
      where: { id },
      data: {
        ...(data.fullName && { fullName: data.fullName }),
        ...(data.avatarUrl !== undefined && { avatarUrl: data.avatarUrl }),
        ...(data.allowTrainingConsent !== undefined && { allowTrainingConsent: data.allowTrainingConsent }),
        ...(data.languagePreference && { languagePreference: data.languagePreference }),
        ...(data.role && { role: data.role as UserRole })
      }
    });
    return this.mapToEntity(updated);
  }

  async softDelete(id: string): Promise<void> {
    await this.prisma.user.update({
      where: { id },
      data: { deletedAt: new Date() }
    });
  }

  private mapToEntity(record: any): UserEntity {
    return {
      id: record.id,
      email: record.email,
      fullName: record.fullName,
      role: record.role,
      isEmailVerified: record.isEmailVerified,
      avatarUrl: record.avatarUrl,
      allowTrainingConsent: record.allowTrainingConsent,
      languagePreference: record.languagePreference,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
      deletedAt: record.deletedAt
    };
  }
}
