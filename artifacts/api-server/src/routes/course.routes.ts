/**
 * Writing course API — 14 endpoints across catalog, progress,
 * quizzes, final project, and certificate verification.
 *
 * URL namespaces:
 *   /api/course/*         — course content + per-user state (mostly authenticated)
 *   /api/certificates/:uuid — public certificate verification (no auth)
 *
 * Free for all tiers per directive — no tier-gating anywhere.
 * The single AI-cost endpoint (POST /final-project/feedback) charges
 * the daily AI budget 4× per submission via an inline cost-aware
 * check (see "AI cost gate" comment in that handler).
 *
 * Wire-up: `app.use(courseRouter)` in routes.ts (Commit 4).
 */
import { Router } from "express";
import { storage, type CertificateEligibility } from "../storage";
import { requireAuth } from "../middleware/auth";
import { aiLimiter, tierAiLimiter, publicReadLimiter, generalLimiter, writeLimiter } from "../middleware/rate-limit";
import { requireOpenAI, getChapterText } from "./helpers";
import { getUserTier, checkAiLimit, incrementAiUsage } from "../lib/tier-limits";
import { isAdminUser } from "../lib/admin";
import { logger } from "../lib/logger";
import {
  analyzePlotHoles, analyzeDialogue, analyzePacing, analyzeVoiceConsistency,
} from "../lib/ai-analysis";
import { renderCertificatePdf } from "../services/certificate-pdf";
import type { CourseLesson, CourseQuiz, CourseQuizAttempt } from "../../../../lib/db/src/schema";

const router: Router = Router();

const FINAL_PROJECT_REQUIRED_CHAPTERS = 3;
const FEEDBACK_AI_COST = 4; // 1 LLM call per analysis × 4 analyses

// ─── Helpers ────────────────────────────────────────────────────────────────

/**
 * Strip server-only fields (correct_option, explanation) from a quiz
 * question before returning to the client. Answer key is exposed only
 * in the post-attempt review response.
 */
function publicQuestion(q: {
  id: number;
  questionText: string;
  optionA: string;
  optionB: string;
  optionC: string;
  optionD: string;
  order: number;
}) {
  return {
    id: q.id,
    questionText: q.questionText,
    optionA: q.optionA,
    optionB: q.optionB,
    optionC: q.optionC,
    optionD: q.optionD,
    order: q.order,
  };
}

function summarizeLesson(l: CourseLesson) {
  return {
    id: l.id,
    slug: l.slug,
    title: l.title,
    orderInModule: l.orderInModule,
    estimatedMinutes: l.estimatedMinutes,
    heroImageUrl: l.heroImageUrl,
  };
}

// ─── i18n: translation lookup ─────────────────────────────────────────
// All non-English course content lives in course_content_translations
// (one row per translatable field). Routes that surface course text
// parse `?lang=` from the query string, fetch the translations for
// the entities they're about to project, and use `tr(...)` to pick the
// translated value with an English fallback (graceful degradation when
// a field hasn't been translated yet).

// Allowlist: keep in sync with SUPPORTED_UI_LANGS in
// artifacts/plotzy/src/lib/i18n.ts. Restricted set defends against
// arbitrary-string DB lookups; English never round-trips through this.
const SUPPORTED_CONTENT_LANGS = new Set([
  "ar", "fr", "es", "de", "pt", "ru", "zh", "ja", "ko", "hi", "tr", "he", "fa",
]);

/** Parse `?lang=` and return a normalised non-English lang or null. */
function parseLang(req: { query: { lang?: unknown } }): string | null {
  const raw = req.query?.lang;
  if (typeof raw !== "string") return null;
  const lang = raw.toLowerCase().trim();
  if (lang === "en" || lang === "") return null;
  return SUPPORTED_CONTENT_LANGS.has(lang) ? lang : null;
}

/** Indexed view over a translation result list: type → id → field → value. */
type TranslationIndex = Map<string, Map<number, Map<string, string>>>;

function indexTranslations(
  rows: { entityType: string; entityId: number; field: string; value: string }[],
): TranslationIndex {
  const idx: TranslationIndex = new Map();
  for (const r of rows) {
    let byId = idx.get(r.entityType);
    if (!byId) {
      byId = new Map();
      idx.set(r.entityType, byId);
    }
    let byField = byId.get(r.entityId);
    if (!byField) {
      byField = new Map();
      byId.set(r.entityId, byField);
    }
    byField.set(r.field, r.value);
  }
  return idx;
}

/** Translation lookup with English fallback. Returns the fallback if the
 *  index is null (English request) or the field hasn't been translated. */
function tr<T>(
  idx: TranslationIndex | null,
  entityType: "lesson" | "module" | "quiz_question",
  entityId: number,
  field: string,
  fallback: T,
): T {
  if (!idx) return fallback;
  const v = idx.get(entityType)?.get(entityId)?.get(field);
  return (v as T | undefined) ?? fallback;
}

// ════════════════════════════════════════════════════════════════════════════
// Group 1 — Catalog (public reads)
// ════════════════════════════════════════════════════════════════════════════

