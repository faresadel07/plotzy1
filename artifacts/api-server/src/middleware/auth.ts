import type { Request, Response, NextFunction } from "express";
import { db } from "../db";
import { books, chapters, loreEntries, storyBeats, researchItems, arcRecipients, bookCollaborators } from "../../../../lib/db/src/schema";
import { eq, and, inArray, sql } from "drizzle-orm";
import { isAdminUser } from "../lib/admin";

// Parse the X-Guest-Books header sent by the frontend (main.tsx fetch
// override). Comma-separated list of numeric book IDs the user holds in
// localStorage from sessions where they wrote the draft as a guest.
// Returns [] for missing / malformed headers.
function readGuestBookHeader(req: Request): number[] {
  const raw = req.headers["x-guest-books"];
  if (!raw || typeof raw !== "string") return [];
  return raw
    .split(",")
    .map(s => Number(s.trim()))
    .filter(n => Number.isFinite(n) && n > 0);
}

// Late-claim: when a logged-in user fetches a book that's still
// userId=null (created as a guest, never claimed), and the bookId is
// vouched for by either the server-side session OR the X-Guest-Books
// header, transfer ownership inline. Returns the claimed book row, or
// null if no claim was possible.
//
// SECURITY: the X-Guest-Books header is client-controlled, so we treat
// the session-side list as authoritative and the header as an
// "additional hint". The atomic UPDATE … WHERE userId IS NULL prevents
// two concurrent late-claims (and any forged-header race) from both
// succeeding — only the first request flips userId, the second sees the
// row already owned and bails out.
async function tryLateClaim(book: typeof books.$inferSelect, req: Request): Promise<typeof books.$inferSelect | null> {
  if (book.userId !== null) return null;
  if (!req.isAuthenticated() || !req.user) return null;
  const userId = (req.user as any).id;

  const sess = req.session as any;
  const sessionGuestIds: number[] = sess?.guestBookIds || [];
  const headerGuestIds = readGuestBookHeader(req);
  // Cap the header list so a hostile client can't push thousands of ids
  // through the middleware on every request.
  const cappedHeaderIds = headerGuestIds.slice(0, 50);
  const allowed = new Set([...sessionGuestIds, ...cappedHeaderIds]);
  if (!allowed.has(book.id)) return null;

  // Atomic claim — UPDATE will return zero rows if another request already
  // assigned the owner, which is exactly the behaviour we want under a
  // race. Reading back the row reflects whichever caller won the race.
  await db.update(books)
    .set({ userId })
    .where(and(eq(books.id, book.id), sql`${books.userId} IS NULL`));
  if (sessionGuestIds.includes(book.id)) {
    sess.guestBookIds = sessionGuestIds.filter(id => id !== book.id);
  }
  const [claimed] = await db.select().from(books).where(eq(books.id, book.id));
  // Safety: if some other caller won the race and now owns the book, we
  // must NOT return it as if the current user owns it.
  if (!claimed || claimed.userId !== userId) return null;
  return claimed;
}

// ---------------------------------------------------------------------------
// 1) requireAuth — reject unauthenticated requests
// ---------------------------------------------------------------------------
export function requireAuth(req: Request, res: Response, next: NextFunction) {
  if (!req.isAuthenticated() || !req.user) {
    return res.status(401).json({ message: "Authentication required" });
  }
  next();
}

// ---------------------------------------------------------------------------
// 2) requireAdmin — reject non-admin users
//    Delegates to isAdminUser() so every admin check in the app obeys the
//    same rule (DB role is canonical; ADMIN_EMAIL is a dev-only fallback).
// ---------------------------------------------------------------------------
export function requireAdmin(req: Request, res: Response, next: NextFunction) {
  if (!req.isAuthenticated() || !req.user) {
    return res.status(401).json({ message: "Authentication required" });
  }
  if (isAdminUser(req.user)) return next();
  return res.status(403).json({ message: "Forbidden" });
}

// ---------------------------------------------------------------------------
// 2b) requireEmailVerified — block public-impact actions for unverified
//     accounts. Without this, anyone with a throwaway email can register,
//     skip the verification email, and start spamming comments / messages /
//     follows / likes / publish actions. OAuth users (Google/Apple/LinkedIn)
//     are auto-verified at signup since the provider already verified the
//     address.
//
//     The error includes a `code: "EMAIL_NOT_VERIFIED"` so the frontend can
//     show a "resend verification email" prompt instead of a generic 403.
// ---------------------------------------------------------------------------
export function requireEmailVerified(req: Request, res: Response, next: NextFunction) {
  if (!req.isAuthenticated() || !req.user) {
    return res.status(401).json({ message: "Authentication required" });
  }
  const u = req.user as any;
  if (u.emailVerified) return next();
  // Admins and OAuth-only users (no email column at all) are exempt — the
  // former are operators we trust, the latter have no email to verify.
  if (isAdminUser(req.user)) return next();
  if (!u.email) return next();
  return res.status(403).json({
    message: "Please verify your email address to perform this action.",
    code: "EMAIL_NOT_VERIFIED",
  });
}

// ---------------------------------------------------------------------------
// 3) requireBookOwner — verifies the authenticated user owns the book
// ---------------------------------------------------------------------------

