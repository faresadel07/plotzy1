import { useState } from "react";
import { motion } from "framer-motion";
import { Check, Zap, Star, Loader2 } from "lucide-react";
import { useLocation } from "wouter";
import { createCheckoutSession } from "@/hooks/use-subscription";
import { useAuth } from "@/contexts/auth-context";
import { Layout } from "@/components/layout";
import { PayPalCheckout } from "@/components/paypal-button";

const MONTHLY_PRICE = 12.99;
const YEARLY_PRICE = 9.99;
const YEARLY_TOTAL = (YEARLY_PRICE * 12).toFixed(2);
const SAVE_PCT = Math.round(((MONTHLY_PRICE - YEARLY_PRICE) / MONTHLY_PRICE) * 100);

const FEATURES_FREE = [
  "1 chapter to start writing",
  "Up to 3,750 words (15 pages)",
  "Inline AI ghost-text suggestions",
  "Book cover designer",
  "45+ languages & RTL support",
];

const FEATURES_PAID = [
  "Unlimited books & chapters",
  "Unlimited words & pages",
  "Full AI suite: Polish, Expand, Continue & Rewrite",
  "Voice dictation & transcription",
  "Version history & auto-snapshots",
  "AI cover generator: front, back & spine",
  "Story Bible: characters, world & plot notes",
  "Writing streaks, calendar & analytics",
  "PDF & EPUB professional export",
  "AI Marketplace: editing, proofreading & marketing kits",
  "Community library publishing & ARC distribution",
  "45+ languages & full RTL support",
  "Priority support",
];

const FAQ = [
  ["Can I cancel anytime?", "Yes — cancel from your account settings or billing portal at any time. You keep access until the end of your billing period."],
  ["What payment methods are accepted?", "Credit/debit cards, Apple Pay, and Google Pay via Stripe — and PayPal is also accepted."],
  ["What happens to my work if I cancel?", "Your books and chapters are always yours. After cancellation you move back to the free plan, but your content is never deleted."],
  ["Is there a student or team discount?", "Reach out to us — we're happy to discuss educational and team pricing."],
];