// GET /api/course/modules — list all modules with lesson summaries
router.get("/api/course/modules", publicReadLimiter, async (req, res) => {
  try {
    const lang = parseLang(req);
    const [modules, lessons] = await Promise.all([
      storage.getCourseModules(),
      storage.getAllCourseLessons(),
    ]);

    let trIdx: TranslationIndex | null = null;
    if (lang) {
      const trRows = await storage.getCourseTranslations(lang, [
        ...modules.map((m) => ({ entityType: "module" as const, entityId: m.id })),
        ...lessons.map((l) => ({ entityType: "lesson" as const, entityId: l.id })),
      ]);
      trIdx = indexTranslations(trRows);
    }

    const lessonsByModule = new Map<number, CourseLesson[]>();
    for (const l of lessons) {
      const arr = lessonsByModule.get(l.moduleId);
      if (arr) arr.push(l);
      else lessonsByModule.set(l.moduleId, [l]);
    }

    const moduleResponses = modules.map((m) => {
      const ms = (lessonsByModule.get(m.id) || []).slice().sort((a, b) => a.orderInModule - b.orderInModule);
      return {
        id: m.id,
        slug: m.slug,
        title: tr(trIdx, "module", m.id, "title", m.title),
        subtitle: tr(trIdx, "module", m.id, "subtitle", m.subtitle),
        description: tr(trIdx, "module", m.id, "description", m.description),
        order: m.order,
        estimatedMinutes: m.estimatedMinutes,
        lessonCount: ms.length,
        lessons: ms.map((l) => ({
          ...summarizeLesson(l),
          title: tr(trIdx, "lesson", l.id, "title", l.title),
        })),
      };
    });

    return res.json({
      modules: moduleResponses,
      totalLessons: lessons.length,
      totalEstimatedMinutes: modules.reduce((sum, m) => sum + m.estimatedMinutes, 0),
    });
  } catch (err) {
    logger.error({ err }, "Course catalog error");
    return res.status(500).json({ message: "Internal error" });
  }
});

// GET /api/course/modules/:slug — single module with its lessons.
// Auth-required: module detail pages live under /learn/module/:slug,
// which is now members-only. The public /course landing only needs the
// catalog list (GET /modules), not per-module deep-dives.
router.get("/api/course/modules/:slug", requireAuth, generalLimiter, async (req, res) => {
  try {
    const lang = parseLang(req);
    const m = await storage.getCourseModuleBySlug(String(req.params.slug));
    if (!m) return res.status(404).json({ message: "Module not found" });

    const lessons = await storage.getCourseLessons(m.id);
    let trIdx: TranslationIndex | null = null;
    if (lang) {
      const trRows = await storage.getCourseTranslations(lang, [
        { entityType: "module", entityId: m.id },
        ...lessons.map((l) => ({ entityType: "lesson" as const, entityId: l.id })),
      ]);
      trIdx = indexTranslations(trRows);
    }

    return res.json({
      id: m.id,
      slug: m.slug,
      title: tr(trIdx, "module", m.id, "title", m.title),
      subtitle: tr(trIdx, "module", m.id, "subtitle", m.subtitle),
      description: tr(trIdx, "module", m.id, "description", m.description),
      order: m.order,
      estimatedMinutes: m.estimatedMinutes,
      lessonCount: lessons.length,
      lessons: lessons.map((l) => ({
        ...summarizeLesson(l),
        title: tr(trIdx, "lesson", l.id, "title", l.title),
      })),
    });
  } catch (err) {
    logger.error({ err }, "Course module error");
    return res.status(500).json({ message: "Internal error" });
  }
});

