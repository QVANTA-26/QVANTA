import React from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Badge, Button, Card, CardContent, CardHeader, CardTitle, Input } from '@qvanta/ui';
import { useCurriculumProgress } from '@/hooks/useCurriculumProgress';
import CurriculumModuleDetail from '@/components/curriculum/CurriculumModuleDetail';
import {
  buildTutorHandoff,
  CURRICULUM,
  getModuleProgress,
  moduleContainsSearchText,
  type CurriculumModule,
  type CurriculumProgress,
} from '@/components/curriculum/curriculum';
import { saveCurriculumCircuitHandoff } from '@/lib/curriculum-circuit';

const TUTOR_PROMPT_KEY = 'qvanta.tutor.initialPrompt';
const TUTOR_MODULE_KEY = 'qvanta.tutor.initialModule';
const ALL_FILTER = 'all';

const progressLabels: Record<CurriculumProgress, string> = {
  not_started: 'Not started',
  in_progress: 'In progress',
  completed: 'Completed',
};

const progressDotClasses: Record<CurriculumProgress, string> = {
  not_started: 'bg-text-600',
  in_progress: 'bg-amber-400',
  completed: 'bg-emerald-400',
};

const IconCurriculum: React.FC<{ className?: string }> = ({ className }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.8"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
    aria-hidden="true"
  >
    <path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H20v16H6.5A2.5 2.5 0 0 0 4 21.5v-16Z" />
    <path d="M4 5.5v16M8 7h8M8 11h7M8 15h5" />
  </svg>
);

const CurriculumPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [search, setSearch] = React.useState('');
  const [partFilter, setPartFilter] = React.useState<string>(ALL_FILTER);
  const [levelFilter, setLevelFilter] = React.useState<string>(ALL_FILTER);
  const {
    progress,
    updateProgress: updateCurriculumProgress,
    totalXp,
    averageMastery,
    source: progressSource,
  } = useCurriculumProgress();
  const requestedModuleId = React.useMemo(() => {
    const value = Number(searchParams.get('module'));
    return Number.isInteger(value) && value >= 0 && CURRICULUM.modules.some((module) => module.id === value)
      ? value
      : null;
  }, [searchParams]);
  const [selectedModuleId, setSelectedModuleId] = React.useState<number | null>(
    () => requestedModuleId ?? CURRICULUM.modules[0]?.id ?? null
  );
  const filterKey = `${search}\u0000${partFilter}\u0000${levelFilter}`;
  const previousFilterKey = React.useRef(filterKey);

  const levels = React.useMemo(
    () => Array.from(new Set(CURRICULUM.modules.map((module) => module.level))),
    []
  );

  const filteredModules = React.useMemo(() => {
    return CURRICULUM.modules.filter((module) => {
      const matchesPart = partFilter === ALL_FILTER || String(module.partNumber) === partFilter;
      const matchesLevel = levelFilter === ALL_FILTER || module.level === levelFilter;
      return matchesPart && matchesLevel && moduleContainsSearchText(module, search);
    });
  }, [levelFilter, partFilter, search]);

  const selectedModule = React.useMemo(
    () => CURRICULUM.modules.find((module) => module.id === selectedModuleId) ?? null,
    [selectedModuleId]
  );
  const selectedSequenceIndex = selectedModule
    ? CURRICULUM.modules.findIndex((module) => module.id === selectedModule.id)
    : -1;

  React.useEffect(() => {
    if (previousFilterKey.current === filterKey) return;
    previousFilterKey.current = filterKey;
    setSelectedModuleId(filteredModules[0]?.id ?? null);
  }, [filterKey, filteredModules]);

  const updateProgress = React.useCallback((moduleId: number, value: CurriculumProgress) => {
    updateCurriculumProgress(moduleId, value);
  }, [updateCurriculumProgress]);

  React.useEffect(() => {
    if (requestedModuleId === null) return;
    if (CURRICULUM.modules.some((module) => module.id === requestedModuleId)) {
      setSelectedModuleId(requestedModuleId);
    }
  }, [requestedModuleId]);

  const selectModule = React.useCallback(
    (module: CurriculumModule) => {
      setSelectedModuleId(module.id);
      if (getModuleProgress(module, progress) === 'not_started') {
        updateProgress(module.id, 'in_progress');
      }
    },
    [progress, updateProgress]
  );

  const clearFilters = () => {
    setSearch('');
    setPartFilter(ALL_FILTER);
    setLevelFilter(ALL_FILTER);
  };

  const moveToSequenceModule = (offset: -1 | 1) => {
    if (!selectedModule || selectedSequenceIndex < 0) return;
    const nextModule = CURRICULUM.modules[selectedSequenceIndex + offset];
    if (nextModule) selectModule(nextModule);
  };

  const handoffToTutor = () => {
    if (!selectedModule) return;

    const handoff = buildTutorHandoff(selectedModule);
    const prompt = [
      `Let's study the module "${handoff.title}" together.`,
      handoff.description ? `Context: ${handoff.description}` : '',
      'Please guide me through this module step by step with interactive examples.',
    ]
      .filter(Boolean)
      .join(' ');

    try {
      sessionStorage.setItem(TUTOR_PROMPT_KEY, prompt);
      sessionStorage.setItem(TUTOR_MODULE_KEY, JSON.stringify(handoff));
    } catch {
      // Tutor still opens if sessionStorage is unavailable.
    }
    navigate('/tutor');
  };

  const openModuleCircuit = () => {
    if (!selectedModule) return;
    saveCurriculumCircuitHandoff(selectedModule);
    navigate(`/circuit/new?module=${selectedModule.id}`);
  };

  const completedCount = React.useMemo(
    () => CURRICULUM.modules.filter((module) => getModuleProgress(module, progress) === 'completed').length,
    [progress]
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-start">
        <div>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary-500/15 text-primary-300">
              <IconCurriculum className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-text-100">Full Curriculum</h1>
              <p className="mt-1 text-sm text-text-400">
                Follow the canonical QVANTA path from platform foundations to advanced quantum computing.
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2 sm:grid-cols-5 sm:gap-3">
          <div className="rounded-lg border border-bg-800 bg-bg-900 px-3 py-2 text-center">
            <div className="text-lg font-semibold text-text-100">{CURRICULUM.parts.length}</div>
            <div className="text-[11px] uppercase tracking-wide text-text-500">Parts</div>
          </div>
          <div className="rounded-lg border border-bg-800 bg-bg-900 px-3 py-2 text-center">
            <div className="text-lg font-semibold text-text-100">{CURRICULUM.modules.length}</div>
            <div className="text-[11px] uppercase tracking-wide text-text-500">Modules</div>
          </div>
          <div className="rounded-lg border border-bg-800 bg-bg-900 px-3 py-2 text-center">
            <div className="text-lg font-semibold text-emerald-300">{completedCount}</div>
            <div className="text-[11px] uppercase tracking-wide text-text-500">Completed</div>
          </div>
          <div className="rounded-lg border border-bg-800 bg-bg-900 px-3 py-2 text-center">
            <div className="text-lg font-semibold text-cyan-200">{averageMastery}%</div>
            <div className="text-[11px] uppercase tracking-wide text-text-500">Mastery</div>
          </div>
          <div className="rounded-lg border border-bg-800 bg-bg-900 px-3 py-2 text-center">
            <div className="text-lg font-semibold text-amber-200">{totalXp.toLocaleString()}</div>
            <div className="text-[11px] uppercase tracking-wide text-text-500">XP</div>
          </div>
        </div>
      </div>

      <details className="rounded-lg border border-bg-800 bg-bg-900/60 px-4 py-3 text-sm text-text-300">
        <summary className="cursor-pointer font-medium text-text-100">Source-backed curriculum</summary>
        <p className="mt-2 leading-6 text-text-400">
          This page renders the checked-in source directly: <code className="text-xs text-cyan-300">{CURRICULUM.source.filename}</code> · {CURRICULUM.source.title}. The source declares {CURRICULUM.source.claimedCounts.parts} parts and {CURRICULUM.source.claimedCounts.modules} modules. Progress is {progressSource === 'remote' ? 'synced to your account' : 'saved on this device'}.
        </p>
      </details>

      <Card>
        <CardHeader className="gap-4 pb-4">
          <div className="flex flex-col justify-between gap-3 md:flex-row md:items-end">
            <div>
              <CardTitle className="text-base">Find a module</CardTitle>
              <p className="mt-1 text-sm text-text-500">Search titles, section headings, and lesson content.</p>
            </div>
            <Badge variant="secondary">
              Showing {filteredModules.length.toLocaleString()} of {CURRICULUM.modules.length.toLocaleString()}
            </Badge>
          </div>
          <div className="grid gap-3 md:grid-cols-[minmax(0,1.6fr)_minmax(180px,0.7fr)_minmax(180px,0.7fr)]">
            <Input
              id="curriculum-search"
              label="Search curriculum"
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search module title or content..."
            />
            <label className="flex flex-col space-y-1.5 text-sm font-medium text-text-200" htmlFor="curriculum-part-filter">
              Part
              <select
                id="curriculum-part-filter"
                value={partFilter}
                onChange={(event) => setPartFilter(event.target.value)}
                className="flex h-10 w-full rounded-lg border border-bg-700 bg-bg-900 px-3 py-2 text-sm text-text-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 focus-visible:ring-offset-bg-950"
              >
                <option value={ALL_FILTER}>All parts</option>
                {CURRICULUM.parts.map((part) => (
                  <option key={part.number} value={String(part.number)}>
                    Part {part.number + 1} · {part.title}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex flex-col space-y-1.5 text-sm font-medium text-text-200" htmlFor="curriculum-level-filter">
              Level
              <select
                id="curriculum-level-filter"
                value={levelFilter}
                onChange={(event) => setLevelFilter(event.target.value)}
                className="flex h-10 w-full rounded-lg border border-bg-700 bg-bg-900 px-3 py-2 text-sm text-text-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 focus-visible:ring-offset-bg-950"
              >
                <option value={ALL_FILTER}>All levels</option>
                {levels.map((level) => (
                  <option key={level} value={level}>{level}</option>
                ))}
              </select>
            </label>
          </div>
        </CardHeader>
      </Card>

      <div className="grid gap-6 xl:grid-cols-[minmax(280px,0.85fr)_minmax(0,1.7fr)]">
        <Card className="min-h-0 overflow-hidden">
          <CardHeader className="border-b border-bg-800 pb-4">
            <div className="flex items-center justify-between gap-3">
              <CardTitle className="text-base">Modules</CardTitle>
              <span className="text-xs text-text-500">Select one to read</span>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {filteredModules.length > 0 ? (
              <div className="max-h-[calc(100vh-24rem)] min-h-[360px] overflow-y-auto">
                {filteredModules.map((module) => {
                  const moduleProgress = getModuleProgress(module, progress);
                  const isSelected = selectedModuleId === module.id;

                  return (
                    <button
                      key={module.id}
                      type="button"
                      onClick={() => selectModule(module)}
                      aria-current={isSelected ? 'true' : undefined}
                      className={`flex w-full items-start gap-3 border-b border-bg-800/80 px-4 py-3 text-left transition-colors last:border-b-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary-500 ${
                        isSelected ? 'bg-primary-500/10' : 'hover:bg-bg-800/70'
                      }`}
                    >
                      <span
                        className={`mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full ${progressDotClasses[moduleProgress]}`}
                        title={progressLabels[moduleProgress]}
                        aria-label={progressLabels[moduleProgress]}
                      />
                      <span className="min-w-0 flex-1">
                        <span className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] uppercase tracking-wide text-text-500">
                          <span>Module {module.id + 1}</span>
                          <span aria-hidden="true">·</span>
                          <span>{module.level}</span>
                        </span>
                        <span className="mt-1 block text-sm font-medium leading-5 text-text-100">{module.title}</span>
                        <span className="mt-1 block truncate text-xs text-text-500">Part {module.partNumber + 1} · {module.partTitle}</span>
                      </span>
                    </button>
                  );
                })}
              </div>
            ) : (
              <div className="flex min-h-[360px] flex-col items-center justify-center px-6 py-12 text-center">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-bg-800 text-text-400">
                  <span className="text-xl" aria-hidden="true">⌕</span>
                </div>
                <h3 className="mt-4 text-base font-semibold text-text-100">No modules match</h3>
                <p className="mt-2 max-w-xs text-sm leading-6 text-text-500">
                  Try a broader search or choose a different part or level. Your saved progress is kept.
                </p>
                <Button className="mt-4" variant="secondary" size="sm" onClick={clearFilters}>
                  Clear filters
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        <div className="min-w-0">
          {selectedModule && selectedSequenceIndex >= 0 ? (
            <CurriculumModuleDetail
              module={selectedModule}
              progress={progress}
              sequenceIndex={selectedSequenceIndex}
              sequenceTotal={CURRICULUM.modules.length}
              onProgressChange={updateProgress}
              onPrevious={() => moveToSequenceModule(-1)}
              onNext={() => moveToSequenceModule(1)}
              onTutor={handoffToTutor}
               onCircuit={openModuleCircuit}
              hasPrevious={selectedSequenceIndex > 0}
              hasNext={selectedSequenceIndex < CURRICULUM.modules.length - 1}
            />
          ) : (
            <Card className="flex min-h-[360px] items-center justify-center">
              <CardContent className="max-w-md pt-6 text-center">
                <h2 className="text-lg font-semibold text-text-100">Choose a module to begin</h2>
                <p className="mt-2 text-sm leading-6 text-text-500">
                  The selected module’s source content, prerequisite, checkpoint, and navigation will appear here.
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
};

export default CurriculumPage;
