import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Check, ChevronDown, ArrowRight } from "lucide-react";
import { useLocation, Link } from "wouter";
import { useAuth } from "@/contexts/auth-context";
import { Layout } from "@/components/layout";
import { SEO } from "@/components/SEO";
import { getPlanDetails, type PayPalPlan } from "@/lib/checkout-plans";
import { getPricingFaq } from "@/data/faq-data";
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
  "10 AI assists per day (improve, expand, continue)",
  "AI book cover generator",
  "1 published book in Community Library",
  "Basic cover designer",
  "Community library access with likes & comments",
  "Author profile page",
  "Follow authors & direct messaging",
  "Notifications center",
  "Ambient writing sounds",
  "45+ languages & RTL support",
  "No PDF/EPUB export",
  "No Audiobook studio",
  "No AI Marketplace access",
];

const FEATURES_PRO = [
  "50 books, 100 chapters per book",
  "500,000 words",
  "100 AI assists per day (improve, expand, continue, translate)",
  "3 audiobook exports per month",
  "20 published books in Community Library",
  "PDF & EPUB professional export",
  "Audiobook studio with 10 AI voices",
  "AI cover generator (front, back & spine)",
  "AI analysis tools (plot holes, pacing, dialogue, voice)",
  "3 AI Marketplace analyses per month",
  "Version history & auto-snapshots",
  "Story Bible & Research board",
  "Book collaboration (invite co-writers)",
  "Writing streaks, calendar & analytics",
  "Voice dictation & transcription",
];

const FEATURES_PREMIUM = [
  "Everything in Pro, plus:",
  "Unlimited books, chapters & words",
  "200 AI assists per day",
  "10 audiobook exports per month",
  "Unlimited publishing to Community Library",
  "9 AI Marketplace analyses per month",
  "Priority support (< 2 hour response)",
  "Early access to new features",
];

/* ── FAQ ── */
// Local FAQ array removed — the pricing page now reads the
// "Pricing & Subscriptions" category from the single FAQ source of
// truth at src/data/faq-data.ts. See getPricingFaq() in the imports.
// The previous in-file copies were drifting (Apple Pay was listed
// as supported, Free-tier export was claimed, Pro Marketplace
// analyses were attributed when only Premium has them).

type BillingCycle = "monthly" | "yearly";

// ── Tier-aware plan-card button state ──────────────────────────────────────
// Drives the per-card CTA on the Pro and Premium cards based on the user's
// current subscription. The frontend determines what to show; the backend's
// capture-order success path handles whatever plan the user ultimately picks
// (overwrite semantics — see the cycle-restart disclosure below).
type ButtonKind = "get_started" | "current" | "switch" | "upgrade" | "reactivate";
type ButtonState = {
  kind: ButtonKind;
  label: string;
  href: string | null; // null → disabled (current plan)
  showCycleDisclosure: boolean;
};

function getCardButtonState(
  user: { subscriptionPlan?: string | null; subscriptionStatus?: string | null } | null,
  cardPlan: PayPalPlan,
): ButtonState {
  // Logged out → existing behavior (auth gate).
  if (!user) {
    return { kind: "get_started", label: "Get started", href: "/?auth=required", showCycleDisclosure: false };
  }

  const userPlan = user.subscriptionPlan;
  const userStatus = user.subscriptionStatus;
  const isEntitled = userStatus === "active" || userStatus === "canceled";

  // Free / no plan / expired → existing behavior.
  if (!userPlan || !isEntitled) {
    return { kind: "get_started", label: "Get started", href: `/checkout?plan=${cardPlan}`, showCycleDisclosure: false };
  }

  // This is the user's current plan — either current (active) or reactivate (canceled).
  if (userPlan === cardPlan) {
    if (userStatus === "canceled") {
      return { kind: "reactivate", label: "Reactivate →", href: `/checkout?plan=${cardPlan}`, showCycleDisclosure: false };
    }
    return { kind: "current", label: "Current plan", href: null, showCycleDisclosure: false };
  }

  // Different plan — Upgrade if going up in tier rank, otherwise Switch.
  const userPlanDetails = getPlanDetails(userPlan);
  const cardPlanDetails = getPlanDetails(cardPlan);
  if (userPlanDetails && cardPlanDetails) {
    const userRank = userPlanDetails.tier === "premium" ? 2 : 1;
    const cardRank = cardPlanDetails.tier === "premium" ? 2 : 1;
    if (cardRank > userRank) {
      return { kind: "upgrade", label: "Upgrade →", href: `/checkout?plan=${cardPlan}`, showCycleDisclosure: true };
    }
  }
  return { kind: "switch", label: "Switch →", href: `/checkout?plan=${cardPlan}`, showCycleDisclosure: true };
}

