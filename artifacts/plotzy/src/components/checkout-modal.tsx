import { useEffect, useState } from "react";
import { X, Check, ShieldCheck, CreditCard } from "lucide-react";
import { PayPalScriptProvider, PayPalButtons } from "@paypal/react-paypal-js";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/auth-context";
import { useLocation } from "wouter";

const MONTHLY_PRICE = 12.99;
const YEARLY_PRICE = 9.99;
const YEARLY_TOTAL = (YEARLY_PRICE * 12).toFixed(2);

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

function PayPalSection({ plan, onClose }: { plan: "monthly" | "yearly"; onClose: () => void }) {
  const { toast } = useToast();
  const { refetch } = useAuth();
  const [, navigate] = useLocation();
  const [clientId, setClientId] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/paypal/config")
      .then(r => r.json())
      .then((d: { enabled: boolean; clientId?: string }) => {
        if (d.enabled && d.clientId) setClientId(d.clientId);
      })
      .catch(() => {});
  }, []);

  const createOrder = async () => {
    const res = await fetch("/api/paypal/create-order", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ plan }),
    });
    if (!res.ok) throw new Error("Failed to create order");
    const data = await res.json();
    return data.orderId as string;
  };

  const onApprove = async (data: { orderID: string }) => {
    try {
      const res = await fetch("/api/paypal/capture-order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId: data.orderID, plan }),
      });
      if (!res.ok) throw new Error("Capture failed");
      toast({
        title: "🎉 Welcome to Plotzy Pro!",
        description: "Your subscription is now active. Start writing without limits.",
      });
      refetch();
      onClose();
      navigate("/");
    } catch {
      toast({ title: "Payment error", description: "Something went wrong. Please try again.", variant: "destructive" });
    }
  };

  if (!clientId) {
    return (
      <div className="flex items-center justify-center py-6">
        <div className="w-5 h-5 border-2 border-white/20 border-t-white/60 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <PayPalScriptProvider options={{
      clientId,
      currency: "USD",
      intent: "capture",
      components: "buttons",
      enableFunding: "card",
    }}>
      <div className="space-y-2.5">
        {/* PayPal */}
        <PayPalButtons
          fundingSource="paypal"
          style={{ layout: "horizontal", color: "gold", height: 48, shape: "rect", label: "pay" }}
          createOrder={createOrder}
          onApprove={onApprove}
        />
        {/* Debit / Credit Card */}
        <PayPalButtons
          fundingSource="card"
          style={{ layout: "horizontal", height: 48, shape: "rect" }}
          createOrder={createOrder}
          onApprove={onApprove}
        />
      </div>
    </PayPalScriptProvider>
  );
}

export function CheckoutModal({ plan, onClose }: CheckoutModalProps) {
  const price = plan === "yearly" ? YEARLY_PRICE : MONTHLY_PRICE;
  const total = plan === "yearly" ? YEARLY_TOTAL : MONTHLY_PRICE.toFixed(2);
  const { user } = useAuth();
  const [, navigate] = useLocation();

  // Redirect to login if not authenticated
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
              <span className="text-zinc-400">Plotzy Pro ({plan === "yearly" ? "Annual" : "Monthly"})</span>
              <span className="text-white font-medium">${price}/mo</span>
            </div>
            {plan === "yearly" && (
              <div className="flex justify-between text-sm">
                <span className="text-zinc-400">Billed annually</span>
                <span className="text-zinc-300">${total}/yr</span>
              </div>
            )}
            <div style={{ height: "1px", background: "rgba(255,255,255,0.07)" }} />
            <div className="flex justify-between">
              <span className="text-white font-semibold">Total today</span>
              <span className="text-white font-bold text-lg">${total}</span>
            </div>
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
            <PayPalSection plan={plan} onClose={onClose} />
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
