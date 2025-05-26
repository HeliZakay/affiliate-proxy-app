// routes.js
import { Router } from "express";
import { nanoid } from "nanoid";
import redisClient from "./redisClient.js";
import { AFFILIATE_BASE_URL, API_KEY } from "./config.js";
import logger from "./logger.js";
import { validateRedirect } from "./validation.js";

// Middleware to enforce API key
function apiKeyAuth(req, res, next) {
  const key = req.get("x-api-key") || req.query.api_key;
  if (!key || key !== API_KEY) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  next();
}

const router = new Router();

// Health endpoint
router.get("/health", async (req, res) => {
  logger.info({ route: "/health" }, "Health check requested");
  try {
    const pong = await redisClient.ping();
    if (pong !== "PONG") throw new Error("Redis did not respond with PONG");
    return res.json({ status: "ok" });
  } catch (err) {
    logger.error({ err }, "Health check failed");
    return res.status(503).json({ status: "error", details: err.message });
  }
});

// Redirect endpoint
router.get("/", validateRedirect, async (req, res) => {
  const { keyword, src, creative, refresh } = req.query;
  logger.info({ keyword, src, creative, refresh }, "Redirect request received");

  if (!keyword || !src || !creative) {
    logger.warn({ keyword, src, creative }, "Missing required parameters");
    return res.status(400).send("Missing required parameters");
  }

  const compositeKey = `map:${keyword}:${src}:${creative}`;
  const entry = await redisClient.hGetAll(compositeKey);
  let ourParam = entry && entry.our_param;

  // Only reuse if there *is* an existing our_param and no refresh flag
  if (!ourParam || refresh === "true") {
    ourParam = nanoid(10);
    const revKey = `rev:${ourParam}`;
    const now = new Date().toISOString();
    const payload = JSON.stringify({ keyword, src, creative });

    // Store forward mapping + timestamp
    await redisClient.hSet(compositeKey, {
      our_param: ourParam,
      created_at: now,
    });

    // Store reverse mapping + timestamp
    await redisClient.hSet(revKey, {
      payload,
      created_at: now,
    });

    logger.info(
      { compositeKey, ourParam, created_at: now },
      "Generated new mapping"
    );
  } else {
    logger.info({ compositeKey, ourParam }, "Using existing mapping");
  }

  const redirectUrl = `${AFFILIATE_BASE_URL}?our_param=${ourParam}`;
  return res.redirect(302, redirectUrl);
});

// Retrieval endpoint
router.get("/retrieve_original", apiKeyAuth, async (req, res) => {
  const { our_param } = req.query;
  logger.info({ our_param }, "Retrieve_original request received");

  if (!our_param) {
    logger.warn({ our_param }, "Missing our_param");
    return res.status(400).json({ error: "our_param is required" });
  }

  const revKey = `rev:${our_param}`;
  let entry;
  try {
    entry = await redisClient.hGetAll(revKey);
  } catch (err) {
    logger.error({ err, revKey }, "Error fetching reverse mapping");
    return res.status(500).json({ error: "Internal server error" });
  }

  if (!entry || !entry.payload) {
    logger.warn({ revKey }, "Mapping not found");
    return res.status(404).json({ error: "Mapping not found" });
  }

  try {
    const { keyword, src, creative } = JSON.parse(entry.payload);
    logger.info(
      { our_param, keyword, src, creative },
      "Successfully retrieved mapping"
    );
    return res.json({ keyword, src, creative, created_at: entry.created_at });
  } catch (e) {
    logger.error({ err: e, entry }, "Error parsing payload");
    return res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