function PlanButton({
  state,
  tier,
  navigate,
}: {
  state: ButtonState;
  tier: "pro" | "premium";
  navigate: (path: string) => void;
}) {
  const { kind, label, href, showCycleDisclosure } = state;

  const baseStyle: React.CSSProperties = {
    width: "100%",
    padding: "12px 0",
    borderRadius: 12,
    fontSize: 14,
    fontWeight: 600,
    fontFamily: SF,
    transition: "opacity 0.2s, background 0.2s",
  };

  let style: React.CSSProperties;
  let onEnter: ((e: React.MouseEvent<HTMLButtonElement>) => void) | undefined;
  let onLeave: ((e: React.MouseEvent<HTMLButtonElement>) => void) | undefined;

  if (kind === "current") {
    // Disabled, dimmed — read-only confirmation that this is the user's plan.
    style = {
      ...baseStyle,
      background: "rgba(255,255,255,0.04)",
      color: TS,
      border: `1px solid ${B}`,
      cursor: "default",
    };
  } else if (kind === "reactivate") {
    // Subtle amber tint matches the canceled-status pill on /account/subscription.
    style = {
      ...baseStyle,
      background: "rgba(245,158,11,0.12)",
      color: "#F59E0B",
      border: "1px solid rgba(245,158,11,0.3)",
      cursor: "pointer",
    };
    onEnter = (e) => (e.currentTarget.style.opacity = "0.85");
    onLeave = (e) => (e.currentTarget.style.opacity = "1");
  } else if (tier === "pro") {
    // Original Pro card styling — light primary button on the dark card.
    style = {
      ...baseStyle,
      background: "#efefef",
      color: "#111",
      border: "none",
      cursor: "pointer",
    };
    onEnter = (e) => (e.currentTarget.style.opacity = "0.9");
    onLeave = (e) => (e.currentTarget.style.opacity = "1");
  } else {
    // Original Premium card styling — subtle dark-on-darker.
    style = {
      ...baseStyle,
      background: "rgba(255,255,255,0.08)",
      border: "1px solid rgba(255,255,255,0.12)",
      color: T,
      cursor: "pointer",
    };
    onEnter = (e) => (e.currentTarget.style.background = "rgba(255,255,255,0.14)");
    onLeave = (e) => (e.currentTarget.style.background = "rgba(255,255,255,0.08)");
  }

  return (
    <>
      <button
        type="button"
        onClick={() => { if (href) navigate(href); }}
        disabled={kind === "current"}
        style={style}
        onMouseEnter={onEnter}
        onMouseLeave={onLeave}
      >
        {label}
      </button>
      {showCycleDisclosure && (
        <p style={{
          fontSize: 11,
          color: TD,
          marginTop: 8,
          textAlign: "center",
          lineHeight: 1.4,
        }}>
          Switching restarts the billing period.
        </p>
      )}
    </>
  );
}

