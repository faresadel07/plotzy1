import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Check, ChevronDown } from "lucide-react";
import { useLocation } from "wouter";
import { useAuth } from "@/contexts/auth-context";
import { Layout } from "@/components/layout";
import { PayPalCheckout, PayPalPlan } from "@/components/paypal-button";
import NumberFlow from "@number-flow/react";

/* ── Design tokens ── */
const SF = "-apple-system,BlinkMacSystemFont,'SF Pro Text','Helvetica Neue',sans-serif";
const BG = "#000";
const C2 = "#111";
const C3 = "#1a1a1a";
const B = "rgba(255,255,255,0.07)";
const T = "#fff";
const TS = "rgba(255,255,255,0.55)";
const TD = "rgba(255,255,255,0.25)";

/* ── Feature lists ── */
const FEATURES_FREE = [
  "2 books, 3 chapters per book",
  "5,000 words total",
  "5 AI assists per day",
  "1 published book",
  "Basic cover designer",
  "Community library access",
  "Ambient sounds",
];

const FEATURES_PRO = [
  "50 books, 100 chapters per book",
  "500,000 words",
  "100 AI assists per day",
  "20 published books",
  "PDF & EPUB export",
  "Audiobook studio",
  "AI analysis tools (plot holes, pacing, voice)",
  "Version history",
  "Marketplace access",
];

const FEATURES_PREMIUM = [
  "Everything in Pro",
  "Unlimited books, chapters & words",
  "Unlimited AI assists",
  "Unlimited publishing",
  "Priority support",
  "Early access to new features",
];

/* ── FAQ ── */
const FAQ = [
  ["Can I cancel anytime?", "Yes — cancel from your account settings at any time. You keep access until the end of your billing period."],
  ["What payment methods are accepted?", "Credit/debit cards, Apple Pay, and PayPal — all handled securely."],
  ["What happens to my work if I cancel?", "Your books are always yours. After cancellation you move back to the free plan, but your content is never deleted."],
  ["Is there a student or team discount?", "Reach out to us — we're happy to discuss educational and team pricing."],
];

type BillingCycle = "monthly" | "yearly";

