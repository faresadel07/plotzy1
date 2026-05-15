import { useState } from "react";
import { useLocation } from "wouter";
import { useMutation, useQuery } from "@tanstack/react-query";
import {
  AlertCircle,
  ArrowRight,
  Check,
  CheckCircle2,
  ChevronLeft,
  Loader2,
  Pause,
  X,
} from "lucide-react";
import { Layout } from "@/components/layout";
import { SEO } from "@/components/SEO";
import { useAuth } from "@/contexts/auth-context";
import { getPlanDetails, type PlanDetails } from "@/lib/checkout-plans";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { AccountTabs } from "@/components/account-tabs";
import { useLanguage } from "@/contexts/language-context";
import type { TranslationKey } from "@/lib/i18n";

// Theme tokens — mirror /checkout for visual consistency.
const SF = "-apple-system,BlinkMacSystemFont,'SF Pro Text','Helvetica Neue',sans-serif";
const BG = "#000";
const C2 = "#111";
const B = "rgba(255,255,255,0.07)";
const T = "#fff";
const TS = "rgba(255,255,255,0.55)";
const TD = "rgba(255,255,255,0.25)";
const SUCCESS = "#10B981";
const WARNING = "#F59E0B";

type PaymentRow = {
  id: number;
  paypalOrderId: string;
  paypalCaptureId: string;
  amountCents: number;
  currency: string;
  plan: string;
  tier: string;
  cycle: string;
  paymentMethod: string;
  status: string;
  createdAt: string;
};

export default function AccountSubscription() {
  const { user } = useAuth();
  const [, navigate] = useLocation();
  const { t } = useLanguage();

  // Real payment history. The default queryFn (configured in
  // lib/queryClient.ts) does GET on `queryKey.join("/")` with
  // credentials: "include" and throws on non-2xx, so a plain useQuery
  // call is enough — no custom fetcher needed.
  const {
    data,
    isLoading: isHistoryLoading,
    isError: isHistoryError,
  } = useQuery<{ payments: PaymentRow[] }>({
    queryKey: ["/api/user/payment-history"],
  });

  const payments = data?.payments ?? [];
  // Backend returns rows sorted by createdAt DESC, so [0] is most recent
  // and [.length - 1] is oldest. Both fields below are derived on
  // the client to avoid widening users.subscription_started_at — first
  // ever payment IS the subscription start date.
  const oldestPaymentAt = payments.at(-1)?.createdAt ?? null;
  const latestPaymentMethod = payments[0]?.paymentMethod ?? null;

  // Sandbox flag drives the "TEST MODE" badge in the page header. The
  // /api/paypal/config endpoint is the same one /checkout uses, so the
  // shared queryKey makes React Query dedupe the fetch across both pages
  // when the user navigates between them.
  const { data: paypalConfig } = useQuery<{ sandbox?: boolean }>({
    queryKey: ["/api/paypal/config"],
  });
  const isSandbox = !!paypalConfig?.sandbox;

  const planId = user?.subscriptionPlan ?? null;
  const plan = getPlanDetails(planId);
  const status = user?.subscriptionStatus ?? "free_trial";
  const isFree = !plan || status === "free_trial";

  return (
    <Layout darkNav>
      <SEO title={t("asMySubscription")} noindex />
      <div style={{ background: BG, minHeight: "100vh", color: T, fontFamily: SF }}>
        <div className="max-w-4xl mx-auto px-6 py-12">
          <button
            type="button"
            onClick={() => navigate("/")}
            className="mb-6 inline-flex items-center gap-1.5 text-sm transition-colors"
            style={{ color: TS }}
            onMouseEnter={(e) => (e.currentTarget.style.color = T)}
            onMouseLeave={(e) => (e.currentTarget.style.color = TS)}
          >
            <ChevronLeft className="w-4 h-4" />
            {t("asBackHome")}
          </button>

          <div className="flex items-center gap-3 mb-2 flex-wrap">
            <h1 className="text-3xl font-bold leading-tight">{t("asMySubscription")}</h1>
            {isSandbox && <TestModeBadge />}
          </div>
          <p className="text-sm mb-6" style={{ color: TS }}>
            {t("asManageBlurb")}
          </p>

          <AccountTabs current="subscription" />

          {isFree ? (
            <FreePlanCard />
          ) : (
            <CurrentSubscriptionCard
              plan={plan!}
              status={status}
              endDate={user?.subscriptionEndDate ?? null}
              firstPaymentAt={oldestPaymentAt}
              paymentMethod={latestPaymentMethod}
            />
          )}

          {!isFree && plan && <FeaturesCard plan={plan} />}

          <PaymentHistorySection
            rows={payments}
            isLoading={isHistoryLoading}
            isError={isHistoryError}
          />
        </div>
      </div>
    </Layout>
  );
}

