import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { SiGoogle, SiApple, SiFacebook } from "react-icons/si";
import { Linkedin } from "lucide-react";
import { Mail, Lock, Eye, EyeOff, User, X, Loader2, AlertCircle, Check, PenLine } from "lucide-react";
import { useLanguage } from "@/contexts/language-context";
import { useQueryClient } from "@tanstack/react-query";

interface AuthModalProps {
  open: boolean;
  onClose: () => void;
}

type Tab = "signin" | "signup";

const SF = "-apple-system, BlinkMacSystemFont, 'SF Pro Display', 'SF Pro Text', 'Helvetica Neue', sans-serif";

const C = {
  bg:       "#0a0a0a",
  card:     "#111111",
  border:   "rgba(255,255,255,0.08)",
  input:    "#1a1a1a",
  text:     "#f5f5f5",
  muted:    "rgba(255,255,255,0.38)",
  faint:    "rgba(255,255,255,0.14)",
  accent:   "#ffffff",
  accentFg: "#0a0a0a",
};

const inputBase: React.CSSProperties = {
  width: "100%",
  padding: "12px 14px 12px 42px",
  borderRadius: 10,
  border: `1px solid ${C.border}`,
  background: C.input,
  color: C.text,
  fontSize: 14,
  fontFamily: SF,
  outline: "none",
  boxSizing: "border-box",
  transition: "border-color 0.18s",
  letterSpacing: "-0.01em",
};

function InputField({
  icon: Icon, type = "text", placeholder, value, onChange, right, error, autoComplete,
}: {
  icon: React.ElementType; type?: string; placeholder: string;
  value: string; onChange: (v: string) => void;
  right?: React.ReactNode; error?: string; autoComplete?: string;
}) {
  const [focused, setFocused] = useState(false);
  return (
    <div style={{ position: "relative", width: "100%" }}>
      <div style={{
        position: "absolute", left: 13, top: "50%", transform: "translateY(-50%)",
        color: focused ? "rgba(255,255,255,0.65)" : C.muted,
        transition: "color 0.18s", pointerEvents: "none",
        display: "flex", alignItems: "center",
      }}>
        <Icon style={{ width: 15, height: 15 }} />
      </div>
      <input
        type={type} placeholder={placeholder} value={value}
        autoComplete={autoComplete}
        onChange={e => onChange(e.target.value)}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        style={{
          ...inputBase,
          borderColor: error ? "#e05555" : focused ? "rgba(255,255,255,0.28)" : C.border,
          paddingRight: right ? 44 : 14,
        }}
      />
      {right && (
        <div style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", display: "flex" }}>
          {right}
        </div>
      )}
      {error && (
        <div style={{ display: "flex", alignItems: "center", gap: 5, marginTop: 5 }}>
          <AlertCircle style={{ width: 11, height: 11, color: "#e05555" }} />
          <span style={{ fontFamily: SF, fontSize: 11, color: "#e05555" }}>{error}</span>
        </div>
      )}
    </div>
  );
}

