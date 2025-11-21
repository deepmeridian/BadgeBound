import { useState } from 'react';
import type { WalletType } from '../contexts/WalletContext';

interface WalletSelectionDialogProps {
  open: boolean;
  onClose: () => void;
  onSelectWallet: (walletType: WalletType) => void;
  hasMetaMask: boolean;
}

export function WalletSelectionDialog({ 
  open, 
  onClose, 
  onSelectWallet,
  hasMetaMask 
}: WalletSelectionDialogProps) {
  const [isConnecting, setIsConnecting] = useState(false);

  //console.log('WalletSelectionDialog render, open:', open, 'hasMetaMask:', hasMetaMask);

  const handleSelectWallet = async (walletType: WalletType) => {
    setIsConnecting(true);
    try {
      await onSelectWallet(walletType);
    } finally {
      setIsConnecting(false);
    }
  };

  return (
    <>
      {open && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.8)',
          zIndex: 9999,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}>
          <div style={{
            backgroundColor: '#1e293b',
            borderRadius: '0.5rem',
            padding: '1.5rem',
            maxWidth: '28rem',
            width: '90%',
            position: 'relative'
          }}>
            <button 
              onClick={onClose}
              style={{
                position: 'absolute',
                top: '1rem',
                right: '1rem',
                background: 'none',
                border: 'none',
                color: 'white',
                cursor: 'pointer',
                fontSize: '1.5rem'
              }}
            >×</button>
            
            <h2 style={{ color: 'white', fontSize: '1.25rem', fontWeight: 600, marginBottom: '0.5rem' }}>
              Connect Wallet
            </h2>
            <p style={{ color: '#94a3b8', fontSize: '0.875rem', marginBottom: '1.5rem' }}>
              Choose your preferred wallet to connect to BadgeBound
            </p>
            
            {/* WalletConnect - Always available and prioritized */}
            <button
            onClick={() => handleSelectWallet('walletconnect')}
            disabled={isConnecting}
            style={{
              width: '100%',
              height: '4rem',
              backgroundColor: 'var(--color-slate-800)',
              border: '1px solid var(--color-slate-700)',
              borderRadius: '0.5rem',
              paddingLeft: '1rem',
              cursor: 'pointer',
              transition: 'all 0.2s',
              marginBottom: '0.75rem'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = 'var(--color-slate-700)';
              e.currentTarget.style.borderColor = 'var(--color-blue-500)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'var(--color-slate-800)';
              e.currentTarget.style.borderColor = 'var(--color-slate-700)';
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <div style={{
                width: '2.5rem',
                height: '2.5rem',
                backgroundColor: '#3b82f6',
                borderRadius: '0.5rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <svg width="30" height="30" viewBox="0 0 252 185" fill="none">
                  <path d="M61.4385 36.2562C99.3077 -1.61308 160.692 -1.61308 198.562 36.2562L204.192 41.8862C206.077 43.7708 206.077 46.8562 204.192 48.7408L186.846 66.0862C185.923 67.0285 184.385 67.0285 183.462 66.0862L175.538 58.1623C150.231 32.8554 109.769 32.8554 84.4615 58.1623L75.9231 66.7008C75 67.6431 73.4615 67.6431 72.5385 66.7008L55.1923 49.3554C53.3077 47.4708 53.3077 44.3854 55.1923 42.5008L61.4385 36.2562ZM229.385 71.1623L244.615 86.3931C246.5 88.2777 246.5 91.3631 244.615 93.2477L179.308 158.554C177.423 160.439 174.338 160.439 172.454 158.554L130 116.1C129.538 115.639 128.769 115.639 128.308 116.1L85.8462 158.554C83.9615 160.439 80.8769 160.439 78.9923 158.554L13.6846 93.2477C11.8 91.3631 11.8 88.2777 13.6846 86.3931L28.9154 71.1623C30.8 69.2777 33.8846 69.2777 35.7692 71.1623L78.2308 113.616C78.6923 114.077 79.4615 114.077 79.9231 113.616L122.385 71.1623C124.269 69.2777 127.354 69.2777 129.238 71.1623L171.692 113.616C172.154 114.077 172.923 114.077 173.385 113.616L215.846 71.1623C217.731 69.2777 220.815 69.2777 222.7 71.1623L229.385 71.1623Z" fill="white"/>
                </svg>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
                <span style={{ color: 'white', fontWeight: 600 }}>WalletConnect</span>
                <span style={{ color: 'var(--color-slate-400)', fontSize: '0.75rem' }}>Recommended for Hedera</span>
              </div>
              </div>
            </button>

            {/* MetaMask - Only shown if detected */}
            {hasMetaMask && (
              <button
              onClick={() => handleSelectWallet('metamask')}
              disabled={isConnecting}
              style={{
                width: '100%',
                height: '4rem',
                backgroundColor: 'var(--color-slate-800)',
                border: '1px solid var(--color-slate-700)',
                borderRadius: '0.5rem',
                paddingLeft: '1rem',
                cursor: 'pointer',
                transition: 'all 0.2s',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = 'var(--color-slate-700)';
                e.currentTarget.style.borderColor = 'var(--color-orange-500)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'var(--color-slate-800)';
                e.currentTarget.style.borderColor = 'var(--color-slate-700)';
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <div style={{
                  width: '2.5rem',
                  height: '2.5rem',
                  backgroundColor: '#ffffffff',
                  borderRadius: '0.5rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  <img 
                    src="https://upload.wikimedia.org/wikipedia/commons/3/36/MetaMask_Fox.svg" 
                    alt="MetaMask"
                    style={{ width: '2rem', height: '2rem' }}
                  />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
                  <span style={{ color: 'white', fontWeight: 600 }}>MetaMask</span>
                  <span style={{ color: 'var(--color-slate-400)', fontSize: '0.75rem' }}>Browser extension</span>
                </div>
              </div>
            </button>
            )}
            
            <p style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '1rem', textAlign: 'center' }}>
              By connecting, you agree to our Terms of Service
            </p>
          </div>
        </div>
      )}
    </>
  );
}
