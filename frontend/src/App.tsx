import { WalletProvider } from './contexts/WalletContext';
import { LandingPage } from './components/LandingPage';
import { MainApp } from './components/MainApp';
import { useWallet } from './hooks/useWallet';

function AppContent() {
  const { isConnected, address, disconnect } = useWallet();

  const handleDisconnectWallet = () => {
    disconnect();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900">
      {!isConnected ? (
        <LandingPage onConnectWallet={() => {}} />
      ) : (
        <MainApp 
          walletAddress={address || ''} 
          onDisconnect={handleDisconnectWallet}
        />
      )}
    </div>
  );
}

export default function App() {
  return (
    <WalletProvider>
      <AppContent />
    </WalletProvider>
  );
}
