import { Router } from "express";
import { z } from "zod";
import { eq, desc } from "drizzle-orm";
import { storage } from "../storage";
import { db } from "../db";
import { getUncachableStripeClient, getStripePublishableKey } from "../stripe-client";
import {
  FREE_TRIAL_MAX_CHAPTERS,
  FREE_TRIAL_MAX_WORDS,
  SUBSCRIPTION_MONTHLY_CENTS,
  SUBSCRIPTION_YEARLY_MONTHLY_CENTS,
  SUBSCRIPTION_YEARLY_ANNUAL_CENTS,
  subscriptionPayments,
} from "../../../../lib/db/src/schema";
import { api } from "../../../../lib/shared/src/routes";
import { isSubscriptionActive } from "./helpers";
import { logger } from "../lib/logger";
import { Sentry } from "../lib/sentry";
import rateLimit from "express-rate-limit";

const router = Router();

// Rate limit payment endpoints — 5 attempts per 15 min per IP
const paymentLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: "Too many payment attempts. Please try again later." },
});

const BOOK_PRICE_CENTS = 499;

// ─── Payments (Stripe one-time) ─────────────────────────────────────────────

router.post(api.payments.createIntent.path, paymentLimiter, async (req, res) => {
  try {
    // Require an authenticated user and verify they own (or co-edit) the
    // book. The previous version accepted any `bookId` from the request
    // body — anyone could spin up payment intents against any book, which
    // is both a fraud vector (associate someone else's purchase with the
    // wrong book) and a Stripe-quota / log-noise problem.
    if (!req.isAuthenticated() || !req.user) {
      return res.status(401).json({ message: "Authentication required" });
    }
    const { bookId } = api.payments.createIntent.input.parse(req.body);
    const userId = (req.user as any).id;

    const book = await storage.getBook(bookId);
    if (!book) return res.status(404).json({ message: "Book not found" });
    if (book.userId !== userId) {
      return res.status(403).json({ message: "Only the book owner can purchase publishing for this book" });
    }

    const stripe = await getUncachableStripeClient();
    const paymentIntent = await stripe.paymentIntents.create({
      amount: BOOK_PRICE_CENTS,
      currency: "usd",
      // Pin both the book id AND the buyer's user id into the intent so the
      // confirm/webhook handlers can refuse to credit the purchase to a
      // different user later.
      metadata: { bookId: String(bookId), userId: String(userId) },
      automatic_payment_methods: { enabled: true },
    });

    await storage.createTransaction({
      bookId,
      amount: "4.99",
      currency: "usd",
      status: "pending",
      stripePaymentIntentId: paymentIntent.id,
      paymentMethod: "card",
    });

    return res.json({ clientSecret: paymentIntent.client_secret, paymentIntentId: paymentIntent.id });
  } catch (err) {
    logger.error({ err }, "Failed to create payment intent");
    return res.status(500).json({ message: "Failed to create payment intent" });
  }
});

router.post(api.payments.confirm.path, paymentLimiter, async (req, res) => {
  try {
    if (!req.isAuthenticated() || !req.user) {
      return res.status(401).json({ message: "Authentication required" });
    }
    const { paymentIntentId } = api.payments.confirm.input.parse(req.body);

    // 1) Verify Stripe actually says this payment succeeded. Demo IDs
    //    bypass for local testing only.
    if (!paymentIntentId.startsWith("demo_")) {
      try {
        const stripe = await getUncachableStripeClient();
        const intent = await stripe.paymentIntents.retrieve(paymentIntentId);
        if (intent.status !== "succeeded") {
          return res.status(400).json({ message: "Payment not confirmed by Stripe" });
        }
      } catch (stripeErr) {
        logger.error({ err: stripeErr }, "Stripe verify error");
        return res.status(400).json({ message: "Payment verification failed" });
      }
    }

    // 2) Authorisation: the bookId we trust is the one the *transaction
    //    record* was created with — NEVER the bookId in the request body
    //    (an attacker could otherwise forge a paymentIntentId paired with
    //    someone else's bookId and flip that book to isPaid). Cross-check
    //    that the caller owns that book.
    const tx = await storage.getTransaction(paymentIntentId);
    if (!tx) {
      return res.status(404).json({ message: "Unknown payment intent" });
    }
    if (tx.status === "succeeded") {
      return res.json({ success: true, alreadyProcessed: true });
    }
    const book = await storage.getBook(tx.bookId);
    if (!book) {
      return res.status(404).json({ message: "Book not found" });
    }
    if (book.userId !== req.user.id) {
      return res.status(403).json({ message: "You do not own this book" });
    }

    // 3) Atomic state transition: only ONE concurrent request can flip
    //    pending → succeeded. The losing requests get null and short-
    //    circuit, eliminating the double-process race.
    const claimed = await storage.markTransactionSucceededIfPending(paymentIntentId);
    if (!claimed) {
      // Another concurrent request beat us to it. Idempotent success.
      return res.json({ success: true, alreadyProcessed: true });
    }

    // 4) Only the winner of the CAS marks the book paid.
    await storage.updateBook(tx.bookId, { isPaid: true });

    return res.json({ success: true });
  } catch (err) {
    logger.error({ err }, "Failed to confirm payment");
    return res.status(500).json({ message: "Failed to confirm payment" });
  }
});

