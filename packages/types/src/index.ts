export type UserRole = 'student' | 'instructor' | 'admin' | 'org_admin';

export type UserTier = 'free' | 'pro' | 'institution';

export interface User {
  id: string;
  email: string;
  /** Chosen by the learner after sign-up; the UI falls back to the email local part. */
  displayName?: string;
  /** False until the learner confirms ownership of the mailbox; sign-in stays blocked until then. */
  emailVerified: boolean;
  googleId?: string;
  passwordHash?: string;
  role: UserRole;
  tier: UserTier;
  usageMonth: string;
  usageSims: number;
  avatarPreset: number;
  /** API-relative path of the uploaded profile photo, when one exists. */
  avatarUrl?: string;
  createdAt: string;
  stripeCustomerId?: string;
}

/**
 * Every gate id supported by the builder, simulator and API. Kept as a runtime
 * tuple so it can drive UI palettes, validation and serialization from a single
 * source of truth.
 */
export const GATE_IDS = [
  // Single-qubit, non-parametric
  'I',
  'H',
  'X',
  'Y',
  'Z',
  'S',
  'Sdg',
  'T',
  'Tdg',
  'SX',
  'SXdg',
  // Single-qubit, parameterized rotations
  'RX',
  'RY',
  'RZ',
  'P',
  // Two-qubit controlled / swap
  'CNOT',
  'CY',
  'CZ',
  'CH',
  'SWAP',
  'iSWAP',
  'CRX',
  'CRY',
  'CRZ',
  'CP',
  // Three-qubit
  'CCX',
  'CSWAP',
  'CCZ',
  // Non-unitary / annotation
  'Measure',
  'Barrier',
  'Reset',
] as const;

export type Gate = (typeof GATE_IDS)[number];

export interface GateOp {
  gate: Gate;
  qubit: number;
  timestep: number;
  /** Second qubit: CNOT-family target, or SWAP/Toffoli second control. */
  target?: number;
  /** Third qubit used by three-qubit gates (Toffoli/Fredkin/CCZ). */
  target2?: number;
  /** Rotation angle in radians for parameterized gates (RX/RY/RZ/P and controlled variants). */
  parameter?: number;
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
