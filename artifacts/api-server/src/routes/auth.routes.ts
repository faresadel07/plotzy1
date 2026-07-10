import { Router } from "express";
import express from "express";
import { z } from "zod";
import bcrypt from "bcryptjs";
// A fixed valid cost-12 bcrypt hash (of a random string nobody knows),
// used only to equalize login timing when an account is absent.
const DUMMY_BCRYPT_HASH = "$2b$12$slQxcx99uGZaiDVeGmY9Gucyr01t5d3xKxCbuIGYhZqzZsM7TkSCK";
import passport from "passport";
import { OAuth2Client } from "google-auth-library";
import { storage } from "../storage";
import { getEnabledProviders, getLinkedinCallbackUrl, getMicrosoftCallbackUrl } from "../auth";
import { ACHIEVEMENT_DEFINITIONS, computeXp, computeLevel, xpForNextLevel, xpForCurrentLevel } from "../../../../lib/shared/src/achievements";
import { logger } from "../lib/logger";
import { sendEmail, sendWelcomeEmailIfFirstTime, sendNewLoginEmail, sendPasswordChangedEmail, sendEmailChangeVerifyEmail, sendEmailChangeRequestedEmail, sendEmailChangedConfirmationEmail } from "../lib/email";
import { checkAndRecordLogin } from "../lib/login-device";
import { isAdminUser } from "../lib/admin";
import { hashToken } from "../lib/token-hash";
import { logAuditEvent } from "../lib/audit-log";
import { logRouteError } from "../lib/log-route-error";
import crypto from "crypto";
import { db } from "../db";
import { passwordResetTokens, emailVerificationTokens, emailChangeTokens, loginAttempts } from "../../../../lib/db/src/schema";
import { eq, and, sql, gt, count } from "drizzle-orm";
import { sensitiveAuthLimiter } from "../middleware/rate-limit";

// Lazily-initialised verifier for Google One Tap ID tokens. google-auth-library
// fetches and caches Google's public JWKS internally, so a single client per
// process is both correct and efficient.
let googleOneTapClient: OAuth2Client | null = null;
function getGoogleOneTapClient(): OAuth2Client | null {
  if (!process.env.GOOGLE_CLIENT_ID) return null;
  if (!googleOneTapClient) googleOneTapClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);
  return googleOneTapClient;
}

/* ─── Brute-force protection constants ─── */
const MAX_FAILED_ATTEMPTS = 5;          // lock after 5 failures
const LOCKOUT_WINDOW_MINUTES = 15;      // within a 15-minute window
const LOCKOUT_DURATION_MINUTES = 15;    // lock for 15 minutes

// Login attempts beyond ~24h serve no security purpose (the lockout window
// is 15 minutes) and would otherwise grow the table unbounded under brute-
// force traffic. Probabilistically purge old rows on insert so we don't need
// a separate cron — 1% of writes do the cleanup, which is plenty given the
// scan is bounded by a created_at index.
const LOGIN_ATTEMPT_RETENTION_HOURS = 24;
async function recordLoginAttempt(email: string, ip: string | undefined, success: boolean) {
  await db.insert(loginAttempts).values({ email: email.toLowerCase(), ip: ip || null, success });
  if (Math.random() < 0.01) {
    db.delete(loginAttempts)
      .where(sql`created_at < NOW() - INTERVAL '${sql.raw(String(LOGIN_ATTEMPT_RETENTION_HOURS))} hours'`)
      .catch(() => { /* opportunistic — silent on failure */ });
  }
}

async function isAccountLocked(email: string, ip: string | undefined): Promise<{ locked: boolean; minutesLeft: number }> {
  // SECURITY: lock by (email ∧ ip), not email alone. Email-only lockouts
  // let an attacker DoS any user by spamming failed logins against their
  // address from any IP — the real owner then can't log in for 15 min.
  // Scoping the lock to the offending IP means the attacker's IP burns
  // out without affecting the legitimate user's IP. If the IP is unknown
  // (shouldn't happen once trust proxy is set, but defensive) we fall
  // back to email-only so a missing IP can't let brute-force through.
  const windowStart = new Date(Date.now() - LOCKOUT_WINDOW_MINUTES * 60_000);
  const conditions = [
    eq(loginAttempts.email, email.toLowerCase()),
    eq(loginAttempts.success, false),
    gt(loginAttempts.createdAt, windowStart),
  ];
  if (ip) conditions.push(eq(loginAttempts.ip, ip));
  const [result] = await db.select({ cnt: count() }).from(loginAttempts)
    .where(and(...conditions));
  const failCount = result?.cnt ?? 0;
  if (failCount >= MAX_FAILED_ATTEMPTS) {
    const minutesLeft = LOCKOUT_DURATION_MINUTES;
    return { locked: true, minutesLeft };
  }
  return { locked: false, minutesLeft: 0 };
}

const router = Router();

// ─── Auth Routes ────────────────────────────────────────────────────────────

router.get("/api/auth/providers", (_req, res) => {
  // Provider flags change when env vars change (a redeploy that turns
  // Google on, for example) and must NEVER be served from the browser's
  // HTTP cache — otherwise a user whose first visit happened before
  // OAuth was configured will see the "SOON" fallback forever even
  // after the admin enables it.
  res.setHeader("Cache-Control", "no-store");
  return res.json(getEnabledProviders());
});

// ─── Gamification: Achievements & Stats ────────────────────────────────────

router.get("/api/achievements", (_req, res) => {
  return res.json(ACHIEVEMENT_DEFINITIONS);
});

router.get("/api/users/me/stats", async (req, res) => {
  if (!req.isAuthenticated()) return res.status(401).json({ message: "Not authenticated" });
  const userId = (req.user as any).id;
  try {
    const stats = await storage.getOrCreateUserStats(userId);
    const totalViews = await storage.getUserTotalViews(userId);
    const xp = computeXp(stats.totalWordsWritten, stats.totalBooksPublished, totalViews);
    const level = computeLevel(xp);
    const currentLevelXp = xpForCurrentLevel(level);
    const nextLevelXp = xpForNextLevel(level + 1);
    return res.json({
      ...stats,
      totalViewsReceived: totalViews,
      xp,
      level,
      xpToNextLevel: Math.max(nextLevelXp - xp, 0),
      xpForCurrentLevel: currentLevelXp,
      xpForNextLevel: nextLevelXp,
    });
  } catch (err) {
    logRouteError(req, err, "auth.routes");
    return res.status(500).json({ message: "Internal error" });
  }
});

router.get("/api/users/me/achievements", async (req, res) => {
  if (!req.isAuthenticated()) return res.status(401).json({ message: "Not authenticated" });
  const userId = (req.user as any).id;
  try {
    const achievements = await storage.getUserAchievements(userId);
    return res.json(achievements);
  } catch (err) {
    logRouteError(req, err, "auth.routes");
    return res.status(500).json({ message: "Internal error" });
  }
});

// ─── Auth ────────────────────────────────────────────────────────────────────

