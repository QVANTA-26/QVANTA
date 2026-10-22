import type { LearningProgressRecord, LearningProgressSource, LearningProgressStatus } from '@/lib/learning-progress';
import { useLearningProgress } from './useLearningProgress';

export interface CurriculumProgressState {
  progress: Record<string, LearningProgressStatus>;
  records: Record<string, LearningProgressRecord>;
  loading: boolean;
  syncing: boolean;
  source: LearningProgressSource;
  totalXp: number;
  averageMastery: number;
  updateProgress: (moduleId: number, status: LearningProgressStatus) => Promise<LearningProgressRecord>;
}

export const useCurriculumProgress = (): CurriculumProgressState => {
  const learningProgress = useLearningProgress();

  return {
    progress: learningProgress.progress,
    records: learningProgress.records,
    loading: learningProgress.loading,
    syncing: learningProgress.syncing,
    source: learningProgress.source,
    totalXp: learningProgress.totalXp,
    averageMastery: learningProgress.averageMastery,
    updateProgress: (moduleId, status) => learningProgress.updateProgress(String(moduleId), status),
  };
};
