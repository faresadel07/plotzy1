// Tutorial guides — bundled in source so we never round-trip media
// through the database or the API server. Videos and images live as
// static files in /artifacts/plotzy/public/tutorials/<guide-id>/
// and are referenced by their public-facing URL (e.g. "/tutorials/
// community/community.mp4"). Vercel's CDN serves them; Plotzy's
// Express API never touches them. Storage cost on the DB is zero.
//
// Two media flavours are supported per guide:
//
//   1. video — a single silent screen recording that plays as an
//      autoplay-muted-loop in the modal. The clearest format for
//      walking a writer through what a section of Plotzy does.
//   2. images — an ordered series of screenshots, each with a
//      bilingual caption. Useful for a step-by-step that doesn't
//      need motion.
//
// A guide can have a video, a list of images, or both. It must have
// at least one of the two.
//
// On top of the media each guide carries a `features` array — short
// bilingual bullets that describe exactly what a writer can do in
// the section the video is showing. The modal lays them out beside
// the video on desktop, stacked under it on mobile.
//
// How to add a new guide (the workflow Fares uses):
//   1. Drop the media file(s) into
//      artifacts/plotzy/public/tutorials/<guide-id>/
//      using clear filenames. For a single walkthrough video, name
//      it after the guide id (e.g. community/community.mp4).
//   2. Append a new entry to TUTORIAL_GUIDES below. Pick a category
//      from CATEGORIES in pages/tutorial.tsx; the existing IDs are
//      getting-started, writing, ai-tools, publishing, cover-design,
//      community, advanced. Use the same id values, not the labels.
//   3. Fill in EN + AR title + description + features (3-7 bullets
//      is the sweet spot). Add the video block when a recording
//      exists; add the images array when screenshots make sense.
//   4. Save, typecheck, commit, push, Promote on Vercel.

export interface TutorialImage {
  /** Public-relative URL. Must start with "/tutorials/". */
  src: string;
  alt: { en: string; ar: string };
  /** Optional caption shown beneath the image in the modal. */
  caption?: { en: string; ar: string };
}

export interface TutorialVideo {
  /** Public-relative URL of the .mp4 file. Must start with "/tutorials/". */
  src: string;
  /**
   * Optional poster image. Shown before the video starts (browsers
   * that block autoplay will sit on the poster until the user taps).
   */
  poster?: string;
}

export interface TutorialFeature {
  /** Short feature heading, e.g. "Like a book". */
  title: { en: string; ar: string };
  /** One-line explanation of how / why a writer would use it. */
  body: { en: string; ar: string };
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
  /**
   * Optional silent walkthrough. Plays as autoplay-muted-loop in the
   * modal, so the user reads it like an animated illustration.
   */
  video?: TutorialVideo;
  /**
   * "What you can do here" bullets. Rendered beside the video on
   * desktop, stacked underneath it on mobile.
   */
  features?: TutorialFeature[];
  /**
   * Optional step-by-step screenshots. Rendered at the bottom of the
   * modal in a vertical stack with their captions. Either video OR
   * images (or both) must be present — a guide with neither is
   * filtered out at render time.
   */
  images?: TutorialImage[];
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

// ─── Photo / video guides ────────────────────────────────────────────
// Each entry becomes one card on the Tutorial page. Cards open a
// modal with the video at the top (when present), the feature
// bullets, then any step screenshots. Add new guides at the END of
// the array; ordering matches their appearance on the page.

export const TUTORIAL_GUIDES: TutorialGuide[] = [
  // Example shape — delete or replace once the first real guide lands.
  // {
  //   id: "community",
  //   title: {
  //     en: "Community",
  //     ar: "المجتمع",
  //   },
  //   description: {
  //     en: "Read, follow, and chat with other Plotzy writers.",
  //     ar: "اقرأ، تابع، وحدّث الكتّاب الآخرين على بلوتزي.",
  //   },
  //   category: "community",
  //   video: {
  //     src: "/tutorials/community/community.mp4",
  //   },
  //   features: [
  //     {
  //       title: { en: "Like a book", ar: "أعجبني الكتاب" },
  //       body: {
  //         en: "Tap the heart on any book to save it for later and tell the author you enjoyed it.",
  //         ar: "اضغط القلب على أي كتاب لحفظه ولإبلاغ الكاتب أنّك أعجبت به.",
  //       },
  //     },
  //     {
  //       title: { en: "Follow a writer", ar: "تابع كاتباً" },
  //       body: {
  //         en: "Open a writer's profile and follow them to see new chapters in your feed.",
  //         ar: "افتح ملف الكاتب وتابعه لترى فصوله الجديدة في خلاصتك.",
  //       },
  //     },
  //     // ...3-7 bullets total
  //   ],
  // },
];
