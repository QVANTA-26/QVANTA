import type { LessonModule, LessonProgress } from '@qvanta/types';
import {
  CURRICULUM,
  getModuleDescription,
  moduleToSourceText,
  sectionToText,
  type CurriculumModule,
  type CurriculumPreBlock,
  type CurriculumProgress,
} from '@/components/curriculum/curriculum';

export type LearningModuleStatus = CurriculumProgress;
export type LearningModuleSource = 'curriculum' | 'api';
export type ModuleAccent = 'violet' | 'cyan' | 'fuchsia' | 'amber';

export interface LearningStep {
  id: string;
  eyebrow: string;
  title: string;
  body: string;
  takeaway: string;
  example?: string;
  checkpoint?: LearningCheckpoint;
}

export interface LearningCheckpointOption {
  id: string;
  label: string;
}

export interface LearningCheckpoint {
  id: string;
  question: string;
  options: LearningCheckpointOption[];
  correctOptionId: string;
  explanation: string;
}

export interface LearningModule {
  /** Stable source id. Canonical curriculum ids are numeric strings; API ids are opaque. */
  id: string;
  order: number;
  label: string;
  title: string;
  description: string;
  duration: string;
  accent: ModuleAccent;
  lessons: LearningStep[];
  source: LearningModuleSource;
  sourceModuleId?: number;
  visualKeys?: string[];
  initialProgress?: LearningModuleStatus;
}

export interface LearningCatalog {
  modules: LearningModule[];
  totalModules: number;
  source: LearningModuleSource;
}

export interface LearningTutorHandoff {
  id: string;
  title: string;
  description: string;
  lessonContext: {
    content: string;
    currentStep?: LearningStep;
    steps: LearningStep[];
  };
}

interface FeaturedPathDefinition {
  partTitle: string;
  label: string;
  accent: ModuleAccent;
  visualKeys: string[];
}

/**
 * The roadmap is a view over the canonical curriculum, not a second lesson
 * database. These entries only describe presentation order and visual art
 * direction; lesson copy always comes from curriculum.json.
 */
const FEATURED_PATH: FeaturedPathDefinition[] = [
  {
    partTitle: 'The Qubit and Quantum States',
    label: 'FOUNDATION',
    accent: 'violet',
    visualKeys: [
      'qubit-basics/qubit-as-bit',
      'qubit-basics/qubit-picture',
      'qubit-basics/first-experiment',
    ],
  },
  {
    partTitle: 'Single-Qubit Gates',
    label: 'BUILD',
    accent: 'cyan',
    visualKeys: [
      'quantum-gates/gates-as-actions',
      'quantum-gates/two-qubit-handshake',
      'quantum-gates/read-the-circuit',
    ],
  },
  {
    partTitle: 'The Bloch Sphere',
    label: 'VISUALIZE',
    accent: 'fuchsia',
    visualKeys: [
      'bloch-sphere/sphere-axes',
      'bloch-sphere/rotation',
      'bloch-sphere/measurement',
    ],
  },
  {
    partTitle: 'Early Quantum Algorithms',
    label: 'APPLY',
    accent: 'amber',
    visualKeys: [
      'quantum-algorithms/algorithm-recipe',
      'quantum-algorithms/grover-intuition',
      'quantum-algorithms/ship-a-circuit',
    ],
  },
];

const normalizeText = (value: string): string => value.replace(/\s+/g, ' ').trim();

const stripHeadingNumber = (heading: string): string =>
  heading.replace(/^\s*\d+[.)]\s*/, '').trim() || heading;

const getSectionTakeaway = (module: CurriculumModule, sectionIndex: number): string => {
  const section = module.sections[sectionIndex];
  if (!section) return getModuleDescription(module);

  const list = section.content.find((block) => block.type === 'list');
  if (list && list.items.length > 0) return normalizeText(list.items[0]);

  const paragraph = section.content.find((block) => block.type === 'paragraph');
  return normalizeText(paragraph?.text ?? getModuleDescription(module));
};

const getSectionExample = (module: CurriculumModule, sectionIndex: number): string | undefined => {
  const section = module.sections[sectionIndex];
  const pre = section?.content.find(
    (block): block is CurriculumPreBlock => block.type === 'pre' || block.type === 'code' || block.type === 'diagram',
  );
  return pre?.text?.trim() || undefined;
};

