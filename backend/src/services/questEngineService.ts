import { prisma } from "../config/prisma";
import { config } from "../config/env";
import logger from "../config/logger";
import fetch from "node-fetch";

const MIRROR_BASE_URL = config.hederaMirrorUrl;
const SAUCERSWAP_V2_ROUTER_ID = config.SAUCERSWAP_V2_ROUTER_ID;

type Requirement =
  | { type: "SWAP_VOLUME"; protocol: string; minVolume: number; token?: string }
  | { type: "SWAP_COUNT"; protocol: string; minCount: number }
  | { type: "LP_HOLD_DAYS"; protocol: string; minAmount: number; days: number }
  | { type: "STAKE_MIN_AMOUNT"; protocol: string; minAmount: number }
  | { type: string; [key: string]: any }; // fallback

type MirrorContractResult = {
  contract_id: string;
  result: string; // e.g. "SUCCESS"
  timestamp: string;
  from: string;
};

function toMirrorTimestamp(date: Date): string {
  const seconds = Math.floor(date.getTime() / 1000);
  const nanos = (date.getTime() % 1000) * 1_000_000;
  return `${seconds}.${nanos.toString().padStart(9, "0")}`;
}

function getTimeWindowForQuest(): { fromTs?: string } {
  const now = new Date();
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  return { fromTs: `gte:${toMirrorTimestamp(sevenDaysAgo)}` };
}

async function fetchSaucerSwapContractResultsForUser(
  wallet: string,
  limit = 100
): Promise<MirrorContractResult[]> {
  const normalizedWallet = wallet.toLowerCase();
  const { fromTs } = getTimeWindowForQuest();

  const url = new URL(`${MIRROR_BASE_URL}/contracts/results`);
  url.searchParams.set("from", normalizedWallet);
  url.searchParams.set("order", "desc");
  url.searchParams.set("limit", String(limit));
  if (fromTs) url.searchParams.append("timestamp", fromTs);

  const urlStr = url.toString();
  logger.debug(`[QuestEngine] Fetching mirror data: ${urlStr}`);

  const res = await fetch(urlStr);
  if (!res.ok) {
    logger.error(
      `[QuestEngine] Mirror node error ${res.status} ${res.statusText} for ${urlStr}`
    );
    return [];
  }

  const json = (await res.json()) as { results?: MirrorContractResult[] };
  const results = json.results || [];

  const filtered = results.filter(
    (r) =>
      r.contract_id === SAUCERSWAP_V2_ROUTER_ID &&
      r.result === "SUCCESS"
  );

  logger.debug(
    `[QuestEngine] Found ${filtered.length} SaucerSwap router results for wallet ${normalizedWallet}`
  );

  return filtered;
}

/**
 * Update quest statuses for all users for all active quests.
 */
export async function updateAllUserQuests() {
  logger.info(`[QuestEngine] Running update at ${new Date().toISOString()}`);

  const activeQuests = await prisma.quest.findMany({
    where: {
      isActive: true,
      AND: [
        {
          OR: [
            { startAt: null },
            { startAt: { lte: new Date() } }
          ]
        },
        {
          OR: [
            { endAt: null },
            { endAt: { gte: new Date() } }
          ]
        }
      ]
    },
  });

  const users = await prisma.user.findMany();

  for (const quest of activeQuests) {
    const req = quest.requirement as Requirement;
    logger.info(`[QuestEngine] Evaluating quest ${quest.id} (${quest.title}) for ${users.length} users`);

    for (const user of users) {
      try {
        const meets = await userMeetsRequirement(user.wallet, quest.id, req);
        await updateUserQuestStatus(user.wallet, quest.id, meets);
      } catch (err: any) {
        logger.error(
          `[QuestEngine] Error evaluating quest ${quest.id} for user ${user.wallet}`,
          { error: err.message, stack: err.stack }
        );
      }
    }
  }

  logger.info("[QuestEngine] Update cycle finished");
}

// Check if user meets the quest requirement
async function userMeetsRequirement(
  wallet: string,
  questId: number,
  requirement: Requirement
): Promise<boolean> {
  const normalizedWallet = wallet.toLowerCase();

  switch (requirement.type) {
    case "SWAP_COUNT": {
      if (requirement.protocol !== "saucerswap") {
        logger.warn(
          `[QuestEngine] SWAP_COUNT only implemented for saucerswap, got protocol=${requirement.protocol} (quest ${questId})`
        );
        return false;
      }

      const results = await fetchSaucerSwapContractResultsForUser(normalizedWallet, 200);
      const swapCount = results.length;
      const met = swapCount >= requirement.minCount;

      logger.info(
        `[QuestEngine] SWAP_COUNT quest ${questId} for ${normalizedWallet}: count=${swapCount}, min=${requirement.minCount}, met=${met}`
      );

      return met;
    }

    case "SWAP_VOLUME": {
      if (requirement.protocol !== "saucerswap") {
        logger.warn(
          `[QuestEngine] SWAP_VOLUME only implemented for saucerswap, got protocol=${requirement.protocol} (quest ${questId})`
        );
        return false;
      }

      const results = await fetchSaucerSwapContractResultsForUser(normalizedWallet, 200);

      const syntheticVolume = results.length;
      const met = syntheticVolume >= requirement.minVolume;

      logger.info(
        `[QuestEngine] SWAP_VOLUME quest ${questId} for ${normalizedWallet}: syntheticVolume=${syntheticVolume}, minVolume=${requirement.minVolume}, met=${met}`
      );

      return met;
    }

    case "LP_HOLD_DAYS":
      logger.debug(
        `[QuestEngine] [TODO] Check LP_HOLD_DAYS for wallet ${wallet}, quest ${questId}`
      );
      return false;

    case "STAKE_MIN_AMOUNT":
      logger.debug(
        `[QuestEngine] [TODO] Check STAKE_MIN_AMOUNT for wallet ${wallet}, quest ${questId}`
      );
      return false;

    default:
      logger.warn(
        `[QuestEngine] Unknown requirement.type "${(requirement as any).type}" for quest ${questId}`
      );
      return false;
  }
}

async function updateUserQuestStatus(wallet: string, questId: number, meetsRequirement: boolean) {
  const normalizedWallet = wallet.toLowerCase();

  const existing = await prisma.userQuest.findUnique({
    where: {
      userWallet_questId: {
        userWallet: normalizedWallet,
        questId,
      },
    },
  });

  if (!existing) {
    await prisma.userQuest.create({
      data: {
        userWallet: normalizedWallet,
        questId,
        status: meetsRequirement ? "COMPLETED" : "IN_PROGRESS",
        lastUpdated: new Date(),
      },
    });
    return;
  }

  if (existing.status === "CLAIMED" || existing.status === "EXPIRED") {
    return;
  }

  const newStatus = meetsRequirement ? "COMPLETED" : "IN_PROGRESS";

  await prisma.userQuest.update({
    where: { id: existing.id },
    data: {
      status: newStatus,
      lastUpdated: new Date(),
    },
  });
}