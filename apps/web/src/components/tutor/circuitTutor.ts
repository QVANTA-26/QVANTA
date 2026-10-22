import type { Circuit, Gate, GateOp } from '@qvanta/types';

const MAX_TIMELINE_OPERATIONS = 64;

type QubitState = {
  kind: 'zero' | 'one' | 'plus' | 'minus' | 'superposition' | 'entangled' | 'measured';
  partner?: number;
  outcome?: 0 | 1;
};

export interface OfflineCircuitAnalysis {
  timeline: string[];
  warnings: string[];
  finalState: string;
  followUpQuestion: string;
}

const label = (state: QubitState): string => {
  switch (state.kind) {
    case 'zero': return '|0⟩';
    case 'one': return '|1⟩';
    case 'plus': return '|+⟩';
    case 'minus': return '|−⟩';
    case 'superposition': return 'superposition';
    case 'entangled': return state.partner === undefined ? 'entangled' : `entangled with q${state.partner}`;
    case 'measured': return state.outcome === undefined ? 'measured (0 or 1)' : `measured ${state.outcome}`;
    default: return 'unknown';
  }
};

const snapshot = (states: QubitState[]): string =>
  states.map((state, qubit) => `q${qubit}=${label(state)}`).join(', ');

const isZero = (state: QubitState): boolean =>
  state.kind === 'zero' || (state.kind === 'measured' && state.outcome === 0);

const isOne = (state: QubitState): boolean =>
  state.kind === 'one' || (state.kind === 'measured' && state.outcome === 1);

const applyX = (state: QubitState): QubitState => {
  if (state.kind === 'zero') return { kind: 'one' };
  if (state.kind === 'one') return { kind: 'zero' };
  if (state.kind === 'measured' && state.outcome !== undefined) {
    return { kind: 'measured', outcome: state.outcome === 0 ? 1 : 0 };
  }
  if (state.kind === 'plus') return { kind: 'plus' };
  if (state.kind === 'minus') return { kind: 'minus' };
  return { kind: 'superposition' };
};

const applyGate = (gate: Gate, state: QubitState): QubitState => {
  if (gate === 'H') {
    if (state.kind === 'zero') return { kind: 'plus' };
    if (state.kind === 'one') return { kind: 'minus' };
    if (state.kind === 'plus') return { kind: 'zero' };
    if (state.kind === 'minus') return { kind: 'one' };
    return { kind: 'superposition' };
  }
  if (gate === 'X') return applyX(state);
  if (gate === 'Y') {
    if (state.kind === 'zero') return { kind: 'one' };
    if (state.kind === 'one') return { kind: 'zero' };
    return { kind: 'superposition' };
  }
  if (gate === 'Z') {
    if (state.kind === 'plus') return { kind: 'minus' };
    if (state.kind === 'minus') return { kind: 'plus' };
  }
  return { ...state };
};

const operationName = (op: GateOp): string =>
  op.gate === 'CNOT'
    ? `CNOT (control q${op.qubit} → target q${op.target ?? '?'})`
    : `${op.gate} on q${op.qubit}`;

const sortedOperations = (operations: GateOp[]): GateOp[] =>
  operations
    .map((op, index) => ({ op, index }))
    .sort((a, b) => a.op.timestep - b.op.timestep || a.index - b.index)
    .map(({ op }) => op);

const measurementOutcome = (state: QubitState): string => {
  if (isZero(state)) return 'the result is deterministically 0';
  if (isOne(state)) return 'the result is deterministically 1';
  if (state.kind === 'entangled') return 'the sampled result is correlated with its entangled partner';
  if (state.kind === 'plus' || state.kind === 'minus' || state.kind === 'superposition') {
    return 'the result is probabilistic; for |+⟩/|−⟩ it is roughly 50/50 between 0 and 1';
  }
  return 'the result is sampled from the current quantum state';
};

