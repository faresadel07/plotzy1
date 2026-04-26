import { Router } from "express";
import { z } from "zod";
import { storage } from "../storage";
import { requireAdmin, requireBookOwner } from "../middleware/auth";
import { db } from "../db";
import { eq } from "drizzle-orm";
import { professionals, quoteRequests, researchItems as researchItemsTable, arcRecipients as arcRecipientsTable, adminAuditLogs, bookCollaborators, books, users } from "../../../../lib/db/src/schema";
import { desc, sql, and } from "drizzle-orm";
import { logger } from "../lib/logger";
import { isAdminUser } from "../lib/admin";
import { sensitiveAuthLimiter } from "../middleware/rate-limit";
import crypto from "crypto";

const router = Router();

// ── Audit Log Helper ────────────────────────────────────────────────────────
async function logAdminAction(adminId: number, action: string, targetType: string, targetId: number | null, details?: Record<string, any>) {
  try {
    await db.insert(adminAuditLogs).values({
      adminId,
      action,
      targetType,
      targetId,
      details: details ? JSON.stringify(details) : null,
    });
  } catch (err) {
    logger.error({ err }, "Failed to write audit log");
  }
}

// ── Book Series ─────────────────────────────────────────────────────────────

// GET /api/series — list user's series with their books
router.get("/api/series", async (req, res) => {
  try {
    if (!req.isAuthenticated() || !req.user) return res.status(401).json({ message: "Unauthorized" });
    const userId = (req.user as any).id;
    const withBooks = await storage.getUserSeriesWithBooks(userId);
    return res.json(withBooks);
  } catch (err) {
    return res.status(500).json({ message: "Internal error" });
  }
});

// POST /api/series — create a new series
router.post("/api/series", async (req, res) => {
  try {
    if (!req.isAuthenticated() || !req.user) return res.status(401).json({ message: "Unauthorized" });
    const userId = (req.user as any).id;
    const { name, description } = req.body;
    if (!name?.trim()) return res.status(400).json({ message: "Name is required" });
    const series = await storage.createSeries({ userId, name: name.trim(), description: description?.trim() || null });
    return res.status(201).json({ ...series, books: [] });
  } catch (err) {
    return res.status(500).json({ message: "Internal error" });
  }
});

// PATCH /api/series/:id — update series name/description
router.patch("/api/series/:id", async (req, res) => {
  try {
    if (!req.isAuthenticated() || !req.user) return res.status(401).json({ message: "Unauthorized" });
    const userId = (req.user as any).id;
    const seriesId = Number(req.params.id);
    const existing = await storage.getSeries(seriesId);
    if (!existing || existing.userId !== userId) return res.status(404).json({ message: "Not found" });
    const { name, description } = req.body;
    const updates: any = {};
    if (name !== undefined) updates.name = name.trim();
    if (description !== undefined) updates.description = description?.trim() || null;
    const updated = await storage.updateSeries(seriesId, updates);
    return res.json(updated);
  } catch (err) {
    return res.status(500).json({ message: "Internal error" });
  }
});

// POST /api/series/:id/publish — publish or unpublish a series (atomic)
router.post("/api/series/:id/publish", async (req, res) => {
  try {
    if (!req.isAuthenticated() || !req.user) return res.status(401).json({ message: "Unauthorized" });
    const userId = (req.user as any).id;
    const seriesId = Number(req.params.id);
    if (!Number.isInteger(seriesId)) return res.status(400).json({ message: "Invalid ID" });
    const { publish } = req.body;
    if (typeof publish !== "boolean") return res.status(400).json({ message: "publish must be boolean" });

    const { bookSeries } = await import("../../../../lib/db/src/schema");

    // Atomic: ownership check and update in a single transaction
    const updated = await db.transaction(async (tx) => {
      const [existing] = await tx.select().from(bookSeries).where(eq(bookSeries.id, seriesId));
      if (!existing || existing.userId !== userId) throw new Error("NOT_FOUND");
      const [row] = await tx.update(bookSeries)
        .set({
          isPublished: publish,
          publishedAt: publish ? new Date() : null,
        } as any)
        .where(eq(bookSeries.id, seriesId))
        .returning();
      return row;
    });
    return res.json(updated);
  } catch (err: any) {
    if (err?.message === "NOT_FOUND") return res.status(404).json({ message: "Not found" });
    logger.error({ err }, "Failed to publish series");
    return res.status(500).json({ message: "Internal error" });
  }
});

// GET /api/public/series — list all published series
router.get("/api/public/series", async (_req, res) => {
  try {
    const { db: dbConn } = await import("../db");
    const { bookSeries: bs, users: usersTable, books: booksTable } = await import("../../../../lib/db/src/schema");
    const { eq, desc, and, inArray } = await import("drizzle-orm");

    const rows = await dbConn.select({
      id: bs.id,
      userId: bs.userId,
      name: bs.name,
      description: bs.description,
      coverImage: bs.coverImage,
      publishedAt: bs.publishedAt,
      createdAt: bs.createdAt,
      ownerName: usersTable.displayName,
      ownerAvatarUrl: usersTable.avatarUrl,
    }).from(bs)
      .leftJoin(usersTable, eq(bs.userId, usersTable.id))
      .where(eq(bs.isPublished, true))
      .orderBy(desc(bs.publishedAt));

    if (rows.length === 0) return res.json([]);

    // For each series, fetch its published books (to show the first cover as series cover fallback)
    const seriesIds = rows.map(r => r.id);
    const bookRows = await dbConn.select({
      id: booksTable.id,
      seriesId: booksTable.seriesId,
      coverImage: booksTable.coverImage,
      title: booksTable.title,
    }).from(booksTable)
      .where(and(
        eq(booksTable.isPublished, true),
        eq(booksTable.isDeleted, false),
        inArray(booksTable.seriesId as any, seriesIds),
      ));

    const booksBySeries = new Map<number, any[]>();
    for (const b of bookRows) {
      const sid = b.seriesId as number;
      if (!booksBySeries.has(sid)) booksBySeries.set(sid, []);
      booksBySeries.get(sid)!.push(b);
    }

    const result = rows.map(s => ({
      ...s,
      books: booksBySeries.get(s.id) || [],
      bookCount: (booksBySeries.get(s.id) || []).length,
    }));

    return res.json(result);
  } catch (err) {
    logger.error({ err }, "Failed to fetch public series");
    return res.json([]);
  }
});

// GET /api/public/series/:id — public series view (for readers)
router.get("/api/public/series/:id", async (req, res) => {
  try {
    const seriesId = Number(req.params.id);
    const series = await storage.getSeries(seriesId);
    if (!series || !(series as any).isPublished) return res.status(404).json({ message: "Series not found" });

    // Get all books in the series (only published ones)
    const allBooks = await storage.getSeriesBooks(seriesId);
    const publishedBooks = allBooks.filter((b: any) => b.isPublished);

    // Get owner info
    const owner = await storage.getUserById((series as any).userId);

    return res.json({
      ...series,
      books: publishedBooks,
      ownerName: owner?.displayName || null,
      ownerAvatarUrl: owner?.avatarUrl || null,
    });
  } catch (err) {
    return res.status(500).json({ message: "Internal error" });
  }
});

// DELETE /api/series/:id — delete series (unlinks books, doesn't delete them)
router.delete("/api/series/:id", async (req, res) => {
  try {
    if (!req.isAuthenticated() || !req.user) return res.status(401).json({ message: "Unauthorized" });
    const userId = (req.user as any).id;
    const seriesId = Number(req.params.id);
    const existing = await storage.getSeries(seriesId);
    if (!existing || existing.userId !== userId) return res.status(404).json({ message: "Not found" });
    await storage.deleteSeries(seriesId);
    return res.status(204).send();
  } catch (err) {
    return res.status(500).json({ message: "Internal error" });
  }
});