// ─── Subscription (Stripe) ──────────────────────────────────────────────────

router.get("/api/subscription/status", async (req, res) => {
  if (!req.isAuthenticated() || !req.user) {
    return res.json({ subscriptionStatus: "free_trial", subscriptionPlan: null, subscriptionEndDate: null, tier: "free" });
  }
  const user = await storage.getUserById(req.user.id);
  if (!user) return res.json({ subscriptionStatus: "free_trial", subscriptionPlan: null, subscriptionEndDate: null, tier: "free" });

  const { getUserTier, getTierLimits, getAiUsageToday } = await import("../lib/tier-limits");
  const tier = getUserTier(user as any);
  const limits = getTierLimits(tier);
  const chapterCount = await storage.getUserChapterCount(user.id);
  const aiUsedToday = await getAiUsageToday(user.id);

  return res.json({
    subscriptionStatus: user.subscriptionStatus,
    subscriptionPlan: user.subscriptionPlan,
    subscriptionEndDate: user.subscriptionEndDate,
    tier,
    limits,
    chapterCount,
    chapterLimit: limits.maxChaptersPerBook,
    wordLimit: limits.maxWords,
    aiUsedToday,
    aiLimitToday: limits.maxAiCallsPerDay,
    isActive: isSubscriptionActive(user as any),
  });
});

router.post("/api/subscription/create-checkout", paymentLimiter, async (req, res) => {
  try {
    const { plan } = z.object({ plan: z.enum(["monthly", "yearly"]) }).strict().parse(req.body);
    const stripe = await getUncachableStripeClient();

    const userId = req.isAuthenticated() && req.user ? req.user.id : null;
    const dbUser = userId ? await storage.getUserById(userId) : null;

    const domain = process.env.REPLIT_DOMAINS?.split(",")[0];
    const baseUrl = domain ? `https://${domain}` : `http://localhost:5000`;

    const priceData = plan === "monthly"
      ? { unit_amount: SUBSCRIPTION_MONTHLY_CENTS, recurring: { interval: "month" as const } }
      : { unit_amount: SUBSCRIPTION_YEARLY_ANNUAL_CENTS, recurring: { interval: "year" as const } };

    const sessionParams: any = {
      payment_method_types: ["card"],
      line_items: [{
        price_data: {
          currency: "usd",
          product_data: {
            name: plan === "monthly" ? "Plotzy Monthly Plan" : "Plotzy Yearly Plan",
            description: plan === "monthly"
              ? "Full access to all Plotzy features — unlimited books, chapters, and AI assistance."
              : "Full access to all Plotzy features at the best value — save 19% vs monthly.",
          },
          ...priceData,
        },
        quantity: 1,
      }],
      mode: "subscription",
      success_url: `${baseUrl}/subscription/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${baseUrl}/pricing`,
      metadata: { plan, userId: userId ? String(userId) : "" },
    };

    if (dbUser?.stripeCustomerId) {
      sessionParams.customer = dbUser.stripeCustomerId;
    } else if (dbUser?.email) {
      sessionParams.customer_email = dbUser.email;
    }

    const session = await stripe.checkout.sessions.create(sessionParams);
    return res.json({ url: session.url, sessionId: session.id });
  } catch (err: any) {
    logger.error({ err }, "Checkout error");
    return res.status(500).json({ message: err?.message || "Failed to create checkout session" });
  }
});

