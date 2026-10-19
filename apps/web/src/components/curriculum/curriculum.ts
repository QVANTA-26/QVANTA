import curriculumJson from '@/data/curriculum.json';

export type CurriculumProgress = 'not_started' | 'in_progress' | 'completed';

export interface CurriculumSource {
  filename: string;
  title: string;
  claimedCounts: {
    parts: number;
    modules: number;
  };
}

export interface CurriculumPart {
  number: number;
  title: string;
  moduleIds: number[];
}

export interface CurriculumParagraphBlock {
  type: 'paragraph';
  text: string;
}

export interface CurriculumListBlock {
  type: 'list';
  ordered: boolean;
  items: string[];
}

export interface CurriculumPreBlock {
  type: 'pre' | 'code' | 'diagram';
  text: string;
}

export type CurriculumContentBlock =
  | CurriculumParagraphBlock
  | CurriculumListBlock
  | CurriculumPreBlock;

export interface CurriculumSection {
  heading: string;
  content: CurriculumContentBlock[];
}

export interface CurriculumModule {
  id: number;
  title: string;
  partNumber: number;
  partTitle: string;
  level: string;
  prerequisite: string;
  sections: CurriculumSection[];
  checkpoint: string;
}

export interface CurriculumData {
  source: CurriculumSource;
  parts: CurriculumPart[];
  modules: CurriculumModule[];
}

export interface CurriculumTutorStep {
  id: string;
  title: string;
  body: string;
}

export interface CurriculumTutorLessonContext {
  content: string;
  currentStep?: CurriculumTutorStep;
  steps: CurriculumTutorStep[];
}

export interface CurriculumTutorHandoff {
  id: string;
  title: string;
  description: string;
  lessonContext: CurriculumTutorLessonContext;
}

export const CURRICULUM = curriculumJson as unknown as CurriculumData;
export const CURRICULUM_PROGRESS_KEY = 'qvanta.curriculum.progress';

const isProgressValue = (value: unknown): value is CurriculumProgress =>
  value === 'not_started' || value === 'in_progress' || value === 'completed';

export const readCurriculumProgress = (): Record<string, CurriculumProgress> => {
  if (typeof window === 'undefined') return {};

  try {
    const raw = window.localStorage.getItem(CURRICULUM_PROGRESS_KEY);
    if (!raw) return {};

    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return {};

    return Object.entries(parsed).reduce<Record<string, CurriculumProgress>>(
      (result, [moduleId, value]) => {
        if (isProgressValue(value)) result[moduleId] = value;
        return result;
      },
      {}
    );
  } catch {
    return {};
  }
};

export const getModuleProgress = (
  module: CurriculumModule,
  progress: Record<string, CurriculumProgress>
): CurriculumProgress => progress[String(module.id)] ?? 'not_started';

const blockToText = (block: CurriculumContentBlock): string => {
  if (block.type === 'list') return block.items.join('\n');
  return block.text;
};

export const sectionToText = (section: CurriculumSection): string =>
  section.content.map(blockToText).filter(Boolean).join('\n\n');

export const moduleToSourceText = (module: CurriculumModule): string =>
  module.sections
    .map((section) => `${section.heading}\n${sectionToText(section)}`)
    .join('\n\n');

export const getModuleDescription = (module: CurriculumModule): string => {
  for (const section of module.sections) {
    const paragraph = section.content.find((block): block is CurriculumParagraphBlock => block.type === 'paragraph');
    if (paragraph?.text.trim()) return paragraph.text;
  }
  return '';
};

export const buildTutorHandoff = (module: CurriculumModule): CurriculumTutorHandoff => {
  const steps = module.sections.map((section, index) => ({
    id: `${module.id}-section-${index + 1}`,
    title: section.heading,
    body: sectionToText(section),
  }));
  const description = getModuleDescription(module);

  return {
    id: String(module.id),
    title: module.title,
    description,
    lessonContext: {
      content: moduleToSourceText(module),
      currentStep: steps[0],
      steps,
    },
  };
};

export const moduleContainsSearchText = (module: CurriculumModule, query: string): boolean => {
  const normalizedQuery = query.trim().toLocaleLowerCase();
  if (!normalizedQuery) return true;

  if (
    module.title.toLocaleLowerCase().includes(normalizedQuery) ||
    module.partTitle.toLocaleLowerCase().includes(normalizedQuery) ||
    module.prerequisite.toLocaleLowerCase().includes(normalizedQuery)
  ) {
    return true;
  }

  return module.sections.some((section) => {
    if (section.heading.toLocaleLowerCase().includes(normalizedQuery)) return true;

    return section.content.some((block) => {
      if (block.type === 'list') {
        return block.items.some((item) => item.toLocaleLowerCase().includes(normalizedQuery));
      }
      return block.text.toLocaleLowerCase().includes(normalizedQuery);
    });
  });
};
