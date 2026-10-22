import type { LessonCheckpoint, LessonCheckpointQuestion } from '@qvanta/types';
import { apiClient } from '@/lib/api-client';

export type LearningProgressStatus = 'not_started' | 'in_progress' | 'completed';
export type LearningProgressSource = 'remote' | 'local';

export interface LearningCheckpointProgress {
  answered: boolean;
  correct: boolean | null;
  answerId?: string;
  attempts: number;
  completedAt?: string;
}

export interface LearningProgressRecord {
  moduleId: string;
  status: LearningProgressStatus;
  /** Zero-based index of the step the learner should resume. */
  currentStep: number;
  /** Per-step checkpoint history kept by the local fallback. */
  checkpoints: Record<string, LearningCheckpointProgress>;
  checkpoint: LearningCheckpointProgress;
  mastery: number;
  xp: number;
  updatedAt?: string;
}

export interface LearningProgressSnapshot {
  records: Record<string, LearningProgressRecord>;
  source: LearningProgressSource;
  totalXp?: number;
}

export interface LearningProgressWriteResult {
  record: LearningProgressRecord;
  source: LearningProgressSource;
}

export interface LearningProgressUpdate {
  moduleId: string;
  status?: LearningProgressStatus;
  currentStep?: number;
  checkpoint?: Partial<LearningCheckpointProgress>;
  checkpoints?: Record<string, LearningCheckpointProgress>;
  mastery?: number;
  xp?: number;
}

export interface LearningCheckpointSubmission {
  moduleId: string;
  stepId: string;
  answerId: string;
  answer: string;
  correct?: boolean;
  checkpointId?: string;
  questionId?: string;
  answerValue?: string | number | boolean | null | Array<string | number>;
  currentStep: number;
  totalSteps: number;
}

export interface LearningCheckpointResult extends LearningProgressWriteResult {
  correct: boolean;
  feedback?: string;
  xpAwarded?: number;
  score?: number;
}

export const CURRICULUM_PROGRESS_KEY = 'qvanta.curriculum.progress';
const LEGACY_PROGRESS_KEY = 'qvanta.learning.progress';
const LEARNING_PROGRESS_KEY = 'qvanta.learning.progress.v2';
const LEARNING_PROGRESS_VERSION = 2;

export const LEARNING_PROGRESS_ENDPOINT = '/lessons/progress';
export const LEARNING_CHECKPOINT_ENDPOINT = (moduleId: string): string =>
  `/lessons/${encodeURIComponent(moduleId)}/checkpoint`;
export const LEARNING_CHECKPOINT_SUBMIT_ENDPOINT = (moduleId: string): string =>
  `/lessons/${encodeURIComponent(moduleId)}/checkpoint/submit`;

// The old /learn page used presentation ids. Preserve those local statuses
// when the roadmap moves to the canonical module ids.
const LEGACY_MODULE_ID_MAP: Record<string, string> = {
  'qubit-basics': '103',
  'quantum-gates': '131',
  'bloch-sphere': '119',
  'quantum-algorithms': '239',
};

const isStoredProgressValue = (value: unknown): value is LearningProgressStatus | 'started' =>
  value === 'not_started' || value === 'in_progress' || value === 'completed' || value === 'started';

const isRecord = (value: unknown): value is Record<string, unknown> =>
  Boolean(value) && typeof value === 'object' && !Array.isArray(value);

const asString = (value: unknown): string | undefined =>
  typeof value === 'string' && value.trim() ? value.trim() : undefined;

const asNonNegativeInteger = (value: unknown, fallback: number): number => {
  const parsed = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(parsed) ? Math.max(0, Math.floor(parsed)) : fallback;
};

const asPercent = (value: unknown, fallback: number): number => {
  const parsed = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(parsed) ? Math.max(0, Math.min(100, parsed)) : fallback;
};

