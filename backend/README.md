# BadgeBound Backend

The BadgeBound backend is a Node.js/Express API server that powers the quest engine and badge minting system. It monitors on-chain activity via the Hedera Mirror Node API, tracks quest progress, and manages badge NFT claims.

## Architecture

### Core Components

- **REST API Server** (`src/index.ts`): Express server handling quest data and badge claims
- **Quest Worker** (`src/worker.ts`): Background service monitoring blockchain activity every 5 minutes
- **Quest Engine** (`src/services/questEngineService.ts`): Core logic for evaluating quest progress
- **Database Layer**: PostgreSQL with Prisma ORM for data persistence

### Tech Stack

- **Runtime**: Node.js with TypeScript
- **Web Framework**: Express.js
- **Database**: PostgreSQL with Prisma ORM
- **Blockchain Integration**: Ethers.js for Hedera interaction + Hedera Mirror Node API
- **Scheduling**: node-cron

## Quick Start

### Prerequisites

- Node.js (v16+)
- PostgreSQL database
- Hedera testnet account with HBAR

### Installation

```bash
npm install
```

### Environment Configuration

Create a `.env` file with the following variables:

```bash
# Database
DATABASE_URL=postgresql://user:password@localhost:5432/badgebound

# Server
PORT=4000
NODE_ENV=development

# Hedera Network
HEDERA_RPC_URL=https://testnet.hashio.io/api
HEDERA_MIRROR_URL=https://testnet.mirrornode.hedera.com/api/v1
HEDERA_PRIVATE_KEY=your_hedera_private_key

# Smart Contracts
QUEST_BADGES_ADDRESS=0.0.your_contract_id

# SaucerSwap Configuration
SAUCERSWAP_V2_ROUTER_ID=0.0.1414040
SAUCERSWAP_LP_TOKEN_ID=0.0.1310436
SAUCERSWAP_LP_DECIMALS=0
USDC_TESTNET_TOKEN_ID=0.0.4760196
USDC_DECIMALS=6

# Admin API
ADMIN_API_KEY=your_secure_admin_key
```

### Database Setup

```bash
# Generate Prisma client
npx prisma generate

# Run database migrations
npx prisma migrate dev

# (Optional) View database in browser
npx prisma studio
```

### Running the Services

```bash
# Start the API server (development mode)
npm run dev

# Start the quest worker (in a separate terminal)
npm run worker
```

The API will be available at `http://localhost:4000`

## API Endpoints

### Public Endpoints

#### Quest Management
```
GET    /api/quests                     # List all active quests
GET    /api/quests/:wallet             # Get user's quest progress
POST   /api/quests/:questId/claim      # Claim completed quest reward
```

#### Leaderboard
```
GET    /api/leaderboard/season         # Current season leaderboard
```

#### Health Check
```
GET    /health                         # Service health status
```

### Admin Endpoints

All admin endpoints require `x-api-key` header with your admin API key.

#### Quest Management
```
POST   /api/admin/quests               # Create new quest
GET    /api/admin/quests               # List all quests (admin view)
PUT    /api/admin/quests/:id           # Update quest
DELETE /api/admin/quests/:id           # Delete quest
```

#### Protocol Management
```
POST   /api/admin/protocols            # Add new protocol
GET    /api/admin/protocols            # List protocols
PUT    /api/admin/protocols/:id        # Update protocol
```

#### Season Management
```
POST   /api/admin/seasons              # Create new season
GET    /api/admin/seasons              # List seasons
PUT    /api/admin/seasons/:id          # Update season
POST   /api/admin/seasons/:id/activate # Activate season
```

## Quest System

### Quest Types

- **ONBOARDING**: One time completion quests for new users
- **DAILY**: Reset every day at UTC midnight
- **WEEKLY**: Reset every Monday at UTC midnight  
- **SEASONAL**: Available throughout an entire season
- **ACHIEVEMENT**: Milestone based quests

### Quest Requirements

Quests support various requirement types:

```typescript
// Swap volume requirement
{
  "type": "SWAP_VOLUME", 
  "protocol": "saucerswap",
  "minVolume": 50,
  "token": "HBAR"
}

// Swap count requirement
{
  "type": "SWAP_COUNT",
  "protocol": "saucerswap",
  "minCount": 5
}

// LP holding requirement
{
  "type": "LP_HOLD_DAYS",
  "protocol": "saucerswap_lp",
  "minAmount": 1000,
  "days": 3
}

// HBAR transfer count requirement
{
  "type": "HBAR_TRANSFER_COUNT",
  "minCount": 2,
  "direction": "OUT"  // "IN" | "OUT" | "BOTH"
}

// Season level requirement
{
  "type": "SEASON_LEVEL_AT_LEAST",
  "minLevel": 5
}
```

### Quest Rewards

```typescript
{
  "xp": 500,
  "badgeTokenId": 1
}
```

## Quest Worker

The quest worker runs every 5 minutes and:

1. **Fetches active users** from the database
2. **Queries Hedera Mirror Node** for recent transactions
3. **Evaluates quest progress** against requirements
4. **Updates quest status** (in progress → completed)
5. **Logs activity** for monitoring

Worker logs are available in the `logs/` directory.

## Development

### Scripts

```bash
npm run dev          # Start API server with hot reload
npm run worker       # Start quest worker with hot reload  
npm run build        # Compile TypeScript to JavaScript
npm run start        # Run compiled JavaScript (production)
```

### Database Commands

```bash
npm run prisma:generate    # Generate Prisma client
npm run prisma:migrate     # Run database migrations
```

### Logging

Logs are written to:
- `logs/app.log` - General application logs
- `logs/error.log` - Error logs only
- Console output in development mode

## Security

- Admin endpoints protected with API key authentication
- Input validation using Zod schemas
- SQL injection protection via Prisma ORM
- CORS enabled for frontend integration
- Comprehensive error handling to prevent information leakage

## Related Documentation

- [Prisma Schema Reference](./prisma/schema.prisma)
- [Smart Contract Documentation](../smartcontracts/README.md) 
- [Hedera Mirror Node API](https://docs.hedera.com/hedera/sdks-and-apis/rest-api)
