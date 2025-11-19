import { Router } from "express";
import { z } from "zod";
import logger from "../config/logger";
import { requireAdmin } from "../middleware/adminAuth";
import { createQuestWithOnChainRegistration, updateQuest } from "../services/adminQuestService";

export const adminQuestsRouter = Router();

adminQuestsRouter.use(requireAdmin);

// Schemas

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

const updateQuestSchema = z.object({
  title: z.string().min(2).optional(),
  description: z.string().optional(),
  isActive: z.boolean().optional(),
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

// PUT /api/admin/quests/:id -> update
adminQuestsRouter.put("/:id", async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    if (Number.isNaN(id)) {
      return res.status(400).json({ error: "Invalid id" });
    }

    const body = updateQuestSchema.parse(req.body);

    const quest = await updateQuest(id, {
      title: body.title,
      description: body.description,
      isActive: body.isActive,
    });

    res.json(quest);
  } catch (err: any) {
    if (err.code === "P2025") {
      // Prisma "record not found"
      return res.status(404).json({ error: "Quest not found" });
    }
    next(err);
  }
});