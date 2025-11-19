import { Router } from "express";
import { prisma } from "../config/prisma";

export const leaderboardRouter = Router();

/**
 * GET /api/leaderboard/season
 * Query params:
 *  - limit (default 50)
 */
leaderboardRouter.get("/season", async (req, res, next) => {
  try {
    const limit = Math.min(Number(req.query.limit) || 50, 200);

    const season = await prisma.season.findFirst({
      where: { isActive: true },
    });

    if (!season) {
      return res.json({
        season: null,
        entries: [],
      });
    }

    const stats = await prisma.userSeasonStats.findMany({
      where: { seasonId: season.id },
      orderBy: [
        { xp: "desc" },
        { userWallet: "asc" },
      ],
      take: limit,
      include: {
        user: true,
      },
    });

    const entries = stats.map((s, index) => ({
      rank: index + 1,
      wallet: s.userWallet,
      xp: s.xp,
      level: s.level,
      badges: s.badges,
      user: {
        wallet: s.user.wallet,
      },
    }));

    res.json({
      season: {
        id: season.id,
        name: season.name,
        slug: season.slug,
        startAt: season.startAt,
        endAt: season.endAt,
      },
      entries,
    });
  } catch (err) {
    next(err);
  }
});