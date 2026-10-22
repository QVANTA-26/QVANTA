import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Badge, Button, Card, CardContent, CardHeader, CardTitle } from '@qvanta/ui';
import { useLearningJourney } from '@/hooks/useLearningJourney';
import LessonVisualization from '@/components/learning/LessonVisualization';
import QuantumStateExplainer from '@/components/learning/QuantumStateExplainer';
import { useAuthStore } from '@/store/auth';
import {
  buildLearningTutorHandoff,
  learningProgressPercent,
  type LearningModule,
  type LearningModuleStatus,
  type LearningStep,
  type ModuleAccent,
} from '@/lib/learning';
import { CURRICULUM } from '@/components/curriculum/curriculum';
import { saveCurriculumCircuitHandoff } from '@/lib/curriculum-circuit';
import {
  COMMUNITY_CONTESTS,
  getContestDeadlineLabel,
  getContestRewardLabel,
  getDiscussionTimeLabel,
  readDiscussionVotes,
  readDiscussions,
  readRegisteredContests,
  writeDiscussionVotes,
  writeDiscussions,
  writeRegisteredContests,
  type ContestFilter,
  type Discussion,
  type DiscussionTopic,
} from '@/data/learning-community';

type LearningSection = 'roadmap' | 'contests' | 'discussions';

const TUTOR_PROMPT_KEY = 'qvanta.tutor.initialPrompt';
const TUTOR_MODULE_KEY = 'qvanta.tutor.initialModule';

const ACCENT_STYLES: Record<ModuleAccent, { border: string; icon: string; glow: string }> = {
  violet: {
    border: 'hover:border-violet-500/50',
    icon: 'bg-violet-500/15 text-violet-300 ring-violet-500/20',
    glow: 'from-violet-500/20'
  },
  cyan: {
    border: 'hover:border-cyan-500/50',
    icon: 'bg-cyan-500/15 text-cyan-300 ring-cyan-500/20',
    glow: 'from-cyan-500/20'
  },
  fuchsia: {
    border: 'hover:border-fuchsia-500/50',
    icon: 'bg-fuchsia-500/15 text-fuchsia-300 ring-fuchsia-500/20',
    glow: 'from-fuchsia-500/20'
  },
  amber: {
    border: 'hover:border-amber-500/50',
    icon: 'bg-amber-500/15 text-amber-300 ring-amber-500/20',
    glow: 'from-amber-500/20'
  }
};

const IconBook: React.FC<{ className?: string }> = ({ className }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
    <path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H20v16H6.5A2.5 2.5 0 0 0 4 21.5v-16Z" />
    <path d="M4 5.5v16M8 7h8M8 11h7" />
  </svg>
);

const IconTrophy: React.FC<{ className?: string }> = ({ className }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
    <path d="M8 21h8M12 17v4M7 4h10v5a5 5 0 0 1-10 0V4Z" />
    <path d="M7 6H4v2a4 4 0 0 0 4 4M17 6h3v2a4 4 0 0 1-4 4" />
  </svg>
);

const IconMessage: React.FC<{ className?: string }> = ({ className }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
    <path d="M20 11.5a7.5 7.5 0 0 1-8 7.5 8.8 8.8 0 0 1-3.5-.7L4 20l1.5-3.6A7.1 7.1 0 0 1 4 11.5 7.5 7.5 0 0 1 12 4a7.5 7.5 0 0 1 8 7.5Z" />
    <path d="M8 12h.01M12 12h.01M16 12h.01" />
  </svg>
);

const IconSparkles: React.FC<{ className?: string }> = ({ className }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
    <path d="m12 3-1.2 4.3L7 9l3.8 1.7L12 15l1.2-4.3L17 9l-3.8-1.7L12 3ZM19 14l-.7 2.3L16 17l2.3.7L19 20l.7-2.3L22 17l-2.3-.7L19 14ZM5 14l-.6 1.8L3 16.5l1.4.7L5 19l.6-1.8 1.4-.7-1.4-.7L5 14Z" />
  </svg>
);

const IconArrowUp: React.FC<{ className?: string }> = ({ className }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
    <path d="m6 11 6-6 6 6M12 5v14" />
  </svg>
);

const IconArrowLeft: React.FC<{ className?: string }> = ({ className }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
    <path d="m15 18-6-6 6-6M9 12h10" />
  </svg>
);

const IconArrowRight: React.FC<{ className?: string }> = ({ className }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
    <path d="m9 18 6-6-6-6M5 12h10" />
  </svg>
);

const IconCheck: React.FC<{ className?: string }> = ({ className }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
    <path d="m5 12 4 4L19 6" />
  </svg>
);

const statusLabel = (status: LearningModuleStatus): string => {
  if (status === 'completed') return 'Completed';
  if (status === 'in_progress') return 'In progress';
  return 'Not started';
};

const statusVariant = (status: LearningModuleStatus): 'success' | 'primary' | 'secondary' => {
  if (status === 'completed') return 'success';
  if (status === 'in_progress') return 'primary';
  return 'secondary';
};

