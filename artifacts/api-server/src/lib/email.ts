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

export async function sendEmail(to: string, subject: string, html: string) {
  try {
    const resend = await getResend();
    if (!resend) { logger.warn("RESEND_API_KEY not set — skipping email"); return; }
    await resend.emails.send({ from: "Plotzy <onboarding@resend.dev>", to, subject, html });
    logger.info({ to, subject }, "Email sent");
  } catch (err) {
    logger.error({ err, to, subject }, "Email send failed");
  }
}

export async function sendNotificationEmail(to: string, title: string, body: string) {
  const html = `
    <div style="font-family:-apple-system,sans-serif;max-width:480px;margin:0 auto;padding:40px 20px;">
      <h2 style="color:#111;margin-bottom:8px;">${title}</h2>
      <p style="color:#555;line-height:1.6;">${body}</p>
      <a href="${process.env.FRONTEND_URL || "http://localhost:5173"}" style="display:inline-block;margin:24px 0;padding:12px 28px;background:#111;color:#fff;text-decoration:none;border-radius:10px;font-weight:600;font-size:14px;">Open Plotzy</a>
      <hr style="border:none;border-top:1px solid #eee;margin:32px 0;" />
      <p style="color:#bbb;font-size:11px;">Plotzy — The modern platform for writers</p>
    </div>
  `;
  await sendEmail(to, title, html);
}
