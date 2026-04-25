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
  // A stale Workbox SW from an earlier build can serve outdated JS
  // bundles AND API responses. The problem with cleaning it up here is
  // that the page is ALREADY running the stale bundle by the time this
  // line executes — so even after we unregister, the current tab keeps
  // serving old code until the user reloads. We force that reload once
  // (guarded by sessionStorage so we never loop).
  const RELOAD_FLAG = "plotzy-sw-cleanup-v1";
  if (!sessionStorage.getItem(RELOAD_FLAG)) {
    navigator.serviceWorker.getRegistrations().then(async regs => {
      const hadSW = regs.length > 0;
      for (const r of regs) await r.unregister();
      if ("caches" in window) {
        const keys = await caches.keys();
        await Promise.all(keys.map(k => caches.delete(k)));
      }
      // Mark done BEFORE reload so the post-reload page skips this block.
      sessionStorage.setItem(RELOAD_FLAG, String(Date.now()));
      if (hadSW) {
        // Hard reload with cache bypass so the fresh JS chunk list loads.
        window.location.reload();
      }
    }).catch(() => {
      sessionStorage.setItem(RELOAD_FLAG, "error");
    });
  }
}

// Initialise Sentry BEFORE React renders so errors thrown during
// component initialisation are captured. No-op when VITE_SENTRY_DSN
// isn't set.
initSentry();

// ── Global fetch override: always send credentials for /api calls ────────
// This fixes 40+ fetch calls that forgot credentials: "include".
// Without this, cookies won't be sent in production (cross-origin).
//
// Also tags every /api/* request with the user's localStorage guest-book
// IDs via the X-Guest-Books header. The backend's requireBookOwner
// middleware reads it to perform a "late claim" — if the user signed in
// after starting a draft as a guest and visits the book directly, we
// can prove ownership from the localStorage list even when the server
// session.guestBookIds bucket has been cleared. Without this header
// the audiobook preview / delete / publish routes return 401 and the
// frontend shows a generic "Could not …" message that's hard to
// diagnose.
const originalFetch = window.fetch;
window.fetch = function (input: RequestInfo | URL, init?: RequestInit) {
  const url = typeof input === "string" ? input : input instanceof URL ? input.href : (input as Request).url;
  if (url.startsWith("/api") || url.startsWith("/auth")) {
    const mergedHeaders = new Headers(init?.headers);

    // Only attach X-Guest-Books to /api/* requests. The header travels
    // through the redirect chain on /auth/* OAuth handoffs and would have
    // leaked the user's claim list to Google / LinkedIn / Apple servers.
    if (url.startsWith("/api")) {
      let guestHeader = "";
      try {
        // Key matches LS_KEY in hooks/use-books.ts (underscores, not dashes).
        const raw = localStorage.getItem("plotzy_guest_book_ids");
        if (raw) {
          const ids = JSON.parse(raw);
          if (Array.isArray(ids) && ids.length > 0) {
            guestHeader = ids.filter((n: any) => Number.isFinite(n) && n > 0).join(",");
          }
        }
      } catch { /* localStorage absent / corrupted — header just stays empty */ }
      if (guestHeader && !mergedHeaders.has("X-Guest-Books")) {
        mergedHeaders.set("X-Guest-Books", guestHeader);
      }
    }

    init = {
      ...init,
      credentials: init?.credentials || "include",
      headers: mergedHeaders,
    };
  }
  return originalFetch.call(this, input, init);
};

createRoot(document.getElementById("root")!).render(<App />);