router.get("/api/auth/user", async (req, res) => {
  try {
    if (req.isAuthenticated() && req.user) {
      const dbUser = await storage.getUserById(req.user.id);
      if (!dbUser) return res.status(401).json({ message: "Not authenticated" });
      // SECURITY: never ship the raw OAuth subject IDs (googleId / appleId)
      // to the browser. They are stable, externally-meaningful identifiers
      // for the user at Google / Apple — useful to anyone running scripted
      // attacks against those providers (or correlating across sites). The
      // UI only needs to know "is a provider connected?" — boolean flags
      // give it that without exposing the id.
      const { id, email, displayName, avatarUrl, googleId, appleId, passwordHash, subscriptionStatus, subscriptionTier, subscriptionPlan, subscriptionEndDate, suspended, emailEngagementNotifications } = dbUser as any;
      const isAdmin = isAdminUser(dbUser);

      // Surface any pending email-change request so the account
      // settings page can render a "you have a pending change to
      // X@Y.com" banner with a re-send / cancel option. Only the
      // most recent unexpired unconsumed row counts; older ones
      // are pruned by the next request to PATCH /api/auth/email.
      let pendingEmailChange: string | null = null;
      try {
        const [pending] = await db
          .select({ newEmail: emailChangeTokens.newEmail })
          .from(emailChangeTokens)
          .where(and(
            eq(emailChangeTokens.userId, id),
            sql`used_at IS NULL`,
            sql`expires_at > NOW()`,
          ))
          .orderBy(sql`created_at DESC`)
          .limit(1);
        pendingEmailChange = pending?.newEmail ?? null;
      } catch (err) {
        // Pending-change lookup is informational only. A DB hiccup
        // here MUST NOT 401 the auth-user request, which is on
        // every page load. Log + degrade.
        logger.warn({ err, userId: id }, "Pending-email lookup failed");
      }

      return res.json({
        id, email, displayName, avatarUrl,
        hasGoogle: !!googleId,
        hasApple: !!appleId,
        // hasPassword tells the UI which re-auth flow to render in the
        // account-deletion dialog: a password input vs a typed
        // confirmation phrase. The hash itself is never shipped.
        hasPassword: !!passwordHash,
        subscriptionStatus, subscriptionTier, subscriptionPlan, subscriptionEndDate,
        isAdmin,
        suspended: !!suspended,
        pendingEmailChange,
        // Drives the toggle in the engagement-notifications panel of
        // the account settings page. Default true at the schema layer
        // so a missing column would fall back gracefully; we coerce
        // here too because legacy users may have null until the
        // column default backfills.
        emailEngagementNotifications: emailEngagementNotifications !== false,
      });
    }
    return res.status(401).json({ message: "Not authenticated" });
  } catch (err) {
    logRouteError(req, err, "auth.routes");
    return res.status(500).json({ message: "Internal error" });
  }
});

// ─── Email / Password Auth ─────────────────────────────────────────────────

router.post("/api/auth/register", sensitiveAuthLimiter, async (req, res) => {
  try {
    const { email, password, displayName } = z.object({
      email: z.string().email(),
      password: z.string().min(8, "Password must be at least 8 characters"),
      displayName: z.string().min(1).optional(),
    }).strict().parse(req.body);

    const existing = await storage.getUserByEmail(email);
    if (existing) return res.status(409).json({ message: "An account with this email already exists." });

    const passwordHash = await bcrypt.hash(password, 12);
    const user = await storage.createUser({
      email,
      passwordHash,
      displayName: displayName || email.split("@")[0],
    });

    // Capture guest book IDs before the session may change
    const guestIds: number[] = (req.session as any).guestBookIds || [];

    await new Promise<void>((resolve, reject) =>
      req.login(user, (err) => (err ? reject(err) : resolve()))
    );

    // Claim any books the user created as a guest before registering
    if (guestIds.length > 0) {
      await storage.claimGuestBooks(guestIds, user.id);
      (req.session as any).guestBookIds = [];
    }

    // Send verification email
    try {
      // verifyToken is the value emailed to the user; the DB stores
      // only the SHA-256 hash so a leak of the table can't be replayed.
      const verifyToken = crypto.randomBytes(32).toString("hex");
      await db.insert(emailVerificationTokens).values({ userId: user.id, token: hashToken(verifyToken), expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000) });
      const frontendUrl = (process.env.FRONTEND_URL || (process.env.NODE_ENV === "production" ? `https://${process.env.APP_DOMAIN || "localhost"}` : "http://localhost:5173")).replace(/\/+$/, "");
      await sendEmail(
        email,
        "Verify your Plotzy account",
        `<div style="font-family:-apple-system,sans-serif;max-width:480px;margin:0 auto;padding:40px 20px;"><h2 style="color:#111;">Welcome to Plotzy!</h2><p style="color:#555;line-height:1.6;">Please verify your email to get full access:</p><a href="${frontendUrl}/?verify=${verifyToken}" style="display:inline-block;margin:24px 0;padding:14px 32px;background:#111;color:#fff;text-decoration:none;border-radius:10px;font-weight:600;">Verify Email</a><p style="color:#999;font-size:13px;">This link expires in 24 hours.</p></div>`,
      );
    } catch (emailErr) { logger.error({ err: emailErr }, "Failed to send verification email"); }

    const { id, email: e, displayName: d, avatarUrl, subscriptionStatus, subscriptionPlan, subscriptionEndDate } = user;
    return res.status(201).json({ id, email: e, displayName: d, avatarUrl, subscriptionStatus, subscriptionPlan, subscriptionEndDate });
  } catch (err: any) {
    logRouteError(req, err, "auth.routes");
    if (err?.name === "ZodError") return res.status(400).json({ message: err.errors?.[0]?.message || "Invalid input" });
    return res.status(500).json({ message: "Registration failed" });
  }
});

router.post("/api/auth/login", sensitiveAuthLimiter, async (req, res) => {
  try {
    const { email, password } = z.object({
      email: z.string().email(),
      password: z.string().min(8, "Password must be at least 8 characters"),
    }).strict().parse(req.body);

    // SECURITY: only read req.ip (resolved via app's `trust proxy` setting).
    // Reading X-Forwarded-For directly lets anyone spoof their IP and fill
    // the login_attempts table with someone else's fingerprint.
    const clientIp = req.ip;

    // Check if account is locked due to too many failed attempts from THIS IP.
    const lockStatus = await isAccountLocked(email, clientIp);
    if (lockStatus.locked) {
      return res.status(429).json({
        message: `Too many failed login attempts. Please try again in ${lockStatus.minutesLeft} minutes.`,
        lockedUntilMinutes: lockStatus.minutesLeft,
      });
    }
    const user = await storage.getUserByEmail(email);
    if (!user || !user.passwordHash) {
      // Run a dummy compare so a missing / OAuth-only account takes the
      // same ~cost-12 time as a wrong password. Without this, response
      // timing is an account-existence oracle.
      await bcrypt.compare(password, DUMMY_BCRYPT_HASH);
      await recordLoginAttempt(email, clientIp, false);
      return res.status(401).json({ message: "Invalid email or password." });
    }

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) {
      await recordLoginAttempt(email, clientIp, false);
      return res.status(401).json({ message: "Invalid email or password." });
    }

    // Successful login — record it and clear old attempts
    await recordLoginAttempt(email, clientIp, true);

    // New-device notification. Fingerprint = sha256(browser × os × ip).
    // Fire-and-forget: a failure to record or send the email must NOT
    // block the login response, and the entire flow runs concurrent
    // with the rest of the handler (session regeneration, guest-book
    // claim, etc.) so the user-facing latency stays unchanged.
    //
    // Suppression: skip the email on first-ever login (welcome email
    // already covered "you're in" and a security alert on top of that
    // confuses users) and on already-known devices (no surprise to
    // alert about). We always perform the upsert though, so the FIRST
    // login lands in the table and the SECOND login from a different
    // device correctly fires the alert.
    (async () => {
      try {
        const result = await checkAndRecordLogin(
          user.id,
          (req.headers["user-agent"] as string | undefined),
          clientIp ?? "0.0.0.0",
        );
        if (result.isNewDevice && !result.isFirstLogin && user.email) {
          await sendNewLoginEmail(user.email, {
            browser: result.device.browser,
            os: result.device.os,
            ip: result.device.ip,
            whenIso: new Date().toISOString(),
          });
        }
      } catch (err) {
        logger.warn({ err, userId: user.id }, "new-device tracking / notification failed");
      }
    })();

    // Capture guest book IDs before the session may change
    const guestIds: number[] = (req.session as any).guestBookIds || [];

    // Session-fixation defence: regenerate the session id BEFORE associating
    // the authenticated user. Without this, a session id planted by an
    // attacker pre-login (e.g. via a CSRF / set-cookie injection vector)
    // remains valid post-login and lets the attacker ride the new identity.
    await new Promise<void>((resolve, reject) =>
      req.session.regenerate((err) => (err ? reject(err) : resolve()))
    );

    await new Promise<void>((resolve, reject) =>
      req.login(user, (err) => (err ? reject(err) : resolve()))
    );

    // Claim any books the user created as a guest in this session
    if (guestIds.length > 0) {
      await storage.claimGuestBooks(guestIds, user.id);
      (req.session as any).guestBookIds = [];
    }

    const { id, email: e, displayName: d, avatarUrl, subscriptionStatus, subscriptionPlan, subscriptionEndDate } = user;
    return res.json({ id, email: e, displayName: d, avatarUrl, subscriptionStatus, subscriptionPlan, subscriptionEndDate });
  } catch (err: any) {
    if (err?.name === "ZodError") return res.status(400).json({ message: "Invalid input" });
    logger.error({ err }, "Login error");
    return res.status(500).json({ message: "Login failed" });
  }
});

