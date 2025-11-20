import { useState } from 'react';
import { Clock, Zap, CheckCircle2, Circle, RefreshCw } from 'lucide-react';
import { Card } from './ui/card';
import { Button } from './ui/button';
import { Progress } from './ui/progress';
import { UserQuest, claimQuest } from '../services/api';

interface QuestsTabProps {
  walletAddress: string;
  userQuests: UserQuest[];
  currentUserLevel: number | null;
  currentUserXP: number | null;
  loading: boolean;
  error: string | null;
  onRefresh: () => void | Promise<void>;
}

export function QuestsTab({ walletAddress, userQuests, currentUserLevel, currentUserXP, loading, error, onRefresh }: QuestsTabProps) {
  const [claimingId, setClaimingId] = useState<number | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const currentXP = currentUserXP ?? 0;
  const currentLevel = currentUserLevel ?? 0;
  const previousLevelXP = currentLevel > 0 ? (currentLevel - 1) * 1000 : 0; // placeholder curve
  const nextLevelXP = (currentLevel + 1) * 1000; // placeholder curve
  const progressPercent = nextLevelXP > previousLevelXP ? ((currentXP - previousLevelXP) / (nextLevelXP - previousLevelXP)) * 100 : 0;

  const onboardingQuests = userQuests.filter((uq) => uq.quest?.type === 'ONBOARDING');
  const dailyQuests = userQuests.filter((uq) => uq.quest?.type === 'DAILY');
  const weeklyQuests = userQuests.filter((uq) => uq.quest?.type === 'WEEKLY');

  const handleClaim = async (questId: number) => {
    try {
      setClaimingId(questId);
      await claimQuest(questId, walletAddress);
      await onRefresh();
    } catch (e) {
      console.error('Failed to claim quest', e);
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
      <Card className="bg-gradient-to-r from-blue-900/50 to-purple-900/50 border-blue-700/50 p-6">
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
          <Zap className="w-6 h-6 text-yellow-400" />
          <h2 className="text-2xl text-white">Onboarding Quests</h2>
        </div>
        <div className="space-y-3">
          {loading ? (
            <p className="text-slate-400 text-sm">Loading quests…</p>
          ) : onboardingQuests.length === 0 ? (
            <p className="text-slate-400 text-sm">No onboarding quests available.</p>
          ) : (
            onboardingQuests.map((uq) => (
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
          <span className="text-sm text-slate-400">(Resets in 8h 34m)</span>
        </div>
        <div className="space-y-3">
          {loading ? (
            <p className="text-slate-400 text-sm">Loading quests…</p>
          ) : dailyQuests.length === 0 ? (
            <p className="text-slate-400 text-sm">No daily quests available.</p>
          ) : (
            dailyQuests.map((uq) => (
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
          <span className="text-sm text-slate-400">(Resets in 3d 12h)</span>
        </div>
        <div className="space-y-3">
          {loading ? (
            <p className="text-slate-400 text-sm">Loading quests…</p>
          ) : weeklyQuests.length === 0 ? (
            <p className="text-slate-400 text-sm">No weekly quests available.</p>
          ) : (
            weeklyQuests.map((uq) => (
              <QuestCard key={uq.questId} uq={uq} onClaim={handleClaim} claimingId={claimingId} />
            ))
          )}
        </div>
      </section>
    </div>
  );
}

function QuestCard({ uq, onClaim, claimingId }: { uq: UserQuest; onClaim: (questId: number) => void | Promise<void>; claimingId: number | null }) {
  const progress = typeof uq.progress === 'number' && typeof uq.target === 'number' ? uq.progress : null;
  const target = typeof uq.target === 'number' ? uq.target : null;
  const completionPercent = typeof uq.completionPercent === 'number' ? uq.completionPercent : (uq.completion ?? 0) * 100;

  const canClaim = uq.status === 'COMPLETED';
  const isClaimed = uq.status === 'CLAIMED';
  const isClaiming = claimingId === (uq.quest?.id ?? 0);

  return (
    <Card className="bg-slate-800/50 border-slate-700 p-5 hover:bg-slate-800/70 transition-colors">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 space-y-3">
          <div className="flex items-start gap-3">
            {isClaimed ? (
              <CheckCircle2 className="w-6 h-6 text-green-400 flex-shrink-0 mt-1" />
            ) : (
              <Circle className="w-6 h-6 text-slate-500 flex-shrink-0 mt-1" />
            )}
            <div className="flex-1">
              <h3 className="text-white mb-1">{uq.quest?.title}</h3>
              <p className="text-sm text-slate-400">{uq.quest?.description}</p>
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

        {isClaimed ? (
          <Button size="sm" disabled className="bg-green-600 text-white">
            Claimed
          </Button>
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
          <Button size="sm" variant="outline" disabled className="border-slate-600 text-slate-500">
            In Progress
          </Button>
        )}
      </div>
    </Card>
  );
}