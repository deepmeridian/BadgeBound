# BadgeBound Frontend

## Overview
The frontend is a Vite + React + TypeScript single-page app that powers the BadgeBound UI — landing page, wallet connection, leaderboard, quests, badges, and seasonal rewards.
 
## Functionality

The app is organized into tabs (or screens). Below each tab is a short description of what it does and the main components involved.

- **Landing Page:** Brief introduction, link to connect wallet. Main component: `src/components/LandingPage.tsx`.

- **Quests Tab:** Lists available quests, progress tracking, and reward previews. Users can start/claim quests and view progress. Main component: `src/components/QuestsTab.tsx`.

- **Badges Tab:** Displays the user's collected badges (NFTs), badge metadata and allows the user to import the NFTs into wallet. Main component: `src/components/BadgesTab.tsx`.

- **Seasonal Rewards Tab:** Displays season specific reward tracks, progress meters, and claimable seasonal NFTs or rewards. Main component: `src/components/SeasonalRewardsTab.tsx`.

- **Leaderboard Tab:** Shows player rankings, level and XP. Main component: `src/components/LeaderboardTab.tsx`.

## Tech Stack
- **Framework:** `React` + `TypeScript`
- **Bundler / Dev server:** `Vite`
- **State / Context:** React Context (see `src/contexts/WalletContext.tsx`)

### Installation
```bash
npm install
```

### Environment Variables
```
VITE_API_URL=http://localhost:4000
VITE_QUEST_BADGES_ADDRESS=0x...
```

The frontend expects an API backend reachable at `VITE_API_URL`. Adjust that to your local backend. (see `.env.example`)

### Run dev server
```bash
npm run dev
```

### Build for production
```bash
npm run build
```

## License

This project is licensed under the MIT License. See the LICENSE file in the repository root for details.