// GET /api/course/lessons/:slug — single lesson with markdown content
// + the user's completion state for this lesson.
//
// Auth-required. Supersedes the earlier Batch 1.3 DP3/C1 decision that
// allowed anonymous lesson access; the course is now members-only and
// the public marketing surface is /course (the landing page).
router.get("/api/course/lessons/:slug", requireAuth, generalLimiter, async (req, res) => {
  try {
    const lang = parseLang(req);
    const lesson = await storage.getCourseLessonBySlug(String(req.params.slug));
    if (!lesson) return res.status(404).json({ message: "Lesson not found" });

    const [modules, allLessons] = await Promise.all([
      storage.getCourseModules(),
      storage.getAllCourseLessons(),
    ]);
    const module = modules.find((m) => m.id === lesson.moduleId);
    if (!module) {
      logger.error({ lessonId: lesson.id, moduleId: lesson.moduleId }, "Lesson references missing module");
      return res.status(500).json({ message: "Catalog inconsistency" });
    }

    // Prev/next navigation: getAllCourseLessons() already orders by
    // (moduleId, orderInModule) so the linear order matches the
    // intended reading sequence across modules.
    const idx = allLessons.findIndex((l) => l.id === lesson.id);
    const prev = idx > 0 ? allLessons[idx - 1] : null;
    const next = idx >= 0 && idx < allLessons.length - 1 ? allLessons[idx + 1] : null;

    let trIdx: TranslationIndex | null = null;
    if (lang) {
      // Fetch translations for: this lesson (title + content), its
      // module (title), and prev/next (title only — for the nav links).
      const entries: { entityType: "lesson" | "module"; entityId: number }[] = [
        { entityType: "lesson", entityId: lesson.id },
        { entityType: "module", entityId: module.id },
      ];
      if (prev) entries.push({ entityType: "lesson", entityId: prev.id });
      if (next) entries.push({ entityType: "lesson", entityId: next.id });
      const trRows = await storage.getCourseTranslations(lang, entries);
      trIdx = indexTranslations(trRows);
    }

    // requireAuth above guarantees req.user is present.
    const userId = (req.user as any).id;
    const progress = await storage.getCourseProgressForUser(userId);
    const mine = progress.find((p) => p.lessonId === lesson.id);
    let myCompletion: { completedAt: string; timeSpentSeconds: number } | null = null;
    if (mine) {
      myCompletion = {
        completedAt: mine.completedAt.toISOString(),
        timeSpentSeconds: mine.timeSpentSeconds,
      };
    }

    return res.json({
      id: lesson.id,
      moduleId: lesson.moduleId,
      moduleSlug: module.slug,
      moduleTitle: tr(trIdx, "module", module.id, "title", module.title),
      slug: lesson.slug,
      title: tr(trIdx, "lesson", lesson.id, "title", lesson.title),
      orderInModule: lesson.orderInModule,
      estimatedMinutes: lesson.estimatedMinutes,
      content: tr(trIdx, "lesson", lesson.id, "content", lesson.content),
      heroImageUrl: lesson.heroImageUrl,
      prevLesson: prev
        ? { slug: prev.slug, title: tr(trIdx, "lesson", prev.id, "title", prev.title) }
        : null,
      nextLesson: next
        ? { slug: next.slug, title: tr(trIdx, "lesson", next.id, "title", next.title) }
        : null,
      myCompletion,
    });
  } catch (err) {
    logger.error({ err }, "Lesson read error");
    return res.status(500).json({ message: "Internal error" });
  }
});

// ════════════════════════════════════════════════════════════════════════════
// Group 2 — Per-user progress (authenticated)
// ════════════════════════════════════════════════════════════════════════════

// POST /api/course/lessons/:lessonId/complete — idempotent UPSERT
router.post("/api/course/lessons/:lessonId/complete", requireAuth, writeLimiter, async (req, res) => {
  try {
    const userId = (req.user as any).id;
    const lessonId = parseInt(String(req.params.lessonId), 10);
    if (!Number.isFinite(lessonId) || lessonId <= 0) {
      return res.status(400).json({ message: "Invalid lesson id" });
    }

    // Validate lesson exists. The catalog is small (27 lessons), so
    // a full scan + .find is cheaper than catching the PG FK-violation
    // error from the UPSERT and translating it.
    const allLessons = await storage.getAllCourseLessons();
    if (!allLessons.some((l) => l.id === lessonId)) {
      return res.status(404).json({ message: "Lesson not found" });
    }

    const rawTime = Number(req.body?.timeSpentSeconds);
    // Clamp to a sane range; reject negatives, cap at 24h to keep
    // accidental clock skew or buggy clients from saving absurd values.
    const timeSpentSeconds = Number.isFinite(rawTime)
      ? Math.max(0, Math.min(86_400, Math.floor(rawTime)))
      : 0;

    const progressRow = await storage.markLessonComplete(userId, lessonId, timeSpentSeconds);
    const allProgress = await storage.getCourseProgressForUser(userId);

    return res.json({
      lessonId: progressRow.lessonId,
      completedAt: progressRow.completedAt.toISOString(),
      timeSpentSeconds: progressRow.timeSpentSeconds,
      progress: {
        completedLessons: allProgress.length,
        totalLessons: allLessons.length,
        percentage: allLessons.length > 0
          ? Math.round((allProgress.length / allLessons.length) * 100)
          : 0,
      },
    });
  } catch (err) {
    logger.error({ err }, "Mark lesson complete error");
    return res.status(500).json({ message: "Internal error" });
  }
});

