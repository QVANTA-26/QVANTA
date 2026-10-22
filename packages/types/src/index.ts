export type UserRole = 'student' | 'instructor' | 'admin' | 'org_admin';

export type UserTier = 'free' | 'pro' | 'institution';

export interface User {
  id: string;
  email: string;
  googleId?: string;
  passwordHash?: string;
  role: UserRole;
  tier: UserTier;
  usageMonth: string;
  usageSims: number;
  avatarPreset: number;
  createdAt: string;
  stripeCustomerId?: string;
}

export type Gate = 'H' | 'X' | 'Y' | 'Z' | 'CNOT' | 'Measure';

export interface GateOp {
  gate: Gate;
  qubit: number;
  timestep: number;
  target?: number;
}

export interface Circuit {
  id?: string;
  ownerId?: string;
  qubits: number;
  timesteps: number;
  operations: GateOp[];
  createdAt?: string;
}

export type SimulationJobStatus = 'queued' | 'running' | 'completed' | 'failed';

export interface SimulationResult {
  counts: Record<string, number>;
  statevector: Array<{ real: number; imag: number }>;
}

export interface SimulationJob {
  id: string;
  userId: string;
  status: SimulationJobStatus;
  backend: string;
  shots: number;
  circuitCode?: string;
  circuitQasm?: string;
  result?: SimulationResult;
  error?: string;
  createdAt: string;
  startedAt?: string;
  completedAt?: string;
}

export type TutorMessageRole = 'user' | 'assistant' | 'system';

export type TutorResponseMode = 'instant' | 'grounded' | 'model' | 'offline';

export interface TutorEvidence {
  mode: TutorResponseMode;
  latencyMs: number;
  sources: string[];
  circuitTraceSteps: number;
  warningCount: number;
  hasPredictionQuestion: boolean;
  reason: string;
}

export interface TutorMessage {
  id: string;
  conversationId: string;
  role: TutorMessageRole;
  content: string;
  ragContext?: string[];
  circuitContext?: Circuit;
  tutorEvidence?: TutorEvidence;
  createdAt: string;
}

export interface SubscriptionTier {
  tier: UserTier;
  name: string;
  description: string;
  simsPerMonth: number;
  maxShots: number;
  stripePriceId?: string;
}

export type LessonProgress = 'not_started' | 'started' | 'completed';

export type CheckpointState = 'not_started' | 'in_progress' | 'passed' | 'failed';

export type LessonCheckpointKind = 'checklist' | 'quiz';

export interface LessonModule {
  id: string;
  title: string;
  slug: string;
  description: string;
  content: string;
  order: number;
  progress?: LessonProgress;
  embedded?: boolean;
  createdAt: string;
}

export interface LessonProgressRecord {
  userId?: string;
  moduleId: string;
  status: LessonProgress;
  lastStep: number;
  mastery: number;
  xp: number;
  checkpointState: CheckpointState;
  checkpointScore?: number;
  checkpointAttempts: number;
  updatedAt: string;
  createdAt?: string;
  module?: Pick<LessonModule, 'id' | 'title' | 'slug' | 'order'>;
}

export type LessonCheckpointQuestionType =
  | 'checklist'
  | 'single_choice'
  | 'multiple_choice'
  | 'short_text';

export interface LessonCheckpointQuestion {
  id: string;
  prompt: string;
  type: LessonCheckpointQuestionType;
  options?: string[];
  points?: number;
}

export interface LessonCheckpoint {
  id: string;
  moduleId: string;
  title: string;
  prompt: string;
  kind: LessonCheckpointKind;
  questions: LessonCheckpointQuestion[];
  maxScore: number;
  createdAt: string;
  updatedAt: string;
}

export interface LessonCheckpointScore {
  score: number;
  earnedPoints: number;
  availablePoints: number;
  passed: boolean;
}

export interface Conversation {
  id: string;
  userId: string;
  title?: string;
  messages: TutorMessage[];
  circuitId?: string;
  createdAt: string;
  updatedAt: string;
}
