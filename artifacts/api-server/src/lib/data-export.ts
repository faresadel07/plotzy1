import { db } from "../db";
import {
  users, books, chapters, chapterSnapshots, bookSeries,
  loreEntries, dailyProgress, storyBeats, researchItems, arcRecipients,
  bookComments, inlineComments, bookRatings, bookLikes,
  userStats, userAchievements,
  subscriptionPayments, transactions,
  courseProgress, courseQuizAttempts, courseCertificates, courseFinalProjects,
  bookCollaborators,
  follows, notifications, directMessages,
  loginAttempts, adminAuditLogs,
  supportMessages, supportReplies,
  dailyAiUsage, aiUsageLogs,
} from "../../../../lib/db/src/schema";
import { eq, or, and, inArray } from "drizzle-orm";

/**
 * GDPR Article 15 (right of access) data export.
 *
 * Returns a structured JSON payload containing every piece of personal
 * data tied to the requesting user, sourced from 23+ tables. The shape
 * is grouped by domain (profile, writing, course, social, support,
 * stats, audit) so a recipient can scan / filter the export without
 * needing to know the underlying schema.
 *
 * Excluded fields (security exemptions, documented in the response):
 *   - users.passwordHash (cryptographic keying material)
 *   - users.{googleId, appleId, linkedinId, facebookId} (third-party
 *     opaque subject IDs, needed for account linkage but not user PII)
 *   - email_verification_tokens / password_reset_tokens (server-side
 *     auth artefacts; exporting would create a token-replay surface)
 *
 * Excluded tables (out of scope):
 *   - course catalog (modules / lessons / quizzes / questions) — not
 *     user-specific
 *   - professionals, gutenberg_books, site_settings, tutorials —
 *     reference data, not PII
 *   - page_views, api_logs — operational telemetry; user-id rows are
 *     present but the data is system observability, not user-meaningful
 *
 * Volume estimate: ~1.5 MB JSON for a heavy user (10 books × 30
 * chapters × 5K words). In-memory generation; sync HTTP response.
 *
 * Performance: ~25 SELECT queries fired in parallel where independent.
 * Endpoint is rate-limited (sensitiveAuthLimiter, 5 req / 15 min) so
 * the cost is bounded regardless of user load.
 */
export interface UserDataExport {
  schemaVersion: number;
  exportedAt: string;
  userId: number;
  notice: string;
  user: Record<string, unknown>;
  subscription: {
    payments: unknown[];
    transactions: unknown[];
  };
  writing: {
    series: unknown[];
    books: unknown[]; // each book with embedded chapters + chapter_snapshots + lore + beats + research + arc + daily_progress
    bookComments: unknown[];
    inlineComments: unknown[];
    bookRatings: unknown[];
    bookLikes: unknown[];
  };
  course: {
    progress: unknown[];
    quizAttempts: unknown[];
    certificate: unknown | null;
    finalProject: unknown | null;
  };
  stats: {
    userStats: unknown | null;
    achievements: unknown[];
  };
  social: {
    following: unknown[];
    followers: unknown[];
    messagesSent: unknown[];
    messagesReceived: unknown[];
    notificationsReceived: unknown[];
    notificationsTriggered: unknown[];
    bookCollaborations: unknown[];
  };
  support: {
    tickets: unknown[];
    repliesAuthored: unknown[];
  };
  loginHistory: unknown[];
  auditLog: {
    asActor: unknown[];
    asTarget: unknown[];
  };
  platformUsage: {
    dailyAiUsage: unknown[];
    aiUsageLogs: unknown[];
  };
}

const EXCLUDED_FIELDS_NOTICE =
  "Per security policy, this export omits: passwordHash (cryptographic key), " +
  "OAuth subject IDs (googleId/appleId/linkedinId/facebookId/microsoftId — provider-issued " +
  "identifiers), and active/expired auth tokens (password reset, email verify). " +
  "Operational telemetry (page_views, api_logs) is also omitted as it constitutes " +
  "system observability rather than user-meaningful personal data.";

