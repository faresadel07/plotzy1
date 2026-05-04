import { db } from "./db";
import { eq, or, count, desc, asc, sql, sum, and, inArray, isNull, getTableColumns } from "drizzle-orm";
import {
  books, chapters, users, loreEntries, dailyProgress, storyBeats,
  userStats, userAchievements, bookSeries, supportMessages, siteSettings,
  subscriptionPayments,
  follows, notifications, directMessages, bookLikes, bookComments, bookRatings, inlineComments,
  type Book, type InsertBook, type InlineComment, type InsertInlineComment,
  type Chapter, type InsertChapter,
  type User, type InsertUser,
  type LoreEntry, type InsertLoreEntry,
  type DailyProgress, type InsertDailyProgress,
  type StoryBeat, type InsertStoryBeat,
  type BookSeries, type InsertBookSeries,
  type SupportMessage, type InsertSupportMessage,
  type Follow, type Notification, type DirectMessage,
} from "../../../lib/db/src/schema";

export type UserStats = typeof userStats.$inferSelect;
export type UserAchievement = typeof userAchievements.$inferSelect;

export type PublishedBook = Book & { authorDisplayName: string | null; authorAvatarUrl: string | null };

// Same source-of-truth pattern as InsertUser — every column the schema
// allows to be inserted is also a valid update target, just optional.
type UpdateUser = Partial<Omit<typeof users.$inferInsert, "id" | "createdAt">>;

export interface IStorage {
  getBooks(): Promise<Book[]>;
  getUserBooks(userId: number): Promise<Book[]>;
  getGuestBooks(): Promise<Book[]>;
  getBooksByIds(ids: number[]): Promise<Book[]>;
  getGuestBooksByIds(ids: number[]): Promise<Book[]>;
  claimGuestBooks(bookIds: number[], userId: number): Promise<void>;
  getDeletedBooks(): Promise<Book[]>;
  getBook(id: number): Promise<Book | undefined>;
  createBook(book: InsertBook): Promise<Book>;
  updateBook(id: number, updates: Partial<InsertBook>): Promise<Book>;
  deleteBook(id: number): Promise<void>;

  getChapter(id: number): Promise<Chapter | undefined>;
  getChapters(bookId: number): Promise<Chapter[]>;
  createChapter(chapter: InsertChapter): Promise<Chapter>;
  updateChapter(id: number, updates: Partial<InsertChapter>): Promise<Chapter>;
  deleteChapter(id: number): Promise<void>;
  getUserChapterCount(userId: number): Promise<number>;

  getLoreEntries(bookId: number): Promise<LoreEntry[]>;
  createLoreEntry(entry: InsertLoreEntry): Promise<LoreEntry>;
  updateLoreEntry(id: number, updates: Partial<InsertLoreEntry>): Promise<LoreEntry>;
  deleteLoreEntry(id: number): Promise<void>;

  getDailyProgress(bookId: number): Promise<DailyProgress[]>;
  updateDailyProgress(bookId: number, wordsAdded: number): Promise<DailyProgress>;

  getStoryBeats(bookId: number): Promise<StoryBeat[]>;
  createStoryBeat(beat: InsertStoryBeat): Promise<StoryBeat>;
  updateStoryBeat(id: number, updates: Partial<InsertStoryBeat>): Promise<StoryBeat>;
  deleteStoryBeat(id: number): Promise<void>;
  reorderStoryBeats(updates: { id: number; columnId: string; order: number }[]): Promise<void>;
  reorderChapters(updates: { id: number; order: number }[]): Promise<void>;

  getUserById(id: number): Promise<User | undefined>;
  getUserByGoogleId(googleId: string): Promise<User | undefined>;
  getUserByAppleId(appleId: string): Promise<User | undefined>;
  getUserByLinkedinId(linkedinId: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: number, updates: UpdateUser): Promise<User>;

  // Publishing
  publishBook(id: number, publish: boolean): Promise<Book>;
  getPublishedBooks(): Promise<PublishedBook[]>;
  getPublishedBook(id: number): Promise<PublishedBook | undefined>;
  getPublishedBookChapters(bookId: number): Promise<Chapter[]>;
  incrementBookViewCount(id: number): Promise<void>;
  getFeaturedBook(): Promise<PublishedBook | undefined>;
  setFeaturedBook(bookId: number | null): Promise<void>;

  // Gamification
  getOrCreateUserStats(userId: number): Promise<UserStats>;
  getUserAchievements(userId: number): Promise<UserAchievement[]>;
  unlockAchievement(userId: number, achievementId: string): Promise<UserAchievement | null>;
  addWordsToUserStats(userId: number, wordDelta: number): Promise<UserStats>;
  incrementUserViews(userId: number, delta?: number): Promise<void>;
  incrementUserPublished(userId: number): Promise<void>;
  decrementUserPublished(userId: number): Promise<void>;
  incrementUserChapters(userId: number): Promise<void>;
  updateWritingStreak(userId: number): Promise<UserStats>;
  getUserTotalViews(userId: number): Promise<number>;

  // Series
  getUserSeries(userId: number): Promise<BookSeries[]>;
  getSeries(id: number): Promise<BookSeries | undefined>;
  createSeries(series: InsertBookSeries): Promise<BookSeries>;
  updateSeries(id: number, updates: Partial<InsertBookSeries>): Promise<BookSeries>;
  deleteSeries(id: number): Promise<void>;
  assignBookToSeries(bookId: number, seriesId: number | null, seriesOrder?: number): Promise<Book>;
  getSeriesBooks(seriesId: number): Promise<Book[]>;
  reorderSeriesBooks(updates: { bookId: number; seriesOrder: number }[]): Promise<void>;

