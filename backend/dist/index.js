"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const env_1 = require("./config/env");
const logger_1 = __importDefault(require("./config/logger"));
const httpLogging_1 = require("./middleware/httpLogging");
const health_1 = require("./routes/health");
const quests_1 = require("./routes/quests");
const adminQuests_1 = require("./routes/adminQuests");
const app = (0, express_1.default)();
app.use((0, cors_1.default)());
app.use(express_1.default.json());
// Add HTTP logging middleware
app.use(httpLogging_1.httpLoggingMiddleware);
app.use("/health", health_1.healthRouter);
app.use("/api/quests", quests_1.questsRouter);
app.use("/api/admin/quests", adminQuests_1.adminQuestsRouter);
app.use((err, _req, res, _next) => {
    logger_1.default.error(`Unhandled error: ${err.message}`, { error: err.stack });
    res.status(500).json({ error: "Internal server error" });
});
app.listen(env_1.config.port, () => {
    logger_1.default.info(`BadgeBound backend listening on port ${env_1.config.port}`);
});
