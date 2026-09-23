// The one and only font catalogue for every editor surface.
//
// Before this file there were five independent id → family lists (the rich
// toolbar, the book customiser, the writing toolbar, RichChapterEditor's
// FONT_FAMILY_MAP, chapter-editor's FONT_STYLE_MAP and the blog editor's
// FONTS) and they had already drifted: a font offered in one picker resolved
// to nothing in another, so choosing it silently rendered EB Garamond — most
// visibly for Arabic, where the picker listed three faces and the page could
// only paint two. Every surface now derives from EDITOR_FONTS, so a face added
// here is offered, loaded, rendered and exported everywhere at once.

export type FontCategory =
  | "Serif"
  | "Sans-serif"
  | "Display"
  | "Handwriting"
  | "Monospace"
  | "Arabic";

export interface EditorFont {
  id: string;
  label: string;
  labelAr: string;
  fontFamily: string;
  category: FontCategory;
  /** Google Fonts `css2` family spec, or null for a face the OS already has. */
  google: string | null;
  /** Short character note shown under the name in the book customiser. */
  desc?: string;
  descAr?: string;
}

export const EDITOR_FONTS: EditorFont[] = [
  // ── Serif ───────────────────────────────────────────────────────────────
  { id: "eb-garamond",       label: "EB Garamond",        labelAr: "جارامون",      fontFamily: "'EB Garamond', serif",           category: "Serif", google: "family=EB+Garamond:ital,wght@0,400..800;1,400..800", desc: "Timeless • Literary",   descAr: "كلاسيكي أدبي" },
  { id: "cormorant",         label: "Cormorant Garamond", labelAr: "كورمورانت",    fontFamily: "'Cormorant Garamond', serif",    category: "Serif", google: "family=Cormorant+Garamond:ital,wght@0,300..700;1,300..700", desc: "Elegant • Refined", descAr: "أنيق ورفيع" },
  { id: "playfair",          label: "Playfair Display",   labelAr: "بلايفير",      fontFamily: "'Playfair Display', serif",      category: "Serif", google: "family=Playfair+Display:ital,wght@0,400..900;1,400..900", desc: "Dramatic • Headlines", descAr: "درامي وجريء" },
  { id: "lora",              label: "Lora",               labelAr: "لورا",         fontFamily: "'Lora', serif",                  category: "Serif", google: "family=Lora:ital,wght@0,400..700;1,400..700", desc: "Contemporary • Warm", descAr: "معاصر ودافئ" },
  { id: "merriweather",      label: "Merriweather",       labelAr: "ميريويذر",     fontFamily: "'Merriweather', serif",          category: "Serif", google: "family=Merriweather:ital,wght@0,300;0,400;0,700;1,300;1,400;1,700", desc: "Reader-Friendly", descAr: "مريح للقراءة" },
  { id: "libre-baskerville", label: "Libre Baskerville",  labelAr: "باسكرفيل",     fontFamily: "'Libre Baskerville', serif",      category: "Serif", google: "family=Libre+Baskerville:ital,wght@0,400;0,700;1,400", desc: "Academic • Sharp", descAr: "أكاديمي وحاد" },
  { id: "crimson",           label: "Crimson Text",       labelAr: "كريمسون",      fontFamily: "'Crimson Text', serif",          category: "Serif", google: "family=Crimson+Text:ital,wght@0,400;0,600;0,700;1,400;1,600", desc: "Literary • Warm", descAr: "أدبي ودافئ" },
  { id: "source-serif",      label: "Source Serif 4",     labelAr: "سورس سيريف",   fontFamily: "'Source Serif 4', serif",        category: "Serif", google: "family=Source+Serif+4:ital,opsz,wght@0,8..60,200..900;1,8..60,200..900", desc: "Clear • Professional", descAr: "واضح ومهني" },
  { id: "georgia",           label: "Georgia",            labelAr: "جورجيا",       fontFamily: "Georgia, serif",                 category: "Serif", google: null, desc: "System • Sturdy", descAr: "نظامي ومتين" },
  { id: "times",             label: "Times New Roman",    labelAr: "تايمز",        fontFamily: "'Times New Roman', serif",       category: "Serif", google: null, desc: "System • Standard", descAr: "نظامي وقياسي" },

  // ── Sans-serif ──────────────────────────────────────────────────────────
  { id: "inter",             label: "Inter",              labelAr: "إنتر",         fontFamily: "'Inter', sans-serif",            category: "Sans-serif", google: "family=Inter:wght@300..800", desc: "Modern • Neutral", descAr: "عصري ومحايد" },
  { id: "roboto",            label: "Roboto",             labelAr: "روبوتو",       fontFamily: "'Roboto', sans-serif",           category: "Sans-serif", google: "family=Roboto:ital,wght@0,300;0,400;0,500;0,700;1,400", desc: "Clean • Familiar", descAr: "نظيف ومألوف" },
  { id: "open-sans",         label: "Open Sans",          labelAr: "أوبن سانس",    fontFamily: "'Open Sans', sans-serif",        category: "Sans-serif", google: "family=Open+Sans:ital,wght@0,300..800;1,300..800", desc: "Clean • Readable", descAr: "نظيف ومقروء" },
  { id: "montserrat",        label: "Montserrat",         labelAr: "مونتسيرات",    fontFamily: "'Montserrat', sans-serif",       category: "Sans-serif", google: "family=Montserrat:ital,wght@0,300..800;1,300..800", desc: "Geometric • Bold", descAr: "هندسي وجريء" },
  { id: "poppins",           label: "Poppins",            labelAr: "بوبينز",       fontFamily: "'Poppins', sans-serif",          category: "Sans-serif", google: "family=Poppins:ital,wght@0,300;0,400;0,500;0,600;0,700;1,400", desc: "Rounded • Friendly", descAr: "مستدير وودي" },
  { id: "nunito",            label: "Nunito",             labelAr: "نونيتو",       fontFamily: "'Nunito', sans-serif",           category: "Sans-serif", google: "family=Nunito:ital,wght@0,300..900;1,300..900", desc: "Soft • Warm", descAr: "ناعم ودافئ" },
  { id: "oswald",            label: "Oswald",             labelAr: "أوزوالد",      fontFamily: "'Oswald', sans-serif",           category: "Sans-serif", google: "family=Oswald:wght@300..700", desc: "Condensed • Strong", descAr: "مضغوط وقوي" },
  { id: "lexend",            label: "Lexend",             labelAr: "ليكسند",       fontFamily: "'Lexend', sans-serif",           category: "Sans-serif", google: "family=Lexend:wght@300..800", desc: "Easy • Legible", descAr: "سهل وواضح" },
  { id: "raleway",           label: "Raleway",            labelAr: "رالواي",       fontFamily: "'Raleway', sans-serif",          category: "Sans-serif", google: "family=Raleway:ital,wght@0,300..800;1,300..800", desc: "Slim • Elegant", descAr: "رفيع وأنيق" },
  { id: "dm-sans",           label: "DM Sans",            labelAr: "دي إم سانس",   fontFamily: "'DM Sans', sans-serif",          category: "Sans-serif", google: "family=DM+Sans:ital,opsz,wght@0,9..40,300..800;1,9..40,300..800", desc: "Crisp • Current", descAr: "حاد وعصري" },
  { id: "plus-jakarta",      label: "Plus Jakarta Sans",  labelAr: "جاكرتا",       fontFamily: "'Plus Jakarta Sans', sans-serif",category: "Sans-serif", google: "family=Plus+Jakarta+Sans:ital,wght@0,300..800;1,300..800", desc: "Contemporary • Tech", descAr: "معاصر وتقني" },
  { id: "space-grotesk",     label: "Space Grotesk",      labelAr: "سبيس",         fontFamily: "'Space Grotesk', sans-serif",    category: "Sans-serif", google: "family=Space+Grotesk:wght@300..700", desc: "Quirky • Distinctive", descAr: "مميز وفريد" },

  // ── Display ─────────────────────────────────────────────────────────────
  { id: "lobster",           label: "Lobster",            labelAr: "لوبستر",       fontFamily: "'Lobster', cursive",             category: "Display", google: "family=Lobster", desc: "Bold • Retro", descAr: "جريء وكلاسيكي" },
  { id: "pacifico",          label: "Pacifico",           labelAr: "باسيفيكو",     fontFamily: "'Pacifico', cursive",            category: "Display", google: "family=Pacifico", desc: "Playful • Casual", descAr: "مرح وعفوي" },
  { id: "comfortaa",         label: "Comfortaa",          labelAr: "كومفورتا",     fontFamily: "'Comfortaa', cursive",           category: "Display", google: "family=Comfortaa:wght@300..700", desc: "Soft • Rounded", descAr: "ناعم ومستدير" },
  { id: "special-elite",     label: "Special Elite",      labelAr: "سبيشل إليت",   fontFamily: "'Special Elite', cursive",       category: "Display", google: "family=Special+Elite", desc: "Vintage • Gritty", descAr: "عتيق ومميز" },

  // ── Handwriting ─────────────────────────────────────────────────────────
  { id: "caveat",              label: "Caveat",              labelAr: "كافيات",     fontFamily: "'Caveat', cursive",              category: "Handwriting", google: "family=Caveat:wght@400..700", desc: "Handwritten • Quick", descAr: "خط يد سريع" },
  { id: "architects-daughter", label: "Architects Daughter", labelAr: "أركيتكتس",   fontFamily: "'Architects Daughter', cursive",  category: "Handwriting", google: "family=Architects+Daughter", desc: "Sketchy • Personal", descAr: "شخصي وعفوي" },

  // ── Monospace ───────────────────────────────────────────────────────────
  { id: "courier-prime",     label: "Courier Prime",      labelAr: "كورير برايم",  fontFamily: "'Courier Prime', monospace",     category: "Monospace", google: "family=Courier+Prime:ital,wght@0,400;0,700;1,400", desc: "Screenplay • Classic", descAr: "سيناريو كلاسيكي" },
  { id: "courier-new",       label: "Courier New",        labelAr: "كورير نيو",    fontFamily: "'Courier New', monospace",       category: "Monospace", google: null, desc: "System • Typewriter", descAr: "نظامي وآلة كاتبة" },
  { id: "roboto-mono",       label: "Roboto Mono",        labelAr: "روبوتو مونو",  fontFamily: "'Roboto Mono', monospace",       category: "Monospace", google: "family=Roboto+Mono:ital,wght@0,300..700;1,300..700", desc: "Clean • Precise", descAr: "نظيف ودقيق" },
  { id: "ibm-plex-mono",     label: "IBM Plex Mono",      labelAr: "بلكس مونو",    fontFamily: "'IBM Plex Mono', monospace",     category: "Monospace", google: "family=IBM+Plex+Mono:ital,wght@0,300;0,400;0,500;0,600;1,400", desc: "Technical • Even", descAr: "تقني ومتزن" },
  { id: "space-mono",        label: "Space Mono",         labelAr: "سبيس مونو",    fontFamily: "'Space Mono', monospace",        category: "Monospace", google: "family=Space+Mono:ital,wght@0,400;0,700;1,400", desc: "Retro • Digital", descAr: "رقمي كلاسيكي" },

  // ── Arabic ──────────────────────────────────────────────────────────────
  // Ordered for book work: the naskh faces built to carry long passages
  // first, then the modern sans faces, then the calligraphic ones that
  // belong on a title page rather than in a chapter.
  { id: "arabic-serif",        label: "Amiri",                labelAr: "أميري",        fontFamily: "'Amiri', serif",                     category: "Arabic", google: "family=Amiri:ital,wght@0,400;0,700;1,400;1,700", desc: "Classic Naskh • Books", descAr: "نسخ كلاسيكي للكتب" },
  { id: "arabic-scheherazade", label: "Scheherazade New",     labelAr: "شهرزاد",       fontFamily: "'Scheherazade New', serif",          category: "Arabic", google: "family=Scheherazade+New:wght@400;500;600;700", desc: "Traditional • Spacious", descAr: "تقليدي ومريح" },
  { id: "arabic-naskh",        label: "Noto Naskh Arabic",    labelAr: "نوتو نسخ",     fontFamily: "'Noto Naskh Arabic', serif",         category: "Arabic", google: "family=Noto+Naskh+Arabic:wght@400..700", desc: "Balanced • Readable", descAr: "متوازن ومقروء" },
  { id: "arabic-markazi",      label: "Markazi Text",         labelAr: "مركزي",        fontFamily: "'Markazi Text', serif",              category: "Arabic", google: "family=Markazi+Text:wght@400..700", desc: "Literary • Compact", descAr: "أدبي ومتماسك" },
  { id: "arabic-sans",         label: "Cairo",                labelAr: "القاهرة",      fontFamily: "'Cairo', sans-serif",                category: "Arabic", google: "family=Cairo:wght@300;400;500;600;700", desc: "Modern • Neutral", descAr: "عصري ومحايد" },
  { id: "arabic-tajawal",      label: "Tajawal",              labelAr: "تجوال",        fontFamily: "'Tajawal', sans-serif",              category: "Arabic", google: "family=Tajawal:wght@300;400;500;700", desc: "Clean • Friendly", descAr: "نظيف وودي" },
  { id: "arabic-almarai",      label: "Almarai",              labelAr: "المراعي",      fontFamily: "'Almarai', sans-serif",              category: "Arabic", google: "family=Almarai:wght@300;400;700;800", desc: "Simple • Even", descAr: "بسيط ومتزن" },
  { id: "arabic-plex",         label: "IBM Plex Sans Arabic", labelAr: "بلكس عربي",    fontFamily: "'IBM Plex Sans Arabic', sans-serif", category: "Arabic", google: "family=IBM+Plex+Sans+Arabic:wght@300;400;500;600;700", desc: "Technical • Clear", descAr: "تقني وواضح" },
  { id: "arabic-readex",       label: "Readex Pro",           labelAr: "ريدكس",        fontFamily: "'Readex Pro', sans-serif",           category: "Arabic", google: "family=Readex+Pro:wght@300..700", desc: "Easy • Wide", descAr: "سهل وواسع" },
  { id: "arabic-messiri",      label: "El Messiri",           labelAr: "المصيري",      fontFamily: "'El Messiri', sans-serif",           category: "Arabic", google: "family=El+Messiri:wght@400..700", desc: "Warm • Distinctive", descAr: "دافئ ومميز" },
  { id: "arabic-reem",         label: "Reem Kufi",            labelAr: "ريم كوفي",     fontFamily: "'Reem Kufi', sans-serif",            category: "Arabic", google: "family=Reem+Kufi:wght@400..700", desc: "Kufic • Titles", descAr: "كوفي للعناوين" },
  { id: "arabic-ruqaa",        label: "Aref Ruqaa",           labelAr: "عارف رقعة",    fontFamily: "'Aref Ruqaa', serif",                category: "Arabic", google: "family=Aref+Ruqaa:wght@400;700", desc: "Calligraphic • Titles", descAr: "خط رقعة للعناوين" },
];

