// app.js
import express from "express";
import router from "./routes.js";
import logger from "./logger.js";

const app = express();

// Request logging middleware
app.use((req, res, next) => {
  logger.info(
    { method: req.method, path: req.path, query: req.query },
    "Incoming request"
  );
  next();
});

app.use(express.json());
app.use("/", router);

// Error-handling middleware
app.use((err, req, res, next) => {
  logger.error({ err, method: req.method, path: req.path }, "Unhandled error");
  res.status(500).json({ error: "Internal server error" });
});

export default app;
