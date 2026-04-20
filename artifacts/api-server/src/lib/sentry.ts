import * as Sentry from "@sentry/node";
import { getEnv } from "./env";

/**
 * Initialise Sentry for the API server.
 *
 * Safe to call even when SENTRY_DSN is unset — the SDK becomes a no-op,
 * so development / local runs never spam a real Sentry project and you
 * never have to wrap capture() calls in `if (SENTRY_DSN) { … }` across
 * the codebase.
 *
 * Call once at process start (from index.ts, after parseEnv()). Sentry's
 * beforeSend hook scrubs common PII (emails, tokens) so we don't leak
 * user data into our error reports.
 */
export function initSentry(): void {
  const env = getEnv();
  if (!env.SENTRY_DSN) return;

  Sentry.init({
    dsn: env.SENTRY_DSN,
    environment: env.SENTRY_ENVIRONMENT || env.NODE_ENV,
    // In production default to 10% traces — full sampling is expensive
    // at scale and the defaults should be safe to deploy.
    tracesSampleRate:
      env.SENTRY_TRACES_SAMPLE_RATE ??
      (env.NODE_ENV === "production" ? 0.1 : 1.0),
    // Capture the source context (filename + surrounding lines) for every
    // stack frame so triage in the Sentry UI is much faster.
    includeLocalVariables: true,
    sendDefaultPii: false,
    // Scrub request bodies — writing / AI endpoints receive large chapter
    // text that is absolutely not something we want shipped to a 3rd
    // party error service. Leave query strings (useful for debugging).
    beforeSend(event) {
      if (event.request) {
        delete event.request.data;
        delete event.request.cookies;
        if (event.request.headers) {
          delete event.request.headers.authorization;
          delete event.request.headers.cookie;
        }
      }
      return event;
    },
  });
}

// Re-export the symbols callers actually use so the rest of the app
// doesn't have to know which package this wraps.
export { Sentry };
