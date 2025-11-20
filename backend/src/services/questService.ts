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

  const activeSeason = await prisma.season.findFirst({
    where: { isActive: true },
    select: { id: true }
  });

  if (activeSeason) {
    await prisma.userSeasonStats.upsert({
      where: { 
        seasonId_userWallet: { 
          seasonId: activeSeason.id,
          userWallet: normalizedWallet 
        } 
      },
      create: { seasonId: activeSeason.id, userWallet: normalizedWallet },
      update: {},
    });
  }

  return prisma.userQuest.findMany({
    where: { userWallet: normalizedWallet },
    include: { quest: true },
    orderBy: { questId: "asc" },
  });
}