/** Old ids kept alive so books saved before the merge still resolve. */
const ID_ALIASES: Record<string, string> = {
  libre: "libre-baskerville",
  serif: "eb-garamond",
  sans: "inter",
  mono: "courier-prime",
};

export const FONT_FAMILY_BY_ID: Record<string, string> = Object.fromEntries(
  EDITOR_FONTS.map((f) => [f.id, f.fontFamily]),
);

export const FONT_BY_ID: Record<string, EditorFont> = Object.fromEntries(
  EDITOR_FONTS.map((f) => [f.id, f]),
);

export const DEFAULT_FONT_ID = "eb-garamond";
export const DEFAULT_FONT_FAMILY = "'EB Garamond', serif";

/** Resolve a stored font id to a CSS family, following aliases. */
export function fontFamilyFor(id: string | null | undefined, fallback = DEFAULT_FONT_FAMILY): string {
  if (!id) return fallback;
  return FONT_FAMILY_BY_ID[id] ?? FONT_FAMILY_BY_ID[ID_ALIASES[id]] ?? fallback;
}

/** Resolve a stored font id to a catalogue entry, following aliases. */
export function editorFont(id: string | null | undefined): EditorFont | undefined {
  if (!id) return undefined;
  return FONT_BY_ID[id] ?? FONT_BY_ID[ID_ALIASES[id]];
}

export const ARABIC_FONT_IDS = EDITOR_FONTS.filter((f) => f.category === "Arabic").map((f) => f.id);

export function isArabicFont(id: string | null | undefined): boolean {
  return !!id && editorFont(id)?.category === "Arabic";
}

/** Every Google Fonts spec the catalogue needs, sorted and de-duplicated. */
export const GOOGLE_FONT_SPECS: string[] = Array.from(
  new Set(EDITOR_FONTS.map((f) => f.google).filter((g): g is string => !!g)),
).sort();

/**
 * Category order for a picker. An Arabic writer should not have to scroll
 * past thirty Latin faces to reach the ones that render their language.
 */
export function fontCategoryOrder(arabicFirst: boolean): FontCategory[] {
  return arabicFirst
    ? ["Arabic", "Serif", "Sans-serif", "Display", "Handwriting", "Monospace"]
    : ["Serif", "Sans-serif", "Display", "Handwriting", "Monospace", "Arabic"];
}