declare global {
  namespace Express {
    interface Request {
      ownerBook?: typeof books.$inferSelect;
    }
  }
}

// Strict owner only — no collaborators allowed (for delete, publish, export)
export async function requireBookOwnerStrict(req: Request, res: Response, next: NextFunction) {
  const bookId = Number(req.params.id || req.params.bookId);
  if (!bookId || isNaN(bookId)) return res.status(400).json({ message: "Invalid book id" });
  if (!req.isAuthenticated() || !req.user) return res.status(401).json({ message: "Authentication required" });
  try {
    let [book] = await db.select().from(books).where(eq(books.id, bookId));
    if (!book) return res.status(404).json({ message: "Book not found" });
    // Late-claim if the user vouches for an unowned book via session
    // or X-Guest-Books header. Mirrors GET /api/books/:id.
    if (book.userId === null) {
      const claimed = await tryLateClaim(book, req);
      if (claimed) book = claimed;
    }
    if (book.userId !== (req.user as any).id) return res.status(403).json({ message: "Only the book owner can do this" });
    req.ownerBook = book;
    return next();
  } catch { return res.status(500).json({ message: "Internal error" }); }
}

export async function requireBookOwner(req: Request, res: Response, next: NextFunction) {
  // Prefer :bookId over :id. Upstream middleware (requireChapterOwner,
  // requireChildOwner) sets params.bookId after looking up the child row,
  // while params.id at that point is the *child* id (chapter/lore/etc) —
  // if we read :id first, we look up a book whose primary key accidentally
  // matches the child's id, bypassing the real ownership check.
  const raw = req.params.bookId ?? req.params.id;
  const bookId = Number(raw);
  if (!bookId || isNaN(bookId)) {
    return res.status(400).json({ message: "Invalid book id" });
  }

  try {
    let [book] = await db.select().from(books).where(eq(books.id, bookId));
    if (!book) return res.status(404).json({ message: "Book not found" });

    // Authenticated user owns this book OR is a collaborator
    if (req.isAuthenticated() && req.user) {
      const userId = (req.user as any).id;
      // Late-claim path. If the book is still ownerless and the user
      // vouches for it via session or X-Guest-Books header, take it
      // over before the owner check below. Without this, a draft
      // started while signed-out blocks the user from their own
      // audiobook export, AI tools, delete, etc.
      if (book.userId === null) {
        const claimed = await tryLateClaim(book, req);
        if (claimed) book = claimed;
      }
      if (book.userId === userId) {
        req.ownerBook = book;
        return next();
      }
      // Check if user is a collaborator with editor role
      const [collab] = await db.select().from(bookCollaborators)
        .where(and(eq(bookCollaborators.bookId, bookId), eq(bookCollaborators.userId, userId)));
      if (collab && collab.role === "editor") {
        req.ownerBook = book;
        return next();
      }
      if (collab && collab.role === "viewer") {
        // Viewers can read but not modify — allow GET only
        if (req.method === "GET") { req.ownerBook = book; return next(); }
        return res.status(403).json({ message: "You have read-only access to this book" });
      }
      if (book.userId !== null) {
        return res.status(403).json({ message: "You do not own this book" });
      }
    }

    // Unauthenticated guest flow — only trust server-side session, never query params
    if (book.userId === null) {
      const sess = req.session as any;
      const sessionGuestIds: number[] = sess?.guestBookIds || [];

      if (sessionGuestIds.includes(bookId)) {
        req.ownerBook = book;
        return next();
      }
    }

    return res.status(401).json({ message: "Authentication required" });
  } catch {
    return res.status(500).json({ message: "Internal error" });
  }
}

// ---------------------------------------------------------------------------
// 4) requireChapterOwner — looks up the chapter, then verifies book ownership
// ---------------------------------------------------------------------------
export async function requireChapterOwner(req: Request, res: Response, next: NextFunction) {
  const chapterId = Number(req.params.id);
  if (!chapterId || isNaN(chapterId)) {
    return res.status(400).json({ message: "Invalid chapter id" });
  }

  try {
    const [chapter] = await db.select().from(chapters).where(eq(chapters.id, chapterId));
    if (!chapter) return res.status(404).json({ message: "Chapter not found" });
    req.params.bookId = String(chapter.bookId);
    return requireBookOwner(req, res, next);
  } catch {
    return res.status(500).json({ message: "Internal error" });
  }
}

// ---------------------------------------------------------------------------
// 5) requireChildOwner(table) — generic factory for book-child tables
// ---------------------------------------------------------------------------
type BookChildTable =
  | typeof loreEntries
  | typeof storyBeats
  | typeof researchItems
  | typeof arcRecipients;

export function requireChildOwner(table: BookChildTable) {
  return async (req: Request, res: Response, next: NextFunction) => {
    const rowId = Number(req.params.id);
    if (!rowId || isNaN(rowId)) {
      return res.status(400).json({ message: "Invalid id" });
    }

    try {
      const rows = await db.select().from(table).where(eq((table as any).id, rowId));
      const row = rows[0];
      if (!row) return res.status(404).json({ message: "Not found" });
      req.params.bookId = String((row as any).bookId);
      return requireBookOwner(req, res, next);
    } catch {
      return res.status(500).json({ message: "Internal error" });
    }
  };
}
