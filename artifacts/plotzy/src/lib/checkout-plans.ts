// Source of truth for the set of plan IDs recognized by the PayPal layer.
// Mirror of paypalPlanSchema in artifacts/api-server/src/routes/payments.routes.ts.
// Legacy "monthly" / "yearly_monthly" / "yearly_annual" remain accepted by
// the backend for older subscriptions but new flows use pro_*/premium_*.
export type PayPalPlan =
  | "monthly"
  | "yearly_monthly"
  | "yearly_annual"
  | "pro_monthly"
  | "pro_yearly"
  | "premium_monthly"
  | "premium_yearly";

export type PlanTier = "pro" | "premium";
export type BillingCycle = "monthly" | "yearly";

export interface PlanDetails {
  id: PayPalPlan;
  tier: PlanTier;
  cycle: BillingCycle;
  displayName: string;
  tierLabel: string;
  cycleLabel: string;
  priceUsd: number;
  priceCents: number;
  unitLabel: string;
  features: string[];
  accentColor: string;
}

// IMPORTANT: PRO_FEATURES and PREMIUM_FEATURES MUST stay in sync
// with FEATURES_PRO and FEATURES_PREMIUM in pages/pricing.tsx.
// If you add or remove a feature here, update pricing.tsx as well.
// Related: data/faq-data.ts may also reference these features.
//
// The pricing page uses richer items (FeatureItem objects with captions
// for the AI-quota disclaimer); the checkout summary intentionally keeps
// just the main lines as plain strings — users at checkout have already
// seen the full pricing page.
const PRO_FEATURES = [
  "100 AI requests per day",
  "3 AI Marketplace analyses per month",
  "No chapter limits",
  "No word limits",
  "No publishing limits on Community Library",
];

const PREMIUM_FEATURES = [
  "200 AI requests per day",
  "9 AI Marketplace analyses per month",
  "No book, chapter, or word limits",
  "No limits on Community Library publishing",
];

const PRO_ACCENT = "#3B82F6";
const PREMIUM_ACCENT = "#A855F7";

export const PLAN_DETAILS: Record<string, PlanDetails> = {
  pro_monthly: {
    id: "pro_monthly",
    tier: "pro",
    cycle: "monthly",
    displayName: "Plotzy Pro",
    tierLabel: "PRO",
    cycleLabel: "Billed monthly",
    priceUsd: 8.99,
    priceCents: 899,
    unitLabel: "per month",
    features: PRO_FEATURES,
    accentColor: PRO_ACCENT,
  },
  pro_yearly: {
    id: "pro_yearly",
    tier: "pro",
    cycle: "yearly",
    displayName: "Plotzy Pro",
    tierLabel: "PRO",
    cycleLabel: "Billed yearly",
    priceUsd: 79.99,
    priceCents: 7999,
    unitLabel: "per year",
    features: PRO_FEATURES,
    accentColor: PRO_ACCENT,
  },
  premium_monthly: {
    id: "premium_monthly",
    tier: "premium",
    cycle: "monthly",
    displayName: "Plotzy Premium",
    tierLabel: "PREMIUM",
    cycleLabel: "Billed monthly",
    priceUsd: 16.99,
    priceCents: 1699,
    unitLabel: "per month",
    features: PREMIUM_FEATURES,
    accentColor: PREMIUM_ACCENT,
  },
  premium_yearly: {
    id: "premium_yearly",
    tier: "premium",
    cycle: "yearly",
    displayName: "Plotzy Premium",
    tierLabel: "PREMIUM",
    cycleLabel: "Billed yearly",
    priceUsd: 159.99,
    priceCents: 15999,
    unitLabel: "per year",
    features: PREMIUM_FEATURES,
    accentColor: PREMIUM_ACCENT,
  },
};

export function getPlanDetails(plan: string | null): PlanDetails | null {
  if (!plan) return null;
  return PLAN_DETAILS[plan] ?? null;
}
