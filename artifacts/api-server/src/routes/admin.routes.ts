import { Router } from "express";
import { z } from "zod";
import { db } from "../db";
import { sql, eq, desc, and, gte, count, sum } from "drizzle-orm";
import {
  users, books, chapters, userStats, aiUsageLogs, apiLogs,
  contentFlags, dailyProgress, supportMessages, pageViews,
} from "../../../../lib/db/src/schema";
import { requireAdmin } from "../middleware/auth";
import { logger } from "../lib/logger";

const router = Router();

// All routes require admin. Scope the middleware to the /api/admin/ prefix
// so mounting this router at the app root (via app.use(adminRouter)) doesn't
// accidentally gate unrelated paths like /api/auth/providers.
router.use("/api/admin", requireAdmin);

// ─── 1. ANALYTICS: Enhanced Stats ───────────────────────────────────────────

router.get("/api/admin/analytics/overview", async (_req, res) => {
  try {
    const now = new Date();
    const day1 = new Date(now); day1.setDate(day1.getDate() - 1);
    const day7 = new Date(now); day7.setDate(day7.getDate() - 7);
    const day30 = new Date(now); day30.setDate(day30.getDate() - 30);

    // User counts
    const [totalUsers] = await db.select({ c: count() }).from(users);
    const [newUsersToday] = await db.select({ c: count() }).from(users).where(gte(users.createdAt, day1));
    const [newUsersWeek] = await db.select({ c: count() }).from(users).where(gte(users.createdAt, day7));
    const [newUsersMonth] = await db.select({ c: count() }).from(users).where(gte(users.createdAt, day30));

    // Book counts
    const [totalBooks] = await db.select({ c: count() }).from(books);
    const [publishedBooks] = await db.select({ c: count() }).from(books).where(eq(books.isPublished, true));
    const [totalChapters] = await db.select({ c: count() }).from(chapters);

    // Writing activity (words written across all users in last 30 days)
    const [wordsMonth] = await db.select({ total: sum(dailyProgress.wordCount) }).from(dailyProgress)
      .where(gte(dailyProgress.createdAt, day30));

    // Active users (users who wrote in last 1/7/30 days via daily_progress)
    const dauResult = await db.execute(sql`
      SELECT COUNT(DISTINCT dp.book_id) FROM daily_progress dp
      INNER JOIN books b ON b.id = dp.book_id
      WHERE dp.created_at >= ${day1.toISOString()} AND b.user_id IS NOT NULL
    `);
    const wauResult = await db.execute(sql`
      SELECT COUNT(DISTINCT b.user_id) FROM daily_progress dp
      INNER JOIN books b ON b.id = dp.book_id
      WHERE dp.created_at >= ${day7.toISOString()} AND b.user_id IS NOT NULL
    `);
    const mauResult = await db.execute(sql`
      SELECT COUNT(DISTINCT b.user_id) FROM daily_progress dp
      INNER JOIN books b ON b.id = dp.book_id
      WHERE dp.created_at >= ${day30.toISOString()} AND b.user_id IS NOT NULL
    `);

    // Open support tickets
    const [openTickets] = await db.select({ c: count() }).from(supportMessages)
      .where(eq(supportMessages.status, "open"));

    return res.json({
      totalUsers: totalUsers.c,
      newUsersToday: newUsersToday.c,
      newUsersWeek: newUsersWeek.c,
      newUsersMonth: newUsersMonth.c,
      dau: Number(dauResult.rows?.[0]?.count || 0),
      wau: Number(wauResult.rows?.[0]?.count || 0),
      mau: Number(mauResult.rows?.[0]?.count || 0),
      totalBooks: totalBooks.c,
      publishedBooks: publishedBooks.c,
      totalChapters: totalChapters.c,
      wordsWrittenMonth: Number(wordsMonth.total || 0),
      openSupportTickets: openTickets.c,
    });
  } catch (err) {
    logger.error({ err }, "Admin route error");
    return res.status(500).json({ message: "Internal error" });
  }
});

