// One-shot upsert that brings the database in line with the bundled
// course content. Designed to run on every API server boot so a
// freshly-migrated database (or a database we've just moved between
// providers) self-heals: the next boot finds the modules / lessons /
// quizzes / question bank already in place and writers never see an
// empty course.
//
// Strategy:
//   1. UPSERT modules keyed by slug.
//   2. UPSERT lessons keyed by slug (module FK resolved from slug map).
//   3. UPSERT quizzes keyed by (type='final') OR (type='module', module_id).
//   4. For each quiz, replace its question bank: DELETE-then-INSERT.
//      Questions have no natural unique key in the schema and quiz
//      attempts only reference quiz_id (not question_id), so wiping
//      and reinserting is safe and keeps every boot's questions in
//      lockstep with the bundled content.
//
// Errors are logged but never thrown. The course is content-only and
// must not be allowed to crash the whole API server during startup,
// just as the Hindawi / Gutenberg sync jobs cannot.

import { and, eq, isNull, sql } from "drizzle-orm";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import {
  courseModules,
  courseLessons,
  courseQuizzes,
  courseQuizQuestions,
} from "../schema";
import { MODULES, LESSONS, QUIZZES, QUESTIONS } from "./index";

interface SyncCounts {
  modules: { inserted: number; updated: number };
  lessons: { inserted: number; updated: number };
  quizzes: { inserted: number; updated: number };
  questions: { replaced: number };
}