// POST /api/series/:id/books/:bookId — add book to series
router.post("/api/series/:id/books/:bookId", async (req, res) => {
  try {
    if (!req.isAuthenticated() || !req.user) return res.status(401).json({ message: "Unauthorized" });
    const userId = (req.user as any).id;
    const seriesId = Number(req.params.id);
    const bookId = Number(req.params.bookId);
    const series = await storage.getSeries(seriesId);
    if (!series || series.userId !== userId) return res.status(404).json({ message: "Not found" });
    const book = await storage.getBook(bookId);
    if (!book || book.userId !== userId) return res.status(404).json({ message: "Book not found" });
    // Assign at end of series
    const existingBooks = await storage.getSeriesBooks(seriesId);
    const order = req.body.order ?? existingBooks.length;
    const updated = await storage.assignBookToSeries(bookId, seriesId, order);
    return res.json(updated);
  } catch (err) {
    return res.status(500).json({ message: "Internal error" });
  }
});

// DELETE /api/series/:id/books/:bookId — remove book from series
router.delete("/api/series/:id/books/:bookId", async (req, res) => {
  try {
    if (!req.isAuthenticated() || !req.user) return res.status(401).json({ message: "Unauthorized" });
    const userId = (req.user as any).id;
    const bookId = Number(req.params.bookId);
    const book = await storage.getBook(bookId);
    if (!book || book.userId !== userId) return res.status(404).json({ message: "Book not found" });
    const updated = await storage.assignBookToSeries(bookId, null, 0);
    return res.json(updated);
  } catch (err) {
    return res.status(500).json({ message: "Internal error" });
  }
});

// PUT /api/series/:id/reorder — reorder books within a series
router.put("/api/series/:id/reorder", async (req, res) => {
  try {
    if (!req.isAuthenticated() || !req.user) return res.status(401).json({ message: "Unauthorized" });
    const userId = (req.user as any).id;
    const seriesId = Number(req.params.id);
    const series = await storage.getSeries(seriesId);
    if (!series || series.userId !== userId) return res.status(404).json({ message: "Not found" });
    const { order } = req.body; // array of bookIds in new order
    if (!Array.isArray(order)) return res.status(400).json({ message: "order must be an array" });
    const updates = order.map((bookId: number, idx: number) => ({ bookId, seriesOrder: idx }));
    await storage.reorderSeriesBooks(updates);
    return res.json({ ok: true });
  } catch (err) {
    return res.status(500).json({ message: "Internal error" });
  }
});

// ── Support messages (public submission) ──────────────────────────────────
router.post("/api/support/messages", async (req, res) => {
  try {
    const { insertSupportMessageSchema } = await import("../../../../lib/db/src/schema");
    const data = insertSupportMessageSchema.parse({
      ...req.body,
      userId: req.isAuthenticated() && req.user ? req.user.id : null,
    });
    const msg = await storage.submitSupportMessage(data);
    return res.json(msg);
  } catch (err) {
    return res.status(400).json({ message: "Invalid data" });
  }
});

// ── Support: my tickets (user's own tickets) ─────────────────────────────
router.get("/api/support/my-tickets", async (req, res) => {
  try {
    if (!req.isAuthenticated() || !req.user) {
      return res.status(401).json({ message: "Not authenticated" });
    }
    const { supportMessages } = await import("../../../../lib/db/src/schema");
    const { eq, desc } = await import("drizzle-orm");
    const { db } = await import("../db");
    const tickets = await db.select().from(supportMessages)
      .where(eq(supportMessages.userId, req.user.id))
      .orderBy(desc(supportMessages.createdAt));
    return res.json(tickets);
  } catch (err) {
    return res.status(500).json({ message: "Internal error" });
  }
});

// ── Support: get thread (ticket + all replies) ──────────────────────────
// Admins can access any ticket; users can only see their own.
router.get("/api/support/tickets/:id/thread", async (req, res) => {
  try {
    const ticketId = Number(req.params.id);
    if (!Number.isFinite(ticketId)) return res.status(400).json({ message: "Invalid ticket id" });

    const { supportMessages, supportReplies } = await import("../../../../lib/db/src/schema");
    const { eq, asc } = await import("drizzle-orm");

    const [ticket] = await db.select().from(supportMessages).where(eq(supportMessages.id, ticketId));
    if (!ticket) return res.status(404).json({ message: "Ticket not found" });

    const isAdmin = req.isAuthenticated() && isAdminUser(req.user);
    const isOwner = req.isAuthenticated() && req.user && ticket.userId === (req.user as any).id;
    if (!isAdmin && !isOwner) return res.status(403).json({ message: "Forbidden" });

    const replies = await db.select().from(supportReplies)
      .where(eq(supportReplies.ticketId, ticketId))
      .orderBy(asc(supportReplies.createdAt));

    return res.json({ ticket, replies });
  } catch (err) {
    logger.error({ err }, "Failed to fetch support thread");
    return res.status(500).json({ message: "Internal error" });
  }
});

