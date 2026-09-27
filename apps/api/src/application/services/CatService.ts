import { ICatRepository } from '../../domain/repositories/index.js';
import { CatEntity } from '@mewsense/shared-types';
import { CreateCatInput, UpdateCatInput } from '@mewsense/validation';

export class CatService {
  constructor(private catRepo: ICatRepository) {}

  async getUserCats(userId: string): Promise<CatEntity[]> {
    return this.catRepo.findByUserId(userId);
  }

  async getCatById(userId: string, catId: string): Promise<CatEntity> {
    const cat = await this.catRepo.findById(catId);
    if (!cat || cat.userId !== userId) {
      const err = new Error('Cat profile not found');
      (err as any).statusCode = 404;
      (err as any).code = 'CAT_NOT_FOUND';
      throw err;
    }
    return cat;
  }

  async createCat(userId: string, input: CreateCatInput): Promise<CatEntity> {
    return this.catRepo.create({
      userId,
      name: input.name,
      breed: input.breed,
      birthDate: input.birthDate ? new Date(input.birthDate) : null,
      sex: input.sex,
      isNeutered: input.isNeutered ?? true,
      avatarUrl: input.avatarUrl,
      medicalNotes: input.medicalNotes
    });
  }

  async updateCat(userId: string, catId: string, input: UpdateCatInput): Promise<CatEntity> {
    await this.getCatById(userId, catId);
    return this.catRepo.update(catId, {
      ...(input.name && { name: input.name }),
      ...(input.breed !== undefined && { breed: input.breed }),
      ...(input.birthDate !== undefined && { birthDate: input.birthDate ? new Date(input.birthDate) : null }),
      ...(input.sex && { sex: input.sex }),
      ...(input.isNeutered !== undefined && { isNeutered: input.isNeutered }),
      ...(input.avatarUrl !== undefined && { avatarUrl: input.avatarUrl }),
      ...(input.medicalNotes !== undefined && { medicalNotes: input.medicalNotes })
    });
  }

  async deleteCat(userId: string, catId: string): Promise<void> {
    await this.getCatById(userId, catId);
    await this.catRepo.softDelete(catId);
  }
}
