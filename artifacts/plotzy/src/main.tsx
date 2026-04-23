import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
import { initSentry } from "./lib/sentry";

// ── One-time cleanup: force-unregister any stale Service Worker the
// browser cached from an earlier build. This plug was added after a
// user kept seeing the sign-in modal's "Continue with Google" button
// show "SOON" for hours after OAuth had been configured — the browser
// was serving an old /api/auth/providers response out of the
// Workbox-managed cache, and the SW itself wouldn't update because
// it was also cached.
//
// In development we always unregister so config changes take effect
// immediately. In production we unregister ONLY if the page wasn't
// served with the current PWA SW (i.e. the old URL pattern is
// present) — a cheap, self-healing migration path that doesn't
// require users to clear site data manually.
if (typeof navigator !== "undefined" && "serviceWorker" in navigator) {
  // Always run the cleanup on load — a stale Workbox SW from an earlier
  // build can serve outdated API responses (e.g. /api/auth/providers)
  // and even outdated JS bundles, which makes any subsequent config
  // change appear to have no effect. Unregistering is idempotent and
  // costs ~1ms; in production the SW will be re-registered by the PWA
  // plugin's own bootstrap right after.
  navigator.serviceWorker.getRegistrations().then(regs => {
    for (const r of regs) r.unregister();
    if ("caches" in window) {
      caches.keys().then(keys => keys.forEach(k => caches.delete(k)));
    }
  }).catch(() => {});
}

// Initialise Sentry BEFORE React renders so errors thrown during
// component initialisation are captured. No-op when VITE_SENTRY_DSN
// isn't set.
initSentry();

// ── Global fetch override: always send credentials for /api calls ────────
// This fixes 40+ fetch calls that forgot credentials: "include".
// Without this, cookies won't be sent in production (cross-origin).
const originalFetch = window.fetch;
window.fetch = function (input: RequestInfo | URL, init?: RequestInit) {
  const url = typeof input === "string" ? input : input instanceof URL ? input.href : (input as Request).url;
  if (url.startsWith("/api") || url.startsWith("/auth")) {
    init = { ...init, credentials: init?.credentials || "include" };
  }
  return originalFetch.call(this, input, init);
};

createRoot(document.getElementById("root")!).render(<App />);