// GET /api/course/progress — dashboard rollup
router.get("/api/course/progress", requireAuth, generalLimiter, async (req, res) => {
  try {
    const userId = (req.user as any).id;

    const [modules, allLessons, userProgress, finalProject, cert] = await Promise.all([
      storage.getCourseModules(),
      storage.getAllCourseLessons(),
      storage.getCourseProgressForUser(userId),
      storage.getFinalProjectForUser(userId),
      storage.getCertificateForUser(userId),
    ]);

    // Quizzes: per-module quiz + final, fetched in parallel.
    const moduleQuizzes = await Promise.all(modules.map((m) => storage.getModuleQuiz(m.id)));
    const finalQuiz = await storage.getFinalQuiz();

    // Full quiz list (stable order: each module's quiz in module-order, then final).
    const allQuizzes: Array<CourseQuiz> = [];
    for (const q of moduleQuizzes) if (q) allQuizzes.push(q);
    if (finalQuiz) allQuizzes.push(finalQuiz);

    // User's attempts per quiz, in parallel. ~14 small queries; fine
    // for v1 — see Phase A DP3 for the bulk-method follow-up.
    const allUserAttempts = await Promise.all(
      allQuizzes.map((q) => storage.getQuizAttempts(userId, q.id)),
    );

    const completedLessonIds = new Set(userProgress.map((p) => p.lessonId));
    const completionTime = new Map<number, Date>();
    for (const p of userProgress) completionTime.set(p.lessonId, p.completedAt);

    const moduleStats = modules.map((m) => {
      const ms = allLessons.filter((l) => l.moduleId === m.id);
      const completedHere = ms.filter((l) => completedLessonIds.has(l.id));
      // completedAt for the module = max completion time across its
      // lessons IF every lesson is done; else null.
      let completedAt: string | null = null;
      if (ms.length > 0 && completedHere.length === ms.length) {
        const max = ms.reduce<Date>((acc, l) => {
          const t = completionTime.get(l.id)!;
          return t > acc ? t : acc;
        }, new Date(0));
        completedAt = max.toISOString();
      }
      return {
        moduleId: m.id,
        slug: m.slug,
        completedLessons: completedHere.length,
        totalLessons: ms.length,
        completedAt,
      };
    });

    const quizStats = allQuizzes.map((q, i) => {
      const attempts = allUserAttempts[i];
      const bestScore = attempts.length === 0
        ? null
        : Math.max(...attempts.map((a) => a.scorePercentage));
      const passed = attempts.some((a) => a.passed);
      return {
        quizId: q.id,
        moduleId: q.moduleId,
        type: q.type as "module" | "final",
        bestScore,
        passed,
        attemptCount: attempts.length,
        // Quiz-definition fields surfaced for the FinalExamCard on /learn
        // (renders the configured 60-min limit, 75% pass threshold, and
        // 40-question count without making the frontend re-fetch the
        // full quiz row).
        questionCount: q.questionCount,
        timeLimitMinutes: q.timeLimitMinutes,
        passingPercentage: q.passingPercentage,
      };
    });

    return res.json({
      completedLessons: userProgress.length,
      totalLessons: allLessons.length,
      percentage: allLessons.length > 0
        ? Math.round((userProgress.length / allLessons.length) * 100)
        : 0,
      modules: moduleStats,
      quizzes: quizStats,
      finalProject: {
        submitted: !!finalProject,
        approved: !!finalProject?.approvedAt,
      },
      certificate: {
        issued: !!cert,
        uuid: cert?.certificateUuid ?? null,
        issuedAt: cert?.issuedAt.toISOString() ?? null,
      },
    });
  } catch (err) {
    logger.error({ err }, "Course progress dashboard error");
    return res.status(500).json({ message: "Internal error" });
  }
});

// ════════════════════════════════════════════════════════════════════════════
// Group 3 — Quizzes (authenticated)
// ════════════════════════════════════════════════════════════════════════════

// GET /api/course/quizzes/:quizId — quiz definition + questions WITHOUT answers
router.get("/api/course/quizzes/:quizId", requireAuth, generalLimiter, async (req, res) => {
  try {
    const lang = parseLang(req);
    const quizId = parseInt(String(req.params.quizId), 10);
    if (!Number.isFinite(quizId) || quizId <= 0) {
      return res.status(400).json({ message: "Invalid quiz id" });
    }

    const quiz = await storage.getCourseQuiz(quizId);
    if (!quiz) return res.status(404).json({ message: "Quiz not found" });

    const questions = await storage.getCourseQuizQuestions(quizId);

    let trIdx: TranslationIndex | null = null;
    if (lang) {
      const trRows = await storage.getCourseTranslations(
        lang,
        questions.map((q) => ({ entityType: "quiz_question" as const, entityId: q.id })),
      );
      trIdx = indexTranslations(trRows);
    }

    return res.json({
      id: quiz.id,
      moduleId: quiz.moduleId,
      type: quiz.type,
      passingPercentage: quiz.passingPercentage,
      timeLimitMinutes: quiz.timeLimitMinutes,
      questionCount: quiz.questionCount,
      questions: questions.map((q) => ({
        ...publicQuestion(q),
        questionText: tr(trIdx, "quiz_question", q.id, "question_text", q.questionText),
        optionA: tr(trIdx, "quiz_question", q.id, "option_a", q.optionA),
        optionB: tr(trIdx, "quiz_question", q.id, "option_b", q.optionB),
        optionC: tr(trIdx, "quiz_question", q.id, "option_c", q.optionC),
        optionD: tr(trIdx, "quiz_question", q.id, "option_d", q.optionD),
      })),
    });
  } catch (err) {
    logger.error({ err }, "Quiz read error");
    return res.status(500).json({ message: "Internal error" });
  }
});

