import type { Request } from "express";
import { ZodError } from "zod";
import { logger } from "./logger";

/**
 * Standard route-error logger. Used by every catch block in the route
 * layer so the operational log has uniform shape regardless of which
 * file the error originated in.
 *
 * The shape captures:
 *   - err  : full Error object (pino serialises message + stack)
 *   - path : the request path that failed
 *   - method : HTTP verb (helps distinguish GET-failures from POST-failures
 *              on the same URL)
 *   - userId : the authed user's id, if any (anonymous on guest endpoints)
 *   - context : a free-form short string identifying which operation failed
 *               (e.g. "create chapter", "update profile")
 *
 * Why this exists: 67 silent catches across 9 route files were swallowing
 * DB / external-service errors without any structured log, leaving the
 * operational team blind to backend failures despite users seeing 500s.
 * The companion global Express error middleware at app.ts already handles
 * propagated errors; this helper is for the catches that intentionally
 * own the error response (custom 500 message that doesn't leak DB
 * details to the client).
 *
 * PII: pino redacts the same keys Sentry does (configured at logger init).
 * The error object itself can contain stack traces with closure variables
 * — that's by design, the same data the global middleware already logs.
 */
export function logRouteError(
  req: Pick<Request, "path" | "method" | "user">,
  err: unknown,
  context: string,
): void {
  // ZodError = client validation failure, not a server error. Routes
  // that catch ZodError typically respond 400 with the field-level
  // message; logging at error level would pollute alert thresholds.
  // The 4xx side of the response chain is a client signal, not an
  // operational one.
  if (err instanceof ZodError) return;
  const userId = (req.user as any)?.id;
  logger.error(
    {
      err,
      path: req.path,
      method: req.method,
      userId,
    },
    context,
  );
}
