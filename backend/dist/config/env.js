"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.config = void 0;
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
exports.config = {
    port: parseInt(process.env.PORT || "4000", 10),
    nodeEnv: process.env.NODE_ENV || "development",
    dbUrl: process.env.DATABASE_URL,
    hederaRpcUrl: process.env.HEDERA_RPC_URL || "https://testnet.hashio.io/api",
    questBadgesAddress: process.env.QUEST_BADGES_ADDRESS || "",
    hederaPrivateKey: process.env.HEDERA_PRIVATE_KEY || "",
    adminApiKey: process.env.ADMIN_API_KEY || "",
};
