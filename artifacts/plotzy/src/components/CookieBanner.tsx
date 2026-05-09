// Cookie consent banner — shown to first-time visitors. Implements
// GDPR + ePrivacy "prior consent" pattern: the user must accept,
// reject, or customize before any non-essential tracking is enabled.
//
// Persistence:
//   - localStorage key `plotzy_cookie_consent_v1` stores the full
//     consent object (timestamps, per-category booleans). Used by
//     the frontend to remember the user's choice.
//   - Cookie `plotzy_analytics_consent` mirrors only the analytics
//     decision so the server-side page-view middleware can read it
//     and skip inserts when consent is denied (default-deny: when
//     the cookie is absent, the server treats it as denied).
//
// Re-opening: the footer "Cookie Settings" link dispatches the
// `plotzy:open-cookie-settings` window event, which this component
// listens for and re-shows itself in customize mode.

import { useState, useEffect } from "react";
import { Link } from "wouter";
import { useLanguage } from "@/contexts/language-context";
import { Switch } from "@/components/ui/switch";

const LS_KEY = "plotzy_cookie_consent_v1";
const COOKIE_NAME = "plotzy_analytics_consent";
const COOKIE_MAX_AGE_DAYS = 365;
const OPEN_EVENT = "plotzy:open-cookie-settings";

type Consent = {
  essential: true;
  analytics: boolean;
  marketing: boolean;
  /** Unix ms when the user last made a decision. */
  timestamp: number;
  /** Bump if the consent shape changes; older versions re-prompt. */
  version: 1;
};

function readConsent(): Consent | null {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Consent;
    if (parsed.version !== 1) return null;
    return parsed;
  } catch {
    return null;
  }
}

function writeConsent(c: Consent): void {
  localStorage.setItem(LS_KEY, JSON.stringify(c));
  // Mirror analytics consent into a cookie so the api-server middleware
  // (page-view-tracker.ts) can gate the pageViews insert without needing
  // a separate request from the client.
  const value = c.analytics ? "accepted" : "denied";
  const maxAge = COOKIE_MAX_AGE_DAYS * 24 * 60 * 60;
  const secure = window.location.protocol === "https:" ? "; Secure" : "";
  document.cookie = `${COOKIE_NAME}=${value}; Max-Age=${maxAge}; Path=/; SameSite=Lax${secure}`;
}

/** Programmatic opener for the footer "Cookie Settings" link. */
export function openCookieSettings(): void {
  window.dispatchEvent(new Event(OPEN_EVENT));
}