const normalizeStatus = (value: unknown, fallback: LearningProgressStatus): LearningProgressStatus => {
  if (value === 'completed') return 'completed';
  if (value === 'started' || value === 'in_progress') return 'in_progress';
  if (value === 'not_started') return 'not_started';
  return fallback;
};

const defaultCheckpoint = (): LearningCheckpointProgress => ({
  answered: false,
  correct: null,
  attempts: 0,
});

export const createLearningProgressRecord = (
  moduleId: string,
  seed?: Partial<LearningProgressRecord>,
): LearningProgressRecord => {
  const checkpoint = {
    ...defaultCheckpoint(),
    ...(seed?.checkpoint ?? {}),
    attempts: asNonNegativeInteger(seed?.checkpoint?.attempts, 0),
  };
  const checkpoints = Object.entries(seed?.checkpoints ?? {}).reduce<Record<string, LearningCheckpointProgress>>(
    (result, [stepId, value]) => {
      result[stepId] = {
        ...defaultCheckpoint(),
        ...value,
        attempts: asNonNegativeInteger(value.attempts, 0),
      };
      return result;
    },
    {},
  );

  return {
    moduleId,
    status: seed?.status ?? 'not_started',
    currentStep: asNonNegativeInteger(seed?.currentStep, 0),
    checkpoints,
    checkpoint,
    mastery: asPercent(seed?.mastery, 0),
    xp: asNonNegativeInteger(seed?.xp, 0),
    updatedAt: seed?.updatedAt,
  };
};

export const mergeLearningProgressRecord = (
  current: LearningProgressRecord,
  update: Partial<LearningProgressRecord>,
): LearningProgressRecord => createLearningProgressRecord(current.moduleId, {
  ...current,
  ...update,
  mastery: Math.max(current.mastery, update.mastery ?? 0),
  xp: Math.max(current.xp, update.xp ?? 0),
  checkpoints: {
    ...current.checkpoints,
    ...(update.checkpoints ?? {}),
  },
  checkpoint: {
    ...current.checkpoint,
    ...(update.checkpoint ?? {}),
  },
});

const normalizeStoredRecord = (moduleId: string, value: unknown): LearningProgressRecord | null => {
  if (isStoredProgressValue(value)) {
    return createLearningProgressRecord(moduleId, {
      moduleId,
      status: value === 'started' ? 'in_progress' : value,
    });
  }

  if (!isRecord(value)) return null;

  const checkpointValue = isRecord(value.checkpoint)
    ? value.checkpoint
    : isRecord(value.checkpointProgress)
      ? value.checkpointProgress
      : {};
  const checkpointsValue = isRecord(value.checkpoints) ? value.checkpoints : {};
  const checkpointState = asString(value.checkpointState);
  const checkpointScore = typeof value.checkpointScore === 'number'
    ? asPercent(value.checkpointScore, 0)
    : undefined;
  const correct = typeof checkpointValue.correct === 'boolean'
    ? checkpointValue.correct
    : typeof value.checkpointCorrect === 'boolean'
      ? value.checkpointCorrect
      : checkpointState === 'passed'
        ? true
        : checkpointState === 'failed'
          ? false
          : null;

  const checkpoints = Object.entries(checkpointsValue).reduce<Record<string, LearningCheckpointProgress>>(
    (result, [stepId, rawCheckpoint]) => {
      if (!isRecord(rawCheckpoint)) return result;
      result[stepId] = {
        ...defaultCheckpoint(),
        answered: Boolean(rawCheckpoint.answered ?? rawCheckpoint.correct !== undefined),
        correct: typeof rawCheckpoint.correct === 'boolean' ? rawCheckpoint.correct : null,
        answerId: asString(rawCheckpoint.answerId),
        attempts: asNonNegativeInteger(rawCheckpoint.attempts, 0),
        completedAt: asString(rawCheckpoint.completedAt),
      };
      return result;
    },
    {},
  );

  return createLearningProgressRecord(moduleId, {
    moduleId,
    status: normalizeStatus(value.status ?? value.progress, 'not_started'),
    currentStep: asNonNegativeInteger(
      value.currentStep ?? value.currentStepIndex ?? value.stepIndex ?? value.lastStep,
      0,
    ),
    checkpoint: {
      answered: Boolean(
        checkpointValue.answered
          ?? value.checkpointAnswered
          ?? (checkpointState === 'passed' || checkpointState === 'failed' || correct !== null),
      ),
      correct,
      answerId: asString(checkpointValue.answerId ?? value.answerId ?? value.checkpointAnswer),
      attempts: asNonNegativeInteger(
        checkpointValue.attempts ?? value.checkpointAttempts,
        checkpointState ? 1 : 0,
      ),
      completedAt: asString(checkpointValue.completedAt ?? value.checkpointCompletedAt),
    },
    checkpoints,
    mastery: asPercent(value.mastery ?? value.masteryPercent ?? value.masteryScore ?? checkpointScore, 0),
    xp: asNonNegativeInteger(value.xp ?? value.experience ?? value.experiencePoints, 0),
    updatedAt: asString(value.updatedAt ?? value.lastUpdatedAt),
  });
};

