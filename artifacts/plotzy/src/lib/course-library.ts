// Curated free, legally redistributable craft books for the course
// library page. Small public-domain PDFs are bundled and served from
// /resources/external; larger ones link to their free canonical scan
// (archive.org) or open textbook page. Every entry is public domain or
// CC BY, so all are free to read and share. License strings are exact.

export interface LibraryBook {
  id: string;
  title: { en: string; ar: string };
  author: { en: string; ar: string };
  blurb: { en: string; ar: string };
  lang: "en" | "ar";
  license: { en: string; ar: string };
  href: string;
  external: boolean;
}

export const LIBRARY: LibraryBook[] = [
  {
    id: "poetics",
    title: { en: "The Poetics", ar: "فن الشعر" },
    author: { en: "Aristotle", ar: "أرسطو" },
    blurb: {
      en: "The founding text on plot, character, and dramatic structure that every story theory still builds on.",
      ar: "النص المؤسس في الحبكة والشخصية والبنية الدرامية، وما زالت كل نظريات القصة تبني عليه.",
    },
    lang: "en",
    license: { en: "Public domain", ar: "ملكية عامة" },
    href: "/resources/external/poetics-aristotle-butcher.pdf",
    external: false,
  },
  {
    id: "art-of-fiction",
    title: { en: "The Art of Fiction", ar: "فن الرواية" },
    author: { en: "Henry James", ar: "هنري جيمس" },
    blurb: {
      en: "A landmark essay arguing fiction is a serious craft: on selection, point of view, and lived detail.",
      ar: "مقالة فارقة تحاجّ بأن السرد حرفة جادّة: في الانتقاء ووجهة النظر والتفصيل المعيش.",
    },
    lang: "en",
    license: { en: "Public domain", ar: "ملكية عامة" },
    href: "/resources/external/the-art-of-fiction-james.pdf",
    external: false,
  },
  {
    id: "elements-of-style",
    title: { en: "The Elements of Style", ar: "عناصر الأسلوب" },
    author: { en: "William Strunk Jr.", ar: "وليام سترنك" },
    blurb: {
      en: "The classic short guide to clean, concise sentences and disciplined usage.",
      ar: "الدليل الموجز الكلاسيكي إلى الجملة النظيفة المقتصدة والاستعمال المنضبط.",
    },
    lang: "en",
    license: { en: "Public domain", ar: "ملكية عامة" },
    href: "/resources/external/elements-of-style-strunk.pdf",
    external: false,
  },
  {
    id: "mystery-technique",
    title: { en: "The Technique of the Mystery Story", ar: "تقنية قصة الغموض" },
    author: { en: "Carolyn Wells", ar: "كارولين ويلز" },
    blurb: {
      en: "A practical manual on suspense, clues, fair play, and plotting for genre and mystery writers.",
      ar: "دليل عملي في التشويق والأدلة واللعب النزيه وبناء الحبكة لكتّاب الغموض والأنواع.",
    },
    lang: "en",
    license: { en: "Public domain", ar: "ملكية عامة" },
    href: "/resources/external/technique-of-the-mystery-story-wells.pdf",
    external: false,
  },
  {
    id: "craft-of-fiction",
    title: { en: "The Craft of Fiction", ar: "حرفة الرواية" },
    author: { en: "Percy Lubbock", ar: "بيرسي لوبوك" },
    blurb: {
      en: "A close, practical study of viewpoint and scene versus summary, using the great novels as models.",
      ar: "دراسة عملية دقيقة في وجهة النظر والمشهد مقابل التلخيص، تتخذ الروايات الكبرى نماذج.",
    },
    lang: "en",
    license: { en: "Public domain", ar: "ملكية عامة" },
    href: "https://archive.org/details/craftoffiction030210mbp",
    external: true,
  },
  {
    id: "prose-fiction-study",
    title: { en: "A Study of Prose Fiction", ar: "دراسة في السرد النثري" },
    author: { en: "Bliss Perry", ar: "بليس بيري" },
    blurb: {
      en: "A clear survey of plot, character, setting, and theme: a beginner's map of narrative technique.",
      ar: "مسح واضح للحبكة والشخصية والمكان والثيمة: خريطة المبتدئ إلى تقنية السرد.",
    },
    lang: "en",
    license: { en: "Public domain", ar: "ملكية عامة" },
    href: "https://archive.org/details/studyofprosefict00perr",
    external: true,
  },
  {
    id: "openstax-writing",
    title: { en: "Writing Guide with Handbook", ar: "دليل الكتابة مع مرجع الاستعمال" },
    author: { en: "OpenStax", ar: "OpenStax" },
    blurb: {
      en: "A modern, genre-based composition textbook covering the full writing process, revision, and usage.",
      ar: "كتاب حديث في الكتابة قائم على الأنواع، يغطي عملية الكتابة كاملة والمراجعة والاستعمال.",
    },
    lang: "en",
    license: { en: "CC BY 4.0", ar: "رخصة CC BY 4.0" },
    href: "https://openstax.org/details/books/writing-guide",
    external: true,
  },
  {
    id: "adab-al-katib",
    title: { en: "Adab al-Katib", ar: "أدب الكاتب" },
    author: { en: "Ibn Qutayba", ar: "ابن قتيبة الدينوري" },
    blurb: {
      en: "The classic Arabic handbook for the prose writer: correct diction, style, and common errors.",
      ar: "الدليل العربي الكلاسيكي لكاتب النثر: صواب اللفظ والأسلوب وأخطاء التأليف الشائعة.",
    },
    lang: "ar",
    license: { en: "Public domain", ar: "ملكية عامة" },
    href: "https://archive.org/details/AAlexandrina-195125",
    external: true,
  },
  {
    id: "al-umda",
    title: { en: "Al-Umda", ar: "العمدة في صناعة الشعر ونقده" },
    author: { en: "Ibn Rashiq al-Qayrawani", ar: "ابن رشيق القيرواني" },
    blurb: {
      en: "The foundational Arabic manual on the craft and criticism of poetry: imagery, meter, and figures.",
      ar: "المرجع العربي التأسيسي في صناعة الشعر ونقده: الصورة والوزن والمحسّنات.",
    },
    lang: "ar",
    license: { en: "Public domain", ar: "ملكية عامة" },
    href: "https://archive.org/details/AAlexandrina-153227",
    external: true,
  },
];
