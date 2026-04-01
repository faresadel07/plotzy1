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
  usePayPalScriptReducer,
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

// ─── Shared helpers ────────────────────────────────────────────────────────
const fieldBox: React.CSSProperties = {
  background: "#1a1a1a",
  border: "1px solid rgba(255,255,255,0.1)",
  borderRadius: "10px",
  height: "46px",
  padding: "0 14px",
  display: "flex",
  alignItems: "center",
};

function useOrderHandlers(plan: PayPalPlan, onSuccess?: () => void) {
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
      toast({ title: "Payment error", description: "Something went wrong. Please try again.", variant: "destructive" });
    }
  };

  const onError = () => {
    toast({ title: "Payment failed", description: "Please check your details and try again.", variant: "destructive" });
  };

  return { createOrder, onApprove, onError };
}

// ─── Submit button (must live inside PayPalCardFieldsProvider) ──────────────
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

// ─── Full dark card form (when PayPal Card Fields are eligible) ─────────────
function DarkCardForm({ plan, onSuccess }: PayPalCheckoutProps) {
  const [submitting, setSubmitting] = useState(false);
  const { createOrder, onApprove, onError } = useOrderHandlers(plan, onSuccess);

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
          "::placeholder": { color: "#555" },
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

// ─── Fallback standard card button (when Card Fields not eligible) ──────────
function StandardCardButton({ plan, onSuccess }: PayPalCheckoutProps) {
  const { createOrder, onApprove, onError } = useOrderHandlers(plan, onSuccess);
  return (
    <PayPalButtons
      fundingSource="card"
      style={{ layout: "horizontal", height: 48, shape: "rect" }}
      createOrder={createOrder}
      onApprove={onApprove}
      onError={onError}
    />
  );
}

// ─── Eligibility-aware card section ────────────────────────────────────────
function CardSection({ plan, onSuccess }: PayPalCheckoutProps) {
  const [{ isResolved }] = usePayPalScriptReducer();
  const [eligible, setEligible] = useState<boolean | null>(null);

  useEffect(() => {
    if (!isResolved) return;
    // Check if PayPal Card Fields API loaded for this merchant account
    const isEligible = !!(window as any).paypal?.CardFields;
    setEligible(isEligible);
  }, [isResolved]);

  if (!isResolved || eligible === null) return null;

  return eligible
    ? <DarkCardForm plan={plan} onSuccess={onSuccess} />
    : <StandardCardButton plan={plan} onSuccess={onSuccess} />;
}

// ─── PayPal + Apple Pay buttons ────────────────────────────────────────────
function PayPalButtonsSection({ plan, onSuccess }: PayPalCheckoutProps) {
  const { createOrder, onApprove, onError } = useOrderHandlers(plan, onSuccess);

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

        <div className="flex items-center gap-3">
          <div className="flex-1 h-px" style={{ background: "rgba(255,255,255,0.08)" }} />
          <span className="text-zinc-600 text-xs">or</span>
          <div className="flex-1 h-px" style={{ background: "rgba(255,255,255,0.08)" }} />
        </div>

        <CardSection plan={plan} onSuccess={onSuccess} />
      </div>
    </PayPalScriptProvider>
  );
}
