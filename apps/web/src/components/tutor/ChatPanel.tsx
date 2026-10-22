import React from 'react';
import { Button, Input } from '@qvanta/ui';
import { apiClient } from '@/lib/api-client';
import { useAuthStore } from '@/store/auth';
import { useCircuitStore } from '@/store/circuit';
import type { TutorMessage, Conversation, Circuit } from '@qvanta/types';
import { analyzeOfflineCircuit, buildOfflineCircuitReply } from './circuitTutor';
import TutorProofPanel from './TutorProofPanel';
import type { TutorEvidence } from '@qvanta/types';

const NEW_CONV_ID = '__new__';

interface Thread {
  id: string;
  title?: string;
  messages: TutorMessage[];
}

const KEY_PROMPT = 'qvanta.tutor.initialPrompt';
const KEY_MODULE = 'qvanta.tutor.initialModule';

export interface TutorLessonStep {
  id?: string;
  eyebrow?: string;
  title: string;
  body?: string;
  takeaway?: string;
  example?: string;
}

export type TutorLessonContext =
  | string
  | TutorLessonStep[]
  | {
      content?: string;
      currentStep?: TutorLessonStep;
      steps?: TutorLessonStep[];
    };

export interface TutorModuleContext {
  id: string;
  title: string;
  description?: string;
  lessonContext?: TutorLessonContext;
}

const readSessionPrompt = (): string | null => {
  if (typeof window === 'undefined') return null;
  try {
    return window.sessionStorage.getItem(KEY_PROMPT);
  } catch {
    return null;
  }
};

const consumeSessionPrompt = (): string | null => {
  if (typeof window === 'undefined') return null;
  try {
    const v = window.sessionStorage.getItem(KEY_PROMPT);
    if (v) window.sessionStorage.removeItem(KEY_PROMPT);
    return v;
  } catch {
    return null;
  }
};

export const readSessionModuleContext = (): TutorModuleContext | null => {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.sessionStorage.getItem(KEY_MODULE);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<TutorModuleContext>;
    if (typeof parsed?.id !== 'string' || typeof parsed?.title !== 'string') return null;

    return {
      id: parsed.id,
      title: parsed.title,
      description: typeof parsed.description === 'string' ? parsed.description : undefined,
      lessonContext: parsed.lessonContext,
    };
  } catch {
    return null;
  }
};

const DEFAULT_SUGGESTIONS = [
  'Explain superposition in simple terms.',
  'What does a Hadamard gate do to the Bloch sphere?',
  'Can you find errors in my current circuit?',
  'How do I build a Bell state?',
];

interface GuidedLesson {
  steps: string[];
  prompts: string[];
}

const MODULE_GUIDES: Array<{ matches: RegExp; guide: GuidedLesson }> = [
  {
    matches: /qubit|intro|fundament/,
    guide: {
      steps: [
        'Meet the qubit: separate measurement outcomes from the state before measurement.',
        'Picture superposition with the Bloch sphere.',
        'Predict the result of an H gate, then test it with repeated shots.',
      ],
      prompts: [
        'Explain the difference between a classical bit and a qubit.',
        'How should I picture superposition before I use the math?',
        'What should I predict before applying an H gate to |0⟩?',
        'Help me check a beginner circuit for this module.',
      ],
    },
  },
  {
    matches: /gate|circuit/,
    guide: {
      steps: [
        'Read X and H as reversible actions on a known input state.',
        'Add a control and target to understand CNOT.',
        'Predict a circuit outcome before using the simulator.',
      ],
      prompts: [
        'Walk me through what X and H do to |0⟩.',
        'Explain control and target qubits in a CNOT.',
        'How can I predict this circuit before I simulate it?',
        'Can you check my current gate sequence for this module?',
      ],
    },
  },
  {
    matches: /bloch|visual/,
    guide: {
      steps: [
        'Find |0⟩, |1⟩, and the equator on the Bloch sphere.',
        'Follow how gates rotate a single-qubit state.',
        'Connect the state vector to measurement probabilities.',
      ],
      prompts: [
        'Show me how to orient myself on the Bloch sphere.',
        'What rotation does an H gate represent here?',
        'How does the sphere predict measurement probabilities?',
        'Can you relate my current circuit to the Bloch sphere?',
      ],
    },
  },
  {
    matches: /algorithm|grover|shor|deutsch/,
    guide: {
      steps: [
        'Separate state preparation, transformation, and measurement.',
        'Use interference to understand how a useful answer is amplified.',
        'Describe the circuit prediction before looking at the histogram.',
      ],
      prompts: [
        'What are the preparation, transformation, and measurement stages?',
        'Explain the intuition behind Grover-style amplification.',
        'How should I write a prediction for this algorithm?',
        'Help me inspect the current circuit for this algorithm.',
      ],
    },
  },
];

