"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const node_cron_1 = __importDefault(require("node-cron"));
const questEngineService_1 = require("./services/questEngineService");
const prisma_1 = require("./config/prisma");
const logger_1 = __importDefault(require("./config/logger"));
logger_1.default.info("BadgeBound quest worker starting...");
// Startup
(0, questEngineService_1.updateAllUserQuests)().catch((err) => {
    logger_1.default.error("[QuestWorker] Initial run failed:", { error: err.message, stack: err.stack });
});
// Every 5 minutes
node_cron_1.default.schedule("*/5 * * * *", async () => {
    try {
        await (0, questEngineService_1.updateAllUserQuests)();
    }
    catch (err) {
        logger_1.default.error("[QuestWorker] Scheduled run failed:", { error: err.message, stack: err.stack });
    }
});
// Shutdown
process.on("SIGINT", async () => {
    logger_1.default.info("Stopping quest worker...");
    await prisma_1.prisma.$disconnect();
    process.exit(0);
});
process.on("SIGTERM", async () => {
    logger_1.default.info("Stopping quest worker...");
    await prisma_1.prisma.$disconnect();
    process.exit(0);
});
