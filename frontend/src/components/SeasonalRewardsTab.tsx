import { useState, useMemo, useEffect, useRef } from 'react';
import { Lock, CheckCircle, RefreshCw } from 'lucide-react';
import { Card } from './ui/card';
import { Button } from './ui/button';
import { Progress } from './ui/progress';
import { UserQuest, claimQuest, Season, fetchQuests, Quest } from '../services/api';

interface SeasonalRewardsTabProps {
  walletAddress: string;
  userQuests: UserQuest[];
  currentUserLevel: number | null;
  currentUserXP: number | null;
  season: Season | null;
  loading: boolean;
  error: string | null;
  onRefresh: () => void | Promise<void>;
}

interface LevelReward {
  level: number;
  description: string;
  locked: boolean;
  claimed: boolean;
  claimable?: boolean;
  questId?: number;
}

// Cache for seasonal quest badge URIs
const seasonalBadgeCache = new Map<string, string | null>();

export function SeasonalRewardsTab({ walletAddress, userQuests, currentUserLevel, currentUserXP, season, loading, error, onRefresh }: SeasonalRewardsTabProps) {
  const [claimingId, setClaimingId] = useState<number | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [seasonEndsText, setSeasonEndsText] = useState<string>('');
  const [badgeImages, setBadgeImages] = useState<Record<number, string | null>>({});

  // Live countdown to season end (days, hours, minutes)
  useEffect(() => {
    function format(ms: number): string {
      if (ms <= 0) return 'Ended';
      const totalMinutes = Math.floor(ms / 60000);
      const days = Math.floor(totalMinutes / (60 * 24));
      const remainingMinutes = totalMinutes - days * 60 * 24;
      const hours = Math.floor(remainingMinutes / 60);
      const minutes = remainingMinutes % 60;
      if (days > 0) return `${days}d ${hours}h ${minutes}m`;
      if (hours > 0) return `${hours}h ${minutes}m`;
      return `${minutes}m`;
    }

    let timer: number | undefined;
    if (season?.endAt) {
      const endTime = new Date(season.endAt).getTime();
      const update = () => {
        const now = Date.now();
        setSeasonEndsText(format(endTime - now));
      };
      update();
      timer = window.setInterval(update, 60000);
    } else {
      setSeasonEndsText('TBA');
    }

    return () => {
      if (timer) window.clearInterval(timer);
    };
  }, [season?.endAt]);

  const currentLevel = currentUserLevel ?? 1;
  const currentXP = currentUserXP ?? 0;
  const nextLevelXP = 1000;
  const previousLevelXP = 0;
  const progressPercent = nextLevelXP > previousLevelXP ? ((currentXP - previousLevelXP) / (nextLevelXP - previousLevelXP)) * 100 : 0;

  const [fetchedQuests, setFetchedQuests] = useState<Quest[]>([]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const qs = await fetchQuests();
        if (cancelled) return;
        setFetchedQuests(qs || []);
      } catch (e) {
        //console.warn('Failed to fetch quests metadata', e);
        if (!cancelled) setFetchedQuests([]);
      }
    })();
    return () => { cancelled = true; };
  }, [season?.id]);

  const seasonalQuests = useMemo(() => {
    const userByQuestId = new Map<number, UserQuest>();
    for (const uq of userQuests) {
      const qid = uq.quest?.id ?? (uq as any).questId;
      if (typeof qid === 'number') userByQuestId.set(qid, uq);
    }

    const combined: UserQuest[] = [];

    for (const uq of userQuests) {
      if (uq.quest?.type === 'SEASONAL') combined.push(uq);
    }

    const seasonIdNum = season ? Number((season as any).id) : undefined;
    for (const q of fetchedQuests) {
      if (q.type !== 'SEASONAL') continue;
      if (seasonIdNum && typeof q.seasonId === 'number' && q.seasonId !== seasonIdNum) continue;
      if (userByQuestId.has(q.id)) continue;

      const synthetic: UserQuest = {
        questId: q.id,
        status: 'NOT_STARTED',
        wallet: walletAddress ?? '',
        completion: 0,
        completionPercent: 0,
        progress: null,
        target: null,
        quest: q,
      };
      combined.push(synthetic);
    }

    return combined;
  }, [userQuests, fetchedQuests, season, walletAddress]);

  const levelRewards: LevelReward[] = useMemo(() => {
    const arr: LevelReward[] = [];
    for (let level = 1; level <= 10; level++) {
      const q = seasonalQuests.find(uq => {
        const req = uq.quest?.requirement || {} as any;
        const reqLevel = typeof req.minLevel === 'number' ? req.minLevel : (typeof req.level === 'number' ? req.level : undefined);
        return reqLevel === level;
      });

      arr.push({
        level,
        description: q?.quest?.description || `Requires Level ${level}`,
        locked: currentLevel < level,
        claimed: q?.status === 'CLAIMED',
        claimable: q?.status === 'COMPLETED',
        questId: q?.quest?.id,
      });
    }
    return arr;
  }, [seasonalQuests, currentLevel]);

  // Fetch badge images for seasonal quests
  useEffect(() => {
    let cancelled = false;
    async function resolveBadgeImage(uri: string): Promise<string | null> {
      if (!uri) return null;
      if (seasonalBadgeCache.has(uri)) return seasonalBadgeCache.get(uri) as string | null;
      try {
        const lower = uri.toLowerCase();
        const isDirect = /\.(png|jpg|jpeg|gif|webp|svg)$/.test(lower);
        let imageUrl: string | null = null;
        if (isDirect) {
          imageUrl = uri.startsWith('ipfs://') ? `https://gateway.pinata.cloud/ipfs/${uri.slice(7)}` : uri;
        } else {
          const metaUrl = uri.startsWith('ipfs://') ? `https://gateway.pinata.cloud/ipfs/${uri.slice(7)}` : uri;
          const r = await fetch(metaUrl, { headers: { Accept: 'application/json' } });
          if (!r.ok) throw new Error('metadata fetch failed');
          const metadata = await r.json().catch(() => null);
          if (metadata && metadata.image) {
            imageUrl = metadata.image.startsWith('ipfs://') ? `https://gateway.pinata.cloud/ipfs/${metadata.image.slice(7)}` : metadata.image;
          }
        }
        seasonalBadgeCache.set(uri, imageUrl);
        return imageUrl;
      } catch (e) {
        seasonalBadgeCache.set(uri, null);
        return null;
      }
    }
    async function run() {
      const updates: Record<number, string | null> = {};
      for (const uq of seasonalQuests) {
        const questId = uq.quest?.id;
        if (!questId) continue;
        if (badgeImages[questId] !== undefined) continue; // already fetched
        const badgeUri: string | undefined = (uq.quest as any)?.reward?.badgeUri;
        if (!badgeUri) continue;
        const img = await resolveBadgeImage(badgeUri);
        updates[questId] = img;
      }
      if (!cancelled && Object.keys(updates).length) {
        setBadgeImages(prev => ({ ...prev, ...updates }));
      }
    }
    run();
    return () => { cancelled = true; };
  }, [seasonalQuests, badgeImages]);

  const handleClaim = async (questId?: number) => {
    if (!questId) return;
    try {
      setClaimingId(questId);
      await claimQuest(questId, walletAddress);
      await onRefresh();
    } catch (e) {
      //console.error('Failed to claim seasonal reward', e);
    } finally {
      setClaimingId(null);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await onRefresh();
    setRefreshing(false);
  };

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl text-white mb-2">Seasonal Rewards</h1>
          <p className="text-slate-400">
            {(season?.name ?? 'Season')} Battle Pass: Unlock rewards as you level up
          </p>
          <p className="text-xs text-slate-500 mt-2">
            ⏱️ Level rewards progress syncs every 5 minutes
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
              <p className="text-3xl text-blue-400">{currentXP} XP</p>
              <p className="text-sm text-slate-400">{Math.max(nextLevelXP - currentXP, 0).toLocaleString()} XP to next level</p>
            </div>
          </div>
          <Progress value={progressPercent} className="h-3 progress-green" />
        </div>
      </Card>

      {/* Errors and actions */}
      {/* Removed separate errors/actions block; button now in header */}

      {/* Level Rewards - Horizontal Scroll */}
      <div>
        <h3 className="text-xl text-white mb-4">Level Rewards</h3>
        <HorizontalWheelScroller className="flex gap-4 overflow-x-auto pb-4 px-4 scrollbar-thin scrollbar-thumb-slate-700 scrollbar-track-slate-900">
          {loading ? (
            <p className="text-slate-400 text-sm">Loading rewards…</p>
          ) : (
            levelRewards.map((reward, idx) => (
              <div
                key={reward.level}
                className={`${idx === 0 ? 'ml-1' : ''} ${idx === levelRewards.length - 1 ? 'mr-1' : ''}`}
              >
                <LevelRewardCard
                  reward={reward}
                  badgeImage={reward.questId ? badgeImages[reward.questId] : null}
                  isClaiming={claimingId === reward.questId}
                  onClaim={() => handleClaim(reward.questId)}
                />
              </div>
            ))
          )}
        </HorizontalWheelScroller>
      </div>

      {/* Season Info */}
      <Card className="bg-slate-800/50 backdrop-blur-sm border-slate-700 p-6">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-white mb-1">{season?.name ?? 'Season'} Ends In</h3>
            <p className="text-2xl text-blue-400">{seasonEndsText || '—'}</p>
          </div>
        </div>
      </Card>
    </div>
  );
}

