/**
 * Hero-image config for the Plotzy writing course (Batch 2.7 B2).
 *
 * One entry per lesson (27 total). All sourced from Unsplash with
 * photographer attribution. Some lessons may fall back to Pexels
 * or Pixabay if Unsplash doesn't have a fitting image (those use
 * the same `source` shape, just with a different `provider`).
 *
 * Curation discipline (from B2 Phase A approval):
 *   warm earth tones, soft natural light, muted palette, no people
 *   unless specified, breathing room around the subject. Curated FOR
 *   the locked aesthetic, not generated to it.
 *
 * Batches A–E group lessons for the tiered review pacing.
 */

export type HeroBatch = "A" | "B" | "C" | "D" | "E";
export type HeroProvider = "unsplash" | "pexels" | "pixabay";

export interface HeroSpec {
  slug: string;
  module: string;
  batch: HeroBatch;
  /**
   * Concept tag (mirrors the original SUBJECT_CLAUSE intent). Kept
   * for review context only — the actual image is the curated photo.
   */
  concept: string;
  /** Photo source. */
  source: {
    provider: HeroProvider;
    /** Direct CDN URL we download from (we ask for ?w=1920&q=85&auto=format&fit=crop). */
    cdnUrl: string;
    /** Canonical photo page (used as the `href` on the figcaption). */
    pageUrl: string;
    /** "Jane Doe" — used in caption "Photo: Jane Doe / Unsplash". */
    photographer: string;
    /** Photographer's profile URL (kept for completeness; not currently rendered). */
    photographerUrl: string;
    /** "Unsplash License" | "Pexels License" | "Pixabay Content License". */
    license: string;
  };
  /** Mandatory <Hero alt={…}>. */
  altText: string;
  /** Visible caption (DP2 = captions visible by default). */
  caption: string;
  /** One-sentence rationale for review (not rendered). */
  rationale: string;
}

// =============================================================================
// HEROES — keep order grouped by batch, then by lesson order within each batch
// =============================================================================
//
// CURATION STATUS:
//   All batches: STUBS. Batch 2.7 B2 (hero curation) deferred pre-launch.
//   Resume path: refill source.cdnUrl + photographer + pageUrl + license
//   per entry, then run fetch-course-heroes.ts. The 9 specific photos
//   that were curated and tested pre-defer (Batch A + partial Batch B)
//   are recorded in the chore/defer-batch-2-7-b2 commit message.
// =============================================================================

