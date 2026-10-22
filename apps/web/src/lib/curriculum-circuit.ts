import type { Circuit, Gate, GateOp } from '@qvanta/types';
import type { CurriculumModule } from '@/components/curriculum/curriculum';
import type { AlgorithmDefinition } from '@/data/algorithms';

export interface CurriculumCircuitBlueprint {
  circuit: Circuit;
  focus: string;
  explanation: string;
  prediction: string;
}

export interface CurriculumCircuitHandoff {
  moduleId: number;
  moduleTitle: string;
  blueprint: CurriculumCircuitBlueprint;
}

const CURRICULUM_CIRCUIT_HANDOFF_KEY = 'qvanta.curriculum.circuitHandoff';
const ALGORITHM_CIRCUIT_HANDOFF_KEY = 'qvanta.algorithm.circuitHandoff';

const makeOperation = (gate: Gate, qubit: number, timestep: number, target?: number): GateOp => ({
  gate,
  qubit,
  timestep,
  ...(typeof target === 'number' ? { target } : {}),
});

const makeCircuit = (qubits: number, timesteps: number, operations: GateOp[]): Circuit => ({
  qubits,
  timesteps,
  operations,
});

const sourceTextFor = (module: CurriculumModule): string => [
  module.title,
  module.partTitle,
  module.level,
  module.prerequisite,
  module.checkpoint,
  ...module.sections.flatMap((section) => [
    section.heading,
    ...section.content.flatMap((block) => block.type === 'list' ? block.items : [block.text]),
  ]),
].join(' ').toLowerCase();

const includesAny = (source: string, terms: string[]): boolean => terms.some((term) => source.includes(term));

const fallbackBlueprint = (module: CurriculumModule): CurriculumCircuitBlueprint => {
  const variant = Math.abs(module.id + module.partNumber) % 4;

  if (variant === 0) {
    return {
      circuit: makeCircuit(1, 3, [
        makeOperation('H', 0, 0),
        makeOperation('Measure', 0, 2),
      ]),
      focus: 'State preparation and readout',
      explanation: 'A minimal experiment that prepares a non-classical state and turns it into an observable result.',
      prediction: 'After H, predict the two measurement outcomes before you run the circuit.',
    };
  }

  if (variant === 1) {
    return {
      circuit: makeCircuit(1, 3, [
        makeOperation('X', 0, 0),
        makeOperation('Measure', 0, 2),
      ]),
      focus: 'A reversible bit flip',
      explanation: 'A compact basis-state experiment: the first gate changes the computational value and the final gate reads it out.',
      prediction: 'Which classical bit should appear, and why does the first gate determine it?',
    };
  }

  if (variant === 2) {
    return {
      circuit: makeCircuit(2, 4, [
        makeOperation('H', 0, 0),
        makeOperation('CNOT', 0, 1, 1),
        makeOperation('Measure', 0, 3),
        makeOperation('Measure', 1, 3),
      ]),
      focus: 'Two-qubit correlation',
      explanation: 'A two-qubit experiment that turns a control qubit into a conditional action on a target qubit.',
      prediction: 'Before measuring, decide which bitstrings should be common and which should be rare.',
    };
  }

  return {
    circuit: makeCircuit(1, 4, [
      makeOperation('H', 0, 0),
      makeOperation('Z', 0, 1),
      makeOperation('H', 0, 2),
      makeOperation('Measure', 0, 3),
    ]),
    focus: 'Phase-sensitive evolution',
    explanation: 'A prepare–phase–recombine experiment that makes an invisible phase difference visible at measurement.',
    prediction: 'What should the final H reveal after the Z gate changes the relative phase?',
  };
};