const normalizeStoredPayload = (parsed: unknown): Record<string, LearningProgressRecord> => {
  if (!isRecord(parsed)) return {};

  const candidate = isRecord(parsed.records)
    ? parsed.records
    : isRecord(parsed.progress)
      ? parsed.progress
      : parsed;

  return Object.entries(candidate).reduce<Record<string, LearningProgressRecord>>(
    (result, [moduleId, value]) => {
      const canonicalId = LEGACY_MODULE_ID_MAP[moduleId] ?? moduleId;
      const record = normalizeStoredRecord(canonicalId, value);
      if (record) result[canonicalId] = record;
      return result;
    },
    {},
  );
};

export const readLearningProgressRecords = (): Record<string, LearningProgressRecord> => {
  if (typeof window === 'undefined') return {};

  try {
    const raw = window.localStorage.getItem(LEARNING_PROGRESS_KEY)
      ?? window.localStorage.getItem(CURRICULUM_PROGRESS_KEY)
      ?? window.localStorage.getItem(LEGACY_PROGRESS_KEY);
    if (!raw) return {};
    return normalizeStoredPayload(JSON.parse(raw));
  } catch {
    return {};
  }
};

export const writeLearningProgressRecords = (
  records: Record<string, LearningProgressRecord>,
): void => {
  if (typeof window === 'undefined') return;

  try {
    window.localStorage.setItem(LEARNING_PROGRESS_KEY, JSON.stringify({
      version: LEARNING_PROGRESS_VERSION,
      records,
    }));
  } catch {
    // Local progress is best-effort when browser storage is unavailable.
  }
};

export const progressRecordsToStatusMap = (
  records: Record<string, LearningProgressRecord>,
): Record<string, LearningProgressStatus> => Object.entries(records).reduce<Record<string, LearningProgressStatus>>(
  (result, [moduleId, record]) => {
    result[moduleId] = record.status;
    return result;
  },
  {},
);

export const readCurriculumProgress = (): Record<string, LearningProgressStatus> =>
  progressRecordsToStatusMap(readLearningProgressRecords());

export const writeCurriculumProgress = (
  progress: Record<string, LearningProgressStatus>,
): void => {
  const records = readLearningProgressRecords();
  Object.entries(progress).forEach(([moduleId, status]) => {
    const canonicalId = LEGACY_MODULE_ID_MAP[moduleId] ?? moduleId;
    const current = records[canonicalId] ?? createLearningProgressRecord(canonicalId);
    records[canonicalId] = mergeLearningProgressRecord(current, { status });
  });
  writeLearningProgressRecords(records);
};