// ── Self-service account deletion ─────────────────────────────────
//
// GDPR Article 17 ("right to erasure"): users can permanently delete
// their account from /account/settings without contacting support.
//
// Auth model: a re-authentication step is required so a borrowed
// session can't trigger deletion. Two paths:
//   - Password users: must supply their current password (bcrypt
//     verified against the stored hash).
//   - OAuth-only users (no passwordHash): must type the literal
//     phrase "DELETE MY ACCOUNT" since they have no password to
//     verify against.
//
// Side-effects (in order):
//   1. Capture user's email + displayName for the confirmation email
//      (the row is about to be deleted; can't read it after).
//   2. Call storage.deleteUser(id), which inside a transaction:
//      orphans books (sets userId=null) and deletes the users row.
//      ON DELETE CASCADE on related tables (chapters, follows,
//      messages, notifications, support tickets, AI usage logs,
//      subscription payments, etc.) removes the rest.
//   3. Send a "Your Plotzy account has been deleted" email to the
//      captured address (best-effort; never blocks completion).
//   4. Destroy the session and clear the cookie so the now-stale
//      browser can't accidentally reach a 401-protected page.
//
// Note on PayPal: Plotzy uses PayPal Capture Intent (one-time
// orders), not Recurring Subscriptions, so there is no remote
// PayPal subscription to cancel via the PayPal API. Deleting the
// users row removes the subscription record locally; no further
// charges are possible because each next renewal is a separate
// user-initiated checkout, not an automatic recurring debit.
router.delete("/api/auth/account", sensitiveAuthLimiter, async (req, res) => {
  if (!req.isAuthenticated() || !req.user) {
    return res.status(401).json({ message: "Not authenticated" });
  }

  const userId = (req.user as any).id as number;

  try {
    const { password, confirmPhrase } = z
      .object({
        password: z.string().max(200).optional(),
        confirmPhrase: z.string().max(200).optional(),
      })
      .strict()
      .parse(req.body);

    const user = await storage.getUserById(userId);
    if (!user) {
      // Session points at a row that doesn't exist; treat as already
      // deleted, tear the session down so the client can recover, and
      // return 410 inside the destroy callback so the cookie clear and
      // the response are guaranteed to happen on the same path.
      return req.logout(() => {
        req.session.destroy(() => {
          res.clearCookie("connect.sid", {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: process.env.COOKIE_SAME_SITE === "none" ? "none" : "lax",
          });
          res.status(410).json({ message: "Account no longer exists" });
        });
      });
    }

    // Re-authentication gate.
    if (user.passwordHash) {
      if (!password) {
        return res.status(400).json({ message: "Password is required to delete this account." });
      }
      const valid = await bcrypt.compare(password, user.passwordHash);
      if (!valid) {
        return res.status(401).json({ message: "Incorrect password." });
      }
    } else {
      // OAuth-only user: require typed confirmation phrase instead.
      const REQUIRED = "DELETE MY ACCOUNT";
      if (!confirmPhrase || confirmPhrase.trim() !== REQUIRED) {
        return res
          .status(400)
          .json({ message: `Please type ${REQUIRED} exactly to confirm deletion.` });
      }
    }

    // Capture identity BEFORE deletion so the confirmation email can go
    // out using the now-vanished address.
    const capturedEmail = user.email;
    const capturedName = user.displayName || user.email?.split("@")[0] || "there";

    await storage.deleteUser(userId);

    // Best-effort confirmation email. Never block the response on email
    // delivery — the user already pressed Delete and the row is gone.
    if (capturedEmail) {
      const html = `
        <div style="font-family:-apple-system,BlinkMacSystemFont,'SF Pro Text','Helvetica Neue',Arial,sans-serif;max-width:560px;margin:0 auto;padding:40px 24px;color:#111;">
          <div style="border-bottom:1px solid #eee;padding-bottom:16px;margin-bottom:24px;">
            <p style="margin:0;font-size:11px;font-weight:700;letter-spacing:0.18em;text-transform:uppercase;color:#888;">Plotzy account</p>
            <h2 style="margin:8px 0 0;font-size:18px;font-weight:700;color:#111;">Your account has been deleted</h2>
          </div>
          <p style="margin:0 0 12px;font-size:14px;line-height:1.65;color:#444;">Hi ${capturedName.replace(/[<>&]/g, "")},</p>
          <p style="margin:0 0 12px;font-size:14px;line-height:1.65;color:#444;">
            We have permanently deleted your Plotzy account at your request. Your session has been signed out, and the following data has been removed from our systems:
          </p>
          <ul style="margin:0 0 18px 0;padding-left:20px;font-size:14px;line-height:1.65;color:#444;">
            <li>Account profile, password, and login records</li>
            <li>Chapters, drafts, story bibles, and version history</li>
            <li>Comments, likes, follows, direct messages, and notifications</li>
            <li>Subscription records and AI usage logs</li>
          </ul>
          <p style="margin:0 0 12px;font-size:13px;line-height:1.65;color:#666;">
            Books you published to the Community Library remain readable but are no longer attributed to you. Receipts for past payments stay in your PayPal account; we do not control those.
          </p>
          <p style="margin:24px 0 0;font-size:13px;line-height:1.65;color:#666;">
            If this was not you, contact us immediately at <a href="mailto:support@plotzy.co" style="color:#111;">support@plotzy.co</a>.
          </p>
          <hr style="border:none;border-top:1px solid #eee;margin:32px 0;" />
          <p style="color:#bbb;font-size:11px;">Plotzy, the modern platform for writers</p>
        </div>
      `;
      sendEmail(capturedEmail, "Your Plotzy account has been deleted", html).catch((err) => {
        logger.warn({ err, userId }, "Failed to send account-deletion confirmation email");
      });
    }

    // Tear down the session so the browser is fully signed out.
    req.logout((logoutErr) => {
      if (logoutErr) {
        logger.warn({ err: logoutErr, userId }, "Logout after account deletion failed");
      }
      req.session.destroy(() => {
        res.clearCookie("connect.sid", {
          httpOnly: true,
          secure: process.env.NODE_ENV === "production",
          sameSite: process.env.COOKIE_SAME_SITE === "none" ? "none" : "lax",
        });
        return res.json({ success: true });
      });
    });
  } catch (err: any) {
    if (err?.name === "ZodError") {
      return res.status(400).json({ message: "Invalid request body" });
    }
    logger.error({ err, userId }, "Account deletion failed");
    return res.status(500).json({ message: "Failed to delete account" });
  }
});