// ── Support: admin replies to a ticket ──────────────────────────────────
// - Persists the reply to support_replies
// - Emails the user via Resend (fire-and-forget; DB is the source of truth)
// - Creates an in-app notification for the user (if they have an account)
// - Marks the ticket status as "replied"
router.post("/api/admin/support/:id/reply", requireAdmin, async (req, res) => {
  try {
    const ticketId = Number(req.params.id);
    if (!Number.isFinite(ticketId)) return res.status(400).json({ message: "Invalid ticket id" });

    const { body } = z.object({ body: z.string().trim().min(1, "Reply cannot be empty").max(5000) }).strict().parse(req.body);

    const { supportMessages, supportReplies, notifications } = await import("../../../../lib/db/src/schema");
    const { eq } = await import("drizzle-orm");

    const [ticket] = await db.select().from(supportMessages).where(eq(supportMessages.id, ticketId));
    if (!ticket) return res.status(404).json({ message: "Ticket not found" });

    const adminUser = req.user as any;
    const adminName = adminUser?.displayName || "Plotzy Support";

    // 1. Persist the reply.
    const [saved] = await db.insert(supportReplies).values({
      ticketId,
      senderType: "admin",
      senderUserId: adminUser?.id ?? null,
      senderName: adminName,
      body,
    }).returning();

    // 2. Mark ticket as replied (if still open) and as read.
    await db.update(supportMessages)
      .set({ status: ticket.status === "closed" ? "closed" : "replied", read: true })
      .where(eq(supportMessages.id, ticketId));

    // 3. In-app notification — only if the ticket is from a signed-in user.
    if (ticket.userId) {
      try {
        await db.insert(notifications).values({
          userId: ticket.userId,
          type: "support_reply",
          title: `Re: ${ticket.subject}`,
          body: body.length > 160 ? body.slice(0, 157) + "…" : body,
          linkUrl: "/support",
          actorId: adminUser?.id ?? null,
          entityId: ticketId,
        });
      } catch (nerr) {
        logger.error({ err: nerr }, "Failed to insert support notification");
      }
    }

    // 4. Email the user. Fire-and-forget — the reply is already saved.
    (async () => {
      try {
        if (!process.env.RESEND_API_KEY) return;
        const { Resend } = await import("resend");
        const resend = new Resend(process.env.RESEND_API_KEY);
        await resend.emails.send({
          from: "Plotzy Support <onboarding@resend.dev>",
          to: ticket.email,
          replyTo: process.env.ADMIN_EMAIL || "onboarding@resend.dev",
          subject: `Re: ${ticket.subject}`,
          html: `
            <div style="font-family:-apple-system,BlinkMacSystemFont,'SF Pro Display','Helvetica Neue',Arial,sans-serif;max-width:560px;margin:0 auto;padding:40px 24px;color:#111;">
              <div style="border-bottom:1px solid #eee;padding-bottom:16px;margin-bottom:24px;">
                <p style="margin:0;font-size:11px;font-weight:700;letter-spacing:0.18em;text-transform:uppercase;color:#888;">Plotzy Support</p>
                <h2 style="margin:8px 0 0;font-size:18px;font-weight:700;color:#111;">Reply to your ticket</h2>
              </div>
              <p style="margin:0 0 6px;font-size:12px;color:#888;">Hi ${ticket.name || "there"},</p>
              <p style="margin:0 0 18px;font-size:14px;line-height:1.65;color:#444;">
                We replied to your support ticket about <strong>"${ticket.subject}"</strong>:
              </p>
              <div style="background:#f7f7f7;border-left:3px solid #111;padding:16px 18px;border-radius:6px;margin-bottom:20px;">
                <p style="margin:0;font-size:14px;line-height:1.7;color:#222;white-space:pre-wrap;">${escapeHtml(body)}</p>
              </div>
              <p style="margin:0 0 18px;font-size:13px;line-height:1.65;color:#555;">
                You can continue the conversation by opening your ticket in Plotzy — just reply directly from the Support page.
              </p>
              <p style="margin:24px 0 0;font-size:12px;color:#999;">— ${escapeHtml(adminName)}, Plotzy team</p>
            </div>
          `,
        });
      } catch (emailErr) {
        logger.error({ err: emailErr }, "Failed to send support reply email");
      }
    })();

    await logAdminAction(adminUser.id, "support_reply", "support_ticket", ticketId, { length: body.length });
    return res.json({ success: true, reply: saved });
  } catch (err: any) {
    if (err?.name === "ZodError") return res.status(400).json({ message: err.errors?.[0]?.message || "Invalid reply" });
    logger.error({ err }, "Support reply error");
    return res.status(500).json({ message: "Failed to send reply" });
  }
});

// ── Support: user replies to their own ticket ───────────────────────────
router.post("/api/support/tickets/:id/reply", async (req, res) => {
  try {
    if (!req.isAuthenticated() || !req.user) return res.status(401).json({ message: "Not authenticated" });
    const ticketId = Number(req.params.id);
    if (!Number.isFinite(ticketId)) return res.status(400).json({ message: "Invalid ticket id" });

    const { body } = z.object({ body: z.string().trim().min(1).max(5000) }).strict().parse(req.body);

    const { supportMessages, supportReplies, notifications } = await import("../../../../lib/db/src/schema");
    const { eq } = await import("drizzle-orm");

    const user = req.user as any;
    const [ticket] = await db.select().from(supportMessages).where(eq(supportMessages.id, ticketId));
    if (!ticket) return res.status(404).json({ message: "Ticket not found" });
    if (ticket.userId !== user.id) return res.status(403).json({ message: "Forbidden" });

    const [saved] = await db.insert(supportReplies).values({
      ticketId,
      senderType: "user",
      senderUserId: user.id,
      senderName: user.displayName || ticket.name,
      body,
    }).returning();

    // Re-open the ticket so admins see it comes back to their queue.
    await db.update(supportMessages)
      .set({ status: "open", read: false })
      .where(eq(supportMessages.id, ticketId));

    // Notify admin(s) — anyone with role="admin" or matching ADMIN_EMAIL.
    try {
      const admins = await db.select().from(users).where(eq(users.role, "admin"));
      const adminEmail = process.env.ADMIN_EMAIL || null;
      const extra = adminEmail ? await db.select().from(users).where(eq(users.email, adminEmail)) : [];
      const recipientIds = new Set<number>([...admins.map(a => a.id), ...extra.map(a => a.id)]);
      for (const id of recipientIds) {
        await db.insert(notifications).values({
          userId: id,
          type: "support_reply",
          title: `New reply: ${ticket.subject}`,
          body: body.length > 160 ? body.slice(0, 157) + "…" : body,
          linkUrl: "/admin",
          actorId: user.id,
          entityId: ticketId,
        });
      }
    } catch (nerr) {
      logger.error({ err: nerr }, "Failed to notify admins of user support reply");
    }

    return res.json({ success: true, reply: saved });
  } catch (err: any) {
    if (err?.name === "ZodError") return res.status(400).json({ message: "Reply cannot be empty" });
    logger.error({ err }, "User support reply error");
    return res.status(500).json({ message: "Failed to send reply" });
  }
});

// Minimal HTML escaper for email bodies. Keeps newlines (handled via white-space: pre-wrap).
function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!));
}

// ── Admin: stats ────────────────────────────────────────────────────────
router.get("/api/admin/stats", requireAdmin, async (req, res) => {
  try {
    const stats = await storage.getAdminStats();
    return res.json(stats);
  } catch (err) {
    return res.status(500).json({ message: "Internal error" });
  }
});

// ── Admin: users ────────────────────────────────────────────────────────
router.get("/api/admin/users", requireAdmin, async (req, res) => {
  try {
    const allUsers = await storage.getAllUsers();
    const safe = allUsers.map(u => ({
      id: u.id,
      email: u.email,
      displayName: u.displayName,
      avatarUrl: u.avatarUrl,
      subscriptionStatus: u.subscriptionStatus,
      subscriptionPlan: u.subscriptionPlan,
      subscriptionEndDate: u.subscriptionEndDate,
      googleId: u.googleId ? "connected" : null,
      appleId: u.appleId ? "connected" : null,
      createdAt: (u as any).createdAt ?? null,
    }));
    return res.json(safe);
  } catch (err) {
    return res.status(500).json({ message: "Internal error" });
  }
});

router.delete("/api/admin/users/:id", requireAdmin, async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (isNaN(id)) return res.status(400).json({ message: "Invalid ID" });
    await storage.deleteUser(id);
    await logAdminAction((req.user as any).id, "user_delete", "user", id);
    return res.json({ success: true });
  } catch (err) {
    return res.status(500).json({ message: "Internal error" });
  }
});

router.patch("/api/admin/users/:id/subscription", requireAdmin, async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (isNaN(id)) return res.status(400).json({ message: "Invalid ID" });
    const { subscriptionStatus, subscriptionPlan, subscriptionEndDate } = req.body;
    const updated = await storage.updateUser(id, {
      subscriptionStatus: subscriptionStatus ?? null,
      subscriptionPlan: subscriptionPlan ?? null,
      subscriptionEndDate: subscriptionEndDate ? new Date(subscriptionEndDate) : null,
    });
    await logAdminAction((req.user as any).id, "user_grant_subscription", "user", id, { subscriptionStatus, subscriptionPlan });
    return res.json({ success: true, user: updated });
  } catch (err) {
    return res.status(500).json({ message: "Internal error" });
  }
});

// ── Admin: books (delete any published book) ────────────────────────────
router.delete("/api/admin/books/:id", requireAdmin, async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (isNaN(id)) return res.status(400).json({ message: "Invalid ID" });
    await storage.deleteBook(id);
    await logAdminAction((req.user as any).id, "book_delete", "book", id);
    return res.json({ success: true });
  } catch (err) {
    return res.status(500).json({ message: "Internal error" });
  }
});

