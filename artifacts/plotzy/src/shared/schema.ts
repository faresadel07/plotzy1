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
};

export type InsertBook = Omit<Book, 'id' | 'createdAt'>;

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

export type InsertChapter = Omit<Chapter, 'id' | 'createdAt'>;

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
  wordsWritten: number;
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
export const SUBSCRIPTION_MONTHLY_CENTS = 800;
export const SUBSCRIPTION_YEARLY_CENTS = 7800;