export const HEROES: HeroSpec[] = [
  // ── Batch A — one lesson per module M1-M5 (the original style-test set) ──
  { slug: "foundation-what-is-story",     module: "M1", batch: "A", concept: "A textured field of open book pages — attention as a surface",       source: { provider: "unsplash", cdnUrl: "", pageUrl: "", photographer: "", photographerUrl: "", license: "Unsplash License" }, altText: "A wide field of open book pages forming a textured warm-toned pattern",          caption: "", rationale: "Pages as the surface of stories — sets the diagnostic, definitional register." },
  { slug: "architecture-three-acts",      module: "M2", batch: "A", concept: "Classical architecture — colonnade view toward another structure",   source: { provider: "unsplash", cdnUrl: "", pageUrl: "", photographer: "", photographerUrl: "", license: "Unsplash License" }, altText: "Ancient temple columns framing a view toward another classical structure",        caption: "", rationale: "Visual anchor for the oldest surviving story-structure framework." },
  { slug: "characters-protagonist-wound", module: "M3", batch: "A", concept: "A solitary lived-in object lit from outside the frame",              source: { provider: "unsplash", cdnUrl: "", pageUrl: "", photographer: "", photographerUrl: "", license: "Unsplash License" }, altText: "A single weathered object on a wooden surface with a long shadow alongside",       caption: "", rationale: "Figures the wound as something nearby but unspoken." },
  { slug: "world-sensory-writing",        module: "M4", batch: "A", concept: "A disciplined still life — one focal subject with stray fragments",  source: { provider: "unsplash", cdnUrl: "", pageUrl: "", photographer: "", photographerUrl: "", license: "Unsplash License" }, altText: "A small bowl on weathered wood with stray pieces alongside in soft side light",    caption: "", rationale: "The restraint of the image embodies the restraint the lesson preaches." },
  { slug: "process-blank-page",           module: "M5", batch: "A", concept: "Open blank notebook with a pen across it — moment before the word",  source: { provider: "unsplash", cdnUrl: "", pageUrl: "", photographer: "", photographerUrl: "", license: "Unsplash License" }, altText: "An open blank ruled notebook on a wooden desk with a pen lying across the pages",  caption: "", rationale: "Direct visual rhyme with the lesson title." },

  // ── Batch B — remaining M1 (3) + start M2 (1) ──────────────────────
  { slug: "foundation-why-people-read",   module: "M1", batch: "B", concept: "An empty reading spot — chair facing windows, no one there",         source: { provider: "unsplash", cdnUrl: "", pageUrl: "", photographer: "", photographerUrl: "", license: "Unsplash License" }, altText: "An empty armchair in a dim interior facing a wall of windows opening to leaves",   caption: "", rationale: "Reading as a solitary withdrawn act — the empty chair invites the viewer." },
  { slug: "foundation-finding-idea",      module: "M1", batch: "B", concept: "An open notebook of cursive notes — pre-organisational thought",     source: { provider: "unsplash", cdnUrl: "", pageUrl: "", photographer: "", photographerUrl: "", license: "Unsplash License" }, altText: "A close-up of an open notebook filled with handwritten cursive text",             caption: "", rationale: "Ideas in their raw captured-as-they-come form." },
  { slug: "foundation-three-ingredients", module: "M1", batch: "B", concept: "Three small distinct vessels in triangular composition on linen",    source: { provider: "unsplash", cdnUrl: "", pageUrl: "", photographer: "", photographerUrl: "", license: "Unsplash License" }, altText: "Overhead view of three small ceramic vessels arranged on a linen cloth",          caption: "", rationale: "Three offerings — the lesson's metaphor without forcing it." },
  { slug: "architecture-heros-journey",   module: "M2", batch: "B", concept: "Sunlight through a doorway — bars of light across a dark interior",  source: { provider: "unsplash", cdnUrl: "", pageUrl: "", photographer: "", photographerUrl: "", license: "Unsplash License" }, altText: "A dim interior with sunlight casting long bars of light across the floor",        caption: "", rationale: "Threshold-crossing — interior darkness, exterior light, the path." },

  // ── Batch C — remaining M2 (2) + start M3 (3) ──────────────────────
  { slug: "architecture-beat-sheets",        module: "M2", batch: "C", concept: "Long ruled notebook on a desk seen from above",                          source: { provider: "unsplash", cdnUrl: "", pageUrl: "", photographer: "", photographerUrl: "", license: "Unsplash License" }, altText: "A wooden desk seen from above with an open ruled notebook and a fountain pen alongside",     caption: "", rationale: "The grid is the visual signature of beat sheets." },
  { slug: "architecture-choosing-structure", module: "M2", batch: "C", concept: "Forest path diverging into two narrower paths",                          source: { provider: "unsplash", cdnUrl: "", pageUrl: "", photographer: "", photographerUrl: "", license: "Unsplash License" }, altText: "A forest path diverging into two narrower paths in soft autumn daylight",                  caption: "", rationale: "Choosing one structure over another as a literal fork in the path." },
  { slug: "characters-backstory",            module: "M3", batch: "C", concept: "Iceberg with most of its mass below the waterline",                      source: { provider: "unsplash", cdnUrl: "", pageUrl: "", photographer: "", photographerUrl: "", license: "Unsplash License" }, altText: "A small iceberg in calm water with most of its mass visibly submerged below the surface",   caption: "", rationale: "The lesson's central metaphor — the 90% the reader never sees." },
  { slug: "characters-antagonist",           module: "M3", batch: "C", concept: "Chess board mid-game seen from a low angle",                             source: { provider: "unsplash", cdnUrl: "", pageUrl: "", photographer: "", photographerUrl: "", license: "Unsplash License" }, altText: "An old chess board mid-game with two opposing kings visible across the board",              caption: "", rationale: "Two intelligences of equal weight — the antagonist as worthy mirror." },
  { slug: "characters-supporting-cast",      module: "M3", batch: "C", concept: "Long dining table after a meal with empty chairs",                       source: { provider: "unsplash", cdnUrl: "", pageUrl: "", photographer: "", photographerUrl: "", license: "Unsplash License" }, altText: "A long wooden dining table after a shared meal with empty chairs and scattered cups",       caption: "", rationale: "An ensemble traced by what they leave behind — empty places at a shared table." },

  // ── Batch D — remaining M3 (1) + M4 (3) ────────────────────────────
  { slug: "characters-dialogue",        module: "M3", batch: "D", concept: "Two empty cups facing each other across a small table",          source: { provider: "unsplash", cdnUrl: "", pageUrl: "", photographer: "", photographerUrl: "", license: "Unsplash License" }, altText: "Two empty ceramic mugs facing each other across a small wooden cafe table in soft light",   caption: "", rationale: "Dialogue as the negative space between two people." },
  { slug: "world-show-dont-tell",       module: "M4", batch: "D", concept: "Frosted window with snow falling outside",                       source: { provider: "unsplash", cdnUrl: "", pageUrl: "", photographer: "", photographerUrl: "", license: "Unsplash License" }, altText: "A frosted window with snow falling outside, viewed from a quiet interior",                  caption: "", rationale: "The lesson's exemplar passage — 'Outside, snow had begun to fall.'" },
  { slug: "world-setting-as-character", module: "M4", batch: "D", concept: "Windswept moor under heavy fog at dawn",                         source: { provider: "unsplash", cdnUrl: "", pageUrl: "", photographer: "", photographerUrl: "", license: "Unsplash License" }, altText: "A windswept English moor under heavy dawn fog with low heather in the foreground",         caption: "", rationale: "Brontë territory — landscape as psychology." },
  { slug: "world-description-pace",     module: "M4", batch: "D", concept: "Spare still life — a small bowl, linen, a stone",                source: { provider: "unsplash", cdnUrl: "", pageUrl: "", photographer: "", photographerUrl: "", license: "Unsplash License" }, altText: "A small porcelain bowl, folded linen, and a stone arranged on a dark wooden table",         caption: "", rationale: "Restraint as a positive design choice — the lesson's argument visualised." },

  // ── Batch E — remaining AI/photo in M5/M6 ──────────────────────────
  { slug: "process-first-draft",          module: "M5", batch: "E", concept: "Pocket watch and a stack of plain paper on a writing desk",     source: { provider: "unsplash", cdnUrl: "", pageUrl: "", photographer: "", photographerUrl: "", license: "Unsplash License" }, altText: "A pocket watch on a brass chain on a wooden desk beside a stack of plain paper",            caption: "", rationale: "The Trollope echo — discipline in the morning, the watch on the desk." },
  { slug: "process-revision-passes",      module: "M5", batch: "E", concept: "Manuscript marked up with red pen edits",                        source: { provider: "unsplash", cdnUrl: "", pageUrl: "", photographer: "", photographerUrl: "", license: "Unsplash License" }, altText: "A typed manuscript page marked up with red pen edits and margin notes",                    caption: "", rationale: "Revision rendered visible — the lesson's three-pass scaffold." },
  { slug: "process-self-editing",         module: "M5", batch: "E", concept: "Close-up of a typed paragraph marked with a red wax pencil",     source: { provider: "unsplash", cdnUrl: "", pageUrl: "", photographer: "", photographerUrl: "", license: "Unsplash License" }, altText: "A close-up of a typed paragraph marked through with a red wax pencil",                      caption: "", rationale: "Self-editing as a slower, line-by-line discipline." },
  { slug: "process-when-to-stop",         module: "M5", batch: "E", concept: "A single hand resting on the closed cover of a book",            source: { provider: "unsplash", cdnUrl: "", pageUrl: "", photographer: "", photographerUrl: "", license: "Unsplash License" }, altText: "A single hand resting on the closed cover of a book on a wooden surface",                  caption: "", rationale: "The decisive small gesture — closing the file." },
  { slug: "publishing-self-vs-traditional", module: "M6", batch: "E", concept: "Forest path diverging into two paths (M6 register)",          source: { provider: "unsplash", cdnUrl: "", pageUrl: "", photographer: "", photographerUrl: "", license: "Unsplash License" }, altText: "A path through a quiet forest diverging into two narrower paths in soft daylight",         caption: "", rationale: "The path-choice as the M6 opener — self vs. traditional, neither better." },
  { slug: "publishing-cover-blurb",       module: "M6", batch: "E", concept: "A single hardcover book upright on a shelf, plain spine",        source: { provider: "unsplash", cdnUrl: "", pageUrl: "", photographer: "", photographerUrl: "", license: "Unsplash License" }, altText: "A hardcover book standing upright on a wooden shelf among other books",                     caption: "", rationale: "The 1.5-second rule — what the spine signals before the reader thinks." },
  { slug: "publishing-audience",          module: "M6", batch: "E", concept: "Small group of readers around a table",                          source: { provider: "unsplash", cdnUrl: "", pageUrl: "", photographer: "", photographerUrl: "", license: "Unsplash License" }, altText: "A small group of three to five people around a low table, reading and talking quietly",     caption: "", rationale: "Two-hundred-is-enough-to-start — engaged readers in a small room." },
  { slug: "publishing-marketing",         module: "M6", batch: "E", concept: "A pair of hands holding an open paperback at chest level",       source: { provider: "unsplash", cdnUrl: "", pageUrl: "", photographer: "", photographerUrl: "", license: "Unsplash License" }, altText: "A pair of hands cradling an open paperback book at chest level in soft light",              caption: "", rationale: "The actual reader — the only marketing endpoint that matters." },
  { slug: "publishing-after-launch",      module: "M6", batch: "E", concept: "Empty chair in front of a window at sunrise",                    source: { provider: "unsplash", cdnUrl: "", pageUrl: "", photographer: "", photographerUrl: "", license: "Unsplash License" }, altText: "A single empty wooden chair in front of a window filled with soft sunrise light",          caption: "", rationale: "Now go finish the book — the chair is waiting." },
];

// ── Sanity checks at module load ────────────────────────────────────
const SLUGS = HEROES.map((h) => h.slug);
const DUPES = SLUGS.filter((s, i) => SLUGS.indexOf(s) !== i);
if (DUPES.length > 0) {
  throw new Error(`hero-config.ts: duplicate slug(s): ${DUPES.join(", ")}`);
}
if (HEROES.length !== 27) {
  throw new Error(`hero-config.ts: expected 27 heroes, got ${HEROES.length}`);
}

/**
 * Heroes that have a non-empty cdnUrl. The fetch script only operates
 * on these — un-curated stubs are skipped (with a clear log) so the
 * tiered review process works (Batch A first, then B, etc.).
 */
export const READY_HEROES = HEROES.filter((h) => h.source.cdnUrl !== "");