function CurrentSubscriptionCard({
  plan,
  status,
  endDate,
  firstPaymentAt,
  paymentMethod,
}: {
  plan: PlanDetails;
  status: string;
  endDate: string | null;
  firstPaymentAt: string | null;
  paymentMethod: string | null;
}) {
  const { refetch } = useAuth();
  const { t, lang } = useLanguage();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [cancelError, setCancelError] = useState<string | null>(null);

  const cancelMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/user/cancel-subscription", {
        method: "POST",
        credentials: "include",
      });
      const body = (await res.json()) as { message?: string; success?: boolean };
      if (!res.ok || !body.success) {
        throw new Error(body.message ?? t("asCancelFailed"));
      }
      return body;
    },
    onSuccess: async () => {
      await refetch();
      setIsModalOpen(false);
      setCancelError(null);
    },
    onError: (err: Error) => {
      setCancelError(err.message);
    },
  });

  const handleConfirmCancel = () => {
    setCancelError(null);
    cancelMutation.mutate();
  };

  const handleCloseModal = () => {
    if (cancelMutation.isPending) return;
    setIsModalOpen(false);
    setCancelError(null);
  };

  const statusDisplay = getStatusDisplay(status, endDate, t);
  const nextRenewal = endDate ? formatDate(endDate) : "-";
  const subscribedSince = firstPaymentAt ? formatDate(firstPaymentAt) : "-";
  const methodLabel = humanizePaymentMethod(paymentMethod, t);
  const canCancel = status === "active";
  // Resubscribe affordance for users who canceled but still have access.
  // Routes to /pricing (not /checkout directly) so they can also consider
  // switching plans during reactivation rather than being locked into
  // the same plan they had before.
  const canResubscribe = status === "canceled";
  const [, navigate] = useLocation();

  return (
    <section
      className="rounded-2xl p-7 md:p-8 mb-6"
      style={{ background: C2, border: `1px solid ${B}` }}
    >
      <div className="flex items-center justify-between mb-3">
        <p
          className="text-xs font-bold uppercase tracking-[0.2em]"
          style={{ color: plan.accentColor }}
        >
          {plan.tierLabel}
        </p>
        <StatusPill display={statusDisplay} />
      </div>
      <h2 className="text-2xl md:text-3xl font-bold leading-tight">{plan.displayName}</h2>
      <p style={{ color: TS }} className="text-sm mt-1">
        {plan.cycleLabel} · ${plan.priceUsd.toFixed(2)} {plan.unitLabel}
      </p>

      <div className="my-6" style={{ height: 1, background: B }} />

      <dl className="grid grid-cols-1 sm:grid-cols-2 gap-y-4 gap-x-8 text-sm">
        <DetailRow label={t("asSubscribedSince")} value={subscribedSince} />
        <DetailRow
          label={status === "canceled" ? t("asAccessUntil") : t("asNextRenewal")}
          value={nextRenewal}
        />
        <DetailRow label={t("asPaymentMethod")} value={methodLabel} />
        <DetailRow label={t("asPlanId")} value={plan.id} mono />
      </dl>

      {(canCancel || canResubscribe) && (
        <div
          className="mt-6 pt-5 flex justify-end"
          style={{ borderTop: `1px solid ${B}` }}
        >
          {canCancel ? (
            <button
              type="button"
              onClick={() => setIsModalOpen(true)}
              className="text-xs font-medium transition-colors"
              style={{ color: TS }}
              onMouseEnter={(e) => (e.currentTarget.style.color = "#EF4444")}
              onMouseLeave={(e) => (e.currentTarget.style.color = TS)}
            >
              {t("asCancelSub")}
            </button>
          ) : (
            <button
              type="button"
              onClick={() => navigate("/pricing")}
              className="text-xs font-medium transition-colors inline-flex items-center gap-1"
              style={{ color: TS }}
              onMouseEnter={(e) => (e.currentTarget.style.color = SUCCESS)}
              onMouseLeave={(e) => (e.currentTarget.style.color = TS)}
              title={t("asPickPlanTitle")}
            >
              {t("asResubscribe")} {lang === "ar" ? "←" : "→"}
            </button>
          )}
        </div>
      )}

      <CancelDialog
        open={isModalOpen}
        onOpenChange={(open) => {
          if (!open) handleCloseModal();
        }}
        plan={plan}
        endDate={endDate}
        isPending={cancelMutation.isPending}
        error={cancelError}
        onConfirm={handleConfirmCancel}
      />
    </section>
  );
}

