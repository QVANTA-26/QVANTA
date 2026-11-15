import type { Circuit, GateOp, Gate } from '@qvanta/types';
import { GATE_IDS } from '@qvanta/types';

export type GateGroup = 'pauli' | 'phase' | 'rotation' | 'controlled' | 'multi' | 'special';

export interface GateSpec {
  /** Canonical id used across the app and the simulator AST. */
  id: Gate;
  /** Short glyph shown on the 3D/2D block. */
  label: string;
  /** Human readable gate name. */
  name: string;
  group: GateGroup;
  /** Number of additional qubits the gate touches (0, 1 or 2). */
  targets: 0 | 1 | 2;
  /** Whether the gate carries a rotation angle (stored in radians). */
  parameter: boolean;
  /** Qiskit QuantumCircuit method name. */
  qiskit: string;
  /** OpenQASM style gate name (display/export). */
  qasm: string;
  color: string;
}

/**
 * Complete standard gate library. This single registry drives the palette,
 * 3D/2D rendering, Qiskit/QASM export, parsing and the simulator mapping.
 */
export const GATE_SPECS: Record<Gate, GateSpec> = {
  I: { id: 'I', label: 'I', name: 'Identity', group: 'pauli', targets: 0, parameter: false, qiskit: 'id', qasm: 'id', color: '#7d8b99' },
  H: { id: 'H', label: 'H', name: 'Hadamard', group: 'pauli', targets: 0, parameter: false, qiskit: 'h', qasm: 'h', color: '#8f102d' },
  X: { id: 'X', label: 'X', name: 'Pauli-X', group: 'pauli', targets: 0, parameter: false, qiskit: 'x', qasm: 'x', color: '#b76e79' },
  Y: { id: 'Y', label: 'Y', name: 'Pauli-Y', group: 'pauli', targets: 0, parameter: false, qiskit: 'y', qasm: 'y', color: '#d19b83' },
  Z: { id: 'Z', label: 'Z', name: 'Pauli-Z', group: 'pauli', targets: 0, parameter: false, qiskit: 'z', qasm: 'z', color: '#8aa58e' },
  S: { id: 'S', label: 'S', name: 'S phase', group: 'phase', targets: 0, parameter: false, qiskit: 's', qasm: 's', color: '#9fb3a4' },
  Sdg: { id: 'Sdg', label: 'S†', name: 'S-dagger', group: 'phase', targets: 0, parameter: false, qiskit: 'sdg', qasm: 'sdg', color: '#7f9384' },
  T: { id: 'T', label: 'T', name: 'T phase', group: 'phase', targets: 0, parameter: false, qiskit: 't', qasm: 't', color: '#c890aa' },
  Tdg: { id: 'Tdg', label: 'T†', name: 'T-dagger', group: 'phase', targets: 0, parameter: false, qiskit: 'tdg', qasm: 'tdg', color: '#a8748e' },
  SX: { id: 'SX', label: '√X', name: 'Square-root X', group: 'phase', targets: 0, parameter: false, qiskit: 'sx', qasm: 'sx', color: '#d8ad96' },
  SXdg: { id: 'SXdg', label: '√X†', name: 'Square-root X dagger', group: 'phase', targets: 0, parameter: false, qiskit: 'sxdg', qasm: 'sxdg', color: '#c49a84' },

  RX: { id: 'RX', label: 'RX', name: 'RX rotation', group: 'rotation', targets: 0, parameter: true, qiskit: 'rx', qasm: 'rx', color: '#c58c88' },
  RY: { id: 'RY', label: 'RY', name: 'RY rotation', group: 'rotation', targets: 0, parameter: true, qiskit: 'ry', qasm: 'ry', color: '#b98a86' },
  RZ: { id: 'RZ', label: 'RZ', name: 'RZ rotation', group: 'rotation', targets: 0, parameter: true, qiskit: 'rz', qasm: 'rz', color: '#a98a90' },
  P: { id: 'P', label: 'P', name: 'Phase gate', group: 'rotation', targets: 0, parameter: true, qiskit: 'p', qasm: 'u1', color: '#b08fa0' },

  CNOT: { id: 'CNOT', label: 'CNOT', name: 'Controlled-X', group: 'controlled', targets: 1, parameter: false, qiskit: 'cx', qasm: 'cx', color: '#d8ad96' },
  CY: { id: 'CY', label: 'CY', name: 'Controlled-Y', group: 'controlled', targets: 1, parameter: false, qiskit: 'cy', qasm: 'cy', color: '#c58c88' },
  CZ: { id: 'CZ', label: 'CZ', name: 'Controlled-Z', group: 'controlled', targets: 1, parameter: false, qiskit: 'cz', qasm: 'cz', color: '#8aa58e' },
  CH: { id: 'CH', label: 'CH', name: 'Controlled-H', group: 'controlled', targets: 1, parameter: false, qiskit: 'ch', qasm: 'ch', color: '#9fb3a4' },
  SWAP: { id: 'SWAP', label: 'SWAP', name: 'Swap', group: 'multi', targets: 1, parameter: false, qiskit: 'swap', qasm: 'swap', color: '#b76e79' },
  iSWAP: { id: 'iSWAP', label: 'iSWAP', name: 'iSwap', group: 'multi', targets: 1, parameter: false, qiskit: 'iswap', qasm: 'iswap', color: '#c890aa' },
  CRX: { id: 'CRX', label: 'CRX', name: 'Controlled-RX', group: 'controlled', targets: 1, parameter: true, qiskit: 'crx', qasm: 'crx', color: '#c58c88' },
  CRY: { id: 'CRY', label: 'CRY', name: 'Controlled-RY', group: 'controlled', targets: 1, parameter: true, qiskit: 'cry', qasm: 'cry', color: '#b98a86' },
  CRZ: { id: 'CRZ', label: 'CRZ', name: 'Controlled-RZ', group: 'controlled', targets: 1, parameter: true, qiskit: 'crz', qasm: 'crz', color: '#a98a90' },
  CP: { id: 'CP', label: 'CP', name: 'Controlled phase', group: 'controlled', targets: 1, parameter: true, qiskit: 'cp', qasm: 'cu1', color: '#b08fa0' },

  CCX: { id: 'CCX', label: 'CCX', name: 'Toffoli', group: 'multi', targets: 2, parameter: false, qiskit: 'ccx', qasm: 'ccx', color: '#e4d5cc' },
  CSWAP: { id: 'CSWAP', label: 'CSWAP', name: 'Fredkin', group: 'multi', targets: 2, parameter: false, qiskit: 'cswap', qasm: 'cswap', color: '#d19b83' },
  CCZ: { id: 'CCZ', label: 'CCZ', name: 'Doubly-controlled Z', group: 'multi', targets: 2, parameter: false, qiskit: 'ccz', qasm: 'ccz', color: '#8aa58e' },

  Measure: { id: 'Measure', label: 'M', name: 'Measure', group: 'special', targets: 0, parameter: false, qiskit: 'measure', qasm: 'measure', color: '#b94b5a' },
  Barrier: { id: 'Barrier', label: '⟂', name: 'Barrier', group: 'special', targets: 0, parameter: false, qiskit: 'barrier', qasm: 'barrier', color: '#756963' },
  Reset: { id: 'Reset', label: '|0⟩', name: 'Reset', group: 'special', targets: 0, parameter: false, qiskit: 'reset', qasm: 'reset', color: '#7d8b99' },
};

