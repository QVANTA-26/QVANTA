import type { Circuit, Gate, GateOp } from '@qvanta/types';

const MAX_TIMELINE_OPERATIONS = 64;

type QubitStateKind =
  | 'zero'
  | 'one'
  | 'plus'
  | 'minus'
  | 'superposition'
  | 'entangled'
  | 'measured'
  | 'unknown';

interface QubitState {
  kind: QubitStateKind;
  partner?: number;
  outcome?: 0 | 1;
}

export interface CircuitTutorAnalysis {
  timeline: string[];
  warnings: string[];
  finalState: string;
  followUpQuestion: string;
}

const initialState = (): QubitState => ({ kind: 'zero' });

const stateLabel = (state: QubitState): string => {
  switch (state.kind) {
    case 'zero':
      return '|0⟩';
    case 'one':
      return '|1⟩';
    case 'plus':
      return '|+⟩';
    case 'minus':
      return '|−⟩';
    case 'superposition':
      return 'superposition';
    case 'entangled':
      return state.partner === undefined ? 'entangled' : `entangled with q${state.partner}`;
    case 'measured':
      return state.outcome === undefined ? 'measured (0 or 1)' : `measured ${state.outcome}`;
    default:
      return 'unknown';
  }
};

const stateSnapshot = (states: QubitState[]): string =>
  states.map((state, qubit) => `q${qubit}=${stateLabel(state)}`).join(', ');

const isKnownOne = (state: QubitState): boolean =>
  state.kind === 'one' || (state.kind === 'measured' && state.outcome === 1);

const isKnownZero = (state: QubitState): boolean =>
  state.kind === 'zero' || (state.kind === 'measured' && state.outcome === 0);

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

const applySingleQubitGate = (gate: Gate, state: QubitState): QubitState => {
  switch (gate) {
    case 'H':
      if (state.kind === 'zero') return { kind: 'plus' };
      if (state.kind === 'one') return { kind: 'minus' };
      if (state.kind === 'plus') return { kind: 'zero' };
      if (state.kind === 'minus') return { kind: 'one' };
      return { kind: 'superposition' };
    case 'X':
      return applyX(state);
    case 'Y':
      if (state.kind === 'zero') return { kind: 'one' };
      if (state.kind === 'one') return { kind: 'zero' };
      return { kind: 'superposition' };
    case 'Z':
      if (state.kind === 'plus') return { kind: 'minus' };
      if (state.kind === 'minus') return { kind: 'plus' };
      return { ...state };
    default:
      return { ...state };
  }
};

const gateName = (op: GateOp): string => {
  if (op.gate === 'CNOT') {
    return `CNOT (control q${op.qubit} → target q${op.target ?? '?'})`;
  }
  return `${op.gate} on q${op.qubit}`;
};

const sortOperations = (operations: GateOp[]): GateOp[] =>
  operations
    .map((op, index) => ({ op, index }))
    .sort((a, b) => a.op.timestep - b.op.timestep || a.index - b.index)
    .map(({ op }) => op);

const measurementDescription = (state: QubitState): string => {
  if (isKnownZero(state)) return 'the result is deterministically 0';
  if (isKnownOne(state)) return 'the result is deterministically 1';
  if (state.kind === 'entangled') {
    return 'the sampled result is correlated with its entangled partner';
  }
  if (state.kind === 'plus' || state.kind === 'minus' || state.kind === 'superposition') {
    return 'the result is probabilistic; for |+⟩/|−⟩ it is roughly 50/50 between 0 and 1';
  }
  return 'the result is sampled from the current quantum state';
};

const followUpQuestion = (circuit: Circuit, hasMeasurement: boolean, states: QubitState[]): string => {
  const measuredQubits = (circuit.operations ?? [])
    .filter((op) => op.gate === 'Measure')
    .map((op) => op.qubit)
    .filter((qubit, index, values) => values.indexOf(qubit) === index)
    .sort((a, b) => a - b);

  if (!hasMeasurement) {
    return 'Prediction question: before adding a final Measure, what state or output distribution do you predict from the final snapshot, and which gate creates that outcome?';
  }

  const measured = measuredQubits.length ? measuredQubits.map((qubit) => `q${qubit}`).join(', ') : 'the measured qubits';
  const unresolved = states.some((state) => state.kind === 'plus' || state.kind === 'minus' || state.kind === 'superposition' || state.kind === 'entangled');
  return unresolved
    ? `Prediction question: before you run it, what bitstring(s) do you expect for ${measured}, and how does the timeline support that prediction?`
    : `Prediction question: before you run it, which result should appear for ${measured}, and why does the last gate before measurement determine it?`;
};

