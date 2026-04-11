import { Router } from "express";
import { z } from "zod";
import { storage } from "../storage";
import { getUncachableStripeClient, getStripePublishableKey } from "../stripe-client";
import { FREE_TRIAL_MAX_CHAPTERS, FREE_TRIAL_MAX_WORDS, SUBSCRIPTION_MONTHLY_CENTS, SUBSCRIPTION_YEARLY_MONTHLY_CENTS, SUBSCRIPTION_YEARLY_ANNUAL_CENTS } from "../../../../lib/db/src/schema";
import { api } from "../../../../lib/shared/src/routes";
import { isSubscriptionActive } from "./helpers";

const router = Router();

const BOOK_PRICE_CENTS = 499;

// ─── Payments (Stripe one-time) ─────────────────────────────────────────────

router.post(api.payments.createIntent.path, async (req, res) => {
  try {
    const { bookId } = api.payments.createIntent.input.parse(req.body);

    const stripe = await getUncachableStripeClient();
    const paymentIntent = await stripe.paymentIntents.create({
      amount: BOOK_PRICE_CENTS,
      currency: "usd",
      metadata: { bookId: String(bookId) },
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

    res.json({ clientSecret: paymentIntent.client_secret, paymentIntentId: paymentIntent.id });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to create payment intent" });
  }
});

router.post(api.payments.confirm.path, async (req, res) => {
  try {
    const { bookId, paymentIntentId } = api.payments.confirm.input.parse(req.body);

    if (!paymentIntentId.startsWith("demo_")) {
      try {
        const stripe = await getUncachableStripeClient();
        const intent = await stripe.paymentIntents.retrieve(paymentIntentId);
        if (intent.status !== "succeeded") {
          return res.status(400).json({ message: "Payment not confirmed by Stripe" });
        }
      } catch (stripeErr) {
        console.error("Stripe verify error:", stripeErr);
        return res.status(400).json({ message: "Payment verification failed" });
      }
    }

    await storage.updateBook(bookId, { isPaid: true });
    const tx = await storage.getTransaction(paymentIntentId);
    if (tx) {
      await storage.updateTransaction(tx.id, { status: "succeeded" });
    }

    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to confirm payment" });
  }
});

// ─── Subscription (Stripe) ──────────────────────────────────────────────────

router.get("/api/subscription/status", async (req, res) => {
  if (!req.isAuthenticated() || !req.user) {
    return res.json({ subscriptionStatus: "free_trial", subscriptionPlan: null, subscriptionEndDate: null });
  }
  const user = await storage.getUserById(req.user.id);
  if (!user) return res.json({ subscriptionStatus: "free_trial", subscriptionPlan: null, subscriptionEndDate: null });
  const chapterCount = await storage.getUserChapterCount(user.id);
  return res.json({
    subscriptionStatus: user.subscriptionStatus,
    subscriptionPlan: user.subscriptionPlan,
    subscriptionEndDate: user.subscriptionEndDate,
    chapterCount,
    chapterLimit: FREE_TRIAL_MAX_CHAPTERS,
    wordLimit: FREE_TRIAL_MAX_WORDS,
    isActive: isSubscriptionActive(user as any),
  });
});

router.post("/api/subscription/create-checkout", async (req, res) => {
  try {
    const { plan } = z.object({ plan: z.enum(["monthly", "yearly"]) }).parse(req.body);
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
    res.json({ url: session.url, sessionId: session.id });
  } catch (err: any) {
    console.error("Checkout error:", err?.message);
    res.status(500).json({ message: err?.message || "Failed to create checkout session" });
  }
});

router.get("/api/subscription/verify", async (req, res) => {
  try {
    const { session_id } = z.object({ session_id: z.string() }).parse(req.query);
    const stripe = await getUncachableStripeClient();
    const session = await stripe.checkout.sessions.retrieve(session_id, {
      expand: ["subscription", "customer"],
    });

    if (session.payment_status === "paid" || session.status === "complete") {
      const userId = session.metadata?.userId ? Number(session.metadata.userId) : null;
      const plan = (session.metadata?.plan as "monthly" | "yearly") || "monthly";
      const subscription = session.subscription as any;
      const customer = session.customer as any;

      if (userId) {
        const endDate = subscription?.current_period_end
          ? new Date(subscription.current_period_end * 1000)
          : new Date(Date.now() + 365 * 24 * 60 * 60 * 1000);

        await storage.updateUser(userId, {
          subscriptionStatus: "active",
          subscriptionPlan: plan,
          subscriptionEndDate: endDate,
          stripeCustomerId: customer?.id || session.customer as string || undefined,
          stripeSubscriptionId: subscription?.id || undefined,
        });
      }

      return res.json({ success: true, plan });
    }

    res.json({ success: false });
  } catch (err: any) {
    res.status(500).json({ message: err?.message || "Failed to verify subscription" });
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
    res.json({ url: portalSession.url });
  } catch (err: any) {
    res.status(500).json({ message: err?.message || "Failed to create portal session" });
  }
});

router.get("/api/subscription/publishable-key", async (req, res) => {
  try {
    const key = await getStripePublishableKey();
    res.json({ publishableKey: key });
  } catch (err) {
    res.json({ publishableKey: null });
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

type PayPalPlan = "monthly" | "yearly_monthly" | "yearly_annual";

function paypalPlanAmount(plan: PayPalPlan): string {
  if (plan === "monthly")        return (SUBSCRIPTION_MONTHLY_CENTS / 100).toFixed(2);
  if (plan === "yearly_monthly") return (SUBSCRIPTION_YEARLY_MONTHLY_CENTS / 100).toFixed(2);
  return (SUBSCRIPTION_YEARLY_ANNUAL_CENTS / 100).toFixed(2);
}

function paypalPlanDescription(plan: PayPalPlan): string {
  if (plan === "monthly")        return "Plotzy Pro — Monthly Plan ($13/mo)";
  if (plan === "yearly_monthly") return "Plotzy Pro — Yearly Plan, Monthly Billing ($10/mo)";
  return "Plotzy Pro — Yearly Plan, Annual Billing ($99.99/yr)";
}

// Create a PayPal order for a subscription plan
router.post("/api/paypal/create-order", async (req, res) => {
  if (!req.isAuthenticated()) return res.status(401).json({ message: "Not authenticated" });
  const { plan } = req.body as { plan: PayPalPlan };
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
      console.error("PayPal create-order error:", err);
      return res.status(502).json({ message: "Failed to create PayPal order" });
    }
    const order = await orderRes.json() as { id: string };
    return res.json({ orderId: order.id });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "PayPal error" });
  }
});

// Capture the approved PayPal order and activate subscription
router.post("/api/paypal/capture-order", async (req, res) => {
  if (!req.isAuthenticated()) return res.status(401).json({ message: "Not authenticated" });
  const { orderId, plan } = req.body as { orderId: string; plan: PayPalPlan };
  try {
    const token = await getPayPalToken();
    const captureRes = await fetch(`${PAYPAL_BASE}/v2/checkout/orders/${orderId}/capture`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    });
    if (!captureRes.ok) {
      const err = await captureRes.text();
      console.error("PayPal capture error:", err);
      return res.status(502).json({ message: "Failed to capture PayPal order" });
    }
    const capture = await captureRes.json() as { status: string };
    if (capture.status !== "COMPLETED") {
      return res.status(400).json({ message: "Payment not completed" });
    }
    // Activate subscription in DB — yearly_annual gives 1 year, others give 1 month
    const userId = (req.user as any).id;
    const endDate = new Date();
    if (plan === "yearly_annual") {
      endDate.setFullYear(endDate.getFullYear() + 1);
    } else {
      endDate.setMonth(endDate.getMonth() + 1);
    }
    const subscriptionPlan = plan === "monthly" ? "monthly" : "yearly";
    await storage.updateUser(userId, {
      subscriptionStatus: "active",
      subscriptionPlan,
      subscriptionEndDate: endDate,
      paymentMethod: "paypal",
    });
    return res.json({ success: true });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "PayPal capture error" });
  }
});

export default router;
