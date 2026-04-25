import { useEffect, useState } from "react";
import {
  PayPalScriptProvider,
  PayPalButtons,
} from "@paypal/react-paypal-js";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/auth-context";
import { useLocation } from "wouter";

export type PayPalPlan = "monthly" | "yearly_monthly" | "yearly_annual" | "pro_monthly" | "pro_yearly" | "premium_monthly" | "premium_yearly";

interface PayPalCheckoutProps {
  plan: PayPalPlan;
  onSuccess?: () => void;
}

function PayPalButtonsInner({ plan, onSuccess }: PayPalCheckoutProps) {
  const { toast } = useToast();
  const { refetch, user } = useAuth();
  const [, navigate] = useLocation();
  // Single in-flight guard: PayPal renders two buttons (paypal + card)
  // and the user can hammer either of them. Without this, double-clicks
  // can land two capture-order requests for the same orderID and only
  // the server's idempotency check protects us — feels uneasy. The flag
  // covers the entire create→approve lifecycle so a click during
  // approval is also dropped.
  const [isProcessing, setIsProcessing] = useState(false);

  const createOrder = async () => {
    if (!user) { navigate("/?auth=required"); throw new Error("Not authenticated"); }
    if (isProcessing) throw new Error("Payment already in progress");
    setIsProcessing(true);
    try {
      const res = await fetch("/api/paypal/create-order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan }),
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to create order");
      return (await res.json()).orderId as string;
    } catch (err) {
      // Reset on createOrder failure so the user can retry.
      setIsProcessing(false);
      throw err;
    }
  };

  const onApprove = async (data: { orderID: string }) => {
    try {
      const res = await fetch("/api/paypal/capture-order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId: data.orderID, plan }),
        credentials: "include",
      });
      if (!res.ok) throw new Error("Capture failed");
      toast({ title: "🎉 Welcome to Plotzy Pro!", description: "Your subscription is now active." });
      refetch();
      onSuccess?.();
    } catch {
      toast({ title: "Payment error", description: "Something went wrong. Please try again.", variant: "destructive" });
    } finally {
      setIsProcessing(false);
    }
  };

  const onError = (err: any) => {
    console.error("PayPal error:", err);
    toast({ title: "Payment error", description: "Something went wrong. Please try again.", variant: "destructive" });
    setIsProcessing(false);
  };

  const onCancel = () => {
    toast({ title: "Payment cancelled", description: "You can try again anytime.", variant: "destructive" });
    setIsProcessing(false);
  };

  return (
    <div className="space-y-2.5" style={{ position: "relative" }}>
      <PayPalButtons
        fundingSource="paypal"
        disabled={isProcessing}
        style={{ layout: "horizontal", color: "gold", height: 48, shape: "rect", label: "pay" }}
        createOrder={createOrder}
        onApprove={onApprove}
        onError={onError}
        onCancel={onCancel}
      />
      <PayPalButtons
        fundingSource="card"
        disabled={isProcessing}
        style={{ layout: "horizontal", height: 48, shape: "rect" }}
        createOrder={createOrder}
        onApprove={onApprove}
        onError={onError}
        onCancel={onCancel}
      />
      {isProcessing && (
        // Visible feedback that we're working — without this the UI
        // looks frozen and the user reflexively clicks again.
        <div
          aria-live="polite"
          style={{
            position: "absolute", inset: 0, display: "flex",
            alignItems: "center", justifyContent: "center",
            background: "rgba(0,0,0,0.55)", borderRadius: 8,
            pointerEvents: "none",
          }}
        >
          <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
        </div>
      )}
    </div>
  );
}

export function PayPalCheckout({ plan, onSuccess }: PayPalCheckoutProps) {
  const [clientId, setClientId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/paypal/config")
      .then(r => { if (!r.ok) throw new Error(); return r.json(); })
      .then((d: { enabled: boolean; clientId?: string }) => {
        if (d.enabled && d.clientId) setClientId(d.clientId);
      })
      .catch(() => { setClientId(null); })
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
      components: "buttons,applepay",
      enableFunding: "card",
    }}>
      <PayPalButtonsInner plan={plan} onSuccess={onSuccess} />
    </PayPalScriptProvider>
  );
}
