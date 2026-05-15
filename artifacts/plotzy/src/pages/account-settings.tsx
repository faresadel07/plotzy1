import { useState } from "react";
import { useLocation } from "wouter";
import { AlertCircle, ChevronLeft, Database, FileText, Loader2 } from "lucide-react";
import { Layout } from "@/components/layout";
import { SEO } from "@/components/SEO";
import { useAuth } from "@/contexts/auth-context";
import { useLanguage } from "@/contexts/language-context";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { AccountTabs } from "@/components/account-tabs";

// Theme tokens — kept identical to /account/subscription so the two
// pages feel like siblings of the same surface.
const SF = "-apple-system,BlinkMacSystemFont,'SF Pro Text','Helvetica Neue',sans-serif";
const BG = "#000";
const B = "rgba(255,255,255,0.07)";
const T = "#fff";
const TS = "rgba(255,255,255,0.55)";
const TD = "rgba(255,255,255,0.25)";

export default function AccountSettings() {
  const [, navigate] = useLocation();
  const { t } = useLanguage();

  return (
    <Layout darkNav>
      <SEO title={t("acctTitle")} noindex />
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

          <h1 className="text-3xl font-bold leading-tight mb-2">{t("acctTitle")}</h1>
          <p className="text-sm mb-6" style={{ color: TS }}>
            {t("acctBlurb")}
          </p>

          <AccountTabs current="settings" />

          <ChangeEmailSection />
          <NotificationPrefsSection />
          <ChangePasswordSection />
          <YourDataSection />
          <DangerZoneSection />
        </div>
      </div>
    </Layout>
  );
}

