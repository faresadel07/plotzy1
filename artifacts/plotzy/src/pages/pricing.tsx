import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Check, X, Star, ChevronDown } from "lucide-react";
import { useLocation } from "wouter";
import { useAuth } from "@/contexts/auth-context";
import { Layout } from "@/components/layout";
import { PayPalCheckout, PayPalPlan } from "@/components/paypal-button";
import NumberFlow from "@number-flow/react";

const FEATURES_FREE = [
  "1 chapter to start writing",
  "Up to 3,750 words (15 pages)",
  "Inline AI ghost-text suggestions",
  "Book cover designer",
  "45+ languages & RTL support",
];

const FEATURES_PAID_VISIBLE = [
  "Unlimited books & chapters",
  "Unlimited words & pages",
  "Full AI suite: Polish, Expand, Continue & Rewrite",
  "Voice dictation & transcription",
  "Version history & auto-snapshots",
  "AI cover generator: front, back & spine",
  "Story Bible: characters, world & plot notes",
];

const FEATURES_PAID_EXTRA = [
  "Writing streaks, calendar & analytics",
  "PDF & EPUB professional export",
  "AI Marketplace: editing, proofreading & marketing kits",
  "Community library publishing & ARC distribution",
  "45+ languages & full RTL support",
  "Priority support",
];

const LOCKED_ON_FREE = [
  "Unlimited books & chapters",
  "Full AI suite",
  "Version history",
];

const FAQ = [
  ["Can I cancel anytime?", "Yes — cancel from your account settings at any time. You keep access until the end of your billing period."],
  ["What payment methods are accepted?", "Credit/debit cards, Apple Pay, and PayPal — all handled securely."],
  ["What happens to my work if I cancel?", "Your books and chapters are always yours. After cancellation you move back to the free plan, but your content is never deleted."],
  ["Is there a student or team discount?", "Reach out to us — we're happy to discuss educational and team pricing."],
];

type BillingCycle = "monthly" | "yearly";
type YearlyBilling = "monthly" | "annual";

