import { useState, useEffect, useId } from "react";
import { createPortal } from "react-dom";
import { Mail, Lock, Eye, EyeOff, User, X, Loader2, AlertCircle, Check } from "lucide-react";
import { useLanguage } from "@/contexts/language-context";
import { useQueryClient } from "@tanstack/react-query";

interface AuthModalProps {
  open: boolean;
  onClose: () => void;
}

type Tab = "signin" | "signup" | "forgot";

const SF = "-apple-system, BlinkMacSystemFont, 'SF Pro Display', 'SF Pro Text', 'Helvetica Neue', sans-serif";

const labelStyle: React.CSSProperties = {
  fontFamily: SF,
  fontSize: 13,
  fontWeight: 500,
  color: "rgba(255,255,255,0.7)",
  letterSpacing: "-0.01em",
  marginBottom: 6,
  display: "block",
};

function getInputStyle(): React.CSSProperties {
  return {
    flex: 1,
    background: "transparent",
    border: "none",
    outline: "none",
    color: "rgba(255,255,255,0.88)",
    fontSize: 14,
    fontFamily: SF,
    letterSpacing: "-0.01em",
  };
}

function getWrapStyle(focused: boolean, hasError?: boolean): React.CSSProperties {
  return {
    display: "flex",
    alignItems: "center",
    gap: 8,
    border: `1px solid ${hasError ? "#e05555" : focused ? "rgba(255,255,255,0.28)" : "rgba(255,255,255,0.1)"}`,
    borderRadius: 10,
    padding: "0 14px",
    height: 46,
    background: "rgba(255,255,255,0.04)",
    transition: "border-color 0.18s",
  };
}

