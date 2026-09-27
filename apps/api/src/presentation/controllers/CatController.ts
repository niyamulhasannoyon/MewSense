import { Request, Response, NextFunction } from 'express';
import { CatService } from '../../application/services/CatService.js';
import { createCatSchema, updateCatSchema } from '@mewsense/validation';

export class CatController {
  constructor(private catService: CatService) {}

  listCats = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const cats = await this.catService.getUserCats(req.user!.userId);
      return res.status(200).json({
        success: true,
        data: cats,
        error: null,
        meta: { requestId: req.requestId || '', timestamp: new Date().toISOString() }
      });
    } catch (err) {
      next(err);
    }
  };

  getCat = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const cat = await this.catService.getCatById(req.user!.userId, req.params.id);
      return res.status(200).json({
        success: true,
        data: cat,
        error: null,
        meta: { requestId: req.requestId || '', timestamp: new Date().toISOString() }
      });
    } catch (err) {
      next(err);
    }
  };

  createCat = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const validated = createCatSchema.parse(req.body);
      const cat = await this.catService.createCat(req.user!.userId, validated);
      return res.status(201).json({
        success: true,
        data: cat,
        error: null,
        meta: { requestId: req.requestId || '', timestamp: new Date().toISOString() }
      });
    } catch (err) {
      next(err);
    }
  };

  updateCat = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const validated = updateCatSchema.parse(req.body);
      const cat = await this.catService.updateCat(req.user!.userId, req.params.id, validated);
      return res.status(200).json({
        success: true,
        data: cat,
        error: null,
        meta: { requestId: req.requestId || '', timestamp: new Date().toISOString() }
      });
    } catch (err) {
      next(err);
    }
  };

  deleteCat = async (req: Request, res: Response, next: NextFunction) => {
    try {
      await this.catService.deleteCat(req.user!.userId, req.params.id);
      return res.status(200).json({
        success: true,
        data: { message: 'Cat profile deleted successfully' },
        error: null,
        meta: { requestId: req.requestId || '', timestamp: new Date().toISOString() }
      });
    } catch (err) {
      next(err);
    }
  };
}
