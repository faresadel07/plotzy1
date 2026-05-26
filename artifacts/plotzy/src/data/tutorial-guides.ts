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
// On top of the media each guide carries a `features` array, short
// bilingual bullets that describe exactly what a writer can do in
// the section the video is showing. The modal lays them out beside
// the video on desktop, stacked under it on mobile.
//
// House style for the copy in this file:
//   - No em-dashes or en-dashes anywhere in the user-facing copy.
//   - No emojis anywhere in the user-facing copy.
//   - Bilingual EN + AR; Arabic strings are translated, not
//     transliterated.
//   - Feature bullets are 5 to 7 per guide, short and concrete.

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
   * images (or both) must be present, a guide with neither is
   * filtered out at render time.
   */
  images?: TutorialImage[];
}

// ─── Featured video ──────────────────────────────────────────────────
// One video at the top of the Tutorial page. Set `url` to null until
// the video is uploaded; the page hides the hero video card cleanly
// in that case. Accepts YouTube and Vimeo URLs, toEmbedUrl() in
// pages/tutorial.tsx normalises them.

export const FEATURED_VIDEO: {
  url: string | null;
  title: { en: string; ar: string };
  description: { en: string; ar: string };
  duration: string;
} = {
  url: null, // e.g. "https://www.youtube.com/watch?v=XXXXXXX"
  title: {
    en: "Plotzy in five minutes",
    ar: "بلوتزي في خمس دقائق",
  },
  description: {
    en: "A quick walkthrough of how Plotzy works, from creating your first book to publishing.",
    ar: "جولة سريعة على بلوتزي، من إنشاء كتابك الأول إلى نشره.",
  },
  duration: "5:00",
};

// ─── Guides ──────────────────────────────────────────────────────────
// Ordered to match the natural journey of a first-time visitor:
//   1. Home page (where you land)
//   2. Writing guide (how to write)
//   3. Course (structured craft education)
//   4. Community library (read other writers, find your audience)
//   5. AI marketplace (professional analysis of your manuscript)
//   6. Donation page (how the project sustains itself, optional)
//   7. Support and FAQ (where to go when something is wrong)

