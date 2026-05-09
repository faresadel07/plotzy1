// Send-or-skip helpers for the comment + like notification emails.
//
// Both senders share three suppression rules:
//   1. Self-action — skip if the actor is the book's own author.
//   2. Author preference — skip if author has
//      email_engagement_notifications=false.
//   3. Author has no email on file — skip silently.
//
// The like helper additionally enforces a per-book 1-hour debounce
// using books.last_like_email_sent_at as the anchor. A first like
// in a fresh window emails immediately and includes the count of
// likes received during the previous silenced interval (so the
// recipient sees "Alice and 4 others liked your book in the past
// hour" instead of one notification per like).
//
// Both send paths are fire-and-forget from the caller's
// perspective; this module catches and logs internally so a
// transient Resend / DB failure cannot crash the comment / like
// route.

import { and, eq, gt, sql } from "drizzle-orm";
import { db } from "../db";
import { books, bookLikes, users } from "../../../../lib/db/src/schema";
import { logger } from "./logger";
import {
  sendCommentNotificationEmail,
  sendLikeNotificationEmail,
} from "./email";

const LIKE_DEBOUNCE_MS = 60 * 60 * 1000; // 1 hour

/**
 * Email the book's author about a new comment, respecting the three
 * suppression rules. Caller passes the actor info captured from the
 * request; we resolve the author from the book id ourselves.
 */
export async function notifyAuthorOfComment(args: {
  bookId: number;
  commenterUserId: number | null; // null for anonymous comments
  commenterName: string;
  commentBody: string;
}): Promise<void> {
  try {
    const book = await db
      .select({ id: books.id, title: books.title, userId: books.userId })
      .from(books)
      .where(eq(books.id, args.bookId))
      .limit(1)
      .then((rows) => rows[0]);
    if (!book || !book.userId) return;

    // 1. self-action
    if (args.commenterUserId !== null && args.commenterUserId === book.userId) return;

    const author = await db
      .select({
        email: users.email,
        emailEngagementNotifications: users.emailEngagementNotifications,
      })
      .from(users)
      .where(eq(users.id, book.userId))
      .limit(1)
      .then((rows) => rows[0]);
    if (!author?.email) return;

    // 2. author preference
    if (author.emailEngagementNotifications === false) return;

    await sendCommentNotificationEmail(author.email, {
      commenterName: args.commenterName || "Someone",
      bookTitle: book.title,
      commentBody: args.commentBody,
      bookId: book.id,
      commenterProfilePath:
        args.commenterUserId !== null ? `/authors/${args.commenterUserId}` : null,
    });
  } catch (err) {
    logger.warn({ err, bookId: args.bookId }, "Failed to send comment notification email");
  }
}

/**
 * Email the book's author about a new like, respecting the three
 * suppression rules plus the per-book 1-hour debounce. The first
 * like in a fresh window emails immediately and reports the count
 * of likes received since the previous send (if any), giving a
 * "Alice and 4 others liked your book in the past hour" digest
 * feel without a separate cron.
 */
export async function notifyAuthorOfLike(args: {
  bookId: number;
  likerUserId: number;
  likerName: string;
}): Promise<void> {
  try {
    const book = await db
      .select({
        id: books.id,
        title: books.title,
        userId: books.userId,
        lastLikeEmailSentAt: books.lastLikeEmailSentAt,
      })
      .from(books)
      .where(eq(books.id, args.bookId))
      .limit(1)
      .then((rows) => rows[0]);
    if (!book || !book.userId) return;

    if (args.likerUserId === book.userId) return;

    const author = await db
      .select({
        email: users.email,
        emailEngagementNotifications: users.emailEngagementNotifications,
      })
      .from(users)
      .where(eq(users.id, book.userId))
      .limit(1)
      .then((rows) => rows[0]);
    if (!author?.email) return;
    if (author.emailEngagementNotifications === false) return;

    // 1-hour debounce. If the previous email was within the last
    // hour, skip — the next email after the window opens will
    // include this like in its batchCount.
    const now = Date.now();
    if (
      book.lastLikeEmailSentAt &&
      now - book.lastLikeEmailSentAt.getTime() < LIKE_DEBOUNCE_MS
    ) {
      return;
    }

    // Count likes received since the previous email (or all-time
    // if none was ever sent). This becomes the digest number.
    // Caps at "1 + 1 hour worth of likes" in practice because the
    // debounce gates the next send to >= 1h after the previous.
    const sinceFilter = book.lastLikeEmailSentAt
      ? gt(bookLikes.createdAt, book.lastLikeEmailSentAt)
      : undefined;
    const [{ c }] = await db
      .select({ c: sql<number>`count(*)::int` })
      .from(bookLikes)
      .where(
        sinceFilter
          ? and(eq(bookLikes.bookId, book.id), sinceFilter)
          : eq(bookLikes.bookId, book.id),
      );
    const batchCount = Math.max(c ?? 0, 1);

    await sendLikeNotificationEmail(author.email, {
      likerName: args.likerName || "Someone",
      bookTitle: book.title,
      bookId: book.id,
      likerProfilePath: `/authors/${args.likerUserId}`,
      batchCount,
    });

    // Update the debounce anchor server-side. NOW() avoids the JS
    // Date round-trip precision issue caught during the M-8 expiry-
    // reminder testing.
    await db
      .update(books)
      .set({ lastLikeEmailSentAt: sql`NOW()` })
      .where(eq(books.id, book.id));
  } catch (err) {
    logger.warn({ err, bookId: args.bookId }, "Failed to send like notification email");
  }
}
