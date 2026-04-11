import rateLimit, { type Options, ipKeyGenerator } from "express-rate-limit";

// ---------------------------------------------------------------------------
// Key generator: use authenticated user id when available, otherwise IP.
// This prevents a single logged-in user from burning through OpenAI credits
// regardless of which IP they connect from.
// ---------------------------------------------------------------------------
const keyGenerator: Options["keyGenerator"] = (req, res) => {
  if ((req as any).isAuthenticated?.() && (req as any).user?.id) {
    return `user:${(req as any).user.id}`;
  }
  return ipKeyGenerator(req, res);
};

// ---------------------------------------------------------------------------
// AI endpoints — aggressive limits because every hit costs real money
//   10 requests per minute per user/IP
// ---------------------------------------------------------------------------
export const aiLimiter = rateLimit({
  windowMs: 60 * 1000,       // 1-minute window
  max: 10,                    // 10 requests per window
  standardHeaders: true,      // Return rate limit info in RateLimit-* headers
  legacyHeaders: false,
  keyGenerator,
  message: { message: "Too many AI requests. Please wait a minute before trying again." },
});

// ---------------------------------------------------------------------------
// Image generation — even more expensive ($0.04+ per call)
//   5 requests per minute per user/IP
// ---------------------------------------------------------------------------
export const imageGenLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator,
  message: { message: "Too many image generation requests. Please wait a minute." },
});

// ---------------------------------------------------------------------------
// Auth endpoints — prevent brute force
//   10 login attempts per 15 minutes per IP
// ---------------------------------------------------------------------------
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,  // 15-minute window
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: "Too many login attempts. Please try again later." },
});

// ---------------------------------------------------------------------------
// Tier-based AI daily limit — checks subscription tier's daily AI allowance
// This runs AFTER aiLimiter (which handles per-minute rate limiting)
// ---------------------------------------------------------------------------
import type { Request, Response, NextFunction } from "express";
import { getUserTier, checkAiLimit, incrementAiUsage } from "../lib/tier-limits";
import { storage } from "../storage";

export async function tierAiLimiter(req: Request, res: Response, next: NextFunction) {
  if (!req.isAuthenticated() || !req.user) {
    return res.status(401).json({ message: "Not authenticated" });
  }
  const dbUser = await storage.getUserById(req.user.id);
  if (!dbUser) return res.status(401).json({ message: "User not found" });

  const tier = getUserTier(dbUser as any);
  const { allowed, remaining, limit, used } = await checkAiLimit(req.user.id, tier);

  if (!allowed) {
    return res.status(429).json({
      message: `Daily AI limit reached (${limit} calls/day on ${tier} plan). Upgrade for more.`,
      code: "AI_DAILY_LIMIT",
      tier,
      limit,
      used,
      remaining: 0,
    });
  }

  // Increment usage and attach info to request for downstream use
  await incrementAiUsage(req.user.id);
  (req as any).aiUsage = { tier, remaining: remaining - 1, limit, used: used + 1 };
  next();
}

// ---------------------------------------------------------------------------
// General API — generous but prevents bulk scraping
//   200 requests per minute per user/IP
// ---------------------------------------------------------------------------
export const generalLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 200,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator,
  message: { message: "Too many requests. Please slow down." },
});

// ---------------------------------------------------------------------------
// Public read endpoints — tighter limit to prevent content scraping
//   60 requests per minute per IP (books, chapters, profiles, gutenberg)
// ---------------------------------------------------------------------------
export const publicReadLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 60,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: "Too many requests. Please slow down." },
});