export default function Pricing() {
  const [billingCycle, setBillingCycle] = useState<BillingCycle>("yearly");
  const [showFaq, setShowFaq] = useState(false);
  const { user } = useAuth();
  const [, navigate] = useLocation();

  const isYearly = billingCycle === "yearly";

  const proPrice = isYearly ? 79.99 : 9.99;
  const proPriceSuffix = isYearly ? "/yr" : "/mo";
  const proLabel = isYearly ? "Billed $79.99 per year" : "Billed $9.99 every month";
  const proPlan: PayPalPlan = isYearly ? "pro_yearly" : "pro_monthly";

  const premiumPrice = isYearly ? 159.99 : 19.99;
  const premiumPriceSuffix = isYearly ? "/yr" : "/mo";
  const premiumLabel = isYearly ? "Billed $159.99 per year" : "Billed $19.99 every month";
  const premiumPlan: PayPalPlan = isYearly ? "premium_yearly" : "premium_monthly";

  /* ── Shared styles ── */
  const cardBase: React.CSSProperties = {
    fontFamily: SF,
    background: C2,
    border: `1px solid ${B}`,
    borderRadius: 18,
    display: "flex",
    flexDirection: "column",
    overflow: "hidden",
  };

  const checkIcon = (highlight: boolean) => (
    <div
      style={{
        width: 20,
        height: 20,
        borderRadius: "50%",
        background: highlight ? "rgba(255,255,255,0.12)" : "rgba(255,255,255,0.06)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        flexShrink: 0,
      }}
    >
      <Check style={{ width: 11, height: 11, color: highlight ? T : TS }} />
    </div>
  );

  const featureRow = (text: string, highlight: boolean) => (
    <div key={text} style={{ display: "flex", alignItems: "center", gap: 10 }}>
      {checkIcon(highlight)}
      <span style={{ fontSize: 13, color: highlight ? "rgba(255,255,255,0.85)" : TS }}>{text}</span>
    </div>
  );

  return (
    <Layout isLanding darkNav>
      <div style={{ backgroundColor: BG, minHeight: "100vh", color: T, fontFamily: SF }}>
        <div style={{ maxWidth: 1100, margin: "0 auto", padding: "40px 20px 48px" }}>

          {/* ── Header ── */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            style={{ textAlign: "center", marginBottom: 28 }}
          >
            <h1 style={{ fontSize: "clamp(2rem, 5vw, 3.2rem)", fontWeight: 700, lineHeight: 1.1, marginBottom: 10, letterSpacing: "-0.02em" }}>
              Simple, honest pricing
            </h1>
            <p style={{ color: TS, fontSize: 14, maxWidth: 380, margin: "0 auto" }}>
              Start free. Upgrade when you're ready to write without limits.
            </p>
          </motion.div>

          {/* ── Billing toggle ── */}
          <div style={{ display: "flex", justifyContent: "center", marginBottom: 32 }}>
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              style={{
                display: "flex",
                padding: 4,
                borderRadius: 100,
                gap: 4,
                background: "rgba(255,255,255,0.04)",
                border: `1px solid rgba(255,255,255,0.08)`,
              }}
            >
              {(["monthly", "yearly"] as BillingCycle[]).map(cycle => (
                <button
                  key={cycle}
                  onClick={() => setBillingCycle(cycle)}
                  style={{
                    position: "relative",
                    padding: "8px 20px",
                    borderRadius: 100,
                    fontSize: 13,
                    fontWeight: 600,
                    fontFamily: SF,
                    color: billingCycle === cycle ? "#111" : TS,
                    background: billingCycle === cycle ? "#efefef" : "transparent",
                    border: "none",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    transition: "color 0.2s",
                  }}
                >
                  <span style={{ textTransform: "capitalize" }}>{cycle}</span>
                  {cycle === "yearly" && (
                    <span
                      style={{
                        fontSize: 10,
                        fontWeight: 700,
                        padding: "2px 8px",
                        borderRadius: 100,
                        background: billingCycle === "yearly" ? "rgba(0,0,0,0.12)" : "rgba(255,255,255,0.06)",
                        color: billingCycle === "yearly" ? "#333" : TS,
                      }}
                    >
                      Save 33%
                    </span>
                  )}
                </button>
              ))}
            </motion.div>
          </div>

          {/* ── Cards grid ── */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
              gap: 16,
              alignItems: "start",
            }}
          >

            {/* ── Free ── */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 }}
              style={cardBase}
            >
              <div style={{ padding: "24px 24px 20px" }}>
                <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.2em", color: TD, textTransform: "uppercase", marginBottom: 14 }}>
                  Free
                </p>
                <p style={{ fontSize: 48, fontWeight: 700, lineHeight: 1, marginBottom: 4, color: T }}>$0</p>
                <p style={{ fontSize: 13, color: TD, marginBottom: 20 }}>No credit card needed</p>
                <button
                  onClick={() => navigate("/")}
                  style={{
                    width: "100%",
                    padding: "12px 0",
                    borderRadius: 12,
                    fontSize: 14,
                    fontWeight: 600,
                    fontFamily: SF,
                    background: "rgba(255,255,255,0.06)",
                    border: `1px solid ${B}`,
                    color: TS,
                    cursor: "pointer",
                    transition: "background 0.2s",
                  }}
                  onMouseEnter={e => (e.currentTarget.style.background = "rgba(255,255,255,0.1)")}
                  onMouseLeave={e => (e.currentTarget.style.background = "rgba(255,255,255,0.06)")}
                >
                  Get Started
                </button>
              </div>

              <div style={{ height: 1, background: B }} />

              <div style={{ padding: "20px 24px 24px" }}>
                <p style={{ fontSize: 11, fontWeight: 600, color: TD, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 12 }}>
                  Included
                </p>
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  {FEATURES_FREE.map(f => featureRow(f, false))}
                </div>
              </div>
            </motion.div>

            {/* ── Pro (Most Popular) ── */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.22 }}
              style={{
                borderRadius: 18,
                padding: 1.5,
                background: "linear-gradient(145deg, rgba(255,255,255,0.3) 0%, rgba(255,255,255,0.06) 50%, rgba(255,255,255,0.15) 100%)",
              }}
            >
              <div
                style={{
                  ...cardBase,
                  border: "none",
                  borderRadius: 17,
                  position: "relative",
                }}
              >
                {/* Radial glow */}
                <div
                  style={{
                    position: "absolute",
                    inset: 0,
                    pointerEvents: "none",
                    background: "radial-gradient(ellipse at 60% -10%, rgba(255,255,255,0.06) 0%, transparent 60%)",
                    borderRadius: 17,
                  }}
                />

                <div style={{ padding: "24px 24px 20px", position: "relative" }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
                    <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.2em", color: TS, textTransform: "uppercase" }}>
                      Pro
                    </p>
                    <span
                      style={{
                        fontSize: 10,
                        fontWeight: 700,
                        letterSpacing: "0.06em",
                        color: "#111",
                        background: "#efefef",
                        padding: "4px 10px",
                        borderRadius: 100,
                      }}
                    >
                      ✦ Most Popular
                    </span>
                  </div>

                  <div style={{ display: "flex", alignItems: "baseline", gap: 4, marginBottom: 4 }}>
                    <NumberFlow
                      value={proPrice}
                      prefix="$"
                      style={{ fontSize: 48, fontWeight: 700, lineHeight: 1, color: T }}
                      format={{ minimumFractionDigits: 2, maximumFractionDigits: 2 }}
                    />
                    <span style={{ fontSize: 16, color: TS }}>{proPriceSuffix}</span>
                  </div>

                  {isYearly && (
                    <p style={{ fontSize: 12, color: "rgba(130,255,130,0.7)", marginTop: 4, marginBottom: 4 }}>
                      $6.67/mo — Save 33%
                    </p>
                  )}

                  <p style={{ fontSize: 12, color: TD, marginTop: 4, marginBottom: 16 }}>{proLabel}</p>

                  <div style={{ marginTop: 4 }}>
                    {user ? (
                      <PayPalCheckout plan={proPlan} onSuccess={() => navigate("/")} />
                    ) : (
                      <button
                        onClick={() => navigate("/?auth=required")}
                        style={{
                          width: "100%",
                          padding: "12px 0",
                          borderRadius: 12,
                          fontSize: 14,
                          fontWeight: 600,
                          fontFamily: SF,
                          background: "#efefef",
                          color: "#111",
                          border: "none",
                          cursor: "pointer",
                          transition: "opacity 0.2s",
                        }}
                        onMouseEnter={e => (e.currentTarget.style.opacity = "0.9")}
                        onMouseLeave={e => (e.currentTarget.style.opacity = "1")}
                      >
                        Get started
                      </button>
                    )}
                  </div>
                </div>

                <div style={{ height: 1, background: B }} />

                <div style={{ padding: "20px 24px 24px", position: "relative" }}>
                  <p style={{ fontSize: 11, fontWeight: 600, color: TS, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 12 }}>
                    Everything in Free, plus
                  </p>
                  <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                    {FEATURES_PRO.map(f => featureRow(f, true))}
                  </div>
                </div>
              </div>
            </motion.div>

            {/* ── Premium ── */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.29 }}
              style={{
                ...cardBase,
                position: "relative",
                boxShadow: "0 0 40px rgba(255,255,255,0.03), 0 0 80px rgba(255,255,255,0.02)",
              }}
            >
              {/* Subtle glow overlay */}
              <div
                style={{
                  position: "absolute",
                  inset: 0,
                  pointerEvents: "none",
                  borderRadius: 18,
                  background: "radial-gradient(ellipse at 50% -20%, rgba(255,255,255,0.04) 0%, transparent 70%)",
                }}
              />

              <div style={{ padding: "24px 24px 20px", position: "relative" }}>
                <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.2em", color: TD, textTransform: "uppercase", marginBottom: 14 }}>
                  Premium
                </p>

                <div style={{ display: "flex", alignItems: "baseline", gap: 4, marginBottom: 4 }}>
                  <NumberFlow
                    value={premiumPrice}
                    prefix="$"
                    style={{ fontSize: 48, fontWeight: 700, lineHeight: 1, color: T }}
                    format={{ minimumFractionDigits: 2, maximumFractionDigits: 2 }}
                  />
                  <span style={{ fontSize: 16, color: TS }}>{premiumPriceSuffix}</span>
                </div>

                {isYearly && (
                  <p style={{ fontSize: 12, color: "rgba(130,255,130,0.7)", marginTop: 4, marginBottom: 4 }}>
                    $13.33/mo — Save 33%
                  </p>
                )}

                <p style={{ fontSize: 12, color: TD, marginTop: 4, marginBottom: 16 }}>{premiumLabel}</p>

                <div style={{ marginTop: 4 }}>
                  {user ? (
                    <PayPalCheckout plan={premiumPlan} onSuccess={() => navigate("/")} />
                  ) : (
                    <button
                      onClick={() => navigate("/?auth=required")}
                      style={{
                        width: "100%",
                        padding: "12px 0",
                        borderRadius: 12,
                        fontSize: 14,
                        fontWeight: 600,
                        fontFamily: SF,
                        background: "rgba(255,255,255,0.08)",
                        border: `1px solid rgba(255,255,255,0.12)`,
                        color: T,
                        cursor: "pointer",
                        transition: "background 0.2s",
                      }}
                      onMouseEnter={e => (e.currentTarget.style.background = "rgba(255,255,255,0.14)")}
                      onMouseLeave={e => (e.currentTarget.style.background = "rgba(255,255,255,0.08)")}
                    >
                      Get started
                    </button>
                  )}
                </div>
              </div>

              <div style={{ height: 1, background: B }} />

              <div style={{ padding: "20px 24px 24px", position: "relative" }}>
                <p style={{ fontSize: 11, fontWeight: 600, color: TD, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 12 }}>
                  Includes
                </p>
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  {FEATURES_PREMIUM.map(f => featureRow(f, true))}
                </div>
              </div>
            </motion.div>

          </div>

          {/* ── FAQ ── */}
          <div style={{ textAlign: "center", marginTop: 40 }}>
            <button
              onClick={() => setShowFaq(v => !v)}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 5,
                fontSize: 12,
                color: TD,
                cursor: "pointer",
                background: "none",
                border: "none",
                fontFamily: SF,
                transition: "color 0.2s",
              }}
              onMouseEnter={e => (e.currentTarget.style.color = TS)}
              onMouseLeave={e => (e.currentTarget.style.color = TD)}
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
                style={{ overflow: "hidden" }}
              >
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
                    gap: 12,
                    marginTop: 16,
                  }}
                >
                  {FAQ.map(([q, a]) => (
                    <div
                      key={q}
                      style={{
                        borderRadius: 14,
                        padding: "16px 18px",
                        background: C3,
                        border: `1px solid ${B}`,
                      }}
                    >
                      <p style={{ fontWeight: 600, color: "rgba(255,255,255,0.85)", marginBottom: 6, fontSize: 13 }}>{q}</p>
                      <p style={{ color: TS, fontSize: 12, lineHeight: 1.7 }}>{a}</p>
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