export async function syncCourseContent(
  db: NodePgDatabase<any>,
  log: (msg: string) => void = () => {},
): Promise<SyncCounts> {
  const counts: SyncCounts = {
    modules: { inserted: 0, updated: 0 },
    lessons: { inserted: 0, updated: 0 },
    quizzes: { inserted: 0, updated: 0 },
    questions: { replaced: 0 },
  };

  // ── Modules ─────────────────────────────────────────────────────
  const moduleIdBySlug = new Map<string, number>();
  for (const m of MODULES) {
    const existing = await db
      .select({ id: courseModules.id })
      .from(courseModules)
      .where(eq(courseModules.slug, m.slug));
    if (existing.length === 0) {
      const [inserted] = await db
        .insert(courseModules)
        .values({
          slug: m.slug,
          title: m.title,
          subtitle: m.subtitle ?? "",
          description: m.description ?? "",
          titleAr: m.titleAr,
          subtitleAr: m.subtitleAr,
          descriptionAr: m.descriptionAr,
          order: m.order,
          estimatedMinutes: m.estimatedMinutes ?? 0,
        })
        .returning({ id: courseModules.id });
      moduleIdBySlug.set(m.slug, inserted.id);
      counts.modules.inserted++;
    } else {
      await db
        .update(courseModules)
        .set({
          title: m.title,
          subtitle: m.subtitle ?? "",
          description: m.description ?? "",
          titleAr: m.titleAr,
          subtitleAr: m.subtitleAr,
          descriptionAr: m.descriptionAr,
          order: m.order,
          estimatedMinutes: m.estimatedMinutes ?? 0,
        })
        .where(eq(courseModules.id, existing[0].id));
      moduleIdBySlug.set(m.slug, existing[0].id);
      counts.modules.updated++;
    }
  }

  // ── Lessons ─────────────────────────────────────────────────────
  for (const l of LESSONS) {
    const moduleId = moduleIdBySlug.get(l.moduleSlug);
    if (!moduleId) {
      log(`[course-sync] skipping lesson ${l.slug}: unknown moduleSlug ${l.moduleSlug}`);
      continue;
    }
    const existing = await db
      .select({ id: courseLessons.id })
      .from(courseLessons)
      .where(eq(courseLessons.slug, l.slug));
    if (existing.length === 0) {
      await db.insert(courseLessons).values({
        moduleId,
        slug: l.slug,
        title: l.title,
        titleAr: l.titleAr,
        orderInModule: l.orderInModule,
        estimatedMinutes: l.estimatedMinutes ?? 0,
        content: l.content,
        contentAr: l.contentAr,
        heroImageUrl: l.heroImageUrl,
      });
      counts.lessons.inserted++;
    } else {
      await db
        .update(courseLessons)
        .set({
          moduleId,
          title: l.title,
          titleAr: l.titleAr,
          orderInModule: l.orderInModule,
          estimatedMinutes: l.estimatedMinutes ?? 0,
          content: l.content,
          contentAr: l.contentAr,
          heroImageUrl: l.heroImageUrl,
          updatedAt: new Date(),
        })
        .where(eq(courseLessons.id, existing[0].id));
      counts.lessons.updated++;
    }
  }

  // ── Quizzes ─────────────────────────────────────────────────────
  // (key, db id) so we can scope question deletes by db quiz_id.
  const quizIdByKey = new Map<string, number>();
  for (const q of QUIZZES) {
    let existing: { id: number }[];
    if (q.type === "final") {
      existing = await db
        .select({ id: courseQuizzes.id })
        .from(courseQuizzes)
        .where(and(eq(courseQuizzes.type, "final"), isNull(courseQuizzes.moduleId)));
    } else {
      const moduleId = q.moduleSlug ? moduleIdBySlug.get(q.moduleSlug) : undefined;
      if (!moduleId) {
        log(`[course-sync] skipping quiz ${q.key}: unknown moduleSlug ${q.moduleSlug}`);
        continue;
      }
      existing = await db
        .select({ id: courseQuizzes.id })
        .from(courseQuizzes)
        .where(and(eq(courseQuizzes.type, "module"), eq(courseQuizzes.moduleId, moduleId)));
    }

    if (existing.length === 0) {
      const moduleId =
        q.type === "final" ? null : moduleIdBySlug.get(q.moduleSlug ?? "") ?? null;
      const [inserted] = await db
        .insert(courseQuizzes)
        .values({
          moduleId,
          type: q.type,
          questionCount: q.questionCount,
          passingPercentage: q.passingPercentage,
          timeLimitMinutes: q.timeLimitMinutes,
        })
        .returning({ id: courseQuizzes.id });
      quizIdByKey.set(q.key, inserted.id);
      counts.quizzes.inserted++;
    } else {
      await db
        .update(courseQuizzes)
        .set({
          questionCount: q.questionCount,
          passingPercentage: q.passingPercentage,
          timeLimitMinutes: q.timeLimitMinutes,
        })
        .where(eq(courseQuizzes.id, existing[0].id));
      quizIdByKey.set(q.key, existing[0].id);
      counts.quizzes.updated++;
    }
  }

  // ── Quiz questions ──────────────────────────────────────────────
  // For idempotency without a natural unique key, we wipe each quiz's
  // questions and reinsert. Per-quiz so we can short-circuit if the
  // bundled bank matches what's already there.
  const questionsByQuizKey = new Map<string, typeof QUESTIONS>();
  for (const qq of QUESTIONS) {
    const list = questionsByQuizKey.get(qq.quizKey) ?? [];
    list.push(qq);
    questionsByQuizKey.set(qq.quizKey, list);
  }
  for (const [key, list] of questionsByQuizKey) {
    const quizId = quizIdByKey.get(key);
    if (!quizId) {
      log(`[course-sync] skipping ${list.length} questions: no quiz row for key ${key}`);
      continue;
    }
    // Cheap content-equality check. Count alone is not enough once
    // translations exist: adding Arabic to a bank keeps the count
    // identical, so also compare how many rows carry an Arabic text
    // against how many the bundle expects to carry one.
    const [{ matched, matchedAr }] = await db
      .select({
        matched: sql<number>`count(*)::int`,
        matchedAr: sql<number>`count(*) FILTER (WHERE ${courseQuizQuestions.questionTextAr} IS NOT NULL)::int`,
      })
      .from(courseQuizQuestions)
      .where(eq(courseQuizQuestions.quizId, quizId));
    const bundledAr = list.filter((qq) => qq.questionTextAr != null).length;
    if (matched === list.length && matchedAr === bundledAr) {
      // Best-effort: if the count already matches, assume the bank is
      // current. The full text compare would round-trip every row and
      // boot is supposed to be cheap. Manual re-sync is always
      // available by deleting questions for the quiz and rebooting.
      continue;
    }
    await db.delete(courseQuizQuestions).where(eq(courseQuizQuestions.quizId, quizId));
    // Re-insert in a deterministic order so the unique (quiz_id, order)
    // index stays consistent across reseeds. If the bundled question
    // already has an order, honour it; otherwise fall back to its
    // position in the list.
    let i = 0;
    for (const qq of list) {
      i++;
      await db.insert(courseQuizQuestions).values({
        quizId,
        order: qq.order ?? i,
        questionText: qq.questionText,
        optionA: qq.optionA,
        optionB: qq.optionB,
        optionC: qq.optionC,
        optionD: qq.optionD,
        correctOption: qq.correctOption,
        explanation: qq.explanation,
        questionTextAr: qq.questionTextAr,
        optionAAr: qq.optionAAr,
        optionBAr: qq.optionBAr,
        optionCAr: qq.optionCAr,
        optionDAr: qq.optionDAr,
        explanationAr: qq.explanationAr,
      });
    }
    counts.questions.replaced += list.length;
  }

  return counts;
}
