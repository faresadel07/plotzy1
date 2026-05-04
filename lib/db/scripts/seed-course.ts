/**
 * Seed the writing course content tables.
 *
 * Inserts:
 *   - 6 modules with finalized slugs / titles / subtitles.
 *   - 27 lessons with finalized slugs and titles (placeholder
 *     content). Slugs ship into URLs (/learn/lesson/<slug>) so they
 *     are finalized now to avoid SEO breakage when content lands in
 *     Batch 2. Distribution: 4 + 4 + 5 + 4 + 5 + 5 = 27.
 *   - 6 module quiz rows + 1 final exam = 7 quizzes. No questions
 *     seeded yet (they fill in Batch 3).
 *
 * Idempotent: each section checks whether the rows already exist
 * before inserting, so re-running the script does not error or
 * duplicate.
 *
 * Run via:
 *   cd lib/db && pnpm seed:course
 */

import { db, pool } from "../src/index";
import {
  courseModules,
  courseLessons,
  courseQuizzes,
} from "../src/schema";
import { eq } from "drizzle-orm";

// ── Module catalog (final slugs/titles/subtitles per spec) ──────────────
interface LessonSeed {
  slug: string;
  title: string;
}

interface ModuleSeed {
  slug: string;
  title: string;
  subtitle: string;
  description: string;
  order: number;
  estimatedMinutes: number;
  lessons: LessonSeed[];
}

const MODULES: ModuleSeed[] = [
  {
    slug: "foundation",
    title: "The Foundation",
    subtitle: "Before You Write: Understanding Story",
    description: "Foundational concepts every writer needs before drafting their first chapter.",
    order: 1,
    estimatedMinutes: 45,
    lessons: [
      { slug: "foundation-what-is-story",      title: "What is a story? (psychology of narrative)" },
      { slug: "foundation-why-people-read",    title: "Why people read fiction" },
      { slug: "foundation-finding-idea",       title: "Finding your story idea" },
      { slug: "foundation-three-ingredients",  title: "The 3 ingredients every story needs" },
    ],
  },
  {
    slug: "architecture",
    title: "Story Architecture",
    subtitle: "Building the Skeleton",
    description: "Story structure, plot frameworks, and how to outline a book that holds together.",
    order: 2,
    estimatedMinutes: 45,
    lessons: [
      { slug: "architecture-three-acts",          title: "The 3-Act Structure" },
      { slug: "architecture-heros-journey",       title: "The Hero's Journey simplified" },
      { slug: "architecture-save-the-cat",        title: "Save the Cat beat sheet" },
      { slug: "architecture-choosing-structure",  title: "Choosing your structure" },
    ],
  },
  {
    slug: "characters",
    title: "Characters That Live",
    subtitle: "Creating People Readers Care About",
    description: "Character creation, motivation, voice, and arcs that drive the reader through the story.",
    order: 3,
    estimatedMinutes: 50,
    lessons: [
      { slug: "characters-protagonist-wound", title: "The protagonist's wound and want" },
      { slug: "characters-backstory",         title: "Character backstory (how much is enough)" },
      { slug: "characters-antagonist",        title: "The antagonist (and why they need to be human)" },
      { slug: "characters-supporting-cast",   title: "Supporting cast" },
      { slug: "characters-dialogue",          title: "Dialogue that sounds real" },
    ],
  },
  {
    slug: "world",
    title: "World and Setting",
    subtitle: "Where Your Story Lives",
    description: "World-building, setting as character, and grounding the reader in place and time.",
    order: 4,
    estimatedMinutes: 40,
    lessons: [
      { slug: "world-show-dont-tell",         title: "Show, don't tell — the real meaning" },
      { slug: "world-sensory-writing",        title: "Sensory writing (the 5 senses technique)" },
      { slug: "world-setting-as-character",   title: "Setting as character" },
      { slug: "world-description-pace",       title: "Description without slowing pace" },
    ],
  },
  {
    slug: "writing-process",
    title: "The Writing Process",
    subtitle: "From Page 1 to The End",
    description: "Daily writing habits, drafting strategies, revision discipline, and finishing what you start.",
    order: 5,
    estimatedMinutes: 50,
    lessons: [
      { slug: "process-blank-page",       title: "The blank page (overcoming it)" },
      { slug: "process-first-draft",      title: "Writing the first draft (permission to be bad)" },
      { slug: "process-revision-passes",  title: "Revision in 3 passes" },
      { slug: "process-self-editing",     title: "Self-editing checklist" },
      { slug: "process-when-to-stop",     title: "When to stop revising" },
    ],
  },
  {
    slug: "publishing",
    title: "Getting Published",
    subtitle: "Sharing Your Story With the World",
    description: "Publishing paths, query letters, working with publishers, and what to do once your book is done.",
    order: 6,
    estimatedMinutes: 50,
    lessons: [
      { slug: "publishing-self-vs-traditional", title: "Self-publishing vs traditional" },
      { slug: "publishing-cover-blurb",         title: "Cover, blurb, and metadata" },
      { slug: "publishing-audience",            title: "Building an audience" },
      { slug: "publishing-marketing",           title: "Marketing your first book" },
      { slug: "publishing-after-launch",        title: "What comes after publication" },
    ],
  },
];

