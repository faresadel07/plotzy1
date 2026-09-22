// ── Community comments ───────────────────────────────────────────────────
//
// The live half of the landing page's feedback wall. The curated
// testimonials on the frontend are static and always render first; these
// rows appear underneath, newest first — unless an admin pins one, which
// is the only way a new comment is allowed above the curated set.
//
// Moderation is soft by default: "remove" sets `hidden`, so a mistake is
// reversible and nothing a writer wrote is destroyed. A permanent delete
// exists for spam and is written to the admin audit log.

import { Router } from "express";
import { z } from "zod";
import { and, desc, eq, gte, sql } from "drizzle-orm";
import { db } from "../db";
import { storage } from "../storage";
import { communityComments, users, adminAuditLogs } from "../../../../lib/db/src/schema";
import { requireAuth, requireAdmin } from "../middleware/auth";
import { logger } from "../lib/logger";

const router = Router();

const MIN_LEN = 4;
const MAX_LEN = 600;
/** Per-writer posting caps — enough for honest feedback, not for spam. */
const MAX_PER_DAY = 3;
const COOLDOWN_SECONDS = 60;

function logRouteError(req: any, err: unknown, where: string) {
  logger.error({ err, path: req?.originalUrl }, `${where} error`);
}

/** Public shape — never leaks emails or anything else private. */
const publicSelect = {
  id: communityComments.id,
  body: communityComments.body,
  pinned: communityComments.pinned,
  createdAt: communityComments.createdAt,
  authorId: users.id,
  authorName: users.displayName,
  authorAvatar: users.avatarUrl,
};

// ── GET /api/community/comments ──────────────────────────────────────────
// Public. Pinned first (newest pin first), then newest.
router.get("/api/community/comments", async (req, res) => {
  try {
    const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 50));
    const rows = await db
      .select(publicSelect)
      .from(communityComments)
      .innerJoin(users, eq(users.id, communityComments.userId))
      .where(eq(communityComments.hidden, false))
      .orderBy(
        desc(communityComments.pinned),
        desc(communityComments.pinnedAt),
        desc(communityComments.createdAt),
      )
      .limit(limit);
    return res.json({ comments: rows });
  } catch (err) {
    logRouteError(req, err, "community.routes.list");
    // The wall must survive a database hiccup: the curated testimonials
    // still render, the live half is simply empty.
    return res.json({ comments: [] });
  }
});

// ── POST /api/community/comments ─────────────────────────────────────────
// Signed-in writers only, so every comment has a real name and avatar.
router.post("/api/community/comments", requireAuth, async (req, res) => {
  try {
    const userId = (req.user as any).id as number;

    const user = await storage.getUserById(userId);
    if (!user) return res.status(401).json({ message: "Not authenticated" });
    if ((user as any).suspended) {
      return res.status(403).json({ message: "Your account cannot post right now." });
    }

    const parsed = z.object({
      body: z.string().trim().min(MIN_LEN).max(MAX_LEN),
    }).safeParse(req.body ?? {});
    if (!parsed.success) {
      return res.status(400).json({
        message: `Your comment needs between ${MIN_LEN} and ${MAX_LEN} characters.`,
      });
    }
    const body = parsed.data.body;

    const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const [{ recent }] = await db
      .select({ recent: sql<number>`count(*)::int` })
      .from(communityComments)
      .where(and(eq(communityComments.userId, userId), gte(communityComments.createdAt, dayAgo)));
    if (recent >= MAX_PER_DAY) {
      return res.status(429).json({
        message: `You can post ${MAX_PER_DAY} comments a day. Try again tomorrow.`,
      });
    }

    const [last] = await db
      .select({ createdAt: communityComments.createdAt })
      .from(communityComments)
      .where(eq(communityComments.userId, userId))
      .orderBy(desc(communityComments.createdAt))
      .limit(1);
    if (last?.createdAt) {
      const secs = (Date.now() - new Date(last.createdAt).getTime()) / 1000;
      if (secs < COOLDOWN_SECONDS) {
        return res.status(429).json({
          message: `Give it a moment — you can post again in ${Math.ceil(COOLDOWN_SECONDS - secs)}s.`,
        });
      }
    }

    const [row] = await db
      .insert(communityComments)
      .values({ userId, body })
      .returning({ id: communityComments.id, createdAt: communityComments.createdAt });

    return res.status(201).json({
      comment: {
        id: row.id,
        body,
        pinned: false,
        createdAt: row.createdAt,
        authorId: userId,
        authorName: (user as any).displayName ?? null,
        authorAvatar: (user as any).avatarUrl ?? null,
      },
    });
  } catch (err) {
    logRouteError(req, err, "community.routes.create");
    return res.status(500).json({ message: "Could not post your comment. Please try again." });
  }
});

