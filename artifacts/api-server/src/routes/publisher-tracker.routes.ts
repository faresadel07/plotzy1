// Submission Tracker API
//
// Turns the Find Publishers page from a static directory into a working
// CRM. Endpoints below back two surfaces in the UI:
//
//   - "My Submissions" dashboard: list every query the writer has sent,
//     update statuses, add notes, set follow-up reminders.
//   - Per-publisher / per-agent card: a one-click "Track Submission"
//     button that creates a draft submission row the writer can edit.
//
// Saved publishers ("favourites") share the same recipientKey scheme so
// a writer can build a shortlist before submitting to anyone.

import { Router } from "express";
import { z } from "zod";
import { db } from "../db";
import { eq, and, desc, sql } from "drizzle-orm";
import { publisherSubmissions, savedPublishers, books } from "../../../../lib/db/src/schema";
import { requireAuth } from "../middleware/auth";
import { logger } from "../lib/logger";
import { logRouteError } from "../lib/log-route-error";

const router = Router();

// Status values the UI is allowed to set. The DB column is plain text
// for flexibility but the API validates the enum so we don't accept
// typos like "submited" or "Reject".
const SUBMISSION_STATUSES = [
  "draft",
  "submitted",
  "rejected",
  "accepted",
  "withdrawn",
  "no_response",
] as const;

const submissionCreateSchema = z.object({
  bookId: z.number().int().positive(),
  recipientKey: z.string().min(1).max(200),
  recipientName: z.string().min(1).max(300),
  status: z.enum(SUBMISSION_STATUSES).optional().default("draft"),
  submittedAt: z.string().datetime().optional().nullable(),
  followUpAt: z.string().datetime().optional().nullable(),
  notes: z.string().max(10_000).optional().nullable(),
  materials: z
    .object({
      queryLetter: z.string().max(20_000).optional(),
      synopsis: z.string().max(20_000).optional(),
      samplePages: z.string().max(50_000).optional(),
      bio: z.string().max(5_000).optional(),
    })
    .optional(),
});

const submissionUpdateSchema = submissionCreateSchema.partial().extend({
  respondedAt: z.string().datetime().optional().nullable(),
});

// ── GET /api/submissions ─────────────────────────────────────────────
// List every submission the authenticated user has logged, newest
// first. Optional ?bookId= filter scopes to a single manuscript.
router.get("/api/submissions", requireAuth, async (req: any, res) => {
  try {
    const userId = req.user.id as number;
    const bookId = req.query.bookId ? Number(req.query.bookId) : undefined;
    const whereClause = bookId
      ? and(eq(publisherSubmissions.userId, userId), eq(publisherSubmissions.bookId, bookId))
      : eq(publisherSubmissions.userId, userId);
    const rows = await db
      .select()
      .from(publisherSubmissions)
      .where(whereClause)
      .orderBy(desc(publisherSubmissions.updatedAt));
    return res.json(rows);
  } catch (err) {
    logRouteError(req, err, "publisher-tracker.routes");
    return res.status(500).json({ message: "Failed to load submissions" });
  }
});

// ── GET /api/submissions/stats ───────────────────────────────────────
// Aggregate counts for the dashboard header: how many are pending, how
// many rejected, how many accepted, and the median response time in
// days across resolved submissions.
router.get("/api/submissions/stats", requireAuth, async (req: any, res) => {
  try {
    const userId = req.user.id as number;
    const [counts] = await db
      .select({
        total: sql<number>`count(*)::int`,
        drafts: sql<number>`count(*) filter (where status = 'draft')::int`,
        pending: sql<number>`count(*) filter (where status = 'submitted')::int`,
        rejected: sql<number>`count(*) filter (where status = 'rejected')::int`,
        accepted: sql<number>`count(*) filter (where status = 'accepted')::int`,
        withdrawn: sql<number>`count(*) filter (where status = 'withdrawn')::int`,
        noResponse: sql<number>`count(*) filter (where status = 'no_response')::int`,
        avgResponseDays: sql<number | null>`(
          avg(extract(epoch from (responded_at - submitted_at)) / 86400) filter (
            where submitted_at is not null and responded_at is not null
          )
        )::int`,
      })
      .from(publisherSubmissions)
      .where(eq(publisherSubmissions.userId, userId));
    return res.json(counts);
  } catch (err) {
    logRouteError(req, err, "publisher-tracker.routes");
    return res.status(500).json({ message: "Failed to compute stats" });
  }
});

// ── POST /api/submissions ────────────────────────────────────────────
// Create a new submission row. Defaults to status="draft" so the
// writer can save query templates before they actually send anything.
router.post("/api/submissions", requireAuth, async (req: any, res) => {
  try {
    const userId = req.user.id as number;
    const body = submissionCreateSchema.parse(req.body);

    // Ownership check: writer must own the book they're tracking
    // submissions for.
    const [book] = await db.select().from(books).where(eq(books.id, body.bookId)).limit(1);
    if (!book || book.userId !== userId) {
      return res.status(403).json({ message: "Not your book" });
    }

    const [row] = await db
      .insert(publisherSubmissions)
      .values({
        userId,
        bookId: body.bookId,
        recipientKey: body.recipientKey,
        recipientName: body.recipientName,
        status: body.status,
        submittedAt: body.submittedAt ? new Date(body.submittedAt) : null,
        followUpAt: body.followUpAt ? new Date(body.followUpAt) : null,
        notes: body.notes ?? null,
        materials: body.materials ?? null,
      })
      .returning();
    return res.status(201).json(row);
  } catch (err: any) {
    if (err?.name === "ZodError") {
      return res.status(400).json({ message: "Invalid submission data", details: err.errors });
    }
    logRouteError(req, err, "publisher-tracker.routes");
    return res.status(500).json({ message: "Failed to create submission" });
  }
});