router.post("/api/auth/logout", (req, res) => {
  req.logout((err) => {
    if (err) return res.status(500).json({ message: "Logout failed" });
    return req.session.destroy(() => {
      // Explicitly invalidate the browser cookie too. req.session.destroy
      // only deletes the server-side row — without clearCookie, connect.sid
      // sticks around in the browser for the full maxAge (30 days) and is
      // resurrected as a fresh empty session on the next request, which
      // breaks invariants downstream (anti-CSRF, guest tracking).
      // Cookie flags must match the options in app.ts session config or
      // some browsers ignore the clear.
      res.clearCookie("connect.sid", {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: process.env.COOKIE_SAME_SITE === "none" ? "none" : "lax",
      });
      return res.json({ success: true });
    });
  });
});

router.patch("/api/auth/avatar", async (req, res) => {
  try {
    if (!req.isAuthenticated() || !req.user) {
      return res.status(401).json({ message: "Not authenticated" });
    }
    const { avatarUrl } = z.object({
      avatarUrl: z.string().max(250_000).refine(
        (v: string) => v.startsWith("data:image/") || (v.startsWith("http") && v.length < 2048),
        { message: "Must be a valid image (data URI max ~200KB, or a URL)" }
      ),
    }).strict().parse(req.body);
    const updated = await storage.updateUser(req.user.id, { avatarUrl });
    const { passwordHash: _ph, ...safe } = updated as any;
    return res.json(safe);
  } catch (err) {
    logRouteError(req, err, "auth.routes");
    return res.status(500).json({ message: "Internal error" });
  }
});

router.patch("/api/auth/display-name", async (req, res) => {
  try {
    if (!req.isAuthenticated() || !req.user) {
      return res.status(401).json({ message: "Not authenticated" });
    }
    const { displayName } = z.object({ displayName: z.string().min(1).max(50) }).strict().parse(req.body);
    const updated = await storage.updateUser(req.user.id, { displayName });
    return res.json(updated);
  } catch (err) {
    logRouteError(req, err, "auth.routes");
    return res.status(500).json({ message: "Internal error" });
  }
});

// ─── Google One Tap ────────────────────────────────────────────────────────
// Public endpoint so the frontend can pick up the client ID without requiring
// a VITE_ env var (the client ID is public information by design).
router.get("/api/auth/google/config", (_req, res) => {
  const clientId = process.env.GOOGLE_CLIENT_ID || null;
  return res.json({ clientId, enabled: !!clientId });
});

// Verify a Google ID token produced by the One Tap flow and sign the user in.
// The credential is a JWT signed by Google; we verify it against Google's
// public keys and the client ID we control, so a forged token cannot log in.
router.post("/api/auth/google/one-tap", async (req, res) => {
  try {
    const { credential } = z.object({ credential: z.string().min(10) }).strict().parse(req.body);

    const client = getGoogleOneTapClient();
    if (!client || !process.env.GOOGLE_CLIENT_ID) {
      return res.status(503).json({ message: "Google sign-in is not configured." });
    }

    let payload;
    try {
      const ticket = await client.verifyIdToken({
        idToken: credential,
        audience: process.env.GOOGLE_CLIENT_ID,
      });
      payload = ticket.getPayload();
    } catch (err) {
      logger.warn({ err }, "Google One Tap token verification failed");
      return res.status(401).json({ message: "Invalid Google credential." });
    }

    if (!payload || !payload.sub) {
      return res.status(401).json({ message: "Invalid Google credential." });
    }
    // Extra defence-in-depth: google-auth-library already checks iss/exp/aud,
    // but asserting iss explicitly guards against library behaviour changes.
    if (payload.iss !== "https://accounts.google.com" && payload.iss !== "accounts.google.com") {
      return res.status(401).json({ message: "Invalid token issuer." });
    }
    // Block account-takeover via unverified Google email: if we ever trust
    // an unverified address here, an attacker with a Google account that
    // *claims* the victim's email (possible via Workspace admins or a
    // compromised Google project) would be auto-linked to that victim's
    // Plotzy account. Require email_verified to be explicitly true.
    if (payload.email && payload.email_verified !== true) {
      logger.warn({ sub: payload.sub }, "One Tap rejected — email not verified");
      return res.status(401).json({ message: "Email not verified by Google." });
    }

    const googleId = payload.sub;
    const email = payload.email || null;
    const displayName = payload.name || null;
    const avatarUrl = payload.picture || null;

    // Find-or-create user, mirroring the passport Google strategy above.
    let user = await storage.getUserByGoogleId(googleId);
    if (!user && email) {
      user = await storage.getUserByEmail(email);
      if (user) user = await storage.updateUser(user.id, { googleId });
    }
    if (!user) {
      // Google One Tap already required payload.email_verified === true
      // above (see line ~344), so the address is verified by Google.
      user = await storage.createUser({ googleId, email, displayName, avatarUrl, emailVerified: true });
    }

    // Preserve any guest books started before login.
    const guestIds: number[] = (req.session as any).guestBookIds || [];
    await new Promise<void>((resolve, reject) =>
      req.login(user!, (err) => (err ? reject(err) : resolve()))
    );
    if (guestIds.length > 0) {
      await storage.claimGuestBooks(guestIds, user.id);
      (req.session as any).guestBookIds = [];
    }

    // Fire-and-forget welcome email. Idempotent — only sends if this is
    // a brand-new user. Returning users (re-link, re-login) early-return
    // because welcomeEmailSentAt is already set.
    sendWelcomeEmailIfFirstTime(user.id).catch(() => {});

    const { id, email: e, displayName: d, avatarUrl: a, subscriptionStatus, subscriptionPlan, subscriptionEndDate } = user;
    return res.json({ id, email: e, displayName: d, avatarUrl: a, subscriptionStatus, subscriptionPlan, subscriptionEndDate });
  } catch (err: any) {
    if (err?.name === "ZodError") return res.status(400).json({ message: "Invalid request" });
    logger.error({ err }, "Google One Tap error");
    return res.status(500).json({ message: "Sign-in failed" });
  }
});

// Google OAuth. `state: true` makes passport store a random state in
// the session and verify it on callback, binding the handshake against
// login-CSRF (matching the LinkedIn/Microsoft flows).
router.get("/auth/google", passport.authenticate("google", { scope: ["profile", "email"], state: true } as any));

// Strip any trailing slash(es). Without this, a FRONTEND_URL / APP_DOMAIN
// configured with a trailing "/" (a very common ops mistake) makes the
// post-login redirect `https://host//?auth=success` — pathname "//", which
// the wouter router has no route for, so the SPA renders its 404 page after
// a *successful* Google sign-in. Normalising here makes the redirect robust
// regardless of how the env var is formatted.
const frontendUrl = (process.env.FRONTEND_URL || (process.env.NODE_ENV === "production"
  ? `https://${process.env.APP_DOMAIN || process.env.REPLIT_DOMAINS?.split(",")[0] || "localhost"}`
  : "http://localhost:5173")).replace(/\/+$/, "");

// Custom callback (instead of the `{ failureRedirect }` shorthand) so an
// error *thrown* during the Google token exchange degrades to a friendly
// `?auth=error` redirect instead of bubbling to the Express error handler
// and returning a raw HTTP 500 to the user.
router.get("/auth/google/callback", (req, res, next) => {
  passport.authenticate("google", { state: true } as any, (err: unknown, user: Express.User | false) => {
    if (err || !user) return res.redirect(`${frontendUrl}/?auth=error`);
    req.logIn(user, (loginErr) => {
      if (loginErr) return res.redirect(`${frontendUrl}/?auth=error`);
      return res.redirect(`${frontendUrl}/?auth=success`);
    });
  })(req, res, next);
});

