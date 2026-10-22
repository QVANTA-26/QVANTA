import {
  CheckpointKind as PrismaCheckpointKind,
  CheckpointState as PrismaCheckpointState,
  LessonProgress as PrismaLessonProgress,
  type CourseModule,
  type LessonCheckpoint as PrismaLessonCheckpoint,
  type Prisma,
  type PrismaClient,
  type UserProgress as PrismaUserProgress,
} from '@prisma/client';
import type {
  CheckpointState,
  LessonCheckpoint,
  LessonCheckpointQuestion,
  LessonCheckpointQuestionType,
  LessonCheckpointScore,
  LessonProgress,
  LessonProgressRecord,
} from '@qvanta/types';
import { AppError } from '../../lib/errors';
import { prisma } from '../../lib/prisma';

export interface UpdateLessonProgressInput {
  status?: LessonProgress;
  lastStep?: number;
  checkpointState?: CheckpointState;
}

export type CheckpointAnswer =
  | string
  | number
  | boolean
  | null
  | Array<string | number>;

export type CheckpointAnswers = Record<string, CheckpointAnswer> | Array<{
  questionId: string;
  answer: CheckpointAnswer;
}>;

export interface CheckpointQuestionDefinition {
  id: string;
  prompt: string;
  type?: LessonCheckpointQuestionType;
  options?: string[];
  correctAnswer?: unknown;
  points?: number;
}

export interface CheckpointForGrading {
  questions: unknown;
  maxScore?: number;
}

export interface LearningRepository
  extends Pick<
    PrismaClient,
    'courseModule' | 'userProgress' | 'lessonCheckpoint' | 'lessonCheckpointAttempt'
  > {}

const CHECKPOINT_SOURCE = 'course_module';
export const CHECKPOINT_PASS_SCORE = 70;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const asDateString = (value: Date | string): string =>
  value instanceof Date ? value.toISOString() : new Date(value).toISOString();

const normalizeAnswer = (value: unknown): unknown => {
  if (typeof value === 'string') return value.trim().toLowerCase();
  if (Array.isArray(value)) return value.map(normalizeAnswer).sort((a, b) => String(a).localeCompare(String(b)));
  return value;
};

const answersToRecord = (answers: CheckpointAnswers): Record<string, CheckpointAnswer> => {
  if (!Array.isArray(answers)) return answers;

  return answers.reduce<Record<string, CheckpointAnswer>>((result, answer) => {
    result[answer.questionId] = answer.answer;
    return result;
  }, {});
};

const isAnswered = (answer: unknown): boolean => {
  if (answer === true) return true;
  if (typeof answer === 'string') return answer.trim().length > 0 && answer.trim().toLowerCase() !== 'false';
  if (typeof answer === 'number') return Number.isFinite(answer);
  if (Array.isArray(answer)) return answer.length > 0;
  if (isRecord(answer)) return answer.completed === true || answer.selected === true;
  return false;
};

const questionDefinitions = (value: unknown): CheckpointQuestionDefinition[] => {
  const rawQuestions = Array.isArray(value)
    ? value
    : isRecord(value) && Array.isArray(value.questions)
      ? value.questions
      : isRecord(value) && Array.isArray(value.items)
        ? value.items
        : [];

  return rawQuestions.flatMap((raw, index) => {
    if (!isRecord(raw)) return [];

    const id = typeof raw.id === 'string' && raw.id.trim() ? raw.id.trim() : `question-${index + 1}`;
    const prompt = typeof raw.prompt === 'string'
      ? raw.prompt.trim()
      : typeof raw.question === 'string'
        ? raw.question.trim()
        : '';
    if (!prompt) return [];

    const type = raw.type === 'single_choice' || raw.type === 'multiple_choice' || raw.type === 'short_text'
      ? raw.type
      : 'checklist';
    const options = Array.isArray(raw.options)
      ? raw.options.filter((option): option is string => typeof option === 'string').map((option) => option.trim()).filter(Boolean)
      : undefined;
    const points = typeof raw.points === 'number' && Number.isFinite(raw.points) && raw.points > 0
      ? raw.points
      : 1;
    const correctAnswer = Object.prototype.hasOwnProperty.call(raw, 'correctAnswer')
      ? raw.correctAnswer
      : Object.prototype.hasOwnProperty.call(raw, 'answer')
        ? raw.answer
        : undefined;

    return [{ id, prompt, type, options, correctAnswer, points }];
  });
};

