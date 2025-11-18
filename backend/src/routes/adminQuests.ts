import { Router } from "express";
import { z } from "zod";
import logger from "../config/logger";
import { requireAdmin } from "../middleware/adminAuth";
import { createQuestWithOnChainRegistration } from "../services/adminQuestService";

export const adminQuestsRouter = Router();

adminQuestsRouter.use(requireAdmin);

const requirementSchema = z.record(z.string(), z.any()); // JSON
const rewardSchema = z.record(z.string(), z.any());      // JSON

const createQuestSchema = z.object({
  protocolId: z.number().int().optional().nullable(),
  type: z.enum(["ONBOARDING", "DAILY", "WEEKLY", "SEASONAL", "ACHIEVEMENT"]),
  title: z.string().min(3),
  description: z.string().min(3),
  startAt: z.string().datetime().optional().nullable(),
  endAt: z.string().datetime().optional().nullable(),
  requirement: requirementSchema,
  reward: rewardSchema,
  seasonId: z.number().int().optional().nullable(),
  badgeUri: z.string().min(3),      // URI for NFT metadata
  repeatable: z.boolean(),
});

// POST /api/admin/quests
adminQuestsRouter.post("/", async (req, res, next) => {
  try {
    const body = createQuestSchema.parse(req.body);

    const result = await createQuestWithOnChainRegistration({
      protocolId: body.protocolId ?? null,
      type: body.type,
      title: body.title,
      description: body.description,
      startAt: body.startAt ? new Date(body.startAt) : null,
      endAt: body.endAt ? new Date(body.endAt) : null,
      requirement: body.requirement,
      reward: body.reward,
      seasonId: body.seasonId ?? null,
      badgeUri: body.badgeUri,
      repeatable: body.repeatable,
    });

    res.status(201).json({
      success: true,
      quest: result.quest,
      txHash: result.txHash,
    });
  } catch (err: any) {
    logger.error("Error in POST /api/admin/quests:", { error: err.message, stack: err.stack });
    next(err);
  }
});