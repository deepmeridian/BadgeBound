import { useState, useMemo } from 'react';
import { Lock, Gift, CheckCircle, RefreshCw } from 'lucide-react';
import { Card } from './ui/card';
import { Button } from './ui/button';
import { Progress } from './ui/progress';
import { UserQuest, claimQuest } from '../services/api';

interface SeasonalRewardsTabProps {
  walletAddress: string;
  userQuests: UserQuest[];
  currentUserLevel: number | null;
  currentUserXP: number | null;
  loading: boolean;
  error: string | null;
  onRefresh: () => void | Promise<void>;
}

interface LevelReward {
  level: number;
  rewards: string[];
  locked: boolean;
  claimed: boolean;
  questId?: number;
}

export function SeasonalRewardsTab({ walletAddress, userQuests, currentUserLevel, currentUserXP, loading, error, onRefresh }: SeasonalRewardsTabProps) {
  const [claimingId, setClaimingId] = useState<number | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  // Keep the top progress visuals simple for now
  const currentLevel = currentUserLevel ?? 0;
  const currentXP = currentUserXP ?? 0;
  const nextLevelXP = 1000;
  const previousLevelXP = 0;
  const progressPercent = nextLevelXP > previousLevelXP ? ((currentXP - previousLevelXP) / (nextLevelXP - previousLevelXP)) * 100 : 0;

  const seasonalQuests = useMemo(() => userQuests.filter(uq => uq.quest?.type === 'SEASONAL'), [userQuests]);

  const levelRewards: LevelReward[] = useMemo(() => {
    const arr: LevelReward[] = [];
    for (let level = 1; level <= 10; level++) {
      const q = seasonalQuests.find(uq => {
        const req = uq.quest?.requirement || {} as any;
        const reqLevel = typeof req.minLevel === 'number' ? req.minLevel : (typeof req.level === 'number' ? req.level : undefined);
        return reqLevel === level;
      });

      const rewards: string[] = [];
      if (q?.quest?.reward?.xp) rewards.push(`+${q.quest.reward.xp} XP`);
      if (q?.quest?.reward?.badgeTokenId !== undefined) rewards.push(`Badge #${q.quest.reward.badgeTokenId}`);
      if (rewards.length === 0) rewards.push('Reward configured');

      arr.push({
        level,
        rewards,
        locked: currentLevel < level,
        claimed: q?.status === 'CLAIMED',
        questId: q?.quest?.id,
      });
    }
    return arr;
  }, [seasonalQuests, currentLevel]);

  const handleClaim = async (questId?: number) => {
    if (!questId) return;
    try {
      setClaimingId(questId);
      await claimQuest(questId, walletAddress);
      await onRefresh();
    } catch (e) {
      console.error('Failed to claim seasonal reward', e);
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
            Season 1: Battle Pass - Unlock rewards as you level up
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
      <Card className="bg-gradient-to-r from-blue-900/50 to-purple-900/50 border-blue-700/50 p-6">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl text-white">Level {currentLevel}</h2>
              <p className="text-slate-300">Season 1 Progress</p>
            </div>
            <div className="text-right">
              <p className="text-3xl text-blue-400">{currentXP} XP</p>
              <p className="text-sm text-slate-400">{nextLevelXP - currentXP} XP to next level</p>
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
        <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-thin scrollbar-thumb-slate-700 scrollbar-track-slate-900">
          {loading ? (
            <p className="text-slate-400 text-sm">Loading rewards…</p>
          ) : (
            levelRewards.map((reward) => (
            <LevelRewardCard 
              key={reward.level} 
              reward={reward}
              isClaiming={claimingId === reward.questId}
              onClaim={() => handleClaim(reward.questId)}
            />
            ))
          )}
        </div>
      </div>

      {/* Season Info */}
      <Card className="bg-slate-800/50 border-slate-700 p-6">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-white mb-1">Season 1 Ends In</h3>
            <p className="text-2xl text-blue-400">45d 12h 34m</p>
          </div>
          <Gift className="w-12 h-12 text-blue-400 opacity-50" />
        </div>
      </Card>
    </div>
  );
}

function LevelRewardCard({ reward, isClaiming, onClaim }: { reward: LevelReward; isClaiming: boolean; onClaim: () => void | Promise<void> }) {
  const isUnlocked = !reward.locked;

  return (
    <Card
      className={`flex-shrink-0 w-64 p-6 transition-all ${
        reward.locked
          ? 'bg-slate-800/30 border-slate-700/50 opacity-60'
          : reward.claimed
          ? 'bg-green-900/20 border-green-700/50'
          : 'bg-blue-900/30 border-blue-700/50 hover:scale-105'
      }`}
    >
      <div className="flex flex-col items-center text-center space-y-4">
        {/* Level Badge */}
        <div className={`w-16 h-16 rounded-full flex items-center justify-center text-2xl ${
          reward.locked
            ? 'bg-slate-700 text-slate-500'
            : reward.claimed
            ? 'bg-green-600 text-white'
            : 'bg-blue-600 text-white'
        }`}>
          {reward.locked ? <Lock className="w-8 h-8" /> : reward.level}
        </div>

        {/* Level Title */}
        <div>
          <h3 className="text-white mb-1">Level {reward.level}</h3>
          <p className="text-sm text-slate-400">Requires Level {reward.level}</p>
        </div>

        {/* Rewards List */}
        <div className="space-y-1">
          {reward.rewards.map((rewardItem, idx) => (
            <p key={idx} className="text-sm text-slate-300">
              • {rewardItem}
            </p>
          ))}
        </div>

        {/* Action Button */}
        {reward.claimed ? (
          <div className="flex items-center gap-2 text-green-400 text-sm">
            <CheckCircle className="w-4 h-4" />
            Claimed
          </div>
        ) : reward.locked ? (
          <Button size="sm" disabled className="w-full bg-slate-700 text-slate-500">
            Locked
          </Button>
        ) : isUnlocked ? (
          <Button size="sm" className="w-full bg-blue-600 hover:bg-blue-700 text-white" onClick={onClaim} disabled={isClaiming}>
            {isClaiming ? 'Claiming…' : 'Claim Rewards'}
          </Button>
        ) : (
          <Button size="sm" disabled className="w-full bg-slate-700 text-slate-400">
            Locked
          </Button>
        )}
      </div>
    </Card>
  );
}