  // Admin
  getAllUsers(opts?: { limit?: number; offset?: number }): Promise<User[]>;
  deleteUser(id: number): Promise<void>;
  suspendUser(id: number, suspended: boolean): Promise<User>;
  getSupportMessages(): Promise<SupportMessage[]>;
  submitSupportMessage(data: InsertSupportMessage): Promise<SupportMessage>;
  updateSupportMessage(id: number, updates: { read?: boolean; status?: string }): Promise<SupportMessage>;
  getUnreadSupportCount(): Promise<number>;
  getAdminStats(): Promise<{ totalUsers: number; totalBooks: number; publishedBooks: number; totalChapters: number; openSupportTickets: number }>;
  getActivityFeed(): Promise<Array<{ type: string; title: string; subtitle: string; time: string }>>;
  getSetting(key: string): Promise<string | null>;
  setSetting(key: string, value: string | null): Promise<void>;

  // Social: Follows
  followUser(followerId: number, followeeId: number): Promise<Follow>;
  unfollowUser(followerId: number, followeeId: number): Promise<void>;
  isFollowing(followerId: number, followeeId: number): Promise<boolean>;
  getFollowersCount(userId: number): Promise<number>;
  getFollowingCount(userId: number): Promise<number>;

  // Social: Notifications
  getNotifications(userId: number, limit?: number): Promise<Notification[]>;
  getUnreadNotificationCount(userId: number): Promise<number>;
  createNotification(data: { userId: number; type: string; title: string; body?: string; linkUrl?: string; actorId?: number; entityId?: number }): Promise<Notification>;
  markNotificationRead(id: number, userId: number): Promise<void>;
  markAllNotificationsRead(userId: number): Promise<void>;

  // Social: Messages
  getConversations(userId: number): Promise<any[]>;
  getMessages(userId: number, otherUserId: number, limit?: number): Promise<DirectMessage[]>;
  sendMessage(senderId: number, receiverId: number, content: string): Promise<DirectMessage>;
  markMessagesRead(receiverId: number, senderId: number): Promise<void>;
  getUnreadMessageCount(userId: number): Promise<number>;

  // Book Likes
  likeBook(userId: number, bookId: number): Promise<void>;
  unlikeBook(userId: number, bookId: number): Promise<void>;
  isBookLiked(userId: number, bookId: number): Promise<boolean>;
  getBookLikesCount(bookId: number): Promise<number>;
  getBookLikesCounts(bookIds: number[]): Promise<Map<number, number>>;
  getAuthorTotalLikes(userId: number): Promise<number>;
}

export class DatabaseStorage implements IStorage {
  async getBooks(): Promise<Book[]> {
    return await db.select().from(books).where(eq(books.isDeleted, false));
  }

  async getUserBooks(userId: number): Promise<Book[]> {
    return await db.select().from(books).where(
      and(eq(books.isDeleted, false), eq(books.userId, userId))
    );
  }

  async getGuestBooks(): Promise<Book[]> {
    return await db.select().from(books).where(
      and(eq(books.isDeleted, false), isNull(books.userId))
    );
  }

  async getBooksByIds(ids: number[]): Promise<Book[]> {
    if (ids.length === 0) return [];
    return await db.select().from(books).where(
      and(eq(books.isDeleted, false), inArray(books.id, ids))
    );
  }

  // Only returns books that are genuinely owner-less (guest-created). Used by
  // the unauthenticated `GET /api/books` path so stale or forged guest IDs
  // cannot expose books that now belong to a real user.
  async getGuestBooksByIds(ids: number[]): Promise<Book[]> {
    if (ids.length === 0) return [];
    return await db.select().from(books).where(
      and(eq(books.isDeleted, false), inArray(books.id, ids), isNull(books.userId))
    );
  }

  async claimGuestBooks(bookIds: number[], userId: number): Promise<void> {
    if (bookIds.length === 0) return;
    await db.update(books)
      .set({ userId } as any)
      .where(and(inArray(books.id, bookIds), isNull(books.userId)));
  }

  async getDeletedBooks(): Promise<Book[]> {
    return await db.select().from(books).where(eq(books.isDeleted, true));
  }

  async getBook(id: number): Promise<Book | undefined> {
    const [book] = await db.select().from(books).where(eq(books.id, id));
    return book;
  }

  async createBook(insertBook: InsertBook): Promise<Book> {
    const [book] = await db.insert(books).values(insertBook).returning();
    return book;
  }

  async updateBook(id: number, updates: Partial<InsertBook> & { isDeleted?: boolean }): Promise<Book> {
    const [book] = await db.update(books).set(updates).where(eq(books.id, id)).returning();
    return book;
  }

  async deleteBook(id: number): Promise<void> {
    await db.delete(books).where(eq(books.id, id));
  }

  // ─── Daily Progress ────────────────────────────────────────────────────────
  async getDailyProgress(bookId: number): Promise<DailyProgress[]> {
    return await db.select().from(dailyProgress).where(eq(dailyProgress.bookId, bookId));
  }

  async updateDailyProgress(bookId: number, wordsAdded: number): Promise<DailyProgress> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const records = await db
      .select()
      .from(dailyProgress)
      .where(eq(dailyProgress.bookId, bookId));

    const todaysRecord = records.find(r => {
      const rDate = new Date(r.date);
      rDate.setHours(0, 0, 0, 0);
      return rDate.getTime() === today.getTime();
    });

