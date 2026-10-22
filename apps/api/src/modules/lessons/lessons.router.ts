import { Router, type NextFunction, type Request, type Response } from 'express';
import { z } from 'zod';
import { prisma } from '../../lib/prisma';
import { JwtAuthGuard, type AuthRequest } from '../auth/auth.middleware';
import { AppError } from '../../lib/errors';
import {
  getLessonCheckpoint,
  listLessonProgress,
  submitLessonCheckpoint,
  upsertLessonProgress,
} from './lessons.service';

export const lessonsRouter = Router();

lessonsRouter.use(JwtAuthGuard);

const moduleParamsSchema = z.object({
  moduleId: z.string().trim().min(1).max(120),
});

const checkpointParamsSchema = moduleParamsSchema.extend({
  checkpointId: z.string().trim().min(1).max(120),
});

export const progressUpdateSchema = z.object({
  status: z.enum(['not_started', 'started', 'completed']).optional(),
  lastStep: z.number().int().min(0).max(10_000).optional(),
  checkpointState: z.enum(['not_started', 'in_progress', 'passed', 'failed']).optional(),
}).strict().refine((value) => Object.keys(value).length > 0, {
  message: 'At least one progress field is required',
});

const checkpointAnswerSchema = z.union([
  z.string().max(4_000),
  z.number().finite(),
  z.boolean(),
  z.null(),
  z.array(z.union([z.string().max(500), z.number().finite()])).max(100),
]);

export const checkpointSubmissionSchema = z.object({
  checkpointId: z.string().trim().min(1).max(120).optional(),
  answers: z.union([
    z.record(z.string().trim().min(1).max(120), checkpointAnswerSchema).refine(
      (value) => Object.keys(value).length > 0,
      { message: 'At least one checkpoint answer is required' },
    ),
    z.array(z.object({
      questionId: z.string().trim().min(1).max(120),
      answer: checkpointAnswerSchema,
    }).strict()).min(1).max(100),
  ]),
}).strict();

const getAuthenticatedUserId = (req: AuthRequest): string => {
  if (!req.user?.id) throw AppError.unauthorized();
  return req.user.id;
};

const parseModuleParams = (params: unknown): { moduleId: string } => {
  const parsed = moduleParamsSchema.safeParse(params);
  if (!parsed.success) throw AppError.validation('Invalid lesson module id', parsed.error.flatten());
  return parsed.data;
};

const parseCheckpointParams = (params: unknown): { moduleId: string; checkpointId: string } => {
  const parsed = checkpointParamsSchema.safeParse(params);
  if (!parsed.success) throw AppError.validation('Invalid lesson checkpoint id', parsed.error.flatten());
  return parsed.data;
};

lessonsRouter.get('/', async (req, res, next) => {
  try {
    const authReq = req as AuthRequest;
    if (!authReq.user) {
      throw AppError.unauthorized();
    }

    const modules = await prisma.courseModule.findMany({
      orderBy: [{ order: 'asc' }, { createdAt: 'asc' }],
      include: {
        progress: {
          where: { userId: authReq.user.id },
          select: { status: true },
          take: 1,
        },
      },
    });

    const data = modules.map((module) => ({
      id: module.id,
      title: module.title,
      slug: module.slug,
      description: module.mdxContent.slice(0, 180),
      content: module.mdxContent,
      order: module.order ?? 0,
      progress: module.progress[0]?.status ?? 'not_started',
      embedded: module.embedded,
      createdAt: module.createdAt.toISOString(),
    }));

    res.status(200).json(data);
  } catch (err) {
    next(err);
  }
});

lessonsRouter.get('/progress', async (req, res, next) => {
  try {
    const userId = getAuthenticatedUserId(req as AuthRequest);
    const data = await listLessonProgress(userId);
    res.status(200).json({ data, total: data.length });
  } catch (err) {
    next(err);
  }
});

lessonsRouter.get('/:moduleId/checkpoint', async (req, res, next) => {
  try {
    const userId = getAuthenticatedUserId(req as AuthRequest);
    const { moduleId } = parseModuleParams(req.params);
    const checkpoint = await getLessonCheckpoint(userId, moduleId);
    res.status(200).json(checkpoint);
  } catch (err) {
    next(err);
  }
});

lessonsRouter.patch('/:moduleId/progress', async (req, res, next) => {
  try {
    const userId = getAuthenticatedUserId(req as AuthRequest);
    const { moduleId } = parseModuleParams(req.params);
    const parsed = progressUpdateSchema.safeParse(req.body);
    if (!parsed.success) {
      throw AppError.validation('Invalid lesson progress payload', parsed.error.flatten());
    }

    const progress = await upsertLessonProgress(userId, moduleId, parsed.data);
    res.status(200).json(progress);
  } catch (err) {
    next(err);
  }
});

const submitCheckpoint = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const userId = getAuthenticatedUserId(req as AuthRequest);
    const { moduleId } = parseModuleParams(req.params);
    const parsed = checkpointSubmissionSchema.safeParse(req.body);
    if (!parsed.success) {
      throw AppError.validation('Invalid checkpoint submission', parsed.error.flatten());
    }

    const routeCheckpointId = typeof req.params.checkpointId === 'string' ? req.params.checkpointId : undefined;
    if (routeCheckpointId && parsed.data.checkpointId && routeCheckpointId !== parsed.data.checkpointId) {
      throw AppError.validation('checkpointId does not match the route');
    }

    const result = await submitLessonCheckpoint(
      userId,
      moduleId,
      parsed.data.answers,
      routeCheckpointId ?? parsed.data.checkpointId,
    );
    res.status(200).json(result);
  } catch (err) {
    next(err);
  }
};

lessonsRouter.post('/:moduleId/checkpoint', submitCheckpoint);
lessonsRouter.post('/:moduleId/checkpoint/submit', submitCheckpoint);

lessonsRouter.post('/:moduleId/checkpoint/:checkpointId/submit', async (req, res, next) => {
  try {
    parseCheckpointParams(req.params);
    await submitCheckpoint(req, res, next);
  } catch (err) {
    next(err);
  }
});

lessonsRouter.post('/:moduleId/checkpoints/:checkpointId/submit', async (req, res, next) => {
  try {
    parseCheckpointParams(req.params);
    await submitCheckpoint(req, res, next);
  } catch (err) {
    next(err);
  }
});
