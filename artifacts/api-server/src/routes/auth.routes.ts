import { Router } from "express";
import express from "express";
import { z } from "zod";
import bcrypt from "bcryptjs";
import passport from "passport";
import { OAuth2Client } from "google-auth-library";
import { storage } from "../storage";
import { getEnabledProviders, getLinkedinCallbackUrl } from "../auth";
import { ACHIEVEMENT_DEFINITIONS, computeXp, computeLevel, xpForNextLevel, xpForCurrentLevel } from "../../../../lib/shared/src/achievements";
import { logger } from "../lib/logger";
import { isAdminUser } from "../lib/admin";
import crypto from "crypto";
import { db } from "../db";
import { passwordResetTokens, emailVerificationTokens, loginAttempts } from "../../../../lib/db/src/schema";
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
      const { id, email, displayName, avatarUrl, googleId, appleId, subscriptionStatus, subscriptionTier, subscriptionPlan, subscriptionEndDate, suspended } = dbUser;
      const isAdmin = isAdminUser(dbUser);
      return res.json({
        id, email, displayName, avatarUrl,
        hasGoogle: !!googleId,
        hasApple: !!appleId,
        subscriptionStatus, subscriptionTier, subscriptionPlan, subscriptionEndDate,
        isAdmin,
        suspended: !!suspended,
      });
    }
    return res.status(401).json({ message: "Not authenticated" });
  } catch (err) {
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
      const verifyToken = crypto.randomBytes(32).toString("hex");
      await db.insert(emailVerificationTokens).values({ userId: user.id, token: verifyToken, expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000) });
      const frontendUrl = process.env.FRONTEND_URL || (process.env.NODE_ENV === "production" ? `https://${process.env.APP_DOMAIN || "localhost"}` : "http://localhost:5173");
      const { Resend } = await import("resend");
      const resend = new Resend(process.env.RESEND_API_KEY);
      await resend.emails.send({
        from: "Plotzy <onboarding@resend.dev>",
        to: email,
        subject: "Verify your Plotzy account",
        html: `<div style="font-family:-apple-system,sans-serif;max-width:480px;margin:0 auto;padding:40px 20px;"><h2 style="color:#111;">Welcome to Plotzy!</h2><p style="color:#555;line-height:1.6;">Please verify your email to get full access:</p><a href="${frontendUrl}/?verify=${verifyToken}" style="display:inline-block;margin:24px 0;padding:14px 32px;background:#111;color:#fff;text-decoration:none;border-radius:10px;font-weight:600;">Verify Email</a><p style="color:#999;font-size:13px;">This link expires in 24 hours.</p></div>`,
      });
    } catch (emailErr) { logger.error({ err: emailErr }, "Failed to send verification email"); }

    const { id, email: e, displayName: d, avatarUrl, subscriptionStatus, subscriptionPlan, subscriptionEndDate } = user;
    return res.status(201).json({ id, email: e, displayName: d, avatarUrl, subscriptionStatus, subscriptionPlan, subscriptionEndDate });
  } catch (err: any) {
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

    const { id, email: e, displayName: d, avatarUrl: a, subscriptionStatus, subscriptionPlan, subscriptionEndDate } = user;
    return res.json({ id, email: e, displayName: d, avatarUrl: a, subscriptionStatus, subscriptionPlan, subscriptionEndDate });
  } catch (err: any) {
    if (err?.name === "ZodError") return res.status(400).json({ message: "Invalid request" });
    logger.error({ err }, "Google One Tap error");
    return res.status(500).json({ message: "Sign-in failed" });
  }
});

// Google OAuth
router.get("/auth/google", passport.authenticate("google", { scope: ["profile", "email"] }));

const frontendUrl = process.env.FRONTEND_URL || (process.env.NODE_ENV === "production"
  ? `https://${process.env.APP_DOMAIN || process.env.REPLIT_DOMAINS?.split(",")[0] || "localhost"}`
  : "http://localhost:5173");

router.get(
  "/auth/google/callback",
  passport.authenticate("google", { failureRedirect: `${frontendUrl}/?auth=error` }),
  (req, res) => {
    res.redirect(`${frontendUrl}/?auth=success`);
  }
);

// Apple OAuth (callback is POST)
router.get("/auth/apple", passport.authenticate("apple"));

router.post(
  "/auth/apple/callback",
  express.urlencoded({ extended: true }),
  passport.authenticate("apple", { failureRedirect: "/?auth=error" }),
  (req, res) => {
    res.redirect("/?auth=success");
  }
);

