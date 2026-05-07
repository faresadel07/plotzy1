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
  courseContentTranslations,
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
          "A story isn't defined by being chronological (a) or memorable (c) or fictional (d). It's defined by the pattern of want, obstacle, and change. Without the pattern, what you have is a sequence, an anecdote, or a vignette, not a story.",
      },
      {
        questionText: "Lesson 2 argued that fiction does something arguments and non-fiction can't. Which best captures that thing?",
        optionA: "Fiction is more entertaining than non-fiction.",
        optionB: "Fiction is easier to remember than non-fiction.",
        optionC: "Fiction lets a reader practise being someone else by simulating their choices and emotions.",
        optionD: "Fiction reaches a wider audience because it doesn't require expertise.",
        correctOption: "c",
        explanation:
          "(a), (b), and (d) may be incidentally true, but the unique thing fiction does is provide rehearsal in another life, running the character's choices and feelings on the reader's own simulator. An argument can describe another life from the outside; fiction puts the reader inside it.",
      },
      {
        questionText: "A student tells you their idea is \"a man builds a robot.\" What's the most useful next move?",
        optionA: "Tell them the idea is too unoriginal to use.",
        optionB: "Tell them to expand it into a premise that adds character, situation, and tension.",
        optionC: "Tell them to find a less common idea.",
        optionD: "Tell them robots are overdone.",
        correctOption: "b",
        explanation:
          "Originality lives in execution, not in the idea (Lesson 3). The fix isn't a different idea: it's translating this idea into a premise that has someone with a felt want and a specific obstacle. \"A man builds a robot\" is a kernel; you can't write from a kernel, only from a premise.",
      },
      {
        questionText: "Which of these premises contains all three ingredients every story needs (a character to care about, a conflict, a change)?",
        optionA: "A widow inherits her husband's beehives.",
        optionB: "A widow inherits her husband's beehives, learns he kept them as a refuge from a marriage he was secretly leaving, and decides whether to forgive a dead man.",
        optionC: "A widow has hives in her backyard and writes about them in her journal.",
        optionD: "A widow remembers when her husband first showed her the hives.",
        correctOption: "b",
        explanation:
          "(a) is an idea, not yet a premise, no obstacle, no change. (c) is closer to a vignette. (d) is a memory. Only (b) has a character with a felt want (forgiveness or refusal), a specific obstacle (the discovery), and an implied change (whichever decision she lands on).",
      },
      {
        questionText: "A novel ends with the protagonist solving the murder but being exactly the same person they were on page one. According to Lesson 4, what is most likely missing?",
        optionA: "The character isn't likeable enough.",
        optionB: "The conflict wasn't dramatic enough.",
        optionC: "The change ingredient is absent: the situation changed but the character didn't.",
        optionD: "The plot was too short.",
        correctOption: "c",
        explanation:
          "(a) is irrelevant: characters don't need to be likeable to be cared-about (Macbeth, Ahab). (b) and (d) describe symptoms, not the underlying issue. The missing ingredient is change: the reader's payoff is supposed to be the difference between who-they-were and who-they-become. A solved mystery without a transformed solver is plot without story.",
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
          "Aristotle observed the shape and Freytag drew it, but the pattern predates them and appears in cultures that never read either. (b) and (d) are downstream effects, not causes. The shape recurs because the human brain recognises it as a complete unit of meaning, anything shorter is truncated, anything longer drifts.",
      },
      {
        questionText: "A writer's draft has a clear inciting incident, rising complications, a strong climax, and a resolution. Beta readers say the middle \"sags.\" Per Lesson 1, what is the most likely missing element?",
        optionA: "The book is too long.",
        optionB: "The midpoint reversal is missing or weak: there's nothing in the middle of the middle that re-frames the obstacle.",
        optionC: "The protagonist is not likeable enough.",
        optionD: "The setting needs more sensory detail.",
        correctOption: "b",
        explanation:
          "\"Saggy middle\" is almost always a midpoint problem. Without a reversal, Act 2's complications stack linearly and the reader's pulse never rises. (a), (c), and (d) are common diagnostic distractors that don't address the structural cause.",
      },
      {
        questionText: "A novel about an orphan who leaves home, faces a series of trials, defeats a wrong, and returns to find that home no longer fits, but the protagonist on the last page is barely different from the one on the first. Which structure is the writer mostly using, and what's failing?",
        optionA: "The hero's journey, and the change beat is the missing one: the protagonist completed the external journey without internal transformation.",
        optionB: "A beat sheet, and the likability beat is missing.",
        optionC: "The 3-act structure, and the inciting incident is missing.",
        optionD: "None: the book doesn't follow any structure.",
        correctOption: "a",
        explanation:
          "The shape (Call → Tests → Ordeal → Return) is the hero's journey. What that pattern promises is transformation. If the protagonist hasn't changed, the pattern's payoff has been broken even though the pattern's beats are present. (b), (c), and (d) describe different problems.",
      },
      {
        questionText: "A writer planning a quiet literary novel about an aging professor remembering his marriage chooses to apply a 15-beat commercial beat sheet to plot it. Three months in, the draft feels mechanical. What does Lesson 4 say is most likely happening?",
        optionA: "The writer needs more beats: 15 isn't enough for a novel.",
        optionB: "Beat sheets only work for screenwriting; the writer should use the hero's journey instead.",
        optionC: "The story's engine is interiority and prose, not pacing, and the beat sheet is forcing inserted joints the story doesn't have to give.",
        optionD: "The writer is not skilled enough at beat-sheet writing yet.",
        correctOption: "c",
        explanation:
          "(a), (b), and (d) all suggest a different technique will fix it. Lesson 4's point is that some stories don't want any granular structural map; their engine is interiority. Forcing a beat sheet onto a prose-engine novel produces exactly the \"mechanical\" feeling the writer is reporting. The fix is to step away from the tool, not to apply it harder.",
      },
      {
        questionText: "A premise: a young woman, raised in isolation, discovers her mother's letters and decides whether to leave home and find the family she was hidden from. Which structure is most likely the right starting lens, and why?",
        optionA: "Beat sheets: the premise is about a clear external event (the discovery of letters), and beat sheets handle external events well.",
        optionB: "The hero's journey: the engine is transformation (a young woman becoming someone capable of leaving), and the Call/Refusal/Tests/Return pattern matches the implied arc.",
        optionC: "None: the premise is too literary for any structural lens.",
        optionD: "The 3-act structure: the premise has an inciting incident and a clear lock-in, which is enough.",
        correctOption: "b",
        explanation:
          "The premise has a clear protagonist with a transformation arc (isolation → agency). The hero's journey will tell the writer why each beat matters in a way the 3-act lens can't, because the deepest question the story is asking is \"who does she have to become to leave?\": that's a transformation question. (a) misreads the engine; the external events serve the change, not the other way around. (c) overstates the literariness of a story with a strong external decision. (d) is true but less informative, most stories have 3-act underneath, but the hero's journey is the lens that explains this premise's specific gravity.",
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
        optionD: "The wound, the want, and the need are three names for the same thing: what motivates the protagonist.",
        correctOption: "b",
        explanation:
          "Lesson 1's framework is precise. (a) generalises the wound (it's a moment, not a feeling). (c) garbles the antagonist's role. (d) collapses three distinct concepts. Only (b) keeps the three layered: an event, a sentence-level pursuit, and an underlying requirement the character usually doesn't see.",
      },
      {
        questionText: "A writer's draft opens with a five-page flashback to the protagonist's childhood, intended to give the reader context for the present-day chapter that follows. According to Lesson 2, what's most likely happening?",
        optionA: "The opening is good, readers need context before they can care about a protagonist.",
        optionB: "The opening is a backstory dump that moves the reader backward in time before they have a reason to care; the same context could likely land in single-sentence revelations across the first three chapters.",
        optionC: "The opening should be longer to give more context.",
        optionD: "The opening should be cut entirely; backstory has no place in fiction.",
        correctOption: "b",
        explanation:
          "(a) misreads how readers form investment: care comes from the want on page one, not from background. (c) makes the failure mode worse. (d) overcorrects. (b) is the L2 diagnosis: backstory dumps move the reader backward before they're invested; the cure is revelation, not removal.",
      },
      {
        questionText: "A writer drafts an antagonist whose only motivation is \"she wants to ruin Sarah's life because she's jealous.\" Per Lesson 3, what is the most useful next step?",
        optionA: "Add more obstacles in the antagonist's way to make her seem stronger.",
        optionB: "Make the antagonist evil instead of merely jealous, since evil is a stronger motive.",
        optionC: "Build the antagonist's wound and want with the same tools you used for Sarah, then write a paragraph from her point of view in which she explains why she is right.",
        optionD: "Cut the antagonist; an unsympathetic antagonist hurts the book.",
        correctOption: "c",
        explanation:
          "(a) addresses a different problem (obstacle weakness, not character depth). (b) misreads when evil works: evil is a choice for mythic-scale antagonists, not a default upgrade. (d) is wrong; the protagonist needs an opponent. (c) is L3's specific instruction: mirror the protagonist's framework on the antagonist, then test by writing the antagonist's case in their own voice.",
      },
      {
        questionText: "A draft has fourteen named supporting characters. Two of them, a quirky bookshop owner and a quirky archivist, both deliver historical research to the protagonist at separate points. Per Lesson 4, what is the most useful move?",
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
        optionB: "Voice differentiation is failing because the two characters are not yet rooted in distinct wounds: voice rises from what each character protects, and undifferentiated voices usually mean undifferentiated interiors.",
        optionC: "The scene needs more dialogue tags so the reader can tell who's speaking.",
        optionD: "The scene needs more quirks (a stutter, a catchphrase) for each character.",
        correctOption: "b",
        explanation:
          "(a) misreads \"balanced\" as equivalence. (c) is a workaround that papers over the root cause. (d) confuses surface decoration with structural voice, quirks the reader notices once and ignores. (b) is L5's diagnosis: real voice differentiation is downstream of distinct interior architecture (wound, want), and the cure is in the character work, not in the dialogue itself.",
      },
    ],
  },
  {
    moduleSlug: "world",
    questions: [
      {
        questionText: "A draft has a chapter where the protagonist's three-month grief is rendered scene by scene across forty pages. The pacing is slow; readers are losing patience. Per Lesson 1, what is the most likely diagnosis?",
        optionA: "The grief isn't intense enough; the writer should add more emotional language.",
        optionB: "The chapter is over-showing, three months of fictional time is a candidate for telling; the chapter could be a single paragraph that summarises the grief, with one or two key shown moments embedded in the summary.",
        optionC: "The chapter needs more dialogue.",
        optionD: "The chapter should be cut entirely; grief has no place in fiction.",
        correctOption: "b",
        explanation:
          "(a) misreads the symptom. (c) is a workaround that doesn't address the cause. (d) overcorrects. (b) is L1's diagnosis: the writer is showing something that should be told, three months of similar emotional content is precisely what telling exists for. The cure is summary plus one or two key shown moments, not more showing.",
      },
      {
        questionText: "A scene has been written with rich visual detail across two pages. Beta readers say the scene \"feels flat\" but can't say why. According to Lesson 2, what is most likely missing?",
        optionA: "The scene needs more dialogue.",
        optionB: "The scene engages only one sense, usually vision, and the reader experiences it as flat because real attention is multi-sensory; adding even one phrase from another sense (a smell, a sound) usually doubles the scene's grip without adding noticeable length.",
        optionC: "The scene is too long and should be cut.",
        optionD: "The scene needs more characters.",
        correctOption: "b",
        explanation:
          "(a), (c), and (d) all guess at structural fixes. (b) is L2's specific diagnosis: the visual default is the most common reason a scene \"feels flat.\" A single phrase from a second sense, the faint smell of cigarette smoke that shouldn't have been there, usually fixes the flatness without lengthening the scene meaningfully.",
      },
      {
        questionText: "A novel's setting is described lavishly throughout, five sentences per room, weather noted at the start of every chapter. Per Lesson 3, what is most likely happening?",
        optionA: "The setting is doing character work; the elevation is appropriate.",
        optionB: "The world has become too detailed for the story to breathe inside it; the reader is reading a setting catalogue rather than a novel, and the cure is to identify which specific details are load-bearing and cut the rest.",
        optionC: "The setting needs even more detail to fully come alive.",
        optionD: "The novel needs a more interesting protagonist.",
        correctOption: "b",
        explanation:
          "(a) is the writer's hope; (c) makes the failure worse; (d) misdirects. (b) is L3's diagnosis: setting elevation works through a few perfect details, not through pervasive lavishness. When every room gets five sentences, the real load-bearing rooms lose their weight: there's no contrast to mark them as special.",
      },
      {
        questionText: "A writer's chapter opens with: \"The fog was thick, the city alive and watching, the streets a being unto themselves.\" Per Lesson 3's discussion of pretentiousness, what's the diagnostic move?",
        optionA: "Make the prose more poetic: the writer is on the right track.",
        optionB: "Replace the abstract claims with a single concrete detail that shows the same thing, for instance, On the third day in the city, he noticed that the bus drivers all knew each other's first names, and none of them used his.",
        optionC: "Cut the opening entirely; openings should be action-only.",
        optionD: "Add more setting description to support the abstract claims.",
        correctOption: "b",
        explanation:
          "(a) doubles the failure. (c) overcorrects. (d) makes the failure worse. (b) is L3's specific cure: the failure mode of \"setting as character\" is the abstract claim; the fix is a concrete detail that does the same work without telling the reader what to feel.",
      },
      {
        questionText: "A first draft is 130,000 words. Beta readers say the prose is \"good but slow.\" The writer is unwilling to cut scenes. Per Module 4, what is the most efficient first cut?",
        optionA: "Cut every scene by twenty percent uniformly.",
        optionB: "Apply the load-bearing-detail test to all description: keep what tells the reader about the character, sets up later moments, or carries atmosphere; cut everything else, including descriptions the writer is fond of.",
        optionC: "Cut every chapter's first paragraph.",
        optionD: "Cut all dialogue tags.",
        correctOption: "b",
        explanation:
          "(a) is unspecific and damages good scenes. (c) is a stylistic gimmick. (d) is irrelevant. (b) is L4's prescription, which the module has been building toward: the cure for \"good but slow\" first drafts is almost always to cut description that doesn't do work. The cuts feel like losses; they are concentrations. A 130,000-word draft that has had this pass usually loses 15,000-25,000 words and gains pace at every scale.",
      },
    ],
  },
  {
    moduleSlug: "writing-process",
    questions: [
      {
        questionText: "A writer sits at the same blank chapter for three days. Each session, they produce nothing. Per Lesson 1, what is most likely happening, and what's the diagnostic move?",
        optionA: "The writer is blocked; they should take a long break.",
        optionB: "The writer is probably not blocked in the fear/perfectionism sense, three days of producing nothing on the same scene usually means the scene doesn't have a clear function yet, and the cure is to leave the page and ask of the scene: what does the protagonist want here, what's in the way, what changes by the end?",
        optionC: "The writer should write through it with longer sessions.",
        optionD: "The writer should give up the project.",
        correctOption: "b",
        explanation:
          "(a) and (d) overcorrect. (c) treats the symptom without the diagnosis. (b) is L1's specific diagnosis: the four causes are fear, perfectionism, unclear premise, and no plan. Same scene, three days almost always means the fourth, no plan. The cure is at outline level, not at typing level.",
      },
      {
        questionText: "A writer's first draft has been going well for six weeks, then stalls. They notice they've started re-reading yesterday's pages before adding new ones, fixing sentences as they go. Per Lesson 2, what is most likely happening?",
        optionA: "The draft is failing; they should start over.",
        optionB: "Editor-mode has begun running during writer-mode, slowing the writing past the rate at which the book gets finished: the cure is to stop re-reading yesterday's pages and to forbid in-draft editing until the first draft is complete.",
        optionC: "The writer needs more inspiration.",
        optionD: "The writer should outline more thoroughly.",
        correctOption: "b",
        explanation:
          "(a) misreads the symptom. (c) is vague. (d) is unrelated to the specific failure mode. (b) is L2's specific diagnosis: editing as you go is the most common reason a sustained first draft stalls. The cure is the separation of writer-mode and editor-mode, editor-mode comes back at revision.",
      },
      {
        questionText: "A writer has finished a first draft and spends three months polishing the prose chapter by chapter. At the end of three months, they realise chapters 4-6 don't belong in the book and need to be cut. According to Lesson 3, what is the lesson?",
        optionA: "Always start with a more detailed outline.",
        optionB: "Revision should never include cuts at the structural level.",
        optionC: "Pass 1 (structural) must come before Pass 3 (line-level); polishing prose in chapters that will be cut is wasted work, which is exactly the failure mode L3 prescribes the three-pass order to prevent.",
        optionD: "The writer should hire an editor sooner.",
        correctOption: "c",
        explanation:
          "(a) is irrelevant to the revision question. (b) is the opposite of the truth. (d) is a workaround. (c) is L3's specific lesson: the three passes are structural → scene → line, in that order. Polish before structure means the writer polishes scenes that won't survive the structural pass. Three months of wasted work is the canonical example.",
      },
      {
        questionText: "A writer's checklist has thirty items, including \"use vivid verbs,\" \"be original,\" and \"make the reader feel something.\" Per Lesson 4, what is wrong with this checklist?",
        optionA: "Thirty items is too few; checklists should have at least fifty items.",
        optionB: "The items are not actionable: they describe outcomes (vivid, original, feel something) rather than specific things the writer can check on the page; an actionable checklist asks yes/no questions tied to specific craft moves, with a one-sentence why per item.",
        optionC: "The items are too specific; checklists should be general guidance only.",
        optionD: "Checklists are unnecessary; trust your instincts.",
        correctOption: "b",
        explanation:
          "(a) misreads the failure mode. (c) is the opposite of the lesson. (d) abandons the lesson entirely. (b) is L4's specific point: a checklist with vague outcome-items can't be applied. \"Use vivid verbs\" doesn't tell you what to look for; \"Are dialogue tags mostly 'said'?\" does, and the why (the eye doesn't trip on said) lets the writer adapt the rule.",
      },
      {
        questionText: "A writer is on revision pass nine. They moved a comma in chapter five last Tuesday; this Tuesday they moved it back. Three beta readers have read the latest draft and none of them have structural notes. Per Lesson 5, what is most likely true, and what's the move?",
        optionA: "The book isn't ready; the writer should keep revising until they don't move the comma back and forth.",
        optionB: "The book is past the point of useful revision: the comma being moved back and forth is one of the three signs of done, the absence of structural beta-reader notes is another, and the cure for over-revising one book is to start the next.",
        optionC: "The book needs more beta readers.",
        optionD: "The book needs a developmental edit.",
        correctOption: "b",
        explanation:
          "(a) inverts the diagnostic. (c) treats noise as the cure to clarity. (d) is a workaround that doesn't address the question of when to stop. (b) is L5's specific diagnosis: moving commas back and forth and no structural notes from readers are two of the three signs of done. The remedy is the next-book remedy. The current book is shippable.",
      },
    ],
  },
  {
    moduleSlug: "publishing",
    questions: [
      {
        questionText: "A writer has just finished a literary debut novel. They have no series in mind for the next decade; they want feedback from professional editors; they are willing to wait two to three years for shelf presence. Per Lesson 1, which path most likely fits?",
        optionA: "Self-publishing: the speed is essential.",
        optionB: "Traditional publishing: the manuscript benefits from the editorial infrastructure, and the slow timeline doesn't conflict with the writer's situation.",
        optionC: "The hybrid path, release the same book through both channels simultaneously.",
        optionD: "Don't publish at all; the literary market is too crowded.",
        correctOption: "b",
        explanation:
          "(a) misreads the situation: the writer doesn't need speed. (c) is not a real option (the same book can't be released through both at once). (d) is defeatist and irrelevant. (b) matches L1's diagnostic: the literary debut is exactly the kind of book that benefits from traditional infrastructure (credibility, awards eligibility, editorial work), and the writer's willingness to wait removes the path's main cost.",
      },
      {
        questionText: "A self-published thriller has a beautiful, atmospheric, hand-painted cover featuring a stormy moor. Sales are weak. Per Lesson 2, what is most likely happening, and what's the first move?",
        optionA: "The book needs more advertising.",
        optionB: "The cover is signalling the wrong genre, atmospheric moors signal literary or gothic fiction, not thriller; a reader scanning thriller bestsellers won't recognise the book as their genre and won't stop on it. The first move is a new cover that uses thriller conventions.",
        optionC: "The cover is too professional, readers want amateur charm.",
        optionD: "Self-published thrillers don't sell; the writer should switch genres.",
        correctOption: "b",
        explanation:
          "(a) treats the symptom without the diagnosis. (c) is the opposite of L2's claim. (d) overcorrects. (b) is L2's specific point: cover signals genre in 1.5 seconds. A beautiful cover that signals the wrong genre is a sales-loss the writer cannot fix with marketing budget: it has to be fixed at the cover.",
      },
      {
        questionText: "A writer has 30,000 followers on a social platform but no email newsletter. Their first book launches next month. Per Lesson 3, what's the realistic audience for the launch?",
        optionA: "About 30,000: that's the follower count.",
        optionB: "Almost zero: followers are not an audience the writer can reach reliably; the launch is happening to strangers, and the cure for next time is to start a newsletter today and move whatever fraction of those followers convert.",
        optionC: "About 3,000, roughly 10% of followers will see the post.",
        optionD: "The audience size is irrelevant; the book sells itself.",
        correctOption: "b",
        explanation:
          "(a) misreads followers as readers. (c) is generous given current algorithmic reach for organic posts. (d) is wishful. (b) is L3's specific diagnosis: the difference between rented attention (followers) and owned audience (newsletter list) is exactly the difference between a launch that has momentum and one that doesn't. The cure is structural, start the list now, and the writer should accept that this launch will under-perform what a list-based launch would do.",
      },
      {
        questionText: "A first-time author plans these launch tactics: (1) cold social media posts, (2) paid ads with no retargeting infrastructure, (3) a blog tour across small writing blogs, (4) asking ten beta readers for honest reviews. Per Lesson 4, which is the only honest tactic in the list?",
        optionA: "Cold social media posts: they reach the most people.",
        optionB: "Paid ads: they're scalable.",
        optionC: "Blog tours: they build relationships with reviewers.",
        optionD: "Asking beta readers for honest reviews, direct, transparent, targets readers who have already engaged with the work.",
        correctOption: "d",
        explanation:
          "(a), (b), and (c) are L4's three tactics that don't work for first-time authors: each treats strangers as the launch audience. (d) is one of L4's three honest tactics: a small number of thoughtful reviews from readers who already engaged with the work changes discoverability in a way that cold tactics cannot. The contrast is between strangers (don't convert) and engaged readers (do).",
      },
      {
        questionText: "A writer's first book launched eight weeks ago. Sales have slowed dramatically. They check sales daily, refresh reviews hourly, and have written nothing of book 2 in the last month. Per Lesson 5, what is happening, and what's the diagnostic move?",
        optionA: "The book is failing; the writer should pull it from sale.",
        optionB: "The post-launch slump is normal and predictable; the writer is in the slump and has not started book 2, so the daily-checking has become the symptom: the cure is the same daily-wordcount habit from M5 (now applied to book 2), because most writers who don't finish book 2 stopped at exactly this stage.",
        optionC: "The writer should hire a marketing consultant.",
        optionD: "The writer should rewrite book 1 and re-launch.",
        correctOption: "b",
        explanation:
          "(a) misreads normal pattern as failure. (c) treats the symptom (slow sales) without addressing the cause (no book 2 in progress). (d) is wasted effort on a published book. (b) is L5's specific diagnosis: the post-launch slump is predictable; the danger is that the slump plus not-starting-book-2 becomes the moment a career ends. The cure is the next-book remedy from M5 L5, applied here as a survival mechanism for the launch slump.",
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

// ── Final exam question bank (40 questions) ───────────────────────────
//
// Seeded into the final-exam quiz row (type='final', module_id=NULL).
// Order is preserved into the question.order column; the public API
// serves questions in `order` ascending, so the student experiences
// the exam in this exact sequence.
//
// Sequencing (per Batch 3.1 Phase B spec):
//   - Grouped by module: M1 → M6, then cross-module synthesis at end.
//   - Within each module: applied → recall → synthesis. (Concrete
//     diagnosis → conceptual identification → multi-lesson integration.)
//   - Within each (module, type) bucket: the 8 originally-approved
//     samples come first, then the 32 questions added in this batch.
//
// Distribution: 22 applied + 11 recall + 7 synthesis = 40.
// Per-module: M1=6, M2=6, M3=7, M4=6, M5=7, M6=5, cross=3.
// Time limit: 60 minutes (configured on the quiz row, not here).
const FINAL_EXAM_QUESTIONS: QuizQuestionSeed[] = [
  // ═══ M1 — Foundation (6: 3 applied + 2 recall + 1 synthesis) ═══

  // 1 — applied — chronicle vs story
  {
    questionText:
      "An aspiring novelist writes: \"Maya's grandfather died when she was twelve. After his funeral she moved in with her aunt. Years later she became a chef.\" She asks why this opening, despite covering significant events, feels lifeless to early readers. What single diagnostic move best identifies what's wrong?",
    optionA: "Mark every sentence with the dominant verb tense; the lifelessness is a tense-mixing problem.",
    optionB: "Underline each event and ask \"what does the next event CAUSE in Maya?\", if no event causes the next, you have a chronicle, not a story.",
    optionC: "Count the proper nouns; an opening with this many names confuses readers.",
    optionD: "Replace each abstract noun with a concrete one; lifeless prose is almost always abstract-noun heavy.",
    correctOption: "b",
    explanation:
      "M1 L1's central distinction. A chronicle lists events in time; a story is events bound by causation in a character whose desire makes them resist or pursue. The diagnostic, does the next event happen BECAUSE of the previous, is the lesson's most usable working definition.",
  },

  // 2 — applied — finding the idea (raw material vs question)
  {
    questionText:
      "A writer pitches a memoir-novel about her grandmother's emigration. She has thirty pages of family research, photos, letters, and a clear chronological arc. After six months she still cannot start. She says: \"I have everything I need. I just don't know what it's about.\" What does the lesson on finding the idea suggest she's missing?",
    optionA: "A working title; without one, novelists drift through scenes without an organizing label.",
    optionB: "A daily writing routine; the block is procedural, not conceptual.",
    optionC: "A central question the book is asking that the research is in service of; without that, \"everything I need\" is everything except the thing.",
    optionD: "A first chapter; once the opening exists, the book unblocks itself.",
    correctOption: "c",
    explanation:
      "M1 L3 separates raw material from idea. Material is what you have; the idea is the question the material is in service of. Thirty pages of research with no working question is the canonical pre-writing block: the lesson names this exact pattern and offers the question-finding exercise as the unblock.",
  },

  // 3 — applied — three ingredients / the missing change beat
  {
    questionText:
      "A workshop reader gives this feedback on a draft chapter: \"It's beautifully written. The character is vivid. The setting is rich. But I can't tell you what the chapter is FOR.\" What does the three-ingredients framework suggest is absent?",
    optionA: "A protagonist with a clear external goal in the chapter, writing without a goal in scene reads as decorative.",
    optionB: "A turning point, even rich, vivid writing without a moment of change reads as a sketch, not a chapter.",
    optionC: "Sensory grounding in a specific physical location, \"rich setting\" without one anchored sense reads as scenery, not place.",
    optionD: "A second character to bounce against, solo chapters need either change or company to feel chaptered.",
    correctOption: "b",
    explanation:
      "M1 L4 names three things every story unit needs: a desire-bearing character, a force resisting them, and a moment of change that could not have been predicted. The reader's \"for what\" question almost always points at the missing third, change. Vividness without change reads as a sketch.",
  },

  // 4 — recall (Sample 3) — plot vs story vs anecdote
  {
    questionText:
      "Module 1 distinguishes between plot, story, and anecdote. Which of the following best captures the difference?",
    optionA: "Plot is the sequence of events; story is the causal-emotional structure under that sequence; an anecdote is a small story that contains the parts (want, obstacle, change) at paragraph scale.",
    optionB: "Plot is what happens; story is what the writer intended; an anecdote is a true story.",
    optionC: "The three are synonyms for the same thing.",
    optionD: "Plot is for novels; story is for short fiction; an anecdote is for non-fiction.",
    correctOption: "a",
    explanation:
      "M1 L1 defines plot as the sequence (\"the king died, then the queen died\"), story as the causal-emotional structure (\"the king died, and then the queen died of grief\"), and anecdote as a small story complete in a paragraph.",
  },

  // 5 — recall — pleasures (moved + recognition)
  {
    questionText:
      "The lesson on why people read distinguishes two pleasures readers seek from fiction: the pleasure of being moved (something the reader's life cannot easily provide) and the pleasure of recognition (seeing one's inner life named accurately by someone else). Which statement most accurately reflects how the lesson positions these two pleasures relative to one another?",
    optionA: "Recognition is the lower pleasure; being moved is the higher one, readers grow into the higher one as they mature.",
    optionB: "The two pleasures are roughly equal in weight, and most enduring books reach for both: neither is sufficient alone.",
    optionC: "Being moved is what readers SAY they want; recognition is what actually keeps them returning to a writer.",
    optionD: "Recognition is a side effect; books don't aim for it but it happens when the prose is honest enough.",
    correctOption: "b",
    explanation:
      "M1 L2's core position. The lesson refuses the hierarchy in (a) and the cynicism in (c). Both pleasures are independent and additive, a thriller can move without recognising and a quiet domestic novel can recognise without moving, but the books that endure usually do both. (d) confuses byproduct with intention.",
  },

  // 6 — synthesis (M1 L1 + M1 L4) — premise without want
  {
    questionText:
      "A first-time novelist sends you the opening of her book. Three pages in: a woman wakes up in a city she has never been to, with no memory of how she arrived. The prose is competent. The premise is intriguing. But you find yourself reading on out of duty rather than pull. By page eight you put it down. When you ask yourself why, the answer surprises you: nothing has been promised. The mystery of how she arrived doesn't function as a hook because the writer has not yet given you any reason to want to find out. Which single revision move best addresses what the opening is missing?",
    optionA: "Move the woman's backstory to chapter one so the reader knows what is at stake before the disorientation begins.",
    optionB: "Establish, within the first three pages, what the protagonist WANTS that the disorientation is now blocking, even if the want is small or partial.",
    optionC: "Replace the third-person perspective with first-person so the reader is inside the disorientation rather than observing it.",
    optionD: "Open earlier, in the city she came from, so the reader sees the journey rather than its disorienting aftermath.",
    correctOption: "b",
    explanation:
      "Synthesises M1 L1 (story = causation rooted in desire) with M1 L4 (every story unit needs a desire-bearing character). A premise without a want is a situation, not a story. The reader does not pull through a mystery because of the mystery itself: she pulls through because she cares whether the protagonist gets what she wants. The other options are craft moves that might help secondarily, but none addresses the diagnosis.",
  },

  // ═══ M2 — Architecture (6: 3 applied + 2 recall + 1 synthesis) ═══

  // 7 — applied (Sample 1) — midpoint reversal
  {
    questionText:
      "A writer's draft has a clear inciting incident, lock-in, and climax, but readers report the third act feels \"rushed.\" Reviewing the manuscript, the writer notices Act 2 has rising complications but no moment where the protagonist's understanding of the problem shifts. According to Module 2, what is most likely missing?",
    optionA: "The book is too long, cut Act 1.",
    optionB: "The midpoint reversal is missing, without a re-framing moment in the middle of Act 2, complications stack linearly and the climax has no curve to land on.",
    optionC: "The protagonist isn't likeable enough.",
    optionD: "The structure is wrong, switch to the hero's journey.",
    correctOption: "b",
    explanation:
      "M2 L1 identifies the midpoint as the moment that gives Act 2 a shape change. The \"rushed third act\" symptom in the presence of complete Act 1 and a clear climax almost always traces to a missing midpoint reversal. The cure is to find or write a midpoint where the protagonist's understanding of their want, the obstacle, or themselves changes.",
  },

  // 8 — applied — choosing-structure (quiet novel, three-act re-fit)
  {
    questionText:
      "A writer is plotting a quiet, character-driven novel about a librarian who decides, in middle age, to leave the city she has lived in for thirty years. She tells you she has been told her novel \"needs more structure\" but the suggestion to use a three-act framework feels wrong for the kind of book she wants to write. Which structural framework is most likely to fit the book's quiet shape?",
    optionA: "A four-quadrant beat sheet, since beat sheets are explicitly designed for novels with low external stakes.",
    optionB: "The Hero's Journey, since the protagonist's departure from a known world maps cleanly to the Call to Adventure.",
    optionC: "Three-act structure, refitted to a quiet shape: act one is the slow accumulation of dissatisfaction, act two is the choosing, act three is the leaving: the framework is shape-agnostic.",
    optionD: "No framework, quiet novels are generally better off written intuitively, with structure imposed only in revision.",
    correctOption: "c",
    explanation:
      "M2 L4's central argument. The frameworks are not genre-bound; they describe the SHAPE of change in a character. The librarian's slow accumulation, decision, and act of leaving is a recognisable three-act curve. (d) misreads the lesson, which positions structural awareness as a tool regardless of writing approach.",
  },

  // 9 — applied — Hero's Journey at domestic scale
  {
    questionText:
      "A writer using the Hero's Journey framework reports that the structure feels \"too heroic\" for her domestic-realist novel. The protagonist is a teacher dealing with her ageing mother. She has resisted converting to three-act because she likes the journey's emotional milestones (the threshold-crossing, the ordeal, the return). What's the most useful revision-level move?",
    optionA: "Drop the Hero's Journey entirely; it was designed for myth and does not fit domestic realism.",
    optionB: "Keep the journey's emotional milestones but treat them as internal beats: the threshold is not leaving home: it's accepting that the relationship has already changed.",
    optionC: "Rewrite the protagonist as someone who literally goes on a journey (a road trip, a return-to-hometown), so the milestones land at the genre's intended scale.",
    optionD: "Use the Hero's Journey for plotting but switch to three-act for the writing itself, so the prose stays domestic in register.",
    correctOption: "b",
    explanation:
      "M2 L2's central refit. The Hero's Journey describes a shape of psychological transformation; its milestones operate just as well as INTERNAL beats. A domestic novel's threshold can be the moment a daughter accepts her mother is no longer the parent, same beat, different scale. The lesson's working principle: structure describes shape, not scale.",
  },

  // 10 — recall — beat sheets as rhythm map
  {
    questionText:
      "The lesson on beat sheets describes them as a \"granular plotting tool\", finer than three-act, coarser than scene-by-scene. Which statement most accurately captures the FUNCTION the lesson assigns to beat sheets within a writer's process?",
    optionA: "A beat sheet is a substitute for outlining; writers who use one do not need to outline separately.",
    optionB: "A beat sheet is a rhythm map; it specifies the emotional turn each beat should make, leaving the scene-level execution to the writer.",
    optionC: "A beat sheet is a marketing-driven structure; it aligns the manuscript with reader expectations in a given genre, increasing salability.",
    optionD: "A beat sheet is a revision-only tool; it should never be consulted during drafting because it constrains discovery.",
    correctOption: "b",
    explanation:
      "M2 L3 frames beat sheets as RHYTHM maps. Each beat names the emotional or structural turn that should happen by a particular point, without prescribing how it's executed. (a) confuses outlining and beating; (c) misreads the lesson's voice (it explicitly avoids the marketing frame); (d) is a partial truth distorted into an absolute.",
  },

  // 11 — recall — structural choice = camera in time
  {
    questionText:
      "A \"structural choice\" decision in a novel is, per the choosing-structure lesson, primarily a decision about WHAT?",
    optionA: "Genre, different genres demand different structural frameworks; getting genre right gives you structure for free.",
    optionB: "Where the camera is in time: structure is the writer's decision about how the order of telling differs from the order of happening.",
    optionC: "Length, short novels favour three-act, long novels favour Hero's Journey, very long novels favour beat sheets.",
    optionD: "Voice, first-person novels resist tight structure; third-person novels welcome it.",
    correctOption: "b",
    explanation:
      "M2 L4's most usable working definition: structural choice = the relation between order-of-telling and order-of-happening. The framework choices (3-act vs HJ vs beats) are surface choices; the deep choice is the camera-in-time. (a) reverses cause; (c) is false; (d) is unrelated.",
  },

  // 12 — synthesis (M2 L1 + M2 L4) — three-timeline novel
  {
    questionText:
      "A writer has a 70,000-word draft of a novel that follows a young woman across three timelines: her childhood, her young adulthood abroad, and her present-day return to the country she was born in. In the draft, the timelines are interleaved scene-by-scene. Beta readers report that the prose is strong, the characters are vivid, but they \"lose track of which timeline they are in\" by the middle. The writer is committed to the three-timeline architecture but asks how she should reconsider its execution. Which is the most useful structural move?",
    optionA: "Convert to chronological order: the three-timeline conceit is what is actually breaking the reader; the architecture is the problem.",
    optionB: "Reorganise so each act of the three-act structure dominantly inhabits ONE timeline (act one = childhood, act two = young adulthood, act three = present), with the other two woven in as deliberate echoes: the architecture stays, but the camera-in-time is now act-anchored.",
    optionC: "Add a subtitle to each scene specifying year and city: the problem is signposting, not structure.",
    optionD: "Switch from three timelines to two (childhood + present): three is one too many for most readers to track.",
    correctOption: "b",
    explanation:
      "Synthesises M2 L1 (three-act as load-bearing shape) with M2 L4 (structural choice = camera-in-time). The diagnosis is not that three timelines are inherently confusing; it is that scene-by-scene interleaving gives the reader no anchor for the camera. Pinning each act to a dominant timeline preserves the architecture while solving the disorientation. (a) abandons the architecture; (c) treats a structural problem as a typographic one; (d) reduces complexity rather than organising it.",
  },

  // ═══ M3 — Characters (7: 4 applied + 2 recall + 1 synthesis) ═══

  // 13 — applied (Sample 2) — antagonist mirror exercise
  {
    questionText:
      "A writer's antagonist is described as \"she's just evil\" by beta readers: they can't articulate why beyond that. The protagonist's wound/want/need are richly layered. According to Module 3, what is the most useful next move?",
    optionA: "Cut the antagonist; the protagonist can carry the book alone.",
    optionB: "Mirror the protagonist's framework onto the antagonist, write a paragraph from the antagonist's POV in their own voice, sympathetic to themselves, explaining why they are right. If the writer cannot, the antagonist is a function, not a person.",
    optionC: "Make the antagonist more obviously evil so readers stop hesitating.",
    optionD: "Replace the antagonist with a system (poverty, war, illness).",
    correctOption: "b",
    explanation:
      "M3 L3's specific prescription. The \"she's just evil\" feedback is the absence of architecture: the cure is to build it using the same wound/want/need scaffold M3 L1 used for the protagonist. The paragraph-in-their-voice exercise is the diagnostic.",
  },

  // 14 — applied (Sample 7) — antagonist wound concept vs event (boundary)
  {
    questionText:
      "A writer's antagonist has a clear wound (mother died young), a clear want (recognition), and a sympathetic POV paragraph. Beta readers still find the antagonist flat. By contrast, the protagonist's wound is rendered through a specific 30-page event in chapter 4. What is most likely happening?",
    optionA: "The antagonist needs more screen time.",
    optionB: "The antagonist's wound exists as concept (\"mother died young\") but is not rendered as a specific event the way the protagonist's is. M3 L1's wounds-are-events test catches this: the cure is to render the antagonist's wound as a specific moment, even if that moment never appears on the page.",
    optionC: "The protagonist is too well-developed; balance by making them flatter.",
    optionD: "Cut the antagonist.",
    correctOption: "b",
    explanation:
      "M3 L1's distinction between wound-as-concept (\"abandonment issues\") and wound-as-event (\"the morning his father packed a suitcase and didn't come back\") applies symmetrically to the antagonist. The wound exists in the writer's notes; it doesn't exist in the form the reader needs.",
  },

  // 15 — applied — supporting cast / two-trait rule
  {
    questionText:
      "A writer has a 60,000-word draft. The protagonist is sharply rendered and the antagonist is doing exactly what she should be. But the supporting cast, the protagonist's sister, her mentor, her three colleagues, read flat to beta readers. The writer has given each one a name, an occupation, and a small physical detail. She asks what's missing.",
    optionA: "Each supporting character needs a SECOND, unrelated trait, name + occupation + a detail in service of that occupation still adds up to one trait (the function trait); a single trait is cardboard, two unrelated traits are a person.",
    optionB: "Each supporting character needs more screen time; flatness is almost always under-development.",
    optionC: "Each supporting character needs her own backstory beat in the manuscript, otherwise she reads as decorative.",
    optionD: "Each supporting character needs to be moved into act three, where the protagonist's choices have the highest weight.",
    correctOption: "a",
    explanation:
      "M3 L4's two-trait rule. One trait, even a vivid one, reads as cardboard. Two specifically unrelated traits (\"the brave knight who is also a coward about heights\") cross the line into personhood because the reader's mind has to hold a small contradiction. (b) and (c) are surface fixes the lesson explicitly resists; (d) misreads the relationship problem as a placement problem.",
  },

  // 16 — applied — dialogue voice driven by wound
  {
    questionText:
      "A writer's dialogue passes a flat-tongue test: every line could be said by any character. She has read the lesson on dialogue voice and understands she needs to differentiate. But when she tries to differentiate by giving each character a \"verbal tic\" (one says \"yeah\" a lot, one stutters, one uses formal vocabulary), her test readers report the dialogue now feels mannered and gimmicky. What's the most useful next move?",
    optionA: "Strip the tics, voice differentiation is downstream of the WOUND. What each character protects, avoids, or reaches for verbally tracks to the thing the wound made them defensive about, and that level of differentiation doesn't read as mannered the way a tic does.",
    optionB: "Remove all dialogue tags except \"said\": most flat-dialogue diagnoses are actually tag-clutter problems in disguise.",
    optionC: "Add manner-of-speaking verbs (whispered, muttered, growled) to differentiate HOW each character speaks, not WHAT they say.",
    optionD: "Move the dialogue scenes to later in the manuscript, after each character has been physically described enough that the reader can hear them.",
    correctOption: "a",
    explanation:
      "M3 L5's central diagnosis. Voice differentiation by quirk is the trap the lesson explicitly names: the reader notices a tic once and stops noticing. Real differentiation is structural and rooted in the character's wound (callback to L1): what they protect, avoid, reach for verbally. (b) is real but adjacent; (c) is the beginner's instinct (the lesson explicitly counsels using \"said\" almost always); (d) is unrelated.",
  },

  // 17 — recall — supporting cast / cut question
  {
    questionText:
      "The supporting-cast lesson offers a \"cut question\" for evaluating each secondary character. What is the question, and what is the principle behind asking it?",
    optionA: "\"Does this character have a name and a clear physical description?\", characters who lack either tend to feel flat; the cut question targets under-development.",
    optionB: "\"What would the story lose if I removed this character?\", if the answer is *nothing*, cut; if the answer is *another character would have to do their job*, consider merging instead.",
    optionC: "\"Does this character appear in more than three scenes?\", supporting characters who appear once or twice are usually patches; the cut question enforces minimum-presence discipline.",
    optionD: "\"Could the protagonist achieve their want without this character?\", characters who don't change the protagonist's path are dead weight; the cut question targets functional necessity.",
    correctOption: "b",
    explanation:
      "M3 L4's central diagnostic for any secondary character. The two answers map to two moves: nothing-lost = cut; function-would-transfer = merge. Merging produces a character richer than either of the originals because the merged figure carries layered function (\"the mentor + the rival\" becomes guidance from someone with their own stake). (d) is closest as a distractor but inverts the test, not all supporting characters are in service of the protagonist's want.",
  },

  // 18 — recall — backstory dump vs revelation
  {
    questionText:
      "The backstory lesson distinguishes between a backstory DUMP and a backstory REVELATION. What is the difference?",
    optionA: "A dump is summarised in narration; a revelation is dramatised in scene: the difference is mode of delivery.",
    optionB: "A dump moves the reader BACKWARD in time (paragraphs of historical context interrupting present-tense story); a revelation pulls the past FORWARD into the present moment, where it changes the meaning of what was already on the page.",
    optionC: "A dump tells the reader something the protagonist already knows; a revelation tells the reader something the protagonist and reader are learning together.",
    optionD: "A dump reveals backstory all at once; a revelation reveals it piece by piece across multiple chapters: the difference is pacing.",
    correctOption: "b",
    explanation:
      "M3 L2's central distinction. A dump interrupts the present with paragraphs of context (the reader stops reading a novel, the lesson notes, around the second sentence); a revelation is a single sentence, sometimes three words, that pivots the reader's understanding of what's happening right now. The phrase \"pulls the past forward\" is the lesson's working test. (a), (c), (d) are plausible-sounding alternative distinctions the lesson does not make.",
  },

  // 19 — synthesis (M3 L3 + M3 L5) — closed-off protagonist
  {
    questionText:
      "A writer's protagonist is a forty-year-old translator who, after her father's death, returns to her childhood home to clear it out. The opening fifty pages establish: her grief, her professional precision, her difficult relationship with her sister Yara, and her father's last days. Beta readers say the protagonist is \"vivid but oddly closed off\": they can describe her but they don't feel WITH her. The writer suspects the protagonist's interiority is the problem, but when she adds more interior monologue, the closed-off feeling gets WORSE. Which combined move is most likely to open the protagonist?",
    optionA: "Strengthen the antagonist (Yara) so the protagonist has to react more sharply, surfacing interiority through external pressure.",
    optionB: "Move the dialogue with Yara earlier and harder, interior monologue cannot do what an honest scene with the right opponent can; combined with cutting some of the new monologue, the protagonist's closure starts to read as protection rather than authorial reticence.",
    optionC: "Replace the third-person with first-person so the reader is positioned inside the protagonist's head from page one.",
    optionD: "Add a confidant character (a colleague, a friend) the protagonist can be honest with on the page; the closure is a result of having no one to talk to.",
    correctOption: "b",
    explanation:
      "Synthesises M3 L3 (the antagonist with parallel architecture as the protagonist's mirror, \"their collision IS the plot\") with M3 L5 (subtext + voice rooted in wound, the principle that important conversations happen around the thing, not at it). The closed-off protagonist usually doesn't need MORE interior: she needs the right opponent and dialogue with subtext, where the closure can read as protection rather than authorial reticence. (a) is half the answer (strengthen antagonist) without the second half (use dialogue + cut some monologue); (c) is a structural overhaul; (d) is a softer variant of (b) that misses the pressure principle.",
  },

  // ═══ M4 — World (6: 4 applied + 1 recall + 1 synthesis) ═══

  // 20 — applied — show vs tell, gesture conversion
  {
    questionText:
      "A writer is revising her opening chapter. The chapter contains the line: \"She felt deeply uncertain about the move.\" A workshop reader has flagged this as \"telling, not showing.\" The writer has tried three times to convert the line and each conversion either bloats the page or feels false. What's the most useful next move?",
    optionA: "Replace the abstract noun \"uncertain\" with a more concrete one (e.g. \"a low dread about the move\") and accept that some interior states are best telled rather than shown.",
    optionB: "Cut the line entirely and trust the surrounding scene to carry the uncertainty, returning to it only if a beta reader reports the feeling missing.",
    optionC: "Convert the line to a physical gesture in scene: she pauses with one hand on the boxes, looks at the empty room, then keeps packing: the gesture shows what the abstraction told.",
    optionD: "Move the line to a later chapter where the move is in motion; uncertainty BEFORE the action is harder to show than uncertainty IN the action.",
    correctOption: "c",
    explanation:
      "M4 L1's standard show-conversion move. The conversion the writer needs is from abstract interior state (\"uncertain\") to physical gesture in scene (pause, glance, the small failure to keep packing). (a) is a surrender that the lesson explicitly resists; (b) is a sometimes-useful move but skips the conversion the writer wanted help with; (d) reframes the problem rather than solving it.",
  },

  // 21 — applied — sensory writing rooted in character
  {
    questionText:
      "A writer is drafting a hospital scene. She wants the reader to feel the character's exhaustion. Her current draft includes: fluorescent lights, beeping monitors, the smell of antiseptic, the green pyjamas of an orderly walking past, the cold of the chair, the bitter coffee from the vending machine. She asks why the scene reads as \"competent generic hospital\" rather than the specific exhaustion she intended.",
    optionA: "She needs to choose senses that rise from THIS character's body: what a character notices is downstream of what they protect; a translator's tired ear hears the beeps differently from a surgeon's hands feeling the cold of the chair. Six senses listed without character-anchoring read as inventory; well-chosen senses, even fewer, render the place this character is in.",
    optionB: "She needs to add a seventh sense, the character's interior monologue about her exhaustion, to break the over-reliance on the five external senses.",
    optionC: "She needs to move the scene from present-tense to past-tense; sensory overload reads as generic in present-tense and specific in retrospect.",
    optionD: "She needs to add direct speech from another character to the scene so the senses anchor to a relational moment rather than a checklist.",
    correctOption: "a",
    explanation:
      "M4 L2's two-sense rule (a floor, not a ceiling) plus the lesson's deeper principle: \"sensory choices rise from the same place as voice: what a character notices is downstream of what they protect.\" Six senses listed without character-anchoring read as inventory; well-chosen senses (whether two or four) render THIS character's experience of the place. (b) inverts the lesson; (c) and (d) miss the diagnosis.",
  },

  // 22 — applied — setting as character (pressure on protagonist)
  {
    questionText:
      "A writer's setting (a small town in central Anatolia) is described carefully and accurately, with attention to the architecture, the climate, the food. Beta readers report that the setting \"doesn't do anything\": they can picture the town but it doesn't seem to PRESS on the protagonist. What would convert her described setting into a setting that functions as a character?",
    optionA: "Add a personification beat in the opening, describe the town as \"watching\" or \"waiting\" so the reader registers it as agentive.",
    optionB: "Show the protagonist responding DIFFERENTLY to the town than she would in another place: the town becomes a character when its presence changes what she does or says, not when it is described well.",
    optionC: "Move more of the action OUTDOORS so the setting has more screen time.",
    optionD: "Reduce the setting description; over-described settings always feel decorative rather than agentive.",
    correctOption: "b",
    explanation:
      "M4 L3's central diagnostic. A described setting is decoration; a character-setting is one whose presence CHANGES the protagonist's behavior. The reader registers a setting as agentive not from authorial description but from observed pressure. (a) is the easy reach that almost always reads as forced; (c) confuses screen time with function; (d) is sometimes useful but misses the diagnosis.",
  },

  // 23 — applied — load-bearing description
  {
    questionText:
      "A writer's first draft has dense, careful description of every room, street, and meal. A revision pass has cut almost all of it. Now the manuscript reads \"weightless\", beta readers say the world \"feels thin.\" What principle should guide her on the third pass?",
    optionA: "Restore one sentence of description to every scene, even one anchoring sentence prevents the weightless feeling.",
    optionB: "Restore description ONLY where the next dramatic beat depends on it, descriptive weight should follow dramatic weight, not be evenly distributed.",
    optionC: "Restore description in proportion to its sensory richness, visually rich settings get more, sparse ones get less, regardless of dramatic function.",
    optionD: "Restore description in a 1:5 ratio, one descriptive paragraph for every five paragraphs of action or dialogue.",
    correctOption: "b",
    explanation:
      "M4 L4's central principle: descriptive pacing should be load-bearing. Description that supports a dramatic beat earns its weight; description distributed evenly reads as decoration when present, weightless when stripped. (a) and (d) are mechanical rules the lesson explicitly resists; (c) confuses sensory inventory with dramatic function.",
  },

  // 24 — recall (Sample 8) — two-sense rule scope (boundary)
  {
    questionText:
      "The \"two-sense rule\" from M4 L2 states that every important scene should engage at least two senses. Does the rule apply to scenes that are told (summarised) rather than shown (rendered)?",
    optionA: "Yes: the rule applies to all scenes regardless of mode.",
    optionB: "No: the rule applies only to shown scenes. Told scenes are summarising past time, not rendering a moment, so the multi-sensory rule doesn't apply.",
    optionC: "The rule doesn't exist; sensory writing is optional.",
    optionD: "The rule applies only to literary fiction.",
    correctOption: "b",
    explanation:
      "M4 L2 explicitly scopes the two-sense rule to shown scenes. M4 L1's show/tell framing distinguishes the two modes; sensory rendering is the technique that makes shown moments land: it isn't the technique for compressed time.",
  },

  // 25 — synthesis (M4 L2 + M4 L3) — fuse setting + sensation
  {
    questionText:
      "A writer has been working on a quiet domestic novel for two years. The setting (a coastal town) is rendered with care across all 80,000 words. The protagonist (a widow in her sixties) is fully realised. But beta readers consistently report that the town and the widow feel like \"two adjacent novels\": the description does not seem to do anything to the protagonist, and the protagonist's inner life does not seem to register the place. The writer suspects the problem is in the SCENES rather than the prose. What pair of moves is most likely to fuse them?",
    optionA: "Cut all standalone description and require every detail of the town to either generate a sensory beat in the protagonist's body OR change a small decision she makes in the next paragraph.",
    optionB: "Move the protagonist out of the town for the middle act; absence makes the place register on her return.",
    optionC: "Add a second character native to the town who explains its history to the widow; explanation forces relation.",
    optionD: "Rewrite the third-person prose in close third focused on the widow's senses, letting description happen ONLY through her perception.",
    correctOption: "a",
    explanation:
      "Synthesises M4 L2 (sensory writing rooted in this character's body) with M4 L3 (setting as character = setting that PRESSES on the protagonist). The diagnosis is that the description is on a parallel track to the protagonist; the fix is to require every detail to either become a body-anchored sensation or alter a small decision. (d) is a useful move but does only half the work (perception without consequence); (b) and (c) are scope changes.",
  },

  // ═══ M5 — Writing Process (7: 5 applied + 2 recall + 0 synthesis) ═══

  // 26 — applied — blank page (15-min permission)
  {
    questionText:
      "A writer has been opening her laptop every morning for three weeks and has written nothing. She knows the next scene she needs to write, a difficult conversation between two estranged sisters, and she has notes for it. She is not blocked on the IDEA. She is blocked on the act of beginning. What's the most useful move?",
    optionA: "Skip this scene, write the scene AFTER it for a week, then return to the difficult one with the destination already known.",
    optionB: "Set a kitchen timer for fifteen minutes and write anything (descriptions, the room, what one sister is wearing) without permitting yourself to start the conversation; the conversation usually begins in minute thirteen on its own.",
    optionC: "Switch tools, close the laptop, open a notebook, write the scene by hand; physical resistance to typing often dissolves into ink flow.",
    optionD: "Postpone the scene to revision: many difficult scenes are easier to find on the second pass when the surrounding manuscript exists.",
    correctOption: "b",
    explanation:
      "M5 L1's central technique. The blank page is rarely about the page; it is about the body's resistance to the act of beginning. The fifteen-minute permission to write SECONDARY material almost always becomes the doorway into the primary scene because the resistance was at the doorstep, not in the scene. (a), (c), (d) are all sometimes-useful moves but they dodge the threshold rather than crossing it.",
  },

  // 27 — applied — first draft / push through
  {
    questionText:
      "A writer is two months into her first draft. She has 30,000 words. She has begun to read what she's written and finds large stretches she wants to fix immediately: a chapter that drags, a character who is inconsistent, a scene that should be cut. She asks whether she should fix these now or push through to the end of the draft.",
    optionA: "Fix them now, letting bad pages accumulate makes the draft demoralising and makes finishing harder.",
    optionB: "Push through to the end, first-draft revising compounds; the cleanest path is to mark the issues and keep moving forward, since many will resolve themselves once the destination is known.",
    optionC: "Fix only the character inconsistency now, character problems propagate forward and corrupt later chapters in ways that are hard to undo; structural problems can wait.",
    optionD: "Set aside one day a week for revision and the other days for forward progress; alternating prevents both demoralisation and propagation.",
    correctOption: "b",
    explanation:
      "M5 L2's working rule for first-draft writers: the draft's job is to exist. Mid-draft revision compounds: every fix surfaces five new fixes, the destination shifts, the writer never finishes. The lesson's working aphorism: a complete bad draft is always more revisable than half a good one. (a) is the intuitive trap. (c) confuses character-tracking (which can be done with a margin note) with re-writing. (d) is a halfway compromise the lesson explicitly cautions against.",
  },

  // 28 — applied — revision passes / chapter compromise
  {
    questionText:
      "A writer in revision flags her own draft with: \"Chapter 7 is beautifully written but adds nothing to the plot or to character X's arc. I love it. I cannot bring myself to cut it.\" How to decide?",
    optionA: "Cut it: the rule is absolute; any chapter that fails BOTH plot and arc tests is dead weight regardless of prose quality.",
    optionB: "Move it to the appendix or the website as bonus material so the prose is preserved without disrupting the manuscript.",
    optionC: "Keep it for one more pass and reassess after structural revision is complete; sometimes a chapter that seems isolated reveals a function once neighboring chapters are tightened.",
    optionD: "Keep it but cut it down to its single best paragraph and absorb that paragraph into a neighboring chapter; preserves the prose, removes the structural drag.",
    correctOption: "d",
    explanation:
      "M5 L3's working compromise. Pure cutting (a) loses prose the writer fought for; preservation as appendix (b) is denial dressed as solution; deferring (c) is rarely the right call when both diagnostic tests have already failed. The compromise, single best paragraph absorbed elsewhere, converts the loss into a craft move and almost always strengthens the absorbing chapter. The lesson's working aphorism: a chapter dies for the manuscript, but its best sentence may live in a different room.",
  },

  // 29 — applied — self-editing / week distance
  {
    questionText:
      "A writer at the line-editing stage has a paragraph she has rewritten seven times. Each version is different. She no longer knows which is best. She asks for a stopping rule.",
    optionA: "Read all seven versions aloud back-to-back; the one that survives the comparison is the strongest.",
    optionB: "Choose the third version, around the third pass: instinct has informed the writing without yet being eroded by overthinking.",
    optionC: "Set the paragraph aside for a week and choose on return; line-quality fatigue is real and fades with distance.",
    optionD: "Choose the version with the fewest commas, at the line stage, simplicity is almost always the right tiebreaker.",
    correctOption: "c",
    explanation:
      "M5 L4's central self-editing principle: distance restores judgment. After seven rewrites, the writer's ear is saturated and cannot hear the relative quality of versions; a week's distance returns the freshness needed to choose. (a) reads as plausible but doesn't address the saturation; (b) and (d) are mechanical rules the lesson explicitly resists.",
  },

  // 30 — applied — when to stop / send it
  {
    questionText:
      "A writer has done structural, scene, and line passes on her manuscript. Her agent has accepted it. She asks for the LAST stopping rule before she sends it.",
    optionA: "Re-read the opening twenty pages; the rest of the manuscript is locked, but the opening's ear can shift in subtle ways during the revision arc and deserves one final pass.",
    optionB: "Read the entire manuscript aloud to the empty room one more time, anything that snags the ear is the final fix.",
    optionC: "Set the manuscript aside for two weeks, then run a final SEARCH for words she tends to overuse (e.g. \"just\", \"actually\", \"very\"): the unconscious vocabulary is what survives even thorough revision.",
    optionD: "Send it without further revision: she has done all three passes; further work is procrastination dressed as conscientiousness.",
    correctOption: "d",
    explanation:
      "M5 L5's central call. Once the three-pass discipline is complete and an external reader (agent) has accepted, further passes are almost always the writer postponing release rather than improving the book. The lesson's principal warning: the manuscript can absorb infinite revision, and \"one more pass\" rarely changes the book's standing in the world. (a), (b), (c) are all pretext-passes the lesson names by their rationalisations.",
  },

  // 31 — recall (Sample 4) — revision pass order
  {
    questionText:
      "Module 5 prescribes three sequential revision passes. What is the order, and the principle behind the order?",
    optionA: "Line → Scene → Structural; the prose must be polished before structural questions can be answered.",
    optionB: "Scene → Structural → Line; the middle level is the highest-leverage starting point.",
    optionC: "Structural → Scene → Line; line-level polish in chapters that will be cut at the structural pass is wasted work.",
    optionD: "The order doesn't matter as long as all three passes happen.",
    correctOption: "c",
    explanation:
      "M5 L3's spine line: don't fix sentences in chapters you'll cut. Structural pass identifies what stays; scene pass ensures each scene earns its place; line pass polishes prose only in the surviving material.",
  },

  // 32 — recall — finished vs released
  {
    questionText:
      "The \"when to stop\" lesson distinguishes between FINISHED and RELEASED. What is the lesson's working position on the relation between them?",
    optionA: "Finished and released are the same: a book is finished when the writer releases it; \"finished\" is a release decision, not a craft state.",
    optionB: "A book is finished when the writer can no longer improve it without breaking it; release happens after, when the writer accepts that diminishing returns have been reached.",
    optionC: "Books are not finished; they are released: the lesson's working aphorism, and a hedge against the perfectionism that prevents books from leaving the writer's desk.",
    optionD: "A book is finished when the structural revision pass is complete; release happens after the line-editing pass and before publication.",
    correctOption: "c",
    explanation:
      "M5 L5's most-quoted line. The lesson rewords a better-known but commonly misattributed aphorism into its working form. The framing is deliberate: it removes the perfectionist ideal of \"finished\" and replaces it with a release decision the writer makes despite knowing more revision is always possible. (a), (b), (d) are all rationalist re-statements that miss the lesson's voice.",
  },

  // ═══ M6 — Publishing (5: 3 applied + 2 recall + 0 synthesis) ═══

  // 33 — applied — self vs traditional / audience-first
  {
    questionText:
      "A writer of a quiet literary novel has two paths in front of her: a small literary press willing to publish in 18 months with modest distribution and a $1,000 advance, or self-publishing through a major retailer in 4 months with full royalties and full creative control. How should she choose?",
    optionA: "Choose the press, literary fiction depends on the cultural authority that traditional publishing confers; self-publishing literary work almost always underperforms regardless of quality.",
    optionB: "Choose self-publishing: the 18-month delay and the $1,000 advance reveal that the press is offering little she cannot offer herself, and creative control is the higher value for a literary novel.",
    optionC: "Choose based on the audience question rather than the publisher question, if her readers are press-discoverable (literary review pages, prize lists, indie bookstores), the press is the path; if they are discoverable elsewhere (social media, podcasts, communities of taste she already inhabits), self-publishing is.",
    optionD: "Negotiate with the press for a faster timeline and a higher advance, then accept; the press's curatorial validation is uniquely valuable.",
    correctOption: "c",
    explanation:
      "M6 L1's central re-framing. The publisher question (press vs self) is the wrong primary question; the audience question (where are MY readers reachable) is the right one. The lesson explicitly refuses the (a) and (b) absolutes and treats the publisher decision as DOWNSTREAM of the audience question. (d) is a tactical move that doesn't address the strategic frame.",
  },

  // 34 — applied — spoken pitch / blurb not summary
  {
    questionText:
      "A writer has 30 seconds with a stranger at a wedding to describe her novel. She has prepared a careful three-sentence summary. The stranger's eyes glaze over. What's wrong?",
    optionA: "The summary is too plot-heavy, strangers respond to character and theme more than to plot.",
    optionB: "Three sentences is too long; one sharp sentence outperforms three careful ones in spoken contexts.",
    optionC: "She is summarising; she needs to tell the stranger what KIND of book it is in language the stranger already uses, then offer one line of distinction: the spoken version is closer to a back-cover blurb than to a synopsis.",
    optionD: "She is targeting the wrong audience; a wedding stranger is not a reader and her book deserves a more discerning context.",
    correctOption: "c",
    explanation:
      "M6 L2's central principle for the spoken pitch. A summary tells the stranger what HAPPENS; a blurb tells her what KIND of experience to expect. The spoken pitch must do the blurb's job in language the stranger already uses. (b) is a partial truth (length helps) without the diagnosis. (a) and (d) misread the genre of the moment.",
  },

  // 35 — applied — audience / 200-is-enough
  {
    questionText:
      "A writer launches her debut novel with a mailing list of 200 readers, all of whom are people she has corresponded with personally over five years (writers she has supported, members of her old workshop, friends-of-friends from a podcast appearance). She is anxious that 200 is too small. Her launch sells 180 copies in week one. What does the audience lesson suggest she's actually achieved?",
    optionA: "Below threshold: 200 is too small to count as an audience; she should have built to at least 1,000 before launch.",
    optionB: "The threshold of viable launch: a list of 200 readers, when each one is engaged enough to buy in week one, is what a writer needs to start; the next 200 will come from these 200's recommendations.",
    optionC: "A platform but not an audience: 200 personal contacts is a network; an audience is strangers who have chosen to follow you because of the work.",
    optionD: "An audience but not a platform: 200 readers can sustain a small career, but only a public-facing platform converts an audience into one that grows.",
    correctOption: "b",
    explanation:
      "M6 L3. The lesson's working aphorism: \"Two hundred is enough to start.\" 200 engaged readers, each of whom buys, is exactly what a debut novel needs. The 90% conversion (180/200 buying in week one) is the true metric of an audience, and recommendations from this base are the second-order growth path. (a) overstates the threshold. (c) and (d) misuse \"platform\" and \"audience\": the lesson rejects the platform-audience distinction as a marketing-tier confusion.",
  },

  // 36 — recall — 1.5-second rule
  {
    questionText:
      "The cover-and-blurb lesson invokes a \"1.5-second rule.\" What does this rule describe?",
    optionA: "The maximum time a reader will give a cover before deciding whether to pick up the book or move on; the cover must communicate genre, register, and a hint of plot in that window.",
    optionB: "The minimum time a reader needs to read a back-cover blurb; blurbs shorter than a 1.5-second read tend to underperform.",
    optionC: "The pace at which a reader's eye scans a bookstore shelf; covers must register from peripheral vision in 1.5 seconds or less.",
    optionD: "The optimal exposure time for a cover image in social-media advertising.",
    correctOption: "a",
    explanation:
      "M6 L2. The 1.5-second rule names the cover's hardest job: in less than two seconds, communicate to a reader scanning a shelf or a screen what KIND of book this is and whether her tastes are likely to be served. The other options are plausible-sounding adjacent ideas; (c) is closest as a distractor but misframes the rule as a vision-physiology fact rather than a craft target.",
  },

  // 37 — recall — first week vs first year
  {
    questionText:
      "The after-launch lesson distinguishes the FIRST WEEK from the FIRST YEAR of a book's life. Which is the lesson's working position on which window matters more?",
    optionA: "The first week: most books that succeed signal their success in week-one sales; books that miss week one rarely recover.",
    optionB: "The first year: most books that endure show their durability over twelve months of slow word-of-mouth, reviews, and reader-to-reader recommendation; week-one performance is a noisy signal.",
    optionC: "Neither, book performance is not predictable on either window; the writer's job is to release the book and start the next one.",
    optionD: "Both equally, week-one signals attention; year-one signals depth; a writer pays attention to both for different reasons.",
    correctOption: "b",
    explanation:
      "M6 L5's central calibration. Week-one sales reflect the launch effort and the writer's existing reach; year-one performance reflects whether the book has the depth to spread by recommendation. The lesson explicitly counsels writers to ignore week-one anxiety and watch the year-one slope. (a) is the conventional industry wisdom the lesson resists. (c) is an over-correction that disclaims a useful signal. (d) is a near-true compromise that still gives week-one too much weight.",
  },

  // ═══ Cross-module synthesis (3) ═══

  // 38 — synthesis (Sample 5) — M1+M3 wound as event
  {
    questionText:
      "A writer's beta readers find the protagonist \"hard to root for\" despite richly written childhood backstory and a clear want (winning a dance competition). What combination of issues from Modules 1 and 3 best diagnoses the cause?",
    optionA: "The story lacks all three ingredients; add a stronger antagonist.",
    optionB: "The wound is rendered as concept (\"she had a difficult childhood\") rather than as a specific event; the want may also be a sentence-level pursuit on the surface (a competition) but rooted in a wound the reader can't feel. The cure is to name the moment the wound happened and verify the want connects to it.",
    optionC: "The backstory has too many details; cut all childhood references.",
    optionD: "The plot is too propulsive, slow it down with more interiority.",
    correctOption: "b",
    explanation:
      "Cross-module diagnosis. M3 L1: wounds must be events, not generalised conditions. M1 L4: wants must be felt by the reader, which requires the wound underneath to be specific. \"Rich backstory + concrete want, but reader doesn't root for protagonist\" almost always traces to wound-as-concept rather than wound-as-event.",
  },

  // 39 — synthesis (Sample 6) — M4+M5 load-bearing + signs of done
  {
    questionText:
      "A writer's third draft has clear structural beats, vivid sensory detail throughout, and polished line-level prose. After three revision passes, beta readers say \"the prose is beautiful but slow.\" The writer has begun moving commas back and forth and has not started book 2. According to course frameworks, what is the most likely diagnosis?",
    optionA: "The book needs more events; add scenes.",
    optionB: "The load-bearing-detail test (M4 L4) hasn't been fully applied, beautiful description that doesn't earn its place is the cumulative cause of \"slow.\" The writer is also showing two M5 L5 signs of done (commas back and forth, no book 2). Both interventions are needed: a final description cull, then ship and start book 2.",
    optionC: "The structural beats are wrong; restart the structural pass.",
    optionD: "The writer should add more dialogue.",
    correctOption: "b",
    explanation:
      "Cross-module, M4 L4's load-bearing test catches the \"good but slow\" failure mode (beautiful prose around non-load-bearing description). M5 L5's signs of done point to over-revision, not incompleteness. The diagnosis is two-part: cut, then ship.",
  },

  // 40 — synthesis (M2 L1 + M5 L3) — manufactured vs structural fix
  {
    questionText:
      "A writer has finished a 90,000-word draft of a literary thriller. She is now in revision. The structural pass has revealed a problem she did not see while drafting: act two's midpoint, around chapter 14, doesn't deliver a true reversal, the protagonist learns new information but does not change course. Beta readers report act two \"loses pull around chapter 14.\" She has two paths: PATH X, rewrite chapter 14 to manufacture the missing reversal (one new chapter, no shuffling). PATH Y, restructure act two so that what is currently the chapter-19 reveal becomes the new midpoint, shifting roughly six chapters earlier (reworking five subsequent chapters' continuity but no new writing). Which is the more disciplined revision move?",
    optionA: "Path X: the diagnosis is local to chapter 14; a local diagnosis warrants a local fix, and writing a new chapter is faster than reworking five.",
    optionB: "Path Y: the diagnosis is structural (the wrong beat is at the wrong place), and structural problems demand structural moves; manufacturing a reversal where the story does not have one is almost always the worse outcome.",
    optionC: "Either path can work; the writer should choose based on which she has more energy for, since both require comparable drafting hours.",
    optionD: "Neither: this is a draft-stage architectural error, and the manuscript should be re-outlined from the midpoint forward before any revision is attempted.",
    correctOption: "b",
    explanation:
      "Synthesises M2 L1 (midpoint as load-bearing structural beat) with M5 L3 (revision pass discipline: structural problems get structural solutions, not scene-level patches). The lesson's working principle: when the diagnosis is \"the right beat is in the wrong place,\" the discipline is to MOVE the right beat, not to manufacture a fake one in the wrong place. (a) is the conventional reach that almost always produces a forced reversal that beta readers will flag again. (c) is false, manufactured reversals and structural restorations produce different books, and the difference is the lesson. (d) is over-correction; this is exactly the revision-stage problem the three-pass discipline is designed to handle.",
  },
];

// Sanity check at module load — guards against accidentally landing
// fewer or more than 40 entries via a bad merge. (Mirrors the
// HEROES.length check pattern from hero-config.ts.)
if (FINAL_EXAM_QUESTIONS.length !== 40) {
  throw new Error(
    `FINAL_EXAM_QUESTIONS: expected 40 entries, got ${FINAL_EXAM_QUESTIONS.length}`,
  );
}

async function seedFinalExamQuestions() {
  const [finalQuiz] = await db
    .select({ id: courseQuizzes.id })
    .from(courseQuizzes)
    .where(eq(courseQuizzes.type, "final"));
  if (!finalQuiz) {
    throw new Error("FINAL_EXAM_QUESTIONS: no final-exam quiz row in DB (run seedQuizzes first)");
  }

  const existing = await db
    .select({ id: courseQuizQuestions.id })
    .from(courseQuizQuestions)
    .where(eq(courseQuizQuestions.quizId, finalQuiz.id));
  if (existing.length > 0) {
    console.log(
      `  final exam questions already present (${existing.length}) — skip`,
    );
    return;
  }

  for (let i = 0; i < FINAL_EXAM_QUESTIONS.length; i++) {
    const q = FINAL_EXAM_QUESTIONS[i];
    await db.insert(courseQuizQuestions).values({
      quizId: finalQuiz.id,
      questionText: q.questionText,
      optionA: q.optionA,
      optionB: q.optionB,
      optionC: q.optionC,
      optionD: q.optionD,
      correctOption: q.correctOption,
      explanation: q.explanation,
      order: i + 1,
    });
  }
  console.log(
    `  final exam questions inserted (${FINAL_EXAM_QUESTIONS.length})`,
  );
}

// ── Editorial updates for already-seeded questions ────────────────────
//
// seedQuizQuestions / seedFinalExamQuestions skip if any rows exist,
// to protect live attempts from in-place text changes. But editorial
// passes (e.g. punctuation cleanup) need a way to push text edits to
// production. This pass UPDATEs the four text fields (questionText,
// optionA-D, explanation) in place when they differ from the bank,
// keyed by (quizId, order). correctOption is intentionally NOT updated
// because changing the right answer would invalidate live attempts.
//
// Idempotent: runs every time, no-ops when DB matches source.
async function updateQuizQuestionsTextFromBanks(slugToId: Map<string, number>) {
  let updated = 0;
  let unchanged = 0;
  for (const bank of QUIZ_BANKS) {
    const moduleId = slugToId.get(bank.moduleSlug);
    if (!moduleId) continue;
    const [quiz] = await db
      .select({ id: courseQuizzes.id })
      .from(courseQuizzes)
      .where(and(eq(courseQuizzes.moduleId, moduleId), eq(courseQuizzes.type, "module")));
    if (!quiz) continue;

    for (let i = 0; i < bank.questions.length; i++) {
      const q = bank.questions[i];
      const order = i + 1;
      const [row] = await db
        .select({
          id: courseQuizQuestions.id,
          questionText: courseQuizQuestions.questionText,
          optionA: courseQuizQuestions.optionA,
          optionB: courseQuizQuestions.optionB,
          optionC: courseQuizQuestions.optionC,
          optionD: courseQuizQuestions.optionD,
          explanation: courseQuizQuestions.explanation,
        })
        .from(courseQuizQuestions)
        .where(and(eq(courseQuizQuestions.quizId, quiz.id), eq(courseQuizQuestions.order, order)));
      if (!row) continue;
      const same =
        row.questionText === q.questionText &&
        row.optionA === q.optionA &&
        row.optionB === q.optionB &&
        row.optionC === q.optionC &&
        row.optionD === q.optionD &&
        row.explanation === q.explanation;
      if (same) {
        unchanged++;
        continue;
      }
      await db
        .update(courseQuizQuestions)
        .set({
          questionText: q.questionText,
          optionA: q.optionA,
          optionB: q.optionB,
          optionC: q.optionC,
          optionD: q.optionD,
          explanation: q.explanation,
        })
        .where(eq(courseQuizQuestions.id, row.id));
      updated++;
    }
  }
  console.log(`  module-quiz text: ${updated} updated, ${unchanged} unchanged`);
}

async function updateFinalExamTextFromBank() {
  const [finalQuiz] = await db
    .select({ id: courseQuizzes.id })
    .from(courseQuizzes)
    .where(eq(courseQuizzes.type, "final"));
  if (!finalQuiz) return;

  let updated = 0;
  let unchanged = 0;
  for (let i = 0; i < FINAL_EXAM_QUESTIONS.length; i++) {
    const q = FINAL_EXAM_QUESTIONS[i];
    const order = i + 1;
    const [row] = await db
      .select({
        id: courseQuizQuestions.id,
        questionText: courseQuizQuestions.questionText,
        optionA: courseQuizQuestions.optionA,
        optionB: courseQuizQuestions.optionB,
        optionC: courseQuizQuestions.optionC,
        optionD: courseQuizQuestions.optionD,
        explanation: courseQuizQuestions.explanation,
      })
      .from(courseQuizQuestions)
      .where(and(eq(courseQuizQuestions.quizId, finalQuiz.id), eq(courseQuizQuestions.order, order)));
    if (!row) continue;
    const same =
      row.questionText === q.questionText &&
      row.optionA === q.optionA &&
      row.optionB === q.optionB &&
      row.optionC === q.optionC &&
      row.optionD === q.optionD &&
      row.explanation === q.explanation;
    if (same) {
      unchanged++;
      continue;
    }
    await db
      .update(courseQuizQuestions)
      .set({
        questionText: q.questionText,
        optionA: q.optionA,
        optionB: q.optionB,
        optionC: q.optionC,
        optionD: q.optionD,
        explanation: q.explanation,
      })
      .where(eq(courseQuizQuestions.id, row.id));
    updated++;
  }
  console.log(`  final-exam text: ${updated} updated, ${unchanged} unchanged`);
}

// ── Arabic translations (Module 1 / Foundation) ───────────────────────
//
// Arabic content lives in two places:
//   1. Lesson markdown bodies → lib/db/content/<module-slug>/<lesson-slug>.ar.md
//      (one parallel file per English .md; only present for translated
//      lessons. Mirror of updateLessonContentFromFiles above.)
//   2. Module metadata + lesson titles + quiz question fields →
//      ARABIC_TRANSLATIONS below (inline, structured by module slug).
//
// Both are pushed to the DB by seedArabicTranslations() into the
// course_content_translations table, which the API layer COALESCEs
// with the English fallback. Idempotent via UPSERT keyed on the
// natural (entity_type, entity_id, lang, field) UNIQUE.
//
// Glossary lock-in 2026-05-07: see course-arabic-glossary.md.

interface QuizQuestionTranslation {
  questionText: string;
  optionA: string;
  optionB: string;
  optionC: string;
  optionD: string;
  explanation: string;
}

interface ModuleTranslation {
  // Module-level fields
  title?: string;
  subtitle?: string;
  description?: string;
  // Lesson titles, keyed by lesson slug
  lessonTitles?: Record<string, string>;
  // Module quiz questions, indexed by `order` (1-based) — the field
  // mirrors the English QUIZ_BANKS array order.
  quizQuestions?: QuizQuestionTranslation[];
}

const ARABIC_TRANSLATIONS: Record<string, ModuleTranslation> = {
  foundation: {
    title: "الأساس",
    subtitle: "قبل أن تكتب: فهم القصة",
    description: "مفاهيم تأسيسيّة يحتاجها كل كاتبٍ قبل أن يسوّد فصلَه الأول.",
    lessonTitles: {
      "foundation-what-is-story": "ما هي القصة؟ (سيكولوجيا السرد)",
      "foundation-why-people-read": "لماذا يقرأ الناس الأدب القصصي",
      "foundation-finding-idea": "كيف تجد فكرة قصّتك",
      "foundation-three-ingredients": "المكوّنات الثلاثة التي تحتاجها كل قصّة",
    },
    quizQuestions: [
      {
        questionText: "أيٌّ مما يلي يطابق تعريف «القصة» المُعطى في الدرس الأول على نحوٍ أفضل؟",
        optionA: "تسلسل أحداثٍ مرتّبةٍ زمنيًّا.",
        optionB: "تسلسلٌ منمّط، شخصٌ ما فيه يريد شيئًا، يصطدم بعائق، ويتغيّر بفعل ما يحدث.",
        optionC: "وصفٌ للحظةٍ لا تُنسى من حياة شخص.",
        optionD: "نسخةٌ من نسج الخيال لأحداثٍ حقيقيّة، مصمّمةٌ للترفيه.",
        explanation:
          "القصة لا تتحدّد بكونها متسلسلةً زمنيًّا (أ)، أو لا تُنسى (ج)، أو من نسج الخيال (د). تتحدّد بنمط الإرادة والعائق والتغيّر. بدون النمط، ما لديك تسلسلٌ أو حكايةٌ قصيرة أو لقطة، لا قصّة.",
      },
      {
        questionText: "حاجج الدرس الثاني بأنّ الأدب القصصي يفعل شيئًا لا تستطيعه الحجج والأدب غير القصصي. أيّ خيارٍ يلتقطه على نحوٍ أفضل؟",
        optionA: "الأدب القصصي أكثر تسلية من الأدب غير القصصي.",
        optionB: "الأدب القصصي أسهل تذكُّرًا من الأدب غير القصصي.",
        optionC: "الأدب القصصي يتيح للقارئ أن يتمرّن على كونه شخصًا آخر، عبر محاكاة خياراته وانفعالاته.",
        optionD: "الأدب القصصي يصل إلى جمهورٍ أوسع لأنّه لا يتطلّب اختصاصًا.",
        explanation:
          "(أ) و(ب) و(د) قد تكون صحيحةً عرضًا، لكنّ الشيء الفريد الذي يفعله الأدب القصصي هو توفير تمرّنٍ على حياةٍ أخرى، بإجراء خيارات الشخصية ومشاعرها على محاكي القارئ نفسه. الحجّة تستطيع أن تصف حياةً أخرى من الخارج؛ الأدب القصصي يضع القارئ داخلها.",
      },
      {
        questionText: "طالبٌ يخبرك أنّ فكرته هي «رجلٌ يبني روبوتًا». ما الخطوة التالية الأنفع؟",
        optionA: "أخبره أنّ الفكرة غير أصيلةٍ بدرجةٍ تجعل استخدامها متعذّرًا.",
        optionB: "أخبره أن يوسّعها إلى مُنطَلَق يضيف الشخصية والموقف والتوتر.",
        optionC: "أخبره أن يبحث عن فكرةٍ أقلّ شيوعًا.",
        optionD: "أخبره أنّ الروبوتات أُنهِكت من كثرة الاستعمال.",
        explanation:
          "الأصالة تعيش في التنفيذ، لا في الفكرة (الدرس الثالث). الإصلاح ليس فكرةً مختلفة: هو ترجمة هذه الفكرة إلى مُنطَلَقٍ فيه شخصٌ برغبةٍ محسوسة وعائقٍ محدّد. «رجلٌ يبني روبوتًا» نواة؛ لا يمكنك أن تكتب من نواة، بل من مُنطَلَق فقط.",
      },
      {
        questionText: "أيٌّ من المُنطَلَقات التالية يحتوي المكوّنات الثلاثة التي تحتاجها كل قصّة (شخصيّةٌ نكترث لها، صراع، تغيّر)؟",
        optionA: "أرملةٌ ترث خلايا نحلٍ من زوجها.",
        optionB: "أرملةٌ ترث خلايا نحلٍ من زوجها، فتعرف أنه احتفظ بها ملاذًا من زواجٍ كان يهمّ بتركه سرًّا، فتقرّر هل تغفر لرجلٍ ميت.",
        optionC: "أرملةٌ في فناء بيتها خلايا نحل، وتكتب عنها في يوميّاتها.",
        optionD: "أرملةٌ تتذكّر متى أراها زوجها الخلايا للمرّة الأولى.",
        explanation:
          "(أ) فكرة، ليست مُنطَلَقًا بعد، لا عائق، لا تغيّر. (ج) أقرب إلى لقطة. (د) ذكرى. (ب) وحدها فيها شخصيّةٌ برغبةٍ محسوسة (الغفران أو الرفض)، وعائقٌ محدّد (الاكتشاف)، وتغيّرٌ ضمنيّ (أيّ القرارين ستتّخذ).",
      },
      {
        questionText: "روايةٌ تنتهي بالبطل وقد حلّ الجريمة، لكنّه الشخص نفسه تمامًا الذي كان عليه في الصفحة الأولى. وفقًا للدرس الرابع، ما الذي يغيب على الأرجح؟",
        optionA: "الشخصيّة ليست محبوبةً بدرجةٍ كافية.",
        optionB: "الصراع لم يكن دراميًّا بدرجةٍ كافية.",
        optionC: "مكوّن التغيّر غائب: الموقف تغيّر، لكنّ الشخصيّة لم تتغيّر.",
        optionD: "الحبكة كانت أقصر من اللازم.",
        explanation:
          "(أ) لا علاقة لها بالأمر: الشخصيّات لا تحتاج أن تكون محبوبةً كي يُكترَث لها (ماكبث، أهاب). (ب) و(د) تصفان أعراضًا، لا الجوهر. المكوّن الغائب هو التغيّر: عائد القارئ يُفترَض أن يكون الفرق بين مَن كانوا ومَن صاروا. لغزٌ يُحلّ بدون حلّاٍّ متحوّل هو حبكةٌ بدون قصّة.",
      },
    ],
  },
};

async function seedArabicTranslations(slugToId: Map<string, number>) {
  const lang = "ar";
  let inserted = 0;
  let updated = 0;
  let unchanged = 0;

  // Helper: idempotent UPSERT keyed on the unique
  // (entity_type, entity_id, lang, field) constraint.
  async function upsert(
    entityType: "lesson" | "module" | "quiz_question",
    entityId: number,
    field: string,
    value: string,
  ) {
    const [existing] = await db
      .select({ id: courseContentTranslations.id, value: courseContentTranslations.value })
      .from(courseContentTranslations)
      .where(
        and(
          eq(courseContentTranslations.entityType, entityType),
          eq(courseContentTranslations.entityId, entityId),
          eq(courseContentTranslations.lang, lang),
          eq(courseContentTranslations.field, field),
        ),
      );
    if (!existing) {
      await db.insert(courseContentTranslations).values({
        entityType, entityId, lang, field, value,
      });
      inserted++;
      return;
    }
    if (existing.value === value) {
      unchanged++;
      return;
    }
    await db
      .update(courseContentTranslations)
      .set({ value, updatedAt: new Date() })
      .where(eq(courseContentTranslations.id, existing.id));
    updated++;
  }

  for (const m of MODULES) {
    const tr = ARABIC_TRANSLATIONS[m.slug];
    if (!tr) continue;
    const moduleId = slugToId.get(m.slug);
    if (!moduleId) continue;

    // Module-level fields
    if (tr.title) await upsert("module", moduleId, "title", tr.title);
    if (tr.subtitle) await upsert("module", moduleId, "subtitle", tr.subtitle);
    if (tr.description) await upsert("module", moduleId, "description", tr.description);

    // Lesson titles + lesson markdown content
    for (const l of m.lessons) {
      const [lessonRow] = await db
        .select({ id: courseLessons.id })
        .from(courseLessons)
        .where(eq(courseLessons.slug, l.slug));
      if (!lessonRow) continue;

      const titleAr = tr.lessonTitles?.[l.slug];
      if (titleAr) await upsert("lesson", lessonRow.id, "title", titleAr);

      // Lesson body: read from <slug>.ar.md if present
      const arPath = resolve(CONTENT_ROOT, m.slug, `${l.slug}.ar.md`);
      if (existsSync(arPath)) {
        const content = readFileSync(arPath, "utf-8");
        await upsert("lesson", lessonRow.id, "content", content);
      }
    }

    // Module quiz question translations
    if (tr.quizQuestions && tr.quizQuestions.length > 0) {
      const [moduleQuiz] = await db
        .select({ id: courseQuizzes.id })
        .from(courseQuizzes)
        .where(and(eq(courseQuizzes.moduleId, moduleId), eq(courseQuizzes.type, "module")));
      if (!moduleQuiz) continue;

      for (let i = 0; i < tr.quizQuestions.length; i++) {
        const q = tr.quizQuestions[i];
        const order = i + 1;
        const [qrow] = await db
          .select({ id: courseQuizQuestions.id })
          .from(courseQuizQuestions)
          .where(and(eq(courseQuizQuestions.quizId, moduleQuiz.id), eq(courseQuizQuestions.order, order)));
        if (!qrow) continue;

        await upsert("quiz_question", qrow.id, "question_text", q.questionText);
        await upsert("quiz_question", qrow.id, "option_a", q.optionA);
        await upsert("quiz_question", qrow.id, "option_b", q.optionB);
        await upsert("quiz_question", qrow.id, "option_c", q.optionC);
        await upsert("quiz_question", qrow.id, "option_d", q.optionD);
        await upsert("quiz_question", qrow.id, "explanation", q.explanation);
      }
    }
  }

  console.log(
    `  ar translations: ${inserted} inserted, ${updated} updated, ${unchanged} unchanged`,
  );
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
  await seedFinalExamQuestions();
  // Editorial sync: pushes text-only edits (punctuation, typos, wording)
  // to existing question rows. No-ops when DB already matches.
  await updateQuizQuestionsTextFromBanks(slugToId);
  await updateFinalExamTextFromBank();
  // Translations: pushes Arabic content (and any other languages added
  // to ARABIC_TRANSLATIONS / *.<lang>.md files) to the translations
  // table. Idempotent, no-ops when DB already matches.
  await seedArabicTranslations(slugToId);
  console.log("Done.");
}

main()
  .then(() => pool.end().then(() => process.exit(0)))
  .catch((err) => {
    console.error("Seed failed:", err);
    pool.end().finally(() => process.exit(1));
  });
