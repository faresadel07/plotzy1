import express, { type Request, Response, NextFunction, type RequestHandler } from "express";

// Wrap async route handlers to catch errors and pass to Express error handler
// This prevents unhandled promise rejections from crashing the server
function asyncHandler(fn: (req: Request, res: Response, next: NextFunction) => Promise<any>): RequestHandler {
  return (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
}
// Monkey-patch Express app methods to auto-wrap async handlers
const origGet = express.application.get;
const origPost = express.application.post;
const origPut = express.application.put;
const origPatch = express.application.patch;
const origDelete = express.application.delete;
function wrapArgs(args: any[]) {
  return args.map(a => typeof a === "function" && a.constructor.name === "AsyncFunction" ? asyncHandler(a) : a);
}
express.application.get = function (this: any, ...args: any[]) { return origGet.apply(this, wrapArgs(args)); } as any;
express.application.post = function (this: any, ...args: any[]) { return origPost.apply(this, wrapArgs(args)); } as any;
express.application.put = function (this: any, ...args: any[]) { return origPut.apply(this, wrapArgs(args)); } as any;
express.application.patch = function (this: any, ...args: any[]) { return origPatch.apply(this, wrapArgs(args)); } as any;
express.application.delete = function (this: any, ...args: any[]) { return origDelete.apply(this, wrapArgs(args)); } as any;
import session from "express-session";
import ConnectPgSimple from "connect-pg-simple";
import passport from "passport";
import helmet from "helmet";
import { createServer } from "http";
import { registerRoutes } from "./routes";
import { WebhookHandlers } from "./webhook-handlers";
import { setupPassport } from "./auth";
import { logger } from "./lib/logger";
import { generalLimiter, authLimiter, publicReadLimiter, writeLimiter } from "./middleware/rate-limit";
import { apiLogger } from "./middleware/api-logger";
import { pageViewTracker } from "./middleware/page-view-tracker";
import { csrfOriginCheck } from "./middleware/csrf";
import { pool } from "./db";
import { Sentry } from "./lib/sentry";

declare module "http" {
  interface IncomingMessage {
    rawBody: unknown;
  }
}

export function log(message: string, source = "express") {
  logger.info({ source }, message);
}

async function initStripe() {
  try {
    const { runMigrations } = await import("stripe-replit-sync");
    const { getStripeSync } = await import("./stripe-client");
    const databaseUrl = process.env.DATABASE_URL;
    if (!databaseUrl) throw new Error("DATABASE_URL required");
    log("Initializing Stripe schema...", "stripe");
    await runMigrations({ databaseUrl });
    log("Stripe schema ready", "stripe");
    const stripeSync = await getStripeSync();
    const domain = process.env.REPLIT_DOMAINS?.split(",")[0];
    if (domain) {
      const webhookUrl = `https://${domain}/api/stripe/webhook`;
      await stripeSync.findOrCreateManagedWebhook(webhookUrl);
      log(`Webhook configured: ${webhookUrl}`, "stripe");
    }
    stripeSync
      .syncBackfill()
      .then(() => log("Stripe data synced", "stripe"))
      .catch((err: Error) => log(`Stripe sync error: ${err.message}`, "stripe"));
  } catch (err: any) {
    log(`Stripe init skipped: ${err.message}`, "stripe");
  }
}

const app = express();
export const httpServer = createServer(app);

// SECURITY: we sit behind a reverse proxy (Fly/Render/Cloudflare/etc.) in
// prod, so req.ip and X-Forwarded-For parsing must opt in explicitly —
// otherwise either (a) req.ip is always the proxy's IP (all users share one
// rate-limit bucket; abuse logs are useless), or (b) attackers spoof
// X-Forwarded-For because every request from untrusted sources is trusted.
// `1` trusts exactly one hop (the first proxy in front of us). Tune via
// env if the topology has multiple hops.
const trustProxyEnv = process.env.TRUST_PROXY;
if (trustProxyEnv) {
  const n = Number(trustProxyEnv);
  app.set("trust proxy", Number.isFinite(n) ? n : trustProxyEnv);
} else if (process.env.NODE_ENV === "production") {
  app.set("trust proxy", 1);
} else {
  app.set("trust proxy", false);
}

app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: [
        "'self'",
        "'unsafe-inline'", // Required for Vite-injected scripts
        ...(process.env.NODE_ENV !== "production" ? ["'unsafe-eval'"] : []),
        "https://www.paypal.com", "https://www.sandbox.paypal.com", "https://accounts.google.com",
      ],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com", "data:"],
      imgSrc: ["'self'", "data:", "blob:", "https:", "http:"],
      connectSrc: ["'self'", "https://api.openai.com", "https://www.paypal.com", "https://www.sandbox.paypal.com", "https://accounts.google.com", "wss:", "ws:"],
      frameSrc: ["'self'", "https://www.paypal.com", "https://www.sandbox.paypal.com", "https://accounts.google.com", "https://www.youtube.com", "https://player.vimeo.com"],
      objectSrc: ["'none'"],
      baseUri: ["'self'"],
      formAction: ["'self'"],
      frameAncestors: ["'self'"],
      upgradeInsecureRequests: process.env.NODE_ENV === "production" ? [] : null,
    },
  },
  crossOriginEmbedderPolicy: false,
}));