// ── Change email (logged-in users only) ───────────────────────────
//
// Two-stage flow: user submits new email + current password ->
// server stores a pending token + sends a verify link to the new
// address (and a "change requested" notice with cancel link to the
// old address). users.email only flips when the new address clicks
// the verify link. This panel:
//   - shows the current sign-in email,
//   - if a change is pending, surfaces a banner with the new
//     address + a hint that the cancel link in the old-address
//     notification email is the way to abort without the token.
function ChangeEmailSection() {
  const { user, refetch } = useAuth();
  const { t } = useLanguage();
  const { toast } = useToast();
  const [newEmail, setNewEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const isPasswordUser = !!user?.hasPassword;
  const pending = user?.pendingEmailChange ?? null;

  const reset = () => {
    setNewEmail("");
    setPassword("");
    setSubmitting(false);
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await fetch("/api/auth/email", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ newEmail: newEmail.trim(), currentPassword: password }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        toast({
          title: t("changeEmailFailure"),
          description: data?.message || undefined,
          variant: "destructive",
        });
        setSubmitting(false);
        return;
      }
      toast({ title: t("changeEmailRequestSent") });
      reset();
      await refetch();
    } catch {
      toast({ title: t("changeEmailFailure"), variant: "destructive" });
      setSubmitting(false);
    }
  };

  if (!isPasswordUser) {
    return (
      <div
        className="mt-12 p-6 rounded-2xl"
        style={{ background: "rgba(255,255,255,0.02)", border: `1px solid ${B}` }}
      >
        <h3 className="text-sm font-bold mb-2" style={{ color: T }}>
          {t("changeEmailTitle")}
        </h3>
        <p className="text-sm mb-2" style={{ color: TS, lineHeight: 1.6 }}>
          <strong style={{ color: T }}>{t("changeEmailCurrentLabel")}:</strong>{" "}
          <span style={{ fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace" }}>{user?.email || "—"}</span>
        </p>
        <p className="text-sm" style={{ color: TS, lineHeight: 1.6 }}>
          {t("changeEmailOauthNotice")}
        </p>
      </div>
    );
  }

  const inputStyle: React.CSSProperties = {
    width: "100%",
    padding: "10px 12px",
    borderRadius: 8,
    background: "rgba(255,255,255,0.04)",
    border: `1px solid ${B}`,
    color: T,
    fontSize: 14,
    outline: "none",
  };
  const labelStyle: React.CSSProperties = {
    display: "block",
    fontSize: 12,
    fontWeight: 600,
    color: TS,
    marginBottom: 6,
  };

  return (
    <div
      className="mt-12 p-6 rounded-2xl"
      style={{ background: "rgba(255,255,255,0.02)", border: `1px solid ${B}` }}
    >
      <h3 className="text-sm font-bold mb-1" style={{ color: T }}>
        {t("changeEmailTitle")}
      </h3>
      <p className="text-xs mb-4" style={{ color: TS, lineHeight: 1.6 }}>
        {t("changeEmailSubtitle")}
      </p>

      <p className="text-sm mb-5" style={{ color: TS, lineHeight: 1.6 }}>
        <strong style={{ color: T }}>{t("changeEmailCurrentLabel")}:</strong>{" "}
        <span style={{ fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace" }}>{user?.email || "—"}</span>
      </p>

      {pending && (
        <div
          className="mb-5 p-3 rounded-lg"
          style={{
            background: "rgba(245, 158, 11, 0.06)",
            border: "1px solid rgba(245, 158, 11, 0.25)",
          }}
        >
          <p className="text-xs mb-1" style={{ color: "#f59e0b", fontWeight: 600 }}>
            {t("changeEmailPendingTitle")}
          </p>
          <p className="text-sm" style={{ color: TS, lineHeight: 1.5 }}>
            {t("changeEmailPendingBody")}{" "}
            <span style={{ color: T, fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace" }}>{pending}</span>
          </p>
          <p className="text-xs mt-2" style={{ color: TD, lineHeight: 1.5 }}>
            {t("changeEmailPendingCancelHint")}
          </p>
        </div>
      )}

      <form onSubmit={onSubmit} className="space-y-4" style={{ maxWidth: 400 }}>
        <div>
          <label htmlFor="ce-new-email" style={labelStyle}>
            {t("changeEmailNewLabel")}
          </label>
          <input
            id="ce-new-email"
            type="email"
            autoComplete="email"
            value={newEmail}
            onChange={(e) => setNewEmail(e.target.value)}
            placeholder={t("changeEmailNewPlaceholder")}
            required
            style={inputStyle}
          />
        </div>
        <div>
          <label htmlFor="ce-password" style={labelStyle}>
            {t("changeEmailPasswordLabel")}
          </label>
          <input
            id="ce-password"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder={t("changeEmailPasswordPlaceholder")}
            required
            style={inputStyle}
          />
        </div>
        <button
          type="submit"
          disabled={submitting || !newEmail || !password}
          style={{
            padding: "10px 20px",
            borderRadius: 10,
            background: !submitting && newEmail && password ? "#fff" : "rgba(255,255,255,0.06)",
            color: !submitting && newEmail && password ? "#000" : "rgba(255,255,255,0.3)",
            border: "1px solid rgba(255,255,255,0.18)",
            fontSize: 13,
            fontWeight: 600,
            cursor: submitting || !newEmail || !password ? "not-allowed" : "pointer",
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
          }}
        >
          {submitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
          {t("changeEmailSubmit")}
        </button>
      </form>
    </div>
  );
}

// ── Notification preferences (logged-in users only) ───────────────
//
// Single toggle that controls whether engagement emails (comments
// and likes on the user's books) are sent to them. Backed by
// users.email_engagement_notifications. Optimistic local state so
// the switch flips instantly; reverts and toasts on PATCH failure.
function NotificationPrefsSection() {
  const { user, refetch } = useAuth();
  const { t } = useLanguage();
  const { toast } = useToast();
  // `?? true` matches the server's coercion (legacy NULL rows are
  // treated as opted-in); the column is .notNull() going forward but
  // a brand-new auth fetch may briefly resolve to undefined before
  // the field is populated.
  const serverValue = user?.emailEngagementNotifications ?? true;
  const [optimistic, setOptimistic] = useState<boolean | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const checked = optimistic ?? serverValue;

  const onChange = async (next: boolean) => {
    setOptimistic(next);
    setSubmitting(true);
    try {
      const res = await fetch("/api/auth/notification-prefs", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ emailEngagementNotifications: next }),
      });
      if (!res.ok) {
        toast({ title: t("notifyPrefsFailureToast"), variant: "destructive" });
        setOptimistic(null);
        setSubmitting(false);
        return;
      }
      toast({ title: t("notifyPrefsSavedToast") });
      await refetch();
      setOptimistic(null);
      setSubmitting(false);
    } catch {
      toast({ title: t("notifyPrefsFailureToast"), variant: "destructive" });
      setOptimistic(null);
      setSubmitting(false);
    }
  };

  if (!user) return null;

  return (
    <div
      className="mt-12 p-6 rounded-2xl"
      style={{ background: "rgba(255,255,255,0.02)", border: `1px solid ${B}` }}
    >
      <h3 className="text-sm font-bold mb-1" style={{ color: T }}>
        {t("notifyPrefsTitle")}
      </h3>
      <p className="text-xs mb-5" style={{ color: TS, lineHeight: 1.6 }}>
        {t("notifyPrefsSubtitle")}
      </p>

      <div
        className="flex items-start justify-between gap-6"
        style={{ maxWidth: 560 }}
      >
        <div style={{ flex: 1 }}>
          <p className="text-sm font-medium" style={{ color: T }}>
            {t("notifyPrefsEngagementLabel")}
          </p>
          <p className="text-xs mt-1" style={{ color: TS, lineHeight: 1.5 }}>
            {t("notifyPrefsEngagementHint")}
          </p>
        </div>
        <Switch
          checked={checked}
          disabled={submitting}
          onCheckedChange={onChange}
          aria-label={t("notifyPrefsEngagementLabel")}
        />
      </div>
    </div>
  );
}

// ── Change password (logged-in users only) ────────────────────────
//
// Inline form. Distinct from the forgot-password reset flow (which
// requires an email reset token): this is for users who already
// know their current password and want to rotate it. OAuth-only
// users (no passwordHash on file) see an informational notice
// instead — managing the password is the OAuth provider's job.
function ChangePasswordSection() {
  const { user } = useAuth();
  const { t } = useLanguage();
  const { toast } = useToast();
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const isPasswordUser = !!user?.hasPassword;

  const reset = () => {
    setCurrent("");
    setNext("");
    setConfirm("");
    setSubmitting(false);
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (next.length < 8) {
      toast({ title: t("changePasswordValidationLength"), variant: "destructive" });
      return;
    }
    if (next !== confirm) {
      toast({ title: t("changePasswordValidationMismatch"), variant: "destructive" });
      return;
    }
    if (next === current) {
      toast({ title: t("changePasswordValidationSame"), variant: "destructive" });
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch("/api/auth/password", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ currentPassword: current, newPassword: next }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        toast({
          title: t("changePasswordFailure"),
          description: data?.message || undefined,
          variant: "destructive",
        });
        setSubmitting(false);
        return;
      }
      toast({ title: t("changePasswordSuccess") });
      reset();
    } catch {
      toast({ title: t("changePasswordFailure"), variant: "destructive" });
      setSubmitting(false);
    }
  };

  if (!isPasswordUser) {
    return (
      <div
        className="mt-12 p-6 rounded-2xl"
        style={{ background: "rgba(255,255,255,0.02)", border: `1px solid ${B}` }}
      >
        <h3 className="text-sm font-bold mb-2" style={{ color: T }}>
          {t("changePasswordTitle")}
        </h3>
        <p className="text-sm" style={{ color: TS, lineHeight: 1.6 }}>
          {t("changePasswordOauthNotice")}
        </p>
      </div>
    );
  }

  const inputStyle: React.CSSProperties = {
    width: "100%",
    padding: "10px 12px",
    borderRadius: 8,
    background: "rgba(255,255,255,0.04)",
    border: `1px solid ${B}`,
    color: T,
    fontSize: 14,
    outline: "none",
  };
  const labelStyle: React.CSSProperties = {
    display: "block",
    fontSize: 12,
    fontWeight: 600,
    color: TS,
    marginBottom: 6,
  };

  return (
    <div
      className="mt-12 p-6 rounded-2xl"
      style={{ background: "rgba(255,255,255,0.02)", border: `1px solid ${B}` }}
    >
      <h3 className="text-sm font-bold mb-1" style={{ color: T }}>
        {t("changePasswordTitle")}
      </h3>
      <p className="text-xs mb-5" style={{ color: TS, lineHeight: 1.6 }}>
        {t("changePasswordSubtitle")}
      </p>
      <form onSubmit={onSubmit} className="space-y-4" style={{ maxWidth: 400 }}>
        <div>
          <label htmlFor="cp-current" style={labelStyle}>
            {t("changePasswordCurrentLabel")}
          </label>
          <input
            id="cp-current"
            type="password"
            autoComplete="current-password"
            value={current}
            onChange={(e) => setCurrent(e.target.value)}
            placeholder={t("changePasswordCurrentPlaceholder")}
            required
            style={inputStyle}
          />
        </div>
        <div>
          <label htmlFor="cp-new" style={labelStyle}>
            {t("changePasswordNewLabel")}
          </label>
          <input
            id="cp-new"
            type="password"
            autoComplete="new-password"
            minLength={8}
            value={next}
            onChange={(e) => setNext(e.target.value)}
            placeholder={t("changePasswordNewPlaceholder")}
            required
            style={inputStyle}
          />
        </div>
        <div>
          <label htmlFor="cp-confirm" style={labelStyle}>
            {t("changePasswordConfirmLabel")}
          </label>
          <input
            id="cp-confirm"
            type="password"
            autoComplete="new-password"
            minLength={8}
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            placeholder={t("changePasswordConfirmPlaceholder")}
            required
            style={inputStyle}
          />
        </div>
        <button
          type="submit"
          disabled={submitting || !current || next.length < 8 || next !== confirm}
          style={{
            padding: "10px 20px",
            borderRadius: 10,
            background:
              !submitting && current && next.length >= 8 && next === confirm
                ? "#fff"
                : "rgba(255,255,255,0.06)",
            color:
              !submitting && current && next.length >= 8 && next === confirm
                ? "#000"
                : "rgba(255,255,255,0.3)",
            border: "1px solid rgba(255,255,255,0.18)",
            fontSize: 13,
            fontWeight: 600,
            cursor: submitting || !current || next.length < 8 || next !== confirm
              ? "not-allowed"
              : "pointer",
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
          }}
        >
          {submitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
          {t("changePasswordSubmit")}
        </button>
      </form>
    </div>
  );
}

// ── Your data: GDPR Article 15 / 20 export ────────────────────────
//
// Two side-by-side cards (stacked on narrow viewports). Both call the
// same /api/me/export-data endpoint with a different `?format=` query
// param so they share the single rate limiter (sensitiveAuthLimiter,
// 5 req / 15 min) — neither button can be hammered around the limit
// by switching format mid-stream.
//
// Each card has its own loading state and toast handlers so a slow
// or failed download on one format doesn't visually contaminate the
// other.
//
// Download mechanics: fetch -> blob -> object-URL -> synthetic <a>
// click. This gives us control over the filename and prevents the
// browser from opening JSON / PDF inline as a new tab.
function YourDataSection() {
  const { t, lang } = useLanguage();
  const { toast } = useToast();
  const [busyFormat, setBusyFormat] = useState<"pdf" | "json" | null>(null);

  const download = async (format: "pdf" | "json") => {
    setBusyFormat(format);
    try {
      const params = format === "pdf"
        ? `?format=pdf&lang=${encodeURIComponent(lang)}`
        : `?format=json`;
      const res = await fetch(`/api/me/export-data${params}`, { credentials: "include" });
      if (res.status === 429) {
        toast({ title: t("yourDataRateLimited"), variant: "destructive" });
        return;
      }
      if (!res.ok) {
        toast({ title: t("yourDataDownloadFailure"), variant: "destructive" });
        return;
      }
      const blob = await res.blob();
      const today = new Date().toISOString().split("T")[0];
      const filename = format === "pdf"
        ? `plotzy-summary-${today}.pdf`
        : `plotzy-export-${today}.json`;
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast({ title: t(format === "pdf" ? "yourDataPdfSuccess" : "yourDataJsonSuccess") });
    } catch {
      toast({ title: t("yourDataDownloadFailure"), variant: "destructive" });
    } finally {
      setBusyFormat(null);
    }
  };

  return (
    <div
      className="mt-12 p-6 rounded-2xl"
      style={{ background: "rgba(255,255,255,0.02)", border: `1px solid ${B}` }}
    >
      <h3 className="text-sm font-bold mb-1" style={{ color: T }}>
        {t("yourDataTitle")}
      </h3>
      <p className="text-xs mb-5" style={{ color: TS, lineHeight: 1.6 }}>
        {t("yourDataSubtitle")}
      </p>

      <div className="flex flex-col sm:flex-row gap-3">
        <DataExportCard
          title={t("yourDataPdfTitle")}
          subtext={t("yourDataPdfSubtext")}
          icon={<FileText className="w-4 h-4" />}
          loading={busyFormat === "pdf"}
          disabled={busyFormat !== null}
          onClick={() => download("pdf")}
          loadingLabel={t("yourDataDownloadingLabel")}
        />
        <DataExportCard
          title={t("yourDataJsonTitle")}
          subtext={t("yourDataJsonSubtext")}
          icon={<Database className="w-4 h-4" />}
          loading={busyFormat === "json"}
          disabled={busyFormat !== null}
          onClick={() => download("json")}
          loadingLabel={t("yourDataDownloadingLabel")}
        />
      </div>
    </div>
  );
}

function DataExportCard({
  title,
  subtext,
  icon,
  loading,
  disabled,
  onClick,
  loadingLabel,
}: {
  title: string;
  subtext: string;
  icon: React.ReactNode;
  loading: boolean;
  disabled: boolean;
  onClick: () => void;
  loadingLabel: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      style={{
        flex: 1,
        textAlign: "left",
        padding: "16px 18px",
        borderRadius: 12,
        background: "rgba(255,255,255,0.03)",
        border: "1px solid rgba(255,255,255,0.10)",
        color: T,
        cursor: disabled ? (loading ? "wait" : "not-allowed") : "pointer",
        opacity: disabled && !loading ? 0.5 : 1,
        transition: "background 0.15s, border-color 0.15s",
        display: "flex",
        flexDirection: "column",
        gap: 8,
      }}
      onMouseEnter={(e) => {
        if (disabled) return;
        e.currentTarget.style.background = "rgba(255,255,255,0.06)";
        e.currentTarget.style.borderColor = "rgba(255,255,255,0.18)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = "rgba(255,255,255,0.03)";
        e.currentTarget.style.borderColor = "rgba(255,255,255,0.10)";
      }}
    >
      <div className="flex items-center gap-2" style={{ fontSize: 13, fontWeight: 600 }}>
        {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : icon}
        <span>{loading ? loadingLabel : title}</span>
      </div>
      <p style={{ fontSize: 12, color: TS, lineHeight: 1.5, margin: 0 }}>
        {subtext}
      </p>
    </button>
  );
}

// ── Danger zone: self-service account deletion ────────────────────
//
// GDPR Article 17 right-to-erasure surface. Lives at the bottom of
// the settings page so every signed-in user can find it from one
// obvious place. The destructive action is gated by a confirmation
// dialog with re-authentication (password for password users,
// typed phrase for OAuth-only users) so a borrowed session can't
// trigger deletion.
function DangerZoneSection() {
  const { user, refetch } = useAuth();
  const { t } = useLanguage();
  const { toast } = useToast();
  const [, navigate] = useLocation();
  const [open, setOpen] = useState(false);
  const [password, setPassword] = useState("");
  const [confirmPhrase, setConfirmPhrase] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // OAuth-only users have no passwordHash on the backend; the
  // /api/auth/user response includes a `hasPassword` boolean so the
  // dialog can pick the right re-auth flow without exposing the hash.
  const isPasswordUser = !!user?.hasPassword;

  const reset = () => {
    setPassword("");
    setConfirmPhrase("");
    setSubmitting(false);
  };

  const onConfirm = async () => {
    setSubmitting(true);
    try {
      const body = isPasswordUser ? { password } : { confirmPhrase };
      const res = await fetch("/api/auth/account", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        toast({
          title: t("accountDeleteFailure"),
          description: data?.message || undefined,
          variant: "destructive",
        });
        setSubmitting(false);
        return;
      }
      toast({ title: t("accountDeleteSuccess") });
      setOpen(false);
      reset();
      await refetch();
      navigate("/");
    } catch {
      toast({ title: t("accountDeleteFailure"), variant: "destructive" });
      setSubmitting(false);
    }
  };

  const canSubmit = isPasswordUser ? password.length > 0 : confirmPhrase.trim() === "DELETE MY ACCOUNT";

  return (
    <div
      className="mt-12 p-6 rounded-2xl"
      style={{ background: "rgba(220, 38, 38, 0.04)", border: "1px solid rgba(220, 38, 38, 0.18)" }}
    >
      <div className="flex items-center gap-2 mb-2">
        <AlertCircle className="w-4 h-4" style={{ color: "#f87171" }} />
        <h3 className="text-sm font-bold" style={{ color: "#f87171" }}>
          {t("accountDeleteSectionTitle")}
        </h3>
      </div>
      <p className="text-sm mb-4" style={{ color: TS, lineHeight: 1.6 }}>
        {t("accountDeleteSectionBody")}
      </p>
      <button
        type="button"
        onClick={() => setOpen(true)}
        style={{
          padding: "10px 18px",
          borderRadius: 10,
          background: "transparent",
          border: "1px solid rgba(220, 38, 38, 0.5)",
          color: "#f87171",
          fontSize: 13,
          fontWeight: 600,
          cursor: "pointer",
        }}
      >
        {t("accountDeleteButton")}
      </button>

      <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) reset(); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t("accountDeleteDialogTitle")}</DialogTitle>
            <DialogDescription>{t("accountDeleteDialogIntro")}</DialogDescription>
          </DialogHeader>

          <ul className="text-sm space-y-2 mb-3" style={{ color: "rgba(255,255,255,0.7)", paddingLeft: 18, listStyleType: "disc" }}>
            <li>{t("accountDeleteWarn1")}</li>
            <li>{t("accountDeleteWarn2")}</li>
            <li>{t("accountDeleteWarn3")}</li>
            <li>{t("accountDeleteWarn4")}</li>
            <li style={{ color: "#f87171", fontWeight: 600 }}>{t("accountDeleteWarn5")}</li>
          </ul>

          {isPasswordUser ? (
            <div>
              <label className="block text-xs font-semibold mb-1.5" style={{ color: TS }}>
                {t("accountDeletePasswordLabel")}
              </label>
              <input
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={t("accountDeletePasswordPlaceholder")}
                style={{
                  width: "100%",
                  padding: "10px 12px",
                  borderRadius: 8,
                  background: "rgba(255,255,255,0.04)",
                  border: "1px solid rgba(255,255,255,0.1)",
                  color: T,
                  fontSize: 14,
                  outline: "none",
                }}
              />
            </div>
          ) : (
            <div>
              <label className="block text-xs font-semibold mb-1.5" style={{ color: TS }}>
                {t("accountDeleteConfirmPhraseLabel")}
              </label>
              <input
                type="text"
                autoComplete="off"
                value={confirmPhrase}
                onChange={(e) => setConfirmPhrase(e.target.value)}
                placeholder={t("accountDeleteConfirmPhrasePlaceholder")}
                style={{
                  width: "100%",
                  padding: "10px 12px",
                  borderRadius: 8,
                  background: "rgba(255,255,255,0.04)",
                  border: "1px solid rgba(255,255,255,0.1)",
                  color: T,
                  fontSize: 14,
                  fontFamily: "monospace",
                  outline: "none",
                }}
              />
            </div>
          )}

          <DialogFooter className="mt-4 gap-2">
            <button
              type="button"
              onClick={() => { setOpen(false); reset(); }}
              disabled={submitting}
              style={{
                padding: "10px 18px",
                borderRadius: 10,
                background: "transparent",
                border: "1px solid rgba(255,255,255,0.18)",
                color: TS,
                fontSize: 13,
                fontWeight: 500,
                cursor: submitting ? "not-allowed" : "pointer",
              }}
            >
              {t("accountDeleteCancel")}
            </button>
            <button
              type="button"
              onClick={onConfirm}
              disabled={submitting || !canSubmit}
              style={{
                padding: "10px 18px",
                borderRadius: 10,
                background: canSubmit && !submitting ? "#dc2626" : "rgba(220, 38, 38, 0.3)",
                border: "1px solid #dc2626",
                color: "#fff",
                fontSize: 13,
                fontWeight: 600,
                cursor: submitting || !canSubmit ? "not-allowed" : "pointer",
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
              }}
            >
              {submitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              {t("accountDeleteConfirm")}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
