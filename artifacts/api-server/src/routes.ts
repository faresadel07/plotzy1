import type { Express, Request } from "express";
import type { Server } from "http";
import { storage } from "./storage";
import { api } from "../../../lib/shared/src/routes";
import { checkAndUnlockAchievements } from "./achievements-engine";
import { z } from "zod";
import OpenAI, { toFile } from "openai";
import express from "express";
import fs from "fs";
import path from "path";
import os from "os";
import multer from "multer";
import mammoth from "mammoth";
import { FREE_TRIAL_MAX_CHAPTERS, FREE_TRIAL_MAX_WORDS, loreEntries as loreEntriesTable, storyBeats as storyBeatsTable, chapterSnapshots, bookCollaborators } from "../../../lib/db/src/schema";
import { requireAdmin, requireBookOwner, requireBookOwnerStrict, requireChapterOwner, requireChildOwner, requireEmailVerified } from "./middleware/auth";
import { aiLimiter, imageGenLimiter, tierAiLimiter, publicReadLimiter } from "./middleware/rate-limit";
import socialRouter from "./routes/social.routes";
import authRouter from "./routes/auth.routes";
import paymentsRouter from "./routes/payments.routes";
import gutenbergRouter, { syncGutenbergCatalog, precacheTopBooks } from "./routes/gutenberg.routes";
import adminRouter from "./routes/admin.routes";
import miscRouter from "./routes/misc.routes";
import { logger } from "./lib/logger";

const isMockOpenAI = !process.env.AI_INTEGRATIONS_OPENAI_API_KEY && !process.env.OPENAI_API_KEY;

// Guard middleware: return 503 if OpenAI key is missing instead of crashing
const requireOpenAI = (req: any, res: any, next: any) => {
  if (isMockOpenAI) {
    return res.status(503).json({ message: "AI features are not available — OpenAI API key is not configured." });
  }
  next();
};

function isSubscriptionActive(user: Express.User): boolean {
  if (user.subscriptionStatus === "active") {
    if (user.subscriptionEndDate && new Date(user.subscriptionEndDate) < new Date()) {
      return false;
    }
    return true;
  }
  return false;
}

function countWords(content: string): number {
  if (!content) return 0;
  let text = content;
  try {
    const parsed = JSON.parse(content);
    if (Array.isArray(parsed)) text = parsed.join(" ");
  } catch { }
  return text.trim().split(/\s+/).filter(w => w.length > 0).length;
}

const openai = new OpenAI({
  apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY || process.env.OPENAI_API_KEY || "missing-openai-key",
  baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
});

// Default chat/completion model — env-configurable so we can swap AI
// providers (OpenAI, Groq, local LLM) without editing each call site.
const AI_TEXT_MODEL = process.env.AI_TEXT_MODEL || "llama-3.3-70b-versatile";

// Speech-to-text model. Defaults to Groq's Whisper Large v3 Turbo (free,
// fast, 90+ languages). Override via AI_TRANSCRIBE_MODEL when pointing at
// api.openai.com (where the equivalent is "gpt-4o-mini-transcribe").
const AI_TRANSCRIBE_MODEL = process.env.AI_TRANSCRIBE_MODEL || "whisper-large-v3-turbo";

// Language name lookup (code -> English name)
const LANGUAGE_NAMES: Record<string, string> = {
  en: "English", ar: "Arabic", fr: "French", es: "Spanish", de: "German",
  it: "Italian", pt: "Portuguese", ru: "Russian", zh: "Chinese", ja: "Japanese",
  ko: "Korean", tr: "Turkish", nl: "Dutch", pl: "Polish", sv: "Swedish",
  da: "Danish", fi: "Finnish", no: "Norwegian", he: "Hebrew", fa: "Persian",
  hi: "Hindi", bn: "Bengali", ur: "Urdu", id: "Indonesian", ms: "Malay",
  th: "Thai", vi: "Vietnamese", ro: "Romanian", hu: "Hungarian", cs: "Czech",
  el: "Greek", uk: "Ukrainian", sk: "Slovak", hr: "Croatian", bg: "Bulgarian",
  sr: "Serbian", lt: "Lithuanian", lv: "Latvian", et: "Estonian", sl: "Slovenian",
  ca: "Catalan", sw: "Swahili", af: "Afrikaans", am: "Amharic", tl: "Filipino",
};

function getLangName(code: string): string {
  return LANGUAGE_NAMES[code] || code;
}

function isRTL(code: string): boolean {
  return ["ar", "he", "fa", "ur"].includes(code);
}

