import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";
import * as dotenv from "dotenv";

dotenv.config();

const DEPLOYER_KEY = process.env.DEPLOYER_PRIVATE_KEY;

const config: HardhatUserConfig = {
  solidity: {
    version: "0.8.24",
    settings: { optimizer: { enabled: true, runs: 200 } },
  },
  paths: { sources: "./contracts", tests: "./test", cache: "./cache", artifacts: "./artifacts" },
  networks: {
    localhost: { url: "http://127.0.0.1:8545" },
    ...(DEPLOYER_KEY
      ? {
          sepolia: {
            url: process.env.SEPOLIA_RPC || "https://rpc.ankr.com/eth_sepolia",
            accounts: [DEPLOYER_KEY],
          },
        }
      : {}),
  },
};

export default config;