// Daily sign-ups for chart (supports ?days=7|30|90, default 30)
router.get("/api/admin/analytics/signups", async (req, res) => {
  try {
    const days = Math.min(90, Math.max(7, Number(req.query.days) || 30));
    const rows = await db.execute(sql`
      SELECT DATE(created_at) as day, COUNT(*) as count
      FROM users
      WHERE created_at >= NOW() - make_interval(days => ${days})
      GROUP BY DATE(created_at)
      ORDER BY day
    `);
    return res.json(rows.rows);
  } catch {
    return res.status(500).json({ message: "Internal error" });
  }
});

// Daily words written for chart (supports ?days=7|30|90, default 30)
router.get("/api/admin/analytics/writing-activity", async (req, res) => {
  try {
    const days = Math.min(90, Math.max(7, Number(req.query.days) || 30));
    const rows = await db.execute(sql`
      SELECT DATE(created_at) as day, COALESCE(SUM(word_count), 0) as words
      FROM daily_progress
      WHERE created_at >= NOW() - make_interval(days => ${days})
      GROUP BY DATE(created_at)
      ORDER BY day
    `);
    return res.json(rows.rows);
  } catch {
    return res.status(500).json({ message: "Internal error" });
  }
});

// ─── 2. REVENUE & SUBSCRIPTIONS ─────────────────────────────────────────────

router.get("/api/admin/analytics/revenue", async (_req, res) => {
  try {
    // Subscription tier breakdown
    const tiers = await db.execute(sql`
      SELECT
        COALESCE(subscription_status, 'free') as tier,
        COALESCE(subscription_plan, 'none') as plan,
        COUNT(*) as count
      FROM users
      GROUP BY subscription_status, subscription_plan
    `);

    // Count active paid subscribers
    const [activeSubs] = await db.select({ c: count() }).from(users)
      .where(eq(users.subscriptionStatus, "active"));

    // Estimate MRR: monthly subs * $13 + yearly subs * ($99.99/12)
    const monthlyResult = await db.execute(sql`
      SELECT COUNT(*) as c FROM users
      WHERE subscription_status = 'active' AND subscription_plan = 'monthly'
    `);
    const yearlyResult = await db.execute(sql`
      SELECT COUNT(*) as c FROM users
      WHERE subscription_status = 'active' AND subscription_plan = 'yearly'
    `);

    const monthlySubs = Number(monthlyResult.rows?.[0]?.c || 0);
    const yearlySubs = Number(yearlyResult.rows?.[0]?.c || 0);
    const mrrCents = (monthlySubs * 1300) + Math.round(yearlySubs * (9999 / 12));

    // Recently churned (subscription ended in last 30 days)
    const churnResult = await db.execute(sql`
      SELECT COUNT(*) as c FROM users
      WHERE subscription_status != 'active'
        AND subscription_end_date IS NOT NULL
        AND subscription_end_date >= NOW() - INTERVAL '30 days'
    `);

    return res.json({
      tiers: tiers.rows,
      activeSubscribers: activeSubs.c,
      monthlySubs,
      yearlySubs,
      mrrCents,
      mrrDollars: (mrrCents / 100).toFixed(2),
      churnedLast30Days: Number(churnResult.rows?.[0]?.c || 0),
    });
  } catch (err) {
    logger.error({ err }, "Admin route error");
    return res.status(500).json({ message: "Internal error" });
  }
});

