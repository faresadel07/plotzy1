import { useState } from "react";
import { motion } from "framer-motion";
import { Check, Zap, Star, ArrowLeft, Loader2 } from "lucide-react";
import { Link, useLocation } from "wouter";
import { createCheckoutSession } from "@/hooks/use-subscription";
import { useAuth } from "@/contexts/auth-context";
import { Layout } from "@/components/layout";

const FEATURES_FREE = [
  "1 chapter to try the experience",
  "Up to 3,750 words (15 pages)",
  "AI writing suggestions",
  "All 45+ language support",
  "Book cover designer",
];

const FEATURES_PAID = [
  "Unlimited books & chapters",
  "Unlimited words & pages",
  "AI writing assistance & voice input",
  "All 45+ languages with RTL support",
  "Book cover designer",
  "Story beat planner",
  "World-building lore tracker",
  "PDF & EPUB export",
  "Priority support",
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
    <div
      className="min-h-screen text-white"
      style={{ backgroundColor: "#0A0A0A" }}
    >
      <div className="max-w-5xl mx-auto px-4 py-16">
        {/* Back link */}
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-zinc-500 hover:text-white transition-colors mb-10 text-sm"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Plotzy
        </Link>

        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-12"
        >
          <p className="text-zinc-500 text-xs font-semibold uppercase tracking-[0.2em] mb-4">
            Plotzy Pro
          </p>
          <h1 className="text-4xl md:text-5xl font-bold mb-4 text-white">
            Simple, honest pricing
          </h1>
          <p className="text-zinc-400 text-lg max-w-xl mx-auto">
            Start free — upgrade when you're ready to write without limits.
          </p>
        </motion.div>

        {/* Billing toggle */}
        <div className="flex justify-center mb-10">
          <div
            className="rounded-full p-1 flex gap-1"
            style={{ backgroundColor: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.10)" }}
          >
            <button
              onClick={() => setBillingCycle("monthly")}
              className="px-5 py-2 rounded-full text-sm font-medium transition-all"
              style={
                billingCycle === "monthly"
                  ? { background: "#EFEFEF", color: "#111111" }
                  : { color: "#6b6b6b" }
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
                  : { color: "#6b6b6b" }
              }
            >
              Yearly
              <span
                className="text-xs px-2 py-0.5 rounded-full"
                style={
                  billingCycle === "yearly"
                    ? { backgroundColor: "rgba(0,0,0,0.15)", color: "#111111" }
                    : { backgroundColor: "rgba(255,255,255,0.08)", color: "#EFEFEF", border: "1px solid rgba(255,255,255,0.15)" }
                }
              >
                Save 19%
              </span>
            </button>
          </div>
        </div>

        {/* Plan cards */}
        <div className="grid md:grid-cols-2 gap-6">
          {/* Free Trial */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="rounded-2xl p-8"
            style={{
              backgroundColor: "rgba(255,255,255,0.03)",
              border: "1px solid rgba(255,255,255,0.08)",
            }}
          >
            <div className="mb-6">
              <p className="text-zinc-500 text-xs font-semibold uppercase tracking-[0.15em] mb-3">Free Trial</p>
              <div className="flex items-end gap-2">
                <span className="text-4xl font-bold text-white">$0</span>
              </div>
              <p className="text-zinc-600 text-sm mt-1">No credit card needed</p>
            </div>

            <ul className="space-y-3 mb-8">
              {FEATURES_FREE.map((f) => (
                <li key={f} className="flex items-start gap-3 text-sm text-zinc-400">
                  <Check className="w-4 h-4 text-zinc-500 mt-0.5 shrink-0" />
                  {f}
                </li>
              ))}
            </ul>

            <button
              disabled
              className="w-full py-3 rounded-xl text-sm font-medium cursor-not-allowed"
              style={{ backgroundColor: "rgba(255,255,255,0.04)", color: "#4b4b4b", border: "1px solid rgba(255,255,255,0.06)" }}
            >
              Current plan
            </button>
          </motion.div>

          {/* Pro Plan */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            className="relative rounded-2xl p-8"
            style={{
              background: "rgba(255,255,255,0.04)",
              border: "1px solid rgba(255,255,255,0.18)",
              boxShadow: "0 0 40px rgba(255,255,255,0.03)",
            }}
          >
            <div className="absolute -top-3.5 left-1/2 -translate-x-1/2">
              <span
                className="text-xs font-semibold px-4 py-1.5 rounded-full flex items-center gap-1.5"
                style={{ background: "#EFEFEF", color: "#111111" }}
              >
                <Star className="w-3 h-3" fill="currentColor" />
                Most Popular
              </span>
            </div>

            <div className="mb-6">
              <p className="text-xs font-semibold uppercase tracking-[0.15em] mb-3 text-zinc-300">
                Pro
              </p>
              {billingCycle === "monthly" ? (
                <div>
                  <div className="flex items-end gap-2">
                    <span className="text-4xl font-bold text-white">$8</span>
                    <span className="text-zinc-500 mb-1">/month</span>
                  </div>
                  <p className="text-zinc-600 text-sm mt-1">Billed monthly</p>
                </div>
              ) : (
                <div>
                  <div className="flex items-end gap-2">
                    <span className="text-4xl font-bold text-white">$6.50</span>
                    <span className="text-zinc-500 mb-1">/month</span>
                  </div>
                  <p className="text-zinc-600 text-sm mt-1">$78 billed once per year</p>
                </div>
              )}
            </div>

            <ul className="space-y-3 mb-8">
              {FEATURES_PAID.map((f) => (
                <li key={f} className="flex items-start gap-3 text-sm text-zinc-300">
                  <Check className="w-4 h-4 mt-0.5 shrink-0 text-white" />
                  {f}
                </li>
              ))}
            </ul>

            <button
              onClick={() => handleSubscribe(billingCycle)}
              disabled={loading !== null}
              className="w-full py-3 rounded-xl font-semibold transition-all flex items-center justify-center gap-2 disabled:opacity-60 hover:opacity-90"
              style={{ background: "#EFEFEF", color: "#111111" }}
            >
              {loading === billingCycle ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Zap className="w-4 h-4" fill="currentColor" />
              )}
              {loading === billingCycle ? "Redirecting…" : "Get started"}
            </button>

            <p className="text-center text-zinc-600 text-xs mt-3">
              Cancel anytime · Secure checkout via Stripe
            </p>
          </motion.div>
        </div>

        {/* FAQ */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="mt-20"
        >
          <h2 className="text-2xl font-bold text-center mb-8 text-white/75">
            Common questions
          </h2>
          <div className="grid md:grid-cols-2 gap-5 max-w-3xl mx-auto">
            {[
              ["Can I cancel anytime?", "Yes — cancel from your account settings or billing portal at any time. You keep access until the end of your billing period."],
              ["What payment methods are accepted?", "Credit/debit cards, Apple Pay, and Google Pay are all supported via Stripe's secure checkout."],
              ["What happens to my work if I cancel?", "Your books and chapters are always yours. After cancellation you move back to the free trial, but your content is never deleted."],
              ["Is there a student or team discount?", "Reach out to us — we're happy to discuss educational and team pricing."],
            ].map(([q, a]) => (
              <div
                key={q}
                className="rounded-xl p-5"
                style={{
                  backgroundColor: "rgba(255,255,255,0.03)",
                  border: "1px solid rgba(255,255,255,0.07)",
                }}
              >
                <p className="font-medium text-white mb-2 text-sm">{q}</p>
                <p className="text-zinc-500 text-sm leading-relaxed">{a}</p>
              </div>
            ))}
          </div>
        </motion.div>

        <div className="h-20" />
      </div>
    </div>
    </Layout>
  );
}