export default function Pricing() {
  const [billingCycle, setBillingCycle] = useState<BillingCycle>("yearly");
  const [yearlyBilling, setYearlyBilling] = useState<YearlyBilling>("monthly");
  const [showExtra, setShowExtra] = useState(false);
  const [showFaq, setShowFaq] = useState(false);
  const { user } = useAuth();
  const [, navigate] = useLocation();

  const activePlan: PayPalPlan =
    billingCycle === "monthly"
      ? "monthly"
      : yearlyBilling === "annual"
        ? "yearly_annual"
        : "yearly_monthly";

  const proPrice = billingCycle === "monthly" ? 13 : 10;
  const billingLabel =
    billingCycle === "monthly"
      ? "Billed $13 every month"
      : yearlyBilling === "monthly"
        ? "Billed $10/month · Cancel anytime"
        : "Billed $99.99 once · Full year access";

  return (
    <Layout isLanding>
      <div className="text-white" style={{ backgroundColor: "#0A0A0A", minHeight: "100vh" }}>
        <div className="max-w-4xl mx-auto px-4" style={{ paddingTop: 32, paddingBottom: 40 }}>

          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center mb-7"
          >
            <p className="text-zinc-500 text-[10px] font-bold uppercase tracking-[0.22em] mb-2">Plotzy Pro</p>
            <h1 className="text-4xl md:text-5xl font-bold mb-2 text-white tracking-tight">
              Simple, honest pricing
            </h1>
            <p className="text-zinc-500 text-sm max-w-sm mx-auto leading-relaxed">
              Start free. Upgrade when you're ready to write without limits.
            </p>
          </motion.div>

          {/* Billing toggle */}
          <div className="flex justify-center mb-6">
            <div
              className="rounded-full p-1 flex gap-1"
              style={{ backgroundColor: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.09)" }}
            >
              <button
                onClick={() => setBillingCycle("monthly")}
                className="px-5 py-1.5 rounded-full text-sm font-medium transition-all"
                style={billingCycle === "monthly" ? { background: "#EFEFEF", color: "#111" } : { color: "#555" }}
              >
                Monthly
              </button>
              <button
                onClick={() => setBillingCycle("yearly")}
                className="px-5 py-1.5 rounded-full text-sm font-medium transition-all flex items-center gap-2"
                style={billingCycle === "yearly" ? { background: "#EFEFEF", color: "#111" } : { color: "#555" }}
              >
                Yearly
                <span
                  className="text-xs px-2 py-0.5 rounded-full font-semibold"
                  style={
                    billingCycle === "yearly"
                      ? { backgroundColor: "rgba(0,0,0,0.12)", color: "#111" }
                      : { backgroundColor: "rgba(255,255,255,0.07)", color: "#ccc", border: "1px solid rgba(255,255,255,0.12)" }
                  }
                >
                  Save 23%
                </span>
              </button>
            </div>
          </div>

          {/* Cards */}
          <div className="grid md:grid-cols-2 gap-4 items-start">

            {/* Free Trial */}
            <motion.div
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.06 }}
              className="rounded-2xl flex flex-col overflow-hidden"
              style={{ backgroundColor: "rgba(255,255,255,0.025)", border: "1px solid rgba(255,255,255,0.07)" }}
            >
              <div className="p-6">
                <p className="text-zinc-500 text-[10px] font-bold uppercase tracking-[0.18em] mb-3">Free Trial</p>
                <div className="flex items-end gap-1.5 mb-1">
                  <span className="text-5xl font-bold text-white">$0</span>
                </div>
                <p className="text-zinc-600 text-sm mb-5">No credit card needed</p>
                <button
                  disabled
                  className="w-full py-2.5 rounded-xl text-sm font-medium cursor-not-allowed"
                  style={{ backgroundColor: "rgba(255,255,255,0.03)", color: "#3a3a3a", border: "1px solid rgba(255,255,255,0.05)" }}
                >
                  Current plan
                </button>
              </div>

              <div style={{ height: 1, background: "rgba(255,255,255,0.06)" }} />

              <div className="p-6 flex flex-col gap-2.5">
                <p className="text-xs text-zinc-500 font-medium mb-1">What's included:</p>
                {FEATURES_FREE.map(f => (
                  <div key={f} className="flex items-center gap-2.5">
                    <div className="w-5 h-5 rounded-full flex items-center justify-center shrink-0"
                      style={{ background: "rgba(255,255,255,0.06)" }}>
                      <Check className="w-3 h-3 text-zinc-400" />
                    </div>
                    <span className="text-sm text-zinc-400">{f}</span>
                  </div>
                ))}

                <div style={{ height: 1, background: "rgba(255,255,255,0.05)", margin: "4px 0" }} />
                <p className="text-xs text-zinc-600 font-medium mb-1">Not included:</p>
                {LOCKED_ON_FREE.map(f => (
                  <div key={f} className="flex items-center gap-2.5">
                    <div className="w-5 h-5 rounded-full flex items-center justify-center shrink-0"
                      style={{ background: "rgba(255,0,0,0.06)" }}>
                      <X className="w-3 h-3 text-zinc-700" />
                    </div>
                    <span className="text-sm text-zinc-700">{f}</span>
                  </div>
                ))}
              </div>
            </motion.div>

            {/* Pro Plan */}
            <motion.div
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.12 }}
              className="relative rounded-2xl flex flex-col overflow-hidden"
              style={{
                background: "rgba(255,255,255,0.05)",
                border: "1px solid rgba(255,255,255,0.14)",
              }}
            >
              {/* Glow */}
              <div
                className="absolute inset-0 pointer-events-none"
                style={{
                  background: "radial-gradient(ellipse at 50% 0%, rgba(255,255,255,0.06) 0%, transparent 65%)",
                  zIndex: 0,
                }}
              />

              {/* Most Popular */}
              <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 z-10">
                <span
                  className="text-xs font-bold px-4 py-1.5 rounded-full flex items-center gap-1.5 whitespace-nowrap"
                  style={{ background: "#EFEFEF", color: "#111" }}
                >
                  <Star className="w-3 h-3" fill="currentColor" />
                  Most Popular
                </span>
              </div>

              <div className="p-6 pt-9 relative z-10">
                <p className="text-[10px] font-bold uppercase tracking-[0.18em] mb-3 text-zinc-400">Pro</p>

                <div className="flex items-end gap-1.5 mb-1">
                  <NumberFlow
                    value={proPrice}
                    prefix="$"
                    suffix="/mo"
                    className="text-5xl font-bold text-white"
                    format={{ minimumFractionDigits: 0, maximumFractionDigits: 0 }}
                  />
                </div>

                {/* Yearly sub-toggle */}
                <AnimatePresence>
                  {billingCycle === "yearly" && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      className="overflow-hidden mt-3"
                    >
                      <div className="flex rounded-xl overflow-hidden" style={{ border: "1px solid rgba(255,255,255,0.1)" }}>
                        <button
                          onClick={() => setYearlyBilling("monthly")}
                          className="flex-1 py-2 text-xs font-semibold transition-all"
                          style={yearlyBilling === "monthly"
                            ? { background: "rgba(255,255,255,0.12)", color: "#fff" }
                            : { background: "transparent", color: "#666" }}
                        >Pay $10/month</button>
                        <button
                          onClick={() => setYearlyBilling("annual")}
                          className="flex-1 py-2 text-xs font-semibold transition-all flex items-center justify-center gap-1.5"
                          style={yearlyBilling === "annual"
                            ? { background: "rgba(255,255,255,0.12)", color: "#fff" }
                            : { background: "transparent", color: "#666" }}
                        >
                          Pay $99.99/year
                          <span className="text-[10px] px-1.5 py-0.5 rounded-full font-bold"
                            style={{
                              background: yearlyBilling === "annual" ? "rgba(255,255,255,0.15)" : "rgba(255,255,255,0.06)",
                              color: yearlyBilling === "annual" ? "#fff" : "#555",
                            }}>Save $20</span>
                        </button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                <div className="mt-4">
                  {user ? (
                    <PayPalCheckout plan={activePlan} onSuccess={() => navigate("/")} />
                  ) : (
                    <button
                      onClick={() => navigate("/?auth=required")}
                      className="w-full py-3 rounded-xl font-semibold transition-all hover:opacity-90 text-sm"
                      style={{ background: "#EFEFEF", color: "#111" }}
                    >
                      Get started
                    </button>
                  )}
                </div>

                <div className="h-5 overflow-hidden mt-1.5">
                  <AnimatePresence mode="wait">
                    <motion.p
                      key={billingLabel}
                      initial={{ y: 12, opacity: 0 }}
                      animate={{ y: 0, opacity: 1 }}
                      exit={{ y: -12, opacity: 0 }}
                      transition={{ duration: 0.15, ease: "easeOut" }}
                      className="text-center text-zinc-600 text-xs"
                    >
                      {billingLabel}
                    </motion.p>
                  </AnimatePresence>
                </div>
              </div>

              <div style={{ height: 1, background: "rgba(255,255,255,0.08)", position: "relative", zIndex: 10 }} />

              <div className="p-6 relative z-10 flex flex-col gap-2.5">
                <p className="text-xs text-zinc-400 font-medium mb-1">Everything in Free, plus:</p>
                {FEATURES_PAID_VISIBLE.map(f => (
                  <div key={f} className="flex items-center gap-2.5">
                    <div className="w-5 h-5 rounded-full flex items-center justify-center shrink-0"
                      style={{ background: "rgba(255,255,255,0.1)" }}>
                      <Check className="w-3 h-3 text-white" />
                    </div>
                    <span className="text-sm text-zinc-200">{f}</span>
                  </div>
                ))}

                {/* Expandable extra features */}
                <AnimatePresence>
                  {showExtra && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      className="overflow-hidden flex flex-col gap-2.5"
                    >
                      {FEATURES_PAID_EXTRA.map(f => (
                        <div key={f} className="flex items-center gap-2.5">
                          <div className="w-5 h-5 rounded-full flex items-center justify-center shrink-0"
                            style={{ background: "rgba(255,255,255,0.1)" }}>
                            <Check className="w-3 h-3 text-white" />
                          </div>
                          <span className="text-sm text-zinc-200">{f}</span>
                        </div>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>

                <button
                  onClick={() => setShowExtra(v => !v)}
                  className="flex items-center gap-1.5 text-xs text-zinc-500 hover:text-zinc-300 transition-colors mt-1 w-fit"
                >
                  <motion.div animate={{ rotate: showExtra ? 180 : 0 }} transition={{ duration: 0.2 }}>
                    <ChevronDown className="w-3.5 h-3.5" />
                  </motion.div>
                  {showExtra ? "Show less" : `+${FEATURES_PAID_EXTRA.length} more features`}
                </button>
              </div>
            </motion.div>

          </div>

          {/* FAQ */}
          <div className="mt-6 text-center">
            <button
              onClick={() => setShowFaq(v => !v)}
              className="flex items-center gap-1.5 text-zinc-500 text-xs hover:text-zinc-300 transition-colors mx-auto"
            >
              <motion.div animate={{ rotate: showFaq ? 180 : 0 }} transition={{ duration: 0.2 }}>
                <ChevronDown className="w-3.5 h-3.5" />
              </motion.div>
              Common questions
            </button>
          </div>

          <AnimatePresence>
            {showFaq && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="overflow-hidden"
              >
                <div className="grid md:grid-cols-2 gap-3 mt-4">
                  {FAQ.map(([q, a]) => (
                    <div key={q} className="rounded-xl p-4"
                      style={{ backgroundColor: "rgba(255,255,255,0.025)", border: "1px solid rgba(255,255,255,0.06)" }}>
                      <p className="font-semibold text-white mb-1.5 text-sm">{q}</p>
                      <p className="text-zinc-500 text-xs leading-relaxed">{a}</p>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

        </div>
      </div>
    </Layout>
  );
}
