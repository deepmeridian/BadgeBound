import { prisma } from "../config/prisma";
import { config } from "../config/env";
import logger from "../config/logger";
import fetch from "node-fetch";
import { Quest } from "@prisma/client";

const MIRROR_BASE_URL = config.hederaMirrorUrl;
const SAUCERSWAP_V2_ROUTER_ID = config.SAUCERSWAP_V2_ROUTER_ID;
const MS_PER_DAY = 24 * 60 * 60 * 1000;
const LP_TOKEN_ID = config.SAUCERSWAP_LP_TOKEN_ID;
const LP_DECIMALS = config.SAUCERSWAP_LP_DECIMALS;
const HBAR_DECIMALS = 8;

type Requirement =
  | { type: "SWAP_VOLUME"; protocol: string; minVolume: number; token?: string }
  | { type: "SWAP_COUNT"; protocol: string; minCount: number }
  | { type: "LP_HOLD_DAYS"; protocol: string; minAmount: number; days: number; }
  | { type: "HBAR_TRANSFER_COUNT"; minCount: number; direction?: "IN" | "OUT" | "BOTH" }
  | { type: "SEASON_LEVEL_AT_LEAST"; minLevel: number }
  | { type: string;[key: string]: any }; // fallback

type RequirementCheckResult = {
  met: boolean;
  progress: number; // what the user has (e.g. swaps or volume)
  target: number;   // requirement.minCount or requirement.minVolume
};

type MirrorContractResult = {
  contract_id: string;
  result: string; // e.g. "SUCCESS"
  timestamp: string;
  from: string;
};

type HbarDirection = "IN" | "OUT" | "BOTH";

function startOfUtcDay(d: Date): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}

function getUtcWeekBounds(d: Date): { start: Date; end: Date } {
  // We define week as Monday 00:00 UTC → next Monday 00:00 UTC
  const day = d.getUTCDay(); // 0 Sun ... 6 Sat
  const diffToMonday = (day + 6) % 7; // 0 if Monday, 1 if Tuesday, etc.

  const start = new Date(
    Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() - diffToMonday)
  );
  const end = new Date(start.getTime() + 7 * MS_PER_DAY);
  return { start, end };
}

function toMirrorTimestamp(date: Date): string {
  const seconds = Math.floor(date.getTime() / 1000);
  const nanos = (date.getTime() % 1000) * 1_000_000;
  return `${seconds}.${nanos.toString().padStart(9, "0")}`;
}

/**
 * Returns a timestamp window for this quest, based on its type:
 * - DAILY  → [today 00:00 UTC, tomorrow 00:00 UTC)
 * - WEEKLY → [current week Monday 00:00 UTC, next Monday 00:00 UTC)
 * - SEASONAL/ONBOARDING/ACHIEVEMENT → use quest.startAt / endAt if present, otherwise no filter
 */
