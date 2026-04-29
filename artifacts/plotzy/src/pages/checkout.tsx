import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import {
  PayPalScriptProvider,
  PayPalButtons,
} from "@paypal/react-paypal-js";
import {
  AlertCircle,
  Check,
  CheckCircle2,
  ChevronRight,
  CreditCard,
  Lock,
} from "lucide-react";
import { useAuth } from "@/contexts/auth-context";
import { getPlanDetails, type PlanDetails } from "@/lib/checkout-plans";

const SF = "-apple-system,BlinkMacSystemFont,'SF Pro Text','Helvetica Neue',sans-serif";
const BG = "#000";
const C2 = "#111";
const C3 = "#1a1a1a";
const B = "rgba(255,255,255,0.07)";
const T = "#fff";
const TS = "rgba(255,255,255,0.55)";
const TD = "rgba(255,255,255,0.25)";
const SUCCESS = "#10B981";
const ERROR = "#EF4444";

type PaymentMethod = "card" | "paypal";
type CheckoutStatus = "form" | "success";

export default function Checkout() {
  const params = new URLSearchParams(window.location.search);
  const planParam = params.get("plan");
  const plan = getPlanDetails(planParam);

  useEffect(() => {
    document.title = plan
      ? `Checkout · ${plan.displayName} · Plotzy`
      : "Checkout · Plotzy";
  }, [plan]);

  if (!plan) return <InvalidPlan />;
  return <CheckoutWithSdk plan={plan} />;
}