const CHECKPOINTS_BY_SCENE: Record<string, Omit<LearningCheckpoint, 'id'>> = {
  'qubit-basics/qubit-as-bit': {
    question: 'Before any gate is applied, which state does this qubit represent?',
    options: [
      { id: 'zero', label: '|0⟩ — a definite 0' },
      { id: 'plus', label: '|+⟩ — an even superposition' },
      { id: 'one', label: '|1⟩ — a definite 1' },
    ],
    correctOptionId: 'zero',
    explanation: 'The default state is |0⟩, the north pole of the Bloch sphere, until a gate changes it.',
  },
  'qubit-basics/qubit-picture': {
    question: 'What should you predict after applying H to |0⟩?',
    options: [
      { id: 'zero', label: 'It stays definitely 0' },
      { id: 'plus', label: 'It becomes |+⟩ with balanced outcomes' },
      { id: 'one', label: 'It becomes definitely 1' },
    ],
    correctOptionId: 'plus',
    explanation: 'The Hadamard gate moves |0⟩ to the equator: an equal chance of measuring 0 or 1.',
  },
  'qubit-basics/first-experiment': {
    question: 'Run H, then measure repeatedly. What pattern should the histogram approach?',
    options: [
      { id: 'balanced', label: 'About 50% 0 and 50% 1' },
      { id: 'zero', label: '100% 0 every time' },
      { id: 'one', label: '100% 1 every time' },
    ],
    correctOptionId: 'balanced',
    explanation: 'A measurement samples the superposition, so many shots reveal the balanced distribution.',
  },
  'quantum-gates/gates-as-actions': {
    question: 'What does the X gate do to a qubit in |0⟩?',
    options: [
      { id: 'flip', label: 'Flips it to |1⟩' },
      { id: 'same', label: 'Leaves it in |0⟩' },
      { id: 'measure', label: 'Measures it without changing the state' },
    ],
    correctOptionId: 'flip',
    explanation: 'X is the quantum analogue of a bit flip: it swaps the |0⟩ and |1⟩ basis states.',
  },
  'quantum-gates/two-qubit-handshake': {
    question: 'In a CNOT, what happens when the control qubit is 1?',
    options: [
      { id: 'flip-target', label: 'The target qubit flips' },
      { id: 'flip-control', label: 'Only the control qubit flips' },
      { id: 'nothing', label: 'Nothing changes on either rail' },
    ],
    correctOptionId: 'flip-target',
    explanation: 'CNOT conditionally flips the target when the control is 1; when it is 0, the target is unchanged.',
  },
  'quantum-gates/read-the-circuit': {
    question: 'What outcomes does an H + CNOT Bell-state circuit emphasize?',
    options: [
      { id: 'correlated', label: 'Correlated 00 and 11 results' },
      { id: 'all-four', label: 'All four two-bit results equally' },
      { id: 'single', label: 'Only 01 results' },
    ],
    correctOptionId: 'correlated',
    explanation: 'The linked rails create correlation, so the useful signal is the paired 00 / 11 pattern.',
  },
  'bloch-sphere/sphere-axes': {
    question: 'Which pole represents the computational basis state |0⟩?',
    options: [
      { id: 'north', label: 'The north pole on +Z' },
      { id: 'south', label: 'The south pole on −Z' },
      { id: 'equator', label: 'Any point on the equator' },
    ],
    correctOptionId: 'north',
    explanation: '|0⟩ is at +Z (the north pole); |1⟩ is at −Z (the south pole).',
  },
  'bloch-sphere/rotation': {
    question: 'Where does H move the |0⟩ vector in this visualization?',
    options: [
      { id: 'equator', label: 'From the north pole to the equator' },
      { id: 'south', label: 'Straight to the south pole' },
      { id: 'same', label: 'It does not move the vector' },
    ],
    correctOptionId: 'equator',
    explanation: 'Hadamard rotates the north-pole state to an equatorial superposition direction.',
  },
  'bloch-sphere/measurement': {
    question: 'What does an equatorial state suggest before measurement?',
    options: [
      { id: 'balanced', label: 'Neither 0 nor 1 is favored in this example' },
      { id: 'zero', label: 'The answer must be 0' },
      { id: 'one', label: 'The answer must be 1' },
    ],
    correctOptionId: 'balanced',
    explanation: 'The equator represents a balanced measurement distribution for this beginner example.',
  },
  'quantum-algorithms/algorithm-recipe': {
    question: 'Which order makes a compact quantum algorithm easy to reason about?',
    options: [
      { id: 'pipeline', label: 'Prepare → transform → measure' },
      { id: 'measure-first', label: 'Measure → prepare → transform' },
      { id: 'random', label: 'Apply gates in any order without a prediction' },
    ],
    correctOptionId: 'pipeline',
    explanation: 'A useful circuit gives each stage a job: prepare a state, transform it, then read the result.',
  },
  'quantum-algorithms/grover-intuition': {
    question: 'What is amplification trying to make more likely?',
    options: [
      { id: 'marked', label: 'The marked candidate' },
      { id: 'random', label: 'Every candidate equally' },
      { id: 'empty', label: 'No candidate at all' },
    ],
    correctOptionId: 'marked',
    explanation: 'Grover-style amplification increases the measurement chance of the marked answer.',
  },
  'quantum-algorithms/ship-a-circuit': {
    question: 'What makes a circuit result explainable to another learner?',
    options: [
      { id: 'evidence', label: 'A prediction, a circuit, and a measured histogram' },
      { id: 'gates-only', label: 'Only the gate names' },
      { id: 'answer-only', label: 'Only the final bit string' },
    ],
    correctOptionId: 'evidence',
    explanation: 'The prediction, circuit, and histogram form a small evidence loop that another learner can inspect.',
  },
};

