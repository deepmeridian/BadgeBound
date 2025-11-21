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

  const getWalletProvider = () => {
    // Check for HashPack first in dedicated namespace
    if (typeof (window as any).hashpack !== 'undefined') {
      console.log('Found HashPack in window.hashpack');
      return (window as any).hashpack;
    }
    
    // Check if multiple providers exist (MetaMask + HashPack scenario)
    if (typeof window.ethereum !== 'undefined' && (window.ethereum as any).providers) {
      console.log('Multiple providers detected:', (window.ethereum as any).providers);
      // Look for HashPack in providers array
      const hashpackProvider = (window.ethereum as any).providers.find(
        (provider: any) => provider.isHashPack
      );
      if (hashpackProvider) {
        console.log('Found HashPack in providers array');
        return hashpackProvider;
      }
    }
    
    // Check if single provider is HashPack
    if (typeof window.ethereum !== 'undefined' && (window.ethereum as any).isHashPack) {
      console.log('Single provider is HashPack');
      return window.ethereum;
    }
    
    // Fallback to default ethereum provider
    if (typeof window.ethereum !== 'undefined') {
      console.log('Using default ethereum provider');
      return window.ethereum;
    }
    
    return null;
  };

  const checkConnection = async () => {
    const provider = getWalletProvider();
    if (provider) {
      try {
        const accounts = await provider.request({ method: 'eth_accounts' });
        if (accounts.length > 0) {
          await initializeWallet();
        }
      } catch (err) {
        //console.error('Error checking wallet connection:', err);
      }
    }
  };

  const initializeWallet = async () => {
    const provider = getWalletProvider();
    if (!provider) {
      throw new Error('No wallet found. Please install HashPack or MetaMask.');
    }

    const browserProvider = new ethers.BrowserProvider(provider);
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
      const provider = getWalletProvider();
      if (!provider) {
        throw new Error('No wallet found. Please install HashPack or MetaMask.');
      }

      // Request account access
      await provider.request({ method: 'eth_requestAccounts' });
      
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
    const provider = getWalletProvider();
    if (!provider) return;
    
    const hederaTestnetChainId = '0x128'; // 296 in hex (Hedera testnet)
    
    try {
      // Try to switch to Hedera testnet
      await provider.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: hederaTestnetChainId }],
      });
    } catch (switchError: any) {
      // If the network doesn't exist, add it
      if (switchError.code === 4902) {
        await provider.request({
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
    const provider = getWalletProvider();
    if (provider) {
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

      provider.on('accountsChanged', handleAccountsChanged);
      provider.on('chainChanged', handleChainChanged);

      return () => {
        if (provider) {
          provider.removeListener('accountsChanged', handleAccountsChanged);
          provider.removeListener('chainChanged', handleChainChanged);
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