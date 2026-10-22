import React from 'react';
import { Badge, Card, CardContent, CardHeader, CardTitle } from '@qvanta/ui';
import { apiClient } from '@/lib/api-client';
import type { TutorEvidence } from '@qvanta/types';

interface ProofCheck {
  id: string;
  label: string;
  passed: boolean;
  evidence: string;
}

interface ProofSuite {
  scope: string;
  checks: ProofCheck[];
  score: number;
  total: number;
}

interface TutorProofPanelProps {
  latestEvidence: TutorEvidence | null;
}

const modeLabel: Record<TutorEvidence['mode'], string> = {
  instant: 'O(1) instant card',
  grounded: 'grounded fallback',
  model: 'model + QVANTA context',
  offline: 'offline local tutor',
};

const TutorProofPanel: React.FC<TutorProofPanelProps> = ({ latestEvidence }) => {
  const [proof, setProof] = React.useState<ProofSuite | null>(null);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    let cancelled = false;
    const loadProof = async () => {
      try {
        const response = await apiClient.get<ProofSuite>('/tutor/proof');
        if (!cancelled) setProof(response.data);
      } catch {
        if (!cancelled) setProof(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    void loadProof();
    return () => { cancelled = true; };
  }, []);

  const liveChecks = latestEvidence
    ? [
        { label: 'Lesson sources attached', passed: latestEvidence.sources.length > 0, value: latestEvidence.sources.length ? `${latestEvidence.sources.length} source labels` : 'No source labels' },
        { label: 'Circuit trace available', passed: latestEvidence.circuitTraceSteps > 0, value: latestEvidence.circuitTraceSteps ? `${latestEvidence.circuitTraceSteps} gate steps` : 'No circuit attached' },
        { label: 'Prediction loop present', passed: latestEvidence.hasPredictionQuestion, value: latestEvidence.hasPredictionQuestion ? 'Question included' : 'No question detected' },
      ]
    : [];

  return (
    <Card className="border-cyan-500/20 bg-cyan-500/5">
      <CardHeader className="pb-3">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="font-mono-quantum text-[10px] uppercase tracking-[0.18em] text-cyan-300">Proof lab</p>
            <CardTitle className="pt-1 text-base">Why Quinn is built for quantum learning</CardTitle>
            <p className="mt-1 text-xs leading-5 text-text-500">Evidence over blanket claims: grounding, circuit reasoning, prediction, and fast-path latency.</p>
          </div>
          {proof && <Badge variant={proof.score === proof.total ? 'success' : 'warning'}>{proof.score}/{proof.total} checks</Badge>}
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {loading ? (
          <p className="text-xs text-text-500">Running the local capability proof…</p>
        ) : proof ? (
          <div className="grid gap-2 md:grid-cols-2">
            {proof.checks.map((check) => (
              <div key={check.id} className="rounded-lg border border-bg-700 bg-bg-950/50 p-3">
                <div className="flex items-start gap-2">
                  <span className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-xs ${check.passed ? 'bg-emerald-500/15 text-emerald-300' : 'bg-red-500/15 text-red-300'}`}>
                    {check.passed ? '✓' : '×'}
                  </span>
                  <div>
                    <p className="text-xs font-medium text-text-100">{check.label}</p>
                    <p className="mt-1 text-[11px] leading-5 text-text-500">{check.evidence}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-xs text-text-500">The proof endpoint is unavailable; send one message to generate live evidence locally.</p>
        )}

        {latestEvidence ? (
          <div className="rounded-xl border border-primary-500/20 bg-bg-950/60 p-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="font-mono-quantum text-[10px] uppercase tracking-[0.15em] text-primary-300">Latest response evidence</p>
              <span className="rounded-full border border-bg-700 bg-bg-900 px-2 py-1 text-[10px] text-text-300">{modeLabel[latestEvidence.mode]} · {latestEvidence.latencyMs} ms</span>
            </div>
            <div className="mt-3 grid gap-2 sm:grid-cols-3">
              {liveChecks.map((check) => (
                <div key={check.label} className="rounded-lg border border-bg-800 bg-bg-900/70 p-2.5">
                  <p className="text-[11px] text-text-500">{check.label}</p>
                  <p className={`mt-1 text-xs font-medium ${check.passed ? 'text-emerald-300' : 'text-text-300'}`}>{check.value}</p>
                </div>
              ))}
            </div>
            <p className="mt-3 text-[11px] leading-5 text-text-500">{latestEvidence.reason}</p>
          </div>
        ) : (
          <div className="rounded-lg border border-dashed border-bg-700 bg-bg-950/40 p-3 text-[11px] leading-5 text-text-500">
            Send a question with a lesson or circuit attached. The panel will show the actual sources, trace steps, prediction question, and response mode used.
          </div>
        )}

        <p className="text-[11px] leading-5 text-text-500">
          This proves QVANTA’s task-specific quantum-learning workflow. It does not claim universal superiority over every general-purpose model; a fair comparison should use the same prompts, circuit, rubric, and latency budget.
        </p>
      </CardContent>
    </Card>
  );
};

export default TutorProofPanel;
