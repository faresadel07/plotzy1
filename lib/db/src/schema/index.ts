import { pgTable, text, serial, integer, timestamp, boolean, jsonb, numeric } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  email: text("email").unique(),
  displayName: text("display_name"),
  googleId: text("google_id").unique(),
  appleId: text("apple_id").unique(),
  linkedinId: text("linkedin_id").unique(),
  facebookId: text("facebook_id").unique(),
  passwordHash: text("password_hash"),
  avatarUrl: text("avatar_url"),
  createdAt: timestamp("created_at").defaultNow(),
  // Profile fields
  bio: text("bio"),
  website: text("website"),
  twitterHandle: text("twitter_handle"),
  instagramHandle: text("instagram_handle"),
  // Subscription fields
  subscriptionStatus: text("subscription_status").default("free_trial"), // free_trial | active | canceled | expired
  subscriptionPlan: text("subscription_plan"), // monthly | yearly
  subscriptionEndDate: timestamp("subscription_end_date"),
  stripeCustomerId: text("stripe_customer_id"),
  stripeSubscriptionId: text("stripe_subscription_id"),
});

export type BookPages = {
  copyright?: string;
  dedication?: string;
  epigraph?: string;
  aboutAuthor?: string;
};

export const books = pgTable("books", {
  id: serial("id").primaryKey(),
  userId: integer("user_id"),
  title: text("title").notNull(),
  coverImage: text("cover_image"),
  backCoverImage: text("back_cover_image"),
  spineColor: text("spine_color").default("#7c3aed"),
  coverData: jsonb("cover_data"),
  summary: text("summary"),
  authorName: text("author_name"),
  bookPreferences: jsonb("book_preferences").$type<BookPreferences>(),
  isPaid: boolean("is_paid").default(false),
  isbn: text("isbn"),
  language: text("language").default("en"),
  isDeleted: boolean("is_deleted").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  // Content type: "book" (chapter-based) | "article" (single-page blog)
  contentType: text("content_type").default("book"),
  // Article-specific fields
  articleContent: text("article_content"),
  featuredImage: text("featured_image"),
  tags: jsonb("tags").$type<string[]>(),
  articleCategory: text("article_category"),
  // Book pages (front/back matter)
  bookPages: jsonb("book_pages").$type<BookPages>(),
  // Writing goal (target word count)
  wordGoal: integer("word_goal"),
  // Genre/category for community library
  genre: text("genre"),
  // Beta-reader share token (unique read-only link, no auth required)
  shareToken: text("share_token").unique(),
  // Publishing fields
  isPublished: boolean("is_published").default(false).notNull(),
  publishedAt: timestamp("published_at"),
  viewCount: integer("view_count").default(0).notNull(),
  // Featured by admin in community library
  featured: boolean("featured").default(false),
});

export const chapters = pgTable("chapters", {
  id: serial("id").primaryKey(),
  bookId: integer("book_id").notNull().references(() => books.id, { onDelete: "cascade" }),
  userId: integer("user_id"),
  title: text("title").notNull(),
  content: text("content").notNull(),
  // Ordering for drag-and-drop reordering
  order: integer("order").default(0).notNull(),
  // Writing status label
  status: text("status").default("draft").notNull(), // draft | revised | final
  createdAt: timestamp("created_at").defaultNow(),
});

