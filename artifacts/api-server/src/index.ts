import app, { httpServer, setupApp } from "./app";
import { logger } from "./lib/logger";

const rawPort = process.env["PORT"];

if (!rawPort) {
  throw new Error("PORT environment variable is required but was not provided.");
}

const port = Number(rawPort);

if (Number.isNaN(port) || port <= 0) {
  throw new Error(`Invalid PORT value: "${rawPort}"`);
}

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
