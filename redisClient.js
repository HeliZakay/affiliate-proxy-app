// redisClient.js
import { createClient } from "redis";
import { REDIS_URL } from "./config.js";
import logger from "./logger.js";

// Initialize Redis client
const redisClient = createClient({ url: REDIS_URL });

redisClient.on("error", (err) => {
  logger.error({ err }, "Redis Client Error");
});

redisClient.on("connect", () => {
  logger.info({ url: REDIS_URL }, "Redis client connecting");
});

redisClient.on("ready", () => {
  logger.info("Redis client ready");
});

await redisClient.connect();

export default redisClient;
