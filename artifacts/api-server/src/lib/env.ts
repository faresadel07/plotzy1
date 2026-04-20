import { z } from "zod";

/**
 * Single source of truth for every environment variable the server reads.
 *
 * Call `parseEnv()` ONCE at process start (from index.ts, before importing
 * anything with side effects) — it prints a readable error and exits if
 * the configuration is broken, so a mis-deployed instance refuses to come
 * up instead of crashing on the first user request.
 *
 * Rules of thumb:
 * - Required = app will not function without it (DATABASE_URL, PORT).
 * - Production-only required = check tightens when NODE_ENV=production.
 * - Optional = missing = related feature turns off (Google OAuth, Stripe,
 *   Redis, email, etc.). The app stays up.
 *
 * This file does NOT replace the 40+ existing `process.env.X` reads. Those
 * keep working. The schema just makes sure, at boot, that every value the
 * code later reads is the right shape.
 */

// Booleans may arrive as "true" / "1" / "false" / "0".
const boolFromString = z
  .union([z.boolean(), z.string()])
  .transform((v) => (typeof v === "boolean" ? v : v === "true" || v === "1"));

// Comma-separated URL lists: "https://a.com,https://b.com"
const csvList = z
  .string()
  .optional()
  .transform((v) => (v ? v.split(",").map((s) => s.trim()).filter(Boolean) : []));

