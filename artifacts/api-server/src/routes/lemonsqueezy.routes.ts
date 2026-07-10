import { Router } from "express";
import crypto from "crypto";
import { eq } from "drizzle-orm";
import { db } from "../db";
import { storage } from "../storage";
import { users, subscriptionPayments } from "../../../../lib/db/src/schema";
import { logger } from "../lib/logger";

// ─── Lemon Squeezy billing (merchant of record) ─────────────────────────────
// LS is the live processor for Plotzy Pro ($10.99/month). The customer
// checks out in an LS overlay (cards / Apple Pay / Google Pay / PayPal);
// LS webhooks flip the SAME users.subscription_* fields the legacy
// PayPal flow used, so tier-limits and the whole app need no new
// concepts. Nothing here activates until the four env vars exist:
//   LEMONSQUEEZY_API_KEY, LEMONSQUEEZY_STORE_ID,
//   LEMONSQUEEZY_VARIANT_ID (Plotzy Pro monthly), LEMONSQUEEZY_WEBHOOK_SECRET

const router = Router();
const LS_API = "https://api.lemonsqueezy.com/v1";

function lsConfigured() {
  return !!(process.env.LEMONSQUEEZY_API_KEY && process.env.LEMONSQUEEZY_STORE_ID && process.env.LEMONSQUEEZY_VARIANT_ID);
}

