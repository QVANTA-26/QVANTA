import fs from 'node:fs';
import path from 'node:path';
import { prisma } from '../lib/prisma';

interface CurriculumBlock {
  type: 'paragraph' | 'list' | 'pre' | 'code' | 'diagram';
  text?: string;
  items?: string[];
}

interface CurriculumModuleSeed {
  id: number;
  title: string;
  partTitle: string;
  level: string;
  prerequisite: string;
  checkpoint: string;
  sections: Array<{
    heading: string;
    content: CurriculumBlock[];
  }>;
}

interface CurriculumSeedFile {
  modules: CurriculumModuleSeed[];
}

const curriculumPath = path.resolve(
  __dirname,
  '../../../web/src/data/curriculum.json',
);

const blockToText = (block: CurriculumBlock): string => {
  if (block.type === 'list') return (block.items ?? []).join('\n');
  return block.text ?? '';
};

const moduleToMarkdown = (module: CurriculumModuleSeed): string => {
  const sections = module.sections.map((section) => {
    const content = section.content.map(blockToText).filter(Boolean).join('\n\n');
    return `## ${section.heading}\n\n${content}`;
  });

  return [
    `# ${module.title}`,
    `Part: ${module.partTitle}`,
    `Level: ${module.level}`,
    `Prerequisite: ${module.prerequisite}`,
    ...sections,
    `Checkpoint: ${module.checkpoint}`,
  ].filter(Boolean).join('\n\n');
};

const readCurriculum = (): CurriculumSeedFile | null => {
  try {
    const raw = fs.readFileSync(curriculumPath, 'utf8');
    const parsed = JSON.parse(raw) as CurriculumSeedFile;
    return Array.isArray(parsed.modules) ? parsed : null;
  } catch {
    return null;
  }
};

/**
 * Seeds the checked-in 527-module curriculum using stable numeric ids. Keeping
 * those ids aligned with the web curriculum lets progress sync work for both
 * the full curriculum and the guided Learn roadmap.
 */
export async function seedCurriculumModules(): Promise<number> {
  const curriculum = readCurriculum();
  if (!curriculum) return 0;

  const writes = curriculum.modules.map((module) => prisma.courseModule.upsert({
    where: { id: String(module.id) },
    create: {
      id: String(module.id),
      title: module.title,
      slug: `curriculum-${module.id}`,
      mdxContent: moduleToMarkdown(module),
      order: module.id,
      embedded: false,
    },
    update: {
      title: module.title,
      slug: `curriculum-${module.id}`,
      mdxContent: moduleToMarkdown(module),
      order: module.id,
    },
  }));

  await prisma.$transaction(writes);
  return curriculum.modules.length;
}
