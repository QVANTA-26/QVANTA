import type { Circuit, Gate, GateOp } from '@qvanta/types';

export type AlgorithmId =
  | 'deutsch-jozsa'
  | 'grover-search'
  | 'quantum-teleportation'
  | 'quantum-fourier-transform'
  | 'shors-factoring'
  | 'variational-eigensolver';

export type AlgorithmStageKind =
  | 'prepare'
  | 'oracle'
  | 'interference'
  | 'measure'
  | 'communicate'
  | 'estimate'
  | 'factor';

export interface AlgorithmStage {
  id: string;
  label: string;
  kind: AlgorithmStageKind;
  headline: string;
  description: string;
  equation: string;
  signal: string;
}

export interface AlgorithmCircuitBlueprint {
  circuit: Circuit;
  focus: string;
  explanation: string;
  prediction: string;
}

export interface AlgorithmDefinition {
  id: AlgorithmId;
  name: string;
  shortName: string;
  category: string;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  summary: string;
  whyItMatters: string;
  classicalComplexity: string;
  quantumComplexity: string;
  qubits: string;
  accent: string;
  curriculumKeywords: string[];
  stages: AlgorithmStage[];
  blueprint: AlgorithmCircuitBlueprint;
}

const operation = (gate: Gate, qubit: number, timestep: number, target?: number): GateOp => ({
  gate,
  qubit,
  timestep,
  ...(typeof target === 'number' ? { target } : {}),
});

const circuit = (qubits: number, timesteps: number, operations: GateOp[]): Circuit => ({
  qubits,
  timesteps,
  operations,
});

