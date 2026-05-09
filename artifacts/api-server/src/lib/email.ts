import { logger } from "./logger";
import { storage } from "../storage";

let resendClient: any = null;

async function getResend() {
  if (!process.env.RESEND_API_KEY) return null;
  if (!resendClient) {
    const { Resend } = await import("resend");
    resendClient = new Resend(process.env.RESEND_API_KEY);
  }
  return resendClient;
}

// Strip CR/LF (and other newline-class chars) from any string that ends up in
// an email header — Subject, From, To. Without this an attacker who controls
// a displayName or message snippet could inject "\r\nBcc: ..." and fan-out
// notifications to addresses they choose. The two unicode escapes catch
// U+2028/U+2029 which JS treats as line terminators too.
function sanitizeHeader(value: string): string {
  return String(value)
    .replace(/[\r\n\t]/g, " ")
    .trim()
    .slice(0, 998);
}

// Escape user-supplied text before interpolating into an HTML email body.
function escapeHtml(value: string): string {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

// Default From address for transactional emails (welcome, password
// reset, cancel confirmations, etc.). Uses noreply@ because these
// messages are not reply-targets — replies should go to support
// channels, not to the automation mailbox. Domain plotzy.co was
// verified in Resend on 2026-05-09 (closes pre-launch audit C-2).
const DEFAULT_FROM = "Plotzy <noreply@plotzy.co>";

export async function sendEmail(
  to: string,
  subject: string,
  html: string,
  opts?: { from?: string; replyTo?: string },
) {
  try {
    const resend = await getResend();
    if (!resend) { logger.warn("RESEND_API_KEY not set — skipping email"); return; }
    const safeSubject = sanitizeHeader(subject);
    const safeTo = sanitizeHeader(to);
    // Build payload incrementally so optional headers (from, replyTo) are
    // only attached when present. Resend's SDK accepts/strips undefined
    // fields either way, but keeping the payload minimal makes the call
    // sites and the email-debug logs easier to read.
    const payload: Record<string, unknown> = {
      from: opts?.from ? sanitizeHeader(opts.from) : DEFAULT_FROM,
      to: safeTo,
      subject: safeSubject,
      html,
    };
    if (opts?.replyTo) {
      payload.replyTo = sanitizeHeader(opts.replyTo);
    }
    await resend.emails.send(payload as any);
    logger.info({ to: safeTo, subject: safeSubject }, "Email sent");
  } catch (err) {
    logger.error({ err, to, subject }, "Email send failed");
  }
}

/**
 * Idempotently send the one-time welcome email to a user. Safe to call
 * from every "user just got verified / signed up" trigger point:
 *  - email/password verification confirmation
 *  - Google One Tap signup
 *  - Passport Google strategy
 *  - Apple Sign in
 *  - LinkedIn OAuth
 *
 * Three guards prevent unwanted sends:
 *   1. Missing user / missing email → defensive early-return
 *   2. emailVerified is false → only welcome verified addresses
 *   3. welcomeEmailSentAt is already set → prevent duplicates on
 *      re-verify, second OAuth provider linking, etc.
 *
 * The `welcomeEmailSentAt` timestamp is set AFTER the send attempt,
 * regardless of whether the send actually succeeded (sendEmail itself
 * silently no-ops when RESEND_API_KEY is missing). Better to occasionally
 * miss one welcome email in a misconfigured environment than to re-send
 * dozens to the same user every login attempt.
 */
export async function sendWelcomeEmailIfFirstTime(userId: number): Promise<void> {
  try {
    const user = await storage.getUserById(userId);
    if (!user || !user.email) return;
    if (!user.emailVerified) return;
    if ((user as any).welcomeEmailSentAt) return;

    const displayName = user.displayName || user.email.split("@")[0] || "there";
    const frontendUrl = process.env.FRONTEND_URL || "http://localhost:5173";
    const safeName = escapeHtml(displayName);
    const safeFrontendUrl = escapeHtml(frontendUrl);

    const html = `
      <div style="font-family:-apple-system,sans-serif;max-width:480px;margin:0 auto;padding:40px 20px;">
        <h2 style="color:#111;margin-bottom:12px;">Welcome to Plotzy, ${safeName} 👋</h2>
        <p style="color:#555;line-height:1.6;">
          We're glad to have you. Plotzy is the modern platform for writers — write, design covers, and publish, all in one place.
        </p>
        <p style="color:#555;line-height:1.6;margin-top:24px;font-weight:600;">Try these to get started:</p>
        <ul style="color:#555;line-height:1.8;padding-left:0;list-style:none;margin:8px 0 24px;">
          <li>✏️&nbsp;&nbsp;Create your first book</li>
          <li>🤖&nbsp;&nbsp;Try AI assist for writing</li>
          <li>📚&nbsp;&nbsp;Browse the Community Library</li>
        </ul>
        <a href="${safeFrontendUrl}" style="display:inline-block;margin:8px 0;padding:14px 32px;background:#111;color:#fff;text-decoration:none;border-radius:10px;font-weight:600;font-size:14px;">Start writing →</a>
        <p style="color:#888;font-size:13px;line-height:1.5;margin-top:16px;">
          New to writing online? <a href="${safeFrontendUrl}/tutorial" style="color:#111;text-decoration:underline;">See the tutorial →</a>
        </p>
        <hr style="border:none;border-top:1px solid #eee;margin:32px 0;" />
        <p style="color:#bbb;font-size:11px;">Plotzy — The modern platform for writers</p>
        <p style="color:#bbb;font-size:11px;margin-top:4px;">You're getting this because you just joined Plotzy.</p>
      </div>
    `;

    await sendEmail(user.email, "Welcome to Plotzy! 🎉", html);

    // Mark sent unconditionally after the attempt. sendEmail() itself
    // wraps in try/catch and never throws, so reaching this line means
    // the helper made its best effort. If RESEND_API_KEY was missing,
    // the email didn't go out — but we still mark sent so we don't
    // re-attempt on every subsequent trigger.
    await storage.updateUser(userId, { welcomeEmailSentAt: new Date() } as any);
  } catch (err) {
    logger.error({ err, userId }, "sendWelcomeEmailIfFirstTime failed");
  }
}

export async function sendNotificationEmail(to: string, title: string, body: string) {
  // `title` and `body` typically include user-controlled data (follower
  // displayName, message snippet, book title, etc.) — escape before
  // dropping into the HTML template, and strip newlines from the title
  // before it goes into the Subject header inside sendEmail.
  const titleSafe = escapeHtml(title);
  const bodySafe = escapeHtml(body);
  const frontendUrl = process.env.FRONTEND_URL || "http://localhost:5173";
  const html = `
    <div style="font-family:-apple-system,sans-serif;max-width:480px;margin:0 auto;padding:40px 20px;">
      <h2 style="color:#111;margin-bottom:8px;">${titleSafe}</h2>
      <p style="color:#555;line-height:1.6;">${bodySafe}</p>
      <a href="${escapeHtml(frontendUrl)}" style="display:inline-block;margin:24px 0;padding:12px 28px;background:#111;color:#fff;text-decoration:none;border-radius:10px;font-weight:600;font-size:14px;">Open Plotzy</a>
      <hr style="border:none;border-top:1px solid #eee;margin:32px 0;" />
      <p style="color:#bbb;font-size:11px;">Plotzy — The modern platform for writers</p>
    </div>
  `;
  await sendEmail(to, title, html);
}

/**
 * Notify a user that their account has been suspended by an admin.
 * Called from the single-user and bulk suspension endpoints; both fire
 * this fire-and-forget after the suspend transitions false → true so a
 * transient email failure cannot roll back the actual suspension.
 *
 * NO USER-SUPPLIED CONTENT IS INTERPOLATED INTO THE TEMPLATE TODAY.
 * The optional `reason` argument flows through escapeHtml() before being
 * dropped into the body — otherwise an admin who can suspend users
 * could craft an HTML-injection payload as the "reason" and weaponise
 * the email pipeline against the suspended user.
 */
export async function sendSuspensionEmail(toEmail: string, reason?: string | null): Promise<void> {
  // Configurable so prod can point appeal traffic at a real support@
  // address when one exists. Defaults to support@plotzy.co (the
  // verified Resend domain we own); operators can override via the
  // SUPPORT_EMAIL env var without a redeploy.
  const supportEmail = process.env.SUPPORT_EMAIL || "support@plotzy.co";
  const subject = "Your Plotzy account has been suspended";
  const reasonBlock = reason && reason.trim()
    ? `<p style="color: #555; line-height: 1.6; margin-top: 16px;"><strong>Reason given by our team:</strong></p>
       <blockquote style="margin: 8px 0 0; padding: 12px 14px; background: #f7f7f7; border-left: 3px solid #111; border-radius: 6px; color: #333; font-size: 14px; line-height: 1.6;">${escapeHtml(reason.trim())}</blockquote>`
    : "";
  const html = `
    <div style="font-family: -apple-system, sans-serif; max-width: 480px; margin: 0 auto; padding: 40px 20px;">
      <h2 style="color: #111; margin-bottom: 16px;">Your account has been suspended</h2>
      <p style="color: #555; line-height: 1.6;">Your Plotzy account has been suspended. You will not be able to sign in or use the platform while the suspension is in effect.</p>
      ${reasonBlock}
      <p style="color: #555; line-height: 1.6; margin-top: 16px;">If you believe this was a mistake, or if you'd like to appeal, please contact us:</p>
      <a href="mailto:${supportEmail}" style="display: inline-block; margin: 16px 0 8px; padding: 14px 32px; background: #111; color: #fff; text-decoration: none; border-radius: 10px; font-weight: 600; font-size: 14px;">${supportEmail}</a>
      <p style="color: #999; font-size: 13px; line-height: 1.5; margin-top: 16px;">We review appeals as quickly as we can.</p>
      <hr style="border: none; border-top: 1px solid #eee; margin: 32px 0;" />
      <p style="color: #bbb; font-size: 11px;">Plotzy, the modern platform for writers</p>
    </div>
  `;
  await sendEmail(toEmail, subject, html);
}

/**
 * "Confirm your new email address" — sent to the NEW address when
 * a logged-in user requests an email change. Contains the
 * verification link that, once clicked, atomically swaps the
 * users.email column to the new value.
 */
export async function sendEmailChangeVerifyEmail(
  toNewEmail: string,
  rawToken: string,
): Promise<void> {
  const frontendUrl = process.env.FRONTEND_URL || "https://plotzy.co";
  const supportEmail = process.env.SUPPORT_EMAIL || "support@plotzy.co";
  const subject = "Confirm your new Plotzy email";
  const verifyUrl = `${frontendUrl}/?verify-email-change=${encodeURIComponent(rawToken)}`;
  const html = `
    <div style="font-family: -apple-system, sans-serif; max-width: 480px; margin: 0 auto; padding: 40px 20px;">
      <h2 style="color: #111; margin-bottom: 16px;">Confirm your new email</h2>
      <p style="color: #555; line-height: 1.6;">A request was made from your Plotzy account to change the sign-in email to this address. Click below to confirm and switch over:</p>
      <a href="${escapeHtml(verifyUrl)}" style="display: inline-block; margin: 16px 0 8px; padding: 14px 32px; background: #111; color: #fff; text-decoration: none; border-radius: 10px; font-weight: 600; font-size: 14px;">Confirm new email</a>
      <p style="color: #999; font-size: 13px; line-height: 1.5; margin-top: 16px;">This link expires in 24 hours. If you did not request this change, you can safely ignore this email — nothing changes until you click the link.</p>
      <p style="color: #999; font-size: 13px; line-height: 1.5; margin-top: 12px;">Questions? <a href="mailto:${escapeHtml(supportEmail)}" style="color: #111;">${escapeHtml(supportEmail)}</a></p>
      <hr style="border: none; border-top: 1px solid #eee; margin: 32px 0;" />
      <p style="color: #bbb; font-size: 11px;">Plotzy, the modern platform for writers</p>
    </div>
  `;
  await sendEmail(toNewEmail, subject, html);
}

/**
 * "Email change requested" — sent to the OLD address as soon as the
 * change is initiated, before the new address has confirmed. Gives
 * the legitimate owner a one-click cancel path so an attacker who
 * compromises the new-email side cannot silently move the account
 * away from them.
 */
export async function sendEmailChangeRequestedEmail(
  toOldEmail: string,
  newEmail: string,
  rawToken: string,
): Promise<void> {
  const frontendUrl = process.env.FRONTEND_URL || "https://plotzy.co";
  const supportEmail = process.env.SUPPORT_EMAIL || "support@plotzy.co";
  const subject = "Email change requested for your Plotzy account";
  const cancelUrl = `${frontendUrl}/?cancel-email-change=${encodeURIComponent(rawToken)}`;
  const html = `
    <div style="font-family: -apple-system, sans-serif; max-width: 480px; margin: 0 auto; padding: 40px 20px;">
      <h2 style="color: #111; margin-bottom: 16px;">Email change requested</h2>
      <p style="color: #555; line-height: 1.6;">Someone (hopefully you) requested to change the email on your Plotzy account from this address to:</p>
      <div style="margin: 14px 0; padding: 12px 14px; background: #f7f7f7; border-radius: 8px; font-family: ui-monospace, SF Mono, Menlo, monospace; font-size: 14px; color: #111;">
        ${escapeHtml(newEmail)}
      </div>
      <p style="color: #555; line-height: 1.6; margin-top: 16px;">The change is <strong>not yet active</strong> — it will only take effect once the new address confirms.</p>
      <p style="color: #555; line-height: 1.6; margin-top: 16px;"><strong>If this wasn't you</strong>, cancel the request immediately:</p>
      <a href="${escapeHtml(cancelUrl)}" style="display: inline-block; margin: 16px 0 8px; padding: 14px 32px; background: #b91c1c; color: #fff; text-decoration: none; border-radius: 10px; font-weight: 600; font-size: 14px;">Cancel the request</a>
      <p style="color: #999; font-size: 13px; line-height: 1.5; margin-top: 16px;">Then change your password right away. Reach support at <a href="mailto:${escapeHtml(supportEmail)}" style="color: #111;">${escapeHtml(supportEmail)}</a> if you need help.</p>
      <hr style="border: none; border-top: 1px solid #eee; margin: 32px 0;" />
      <p style="color: #bbb; font-size: 11px;">Plotzy, the modern platform for writers</p>
    </div>
  `;
  await sendEmail(toOldEmail, subject, html);
}

/**
 * "Your email was changed" — confirmation sent to the NEW address
 * after the verify token is consumed and users.email is swapped.
 * Mirrors the password-changed pattern: a positive confirmation so
 * the user knows the action completed.
 */
export async function sendEmailChangedConfirmationEmail(
  toNewEmail: string,
): Promise<void> {
  const supportEmail = process.env.SUPPORT_EMAIL || "support@plotzy.co";
  const subject = "Your Plotzy email has been updated";
  const html = `
    <div style="font-family: -apple-system, sans-serif; max-width: 480px; margin: 0 auto; padding: 40px 20px;">
      <h2 style="color: #111; margin-bottom: 16px;">Email updated</h2>
      <p style="color: #555; line-height: 1.6;">This email address is now the sign-in email for your Plotzy account. Use it to sign in from now on.</p>
      <p style="color: #999; font-size: 13px; line-height: 1.5; margin-top: 16px;">Did not expect this? Contact us at <a href="mailto:${escapeHtml(supportEmail)}" style="color: #111;">${escapeHtml(supportEmail)}</a>.</p>
      <hr style="border: none; border-top: 1px solid #eee; margin: 32px 0;" />
      <p style="color: #bbb; font-size: 11px;">Plotzy, the modern platform for writers</p>
    </div>
  `;
  await sendEmail(toNewEmail, subject, html);
}

/**
 * "Your password was changed" notification.
 *
 * Sent after BOTH the forgot-password reset flow and the
 * logged-in change-password flow finish updating the hash. Single
 * helper so both call sites stay in sync (subject, body, support
 * link, footer). The body adapts a single sentence to the source
 * so the user can tell which flow ran.
 */
export async function sendPasswordChangedEmail(
  toEmail: string,
  source: "reset" | "logged-in-change",
): Promise<void> {
  const supportEmail = process.env.SUPPORT_EMAIL || "support@plotzy.co";
  const frontendUrl = process.env.FRONTEND_URL || "https://plotzy.co";
  const subject = "Your Plotzy password was changed";
  const sourceLine = source === "reset"
    ? "Your Plotzy account password was just reset successfully via the forgot-password flow."
    : "Your Plotzy account password was just changed successfully from your account settings.";
  const html = `
    <div style="font-family: -apple-system, sans-serif; max-width: 480px; margin: 0 auto; padding: 40px 20px;">
      <h2 style="color: #111; margin-bottom: 16px;">Your password was changed</h2>
      <p style="color: #555; line-height: 1.6;">${sourceLine} If this was you, no action is needed.</p>
      <p style="color: #555; line-height: 1.6; margin-top: 16px;"><strong>If you didn't do this</strong>, your account may be compromised. Reset your password immediately and contact us:</p>
      <a href="${escapeHtml(frontendUrl)}/forgot-password" style="display: inline-block; margin: 16px 0 8px; padding: 14px 32px; background: #111; color: #fff; text-decoration: none; border-radius: 10px; font-weight: 600; font-size: 14px;">Reset password</a>
      <p style="color: #555; font-size: 13px; margin-top: 12px;">Or email <a href="mailto:${escapeHtml(supportEmail)}" style="color: #111;">${escapeHtml(supportEmail)}</a> for urgent help.</p>
      <hr style="border: none; border-top: 1px solid #eee; margin: 32px 0;" />
      <p style="color: #bbb; font-size: 11px;">Plotzy, the modern platform for writers</p>
    </div>
  `;
  await sendEmail(toEmail, subject, html);
}

/**
 * "New login from an unrecognised device" notification.
 *
 * Sent by the /api/auth/login handler when a successful login lands
 * from a device fingerprint (browser × OS × IP) the user has not
 * signed in from before. NEVER sent on the user's first-ever login —
 * the welcome email already says "you're in", a security alert on
 * top of that confuses people.
 *
 * All caller-supplied strings flow through escapeHtml() so a
 * compromised UA / IP path can't smuggle markup into the body.
 */
export async function sendNewLoginEmail(
  toEmail: string,
  info: { browser?: string | null; os?: string | null; ip?: string | null; whenIso?: string },
): Promise<void> {
  const supportEmail = process.env.SUPPORT_EMAIL || "support@plotzy.co";
  const frontendUrl = process.env.FRONTEND_URL || "https://plotzy.co";
  const subject = "New login to your Plotzy account";

  const browser = info.browser ?? "Unknown browser";
  const os = info.os ?? "Unknown OS";
  const ip = info.ip ?? "Unknown";
  const when = info.whenIso ?? new Date().toISOString();
  // Format: "Saturday, May 9, 2026 at 12:34 PM UTC"
  const formattedWhen = (() => {
    try {
      const d = new Date(when);
      return d.toUTCString();
    } catch {
      return when;
    }
  })();

  const html = `
    <div style="font-family: -apple-system, sans-serif; max-width: 480px; margin: 0 auto; padding: 40px 20px;">
      <h2 style="color: #111; margin-bottom: 16px;">New sign-in to your Plotzy account</h2>
      <p style="color: #555; line-height: 1.6;">A successful sign-in to your Plotzy account just happened from a device we have not seen before:</p>
      <div style="margin: 18px 0; padding: 14px 16px; background: #f7f7f7; border-radius: 8px; font-size: 14px; line-height: 1.7; color: #333;">
        <strong>When:</strong> ${escapeHtml(formattedWhen)}<br>
        <strong>Device:</strong> ${escapeHtml(browser)} on ${escapeHtml(os)}<br>
        <strong>IP address:</strong> ${escapeHtml(ip)}
      </div>
      <p style="color: #555; line-height: 1.6; margin-top: 16px;"><strong>Was this you?</strong> No action needed.</p>
      <p style="color: #555; line-height: 1.6; margin-top: 16px;"><strong>Don't recognise this sign-in?</strong> Someone else may have your password. Change it immediately:</p>
      <a href="${escapeHtml(frontendUrl)}/account/subscription" style="display: inline-block; margin: 16px 0 8px; padding: 14px 28px; background: #111; color: #fff; text-decoration: none; border-radius: 10px; font-weight: 600; font-size: 14px;">Secure your account</a>
      <p style="color: #999; font-size: 13px; line-height: 1.5; margin-top: 16px;">You can also reach our team at <a href="mailto:${escapeHtml(supportEmail)}" style="color: #111;">${escapeHtml(supportEmail)}</a>.</p>
      <hr style="border: none; border-top: 1px solid #eee; margin: 32px 0;" />
      <p style="color: #bbb; font-size: 11px;">Plotzy, the modern platform for writers</p>
    </div>
  `;
  await sendEmail(toEmail, subject, html);
}

/**
 * Restoration email — sent when an admin un-suspends a previously
 * suspended account. Subject is intentionally positive so it doesn't
 * get filed as a security alert.
 */
export async function sendRestorationEmail(toEmail: string): Promise<void> {
  const supportEmail = process.env.SUPPORT_EMAIL || "support@plotzy.co";
  const frontendUrl = process.env.FRONTEND_URL || "https://plotzy.co";
  const subject = "Your Plotzy account has been restored";
  const html = `
    <div style="font-family: -apple-system, sans-serif; max-width: 480px; margin: 0 auto; padding: 40px 20px;">
      <h2 style="color: #111; margin-bottom: 16px;">Welcome back</h2>
      <p style="color: #555; line-height: 1.6;">Your Plotzy account has been restored. You can sign in again and pick up right where you left off — your books, chapters, and subscription are exactly as you left them.</p>
      <a href="${escapeHtml(frontendUrl)}" style="display: inline-block; margin: 16px 0 8px; padding: 14px 32px; background: #111; color: #fff; text-decoration: none; border-radius: 10px; font-weight: 600; font-size: 14px;">Sign in to Plotzy</a>
      <p style="color: #999; font-size: 13px; line-height: 1.5; margin-top: 16px;">If you have any questions, reach us at <a href="mailto:${supportEmail}" style="color: #111;">${supportEmail}</a>.</p>
      <hr style="border: none; border-top: 1px solid #eee; margin: 32px 0;" />
      <p style="color: #bbb; font-size: 11px;">Plotzy, the modern platform for writers</p>
    </div>
  `;
  await sendEmail(toEmail, subject, html);
}
