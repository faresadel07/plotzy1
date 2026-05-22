// Cookie consent banner. Pinned to the bottom of the viewport,
// stretches the full screen width like the Mozilla banner the rest
// of the site is inspired by. Solid black so it never blends with
// content underneath, never decorative (no emoji, no em-dashes),
// and the buttons sit on the right (or the left in RTL) so the
// reading order matches the visual order. Implements GDPR + ePrivacy
// "prior consent": the user must accept, reject, or customise before
// any non-essential tracking runs.
//
// Persistence:
//   - localStorage key `plotzy_cookie_consent_v1` stores the full
//     consent object (timestamps, per-category booleans). The
//     frontend reads this on every visit to decide whether to show.
//   - Cookie `plotzy_analytics_consent` mirrors only the analytics
//     decision so the server-side page-view middleware can read it
//     and skip inserts when consent is denied (default-deny: when
//     the cookie is absent, the server treats it as denied).
//
// Re-opening: the footer "Cookie Settings" link dispatches the
// `plotzy:open-cookie-settings` window event, which this component
// listens for and re-shows itself in customise mode.

import { useState, useEffect } from "react";
import { Link } from "wouter";
import { useLanguage } from "@/contexts/language-context";
import { Switch } from "@/components/ui/switch";

const LS_KEY = "plotzy_cookie_consent_v1";
const COOKIE_NAME = "plotzy_analytics_consent";
const COOKIE_MAX_AGE_DAYS = 365;
const OPEN_EVENT = "plotzy:open-cookie-settings";

const SF =
  '-apple-system, BlinkMacSystemFont, "SF Pro Display", "SF Pro Text", "Helvetica Neue", "Segoe UI", Arial, sans-serif';

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
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 9998,
        background: "#000",
        borderTop: "1px solid rgba(255,255,255,0.10)",
        boxShadow: "0 -8px 28px rgba(0,0,0,0.35)",
        color: "#fff",
        fontFamily: SF,
      }}
    >
      <div
        style={{
          maxWidth: 1280,
          margin: "0 auto",
          padding: "20px clamp(20px, 4vw, 40px)",
        }}
      >
        {!showCustomize ? (
          <div
            style={{
              display: "flex",
              gap: 24,
              alignItems: "flex-start",
              flexWrap: "wrap",
              justifyContent: "space-between",
            }}
          >
            <div style={{ flex: "1 1 360px", minWidth: 0 }}>
              <h2
                id="cookie-banner-title"
                style={{
                  fontSize: 16,
                  fontWeight: 600,
                  letterSpacing: "-0.01em",
                  margin: 0,
                  marginBottom: 6,
                }}
              >
                {t("cookieTitle")}
              </h2>
              <p
                style={{
                  fontSize: 13.5,
                  lineHeight: 1.6,
                  color: "rgba(255,255,255,0.62)",
                  margin: 0,
                }}
              >
                {t("cookieBody")}{" "}
                <Link
                  href="/privacy"
                  style={{
                    color: "#fff",
                    textDecoration: "underline",
                    textUnderlineOffset: 2,
                  }}
                >
                  {t("cookiePrivacyLink")}
                </Link>
                .
              </p>
            </div>

            <div
              style={{
                display: "flex",
                gap: 8,
                flexWrap: "wrap",
                alignItems: "center",
                flexShrink: 0,
              }}
            >
              <button
                type="button"
                onClick={() => setShowCustomize(true)}
                style={ghostBtn}
              >
                {t("cookieCustomize")}
              </button>
              <button type="button" onClick={rejectAll} style={ghostBtn}>
                {t("cookieRejectAll")}
              </button>
              <button type="button" onClick={acceptAll} style={solidBtn}>
                {t("cookieAcceptAll")}
              </button>
            </div>
          </div>
        ) : (
          <div>
            <h2
              id="cookie-banner-title"
              style={{
                fontSize: 16,
                fontWeight: 600,
                letterSpacing: "-0.01em",
                margin: 0,
                marginBottom: 16,
              }}
            >
              {t("cookieTitle")}
            </h2>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
                gap: 10,
                marginBottom: 16,
              }}
            >
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
              <button type="button" onClick={rejectAll} style={ghostBtn}>
                {t("cookieRejectAll")}
              </button>
              <button type="button" onClick={acceptAll} style={ghostBtn}>
                {t("cookieAcceptAll")}
              </button>
              <button type="button" onClick={saveCustom} style={solidBtn}>
                {t("cookieSavePrefs")}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

const ghostBtn: React.CSSProperties = {
  padding: "10px 16px",
  background: "transparent",
  border: "1px solid rgba(255,255,255,0.20)",
  borderRadius: 10,
  color: "rgba(255,255,255,0.85)",
  fontSize: 13.5,
  fontWeight: 500,
  fontFamily: "inherit",
  cursor: "pointer",
  transition: "background 120ms ease, border-color 120ms ease",
};

const solidBtn: React.CSSProperties = {
  padding: "10px 18px",
  background: "#fff",
  border: "1px solid #fff",
  borderRadius: 10,
  color: "#000",
  fontSize: 13.5,
  fontWeight: 600,
  fontFamily: "inherit",
  cursor: "pointer",
};

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
        background: "rgba(255,255,255,0.04)",
        border: "1px solid rgba(255,255,255,0.08)",
        borderRadius: 10,
      }}
    >
      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            fontSize: 13,
            fontWeight: 600,
            marginBottom: 4,
            color: "#fff",
          }}
        >
          {title}
        </div>
        <div
          style={{
            fontSize: 11.5,
            lineHeight: 1.55,
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
              background: "rgba(255,255,255,0.10)",
              border: "1px solid rgba(255,255,255,0.18)",
              color: "rgba(255,255,255,0.85)",
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
