// server.js
import app from "./app.js";
import logger from "./logger.js";

const PORT = process.env.PORT || 3000;
const server = app.listen(PORT, () => {
  logger.info({ port: PORT }, "Server started and listening");
});

// Promisify server.close()
function closeServer() {
  return new Promise((resolve, reject) => {
    server.close((err) => (err ? reject(err) : resolve()));
  });
}

const shutdown = async () => {
  logger.info("Shutdown initiated");

  try {
    // Stop accepting new connections, wait for ongoing ones to finish
    await closeServer();
    logger.info("HTTP server closed");

    // Gracefully quit Redis
    const { default: redisClient } = await import("./redisClient.js");
    await redisClient.quit();
    logger.info("Redis client disconnected");

    process.exit(0);
  } catch (err) {
    logger.error({ err }, "Error during shutdown");
    process.exit(1);
  }
};

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);

// Global error handlers
process.on("unhandledRejection", (reason) => {
  logger.error({ reason }, "Unhandled Promise Rejection");
});

process.on("uncaughtException", (err) => {
  logger.error({ err }, "Uncaught Exception");
  process.exit(1);
});