app.use((req, res, next) => {
  // Trim + drop empty entries so a stray space in the env variable
  // ("https://a.com, https://b.com") doesn't silently disable an origin —
  // the comparison below is exact-string, so " https://b.com" wouldn't
  // match the browser's "https://b.com" Origin header.
  const allowedOrigins = process.env.ALLOWED_ORIGINS
    ?.split(",")
    .map(s => s.trim())
    .filter(Boolean)
    ?? ["http://localhost:5173"];
  const origin = req.headers.origin;
  if (origin && allowedOrigins.includes(origin)) {
    res.setHeader("Access-Control-Allow-Origin", origin);
  }
  res.setHeader("Access-Control-Allow-Credentials", "true");
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,PUT,PATCH,DELETE,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type,Authorization,X-Requested-With");
  if (req.method === "OPTIONS") {
    res.sendStatus(204);
    return;
  }
  next();
});

// ── Health checks ──────────────────────────────────────────────────────
// Mounted BEFORE body parsers / session / CSRF / rate limit so:
//   - hosting probes aren't blocked by auth or origin checks,
//   - frequent polls don't eat rate-limit budget,
//   - a broken session store doesn't take the health check down with it.
//
// /livez  = "the process is alive" — flat 200. Used for restart decisions.
// /healthz = "I can actually serve traffic" — pings the DB with a 3s
//           timeout. Returns 503 if DB is unreachable so the load
//           balancer pulls this pod out of rotation until it recovers.
app.get("/livez", (_req, res) => {
  res.status(200).json({ status: "ok" });
});

app.get("/healthz", async (_req, res) => {
  // Race the DB ping against a short timer so a hung database can't hang
  // the health check itself (hung health checks look like a healthy pod
  // to most probers, which is the worst of all worlds).
  const ping = pool.query("SELECT 1").then(() => true);
  const timeout = new Promise<false>(resolve => setTimeout(() => resolve(false), 3000));
  try {
    const ok = await Promise.race([ping, timeout]);
    if (ok) return res.status(200).json({ status: "ok", db: "ok" });
    return res.status(503).json({ status: "degraded", db: "timeout" });
  } catch (err: any) {
    return res.status(503).json({ status: "degraded", db: "error", message: err?.message });
  }
});

app.post("/api/stripe/webhook", express.raw({ type: "application/json" }), async (req, res) => {
  const signature = req.headers["stripe-signature"];
  if (!signature) return res.status(400).json({ error: "Missing stripe-signature" });
  try {
    const sig = Array.isArray(signature) ? signature[0] : signature;
    await WebhookHandlers.processWebhook(req.body as Buffer, sig);
    return res.status(200).json({ received: true });
  } catch (err: any) {
    log(`Webhook error: ${err.message}`, "stripe");
    return res.status(400).json({ error: "Webhook processing error" });
  }
});

