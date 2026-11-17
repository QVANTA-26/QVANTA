import { Router } from 'express';
import { z } from 'zod';
import { JwtAuthGuard, type AuthRequest } from '../auth/auth.middleware';
import { AppError } from '../../lib/errors';
import { analyzePaper } from './papers.service';

export const papersRouter = Router();

const analyzeSchema = z.object({
  url: z.string().trim().min(1).max(2048).optional(),
  pdfBase64: z.string().min(1).optional(),
});

papersRouter.use(JwtAuthGuard);

/**
 * Turns a research-paper link or PDF into builder-ready circuits. The response
 * is a `PaperAnalysis`; the web app renders each circuit and can simulate it
 * through the existing /simulations endpoint.
 */
papersRouter.post('/analyze', async (req, res, next) => {
  try {
    const authReq = req as AuthRequest;
    if (!authReq.user) {
      throw AppError.unauthorized();
    }

    const parsed = analyzeSchema.safeParse(req.body);
    if (!parsed.success) {
      throw AppError.validation('Invalid paper request', parsed.error.flatten());
    }

    const analysis = await analyzePaper(parsed.data);
    res.status(200).json(analysis);
  } catch (err) {
    next(err);
  }
});