// POST /api/course/quizzes/:quizId/attempts — submit + score
router.post("/api/course/quizzes/:quizId/attempts", requireAuth, writeLimiter, async (req, res) => {
  try {
    const userId = (req.user as any).id;
    const quizId = parseInt(String(req.params.quizId), 10);
    if (!Number.isFinite(quizId) || quizId <= 0) {
      return res.status(400).json({ message: "Invalid quiz id" });
    }

    const startedAtRaw = req.body?.startedAt;
    const answers = req.body?.answers as Record<string, string> | undefined;
    if (typeof startedAtRaw !== "string" || !answers || typeof answers !== "object") {
      return res.status(400).json({ message: "Body must include startedAt and answers" });
    }
    const startedAt = new Date(startedAtRaw);
    if (Number.isNaN(startedAt.getTime())) {
      return res.status(400).json({ message: "Invalid startedAt timestamp" });
    }

    const quiz = await storage.getCourseQuiz(quizId);
    if (!quiz) return res.status(404).json({ message: "Quiz not found" });

    const questions = await storage.getCourseQuizQuestions(quizId);

    // Server-side time-limit enforcement (final exam: 60 minutes).
    if (quiz.timeLimitMinutes != null) {
      const elapsedMs = Date.now() - startedAt.getTime();
      const limitMs = quiz.timeLimitMinutes * 60 * 1000;
      // Allow a 30s grace for clock skew and submit-button latency.
      if (elapsedMs > limitMs + 30_000) {
        return res.status(422).json({
          code: "TIME_EXPIRED",
          message: `Quiz time limit exceeded (${quiz.timeLimitMinutes} minutes)`,
        });
      }
    }

    // Validate answer count and option values.
    if (Object.keys(answers).length !== questions.length) {
      return res.status(422).json({
        code: "INVALID_ANSWERS",
        message: `Expected ${questions.length} answers, got ${Object.keys(answers).length}`,
      });
    }
    const validOptions = new Set(["a", "b", "c", "d"]);
    for (const v of Object.values(answers)) {
      if (typeof v !== "string" || !validOptions.has(v)) {
        return res.status(422).json({
          code: "INVALID_ANSWERS",
          message: "Each answer must be 'a', 'b', 'c', or 'd'",
        });
      }
    }

    // Grade the attempt. Question IDs in `answers` are stringified.
    let correctCount = 0;
    const review = questions.map((q) => {
      const userAnswer = answers[String(q.id)] ?? null;
      const correct = userAnswer === q.correctOption;
      if (correct) correctCount++;
      return {
        questionId: q.id,
        questionText: q.questionText,
        yourAnswer: userAnswer as "a" | "b" | "c" | "d" | null,
        correctAnswer: q.correctOption as "a" | "b" | "c" | "d",
        correct,
        explanation: q.explanation,
      };
    });

    const totalCount = questions.length;
    const scorePercentage = totalCount > 0 ? Math.round((correctCount / totalCount) * 100) : 0;
    const passed = scorePercentage >= quiz.passingPercentage;

    const attempt = await storage.recordQuizAttempt({
      userId,
      quizId,
      scorePercentage,
      correctCount,
      totalCount,
      passed,
      startedAt,
      completedAt: new Date(),
      answersJson: answers,
    });

    // Best score so far across ALL attempts (incl. this one).
    const allAttempts = await storage.getQuizAttempts(userId, quizId);
    const bestScoreSoFar = allAttempts.length === 0
      ? scorePercentage
      : Math.max(...allAttempts.map((a) => a.scorePercentage));

    return res.status(201).json({
      attemptId: attempt.id,
      scorePercentage,
      correctCount,
      totalCount,
      passed,
      review,
      bestScoreSoFar,
    });
  } catch (err) {
    logger.error({ err }, "Quiz attempt submit error");
    return res.status(500).json({ message: "Internal error" });
  }
});

// GET /api/course/quizzes/:quizId/attempts — user's attempt history
router.get("/api/course/quizzes/:quizId/attempts", requireAuth, generalLimiter, async (req, res) => {
  try {
    const userId = (req.user as any).id;
    const quizId = parseInt(String(req.params.quizId), 10);
    if (!Number.isFinite(quizId) || quizId <= 0) {
      return res.status(400).json({ message: "Invalid quiz id" });
    }

    const attempts = await storage.getQuizAttempts(userId, quizId);
    const bestScore = attempts.length === 0
      ? null
      : Math.max(...attempts.map((a) => a.scorePercentage));

    return res.json({
      attempts: attempts.map((a) => ({
        id: a.id,
        scorePercentage: a.scorePercentage,
        correctCount: a.correctCount,
        totalCount: a.totalCount,
        passed: a.passed,
        startedAt: a.startedAt.toISOString(),
        completedAt: a.completedAt ? a.completedAt.toISOString() : null,
      })),
      bestScore,
    });
  } catch (err) {
    logger.error({ err }, "Quiz attempts list error");
    return res.status(500).json({ message: "Internal error" });
  }
});

// ════════════════════════════════════════════════════════════════════════════
// Group 4 — Final project (authenticated)
// ════════════════════════════════════════════════════════════════════════════

