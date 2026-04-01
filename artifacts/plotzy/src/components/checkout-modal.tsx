import { X, Check, ShieldCheck, CreditCard } from "lucide-react";
import { useAuth } from "@/contexts/auth-context";
import { useLocation } from "wouter";
import { PayPalCheckout, PayPalPlan } from "@/components/paypal-button";

const KEY_FEATURES = [
  "Unlimited books & chapters",
  "Full AI writing suite",
  "PDF & EPUB professional export",
  "Priority support",
];

interface CheckoutModalProps {
  plan: "monthly" | "yearly";
  onClose: () => void;
}

export function CheckoutModal({ plan, onClose }: CheckoutModalProps) {
  const paypalPlan: PayPalPlan = plan === "monthly" ? "monthly" : "yearly_monthly";
  const price = plan === "yearly" ? 10 : 13;
  const billingNote = plan === "yearly" ? "Billed $10/month · Yearly plan" : "Billed $13/month";
  const { user } = useAuth();
  const [, navigate] = useLocation();

  if (!user) {
    onClose();
    navigate("/?auth=required");
    return null;
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backgroundColor: "rgba(0,0,0,0.8)", backdropFilter: "blur(6px)" }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        className="relative w-full max-w-md rounded-2xl overflow-hidden"
        style={{ background: "#111", border: "1px solid rgba(255,255,255,0.12)" }}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 pb-4" style={{ borderBottom: "1px solid rgba(255,255,255,0.07)" }}>
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-zinc-500 mb-1">Order Summary</p>
            <h2 className="text-lg font-bold text-white">Plotzy Pro · {plan === "yearly" ? "Yearly" : "Monthly"}</h2>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-full transition-colors"
            style={{ background: "rgba(255,255,255,0.06)" }}
          >
            <X className="w-4 h-4 text-zinc-400" />
          </button>
        </div>

        <div className="p-6 space-y-5">
          {/* Price breakdown */}
          <div className="rounded-xl p-4 space-y-2.5" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)" }}>
            <div className="flex justify-between text-sm">
              <span className="text-zinc-400">Plotzy Pro ({plan === "yearly" ? "Yearly" : "Monthly"})</span>
              <span className="text-white font-medium">${price}/mo</span>
            </div>
            <div style={{ height: "1px", background: "rgba(255,255,255,0.07)" }} />
            <div className="flex justify-between">
              <span className="text-white font-semibold">Charged today</span>
              <span className="text-white font-bold text-lg">${price}</span>
            </div>
            <p className="text-zinc-600 text-xs">{billingNote}</p>
          </div>

          {/* Key features */}
          <ul className="space-y-2">
            {KEY_FEATURES.map(f => (
              <li key={f} className="flex items-center gap-2.5 text-sm text-zinc-400">
                <Check className="w-3.5 h-3.5 text-zinc-500 shrink-0" />
                {f}
              </li>
            ))}
          </ul>

          {/* Payment options */}
          <div>
            <p className="text-xs font-semibold text-zinc-500 uppercase tracking-widest mb-3 flex items-center gap-2">
              <CreditCard className="w-3.5 h-3.5" />
              Choose payment method
            </p>
            <PayPalCheckout plan={paypalPlan} onSuccess={onClose} />
          </div>

          {/* Trust badge */}
          <p className="flex items-center justify-center gap-1.5 text-xs text-zinc-600">
            <ShieldCheck className="w-3.5 h-3.5" />
            Secure checkout · Cancel anytime
          </p>
        </div>
      </div>
    </div>
  );
}