const getContextSteps = (moduleContext: TutorModuleContext | null): TutorLessonStep[] => {
  const raw = moduleContext?.lessonContext;
  if (!raw || typeof raw === 'string') return [];

  const candidate = Array.isArray(raw)
    ? raw
    : (raw as { steps?: unknown[] }).steps;

  if (!Array.isArray(candidate)) return [];
  return candidate.filter(
    (step): step is TutorLessonStep =>
      Boolean(step) && typeof step === 'object' && typeof (step as TutorLessonStep).title === 'string'
  );
};

const getModuleSourceContext = (moduleContext: TutorModuleContext | null): string | undefined => {
  const raw = moduleContext?.lessonContext;
  if (!raw) return undefined;
  if (typeof raw === 'string') return raw.slice(0, 12000);
  if (Array.isArray(raw)) {
    return raw.map((step) => `${step.title}\n${step.body ?? ''}`).join('\n\n').slice(0, 12000);
  }
  if (typeof raw.content === 'string' && raw.content.trim()) return raw.content.slice(0, 12000);
  if (Array.isArray(raw.steps)) {
    return raw.steps.map((step) => `${step.title}\n${step.body ?? ''}`).join('\n\n').slice(0, 12000);
  }
  return undefined;
};

const getGuidedLesson = (moduleContext: TutorModuleContext | null): GuidedLesson => {
  if (!moduleContext) {
    return { steps: [], prompts: DEFAULT_SUGGESTIONS };
  }

  const contextSteps = getContextSteps(moduleContext).slice(0, 4);
  if (contextSteps.length > 0) {
    const firstStep = contextSteps[0].title;
    return {
      steps: contextSteps.map((step, index) => `${String(index + 1).padStart(2, '0')} · ${step.title}`),
      prompts: [
        `Explain “${firstStep}” in simple terms.`,
        `Walk me through the next idea in ${moduleContext.title}.`,
        `What should I predict before I try this module in a circuit?`,
        `Can you check my current circuit against ${moduleContext.title}?`,
      ],
    };
  }

  const lookup = `${moduleContext.id} ${moduleContext.title} ${moduleContext.description ?? ''}`.toLowerCase();
  const matched = MODULE_GUIDES.find(({ matches }) => matches.test(lookup));
  if (matched) return matched.guide;

  return {
    steps: [
      `01 · Orient around the core idea in ${moduleContext.title}.`,
      '02 · Connect that idea to a small, concrete circuit.',
      '03 · Predict an outcome and reflect on the result.',
    ],
    prompts: [
      `What is the main idea in ${moduleContext.title}?`,
      `Walk me through ${moduleContext.title} step by step.`,
      `What should I predict before testing ${moduleContext.title}?`,
      `Help me check my current circuit for ${moduleContext.title}.`,
    ],
  };
};