export const ALGORITHMS: AlgorithmDefinition[] = [
  {
    id: 'deutsch-jozsa',
    name: 'Deutsch–Jozsa',
    shortName: 'DJ',
    category: 'Oracle algorithms',
    difficulty: 'beginner',
    summary: 'Turn one oracle query into a global answer: is the hidden function constant or balanced?',
    whyItMatters: 'It is the cleanest first example of phase kickback and quantum parallelism.',
    classicalComplexity: 'O(2ⁿ) queries in the deterministic worst case',
    quantumComplexity: 'O(1) oracle query',
    qubits: 'n input qubits + 1 ancilla',
    accent: '#8f102d',
    curriculumKeywords: ['deutsch', 'constant function', 'balanced function', 'oracle'],
    stages: [
      {
        id: 'prepare',
        label: 'Prepare',
        kind: 'prepare',
        headline: 'Create the query superposition',
        description: 'Hadamards put every input possibility into one coherent query state.',
        equation: '|0…0⟩ → 1/√N · Σₓ|x⟩',
        signal: 'Every input branch is alive before the oracle answers.',
      },
      {
        id: 'oracle',
        label: 'Oracle',
        kind: 'oracle',
        headline: 'Let the hidden function mark phase',
        description: 'The oracle writes its answer into phase instead of revealing a classical table.',
        equation: 'U_f|x,y⟩ = |x, y ⊕ f(x)⟩',
        signal: 'The ancilla converts a function value into a visible phase sign.',
      },
      {
        id: 'interference',
        label: 'Interfere',
        kind: 'interference',
        headline: 'Recombine the branches',
        description: 'A second layer of Hadamards makes the global structure add up or cancel.',
        equation: 'Hⁿ U_f Hⁿ |0ⁿ⟩',
        signal: 'Constant and balanced functions leave different amplitude fingerprints.',
      },
      {
        id: 'measure',
        label: 'Measure',
        kind: 'measure',
        headline: 'Read one global bit',
        description: 'All-zero input qubits indicate constant; any 1 indicates balanced.',
        equation: '0ⁿ ⇒ constant · anything else ⇒ balanced',
        signal: 'One measurement pattern answers a question about the whole function.',
      },
    ],
    blueprint: {
      circuit: circuit(3, 5, [
        operation('X', 2, 0),
        operation('H', 0, 1),
        operation('H', 1, 1),
        operation('H', 2, 1),
        operation('CNOT', 0, 2, 2),
        operation('CNOT', 1, 2, 3),
        operation('H', 0, 4),
        operation('H', 1, 4),
        operation('Measure', 0, 4),
        operation('Measure', 1, 4),
      ]),
      focus: 'Oracle phase kickback',
      explanation: 'A compact Deutsch–Jozsa scaffold: prepare the ancilla, query an oracle-like pair of controlled operations, then interfere the input register.',
      prediction: 'Before running it, predict whether the input register should end at 00 or show a non-zero bit when the oracle is balanced.',
    },
  },
  {
    id: 'grover-search',
    name: "Grover's Search",
    shortName: 'Grover',
    category: 'Search and amplification',
    difficulty: 'beginner',
    summary: 'Make an unstructured marked answer louder through an oracle and amplitude amplification.',
    whyItMatters: 'It teaches interference as an algorithmic resource rather than a visual trick.',
    classicalComplexity: 'O(N) checks for an unstructured search',
    quantumComplexity: 'O(√N) oracle calls',
    qubits: '⌈log₂N⌉ search qubits',
    accent: '#d19b83',
    curriculumKeywords: ['grover', 'amplification', 'search space', 'marked'],
    stages: [
      {
        id: 'prepare',
        label: 'Prepare',
        kind: 'prepare',
        headline: 'Spread amplitude across candidates',
        description: 'Hadamards create an even starting field so every candidate can be checked.',
        equation: '|s⟩ = 1/√N · Σₓ|x⟩',
        signal: 'The search space begins flat: no candidate is privileged.',
      },
      {
        id: 'oracle',
        label: 'Oracle',
        kind: 'oracle',
        headline: 'Flip the marked phase',
        description: 'The oracle tags the correct answer without exposing it as a classical label.',
        equation: 'O|w⟩ = −|w⟩',
        signal: 'The marked state is now out of phase with the rest.',
      },
      {
        id: 'interference',
        label: 'Amplify',
        kind: 'interference',
        headline: 'Reflect around the mean',
        description: 'The diffusion step turns the phase mark into a larger probability amplitude.',
        equation: 'G = (2|s⟩⟨s| − I)O',
        signal: 'One bar grows while the background bars shrink.',
      },
      {
        id: 'measure',
        label: 'Measure',
        kind: 'measure',
        headline: 'Sample the amplified answer',
        description: 'After about π√N/4 iterations, the marked state is the most likely outcome.',
        equation: 'P(marked) ≈ sin²((2k+1)θ)',
        signal: 'The histogram now has a clear winner instead of a flat field.',
      },
    ],
    blueprint: {
      circuit: circuit(2, 5, [
        operation('H', 0, 0),
        operation('H', 1, 0),
        operation('CNOT', 0, 1, 1),
        operation('X', 1, 2),
        operation('CNOT', 0, 1, 3),
        operation('H', 0, 3),
        operation('H', 1, 3),
        operation('Measure', 0, 4),
        operation('Measure', 1, 4),
      ]),
      focus: 'Search and interference',
      explanation: 'The circuit separates preparation, an oracle-like mark, a diffusion-style recombination, and readout.',
      prediction: 'Which bitstring should become more likely after the amplification step, and what would a flat histogram mean?',
    },
  },
  {
    id: 'quantum-teleportation',
    name: 'Quantum Teleportation',
    shortName: 'Teleport',
    category: 'Communication protocols',
    difficulty: 'intermediate',
    summary: 'Move an unknown quantum state using entanglement and two classical bits—without moving the qubit itself.',
    whyItMatters: 'It connects entanglement, measurement, classical communication, and correction in one story.',
    classicalComplexity: 'Transmitting an unknown state needs a quantum channel',
    quantumComplexity: '1 shared Bell pair + 2 classical bits',
    qubits: '3 qubits: source, Alice, Bob',
    accent: '#b76e79',
    curriculumKeywords: ['teleport', 'entanglement', 'bell pair', 'classical communication'],
    stages: [
      {
        id: 'prepare',
        label: 'Entangle',
        kind: 'prepare',
        headline: 'Share a Bell pair',
        description: 'Alice and Bob create a correlated quantum resource before the message is chosen.',
        equation: '|Φ⁺⟩ = (|00⟩ + |11⟩)/√2',
        signal: 'The shared channel is prepared before the unknown state enters.',
      },
      {
        id: 'oracle',
        label: 'Interact',
        kind: 'communicate',
        headline: 'Mix the unknown state with Alice’s half',
        description: 'CNOT and H convert the source state into two classical measurement bits.',
        equation: 'CNOT₀→₁ · H₀',
        signal: 'The source information is distributed across measurement branches.',
      },
      {
        id: 'interference',
        label: 'Send bits',
        kind: 'communicate',
        headline: 'Use the classical side channel',
        description: 'Alice sends two ordinary bits that tell Bob which correction frame to apply.',
        equation: 'm₀m₁ ∈ {00,01,10,11}',
        signal: 'The classical message selects a correction path, not a copy of the state.',
      },
      {
        id: 'measure',
        label: 'Correct',
        kind: 'measure',
        headline: 'Recover the state at Bob',
        description: 'Bob applies X/Z corrections conditioned on Alice’s bits and receives the original state.',
        equation: 'Xᵐ¹ Zᵐ⁰ |ψ⟩',
        signal: 'The state arrives at Bob while the original is destroyed by measurement.',
      },
    ],
    blueprint: {
      circuit: circuit(3, 6, [
        operation('H', 1, 0),
        operation('CNOT', 1, 2, 1),
        operation('CNOT', 0, 1, 2),
        operation('H', 0, 3),
        operation('Measure', 0, 4),
        operation('Measure', 1, 4),
        operation('CNOT', 1, 5, 2),
      ]),
      focus: 'Entanglement plus classical correction',
      explanation: 'This scaffold keeps the teleportation narrative visible: create a Bell pair, interact with the source, measure, then correct the receiver.',
      prediction: 'Which part of the protocol is quantum, which part is classical, and why can Bob not recover the state before the two bits arrive?',
    },
  },
  {
    id: 'quantum-fourier-transform',
    name: 'Quantum Fourier Transform',
    shortName: 'QFT',
    category: 'Transforms and phase',
    difficulty: 'intermediate',
    summary: 'Re-express amplitudes in a phase basis so hidden periodic structure becomes measurable.',
    whyItMatters: 'QFT is the phase microscope inside phase estimation and Shor’s algorithm.',
    classicalComplexity: 'Fast Fourier transform: O(N log N) values',
    quantumComplexity: 'O(n²) gates for an n-qubit QFT',
    qubits: 'n qubits',
    accent: '#e4d5cc',
    curriculumKeywords: ['qft', 'fourier', 'phase estimation', 'period'],
    stages: [
      {
        id: 'prepare',
        label: 'Encode',
        kind: 'prepare',
        headline: 'Put the phase pattern into amplitudes',
        description: 'The input register carries a periodic signal that is hard to see in the computational basis.',
        equation: '|ψ⟩ = Σₓ aₓ|x⟩',
        signal: 'The rails carry structure that is present but not yet separated.',
      },
      {
        id: 'oracle',
        label: 'Rotate',
        kind: 'oracle',
        headline: 'Apply controlled phase rotations',
        description: 'Small conditional rotations line up the phase relationships between qubits.',
        equation: 'Rₖ = diag(1, e^{2πi/2ᵏ})',
        signal: 'Phase rings tighten as the register becomes frequency-aware.',
      },
      {
        id: 'interference',
        label: 'Fourier mix',
        kind: 'interference',
        headline: 'Interfere into frequency bins',
        description: 'Hadamards and controlled phases convert periodicity into concentrated peaks.',
        equation: 'QFT|x⟩ = 1/√N Σᵧ e^{2πixy/N}|y⟩',
        signal: 'The wave field changes from a time pattern into a frequency pattern.',
      },
      {
        id: 'measure',
        label: 'Read phase',
        kind: 'measure',
        headline: 'Measure the useful frequency',
        description: 'The result gives a compact phase estimate that downstream algorithms can use.',
        equation: 'y/N ≈ phase',
        signal: 'A narrow peak replaces a diffuse cloud of possible answers.',
      },
    ],
    blueprint: {
      circuit: circuit(3, 6, [
        operation('H', 0, 0),
        operation('CNOT', 0, 1, 1),
        operation('H', 1, 1),
        operation('CNOT', 1, 2, 2),
        operation('H', 2, 2),
        operation('Z', 2, 3),
        operation('H', 0, 4),
        operation('Measure', 0, 5),
        operation('Measure', 1, 5),
        operation('Measure', 2, 5),
      ]),
      focus: 'Phase structure and frequency bins',
      explanation: 'A visual QFT scaffold: controlled interactions distribute phase information before the final basis readout.',
      prediction: 'What should happen to a periodic signal after the transform: stay spread out, or concentrate near a frequency bin?',
    },
  },
  {
    id: 'shors-factoring',
    name: "Shor's Factoring",
    shortName: 'Shor',
    category: 'Period finding',
    difficulty: 'advanced',
    summary: 'Turn factoring into period finding, then use QFT to expose that period efficiently.',
    whyItMatters: 'It shows how a quantum subroutine can change the security assumptions behind public-key cryptography.',
    classicalComplexity: 'Best known classical methods are sub-exponential',
    quantumComplexity: 'Polynomial time in the number of input bits',
    qubits: 'Two registers: phase + work',
    accent: '#9fb3a4',
    curriculumKeywords: ['shor', 'factor', 'period finding', 'cryptography'],
    stages: [
      {
        id: 'prepare',
        label: 'Superpose',
        kind: 'prepare',
        headline: 'Sample many exponents at once',
        description: 'The phase register explores a broad set of candidate exponents in parallel.',
        equation: '1/√Q Σₓ|x⟩|1⟩',
        signal: 'A comb of candidate exponents enters the modular arithmetic block.',
      },
      {
        id: 'oracle',
        label: 'Modular power',
        kind: 'factor',
        headline: 'Encode a repeating modular pattern',
        description: 'The work register computes aˣ mod N, creating a hidden period r.',
        equation: 'f(x) = aˣ mod N',
        signal: 'Repeated work-register states reveal a periodic lattice.',
      },
      {
        id: 'interference',
        label: 'QFT',
        kind: 'interference',
        headline: 'Make the period visible',
        description: 'The inverse QFT turns the repeating pattern into peaks near multiples of Q/r.',
        equation: 'y/Q ≈ k/r',
        signal: 'The phase field collapses onto a small set of rational clues.',
      },
      {
        id: 'measure',
        label: 'Classical post-process',
        kind: 'measure',
        headline: 'Recover factors with continued fractions',
        description: 'A classical routine turns the measured fraction into a candidate period and factors.',
        equation: 'r → gcd(a^{r/2} ± 1, N)',
        signal: 'Quantum sampling hands a structured clue to classical arithmetic.',
      },
    ],
    blueprint: {
      circuit: circuit(4, 7, [
        operation('H', 0, 0),
        operation('H', 1, 0),
        operation('H', 2, 0),
        operation('CNOT', 0, 1, 1),
        operation('CNOT', 1, 2, 2),
        operation('CNOT', 2, 3, 3),
        operation('Z', 3, 4),
        operation('H', 0, 5),
        operation('H', 1, 5),
        operation('Measure', 0, 6),
        operation('Measure', 1, 6),
        operation('Measure', 2, 6),
      ]),
      focus: 'Period finding and QFT',
      explanation: 'A teaching scaffold for Shor’s architecture: prepare a phase register, imprint periodic structure, then expose it with Fourier interference.',
      prediction: 'Why does the algorithm spend quantum resources finding a period and classical resources turning that period into factors?',
    },
  },
  {
    id: 'variational-eigensolver',
    name: 'Variational Quantum Eigensolver',
    shortName: 'VQE',
    category: 'Hybrid quantum–classical',
    difficulty: 'advanced',
    summary: 'Use a parameterized circuit and a classical optimizer to search for a low-energy quantum state.',
    whyItMatters: 'It is a practical near-term pattern: quantum measurement supplies the score, classical code updates the knobs.',
    classicalComplexity: 'Exact diagonalization grows exponentially with system size',
    quantumComplexity: 'Repeated shallow circuits + classical optimization',
    qubits: 'Problem-size dependent',
    accent: '#c890aa',
    curriculumKeywords: ['vqe', 'variational', 'eigenvalue', 'optimization', 'ansatz'],
    stages: [
      {
        id: 'prepare',
        label: 'Ansatz',
        kind: 'prepare',
        headline: 'Choose a tunable circuit family',
        description: 'The ansatz is expressive enough to represent useful states but shallow enough to run.',
        equation: '|ψ(θ)⟩ = U(θ)|0⟩',
        signal: 'Knobs on the circuit control the shape of the candidate state.',
      },
      {
        id: 'oracle',
        label: 'Measure energy',
        kind: 'estimate',
        headline: 'Estimate the objective on hardware',
        description: 'Pauli measurements turn the prepared state into an energy estimate.',
        equation: 'E(θ) = ⟨ψ(θ)|H|ψ(θ)⟩',
        signal: 'The measurement stream becomes a scalar score for the optimizer.',
      },
      {
        id: 'interference',
        label: 'Optimize',
        kind: 'interference',
        headline: 'Move downhill in parameter space',
        description: 'A classical optimizer proposes new angles and asks the quantum circuit for another score.',
        equation: 'θₜ₊₁ = θₜ − η∇E(θₜ)',
        signal: 'The parameter point spirals toward a lower basin in the energy landscape.',
      },
      {
        id: 'measure',
        label: 'Converge',
        kind: 'measure',
        headline: 'Stop when the energy stabilizes',
        description: 'The loop ends when additional iterations no longer improve the estimate meaningfully.',
        equation: '|Eₜ₊₁ − Eₜ| < ε',
        signal: 'The landscape glow settles around the best state found so far.',
      },
    ],
    blueprint: {
      circuit: circuit(2, 5, [
        operation('H', 0, 0),
        operation('CNOT', 0, 1, 1),
        operation('Y', 0, 2),
        operation('X', 1, 2),
        operation('Measure', 0, 4),
        operation('Measure', 1, 4),
      ]),
      focus: 'Parameterized circuit and energy feedback',
      explanation: 'A small variational scaffold: prepare a correlated state, perturb parameters, and read a measurement that stands in for the objective.',
      prediction: 'If the optimizer lowers the measured energy, what should happen to the next parameter update and the landscape marker?',
    },
  },
];