// Monthly revenue from actual completed payments (subscription_payments table),
// not the estimated MRR computed from current users.subscription_status above.
// Powers the bar chart on the Revenue tab. Capped at 36 months to bound the
// payload — anyone needing more would be doing a CSV export instead.
router.get("/api/admin/analytics/revenue/monthly", async (req, res) => {
  try {
    const months = Math.min(36, Math.max(1, Number(req.query.months) || 12));
    const result = await db.execute(sql`
      SELECT
        to_char(date_trunc('month', created_at), 'YYYY-MM') AS month,
        SUM(amount_cents)::bigint AS revenue_cents,
        COUNT(*)::int AS payment_count,
        COUNT(DISTINCT user_id)::int AS unique_payers
      FROM subscription_payments
      WHERE status = 'completed'
        AND created_at >= NOW() - make_interval(months => ${months})
      GROUP BY date_trunc('month', created_at)
      ORDER BY date_trunc('month', created_at) DESC
    `);
    return res.json({
      months: result.rows.map((r: any) => ({
        month: r.month,
        revenueCents: Number(r.revenue_cents || 0),
        paymentCount: Number(r.payment_count || 0),
        uniquePayers: Number(r.unique_payers || 0),
      })),
    });
  } catch (err) {
    logger.error({ err }, "Failed to fetch monthly revenue");
    return res.status(500).json({ message: "Failed to fetch monthly revenue" });
  }
});

// ─── 3. CONTENT MODERATION ──────────────────────────────────────────────────

// Flag a book
router.post("/api/admin/flags", async (req, res) => {
  try {
    const { bookId, reason } = z.object({
      bookId: z.number(),
      reason: z.string().min(1),
    }).strict().parse(req.body);

    const [flag] = await db.insert(contentFlags)
      .values({ bookId, reason })
      .returning();
    return res.status(201).json(flag);
  } catch (err) {
    if (err instanceof z.ZodError) return res.status(400).json({ message: err.errors[0].message });
    return res.status(500).json({ message: "Internal error" });
  }
});

// List flagged content
router.get("/api/admin/flags", async (req, res) => {
  try {
    const validStatuses = ["pending", "approved", "rejected"];
    const rawStatus = (req.query.status as string) || "pending";
    const status = validStatuses.includes(rawStatus) ? rawStatus : "pending";
    const rows = await db.execute(sql`
      SELECT cf.*, b.title as book_title, b.user_id as author_id, u.display_name as author_name
      FROM content_flags cf
      LEFT JOIN books b ON b.id = cf.book_id
      LEFT JOIN users u ON u.id = b.user_id
      WHERE cf.status = ${status}
      ORDER BY cf.created_at DESC
      LIMIT 100
    `);
    return res.json(rows.rows);
  } catch {
    return res.status(500).json({ message: "Internal error" });
  }
});

// Review a flag (approve / reject / unpublish)
router.patch("/api/admin/flags/:id", async (req, res) => {
  try {
    const flagId = Number(req.params.id);
    const { status, reviewNote } = z.object({
      status: z.enum(["approved", "rejected"]),
      reviewNote: z.string().optional(),
    }).strict().parse(req.body);

    const adminId = (req.user as any).id;

    const [updated] = await db.update(contentFlags)
      .set({ status, reviewNote: reviewNote || null, reviewedBy: adminId, reviewedAt: new Date() })
      .where(eq(contentFlags.id, flagId))
      .returning();

    // If rejected, unpublish the book
    if (status === "rejected" && updated) {
      await db.update(books)
        .set({ isPublished: false })
        .where(eq(books.id, updated.bookId));
    }

    return res.json(updated);
  } catch (err) {
    if (err instanceof z.ZodError) return res.status(400).json({ message: err.errors[0].message });
    return res.status(500).json({ message: "Internal error" });
  }
});

// ─── 4. USER ENGAGEMENT & INSIGHTS ─────────────────────────────────────────

// Writing streak leaderboard
router.get("/api/admin/analytics/leaderboard", async (_req, res) => {
  try {
    const rows = await db.execute(sql`
      SELECT us.user_id, u.display_name, u.email, u.avatar_url,
             us.total_words_written, us.streak_days, us.longest_streak,
             us.total_books_published, us.total_views_received
      FROM user_stats us
      INNER JOIN users u ON u.id = us.user_id
      ORDER BY us.total_words_written DESC
      LIMIT 25
    `);
    return res.json(rows.rows);
  } catch {
    return res.status(500).json({ message: "Internal error" });
  }
});