const unwrapResponsePayload = (payload: unknown): unknown => {
  if (!isRecord(payload) || payload.data === undefined) return payload;
  return payload.data;
};

const normalizeRemoteRecord = (value: unknown, fallbackModuleId?: string): LearningProgressRecord | null => {
  if (!isRecord(value)) return null;
  const hasProgressField = [
    'status',
    'progress',
    'currentStep',
    'currentStepIndex',
    'stepIndex',
    'lastStep',
    'checkpoint',
    'checkpointProgress',
    'mastery',
    'masteryPercent',
    'masteryScore',
    'xp',
    'experience',
    'experiencePoints',
  ].some((key) => key in value);
  if (!hasProgressField) return null;
  const moduleId = asString(value.moduleId ?? value.lessonId ?? value.courseModuleId ?? fallbackModuleId);
  if (!moduleId) return null;

  return normalizeStoredRecord(moduleId, value);
};

const normalizeRemoteCheckpointQuestion = (value: unknown, index: number): LessonCheckpointQuestion | null => {
  if (!isRecord(value)) return null;
  const id = asString(value.id) ?? `question-${index + 1}`;
  const prompt = asString(value.prompt ?? value.question);
  if (!prompt) return null;

  const type = value.type === 'single_choice'
    || value.type === 'multiple_choice'
    || value.type === 'short_text'
    || value.type === 'checklist'
    ? value.type
    : 'checklist';
  const options = Array.isArray(value.options)
    ? value.options.filter((option): option is string => typeof option === 'string').map((option) => option.trim()).filter(Boolean)
    : undefined;
  const points = typeof value.points === 'number' && Number.isFinite(value.points)
    ? value.points
    : undefined;

  return {
    id,
    prompt,
    type,
    ...(options && options.length > 0 ? { options } : {}),
    ...(points !== undefined ? { points } : {}),
  };
};

const normalizeRemoteCheckpoint = (payload: unknown, fallbackModuleId: string): LessonCheckpoint | null => {
  const value = unwrapResponsePayload(payload);
  if (!isRecord(value)) return null;

  const id = asString(value.id);
  const moduleId = asString(value.moduleId ?? value.lessonId) ?? fallbackModuleId;
  const title = asString(value.title) ?? `${moduleId} checkpoint`;
  const prompt = asString(value.prompt) ?? title;
  const rawQuestions = Array.isArray(value.questions) ? value.questions : [];
  const questions = rawQuestions.flatMap((question, index) => {
    const normalized = normalizeRemoteCheckpointQuestion(question, index);
    return normalized ? [normalized] : [];
  });
  if (!id || questions.length === 0) return null;

  const kind = value.kind === 'quiz' ? 'quiz' : 'checklist';
  const maxScore = typeof value.maxScore === 'number' && Number.isFinite(value.maxScore)
    ? value.maxScore
    : questions.reduce((sum, question) => sum + (question.points ?? 1), 0);

  return {
    id,
    moduleId,
    title,
    prompt,
    kind,
    questions,
    maxScore,
    createdAt: asString(value.createdAt) ?? new Date(0).toISOString(),
    updatedAt: asString(value.updatedAt) ?? new Date(0).toISOString(),
  };
};

const collectRemoteRecords = (payload: unknown): Record<string, LearningProgressRecord> => {
  const unwrapped = unwrapResponsePayload(payload);
  if (Array.isArray(unwrapped)) {
    return unwrapped.reduce<Record<string, LearningProgressRecord>>((result, item) => {
      const record = normalizeRemoteRecord(item);
      if (record) result[record.moduleId] = record;
      return result;
    }, {});
  }

  if (!isRecord(unwrapped)) return {};

  const nested = unwrapped.records ?? unwrapped.progress ?? unwrapped.items ?? unwrapped.record;
  if (Array.isArray(nested)) return collectRemoteRecords(nested);
  if (isRecord(nested)) {
    return Object.entries(nested).reduce<Record<string, LearningProgressRecord>>((result, [moduleId, value]) => {
      const record = normalizeRemoteRecord(value, moduleId);
      if (record) result[record.moduleId] = record;
      return result;
    }, {});
  }

  const single = normalizeRemoteRecord(unwrapped);
  return single ? { [single.moduleId]: single } : {};
};

