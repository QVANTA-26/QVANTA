import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Badge, Button, Card, CardContent, CardHeader, CardTitle, Input } from '@qvanta/ui';
import type { PaperAnalysis } from '@qvanta/types';
import { apiClient } from '@/lib/api-client';
import { runCircuitSimulation } from '@/lib/simulate';
import { useCircuitStore } from '@/store/circuit';
import CircuitDiagram from '@/components/circuit/CircuitDiagram';
import PaperCircuitScene3D from '@/components/circuit/PaperCircuitScene3D';
import SimulationResults from '@/components/circuit/SimulationResults';

type InputMode = 'link' | 'pdf';

type SimStatus = 'idle' | 'loading' | 'done' | 'error';
type CircuitViewMode = '3d' | '2d';

/** Mirrors the server-side cap so oversized files never leave the browser. */
const MAX_PDF_BYTES = 6 * 1024 * 1024;
const DEFAULT_SHOTS = 1024;

const readFileAsBase64 = (file: File): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result ?? ''));
    reader.onerror = () => reject(new Error('The file could not be read. Try again.'));
    reader.readAsDataURL(file);
  });

const PaperLab: React.FC = () => {
  const navigate = useNavigate();

  const [mode, setMode] = React.useState<InputMode>('link');
  const [url, setUrl] = React.useState('');
  const [file, setFile] = React.useState<File | null>(null);
  const [analyzing, setAnalyzing] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [analysis, setAnalysis] = React.useState<PaperAnalysis | null>(null);
  const [activeIndex, setActiveIndex] = React.useState(0);
  const [circuitViewMode, setCircuitViewMode] = React.useState<CircuitViewMode>('3d');

  const [simStatus, setSimStatus] = React.useState<SimStatus>('idle');
  const [simError, setSimError] = React.useState<string | null>(null);
  const [simResult, setSimResult] = React.useState<{
    counts: Record<string, number>;
    shots: number;
    backend: string;
    blochVectors?: Array<{ x: number; y: number; z: number }>;
  } | null>(null);

  const circuits = analysis?.circuits ?? [];
  const activeCircuit = circuits[activeIndex] ?? null;

  const resetSimulation = React.useCallback(() => {
    setSimStatus('idle');
    setSimError(null);
    setSimResult(null);
  }, []);

  const handleAnalyze = React.useCallback(async () => {
    if (mode === 'link' && !url.trim()) {
      setError('Paste a link to a quantum research paper first.');
      return;
    }
    if (mode === 'pdf' && !file) {
      setError('Choose a PDF of the paper first.');
      return;
    }

    setAnalyzing(true);
    setError(null);
    setAnalysis(null);
    setActiveIndex(0);
    setCircuitViewMode('3d');
    resetSimulation();

    try {
      const body =
        mode === 'link'
          ? { url: url.trim() }
          : { pdfBase64: await readFileAsBase64(file as File) };

      const res = await apiClient.post<PaperAnalysis>('/papers/analyze', body, {
        timeout: 180_000,
      });
      setAnalysis(res.data);
    } catch (err: any) {
      const message =
        err?.response?.data?.error?.message ??
        err?.message ??
        'The paper could not be analysed.';
      setError(message);
    } finally {
      setAnalyzing(false);
    }
  }, [mode, url, file, resetSimulation]);

  const handleSelectCircuit = (index: number) => {
    setActiveIndex(index);
    setCircuitViewMode('3d');
    resetSimulation();
  };

  const handleSimulate = React.useCallback(async () => {
    if (!activeCircuit) return;
    setSimStatus('loading');
    setSimError(null);
    try {
      const result = await runCircuitSimulation(activeCircuit.circuit, DEFAULT_SHOTS);
      setSimResult(result);
      setSimStatus('done');
    } catch (err: any) {
      setSimStatus('error');
      setSimError(err?.response?.data?.error?.message ?? err?.message ?? 'Simulation failed');
    }
  }, [activeCircuit]);

  const handleOpenInBuilder = React.useCallback(() => {
    if (!activeCircuit) return;
    useCircuitStore.getState().load(activeCircuit.circuit);
    navigate('/circuit/new');
  }, [activeCircuit, navigate]);

  return (
    <div className="flex h-full flex-col gap-5">
      <div>
        <h1 className="text-2xl font-bold text-text-100">Paper Lab</h1>
        <p className="mt-1 max-w-2xl text-sm text-text-400">
          Paste a quantum research paper link or upload its PDF. QVANTA reads the circuits the paper
          describes, draws them, and lets you run them on the simulator.
        </p>
      </div>

      <Card>
        <CardHeader className="border-b border-bg-800">
          <CardTitle className="text-base">Add a paper</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4 pt-4">
          <div className="flex w-fit rounded-lg border border-bg-700 bg-bg-900/60 p-1">
            <Button
              variant={mode === 'link' ? 'primary' : 'ghost'}
              size="sm"
              onClick={() => setMode('link')}
            >
              Paper link
            </Button>
            <Button
              variant={mode === 'pdf' ? 'primary' : 'ghost'}
              size="sm"
              onClick={() => setMode('pdf')}
            >
              Upload PDF
            </Button>
          </div>

          {mode === 'link' ? (
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <Input
                type="url"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleAnalyze();
                }}
                placeholder="https://arxiv.org/abs/quant-ph/..."
                className="flex-1"
                aria-label="Research paper link"
              />
              <Button onClick={handleAnalyze} disabled={analyzing}>
                {analyzing ? 'Analysing…' : 'Analyse paper'}
              </Button>
            </div>
          ) : (
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <input
                type="file"
                accept="application/pdf"
                onChange={(e) => {
                  const selected = e.target.files?.[0] ?? null;
                  if (selected && selected.size > MAX_PDF_BYTES) {
                    setError('Please choose a PDF smaller than 6 MB.');
                    setFile(null);
                    return;
                  }
                  setError(null);
                  setFile(selected);
                }}
                className="flex-1 rounded-lg border border-bg-700 bg-bg-900/60 px-3 py-2 text-sm text-text-300 file:mr-3 file:rounded-md file:border-0 file:bg-bg-800 file:px-3 file:py-1.5 file:text-xs file:font-medium file:text-text-200"
                aria-label="Upload paper PDF"
              />
              <Button onClick={handleAnalyze} disabled={analyzing}>
                {analyzing ? 'Analysing…' : 'Analyse PDF'}
              </Button>
            </div>
          )}

          <p className="text-xs text-text-500">
            Some publishers block automated reads — if a link fails, download the PDF and upload it
            instead.
          </p>

          {error && (
            <div className="rounded-lg border border-red-900/50 bg-red-950/30 px-3 py-2 text-sm text-red-200">
              {error}
            </div>
          )}
        </CardContent>
      </Card>

      {analyzing && (
        <div className="flex flex-col items-center justify-center gap-3 py-12">
          <div className="h-9 w-9 animate-spin rounded-full border-2 border-bg-700 border-t-primary-500" />
          <p className="text-sm text-text-400">Reading the paper and lifting out its circuits…</p>
        </div>
      )}

      {analysis && !analyzing && (
        <div className="flex flex-col gap-4">
          <Card>
            <CardHeader className="border-b border-bg-800">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <CardTitle className="text-base">{analysis.title}</CardTitle>
                <Badge variant="secondary">
                  {circuits.length} circuit{circuits.length === 1 ? '' : 's'}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="flex flex-col gap-3 pt-4">
              {analysis.summary && (
                <div>
                  <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-cyan-300">
                    Paper overview
                  </p>
                  <p className="text-sm leading-6 text-text-300">{analysis.summary}</p>
                </div>
              )}
              {(analysis.keyTakeaways?.length ?? 0) > 0 && (
                <div className="rounded-lg border border-cyan-500/15 bg-cyan-500/[0.04] px-4 py-3">
                  <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-cyan-300">
                    Key takeaways
                  </p>
                  <ul className="flex flex-col gap-2">
                    {(analysis.keyTakeaways ?? []).map((takeaway, index) => (
                      <li key={index} className="flex gap-2 text-sm leading-5 text-text-300">
                        <span className="mt-[7px] h-1.5 w-1.5 shrink-0 rounded-full bg-cyan-400" />
                        <span>{takeaway}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {analysis.sourceUrl && (
                <a
                  href={analysis.sourceUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="w-fit text-xs text-cyan-300 underline-offset-2 hover:underline"
                >
                  {analysis.sourceUrl}
                </a>
              )}
              {analysis.warnings.length > 0 && (
                <ul className="flex flex-col gap-1 rounded-lg border border-amber-500/20 bg-amber-500/5 px-3 py-2 text-xs text-amber-200">
                  {analysis.warnings.map((warning, index) => (
                    <li key={index}>{warning}</li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>

          {circuits.length === 0 ? (
            <Card>
              <CardContent className="py-10 text-center text-sm text-text-400">
                No concrete quantum circuit could be identified in this paper. Try a paper that draws
                its circuits explicitly, or upload the PDF version.
              </CardContent>
            </Card>
          ) : (
            <div className="flex flex-col gap-4">
              <div className="flex flex-wrap gap-2">
                {circuits.map((circuit, index) => (
                  <Button
                    key={index}
                    variant={index === activeIndex ? 'primary' : 'secondary'}
                    size="sm"
                    onClick={() => handleSelectCircuit(index)}
                  >
                    {circuit.name}
                  </Button>
                ))}
              </div>

              {activeCircuit && (
                <Card className="overflow-hidden border-cyan-500/20 bg-[radial-gradient(circle_at_82%_20%,rgba(158,212,223,0.1),transparent_35%),#100c0e]">
                  <CardHeader className="flex-row flex-wrap items-start justify-between gap-3 space-y-0 border-b border-bg-800">
                    <div>
                      <p className="font-mono-quantum text-[10px] uppercase tracking-[0.18em] text-cyan-300">
                        Paper circuit
                      </p>
                      <CardTitle className="mt-1 text-base">{activeCircuit.name}</CardTitle>
                      {activeCircuit.description && (
                        <p className="mt-1 max-w-2xl text-xs leading-5 text-text-400">
                          {activeCircuit.description}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <Button size="sm" variant="secondary" onClick={handleOpenInBuilder}>
                        Open in Circuit Builder
                      </Button>
                      <Button size="sm" onClick={handleSimulate} disabled={simStatus === 'loading'}>
                        {simStatus === 'loading' ? 'Running…' : 'Simulate'}
                      </Button>
                    </div>
                  </CardHeader>

                  <CardContent className="p-0">
                    <div className="flex items-center justify-between border-b border-bg-800 px-4 py-2 sm:px-7">
                      <p className="text-xs text-text-400">Circuit view</p>
                      <div className="flex rounded-lg border border-bg-700 bg-bg-900/60 p-1">
                        <Button
                          variant={circuitViewMode === '3d' ? 'primary' : 'ghost'}
                          size="sm"
                          onClick={() => setCircuitViewMode('3d')}
                        >
                          3D
                        </Button>
                        <Button
                          variant={circuitViewMode === '2d' ? 'primary' : 'ghost'}
                          size="sm"
                          onClick={() => setCircuitViewMode('2d')}
                        >
                          2D
                        </Button>
                      </div>
                    </div>

                    {circuitViewMode === '3d' ? (
                      <PaperCircuitScene3D
                        circuit={activeCircuit.circuit}
                      />
                    ) : (
                      <div className="overflow-x-auto px-4 py-5 sm:px-7">
                        <CircuitDiagram
                          circuit={activeCircuit.circuit}
                          ariaLabel={`Circuit ${activeCircuit.name} extracted from ${analysis.title}`}
                        />
                      </div>
                    )}

                    <div className="border-t border-bg-800">
                      <SimulationResults
                        status={simStatus}
                        error={simError}
                        result={simResult}
                        emptyHint={
                          <p>
                            Click{' '}
                            <span className="rounded bg-bg-800 px-1 text-text-200">Simulate</span> to
                            run this paper circuit and see its measurement histogram.
                          </p>
                        }
                      />
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default PaperLab;