// POST /api/course/final-project — submit / resubmit
router.post("/api/course/final-project", requireAuth, writeLimiter, async (req, res) => {
  try {
    const userId = (req.user as any).id;
    const bookId = Number(req.body?.bookId);
    const chapterIds = req.body?.chapterIds;

    if (!Number.isFinite(bookId) || bookId <= 0) {
      return res.status(400).json({ message: "bookId is required" });
    }
    if (!Array.isArray(chapterIds) || chapterIds.length !== FINAL_PROJECT_REQUIRED_CHAPTERS) {
      return res.status(422).json({
        code: "CHAPTER_COUNT",
        message: `Submit exactly ${FINAL_PROJECT_REQUIRED_CHAPTERS} chapter ids`,
      });
    }
    const ids = chapterIds.map(Number);
    if (ids.some((n) => !Number.isFinite(n) || n <= 0)) {
      return res.status(422).json({
        code: "CHAPTER_COUNT",
        message: "chapterIds must be positive integers",
      });
    }

    // Ownership chain: book belongs to user, chapters belong to that book.
    // QA fix #1.3 — also reject soft-deleted books. Without this, the user
    // can submit a trashed book as their final project and burn 4 AI calls
    // on content they no longer consider part of their library. The 404
    // (rather than a "this book is in trash" message) intentionally
    // doesn't reveal trash state to the caller.
    const book = await storage.getBook(bookId);
    if (!book || book.userId !== userId || book.isDeleted) {
      return res.status(404).json({ message: "Book not found" });
    }
    const chapters = await Promise.all(ids.map((id) => storage.getChapter(id)));
    for (let i = 0; i < ids.length; i++) {
      const ch = chapters[i];
      if (!ch) {
        return res.status(422).json({ code: "CHAPTER_OWNERSHIP", message: `Chapter ${ids[i]} not found` });
      }
      if (ch.bookId !== bookId) {
        return res.status(422).json({
          code: "CHAPTER_OWNERSHIP",
          message: `Chapter ${ids[i]} does not belong to book ${bookId}`,
        });
      }
    }

    const project = await storage.upsertFinalProject(userId, bookId, ids);

    return res.json({
      id: project.id,
      bookId: project.bookId,
      chapterIds: project.chapterIds as number[],
      submittedAt: project.submittedAt.toISOString(),
      approvedAt: project.approvedAt ? project.approvedAt.toISOString() : null,
      hasAiFeedback: project.aiFeedbackJson != null,
    });
  } catch (err) {
    logger.error({ err }, "Final project submit error");
    return res.status(500).json({ message: "Internal error" });
  }
});

// GET /api/course/final-project — current user's submission
router.get("/api/course/final-project", requireAuth, generalLimiter, async (req, res) => {
  try {
    const userId = (req.user as any).id;
    const project = await storage.getFinalProjectForUser(userId);
    if (!project) return res.json({ project: null });

    return res.json({
      project: {
        id: project.id,
        bookId: project.bookId,
        chapterIds: project.chapterIds as number[],
        submittedAt: project.submittedAt.toISOString(),
        approvedAt: project.approvedAt ? project.approvedAt.toISOString() : null,
        aiFeedback: project.aiFeedbackJson ?? null,
      },
    });
  } catch (err) {
    logger.error({ err }, "Final project read error");
    return res.status(500).json({ message: "Internal error" });
  }
});

// POST /api/course/final-project/feedback — run 4 AI analyses + persist
//
// AI cost gate (DP2 Approach A):
//   tierAiLimiter middleware is INTENTIONALLY NOT in the chain. It
//   would charge exactly 1 hit, but this endpoint runs 4 LLM calls
//   per submission. We replicate cost-aware logic inline so we can
//   reject a user whose remaining budget is below 4 BEFORE any LLM
//   calls fire. See discovered-issues.md for the future
//   tierAiLimiter({ cost: 4 }) factory refactor.
router.post("/api/course/final-project/feedback", requireAuth, requireOpenAI, aiLimiter, async (req, res) => {
  try {
    const userId = (req.user as any).id;

    const dbUser = await storage.getUserById(userId);
    if (!dbUser) return res.status(401).json({ message: "User not found" });

    const project = await storage.getFinalProjectForUser(userId);
    if (!project) {
      return res.status(404).json({ message: "Submit your final project before requesting feedback" });
    }

    // force=true: bypass cached aiFeedbackJson and burn 4 fresh AI
    // calls. Used by the frontend "Re-analyze" button after a user
    // resubmits revised chapters and wants new feedback against the
    // updated content. Default (false) returns the cached blob to
    // avoid accidental re-spend on idle dashboard visits.
    const force = req.body?.force === true;
    if (!force && project.aiFeedbackJson != null) {
      return res.json({ feedback: project.aiFeedbackJson, cached: true });
    }

    // Cost-aware tier check. Admins bypass entirely; everyone else
    // needs FEEDBACK_AI_COST hits available before we proceed.
    const isAdmin = isAdminUser(dbUser);
    if (!isAdmin) {
      const tier = getUserTier(dbUser as any);
      const { used, limit } = await checkAiLimit(userId, tier);
      if (used + FEEDBACK_AI_COST > limit) {
        return res.status(429).json({
          code: "AI_DAILY_LIMIT",
          message: `Final-project feedback needs ${FEEDBACK_AI_COST} AI calls; you have ${Math.max(0, limit - used)} of ${limit} left today on the ${tier} plan.`,
          tier,
          limit,
          used,
          remaining: Math.max(0, limit - used),
          cost: FEEDBACK_AI_COST,
        });
      }
    }

    // Build the manuscript from the submitted chapters. Only the
    // chapters listed in chapterIds are sent to the LLMs (not the
    // whole book) — that's the user's submission, not the full work.
    const chapterIds = project.chapterIds as number[];
    const book = await storage.getBook(project.bookId);
    if (!book || book.isDeleted) {
      // CASCADE on books → final_projects only fires on hard-delete; a
      // soft-delete leaves the row pointing at a flag-deleted book, so we
      // need an explicit isDeleted check (QA fix #1.3). Without this the
      // user could trigger 4 AI analyses on a trashed manuscript, wasting
      // their daily budget.
      logger.error(
        { userId, projectId: project.id, bookId: project.bookId, deleted: book?.isDeleted ?? "missing" },
        "Final project references missing or soft-deleted book",
      );
      return res.status(422).json({ message: "Submitted book no longer exists; please resubmit" });
    }
    const chapters = await Promise.all(chapterIds.map((id) => storage.getChapter(id)));
    const chapterTitles: string[] = [];
    const parts: string[] = [];
    for (let i = 0; i < chapterIds.length; i++) {
      const ch = chapters[i];
      if (!ch || ch.bookId !== project.bookId) {
        logger.error({ userId, chapterId: chapterIds[i] }, "Final project references missing/orphan chapter");
        return res.status(422).json({ message: "Submitted chapter no longer exists; please resubmit" });
      }
      chapterTitles.push(ch.title);
      parts.push(`# ${ch.title}\n\n${getChapterText(ch.content || "")}`);
    }
    const manuscript = parts.join("\n\n");

    // Run all 4 analyses in parallel — each is an independent LLM
    // call so latency = max(individual). On any failure the catch
    // below returns 500; the increment-usage step is gated on
    // success so a partial failure doesn't drain the user's budget.
    const [plotHoles, dialogue, pacing, voice] = await Promise.all([
      analyzePlotHoles(manuscript, book.title),
      analyzeDialogue(manuscript, book.title),
      analyzePacing(manuscript, book.title, chapterTitles),
      analyzeVoiceConsistency(manuscript, book.title),
    ]);

    const feedback = {
      plotHoles,
      dialogue,
      pacing,
      voice,
      generatedAt: new Date().toISOString(),
    };
    await storage.saveFinalProjectFeedback(userId, feedback);

    // Charge the daily-AI counter. Admins still get a single
    // analytics-only increment to mirror tierAiLimiter behavior.
    if (isAdmin) {
      await incrementAiUsage(userId);
    } else {
      for (let i = 0; i < FEEDBACK_AI_COST; i++) {
        await incrementAiUsage(userId);
      }
    }

    return res.json({ feedback, cached: false });
  } catch (err) {
    logger.error({ err }, "Final project feedback error");
    return res.status(500).json({ message: "Feedback generation failed" });
  }
});

