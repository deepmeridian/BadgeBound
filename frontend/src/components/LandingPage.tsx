import { Wallet } from 'lucide-react';
import { Button } from './ui/button';
import { useWallet } from '../hooks/useWallet';
// @ts-ignore
import logo from '/BadgeBound_Logo.png';

interface LandingPageProps {
  onConnectWallet: () => void;
}

export function LandingPage({ onConnectWallet }: LandingPageProps) {
  const { connectWallet, isConnecting, error } = useWallet();

  const handleConnectClick = async () => {
    try {
      await connectWallet();
      onConnectWallet();
    } catch (err) {
      console.error('Failed to connect wallet:', err);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-8">
      <div className="flex flex-col items-center gap-8 max-w-2xl text-center">
        <img 
          src={logo} 
          alt="BadgeBound Logo" 
          className="w-64 h-64 object-contain animate-pulse"
        />
        
        <div className="space-y-4">
          <h1 className="text-6xl text-white tracking-tight">
            BadgeBound
          </h1>
          <p className="text-xl text-blue-200">
            Hedera Native Quest Layer
          </p>
          <p className="text-slate-300 max-w-md mx-auto">
            Reward on-chain activity with badge NFTs and XP progression. 
            Complete weekly missions, track progress, and earn seasonal rewards.
          </p>
        </div>

        <div className="space-y-4">
          <Button 
            onClick={handleConnectClick}
            size="lg"
            className="bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-700 hover:to-blue-600 text-white px-8 py-6 gap-3 shadow-lg shadow-blue-500/50 transition-all hover:shadow-xl hover:shadow-blue-500/60"
            disabled={isConnecting}
          >
            <Wallet className="w-5 h-5" />
            {isConnecting ? 'Connecting...' : 'Connect Wallet'}
          </Button>
          
          {error && (
            <p className="text-red-400 text-sm">{error}</p>
          )}
        </div>
      </div>
    </div>
  );
}
