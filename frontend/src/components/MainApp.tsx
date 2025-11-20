import React, { useState, useEffect } from 'react';
import { Trophy, Award, Gift, LogOut, TrendingUp } from 'lucide-react';
import { Button } from './ui/button';
import { QuestsTab } from './QuestsTab';
import { SiteTour } from './SiteTour';
import { BadgesTab } from './BadgesTab';
import { SeasonalRewardsTab } from './SeasonalRewardsTab';
import { LeaderboardTab } from './LeaderboardTab';
import { useWallet } from '../hooks/useWallet';
import { fetchUserBadges, fetchLeaderboard, fetchUserQuests, fetchQuests, Badge, LeaderboardEntry, Season, UserQuest, Quest } from '../services/api';
// @ts-ignore
import logo from '/BadgeBound_Logo.png';
// Background video asset (shared with LandingPage)
import spaceBg from '../assets/space-bg.webm';

interface MainAppProps {
  walletAddress: string;
  onDisconnect: () => void;
}

type Tab = 'quests' | 'badges' | 'rewards' | 'leaderboard';

export function MainApp({ walletAddress, onDisconnect }: MainAppProps) {
  const { provider } = useWallet();
  const [activeTab, setActiveTab] = useState<Tab>('quests');
  const [showTour, setShowTour] = useState(false);
  
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
  const [baseQuests, setBaseQuests] = useState<Quest[]>([]);
  // @ts-ignore
  const [baseQuestsLoading, setBaseQuestsLoading] = useState(true);
  // @ts-ignore
  const [baseQuestsError, setBaseQuestsError] = useState<string | null>(null);

  // Load data on component mount
  useEffect(() => {
    if (walletAddress && provider) {
      loadBadges();
      loadLeaderboard();
      loadAllQuests();
      loadUserQuests();
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

  const loadUserQuests = async () => {
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

  const loadAllQuests = async () => {
    try {
      setBaseQuestsLoading(true);
      setBaseQuestsError(null);
      const quests = await fetchQuests();
      setBaseQuests(quests);
    } catch (err) {
      console.error('Failed to load base quests:', err);
      setBaseQuestsError('Failed to load quests list');
    } finally {
      setBaseQuestsLoading(false);
    }
  };

  const reloadQuests = async () => {
    // Reload quests, leaderboard and badges
    await Promise.all([loadAllQuests(), loadUserQuests(), loadLeaderboard(), loadBadges()]);
  };

  const tabs = [
    { id: 'quests' as Tab, label: 'Quests', icon: Trophy },
    { id: 'badges' as Tab, label: 'My Badge Collection', icon: Award },
    { id: 'rewards' as Tab, label: 'Seasonal Rewards', icon: Gift },
    { id: 'leaderboard' as Tab, label: 'Leaderboard', icon: TrendingUp },
  ];

  return (
    <div className="min-h-screen relative">
      {/* Background video and overlay */}
      <video
        className="landing-bg-video"
        src={spaceBg}
        autoPlay
        muted
        loop
        playsInline
        preload="auto"
        aria-hidden="true"
      />
      <div className="landing-overlay" aria-hidden="true" />
      <div className="relative z-10">
      {/* Left Sidebar */}
      <div style={{ position: 'fixed', top: 0, bottom: 0, left: 0, width: '18rem' }} className="bg-slate-900/50 backdrop-blur-sm border-r border-slate-700/50 flex flex-col">
        {/* Logo Header */}
        <div style={{ paddingTop: 10 }} className="p-6 border-b border-slate-700/50">
          <div className="flex flex-col items-center">
            <img src={logo} alt="BadgeBound" style={{ width: 200, height: 200 }} className="object-contain" />
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

        {/* Help / Tour trigger above wallet divider */}
        <div className="px-4 pb-2 mb-2">
          <button
            onClick={() => setShowTour(s => !s)}
            onMouseEnter={(e: React.MouseEvent<HTMLButtonElement>) => { e.currentTarget.style.backgroundColor = 'rgba(30,41,59,0.7)'; e.currentTarget.style.color = '#fff'; e.currentTarget.style.borderColor = '#fff'; }}
            onMouseLeave={(e: React.MouseEvent<HTMLButtonElement>) => { e.currentTarget.style.backgroundColor = ''; e.currentTarget.style.color = ''; e.currentTarget.style.borderColor = ''; }}
            className="w-full text-xs tracking-wide px-3 py-2 rounded-md bg-slate-800/70 text-white border border-slate-700 cursor-pointer"
          >
            {showTour ? 'Hide Tour' : 'Help'}
          </button>
        </div>

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
            onMouseEnter={(e: React.MouseEvent<HTMLButtonElement>) => { (e.currentTarget as HTMLButtonElement).style.backgroundColor = '#fff'; (e.currentTarget as HTMLButtonElement).style.color = '#000'; }}
            onMouseLeave={(e: React.MouseEvent<HTMLButtonElement>) => { (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'rgba(30,41,59,0.7)'; (e.currentTarget as HTMLButtonElement).style.color = '#fff'; }}
            className="w-full gap-2 border-slate-600 bg-slate-800/70 text-white cursor-pointer"
          >
            <LogOut className="w-4 h-4" />
            Disconnect
          </Button>
        </div>
      </div>

      {/* Main Content Area */}
      <div style={{ marginLeft: '18rem', height: '100vh', overflowY: 'auto' }} className="relative z-10">
        <div className="p-8">
          {activeTab === 'quests' && (
            <QuestsTab 
              walletAddress={walletAddress}
              userQuests={userQuests}
              baseQuests={baseQuests}
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
              season={season}
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
      {showTour && (
        <SiteTour onDismiss={() => setShowTour(false)} />
      )}
      </div>
    </div>
  );
}