function FieldInput({
  label, icon: Icon, type = "text", placeholder, value, onChange, error, autoComplete, rightSlot,
}: {
  label: string;
  icon: React.ElementType;
  type?: string;
  placeholder: string;
  value: string;
  onChange: (v: string) => void;
  error?: string;
  autoComplete?: string;
  rightSlot?: React.ReactNode;
}) {
  const [focused, setFocused] = useState(false);
  const inputId = useId();
  const errorId = useId();
  return (
    <div style={{ display: "flex", flexDirection: "column" }}>
      <label htmlFor={inputId} style={labelStyle}>{label}</label>
      <div style={getWrapStyle(focused, !!error)}>
        <Icon style={{ width: 16, height: 16, color: "rgba(255,255,255,0.35)", flexShrink: 0 }} aria-hidden="true" />
        <input
          id={inputId}
          type={type}
          placeholder={placeholder}
          value={value}
          autoComplete={autoComplete}
          aria-invalid={!!error}
          aria-describedby={error ? errorId : undefined}
          onChange={e => onChange(e.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          style={getInputStyle()}
        />
        {rightSlot}
      </div>
      {error && (
        <div id={errorId} style={{ display: "flex", alignItems: "center", gap: 5, marginTop: 5 }}>
          <AlertCircle style={{ width: 11, height: 11, color: "#e05555" }} aria-hidden="true" />
          <span style={{ fontFamily: SF, fontSize: 11, color: "#e05555" }}>{error}</span>
        </div>
      )}
    </div>
  );
}

function SocialBtn({ src, alt, label, enabled, href }: { src: string; alt: string; label: string; enabled: boolean; href: string }) {
  return (
    <button
      onClick={() => { if (enabled) window.location.href = href; }}
      style={{
        width: "100%",
        height: 46,
        display: "flex", alignItems: "center", justifyContent: "center", gap: 10,
        border: "1px solid rgba(255,255,255,0.1)",
        borderRadius: 10,
        background: "rgba(255,255,255,0.04)",
        color: "rgba(255,255,255,0.75)",
        fontFamily: SF,
        fontSize: 13.5, fontWeight: 500,
        cursor: enabled ? "pointer" : "default",
        opacity: enabled ? 1 : 0.45,
        transition: "background 0.15s, border-color 0.15s",
        position: "relative",
        letterSpacing: "-0.01em",
      }}
      onMouseEnter={e => { if (enabled) { e.currentTarget.style.background = "rgba(255,255,255,0.08)"; e.currentTarget.style.borderColor = "rgba(255,255,255,0.18)"; } }}
      onMouseLeave={e => { e.currentTarget.style.background = "rgba(255,255,255,0.04)"; e.currentTarget.style.borderColor = "rgba(255,255,255,0.1)"; }}
    >
      <img src={src} alt={alt} style={{ width: 18, height: 18, objectFit: "contain" }} />
      {label}
      {!enabled && (
        <span style={{
          position: "absolute", top: 3, right: 5,
          fontSize: 8, fontWeight: 700, fontFamily: SF,
          color: "rgba(255,255,255,0.35)", background: "rgba(255,255,255,0.06)",
          borderRadius: 3, padding: "1px 5px", letterSpacing: "0.05em",
          textTransform: "uppercase",
        }}>Soon</span>
      )}
    </button>
  );
}

export function AuthModal({ open, onClose }: AuthModalProps) {
  const { lang } = useLanguage();
  const qc = useQueryClient();
  const ar = lang === "ar";

  const [tab, setTab] = useState<Tab>("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPw, setConfirmPw] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [loading, setLoading] = useState(false);
  const [globalError, setGlobalError] = useState("");
  const [success, setSuccess] = useState(false);
  const [providers, setProviders] = useState({ google: false, apple: false, email: true });
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [forgotEmail, setForgotEmail] = useState("");
  const [forgotSent, setForgotSent] = useState(false);
  const [forgotLoading, setForgotLoading] = useState(false);

  useEffect(() => {
    if (!open) return;
    // Cache-bust so neither the browser's HTTP cache nor a stale Service
    // Worker can return an old {google:false} response. Also set
    // cache: "no-store" explicitly for belt-and-suspenders.
    fetch(`/api/auth/providers?t=${Date.now()}`, { cache: "no-store" })
      .then(r => r.json())
      .then(d => setProviders(d))
      .catch(() => {});
    setGlobalError(""); setSuccess(false); setFieldErrors({});
    setEmail(""); setPassword(""); setConfirmPw(""); setDisplayName("");
  }, [open]);

  const validate = (): boolean => {
    const errs: Record<string, string> = {};
    if (!email.includes("@")) errs.email = ar ? "بريد إلكتروني غير صالح" : "Invalid email address";
    if (password.length < 8) errs.password = ar ? "8 أحرف على الأقل" : "At least 8 characters";
    if (tab === "signup" && password !== confirmPw) errs.confirmPw = ar ? "كلمتا المرور غير متطابقتين" : "Passwords don't match";
    if (tab === "signup" && !displayName.trim()) errs.displayName = ar ? "الاسم مطلوب" : "Name is required";
    setFieldErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    setGlobalError(""); setLoading(true);
    try {
      const endpoint = tab === "signin" ? "/api/auth/login" : "/api/auth/register";
      const body: any = { email, password };
      if (tab === "signup") body.displayName = displayName;
      const res = await fetch(endpoint, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body), credentials: "include" });
      const data = await res.json();
      if (!res.ok) {
        setGlobalError(data.message || (ar ? "حدث خطأ ما" : "Something went wrong"));
      } else {
        setSuccess(true);
        qc.invalidateQueries({ queryKey: ["/api/auth/user"] });
        setTimeout(() => onClose(), 900);
      }
    } catch {
      setGlobalError(ar ? "تعذّر الاتصال بالخادم" : "Could not reach the server");
    } finally {
      setLoading(false);
    }
  };

  if (!open) return null;

  const modal = (
    <div
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
      style={{
        position: "fixed", inset: 0, zIndex: 99999,
        background: "rgba(0,0,0,0.75)",
        backdropFilter: "blur(14px)",
        WebkitBackdropFilter: "blur(14px)",
        display: "flex", alignItems: "center", justifyContent: "center",
        padding: 20,
      }}
    >
      <div
        style={{
          background: "#0e0e0e",
          border: "1px solid rgba(255,255,255,0.09)",
          borderRadius: 22,
          width: "100%",
          maxWidth: 420,
          maxHeight: "94vh",
          overflowY: "auto",
          boxShadow: "0 40px 100px rgba(0,0,0,0.95), 0 0 0 1px rgba(255,255,255,0.04)",
          direction: ar ? "rtl" : "ltr",
          fontFamily: SF,
        }}
      >
        {/* Header */}
        <div style={{ padding: "22px 22px 0", borderBottom: "1px solid rgba(255,255,255,0.07)" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 22 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
              <img
                src={`${import.meta.env.BASE_URL}plotzy-logo.png`}
                alt="Plotzy"
                style={{ width: 32, height: 32, objectFit: "contain", borderRadius: 7, filter: "invert(1)" }}
              />
              <span style={{ fontWeight: 700, fontSize: 16, color: "#f5f5f5", letterSpacing: "-0.03em" }}>Plotzy</span>
            </div>
            <button
              onClick={onClose}
              aria-label={ar ? "إغلاق" : "Close sign in"}
              style={{
                width: 28, height: 28, borderRadius: 7,
                border: "1px solid rgba(255,255,255,0.09)",
                background: "rgba(255,255,255,0.04)",
                cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
                color: "rgba(255,255,255,0.4)", transition: "background 0.15s",
              }}
              onMouseEnter={e => (e.currentTarget.style.background = "rgba(255,255,255,0.09)")}
              onMouseLeave={e => (e.currentTarget.style.background = "rgba(255,255,255,0.04)")}
            >
              <X style={{ width: 13, height: 13 }} />
            </button>
          </div>

          {/* Tabs */}
          <div style={{ display: "flex" }}>
            {([
              { id: "signin",  label: ar ? "تسجيل الدخول" : "Sign In" },
              { id: "signup",  label: ar ? "إنشاء حساب"  : "Create Account" },
            ] as const).map(t => (
              <button
                key={t.id}
                onClick={() => { setTab(t.id); setGlobalError(""); setFieldErrors({}); }}
                style={{
                  flex: 1, padding: "10px 0",
                  background: "transparent", border: "none", cursor: "pointer",
                  fontFamily: SF,
                  fontSize: 13.5,
                  fontWeight: tab === t.id ? 600 : 400,
                  color: tab === t.id ? "#f5f5f5" : "rgba(255,255,255,0.38)",
                  borderBottom: `2px solid ${tab === t.id ? "rgba(255,255,255,0.85)" : "transparent"}`,
                  transition: "all 0.18s",
                  marginBottom: -1,
                  letterSpacing: "-0.02em",
                }}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>

        {/* Body */}
        <div style={{ padding: "24px 22px 26px", display: "flex", flexDirection: "column", gap: 0 }}>
          <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            {tab === "signup" && (
              <FieldInput
                label={ar ? "الاسم الكامل" : "Full name"}
                icon={User}
                placeholder={ar ? "اكتب اسمك" : "Enter your name"}
                value={displayName} onChange={setDisplayName}
                error={fieldErrors.displayName} autoComplete="name"
              />
            )}

            <FieldInput
              label={ar ? "البريد الإلكتروني" : "Email"}
              icon={Mail}
              type="email"
              placeholder={ar ? "أدخل بريدك الإلكتروني" : "Enter your email"}
              value={email} onChange={setEmail}
              error={fieldErrors.email} autoComplete="email"
            />

            <FieldInput
              label={ar ? "كلمة المرور" : "Password"}
              icon={Lock}
              type={showPw ? "text" : "password"}
              placeholder={ar ? "أدخل كلمة مرورك" : "Enter your password"}
              value={password} onChange={setPassword}
              error={fieldErrors.password}
              autoComplete={tab === "signin" ? "current-password" : "new-password"}
              rightSlot={
                <button type="button" onClick={() => setShowPw(v => !v)}
                  aria-label={showPw ? (ar ? "إخفاء كلمة المرور" : "Hide password") : (ar ? "إظهار كلمة المرور" : "Show password")}
                  aria-pressed={showPw}
                  style={{ background: "none", border: "none", cursor: "pointer", color: "rgba(255,255,255,0.35)", display: "flex", padding: 0, flexShrink: 0 }}>
                  {showPw ? <EyeOff style={{ width: 15, height: 15 }} /> : <Eye style={{ width: 15, height: 15 }} />}
                </button>
              }
            />

            {tab === "signup" && (
              <FieldInput
                label={ar ? "تأكيد كلمة المرور" : "Confirm password"}
                icon={Lock}
                type={showPw ? "text" : "password"}
                placeholder={ar ? "أعد إدخال كلمة المرور" : "Re-enter your password"}
                value={confirmPw} onChange={setConfirmPw}
                error={fieldErrors.confirmPw} autoComplete="new-password"
              />
            )}

            {/* Remember / Forgot */}
            {tab === "signin" && (
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 2 }}>
                <label style={{ display: "flex", alignItems: "center", gap: 7, cursor: "pointer" }}>
                  <div
                    onClick={() => setRememberMe(v => !v)}
                    style={{
                      width: 16, height: 16, borderRadius: 4,
                      border: `1.5px solid ${rememberMe ? "rgba(255,255,255,0.7)" : "rgba(255,255,255,0.18)"}`,
                      background: rememberMe ? "#fff" : "transparent",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      cursor: "pointer", flexShrink: 0, transition: "all 0.15s",
                    }}
                  >
                    {rememberMe && <Check style={{ width: 10, height: 10, color: "#0a0a0a" }} />}
                  </div>
                  <span style={{ fontFamily: SF, fontSize: 12.5, color: "rgba(255,255,255,0.45)" }}>
                    {ar ? "تذكّرني" : "Remember me"}
                  </span>
                </label>
                <button type="button"
                  onClick={() => { setTab("forgot"); setForgotEmail(email); setForgotSent(false); setGlobalError(""); }}
                  style={{ background: "none", border: "none", cursor: "pointer", fontFamily: SF, fontSize: 12.5, color: "rgba(255,255,255,0.4)", padding: 0 }}
                  onMouseEnter={e => { e.currentTarget.style.color = "#fff"; }}
                  onMouseLeave={e => { e.currentTarget.style.color = "rgba(255,255,255,0.4)"; }}
                >
                  {ar ? "نسيت كلمة المرور؟" : "Forgot password?"}
                </button>
              </div>
            )}

            {/* Global error */}
            {globalError && (
              <div style={{
                display: "flex", alignItems: "center", gap: 8,
                padding: "10px 13px", borderRadius: 10,
                background: "rgba(224,85,85,0.1)", border: "1px solid rgba(224,85,85,0.2)",
              }}>
                <AlertCircle style={{ width: 13, height: 13, color: "#e05555", flexShrink: 0 }} />
                <span style={{ fontFamily: SF, fontSize: 12.5, color: "#e87777" }}>{globalError}</span>
              </div>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={loading || success}
              style={{
                width: "100%", height: 46,
                borderRadius: 10, border: "none",
                background: success ? "rgba(52,199,89,0.15)" : "#ffffff",
                color: success ? "#34c759" : "#0a0a0a",
                fontFamily: SF,
                fontSize: 14.5, fontWeight: 600,
                cursor: loading || success ? "not-allowed" : "pointer",
                display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                transition: "opacity 0.15s",
                opacity: loading ? 0.65 : 1,
                letterSpacing: "-0.02em",
                marginTop: 6,
              }}
              onMouseEnter={e => { if (!loading && !success) e.currentTarget.style.opacity = "0.88"; }}
              onMouseLeave={e => { e.currentTarget.style.opacity = loading ? "0.65" : "1"; }}
            >
              {loading ? (
                <><Loader2 style={{ width: 15, height: 15, animation: "spin 1s linear infinite" }} /> {ar ? "جارٍ..." : "Please wait…"}</>
              ) : success ? (
                <><Check style={{ width: 15, height: 15 }} /> {ar ? "تم بنجاح!" : "Success!"}</>
              ) : tab === "signin" ? (
                ar ? "تسجيل الدخول" : "Sign In"
              ) : (
                ar ? "إنشاء الحساب" : "Create Account"
              )}
            </button>
          </form>

          {/* Social buttons */}
          <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 18 }}>
            <SocialBtn
              src="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 48 48'%3E%3Cpath fill='%23EA4335' d='M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z'/%3E%3Cpath fill='%234285F4' d='M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z'/%3E%3Cpath fill='%23FBBC05' d='M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z'/%3E%3Cpath fill='%2334A853' d='M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z'/%3E%3C/svg%3E"
              alt="Google" label={ar ? "المتابعة عبر Google" : "Continue with Google"}
              href="/auth/google" enabled={providers.google}
            />
            {providers.apple && (
              <SocialBtn
                src="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='white'%3E%3Cpath d='M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z'/%3E%3C/svg%3E"
                alt="Apple" label={ar ? "المتابعة عبر Apple" : "Continue with Apple"}
                href="/auth/apple" enabled={providers.apple}
              />
            )}
          </div>

          {/* Forgot Password Form */}
          {tab === "forgot" && (
            <div style={{ marginTop: 20 }}>
              {!forgotSent ? (
                <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                  <p style={{ fontFamily: SF, fontSize: 13, color: "rgba(255,255,255,0.5)", lineHeight: 1.6, margin: 0 }}>
                    {ar ? "أدخل بريدك الإلكتروني وسنرسل لك رابط لإعادة تعيين كلمة المرور" : "Enter your email and we'll send you a link to reset your password"}
                  </p>
                  <label htmlFor="forgot-email" className="sr-only">{ar ? "البريد الإلكتروني" : "Email address"}</label>
                  <input id="forgot-email" value={forgotEmail} onChange={e => setForgotEmail(e.target.value)} placeholder={ar ? "البريد الإلكتروني" : "Email address"} type="email" autoComplete="email"
                    aria-label={ar ? "البريد الإلكتروني" : "Email address"}
                    style={{ width: "100%", padding: "12px 14px", borderRadius: 10, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)", color: "#fff", fontFamily: SF, fontSize: 14, outline: "none", boxSizing: "border-box" }} />
                  <button disabled={forgotLoading || !forgotEmail.includes("@")}
                    onClick={async () => {
                      setForgotLoading(true);
                      try {
                        await fetch("/api/auth/forgot-password", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email: forgotEmail }) });
                        setForgotSent(true);
                      } catch {} finally { setForgotLoading(false); }
                    }}
                    style={{ width: "100%", padding: "12px 0", borderRadius: 10, background: "#fff", color: "#000", fontFamily: SF, fontSize: 14, fontWeight: 600, border: "none", cursor: "pointer", opacity: forgotLoading ? 0.5 : 1 }}>
                    {forgotLoading ? (ar ? "جارٍ الإرسال..." : "Sending...") : (ar ? "إرسال رابط إعادة التعيين" : "Send Reset Link")}
                  </button>
                </div>
              ) : (
                <div style={{ textAlign: "center", padding: "20px 0" }}>
                  <div style={{ width: 48, height: 48, borderRadius: 12, background: "rgba(74,222,128,0.1)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px" }}>
                    <span style={{ fontSize: 24 }}>✓</span>
                  </div>
                  <p style={{ fontFamily: SF, fontSize: 15, fontWeight: 600, color: "#fff", marginBottom: 8 }}>
                    {ar ? "تم إرسال الرابط!" : "Reset link sent!"}
                  </p>
                  <p style={{ fontFamily: SF, fontSize: 13, color: "rgba(255,255,255,0.4)", lineHeight: 1.6 }}>
                    {ar ? `تحقق من بريدك ${forgotEmail}` : `Check your inbox at ${forgotEmail}`}
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Switch tab */}
          <p style={{ fontFamily: SF, fontSize: 12.5, textAlign: "center", color: "rgba(255,255,255,0.35)", margin: "20px 0 0" }}>
            {tab === "forgot" ? (
              <button onClick={() => { setTab("signin"); setGlobalError(""); }} style={{ background: "none", border: "none", cursor: "pointer", fontFamily: SF, color: "rgba(255,255,255,0.75)", fontWeight: 600, fontSize: 12.5, padding: 0 }}>
                {ar ? "← العودة لتسجيل الدخول" : "← Back to sign in"}
              </button>
            ) : (
              <>
                {tab === "signin" ? (ar ? "ليس لديك حساب؟ " : "Don't have an account? ") : (ar ? "لديك حساب بالفعل؟ " : "Already have an account? ")}
                <button
                  onClick={() => { setTab(tab === "signin" ? "signup" : "signin"); setGlobalError(""); setFieldErrors({}); }}
                  style={{ background: "none", border: "none", cursor: "pointer", fontFamily: SF, color: "rgba(255,255,255,0.75)", fontWeight: 600, fontSize: 12.5, padding: 0, letterSpacing: "-0.01em" }}
                  onMouseEnter={e => (e.currentTarget.style.color = "#fff")}
                  onMouseLeave={e => (e.currentTarget.style.color = "rgba(255,255,255,0.75)")}
                >
                  {tab === "signin" ? (ar ? "أنشئ حساباً" : "Create one") : (ar ? "سجّل الدخول" : "Sign in")}
                </button>
              </>
            )}
          </p>

          {/* Legal */}
          <p style={{ fontFamily: SF, fontSize: 10.5, textAlign: "center", color: "rgba(255,255,255,0.18)", margin: "10px 0 0", lineHeight: 1.6 }}>
            {ar
              ? "بالمتابعة، توافق على شروط الخدمة وسياسة الخصوصية الخاصة بـ Plotzy."
              : "By continuing, you agree to Plotzy's Terms of Service and Privacy Policy."}
          </p>
        </div>
      </div>
    </div>
  );

  return createPortal(modal, document.body);
}
