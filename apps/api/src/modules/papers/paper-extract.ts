import Anthropic from '@anthropic-ai/sdk';
import axios from 'axios';
import {
  GATE_IDS,
  getGateTargetCount,
  isParameterizedGate,
  type Circuit,
  type Gate,
  type GateOp,
  type PaperAnalysis,
  type PaperCircuit,
} from '@qvanta/types';
import { AppError } from '../../lib/errors';
import type { PaperSource } from './paper-source';

/** Builder and simulator both cap here, so extracted circuits must fit too. */
const MAX_QUBITS = 8;
const MAX_TIMESTEPS = 32;
const MAX_CIRCUITS = 6;
const MAX_OPERATIONS = 200;

const PAPER_MODEL = process.env.PAPER_MODEL ?? 'claude-3-5-sonnet-latest';

let claudeClient: Anthropic | null = null;
if (process.env.ANTHROPIC_API_KEY) {
  try {
    claudeClient = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  } catch {
    claudeClient = null;
  }
}

const GEMINI_API_KEY = process.env.GEMINI_API_KEY?.trim() || undefined;
const GEMINI_PAPER_MODEL = process.env.GEMINI_MODEL?.trim() || 'gemini-1.5-flash';
const geminiAvailable = Boolean(GEMINI_API_KEY);

const GATE_LIST = GATE_IDS.join(', ');

const INSTRUCTIONS = [
  'You are a quantum-computing research assistant inside QVANTA.',
  'You are given the text of a research paper (or an extract from it). Identify the concrete quantum circuits the paper actually specifies and return them as structured JSON.',
  '',
  'Rules:',
  `- Only use gates from this list: ${GATE_LIST}.`,
  '- A gate op is {"gate": <string>, "qubit": <int>, "timestep": <int>} plus "target" for CNOT/CY/CZ/CH/SWAP/iSWAP/CRX/CRY/CRZ/CP, plus "target2" for CCX/CSWAP/CCZ, and "parameter" (radians, number) for RX/RY/RZ/P/CRX/CRY/CRZ/CP.',
  '- timesteps start at 0 and increase left to right. Gates that act on disjoint qubits at the same moment may share a timestep.',
  `- Keep every circuit within ${MAX_QUBITS} qubits and ${MAX_TIMESTEPS} timesteps.`,
  '- Prefer the paper\'s central, explicitly drawn circuits (e.g. an oracle block, a QFT, a variational ansatz, an error-correction cycle). Do not invent circuits that the paper does not describe.',
  '- If the paper contains no concrete circuit, return an empty "circuits" array.',
  '',
  'Respond with JSON only, matching exactly this shape:',
  '{"title": string, "summary": string, "circuits": [{"name": string, "description": string, "qubits": int, "operations": [{"gate": string, "qubit": int, "timestep": int, "target"?: int, "target2"?: int, "parameter"?: number}]}]}',
  '- "summary" is 2-4 plain-language sentences aimed at a student.',
  '- "name" is a short label (max 6 words); "description" is one or two sentences.',
].join('\n');

interface RawCircuit {
  name?: unknown;
  description?: unknown;
  qubits?: unknown;
  operations?: unknown;
}

interface RawAnalysis {
  title?: unknown;
  summary?: unknown;
  circuits?: unknown;
}

