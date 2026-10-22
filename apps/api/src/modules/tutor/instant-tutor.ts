export interface InstantTutorReply {
  content: string;
  ragContext: string[];
  reason: string;
}

interface InstantTutorCard extends InstantTutorReply {
  keys: string[];
}

const normalizePrompt = (prompt: string): string =>
  prompt
    .toLocaleLowerCase()
    .replace(/[’']/g, '')
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();

const CARD_REASON = 'Precomputed QVANTA concept card matched the student prompt.';

const CARDS: InstantTutorCard[] = [
  {
    keys: ['explain superposition in simple terms', 'what is superposition'],
    ragContext: ['The Qubit and Quantum States'],
    reason: CARD_REASON,
    content: 'Superposition means a qubit carries amplitudes for |0⟩ and |1⟩ before measurement. It is not “two classical bits at once”; the amplitudes interfere, and measurement samples probabilities |α|² and |β|².\n\nTry this prediction: H|0⟩ = (|0⟩ + |1⟩)/√2, so many shots should approach a 50/50 histogram.\n\nPrediction question: before you run H followed by Measure, which two outcomes should appear and why?',
  },
  {
    keys: ['what does a hadamard gate do to the bloch sphere', 'what does h do to the bloch sphere', 'explain the hadamard gate'],
    ragContext: ['Single-Qubit Gates', 'The Bloch Sphere'],
    reason: CARD_REASON,
    content: 'The Hadamard gate takes |0⟩ from the north pole to |+⟩ on the equator, creating equal measurement probabilities for 0 and 1. It also maps |1⟩ to |−⟩, and applying H twice returns the original state because H² = I.\n\nPrediction question: if you apply H twice to |0⟩ and then measure, should the histogram be balanced or deterministic?',
  },
  {
    keys: ['how do i build a bell state', 'build a bell state', 'how to make a bell state'],
    ragContext: ['Two-Qubit Gates', 'Entanglement'],
    reason: CARD_REASON,
    content: 'Build the Bell state |Φ⁺⟩ with H on q0 followed by CNOT(control=q0, target=q1). The circuit creates (|00⟩ + |11⟩)/√2, so repeated measurement emphasizes correlated 00 and 11 results.\n\nPrediction question: why should 01 and 10 be rare in the ideal circuit?',
  },
  {
    keys: ['what are the preparation transformation and measurement stages', 'algorithm stages', 'what are the stages of a quantum algorithm'],
    ragContext: ['Early Quantum Algorithms'],
    reason: CARD_REASON,
    content: 'Use a three-part reading loop: prepare the input state, transform it with the algorithm’s oracle/interference structure, then measure the output. The prediction belongs between transform and measurement: state what evidence should become more likely before looking at the histogram.\n\nPrediction question: which gate or stage is responsible for the final bias you expect to observe?',
  },
  {
    keys: ['explain the intuition behind grover style amplification', 'explain grover amplification', 'what is grovers algorithm'],
    ragContext: ['Grover Search', 'Early Quantum Algorithms'],
    reason: CARD_REASON,
    content: 'Grover starts with a flat amplitude field, uses an oracle to flip the marked state’s phase, then reflects amplitudes around the mean. Repeating that oracle-plus-diffusion pair makes the marked answer louder without inspecting every candidate classically.\n\nPrediction question: after one amplification round, should the marked bar grow while the unmarked bars stay flat, or should the whole histogram remain uniform?',
  },
  {
    keys: ['what is the quantum fourier transform', 'explain qft', 'what does qft do'],
    ragContext: ['Quantum Fourier Transform', 'Phase Estimation'],
    reason: CARD_REASON,
    content: 'The Quantum Fourier Transform changes the basis from computational labels to phase/frequency labels. Periodic structure that is spread across amplitudes can become concentrated near a small set of frequency bins. That is why QFT appears inside phase estimation and Shor’s algorithm.\n\nPrediction question: if the input has a strong period, should the transformed distribution look diffuse or peak-like?',
  },
  {
    keys: ['what is shors algorithm', 'explain shor algorithm', 'how does shor work'],
    ragContext: ["Shor's Factoring", 'Quantum Fourier Transform'],
    reason: CARD_REASON,
    content: 'Shor turns factoring into period finding. A quantum register samples modular powers in superposition, the inverse QFT exposes the hidden period, and classical continued-fraction arithmetic turns that period into candidate factors. The quantum part finds structure; the classical part converts the clue into factors.\n\nPrediction question: why does Shor need both a quantum phase register and a classical post-processing step?',
  },
];

const CARD_BY_KEY = new Map<string, InstantTutorCard>(
  CARDS.flatMap((card) => card.keys.map((key) => [normalizePrompt(key), card] as const)),
);

export const getInstantTutorReply = (prompt: string): InstantTutorReply | null => {
  const card = CARD_BY_KEY.get(normalizePrompt(prompt));
  if (!card) return null;
  return {
    content: card.content,
    ragContext: card.ragContext,
    reason: card.reason,
  };
};

export const getInstantTutorCardCount = (): number => CARDS.length;

export const runInstantTutorProof = (): {
  scope: string;
  checks: Array<{ id: string; label: string; passed: boolean; evidence: string }>;
  score: number;
  total: number;
} => {
  const checks = [
    {
      id: 'grounding',
      label: 'Every instant card exposes curriculum source labels',
      passed: CARDS.every((card) => card.ragContext.length > 0),
      evidence: `${CARDS.length} fixed cards carry source labels`,
    },
    {
      id: 'prediction',
      label: 'Every instant card ends with a prediction question',
      passed: CARDS.every((card) => /prediction question:/i.test(card.content)),
      evidence: `${CARDS.filter((card) => /prediction question:/i.test(card.content)).length}/${CARDS.length} cards are prediction-first`,
    },
    {
      id: 'lookup',
      label: 'Common concept lookup uses a constant-time map path',
      passed: CARD_BY_KEY.size >= CARDS.length,
      evidence: `Map contains ${CARD_BY_KEY.size} normalized prompt keys`,
    },
    {
      id: 'algorithm',
      label: 'Algorithm cards cover Grover, QFT, and Shor',
      passed: Boolean(getInstantTutorReply('Explain the intuition behind Grover-style amplification')
        && getInstantTutorReply('What is the Quantum Fourier Transform')
        && getInstantTutorReply("What is Shor's algorithm")),
      evidence: 'Search, transform, and factoring paths are available without a model round-trip',
    },
  ];

  return {
    scope: 'QVANTA quantum-learning fast path — capability evidence, not a universal model benchmark',
    checks,
    score: checks.filter((check) => check.passed).length,
    total: checks.length,
  };
};
