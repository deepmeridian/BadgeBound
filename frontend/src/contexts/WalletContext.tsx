import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { ethers } from 'ethers';
import { DAppConnector } from '@hashgraph/hedera-wallet-connect/dist/lib/dapp/index.js';
import { HederaSessionEvent, HederaJsonRpcMethod, HederaChainId } from '@hashgraph/hedera-wallet-connect/dist/lib/shared/index.js';
import { LedgerId } from '@hashgraph/sdk';

export type WalletType = 'metamask' | 'walletconnect';

interface WalletContextType {
  isConnected: boolean;
  address: string | null;
  provider: ethers.BrowserProvider | null;
  signer: ethers.JsonRpcSigner | null;
  chainId: number | null;
  connectWallet: (walletType?: WalletType) => Promise<void>;
  disconnect: () => void;
  isConnecting: boolean;
  error: string | null;
  walletType: WalletType | null;
  hasMetaMask: boolean;
}

const WalletContext = createContext<WalletContextType | undefined>(undefined);

interface WalletProviderProps {
  children: ReactNode;
}

// Initialize DAppConnector
const metadata = {
  name: 'BadgeBound',
  description: 'Hedera Native Quest Layer - Reward on-chain activity with badge NFTs',
  url: window.location.origin,
  icons: [window.location.origin + '/BadgeBound_Logo.png'],
};

let dAppConnector: DAppConnector | null = null;

const initializeDAppConnector = async () => {
  if (dAppConnector) return dAppConnector;
  
  dAppConnector = new DAppConnector(
    metadata,
    LedgerId.TESTNET,
    import.meta.env.VITE_WALLETCONNECT_PROJECT_ID || '',
    Object.values(HederaJsonRpcMethod),
    [HederaSessionEvent.ChainChanged, HederaSessionEvent.AccountsChanged],
    [HederaChainId.Testnet]
  );
  
  await dAppConnector.init({ logger: 'error' });
  return dAppConnector;
};