async function lsFetch(path: string, init?: RequestInit) {
  const res = await fetch(`${LS_API}${path}`, {
    ...init,
    headers: {
      Accept: "application/vnd.api+json",
      "Content-Type": "application/vnd.api+json",
      Authorization: `Bearer ${process.env.LEMONSQUEEZY_API_KEY}`,
      ...(init?.headers || {}),
    },
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    logger.error({ path, status: res.status, body }, "Lemon Squeezy API error");
    throw new Error(`LS ${res.status}`);
  }
  return body as any;
}

// Public config: lets the frontend know whether to render the
// subscribe button at all (and whether we're in test mode). While the
// store runs on TEST keys, only admins see billing as enabled — real
// visitors on prod must never meet a checkout that cannot take money.
router.get("/api/billing/config", async (req, res) => {
  const testMode = process.env.LEMONSQUEEZY_TEST_MODE === "true";
  let enabled = lsConfigured();
  if (enabled && testMode) {
    let isAdmin = false;
    if (req.isAuthenticated() && req.user) {
      const u = await storage.getUserById((req.user as any).id);
      isAdmin = (u as any)?.role === "admin";
    }
    enabled = isAdmin;
  }
  return res.json({ enabled, priceCents: 1099, testMode });
});

// Create a checkout for the signed-in user and hand its URL to the
// frontend, which opens it in the Lemon.js overlay (user never leaves
// the site). custom.user_id ties the webhook back to our account even
// if the buyer pays with a different email.
router.post("/api/billing/checkout", async (req, res) => {
  try {
    if (!req.isAuthenticated() || !req.user) return res.status(401).json({ message: "Not authenticated" });
    if (!lsConfigured()) return res.status(503).json({ message: "Billing not configured" });
    const user = await storage.getUserById((req.user as any).id);
    if (!user) return res.status(401).json({ message: "Not authenticated" });

    const origin = process.env.FRONTEND_ORIGIN || "https://www.plotzy.co";
    const body = {
      data: {
        type: "checkouts",
        attributes: {
          checkout_data: {
            email: user.email || undefined,
            name: user.displayName || undefined,
            custom: { user_id: String(user.id) },
          },
          product_options: {
            redirect_url: `${origin}/account/subscription?checkout=success`,
          },
          // Brand the LS checkout as far as their MoR layout allows:
          // the fields themselves (email, card, billing country) are
          // fixed by Lemon Squeezy for tax reasons.
          checkout_options: {
            button_color: "#292115",
          },
        },
        relationships: {
          store: { data: { type: "stores", id: String(process.env.LEMONSQUEEZY_STORE_ID) } },
          variant: { data: { type: "variants", id: String(process.env.LEMONSQUEEZY_VARIANT_ID) } },
        },
      },
    };
    const out = await lsFetch("/checkouts", { method: "POST", body: JSON.stringify(body) });
    return res.json({ url: out?.data?.attributes?.url });
  } catch (err) {
    logger.error({ err }, "Failed to create LS checkout");
    return res.status(500).json({ message: "Could not start checkout" });
  }
});

// Customer portal (manage / cancel / update card) — a short-lived
// signed URL fetched fresh each time.
router.get("/api/billing/portal", async (req, res) => {
  try {
    if (!req.isAuthenticated() || !req.user) return res.status(401).json({ message: "Not authenticated" });
    const user = await storage.getUserById((req.user as any).id);
    const subId = (user as any)?.lsSubscriptionId;
    if (!subId) return res.status(404).json({ message: "No subscription" });
    const out = await lsFetch(`/subscriptions/${subId}`);
    const url = out?.data?.attributes?.urls?.customer_portal;
    if (!url) return res.status(404).json({ message: "No portal available" });
    return res.json({ url });
  } catch (err) {
    logger.error({ err }, "Failed to fetch LS portal");
    return res.status(500).json({ message: "Could not open portal" });
  }
});

// ─── Webhook ────────────────────────────────────────────────────────────────
// LS signs the RAW body with HMAC-SHA256 in X-Signature. app.ts already
// stashes the raw buffer on req.rawBody for exactly this purpose.
router.post("/api/webhooks/lemonsqueezy", async (req, res) => {
  try {
    const secret = process.env.LEMONSQUEEZY_WEBHOOK_SECRET;
    if (!secret) return res.status(503).send("not configured");
    const raw: Buffer | undefined = (req as any).rawBody;
    const signature = String(req.get("X-Signature") || "");
    if (!raw || !signature) return res.status(400).send("missing signature");
    const digest = crypto.createHmac("sha256", secret).update(raw).digest("hex");
    const a = Buffer.from(digest, "hex");
    const b = Buffer.from(signature, "hex");
    if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
      logger.warn("LS webhook signature mismatch");
      return res.status(401).send("bad signature");
    }

    const event = req.body;
    const name: string = event?.meta?.event_name || "";
    const customUserId = Number(event?.meta?.custom_data?.user_id);
    const attrs = event?.data?.attributes || {};
    const subscriptionId = String(event?.data?.id || "");

    // Resolve the user: prefer our custom_data id, fall back to the
    // stored subscription id (renewal webhooks omit custom data).
    let userId = Number.isFinite(customUserId) && customUserId > 0 ? customUserId : null;
    // Invoice events (payment_success) carry the subscription id in
    // attributes.subscription_id; subscription events carry it as data.id.
    const subRef = String(attrs.subscription_id || subscriptionId || "");
    if (!userId && subRef) {
      const [row] = await db.select({ id: users.id }).from(users).where(eq(users.lsSubscriptionId, subRef));
      userId = row?.id ?? null;
    }
    if (!userId) {
      logger.warn({ name, subscriptionId }, "LS webhook could not resolve user");
      return res.status(200).send("ok"); // ack so LS stops retrying
    }

    const endDate = attrs.renews_at || attrs.ends_at || null;

    if (name === "subscription_payment_success") {
      // This event carries an INVOICE, not a subscription — its status
      // is "paid", which the branch below would misread as a dead
      // subscription and downgrade the user seconds after they paid
      // (live-repro'd: created→active then payment_success→expired).
      // A successful payment always means the subscription is alive.
      await db.update(users).set({
        subscriptionTier: "pro",
        subscriptionStatus: "active",
        subscriptionPlan: "monthly",
        ...(endDate ? { subscriptionEndDate: new Date(endDate) } : {}),
        lsCustomerId: attrs.customer_id ? String(attrs.customer_id) : undefined,
      } as any).where(eq(users.id, userId));

      if (attrs.total !== undefined) {
        // The payments table predates LS and has NOT NULL paypal_* refs;
        // store the LS invoice id in both so history and admin totals work.
        try {
          const ref = `ls_${event?.data?.id || subscriptionId}`;
          await db.insert(subscriptionPayments).values({
            userId,
            paypalOrderId: ref,
            paypalCaptureId: ref,
            amountCents: Number(attrs.total) || 1099,
            currency: String(attrs.currency || "USD"),
            plan: "pro_monthly",
            tier: "pro",
            cycle: "monthly",
            paymentMethod: "lemonsqueezy",
          });
        } catch { /* receipt row is best-effort; it must not 500 the hook */ }
      }
    } else if (name === "subscription_created" || name === "subscription_updated" ||
               name === "subscription_resumed" || name === "subscription_unpaused") {
      const status = String(attrs.status || "active");
      const grants = ["active", "on_trial", "past_due"].includes(status);
      const cancelled = status === "cancelled";
      const expired = status === "expired";
      await db.update(users).set({
        subscriptionTier: grants || cancelled ? "pro" : "free",
        subscriptionStatus: expired ? "expired" : cancelled ? "canceled" : grants ? "active" : "expired",
        subscriptionPlan: "monthly",
        subscriptionEndDate: endDate ? new Date(endDate) : null,
        lsSubscriptionId: subscriptionId || undefined,
        lsCustomerId: attrs.customer_id ? String(attrs.customer_id) : undefined,
      } as any).where(eq(users.id, userId));
    } else if (name === "subscription_cancelled") {
      // Access survives until ends_at; getUserTier handles the expiry.
      await db.update(users).set({
        subscriptionStatus: "canceled",
        subscriptionEndDate: endDate ? new Date(endDate) : undefined,
      } as any).where(eq(users.id, userId));
    } else if (name === "subscription_expired") {
      await db.update(users).set({
        subscriptionTier: "free",
        subscriptionStatus: "expired",
      } as any).where(eq(users.id, userId));
    }

    logger.info({ name, userId, subscriptionId }, "LS webhook processed");
    return res.status(200).send("ok");
  } catch (err) {
    logger.error({ err }, "LS webhook failed");
    return res.status(500).send("error");
  }
});

export default router;
