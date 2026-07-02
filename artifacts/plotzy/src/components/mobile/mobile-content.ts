// Curated content for the Apple-TV-style mobile home.
//
// All covers resolve from public CDNs (Gutenberg, Archive.org,
// Hindawi) with NO backend dependency, so the mobile home always
// renders a rich, populated experience even while our own API server
// is down. Each card links to a real destination route.

export interface MobileBook {
  title: string;
  author: string;
  cover: string;
  href: string;
  genre?: string;
  genreAr?: string;
}

// ── Cover URL helpers ──────────────────────────────────────────────
const gutCover = (id: number) =>
  `https://www.gutenberg.org/cache/epub/${id}/pg${id}.cover.medium.jpg`;
const audioCover = (archiveId: string) =>
  `https://archive.org/services/img/${archiveId}`;
const hindawiCover = (id: number) =>
  `https://downloads.hindawi.org/covers/304x406/${id}.jpg`;

// ── Audiobooks (LibriVox) — link straight to the player ────────────
// id = LibriVox book id (route /audiolibrary/librivox/:id)
// archive = archive.org identifier used for the cover art.
export const AUDIO_BOOKS: MobileBook[] = [
  { title: "Pride and Prejudice",          author: "Jane Austen",        cover: audioCover("pride_and_prejudice_librivox"),      href: "/audiolibrary/librivox/253",  genre: "Classic",   genreAr: "كلاسيكي" },
  { title: "Adventures of Sherlock Holmes",author: "Arthur Conan Doyle", cover: audioCover("adventures_holmes"),                 href: "/audiolibrary/librivox/314",  genre: "Mystery",   genreAr: "غموض" },
  { title: "A Tale of Two Cities",         author: "Charles Dickens",    cover: audioCover("tale_two_cities_librivox"),          href: "/audiolibrary/librivox/510",  genre: "Classic",   genreAr: "كلاسيكي" },
  { title: "Alice in Wonderland",          author: "Lewis Carroll",      cover: audioCover("alice_in_wonderland_librivox"),      href: "/audiolibrary/librivox/200",  genre: "Fantasy",   genreAr: "خيال" },
  { title: "The Time Machine",             author: "H. G. Wells",        cover: audioCover("time_machine_0805_librivox"),        href: "/audiolibrary/librivox/817",  genre: "Sci-Fi",    genreAr: "خيال علمي" },
  { title: "Dracula",                      author: "Bram Stoker",        cover: audioCover("dracula_librivox"),                  href: "/audiolibrary/librivox/271",  genre: "Horror",    genreAr: "رعب" },
  { title: "Great Expectations",           author: "Charles Dickens",    cover: audioCover("great_expectations_mfs_0812_librivox"),href: "/audiolibrary/librivox/2591", genre: "Classic",   genreAr: "كلاسيكي" },
  { title: "Jane Eyre",                    author: "Charlotte Brontë",   cover: audioCover("jane_eyre_librivox"),                href: "/audiolibrary/librivox/133",  genre: "Romance",   genreAr: "رومانسي" },
  { title: "Treasure Island",              author: "R. L. Stevenson",    cover: audioCover("treasureisland_librivox"),           href: "/audiolibrary/librivox/449",  genre: "Adventure", genreAr: "مغامرة" },
  { title: "The Odyssey",                  author: "Homer",              cover: audioCover("odyssey_butler_librivox"),           href: "/audiolibrary/librivox/65",   genre: "Epic",      genreAr: "ملحمة" },
];

// ── English classics (Project Gutenberg) — /discover/:gutenbergId ──
export const ENGLISH_BOOKS: MobileBook[] = [
  { title: "Pride and Prejudice",     author: "Jane Austen",        cover: gutCover(1342), href: "/discover/1342", genre: "Romance",   genreAr: "رومانسي" },
  { title: "Moby Dick",               author: "Herman Melville",    cover: gutCover(2701), href: "/discover/2701", genre: "Adventure", genreAr: "مغامرة" },
  { title: "Frankenstein",            author: "Mary Shelley",       cover: gutCover(84),   href: "/discover/84",   genre: "Horror",    genreAr: "رعب" },
  { title: "Alice in Wonderland",     author: "Lewis Carroll",      cover: gutCover(11),   href: "/discover/11",   genre: "Fantasy",   genreAr: "خيال" },
  { title: "The Picture of Dorian Gray", author: "Oscar Wilde",     cover: gutCover(174),  href: "/discover/174",  genre: "Classic",   genreAr: "كلاسيكي" },
  { title: "A Tale of Two Cities",    author: "Charles Dickens",    cover: gutCover(98),   href: "/discover/98",   genre: "Classic",   genreAr: "كلاسيكي" },
  { title: "Jane Eyre",               author: "Charlotte Brontë",   cover: gutCover(1260), href: "/discover/1260", genre: "Romance",   genreAr: "رومانسي" },
  { title: "Adventures of Sherlock Holmes", author: "A. C. Doyle",  cover: gutCover(1661), href: "/discover/1661", genre: "Mystery",   genreAr: "غموض" },
  { title: "Crime and Punishment",    author: "F. Dostoevsky",      cover: gutCover(2554), href: "/discover/2554", genre: "Classic",   genreAr: "كلاسيكي" },
  { title: "Dracula",                 author: "Bram Stoker",        cover: gutCover(345),  href: "/discover/345",  genre: "Horror",    genreAr: "رعب" },
];