// ── Admin: list everything, including hidden ─────────────────────────────
router.get("/api/admin/community/comments", requireAdmin, async (req, res) => {
  try {
    const rows = await db
      .select({
        ...publicSelect,
        hidden: communityComments.hidden,
        authorEmail: users.email,
      })
      .from(communityComments)
      .innerJoin(users, eq(users.id, communityComments.userId))
      .orderBy(
        desc(communityComments.pinned),
        desc(communityComments.createdAt),
      )
      .limit(300);
    return res.json({ comments: rows });
  } catch (err) {
    logRouteError(req, err, "community.routes.adminList");
    return res.status(500).json({ message: "Could not load comments" });
  }
});

// ── Admin: pin / unpin, hide / restore ───────────────────────────────────
router.patch("/api/admin/community/comments/:id", requireAdmin, async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isFinite(id)) return res.status(400).json({ message: "Invalid ID" });

    const parsed = z.object({
      pinned: z.boolean().optional(),
      hidden: z.boolean().optional(),
    }).refine((v) => v.pinned !== undefined || v.hidden !== undefined, {
      message: "Nothing to update",
    }).safeParse(req.body ?? {});
    if (!parsed.success) return res.status(400).json({ message: "Nothing to update" });

    const patch: Record<string, unknown> = {};
    if (parsed.data.pinned !== undefined) {
      patch.pinned = parsed.data.pinned;
      patch.pinnedAt = parsed.data.pinned ? new Date() : null;
    }
    if (parsed.data.hidden !== undefined) {
      patch.hidden = parsed.data.hidden;
      patch.hiddenAt = parsed.data.hidden ? new Date() : null;
    }

    const [updated] = await db
      .update(communityComments)
      .set(patch)
      .where(eq(communityComments.id, id))
      .returning({ id: communityComments.id, pinned: communityComments.pinned, hidden: communityComments.hidden });
    if (!updated) return res.status(404).json({ message: "Comment not found" });

    await db.insert(adminAuditLogs).values({
      adminId: (req.user as any).id,
      action: parsed.data.pinned !== undefined
        ? (parsed.data.pinned ? "comment_pin" : "comment_unpin")
        : (parsed.data.hidden ? "comment_hide" : "comment_restore"),
      targetType: "comment",
      targetId: id,
      details: JSON.stringify(patch),
    }).catch(() => { /* the audit row must never fail the action */ });

    return res.json({ comment: updated });
  } catch (err) {
    logRouteError(req, err, "community.routes.adminPatch");
    return res.status(500).json({ message: "Could not update the comment" });
  }
});

// ── Admin: permanent delete (for spam) ───────────────────────────────────
router.delete("/api/admin/community/comments/:id", requireAdmin, async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isFinite(id)) return res.status(400).json({ message: "Invalid ID" });

    const [gone] = await db
      .delete(communityComments)
      .where(eq(communityComments.id, id))
      .returning({ id: communityComments.id, userId: communityComments.userId, body: communityComments.body });
    if (!gone) return res.status(404).json({ message: "Comment not found" });

    await db.insert(adminAuditLogs).values({
      adminId: (req.user as any).id,
      action: "comment_delete",
      targetType: "comment",
      targetId: id,
      // Keep what was removed, so a permanent delete is still accountable.
      details: JSON.stringify({ userId: gone.userId, body: gone.body.slice(0, 300) }),
    }).catch(() => { /* never fail the delete over the audit row */ });

    return res.json({ success: true });
  } catch (err) {
    logRouteError(req, err, "community.routes.adminDelete");
    return res.status(500).json({ message: "Could not delete the comment" });
  }
});

export default router;
