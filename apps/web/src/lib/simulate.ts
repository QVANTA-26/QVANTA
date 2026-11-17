import type { Circuit } from '@qvanta/types';
import { apiClient } from '@/lib/api-client';

export interface SimulationResult {
  counts: Record<string, number>;
  shots: number;
  backend: string;
  blochVectors?: Array<{ x: number; y: number; z: number }>;
}

const POLL_INTERVAL_MS = 300;
const MAX_POLLS = 40;

interface SimulationResultPayload {
  counts?: Record<string, number>;
  shots?: number;
  backend?: string;
  blochVectors?: Array<{ x: number; y: number; z: number }>;
  per_qubit_bloch?: Array<{ x: number; y: number; z: number }>;
}

interface JobPayload extends SimulationResultPayload {
  job_id?: string;
  id?: string;
  status?: string;
  error?: string;
  result?: SimulationResultPayload;
}

/**
 * Submits an AST circuit to the simulator and polls until it finishes. This is
 * the same flow the circuit builder runs, packaged so Paper Lab can reuse the
 * identical backend, shot accounting, and Bloch data.
 */
export async function runCircuitSimulation(
  circuit: Circuit,
  shots: number
): Promise<SimulationResult> {
  const safeShots = Math.max(1, Math.floor(shots));

  const res = await apiClient.post<JobPayload>('/simulations', {
    circuit_repr: { kind: 'json_ast', value: JSON.stringify(circuit) },
    backend: 'qiskit_aer',
    shots: safeShots,
  });

  let job = res.data;
  const jobId = job?.job_id ?? job?.id;

  let tries = 0;
  while (job?.status === 'queued' || job?.status === 'running') {
    if (!jobId || ++tries > MAX_POLLS) break;
    await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS));
    try {
      const polled = await apiClient
        .get<JobPayload>(`/simulate/jobs/${jobId}`)
        .catch(async () => apiClient.get<JobPayload>(`/simulations/${jobId}`));
      if (polled?.data) job = polled.data;
    } catch {
      break;
    }
  }

  if (job?.status === 'failed') {
    throw new Error(job.error ?? 'Simulation failed');
  }

  const result: SimulationResultPayload = job?.result ?? job ?? {};
  const counts: Record<string, number> = result.counts ?? {};
  const totalShots =
    Object.values(counts).reduce((sum, value) => sum + Number(value), 0) ||
    result.shots ||
    safeShots;
  const bloch = Array.isArray(result.blochVectors)
    ? result.blochVectors
    : Array.isArray(result.per_qubit_bloch)
      ? result.per_qubit_bloch
      : undefined;

  return {
    counts,
    shots: totalShots,
    backend: result.backend ?? 'qiskit_aer',
    ...(bloch ? { blochVectors: bloch } : {}),
  };
}
