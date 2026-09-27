import { PrismaClient, CatSex } from '@prisma/client';
import { ICatRepository } from '../../domain/repositories/index.js';
import { CatEntity } from '@mewsense/shared-types';

export class PrismaCatRepository implements ICatRepository {
  constructor(private prisma: PrismaClient) {}

  async findById(id: string): Promise<CatEntity | null> {
    const cat = await this.prisma.cat.findFirst({
      where: { id, deletedAt: null }
    });
    if (!cat) return null;
    return this.mapToEntity(cat);
  }

  async findByUserId(userId: string): Promise<CatEntity[]> {
    const cats = await this.prisma.cat.findMany({
      where: { userId, deletedAt: null },
      orderBy: { createdAt: 'desc' }
    });
    return cats.map((c) => this.mapToEntity(c));
  }

  async create(data: Omit<CatEntity, 'id' | 'createdAt' | 'updatedAt'>): Promise<CatEntity> {
    const cat = await this.prisma.cat.create({
      data: {
        userId: data.userId,
        name: data.name,
        breed: data.breed,
        birthDate: data.birthDate ? new Date(data.birthDate) : null,
        sex: data.sex as CatSex,
        isNeutered: data.isNeutered ?? true,
        avatarUrl: data.avatarUrl,
        medicalNotes: data.medicalNotes
      }
    });
    return this.mapToEntity(cat);
  }

  async update(id: string, data: Partial<CatEntity>): Promise<CatEntity> {
    const cat = await this.prisma.cat.update({
      where: { id },
      data: {
        ...(data.name && { name: data.name }),
        ...(data.breed !== undefined && { breed: data.breed }),
        ...(data.birthDate !== undefined && { birthDate: data.birthDate ? new Date(data.birthDate) : null }),
        ...(data.sex && { sex: data.sex as CatSex }),
        ...(data.isNeutered !== undefined && { isNeutered: data.isNeutered }),
        ...(data.avatarUrl !== undefined && { avatarUrl: data.avatarUrl }),
        ...(data.medicalNotes !== undefined && { medicalNotes: data.medicalNotes })
      }
    });
    return this.mapToEntity(cat);
  }

  async softDelete(id: string): Promise<void> {
    await this.prisma.cat.update({
      where: { id },
      data: { deletedAt: new Date() }
    });
  }

  async countByUserId(userId: string): Promise<number> {
    return this.prisma.cat.count({
      where: { userId, deletedAt: null }
    });
  }

  private mapToEntity(record: any): CatEntity {
    return {
      id: record.id,
      userId: record.userId,
      name: record.name,
      breed: record.breed,
      birthDate: record.birthDate,
      sex: record.sex,
      isNeutered: record.isNeutered,
      avatarUrl: record.avatarUrl,
      medicalNotes: record.medicalNotes,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
      deletedAt: record.deletedAt
    };
  }
}
