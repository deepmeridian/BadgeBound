import { useState, useEffect, useRef } from 'react';
import { Clock, Zap, CheckCircle2, Circle, RefreshCw, ClipboardList } from 'lucide-react';
import { Card } from './ui/card';
import { Button } from './ui/button';
import { Progress } from './ui/progress';
import { UserQuest, Quest, claimQuest } from '../services/api';

interface QuestsTabProps {
  walletAddress: string;
  userQuests: UserQuest[];
  baseQuests: Quest[];
  currentUserLevel: number | null;
  currentUserXP: number | null;
  loading: boolean;
  error: string | null;
  onRefresh: () => void | Promise<void>;
}

export function QuestsTab({ walletAddress, userQuests, baseQuests, currentUserLevel, currentUserXP, loading, error, onRefresh }: QuestsTabProps) {
  const [claimingId, setClaimingId] = useState<number | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [dailyResetText, setDailyResetText] = useState<string>('');
  const [weeklyResetText, setWeeklyResetText] = useState<string>('');

  const currentLevel = currentUserLevel ?? 1;
  const currentXP = currentUserXP ?? 0;
  const nextLevelXP = 1000;
  const previousLevelXP = 0;
  const progressPercent = nextLevelXP > previousLevelXP ? ((currentXP - previousLevelXP) / (nextLevelXP - previousLevelXP)) * 100 : 0;

  // Combine base quests with user quest progress
  const userQuestMap = new Map<number, UserQuest>(userQuests.map(uq => [uq.quest.id, uq]));
  const combined: UserQuest[] = baseQuests.map((q: Quest) => {
    const existing = userQuestMap.get(q.id);
    if (existing) return existing;
    // Placeholder UserQuest when user has no record yet
    return {
      questId: q.id,
      status: 'IN_PROGRESS',
      wallet: walletAddress,
      completion: 0,
      completionPercent: 0,
      progress: null,
      target: null,
      quest: q,
    } as UserQuest;
  });

  const onboardingQuests: UserQuest[] = combined.filter((uq: UserQuest) => uq.quest?.type === 'ONBOARDING');
  const dailyQuests: UserQuest[] = combined.filter((uq: UserQuest) => uq.quest?.type === 'DAILY');
  const weeklyQuests: UserQuest[] = combined.filter((uq: UserQuest) => uq.quest?.type === 'WEEKLY');

  const handleClaim = async (questId: number) => {
    try {
      setClaimingId(questId);
      await claimQuest(questId, walletAddress);
      await onRefresh();
    } catch (e) {
      //console.error('Failed to claim quest', e);
    } finally {
      setClaimingId(null);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await onRefresh();
    setRefreshing(false);
  };

  // UTC reset countdowns for Daily (next UTC midnight) and Weekly (next Monday 00:00 UTC)
  useEffect(() => {
    function formatDaily(ms: number): string {
      if (ms <= 0) return 'Resets now';
      const totalMinutes = Math.floor(ms / 60000);
      const hours = Math.floor(totalMinutes / 60);
      const minutes = totalMinutes % 60;
      if (hours === 0) return `Resets in ${minutes}m`;
      return `Resets in ${hours}h ${minutes}m`;
    }
    function formatWeekly(ms: number): string {
      if (ms <= 0) return 'Resets now';
      const totalMinutes = Math.floor(ms / 60000);
      const days = Math.floor(totalMinutes / (60 * 24));
      const remainingMinutes = totalMinutes - days * 60 * 24;
      const hours = Math.floor(remainingMinutes / 60);
      const minutes = remainingMinutes % 60;
      if (days > 0) return `Resets in ${days}d ${hours}h ${minutes}m`;
      if (hours > 0) return `Resets in ${hours}h ${minutes}m`;
      return `Resets in ${minutes}m`;
    }
    function nextUtcMidnight(): Date {
      const now = new Date();
      return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1, 0, 0, 0));
    }
    function nextMondayUtc(): Date {
      const now = new Date();
      const day = now.getUTCDay(); // 0=Sun,1=Mon,...
      const daysAhead = (8 - day) % 7; // next Monday
      return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + daysAhead, 0, 0, 0));
    }
    function update() {
      const now = Date.now();
      const dailyMs = nextUtcMidnight().getTime() - now;
      const weeklyMs = nextMondayUtc().getTime() - now;
      setDailyResetText(formatDaily(dailyMs));
      setWeeklyResetText(formatWeekly(weeklyMs));
    }
    update();
    const id = setInterval(update, 60000); // update each minute
    return () => clearInterval(id);
  }, []);

  return (
    <div className="space-y-8 w-full">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl text-white mb-2">Quests</h1>
          <p className="text-slate-400">
            Complete quests to earn XP and unlock badge NFTs
          </p>
          <p className="text-xs text-slate-500 mt-2">
            ⏱️ Quest progress syncs every 5 minutes
          </p>
          {error && <p className="text-sm text-red-400 mt-2">{error}</p>}
        </div>
        <button
          onClick={handleRefresh}
          disabled={loading || refreshing}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-600 text-white rounded-lg transition-colors flex items-center gap-2"
        >
          <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
          {refreshing ? 'Refreshing...' : 'Refresh'}
        </button>
      </div>

      {/* Current Progress */}
      <Card className="bg-gradient-to-r from-blue-900/50 border-blue-700/50 p-6 backdrop-blur-sm">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl text-white">Level {currentLevel}</h2>
              <p className="text-slate-300">Season Progress</p>
            </div>
            <div className="text-right">
              <p className="text-3xl text-blue-400">{currentXP.toLocaleString()} XP</p>
              <p className="text-sm text-slate-400">{Math.max(nextLevelXP - currentXP, 0).toLocaleString()} XP to next level</p>
            </div>
          </div>
          <Progress value={progressPercent} className="h-3 progress-green" />
        </div>
      </Card>

      {/* Removed separate errors/actions block; button now in header */}

      {/* Onboarding Quests */}
      <section>
        <div className="flex items-center gap-3 mb-4">
          <ClipboardList className="w-6 h-6 text-green-400" />
          <h2 className="text-2xl text-white">Onboarding Quests</h2>
          <span className="text-sm text-slate-400">(One time only quests)</span>
        </div>
        <div className="space-y-3">
          {loading ? (
            <p className="text-slate-400 text-sm">Loading quests…</p>
          ) : onboardingQuests.length === 0 ? (
            <p className="text-slate-400 text-sm">No onboarding quests available.</p>
          ) : (
            onboardingQuests.map((uq: UserQuest) => (
              <QuestCard key={uq.questId} uq={uq} onClaim={handleClaim} claimingId={claimingId} />
            ))
          )}
        </div>
      </section>

      {/* Daily Quests */}
      <section>
        <div className="flex items-center gap-3 mb-4">
          <Zap className="w-6 h-6 text-yellow-400" />
          <h2 className="text-2xl text-white">Daily Quests</h2>
          <span className="text-sm text-slate-400">({dailyResetText || '...'})</span>
        </div>
        <div className="space-y-3">
          {loading ? (
            <p className="text-slate-400 text-sm">Loading quests…</p>
          ) : dailyQuests.length === 0 ? (
            <p className="text-slate-400 text-sm">No daily quests available.</p>
          ) : (
            dailyQuests.map((uq: UserQuest) => (
              <QuestCard key={uq.questId} uq={uq} onClaim={handleClaim} claimingId={claimingId} />
            ))
          )}
        </div>
      </section>

      {/* Weekly Quests */}
      <section>
        <div className="flex items-center gap-3 mb-4">
          <Clock className="w-6 h-6 text-blue-400" />
          <h2 className="text-2xl text-white">Weekly Quests</h2>
          <span className="text-sm text-slate-400">({weeklyResetText || '...'})</span>
        </div>
        <div className="space-y-3">
          {loading ? (
            <p className="text-slate-400 text-sm">Loading quests…</p>
          ) : weeklyQuests.length === 0 ? (
            <p className="text-slate-400 text-sm">No weekly quests available.</p>
          ) : (
            weeklyQuests.map((uq: UserQuest) => (
              <QuestCard key={uq.questId} uq={uq} onClaim={handleClaim} claimingId={claimingId} />
            ))
          )}
        </div>
      </section>
    </div>
  );
}

