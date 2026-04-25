import type { Request, Response, NextFunction } from "express";
import { logger } from "../lib/logger";

/**
 * Origin/Referer-based CSRF protection.
 *
 * For state-changing requests (POST/PUT/PATCH/DELETE), require that the
 * Origin (or, failing that, Referer) header matches one of our allowed
 * origins or the request's own Host. Browsers attach Origin automatically
 * on cross-site fetch/XHR, so an attacker's page cannot fake this header —
 * blocking origin mismatches blocks the classic CSRF attack where a
 * malicious page makes the browser submit an authenticated POST to our
 * API.
 *
 * Combined with session cookies set as SameSite=Lax (see app.ts), this
 * gives us defence in depth: Lax handles modern browsers, Origin checking
 * handles the edge cases (older browsers, SameSite=None deployments).
 *
 * Webhooks and OAuth callbacks are exempt — they come from servers that
 * don't send Origin, and are already protected by other means (signed
 * payloads, state parameters).
 */

const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);

// Paths that must accept cross-origin POSTs: webhooks from third parties,
// and anything else where we validate authenticity by some other means
// (cryptographic signatures, signed state parameters, etc.).
const EXEMPT_PREFIXES = [
  "/api/stripe/webhook",   // Stripe verifies via stripe-signature
  "/auth/",                // Passport OAuth callbacks (GET anyway, but defensive)
];

function isExempt(path: string): boolean {
  return EXEMPT_PREFIXES.some(p => path.startsWith(p));
}

function getAllowedOrigins(): string[] {
  return process.env.ALLOWED_ORIGINS?.split(",").map(s => s.trim()).filter(Boolean)
    ?? ["http://localhost:5173"];
}

function originMatches(origin: string, allowedOrigins: string[], req: Request): boolean {
  if (allowedOrigins.includes(origin)) return true;
  // Same-origin (proxying UI through the API): Origin matches the Host we
  // were reached at. We DELIBERATELY skip this same-origin fallback in
  // production because the Host header can be controlled by an attacker
  // through a misconfigured proxy / load balancer that forwards arbitrary
  // Host values — pinning to the explicit ALLOWED_ORIGINS list there
  // prevents that whole class of trust-the-host bypass.
  if (process.env.NODE_ENV === "production") return false;
  const host = req.headers.host;
  if (!host) return false;
  const proto = req.protocol || "http";
  const selfOrigin = `${proto}://${host}`;
  return origin === selfOrigin;
}

export function csrfOriginCheck(req: Request, res: Response, next: NextFunction) {
  if (SAFE_METHODS.has(req.method)) return next();
  if (isExempt(req.path)) return next();

  const allowed = getAllowedOrigins();
  const origin = (req.headers.origin as string | undefined) || "";
  const referer = (req.headers.referer as string | undefined) || "";

  // Prefer Origin — it is set by the browser on every cross-site fetch/XHR
  // and on every same-site POST, and cannot be forged by page JS.
  if (origin) {
    if (originMatches(origin, allowed, req)) return next();
    logger.warn({ origin, path: req.path, method: req.method }, "CSRF: origin rejected");
    return res.status(403).json({ message: "Forbidden: invalid request origin" });
  }

  // No Origin — fall back to Referer. Legitimate same-origin tooling (e.g.
  // HTML forms submitted from the app itself) always sends at least one.
  if (referer) {
    try {
      const refOrigin = new URL(referer).origin;
      if (originMatches(refOrigin, allowed, req)) return next();
      logger.warn({ referer, path: req.path, method: req.method }, "CSRF: referer rejected");
      return res.status(403).json({ message: "Forbidden: invalid request referer" });
    } catch {
      return res.status(403).json({ message: "Forbidden: malformed referer" });
    }
  }

  // Neither header present. Legitimate browser fetches always include one;
  // curl/Postman don't. In production we reject so that real CSRF attempts
  // don't slip through; in development we let it pass to keep local
  // tooling ergonomic.
  if (process.env.NODE_ENV === "production") {
    logger.warn({ path: req.path, method: req.method }, "CSRF: no origin or referer");
    return res.status(403).json({ message: "Forbidden: missing origin" });
  }
  return next();
}
