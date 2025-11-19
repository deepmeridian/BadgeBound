"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.claimBadgeForUser = claimBadgeForUser;
const ethers_1 = require("ethers");
const prisma_1 = require("../config/prisma");
const env_1 = require("../config/env");
const QUEST_BADGES_ABI = [
    // mintBadge(address to, uint256 questId)
    "function mintBadge(address to, uint256 questId) external returns (uint256)",
    // event BadgeMinted(address indexed to, uint256 indexed tokenId, uint256 indexed questId)
    "event BadgeMinted(address indexed to, uint256 indexed tokenId, uint256 indexed questId)",
];
function getContractSigner() {
    if (!env_1.config.questBadgesAddress) {
        throw new Error("QuestBadges address is not configured");
    }
    if (!env_1.config.hederaPrivateKey) {
        throw new Error("Hedera private key is not configured");
    }
    const provider = new ethers_1.ethers.JsonRpcProvider(env_1.config.hederaRpcUrl);
    const wallet = new ethers_1.ethers.Wallet(env_1.config.hederaPrivateKey, provider);
    const contract = new ethers_1.ethers.Contract(env_1.config.questBadgesAddress, QUEST_BADGES_ABI, wallet);
    return { contract, wallet, provider };
}
/**
 * Mints a badge for a user and updates DB status to CLAIMED.
 * Returns tx hash and tokenId if we can parse it.
 */
async function claimBadgeForUser(walletAddress, questId) {
    // Normalize address
    const to = ethers_1.ethers.getAddress(walletAddress);
    // Ensure user_quest is COMPLETED
    const userQuest = await prisma_1.prisma.userQuest.findUnique({
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
    const { contract } = getContractSigner();
    // Call the contract
    const tx = await contract.mintBadge(to, questId);
    const receipt = await tx.wait();
    // Try to parse the BadgeMinted event
    let tokenId = null;
    if (receipt && receipt.logs) {
        for (const log of receipt.logs) {
            try {
                const parsed = contract.interface.parseLog(log);
                if (parsed && parsed.name === "BadgeMinted") {
                    tokenId = parsed.args.tokenId;
                    break;
                }
            }
            catch {
                // ToDo: Log parsing failed, continue
            }
        }
    }
    // Update user_quests status to CLAIMED
    await prisma_1.prisma.userQuest.update({
        where: { id: userQuest.id },
        data: {
            status: "CLAIMED",
            claimedAt: new Date(),
            lastUpdated: new Date(),
            progressData: {
                ...userQuest.progressData,
                badgeTxHash: receipt?.hash,
                badgeTokenId: tokenId ? tokenId.toString() : undefined,
            },
        },
    });
    return {
        txHash: receipt?.hash,
        tokenId: tokenId ? tokenId.toString() : null,
    };
}
