// config.js
import dotenv from "dotenv";
dotenv.config();

export const AFFILIATE_BASE_URL =
  process.env.AFFILIATE_BASE_URL || "https://affiliate-network.com";

export const REDIS_URL = process.env.REDIS_URL || "redis://localhost:6379";
