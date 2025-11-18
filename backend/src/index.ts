import express from "express";
import cors from "cors";
import { config } from "./config/env";
import logger from "./config/logger";
import { httpLoggingMiddleware } from "./middleware/httpLogging";
import { healthRouter } from "./routes/health";
import { questsRouter } from "./routes/quests";
import { adminQuestsRouter } from "./routes/adminQuests";
import { adminProtocolsRouter } from "./routes/adminProtocols";

const app = express();

app.use(cors());
app.use(express.json());

// Add HTTP logging middleware
app.use(httpLoggingMiddleware);

app.use("/health", healthRouter);
app.use("/api/quests", questsRouter);
app.use("/api/admin/quests", adminQuestsRouter);
app.use("/api/admin/protocols", adminProtocolsRouter);

app.use(
  (err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    logger.error(`Unhandled error: ${err.message}`, { error: err.stack });
    res.status(500).json({ error: "Internal server error" });
  }
);

app.listen(config.port, () => {
  logger.info(`BadgeBound backend listening on port ${config.port}`);
});