// The Video Vault: a curated watch-hall of craft videos that did not
// fit inside a single lesson. Every ID here was oEmbed-verified against
// YouTube (see course-video-catalog.md at the repo root) — do not add
// unverified IDs. Rendered on /learn/resources with the same
// click-to-load facade the lessons use.

export interface VaultVideo {
  id: string;
  title: string;
  channel: string;
}

export interface VaultTopic {
  slug: string;
  label: { en: string; ar: string };
  note: { en: string; ar: string };
  videos: VaultVideo[];
}

export const VIDEO_VAULT: VaultTopic[] = [
  {
    slug: "mindset",
    label: { en: "The writer's mindset", ar: "عقلية الكاتب" },
    note: {
      en: "(habits that carry you to the last page)",
      ar: "(عادات توصلك لآخر صفحة)",
    },
    videos: [
      { id: "MEUh_y1IFZY", title: "The Philosophy of Professional Writing", channel: "Brandon Sanderson" },
      { id: "oP3c1h8v2ZQ", title: "Kurt Vonnegut on the Shapes of Stories", channel: "David Comberg" },
    ],
  },
  {
    slug: "structure",
    label: { en: "Story structure", ar: "بنية القصة" },
    note: {
      en: "(how the skeleton of a novel actually holds)",
      ar: "(كيف يشد هيكل الرواية بعضه فعلاً)",
    },
    videos: [
      { id: "TUzjLe7FxzY", title: "Outline a Strong Opening Act", channel: "Abbie Emmons" },
      { id: "o3sTkl7MUcg", title: "The Status Quo, First Quarter", channel: "Ellen Brock" },
      { id: "rJMy4tfjaUg", title: "Multiple Plotlines", channel: "K.M. Weiland" },
      { id: "117XVgjozzc", title: "9 Worst Crimes Against Storytelling", channel: "Writer Brandon McNulty" },
    ],
  },
  {
    slug: "openings",
    label: { en: "First chapters", ar: "الفصل الأول" },
    note: {
      en: "(the page that decides everything)",
      ar: "(الصفحة التي تحسم كل شيء)",
    },
    videos: [
      { id: "G_yJANO2Luk", title: "5 Chapter One Mistakes New Fantasy Writers Make", channel: "Jed Herne" },
      { id: "GUVV9Uzgol8", title: "Helping a Writer Fix His 1st Chapter in 54 Minutes", channel: "Jed Herne" },
    ],
  },
  {
    slug: "characters",
    label: { en: "Characters and arcs", ar: "الشخصيات وأقواسها" },
    note: {
      en: "(people your readers refuse to leave)",
      ar: "(شخصيات يرفض قراؤك تركها)",
    },
    videos: [
      { id: "1JEBfmAJ1YI", title: "How to Write the Character Arc", channel: "Ellen Brock" },
      { id: "qKG4YJIpiP0", title: "The Flat Character Arc", channel: "Ellen Brock" },
      { id: "EkJHQ7XktUQ", title: "How to Write Better Internal Conflict, 3 Steps", channel: "K.A. Emmons" },
      { id: "H4KyJ20uWVw", title: "5 Worst Villain Cliches", channel: "Writer Brandon McNulty" },
      { id: "VeXqndZdzwE", title: "Lecture 11: Character Q and A", channel: "Brandon Sanderson" },
      { id: "avAX8Y1HTD0", title: "Realistic and Captivating Dialogue", channel: "K.A. Emmons" },
    ],
  },
  {
    slug: "prose",
    label: { en: "Prose and style", ar: "الأسلوب والجملة" },
    note: {
      en: "(sentences worth reading twice)",
      ar: "(جمل تستحق أن تقرأ مرتين)",
    },
    videos: [
      { id: "N70D6xP0aQo", title: "12 Ways to Write Better Sentences", channel: "Ellen Brock" },
      { id: "pDYUYxsbf8s", title: "Flat Writing Into Engaging Prose", channel: "K.A. Emmons" },
      { id: "DvZLk6orxqo", title: "Show, Not Tell Internal Conflict", channel: "Abbie Emmons" },
      { id: "-83QrAAbnQY", title: "Show Don't Tell: What You Need to Know", channel: "Jerry B. Jenkins" },
    ],
  },
  {
    slug: "description",
    label: { en: "Description and setting", ar: "الوصف والمكان" },
    note: {
      en: "(worlds the reader can smell)",
      ar: "(عوالم يشمّها القارئ)",
    },
    videos: [
      { id: "WbbEJ6ziCjo", title: "5 More Ways to Write Better Descriptions", channel: "Ellen Brock" },
      { id: "i44KnocYsno", title: "How to Write the Impossible", channel: "Tale Foundry" },
    ],
  },
  {
    slug: "worldbuilding",
    label: { en: "Worldbuilding", ar: "بناء العوالم" },
    note: {
      en: "(rules, magic, and believable places)",
      ar: "(قوانين وسحر وأماكن مقنعة)",
    },
    videos: [
      { id: "hvoofeICHRo", title: "Exposition, Magic and Worldbuilding", channel: "Hello Future Me" },
      { id: "iMJQb5bGu_g", title: "Hard Magic Systems", channel: "Hello Future Me" },
      { id: "ZVrnfniQiS8", title: "Soft Magic Systems", channel: "Hello Future Me" },
      { id: "3Y9p53C1lP4", title: "Sanderson's Laws of Magic", channel: "Brandon Sanderson" },
      { id: "mGgGBZutVVg", title: "The Tools to Make Your Worlds Better", channel: "Brandon Sanderson" },
      { id: "JD99clpR1KM", title: "A Believable World, Four Problems", channel: "Ellen Brock" },
      { id: "W1afbpM80b0", title: "Lecture 8: Worldbuilding Q and A", channel: "Brandon Sanderson" },
    ],
  },
  {
    slug: "revision",
    label: { en: "Revision and editing", ar: "المراجعة والتحرير" },
    note: {
      en: "(where good drafts become books)",
      ar: "(هنا تتحول المسودة إلى كتاب)",
    },
    videos: [
      { id: "7pA4jBmtWMU", title: "Aggressive Self Editing with Jerry Jenkins", channel: "ProWritingAid" },
      { id: "blehVIDyuXk", title: "Lecture 7: Short Stories with Mary Robinette Kowal", channel: "Brandon Sanderson" },
    ],
  },
  {
    slug: "publishing",
    label: { en: "Getting published", ar: "طريق النشر" },
    note: {
      en: "(query letters that get answered)",
      ar: "(رسائل عرض تلقى رداً)",
    },
    videos: [
      { id: "uM65RsSRFko", title: "Query Letter Part 1", channel: "Ellen Brock" },
      { id: "366W2WpJ6q0", title: "Query Letter Part 2", channel: "Ellen Brock" },
    ],
  },
];

export const VAULT_VIDEO_COUNT = VIDEO_VAULT.reduce((n, t) => n + t.videos.length, 0);