const remoteStatus = (error: unknown): number | undefined => {
  if (!isRecord(error)) return undefined;
  const response = error.response;
  return isRecord(response) && typeof response.status === 'number' ? response.status : undefined;
};

const canTryAlternateEndpoint = (error: unknown): boolean => {
  const status = remoteStatus(error);
  return status === 404 || status === 405 || status === 501;
};

const requestWithFallback = async <T>(requests: Array<() => Promise<T>>): Promise<T> => {
  let lastError: unknown;
  for (let index = 0; index < requests.length; index += 1) {
    try {
      return await requests[index]();
    } catch (error) {
      lastError = error;
      if (!canTryAlternateEndpoint(error) || index === requests.length - 1) break;
    }
  }
  throw lastError;
};

const toWritePayload = (record: LearningProgressRecord) => ({
  status: record.status === 'in_progress' ? 'started' : record.status,
  lastStep: record.currentStep,
  checkpointState: record.status === 'not_started'
    ? 'not_started'
    : record.checkpoint.correct === true
      ? 'passed'
      : record.checkpoint.answered
        ? 'failed'
        : 'in_progress',
});

export interface LearningProgressAdapter {
  load: () => Promise<LearningProgressSnapshot>;
  loadCheckpoint: (moduleId: string) => Promise<LessonCheckpoint | null>;
  save: (record: LearningProgressRecord) => Promise<LearningProgressWriteResult>;
  submitCheckpoint: (
    submission: LearningCheckpointSubmission,
    fallbackRecord: LearningProgressRecord,
  ) => Promise<LearningCheckpointResult>;
}

