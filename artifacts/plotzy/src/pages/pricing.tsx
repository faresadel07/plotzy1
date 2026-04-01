import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Check, X, ChevronDown, Zap } from "lucide-react";
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

const FEATURES_PRO_TOP = [
  "Unlimited books & chapters",
  "Unlimited words & pages",
  "Full AI suite: Polish, Expand, Continue & Rewrite",
  "Voice dictation & transcription",
  "Version history & auto-snapshots",
  "AI cover generator: front, back & spine",
  "Story Bible: characters, world & plot notes",
];

const FEATURES_PRO_MORE = [
  "Writing streaks, calendar & analytics",
  "PDF & EPUB professional export",
  "AI Marketplace: editing, proofreading & marketing kits",
  "Community library publishing & ARC distribution",
  "Priority support",
];

const LOCKED_FREE = [
  "Unlimited books & chapters",
  "Full AI suite",
  "Version history",
];

const FAQ = [
  ["Can I cancel anytime?", "Yes — cancel from your account settings at any time. You keep access until the end of your billing period."],
  ["What payment methods are accepted?", "Credit/debit cards, Apple Pay, and PayPal — all handled securely."],
  ["What happens to my work if I cancel?", "Your books are always yours. After cancellation you move back to the free plan, but your content is never deleted."],
  ["Is there a student or team discount?", "Reach out to us — we're happy to discuss educational and team pricing."],
];

type BillingCycle = "monthly" | "yearly";
type YearlyBilling = "monthly" | "annual";

