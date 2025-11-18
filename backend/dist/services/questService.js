"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getActiveQuests = getActiveQuests;
exports.getUserQuests = getUserQuests;
const prisma_1 = require("../config/prisma");
async function getActiveQuests() {
    return prisma_1.prisma.quest.findMany({
        where: {
            isActive: true,
            OR: [
                { startAt: null },
                { startAt: { lte: new Date() } }
            ],
            AND: [
                { endAt: null },
                { endAt: { gte: new Date() } }
            ]
        },
        orderBy: { id: "asc" },
    });
}
async function getUserQuests(wallet) {
    const normalizedWallet = wallet.toLowerCase();
    await prisma_1.prisma.user.upsert({
        where: { wallet: normalizedWallet },
        create: { wallet: normalizedWallet },
        update: { lastSeenAt: new Date() },
    });
    return prisma_1.prisma.userQuest.findMany({
        where: { userWallet: normalizedWallet },
        include: { quest: true },
        orderBy: { questId: "asc" },
    });
}