const hasCorrectAnswer = (question: CheckpointQuestionDefinition): boolean =>
  Object.prototype.hasOwnProperty.call(question, 'correctAnswer') && question.correctAnswer !== undefined;

const answersMatch = (expected: unknown, actual: unknown): boolean => {
  const normalizedExpected = normalizeAnswer(expected);
  const normalizedActual = normalizeAnswer(actual);

  if (Array.isArray(normalizedExpected) && Array.isArray(normalizedActual)) {
    return JSON.stringify(normalizedExpected) === JSON.stringify(normalizedActual);
  }

  return normalizedExpected === normalizedActual;
};

/**
 * Grade only data explicitly represented by a checkpoint. Source-backed
 * checklist items are intentionally self-attested; no answer key is invented
 * from lesson prose. Structured quiz records can provide `correctAnswer`.
 */
export function calculateCheckpointScore(
  checkpoint: CheckpointForGrading,
  answers: CheckpointAnswers,
): LessonCheckpointScore {
  const questions = questionDefinitions(checkpoint.questions);
  const answerRecord = answersToRecord(answers);
  const availablePoints = questions.reduce((total, question) => total + (question.points ?? 1), 0);

  if (availablePoints === 0) {
    return { score: 0, earnedPoints: 0, availablePoints: 0, passed: false };
  }

  const earnedPoints = questions.reduce((total, question) => {
    const answer = answerRecord[question.id];
    const correct = hasCorrectAnswer(question)
      ? answersMatch(question.correctAnswer, answer)
      : isAnswered(answer);
    return correct ? total + (question.points ?? 1) : total;
  }, 0);
  const score = Math.round((earnedPoints / availablePoints) * 100);

  return {
    score,
    earnedPoints,
    availablePoints,
    passed: score >= CHECKPOINT_PASS_SCORE,
  };
}

const sourceCheckpointItems = (content: string): string[] => {
  const lines = content.split(/\r?\n/);
  const items: string[] = [];
  const addItems = (value: string): void => {
    value
      .replace(/[☐□]/g, '')
      .split(/\s*(?:·|\||;|•)\s*/)
      .map((item) => item.replace(/^[-*]\s+/, '').trim())
      .filter((item) => item.length > 0 && item.length <= 500)
      .forEach((item) => {
        if (!items.includes(item)) items.push(item);
      });
  };

  const checkpointLine = lines.find((line) => /checkpoint\s*:/iu.test(line));
  if (checkpointLine) {
    const checkpointMatch = checkpointLine.match(/checkpoint\s*:\s*(.+)$/iu);
    if (checkpointMatch) addItems(checkpointMatch[1]);
  }

  if (items.length > 0) return items.slice(0, 20);

  const headingIndex = lines.findIndex((line) => /check\s+your\s+understanding|checkpoint/iu.test(line));
  if (headingIndex < 0) return [];

  for (let index = headingIndex + 1; index < lines.length; index += 1) {
    const line = lines[index].trim();
    if (/^#{1,6}\s+/u.test(line) && !/check\s+your\s+understanding|checkpoint/iu.test(line)) break;
    const match = line.match(/^(?:[-*]|\d+[.)])\s+(?:\[[ x]\]\s*)?(.+)$/iu);
    if (match) addItems(match[1]);
  }

  return items.slice(0, 20);
};

export function deriveCheckpointQuestions(content: string): CheckpointQuestionDefinition[] {
  return sourceCheckpointItems(content).map((prompt, index) => ({
    id: `source-${index + 1}`,
    prompt,
    type: 'checklist',
    points: 1,
  }));
}

const serializeQuestion = (question: CheckpointQuestionDefinition): LessonCheckpointQuestion => ({
  id: question.id,
  prompt: question.prompt,
  type: question.type ?? 'checklist',
  ...(question.options && question.options.length > 0 ? { options: question.options } : {}),
  ...(question.points !== undefined ? { points: question.points } : {}),
});

