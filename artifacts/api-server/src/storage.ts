import { db } from "./db";
import { eq, or, count, desc, sql, sum, and, inArray, isNull } from "drizzle-orm";
import {
  books, chapters, transactions, users, loreEntries, dailyProgress, storyBeats,
  userStats, userAchievements,
  type Book, type InsertBook,
  type Chapter, type InsertChapter,
  type Transaction, type InsertTransaction,
  type User, type InsertUser,
  type LoreEntry, type InsertLoreEntry,
  type DailyProgress, type InsertDailyProgress,
  type StoryBeat, type InsertStoryBeat,
} from "../../../lib/db/src/schema";

export type UserStats = typeof userStats.$inferSelect;
export type UserAchievement = typeof userAchievements.$inferSelect;

export type PublishedBook = Book & { authorDisplayName: string | null; authorAvatarUrl: string | null };

type UpdateUser = Partial<InsertUser> & {
  displayName?: string | null;
  subscriptionStatus?: string | null;
  subscriptionPlan?: string | null;
  subscriptionEndDate?: Date | null;
  stripeCustomerId?: string | null;
  stripeSubscriptionId?: string | null;
};

export interface IStorage {
  getBooks(): Promise<Book[]>;
  getUserBooks(userId: number): Promise<Book[]>;
  getGuestBooks(): Promise<Book[]>;
  getBooksByIds(ids: number[]): Promise<Book[]>;
  claimGuestBooks(bookIds: number[], userId: number): Promise<void>;
  getDeletedBooks(): Promise<Book[]>;
  getBook(id: number): Promise<Book | undefined>;
  createBook(book: InsertBook): Promise<Book>;
  updateBook(id: number, updates: Partial<InsertBook>): Promise<Book>;
  deleteBook(id: number): Promise<void>;

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

  createTransaction(tx: InsertTransaction): Promise<Transaction>;
  updateTransaction(id: number, updates: Partial<InsertTransaction>): Promise<Transaction>;
  getTransaction(stripePaymentIntentId: string): Promise<Transaction | undefined>;

  getUserById(id: number): Promise<User | undefined>;
  getUserByGoogleId(googleId: string): Promise<User | undefined>;
  getUserByAppleId(appleId: string): Promise<User | undefined>;
  getUserByLinkedinId(linkedinId: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  getUserByStripeCustomerId(customerId: string): Promise<User | undefined>;
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
    for (const update of updates) {
      await db.update(storyBeats).set({ columnId: update.columnId, order: update.order }).where(eq(storyBeats.id, update.id));
    }
  }

  async reorderChapters(updates: { id: number; order: number }[]): Promise<void> {
    for (const update of updates) {
      await db.update(chapters).set({ order: update.order }).where(eq(chapters.id, update.id));
    }
  }

  // ─── Chapters ──────────────────────────────────────────────────────────────
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

  // ─── Transactions ──────────────────────────────────────────────────────────
  async createTransaction(tx: InsertTransaction): Promise<Transaction> {
    const [transaction] = await db.insert(transactions).values(tx).returning();
    return transaction;
  }

  async updateTransaction(id: number, updates: Partial<InsertTransaction>): Promise<Transaction> {
    const [transaction] = await db.update(transactions).set(updates).where(eq(transactions.id, id)).returning();
    return transaction;
  }

  async getTransaction(stripePaymentIntentId: string): Promise<Transaction | undefined> {
    const [transaction] = await db.select().from(transactions).where(eq(transactions.stripePaymentIntentId, stripePaymentIntentId));
    return transaction;
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

  async getUserByStripeCustomerId(customerId: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.stripeCustomerId, customerId));
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
        ...books,
        authorDisplayName: users.displayName,
        authorAvatarUrl: users.avatarUrl,
      })
      .from(books)
      .leftJoin(users, eq(books.userId, users.id))
      .where(and(eq(books.isPublished, true), eq(books.isDeleted, false)))
      .orderBy(desc(books.publishedAt));
    return rows as PublishedBook[];
  }

  async getPublishedBook(id: number): Promise<PublishedBook | undefined> {
    const [row] = await db
      .select({
        ...books,
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
        ...books,
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
    await db.update(books).set({ featured: false } as any);
    if (bookId !== null) {
      await db.update(books).set({ featured: true } as any).where(eq(books.id, bookId));
    }
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
}

export const storage = new DatabaseStorage();