// ── Banner (public read) ─────────────────────────────────────────────────
router.get("/api/banner", async (req, res) => {
  try {
    const message = await storage.getSetting("banner_message");
    const color = await storage.getSetting("banner_color");
    return res.json({ message, color });
  } catch (err) {
    return res.status(500).json({ message: "Internal error" });
  }
});

// ── Social Links (public GET + admin POST) ──────────────────────────────
const SOCIAL_KEYS = ["social_instagram", "social_linkedin", "social_youtube", "social_twitter", "social_tiktok"];

router.get("/api/social-links", async (_req, res) => {
  try {
    const links: Record<string, string> = {};
    for (const key of SOCIAL_KEYS) {
      const val = await storage.getSetting(key);
      if (val) links[key.replace("social_", "")] = val;
    }
    return res.json(links);
  } catch {
    return res.json({});
  }
});

router.post("/api/admin/social-links", requireAdmin, async (req, res) => {
  try {
    const { instagram, linkedin, youtube, twitter, tiktok } = req.body;
    await storage.setSetting("social_instagram", instagram?.trim() || null);
    await storage.setSetting("social_linkedin", linkedin?.trim() || null);
    await storage.setSetting("social_youtube", youtube?.trim() || null);
    await storage.setSetting("social_twitter", twitter?.trim() || null);
    await storage.setSetting("social_tiktok", tiktok?.trim() || null);
    await logAdminAction((req.user as any).id, "social_links_update", "settings", null, { instagram, linkedin, youtube, twitter, tiktok });
    return res.json({ success: true });
  } catch {
    return res.status(500).json({ message: "Internal error" });
  }
});

// ── Admin: banner management ─────────────────────────────────────────────
router.post("/api/admin/banner", requireAdmin, async (req, res) => {
  try {
    const { message, color } = req.body;
    if (!message?.trim()) return res.status(400).json({ message: "Message required" });
    await storage.setSetting("banner_message", message.trim());
    await storage.setSetting("banner_color", color || "default");
    await logAdminAction((req.user as any).id, "banner_update", "banner", null, { message: message.trim(), color });
    return res.json({ success: true });
  } catch (err) {
    return res.status(500).json({ message: "Internal error" });
  }
});

router.delete("/api/admin/banner", requireAdmin, async (req, res) => {
  try {
    await storage.setSetting("banner_message", null);
    await storage.setSetting("banner_color", null);
    return res.json({ success: true });
  } catch (err) {
    return res.status(500).json({ message: "Internal error" });
  }
});

// ── Admin: suspend/unsuspend user ─────────────────────────────────────────
router.patch("/api/admin/users/:id/suspend", requireAdmin, async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (isNaN(id)) return res.status(400).json({ message: "Invalid ID" });
    const { suspended } = req.body;
    const user = await storage.suspendUser(id, !!suspended);
    await logAdminAction((req.user as any).id, suspended ? "user_suspend" : "user_unsuspend", "user", id);
    return res.json(user);
  } catch (err) {
    return res.status(500).json({ message: "Internal error" });
  }
});

// ── Admin: activity feed ─────────────────────────────────────────────────
router.get("/api/admin/activity", requireAdmin, async (req, res) => {
  try {
    const feed = await storage.getActivityFeed();
    return res.json(feed);
  } catch (err) {
    return res.status(500).json({ message: "Internal error" });
  }
});

// ── Admin: unread support count (used for nav badge) ──────────────────────
router.get("/api/admin/support/unread-count", requireAdmin, async (req, res) => {
  try {
    const messages = await storage.getSupportMessages();
    const count = messages.filter((m: any) => !m.read).length;
    return res.json({ count });
  } catch (err) {
    return res.status(500).json({ message: "Internal error" });
  }
});

// ── Admin: support messages ──────────────────────────────────────────────
router.get("/api/admin/support", requireAdmin, async (req, res) => {
  try {
    const messages = await storage.getSupportMessages();
    return res.json(messages);
  } catch (err) {
    return res.status(500).json({ message: "Internal error" });
  }
});

router.patch("/api/admin/support/:id", requireAdmin, async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (isNaN(id)) return res.status(400).json({ message: "Invalid ID" });
    const { read, status } = req.body;
    const msg = await storage.updateSupportMessage(id, { read, status });
    return res.json(msg);
  } catch (err) {
    return res.status(500).json({ message: "Internal error" });
  }
});

// ── Admin: audit logs ───────────────────────────────────────────────────────
router.get("/api/admin/audit-logs", requireAdmin, async (req, res) => {
  try {
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 50));
    const offset = (page - 1) * limit;
    const logs = await db.select({
      id: adminAuditLogs.id,
      adminId: adminAuditLogs.adminId,
      action: adminAuditLogs.action,
      targetType: adminAuditLogs.targetType,
      targetId: adminAuditLogs.targetId,
      details: adminAuditLogs.details,
      createdAt: adminAuditLogs.createdAt,
    }).from(adminAuditLogs).orderBy(desc(adminAuditLogs.createdAt)).limit(limit).offset(offset);
    const [{ total }] = await db.select({ total: sql<number>`count(*)::int` }).from(adminAuditLogs);
    return res.json({ logs, total, page, limit, totalPages: Math.ceil(total / limit) });
  } catch (err) {
    logger.error({ err }, "Failed to fetch audit logs");
    return res.status(500).json({ message: "Internal error" });
  }
});

// ── Admin: bulk suspend users ───────────────────────────────────────────────
router.post("/api/admin/users/bulk-suspend", requireAdmin, async (req, res) => {
  try {
    const { userIds, suspended } = req.body;
    if (!Array.isArray(userIds) || userIds.length === 0) return res.status(400).json({ message: "userIds required" });
    if (userIds.length > 50) return res.status(400).json({ message: "Max 50 users at once" });
    let count = 0;
    const failed: number[] = [];
    for (const id of userIds) {
      try {
        await storage.suspendUser(Number(id), !!suspended);
        count++;
      } catch (e) {
        failed.push(Number(id));
        logger.error({ err: e, userId: id, suspended }, `Failed to ${suspended ? "suspend" : "unsuspend"} user`);
      }
    }
    await logAdminAction((req.user as any).id, suspended ? "bulk_suspend" : "bulk_unsuspend", "user", null, { userIds, count, failed });
    return res.json({ success: true, count, ...(failed.length ? { failed } : {}) });
  } catch (err) {
    return res.status(500).json({ message: "Internal error" });
  }
});

// ── Admin: bulk delete users ────────────────────────────────────────────────
router.post("/api/admin/users/bulk-delete", requireAdmin, async (req, res) => {
  try {
    const { userIds } = req.body;
    if (!Array.isArray(userIds) || userIds.length === 0) return res.status(400).json({ message: "userIds required" });
    if (userIds.length > 20) return res.status(400).json({ message: "Max 20 users at once" });
    let count = 0;
    const failed: number[] = [];
    for (const id of userIds) {
      try {
        await storage.deleteUser(Number(id));
        count++;
      } catch (e) {
        failed.push(Number(id));
        logger.error({ err: e, userId: id }, "Failed to delete user");
      }
    }
    await logAdminAction((req.user as any).id, "bulk_delete", "user", null, { userIds, count, failed });
    return res.json({ success: true, count, ...(failed.length ? { failed } : {}) });
  } catch (err) {
    return res.status(500).json({ message: "Internal error" });
  }
});

