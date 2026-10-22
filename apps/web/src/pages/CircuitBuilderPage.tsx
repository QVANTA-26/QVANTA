import React from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { Button, Card, CardHeader, CardTitle, CardContent } from '@qvanta/ui';
import CircuitScene from '@/components/circuit/CircuitScene';
import BlochPanel from '@/components/circuit/BlochPanel';
import CodeEditorPanel, {
  type CodeEditorSharedState,
} from '@/components/circuit/CodeEditorPanel';
import SimulationResults from '@/components/circuit/SimulationResults';
import CircuitToolbar from '@/components/circuit/CircuitToolbar';
import { useUIStore } from '@/store/ui';
import { useCircuitStore } from '@/store/circuit';
import { circuitToQiskitCode } from '@/lib/circuit';
import {
  consumeAlgorithmCircuitHandoff,
  consumeCurriculumCircuitHandoff,
} from '@/lib/curriculum-circuit';

type TabKey = 'editor' | 'results';
type SimStatus = 'idle' | 'running' | 'done' | 'error';

const CircuitBuilderPage: React.FC = () => {
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const lite2DMode = useUIStore((s) => s.lite2DMode);
  const toggleLite2D = useUIStore((s) => s.toggleLite2D);

  const resetCircuit = useCircuitStore((s) => s.reset);
  const setQubits = useCircuitStore((s) => s.setQubits);
  const setTimesteps = useCircuitStore((s) => s.setTimesteps);
  const qubits = useCircuitStore((s) => s.qubits);
  const timesteps = useCircuitStore((s) => s.timesteps);
  const operations = useCircuitStore((s) => s.operations);

  const [tab, setTab] = React.useState<TabKey>('editor');
  const [simStatus, setSimStatus] = React.useState<
    'idle' | 'loading' | 'done' | 'error'
  >('idle');
  const [simError, setSimError] = React.useState<string | null>(null);
  const [simOutput, setSimOutput] = React.useState<{
    counts: Record<string, number>;
    shots: number;
    backend: string;
    blochVectors?: Array<{ x: number; y: number; z: number }>;
  } | null>(null);

  const initialCode = React.useMemo(
    () => circuitToQiskitCode({ qubits, timesteps, operations }),
    [qubits, timesteps, operations]
  );

  const [code, setCode] = React.useState<string>(initialCode);
  const [shots, setShots] = React.useState<number>(1024);
  const [editorStatus, setEditorStatus] = React.useState<SimStatus>('idle');
  const [editorErr, setEditorErr] = React.useState<string | null>(null);
  const [moduleContext, setModuleContext] = React.useState<{
    title: string;
    focus: string;
    prediction: string;
  } | null>(null);

  React.useEffect(() => {
    const algorithmHandoff = consumeAlgorithmCircuitHandoff();
    if (algorithmHandoff && (!searchParams.get('algorithm') || searchParams.get('algorithm') === algorithmHandoff.algorithmId)) {
      useCircuitStore.getState().load(algorithmHandoff.blueprint.circuit);
      setModuleContext({
        title: algorithmHandoff.algorithmTitle,
        focus: algorithmHandoff.blueprint.focus,
        prediction: algorithmHandoff.blueprint.prediction,
      });
      return;
    }

    const handoff = consumeCurriculumCircuitHandoff();
    if (handoff && (!searchParams.get('module') || searchParams.get('module') === String(handoff.moduleId))) {
      useCircuitStore.getState().load(handoff.blueprint.circuit);
      setModuleContext({
        title: handoff.moduleTitle,
        focus: handoff.blueprint.focus,
        prediction: handoff.blueprint.prediction,
      });
    }
    return () => {
      // Circuit state intentionally stays available while navigating between
      // the builder, tutor, and module handoff surfaces.
    };
  }, [id, searchParams]);

  const editorShared = React.useMemo<CodeEditorSharedState>(
    () => ({
      code,
      setCode,
      shots,
      setShots,
      status: editorStatus,
      setStatus: setEditorStatus,
      err: editorErr,
      setErr: setEditorErr,
      onStatusChange: (st, err) => {
        setSimStatus(st === 'running' ? 'loading' : (st as any));
        setSimError(err ?? null);
      },
      onResult: (r) => {
        setSimOutput(r);
      },
    }),
    [code, shots, editorStatus, editorErr]
  );

  return (
    <div className="flex h-full flex-col gap-4">
      <div className="flex flex-col justify-between gap-3 md:flex-row md:items-center">
        <div>
          <h1 className="text-2xl font-bold text-text-100">
            Circuit Builder
            {id ? (
              <span className="ml-2 text-sm font-normal text-text-500">
                #{id.slice(0, 8)}
              </span>
            ) : null}
          </h1>
          <p className="mt-1 text-sm text-text-400">
            Drag gates onto the 3D rails, or use the keyboard. Changes sync
            with the code editor in real time.
          </p>
          {moduleContext && (
            <div className="mt-3 max-w-2xl rounded-lg border border-cyan-500/20 bg-cyan-500/5 px-3 py-2 text-xs text-cyan-100">
              <span className="font-semibold text-cyan-200">Module circuit · {moduleContext.title}</span>
              <span className="mx-2 text-cyan-500/70">·</span>
              <span>{moduleContext.focus}</span>
              <p className="mt-1 text-cyan-100/70">{moduleContext.prediction}</p>
            </div>
          )}
        </div>
        <CircuitToolbar
          qubits={qubits}
          timesteps={timesteps}
          setQubits={setQubits}
          setTimesteps={setTimesteps}
          onReset={resetCircuit}
          lite2D={lite2DMode}
          onToggleLite2D={toggleLite2D}
        />
      </div>

      <div className="flex flex-1 flex-col gap-4">
        <Card className="flex min-h-[480px] flex-col">
          <CardHeader className="flex-row items-center justify-between gap-3 space-y-0 border-b border-bg-800 pb-3">
            <CardTitle className="text-base">
              {lite2DMode ? 'Circuit (2D Lite)' : '3D Circuit Scene'}
            </CardTitle>
            <div className="flex items-center gap-2 text-xs text-text-500">
              <span className="font-mono">
                {qubits} qubits × {timesteps} steps
              </span>
            </div>
          </CardHeader>
          <CardContent className="relative flex-1 p-0">
            <CircuitScene />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex-row items-center justify-between gap-4 space-y-0 border-b border-bg-800 pb-3">
            <div className="flex items-center gap-2">
              <Button
                variant={tab === 'editor' ? 'primary' : 'ghost'}
                size="sm"
                onClick={() => setTab('editor')}
              >
                Code Editor
              </Button>
              <Button
                variant={tab === 'results' ? 'primary' : 'ghost'}
                size="sm"
                onClick={() => setTab('results')}
              >
                Simulation Results
              </Button>
            </div>
            <div className="flex items-center gap-2">
              {simStatus === 'loading' && (
                <span className="text-xs text-text-400">
                  Running simulation…
                </span>
              )}
              {simStatus === 'error' && simError && (
                <span className="text-xs text-red-400">{simError}</span>
              )}
              <CodeEditorPanel variant="toolbar-only" shared={editorShared} />
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {tab === 'editor' ? (
              <CodeEditorPanel variant="full" shared={editorShared} />
            ) : (
              <SimulationResults
                status={simStatus}
                error={simError}
                result={simOutput}
              />
            )}
          </CardContent>
        </Card>

        <Card className="flex min-h-[480px] flex-col">
          <BlochPanel />
        </Card>
      </div>
    </div>
  );
};

export default CircuitBuilderPage;
