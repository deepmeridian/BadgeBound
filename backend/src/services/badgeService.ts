import { ethers } from "ethers";
import { prisma } from "../config/prisma";
import { config } from "../config/env";
import logger from '../config/logger';
import { Quest } from "@prisma/client";

const QUEST_BADGES_ABI = [
  // mintBadge(address to, uint256 questId)
  "function mintBadge(address to, uint256 questId) external returns (uint256)",
  // event BadgeMinted(address indexed to, uint256 indexed tokenId, uint256 indexed questId)
  "event BadgeMinted(address indexed to, uint256 indexed tokenId, uint256 indexed questId)",
];

function getContractSigner() {
  if (!config.questBadgesAddress) {
    throw new Error("QuestBadges address is not configured");
  }
  if (!config.hederaPrivateKey) {
    throw new Error("Hedera private key is not configured");
  }

  const provider = new ethers.JsonRpcProvider(config.hederaRpcUrl);
  const wallet = new ethers.Wallet(config.hederaPrivateKey, provider);

  const contract = new ethers.Contract(
    config.questBadgesAddress,
    QUEST_BADGES_ABI,
    wallet
  );

  return { contract, wallet, provider };
}

function computeLevelFromXp(xp: bigint): number {
  // 1000 XP per level
  const perLevel = 1000n;
  // level 1 = [0, 999], level 2 = [1000, 1999], etc.
  return Number(xp / perLevel) + 1;
}

function getQuestPeriodKey(quest: Quest, date: Date = new Date()): string | null {
  const d = date;

  switch (quest.type) {
    case "DAILY": {
      const y = d.getUTCFullYear();
      const m = String(d.getUTCMonth() + 1).padStart(2, "0");
      const day = String(d.getUTCDate()).padStart(2, "0");
      return `daily:${y}-${m}-${day}`;
    }

    case "WEEKLY": {
      const y = d.getUTCFullYear();

      const firstDayOfYear = new Date(Date.UTC(y, 0, 1));
      const pastDaysOfYear = Math.floor(
        (d.getTime() - firstDayOfYear.getTime()) / (24 * 60 * 60 * 1000)
      );
      const week = Math.floor(pastDaysOfYear / 7) + 1;
      const weekStr = String(week).padStart(2, "0");
      return `weekly:${y}-W${weekStr}`;
    }

    case "SEASONAL":
    case "ONBOARDING":
    case "ACHIEVEMENT":
    default:
      return null;
  }
}

/**
 * Mints a badge for a user and updates DB status to CLAIMED.
 * Returns tx hash and tokenId if we can parse it.
 */
export async function claimBadgeForUser(walletAddress: string, questId: number) {
  // Normalize address
  const to = ethers.getAddress(walletAddress);

  // Ensure user_quest is COMPLETED and fetch quest info
  const userQuest = await prisma.userQuest.findUnique({
    where: {
      userWallet_questId: {
        userWallet: to.toLowerCase(),
        questId,
      },
    },
    include: { quest: true },
  });

  if (!userQuest) {
    throw new Error("User quest not found");
  }

  if (userQuest.status !== "COMPLETED") {
    throw new Error("Quest is not in COMPLETED status");
  }

  const quest = userQuest.quest;
  if (!quest) {
    throw new Error("Quest not found");
  }

  const periodKey = getQuestPeriodKey(quest);
  const progressData = (userQuest.progressData as any) || {};
  const lastClaimedPeriodKey = progressData.lastClaimedPeriodKey as string | undefined;

  if (periodKey && lastClaimedPeriodKey === periodKey) {
    throw new Error("Quest already claimed for this period");
  }

  const reward = quest.reward as any;
  const xpReward = BigInt(reward?.xp ?? 0);

  // Mint NFT badge via smart contract
  const { contract } = getContractSigner();

  const tx = await contract.mintBadge(to, questId);
  const receipt = await tx.wait();

  // Try to parse the BadgeMinted event
  let tokenId: bigint | null = null;
  if (receipt && receipt.logs) {
    for (const log of receipt.logs) {
      try {
        const parsed = contract.interface.parseLog(log);
        if (parsed && parsed.name === "BadgeMinted") {
          tokenId = parsed.args.tokenId as bigint;
          break;
        }
      } catch {
        logger.info("Failed to parse log for BadgeMinted event");
      }
    }
  }

  // Update user_quests status to CLAIMED
  await prisma.userQuest.update({
    where: { id: userQuest.id },
    data: {
      status: "CLAIMED",
      claimedAt: new Date(),
      lastUpdated: new Date(),
      progressData: {
        ...progressData,
        lastClaimedPeriodKey: periodKey ?? progressData.lastClaimedPeriodKey,
        badgeTxHash: receipt?.hash,
        badgeTokenId: tokenId ? tokenId.toString() : progressData.badgeTokenId,
      },
    },
  });

  //Apply XP reward to User
  const user = await prisma.user.upsert({
    where: { wallet: to.toLowerCase() },
    update: {},
    create: { wallet: to.toLowerCase() },
  });

  const currentXp = user.xp ?? 0n;
  const newXp = currentXp + xpReward;
  const newLevel = computeLevelFromXp(newXp);

  await prisma.user.update({
    where: { wallet: to.toLowerCase() },
    data: {
      xp: newXp,
      level: newLevel,
      lastSeenAt: new Date(),
    },
  });

  return {
    txHash: receipt?.hash,
    tokenId: tokenId ? tokenId.toString() : null,
    xpReward: xpReward.toString(),
    newXp: newXp.toString(),
    newLevel,
  };
}