export function serializeCheckpoint(checkpoint: PrismaLessonCheckpoint): LessonCheckpoint {
  const questions = questionDefinitions(checkpoint.questions).map(serializeQuestion);
  return {
    id: checkpoint.id,
    moduleId: checkpoint.moduleId,
    title: checkpoint.title,
    prompt: checkpoint.prompt,
    kind: checkpoint.kind,
    questions,
    maxScore: checkpoint.maxScore,
    createdAt: asDateString(checkpoint.createdAt),
    updatedAt: asDateString(checkpoint.updatedAt),
  };
}

export function serializeProgress(
  progress: PrismaUserProgress & {
    module?: Pick<CourseModule, 'id' | 'title' | 'slug' | 'order'> | null;
  },
): LessonProgressRecord {
  return {
    userId: progress.userId,
    moduleId: progress.moduleId,
    status: progress.status,
    lastStep: progress.lastStep,
    mastery: progress.mastery,
    xp: progress.xp,
    checkpointState: progress.checkpointState,
    ...(progress.checkpointScore === null ? {} : { checkpointScore: progress.checkpointScore }),
    checkpointAttempts: progress.checkpointAttempts,
    createdAt: asDateString(progress.createdAt),
    updatedAt: asDateString(progress.updatedAt),
    ...(progress.module
      ? {
          module: {
            id: progress.module.id,
            title: progress.module.title,
            slug: progress.module.slug,
            order: progress.module.order ?? 0,
          },
        }
      : {}),
  };
}

const requireUserAndModuleIds = (userId: string, moduleId: string): void => {
  if (!userId.trim()) throw AppError.unauthorized();
  if (!moduleId.trim()) throw AppError.validation('moduleId is required');
};

async function getModule(moduleId: string, db: LearningRepository): Promise<CourseModule> {
  const module = await db.courseModule.findUnique({ where: { id: moduleId } });
  if (!module) throw AppError.notFound('Lesson module not found');
  return module;
}

export async function listLessonProgress(
  userId: string,
  db: LearningRepository = prisma,
): Promise<LessonProgressRecord[]> {
  if (!userId.trim()) throw AppError.unauthorized();

  const rows = await db.userProgress.findMany({
    where: { userId },
    orderBy: { updatedAt: 'desc' },
    include: {
      module: {
        select: { id: true, title: true, slug: true, order: true },
      },
    },
  });

  return rows.map((row) => serializeProgress(row));
}

export async function upsertLessonProgress(
  userId: string,
  moduleId: string,
  input: UpdateLessonProgressInput,
  db: LearningRepository = prisma,
): Promise<LessonProgressRecord> {
  requireUserAndModuleIds(userId, moduleId);
  await getModule(moduleId, db);

  const existing = await db.userProgress.findUnique({
    where: { userId_moduleId: { userId, moduleId } },
  });

  const updateData: Prisma.UserProgressUpdateInput = {};
  if (input.status !== undefined) updateData.status = input.status as PrismaLessonProgress;
  if (input.lastStep !== undefined) updateData.lastStep = input.lastStep;
  if (input.checkpointState !== undefined) {
    updateData.checkpointState = input.checkpointState as PrismaCheckpointState;
  }

  const inferredStatus = input.status ?? (
    input.checkpointState === 'passed'
      ? 'completed'
      : input.checkpointState === 'in_progress' || input.checkpointState === 'failed' || input.lastStep !== undefined && input.lastStep > 0
        ? 'started'
        : undefined
  );
  const createData: Prisma.UserProgressCreateInput = {
    user: { connect: { id: userId } },
    module: { connect: { id: moduleId } },
    ...(inferredStatus ? { status: inferredStatus as PrismaLessonProgress } : {}),
    ...(input.lastStep !== undefined ? { lastStep: input.lastStep } : {}),
    ...(input.checkpointState ? { checkpointState: input.checkpointState as PrismaCheckpointState } : {}),
  };

  const row = await db.userProgress.upsert({
    where: { userId_moduleId: { userId, moduleId } },
    create: createData,
    update: updateData,
  });

  return serializeProgress(row);
}

