import cron from "node-cron";
import { updateAllUserQuests } from "./services/questEngineService";
import { prisma } from "./config/prisma";
import logger from "./config/logger";

logger.info("BadgeBound quest worker starting...");

// Startup
updateAllUserQuests().catch((err) => {
  logger.error("[QuestWorker] Initial run failed:", { error: err.message, stack: err.stack });
});

// Every 5 minutes
cron.schedule("*/5 * * * *", async () => {
  try {
    await updateAllUserQuests();
  } catch (err: any) {
    logger.error("[QuestWorker] Scheduled run failed:", { error: err.message, stack: err.stack });
  }
});

// Shutdown
process.on("SIGINT", async () => {
  logger.info("Stopping quest worker...");
  await prisma.$disconnect();
  process.exit(0);
});

process.on("SIGTERM", async () => {
  logger.info("Stopping quest worker...");
  await prisma.$disconnect();
  process.exit(0);
});