// ── Admin: CSV export — users ───────────────────────────────────────────────
router.get("/api/admin/export/users.csv", requireAdmin, async (req, res) => {
  try {
    // CSV export opts into the higher (50 000) cap. For larger exports
    // we'd need a streaming or paginated chunked-transfer implementation.
    const users = await storage.getAllUsers({ limit: 50_000 });
    // Escape CSV values: prevent formula injection (=, +, -, @) and quote fields with commas/quotes
    const esc = (v: any) => {
      let s = String(v ?? "");
      if (/^[=+\-@]/.test(s)) s = "'" + s; // prevent formula injection
      if (s.includes(",") || s.includes('"') || s.includes("\n")) return '"' + s.replace(/"/g, '""') + '"';
      return s;
    };
    const header = "id,email,display_name,role,subscription_tier,subscription_status,subscription_plan,created_at,suspended";
    const rows = (users as any[]).map(u =>
      [u.id, esc(u.email), esc(u.displayName), esc(u.role || "user"), esc(u.subscriptionTier || "free"), esc(u.subscriptionStatus || "free_trial"), esc(u.subscriptionPlan), esc(u.createdAt), u.suspended ? "true" : "false"].join(",")
    );
    res.setHeader("Content-Type", "text/csv");
    res.setHeader("Content-Disposition", "attachment; filename=plotzy-users.csv");
    return res.send([header, ...rows].join("\n"));
  } catch (err) {
    return res.status(500).json({ message: "Export failed" });
  }
});

// ── Admin: CSV export — analytics ───────────────────────────────────────────
router.get("/api/admin/export/analytics.csv", requireAdmin, async (req, res) => {
  try {
    const days = Math.min(90, Math.max(7, Number(req.query.days) || 30));
    const signups = await db.execute(sql`
      SELECT to_char(created_at::date, 'YYYY-MM-DD') as date, count(*)::int as signups
      FROM users WHERE created_at >= now() - make_interval(days => ${days})
      GROUP BY created_at::date ORDER BY date
    `);
    const header = "date,signups";
    const rows = (signups.rows as any[]).map(r => `${r.date},${r.signups}`);
    res.setHeader("Content-Type", "text/csv");
    res.setHeader("Content-Disposition", `attachment; filename=plotzy-analytics-${days}d.csv`);
    return res.send([header, ...rows].join("\n"));
  } catch (err) {
    return res.status(500).json({ message: "Export failed" });
  }
});

// ─── Book Collaboration ─────────────────────────────────────────────────────

function generateInviteCode(): string {
  return "PLOT-" + crypto.randomBytes(3).toString("hex").toUpperCase().slice(0, 6);
}

// Create invite code (owner only)
router.post("/api/books/:bookId/collaborators/invite", requireBookOwner, async (req, res) => {
  try {
    const bookId = Number(req.params.bookId);
    const book = await storage.getBook(bookId);
    if (!book || book.userId !== (req.user as any).id) return res.status(403).json({ message: "Only the book owner can invite collaborators" });

    const { role } = z.object({ role: z.enum(["editor", "viewer"]).default("editor") }).strict().parse(req.body);
    const code = generateInviteCode();

    // Delete any existing pending invite for this book by owner, then insert new one
    await db.delete(bookCollaborators).where(and(eq(bookCollaborators.bookId, bookId), eq(bookCollaborators.userId, (req.user as any).id), sql`invite_code IS NOT NULL`));
    await db.insert(bookCollaborators).values({ bookId, userId: (req.user as any).id, role, inviteCode: code });

    return res.json({ code, role });
  } catch (err) {
    logger.error({ err }, "Failed to create invite");
    return res.status(500).json({ message: "Internal error" });
  }
});

// Join book with invite code (any authenticated user). Rate-limited to
// stop invite-code brute force — codes are alphanumeric and short, so an
// unlimited POST loop could feasibly enumerate them.
router.post("/api/books/join", sensitiveAuthLimiter, async (req, res) => {
  try {
    if (!req.isAuthenticated() || !req.user) return res.status(401).json({ message: "Not authenticated" });
    const { code } = z.object({ code: z.string().min(1) }).strict().parse(req.body);
    const userId = (req.user as any).id;

    // Find the invite
    const [invite] = await db.select().from(bookCollaborators).where(eq(bookCollaborators.inviteCode, code.toUpperCase().trim()));
    if (!invite) return res.status(404).json({ message: "Invalid invite code" });

    const book = await storage.getBook(invite.bookId);
    if (!book) return res.status(404).json({ message: "Book not found" });
    if (book.userId === userId) return res.status(400).json({ message: "You already own this book" });

    // Check if already a collaborator
    const [existing] = await db.select().from(bookCollaborators).where(and(eq(bookCollaborators.bookId, invite.bookId), eq(bookCollaborators.userId, userId)));
    if (existing) return res.status(400).json({ message: "You're already a collaborator on this book" });

    // Add as collaborator
    const [collab] = await db.insert(bookCollaborators).values({ bookId: invite.bookId, userId, role: invite.role, inviteCode: null }).returning();

    // Delete the invite code (one-time use)
    await db.delete(bookCollaborators).where(eq(bookCollaborators.id, invite.id));

    return res.json({ success: true, bookId: invite.bookId, bookTitle: book.title, role: invite.role });
  } catch (err: any) {
    if (err?.name === "ZodError") return res.status(400).json({ message: "Please enter a valid invite code" });
    logger.error({ err }, "Failed to join book");
    return res.status(500).json({ message: "Internal error" });
  }
});

// List collaborators for a book (owner only)
router.get("/api/books/:bookId/collaborators", requireBookOwner, async (req, res) => {
  try {
    const bookId = Number(req.params.bookId);
    const rows = await db.select({
      id: bookCollaborators.id,
      userId: bookCollaborators.userId,
      role: bookCollaborators.role,
      inviteCode: bookCollaborators.inviteCode,
      joinedAt: bookCollaborators.joinedAt,
      displayName: users.displayName,
      email: users.email,
      avatarUrl: users.avatarUrl,
    }).from(bookCollaborators)
      .leftJoin(users, eq(bookCollaborators.userId, users.id))
      .where(eq(bookCollaborators.bookId, bookId));

    // Filter: real collaborators (not pending invites from owner)
    const book = await storage.getBook(bookId);
    const collabs = rows.filter(r => r.userId !== book?.userId);
    const pendingInvites = rows.filter(r => r.inviteCode && r.userId === book?.userId);

    return res.json({ collaborators: collabs, pendingInvites });
  } catch (err) {
    return res.status(500).json({ message: "Internal error" });
  }
});

// Remove a collaborator (owner only)
router.delete("/api/books/:bookId/collaborators/:collabId", requireBookOwner, async (req, res) => {
  try {
    const bookId = Number(req.params.bookId);
    const collabId = Number(req.params.collabId);
    const book = await storage.getBook(bookId);
    if (!book || book.userId !== (req.user as any).id) return res.status(403).json({ message: "Only the owner can remove collaborators" });

    await db.delete(bookCollaborators).where(and(eq(bookCollaborators.id, collabId), eq(bookCollaborators.bookId, bookId)));
    return res.json({ success: true });
  } catch (err) {
    return res.status(500).json({ message: "Internal error" });
  }
});

// Update collaborator role (owner only)
router.patch("/api/books/:bookId/collaborators/:collabId", requireBookOwner, async (req, res) => {
  try {
    const bookId = Number(req.params.bookId);
    const collabId = Number(req.params.collabId);
    const { role } = z.object({ role: z.enum(["editor", "viewer"]) }).strict().parse(req.body);
    const book = await storage.getBook(bookId);
    if (!book || book.userId !== (req.user as any).id) return res.status(403).json({ message: "Only the owner can change roles" });

    const [updated] = await db.update(bookCollaborators).set({ role }).where(and(eq(bookCollaborators.id, collabId), eq(bookCollaborators.bookId, bookId))).returning();
    return res.json(updated);
  } catch (err) {
    return res.status(500).json({ message: "Internal error" });
  }
});

// NOTE: /api/books/shared-with-me and /api/books/shared-by-me are registered
// in routes.ts (BEFORE /api/books/:id) to avoid route conflicts.

// ─── Marketplace ───────────────────────────────────────────────────────────

const SEED_PROFESSIONALS = [
  { name: "Sarah Mitchell", avatarUrl: "https://i.pravatar.cc/150?u=sarah-mitchell", tagline: "Developmental editor with 12 years at Penguin Random House", bio: "I specialize in helping authors shape their narratives, develop compelling characters, and build worlds readers can't leave. Former acquisitions editor at PRH with credits in NYT Bestseller fiction.", service: "developmental_editing", genres: ["Fantasy", "Literary Fiction", "Thriller", "Science Fiction"], ratingAvg: "4.9", reviewCount: 87, priceFrom: 800, priceTo: 2500, priceUnit: "per project", completedProjects: 134, featured: true },
  { name: "James Okonkwo", avatarUrl: "https://i.pravatar.cc/150?u=james-okonkwo", tagline: "Copy editor & proofreader — clean prose, tight mechanics", bio: "I've copy edited over 200 published novels and non-fiction works. My background in linguistics means I catch what spell-check misses. Specializing in voice preservation while tightening every sentence.", service: "copy_editing", genres: ["Non-Fiction", "Memoir", "Business", "Self-Help"], ratingAvg: "5.0", reviewCount: 142, priceFrom: 400, priceTo: 1200, priceUnit: "per project", completedProjects: 218, featured: true },
  { name: "Elena Vasquez", avatarUrl: "https://i.pravatar.cc/150?u=elena-vasquez", tagline: "Romance & YA specialist — from first draft to final polish", bio: "Passionate about helping romance and young adult authors find their unique voice. I provide detailed, encouraging feedback that helps you see your story's true potential without losing what makes it yours.", service: "developmental_editing", genres: ["Romance", "Young Adult", "Women's Fiction", "New Adult"], ratingAvg: "4.8", reviewCount: 63, priceFrom: 700, priceTo: 2000, priceUnit: "per project", completedProjects: 91, featured: false },
  { name: "David Chen", avatarUrl: "https://i.pravatar.cc/150?u=david-chen-editor", tagline: "Award-winning cover designer — over 500 published covers", bio: "I design covers that stop scrollers and sell books. From bold commercial thrillers to delicate literary fiction, my designs are built around your genre's market expectations while standing out on the shelf.", service: "cover_design", genres: ["Thriller", "Mystery", "Literary Fiction", "Horror"], ratingAvg: "4.9", reviewCount: 201, priceFrom: 300, priceTo: 800, priceUnit: "per project", completedProjects: 512, featured: true },
  { name: "Priya Sharma", avatarUrl: "https://i.pravatar.cc/150?u=priya-sharma-books", tagline: "Final-eye proofreader — zero-error guarantee", bio: "Your book's last line of defense before publication. I catch every stray comma, continuity slip, and formatting inconsistency. Guaranteed turnaround within 7 days for manuscripts under 100k words.", service: "proofreading", genres: ["All Genres"], ratingAvg: "5.0", reviewCount: 178, priceFrom: 200, priceTo: 600, priceUnit: "per project", completedProjects: 289, featured: false },
  { name: "Marcus Webb", avatarUrl: "https://i.pravatar.cc/150?u=marcus-webb-books", tagline: "Author marketing strategist — launches that actually sell", bio: "Former book publicist turned author coach. I build launch strategies, ARC campaigns, and Amazon optimization that get your book in front of real readers. Helped 40+ authors hit Amazon Top 100.", service: "marketing", genres: ["All Genres"], ratingAvg: "4.7", reviewCount: 54, priceFrom: 500, priceTo: 2000, priceUnit: "per project", completedProjects: 68, featured: true },
  { name: "Nadia Fontaine", avatarUrl: "https://i.pravatar.cc/150?u=nadia-fontaine", tagline: "Sci-Fi & Fantasy developmental editor — world-building expert", bio: "Speculative fiction is my world. I help authors build airtight magic systems, believable futures, and alien cultures that feel truly alien. Published author myself with 3 novels in traditional publishing.", service: "developmental_editing", genres: ["Science Fiction", "Fantasy", "Horror", "Dystopian"], ratingAvg: "4.9", reviewCount: 48, priceFrom: 900, priceTo: 2800, priceUnit: "per project", completedProjects: 76, featured: false },
  { name: "Tom Ashworth", avatarUrl: "https://i.pravatar.cc/150?u=tom-ashworth-design", tagline: "Children's & middle-grade illustrator and cover designer", bio: "Bright, playful, and age-appropriate — I design covers and interiors that young readers and parents both love. Experienced in picture books, chapter books, and middle-grade novels.", service: "cover_design", genres: ["Children's", "Middle Grade", "Young Adult"], ratingAvg: "4.8", reviewCount: 93, priceFrom: 400, priceTo: 1000, priceUnit: "per project", completedProjects: 167, featured: false },
];

router.get("/api/marketplace/professionals", async (req, res) => {
  try {
    const { service, genre } = req.query as { service?: string; genre?: string };
    let query = db.select().from(professionals).$dynamic();
    if (service && service !== "all") {
      query = query.where(eq(professionals.service, service));
    }
    const rows = await query;
    const filtered = genre && genre !== "all"
      ? rows.filter(p => Array.isArray(p.genres) && (p.genres as string[]).some(g => g.toLowerCase() === genre.toLowerCase()))
      : rows;
    return res.json(filtered);
  } catch (err) {
    return res.status(500).json({ message: "Failed to fetch professionals" });
  }
});

router.get("/api/marketplace/professionals/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const [pro] = await db.select().from(professionals).where(eq(professionals.id, id));
    if (!pro) return res.status(404).json({ message: "Not found" });
    return res.json(pro);
  } catch (err) {
    return res.status(500).json({ message: "Failed to fetch professional" });
  }
});