// Inactive users (haven't written in 30+ days)
router.get("/api/admin/analytics/inactive-users", async (_req, res) => {
  try {
    const rows = await db.execute(sql`
      SELECT u.id, u.email, u.display_name, u.created_at,
             us.last_writing_date, us.total_words_written,
             u.subscription_status
      FROM users u
      LEFT JOIN user_stats us ON us.user_id = u.id
      WHERE us.last_writing_date IS NULL
         OR us.last_writing_date < NOW() - INTERVAL '30 days'
      ORDER BY us.last_writing_date ASC NULLS FIRST
      LIMIT 50
    `);
    return res.json(rows.rows);
  } catch {
    return res.status(500).json({ message: "Internal error" });
  }
});

// AI usage per user (top consumers)
router.get("/api/admin/analytics/ai-usage", async (_req, res) => {
  try {
    // Per-user totals
    const perUser = await db.execute(sql`
      SELECT al.user_id, u.display_name, u.email,
             COUNT(*) as total_calls,
             COALESCE(SUM(al.prompt_tokens), 0) as total_prompt_tokens,
             COALESCE(SUM(al.completion_tokens), 0) as total_completion_tokens,
             COALESCE(SUM(al.estimated_cost_cents), 0) as total_cost_cents
      FROM ai_usage_logs al
      LEFT JOIN users u ON u.id = al.user_id
      GROUP BY al.user_id, u.display_name, u.email
      ORDER BY total_cost_cents DESC
      LIMIT 25
    `);

    // Overall totals
    const [totals] = await db.select({
      calls: count(),
      cost: sum(aiUsageLogs.estimatedCostCents),
      promptTokens: sum(aiUsageLogs.promptTokens),
      completionTokens: sum(aiUsageLogs.completionTokens),
    }).from(aiUsageLogs);

    // Daily cost for chart (last 30 days)
    const dailyCost = await db.execute(sql`
      SELECT DATE(created_at) as day,
             COUNT(*) as calls,
             COALESCE(SUM(estimated_cost_cents), 0) as cost_cents
      FROM ai_usage_logs
      WHERE created_at >= NOW() - INTERVAL '30 days'
      GROUP BY DATE(created_at)
      ORDER BY day
    `);

    // Cost by model
    const byModel = await db.execute(sql`
      SELECT model,
             COUNT(*) as calls,
             COALESCE(SUM(estimated_cost_cents), 0) as cost_cents
      FROM ai_usage_logs
      GROUP BY model
      ORDER BY cost_cents DESC
    `);

    return res.json({
      perUser: perUser.rows,
      totals: {
        calls: totals.calls,
        costCents: Number(totals.cost || 0),
        costDollars: (Number(totals.cost || 0) / 100).toFixed(2),
        promptTokens: Number(totals.promptTokens || 0),
        completionTokens: Number(totals.completionTokens || 0),
      },
      dailyCost: dailyCost.rows,
      byModel: byModel.rows,
    });
  } catch (err) {
    logger.error({ err }, "Admin route error");
    return res.status(500).json({ message: "Internal error" });
  }
});

// ─── 5. SYSTEM HEALTH ───────────────────────────────────────────────────────

