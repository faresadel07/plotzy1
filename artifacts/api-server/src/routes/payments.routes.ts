import { Router } from "express";
import { z } from "zod";
import { eq, desc } from "drizzle-orm";
import { storage } from "../storage";
import { db } from "../db";
import {
  FREE_TRIAL_MAX_CHAPTERS,
  FREE_TRIAL_MAX_WORDS,
  subscriptionPayments,
} from "../../../../lib/db/src/schema";
import { isSubscriptionActive } from "./helpers";
import { sendEmail } from "../lib/email";
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

// ─── Subscription Status (processor-agnostic) ──────────────────────────────
// Reads from users.subscription_* fields populated by the PayPal capture
// flow. No live caller in the frontend today (the legacy useSubscription
// hook that consumed this is unimported), but kept because subscription-
// success.tsx still invalidates this query key after redirect verification.

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

// Return PayPal client ID + sandbox flag to the frontend (public).
// `sandbox` lets pages render a "TEST MODE" badge in dev/staging when
// PAYPAL_SANDBOX=true. In production with the env unset, sandbox is
// false and no badge appears — production-safe by default.
router.get("/api/paypal/config", (_req, res) => {
  const clientId = process.env.PAYPAL_CLIENT_ID;
  const sandbox = process.env.PAYPAL_SANDBOX === "true";
  if (!clientId) return res.status(503).json({ enabled: false, sandbox });
  return res.json({ enabled: true, clientId, sandbox });
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

// User-facing plan name for emails / receipts. Mirrors the displayName
// field of PLAN_DETAILS in artifacts/plotzy/src/lib/checkout-plans.ts —
// kept tiny and inline rather than reaching across the workspace boundary.
function planToDisplayName(plan: PayPalPlan): string {
  return plan.startsWith("premium") ? "Plotzy Premium" : "Plotzy Pro";
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

// Cancel the authenticated user's subscription. Only updates DB state —
// no PayPal API call (we use one-time captures, not PayPal subscriptions,
// so there's nothing to cancel on PayPal's side). The user keeps tier
// access until subscription_end_date passes, enforced by the updated
// isSubscriptionActive (helpers.ts) and getUserTier (tier-limits.ts)
// helpers which now recognize "canceled" status as still-entitled while
// endDate is in the future.
router.post("/api/user/cancel-subscription", async (req, res) => {
  if (!req.isAuthenticated()) {
    return res.status(401).json({ message: "Not authenticated" });
  }
  const userId = (req.user as any).id;

  try {
    const user = await storage.getUserById(userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    if (user.subscriptionStatus !== "active") {
      return res.status(400).json({
        message:
          user.subscriptionStatus === "canceled"
            ? "Subscription is already canceled."
            : "No active subscription to cancel.",
      });
    }

    await storage.updateUser(userId, { subscriptionStatus: "canceled" } as any);

    logger.info(
      {
        userId,
        plan: user.subscriptionPlan,
        accessUntil: user.subscriptionEndDate,
      },
      "Subscription canceled by user",
    );

    // Fire-and-forget cancellation confirmation email. Never block the
    // cancel response on email — sendEmail() already wraps in try/catch
    // internally (warns + skips if RESEND_API_KEY missing, logs failures
    // without throwing). The .catch(() => {}) is belt-and-suspenders so
    // even an unexpected throw can't surface here.
    if (user.email) {
      const planName = planToDisplayName(user.subscriptionPlan as PayPalPlan);
      const accessUntil = user.subscriptionEndDate
        ? new Date(user.subscriptionEndDate).toLocaleDateString("en-US", {
            year: "numeric", month: "long", day: "numeric",
          })
        : "the end of your billing period";
      const frontendUrl = process.env.FRONTEND_URL || "http://localhost:5173";
      const html = `
        <div style="font-family:-apple-system,sans-serif;max-width:480px;margin:0 auto;padding:40px 20px;">
          <h2 style="color:#111;margin-bottom:8px;">Subscription canceled</h2>
          <p style="color:#555;line-height:1.6;">
            We've canceled your <strong>${planName}</strong> subscription.
            You'll continue to have access until <strong>${accessUntil}</strong>,
            after which your account will return to the Free plan.
          </p>
          <p style="color:#555;line-height:1.6;">
            Your books are always yours — none of your content is deleted.
            If you change your mind, you can resubscribe anytime.
          </p>
          <a href="${frontendUrl}/account/subscription" style="display:inline-block;margin:24px 0;padding:14px 32px;background:#111;color:#fff;text-decoration:none;border-radius:10px;font-weight:600;font-size:14px;">View subscription</a>
          <hr style="border:none;border-top:1px solid #eee;margin:32px 0;" />
          <p style="color:#bbb;font-size:11px;">Plotzy — The modern platform for writers</p>
        </div>
      `;
      sendEmail(user.email, "Your Plotzy subscription has been canceled", html).catch(() => {});
    }

    return res.json({
      success: true,
      accessUntil: user.subscriptionEndDate,
    });
  } catch (err) {
    logger.error({ err, userId }, "Failed to cancel subscription");
    return res.status(500).json({ message: "Failed to cancel subscription" });
  }
});

export default router;
