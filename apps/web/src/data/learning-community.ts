export type ContestLevel = 'beginner' | 'intermediate';
export type ContestFilter = 'all' | ContestLevel;
export type DiscussionTopic = 'all' | 'concepts' | 'circuits' | 'community';

export interface Contest {
  id: string;
  title: string;
  description: string;
  level: ContestLevel;
  format: string;
  endsAt: string;
  participants: number;
  rewardXp: number;
}

export interface Discussion {
  id: string;
  title: string;
  body: string;
  author: string;
  topic: Exclude<DiscussionTopic, 'all'>;
  replies: number;
  votes: number;
  createdAt: string;
}

const CONTEST_REGISTRATION_KEY = 'qvanta.learning.contestRegistrations';
const DISCUSSIONS_KEY = 'qvanta.learning.discussions';
const DISCUSSION_VOTES_KEY = 'qvanta.learning.discussionVotes';

const fromNow = (days: number): string => {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date.toISOString();
};

const minutesAgo = (minutes: number): string => new Date(Date.now() - minutes * 60_000).toISOString();

export const COMMUNITY_CONTESTS: Contest[] = [
  {
    id: 'bell-state-sprint',
    title: 'Bell State Sprint',
    description: 'Build a two-qubit circuit that creates correlated measurements, then explain the pattern in three sentences.',
    level: 'beginner',
    format: 'Circuit + short answer',
    endsAt: fromNow(2),
    participants: 128,
    rewardXp: 240,
  },
  {
    id: 'bloch-orbit',
    title: 'Bloch Orbit Challenge',
    description: 'Find a gate sequence that takes |0⟩ to a target point and share the path your state vector follows.',
    level: 'beginner',
    format: 'Visual puzzle',
    endsAt: fromNow(6),
    participants: 86,
    rewardXp: 180,
  },
  {
    id: 'interference-lab',
    title: 'Interference Lab',
    description: 'Tune a small circuit so useful outcomes become more likely. Include your prediction and measured histogram.',
    level: 'intermediate',
    format: 'Experiment report',
    endsAt: fromNow(9),
    participants: 64,
    rewardXp: 400,
  },
];

export const DISCUSSION_SEEDS: Discussion[] = [
  {
    id: 'why-measurement-changes-state',
    title: 'Why does measuring a qubit change the state?',
    body: 'I understand that measurement gives 0 or 1, but what is the intuition for the arrow no longer being in superposition afterward?',
    author: 'Maya R.',
    topic: 'concepts',
    replies: 8,
    votes: 24,
    createdAt: minutesAgo(18),
  },
  {
    id: 'cnot-control-target',
    title: 'A tiny CNOT question',
    body: 'When the control wire is |0⟩, does the target always stay unchanged? I want to check my circuit before the Bell State Sprint.',
    author: 'Jordan K.',
    topic: 'circuits',
    replies: 5,
    votes: 17,
    createdAt: minutesAgo(60),
  },
  {
    id: 'first-circuit-share',
    title: 'Share your first circuit',
    body: 'I made a Hadamard circuit and finally understood why one shot is not enough. What did your first histogram look like?',
    author: 'Leo P.',
    topic: 'community',
    replies: 12,
    votes: 31,
    createdAt: minutesAgo(60 * 24),
  },
  {
    id: 'x-versus-h',
    title: 'X gate versus H gate: the beginner version',
    body: 'Is it fair to think of X as a flip and H as a coin toss, or does that analogy hide something important?',
    author: 'Ari S.',
    topic: 'concepts',
    replies: 4,
    votes: 11,
    createdAt: minutesAgo(60 * 24),
  },
];

const readJson = <T>(key: string, fallback: T): T => {
  try {
    const stored = window.localStorage.getItem(key);
    return stored ? (JSON.parse(stored) as T) : fallback;
  } catch {
    return fallback;
  }
};

const writeJson = (key: string, value: unknown): void => {
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Local-first community state is best effort when storage is unavailable.
  }
};

export const readRegisteredContests = (): Record<string, boolean> =>
  readJson<Record<string, boolean>>(CONTEST_REGISTRATION_KEY, {});

export const writeRegisteredContests = (value: Record<string, boolean>): void => {
  writeJson(CONTEST_REGISTRATION_KEY, value);
};

export const readDiscussions = (): Discussion[] => {
  const value = readJson<Discussion[]>(DISCUSSIONS_KEY, DISCUSSION_SEEDS);
  return Array.isArray(value) && value.length > 0 ? value : DISCUSSION_SEEDS;
};

export const writeDiscussions = (value: Discussion[]): void => {
  writeJson(DISCUSSIONS_KEY, value);
};

export const readDiscussionVotes = (): Record<string, boolean> =>
  readJson<Record<string, boolean>>(DISCUSSION_VOTES_KEY, {});

export const writeDiscussionVotes = (value: Record<string, boolean>): void => {
  writeJson(DISCUSSION_VOTES_KEY, value);
};

export const getContestDeadlineLabel = (endsAt: string, now = new Date()): string => {
  const remainingMs = new Date(endsAt).getTime() - now.getTime();
  if (!Number.isFinite(remainingMs) || remainingMs <= 0) return 'Ended';
  const hours = Math.ceil(remainingMs / 3_600_000);
  if (hours < 24) return `${hours}h left`;
  return `${Math.ceil(hours / 24)}d left`;
};

export const getContestRewardLabel = (rewardXp: number): string => `${rewardXp.toLocaleString()} XP`;

export const getDiscussionTimeLabel = (createdAt: string, now = new Date()): string => {
  const elapsedMs = Math.max(0, now.getTime() - new Date(createdAt).getTime());
  const minutes = Math.floor(elapsedMs / 60_000);
  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} hr${hours === 1 ? '' : 's'} ago`;
  const days = Math.floor(hours / 24);
  return days === 1 ? 'Yesterday' : `${days} days ago`;
};
