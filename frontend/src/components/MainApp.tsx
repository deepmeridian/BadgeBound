import { useState, useEffect } from 'react';
import { Trophy, Award, Gift, LogOut, TrendingUp } from 'lucide-react';
import { Button } from './ui/button';
import { QuestsTab } from './QuestsTab';
import { BadgesTab } from './BadgesTab';
import { SeasonalRewardsTab } from './SeasonalRewardsTab';
import { LeaderboardTab } from './LeaderboardTab';
import { useWallet } from '../hooks/useWallet';
import { fetchUserBadges, fetchLeaderboard, fetchUserQuests, Badge, LeaderboardEntry, Season, UserQuest } from '../services/api';
// @ts-ignore
import logo from '/BadgeBound_Logo.png';

interface MainAppProps {
  walletAddress: string;
  onDisconnect: () => void;
}

type Tab = 'quests' | 'badges' | 'rewards' | 'leaderboard';

export function MainApp({ walletAddress, onDisconnect }: MainAppProps) {
  const { provider } = useWallet();
  const [activeTab, setActiveTab] = useState<Tab>('quests');
  
  // Badges state
  const [badges, setBadges] = useState<Badge[]>([]);
  const [badgesLoading, setBadgesLoading] = useState(true);
  const [badgesError, setBadgesError] = useState<string | null>(null);
  
  // Leaderboard state
  const [leaderboardData, setLeaderboardData] = useState<LeaderboardEntry[]>([]);
  const [season, setSeason] = useState<Season | null>(null);
  const [leaderboardLoading, setLeaderboardLoading] = useState(true);
  const [leaderboardError, setLeaderboardError] = useState<string | null>(null);
  const [currentUserRank, setCurrentUserRank] = useState<number | null>(null);
  const [currentUserData, setCurrentUserData] = useState<LeaderboardEntry | null>(null);

  // Quest state
  const [userQuests, setUserQuests] = useState<UserQuest[]>([]);
  const [questsLoading, setQuestsLoading] = useState(true);
  const [questsError, setQuestsError] = useState<string | null>(null);

  // Load data on component mount
  useEffect(() => {
    if (walletAddress && provider) {
      loadBadges();
      loadLeaderboard();
      loadQuests();
    }
  }, [walletAddress, provider]);

  const loadBadges = async () => {
    if (!walletAddress || !provider) return;
    
    try {
      setBadgesLoading(true);
      setBadgesError(null);
      const userBadges = await fetchUserBadges(walletAddress, provider);
      setBadges(userBadges);
    } catch (err) {
      console.error('Failed to load badges:', err);
      setBadgesError('Failed to load badge data');
    } finally {
      setBadgesLoading(false);
    }
  };

  const loadLeaderboard = async () => {
    try {
      setLeaderboardLoading(true);
      setLeaderboardError(null);
      
      const data = await fetchLeaderboard(200); // Fetch more entries to find current user
      
      setLeaderboardData(data.entries.slice(0, 15)); // Show top 15
      setSeason(data.season);
      
      // Find current user in the full list
      const userEntry = data.entries.find(entry => 
        entry.wallet.toLowerCase() === walletAddress.toLowerCase()
      );
      
      if (userEntry) {
        setCurrentUserRank(userEntry.rank);
        setCurrentUserData(userEntry);
      } else {
        setCurrentUserRank(null);
        setCurrentUserData(null);
      }
      
    } catch (err) {
      console.error('Failed to load leaderboard:', err);
      setLeaderboardError('Failed to load leaderboard data');
    } finally {
      setLeaderboardLoading(false);
    }
  };

  const loadQuests = async () => {
    if (!walletAddress) return;
    
    try {
      setQuestsLoading(true);
      setQuestsError(null);
      const quests = await fetchUserQuests(walletAddress);
      setUserQuests(quests);
    } catch (err) {
      console.error('Failed to load quests:', err);
      setQuestsError('Failed to load quest data');
    } finally {
      setQuestsLoading(false);
    }
  };

  const reloadQuests = async () => {
    // Reload quests and leaderboard to ensure level/XP reflects claimed rewards
    await Promise.all([loadQuests(), loadLeaderboard()]);
  };

  const tabs = [
    { id: 'quests' as Tab, label: 'Quests', icon: Trophy },
    { id: 'badges' as Tab, label: 'My Badge Collection', icon: Award },
    { id: 'rewards' as Tab, label: 'Seasonal Rewards', icon: Gift },
    { id: 'leaderboard' as Tab, label: 'Leaderboard', icon: TrendingUp },
  ];

  return (
    <div className="min-h-screen flex">
      {/* Left Sidebar */}
      <div className="w-72 bg-slate-900/50 backdrop-blur-sm border-r border-slate-700/50 flex flex-col">
        {/* Logo Header */}
        <div className="p-6 border-b border-slate-700/50">
          <div className="flex flex-col items-center gap-2">
            <img src={logo} alt="BadgeBound" className="w-32 h-32 object-contain" />
            <p className="text-xs text-slate-400">Powered by Hedera</p>
          </div>
        </div>

        {/* Navigation Tabs */}
        <nav className="flex-1 p-4 space-y-2">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${
                  activeTab === tab.id
                    ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/30'
                    : 'text-slate-300 hover:bg-slate-800/50 hover:text-white'
                }`}
              >
                <Icon className="w-5 h-5" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </nav>

        {/* Wallet Info & Disconnect */}
        <div className="p-4 border-t border-slate-700/50 space-y-3">
          <div className="bg-slate-800/50 rounded-lg p-3">
            <p className="text-xs text-slate-400 mb-1">Connected Wallet</p>
            <p className="text-sm text-white font-mono truncate">
              {walletAddress.slice(0, 6)}...{walletAddress.slice(-4)}
            </p>
          </div>
          <Button
            onClick={onDisconnect}
            variant="outline"
            className="w-full gap-2 border-slate-600 text-slate-300 hover:bg-slate-800 hover:text-white"
          >
            <LogOut className="w-4 h-4" />
            Disconnect
          </Button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-auto">
        <div className="p-8">
          {activeTab === 'quests' && (
            <QuestsTab 
              walletAddress={walletAddress}
              userQuests={userQuests}
              currentUserLevel={currentUserData?.level ?? null}
              currentUserXP={currentUserData?.xp ?? null}
              loading={questsLoading}
              error={questsError}
              onRefresh={reloadQuests}
            />
          )}
          {activeTab === 'badges' && (
            <BadgesTab 
              badges={badges}
              loading={badgesLoading}
              error={badgesError}
              onRefresh={loadBadges}
            />
          )}
          {activeTab === 'rewards' && (
            <SeasonalRewardsTab 
              walletAddress={walletAddress}
              userQuests={userQuests}
              currentUserLevel={currentUserData?.level ?? null}
              currentUserXP={currentUserData?.xp ?? null}
              loading={questsLoading}
              error={questsError}
              onRefresh={reloadQuests}
            />
          )}
          {activeTab === 'leaderboard' && (
            <LeaderboardTab 
              walletAddress={walletAddress}
              leaderboardData={leaderboardData}
              season={season}
              loading={leaderboardLoading}
              error={leaderboardError}
              currentUserRank={currentUserRank}
              currentUserData={currentUserData}
              onRefresh={loadLeaderboard}
            />
          )}
        </div>
      </div>
    </div>
  );
}