export function WalletProvider({ children }: WalletProviderProps) {
  const [isConnected, setIsConnected] = useState(false);
  const [address, setAddress] = useState<string | null>(null);
  const [provider, setProvider] = useState<ethers.BrowserProvider | null>(null);
  const [signer, setSigner] = useState<ethers.JsonRpcSigner | null>(null);
  const [chainId, setChainId] = useState<number | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [walletType, setWalletType] = useState<WalletType | null>(null);
  const [hasMetaMask, setHasMetaMask] = useState(false);

  useEffect(() => {
    // Check for MetaMask
    if (typeof window !== 'undefined' && window.ethereum) {
      setHasMetaMask(true);
    }
    
    initializeDAppConnector().catch(console.error);
    
    if (typeof window !== 'undefined') {
      const shouldAuto = localStorage.getItem('bb_autoConnect') === 'true';
      const savedWalletType = localStorage.getItem('bb_walletType') as WalletType | null;
      if (shouldAuto && savedWalletType) {
        checkConnection(savedWalletType);
      }
    }
  }, []);

  const checkConnection = async (savedWalletType: WalletType) => {
    try {
      if (savedWalletType === 'metamask') {
        await checkMetaMaskConnection();
      } else {
        await checkWalletConnectConnection();
      }
    } catch (err) {
      console.error('Error checking wallet connection:', err);
    }
  };

  const checkMetaMaskConnection = async () => {
    if (!window.ethereum) return;
    
    try {
      const browserProvider = new ethers.BrowserProvider(window.ethereum);
      const accounts = await browserProvider.listAccounts();
      
      if (accounts.length > 0) {
        const signer = await browserProvider.getSigner();
        const address = await signer.getAddress();
        const network = await browserProvider.getNetwork();
        
        setAddress(address);
        setProvider(browserProvider);
        setSigner(signer);
        setChainId(Number(network.chainId));
        setIsConnected(true);
        setWalletType('metamask');
      }
    } catch (err) {
      console.error('Error checking MetaMask connection:', err);
    }
  };

  const checkWalletConnectConnection = async () => {
    try {
      const connector = await initializeDAppConnector();
      const sessions = connector.signers;
      
      if (sessions && sessions.length > 0) {
        const session = sessions[0];
        const accountId = session.getAccountId()?.toString();
        
        if (accountId) {
          // Get EVM address from Hedera account
          const evmAddress = await getEvmAddress(accountId);
          setAddress(evmAddress);
          setIsConnected(true);
          setWalletType('walletconnect');
          
          // Create provider using the JSON-RPC endpoint
          const rpcProvider = new ethers.JsonRpcProvider('https://testnet.hashio.io/api');
          setProvider(rpcProvider as any);
          setChainId(296); // Hedera testnet chain ID
        }
      }
    } catch (err) {
      console.error('Error checking WalletConnect connection:', err);
    }
  };

  const getEvmAddress = async (accountId: string): Promise<string> => {
    // Convert Hedera account ID (0.0.xxxx) to EVM address
    // For now, we'll use the account ID as a placeholder
    // In production, you'd query the mirror node for the EVM address
    try {
      const response = await fetch(`https://testnet.mirrornode.hedera.com/api/v1/accounts/${accountId}`);
      const data = await response.json();
      return data.evm_address || `0x${accountId.replace(/\./g, '')}`;
    } catch {
      return `0x${accountId.replace(/\./g, '')}`;
    }
  };

  const connectWallet = async (walletType: WalletType = 'walletconnect') => {
    setIsConnecting(true);
    setError(null);

    try {
      if (walletType === 'metamask') {
        await connectMetaMask();
      } else {
        await connectWalletConnect();
      }
    } catch (err: any) {
      console.error('Wallet connection error:', err);
      
      // Check for user rejection or cancellation
      if (err.message?.includes('User rejected') || 
          err.message?.includes('User cancelled') ||
          err.message?.includes('cancelled by user') ||
          err.message?.includes('User closed modal') ||
          err.code === 4001 ||
          err.code === 'ACTION_REJECTED') {
        setError('Connection rejected by user');
      } else {
        setError(err.message || 'Failed to connect wallet');
      }
    } finally {
      setIsConnecting(false);
    }
  };

  const connectMetaMask = async () => {
    if (!window.ethereum) {
      throw new Error('MetaMask is not installed');
    }

    try {
      const browserProvider = new ethers.BrowserProvider(window.ethereum);
      
      // Request account access
      await window.ethereum.request({ method: 'eth_requestAccounts' });
      
      const signer = await browserProvider.getSigner();
      const address = await signer.getAddress();
      const network = await browserProvider.getNetwork();
      
      setAddress(address);
      setProvider(browserProvider);
      setSigner(signer);
      setChainId(Number(network.chainId));
      setIsConnected(true);
      setWalletType('metamask');
      
      // Persist auto-connect preference
      if (typeof window !== 'undefined') {
        localStorage.setItem('bb_autoConnect', 'true');
        localStorage.setItem('bb_walletType', 'metamask');
      }

      // Listen for account changes
      window.ethereum.on('accountsChanged', handleAccountsChanged);
      window.ethereum.on('chainChanged', handleChainChanged);
      
    } catch (err) {
      throw err;
    }
  };

  const connectWalletConnect = async () => {
    let modalCheckInterval: NodeJS.Timeout | null = null;

    try {
      const connector = await initializeDAppConnector();
      
      // Create a promise that rejects when modal is closed without connection
      const modalClosurePromise = new Promise<never>((_, reject) => {
        let modalWasActive = false;
        
        modalCheckInterval = setInterval(() => {
          const wcmModalElement = document.querySelector('wcm-modal');
          
          if (wcmModalElement?.shadowRoot) {
            const modalContainer = wcmModalElement.shadowRoot.querySelector('#wcm-modal');
            
            if (modalContainer) {
              const isActive = modalContainer.classList.contains('wcm-active');
              
              if (isActive) {
                modalWasActive = true;
              } else if (modalWasActive) {
                clearInterval(modalCheckInterval!);
                reject(new Error('Connection cancelled by user'));
              }
            }
          }
        }, 300);
      });
      
      // Race between modal connection and modal closure detection
      const session = await Promise.race([
        connector.openModal(),
        modalClosurePromise
      ]);
      
      if (modalCheckInterval) clearInterval(modalCheckInterval);
      
      //console.log('Session established:', session);
      
      if (session) {
        await handleSessionConnected();
      } else {
        throw new Error('Connection cancelled by user');
      }

    } catch (err) {
      if (modalCheckInterval) clearInterval(modalCheckInterval);
      throw err;
    }
  };

  const handleAccountsChanged = (accounts: string[]) => {
    if (accounts.length === 0) {
      disconnect();
    } else {
      setAddress(accounts[0]);
    }
  };

  const handleChainChanged = () => {
    // Reload the page on chain change as recommended by MetaMask
    window.location.reload();
  };

  const handleSessionConnected = async () => {
    try {
      const connector = await initializeDAppConnector();
      const sessions = connector.signers;
      
      if (sessions && sessions.length > 0) {
        const session = sessions[0];
        const accountId = session.getAccountId()?.toString();
        
        if (accountId) {
          const evmAddress = await getEvmAddress(accountId);
          setAddress(evmAddress);
          setIsConnected(true);
          setWalletType('walletconnect');
          
          const rpcProvider = new ethers.JsonRpcProvider('https://testnet.hashio.io/api');
          setProvider(rpcProvider as any);
          setChainId(296);
          
          // Persist auto-connect preference
          if (typeof window !== 'undefined') {
            localStorage.setItem('bb_autoConnect', 'true');
            localStorage.setItem('bb_walletType', 'walletconnect');
          }
        }
      }
    } catch (err) {
      console.error('Error handling session connection:', err);
    }
  };

  const disconnect = async () => {
    try {
      if (walletType === 'walletconnect') {
        const connector = await initializeDAppConnector();
        const sessions = connector.signers;
        
        if (sessions && sessions.length > 0) {
          await connector.disconnectAll();
        }
      } else if (walletType === 'metamask' && window.ethereum) {
        // Remove MetaMask event listeners
        window.ethereum.removeListener('accountsChanged', handleAccountsChanged);
        window.ethereum.removeListener('chainChanged', handleChainChanged);
      }
    } catch (err) {
      console.error('Error disconnecting:', err);
    }
    
    setIsConnected(false);
    setAddress(null);
    setProvider(null);
    setSigner(null);
    setChainId(null);
    setError(null);
    setWalletType(null);
    
    if (typeof window !== 'undefined') {
      localStorage.removeItem('bb_autoConnect');
      localStorage.removeItem('bb_walletType');
    }
  };

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
    walletType,
    hasMetaMask,
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