export const buildCurriculumCircuit = (module: CurriculumModule): CurriculumCircuitBlueprint => {
  const source = sourceTextFor(module);

  if (includesAny(source, ['grover', 'amplification', 'search space'])) {
    return {
      circuit: makeCircuit(2, 5, [
        makeOperation('H', 0, 0),
        makeOperation('H', 1, 0),
        makeOperation('CNOT', 0, 1, 1),
        makeOperation('X', 1, 2),
        makeOperation('CNOT', 0, 1, 3),
        makeOperation('Measure', 0, 4),
        makeOperation('Measure', 1, 4),
      ]),
      focus: 'Search and interference',
      explanation: 'The preview separates preparation, an oracle-like transformation, and readout so you can reason about amplification step by step.',
      prediction: 'Which outcome should the transformation make more likely before measurement?',
    };
  }

  if (includesAny(source, ['deutsch', 'constant function', 'balanced function'])) {
    return {
      circuit: makeCircuit(2, 5, [
        makeOperation('X', 1, 0),
        makeOperation('H', 0, 1),
        makeOperation('H', 1, 1),
        makeOperation('CNOT', 0, 1, 2),
        makeOperation('H', 0, 3),
        makeOperation('Measure', 0, 4),
      ]),
      focus: 'Oracle phase kickback',
      explanation: 'The target is prepared first, then interference on the control qubit reveals information about the function.',
      prediction: 'What should q0 measure if the oracle behaves like a constant function?',
    };
  }

  if (includesAny(source, ['shor', 'qft', 'fourier', 'period finding'])) {
    return {
      circuit: makeCircuit(3, 6, [
        makeOperation('H', 0, 0),
        makeOperation('H', 1, 0),
        makeOperation('H', 2, 0),
        makeOperation('CNOT', 0, 1, 1),
        makeOperation('CNOT', 1, 2, 2),
        makeOperation('Z', 2, 3),
        makeOperation('Measure', 0, 5),
        makeOperation('Measure', 1, 5),
        makeOperation('Measure', 2, 5),
      ]),
      focus: 'Period-finding intuition',
      explanation: 'A small three-qubit scaffold for thinking about preparation, controlled evolution, phase, and readout.',
      prediction: 'Which part of the circuit carries the periodic information into the final bitstring?',
    };
  }

  if (includesAny(source, ['bell', 'entangl', 'cnot', 'controlled-not', 'control qubit', 'target qubit', 'two-qubit', 'two qubit'])) {
    return {
      circuit: makeCircuit(2, 4, [
        makeOperation('H', 0, 0),
        makeOperation('CNOT', 0, 1, 1),
        makeOperation('Measure', 0, 3),
        makeOperation('Measure', 1, 3),
      ]),
      focus: 'Control, target, and entanglement',
      explanation: 'H creates the control qubit’s two branches; CNOT copies that branch information into the target; the measurements expose the correlation.',
      prediction: 'Do you expect 00/11, 01/10, or all four strings? Explain your choice before simulating.',
    };
  }

  if (includesAny(source, ['pauli-x', 'pauli x', 'x gate', 'bit flip', 'not gate'])) {
    return {
      circuit: makeCircuit(1, 3, [
        makeOperation('X', 0, 0),
        makeOperation('Measure', 0, 2),
      ]),
      focus: 'Pauli-X and bit flips',
      explanation: 'X swaps |0⟩ and |1⟩, so this circuit makes the flip visible as a deterministic measurement.',
      prediction: 'Which result should appear after X acts on the initial |0⟩ state?',
    };
  }

  if (includesAny(source, ['pauli-y', 'pauli y', 'y gate'])) {
    return {
      circuit: makeCircuit(1, 3, [
        makeOperation('Y', 0, 0),
        makeOperation('Measure', 0, 2),
      ]),
      focus: 'Pauli-Y and phase',
      explanation: 'Y changes the computational value while also introducing a phase; measurement shows the basis-state part of that action.',
      prediction: 'What will measurement reveal, and what part of Y will remain invisible to a Z-basis readout?',
    };
  }

  if (includesAny(source, ['pauli-z', 'pauli z', 'z gate', 'relative phase', 'phase flip'])) {
    return {
      circuit: makeCircuit(1, 5, [
        makeOperation('H', 0, 0),
        makeOperation('Z', 0, 1),
        makeOperation('H', 0, 2),
        makeOperation('Measure', 0, 4),
      ]),
      focus: 'Relative phase made visible',
      explanation: 'Z changes phase without changing computational-basis probabilities; the final H converts that phase into a measurable difference.',
      prediction: 'Why does the second H make the earlier Z gate show up in the final result?',
    };
  }

  if (includesAny(source, ['measure', 'measurement', 'probability', 'born rule', 'readout'])) {
    return {
      circuit: makeCircuit(1, 3, [
        makeOperation('H', 0, 0),
        makeOperation('Measure', 0, 2),
      ]),
      focus: 'Probability and measurement',
      explanation: 'H creates two probability amplitudes and Measure converts them into a classical sample.',
      prediction: 'Across many shots, what distribution should you expect and why?',
    };
  }

  if (includesAny(source, ['bloch', 'sphere', 'rotation', 'axis', 'superposition', 'hadamard', 'h gate', 'amplitude'])) {
    return {
      circuit: makeCircuit(1, 4, [
        makeOperation('H', 0, 0),
        makeOperation('Z', 0, 1),
        makeOperation('H', 0, 2),
        makeOperation('Measure', 0, 3),
      ]),
      focus: 'State rotation and the Bloch sphere',
      explanation: 'The circuit shows preparation, a phase rotation, and recombination so the state-vector story stays visible.',
      prediction: 'Track the state on the Bloch sphere after each gate before you look at the histogram.',
    };
  }

  return fallbackBlueprint(module);
};