// Apple OAuth (callback is POST). state binds the handshake like Google.
router.get("/auth/apple", passport.authenticate("apple", { state: true } as any));

router.post(
  "/auth/apple/callback",
  express.urlencoded({ extended: true }),
  passport.authenticate("apple", { failureRedirect: "/?auth=error", state: true } as any),
  (req, res) => {
    res.redirect("/?auth=success");
  }
);

// ─── LinkedIn OAuth (OpenID Connect) ────────────────────────────────────────

router.get("/auth/linkedin", (req, res) => {
  if (!process.env.LINKEDIN_CLIENT_ID || !process.env.LINKEDIN_CLIENT_SECRET) {
    return res.redirect("/?auth=error&msg=linkedin-not-configured");
  }
  const state = crypto.randomBytes(32).toString("hex");
  (req.session as any).linkedinOAuthState = state;
  const params = new URLSearchParams({
    response_type: "code",
    client_id: process.env.LINKEDIN_CLIENT_ID,
    redirect_uri: getLinkedinCallbackUrl(),
    scope: "openid profile email",
    state,
  });
  res.redirect(`https://www.linkedin.com/oauth/v2/authorization?${params}`);
});

router.get("/auth/linkedin/callback", async (req, res) => {
  try {
    const { code, state, error } = req.query as Record<string, string>;

    if (error) {
      logger.error({ error }, "LinkedIn OAuth error");
      return res.redirect("/?auth=error");
    }

    const savedState = (req.session as any).linkedinOAuthState;
    if (!state || state !== savedState) {
      logger.error("LinkedIn state mismatch");
      return res.redirect("/?auth=error");
    }
    delete (req.session as any).linkedinOAuthState;

    if (!code) return res.redirect("/?auth=error");

    if (!process.env.LINKEDIN_CLIENT_ID || !process.env.LINKEDIN_CLIENT_SECRET) {
      return res.redirect("/?auth=error");
    }

    // Exchange code for access token
    const tokenRes = await fetch("https://www.linkedin.com/oauth/v2/accessToken", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "authorization_code",
        code,
        redirect_uri: getLinkedinCallbackUrl(),
        client_id: process.env.LINKEDIN_CLIENT_ID,
        client_secret: process.env.LINKEDIN_CLIENT_SECRET,
      }),
      signal: AbortSignal.timeout(10000),
    });

    if (!tokenRes.ok) {
      const txt = await tokenRes.text();
      logger.error({ response: txt }, "LinkedIn token exchange failed");
      return res.redirect("/?auth=error");
    }

    const { access_token } = await tokenRes.json() as { access_token: string };

    // Fetch user info via OpenID Connect userinfo endpoint
    const infoRes = await fetch("https://api.linkedin.com/v2/userinfo", {
      headers: { Authorization: `Bearer ${access_token}` },
      signal: AbortSignal.timeout(10000),
    });

    if (!infoRes.ok) {
      logger.error({ status: infoRes.status }, "LinkedIn userinfo fetch failed");
      return res.redirect("/?auth=error");
    }

    const profile = await infoRes.json() as {
      sub: string;
      name?: string;
      given_name?: string;
      family_name?: string;
      email?: string;
      email_verified?: boolean;
      picture?: string;
    };

    const linkedinId = profile.sub;
    if (!linkedinId) return res.redirect("/?auth=error");

    const email = profile.email || null;
    const emailVerified = profile.email_verified === true;
    const displayName = profile.name || [profile.given_name, profile.family_name].filter(Boolean).join(" ") || null;
    const avatarUrl = profile.picture || null;

    let user = await storage.getUserByLinkedinId(linkedinId);
    if (!user) {
      // SECURITY: only link to an existing Plotzy account by email when
      // LinkedIn explicitly says the address is verified. Otherwise an
      // attacker could create a LinkedIn account with someone else's
      // email (LinkedIn doesn't always require verification for sign-in
      // and could change policy) and silently take over the existing
      // Plotzy user. Mirrors the Google One Tap check.
      if (email && emailVerified) {
        const existing = await storage.getUserByEmail(email);
        // Hardening: also require the pre-existing local account to have
        // emailVerified=true before linking. If the local account is
        // unverified, it could be a placeholder created by an attacker
        // squatting on the victim's address; linking would let them ride
        // the LinkedIn login into the victim's identity.
        if (existing && (existing as any).emailVerified) {
          user = await storage.updateUser(existing.id, { linkedinId, avatarUrl: existing.avatarUrl || avatarUrl });
        }
      }
      if (!user) {
        // Brand-new account. Only mark verified if LinkedIn confirmed.
        user = await storage.createUser({
          linkedinId, email, displayName, avatarUrl,
          emailVerified,
        });
      }
    }

    await new Promise<void>((resolve, reject) => {
      req.login(user!, err => (err ? reject(err) : resolve()));
    });

    // Fire-and-forget welcome email. Idempotent — link-existing-account
    // path early-returns since the existing user already has welcomeEmailSentAt
    // set; only brand-new LinkedIn signups will actually send.
    sendWelcomeEmailIfFirstTime(user!.id).catch(() => {});

    res.redirect("/?auth=success");
  } catch (err) {
    logger.error({ err }, "LinkedIn callback error");
    res.redirect("/?auth=error");
  }
});

// ─── Microsoft OAuth (OpenID Connect via Microsoft identity platform) ─────
//
// Uses the multi-tenant /common endpoint so both personal Microsoft
// accounts (@outlook.com, @hotmail.com, @live.com) AND organisation
// accounts (Azure AD / Entra ID work + school) can sign in. Free tier
// covers 50,000 monthly active users — well beyond anything Plotzy
// will hit for a long time.
//
// Same manual-fetch pattern as LinkedIn (no passport-microsoft dep):
// authorisation code -> token -> Microsoft Graph userinfo.

router.get("/auth/microsoft", (req, res) => {
  if (!process.env.MICROSOFT_CLIENT_ID || !process.env.MICROSOFT_CLIENT_SECRET) {
    return res.redirect("/?auth=error&msg=microsoft-not-configured");
  }
  const state = crypto.randomBytes(32).toString("hex");
  (req.session as any).microsoftOAuthState = state;
  const params = new URLSearchParams({
    client_id: process.env.MICROSOFT_CLIENT_ID,
    response_type: "code",
    redirect_uri: getMicrosoftCallbackUrl(),
    response_mode: "query",
    // `openid profile email` are the OpenID Connect basics; `User.Read`
    // grants access to the /me endpoint on Microsoft Graph.
    scope: "openid profile email User.Read",
    state,
    // `select_account` prompts the user to choose which Microsoft
    // account to use when they have several logged in. Removes the
    // "why am I signed in as my old account?" confusion.
    prompt: "select_account",
  });
  res.redirect(`https://login.microsoftonline.com/common/oauth2/v2.0/authorize?${params}`);
});