// Per-(IP, target) sliding-window cap for public comment endpoints. The
// global writeLimiter (30/min/IP) is too loose to stop an attacker from
// pasting hundreds of comments onto a single book in an hour. The bucket
// key is supplied by the caller — `${ip}:${bookId}` for book comments,
// `${ip}:${bookId}:${chapterId}` for inline. Process-local; a multi-pod
// deployment will need a Redis-backed version eventually.
const COMMENT_RATE_WINDOW_MS = 60 * 60 * 1000; // 1 hour
const COMMENT_RATE_MAX = 10;
const commentRateBuckets = new Map<string, number[]>();
function allowCommentBurst(key: string): boolean {
  const now = Date.now();
  const recent = (commentRateBuckets.get(key) ?? []).filter(t => now - t < COMMENT_RATE_WINDOW_MS);
  if (recent.length >= COMMENT_RATE_MAX) return false;
  recent.push(now);
  commentRateBuckets.set(key, recent);
  if (commentRateBuckets.size > 10_000) {
    for (const [k, v] of commentRateBuckets) {
      if (v.every(t => now - t >= COMMENT_RATE_WINDOW_MS)) commentRateBuckets.delete(k);
    }
  }
  return true;
}

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {

  // Set up multer for memory storage
  const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });

  // ─── Books ─────────────────────────────────────────────────────────────────

  app.get(api.books.list.path, async (req, res) => {
    const sess = req.session as any;
    // Parse guestIds from query param (sent by localStorage on the client)
    const rawGuestIds = (req.query.guestIds as string) || "";
    const queryGuestIds: number[] = rawGuestIds.split(",").filter(Boolean).map(Number).filter(n => !isNaN(n) && n > 0);

    if (req.isAuthenticated() && req.user) {
      const userId = (req.user as any).id;
      // Claim guest books from session AND from localStorage (query param)
      const sessionGuestIds: number[] = sess.guestBookIds || [];
      const allGuestIds = [...new Set([...sessionGuestIds, ...queryGuestIds])];
      if (allGuestIds.length > 0) {
        await storage.claimGuestBooks(allGuestIds, userId);
        sess.guestBookIds = [];
      }
      const userBooks = await storage.getUserBooks(userId);
      return res.json(userBooks);
    }

    // Not authenticated: use localStorage IDs from query + session IDs
    const sessionGuestIds: number[] = sess.guestBookIds || [];
    const allGuestIds = [...new Set([...sessionGuestIds, ...queryGuestIds])];

    if (allGuestIds.length > 0) {
      // SECURITY: only return books that are still owner-less. A stale or
      // forged guest ID must never expose a user-owned book.
      const guestBooks = await storage.getGuestBooksByIds(allGuestIds);
      return res.json(guestBooks);
    }

    // Unauthenticated and no guest IDs: return empty, never leak every orphan
    // book in the database.
    return res.json([]);
  });

  app.get(api.books.trashList.path, async (req, res) => {
    const books = await storage.getDeletedBooks();
    res.json(books);
  });

  // IMPORTANT: /api/books/shared-with-me MUST be before /api/books/:id
  // otherwise Express matches "shared-with-me" as an :id parameter
  app.get("/api/books/shared-with-me", async (req, res) => {
    try {
      if (!req.isAuthenticated() || !req.user) return res.status(401).json({ message: "Not authenticated" });
      const userId = (req.user as any).id;
      const { db: dbConn } = await import("./db");
      const { bookCollaborators, books, users } = await import("../../../lib/db/src/schema");
      const { eq } = await import("drizzle-orm");
      const rows = await dbConn.select({
        id: books.id, title: books.title, coverImage: books.coverImage,
        role: bookCollaborators.role, joinedAt: bookCollaborators.joinedAt,
        ownerName: users.displayName,
      }).from(bookCollaborators)
        .innerJoin(books, eq(bookCollaborators.bookId, books.id))
        .leftJoin(users, eq(books.userId, users.id))
        .where(eq(bookCollaborators.userId, userId));
      res.json(rows);
    } catch (err) {
      logger.error({ err }, "Failed to fetch shared books");
      res.json([]);
    }
  });

  // Books the current user owns that have collaborators (they shared with others)
  app.get("/api/books/shared-by-me", async (req, res) => {
    try {
      if (!req.isAuthenticated() || !req.user) return res.status(401).json({ message: "Not authenticated" });
      const userId = (req.user as any).id;
      const { db: dbConn } = await import("./db");
      const { bookCollaborators, books, users } = await import("../../../lib/db/src/schema");
      const { eq } = await import("drizzle-orm");
      const rows = await dbConn.select({
        bookId: books.id,
        bookTitle: books.title,
        bookCoverImage: books.coverImage,
        collabUserId: bookCollaborators.userId,
        collabRole: bookCollaborators.role,
        collabJoinedAt: bookCollaborators.joinedAt,
        collabName: users.displayName,
        collabAvatarUrl: users.avatarUrl,
      }).from(bookCollaborators)
        .innerJoin(books, eq(bookCollaborators.bookId, books.id))
        .leftJoin(users, eq(bookCollaborators.userId, users.id))
        .where(eq(books.userId, userId));
      const grouped = new Map<number, any>();
      for (const r of rows) {
        if (!grouped.has(r.bookId)) {
          grouped.set(r.bookId, { id: r.bookId, title: r.bookTitle, coverImage: r.bookCoverImage, collaborators: [] });
        }
        grouped.get(r.bookId).collaborators.push({
          userId: r.collabUserId, name: r.collabName, avatarUrl: r.collabAvatarUrl,
          role: r.collabRole, joinedAt: r.collabJoinedAt,
        });
      }
      res.json(Array.from(grouped.values()));
    } catch (err) {
      logger.error({ err }, "Failed to fetch shared-by-me");
      res.json([]);
    }
  });

  // Public for published books, owner/collaborator/guest-session only for
  // private drafts. Without this gate the entire Plotzy library leaks by
  // id-enumeration. Returns 404 (not 403) on access failure so callers
  // can't enumerate which ids exist.
  app.get(api.books.get.path, async (req, res) => {
    try {
      const bookId = Number(req.params.id);
      if (!bookId || isNaN(bookId)) return res.status(400).json({ message: "Invalid book id" });
      const book = await storage.getBook(bookId);
      if (!book) return res.status(404).json({ message: "Book not found" });

      if (book.isPublished) return res.json(book);

      const userId = req.isAuthenticated() && req.user ? (req.user as any).id : null;
      if (userId && book.userId === userId) return res.json(book);

      if (userId) {
        const { db: dbConn } = await import("./db");
        const { eq, and } = await import("drizzle-orm");
        const [collab] = await dbConn.select().from(bookCollaborators)
          .where(and(eq(bookCollaborators.bookId, bookId), eq(bookCollaborators.userId, userId)));
        if (collab) return res.json(book);
      }

      // Late-claim path. A user who started a draft as a guest then
      // signed in (or navigated directly to /books/:id without going
      // through the books-list endpoint that normally auto-claims)
      // would otherwise get locked out of their own work — book.userId
      // is null but the user is authenticated, so neither the
      // owner-by-userId branch above nor the guest-session branch
      // below matches. Trust either:
      //   (a) the session.guestBookIds list, OR
      //   (b) a guestIds=… query parameter (frontend reads localStorage
      //       and forwards it; same trust model as the books-list
      //       endpoint at line ~127).
      // If either source vouches that THIS bookId belongs to THIS user
      // and the book is still ownerless, claim it inline + return.
      if (userId && book.userId === null) {
        const sess = req.session as any;
        const sessionGuestIds: number[] = sess?.guestBookIds || [];
        const rawQueryIds = (req.query.guestIds as string) || "";
        const queryGuestIds: number[] = rawQueryIds
          .split(",")
          .filter(Boolean)
          .map(Number)
          .filter(n => !isNaN(n) && n > 0);
        if (sessionGuestIds.includes(bookId) || queryGuestIds.includes(bookId)) {
          await storage.claimGuestBooks([bookId], userId);
          // Drop the now-claimed id from session so subsequent loads
          // don't try to re-claim. Query-supplied IDs are stateless.
          if (sessionGuestIds.includes(bookId)) {
            sess.guestBookIds = sessionGuestIds.filter(id => id !== bookId);
          }
          // Re-fetch so userId is the current user and the response
          // shape is consistent.
          const claimed = await storage.getBook(bookId);
          if (claimed) return res.json(claimed);
        }
      }

      // Guest session fallback for anonymous users who started the draft.
      if (!userId && book.userId === null) {
        const sess = req.session as any;
        const guestIds: number[] = sess?.guestBookIds || [];
        if (guestIds.includes(bookId)) return res.json(book);
      }

      return res.status(404).json({ message: "Book not found" });
    } catch {
      return res.status(500).json({ message: "Internal error" });
    }
  });

  app.post(api.books.create.path, async (req, res) => {
    try {
      const input = api.books.create.input.parse(req.body);
      if (!input.title || !input.title.trim()) {
        return res.status(400).json({ message: "Book title is required" });
      }
      input.title = input.title.trim();
      if (req.user) input.userId = (req.user as any).id;
      const book = await storage.createBook(input);
      // Track guest books in session so they can be claimed on login
      if (!req.user) {
        const sess = req.session as any;
        if (!sess.guestBookIds) sess.guestBookIds = [];
        if (!sess.guestBookIds.includes(book.id)) sess.guestBookIds.push(book.id);
      }
      res.status(201).json(book);
    } catch (err) {
      if (err instanceof z.ZodError) return res.status(400).json({ message: err.errors[0].message });
      res.status(500).json({ message: "Internal error" });
    }
  });

  app.put(api.books.update.path, requireBookOwner, async (req, res) => {
    try {
      const input = api.books.update.input.parse(req.body);
      const book = await storage.updateBook(Number(req.params.id), input);
      res.json(book);
    } catch (err) {
      if (err instanceof z.ZodError) return res.status(400).json({ message: err.errors[0].message });
      res.status(500).json({ message: "Internal error" });
    }
  });

  app.patch(api.books.trash.path, requireBookOwnerStrict, async (req, res) => {
    try {
      const book = await storage.updateBook(Number(req.params.id), { isDeleted: true } as any);
      res.json(book);
    } catch (err) {
      res.status(500).json({ message: "Internal error" });
    }
  });

  app.patch(api.books.restore.path, requireBookOwnerStrict, async (req, res) => {
    try {
      const book = await storage.updateBook(Number(req.params.id), { isDeleted: false } as any);
      res.json(book);
    } catch (err) {
      res.status(500).json({ message: "Internal error" });
    }
  });

  app.delete(api.books.delete.path, requireBookOwnerStrict, async (req, res) => {
    try {
      await storage.deleteBook(Number(req.params.id));
      res.status(204).send();
    } catch (err) {
      res.status(500).json({ message: "Internal error" });
    }
  });

  // ─── Publish / Unpublish Book ───────────────────────────────────────────────

  // Publishing exposes content to the public — gate behind verified
  // email so throwaway accounts can't flood the library.
  app.post("/api/books/:id/publish", requireEmailVerified, async (req, res) => {
    try {
      const bookId = Number(req.params.id);
      const book = await storage.getBook(bookId);
      if (!book) return res.status(404).json({ message: "Book not found" });

      const sess = req.session as any;
      const isAuthenticated = req.isAuthenticated() && req.user;
      const sessionGuestIds: number[] = sess.guestBookIds || [];
      // Only trust session-stored guest IDs — never accept from request body
      const isGuestOwner = !isAuthenticated && (book.userId === null) && sessionGuestIds.includes(bookId);

      if (!isAuthenticated && !isGuestOwner) {
        return res.status(401).json({ message: "Not authenticated" });
      }

      if (isAuthenticated) {
        const userId = (req.user as any).id;
        if (book.userId !== null && book.userId !== userId) return res.status(403).json({ message: "Forbidden" });
        // Assign ownership if book was created before user authenticated
        if (book.userId === null) await storage.updateBook(bookId, { userId } as any);
      }

      const { publish } = req.body as { publish: boolean };
      const updated = await storage.publishBook(bookId, !!publish);

      // Gamification: track publish stats and check achievements (auth users only)
      if (isAuthenticated) {
        try {
          const userId = (req.user as any).id;
          if (publish && !book.isPublished) {
            await storage.incrementUserPublished(userId);
          } else if (!publish && book.isPublished) {
            await storage.decrementUserPublished(userId);
          }
          const stats = await storage.getOrCreateUserStats(userId);
          const newAchievements = await checkAndUnlockAchievements(userId, stats);
          return res.json({ ...updated, newAchievements: newAchievements.map(a => a.id) });
        } catch {
          return res.json(updated);
        }
      }

      return res.json(updated);
    } catch (err: any) {
      if (err.message === "EMPTY_BOOK") {
        return res.status(400).json({ message: "Book must have at least one chapter to publish" });
      }
      if (err.message === "EMPTY_ARTICLE") {
        return res.status(400).json({ message: "Article has no content to publish" });
      }
      res.status(500).json({ message: "Internal error" });
    }
  });

  // ─── Public Library ────────────────────────────────────────────────────────

  app.get("/api/public/books/featured", async (_req, res) => {
    try {
      const book = await storage.getFeaturedBook();
      if (!book) return res.status(404).json({ message: "No featured book" });
      res.json(book);
    } catch (err) {
      res.status(500).json({ message: "Internal error" });
    }
  });

  app.post("/api/admin/books/:id/feature", requireAdmin, async (req, res) => {
    try {
      const bookId = Number(req.params.id);
      const { feature } = z.object({ feature: z.boolean() }).parse(req.body);
      await storage.setFeaturedBook(feature ? bookId : null);
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ message: "Internal error" });
    }
  });

  // ── Published articles ──
  app.get("/api/public/articles", async (_req, res) => {
    try {
      const articles = await storage.getPublishedArticles();
      res.json(articles);
    } catch { res.json([]); }
  });

  app.get("/api/public/books", async (_req, res) => {
    try {
      const publishedBooks = await storage.getPublishedBooks();
      res.json(publishedBooks);
    } catch (err) {
      res.status(500).json({ message: "Internal error" });
    }
  });

  app.get("/api/public/books/:id", async (req, res) => {
    try {
      const book = await storage.getPublishedBook(Number(req.params.id));
      if (!book || !book.isPublished) return res.status(404).json({ message: "Book not found" });
      res.json(book);
    } catch (err) {
      res.status(500).json({ message: "Internal error" });
    }
  });

  app.get("/api/public/books/:id/chapters", async (req, res) => {
    try {
      const book = await storage.getPublishedBook(Number(req.params.id));
      if (!book || !book.isPublished) return res.status(404).json({ message: "Book not found" });
      const chapterList = await storage.getPublishedBookChapters(Number(req.params.id));
      res.json(chapterList);
    } catch (err) {
      res.status(500).json({ message: "Internal error" });
    }
  });

  app.post("/api/public/books/:id/view", publicReadLimiter, async (req, res) => {
    try {
      const bookId = Number(req.params.id);
      await storage.incrementBookViewCount(bookId);
      // Gamification: credit views to the book owner
      try {
        const book = await storage.getBook(bookId);
        if (book?.userId) {
          await storage.incrementUserViews(book.userId, 1);
          const stats = await storage.getOrCreateUserStats(book.userId);
          await checkAndUnlockAchievements(book.userId, stats);
        }
      } catch { /* non-blocking */ }
      res.json({ ok: true });
    } catch (err) {
      res.status(500).json({ message: "Internal error" });
    }
  });

  // ─── Book Comments & Ratings (public) ──────────────────────────────────────

  app.get("/api/public/books/:id/comments", async (req, res) => {
    try {
      const bookId = Number(req.params.id);
      const comments = await storage.getBookComments(bookId);
      res.json(comments);
    } catch { res.json([]); }
  });

  app.post("/api/public/books/:id/comments", requireEmailVerified, async (req, res) => {
    try {
      const bookId = Number(req.params.id);
      // Per-(IP, book) cap of 10 comments / hour. Without this, the
      // global writeLimiter (30/min/IP) lets one user flood any single
      // book with 600 comments per hour. Comments are public, so this
      // is the spam surface most likely to be exploited.
      if (!allowCommentBurst(`${req.ip}:${bookId}`)) {
        return res.status(429).json({ message: "Too many comments on this book. Try again later." });
      }
      const { content, authorName } = req.body;
      if (!content?.trim()) return res.status(400).json({ message: "Comment is required" });
      const userId = req.isAuthenticated() && req.user ? (req.user as any).id : null;
      // Authenticated callers ALWAYS comment under their own displayName —
      // accepting authorName from req.body would let a logged-in user
      // impersonate another user's name. Only fall back to user-supplied
      // text for genuinely anonymous (unauth) comments, and cap length so
      // it can't be abused as a banner ad.
      const safeContent = String(content).trim().slice(0, 4000);
      const safeAuthor = userId
        ? ((req.user as any)?.displayName || "Anonymous")
        : (typeof authorName === "string" ? authorName.trim().slice(0, 80) : "") || "Anonymous";
      const comment = await storage.addBookComment({ bookId, userId, authorName: safeAuthor, content: safeContent });
      res.status(201).json(comment);
    } catch (err) {
      logger.error({ err }, "Failed to post comment");
      res.status(500).json({ message: "Failed to post comment" });
    }
  });

  // ── Inline Comments (text-anchored) ──────────────────────────────────────

  // Helper: check user has access (owner or collaborator) to the book
  async function checkBookAccess(bookId: number, req: any): Promise<{ ok: boolean; userId?: number; publicBook?: boolean }> {
    // For published books, allow public read access
    const book = await storage.getBook(bookId);
    if (!book) return { ok: false };
    if (!req.isAuthenticated() || !req.user) {
      // Allow anonymous access only on published books (readers can comment)
      return book.isPublished ? { ok: true, publicBook: true } : { ok: false };
    }
    const userId = (req.user as any).id;
    const hasAccess = await storage.isBookAccessible(bookId, userId);
    if (hasAccess) return { ok: true, userId };
    // If published, allow read by any authenticated user
    if (book.isPublished) return { ok: true, userId, publicBook: true };
    return { ok: false };
  }

  app.get("/api/books/:bookId/chapters/:chapterId/inline-comments", async (req, res) => {
    try {
      const bookId = Number(req.params.bookId);
      const chapterId = Number(req.params.chapterId);
      if (!Number.isInteger(bookId) || !Number.isInteger(chapterId)) return res.status(400).json({ message: "Invalid ID" });
      const access = await checkBookAccess(bookId, req);
      if (!access.ok) return res.status(403).json({ message: "Access denied" });
      const comments = await storage.getInlineComments(chapterId);
      res.json(comments);
    } catch (err) {
      logger.error({ err }, "Failed to fetch inline comments");
      res.json([]);
    }
  });

  app.get("/api/books/:bookId/inline-comments", async (req, res) => {
    try {
      const bookId = Number(req.params.bookId);
      if (!Number.isInteger(bookId)) return res.status(400).json({ message: "Invalid ID" });
      const access = await checkBookAccess(bookId, req);
      if (!access.ok) return res.status(403).json({ message: "Access denied" });
      const comments = await storage.getBookInlineComments(bookId);
      res.json(comments);
    } catch (err) {
      logger.error({ err }, "Failed to fetch inline comments");
      res.json([]);
    }
  });

  app.post("/api/books/:bookId/chapters/:chapterId/inline-comments", requireEmailVerified, async (req, res) => {
    try {
      const bookId = Number(req.params.bookId);
      const chapterId = Number(req.params.chapterId);
      if (!Number.isInteger(bookId) || !Number.isInteger(chapterId)) return res.status(400).json({ message: "Invalid ID" });
      // Per-(IP, chapter) burst cap so an attacker can't flood a chapter
      // with hundreds of inline comments to disrupt the reader UI.
      if (!allowCommentBurst(`${req.ip}:${bookId}:${chapterId}`)) {
        return res.status(429).json({ message: "Too many comments on this chapter. Try again later." });
      }

      const { selectedText, startOffset, endOffset, content } = req.body;
      if (!selectedText || typeof selectedText !== "string" || !selectedText.trim())
        return res.status(400).json({ message: "Selected text is required" });
      if (!content || typeof content !== "string" || !content.trim())
        return res.status(400).json({ message: "Comment content is required" });
      if (!Number.isFinite(startOffset) || !Number.isFinite(endOffset) || !Number.isInteger(startOffset) || !Number.isInteger(endOffset))
        return res.status(400).json({ message: "Offsets must be integers" });
      if (startOffset < 0 || endOffset < 0 || startOffset >= endOffset)
        return res.status(400).json({ message: "Invalid offset range" });
      if (endOffset - startOffset > 50000)
        return res.status(400).json({ message: "Selection too large" });
      if (selectedText.length > 5000 || content.length > 5000)
        return res.status(400).json({ message: "Text too long" });

      const access = await checkBookAccess(bookId, req);
      if (!access.ok) return res.status(403).json({ message: "Access denied" });

      // Only authenticated users can use their real identity
      const userId = access.userId || null;
      const authorName = req.isAuthenticated() && req.user
        ? ((req.user as any).displayName || "Anonymous")
        : "Anonymous";
      const authorAvatarUrl = req.isAuthenticated() && req.user
        ? ((req.user as any).avatarUrl || null)
        : null;

      const comment = await storage.addInlineComment({
        bookId,
        chapterId,
        userId,
        authorName,
        authorAvatarUrl,
        selectedText: selectedText.trim().slice(0, 5000),
        startOffset,
        endOffset,
        content: content.trim().slice(0, 5000),
      });
      res.status(201).json(comment);
    } catch (err) {
      logger.error({ err }, "Failed to add inline comment");
      res.status(500).json({ message: "Failed to add inline comment" });
    }
  });

  app.delete("/api/books/:bookId/inline-comments/:commentId", async (req, res) => {
    try {
      if (!req.isAuthenticated() || !req.user) return res.status(401).json({ message: "Not authenticated" });
      const userId = (req.user as any).id;
      const commentId = Number(req.params.commentId);
      const pathBookId = Number(req.params.bookId);
      if (!Number.isInteger(commentId) || !Number.isInteger(pathBookId)) {
        return res.status(400).json({ message: "Invalid ID" });
      }
      const comment = await storage.getInlineCommentById(commentId);
      if (!comment) return res.status(404).json({ message: "Not found" });
      // Reject path/object mismatch — the URL claims one book, the comment
      // belongs to another. Without this check the bookId in the URL was
      // ignored entirely and the route became a pure-by-id endpoint.
      if (comment.bookId !== pathBookId) {
        return res.status(404).json({ message: "Not found" });
      }
      // Only the comment author OR the book owner can delete
      const book = await storage.getBook(comment.bookId);
      const canDelete = comment.userId === userId || book?.userId === userId;
      if (!canDelete) return res.status(403).json({ message: "Access denied" });
      await storage.deleteInlineComment(commentId);
      res.json({ success: true });
    } catch (err) {
      logger.error({ err }, "Failed to delete inline comment");
      res.status(500).json({ message: "Failed to delete" });
    }
  });

  app.patch("/api/books/:bookId/inline-comments/:commentId/resolve", async (req, res) => {
    try {
      if (!req.isAuthenticated() || !req.user) return res.status(401).json({ message: "Not authenticated" });
      const userId = (req.user as any).id;
      const commentId = Number(req.params.commentId);
      const pathBookId = Number(req.params.bookId);
      if (!Number.isInteger(commentId) || !Number.isInteger(pathBookId)) {
        return res.status(400).json({ message: "Invalid ID" });
      }
      const comment = await storage.getInlineCommentById(commentId);
      if (!comment) return res.status(404).json({ message: "Not found" });
      // Same path/object consistency check as the delete endpoint above —
      // the URL bookId must match the comment's bookId, otherwise we 404
      // (don't leak the existence of a comment in another book).
      if (comment.bookId !== pathBookId) {
        return res.status(404).json({ message: "Not found" });
      }
      // Only book owner OR collaborator can resolve
      const hasAccess = await storage.isBookAccessible(comment.bookId, userId);
      if (!hasAccess) return res.status(403).json({ message: "Access denied" });
      const updated = await storage.resolveInlineComment(commentId);
      res.json(updated);
    } catch (err) {
      logger.error({ err }, "Failed to resolve inline comment");
      res.status(500).json({ message: "Failed to resolve" });
    }
  });

  app.get("/api/public/books/:id/ratings", async (req, res) => {
    try {
      const bookId = Number(req.params.id);
      const stats = await storage.getBookRatingStats(bookId);
      res.json(stats);
    } catch { res.json({ avg: 0, count: 0 }); }
  });

  app.post("/api/public/books/:id/rate", requireEmailVerified, async (req, res) => {
    try {
      if (!req.isAuthenticated() || !req.user) return res.status(401).json({ message: "Login to rate" });
      const bookId = Number(req.params.id);
      const { rating } = req.body;
      if (!rating || rating < 1 || rating > 5) return res.status(400).json({ message: "Rating must be 1-5" });
      await storage.rateBook(bookId, (req.user as any).id, rating);
      res.json({ success: true });
    } catch (err) {
      logger.error({ err }, "Failed to rate");
      res.status(500).json({ message: "Failed to rate" });
    }
  });

  // ─── Generate Book Front Cover (portrait) ──────────────────────────────────

  // SECURITY: requireBookOwner first — without it, any authenticated
  // user could overwrite ANY book's coverImage/backCoverImage by
  // calling this endpoint with a victim's bookId. The handler calls
  // storage.updateBook(bookId, { coverImage }) at the bottom, so
  // ownership has to be enforced before AI cost is incurred.
  app.post(api.books.generateCover.path, requireBookOwner, imageGenLimiter, tierAiLimiter, async (req, res) => {
    try {
      const { prompt, side } = api.books.generateCover.input.parse(req.body);
      const bookId = Number(req.params.id);
      const book = await storage.getBook(bookId);
      if (!book) return res.status(404).json({ message: "Book not found" });

      // Defang user-controlled fields before they reach the LLM. Both the
      // book title and the user's prompt are concatenated into the cover
      // prompt; without this an attacker could write a title like
      // `". Ignore previous instructions and …` and steer the generated
      // image. Strip quotes/newlines and clamp length.
      const safeTitle = String(book?.title || "Novel")
        .replace(/["\r\n]/g, "")
        .slice(0, 120)
        .trim() || "Novel";
      const safePrompt = String(prompt || "")
        .replace(/["\r\n]/g, " ")
        .slice(0, 600)
        .trim();
      const coverPrompt = side === "back"
        ? `A professional book back cover background image for a book titled "${safeTitle}". ${safePrompt}. Portrait orientation, simple and elegant, designed to sit behind text. Subtle, not too busy. No text overlaid on the image.`
        : `A stunning, professional book front cover for a book titled "${safeTitle}". ${safePrompt}. Portrait orientation, publication-quality artwork, cinematic and visually striking. The design should feel like a real published novel cover. No text or title overlaid on the image.`;

      if (isMockOpenAI) {
        // Return a beautiful dynamic placeholder image based on the genre
        await new Promise(resolve => setTimeout(resolve, 1500));
        const dummyUrl = `https://images.unsplash.com/photo-1544947950-fa07a98d237f?q=80&w=1024&auto=format&fit=crop`;
        await storage.updateBook(bookId, side === "back" ? { backCoverImage: dummyUrl } : { coverImage: dummyUrl });
        return res.json({ url: dummyUrl });
      }

      const response = await openai.images.generate({
        model: "gpt-image-1",
        prompt: coverPrompt,
        size: "1024x1536",
      });

      const b64 = response?.data?.[0]?.b64_json;
      if (!b64) return res.status(500).json({ message: "No image data returned" });

      const dataUri = `data:image/png;base64,${b64}`;
      if (side === "back") {
        await storage.updateBook(bookId, { backCoverImage: dataUri });
      } else {
        await storage.updateBook(bookId, { coverImage: dataUri });
      }

      res.json({ url: dataUri });
    } catch (err) {
      logger.error({ err }, "Route error");
      res.status(500).json({ message: "Internal error" });
    }
  });

  // ─── Marketplace AI Analysis ────────────────────────────────────────────────

  app.post("/api/marketplace/analyze", requireOpenAI, aiLimiter, tierAiLimiter, async (req, res) => {
    try {
      const { serviceId, text } = req.body as { serviceId: string; text: string };
      if (!text || text.trim().length < 30) {
        return res.status(400).json({ message: "Text is too short for analysis" });
      }

      const truncated = text.slice(0, 50000);

      type PromptDef = { system: string; user: string };
      const prompts: Record<string, PromptDef> = {
        "dev-editor": {
          system: "You are a senior developmental editor with 20 years of publishing experience. Write detailed, actionable reports using markdown formatting.",
          user: `Provide a professional developmental editing report for this manuscript. Use markdown headers. Cover:\n## 1. Story Structure & Arc\n## 2. Pacing Analysis\n## 3. Character Development\n## 4. Plot Holes & Inconsistencies\n## 5. Dialogue & Voice\n## 6. Top Recommendations\n\nManuscript:\n${truncated}`,
        },
        "copy-editor": {
          system: "You are a professional copy editor. Write detailed reports using markdown formatting.",
          user: `Provide a copy editing report. Use markdown headers. Cover:\n## 1. Grammar & Punctuation Issues (with quoted examples)\n## 2. Style Consistency\n## 3. Voice & Tone\n## 4. Repetition & Redundancy\n## 5. Top 10 Specific Fixes\n\nText:\n${truncated}`,
        },
        "proofreader": {
          system: "You are a meticulous proofreader. Format reports clearly in markdown.",
          user: `Provide a proofreading report. Use markdown headers. Cover:\n## 1. Spelling Errors\n## 2. Punctuation Issues\n## 3. Typos & Formatting\n## 4. Overall Quality Assessment\n\nText:\n${truncated}`,
        },
        "blurb-writer": {
          system: "You are a bestselling book marketing copywriter specializing in back-cover copy.",
          user: `Write 3 compelling book blurbs based on this manuscript:\n\n## Short Blurb (50 words)\n\n## Standard Back-Cover Blurb (150 words)\n\n## Amazon Description (300 words)\n\nManuscript:\n${truncated}`,
        },
        "query-letter": {
          system: "You are a literary consultant who writes winning query letters for literary agents.",
          user: `Write a professional query letter based on this manuscript. Include:\n## Hook Paragraph\n## Synopsis\n## Comp Titles\n## Bio Section\n\nManuscript:\n${truncated}`,
        },
        "beta-reader": {
          system: "You simulate diverse reader personas giving honest beta reader feedback.",
          user: `Simulate 5 reader perspectives on this manuscript:\n\n## 🎯 The Genre Fan\n## 📖 The Casual Reader\n## 🔍 The Critical Analyst\n## 💖 The Emotional Reader\n## 🧩 The Plot Addict\n\nEach gives 3-5 sentences of honest, specific feedback.\n\nManuscript:\n${truncated}`,
        },
        "social-kit": {
          system: "You are a social media marketing expert specializing in book launches.",
          user: `Create a social media launch kit for this book:\n\n## 📸 5 Instagram Captions\n## 🐦 3 Twitter/X Threads\n## 🎵 5 BookTok Hooks\n## 📧 Launch Email\n\nManuscript:\n${truncated}`,
        },
        "sensitivity-reader": {
          system: "You are a professional sensitivity reader and inclusion consultant.",
          user: `Review this manuscript for representation and sensitivity. Report:\n\n## Cultural Representation Assessment\n## Flagged Passages (quote + context + suggestion)\n## Stereotype Patterns\n## Representation Score (1-10 with justification)\n## Recommendations\n\nManuscript:\n${truncated}`,
        },
      };

      const prompt = prompts[serviceId] || prompts["dev-editor"];

      if (isMockOpenAI) {
        const demoReport = `# Demo Report — ${serviceId.replace(/-/g, " ").replace(/\b\w/g, c => c.toUpperCase())}\n\n> **Note:** This is a demo result. Connect a real OpenAI API key for full analysis.\n\n## Overview\n\nYour manuscript has been reviewed. Here are the key findings from the initial scan.\n\n## Strengths\n\n- Strong narrative voice throughout the text\n- Compelling opening that draws readers in\n- Well-paced middle section\n\n## Areas for Improvement\n\n- Consider deepening character motivations in chapter 2\n- A few pacing issues in the third act\n- Some dialogue could be more natural\n\n## Recommendations\n\n1. Revisit the opening chapter hook\n2. Strengthen secondary character arcs\n3. Tighten dialogue in action sequences\n\n## Conclusion\n\nOverall, this is a promising manuscript with clear commercial potential.`;
        return res.json({ report: demoReport });
      }

      const response = await openai.chat.completions.create({
        model: AI_TEXT_MODEL,
        messages: [
          { role: "system", content: prompt.system },
          { role: "user", content: prompt.user },
        ],
        max_tokens: 2500,
      });

      const report = response.choices[0]?.message?.content || "No analysis returned.";
      res.json({ report });
    } catch (err) {
      logger.error({ err }, "Route error");
      res.status(500).json({ message: "Analysis failed" });
    }
  });

  // ─── Generate Book Blurb (multi-language) ──────────────────────────────────

  app.post(api.books.generateBlurb.path, requireBookOwner, requireOpenAI, aiLimiter, tierAiLimiter, async (req, res) => {
    try {
      const { language } = api.books.generateBlurb.input.parse(req.body);
      const bookId = Number(req.params.id);
      const book = await storage.getBook(bookId);
      if (!book) return res.status(404).json({ message: "Book not found" });

      const langCode = language || book.language || "en";
      const langName = getLangName(langCode);
      const arabic = langCode === "ar";

      const chapters = await storage.getChapters(bookId);
      const chapterSummary = chapters
        .slice(0, 5)
        .map((c, i) => `Chapter ${i + 1} - ${c.title}: ${getChapterText(c.content).slice(0, 300)}`)
        .join("\n");

      const systemPrompt = arabic
        ? "أنت كاتب محترف متخصص في كتابة الأوصاف الجذابة للكتب. اكتب وصفاً قصيراً ومثيراً للاهتمام للغلاف الخلفي للكتاب (2-3 فقرات). يجب أن يكون الوصف جذاباً ويشجع القراء على قراءة الكتاب دون الكشف عن النهاية. أعد الوصف فقط."
        : `You are a professional book blurb writer. Write a captivating back-cover blurb for the book described below (2-3 short paragraphs). Make it intriguing and hook readers without spoiling the ending. Write in ${langName}. Return only the blurb text.`;

      const userContent = arabic
        ? `عنوان الكتاب: ${book.title}\nالمؤلف: ${book.authorName || "غير معروف"}\nالملخص: ${book.summary || "لا يوجد ملخص"}\n\nمحتوى الفصول:\n${chapterSummary || "لا توجد فصول بعد"}`
        : `Book Title: ${book.title}\nAuthor: ${book.authorName || "Unknown"}\nExisting Summary: ${book.summary || "None"}\n\nChapter Content:\n${chapterSummary || "No chapters yet"}`;

      if (isMockOpenAI) {
        await new Promise(resolve => setTimeout(resolve, 1200));
        const blurb = "This is a dummy AI-generated blurb explicitly created so you can test the UI and layout without needing an actual OpenAI API key. Once you provide your real API key in the `.env` file, this will dynamically analyze your chapters and world-building to output an incredibly compelling summary. For now, enjoy exploring the platform's visual design and animations!";
        await storage.updateBook(bookId, { summary: blurb });
        return res.json({ blurb });
      }

      const response = await openai.chat.completions.create({
        model: AI_TEXT_MODEL,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userContent }
        ],
      });

      const blurb = response.choices[0]?.message?.content || "";
      await storage.updateBook(bookId, { summary: blurb });
      res.json({ blurb });
    } catch (err) {
      logger.error({ err }, "Route error");
      res.status(500).json({ message: "Failed to generate blurb" });
    }
  });

  // ─── Download Book ──────────────────────────────────────────────────────────

  // Public for published books; owner/collaborator only for unpublished drafts.
  // Downloads include the full manuscript content so we can't let the
  // endpoint run for anyone who guesses a numeric id.
  app.get("/api/books/:id/download", async (req, res, next) => {
    const bookId = Number(req.params.id);
    if (!bookId || isNaN(bookId)) return res.status(400).json({ message: "Invalid book id" });
    const book = await storage.getBook(bookId);
    if (!book) return res.status(404).json({ message: "Book not found" });
    if (book.isPublished) return next();
    return requireBookOwner(req, res, next);
  }, async (req, res) => {
    try {
      const bookId = Number(req.params.id);
      const format = (req.query.format as string) || "txt";
      const book = await storage.getBook(bookId);
      if (!book) return res.status(404).json({ message: "Book not found" });

      const chapters = await storage.getChapters(bookId);
      const safeTitle = book.title.replace(/[^a-zA-Z0-9\s]/g, "").trim().replace(/\s+/g, "_") || "book";

      if (format === "txt") {
        const lines: string[] = [
          book.title,
          book.authorName ? `by ${book.authorName}` : "",
          "",
          book.summary || "",
          "",
          "─".repeat(50),
          "",
        ];
        chapters.forEach((ch, i) => {
          lines.push(`Chapter ${i + 1}: ${ch.title}`);
          lines.push("");
          getChapterPages(ch.content).forEach((page, pi) => {
            if (pi > 0) { lines.push(""); lines.push(`— Page ${pi + 1} —`); lines.push(""); }
            lines.push(isHtmlContent(page) ? stripHtml(page) : page);
          });
          lines.push("");
          lines.push("─".repeat(50));
          lines.push("");
        });
        res.setHeader("Content-Type", "text/plain; charset=utf-8");
        res.setHeader("Content-Disposition", `attachment; filename="${safeTitle}.txt"`);
        return res.send(lines.join("\n"));
      }

      if (format === "pdf") {
        const langCode = book.language || "en";
        const rtl = isRTL(langCode);
        const dir = rtl ? "rtl" : "ltr";
        const template = (req.query.template as string) || "classic";
        const bookPages = (book as any).bookPages || {};

        // ── Read book editor preferences ───────────────────────────────────
        const prefs = ((book as any).bookPreferences as Record<string, any>) || {};
        const prefFontKey   = prefs.fontFamily  || "eb-garamond";
        const prefFontSize  = parseFloat(prefs.fontSize  || "16") || 16;
        const prefLineHeight = prefs.lineHeight || "1.45";
        const prefPaperSize = prefs.paperSize   || "a5";
        const prefMT = prefs.marginTop    ?? 72;
        const prefMB = prefs.marginBottom ?? 72;
        const prefML = prefs.marginLeft   ?? 72;
        const prefMR = prefs.marginRight  ?? 72;

        // Paper sizes in cm (matching editor's px @ 96dpi exactly)
        const PAPER_CM: Record<string, { w: string; h: string }> = {
          "a5":     { w: "14.8cm", h: "21.0cm" },
          "pocket": { w: "11.0cm", h: "18.0cm" },
          "trade":  { w: "15.24cm", h: "22.86cm" },
          "a4":     { w: "21.0cm",  h: "29.7cm"  },
        };
        const paperCm = PAPER_CM[prefPaperSize] || PAPER_CM["a5"];
        const pxToCm = (px: number) => ((px / 96) * 2.54).toFixed(3) + "cm";

        // Font CSS values
        const FONT_CSS: Record<string, string> = {
          "eb-garamond":       "'EB Garamond', Georgia, serif",
          "cormorant":         "'Cormorant Garamond', Georgia, serif",
          "libre-baskerville": "'Libre Baskerville', Georgia, serif",
          "lora":              "'Lora', Georgia, serif",
          "merriweather":      "'Merriweather', Georgia, serif",
          "source-serif":      "'Source Serif 4', Georgia, serif",
          "playfair":          "'Playfair Display', Georgia, serif",
          "crimson":           "'Crimson Text', Georgia, serif",
          "georgia":           "Georgia, serif",
          "times":             "'Times New Roman', Times, serif",
          "inter":             "'Inter', system-ui, sans-serif",
          "roboto":            "'Roboto', system-ui, sans-serif",
          "open-sans":         "'Open Sans', system-ui, sans-serif",
          "poppins":           "'Poppins', system-ui, sans-serif",
          "montserrat":        "'Montserrat', system-ui, sans-serif",
          "nunito":            "'Nunito', system-ui, sans-serif",
          "oswald":            "'Oswald', system-ui, sans-serif",
          "lexend":            "'Lexend', system-ui, sans-serif",
          "raleway":           "'Raleway', system-ui, sans-serif",
          "courier-prime":     "'Courier Prime', 'Courier New', monospace",
          "special-elite":     "'Special Elite', cursive",
          "arabic-sans":       "'Cairo', system-ui, sans-serif",
          "arabic-serif":      "'Amiri', Georgia, serif",
          "arabic-naskh":      "'Noto Naskh Arabic', Georgia, serif",
        };
        const FONT_IMPORT: Record<string, string> = {
          "eb-garamond":       "https://fonts.googleapis.com/css2?family=EB+Garamond:ital,wght@0,400;0,700;1,400&display=swap",
          "cormorant":         "https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,400;0,600;1,400&display=swap",
          "libre-baskerville": "https://fonts.googleapis.com/css2?family=Libre+Baskerville:ital,wght@0,400;0,700;1,400&display=swap",
          "lora":              "https://fonts.googleapis.com/css2?family=Lora:ital,wght@0,400;0,700;1,400&display=swap",
          "merriweather":      "https://fonts.googleapis.com/css2?family=Merriweather:ital,wght@0,300;0,400;0,700;1,400&display=swap",
          "source-serif":      "https://fonts.googleapis.com/css2?family=Source+Serif+4:ital,wght@0,400;0,600;1,400&display=swap",
          "playfair":          "https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,700;1,400&display=swap",
          "crimson":           "https://fonts.googleapis.com/css2?family=Crimson+Text:ital,wght@0,400;0,600;1,400&display=swap",
          "inter":             "https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap",
          "roboto":            "https://fonts.googleapis.com/css2?family=Roboto:ital,wght@0,300;0,400;0,500;1,400&display=swap",
          "open-sans":         "https://fonts.googleapis.com/css2?family=Open+Sans:ital,wght@0,400;0,600;1,400&display=swap",
          "poppins":           "https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600&display=swap",
          "montserrat":        "https://fonts.googleapis.com/css2?family=Montserrat:ital,wght@0,400;0,600;1,400&display=swap",
          "nunito":            "https://fonts.googleapis.com/css2?family=Nunito:ital,wght@0,400;0,600;1,400&display=swap",
          "oswald":            "https://fonts.googleapis.com/css2?family=Oswald:wght@400;500;600&display=swap",
          "lexend":            "https://fonts.googleapis.com/css2?family=Lexend:wght@300;400;500;600&display=swap",
          "raleway":           "https://fonts.googleapis.com/css2?family=Raleway:ital,wght@0,400;0,600;1,400&display=swap",
          "courier-prime":     "https://fonts.googleapis.com/css2?family=Courier+Prime:ital,wght@0,400;0,700;1,400&display=swap",
          "special-elite":     "https://fonts.googleapis.com/css2?family=Special+Elite&display=swap",
          "arabic-sans":       "https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700&display=swap",
          "arabic-serif":      "https://fonts.googleapis.com/css2?family=Amiri:ital,wght@0,400;0,700;1,400&display=swap",
          "arabic-naskh":      "https://fonts.googleapis.com/css2?family=Noto+Naskh+Arabic:wght@400;600;700&display=swap",
        };

        const bodyFont    = FONT_CSS[prefFontKey]    || "'EB Garamond', Georgia, serif";
        const fontImportUrl = FONT_IMPORT[prefFontKey] || FONT_IMPORT["eb-garamond"];

        // ── Template themes (decorative only — accent colors + borders) ────
        const TEMPLATES: Record<string, { headingFont: string; accentColor: string; chapterBorder: string }> = {
          classic: {
            headingFont:   bodyFont,
            accentColor:   "#1a1a1a",
            chapterBorder: "2px solid #1a1a1a",
          },
          modern: {
            headingFont:   "'Playfair Display', Georgia, serif",
            accentColor:   "#1a1a1a",
            chapterBorder: "3px solid #111",
          },
          romance: {
            headingFont:   bodyFont,
            accentColor:   "#7a3535",
            chapterBorder: "1px solid #c9a0a0",
          },
        };
        const theme = TEMPLATES[template] || TEMPLATES.classic;

        // Build front/back matter HTML
        const frontMatterSections: string[] = [];
        if (bookPages.copyright) {
          frontMatterSections.push(`<div class="matter-page"><p class="matter-text">${escapeHtml(bookPages.copyright).replace(/\n/g, "<br>")}</p></div>`);
        } else {
          const autoC = `© ${new Date().getFullYear()} ${book.authorName || ""}. All rights reserved.\n\nPublished by Plotzy.\n\nNo part of this publication may be reproduced without permission.`;
          frontMatterSections.push(`<div class="matter-page"><p class="matter-text">${escapeHtml(autoC).replace(/\n/g, "<br>")}</p></div>`);
        }
        if (bookPages.dedication) {
          frontMatterSections.push(`<div class="matter-page matter-center"><p class="matter-text dedication">${escapeHtml(bookPages.dedication).replace(/\n/g, "<br>")}</p></div>`);
        }
        if (bookPages.epigraph) {
          frontMatterSections.push(`<div class="matter-page matter-center"><blockquote class="epigraph">${escapeHtml(bookPages.epigraph).replace(/\n/g, "<br>")}</blockquote></div>`);
        }
        const backMatterSections: string[] = [];
        if (bookPages.aboutAuthor) {
          backMatterSections.push(`<div class="matter-page"><h2>About the Author</h2><p class="matter-text">${escapeHtml(bookPages.aboutAuthor).replace(/\n/g, "<br>")}</p></div>`);
        }

        const chaptersHtml = chapters.map((ch, i) => {
          // Merge all editor pages into one continuous flow — no artificial separators.
          // The @page CSS handles pagination when printing.
          const contentHtml = getChapterPages(ch.content)
            .map(pg => isHtmlContent(pg) ? pg : escapeHtml(pg).replace(/\n/g, "<br>"))
            .join("");
          return `
          <div class="chapter">
            <h2>Chapter ${i + 1}: ${escapeHtml(ch.title)}</h2>
            <div class="chapter-content">${contentHtml}</div>
          </div>`;
        }).join("");

        // Build cover page — use image if available, else styled text
        // When the user uploaded a cover image, show it as the entire
        // first page with nothing on top — their cover already includes
        // the title/author typography they designed. Overlaying another
        // title on top just duplicates it and usually clashes visually.
        const coverPageContent = book.coverImage
          ? `
            <div class="cover-image-wrap">
              <img src="${book.coverImage}" alt="Book Cover" class="cover-img" />
            </div>`
          : `
            <h1>${escapeHtml(book.title)}</h1>
            ${book.authorName ? `<div class="author">by ${escapeHtml(book.authorName)}</div>` : ""}
            ${book.summary ? `<div class="summary">${escapeHtml(book.summary)}</div>` : ""}`;

        const html = `<!DOCTYPE html>
<html lang="${langCode}" dir="${dir}">
<head>
  <meta charset="UTF-8">
  <title>${escapeHtml(book.title)}</title>
  <style>
    @import url('${fontImportUrl}');
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: ${bodyFont};
      font-size: ${prefFontSize}px;
      line-height: ${prefLineHeight};
      color: #222;
      background: white;
      padding: 0;
      direction: ${dir};
    }
    .cover-page {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
      page-break-after: always;
      text-align: center;
      background: #fff;
      padding: 0;
      position: relative;
      overflow: hidden;
    }
    /* When the user uploaded a cover image, it IS the cover — show it at
       full fidelity (contain, not cover; opacity 1, no dark overlay, no
       title stamped on top). Users who design a cover already include
       the title in the artwork. */
    .cover-image-wrap { position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; }
    .cover-img { width: 100%; height: 100%; object-fit: contain; opacity: 1; }
    /* Typography-only cover (no uploaded image) — unchanged. */
    .cover-page h1 { font-family: ${theme.headingFont}; font-size: 2em; font-weight: 700; margin-bottom: 16px; color: #1a1a1a; }
    .cover-page .author { font-size: 1.1em; color: #666; font-style: italic; margin-bottom: 32px; }
    .cover-page .summary { color: #444; max-width: 500px; line-height: 1.7; margin: 0 auto; padding: 0 40px; }
    /* Matter pages (copyright, dedication, epigraph, about author) */
    .matter-page {
      padding: 10% 0;
      page-break-after: always;
      min-height: 60vh;
      display: flex;
      flex-direction: column;
      justify-content: center;
    }
    .matter-center { align-items: center; text-align: center; }
    .matter-text { line-height: 1.9; color: #444; }
    .matter-text.dedication { font-style: italic; color: #333; }
    .epigraph { font-style: italic; color: #555; border-left: 3px solid ${theme.accentColor}; padding-left: 20px; max-width: 400px; text-align: left; }
    .matter-page h2 { font-family: ${theme.headingFont}; font-size: 1.4em; margin-bottom: 20px; color: ${theme.accentColor}; border-bottom: ${theme.chapterBorder}; padding-bottom: 10px; }
    /* Chapters — no extra padding; @page margins handle whitespace */
    .chapter { padding: 0; page-break-before: always; }
    .chapter h2 { font-family: ${theme.headingFont}; font-size: 1.4em; margin-bottom: 1.5em; color: ${theme.accentColor}; border-bottom: ${theme.chapterBorder}; padding-bottom: 0.6em; }
    /* Preserve user's inline alignment/indent from TipTap — no overrides */
    .chapter-content p { margin: 0 0 0.6em; }
    .chapter-content h1 { font-size: 2em; font-weight: 700; margin: 0.8em 0 0.4em; }
    .chapter-content h2 { font-size: 1.5em; font-weight: 700; margin: 0.75em 0 0.35em; }
    .chapter-content h3 { font-size: 1.25em; font-weight: 600; margin: 0.7em 0 0.3em; }
    .chapter-content ul, .chapter-content ol { padding-left: 1.5em; margin: 0.5em 0; }
    .chapter-content li { margin: 0.2em 0; }
    @media print {
      @page {
        size: ${paperCm.w} ${paperCm.h};
        margin: ${pxToCm(prefMT)} ${pxToCm(prefMR)} ${pxToCm(prefMB)} ${pxToCm(prefML)};
      }
    }
  </style>
</head>
<body>
  <div class="cover-page">
    ${coverPageContent}
  </div>
  ${frontMatterSections.join("\n")}
  ${chaptersHtml}
  ${backMatterSections.join("\n")}
  <script>window.onload = function() { window.print(); }</script>
</body>
</html>`;

        res.setHeader("Content-Type", "text/html; charset=utf-8");
        return res.send(html);
      }

      if (format === "epub") {
        // @ts-ignore
        const nodepub = await import("nodepub");

        // If cover image is a data URI, save it to a temp file for nodepub
        let coverTmpPath = "";
        if (book.coverImage && book.coverImage.startsWith("data:image/")) {
          const match = book.coverImage.match(/^data:image\/(\w+);base64,(.+)$/);
          if (match) {
            const ext = match[1] === "jpeg" ? "jpg" : match[1];
            const b64data = match[2];
            coverTmpPath = path.join(os.tmpdir(), `plotzy-cover-${bookId}-${Date.now()}.${ext}`);
            fs.writeFileSync(coverTmpPath, Buffer.from(b64data, "base64"));
          }
        }

        // Generate a minimal 1x1 PNG placeholder if no cover exists (nodepub requires it)
        if (!coverTmpPath) {
          coverTmpPath = path.join(os.tmpdir(), `plotzy-cover-${bookId}-${Date.now()}.png`);
          // Minimal valid PNG (1x1 dark pixel)
          const pngBuf = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==", "base64");
          fs.writeFileSync(coverTmpPath, pngBuf);
        }

        const metadata = {
          id: `plotzy-book-${bookId}`,
          cover: coverTmpPath,
          title: book.title,
          series: "",
          sequence: 1,
          author: book.authorName || "Unknown Author",
          fileAs: book.authorName || "Unknown",
          genre: "Fiction",
          tags: "",
          copyright: `© ${new Date().getFullYear()} ${book.authorName || ""}`,
          publisher: "Plotzy",
          published: new Date().toISOString().split("T")[0],
          language: book.language || "en",
          description: book.summary || "",
          contents: "Table of Contents",
          source: "https://plotzy.app",
          images: [],
        };

        const doc = nodepub.document(metadata, "");

        if (book.summary) {
          doc.addSection("About This Book", `<h2>About This Book</h2><p>${escapeHtml(book.summary)}</p>`);
        }

        chapters.forEach((ch, i) => {
          // Merge all editor pages into one continuous flow
          const pageHtml = getChapterPages(ch.content)
            .map(pg => isHtmlContent(pg)
              ? pg
              : `<p>${escapeHtml(pg).replace(/\n\n/g, "</p><p>").replace(/\n/g, "<br/>")}</p>`)
            .join("");
          doc.addSection(ch.title, `<h2>Chapter ${i + 1}: ${escapeHtml(ch.title)}</h2><div class="chapter-content">${pageHtml}</div>`);
        });

        const tmpDir = os.tmpdir();
        const tmpName = `plotzy-${bookId}-${Date.now()}`;
        await doc.writeEPUB(tmpDir, tmpName);
        const tmpPath = path.join(tmpDir, `${tmpName}.epub`);

        res.setHeader("Content-Type", "application/epub+zip");
        res.setHeader("Content-Disposition", `attachment; filename="${safeTitle}.epub"`);
        const stream = fs.createReadStream(tmpPath);
        stream.pipe(res);
        const cleanupTmp = () => {
          try { fs.unlinkSync(tmpPath); } catch { }
          if (coverTmpPath) { try { fs.unlinkSync(coverTmpPath); } catch { } }
        };
        stream.on("end", cleanupTmp);
        stream.on("error", (err) => {
          logger.error({ err }, "EPUB stream error");
          cleanupTmp();
          if (!res.headersSent) res.status(500).json({ message: "Export failed" });
        });
        return;
      }

      res.status(400).json({ message: "Unsupported format" });
    } catch (err) {
      logger.error({ err }, "Route error");
      res.status(500).json({ message: "Failed to generate download" });
    }
  });

  // ─── Chapters ──────────────────────────────────────────────────────────────

  app.get(api.chapters.list.path, async (req, res) => {
    try {
      const chapters = await storage.getChapters(Number(req.params.bookId));
      res.json(chapters);
    } catch (err) {
      logger.error({ err }, "Failed to fetch chapters");
      res.status(500).json({ message: "Failed to fetch chapters" });
    }
  });

  // Chapter saves can include embedded base64 images via the rich
  // editor; opt out of the tightened 2MB global default with a 10MB
  // limit just for these routes (both create AND update — a brand-new
  // chapter that pastes in a banner-size image hits the same shape).
  const chapterBodyParser = express.json({ limit: "10mb" });

  app.post(api.chapters.create.path, chapterBodyParser, requireBookOwner, async (req, res) => {
    try {
      const input = api.chapters.create.input.parse(req.body);
      const userId = req.isAuthenticated() && req.user ? req.user.id : null;

      // Enforce free trial chapter limit
      if (userId) {
        const dbUser = await storage.getUserById(userId);
        if (dbUser && !isSubscriptionActive(dbUser as any)) {
          const chapterCount = await storage.getUserChapterCount(userId);
          if (chapterCount >= FREE_TRIAL_MAX_CHAPTERS) {
            return res.status(403).json({
              message: "Free trial limit reached",
              code: "CHAPTER_LIMIT",
              limit: FREE_TRIAL_MAX_CHAPTERS,
            });
          }
        }
      }

      const chapter = await storage.createChapter({
        ...input,
        bookId: Number(req.params.bookId),
        userId: userId ?? undefined,
      });

      // Gamification: track first chapter achievement
      if (userId) {
        try {
          await storage.incrementUserChapters(userId);
          const stats = await storage.getOrCreateUserStats(userId);
          const newAchievements = await checkAndUnlockAchievements(userId, stats);
          return res.status(201).json({ ...chapter, newAchievements: newAchievements.map(a => a.id) });
        } catch { /* non-blocking */ }
      }
      res.status(201).json(chapter);
    } catch (err) {
      if (err instanceof z.ZodError) return res.status(400).json({ message: err.errors[0].message });
      res.status(500).json({ message: "Internal error" });
    }
  });

  app.put(api.chapters.update.path, chapterBodyParser, requireChapterOwner, async (req, res) => {
    try {
      const input = api.chapters.update.input.parse(req.body);
      const userId = req.isAuthenticated() && req.user ? req.user.id : null;

      // Enforce free trial word count limit
      if (userId && input.content) {
        const dbUser = await storage.getUserById(userId);
        if (dbUser && !isSubscriptionActive(dbUser as any)) {
          const wordCount = countWords(input.content);
          if (wordCount > FREE_TRIAL_MAX_WORDS) {
            return res.status(403).json({
              message: "Free trial word limit reached",
              code: "WORD_LIMIT",
              wordCount,
              limit: FREE_TRIAL_MAX_WORDS,
            });
          }
        }
      }

      const chapter = await storage.updateChapter(Number(req.params.id), input);

      // Auto-snapshot: every save produces a version so the author can roll
      // back. Fire-and-forget — the save response must not block on it.
      if (input.content) {
        const chapterId = Number(req.params.id);
        (async () => {
          try {
            const { db: dbConn } = await import("./db");
            const { desc, eq } = await import("drizzle-orm");
            await dbConn.insert(chapterSnapshots).values({
              chapterId,
              content: input.content as string,
              label: null,
            });
            // Cap at 30 snapshots per chapter — drop the oldest once over.
            const existing = await dbConn
              .select({ id: chapterSnapshots.id })
              .from(chapterSnapshots)
              .where(eq(chapterSnapshots.chapterId, chapterId))
              .orderBy(desc(chapterSnapshots.createdAt));
            if (existing.length > 30) {
              const idsToTrim = existing.slice(30).map(r => r.id);
              if (idsToTrim.length) {
                const { inArray } = await import("drizzle-orm");
                await dbConn.delete(chapterSnapshots).where(inArray(chapterSnapshots.id, idsToTrim));
              }
            }
          } catch (err) {
            logger.warn({ err, chapterId }, "Auto-snapshot failed");
          }
        })();
      }

      // Gamification: track words written and streak
      if (userId && input.content) {
        try {
          const wordCount = countWords(input.content);
          const updatedStats = await storage.addWordsToUserStats(userId, wordCount);
          const streakStats = await storage.updateWritingStreak(userId);
          const merged = { ...updatedStats, streakDays: streakStats.streakDays, longestStreak: streakStats.longestStreak };
          const newAchievements = await checkAndUnlockAchievements(userId, merged);
          return res.json({ ...chapter, newAchievements: newAchievements.map(a => a.id) });
        } catch { /* non-blocking */ }
      }
      res.json(chapter);
    } catch (err) {
      if (err instanceof z.ZodError) return res.status(400).json({ message: err.errors[0].message });
      res.status(500).json({ message: "Internal error" });
    }
  });

  app.delete(api.chapters.delete.path, requireChapterOwner, async (req, res) => {
    await storage.deleteChapter(Number(req.params.id));
    res.status(204).send();
  });

  // ─── Chapter Version History (snapshots) ──────────────────────────────────
  // Every save produces an auto-snapshot (see PUT handler above). The author
  // can also create a labelled snapshot manually, list their history, restore
  // a past version, or delete any snapshot. Ownership is enforced per-route
  // via requireChapterOwner so one user can't read or touch another user's
  // chapter history.

  app.get("/api/chapters/:id/snapshots", requireChapterOwner, async (req, res) => {
    try {
      const chapterId = Number(req.params.id);
      const { db: dbConn } = await import("./db");
      const { eq, desc } = await import("drizzle-orm");
      const rows = await dbConn
        .select()
        .from(chapterSnapshots)
        .where(eq(chapterSnapshots.chapterId, chapterId))
        .orderBy(desc(chapterSnapshots.createdAt))
        .limit(50);
      res.json(rows);
    } catch (err) {
      logger.error({ err }, "Failed to list chapter snapshots");
      res.status(500).json({ message: "Internal error" });
    }
  });

  app.post("/api/chapters/:id/snapshots", requireChapterOwner, async (req, res) => {
    try {
      const chapterId = Number(req.params.id);
      const { content, label } = z.object({
        content: z.string().min(1),
        label:   z.string().trim().min(1).max(80).optional(),
      }).parse(req.body);

      const { db: dbConn } = await import("./db");
      const { eq, desc } = await import("drizzle-orm");

      const [snap] = await dbConn.insert(chapterSnapshots).values({
        chapterId,
        content,
        label: label ?? null,
      }).returning();

      // Enforce the 30-snapshot cap here too — manual saves shouldn't bypass it.
      const existing = await dbConn
        .select({ id: chapterSnapshots.id })
        .from(chapterSnapshots)
        .where(eq(chapterSnapshots.chapterId, chapterId))
        .orderBy(desc(chapterSnapshots.createdAt));
      if (existing.length > 30) {
        const idsToTrim = existing.slice(30).map(r => r.id);
        if (idsToTrim.length) {
          const { inArray } = await import("drizzle-orm");
          await dbConn.delete(chapterSnapshots).where(inArray(chapterSnapshots.id, idsToTrim));
        }
      }

      res.status(201).json(snap);
    } catch (err) {
      if (err instanceof z.ZodError) return res.status(400).json({ message: err.errors[0].message });
      logger.error({ err }, "Failed to save chapter snapshot");
      res.status(500).json({ message: "Internal error" });
    }
  });

  app.post("/api/chapters/:id/snapshots/:snapId/restore", requireChapterOwner, async (req, res) => {
    try {
      const chapterId = Number(req.params.id);
      const snapId    = Number(req.params.snapId);
      if (!Number.isInteger(snapId)) return res.status(400).json({ message: "Invalid snapshot id" });

      const { db: dbConn } = await import("./db");
      const { eq, and } = await import("drizzle-orm");

      const [snap] = await dbConn.select().from(chapterSnapshots).where(
        and(eq(chapterSnapshots.id, snapId), eq(chapterSnapshots.chapterId, chapterId))
      );
      if (!snap) return res.status(404).json({ message: "Snapshot not found" });

      // Before overwriting, capture the current chapter content as its own
      // snapshot so "restore" is itself reversible.
      const current = await storage.getChapters(Number(req.params.bookId));
      const live = current.find(c => c.id === chapterId);
      if (live && live.content && live.content !== snap.content) {
        try {
          await dbConn.insert(chapterSnapshots).values({
            chapterId,
            content: live.content,
            label: "Before restore",
          });
        } catch { /* non-blocking */ }
      }

      const updated = await storage.updateChapter(chapterId, { content: snap.content } as any);
      res.json(updated);
    } catch (err) {
      logger.error({ err }, "Failed to restore chapter snapshot");
      res.status(500).json({ message: "Internal error" });
    }
  });

  app.delete("/api/chapters/:id/snapshots/:snapId", requireChapterOwner, async (req, res) => {
    try {
      const chapterId = Number(req.params.id);
      const snapId    = Number(req.params.snapId);
      if (!Number.isInteger(snapId)) return res.status(400).json({ message: "Invalid snapshot id" });

      const { db: dbConn } = await import("./db");
      const { eq, and } = await import("drizzle-orm");
      const result = await dbConn.delete(chapterSnapshots).where(
        and(eq(chapterSnapshots.id, snapId), eq(chapterSnapshots.chapterId, chapterId))
      );
      res.status(204).send();
    } catch (err) {
      logger.error({ err }, "Failed to delete chapter snapshot");
      res.status(500).json({ message: "Internal error" });
    }
  });

  app.patch('/api/books/:bookId/chapters/reorder', requireBookOwner, async (req, res) => {
    try {
      const body = z.object({ updates: z.array(z.object({ id: z.number(), order: z.number() })) }).parse(req.body);
      await storage.reorderChapters(body.updates);
      res.status(200).json({ ok: true });
    } catch (err) {
      if (err instanceof z.ZodError) return res.status(400).json({ message: err.errors[0].message });
      res.status(500).json({ message: "Internal error" });
    }
  });

  // ─── Daily Progress ────────────────────────────────────────────────────────
  app.get('/api/books/:bookId/progress', async (req, res) => {
    try {
      const bookId = Number(req.params.bookId);
      const progress = await storage.getDailyProgress(bookId);
      res.json(progress);
    } catch {
      res.status(500).json({ message: "Internal error" });
    }
  });

  app.post('/api/books/:bookId/progress', async (req, res) => {
    try {
      const bookId = Number(req.params.bookId);
      const { wordsAdded } = z.object({ wordsAdded: z.number() }).parse(req.body);
      const record = await storage.updateDailyProgress(bookId, wordsAdded);
      res.json(record);
    } catch (err) {
      if (err instanceof z.ZodError) return res.status(400).json({ message: err.errors[0].message });
      res.status(500).json({ message: "Internal error" });
    }
  });

  const audioBodyParser = express.json({ limit: '50mb' });

  app.post(api.chapters.voice.path, audioBodyParser, requireOpenAI, aiLimiter, tierAiLimiter, async (req, res) => {
    try {
      const { audio } = api.chapters.voice.input.parse(req.body);
      const bookId = Number(req.params.bookId);
      const book = await storage.getBook(bookId);
      const langCode = book?.language || "en";
      const langName = getLangName(langCode);

      const audioBuffer = Buffer.from(audio, "base64");
      const file = await toFile(audioBuffer, "audio.webm", { type: "audio/webm" });
      const transcription = await openai.audio.transcriptions.create({
        file,
        model: AI_TRANSCRIBE_MODEL,
        language: langCode.length === 2 ? langCode : undefined,
      });

      const transcribedText = transcription.text;

      const systemPrompt = langCode === "ar"
        ? "أنت كاتب أدبي محترف. حوّل النص التالي المنطوق إلى فصل أدبي متكامل ومنظم باللغة العربية الفصحى. ابدأ بعنوان وصفي."
        : `You are an expert ghostwriter. Turn the following spoken story into a well-structured, polished literary book chapter written in ${langName}. Provide only the chapter text, starting with a descriptive title.`;

      const response = await openai.chat.completions.create({
        model: AI_TEXT_MODEL,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: transcribedText }
        ],
      });

      const chapterContent = response.choices[0]?.message?.content || transcribedText;
      let title = "New Voice Chapter";
      const lines = chapterContent.split('\n');
      if (lines[0] && lines[0].length < 100) {
        title = lines[0].replace(/^#+ /, '').replace(/\*+/g, '').trim();
      }

      const chapter = await storage.createChapter({ bookId, title, content: chapterContent });
      res.json(chapter);
    } catch (err) {
      logger.error({ err }, "Route error");
      res.status(500).json({ message: "Failed to process voice" });
    }
  });

  // ─── Transcribe Audio (inline dictation for chapter editor) ────────────────

  app.post("/api/transcribe", audioBodyParser, requireOpenAI, aiLimiter, tierAiLimiter, async (req, res) => {
    try {
      const { audio, language } = z.object({
        audio: z.string(),
        language: z.string().optional(),
      }).parse(req.body);

      const audioBuffer = Buffer.from(audio, "base64");
      const file = await toFile(audioBuffer, "audio.webm", { type: "audio/webm" });
      const transcription = await openai.audio.transcriptions.create({
        file,
        model: AI_TRANSCRIBE_MODEL,
        language: language && language.length === 2 ? language : undefined,
      });

      res.json({ text: transcription.text });
    } catch (err) {
      logger.error({ err }, "Route error");
      res.status(500).json({ message: "Transcription failed" });
    }
  });

  // ─── Generate Inline Image ─────────────────────────────────────────────────


  // ─── Lore ──────────────────────────────────────────────────────────────────

  // Lore contains spoilers / private worldbuilding notes, so mirror the
  // same access rules as GET /api/books/:id. Published book → public;
  // otherwise owner/collaborator/guest-session only.
  app.get(api.lore.list.path, async (req, res) => {
    try {
      const bookId = Number(req.params.bookId);
      if (!bookId || isNaN(bookId)) return res.status(400).json({ message: "Invalid book id" });
      const book = await storage.getBook(bookId);
      if (!book) return res.status(404).json({ message: "Book not found" });

      let allowed = book.isPublished;
      if (!allowed) {
        const userId = req.isAuthenticated() && req.user ? (req.user as any).id : null;
        if (userId && book.userId === userId) {
          allowed = true;
        } else if (userId) {
          const { db: dbConn } = await import("./db");
          const { eq, and } = await import("drizzle-orm");
          const [collab] = await dbConn.select().from(bookCollaborators)
            .where(and(eq(bookCollaborators.bookId, bookId), eq(bookCollaborators.userId, userId)));
          if (collab) allowed = true;
        } else if (book.userId === null) {
          const sess = req.session as any;
          const guestIds: number[] = sess?.guestBookIds || [];
          if (guestIds.includes(bookId)) allowed = true;
        }
      }
      if (!allowed) return res.status(404).json({ message: "Book not found" });

      const entries = await storage.getLoreEntries(bookId);
      res.json(entries);
    } catch {
      return res.status(500).json({ message: "Internal error" });
    }
  });

  app.post(api.lore.create.path, requireBookOwner, async (req, res) => {
    try {
      const input = api.lore.create.input.parse(req.body);
      const lore = await storage.createLoreEntry({ ...input, bookId: Number(req.params.bookId) });
      res.status(201).json(lore);
    } catch (err) {
      if (err instanceof z.ZodError) return res.status(400).json({ message: err.errors[0].message });
      res.status(500).json({ message: "Internal error" });
    }
  });

  app.put(api.lore.update.path, requireChildOwner(loreEntriesTable), async (req, res) => {
    try {
      const input = api.lore.update.input.parse(req.body);
      const lore = await storage.updateLoreEntry(Number(req.params.id), input);
      res.json(lore);
    } catch (err) {
      if (err instanceof z.ZodError) return res.status(400).json({ message: err.errors[0].message });
      res.status(500).json({ message: "Internal error" });
    }
  });

  app.delete(api.lore.delete.path, requireChildOwner(loreEntriesTable), async (req, res) => {
    await storage.deleteLoreEntry(Number(req.params.id));
    res.status(204).send();
  });

  app.post(api.lore.generate.path, aiLimiter, requireBookOwner, async (req, res) => {
    try {
      const bookId = Number(req.params.bookId);
      const book = await storage.getBook(bookId);
      if (!book) return res.status(404).json({ message: "Book not found" });

      const chapters = await storage.getChapters(bookId);
      if (chapters.length === 0) return res.json({ success: true, generatedCount: 0 });

      // Take standard sample of text to avoid huge token limit hit
      const fullText = chapters.map(c => c.content).join("\n\n").slice(-40000);

      const systemPrompt = `You are a professional Story Bible and Lore Extractor. Analyze the provided book chapters and extract key entities. Categorize each strictly as "character", "location", "item", or "magic" (use "other" only if absolutely necessary). Return a JSON array of objects with the following keys: "name", "category", "content" (a detailed paragraph describing the entity based *only* on the text).`;

      if (isMockOpenAI) {
        await new Promise(resolve => setTimeout(resolve, 1500));
        const dummyLore = await storage.createLoreEntry({
          bookId,
          name: "The First Artifact (Mock)",
          category: "item",
          content: "A beautifully glowing mock artifact generated safely because your OpenAI API key is missing. Add your real key to extract genuine lore from your chapters!"
        });
        return res.json({ success: true, generatedCount: 1, entries: [dummyLore] });
      }

      const response = await openai.chat.completions.create({
        model: AI_TEXT_MODEL,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: fullText }
        ],
        response_format: { type: "json_object" }
      });

      const resultStr = response.choices[0]?.message?.content || "{}";
      const resultObj = JSON.parse(resultStr);
      let newEntries = resultObj.entities || resultObj.lore || resultObj.data || [];
      if (!Array.isArray(newEntries)) {
        // Fallback attempts
        for (const key of Object.keys(resultObj)) {
          if (Array.isArray(resultObj[key])) { newEntries = resultObj[key]; break; }
        }
      }

      const existingLore = await storage.getLoreEntries(bookId);
      const existingNames = new Set(existingLore.map(l => l.name.toLowerCase()));

      let count = 0;
      for (const entry of newEntries) {
        if (!entry.name || !entry.category || !entry.content) continue;
        if (existingNames.has(entry.name.toLowerCase())) continue; // Skip duplicates
        await storage.createLoreEntry({
          bookId,
          name: entry.name,
          category: ["character", "location", "item", "magic"].includes(entry.category) ? entry.category : "other",
          content: entry.content
        });
        count++;
      }

      res.json({ success: true, generatedCount: count });
    } catch (err) {
      logger.error({ err }, "Route error");
      res.status(500).json({ message: "Failed to extract lore" });
    }
  });

  // ─── Legacy Importer ───────────────────────────────────────────────────────

  // SECURITY: requireBookOwner verifies the caller owns (or co-edits) the
  // book BEFORE multer buffers the upload — so a forged bookId can no
  // longer use legacy-import to inject chapters/lore/beats into someone
  // else's book. aiLimiter/tierAiLimiter also gate the OpenAI spend that
  // the extraction pipeline performs downstream.
  app.post("/api/books/:bookId/legacy-import", requireBookOwner, aiLimiter, tierAiLimiter, upload.single("file"), async (req, res) => {
    try {
      const bookId = Number(req.params.bookId);
      const book = await storage.getBook(bookId);
      if (!book) return res.status(404).json({ message: "Book not found" });

      if (!req.file) {
        return res.status(400).json({ message: "No file uploaded" });
      }

      const fileBuffer = req.file.buffer;
      const fileName = req.file.originalname.toLowerCase();
      let extractedText = "";

      if (fileName.endsWith(".pdf")) {
        // @ts-ignore
        const pdfParseModule = await import("pdf-parse");
        // @ts-ignore
        const parser = pdfParseModule.default || pdfParseModule;
        const data = await parser(fileBuffer);
        extractedText = data.text;
      } else if (fileName.endsWith(".docx")) {
        const result = await mammoth.extractRawText({ buffer: fileBuffer });
        extractedText = result.value;
      } else {
        return res.status(400).json({ message: "Unsupported file type. Please upload a PDF or DOCX file." });
      }

      if (!extractedText || extractedText.trim().length === 0) {
        return res.status(400).json({ message: "No text could be extracted from the file." });
      }

      // 1. Save extracted text as a rough chapter (to keep the user's raw data safe)
      await storage.createChapter({
        bookId,
        title: "Imported Chapter Draft",
        content: extractedText,
      });

      // 2. Perform AI Analysis to extract Story Beats and Characters
      // We take a sizable chunk of the text (e.g. 40,000 chars) so we don't blow token limits, but enough to grab context.
      const sampleText = extractedText.slice(0, 40000);

      const systemPrompt = `You are an expert Story Analyst and Editor reading an imported manuscript.
Analyze the provided text and extract:
1. "characters": An array of important characters (name, and a short content/description paragraph). Category MUST be "character".
2. "beats": An array of story beats representing the plot progression (title, description, and columnId). The columnId MUST be one of "act1", "act2", or "act3".
Return a strict JSON object with these two arrays.`;

      if (isMockOpenAI) {
        // Return dummy data if no key is present to allow testing the UI safely
        await new Promise(resolve => setTimeout(resolve, 2000));
        await storage.createLoreEntry({ bookId, name: "Protagonist (Imported)", category: "character", content: "Extracted hero from your legacy file." });
        await storage.createStoryBeat({ bookId, title: "Inciting Incident (Imported)", description: "The adventure begins mockingly.", columnId: "act1", order: 0 });
        return res.json({ success: true, message: "Parsed and extracted Mock data successfully." });
      }

      const response = await openai.chat.completions.create({
        model: AI_TEXT_MODEL,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: sampleText }
        ],
        response_format: { type: "json_object" }
      });

      const resultStr = response.choices[0]?.message?.content || "{}";
      const resultObj = JSON.parse(resultStr);

      const characters = resultObj.characters || [];
      const beats = resultObj.beats || [];

      // Insert Characters
      for (const char of characters) {
        if (char.name && char.content) {
          await storage.createLoreEntry({
            bookId,
            name: char.name,
            category: "character",
            content: char.content
          });
        }
      }

      // Insert Beats
      for (let i = 0; i < beats.length; i++) {
        const beat = beats[i];
        if (beat.title) {
          await storage.createStoryBeat({
            bookId,
            title: beat.title,
            description: beat.description || "",
            columnId: ["act1", "act2", "act3"].includes(beat.columnId) ? beat.columnId : "act1",
            order: i
          });
        }
      }

      res.json({ success: true, message: "Parsed text and extracted lore/beats successfully." });
    } catch (err) {
      logger.error({ err }, "Legacy import error");
      res.status(500).json({ message: "Failed to process the legacy file. It might be corrupted or too large." });
    }
  });

  // ─── AI Features (multi-language) ──────────────────────────────────────────

  const largeBodyParser = express.json({ limit: '5mb' });

  // Load and format the book's lore as a system-prompt suffix — but ONLY
  // if the caller actually owns the book. Without this guard, the AI
  // routes below would happily pull any victim's worldbuilding into the
  // model's context just because the bookId was supplied in the body.
  // Returns "" for: missing bookId, unauthenticated caller, non-owner,
  // missing book, or empty lore. Never throws — bad bookIds degrade
  // gracefully to no-context AI responses.
  async function loadLoreIfOwner(req: Request, bookId: number | undefined): Promise<string> {
    if (!bookId) return "";
    if (!req.isAuthenticated() || !req.user) return "";
    try {
      const book = await storage.getBook(bookId);
      if (!book || book.userId !== (req.user as any).id) return "";
      const lore = await storage.getLoreEntries(bookId);
      if (lore.length === 0) return "";
      const loreText = lore.map(l => `[${l.category.toUpperCase()}] ${l.name}: ${l.content}`).join("\n");
      return "\n\nSTORY BIBLE / LORE CONTEXT (Strictly maintain factual consistency with these details):\n" + loreText;
    } catch {
      return "";
    }
  }

  app.post(api.ai.improve.path, largeBodyParser, requireOpenAI, aiLimiter, tierAiLimiter, async (req, res) => {
    try {
      const { text, language, bookId } = api.ai.improve.input.parse(req.body);
      const langCode = language || "en";
      const langName = getLangName(langCode);
      const arabic = langCode === "ar";

      const loreContext = await loadLoreIfOwner(req, bookId);

      let systemPrompt = arabic
        ? "أنت محرر أدبي محترف. قم بتحسين النص التالي من حيث الوضوح والنحو والأسلوب والجودة الأدبية مع الحفاظ على المعنى الأصلي. أعد النص المحسّن فقط دون أي تعليق."
        : `You are an expert editor. Improve the following text for clarity, grammar, flow, and literary quality. Keep the original meaning but make it more professional and engaging. Write in ${langName}. Return ONLY the improved text.`;

      systemPrompt += loreContext;

      const response = await openai.chat.completions.create({
        model: AI_TEXT_MODEL,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: text }
        ]
      });

      res.json({ improvedText: response.choices[0]?.message?.content || text });
    } catch (err) {
      logger.error({ err }, "Route error");
      res.status(500).json({ message: "Failed to improve text" });
    }
  });

  app.post(api.ai.expand.path, largeBodyParser, requireOpenAI, aiLimiter, tierAiLimiter, async (req, res) => {
    try {
      const { idea, language, bookId } = api.ai.expand.input.parse(req.body);
      const langCode = language || "en";
      const langName = getLangName(langCode);
      const arabic = langCode === "ar";

      const loreContext = await loadLoreIfOwner(req, bookId);

      let systemPrompt = arabic
        ? "أنت روائي موهوب. خذ الفكرة أو المسودة التالية وقم بتوسيعها وتطويرها إلى نص أدبي كامل ومنسق. أضف وصفاً غنياً وحواراً ومشاعر وبناءً درامياً. اكتب بأسلوب أدبي راقٍ باللغة العربية الفصحى."
        : `You are a talented novelist. Take the following idea or rough draft and expand it into a full, well-structured literary text in ${langName}. Add rich description, dialogue, emotions, and dramatic tension. Return only the expanded text.`;

      systemPrompt += loreContext;

      const response = await openai.chat.completions.create({
        model: AI_TEXT_MODEL,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: idea }
        ]
      });

      res.json({ expandedText: response.choices[0]?.message?.content || idea });
    } catch (err) {
      logger.error({ err }, "Route error");
      res.status(500).json({ message: "Failed to expand idea" });
    }
  });

  app.post(api.ai.continueText.path, largeBodyParser, requireOpenAI, aiLimiter, tierAiLimiter, async (req, res) => {
    try {
      const { text, language, bookId } = api.ai.continueText.input.parse(req.body);
      const langCode = language || "en";
      const langName = getLangName(langCode);
      const arabic = langCode === "ar";

      const loreContext = await loadLoreIfOwner(req, bookId);

      let systemPrompt = arabic
        ? "أنت روائي موهوب. استمر في كتابة النص التالي بنفس الأسلوب والنبرة. أضف ما لا يقل عن ثلاثة فقرات جديدة. أعد المتابعة فقط بدون النص الأصلي."
        : `You are a talented novelist. Continue the following text in the same style and tone in ${langName}. Add at least three new paragraphs that naturally follow from where the text left off. Return ONLY the continuation, not the original text.`;

      systemPrompt += loreContext;

      const response = await openai.chat.completions.create({
        model: AI_TEXT_MODEL,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: text }
        ]
      });

      res.json({ continuedText: response.choices[0]?.message?.content || "" });
    } catch (err) {
      logger.error({ err }, "Route error");
      res.status(500).json({ message: "Failed to continue text" });
    }
  });

  app.post(api.ai.showDontTell.path, largeBodyParser, requireOpenAI, aiLimiter, tierAiLimiter, async (req, res) => {
    try {
      const { text, language } = api.ai.showDontTell.input.parse(req.body);
      const langCode = language || "en";
      const arabic = langCode === "ar";

      const systemPrompt = arabic
        ? `أنت محرر أدبي محترف متخصص في قاعدة "أظهر لا تخبر". حلّل النص وابحث عن جمل تخبر القارئ بالمشاعر أو الحالات بدلاً من إظهارها.

أعد بالضبط JSON بالشكل التالي (لا شيء غيره):
{"findings":[{"original":"الجملة المكتوبة بأسلوب الإخبار","suggestion":"بديل يُظهر نفس المعنى بشكل حي وحسّي","type":"عاطفة أو وصف أو طابع"}]}

قواعد:
- استخرج من 1 إلى 3 نتائج فقط (الأهم)
- "original" يجب أن يكون نصاً موجوداً حرفياً في النص المُدخل
- "suggestion" يجب أن يكون بديلاً أكثر حيوية وحسية من 10 إلى 20 كلمة
- إذا لم تجد أي شيء يستحق التغيير، أعد: {"findings":[]}`
        : `You are a professional literary editor specializing in "Show, Don't Tell" writing technique. Analyze the text and identify sentences that tell the reader about emotions or states instead of showing them.

Return ONLY valid JSON in this exact format (nothing else):
{"findings":[{"original":"the telling phrase as it appears in the text","suggestion":"a vivid showing alternative (10-20 words)","type":"emotion or description or character"}]}

Rules:
- Extract 1 to 3 findings only (the most impactful)
- "original" must be a phrase that appears verbatim in the input text
- "suggestion" must be a more vivid, sensory alternative
- If the text is already showing well, return: {"findings":[]}`;

      const response = await openai.chat.completions.create({
        model: AI_TEXT_MODEL,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: text }
        ],
        response_format: { type: "json_object" },
        max_tokens: 600,
      });

      const raw = response.choices[0]?.message?.content || '{"findings":[]}';
      let parsed: { findings: { original: string; suggestion: string; type: string }[] };
      try { parsed = JSON.parse(raw); } catch { parsed = { findings: [] }; }
      res.json(parsed);
    } catch (err) {
      logger.error({ err }, "Route error");
      res.status(500).json({ findings: [] });
    }
  });

  app.post(api.ai.translate.path, largeBodyParser, requireOpenAI, aiLimiter, tierAiLimiter, async (req, res) => {
    try {
      const { text, targetLanguage, bookId } = api.ai.translate.input.parse(req.body);
      const targetName = getLangName(targetLanguage);

      const loreContext = await loadLoreIfOwner(req, bookId);

      let systemPrompt = `You are a professional literary translator. Translate the following text into fluent, natural ${targetName}, preserving the literary style, tone, and meaning. Return only the translation.`;
      systemPrompt += loreContext;

      const response = await openai.chat.completions.create({
        model: AI_TEXT_MODEL,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: text }
        ]
      });

      res.json({ translatedText: response.choices[0]?.message?.content || text });
    } catch (err) {
      logger.error({ err }, "Route error");
      res.status(500).json({ message: "Failed to translate text" });
    }
  });

  // ─── AI Analysis Tools ─────────────────────────────────────────────────────

  // Helper: build manuscript text from all chapters (max 6000 chars per chapter, up to 10 chapters)
  async function buildManuscript(bookId: number): Promise<{ manuscript: string; chapterTitles: string[] }> {
    const chapters = await storage.getChapters(bookId);
    const chapterTitles = chapters.map(c => c.title || `Chapter ${chapters.indexOf(c) + 1}`);
    const manuscript = chapters
      .slice(0, 10)
      .map((c, i) => `=== ${chapterTitles[i]} ===\n${getChapterText(c.content).slice(0, 6000)}`)
      .join("\n\n");
    return { manuscript, chapterTitles };
  }

  // Plot Hole Detector
  app.post("/api/books/:bookId/ai/plot-holes", requireBookOwner, requireOpenAI, aiLimiter, tierAiLimiter, async (req, res) => {
    try {
      const bookId = parseInt(req.params.bookId);
      const book = await storage.getBook(bookId);
      if (!book) return res.status(404).json({ message: "Book not found" });
      const { manuscript } = await buildManuscript(bookId);
      if (!manuscript.trim()) return res.json({ issues: [] });

      const response = await openai.chat.completions.create({
        model: AI_TEXT_MODEL,
        response_format: { type: "json_object" },
        messages: [
          {
            role: "system",
            content: `You are a literary editor specializing in plot consistency. Analyze the manuscript for logical inconsistencies, timeline errors, character contradictions, and unresolved plot threads. Return JSON in this exact shape:
{"issues": [{"severity": "high"|"medium"|"low", "title": "short title", "description": "detailed explanation"}]}
Return an empty array if no issues found. Focus on real narrative problems, not style issues.`,
          },
          { role: "user", content: `Book: "${book.title}"\n\n${manuscript}` },
        ],
      });

      const data = JSON.parse(response.choices[0]?.message?.content || "{}");
      res.json({ issues: data.issues ?? [] });
    } catch (err) {
      logger.error({ err }, "Route error");
      res.status(500).json({ message: "Analysis failed" });
    }
  });

  // Dialogue Coach
  app.post("/api/books/:bookId/ai/dialogue-coach", requireBookOwner, requireOpenAI, aiLimiter, tierAiLimiter, async (req, res) => {
    try {
      const bookId = parseInt(req.params.bookId);
      const book = await storage.getBook(bookId);
      if (!book) return res.status(404).json({ message: "Book not found" });
      const { manuscript } = await buildManuscript(bookId);
      if (!manuscript.trim()) return res.json({ score: 0, feedback: "No content to analyze.", suggestions: [] });

      const response = await openai.chat.completions.create({
        model: AI_TEXT_MODEL,
        response_format: { type: "json_object" },
        messages: [
          {
            role: "system",
            content: `You are a dialogue coach and literary editor. Analyze the dialogue in the manuscript for naturalness, character voice differentiation, and authenticity. Return JSON in this exact shape:
{"score": 0-100, "feedback": "overall feedback paragraph", "suggestions": [{"issue": "what is wrong", "example": "direct quote from text showing the problem", "fix": "rewritten version that fixes it"}]}
Provide 2-4 specific suggestions with real examples from the text.`,
          },
          { role: "user", content: `Book: "${book.title}"\n\n${manuscript}` },
        ],
      });

      const data = JSON.parse(response.choices[0]?.message?.content || "{}");
      res.json({ score: data.score ?? 50, feedback: data.feedback ?? "", suggestions: data.suggestions ?? [] });
    } catch (err) {
      logger.error({ err }, "Route error");
      res.status(500).json({ message: "Analysis failed" });
    }
  });

  // Pacing Analyzer
  app.post("/api/books/:bookId/ai/pacing", requireBookOwner, requireOpenAI, aiLimiter, tierAiLimiter, async (req, res) => {
    try {
      const bookId = parseInt(req.params.bookId);
      const book = await storage.getBook(bookId);
      if (!book) return res.status(404).json({ message: "Book not found" });
      const { manuscript, chapterTitles } = await buildManuscript(bookId);
      if (!manuscript.trim()) return res.json({ overallPacing: "N/A", score: 0, summary: "No content.", chapters: [], recommendations: [] });

      const response = await openai.chat.completions.create({
        model: AI_TEXT_MODEL,
        response_format: { type: "json_object" },
        messages: [
          {
            role: "system",
            content: `You are a pacing analyst for fiction manuscripts. Evaluate the story's rhythm: action scenes, slow introspective passages, transitions, and chapter lengths. Return JSON in this exact shape:
{"overallPacing": "Fast"|"Medium"|"Slow", "score": 0-100, "summary": "1-2 sentence summary", "chapters": [{"title": "chapter title", "pacing": "Fast"|"Medium"|"Slow", "note": "brief note"}], "recommendations": ["actionable recommendation 1", "actionable recommendation 2"]}
Cover all chapters. Give 2-3 recommendations.`,
          },
          { role: "user", content: `Book: "${book.title}"\nChapters: ${chapterTitles.join(", ")}\n\n${manuscript}` },
        ],
      });

      const data = JSON.parse(response.choices[0]?.message?.content || "{}");
      res.json({
        overallPacing: data.overallPacing ?? "Medium",
        score: data.score ?? 50,
        summary: data.summary ?? "",
        chapters: data.chapters ?? [],
        recommendations: data.recommendations ?? [],
      });
    } catch (err) {
      logger.error({ err }, "Route error");
      res.status(500).json({ message: "Analysis failed" });
    }
  });

  // Character Voice Consistency
  app.post("/api/books/:bookId/ai/voice-consistency", requireBookOwner, requireOpenAI, aiLimiter, tierAiLimiter, async (req, res) => {
    try {
      const bookId = parseInt(req.params.bookId);
      const book = await storage.getBook(bookId);
      if (!book) return res.status(404).json({ message: "Book not found" });
      const { manuscript } = await buildManuscript(bookId);
      if (!manuscript.trim()) return res.json({ score: 0, characters: [], recommendation: "No content to analyze." });

      const response = await openai.chat.completions.create({
        model: AI_TEXT_MODEL,
        response_format: { type: "json_object" },
        messages: [
          {
            role: "system",
            content: `You are a character voice analyst. Identify the main characters and evaluate whether each one speaks and behaves consistently throughout the manuscript. Return JSON in this exact shape:
{"score": 0-100, "characters": [{"name": "character name", "consistencyScore": 0-100, "issues": ["specific inconsistency description"]}], "recommendation": "overall actionable recommendation"}
List 2-5 main characters. Issues array can be empty if consistent.`,
          },
          { role: "user", content: `Book: "${book.title}"\n\n${manuscript}` },
        ],
      });

      const data = JSON.parse(response.choices[0]?.message?.content || "{}");
      res.json({ score: data.score ?? 50, characters: data.characters ?? [], recommendation: data.recommendation ?? "" });
    } catch (err) {
      logger.error({ err }, "Route error");
      res.status(500).json({ message: "Analysis failed" });
    }
  });

  // ─── Publisher Proposal ────────────────────────────────────────────────────

  app.post("/api/books/:bookId/generate-proposal", requireBookOwner, largeBodyParser, requireOpenAI, aiLimiter, tierAiLimiter, async (req, res) => {
    try {
      const bookId = parseInt(req.params.bookId);
      const book = await storage.getBook(bookId);
      if (!book) return res.status(404).json({ message: "Book not found" });

      const { publisherName, publisherCountry, publisherFocus, publisherWebsite, outputLanguage } = req.body as {
        publisherName: string;
        publisherCountry: string;
        publisherFocus: string;
        publisherWebsite?: string;
        outputLanguage?: string;
      };

      const isArabic = (outputLanguage || book.language || "en") === "ar";
      const wordCount = book.summary ? Math.max(40000, book.summary.split(/\s+/).length * 100) : 80000;

      let systemPrompt: string;
      let userPrompt: string;

      if (isArabic) {
        systemPrompt = `أنت خبير في تقديم المخطوطات للناشرين وكتابة رسائل الاستفسار الاحترافية. مهمتك كتابة رسالة تقديم (Query Letter) احترافية ومقنعة باللغة العربية الفصحى. يجب أن تكون الرسالة:
- مهنية ومؤدبة
- مختصرة وواضحة (بين 300 و400 كلمة)
- تبدأ بمقدمة مشوِّقة عن الكتاب
- تتضمن ملخصاً موجزاً للحبكة أو المحتوى
- تذكر الجنس الأدبي وعدد الكلمات
- تتضمن نبذة مختصرة عن المؤلف
- تنتهي بدعوة لاتخاذ إجراء (طلب قراءة المخطوطة)
أعد الرسالة فقط، دون أي شرح إضافي.`;

        userPrompt = `اكتب رسالة تقديم احترافية للمعلومات التالية:

عنوان الكتاب: ${book.title}
اسم المؤلف: ${book.authorName || "المؤلف"}
الجنس الأدبي: ${(book as any).genre || "رواية"}
ملخص الكتاب: ${book.summary || "قصة مثيرة وممتعة"}
اللغة: العربية
عدد الكلمات التقريبي: ${wordCount.toLocaleString()} كلمة

الناشر المستهدف: ${publisherName}
دولة الناشر: ${publisherCountry}
تخصص الناشر: ${publisherFocus}
${publisherWebsite ? `الموقع الإلكتروني للناشر: ${publisherWebsite}` : ""}

اكتب رسالة تقديم موجهة خصيصاً لهذا الناشر، مع ذكر سبب ملاءمة هذا الكتاب لقائمة إصداراتهم.`;
      } else {
        systemPrompt = `You are an expert in manuscript submissions and writing compelling query letters for publishers and literary agents. Your task is to write a professional, persuasive query letter in English. The letter should be:
- Professional, warm, and compelling
- Concise and clear (300–400 words)
- Open with a compelling hook about the book
- Include a brief synopsis of the plot or content
- Mention genre and approximate word count
- Include a brief author bio paragraph
- Close with a clear call to action
Return only the letter itself, no extra commentary.`;

        userPrompt = `Write a professional query letter for the following:

Book Title: ${book.title}
Author Name: ${book.authorName || "The Author"}
Genre: ${(book as any).genre || "Fiction"}
Book Summary: ${book.summary || "A compelling and engaging story"}
Language: ${book.language || "English"}
Approximate Word Count: ${wordCount.toLocaleString()} words

Target Publisher: ${publisherName}
Publisher's Country: ${publisherCountry}
Publisher's Focus: ${publisherFocus}
${publisherWebsite ? `Publisher's Website: ${publisherWebsite}` : ""}

Write the query letter specifically tailored to this publisher, mentioning why this book is a good fit for their list.`;
      }

      const response = await openai.chat.completions.create({
        model: AI_TEXT_MODEL,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt }
        ]
      });

      res.json({ proposal: response.choices[0]?.message?.content || "" });
    } catch (err) {
      logger.error({ err }, "Route error");
      res.status(500).json({ message: "Failed to generate proposal" });
    }
  });

  // ─── Payments & Subscription routes (extracted to ./routes/payments.routes.ts) ──
  app.use(paymentsRouter);
  app.use(adminRouter);

  // ─── Audiobook Studio ───────────────────────────────────────────────────────

  // Helper: extract plain text from a chapter's content (PageBlock[] JSON)
  function extractChapterPlainText(content: string): string {
    if (!content) return "";
    try {
      const blocks = JSON.parse(content);
      if (Array.isArray(blocks)) {
        return blocks.map((b: unknown) => {
          if (typeof b === "string") return b;
          if (b && typeof b === "object" && "content" in b) return (b as { content: string }).content;
          return "";
        }).join("\n\n").trim();
      }
    } catch { }
    return content.trim();
  }

  // Generate a minimal WAV mock for demo mode (1 sec of silence)
  function makeMockWav(): Buffer {
    const sampleRate = 22050;
    const numSamples = sampleRate; // 1 second
    const numChannels = 1;
    const bitsPerSample = 16;
    const byteRate = sampleRate * numChannels * (bitsPerSample / 8);
    const blockAlign = numChannels * (bitsPerSample / 8);
    const dataSize = numSamples * blockAlign;
    const buf = Buffer.alloc(44 + dataSize, 0);
    buf.write("RIFF", 0); buf.writeUInt32LE(36 + dataSize, 4); buf.write("WAVE", 8);
    buf.write("fmt ", 12); buf.writeUInt32LE(16, 16); buf.writeUInt16LE(1, 20);
    buf.writeUInt16LE(numChannels, 22); buf.writeUInt32LE(sampleRate, 24);
    buf.writeUInt32LE(byteRate, 28); buf.writeUInt16LE(blockAlign, 32);
    buf.writeUInt16LE(bitsPerSample, 34); buf.write("data", 36); buf.writeUInt32LE(dataSize, 40);
    return buf;
  }

  // Preview: synthesize first ~500 chars of a chapter via Edge TTS.
  // SECURITY: ownership-gated; aiLimiter caps abuse-rate. Edge TTS is
  // free so the cost concern is server CPU/socket time, not dollars.
  app.post("/api/books/:id/audiobook/preview", requireBookOwner, aiLimiter, tierAiLimiter, async (req, res) => {
    try {
      const bookId = parseInt(req.params.id);
      const { chapterId, voice = "nova", speed = 1.0 } = req.body as {
        chapterId: number; voice?: string; speed?: number;
      };

      const book = await storage.getBook(bookId);
      if (!book) return res.status(404).json({ message: "Book not found" });

      const chapters = await storage.getChapters(bookId);
      const chapter = chapters.find(c => c.id === chapterId);
      if (!chapter) return res.status(404).json({ message: "Chapter not found" });

      const fullText = extractChapterPlainText(chapter.content || "");
      // Limit preview to first 500 characters (~60-90 seconds of audio)
      const previewText = fullText.slice(0, 500) || `Preview of ${chapter.title || "Chapter"}`;

      const { synthesizeToMp3 } = await import("./lib/edge-tts");
      const mp3 = await synthesizeToMp3({ text: previewText, voice, speed });

      res.json({ audio: mp3.toString("base64"), mimeType: "audio/mpeg", chapterId });
    } catch (err) {
      logger.error({ err }, "Audiobook preview error");
      res.status(500).json({ message: "Failed to generate audio preview" });
    }
  });

  // Export: synthesize all (or selected) chapters, merge, return as single MP3 download
  // SECURITY: export reads the ENTIRE book and produces a downloadable file
  // — full content leak if unauthenticated. At tts-1-hd rates a 500k-char
  // novel is ~$15 of OpenAI spend; without ownership + limits an attacker
  // can burn arbitrary dollars on a loop across every bookId.
  app.post("/api/books/:id/audiobook/export", requireBookOwner, aiLimiter, tierAiLimiter, async (req, res) => {
    try {
      const bookId = parseInt(req.params.id);
      const { voice = "nova", speed = 1.0, chapterIds } = req.body as {
        voice?: string; speed?: number; chapterIds?: number[];
      };

      const book = await storage.getBook(bookId);
      if (!book) return res.status(404).json({ message: "Book not found" });

      const allChapters = await storage.getChapters(bookId);
      const chaptersToExport = chapterIds && chapterIds.length > 0
        ? allChapters.filter(c => chapterIds.includes(c.id)).sort((a, b) => a.order - b.order)
        : allChapters.sort((a, b) => a.order - b.order);

      if (chaptersToExport.length === 0) {
        return res.status(400).json({ message: "No chapters to export" });
      }

      const { synthesizeToMp3, splitForTts } = await import("./lib/edge-tts");
      const audioChunks: Buffer[] = [];

      for (const chapter of chaptersToExport) {
        const text = extractChapterPlainText(chapter.content || "");
        if (!text) continue;
        for (const segment of splitForTts(text)) {
          if (!segment) continue;
          const buf = await synthesizeToMp3({ text: segment, voice, speed });
          audioChunks.push(buf);
        }
      }

      const merged = Buffer.concat(audioChunks);
      const safeTitle = (book.title || "audiobook").replace(/[^a-z0-9]/gi, "_").slice(0, 50);
      res.setHeader("Content-Type", "audio/mpeg");
      res.setHeader("Content-Disposition", `attachment; filename="${safeTitle}_audiobook.mp3"`);
      res.setHeader("Content-Length", merged.length);
      res.send(merged);
    } catch (err) {
      logger.error({ err }, "Audiobook export error");
      res.status(500).json({ message: "Failed to export audiobook" });
    }
  });

  // ─── Auth routes (extracted to ./routes/auth.routes.ts) ─────────────────
  app.use(authRouter);

  // ── Marketplace, Research, ISBN, ARC (extracted to ./routes/misc.routes.ts) ──

  // ─── Seed ──────────────────────────────────────────────────────────────────

  const existingBooks = await storage.getBooks();
  if (existingBooks.length === 0) {
    const defaultBook = await storage.createBook({
      title: "My First Story",
      summary: "A brief summary of my first AI-assisted story.",
    });
    await storage.createChapter({
      bookId: defaultBook.id,
      title: "Chapter 1: The Beginning",
      content: "It was a dark and stormy night..."
    });
  }

  // ── Gutenberg routes (extracted to ./routes/gutenberg.routes.ts) ─────────
  app.use(gutenbergRouter);

  // ── Series, Admin CRUD, Banner, Support (extracted to ./routes/misc.routes.ts) ──
  app.use(miscRouter);

  // ── Social routes (extracted to ./routes/social.routes.ts) ─────────
  app.use(socialRouter);

  // Trigger catalog sync, then pre-cache the top classics so the discover
  // page is reliable even when gutenberg.org is slow or unreachable. Both
  // jobs are idempotent (skip when already done) and run in the background
  // so they never block startup.
  setImmediate(async () => {
    try {
      await syncGutenbergCatalog();
      await precacheTopBooks();
    } catch (err) {
      logger.error({ err }, "Gutenberg startup jobs failed");
    }
  });

  return httpServer;
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function getChapterText(content: string): string {
  if (!content) return "";
  try {
    const parsed = JSON.parse(content);
    if (Array.isArray(parsed)) return parsed.join("\n\n");
  } catch { }
  return content;
}

function getChapterPages(content: string): string[] {
  if (!content) return [""];
  try {
    const parsed = JSON.parse(content);
    if (Array.isArray(parsed)) {
      return parsed.map((item: any) => {
        if (typeof item === "string") return item;
        // New TipTap format: { type: 'text', content: '<p>...</p>' }
        if (item && typeof item.content === "string") return item.content;
        return "";
      }).filter((s: string) => s.length > 0);
    }
  } catch { }
  return [content];
}

function stripHtml(html: string): string {
  return html
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n")
    .replace(/<\/h[1-6]>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function isHtmlContent(s: string): boolean {
  return /<[a-zA-Z]/.test(s);
}