export const createLearningProgressAdapter = (): LearningProgressAdapter => {
  const checkpointCache = new Map<string, LessonCheckpoint | null>();

  return {
    async load() {
    const localRecords = readLearningProgressRecords();

    try {
      const response = await requestWithFallback([
        () => apiClient.get(LEARNING_PROGRESS_ENDPOINT),
        () => apiClient.get('/lessons/progress'),
      ]);
      const remoteRecords = collectRemoteRecords(response.data);
      const records = { ...localRecords, ...remoteRecords };
      writeLearningProgressRecords(records);
      return { records, source: 'remote' as const };
    } catch {
      return { records: localRecords, source: 'local' as const };
    }
    },

    async loadCheckpoint(moduleId) {
      if (checkpointCache.has(moduleId)) return checkpointCache.get(moduleId) ?? null;

      try {
        const response = await requestWithFallback([
          () => apiClient.get(LEARNING_CHECKPOINT_ENDPOINT(moduleId)),
        ]);
        const checkpoint = normalizeRemoteCheckpoint(response.data, moduleId);
        checkpointCache.set(moduleId, checkpoint);
        return checkpoint;
      } catch {
        checkpointCache.set(moduleId, null);
        return null;
      }
    },

  async save(record) {
    const payload = toWritePayload(record);

    try {
      const response = await requestWithFallback([
        () => apiClient.patch(`${LEARNING_PROGRESS_ENDPOINT}/${encodeURIComponent(record.moduleId)}`, payload),
        () => apiClient.put(`${LEARNING_PROGRESS_ENDPOINT}/${encodeURIComponent(record.moduleId)}`, payload),
        () => apiClient.patch(LEARNING_PROGRESS_ENDPOINT, payload),
        () => apiClient.post(LEARNING_PROGRESS_ENDPOINT, payload),
      ]);
      const returned = collectRemoteRecords(response.data)[record.moduleId]
        ?? normalizeRemoteRecord(unwrapResponsePayload(response.data), record.moduleId);
      const persisted = returned
        ? mergeLearningProgressRecord(record, returned)
        : record;
      const records = readLearningProgressRecords();
      records[record.moduleId] = persisted;
      writeLearningProgressRecords(records);
      return { record: persisted, source: 'remote' as const };
    } catch {
      const records = readLearningProgressRecords();
      records[record.moduleId] = record;
      writeLearningProgressRecords(records);
      return { record, source: 'local' as const };
    }
  },

    async submitCheckpoint(submission, fallbackRecord) {
      const checkpoint = submission.checkpointId
        ? await this.loadCheckpoint(submission.moduleId)
        : await this.loadCheckpoint(submission.moduleId);
      const remoteCheckpointId = submission.checkpointId ?? checkpoint?.id;
      const questionId = submission.questionId
        ?? (checkpoint?.questions.length === 1 ? checkpoint.questions[0].id : undefined);
      const question = checkpoint?.questions.find((candidate) => candidate.id === questionId);
      const answerValue = submission.answerValue !== undefined
        ? submission.answerValue
        : question?.type === 'checklist'
          ? submission.correct ?? false
          : submission.answer;

      const canSubmitRemotely = Boolean(remoteCheckpointId && questionId && answerValue !== undefined);

      if (canSubmitRemotely) {
        try {
          const response = await requestWithFallback([
            () => apiClient.post(LEARNING_CHECKPOINT_SUBMIT_ENDPOINT(submission.moduleId), {
              checkpointId: remoteCheckpointId,
              answers: { [questionId as string]: answerValue },
              lastStep: submission.currentStep,
            }),
          ]);
          const responsePayload = unwrapResponsePayload(response.data);
          const responseObject = isRecord(responsePayload) ? responsePayload : {};
          const resultObject = isRecord(responseObject.result) ? responseObject.result : {};
          const responseRecord = normalizeRemoteRecord(responseObject.progress, submission.moduleId)
            ?? collectRemoteRecords(response.data)[submission.moduleId]
            ?? normalizeRemoteRecord(responsePayload, submission.moduleId);
          const persisted = responseRecord
            ? createLearningProgressRecord(submission.moduleId, {
              ...fallbackRecord,
              ...responseRecord,
              checkpoints: {
                ...fallbackRecord.checkpoints,
                ...responseRecord.checkpoints,
              },
              checkpoint: {
                ...fallbackRecord.checkpoint,
                ...responseRecord.checkpoint,
              },
            })
            : fallbackRecord;
          const serverCorrect = typeof resultObject.passed === 'boolean'
            ? resultObject.passed
            : persisted.checkpoint.correct === true;
          const score = typeof resultObject.score === 'number' ? resultObject.score : undefined;
          const feedback = asString(responseObject.feedback ?? responseObject.explanation ?? responseObject.message)
            ?? (score === undefined ? undefined : `Server-graded score: ${score}%.`);
          const records = readLearningProgressRecords();
          records[submission.moduleId] = persisted;
          writeLearningProgressRecords(records);
          return {
            record: persisted,
            source: 'remote' as const,
            correct: serverCorrect,
            feedback,
            score,
          };
        } catch (error) {
          if (!canTryAlternateEndpoint(error) && remoteStatus(error) !== undefined) {
            // Keep the local lesson usable when a checkpoint definition is not
            // compatible with this guided-step UI, but do not fabricate a
            // server score from the failed response.
          }
        }
      }

      const records = readLearningProgressRecords();
      records[submission.moduleId] = fallbackRecord;
      writeLearningProgressRecords(records);
      return {
        record: fallbackRecord,
        source: 'local' as const,
        correct: submission.correct ?? false,
        feedback: canSubmitRemotely
          ? 'The account checkpoint was unavailable, so this result was kept on this device.'
          : undefined,
      };
    },
  };
};