router.get("/api/subscription/verify", async (req, res) => {
  try {
    // SECURITY: previously this trusted `session.metadata.userId` and would
    // happily flip subscriptionStatus=active on whichever user id the
    // session metadata carried. A logged-in attacker who could observe (or
    // guess) someone else's checkout session id could then activate that
    // user's subscription, or — worse — pass their own session id with
    // mutated metadata via a forged checkout. We now require the caller to
    // be authenticated and only mutate the *current* user's row.
    if (!req.isAuthenticated() || !req.user) {
      return res.status(401).json({ message: "Authentication required" });
    }
    const callerId = (req.user as any).id;
    const { session_id } = z.object({ session_id: z.string() }).strict().parse(req.query);
    const stripe = await getUncachableStripeClient();
    const session = await stripe.checkout.sessions.retrieve(session_id, {
      expand: ["subscription", "customer"],
    });

    if (session.payment_status === "paid" || session.status === "complete") {
      const sessionUserId = session.metadata?.userId ? Number(session.metadata.userId) : null;
      // The session must have been issued for this exact caller. If the
      // metadata mismatches, the caller is trying to verify someone else's
      // session — refuse without leaking which case it was.
      if (sessionUserId !== callerId) {
        return res.status(403).json({ success: false, message: "Session does not belong to caller" });
      }

      const plan = (session.metadata?.plan as "monthly" | "yearly") || "monthly";
      const subscription = session.subscription as any;
      const customer = session.customer as any;

      const endDate = subscription?.current_period_end
        ? new Date(subscription.current_period_end * 1000)
        : new Date(Date.now() + 365 * 24 * 60 * 60 * 1000);

      await storage.updateUser(callerId, {
        subscriptionStatus: "active",
        subscriptionPlan: plan,
        subscriptionEndDate: endDate,
        stripeCustomerId: customer?.id || (session.customer as string) || undefined,
        stripeSubscriptionId: subscription?.id || undefined,
      });

      return res.json({ success: true, plan });
    }

    return res.json({ success: false });
  } catch (err: any) {
    return res.status(500).json({ message: err?.message || "Failed to verify subscription" });
  }
});

router.post("/api/subscription/portal", async (req, res) => {
  try {
    if (!req.isAuthenticated() || !req.user) {
      return res.status(401).json({ message: "Not authenticated" });
    }
    const dbUser = await storage.getUserById(req.user.id);
    if (!dbUser?.stripeCustomerId) {
      return res.status(400).json({ message: "No billing account found" });
    }
    const stripe = await getUncachableStripeClient();
    const domain = process.env.REPLIT_DOMAINS?.split(",")[0];
    const baseUrl = domain ? `https://${domain}` : `http://localhost:5000`;

    const portalSession = await stripe.billingPortal.sessions.create({
      customer: dbUser.stripeCustomerId,
      return_url: `${baseUrl}/`,
    });
    return res.json({ url: portalSession.url });
  } catch (err: any) {
    return res.status(500).json({ message: err?.message || "Failed to create portal session" });
  }
});

router.get("/api/subscription/publishable-key", async (req, res) => {
  try {
    const key = await getStripePublishableKey();
    return res.json({ publishableKey: key });
  } catch (err) {
    return res.json({ publishableKey: null });
  }
});

// ─── PayPal ─────────────────────────────────────────────────────────────────

const PAYPAL_BASE = process.env.PAYPAL_SANDBOX === "true"
  ? "https://api-m.sandbox.paypal.com"
  : "https://api-m.paypal.com";

async function getPayPalToken(): Promise<string> {
  const clientId = process.env.PAYPAL_CLIENT_ID;
  const secret = process.env.PAYPAL_SECRET;
  if (!clientId || !secret) throw new Error("PayPal not configured");
  const res = await fetch(`${PAYPAL_BASE}/v1/oauth2/token`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${Buffer.from(`${clientId}:${secret}`).toString("base64")}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials",
  });
  if (!res.ok) throw new Error("PayPal token fetch failed");
  const data = await res.json() as { access_token: string };
  return data.access_token;
}

