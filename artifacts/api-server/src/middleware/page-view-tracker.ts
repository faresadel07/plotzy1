import type { Request, Response, NextFunction } from "express";
import crypto from "crypto";
import { UAParser } from "ua-parser-js";
import { db } from "../db";
import { pageViews } from "../../../../lib/db/src/schema";
import { logger } from "../lib/logger";

/**
 * Lightweight page-view logger.
 *
 * We log once per "page" request — i.e., the requests that render UI — not
 * every API call or static asset, so the table grows with meaningful traffic
 * and not with JS chunk requests. The insert is fire-and-forget so it never
 * adds latency to the user's request.
 *
 * The IP + User-Agent are hashed into a stable device fingerprint so the
 * admin can count *unique devices* without having to store raw PII keyed on
 * each row's index. The raw IP and UA are kept for debugging / device-type
 * breakdown and are only visible to admins.
 */

// Paths that should never be tracked. Anything starting with these is an API
// call, health check, or asset — not a page view.
const SKIP_PREFIXES = [
  "/api/",
  "/auth/",
  "/assets/",
  "/favicon",
  "/icons/",
  "/manifest.json",
  "/sw.js",
  "/workbox-",
  "/robots.txt",
  "/sitemap",
];

// File extensions that are static assets (served as pages in dev by vite,
// but not "page views").
const ASSET_EXTENSIONS = /\.(js|mjs|css|map|ico|png|jpe?g|gif|svg|webp|avif|woff2?|ttf|otf|eot|mp3|mp4|webm|json|txt)$/i;

function shouldSkip(pathname: string): boolean {
  if (!pathname) return true;
  if (SKIP_PREFIXES.some(p => pathname.startsWith(p))) return true;
  if (ASSET_EXTENSIONS.test(pathname)) return true;
  return false;
}

function getClientIp(req: Request): string {
  // SECURITY: trust only req.ip (derived via Express's `trust proxy`
  // setting). Reading the X-Forwarded-For header directly lets anyone spoof
  // their IP in our analytics simply by sending the header on a request.
  return req.ip || req.socket?.remoteAddress || "0.0.0.0";
}

function hashDevice(ip: string, userAgent: string): string {
  // sha256 truncated to 32 hex chars — plenty of entropy for uniqueness,
  // shorter index key.
  return crypto
    .createHash("sha256")
    .update(`${ip}::${userAgent}`)
    .digest("hex")
    .slice(0, 32);
}

function classifyDevice(parsed: UAParser.IResult): string {
  const type = parsed.device?.type; // "mobile" | "tablet" | "console" | "smarttv" | "wearable" | "embedded" | undefined
  // ua-parser-js returns `undefined` for desktop; flatten to a known string.
  if (type === "mobile") return "mobile";
  if (type === "tablet") return "tablet";
  if (type) return type; // console / smarttv / wearable / embedded / xr
  // Heuristic: detect bots/crawlers that don't declare a device type.
  const ua = (parsed.ua || "").toLowerCase();
  if (/(bot|crawl|spider|slurp|facebookexternalhit|meta-externalagent|telegrambot|whatsapp|discord|curl|wget)/i.test(ua)) {
    return "bot";
  }
  return "desktop";
}

export function pageViewTracker(req: Request, res: Response, next: NextFunction) {
  // Only log GETs — POST/PUT/PATCH/DELETE aren't page views.
  if (req.method !== "GET") return next();
  if (shouldSkip(req.path)) return next();

  // Capture identity info synchronously; the insert runs after we hand off
  // control so request latency is untouched.
  const ip = getClientIp(req);
  const userAgent = (req.headers["user-agent"] as string) || "";
  const referrer = (req.headers["referer"] as string) || null;
  const userId = (req.isAuthenticated?.() && req.user ? (req.user as any).id : null) ?? null;
  const path = req.path.slice(0, 500); // defensive cap
  const deviceHash = hashDevice(ip, userAgent);

  const parsed = new UAParser(userAgent).getResult();
  const deviceType = classifyDevice(parsed);
  const browser = parsed.browser?.name || null;
  const os = parsed.os?.name || null;

  // Fire-and-forget; never block the page response.
  queueMicrotask(() => {
    db.insert(pageViews).values({
      deviceHash,
      ip,
      userAgent: userAgent.slice(0, 500),
      deviceType,
      browser,
      os,
      path,
      referrer: referrer ? referrer.slice(0, 500) : null,
      userId,
    }).catch(err => {
      logger.warn({ err }, "Failed to log page view");
    });
  });

  next();
}