function InvalidPlan() {
  const [, navigate] = useLocation();
  return (
    <div
      style={{ background: BG, color: T, fontFamily: SF }}
      className="min-h-screen flex items-center justify-center p-6"
    >
      <div className="max-w-sm w-full text-center space-y-5">
        <h1 className="text-2xl font-bold">Invalid plan</h1>
        <p style={{ color: TS }} className="text-sm">
          We couldn't recognize this plan. Please choose one from our pricing page.
        </p>
        <button
          onClick={() => navigate("/pricing")}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg font-medium text-sm"
          style={{ background: T, color: "#000" }}
        >
          Return to pricing
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

function CheckoutWithSdk({ plan }: { plan: PlanDetails }) {
  const [clientId, setClientId] = useState<string | null>(null);
  const [sdkUnavailable, setSdkUnavailable] = useState(false);

  useEffect(() => {
    fetch("/api/paypal/config")
      .then((r) => {
        if (!r.ok) throw new Error("Config unavailable");
        return r.json();
      })
      .then((d: { enabled: boolean; clientId?: string }) => {
        if (d.enabled && d.clientId) setClientId(d.clientId);
        else setSdkUnavailable(true);
      })
      .catch(() => setSdkUnavailable(true));
  }, []);

  if (sdkUnavailable) {
    return (
      <Frame>
        <CenterBlock>
          <h1 className="text-2xl font-bold">Payments are temporarily unavailable</h1>
          <p style={{ color: TS }} className="text-sm">
            Please try again in a few minutes.
          </p>
        </CenterBlock>
      </Frame>
    );
  }

  if (!clientId) {
    return (
      <Frame>
        <CenterBlock>
          <Spinner />
          <p style={{ color: TS }} className="text-sm">
            Loading checkout…
          </p>
        </CenterBlock>
      </Frame>
    );
  }

  return (
    <PayPalScriptProvider
      options={{
        clientId,
        currency: "USD",
        intent: "capture",
        components: "buttons,card-fields,applepay",
      }}
    >
      <CheckoutLayout plan={plan} />
    </PayPalScriptProvider>
  );
}

function CheckoutLayout({ plan }: { plan: PlanDetails }) {
  const { user, refetch } = useAuth();
  const [, navigate] = useLocation();
  const [status, setStatus] = useState<CheckoutStatus>("form");
  const [error, setError] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const createOrder = async () => {
    setError(null);
    if (!user) {
      navigate("/?auth=required");
      throw new Error("Not authenticated");
    }
    setIsProcessing(true);
    try {
      const res = await fetch("/api/paypal/create-order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan: plan.id }),
        credentials: "include",
      });
      if (res.status === 401) {
        navigate("/?auth=required");
        throw new Error("Not authenticated");
      }
      if (res.status === 429) {
        setError("Too many attempts. Please wait a minute and try again.");
        setIsProcessing(false);
        throw new Error("Rate limited");
      }
      if (!res.ok) throw new Error("Failed to create order");
      const data = await res.json();
      return data.orderId as string;
    } catch (err) {
      setIsProcessing(false);
      throw err;
    }
  };

  const onApprove = async (data: { orderID: string }) => {
    try {
      const res = await fetch("/api/paypal/capture-order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId: data.orderID, plan: plan.id }),
        credentials: "include",
      });
      if (!res.ok) {
        setError(
          "Payment couldn't be processed. Please try again or use a different payment method."
        );
        setIsProcessing(false);
        return;
      }
      // Wait for auth context to refresh BEFORE switching to success.
      // Avoids the stuck-loading bug where refetch raced navigation.
      await refetch();
      setIsProcessing(false);
      setStatus("success");
    } catch (err) {
      console.error("Capture failed:", err);
      setError(
        "Payment couldn't be processed. Please try again or use a different payment method."
      );
      setIsProcessing(false);
    }
  };

  const onError = (err: unknown) => {
    console.error("PayPal SDK error:", err);
    setError(
      "Payment couldn't be processed. Please try again or use a different payment method."
    );
    setIsProcessing(false);
  };

  const onCancel = () => {
    setIsProcessing(false);
  };

  return (
    <Frame>
      <header className="mb-10 flex items-center gap-2">
        <span style={{ color: T }} className="text-base font-bold tracking-wide">
          Plotzy
        </span>
        <span style={{ color: TD }} className="text-sm">
          · Checkout
        </span>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-[1.2fr_1fr] gap-10 md:gap-16">
        <OrderSummaryPanel plan={plan} paid={status === "success"} />
        {status === "success" ? (
          <SuccessPanel plan={plan} />
        ) : (
          <PaymentFormPanel
            plan={plan}
            userEmail={user?.email ?? ""}
            error={error}
            isProcessing={isProcessing}
            createOrder={createOrder}
            onApprove={onApprove}
            onError={onError}
            onCancel={onCancel}
          />
        )}
      </div>
    </Frame>
  );
}

function OrderSummaryPanel({
  plan,
  paid,
}: {
  plan: PlanDetails;
  paid: boolean;
}) {
  return (
    <section
      className="rounded-2xl p-7 md:p-8"
      style={{ background: C2, border: `1px solid ${B}` }}
    >
      <div className="flex items-center justify-between mb-3">
        <p
          className="text-xs font-bold uppercase tracking-[0.2em]"
          style={{ color: plan.accentColor }}
        >
          {plan.tierLabel}
        </p>
        {paid && (
          <span
            className="text-[10px] font-bold uppercase tracking-[0.18em] px-2 py-1 rounded-full"
            style={{ background: "rgba(16,185,129,0.15)", color: SUCCESS }}
          >
            Paid
          </span>
        )}
      </div>
      <h2 className="text-3xl font-bold leading-tight">{plan.displayName}</h2>
      <p style={{ color: TS }} className="text-sm mt-1">
        {plan.cycleLabel}
      </p>

      <div className="mt-6 flex items-baseline gap-2">
        <span className="text-5xl font-bold leading-none">
          ${plan.priceUsd.toFixed(2)}
        </span>
        <span style={{ color: TS }} className="text-sm">
          {plan.unitLabel}
        </span>
      </div>

      <Separator />

      <p
        className="text-xs font-semibold uppercase tracking-[0.18em] mb-4"
        style={{ color: TD }}
      >
        What's included
      </p>
      <ul className="space-y-3">
        {plan.features.map((f) => (
          <li key={f} className="flex items-start gap-3 text-sm">
            <span
              className="flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center mt-0.5"
              style={{ background: "rgba(255,255,255,0.06)" }}
            >
              <Check className="w-3 h-3" style={{ color: T }} />
            </span>
            <span style={{ color: "rgba(255,255,255,0.85)" }}>{f}</span>
          </li>
        ))}
      </ul>

      <Separator />

      <div className="space-y-2">
        <PriceRow label="Subtotal" value={`$${plan.priceUsd.toFixed(2)}`} />
        <PriceRow label="Tax" value="$0.00" />
        <div className="pt-2" style={{ borderTop: `1px solid ${B}` }} />
        <div className="flex items-center justify-between pt-2">
          <span className="text-base font-semibold">Total due today</span>
          <span className="text-xl font-bold">${plan.priceUsd.toFixed(2)}</span>
        </div>
      </div>

      <button
        type="button"
        disabled
        className="mt-5 inline-flex items-center gap-1 text-xs font-medium opacity-40 cursor-not-allowed"
        style={{ color: TS }}
      >
        + Add promotion code
      </button>
    </section>
  );
}

