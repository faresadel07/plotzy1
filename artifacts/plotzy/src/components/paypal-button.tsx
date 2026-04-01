import { useEffect, useState } from "react";
import {
  PayPalScriptProvider,
  PayPalButtons,
  PayPalCardFieldsProvider,
  PayPalNumberField,
  PayPalExpiryField,
  PayPalCVVField,
  PayPalNameField,
  usePayPalCardFields,
} from "@paypal/react-paypal-js";
import { CreditCard } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/auth-context";
import { useLocation } from "wouter";

export type PayPalPlan = "monthly" | "yearly_monthly" | "yearly_annual";

interface PayPalCheckoutProps {
  plan: PayPalPlan;
  onSuccess?: () => void;
}

// ─── Shared field container style ──────────────────────────────────────────
const fieldBox: React.CSSProperties = {
  background: "#1a1a1a",
  border: "1px solid rgba(255,255,255,0.1)",
  borderRadius: "10px",
  height: "46px",
  padding: "0 14px",
  display: "flex",
  alignItems: "center",
};

// ─── Submit button (must be inside PayPalCardFieldsProvider) ───────────────
function CardSubmitButton({ submitting, setSubmitting }: {
  submitting: boolean;
  setSubmitting: (v: boolean) => void;
}) {
  const { cardFieldsForm } = usePayPalCardFields();

  const handleSubmit = async () => {
    if (!cardFieldsForm) return;
    setSubmitting(true);
    try {
      await cardFieldsForm.submit();
    } catch {
      setSubmitting(false);
    }
  };

  return (
    <button
      onClick={handleSubmit}
      disabled={submitting || !cardFieldsForm}
      className="w-full py-3 rounded-xl font-semibold text-sm transition-all disabled:opacity-50"
      style={{ background: "#fff", color: "#111" }}
    >
      {submitting ? "Processing…" : "Pay with Card"}
    </button>
  );
}

// ─── Dark card form ────────────────────────────────────────────────────────
function DarkCardForm({ plan, onSuccess }: PayPalCheckoutProps) {
  const { toast } = useToast();
  const { refetch, user } = useAuth();
  const [, navigate] = useLocation();
  const [submitting, setSubmitting] = useState(false);

  const createOrder = async () => {
    if (!user) { navigate("/?auth=required"); throw new Error("Not authenticated"); }
    const res = await fetch("/api/paypal/create-order", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ plan }),
    });
    if (!res.ok) throw new Error("Failed to create order");
    return (await res.json()).orderId as string;
  };

  const onApprove = async (data: { orderID: string }) => {
    try {
      const res = await fetch("/api/paypal/capture-order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId: data.orderID, plan }),
      });
      if (!res.ok) throw new Error("Capture failed");
      toast({ title: "🎉 Welcome to Plotzy Pro!", description: "Your subscription is now active." });
      refetch();
      onSuccess?.();
    } catch {
      toast({ title: "Payment error", description: "Something went wrong. Please try again.", variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  const onError = () => {
    toast({ title: "Card declined", description: "Please check your card details and try again.", variant: "destructive" });
    setSubmitting(false);
  };

  return (
    <div
      className="space-y-2"
      style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "12px", padding: "14px" }}
    >
      <p className="text-xs font-semibold text-zinc-500 mb-3 flex items-center gap-1.5">
        <CreditCard className="w-3.5 h-3.5" />
        Debit or Credit Card
      </p>

      <PayPalCardFieldsProvider
        createOrder={createOrder}
        onApprove={onApprove}
        onError={onError}
        style={{
          input: {
            color: "#ffffff",
            "font-size": "14px",
            "font-family": "system-ui, -apple-system, sans-serif",
          },
          ".valid": { color: "#ffffff" },
          ".invalid": { color: "#ef4444" },
          "::placeholder": { color: "#666" },
        }}
      >
        <div className="space-y-2">
          <div style={fieldBox}>
            <PayPalNumberField placeholder="Card number" />
          </div>
          <div className="flex gap-2">
            <div style={{ ...fieldBox, flex: 1 }}>
              <PayPalExpiryField placeholder="MM / YY" />
            </div>
            <div style={{ ...fieldBox, flex: 1 }}>
              <PayPalCVVField placeholder="CVV" />
            </div>
          </div>
          <div style={fieldBox}>
            <PayPalNameField placeholder="Cardholder name" />
          </div>
          <CardSubmitButton submitting={submitting} setSubmitting={setSubmitting} />
        </div>
      </PayPalCardFieldsProvider>
    </div>
  );
}

// ─── PayPal + Apple Pay buttons ────────────────────────────────────────────
function PayPalButtonsSection({ plan, onSuccess }: PayPalCheckoutProps) {
  const { toast } = useToast();
  const { refetch, user } = useAuth();
  const [, navigate] = useLocation();

  const createOrder = async () => {
    if (!user) { navigate("/?auth=required"); throw new Error("Not authenticated"); }
    const res = await fetch("/api/paypal/create-order", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ plan }),
    });
    if (!res.ok) throw new Error("Failed to create order");
    return (await res.json()).orderId as string;
  };

  const onApprove = async (data: { orderID: string }) => {
    try {
      const res = await fetch("/api/paypal/capture-order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId: data.orderID, plan }),
      });
      if (!res.ok) throw new Error("Capture failed");
      toast({ title: "🎉 Welcome to Plotzy Pro!", description: "Your subscription is now active." });
      refetch();
      onSuccess?.();
    } catch {
      toast({ title: "Payment error", description: "Something went wrong.", variant: "destructive" });
    }
  };

  const onError = () => {
    toast({ title: "Payment cancelled", description: "You can try again anytime.", variant: "destructive" });
  };

  return (
    <div className="space-y-2">
      <PayPalButtons
        fundingSource="paypal"
        style={{ layout: "horizontal", color: "gold", height: 48, shape: "rect", label: "pay" }}
        createOrder={createOrder}
        onApprove={onApprove}
        onError={onError}
      />
      <PayPalButtons
        fundingSource="applepay"
        style={{ layout: "horizontal", height: 48, shape: "rect" }}
        createOrder={createOrder}
        onApprove={onApprove}
        onError={onError}
      />
    </div>
  );
}

// ─── Main exported component ───────────────────────────────────────────────
export function PayPalCheckout({ plan, onSuccess }: PayPalCheckoutProps) {
  const [clientId, setClientId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/paypal/config")
      .then(r => r.json())
      .then((d: { enabled: boolean; clientId?: string }) => {
        if (d.enabled && d.clientId) setClientId(d.clientId);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex justify-center py-4">
        <div className="w-5 h-5 border-2 border-white/10 border-t-white/40 rounded-full animate-spin" />
      </div>
    );
  }

  if (!clientId) return null;

  return (
    <PayPalScriptProvider options={{
      clientId,
      currency: "USD",
      intent: "capture",
      components: "buttons,applepay,card-fields",
      enableFunding: "card",
    }}>
      <div className="space-y-3">
        <PayPalButtonsSection plan={plan} onSuccess={onSuccess} />

        {/* Divider */}
        <div className="flex items-center gap-3">
          <div className="flex-1 h-px" style={{ background: "rgba(255,255,255,0.08)" }} />
          <span className="text-zinc-600 text-xs">or</span>
          <div className="flex-1 h-px" style={{ background: "rgba(255,255,255,0.08)" }} />
        </div>

        <DarkCardForm plan={plan} onSuccess={onSuccess} />
      </div>
    </PayPalScriptProvider>
  );
}
