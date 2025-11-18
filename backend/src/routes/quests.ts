import { Router } from "express";
import { z } from "zod";
import logger from "../config/logger";
import { getActiveQuests, getUserQuests } from "../services/questService";
import { claimBadgeForUser } from "../services/badgeService";

export const questsRouter = Router();

// GET /api/quests
questsRouter.get("/", async (_req, res, next) => {
  try {
    const quests = await getActiveQuests();
    res.json(quests);
  } catch (err) {
    next(err);
  }
});

// GET /api/quests/:wallet
// User-specific view (with status)
questsRouter.get("/:wallet", async (req, res, next) => {
  try {
    const schema = z.string().min(5);
    const wallet = schema.parse(req.params.wallet);
    const userQuests = await getUserQuests(wallet);
    res.json(userQuests);
  } catch (err) {
    next(err);
  }
});

// POST /api/quests/:questId/claim
// body: { wallet: string }
questsRouter.post("/:questId/claim", async (req, res, next) => {
  try {
    const walletSchema = z.string().min(5);
    const bodySchema = z.object({
      wallet: walletSchema,
    });

    const questId = Number(req.params.questId);
    if (Number.isNaN(questId) || questId <= 0) {
      return res.status(400).json({ error: "Invalid questId" });
    }

    const { wallet } = bodySchema.parse(req.body);

    const result = await claimBadgeForUser(wallet, questId);

    res.json({
      success: true,
      questId,
      wallet,
      txHash: result.txHash,
      tokenId: result.tokenId,
    });
  } catch (err: any) {
    logger.error("Error in POST /api/quests/:questId/claim:", { error: err.message, stack: err.stack });
    if (err.message === "User quest not found") {
      return res.status(404).json({ error: err.message });
    }
    if (err.message === "Quest is not in COMPLETED status") {
      return res.status(400).json({ error: err.message });
    }
    next(err);
  }
});