async function ensureSourceCheckpoint(
  module: CourseModule,
  db: LearningRepository,
): Promise<PrismaLessonCheckpoint> {
  const existing = await db.lessonCheckpoint.findFirst({
    where: { moduleId: module.id },
    orderBy: { createdAt: 'asc' },
  });
  if (existing) return existing;

  const questions = deriveCheckpointQuestions(module.mdxContent);
  if (questions.length === 0) {
    throw AppError.notFound('This lesson does not have a source-backed checkpoint');
  }

  return db.lessonCheckpoint.upsert({
    where: { moduleId_source: { moduleId: module.id, source: CHECKPOINT_SOURCE } },
    create: {
      module: { connect: { id: module.id } },
      kind: PrismaCheckpointKind.checklist,
      title: `${module.title} checkpoint`,
      prompt: `Complete the source-backed checkpoint for “${module.title}”.`,
      questions: questions as unknown as Prisma.InputJsonValue,
      maxScore: questions.length,
      source: CHECKPOINT_SOURCE,
    },
    update: {
      questions: questions as unknown as Prisma.InputJsonValue,
      maxScore: questions.length,
      prompt: `Complete the source-backed checkpoint for “${module.title}”.`,
    },
  });
}

async function getCheckpoint(
  moduleId: string,
  checkpointId: string | undefined,
  db: LearningRepository,
): Promise<PrismaLessonCheckpoint> {
  const module = await getModule(moduleId, db);
  if (!checkpointId) return ensureSourceCheckpoint(module, db);

  const checkpoint = await db.lessonCheckpoint.findUnique({ where: { id: checkpointId } });
  if (!checkpoint || checkpoint.moduleId !== module.id) {
    throw AppError.notFound('Lesson checkpoint not found');
  }
  return checkpoint;
}

export async function getLessonCheckpoint(
  userId: string,
  moduleId: string,
  checkpointId?: string,
  db: LearningRepository = prisma,
): Promise<LessonCheckpoint> {
  requireUserAndModuleIds(userId, moduleId);
  const checkpoint = await getCheckpoint(moduleId, checkpointId, db);
  return serializeCheckpoint(checkpoint);
}

export async function submitLessonCheckpoint(
  userId: string,
  moduleId: string,
  answers: CheckpointAnswers,
  checkpointId?: string,
  db: LearningRepository = prisma,
): Promise<{
  checkpoint: LessonCheckpoint;
  result: LessonCheckpointScore;
  progress: LessonProgressRecord;
}> {
  requireUserAndModuleIds(userId, moduleId);
  const checkpoint = await getCheckpoint(moduleId, checkpointId, db);
  const result = calculateCheckpointScore(checkpoint, answers);
  const existing = await db.userProgress.findUnique({
    where: { userId_moduleId: { userId, moduleId } },
  });

  const previousBest = existing?.checkpointScore ?? 0;
  const bestScore = Math.max(previousBest, result.score);
  const checkpointState: CheckpointState = bestScore >= CHECKPOINT_PASS_SCORE
    ? 'passed'
    : result.score > 0
      ? 'failed'
      : 'in_progress';
  const status: LessonProgress = bestScore >= CHECKPOINT_PASS_SCORE
    ? 'completed'
    : existing?.status === 'completed'
      ? 'completed'
      : 'started';
  const xpAward = Math.max(0, bestScore - previousBest);

  const progress = await db.userProgress.upsert({
    where: { userId_moduleId: { userId, moduleId } },
    create: {
      user: { connect: { id: userId } },
      module: { connect: { id: moduleId } },
      status: status as PrismaLessonProgress,
      mastery: bestScore,
      xp: xpAward,
      checkpointState: checkpointState as PrismaCheckpointState,
      checkpointScore: bestScore,
      checkpointAttempts: 1,
    },
    update: {
      status: status as PrismaLessonProgress,
      mastery: Math.max(existing?.mastery ?? 0, bestScore),
      xp: (existing?.xp ?? 0) + xpAward,
      checkpointState: checkpointState as PrismaCheckpointState,
      checkpointScore: bestScore,
      checkpointAttempts: { increment: 1 },
    },
  });

  await db.lessonCheckpointAttempt.create({
    data: {
      user: { connect: { id: userId } },
      checkpoint: { connect: { id: checkpoint.id } },
      answers: answers as unknown as Prisma.InputJsonValue,
      score: result.score,
      maxScore: result.availablePoints,
      passed: result.passed,
    },
  });

  return {
    checkpoint: serializeCheckpoint(checkpoint),
    result,
    progress: serializeProgress(progress),
  };
}
