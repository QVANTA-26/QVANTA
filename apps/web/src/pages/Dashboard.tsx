import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  AvatarPresetPicker,
  Button,
  Card,
  CardContent,
  Badge
} from '@qvanta/ui';
import { apiClient } from '@/lib/api-client';
import { useCurriculumProgress } from '@/hooks/useCurriculumProgress';
import { useAuthStore } from '@/store/auth';
import type { AvatarPresetId } from '@qvanta/ui';
import type { User, SubscriptionTier } from '@qvanta/types';

const DEFAULT_FREE_TIER_CAP = 50;
const PROFILE_AVATAR_KEY = 'qvanta.dashboard.profileAvatar';
const ACTIVITY_KEY = 'qvanta.dashboard.activity';
const FIRST_SESSION_WINDOW_MS = 30 * 24 * 60 * 60 * 1000;
const TOAST_DURATION_MS = 4500;
const HEATMAP_WEEKS = 52;
// Set this to the real number of modules in your curriculum.
const TOTAL_MODULES = 20;

const FALLBACK_TIERS: SubscriptionTier[] = [
  {
    tier: 'free',
    name: 'Free Plan',
    description: 'Perfect to get started. 50 simulations / month.',
    simsPerMonth: 50,
    maxShots: 4096
  },
  {
    tier: 'pro',
    name: 'Pro Plan',
    description: 'Unlimited simulations, full lesson library, and priority support.',
    simsPerMonth: 999999,
    maxShots: 65536
  }
];

type ToastState = { kind: 'info' | 'error' | 'success'; msg: string } | null;
type ActivityMap = Record<string, number>;

/* ---------- helpers ---------- */

const dayKey = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

const buildWeeks = (weeks: number) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const start = new Date(today);
  start.setDate(today.getDate() - today.getDay() - (weeks - 1) * 7);
  const cols: { date: Date; key: string; future: boolean }[][] = [];
  for (let w = 0; w < weeks; w++) {
    const col: { date: Date; key: string; future: boolean }[] = [];
    for (let d = 0; d < 7; d++) {
      const dt = new Date(start);
      dt.setDate(start.getDate() + w * 7 + d);
      col.push({ date: dt, key: dayKey(dt), future: dt > today });
    }
    cols.push(col);
  }
  return cols;
};

const computeStreaks = (activity: ActivityMap) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  let max = 0;
  let run = 0;
  let activeDays = 0;
  for (let i = HEATMAP_WEEKS * 7; i >= 0; i--) {
    const dt = new Date(today);
    dt.setDate(today.getDate() - i);
    if ((activity[dayKey(dt)] ?? 0) > 0) {
      activeDays += 1;
      run += 1;
      max = Math.max(max, run);
    } else {
      run = 0;
    }
  }
  // `run` now holds the streak ending today (or 0 if today is inactive).
  return { activeDays, maxStreak: max, currentStreak: run };
};

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/* ---------- small components ---------- */

const ProgressRing: React.FC<{ done: number; total: number }> = ({ done, total }) => {
  const size = 148;
  const stroke = 9;
  const r = (size - stroke) / 2;
  const circ = 2 * Math.PI * r;
  const pct = total > 0 ? Math.min(1, done / total) : 0;
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90" aria-hidden="true">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" strokeWidth={stroke} className="stroke-bg-700" />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circ}
          strokeDashoffset={circ * (1 - pct)}
          className="stroke-primary-500 transition-all duration-500"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <div className="text-3xl font-semibold text-text-100">
          {done}
          <span className="text-sm font-normal text-text-500">/{total}</span>
        </div>
        <div className="mt-0.5 text-sm text-text-300">Completed</div>
      </div>
    </div>
  );
};

