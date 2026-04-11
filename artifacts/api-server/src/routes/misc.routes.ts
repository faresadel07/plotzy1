import { Router } from "express";
import { storage } from "../storage";
import { requireAdmin, requireBookOwner } from "../middleware/auth";
import { db } from "../db";
import { eq } from "drizzle-orm";
import { professionals, quoteRequests, researchItems as researchItemsTable, arcRecipients as arcRecipientsTable } from "../../../../lib/db/src/schema";

const router = Router();

// ── Book Series ─────────────────────────────────────────────────────────────

// GET /api/series — list user's series with their books
router.get("/api/series", async (req, res) => {
  try {
    if (!req.isAuthenticated() || !req.user) return res.status(401).json({ message: "Unauthorized" });
    const userId = (req.user as any).id;
    const seriesList = await storage.getUserSeries(userId);
    // Attach books to each series
    const withBooks = await Promise.all(
      seriesList.map(async (s) => {
        const seriesBooks = await storage.getSeriesBooks(s.id);
        return { ...s, books: seriesBooks };
      })
    );
    return res.json(withBooks);
  } catch (err) {
    res.status(500).json({ message: "Internal error" });
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
    res.status(500).json({ message: "Internal error" });
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
    res.status(500).json({ message: "Internal error" });
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
    res.status(500).json({ message: "Internal error" });
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
    res.status(500).json({ message: "Internal error" });
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
    res.status(500).json({ message: "Internal error" });
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
    res.status(500).json({ message: "Internal error" });
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
    res.json(msg);
  } catch (err) {
    res.status(400).json({ message: "Invalid data" });
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
    res.json(tickets);
  } catch (err) {
    res.status(500).json({ message: "Internal error" });
  }
});

// ── Admin: stats ────────────────────────────────────────────────────────
router.get("/api/admin/stats", requireAdmin, async (req, res) => {
  try {
    const stats = await storage.getAdminStats();
    res.json(stats);
  } catch (err) {
    res.status(500).json({ message: "Internal error" });
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
    res.json(safe);
  } catch (err) {
    res.status(500).json({ message: "Internal error" });
  }
});

router.delete("/api/admin/users/:id", requireAdmin, async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (isNaN(id)) return res.status(400).json({ message: "Invalid ID" });
    await storage.deleteUser(id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ message: "Internal error" });
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
    res.json({ success: true, user: updated });
  } catch (err) {
    res.status(500).json({ message: "Internal error" });
  }
});

// ── Admin: books (delete any published book) ────────────────────────────
router.delete("/api/admin/books/:id", requireAdmin, async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (isNaN(id)) return res.status(400).json({ message: "Invalid ID" });
    await storage.deleteBook(id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ message: "Internal error" });
  }
});

// ── Banner (public read) ─────────────────────────────────────────────────
router.get("/api/banner", async (req, res) => {
  try {
    const message = await storage.getSetting("banner_message");
    const color = await storage.getSetting("banner_color");
    res.json({ message, color });
  } catch (err) {
    res.status(500).json({ message: "Internal error" });
  }
});

// ── Admin: banner management ─────────────────────────────────────────────
router.post("/api/admin/banner", requireAdmin, async (req, res) => {
  try {
    const { message, color } = req.body;
    if (!message?.trim()) return res.status(400).json({ message: "Message required" });
    await storage.setSetting("banner_message", message.trim());
    await storage.setSetting("banner_color", color || "default");
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ message: "Internal error" });
  }
});

router.delete("/api/admin/banner", requireAdmin, async (req, res) => {
  try {
    await storage.setSetting("banner_message", null);
    await storage.setSetting("banner_color", null);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ message: "Internal error" });
  }
});

// ── Admin: suspend/unsuspend user ─────────────────────────────────────────
router.patch("/api/admin/users/:id/suspend", requireAdmin, async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (isNaN(id)) return res.status(400).json({ message: "Invalid ID" });
    const { suspended } = req.body;
    const user = await storage.suspendUser(id, !!suspended);
    res.json(user);
  } catch (err) {
    res.status(500).json({ message: "Internal error" });
  }
});