function CancelDialog({
  open,
  onOpenChange,
  plan,
  endDate,
  isPending,
  error,
  onConfirm,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  plan: PlanDetails;
  endDate: string | null;
  isPending: boolean;
  error: string | null;
  onConfirm: () => void;
}) {
  const { t } = useLanguage();
  const accessUntil = endDate ? formatDate(endDate) : t("asBillingPeriodEnd");
  // Show first 4 features as a tangible preview of what they'll lose.
  const featuresLost = plan.features.slice(0, 4);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("asCancelDialogTitle1")} {plan.displayName} {t("asCancelDialogTitle2")}</DialogTitle>
          <DialogDescription>
            {t("asCancelAccessInfo1")} <span className="font-semibold text-foreground">{accessUntil}</span>.
            {" "}{t("asCancelAccessInfo2")}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 text-sm">
          <p className="text-muted-foreground">
            {t("asBooksYours")}
          </p>
          <ul className="space-y-1.5">
            {featuresLost.map((f) => (
              <li key={f} className="flex items-start gap-2 text-muted-foreground">
                <span className="text-muted-foreground/60 mt-0.5">•</span>
                <span>{f}</span>
              </li>
            ))}
          </ul>
          <p className="text-xs text-muted-foreground/80 pt-2">
            {t("asNoChargeToday")}
          </p>
        </div>

        {error && (
          <div
            role="alert"
            className="rounded-lg px-3 py-2 flex items-start gap-2 text-xs"
            style={{
              background: "rgba(239,68,68,0.10)",
              border: "1px solid rgba(239,68,68,0.35)",
              color: "rgba(255,255,255,0.92)",
            }}
          >
            <AlertCircle className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" style={{ color: "#EF4444" }} />
            <span>{error}</span>
          </div>
        )}

        <DialogFooter className="gap-2 sm:gap-2">
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            disabled={isPending}
            className="px-4 py-2.5 rounded-lg text-sm font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
            style={{ background: T, color: "#000" }}
          >
            {t("asKeepSub")}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isPending}
            className="px-4 py-2.5 rounded-lg text-sm font-medium inline-flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
            style={{
              background: "transparent",
              color: "#EF4444",
              border: "1px solid rgba(239,68,68,0.4)",
            }}
          >
            {isPending && <Loader2 className="w-4 h-4 animate-spin" />}
            {isPending ? t("asCanceling") : t("asCancelAnyway")}
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function FreePlanCard() {
  const [, navigate] = useLocation();
  const { t } = useLanguage();
  return (
    <section
      className="rounded-2xl p-7 md:p-8 mb-6 text-center"
      style={{ background: C2, border: `1px solid ${B}` }}
    >
      <p
        className="text-xs font-bold uppercase tracking-[0.2em] mb-3"
        style={{ color: TD }}
      >
        {t("asFree")}
      </p>
      <h2 className="text-2xl md:text-3xl font-bold leading-tight">{t("asOnFreePlan")}</h2>
      <p style={{ color: TS }} className="text-sm mt-2 max-w-md mx-auto">
        {t("asFreeBlurb")}
      </p>
      <button
        onClick={() => navigate("/pricing")}
        className="mt-6 inline-flex items-center gap-2 px-5 py-3 rounded-xl font-semibold text-sm"
        style={{ background: T, color: "#000" }}
      >
        {t("asViewPlans")}
        <ArrowRight className="w-4 h-4" />
      </button>
    </section>
  );
}