// ════════════════════════════════════════════════════════════════════════════
// Group 5 — Certificate (authenticated + 1 public)
// ════════════════════════════════════════════════════════════════════════════

// POST /api/course/certificate/issue — idempotent issuance
router.post("/api/course/certificate/issue", requireAuth, writeLimiter, async (req, res) => {
  try {
    const userId = (req.user as any).id;

    // Short-circuit: if a cert already exists, return it (idempotent).
    const existing = await storage.getCertificateForUser(userId);
    if (existing) {
      return res.json({
        uuid: existing.certificateUuid,
        issuedAt: existing.issuedAt.toISOString(),
        finalExamScore: existing.finalExamScore,
        pdfUrl: existing.pdfUrl,
        alreadyIssued: true,
      });
    }

    const elig: CertificateEligibility = await storage.getCertificateEligibility(userId);
    if (!elig.eligible) {
      return res.status(409).json({
        code: "NOT_ELIGIBLE",
        message: "Complete all course requirements before issuing your certificate",
        missing: elig.missing,
      });
    }

    // elig.finalExamScore is non-null when eligible (finalExamPassed === true).
    // holderLanguage stays null in v1 — there's no `users.language` column
    // (Plotzy stores UI language in localStorage via useLanguage()). When a
    // future user-preference batch adds the column, this call site reads it
    // and passes through. Schema column on courseCertificates exists already
    // (Batch 3.2 / DP3) so no migration is needed at that point.
    const cert = await storage.issueCertificate(
      userId,
      elig.finalExamScore ?? 0,
      elig.modulesCompletedAt,
      null,
    );

    return res.status(201).json({
      uuid: cert.certificateUuid,
      issuedAt: cert.issuedAt.toISOString(),
      finalExamScore: cert.finalExamScore,
      pdfUrl: cert.pdfUrl,
      alreadyIssued: false,
    });
  } catch (err) {
    logger.error({ err }, "Certificate issue error");
    return res.status(500).json({ message: "Internal error" });
  }
});

// GET /api/course/certificate — current user's certificate
router.get("/api/course/certificate", requireAuth, generalLimiter, async (req, res) => {
  try {
    const userId = (req.user as any).id;
    const cert = await storage.getCertificateForUser(userId);
    if (!cert) return res.status(404).json({ message: "No certificate issued yet" });

    return res.json({
      uuid: cert.certificateUuid,
      issuedAt: cert.issuedAt.toISOString(),
      finalExamScore: cert.finalExamScore,
      modulesCompletedAt: cert.modulesCompletedAt as Record<string, string>,
      pdfUrl: cert.pdfUrl,
    });
  } catch (err) {
    logger.error({ err }, "Certificate read error");
    return res.status(500).json({ message: "Internal error" });
  }
});

