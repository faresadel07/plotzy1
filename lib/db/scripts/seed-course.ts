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

import { existsSync, readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { db, pool } from "../src/index";
import {
  courseModules,
  courseLessons,
  courseQuizzes,
  courseQuizQuestions,
} from "../src/schema";
import { and, eq } from "drizzle-orm";

// __dirname equivalent under "type": "module" / ESM.
const __dirname = dirname(fileURLToPath(import.meta.url));

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
      { slug: "architecture-beat-sheets",         title: "Beat Sheets and Granular Structure" },
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

// ── Slug migrations ───────────────────────────────────────────────────
//
// Lesson rows in production may carry slugs from earlier batches that
// have since been renamed in the catalog. This pass walks a list of
// (oldSlug → newSlug) pairs and updates any matching rows, optionally
// retitling. Idempotent: rows already at the new slug are a no-op.
//
// Rationale for the table-driven approach: each rename is a one-line
// catalog edit + one entry here. Future batches that need to rename
// a lesson add a row to LESSON_RENAMES, run `pnpm seed:course`, and
// drop the entry once all production environments have applied it.
const LESSON_RENAMES: { from: string; to: string; newTitle?: string }[] = [
  // Batch 2.2: brand-name removal — "Save the Cat" is a 2005 Snyder
  // trademark; the lesson teaches the concept of beat sheets generically.
  {
    from: "architecture-save-the-cat",
    to: "architecture-beat-sheets",
    newTitle: "Beat Sheets and Granular Structure",
  },
];

async function applyLessonRenames() {
  let renamed = 0;
  let alreadyApplied = 0;
  for (const r of LESSON_RENAMES) {
    const [old] = await db
      .select({ id: courseLessons.id })
      .from(courseLessons)
      .where(eq(courseLessons.slug, r.from));
    if (!old) {
      alreadyApplied++;
      continue;
    }
    await db
      .update(courseLessons)
      .set({
        slug: r.to,
        ...(r.newTitle ? { title: r.newTitle } : {}),
        updatedAt: new Date(),
      })
      .where(eq(courseLessons.id, old.id));
    renamed++;
    console.log(`  rename "${r.from}" → "${r.to}"`);
  }
  console.log(`  renames: ${renamed} applied, ${alreadyApplied} already at target`);
}

// ── Lesson content updates ────────────────────────────────────────────
//
// Lessons start their life with placeholder content (above) on a fresh
// DB. As real lesson content lands per module (Batch 2.x), we drop
// markdown files at:
//   lib/db/content/<module-slug>/<lesson-slug>.md
//
// This pass walks every lesson slug in the catalog. If a content file
// exists for that slug, the script UPSERTs the row's content and
// updatedAt to match. Idempotent — re-running is a no-op when the
// file content matches what's already in the DB.
//
// Lessons whose content file does NOT exist are left untouched. The
// placeholder remains visible to the frontend. That's intentional:
// it makes it obvious which lessons still need content.
const CONTENT_ROOT = resolve(__dirname, "../content");

interface LessonContentFile {
  moduleSlug: string;
  lessonSlug: string;
  path: string;
}

function findLessonContentFile(
  moduleSlug: string,
  lessonSlug: string,
): LessonContentFile | null {
  const path = resolve(CONTENT_ROOT, moduleSlug, `${lessonSlug}.md`);
  if (!existsSync(path)) return null;
  return { moduleSlug, lessonSlug, path };
}

async function updateLessonContentFromFiles() {
  let updated = 0;
  let unchanged = 0;
  let missing = 0;
  for (const m of MODULES) {
    for (const l of m.lessons) {
      const file = findLessonContentFile(m.slug, l.slug);
      if (!file) {
        missing++;
        continue;
      }
      const fresh = readFileSync(file.path, "utf-8");

      const [row] = await db
        .select({ id: courseLessons.id, content: courseLessons.content })
        .from(courseLessons)
        .where(eq(courseLessons.slug, l.slug));
      if (!row) {
        // Lesson doesn't exist yet — seedLessons should have inserted
        // it, but guard against running this pass before that one.
        console.log(`  content "${l.slug}" — lesson row missing; run seedLessons first`);
        continue;
      }
      if (row.content === fresh) {
        unchanged++;
        continue;
      }
      await db
        .update(courseLessons)
        .set({ content: fresh, updatedAt: new Date() })
        .where(eq(courseLessons.id, row.id));
      updated++;
      console.log(`  content "${l.slug}" — updated (${fresh.length} chars)`);
    }
  }
  console.log(
    `  content: ${updated} updated, ${unchanged} unchanged, ${missing} still placeholder`,
  );
}

// ── Quiz questions ────────────────────────────────────────────────────
//
// Per-module question banks. Adds entries here as each module's content
// lands. Idempotent: if any question already exists for the target
// quiz, the entire bank is skipped (we don't reconcile field-by-field
// to avoid surprising in-place edits to live attempts' question text).
//
// To rewrite a question after launch: delete the row manually and
// re-run, or hand-write a one-off migration. The seed is for first
// load and additive bank growth, not for editorial revisions.
interface QuizQuestionSeed {
  questionText: string;
  optionA: string;
  optionB: string;
  optionC: string;
  optionD: string;
  correctOption: "a" | "b" | "c" | "d";
  explanation: string;
}

interface QuizBank {
  moduleSlug: string; // resolves to that module's quiz row
  questions: QuizQuestionSeed[];
}

const QUIZ_BANKS: QuizBank[] = [
  {
    moduleSlug: "foundation",
    questions: [
      {
        questionText: "Which of the following best matches the definition of \"story\" given in Lesson 1?",
        optionA: "A sequence of events presented in chronological order.",
        optionB: "A patterned sequence in which someone wants something, hits an obstacle, and is changed by what happens.",
        optionC: "A description of a memorable moment from a person's life.",
        optionD: "A made-up version of real events designed to entertain.",
        correctOption: "b",
        explanation:
          "A story isn't defined by being chronological (a) or memorable (c) or fictional (d). It's defined by the pattern of want, obstacle, and change. Without the pattern, what you have is a sequence, an anecdote, or a vignette — not a story.",
      },
      {
        questionText: "Lesson 2 argued that fiction does something arguments and non-fiction can't. Which best captures that thing?",
        optionA: "Fiction is more entertaining than non-fiction.",
        optionB: "Fiction is easier to remember than non-fiction.",
        optionC: "Fiction lets a reader practise being someone else by simulating their choices and emotions.",
        optionD: "Fiction reaches a wider audience because it doesn't require expertise.",
        correctOption: "c",
        explanation:
          "(a), (b), and (d) may be incidentally true, but the unique thing fiction does is provide rehearsal in another life — running the character's choices and feelings on the reader's own simulator. An argument can describe another life from the outside; fiction puts the reader inside it.",
      },
      {
        questionText: "A student tells you their idea is \"a man builds a robot.\" What's the most useful next move?",
        optionA: "Tell them the idea is too unoriginal to use.",
        optionB: "Tell them to expand it into a premise that adds character, situation, and tension.",
        optionC: "Tell them to find a less common idea.",
        optionD: "Tell them robots are overdone.",
        correctOption: "b",
        explanation:
          "Originality lives in execution, not in the idea (Lesson 3). The fix isn't a different idea — it's translating this idea into a premise that has someone with a felt want and a specific obstacle. \"A man builds a robot\" is a kernel; you can't write from a kernel, only from a premise.",
      },
      {
        questionText: "Which of these premises contains all three ingredients every story needs (a character to care about, a conflict, a change)?",
        optionA: "A widow inherits her husband's beehives.",
        optionB: "A widow inherits her husband's beehives, learns he kept them as a refuge from a marriage he was secretly leaving, and decides whether to forgive a dead man.",
        optionC: "A widow has hives in her backyard and writes about them in her journal.",
        optionD: "A widow remembers when her husband first showed her the hives.",
        correctOption: "b",
        explanation:
          "(a) is an idea, not yet a premise — no obstacle, no change. (c) is closer to a vignette. (d) is a memory. Only (b) has a character with a felt want (forgiveness or refusal), a specific obstacle (the discovery), and an implied change (whichever decision she lands on).",
      },
      {
        questionText: "A novel ends with the protagonist solving the murder but being exactly the same person they were on page one. According to Lesson 4, what is most likely missing?",
        optionA: "The character isn't likeable enough.",
        optionB: "The conflict wasn't dramatic enough.",
        optionC: "The change ingredient is absent — the situation changed but the character didn't.",
        optionD: "The plot was too short.",
        correctOption: "c",
        explanation:
          "(a) is irrelevant — characters don't need to be likeable to be cared-about (Macbeth, Ahab). (b) and (d) describe symptoms, not the underlying issue. The missing ingredient is change: the reader's payoff is supposed to be the difference between who-they-were and who-they-become. A solved mystery without a transformed solver is plot without story.",
      },
    ],
  },
  {
    moduleSlug: "architecture",
    questions: [
      {
        questionText: "Which of the following is closest to why the 3-act structure recurs across cultures?",
        optionA: "It was invented by Aristotle and adopted globally over 2,000 years.",
        optionB: "It is enforced by modern publishers who reject manuscripts that don't follow it.",
        optionC: "It is the minimum complete unit produced when a want/obstacle/change pattern is stretched across enough pages to fill a book.",
        optionD: "It is the easiest structure to teach in writing classes, so students keep encountering it.",
        correctOption: "c",
        explanation:
          "Aristotle observed the shape and Freytag drew it, but the pattern predates them and appears in cultures that never read either. (b) and (d) are downstream effects, not causes. The shape recurs because the human brain recognises it as a complete unit of meaning — anything shorter is truncated, anything longer drifts.",
      },
      {
        questionText: "A writer's draft has a clear inciting incident, rising complications, a strong climax, and a resolution. Beta readers say the middle \"sags.\" Per Lesson 1, what is the most likely missing element?",
        optionA: "The book is too long.",
        optionB: "The midpoint reversal is missing or weak — there's nothing in the middle of the middle that re-frames the obstacle.",
        optionC: "The protagonist is not likeable enough.",
        optionD: "The setting needs more sensory detail.",
        correctOption: "b",
        explanation:
          "\"Saggy middle\" is almost always a midpoint problem. Without a reversal, Act 2's complications stack linearly and the reader's pulse never rises. (a), (c), and (d) are common diagnostic distractors that don't address the structural cause.",
      },
      {
        questionText: "A novel about an orphan who leaves home, faces a series of trials, defeats a wrong, and returns to find that home no longer fits — but the protagonist on the last page is barely different from the one on the first. Which structure is the writer mostly using, and what's failing?",
        optionA: "The hero's journey, and the change beat is the missing one — the protagonist completed the external journey without internal transformation.",
        optionB: "A beat sheet, and the likability beat is missing.",
        optionC: "The 3-act structure, and the inciting incident is missing.",
        optionD: "None — the book doesn't follow any structure.",
        correctOption: "a",
        explanation:
          "The shape (Call → Tests → Ordeal → Return) is the hero's journey. What that pattern promises is transformation. If the protagonist hasn't changed, the pattern's payoff has been broken even though the pattern's beats are present. (b), (c), and (d) describe different problems.",
      },
      {
        questionText: "A writer planning a quiet literary novel about an aging professor remembering his marriage chooses to apply a 15-beat commercial beat sheet to plot it. Three months in, the draft feels mechanical. What does Lesson 4 say is most likely happening?",
        optionA: "The writer needs more beats — 15 isn't enough for a novel.",
        optionB: "Beat sheets only work for screenwriting; the writer should use the hero's journey instead.",
        optionC: "The story's engine is interiority and prose, not pacing — and the beat sheet is forcing inserted joints the story doesn't have to give.",
        optionD: "The writer is not skilled enough at beat-sheet writing yet.",
        correctOption: "c",
        explanation:
          "(a), (b), and (d) all suggest a different technique will fix it. Lesson 4's point is that some stories don't want any granular structural map; their engine is interiority. Forcing a beat sheet onto a prose-engine novel produces exactly the \"mechanical\" feeling the writer is reporting. The fix is to step away from the tool, not to apply it harder.",
      },
      {
        questionText: "A premise: a young woman, raised in isolation, discovers her mother's letters and decides whether to leave home and find the family she was hidden from. Which structure is most likely the right starting lens, and why?",
        optionA: "Beat sheets — the premise is about a clear external event (the discovery of letters), and beat sheets handle external events well.",
        optionB: "The hero's journey — the engine is transformation (a young woman becoming someone capable of leaving), and the Call/Refusal/Tests/Return pattern matches the implied arc.",
        optionC: "None — the premise is too literary for any structural lens.",
        optionD: "The 3-act structure — the premise has an inciting incident and a clear lock-in, which is enough.",
        correctOption: "b",
        explanation:
          "The premise has a clear protagonist with a transformation arc (isolation → agency). The hero's journey will tell the writer why each beat matters in a way the 3-act lens can't, because the deepest question the story is asking is \"who does she have to become to leave?\" — that's a transformation question. (a) misreads the engine; the external events serve the change, not the other way around. (c) overstates the literariness of a story with a strong external decision. (d) is true but less informative — most stories have 3-act underneath, but the hero's journey is the lens that explains this premise's specific gravity.",
      },
    ],
  },
  {
    moduleSlug: "characters",
    questions: [
      {
        questionText: "Which of the following best matches the wound/want/need framework from Lesson 1?",
        optionA: "The wound is what the character feels generally; the want is their preference; the need is their goal.",
        optionB: "The wound is a specific past event; the want is what the character can name in a sentence; the need is what they actually require for the story to resolve, which is rarely the same as the want.",
        optionC: "The wound is whatever the protagonist has trauma about; the want is the antagonist's goal; the need is the climax.",
        optionD: "The wound, the want, and the need are three names for the same thing — what motivates the protagonist.",
        correctOption: "b",
        explanation:
          "Lesson 1's framework is precise. (a) generalises the wound (it's a moment, not a feeling). (c) garbles the antagonist's role. (d) collapses three distinct concepts. Only (b) keeps the three layered: an event, a sentence-level pursuit, and an underlying requirement the character usually doesn't see.",
      },
      {
        questionText: "A writer's draft opens with a five-page flashback to the protagonist's childhood, intended to give the reader context for the present-day chapter that follows. According to Lesson 2, what's most likely happening?",
        optionA: "The opening is good — readers need context before they can care about a protagonist.",
        optionB: "The opening is a backstory dump that moves the reader backward in time before they have a reason to care; the same context could likely land in single-sentence revelations across the first three chapters.",
        optionC: "The opening should be longer to give more context.",
        optionD: "The opening should be cut entirely; backstory has no place in fiction.",
        correctOption: "b",
        explanation:
          "(a) misreads how readers form investment — care comes from the want on page one, not from background. (c) makes the failure mode worse. (d) overcorrects. (b) is the L2 diagnosis: backstory dumps move the reader backward before they're invested; the cure is revelation, not removal.",
      },
      {
        questionText: "A writer drafts an antagonist whose only motivation is \"she wants to ruin Sarah's life because she's jealous.\" Per Lesson 3, what is the most useful next step?",
        optionA: "Add more obstacles in the antagonist's way to make her seem stronger.",
        optionB: "Make the antagonist evil instead of merely jealous, since evil is a stronger motive.",
        optionC: "Build the antagonist's wound and want with the same tools you used for Sarah, then write a paragraph from her point of view in which she explains why she is right.",
        optionD: "Cut the antagonist; an unsympathetic antagonist hurts the book.",
        correctOption: "c",
        explanation:
          "(a) addresses a different problem (obstacle weakness, not character depth). (b) misreads when evil works — evil is a choice for mythic-scale antagonists, not a default upgrade. (d) is wrong; the protagonist needs an opponent. (c) is L3's specific instruction: mirror the protagonist's framework on the antagonist, then test by writing the antagonist's case in their own voice.",
      },
      {
        questionText: "A draft has fourteen named supporting characters. Two of them — a quirky bookshop owner and a quirky archivist — both deliver historical research to the protagonist at separate points. Per Lesson 4, what is the most useful move?",
        optionA: "Add more distinguishing traits to each so readers can tell them apart.",
        optionB: "Cut both and have the protagonist do the research themselves.",
        optionC: "Merge them into one character whose function is \"researcher who helps the protagonist,\" then give that single character two unrelated traits to make them dimensional.",
        optionD: "Keep both; supporting cast is supposed to feel populated.",
        correctOption: "c",
        explanation:
          "(a) treats the symptom (confusion) without addressing the cause (redundant function). (b) loses a useful structural role. (d) ignores the cognitive load problem. (c) is L4's prescription: same function = merge candidates; the merger ends up richer than either original.",
      },
      {
        questionText: "A writer reads back a scene of dialogue between their protagonist and antagonist. Both characters' lines could be spoken by the other without changing meaning. Per Lesson 5, what is most likely happening, and what's the diagnostic move?",
        optionA: "The scene is well-balanced; matching dialogue between rivals is a sign of equal stature.",
        optionB: "Voice differentiation is failing because the two characters are not yet rooted in distinct wounds — voice rises from what each character protects, and undifferentiated voices usually mean undifferentiated interiors.",
        optionC: "The scene needs more dialogue tags so the reader can tell who's speaking.",
        optionD: "The scene needs more quirks (a stutter, a catchphrase) for each character.",
        correctOption: "b",
        explanation:
          "(a) misreads \"balanced\" as equivalence. (c) is a workaround that papers over the root cause. (d) confuses surface decoration with structural voice — quirks the reader notices once and ignores. (b) is L5's diagnosis: real voice differentiation is downstream of distinct interior architecture (wound, want), and the cure is in the character work, not in the dialogue itself.",
      },
    ],
  },
];

async function seedQuizQuestions(slugToId: Map<string, number>) {
  let inserted = 0;
  let skippedBanks = 0;
  for (const bank of QUIZ_BANKS) {
    const moduleId = slugToId.get(bank.moduleSlug);
    if (!moduleId) {
      throw new Error(`QUIZ_BANKS: module "${bank.moduleSlug}" not in catalog`);
    }
    const [quiz] = await db
      .select({ id: courseQuizzes.id })
      .from(courseQuizzes)
      .where(
        and(eq(courseQuizzes.moduleId, moduleId), eq(courseQuizzes.type, "module")),
      );
    if (!quiz) {
      throw new Error(`QUIZ_BANKS: no module quiz row for "${bank.moduleSlug}"`);
    }

    const existing = await db
      .select({ id: courseQuizQuestions.id })
      .from(courseQuizQuestions)
      .where(eq(courseQuizQuestions.quizId, quiz.id));
    if (existing.length > 0) {
      skippedBanks++;
      console.log(
        `  questions for "${bank.moduleSlug}" already present (${existing.length}) — skip`,
      );
      continue;
    }

    for (let i = 0; i < bank.questions.length; i++) {
      const q = bank.questions[i];
      await db.insert(courseQuizQuestions).values({
        quizId: quiz.id,
        questionText: q.questionText,
        optionA: q.optionA,
        optionB: q.optionB,
        optionC: q.optionC,
        optionD: q.optionD,
        correctOption: q.correctOption,
        explanation: q.explanation,
        order: i + 1,
      });
      inserted++;
    }
    console.log(`  questions for "${bank.moduleSlug}" inserted (${bank.questions.length})`);
  }
  console.log(`  quiz questions: ${inserted} inserted, ${skippedBanks} bank(s) already present`);
}

// ── Main ───────────────────────────────────────────────────────────────
async function main() {
  console.log("Seeding writing course (modules → renames → lessons → quizzes → content → questions)...");
  const slugToId = await seedModules();
  // Renames must run BEFORE seedLessons. Otherwise seedLessons sees a
  // catalog slug it doesn't recognise in the DB (because the DB still
  // has the old slug) and tries to INSERT a new row at the same
  // (moduleId, orderInModule) position — which the unique index on
  // course_lessons blocks. Renaming first turns the existing row into
  // the new slug, then seedLessons skips it as already-present.
  await applyLessonRenames();
  await seedLessons(slugToId);
  await seedQuizzes(slugToId);
  await updateLessonContentFromFiles();
  await seedQuizQuestions(slugToId);
  console.log("Done.");
}

main()
  .then(() => pool.end().then(() => process.exit(0)))
  .catch((err) => {
    console.error("Seed failed:", err);
    pool.end().finally(() => process.exit(1));
  });
