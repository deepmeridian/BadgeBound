import { prisma } from "../config/prisma";

export async function getActiveQuests() {
  const now = new Date();

  return prisma.quest.findMany({
    where: {
      isActive: true,
      AND: [
        {
          OR: [
            { startAt: null },
            { startAt: { lte: now } }
          ]
        },
        {
          OR: [
            { endAt: null },
            { endAt: { gte: now } }
          ]
        }
      ]
    },
    orderBy: { id: "asc" },
  });
}

export async function getUserQuests(wallet: string) {
  const normalizedWallet = wallet.toLowerCase();
  
  await prisma.user.upsert({
    where: { wallet: normalizedWallet },
    create: { wallet: normalizedWallet },
    update: { lastSeenAt: new Date() },
  });

  return prisma.userQuest.findMany({
    where: { userWallet: normalizedWallet },
    include: { quest: true },
    orderBy: { questId: "asc" },
  });
}