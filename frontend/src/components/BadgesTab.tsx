import { Award, Loader2, RefreshCw, ExternalLink } from 'lucide-react';
import { Card } from './ui/card';
import { useState } from 'react';
import { Badge } from '../services/api';

interface BadgesTabProps {
  badges: Badge[];
  loading: boolean;
  error: string | null;
  onRefresh: () => void;
}

export function BadgesTab({ badges, loading, error, onRefresh }: BadgesTabProps) {
  const [refreshing, setRefreshing] = useState(false);

  const handleRefresh = async () => {
    setRefreshing(true);
    await onRefresh();
    setRefreshing(false);
  };

  const earnedCount = badges.filter(b => b.owned).length;

  if (loading) {
    return (
      <div className="space-y-8 w-full">
        <div>
          <h1 className="text-4xl text-white mb-2">My Badge Collection</h1>
          <p className="text-slate-400">Loading your badge collection...</p>
        </div>
        <div className="py-12 w-full">
          <div className="loading-gradient w-full h-40 rounded-xl" aria-hidden="true" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-8 w-full">
        <div>
          <h1 className="text-4xl text-white mb-2">My Badges</h1>
          <p className="text-red-400">{error}</p>
        </div>
        <Card className="bg-red-900/20 border-red-500/50 p-6">
          <p className="text-red-300">Unable to load badge data. Please make sure you're connected to Hedera testnet.</p>
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
    <div className="space-y-8 w-full">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl text-white mb-2">My Badge Collection</h1>
          <p className="text-slate-400">
            Collected {earnedCount} badges
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

      {badges.filter(b => b.owned).length === 0 ? (
        <Card className="bg-slate-800/50 border-slate-700 p-6">
          <div className="space-y-2">
            <h3 className="text-white">No badges collected yet</h3>
            <p className="text-sm text-slate-400">You don't own any badges. Earn badges by completing quests.</p>
          </div>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {badges.filter(b => b.owned).map((badge) => (
            <BadgeCard key={badge.tokenId} badge={badge} />
          ))}
        </div>
      )}
    </div>
  );
}

function BadgeCard({ badge }: { badge: Badge }) {
  const [imageError, setImageError] = useState(false);
  const [imageLoading, setImageLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);
  const contractAddress = import.meta.env.VITE_QUEST_BADGES_ADDRESS;

  const handleImageLoad = () => setImageLoading(false);
  const handleImageError = () => { setImageError(true); setImageLoading(false); };

  const addToWallet = async () => {
    if (!contractAddress) return;
    if (!(window as any).ethereum) {
      setAddError('No EVM wallet detected');
      return;
    }
    setAdding(true);
    setAddError(null);
    try {
      await (window as any).ethereum.request({
        method: 'wallet_watchAsset',
        params: {
          type: 'ERC721',
          options: {
            address: contractAddress,
            tokenId: badge.tokenId.toString(),
            image: badge.metadata.image || undefined,
            name: badge.metadata.name,
          },
        },
      });
    } catch (err: any) {
      // Fallback: open explorer so user can manually import
      setAddError('Wallet declined. Opening explorer.');
      const explorerUrl = `https://hashscan.io/testnet/contract/${contractAddress}`;
      window.open(explorerUrl, '_blank');
    } finally {
      setAdding(false);
    }
  };

  return (
    <Card
      onClick={addToWallet}
      className={`bg-slate-800/50 backdrop-blur-sm border-2 p-6 transition-all select-none
        border-yellow-500 hover:scale-105 hover:shadow-lg cursor-pointer relative
      `}
    >
      <div className="flex flex-col items-center text-center space-y-4">
        <div
          className={`w-20 h-20 rounded-full bg-gradient-to-br 
           from-yellow-500 to-orange-600
           flex items-center justify-center shadow-lg overflow-hidden`}
        >
          {badge.metadata.image && !imageError ? (
            <div className="relative w-full h-full">
              {imageLoading && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <Loader2 className="w-6 h-6 text-white animate-spin" />
                </div>
              )}
              <img
                src={badge.metadata.image}
                alt={badge.metadata.name}
                className="w-full h-full object-cover rounded-full"
                onLoad={handleImageLoad}
                onError={handleImageError}
                style={{ display: imageLoading ? 'none' : 'block' }}
                draggable={false}
              />
            </div>
          ) : (
            <Award className="w-10 h-10 text-white" />
          )}
        </div>
        <div className="space-y-2">
          <h3 className="text-white flex items-center justify-center gap-2">
            {badge.metadata.name}
            <ExternalLink className="w-4 h-4 opacity-60" />
          </h3>
          <p className="text-sm text-slate-400 line-clamp-3">{badge.metadata.description}</p>
        </div>
        {adding && (
          <div className="text-xs text-blue-400 animate-pulse">Adding to wallet…</div>
        )}
        {addError && !adding && (
          <div className="text-[10px] text-yellow-400 max-w-[9rem] leading-tight">{addError}</div>
        )}
      </div>
    </Card>
  );
}
