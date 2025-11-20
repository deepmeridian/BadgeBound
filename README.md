<div align="center">

<img src="BadgeBound_Logo.png" alt="BadgeBound Logo" width="400"/>

# BadgeBound

### Gamify DeFi on Hedera with Quest-Based Badge NFTs

*A Hedera-native quest layer that transforms on-chain activity into engaging achievements through badge NFTs, XP progression, and seasonal rewards.*

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![Hedera](https://img.shields.io/badge/Hedera-Testnet-purple)](https://hedera.com)

[Overview](#overview) • [Features](#features) • [Architecture](#architecture) • [Getting Started](#getting-started) • [API Documentation](#api-documentation) • [How It Works](#how-it-works) • [License](#license)

</div>

---

## Overview

**BadgeBound** is a comprehensive gamification platform built natively on Hedera that incentivizes DeFi participation through quest completion and NFT badge collection. By monitoring on-chain activity and rewarding users with beautiful badge NFTs and experience points, BadgeBound makes DeFi exploration engaging, rewarding, and fun.

### Why BadgeBound?

- **🎮 Gamified DeFi**: Transform routine DeFi actions into exciting quests with tangible rewards
- **🏆 Achievement System**: Earn unique ERC-721 badge NFTs that prove your on-chain accomplishments
- **📊 Progress Tracking**: Level up through seasonal XP systems with transparent leaderboards
- **🔄 Automated Monitoring**: Background workers continuously track your blockchain activity
- **🎨 Beautiful UI**: React-based interface with wallet integration and real-time updates
- **⚡ Hedera-Native**: Built specifically for Hedera's speed, low costs, and eco-friendly consensus

### Key Use Cases

- **User Onboarding**: Guide new users through DeFi protocols with structured quests
- **Protocol Engagement**: Increase user activity with daily, weekly, and seasonal missions
- **Community Building**: Foster competition through leaderboards and seasonal events
- **Achievement Recognition**: Reward power users with exclusive badge collections

---

## Features

### 🎯 Quest System

- **Multi-Type Quests**: Onboarding, Daily, Weekly and Seasonal quests
- **Flexible Requirements**: Support for various DeFi actions (swaps, LP provision, volume targets)
- **Smart Progress Tracking**: Automated monitoring via Hedera Mirror Node API
- **Claim-Based Rewards**: Users claim badges and XP upon quest completion

### 🎨 NFT Badges

- **ERC-721 Compliant**: Standard NFT implementation on Hedera
- **Quest-Specific Designs**: Unique badge artwork for each quest
- **Metadata Rich**: Detailed on-chain metadata for each achievement
- **Repeatable & One-Time**: Support for both recurring and unique quests / badges

### 📈 Progression System

- **Experience Points (XP)**: Earn XP through quest completion
- **Level System**: Progress through levels with XP accumulation and claim level rewards Battle Pass style
- **Seasonal Tracks**: Separate progression for each competitive season
- **Lifetime Stats**: Track cumulative achievements across all seasons

### 🏅 Leaderboard

- **Real-Time Rankings**: See how you stack up against other players
- **Multiple Metrics**: Rankings by XP, level, and badge count
- **Season-Specific**: Compete within defined seasonal timeframes
- **Transparent Scoring**: Open and verifiable on-chain activity

---

## Architecture

BadgeBound consists of three main components working together seamlessly:

```
┌─────────────────────────────────────────────────────────────┐
│                         Frontend                            │
│  React + TypeScript + Vite + Tailwind CSS                   │
│  • Wallet Connection (Hedera Wallet Connect)                │
│  • Quest Dashboard & Progress Tracking                      │
│  • Badge Gallery & Leaderboard                              │
└───────────────────────┬─────────────────────────────────────┘
                        │ REST API
┌───────────────────────▼─────────────────────────────────────┐
│                         Backend                             │
│  Node.js + Express + TypeScript + Prisma                    │
│  • Quest Management API                                     │
│  • Badge Claim Processing                                   │
│  • Leaderboard & Stats                                      │
│  • Background Worker that monitors quest progress (CronJobs)│
└──────────────────────┬──────────────────────────────────────┘
                       │
        ┌──────────────┼──────────────┐
        │              │              │
┌───────▼────┐  ┌──────▼──────┐  ┌────▼─────────┐
│ PostgreSQL │  │   Hedera    │  │ Smart        │
│  Database  │  │ Mirror Node │  │ Contract     │
│            │  │     API     │  │ (ERC-721)    │
└────────────┘  └─────────────┘  └──────────────┘
```

### Component Details

#### 🎨 **Frontend** (`/frontend`)
- **Framework**: React 19 + TypeScript + Vite
- **Key Features**:
  - Landing page with project overview
  - Quest dashboard with progress bars
  - Badge collection viewer
  - Seasonal rewards tracker
  - Live leaderboard

#### ⚙️ **Backend** (`/backend`)
- **Runtime**: Node.js + Express + TypeScript
- **Database**: PostgreSQL with Prisma ORM
- **Blockchain Integration**: Ethers.js + Hedera Mirror Node API
- **Key Services**:
  - **Quest Engine**: Evaluates quest completion based on on-chain data
  - **Badge Service**: Handles NFT minting via smart contract interaction
  - **Season Service**: Manages seasonal events and XP tracking
  - **Worker Service**: Cron-based background job for activity monitoring
- **Admin API**: Secure endpoints for quest and protocol management

#### 🔗 **Smart Contracts** (`/smartcontracts`)
- **Framework**: Hardhat + TypeScript
- **Standards**: OpenZeppelin ERC-721 implementation
- **Contract**: `QuestBadges.sol` - Main badge NFT contract
- **Features**:
  - Quest registration and metadata management
  - Badge minting with quest association
  - Role-based access control
  - Repeatable and unique badge support

---

## Getting Started

### Prerequisites

- **Node.js** v16 or higher
- **PostgreSQL** database
- **Hedera Testnet Account** with HBAR
- **Git** for cloning the repository

### Quick Setup

#### 1️⃣ Clone the Repository

```bash
git clone https://github.com/deepmeridian/BadgeBound.git
cd BadgeBound
```

#### 2️⃣ Smart Contracts Setup

```bash
cd smartcontracts
npm install

# Compile contracts
npx hardhat compile

# Run tests
npx hardhat test

# Deploy to Hedera Testnet
npx hardhat run scripts/deploy-questbadges.ts --network hederaTestnet
```

**Note**: Save the deployed contract address for backend configuration.

#### 3️⃣ Backend Setup

```bash
cd ../backend
npm install

# Configure environment variables
cp .env.example .env
# Edit .env with your database URL, Hedera credentials, and contract address
```

**Environment Configuration** (`.env`):
```bash
DATABASE_URL=postgresql://user:password@localhost:5432/badgebound
PORT=4000
HEDERA_RPC_URL=https://testnet.hashio.io/api
HEDERA_MIRROR_URL=https://testnet.mirrornode.hedera.com/api/v1
HEDERA_PRIVATE_KEY=your_private_key_here
QUEST_BADGES_ADDRESS=0.0.your_deployed_contract_id
ADMIN_API_KEY=your_secure_admin_key
```

**Database Setup**:
```bash
# Generate Prisma client
npx prisma generate

# Run migrations
npx prisma migrate dev

# (Optional) Open Prisma Studio to view data
npx prisma studio
```

**Start Services**:
```bash
# Terminal 1: API Server
npm run dev

# Terminal 2: Background Worker
npm run worker
```

#### 4️⃣ Frontend Setup

```bash
cd ../frontend
npm install

# Configure environment variables
cp .env.example .env
# Edit .env with your API URL and contract address
```

**Environment Configuration** (`.env`):
```bash
VITE_API_URL=http://localhost:4000
VITE_QUEST_BADGES_ADDRESS=0x...
```

**Start Development Server**:
```bash
npm run dev
```

The app will be available at `http://localhost:5173`

---

## API Documentation

### Public Endpoints

```
GET    /api/quests                      # List all active quests
GET    /api/quests/:wallet              # Get user's quest progress
POST   /api/quests/:questId/claim       # Claim quest reward
GET    /api/leaderboard                 # Get current season leaderboard
GET    /api/leaderboard/season/:slug    # Get specific season leaderboard
```

### Admin Endpoints (Requires `ADMIN_API_KEY`)

```
POST   /api/admin/quests                # Create new quest
PUT    /api/admin/quests/:id            # Update quest
DELETE /api/admin/quests/:id            # Remove quest
POST   /api/admin/protocols             # Add protocol
POST   /api/admin/seasons               # Create season
```

---

## How It Works

### For Users

1. **Connect Wallet**: Link your Hedera wallet via Hedera Wallet Connect
2. **View Quests**: Browse available quests across different categories
3. **Complete Activities**: Perform the required DeFi actions (swaps, LP provision, etc.)
4. **Claim Rewards**: Return to BadgeBound and claim your badge NFT + XP
5. **Track Progress**: Monitor your level, XP, and leaderboard ranking
6. **Collect Badges**: Build your NFT collection and showcase achievements

### Behind the Scenes

1. **Activity Monitoring**: Background worker queries Hedera Mirror Node API every 5 minutes
2. **Progress Evaluation**: Quest engine checks user transactions against quest requirements
3. **Status Updates**: Database updated with quest progress and completion status
4. **Badge Minting**: Smart contract called to mint ERC-721 badge NFT upon claim
5. **XP Attribution**: Experience points added to user's seasonal and lifetime totals
6. **Leaderboard Update**: Rankings recalculated based on new XP and levels

---

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

```
Copyright (c) 2025 deepmeridian
```

---

## Acknowledgments

- **Hedera** - For providing an enterprise-grade, sustainable blockchain platform
- **AngelHack** - For hosting the Hello Future Ascension Hackathon and incentivizing communities to work together
- **The Hedera Community** - For inspiration and support

---

<div align="center">

**Built with ❤️ by [deepmeridian](https://github.com/deepmeridian)**

</div>
