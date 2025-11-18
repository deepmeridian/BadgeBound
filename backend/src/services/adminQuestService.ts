import { ethers } from "ethers";
import { prisma } from "../config/prisma";
import { config } from "../config/env";

const QUEST_BADGES_ADMIN_ABI = [
  // registerQuest(uint256 questId, string name, string description, string uri, bool repeatable)
  "function registerQuest(uint256 questId, string name, string description, string uri, bool repeatable) external",
];

function getAdminContractSigner() {
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
    QUEST_BADGES_ADMIN_ABI,
    wallet
  );

  return { contract, wallet, provider };
}

type CreateQuestInput = {
  protocolId?: number | null;
  type: "ONBOARDING" | "DAILY" | "WEEKLY" | "SEASONAL" | "ACHIEVEMENT";
  title: string;
  description: string;
  startAt?: Date | null;
  endAt?: Date | null;
  requirement: any; // JSON
  reward: any;      // JSON
  seasonId?: number | null;
  badgeUri: string;
  repeatable: boolean;
};

/**
 * Creates a quest in the DB and registers it on-chain in QuestBadges.
 * Uses the auto-increment quest.id as questId on-chain to keep them aligned.
 */
export async function createQuestWithOnChainRegistration(input: CreateQuestInput) {
  // Create quest in DB
  const quest = await prisma.quest.create({
    data: {
      protocolId: input.protocolId ?? null,
      type: input.type,
      title: input.title,
      description: input.description,
      startAt: input.startAt ?? null,
      endAt: input.endAt ?? null,
      requirement: input.requirement,
      reward: input.reward,
      seasonId: input.seasonId ?? null,
      isActive: true,
    },
  });

  const questId = quest.id;
  const { contract } = getAdminContractSigner();

  //Call registerQuest on-chain
  const tx = await contract.registerQuest(
    questId,
    input.title,
    input.description,
    input.badgeUri,
    input.repeatable
  );

  const receipt = await tx.wait();

  return {
    quest,
    txHash: receipt?.hash,
  };
}