export default function Pricing() {
  const [billingCycle, setBillingCycle] = useState<BillingCycle>("yearly");
  const [yearlyBilling, setYearlyBilling] = useState<YearlyBilling>("monthly");
  const [showMore, setShowMore] = useState(false);
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
        : "Billed $99.99 once · Full year";

  return (
    <Layout isLanding>
      <div style={{ backgroundColor: "#080808", minHeight: "100vh", color: "#fff" }}>
        <div className="max-w-4xl mx-auto px-5" style={{ paddingTop: 40, paddingBottom: 48 }}>

          {/* ── Header ── */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="text-center"
            style={{ marginBottom: 28 }}
          >
            <div
              className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 mb-4"
              style={{ border: "1px solid rgba(255,255,255,0.1)", background: "rgba(255,255,255,0.04)" }}
            >
              <Zap className="w-3 h-3" style={{ color: "#a3a3a3" }} />
              <span style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.08em", color: "#717171", textTransform: "uppercase" }}>
                Plotzy Pro
              </span>
            </div>
            <h1
              className="font-bold tracking-tight"
              style={{ fontSize: "clamp(2rem, 5vw, 3.2rem)", lineHeight: 1.1, marginBottom: 10 }}
            >
              Simple, honest pricing
            </h1>
            <p style={{ color: "#555", fontSize: 14, maxWidth: 340, margin: "0 auto" }}>
              Start free. Upgrade when you're ready to write without limits.
            </p>
          </motion.div>

          {/* ── Billing toggle ── */}
          <div className="flex justify-center" style={{ marginBottom: 28 }}>
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="flex p-1 rounded-full gap-1"
              style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}
            >
              {(["monthly", "yearly"] as BillingCycle[]).map(cycle => (
                <button
                  key={cycle}
                  onClick={() => setBillingCycle(cycle)}
                  className="relative px-5 py-1.5 rounded-full text-sm font-medium transition-colors flex items-center gap-2"
                  style={{ color: billingCycle === cycle ? "#111" : "#4a4a4a" }}
                >
                  {billingCycle === cycle && (
                    <motion.div
                      layoutId="billing-pill"
                      className="absolute inset-0 rounded-full"
                      style={{ background: "#efefef" }}
                      transition={{ type: "spring", stiffness: 400, damping: 35 }}
                    />
                  )}
                  <span className="relative z-10 capitalize">{cycle}</span>
                  {cycle === "yearly" && (
                    <span
                      className="relative z-10 text-[10px] px-2 py-0.5 rounded-full font-bold"
                      style={{
                        background: billingCycle === "yearly" ? "rgba(0,0,0,0.1)" : "rgba(255,255,255,0.06)",
                        color: billingCycle === "yearly" ? "#333" : "#444",
                        border: billingCycle === "yearly" ? "none" : "1px solid rgba(255,255,255,0.1)",
                      }}
                    >
                      Save 23%
                    </span>
                  )}
                </button>
              ))}
            </motion.div>
          </div>

          {/* ── Cards ── */}
          <div className="grid md:grid-cols-2 gap-4 items-start">

            {/* Free */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 }}
              className="rounded-2xl overflow-hidden flex flex-col"
              style={{ background: "rgba(255,255,255,0.025)", border: "1px solid rgba(255,255,255,0.07)" }}
            >
              <div style={{ padding: "24px 24px 20px" }}>
                <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.2em", color: "#444", textTransform: "uppercase", marginBottom: 14 }}>
                  Free Trial
                </p>
                <p className="font-bold" style={{ fontSize: 48, lineHeight: 1, marginBottom: 4, color: "#fff" }}>$0</p>
                <p style={{ fontSize: 13, color: "#3d3d3d", marginBottom: 20 }}>No credit card needed</p>
                <button
                  disabled
                  className="w-full rounded-xl font-medium"
                  style={{
                    padding: "10px 0",
                    fontSize: 13,
                    background: "rgba(255,255,255,0.03)",
                    border: "1px solid rgba(255,255,255,0.06)",
                    color: "#2e2e2e",
                    cursor: "not-allowed",
                  }}
                >
                  Current plan
                </button>
              </div>

              <div style={{ height: 1, background: "rgba(255,255,255,0.06)" }} />

              <div style={{ padding: "20px 24px 24px" }}>
                <p style={{ fontSize: 11, fontWeight: 600, color: "#3a3a3a", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 12 }}>
                  Included
                </p>
                <div className="flex flex-col" style={{ gap: 10 }}>
                  {FEATURES_FREE.map(f => (
                    <div key={f} className="flex items-center" style={{ gap: 10 }}>
                      <div className="flex items-center justify-center rounded-full shrink-0"
                        style={{ width: 20, height: 20, background: "rgba(255,255,255,0.06)" }}>
                        <Check style={{ width: 11, height: 11, color: "#555" }} />
                      </div>
                      <span style={{ fontSize: 13, color: "#4a4a4a" }}>{f}</span>
                    </div>
                  ))}
                </div>

                <div style={{ height: 1, background: "rgba(255,255,255,0.04)", margin: "16px 0" }} />

                <p style={{ fontSize: 11, fontWeight: 600, color: "#2a2a2a", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 12 }}>
                  Not included
                </p>
                <div className="flex flex-col" style={{ gap: 10 }}>
                  {LOCKED_FREE.map(f => (
                    <div key={f} className="flex items-center" style={{ gap: 10 }}>
                      <div className="flex items-center justify-center rounded-full shrink-0"
                        style={{ width: 20, height: 20, background: "rgba(255,255,255,0.03)" }}>
                        <X style={{ width: 11, height: 11, color: "#2d2d2d" }} />
                      </div>
                      <span style={{ fontSize: 13, color: "#2d2d2d" }}>{f}</span>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>

            {/* Pro — gradient border wrapper */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.22 }}
              className="relative"
              style={{ borderRadius: 18, padding: 1.5, background: "linear-gradient(145deg, rgba(255,255,255,0.22) 0%, rgba(255,255,255,0.04) 50%, rgba(255,255,255,0.10) 100%)" }}
            >
              {/* inner card */}
              <div
                className="relative flex flex-col overflow-hidden"
                style={{ borderRadius: 17, background: "#111111" }}
              >
                {/* Radial glow */}
                <div
                  className="absolute inset-0 pointer-events-none"
                  style={{
                    background: "radial-gradient(ellipse at 60% -10%, rgba(255,255,255,0.06) 0%, transparent 60%)",
                  }}
                />

                <div className="relative" style={{ padding: "24px 24px 20px" }}>
                  {/* Header row: label + badge */}
                  <div className="flex items-center justify-between" style={{ marginBottom: 14 }}>
                    <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.2em", color: "#666", textTransform: "uppercase" }}>
                      Pro
                    </p>
                    <span
                      className="flex items-center"
                      style={{
                        fontSize: 10,
                        fontWeight: 700,
                        letterSpacing: "0.06em",
                        color: "#111",
                        background: "#efefef",
                        padding: "4px 10px",
                        borderRadius: 100,
                        gap: 5,
                      }}
                    >
                      ✦ Most Popular
                    </span>
                  </div>

                  {/* Price */}
                  <div className="flex items-end" style={{ gap: 4, marginBottom: 4 }}>
                    <NumberFlow
                      value={proPrice}
                      prefix="$"
                      suffix="/mo"
                      className="font-bold"
                      style={{ fontSize: 48, lineHeight: 1, color: "#fff" }}
                      format={{ minimumFractionDigits: 0, maximumFractionDigits: 0 }}
                    />
                  </div>

                  {/* Yearly billing sub-toggle */}
                  <AnimatePresence>
                    {billingCycle === "yearly" && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        className="overflow-hidden"
                        style={{ marginTop: 12 }}
                      >
                        <div
                          className="flex overflow-hidden"
                          style={{ borderRadius: 12, border: "1px solid rgba(255,255,255,0.09)" }}
                        >
                          {(["monthly", "annual"] as YearlyBilling[]).map(yb => (
                            <button
                              key={yb}
                              onClick={() => setYearlyBilling(yb)}
                              className="flex-1 flex items-center justify-center transition-all"
                              style={{
                                padding: "9px 4px",
                                fontSize: 12,
                                fontWeight: 600,
                                gap: 6,
                                background: yearlyBilling === yb ? "rgba(255,255,255,0.1)" : "transparent",
                                color: yearlyBilling === yb ? "#fff" : "#444",
                              }}
                            >
                              {yb === "monthly" ? "Pay $10/month" : "Pay $99.99/year"}
                              {yb === "annual" && (
                                <span style={{
                                  fontSize: 10, fontWeight: 700, padding: "2px 6px", borderRadius: 99,
                                  background: yearlyBilling === "annual" ? "rgba(255,255,255,0.12)" : "rgba(255,255,255,0.04)",
                                  color: yearlyBilling === "annual" ? "#fff" : "#3a3a3a",
                                }}>Save $20</span>
                              )}
                            </button>
                          ))}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {/* CTA */}
                  <div style={{ marginTop: 16 }}>
                    {user ? (
                      <PayPalCheckout plan={activePlan} onSuccess={() => navigate("/")} />
                    ) : (
                      <button
                        onClick={() => navigate("/?auth=required")}
                        className="w-full rounded-xl font-semibold transition-opacity hover:opacity-90"
                        style={{ padding: "12px 0", fontSize: 14, background: "#efefef", color: "#111" }}
                      >
                        Get started
                      </button>
                    )}
                  </div>

                  {/* Billing label */}
                  <div style={{ height: 20, overflow: "hidden", marginTop: 8 }}>
                    <AnimatePresence mode="wait">
                      <motion.p
                        key={billingLabel}
                        initial={{ y: 12, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        exit={{ y: -12, opacity: 0 }}
                        transition={{ duration: 0.15 }}
                        style={{ textAlign: "center", fontSize: 12, color: "#3a3a3a" }}
                      >
                        {billingLabel}
                      </motion.p>
                    </AnimatePresence>
                  </div>
                </div>

                <div style={{ height: 1, background: "rgba(255,255,255,0.07)" }} />

                <div className="relative" style={{ padding: "20px 24px 24px" }}>
                  <p style={{ fontSize: 11, fontWeight: 600, color: "#555", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 12 }}>
                    Everything in Free, plus
                  </p>
                  <div className="flex flex-col" style={{ gap: 10 }}>
                    {FEATURES_PRO_TOP.map(f => (
                      <div key={f} className="flex items-center" style={{ gap: 10 }}>
                        <div className="flex items-center justify-center rounded-full shrink-0"
                          style={{ width: 20, height: 20, background: "rgba(255,255,255,0.09)" }}>
                          <Check style={{ width: 11, height: 11, color: "#ccc" }} />
                        </div>
                        <span style={{ fontSize: 13, color: "#ccc" }}>{f}</span>
                      </div>
                    ))}
                  </div>

                  {/* Expandable extras */}
                  <AnimatePresence>
                    {showMore && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        className="overflow-hidden"
                      >
                        <div className="flex flex-col" style={{ gap: 10, marginTop: 10 }}>
                          {FEATURES_PRO_MORE.map(f => (
                            <div key={f} className="flex items-center" style={{ gap: 10 }}>
                              <div className="flex items-center justify-center rounded-full shrink-0"
                                style={{ width: 20, height: 20, background: "rgba(255,255,255,0.09)" }}>
                                <Check style={{ width: 11, height: 11, color: "#ccc" }} />
                              </div>
                              <span style={{ fontSize: 13, color: "#ccc" }}>{f}</span>
                            </div>
                          ))}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  <button
                    onClick={() => setShowMore(v => !v)}
                    className="flex items-center transition-colors"
                    style={{ gap: 5, marginTop: 14, fontSize: 12, color: "#444", cursor: "pointer" }}
                    onMouseEnter={e => (e.currentTarget.style.color = "#888")}
                    onMouseLeave={e => (e.currentTarget.style.color = "#444")}
                  >
                    <motion.div animate={{ rotate: showMore ? 180 : 0 }} transition={{ duration: 0.2 }}>
                      <ChevronDown style={{ width: 13, height: 13 }} />
                    </motion.div>
                    {showMore ? "Show less" : `+${FEATURES_PRO_MORE.length} more features`}
                  </button>
                </div>
              </div>
            </motion.div>

          </div>

          {/* ── FAQ ── */}
          <div className="text-center" style={{ marginTop: 28 }}>
            <button
              onClick={() => setShowFaq(v => !v)}
              className="inline-flex items-center transition-colors"
              style={{ gap: 5, fontSize: 12, color: "#333", cursor: "pointer" }}
              onMouseEnter={e => (e.currentTarget.style.color = "#666")}
              onMouseLeave={e => (e.currentTarget.style.color = "#333")}
            >
              <motion.div animate={{ rotate: showFaq ? 180 : 0 }} transition={{ duration: 0.2 }}>
                <ChevronDown style={{ width: 13, height: 13 }} />
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
                <div className="grid md:grid-cols-2 gap-3" style={{ marginTop: 16 }}>
                  {FAQ.map(([q, a]) => (
                    <div key={q} style={{
                      borderRadius: 14, padding: "16px 18px",
                      background: "rgba(255,255,255,0.025)",
                      border: "1px solid rgba(255,255,255,0.06)",
                    }}>
                      <p style={{ fontWeight: 600, color: "#ccc", marginBottom: 6, fontSize: 13 }}>{q}</p>
                      <p style={{ color: "#444", fontSize: 12, lineHeight: 1.7 }}>{a}</p>
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
