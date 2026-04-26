import rateLimit, { type Options, ipKeyGenerator } from "express-rate-limit";

// ---------------------------------------------------------------------------
// Key generator: combine the authenticated user id (when present) with the
// connecting IP. We used to switch from IP → user-id at login, which made
// the limit appear *fresher* the moment an attacker authenticated — they
// could exhaust the anonymous bucket, log in, and immediately get a fresh
// allowance under the same minute. Combining both anchors keeps a single
// continuous bucket per (caller, identity) tuple.
//
// SECURITY: `ipKeyGenerator` takes the IP STRING (not the Request object) —
// the previous (req, res) call was a runtime bug: at runtime the helper
// stringified the Request and bucketed every caller under the same key,
// effectively neutralising per-IP rate limiting. The library's own
// docstring shows the correct usage. IPv6 normalisation (collapsing /64
// subnets to one bucket) is the whole reason to use this helper instead of
// raw req.ip — without it an IPv6 attacker rotates the low bits and
// trivially bypasses limits.
// ---------------------------------------------------------------------------
const keyGenerator: Options["keyGenerator"] = (req, _res) => {
  const ip = ipKeyGenerator(req.ip || "");
  if ((req as any).isAuthenticated?.() && (req as any).user?.id) {
    return `user:${(req as any).user.id}|ip:${ip}`;
  }
  return ip;
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
  // Same shared keyGenerator — IP + authenticated user when present.
  keyGenerator,
  message: { message: "Too many login attempts. Please try again later." },
});

// ---------------------------------------------------------------------------
// Sensitive auth surface (registration, email verification, password reset).
// These endpoints aren't called often by legitimate users but are heavily
// abused for enumeration / brute-forcing tokens / account spam, so they get
// a tighter window than authLimiter.
// ---------------------------------------------------------------------------
export const sensitiveAuthLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,   // 1-hour window
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator,
  message: { message: "Too many requests. Please try again later." },
});

// ---------------------------------------------------------------------------
// Tier-based AI daily limit — checks subscription tier's daily AI allowance
// This runs AFTER aiLimiter (which handles per-minute rate limiting)
// ---------------------------------------------------------------------------
import type { Request, Response, NextFunction } from "express";
import { getUserTier, checkAiLimit, incrementAiUsage } from "../lib/tier-limits";
import { storage } from "../storage";
import { isAdminUser } from "../lib/admin";

export async function tierAiLimiter(req: Request, res: Response, next: NextFunction) {
  if (!req.isAuthenticated() || !req.user) {
    return res.status(401).json({ message: "Not authenticated" });
  }
  const dbUser = await storage.getUserById(req.user.id);
  if (!dbUser) return res.status(401).json({ message: "User not found" });

  // Admins bypass tier AI limits entirely — needed so the site owner can
  // exercise every AI feature end-to-end without a paid plan.
  if (isAdminUser(dbUser)) {
    await incrementAiUsage(req.user.id); // still track for analytics
    (req as any).aiUsage = { tier: "admin", remaining: 9999, limit: 9999, used: 0 };
    return next();
  }

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

// ---------------------------------------------------------------------------
// Write endpoints — prevent spam creation/deletion
//   30 writes per minute per user/IP
// ---------------------------------------------------------------------------
export const writeLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator,
  message: { message: "Too many write operations. Please slow down." },
});
