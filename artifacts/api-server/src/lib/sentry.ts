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

  // includeLocalVariables captures every stack frame's local vars on
  // crash. Triage gets much easier — but those vars can hold tokens,
  // bcrypt password hashes, OAuth secrets, raw email bodies. Enable
  // ONLY in dev where the failure mode is "the developer sees their
  // own data". Production runs without it.
  const includeLocals = env.NODE_ENV !== "production";
  // Anything matching these is redacted from stack-frame variables and
  // breadcrumb data via the regex check in beforeSend below.
  const SENSITIVE_KEY_RE = /(password|passwd|pwd|secret|token|authorization|api[_-]?key|cookie|session|email|stripe|paypal|webhook|signature|otp|code)/i;
  const REDACTED = "[REDACTED]" as any;

  function redactObject(
    obj: unknown,
    depth = 0,
    seen: WeakSet<object> = new WeakSet(),
  ): void {
    if (!obj || typeof obj !== "object" || depth > 6) return;
    // Cycle guard: a structure that references itself (or a cousin
    // that references back) would otherwise be walked depth-times at
    // every entry point. WeakSet keeps the bookkeeping cheap and
    // doesn't leak references to the GC.
    if (seen.has(obj as object)) return;
    seen.add(obj as object);
    for (const key of Object.keys(obj as Record<string, unknown>)) {
      const rec = obj as Record<string, unknown>;
      if (SENSITIVE_KEY_RE.test(key)) {
        rec[key] = REDACTED;
      } else {
        redactObject(rec[key], depth + 1, seen);
      }
    }
  }

  Sentry.init({
    dsn: env.SENTRY_DSN,
    environment: env.SENTRY_ENVIRONMENT || env.NODE_ENV,
    // In production default to 10% traces — full sampling is expensive
    // at scale and the defaults should be safe to deploy.
    tracesSampleRate:
      env.SENTRY_TRACES_SAMPLE_RATE ??
      (env.NODE_ENV === "production" ? 0.1 : 1.0),
    includeLocalVariables: includeLocals,
    sendDefaultPii: false,
    beforeSend(event) {
      // 1) Request scrubbing — body, cookies, auth/cookie headers.
      if (event.request) {
        delete event.request.data;
        delete event.request.cookies;
        if (event.request.headers) {
          delete event.request.headers.authorization;
          delete event.request.headers.cookie;
        }
      }
      // 2) Stack-frame variables — Sentry's `vars` field on each frame
      //    can hold the closure's locals (passwords, tokens, raw user
      //    content). Walk and redact by key name.
      const frames = event.exception?.values?.flatMap(
        v => v.stacktrace?.frames ?? [],
      ) ?? [];
      for (const f of frames) {
        if ((f as any).vars) redactObject((f as any).vars);
      }
      // 3) Breadcrumb data — fetch URLs, query params, response bodies.
      for (const b of event.breadcrumbs ?? []) {
        if (b.data) redactObject(b.data);
      }
      // 4) Tags / extra — anything user-supplied that ended up there.
      if (event.tags) redactObject(event.tags);
      if (event.extra) redactObject(event.extra);
      return event;
    },
  });
}

// Re-export the symbols callers actually use so the rest of the app
// doesn't have to know which package this wraps.
export { Sentry };
