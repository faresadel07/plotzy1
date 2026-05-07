import type { Request } from "express";
import { db } from "../db";
import { adminAuditLogs } from "../../../../lib/db/src/schema";
import { logger } from "./logger";

/**
 * Append a row to admin_audit_logs.
 *
 * Failure-tolerant — audit-write errors are logged but never thrown.
 * The main operation (a password reset, a cert issuance, a tier
 * change) must always succeed even if the audit insert fails for
 * transient reasons (DB blip, partial Neon outage). Losing one audit
 * row is recoverable; rolling back the user-visible op because of it
 * is not.
 *
 * The `req` arg is optional — when provided, the helper extracts
 * client IP (`req.ip`, which already respects X-Forwarded-For because
 * `app.set("trust proxy", …)` is configured at boot) and user-agent
 * into the `details` JSONB. No new schema columns required.
 *
 * Note on the `actorId` parameter: the underlying column is named
 * `admin_id` (legacy). It accepts ANY user id (FK to users.id with
 * cascade delete), not just admins. The misnomer is documented in
 * the schema comment; rename to `actor_id` is post-launch hygiene.
 */
export async function logAuditEvent(args: {
  actorId: number;
  action: string;
  targetType: string;
  targetId: number | null;
  details?: Record<string, any>;
  req?: Pick<Request, "ip" | "headers">;
}): Promise<void> {
  try {
    const augmented: Record<string, any> = { ...(args.details ?? {}) };
    if (args.req) {
      if (args.req.ip) augmented.ipAddress = args.req.ip;
      const ua = args.req.headers["user-agent"];
      if (typeof ua === "string") augmented.userAgent = ua;
    }
    await db.insert(adminAuditLogs).values({
      adminId: args.actorId,
      action: args.action,
      targetType: args.targetType,
      targetId: args.targetId,
      details: Object.keys(augmented).length > 0 ? JSON.stringify(augmented) : null,
    });
  } catch (err) {
    logger.error({ err, action: args.action }, "Failed to write audit log");
  }
}

/**
 * Legacy alias kept for the existing call sites in misc.routes.ts
 * (user_suspend / user_delete / book_delete / etc.). New code should
 * call logAuditEvent directly with the named-args shape.
 */
export async function logAdminAction(
  adminId: number,
  action: string,
  targetType: string,
  targetId: number | null,
  details?: Record<string, any>,
  req?: Pick<Request, "ip" | "headers">,
): Promise<void> {
  return logAuditEvent({ actorId: adminId, action, targetType, targetId, details, req });
}