router.get("/auth/microsoft/callback", async (req, res) => {
  try {
    const { code, state, error, error_description } = req.query as Record<string, string>;

    if (error) {
      logger.error({ error, error_description }, "Microsoft OAuth error");
      return res.redirect("/?auth=error");
    }

    const savedState = (req.session as any).microsoftOAuthState;
    if (!state || state !== savedState) {
      logger.error("Microsoft state mismatch");
      return res.redirect("/?auth=error");
    }
    delete (req.session as any).microsoftOAuthState;

    if (!code) return res.redirect("/?auth=error");

    if (!process.env.MICROSOFT_CLIENT_ID || !process.env.MICROSOFT_CLIENT_SECRET) {
      return res.redirect("/?auth=error");
    }

    // Exchange authorisation code for access token
    const tokenRes = await fetch("https://login.microsoftonline.com/common/oauth2/v2.0/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: process.env.MICROSOFT_CLIENT_ID,
        client_secret: process.env.MICROSOFT_CLIENT_SECRET,
        code,
        redirect_uri: getMicrosoftCallbackUrl(),
        grant_type: "authorization_code",
        scope: "openid profile email User.Read",
      }),
      signal: AbortSignal.timeout(10000),
    });

    if (!tokenRes.ok) {
      const txt = await tokenRes.text();
      logger.error({ response: txt }, "Microsoft token exchange failed");
      return res.redirect("/?auth=error");
    }

    const { access_token } = await tokenRes.json() as { access_token: string };

    // Fetch profile via Microsoft Graph /me. This returns the org
    // account by default and personal-account fields when signed in
    // with a Microsoft consumer account.
    const infoRes = await fetch("https://graph.microsoft.com/v1.0/me", {
      headers: { Authorization: `Bearer ${access_token}` },
      signal: AbortSignal.timeout(10000),
    });

    if (!infoRes.ok) {
      logger.error({ status: infoRes.status }, "Microsoft graph fetch failed");
      return res.redirect("/?auth=error");
    }

    const profile = await infoRes.json() as {
      id: string;
      displayName?: string;
      givenName?: string;
      surname?: string;
      mail?: string | null;
      userPrincipalName?: string;
    };

    const microsoftId = profile.id;
    if (!microsoftId) return res.redirect("/?auth=error");

    // Microsoft's `mail` field is null for many personal accounts;
    // fall back to userPrincipalName (which is the login handle,
    // often an email itself). The `email` OpenID scope also delivers
    // an email claim inside the ID token but Graph is what we already
    // fetched.
    const email = profile.mail || profile.userPrincipalName || null;
    // Microsoft doesn't send an email_verified claim on the Graph
    // response. Their consumer accounts are always email-verified;
    // work/school accounts are verified by the org's admin. Both
    // qualify as "verified" for our email-linking security check.
    const emailVerified = !!email;
    const displayName = profile.displayName
      || [profile.givenName, profile.surname].filter(Boolean).join(" ")
      || null;
    const avatarUrl = null; // Microsoft Graph photo requires a separate call + extra permission

    let user = await storage.getUserByMicrosoftId(microsoftId);
    if (!user) {
      // Only link to an existing Plotzy account by email when Microsoft
      // provided one AND the existing account is already email-verified.
      // Same security rationale as LinkedIn.
      if (email && emailVerified) {
        const existing = await storage.getUserByEmail(email);
        if (existing && (existing as any).emailVerified) {
          user = await storage.updateUser(existing.id, { microsoftId, avatarUrl: existing.avatarUrl || avatarUrl });
        }
      }
      if (!user) {
        user = await storage.createUser({
          microsoftId, email, displayName, avatarUrl,
          emailVerified,
        });
      }
    }

    await new Promise<void>((resolve, reject) => {
      req.login(user!, err => (err ? reject(err) : resolve()));
    });

    sendWelcomeEmailIfFirstTime(user!.id).catch(() => {});

    res.redirect("/?auth=success");
  } catch (err) {
    logger.error({ err }, "Microsoft callback error");
    res.redirect("/?auth=error");
  }
});

// ─── Verify Email ───────────────────────────────────────────────────────────

router.post("/api/auth/verify-email", sensitiveAuthLimiter, async (req, res) => {
  try {
    const { token } = z.object({ token: z.string().min(1) }).strict().parse(req.body);
    // DB stores SHA-256 of the token; hash the incoming value before lookup.
    const tokenHash = hashToken(token);
    const [vt] = await db.select().from(emailVerificationTokens).where(and(eq(emailVerificationTokens.token, tokenHash), sql`expires_at > NOW()`));
    if (!vt) return res.status(400).json({ message: "Invalid or expired verification link" });
    await storage.updateUser(vt.userId, { emailVerified: true });
    await db.delete(emailVerificationTokens).where(eq(emailVerificationTokens.userId, vt.userId));
    // Audit trail — verification fraud detection signal.
    await logAuditEvent({ actorId: vt.userId, action: "email_verified", targetType: "user", targetId: vt.userId, req });
    // Fire-and-forget welcome email. Helper is idempotent — re-clicks of the
    // verification link won't produce duplicate emails because welcomeEmailSentAt
    // gets set on first send. Doesn't block the verification response.
    sendWelcomeEmailIfFirstTime(vt.userId).catch(() => {});
    return res.json({ success: true });
  } catch (err) {
    logger.error({ err }, "Email verification error");
    return res.status(500).json({ message: "Verification failed" });
  }
});

// ─── Forgot Password (send reset link) ──────────────────────────────────────

router.post("/api/auth/forgot-password", sensitiveAuthLimiter, async (req, res) => {
  try {
    const { email } = z.object({ email: z.string().email() }).strict().parse(req.body);
    const user = await storage.getUserByEmail(email);

    // Always return success (don't reveal if email exists)
    if (!user) return res.json({ success: true });

    // Generate token. The raw value goes in the email; the DB stores
    // only the SHA-256 hash so a leak of the table can't be replayed.
    const token = crypto.randomBytes(32).toString("hex");
    // 30-minute window: short enough to limit risk if a reset email is
    // sniffed mid-flight, long enough that real users opening their
    // mailbox after a coffee break still make it. Industry norm is
    // 15-30 min for password reset; we err on the user-friendly end.
    const expiresAt = new Date(Date.now() + 30 * 60 * 1000);

    // Delete old tokens for this user
    await db.delete(passwordResetTokens).where(eq(passwordResetTokens.userId, user.id));

    // Save new token (hashed at rest)
    await db.insert(passwordResetTokens).values({ userId: user.id, token: hashToken(token), expiresAt });

    // Audit trail — pre-takeover signal. A flurry of forgot-password
    // requests for the same account is a classic recon pattern.
    await logAuditEvent({ actorId: user.id, action: "password_reset_requested", targetType: "user", targetId: user.id, req });

    // Send email
    const frontendUrl = (process.env.FRONTEND_URL || (process.env.NODE_ENV === "production"
      ? `https://${process.env.APP_DOMAIN || "localhost"}`
      : "http://localhost:5173")).replace(/\/+$/, "");
    const resetLink = `${frontendUrl}/reset-password/${token}`;

    try {
      await sendEmail(
        email,
        "Reset your Plotzy password",
        `
          <div style="font-family: -apple-system, sans-serif; max-width: 480px; margin: 0 auto; padding: 40px 20px;">
            <h2 style="color: #111; margin-bottom: 16px;">Reset your password</h2>
            <p style="color: #555; line-height: 1.6;">You requested a password reset for your Plotzy account. Click the button below to set a new password:</p>
            <a href="${resetLink}" style="display: inline-block; margin: 24px 0; padding: 14px 32px; background: #111; color: #fff; text-decoration: none; border-radius: 10px; font-weight: 600; font-size: 14px;">Reset Password</a>
            <p style="color: #999; font-size: 13px; line-height: 1.5;">This link expires in 1 hour. If you didn't request this, you can safely ignore this email.</p>
            <hr style="border: none; border-top: 1px solid #eee; margin: 32px 0;" />
            <p style="color: #bbb; font-size: 11px;">Plotzy — The modern platform for writers</p>
          </div>
        `,
      );
      // PII hygiene: log only the user id, never the raw email — these logs
      // are shipped off-host (Sentry / hosting platform) and are visible to
      // anyone with log-read access.
      logger.info({ userId: user.id }, "Password reset email sent");
    } catch (emailErr) {
      logger.error({ err: emailErr }, "Failed to send reset email");
    }

    return res.json({ success: true });
  } catch (err: any) {
    if (err?.name === "ZodError") return res.status(400).json({ message: "Invalid email" });
    logger.error({ err }, "Forgot password error");
    return res.status(500).json({ message: "Internal error" });
  }
});