export function analyzeCircuit(circuit?: Circuit | null): CircuitTutorAnalysis {
  if (!circuit) {
    return {
      timeline: [],
      warnings: [],
      finalState: '',
      followUpQuestion: '',
    };
  }

  const safeQubitCount = Math.max(0, Math.floor(circuit.qubits));
  const states = Array.from({ length: safeQubitCount }, initialState);
  const warnings: string[] = [];
  const operations = sortOperations(circuit.operations ?? []);
  const measuredAt = new Map<number, number>();
  const timeline: string[] = [`Initial state: ${stateSnapshot(states)}.`];
  let hasMeasurement = false;
  let renderedOperations = 0;

  if (operations.length === 0) {
    warnings.push('No gates are placed yet, so there is no state evolution to explain.');
  }

  const addWarning = (warning: string) => {
    if (!warnings.includes(warning)) warnings.push(warning);
  };

  for (const op of operations) {
    if (renderedOperations >= MAX_TIMELINE_OPERATIONS) continue;

    const qubitValid = op.qubit >= 0 && op.qubit < safeQubitCount;
    const targetValid = op.target === undefined || (op.target >= 0 && op.target < safeQubitCount);
    if (op.timestep < 0 || op.timestep >= circuit.timesteps) {
      addWarning(`${gateName(op)} uses t=${op.timestep}, outside the declared timeline 0..${Math.max(0, circuit.timesteps - 1)}.`);
    }
    if (!qubitValid) {
      addWarning(`${gateName(op)} references q${op.qubit}, outside the valid qubit range q0..q${Math.max(0, safeQubitCount - 1)}.`);
    }
    if (op.gate === 'CNOT' && op.target === undefined) {
      addWarning(`CNOT at t=${op.timestep} is missing a target qubit.`);
    }
    if (op.gate === 'CNOT' && op.target !== undefined && op.qubit === op.target) {
      addWarning(`CNOT at t=${op.timestep} uses q${op.qubit} as both control and target; those roles must be different.`);
    }
    if (op.gate === 'CNOT' && !targetValid) {
      addWarning(`CNOT target q${op.target ?? '?'} at t=${op.timestep} is outside the valid qubit range q0..q${Math.max(0, safeQubitCount - 1)}.`);
    }
    if (!qubitValid || (op.gate === 'CNOT' && (!targetValid || op.target === undefined || op.target === op.qubit))) {
      timeline.push(`• t${op.timestep} · ${gateName(op)}: skipped because the operation is not valid for this circuit.`);
      renderedOperations += 1;
      continue;
    }

    const previous = states[op.qubit];
    if (measuredAt.has(op.qubit) && op.gate !== 'Measure') {
      addWarning(`q${op.qubit} receives ${op.gate} after measurement at t=${measuredAt.get(op.qubit)}; later gates act on the collapsed state.`);
    }

    if (op.gate === 'CNOT') {
      const target = op.target as number;
      const targetBefore = states[target];
      const controlBefore = states[op.qubit];
      let explanation: string;

      if (isKnownOne(controlBefore)) {
        states[target] = applyX(targetBefore);
        explanation = `control q${op.qubit} is 1, so the target flips`;
      } else if (isKnownZero(controlBefore)) {
        explanation = `control q${op.qubit} is 0, so the target stays unchanged`;
      } else {
        states[op.qubit] = { kind: 'entangled', partner: target };
        states[target] = { kind: 'entangled', partner: op.qubit };
        explanation = `control q${op.qubit} is not a single known bit, so the target follows its 0/1 branches and the pair becomes entangled`;
      }

      timeline.push(
        `• t${op.timestep} · ${gateName(op)}: ${stateLabel(controlBefore)} / ${stateLabel(targetBefore)} → ${stateLabel(states[op.qubit])} / ${stateLabel(states[target])}; ${explanation}.`,
      );
    } else if (op.gate === 'Measure') {
      hasMeasurement = true;
      measuredAt.set(op.qubit, op.timestep);
      const outcomeText = measurementDescription(previous);
      states[op.qubit] = previous.kind === 'zero'
        ? { kind: 'measured', outcome: 0 }
        : previous.kind === 'one'
          ? { kind: 'measured', outcome: 1 }
          : { kind: 'measured' };
      timeline.push(
        `• t${op.timestep} · Measure on q${op.qubit}: ${stateLabel(previous)} → ${stateLabel(states[op.qubit])}; measurement collapses the quantum state, and ${outcomeText}.`,
      );
    } else {
      const next = applySingleQubitGate(op.gate, previous);
      states[op.qubit] = next;
      const intuition = op.gate === 'H'
        ? 'H swaps computational-basis certainty for (or restores) a phase-sensitive superposition'
        : op.gate === 'X'
          ? 'X flips the computational bit when the state is |0⟩ or |1⟩'
          : op.gate === 'Y'
            ? 'Y flips the computational bit and adds a phase'
            : 'Z leaves computational-basis probabilities alone but changes relative phase';
      timeline.push(
        `• t${op.timestep} · ${gateName(op)}: ${stateLabel(previous)} → ${stateLabel(next)}; intuition: ${intuition}.`,
      );
    }

    renderedOperations += 1;
  }

  if (operations.length > MAX_TIMELINE_OPERATIONS) {
    timeline.push(`• … ${operations.length - MAX_TIMELINE_OPERATIONS} later operation(s) omitted from the teaching trace to keep the tutor response readable.`);
  }

  if (operations.some((op) => op.gate !== 'Measure') && !hasMeasurement) {
    addWarning('The circuit has quantum operations but no Measure gate, so it does not yet produce classical readout results.');
  }

  return {
    timeline,
    warnings,
    finalState: stateSnapshot(states),
    followUpQuestion: followUpQuestion(circuit, hasMeasurement, states),
  };
}
