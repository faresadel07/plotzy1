import type { Request, Response, NextFunction } from "express";
import { db } from "../db";
import { apiLogs } from "../../../../lib/db/src/schema";

// ---------------------------------------------------------------------------
// API Logger Middleware
//
// Records method, path, status code, and response time for every /api request
// into the api_logs table.  The admin System Health dashboard reads from this.
//
// Sampling: logs 100% of requests.  If traffic grows, add a sample rate.
// ---------------------------------------------------------------------------

export function apiLogger(req: Request, res: Response, next: NextFunction) {
  // Only log API routes
  if (!req.path.startsWith("/api")) return next();

  const start = Date.now();

  res.on("finish", () => {
    const durationMs = Date.now() - start;
    const userId = (req as any).user?.id ?? null;

    // Normalize path: replace numeric segments with :id so we can aggregate
    const normalizedPath = req.path.replace(/\/\d+/g, "/:id");

    // Fire-and-forget — never block the response
    db.insert(apiLogs)
      .values({
        method: req.method,
        path: normalizedPath,
        statusCode: res.statusCode,
        durationMs,
        userId,
      })
      .catch(() => { /* non-blocking — never crash the request for logging failures */ });
  });

  next();
}
