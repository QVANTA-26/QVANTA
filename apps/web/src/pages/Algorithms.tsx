import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Badge, Button, Card, CardContent, CardHeader, CardTitle } from '@qvanta/ui';
import AlgorithmVisualization from '@/components/algorithms/AlgorithmVisualization';
import {
  ALGORITHMS,
  buildAlgorithmTutorHandoff,
  type AlgorithmDefinition,
} from '@/data/algorithms';
import {
  CURRICULUM,
  getModuleDescription,
  moduleToSourceText,
} from '@/components/curriculum/curriculum';
import { saveAlgorithmCircuitHandoff } from '@/lib/curriculum-circuit';

const TUTOR_PROMPT_KEY = 'qvanta.tutor.initialPrompt';
const TUTOR_MODULE_KEY = 'qvanta.tutor.initialModule';

const difficultyVariant = (difficulty: AlgorithmDefinition['difficulty']): 'success' | 'warning' | 'secondary' => {
  if (difficulty === 'beginner') return 'success';
  if (difficulty === 'intermediate') return 'warning';
  return 'secondary';
};

const AlgorithmsPage: React.FC = () => {
  const navigate = useNavigate();
  const [selectedId, setSelectedId] = React.useState(ALGORITHMS[0]?.id ?? '');
  const [activeStage, setActiveStage] = React.useState(0);
  const [playing, setPlaying] = React.useState(true);

  const selectedAlgorithm = ALGORITHMS.find((algorithm) => algorithm.id === selectedId) ?? ALGORITHMS[0];

  React.useEffect(() => {
    if (!playing || !selectedAlgorithm) return undefined;
    const timer = window.setInterval(() => {
      setActiveStage((current) => (current + 1) % selectedAlgorithm.stages.length);
    }, 3600);
    return () => window.clearInterval(timer);
  }, [playing, selectedAlgorithm]);

  const selectAlgorithm = (algorithm: AlgorithmDefinition) => {
    setSelectedId(algorithm.id);
    setActiveStage(0);
    setPlaying(true);
  };

  const relatedModules = React.useMemo(() => {
    if (!selectedAlgorithm) return [];
    const terms = selectedAlgorithm.curriculumKeywords.map((term) => term.toLowerCase());
    return CURRICULUM.modules
      .map((module) => {
        const source = `${module.title} ${module.partTitle} ${module.prerequisite} ${moduleToSourceText(module)}`.toLowerCase();
        const score = terms.reduce((total, term) => total + (source.includes(term) ? 1 : 0), 0);
        return { module, score };
      })
      .filter(({ score }) => score > 0)
      .sort((a, b) => b.score - a.score || a.module.id - b.module.id)
      .slice(0, 4)
      .map(({ module }) => module);
  }, [selectedAlgorithm]);

  const askTutor = () => {
    if (!selectedAlgorithm) return;
    const handoff = buildAlgorithmTutorHandoff(selectedAlgorithm, activeStage);
    const stage = selectedAlgorithm.stages[activeStage] ?? selectedAlgorithm.stages[0];
    const prompt = [
      `Teach me ${selectedAlgorithm.name} like a real quantum-computing lesson.`,
      `Start with the stage “${stage?.headline ?? 'the first stage'}”.`,
      'Give me intuition, the circuit trace, one prediction question, and then let me test it.',
    ].join(' ');

    try {
      sessionStorage.setItem(TUTOR_PROMPT_KEY, prompt);
      sessionStorage.setItem(TUTOR_MODULE_KEY, JSON.stringify(handoff));
    } catch {
      // The tutor still opens without a session handoff.
    }
    navigate('/tutor');
  };

  const openCircuit = () => {
    if (!selectedAlgorithm) return;
    saveAlgorithmCircuitHandoff(selectedAlgorithm);
    navigate(`/circuit/new?algorithm=${selectedAlgorithm.id}`);
  };

  if (!selectedAlgorithm) {
    return <div className="text-sm text-text-400">No algorithms are available yet.</div>;
  }

  return (
    <div className="space-y-6 pb-10">
      <header className="relative overflow-hidden rounded-2xl border border-bg-800 bg-bg-900/80 shadow-lg">
        <div className="pointer-events-none absolute -right-24 -top-28 h-80 w-80 rounded-full bg-primary-600/15 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-40 left-1/3 h-80 w-80 rounded-full bg-cyan-500/10 blur-3xl" />
        <div className="relative grid gap-8 p-6 sm:p-8 lg:grid-cols-[minmax(0,1.2fr)_minmax(280px,0.8fr)] lg:items-end">
          <div>
            <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-[0.18em] text-primary-300">
              <span className="h-2 w-2 rounded-full bg-primary-300 shadow-[0_0_12px_rgba(216,173,150,0.9)]" />
              QVANTA Algorithm Lab
            </div>
            <h1 className="mt-4 max-w-3xl font-display text-3xl font-semibold tracking-tight text-text-50 sm:text-4xl">
              Algorithms you can see, predict, and run.
            </h1>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-text-400 sm:text-base">
              Go beyond names and complexity claims. Each algorithm has a moving 3D mechanism, a source-backed learning path, a prediction checkpoint, and a circuit you can open in the builder.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Button onClick={askTutor}>Ask Quinn to teach this</Button>
              <Button variant="secondary" onClick={openCircuit}>Open algorithm circuit</Button>
              <Button variant="ghost" onClick={() => navigate('/learn')}>Back to roadmap</Button>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2 text-xs sm:grid-cols-4 lg:grid-cols-2">
            <div className="rounded-xl border border-bg-700 bg-bg-950/55 p-3">
              <p className="text-text-500">Algorithms</p>
              <p className="mt-1 font-mono-quantum text-xl text-text-50">{ALGORITHMS.length}</p>
            </div>
            <div className="rounded-xl border border-bg-700 bg-bg-950/55 p-3">
              <p className="text-text-500">3D stages</p>
              <p className="mt-1 font-mono-quantum text-xl text-cyan-200">{selectedAlgorithm.stages.length}</p>
            </div>
            <div className="rounded-xl border border-bg-700 bg-bg-950/55 p-3">
              <p className="text-text-500">Evidence loop</p>
              <p className="mt-1 font-mono-quantum text-xl text-emerald-200">4×</p>
            </div>
            <div className="rounded-xl border border-bg-700 bg-bg-950/55 p-3">
              <p className="text-text-500">Fast tutor cards</p>
              <p className="mt-1 font-mono-quantum text-xl text-amber-200">O(1)*</p>
            </div>
          </div>
        </div>
        <div className="border-t border-bg-800/80 px-6 py-3 text-[11px] leading-5 text-text-500 sm:px-8">
          *O(1) refers to the fixed instant-card lookup path for supported prompts. Open-ended model reasoning still depends on input, output, retrieval, and model latency.
        </div>
      </header>

      <div className="grid gap-4 xl:grid-cols-[minmax(260px,0.64fr)_minmax(0,1.36fr)]">
        <Card className="h-fit overflow-hidden">
          <CardHeader className="border-b border-bg-800 pb-4">
            <CardTitle className="text-base">Algorithm index</CardTitle>
            <p className="text-xs leading-5 text-text-500">Choose a mechanism to inspect. The visualization and evidence update together.</p>
          </CardHeader>
          <CardContent className="space-y-2 p-3">
            {ALGORITHMS.map((algorithm) => {
              const selected = algorithm.id === selectedAlgorithm.id;
              return (
                <button
                  key={algorithm.id}
                  type="button"
                  onClick={() => selectAlgorithm(algorithm)}
                  aria-pressed={selected}
                  className={`w-full rounded-xl border p-4 text-left transition ${selected ? 'border-primary-500/50 bg-primary-500/10 shadow-lg shadow-primary-950/20' : 'border-transparent bg-bg-950/45 hover:border-bg-700 hover:bg-bg-800/70'}`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-mono-quantum text-[10px] uppercase tracking-[0.16em]" style={{ color: algorithm.accent }}>{algorithm.category}</p>
                      <h2 className="mt-2 text-sm font-semibold text-text-50">{algorithm.name}</h2>
                    </div>
                    <Badge variant={difficultyVariant(algorithm.difficulty)}>{algorithm.difficulty}</Badge>
                  </div>
                  <p className="mt-2 text-xs leading-5 text-text-400">{algorithm.summary}</p>
                </button>
              );
            })}
          </CardContent>
        </Card>

        <div className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-4">
            <div className="rounded-xl border border-bg-800 bg-bg-900/70 p-3">
              <p className="text-[11px] uppercase tracking-wide text-text-500">Classical</p>
              <p className="mt-1 text-xs leading-5 text-text-200">{selectedAlgorithm.classicalComplexity}</p>
            </div>
            <div className="rounded-xl border border-bg-800 bg-bg-900/70 p-3">
              <p className="text-[11px] uppercase tracking-wide text-text-500">Quantum</p>
              <p className="mt-1 text-xs leading-5 text-cyan-200">{selectedAlgorithm.quantumComplexity}</p>
            </div>
            <div className="rounded-xl border border-bg-800 bg-bg-900/70 p-3">
              <p className="text-[11px] uppercase tracking-wide text-text-500">Resources</p>
              <p className="mt-1 text-xs leading-5 text-text-200">{selectedAlgorithm.qubits}</p>
            </div>
            <div className="rounded-xl border border-bg-800 bg-bg-900/70 p-3">
              <p className="text-[11px] uppercase tracking-wide text-text-500">Why it matters</p>
              <p className="mt-1 text-xs leading-5 text-text-200">{selectedAlgorithm.whyItMatters}</p>
            </div>
          </div>

          <AlgorithmVisualization
            algorithm={selectedAlgorithm}
            activeStage={activeStage}
            playing={playing}
            onStageChange={(stage) => { setActiveStage(stage); setPlaying(false); }}
            onTogglePlaying={() => setPlaying((current) => !current)}
          />

          <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(260px,0.8fr)]">
            <Card>
              <CardHeader className="pb-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="font-mono-quantum text-[10px] uppercase tracking-[0.16em] text-cyan-300">Evidence loop</p>
                    <CardTitle className="pt-1 text-lg">A result is not enough</CardTitle>
                  </div>
                  <span className="rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2.5 py-1 text-[10px] text-emerald-200">predict → run → explain</span>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {[
                  ['01', 'Intuition', 'Quinn explains the algorithm in the language of the current stage.'],
                  ['02', 'Prediction', selectedAlgorithm.blueprint.prediction],
                  ['03', 'Circuit', 'Open the scaffold and inspect the gates on live 3D rails.'],
                  ['04', 'Reflection', 'The tutor reads the trace and asks what changed in the measured evidence.'],
                ].map(([number, title, body]) => (
                  <div key={number} className="flex gap-3 rounded-lg border border-bg-700 bg-bg-950/50 p-3">
                    <span className="font-mono-quantum text-xs text-primary-300">{number}</span>
                    <div>
                      <p className="text-sm font-medium text-text-100">{title}</p>
                      <p className="mt-1 text-xs leading-5 text-text-400">{body}</p>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="font-mono-quantum text-[10px] uppercase tracking-[0.16em] text-text-500">Source path</p>
                    <CardTitle className="pt-1 text-lg">Continue in curriculum</CardTitle>
                  </div>
                  <Badge variant="secondary">{relatedModules.length} matches</Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-2">
                {relatedModules.length > 0 ? relatedModules.map((module) => (
                  <button
                    key={module.id}
                    type="button"
                    onClick={() => navigate(`/curriculum?module=${module.id}`)}
                    className="w-full rounded-lg border border-bg-700 bg-bg-950/50 p-3 text-left transition hover:border-cyan-500/40 hover:bg-cyan-500/5"
                  >
                    <p className="text-sm font-medium text-text-100">{module.title}</p>
                    <p className="mt-1 line-clamp-2 text-xs leading-5 text-text-500">{getModuleDescription(module)}</p>
                  </button>
                )) : (
                  <p className="rounded-lg border border-dashed border-bg-700 p-4 text-xs leading-5 text-text-500">The source curriculum does not yet expose a matching module. Use the tutor handoff to keep studying this algorithm.</p>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AlgorithmsPage;