// Return PayPal client ID to the frontend (public)
router.get("/api/paypal/config", (_req, res) => {
  const clientId = process.env.PAYPAL_CLIENT_ID;
  if (!clientId) return res.status(503).json({ enabled: false });
  return res.json({ enabled: true, clientId });
});

import {
  PRO_MONTHLY_CENTS, PRO_YEARLY_CENTS,
  PREMIUM_MONTHLY_CENTS, PREMIUM_YEARLY_CENTS,
} from "../../../../lib/db/src/schema";

type PayPalPlan = "monthly" | "yearly_monthly" | "yearly_annual" | "pro_monthly" | "pro_yearly" | "premium_monthly" | "premium_yearly";

function paypalPlanAmount(plan: PayPalPlan): string {
  switch (plan) {
    case "pro_monthly":      return (PRO_MONTHLY_CENTS / 100).toFixed(2);
    case "pro_yearly":       return (PRO_YEARLY_CENTS / 100).toFixed(2);
    case "premium_monthly":  return (PREMIUM_MONTHLY_CENTS / 100).toFixed(2);
    case "premium_yearly":   return (PREMIUM_YEARLY_CENTS / 100).toFixed(2);
    // Legacy plans
    case "monthly":          return (PRO_MONTHLY_CENTS / 100).toFixed(2);
    case "yearly_monthly":   return (PRO_MONTHLY_CENTS / 100).toFixed(2);
    case "yearly_annual":    return (PRO_YEARLY_CENTS / 100).toFixed(2);
    default:                 return (PRO_MONTHLY_CENTS / 100).toFixed(2);
  }
}

function paypalPlanDescription(plan: PayPalPlan): string {
  switch (plan) {
    case "pro_monthly":      return "Plotzy Pro — Monthly ($8.99/mo)";
    case "pro_yearly":       return "Plotzy Pro — Annual ($79.99/yr)";
    case "premium_monthly":  return "Plotzy Premium — Monthly ($16.99/mo)";
    case "premium_yearly":   return "Plotzy Premium — Annual ($159.99/yr)";
    case "monthly":          return "Plotzy Pro — Monthly ($8.99/mo)";
    case "yearly_monthly":   return "Plotzy Pro — Monthly ($8.99/mo)";
    case "yearly_annual":    return "Plotzy Pro — Annual ($79.99/yr)";
    default:                 return "Plotzy Pro — Monthly ($8.99/mo)";
  }
}

function planToTier(plan: PayPalPlan): "pro" | "premium" {
  return plan.startsWith("premium") ? "premium" : "pro";
}

// Create a PayPal order for a subscription plan
const paypalPlanSchema = z.enum(["pro_monthly", "pro_yearly", "premium_monthly", "premium_yearly", "monthly", "yearly_monthly", "yearly_annual"]);

router.post("/api/paypal/create-order", paymentLimiter, async (req, res) => {
  if (!req.isAuthenticated()) return res.status(401).json({ message: "Not authenticated" });
  const parsed = paypalPlanSchema.safeParse(req.body?.plan);
  if (!parsed.success) return res.status(400).json({ message: "Invalid plan" });
  const plan = parsed.data as PayPalPlan;
  try {
    const token = await getPayPalToken();
    const orderRes = await fetch(`${PAYPAL_BASE}/v2/checkout/orders`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        intent: "CAPTURE",
        purchase_units: [{
          description: paypalPlanDescription(plan),
          amount: { currency_code: "USD", value: paypalPlanAmount(plan) },
        }],
      }),
    });
    if (!orderRes.ok) {
      const err = await orderRes.text();
      logger.error({ err }, "PayPal create-order error");
      return res.status(502).json({ message: "Failed to create PayPal order" });
    }
    const order = await orderRes.json() as { id: string };
    return res.json({ orderId: order.id });
  } catch (err) {
    logger.error({ err }, "PayPal error");
    return res.status(500).json({ message: "PayPal error" });
  }
});

