// One vocabulary for book genres.
//
// Three places used to invent their own: the library's filter pills
// ("Sci-Fi", "Non-Fiction"), the book wizard (lowercase ids like
// "scifi", "self_help") and the content-type dialog ("Science Fiction",
// "Young Adult"). Two things broke as a result:
//
//   1. The library built an i18n key straight from the stored string
//      ("genre" + letters), so a book saved as "scifi" rendered a badge
//      reading literally "genrescifi".
//   2. Filtering compared the stored string to the pill label exactly,
//      so the Sci-Fi pill could never match a book the wizard created.
//
// canonicalGenre() maps every spelling anyone has ever written to one
// canonical id; genreLabel() resolves a label that is always human
// readable, falling back to the stored text rather than a key.

export const GENRE_IDS = [
  "fiction", "nonfiction", "fantasy", "scifi", "mystery", "romance",
  "thriller", "horror", "biography", "selfhelp", "historical",
  "literary", "adventure", "poetry", "other",
] as const;

export type GenreId = (typeof GENRE_IDS)[number];

/** i18n key per canonical id (all present in both tables). */
const GENRE_I18N: Record<GenreId, string> = {
  fiction: "genreFiction",
  nonfiction: "genreNonFiction",
  fantasy: "genreFantasy",
  scifi: "genreSciFi",
  mystery: "genreMystery",
  romance: "genreRomance",
  thriller: "genreThriller",
  horror: "genreHorror",
  biography: "genreBiography",
  selfhelp: "genreSelfHelp",
  historical: "genreHistorical",
  literary: "genreLiterary",
  adventure: "genreAdventure",
  poetry: "genrePoetry",
  other: "genreOther",
};

/** English label used when no translation exists for a canonical id. */
const GENRE_EN: Record<GenreId, string> = {
  fiction: "Fiction",
  nonfiction: "Non-Fiction",
  fantasy: "Fantasy",
  scifi: "Sci-Fi",
  mystery: "Mystery",
  romance: "Romance",
  thriller: "Thriller",
  horror: "Horror",
  biography: "Biography",
  selfhelp: "Self-Help",
  historical: "Historical",
  literary: "Literary",
  adventure: "Adventure",
  poetry: "Poetry",
  other: "Other",
};

/** Every spelling seen in the wild, folded to a canonical id. */
const ALIASES: Record<string, GenreId> = {
  // wizard ids
  scifi: "scifi", sciencefiction: "scifi", sf: "scifi",
  selfhelp: "selfhelp", self_help: "selfhelp",
  nonfiction: "nonfiction", non_fiction: "nonfiction",
  historicalfiction: "historical", history: "historical",
  literaryfiction: "literary",
  youngadult: "fiction", childrens: "fiction", children: "fiction",
  contemporary: "fiction", dystopian: "scifi",
  // near-synonyms the wizard writes that have no pill of their own
  business: "nonfiction", science: "nonfiction", philosophy: "nonfiction",
  religion: "nonfiction", psychology: "nonfiction", essay: "nonfiction",
  travel: "nonfiction", cooking: "nonfiction", memoir: "biography",
};

/** Normalise any stored genre string to a canonical id, or null when we
 *  genuinely do not recognise it (the caller then shows it as typed). */
export function canonicalGenre(raw: string | null | undefined): GenreId | null {
  if (!raw) return null;
  const key = raw.toLowerCase().replace(/[^a-z]/g, "");
  if ((GENRE_IDS as readonly string[]).includes(key)) return key as GenreId;
  if (ALIASES[key]) return ALIASES[key];
  return null;
}

/** A label that is always readable: translated when we know the genre,
 *  otherwise the writer's own words — never an i18n key. */
export function genreLabel(raw: string | null | undefined, t: (k: string) => string): string {
  const id = canonicalGenre(raw);
  if (!id) return (raw || "").trim();
  const translated = t(GENRE_I18N[id]);
  // getT echoes the key back when a translation is missing.
  return translated === GENRE_I18N[id] ? GENRE_EN[id] : translated;
}

/** The filter pills, in display order. */
export const GENRE_FILTERS: { id: "all" | GenreId; i18n: string; en: string }[] = [
  { id: "all", i18n: "genreAll", en: "All" },
  ...GENRE_IDS.map((id) => ({ id, i18n: GENRE_I18N[id], en: GENRE_EN[id] })),
];

/** Does a book match the selected filter? Compares canonical ids, so a
 *  book stored as "Science Fiction" matches the Sci-Fi pill. */
export function matchesGenre(bookGenre: string | null | undefined, filter: string): boolean {
  if (filter === "all") return true;
  return canonicalGenre(bookGenre) === filter;
}
