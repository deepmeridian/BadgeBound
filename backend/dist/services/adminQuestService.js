"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createQuestWithOnChainRegistration = createQuestWithOnChainRegistration;
const ethers_1 = require("ethers");
const prisma_1 = require("../config/prisma");
const env_1 = require("../config/env");
const QUEST_BADGES_ADMIN_ABI = [
    // registerQuest(uint256 questId, string name, string description, string uri, bool repeatable)
    "function registerQuest(uint256 questId, string name, string description, string uri, bool repeatable) external",
];
function getAdminContractSigner() {
    if (!env_1.config.questBadgesAddress) {
        throw new Error("QuestBadges address is not configured");
    }
    if (!env_1.config.hederaPrivateKey) {
        throw new Error("Hedera private key is not configured");
    }
    const provider = new ethers_1.ethers.JsonRpcProvider(env_1.config.hederaRpcUrl);
    const wallet = new ethers_1.ethers.Wallet(env_1.config.hederaPrivateKey, provider);
    const contract = new ethers_1.ethers.Contract(env_1.config.questBadgesAddress, QUEST_BADGES_ADMIN_ABI, wallet);
    return { contract, wallet, provider };
}
/**
 * Creates a quest in the DB and registers it on-chain in QuestBadges.
 * Uses the auto-increment quest.id as questId on-chain to keep them aligned.
 */
async function createQuestWithOnChainRegistration(input) {
    // Create quest in DB
    const quest = await prisma_1.prisma.quest.create({
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
    const tx = await contract.registerQuest(questId, input.title, input.description, input.badgeUri, input.repeatable);
    const receipt = await tx.wait();
    return {
        quest,
        txHash: receipt?.hash,
    };
}
