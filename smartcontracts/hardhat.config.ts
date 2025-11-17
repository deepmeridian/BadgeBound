import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";
import * as dotenv from "dotenv";
dotenv.config();

const rawKey = process.env.HEDERA_PRIVATE_KEY?.trim() || "";

const hederaAccounts =
  rawKey.startsWith("0x") && rawKey.length >= 66 // 0x + 64 hex chars
    ? [rawKey]
    : [];

const config: HardhatUserConfig = {
  solidity: "0.8.28",
  networks: {
    hardhat: {},
    hederaTestnet: {
      url: process.env.HEDERA_RPC_URL || "https://testnet.hashio.io/api",
      accounts: hederaAccounts,
    },
    hederaMainnet: {
      url: process.env.HEDERA_RPC_URL_MAINNET || "https://mainnet.hashio.io/api",
      accounts: hederaAccounts,
    },
  },
};

export default config;
