# BadgeBound Smart Contracts

## Overview
This folder contains smart contracts for the BadgeBound project.

## Getting Started

### Prerequisites
- Node.js (v14 or higher)
- npm
- Hardhat

### Installation
```bash
npm install
```

### Compilation
```bash
npx hardhat compile
```

### Testing
```bash
npx hardhat test
```

### Deployment
```bash
npx hardhat run scripts/deploy-questbadges.ts --network <network-name>
```

## Contract Architecture
### QuestBadges.sol

The `QuestBadges` contract is the core NFT contract that manages badge creation, minting, and quest completion tracking.

**Key Features:**
- ERC-721 compliant NFT implementation
- Quest based badge system with completion requirements
- Role based access control for quest creators and administrators
- Metadata management for badge properties and quest details
- Event emission for quest completion and badge minting

**Main Functions:**
- `createQuest()`: Creates new quests with specific requirements
- `completeBadge()`: Mints badges upon quest completion
- `getQuestDetails()`: Retrieves quest information and requirements
- `getUserBadges()`: Returns all badges owned by a user

**Access Control:**
- `QUEST_CREATOR_ROLE`: Can create and manage quests
- `DEFAULT_ADMIN_ROLE`: Full contract administration privileges

## Additional Scripts

### swap.ts

Swap HBAR on SaucerSwap Testnet via a direct call to the contract since there's no Testnet UI available.
Make sure to set your HEDERA_PRIVATE_KEY in the .env file beforehand.

```bash
npx hardhat run scripts/swap.ts --network hederaTestnet
```

### mint-saucerswap-lp.ts

Swap HBAR on SaucerSwap Testnet via a direct call to the contract since there's no Testnet UI available.
Make sure to set your SaucerSwap V2 / CLAMM contracts on testnet in the .env file beforehand.

```bash
npx hardhat run scripts/mint-saucerswap-lp.ts --network hederaTestnet
```

## License

This project is licensed under the MIT License. See the LICENSE file in the repository root for details.