// GET /api/certificates/:uuid — PUBLIC verification endpoint
//
// The UUID is the bearer of identity. We deliberately leak the
// holder's displayName + avatarUrl + profile link because that's
// the point of a shareable certificate. Email and other PII stay
// private.
router.get("/api/certificates/:uuid", publicReadLimiter, async (req, res) => {
  try {
    const uuid = String(req.params.uuid);
    if (!uuid || uuid.length < 8) {
      return res.status(400).json({ message: "Invalid certificate id" });
    }

    const cert = await storage.getCertificateByUuid(uuid);
    if (!cert) return res.status(404).json({ message: "Certificate not found" });

    const holder = await storage.getUserById(cert.userId);
    // CASCADE means the cert is deleted with the user, so this should
    // be unreachable. Guard anyway.
    if (!holder) {
      return res.status(404).json({ message: "Certificate holder no longer exists" });
    }

    // displayName falls back to null when not set — NEVER to email,
    // which would leak PII on a public, shareable URL.
    return res.json({
      uuid: cert.certificateUuid,
      issuedAt: cert.issuedAt.toISOString(),
      finalExamScore: cert.finalExamScore,
      holder: {
        displayName: holder.displayName ?? null,
        avatarUrl: holder.avatarUrl ?? null,
        profileUrl: `/authors/${holder.id}`,
      },
      courseTitle: "How to Write Your First Book",
    });
  } catch (err) {
    logger.error({ err }, "Public certificate verify error");
    return res.status(500).json({ message: "Internal error" });
  }
});

// GET /api/certificates/:uuid/pdf — PUBLIC PDF download
//
// Same security model as the verify endpoint above: anyone with the
// UUID can download (that's the point of a shareable certificate).
//
// Lazy generation: the cert row's pdf_data is populated on first
// download via setCertificatePdfData (race-safe conditional UPDATE).
// All subsequent downloads serve the cached bytes. Cost of double
// generation in a concurrent first-download race is one extra render
// (the loser's bytes are discarded by the WHERE pdf_data IS NULL
// condition); cost of all subsequent downloads is one DB read.
//
// Cache headers: 1y immutable. The PDF for a given UUID never changes
// after generation — the holder name + score + date + UUID are all
// fixed at the moment of issuance, so any CDN/browser may cache
// indefinitely.
router.get("/api/certificates/:uuid/pdf", publicReadLimiter, async (req, res) => {
  try {
    const uuid = String(req.params.uuid);
    if (!uuid || uuid.length < 8) {
      return res.status(400).json({ message: "Invalid certificate id" });
    }

    const cert = await storage.getCertificateByUuid(uuid);
    if (!cert) return res.status(404).json({ message: "Certificate not found" });

    // Try cache first.
    let cached = await storage.getCertificatePdfData(uuid);

    if (!cached) {
      // Generate on first download. Look up holder for the displayName.
      const holder = await storage.getUserById(cert.userId);
      if (!holder) {
        // CASCADE means cert is deleted with user — should be unreachable.
        return res.status(404).json({ message: "Certificate holder no longer exists" });
      }

      // displayName falls back to "Author" when not set, matching the
      // frontend's t("courseCertAnonymousHolder") behavior. The renderer
      // requires a non-empty string. v1 is English-only PDFs so the
      // literal string is correct here.
      //
      // QA fix #3.2 — cap to 50 chars before render. Without the cap,
      // very long display names visibly clip against the side ribbon
      // (the safe fit is ~60 chars at the 28pt Lora-SemiBold size; 50
      // is conservative for variable-width characters). The HTML cert
      // on the verify page is unaffected (responsive layout handles
      // long names there).
      const holderName = (holder.displayName?.trim() || "Author").slice(0, 50);

      const pdfBuffer = await renderCertificatePdf({
        holderName,
        finalExamScore: cert.finalExamScore,
        issuedAt: cert.issuedAt,
        certUuid: cert.certificateUuid,
      });

      // Race-safe write: if a concurrent request already populated
      // the row, our setCertificatePdfData returns false; we re-fetch
      // to serve the winner's bytes. The user gets the same PDF
      // regardless of which renderer won.
      const won = await storage.setCertificatePdfData(uuid, pdfBuffer);
      if (won) {
        cached = {
          pdfData: pdfBuffer,
          pdfSizeBytes: pdfBuffer.length,
          holderLanguage: cert.holderLanguage,
        };
      } else {
        cached = await storage.getCertificatePdfData(uuid);
        if (!cached) {
          // Extremely unlikely: race lost, then row vanished. Treat as
          // generation failure so the next request retries cleanly.
          throw new Error(
            `setCertificatePdfData lost race but getCertificatePdfData returned null for uuid ${uuid}`,
          );
        }
      }
    }

    res.set({
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="plotzy-certificate-${uuid}.pdf"`,
      "Cache-Control": "public, max-age=31536000, immutable",
      "Content-Length": String(cached.pdfData.length),
    });
    return res.send(cached.pdfData);
  } catch (err) {
    logger.error({ err, uuid: req.params.uuid }, "Certificate PDF download error");
    return res.status(500).json({ message: "Internal error" });
  }
});

export default router;
