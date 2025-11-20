const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;
const VITE_QUEST_BADGES_ADDRESS = import.meta.env.VITE_QUEST_BADGES_ADDRESS;

export interface LeaderboardEntry {
  rank: number;
  wallet: string;
  xp: number;
  level: number;
  badges: number;
  user: {
    wallet: string;
  };
}

export interface Season {
  id: string;
  name: string;
  slug: string;
  startAt: string;
  endAt: string;
}

export interface LeaderboardResponse {
  season: Season | null;
  entries: LeaderboardEntry[];
}

export async function fetchLeaderboard(limit: number = 50): Promise<LeaderboardResponse> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/leaderboard/season?limit=${limit}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error fetching leaderboard:', error);
    throw error;
  }
}

export function formatWalletAddress(address: string): string {
  if (address.length < 10) return address;
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

// Quest related types and functions
export interface QuestRequirement {
  type: string;
  minLevel?: number;
  [key: string]: any;
}

export interface QuestReward {
  xp: number;
  badgeTokenId?: number;
  [key: string]: any;
}

export interface Quest {
  id: number;
  protocolId: string;
  type: 'ONBOARDING' | 'DAILY' | 'WEEKLY' | 'SEASONAL';
  title: string;
  description: string;
  seasonId: number;
  requirement: QuestRequirement;
  reward: QuestReward;
}

export interface UserQuest {
  questId: number;
  status: 'NOT_STARTED' | 'IN_PROGRESS' | 'COMPLETED' | 'CLAIMED';
  wallet: string;
  completion: number;
  completionPercent: number;
  progress: number | null;
  target: number | null;
  lastCompletedPeriodKey?: string;
  lastClaimedPeriodKey?: string;
  claimedAt?: string;
  quest: Quest;
}

export interface ClaimQuestResponse {
  success: boolean;
  questId: number;
  wallet: string;
  txHash: string;
  tokenId: number;
}

export async function fetchQuests(): Promise<Quest[]> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/quests`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error fetching quests:', error);
    throw error;
  }
}

export async function fetchUserQuests(walletAddress: string): Promise<UserQuest[]> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/quests/${walletAddress}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error fetching user quests:', error);
    throw error;
  }
}

export async function claimQuest(questId: number, walletAddress: string): Promise<ClaimQuestResponse> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/quests/${questId}/claim`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ wallet: walletAddress }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error claiming quest:', error);
    throw error;
  }
}

// Badge NFT related types and functions
export interface BadgeMetadata {
  name: string;
  description: string;
  image: string;
  attributes?: Array<{
    trait_type: string;
    value: string | number;
  }>;
}

export interface Badge {
  tokenId: number;
  metadata: BadgeMetadata;
  owned: boolean;
}

const ERC721_ABI = [
  'function ownerOf(uint256 tokenId) external view returns (address)',
  'function tokenURI(uint256 tokenId) external view returns (string)',
  'function balanceOf(address owner) external view returns (uint256)',
];

export async function fetchUserBadges(walletAddress: string, provider: any): Promise<Badge[]> {
  try {
    const { ethers } = await import('ethers');
    const contract = new ethers.Contract(VITE_QUEST_BADGES_ADDRESS, ERC721_ABI, provider);
    
    const badges: Badge[] = [];
    
    // Check tokens for ownership and metadata
    for (let tokenId = 1; tokenId <= 25; tokenId++) {
      try {
        let owned = false;
        let tokenExists = false;
        let metadata: BadgeMetadata = {
          name: `Badge #${tokenId}`,
          description: 'Badge description not available',
          image: '',
        };

        // Check if token exists and get owner
        try {
          const owner = await contract.ownerOf(tokenId);
          owned = owner.toLowerCase() === walletAddress.toLowerCase();
          tokenExists = true;
        } catch (err: any) {
          owned = false;
          tokenExists = false;
          
          if (err.message && err.message.includes('nonexistent token')) {
            console.log(`Token ${tokenId} doesn't exist yet`);
          }
        }

        // Only try to get metadata if the token exists
        if (tokenExists) {
          try {
            const tokenURI = await contract.tokenURI(tokenId);
            if (tokenURI) {
              console.log(`Fetching metadata for token ${tokenId} from:`, tokenURI);
              const metadataResponse = await fetchMetadata(tokenURI);
              if (metadataResponse) {
                metadata = metadataResponse;
                console.log(`Successfully loaded metadata for token ${tokenId}:`, metadata.name);
              }
            }
          } catch (err) {
            console.warn(`Failed to fetch metadata for token ${tokenId}:`, err);
          }

          badges.push({
            tokenId,
            metadata,
            owned,
          });
        }
      } catch (err) {
        console.warn(`Error checking token ${tokenId}:`, err);
        // Add placeholder badge even if there's an error
        badges.push({
          tokenId,
          metadata: {
            name: `Badge #${tokenId}`,
            description: 'Error loading badge information',
            image: '',
          },
          owned: false,
        });
      }
    }

    return badges;
  } catch (error) {
    console.error('Error fetching user badges:', error);
    throw error;
  }
}

async function fetchMetadata(uri: string): Promise<BadgeMetadata | null> {
  try {
    let urls: string[] = [];
    
    if (uri.startsWith('ipfs://')) {
      const hash = uri.substring(7);
      // Multiple IPFS gateways for better reliability
      urls = [
        `https://gateway.pinata.cloud/ipfs/${hash}`,
        `https://cloudflare-ipfs.com/ipfs/${hash}`,
        `https://ipfs.io/ipfs/${hash}`,
        `https://gateway.ipfs.io/ipfs/${hash}`,
        `https://dweb.link/ipfs/${hash}`,
      ];
    } else {
      urls = [uri];
    }

    let lastError: Error | null = null;

    for (const url of urls) {
      try {
        console.log(`Trying to fetch metadata from: ${url}`);
        
        const response = await fetch(url, {
          method: 'GET',
          headers: {
            'Accept': 'application/json',
          },
        });

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const metadata = await response.json();
        
        if (metadata.image && metadata.image.startsWith('ipfs://')) {
          const imageHash = metadata.image.substring(7);
          // Use the same gateway that worked for metadata
          const workingGateway = url.substring(0, url.lastIndexOf('/ipfs/'));
          metadata.image = `${workingGateway}/ipfs/${imageHash}`;
        }

        console.log(`Successfully fetched metadata from ${url}:`, metadata);
        return metadata;
        
      } catch (error) {
        console.warn(`Failed to fetch from ${url}:`, error);
        lastError = error as Error;
        continue;
      }
    }

    if (lastError) {
      throw lastError;
    }

    return null;
  } catch (error) {
    console.warn('Failed to fetch metadata from all gateways:', error);
    return null;
  }
}