function PaymentFormPanel({
  plan,
  userEmail,
  error,
  isProcessing,
  createOrder,
  onApprove,
  onError,
  onCancel,
}: {
  plan: PlanDetails;
  userEmail: string;
  error: string | null;
  isProcessing: boolean;
  createOrder: () => Promise<string>;
  onApprove: (data: { orderID: string }) => Promise<void>;
  onError: (err: unknown) => void;
  onCancel: () => void;
}) {
  const [method, setMethod] = useState<PaymentMethod>("card");
  const [saveInfo, setSaveInfo] = useState(false);

  return (
    <section className="space-y-6">
      {error && <ErrorBanner message={error} />}

      <div>
        <SectionLabel>Contact information</SectionLabel>
        <Field label="Email">
          <input
            type="email"
            value={userEmail}
            readOnly
            className="w-full rounded-lg px-3.5 py-2.5 text-sm outline-none"
            style={{
              background: "rgba(255,255,255,0.04)",
              border: `1px solid ${B}`,
              color: TS,
            }}
          />
        </Field>
      </div>

      <div>
        <SectionLabel>Payment method</SectionLabel>
        <div className="space-y-3">
          <MethodOption
            id="card"
            selected={method === "card"}
            onSelect={() => setMethod("card")}
            icon={<CreditCard className="w-4 h-4" style={{ color: T }} />}
            title="Card"
          >
            {method === "card" && <CardFieldsPlaceholder />}
          </MethodOption>

          <MethodOption
            id="paypal"
            selected={method === "paypal"}
            onSelect={() => setMethod("paypal")}
            icon={<PayPalGlyph />}
            title="PayPal"
          >
            {method === "paypal" && (
              <div className="pt-3">
                <PayPalButtons
                  fundingSource="paypal"
                  disabled={isProcessing}
                  style={{
                    layout: "vertical",
                    shape: "rect",
                    color: "gold",
                    label: "paypal",
                    height: 48,
                  }}
                  createOrder={createOrder}
                  onApprove={onApprove}
                  onError={onError}
                  onCancel={onCancel}
                />
                {isProcessing && (
                  <div className="mt-3 flex items-center gap-2 text-xs" style={{ color: TS }}>
                    <Spinner small />
                    Processing payment…
                  </div>
                )}
              </div>
            )}
          </MethodOption>
        </div>
      </div>

      <label className="flex items-start gap-3 cursor-pointer text-sm" style={{ color: TS }}>
        <input
          type="checkbox"
          checked={saveInfo}
          onChange={(e) => setSaveInfo(e.target.checked)}
          className="mt-0.5 w-4 h-4 rounded cursor-pointer"
          style={{ accentColor: T }}
        />
        <span>Save my information for faster checkout next time</span>
      </label>

      <p style={{ color: TD }} className="text-xs leading-relaxed">
        By continuing, you agree to our{" "}
        <a href="/terms" style={{ color: TS }} className="underline underline-offset-2">
          Terms
        </a>{" "}
        and{" "}
        <a href="/privacy" style={{ color: TS }} className="underline underline-offset-2">
          Privacy Policy
        </a>
        .
      </p>

      {method === "card" && (
        <button
          type="button"
          disabled
          className="w-full rounded-xl flex items-center justify-center gap-2 py-4 text-base font-semibold"
          style={{
            background: "rgba(255,255,255,0.10)",
            color: TS,
            cursor: "not-allowed",
          }}
        >
          <Lock className="w-4 h-4" />
          Pay ${plan.priceUsd.toFixed(2)}
        </button>
      )}
    </section>
  );
}

