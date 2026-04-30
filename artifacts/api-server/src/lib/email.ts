import { logger } from "./logger";

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