// ── Admin: activity feed ─────────────────────────────────────────────────
router.get("/api/admin/activity", requireAdmin, async (req, res) => {
  try {
    const feed = await storage.getActivityFeed();
    res.json(feed);
  } catch (err) {
    res.status(500).json({ message: "Internal error" });
  }
});

// ── Admin: unread support count (used for nav badge) ──────────────────────
router.get("/api/admin/support/unread-count", requireAdmin, async (req, res) => {
  try {
    const messages = await storage.getSupportMessages();
    const count = messages.filter((m: any) => !m.read).length;
    res.json({ count });
  } catch (err) {
    res.status(500).json({ message: "Internal error" });
  }
});

// ── Admin: support messages ──────────────────────────────────────────────
router.get("/api/admin/support", requireAdmin, async (req, res) => {
  try {
    const messages = await storage.getSupportMessages();
    res.json(messages);
  } catch (err) {
    res.status(500).json({ message: "Internal error" });
  }
});

router.patch("/api/admin/support/:id", requireAdmin, async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (isNaN(id)) return res.status(400).json({ message: "Invalid ID" });
    const { read, status } = req.body;
    const msg = await storage.updateSupportMessage(id, { read, status });
    res.json(msg);
  } catch (err) {
    res.status(500).json({ message: "Internal error" });
  }
});

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
    res.json(filtered);
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch professionals" });
  }
});

router.get("/api/marketplace/professionals/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const [pro] = await db.select().from(professionals).where(eq(professionals.id, id));
    if (!pro) return res.status(404).json({ message: "Not found" });
    res.json(pro);
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch professional" });
  }
});

router.post("/api/marketplace/quote-requests", async (req, res) => {
  try {
    const { professionalId, authorName, authorEmail, bookTitle, wordCount, genre, description, deadline, service } = req.body;
    if (!professionalId || !authorName || !authorEmail || !bookTitle || !service) {
      return res.status(400).json({ message: "Missing required fields" });
    }
    const [created] = await db.insert(quoteRequests).values({ professionalId: parseInt(professionalId), authorName, authorEmail, bookTitle, wordCount: wordCount ? parseInt(wordCount) : null, genre, description, deadline, service }).returning();
    res.status(201).json(created);
  } catch (err) {
    res.status(500).json({ message: "Failed to submit quote request" });
  }
});

// ─── Research Items ────────────────────────────────────────────────────────

router.get("/api/books/:bookId/research", requireBookOwner, async (req, res) => {
  const bookId = parseInt(req.params.bookId);
  if (isNaN(bookId)) return res.status(400).json({ message: "Invalid book ID" });
  try {
    const items = await db.select().from(researchItemsTable).where(eq(researchItemsTable.bookId, bookId));
    res.json(items);
  } catch {
    res.status(500).json({ message: "Failed to fetch research items" });
  }
});

router.post("/api/books/:bookId/research", requireBookOwner, async (req, res) => {
  const bookId = parseInt(req.params.bookId);
  if (isNaN(bookId)) return res.status(400).json({ message: "Invalid book ID" });
  const { type = "note", title, content = "", previewImageUrl, description, color } = req.body;
  try {
    const [item] = await db.insert(researchItemsTable).values({ bookId, type, title, content, previewImageUrl, description, color }).returning();
    res.status(201).json(item);
  } catch {
    res.status(500).json({ message: "Failed to create research item" });
  }
});

router.put("/api/books/:bookId/research/:id", requireBookOwner, async (req, res) => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) return res.status(400).json({ message: "Invalid ID" });
  const { type, title, content, previewImageUrl, description, color } = req.body;
  try {
    const [item] = await db.update(researchItemsTable).set({ type, title, content, previewImageUrl, description, color }).where(eq(researchItemsTable.id, id)).returning();
    if (!item) return res.status(404).json({ message: "Not found" });
    res.json(item);
  } catch {
    res.status(500).json({ message: "Failed to update research item" });
  }
});

router.delete("/api/books/:bookId/research/:id", requireBookOwner, async (req, res) => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) return res.status(400).json({ message: "Invalid ID" });
  try {
    await db.delete(researchItemsTable).where(eq(researchItemsTable.id, id));
    res.status(204).send();
  } catch {
    res.status(500).json({ message: "Failed to delete research item" });
  }
});