export const analyzeOfflineCircuit = (circuit: Circuit): OfflineCircuitAnalysis => {
  const qubitCount = Math.max(0, Math.floor(circuit.qubits));
  const states: QubitState[] = Array.from({ length: qubitCount }, () => ({ kind: 'zero' }));
  const operations = sortedOperations(circuit.operations ?? []);
  const measuredAt = new Map<number, number>();
  const warnings: string[] = [];
  const timeline = [`Initial state: ${snapshot(states)}.`];
  let hasMeasurement = false;

  const addWarning = (warning: string) => {
    if (!warnings.includes(warning)) warnings.push(warning);
  };

  if (operations.length === 0) {
    warnings.push('No gates are placed yet, so there is no state evolution to explain.');
  }

  operations.slice(0, MAX_TIMELINE_OPERATIONS).forEach((op) => {
    const qubitValid = op.qubit >= 0 && op.qubit < qubitCount;
    const targetValid = op.target === undefined || (op.target >= 0 && op.target < qubitCount);
    if (op.timestep < 0 || op.timestep >= circuit.timesteps) {
      addWarning(`${operationName(op)} uses t=${op.timestep}, outside the declared timeline 0..${Math.max(0, circuit.timesteps - 1)}.`);
    }
    if (!qubitValid) {
      addWarning(`${operationName(op)} references q${op.qubit}, outside the valid qubit range q0..q${Math.max(0, qubitCount - 1)}.`);
    }
    if (op.gate === 'CNOT' && op.target === undefined) {
      addWarning(`CNOT at t=${op.timestep} is missing a target qubit.`);
    }
    if (op.gate === 'CNOT' && op.target !== undefined && op.qubit === op.target) {
      addWarning(`CNOT at t=${op.timestep} uses q${op.qubit} as both control and target; those roles must be different.`);
    }
    if (op.gate === 'CNOT' && !targetValid) {
      addWarning(`CNOT target q${op.target ?? '?'} at t=${op.timestep} is outside the valid qubit range q0..q${Math.max(0, qubitCount - 1)}.`);
    }
    if (!qubitValid || (op.gate === 'CNOT' && (!targetValid || op.target === undefined || op.target === op.qubit))) {
      timeline.push(`• t${op.timestep} · ${operationName(op)}: skipped because the operation is not valid for this circuit.`);
      return;
    }

    const before = states[op.qubit];
    if (measuredAt.has(op.qubit) && op.gate !== 'Measure') {
      addWarning(`q${op.qubit} receives ${op.gate} after measurement at t=${measuredAt.get(op.qubit)}; later gates act on the collapsed state.`);
    }

    if (op.gate === 'CNOT') {
      const target = op.target as number;
      const targetBefore = states[target];
      if (isOne(before)) {
        states[target] = applyX(targetBefore);
        timeline.push(`• t${op.timestep} · ${operationName(op)}: ${label(before)} / ${label(targetBefore)} → ${label(states[op.qubit])} / ${label(states[target])}; control q${op.qubit} is 1, so the target flips.`);
      } else if (isZero(before)) {
        timeline.push(`• t${op.timestep} · ${operationName(op)}: ${label(before)} / ${label(targetBefore)} → ${label(states[op.qubit])} / ${label(states[target])}; control q${op.qubit} is 0, so the target stays unchanged.`);
      } else {
        states[op.qubit] = { kind: 'entangled', partner: target };
        states[target] = { kind: 'entangled', partner: op.qubit };
        timeline.push(`• t${op.timestep} · ${operationName(op)}: ${label(before)} / ${label(targetBefore)} → ${label(states[op.qubit])} / ${label(states[target])}; the control's 0/1 branches make the pair entangled.`);
      }
      return;
    }

    if (op.gate === 'Measure') {
      hasMeasurement = true;
      measuredAt.set(op.qubit, op.timestep);
      states[op.qubit] = before.kind === 'zero'
        ? { kind: 'measured', outcome: 0 }
        : before.kind === 'one'
          ? { kind: 'measured', outcome: 1 }
          : { kind: 'measured' };
      timeline.push(`• t${op.timestep} · Measure on q${op.qubit}: ${label(before)} → ${label(states[op.qubit])}; measurement collapses the quantum state, and ${measurementOutcome(before)}.`);
      return;
    }

    const next = applyGate(op.gate, before);
    states[op.qubit] = next;
    const intuition = op.gate === 'H'
      ? 'H creates or removes a phase-sensitive superposition'
      : op.gate === 'X'
        ? 'X flips the computational bit when the state is |0⟩ or |1⟩'
        : op.gate === 'Y'
          ? 'Y flips the computational bit and adds a phase'
          : 'Z leaves computational-basis probabilities alone but changes relative phase';
    timeline.push(`• t${op.timestep} · ${operationName(op)}: ${label(before)} → ${label(next)}; intuition: ${intuition}.`);
  });

  if (operations.length > MAX_TIMELINE_OPERATIONS) {
    timeline.push(`• … ${operations.length - MAX_TIMELINE_OPERATIONS} later operation(s) omitted from the teaching trace to keep the tutor response readable.`);
  }
  if (operations.some((op) => op.gate !== 'Measure') && !hasMeasurement) {
    addWarning('The circuit has quantum operations but no Measure gate, so it does not yet produce classical readout results.');
  }

  const measuredQubits = operations
    .filter((op) => op.gate === 'Measure')
    .map((op) => op.qubit)
    .filter((qubit, index, values) => values.indexOf(qubit) === index)
    .sort((a, b) => a - b);
  const measured = measuredQubits.length ? measuredQubits.map((qubit) => `q${qubit}`).join(', ') : 'the measured qubits';
  const unresolved = states.some((state) => state.kind === 'plus' || state.kind === 'minus' || state.kind === 'superposition' || state.kind === 'entangled');
  const followUpQuestion = !hasMeasurement
    ? 'Prediction question: before adding a final Measure, what state or output distribution do you predict from the final snapshot, and which gate creates that outcome?'
    : unresolved
      ? `Prediction question: before you run it, what bitstring(s) do you expect for ${measured}, and how does the timeline support that prediction?`
      : `Prediction question: before you run it, which result should appear for ${measured}, and why does the last gate before measurement determine it?`;

  return {
    timeline,
    warnings,
    finalState: snapshot(states),
    followUpQuestion,
  };
};

