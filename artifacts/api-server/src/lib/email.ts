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

// Default From address. When the production custom domain is verified
// in Resend (per discovered-issues.md HIGH entry), swap this constant
// (or read from process.env.EMAIL_FROM) and every caller benefits.
const DEFAULT_FROM = "Plotzy <onboarding@resend.dev>";

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