function FeaturesCard({ plan }: { plan: PlanDetails }) {
  const { t } = useLanguage();
  return (
    <section
      className="rounded-2xl p-7 md:p-8 mb-8"
      style={{ background: C2, border: `1px solid ${B}` }}
    >
      <p
        className="text-xs font-semibold uppercase tracking-[0.18em] mb-4"
        style={{ color: TD }}
      >
        {t("asWhatsIncluded")}
      </p>
      <ul className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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
    </section>
  );
}

function PaymentHistorySection({
  rows,
  isLoading,
  isError,
}: {
  rows: PaymentRow[];
  isLoading: boolean;
  isError: boolean;
}) {
  const { t } = useLanguage();
  return (
    <section className="mb-8">
      <h3 className="text-lg font-semibold mb-1">{t("asPaymentHistory")}</h3>
      <p className="text-xs mb-4" style={{ color: TD }}>
        {t("asHistoryNote")}
      </p>
      {isLoading ? (
        <div
          className="rounded-2xl p-8 flex items-center justify-center gap-3 text-sm"
          style={{ background: C2, border: `1px solid ${B}`, color: TS }}
        >
          <Spinner />
          {t("asLoadingHistory")}
        </div>
      ) : isError ? (
        <div
          className="rounded-2xl p-5 flex items-start gap-3 text-sm"
          style={{
            background: "rgba(239,68,68,0.10)",
            border: "1px solid rgba(239,68,68,0.35)",
            color: "rgba(255,255,255,0.92)",
          }}
        >
          <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" style={{ color: "#EF4444" }} />
          <span>{t("asHistoryError")}</span>
        </div>
      ) : rows.length === 0 ? (
        <div
          className="rounded-2xl p-8 text-center text-sm"
          style={{ background: C2, border: `1px solid ${B}`, color: TS }}
        >
          {t("asNoPayments")}
        </div>
      ) : (
        <div
          className="rounded-2xl overflow-hidden"
          style={{ background: C2, border: `1px solid ${B}` }}
        >
          {/* Header */}
          <div
            className="hidden sm:grid text-[11px] font-semibold uppercase tracking-[0.14em] px-5 py-3"
            style={{
              gridTemplateColumns: "1.4fr 1.6fr 0.9fr 1.2fr 1fr",
              color: TD,
              borderBottom: `1px solid ${B}`,
            }}
          >
            <div>{t("asColDate")}</div>
            <div>{t("asColPlan")}</div>
            <div className="text-right sm:text-left">{t("asColAmount")}</div>
            <div>{t("asColMethod")}</div>
            <div>{t("asColStatus")}</div>
          </div>
          {rows.map((row, idx) => (
            <PaymentHistoryRow
              key={row.id}
              row={row}
              isLast={idx === rows.length - 1}
            />
          ))}
        </div>
      )}
    </section>
  );
}