// ── Arabic library (Hindawi Foundation, CC BY 4.0) ─────────────────
// Arabic cards land on the filtered discover browse (individual
// hindawi reading is handled inside that page).
const AR = "/discover?src=hindawi";
export const ARABIC_BOOKS: MobileBook[] = [
  { title: "الفاروق عمر",              author: "محمد حسين هيكل",   cover: hindawiCover(13538483), href: AR, genre: "تاريخ" },
  { title: "الأيام",                   author: "طه حسين",          cover: hindawiCover(13028368), href: AR, genre: "سيرة" },
  { title: "مدينة زحلة",               author: "عيسى إسكندر المعلوف", cover: hindawiCover(13149739), href: AR, genre: "تاريخ" },
  { title: "الحجاج بن يوسف",           author: "جرجي زيدان",       cover: hindawiCover(13595164), href: AR, genre: "رواية" },
  { title: "غادة كربلاء",              author: "جرجي زيدان",       cover: hindawiCover(13604281), href: AR, genre: "رواية" },
  { title: "قصة الأيام القادمة",       author: "أدب",              cover: hindawiCover(13736816), href: AR, genre: "خيال" },
  { title: "الحضارة الإسلامية",        author: "أحمد زكي",         cover: hindawiCover(14602927), href: AR, genre: "فكر" },
  { title: "فلسفة ابن رشد",            author: "فرح أنطون",        cover: hindawiCover(13939717), href: AR, genre: "فلسفة" },
  { title: "صانع الألماس",             author: "أدب",              cover: hindawiCover(13964931), href: AR, genre: "رواية" },
  { title: "الأمومة عند العرب",        author: "عبد الله زخير",    cover: hindawiCover(14024730), href: AR, genre: "فكر" },
];

// ── Hero slides — the rotating collage banner ──────────────────────
export interface HeroSlide {
  eyebrow: string;
  eyebrowAr: string;
  title: string;
  titleAr: string;
  subtitle: string;
  subtitleAr: string;
  cta: string;
  ctaAr: string;
  href: string;
  // Collage of covers used as the blurred backdrop.
  collage: string[];
}

export const HERO_SLIDES: HeroSlide[] = [
  {
    eyebrow: "Write with AI",
    eyebrowAr: "اكتب بمساعدة الذكاء",
    title: "Write your first book.",
    titleAr: "اكتب كتابك الأوّل.",
    subtitle: "A full writing studio with an AI assistant that plots, drafts, and edits beside you.",
    subtitleAr: "استوديو كتابة متكامل مع مساعد ذكاء يخطّط ويسوّد ويحرّر إلى جانبك.",
    cta: "Start writing",
    ctaAr: "ابدأ الكتابة",
    href: "/dashboard",
    collage: ENGLISH_BOOKS.slice(0, 6).map((b) => b.cover),
  },
  {
    eyebrow: "Audio Library",
    eyebrowAr: "المكتبة الصوتيّة",
    title: "Thousands of free audiobooks.",
    titleAr: "آلاف الكتب الصوتيّة المجانيّة.",
    subtitle: "Public-domain classics narrated by volunteers. Listen anywhere, lock your screen, keep playing.",
    subtitleAr: "كلاسيكيّات من الملك العامّ بأصوات متطوّعين. استمع في أي مكان، اقفل شاشتك، والصوت يكمّل.",
    cta: "Browse audiobooks",
    ctaAr: "تصفّح الصوتيّات",
    href: "/audiolibrary",
    collage: AUDIO_BOOKS.slice(0, 6).map((b) => b.cover),
  },
  {
    eyebrow: "Arabic Library",
    eyebrowAr: "المكتبة العربيّة",
    title: "كنوز الأدب العربي.",
    titleAr: "كنوز الأدب العربي.",
    subtitle: "Read the great works of Arabic literature, free, from the Hindawi public-domain collection.",
    subtitleAr: "اقرأ روائع الأدب العربي مجّاناً من مجموعة هنداوي في الملك العامّ.",
    cta: "افتح المكتبة",
    ctaAr: "افتح المكتبة",
    href: "/discover?src=hindawi",
    collage: ARABIC_BOOKS.slice(0, 6).map((b) => b.cover),
  },
];
