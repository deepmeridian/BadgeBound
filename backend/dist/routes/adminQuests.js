"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.adminQuestsRouter = void 0;
const express_1 = require("express");
const zod_1 = require("zod");
const logger_1 = __importDefault(require("../config/logger"));
const adminAuth_1 = require("../middleware/adminAuth");
const adminQuestService_1 = require("../services/adminQuestService");
exports.adminQuestsRouter = (0, express_1.Router)();
exports.adminQuestsRouter.use(adminAuth_1.requireAdmin);
const requirementSchema = zod_1.z.record(zod_1.z.string(), zod_1.z.any()); // JSON
const rewardSchema = zod_1.z.record(zod_1.z.string(), zod_1.z.any()); // JSON
const createQuestSchema = zod_1.z.object({
    protocolId: zod_1.z.number().int().optional().nullable(),
    type: zod_1.z.enum(["ONBOARDING", "DAILY", "WEEKLY", "SEASONAL", "ACHIEVEMENT"]),
    title: zod_1.z.string().min(3),
    description: zod_1.z.string().min(3),
    startAt: zod_1.z.string().datetime().optional().nullable(),
    endAt: zod_1.z.string().datetime().optional().nullable(),
    requirement: requirementSchema,
    reward: rewardSchema,
    seasonId: zod_1.z.number().int().optional().nullable(),
    badgeUri: zod_1.z.string().min(3), // URI for NFT metadata
    repeatable: zod_1.z.boolean(),
});
// POST /api/admin/quests
exports.adminQuestsRouter.post("/", async (req, res, next) => {
    try {
        const body = createQuestSchema.parse(req.body);
        const result = await (0, adminQuestService_1.createQuestWithOnChainRegistration)({
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
    }
    catch (err) {
        logger_1.default.error("Error in POST /api/admin/quests:", { error: err.message, stack: err.stack });
        next(err);
    }
});
