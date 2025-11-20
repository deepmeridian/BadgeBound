import { Trophy, Medal, Award, Crown, Loader2, RefreshCw } from "lucide-react";
import { Card } from "./ui/card";
import { useState } from "react";
import { LeaderboardEntry, Season, formatWalletAddress } from "../services/api";

interface LeaderboardTabProps {
  walletAddress: string;
  leaderboardData: LeaderboardEntry[];
  season: Season | null;
  loading: boolean;
  error: string | null;
  currentUserRank: number | null;
  currentUserData: LeaderboardEntry | null;
  onRefresh: () => void;
}

export function LeaderboardTab({ 
  leaderboardData, 
  season, 
  loading, 
  error, 
  currentUserRank, 
  currentUserData,
  onRefresh 
}: LeaderboardTabProps) {
  const [refreshing, setRefreshing] = useState(false);

  const handleRefresh = async () => {
    setRefreshing(true);
    await onRefresh();
    setRefreshing(false);
  };

  if (loading) {
    return (
      <div className="space-y-8 w-full pb-32">
        <div>
          <h1 className="text-4xl text-white mb-2">Seasonal Leaderboard</h1>
          <p className="text-slate-400">Loading leaderboard data...</p>
        </div>
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 text-blue-400 animate-spin" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-8 w-full pb-32">
        <div>
          <h1 className="text-4xl text-white mb-2">Seasonal Leaderboard</h1>
          <p className="text-red-400">{error}</p>
        </div>
        <Card className="bg-red-900/20 border-red-500/50 p-6">
          <p className="text-red-300">Unable to load leaderboard data. Please try again later.</p>
          <button 
            onClick={handleRefresh}
            disabled={refreshing}
            className="mt-4 px-4 py-2 bg-red-600 hover:bg-red-700 disabled:bg-slate-600 text-white rounded-lg transition-colors flex items-center gap-2"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
            {refreshing ? 'Retrying...' : 'Retry'}
          </button>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-8 w-full pb-32">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl text-white mb-2">
            Seasonal Leaderboard
          </h1>
          <p className="text-slate-400">
            {season ? `${season.name} - Top users ranked by total XP earned` : 'Loading season data...'}
          </p>
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

      {/* Leaderboard List */}
      <div className="space-y-3">
        {leaderboardData.map((user) => (
          <LeaderboardCard key={user.rank} user={user} />
        ))}
      </div>

      {/* Floating Current User Card */}
      {currentUserRank && currentUserRank > 15 && currentUserData && (
        <div className="fixed bottom-8 left-72 right-0 px-8 pointer-events-none">
          <div className="w-full max-w-5xl pointer-events-auto">
            <Card className="bg-gradient-to-r from-blue-900/95 to-purple-900/95 border-blue-500 border-2 backdrop-blur-md shadow-2xl">
              <div className="p-5">
                <p className="text-xs text-blue-300 mb-2">
                  Your Position
                </p>
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-4 flex-1">
                    <div className="flex items-center justify-center w-12 h-12 rounded-lg bg-blue-600/50 text-blue-200">
                      #{currentUserData.rank}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-white font-mono">
                          {formatWalletAddress(currentUserData.wallet)}
                        </span>
                      </div>
                      <div className="flex items-center gap-4 text-sm">
                        <div className="flex items-center gap-1 text-slate-300">
                          <Trophy className="w-4 h-4" />
                          Level {currentUserData.level}
                        </div>
                        <div className="flex items-center gap-1 text-slate-300">
                          <Award className="w-4 h-4" />
                          {currentUserData.badges} badges
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl text-blue-300">
                      {currentUserData.xp.toLocaleString()}
                    </p>
                    <p className="text-xs text-slate-400">
                      Total XP
                    </p>
                  </div>
                </div>
              </div>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
}

function LeaderboardCard({ user }: { user: LeaderboardEntry }) {
  const getRankIcon = (rank: number) => {
    switch (rank) {
      case 1:
        return <Crown className="w-6 h-6 text-yellow-400" />;
      case 2:
        return <Medal className="w-6 h-6 text-slate-300" />;
      case 3:
        return <Medal className="w-6 h-6 text-orange-400" />;
      default:
        return null;
    }
  };

  const getRankBgColor = (rank: number) => {
    switch (rank) {
      case 1:
        return "bg-gradient-to-r from-yellow-600/20 to-yellow-700/20 border-yellow-500/50";
      case 2:
        return "bg-gradient-to-r from-slate-600/20 to-slate-700/20 border-slate-400/50";
      case 3:
        return "bg-gradient-to-r from-orange-600/20 to-orange-700/20 border-orange-500/50";
      default:
        return "bg-slate-800/50 border-slate-700";
    }
  };

  const getRankBorderStyle = (rank: number) => {
    switch (rank) {
      case 1:
        return "border-[3px] border-double shadow-[0_0_20px_rgba(234,179,8,0.3),inset_0_0_20px_rgba(234,179,8,0.1)] relative before:absolute before:inset-0 before:rounded-lg before:p-[3px] before:bg-gradient-to-r before:from-yellow-400 before:via-yellow-600 before:to-yellow-400 before:-z-10 before:blur-sm";
      case 2:
        return "border-[3px] border-double shadow-[0_0_20px_rgba(203,213,225,0.3),inset_0_0_20px_rgba(203,213,225,0.1)] relative before:absolute before:inset-0 before:rounded-lg before:p-[3px] before:bg-gradient-to-r before:from-slate-300 before:via-slate-400 before:to-slate-300 before:-z-10 before:blur-sm";
      case 3:
        return "border-[3px] border-double shadow-[0_0_20px_rgba(251,146,60,0.3),inset_0_0_20px_rgba(251,146,60,0.1)] relative before:absolute before:inset-0 before:rounded-lg before:p-[3px] before:bg-gradient-to-r before:from-orange-400 before:via-orange-500 before:to-orange-400 before:-z-10 before:blur-sm";
      default:
        return "";
    }
  };

  const getRankTextColor = (rank: number) => {
    switch (rank) {
      case 1:
        return "text-yellow-400";
      case 2:
        return "text-slate-300";
      case 3:
        return "text-orange-400";
      default:
        return "text-slate-400";
    }
  };

  return (
    <Card
      className={`${getRankBgColor(user.rank)} ${getRankBorderStyle(user.rank)} hover:bg-slate-800/70 transition-all p-5`}
    >
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-4 flex-1">
          {/* Rank */}
          <div
            className={`flex items-center justify-center w-16 h-16 rounded-lg ${
              user.rank <= 3
                ? "bg-slate-900/50"
                : "bg-slate-700/30"
            }`}
          >
            {getRankIcon(user.rank) || (
              <span
                className={`text-xl ${getRankTextColor(user.rank)}`}
              >
                #{user.rank}
              </span>
            )}
          </div>

          {/* User Info */}
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-white font-mono">
                {formatWalletAddress(user.wallet)}
              </span>
            </div>
            <div className="flex items-center gap-4 text-sm">
              <div className="flex items-center gap-1 text-slate-300">
                <Trophy className="w-4 h-4" />
                Level {user.level}
              </div>
              <div className="flex items-center gap-1 text-slate-300">
                <Award className="w-4 h-4" />
                {user.badges} badges
              </div>
            </div>
          </div>
        </div>

        {/* XP */}
        <div className="text-right">
          <p className="text-2xl text-blue-400">
            {user.xp.toLocaleString()}
          </p>
          <p className="text-xs text-slate-400">Total XP</p>
        </div>
      </div>
    </Card>
  );
}