function SuccessPanel({ plan }: { plan: PlanDetails }) {
  const [, navigate] = useLocation();
  const nextCharge = computeNextCharge(plan.cycle);
  return (
    <section
      className="rounded-2xl p-7 md:p-10 text-center"
      style={{ background: C2, border: `1px solid ${B}` }}
    >
      <div
        className="w-16 h-16 rounded-full mx-auto mb-5 flex items-center justify-center"
        style={{ background: "rgba(16,185,129,0.12)" }}
      >
        <CheckCircle2 className="w-9 h-9" style={{ color: SUCCESS }} />
      </div>
      <h2 className="text-2xl font-bold leading-tight">
        Welcome to {plan.displayName}!
      </h2>
      <p style={{ color: TS }} className="text-sm mt-2">
        Your subscription is now active.
      </p>

      <div
        className="mt-6 rounded-xl p-4 text-left text-sm space-y-2"
        style={{ background: C3, border: `1px solid ${B}` }}
      >
        <div className="flex items-center justify-between">
          <span style={{ color: TS }}>Plan</span>
          <span>{plan.displayName} ({plan.cycle})</span>
        </div>
        <div className="flex items-center justify-between">
          <span style={{ color: TS }}>Next charge</span>
          <span>{nextCharge} · ${plan.priceUsd.toFixed(2)}</span>
        </div>
      </div>

      <button
        onClick={() => navigate("/")}
        className="mt-6 inline-flex items-center justify-center gap-2 w-full rounded-xl py-3.5 text-base font-semibold"
        style={{ background: T, color: "#000" }}
      >
        Continue to your library
        <ChevronRight className="w-4 h-4" />
      </button>
    </section>
  );
}

function ErrorBanner({ message }: { message: string }) {
  return (
    <div
      role="alert"
      className="rounded-xl px-4 py-3 flex items-start gap-3 text-sm"
      style={{
        background: "rgba(239,68,68,0.10)",
        border: `1px solid rgba(239,68,68,0.35)`,
        color: "rgba(255,255,255,0.92)",
      }}
    >
      <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" style={{ color: ERROR }} />
      <span>{message}</span>
    </div>
  );
}

function MethodOption({
  selected,
  onSelect,
  icon,
  title,
  children,
}: {
  id: string;
  selected: boolean;
  onSelect: () => void;
  icon: React.ReactNode;
  title: string;
  children?: React.ReactNode;
}) {
  return (
    <div
      className="rounded-xl overflow-hidden transition-colors"
      style={{
        background: selected ? C3 : C2,
        border: `1px solid ${selected ? "rgba(255,255,255,0.18)" : B}`,
      }}
    >
      <button
        type="button"
        onClick={onSelect}
        className="w-full flex items-center gap-3 px-4 py-3.5 text-left"
        aria-pressed={selected}
      >
        <span
          className="w-4 h-4 rounded-full flex items-center justify-center flex-shrink-0"
          style={{
            border: `1.5px solid ${selected ? T : "rgba(255,255,255,0.3)"}`,
          }}
        >
          {selected && (
            <span
              className="w-2 h-2 rounded-full"
              style={{ background: T }}
            />
          )}
        </span>
        <span className="flex items-center gap-2 text-sm font-medium">
          {icon}
          {title}
        </span>
      </button>
      {children && (
        <div
          className="px-4 pb-4 pt-1"
          style={{ borderTop: `1px solid ${B}` }}
        >
          {children}
        </div>
      )}
    </div>
  );
}