const LearnPage: React.FC = () => {
  const navigate = useNavigate();
  const user = useAuthStore((state) => state.user);
  const {
    catalog,
    modules: learningModules,
    remoteAvailable,
    progressSource,
    progressSyncing,
    totalXp,
    averageMastery,
    saveStep,
    submitCheckpoint,
    completeModule: completeLearningModule,
    getProgress,
    getProgressRecord,
  } = useLearningJourney();
  const [activeSection, setActiveSection] = React.useState<LearningSection>('roadmap');
  const [selectedModuleId, setSelectedModuleId] = React.useState<string | null>(null);
  const [lessonStep, setLessonStep] = React.useState(0);
  const [checkpointAnswer, setCheckpointAnswer] = React.useState<string | null>(null);
  const [checkpointFeedback, setCheckpointFeedback] = React.useState<{
    correct: boolean;
    message: string;
    xpAwarded: number;
  } | null>(null);
  const [checkpointSubmitting, setCheckpointSubmitting] = React.useState(false);
  const [completionMessage, setCompletionMessage] = React.useState<string | null>(null);
  const resumeModuleIdRef = React.useRef<string | null>(null);
  const [toast, setToast] = React.useState<string | null>(null);
  const [contestFilter, setContestFilter] = React.useState<ContestFilter>('all');
  const [selectedContestId, setSelectedContestId] = React.useState(COMMUNITY_CONTESTS[0]?.id ?? '');
  const [registeredContests, setRegisteredContests] = React.useState<Record<string, boolean>>(readRegisteredContests);
  const [discussionFilter, setDiscussionFilter] = React.useState<DiscussionTopic>('all');
  const [discussionSearch, setDiscussionSearch] = React.useState('');
  const [discussions, setDiscussions] = React.useState<Discussion[]>(readDiscussions);
  const [selectedDiscussionId, setSelectedDiscussionId] = React.useState(() => readDiscussions()[0]?.id ?? '');
  const [votedDiscussions, setVotedDiscussions] = React.useState<Record<string, boolean>>(readDiscussionVotes);
  const [showComposer, setShowComposer] = React.useState(false);
  const [draftTitle, setDraftTitle] = React.useState('');
  const [draftBody, setDraftBody] = React.useState('');
  const [draftTopic, setDraftTopic] = React.useState<Exclude<DiscussionTopic, 'all'>>('concepts');
  const [composerError, setComposerError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!toast) return undefined;
    const timeout = window.setTimeout(() => setToast(null), 4200);
    return () => window.clearTimeout(timeout);
  }, [toast]);

  React.useEffect(() => {
    writeRegisteredContests(registeredContests);
  }, [registeredContests]);

  React.useEffect(() => {
    writeDiscussions(discussions);
  }, [discussions]);

  React.useEffect(() => {
    writeDiscussionVotes(votedDiscussions);
  }, [votedDiscussions]);

  const showToast = (message: string) => setToast(message);

  const writeTutorHandoff = (module: LearningModule, lesson?: LearningStep) => {
    const handoff = buildLearningTutorHandoff(module, lesson);
    const currentStep = lesson ?? module.lessons[0];
    const prompt = [
      `Let's study the module "${handoff.title}" together.`,
      handoff.description ? `Context: ${handoff.description}` : '',
      currentStep ? `Start with the lesson step "${currentStep.title}".` : '',
      'Please guide me through this lesson step by step with interactive examples.',
    ].filter(Boolean).join(' ');

    try {
      sessionStorage.setItem(TUTOR_PROMPT_KEY, prompt);
      sessionStorage.setItem(TUTOR_MODULE_KEY, JSON.stringify(handoff));
    } catch {
      // Tutor still opens if sessionStorage is unavailable.
    }
  };

  const selectedModule = learningModules.find((module) => module.id === selectedModuleId) ?? null;
  const completedCount = learningModules.filter((module) => getProgress(module) === 'completed').length;
  const hasStartedLearning = learningModules.some((module) => getProgress(module) !== 'not_started');
  const inProgressModule = learningModules.find((module) => getProgress(module) === 'in_progress') ?? learningModules[0];
  const overallProgress = Math.round((completedCount / Math.max(1, learningModules.length)) * 100);

  React.useEffect(() => {
    if (!selectedModule || !resumeModuleIdRef.current || resumeModuleIdRef.current !== selectedModule.id) return;
    if (learningModules.length === 0) return;

    const record = getProgressRecord(selectedModule);
    const nextStep = Math.max(0, Math.min(record.currentStep, Math.max(0, selectedModule.lessons.length - 1)));
    setLessonStep(nextStep);
    resumeModuleIdRef.current = null;
  }, [getProgressRecord, learningModules.length, selectedModule]);

  const visibleContests = React.useMemo(
    () => COMMUNITY_CONTESTS.filter((contest) => contestFilter === 'all' || contest.level === contestFilter),
    [contestFilter]
  );
  const selectedContest = visibleContests.find((contest) => contest.id === selectedContestId) ?? visibleContests[0] ?? null;

  const visibleDiscussions = React.useMemo(() => {
    const query = discussionSearch.trim().toLowerCase();
    return discussions.filter((discussion) => {
      const matchesTopic = discussionFilter === 'all' || discussion.topic === discussionFilter;
      const matchesSearch = !query || `${discussion.title} ${discussion.body} ${discussion.author}`.toLowerCase().includes(query);
      return matchesTopic && matchesSearch;
    });
  }, [discussionFilter, discussionSearch, discussions]);
  const selectedDiscussion = visibleDiscussions.find((discussion) => discussion.id === selectedDiscussionId) ?? visibleDiscussions[0] ?? null;

  const changeSection = (section: LearningSection) => {
    setActiveSection(section);
    if (section !== 'roadmap') setSelectedModuleId(null);
  };

  const openModule = (moduleId: string) => {
    setActiveSection('roadmap');
    setSelectedModuleId(moduleId);
    const module = learningModules.find((candidate) => candidate.id === moduleId);
    if (!module) return;
    const record = getProgressRecord(module);
    const resumeStep = Math.max(0, Math.min(record.currentStep, Math.max(0, module.lessons.length - 1)));
    resumeModuleIdRef.current = module.id;
    setLessonStep(resumeStep);
    setCheckpointAnswer(null);
    setCheckpointFeedback(null);
    setCompletionMessage(null);
    writeTutorHandoff(module, module.lessons[resumeStep] ?? module.lessons[0]);
    void saveStep(moduleId, resumeStep);
  };

  const startTutorForModule = (module: LearningModule) => {
    const record = getProgressRecord(module);
    const resumeStep = Math.max(0, Math.min(record.currentStep, Math.max(0, module.lessons.length - 1)));
    writeTutorHandoff(module, module.lessons[resumeStep] ?? module.lessons[0]);
    void saveStep(module.id, resumeStep);
    navigate('/tutor');
  };

  const openCircuitForModule = (module: LearningModule) => {
    const sourceModule = module.sourceModuleId === undefined
      ? undefined
      : CURRICULUM.modules.find((candidate) => candidate.id === module.sourceModuleId);

    if (sourceModule) {
      saveCurriculumCircuitHandoff(sourceModule);
      navigate(`/circuit/new?module=${sourceModule.id}`);
      return;
    }

    navigate('/circuit/new');
  };

  const handleCheckpointAnswer = async (answerId: string) => {
    if (!selectedModule || checkpointSubmitting) return;
    const step = selectedModule.lessons[lessonStep] ?? selectedModule.lessons[0];
    const checkpoint = step?.checkpoint;
    if (!step || !checkpoint) return;

    const option = checkpoint.options.find((candidate) => candidate.id === answerId);
    if (!option) return;

    const localCorrect = answerId === checkpoint.correctOptionId;
    setCheckpointAnswer(answerId);
    setCheckpointSubmitting(true);

    try {
      const result = await submitCheckpoint({
        moduleId: selectedModule.id,
        stepId: step.id,
        answerId,
        answer: option.label,
        correct: localCorrect,
        currentStep: lessonStep,
        totalSteps: selectedModule.lessons.length,
      });
      setCheckpointFeedback({
        correct: result.correct,
        message: result.feedback
          ?? (result.correct ? checkpoint.explanation : 'Not quite. Re-read the step and try the prediction again.'),
        xpAwarded: result.xpAwarded ?? 0,
      });
    } catch {
      setCheckpointFeedback({
        correct: localCorrect,
        message: localCorrect ? checkpoint.explanation : 'Not quite. Re-read the step and try the prediction again.',
        xpAwarded: localCorrect ? 25 : 0,
      });
    } finally {
      setCheckpointSubmitting(false);
    }
  };

  const selectLessonStep = (nextStep: number) => {
    if (!selectedModule) return;
    const boundedStep = Math.max(0, Math.min(nextStep, Math.max(0, selectedModule.lessons.length - 1)));
    setLessonStep(boundedStep);
    setCheckpointAnswer(null);
    setCheckpointFeedback(null);
    setCompletionMessage(null);
    void saveStep(selectedModule.id, boundedStep);
  };

  const completeModule = async () => {
    if (!selectedModule) return;
    const priorXp = getProgressRecord(selectedModule).xp;
    const record = await completeLearningModule(selectedModule.id, Math.max(0, selectedModule.lessons.length - 1));
    setCompletionMessage(`${selectedModule.title} complete. You earned ${Math.max(0, record.xp - priorXp)} XP for finishing this module.`);
    showToast(`${selectedModule.title} complete — your progress is synced when the account endpoint is available.`);
  };

  const openNextFocusModule = () => {
    if (!selectedModule) return;
    const nextModule = learningModules.find((module) => module.order === selectedModule.order + 1)
      ?? learningModules.find((module) => module.id !== selectedModule.id && getProgress(module) !== 'completed');
    if (nextModule) {
      openModule(nextModule.id);
      return;
    }
    setSelectedModuleId(null);
  };

  const handleNextLesson = () => {
    if (!selectedModule) return;
    const step = selectedModule.lessons[lessonStep] ?? selectedModule.lessons[0];
    const record = getProgressRecord(selectedModule);
    const savedCheckpointPassed = Boolean(
      step && (record.checkpoints[step.id]?.correct === true
        || (record.checkpoint.correct === true && record.currentStep === lessonStep)),
    );
    const requiresCheckpoint = Boolean(step?.checkpoint);
    const checkpointPassed = !requiresCheckpoint
      || checkpointFeedback?.correct === true
      || savedCheckpointPassed
      || getProgress(selectedModule) === 'completed';
    if (!checkpointPassed) return;

    if (lessonStep >= selectedModule.lessons.length - 1) {
      if (getProgress(selectedModule) === 'completed') {
        openNextFocusModule();
      } else {
        void completeModule();
      }
      return;
    }

    selectLessonStep(lessonStep + 1);
  };

  const toggleContestRegistration = () => {
    if (!selectedContest) return;
    const wasRegistered = registeredContests[selectedContest.id] ?? false;
    setRegisteredContests((current) => ({ ...current, [selectedContest.id]: !wasRegistered }));
    showToast(wasRegistered ? `You left ${selectedContest.title}.` : `You're registered for ${selectedContest.title}.`);
  };

  const toggleDiscussionVote = (discussionId: string) => {
    const wasVoted = votedDiscussions[discussionId] ?? false;
    setVotedDiscussions((current) => ({ ...current, [discussionId]: !wasVoted }));
    setDiscussions((currentDiscussions) => currentDiscussions.map((discussion) => (
      discussion.id === discussionId
        ? { ...discussion, votes: Math.max(0, discussion.votes + (wasVoted ? -1 : 1)) }
        : discussion
    )));
  };

  const submitDiscussion = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const title = draftTitle.trim();
    const body = draftBody.trim();
    if (!title || !body) {
      setComposerError('Add a short title and a question before posting.');
      return;
    }

    const localDiscussion: Discussion = {
      id: `local-${Date.now()}`,
      title,
      body,
      author: user?.email?.split('@')[0] ?? 'You',
      topic: draftTopic,
      replies: 0,
      votes: 0,
      createdAt: new Date().toISOString(),
    };

    setDiscussions((current) => [localDiscussion, ...current]);
    setSelectedDiscussionId(localDiscussion.id);
    setDraftTitle('');
    setDraftBody('');
    setDraftTopic('concepts');
    setComposerError(null);
    setShowComposer(false);
     showToast('Discussion saved on this device.');
  };

  const renderHero = () => (
    <header className="relative overflow-hidden rounded-2xl border border-bg-800 bg-bg-900/80 shadow-lg">
      <div className="pointer-events-none absolute -right-20 -top-24 h-72 w-72 rounded-full bg-primary-600/15 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-36 left-1/3 h-72 w-72 rounded-full bg-cyan-500/10 blur-3xl" />
      <div className="relative grid gap-8 p-6 sm:p-8 lg:grid-cols-[minmax(0,1.35fr)_minmax(260px,0.65fr)] lg:items-end">
        <div>
          <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-[0.18em] text-primary-300">
            <IconSparkles className="h-4 w-4" />
            QVANTA Learning Lab
          </div>
          <h1 className="mt-4 max-w-2xl font-display text-3xl font-semibold tracking-tight text-text-50 sm:text-4xl">
            Learn quantum by making it visible.
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-text-400 sm:text-base">
            Short lessons, friendly experiments, and a roadmap that turns the first qubit into your first quantum intuition.
          </p>
          <div className="mt-6 flex flex-wrap items-center gap-3">
            <Button
              onClick={() => {
                if (inProgressModule) openModule(inProgressModule.id);
              }}
            >
              {hasStartedLearning ? 'Resume learning' : 'Start your first lesson'} · {inProgressModule?.title ?? 'Choose a module'}
               <IconArrowRight className="h-4 w-4" />
             </Button>
             <Button variant="secondary" onClick={() => navigate('/algorithms')}>
               Explore Algorithm Lab
               <IconArrowRight className="h-4 w-4" />
             </Button>
            <button
             type="button"
             className="inline-flex h-10 items-center gap-2 rounded-lg border border-bg-700 bg-bg-800/60 px-4 text-sm font-medium text-text-200 transition hover:border-primary-500/50 hover:bg-bg-800"
             onClick={() => changeSection('contests')}
           >
             See community challenges
           </button>
             <Button variant="ghost" onClick={() => navigate('/curriculum')}>
               Browse all {catalog.totalModules.toLocaleString()} modules
              <IconArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </div>

         <div className="rounded-xl border border-bg-700/80 bg-bg-950/60 p-4">
           <div className="flex items-start justify-between gap-3">
             <div>
               <p className="font-mono-quantum text-[10px] uppercase tracking-[0.18em] text-text-500">Your signal</p>
               <p className="mt-2 text-2xl font-semibold text-text-50">{overallProgress}%</p>
               <p className="mt-1 text-xs text-text-400">{completedCount} of {learningModules.length} focus modules complete</p>
             </div>
             <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary-500/15 text-primary-300">
               <IconBook className="h-5 w-5" />
             </div>
           </div>
           <div className="mt-4 h-2 overflow-hidden rounded-full bg-bg-800" aria-label={`${overallProgress}% learning progress`}>
             <div className="h-full rounded-full bg-gradient-to-r from-primary-500 to-cyan-400 transition-all duration-500" style={{ width: `${overallProgress}%` }} />
           </div>
           <div className="mt-4 grid grid-cols-2 gap-2 text-xs">
             <div className="rounded-lg border border-bg-800 bg-bg-900/70 p-2.5">
               <p className="text-text-500">Mastery</p>
               <p className="mt-1 font-mono-quantum text-cyan-200">{averageMastery}%</p>
             </div>
             <div className="rounded-lg border border-bg-800 bg-bg-900/70 p-2.5">
               <p className="text-text-500">XP earned</p>
               <p className="mt-1 font-mono-quantum text-amber-200">{totalXp.toLocaleString()}</p>
             </div>
           </div>
           <p className="mt-3 text-xs leading-5 text-text-500">
             {hasStartedLearning && user?.email ? `Welcome back, ${user.email.split('@')[0]}. ` : 'Start with one small experiment. '}
             Your next win is waiting in {inProgressModule?.title ?? 'the curriculum'}.
           </p>
         </div>
      </div>
    </header>
  );

  const renderTabs = () => {
    const tabs: Array<{ id: LearningSection; label: string; description: string; icon: React.ReactNode }> = [
      { id: 'roadmap', label: 'Roadmap', description: 'Your learning path', icon: <IconBook className="h-4 w-4" /> },
      { id: 'contests', label: 'Contests', description: 'Practice in public', icon: <IconTrophy className="h-4 w-4" /> },
      { id: 'discussions', label: 'Discussions', description: 'Learn together', icon: <IconMessage className="h-4 w-4" /> }
    ];

    return (
      <div className="flex flex-wrap gap-2 border-b border-bg-800 pb-1" role="tablist" aria-label="Learning sections">
        {tabs.map((tab) => {
          const active = activeSection === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => changeSection(tab.id)}
              className={`group flex items-center gap-3 rounded-t-lg border-b-2 px-3 py-3 text-left transition sm:px-4 ${
                active ? 'border-primary-400 text-text-50' : 'border-transparent text-text-400 hover:border-bg-600 hover:text-text-200'
              }`}
            >
              <span className={active ? 'text-primary-300' : 'text-text-500 group-hover:text-text-300'}>{tab.icon}</span>
              <span>
                <span className="block text-sm font-medium">{tab.label}</span>
                <span className="hidden text-[11px] text-text-500 sm:block">{tab.description}</span>
              </span>
            </button>
          );
        })}
      </div>
    );
  };

  const renderRoadmap = () => (
    <section className="space-y-4" aria-labelledby="roadmap-heading">
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
        <div>
           <p className="font-mono-quantum text-[10px] uppercase tracking-[0.18em] text-text-500">A gentle path in {learningModules.length} focus modules</p>
          <h2 id="roadmap-heading" className="mt-1 text-xl font-semibold text-text-50">Your quantum roadmap</h2>
          <p className="mt-1 text-sm text-text-400">Start with the picture, then use the builder to make it real.</p>
        </div>
           <span className="text-xs text-text-500">
             {remoteAvailable
               ? progressSource === 'remote'
                  ? `Course library synced · progress API connected${progressSyncing ? ' · saving…' : ''}`
                 : `Course library synced · progress saved on this device${progressSyncing ? ' · saving…' : ''}`
               : progressSource === 'remote'
                  ? `Source curriculum · progress API connected${progressSyncing ? ' · saving…' : ''}`
                 : `Source curriculum · progress saved on this device${progressSyncing ? ' · saving…' : ''}`}
           </span>
      </div>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.28fr)_minmax(280px,0.72fr)]">
        <div className="grid gap-4 sm:grid-cols-2">
           {learningModules.map((module) => {
             const status = getProgress(module);
             const record = getProgressRecord(module);
             const styles = ACCENT_STYLES[module.accent];
             const percent = learningProgressPercent(status, record.currentStep, module.lessons.length);
            return (
              <Card key={module.id} className={`group relative flex min-h-[260px] flex-col overflow-hidden border-bg-800 transition ${styles.border}`}>
                <div className={`pointer-events-none absolute inset-x-0 top-0 h-24 bg-gradient-to-b ${styles.glow} to-transparent opacity-60`} />
                <CardHeader className="relative flex-row items-start justify-between gap-3 space-y-0 pb-3">
                  <div className={`flex h-10 w-10 items-center justify-center rounded-xl ring-1 ${styles.icon}`}>
                    <span className="font-mono-quantum text-xs font-semibold">{String(module.order).padStart(2, '0')}</span>
                  </div>
                  <Badge variant={statusVariant(status)}>{statusLabel(status)}</Badge>
                </CardHeader>
                <CardContent className="relative flex flex-1 flex-col pt-0">
                  <p className="font-mono-quantum text-[10px] uppercase tracking-[0.16em] text-text-500">{module.label}</p>
                  <h3 className="mt-2 text-lg font-semibold text-text-50 transition group-hover:text-primary-200">{module.title}</h3>
                  <p className="mt-2 flex-1 text-sm leading-5 text-text-400">{module.description}</p>
                   <div className="mt-4 flex items-center justify-between gap-3 text-xs text-text-500">
                     <span>{module.duration} · {module.lessons.length} steps</span>
                     <span>{percent}% · {record.mastery}% mastery</span>
                   </div>
                  <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-bg-800">
                    <div className="h-full rounded-full bg-gradient-to-r from-primary-500 to-cyan-400 transition-all duration-500" style={{ width: `${percent}%` }} />
                  </div>
                   <Button
                      variant={status === 'not_started' ? 'secondary' : 'ghost'}
                      className="mt-4 w-full justify-between px-3 text-left"
                      onClick={() => openModule(module.id)}
                   >
                       {status === 'completed' ? 'Review lesson' : status === 'in_progress' ? 'Resume lesson' : 'Start lesson'}
                      <IconArrowRight className="h-4 w-4" />
                    </Button>
                   <button
                      type="button"
                      className="mt-2 inline-flex items-center justify-center gap-1 text-xs font-medium text-text-500 transition hover:text-primary-300"
                      onClick={() => startTutorForModule(module)}
                   >
                      Ask the AI Tutor about this module
                      <IconSparkles className="h-3.5 w-3.5" />
                   </button>
                </CardContent>
              </Card>
            );
          })}
        </div>

        <Card className="h-fit border-primary-500/20 bg-bg-900/70">
          <CardContent className="p-5 sm:p-6">
            <QuantumStateExplainer />
          </CardContent>
        </Card>
      </div>

      <Card className="border-bg-800 bg-bg-900/60">
        <CardContent className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
          <div className="flex items-start gap-3">
            <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-amber-500/10 text-amber-300">
              <IconSparkles className="h-4 w-4" />
            </div>
            <div>
              <p className="text-sm font-medium text-text-100">A helpful learning loop</p>
              <p className="mt-1 max-w-2xl text-xs leading-5 text-text-400">Read one idea, predict an outcome, then test it in a circuit. You can always ask the AI Tutor to unpack a step without leaving QVANTA.</p>
            </div>
          </div>
          <Button
            variant="secondary"
           size="sm"
           onClick={() => {
              if (inProgressModule) {
                writeTutorHandoff(inProgressModule, inProgressModule.lessons[0]);
                navigate('/tutor');
              }
           }}
          >
            Ask the AI Tutor
            <IconArrowRight className="h-4 w-4" />
          </Button>
        </CardContent>
      </Card>
    </section>
  );

  const renderLesson = () => {
    if (!selectedModule) return renderRoadmap();
    const step = selectedModule.lessons[lessonStep] ?? selectedModule.lessons[0];
    const record = getProgressRecord(selectedModule);
    const checkpoint = step?.checkpoint;
    const status = getProgress(selectedModule);
    const savedCheckpoint = step ? record.checkpoints[step.id] : undefined;
    const savedCheckpointPassed = savedCheckpoint?.correct === true
      || (record.checkpoint.correct === true && record.currentStep === lessonStep);
    const displayCheckpointFeedback = checkpointFeedback ?? (savedCheckpointPassed && checkpoint
      ? { correct: true, message: checkpoint.explanation, xpAwarded: 0 }
      : null);
    const stepPercent = status === 'completed'
      ? 100
      : Math.round(((lessonStep + 1) / Math.max(1, selectedModule.lessons.length)) * 100);
    const isLastStep = lessonStep === selectedModule.lessons.length - 1;
    const checkpointPassed = !checkpoint || checkpointFeedback?.correct === true || savedCheckpointPassed || status === 'completed';
    const nextModule = learningModules.find((module) => module.order === selectedModule.order + 1)
      ?? learningModules.find((module) => module.id !== selectedModule.id && getProgress(module) !== 'completed');

    return (
      <section className="space-y-4" aria-labelledby="lesson-heading">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <button
              type="button"
              className="inline-flex items-center gap-2 text-xs font-medium text-text-400 transition hover:text-text-100"
              onClick={() => setSelectedModuleId(null)}
            >
              <IconArrowLeft className="h-4 w-4" />
              Back to roadmap
            </button>
            <div className="mt-4 flex items-center gap-3">
              <span className="font-mono-quantum text-xs text-primary-300">MODULE {String(selectedModule.order).padStart(2, '0')}</span>
              <span className="h-1 w-1 rounded-full bg-bg-600" />
              <span className="text-xs text-text-500">{selectedModule.duration}</span>
            </div>
            <h2 id="lesson-heading" className="mt-2 text-2xl font-semibold text-text-50">{selectedModule.title}</h2>
            <p className="mt-1 text-sm text-text-400">{selectedModule.description}</p>
          </div>
          <div className="flex flex-wrap items-center justify-end gap-2">
            <span className="rounded-full border border-cyan-500/20 bg-cyan-500/10 px-3 py-1 text-xs text-cyan-200">
              {record.mastery}% mastery
            </span>
            <span className="rounded-full border border-amber-500/20 bg-amber-500/10 px-3 py-1 font-mono-quantum text-xs text-amber-200">
              {record.xp} XP
            </span>
            <Badge variant={statusVariant(status)}>{status === 'completed' ? 'Module complete' : `Step ${lessonStep + 1} of ${selectedModule.lessons.length}`}</Badge>
          </div>
        </div>

        <div className="h-2 overflow-hidden rounded-full bg-bg-800" aria-label={`Lesson progress ${stepPercent}%`}>
          <div className="h-full rounded-full bg-gradient-to-r from-primary-500 to-cyan-400 transition-all duration-500" style={{ width: `${stepPercent}%` }} />
        </div>

        <LessonVisualization
          moduleId={selectedModule.id}
          stepId={step.id}
          stepIndex={lessonStep}
          moduleTitle={selectedModule.title}
          lessonTitle={step.title}
          sceneKey={selectedModule.visualKeys?.[lessonStep]}
        />

        <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(270px,0.62fr)]">
          <Card className="overflow-hidden">
            <div className="border-b border-bg-800 bg-bg-900/70 px-5 py-4 sm:px-7">
              <p className="font-mono-quantum text-[10px] uppercase tracking-[0.18em] text-primary-300">{step.eyebrow}</p>
              <h3 className="mt-2 text-xl font-semibold text-text-50 sm:text-2xl">{step.title}</h3>
            </div>
            <CardContent className="space-y-6 p-5 sm:p-7">
              <p className="max-w-3xl text-base leading-7 text-text-300">{step.body}</p>
              {step.example && (
                <div className="rounded-xl border border-bg-700 bg-bg-950/70 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <span className="font-mono-quantum text-[10px] uppercase tracking-[0.18em] text-text-500">Notebook moment</span>
                    <span className="text-[10px] text-cyan-300">predict first</span>
                  </div>
                  <pre className="mt-3 overflow-x-auto whitespace-pre-wrap font-mono-quantum text-sm leading-7 text-cyan-200">{step.example}</pre>
                </div>
              )}
              <div className="rounded-xl border border-primary-500/20 bg-primary-500/10 p-4">
                <div className="flex items-start gap-3">
                  <div className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary-500/20 text-primary-200">
                    <IconCheck className="h-3.5 w-3.5" />
                  </div>
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.14em] text-primary-200">Keep this idea</p>
                    <p className="mt-1 text-sm leading-6 text-text-300">{step.takeaway}</p>
                  </div>
                </div>
              </div>

              {checkpoint && (
                <fieldset className="rounded-xl border border-cyan-500/25 bg-cyan-500/5 p-4">
                  <legend className="px-1 font-mono-quantum text-[10px] uppercase tracking-[0.16em] text-cyan-200">
                    Prediction checkpoint
                  </legend>
                  <p className="mt-2 text-sm font-medium leading-6 text-text-100">{checkpoint.question}</p>
                  <div className="mt-4 grid gap-2" role="radiogroup" aria-label="Checkpoint answers">
                    {checkpoint.options.map((option) => {
                      const selected = (checkpointAnswer ?? savedCheckpoint?.answerId) === option.id;
                      const isCorrectOption = displayCheckpointFeedback?.correct && option.id === checkpoint.correctOptionId;
                      const isWrongSelection = displayCheckpointFeedback && !displayCheckpointFeedback.correct && selected;
                      return (
                        <button
                          key={option.id}
                          type="button"
                          role="radio"
                          aria-checked={selected}
                          disabled={checkpointSubmitting || status === 'completed'}
                          onClick={() => void handleCheckpointAnswer(option.id)}
                          className={`flex items-start gap-3 rounded-lg border px-3 py-3 text-left text-sm transition disabled:cursor-not-allowed disabled:opacity-80 ${
                            isCorrectOption
                              ? 'border-emerald-500/50 bg-emerald-500/10 text-emerald-100'
                              : isWrongSelection
                                ? 'border-red-500/40 bg-red-500/10 text-red-100'
                                : selected
                                  ? 'border-primary-500/50 bg-primary-500/10 text-text-50'
                                  : 'border-bg-700 bg-bg-950/50 text-text-300 hover:border-cyan-500/40 hover:bg-bg-900'
                          }`}
                        >
                          <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-current text-[10px] font-semibold">
                            {isCorrectOption ? '✓' : isWrongSelection ? '×' : String.fromCharCode(65 + checkpoint.options.indexOf(option))}
                          </span>
                          <span>{option.label}</span>
                        </button>
                      );
                    })}
                  </div>
                  {checkpointSubmitting && <p className="mt-3 text-xs text-text-500" role="status">Checking your prediction…</p>}
                  {displayCheckpointFeedback && (
                    <div className={`mt-4 rounded-lg border px-3 py-3 text-sm ${displayCheckpointFeedback.correct ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-100' : 'border-amber-500/30 bg-amber-500/10 text-amber-100'}`} role="status">
                      <p className="font-medium">{displayCheckpointFeedback.correct ? 'Good prediction.' : 'Keep exploring.'}</p>
                      <p className="mt-1 leading-5 text-text-300">{displayCheckpointFeedback.message}</p>
                      {displayCheckpointFeedback.correct && displayCheckpointFeedback.xpAwarded > 0 && (
                        <p className="mt-2 font-mono-quantum text-xs text-amber-200">+{displayCheckpointFeedback.xpAwarded} XP</p>
                      )}
                    </div>
                  )}
                </fieldset>
              )}

              {completionMessage && (
                <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4" role="status">
                  <p className="text-sm font-semibold text-emerald-100">Module complete</p>
                  <p className="mt-1 text-sm leading-6 text-emerald-50/80">{completionMessage}</p>
                </div>
              )}
            </CardContent>
            <div className="flex flex-col-reverse gap-3 border-t border-bg-800 px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-7">
              <Button
                variant="ghost"
                disabled={lessonStep === 0}
                onClick={() => selectLessonStep(lessonStep - 1)}
              >
                <IconArrowLeft className="h-4 w-4" />
                Previous
              </Button>
              <div className="flex flex-wrap gap-2 sm:justify-end">
                <Button variant="secondary" onClick={() => {
                  writeTutorHandoff(selectedModule, step);
                  navigate('/tutor');
                }}>
                  Ask AI Tutor
                  <IconSparkles className="h-4 w-4" />
                </Button>
                {selectedModule.sourceModuleId !== undefined && (
                  <Button
                    variant="ghost"
                    onClick={() => navigate(`/curriculum?module=${selectedModule.sourceModuleId}`)}
                  >
                    Open full module
                  </Button>
                )}
                {isLastStep && (
                  <Button variant="secondary" onClick={() => openCircuitForModule(selectedModule)}>
                    Try a circuit
                  </Button>
                )}
                <Button onClick={handleNextLesson} disabled={!checkpointPassed || checkpointSubmitting || progressSyncing}>
                  {isLastStep
                    ? status === 'completed'
                      ? nextModule ? 'Next module' : 'Back to roadmap'
                      : 'Complete module'
                    : checkpointPassed ? 'Next step' : 'Answer to continue'}
                  <IconArrowRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </Card>

          <div className="space-y-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Lesson path</CardTitle>
                <p className="text-xs text-text-500">Move at your own pace. You can revisit any step.</p>
              </CardHeader>
              <CardContent className="space-y-2">
                {selectedModule.lessons.map((lesson, index) => {
                  const active = index === lessonStep;
                  const visited = index < lessonStep || status === 'completed';
                  return (
                    <button
                      key={lesson.id}
                      type="button"
                      onClick={() => selectLessonStep(index)}
                      className={`flex w-full items-start gap-3 rounded-lg border p-3 text-left transition ${
                        active ? 'border-primary-500/50 bg-primary-500/10' : 'border-transparent bg-bg-950/40 hover:border-bg-700 hover:bg-bg-800/60'
                      }`}
                    >
                      <span className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full font-mono-quantum text-[10px] ${visited ? 'bg-emerald-500/15 text-emerald-300' : active ? 'bg-primary-500/20 text-primary-200' : 'bg-bg-800 text-text-500'}`}>
                        {visited ? <IconCheck className="h-3.5 w-3.5" /> : String(index + 1).padStart(2, '0')}
                      </span>
                      <span>
                        <span className={`block text-sm font-medium ${active ? 'text-text-50' : 'text-text-300'}`}>{lesson.title}</span>
                        <span className="mt-1 block text-[11px] text-text-500">Step {index + 1}</span>
                      </span>
                    </button>
                  );
                })}
              </CardContent>
            </Card>
            <Card className="border-cyan-500/20 bg-cyan-500/5">
              <CardContent className="p-5">
                <div className="mb-4 grid grid-cols-2 gap-2 text-xs">
                  <div className="rounded-lg border border-cyan-500/15 bg-bg-950/40 p-3">
                    <p className="text-text-500">Module mastery</p>
                    <p className="mt-1 font-mono-quantum text-cyan-200">{record.mastery}%</p>
                  </div>
                  <div className="rounded-lg border border-amber-500/15 bg-bg-950/40 p-3">
                    <p className="text-text-500">Module XP</p>
                    <p className="mt-1 font-mono-quantum text-amber-200">{record.xp}</p>
                  </div>
                </div>
                <QuantumStateExplainer />
              </CardContent>
            </Card>
          </div>
        </div>
      </section>
    );
  };

  const renderContests = () => (
    <section className="space-y-4" aria-labelledby="contests-heading">
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
        <div>
          <p className="font-mono-quantum text-[10px] uppercase tracking-[0.18em] text-text-500">Low-stakes practice arena</p>
          <h2 id="contests-heading" className="mt-1 text-xl font-semibold text-text-50">Contests for your next small win</h2>
          <p className="mt-1 max-w-2xl text-sm text-text-400">Try a focused challenge, compare your prediction, and collect a little momentum.</p>
        </div>
        <Badge variant="secondary">Demo challenges · no backend</Badge>
      </div>

      <div className="flex flex-wrap gap-2" aria-label="Filter contests">
        {(['all', 'beginner', 'intermediate'] as ContestFilter[]).map((filter) => (
          <button
            key={filter}
            type="button"
            aria-pressed={contestFilter === filter}
            onClick={() => setContestFilter(filter)}
            className={`rounded-full border px-3 py-1.5 text-xs font-medium capitalize transition ${contestFilter === filter ? 'border-primary-500/50 bg-primary-500/15 text-primary-200' : 'border-bg-700 bg-bg-900 text-text-400 hover:border-bg-600 hover:text-text-200'}`}
          >
            {filter === 'all' ? 'All levels' : filter}
          </button>
        ))}
      </div>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.15fr)_minmax(290px,0.85fr)]">
        <div className="space-y-3">
          {visibleContests.map((contest) => {
            const selected = selectedContest?.id === contest.id;
            return (
              <button
                key={contest.id}
                type="button"
                onClick={() => setSelectedContestId(contest.id)}
                className={`w-full rounded-xl border p-5 text-left transition ${selected ? 'border-primary-500/50 bg-primary-500/10 shadow-lg shadow-primary-950/20' : 'border-bg-800 bg-bg-900 hover:border-bg-700 hover:bg-bg-800/80'}`}
              >
                <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant={contest.level === 'beginner' ? 'success' : 'warning'}>{contest.level}</Badge>
                       <span className="text-xs text-text-500">{getContestDeadlineLabel(contest.endsAt)}</span>
                    </div>
                    <h3 className="mt-3 text-base font-semibold text-text-50">{contest.title}</h3>
                    <p className="mt-1 max-w-2xl text-sm leading-5 text-text-400">{contest.description}</p>
                  </div>
                   <span className="shrink-0 font-mono-quantum text-xs text-cyan-300">{getContestRewardLabel(contest.rewardXp)}</span>
                </div>
                <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-text-500">
                  <span>{contest.format}</span>
                  <span>{contest.participants} learners joined</span>
                  {registeredContests[contest.id] && <span className="text-emerald-300">Registered ✓</span>}
                </div>
              </button>
            );
          })}
        </div>

        {selectedContest ? (
          <Card className="h-fit border-primary-500/20">
            <CardHeader className="pb-4">
              <div className="flex items-center justify-between gap-3">
                <Badge variant="primary">Challenge brief</Badge>
                <IconTrophy className="h-5 w-5 text-amber-300" />
              </div>
              <CardTitle className="pt-2 text-xl">{selectedContest.title}</CardTitle>
              <p className="text-sm leading-5 text-text-400">{selectedContest.description}</p>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="rounded-lg border border-bg-700 bg-bg-950/50 p-3">
                  <p className="text-text-500">Format</p>
                  <p className="mt-1 font-medium text-text-200">{selectedContest.format}</p>
                </div>
                <div className="rounded-lg border border-bg-700 bg-bg-950/50 p-3">
                  <p className="text-text-500">Reward</p>
                   <p className="mt-1 font-medium text-cyan-300">{getContestRewardLabel(selectedContest.rewardXp)}</p>
                </div>
              </div>
              <div className="rounded-lg border border-dashed border-bg-700 bg-bg-950/40 p-3 text-xs leading-5 text-text-400">
                Demo flow: register here, then use Circuit Builder to sketch your answer. There is no submission service connected to this page yet.
              </div>
              <Button className="w-full" onClick={toggleContestRegistration}>
                {registeredContests[selectedContest.id] ? 'Leave contest' : 'Join contest'}
              </Button>
            </CardContent>
          </Card>
        ) : (
          <Card><CardContent className="p-6 text-sm text-text-400">No contests match this filter.</CardContent></Card>
        )}
      </div>
    </section>
  );

  const renderDiscussions = () => (
    <section className="space-y-4" aria-labelledby="discussions-heading">
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
        <div>
          <p className="font-mono-quantum text-[10px] uppercase tracking-[0.18em] text-text-500">A room for curious questions</p>
          <h2 id="discussions-heading" className="mt-1 text-xl font-semibold text-text-50">Learn out loud</h2>
          <p className="mt-1 max-w-2xl text-sm text-text-400">Search a question, upvote a helpful explanation, or start a local demo thread.</p>
        </div>
        <Button onClick={() => { setShowComposer((visible) => !visible); setComposerError(null); }}>
          {showComposer ? 'Close composer' : 'Start a discussion'}
        </Button>
      </div>

      {showComposer && (
        <Card className="border-primary-500/30 bg-primary-500/5">
          <CardHeader className="pb-4">
            <CardTitle className="text-base">Ask the community</CardTitle>
            <p className="text-xs text-text-500">This creates a local demo thread in your current browser only.</p>
          </CardHeader>
          <CardContent>
            <form className="space-y-4" onSubmit={submitDiscussion}>
              <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_180px]">
                <label className="block text-sm text-text-300">
                  Title
                  <input
                    value={draftTitle}
                    onChange={(event) => setDraftTitle(event.target.value)}
                    placeholder="What are you wondering about?"
                    className="mt-2 h-10 w-full rounded-lg border border-bg-700 bg-bg-950/70 px-3 text-sm text-text-100 outline-none transition placeholder:text-text-600 focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20"
                  />
                </label>
                <label className="block text-sm text-text-300">
                  Topic
                  <select
                    value={draftTopic}
                    onChange={(event) => setDraftTopic(event.target.value as Exclude<DiscussionTopic, 'all'>)}
                    className="mt-2 h-10 w-full rounded-lg border border-bg-700 bg-bg-950/70 px-3 text-sm capitalize text-text-100 outline-none transition focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20"
                  >
                    <option value="concepts">Concepts</option>
                    <option value="circuits">Circuits</option>
                    <option value="community">Community</option>
                  </select>
                </label>
              </div>
              <label className="block text-sm text-text-300">
                Question or context
                <textarea
                  value={draftBody}
                  onChange={(event) => setDraftBody(event.target.value)}
                  placeholder="Share what you tried, what you expected, and where you got stuck."
                  rows={4}
                  className="mt-2 w-full resize-y rounded-lg border border-bg-700 bg-bg-950/70 px-3 py-2 text-sm leading-5 text-text-100 outline-none transition placeholder:text-text-600 focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20"
                />
              </label>
              {composerError && <p className="text-xs text-red-300" role="alert">{composerError}</p>}
              <div className="flex flex-wrap justify-end gap-2">
                <Button type="button" variant="ghost" onClick={() => setShowComposer(false)}>Cancel</Button>
                <Button type="submit">Post locally</Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      <div className="flex flex-col gap-3 sm:flex-row">
        <label className="relative block min-w-0 flex-1">
          <span className="sr-only">Search discussions</span>
          <input
            value={discussionSearch}
            onChange={(event) => setDiscussionSearch(event.target.value)}
            placeholder="Search discussions..."
            className="h-10 w-full rounded-lg border border-bg-700 bg-bg-900 px-3 text-sm text-text-100 outline-none transition placeholder:text-text-600 focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20"
          />
        </label>
        <div className="flex flex-wrap gap-2" aria-label="Filter discussions">
          {(['all', 'concepts', 'circuits', 'community'] as DiscussionTopic[]).map((topic) => (
            <button
              key={topic}
              type="button"
              aria-pressed={discussionFilter === topic}
              onClick={() => setDiscussionFilter(topic)}
              className={`rounded-lg border px-3 py-2 text-xs font-medium capitalize transition ${discussionFilter === topic ? 'border-primary-500/50 bg-primary-500/15 text-primary-200' : 'border-bg-700 bg-bg-900 text-text-400 hover:text-text-200'}`}
            >
              {topic === 'all' ? 'All topics' : topic}
            </button>
          ))}
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.15fr)_minmax(280px,0.85fr)]">
        <div className="space-y-3">
          {visibleDiscussions.length === 0 ? (
            <Card><CardContent className="p-8 text-center"><p className="text-sm font-medium text-text-200">No discussions found</p><p className="mt-1 text-xs text-text-500">Try another search or start the first local thread.</p></CardContent></Card>
          ) : visibleDiscussions.map((discussion) => {
            const isSelected = selectedDiscussion?.id === discussion.id;
            const isVoted = votedDiscussions[discussion.id] ?? false;
            return (
              <div key={discussion.id} className={`rounded-xl border p-4 transition ${isSelected ? 'border-primary-500/40 bg-primary-500/10' : 'border-bg-800 bg-bg-900 hover:border-bg-700'}`}>
                <button type="button" className="w-full text-left" onClick={() => setSelectedDiscussionId(discussion.id)}>
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge variant="secondary">{discussion.topic}</Badge>
                         <span className="text-[11px] text-text-500">{getDiscussionTimeLabel(discussion.createdAt)}</span>
                      </div>
                      <h3 className="mt-2 text-sm font-semibold text-text-50">{discussion.title}</h3>
                    </div>
                    <IconMessage className="mt-1 h-4 w-4 shrink-0 text-text-500" />
                  </div>
                  <p className="mt-2 line-clamp-2 text-sm leading-5 text-text-400">{discussion.body}</p>
                </button>
                <div className="mt-4 flex items-center justify-between gap-3 border-t border-bg-800/80 pt-3 text-xs text-text-500">
                  <span>{discussion.author} · {discussion.replies} replies</span>
                  <button
                    type="button"
                    aria-pressed={isVoted}
                    onClick={() => toggleDiscussionVote(discussion.id)}
                    className={`inline-flex items-center gap-1.5 rounded-md px-2 py-1 transition ${isVoted ? 'bg-primary-500/15 text-primary-200' : 'text-text-400 hover:bg-bg-800 hover:text-text-200'}`}
                  >
                    <IconArrowUp className="h-3.5 w-3.5" />
                    {discussion.votes}
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {selectedDiscussion ? (
          <Card className="h-fit border-cyan-500/20">
            <CardHeader className="pb-4">
              <div className="flex items-center justify-between gap-3">
                <Badge variant="primary">Thread preview</Badge>
                <span className="font-mono-quantum text-xs text-cyan-300">{selectedDiscussion.votes} votes</span>
              </div>
              <CardTitle className="pt-2 text-lg">{selectedDiscussion.title}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm leading-6 text-text-300">{selectedDiscussion.body}</p>
              <div className="flex items-center gap-2 text-xs text-text-500">
                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-gradient-to-br from-primary-500 to-accent-500 font-semibold text-white">{selectedDiscussion.author.charAt(0)}</span>
                <span>{selectedDiscussion.author}</span>
                <span>·</span>
                <span>{selectedDiscussion.replies} replies</span>
              </div>
              <div className="rounded-lg border border-dashed border-bg-700 bg-bg-950/40 p-3 text-xs leading-5 text-text-500">
                Reply controls are intentionally local-demo only for now. Upvote the question or start your own thread to practice explaining the idea.
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card><CardContent className="p-6 text-sm text-text-400">Select a discussion to preview it here.</CardContent></Card>
        )}
      </div>
    </section>
  );

  return (
    <div className="space-y-6 pb-10">
      {renderHero()}
      {renderTabs()}
      {toast && (
        <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-200" role="status">
          {toast}
        </div>
      )}
      {activeSection === 'roadmap' ? (selectedModule ? renderLesson() : renderRoadmap()) : activeSection === 'contests' ? renderContests() : renderDiscussions()}
    </div>
  );
};

export default LearnPage;
