import { prisma } from "../config/prisma";

export async function getSeasons() {
  return prisma.season.findMany({
    orderBy: { id: "asc" },
  });
}

export type CreateSeasonInput = {
  name: string;
  slug: string;
  startAt?: Date | null;
  endAt?: Date | null;
};

export async function createSeason(input: CreateSeasonInput) {
  return prisma.season.create({ data: input });
}

export type UpdateSeasonInput = Partial<CreateSeasonInput> & {
  isActive?: boolean;
};

export async function updateSeason(id: number, input: UpdateSeasonInput) {
  return prisma.season.update({
    where: { id },
    data: {
      ...(input.name !== undefined ? { name: input.name } : {}),
      ...(input.slug !== undefined ? { slug: input.slug } : {}),
      ...(input.startAt !== undefined ? { startAt: input.startAt } : {}),
      ...(input.endAt !== undefined ? { endAt: input.endAt } : {}),
      ...(input.isActive !== undefined ? { isActive: input.isActive } : {}),
    },
  });
}

/**
 * Activate the season:
 * - mark all other seasons inactive
 * - mark this season active
 * - reset User.seasonXp / seasonLevel
 * - upsert UserSeasonStats row for every user for this season (0 XP / level 1)
 */
export async function activateSeason(id: number) {
  return prisma.$transaction(async (tx) => {
    const season = await tx.season.findUnique({ where: { id } });
    if (!season) throw new Error("Season not found");

    await tx.season.updateMany({
      where: { id: { not: id } },
      data: { isActive: false },
    });

    const updatedSeason = await tx.season.update({
      where: { id },
      data: {
        isActive: true,
        startAt: season.startAt ?? new Date(),
      },
    });

    // reset user season stats
    await tx.user.updateMany({
      data: {
        seasonXp: 0,
        seasonLevel: 1,
      },
    });

    // ensure season stats rows exist
    const users = await tx.user.findMany();
    for (const u of users) {
      await tx.userSeasonStats.upsert({
        where: {
          seasonId_userWallet: {
            seasonId: id,
            userWallet: u.wallet.toLowerCase(),
          },
        },
        update: {
          xp: 0,
          level: 1,
          badges: 0,
        },
        create: {
          seasonId: id,
          userWallet: u.wallet.toLowerCase(),
          xp: 0,
          level: 1,
          badges: 0,
        },
      });
    }

    return updatedSeason;
  });
}

/** Get current active season */
export async function getActiveSeason() {
  return prisma.season.findFirst({
    where: { isActive: true },
  });
}