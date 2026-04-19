import { pgTable, text, serial, integer, timestamp, boolean, jsonb, numeric, index, uniqueIndex } from "drizzle-orm/pg-core";
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
  subscriptionTier: text("subscription_tier").default("free").notNull(), // free | pro | premium
  subscriptionStatus: text("subscription_status").default("free_trial"), // free_trial | active | canceled | expired
  subscriptionPlan: text("subscription_plan"), // monthly | yearly_monthly | yearly_annual
  subscriptionEndDate: timestamp("subscription_end_date"),
  stripeCustomerId: text("stripe_customer_id"),
  stripeSubscriptionId: text("stripe_subscription_id"),
  suspended: boolean("suspended").default(false),
  role: text("role").default("user").notNull(), // user | admin | moderator
  bannerUrl: text("banner_url"),
  emailVerified: boolean("email_verified").default(false),
});

export const siteSettings = pgTable("site_settings", {
  key: text("key").primaryKey(),
  value: text("value"),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export type BookPages = {
  copyright?: string;
  dedication?: string;
  epigraph?: string;
  aboutAuthor?: string;
};

export const bookSeries = pgTable("book_series", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  description: text("description"),
  coverImage: text("cover_image"),
  isPublished: boolean("is_published").default(false).notNull(),
  publishedAt: timestamp("published_at"),
  createdAt: timestamp("created_at").defaultNow(),
}, (t) => [
  index("idx_book_series_user_id").on(t.userId),
  index("idx_book_series_is_published").on(t.isPublished),
  index("idx_book_series_published_at").on(t.publishedAt),
]);

export type BookSeries = typeof bookSeries.$inferSelect;
export type InsertBookSeries = typeof bookSeries.$inferInsert;

export const books = pgTable("books", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id, { onDelete: "set null" }),
  seriesId: integer("series_id").references(() => bookSeries.id, { onDelete: "set null" }),
  seriesOrder: integer("series_order").default(0),
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
}, (t) => [
  index("idx_books_user_id").on(t.userId),
  index("idx_books_is_published").on(t.isPublished),
  index("idx_books_is_deleted").on(t.isDeleted),
  index("idx_books_series_id").on(t.seriesId),
]);

export const chapters = pgTable("chapters", {
  id: serial("id").primaryKey(),
  bookId: integer("book_id").notNull().references(() => books.id, { onDelete: "cascade" }),
  userId: integer("user_id").references(() => users.id, { onDelete: "set null" }),
  title: text("title").notNull(),
  content: text("content").notNull(),
  // Ordering for drag-and-drop reordering
  order: integer("order").default(0).notNull(),
  // Writing status label
  status: text("status").default("draft").notNull(), // draft | revised | final
  createdAt: timestamp("created_at").defaultNow(),
}, (t) => [
  index("idx_chapters_book_id").on(t.bookId),
  index("idx_chapters_user_id").on(t.userId),
]);

export const chapterSnapshots = pgTable("chapter_snapshots", {
  id: serial("id").primaryKey(),
  chapterId: integer("chapter_id").notNull().references(() => chapters.id, { onDelete: "cascade" }),
  content: text("content").notNull(),
  label: text("label"),
  createdAt: timestamp("created_at").defaultNow(),
}, (t) => [
  index("idx_chapter_snapshots_chapter_id").on(t.chapterId),
]);

export const transactions = pgTable("transactions", {
  id: serial("id").primaryKey(),
  bookId: integer("book_id").notNull().references(() => books.id, { onDelete: "cascade" }),
  amount: numeric("amount", { precision: 10, scale: 2 }).notNull().default("4.99"),
  currency: text("currency").notNull().default("usd"),
  status: text("status").notNull().default("pending"),
  stripePaymentIntentId: text("stripe_payment_intent_id"),
  paymentMethod: text("payment_method").default("card"),
  createdAt: timestamp("created_at").defaultNow(),
}, (t) => [
  index("idx_transactions_book_id").on(t.bookId),
]);