const quoteRequestSchema = z.object({
  professionalId: z.number({ coerce: true }).int().positive(),
  authorName: z.string().min(1).max(200),
  authorEmail: z.string().email(),
  bookTitle: z.string().min(1).max(500),
  wordCount: z.number({ coerce: true }).int().positive().optional().nullable(),
  genre: z.string().max(100).optional().nullable(),
  description: z.string().max(5000).optional().nullable(),
  deadline: z.string().max(100).optional().nullable(),
  service: z.string().min(1).max(100),
}).strict();

router.post("/api/marketplace/quote-requests", async (req, res) => {
  try {
    const data = quoteRequestSchema.parse(req.body);
    const [created] = await db.insert(quoteRequests).values({ professionalId: data.professionalId, authorName: data.authorName, authorEmail: data.authorEmail, bookTitle: data.bookTitle, wordCount: data.wordCount ?? null, genre: data.genre ?? null, description: data.description ?? null, deadline: data.deadline ?? null, service: data.service }).returning();
    return res.status(201).json(created);
  } catch (err) {
    return res.status(500).json({ message: "Failed to submit quote request" });
  }
});

// ─── Research Items ────────────────────────────────────────────────────────

router.get("/api/books/:bookId/research", requireBookOwner, async (req, res) => {
  const bookId = parseInt(String(req.params.bookId));
  if (isNaN(bookId)) return res.status(400).json({ message: "Invalid book ID" });
  try {
    const items = await db.select().from(researchItemsTable).where(eq(researchItemsTable.bookId, bookId));
    return res.json(items);
  } catch {
    return res.status(500).json({ message: "Failed to fetch research items" });
  }
});

