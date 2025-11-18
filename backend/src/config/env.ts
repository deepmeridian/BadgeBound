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
  SAUCERSWAP_LP_TOKEN_ID: process.env.SAUCERSWAP_LP_TOKEN_ID || "0.0.1310436",
  SAUCERSWAP_LP_DECIMALS: parseInt(process.env.SAUCERSWAP_LP_DECIMALS || "0", 10),
  usdcTestnetTokenId: process.env.USDC_TESTNET_TOKEN_ID || "0.0.4760196",
  usdcDecimals: parseInt(process.env.USDC_DECIMALS || "6", 10),
};