// Convert vertical wheel scrolling into horizontal scrolling
function HorizontalWheelScroller({ className, children }: { className?: string; children: React.ReactNode }) {
  const ref = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      if (Math.abs(e.deltaY) >= Math.abs(e.deltaX)) {
        e.preventDefault();
        el.scrollLeft += e.deltaY;
      }
    };
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, []);
  
  return (
    <div ref={ref} className={className + ' py-3'} style={{ overflowX: 'auto' }}>
      {children}
    </div>
  );
}

function LevelRewardCard({ reward, badgeImage, isClaiming, onClaim }: { reward: LevelReward; badgeImage: string | null; isClaiming: boolean; onClaim: () => void | Promise<void> }) {
  return (
    <Card
      className={`level-reward-card flex-shrink-0 w-64 p-6 will-change-transform transition-all duration-300 ease-out hover:scale-105 backdrop-blur-sm ${
        reward.locked
          ? 'bg-slate-800/30 border-slate-700/50'
          : reward.claimed
          ? 'bg-green-900/20 border-green-700/50 hover:shadow-lg hover:shadow-green-500/20 hover:border-green-500/60'
          : 'bg-blue-900/30 border-blue-700/50 hover:shadow-lg hover:shadow-blue-500/30 hover:border-blue-500/60'
      }`}
    >
      <div className="flex flex-col items-center text-center space-y-4">
        {/* Level Badge (image or fallback circle) */}
        {badgeImage ? (
          <div className="relative w-22 h-22 rounded-full overflow-hidden border border-slate-800">
            <img
              src={badgeImage}
              alt={`Level ${reward.level}`}
              className="w-full h-full object-cover"
              style={reward.locked ? { filter: 'brightness(0.35) saturate(0.8) contrast(1.1)' } : undefined}
              draggable={false}
            />
            {reward.locked && (
              <div className="absolute inset-0 bg-black/60 flex items-center justify-center opacity-60"/>
            )}
            {reward.claimed && !reward.locked && <div className="absolute inset-0 ring-2 ring-green-500/70 pointer-events-none" />}
            {!reward.claimed && !reward.locked && <div className="absolute inset-0 ring-2 ring-blue-500/40 pointer-events-none" />}
          </div>
        ) : (
          <div className={`w-22 h-22 rounded-full flex items-center justify-center text-2xl ${
            reward.locked
              ? 'bg-slate-700 text-slate-500 opacity-60'
              : reward.claimed
              ? 'bg-green-600 text-white'
              : 'bg-blue-600 text-white'
          }`}>
            {reward.locked ? <Lock className="w-8 h-8 opacity-60" /> : reward.level}
          </div>
        )}

        {/* Level Title */}
        <div>
          <h3 className={`text-white mb-1 ${reward.locked ? 'opacity-60' : ''}`}>
            Level {reward.level}
          </h3>
          <p className={`text-sm text-slate-400 ${reward.locked ? 'opacity-60' : ''}`}>
            {reward.description}
          </p>
        </div>

        {/* Action Button: only allow claiming when the quest itself is COMPLETED (not based on level) */}
        {reward.claimed ? (
          <div className="flex items-center gap-2 text-green-400 text-sm">
            <CheckCircle className="w-4 h-4" />
            Claimed
          </div>
        ) : reward.claimable ? (
          <Button size="sm" className="w-full bg-blue-600 hover:bg-blue-700 text-white" onClick={onClaim} disabled={isClaiming}>
            {isClaiming ? 'Claiming…' : 'Claim Badge'}
          </Button>
        ) : (
          <Button size="sm" disabled className="w-full bg-slate-700 text-slate-500">
            Locked
          </Button>
        )}
      </div>
    </Card>
  );
}
