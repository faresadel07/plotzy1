import * as Sentry from "@sentry/react";

/**
 * Initialise Sentry for the React client.
 *
 * DSN is read from Vite env (`VITE_SENTRY_DSN` at build time). When it's
 * absent the SDK does nothing, so local dev runs never ship errors to a
 * real project and we don't have to wrap every capture call in an if.
 *
 * Call once from main.tsx BEFORE React renders so any error thrown in
 * component initialisation is captured.
 */
export function initSentry(): void {
  const dsn = import.meta.env.VITE_SENTRY_DSN;
  if (!dsn) return;

  Sentry.init({
    dsn,
    environment: import.meta.env.VITE_SENTRY_ENVIRONMENT || import.meta.env.MODE,
    // 10% perf traces in production — cheap, still representative.
    // Replays default off (enable later with @sentry/replay if needed).
    tracesSampleRate: import.meta.env.PROD ? 0.1 : 1.0,
    sendDefaultPii: false,
    beforeSend(event) {
      // Strip any request body that happens to sneak in — chapter text
      // is sensitive user content and should never leave the user's
      // browser for a 3rd-party error service.
      if (event.request) {
        delete event.request.data;
        delete event.request.cookies;
      }
      return event;
    },
  });
}

export { Sentry };
