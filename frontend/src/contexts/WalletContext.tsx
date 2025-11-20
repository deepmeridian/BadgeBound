import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { ethers } from 'ethers';

interface WalletContextType {
  isConnected: boolean;
  address: string | null;
  provider: ethers.BrowserProvider | null;
  signer: ethers.JsonRpcSigner | null;
  chainId: number | null;
  connectWallet: () => Promise<void>;
  disconnect: () => void;
  isConnecting: boolean;
  error: string | null;
}

const WalletContext = createContext<WalletContextType | undefined>(undefined);

interface WalletProviderProps {
  children: ReactNode;
}

export function WalletProvider({ children }: WalletProviderProps) {
  const [isConnected, setIsConnected] = useState(false);
  const [address, setAddress] = useState<string | null>(null);
  const [provider, setProvider] = useState<ethers.BrowserProvider | null>(null);
  const [signer, setSigner] = useState<ethers.JsonRpcSigner | null>(null);
  const [chainId, setChainId] = useState<number | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const shouldAuto = localStorage.getItem('bb_autoConnect') === 'true';
      if (shouldAuto) {
        checkConnection();
      }
    }
  }, []);

  const checkConnection = async () => {
    if (typeof window.ethereum !== 'undefined') {
      try {
        const accounts = await window.ethereum.request({ method: 'eth_accounts' });
        if (accounts.length > 0) {
          await initializeWallet();
        }
      } catch (err) {
        //console.error('Error checking wallet connection:', err);
      }
    }
  };

  const initializeWallet = async () => {
    if (typeof window.ethereum === 'undefined') {
      throw new Error('No wallet found. Please install MetaMask or another EVM wallet.');
    }

    const browserProvider = new ethers.BrowserProvider(window.ethereum);
    const walletSigner = await browserProvider.getSigner();
    const userAddress = await walletSigner.getAddress();
    const network = await browserProvider.getNetwork();

    setProvider(browserProvider);
    setSigner(walletSigner);
    setAddress(userAddress);
    setChainId(Number(network.chainId));
    setIsConnected(true);
  };

  const connectWallet = async () => {
    setIsConnecting(true);
    setError(null);

    try {
      if (typeof window.ethereum === 'undefined') {
        throw new Error('No wallet found. Please install MetaMask or another EVM wallet.');
      }

      // Request account access
      await window.ethereum.request({ method: 'eth_requestAccounts' });
      
      // Switch to Hedera testnet if not already connected
      await switchToHederaTestnet();
      
      await initializeWallet();
      // Persist auto-connect preference
      if (typeof window !== 'undefined') {
        localStorage.setItem('bb_autoConnect', 'true');
      }

    } catch (err: any) {
      setError(err.message || 'Failed to connect wallet');
      throw err;
    } finally {
      setIsConnecting(false);
    }
  };

  const switchToHederaTestnet = async () => {
    const hederaTestnetChainId = '0x128'; // 296 in hex (Hedera testnet)
    
    try {
      // Try to switch to Hedera testnet
      await window.ethereum!.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: hederaTestnetChainId }],
      });
    } catch (switchError: any) {
      // If the network doesn't exist, add it
      if (switchError.code === 4902) {
        await window.ethereum!.request({
          method: 'wallet_addEthereumChain',
          params: [
            {
              chainId: hederaTestnetChainId,
              chainName: 'Hedera Testnet',
              nativeCurrency: {
                name: 'HBAR',
                symbol: 'HBAR',
                decimals: 18,
              },
              rpcUrls: ['https://testnet.hashio.io/api'],
              blockExplorerUrls: ['https://hashscan.io/testnet'],
            },
          ],
        });
      } else {
        throw switchError;
      }
    }
  };

  const disconnect = () => {
    setIsConnected(false);
    setAddress(null);
    setProvider(null);
    setSigner(null);
    setChainId(null);
    setError(null);
    if (typeof window !== 'undefined') {
      localStorage.removeItem('bb_autoConnect');
    }
  };

  // Listen for account changes
  useEffect(() => {
    if (typeof window.ethereum !== 'undefined') {
      const handleAccountsChanged = (accounts: string[]) => {
        if (accounts.length === 0) {
          disconnect();
        } else {
          const shouldAuto = typeof window !== 'undefined' && localStorage.getItem('bb_autoConnect') === 'true';
          if (shouldAuto) {
            checkConnection();
          } else {
            disconnect();
          }
        }
      };

      const handleChainChanged = () => {
        window.location.reload();
      };

      window.ethereum.on('accountsChanged', handleAccountsChanged);
      window.ethereum.on('chainChanged', handleChainChanged);

      return () => {
        if (window.ethereum) {
          window.ethereum.removeListener('accountsChanged', handleAccountsChanged);
          window.ethereum.removeListener('chainChanged', handleChainChanged);
        }
      };
    }
  }, []);

  const value = {
    isConnected,
    address,
    provider,
    signer,
    chainId,
    connectWallet,
    disconnect,
    isConnecting,
    error,
  };

  return (
    <WalletContext.Provider value={value}>
      {children}
    </WalletContext.Provider>
  );
}

export function useWallet() {
  const context = useContext(WalletContext);
  if (context === undefined) {
    throw new Error('useWallet must be used within a WalletProvider');
  }
  return context;
}