export const buildOfflineCircuitReply = (question: string, circuit: Circuit): string => {
  const analysis = analyzeOfflineCircuit(circuit);
  const lower = question.toLowerCase();
  const teachingFocus = lower.includes('error') || lower.includes('wrong') || lower.includes('debug')
    ? 'I am checking validity first: control/target wiring, qubit indices, timeline bounds, and measurement placement.'
    : lower.includes('measure')
      ? 'Focus on the measurement steps: they convert the current quantum state into classical results and collapse the measured qubit.'
      : lower.includes('predict') || lower.includes('expect')
        ? 'Use the snapshots above to make your prediction before opening the simulator.'
        : 'Use each transition above as the reason for the next state; the circuit is a sequence, not just a bag of gates.';
  const warningBlock = analysis.warnings.length
    ? `Warnings to keep in mind:\n${analysis.warnings.map((warning) => `⚠️ ${warning}`).join('\n')}`
    : 'Warnings: none detected by the tutor pre-flight check.';

  return [
    `Attached circuit: ${circuit.qubits} qubits × ${circuit.timesteps} timesteps with ${circuit.operations.length} operation(s).`,
    'Circuit timeline (read left to right):',
    ...analysis.timeline,
    `Final intuitive snapshot: ${analysis.finalState || 'no qubit state available'}.`,
    warningBlock,
    `Teaching focus: ${teachingFocus}`,
    analysis.followUpQuestion,
  ].join('\n');
};