export const saveCurriculumCircuitHandoff = (
  module: CurriculumModule,
  blueprint: CurriculumCircuitBlueprint = buildCurriculumCircuit(module),
): void => {
  try {
    window.sessionStorage.setItem(
      CURRICULUM_CIRCUIT_HANDOFF_KEY,
      JSON.stringify({ moduleId: module.id, moduleTitle: module.title, blueprint }),
    );
  } catch {
    // The builder still opens if session storage is unavailable.
  }
};

export const consumeCurriculumCircuitHandoff = (): CurriculumCircuitHandoff | null => {
  try {
    const raw = window.sessionStorage.getItem(CURRICULUM_CIRCUIT_HANDOFF_KEY);
    if (!raw) return null;
    window.sessionStorage.removeItem(CURRICULUM_CIRCUIT_HANDOFF_KEY);
    const parsed = JSON.parse(raw) as Partial<CurriculumCircuitHandoff>;
    if (
      typeof parsed.moduleId !== 'number' ||
      typeof parsed.moduleTitle !== 'string' ||
      !parsed.blueprint ||
      typeof parsed.blueprint !== 'object' ||
      !parsed.blueprint.circuit ||
      !Array.isArray(parsed.blueprint.circuit.operations)
    ) {
      return null;
    }
    return parsed as CurriculumCircuitHandoff;
  } catch {
    return null;
  }
};

export interface AlgorithmCircuitHandoff {
  algorithmId: string;
  algorithmTitle: string;
  blueprint: CurriculumCircuitBlueprint;
}

export const saveAlgorithmCircuitHandoff = (algorithm: AlgorithmDefinition): void => {
  try {
    window.sessionStorage.setItem(
      ALGORITHM_CIRCUIT_HANDOFF_KEY,
      JSON.stringify({
        algorithmId: algorithm.id,
        algorithmTitle: algorithm.name,
        blueprint: algorithm.blueprint,
      }),
    );
  } catch {
    // The builder still opens if session storage is unavailable.
  }
};

export const consumeAlgorithmCircuitHandoff = (): AlgorithmCircuitHandoff | null => {
  try {
    const raw = window.sessionStorage.getItem(ALGORITHM_CIRCUIT_HANDOFF_KEY);
    if (!raw) return null;
    window.sessionStorage.removeItem(ALGORITHM_CIRCUIT_HANDOFF_KEY);
    const parsed = JSON.parse(raw) as Partial<AlgorithmCircuitHandoff>;
    if (
      typeof parsed.algorithmId !== 'string' ||
      typeof parsed.algorithmTitle !== 'string' ||
      !parsed.blueprint ||
      typeof parsed.blueprint !== 'object' ||
      !parsed.blueprint.circuit ||
      !Array.isArray(parsed.blueprint.circuit.operations)
    ) {
      return null;
    }
    return parsed as AlgorithmCircuitHandoff;
  } catch {
    return null;
  }
};