export const loreEntries = pgTable("lore_entries", {
  id: serial("id").primaryKey(),
  bookId: integer("book_id").notNull().references(() => books.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  category: text("category").notNull(), // character, location, item, magic, other
  content: text("content").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
}, (t) => [
  index("idx_lore_entries_book_id").on(t.bookId),
]);

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
  bookId: integer("book_id").notNull().references(() => books.id, { onDelete: "cascade" }),
  date: timestamp("date").notNull(), // e.g., midnight of that day
  wordCount: integer("word_count").notNull().default(0),
  createdAt: timestamp("created_at").defaultNow(),
}, (t) => [
  index("idx_daily_progress_book_id").on(t.bookId),
]);

export const storyBeats = pgTable("story_beats", {
  id: serial("id").primaryKey(),
  bookId: integer("book_id").notNull().references(() => books.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  description: text("description"),
  columnId: text("column_id").notNull(), // e.g., 'act1', 'act2', 'act3'
  order: integer("order").notNull().default(0),
  color: text("color"),
  createdAt: timestamp("created_at").defaultNow(),
}, (t) => [
  index("idx_story_beats_book_id").on(t.bookId),
]);

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
}, (t) => [
  uniqueIndex("uq_user_achievements_user_achievement").on(t.userId, t.achievementId),
]);

export const supportMessages = pgTable("support_messages", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull(),
  subject: text("subject").notNull(),
  message: text("message").notNull(),
  category: text("category").default("general"),
  priority: text("priority").default("normal"),
  status: text("status").default("open"),
  userId: integer("user_id").references(() => users.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at").defaultNow(),
  read: boolean("read").default(false),
});

export type SupportMessage = typeof supportMessages.$inferSelect;
export type InsertSupportMessage = typeof supportMessages.$inferInsert;
export const insertSupportMessageSchema = createInsertSchema(supportMessages).omit({ id: true, createdAt: true, read: true, status: true });

export const supportReplies = pgTable("support_replies", {
  id: serial("id").primaryKey(),
  ticketId: integer("ticket_id").notNull().references(() => supportMessages.id, { onDelete: "cascade" }),
  senderType: text("sender_type").notNull(), // "admin" | "user"
  senderUserId: integer("sender_user_id").references(() => users.id, { onDelete: "set null" }),
  senderName: text("sender_name"),
  body: text("body").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
}, (t) => [
  index("idx_support_replies_ticket_id").on(t.ticketId),
]);

export type SupportReply = typeof supportReplies.$inferSelect;
export type InsertSupportReply = typeof supportReplies.$inferInsert;

export const bookRatings = pgTable("book_ratings", {
  id: serial("id").primaryKey(),
  bookId: integer("book_id").notNull().references(() => books.id, { onDelete: "cascade" }),
  userId: integer("user_id"),
  rating: integer("rating").notNull(), // 1-5
  createdAt: timestamp("created_at").defaultNow(),
}, (t) => [
  index("idx_book_ratings_book_id").on(t.bookId),
]);

export const bookComments = pgTable("book_comments", {
  id: serial("id").primaryKey(),
  bookId: integer("book_id").notNull().references(() => books.id, { onDelete: "cascade" }),
  userId: integer("user_id"),
  authorName: text("author_name").notNull().default("Anonymous"),
  content: text("content").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
}, (t) => [
  index("idx_book_comments_book_id").on(t.bookId),
]);

// ── Inline Reader Comments (text-anchored) ─────────────────────────────────

