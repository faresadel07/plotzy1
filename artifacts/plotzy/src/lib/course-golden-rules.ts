// The Golden Rules: five hard-won rules per module, shown as a
// handwritten recap wall at the end of each module page. Written in
// the spirit of Sanderson's recap notes and Reedsy's one-idea cards:
// short enough to remember, sharp enough to use tonight.

export interface GoldenRule {
  en: string;
  ar: string;
}

export const GOLDEN_RULES: Record<string, { title: { en: string; ar: string }; rules: GoldenRule[] }> = {
  foundation: {
    title: { en: "Five rules to keep", ar: "خمس قواعد خذها معك" },
    rules: [
      {
        en: "A story is a person who wants something and can't easily get it. If you have that, you have a book.",
        ar: "القصة شخص يريد شيئاً ولا يناله بسهولة. إن ملكت هذا فأنت تملك كتاباً.",
      },
      {
        en: "Your idea is worth nothing until page one exists. Average written beats brilliant imagined.",
        ar: "فكرتك لا تساوي شيئاً قبل أن توجد الصفحة الأولى. المكتوب العادي يغلب المتخيل العبقري.",
      },
      {
        en: "Every premise makes the reader a promise. Write the promise in one line and pin it above your desk.",
        ar: "كل فكرة تقطع وعداً للقارئ. اكتب الوعد في سطر واحد وعلقه فوق مكتبك.",
      },
      {
        en: "Stakes are not explosions. Stakes are what the character loses if they fail.",
        ar: "الرهان ليس انفجارات. الرهان هو ما تخسره الشخصية إذا فشلت.",
      },
      {
        en: "Write the book you would stay up all night to read, not the one you think you should write.",
        ar: "اكتب الكتاب الذي تسهر الليل لتقرأه، لا الذي تظن أن عليك كتابته.",
      },
    ],
  },
  architecture: {
    title: { en: "Five rules to keep", ar: "خمس قواعد خذها معك" },
    rules: [
      {
        en: "Structure is not a cage. It is the reason the middle of your book will not collapse.",
        ar: "البنية ليست قفصاً. هي السبب الذي يمنع منتصف كتابك من الانهيار.",
      },
      {
        en: "Every scene needs a goal, an obstacle, and a change. If nothing changed, the scene is a corridor. Cut it.",
        ar: "كل مشهد يحتاج هدفاً وعقبة وتغييراً. إن لم يتغير شيء فالمشهد مجرد ممر. احذفه.",
      },
      {
        en: "The midpoint should flip something: knowledge, power, or desire. A middle that flips never sags.",
        ar: "منتصف القصة يجب أن يقلب شيئاً: معرفة أو قوة أو رغبة. المنتصف الذي يقلب لا يترهل أبداً.",
      },
      {
        en: "Keep a promise ledger: every setup you plant must pay off, and every payoff must have been planted.",
        ar: "احتفظ بدفتر وعود: كل بذرة تزرعها يجب أن تثمر، وكل ثمرة يجب أن تكون لها بذرة.",
      },
      {
        en: "Plotters and pantsers both finish books. People who wait to feel ready do not.",
        ar: "المخطط والمرتجل كلاهما ينهي الكتب. أما من ينتظر الجاهزية فلا ينهي شيئاً.",
      },
    ],
  },
  characters: {
    title: { en: "Five rules to keep", ar: "خمس قواعد خذها معك" },
    rules: [
      {
        en: "Readers follow want, not virtue. A thief who wants something badly beats a saint who wants nothing.",
        ar: "القارئ يتبع الرغبة لا الفضيلة. لص يريد شيئاً بشدة أهم من قديس لا يريد شيئاً.",
      },
      {
        en: "Give your protagonist a lie they believe about themselves. The story is what breaks it.",
        ar: "أعط بطلك كذبة يصدقها عن نفسه. القصة هي ما يكسر هذه الكذبة.",
      },
      {
        en: "Your antagonist is the hero of their own story. Write one page from their side and your villain stops being cardboard.",
        ar: "خصمك بطل في قصته هو. اكتب صفحة واحدة من وجهة نظره ولن يعود شريراً من كرتون.",
      },
      {
        en: "Dialogue is what people do to each other, not what they say. Cut the greetings, keep the friction.",
        ar: "الحوار هو ما يفعله الناس ببعضهم، لا ما يقولونه. احذف التحيات وأبق الاحتكاك.",
      },
      {
        en: "If two characters serve the same job, merge them. Fewer, deeper people beat a crowded cast.",
        ar: "إن أدت شخصيتان الوظيفة نفسها فادمجهما. شخصيات أقل وأعمق تغلب حشداً باهتاً.",
      },
    ],
  },
  world: {
    title: { en: "Five rules to keep", ar: "خمس قواعد خذها معك" },
    rules: [
      {
        en: "Build only what the story needs. The reader wants a window, not the architect's blueprints.",
        ar: "ابنِ فقط ما تحتاجه القصة. القارئ يريد نافذة، لا مخططات المهندس.",
      },
      {
        en: "Show emotion, tell information. Showing everything is as wrong as telling everything.",
        ar: "أظهر المشاعر وأخبر المعلومات. إظهار كل شيء خطأ بقدر إخبار كل شيء.",
      },
      {
        en: "One precise detail beats five vague ones. The smell of one spice makes the whole market real.",
        ar: "تفصيلة دقيقة واحدة تغلب خمساً غامضة. رائحة بهار واحد تجعل السوق كله حقيقياً.",
      },
      {
        en: "Magic that solves problems must have rules and costs. Magic that creates problems can stay mysterious.",
        ar: "السحر الذي يحل المشاكل يحتاج قوانين وثمناً. السحر الذي يصنع المشاكل يجوز أن يبقى غامضاً.",
      },
      {
        en: "Description is pacing. Slow the prose where you want the reader to slow their breath.",
        ar: "الوصف هو الإيقاع. أبطئ النثر حيث تريد للقارئ أن يبطئ أنفاسه.",
      },
    ],
  },
  process: {
    title: { en: "Five rules to keep", ar: "خمس قواعد خذها معك" },
    rules: [
      {
        en: "First drafts are allowed to be bad. That is what first drafts are for.",
        ar: "المسودة الأولى مسموح لها أن تكون سيئة. هذا هو عملها بالضبط.",
      },
      {
        en: "Never edit and draft in the same sitting. Drafting builds, editing judges, and judges kill builders.",
        ar: "لا تحرر وتسوّد في الجلسة نفسها. التسويد يبني والتحرير يحاكم، والقضاة يقتلون البنائين.",
      },
      {
        en: "Revise in passes: structure first, scenes second, sentences last. Polishing a scene you will delete is wasted love.",
        ar: "راجع على دفعات: البنية أولاً ثم المشاهد ثم الجمل. تلميع مشهد ستحذفه حب مهدور.",
      },
      {
        en: "Read your dialogue aloud. Your ear catches what your eye forgives.",
        ar: "اقرأ حوارك بصوت عال. أذنك تلتقط ما تتسامح معه عينك.",
      },
      {
        en: "Done is a decision, not a feeling. At some point you ship the book and write a better next one.",
        ar: "الاكتمال قرار لا شعور. في لحظة ما تسلّم الكتاب وتكتب التالي أفضل منه.",
      },
    ],
  },
  publishing: {
    title: { en: "Five rules to keep", ar: "خمس قواعد خذها معك" },
    rules: [
      {
        en: "Traditional and self-publishing are both real publishing. Pick the one that fits your patience and control.",
        ar: "النشر التقليدي والنشر الذاتي كلاهما نشر حقيقي. اختر ما يناسب صبرك ورغبتك في التحكم.",
      },
      {
        en: "A query letter sells the story, not the writer's feelings about it. Hook, stakes, bio. Three hundred words.",
        ar: "رسالة العرض تبيع القصة لا مشاعرك تجاهها. خطاف ثم رهان ثم نبذة. ثلاثمئة كلمة تكفي.",
      },
      {
        en: "Rejection is data, not verdict. Every published writer owns a drawer of noes.",
        ar: "الرفض معلومة لا حكماً نهائياً. كل كاتب منشور يملك درجاً مليئاً بالرفض.",
      },
      {
        en: "Your second book markets your first better than any ad ever will.",
        ar: "كتابك الثاني يسوّق لكتابك الأول أفضل من أي إعلان في العالم.",
      },
      {
        en: "Readers remember how a book made them feel, not how it was published.",
        ar: "القارئ يتذكر ما جعله الكتاب يشعر به، لا الطريقة التي نشر بها.",
      },
    ],
  },
};