function CardFieldsPlaceholder() {
  return (
    <div className="pt-3 space-y-3">
      <Field label="Card number">
        <input
          type="text"
          placeholder="1234 1234 1234 1234"
          disabled
          className="w-full rounded-lg px-3.5 py-2.5 text-sm outline-none cursor-not-allowed"
          style={{
            background: "rgba(255,255,255,0.03)",
            border: `1px solid ${B}`,
            color: T,
          }}
        />
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Expires">
          <input
            type="text"
            placeholder="MM / YY"
            disabled
            className="w-full rounded-lg px-3.5 py-2.5 text-sm outline-none cursor-not-allowed"
            style={{
              background: "rgba(255,255,255,0.03)",
              border: `1px solid ${B}`,
              color: T,
            }}
          />
        </Field>
        <Field label="CVC">
          <input
            type="text"
            placeholder="123"
            disabled
            className="w-full rounded-lg px-3.5 py-2.5 text-sm outline-none cursor-not-allowed"
            style={{
              background: "rgba(255,255,255,0.03)",
              border: `1px solid ${B}`,
              color: T,
            }}
          />
        </Field>
      </div>
      <Field label="Cardholder name">
        <input
          type="text"
          placeholder="Full name on card"
          disabled
          className="w-full rounded-lg px-3.5 py-2.5 text-sm outline-none cursor-not-allowed"
          style={{
            background: "rgba(255,255,255,0.03)",
            border: `1px solid ${B}`,
            color: T,
          }}
        />
      </Field>
      <p
        className="text-xs leading-relaxed pt-1"
        style={{ color: TD }}
      >
        Card payments will be available soon. Use PayPal below for now.
      </p>
    </div>
  );
}

function PayPalGlyph() {
  return (
    <span
      className="inline-flex items-center justify-center w-5 h-5 rounded-sm text-[10px] font-black"
      style={{ background: "#FFC439", color: "#003087" }}
      aria-hidden
    >
      P
    </span>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p
      className="text-xs font-semibold uppercase tracking-[0.18em] mb-3"
      style={{ color: TD }}
    >
      {children}
    </p>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span
        className="block text-xs mb-1.5"
        style={{ color: TS }}
      >
        {label}
      </span>
      {children}
    </label>
  );
}

function Separator() {
  return <div className="my-6" style={{ height: 1, background: B }} />;
}

function PriceRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between text-sm">
      <span style={{ color: TS }}>{label}</span>
      <span style={{ color: T }}>{value}</span>
    </div>
  );
}

function Frame({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{ background: BG, color: T, fontFamily: SF }}
      className="min-h-screen px-6 py-12"
    >
      <div className="max-w-6xl mx-auto">{children}</div>
    </div>
  );
}

function CenterBlock({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center gap-3 text-center">
      {children}
    </div>
  );
}

function Spinner({ small = false }: { small?: boolean }) {
  const size = small ? 14 : 24;
  return (
    <div
      className="rounded-full animate-spin"
      style={{
        width: size,
        height: size,
        border: `2px solid rgba(255,255,255,0.1)`,
        borderTopColor: "rgba(255,255,255,0.5)",
      }}
    />
  );
}

function computeNextCharge(cycle: "monthly" | "yearly"): string {
  const d = new Date();
  if (cycle === "yearly") d.setFullYear(d.getFullYear() + 1);
  else d.setMonth(d.getMonth() + 1);
  return d.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}