export const ALGORITHM_BY_ID: Record<AlgorithmId, AlgorithmDefinition> = Object.fromEntries(
  ALGORITHMS.map((algorithm) => [algorithm.id, algorithm]),
) as Record<AlgorithmId, AlgorithmDefinition>;

export const buildAlgorithmTutorHandoff = (algorithm: AlgorithmDefinition, stageIndex = 0) => {
  const currentStage = algorithm.stages[Math.max(0, Math.min(stageIndex, algorithm.stages.length - 1))] ?? algorithm.stages[0];
  const steps = algorithm.stages.map((stage, index) => ({
    id: `${algorithm.id}-${stage.id}`,
    eyebrow: `${String(index + 1).padStart(2, '0')} · ${algorithm.category}`,
    title: stage.headline,
    body: `${stage.description}\n\n${stage.equation}\n\n${stage.signal}`,
    takeaway: stage.signal,
    example: stage.equation,
  }));

  return {
    id: `algorithm:${algorithm.id}`,
    title: algorithm.name,
    description: algorithm.summary,
    lessonContext: {
      content: [algorithm.summary, algorithm.whyItMatters, ...algorithm.stages.map((stage) => `${stage.headline}\n${stage.description}`)].join('\n\n'),
      currentStep: steps[Math.max(0, Math.min(stageIndex, steps.length - 1))] ?? steps[0],
      steps,
    },
  };
};
