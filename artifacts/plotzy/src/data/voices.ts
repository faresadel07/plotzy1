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

  // ─────────────────────────────────────────────────────────────────
  // Taha Hussein, 1889 to 1973, Egyptian
  // Photo: Public Domain in Egypt (IP Law 82 of 2002). Photographer
  // Van Leo, circa 1955. Via Wikimedia Commons.
  {
    slug: "taha-hussein",
    name: { en: "Taha Hussein", ar: "طه حسين" },
    bornYear: 1889,
    diedYear: 1973,
    nationality: { en: "Egyptian", ar: "مصري" },
    language: "ar",
    awards: ["Egyptian Order of the Nile, 1965"],
    tagline: {
      en: "The blind scholar who broke open the Arab religious establishment from inside.",
      ar: "العالِم الضرير الذي فتح المؤسّسة الدينيّة العربيّة على نفسها من الداخل.",
    },
    body: {
      en: [
        "Taha Hussein is the writer who broke the Egyptian intellectual class open from inside by refusing to be silent. Born in 1889 in a village in upper Egypt to a struggling lower-middle-class family, blinded at three by ophthalmia that no one had the money to treat correctly, he was sent at thirteen to al-Azhar in Cairo to memorize the Qur'an and become a sheikh. He hated it, and at twenty-one he transferred to the newly founded Egyptian University, where in 1914 he became the first person ever to receive a doctorate there. Four years later he received a second doctorate at the Sorbonne in Paris, on Ibn Khaldun, written from a Braille notebook.",
        "The Egypt he came back to had a closed clerical establishment that decided which thoughts could be said in public, and Hussein refused to accept the decision. In 1926 he published On Pre-Islamic Poetry, a book that applied the methods of European philological criticism to the corpus of pre-Islamic Arabic verse and argued that much of it had been written later than tradition claimed. The book was withdrawn, his teaching license at the university was suspended for a year, and the religious establishment never forgave him. He revised the book and republished it, then went on writing, twenty-five books in a career that lasted another fifty years.",
        "His central work is The Days, the three-volume autobiography that begins with a blind country boy listening to the sounds of the courtyard and ends with the formed scholar walking the streets of Paris with a French wife. It is the first modern autobiography in Arabic, and one of the great works of self-portraiture in any language. He wrote in the third person — the boy, the child — and that distance is the book's signature, the way the writer protects what he is describing by refusing to claim it as his own. The first volume in 1929 changed what an Arab reader could ask of a memoir.",
        "He also wrote criticism, history, fiction, and a still influential program for the country. The Future of Culture in Egypt (1938) is his argument that Egypt is by geography and history a Mediterranean civilization and belongs in conversation with Greece and Rome as much as with Damascus and Baghdad. The proposal made him enemies on every side at once. When the Wafd government appointed him Minister of Education in 1950, he used the two years he had to issue one decree above all others: free primary education for every Egyptian child. He never reversed it. After 1952 he kept publishing, kept the same enemies, kept his classical Arabic prose elegant enough that he was eventually called the Dean of Arabic Literature.",
        "The photograph here is by Van Leo, the great Armenian-Egyptian portraitist of mid-century Cairo: white suit, dark glasses, the deliberate stillness of a man who knew the camera would not catch any expression he had not chosen. He died in 1973, and the Egyptian state buried him with full honors. He had been nominated for the Nobel Prize at least once. What he left behind was the example of an Arab intellectual who fought the religious establishment on its own ground, in better classical Arabic than most of them, and who would not stop fighting whether the audience clapped or threw stones.",
      ].join("\n\n"),
      ar: [
        "طه حسين هو الكاتب الذي فتح الطبقة المثقّفة المصريّة على نفسها من الداخل برفضه الصمت. وُلد سنة 1889 في قرية بصعيد مصر لعائلة من الطبقة الوسطى الدنيا، فقد بصره في الثالثة جرّاء التهاب بالعينين لم يكن لأحد المال لعلاجه، وأُرسل في الثالثة عشرة إلى الأزهر في القاهرة ليحفظ القرآن ويصير شيخاً. كرِه ذلك، وفي الحادية والعشرين انتقل إلى الجامعة المصريّة حديثة التأسيس، حيث صار سنة 1914 أوّل شخص ينال درجة الدكتوراه منها. بعد أربع سنوات نال دكتوراه ثانية من السوربون في باريس عن ابن خلدون، كُتبت من دفتر بطريقة برايل.",
        "مصر التي عاد إليها كانت تحوي مؤسّسة دينيّة مغلقة تقرّر ما يمكن قوله في الفضاء العامّ، ورفض طه حسين قبول القرار. سنة 1926 نشر «في الشعر الجاهلي»، كتاباً طبّق فيه مناهج النقد الفيلولوجي الأوروبي على دواوين الشعر العربي قبل الإسلام، وزعم أنّ كثيراً منه كُتب لاحقاً ممّا قالت به التقاليد. سُحب الكتاب من السوق، وعُلّقت إجازته التدريسيّة بالجامعة سنةً، ولم تنسَ المؤسّسة الدينيّة له هذا أبداً. أعاد كتابة الكتاب ونشره من جديد، ثم واصل عمله، خمسة وعشرون كتاباً في مسيرة استمرّت خمسين سنة بعد ذلك.",
        "عمله المركزي هو «الأيام»، السيرة الذاتيّة من ثلاثة أجزاء التي تبدأ بصبيّ ريفي ضرير يُنصت إلى أصوات الفناء وتنتهي بالعالِم المتشكّل وهو يمشي في شوارع باريس مع زوجة فرنسيّة. هي أوّل سيرة ذاتيّة حديثة بالعربيّة، ومن أعظم أعمال البورتريه الذاتي في أيّ لغة. كتبها بضمير الغائب — «الصبيّ»، «الفتى» — وتلك المسافة هي توقيع الكتاب، طريقة الكاتب في حماية ما يصفه برفضه ادّعاءه ملكيّةً له. الجزء الأوّل سنة 1929 غيّر ما يمكن للقارئ العربي أن يطلبه من المذكّرات.",
        "كتب أيضاً نقداً وتأريخاً ورواية وبرنامجاً للبلاد ما زال مؤثّراً. «مستقبل الثقافة في مصر» (1938) حجّته في أنّ مصر بحكم الجغرافيا والتاريخ حضارة متوسّطيّة تنتمي إلى الحوار مع أثينا وروما لا أقلّ من انتمائها إلى دمشق وبغداد. صنع له الاقتراح أعداء من كلّ الجهات في وقت واحد. حين عيّنته حكومة الوفد وزيراً للمعارف سنة 1950، استعمل السنتين اللتين أُتيحتا له ليصدر مرسوماً واحداً قبل سواه: التعليم الابتدائي المجاني لكلّ طفل مصري. لم يتراجع عنه أبداً. بعد 1952 ظلّ ينشر، وظلّ يحمل الأعداء أنفسهم، وحافظ على نثره العربي الفصيح أنيقاً بما يكفي لأن يُلقّب في النهاية «عميد الأدب العربي».",
        "الصورة هنا بعدسة فان ليو، البورتريهي الأرمنيّ المصريّ العظيم لقاهرة منتصف القرن: بدلة بيضاء، نظّارة سوداء، السكون المتعمَّد لرجل يعرف أنّ الكاميرا لن تلتقط تعبيراً لم يختره. توفّي سنة 1973، ودفنته الدولة المصريّة بمراسم رسميّة كاملة. كان قد رُشّح لجائزة نوبل مرّة على الأقلّ. ما تركه وراءه كان نموذج المثقّف العربي الذي حارب المؤسّسة الدينيّة على أرضها، بعربيّة كلاسيكيّة أنقى من كثيرين منهم، ولم يتوقّف عن الكفاح سواء صفّق له الجمهور أم رماه بالحجارة.",
      ].join("\n\n"),
    },
    works: [
      { title: "في الشعر الجاهلي", translatedTitle: "On Pre-Islamic Poetry", year: 1926 },
      { title: "الأيام (الجزء الأول)", translatedTitle: "The Days, vol. 1", year: 1929 },
      { title: "حديث الأربعاء", translatedTitle: "Wednesday Talks", year: 1937 },
      { title: "مستقبل الثقافة في مصر", translatedTitle: "The Future of Culture in Egypt", year: 1938 },
      { title: "الأيام (الجزء الثاني)", translatedTitle: "The Days, vol. 2", year: 1939 },
      { title: "المعذّبون في الأرض", translatedTitle: "The Sufferers", year: 1949 },
      { title: "الشيخان", translatedTitle: "The Two Sheikhs", year: 1960 },
      { title: "الأيام (الجزء الثالث)", translatedTitle: "The Days, vol. 3", year: 1973 },
    ],
    photo: {
      src: "/voices/taha-hussein/portrait.jpg",
      alt: {
        en: "Portrait of Taha Hussein, circa 1955",
        ar: "صورة طه حسين، نحو 1955",
      },
      credit: "Van Leo, via Wikimedia Commons",
      license: "Public Domain (Egyptian copyright expired)",
      sourceUrl:
        "https://commons.wikimedia.org/wiki/File:Taha_Hussein.jpg",
    },
    relatedSlugs: ["naguib-mahfouz", "khalil-gibran"],
  },

  // ─────────────────────────────────────────────────────────────────
  // Kahlil Gibran, 1883 to 1931, Lebanese-American
  // Photo: Public Domain in the US (pre-1931 publication). Unknown
  // photographer, April 1913. Via Wikimedia Commons.
  {
    slug: "khalil-gibran",
    name: { en: "Kahlil Gibran", ar: "جبران خليل جبران" },
    bornYear: 1883,
    diedYear: 1931,
    nationality: { en: "Lebanese-American", ar: "لبناني أمريكي" },
    language: "ar",
    awards: [],
    tagline: {
      en: "The mahjar writer who carried Mount Lebanon to America and wrote one of the most-read books of the century.",
      ar: "كاتب المهجر الذي حمل جبل لبنان إلى أمريكا وكتب أحد أكثر كتب القرن قراءةً.",
    },
    body: {
      en: [
        "Kahlil Gibran is the writer who carried Mount Lebanon to America and wrote a small book there that has been read in every country on earth. Born in 1883 in Bsharri, a village in the Maronite Christian heartland of Mount Lebanon, he watched his mother walk out on his father at twelve and lead her four children across the ocean to a tenement in Boston's South End in 1895. He never finished a Western school. He had begun drawing in the village and went on drawing in Boston, then in Paris in 1908 where the circle around Auguste Rodin admitted him as a student, then in New York from 1912 until his death.",
        "He wrote in two languages: Arabic for the first two decades of his career, English for the second. The early Arabic books are romantic, anti-clerical, and full of a young man's anger at the order of village marriages and the village church; Broken Wings (1912) is the most accomplished of them, and its denunciation of arranged marriage and ecclesiastical hypocrisy still reads as direct and serious. The Arabic press in New York, where the Pen League gathered around him in the 1920s, took him as the central figure of an entire generation of mahjar writers who reshaped modern Arabic literature from the diaspora.",
        "The English work that made him world-famous belongs to a different register and a different audience. The Prophet (1923) is twenty-eight short prose meditations spoken by a wise stranger to a crowd that has gathered to ask him questions before he sails home. The form is biblical, the diction is steady, the cadences carry. The book sold modestly at first and then never stopped selling: it has now sold more than a hundred million copies, in dozens of languages, and is one of the best-selling books of poetry in history. Critics have been divided about it for a hundred years. Readers have not.",
        "He was also a serious painter. There are about seven hundred surviving visual works — symbolist drawings and watercolours in a style he developed in Paris and refined alone in his New York studio. He drew almost everyone he met. He drew himself, repeatedly, with the steady gaze of someone who knew his face was a public document. Late in his life he turned the studio into a kind of pilgrimage stop for younger Arab writers passing through New York, and the conversations he had there — recorded in the memoirs of others — shaped the next generation of mahjar prose.",
        "He died in 1931 of liver disease at the age of forty-eight. His will arranged for his body to be returned to Bsharri, where he was buried in the monastery that has since become the Gibran Museum, and for the royalties of his English books to be sent to his village in perpetuity, to fund schools and clinics. The photograph here is from 1913, when he was thirty: short, slight, dark-eyed, watching the camera with the steady face of someone who had already decided what he was going to be. He kept the decision.",
      ].join("\n\n"),
      ar: [
        "جبران خليل جبران هو الكاتب الذي حمل جبل لبنان إلى أمريكا وكتب هناك كتاباً صغيراً قُرئ في كلّ بلد على وجه الأرض. وُلد سنة 1883 في بشرّي، قرية في قلب جبل لبنان الماروني، شاهد أمّه تترك أباه وهو في الثانية عشرة، وتقود أطفالها الأربعة عبر المحيط إلى مسكن متواضع في الحيّ الجنوبي لبوسطن سنة 1895. لم يُكمل أيّ مدرسة غربيّة. كان قد بدأ يرسم في القرية، فواصل الرسم في بوسطن، ثم في باريس سنة 1908 حيث قبلته حلقة أوغست رودان طالباً، ثم في نيويورك من 1912 حتى وفاته.",
        "كتب بلغتين: العربيّة في العقدين الأوّلين من مسيرته، والإنجليزيّة في العقدين التاليين. الكتب العربيّة المبكّرة رومانسيّة، معادية للإكليروس، وممتلئة بغضب شابّ على نظام الزواج القروي والكنيسة القرويّة؛ «الأجنحة المتكسرة» (1912) أنضجها، وما زال شجبها للزواج المرتّب وللنفاق الكنسي يُقرأ مباشراً وجادّاً. الصحافة العربيّة في نيويورك، حيث تجمّعت حوله «الرابطة القلميّة» في العشرينيّات، اتّخذته شخصيّةً مركزيّةً لجيل كامل من كتّاب المهجر أعادوا صياغة الأدب العربي الحديث من الشتات.",
        "العمل الإنجليزي الذي صنع شهرته العالميّة ينتمي إلى نبرة أخرى ولجمهور آخر. «النبيّ» (1923) ثماني وعشرون تأمّلاً نثريّاً قصيراً يلقيها غريبٌ حكيم على جمع تجمّع ليسأله أسئلة قبل أن يبحر عائداً. الشكل توراتيّ، الصياغة ثابتة، الإيقاع يحمل. باع الكتاب في البداية باعتدال، ثمّ لم يتوقّف عن البيع: تجاوزت مبيعاته اليوم مئة مليون نسخة، بعشرات اللغات، وهو من أكثر كتب الشعر مبيعاً في التاريخ. النقّاد منقسمون عنه منذ مئة عام. القرّاء غير منقسمين.",
        "كان رسّاماً جادّاً أيضاً. بقي منه نحو سبعمئة عمل بصريّ — رسومات وألوان مائيّة في أسلوب رمزيّ طوّره في باريس وصقله وحده في مرسمه النيويوركي. رسم تقريباً كلّ من قابله. رسم نفسه مراراً بعينين ثابتتين كمن يعرف أنّ وجهه وثيقة عامّة. في أواخر حياته تحوّل المرسم إلى محطّة حجّ صغيرة لكتّاب عرب أحدث منه عمراً، وقد مرّوا بنيويورك وحاورهم، وما دار في تلك الجلسات — في مذكّرات الآخرين — شكّل الجيل التالي من النثر المهجري.",
        "توفّي سنة 1931 إثر مرض كبدي في الثامنة والأربعين. أوصى بأن يُعاد جثمانه إلى بشرّي، فدُفن في الدير الذي صار «متحف جبران»، وبأن تُرسل عائدات كتبه الإنجليزيّة إلى قريته بشكل دائم لتموّل المدارس والعيادات. الصورة هنا من سنة 1913، حين كان في الثلاثين: قصير، نحيل، عيناه داكنتان، يرقب الكاميرا بوجه ثابت كمن قرّر سلفاً ما سيكون. حافظ على القرار.",
      ].join("\n\n"),
    },
    works: [
      { title: "الأجنحة المتكسرة", translatedTitle: "Broken Wings", year: 1912 },
      { title: "دمعة وابتسامة", translatedTitle: "A Tear and a Smile", year: 1914 },
      { title: "The Madman", year: 1918 },
      { title: "المواكب", translatedTitle: "The Processions", year: 1919 },
      { title: "The Forerunner", year: 1920 },
      { title: "The Prophet", year: 1923 },
      { title: "Sand and Foam", year: 1926 },
      { title: "Jesus, the Son of Man", year: 1928 },
    ],
    photo: {
      src: "/voices/khalil-gibran/portrait.jpg",
      alt: {
        en: "Portrait of Kahlil Gibran, April 1913",
        ar: "صورة جبران خليل جبران، نيسان 1913",
      },
      credit: "Unknown photographer, via Wikimedia Commons",
      license: "Public Domain (US, pre-1931 publication)",
      sourceUrl:
        "https://commons.wikimedia.org/wiki/File:Kahlil_Gibran_1913.jpg",
    },
    relatedSlugs: ["mahmoud-darwish", "taha-hussein"],
  },

  // ─────────────────────────────────────────────────────────────────
  // Leo Tolstoy, 1828 to 1910, Russian
  // Photo: Public Domain. Photographer Sergey Prokudin-Gorsky, May
  // 23 1908. Via Wikimedia Commons.
  {
    slug: "leo-tolstoy",
    name: { en: "Leo Tolstoy", ar: "ليو تولستوي" },
    bornYear: 1828,
    diedYear: 1910,
    nationality: { en: "Russian", ar: "روسي" },
    language: "en",
    awards: [],
    tagline: {
      en: "The novelist who proved a single book could hold an entire civilization.",
      ar: "الروائي الذي برهن أنّ كتاباً واحداً يمكنه أن يحمل حضارة كاملة.",
    },
    body: {
      en: [
        "Leo Tolstoy is the writer who proved that a novel could hold an entire civilization without breaking. Born in 1828 on a country estate called Yasnaya Polyana, a hundred miles south of Moscow, into one of the oldest aristocratic families in Russia, he lost his mother at two and his father at eight, and the orphan landowner-to-be was raised by relatives in a household where French was spoken at the table and serfs worked in the fields. He drifted through Kazan University without taking a degree, fought briefly in the Crimean War, and was drinking and gambling away inheritances in his early twenties when the first stories he had been writing in secret began to appear in the Moscow journals.",
        "The two long novels that the world reads him for came in his thirties and forties, when he had married Sofia Behrs and settled at Yasnaya Polyana to run the estate. War and Peace, serialised from 1865 to 1869, takes Russian society from 1805 to 1812 and threads four families through the Napoleonic invasion; the book is more than half a million words, and yet what people remember about it first is its small intimacies — a girl at a window, a dying old prince, a soldier discovering himself among horses. Anna Karenina, serialised from 1875 to 1877, is shorter, denser, more catastrophic: a woman of his own class refuses to be reformed and is broken by the social machine that she had stepped out of. Both books were written, edited, and partly recopied by Sofia from his all but illegible drafts.",
        "In his fifties he had a religious crisis that never ended. He renounced his earlier work as worldly, gave away the rights to most of it, dressed in peasant clothes, learned to plough his own fields, and developed a religion built around the Sermon on the Mount with no priests, no sacraments, and no state. Confession (1882) describes the crisis from inside. The Death of Ivan Ilyich (1886), a short novel about a high judge dying of a long disease, is the first great work of the new manner: stripped to the spiritual question and the bodily one. The Russian Orthodox Church excommunicated him in 1901. He did not return.",
        "The late writing kept getting harder and more political. What Is Art? (1897) argues that all art whose audience is not the peasantry is corruption; the argument is half wrong but is made with such force that no later treatise on art has ignored it. Resurrection (1899) is his last full-length novel, a furious indictment of the Russian legal and prison system. He gave the royalties of Resurrection to a religious sect being persecuted by the state. By his seventies he was the most famous private citizen on earth: pilgrims came to Yasnaya Polyana from every continent, including a young Indian lawyer named Mohandas Gandhi who had been reading him for twenty years and would build a movement on his ideas.",
        "The photograph here was taken in 1908 by the early colour pioneer Sergey Prokudin-Gorsky, two years before Tolstoy's death. He had fled the estate in November 1910 to escape what he saw as the contradiction of his own wealth, fell ill on the train, and died of pneumonia at a railway station called Astapovo. He was eighty-two. The reporters of every nation telegraphed the news at once. He left behind two literatures: the great novels of his middle age, which most readers will still call the highest of the European century; and the radical religious essays of his old age, which the next century's pacifists and nonviolent revolutionaries would carry into history.",
      ].join("\n\n"),
      ar: [
        "ليو تولستوي هو الكاتب الذي برهن أنّ الرواية تستطيع أن تحمل حضارة كاملة دون أن تتكسّر. وُلد سنة 1828 في ضيعة ريفيّة اسمها ياسنايا بوليانا، على بعد مئة ميل جنوب موسكو، من إحدى أعرق العائلات الأرستقراطيّة الروسيّة، فقد أمّه في الثانية وأباه في الثامنة، وتربّى المالك اليتيم على يد أقاربه في بيت تُتحدَّث فيه الفرنسيّة على المائدة ويعمل فيه الأقنان في الحقول. تنقّل في جامعة قازان دون أن ينال شهادة، حارب لفترة قصيرة في حرب القرم، وكان يصرف الميراث على الشراب والقمار في مطلع العشرينيّات حين بدأت قصصه الأولى — التي ظلّ يكتبها سرّاً — تظهر في مجلّات موسكو.",
        "الروايتان الطويلتان اللتان يقرأه العالم بسببهما جاءتا في الثلاثينيّات والأربعينيّات من عمره، بعد زواجه من صوفيا بِرس واستقراره في ياسنايا بوليانا لإدارة الضيعة. «الحرب والسلم»، صدرت في حلقات بين 1865 و1869، تأخذ المجتمع الروسي من 1805 إلى 1812 وتضفِر أربع عائلات عبر الغزو النابليوني؛ الكتاب يتجاوز نصف مليون كلمة، ومع ذلك ما يتذكّره القرّاء أوّلاً منه هو حميميّاته الصغيرة — فتاة عند نافذة، أمير عجوز يحتضر، جندي يكتشف نفسه بين الخيول. «أنّا كارينينا»، صدرت في حلقات بين 1875 و1877، أقصر، أكثف، أشدّ كارثيّة: امرأة من طبقته ترفض أن تُصلَح فتسحقها الآلة الاجتماعيّة التي خرجت منها. كلا الكتابين كتبت صوفيا أجزاء كبيرة منهما ونسختهما من مسوّداته شبه المقروءة.",
        "في الخمسينيّات من عمره مرّ بأزمة دينيّة لم تنته أبداً. أنكر أعماله السابقة بوصفها دنيويّة، وتنازل عن حقوق معظمها، لبس ثياب الفلّاحين، تعلّم أن يحرث حقوله بنفسه، وطوّر ديانة مبنيّة على «العظة على الجبل» دون كهنة، ولا أسرار، ولا دولة. «الاعتراف» (1882) يصف الأزمة من الداخل. «موت إيفان إيليتش» (1886)، رواية قصيرة عن قاضٍ كبير يموت بمرض طويل، أوّل العمل الكبير في الأسلوب الجديد: مجرّد إلى السؤال الروحي والجسدي. كنيسة روسيا الأرثوذكسيّة طردته سنة 1901. لم يعد إليها.",
        "استمرّت كتابته المتأخّرة في الازدياد صلابةً وسياسةً. «ما هو الفنّ؟» (1897) يحاجج بأنّ كلّ فنّ ليس جمهوره الفلّاحون هو فساد؛ الحجّة نصفها خاطئ، لكنّها صيغت بقوّة تجعل أيّ بحث لاحق في الفنّ لا يستطيع تجاهلها. «البعث» (1899) آخر رواياته الطويلة، إدانة غاضبة للنظام القانوني والسجني الروسي. تنازل عن عائدات «البعث» لطائفة دينيّة كانت الدولة تضطهدها. في سبعينيّاته كان أشهر مواطن خاصّ على الأرض: كان الحجّاج يقصدون ياسنايا بوليانا من كلّ القارّات، ومن بينهم محامٍ هندي شابّ اسمه موهانداس غاندي كان يقرأه منذ عشرين سنة وسيبني عليه حركةً.",
        "الصورة هنا التُقطت سنة 1908 بعدسة الرائد الأوّل للتصوير الملوّن سيرغي بروكودين-غورسكي، قبل سنتين من وفاة تولستوي. هرب من الضيعة في تشرين الثاني 1910 ليفرّ ممّا اعتبره تناقض ثروته الخاصّة، مرض في القطار، ومات بالتهاب رئوي في محطّة قطار تُدعى أستابوفو. كان في الثانية والثمانين. أبرقت صحف كلّ أمّة الخبر فوراً. ترك وراءه أدبَين: الروايات العظمى لمنتصف عمره، التي ما زال أكثر القرّاء يعتبرونها أعلى ما أنتجه القرن الأوروبي؛ والمقالات الدينيّة الراديكاليّة لكهولته، التي حملها مناصرو السلام والثوّار اللاعنفيّون في القرن التالي إلى التاريخ.",
      ].join("\n\n"),
    },
    works: [
      { title: "Childhood", year: 1852 },
      { title: "Sevastopol Sketches", year: 1855 },
      { title: "War and Peace", year: 1869 },
      { title: "Anna Karenina", year: 1877 },
      { title: "A Confession", year: 1882 },
      { title: "The Death of Ivan Ilyich", year: 1886 },
      { title: "What Is Art?", year: 1897 },
      { title: "Resurrection", year: 1899 },
    ],
    photo: {
      src: "/voices/leo-tolstoy/portrait.jpg",
      alt: {
        en: "Color portrait of Leo Tolstoy at Yasnaya Polyana, 1908",
        ar: "صورة ملوّنة لليو تولستوي في ياسنايا بوليانا، 1908",
      },
      credit: "Sergey Prokudin-Gorsky, via Wikimedia Commons",
      license: "Public Domain",
      sourceUrl:
        "https://commons.wikimedia.org/wiki/File:L.N.Tolstoy_Prokudin-Gorsky.jpg",
    },
    relatedSlugs: ["franz-kafka"],
  },

  // ─────────────────────────────────────────────────────────────────
  // Franz Kafka, 1883 to 1924, Czech-German Jewish
  // Photo: Public Domain in the US (PD-1996, pre-1989 first
  // publication outside US, PD in source country on URAA date).
  // Unknown photographer, 1923. Via Wikimedia Commons.
  {
    slug: "franz-kafka",
    name: { en: "Franz Kafka", ar: "فرانز كافكا" },
    bornYear: 1883,
    diedYear: 1924,
    nationality: { en: "Czech-German Jewish", ar: "تشيكي ألماني يهودي" },
    language: "en",
    awards: [],
    tagline: {
      en: "The clerk who turned the office hallway into a place where the soul could lose itself.",
      ar: "الموظّف الذي حوّل ممرّ المكتب إلى مكان يمكن للروح أن تضيع فيه.",
    },
    body: {
      en: [
        "Franz Kafka is the writer who turned the office hallway into a place where the soul could lose itself. Born in 1883 in Prague, then a German-speaking enclave inside the Czech provinces of the Austro-Hungarian Empire, he grew up the eldest son of a striving Jewish merchant father whose physical and moral bulk crushed his children for forty years. He took a law degree from the German University of Prague to please his father, then went straight into an insurance company that handled workmen's compensation claims, where he was very good at his job and very steadily promoted. He wrote in the hours after work and on weekends, sometimes through the night, and almost everything he wrote he doubted.",
        "The early stories — The Judgement, The Metamorphosis, In the Penal Colony — appeared between 1912 and 1918, when he was in his early thirties. They are the foundational texts of what readers later learned to call Kafkaesque: ordinary people inside ordinary rooms who discover that the rules they thought they knew do not apply, and that the institutions around them speak a logic no human can refute. The Metamorphosis begins one morning when a travelling salesman wakes to find himself transformed into a giant insect; the genius of the story is that the salesman's first thought is not horror but missing his train. The disaster has the same texture as the routine. That is the move that no writer before him had quite made.",
        "He wrote three novels, all unfinished, and none of them was published in his lifetime. The Trial follows a bank clerk arrested by an unspecified court on an unspecified charge, processed through corridors and waiting rooms over a year. The Castle follows a land surveyor who arrives at a village dominated by a castle whose officials he can never reach. Amerika follows a young European washed up in a comic, distorted New World. He wrote them in fragments, asked his friend Max Brod to burn them after his death, and Brod ignored the request and prepared them for publication anyway. Without that betrayal, the twentieth-century novel as we know it might not exist.",
        "What he changed in fiction was the position of the reader. In a novel by Dickens or Tolstoy, the world makes sense and the difficulty is figuring out where the character belongs in it. In a novel by Kafka the world has already stopped making sense and the question becomes whether the character even has a self to attach to that world. The bureaucratic, the religious, the legal, and the absurd become the same shape; the reader stops looking for the symbol and starts living the dream. Every later modernist working in any language — Borges, Beckett, Murakami, Saramago, Coetzee — owes him something specific that they cannot name without naming him.",
        "The photograph here was taken in Berlin in 1923, less than a year before his death, when he was in the worst stretch of the tuberculosis that finally killed him. He had broken three engagements, written most of what he is now read for, and was living briefly with Dora Diamant in a near-poverty he found liberating. He died in a sanatorium near Vienna in June 1924, at forty. Forty more years passed before the world fully realised what he had been. He had quietly remade the form, alone, while keeping a job.",
      ].join("\n\n"),
      ar: [
        "فرانز كافكا هو الكاتب الذي حوّل ممرّ المكتب إلى مكان يمكن للروح أن تضيع فيه. وُلد سنة 1883 في براغ، التي كانت آنذاك جيباً ناطقاً بالألمانيّة داخل المقاطعات التشيكيّة للإمبراطوريّة النمساويّة المجريّة، نشأ ابناً أكبر لأبٍ يهودي تاجر طموح هرس وزنه الجسدي والمعنوي أبناءه لأربعين سنة. حصل على شهادة الحقوق من الجامعة الألمانيّة في براغ ليُرضي أباه، ثم انضمّ مباشرة إلى شركة تأمين تعالج مطالبات تعويضات حوادث العمل، وكان جيّداً جدّاً في وظيفته وارتقى بانتظام. كان يكتب في الساعات التي تلي العمل وفي عطلات الأسبوع، أحياناً عبر الليل، وكلّ ما كتبه تقريباً كان يشكّ فيه.",
        "القصص الأولى — «الحكم»، «المسخ»، «في مستعمرة العقاب» — صدرت بين 1912 و1918 حين كان في مطلع الثلاثين. هي النصوص المؤسِّسة لما تعلّم القرّاء لاحقاً تسميته «الكافكاويّة»: أناس عاديّون داخل غرف عاديّة يكتشفون أنّ القواعد التي ظنّوا أنّهم يعرفونها لا تنطبق، وأنّ المؤسّسات المحيطة بهم تتكلّم منطقاً لا يستطيع إنسان دحضه. «المسخ» تبدأ صباحاً حين يستيقظ ممثّل تجاري متجوّل ليجد نفسه قد تحوّل إلى حشرة عملاقة؛ عبقريّة القصّة أنّ فكرة الممثّل الأولى ليست الرعب بل فوات قطاره. للكارثة الملمس نفسه للروتين. هذه هي النقلة التي لم يقم بها أيّ كاتب قبله بهذه الدقّة.",
        "كتب ثلاث روايات، كلّها غير منتهية، ولم تُنشر أيّ منها في حياته. «المحاكمة» تتبع موظّف بنك تعتقله محكمة غير محدّدة بتهمة غير محدّدة، يُمرَّر عبر ممرّات وقاعات انتظار طوال عام. «القصر» تتبع مساحاً يصل إلى قرية يحكمها قصر لا يستطيع الوصول إلى مسؤوليه أبداً. «أمريكا» تتبع شابّاً أوروبيّاً تقذفه الأمواج في عالم جديد كوميديّ مشوّه. كتبها في شذرات، وطلب من صديقه ماكس برود أن يحرقها بعد موته، فتجاهل برود الطلب وأعدّها للنشر بدلاً من ذلك. لولا تلك الخيانة لربّما لم تكن رواية القرن العشرين كما نعرفها اليوم.",
        "ما غيّره في الرواية كان موقع القارئ. في رواية لديكنز أو تولستوي يكون العالم منطقيّاً والصعوبة في معرفة موضع الشخصيّة منه. في رواية لكافكا يكون العالم قد توقّف عن أن يكون منطقيّاً، ويصير السؤال هل لدى الشخصيّة ذاتٌ أصلاً لتربطها بذلك العالم. تأخذ البيروقراطيّة والدينيّ والقانونيّ والعبثيّ الشكل نفسه؛ يتوقّف القارئ عن البحث عن الرمز ويبدأ بعيش الحلم. كلّ حداثي لاحق في أيّ لغة — بورخيس، بيكيت، موراكامي، ساراماغو، كويتزي — مدينٌ له بشيء محدّد لا يمكنه تسميته دون أن يسمّيه.",
        "الصورة هنا التُقطت في برلين سنة 1923، قبل أقلّ من عام على وفاته، حين كان في أسوأ مرحلة من السلّ الذي قتله أخيراً. كان قد فسخ ثلاث خطوبات، وكتب معظم ما يُقرأ به اليوم، وكان يعيش لفترة قصيرة مع دورا ديامانت في فقر شبه تامّ وجد فيه الحرّيّة. توفّي في مصحّة قرب فيينّا في حزيران 1924، في الأربعين. مرّت أربعون سنة أخرى قبل أن يدرك العالم تماماً ما كانه. كان قد أعاد صياغة الشكل بهدوء، وحيداً، وهو يحتفظ بوظيفته.",
      ].join("\n\n"),
    },
    works: [
      { title: "The Judgement", year: 1913 },
      { title: "The Metamorphosis", year: 1915 },
      { title: "In the Penal Colony", year: 1919 },
      { title: "A Country Doctor", year: 1919 },
      { title: "A Hunger Artist", year: 1924 },
      { title: "The Trial", year: 1925 },
      { title: "The Castle", year: 1926 },
      { title: "Amerika", year: 1927 },
    ],
    photo: {
      src: "/voices/franz-kafka/portrait.jpg",
      alt: {
        en: "Portrait of Franz Kafka, Berlin, 1923",
        ar: "صورة فرانز كافكا، برلين، 1923",
      },
      credit: "Unknown photographer, via Wikimedia Commons",
      license: "Public Domain",
      sourceUrl:
        "https://commons.wikimedia.org/wiki/File:Franz_Kafka,_1923.jpg",
    },
    relatedSlugs: ["leo-tolstoy", "virginia-woolf"],
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