export const chapterSnapshots = pgTable("chapter_snapshots", {
  id: serial("id").primaryKey(),
  chapterId: integer("chapter_id").notNull().references(() => chapters.id, { onDelete: "cascade" }),
  content: text("content").notNull(),
  label: text("label"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const transactions = pgTable("transactions", {
  id: serial("id").primaryKey(),
  bookId: integer("book_id").notNull().references(() => books.id, { onDelete: "cascade" }),
  amount: numeric("amount", { precision: 10, scale: 2 }).notNull().default("4.99"),
  currency: text("currency").notNull().default("usd"),
  status: text("status").notNull().default("pending"),
  stripePaymentIntentId: text("stripe_payment_intent_id"),
  paymentMethod: text("payment_method").default("card"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const loreEntries = pgTable("lore_entries", {
  id: serial("id").primaryKey(),
  bookId: integer("book_id").notNull().references(() => books.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  category: text("category").notNull(), // character, location, item, magic, other
  content: text("content").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export type BookPreferences = {
  fontFamily?: string;
  fontSize?: string;
  bgColor?: string;
  textColor?: string;
  lineHeight?: string;
  pageStyle?: string;
};

export const dailyProgress = pgTable("daily_progress", {
  id: serial("id").primaryKey(),
  bookId: integer("book_id").notNull(),
  date: timestamp("date").notNull(), // e.g., midnight of that day
  wordCount: integer("word_count").notNull().default(0),
  createdAt: timestamp("created_at").defaultNow(),
});

export const storyBeats = pgTable("story_beats", {
  id: serial("id").primaryKey(),
  bookId: integer("book_id").notNull(),
  title: text("title").notNull(),
  description: text("description"),
  columnId: text("column_id").notNull(), // e.g., 'act1', 'act2', 'act3'
  order: integer("order").notNull().default(0),
  color: text("color"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const professionals = pgTable("professionals", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  avatarUrl: text("avatar_url"),
  tagline: text("tagline").notNull(),
  bio: text("bio").notNull(),
  service: text("service").notNull(), // developmental_editing | copy_editing | proofreading | cover_design | marketing
  genres: jsonb("genres").$type<string[]>(),
  ratingAvg: numeric("rating_avg").default("4.9"),
  reviewCount: integer("review_count").default(0),
  priceFrom: integer("price_from"),
  priceTo: integer("price_to"),
  priceUnit: text("price_unit").default("per project"),
  completedProjects: integer("completed_projects").default(0),
  featured: boolean("featured").default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

export const quoteRequests = pgTable("quote_requests", {
  id: serial("id").primaryKey(),
  professionalId: integer("professional_id").notNull().references(() => professionals.id),
  authorName: text("author_name").notNull(),
  authorEmail: text("author_email").notNull(),
  bookTitle: text("book_title").notNull(),
  wordCount: integer("word_count"),
  genre: text("genre"),
  description: text("description"),
  deadline: text("deadline"),
  service: text("service").notNull(),
  status: text("status").default("pending"), // pending | responded | accepted | declined
  createdAt: timestamp("created_at").defaultNow(),
});

export const userStats = pgTable("user_stats", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().unique().references(() => users.id, { onDelete: "cascade" }),
  totalWordsWritten: integer("total_words_written").default(0).notNull(),
  totalViewsReceived: integer("total_views_received").default(0).notNull(),
  totalBooksPublished: integer("total_books_published").default(0).notNull(),
  totalChaptersWritten: integer("total_chapters_written").default(0).notNull(),
  streakDays: integer("streak_days").default(0).notNull(),
  longestStreak: integer("longest_streak").default(0).notNull(),
  lastWritingDate: timestamp("last_writing_date"),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const userAchievements = pgTable("user_achievements", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  achievementId: text("achievement_id").notNull(),
  unlockedAt: timestamp("unlocked_at").defaultNow(),
});

export const supportMessages = pgTable("support_messages", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull(),
  subject: text("subject").notNull(),
  message: text("message").notNull(),
  category: text("category").default("general"),
  priority: text("priority").default("normal"),
  status: text("status").default("open"),
  userId: integer("user_id"),
  createdAt: timestamp("created_at").defaultNow(),
  read: boolean("read").default(false),
});

export type SupportMessage = typeof supportMessages.$inferSelect;
export type InsertSupportMessage = typeof supportMessages.$inferInsert;
export const insertSupportMessageSchema = createInsertSchema(supportMessages).omit({ id: true, createdAt: true, read: true, status: true });

export const bookRatings = pgTable("book_ratings", {
  id: serial("id").primaryKey(),
  bookId: integer("book_id").notNull().references(() => books.id, { onDelete: "cascade" }),
  userId: integer("user_id"),
  rating: integer("rating").notNull(), // 1-5
  createdAt: timestamp("created_at").defaultNow(),
});

export const bookComments = pgTable("book_comments", {
  id: serial("id").primaryKey(),
  bookId: integer("book_id").notNull().references(() => books.id, { onDelete: "cascade" }),
  userId: integer("user_id"),
  authorName: text("author_name").notNull().default("Anonymous"),
  content: text("content").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export type BookRating = typeof bookRatings.$inferSelect;
export type BookComment = typeof bookComments.$inferSelect;

// ── Gutenberg public-domain reading library ──────────────────────────────────
export const gutenbergBooks = pgTable("gutenberg_books", {
  id: serial("id").primaryKey(),
  gutenbergId: integer("gutenberg_id").notNull().unique(),
  title: text("title").notNull(),
  authors: jsonb("authors").$type<{ name: string; birth_year?: number; death_year?: number }[]>().default([]),
  subjects: jsonb("subjects").$type<string[]>().default([]),
  bookshelves: jsonb("bookshelves").$type<string[]>().default([]),
  languages: jsonb("languages").$type<string[]>().default([]),
  coverUrl: text("cover_url"),
  textUrl: text("text_url"),
  downloadCount: integer("download_count").default(0),
  // Cached full text — NULL until first read, then persists across deployments
  content: text("content"),
  contentCachedAt: timestamp("content_cached_at"),
  createdAt: timestamp("created_at").defaultNow(),
});

export type GutenbergBook = typeof gutenbergBooks.$inferSelect;

export const researchItems = pgTable("research_items", {
  id: serial("id").primaryKey(),
  bookId: integer("book_id").notNull().references(() => books.id, { onDelete: "cascade" }),
  type: text("type").notNull().default("note"), // 'note' | 'link' | 'image'
  title: text("title"),
  content: text("content").notNull().default(""),
  previewImageUrl: text("preview_image_url"),
  description: text("description"),
  color: text("color").default("default"),
  position: integer("position").default(0).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});


export const arcRecipients = pgTable('arc_recipients', {
  id: serial('id').primaryKey(),
  bookId: integer('book_id').notNull().references(() => books.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  email: text('email').notNull(),
  status: text('status').notNull().default('sent'), // sent | opened | reviewed | declined
  note: text('note'),
  sentAt: timestamp('sent_at').defaultNow(),
  createdAt: timestamp('created_at').defaultNow(),
});

export type ResearchItem = typeof researchItems.$inferSelect;

export const follows = pgTable("follows", {
  id: serial("id").primaryKey(),
  followerId: integer("follower_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  followeeId: integer("followee_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertBookSchema = createInsertSchema(books).omit({ id: true, createdAt: true });
export const insertChapterSchema = createInsertSchema(chapters).omit({ id: true, createdAt: true });
export const insertChapterSnapshotSchema = createInsertSchema(chapterSnapshots).omit({ id: true, createdAt: true });
export const insertLoreEntrySchema = createInsertSchema(loreEntries).omit({ id: true, createdAt: true });
export const insertTransactionSchema = createInsertSchema(transactions).omit({ id: true, createdAt: true });
export const insertDailyProgressSchema = createInsertSchema(dailyProgress).omit({ id: true, createdAt: true });
export const insertStoryBeatSchema = createInsertSchema(storyBeats).omit({ id: true, createdAt: true });

export type User = typeof users.$inferSelect;
export type InsertUser = {
  email?: string | null;
  displayName?: string | null;
  googleId?: string | null;
  appleId?: string | null;
  avatarUrl?: string | null;
};

export type Book = typeof books.$inferSelect;
export type InsertBook = z.infer<typeof insertBookSchema>;
export type Chapter = typeof chapters.$inferSelect;
export type InsertChapter = z.infer<typeof insertChapterSchema>;
export type LoreEntry = typeof loreEntries.$inferSelect;
export type InsertLoreEntry = z.infer<typeof insertLoreEntrySchema>;
export type Transaction = typeof transactions.$inferSelect;
export type InsertTransaction = z.infer<typeof insertTransactionSchema>;
export type DailyProgress = typeof dailyProgress.$inferSelect;
export type InsertDailyProgress = z.infer<typeof insertDailyProgressSchema>;
export type StoryBeat = typeof storyBeats.$inferSelect;
export type InsertStoryBeat = z.infer<typeof insertStoryBeatSchema>;
export type ChapterSnapshot = typeof chapterSnapshots.$inferSelect;
export type InsertChapterSnapshot = z.infer<typeof insertChapterSnapshotSchema>;
export type Professional = typeof professionals.$inferSelect;
export type QuoteRequest = typeof quoteRequests.$inferSelect;
export type ArcRecipient = typeof arcRecipients.$inferSelect;
export type Follow = typeof follows.$inferSelect;

// Subscription constants
export const FREE_TRIAL_MAX_CHAPTERS = 3;
export const FREE_TRIAL_MAX_WORDS = 3750; // 15 pages × 250 words/page
export const SUBSCRIPTION_MONTHLY_CENTS = 1300;        // $13/month
export const SUBSCRIPTION_YEARLY_MONTHLY_CENTS = 1000; // $10/month (yearly plan, billed monthly)
export const SUBSCRIPTION_YEARLY_ANNUAL_CENTS = 9999;  // $99.99/year (yearly plan, billed annually)
