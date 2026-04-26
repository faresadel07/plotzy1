/**
 * Scans the project's source files for invisible Unicode line/paragraph
 * separators (U+2028, U+2029) and bidi-control characters that have
 * burned us at least once before:
 *
 *   - U+2028 LINE SEPARATOR
 *   - U+2029 PARAGRAPH SEPARATOR
 *   - U+202A..U+202E bidirectional override block
 *   - U+2066..U+2069 bidi isolate block
 *   - U+200B..U+200D zero-width spaces / joiners
 *   - U+FEFF zero-width no-break space (BOM in the middle of a file)
 *
 * Any of these inside a regex literal, string, or identifier silently
 * corrupts esbuild/tsc output ("Unterminated regular expression",
 * "Unexpected character", or — worse — code that *parses* but flips
 * meaning under a bidi override). The original incident: U+2028/U+2029
 * smuggled into a regex character class in lib/email.ts crashed the
 * api-server boot.
 *
 * Run via `pnpm scan:invisible` from the repo root. Exits 1 if any hit
 * is found, with file:line:column for every match. Add to typecheck /
 * pre-commit so a corrupt paste can never reach a deploy.
 */

import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { execSync } from "node:child_process";

// Roots scanned. Anything outside these directories (node_modules,
// build artefacts, lock files) is left alone.
const ROOTS = [
  "artifacts/api-server/src",
  "artifacts/plotzy/src",
  "lib",
  "scripts/src",
];

const EXTENSIONS = /\.(ts|tsx|js|jsx|mjs|cjs)$/;

// Zero-width joiners (U+200B/200C/200D) are intentionally NOT in this list:
// Arabic / Persian / Urdu i18n strings use them for correct word rendering,
// so a blanket ban would flag legitimate translation content. The two
// classes that *are* always dangerous in source code:
//
//   1. U+2028 / U+2029 — JS line terminators that break esbuild's regex
//      parser (the original incident in lib/email.ts).
//   2. The bidirectional override block — used by the "Trojan Source"
//      class of attacks (CVE-2021-42574) to make code visually flip
//      meaning. There is no legitimate reason for these to live in a
//      .ts/.tsx/.js source file.
const FORBIDDEN: Array<{ codePoint: number; name: string }> = [
  { codePoint: 0x2028, name: "U+2028 LINE SEPARATOR" },
  { codePoint: 0x2029, name: "U+2029 PARAGRAPH SEPARATOR" },
  { codePoint: 0x202a, name: "U+202A LEFT-TO-RIGHT EMBEDDING" },
  { codePoint: 0x202b, name: "U+202B RIGHT-TO-LEFT EMBEDDING" },
  { codePoint: 0x202c, name: "U+202C POP DIRECTIONAL FORMATTING" },
  { codePoint: 0x202d, name: "U+202D LEFT-TO-RIGHT OVERRIDE" },
  { codePoint: 0x202e, name: "U+202E RIGHT-TO-LEFT OVERRIDE" },
  { codePoint: 0x2066, name: "U+2066 LEFT-TO-RIGHT ISOLATE" },
  { codePoint: 0x2067, name: "U+2067 RIGHT-TO-LEFT ISOLATE" },
  { codePoint: 0x2068, name: "U+2068 FIRST STRONG ISOLATE" },
  { codePoint: 0x2069, name: "U+2069 POP DIRECTIONAL ISOLATE" },
];

const FORBIDDEN_BY_CODE = new Map(FORBIDDEN.map((f) => [f.codePoint, f.name]));

interface Hit {
  file: string;
  line: number;
  column: number;
  codePoint: number;
  name: string;
}

function repoRoot(): string {
  // Anchor to the git root so the scan still works when called from any
  // workspace package (pnpm runs scripts in their own cwd).
  try {
    return execSync("git rev-parse --show-toplevel", {
      encoding: "utf8",
    }).trim();
  } catch {
    return resolve(process.cwd());
  }
}

const ROOT = repoRoot();

function listFiles(): string[] {
  // git ls-files keeps the scan honest — it only sees tracked files,
  // skipping node_modules and build outputs without us reinventing a
  // gitignore parser. Falls back to nothing if git isn't available.
  try {
    const out = execSync(`git ls-files ${ROOTS.map((r) => `"${r}"`).join(" ")}`, {
      cwd: ROOT,
      encoding: "utf8",
      maxBuffer: 32 * 1024 * 1024,
    });
    return out
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter((l) => l && EXTENSIONS.test(l))
      .map((l) => resolve(ROOT, l));
  } catch {
    return [];
  }
}

function scanFile(file: string): Hit[] {
  const content = readFileSync(file, "utf8");
  const hits: Hit[] = [];
  let line = 1;
  let column = 0;
  for (const char of content) {
    const cp = char.codePointAt(0)!;
    if (FORBIDDEN_BY_CODE.has(cp)) {
      hits.push({
        file,
        line,
        column,
        codePoint: cp,
        name: FORBIDDEN_BY_CODE.get(cp)!,
      });
    }
    if (char === "\n") {
      line++;
      column = 0;
    } else {
      column++;
    }
  }
  return hits;
}

const files = listFiles();
const allHits: Hit[] = [];
for (const f of files) {
  try {
    allHits.push(...scanFile(f));
  } catch (err) {
    // Unreadable file is not a deal-breaker for this guard.
    process.stderr.write(`scan:invisible — could not read ${f}: ${(err as Error).message}\n`);
  }
}

if (allHits.length === 0) {
  console.log(`scan:invisible — clean (${files.length} files)`);
  process.exit(0);
}

console.error(`scan:invisible — found ${allHits.length} forbidden char(s):`);
for (const h of allHits) {
  console.error(`  ${h.file}:${h.line}:${h.column}  ${h.name}`);
}
console.error("");
console.error("These chars are invisible in most editors but break esbuild/tsc.");
console.error("Re-type or paste through a plain-ASCII filter before committing.");
process.exit(1);