// Default JSON body limit. Tightened from 10mb → 2mb so generic
// endpoints (login, comment, follow, profile, etc.) can't be used to
// pump tens of megabytes through the parser. Routes that legitimately
// need more (chapter content, audio transcription, AI prompt
// expansion) opt in explicitly via per-route audioBodyParser /
// largeBodyParser. URL-encoded form bodies are also clamped.
app.use(express.json({ limit: "2mb", verify: (req, _res, buf) => { req.rawBody = buf; } }));
app.use(express.urlencoded({ extended: false, limit: "2mb" }));

setupPassport();
const PgSession = ConnectPgSimple(session);

// SESSION_SECRET is validated at boot by lib/env.ts — in production it
// is guaranteed to exist and be ≥32 chars, so we can read it directly
// here. In development the fallback keeps local runs unblocked.
const sessionSecret = process.env.SESSION_SECRET;

app.use(
  session({
    store: process.env.DATABASE_URL
      ? new PgSession({
          conString: process.env.DATABASE_URL,
          tableName: "user_sessions",
          createTableIfMissing: true,
        })
      : undefined,
    secret: sessionSecret || "plotzy-dev-secret-not-for-production",
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: process.env.NODE_ENV === "production",
      httpOnly: true,
      maxAge: 30 * 24 * 60 * 60 * 1000,
      // "lax" is safer (blocks CSRF). Use "none" only if frontend and API are on different domains.
      sameSite: process.env.COOKIE_SAME_SITE === "none" ? "none" : "lax",
    },
  })
);
app.use(passport.initialize());
app.use(passport.session());

// SECURITY: Origin/Referer-based CSRF check for state-changing requests.
// Runs AFTER session setup (so rejections don't touch the session store)
// and AFTER the Stripe webhook route above (which is declared before this
// and is therefore matched before this middleware runs).
app.use(csrfOriginCheck);

// Rate limiting — applied after auth so user id is available as key.
// Trailing slash on "/auth/" so the limiter matches OAuth routes exactly
// and doesn't bleed into /authors/* profile fetches.
app.use("/api", generalLimiter);
app.use("/auth/", authLimiter);
// Tighter limit on public endpoints to prevent content scraping
app.use("/api/public", publicReadLimiter);
app.use("/api/gutenberg", publicReadLimiter);
app.use("/api/authors", publicReadLimiter);
// Write limiter on all POST/PUT/PATCH/DELETE — prevents spam
app.use("/api", (req, res, next) => {
  if (req.method !== "GET" && req.method !== "HEAD" && req.method !== "OPTIONS") {
    return writeLimiter(req, res, next);
  }
  return next();
});

// API request logging for admin System Health dashboard
app.use(apiLogger);

// Admin analytics — track unique devices / pages / browsers. Fire-and-forget.
app.use(pageViewTracker);

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      logger.info({ method: req.method, path, status: res.statusCode, duration });
    }
  });
  next();
});

app.use((err: any, _req: Request, res: Response, next: NextFunction) => {
  const status = err.status || err.statusCode || 500;
  const message = err.message || "Internal Server Error";
  logger.error({ err }, "Internal Server Error");
  // Only ship real 5xx server failures to Sentry — 4xx are client errors
  // (bad input, missing auth, validation) and would drown signal in noise.
  if (status >= 500) {
    Sentry.captureException(err);
  }
  if (res.headersSent) return next(err);
  return res.status(status).json({ message });
});

// Final safety net: any unhandled rejection or uncaught exception in the
// background (outside the request pipeline) — e.g. a fire-and-forget
// promise — still reaches Sentry instead of being silently swallowed.
process.on("unhandledRejection", (reason) => {
  logger.error({ err: reason }, "Unhandled promise rejection");
  Sentry.captureException(reason);
});
process.on("uncaughtException", (err) => {
  logger.error({ err }, "Uncaught exception");
  Sentry.captureException(err);
});

export async function setupApp() {
  if (process.env.REPL_ID) {
    initStripe();
  } else {
    log("Stripe init skipped (not on Replit)", "stripe");
  }
  await registerRoutes(httpServer, app);
}

export default app;