/** Palette order (mirrors the shared gate id list). */
export const GATE_ORDER: Gate[] = [...GATE_IDS];

export const AVAILABLE_GATES: Gate[] = GATE_ORDER;

export const getGateSpec = (gate: Gate): GateSpec => GATE_SPECS[gate];

/** Default additional qubits for a freshly placed gate. */
export function defaultTargets(gate: Gate, qubit: number, qubits: number): { target?: number; target2?: number } {
  const spec = GATE_SPECS[gate];
  if (spec.targets === 0 || qubits <= 1) return {};
  const target = (qubit + 1) % qubits;
  if (spec.targets === 1) return { target };
  let target2 = (qubit + 2) % qubits;
  if (target2 === target) target2 = (qubit + 3) % qubits;
  return { target, target2 };
}

const DEFAULT_ANGLE = Math.PI / 2;

const ANGLE_TOL = 1e-6;

/** Render a radians value as a readable multiple of pi (e.g. np.pi/2). */
export function formatAngle(radians: number): string {
  if (Math.abs(radians) < ANGLE_TOL) return '0';
  const ratio = radians / Math.PI;
  for (const den of [1, 2, 3, 4, 6, 8, 12]) {
    const num = ratio * den;
    if (Math.abs(num - Math.round(num)) < ANGLE_TOL) {
      const n = Math.round(num);
      const sign = n < 0 ? '-' : '';
      const absN = Math.abs(n);
      const numStr = absN === 1 ? '' : `${absN}*`;
      const denStr = den === 1 ? '' : `/${den}`;
      return `${sign}${numStr}np.pi${denStr}`;
    }
  }
  return radians.toFixed(6);
}

