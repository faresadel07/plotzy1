import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
import { initSentry } from "./lib/sentry";

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
