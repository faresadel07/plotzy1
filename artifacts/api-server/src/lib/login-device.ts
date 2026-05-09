// Login-device fingerprinting + new-device detection.
//
// Used by the /api/auth/login handler to decide whether a successful
// login is from a device we have previously seen for this user. If
// not, the caller fires a "new login from device" notification email
// and records the fingerprint so subsequent logins from the same
// device stay quiet.
//
// Fingerprint composition: sha256(browser_name || os_name || ip)
// truncated to 32 hex chars. Stable enough that the same Chrome on
// the same Windows on the same residential WiFi recognises across
// logins; narrow enough that switching browsers, machines, or
// networks is treated as a new device.
//
// Storage: known_login_devices table (one row per user × fingerprint).

import crypto from "crypto";
import { UAParser } from "ua-parser-js";
import { eq, and, sql } from "drizzle-orm";
import { db } from "../db";
import { knownLoginDevices } from "../../../../lib/db/src/schema";

export interface DeviceInfo {
  /** Stable hash used for the (user_id, fingerprint) uniqueness constraint. */
  fingerprint: string;
  /** Human-readable browser name, e.g. "Chrome". */
  browser: string | null;
  /** Human-readable OS name, e.g. "Windows". */
  os: string | null;
  /** Resolved client IP. Already trust-proxy aware in the caller. */
  ip: string;
}

export interface RecordResult {
  isNewDevice: boolean;
  isFirstLogin: boolean;
  device: DeviceInfo;
}

/**
 * Parse the User-Agent header and combine with the IP into a stable
 * device fingerprint. Pure function; no DB access.
 */
export function fingerprintDevice(userAgent: string, ip: string): DeviceInfo {
  const parsed = new UAParser(userAgent || "").getResult();
  const browser = parsed.browser?.name || null;
  const os = parsed.os?.name || null;
  const fingerprint = crypto
    .createHash("sha256")
    .update(`${browser ?? ""}::${os ?? ""}::${ip}`)
    .digest("hex")
    .slice(0, 32);
  return { fingerprint, browser, os, ip };
}

/**
 * Record a successful login against the known-devices table and report
 * whether this device is brand new for the user (and whether the user
 * has any prior devices on file at all). Atomic: a single
 * INSERT ... ON CONFLICT DO UPDATE both creates the row and bumps
 * last_seen_at if it already exists, returning the previous timestamp
 * via xmax so the caller can decide if it was a true insert.
 *
 * Caveat: ON CONFLICT DO UPDATE counts as a "row affected" even when
 * no actual write happened, so the system column xmax (= 0 for fresh
 * inserts, > 0 for updates) is the reliable insert-vs-update signal.
 *
 * The fire-and-forget caller in auth.routes.ts treats DB failures as
 * non-fatal — a transient outage must not block the login response.
 */
export async function recordLoginDevice(
  userId: number,
  device: DeviceInfo,
): Promise<RecordResult> {
  // Count prior devices for this user BEFORE the upsert. If zero, this
  // is the user's first-ever recorded login and we should suppress the
  // new-device email (the welcome email already covered "you're in").
  const [prior] = await db
    .select({ c: sql<number>`count(*)::int` })
    .from(knownLoginDevices)
    .where(eq(knownLoginDevices.userId, userId));
  const isFirstLogin = (prior?.c ?? 0) === 0;

  // Upsert the device. xmax = 0 for a fresh insert, > 0 if the row
  // already existed and we hit ON CONFLICT (i.e. a known device).
  const upserted = await db
    .insert(knownLoginDevices)
    .values({
      userId,
      fingerprint: device.fingerprint,
      browser: device.browser,
      os: device.os,
      ip: device.ip,
    })
    .onConflictDoUpdate({
      target: [knownLoginDevices.userId, knownLoginDevices.fingerprint],
      set: { lastSeenAt: sql`NOW()`, ip: device.ip },
    })
    .returning({ id: knownLoginDevices.id, xmax: sql<string>`xmax` });

  const wasInsert = String(upserted[0]?.xmax ?? "0") === "0";
  const isNewDevice = wasInsert;

  return { isNewDevice, isFirstLogin, device };
}

/**
 * Convenience wrapper — most callers just need both helpers as one.
 * Reads UA + IP, builds the fingerprint, records it, returns the
 * combined "is this worth alerting about?" answer.
 */
export async function checkAndRecordLogin(
  userId: number,
  userAgent: string | undefined,
  ip: string,
): Promise<RecordResult> {
  const device = fingerprintDevice(userAgent ?? "", ip);
  return recordLoginDevice(userId, device);
}
