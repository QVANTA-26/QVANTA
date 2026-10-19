import React from 'react';
import { Badge, Button, Card, CardContent, CardHeader, CardTitle } from '@qvanta/ui';
import {
  getModuleDescription,
  getModuleProgress,
  type CurriculumContentBlock,
  type CurriculumModule,
  type CurriculumProgress,
} from './curriculum';

interface CurriculumModuleDetailProps {
  module: CurriculumModule;
  progress: Record<string, CurriculumProgress>;
  sequenceIndex: number;
  sequenceTotal: number;
  onProgressChange: (moduleId: number, value: CurriculumProgress) => void;
  onPrevious: () => void;
  onNext: () => void;
  onTutor: () => void;
  hasPrevious: boolean;
  hasNext: boolean;
}

const renderContentBlock = (block: CurriculumContentBlock, index: number) => {
  if (block.type === 'paragraph') {
    return (
      <p key={`${block.type}-${index}`} className="leading-7 text-text-300">
        {block.text}
      </p>
    );
  }

  if (block.type === 'list') {
    const ListTag = block.ordered ? 'ol' : 'ul';
    return (
      <ListTag
        key={`${block.type}-${index}`}
        className={
          block.ordered
            ? 'list-decimal space-y-2 pl-6 leading-7 text-text-300 marker:text-primary-400'
            : 'list-disc space-y-2 pl-6 leading-7 text-text-300 marker:text-primary-400'
        }
      >
        {block.items.map((item, itemIndex) => (
          <li key={`${index}-${itemIndex}`}>{item}</li>
        ))}
      </ListTag>
    );
  }

  return (
    <pre
      key={`${block.type}-${index}`}
      className="overflow-x-auto rounded-lg border border-bg-700 bg-bg-950/80 p-4 font-mono text-xs leading-6 text-cyan-200"
      aria-label={block.type === 'diagram' ? 'Curriculum diagram' : 'Curriculum code or preformatted text'}
    >
      <code>{block.text}</code>
    </pre>
  );
};

const CurriculumModuleDetail: React.FC<CurriculumModuleDetailProps> = ({
  module,
  progress,
  sequenceIndex,
  sequenceTotal,
  onProgressChange,
  onPrevious,
  onNext,
  onTutor,
  hasPrevious,
  hasNext,
}) => {
  const moduleProgress = getModuleProgress(module, progress);
  const description = getModuleDescription(module);

  return (
    <Card className="overflow-hidden">
      <CardHeader className="border-b border-bg-800 bg-bg-900/80">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="primary">Module {sequenceIndex + 1} of {sequenceTotal}</Badge>
              <Badge variant="secondary">{module.level}</Badge>
            </div>
            <CardTitle className="mt-3 text-2xl leading-tight">{module.title}</CardTitle>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-text-400">{description}</p>
          </div>

          <div className="flex shrink-0 flex-wrap items-center gap-2">
            <label className="flex items-center gap-2 text-xs text-text-400" htmlFor="curriculum-module-progress">
              Progress
              <select
                id="curriculum-module-progress"
                value={moduleProgress}
                onChange={(event) => onProgressChange(module.id, event.target.value as CurriculumProgress)}
                className="h-9 rounded-md border border-bg-700 bg-bg-950 px-2 text-sm text-text-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
              >
                <option value="not_started">Not started</option>
                <option value="in_progress">In progress</option>
                <option value="completed">Completed</option>
              </select>
            </label>
            <Button size="sm" onClick={onTutor}>
              Discuss with AI Tutor
            </Button>
          </div>
        </div>

        <div className="mt-5 grid gap-3 text-sm sm:grid-cols-3">
          <div className="rounded-lg border border-bg-800 bg-bg-950/40 p-3">
            <div className="text-xs uppercase tracking-wide text-text-500">Part</div>
            <div className="mt-1 font-medium text-text-100">{module.partNumber + 1}. {module.partTitle}</div>
          </div>
          <div className="rounded-lg border border-bg-800 bg-bg-950/40 p-3 sm:col-span-2">
            <div className="text-xs uppercase tracking-wide text-text-500">Prerequisite</div>
            <div className="mt-1 font-medium text-text-100">{module.prerequisite}</div>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-8 pt-6">
        {module.sections.map((section, sectionIndex) => (
          <section key={`${module.id}-section-${sectionIndex}`} className="space-y-3">
            <h3 className="text-base font-semibold text-text-100">{section.heading}</h3>
            <div className="space-y-4">
              {section.content.map(renderContentBlock)}
            </div>
          </section>
        ))}

        <div className="rounded-lg border border-primary-500/30 bg-primary-500/10 p-4">
          <div className="text-xs font-semibold uppercase tracking-[0.16em] text-primary-300">Checkpoint</div>
          <p className="mt-2 text-sm leading-6 text-text-200">{module.checkpoint}</p>
        </div>

        <div className="flex flex-col gap-3 border-t border-bg-800 pt-5 sm:flex-row sm:items-center sm:justify-between">
          <Button variant="secondary" size="sm" onClick={onPrevious} disabled={!hasPrevious}>
            ← Previous module
          </Button>
          <span className="text-center text-xs text-text-500">
            Sequential curriculum · {sequenceIndex + 1} / {sequenceTotal}
          </span>
          <Button variant="secondary" size="sm" onClick={onNext} disabled={!hasNext}>
            Next module →
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default CurriculumModuleDetail;