const Heatmap: React.FC<{ activity: ActivityMap }> = ({ activity }) => {
  const weeks = React.useMemo(() => buildWeeks(HEATMAP_WEEKS), []);
  const cell = 12;
  const gap = 3;
  const levelClass = (count: number) =>
    count >= 3 ? 'bg-emerald-500' : count === 2 ? 'bg-emerald-700' : count === 1 ? 'bg-emerald-900' : 'bg-bg-800';

  return (
    <div className="overflow-x-auto pb-1">
      <div className="inline-block min-w-max">
        <div className="flex" style={{ gap }}>
          {weeks.map((col, i) => (
            <div key={col[0].key} className="flex flex-col" style={{ width: cell, gap }}>
              {col.map((day) => (
                <div
                  key={day.key}
                  title={day.future ? undefined : `${day.key}: ${activity[day.key] ?? 0} active`}
                  className={`rounded-[3px] ${day.future ? 'opacity-0' : levelClass(activity[day.key] ?? 0)}`}
                  style={{ width: cell, height: cell }}
                />
              ))}
              {/* month label sits under the column where a new month starts */}
              <div className="relative h-4">
                {(i === 0 || col[0].date.getMonth() !== weeks[i - 1][0].date.getMonth()) && (
                  <span className="absolute left-0 top-1 whitespace-nowrap text-xs text-text-400">
                    {MONTHS[col[0].date.getMonth()]}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

/* ---------- page ---------- */

const DashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const authUser = useAuthStore((s) => s.user);
  const setUser = useAuthStore((s) => s.setUser);
  const {
    progress: curriculumProgress,
    totalXp,
    averageMastery,
    source: progressSource,
  } = useCurriculumProgress();

  const [user, setLocalUser] = React.useState<User | null>(authUser);
  const [tiers, setTiers] = React.useState<SubscriptionTier[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [toast, setToast] = React.useState<ToastState>(null);
  const [checkoutLoading, setCheckoutLoading] = React.useState(false);
  const [showAvatarPicker, setShowAvatarPicker] = React.useState(false);
  const [savingAvatarPreset, setSavingAvatarPreset] = React.useState(false);
  const [profileAvatar, setProfileAvatar] = React.useState<string | null>(null);
  const [activity, setActivity] = React.useState<ActivityMap>({});

  const toastTimer = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  const showToast = React.useCallback((kind: 'info' | 'error' | 'success', msg: string) => {
    if (toastTimer.current) clearTimeout(toastTimer.current);
    setToast({ kind, msg });
    toastTimer.current = setTimeout(() => setToast(null), TOAST_DURATION_MS);
  }, []);

  React.useEffect(() => {
    return () => {
      if (toastTimer.current) clearTimeout(toastTimer.current);
    };
  }, []);

  const userKey = user?.id ?? authUser?.id ?? 'anon';
  const avatarStorageKey = `${PROFILE_AVATAR_KEY}.${userKey}`;
  const activityStorageKey = `${ACTIVITY_KEY}.${userKey}`;

  React.useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      setProfileAvatar(window.localStorage.getItem(avatarStorageKey));
    } catch {
      setProfileAvatar(null);
    }
  }, [avatarStorageKey]);

  // Local activity log: marks today as active on this device.
  // Swap this for real data (e.g. from your progress API) when it exists.
  React.useEffect(() => {
    if (typeof window === 'undefined') return;
    let stored: ActivityMap = {};
    try {
      stored = JSON.parse(window.localStorage.getItem(activityStorageKey) ?? '{}') as ActivityMap;
    } catch {
      stored = {};
    }
    const today = dayKey(new Date());
    const next = { ...stored, [today]: Math.max(1, stored[today] ?? 0) };
    try {
      window.localStorage.setItem(activityStorageKey, JSON.stringify(next));
    } catch {
      // best-effort
    }
    setActivity(next);
  }, [activityStorageKey]);

  React.useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const [me, trs] = await Promise.all([
          apiClient.get<User>('/users/me'),
          apiClient
            .get<SubscriptionTier[]>('/billing/tiers')
            .catch(() => ({ data: FALLBACK_TIERS })),
        ]);
        if (cancelled) return;
        setLocalUser(me.data);
        setUser(me.data);
        setTiers(Array.isArray(trs.data) && trs.data.length > 0 ? trs.data : FALLBACK_TIERS);
      } catch (err: any) {
        if (cancelled) return;
        const cachedUser = useAuthStore.getState().user;
        const code = err?.response?.data?.error?.code;
        if (code === 'usage_limit_exceeded') {
          showToast('error', 'You have reached your monthly simulation limit. Upgrade to Pro for unlimited simulations.');
        } else if (cachedUser) {
          setLocalUser(cachedUser);
          setTiers(FALLBACK_TIERS);
          showToast('info', 'Running in local demo mode — backend is not reachable. Features still available on-device.');
        } else {
          showToast('error', err?.response?.data?.error?.message ?? 'Failed to load dashboard');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    void load();
    return () => { cancelled = true; };
  }, [setUser, showToast]);

  const handleNewCircuit = () => navigate('/circuit/new');
  const handleStartLearning = () => navigate('/learn');

  const handleUpgradePro = async () => {
    setCheckoutLoading(true);
    try {
      const res = await apiClient.post<{ checkoutUrl: string }>('/billing/checkout', { tier: 'pro' });
      if (res.data?.checkoutUrl) {
        window.location.href = res.data.checkoutUrl;
      }
    } catch (err: any) {
      showToast('error', err?.response?.data?.error?.message ?? 'Failed to start checkout');
    } finally {
      setCheckoutLoading(false);
    }
  };

  const isFreeTier = (user?.tier ?? 'free') === 'free';
  const freeTierCap = tiers.find((t) => t.tier === 'free')?.simsPerMonth ?? DEFAULT_FREE_TIER_CAP;
  const usageUsed = user?.usageSims ?? 0;
  const usagePct = Math.min(100, Math.round((usageUsed / Math.max(1, freeTierCap)) * 100));
  const atCap = isFreeTier && usageUsed >= freeTierCap;

  const rawAvatarPreset = Number(user?.avatarPreset ?? 0);
  const currentPreset: AvatarPresetId = (Number.isFinite(rawAvatarPreset)
    ? Math.max(0, Math.min(2, rawAvatarPreset))
    : 0) as AvatarPresetId;
  const profileName = user?.email?.split('@')[0] ?? 'Quantum learner';
  const profileInitials = profileName.slice(0, 2).toUpperCase();
  const avatarShapeClass = currentPreset === 1
    ? 'rounded-xl bg-accent-500'
    : currentPreset === 2
      ? 'rounded-[50%] bg-primary-400'
      : 'rounded-full bg-primary-500';

  const completedModules = Object.values(curriculumProgress).filter((status) => status === 'completed').length;
  const startedModules = Object.values(curriculumProgress).filter(
    (status) => status === 'in_progress' || status === 'completed',
  ).length;
  const inProgressModules = Math.max(0, startedModules - completedModules);
  const totalModules = Math.max(TOTAL_MODULES, startedModules);
  const notStartedModules = Math.max(0, totalModules - startedModules);
  const persistedProgressEntries = Object.keys(curriculumProgress).length;
  const createdAtTimestamp = user?.createdAt ? Date.parse(user.createdAt) : Number.NaN;
  const accountAgeMs = Number.isFinite(createdAtTimestamp) ? Date.now() - createdAtTimestamp : Number.NaN;
  const isRecentlyCreated = Number.isFinite(accountAgeMs) && accountAgeMs >= 0 && accountAgeMs <= FIRST_SESSION_WINDOW_MS;
  const isFirstSession = startedModules === 0 && (persistedProgressEntries === 0 || isRecentlyCreated);
  const joinedLabel = Number.isFinite(createdAtTimestamp)
    ? new Date(createdAtTimestamp).toLocaleDateString(undefined, { month: 'short', year: 'numeric' })
    : null;

  const { activeDays, maxStreak, currentStreak } = React.useMemo(() => computeStreaks(activity), [activity]);
  const totalActivity = React.useMemo(
    () => Object.values(activity).reduce((sum, n) => sum + n, 0),
    [activity],
  );

  const handleAvatarPresetChange = async (presetId: AvatarPresetId) => {
    setSavingAvatarPreset(true);
    try {
      const res = await apiClient.patch<User>('/users/me', { avatarPreset: Number(presetId) });
      setLocalUser(res.data);
      setUser(res.data);
    } catch (err: any) {
      showToast('error', err?.response?.data?.error?.message ?? 'Failed to update avatar');
    } finally {
      setSavingAvatarPreset(false);
    }
  };

  const handleProfileAvatarUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      showToast('error', 'Choose an image file for your profile face.');
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      showToast('error', 'Please choose an image smaller than 2 MB.');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const value = typeof reader.result === 'string' ? reader.result : null;
      if (!value) return;
      try {
        window.localStorage.setItem(avatarStorageKey, value);
        setProfileAvatar(value);
      } catch {
        showToast('error', 'This browser could not save the profile image locally.');
      }
    };
    reader.readAsDataURL(file);
  };

  const removeProfileAvatar = () => {
    try {
      window.localStorage.removeItem(avatarStorageKey);
    } catch {
      // best-effort
    }
    setProfileAvatar(null);
  };

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center py-20">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-bg-700 border-t-primary-500" />
      </div>
    );
  }

  const statRow = (label: string, value: React.ReactNode, hint?: string) => (
    <div className="flex items-baseline justify-between gap-3 py-2">
      <div>
        <div className="text-sm text-text-200">{label}</div>
        {hint && <div className="text-xs text-text-500">{hint}</div>}
      </div>
      <div className="text-sm font-medium text-text-100">{value}</div>
    </div>
  );

  return (
    <div className="space-y-4">
      {toast && (
        <div className={`rounded-lg border px-4 py-3 text-sm ${
          toast.kind === 'error' ? 'border-red-900/60 bg-red-950/40 text-red-300' :
          toast.kind === 'success' ? 'border-emerald-900/60 bg-emerald-950/40 text-emerald-300' :
          'border-bg-700 bg-bg-800/60 text-text-200'
        }`}>
          {toast.msg}
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-[320px_minmax(0,1fr)]">
        {/* ============ LEFT: profile sidebar ============ */}
        <aside className="space-y-4">
          <Card>
            <CardContent className="space-y-5 p-5">
              <div className="flex items-center gap-4">
                <div
                  className={`flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden border-2 border-white/10 text-xl font-bold text-white shadow-inner ${avatarShapeClass}`}
                  {...(profileAvatar ? {} : { role: 'img', 'aria-label': `${profileName}'s avatar` })}
                >
                  {profileAvatar ? (
                    <img
                      src={profileAvatar}
                      alt={`${profileName}'s uploaded profile photo`}
                      className="h-full w-full object-cover"
                    />
                  ) : profileInitials}
                </div>
                <div className="min-w-0">
                  <h1 className="truncate text-xl font-semibold text-text-100">{profileName}</h1>
                  <p className="truncate text-sm text-text-400">{user?.email ?? 'Quantum learner'}</p>
                  <Badge variant="secondary" className="mt-2 capitalize">{user?.tier ?? 'free'} plan</Badge>
                </div>
              </div>

              <p className="text-sm leading-relaxed text-text-300">
                {isFirstSession
                  ? 'Welcome to QVANTA. Start with a guided lesson and build your first quantum circuit at your own pace.'
                  : 'Keep going: your next lesson and circuit are ready.'}
              </p>

              <div className="flex gap-2">
                <Button
                  variant="primary"
                  className="flex-1"
                  onClick={isFirstSession ? handleStartLearning : handleNewCircuit}
                >
                  {isFirstSession ? 'Start learning' : '+ New circuit'}
                </Button>
                <Button
                  variant="secondary"
                  onClick={() => setShowAvatarPicker((visible) => !visible)}
                  aria-expanded={showAvatarPicker}
                >
                  {showAvatarPicker ? 'Close' : 'Avatar'}
                </Button>
              </div>

              {showAvatarPicker && (
                <div className="border-t border-bg-800 pt-4">
                  <div className="mb-4 flex flex-wrap items-center gap-2">
                    <label className="inline-flex h-9 cursor-pointer items-center rounded-md border border-accent-500/35 bg-accent-500/10 px-3 text-xs font-medium text-accent-200 transition hover:border-accent-400/60 hover:bg-accent-500/15">
                      Upload your face
                      <input
                        type="file"
                        accept="image/*"
                        className="sr-only"
                        onChange={handleProfileAvatarUpload}
                      />
                    </label>
                    {profileAvatar && (
                      <Button variant="ghost" size="sm" onClick={removeProfileAvatar}>
                        Remove photo
                      </Button>
                    )}
                    <span className="text-xs text-text-500">Stored on this device · max 2 MB</span>
                  </div>
                  <div className="mb-3 flex items-center justify-between gap-3">
                    <p className="text-sm font-medium text-text-200">Choose your avatar</p>
                    {savingAvatarPreset && <span className="text-xs text-text-500">Saving…</span>}
                  </div>
                  <AvatarPresetPicker
                    value={currentPreset}
                    onChange={handleAvatarPresetChange}
                    disabled={savingAvatarPreset}
                    className="gap-3 sm:gap-4"
                  />
                </div>
              )}

              {joinedLabel && (
                <div className="border-t border-bg-800 pt-4 text-sm text-text-400">
                  Joined {joinedLabel}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-5">
              <h2 className="mb-2 text-base font-semibold text-text-100">Learning stats</h2>
              <div className="divide-y divide-bg-800">
                {statRow('Modules started', startedModules.toLocaleString())}
                {statRow('Modules completed', completedModules.toLocaleString())}
                {statRow('Simulations this month', usageUsed.toLocaleString())}
                {statRow('Learning XP', totalXp.toLocaleString(), progressSource === 'remote' ? 'Progress API connected' : 'Saved on this device')}
              </div>
            </CardContent>
          </Card>
        </aside>

        {/* ============ RIGHT: main column ============ */}
        <div className="min-w-0 space-y-4">
          {/* top stats strip */}
          <Card>
            <CardContent className="p-5">
              <div className="flex flex-wrap items-end gap-x-10 gap-y-4">
                <div>
                  <div className="text-sm text-text-400">Learning XP</div>
                  <div className="mt-1 text-3xl font-semibold text-amber-200">{totalXp.toLocaleString()}</div>
                </div>
                <div>
                  <div className="text-sm text-text-400">Average mastery</div>
                  <div className="mt-1 text-3xl font-semibold text-cyan-200">{averageMastery}%</div>
                </div>
                <div>
                  <div className="text-sm text-text-400">Simulations</div>
                  <div className="mt-1 text-3xl font-semibold text-text-100">{usageUsed.toLocaleString()}</div>
                </div>
              </div>
              <div className="mt-5 h-2 w-full overflow-hidden rounded-full bg-bg-800" aria-hidden="true">
                <div
                  className="h-full rounded-full bg-cyan-400/70 transition-all"
                  style={{ width: `${Math.max(0, Math.min(100, Number(averageMastery) || 0))}%` }}
                />
              </div>
              <p className="mt-2 text-xs text-text-500">Mastery across saved lesson checkpoints</p>
            </CardContent>
          </Card>

          {/* ring + plan */}
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardContent className="flex flex-wrap items-center justify-center gap-6 p-5">
                <ProgressRing done={completedModules} total={totalModules} />
                <div className="flex w-32 flex-col gap-2 text-center text-xs">
                  <div className="rounded-lg bg-bg-800 px-3 py-2">
                    <div className="font-medium text-emerald-400">Completed</div>
                    <div className="mt-0.5 text-sm font-semibold text-text-100">{completedModules}/{totalModules}</div>
                  </div>
                  <div className="rounded-lg bg-bg-800 px-3 py-2">
                    <div className="font-medium text-amber-400">In progress</div>
                    <div className="mt-0.5 text-sm font-semibold text-text-100">{inProgressModules}</div>
                  </div>
                  <div className="rounded-lg bg-bg-800 px-3 py-2">
                    <div className="font-medium text-text-400">Not started</div>
                    <div className="mt-0.5 text-sm font-semibold text-text-100">{notStartedModules}</div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="flex h-full flex-col p-5">
                <div className="text-sm text-text-400">Plan</div>
                <div className="mt-1 text-2xl font-semibold capitalize text-text-100">{user?.tier ?? 'free'}</div>

                <div className="mt-4 flex items-baseline justify-between text-sm">
                  <span className="text-text-400">Simulations this month</span>
                  <span className="font-mono text-text-200">
                    {usageUsed.toLocaleString()}
                    <span className="text-text-500"> / {isFreeTier ? freeTierCap.toLocaleString() : '∞'}</span>
                  </span>
                </div>
                {isFreeTier ? (
                  <div className="mt-2 h-2.5 w-full overflow-hidden rounded-full bg-bg-800">
                    <div
                      className={`h-full rounded-full transition-all ${atCap ? 'bg-red-500' : 'bg-primary-500'}`}
                      style={{ width: `${usagePct}%` }}
                    />
                  </div>
                ) : (
                  <p className="mt-2 text-xs text-text-500">Your plan includes unlimited simulations.</p>
                )}

                {atCap && (
                  <div className="mt-3 rounded-lg border border-red-900/50 bg-red-950/40 p-3 text-sm text-red-300">
                    You've reached your {freeTierCap} free simulations for the month.
                  </div>
                )}

                {isFreeTier && (
                  <div className="mt-auto flex items-center justify-between gap-3 pt-4">
                    <span className="text-xs text-text-500">
                      {tiers.find((t) => t.tier === 'pro')?.description ?? 'Unlock unlimited simulations and the full lesson library.'}
                    </span>
                    <Button variant="primary" onClick={handleUpgradePro} loading={checkoutLoading}>
                      Upgrade to Pro
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* activity heatmap */}
          <Card>
            <CardContent className="p-5">
              <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
                <h2 className="text-base text-text-100">
                  <span className="text-xl font-semibold">{totalActivity.toLocaleString()}</span>{' '}
                  active {totalActivity === 1 ? 'day' : 'days'} logged in the past year
                </h2>
                <div className="flex gap-4 text-xs text-text-400">
                  <span>Total active days: <span className="font-medium text-text-200">{activeDays}</span></span>
                  <span>Max streak: <span className="font-medium text-text-200">{maxStreak}</span></span>
                  <span>Current streak: <span className="font-medium text-text-200">{currentStreak}</span></span>
                </div>
              </div>
              <Heatmap activity={activity} />
              <p className="mt-2 text-xs text-text-500">Activity is tracked on this device.</p>
            </CardContent>
          </Card>

          {/* quick actions (tab-style row) */}
          <Card>
            <CardContent className="p-3">
              <div className="flex flex-wrap items-center gap-1">
                <Button variant="primary" onClick={handleStartLearning}>
                  {isFirstSession ? 'Start your first lesson' : 'Continue learning'}
                </Button>
                <Button variant="ghost" onClick={handleNewCircuit}>New circuit</Button>
                <Button variant="ghost" onClick={() => navigate('/tutor')}>AI Tutor</Button>
                <Button variant="ghost" className="ml-auto" onClick={() => navigate('/billing')}>
                  Manage subscription
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default DashboardPage;