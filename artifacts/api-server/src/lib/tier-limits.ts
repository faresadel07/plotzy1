import {
  FREE_MAX_BOOKS, FREE_MAX_CHAPTERS_PER_BOOK, FREE_MAX_WORDS, FREE_MAX_AI_CALLS_PER_DAY, FREE_MAX_PUBLISHED_BOOKS,
  PRO_MAX_BOOKS, PRO_MAX_CHAPTERS_PER_BOOK, PRO_MAX_WORDS, PRO_MAX_AI_CALLS_PER_DAY, PRO_MAX_PUBLISHED_BOOKS,
  PREMIUM_MAX_BOOKS, PREMIUM_MAX_CHAPTERS_PER_BOOK, PREMIUM_MAX_WORDS, PREMIUM_MAX_AI_CALLS_PER_DAY, PREMIUM_MAX_PUBLISHED_BOOKS,
} from "../../../../lib/db/src/schema";
import { db } from "../db";
import { dailyAiUsage } from "../../../../lib/db/src/schema";
import { eq, and, sql } from "drizzle-orm";

export type Tier = "free" | "pro" | "premium";

interface TierLimits {
  maxBooks: number;
  maxChaptersPerBook: number;
  maxWords: number;
  maxAiCallsPerDay: number;
  maxPublishedBooks: number;
  maxMarketplacePerMonth: number;
  canExportPdf: boolean;
  canExportEpub: boolean;
  canUseAudiobook: boolean;
  canUseCoverDesigner: boolean;
  canUseAdvancedAI: boolean;
  canUseMarketplace: boolean;
  canUseVersionHistory: boolean;
  canUseAmbientSounds: boolean;
  prioritySupport: boolean;
}

const LIMITS: Record<Tier, TierLimits> = {
  free: {
    maxBooks: FREE_MAX_BOOKS,
    maxChaptersPerBook: FREE_MAX_CHAPTERS_PER_BOOK,
    maxWords: FREE_MAX_WORDS,
    maxAiCallsPerDay: FREE_MAX_AI_CALLS_PER_DAY,
    maxPublishedBooks: FREE_MAX_PUBLISHED_BOOKS,
    canExportPdf: false,
    canExportEpub: false,
    canUseAudiobook: false,
    canUseCoverDesigner: true,
    canUseAdvancedAI: false,
    maxMarketplacePerMonth: 0,
    canUseMarketplace: false,
    canUseVersionHistory: false,
    canUseAmbientSounds: true,
    prioritySupport: false,
  },
  pro: {
    maxBooks: PRO_MAX_BOOKS,
    maxChaptersPerBook: PRO_MAX_CHAPTERS_PER_BOOK,
    maxWords: PRO_MAX_WORDS,
    maxAiCallsPerDay: PRO_MAX_AI_CALLS_PER_DAY,
    maxPublishedBooks: PRO_MAX_PUBLISHED_BOOKS,
    canExportPdf: true,
    canExportEpub: true,
    canUseAudiobook: true,
    canUseCoverDesigner: true,
    canUseAdvancedAI: true,
    maxMarketplacePerMonth: 3,
    canUseMarketplace: true,
    canUseVersionHistory: true,
    canUseAmbientSounds: true,
    prioritySupport: false,
  },
  premium: {
    maxBooks: PREMIUM_MAX_BOOKS,
    maxChaptersPerBook: PREMIUM_MAX_CHAPTERS_PER_BOOK,
    maxWords: PREMIUM_MAX_WORDS,
    maxAiCallsPerDay: PREMIUM_MAX_AI_CALLS_PER_DAY,
    maxPublishedBooks: PREMIUM_MAX_PUBLISHED_BOOKS,
    canExportPdf: true,
    canExportEpub: true,
    canUseAudiobook: true,
    canUseCoverDesigner: true,
    canUseAdvancedAI: true,
    maxMarketplacePerMonth: 9,
    canUseMarketplace: true,
    canUseVersionHistory: true,
    canUseAmbientSounds: true,
    prioritySupport: true,
  },
};

