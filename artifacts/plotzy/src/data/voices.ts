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
    relatedSlugs: [],
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
