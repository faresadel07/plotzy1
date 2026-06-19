// Voices — editorial profiles of famous writers.
//
// One file is the source of truth for every profile shown at /voices
// and /voices/:slug. Everything bundled in code; nothing in the DB.
//
// Adding a new profile is a single PR:
//   1. Drop the portrait JPG at public/voices/{slug}/portrait.jpg
//      (sourced from Wikimedia Commons or another free-licence site,
//      licence recorded in the photo block).
//   2. Append a new VoiceProfile to the VOICES array below, filling
//      every field. The prose is written from scratch in EN + AR,
//      not translated from each other.
//   3. Commit, push, Vercel rebuilds.
//
// The launch set is 25 profiles (12 Arabic + 13 international,
// including J.K. Rowling per request). Phase A ships this file with
// the types and an empty array; Phase B fills in metadata + photos;
// Phase C fills in prose in batches of four for review.

export type VoiceLanguage =
  | "ar"
  | "en"
  | "es"
  | "ru"
  | "fr"
  | "de"
  | "ja"
  | "cs"
  | "pt"
  | "it"
  | "tr";

export interface BilingualText {
  en: string;
  ar: string;
}

export interface VoiceWork {
  /** Original title in the writer's language. */
  title: string;
  /** Optional transliteration / translation when the original is not
   *  in the Latin alphabet (e.g. "أولاد حارتنا" → "Children of the
   *  Alley"). */
  translatedTitle?: string;
  year?: number;
}

export interface VoiceQuote {
  text: string;
  /** Language of the quote text itself. Used by the renderer to pick
   *  the right font. */
  lang: "en" | "ar" | "es" | "fr" | "ru" | "de" | "ja";
  /** Confidence that the quote is public domain. We only ship "high"
   *  in v1. Anything below stays draft. */
  pdConfidence: "high" | "medium";
  /** Source the quote is attributed to (a public-domain work, a
   *  speech, etc.). */
  source?: string;
}

export interface VoicePhoto {
  /** Public-relative URL of the JPG/PNG in public/voices/{slug}/. */
  src: string;
  alt: BilingualText;
  /** Photographer name or "via Wikimedia Commons" etc. */
  credit: string;
  /** Licence string, exactly as listed on the source page. */
  license: string;
  /** Direct URL of the source page so credits page can link out. */
  sourceUrl: string;
}

export interface VoiceVideo {
  /** YouTube video id only. The iframe src is built from this so the
   *  embed always uses youtube-nocookie.com. */
  youtubeId: string;
  title: BilingualText;
  /** Channel name for attribution. Must be an official channel (the
   *  writer's, the publisher's, TED, BBC, etc.) per the IP rules. */
  channel: string;
  /** Optional explanatory note shown below the embed. */
  note?: BilingualText;
}

export interface VoiceProfile {
  /** kebab-case URL slug. */
  slug: string;
  name: BilingualText;
  bornYear: number;
  diedYear?: number;
  nationality: BilingualText;
  /** Primary writing language. Used for the language filter chips. */
  language: VoiceLanguage;
  /** Awards / honours as plain strings, e.g. "Nobel Prize 1988". */
  awards?: string[];
  /** One-line subtitle shown on the listing card. */
  tagline: BilingualText;
  /** The editorial profile prose, written by hand in EN and AR. The
   *  AR version is its own piece written for an Arabic reader, not a
   *  translation of the EN. */
  body: BilingualText;
  /** Major works list. Limit to 8 to keep the sidebar legible. */
  works: VoiceWork[];
  /** Public-domain quotes, optional. */
  quotes?: VoiceQuote[];
  photo: VoicePhoto;
  /** 1 to 3 YouTube embeds from trusted channels. */
  videos?: VoiceVideo[];
  /** Slugs of other VoiceProfile entries to suggest at the bottom. */
  relatedSlugs?: string[];
}

// ─── The 25 launch profiles ────────────────────────────────────────
//
// Empty in Phase A. Phase B adds metadata + photos. Phase C drafts
// the prose in batches of four (Mahfouz, Darwish, Hemingway, Woolf
// first; then the rest).

export const VOICES: VoiceProfile[] = [];

// ─── Helpers ───────────────────────────────────────────────────────

/** Lookup a profile by slug, used by the detail page. Returns undefined
 *  when the URL slug does not match any profile (the detail page then
 *  renders a 404 state). */
export function getVoiceBySlug(slug: string): VoiceProfile | undefined {
  return VOICES.find((v) => v.slug === slug);
}

/** Unique set of languages present in the loaded profiles. Used to
 *  render the filter chip row only for languages we actually cover. */
export function getCoveredLanguages(): VoiceLanguage[] {
  const set = new Set<VoiceLanguage>();
  for (const v of VOICES) set.add(v.language);
  return Array.from(set);
}

/** Related voices for cross-linking at the bottom of a profile. Pulls
 *  from the explicit relatedSlugs first; if the writer did not specify
 *  any, falls back to "same language" as the gentlest default. Caps
 *  at four suggestions. */
export function getRelatedVoices(profile: VoiceProfile): VoiceProfile[] {
  const explicit = (profile.relatedSlugs ?? [])
    .map(getVoiceBySlug)
    .filter((v): v is VoiceProfile => v !== undefined);
  if (explicit.length >= 4) return explicit.slice(0, 4);
  const sameLanguage = VOICES.filter(
    (v) => v.slug !== profile.slug && v.language === profile.language,
  );
  const merged = [...explicit];
  for (const v of sameLanguage) {
    if (merged.length >= 4) break;
    if (!merged.some((m) => m.slug === v.slug)) merged.push(v);
  }
  return merged.slice(0, 4);
}