const LESSON_PLACEHOLDER_CONTENT =
  "_(Lesson content arrives in Batch 2.)_";

const LESSON_PLACEHOLDER_MINUTES = 8;

const TOTAL_LESSONS_EXPECTED = 27;

// ── Helpers ────────────────────────────────────────────────────────────
async function seedModules(): Promise<Map<string, number>> {
  const slugToId = new Map<string, number>();
  for (const m of MODULES) {
    const existing = await db
      .select({ id: courseModules.id })
      .from(courseModules)
      .where(eq(courseModules.slug, m.slug));
    if (existing.length > 0) {
      slugToId.set(m.slug, existing[0].id);
      console.log(`  module "${m.slug}" already exists (id=${existing[0].id}) — skip`);
      continue;
    }
    const [inserted] = await db
      .insert(courseModules)
      .values({
        slug: m.slug,
        title: m.title,
        subtitle: m.subtitle,
        description: m.description,
        order: m.order,
        estimatedMinutes: m.estimatedMinutes,
      })
      .returning({ id: courseModules.id });
    slugToId.set(m.slug, inserted.id);
    console.log(`  module "${m.slug}" inserted (id=${inserted.id})`);
  }
  return slugToId;
}

async function seedLessons(slugToId: Map<string, number>) {
  let created = 0;
  let skipped = 0;
  let total = 0;
  for (const m of MODULES) {
    const moduleId = slugToId.get(m.slug);
    if (!moduleId) throw new Error(`Module "${m.slug}" not found after seed`);
    for (let i = 0; i < m.lessons.length; i++) {
      const l = m.lessons[i];
      total++;
      const existing = await db
        .select({ id: courseLessons.id })
        .from(courseLessons)
        .where(eq(courseLessons.slug, l.slug));
      if (existing.length > 0) {
        skipped++;
        continue;
      }
      await db.insert(courseLessons).values({
        moduleId,
        slug: l.slug,
        title: l.title,
        orderInModule: i + 1,
        estimatedMinutes: LESSON_PLACEHOLDER_MINUTES,
        content: LESSON_PLACEHOLDER_CONTENT,
      });
      created++;
    }
  }
  console.log(`  lessons: ${created} inserted, ${skipped} already present (total ${total})`);
  // Defensive: the catalog above must sum to exactly 27 lessons. If a
  // future edit unbalances the counts, surface it loudly here rather
  // than silently drifting from the documented "6 modules, 27 lessons"
  // course shape.
  if (total !== TOTAL_LESSONS_EXPECTED) {
    throw new Error(
      `Lesson catalog mismatch: expected ${TOTAL_LESSONS_EXPECTED}, got ${total}. Fix the MODULES array.`,
    );
  }
}

async function seedQuizzes(slugToId: Map<string, number>) {
  let created = 0;
  let skipped = 0;
  // 6 module quizzes (5 questions each, 70% pass, no time limit).
  for (const m of MODULES) {
    const moduleId = slugToId.get(m.slug)!;
    const existing = await db
      .select({ id: courseQuizzes.id })
      .from(courseQuizzes)
      .where(eq(courseQuizzes.moduleId, moduleId));
    if (existing.length > 0) {
      skipped++;
      continue;
    }
    await db.insert(courseQuizzes).values({
      moduleId,
      type: "module",
      questionCount: 5,
      passingPercentage: 70,
      timeLimitMinutes: null,
    });
    created++;
  }
  // 1 final exam (40 questions, 75% pass, 60-minute limit). Detect via
  // type='final' since module_id is NULL.
  const finalExisting = await db
    .select({ id: courseQuizzes.id })
    .from(courseQuizzes)
    .where(eq(courseQuizzes.type, "final"));
  if (finalExisting.length > 0) {
    skipped++;
  } else {
    await db.insert(courseQuizzes).values({
      moduleId: null,
      type: "final",
      questionCount: 40,
      passingPercentage: 75,
      timeLimitMinutes: 60,
    });
    created++;
  }
  console.log(`  quizzes: ${created} inserted, ${skipped} already present`);
}

// ── Main ───────────────────────────────────────────────────────────────
async function main() {
  console.log("Seeding writing course (modules → lessons → quizzes)...");
  const slugToId = await seedModules();
  await seedLessons(slugToId);
  await seedQuizzes(slugToId);
  console.log("Done. NO quiz questions seeded yet — those land in Batch 3.");
}

main()
  .then(() => pool.end().then(() => process.exit(0)))
  .catch((err) => {
    console.error("Seed failed:", err);
    pool.end().finally(() => process.exit(1));
  });
