"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateAllUserQuests = updateAllUserQuests;
const prisma_1 = require("../config/prisma");
const logger_1 = __importDefault(require("../config/logger"));
const MIRROR_BASE = process.env.HEDERA_MIRROR_URL || "https://testnet.mirrornode.hedera.com/api/v1";
/**
 * Update quest statuses for all users for all active quests.
 */
async function updateAllUserQuests() {
    logger_1.default.info(`[QuestEngine] Running update at ${new Date().toISOString()}`);
    const activeQuests = await prisma_1.prisma.quest.findMany({
        where: {
            isActive: true,
            OR: [{ startAt: null }, { startAt: { lte: new Date() } }],
            AND: [{ endAt: null }, { endAt: { gte: new Date() } }],
        },
    });
    const users = await prisma_1.prisma.user.findMany();
    for (const quest of activeQuests) {
        const req = quest.requirement;
        logger_1.default.info(`[QuestEngine] Evaluating quest ${quest.id} (${quest.title}) for ${users.length} users`);
        for (const user of users) {
            try {
                const meets = await userMeetsRequirement(user.wallet, quest.id, req);
                await updateUserQuestStatus(user.wallet, quest.id, meets);
            }
            catch (err) {
                logger_1.default.error(`[QuestEngine] Error evaluating quest ${quest.id} for user ${user.wallet}`, { error: err.message, stack: err.stack });
            }
        }
    }
    logger_1.default.info("[QuestEngine] Update cycle finished");
}
// Check if user meets the quest requirement
async function userMeetsRequirement(wallet, questId, requirement) {
    switch (requirement.type) {
        case "SWAP_VOLUME":
            // TODO: Query mirror node for swaps involving this wallet on relevant DEX contract
            // Example skeleton:
            // const url = `${MIRROR_BASE}/transactions?account.id=${wallet}&limit=100`;
            // const res = await fetch(url);
            // const data = await res.json();
            // parse and sum volumes, then compare with requirement.minVolume;
            logger_1.default.debug(`[QuestEngine] [TODO] Check SWAP_VOLUME for wallet ${wallet}, quest ${questId}`);
            return false;
        case "LP_HOLD_DAYS":
            // TODO: Query mirror node / token balances for LP token, see if user holds >= minAmount for >= days
            logger_1.default.debug(`[QuestEngine] [TODO] Check LP_HOLD_DAYS for wallet ${wallet}, quest ${questId}`);
            return false;
        case "STAKE_MIN_AMOUNT":
            // TODO: Query staking contract / mirror node to see if user has >= minAmount staked
            logger_1.default.debug(`[QuestEngine] [TODO] Check STAKE_MIN_AMOUNT for wallet ${wallet}, quest ${questId}`);
            return false;
        default:
            logger_1.default.warn(`[QuestEngine] Unknown requirement.type "${requirement.type}" for quest ${questId}`);
            return false;
    }
}
async function updateUserQuestStatus(wallet, questId, meetsRequirement) {
    const normalizedWallet = wallet.toLowerCase();
    const existing = await prisma_1.prisma.userQuest.findUnique({
        where: {
            userWallet_questId: {
                userWallet: normalizedWallet,
                questId,
            },
        },
    });
    if (!existing) {
        await prisma_1.prisma.userQuest.create({
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
    await prisma_1.prisma.userQuest.update({
        where: { id: existing.id },
        data: {
            status: newStatus,
            lastUpdated: new Date(),
        },
    });
}