const envSchema = z
  .object({
    // ── Core runtime ───────────────────────────────────────────────────
    NODE_ENV: z
      .enum(["development", "production", "test"])
      .default("development"),
    PORT: z.coerce.number().int().positive(),
    LOG_LEVEL: z
      .enum(["fatal", "error", "warn", "info", "debug", "trace", "silent"])
      .optional(),

    // ── Database (required) ────────────────────────────────────────────
    DATABASE_URL: z
      .string()
      .url("DATABASE_URL must be a valid connection URL (postgres://…)"),

    // ── Session / cookies ──────────────────────────────────────────────
    SESSION_SECRET: z.string().optional(),
    COOKIE_SAME_SITE: z.enum(["lax", "strict", "none"]).optional(),
    TRUST_PROXY: z.string().optional(),

    // ── CORS / origin ──────────────────────────────────────────────────
    ALLOWED_ORIGINS: csvList,
    FRONTEND_URL: z.string().url().optional(),
    APP_DOMAIN: z.string().optional(),

    // ── OAuth: Google ──────────────────────────────────────────────────
    GOOGLE_CLIENT_ID: z.string().optional(),
    GOOGLE_CLIENT_SECRET: z.string().optional(),

    // ── OAuth: Apple ───────────────────────────────────────────────────
    APPLE_CLIENT_ID: z.string().optional(),
    APPLE_TEAM_ID: z.string().optional(),
    APPLE_KEY_ID: z.string().optional(),
    APPLE_PRIVATE_KEY: z.string().optional(),

    // ── OAuth: LinkedIn ────────────────────────────────────────────────
    LINKEDIN_CLIENT_ID: z.string().optional(),
    LINKEDIN_CLIENT_SECRET: z.string().optional(),

    // ── Admin bootstrap (dev fallback only) ────────────────────────────
    ADMIN_EMAIL: z.string().email().optional(),

    // ── AI providers ───────────────────────────────────────────────────
    OPENAI_API_KEY: z.string().optional(),
    AI_INTEGRATIONS_OPENAI_API_KEY: z.string().optional(),
    AI_INTEGRATIONS_OPENAI_BASE_URL: z.string().url().optional(),
    AI_TEXT_MODEL: z.string().optional(),

    // ── Payments ───────────────────────────────────────────────────────
    STRIPE_SECRET_KEY: z.string().optional(),
    PAYPAL_CLIENT_ID: z.string().optional(),
    PAYPAL_SECRET: z.string().optional(),
    PAYPAL_SANDBOX: boolFromString.optional(),

    // ── Email ──────────────────────────────────────────────────────────
    RESEND_API_KEY: z.string().optional(),

    // ── Redis (rate-limit cache) ───────────────────────────────────────
    UPSTASH_REDIS_REST_URL: z.string().url().optional(),
    UPSTASH_REDIS_REST_TOKEN: z.string().optional(),

    // ── Replit-specific (ignored elsewhere, just documented) ───────────
    REPL_ID: z.string().optional(),
    REPL_IDENTITY: z.string().optional(),
    REPLIT_DOMAINS: z.string().optional(),
    REPLIT_DEPLOYMENT: z.string().optional(),
    REPLIT_CONNECTORS_HOSTNAME: z.string().optional(),
    WEB_REPL_RENEWAL: z.string().optional(),
  })
  // Production-only tightening: things we can be relaxed about in dev but
  // that MUST be correct before real users hit the service.
  .superRefine((env, ctx) => {
    if (env.NODE_ENV !== "production") return;

    if (!env.SESSION_SECRET || env.SESSION_SECRET.length < 32) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["SESSION_SECRET"],
        message:
          "SESSION_SECRET is required in production and must be at least 32 characters. Generate one: `openssl rand -hex 48`",
      });
    }

    if (env.ALLOWED_ORIGINS.length === 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["ALLOWED_ORIGINS"],
        message:
          "ALLOWED_ORIGINS must be set in production (comma-separated list of front-end origins, e.g. https://plotzy.com,https://www.plotzy.com)",
      });
    }

    // OAuth pairs — setting one without the other breaks the callback.
    if (!!env.GOOGLE_CLIENT_ID !== !!env.GOOGLE_CLIENT_SECRET) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["GOOGLE_CLIENT_SECRET"],
        message:
          "GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET must both be set, or both be absent. Half-configured OAuth breaks the login flow silently.",
      });
    }
    const applePair = [
      env.APPLE_CLIENT_ID,
      env.APPLE_TEAM_ID,
      env.APPLE_KEY_ID,
      env.APPLE_PRIVATE_KEY,
    ];
    const appleSet = applePair.filter(Boolean).length;
    if (appleSet !== 0 && appleSet !== 4) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["APPLE_CLIENT_ID"],
        message:
          "Apple Sign-In requires ALL of APPLE_CLIENT_ID, APPLE_TEAM_ID, APPLE_KEY_ID, APPLE_PRIVATE_KEY — or none of them.",
      });
    }
    if (!!env.PAYPAL_CLIENT_ID !== !!env.PAYPAL_SECRET) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["PAYPAL_SECRET"],
        message:
          "PAYPAL_CLIENT_ID and PAYPAL_SECRET must both be set, or both be absent.",
      });
    }
    if (!!env.UPSTASH_REDIS_REST_URL !== !!env.UPSTASH_REDIS_REST_TOKEN) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["UPSTASH_REDIS_REST_TOKEN"],
        message:
          "UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN must both be set, or both be absent.",
      });
    }

    // Stripe keys: cheap guard against pasting a publishable key by mistake.
    if (env.STRIPE_SECRET_KEY && !env.STRIPE_SECRET_KEY.startsWith("sk_")) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["STRIPE_SECRET_KEY"],
        message:
          "STRIPE_SECRET_KEY must start with `sk_` (you may have pasted a publishable key that starts with `pk_`).",
      });
    }
  });

export type Env = z.infer<typeof envSchema>;

let cached: Env | null = null;

/**
 * Validate process.env at boot. Call from index.ts before anything else.
 * On failure, prints every issue and exits with code 1 — so a broken
 * deployment never serves traffic.
 */
export function parseEnv(): Env {
  if (cached) return cached;
  const result = envSchema.safeParse(process.env);
  if (!result.success) {
    const lines = result.error.issues.map((issue) => {
      const key = issue.path.join(".") || "<root>";
      return `  ✗ ${key}: ${issue.message}`;
    });
    // eslint-disable-next-line no-console
    console.error(
      [
        "",
        "❌ Environment validation failed — refusing to start.",
        "",
        ...lines,
        "",
        "Fix the variables above in your hosting provider (.env / secret manager) and redeploy.",
        "",
      ].join("\n"),
    );
    process.exit(1);
  }
  cached = result.data;
  return cached;
}

/**
 * Access the parsed env after parseEnv() has run. Throws if called before
 * parseEnv — which should be impossible if the boot order is correct.
 */
export function getEnv(): Env {
  if (!cached) {
    throw new Error(
      "getEnv() called before parseEnv() — make sure parseEnv() runs first in index.ts.",
    );
  }
  return cached;
}