export async function exportUserData(userId: number): Promise<UserDataExport | null> {
  // 1. Fetch user row first; need it for email-based lookups (login_attempts).
  const [userRow] = await db.select().from(users).where(eq(users.id, userId));
  if (!userRow) return null;

  // Whitelist user fields. Drop the security-exempt columns explicitly
  // rather than `delete user.foo` so future schema additions don't
  // leak by default — opt-in inclusion.
  const userExport = {
    id: userRow.id,
    email: userRow.email,
    displayName: userRow.displayName,
    bio: userRow.bio,
    website: userRow.website,
    twitterHandle: userRow.twitterHandle,
    instagramHandle: userRow.instagramHandle,
    avatarUrl: userRow.avatarUrl,
    bannerUrl: userRow.bannerUrl,
    role: userRow.role,
    subscriptionStatus: userRow.subscriptionStatus,
    subscriptionTier: userRow.subscriptionTier,
    subscriptionPlan: userRow.subscriptionPlan,
    subscriptionEndDate: userRow.subscriptionEndDate,
    stripeCustomerId: userRow.stripeCustomerId,
    stripeSubscriptionId: userRow.stripeSubscriptionId,
    emailVerified: userRow.emailVerified,
    welcomeEmailSentAt: userRow.welcomeEmailSentAt,
    createdAt: userRow.createdAt,
  };

  // 2. Identify user's books (needed for nested-content queries).
  const userBooks = await db.select().from(books).where(eq(books.userId, userId));
  const bookIds = userBooks.map((b) => b.id);
  const chapterRowsForUser = bookIds.length > 0
    ? await db.select().from(chapters).where(inArray(chapters.bookId, bookIds))
    : [];
  const chapterIds = chapterRowsForUser.map((c) => c.id);

  // 3. Fire the rest of the queries in parallel. Independent SELECTs;
  //    pg pool max=5 caps real concurrency, but await all together to
  //    avoid sequential round-trips.
  const [
    seriesRows, snapshotRows, loreRows, dailyProgressRows, storyBeatRows,
    researchRows, arcRecipientRows,
    bookCommentRows, inlineCommentRows, bookRatingRows, bookLikeRows,
    transactionRows,
    paymentRows,
    progressRows, attemptRows, certRows, finalProjectRows,
    statsRows, achievementRows,
    followAsFollower, followAsFollowee,
    messagesSentRows, messagesReceivedRows,
    notifAsRecipient, notifAsActor,
    collabRows,
    ticketRows, replyRows,
    loginRows,
    auditAsActor, auditAsTarget,
    aiDailyRows, aiLogRows,
  ] = await Promise.all([
    db.select().from(bookSeries).where(eq(bookSeries.userId, userId)),
    // The `inArray(col, [-1])` form for the empty case ensures the
    // query returns zero rows (no row has a negative id) while
    // preserving Drizzle's inferred row type — using a bare
    // `Promise.resolve([])` widens to never[] and breaks downstream
    // .filter() callers.
    db.select().from(chapterSnapshots).where(inArray(chapterSnapshots.chapterId, chapterIds.length > 0 ? chapterIds : [-1])),
    db.select().from(loreEntries).where(inArray(loreEntries.bookId, bookIds.length > 0 ? bookIds : [-1])),
    db.select().from(dailyProgress).where(inArray(dailyProgress.bookId, bookIds.length > 0 ? bookIds : [-1])),
    db.select().from(storyBeats).where(inArray(storyBeats.bookId, bookIds.length > 0 ? bookIds : [-1])),
    db.select().from(researchItems).where(inArray(researchItems.bookId, bookIds.length > 0 ? bookIds : [-1])),
    db.select().from(arcRecipients).where(inArray(arcRecipients.bookId, bookIds.length > 0 ? bookIds : [-1])),
    db.select().from(bookComments).where(eq(bookComments.userId, userId)),
    db.select().from(inlineComments).where(eq(inlineComments.userId, userId)),
    db.select().from(bookRatings).where(eq(bookRatings.userId, userId)),
    db.select().from(bookLikes).where(eq(bookLikes.userId, userId)),
    db.select().from(transactions).where(inArray(transactions.bookId, bookIds.length > 0 ? bookIds : [-1])),
    db.select().from(subscriptionPayments).where(eq(subscriptionPayments.userId, userId)),
    db.select().from(courseProgress).where(eq(courseProgress.userId, userId)),
    db.select().from(courseQuizAttempts).where(eq(courseQuizAttempts.userId, userId)),
    db.select().from(courseCertificates).where(eq(courseCertificates.userId, userId)),
    db.select().from(courseFinalProjects).where(eq(courseFinalProjects.userId, userId)),
    db.select().from(userStats).where(eq(userStats.userId, userId)),
    db.select().from(userAchievements).where(eq(userAchievements.userId, userId)),
    db.select().from(follows).where(eq(follows.followerId, userId)),
    db.select().from(follows).where(eq(follows.followeeId, userId)),
    db.select().from(directMessages).where(eq(directMessages.senderId, userId)),
    db.select().from(directMessages).where(eq(directMessages.receiverId, userId)),
    db.select().from(notifications).where(eq(notifications.userId, userId)),
    db.select().from(notifications).where(eq(notifications.actorId, userId)),
    db.select().from(bookCollaborators).where(eq(bookCollaborators.userId, userId)),
    db.select().from(supportMessages).where(eq(supportMessages.userId, userId)),
    db.select().from(supportReplies).where(eq(supportReplies.senderUserId, userId)),
    db.select().from(loginAttempts).where(eq(loginAttempts.email, (userRow.email ?? "__no_email__").toLowerCase())),
    db.select().from(adminAuditLogs).where(eq(adminAuditLogs.adminId, userId)),
    db.select().from(adminAuditLogs).where(and(eq(adminAuditLogs.targetType, "user"), eq(adminAuditLogs.targetId, userId))),
    db.select().from(dailyAiUsage).where(eq(dailyAiUsage.userId, userId)),
    db.select().from(aiUsageLogs).where(eq(aiUsageLogs.userId, userId)),
  ]);

  // 4. Embed chapters + their snapshots into each book so the writing
  //    section reads like a self-contained dump.
  const chaptersByBookId = new Map<number, typeof chapterRowsForUser>();
  for (const c of chapterRowsForUser) {
    const arr = chaptersByBookId.get(c.bookId);
    if (arr) arr.push(c);
    else chaptersByBookId.set(c.bookId, [c]);
  }
  const snapshotsByChapterId = new Map<number, typeof snapshotRows>();
  for (const s of snapshotRows) {
    const arr = snapshotsByChapterId.get(s.chapterId);
    if (arr) arr.push(s);
    else snapshotsByChapterId.set(s.chapterId, [s]);
  }
  const booksWithChapters = userBooks.map((b) => ({
    ...b,
    chapters: (chaptersByBookId.get(b.id) ?? []).map((c) => ({
      ...c,
      snapshots: snapshotsByChapterId.get(c.id) ?? [],
    })),
    loreEntries: loreRows.filter((r) => r.bookId === b.id),
    storyBeats: storyBeatRows.filter((r) => r.bookId === b.id),
    researchItems: researchRows.filter((r) => r.bookId === b.id),
    arcRecipients: arcRecipientRows.filter((r) => r.bookId === b.id),
    dailyProgress: dailyProgressRows.filter((r) => r.bookId === b.id),
  }));

  return {
    schemaVersion: 1,
    exportedAt: new Date().toISOString(),
    userId,
    notice: EXCLUDED_FIELDS_NOTICE,
    user: userExport,
    subscription: {
      payments: paymentRows,
      transactions: transactionRows,
    },
    writing: {
      series: seriesRows,
      books: booksWithChapters,
      bookComments: bookCommentRows,
      inlineComments: inlineCommentRows,
      bookRatings: bookRatingRows,
      bookLikes: bookLikeRows,
    },
    course: {
      progress: progressRows,
      quizAttempts: attemptRows,
      certificate: certRows[0] ?? null,
      finalProject: finalProjectRows[0] ?? null,
    },
    stats: {
      userStats: statsRows[0] ?? null,
      achievements: achievementRows,
    },
    social: {
      following: followAsFollower,
      followers: followAsFollowee,
      messagesSent: messagesSentRows,
      messagesReceived: messagesReceivedRows,
      notificationsReceived: notifAsRecipient,
      notificationsTriggered: notifAsActor,
      bookCollaborations: collabRows,
    },
    support: {
      tickets: ticketRows,
      repliesAuthored: replyRows,
    },
    loginHistory: loginRows,
    auditLog: {
      asActor: auditAsActor,
      asTarget: auditAsTarget,
    },
    platformUsage: {
      dailyAiUsage: aiDailyRows,
      aiUsageLogs: aiLogRows,
    },
  };
}
// Mark `or` as referenced (kept in import for clarity / future filter use)
void or;