    if (todaysRecord) {
      const [updated] = await db
        .update(dailyProgress)
        .set({ wordCount: Math.max(0, todaysRecord.wordCount + wordsAdded) })
        .where(eq(dailyProgress.id, todaysRecord.id))
        .returning();
      return updated;
    } else {
      const [created] = await db
        .insert(dailyProgress)
        .values({ bookId, date: today, wordCount: Math.max(0, wordsAdded) })
        .returning();
      return created;
    }
  }

  // ─── Story Beats ───────────────────────────────────────────────────────────
  async getStoryBeats(bookId: number): Promise<StoryBeat[]> {
    return await db.select().from(storyBeats).where(eq(storyBeats.bookId, bookId));
  }

  async createStoryBeat(beat: InsertStoryBeat): Promise<StoryBeat> {
    const [created] = await db.insert(storyBeats).values(beat).returning();
    return created;
  }

  async updateStoryBeat(id: number, updates: Partial<InsertStoryBeat>): Promise<StoryBeat> {
    const [updated] = await db.update(storyBeats).set(updates).where(eq(storyBeats.id, id)).returning();
    return updated;
  }

  async deleteStoryBeat(id: number): Promise<void> {
    await db.delete(storyBeats).where(eq(storyBeats.id, id));
  }

  async reorderStoryBeats(updates: { id: number; columnId: string; order: number }[]): Promise<void> {
    if (updates.length === 0) return;
    const VALID_COLUMNS = ["act1", "act2", "act3"];
    // Batched as a single UPDATE with CASE/WHEN per row instead of one
    // round-trip per beat. Drag-and-drop reordering 30 beats was 30
    // sequential statements (~600ms on Neon); this is one statement.
    const ids = updates.map(u => Number(u.id)).filter(Number.isFinite);
    if (ids.length === 0) return;
    const orderCases = sql.join(
      updates.map(u => sql`WHEN ${Number(u.id)} THEN ${Number(u.order)}`),
      sql` `,
    );
    const colCases = sql.join(
      updates.map(u => {
        const safeCol = VALID_COLUMNS.includes(u.columnId) ? u.columnId : "act1";
        return sql`WHEN ${Number(u.id)} THEN ${safeCol}`;
      }),
      sql` `,
    );
    await db.execute(sql`
      UPDATE story_beats
      SET "order" = CASE id ${orderCases} END,
          "column_id" = CASE id ${colCases} END
      WHERE id IN (${sql.join(ids.map(id => sql`${id}`), sql`, `)})
    `);
  }

  async reorderChapters(updates: { id: number; order: number }[]): Promise<void> {
    if (updates.length === 0) return;
    const ids = updates.map(u => Number(u.id)).filter(Number.isFinite);
    if (ids.length === 0) return;
    const orderCases = sql.join(
      updates.map(u => sql`WHEN ${Number(u.id)} THEN ${Number(u.order)}`),
      sql` `,
    );
    await db.execute(sql`
      UPDATE chapters
      SET "order" = CASE id ${orderCases} END
      WHERE id IN (${sql.join(ids.map(id => sql`${id}`), sql`, `)})
    `);
  }

  // ─── Chapters ──────────────────────────────────────────────────────────────
  async getChapter(id: number): Promise<Chapter | undefined> {
    const [chapter] = await db.select().from(chapters).where(eq(chapters.id, id));
    return chapter;
  }

  async getChapters(bookId: number): Promise<Chapter[]> {
    return await db.select().from(chapters).where(eq(chapters.bookId, bookId));
  }

  async createChapter(insertChapter: InsertChapter): Promise<Chapter> {
    const [chapter] = await db.insert(chapters).values(insertChapter).returning();
    return chapter;
  }

  async updateChapter(id: number, updates: Partial<InsertChapter>): Promise<Chapter> {
    const [chapter] = await db.update(chapters).set(updates).where(eq(chapters.id, id)).returning();
    return chapter;
  }

  async deleteChapter(id: number): Promise<void> {
    await db.delete(chapters).where(eq(chapters.id, id));
  }

  async getUserChapterCount(userId: number): Promise<number> {
    const [result] = await db
      .select({ count: count() })
      .from(chapters)
      .where(eq(chapters.userId, userId));
    return result?.count ?? 0;
  }

  // ─── Lore ──────────────────────────────────────────────────────────────────
  async getLoreEntries(bookId: number): Promise<LoreEntry[]> {
    return await db.select().from(loreEntries).where(eq(loreEntries.bookId, bookId));
  }

  async createLoreEntry(entry: InsertLoreEntry): Promise<LoreEntry> {
    const [lore] = await db.insert(loreEntries).values(entry).returning();
    return lore;
  }

  async updateLoreEntry(id: number, updates: Partial<InsertLoreEntry>): Promise<LoreEntry> {
    const [lore] = await db.update(loreEntries).set(updates).where(eq(loreEntries.id, id)).returning();
    return lore;
  }

  async deleteLoreEntry(id: number): Promise<void> {
    await db.delete(loreEntries).where(eq(loreEntries.id, id));
  }

  // ─── Users ─────────────────────────────────────────────────────────────────
  async getUserById(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByGoogleId(googleId: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.googleId, googleId));
    return user;
  }

  async getUserByAppleId(appleId: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.appleId, appleId));
    return user;
  }

  async getUserByLinkedinId(linkedinId: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.linkedinId, linkedinId));
    return user;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db.insert(users).values(insertUser).returning();
    return user;
  }

  async updateUser(id: number, updates: UpdateUser): Promise<User> {
    const [user] = await db.update(users).set(updates as any).where(eq(users.id, id)).returning();
    return user;
  }

  // ─── Publishing ────────────────────────────────────────────────────────────

  async publishBook(id: number, publish: boolean): Promise<Book> {
    if (publish) {
      const [bookData] = await db.select().from(books).where(eq(books.id, id));
      if (bookData?.contentType === "article") {
        // Articles need articleContent, not chapters
        if (!bookData.articleContent?.trim()) throw new Error("EMPTY_ARTICLE");
      } else {
        const bookChapters = await this.getChapters(id);
        if (bookChapters.length === 0) throw new Error("EMPTY_BOOK");
      }
    }
    const [book] = await db
      .update(books)
      .set({
        isPublished: publish,
        publishedAt: publish ? new Date() : null,
      } as any)
      .where(eq(books.id, id))
      .returning();
    return book;
  }

  async getPublishedBooks(): Promise<PublishedBook[]> {
    const rows = await db
      .select({
        ...getTableColumns(books),
        authorDisplayName: users.displayName,
        authorAvatarUrl: users.avatarUrl,
      })
      .from(books)
      .leftJoin(users, eq(books.userId, users.id))
      .where(and(eq(books.isPublished, true), eq(books.isDeleted, false)))
      .orderBy(desc(books.publishedAt));
    return rows as PublishedBook[];
  }

  async getPublishedArticles(): Promise<PublishedBook[]> {
    const rows = await db
      .select({ ...getTableColumns(books), authorDisplayName: users.displayName, authorAvatarUrl: users.avatarUrl })
      .from(books)
      .leftJoin(users, eq(books.userId, users.id))
      .where(and(eq(books.isPublished, true), eq(books.isDeleted, false), eq(books.contentType, "article")))
      .orderBy(desc(books.publishedAt));
    return rows as PublishedBook[];
  }

  async getPublishedBook(id: number): Promise<PublishedBook | undefined> {
    const [row] = await db
      .select({
        ...getTableColumns(books),
        authorDisplayName: users.displayName,
        authorAvatarUrl: users.avatarUrl,
      })
      .from(books)
      .leftJoin(users, eq(books.userId, users.id))
      .where(eq(books.id, id));
    return row as PublishedBook | undefined;
  }

  async getPublishedBookChapters(bookId: number): Promise<Chapter[]> {
    return await db.select().from(chapters).where(eq(chapters.bookId, bookId));
  }

  async incrementBookViewCount(id: number): Promise<void> {
    await db
      .update(books)
      .set({ viewCount: sql`${books.viewCount} + 1` } as any)
      .where(eq(books.id, id));
  }

  async getFeaturedBook(): Promise<PublishedBook | undefined> {
    const [row] = await db
      .select({
        ...getTableColumns(books),
        authorDisplayName: users.displayName,
        authorAvatarUrl: users.avatarUrl,
      })
      .from(books)
      .leftJoin(users, eq(books.userId, users.id))
      .where(and(eq(books.isPublished, true), eq(books.featured, true)))
      .limit(1);
    return row as PublishedBook | undefined;
  }

  async setFeaturedBook(bookId: number | null): Promise<void> {
    // Run both updates in a transaction so a public reader never sees a
    // window with zero featured books between "clear all" and "set one".
    await db.transaction(async (tx) => {
      await tx.update(books).set({ featured: false } as any);
      if (bookId !== null) {
        await tx.update(books).set({ featured: true } as any).where(eq(books.id, bookId));
      }
    });
  }

  // ─── Gamification ──────────────────────────────────────────────────────────
  async getOrCreateUserStats(userId: number): Promise<UserStats> {
    const [existing] = await db.select().from(userStats).where(eq(userStats.userId, userId));
    if (existing) return existing;
    const [created] = await db.insert(userStats).values({ userId }).returning();
    return created;
  }

  async getUserAchievements(userId: number): Promise<UserAchievement[]> {
    return await db.select().from(userAchievements).where(eq(userAchievements.userId, userId));
  }

  async unlockAchievement(userId: number, achievementId: string): Promise<UserAchievement | null> {
    const existing = await db.select().from(userAchievements)
      .where(eq(userAchievements.userId, userId));
    if (existing.some(a => a.achievementId === achievementId)) return null;
    const [created] = await db.insert(userAchievements)
      .values({ userId, achievementId })
      .returning();
    return created;
  }

  async addWordsToUserStats(userId: number, wordDelta: number): Promise<UserStats> {
    await this.getOrCreateUserStats(userId);
    const [updated] = await db.update(userStats)
      .set({
        totalWordsWritten: sql`${userStats.totalWordsWritten} + ${wordDelta}`,
        updatedAt: new Date(),
      } as any)
      .where(eq(userStats.userId, userId))
      .returning();
    return updated;
  }

  async incrementUserViews(userId: number, delta = 1): Promise<void> {
    await this.getOrCreateUserStats(userId);
    await db.update(userStats)
      .set({
        totalViewsReceived: sql`${userStats.totalViewsReceived} + ${delta}`,
        updatedAt: new Date(),
      } as any)
      .where(eq(userStats.userId, userId));
  }

  async incrementUserPublished(userId: number): Promise<void> {
    await this.getOrCreateUserStats(userId);
    await db.update(userStats)
      .set({
        totalBooksPublished: sql`${userStats.totalBooksPublished} + 1`,
        updatedAt: new Date(),
      } as any)
      .where(eq(userStats.userId, userId));
  }

  async decrementUserPublished(userId: number): Promise<void> {
    await this.getOrCreateUserStats(userId);
    await db.update(userStats)
      .set({
        totalBooksPublished: sql`GREATEST(${userStats.totalBooksPublished} - 1, 0)`,
        updatedAt: new Date(),
      } as any)
      .where(eq(userStats.userId, userId));
  }

  async incrementUserChapters(userId: number): Promise<void> {
    await this.getOrCreateUserStats(userId);
    await db.update(userStats)
      .set({
        totalChaptersWritten: sql`${userStats.totalChaptersWritten} + 1`,
        updatedAt: new Date(),
      } as any)
      .where(eq(userStats.userId, userId));
  }

  async updateWritingStreak(userId: number): Promise<UserStats> {
    const stats = await this.getOrCreateUserStats(userId);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    let newStreak = stats.streakDays;
    if (!stats.lastWritingDate) {
      newStreak = 1;
    } else {
      const lastDate = new Date(stats.lastWritingDate);
      lastDate.setHours(0, 0, 0, 0);
      if (lastDate.getTime() === today.getTime()) {
        // already wrote today, no streak change
        return stats;
      } else if (lastDate.getTime() === yesterday.getTime()) {
        newStreak = stats.streakDays + 1;
      } else {
        newStreak = 1;
      }
    }

    const newLongest = Math.max(newStreak, stats.longestStreak);
    const [updated] = await db.update(userStats)
      .set({
        streakDays: newStreak,
        longestStreak: newLongest,
        lastWritingDate: new Date(),
        updatedAt: new Date(),
      } as any)
      .where(eq(userStats.userId, userId))
      .returning();
    return updated;
  }

  async getUserTotalViews(userId: number): Promise<number> {
    const result = await db
      .select({ total: sql<number>`COALESCE(SUM(${books.viewCount}), 0)` })
      .from(books)
      .where(eq(books.userId, userId));
    return Number(result[0]?.total ?? 0);
  }

  // ── Series ──────────────────────────────────────────────────────────────────
  async getUserSeries(userId: number): Promise<BookSeries[]> {
    return await db.select().from(bookSeries)
      .where(eq(bookSeries.userId, userId))
      .orderBy(desc(bookSeries.createdAt));
  }

  async getSeries(id: number): Promise<BookSeries | undefined> {
    const [s] = await db.select().from(bookSeries).where(eq(bookSeries.id, id));
    return s;
  }

  async createSeries(series: InsertBookSeries): Promise<BookSeries> {
    const [s] = await db.insert(bookSeries).values(series).returning();
    return s;
  }

  async updateSeries(id: number, updates: Partial<InsertBookSeries>): Promise<BookSeries> {
    const [s] = await db.update(bookSeries).set(updates as any).where(eq(bookSeries.id, id)).returning();
    return s;
  }

  async deleteSeries(id: number): Promise<void> {
    // Unassign all books from this series first
    await db.update(books).set({ seriesId: null, seriesOrder: 0 } as any).where(eq(books.seriesId as any, id));
    await db.delete(bookSeries).where(eq(bookSeries.id, id));
  }

  async assignBookToSeries(bookId: number, seriesId: number | null, seriesOrder = 0): Promise<Book> {
    const [b] = await db.update(books)
      .set({ seriesId, seriesOrder } as any)
      .where(eq(books.id, bookId))
      .returning();
    return b;
  }

  async getSeriesBooks(seriesId: number): Promise<Book[]> {
    return await db.select().from(books)
      .where(and(eq(books.isDeleted, false), eq(books.seriesId as any, seriesId)))
      .orderBy(asc(books.seriesOrder as any));
  }

  /** Fetch all series for a user with their books in 2 queries (avoids N+1) */
  async getUserSeriesWithBooks(userId: number): Promise<(BookSeries & { books: Book[]; stats: { totalChapters: number; totalWords: number; totalWordGoal: number } })[]> {
    const seriesList = await db.select().from(bookSeries)
      .where(eq(bookSeries.userId, userId))
      .orderBy(desc(bookSeries.createdAt));
    if (seriesList.length === 0) return [];
    const seriesIds = seriesList.map(s => s.id);
    const allBooks = await db.select().from(books)
      .where(and(
        eq(books.isDeleted, false),
        inArray(books.seriesId as any, seriesIds),
      ))
      .orderBy(asc(books.seriesOrder as any));

    // Group books by seriesId
    const booksBySeries = new Map<number, Book[]>();
    for (const b of allBooks) {
      const sid = (b as any).seriesId as number;
      if (!booksBySeries.has(sid)) booksBySeries.set(sid, []);
      booksBySeries.get(sid)!.push(b);
    }

    // Fetch chapters for all books in one query, then aggregate stats
    const allBookIds = allBooks.map(b => b.id);
    const chapterRows = allBookIds.length > 0
      ? await db.select({
          bookId: chapters.bookId,
          content: chapters.content,
        }).from(chapters).where(inArray(chapters.bookId, allBookIds))
      : [];

    // Compute words per book
    const wordsByBook = new Map<number, number>();
    const chaptersByBook = new Map<number, number>();
    for (const ch of chapterRows) {
      chaptersByBook.set(ch.bookId, (chaptersByBook.get(ch.bookId) || 0) + 1);
      const text = ch.content ? String(ch.content).replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim() : "";
      const words = text ? text.split(/\s+/).filter(Boolean).length : 0;
      wordsByBook.set(ch.bookId, (wordsByBook.get(ch.bookId) || 0) + words);
    }

    return seriesList.map(s => {
      const seriesBooks = booksBySeries.get(s.id) || [];
      let totalChapters = 0, totalWords = 0, totalWordGoal = 0;
      for (const b of seriesBooks) {
        totalChapters += chaptersByBook.get(b.id) || 0;
        totalWords += wordsByBook.get(b.id) || 0;
        totalWordGoal += (b as any).wordGoal || 0;
      }
      return { ...s, books: seriesBooks, stats: { totalChapters, totalWords, totalWordGoal } };
    });
  }

  async reorderSeriesBooks(updates: { bookId: number; seriesOrder: number }[]): Promise<void> {
    if (updates.length === 0) return;
    const ids = updates.map(u => Number(u.bookId)).filter(Number.isFinite);
    if (ids.length === 0) return;
    const orderCases = sql.join(
      updates.map(u => sql`WHEN ${Number(u.bookId)} THEN ${Number(u.seriesOrder)}`),
      sql` `,
    );
    await db.execute(sql`
      UPDATE books
      SET "series_order" = CASE id ${orderCases} END
      WHERE id IN (${sql.join(ids.map(id => sql`${id}`), sql`, `)})
    `);
  }

  // ── Admin ────────────────────────────────────────────────────────────────────
  // Always bounded: admin pages must not pull the entire users table into
  // memory at once. Default cap (1000) is generous for browsing; the CSV
  // export route opts into a higher cap explicitly.
  async getAllUsers(opts: { limit?: number; offset?: number } = {}): Promise<User[]> {
    const limit = Math.min(Math.max(1, opts.limit ?? 1000), 50_000);
    const offset = Math.max(0, opts.offset ?? 0);
    return await db.select().from(users).orderBy(desc(users.id)).limit(limit).offset(offset);
  }

  // Run book-orphan + user-delete inside a single transaction so a crash
  // between the two statements can't leave dangling references.
  async deleteUser(id: number): Promise<void> {
    await db.transaction(async (tx) => {
      await tx.update(books).set({ userId: null } as any).where(eq(books.userId, id));
      await tx.delete(users).where(eq(users.id, id));
    });
  }

  async getSupportMessages(): Promise<SupportMessage[]> {
    return await db.select().from(supportMessages).orderBy(desc(supportMessages.createdAt));
  }

  async submitSupportMessage(data: InsertSupportMessage): Promise<SupportMessage> {
    const [msg] = await db.insert(supportMessages).values(data).returning();
    return msg;
  }

  async updateSupportMessage(id: number, updates: { read?: boolean; status?: string }): Promise<SupportMessage> {
    const [msg] = await db.update(supportMessages).set(updates).where(eq(supportMessages.id, id)).returning();
    return msg;
  }

  // SQL-side count of unread tickets. The schema column allows NULL so we
  // treat null and false as "unread" to match the prior JS filter
  // (m => !m.read) — a row created before the column existed or seeded
  // without a default would otherwise be miscounted as read.
  async getUnreadSupportCount(): Promise<number> {
    const [row] = await db.select({ count: count() })
      .from(supportMessages)
      .where(or(isNull(supportMessages.read), eq(supportMessages.read, false)));
    return row?.count ?? 0;
  }

  async getAdminStats(): Promise<{ totalUsers: number; totalBooks: number; publishedBooks: number; totalChapters: number; openSupportTickets: number }> {
    const [userCount] = await db.select({ total: count() }).from(users);
    const [bookCount] = await db.select({ total: count() }).from(books).where(eq(books.isDeleted, false));
    const [publishedCount] = await db.select({ total: count() }).from(books).where(and(eq(books.isDeleted, false), eq(books.isPublished, true)));
    const [chapterCount] = await db.select({ total: count() }).from(chapters);
    const [supportCount] = await db.select({ total: count() }).from(supportMessages).where(eq(supportMessages.status, "open"));
    return {
      totalUsers: Number(userCount?.total ?? 0),
      totalBooks: Number(bookCount?.total ?? 0),
      publishedBooks: Number(publishedCount?.total ?? 0),
      totalChapters: Number(chapterCount?.total ?? 0),
      openSupportTickets: Number(supportCount?.total ?? 0),
    };
  }

  async suspendUser(id: number, suspended: boolean): Promise<User> {
    const [updated] = await db.update(users).set({ suspended }).where(eq(users.id, id)).returning();
    return updated;
  }

  async getActivityFeed(): Promise<Array<{ type: string; title: string; subtitle: string; time: string }>> {
    const [recentUsers, recentBooks, recentSupport, recentPayments] = await Promise.all([
      db.select().from(users).orderBy(desc(users.createdAt)).limit(15),
      db.select().from(books).where(and(eq(books.isPublished, true), eq(books.isDeleted, false))).orderBy(desc(books.createdAt)).limit(15),
      db.select().from(supportMessages).orderBy(desc(supportMessages.createdAt)).limit(15),
      // LEFT JOIN so a deleted-user row still surfaces with email=null,
      // matching the recentPayments query in /api/admin/analytics/revenue.
      db.select({
        amountCents: subscriptionPayments.amountCents,
        plan: subscriptionPayments.plan,
        createdAt: subscriptionPayments.createdAt,
        userEmail: users.email,
        userDisplayName: users.displayName,
      })
        .from(subscriptionPayments)
        .leftJoin(users, eq(users.id, subscriptionPayments.userId))
        .where(eq(subscriptionPayments.status, "completed"))
        .orderBy(desc(subscriptionPayments.createdAt))
        .limit(15),
    ]);
    const formatPlan = (p: string) =>
      p.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
    const events: Array<{ type: string; title: string; subtitle: string; time: string; ts: Date }> = [
      ...recentUsers.map(u => ({ type: "user", title: `New user registered`, subtitle: u.displayName || u.email || "Unknown", time: "", ts: u.createdAt ?? new Date(0) })),
      ...recentBooks.map(b => ({ type: "book", title: `Book published`, subtitle: b.title, time: "", ts: b.createdAt ?? new Date(0) })),
      ...recentSupport.map(m => ({ type: "support", title: `Support ticket: ${m.subject}`, subtitle: m.name || m.email, time: "", ts: m.createdAt ?? new Date(0) })),
      ...recentPayments.map(p => ({
        type: "payment",
        title: `Payment received`,
        subtitle: `$${(p.amountCents / 100).toFixed(2)} ${formatPlan(p.plan)} — ${p.userDisplayName || p.userEmail || "deleted user"}`,
        time: "",
        ts: p.createdAt ?? new Date(0),
      })),
    ];
    events.sort((a, b) => b.ts.getTime() - a.ts.getTime());
    return events.slice(0, 30).map(e => ({ ...e, time: e.ts.toISOString() }));
  }

  async getSetting(key: string): Promise<string | null> {
    const [row] = await db.select().from(siteSettings).where(eq(siteSettings.key, key));
    return row?.value ?? null;
  }

  async setSetting(key: string, value: string | null): Promise<void> {
    if (value === null) {
      await db.delete(siteSettings).where(eq(siteSettings.key, key));
    } else {
      await db.insert(siteSettings).values({ key, value }).onConflictDoUpdate({ target: siteSettings.key, set: { value, updatedAt: new Date() } });
    }
  }

  // ── Social: Follows ─────────────────────────────────────────────────────────

  async followUser(followerId: number, followeeId: number): Promise<Follow> {
    const [follow] = await db.insert(follows).values({ followerId, followeeId }).onConflictDoNothing().returning();
    if (!follow) {
      // Already following — return existing record
      const [existing] = await db.select().from(follows).where(and(eq(follows.followerId, followerId), eq(follows.followeeId, followeeId)));
      return existing;
    }
    // Notify the followee (only on new follow)
    const follower = await this.getUserById(followerId);
    await this.createNotification({
      userId: followeeId,
      type: "new_follower",
      title: `${follower?.displayName || "Someone"} started following you`,
      actorId: followerId,
    });
    return follow;
  }

  async unfollowUser(followerId: number, followeeId: number): Promise<void> {
    await db.delete(follows).where(
      and(eq(follows.followerId, followerId), eq(follows.followeeId, followeeId))
    );
  }

  async isFollowing(followerId: number, followeeId: number): Promise<boolean> {
    const [row] = await db.select({ id: follows.id }).from(follows).where(
      and(eq(follows.followerId, followerId), eq(follows.followeeId, followeeId))
    ).limit(1);
    return !!row;
  }

  async getFollowersCount(userId: number): Promise<number> {
    const [result] = await db.select({ count: count() }).from(follows).where(eq(follows.followeeId, userId));
    return Number(result?.count ?? 0);
  }

  async getFollowingCount(userId: number): Promise<number> {
    const [result] = await db.select({ count: count() }).from(follows).where(eq(follows.followerId, userId));
    return Number(result?.count ?? 0);
  }

  // ── Social: Notifications ───────────────────────────────────────────────────

  async getNotifications(userId: number, limit = 50): Promise<Notification[]> {
    return await db.select().from(notifications)
      .where(eq(notifications.userId, userId))
      .orderBy(desc(notifications.createdAt))
      .limit(limit);
  }

  async getUnreadNotificationCount(userId: number): Promise<number> {
    const [result] = await db.select({ count: count() }).from(notifications)
      .where(and(eq(notifications.userId, userId), eq(notifications.read, false)));
    return Number(result?.count ?? 0);
  }

  async createNotification(data: { userId: number; type: string; title: string; body?: string; linkUrl?: string; actorId?: number; entityId?: number }): Promise<Notification> {
    const [notif] = await db.insert(notifications).values(data).returning();
    return notif;
  }

  async markNotificationRead(id: number, userId: number): Promise<void> {
    await db.update(notifications)
      .set({ read: true })
      .where(and(eq(notifications.id, id), eq(notifications.userId, userId)));
  }

  async markAllNotificationsRead(userId: number): Promise<void> {
    await db.update(notifications)
      .set({ read: true })
      .where(and(eq(notifications.userId, userId), eq(notifications.read, false)));
  }

  // ── Social: Messages ────────────────────────────────────────────────────────

  async getConversations(userId: number): Promise<any[]> {
    const result = await db.execute(sql`
      WITH ranked AS (
        SELECT
          dm.*,
          ROW_NUMBER() OVER (
            PARTITION BY CASE WHEN dm.sender_id = ${userId} THEN dm.receiver_id ELSE dm.sender_id END
            ORDER BY dm.created_at DESC
          ) AS rn,
          CASE WHEN dm.sender_id = ${userId} THEN dm.receiver_id ELSE dm.sender_id END AS partner_id
        FROM direct_messages dm
        WHERE dm.sender_id = ${userId} OR dm.receiver_id = ${userId}
      )
      SELECT
        r.id, r.sender_id AS "senderId", r.receiver_id AS "receiverId",
        r.content, r.read, r.created_at AS "createdAt",
        r.partner_id AS "partnerId",
        u.display_name AS "partnerDisplayName",
        u.avatar_url AS "partnerAvatarUrl",
        (SELECT COUNT(*) FROM direct_messages
         WHERE sender_id = r.partner_id AND receiver_id = ${userId} AND read = false
        )::int AS "unreadCount"
      FROM ranked r
      LEFT JOIN users u ON u.id = r.partner_id
      WHERE r.rn = 1
      ORDER BY r.created_at DESC
    `);
    return result.rows;
  }

  async getMessages(userId: number, otherUserId: number, limit = 100): Promise<DirectMessage[]> {
    return await db.select().from(directMessages)
      .where(
        or(
          and(eq(directMessages.senderId, userId), eq(directMessages.receiverId, otherUserId)),
          and(eq(directMessages.senderId, otherUserId), eq(directMessages.receiverId, userId))
        )
      )
      .orderBy(asc(directMessages.createdAt))
      .limit(limit);
  }

  async sendMessage(senderId: number, receiverId: number, content: string): Promise<DirectMessage> {
    const [msg] = await db.insert(directMessages).values({ senderId, receiverId, content }).returning();
    return msg;
  }

  async markMessagesRead(receiverId: number, senderId: number): Promise<void> {
    await db.update(directMessages)
      .set({ read: true })
      .where(
        and(
          eq(directMessages.senderId, senderId),
          eq(directMessages.receiverId, receiverId),
          eq(directMessages.read, false)
        )
      );
  }

  async getUnreadMessageCount(userId: number): Promise<number> {
    const [result] = await db.select({ count: count() }).from(directMessages)
      .where(and(eq(directMessages.receiverId, userId), eq(directMessages.read, false)));
    return Number(result?.count ?? 0);
  }

  // ── Book Likes ──────────────────────────────────────────────────────
  async likeBook(userId: number, bookId: number): Promise<void> {
    await db.insert(bookLikes).values({ userId, bookId }).onConflictDoNothing();
  }

  async unlikeBook(userId: number, bookId: number): Promise<void> {
    await db.delete(bookLikes).where(and(eq(bookLikes.userId, userId), eq(bookLikes.bookId, bookId)));
  }

  async isBookLiked(userId: number, bookId: number): Promise<boolean> {
    const [row] = await db.select({ id: bookLikes.id }).from(bookLikes)
      .where(and(eq(bookLikes.userId, userId), eq(bookLikes.bookId, bookId)));
    return !!row;
  }

  async getBookLikesCount(bookId: number): Promise<number> {
    const [result] = await db.select({ count: count() }).from(bookLikes).where(eq(bookLikes.bookId, bookId));
    return Number(result?.count ?? 0);
  }

  // Batched variant — author profiles list every published book and used to
  // call `getBookLikesCount` in a Promise.all loop (one round-trip per book).
  // Replaces the N+1 with a single GROUP BY.
  async getBookLikesCounts(bookIds: number[]): Promise<Map<number, number>> {
    const out = new Map<number, number>();
    if (bookIds.length === 0) return out;
    const rows = await db
      .select({ bookId: bookLikes.bookId, count: count() })
      .from(bookLikes)
      .where(inArray(bookLikes.bookId, bookIds))
      .groupBy(bookLikes.bookId);
    for (const r of rows) out.set(r.bookId, Number(r.count));
    for (const id of bookIds) if (!out.has(id)) out.set(id, 0);
    return out;
  }

  async getBookComments(bookId: number): Promise<any[]> {
    return await db.select().from(bookComments).where(eq(bookComments.bookId, bookId)).orderBy(desc(bookComments.createdAt));
  }

  async addBookComment(data: { bookId: number; userId: number | null; authorName: string; content: string }): Promise<any> {
    const [comment] = await db.insert(bookComments).values(data).returning();
    return comment;
  }

  async getBookRatingStats(bookId: number): Promise<{ avg: number; count: number }> {
    const result = await db.execute(sql`SELECT COALESCE(AVG(rating), 0)::float as avg, COUNT(*)::int as count FROM book_ratings WHERE book_id = ${bookId}`);
    const row = (result as any).rows?.[0];
    return { avg: Number(row?.avg ?? 0), count: Number(row?.count ?? 0) };
  }

  async rateBook(bookId: number, userId: number, rating: number): Promise<void> {
    await db.execute(sql`INSERT INTO book_ratings (book_id, user_id, rating) VALUES (${bookId}, ${userId}, ${rating}) ON CONFLICT (book_id, user_id) DO UPDATE SET rating = ${rating}`);
  }

  async getAuthorTotalLikes(userId: number): Promise<number> {
    const result = await db.execute(sql`
      SELECT COUNT(*) as total FROM book_likes bl
      JOIN books b ON bl.book_id = b.id
      WHERE b.user_id = ${userId} AND b.is_published = true AND b.is_deleted = false
    `);
    return Number((result as any).rows?.[0]?.total ?? 0);
  }

  // ── Inline Comments ──────────────────────────────────────────────────────

  async getInlineCommentById(id: number): Promise<InlineComment | undefined> {
    const [c] = await db.select().from(inlineComments).where(eq(inlineComments.id, id));
    return c;
  }

  async isBookAccessible(bookId: number, userId: number): Promise<boolean> {
    // Owner or collaborator
    const [book] = await db.select({ userId: books.userId }).from(books).where(eq(books.id, bookId));
    if (!book) return false;
    if (book.userId === userId) return true;
    // Check collaborator
    const { bookCollaborators } = await import("../../../lib/db/src/schema");
    const [collab] = await db.select().from(bookCollaborators)
      .where(and(eq(bookCollaborators.bookId, bookId), eq(bookCollaborators.userId, userId)));
    return !!collab;
  }

  async getInlineComments(chapterId: number): Promise<InlineComment[]> {
    return await db.select().from(inlineComments)
      .where(and(eq(inlineComments.chapterId, chapterId), eq(inlineComments.resolved, false)))
      .orderBy(asc(inlineComments.startOffset));
  }

  async getBookInlineComments(bookId: number): Promise<InlineComment[]> {
    return await db.select().from(inlineComments)
      .where(eq(inlineComments.bookId, bookId))
      .orderBy(asc(inlineComments.chapterId), asc(inlineComments.startOffset));
  }

  async addInlineComment(data: InsertInlineComment): Promise<InlineComment> {
    const [c] = await db.insert(inlineComments).values(data).returning();
    return c;
  }

  async deleteInlineComment(id: number): Promise<void> {
    await db.delete(inlineComments).where(eq(inlineComments.id, id));
  }

  async resolveInlineComment(id: number): Promise<InlineComment> {
    const [c] = await db.update(inlineComments).set({ resolved: true }).where(eq(inlineComments.id, id)).returning();
    return c;
  }
}

export const storage = new DatabaseStorage();
