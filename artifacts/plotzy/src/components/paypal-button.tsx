import { useEffect, useState } from "react";
import {
  PayPalScriptProvider,
  PayPalButtons,
} from "@paypal/react-paypal-js";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/auth-context";
import { useLocation } from "wouter";

export type PayPalPlan = "monthly" | "yearly_monthly" | "yearly_annual";

interface PayPalCheckoutProps {
  plan: PayPalPlan;
  onSuccess?: () => void;
}

function PayPalButtonsInner({ plan, onSuccess }: PayPalCheckoutProps) {
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
    toast({ title: "Payment cancelled", description: "You can try again anytime.", variant: "destructive" });
  };

  return (
    <div className="space-y-2.5">
      <PayPalButtons
        fundingSource="paypal"
        style={{ layout: "horizontal", color: "gold", height: 48, shape: "rect", label: "pay" }}
        createOrder={createOrder}
        onApprove={onApprove}
        onError={onError}
      />
      <PayPalButtons
        fundingSource="card"
        style={{ layout: "horizontal", height: 48, shape: "rect" }}
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
      components: "buttons,applepay",
      enableFunding: "card",
    }}>
      <PayPalButtonsInner plan={plan} onSuccess={onSuccess} />
    </PayPalScriptProvider>
  );
}