/** Parse an angle expression such as `np.pi/2`, `-3*pi/4` or `0.5`. */
export function parseAngleExpr(expr: string): number {
  let s = expr.trim();
  let sign = 1;
  while (s.startsWith('-') || s.startsWith('+')) {
    if (s.startsWith('-')) sign = -sign;
    s = s.slice(1).trim();
  }

  const piForms = ['np.pi', 'numpy.pi', 'math.pi', 'pi', 'PI', 'Pi'];
  for (const pi of piForms) {
    if (s === pi) return sign * Math.PI;
    if (s.startsWith(`${pi}*`)) {
      const coeff = s.slice(pi.length + 1).trim();
      return sign * Math.PI * Number(coeff);
    }
    if (s.startsWith(`${pi}/`)) {
      const denom = s.slice(pi.length + 1).trim();
      return sign * (Math.PI / Number(denom));
    }
    if (s.endsWith(`*${pi}`)) {
      const coeff = s.slice(0, -`*${pi}`.length).trim();
      return sign * Number(coeff) * Math.PI;
    }
    if (s.endsWith(`/${pi}`)) {
      const numer = s.slice(0, -`/${pi}`.length).trim();
      return sign * (Number(numer) / Math.PI);
    }
  }

  const value = Number(s);
  if (Number.isFinite(value)) return sign * value;
  return sign * DEFAULT_ANGLE;
}

const QISKIT_ALIASES: Record<string, Gate> = {
  u1: 'P',
  cu1: 'CP',
  cnot: 'CNOT',
  toffoli: 'CCX',
  fredkin: 'CSWAP',
  id: 'I',
};

const QISKIT_TO_GATE: Record<string, Gate> = Object.values(GATE_SPECS).reduce(
  (acc, spec) => ({ ...acc, [spec.qiskit]: spec.id }),
  { ...QISKIT_ALIASES },
);

export function createEmptyCircuit(): Circuit {
  return {
    qubits: 2,
    timesteps: 6,
    operations: [],
  };
}

export function sortOperations(operations: GateOp[]): GateOp[] {
  return [...operations].sort((a, b) => {
    if (a.timestep !== b.timestep) {
      return a.timestep - b.timestep;
    }
    return a.qubit - b.qubit;
  });
}

export function upsertOperation(
  operations: GateOp[],
  nextOperation: GateOp
): GateOp[] {
  const filtered = operations.filter(
    (op) =>
      !(
        op.timestep === nextOperation.timestep &&
        op.qubit === nextOperation.qubit
      )
  );

  const spec = GATE_SPECS[nextOperation.gate];
  if (spec.targets > 0 && nextOperation.target === nextOperation.qubit) {
    return sortOperations(filtered);
  }

  return sortOperations([...filtered, nextOperation]);
}

export function removeOperation(operations: GateOp[], timestep: number, qubit: number): GateOp[] {
  return operations.filter((op) => !(op.timestep === timestep && op.qubit === qubit));
}

const resolveTarget = (op: GateOp, offset: 1 | 2, qubits: number): number => {
  const explicit = offset === 1 ? op.target : op.target2;
  if (typeof explicit === 'number') return explicit;
  return Math.min(qubits - 1, op.qubit + offset);
};

const qiskitCall = (op: GateOp, qubits: number): string | null => {
  const spec = GATE_SPECS[op.gate];
  if (op.gate === 'Barrier') return 'qc.barrier()';
  if (op.gate === 'Measure') return `qc.measure(${op.qubit}, ${op.qubit})`;
  if (op.gate === 'Reset') return `qc.reset(${op.qubit})`;
  if (spec.targets === 2) {
    return `qc.${spec.qiskit}(${op.qubit}, ${resolveTarget(op, 1, qubits)}, ${resolveTarget(op, 2, qubits)})`;
  }
  if (spec.targets === 1) {
    const tgt = resolveTarget(op, 1, qubits);
    if (spec.parameter) {
      return `qc.${spec.qiskit}(${formatAngle(op.parameter ?? DEFAULT_ANGLE)}, ${op.qubit}, ${tgt})`;
    }
    return `qc.${spec.qiskit}(${op.qubit}, ${tgt})`;
  }
  if (spec.parameter) {
    return `qc.${spec.qiskit}(${formatAngle(op.parameter ?? DEFAULT_ANGLE)}, ${op.qubit})`;
  }
  return `qc.${spec.qiskit}(${op.qubit})`;
};