router.get("/api/admin/analytics/system-health", async (_req, res) => {
  try {
    // Latency percentiles (last 24h)
    const latency = await db.execute(sql`
      SELECT
        COUNT(*) as total_requests,
        ROUND(AVG(duration_ms)) as avg_ms,
        PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY duration_ms) as p50_ms,
        PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY duration_ms) as p95_ms,
        PERCENTILE_CONT(0.99) WITHIN GROUP (ORDER BY duration_ms) as p99_ms
      FROM api_logs
      WHERE created_at >= NOW() - INTERVAL '24 hours'
    `);

    // Error rate (4xx + 5xx / total)
    const errors = await db.execute(sql`
      SELECT
        COUNT(*) FILTER (WHERE status_code >= 400) as error_count,
        COUNT(*) as total_count
      FROM api_logs
      WHERE created_at >= NOW() - INTERVAL '24 hours'
    `);

    // Slowest endpoints (last 24h)
    const slowest = await db.execute(sql`
      SELECT path, method,
             COUNT(*) as hits,
             ROUND(AVG(duration_ms)) as avg_ms,
             MAX(duration_ms) as max_ms
      FROM api_logs
      WHERE created_at >= NOW() - INTERVAL '24 hours'
      GROUP BY path, method
      ORDER BY avg_ms DESC
      LIMIT 10
    `);

    // Requests per hour (last 24h for chart)
    const hourly = await db.execute(sql`
      SELECT DATE_TRUNC('hour', created_at) as hour,
             COUNT(*) as requests,
             COUNT(*) FILTER (WHERE status_code >= 500) as errors
      FROM api_logs
      WHERE created_at >= NOW() - INTERVAL '24 hours'
      GROUP BY DATE_TRUNC('hour', created_at)
      ORDER BY hour
    `);

    // Status code breakdown
    const statusBreakdown = await db.execute(sql`
      SELECT status_code, COUNT(*) as count
      FROM api_logs
      WHERE created_at >= NOW() - INTERVAL '24 hours'
      GROUP BY status_code
      ORDER BY count DESC
    `);

    const errorRow = errors.rows?.[0] as any;
    const totalReqs = Number(errorRow?.total_count || 1);
    const errorCount = Number(errorRow?.error_count || 0);

    return res.json({
      latency: latency.rows?.[0] || {},
      errorRate: ((errorCount / totalReqs) * 100).toFixed(2),
      errorCount,
      totalRequests: totalReqs,
      slowestEndpoints: slowest.rows,
      hourlyTraffic: hourly.rows,
      statusBreakdown: statusBreakdown.rows,
    });
  } catch (err) {
    logger.error({ err }, "Admin route error");
    return res.status(500).json({ message: "Internal error" });
  }
});

// ─── ANALYTICS: Device & traffic ────────────────────────────────────────────

/**
 * Top-level device/traffic snapshot.
 *
 * Returns unique-device counts for today / last 7 days / last 30 days, plus
 * total page views over the same windows. Uniqueness is by deviceHash so one
 * device counted once no matter how many pages they visited.
 *
 * Bots (classified by the tracker) are excluded so the numbers reflect real
 * humans using the product.
 */
router.get("/api/admin/analytics/devices", async (_req, res) => {
  try {
    const now = new Date();
    const day1 = new Date(now); day1.setDate(day1.getDate() - 1);
    const day7 = new Date(now); day7.setDate(day7.getDate() - 7);
    const day30 = new Date(now); day30.setDate(day30.getDate() - 30);

    const humans = sql`${pageViews.deviceType} IS DISTINCT FROM 'bot'`;

    const [uniq1, uniq7, uniq30, views1, views7, views30, total] = await Promise.all([
      db.execute(sql`SELECT COUNT(DISTINCT device_hash)::int AS c FROM page_views WHERE device_type IS DISTINCT FROM 'bot' AND created_at >= ${day1}`),
      db.execute(sql`SELECT COUNT(DISTINCT device_hash)::int AS c FROM page_views WHERE device_type IS DISTINCT FROM 'bot' AND created_at >= ${day7}`),
      db.execute(sql`SELECT COUNT(DISTINCT device_hash)::int AS c FROM page_views WHERE device_type IS DISTINCT FROM 'bot' AND created_at >= ${day30}`),
      db.select({ c: count() }).from(pageViews).where(and(humans, gte(pageViews.createdAt, day1))),
      db.select({ c: count() }).from(pageViews).where(and(humans, gte(pageViews.createdAt, day7))),
      db.select({ c: count() }).from(pageViews).where(and(humans, gte(pageViews.createdAt, day30))),
      db.select({ c: count() }).from(pageViews).where(humans),
    ]);

    return res.json({
      uniqueDevices: {
        day:   (uniq1.rows[0] as any)?.c ?? 0,
        week:  (uniq7.rows[0] as any)?.c ?? 0,
        month: (uniq30.rows[0] as any)?.c ?? 0,
      },
      pageViews: {
        day:   views1[0]?.c ?? 0,
        week:  views7[0]?.c ?? 0,
        month: views30[0]?.c ?? 0,
        total: total[0]?.c ?? 0,
      },
    });
  } catch (err) {
    logger.error({ err }, "devices analytics error");
    return res.status(500).json({ message: "Internal error" });
  }
});

