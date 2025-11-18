import dotenv from "dotenv";
dotenv.config();

export const config = {
  port: parseInt(process.env.PORT || "4000", 10),
  nodeEnv: process.env.NODE_ENV || "development",
  dbUrl: process.env.DATABASE_URL!,
  hederaRpcUrl: process.env.HEDERA_RPC_URL || "https://testnet.hashio.io/api",
  questBadgesAddress: process.env.QUEST_BADGES_ADDRESS || "",
  hederaPrivateKey: process.env.HEDERA_PRIVATE_KEY || "",
  adminApiKey: process.env.ADMIN_API_KEY || "",
  hederaMirrorUrl: process.env.HEDERA_MIRROR_URL || "https://testnet.mirrornode.hedera.com/api/v1",
  SAUCERSWAP_V2_ROUTER_ID: process.env.SAUCERSWAP_V2_ROUTER_ID || "0.0.1414040",
};