const badgeCache = new Map<string, string | null>();

function renderQuestTitle(title: string) {
  if (!title) return null;
  const parts = title.split(/(SaucerSwap)/g);
  return parts.map((part, idx) => {
    if (part === 'SaucerSwap') {
      return (
        <a
          key={idx}
          href="https://www.saucerswap.finance/"
          target="_blank"
          rel="noopener noreferrer"
          className="text-blue-400 hover:text-blue-300"
          style={{ textDecoration: 'none' }}
        >
          SaucerSwap
        </a>
      );
    }
    return part;
  });
}

function QuestCard({ uq, onClaim, claimingId }: { uq: UserQuest; onClaim: (questId: number) => void | Promise<void>; claimingId: number | null }) {
  const progress = typeof uq.progress === 'number' && typeof uq.target === 'number' ? uq.progress : null;
  const target = typeof uq.target === 'number' ? uq.target : null;
  const completionPercent = typeof uq.completionPercent === 'number' ? uq.completionPercent : (uq.completion ?? 0) * 100;

  const canClaim = uq.status === 'COMPLETED';
  const isClaimed = uq.status === 'CLAIMED';
  const isClaiming = claimingId === (uq.quest?.id ?? 0);

  // Badge image derived from quest.reward.badgeUri
  const badgeUri: string | undefined = (uq.quest as any)?.reward?.badgeUri;
  const [badgeImage, setBadgeImage] = useState<string | null>(null);
  const [badgeLoading, setBadgeLoading] = useState<boolean>(false);
  const [badgeError, setBadgeError] = useState<boolean>(false);
  const didStart = useRef(false);

  useEffect(() => {
    if (!badgeUri || didStart.current) return;
    const uri: string = badgeUri;
    didStart.current = true;
    if (badgeCache.has(uri)) {
      setBadgeImage(badgeCache.get(uri) || null);
      return;
    }
    let cancelled = false;
    async function run() {
      setBadgeLoading(true);
      setBadgeError(false);
      try {
        const hash: string = uri.startsWith('ipfs://') ? uri.slice(7) : '';
        const metaUrl: string = hash ? `https://gateway.pinata.cloud/ipfs/${hash}` : uri;
        const r = await fetch(metaUrl, { headers: { Accept: 'application/json' } });
        if (!r.ok) throw new Error('metadata fetch failed');
        const metadata = await r.json().catch(() => null);
        let img: string | null = null;
        if (metadata && metadata.image) {
          img = metadata.image.startsWith('ipfs://') ? `https://gateway.pinata.cloud/ipfs/${metadata.image.slice(7)}` : metadata.image;
        }
        badgeCache.set(uri, img);
        if (!cancelled) setBadgeImage(img);
      } catch (_) {
        badgeCache.set(uri, null);
        if (!cancelled) setBadgeError(true);
      } finally {
        if (!cancelled) setBadgeLoading(false);
      }
    }
    run();
    return () => { cancelled = true; };
  }, [badgeUri]);

  // Dynamic square image sizing
  const contentRef = useRef<HTMLDivElement | null>(null);
  const [imgSize, setImgSize] = useState<number>(80);
  useEffect(() => {
    if (!contentRef.current) return;
    const el = contentRef.current;
    const update = () => {
      const h = el.offsetHeight;
      if (h && h !== imgSize) setImgSize(h);
    };
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, [imgSize]);

  return (
    <Card className="quest-card bg-slate-800/80 border-slate-600 p-5 hover:bg-slate-800/90 backdrop-blur-sm shadow-md shadow-black/30">
      <div className="flex items-start gap-4" ref={contentRef}>
        {/* Dynamic square image */}
        <div
          className="relative flex-shrink-0 rounded-lg overflow-hidden border border-slate-700"
          style={{ width: imgSize, height: imgSize, minWidth: 80 }}
        >
          {badgeImage && (
            <img
              src={badgeImage}
              alt={uq.quest?.title || 'Badge'}
              className="w-full h-full object-cover"
              style={!isClaimed ? { filter: 'brightness(0.35) saturate(0.8) contrast(1.1)' } : undefined}
              draggable={false}
            />
          )}
          {!badgeImage && badgeLoading && <div className="w-full h-full bg-slate-700 animate-pulse" />}
          {!badgeImage && !badgeLoading && (
            <div className="w-full h-full bg-slate-700/50 flex items-center justify-center text-[10px] text-slate-500">
              {badgeError ? 'Image Error' : 'No Image'}
            </div>
          )}
          {!isClaimed && badgeImage && <div className="absolute inset-0 bg-black/60" />}
          {isClaimed && badgeImage && <div className="absolute inset-0 ring-2 ring-green-500/70 pointer-events-none" />}
        </div>

        <div className="flex-1 space-y-3">
          <div className="flex items-start gap-3">
            {isClaimed ? (
              <CheckCircle2 className="w-6 h-6 text-green-400 flex-shrink-0 mt-1" />
            ) : (
              <Circle className="w-6 h-6 text-slate-500 flex-shrink-0 mt-1" />
            )}
            <div className="flex-1">
              <h3 className="text-white mb-1">{renderQuestTitle(uq.quest?.title || '')}</h3>
              <p className="text-sm text-slate-400">{uq.quest?.description}</p>
            </div>
            {/* Action button inline to preserve original height */}
            <div className="flex-shrink-0">
              {isClaimed ? (
                <Button size="sm" disabled className="bg-green-600 text-white">Claimed</Button>
              ) : canClaim ? (
                <Button
                  size="sm"
                  className="bg-blue-600 hover:bg-blue-700 text-white"
                  onClick={() => uq.quest?.id && onClaim(uq.quest.id)}
                  disabled={isClaiming}
                >
                  {isClaiming ? 'Claiming…' : 'Claim'}
                </Button>
              ) : (
                <Button size="sm" variant="outline" disabled className="border-slate-600 text-slate-500">In Progress</Button>
              )}
            </div>
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-slate-400">
                {progress !== null && target !== null ? (
                  completionPercent >= 100
                    ? `Progress: ${target}/${target}`
                    : `Progress: ${progress}/${target}`
                ) : (
                  `Completion: ${completionPercent}%`
                )}
              </span>
              <span className="text-blue-400">+{uq.quest?.reward?.xp ?? 0} XP</span>
            </div>
            <Progress value={progress !== null && target ? (progress / target) * 100 : completionPercent} className="h-2 progress-green" />
          </div>
        </div>
      </div>
    </Card>
  );
}