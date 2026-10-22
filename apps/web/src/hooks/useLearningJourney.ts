import React from 'react';
import type { LessonModule } from '@qvanta/types';
import { apiClient } from '@/lib/api-client';
import {
  createApiCatalog,
  createCurriculumCatalog,
  normalizeLearningProgress,
  type LearningCatalog,
  type LearningModule,
  type LearningModuleStatus,
} from '@/lib/learning';
import { useLearningProgress } from './useLearningProgress';

const normalizeLessonPayload = (payload: unknown): LessonModule[] => {
  if (Array.isArray(payload)) return payload as LessonModule[];
  if (!payload || typeof payload !== 'object') return [];
  const data = (payload as { data?: unknown }).data;
  return Array.isArray(data) ? (data as LessonModule[]) : [];
};

export interface LearningJourney {
  catalog: LearningCatalog;
  modules: LearningModule[];
  progress: Record<string, LearningModuleStatus>;
  progressRecords: ReturnType<typeof useLearningProgress>['records'];
  loading: boolean;
  remoteAvailable: boolean;
  progressSource: ReturnType<typeof useLearningProgress>['source'];
  progressSyncing: boolean;
  totalXp: number;
  averageMastery: number;
  updateProgress: (moduleId: string, status: LearningModuleStatus) => Promise<ReturnType<typeof useLearningProgress>['records'][string]>;
  saveStep: (moduleId: string, currentStep: number) => Promise<ReturnType<typeof useLearningProgress>['records'][string]>;
  submitCheckpoint: ReturnType<typeof useLearningProgress>['submitCheckpoint'];
  completeModule: (moduleId: string, lastStep: number) => Promise<ReturnType<typeof useLearningProgress>['records'][string]>;
  getProgress: (module: LearningModule) => LearningModuleStatus;
  getProgressRecord: (module: LearningModule) => ReturnType<typeof useLearningProgress>['records'][string];
}

/**
 * Loads the existing lessons API when it has content, then falls back to the
 * checked-in curriculum. Progress is shared with /curriculum so either page
 * can be used to continue a module without a dead end.
 */
export const useLearningJourney = (): LearningJourney => {
  const [catalog, setCatalog] = React.useState<LearningCatalog>(createCurriculumCatalog);
  const [loading, setLoading] = React.useState(true);
  const [remoteAvailable, setRemoteAvailable] = React.useState(false);
  const learningProgress = useLearningProgress();

  React.useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
        const response = await apiClient.get<LessonModule[] | { data?: LessonModule[] }>('/lessons');
        const modules = normalizeLessonPayload(response.data);
        if (!cancelled && modules.length > 0) {
          // The checked-in curriculum remains the canonical rich lesson
          // experience. The API catalog supplies persistence/RAG and can be
          // used as a fallback when the source curriculum is unavailable.
          setRemoteAvailable(true);
        }
      } catch {
        // The source-backed curriculum is the intentional offline/demo fallback.
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  const getProgress = React.useCallback(
    (module: LearningModule) => normalizeLearningProgress(learningProgress.progress, module),
    [learningProgress.progress],
  );

  const getProgressRecord = React.useCallback(
    (module: LearningModule) => learningProgress.getRecord(module.id, module.initialProgress),
    [learningProgress.getRecord],
  );

  return {
    catalog,
    modules: catalog.modules,
    progress: learningProgress.progress,
    progressRecords: learningProgress.records,
    loading: loading || learningProgress.loading,
    remoteAvailable,
    progressSource: learningProgress.source,
    progressSyncing: learningProgress.syncing,
    totalXp: learningProgress.totalXp,
    averageMastery: learningProgress.averageMastery,
    updateProgress: learningProgress.updateProgress,
    saveStep: learningProgress.saveStep,
    submitCheckpoint: learningProgress.submitCheckpoint,
    completeModule: learningProgress.completeModule,
    getProgress,
    getProgressRecord,
  };
};
