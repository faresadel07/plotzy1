import { useEffect } from "react";

type PayPalPlan =
  | "pro_monthly" | "pro_yearly"
  | "premium_monthly" | "premium_yearly"
  | "monthly" | "yearly_monthly" | "yearly_annual";

const VALID_PLANS: PayPalPlan[] = [
  "pro_monthly", "pro_yearly",
  "premium_monthly", "premium_yearly",
  "monthly", "yearly_monthly", "yearly_annual",
];

export default function Checkout() {
  const params = new URLSearchParams(window.location.search);
  const planParam = params.get("plan") as PayPalPlan | null;
  const plan = planParam && VALID_PLANS.includes(planParam)
    ? planParam
    : null;

  useEffect(() => {
    document.title = "Checkout · Plotzy";
  }, []);

  return (
    <div className="min-h-screen bg-black text-white flex items-center justify-center p-6">
      <div className="max-w-md w-full text-center space-y-4">
        <h1 className="text-3xl font-bold">Checkout (stub)</h1>
        <p className="text-white/60">
          Plan from URL: <code className="text-white">{plan ?? "(none / invalid)"}</code>
        </p>
        <p className="text-white/40 text-sm">
          This page will become the Replit-style checkout in upcoming steps.
        </p>
      </div>
    </div>
  );
}
