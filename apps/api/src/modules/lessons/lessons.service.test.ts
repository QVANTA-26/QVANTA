import assert from 'node:assert/strict';
import test from 'node:test';
import type { Request, Response } from 'express';
import { AppError } from '../../lib/errors';
import { JwtAuthGuard } from '../auth/auth.middleware';
import {
  calculateCheckpointScore,
  deriveCheckpointQuestions,
  type LearningRepository,
  upsertLessonProgress,
} from './lessons.service';
import { checkpointSubmissionSchema, progressUpdateSchema } from './lessons.router';

const progressRow = {
  userId: 'user-1',
  moduleId: 'module-1',
  status: 'started',
  lastStep: 3,
  mastery: 25,
  xp: 40,
  checkpointState: 'in_progress',
  checkpointScore: null,
  checkpointAttempts: 0,
  createdAt: new Date('2026-10-22T00:00:00.000Z'),
  updatedAt: new Date('2026-10-22T00:00:00.000Z'),
};

test('lesson progress upsert is scoped to the authenticated user and module', async () => {
  let upsertArgs: unknown;
  const repository = {
    courseModule: {
      findUnique: async () => ({ id: 'module-1' }),
    },
    userProgress: {
      findUnique: async () => null,
      upsert: async (args: unknown) => {
        upsertArgs = args;
        return progressRow;
      },
    },
    lessonCheckpoint: {},
    lessonCheckpointAttempt: {},
  } as unknown as LearningRepository;

  const result = await upsertLessonProgress(
    'user-1',
    'module-1',
    {
      status: 'started',
      lastStep: 3,
      checkpointState: 'in_progress',
    },
    repository,
  );

  assert.deepEqual((upsertArgs as { where: unknown }).where, {
    userId_moduleId: { userId: 'user-1', moduleId: 'module-1' },
  });
  assert.equal(result.moduleId, 'module-1');
  assert.equal(result.lastStep, 3);
  assert.equal(result.checkpointState, 'in_progress');
});

test('checkpoint score calculation handles weighted quiz answers and source checklists', () => {
  const quiz = calculateCheckpointScore(
    {
      maxScore: 3,
      questions: [
        { id: 'q1', prompt: 'Pick the correct state.', correctAnswer: 'superposition', points: 2 },
        { id: 'q2', prompt: 'Confirm the hands-on step.', type: 'checklist', points: 1 },
      ],
    },
    { q1: ' Superposition ', q2: false },
  );

  assert.equal(quiz.earnedPoints, 2);
  assert.equal(quiz.availablePoints, 3);
  assert.equal(quiz.score, 67);
  assert.equal(quiz.passed, false);

  const checklist = calculateCheckpointScore(
    {
      questions: [
        { id: 'source-1', prompt: 'Concept clear', type: 'checklist' },
        { id: 'source-2', prompt: 'Hands-on done', type: 'checklist' },
      ],
    },
    { 'source-1': true, 'source-2': true },
  );

  assert.equal(checklist.score, 100);
  assert.equal(checklist.passed, true);
});

test('source checkpoints are derived from explicit module content', () => {
  const questions = deriveCheckpointQuestions(
    '# Module\n\nCheckpoint: ☐ concept clear · ☐ hands-on done · ☐ verified with the AI Tutor',
  );

  assert.deepEqual(questions.map((question) => question.prompt), [
    'concept clear',
    'hands-on done',
    'verified with the AI Tutor',
  ]);
  assert.ok(questions.every((question) => question.correctAnswer === undefined));
});

test('progress and checkpoint schemas reject invalid payloads', () => {
  assert.equal(progressUpdateSchema.safeParse({}).success, false);
   assert.equal(progressUpdateSchema.safeParse({ mastery: 101 }).success, false);
  assert.equal(progressUpdateSchema.safeParse({ status: 'started', unexpected: true }).success, false);
  assert.equal(checkpointSubmissionSchema.safeParse({ answers: {} }).success, false);
  assert.equal(checkpointSubmissionSchema.safeParse({ answers: { q1: { unsafe: true } } }).success, false);
});

test('lesson routes reject requests without an access token', () => {
  let received: unknown;
  JwtAuthGuard(
    { headers: {} } as Request,
    {} as Response,
    (error?: unknown) => {
      received = error;
    },
  );

  assert.ok(received instanceof AppError);
  assert.equal((received as AppError).code, 'UNAUTHORIZED');
});
