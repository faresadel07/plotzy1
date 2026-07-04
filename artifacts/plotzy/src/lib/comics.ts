// The Classic Comics catalogue: hand-curated golden-age comic books,
// all public domain, streamed page by page from the Internet Archive
// (no pages are hosted by Plotzy; the catalogue is metadata only).
//
// Every entry below was VERIFIED by scripts/build-comics-catalog.mjs
// before admission: the item's metadata exposes a sane image count and
// both the cover and an interior page actually serve as images.
//
// COVERS: `comicCover` uses the real first-page scan at 400px, which
// is far crisper than the tiny services/img thumbnail; the thumbnail
// remains as an onError fallback (see ComicCoverImg usage in pages).

export type ComicGenre = "scifi" | "hero" | "horror" | "jungle" | "war" | "crime" | "western" | "romance" | "funny";

export interface ComicIssue {
  /** Internet Archive identifier. */
  id: string;
  /** Clean display title, e.g. "Planet Comics 11". */
  title: string;
  series: string;
  year: string;
  /** Total page images (imagecount from IA metadata). */
  pages: number;
  genre: ComicGenre;
  /** Whole-issue PDF filename on the archive item, when one exists —
   *  powers the reader's Download PDF button. */
  pdf?: string | null;
}

/** Direct download URL for the whole-issue PDF. */
export const comicPdfUrl = (c: ComicIssue) =>
  c.pdf ? `https://archive.org/download/${c.id}/${encodeURIComponent(c.pdf)}` : null;

export const COMIC_GENRES: Array<{ id: ComicGenre; en: string; ar: string }> = [
  { id: "scifi",  en: "Science Fiction",    ar: "خيال علمي" },
  { id: "hero",   en: "Superheroes",        ar: "أبطال" },
  { id: "horror", en: "Horror and Mystery", ar: "رعب وغموض" },
  { id: "jungle", en: "Jungle Adventure",   ar: "مغامرات" },
  { id: "war",    en: "War",                ar: "حرب" },
  { id: "crime",  en: "Crime",              ar: "جريمة" },
  { id: "western", en: "Western",           ar: "غرب أمريكي" },
  { id: "romance", en: "Romance",           ar: "رومانسي" },
  { id: "funny",   en: "Funny Animals",     ar: "كوميدي" },
];

/** Covers are BUNDLED with the frontend (public/images/comics, filled
 *  by scripts/fetch-comic-covers.mjs), so they paint instantly and
 *  never re-download from the archive on each visit. */
export const comicCover = (id: string) => `/images/comics/${id}.jpg`;

/** Network fallbacks if a bundled cover is ever missing: the real
 *  first-page scan, then the archive thumbnail. */
export const comicCoverRemote = (id: string) =>
  `https://archive.org/download/${id}/page/n0_w400.jpg`;
export const comicCoverFallback = (id: string) =>
  `https://archive.org/services/img/${id}`;

/** One interior page at the given pixel width (n is 0-based). */
export const comicPage = (id: string, n: number, w: number) =>
  `https://archive.org/download/${id}/page/n${n}_w${w}.jpg`;

export const findComic = (id: string) => COMICS.find((c) => c.id === id);

// ── Catalogue ───────────────────────────────────────────────────────
// Generated at scale by scripts/build-comics-catalog.mjs (scrape +
// whitelist + live verification) and emitted by emit-comics-ts.mjs.
import { COMICS_DATA } from "./comics-data";
export const COMICS: ComicIssue[] = COMICS_DATA;