// ─── LinkedIn OAuth (OpenID Connect) ────────────────────────────────────────

router.get("/auth/linkedin", (req, res) => {
  if (!process.env.LINKEDIN_CLIENT_ID || !process.env.LINKEDIN_CLIENT_SECRET) {
    return res.redirect("/?auth=error&msg=linkedin-not-configured");
  }
  const state = require("crypto").randomBytes(32).toString("hex");
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

    res.redirect("/?auth=success");
  } catch (err) {
    logger.error({ err }, "LinkedIn callback error");
    res.redirect("/?auth=error");
  }
});

// ─── Verify Email ───────────────────────────────────────────────────────────

router.post("/api/auth/verify-email", sensitiveAuthLimiter, async (req, res) => {
  try {
    const { token } = z.object({ token: z.string().min(1) }).strict().parse(req.body);
    const [vt] = await db.select().from(emailVerificationTokens).where(and(eq(emailVerificationTokens.token, token), sql`expires_at > NOW()`));
    if (!vt) return res.status(400).json({ message: "Invalid or expired verification link" });
    await storage.updateUser(vt.userId, { emailVerified: true });
    await db.delete(emailVerificationTokens).where(eq(emailVerificationTokens.userId, vt.userId));
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

    // Generate token
    const token = crypto.randomBytes(32).toString("hex");
    // 30-minute window: short enough to limit risk if a reset email is
    // sniffed mid-flight, long enough that real users opening their
    // mailbox after a coffee break still make it. Industry norm is
    // 15-30 min for password reset; we err on the user-friendly end.
    const expiresAt = new Date(Date.now() + 30 * 60 * 1000);

    // Delete old tokens for this user
    await db.delete(passwordResetTokens).where(eq(passwordResetTokens.userId, user.id));

    // Save new token
    await db.insert(passwordResetTokens).values({ userId: user.id, token, expiresAt });

    // Send email
    const frontendUrl = process.env.FRONTEND_URL || (process.env.NODE_ENV === "production"
      ? `https://${process.env.APP_DOMAIN || "localhost"}`
      : "http://localhost:5173");
    const resetLink = `${frontendUrl}/reset-password/${token}`;

    try {
      const { Resend } = await import("resend");
      const resend = new Resend(process.env.RESEND_API_KEY);
      await resend.emails.send({
        from: "Plotzy <onboarding@resend.dev>",
        to: email,
        subject: "Reset your Plotzy password",
        html: `
          <div style="font-family: -apple-system, sans-serif; max-width: 480px; margin: 0 auto; padding: 40px 20px;">
            <h2 style="color: #111; margin-bottom: 16px;">Reset your password</h2>
            <p style="color: #555; line-height: 1.6;">You requested a password reset for your Plotzy account. Click the button below to set a new password:</p>
            <a href="${resetLink}" style="display: inline-block; margin: 24px 0; padding: 14px 32px; background: #111; color: #fff; text-decoration: none; border-radius: 10px; font-weight: 600; font-size: 14px;">Reset Password</a>
            <p style="color: #999; font-size: 13px; line-height: 1.5;">This link expires in 1 hour. If you didn't request this, you can safely ignore this email.</p>
            <hr style="border: none; border-top: 1px solid #eee; margin: 32px 0;" />
            <p style="color: #bbb; font-size: 11px;">Plotzy — The modern platform for writers</p>
          </div>
        `,
      });
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
    const [resetToken] = await db.select().from(passwordResetTokens)
      .where(and(eq(passwordResetTokens.token, token), sql`used_at IS NULL AND expires_at > NOW()`));
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
    const [consumed] = await db
      .update(passwordResetTokens)
      .set({ usedAt: new Date() })
      .where(and(
        eq(passwordResetTokens.token, token),
        sql`used_at IS NULL`,
        sql`expires_at > NOW()`,
      ))
      .returning({ userId: passwordResetTokens.userId });

    if (!consumed) {
      return res.status(400).json({ message: "Invalid or expired reset link. Please request a new one." });
    }

    const passwordHash = await bcrypt.hash(password, 12);
    await storage.updateUser(consumed.userId, { passwordHash });

    return res.json({ success: true });
  } catch (err: any) {
    if (err?.name === "ZodError") return res.status(400).json({ message: "Password must be at least 8 characters" });
    logger.error({ err }, "Reset password error");
    return res.status(500).json({ message: "Internal error" });
  }
});

export default router;
