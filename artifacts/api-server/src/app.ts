import express, { type Request, Response, NextFunction } from "express";
import session from "express-session";
import passport from "passport";
import { createServer } from "http";
import { registerRoutes } from "./routes";
import { WebhookHandlers } from "./webhook-handlers";
import { setupPassport } from "./auth";
import { logger } from "./lib/logger";

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

app.use((req, res, next) => {
  const origin = req.headers.origin || "*";
  res.setHeader("Access-Control-Allow-Origin", origin);
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
app.use(
  session({
    secret: process.env.SESSION_SECRET || "plotzy-dev-secret",
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: process.env.NODE_ENV === "production",
      httpOnly: true,
      maxAge: 7 * 24 * 60 * 60 * 1000,
      sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
    },
  })
);
app.use(passport.initialize());
app.use(passport.session());

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
  initStripe();
  await registerRoutes(httpServer, app);
}

export default app;