export function CookieBanner() {
  const { lang, t } = useLanguage();
  const ar = lang === "ar";

  const [visible, setVisible] = useState(false);
  const [showCustomize, setShowCustomize] = useState(false);
  const [analytics, setAnalytics] = useState(false);
  const [marketing, setMarketing] = useState(false);

  useEffect(() => {
    const stored = readConsent();
    if (!stored) {
      setVisible(true);
    } else {
      setAnalytics(stored.analytics);
      setMarketing(stored.marketing);
    }

    const handleOpen = () => {
      const current = readConsent();
      if (current) {
        setAnalytics(current.analytics);
        setMarketing(current.marketing);
      }
      setShowCustomize(true);
      setVisible(true);
    };
    window.addEventListener(OPEN_EVENT, handleOpen);
    return () => window.removeEventListener(OPEN_EVENT, handleOpen);
  }, []);

  const acceptAll = () => {
    writeConsent({
      essential: true,
      analytics: true,
      marketing: true,
      timestamp: Date.now(),
      version: 1,
    });
    setAnalytics(true);
    setMarketing(true);
    setVisible(false);
    setShowCustomize(false);
  };

  const rejectAll = () => {
    writeConsent({
      essential: true,
      analytics: false,
      marketing: false,
      timestamp: Date.now(),
      version: 1,
    });
    setAnalytics(false);
    setMarketing(false);
    setVisible(false);
    setShowCustomize(false);
  };

  const saveCustom = () => {
    writeConsent({
      essential: true,
      analytics,
      marketing,
      timestamp: Date.now(),
      version: 1,
    });
    setVisible(false);
    setShowCustomize(false);
  };

  if (!visible) return null;

  return (
    <div
      role="dialog"
      aria-modal="false"
      aria-labelledby="cookie-banner-title"
      dir={ar ? "rtl" : "ltr"}
      style={{
        position: "fixed",
        left: 16,
        right: 16,
        bottom: 16,
        zIndex: 9998,
        maxWidth: 760,
        margin: "0 auto",
        background: "rgba(17, 17, 17, 0.97)",
        backdropFilter: "blur(20px)",
        WebkitBackdropFilter: "blur(20px)",
        border: "1px solid rgba(255,255,255,0.08)",
        borderRadius: 16,
        boxShadow: "0 20px 60px rgba(0,0,0,0.5), 0 4px 16px rgba(0,0,0,0.3)",
        color: "#f5f5f5",
        fontFamily: '-apple-system, "SF Pro Display", system-ui, sans-serif',
      }}
    >
      {!showCustomize ? (
        <div style={{ padding: "20px 22px" }}>
          <h2
            id="cookie-banner-title"
            style={{ fontSize: 15, fontWeight: 700, margin: 0, marginBottom: 8 }}
          >
            🍪 {t("cookieTitle")}
          </h2>
          <p
            style={{
              fontSize: 13,
              lineHeight: 1.55,
              color: "rgba(255,255,255,0.65)",
              margin: 0,
              marginBottom: 16,
            }}
          >
            {t("cookieBody")}{" "}
            <Link
              href="/privacy"
              style={{ color: "#fff", textDecoration: "underline", textUnderlineOffset: 2 }}
            >
              {t("cookiePrivacyLink")}
            </Link>
            .
          </p>
          <div
            style={{
              display: "flex",
              gap: 8,
              flexWrap: "wrap",
              justifyContent: ar ? "flex-start" : "flex-end",
            }}
          >
            <button
              type="button"
              onClick={() => setShowCustomize(true)}
              style={{
                padding: "9px 16px",
                background: "transparent",
                border: "1px solid rgba(255,255,255,0.18)",
                borderRadius: 10,
                color: "rgba(255,255,255,0.75)",
                fontSize: 13,
                fontWeight: 500,
                cursor: "pointer",
              }}
            >
              {t("cookieCustomize")}
            </button>
            <button
              type="button"
              onClick={rejectAll}
              style={{
                padding: "9px 16px",
                background: "transparent",
                border: "1px solid rgba(255,255,255,0.18)",
                borderRadius: 10,
                color: "rgba(255,255,255,0.75)",
                fontSize: 13,
                fontWeight: 500,
                cursor: "pointer",
              }}
            >
              {t("cookieRejectAll")}
            </button>
            <button
              type="button"
              onClick={acceptAll}
              style={{
                padding: "9px 18px",
                background: "#fff",
                border: "1px solid #fff",
                borderRadius: 10,
                color: "#0a0a0a",
                fontSize: 13,
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              {t("cookieAcceptAll")}
            </button>
          </div>
        </div>
      ) : (
        <div style={{ padding: "20px 22px" }}>
          <h2
            id="cookie-banner-title"
            style={{ fontSize: 15, fontWeight: 700, margin: 0, marginBottom: 16 }}
          >
            🍪 {t("cookieTitle")}
          </h2>

          <div style={{ display: "flex", flexDirection: "column", gap: 14, marginBottom: 18 }}>
            <CategoryRow
              title={t("cookieEssentialLabel")}
              body={t("cookieEssentialBody")}
              alwaysOnLabel={t("cookieAlwaysOn")}
              alwaysOn
              checked
              onChange={() => {}}
            />
            <CategoryRow
              title={t("cookieAnalyticsLabel")}
              body={t("cookieAnalyticsBody")}
              checked={analytics}
              onChange={setAnalytics}
            />
            <CategoryRow
              title={t("cookieMarketingLabel")}
              body={t("cookieMarketingBody")}
              checked={marketing}
              onChange={setMarketing}
            />
          </div>

          <div
            style={{
              display: "flex",
              gap: 8,
              flexWrap: "wrap",
              justifyContent: ar ? "flex-start" : "flex-end",
            }}
          >
            <button
              type="button"
              onClick={rejectAll}
              style={{
                padding: "9px 16px",
                background: "transparent",
                border: "1px solid rgba(255,255,255,0.18)",
                borderRadius: 10,
                color: "rgba(255,255,255,0.75)",
                fontSize: 13,
                fontWeight: 500,
                cursor: "pointer",
              }}
            >
              {t("cookieRejectAll")}
            </button>
            <button
              type="button"
              onClick={acceptAll}
              style={{
                padding: "9px 16px",
                background: "transparent",
                border: "1px solid rgba(255,255,255,0.18)",
                borderRadius: 10,
                color: "rgba(255,255,255,0.75)",
                fontSize: 13,
                fontWeight: 500,
                cursor: "pointer",
              }}
            >
              {t("cookieAcceptAll")}
            </button>
            <button
              type="button"
              onClick={saveCustom}
              style={{
                padding: "9px 18px",
                background: "#fff",
                border: "1px solid #fff",
                borderRadius: 10,
                color: "#0a0a0a",
                fontSize: 13,
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              {t("cookieSavePrefs")}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function CategoryRow({
  title,
  body,
  alwaysOnLabel,
  alwaysOn,
  checked,
  onChange,
}: {
  title: string;
  body: string;
  alwaysOnLabel?: string;
  alwaysOn?: boolean;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "flex-start",
        gap: 14,
        padding: "12px 14px",
        background: "rgba(255,255,255,0.025)",
        border: "1px solid rgba(255,255,255,0.06)",
        borderRadius: 10,
      }}
    >
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 4 }}>{title}</div>
        <div
          style={{
            fontSize: 11.5,
            lineHeight: 1.5,
            color: "rgba(255,255,255,0.55)",
          }}
        >
          {body}
        </div>
      </div>
      <div style={{ flexShrink: 0, paddingTop: 2 }}>
        {alwaysOn ? (
          <span
            style={{
              fontSize: 10,
              fontWeight: 600,
              padding: "4px 8px",
              borderRadius: 100,
              background: "rgba(34,197,94,0.12)",
              border: "1px solid rgba(34,197,94,0.25)",
              color: "#4ade80",
              textTransform: "uppercase",
              letterSpacing: "0.06em",
              whiteSpace: "nowrap",
            }}
          >
            {alwaysOnLabel ?? "Always on"}
          </span>
        ) : (
          <Switch checked={checked} onCheckedChange={onChange} />
        )}
      </div>
    </div>
  );
}
