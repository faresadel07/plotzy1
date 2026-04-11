import { Router } from "express";
import express from "express";
import { z } from "zod";
import bcrypt from "bcryptjs";
import passport from "passport";
import { storage } from "../storage";
import { getEnabledProviders, getLinkedinCallbackUrl } from "../auth";
import { ACHIEVEMENT_DEFINITIONS, computeXp, computeLevel, xpForNextLevel, xpForCurrentLevel } from "../../../../lib/shared/src/achievements";

const router = Router();

// ─── Auth Routes ────────────────────────────────────────────────────────────

router.get("/api/auth/providers", (_req, res) => {
  res.json(getEnabledProviders());
});

// ─── Gamification: Achievements & Stats ────────────────────────────────────

router.get("/api/achievements", (_req, res) => {
  res.json(ACHIEVEMENT_DEFINITIONS);
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
    res.json({
      ...stats,
      totalViewsReceived: totalViews,
      xp,
      level,
      xpToNextLevel: Math.max(nextLevelXp - xp, 0),
      xpForCurrentLevel: currentLevelXp,
      xpForNextLevel: nextLevelXp,
    });
  } catch (err) {
    res.status(500).json({ message: "Internal error" });
  }
});

router.get("/api/users/me/achievements", async (req, res) => {
  if (!req.isAuthenticated()) return res.status(401).json({ message: "Not authenticated" });
  const userId = (req.user as any).id;
  try {
    const achievements = await storage.getUserAchievements(userId);
    res.json(achievements);
  } catch (err) {
    res.status(500).json({ message: "Internal error" });
  }
});

// ─── Auth ────────────────────────────────────────────────────────────────────

router.get("/api/auth/user", async (req, res) => {
  try {
    if (req.isAuthenticated() && req.user) {
      const dbUser = await storage.getUserById(req.user.id);
      if (!dbUser) return res.status(401).json({ message: "Not authenticated" });
      const { id, email, displayName, avatarUrl, googleId, appleId, subscriptionStatus, subscriptionPlan, subscriptionEndDate, suspended } = dbUser;
      const isAdmin = !!(process.env.ADMIN_EMAIL && email === process.env.ADMIN_EMAIL);
      return res.json({ id, email, displayName, avatarUrl, googleId, appleId, subscriptionStatus, subscriptionPlan, subscriptionEndDate, isAdmin, suspended: !!suspended });
    }
    return res.status(401).json({ message: "Not authenticated" });
  } catch (err) {
    res.status(500).json({ message: "Internal error" });
  }
});

// ─── Email / Password Auth ─────────────────────────────────────────────────

router.post("/api/auth/register", async (req, res) => {
  try {
    const { email, password, displayName } = z.object({
      email: z.string().email(),
      password: z.string().min(8, "Password must be at least 8 characters"),
      displayName: z.string().min(1).optional(),
    }).parse(req.body);

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

    const { id, email: e, displayName: d, avatarUrl, subscriptionStatus, subscriptionPlan, subscriptionEndDate } = user;
    return res.status(201).json({ id, email: e, displayName: d, avatarUrl, subscriptionStatus, subscriptionPlan, subscriptionEndDate });
  } catch (err: any) {
    if (err?.name === "ZodError") return res.status(400).json({ message: err.errors?.[0]?.message || "Invalid input" });
    return res.status(500).json({ message: "Registration failed" });
  }
});

router.post("/api/auth/login", async (req, res) => {
  try {
    const { email, password } = z.object({
      email: z.string().email(),
      password: z.string().min(1),
    }).parse(req.body);

    const user = await storage.getUserByEmail(email);
    if (!user || !user.passwordHash) return res.status(401).json({ message: "Invalid email or password." });

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) return res.status(401).json({ message: "Invalid email or password." });

    // Capture guest book IDs before the session may change
    const guestIds: number[] = (req.session as any).guestBookIds || [];

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
    return res.status(500).json({ message: "Login failed" });
  }
});

router.post("/api/auth/logout", (req, res) => {
  req.logout((err) => {
    if (err) return res.status(500).json({ message: "Logout failed" });
    req.session.destroy(() => {
      res.json({ success: true });
    });
  });
});

router.patch("/api/auth/avatar", async (req, res) => {
  try {
    if (!req.isAuthenticated() || !req.user) {
      return res.status(401).json({ message: "Not authenticated" });
    }
    const { avatarUrl } = z.object({ avatarUrl: z.string().max(10_000_000) }).parse(req.body);
    const updated = await storage.updateUser(req.user.id, { avatarUrl });
    const { passwordHash: _ph, ...safe } = updated as any;
    return res.json(safe);
  } catch (err) {
    res.status(500).json({ message: "Internal error" });
  }
});

router.patch("/api/auth/display-name", async (req, res) => {
  try {
    if (!req.isAuthenticated() || !req.user) {
      return res.status(401).json({ message: "Not authenticated" });
    }
    const { displayName } = z.object({ displayName: z.string().min(1).max(50) }).parse(req.body);
    const updated = await storage.updateUser(req.user.id, { displayName });
    res.json(updated);
  } catch (err) {
    res.status(500).json({ message: "Internal error" });
  }
});

// Google OAuth
router.get("/auth/google", passport.authenticate("google", { scope: ["profile", "email"] }));

const frontendUrl = process.env.FRONTEND_URL || (process.env.NODE_ENV === "production" ? "" : "http://localhost:5173");

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
  const state = Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2);
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
      console.error("[linkedin] OAuth error:", error);
      return res.redirect("/?auth=error");
    }

    const savedState = (req.session as any).linkedinOAuthState;
    if (!state || state !== savedState) {
      console.error("[linkedin] State mismatch");
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
      console.error("[linkedin] Token exchange failed:", txt);
      return res.redirect("/?auth=error");
    }

    const { access_token } = await tokenRes.json() as { access_token: string };

    // Fetch user info via OpenID Connect userinfo endpoint
    const infoRes = await fetch("https://api.linkedin.com/v2/userinfo", {
      headers: { Authorization: `Bearer ${access_token}` },
      signal: AbortSignal.timeout(10000),
    });

    if (!infoRes.ok) {
      console.error("[linkedin] Userinfo fetch failed:", infoRes.status);
      return res.redirect("/?auth=error");
    }

    const profile = await infoRes.json() as {
      sub: string;
      name?: string;
      given_name?: string;
      family_name?: string;
      email?: string;
      picture?: string;
    };

    const linkedinId = profile.sub;
    if (!linkedinId) return res.redirect("/?auth=error");

    const email = profile.email || null;
    const displayName = profile.name || [profile.given_name, profile.family_name].filter(Boolean).join(" ") || null;
    const avatarUrl = profile.picture || null;

    let user = await storage.getUserByLinkedinId(linkedinId);
    if (!user) {
      if (email) {
        user = await storage.getUserByEmail(email);
        if (user) {
          user = await storage.updateUser(user.id, { linkedinId, avatarUrl: user.avatarUrl || avatarUrl });
        }
      }
      if (!user) {
        user = await storage.createUser({ linkedinId, email, displayName, avatarUrl });
      }
    }

    await new Promise<void>((resolve, reject) => {
      req.login(user!, err => (err ? reject(err) : resolve()));
    });

    res.redirect("/?auth=success");
  } catch (err) {
    console.error("[linkedin] callback error:", err);
    res.redirect("/?auth=error");
  }
});

export default router;