const qasmCall = (op: GateOp, qubits: number): string | null => {
  const spec = GATE_SPECS[op.gate];
  if (op.gate === 'Barrier') return 'barrier;';
  if (op.gate === 'Measure') return `measure q[${op.qubit}] -> c[${op.qubit}];`;
  if (op.gate === 'Reset') return `reset q[${op.qubit}];`;
  if (spec.targets === 2) {
    return `${spec.qasm} q[${op.qubit}],q[${resolveTarget(op, 1, qubits)}],q[${resolveTarget(op, 2, qubits)}];`;
  }
  if (spec.targets === 1) {
    const tgt = resolveTarget(op, 1, qubits);
    if (spec.parameter) {
      return `${spec.qasm}(${formatAngle(op.parameter ?? DEFAULT_ANGLE)}) q[${op.qubit}],q[${tgt}];`;
    }
    return `${spec.qasm} q[${op.qubit}],q[${tgt}];`;
  }
  if (spec.parameter) {
    return `${spec.qasm}(${formatAngle(op.parameter ?? DEFAULT_ANGLE)}) q[${op.qubit}];`;
  }
  return `${spec.qasm} q[${op.qubit}];`;
};

export function circuitToQiskitCode(circuit: Circuit): string {
  const lines: string[] = [
    'from qiskit import QuantumCircuit',
    `qc = QuantumCircuit(${circuit.qubits}, ${circuit.qubits})`,
  ];

  for (const op of sortOperations(circuit.operations)) {
    const call = qiskitCall(op, circuit.qubits);
    if (call) lines.push(call);
  }

  return lines.join('\n');
}

export function circuitToQasmLike(circuit: Circuit): string {
  const lines = [
    'OPENQASM 2.0;',
    'include "qelib1.inc";',
    `qreg q[${circuit.qubits}];`,
    `creg c[${circuit.qubits}];`,
  ];

  for (const op of sortOperations(circuit.operations)) {
    const call = qasmCall(op, circuit.qubits);
    if (call) lines.push(call);
  }

  return lines.join('\n');
}

const toIndex = (value: string): number => {
  const match = value.match(/(\d+)/);
  return match ? Number(match[1]) : NaN;
};

function buildOpFromCall(methodRaw: string, argString: string, timestep: number): GateOp | null {
  const method = methodRaw.toLowerCase();
  const gate = QISKIT_TO_GATE[method];
  if (!gate) return null;

  const spec = GATE_SPECS[gate];
  const args = argString
    .split(',')
    .map((part) => part.trim())
    .filter((part) => part.length > 0);

  if (gate === 'Barrier') {
    return { gate, qubit: 0, timestep };
  }

  let parameter: number | undefined;
  let qubitArgs = args;
  if (spec.parameter) {
    parameter = parseAngleExpr(args[0] ?? '0');
    qubitArgs = args.slice(1);
  }

  const qubit = toIndex(qubitArgs[0] ?? '0');
  if (!Number.isFinite(qubit)) return null;

  const op: GateOp = { gate, qubit, timestep };
  if (spec.targets >= 1 && qubitArgs[1] !== undefined) {
    const target = toIndex(qubitArgs[1]);
    if (Number.isFinite(target)) op.target = target;
  }
  if (spec.targets === 2 && qubitArgs[2] !== undefined) {
    const target2 = toIndex(qubitArgs[2]);
    if (Number.isFinite(target2)) op.target2 = target2;
  }
  if (parameter !== undefined) op.parameter = parameter;
  return op;
}

export function parseQiskitCode(code: string, current: Circuit): Circuit {
  const lines = code.split(/\r?\n/);
  const operations: GateOp[] = [];
  let qubits = current.qubits;

  for (const rawLine of lines) {
    const line = rawLine.replace(/#.*$/, '').trim();
    if (!line) continue;

    const initMatch = line.match(/QuantumCircuit\s*\(\s*(\d+)\s*(?:,\s*(\d+)\s*)?\)/);
    if (initMatch) {
      qubits = Number(initMatch[1]);
      continue;
    }

    const callMatch = line.match(/^\s*(?:qc|circuit|q)\s*\.\s*(\w+)\s*\((.*)\)\s*;?\s*$/);
    if (callMatch) {
      const op = buildOpFromCall(callMatch[1], callMatch[2], operations.length);
      if (op) operations.push(op);
    }
  }

  return {
    ...current,
    qubits,
    timesteps: Math.max(current.timesteps, operations.length + 1),
    operations: sortOperations(operations),
  };
}
