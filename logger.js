// logger.js
import pino from "pino";

const logger = pino(
  process.env.NODE_ENV === "development"
    ? { transport: { target: "pino-pretty" } }
    : {}
);

export default logger;
