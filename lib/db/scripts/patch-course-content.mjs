// Validates the course lesson .md files and patches their content into
// src/course-content/data.json (the runtime source of truth that
// syncCourseContent applies on every API boot). Run after editing any
// lesson markdown:
//
//   node lib/db/scripts/patch-course-content.mjs           # validate + patch
//   node lib/db/scripts/patch-course-content.mjs --check   # validate only
//
// Sources:
//   lib/db/content/<module>/<slug>.md        English lesson bodies
//   lib/db/content-ar/<module>/<slug>.md     Arabic lesson bodies; the
//                                            first "# heading" becomes
//                                            the lesson's title_ar
//   lib/db/content-ar/meta.json              Arabic module titles:
//                                            { "<module-slug>": { title_ar, subtitle_ar, description_ar } }
//   lib/db/content-ar/quiz-translations.json Arabic question fields:
//                                            { "<quiz-key>": { "<order>": { question_text_ar, option_a_ar..d, explanation_ar } } }
//                                            quiz-key is "final" or the module slug
//
// All Arabic sources are optional; missing pieces stay null in
// data.json and the API falls back to English.
//
// Validation enforces the house rules (no em/en dashes, no double
// hyphens outside a "---" rule line) and lints the ::: directive
// blocks the frontend renderer understands, so a malformed directive
// never reaches production as visible raw text.

import { readFileSync, writeFileSync, readdirSync, statSync, existsSync } from "node:fs";
import { resolve, dirname, join, basename } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const CONTENT_DIR = resolve(__dirname, "..", "content");
const CONTENT_AR_DIR = resolve(__dirname, "..", "content-ar");
const DATA_JSON = resolve(__dirname, "..", "src", "course-content", "data.json");
const CHECK_ONLY = process.argv.includes("--check");

const FENCED_DIRECTIVES = new Set(["takeaway", "check", "exercise", "checklist", "example", "quote", "cards"]);
// Single-line directives (no closing fence) besides video.
const SINGLE_LINE_DIRECTIVES = new Set(["diagram", "resource"]);
const VIDEO_ID_RE = /^[A-Za-z0-9_-]{11}$/;
const DIAGRAM_NAMES = new Set([
  "three-act-curve", "heros-journey-circle", "beat-map", "scene-value-shift",
  "wound-want-need", "pov-distances", "tension-curve", "revision-funnel",
  "publishing-paths", "premise-formula", "story-vs-plot", "show-dont-tell-iceberg",
]);

// ── Collect lesson files ─────────────────────────────────────────────
function collectLessonFiles(rootDir) {
  const out = [];
  if (!existsSync(rootDir)) return out;
  for (const dir of readdirSync(rootDir)) {
    const full = join(rootDir, dir);
    if (!statSync(full).isDirectory()) continue;
    for (const f of readdirSync(full)) {
      if (f.endsWith(".md")) out.push(join(full, f));
    }
  }
  return out;
}

const files = collectLessonFiles(CONTENT_DIR);
if (files.length === 0) {
  console.error("No lesson .md files found under " + CONTENT_DIR);
  process.exit(1);
}
const filesAr = collectLessonFiles(CONTENT_AR_DIR);

// ── Validate ─────────────────────────────────────────────────────────
const errors = [];
const lessons = new Map(); // slug -> { content, counts }
const lessonsAr = new Map(); // slug -> { content, title, counts }

