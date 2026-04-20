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
express.application.get = function (...args: any[]) { return origGet.apply(this, wrapArgs(args)); } as any;
express.application.post = function (...args: any[]) { return origPost.apply(this, wrapArgs(args)); } as any;
express.application.put = function (...args: any[]) { return origPut.apply(this, wrapArgs(args)); } as any;
express.application.patch = function (...args: any[]) { return origPatch.apply(this, wrapArgs(args)); } as any;
express.application.delete = function (...args: any[]) { return origDelete.apply(this, wrapArgs(args)); } as any;
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
  const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(",") ?? ["http://localhost:5173"];
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

app.post("/api/stripe/webhook", express.raw({ type: "application/json" }), async (req, res) => {
  const signature = req.headers["stripe-signature"];
  if (!signature) return res.status(400).json({ error: "Missing stripe-signature" });
  try {
    const sig = Array.isArray(signature) ? signature[0] : signature;
    await WebhookHandlers.processWebhook(req.body as Buffer, sig);
    res.status(200).json({ received: true });
  } catch (err: any) {
    log(`Webhook error: ${err.message}`, "stripe");
    res.status(400).json({ error: "Webhook processing error" });
  }
});

app.use(express.json({ limit: "10mb", verify: (req, _res, buf) => { req.rawBody = buf; } }));
app.use(express.urlencoded({ extended: false }));

setupPassport();
const PgSession = ConnectPgSimple(session);

// Validate SESSION_SECRET strength
const sessionSecret = process.env.SESSION_SECRET;
if (process.env.NODE_ENV === "production" && !sessionSecret) {
  throw new Error("SESSION_SECRET is required in production");
}
if (process.env.NODE_ENV === "production" && sessionSecret && sessionSecret.length < 32) {
  throw new Error("SESSION_SECRET must be at least 32 characters in production");
}

app.use(
  session({
    store: process.env.DATABASE_URL
      ? new PgSession({
          conString: process.env.DATABASE_URL,
          tableName: "user_sessions",
          createTableIfMissing: true,
        })
      : undefined,
    secret: sessionSecret || (process.env.NODE_ENV === "production"
      ? (() => { throw new Error("SESSION_SECRET required"); })()
      : "plotzy-dev-secret-not-for-production"),
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

// Rate limiting — applied after auth so user id is available as key
app.use("/api", generalLimiter);
app.use("/auth", authLimiter);
// Tighter limit on public endpoints to prevent content scraping
app.use("/api/public", publicReadLimiter);
app.use("/api/gutenberg", publicReadLimiter);
app.use("/api/authors", publicReadLimiter);
// Write limiter on all POST/PUT/PATCH/DELETE — prevents spam
app.use("/api", (req, res, next) => {
  if (req.method !== "GET" && req.method !== "HEAD" && req.method !== "OPTIONS") {
    return writeLimiter(req, res, next);
  }
  next();
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
  if (res.headersSent) return next(err);
  return res.status(status).json({ message });
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
