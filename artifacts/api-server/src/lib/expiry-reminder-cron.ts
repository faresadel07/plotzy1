// Daily expiry-reminder cron.
//
// Plotzy uses PayPal Capture Intent (one-time orders), not recurring
// subscriptions. So this isn't a "we are about to charge your card"
// warning — it's a "you need to manually re-checkout if you want
// continued access" reminder fired 3 days before subscription_end_date.
//
// Idempotency:
//   users.expiry_reminder_sent_for_end_date stores the
//   subscription_end_date the reminder was sent for. Eligibility is:
//
//     subscription_end_date::date = (NOW() + interval '3 days')::date
//     AND subscription_status = 'active'
//     AND email IS NOT NULL
//     AND (expiry_reminder_sent_for_end_date IS NULL
//          OR expiry_reminder_sent_for_end_date <> subscription_end_date)
//
//   When a user re-subscribes their end_date moves forward; the
//   stored anchor stops matching and they become eligible again for
//   the next cycle. Canceled users are deliberately excluded — they
//   already got the cancellation email which states the access-end
//   date, so a "renew now" nudge would be annoying.
//
// Single-instance assumption:
//   The cron runs in-process inside the api-server. Acceptable for a
//   single-instance Docker deploy on Railway/Render/Fly. Running two
//   instances at once would double-fire on the day they overlap; if
//   we ever scale horizontally, hoist the trigger to an external
//   scheduler (Railway Cron / GitHub Action hitting an admin webhook)
//   or add a leader-election lock.

import cron from "node-cron";
import { and, eq, isNotNull, sql, or } from "drizzle-orm";
import { db } from "../db";
import { users } from "../../../../lib/db/src/schema";
import { logger } from "./logger";
import { sendExpiryReminderEmail } from "./email";

const PLAN_DISPLAY: Record<string, string> = {
  pro_monthly: "Plotzy Pro",
  pro_yearly: "Plotzy Pro",
  premium_monthly: "Plotzy Premium",
  premium_yearly: "Plotzy Premium",
  monthly: "Plotzy Pro",
  yearly: "Plotzy Pro",
};

function planDisplayName(plan: string | null | undefined): string {
  if (!plan) return "Plotzy";
  return PLAN_DISPLAY[plan] ?? "Plotzy";
}

function formatExpiryDate(d: Date): string {
  return d.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
    timeZone: "UTC",
  });
}

/**
 * Single-pass over the eligible users. Exported so an admin endpoint
 * (or this file's own cron handler) can trigger it. Returns the
 * count of emails actually sent so callers / logs can see at a
 * glance whether anyone was notified this run.
 */
export async function runExpiryReminderJob(): Promise<{
  considered: number;
  sent: number;
  failed: number;
}> {
  // SQL-side filter pushes the bulk of the work down to Postgres so
  // we never enumerate every user, just the eligible ones (typically
  // a handful per day even at scale).
  const eligible = await db
    .select({
      id: users.id,
      email: users.email,
      subscriptionPlan: users.subscriptionPlan,
      subscriptionEndDate: users.subscriptionEndDate,
    })
    .from(users)
    .where(
      and(
        eq(users.subscriptionStatus, "active"),
        isNotNull(users.email),
        isNotNull(users.subscriptionEndDate),
        sql`${users.subscriptionEndDate}::date = (NOW() + interval '3 days')::date`,
        // Compare at date precision rather than full timestamp.
        // Postgres stores timestamps at microsecond precision; the
        // JS Date round-trip on the SET below would lose those last
        // few digits, so a full-timestamp `<>` would always return
        // true and we'd re-send every run. Date-precision is the
        // right granularity anyway: "is this a different renewal
        // cycle?" answered by calendar day, not microseconds.
        or(
          sql`${users.expiryReminderSentForEndDate} IS NULL`,
          sql`${users.expiryReminderSentForEndDate}::date <> ${users.subscriptionEndDate}::date`,
        ),
      ),
    );

  let sent = 0;
  let failed = 0;

  for (const u of eligible) {
    if (!u.email || !u.subscriptionEndDate) continue;
    try {
      await sendExpiryReminderEmail(u.email, {
        planName: planDisplayName(u.subscriptionPlan),
        expiryDateLabel: formatExpiryDate(u.subscriptionEndDate),
      });
      // Anchor the idempotency token to THIS user's end_date.
      // Server-side copy (subscription_end_date column → anchor
      // column) avoids the JS Date round-trip that would silently
      // truncate microseconds and break the `<>` check on the next
      // run. Any future change in end_date (re-subscription) makes
      // the dates differ at calendar-day precision and re-enables
      // the next reminder.
      await db
        .update(users)
        .set({ expiryReminderSentForEndDate: sql`subscription_end_date` })
        .where(eq(users.id, u.id));
      sent++;
    } catch (err) {
      failed++;
      // Don't update the anchor on failure — leave the user eligible
      // for tomorrow's run so a transient Resend outage doesn't
      // permanently silence the reminder.
      logger.error({ err, userId: u.id }, "Expiry-reminder email failed");
    }
  }

  logger.info(
    { considered: eligible.length, sent, failed },
    "expiry-reminder cron completed",
  );
  return { considered: eligible.length, sent, failed };
}

/**
 * Register the cron with node-cron. Call once from the app bootstrap.
 * Scheduled at 09:00 UTC daily — chosen to land in most users'
 * morning across global time zones (Europe wakes up, Americas are
 * about to start the day, Asia is mid-afternoon).
 */
export function startExpiryReminderCron(): void {
  // node-cron expression: minute hour dom month dow
  // "0 9 * * *" = 09:00 UTC every day
  cron.schedule(
    "0 9 * * *",
    () => {
      runExpiryReminderJob().catch((err) => {
        // Defensive: cron handler must not let an unhandled rejection
        // escape, otherwise node-cron's internal scheduler can stop
        // firing further ticks.
        logger.error({ err }, "expiry-reminder cron threw");
      });
    },
    { timezone: "UTC" },
  );
  logger.info("expiry-reminder cron registered (daily at 09:00 UTC)");
}