function validateLessonFile(file, langTag, target) {
  const slug = basename(file, ".md");
  const raw = readFileSync(file, "utf-8").replace(/\r\n/g, "\n").replace(/^﻿/, "");
  const lines = raw.split("\n");
  const err = (msg) => errors.push(`${langTag}/${slug}: ${msg}`);

  if (!/^# .+/.test(lines[0] ?? "")) err("first line must be a '# Title' heading");

  // Forbidden characters. "---" alone on a line is a horizontal rule
  // and allowed; any other double hyphen is not.
  if (/[—–―−]/.test(raw)) err("contains an em/en dash");
  for (let n = 0; n < lines.length; n++) {
    const l = lines[n];
    if (l.trim() === "---") continue;
    if (l.includes("--")) err(`double hyphen on line ${n + 1}: ${l.trim().slice(0, 60)}`);
  }

  // Directive lint.
  let open = null; // { name, line }
  const counts = { video: 0, takeaway: 0, check: 0, exercise: 0, checklist: 0, example: 0, quote: 0, cards: 0, diagram: 0, resource: 0 };
  for (let n = 0; n < lines.length; n++) {
    const l = lines[n];
    if (!l.startsWith(":::")) continue;
    const header = l.slice(3).trim();

    if (header === "") {
      if (!open) err(`closing ::: with no open directive at line ${n + 1}`);
      open = null;
      continue;
    }
    const name = header.split(/[\s|]/)[0];
    if (open) {
      err(`directive '${name}' opened at line ${n + 1} while '${open.name}' from line ${open.line} is still open`);
      open = null;
    }
    if (name === "video") {
      const parts = header.slice(5).split("|").map((p) => p.trim());
      if (!VIDEO_ID_RE.test(parts[0] ?? "")) err(`bad video id at line ${n + 1}: '${parts[0]}'`);
      if (!parts[1]) err(`video at line ${n + 1} is missing a display title`);
      counts.video++;
      continue; // single-line, no fence
    }
    if (SINGLE_LINE_DIRECTIVES.has(name)) {
      const parts = header.slice(name.length).split("|").map((p) => p.trim());
      if (name === "diagram" && !DIAGRAM_NAMES.has(parts[0] ?? "")) {
        err(`unknown diagram '${parts[0]}' at line ${n + 1}`);
      }
      if (name === "resource") {
        if (!/^[a-z0-9-]+\.(pdf|zip)$/i.test(parts[0] ?? "")) err(`bad resource filename at line ${n + 1}: '${parts[0]}'`);
        if (!parts[1]) err(`resource at line ${n + 1} is missing a label`);
      }
      counts[name] = (counts[name] ?? 0) + 1;
      continue;
    }
    if (!FENCED_DIRECTIVES.has(name)) {
      err(`unknown directive '${name}' at line ${n + 1}`);
      continue;
    }
    counts[name]++;
    open = { name, line: n + 1 };
  }
  if (open) err(`directive '${open.name}' at line ${open.line} never closed`);

  // Check-block shape: needs Q:, at least 2 options, exactly one -* line.
  const checkBodies = raw.match(/^:::check\n([\s\S]*?)^:::$/gm) ?? [];
  for (const block of checkBodies) {
    const hasQ = /^\s*Q:/m.test(block);
    const correct = (block.match(/^\s*-\*/gm) ?? []).length;
    const opts = (block.match(/^\s*-[* ]/gm) ?? []).length;
    if (!hasQ || correct !== 1 || opts < 2) {
      err("a :::check block is malformed (needs Q:, 2+ options, exactly one -* correct)");
    }
  }

  const title = (lines[0] ?? "").replace(/^#\s*/, "").trim();
  target.set(slug, { content: raw.trimEnd() + "\n", title, counts });
}

for (const file of files) validateLessonFile(file, "en", lessons);
for (const file of filesAr) validateLessonFile(file, "ar", lessonsAr);

// ── Arabic meta + quiz translations (optional files) ─────────────────
const noDash = (s) => typeof s !== "string" || !/[—–―−]|--/.test(s);

let metaAr = {};
const META_AR = join(CONTENT_AR_DIR, "meta.json");
if (existsSync(META_AR)) {
  metaAr = JSON.parse(readFileSync(META_AR, "utf-8"));
  for (const [slug, m] of Object.entries(metaAr)) {
    for (const k of ["title_ar", "subtitle_ar", "description_ar"]) {
      if (m[k] != null && !noDash(m[k])) errors.push(`meta.json ${slug}.${k}: contains a dash`);
    }
  }
}

let quizAr = {};
const QUIZ_AR = join(CONTENT_AR_DIR, "quiz-translations.json");
if (existsSync(QUIZ_AR)) {
  quizAr = JSON.parse(readFileSync(QUIZ_AR, "utf-8"));
  for (const [key, byOrder] of Object.entries(quizAr)) {
    for (const [order, q] of Object.entries(byOrder)) {
      const required = ["question_text_ar", "option_a_ar", "option_b_ar", "option_c_ar", "option_d_ar"];
      for (const k of required) {
        if (typeof q[k] !== "string" || !q[k].trim()) errors.push(`quiz-translations ${key}#${order}: missing ${k}`);
      }
      for (const [k, v] of Object.entries(q)) {
        if (!noDash(v)) errors.push(`quiz-translations ${key}#${order}.${k}: contains a dash`);
      }
    }
  }
}

if (errors.length) {
  console.error(`VALIDATION FAILED (${errors.length}):`);
  for (const e of errors) console.error("  " + e);
  process.exit(1);
}

// ── Patch data.json ──────────────────────────────────────────────────
const data = JSON.parse(readFileSync(DATA_JSON, "utf-8"));
if (!Array.isArray(data.lessons)) {
  console.error("data.json has no lessons array");
  process.exit(1);
}

let patched = 0;
let patchedAr = 0;
const missing = [];
for (const lesson of data.lessons) {
  const md = lessons.get(lesson.slug);
  if (!md) {
    missing.push(lesson.slug);
  } else {
    if (lesson.content !== md.content) {
      lesson.content = md.content;
      patched++;
    }
    const c = md.counts;
    console.log(
      `${lesson.slug}: video x${c.video}, check x${c.check}, takeaway x${c.takeaway}, ` +
      `exercise x${c.exercise}, example x${c.example}, quote x${c.quote}, checklist x${c.checklist}`,
    );
  }
  const ar = lessonsAr.get(lesson.slug);
  if (ar) {
    if (lesson.content_ar !== ar.content || lesson.title_ar !== ar.title) {
      lesson.content_ar = ar.content;
      lesson.title_ar = ar.title;
      patchedAr++;
    }
  } else if (lesson.content_ar === undefined) {
    lesson.content_ar = null;
    lesson.title_ar = null;
  }
}
if (missing.length) console.warn("No .md file for data.json lessons: " + missing.join(", "));

const orphaned = [...lessons.keys()].filter((s) => !data.lessons.some((l) => l.slug === s));
if (orphaned.length) console.warn(".md files with no data.json lesson: " + orphaned.join(", "));
const orphanedAr = [...lessonsAr.keys()].filter((s) => !data.lessons.some((l) => l.slug === s));
if (orphanedAr.length) console.warn("Arabic .md files with no data.json lesson: " + orphanedAr.join(", "));

// ── Module Arabic meta ───────────────────────────────────────────────
let patchedModules = 0;
for (const mod of data.modules) {
  const m = metaAr[mod.slug];
  if (m) {
    if (mod.title_ar !== m.title_ar || mod.subtitle_ar !== m.subtitle_ar || mod.description_ar !== m.description_ar) {
      mod.title_ar = m.title_ar ?? null;
      mod.subtitle_ar = m.subtitle_ar ?? null;
      mod.description_ar = m.description_ar ?? null;
      patchedModules++;
    }
  } else if (mod.title_ar === undefined) {
    mod.title_ar = null;
    mod.subtitle_ar = null;
    mod.description_ar = null;
  }
}

// ── Question Arabic translations ─────────────────────────────────────
// quiz key resolution mirrors course-content/index.ts: "final" for the
// final exam, module slug for module quizzes.
const moduleSlugById = new Map(data.modules.map((m) => [m.id, m.slug]));
const quizKeyById = new Map(
  data.quizzes.map((q) => [q.id, q.type === "final" ? "final" : moduleSlugById.get(q.module_id)]),
);
let patchedQuestions = 0;
const unmatchedAr = [];
for (const q of data.questions) {
  const key = quizKeyById.get(q.quiz_id);
  const tr = quizAr[key]?.[String(q.order)];
  if (tr) {
    q.question_text_ar = tr.question_text_ar;
    q.option_a_ar = tr.option_a_ar;
    q.option_b_ar = tr.option_b_ar;
    q.option_c_ar = tr.option_c_ar;
    q.option_d_ar = tr.option_d_ar;
    q.explanation_ar = tr.explanation_ar ?? null;
    patchedQuestions++;
  } else if (q.question_text_ar === undefined) {
    q.question_text_ar = null;
    q.option_a_ar = null;
    q.option_b_ar = null;
    q.option_c_ar = null;
    q.option_d_ar = null;
    q.explanation_ar = null;
  }
}
for (const [key, byOrder] of Object.entries(quizAr)) {
  for (const order of Object.keys(byOrder)) {
    const hit = data.questions.some((q) => quizKeyById.get(q.quiz_id) === key && String(q.order) === order);
    if (!hit) unmatchedAr.push(`${key}#${order}`);
  }
}
if (unmatchedAr.length) console.warn("quiz translations with no matching question: " + unmatchedAr.join(", "));

const summary =
  `${patched} EN lesson(s), ${patchedAr} AR lesson(s), ${patchedModules} module meta, ` +
  `${patchedQuestions} question translation(s)`;

if (CHECK_ONLY) {
  console.log(`\nValidation passed. Would update: ${summary}.`);
  process.exit(0);
}

writeFileSync(DATA_JSON, JSON.stringify(data, null, 2) + "\n", "utf-8");

// Emit a tiny frontend map of what each lesson contains so catalog
// surfaces (lesson cards) can advertise the goods without shipping the
// content itself. Derived from the EN lesson counts.
const FEATURES_TS = resolve(__dirname, "..", "..", "..", "artifacts", "plotzy", "src", "lib", "course-lesson-features.ts");
const featureLines = [...lessons.entries()]
  .sort(([a], [b]) => a.localeCompare(b))
  .map(([slug, l]) => {
    const c = l.counts;
    const parts = [
      `videos: ${c.video ?? 0}`,
      `checks: ${c.check ?? 0}`,
      `exercises: ${c.exercise ?? 0}`,
      `examples: ${c.example ?? 0}`,
      `diagrams: ${c.diagram ?? 0}`,
      `cards: ${c.cards ?? 0}`,
      `resources: ${c.resource ?? 0}`,
    ];
    return `  "${slug}": { ${parts.join(", ")} },`;
  });
writeFileSync(
  FEATURES_TS,
  [
    "// AUTO-GENERATED by lib/db/scripts/patch-course-content.mjs. Do not edit.",
    "// What each course lesson contains, for catalog chips.",
    "export interface LessonFeatures {",
    "  videos: number; checks: number; exercises: number; examples: number;",
    "  diagrams: number; cards: number; resources: number;",
    "}",
    "export const LESSON_FEATURES: Record<string, LessonFeatures> = {",
    ...featureLines,
    "};",
    "",
  ].join("\n"),
  "utf-8",
);
console.log(`\nPatched into data.json: ${summary}. Features map emitted.`);