export const inlineComments = pgTable("inline_comments", {
  id: serial("id").primaryKey(),
  bookId: integer("book_id").notNull().references(() => books.id, { onDelete: "cascade" }),
  chapterId: integer("chapter_id").notNull().references(() => chapters.id, { onDelete: "cascade" }),
  userId: integer("user_id").references(() => users.id, { onDelete: "set null" }),
  authorName: text("author_name").notNull().default("Anonymous"),
  authorAvatarUrl: text("author_avatar_url"),
  // Text anchor — the exact selected text + surrounding context for fuzzy matching
  selectedText: text("selected_text").notNull(),
  // Character offset range within the chapter's sanitized HTML text content
  startOffset: integer("start_offset").notNull(),
  endOffset: integer("end_offset").notNull(),
  // The comment itself
  content: text("content").notNull(),
  // Resolved = author marked as addressed
  resolved: boolean("resolved").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
}, (t) => [
  index("idx_inline_comments_book_id").on(t.bookId),
  index("idx_inline_comments_chapter_id").on(t.chapterId),
  index("idx_inline_comments_user_id").on(t.userId),
]);

export type InlineComment = typeof inlineComments.$inferSelect;
export type InsertInlineComment = typeof inlineComments.$inferInsert;

export const bookLikes = pgTable("book_likes", {
  id: serial("id").primaryKey(),
  bookId: integer("book_id").notNull().references(() => books.id, { onDelete: "cascade" }),
  userId: integer("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at").defaultNow(),
}, (t) => [
  uniqueIndex("uq_book_likes_book_user").on(t.bookId, t.userId),
]);

export type BookRating = typeof bookRatings.$inferSelect;
export type BookComment = typeof bookComments.$inferSelect;
export type BookLike = typeof bookLikes.$inferSelect;

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
}, (t) => [
  index("idx_research_items_book_id").on(t.bookId),
]);


export const arcRecipients = pgTable('arc_recipients', {
  id: serial('id').primaryKey(),
  bookId: integer('book_id').notNull().references(() => books.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  email: text('email').notNull(),
  status: text('status').notNull().default('sent'), // sent | opened | reviewed | declined
  note: text('note'),
  sentAt: timestamp('sent_at').defaultNow(),
  createdAt: timestamp('created_at').defaultNow(),
}, (t) => [
  index("idx_arc_recipients_book_id").on(t.bookId),
]);

export type ResearchItem = typeof researchItems.$inferSelect;

export const follows = pgTable("follows", {
  id: serial("id").primaryKey(),
  followerId: integer("follower_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  followeeId: integer("followee_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at").defaultNow(),
}, (t) => [
  uniqueIndex("uq_follows_follower_followee").on(t.followerId, t.followeeId),
]);

// ── Notifications ─────────────────────────────────────────────────────────

export const notifications = pgTable("notifications", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  type: text("type").notNull(), // new_follower | new_comment | new_rating | new_book | message | support_reply
  title: text("title").notNull(),
  body: text("body"),
  linkUrl: text("link_url"),
  actorId: integer("actor_id").references(() => users.id, { onDelete: "set null" }),
  entityId: integer("entity_id"),
  read: boolean("read").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
}, (t) => [
  index("idx_notifications_user_id").on(t.userId),
  index("idx_notifications_created_at").on(t.createdAt),
]);

// ── Direct Messages ──────────────────────────────────────────────────────

export const directMessages = pgTable("direct_messages", {
  id: serial("id").primaryKey(),
  senderId: integer("sender_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  receiverId: integer("receiver_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  content: text("content").notNull(),
  read: boolean("read").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
}, (t) => [
  index("idx_direct_messages_sender_id").on(t.senderId),
  index("idx_direct_messages_receiver_id").on(t.receiverId),
  index("idx_direct_messages_created_at").on(t.createdAt),
]);

// ── Tutorials ────────────────────────────────────────────────────────────

export const tutorials = pgTable("tutorials", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  description: text("description"),
  videoUrl: text("video_url").notNull(),
  thumbnailUrl: text("thumbnail_url"),
  category: text("category").notNull().default("getting-started"),
  duration: text("duration"),
  sortOrder: integer("sort_order").notNull().default(0),
  published: boolean("published").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export type Tutorial = typeof tutorials.$inferSelect;

// ── Daily AI Usage Tracking ───────────────────────────────────────────────

export const dailyAiUsage = pgTable("daily_ai_usage", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  date: text("date").notNull(), // YYYY-MM-DD
  callCount: integer("call_count").notNull().default(0),
}, (t) => [
  uniqueIndex("uq_daily_ai_usage_user_date").on(t.userId, t.date),
]);

// ── Admin Analytics Tables ─────────────────────────────────────────────────

export const apiLogs = pgTable("api_logs", {
  id: serial("id").primaryKey(),
  method: text("method").notNull(),
  path: text("path").notNull(),
  statusCode: integer("status_code").notNull(),
  durationMs: integer("duration_ms").notNull(),
  userId: integer("user_id"),
  createdAt: timestamp("created_at").defaultNow(),
}, (t) => [
  index("idx_api_logs_created_at").on(t.createdAt),
]);

export const aiUsageLogs = pgTable("ai_usage_logs", {
  id: serial("id").primaryKey(),
  userId: integer("user_id"),
  endpoint: text("endpoint").notNull(),
  model: text("model").notNull(),
  promptTokens: integer("prompt_tokens").default(0),
  completionTokens: integer("completion_tokens").default(0),
  estimatedCostCents: integer("estimated_cost_cents").default(0),
  createdAt: timestamp("created_at").defaultNow(),
}, (t) => [
  index("idx_ai_usage_logs_user_id").on(t.userId),
  index("idx_ai_usage_logs_created_at").on(t.createdAt),
]);

export const contentFlags = pgTable("content_flags", {
  id: serial("id").primaryKey(),
  bookId: integer("book_id").notNull().references(() => books.id, { onDelete: "cascade" }),
  reason: text("reason").notNull(),
  status: text("status").notNull().default("pending"), // pending | approved | rejected
  reviewedBy: integer("reviewed_by").references(() => users.id, { onDelete: "set null" }),
  reviewNote: text("review_note"),
  createdAt: timestamp("created_at").defaultNow(),
  reviewedAt: timestamp("reviewed_at"),
}, (t) => [
  index("idx_content_flags_book_id").on(t.bookId),
]);

// ── Email Verification Tokens ────────────────────────────────────────────

export const emailVerificationTokens = pgTable("email_verification_tokens", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  token: text("token").notNull().unique(),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
}, (t) => [
  index("idx_email_verification_tokens_user_id").on(t.userId),
]);

// ── Password Reset Tokens ────────────────────────────────────────────────

export const passwordResetTokens = pgTable("password_reset_tokens", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  token: text("token").notNull().unique(),
  expiresAt: timestamp("expires_at").notNull(),
  usedAt: timestamp("used_at"),
  createdAt: timestamp("created_at").defaultNow(),
}, (t) => [
  index("idx_password_reset_tokens_user_id").on(t.userId),
]);

