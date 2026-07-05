// Validates the course lesson .md files and patches their content into
// src/course-content/data.json (the runtime source of truth that
// syncCourseContent applies on every API boot). Run after editing any
// lesson markdown:
//
//   node lib/db/scripts/patch-course-content.mjs           # validate + patch
//   node lib/db/scripts/patch-course-content.mjs --check   # validate only
//
// Validation enforces the house rules (no em/en dashes, no double
// hyphens outside a "---" rule line) and lints the ::: directive
// blocks the frontend renderer understands, so a malformed directive
// never reaches production as visible raw text.

import { readFileSync, writeFileSync, readdirSync, statSync } from "node:fs";
import { resolve, dirname, join, basename } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const CONTENT_DIR = resolve(__dirname, "..", "content");
const DATA_JSON = resolve(__dirname, "..", "src", "course-content", "data.json");
const CHECK_ONLY = process.argv.includes("--check");

const FENCED_DIRECTIVES = new Set(["takeaway", "check", "exercise", "checklist", "example", "quote"]);
const VIDEO_ID_RE = /^[A-Za-z0-9_-]{11}$/;

// ── Collect lesson files ─────────────────────────────────────────────
const files = [];
for (const dir of readdirSync(CONTENT_DIR)) {
  const full = join(CONTENT_DIR, dir);
  if (!statSync(full).isDirectory()) continue;
  for (const f of readdirSync(full)) {
    if (f.endsWith(".md")) files.push(join(full, f));
  }
}
if (files.length === 0) {
  console.error("No lesson .md files found under " + CONTENT_DIR);
  process.exit(1);
}

// ── Validate ─────────────────────────────────────────────────────────
const errors = [];
const lessons = new Map(); // slug -> content

for (const file of files) {
  const slug = basename(file, ".md");
  const raw = readFileSync(file, "utf-8").replace(/\r\n/g, "\n").replace(/^﻿/, "");
  const lines = raw.split("\n");
  const err = (msg) => errors.push(`${slug}: ${msg}`);

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
  const counts = { video: 0, takeaway: 0, check: 0, exercise: 0, checklist: 0, example: 0, quote: 0 };
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

  lessons.set(slug, { content: raw.trimEnd() + "\n", counts });
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
const missing = [];
for (const lesson of data.lessons) {
  const md = lessons.get(lesson.slug);
  if (!md) {
    missing.push(lesson.slug);
    continue;
  }
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
if (missing.length) console.warn("No .md file for data.json lessons: " + missing.join(", "));

const orphaned = [...lessons.keys()].filter((s) => !data.lessons.some((l) => l.slug === s));
if (orphaned.length) console.warn(".md files with no data.json lesson: " + orphaned.join(", "));

if (CHECK_ONLY) {
  console.log(`\nValidation passed. ${patched} lesson(s) would be updated.`);
  process.exit(0);
}

writeFileSync(DATA_JSON, JSON.stringify(data, null, 2) + "\n", "utf-8");
console.log(`\nPatched ${patched} lesson(s) into data.json.`);
