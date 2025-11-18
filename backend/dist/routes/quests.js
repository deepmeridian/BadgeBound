"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.questsRouter = void 0;
const express_1 = require("express");
const zod_1 = require("zod");
const logger_1 = __importDefault(require("../config/logger"));
const questService_1 = require("../services/questService");
const badgeService_1 = require("../services/badgeService");
exports.questsRouter = (0, express_1.Router)();
// GET /api/quests
exports.questsRouter.get("/", async (_req, res, next) => {
    try {
        const quests = await (0, questService_1.getActiveQuests)();
        res.json(quests);
    }
    catch (err) {
        next(err);
    }
});
// GET /api/quests/:wallet
// User-specific view (with status)
exports.questsRouter.get("/:wallet", async (req, res, next) => {
    try {
        const schema = zod_1.z.string().min(5);
        const wallet = schema.parse(req.params.wallet);
        const userQuests = await (0, questService_1.getUserQuests)(wallet);
        res.json(userQuests);
    }
    catch (err) {
        next(err);
    }
});
// POST /api/quests/:questId/claim
// body: { wallet: string }
exports.questsRouter.post("/:questId/claim", async (req, res, next) => {
    try {
        const walletSchema = zod_1.z.string().min(5);
        const bodySchema = zod_1.z.object({
            wallet: walletSchema,
        });
        const questId = Number(req.params.questId);
        if (Number.isNaN(questId) || questId <= 0) {
            return res.status(400).json({ error: "Invalid questId" });
        }
        const { wallet } = bodySchema.parse(req.body);
        const result = await (0, badgeService_1.claimBadgeForUser)(wallet, questId);
        res.json({
            success: true,
            questId,
            wallet,
            txHash: result.txHash,
            tokenId: result.tokenId,
        });
    }
    catch (err) {
        logger_1.default.error("Error in POST /api/quests/:questId/claim:", { error: err.message, stack: err.stack });
        if (err.message === "User quest not found") {
            return res.status(404).json({ error: err.message });
        }
        if (err.message === "Quest is not in COMPLETED status") {
            return res.status(400).json({ error: err.message });
        }
        next(err);
    }
});
