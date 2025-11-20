import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, HelpCircle } from 'lucide-react';
import { Button } from './ui/button';

interface SiteTourProps {
  onDismiss: () => void;
}

export function SiteTour({ onDismiss }: SiteTourProps) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onDismiss();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onDismiss]);
  return createPortal(
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 100,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '1.5rem',
      }}
    >
      {/* Backdrop */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: 'rgba(15,23,42,0.80)', // fallback near slate-900
          backdropFilter: 'blur(6px)',
        }}
      />
      <div
        style={{
          position: 'relative',
          width: '100%',
          maxWidth: '48rem',
          borderRadius: '0.75rem',
          border: '1px solid rgba(51,65,85,0.7)',
          background: 'rgba(30,41,59,0.92)',
          boxShadow: '0 20px 40px -10px rgba(0,0,0,0.6)',
          padding: '2rem',
          color: 'white',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
          <h2 style={{ fontSize: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 600 }}>
            <HelpCircle className="w-6 h-6" /> Welcome to BadgeBound
          </h2>
          <button
            onClick={onDismiss}
            aria-label="Close tour"
            style={{ color: '#94a3b8', transition: 'color .15s' }}
            onMouseEnter={(e) => (e.currentTarget.style.color = '#fff')}
            onMouseLeave={(e) => (e.currentTarget.style.color = '#94a3b8')}
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        <p style={{ color: '#cbd5e1', lineHeight: 1.5, marginBottom: '1rem', fontSize: '0.95rem' }}>
          Quick tour of core areas:
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', fontSize: '0.85rem', color: '#e2e8f0' }}>
          <div><span style={{ color: '#60a5fa', fontWeight: 600 }}>Quests:</span> Earn XP and Badges via daily and weekly tasks.</div>
          <div><span style={{ color: '#60a5fa', fontWeight: 600 }}>Badges:</span> View earned NFT badges; click your badges to import them to your wallet.</div>
          <div><span style={{ color: '#60a5fa', fontWeight: 600 }}>Seasonal Rewards:</span> Level-based badge unlocks & claims. Battle pass style.</div>
          <div><span style={{ color: '#60a5fa', fontWeight: 600 }}>Leaderboard:</span> Track your rank, XP & level vs others.</div>
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem', marginTop: '1.25rem', alignItems: 'center' }}>
          <Button onClick={onDismiss} className="bg-blue-600 hover:bg-blue-700">Close</Button>
        </div>
      </div>
    </div>,
    document.body
  );
}