const researchItemSchema = z.object({
  type: z.enum(["note", "link", "image"]).default("note"),
  title: z.string().max(500).optional().nullable(),
  content: z.string().max(50000).default(""),
  previewImageUrl: z.string().url().optional().nullable(),
  description: z.string().max(2000).optional().nullable(),
  color: z.string().max(50).default("default"),
}).strict();

router.post("/api/books/:bookId/research", requireBookOwner, async (req, res) => {
  const bookId = parseInt(String(req.params.bookId));
  if (isNaN(bookId)) return res.status(400).json({ message: "Invalid book ID" });
  const parsed = researchItemSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ message: "Invalid input" });
  const { type, title, content, previewImageUrl, description, color } = parsed.data;
  try {
    const [item] = await db.insert(researchItemsTable).values({ bookId, type, title, content, previewImageUrl, description, color }).returning();
    return res.status(201).json(item);
  } catch {
    return res.status(500).json({ message: "Failed to create research item" });
  }
});

router.put("/api/books/:bookId/research/:id", requireBookOwner, async (req, res) => {
  const id = parseInt(String(req.params.id));
  if (isNaN(id)) return res.status(400).json({ message: "Invalid ID" });
  const { type, title, content, previewImageUrl, description, color } = req.body;
  try {
    const [item] = await db.update(researchItemsTable).set({ type, title, content, previewImageUrl, description, color }).where(eq(researchItemsTable.id, id)).returning();
    if (!item) return res.status(404).json({ message: "Not found" });
    return res.json(item);
  } catch {
    return res.status(500).json({ message: "Failed to update research item" });
  }
});

router.delete("/api/books/:bookId/research/:id", requireBookOwner, async (req, res) => {
  const id = parseInt(String(req.params.id));
  if (isNaN(id)) return res.status(400).json({ message: "Invalid ID" });
  try {
    await db.delete(researchItemsTable).where(eq(researchItemsTable.id, id));
    return res.status(204).send();
  } catch {
    return res.status(500).json({ message: "Failed to delete research item" });
  }
});

// ─── ISBN ──────────────────────────────────────────────────────────────────

router.patch("/api/books/:bookId/isbn", requireBookOwner, async (req: any, res: any) => {
  const bookId = parseInt(req.params.bookId);
  if (isNaN(bookId)) return res.status(400).json({ message: "Invalid bookId" });
  const { isbn } = req.body as { isbn?: string };
  try {
    const book = await storage.updateBook(bookId, { isbn: isbn ?? null } as any);
    return res.json(book);
  } catch {
    return res.status(500).json({ message: "Failed to update ISBN" });
  }
});

// ─── ISBN Barcode Generator ────────────────────────────────────────────────

router.get("/api/isbn/validate/:isbn", (req, res) => {
  const isbn = req.params.isbn.replace(/[-\s]/g, "");
  if (isbn.length === 13 && /^\d{13}$/.test(isbn)) {
    // ISBN-13 checksum
    let sum = 0;
    for (let i = 0; i < 12; i++) sum += parseInt(isbn[i]) * (i % 2 === 0 ? 1 : 3);
    const check = (10 - (sum % 10)) % 10;
    const valid = check === parseInt(isbn[12]);
    return res.json({ valid, isbn, type: "ISBN-13" });
  }
  if (isbn.length === 10 && /^\d{9}[\dX]$/.test(isbn)) {
    let sum = 0;
    for (let i = 0; i < 9; i++) sum += parseInt(isbn[i]) * (10 - i);
    const check = (11 - (sum % 11)) % 11;
    const valid = check === (isbn[9] === "X" ? 10 : parseInt(isbn[9]));
    return res.json({ valid, isbn, type: "ISBN-10" });
  }
  return res.json({ valid: false, isbn, type: "Unknown" });
});