const makeIntroMessage = (moduleContext: TutorModuleContext | null): string => {
  if (!moduleContext) {
    return "Hi! I'm your AI tutor. Ask anything about quantum computing, or share a circuit and I'll help you reason through it.";
  }

  const description = moduleContext.description?.trim();
  const firstStep = getContextSteps(moduleContext)[0]?.title;
  return [
    `I'm your personalised virtual human tutor. Today we'll learn ${moduleContext.title} together.`,
    description ? `We'll focus on ${description}` : '',
    firstStep ? `We'll begin with ${firstStep}, then turn the idea into a visual experiment.` : '',
    'I’ll guide you through the ideas, a prediction, and a small circuit experiment at your pace.',
  ].filter(Boolean).join(' ');
};

const makeDemoReply = (question: string, attached?: Circuit, moduleContext: TutorModuleContext | null = null): string => {
  const q = question.toLowerCase();
  const hasCircuit = Boolean(attached);
  const head = moduleContext?.title;
  const sourceContext = moduleContext
    ? getModuleSourceContext(moduleContext)?.replace(/\s+/g, ' ').slice(0, 1200)
    : undefined;

  const intro = head
    ? `Great — let's work through your **${head}** module step by step.${sourceContext ? `\n\nSource-backed lesson context: ${sourceContext}\n\n` : ' '}`
    : '';

  if (/hi|hello|hey|namaste|start/.test(q) && !hasCircuit) {
    return `${intro}Hi! Great to see you. I'm your quantum computing tutor — ask me anything about qubits, gates, Bloch spheres, algorithms, or paste/write a circuit and I'll help you debug it. 💡`;
  }

  if (hasCircuit) {
    return `${intro}${buildOfflineCircuitReply(question, attached!)}`;
  }

  if (/superposition/.test(q)) {
    return (
      `${intro}**Superposition** is one of the two "spooky" quantum superpowers, along with entanglement.\n\n` +
      `Classical bit = 0 OR 1.\n` +
      `Qubit = α|0⟩ + β|1⟩ (a linear combination *at the same time*).\n\n` +
      `The numbers α, β are complex amplitudes. When you **measure** the qubit, nature "picks" |0⟩ with probability |α|² or |1⟩ with probability |β|².\n\n` +
      `🔨 Try it in the circuit builder:\n` +
      "```\nqc = QuantumCircuit(1, 1)\nqc.h(0)\nqc.measure(0, 0)\n```\n" +
      `The H gate puts qubit 0 into (|0⟩ + |1⟩)/√2 — running with many shots will give you ~50/50 0s and 1s.`
    );
  }

  if (/hadamard|h gate|h\(/.test(q)) {
    return (
      `${intro}The **Hadamard (H) gate** creates superposition.\n\n` +
      `Matrix:\n` +
      `H = 1/√2 · [[1, 1], [1, -1]]\n\n` +
      `Effect on the Bloch sphere:\n` +
      `- It's a 180° rotation around the axis halfway between X and Z.\n` +
      `- H maps |0⟩ → |+⟩ = (|0⟩+|1⟩)/√2\n` +
      `- H maps |1⟩ → |-⟩ = (|0⟩−|1⟩)/√2\n` +
      `- Applying H twice returns you to the original state (H² = I).\n\n` +
      `⏩ Shortcut: want a Bell state? Try H(0) followed by CNOT(0, 1)!`
    );
  }

  if (/bloch|sphere/.test(q)) {
    return (
      `${intro}The **Bloch sphere** visualizes *one* qubit state as a point on a unit sphere.\n\n` +
      `- North pole (|0⟩), south pole (|1⟩)\n` +
      `- Equator = pure superposition states (e.g. |+⟩, |−⟩, |i⟩)\n` +
      `- Any single-qubit gate = a rotation (X, Y, Z, H are axes).\n\n` +
      `Tip: In QVANTA, whenever you add a gate, the Bloch panel immediately rotates the state. Drop an H gate on |0⟩ and you'll see the state vector land on the X-axis!`
    );
  }

  if (/bell state|entangle|cnot/.test(q)) {
    return (
      `${intro}A **Bell state** is the simplest 2-qubit entangled state.\n\n` +
      `Build it like this:\n` +
      "```\nqc = QuantumCircuit(2)\nqc.h(0)\nqc.cx(0, 1)  # CNOT: control=0, target=1\n```\n" +
      `Result: |Φ⁺⟩ = (|00⟩ + |11⟩)/√2\n\n` +
      `Why is this "entangled"? You cannot write it as (a|0⟩+b|1⟩)⊗(c|0⟩+d|1⟩). Measuring qubit 0 instantly tells you the outcome of qubit 1, no matter how far apart they are.\n\n` +
      `Run 2048 shots on this circuit — you should see roughly 50% 00 and 50% 11, and *almost no* 01 / 10. That's entanglement!`
    );
  }

  if (/measure/.test(q)) {
    return (
      `${intro}**Measurement** in quantum computing is destructive — it collapses the state permanently.\n\n` +
      `Rule:\n` +
      `- Before measurement: qubit lives in α|0⟩ + β|1⟩\n` +
      `- After measurement: classical bit is 0 with |α|², 1 with |β|²; qubit snaps to that classical state.\n\n` +
      `In Qiskit-style syntax, write:\n` +
      "```\nqc = QuantumCircuit(1, 1)\nqc.h(0)\nqc.measure(0, 0)\n```\n" +
      `Shots repeat the experiment so you can *estimate* the probabilities.`
    );
  }


  if (/deutsch|grover|shor|algorithm/.test(q)) {
    return (
      `${intro}🧠 Core quantum algorithms overview:\n\n` +
      `1. **Deutsch-Jozsa** — determines if a Boolean function is constant or balanced *in one query* (classical needs O(2ⁿ)). Proof that quantum *can* outperform classical.\n\n` +
      `2. **Grover search** — unstructured search in O(√N) time (classical O(N)). Useful for database-style problems.\n\n` +
      `3. **Shor's algorithm** — integer factorization in *polynomial* time (best classical is sub-exponential). This is why post-quantum cryptography is being standardized.\n\n` +
      `Pick one, and I'll walk you through the circuit diagram step-by-step!`
    );
  }

  return (
    `${intro}Got your question: "${question.slice(0, 120)}".\n\n` +
    `Here's my ground-rule teaching style:\n\n` +
    `1. I start with a simple *intuition* (no math first).\n` +
    `2. Then I write a *tiny runnable circuit* you can paste into the editor.\n` +
    `3. Then I explain the math/Bloch-sphere picture if you ask for it.\n\n` +
    `Try clicking one of the suggestion chips below, or ask me about: superposition, H gate, CNOT, Bloch sphere, Bell state, Grover, Shor, or just paste a circuit and ask "debug this"!`
  );
};

export interface ChatPanelProps {
  moduleContext?: TutorModuleContext | null;
  avatarReady?: boolean;
}

const ChatPanel: React.FC<ChatPanelProps> = ({ moduleContext: handedOffModule, avatarReady = false }) => {
  const user = useAuthStore((s) => s.user);
  const [sessionModuleContext] = React.useState<TutorModuleContext | null>(readSessionModuleContext);
  const moduleContext = handedOffModule === undefined ? sessionModuleContext : handedOffModule;
  const introMessage = makeIntroMessage(moduleContext);
  const guidedLesson = React.useMemo(() => getGuidedLesson(moduleContext), [moduleContext]);
  const [threads, setThreads] = React.useState<Thread[]>([]);
  const [activeId, setActiveId] = React.useState<string>(NEW_CONV_ID);
  const [input, setInput] = React.useState<string>(() => readSessionPrompt() ?? '');
  const [attachCircuit, setAttachCircuit] = React.useState(true);
  const [sending, setSending] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [latestEvidence, setLatestEvidence] = React.useState<TutorEvidence | null>(null);
  const listRef = React.useRef<HTMLDivElement>(null);
  const bootstrappedRef = React.useRef(false);
  const spokenModuleRef = React.useRef<string | null>(null);
  const liveQubits = useCircuitStore((state) => state.qubits);
  const liveTimesteps = useCircuitStore((state) => state.timesteps);
  const liveOperations = useCircuitStore((state) => state.operations);
  const liveCircuit = React.useMemo<Circuit>(() => ({
    qubits: liveQubits,
    timesteps: liveTimesteps,
    operations: liveOperations,
  }), [liveOperations, liveQubits, liveTimesteps]);
  const liveCircuitAnalysis = React.useMemo(
    () => analyzeOfflineCircuit(liveCircuit),
    [liveCircuit],
  );

  const activeThread = threads.find((t) => t.id === activeId);
  const messages: TutorMessage[] = activeThread?.messages ?? [];

  // load conversations on mount; also inject initial module prompt if present
  React.useEffect(() => {
    if (bootstrappedRef.current) return;
    bootstrappedRef.current = true;

    let cancelled = false;
    const load = async () => {
      try {
         const res = await apiClient.get<Conversation[] | { data?: Conversation[] }>('/tutor/conversations');
         if (cancelled || !res.data) return;
         const conversations = Array.isArray(res.data) ? res.data : res.data.data ?? [];
         const ts: Thread[] = conversations.map((c) => ({
          id: c.id,
          title: c.title,
          messages: Array.isArray(c.messages) ? c.messages : [],
        }));
        setThreads(ts);
        if (!moduleContext && ts.length > 0 && activeId === NEW_CONV_ID) {
          setActiveId(ts[0].id);
        }
      } catch {
        // ignore for MVP — fall back to purely client-side thread
      }
    };
    void load();

    // Auto-send initial prompt from Dashboard module (if any)
    const autoPrompt = consumeSessionPrompt();
    if (autoPrompt) {
      setTimeout(() => {
        setInput(autoPrompt);
        // Focus happens on rerender; explicit send deferred to avoid double-mount effects
        // in StrictMode — user can just press Enter, or we can send now:
        queueMicrotask(() => {
          void (async () => {
            /* executed below via helper once state committed */
          })();
        });
      }, 250);
    }
  }, [activeId]);

  React.useEffect(() => {
    const el = listRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, [messages.length, sending]);

  const synthesizeIfPossible = (text: string, voiceIdx: number) => {
    const w = window as any;
    if (typeof w.__qvantaTutorSpeak === 'function') {
      try {
        w.__qvantaTutorSpeak(text, voiceIdx);
      } catch {
        /* ignore */
      }
    }
  };

  React.useEffect(() => {
    if (!moduleContext || !avatarReady || spokenModuleRef.current === moduleContext.id) return;

    const w = window as any;
    if (typeof w.__qvantaTutorSpeak !== 'function') return;

    spokenModuleRef.current = moduleContext.id;
    synthesizeIfPossible(introMessage, user?.avatarPreset ?? 0);
  }, [avatarReady, introMessage, moduleContext, user?.avatarPreset]);

  const appendMessages = (id: string, toAdd: TutorMessage[]) => {
    setThreads((prev) => {
      const existing = prev.find((t) => t.id === id);
      const next: Thread = existing
        ? { ...existing, messages: [...existing.messages, ...toAdd] }
        : {
            id,
            title: toAdd[0]?.content.slice(0, 48),
            messages: toAdd,
          };
      const match = prev.find((t) => t.id === id);
      return match
        ? prev.map((t) => (t.id === id ? next : t))
        : [next, ...prev];
    });
  };

  const reconcileThreadId = (fromId: string, toId: string) => {
    if (!toId || fromId === toId) return;

    setThreads((prev) => {
      const source = prev.find((thread) => thread.id === fromId);
      const destination = prev.find((thread) => thread.id === toId);
      if (!source) return prev;

      const merged: Thread = {
        id: toId,
        title: destination?.title ?? source.title,
        messages: [...(destination?.messages ?? []), ...source.messages],
      };

      return [merged, ...prev.filter((thread) => thread.id !== fromId && thread.id !== toId)];
    });
    setActiveId(toId);
  };

  const sendMessage = async () => {
    const trimmed = input.trim();
    if (!trimmed || sending) return;
    setError(null);
    setSending(true);

    const userMsg: TutorMessage = {
      id: `u_${Date.now()}`,
      conversationId: activeId === NEW_CONV_ID ? '' : activeId,
      role: 'user',
      content: trimmed,
      createdAt: new Date().toISOString(),
    };

    let circuitContext: Circuit | undefined;
    if (attachCircuit) {
      const s = useCircuitStore.getState();
      circuitContext = {
        qubits: s.qubits,
        timesteps: s.timesteps,
        operations: s.operations,
      };
      userMsg.circuitContext = circuitContext;
    }

    let workingId = activeId;
    if (workingId === NEW_CONV_ID) {
      workingId = `c_${Date.now()}`;
      setActiveId(workingId);
    }
    appendMessages(workingId, [userMsg]);
    setInput('');

    try {
      const payload: any = {
        prompt: trimmed,
        conversationId:
          workingId === NEW_CONV_ID || workingId.startsWith('c_')
            ? undefined
            : workingId,
      };
      if (attachCircuit) payload.circuit = circuitContext;
      if (moduleContext) {
        payload.moduleContext = {
          id: moduleContext.id,
          title: moduleContext.title,
          content: getModuleSourceContext(moduleContext),
        };
      }

      let replyText: string;
      let serverConversationId: string | undefined;
      let ragContext: string[] | undefined;
      let tutorEvidence: TutorEvidence | undefined;

      try {
        const res = await apiClient.post<{
           reply: string | TutorMessage;
           conversationId?: string;
           ragContext?: string[];
            tutorEvidence?: TutorEvidence;
            message?: TutorMessage;
           conversation?: { id?: string };
         }>('/tutor/chat', payload, { timeout: 60000 });
         const reply = res.data?.reply;
         replyText = typeof reply === 'string'
           ? reply
           : reply?.content ??
             res.data?.message?.content ??
             makeDemoReply(trimmed, circuitContext, moduleContext);
         serverConversationId = res.data?.conversationId ?? res.data?.conversation?.id ?? (typeof reply === 'object' ? reply?.conversationId : undefined);
          ragContext = res.data?.ragContext ?? (typeof reply === 'object' ? reply?.ragContext : undefined);
          tutorEvidence = res.data?.tutorEvidence ?? (typeof reply === 'object' ? reply?.tutorEvidence : undefined);
          setLatestEvidence(tutorEvidence ?? null);
       } catch (serverErr: any) {
        // Demo-mode fallback — answer offline from knowledge base
         replyText = makeDemoReply(trimmed, circuitContext, moduleContext);
         setLatestEvidence({
           mode: 'offline',
           latencyMs: 0,
           sources: moduleContext ? [moduleContext.title] : [],
           circuitTraceSteps: liveCircuitAnalysis.timeline.filter((line) => line.startsWith('•')).length,
           warningCount: liveCircuitAnalysis.warnings.length,
           hasPredictionQuestion: /\?/m.test(replyText),
           reason: 'API unavailable; offline QVANTA circuit and lesson tutor handled the response locally.',
         });
         setError(null); // not an error: demo-mode response
       }

       if (serverConversationId && serverConversationId !== workingId) {
         reconcileThreadId(workingId, serverConversationId);
       }

       const assistantMsg: TutorMessage = {
        id: `a_${Date.now()}`,
        conversationId: serverConversationId ?? workingId,
        role: 'assistant',
        content: replyText,
         ragContext,
         circuitContext,
         tutorEvidence,
         createdAt: new Date().toISOString(),
      };
      appendMessages(serverConversationId ?? workingId, [assistantMsg]);
      synthesizeIfPossible(replyText, user?.avatarPreset ?? 0);
    } catch (finalErr: any) {
      const msg =
        finalErr?.response?.data?.error?.message ??
        finalErr?.message ??
        'Unexpected error while reaching the tutor.';
      setError(msg);
      const fail: TutorMessage = {
        id: `a_${Date.now()}`,
        conversationId: workingId,
        role: 'assistant',
        content: `⚠️ ${msg}`,
        createdAt: new Date().toISOString(),
      };
      appendMessages(workingId, [fail]);
    } finally {
      setSending(false);
    }
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      void sendMessage();
    }
  };

  const suggestions = guidedLesson.prompts;

  return (
    <div className="flex h-full flex-col">
      <div className="flex flex-wrap items-center gap-2 border-b border-bg-800 px-4 py-2">
        <select
          value={activeId}
          onChange={(e) => setActiveId(e.target.value)}
          className="rounded-md border border-bg-700 bg-bg-900 px-2 py-1 text-xs text-text-200 outline-none focus:border-primary-500"
        >
          <option value={NEW_CONV_ID}>＋ New conversation</option>
          {threads.map((t) => (
            <option key={t.id} value={t.id}>
              {t.title
                ? `${t.title.slice(0, 32)}${t.title.length > 32 ? '…' : ''}`
                : `Conversation ${t.id.slice(0, 6)}`}{' '}
              ({t.messages.length})
            </option>
          ))}
        </select>
        <label className="ml-auto flex items-center gap-2 text-xs text-text-400">
          <input
            type="checkbox"
            checked={attachCircuit}
            onChange={(e) => setAttachCircuit(e.target.checked)}
            className="h-3.5 w-3.5 rounded border-bg-700 bg-bg-900 accent-primary-500"
          />
          Attach current circuit context
        </label>
      </div>

      {attachCircuit && (
        <div className="border-b border-bg-800 bg-bg-950/45 px-4 py-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-cyan-300">Live circuit teacher view</p>
              <p className="mt-1 text-xs text-text-500">
                {liveCircuit.qubits} qubits · {liveCircuit.operations.length} operations · click a step to ask about it
              </p>
            </div>
            <span className="rounded-full border border-bg-700 bg-bg-900 px-2 py-1 text-[10px] text-text-500">
              {liveCircuitAnalysis.warnings.length ? `${liveCircuitAnalysis.warnings.length} note${liveCircuitAnalysis.warnings.length === 1 ? '' : 's'}` : 'No warnings'}
            </span>
          </div>
          {liveCircuit.operations.length > 0 ? (
            <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
              {liveCircuitAnalysis.timeline
                .filter((line) => line.startsWith('•'))
                .slice(0, 6)
                .map((line, index) => (
                  <button
                    key={`${line}-${index}`}
                    type="button"
                    onClick={() => setInput(`Explain this exact circuit step to me in simple terms: ${line}`)}
                    className="min-w-[190px] max-w-[250px] rounded-lg border border-bg-700 bg-bg-900/80 px-3 py-2 text-left text-[11px] leading-4 text-text-300 transition hover:border-cyan-500/50 hover:bg-cyan-500/5 hover:text-text-100"
                  >
                    {line.replace(/^•\s*/, '')}
                  </button>
                ))}
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setInput('What should I place first in this empty circuit, and why?')}
              className="mt-3 rounded-lg border border-dashed border-bg-700 px-3 py-2 text-left text-xs text-text-400 transition hover:border-cyan-500/50 hover:text-text-200"
            >
              The circuit is empty. Ask me what to place first and I’ll suggest a small experiment.
            </button>
          )}
        </div>
      )}

      <div ref={listRef} className="flex-1 overflow-y-auto px-4 py-4">
        {messages.length === 0 ? (
          <div className="mx-auto max-w-lg space-y-4 pt-6">
            <div className="rounded-xl border border-primary-800/40 bg-primary-950/30 p-5">
              <h3 className="text-sm font-semibold text-primary-200">
                {moduleContext ? introMessage : "Hi! I'm your AI tutor 👋"}
              </h3>
              <p className="mt-1.5 text-sm text-text-300">
                {moduleContext
                  ? 'We will move from intuition to a prediction and then to a small circuit experiment. Choose a prompt below to begin.'
                  : 'Ask anything about quantum computing. My answers are grounded in QVANTA lesson material and I can analyze your current circuit for errors or optimizations — even offline!'}
              </p>
            </div>
            {moduleContext && (
              <div className="rounded-xl border border-bg-700 bg-bg-950/50 p-4">
                <div className="text-xs uppercase tracking-wide text-text-500">Guided lesson</div>
                <ol className="mt-3 space-y-2">
                  {guidedLesson.steps.map((step) => (
                    <li key={step} className="flex items-start gap-2 text-sm text-text-300">
                      <span className="mt-0.5 text-primary-300">→</span>
                      <span>{step}</span>
                    </li>
                  ))}
                </ol>
              </div>
            )}
            <div className="space-y-2">
              <div className="text-xs uppercase tracking-wide text-text-500">
                {moduleContext ? 'Suggested prompts:' : 'Try asking:'}
              </div>
              {suggestions.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => {
                    setInput(s);
                  }}
                  className="block w-full rounded-lg border border-bg-700 bg-bg-900/50 px-3 py-2 text-left text-sm text-text-300 transition hover:border-primary-700 hover:bg-bg-800 hover:text-text-100"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="mx-auto max-w-2xl space-y-4">
            {messages.map((m) => (
              <div
                key={m.id}
                className={`flex ${
                  m.role === 'user' ? 'justify-end' : 'justify-start'
                }`}
              >
                <div
                  className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
                    m.role === 'user'
                      ? 'bg-primary-600 text-white'
                      : 'border border-bg-700 bg-bg-900 text-text-100'
                  }`}
                >
                  <div className="whitespace-pre-wrap break-words">
                    {m.content}
                  </div>
                  {m.ragContext && m.ragContext.length > 0 && (
                    <div
                      className={`mt-2 flex flex-wrap gap-1 text-[10px] ${
                        m.role === 'user'
                          ? 'text-primary-100/80'
                          : 'text-text-500'
                      }`}
                    >
                      {m.ragContext.slice(0, 3).map((r, i) => (
                        <span
                          key={i}
                          className="rounded-full bg-bg-800 px-2 py-0.5"
                        >
                          📚 {r.slice(0, 28)}
                          {r.length > 28 ? '…' : ''}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}
            {sending && (
              <div className="flex justify-start">
                <div className="rounded-2xl border border-bg-700 bg-bg-900 px-4 py-3 text-sm text-text-100">
                  <span className="inline-flex gap-1">
                    <span
                      className="h-1.5 w-1.5 animate-bounce rounded-full bg-primary-400"
                      style={{ animationDelay: '0ms' }}
                    />
                    <span
                      className="h-1.5 w-1.5 animate-bounce rounded-full bg-primary-400"
                      style={{ animationDelay: '150ms' }}
                    />
                    <span
                      className="h-1.5 w-1.5 animate-bounce rounded-full bg-primary-400"
                      style={{ animationDelay: '300ms' }}
                    />
                  </span>
                </div>
              </div>
            )}
            {error && !sending && (
              <div className="rounded-lg border border-red-900/50 bg-red-950/30 px-3 py-2 text-xs text-red-300">
                {error}
              </div>
            )}
          </div>
        )}
      </div>

      <div className="border-t border-bg-800 p-3">
        <div className="flex items-end gap-2">
          <div className="flex-1">
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={onKeyDown}
              placeholder="Ask the tutor… (Enter to send)"
            />
          </div>
          <Button
            variant="primary"
            onClick={() => {
              void sendMessage();
            }}
            loading={sending}
          >
            Send
          </Button>
        </div>
        <div className="mt-1.5 px-1 text-[11px] text-text-500">
          Tutor works both ways: connected RAG, or an offline built-in
          knowledge base for demo mode.
        </div>
        <div className="mt-3">
          <TutorProofPanel latestEvidence={latestEvidence} />
        </div>
      </div>
    </div>
  );
};

export default ChatPanel;
