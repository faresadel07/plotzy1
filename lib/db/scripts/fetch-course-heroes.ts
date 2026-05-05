/**
 * DEFERRED: Batch 2.7 B2 paused pre-launch. Script ready to resume when
 * hero images are sourced. See chore/defer-batch-2-7-b2 commit message
 * for the 9 photos that were curated and tested pre-defer (Batch A + B).
 */

/**
 * Fetch curated Unsplash hero images and produce JPEG + WebP variants
 * for the Plotzy writing course (Batch 2.7 B2).
 *
 * Reads hero-config.ts. For each entry whose `source.cdnUrl` is non-empty,
 * downloads the image, converts via sharp to:
 *   - JPEG q=82 (mozjpeg, ~80–110 KB target)
 *   - WebP q=82 (~60–85 KB target, served via <picture> when supported)
 * Writes to artifacts/plotzy/public/course-visuals/heroes/{slug}.{jpg,webp}.
 *
 * No money spent — Unsplash is free under their license. The Unsplash
 * CDN URLs include ?w=1920&q=85&auto=format&fit=crop so we get a sensibly
 * sized source without a separate resize step.
 *
 * CLI flags (after `--`):
 *   --slug=<slug>        Fetch (or refetch, force) only one slug.
 *   --batch=A|B|C|D|E    Fetch all curated lessons in the named batch.
 *   --force              Refetch even if the .jpg already exists on disk.
 *
 * Without --slug / --batch / --force, the run is idempotent: any slug
 * whose .jpg already exists is skipped.
 *
 * Run:
 *   pnpm --filter @workspace/db run fetch:heroes -- --batch=A
 */

import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";
import { HEROES, READY_HEROES, type HeroSpec, type HeroBatch } from "./hero-config";

const __dirname = dirname(fileURLToPath(import.meta.url));

// ── CLI args ─────────────────────────────────────────────────────────
function getFlag(name: string): string | undefined {
  const prefix = `--${name}=`;
  const arg = process.argv.find((a) => a.startsWith(prefix));
  return arg?.slice(prefix.length);
}
function hasFlag(name: string): boolean {
  return process.argv.includes(`--${name}`);
}

const flagSlug = getFlag("slug");
const flagBatch = getFlag("batch") as HeroBatch | undefined;
const flagForce = hasFlag("force");

if (flagBatch && !["A", "B", "C", "D", "E"].includes(flagBatch)) {
  console.error(`Invalid --batch: ${flagBatch}. Must be A, B, C, D, or E.`);
  process.exit(1);
}
if (flagSlug && !HEROES.find((h) => h.slug === flagSlug)) {
  console.error(`Invalid --slug: ${flagSlug}. Not in hero-config.ts.`);
  process.exit(1);
}

// ── Filter the work list ─────────────────────────────────────────────
let queue: HeroSpec[] = READY_HEROES;
if (flagSlug) {
  queue = HEROES.filter((h) => h.slug === flagSlug);
  if (queue[0] && !queue[0].source.cdnUrl) {
    console.error(`Slug "${flagSlug}" has no cdnUrl in hero-config.ts yet — nothing to fetch.`);
    process.exit(1);
  }
} else if (flagBatch) {
  queue = HEROES.filter((h) => h.batch === flagBatch && h.source.cdnUrl);
  if (queue.length === 0) {
    console.error(`No curated entries in batch ${flagBatch} (cdnUrl is empty for all).`);
    process.exit(1);
  }
}

// ── Output dir ───────────────────────────────────────────────────────
const OUT_DIR = resolve(
  __dirname,
  "..",
  "..",
  "..",
  "artifacts",
  "plotzy",
  "public",
  "course-visuals",
  "heroes",
);
mkdirSync(OUT_DIR, { recursive: true });

function shouldSkip(spec: HeroSpec): boolean {
  if (flagForce || flagSlug || flagBatch) return false;
  return existsSync(resolve(OUT_DIR, `${spec.slug}.jpg`));
}

// ── Main ─────────────────────────────────────────────────────────────
async function main() {
  console.log(`\n— Course hero fetcher (Batch 2.7 B2) —`);
  console.log(`Output dir:  ${OUT_DIR}`);
  console.log(`Curated:     ${READY_HEROES.length}/${HEROES.length} entries have cdnUrl set`);
  if (flagSlug) console.log(`--slug:      ${flagSlug}`);
  if (flagBatch) console.log(`--batch:     ${flagBatch}`);
  if (flagForce) console.log(`--force:     yes`);

  const work: HeroSpec[] = [];
  const skipped: HeroSpec[] = [];
  for (const spec of queue) {
    if (shouldSkip(spec)) skipped.push(spec);
    else work.push(spec);
  }

  console.log(
    `Queue:       ${queue.length} candidate(s) — ${work.length} to fetch, ${skipped.length} skipped (already on disk)`,
  );
  if (skipped.length) {
    console.log(`Skipped:     ${skipped.map((s) => s.slug).join(", ")}`);
  }

  if (work.length === 0) {
    console.log("\nNothing to do.\n");
    return;
  }

  let totalJpegBytes = 0;
  let totalWebpBytes = 0;
  let succeeded = 0;
  let failed = 0;

  for (let i = 0; i < work.length; i++) {
    const spec = work[i];
    const t0 = Date.now();
    console.log(
      `[${i + 1}/${work.length}] ${spec.slug}  [${spec.module} · batch ${spec.batch}]`,
    );

    try {
      const resp = await fetch(spec.source.cdnUrl);
      if (!resp.ok) {
        throw new Error(`HTTP ${resp.status} ${resp.statusText}`);
      }
      const buf = Buffer.from(await resp.arrayBuffer());

      // Resize to 1600px max width and convert. Unsplash returns the
      // requested w=1920 source, but at 1600 the file size drops ~40%
      // with no visible loss on a 21:9 hero (max ~1400px display on a
      // 4K monitor). WebP at q=72 visually equals JPEG q≈85.
      const jpegBuf = await sharp(buf)
        .resize({ width: 1600, withoutEnlargement: true })
        .jpeg({ quality: 80, mozjpeg: true })
        .toBuffer();
      const webpBuf = await sharp(buf)
        .resize({ width: 1600, withoutEnlargement: true })
        .webp({ quality: 72 })
        .toBuffer();

      const jpgPath = resolve(OUT_DIR, `${spec.slug}.jpg`);
      const webpPath = resolve(OUT_DIR, `${spec.slug}.webp`);
      writeFileSync(jpgPath, jpegBuf);
      writeFileSync(webpPath, webpBuf);

      totalJpegBytes += jpegBuf.length;
      totalWebpBytes += webpBuf.length;
      succeeded++;
      const t = ((Date.now() - t0) / 1000).toFixed(1);
      console.log(
        `   ✓ ${(jpegBuf.length / 1024).toFixed(0)} KB jpg + ${(webpBuf.length / 1024).toFixed(0)} KB webp — ${t}s — by ${spec.source.photographer}`,
      );

      // Be polite to Unsplash CDN.
      if (i < work.length - 1) await new Promise((r) => setTimeout(r, 500));
    } catch (err) {
      failed++;
      console.error(`   ✗ failed: ${spec.slug}`, err);
    }
  }

  console.log(
    `\nDone. ${succeeded} succeeded, ${failed} failed. ` +
      `Wrote ${(totalJpegBytes / 1024).toFixed(0)} KB jpg + ${(totalWebpBytes / 1024).toFixed(0)} KB webp.\n`,
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
