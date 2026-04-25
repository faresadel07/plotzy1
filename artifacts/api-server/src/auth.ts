import passport from "passport";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import { storage } from "./storage";
import { logger } from "./lib/logger";

declare global {
  namespace Express {
    interface User {
      id: number;
      email?: string | null;
      displayName?: string | null;
      googleId?: string | null;
      appleId?: string | null;
      linkedinId?: string | null;
      avatarUrl?: string | null;
      role?: string;
      subscriptionStatus?: string | null;
      subscriptionPlan?: string | null;
      subscriptionEndDate?: Date | null;
      stripeCustomerId?: string | null;
      stripeSubscriptionId?: string | null;
    }
  }
}

function getCallbackBase(): string {
  if (process.env.APP_DOMAIN) return process.env.APP_DOMAIN;
  const domain = process.env.REPLIT_DOMAINS?.split(",")[0];
  if (domain) return `https://${domain}`;
  const port = process.env.PORT || "8080";
  return `http://localhost:${port}`;
}

export function setupPassport() {
  passport.serializeUser((user, done) => {
    done(null, user.id);
  });

  passport.deserializeUser(async (id: number, done) => {
    try {
      const user = await storage.getUserById(id);
      done(null, user || false);
    } catch (err) {
      done(err);
    }
  });

  if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
    passport.use(
      new GoogleStrategy(
        {
          clientID: process.env.GOOGLE_CLIENT_ID,
          clientSecret: process.env.GOOGLE_CLIENT_SECRET,
          callbackURL: `${getCallbackBase()}/auth/google/callback`,
        },
        async (_accessToken, _refreshToken, profile, done) => {
          try {
            let user = await storage.getUserByGoogleId(profile.id);
            if (!user) {
              const email = profile.emails?.[0]?.value || null;
              if (email) {
                user = await storage.getUserByEmail(email);
                if (user) {
                  user = await storage.updateUser(user.id, { googleId: profile.id });
                }
              }
              if (!user) {
                user = await storage.createUser({
                  googleId: profile.id,
                  email,
                  displayName: profile.displayName || null,
                  avatarUrl: profile.photos?.[0]?.value || null,
                  // Google verifies the email before letting it be used
                  // on a Google account; trust it as our verification.
                  emailVerified: true,
                } as any);
              }
            }
            done(null, user);
          } catch (err) {
            done(err as Error);
          }
        }
      )
    );
  }

  if (
    process.env.APPLE_CLIENT_ID &&
    process.env.APPLE_TEAM_ID &&
    process.env.APPLE_KEY_ID &&
    process.env.APPLE_PRIVATE_KEY
  ) {
    try {
      const { Strategy: AppleStrategy } = require("passport-apple");
      passport.use(
        new AppleStrategy(
          {
            clientID: process.env.APPLE_CLIENT_ID,
            teamID: process.env.APPLE_TEAM_ID,
            keyID: process.env.APPLE_KEY_ID,
            privateKeyString: process.env.APPLE_PRIVATE_KEY.replace(/\\n/g, "\n"),
            callbackURL: `${getCallbackBase()}/auth/apple/callback`,
            passReqToCallback: false,
          },
          async (_at: any, _rt: any, idToken: any, _profile: any, done: any) => {
            try {
              const appleId = idToken?.sub;
              const email = idToken?.email || null;
              // Apple's id_token includes `email_verified` as either a
              // boolean OR a stringified boolean depending on SDK version.
              // Accept both forms; default to false for safety.
              const emailVerified = idToken?.email_verified === true
                || idToken?.email_verified === "true";
              if (!appleId) return done(new Error("No Apple ID in token"));
              let user = await storage.getUserByAppleId(appleId);
              if (!user) {
                // SECURITY: only link by email when Apple explicitly says
                // the address is verified. Apple's relay-email feature
                // can issue tokens without `email_verified=true`, and a
                // future API change could add unverified flows. Mirrors
                // the Google One Tap parity.
                if (email && emailVerified) {
                  user = await storage.getUserByEmail(email);
                  if (user) user = await storage.updateUser(user.id, { appleId });
                }
                if (!user) {
                  user = await storage.createUser({
                    appleId, email,
                    emailVerified,
                  } as any);
                }
              }
              done(null, user);
            } catch (err) {
              done(err as Error);
            }
          }
        )
      );
    } catch (e) {
      logger.warn({ err: e }, "Apple strategy setup failed");
    }
  }
}

export function getEnabledProviders() {
  return {
    google:   !!(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET),
    apple:    !!(process.env.APPLE_CLIENT_ID && process.env.APPLE_TEAM_ID && process.env.APPLE_KEY_ID && process.env.APPLE_PRIVATE_KEY),
    linkedin: !!(process.env.LINKEDIN_CLIENT_ID && process.env.LINKEDIN_CLIENT_SECRET),
    facebook: false,
    email:    true,
  };
}

export function getLinkedinCallbackUrl(): string {
  const domain = process.env.REPLIT_DOMAINS?.split(",")[0];
  const base = domain ? `https://${domain}` : `http://localhost:5000`;
  return `${base}/auth/linkedin/callback`;
}