// ── PATCH /api/submissions/:id ───────────────────────────────────────
// Update an existing submission. Most-used flow: writer marks an
// existing draft as "submitted" (status + submittedAt), or flips a
// "submitted" row into "rejected" / "accepted" with notes.
router.patch("/api/submissions/:id", requireAuth, async (req: any, res) => {
  try {
    const userId = req.user.id as number;
    const id = Number(req.params.id);
    if (!id) return res.status(400).json({ message: "Invalid id" });

    const [existing] = await db
      .select()
      .from(publisherSubmissions)
      .where(eq(publisherSubmissions.id, id))
      .limit(1);
    if (!existing) return res.status(404).json({ message: "Submission not found" });
    if (existing.userId !== userId) return res.status(403).json({ message: "Not yours" });

    const body = submissionUpdateSchema.parse(req.body);
    const patch: Record<string, unknown> = { updatedAt: new Date() };
    if (body.recipientKey !== undefined) patch.recipientKey = body.recipientKey;
    if (body.recipientName !== undefined) patch.recipientName = body.recipientName;
    if (body.status !== undefined) patch.status = body.status;
    if (body.submittedAt !== undefined) patch.submittedAt = body.submittedAt ? new Date(body.submittedAt) : null;
    if (body.respondedAt !== undefined) patch.respondedAt = body.respondedAt ? new Date(body.respondedAt) : null;
    if (body.followUpAt !== undefined) patch.followUpAt = body.followUpAt ? new Date(body.followUpAt) : null;
    if (body.notes !== undefined) patch.notes = body.notes;
    if (body.materials !== undefined) patch.materials = body.materials;

    const [row] = await db
      .update(publisherSubmissions)
      .set(patch)
      .where(eq(publisherSubmissions.id, id))
      .returning();
    return res.json(row);
  } catch (err: any) {
    if (err?.name === "ZodError") {
      return res.status(400).json({ message: "Invalid submission data", details: err.errors });
    }
    logRouteError(req, err, "publisher-tracker.routes");
    return res.status(500).json({ message: "Failed to update submission" });
  }
});

// ── DELETE /api/submissions/:id ──────────────────────────────────────
router.delete("/api/submissions/:id", requireAuth, async (req: any, res) => {
  try {
    const userId = req.user.id as number;
    const id = Number(req.params.id);
    if (!id) return res.status(400).json({ message: "Invalid id" });

    const [existing] = await db
      .select()
      .from(publisherSubmissions)
      .where(eq(publisherSubmissions.id, id))
      .limit(1);
    if (!existing) return res.status(404).json({ message: "Not found" });
    if (existing.userId !== userId) return res.status(403).json({ message: "Not yours" });

    await db.delete(publisherSubmissions).where(eq(publisherSubmissions.id, id));
    return res.status(204).send();
  } catch (err) {
    logRouteError(req, err, "publisher-tracker.routes");
    return res.status(500).json({ message: "Failed to delete submission" });
  }
});

// ── GET /api/saved-publishers ────────────────────────────────────────
// Per-user bookmark list. The directory cards on the front-end use
// this to render the "Saved" badge and to power the Saved tab.
router.get("/api/saved-publishers", requireAuth, async (req: any, res) => {
  try {
    const userId = req.user.id as number;
    const rows = await db
      .select()
      .from(savedPublishers)
      .where(eq(savedPublishers.userId, userId))
      .orderBy(desc(savedPublishers.createdAt));
    return res.json(rows);
  } catch (err) {
    logRouteError(req, err, "publisher-tracker.routes");
    return res.status(500).json({ message: "Failed to load saved publishers" });
  }
});

// ── POST /api/saved-publishers ───────────────────────────────────────
// Idempotent bookmark — same recipientKey twice returns the existing
// row instead of failing on the unique index.
router.post("/api/saved-publishers", requireAuth, async (req: any, res) => {
  try {
    const userId = req.user.id as number;
    const body = z
      .object({
        recipientKey: z.string().min(1).max(200),
        notes: z.string().max(2_000).optional().nullable(),
      })
      .parse(req.body);

    const [row] = await db
      .insert(savedPublishers)
      .values({ userId, recipientKey: body.recipientKey, notes: body.notes ?? null })
      .onConflictDoUpdate({
        target: [savedPublishers.userId, savedPublishers.recipientKey],
        set: { notes: body.notes ?? null },
      })
      .returning();
    return res.status(201).json(row);
  } catch (err: any) {
    if (err?.name === "ZodError") {
      return res.status(400).json({ message: "Invalid bookmark", details: err.errors });
    }
    logRouteError(req, err, "publisher-tracker.routes");
    return res.status(500).json({ message: "Failed to save publisher" });
  }
});

// ── DELETE /api/saved-publishers/:key ────────────────────────────────
router.delete("/api/saved-publishers/:key", requireAuth, async (req: any, res) => {
  try {
    const userId = req.user.id as number;
    const key = req.params.key;
    if (!key) return res.status(400).json({ message: "Missing key" });
    await db
      .delete(savedPublishers)
      .where(and(eq(savedPublishers.userId, userId), eq(savedPublishers.recipientKey, key)));
    return res.status(204).send();
  } catch (err) {
    logRouteError(req, err, "publisher-tracker.routes");
    return res.status(500).json({ message: "Failed to delete bookmark" });
  }
});

void logger;
export default router;
