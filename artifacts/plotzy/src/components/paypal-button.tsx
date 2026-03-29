import { useState, useEffect } from "react";
import { PayPalScriptProvider, PayPalButtons } from "@paypal/react-paypal-js";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/auth-context";

interface PayPalCheckoutProps {
  plan: "monthly" | "yearly";
  onSuccess?: () => void;
}

function PayPalButtonInner({ plan, onSuccess }: PayPalCheckoutProps) {
  const { toast } = useToast();
  const { refetch } = useAuth();

  const createOrder = async () => {
    const res = await fetch("/api/paypal/create-order", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ plan }),
    });
    if (!res.ok) throw new Error("Failed to create PayPal order");
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
      toast({ title: "Payment successful!", description: "Your Plotzy Pro subscription is now active." });
      refetch();
      onSuccess?.();
    } catch {
      toast({ title: "Payment error", description: "Something went wrong capturing the payment.", variant: "destructive" });
    }
  };

  const onError = () => {
    toast({ title: "PayPal error", description: "Payment was cancelled or failed.", variant: "destructive" });
  };

  return (
    <PayPalButtons
      style={{ layout: "horizontal", color: "gold", shape: "rect", label: "pay", height: 44 }}
      createOrder={createOrder}
      onApprove={onApprove}
      onError={onError}
    />
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

  if (loading || !clientId) return null;

  return (
    <PayPalScriptProvider options={{ clientId, currency: "USD", intent: "capture" }}>
      <PayPalButtonInner plan={plan} onSuccess={onSuccess} />
    </PayPalScriptProvider>
  );
}