/* Original hand-curated launch set, superseded by the generated
   catalogue above:
[
  // Science fiction
  { id: "captain-science-1-images", title: "Captain Science 1", series: "Captain Science", year: "1950", pages: 36, genre: "scifi" },
  { id: "captain-science-3-images", title: "Captain Science 3", series: "Captain Science", year: "1951", pages: 36, genre: "scifi" },
  { id: "captain-science-4-images", title: "Captain Science 4", series: "Captain Science", year: "1951", pages: 36, genre: "scifi" },
  { id: "space-action-01", title: "Space Action 1", series: "Space Action", year: "1952", pages: 37, genre: "scifi" },
  { id: "strange_worlds_05_c2c_JVJ_Cimm32_Geo", title: "Strange Worlds 5", series: "Strange Worlds", year: "1951", pages: 37, genre: "scifi" },
  // Superheroes
  { id: "SilverStreakComics001B", title: "Silver Streak Comics 1", series: "Silver Streak Comics", year: "1939", pages: 67, genre: "hero" },
  { id: "SilverStreakComics009", title: "Silver Streak Comics 9", series: "Silver Streak Comics", year: "1941", pages: 67, genre: "hero" },
  { id: "AmazingManComics005paperfiche_573", title: "Amazing Man Comics 5", series: "Amazing Man Comics", year: "1939", pages: 69, genre: "hero" },
  { id: "BlueBeetle015", title: "Blue Beetle 15", series: "Blue Beetle", year: "1942", pages: 69, genre: "hero" },
  { id: "BlueBeetle022", title: "Blue Beetle 22", series: "Blue Beetle", year: "1943", pages: 69, genre: "hero" },
  { id: "BlueBeetle029", title: "Blue Beetle 29", series: "Blue Beetle", year: "1944", pages: 33, genre: "hero" },
  { id: "phantom-lady", title: "Phantom Lady", series: "Phantom Lady", year: "", pages: 36, genre: "hero" },
  { id: "DaredevilComics059", title: "Daredevil Comics 59", series: "Daredevil Comics", year: "1950", pages: 53, genre: "hero" },
  { id: "DaredevilComics068", title: "Daredevil Comics 68", series: "Daredevil Comics", year: "1950", pages: 53, genre: "hero" },
  // Horror and mystery
  { id: "MisterMystery07", title: "Mister Mystery 7", series: "Mister Mystery", year: "1952", pages: 37, genre: "horror" },
  { id: "MisterMystery10", title: "Mister Mystery 10", series: "Mister Mystery", year: "1953", pages: 37, genre: "horror" },
  { id: "MisterMystery15", title: "Mister Mystery 15", series: "Mister Mystery", year: "1954", pages: 37, genre: "horror" },
  { id: "webofmystery-comics-04", title: "Web of Mystery 4", series: "Web of Mystery", year: "1951", pages: 36, genre: "horror" },
  { id: "webofmystery-comics-17", title: "Web of Mystery 17", series: "Web of Mystery", year: "1953", pages: 36, genre: "horror" },
  { id: "DarkMysteries005master", title: "Dark Mysteries 5", series: "Dark Mysteries", year: "1952", pages: 37, genre: "horror" },
  { id: "JourneyIntoFear0131953", title: "Journey into Fear 13", series: "Journey into Fear", year: "1953", pages: 37, genre: "horror" },
  { id: "JourneyIntoFear0141954", title: "Journey into Fear 14", series: "Journey into Fear", year: "1954", pages: 37, genre: "horror" },
  { id: "StartlingTerrorTalesV10131952", title: "Startling Terror Tales 13", series: "Startling Terror Tales", year: "1952", pages: 37, genre: "horror" },
  { id: "TalesOfHorror006toby", title: "Tales of Horror 6", series: "Tales of Horror", year: "1953", pages: 37, genre: "horror" },
  // Jungle adventure
  { id: "jumbo-comics-08", title: "Jumbo Comics 8", series: "Jumbo Comics", year: "1939", pages: 36, genre: "jungle" },
  { id: "jumbo-comics-105-november-1947", title: "Jumbo Comics 105", series: "Jumbo Comics", year: "1947", pages: 53, genre: "jungle" },
  // War
  { id: "AtomicWar003195302", title: "Atomic War 3", series: "Atomic War", year: "1953", pages: 36, genre: "war" },
  { id: "AtomicAttack05195301Ctc", title: "Atomic Attack 5", series: "Atomic Attack", year: "1953", pages: 36, genre: "war" },
  { id: "WorldWarIII02", title: "World War III 2", series: "World War III", year: "1953", pages: 31, genre: "war" },
  // Crime
  { id: "CrimeDoesNotPay051C2c", title: "Crime Does Not Pay 51", series: "Crime Does Not Pay", year: "1947", pages: 54, genre: "crime" },
  { id: "CrimeDoesNotPay086", title: "Crime Does Not Pay 86", series: "Crime Does Not Pay", year: "1950", pages: 52, genre: "crime" },
  { id: "CrimeDoesNotPay091", title: "Crime Does Not Pay 91", series: "Crime Does Not Pay", year: "1950", pages: 53, genre: "crime" },
  { id: "CrimeAndPunishment065", title: "Crime and Punishment 65", series: "Crime and Punishment", year: "1953", pages: 37, genre: "crime" },
  { id: "CrimeAndPunishment070", title: "Crime and Punishment 70", series: "Crime and Punishment", year: "1954", pages: 37, genre: "crime" },
]
*/