// Pure EAN-13 barcode SVG generator (no DOM dependency)
function generateEAN13SVG(isbn: string, opts: { width?: number; height?: number; barHeight?: number } = {}): string {
  const w = opts.width || 2;
  const h = opts.barHeight || 80;
  const PATTERNS_L = ["0001101","0011001","0010011","0111101","0100011","0110001","0101111","0111011","0110111","0001011"];
  const PATTERNS_R = ["1110010","1100110","1101100","1000010","1011100","1001110","1010000","1000100","1001000","1110100"];
  const PATTERNS_G = ["0100111","0110011","0011011","0100001","0011101","0111001","0000101","0010001","0001001","0010111"];
  const PARITY = ["LLLLLL","LLGLGG","LLGGLG","LLGGGL","LGLLGG","LGGLLG","LGGGLL","LGLGLG","LGLGGL","LGGLGL"];
  const digits = isbn.split("").map(Number);
  const parity = PARITY[digits[0]];
  let bars = "101"; // Start guard
  for (let i = 1; i <= 6; i++) bars += parity[i-1] === "L" ? PATTERNS_L[digits[i]] : PATTERNS_G[digits[i]];
  bars += "01010"; // Center guard
  for (let i = 7; i <= 12; i++) bars += PATTERNS_R[digits[i]];
  bars += "101"; // End guard
  const totalW = bars.length * w + 20;
  const totalH = h + 30;
  let svgBars = "";
  for (let i = 0; i < bars.length; i++) {
    if (bars[i] === "1") svgBars += `<rect x="${10 + i * w}" y="5" width="${w}" height="${h}" fill="black"/>`;
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${totalW}" height="${totalH}" viewBox="0 0 ${totalW} ${totalH}">
    <rect width="100%" height="100%" fill="white"/>
    ${svgBars}
    <text x="${totalW/2}" y="${h + 22}" text-anchor="middle" font-family="monospace" font-size="14" fill="black">${isbn}</text>
  </svg>`;
}

router.get("/api/isbn/barcode/:isbn", (req, res) => {
  const isbn = req.params.isbn.replace(/[-\s]/g, "");
  if (!/^\d{13}$/.test(isbn)) return res.status(400).json({ message: "ISBN-13 required for barcode" });
  const svg = generateEAN13SVG(isbn);
  res.setHeader("Content-Type", "image/svg+xml");
  return res.send(svg);
});

router.get("/api/isbn/barcode/:isbn/download", (req, res) => {
  const isbn = req.params.isbn.replace(/[-\s]/g, "");
  if (!/^\d{13}$/.test(isbn)) return res.status(400).json({ message: "ISBN-13 required" });
  const svg = generateEAN13SVG(isbn, { width: 3, barHeight: 120 });
  res.setHeader("Content-Type", "image/svg+xml");
  res.setHeader("Content-Disposition", `attachment; filename=isbn-barcode-${isbn}.svg`);
  return res.send(svg);
});

// ─── ARC Recipients ────────────────────────────────────────────────────────

router.get("/api/books/:bookId/arc", requireBookOwner, async (req: any, res: any) => {
  const bookId = parseInt(req.params.bookId);
  if (isNaN(bookId)) return res.status(400).json({ message: "Invalid bookId" });
  try {
    const rows = await db.select().from(arcRecipientsTable).where(eq(arcRecipientsTable.bookId, bookId));
    return res.json(rows);
  } catch {
    return res.status(500).json({ message: "Failed to fetch ARC recipients" });
  }
});

router.post("/api/books/:bookId/arc", requireBookOwner, async (req: any, res: any) => {
  const bookId = parseInt(req.params.bookId);
  if (isNaN(bookId)) return res.status(400).json({ message: "Invalid bookId" });
  const { name, email, note } = req.body as { name: string; email: string; note?: string };
  if (!name || !email) return res.status(400).json({ message: "name and email required" });
  try {
    const [row] = await db.insert(arcRecipientsTable).values({ bookId, name, email, note: note ?? null, status: "sent" }).returning();
    return res.status(201).json(row);
  } catch {
    return res.status(500).json({ message: "Failed to add ARC recipient" });
  }
});

router.patch("/api/books/:bookId/arc/:id", requireBookOwner, async (req: any, res: any) => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) return res.status(400).json({ message: "Invalid id" });
  const statusSchema = z.object({ status: z.enum(["sent", "opened", "reviewed", "declined"]).default("sent") }).strict();
  const parsed = statusSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ message: "Invalid status" });
  const { status } = parsed.data;
  try {
    const [row] = await db.update(arcRecipientsTable).set({ status }).where(eq(arcRecipientsTable.id, id)).returning();
    return res.json(row);
  } catch {
    return res.status(500).json({ message: "Failed to update ARC recipient" });
  }
});

router.delete("/api/books/:bookId/arc/:id", requireBookOwner, async (req: any, res: any) => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) return res.status(400).json({ message: "Invalid id" });
  try {
    await db.delete(arcRecipientsTable).where(eq(arcRecipientsTable.id, id));
    return res.status(204).send();
  } catch {
    return res.status(500).json({ message: "Failed to delete ARC recipient" });
  }
});

// Seed professionals if none exist (runs once on first import)
(async () => {
  try {
    const existingPros = await db.select().from(professionals);
    if (existingPros.length === 0) {
      await db.insert(professionals).values(SEED_PROFESSIONALS as any[]);
    }
  } catch { /* table might not exist yet */ }
})();

// ── Marketplace Usage ────────────────────────────────────────────────────

import { getUserTier, getTierLimits, checkMarketplaceLimit, recordMarketplaceUsage, getMarketplaceHistory } from "../lib/tier-limits";

// GET /api/marketplace/usage — current user's marketplace usage + limits.
// Admins bypass all tier enforcement so they can test the marketplace
// end-to-end without a paid subscription.
router.get("/api/marketplace/usage", async (req, res) => {
  try {
    if (!req.isAuthenticated() || !req.user) return res.status(401).json({ message: "Not authenticated" });
    const user = await storage.getUserById(req.user.id);
    if (!user) return res.status(401).json({ message: "User not found" });

    if (isAdminUser(user)) {
      return res.json({ tier: "admin", canUse: true, allowed: true, remaining: 9999, limit: 9999, used: 0 });
    }

    const tier = getUserTier(user as any);
    const limits = getTierLimits(tier);
    const usage = await checkMarketplaceLimit(req.user.id, tier);
    return res.json({ tier, ...usage, canUse: limits.canUseMarketplace });
  } catch {
    return res.status(500).json({ message: "Internal error" });
  }
});

// GET /api/marketplace/history — user's past analyses
router.get("/api/marketplace/history", async (req, res) => {
  try {
    if (!req.isAuthenticated() || !req.user) return res.status(401).json({ message: "Not authenticated" });
    const history = await getMarketplaceHistory(req.user.id);
    return res.json(history);
  } catch {
    return res.status(500).json({ message: "Internal error" });
  }
});

// POST /api/marketplace/record — record a marketplace usage (called after analysis completes)
router.post("/api/marketplace/record", async (req, res) => {
  try {
    if (!req.isAuthenticated() || !req.user) return res.status(401).json({ message: "Not authenticated" });
    const user = await storage.getUserById(req.user.id);
    if (!user) return res.status(401).json({ message: "User not found" });

    if (!isAdminUser(user)) {
      const tier = getUserTier(user as any);
      const { allowed } = await checkMarketplaceLimit(req.user.id, tier);
      if (!allowed) return res.status(429).json({ message: "Monthly marketplace limit reached. Upgrade your plan for more analyses.", code: "MARKETPLACE_LIMIT" });
    }

    const { serviceId, bookId } = req.body;
    await recordMarketplaceUsage(req.user.id, serviceId, bookId);
    return res.json({ success: true });
  } catch {
    return res.status(500).json({ message: "Internal error" });
  }
});

// ── Tutorials ────────────────────────────────────────────────────────────

import { tutorials } from "../../../../lib/db/src/schema";
import { asc } from "drizzle-orm";

// GET /api/tutorials — public, list published tutorials
router.get("/api/tutorials", async (req, res) => {
  try {
    const all = await db.select().from(tutorials)
      .where(eq(tutorials.published, true))
      .orderBy(asc(tutorials.sortOrder), desc(tutorials.createdAt));
    return res.json(all);
  } catch {
    return res.status(500).json({ message: "Internal error" });
  }
});

// GET /api/admin/tutorials — admin, list ALL tutorials (including unpublished)
router.get("/api/admin/tutorials", requireAdmin, async (req, res) => {
  try {
    const all = await db.select().from(tutorials)
      .orderBy(asc(tutorials.sortOrder), desc(tutorials.createdAt));
    return res.json(all);
  } catch {
    return res.status(500).json({ message: "Internal error" });
  }
});

// POST /api/admin/tutorials — admin, create tutorial
router.post("/api/admin/tutorials", requireAdmin, async (req, res) => {
  try {
    const { title, description, videoUrl, thumbnailUrl, category, duration, sortOrder, published } = req.body;
    if (!title?.trim() || !videoUrl?.trim()) {
      return res.status(400).json({ message: "Title and video URL are required" });
    }
    const [tutorial] = await db.insert(tutorials).values({
      title: title.trim(),
      description: description?.trim() || null,
      videoUrl: videoUrl.trim(),
      thumbnailUrl: thumbnailUrl?.trim() || null,
      category: category || "getting-started",
      duration: duration?.trim() || null,
      sortOrder: sortOrder ?? 0,
      published: published !== false,
    }).returning();
    return res.status(201).json(tutorial);
  } catch {
    return res.status(500).json({ message: "Internal error" });
  }
});

// PATCH /api/admin/tutorials/:id — admin, update tutorial
router.patch("/api/admin/tutorials/:id", requireAdmin, async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (isNaN(id)) return res.status(400).json({ message: "Invalid ID" });
    const updates: any = {};
    const fields = ["title", "description", "videoUrl", "thumbnailUrl", "category", "duration", "sortOrder", "published"];
    for (const f of fields) {
      if (req.body[f] !== undefined) updates[f] = req.body[f];
    }
    updates.updatedAt = new Date();
    const [updated] = await db.update(tutorials).set(updates).where(eq(tutorials.id, id)).returning();
    if (!updated) return res.status(404).json({ message: "Tutorial not found" });
    return res.json(updated);
  } catch {
    return res.status(500).json({ message: "Internal error" });
  }
});

// DELETE /api/admin/tutorials/:id — admin, delete tutorial
router.delete("/api/admin/tutorials/:id", requireAdmin, async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (isNaN(id)) return res.status(400).json({ message: "Invalid ID" });
    await db.delete(tutorials).where(eq(tutorials.id, id));
    return res.json({ success: true });
  } catch {
    return res.status(500).json({ message: "Internal error" });
  }
});

export default router;