export const TUTORIAL_GUIDES: TutorialGuide[] = [

  // ── 1. Home page ───────────────────────────────────────────────────
  {
    id: "home",
    title: {
      en: "Home page",
      ar: "الصفحة الرئيسية",
    },
    description: {
      en: "Your workspace and the first thing you see after signing in. From here you open any book in your library, start a new project, or return to the chapter you were last writing.",
      ar: "مساحة عملك والصفحة الأولى التي تراها بعد تسجيل الدخول. من هنا تفتح أي كتاب في مكتبتك، تبدأ مشروعاً جديداً، أو ترجع إلى الفصل الذي كنت تكتبه آخر مرة.",
    },
    category: "getting-started",
    video: {
      src: "/tutorials/home/home.mp4",
    },
    features: [
      {
        title: { en: "Open your library shelf", ar: "افتح رفّ مكتبتك" },
        body: {
          en: "Every book you have started appears on the shelf. Click a cover to open it in the editor where you left off.",
          ar: "كل كتاب بدأت كتابته يظهر على الرفّ. اضغط على أي غلاف لفتحه في المحرّر من حيث توقّفت.",
        },
      },
      {
        title: { en: "Start a new book or article", ar: "ابدأ كتاباً أو مقالاً جديداً" },
        body: {
          en: "Press the New button and pick whether you are starting a full book or a short article. Plotzy creates the file and opens the editor immediately.",
          ar: "اضغط على زر «جديد» واختر إن كنت تبدأ كتاباً كاملاً أو مقالاً قصيراً. ينشئ بلوتزي الملف ويفتح المحرّر فوراً.",
        },
      },
      {
        title: { en: "Search across your work", ar: "ابحث في كل أعمالك" },
        body: {
          en: "Use the search bar at the top to find any book by its title or by a phrase you remember writing inside it.",
          ar: "استخدم شريط البحث في الأعلى للعثور على أي كتاب بعنوانه أو بجملة تتذكّر أنك كتبتها بداخله.",
        },
      },
      {
        title: { en: "Restore from trash", ar: "استرجِع من سلّة المهملات" },
        body: {
          en: "Anything you delete moves to the trash for thirty days. Open it from the menu to restore a book or remove it permanently.",
          ar: "أي شيء تحذفه ينتقل إلى سلّة المهملات لمدة ثلاثين يوماً. افتحها من القائمة لاسترجاع كتاب أو حذفه نهائياً.",
        },
      },
      {
        title: { en: "Collaborate on a shared book", ar: "تعاوَن على كتاب مشترك" },
        body: {
          en: "Enter a join code from another writer to add yourself as a collaborator on their book and start writing together in real time.",
          ar: "أدخِل رمز انضمام من كاتب آخر لتنضمّ كمتعاون على كتابه وتبدأوا الكتابة معاً مباشرةً.",
        },
      },
      {
        title: { en: "Pick up where you left off", ar: "تابِع من حيث توقّفت" },
        body: {
          en: "The most recently edited book sits at the top of the shelf so the next click is the chapter you were working on.",
          ar: "آخر كتاب حرّرته يقف في رأس الرفّ، فتكون النقرة التالية على الفصل الذي كنت تشتغل فيه.",
        },
      },
    ],
  },

  // ── 2. Writing guide ───────────────────────────────────────────────
  {
    id: "guide",
    title: {
      en: "The writing guide",
      ar: "دليل الكتابة",
    },
    description: {
      en: "A bilingual reference for the craft of writing, available without signing in. Use it as a quick look-up while you write, or as a long read when you want to deepen a specific skill.",
      ar: "مرجع ثنائي اللغة لحرفة الكتابة، متاح بدون تسجيل دخول. استخدمه للبحث السريع أثناء الكتابة، أو للقراءة المعمّقة حين تريد تطوير مهارة محدّدة.",
    },
    category: "writing",
    video: {
      src: "/tutorials/guide/guide.mp4",
    },
    features: [
      {
        title: { en: "Pick your genre", ar: "اختر نوعك الأدبي" },
        body: {
          en: "Fifteen genres covered in depth with the tactics, common pitfalls, and reader expectations specific to each one.",
          ar: "خمسة عشر نوعاً أدبياً مغطّاة بعمق، مع التقنيات والأخطاء الشائعة وتوقّعات القرّاء الخاصة بكل نوع.",
        },
      },
      {
        title: { en: "Choose a story structure", ar: "اختر بنية القصة" },
        body: {
          en: "Compare the Hero's Journey, Save the Cat, and the classic Three-Act structure side by side, with the beats and breakpoints of each laid out clearly.",
          ar: "قارِن بين رحلة البطل وSave the Cat والبنية الثلاثيّة الكلاسيكيّة جنباً إلى جنب، مع شرح واضح للنقاط الفاصلة في كلٍّ منها.",
        },
      },
      {
        title: { en: "Build real characters", ar: "اصنع شخصيات حقيقية" },
        body: {
          en: "The six pillars of character and the three classic arc types, with worked examples of how strong novels apply each.",
          ar: "ركائز الشخصيّة الستّ وأنواع المنحنى الكلاسيكيّة الثلاثة، مع أمثلة تطبيقيّة من روايات قويّة على كل واحدة.",
        },
      },
      {
        title: { en: "Write dialogue that reads natural", ar: "اكتب حواراً يقرأ طبيعياً" },
        body: {
          en: "Principles for subtext, rhythm, and character voice, with worked examples in both Arabic and English.",
          ar: "مبادئ المعنى الضمني والإيقاع وصوت الشخصيّة، مع أمثلة تطبيقيّة بالعربيّة والإنجليزيّة.",
        },
      },
      {
        title: { en: "Self edit your chapters", ar: "حرّر فصولك بنفسك" },
        body: {
          en: "A line-by-line editing checklist you can run on any chapter to catch the bugs every first draft has.",
          ar: "قائمة مراجعة سطراً بسطر يمكنك تطبيقها على أي فصل لاصطياد الأخطاء التي تقع فيها كل مسوّدة أولى.",
        },
      },
      {
        title: { en: "Avoid first draft mistakes", ar: "تجنّب أخطاء المسوّدة الأولى" },
        body: {
          en: "A curated list of the patterns every new writer falls into, with the rewrite for each one shown next to the original.",
          ar: "قائمة منتقاة بالأنماط التي يقع فيها كل كاتب جديد، مع كتابة بديلة لكل خطأ موضوعة بجانب النص الأصلي.",
        },
      },
      {
        title: { en: "Download the full guide", ar: "نزّل الدليل كاملاً" },
        body: {
          en: "Save the entire guide as a PDF so you can keep it on your phone or print it for the notebook beside your desk.",
          ar: "احفظ الدليل كاملاً كملف PDF لتحتفظ به على هاتفك أو لتطبعه وتضعه في الدفتر بجانب مكتبك.",
        },
      },
    ],
  },

  // ── 3. The writing course ──────────────────────────────────────────
  {
    id: "course",
    title: {
      en: "The writing course",
      ar: "دورة الكتابة",
    },
    description: {
      en: "A six-module course on writing your first book, free for every Plotzy user. Twenty-seven lessons, six quizzes, a final project, and a verified certificate on completion.",
      ar: "دورة من ستة فصول لكتابة كتابك الأول، مجّانية لكل مستخدم في بلوتزي. سبعة وعشرون درساً، ستة اختبارات، مشروع نهائي، وشهادة موثّقة عند الإتمام.",
    },
    category: "writing",
    video: {
      src: "/tutorials/course/course.mp4",
    },
    features: [
      {
        title: { en: "Six modules from idea to finished book", ar: "ستة فصول من الفكرة إلى الكتاب المنشور" },
        body: {
          en: "Each module covers one stage of the journey: foundations, planning, drafting, revision, publishing, and life after publishing.",
          ar: "كل فصل يغطّي مرحلة من الرحلة: الأسس، التخطيط، المسوّدة، المراجعة، النشر، وما بعد النشر.",
        },
      },
      {
        title: { en: "Twenty-seven focused lessons", ar: "سبعة وعشرون درساً مركّزاً" },
        body: {
          en: "Each lesson is short and ends with a concrete next step you can apply to whatever you are writing in Plotzy.",
          ar: "كل درس مختصر وينتهي بخطوة عمليّة محدّدة يمكنك تطبيقها على ما تكتبه في بلوتزي.",
        },
      },
      {
        title: { en: "Module quizzes", ar: "اختبارات الفصول" },
        body: {
          en: "A short quiz at the end of every module to check what stuck. Pass all six and the final exam unlocks automatically.",
          ar: "اختبار قصير في نهاية كل فصل للتحقّق ممّا فهمت. اجتز الستّة جميعاً ليُفتح أمامك الاختبار النهائي تلقائياً.",
        },
      },
      {
        title: { en: "Final project", ar: "المشروع النهائي" },
        body: {
          en: "Submit a complete short manuscript or a detailed outline. Plotzy walks you through every checkpoint before you submit.",
          ar: "قدِّم مخطوطة قصيرة كاملة أو مخطّطاً تفصيلياً. يأخذك بلوتزي خطوة بخطوة عبر كل نقطة قبل التسليم.",
        },
      },
      {
        title: { en: "Verified certificate", ar: "شهادة موثّقة" },
        body: {
          en: "On completion you receive a downloadable certificate with a unique verification code anyone can check on Plotzy.",
          ar: "عند الإتمام تحصل على شهادة قابلة للتنزيل برمز تحقّق فريد يمكن لأي شخص التأكّد منه على بلوتزي.",
        },
      },
      {
        title: { en: "Continue where you stopped", ar: "تابِع من حيث توقّفت" },
        body: {
          en: "Plotzy remembers the last lesson you opened and brings you straight back to it the next time you sign in.",
          ar: "يحفظ بلوتزي آخر درس فتحته ويعيدك إليه مباشرةً في المرّة التالية التي تسجّل فيها الدخول.",
        },
      },
    ],
  },

  // ── 4. Community library ───────────────────────────────────────────
  {
    id: "community",
    title: {
      en: "Community library",
      ar: "مكتبة المجتمع",
    },
    description: {
      en: "Read what other writers are publishing on Plotzy, alongside tens of thousands of public-domain classics in Arabic and English. Like, rate, and follow the writers whose work resonates with you.",
      ar: "اقرأ ما ينشره الكتّاب الآخرون على بلوتزي، إلى جانب عشرات الآلاف من كلاسيكيّات الأدب العامّ بالعربيّة والإنجليزيّة. أعجَب وقيِّم وتابع الكتّاب الذين تستهويك أعمالهم.",
    },
    category: "community",
    video: {
      src: "/tutorials/community/community.mp4",
    },
    features: [
      {
        title: { en: "Browse community books", ar: "تصفّح كتب المجتمع" },
        body: {
          en: "Every book published by a Plotzy writer lives here, sortable by recent or most-read and filterable by fifteen genres.",
          ar: "كل كتاب نشره كاتب على بلوتزي موجود هنا، قابل للترتيب حسب الأحدث أو الأكثر قراءةً، وللتصفية حسب خمسة عشر نوعاً أدبياً.",
        },
      },
      {
        title: { en: "Like and rate a book", ar: "أعجِب بكتاب وقيّمه" },
        body: {
          en: "Tap the heart on any book you enjoyed, or leave a star rating that helps the author know what readers thought.",
          ar: "اضغط القلب على أي كتاب أحببته، أو امنحه تقييماً بالنجوم يساعد الكاتب على معرفة رأي القرّاء.",
        },
      },
      {
        title: { en: "Follow a writer", ar: "تابِع كاتباً" },
        body: {
          en: "Open any author profile and follow them so new chapters and new books appear in your feed automatically.",
          ar: "افتح ملفّ أي كاتب وتابعه لتظهر فصوله وكتبه الجديدة تلقائياً في خلاصتك.",
        },
      },
      {
        title: { en: "Read seventy thousand English classics", ar: "اقرأ سبعين ألف كلاسيكيّة بالإنجليزيّة" },
        body: {
          en: "The full Project Gutenberg catalogue is built into Plotzy. Open any book, read it in-app, and resume on the same page next time.",
          ar: "كامل كتالوج Project Gutenberg مدمج في بلوتزي. افتح أي كتاب، اقرأه داخل التطبيق، وارجع إلى الصفحة نفسها لاحقاً.",
        },
      },
      {
        title: { en: "Read the Hindawi Arabic library", ar: "اقرأ مكتبة هنداوي العربيّة" },
        body: {
          en: "Tens of thousands of public-domain Arabic books are bundled in, with proper Arabic typography and right-to-left reading by default.",
          ar: "عشرات الآلاف من الكتب العربيّة في الملك العامّ مضمّنة، بطباعة عربيّة سليمة وقراءة من اليمين إلى اليسار كإعداد افتراضي.",
        },
      },
      {
        title: { en: "Filter by genre or topic", ar: "صفِّ حسب النوع أو الموضوع" },
        body: {
          en: "Narrow the shelf down to fantasy, mystery, romance, biography, and a dozen more, or pick from sixteen non-fiction topics in the public-domain library.",
          ar: "ضيِّق الرفّ ليُظهر الفانتازيا أو الغموض أو الرومانسيّة أو السيرة الذاتيّة وغيرها، أو اختر من ستّة عشر موضوعاً غير روائي في مكتبة الملك العامّ.",
        },
      },
      {
        title: { en: "Resume reading", ar: "متابعة القراءة" },
        body: {
          en: "Books you started appear in a Recently Read shelf so you can jump back to the exact page you stopped on.",
          ar: "الكتب التي بدأتها تظهر في رفّ «قُرئت مؤخّراً» لتعود إلى الصفحة نفسها التي توقّفت عندها.",
        },
      },
    ],
  },

  // ── 5. AI marketplace ──────────────────────────────────────────────
  {
    id: "marketplace",
    title: {
      en: "AI marketplace",
      ar: "متجر الذكاء الاصطناعي",
    },
    description: {
      en: "Professional editorial, design, and marketing analyses for your manuscript, delivered in minutes by a top-tier model. Pick a service, point it at your book, and get a polished report you can act on.",
      ar: "تحليلات تحريريّة وتصميميّة وتسويقيّة احترافيّة لمخطوطتك، تصلك خلال دقائق من نموذج متقدّم. اختر الخدمة، وجّهها إلى كتابك، واحصل على تقرير جاهز للتنفيذ.",
    },
    category: "ai-tools",
    video: {
      src: "/tutorials/marketplace/marketplace.mp4",
    },
    features: [
      {
        title: { en: "Developmental editor", ar: "محرّر تطويري" },
        body: {
          en: "A senior-editor-level report on story structure, pacing, character arcs, plot holes, dialogue, and the top revisions to make next.",
          ar: "تقرير بمستوى محرّر كبير عن البنية والإيقاع ومنحنيات الشخصيّات والثغرات والحوار وأهمّ التعديلات التالية.",
        },
      },
      {
        title: { en: "Copy editor", ar: "محرّر لغوي" },
        body: {
          en: "Grammar, punctuation, voice consistency, repetition, and a ranked list of specific fixes with quoted examples.",
          ar: "القواعد، علامات الترقيم، اتّساق الصوت، التكرار، وقائمة مرتّبة بالإصلاحات المحدّدة مع أمثلة مقتبسة.",
        },
      },
      {
        title: { en: "Beta reader simulation", ar: "محاكاة قارئ مبكّر" },
        body: {
          en: "Five distinct reader personas read your manuscript and give you blunt, specific feedback the way real beta readers do.",
          ar: "خمس شخصيّات قرّاء مختلفة تقرأ مخطوطتك وتعطيك ملاحظات صريحة ومحدّدة كما يفعل القرّاء المبكّرون الحقيقيّون.",
        },
      },
      {
        title: { en: "Cover generator", ar: "مولِّد الأغلفة" },
        body: {
          en: "An AI-designed book cover built from your title, genre, and a few words about the mood you want.",
          ar: "غلاف كتاب مصمّم بالذكاء الاصطناعي مبنيّ على عنوانك ونوعك الأدبي وكلمات قليلة عن الجوّ الذي تريده.",
        },
      },
      {
        title: { en: "Blurb writer", ar: "كاتب الملخّص التسويقي" },
        body: {
          en: "Three blurbs of different lengths for the back cover, your Amazon page, and a short social caption.",
          ar: "ثلاثة ملخّصات بأطوال مختلفة للغلاف الخلفي ولصفحة أمازون ولتعليق اجتماعي قصير.",
        },
      },
      {
        title: { en: "Three ways to feed it text", ar: "ثلاث طرق لإدخال النصّ" },
        body: {
          en: "Upload a TXT file, paste text directly, or pick one of your own books from your Plotzy library. No reformatting needed.",
          ar: "ارفع ملفّ TXT، الصق النصّ مباشرةً، أو اختر كتاباً من مكتبتك على بلوتزي. لا حاجة لإعادة التنسيق.",
        },
      },
      {
        title: { en: "Reports in your language", ar: "تقارير بلغتك" },
        body: {
          en: "Submit an Arabic manuscript and the report comes back in Arabic. Submit it in English and it comes back in English.",
          ar: "أرسل مخطوطتك بالعربيّة فيأتيك التقرير بالعربيّة. أرسلها بالإنجليزيّة فيأتيك التقرير بالإنجليزيّة.",
        },
      },
    ],
  },

  // ── 6. Donation page ───────────────────────────────────────────────
  {
    id: "donate",
    title: {
      en: "Donation page",
      ar: "صفحة التبرّع",
    },
    description: {
      en: "Plotzy is free for every writer. The donation page is where supporters who can spare a little keep the servers on and the AI bills paid for everyone else.",
      ar: "بلوتزي مجّاني لكل كاتب. صفحة التبرّع هي حيث يساهم من يستطيع المساعدة في إبقاء السيرفر يعمل وفواتير الذكاء الاصطناعي مدفوعة للجميع.",
    },
    category: "getting-started",
    video: {
      src: "/tutorials/donate/donate.mp4",
    },
    features: [
      {
        title: { en: "Pick a preset amount", ar: "اختر مبلغاً جاهزاً" },
        body: {
          en: "Choose one of six preset amounts from five to two hundred and fifty dollars, or enter a custom number below.",
          ar: "اختر أحد ستّة مبالغ جاهزة من خمسة إلى مئتين وخمسين دولاراً، أو أدخِل رقماً مخصّصاً في الأسفل.",
        },
      },
      {
        title: { en: "Pay with PayPal or card", ar: "ادفع بـ PayPal أو ببطاقة" },
        body: {
          en: "PayPal Smart Buttons handle both account payments and credit-card payments in one place. Nothing extra to install.",
          ar: "تدير أزرار PayPal الذكيّة الدفع عبر الحساب أو ببطاقة الائتمان في مكان واحد. لا شيء إضافيّ يحتاج إلى تثبيت.",
        },
      },
      {
        title: { en: "Receipt by email", ar: "إيصال بالبريد الإلكتروني" },
        body: {
          en: "PayPal sends a receipt to your inbox seconds after the donation lands. We never store your card information.",
          ar: "يرسل PayPal إيصالاً إلى بريدك خلال ثوانٍ من وصول التبرّع. نحن لا نحفظ أي معلومات عن بطاقتك.",
        },
      },
      {
        title: { en: "No perks, no tiers, no paywall", ar: "بلا مزايا حصريّة وبلا فئات وبلا جدار دفع" },
        body: {
          en: "Donating unlocks nothing extra. The same Plotzy stays free for the next writer who signs in.",
          ar: "التبرّع لا يفتح أي شيء إضافي. يبقى بلوتزي نفسه مجّانياً للكاتب التالي الذي يسجّل دخوله.",
        },
      },
      {
        title: { en: "Cancel anytime", ar: "ألغِ في أي وقت" },
        body: {
          en: "Every donation is a one-time payment. There is no recurring subscription to cancel, no card on file to remove.",
          ar: "كل تبرّع دفعة واحدة فقط. لا اشتراك متكرّر تلغيه، ولا بطاقة محفوظة تحذفها.",
        },
      },
    ],
  },

  // ── 7. Support and FAQ ─────────────────────────────────────────────
  {
    id: "support",
    title: {
      en: "Support and FAQ",
      ar: "الدعم والأسئلة الشائعة",
    },
    description: {
      en: "When something is broken or you have a question that the writing guide cannot answer, this is where you reach a real person. Open a ticket, browse the FAQ, or check whether a known issue is already on our radar.",
      ar: "حين يتعطّل شيء، أو يخطر سؤال لا يجيب عنه دليل الكتابة، هذا هو المكان الذي تصل فيه إلى شخص حقيقي. افتح تذكرة، تصفّح الأسئلة الشائعة، أو تحقّق ممّا إذا كانت مشكلة معروفة على رادارنا.",
    },
    category: "getting-started",
    video: {
      src: "/tutorials/support/support.mp4",
    },
    features: [
      {
        title: { en: "Open a support ticket", ar: "افتح تذكرة دعم" },
        body: {
          en: "Pick a category, set the priority, and describe what is happening. We reply in your language and keep the whole thread visible.",
          ar: "اختر التصنيف، حدِّد الأولويّة، واشرح ما يحصل. نردّ بلغتك ونُبقي كامل المحادثة مرئيّة لك.",
        },
      },
      {
        title: { en: "Set the priority", ar: "حدِّد الأولويّة" },
        body: {
          en: "Pick from low, normal, high, or urgent. Urgent tickets reach us first, the rest follow in queue.",
          ar: "اختر بين منخفضة، عاديّة، عالية، أو عاجلة. التذاكر العاجلة تصلنا أوّلاً، والباقي يتبع بالترتيب.",
        },
      },
      {
        title: { en: "Track every ticket you opened", ar: "تابع كل تذكرة فتحتها" },
        body: {
          en: "The My Tickets tab shows every conversation you have had with support, with the status of each one at a glance.",
          ar: "تبويب «تذاكري» يُظهر كل محادثة فتحتها مع الدعم، مع حالة كل واحدة بنظرة واحدة.",
        },
      },
      {
        title: { en: "Reply on an existing thread", ar: "ردّ على محادثة قائمة" },
        body: {
          en: "Open any ticket and add a reply without losing context. We see every message you sent before, in order.",
          ar: "افتح أي تذكرة وأضِف ردّاً بدون فقدان السياق. نحن نرى كل رسالة سابقة لك بالترتيب نفسه.",
        },
      },
      {
        title: { en: "Search the FAQ first", ar: "ابحث في الأسئلة الشائعة أوّلاً" },
        body: {
          en: "Eight categories, dozens of questions, answered in plain language. The fastest fix is often already there.",
          ar: "ثمانية تصنيفات، عشرات الأسئلة، إجاباتها بلغة بسيطة. أسرع حلّ كثيراً ما يكون موجوداً هنا أصلاً.",
        },
      },
      {
        title: { en: "Live system status", ar: "حالة النظام مباشرةً" },
        body: {
          en: "Check whether the platform is fully operational or whether a known outage is in progress before opening a ticket.",
          ar: "تحقّق إن كانت المنصّة تعمل بكامل طاقتها أم إن هناك عُطلاً معلوماً قائماً قبل أن تفتح تذكرة.",
        },
      },
    ],
  },

];