// ─── Verify Reset Token (POST-based, no URL exposure) ──────────────────────

router.post("/api/auth/verify-reset-token", sensitiveAuthLimiter, async (req, res) => {
  try {
    const { token } = z.object({ token: z.string().min(1) }).strict().parse(req.body);
    // DB stores SHA-256 of the token; hash the incoming value before lookup.
    const tokenHash = hashToken(token);
    const [resetToken] = await db.select().from(passwordResetTokens)
      .where(and(eq(passwordResetTokens.token, tokenHash), sql`used_at IS NULL AND expires_at > NOW()`));
    if (!resetToken) return res.status(400).json({ valid: false, message: "Invalid or expired reset link." });
    return res.json({ valid: true });
  } catch {
    return res.status(400).json({ valid: false });
  }
});

// ─── Reset Password (with token) ────────────────────────────────────────────

router.post("/api/auth/reset-password", sensitiveAuthLimiter, async (req, res) => {
  try {
    const { token, password } = z.object({
      token: z.string().min(1),
      password: z.string().min(8),
    }).strict().parse(req.body);

    // Atomic compare-and-swap: UPDATE...RETURNING succeeds for exactly one
    // caller — the first one to flip used_at from NULL. A second concurrent
    // caller with the same token gets zero rows and is rejected. This is
    // what makes "single use token" actually single-use under concurrency;
    // the old SELECT-then-UPDATE pattern was racey while bcrypt.hash ran.
    // The DB stores the SHA-256 hash of the token; the WHERE compares
    // against the hash, so the raw token never round-trips through SQL.
    const tokenHash = hashToken(token);
    const [consumed] = await db
      .update(passwordResetTokens)
      .set({ usedAt: new Date() })
      .where(and(
        eq(passwordResetTokens.token, tokenHash),
        sql`used_at IS NULL`,
        sql`expires_at > NOW()`,
      ))
      .returning({ userId: passwordResetTokens.userId });

    if (!consumed) {
      return res.status(400).json({ message: "Invalid or expired reset link. Please request a new one." });
    }

    const passwordHash = await bcrypt.hash(password, 12);
    await storage.updateUser(consumed.userId, { passwordHash });

    // Audit trail — silent account hijack would otherwise leave no
    // record. Captures IP + UA so post-incident forensics can spot
    // the unfamiliar device/region.
    await logAuditEvent({ actorId: consumed.userId, action: "password_reset_completed", targetType: "user", targetId: consumed.userId, req });

    // Notify the user that their password was just changed. If the change
    // wasn't theirs (account takeover via compromised email), they need to
    // act fast — the email gives them the support contact and a re-reset
    // link. Wrapped in try/catch so a transient email failure doesn't
    // block the password update itself, which already succeeded.
    try {
      const user = await storage.getUserById(consumed.userId);
      if (user?.email) {
        await sendPasswordChangedEmail(user.email, "reset");
        logger.info({ userId: user.id }, "Password-changed notification sent");
      }
    } catch (emailErr) {
      // Log but don't fail the password reset — the password is already
      // updated; the user can still log in. The email is a courtesy.
      logger.error({ err: emailErr }, "Failed to send password-changed notification");
    }

    return res.json({ success: true });
  } catch (err: any) {
    if (err?.name === "ZodError") return res.status(400).json({ message: "Password must be at least 8 characters" });
    logger.error({ err }, "Reset password error");
    return res.status(500).json({ message: "Internal error" });
  }
});

// ── Change password while logged in ───────────────────────────────
//
// Distinct from the forgot-password / reset-password flow: this is for
// users who already know their current password and want to rotate it
// from account settings. Re-authentication via the current password
// is required so a borrowed session can't silently change the
// credentials and lock the legitimate owner out.
//
// OAuth-only users (no passwordHash on file) can't use this endpoint;
// the frontend gates the form on user.hasPassword and shows a
// "manage your password through Google" message instead. The backend
// also checks server-side as defence-in-depth.
//
// Side effects after a successful update:
//   - Bcrypt the new password at cost 12 (matches register +
//     reset-password).
//   - Audit log entry via logAuditEvent.
//   - Fire the same "Your password was changed" email used by the
//     reset-password flow (single helper, both endpoints stay in
//     sync).
//   - Regenerate the session ID (defence against session-fixation in
//     case the new password leaked the old session token in some
//     way). Other devices' sessions stay valid until natural expiry;
//     a "log out of all other sessions" feature is a deliberate
//     follow-up batch (would need user_sessions table introspection
//     since that table is managed by connect-pg-simple, not drizzle).
router.patch("/api/auth/password", sensitiveAuthLimiter, async (req, res) => {
  if (!req.isAuthenticated() || !req.user) {
    return res.status(401).json({ message: "Not authenticated" });
  }
  const userId = (req.user as any).id as number;
  try {
    const { currentPassword, newPassword } = z
      .object({
        currentPassword: z.string().min(1, "Current password is required"),
        newPassword: z.string().min(8, "New password must be at least 8 characters"),
      })
      .strict()
      .parse(req.body);

    const user = await storage.getUserById(userId);
    if (!user) {
      return res.status(401).json({ message: "Account not found" });
    }
    if (!user.passwordHash) {
      return res.status(400).json({
        message: "This account uses social sign-in. Manage your password through your sign-in provider.",
      });
    }

    const currentValid = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!currentValid) {
      return res.status(401).json({ message: "Current password is incorrect." });
    }

    // Reject same-as-current password. Cheap UX guard against the
    // "I just clicked save without changing anything" footgun, and
    // discourages no-op rotations that give a false sense of
    // security action being taken.
    const sameAsCurrent = await bcrypt.compare(newPassword, user.passwordHash);
    if (sameAsCurrent) {
      return res.status(400).json({ message: "New password must be different from your current password." });
    }

    const passwordHash = await bcrypt.hash(newPassword, 12);
    await storage.updateUser(userId, { passwordHash });
    await logAuditEvent({
      actorId: userId,
      action: "password_changed_logged_in",
      targetType: "user",
      targetId: userId,
      req,
    });

    // Session-fixation defence: rotate the session id. Doesn't kill
    // other devices' sessions but invalidates any stale token tied
    // to the pre-rotation password.
    await new Promise<void>((resolve, reject) =>
      req.session.regenerate((err) => (err ? reject(err) : resolve())),
    );
    await new Promise<void>((resolve, reject) =>
      req.login(user, (err) => (err ? reject(err) : resolve())),
    );

    // Best-effort email — never block success on Resend latency.
    if (user.email) {
      sendPasswordChangedEmail(user.email, "logged-in-change").catch((err) =>
        logger.warn({ err, userId }, "Failed to send password-changed email"),
      );
    }

    return res.json({ success: true });
  } catch (err: any) {
    if (err?.name === "ZodError") {
      const msg = err.issues?.[0]?.message || "Invalid request body";
      return res.status(400).json({ message: msg });
    }
    logger.error({ err, userId }, "Change-password failed");
    return res.status(500).json({ message: "Failed to change password" });
  }
});

// ── Notification preferences ──────────────────────────────────────
// Single endpoint surface for the user-facing notification toggles.
// Currently only emailEngagementNotifications (covers the
// comment-on-book and like-on-book emails). New booleans get added
// here as the catalogue grows; one endpoint keeps the frontend
// UX simple ("save preferences" instead of one PATCH per toggle).
router.patch("/api/auth/notification-prefs", async (req, res) => {
  if (!req.isAuthenticated() || !req.user) {
    return res.status(401).json({ message: "Not authenticated" });
  }
  const userId = (req.user as any).id as number;
  try {
    const { emailEngagementNotifications } = z
      .object({
        emailEngagementNotifications: z.boolean(),
      })
      .strict()
      .parse(req.body);

    await storage.updateUser(userId, { emailEngagementNotifications } as any);
    return res.json({ success: true, emailEngagementNotifications });
  } catch (err: any) {
    if (err?.name === "ZodError") return res.status(400).json({ message: "Invalid request" });
    logger.error({ err, userId }, "notification-prefs update failed");
    return res.status(500).json({ message: "Failed to update preferences" });
  }
});