export default function Pricing() {
  const [billingCycle, setBillingCycle] = useState<"monthly" | "yearly">("yearly");
  const [loading, setLoading] = useState<"monthly" | "yearly" | null>(null);
  const { user } = useAuth();
  const [, navigate] = useLocation();

  async function handleSubscribe(plan: "monthly" | "yearly") {
    if (!user) {
      navigate("/?auth=required");
      return;
    }
    setLoading(plan);
    try {
      const url = await createCheckoutSession(plan);
      if (url) window.location.href = url;
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(null);
    }
  }

  return (
    <Layout isLanding>
      <div className="min-h-screen text-white" style={{ backgroundColor: "#0A0A0A" }}>
        <div className="max-w-4xl mx-auto px-4 pt-10 pb-20">

          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center mb-10"
          >
            <p className="text-zinc-500 text-[10px] font-bold uppercase tracking-[0.22em] mb-3">
              Plotzy Pro
            </p>
            <h1 className="text-5xl md:text-6xl font-bold mb-4 text-white tracking-tight">
              Simple, honest pricing
            </h1>
            <p className="text-zinc-500 text-base max-w-md mx-auto leading-relaxed">
              Start free. Upgrade when you're ready to write without limits.
            </p>
          </motion.div>

          {/* Billing toggle */}
          <div className="flex justify-center mb-8">
            <div
              className="rounded-full p-1 flex gap-1"
              style={{ backgroundColor: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.09)" }}
            >
              <button
                onClick={() => setBillingCycle("monthly")}
                className="px-5 py-2 rounded-full text-sm font-medium transition-all"
                style={
                  billingCycle === "monthly"
                    ? { background: "#EFEFEF", color: "#111111" }
                    : { color: "#555" }
                }
              >
                Monthly
              </button>
              <button
                onClick={() => setBillingCycle("yearly")}
                className="px-5 py-2 rounded-full text-sm font-medium transition-all flex items-center gap-2"
                style={
                  billingCycle === "yearly"
                    ? { background: "#EFEFEF", color: "#111111" }
                    : { color: "#555" }
                }
              >
                Yearly
                <span
                  className="text-xs px-2 py-0.5 rounded-full font-semibold"
                  style={
                    billingCycle === "yearly"
                      ? { backgroundColor: "rgba(0,0,0,0.12)", color: "#111111" }
                      : { backgroundColor: "rgba(255,255,255,0.07)", color: "#ccc", border: "1px solid rgba(255,255,255,0.12)" }
                  }
                >
                  Save {SAVE_PCT}%
                </span>
              </button>
            </div>
          </div>

          {/* Plan cards */}
          <div className="grid md:grid-cols-2 gap-5">

            {/* Free Trial */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.08 }}
              className="rounded-2xl p-8 flex flex-col"
              style={{
                backgroundColor: "rgba(255,255,255,0.025)",
                border: "1px solid rgba(255,255,255,0.07)",
              }}
            >
              <div className="mb-6">
                <p className="text-zinc-500 text-[10px] font-bold uppercase tracking-[0.18em] mb-3">Free Trial</p>
                <div className="flex items-end gap-1.5 mb-1">
                  <span className="text-5xl font-bold text-white">$0</span>
                </div>
                <p className="text-zinc-600 text-sm">No credit card needed</p>
              </div>

              <ul className="space-y-3 mb-8 flex-1">
                {FEATURES_FREE.map((f) => (
                  <li key={f} className="flex items-start gap-3 text-sm text-zinc-500">
                    <Check className="w-4 h-4 text-zinc-600 mt-0.5 shrink-0" />
                    {f}
                  </li>
                ))}
              </ul>

              <button
                disabled
                className="w-full py-3 rounded-xl text-sm font-medium cursor-not-allowed"
                style={{ backgroundColor: "rgba(255,255,255,0.03)", color: "#3a3a3a", border: "1px solid rgba(255,255,255,0.05)" }}
              >
                Current plan
              </button>
            </motion.div>

            {/* Pro Plan */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.14 }}
              className="relative rounded-2xl p-8 flex flex-col"
              style={{
                background: "rgba(255,255,255,0.05)",
                border: "1px solid rgba(255,255,255,0.16)",
                boxShadow: "0 0 60px rgba(255,255,255,0.04), inset 0 1px 0 rgba(255,255,255,0.08)",
              }}
            >
              <div className="absolute -top-3.5 left-1/2 -translate-x-1/2">
                <span
                  className="text-xs font-bold px-4 py-1.5 rounded-full flex items-center gap-1.5 whitespace-nowrap"
                  style={{ background: "#EFEFEF", color: "#111111" }}
                >
                  <Star className="w-3 h-3" fill="currentColor" />
                  Most Popular
                </span>
              </div>

              <div className="mb-6">
                <p className="text-[10px] font-bold uppercase tracking-[0.18em] mb-3 text-zinc-400">
                  Pro
                </p>

                {billingCycle === "monthly" ? (
                  <div>
                    <div className="flex items-end gap-1.5 mb-1">
                      <span className="text-5xl font-bold text-white">${MONTHLY_PRICE}</span>
                      <span className="text-zinc-500 mb-1.5 text-sm">/month</span>
                    </div>
                    <p className="text-zinc-600 text-sm">Billed monthly</p>
                  </div>
                ) : (
                  <div>
                    <div className="flex items-end gap-1.5 mb-1">
                      <span className="text-5xl font-bold text-white">${YEARLY_PRICE}</span>
                      <span className="text-zinc-500 mb-1.5 text-sm">/month</span>
                    </div>
                    <p className="text-zinc-600 text-sm">${YEARLY_TOTAL} billed once per year</p>
                  </div>
                )}
              </div>

              <ul className="space-y-3 mb-8 flex-1">
                {FEATURES_PAID.map((f) => (
                  <li key={f} className="flex items-start gap-3 text-sm text-zinc-200">
                    <Check className="w-4 h-4 mt-0.5 shrink-0 text-white" />
                    {f}
                  </li>
                ))}
              </ul>

              <button
                onClick={() => handleSubscribe(billingCycle)}
                disabled={loading !== null}
                className="w-full py-3.5 rounded-xl font-semibold transition-all flex items-center justify-center gap-2 disabled:opacity-60 hover:opacity-90 text-sm"
                style={{ background: "#EFEFEF", color: "#111111" }}
              >
                {loading === billingCycle ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Zap className="w-4 h-4" fill="currentColor" />
                )}
                {loading === billingCycle ? "Redirecting…" : "Pay with card"}
              </button>

              {/* PayPal button — shown only when PayPal is configured */}
              <div className="mt-3">
                <div className="flex items-center gap-3 mb-3">
                  <div className="flex-1 h-px" style={{ background: "rgba(255,255,255,0.08)" }} />
                  <span className="text-xs text-zinc-600">or</span>
                  <div className="flex-1 h-px" style={{ background: "rgba(255,255,255,0.08)" }} />
                </div>
                {user ? (
                  <PayPalCheckout plan={billingCycle} onSuccess={() => navigate("/")} />
                ) : (
                  <button
                    onClick={() => navigate("/?auth=required")}
                    className="w-full py-3 rounded-xl text-sm font-semibold transition-all flex items-center justify-center gap-2 hover:opacity-90"
                    style={{ background: "#FFC439", color: "#003087" }}
                  >
                    <img src="https://www.paypalobjects.com/webstatic/mktg/Logo/pp-logo-100px.png" alt="PayPal" className="h-4 object-contain" />
                    Pay with PayPal
                  </button>
                )}
              </div>

              <p className="text-center text-zinc-600 text-xs mt-3">
                Cancel anytime · Secure checkout
              </p>
            </motion.div>
          </div>

          {/* FAQ */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.28 }}
            className="mt-16"
          >
            <h2 className="text-xl font-bold text-center mb-7 text-white/60 tracking-tight">
              Common questions
            </h2>
            <div className="grid md:grid-cols-2 gap-4 max-w-3xl mx-auto">
              {FAQ.map(([q, a]) => (
                <div
                  key={q}
                  className="rounded-xl p-5"
                  style={{
                    backgroundColor: "rgba(255,255,255,0.025)",
                    border: "1px solid rgba(255,255,255,0.06)",
                  }}
                >
                  <p className="font-semibold text-white mb-2 text-sm">{q}</p>
                  <p className="text-zinc-500 text-sm leading-relaxed">{a}</p>
                </div>
              ))}
            </div>
          </motion.div>

        </div>
      </div>
    </Layout>
  );
}
