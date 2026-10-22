import React from 'react';
import type { LessonCheckpoint } from '@qvanta/types';
import {
  createLearningProgressAdapter,
  createLearningProgressRecord,
  mergeLearningProgressRecord,
  progressRecordsToStatusMap,
  readLearningProgressRecords,
  writeLearningProgressRecords,
  type LearningCheckpointResult,
  type LearningCheckpointSubmission,
  type LearningProgressRecord,
  type LearningProgressSource,
  type LearningProgressStatus,
} from '@/lib/learning-progress';

export interface LearningProgressState {
  records: Record<string, LearningProgressRecord>;
  progress: Record<string, LearningProgressStatus>;
  loading: boolean;
  syncing: boolean;
  source: LearningProgressSource;
  totalXp: number;
  averageMastery: number;
  getRecord: (moduleId: string, initialStatus?: LearningProgressStatus) => LearningProgressRecord;
  loadCheckpoint: (moduleId: string) => Promise<LessonCheckpoint | null>;
  updateProgress: (moduleId: string, status: LearningProgressStatus) => Promise<LearningProgressRecord>;
  saveStep: (moduleId: string, currentStep: number) => Promise<LearningProgressRecord>;
  submitCheckpoint: (submission: LearningCheckpointSubmission) => Promise<LearningCheckpointResult>;
  completeModule: (moduleId: string, lastStep: number) => Promise<LearningProgressRecord>;
}

const clampStep = (step: number): number => Math.max(0, Math.floor(step));