export default function Pricing() {
  const [billingCycle, setBillingCycle] = useState<BillingCycle>("monthly");
  const [showFaq, setShowFaq] = useState(false);
  const { user } = useAuth();
  const [, navigate] = useLocation();

  const isYearly = billingCycle === "yearly";

  const proPrice = isYearly ? 79.99 : 8.99;
  const proOriginalPrice = isYearly ? 108.00 : 11.99;
  const proPriceSuffix = isYearly ? "/yr" : "/mo";
  const proLabel = isYearly ? "Billed $79.99 per year" : "Billed $8.99 every month";
  const proPlan: PayPalPlan = isYearly ? "pro_yearly" : "pro_monthly";

  const premiumPrice = isYearly ? 159.99 : 16.99;
  const premiumOriginalPrice = isYearly ? 240.00 : 20.00;
  const premiumPriceSuffix = isYearly ? "/yr" : "/mo";
  const premiumLabel = isYearly ? "Billed $159.99 per year" : "Billed $16.99 every month";
  const premiumPlan: PayPalPlan = isYearly ? "premium_yearly" : "premium_monthly";

  // Tier-aware CTAs: depend on the currently-selected billing cycle so the
  // Pro Monthly card shows "Current plan" only when the user is on Pro
  // Monthly (not Pro Yearly). Switching cycle within the same tier is a
  // "Switch →" (with cycle-restart disclosure), not "Current plan".
  const proButton = getCardButtonState(user ?? null, proPlan);
  const premiumButton = getCardButtonState(user ?? null, premiumPlan);

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
      <SEO
        title="Pricing"
        description="Free, Pro, and Premium plans for writers — write, design covers, publish, and produce audiobooks with AI assistance."
      />
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
            className="pricing-cards-row"
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
                <p className="price-big" style={{ fontSize: 48, fontWeight: 700, lineHeight: 1, marginBottom: 4, color: T }}>$0</p>
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
                    <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.2em", color: "#60a5fa", textTransform: "uppercase" }}>
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

                  <div style={{ display: "flex", alignItems: "baseline", gap: 6, marginBottom: 4 }}>
                    {proOriginalPrice && (
                      <span className="price-strikethrough" style={{ fontSize: 22, fontWeight: 600, color: "rgba(255,255,255,0.25)", textDecoration: "line-through" }}>
                        ${proOriginalPrice.toFixed(2)}
                      </span>
                    )}
                    <NumberFlow
                      value={proPrice}
                      prefix="$"
                      className="price-big" style={{ fontSize: 48, fontWeight: 700, lineHeight: 1, color: T }}
                      format={{ minimumFractionDigits: 2, maximumFractionDigits: 2 }}
                    />
                    <span style={{ fontSize: 16, color: TS }}>{proPriceSuffix}</span>
                  </div>

                  {proOriginalPrice && (
                    <p style={{ fontSize: 12, color: "rgba(130,255,130,0.7)", marginTop: 4, marginBottom: 4 }}>
                      Save {Math.round((1 - proPrice / proOriginalPrice) * 100)}% — Limited offer
                    </p>
                  )}
                  {isYearly && (
                    <p style={{ fontSize: 12, color: "rgba(130,255,130,0.7)", marginTop: 4, marginBottom: 4 }}>
                      $6.67/mo — Save 33%
                    </p>
                  )}

                  <p style={{ fontSize: 12, color: TD, marginTop: 4, marginBottom: 16 }}>{proLabel}</p>

                  <div style={{ marginTop: 4 }}>
                    <PlanButton state={proButton} tier="pro" navigate={navigate} />
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
                <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.2em", color: "#c084fc", textTransform: "uppercase", marginBottom: 14 }}>
                  Premium
                </p>

                <div style={{ display: "flex", alignItems: "baseline", gap: 6, marginBottom: 4 }}>
                  {premiumOriginalPrice && (
                    <span className="price-strikethrough" style={{ fontSize: 22, fontWeight: 600, color: "rgba(255,255,255,0.25)", textDecoration: "line-through" }}>
                      ${premiumOriginalPrice.toFixed(2)}
                    </span>
                  )}
                  <NumberFlow
                    value={premiumPrice}
                    prefix="$"
                    className="price-big" style={{ fontSize: 48, fontWeight: 700, lineHeight: 1, color: T }}
                    format={{ minimumFractionDigits: 2, maximumFractionDigits: 2 }}
                  />
                  <span style={{ fontSize: 16, color: TS }}>{premiumPriceSuffix}</span>
                </div>

                {premiumOriginalPrice && (
                  <p style={{ fontSize: 12, color: "rgba(130,255,130,0.7)", marginTop: 4, marginBottom: 4 }}>
                    Save {Math.round((1 - premiumPrice / premiumOriginalPrice) * 100)}% — Limited offer
                  </p>
                )}
                {isYearly && (
                  <p style={{ fontSize: 12, color: "rgba(130,255,130,0.7)", marginTop: 4, marginBottom: 4 }}>
                    $13.33/mo — Save 33%
                  </p>
                )}

                <p style={{ fontSize: 12, color: TD, marginTop: 4, marginBottom: 16 }}>{premiumLabel}</p>

                <div style={{ marginTop: 4 }}>
                  <PlanButton state={premiumButton} tier="premium" navigate={navigate} />
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
                  className="pricing-faq-grid"
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr",
                    gap: 12,
                    marginTop: 16,
                  }}
                >
                  {(getPricingFaq()?.items ?? []).map((item) => (
                    <div
                      key={item.id}
                      style={{
                        borderRadius: 14,
                        padding: "18px 20px",
                        background: C2,
                        border: `1px solid ${B}`,
                      }}
                    >
                      <p style={{ fontWeight: 600, color: T, marginBottom: 8, fontSize: 13.5 }}>{item.question}</p>
                      <p style={{ color: TS, fontSize: 12.5, lineHeight: 1.7, margin: 0 }}>{item.answer}</p>
                    </div>
                  ))}
                </div>

                <div style={{ textAlign: "center", marginTop: 18 }}>
                  <Link
                    href="/faq"
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 5,
                      fontSize: 12,
                      color: TS,
                      textDecoration: "none",
                      fontFamily: SF,
                      fontWeight: 500,
                    }}
                  >
                    See all FAQ
                    <ArrowRight style={{ width: 12, height: 12 }} />
                  </Link>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

        </div>
      </div>
    </Layout>
  );
}