const buildGenericCheckpoint = (step: Pick<LearningStep, 'id' | 'title' | 'takeaway'>): LearningCheckpoint => ({
  id: `${step.id}-checkpoint`,
  question: `What is the most useful prediction to carry forward from “${step.title}”?`,
  options: [
    { id: 'focus', label: `${step.title} is the idea being applied in this step.` },
    { id: 'classical-only', label: 'The step has no observable effect to test.' },
    { id: 'skip', label: 'The concept can be skipped until the end of the course.' },
  ],
  correctOptionId: 'focus',
  explanation: step.takeaway,
});

const buildStepCheckpoint = (
  step: Pick<LearningStep, 'id' | 'title' | 'takeaway'>,
  sceneKey?: string,
): LearningCheckpoint => {
  const sceneCheckpoint = sceneKey ? CHECKPOINTS_BY_SCENE[sceneKey] : undefined;
  return {
    id: `${step.id}-checkpoint`,
    ...(sceneCheckpoint ?? buildGenericCheckpoint(step)),
  };
};

const estimateDuration = (text: string, stepCount: number): string => {
  // The source has no duration field. Keep this a clearly derived display
  // estimate instead of pretending the API provides a measured duration.
  const minutes = Math.max(8, Math.min(45, Math.ceil(text.length / 650) + stepCount * 2));
  return `${minutes} min`;
};

const moduleToLearningModule = (
  module: CurriculumModule,
  definition: FeaturedPathDefinition,
  order: number,
): LearningModule => {
  const sections = module.sections.slice(0, 3);
  const lessons = sections.map((section, index) => {
    const step = {
      id: `${module.id}-section-${index + 1}`,
      eyebrow: `${String(index + 1).padStart(2, '0')} · ${module.partTitle}`,
      title: stripHeadingNumber(section.heading),
      body: sectionToText(section),
      takeaway: getSectionTakeaway(module, index),
      example: getSectionExample(module, index),
    };
    return {
      ...step,
      checkpoint: buildStepCheckpoint(step, definition.visualKeys[index]),
    };
  });
  const content = moduleToSourceText(module);

  return {
    id: String(module.id),
    order,
    label: definition.label,
    title: module.title,
    description: getModuleDescription(module),
    duration: estimateDuration(content, lessons.length),
    accent: definition.accent,
    lessons,
    source: 'curriculum',
    sourceModuleId: module.id,
    visualKeys: definition.visualKeys,
  };
};

const getFeaturedModuleForPart = (definition: FeaturedPathDefinition): CurriculumModule | undefined => {
  const part = CURRICULUM.parts.find((candidate) => candidate.title === definition.partTitle);
  const moduleId = part?.moduleIds[0];
  return moduleId === undefined ? undefined : CURRICULUM.modules.find((module) => module.id === moduleId);
};

