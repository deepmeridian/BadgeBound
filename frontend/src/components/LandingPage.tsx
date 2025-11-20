import { Wallet, ExternalLink } from 'lucide-react';
import { Button } from './ui/button';
import { useWallet } from '../hooks/useWallet';
// @ts-ignore
import logo from '/BadgeBound_Logo.png';
// Background video asset
import spaceBg from '../assets/space-bg.webm';

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
      //console.error('Failed to connect wallet:', err);
    }
  };

  return (
    <div className="landing-root">
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
      {/* Hero Section fits remaining space so footer is visible */}
      <section className="flex flex-1 w-full px-8 py-10 items-center">
        <div className="relative z-10 flex w-full max-w-6xl mx-auto items-center justify-between gap-12">
          {/* Left: Logo */}
          <div className="flex-shrink-0 flex items-center justify-center">
            <img
              src={logo}
              alt="BadgeBound Logo"
              style={{width: '500px', height: 'auto'}}
              className="object-contain select-none"
              draggable={false}
            />
          </div>
          {/* Right: Content Card */}
          <div className="landing-content-card">
            <div className="flex flex-col gap-6">
            <h1 className="text-6xl text-white tracking-tight font-semibold">BadgeBound</h1>
            <p className="text-xl text-blue-200">Hedera Native Quest Layer</p>
            <p className="text-slate-300">
              Reward on-chain activity with badge NFTs and XP progression. Complete weekly missions,
              track progress, and earn seasonal rewards while building verifiable reputation.
            </p>
            <div>
              <Button
                onClick={handleConnectClick}
                size="lg"
                className="bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-700 hover:to-blue-600 text-white px-10 py-7 gap-3 shadow-lg shadow-blue-500/50 transition-colors duration-200 ease-in-out"
                disabled={isConnecting}
              >
                <Wallet className="w-5 h-5" />
                {isConnecting ? 'Connecting...' : 'Connect Wallet'}
              </Button>
              {error && <p className="text-white text-sm mt-2">{error}</p>}
            </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="relative z-10 mt-auto py-6 border-t border-slate-700 bg-slate-900/80 backdrop-blur-sm">
        <div className="max-w-6xl mx-auto flex items-center justify-center gap-2 text-sm text-slate-400">
          <span>Created by</span>
          <a
            href="https://github.com/deepmeridian"
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-400 hover:text-blue-300 flex items-center gap-1"
          >
            deepmeridian
            <ExternalLink className="w-3 h-3" />
          </a>
        </div>
      </footer>
    </div>
  );
}