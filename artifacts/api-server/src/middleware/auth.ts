import type { Request, Response, NextFunction } from "express";
import { db } from "../db";
import { books, chapters, loreEntries, storyBeats, researchItems, arcRecipients } from "../../../../lib/db/src/schema";
import { eq } from "drizzle-orm";

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
//    Checks DB role column first, falls back to ADMIN_EMAIL env var
// ---------------------------------------------------------------------------
export function requireAdmin(req: Request, res: Response, next: NextFunction) {
  if (!req.isAuthenticated() || !req.user) {
    return res.status(401).json({ message: "Authentication required" });
  }
  const user = req.user as any;
  // Check DB role first (preferred), then env var fallback
  if (user.role === "admin") return next();
  const adminEmail = process.env.ADMIN_EMAIL;
  if (adminEmail && user.email === adminEmail) return next();
  return res.status(403).json({ message: "Forbidden" });
}

// ---------------------------------------------------------------------------
// 3) requireBookOwner — verifies the authenticated user owns the book
//
//    Looks for the book id in:
//      req.params.id       (e.g.  PUT /api/books/:id)
//      req.params.bookId   (e.g.  POST /api/books/:bookId/chapters)
//
//    For guest-created books (userId === null) the request is also allowed
//    when the bookId appears in the user's session guestBookIds list or the
//    guestIds query-param, preserving the existing guest-book flow.
//
//    On success the resolved book is attached as req.ownerBook so route
//    handlers can use it without a second DB fetch.
// ---------------------------------------------------------------------------

declare global {
  namespace Express {
    interface Request {
      ownerBook?: typeof books.$inferSelect;
    }
  }
}

export function requireBookOwner(req: Request, res: Response, next: NextFunction) {
  const bookId = Number(req.params.id || req.params.bookId);
  if (!bookId || isNaN(bookId)) {
    return res.status(400).json({ message: "Invalid book id" });
  }

  db.select()
    .from(books)
    .where(eq(books.id, bookId))
    .then(([book]) => {
      if (!book) return res.status(404).json({ message: "Book not found" });

      // Authenticated user owns this book
      if (req.isAuthenticated() && req.user) {
        const userId = (req.user as any).id;
        if (book.userId !== null && book.userId !== userId) {
          return res.status(403).json({ message: "You do not own this book" });
        }
        // book.userId === null means guest book — let authenticated user
        // through only if they're about to claim it (or it's in their guest list)
        req.ownerBook = book;
        return next();
      }

      // Unauthenticated guest flow: allow only if bookId is in their session
      // or query-param guest list AND the book has no owner
      if (book.userId === null) {
        const sess = req.session as any;
        const sessionGuestIds: number[] = sess?.guestBookIds || [];
        const rawQuery = (req.query.guestIds as string) || "";
        const queryGuestIds = rawQuery.split(",").filter(Boolean).map(Number).filter(n => !isNaN(n) && n > 0);
        const allGuestIds = [...new Set([...sessionGuestIds, ...queryGuestIds])];

        if (allGuestIds.includes(bookId)) {
          req.ownerBook = book;
          return next();
        }
      }

      return res.status(401).json({ message: "Authentication required" });
    })
    .catch(() => res.status(500).json({ message: "Internal error" }));
}

// ---------------------------------------------------------------------------
// 4) requireChapterOwner — looks up the chapter, then verifies book ownership
//
//    Expects req.params.id to be the chapter id.
// ---------------------------------------------------------------------------
export function requireChapterOwner(req: Request, res: Response, next: NextFunction) {
  const chapterId = Number(req.params.id);
  if (!chapterId || isNaN(chapterId)) {
    return res.status(400).json({ message: "Invalid chapter id" });
  }

  db.select()
    .from(chapters)
    .where(eq(chapters.id, chapterId))
    .then(([chapter]) => {
      if (!chapter) return res.status(404).json({ message: "Chapter not found" });
      // Rewrite params so requireBookOwner can resolve the book
      req.params.bookId = String(chapter.bookId);
      requireBookOwner(req, res, next);
    })
    .catch(() => res.status(500).json({ message: "Internal error" }));
}

// ---------------------------------------------------------------------------
// 5) requireChildOwner(table, fkColumn) — generic factory for any
//    book-child table (lore_entries, story_beats, research_items, arc_recipients)
//
//    Expects req.params.id to be the child row id.
//    Reads the row, gets its bookId, then delegates to requireBookOwner.
// ---------------------------------------------------------------------------
type BookChildTable =
  | typeof loreEntries
  | typeof storyBeats
  | typeof researchItems
  | typeof arcRecipients;

export function requireChildOwner(table: BookChildTable) {
  return (req: Request, res: Response, next: NextFunction) => {
    const rowId = Number(req.params.id);
    if (!rowId || isNaN(rowId)) {
      return res.status(400).json({ message: "Invalid id" });
    }

    db.select()
      .from(table)
      .where(eq((table as any).id, rowId))
      .then((rows: any[]) => {
        const row = rows[0];
        if (!row) return res.status(404).json({ message: "Not found" });
        req.params.bookId = String(row.bookId);
        requireBookOwner(req, res, next);
      })
      .catch(() => res.status(500).json({ message: "Internal error" }));
  };
}
