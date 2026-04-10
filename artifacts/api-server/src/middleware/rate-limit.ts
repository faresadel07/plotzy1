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