function SocialBtn({
  icon: Icon, label, href, enabled,
}: {
  icon: React.ElementType; label: string; href: string; enabled: boolean;
}) {
  return (
    <button
      onClick={() => { window.location.href = href; }}
      title={!enabled ? `${label} — coming soon` : label}
      style={{
        flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 7,
        padding: "10px 10px",
        borderRadius: 10,
        border: `1px solid ${C.border}`,
        background: "rgba(255,255,255,0.04)",
        color: C.text,
        fontSize: 13, fontWeight: 500, fontFamily: SF,
        cursor: enabled ? "pointer" : "default",
        transition: "background 0.15s, border-color 0.15s",
        opacity: enabled ? 1 : 0.42,
        position: "relative",
        minWidth: 0,
        letterSpacing: "-0.01em",
      }}
      onMouseEnter={e => { if (enabled) { e.currentTarget.style.background = "rgba(255,255,255,0.08)"; e.currentTarget.style.borderColor = "rgba(255,255,255,0.14)"; } }}
      onMouseLeave={e => { e.currentTarget.style.background = "rgba(255,255,255,0.04)"; e.currentTarget.style.borderColor = C.border; }}
    >
      <Icon style={{ width: 15, height: 15, flexShrink: 0 }} />
      <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{label}</span>
      {!enabled && (
        <span style={{
          position: "absolute", top: 3, right: 4,
          fontSize: 8, fontFamily: SF, fontWeight: 600,
          color: C.muted, background: "rgba(255,255,255,0.06)",
          borderRadius: 3, padding: "1px 4px", letterSpacing: "0.04em",
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
  const [providers, setProviders] = useState({ google: false, apple: false, linkedin: false, facebook: false, email: true });
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!open) return;
    fetch("/api/auth/providers").then(r => r.json()).then(d => setProviders(d)).catch(() => {});
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
        backdropFilter: "blur(12px)",
        WebkitBackdropFilter: "blur(12px)",
        display: "flex", alignItems: "center", justifyContent: "center",
        padding: 20,
      }}
    >
      <div
        style={{
          background: C.bg,
          border: `1px solid rgba(255,255,255,0.1)`,
          borderRadius: 20,
          width: "100%",
          maxWidth: 400,
          maxHeight: "92vh",
          overflowY: "auto",
          boxShadow: "0 32px 80px rgba(0,0,0,0.9), 0 0 0 1px rgba(255,255,255,0.04)",
          direction: ar ? "rtl" : "ltr",
          color: C.text,
          fontFamily: SF,
        }}
      >
        {/* ── Header ── */}
        <div style={{
          padding: "20px 20px 0",
          borderBottom: `1px solid ${C.border}`,
        }}>
          {/* Logo row + close */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <div style={{
                width: 30, height: 30, borderRadius: 8,
                background: "#fff",
                display: "flex", alignItems: "center", justifyContent: "center",
              }}>
                <PenLine style={{ width: 15, height: 15, color: "#0a0a0a" }} />
              </div>
              <span style={{ fontFamily: SF, fontWeight: 700, fontSize: 15, color: C.text, letterSpacing: "-0.03em" }}>
                Plotzy
              </span>
            </div>
            <button
              onClick={onClose}
              style={{
                width: 28, height: 28, borderRadius: 7,
                border: `1px solid ${C.border}`,
                background: "rgba(255,255,255,0.04)",
                cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
                color: C.muted, transition: "background 0.15s",
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
                  color: tab === t.id ? C.text : C.muted,
                  borderBottom: `2px solid ${tab === t.id ? "rgba(255,255,255,0.9)" : "transparent"}`,
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

        {/* ── Body ── */}
        <div style={{ padding: "22px 20px 24px", display: "flex", flexDirection: "column", gap: 18 }}>

          {/* Social buttons */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
            <SocialBtn icon={SiGoogle}   label="Google"   href="/auth/google"   enabled={providers.google} />
            <SocialBtn icon={SiApple}    label="Apple"    href="/auth/apple"    enabled={providers.apple} />
            <SocialBtn icon={Linkedin}   label="LinkedIn" href="/auth/linkedin" enabled={providers.linkedin} />
            <SocialBtn icon={SiFacebook} label="Facebook" href="/auth/facebook" enabled={providers.facebook} />
          </div>

          {/* Divider */}
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ flex: 1, height: 1, background: C.border }} />
            <span style={{ fontFamily: SF, fontSize: 11, color: C.muted, letterSpacing: "0.02em" }}>
              {ar ? "أو بالبريد الإلكتروني" : "or with email"}
            </span>
            <div style={{ flex: 1, height: 1, background: C.border }} />
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {tab === "signup" && (
              <InputField icon={User} placeholder={ar ? "اسمك الكامل" : "Full name"}
                value={displayName} onChange={setDisplayName}
                error={fieldErrors.displayName} autoComplete="name" />
            )}
            <InputField icon={Mail} type="email" placeholder={ar ? "البريد الإلكتروني" : "Email address"}
              value={email} onChange={setEmail}
              error={fieldErrors.email} autoComplete="email" />
            <InputField icon={Lock} type={showPw ? "text" : "password"}
              placeholder={ar ? "كلمة المرور" : "Password"}
              value={password} onChange={setPassword}
              error={fieldErrors.password}
              autoComplete={tab === "signin" ? "current-password" : "new-password"}
              right={
                <button type="button" onClick={() => setShowPw(v => !v)}
                  style={{ background: "none", border: "none", cursor: "pointer", color: C.muted, display: "flex", padding: 0 }}>
                  {showPw ? <EyeOff style={{ width: 15, height: 15 }} /> : <Eye style={{ width: 15, height: 15 }} />}
                </button>
              }
            />
            {tab === "signup" && (
              <InputField icon={Lock} type={showPw ? "text" : "password"}
                placeholder={ar ? "تأكيد كلمة المرور" : "Confirm password"}
                value={confirmPw} onChange={setConfirmPw}
                error={fieldErrors.confirmPw} autoComplete="new-password" />
            )}

            {/* Remember / Forgot */}
            {tab === "signin" && (
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 2 }}>
                <label style={{ display: "flex", alignItems: "center", gap: 7, cursor: "pointer" }}>
                  <div
                    onClick={() => setRememberMe(v => !v)}
                    style={{
                      width: 16, height: 16, borderRadius: 4,
                      border: `1.5px solid ${rememberMe ? "rgba(255,255,255,0.7)" : C.border}`,
                      background: rememberMe ? "#fff" : "transparent",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      cursor: "pointer", flexShrink: 0, transition: "all 0.15s",
                    }}
                  >
                    {rememberMe && <Check style={{ width: 10, height: 10, color: "#0a0a0a" }} />}
                  </div>
                  <span style={{ fontFamily: SF, fontSize: 12, color: C.muted }}>
                    {ar ? "تذكّرني" : "Remember me"}
                  </span>
                </label>
                <button type="button"
                  style={{ background: "none", border: "none", cursor: "pointer", fontFamily: SF, fontSize: 12, color: "rgba(255,255,255,0.55)", padding: 0, fontWeight: 500 }}
                  onMouseEnter={e => (e.currentTarget.style.color = C.text)}
                  onMouseLeave={e => (e.currentTarget.style.color = "rgba(255,255,255,0.55)")}
                  onClick={() => setGlobalError(ar ? "ميزة استعادة كلمة المرور قيد التطوير." : "Password reset coming soon.")}
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
                width: "100%", padding: "12px",
                borderRadius: 10, border: "none",
                background: success ? "rgba(52,199,89,0.15)" : "#ffffff",
                color: success ? "#34c759" : "#0a0a0a",
                fontFamily: SF,
                fontSize: 14, fontWeight: 600,
                cursor: loading || success ? "not-allowed" : "pointer",
                display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                transition: "opacity 0.15s",
                opacity: loading ? 0.65 : 1,
                letterSpacing: "-0.02em",
                marginTop: 4,
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

          {/* Switch tab */}
          <p style={{ fontFamily: SF, fontSize: 12, textAlign: "center", color: C.muted, margin: 0 }}>
            {tab === "signin"
              ? (ar ? "ليس لديك حساب؟ " : "Don't have an account? ")
              : (ar ? "لديك حساب بالفعل؟ " : "Already have an account? ")}
            <button
              onClick={() => { setTab(tab === "signin" ? "signup" : "signin"); setGlobalError(""); setFieldErrors({}); }}
              style={{ background: "none", border: "none", cursor: "pointer", fontFamily: SF, color: "rgba(255,255,255,0.8)", fontWeight: 600, fontSize: 12, padding: 0, letterSpacing: "-0.01em" }}
              onMouseEnter={e => (e.currentTarget.style.color = "#fff")}
              onMouseLeave={e => (e.currentTarget.style.color = "rgba(255,255,255,0.8)")}
            >
              {tab === "signin" ? (ar ? "أنشئ حساباً" : "Create one") : (ar ? "سجّل الدخول" : "Sign in")}
            </button>
          </p>

          {/* Legal */}
          <p style={{ fontFamily: SF, fontSize: 10, textAlign: "center", color: "rgba(255,255,255,0.2)", margin: 0, lineHeight: 1.6 }}>
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
