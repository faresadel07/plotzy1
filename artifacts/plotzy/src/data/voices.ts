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

export const VOICES: VoiceProfile[] = [
  // ─────────────────────────────────────────────────────────────────
  // Naguib Mahfouz, 1911 to 2006, Egyptian
  // Photo: public domain (Egyptian copyright expired, Article 160 of
  // Law 82 of 2002). Source AUCpress via Wikimedia Commons. No video
  // in v1; pending verification of a YouTube embed from an official
  // channel (Nobel Prize, Al Jazeera Documentary, BBC).
  {
    slug: "naguib-mahfouz",
    name: { en: "Naguib Mahfouz", ar: "نجيب محفوظ" },
    bornYear: 1911,
    diedYear: 2006,
    nationality: { en: "Egyptian", ar: "مصري" },
    language: "ar",
    awards: ["Nobel Prize in Literature, 1988"],
    tagline: {
      en: "The novelist who made Cairo a literary city.",
      ar: "الروائي الذي جعل القاهرة مدينةً أدبيّة.",
    },
    body: {
      en: [
        "Naguib Mahfouz is the writer who made Cairo a city of literature the way Dickens made London and Joyce made Dublin. Born in 1911 in the al-Gamaliya quarter of old Cairo, he sat down at a civil servant's desk for forty years and wrote, in his spare hours, more than thirty novels and a hundred short stories. In 1988 the Swedish Academy gave him the Nobel Prize, the first Arabic-language writer to receive it. He was seventy-six, a careful man with a careful smile, and he never travelled to Stockholm to collect the award. His two daughters went instead.",
        "The Egypt of his early novels is the Egypt of monarchy, of British occupation, of an old urban order pulling apart at the seams. Mahfouz grew up in a religious lower-middle-class family in a quarter where the call to prayer mixed with the noise of donkey carts, watched the 1919 revolution as a child of eight, came of age in the 1930s as nationalist politics took the country, and wrote his first realist novels in the years after the 1952 Free Officers revolution. He had read his European modernists carefully — Proust, Mann, Galsworthy — and he absorbed their methods, then turned them on the alleys, the cafes, the small apartments of a Cairo the Egyptian novel had not yet tried to describe in full.",
        "His subject across the decades was the family as a stage for history. The Cairo Trilogy, three novels published in 1956 and 1957, follows the al-Sayyid Ahmad Abd al-Jawad household from the First World War to the eve of the Free Officers, and remains the most ambitious portrait of a single family in modern Arabic literature: the patriarch's double life, his wife's silent endurance, his children's drift toward communism and the Muslim Brotherhood and bourgeois ambition. In Children of the Alley, published in 1959, he wrote an allegorical novel about prophets and the violence done in their names; the religious establishment fought to suppress it for the rest of his life. Other novels — Midaq Alley, The Thief and the Dogs, Miramar, Adrift on the Nile — are tighter and darker, experiments in interior monologue and political fable.",
        "Every Arab novelist who came after him stands in his shadow, whether they read him or refused him. He was the first to prove that an Arabic novel could be both deeply local and serious world literature, that a Cairo apartment building was as legitimate a setting as a French village or a Russian estate. The Saudi novelist Abdulrahman Munif, the Lebanese novelist Elias Khoury, the Sudanese novelist Tayeb Salih, all worked in conversation with his example, sometimes against it. Translators carried him into thirty-five languages. In 1994 a young man stabbed him on a Cairo street; the attacker had not read him but had been told he was a heretic. Mahfouz survived, partly paralysed in his writing hand, and kept working by dictation until shortly before his death in 2006.",
        "There is a famous photograph of him in a Cairo café in the 1960s, a glass of tea in front of him, his small figure leaning forward to listen to whoever was sitting at the next chair. That posture — patient, listening, dressed in a neutral suit, neither arguing nor performing — is the figure most of his readers carry of him. He believed the writer's job was to listen until the city had finished telling its own story, and then to write it down without ornament.",
      ].join("\n\n"),
      ar: [
        "نجيب محفوظ هو الكاتب الذي صنع من القاهرة مدينةً أدبيّة، كما صنع ديكنز من لندن وجويس من دبلن. وُلد سنة 1911 في حيّ الجماليّة بقاهرة المعزّ، وقضى أربعين عاماً موظّفاً بسيطاً، يكتب في ساعاته الفارغة ما يزيد على ثلاثين رواية ومئة قصّة قصيرة. في سنة 1988 منحته الأكاديميّة السويديّة جائزة نوبل في الآداب، فكان أوّل كاتب باللغة العربيّة يُمنح إيّاها. كان في السادسة والسبعين، رجلاً هادئاً بابتسامة هادئة، ولم يسافر إلى استوكهولم ليستلم الجائزة بنفسه؛ ذهبت ابنتاه نيابةً عنه.",
        "كانت مصر التي كتب عنها في رواياته الأولى مصر الملكيّة، والاحتلال البريطاني، والنظام الحضري القديم وهو ينهار من داخله. وُلد لأسرة متديّنة من الطبقة الوسطى الدنيا في حيّ تختلط فيه دعوة المؤذّن بأصوات عربات الكارو، شهد ثورة 1919 طفلاً في الثامنة من عمره، تشكّل وعيه في الثلاثينيّات وسط مدّ الحركة الوطنيّة، وكتب رواياته الواقعيّة الأولى في السنوات التي تلت ثورة يوليو. كان قد قرأ روّاد الحداثة الأوروبيّين بتأمّل — بروست، توماس مان، جالسوورذي — استوعب أدواتهم، ثمّ وجّهها نحو حواري القاهرة، ومقاهيها، وشققها الصغيرة، وهي عوالم لم تكن الرواية العربيّة قد جرّبت وصفها بهذا الحجم من قبل.",
        "كان موضوعه الأوّل، على مدى عقود، الأسرة بوصفها مسرحاً للتاريخ. الثلاثيّة القاهريّة، نُشرت بين سنتَي 1956 و1957، تتبع عائلة السيّد أحمد عبد الجواد من الحرب العالميّة الأولى إلى عشيّة ثورة الضبّاط الأحرار، وتُعدّ أعمق رسم لعائلة واحدة في الأدب العربي الحديث: الأب وحياته المزدوجة، الأمّ وصبرها الصامت، الأبناء وانحدارهم بين الشيوعيّة والإخوان والطموح البرجوازي. في «أولاد حارتنا» سنة 1959 كتب رواية رمزيّة عن الأنبياء والعنف المُرتكب باسمهم، وحاربتها المؤسّسة الدينيّة طوال حياته. روايات أخرى — زقاق المدق، اللصّ والكلاب، ميرامار، ثرثرة فوق النيل — أكثر إحكاماً وقتامة، تجارب في المونولوج الداخلي وفي المَثل السياسي.",
        "كلّ روائي عربي جاء بعده يقف في ظلّه، سواء قرأه أم رفضه. كان الأوّل الذي أثبت أنّ الرواية العربيّة يمكن أن تكون محليّة بعمق، وأدباً عالميّاً جادّاً في الوقت نفسه، وأنّ شقّة في عمارة قاهريّة فضاءٌ مشروع للرواية كقرية فرنسيّة أو ضيعة روسيّة. عبد الرحمن منيف، إلياس خوري، الطيّب صالح، كلّهم اشتغلوا في حوار مع نموذجه، أحياناً ضدّه. حُمل إلى خمس وثلاثين لغة. سنة 1994 طعنه في شارع قاهري شابٌّ لم يكن قد قرأه، لكنّه قيل له إنّه مهرطق؛ نجا محفوظ بشلل جزئي في يده اليمنى، وواصل الكتابة بالإملاء حتى قبيل وفاته سنة 2006.",
        "تبقى صورته الأشهر صورة في مقهى قاهري في الستينيّات، كوب الشاي أمامه، قامته الصغيرة تنحني للأمام لتُنصت إلى من يجلس على الكرسي المجاور. ذلك الجلوس — صبور، مُنصت، ببدلة محايدة بسيطة، لا يجادل ولا يتباهى — هو الصورة التي يحملها له قرّاؤه. كان يؤمن أنّ مهمّة الكاتب أن يُنصت حتى تنتهي المدينة من حكاية نفسها، ثمّ يكتبها بلا زخرف.",
      ].join("\n\n"),
    },
    works: [
      { title: "زقاق المدق", translatedTitle: "Midaq Alley", year: 1947 },
      { title: "بين القصرين", translatedTitle: "Palace Walk", year: 1956 },
      { title: "قصر الشوق", translatedTitle: "Palace of Desire", year: 1957 },
      { title: "السكّريّة", translatedTitle: "Sugar Street", year: 1957 },
      { title: "أولاد حارتنا", translatedTitle: "Children of the Alley", year: 1959 },
      { title: "اللصّ والكلاب", translatedTitle: "The Thief and the Dogs", year: 1961 },
      { title: "ثرثرة فوق النيل", translatedTitle: "Adrift on the Nile", year: 1966 },
      { title: "ميرامار", translatedTitle: "Miramar", year: 1967 },
    ],
    photo: {
      src: "/voices/naguib-mahfouz/portrait.jpg",
      alt: {
        en: "Portrait of Naguib Mahfouz, 1960s",
        ar: "صورة نجيب محفوظ في الستينيّات",
      },
      credit: "AUCpress, via Wikimedia Commons",
      license: "Public Domain (Egyptian copyright expired)",
      sourceUrl:
        "https://commons.wikimedia.org/wiki/File:Naguib_Mahfouz_in_1960s.jpg",
    },
    relatedSlugs: ["mahmoud-darwish"],
  },

  // ─────────────────────────────────────────────────────────────────
  // Mahmoud Darwish, 1941 to 2008, Palestinian
  // Photo: CC BY-SA 3.0 + 2.5 + GFDL + Free Art License, credited to
  // Amer Shomali via Wikimedia Commons, dated 2006.
  {
    slug: "mahmoud-darwish",
    name: { en: "Mahmoud Darwish", ar: "محمود درويش" },
    bornYear: 1941,
    diedYear: 2008,
    nationality: { en: "Palestinian", ar: "فلسطيني" },
    language: "ar",
    awards: ["Lannan Cultural Freedom Prize, 2001"],
    tagline: {
      en: "The poet who turned Palestinian exile into a country made of language.",
      ar: "الشاعر الذي جعل المنفى الفلسطيني وطناً من لغة.",
    },
    body: {
      en: [
        "Mahmoud Darwish is the poet who made Palestinian exile into a literary language, and the language into a country. Born in 1941 in the village of al-Birwa in upper Galilee, he was seven when the village was depopulated in 1948; his family fled to Lebanon, walked back across the border the following year, and found their home gone, the land redrawn around them. He grew up classified by the new state as a present absentee — physically there, legally not — and that strange status became the central figure of his work. By his early twenties he was the most important poet writing in Arabic, and by his death in 2008 he had carried Palestine into more than thirty languages without ever softening what it meant.",
        "He was first formed inside Israel, between Haifa and the Galilee, where he joined the Communist Party as a teenager because it was the only party that took Arabs seriously. The poem that made his name, written when he was twenty-three, was a stern address spoken to an Israeli officer demanding to know who he was; its opening was a defiant declaration of Arab identity that was recited in classrooms across the region for two generations. He was arrested several times in the 1960s for the readings and the politics, kept under town arrest, and then in 1971 he left.",
        "The four decades that followed were a sequence of exiles — Cairo, Beirut, Tunis, Paris, Amman, finally Ramallah — and a sequence of books that kept rebuilding Palestine in language because language was the only territory the poet still controlled. He edited al-Karmel, the most important Arabic literary journal of the late twentieth century. He joined the Executive Committee of the PLO and drafted the Palestinian Declaration of Independence in 1988. When the Oslo Accords made the political body that he had served into something he could not defend, he resigned. He returned to the work that always mattered more: the long poems, the meditations on memory, the personal lyrics so distilled that they read like classical Arabic and like English at the same time.",
        "What he changed in Arabic poetry was the relationship between the poem and the nation. Earlier nationalist poets had used the nation as subject, declaring it. Darwish made it the entire grammar of the poem: every image of an almond tree, a key, a stranger at a checkpoint, a horse left in a field, was a way of saying it without saying it. Memory for Forgetfulness (1986), his prose meditation on the Israeli siege of Beirut, is one of the great non-fiction books of the century in any language. Why Did You Leave the Horse Alone? (1995) and Mural (2000) are the height of his late style, where the elegy turns inward and the poet starts addressing his own death.",
        "In the photograph here he is in his sixties, dressed plainly, his face calm, his eyes already on something inside himself. He died in Houston in 2008 after heart surgery; he was buried in Ramallah on a day the cities of three countries stopped. The Lebanese novelist Elias Khoury said at the funeral that the people had not lost their poet — the poet had returned the people to themselves. That is the right sentence for him: he was the country given back to its inhabitants as a poem.",
      ].join("\n\n"),
      ar: [
        "محمود درويش هو الشاعر الذي جعل المنفى الفلسطيني لغةً أدبيّة، ثم جعل اللغةَ وطناً. وُلد سنة 1941 في قرية البِروة في الجليل الأعلى، وكان في السابعة حين هُجِّرت القرية ومُحيت سنة 1948؛ هربت عائلته إلى لبنان، عادت في العام التالي مشياً عبر الحدود، فوجدت البيت غير موجود والأرض قد رُسمت من جديد حولها. كبر مُصنّفاً من قِبل الدولة الجديدة «حاضراً غائباً» — موجوداً بجسده، غير معترف به قانوناً — وأصبح ذلك الوضع الغريب الموضوع المركزي لشعره. في مطلع عقده الثالث كان أهمّ شاعر يكتب بالعربيّة، وعند وفاته سنة 2008 كان قد حمل فلسطين إلى أكثر من ثلاثين لغة دون أن يخفّف ما تعنيه.",
        "تشكّل أوّلاً داخل إسرائيل، بين حيفا والجليل، حيث انتسب إلى الحزب الشيوعي مراهقاً لأنّه كان الحزب الوحيد الذي يأخذ العرب على محمل الجدّ. القصيدة التي صنعت اسمه، كُتبت وهو في الثالثة والعشرين، كانت خطاباً صارماً موجّهاً إلى ضابط إسرائيلي يطلب منه إثبات هويته؛ كان مطلعها إعلاناً متحدّياً للهويّة العربيّة، تردّد في صفوف المنطقة كلّها لجيلين كاملين. اعتُقل مرّات عدّة في الستينيّات بسبب القصائد والنشاط السياسي، وُضع تحت الإقامة الجبريّة، ثم سنة 1971 غادر.",
        "العقود الأربعة التالية كانت سلسلة منافٍ — القاهرة، بيروت، تونس، باريس، عمّان، رام الله أخيراً — وسلسلة كتب ظلّت تعيد بناء فلسطين باللغة لأنّ اللغة كانت الأرض الوحيدة التي ما زال الشاعر يسيطر عليها. تولّى رئاسة تحرير «الكرمل»، أهمّ مجلّة أدبيّة عربيّة في النصف الثاني من القرن العشرين. انضمّ إلى اللجنة التنفيذيّة لمنظّمة التحرير، وصاغ وثيقة إعلان الاستقلال الفلسطيني سنة 1988. وحين جعلت اتفاقيّات أوسلو من الجسم السياسي الذي خدمه شيئاً لا يستطيع الدفاع عنه، استقال. وعاد إلى ما كان أهمّ دائماً: القصائد الطويلة، التأمّلات في الذاكرة، القصائد الشخصيّة المكثّفة حتى تقرأ كأنّها كلاسيكيّة وحديثة في آنٍ معاً.",
        "ما غيّره في الشعر العربي كان العلاقة بين القصيدة والوطن. شعراء التزامٍ سابقون كانوا يستعملون الوطن موضوعاً، يصرّحون به. درويش جعله نحو القصيدة كلّها: كلّ صورة لشجرة لوز، أو مفتاح، أو غريب عند حاجز، أو حصان مُتروك في حقل، كانت طريقةً ليقول «فلسطين» دون أن يقولها. «ذاكرة للنسيان» (1986)، تأمّله النثري في حصار إسرائيل لبيروت، يُعدّ من أعظم كتب القرن النثرية في أيّ لغة. «لماذا تركتَ الحصانَ وحيداً» (1995) و«جداريّة» (2000) ذروة أسلوبه المتأخّر، حيث ينعطف الرثاء نحو الداخل ويبدأ الشاعر بمخاطبة موته الخاصّ.",
        "في الصورة هنا يبدو في عقده السابع، بثياب بسيطة، وجهه هادئ، عيناه تطلّان على شيء داخلي. توفّي في هيوستن سنة 2008 إثر جراحة قلب؛ ودُفن في رام الله في يوم توقّفت فيه مدن ثلاث دول. قال إلياس خوري في تأبينه إنّ الشعب لم يخسر شاعره — بل أنّ الشاعر أعاد الشعب إلى نفسه. هذه هي الجملة الصحيحة عنه: كان الوطنَ الذي أُعيد إلى أهله قصيدةً.",
      ].join("\n\n"),
    },
    works: [
      { title: "أوراق الزيتون", translatedTitle: "Olive Leaves", year: 1964 },
      { title: "عاشق من فلسطين", translatedTitle: "A Lover from Palestine", year: 1966 },
      { title: "ذاكرة للنسيان", translatedTitle: "Memory for Forgetfulness", year: 1986 },
      { title: "لماذا تركتَ الحصانَ وحيداً", translatedTitle: "Why Did You Leave the Horse Alone?", year: 1995 },
      { title: "جداريّة", translatedTitle: "Mural", year: 2000 },
      { title: "حالة حصار", translatedTitle: "State of Siege", year: 2002 },
      { title: "كزهر اللوز أو أبعد", translatedTitle: "Almond Blossoms and Beyond", year: 2005 },
      { title: "أثر الفراشة", translatedTitle: "The Butterfly's Burden", year: 2008 },
    ],
    photo: {
      src: "/voices/mahmoud-darwish/portrait.jpg",
      alt: {
        en: "Portrait of Mahmoud Darwish, 2006",
        ar: "صورة محمود درويش، 2006",
      },
      credit: "Amer Shomali, via Wikimedia Commons",
      license: "CC BY-SA 3.0",
      sourceUrl:
        "https://commons.wikimedia.org/wiki/File:MahmoudDarwish.jpg",
    },
    relatedSlugs: ["naguib-mahfouz"],
  },

  // ─────────────────────────────────────────────────────────────────
  // Ernest Hemingway, 1899 to 1961, American
  // Photo: Public Domain (PD-1996, Italian publication first, PD in
  // source country and US). Photographer A.E. Hotchner via Wikimedia
  // Commons. 1954.
  {
    slug: "ernest-hemingway",
    name: { en: "Ernest Hemingway", ar: "إرنست همنغواي" },
    bornYear: 1899,
    diedYear: 1961,
    nationality: { en: "American", ar: "أمريكي" },
    language: "en",
    awards: [
      "Pulitzer Prize for Fiction, 1953",
      "Nobel Prize in Literature, 1954",
    ],
    tagline: {
      en: "The novelist who taught modern English to leave most of itself out.",
      ar: "الروائي الذي علّم الإنجليزيّة الحديثة أن تترك معظم نفسها خارج الجملة.",
    },
    body: {
      en: [
        "Ernest Hemingway is the writer who taught modern English to leave most of itself out. Born in 1899 in Oak Park, Illinois, to a doctor father and a musician mother who pressed him toward respectability, he refused respectability for the rest of his life. He was an ambulance driver in the First World War at eighteen, wounded by mortar fire on the Italian front, and the early Hemingway was already there: the man who would not, when he wrote about it, tell you the war was terrible. He would describe the cold metal of a stretcher, the cigarette someone lit beside him in the dark, and leave the rest to you.",
        "His first books came out of Paris in the mid 1920s, when he was twenty-five and walking the same streets as Gertrude Stein, James Joyce, Ezra Pound, and Scott Fitzgerald. He worked then as the European correspondent for the Toronto Star, drank carefully measured amounts to defeat the day, and learned in conversation with Stein and Pound to strip his sentences down to nouns and verbs. The Sun Also Rises (1926) was the first proof that an entire generation could be made to speak in a new way — flat, declarative, ironic, withholding. A Farewell to Arms (1929) took the same method to a love story crushed by the war he had survived, and it sold. By the early 1930s he was the most imitated stylist in English. He hated being imitated.",
        "The middle decades are a long montage of places: Spain for the Civil War, Africa for two safaris, Cuba for almost twenty years of fishing and writing in a farmhouse called Finca Vigía outside Havana. For Whom the Bell Tolls (1940), about a young American who joins a Republican guerrilla unit in the Spanish mountains, may be the most fully achieved of his novels: every page argues with itself about what loyalty costs. He also published less than the legend suggests; whole years went by in which he killed marlin and gave interviews and did not write anything he was willing to keep. He did not believe in waiting for inspiration. He believed in turning up at the table.",
        "His craft has a single rule that produced everything else: omit what the reader already knows. He called it the iceberg theory — seven-eighths of the truth lives below the surface of the page, and if the surface is written truly, you feel the weight underneath without having to be told. The Old Man and the Sea (1952), which won him the Pulitzer Prize that he had been quietly waiting for, is one hundred pages about an old fisherman and a big fish, and behind those pages is every storm he had lived through. The Nobel Prize followed in 1954. He did not travel to Stockholm. He had been in two plane crashes that year and was not well.",
        "The last years were physical decline and electric-shock therapy at the Mayo Clinic. He killed himself with a shotgun in his house in Ketchum, Idaho, in July 1961, twelve days before his sixty-second birthday. The photograph here is from 1954, the year of the Nobel: the white beard, the safari shirt, the steady gaze the camera always seemed to catch. What he left behind, in addition to a dozen books, was a way of writing that ten thousand other writers tried to imitate and only a handful ever held. He believed style was not decoration. It was the only honest place a writer could speak from.",
      ].join("\n\n"),
      ar: [
        "إرنست همنغواي هو الكاتب الذي علّم الإنجليزيّة الحديثة أن تترك معظم نفسها خارج الجملة. وُلد سنة 1899 في أوك بارك بولاية إلينوي لأبٍ طبيب وأمٍّ موسيقيّة دفعتاه نحو الاحترام البرجوازي، فرفض الاحترام البرجوازي طوال حياته. كان سائق إسعاف في الحرب العالميّة الأولى في الثامنة عشرة من عمره، أُصيب بقذيفة هاون في الجبهة الإيطاليّة، وكان همنغواي الأوّل قد بدأ يتشكّل هناك: الرجل الذي حين سيكتب عن الحرب، لن يقول لك إنّها مروّعة. سيصف برودة معدن النقّالة، وسيجارةً أشعلها شخصٌ بجانبه في العتمة، ويترك لك الباقي.",
        "كتبه الأولى خرجت من باريس في منتصف العشرينيّات، حين كان في الخامسة والعشرين ويسير في الشوارع نفسها التي يسير فيها جيرترود ستاين وجيمس جويس وعزرا باوند وسكوت فيتزجيرالد. كان يعمل آنذاك مراسلاً أوروبيّاً لـ«تورنتو ستار»، يشرب بكميّات محسوبة لينتصر على نهاره، وتعلّم في حواره مع ستاين وباوند أن يجرّد جمله إلى أسماء وأفعال. «الشمس تشرق أيضاً» (1926) كانت أوّل برهان على أنّ جيلاً بأكمله يمكن أن يُجعل ينطق بطريقة جديدة — مسطّحة، تقريريّة، ساخرة، حابسة. «وداعاً للسلاح» (1929) أخذ المنهج نفسه إلى قصّة حبّ سحقتها الحرب التي نجا منها، وحقّق مبيعات كبيرة. في مطلع الثلاثينيّات كان الأسلوبي الأكثر تقليداً في الإنجليزيّة. كان يكره أن يُقلَّد.",
        "العقود الوسطى مونتاج طويل من الأماكن: إسبانيا في الحرب الأهليّة، أفريقيا في رحلتي سفاري، كوبا قرابة عشرين عاماً من صيد السمك والكتابة في مزرعة اسمها «فينكا فيخيّا» قرب هافانا. «لمن تُقرع الأجراس» (1940)، عن أمريكي شابّ ينضمّ إلى وحدة حرب عصابات جمهوريّة في الجبال الإسبانيّة، قد يكون الأكثر اكتمالاً بين رواياته: كلّ صفحة تتجادل مع نفسها حول كلفة الولاء. كما أنّه نشر أقلّ ممّا توحي به الأسطورة؛ مرّت سنوات كاملة كان فيها يصطاد سمك المارلين ويُجري المقابلات ولا يكتب شيئاً يقبل الاحتفاظ به. لم يكن يؤمن بانتظار الإلهام. كان يؤمن بالحضور إلى الطاولة.",
        "حرفته لها قاعدة واحدة أنتجت كلّ ما عداها: احذف ما يعرفه القارئ سلفاً. سمّاها نظريّة جبل الجليد — سبعة أثمان الحقيقة تعيش تحت سطح الصفحة، وإذا كُتب السطح بصدق، يشعر القارئ بالثقل في الأسفل دون أن يُقال له. «العجوز والبحر» (1952)، التي جلبت له جائزة بوليتزر التي كان ينتظرها بهدوء، مئة صفحة عن صيّاد عجوز وسمكة كبيرة، وخلف هذه الصفحات كلّ عاصفة عاشها. تلتها جائزة نوبل سنة 1954. لم يسافر إلى استوكهولم. كان قد نجا في ذلك العام من حادثَي تحطّم طائرة ولم يكن على ما يُرام.",
        "السنوات الأخيرة كانت تدهوراً جسديّاً وعلاجاً بالصدمات الكهربائيّة في عيادة مايو. أنهى حياته بطلقة من بندقيّة صيد في بيته في كيتشم بولاية أيداهو، في تمّوز 1961، قبل اثني عشر يوماً من بلوغه الثانية والستّين. الصورة هنا من سنة 1954، عام نوبل: اللحية البيضاء، قميص السفاري، النظرة الثابتة التي بدت الكاميرا تلتقطها دائماً. ما تركه وراءه، إضافةً إلى عشرات الكتب، كان طريقةً في الكتابة حاول عشرات الآلاف من الكتّاب تقليدها، ولم يتقنها سوى قلّة. كان يؤمن أنّ الأسلوب ليس زخرفاً. هو المكان الصادق الوحيد الذي يستطيع الكاتب أن يتكلّم منه.",
      ].join("\n\n"),
    },
    works: [
      { title: "In Our Time", year: 1925 },
      { title: "The Sun Also Rises", year: 1926 },
      { title: "A Farewell to Arms", year: 1929 },
      { title: "Death in the Afternoon", year: 1932 },
      { title: "For Whom the Bell Tolls", year: 1940 },
      { title: "The Old Man and the Sea", year: 1952 },
      { title: "A Moveable Feast", year: 1964 },
    ],
    photo: {
      src: "/voices/ernest-hemingway/portrait.jpg",
      alt: {
        en: "Portrait of Ernest Hemingway, 1954",
        ar: "صورة إرنست همنغواي، 1954",
      },
      credit: "A.E. Hotchner, via Wikimedia Commons",
      license: "Public Domain",
      sourceUrl:
        "https://commons.wikimedia.org/wiki/File:Ernest_Hemingway_(1954)_(cropped).jpg",
    },
    relatedSlugs: ["virginia-woolf"],
  },

  // ─────────────────────────────────────────────────────────────────
  // Virginia Woolf, 1882 to 1941, English
  // Photo: Public Domain in the US (pre-1931 publication). Unknown
  // photographer, dated circa 1927. Via Wikimedia Commons.
  {
    slug: "virginia-woolf",
    name: { en: "Virginia Woolf", ar: "فرجينيا وولف" },
    bornYear: 1882,
    diedYear: 1941,
    nationality: { en: "English", ar: "إنجليزيّة" },
    language: "en",
    awards: [],
    tagline: {
      en: "The novelist who taught English fiction to think the way a mind actually thinks.",
      ar: "الروائيّة التي علّمت الرواية الإنجليزيّة كيف تفكّر بالطريقة التي يفكّر بها العقل فعلاً.",
    },
    body: {
      en: [
        "Virginia Woolf is the writer who taught English fiction to think the way a mind actually thinks. Born Adeline Virginia Stephen in London in 1882, daughter of the Victorian editor Leslie Stephen, she grew up inside one of the most literary households in England, with a father whose study contained the books that would teach her how the English novel had been built up until then, and a mother whose death when Virginia was thirteen began the line of personal losses that ran through her life. She never went to university. She read her way through her father's library instead, then through the British Library after his death, and by the time she was thirty she knew more about the English novel than most professors of it.",
        "The Bloomsbury circle gave her the room to invent. With her sister Vanessa, her brothers, Lytton Strachey, Roger Fry, John Maynard Keynes, E. M. Forster, and the man she married in 1912, Leonard Woolf, she lived inside a small movable conversation about painting and economics and politics and sex that ran for thirty years and changed twentieth-century English thought more than any university did. In 1917 she and Leonard set a hand press up in their living room and started the Hogarth Press; the press would publish the first English book of T. S. Eliot's poems, Katherine Mansfield's stories, the standard edition of Freud in English, and most of her own later work, untouched by any other editor.",
        "What she built in fiction, across roughly fifteen years, is a new way of writing time. Jacob's Room (1922) is already strange — a portrait of a young man assembled by everyone except himself, in fragments, in glimpses. Mrs Dalloway (1925) walks a society woman through a single day in central London, and inside that day every sentence dips in and out of her thoughts, then someone else's, then back to a clock striking. To the Lighthouse (1927) is her great elegy for her mother, structured around a Scottish summer house and the ten years it takes for a family to come back to it. Orlando (1928) is a fantastical mock biography of a person who lives four centuries and changes sex halfway through. The Waves (1931) is six interior voices speaking, almost without action, almost without a present tense. Each book is built differently. None of them is built like a novel before her.",
        "She also changed how women could think about writing in public. A Room of One's Own (1929), an essay grown out of lectures given at women's colleges, is the founding text of every later argument about gender and literary tradition in English; it remains funny and exact. Three Guineas (1938) extends the argument into anti-fascism, and it is harder, angrier, and underread. Her diary, which her husband published in installments after her death, is one of the great writers' diaries in any language.",
        "The illness that ran through her life — what we would now call bipolar disorder — kept returning, and in March 1941, as the Second World War was bombing London and she felt another breakdown beginning, she walked into the River Ouse in Sussex with stones in her coat pockets and drowned herself. She was fifty-nine. The photograph here was taken in 1927, the year of To the Lighthouse: her face in three-quarter profile, the look of someone listening for a sentence that has not arrived yet. That waiting was the discipline that produced everything. She believed the writer's whole job was to keep the mind open long enough for the world to speak through it.",
      ].join("\n\n"),
      ar: [
        "فرجينيا وولف هي الكاتبة التي علّمت الرواية الإنجليزيّة كيف تفكّر بالطريقة التي يفكّر بها العقل فعلاً. وُلدت أديلين فرجينيا ستيفن في لندن سنة 1882، ابنةً لمحرّر القرن التاسع عشر ليزلي ستيفن، وكبرت داخل واحدٍ من أكثر البيوت الأدبيّة في إنجلترا، حيث مكتبة الأب تحوي الكتب التي ستعلّمها كيف بُنيت الرواية الإنجليزيّة حتى ذلك الحين، وحيث وفاة الأمّ وهي في الثالثة عشرة بدأت سلسلة الخسائر الشخصيّة التي امتدّت على حياتها كلّها. لم تدخل الجامعة. قرأت في مكتبة أبيها أوّلاً، ثمّ في المكتبة البريطانيّة بعد رحيله، وحين بلغت الثلاثين كانت تعرف عن الرواية الإنجليزيّة أكثر ممّا يعرفه معظم أساتذتها.",
        "حلقة بلومزبري منحتها الفضاء لتخترع. مع شقيقتها فانيسا، وأخوَيها، وليتون ستراتشي، وروجر فراي، وجون مينارد كينز، وإ. م. فورستر، والرجل الذي تزوّجته سنة 1912، ليونارد وولف، عاشت داخل محادثة صغيرة متنقّلة عن الرسم والاقتصاد والسياسة والجنس، استمرّت ثلاثين عاماً وغيّرت الفكر الإنجليزي في القرن العشرين أكثر ممّا غيّرته أيّ جامعة. سنة 1917 نصبت هي وليونارد مطبعة يدويّة في غرفة جلوسهما وأطلقا «دار هوغارث»؛ الدار التي ستنشر أوّل كتاب لتي. إس. إليوت بالإنجليزيّة، وقصص كاثرين مانسفيلد، والترجمة المعياريّة لفرويد إلى الإنجليزيّة، وأغلب أعمالها المتأخّرة دون أن يلمسها محرّر آخر.",
        "ما بنته في الرواية، خلال خمسة عشر عاماً تقريباً، هو طريقة جديدة في كتابة الزمن. «غرفة جايكوب» (1922) كانت غريبة بالفعل — صورة لشابّ يجمعها كلّ من حوله إلّا هو نفسه، بشذرات، بومضات. «السيّدة دالاوي» (1925) تسير بامرأة من المجتمع عبر يوم واحد في وسط لندن، وداخل ذلك اليوم كلّ جملة تغوص وتطلع من أفكارها، ثمّ أفكار شخص آخر، ثمّ تعود إلى ساعة تدقّ. «إلى المنارة» (1927) رثاؤها العظيم لأمّها، يدور حول بيت صيفيّ في اسكتلندا والسنوات العشر التي تستغرقها العائلة لتعود إليه. «أورلاندو» (1928) سيرةٌ ساخرة لشخص يعيش أربعة قرون ويُغيّر جنسه في منتصفها. «الأمواج» (1931) ستّة أصوات داخليّة تتحدّث، بلا فعل تقريباً، بلا زمن حاضر تقريباً. كلّ كتاب مبنيّ بشكل مختلف. ولا واحد منها مبنيّ مثل أيّ رواية قبلها.",
        "غيّرت أيضاً الطريقة التي تستطيع المرأة بها أن تفكّر علناً في الكتابة. «غرفة تخصّ المرء وحده» (1929)، مقالة نمت عن محاضرات أُلقيت في كليّات النساء، هي النصّ المؤسِّس لكلّ نقاش لاحق حول الجندر والتراث الأدبي في الإنجليزيّة؛ ما زالت طريفة ودقيقة. «ثلاثة جنيهات» (1938) توسّع الحجّة لتشمل مناهضة الفاشيّة، وهي أكثر صرامة وغضباً وأقلّ قراءة. مذكّراتها التي نشرها زوجها على دفعات بعد وفاتها هي إحدى أعظم مذكّرات الكتّاب في أيّ لغة.",
        "المرض الذي رافق حياتها — ما نسمّيه اليوم اضطراب ثنائي القطب — ظلّ يعود. في آذار 1941، والحرب العالميّة الثانية تقصف لندن وهي تشعر بانهيار جديد يبدأ، مشت إلى نهر أوس في ساسكس وفي جيوب معطفها أحجار، وأغرقت نفسها. كانت في التاسعة والخمسين. الصورة هنا التُقطت سنة 1927، عام «إلى المنارة»: وجهها في زاوية ثلاثة أرباع، نظرة من يُنصت إلى جملة لم تصل بعد. ذلك الإنصات كان الانضباط الذي أنتج كلّ شيء. كانت تؤمن أنّ مهمّة الكاتب الكاملة أن يُبقي العقل مفتوحاً وقتاً كافياً ليتكلّم العالم من خلاله.",
      ].join("\n\n"),
    },
    works: [
      { title: "Jacob's Room", year: 1922 },
      { title: "Mrs Dalloway", year: 1925 },
      { title: "To the Lighthouse", year: 1927 },
      { title: "Orlando", year: 1928 },
      { title: "A Room of One's Own", year: 1929 },
      { title: "The Waves", year: 1931 },
      { title: "Three Guineas", year: 1938 },
      { title: "Between the Acts", year: 1941 },
    ],
    photo: {
      src: "/voices/virginia-woolf/portrait.jpg",
      alt: {
        en: "Portrait of Virginia Woolf, 1927",
        ar: "صورة فرجينيا وولف، 1927",
      },
      credit: "Unknown photographer, via Wikimedia Commons",
      license: "Public Domain (US, pre-1931 publication)",
      sourceUrl:
        "https://commons.wikimedia.org/wiki/File:Virginia_Woolf_1927.jpg",
    },
    relatedSlugs: ["ernest-hemingway"],
  },
];

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
