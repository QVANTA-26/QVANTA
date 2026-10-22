import assert from 'node:assert/strict';
import test from 'node:test';
import { buildCannedReply } from './tutor.service';
import { getInstantTutorReply, runInstantTutorProof } from './instant-tutor';

test('instant tutor cards answer supported algorithm prompts through the fixed lookup path', () => {
  const result = getInstantTutorReply('Explain the intuition behind Grover-style amplification');

  assert.ok(result);
  assert.match(result.content, /marked state/i);
  assert.match(result.content, /Prediction question:/);
  assert.deepEqual(result.ragContext, ['Grover Search', 'Early Quantum Algorithms']);
});

test('instant tutor proof suite verifies grounding, prediction, lookup, and algorithm coverage', () => {
  const proof = runInstantTutorProof();

  assert.equal(proof.score, proof.total);
  assert.equal(proof.checks.length, 4);
  assert.ok(proof.checks.every((check) => check.passed));
});

test('canned tutor replies include the selected source-backed module context', () => {
  const result = buildCannedReply({
    prompt: 'What should I try first?',
    lessonTitles: [],
    moduleContext: {
      title: 'Quantum States',
      content: 'A qubit state can be represented as a point on the Bloch sphere.',
    },
  });

  assert.match(result.content, /Active module: Quantum States/);
  assert.match(result.content, /A qubit state can be represented as a point on the Bloch sphere/);
  assert.deepEqual(result.ragContext, ['Quantum States']);
});

test('canned tutor replies fall back to retrieved lesson titles without module context', () => {
  const result = buildCannedReply({
    prompt: 'Explain measurement.',
    lessonTitles: ['Measurement basics'],
  });

  assert.match(result.content, /Grounding from active curriculum: Measurement basics/);
  assert.match(result.content, /Measurement collapses superposition/);
});

test('canned tutor replies teach the attached circuit gate-by-gate', () => {
  const result = buildCannedReply({
    prompt: 'How should I predict this circuit?',
    lessonTitles: ['Two-qubit gates'],
    circuit: {
      qubits: 2,
      timesteps: 3,
      operations: [
        { gate: 'H', qubit: 0, timestep: 0 },
        { gate: 'CNOT', qubit: 0, target: 1, timestep: 1 },
        { gate: 'Measure', qubit: 0, timestep: 2 },
        { gate: 'Measure', qubit: 1, timestep: 2 },
      ],
    },
  });

  assert.match(result.content, /Circuit timeline \(read left to right\)/);
  assert.match(result.content, /t0 · H on q0: \|0⟩ → \|\+⟩/);
  assert.match(result.content, /CNOT \(control q0 → target q1\)/);
  assert.match(result.content, /pair becomes entangled/);
  assert.match(result.content, /Measure on q0:.*collapses the quantum state/);
  assert.match(result.content, /Final intuitive snapshot:/);
  assert.match(result.content, /Prediction question:.*\?/);
  assert.doesNotMatch(result.content, /Current circuit has 2 qubits/);
});

test('canned tutor replies surface circuit warnings and missing measurement behavior', () => {
  const result = buildCannedReply({
    prompt: 'Please debug this circuit.',
    lessonTitles: [],
    circuit: {
      qubits: 2,
      timesteps: 2,
      operations: [
        { gate: 'H', qubit: 0, timestep: 0 },
        { gate: 'CNOT', qubit: 0, timestep: 1 },
      ],
    },
  });

  assert.match(result.content, /missing a target qubit/);
  assert.match(result.content, /no Measure gate/);
  assert.match(result.content, /before adding a final Measure/);
});