// ── Book Collaborators ───────────────────────────────────────────────────

export const bookCollaborators = pgTable("book_collaborators", {
  id: serial("id").primaryKey(),
  bookId: integer("book_id").notNull().references(() => books.id, { onDelete: "cascade" }),
  userId: integer("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  role: text("role").notNull().default("editor"), // editor | viewer
  inviteCode: text("invite_code"),
  joinedAt: timestamp("joined_at").defaultNow(),
}, (t) => [
  uniqueIndex("uq_book_collaborator").on(t.bookId, t.userId),
  index("idx_collaborators_book_id").on(t.bookId),
  index("idx_collaborators_user_id").on(t.userId),
  uniqueIndex("uq_invite_code").on(t.inviteCode),
]);

export type BookCollaborator = typeof bookCollaborators.$inferSelect;

// ── Login Attempts (brute-force protection) ─────────────────────────────

export const loginAttempts = pgTable("login_attempts", {
  id: serial("id").primaryKey(),
  email: text("email").notNull(),
  ip: text("ip"),
  success: boolean("success").notNull().default(false),
  createdAt: timestamp("created_at").defaultNow(),
}, (t) => [
  index("idx_login_attempts_email_created").on(t.email, t.createdAt),
]);

// ── Admin Audit Logs ──────────────────────────────────────────────────────

export const adminAuditLogs = pgTable("admin_audit_logs", {
  id: serial("id").primaryKey(),
  adminId: integer("admin_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  action: text("action").notNull(), // user_suspend | user_delete | user_grant_sub | book_delete | flag_review | banner_update
  targetType: text("target_type").notNull(), // user | book | flag | banner | tutorial
  targetId: integer("target_id"),
  details: text("details"), // JSON string with action-specific data
  createdAt: timestamp("created_at").defaultNow(),
}, (t) => [
  index("idx_audit_logs_admin_id").on(t.adminId),
  index("idx_audit_logs_created_at").on(t.createdAt),
]);

export type AdminAuditLog = typeof adminAuditLogs.$inferSelect;

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
export type Notification = typeof notifications.$inferSelect;
export type DirectMessage = typeof directMessages.$inferSelect;

// ── Subscription Tiers ───────────────────────────────────────────────────
//
// FREE tier:  Limited access to test the platform
// PRO tier:   Full writing platform for serious writers
// PREMIUM:    Everything + unlimited AI + priority support
//
// Pricing based on AI-SaaS market analysis (Jasper $49/mo, Sudowrite $19/mo,
// NovelAI $15/mo). Plotzy targets the $9-25 sweet spot for indie writers.
//
// Cost basis: OpenAI gpt-4o-mini ~$0.15/1K tokens, Neon ~$0.02/query,
// ~$3-5/user/month at moderate AI usage.

// ── Free Tier Limits ──
export const FREE_MAX_BOOKS = 2;
export const FREE_MAX_CHAPTERS_PER_BOOK = 3;
export const FREE_MAX_WORDS = 5000;
export const FREE_MAX_AI_CALLS_PER_DAY = 10;
export const FREE_MAX_PUBLISHED_BOOKS = 1;
export const FREE_MAX_IMAGES_PER_DAY = 2;
export const FREE_MAX_AUDIOBOOK_EXPORTS_PER_MONTH = 0;

// ── Pro Tier Limits ──
export const PRO_MAX_BOOKS = 50;
export const PRO_MAX_CHAPTERS_PER_BOOK = 100;
export const PRO_MAX_WORDS = 500000;
export const PRO_MAX_AI_CALLS_PER_DAY = 100;
export const PRO_MAX_PUBLISHED_BOOKS = 20;
export const PRO_MAX_IMAGES_PER_DAY = 10;
export const PRO_MAX_AUDIOBOOK_EXPORTS_PER_MONTH = 3;

// ── Premium Tier Limits ──
export const PREMIUM_MAX_BOOKS = 9999;
export const PREMIUM_MAX_CHAPTERS_PER_BOOK = 9999;
export const PREMIUM_MAX_WORDS = 99999999;
export const PREMIUM_MAX_AI_CALLS_PER_DAY = 200;
export const PREMIUM_MAX_PUBLISHED_BOOKS = 9999;
export const PREMIUM_MAX_IMAGES_PER_DAY = 25;
export const PREMIUM_MAX_AUDIOBOOK_EXPORTS_PER_MONTH = 10;

// ── Pricing (cents) ──
export const PRO_MONTHLY_CENTS = 999;           // $9.99/month
export const PRO_YEARLY_CENTS = 7999;            // $79.99/year ($6.67/mo - save 33%)
export const PREMIUM_MONTHLY_CENTS = 1999;       // $19.99/month
export const PREMIUM_YEARLY_CENTS = 15999;       // $159.99/year ($13.33/mo - save 33%)

// Legacy constants (kept for backward compatibility)
export const FREE_TRIAL_MAX_CHAPTERS = FREE_MAX_CHAPTERS_PER_BOOK;
export const FREE_TRIAL_MAX_WORDS = FREE_MAX_WORDS;
export const SUBSCRIPTION_MONTHLY_CENTS = PRO_MONTHLY_CENTS;
export const SUBSCRIPTION_YEARLY_MONTHLY_CENTS = PRO_MONTHLY_CENTS;
export const SUBSCRIPTION_YEARLY_ANNUAL_CENTS = PRO_YEARLY_CENTS;