export const useLearningProgress = (): LearningProgressState => {
  const adapter = React.useMemo(() => createLearningProgressAdapter(), []);
  const [records, setRecords] = React.useState<Record<string, LearningProgressRecord>>(
    readLearningProgressRecords,
  );
  const [loading, setLoading] = React.useState(true);
  const [syncing, setSyncing] = React.useState(false);
  const [source, setSource] = React.useState<LearningProgressSource>('local');

  const commitRecords = React.useCallback((nextRecords: Record<string, LearningProgressRecord>) => {
    setRecords(nextRecords);
    writeLearningProgressRecords(nextRecords);
  }, []);

  const refresh = React.useCallback(async () => {
    setLoading(true);
    const snapshot = await adapter.load();
    commitRecords(snapshot.records);
    setSource(snapshot.source);
    setLoading(false);
  }, [adapter, commitRecords]);

  React.useEffect(() => {
    void refresh();
  }, [refresh]);

  const getRecord = React.useCallback(
    (moduleId: string, initialStatus: LearningProgressStatus = 'not_started') => {
      return records[moduleId] ?? createLearningProgressRecord(moduleId, { status: initialStatus });
    },
    [records],
  );

  const loadCheckpoint = React.useCallback(
    (moduleId: string) => adapter.loadCheckpoint(moduleId),
    [adapter],
  );

  const persistRecord = React.useCallback(async (record: LearningProgressRecord) => {
    const optimisticRecords = { ...records, [record.moduleId]: record };
    commitRecords(optimisticRecords);
    setSyncing(true);

    try {
      const result = await adapter.save(record);
      const persistedRecords = { ...optimisticRecords, [record.moduleId]: result.record };
      commitRecords(persistedRecords);
      setSource(result.source);
      return result.record;
    } finally {
      setSyncing(false);
    }
  }, [adapter, commitRecords, records]);

  const updateProgress = React.useCallback(
    (moduleId: string, status: LearningProgressStatus) => {
      const current = getRecord(moduleId);
      return persistRecord(mergeLearningProgressRecord(current, {
        status,
        currentStep: status === 'completed' ? current.currentStep : current.currentStep,
      }));
    },
    [getRecord, persistRecord],
  );

  const saveStep = React.useCallback(
    (moduleId: string, currentStep: number) => {
      const current = getRecord(moduleId);
      return persistRecord(mergeLearningProgressRecord(current, {
        currentStep: clampStep(currentStep),
        status: current.status === 'completed' ? 'completed' : 'in_progress',
      }));
    },
    [getRecord, persistRecord],
  );

  const submitCheckpoint = React.useCallback(
    async (submission: LearningCheckpointSubmission): Promise<LearningCheckpointResult> => {
      const current = getRecord(submission.moduleId);
      const stepCheckpoint = current.checkpoints[submission.stepId] ?? current.checkpoint;
      const wasAlreadyCorrect = stepCheckpoint.correct === true;
      const nextCorrect = submission.correct ?? null;
      const nextMastery = nextCorrect === true
        ? Math.max(current.mastery, Math.round(((submission.currentStep + 1) / Math.max(1, submission.totalSteps)) * 100))
        : current.mastery;
      const optimisticRecord = mergeLearningProgressRecord(current, {
        status: current.status === 'completed' ? 'completed' : 'in_progress',
        currentStep: clampStep(submission.currentStep),
        mastery: nextMastery,
        xp: current.xp + (nextCorrect === true && !wasAlreadyCorrect ? 25 : 0),
        checkpoint: {
          answered: true,
          correct: nextCorrect,
          answerId: submission.answerId,
          attempts: current.checkpoint.attempts + 1,
          completedAt: nextCorrect === true ? new Date().toISOString() : undefined,
        },
        checkpoints: {
          ...current.checkpoints,
          [submission.stepId]: {
            answered: true,
            correct: nextCorrect,
            answerId: submission.answerId,
            attempts: stepCheckpoint.attempts + 1,
            completedAt: nextCorrect === true ? new Date().toISOString() : undefined,
          },
        },
      });

      const optimisticRecords = { ...records, [submission.moduleId]: optimisticRecord };
      commitRecords(optimisticRecords);
      setSyncing(true);

      try {
        const result = await adapter.submitCheckpoint(submission, optimisticRecord);
        const persistedRecord = result.source === 'remote'
          ? createLearningProgressRecord(submission.moduleId, {
            ...optimisticRecord,
            ...result.record,
            checkpoints: {
              ...optimisticRecord.checkpoints,
              ...result.record.checkpoints,
              [submission.stepId]: result.record.checkpoint,
            },
            checkpoint: result.record.checkpoint,
          })
          : result.record;
        const persistedRecords = { ...optimisticRecords, [submission.moduleId]: persistedRecord };
        commitRecords(persistedRecords);
        setSource(result.source);

        return {
          ...result,
          record: persistedRecord,
          xpAwarded: result.xpAwarded
            ?? (result.source === 'remote'
              ? Math.max(0, persistedRecord.xp - current.xp)
              : (nextCorrect === true && !wasAlreadyCorrect ? 25 : 0)),
        };
      } finally {
        setSyncing(false);
      }
    },
    [adapter, commitRecords, getRecord, records],
  );

  const completeModule = React.useCallback(
    (moduleId: string, lastStep: number) => {
      const current = getRecord(moduleId);
      const completionBonus = current.status === 'completed' ? 0 : 50;
      return persistRecord(mergeLearningProgressRecord(current, {
        status: 'completed',
        currentStep: clampStep(lastStep),
        mastery: 100,
        xp: current.xp + completionBonus,
      }));
    },
    [getRecord, persistRecord],
  );

  const progress = React.useMemo(() => progressRecordsToStatusMap(records), [records]);
  const totalXp = React.useMemo(
    () => Object.values(records).reduce((sum, record) => sum + record.xp, 0),
    [records],
  );
  const averageMastery = React.useMemo(() => {
    const values = Object.values(records).map((record) => record.mastery);
    return values.length === 0 ? 0 : Math.round(values.reduce((sum, value) => sum + value, 0) / values.length);
  }, [records]);

  return {
    records,
    progress,
    loading,
    syncing,
    source,
    totalXp,
    averageMastery,
    getRecord,
    loadCheckpoint,
    updateProgress,
    saveStep,
    submitCheckpoint,
    completeModule,
  };
};
