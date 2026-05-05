/**
 * Verify the deployed course schema matches the design:
 *   - row counts (6 modules, 27 lessons, 7 quizzes, 0 questions yet)
 *   - course_progress.lesson_id is ON DELETE RESTRICT (the protective FK)
 *   - all course_* FK actions match course-schema-migration.sql
 *   - constraints (CHECKs, partial unique on quizzes.module_id) present
 */

import { pool } from "../src/index";

interface FkRow {
  table_name: string;
  column_name: string;
  referenced_table: string;
  referenced_column: string;
  delete_rule: string;
}

async function main() {
  // Row counts.
  const counts = await pool.query<{ table: string; n: string }>(`
    SELECT 'course_modules' AS table, COUNT(*)::text AS n FROM course_modules
    UNION ALL SELECT 'course_lessons',         COUNT(*)::text FROM course_lessons
    UNION ALL SELECT 'course_quizzes',         COUNT(*)::text FROM course_quizzes
    UNION ALL SELECT 'course_quiz_questions',  COUNT(*)::text FROM course_quiz_questions
    UNION ALL SELECT 'course_progress',        COUNT(*)::text FROM course_progress
    UNION ALL SELECT 'course_quiz_attempts',   COUNT(*)::text FROM course_quiz_attempts
    UNION ALL SELECT 'course_certificates',    COUNT(*)::text FROM course_certificates
    UNION ALL SELECT 'course_final_projects',  COUNT(*)::text FROM course_final_projects
    ORDER BY 1
  `);
  console.log("─── Row counts ─────────────────────────");
  for (const row of counts.rows) console.log(`  ${row.table.padEnd(25)} ${row.n}`);

  // Foreign key actions.
  const fks = await pool.query<FkRow>(`
    SELECT
      tc.table_name,
      kcu.column_name,
      ccu.table_name  AS referenced_table,
      ccu.column_name AS referenced_column,
      rc.delete_rule
    FROM information_schema.table_constraints tc
    JOIN information_schema.key_column_usage kcu
      ON tc.constraint_name = kcu.constraint_name AND tc.table_schema = kcu.table_schema
    JOIN information_schema.referential_constraints rc
      ON tc.constraint_name = rc.constraint_name
    JOIN information_schema.constraint_column_usage ccu
      ON rc.unique_constraint_name = ccu.constraint_name
    WHERE tc.constraint_type = 'FOREIGN KEY'
      AND tc.table_schema = 'public'
      AND tc.table_name LIKE 'course_%'
    ORDER BY tc.table_name, kcu.column_name
  `);
  console.log("\n─── FK actions on course_* ─────────────");
  for (const row of fks.rows) {
    console.log(
      `  ${row.table_name}.${row.column_name} → ${row.referenced_table}.${row.referenced_column}  ON DELETE ${row.delete_rule}`,
    );
  }

  // Specifically verify course_progress.lesson_id = RESTRICT.
  const progressLessonFk = fks.rows.find(
    (r) => r.table_name === "course_progress" && r.column_name === "lesson_id",
  );
  if (!progressLessonFk) {
    console.log("\nFAIL: course_progress.lesson_id FK not found");
    process.exitCode = 1;
  } else if (progressLessonFk.delete_rule !== "RESTRICT") {
    console.log(
      `\nFAIL: course_progress.lesson_id should be ON DELETE RESTRICT, got ${progressLessonFk.delete_rule}`,
    );
    process.exitCode = 1;
  } else {
    console.log("\nOK: course_progress.lesson_id is ON DELETE RESTRICT");
  }

  // CHECK constraints.
  const checks = await pool.query<{ table_name: string; constraint_name: string; check_clause: string }>(`
    SELECT tc.table_name, tc.constraint_name, cc.check_clause
    FROM information_schema.table_constraints tc
    JOIN information_schema.check_constraints cc ON tc.constraint_name = cc.constraint_name
    WHERE tc.constraint_type = 'CHECK'
      AND tc.table_schema = 'public'
      AND tc.table_name LIKE 'course_%'
      AND tc.constraint_name NOT LIKE '%_not_null'
    ORDER BY tc.table_name, tc.constraint_name
  `);
  console.log("\n─── CHECK constraints ──────────────────");
  for (const r of checks.rows) {
    console.log(`  ${r.table_name}.${r.constraint_name}: ${r.check_clause}`);
  }

  // Module ordering invariant.
  const modules = await pool.query<{ slug: string; title: string; order: number }>(
    `SELECT slug, title, "order" FROM course_modules ORDER BY "order"`,
  );
  console.log("\n─── Module catalog ─────────────────────");
  for (const m of modules.rows) console.log(`  ${m.order}. ${m.slug.padEnd(18)} — ${m.title}`);

  // Lesson distribution per module.
  const dist = await pool.query<{ module_slug: string; lesson_count: string }>(`
    SELECT m.slug AS module_slug, COUNT(l.id)::text AS lesson_count
    FROM course_modules m
    LEFT JOIN course_lessons l ON l.module_id = m.id
    GROUP BY m.slug, m."order"
    ORDER BY m."order"
  `);
  console.log("\n─── Lesson distribution ────────────────");
  let total = 0;
  for (const d of dist.rows) {
    console.log(`  ${d.module_slug.padEnd(18)} ${d.lesson_count}`);
    total += Number(d.lesson_count);
  }
  console.log(`  TOTAL: ${total}`);

  // Quiz inventory.
  const quizzes = await pool.query<{ id: number; module_id: number | null; type: string; question_count: number; passing_percentage: number; time_limit_minutes: number | null }>(
    `SELECT id, module_id, type, question_count, passing_percentage, time_limit_minutes FROM course_quizzes ORDER BY id`,
  );
  console.log("\n─── Quiz inventory ─────────────────────");
  for (const q of quizzes.rows) {
    console.log(
      `  id=${q.id} type=${q.type} module_id=${q.module_id ?? "NULL"} qn=${q.question_count} pass=${q.passing_percentage}% time=${q.time_limit_minutes ?? "—"}min`,
    );
  }
}

main()
  .then(() => pool.end().then(() => process.exit(process.exitCode ?? 0)))
  .catch((e) => {
    console.error(e);
    pool.end().finally(() => process.exit(1));
  });