function PaymentHistoryRow({ row, isLast }: { row: PaymentRow; isLast: boolean }) {
  const { t } = useLanguage();
  return (
    <div
      className="grid grid-cols-1 sm:grid-cols-[1.4fr_1.6fr_0.9fr_1.2fr_1fr] gap-y-1 gap-x-2 px-5 py-4 text-sm items-center"
      style={{ borderBottom: isLast ? "none" : `1px solid ${B}` }}
    >
      <div>{formatDate(row.createdAt)}</div>
      <div>
        <span style={{ color: T }} className="capitalize">
          {row.tier} · {row.cycle}
        </span>
      </div>
      <div style={{ color: T }} className="font-medium">
        ${(row.amountCents / 100).toFixed(2)}
      </div>
      <div style={{ color: TS }}>{humanizePaymentMethod(row.paymentMethod, t)}</div>
      <div className="flex items-center gap-1.5">
        <CheckCircle2 className="w-3.5 h-3.5" style={{ color: SUCCESS }} />
        <span className="capitalize" style={{ color: TS }}>
          {row.status}
        </span>
      </div>
    </div>
  );
}

function StatusPill({
  display,
}: {
  display: { icon: React.ReactNode; label: string; color: string; bg: string };
}) {
  return (
    <span
      className="text-[10px] font-bold uppercase tracking-[0.16em] px-2.5 py-1 rounded-full inline-flex items-center gap-1.5"
      style={{ background: display.bg, color: display.color }}
    >
      {display.icon}
      {display.label}
    </span>
  );
}

function DetailRow({
  label,
  value,
  mono,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div>
      <dt
        className="text-[11px] font-semibold uppercase tracking-[0.14em] mb-1"
        style={{ color: TD }}
      >
        {label}
      </dt>
      <dd
        style={{ color: T, fontFamily: mono ? "ui-monospace, monospace" : undefined }}
        className="text-sm"
      >
        {value}
      </dd>
    </div>
  );
}

function getStatusDisplay(
  status: string,
  _endDate: string | null,
  t: (k: TranslationKey) => string,
): { icon: React.ReactNode; label: string; color: string; bg: string } {
  switch (status) {
    case "active":
      return {
        icon: <span style={{ width: 6, height: 6, borderRadius: "50%", background: SUCCESS, display: "inline-block" }} />,
        label: t("asStatusActive"),
        color: SUCCESS,
        bg: "rgba(16,185,129,0.15)",
      };
    case "canceled":
      return {
        icon: <Pause className="w-3 h-3" style={{ color: WARNING }} />,
        label: t("asStatusCanceled"),
        color: WARNING,
        bg: "rgba(245,158,11,0.15)",
      };
    case "expired":
      return {
        icon: <X className="w-3 h-3" style={{ color: TD }} />,
        label: t("asStatusExpired"),
        color: TD,
        bg: "rgba(255,255,255,0.06)",
      };
    case "free_trial":
    default:
      return {
        icon: <span style={{ width: 6, height: 6, borderRadius: "50%", background: TD, display: "inline-block" }} />,
        label: t("asStatusFreePlan"),
        color: TS,
        bg: "rgba(255,255,255,0.06)",
      };
  }
}

function humanizePaymentMethod(method: string | null, t: (k: TranslationKey) => string): string {
  switch (method) {
    case "paypal_account":
      return t("asPaypalAccount");
    case "paypal_card":
      return t("asPaypalCard");
    case "paypal_unknown":
    case "paypal":
      return "PayPal";
    default:
      return "-";
  }
}

function Spinner() {
  return (
    <div
      className="rounded-full animate-spin"
      style={{
        width: 18,
        height: 18,
        border: "2px solid rgba(255,255,255,0.1)",
        borderTopColor: "rgba(255,255,255,0.5)",
      }}
    />
  );
}

function TestModeBadge() {
  const { t } = useLanguage();
  return (
    <span
      className="text-[10px] font-bold uppercase tracking-[0.18em] px-2 py-0.5 rounded-full inline-flex items-center"
      style={{
        background: "rgba(245,158,11,0.15)",
        color: WARNING,
        border: "1px solid rgba(245,158,11,0.35)",
      }}
      title={t("asTestModeTitle")}
    >
      {t("asTestMode")}
    </span>
  );
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}
