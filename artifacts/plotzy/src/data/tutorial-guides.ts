// Tutorial guides — bundled in source so we never round-trip images
// through the database or the API server. Images live as static files
// in /artifacts/plotzy/public/tutorials/<guide-id>/<filename> and are
// referenced by their public-facing URL (e.g. "/tutorials/getting-
// started/step-1.png"). The Vercel CDN serves them; Plotzy's Express
// API never touches them. Storage cost is zero on Neon/Supabase.
//
// How to add a new guide (the workflow Fares uses):
//   1. Drop the image files into
//      artifacts/plotzy/public/tutorials/<guide-id>/
//      using clear filenames like step-1.png, step-2.png, ...
//   2. Append a new entry to TUTORIAL_GUIDES below. Pick a category
//      from CATEGORIES in pages/tutorial.tsx; the existing IDs are
//      getting-started, writing, ai-tools, publishing, cover-design,
//      community, advanced. Use the same id values, not the labels.
//   3. Fill in EN + AR titles + descriptions, then one image entry per
//      step. Captions are optional — leave them as `undefined` when
//      the screenshot speaks for itself.
//   4. Save, typecheck, commit, push, Promote on Vercel.
//
// Featured video: one and only one. Set FEATURED_VIDEO.url to a
// YouTube / Vimeo URL when ready; until then, leave url as null and
// the hero block hides the video card automatically.

export interface TutorialImage {
  /** Public-relative URL. Must start with "/tutorials/". */
  src: string;
  alt: { en: string; ar: string };
  /** Optional caption shown beneath the image in the modal. */
  caption?: { en: string; ar: string };
}

export interface TutorialGuide {
  /** Slug, kebab-case. Used as the URL fragment and the public folder name. */
  id: string;
  title: { en: string; ar: string };
  description: { en: string; ar: string };
  /** Must match one of the category ids in pages/tutorial.tsx CATEGORIES. */
  category:
    | "getting-started"
    | "writing"
    | "ai-tools"
    | "publishing"
    | "cover-design"
    | "community"
    | "advanced";
  /** Ordered list of screenshots. The first image doubles as the card thumbnail. */
  images: TutorialImage[];
}

// ─── Featured video ──────────────────────────────────────────────────
// One video at the top of the Tutorial page. Set `url` to null until
// the video is uploaded; the page hides the hero video card cleanly
// in that case. Accepts YouTube and Vimeo URLs — toEmbedUrl() in
// pages/tutorial.tsx normalises them.

export const FEATURED_VIDEO: {
  url: string | null;
  title: { en: string; ar: string };
  description: { en: string; ar: string };
  duration: string;
} = {
  url: null, // e.g. "https://www.youtube.com/watch?v=XXXXXXX"
  title: {
    en: "Plotzy in 5 minutes",
    ar: "بلوتزي في 5 دقائق",
  },
  description: {
    en: "A quick walkthrough of how Plotzy works, from creating your first book to publishing.",
    ar: "جولة سريعة على بلوتزي، من إنشاء كتابك الأول إلى نشره.",
  },
  duration: "5:00",
};

// ─── Photo guides ────────────────────────────────────────────────────
// Each entry becomes one card on the Tutorial page. Cards open a modal
// with the guide's images stacked vertically (carousel-free so users
// can scroll naturally through all steps). Add new guides at the END
// of the array; ordering matches their appearance on the page.

export const TUTORIAL_GUIDES: TutorialGuide[] = [
  // Example shape — delete or replace once the first real guide lands.
  // {
  //   id: "create-your-first-book",
  //   title: {
  //     en: "Create your first book",
  //     ar: "أنشئ كتابك الأول",
  //   },
  //   description: {
  //     en: "Start a new book from your library in two clicks.",
  //     ar: "ابدأ كتاباً جديداً من مكتبتك بنقرتين.",
  //   },
  //   category: "getting-started",
  //   images: [
  //     {
  //       src: "/tutorials/create-your-first-book/step-1.png",
  //       alt: {
  //         en: "Library page with the New Book button highlighted",
  //         ar: "صفحة المكتبة مع تظليل زر «كتاب جديد»",
  //       },
  //       caption: {
  //         en: "Open My Library and click the New Book button in the top right.",
  //         ar: "افتح «مكتبتي» واضغط على زر «كتاب جديد» أعلى اليمين.",
  //       },
  //     },
  //     {
  //       src: "/tutorials/create-your-first-book/step-2.png",
  //       alt: {
  //         en: "New Book modal with title and genre fields",
  //         ar: "نافذة كتاب جديد مع حقلَي العنوان والنوع الأدبي",
  //       },
  //       caption: {
  //         en: "Fill in the title and genre, then press Create.",
  //         ar: "املأ العنوان والنوع الأدبي، ثم اضغط «إنشاء».",
  //       },
  //     },
  //   ],
  // },
];