// ─── ISBN ──────────────────────────────────────────────────────────────────

router.patch("/api/books/:bookId/isbn", requireBookOwner, async (req: any, res: any) => {
  const bookId = parseInt(req.params.bookId);
  if (isNaN(bookId)) return res.status(400).json({ message: "Invalid bookId" });
  const { isbn } = req.body as { isbn?: string };
  try {
    const book = await storage.updateBook(bookId, { isbn: isbn ?? null } as any);
    res.json(book);
  } catch {
    res.status(500).json({ message: "Failed to update ISBN" });
  }
});

// ─── ARC Recipients ────────────────────────────────────────────────────────

router.get("/api/books/:bookId/arc", requireBookOwner, async (req: any, res: any) => {
  const bookId = parseInt(req.params.bookId);
  if (isNaN(bookId)) return res.status(400).json({ message: "Invalid bookId" });
  try {
    const rows = await db.select().from(arcRecipientsTable).where(eq(arcRecipientsTable.bookId, bookId));
    res.json(rows);
  } catch {
    res.status(500).json({ message: "Failed to fetch ARC recipients" });
  }
});

router.post("/api/books/:bookId/arc", requireBookOwner, async (req: any, res: any) => {
  const bookId = parseInt(req.params.bookId);
  if (isNaN(bookId)) return res.status(400).json({ message: "Invalid bookId" });
  const { name, email, note } = req.body as { name: string; email: string; note?: string };
  if (!name || !email) return res.status(400).json({ message: "name and email required" });
  try {
    const [row] = await db.insert(arcRecipientsTable).values({ bookId, name, email, note: note ?? null, status: "sent" }).returning();
    res.status(201).json(row);
  } catch {
    res.status(500).json({ message: "Failed to add ARC recipient" });
  }
});

router.patch("/api/books/:bookId/arc/:id", requireBookOwner, async (req: any, res: any) => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) return res.status(400).json({ message: "Invalid id" });
  const { status } = req.body as { status?: string };
  try {
    const [row] = await db.update(arcRecipientsTable).set({ status: status ?? "sent" }).where(eq(arcRecipientsTable.id, id)).returning();
    res.json(row);
  } catch {
    res.status(500).json({ message: "Failed to update ARC recipient" });
  }
});

router.delete("/api/books/:bookId/arc/:id", requireBookOwner, async (req: any, res: any) => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) return res.status(400).json({ message: "Invalid id" });
  try {
    await db.delete(arcRecipientsTable).where(eq(arcRecipientsTable.id, id));
    res.status(204).send();
  } catch {
    res.status(500).json({ message: "Failed to delete ARC recipient" });
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

// ── Tutorials ────────────────────────────────────────────────────────────

import { tutorials } from "../../../../lib/db/src/schema";
import { desc, asc } from "drizzle-orm";

// GET /api/tutorials — public, list published tutorials
router.get("/api/tutorials", async (req, res) => {
  try {
    const all = await db.select().from(tutorials)
      .where(eq(tutorials.published, true))
      .orderBy(asc(tutorials.sortOrder), desc(tutorials.createdAt));
    res.json(all);
  } catch {
    res.status(500).json({ message: "Internal error" });
  }
});

// GET /api/admin/tutorials — admin, list ALL tutorials (including unpublished)
router.get("/api/admin/tutorials", requireAdmin, async (req, res) => {
  try {
    const all = await db.select().from(tutorials)
      .orderBy(asc(tutorials.sortOrder), desc(tutorials.createdAt));
    res.json(all);
  } catch {
    res.status(500).json({ message: "Internal error" });
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
    res.status(201).json(tutorial);
  } catch {
    res.status(500).json({ message: "Internal error" });
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
    res.json(updated);
  } catch {
    res.status(500).json({ message: "Internal error" });
  }
});

// DELETE /api/admin/tutorials/:id — admin, delete tutorial
router.delete("/api/admin/tutorials/:id", requireAdmin, async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (isNaN(id)) return res.status(400).json({ message: "Invalid ID" });
    await db.delete(tutorials).where(eq(tutorials.id, id));
    res.json({ success: true });
  } catch {
    res.status(500).json({ message: "Internal error" });
  }
});

export default router;
