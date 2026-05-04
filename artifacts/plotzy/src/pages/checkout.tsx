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
  ChevronLeft,
  ChevronRight,
  CreditCard,
} from "lucide-react";
import { useAuth } from "@/contexts/auth-context";
import { getPlanDetails, type PlanDetails } from "@/lib/checkout-plans";
import { Sentry } from "@/lib/sentry";
import { SEO } from "@/components/SEO";

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
      <SEO title="Invalid plan" noindex />
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
  const [sandbox, setSandbox] = useState(false);
  const [sdkUnavailable, setSdkUnavailable] = useState(false);

  useEffect(() => {
    fetch("/api/paypal/config")
      .then((r) => {
        if (!r.ok) throw new Error("Config unavailable");
        return r.json();
      })
      .then((d: { enabled: boolean; clientId?: string; sandbox?: boolean }) => {
        setSandbox(!!d.sandbox);
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
      <SEO title={`Checkout · ${plan.displayName}`} noindex />
      <CheckoutLayout plan={plan} sandbox={sandbox} />
    </PayPalScriptProvider>
  );
}

function CheckoutLayout({ plan, sandbox }: { plan: PlanDetails; sandbox: boolean }) {
  const { user, refetch } = useAuth();
  const [, navigate] = useLocation();
  const [status, setStatus] = useState<CheckoutStatus>("form");
  const [error, setError] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  // Mount-time reset. Every fresh /checkout visit must start from a clean
  // form state — without this, Vite HMR + React Fast Refresh can preserve
  // stale state (isProcessing=true, status="success", or a leftover error
  // banner) across file edits during development. In production this is a
  // no-op since the initial useState values already match.
  useEffect(() => {
    setIsProcessing(false);
    setError(null);
    setStatus("form");
  }, []);

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
        setError(
          "You've made several payment attempts in a short time. Please wait a few minutes before trying again.",
        );
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

  // `source` tells the backend which SDK button fired this callback.
  // PayPal's capture response can't reliably distinguish a Standard
  // card payment from a PayPal-account payment (both surface as
  // payment_source.paypal when the merchant doesn't have ACDC enabled),
  // so we let the frontend — which definitively knows which funding
  // source button was clicked — tell the backend.
  const onApprove = async (
    data: { orderID: string },
    source: "paypal" | "card",
  ) => {
    try {
      const res = await fetch("/api/paypal/capture-order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId: data.orderID, plan: plan.id, paymentSource: source }),
        credentials: "include",
      });
      if (res.status === 429) {
        setError(
          "You've made several payment attempts in a short time. Please wait a few minutes before trying again.",
        );
        setIsProcessing(false);
        return;
      }
      if (!res.ok) {
        setError(
          "Payment couldn't be processed. Please try again or use a different payment method.",
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
      Sentry.captureException(err, {
        tags: { area: "checkout", source: "paypal_capture" },
      });
      // fetch() throws TypeError specifically for network failures
      // (offline, DNS, blocked by an extension, CORS, …). Anything else
      // is more likely an internal logic error and gets the generic copy.
      const isNetworkError = err instanceof TypeError;
      setError(
        isNetworkError
          ? "Could not reach our payment servers. Please check your internet connection and try again."
          : "Payment couldn't be processed. Please try again or use a different payment method.",
      );
      setIsProcessing(false);
    }
  };

  const onError = (err: unknown) => {
    Sentry.captureException(err, {
      tags: { area: "checkout", source: "paypal_sdk" },
    });
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
      {status !== "success" && (
        <button
          type="button"
          onClick={() => navigate("/pricing")}
          className="mb-6 inline-flex items-center gap-1.5 text-sm transition-colors"
          style={{ color: TS }}
          onMouseEnter={(e) => (e.currentTarget.style.color = T)}
          onMouseLeave={(e) => (e.currentTarget.style.color = TS)}
        >
          <ChevronLeft className="w-4 h-4" />
          Back to plans
        </button>
      )}
      <header className="mb-10 flex items-center gap-2 flex-wrap">
        <span style={{ color: T }} className="text-base font-bold tracking-wide">
          Plotzy
        </span>
        <span style={{ color: TD }} className="text-sm">
          · Checkout
        </span>
        {sandbox && <TestModeBadge />}
      </header>

      <div className="grid grid-cols-1 md:grid-cols-[1.2fr_1fr] gap-8 md:gap-16">
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
      className="rounded-2xl p-5 md:p-8"
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
      <h2 className="text-2xl md:text-3xl font-bold leading-tight">{plan.displayName}</h2>
      <p style={{ color: TS }} className="text-sm mt-1">
        {plan.cycleLabel}
      </p>

      <div className="mt-6 flex items-baseline gap-2 flex-wrap">
        <span className="text-4xl md:text-5xl font-bold leading-none">
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
  onApprove: (data: { orderID: string }, source: "paypal" | "card") => Promise<void>;
  onError: (err: unknown) => void;
  onCancel: () => void;
}) {
  const [method, setMethod] = useState<PaymentMethod>("card");

  // The previous single dimming wrapper around the whole form
  // (opacity 0.4 + pointerEvents:none) blocked the PayPal SDK card popup.
  // PayPal renders the popup as a child of the SDK button container — both
  // the parent's opacity and its pointer-events propagate down to the
  // popup's iframe content, so the popup appeared faded AND non-clickable
  // during processing. Fix: dim only the non-SDK parts (contact info,
  // payment-method label, legal microtype) and leave the radio panels
  // (which contain the SDK buttons + their popups) at full opacity and
  // fully clickable. Method radios are guarded against switching mid-flight
  // via the !isProcessing check on onSelect; SDK buttons themselves are
  // already disabled via their own `disabled={isProcessing}` prop.
  const dimStyle: React.CSSProperties = {
    opacity: isProcessing ? 0.4 : 1,
    pointerEvents: isProcessing ? "none" : "auto",
    transition: "opacity 0.2s",
  };

  return (
    <section className="space-y-6">
      {error && <ErrorBanner message={error} />}

      <div style={dimStyle}>
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
        <div style={dimStyle}>
          <SectionLabel>Payment method</SectionLabel>
        </div>
        <div className="space-y-3">
          <MethodOption
            id="card"
            selected={method === "card"}
            onSelect={() => { if (!isProcessing) setMethod("card"); }}
            icon={<CreditCard className="w-4 h-4" style={{ color: T }} />}
            title="Card"
          >
            {method === "card" && (
              <div className="pt-3">
                {/*
                  PayPal renders the card button inside a same-origin iframe
                  (a PCI-compliance requirement) and exposes only a fixed
                  set of `style` props (color, shape, height, layout, label).
                  Cross-frame proxy-clicks are blocked by the browser, so we
                  cannot replace the button with our own. The "Powered by
                  PayPal" tagline below is a hard SDK requirement that is
                  not removable via configuration. We render the SDK button
                  inside our own framed container so it reads as an embedded
                  payment widget rather than a stray element.
                */}
                <p
                  className="text-[10px] font-semibold uppercase tracking-[0.18em] mb-2"
                  style={{ color: TD }}
                >
                  Payment by card
                </p>
                <div
                  style={{
                    background: "linear-gradient(180deg, #1a1a1a 0%, #161616 100%)",
                    border: `1px solid ${B}`,
                    borderRadius: 16,
                    padding: 24,
                    boxShadow:
                      "inset 0 0 0 1px rgba(255,255,255,0.04), 0 1px 0 0 rgba(255,255,255,0.02)",
                  }}
                >
                  <PayPalButtons
                    fundingSource="card"
                    disabled={isProcessing}
                    style={{
                      layout: "vertical",
                      shape: "rect",
                      color: "black",
                      label: "pay",
                      height: 48,
                    }}
                    createOrder={createOrder}
                    onApprove={(data) => onApprove(data, "card")}
                    onError={onError}
                    onCancel={onCancel}
                  />
                </div>
                <p className="mt-2 text-xs" style={{ color: TD }}>
                  You'll enter your card details securely in a PayPal popup.
                </p>
              </div>
            )}
          </MethodOption>

          <MethodOption
            id="paypal"
            selected={method === "paypal"}
            onSelect={() => { if (!isProcessing) setMethod("paypal"); }}
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
                  onApprove={(data) => onApprove(data, "paypal")}
                  onError={onError}
                  onCancel={onCancel}
                />
              </div>
            )}
          </MethodOption>
        </div>
      </div>

      <div style={dimStyle}>
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
      </div>

      {isProcessing && (
        <div
          aria-live="polite"
          className="flex flex-col items-center gap-3 py-2"
        >
          <Spinner large />
          <div className="text-center">
            <p className="text-sm font-semibold" style={{ color: T }}>
              Processing payment…
            </p>
            <p className="text-xs mt-1" style={{ color: TS }}>
              Please don't close this window.
            </p>
          </div>
        </div>
      )}
    </section>
  );
}

function SuccessPanel({ plan }: { plan: PlanDetails }) {
  const [, navigate] = useLocation();
  const nextCharge = computeNextCharge(plan.cycle);
  return (
    <section
      className="rounded-2xl p-5 md:p-10 text-center"
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
        <div className="flex items-baseline justify-between gap-3">
          <span style={{ color: TS }} className="flex-shrink-0">Plan</span>
          <span className="text-right">{plan.displayName} ({plan.cycle})</span>
        </div>
        <div className="flex items-baseline justify-between gap-3">
          <span style={{ color: TS }} className="flex-shrink-0">Next charge</span>
          <span className="text-right">{nextCharge} · ${plan.priceUsd.toFixed(2)}</span>
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
      className="min-h-screen px-4 md:px-6 py-8 md:py-12"
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

function TestModeBadge() {
  return (
    <span
      className="text-[10px] font-bold uppercase tracking-[0.18em] px-2 py-0.5 rounded-full inline-flex items-center"
      style={{
        background: "rgba(245,158,11,0.15)",
        color: "#F59E0B",
        border: "1px solid rgba(245,158,11,0.35)",
      }}
      title="PayPal Sandbox — no real charges"
    >
      Test mode
    </span>
  );
}

function Spinner({ small = false, large = false }: { small?: boolean; large?: boolean }) {
  const size = small ? 14 : large ? 32 : 24;
  return (
    <div
      className="rounded-full animate-spin"
      style={{
        width: size,
        height: size,
        border: `${large ? 3 : 2}px solid rgba(255,255,255,0.1)`,
        borderTopColor: "rgba(255,255,255,0.6)",
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