export const selectFeaturedCurriculumModules = (): LearningModule[] =>
  FEATURED_PATH.flatMap((definition, index) => {
    const module = getFeaturedModuleForPart(definition);
    return module ? [moduleToLearningModule(module, definition, index + 1)] : [];
  });

const normalizeLessonProgress = (progress: LessonProgress | undefined): LearningModuleStatus => {
  if (progress === 'completed') return 'completed';
  if (progress === 'started') return 'in_progress';
  return 'not_started';
};

const apiAccent = (order: number): ModuleAccent => {
  const accents: ModuleAccent[] = ['violet', 'cyan', 'fuchsia', 'amber'];
  return accents[Math.max(0, order - 1) % accents.length];
};

const apiModuleToLearningModule = (module: LessonModule, index: number): LearningModule => {
  const content = module.content?.trim() || module.description?.trim() || '';
  const description = normalizeText(module.description || content).slice(0, 320);
  const title = module.title?.trim() || `Course module ${index + 1}`;
  const step: LearningStep = {
    id: `${module.id}-content`,
    eyebrow: `${String(index + 1).padStart(2, '0')} · COURSE MODULE`,
    title,
    body: content || description || 'This module is ready to explore with your tutor.',
    takeaway: description || 'Ask the tutor to connect this module to a small circuit.',
  };
  step.checkpoint = buildStepCheckpoint(step);

  return {
    id: module.id,
    order: module.order || index + 1,
    label: 'COURSE MODULE',
    title,
    description: description || 'Explore this course module with the QVANTA tutor.',
    duration: estimateDuration(content || description, 1),
    accent: apiAccent(module.order || index + 1),
    lessons: [step],
    source: 'api',
    initialProgress: normalizeLessonProgress(module.progress),
  };
};

export const adaptApiLessons = (modules: LessonModule[]): LearningModule[] =>
  modules
    .filter((module) => module && typeof module.id === 'string' && typeof module.title === 'string')
    .sort((a, b) => (a.order || 0) - (b.order || 0))
    .map(apiModuleToLearningModule);

export const createCurriculumCatalog = (): LearningCatalog => ({
  modules: selectFeaturedCurriculumModules(),
  totalModules: CURRICULUM.modules.length,
  source: 'curriculum',
});

export const createApiCatalog = (modules: LessonModule[]): LearningCatalog => ({
  modules: adaptApiLessons(modules),
  totalModules: modules.length,
  source: 'api',
});

export const normalizeLearningProgress = (
  progress: Record<string, LearningModuleStatus>,
  module: LearningModule,
): LearningModuleStatus => progress[module.id] ?? module.initialProgress ?? 'not_started';

export interface CurriculumProgressSummary {
  completed: number;
  started: number;
  total: number;
  percent: number;
}

export const summarizeCurriculumProgress = (
  progress: Record<string, CurriculumProgress>,
): CurriculumProgressSummary => {
  const completed = CURRICULUM.modules.filter((module) => progress[String(module.id)] === 'completed').length;
  const started = CURRICULUM.modules.filter((module) => {
    const status = progress[String(module.id)];
    return status === 'in_progress' || status === 'completed';
  }).length;
  const total = CURRICULUM.modules.length;

  return {
    completed,
    started,
    total,
    percent: Math.round((completed / Math.max(1, total)) * 100),
  };
};

export const learningProgressPercent = (
  status: LearningModuleStatus,
  currentStep = 0,
  totalSteps = 0,
): number => {
  if (status === 'completed') return 100;
  if (status !== 'in_progress' || totalSteps <= 0) return 0;
  return Math.round((Math.max(0, Math.min(currentStep, totalSteps)) / totalSteps) * 100);
};

export const buildLearningTutorHandoff = (
  module: LearningModule,
  lesson?: LearningStep,
): LearningTutorHandoff => {
  const currentStep = lesson ?? module.lessons[0];
  return {
    id: module.id,
    title: module.title,
    description: module.description,
    lessonContext: {
      content: module.lessons.map((step) => `${step.title}\n${step.body}`).join('\n\n'),
      currentStep,
      steps: module.lessons,
    },
  };
};