// PayPal capture response shape — documented at
// https://developer.paypal.com/docs/api/orders/v2/#orders_capture
// Nested fields are marked optional defensively so a malformed or
// partial response surfaces as a verification failure (rejected) rather
// than crashing the handler.
interface PayPalCaptureResponse {
  id: string;
  status: string;                            // order-level status
  purchase_units?: Array<{
    payments?: {
      captures?: Array<{
        id: string;
        status: string;                      // capture-level status
        amount: {
          currency_code: string;
          value: string;                     // string e.g. "9.99" — exact decimal
        };
      }>;
    };
  }>;
}

// Capture the approved PayPal order and activate subscription
router.post("/api/paypal/capture-order", paymentLimiter, async (req, res) => {
  if (!req.isAuthenticated()) return res.status(401).json({ message: "Not authenticated" });
  // `paymentSource` reflects which SDK button funded the capture (`paypal`
  // for the yellow PayPal-account button, `card` for the popup-card button).
  // Optional + defaults to "paypal" so older clients still work, but the
  // checkout.tsx flow always sends an explicit value. Used purely for the
  // payment_method audit label — does NOT affect security verification,
  // which is funding-source agnostic and runs on the capture response.
  const captureSchema = z
    .object({
      orderId: z.string().min(1),
      plan: paypalPlanSchema,
      paymentSource: z.enum(["paypal", "card"]).optional().default("paypal"),
    })
    .strict();
  const parsed = captureSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ message: "Invalid request" });
  const { orderId, plan, paymentSource } = parsed.data as {
    orderId: string;
    plan: PayPalPlan;
    paymentSource: "paypal" | "card";
  };
  // Hoisted so the security-verification log path below can include the
  // userId in its forensic record.
  const userId = (req.user as any).id;
  try {
    const token = await getPayPalToken();
    const captureRes = await fetch(`${PAYPAL_BASE}/v2/checkout/orders/${orderId}/capture`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    });
    if (!captureRes.ok) {
      const errText = await captureRes.text();
      // Only short-circuit for the specific "this order has been captured by
      // an earlier request" idempotency case. PayPal's UNPROCESSABLE_ENTITY
      // bucket also covers INSTRUMENT_DECLINED, PAYER_CANNOT_PAY,
      // ORDER_NOT_APPROVED, COMPLIANCE_VIOLATION, etc. — those are real
      // failures that must surface as errors to the client, not be silently
      // turned into "success: true". Parse the JSON and match strictly on
      // details[].issue === "ORDER_ALREADY_CAPTURED".
      let isAlreadyCaptured = false;
      try {
        const errBody = JSON.parse(errText) as {
          details?: Array<{ issue?: string }>;
        };
        isAlreadyCaptured =
          errBody.details?.some((d) => d.issue === "ORDER_ALREADY_CAPTURED") ?? false;
      } catch {
        // Body wasn't JSON — treat as a generic error, not idempotency.
      }
      if (isAlreadyCaptured) {
        return res.json({ success: true, alreadyProcessed: true });
      }
      logger.error({ err: errText }, "PayPal capture error");
      return res.status(502).json({ message: "Failed to capture PayPal order" });
    }
    const capture = await captureRes.json() as PayPalCaptureResponse;
    if (capture.status !== "COMPLETED") {
      return res.status(400).json({ message: "Payment not completed" });
    }

    // ─── SECURITY: verify the captured amount matches the requested plan ───
    //
    // The client tells us which `plan` they're paying for, but PayPal tells
    // us the actual amount and currency that were charged. If the two don't
    // match, the client is attempting to upgrade themselves to a higher
    // tier at a lower price (e.g. create a "pro_monthly" $9.99 order, then
    // call capture-order with plan: "premium_yearly" $159.99). Refuse
    // activation, alert via Sentry, and don't create any subscription
    // record.
    //
    // String comparison only — PayPal returns the amount as a fixed-decimal
    // string ("9.99"), and `paypalPlanAmount` produces the same shape via
    // `(cents/100).toFixed(2)`. Float comparison is avoided to sidestep
    // precision issues entirely.
    const captureDetail = capture.purchase_units?.[0]?.payments?.captures?.[0];
    const expectedAmount = paypalPlanAmount(plan);
    const expectedCurrency = "USD";
    const receivedAmount = captureDetail?.amount?.value;
    const receivedCurrency = captureDetail?.amount?.currency_code;
    const captureLevelStatus = captureDetail?.status;
    const captureId = captureDetail?.id;

    const mismatch =
      !captureDetail ||
      captureLevelStatus !== "COMPLETED" ||
      receivedAmount !== expectedAmount ||
      receivedCurrency !== expectedCurrency;

    if (mismatch) {
      const forensic = {
        event: "paypal_capture_verification_failed",
        userId,
        plan,
        paypalOrderId: orderId,
        captureId,
        expectedAmount,
        receivedAmount,
        expectedCurrency,
        receivedCurrency,
        captureLevelStatus,
        topLevelStatus: capture.status,
      };
      logger.warn(forensic, "PayPal capture failed amount/currency verification");
      Sentry.captureMessage(
        "PayPal capture amount/currency mismatch — possible tampering attempt",
        {
          level: "warning",
          tags: {
            payment_provider: "paypal",
            event_type: "capture_amount_mismatch",
          },
          extra: forensic,
        },
      );
      // Generic message — never reveal which field mismatched, so an
      // attacker iterating the API can't narrow in on the gap.
      return res.status(400).json({ message: "Payment validation failed" });
    }
    // ─── End security check ───────────────────────────────────────────────

    // Activate subscription in DB — yearly plans give 1 year, monthly gives 1 month
    const endDate = new Date();
    const isYearly = plan === "yearly_annual" || plan === "pro_yearly" || plan === "premium_yearly";
    if (isYearly) {
      endDate.setFullYear(endDate.getFullYear() + 1);
    } else {
      endDate.setMonth(endDate.getMonth() + 1);
    }
    const tier = planToTier(plan);
    await storage.updateUser(userId, {
      subscriptionStatus: "active",
      subscriptionTier: tier,
      subscriptionPlan: plan,
      subscriptionEndDate: endDate,
      paymentMethod: "paypal",
    } as any);

    // Audit row in subscription_payments. Wrapped in try/catch so a
    // history-write failure NEVER blocks activation — the user already
    // has their subscription; a missed audit row is recoverable later
    // (and any failure here is logged for triage).
    try {
      // The frontend's SDK button binding is the source of truth for funding
      // method. PayPal's capture response can't reliably distinguish a
      // Standard popup-card payment from a PayPal-account payment when the
      // merchant doesn't have ACDC enabled — both surface as
      // payment_source.paypal. Trust the client-supplied paymentSource for
      // the audit label; security verification doesn't depend on it.
      const paymentMethod = paymentSource === "card" ? "paypal_card" : "paypal_account";
      const amountCents = Math.round(
        parseFloat(captureDetail.amount.value) * 100,
      );
      const cycle = isYearly ? "yearly" : "monthly";

      await db
        .insert(subscriptionPayments)
        .values({
          userId,
          paypalOrderId: orderId,
          paypalCaptureId: captureDetail.id,
          amountCents,
          currency: captureDetail.amount.currency_code,
          plan,
          tier,
          cycle,
          paymentMethod,
          status: "completed",
        })
        // Idempotent on uq_subpayments_paypal_order_id — a retry that
        // somehow re-enters this branch with the same orderId becomes
        // a no-op rather than a duplicate audit row.
        .onConflictDoNothing();
    } catch (err) {
      logger.error(
        { err, userId, orderId, captureId: captureDetail.id },
        "Failed to record subscription_payment row",
      );
    }

    return res.json({ success: true });
  } catch (err) {
    logger.error({ err }, "PayPal capture error");
    return res.status(500).json({ message: "PayPal capture error" });
  }
});

// Read-only history of subscription captures for the authenticated user.
// Powers the /account/subscription page. Limit 50 — subscriptions are
// infrequent so this comfortably covers multi-year history while bounding
// the response size for any single request.
router.get("/api/user/payment-history", async (req, res) => {
  if (!req.isAuthenticated()) {
    return res.status(401).json({ message: "Not authenticated" });
  }
  const userId = (req.user as any).id;

  try {
    const rows = await db
      .select()
      .from(subscriptionPayments)
      .where(eq(subscriptionPayments.userId, userId))
      .orderBy(desc(subscriptionPayments.createdAt))
      .limit(50);

    return res.json({ payments: rows });
  } catch (err) {
    logger.error({ err, userId }, "Failed to fetch payment history");
    return res.status(500).json({ message: "Failed to fetch payment history" });
  }
});

export default router;