/**
 * Breakdown of unique devices by device type, browser, and OS — useful for
 * deciding what to prioritise (e.g., is mobile traffic large enough to
 * unblock?). Defaults to a 30-day window, overridable via ?days=.
 */
router.get("/api/admin/analytics/devices/breakdown", async (req, res) => {
  try {
    const days = Math.min(365, Math.max(1, Number(req.query.days) || 30));
    const since = new Date();
    since.setDate(since.getDate() - days);

    const [byType, byBrowser, byOs] = await Promise.all([
      db.execute(sql`
        SELECT COALESCE(device_type, 'unknown') AS label, COUNT(DISTINCT device_hash)::int AS count
        FROM page_views
        WHERE created_at >= ${since}
        GROUP BY COALESCE(device_type, 'unknown')
        ORDER BY count DESC
      `),
      db.execute(sql`
        SELECT COALESCE(browser, 'unknown') AS label, COUNT(DISTINCT device_hash)::int AS count
        FROM page_views
        WHERE created_at >= ${since} AND device_type IS DISTINCT FROM 'bot'
        GROUP BY COALESCE(browser, 'unknown')
        ORDER BY count DESC
        LIMIT 10
      `),
      db.execute(sql`
        SELECT COALESCE(os, 'unknown') AS label, COUNT(DISTINCT device_hash)::int AS count
        FROM page_views
        WHERE created_at >= ${since} AND device_type IS DISTINCT FROM 'bot'
        GROUP BY COALESCE(os, 'unknown')
        ORDER BY count DESC
        LIMIT 10
      `),
    ]);

    return res.json({
      days,
      deviceType: byType.rows,
      browser:    byBrowser.rows,
      os:         byOs.rows,
    });
  } catch (err) {
    logger.error({ err }, "devices breakdown error");
    return res.status(500).json({ message: "Internal error" });
  }
});

/**
 * Top visited paths over the given window. Aggregated as (path, views,
 * uniqueDevices), limited to the top N so the payload stays small.
 */
router.get("/api/admin/analytics/top-pages", async (req, res) => {
  try {
    const days = Math.min(365, Math.max(1, Number(req.query.days) || 30));
    const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 15));
    const since = new Date();
    since.setDate(since.getDate() - days);

    const result = await db.execute(sql`
      SELECT
        path,
        COUNT(*)::int AS views,
        COUNT(DISTINCT device_hash)::int AS unique_devices
      FROM page_views
      WHERE created_at >= ${since} AND device_type IS DISTINCT FROM 'bot'
      GROUP BY path
      ORDER BY views DESC
      LIMIT ${limit}
    `);

    return res.json({ days, rows: result.rows });
  } catch (err) {
    logger.error({ err }, "top pages error");
    return res.status(500).json({ message: "Internal error" });
  }
});

/**
 * Daily unique devices + page views for plotting a traffic chart.
 */
router.get("/api/admin/analytics/daily-traffic", async (req, res) => {
  try {
    const days = Math.min(365, Math.max(1, Number(req.query.days) || 30));
    const since = new Date();
    since.setDate(since.getDate() - days);

    const result = await db.execute(sql`
      SELECT
        DATE_TRUNC('day', created_at)::date AS day,
        COUNT(*)::int AS views,
        COUNT(DISTINCT device_hash)::int AS unique_devices
      FROM page_views
      WHERE created_at >= ${since} AND device_type IS DISTINCT FROM 'bot'
      GROUP BY DATE_TRUNC('day', created_at)
      ORDER BY day ASC
    `);

    return res.json({ days, rows: result.rows });
  } catch (err) {
    logger.error({ err }, "daily traffic error");
    return res.status(500).json({ message: "Internal error" });
  }
});

export default router;
