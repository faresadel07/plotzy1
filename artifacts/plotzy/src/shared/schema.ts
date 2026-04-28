// Pure TypeScript type definitions for the Plotzy client
// These mirror the server schema without drizzle dependencies

export type BookPages = {
  copyright?: string;
  dedication?: string;
  epigraph?: string;
  aboutAuthor?: string;
};

export type BookPreferences = {
  fontFamily?: string;
  fontSize?: string;
  lineHeight?: string;
  letterSpacing?: string;
  bgColor?: string;
  textColor?: string;
  pageStyle?: string;
  font?: string;
  textAlign?: string;
  theme?: string;
  chapterHeadingStyle?: string;
  paperSize?: string;
  marginTop?: number;
  marginBottom?: number;
  marginLeft?: number;
  marginRight?: number;
  headerText?: string;
  footerText?: string;
  showPageNumbers?: boolean;
  pageNumberPosition?: string;
  pageNumFont?: string;
  pageNumColor?: string;
  pageNumSize?: number;
  pageNumFormat?: string;   // "dashes" | "dots" | "plain" | "brackets" | "word" | "slash"
  pageNumPosition?: string; // "center" | "left" | "right" | "outer"
  pageNumOpacity?: number;  // 0.1 – 1.0
  pageNumBold?: boolean;
  pageNumItalic?: boolean;
  pageNumSmallCaps?: boolean;
  zoom?: number;
  pageTheme?: string;
  showRuler?: boolean;
  isBold?: boolean;
  isItalic?: boolean;
  isUnderline?: boolean;
  highlightColor?: string;
};

export type User = {
  id: number;
  email?: string | null;
  displayName?: string | null;
  googleId?: string | null;
  appleId?: string | null;
  avatarUrl?: string | null;
  createdAt?: Date | null;
  bio?: string | null;
  website?: string | null;
  twitterHandle?: string | null;
  instagramHandle?: string | null;
  subscriptionStatus?: string | null;
  subscriptionPlan?: string | null;
  subscriptionEndDate?: Date | null;
  stripeCustomerId?: string | null;
  stripeSubscriptionId?: string | null;
};

export type InsertUser = {
  email?: string | null;
  displayName?: string | null;
  googleId?: string | null;
  appleId?: string | null;
  avatarUrl?: string | null;
};

export type Book = {
  id: number;
  userId?: number | null;
  title: string;
  coverImage?: string | null;
  backCoverImage?: string | null;
  spineColor?: string | null;
  summary?: string | null;
  authorName?: string | null;
  bookPreferences?: BookPreferences | null;
  isPaid?: boolean | null;
  isbn?: string | null;
  language?: string | null;
  isDeleted: boolean;
  createdAt?: Date | null;
  contentType?: string | null;
  articleContent?: string | null;
  featuredImage?: string | null;
  tags?: string[] | null;
  articleCategory?: string | null;
  bookPages?: BookPages | null;
  wordGoal?: number | null;
  genre?: string | null;
  shareToken?: string | null;
  isPublished: boolean;
  publishedAt?: Date | null;
  viewCount: number;
  seriesId?: number | null;
  seriesOrder?: number | null;
};

// `isDeleted`, `isPublished`, `viewCount` are NOT NULL columns with
// server-side DB defaults (false, false, 0). The client doesn't need
// to provide them; the API fills them in. Marked optional only on the
// Insert type — the SELECT-side `Book` type still has them required
// because they're always populated when reading back.
export type InsertBook = Omit<Book, 'id' | 'createdAt' | 'isDeleted' | 'isPublished' | 'viewCount'> & {
  isDeleted?: boolean;
  isPublished?: boolean;
  viewCount?: number;
};

export type Chapter = {
  id: number;
  bookId: number;
  userId?: number | null;
  title: string;
  content: string;
  order: number;
  status: string;
  createdAt?: Date | null;
};

// `order`, `status` are NOT NULL columns with server-side DB defaults
// (0, "draft"). Same rationale as InsertBook above — client may omit.
export type InsertChapter = Omit<Chapter, 'id' | 'createdAt' | 'order' | 'status'> & {
  order?: number;
  status?: string;
};

export type ChapterSnapshot = {
  id: number;
  chapterId: number;
  content: string;
  label?: string | null;
  createdAt?: Date | null;
};

export type LoreEntry = {
  id: number;
  bookId: number;
  category: string;
  name: string;
  description?: string | null;
  imageUrl?: string | null;
  createdAt?: Date | null;
};

export type InsertLoreEntry = Omit<LoreEntry, 'id' | 'createdAt'>;

export type Transaction = {
  id: number;
  bookId: number;
  amount: string;
  currency: string;
  status: string;
  stripePaymentIntentId?: string | null;
  paymentMethod?: string | null;
  createdAt?: Date | null;
};

export type InsertTransaction = Omit<Transaction, 'id' | 'createdAt'>;

export type DailyProgress = {
  id: number;
  bookId: number;
  date: string;
  wordCount: number;
  createdAt?: Date | null;
};

export type InsertDailyProgress = Omit<DailyProgress, 'id' | 'createdAt'>;

export type StoryBeat = {
  id: number;
  bookId: number;
  title: string;
  description?: string | null;
  columnId: string;
  order: number;
  createdAt?: Date | null;
};

export type InsertStoryBeat = Omit<StoryBeat, 'id' | 'createdAt'>;

export type ResearchItem = {
  id: number;
  bookId: number;
  type: string;
  title?: string | null;
  content: string;
  previewImageUrl?: string | null;
  description?: string | null;
  color?: string | null;
  createdAt?: Date | null;
};

export type ArcRecipient = {
  id: number;
  bookId: number;
  email: string;
  name?: string | null;
  sentAt?: Date | null;
  status?: string | null;
  createdAt?: Date | null;
};

export type Professional = {
  id: number;
  name: string;
  email: string;
  specialty: string;
  createdAt?: Date | null;
};

export type QuoteRequest = {
  id: number;
  name: string;
  email: string;
  message: string;
  createdAt?: Date | null;
};

export type Follow = {
  id: number;
  followerId: number;
  followeeId: number;
  createdAt?: Date | null;
};

// Constants
export const FREE_TRIAL_MAX_CHAPTERS = 1;
export const FREE_TRIAL_MAX_WORDS = 3750;
export const SUBSCRIPTION_MONTHLY_CENTS = 1300;        // $13/month
export const SUBSCRIPTION_YEARLY_MONTHLY_CENTS = 1000; // $10/month (yearly plan, billed monthly)
export const SUBSCRIPTION_YEARLY_ANNUAL_CENTS = 9999;  // $99.99/year (yearly plan, billed annually)