export function getTierLimits(tier: Tier): TierLimits {
  return LIMITS[tier] || LIMITS.free;
}

export function getUserTier(user: { subscriptionTier?: string; subscriptionStatus?: string | null }): Tier {
  // If subscription is not active, treat as free regardless of stored tier
  if (user.subscriptionStatus !== "active") return "free";
  const tier = (user.subscriptionTier || "free") as Tier;
  return LIMITS[tier] ? tier : "free";
}

/** Get today's AI usage count for a user, and increment it. Returns the NEW count. */
export async function incrementAiUsage(userId: number): Promise<number> {
  const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
  const result = await db.execute(sql`
    INSERT INTO daily_ai_usage (user_id, date, call_count)
    VALUES (${userId}, ${today}, 1)
    ON CONFLICT (user_id, date)
    DO UPDATE SET call_count = daily_ai_usage.call_count + 1
    RETURNING call_count
  `);
  return Number((result as any).rows?.[0]?.call_count ?? 1);
}

/** Get today's AI usage count without incrementing. */
export async function getAiUsageToday(userId: number): Promise<number> {
  const today = new Date().toISOString().slice(0, 10);
  const [row] = await db.select({ count: dailyAiUsage.callCount })
    .from(dailyAiUsage)
    .where(and(eq(dailyAiUsage.userId, userId), eq(dailyAiUsage.date, today)));
  return row?.count ?? 0;
}

/** Check if a user can make an AI call. Returns { allowed, remaining, limit }. */
export async function checkAiLimit(userId: number, tier: Tier): Promise<{ allowed: boolean; remaining: number; limit: number; used: number }> {
  const limits = getTierLimits(tier);
  const used = await getAiUsageToday(userId);
  const remaining = Math.max(0, limits.maxAiCallsPerDay - used);
  return { allowed: used < limits.maxAiCallsPerDay, remaining, limit: limits.maxAiCallsPerDay, used };
}

// ── Marketplace Usage (monthly) ──────────────────────────────────────────

/** Get this month's marketplace usage count. */
export async function getMarketplaceUsageThisMonth(userId: number): Promise<number> {
  const now = new Date();
  const monthStart = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;
  const result = await db.execute(sql`
    SELECT COUNT(*) as cnt FROM marketplace_usage
    WHERE user_id = ${userId} AND created_at >= ${monthStart}::date
  `);
  return Number((result as any).rows?.[0]?.cnt ?? 0);
}

/** Record a marketplace usage. */
export async function recordMarketplaceUsage(userId: number, serviceId: string, bookId?: number): Promise<void> {
  await db.execute(sql`
    INSERT INTO marketplace_usage (user_id, service_id, book_id)
    VALUES (${userId}, ${serviceId}, ${bookId ?? null})
  `);
}

/** Check if user can use marketplace. */
export async function checkMarketplaceLimit(userId: number, tier: Tier): Promise<{ allowed: boolean; remaining: number; limit: number; used: number }> {
  const limits = getTierLimits(tier);
  if (!limits.canUseMarketplace) return { allowed: false, remaining: 0, limit: 0, used: 0 };
  const used = await getMarketplaceUsageThisMonth(userId);
  const remaining = Math.max(0, limits.maxMarketplacePerMonth - used);
  return { allowed: used < limits.maxMarketplacePerMonth, remaining, limit: limits.maxMarketplacePerMonth, used };
}

/** Get user's marketplace history. */
export async function getMarketplaceHistory(userId: number): Promise<any[]> {
  const result = await db.execute(sql`
    SELECT * FROM marketplace_usage
    WHERE user_id = ${userId}
    ORDER BY created_at DESC
    LIMIT 50
  `);
  return (result as any).rows ?? [];
}