// ── Change email (logged-in users) ─────────────────────────────────
//
// Three-endpoint flow:
//   PATCH  /api/auth/email          — initiate (validates + emails)
//   POST   /api/auth/email/verify   — confirm via token from new-email link
//   POST   /api/auth/email/cancel   — abort via token from old-email link
//
// Re-authentication requires the current password (same as
// account-deletion) so a borrowed session can't silently move the
// account to an attacker-controlled address. OAuth-only users
// (no passwordHash) cannot use the flow at all — their email is
// owned by the upstream provider; the frontend renders an
// informational notice instead of the form.
//
// Race / concurrency notes:
//   - Re-requests replace the previous pending row (delete-by-userId
//     before insert) so the user always has at most one pending
//     change. The token in their email becomes the only valid one.
//   - The verify path uses an UPDATE ... WHERE used_at IS NULL
//     RETURNING to single-shot consume the token under concurrent
//     clicks (same pattern as password reset).
//   - Email uniqueness is re-checked at verify time too. If someone
//     else snagged the new address between request and confirm, the
//     verify step rejects with a clear message.

const EMAIL_CHANGE_TOKEN_TTL_MS = 24 * 60 * 60 * 1000; // 24h

router.patch("/api/auth/email", sensitiveAuthLimiter, async (req, res) => {
  if (!req.isAuthenticated() || !req.user) {
    return res.status(401).json({ message: "Not authenticated" });
  }
  const userId = (req.user as any).id as number;
  try {
    const { newEmail, currentPassword } = z
      .object({
        newEmail: z.string().email().max(254),
        currentPassword: z.string().min(1, "Current password is required"),
      })
      .strict()
      .parse(req.body);

    const user = await storage.getUserById(userId);
    if (!user) return res.status(401).json({ message: "Account not found" });
    if (!user.passwordHash) {
      return res.status(400).json({
        message: "This account uses social sign-in. Update your email through your sign-in provider.",
      });
    }

    const validPassword = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!validPassword) {
      return res.status(401).json({ message: "Current password is incorrect." });
    }

    const normalized = newEmail.trim().toLowerCase();
    if (user.email && normalized === user.email.trim().toLowerCase()) {
      return res.status(400).json({ message: "New email must be different from your current email." });
    }
    const existing = await storage.getUserByEmail(normalized);
    if (existing && existing.id !== userId) {
      // Generic message: don't confirm whether an address is registered
      // or not, to avoid an account-enumeration oracle.
      return res.status(409).json({ message: "That email cannot be used for this change. Try another." });
    }

    // Replace any prior pending request for this user — only one
    // pending change at a time keeps the cancel UX unambiguous.
    await db.delete(emailChangeTokens).where(eq(emailChangeTokens.userId, userId));

    const rawToken = crypto.randomBytes(32).toString("hex");
    const tokenHash = hashToken(rawToken);
    const expiresAt = new Date(Date.now() + EMAIL_CHANGE_TOKEN_TTL_MS);
    await db.insert(emailChangeTokens).values({
      userId,
      token: tokenHash,
      newEmail: normalized,
      expiresAt,
    });

    // Verify-link to the NEW address; cancel-link to the OLD. Both
    // fire-and-forget so a transient Resend failure doesn't roll
    // back the pending-change record. Sequencing: send verify
    // first, THEN cancel notice — if Resend is down only for some
    // recipients, the user at least sees the verify link in the
    // most common case.
    sendEmailChangeVerifyEmail(normalized, rawToken).catch((err) =>
      logger.warn({ err, userId }, "Failed to send email-change verify email"),
    );
    if (user.email) {
      sendEmailChangeRequestedEmail(user.email, normalized, rawToken).catch((err) =>
        logger.warn({ err, userId }, "Failed to send email-change requested notification"),
      );
    }

    await logAuditEvent({
      actorId: userId,
      action: "email_change_requested",
      targetType: "user",
      targetId: userId,
      req,
      details: { newEmail: normalized },
    });

    return res.json({ success: true, pendingEmail: normalized });
  } catch (err: any) {
    if (err?.name === "ZodError") {
      const msg = err.issues?.[0]?.message || "Invalid request";
      return res.status(400).json({ message: msg });
    }
    logger.error({ err, userId }, "Email-change request failed");
    return res.status(500).json({ message: "Failed to start email change" });
  }
});

router.post("/api/auth/email/verify", sensitiveAuthLimiter, async (req, res) => {
  try {
    const { token } = z.object({ token: z.string().min(1) }).strict().parse(req.body);
    const tokenHash = hashToken(token);

    // Atomic single-shot consume. Returns the userId + newEmail in
    // one round trip; returns no rows if the token is missing,
    // already used, or expired.
    const [consumed] = await db
      .update(emailChangeTokens)
      .set({ usedAt: new Date() })
      .where(and(
        eq(emailChangeTokens.token, tokenHash),
        sql`used_at IS NULL`,
        sql`expires_at > NOW()`,
      ))
      .returning({ userId: emailChangeTokens.userId, newEmail: emailChangeTokens.newEmail });

    if (!consumed) {
      return res.status(400).json({ message: "This link is invalid, expired, or already used." });
    }

    // Re-check email uniqueness at verify time. If someone else
    // grabbed the address in the gap between request and confirm,
    // refuse the swap rather than creating a 23505 unique-violation
    // crash deeper in the update.
    const conflict = await storage.getUserByEmail(consumed.newEmail);
    if (conflict && conflict.id !== consumed.userId) {
      return res.status(409).json({ message: "That email is already in use by another account." });
    }

    await storage.updateUser(consumed.userId, { email: consumed.newEmail });

    await logAuditEvent({
      actorId: consumed.userId,
      action: "email_changed",
      targetType: "user",
      targetId: consumed.userId,
      req,
      details: { newEmail: consumed.newEmail },
    });

    sendEmailChangedConfirmationEmail(consumed.newEmail).catch((err) =>
      logger.warn({ err, userId: consumed.userId }, "Failed to send email-changed confirmation"),
    );

    return res.json({ success: true });
  } catch (err: any) {
    if (err?.name === "ZodError") return res.status(400).json({ message: "Invalid request" });
    logger.error({ err }, "Email-change verify failed");
    return res.status(500).json({ message: "Failed to verify email change" });
  }
});

router.post("/api/auth/email/cancel", sensitiveAuthLimiter, async (req, res) => {
  try {
    const { token } = z.object({ token: z.string().min(1) }).strict().parse(req.body);
    const tokenHash = hashToken(token);
    // Cancel = delete the token row. Idempotent: a second click
    // returns the same success shape so the user never sees an
    // "already cancelled" error from re-clicking the link.
    const deleted = await db
      .delete(emailChangeTokens)
      .where(eq(emailChangeTokens.token, tokenHash))
      .returning({ userId: emailChangeTokens.userId });

    if (deleted[0]?.userId) {
      await logAuditEvent({
        actorId: deleted[0].userId,
        action: "email_change_cancelled",
        targetType: "user",
        targetId: deleted[0].userId,
        req,
      });
    }
    return res.json({ success: true });
  } catch (err: any) {
    if (err?.name === "ZodError") return res.status(400).json({ message: "Invalid request" });
    logger.error({ err }, "Email-change cancel failed");
    return res.status(500).json({ message: "Failed to cancel email change" });
  }
});

export default router;
