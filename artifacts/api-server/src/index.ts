// STARTUP ORDER matters: parseEnv() validates every env var the app
// reads and calls process.exit(1) on failure. It runs BEFORE we import
// anything with side effects (app.ts opens the DB pool, configures
// Passport, etc.) so a misconfigured deployment fails fast with a clear
// error instead of crashing mid-request.
import { parseEnv } from "./lib/env";
const env = parseEnv();

import app, { httpServer, setupApp } from "./app";
import { logger } from "./lib/logger";

const port = env.PORT;

(async () => {
  await setupApp();

  httpServer.on("error", (err: NodeJS.ErrnoException) => {
    if (err.code === "EADDRINUSE") {
      logger.warn({ port }, "Port already in use — standby mode");
      setInterval(() => {}, 60_000);
      return;
    }
    throw err;
  });

  httpServer.listen({ port, host: "0.0.0.0" }, () => {
    logger.info({ port }, "Server listening");
  });

  // Graceful shutdown — drain connections before exit
  const shutdown = (signal: string) => {
    logger.info({ signal }, "Shutdown signal received, draining connections...");
    httpServer.close(() => {
      logger.info("Server closed gracefully");
      process.exit(0);
    });
    // Force exit after 10s if connections don't drain
    setTimeout(() => {
      logger.warn("Forcing shutdown after timeout");
      process.exit(1);
    }, 10_000);
  };
  process.on("SIGTERM", () => shutdown("SIGTERM"));
  process.on("SIGINT", () => shutdown("SIGINT"));
})();