/** Model replies are fenced or wrapped in prose often enough to warrant this. */
function extractJsonObject(text: string): unknown {
  const withoutFences = text.replace(/```(?:json)?/gi, ' ').trim();
  const start = withoutFences.indexOf('{');
  const end = withoutFences.lastIndexOf('}');
  if (start === -1 || end === -1 || end <= start) {
    throw new AppError(
      'INTERNAL_ERROR',
      'The paper analysis did not return usable structure. Try another link, or upload the PDF.',
      502
    );
  }
  try {
    return JSON.parse(withoutFences.slice(start, end + 1));
  } catch {
    throw new AppError(
      'INTERNAL_ERROR',
      'The paper analysis returned malformed JSON. Try another link, or upload the PDF.',
      502
    );
  }
}

const asString = (value: unknown, max: number): string =>
  typeof value === 'string' ? value.trim().slice(0, max) : '';

const asInt = (value: unknown): number | null => {
  const numeric = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(numeric) ? Math.trunc(numeric) : null;
};

/**
 * Turns one model-proposed circuit into a builder-ready circuit, dropping
 * anything the gate registry cannot represent and recording why.
 */
function normalizeCircuit(raw: RawCircuit, index: number, warnings: string[]): PaperCircuit | null {
  const requestedQubits = asInt(raw.qubits);
  if (requestedQubits === null || requestedQubits < 1) {
    warnings.push(`Circuit ${index + 1} did not declare a qubit count and was skipped.`);
    return null;
  }

  const qubits = Math.min(requestedQubits, MAX_QUBITS);
  if (requestedQubits > MAX_QUBITS) {
    warnings.push(
      `Circuit ${index + 1} uses ${requestedQubits} qubits; QVANTA supports ${MAX_QUBITS}, so gates beyond q${MAX_QUBITS - 1} were left out.`
    );
  }

  const operations: GateOp[] = [];
  const seen = new Set<string>();
  let dropped = 0;

  const rawOperations = Array.isArray(raw.operations) ? raw.operations : [];
  for (const candidate of rawOperations.slice(0, MAX_OPERATIONS)) {
    if (!candidate || typeof candidate !== 'object') {
      dropped += 1;
      continue;
    }

    const op = candidate as Record<string, unknown>;
    const gateId = typeof op.gate === 'string' ? (op.gate as Gate) : null;
    if (!gateId || !GATE_IDS.includes(gateId)) {
      dropped += 1;
      continue;
    }

    const qubit = asInt(op.qubit);
    const timestep = asInt(op.timestep);
    if (qubit === null || timestep === null || qubit < 0 || qubit >= qubits || timestep < 0 || timestep >= MAX_TIMESTEPS) {
      dropped += 1;
      continue;
    }

    const key = `${timestep}:${qubit}`;
    if (seen.has(key)) {
      continue;
    }

    const normalized: GateOp = { gate: gateId, qubit, timestep };

    const targetCount = getGateTargetCount(gateId);
    if (targetCount >= 1) {
      const target = asInt(op.target);
      if (target === null || target < 0 || target >= qubits || target === qubit) {
        dropped += 1;
        continue;
      }
      normalized.target = target;
    }
    if (targetCount === 2) {
      const target2 = asInt(op.target2);
      if (target2 === null || target2 < 0 || target2 >= qubits || target2 === qubit) {
        dropped += 1;
        continue;
      }
      normalized.target2 = target2;
    }

    if (isParameterizedGate(gateId)) {
      const parameter = typeof op.parameter === 'number' ? op.parameter : Number(op.parameter);
      if (!Number.isFinite(parameter)) {
        dropped += 1;
        continue;
      }
      normalized.parameter = parameter;
    }

    seen.add(key);
    operations.push(normalized);
  }

  if (dropped > 0) {
    warnings.push(
      `Circuit ${index + 1}: ${dropped} operation${dropped === 1 ? '' : 's'} could not be represented and ${dropped === 1 ? 'was' : 'were'} dropped.`
    );
  }

  if (operations.length === 0) {
    warnings.push(`Circuit ${index + 1} had no usable gates and was skipped.`);
    return null;
  }

  operations.sort((a, b) => (a.timestep !== b.timestep ? a.timestep - b.timestep : a.qubit - b.qubit));
  const timesteps = Math.min(MAX_TIMESTEPS, operations[operations.length - 1].timestep + 1);

  const circuit: Circuit = { qubits, timesteps, operations };

  return {
    name: asString(raw.name, 60) || `Circuit ${index + 1}`,
    description: asString(raw.description, 400),
    circuit,
  };
}

function normalizeAnalysis(raw: unknown, sourceUrl: string | undefined): PaperAnalysis {
  if (!raw || typeof raw !== 'object') {
    throw new AppError('INTERNAL_ERROR', 'The paper analysis was empty. Try another link.', 502);
  }

  const analysis = raw as RawAnalysis;
  const warnings: string[] = [];
  const rawCircuits = Array.isArray(analysis.circuits) ? (analysis.circuits as RawCircuit[]) : [];

  const circuits: PaperCircuit[] = [];
  rawCircuits.slice(0, MAX_CIRCUITS).forEach((rawCircuit, index) => {
    const circuit = normalizeCircuit(rawCircuit ?? {}, index, warnings);
    if (circuit) {
      circuits.push(circuit);
    }
  });

  if (rawCircuits.length > MAX_CIRCUITS) {
    warnings.push(`The paper described more than ${MAX_CIRCUITS} circuits; only the first ${MAX_CIRCUITS} are shown.`);
  }
  if (circuits.length === 0) {
    warnings.push('No concrete quantum circuit could be identified in this paper.');
  }

  return {
    title: asString(analysis.title, 200) || 'Untitled paper',
    ...(sourceUrl ? { sourceUrl } : {}),
    summary: asString(analysis.summary, 2000),
    circuits,
    warnings,
  };
}

/**
 * Extracts circuits from the paper with Google Gemini via the public
 * Generative Language REST API. PDFs are sent as inline data so the model
 * reads the original layout; text sources are appended to the instructions.
 */
async function extractWithGemini(source: PaperSource): Promise<PaperAnalysis> {
  const parts: Array<{ text?: string; inline_data?: { mime_type: string; data: string } }> =
    source.kind === 'pdf'
      ? [
          { inline_data: { mime_type: 'application/pdf', data: source.dataBase64 } },
          { text: INSTRUCTIONS },
        ]
      : [{ text: `${INSTRUCTIONS}\n\nPAPER TEXT:\n${source.text}` }];

  let text: string;
  try {
    const res = await axios.post(
      `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_PAPER_MODEL}:generateContent?key=${GEMINI_API_KEY}`,
      {
        contents: [{ role: 'user', parts }],
        generationConfig: { maxOutputTokens: 4096, temperature: 0.2 },
      },
      { timeout: 120_000, headers: { 'Content-Type': 'application/json' } }
    );
    text = res.data?.candidates?.[0]?.content?.parts
      ?.map((p: { text?: string }) => p.text ?? '')
      .join('\n')
      .trim();
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    throw new AppError(
      'INTERNAL_ERROR',
      `The paper could not be analysed by Gemini (${detail}). Check that GEMINI_MODEL supports your plan or try another link.`,
      502
    );
  }

  if (!text) {
    throw new AppError(
      'INTERNAL_ERROR',
      'The paper analysis returned an empty response. Try another link, or upload the PDF.',
      502
    );
  }

  return normalizeAnalysis(extractJsonObject(text), source.sourceUrl);
}

/**
 * Extracts circuits from the paper. Prefers Google Gemini when a key is
 * configured (strongest native PDF understanding), falls back to Anthropic
 * Claude, and returns a clear 503 if neither provider is available.
 */
export async function extractPaperAnalysis(source: PaperSource): Promise<PaperAnalysis> {
  if (geminiAvailable) {
    return extractWithGemini(source);
  }

  if (!claudeClient) {
    throw new AppError(
      'INTERNAL_ERROR',
      'Paper analysis is not configured on this server (GEMINI_API_KEY or ANTHROPIC_API_KEY is missing).',
      503
    );
  }

  const content: Anthropic.MessageParam['content'] =
    source.kind === 'pdf'
      ? [
          {
            type: 'document',
            source: { type: 'base64', media_type: 'application/pdf', data: source.dataBase64 },
          } as Anthropic.DocumentBlockParam,
          { type: 'text', text: INSTRUCTIONS },
        ]
      : [{ type: 'text', text: `${INSTRUCTIONS}\n\nPAPER TEXT:\n${source.text}` }];

  let response: Anthropic.Message;
  try {
    response = await claudeClient.messages.create({
      model: PAPER_MODEL,
      max_tokens: 4096,
      messages: [{ role: 'user', content }],
    });
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    throw new AppError(
      'INTERNAL_ERROR',
      `The paper could not be analysed (${detail}). Check that PAPER_MODEL is available on this API key.`,
      502
    );
  }

  const text = response.content
    .filter((block): block is Anthropic.TextBlock => block.type === 'text')
    .map((block) => block.text)
    .join('\n')
    .trim();

  return normalizeAnalysis(extractJsonObject(text), source.sourceUrl);
}

export const isPaperAnalysisConfigured = (): boolean => geminiAvailable || claudeClient !== null;