function getTimeWindowForQuest(quest: Quest): { fromTs?: string; toTs?: string } {
  const now = new Date();
  let periodStart: Date | null = null;
  let periodEnd: Date | null = null;

  switch (quest.type) {
    case "DAILY": {
      const start = startOfUtcDay(now);
      const end = new Date(start.getTime() + MS_PER_DAY);
      periodStart = start;
      periodEnd = end;
      break;
    }

    case "WEEKLY": {
      const { start, end } = getUtcWeekBounds(now);
      periodStart = start;
      periodEnd = end;
      break;
    }

    case "SEASONAL":
    case "ONBOARDING":
    case "ACHIEVEMENT":
    default:
      break;
  }

  if (quest.startAt) {
    periodStart = periodStart ? new Date(Math.max(periodStart.getTime(), quest.startAt.getTime())) : quest.startAt;
  }
  if (quest.endAt) {
    periodEnd = periodEnd ? new Date(Math.min(periodEnd.getTime(), quest.endAt.getTime())) : quest.endAt;
  }

  const window: { fromTs?: string; toTs?: string } = {};

  if (periodStart) {
    window.fromTs = `gte:${toMirrorTimestamp(periodStart)}`;
  }
  if (periodEnd) {
    window.toTs = `lt:${toMirrorTimestamp(periodEnd)}`;
  }

  return window;
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

async function fetchHbarTransferCountForUserInQuestWindow(
  wallet: string,
  quest: Quest,
  direction: HbarDirection
): Promise<number> {
  const normalizedWallet = wallet.toLowerCase();
  const { fromTs, toTs } = getTimeWindowForQuest(quest);

  const url = new URL(
    `${MIRROR_BASE_URL.replace(/\/$/, "")}/accounts/${normalizedWallet}`
  );
  url.searchParams.set("transactions", "true");
  url.searchParams.set("order", "desc");
  url.searchParams.set("limit", "100");
  if (fromTs) url.searchParams.append("timestamp", fromTs);
  if (toTs) url.searchParams.append("timestamp", toTs);

  const urlStr = url.toString();
  logger.debug(
    `[QuestEngine] Fetching HBAR transfers for count: ${urlStr} (direction=${direction})`
  );

  const res = await fetch(urlStr);
  if (!res.ok) {
    logger.error(
      `[QuestEngine] Mirror node error ${res.status} ${res.statusText} for ${urlStr}`
    );
    return 0;
  }

  const json = (await res.json()) as {
    account?: string;
    transactions?: {
      transfers?: { account: string; amount: number }[];
    }[];
  };

  const accountId = json.account;
  if (!accountId) return 0;

  let count = 0;

  for (const tx of json.transactions ?? []) {
    for (const tr of tx.transfers ?? []) {
      if (tr.account !== accountId) continue;
      if (tr.amount === 0) continue;

      if (direction === "OUT" && tr.amount < 0) {
        count++;
      } else if (direction === "IN" && tr.amount > 0) {
        count++;
      } else if (direction === "BOTH") {
        count++;
      }
    }
  }

  logger.info(
    `[QuestEngine] HBAR transfer count for ${normalizedWallet} in quest window: ${count} (direction=${direction})`
  );

  return count;
}

async function fetchLpHoldInfoForUser(
  wallet: string
): Promise<{ lpAmount: number; daysHeld: number }> {
  const normalizedWallet = wallet.toLowerCase();

  if (!LP_TOKEN_ID) {
    logger.warn("[QuestEngine] LP token ID not configured (SAUCERSWAP_LP_TOKEN_ID)");
    return { lpAmount: 0, daysHeld: 0 };
  }

  // Use the /accounts/{id}/tokens endpoint (no ?tokens=)
  const url = new URL(
    `${MIRROR_BASE_URL.replace(/\/$/, "")}/accounts/${normalizedWallet}/tokens`
  );
  // optional: you can set limit if you want
  url.searchParams.set("limit", "100");

  const urlStr = url.toString();
  logger.debug(`[QuestEngine] Fetching LP balance for ${normalizedWallet}: ${urlStr}`);

  const res = await fetch(urlStr);
  if (!res.ok) {
    logger.error(
      `[QuestEngine] Mirror node error ${res.status} ${res.statusText} for ${urlStr}`
    );
    return { lpAmount: 0, daysHeld: 0 };
  }

  const json = (await res.json()) as {
    tokens?: {
      token_id: string;
      balance: number;
      associated: boolean;
      created_timestamp?: string;
    }[];
  };

  const rel = (json.tokens || []).find((t) => t.token_id === LP_TOKEN_ID);
  if (!rel || !rel.associated || !rel.balance) {
    return { lpAmount: 0, daysHeld: 0 };
  }

  const balanceTiny = BigInt(rel.balance);
  const divisor = BigInt(10) ** BigInt(LP_DECIMALS);
  const whole = Number(balanceTiny / divisor);
  const frac = Number(balanceTiny % divisor) / Number(divisor);
  const lpAmount = whole + frac;

  let daysHeld = 0;
  if (rel.created_timestamp) {
    const createdMs = Number(parseFloat(rel.created_timestamp) * 1000);
    const nowMs = Date.now();
    const diffDays = (nowMs - createdMs) / (1000 * 60 * 60 * 24);
    daysHeld = diffDays;
  }

  logger.info(
    `[QuestEngine] LP hold info for ${normalizedWallet}: amount=${lpAmount}, daysHeld=${daysHeld}`
  );

  return { lpAmount, daysHeld };
}

async function fetchHbarVolumeForUserInQuestWindow(
  wallet: string,
  quest: Quest
): Promise<number> {
  const normalizedWallet = wallet.toLowerCase();
  const { fromTs, toTs } = getTimeWindowForQuest(quest);

  const url = new URL(`${MIRROR_BASE_URL.replace(/\/$/, "")}/accounts/${normalizedWallet}`);
  url.searchParams.set("transactions", "true");
  url.searchParams.set("order", "desc");
  url.searchParams.set("limit", "100");
  if (fromTs) url.searchParams.append("timestamp", fromTs);
  if (toTs) url.searchParams.append("timestamp", toTs);

  const urlStr = url.toString();
  logger.debug(`[QuestEngine] Fetching account txs for HBAR volume: ${urlStr}`);

  const res = await fetch(urlStr);
  if (!res.ok) {
    logger.error(
      `[QuestEngine] Mirror node error ${res.status} ${res.statusText} for ${urlStr}`
    );
    return 0;
  }

  const json = (await res.json()) as {
    account?: string;
    transactions?: {
      entity_id?: string | null;
      transfers?: { account: string; amount: number }[];
    }[];
  };

  const accountId = json.account;
  if (!accountId) {
    logger.warn(
      `[QuestEngine] No accountId in mirror account response for wallet ${normalizedWallet}`
    );
    return 0;
  }

  let totalTiny = 0n;

  for (const tx of json.transactions ?? []) {
    if (tx.entity_id !== SAUCERSWAP_V2_ROUTER_ID) continue;

    for (const t of tx.transfers ?? []) {
      if (t.account === accountId) {
        // amount can be positive (receive) or negative (send), so we count absolute
        const amt = BigInt(t.amount);
        totalTiny += amt >= 0n ? amt : -amt;
      }
    }
  }

  if (totalTiny === 0n) return 0;

  const divisor = BigInt(10) ** BigInt(HBAR_DECIMALS);
  const whole = Number(totalTiny / divisor);
  const frac = Number(totalTiny % divisor) / Number(divisor);

  const volume = whole + frac;

  logger.info(
    `[QuestEngine] HBAR volume for ${normalizedWallet} (router ${SAUCERSWAP_V2_ROUTER_ID}) during quest window: raw=${totalTiny.toString()} tinybars, volume=${volume} HBAR`
  );

  return volume;
}

async function fetchSaucerSwapContractResultsForUser(
  wallet: string,
  quest: Quest,
  limit = 100
): Promise<MirrorContractResult[]> {
  const normalizedWallet = wallet.toLowerCase();
  const { fromTs, toTs } = getTimeWindowForQuest(quest);

  const url = new URL(`${MIRROR_BASE_URL}/contracts/results`);
  url.searchParams.set("from", normalizedWallet);
  url.searchParams.set("order", "desc");
  url.searchParams.set("limit", String(limit));

  if (fromTs) url.searchParams.append("timestamp", fromTs);
  if (toTs) url.searchParams.append("timestamp", toTs);

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

function checkSeasonLevelAtLeast(
  user: { seasonLevel: number; wallet: string },
  quest: Quest,
  requirement: { type: "SEASON_LEVEL_AT_LEAST"; minLevel: number }
): RequirementCheckResult {
  const minLevel = requirement.minLevel ?? 1;
  const currentLevel = user.seasonLevel ?? 1;

  const met = currentLevel >= minLevel;

  const clampedLevel = Math.max(0, Math.min(currentLevel, minLevel));

  logger.info(
    `[QuestEngine] SEASON_LEVEL_AT_LEAST quest ${quest.id} for ${user["wallet"]}: ` +
      `currentLevel=${currentLevel}, minLevel=${minLevel}, met=${met}`
  );

  return {
    met,
    progress: clampedLevel,
    target: minLevel,
  };
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
        const result = await userMeetsRequirement(user, quest.id, req);
        await updateUserQuestStatus(user.wallet, quest.id, result);
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
  user: { seasonLevel: number; wallet: string },
  questId: number,
  requirement: Requirement
): Promise<RequirementCheckResult> {
  const normalizedWallet = user.wallet.toLowerCase();

  const quest = await prisma.quest.findUnique({ where: { id: questId } });

  switch (requirement.type) {
    case "SWAP_COUNT": {
      if (requirement.protocol !== "saucerswap") {
        logger.warn(
          `[QuestEngine] SWAP_COUNT only implemented for saucerswap, got protocol=${requirement.protocol} (quest ${questId})`
        );
        return { met: false, progress: 0, target: requirement.minCount };
      }

      if (!quest) {
        logger.warn(`[QuestEngine] Quest ${questId} not found in userMeetsRequirement`);
        return { met: false, progress: 0, target: requirement.minCount };
      }

      const results = await fetchSaucerSwapContractResultsForUser(normalizedWallet, quest, 200);

      const swapCount = results.length;
      const target = requirement.minCount;
      const met = swapCount >= requirement.minCount;

      logger.info(
        `[QuestEngine] SWAP_COUNT quest ${questId} for ${normalizedWallet}: count=${swapCount}, min=${requirement.minCount}, met=${met}`
      );

      return { met, progress: swapCount, target };
    }

    case "SWAP_VOLUME": {
      if (requirement.protocol !== "saucerswap") {
        logger.warn(
          `[QuestEngine] SWAP_VOLUME only implemented for saucerswap, got protocol=${requirement.protocol} (quest ${questId})`
        );
        return { met: false, progress: 0, target: requirement.minVolume };
      }

      if (!quest) {
        logger.warn(
          `[QuestEngine] Quest ${questId} not found in SWAP_VOLUME check`
        );
        return { met: false, progress: 0, target: requirement.minVolume };
      }

      const tokenSymbol = (requirement.token || "HBAR").toUpperCase();

      let volume = 0;

      if (tokenSymbol === "HBAR") {
        volume = await fetchHbarVolumeForUserInQuestWindow(
          normalizedWallet,
          quest
        );
      } else {
        logger.warn(
          `[QuestEngine] SWAP_VOLUME for token ${tokenSymbol} not yet implemented`
        );
        volume = 0;
      }

      const target = requirement.minVolume;
      const met = volume >= target;

      logger.info(
        `[QuestEngine] SWAP_VOLUME quest ${questId} for ${normalizedWallet}: volume=${volume} ${tokenSymbol}, minVolume=${requirement.minVolume}, met=${met}`
      );

      return { met, progress: volume, target };
    }

    case "LP_HOLD_DAYS": {
      if (requirement.protocol !== "saucerswap_lp") {
        logger.warn(
          `[QuestEngine] LP_HOLD_DAYS only implemented for protocol=saucerswap_lp, got=${requirement.protocol} (quest ${questId})`
        );
        return { met: false, progress: 0, target: requirement.days };
      }

      if (!quest) {
        logger.warn(
          `[QuestEngine] Quest ${questId} not found in LP_HOLD_DAYS check`
        );
        return { met: false, progress: 0, target: requirement.days };
      }

      const { lpAmount, daysHeld } = await fetchLpHoldInfoForUser(normalizedWallet);

      const hasMinAmount = lpAmount >= requirement.minAmount;
      const met = hasMinAmount && daysHeld >= requirement.days;

      logger.info(
        `[QuestEngine] LP_HOLD_DAYS quest ${questId} for ${normalizedWallet}: lpAmount=${lpAmount}, minAmount=${requirement.minAmount}, daysHeld=${daysHeld}, minDays=${requirement.days}, met=${met}`
      );

      const progressDays = Math.max(0, Math.min(daysHeld, requirement.days));

      return {
        met,
        progress: progressDays,
        target: requirement.days,
      };
    }

    case "HBAR_TRANSFER_COUNT": {
      if (!quest) {
        logger.warn(
          `[QuestEngine] Quest ${questId} not found in HBAR_TRANSFER_COUNT check`
        );
        return { met: false, progress: 0, target: requirement.minCount };
      }

      const direction: HbarDirection =
        (requirement.direction as HbarDirection) || "OUT";

      const count = await fetchHbarTransferCountForUserInQuestWindow(
        normalizedWallet,
        quest,
        direction
      );

      const met = count >= requirement.minCount;

      logger.info(
        `[QuestEngine] HBAR_TRANSFER_COUNT quest ${questId} for ${normalizedWallet}: count=${count}, minCount=${requirement.minCount}, direction=${direction}, met=${met}`
      );

      return {
        met,
        progress: count,
        target: requirement.minCount,
      };
    }

    case "SEASON_LEVEL_AT_LEAST": {
      if (!quest) {
        logger.warn(
          `[QuestEngine] Quest ${questId} not found in HBAR_TRANSFER_COUNT check`
        );
        return { met: false, progress: 0, target: requirement.minLevel };
      }

      if (requirement.type === "SEASON_LEVEL_AT_LEAST" && "minLevel" in requirement) {
        return checkSeasonLevelAtLeast(user, quest, requirement as { type: "SEASON_LEVEL_AT_LEAST"; minLevel: number });
      }

      logger.warn(
        `[QuestEngine] Invalid SEASON_LEVEL_AT_LEAST requirement for quest ${questId}: missing minLevel`
      );
      
      return { met: false, progress: 0, target: 1 };
    }

    default:
      logger.warn(
        `[QuestEngine] Unknown requirement.type "${(requirement as any).type}" for quest ${questId}`
      );
      return { met: false, progress: 0, target: 0 };
  }
}

async function updateUserQuestStatus(
  wallet: string,
  questId: number,
  result: RequirementCheckResult
) {
  const { met, progress, target } = result;

  const normalizedWallet = wallet.toLowerCase();

  const quest = await prisma.quest.findUnique({ where: { id: questId } });
  if (!quest) return;

  const periodKey = getQuestPeriodKey(quest) ?? null;

  const existing = await prisma.userQuest.findUnique({
    where: {
      userWallet_questId: {
        userWallet: normalizedWallet,
        questId,
      },
    },
  });

  const now = new Date();

  const prevProgress = (existing?.progressData as any) || {};
  const newProgress: any = { ...prevProgress };

  const safeTarget = target <= 0 ? 1 : target;
  const completion = Math.max(0, Math.min(1, progress / safeTarget));

  newProgress.progress = progress;
  newProgress.target = target;
  newProgress.completion = completion;
  newProgress.completionPercent = Math.round(completion * 100);

  if (met && periodKey) {
    newProgress.lastCompletedPeriodKey = periodKey;
  }

  if (!existing) {
    await prisma.userQuest.create({
      data: {
        userWallet: normalizedWallet,
        questId,
        status: met ? "COMPLETED" : "IN_PROGRESS",
        lastUpdated: new Date(),
        progressData: newProgress,
      },
    });
    return;
  }

  if (existing.status === "CLAIMED" || existing.status === "EXPIRED") {
    await prisma.userQuest.update({
      where: { id: existing.id },
      data: {
        progressData: newProgress,
        lastUpdated: now,
      },
    });
    return;
  }

  const newStatus = met ? "COMPLETED" : "IN_PROGRESS";
  const completedAt = met ? new Date() : null;

  await prisma.userQuest.update({
    where: { id: existing.id },
    data: {
      status: newStatus,
      lastUpdated: new Date(),
      progressData: newProgress,
      completedAt: completedAt,
    },
  });
}