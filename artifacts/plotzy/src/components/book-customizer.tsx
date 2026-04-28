import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { X, Check, RotateCcw, Clock } from "lucide-react";
import { useLanguage } from "@/contexts/language-context";
import type { BookPreferences } from "@/shared/schema";

interface BookCustomizerProps {
  preferences: BookPreferences;
  onSave: (prefs: BookPreferences) => void;
  onClose: () => void;
  onPreview?: (prefs: BookPreferences) => void;
  /**
   * Optional snippet of the author's actual chapter text. When provided, the
   * live-preview panel shows a real excerpt from what the reader will see
   * instead of the canned "The forest breathed quietly…" sample.
   */
  liveSample?: string;
}

// ── Defaults (used by the "Reset" button) ──────────────────────────────────
const DEFAULTS = {
  fontFamily: "eb-garamond",
  fontSize: "text-lg",
  lineHeight: "normal",
  letterSpacing: "normal",
  bgColor: "#ffffff",
  textColor: "#111111",
  pageStyle: "blank",
} satisfies BookPreferences;

// ── Font Definitions ─────────────────────────────────────────────────────────

const FONT_CATEGORIES = [
  { id: "serif",      label: "Serif",      labelAr: "سيريف"     },
  { id: "sans",       label: "Sans",       labelAr: "سانس"      },
  { id: "typewriter", label: "Typewriter", labelAr: "آلة كاتبة" },
  { id: "arabic",     label: "Arabic",     labelAr: "عربي"      },
] as const;

type FontCategoryId = typeof FONT_CATEGORIES[number]["id"];

interface FontDef {
  id: string;
  label: string;
  labelAr: string;
  desc: string;
  descAr: string;
  category: FontCategoryId;
  fontFamily: string;
  sampleEn: string;
  sampleAr: string;
}

const DEFAULT_SAMPLE_EN = "The forest breathed quietly under moonlight.";
const DEFAULT_SAMPLE_AR = "تنفست الغابة بهدوء تحت ضوء القمر.";

const FONTS: FontDef[] = [
  // ── Serif ──────────────────────────────────────────────────────────────────
  { id: "eb-garamond",      label: "EB Garamond",      labelAr: "جارامون",   desc: "Timeless • Literary",   descAr: "كلاسيكي أدبي",    category: "serif", fontFamily: "'EB Garamond', serif",         sampleEn: DEFAULT_SAMPLE_EN, sampleAr: DEFAULT_SAMPLE_AR },
  { id: "cormorant",        label: "Cormorant Garamond", labelAr: "كورمورانت", desc: "Elegant • Refined",    descAr: "أنيق ورفيع",     category: "serif", fontFamily: "'Cormorant Garamond', serif",  sampleEn: DEFAULT_SAMPLE_EN, sampleAr: DEFAULT_SAMPLE_AR },
  { id: "playfair",         label: "Playfair Display",  labelAr: "بلايفير",   desc: "Dramatic • Headlines", descAr: "درامي وجريء",    category: "serif", fontFamily: "'Playfair Display', serif",    sampleEn: DEFAULT_SAMPLE_EN, sampleAr: DEFAULT_SAMPLE_AR },
  { id: "lora",             label: "Lora",              labelAr: "لورا",      desc: "Contemporary • Warm",  descAr: "معاصر ودافئ",    category: "serif", fontFamily: "'Lora', serif",                sampleEn: DEFAULT_SAMPLE_EN, sampleAr: DEFAULT_SAMPLE_AR },
  { id: "crimson",          label: "Crimson Text",      labelAr: "كريمسون",   desc: "Literary • Warm",      descAr: "أدبي ودافئ",     category: "serif", fontFamily: "'Crimson Text', serif",        sampleEn: DEFAULT_SAMPLE_EN, sampleAr: DEFAULT_SAMPLE_AR },
  { id: "merriweather",     label: "Merriweather",      labelAr: "ميريويذر",  desc: "Reader-Friendly",      descAr: "مريح للقراءة",  category: "serif", fontFamily: "'Merriweather', serif",        sampleEn: DEFAULT_SAMPLE_EN, sampleAr: DEFAULT_SAMPLE_AR },
  { id: "libre-baskerville", label: "Libre Baskerville", labelAr: "باسكرفيل", desc: "Academic • Sharp",     descAr: "أكاديمي وحاد",   category: "serif", fontFamily: "'Libre Baskerville', serif",   sampleEn: DEFAULT_SAMPLE_EN, sampleAr: DEFAULT_SAMPLE_AR },
  { id: "source-serif",     label: "Source Serif 4",    labelAr: "سورس سيريف", desc: "Clear • Professional", descAr: "واضح ومهني",    category: "serif", fontFamily: "'Source Serif 4', serif",      sampleEn: DEFAULT_SAMPLE_EN, sampleAr: DEFAULT_SAMPLE_AR },

  // ── Sans-serif ─────────────────────────────────────────────────────────────
  { id: "inter",         label: "Inter",             labelAr: "إنتر",       desc: "Modern • Neutral",   descAr: "عصري ومحايد",   category: "sans", fontFamily: "'Inter', sans-serif",             sampleEn: DEFAULT_SAMPLE_EN, sampleAr: DEFAULT_SAMPLE_AR },
  { id: "open-sans",     label: "Open Sans",         labelAr: "أوبن سانس",  desc: "Clean • Readable",   descAr: "نظيف ومقروء",    category: "sans", fontFamily: "'Open Sans', sans-serif",         sampleEn: DEFAULT_SAMPLE_EN, sampleAr: DEFAULT_SAMPLE_AR },
  { id: "poppins",       label: "Poppins",           labelAr: "بوبينز",     desc: "Rounded • Friendly", descAr: "مستدير وودي",   category: "sans", fontFamily: "'Poppins', sans-serif",           sampleEn: DEFAULT_SAMPLE_EN, sampleAr: DEFAULT_SAMPLE_AR },
  { id: "montserrat",    label: "Montserrat",        labelAr: "مونتسيرات",  desc: "Geometric • Bold",   descAr: "هندسي وجريء",   category: "sans", fontFamily: "'Montserrat', sans-serif",        sampleEn: DEFAULT_SAMPLE_EN, sampleAr: DEFAULT_SAMPLE_AR },
  { id: "plus-jakarta",  label: "Plus Jakarta Sans", labelAr: "جاكرتا",     desc: "Contemporary • Tech", descAr: "معاصر وتقني",  category: "sans", fontFamily: "'Plus Jakarta Sans', sans-serif", sampleEn: DEFAULT_SAMPLE_EN, sampleAr: DEFAULT_SAMPLE_AR },
  { id: "space-grotesk", label: "Space Grotesk",     labelAr: "سبيس",       desc: "Quirky • Distinctive", descAr: "مميز وفريد",  category: "sans", fontFamily: "'Space Grotesk', sans-serif",     sampleEn: DEFAULT_SAMPLE_EN, sampleAr: DEFAULT_SAMPLE_AR },

  // ── Typewriter ─────────────────────────────────────────────────────────────
  { id: "courier-prime", label: "Courier Prime", labelAr: "كورير برايم", desc: "Screenplay • Classic", descAr: "سيناريو كلاسيكي", category: "typewriter", fontFamily: "'Courier Prime', monospace", sampleEn: DEFAULT_SAMPLE_EN, sampleAr: DEFAULT_SAMPLE_AR },
  { id: "special-elite", label: "Special Elite", labelAr: "سبيشل إليت",  desc: "Vintage • Gritty",     descAr: "عتيق ومميز",    category: "typewriter", fontFamily: "'Special Elite', cursive",   sampleEn: DEFAULT_SAMPLE_EN, sampleAr: DEFAULT_SAMPLE_AR },
  { id: "roboto-mono",   label: "Roboto Mono",   labelAr: "روبوتو مونو", desc: "Clean • Precise",      descAr: "نظيف ودقيق",    category: "typewriter", fontFamily: "'Roboto Mono', monospace",   sampleEn: DEFAULT_SAMPLE_EN, sampleAr: DEFAULT_SAMPLE_AR },
  { id: "space-mono",    label: "Space Mono",    labelAr: "سبيس مونو",   desc: "Retro • Digital",      descAr: "رقمي كلاسيكي", category: "typewriter", fontFamily: "'Space Mono', monospace",    sampleEn: DEFAULT_SAMPLE_EN, sampleAr: DEFAULT_SAMPLE_AR },

  // ── Arabic ─────────────────────────────────────────────────────────────────
  { id: "arabic-sans",  label: "Cairo",             labelAr: "القاهرة",   desc: "Modern Arabic",      descAr: "عربي عصري",     category: "arabic", fontFamily: "'Cairo', sans-serif",              sampleEn: DEFAULT_SAMPLE_EN, sampleAr: DEFAULT_SAMPLE_AR },
  { id: "arabic-serif", label: "Amiri",             labelAr: "أميري",     desc: "Classic Arabic",     descAr: "عربي كلاسيكي",  category: "arabic", fontFamily: "'Amiri', serif",                   sampleEn: DEFAULT_SAMPLE_EN, sampleAr: DEFAULT_SAMPLE_AR },
  { id: "arabic-naskh", label: "Noto Naskh Arabic", labelAr: "نوتو نسخ",  desc: "Traditional Naskh",  descAr: "نسخ تقليدي",    category: "arabic", fontFamily: "'Noto Naskh Arabic', serif",        sampleEn: DEFAULT_SAMPLE_EN, sampleAr: DEFAULT_SAMPLE_AR },
];

// ── Controls ─────────────────────────────────────────────────────────────────

const FONT_SIZES = [
  { id: "text-sm",   label: "XS",     labelAr: "صغير جداً", px: 14 },
  { id: "text-base", label: "Small",  labelAr: "صغير",      px: 16 },
  { id: "text-lg",   label: "Medium", labelAr: "متوسط",     px: 18 },
  { id: "text-xl",   label: "Large",  labelAr: "كبير",      px: 20 },
  { id: "text-2xl",  label: "XL",     labelAr: "كبير جداً", px: 24 },
];

const LINE_HEIGHTS = [
  { id: "tight",    label: "Tight",    labelAr: "ضيق",    icon: "▤" },
  { id: "normal",   label: "Normal",   labelAr: "عادي",   icon: "▥" },
  { id: "relaxed",  label: "Relaxed",  labelAr: "مريح",   icon: "▦" },
  { id: "spacious", label: "Spacious", labelAr: "فسيح",   icon: "▧" },
];

const LETTER_SPACINGS = [
  { id: "tight",  label: "Tight",  labelAr: "ضيق"   },
  { id: "normal", label: "Normal", labelAr: "عادي"  },
  { id: "wide",   label: "Wide",   labelAr: "واسع"  },
];

const BG_COLORS = [
  { id: "#ffffff", label: "Pure White",   labelAr: "أبيض نقي",    dark: false },
  { id: "#fefce8", label: "Cream",        labelAr: "كريمي",       dark: false },
  { id: "#fdf6e3", label: "Parchment",    labelAr: "رق",          dark: false },
  { id: "#f5f0e8", label: "Antique",      labelAr: "عتيق",        dark: false },
  { id: "#f0f4ff", label: "Ice Blue",     labelAr: "أزرق ثلجي",  dark: false },
  { id: "#f0fdf4", label: "Mint",         labelAr: "نعناعي",      dark: false },
  { id: "#fdf2f8", label: "Rose",         labelAr: "وردي",        dark: false },
  { id: "#f8f4ff", label: "Lavender",     labelAr: "لافندر",      dark: false },
  { id: "#1a1a2e", label: "Midnight",     labelAr: "منتصف الليل", dark: true  },
  { id: "#0f172a", label: "Deep Night",   labelAr: "ليل عميق",    dark: true  },
  { id: "#1c1c1c", label: "Charcoal",     labelAr: "فحمي",        dark: true  },
  { id: "#0d1117", label: "Obsidian",     labelAr: "أوبسيديان",   dark: true  },
];

const TEXT_COLORS = [
  { id: "#111111", label: "Black",        labelAr: "أسود",       dark: false },
  { id: "#1a1a2e", label: "Midnight",     labelAr: "كحلي",       dark: false },
  { id: "#374151", label: "Gray",         labelAr: "رمادي",      dark: false },
  { id: "#1e3a5f", label: "Navy",         labelAr: "أزرق غامق", dark: false },
  { id: "#3b2e1a", label: "Sepia",        labelAr: "سيبيا",      dark: false },
  { id: "#e8e8e8", label: "Light",        labelAr: "فاتح",       dark: true  },
  { id: "#f9fafb", label: "Near White",   labelAr: "أبيض تقريباً", dark: true },
  { id: "#d4c9a8", label: "Warm Light",   labelAr: "دافئ فاتح",  dark: true  },
  { id: "#b4c8e8", label: "Cool Light",   labelAr: "بارد فاتح",  dark: true  },
];

// ── Helpers ───────────────────────────────────────────────────────────────────

const LINE_HEIGHT_VALUES: Record<string, string> = {
  tight: "1.55", normal: "1.85", relaxed: "2.15", spacious: "2.55",
};
const LETTER_SPACING_VALUES: Record<string, string> = {
  tight: "-0.02em", normal: "0em", wide: "0.04em",
};

function fontSizeToPx(id: string): string {
  const map: Record<string, string> = {
    "text-sm": "14px", "text-base": "16px", "text-lg": "18px",
    "text-xl": "20px", "text-2xl": "24px",
  };
  return map[id] || "18px";
}

// ── Recent fonts (last-used) ─────────────────────────────────────────────────
const RECENT_KEY = "plotzy_recent_book_fonts";
const RECENT_MAX = 3;

function readRecent(): string[] {
  try {
    const raw = localStorage.getItem(RECENT_KEY);
    if (!raw) return [];
    const arr = JSON.parse(raw);
    if (!Array.isArray(arr)) return [];
    return arr.filter(x => typeof x === "string").slice(0, RECENT_MAX);
  } catch {
    return [];
  }
}

function writeRecent(ids: string[]): void {
  try {
    localStorage.setItem(RECENT_KEY, JSON.stringify(ids.slice(0, RECENT_MAX)));
  } catch {}
}

function pushRecent(id: string): string[] {
  const cur = readRecent().filter(x => x !== id);
  const next = [id, ...cur].slice(0, RECENT_MAX);
  writeRecent(next);
  return next;
}

// ── Hex validator ────────────────────────────────────────────────────────────
function isValidHex(raw: string): boolean {
  return /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(raw.trim());
}
function normaliseHex(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed) return trimmed;
  return trimmed.startsWith("#") ? trimmed : `#${trimmed}`;
}

// Decide whether a given hex looks dark (so a Check icon on top should be
// white rather than black).
function hexIsDark(hex: string): boolean {
  if (!isValidHex(hex)) return false;
  let h = hex.replace("#", "");
  if (h.length === 3) h = h.split("").map(c => c + c).join("");
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  // Perceived luminance — standard sRGB weights.
  const lum = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return lum < 0.5;
}

// Pull the first ~220 chars of readable text out of whatever the editor passes
// (plain string or HTML). Used for the live preview when the author is
// editing a real chapter.
function sampleFromLive(raw?: string): string {
  if (!raw) return "";
  // Strip HTML tags; collapse whitespace.
  const text = raw.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
  if (!text) return "";
  return text.length > 220 ? text.slice(0, 220).replace(/\s+\S*$/, "") + "…" : text;
}

// ── Component ─────────────────────────────────────────────────────────────────

export function BookCustomizer({ preferences, onSave, onClose, onPreview, liveSample }: BookCustomizerProps) {
  const { lang } = useLanguage();
  const ar = lang === "ar";

  const [prefs, setPrefs] = useState<BookPreferences>({
    fontFamily:    preferences.fontFamily    || DEFAULTS.fontFamily,
    fontSize:      preferences.fontSize      || DEFAULTS.fontSize,
    lineHeight:    preferences.lineHeight    || DEFAULTS.lineHeight,
    letterSpacing: preferences.letterSpacing || DEFAULTS.letterSpacing,
    bgColor:       preferences.bgColor       || DEFAULTS.bgColor,
    textColor:     preferences.textColor     || DEFAULTS.textColor,
    pageStyle:     preferences.pageStyle     || DEFAULTS.pageStyle,
  });

  const [recent, setRecent] = useState<string[]>(() => readRecent());

  // Draft state for the custom hex inputs — kept out of prefs until the value
  // parses as a real hex, so the user can type "#ff" without the preview
  // flickering.
  const [bgHexDraft, setBgHexDraft]     = useState(prefs.bgColor   || "");
  const [textHexDraft, setTextHexDraft] = useState(prefs.textColor || "");
  useEffect(() => { setBgHexDraft(prefs.bgColor   || ""); }, [prefs.bgColor]);
  useEffect(() => { setTextHexDraft(prefs.textColor || ""); }, [prefs.textColor]);

  // Live-preview helper — updates local state AND pushes to editor immediately.
  const updatePrefs = (updater: (p: BookPreferences) => BookPreferences) => {
    setPrefs(prev => {
      const next = updater(prev);
      setTimeout(() => onPreview?.(next), 0);
      return next;
    });
  };

  const [activeTab, setActiveTab] = useState<FontCategoryId>(() => {
    const found = FONTS.find(f => f.id === (prefs.fontFamily || DEFAULTS.fontFamily));
    return found?.category ?? "serif";
  });

  const currentFont = FONTS.find(f => f.id === prefs.fontFamily) ?? FONTS[0];

  const previewStyle: React.CSSProperties = {
    fontFamily:    currentFont.fontFamily,
    fontSize:      fontSizeToPx(prefs.fontSize || DEFAULTS.fontSize),
    lineHeight:    LINE_HEIGHT_VALUES[prefs.lineHeight  || DEFAULTS.lineHeight],
    letterSpacing: LETTER_SPACING_VALUES[prefs.letterSpacing || DEFAULTS.letterSpacing],
    color:         prefs.textColor || DEFAULTS.textColor,
    backgroundColor: prefs.bgColor || DEFAULTS.bgColor,
  };

  const filteredFonts = FONTS.filter(f => f.category === activeTab);

  // Resolve recent IDs back to full FontDef objects, skipping any that have
  // been removed from the font list.
  const recentFonts = useMemo(
    () => recent.map(id => FONTS.find(f => f.id === id)).filter((f): f is FontDef => !!f),
    [recent]
  );

  const selectFont = (id: string) => {
    updatePrefs(p => ({ ...p, fontFamily: id }));
    setRecent(pushRecent(id));
  };

  const handleReset = () => {
    setPrefs(DEFAULTS);
    setActiveTab("serif");
    setTimeout(() => onPreview?.(DEFAULTS), 0);
  };

  // Preview text — actual chapter excerpt if supplied, else localised sample.
  const chapterExcerpt = sampleFromLive(liveSample);
  const previewText = chapterExcerpt || (ar ? currentFont.sampleAr : currentFont.sampleEn);

  const bgHexValid   = isValidHex(normaliseHex(bgHexDraft));
  const textHexValid = isValidHex(normaliseHex(textHexDraft));

  return (
    <div className="fixed inset-0 z-50 flex items-stretch justify-end" onClick={onClose}>
      <div
        className="bg-[hsl(var(--background))] h-full w-full max-w-[380px] shadow-2xl border-l border-border/30 flex flex-col overflow-hidden"
        onClick={e => e.stopPropagation()}
      >

        {/* ── Header ─────────────────────────────────────────────────────── */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border/30">
          <div>
            <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground font-semibold">
              {ar ? "تخصيص" : "Customize"}
            </p>
            <h3 className="font-bold text-base">
              {ar ? "إعدادات الكتابة" : "Writing Style"}
            </h3>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={handleReset}
              title={ar ? "إعادة تعيين" : "Reset to defaults"}
              className="w-8 h-8 rounded-full flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
            <button
              onClick={onClose}
              title={ar ? "إغلاق" : "Close"}
              className="w-8 h-8 rounded-full flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* ── Live Preview ────────────────────────────────────────────────── */}
        <div className="px-4 pt-4 pb-3 border-b border-border/30">
          <p className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground font-semibold mb-2">
            {ar ? "معاينة" : "Preview"}
            {chapterExcerpt && (
              <span className="text-[10px] ml-2 text-primary/80 font-semibold normal-case tracking-normal">
                {ar ? "مقطع من كتابك" : "from your chapter"}
              </span>
            )}
          </p>
          <div
            className="rounded-lg p-4 border border-border/40 shadow-inner min-h-[84px] transition-all duration-300"
            style={{ backgroundColor: prefs.bgColor || DEFAULTS.bgColor }}
          >
            <p className="transition-all duration-300 leading-[inherit]" style={previewStyle}>
              {previewText}
            </p>
          </div>
          <p className="text-[10px] text-muted-foreground mt-1.5 text-center">
            {currentFont.label}
            {" · "}
            {ar ? currentFont.descAr : currentFont.desc}
          </p>
        </div>

        {/* ── Scrollable Content (single scroll, no nested overflow) ─────── */}
        <div className="flex-1 overflow-y-auto">

          {/* ── Recent Fonts ─────────────────────────────────────────────── */}
          {recentFonts.length > 0 && (
            <div className="px-4 pt-4 pb-3 border-b border-border/20">
              <div className="flex items-center gap-1.5 mb-2">
                <Clock className="w-3 h-3 text-muted-foreground" />
                <p className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground font-semibold">
                  {ar ? "آخر ما استُخدم" : "Recently used"}
                </p>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {recentFonts.map(font => {
                  const isSelected = prefs.fontFamily === font.id;
                  return (
                    <button
                      key={font.id}
                      onClick={() => selectFont(font.id)}
                      className={`px-3 py-1.5 rounded-full text-[11px] font-semibold border transition-all ${
                        isSelected
                          ? "border-primary/60 bg-primary/10 text-foreground"
                          : "border-border/40 text-muted-foreground hover:text-foreground hover:border-border/70"
                      }`}
                      style={{ fontFamily: font.fontFamily }}
                    >
                      {ar ? font.labelAr : font.label}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* ── Font Family ───────────────────────────────────────────────── */}
          <div className="px-4 pt-4 pb-3 border-b border-border/20">
            <p className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground font-semibold mb-3">
              {ar ? "نوع الخط" : "Font Family"}
            </p>

            {/* Category Tabs */}
            <div className="flex gap-1 mb-3 bg-muted/40 rounded-lg p-1">
              {FONT_CATEGORIES.map(cat => (
                <button
                  key={cat.id}
                  onClick={() => setActiveTab(cat.id)}
                  className={`flex-1 py-1.5 rounded-md text-[11px] font-semibold transition-all ${
                    activeTab === cat.id
                      ? "bg-background text-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {ar ? cat.labelAr : cat.label}
                </button>
              ))}
            </div>

            {/* Font Cards — flows into the parent scroll, no inner scroll area */}
            <div className="space-y-1.5">
              {filteredFonts.map(font => {
                const isSelected = prefs.fontFamily === font.id;
                const isArabicCat = font.category === "arabic";
                const displaySample = isArabicCat ? font.sampleAr : (ar ? font.sampleAr : font.sampleEn);
                return (
                  <button
                    key={font.id}
                    onClick={() => selectFont(font.id)}
                    className={`w-full rounded-xl border transition-all text-left overflow-hidden ${
                      isSelected
                        ? "border-primary/60 bg-primary/5 ring-1 ring-primary/20"
                        : "border-border/40 hover:border-border/70 hover:bg-muted/30"
                    }`}
                  >
                    <div className="px-3.5 pt-3 pb-2.5">
                      <p
                        className="text-[15px] leading-snug mb-1.5 text-foreground"
                        style={{ fontFamily: font.fontFamily, direction: isArabicCat || ar ? "rtl" : "ltr" }}
                      >
                        {displaySample}
                      </p>
                      <div className="flex items-center justify-between">
                        <div>
                          <span className="text-[11px] font-semibold text-foreground/80">
                            {ar ? font.labelAr : font.label}
                          </span>
                          <span className="text-[10px] text-muted-foreground ml-1.5">
                            {ar ? font.descAr : font.desc}
                          </span>
                        </div>
                        {isSelected && (
                          <Check className="w-3.5 h-3.5 text-primary flex-shrink-0" />
                        )}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* ── Font Size — each button previews the actual size ──────────── */}
          <div className="px-4 pt-4 pb-3 border-b border-border/20">
            <p className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground font-semibold mb-3">
              {ar ? "حجم الخط" : "Font Size"}
            </p>
            <div className="grid grid-cols-5 gap-1.5">
              {FONT_SIZES.map(size => {
                const isSelected = prefs.fontSize === size.id;
                return (
                  <button
                    key={size.id}
                    onClick={() => updatePrefs(p => ({ ...p, fontSize: size.id }))}
                    className={`rounded-lg border transition-all flex flex-col items-center justify-center py-2 gap-0.5 ${
                      isSelected
                        ? "border-primary bg-primary/10 text-foreground"
                        : "border-border/40 text-muted-foreground hover:border-border/70 hover:text-foreground"
                    }`}
                    title={ar ? size.labelAr : size.label}
                  >
                    <span style={{ fontSize: size.px, lineHeight: 1, fontWeight: 700, fontFamily: currentFont.fontFamily }}>
                      A
                    </span>
                    <span className="text-[10px] font-semibold">
                      {ar ? size.labelAr : size.label}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* ── Line Height + Letter Spacing (2 col) ───────────────────────── */}
          <div className="px-4 pt-4 pb-3 border-b border-border/20">
            <div className="grid grid-cols-2 gap-4">

              {/* Line Height */}
              <div>
                <p className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground font-semibold mb-2">
                  {ar ? "تباعد الأسطر" : "Line Height"}
                </p>
                <div className="space-y-1">
                  {LINE_HEIGHTS.map(lh => (
                    <button
                      key={lh.id}
                      onClick={() => updatePrefs(p => ({ ...p, lineHeight: lh.id }))}
                      className={`w-full px-2.5 py-1.5 rounded-lg text-[11px] font-semibold border flex items-center gap-1.5 transition-all ${
                        prefs.lineHeight === lh.id
                          ? "border-primary bg-primary/10 text-primary"
                          : "border-border/40 text-muted-foreground hover:text-foreground hover:border-border/70"
                      }`}
                    >
                      <span className="text-[13px] leading-none">{lh.icon}</span>
                      {ar ? lh.labelAr : lh.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Letter Spacing */}
              <div>
                <p className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground font-semibold mb-2">
                  {ar ? "تباعد الحروف" : "Letter Spacing"}
                </p>
                <div className="space-y-1">
                  {LETTER_SPACINGS.map(ls => (
                    <button
                      key={ls.id}
                      onClick={() => updatePrefs(p => ({ ...p, letterSpacing: ls.id }))}
                      className={`w-full px-2.5 py-1.5 rounded-lg text-[11px] font-semibold border transition-all ${
                        prefs.letterSpacing === ls.id
                          ? "border-primary bg-primary/10 text-primary"
                          : "border-border/40 text-muted-foreground hover:text-foreground hover:border-border/70"
                      }`}
                    >
                      {ar ? ls.labelAr : ls.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* ── Background Color ───────────────────────────────────────────── */}
          <div className="px-4 pt-4 pb-3 border-b border-border/20">
            <p className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground font-semibold mb-3">
              {ar ? "لون الصفحة" : "Page Color"}
            </p>
            <div className="grid grid-cols-6 gap-2 mb-3">
              {BG_COLORS.map(color => (
                <button
                  key={color.id}
                  onClick={() => updatePrefs(p => ({ ...p, bgColor: color.id }))}
                  title={ar ? color.labelAr : color.label}
                  className={`aspect-square rounded-lg border-2 transition-all flex items-center justify-center hover:scale-105 ${
                    prefs.bgColor === color.id
                      ? "border-primary scale-110 shadow-md"
                      : "border-border/40 hover:border-border/80"
                  }`}
                  style={{ backgroundColor: color.id }}
                >
                  {prefs.bgColor === color.id && (
                    <Check className="w-3 h-3" style={{ color: color.dark ? "#fff" : "#111" }} />
                  )}
                </button>
              ))}
            </div>
            <HexInput
              value={bgHexDraft}
              onChange={setBgHexDraft}
              onCommit={(hex) => updatePrefs(p => ({ ...p, bgColor: hex }))}
              placeholder={ar ? "أو لون مخصص: #ffffff" : "Or custom: #ffffff"}
              currentColor={prefs.bgColor || DEFAULTS.bgColor}
              valid={bgHexValid}
              applyLabel={ar ? "تطبيق" : "Apply"}
              swatchTextColor="#111"
            />
          </div>

          {/* ── Text Color ─────────────────────────────────────────────────── */}
          <div className="px-4 pt-4 pb-5">
            <p className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground font-semibold mb-3">
              {ar ? "لون النص" : "Text Color"}
            </p>
            <div className="grid grid-cols-5 gap-2 mb-3">
              {TEXT_COLORS.map(color => (
                <button
                  key={color.id}
                  onClick={() => updatePrefs(p => ({ ...p, textColor: color.id }))}
                  title={ar ? color.labelAr : color.label}
                  className={`aspect-square rounded-lg border-2 transition-all flex items-center justify-center hover:scale-105 ${
                    prefs.textColor === color.id
                      ? "border-primary scale-110 shadow-md"
                      : "border-border/40 hover:border-border/80"
                  }`}
                  style={{ backgroundColor: color.id }}
                >
                  {prefs.textColor === color.id && (
                    <Check className="w-3 h-3" style={{ color: color.dark ? "#fff" : "#eee" }} />
                  )}
                </button>
              ))}
            </div>
            <HexInput
              value={textHexDraft}
              onChange={setTextHexDraft}
              onCommit={(hex) => updatePrefs(p => ({ ...p, textColor: hex }))}
              placeholder={ar ? "أو لون مخصص: #111111" : "Or custom: #111111"}
              currentColor={prefs.textColor || DEFAULTS.textColor}
              valid={textHexValid}
              applyLabel={ar ? "تطبيق" : "Apply"}
              swatchTextColor="#fff"
            />
          </div>
        </div>

        {/* ── Apply Button ────────────────────────────────────────────────── */}
        <div className="px-4 py-3 border-t border-border/30 bg-background/80 backdrop-blur-sm">
          <Button
            onClick={() => { onSave(prefs); onClose(); }}
            className="w-full rounded-xl font-semibold h-10 text-sm"
          >
            <Check className="w-4 h-4 mr-2" />
            {ar ? "تطبيق التخصيص" : "Apply Style"}
          </Button>
        </div>
      </div>
    </div>
  );
}

// ── Custom hex-color input with live swatch ──────────────────────────────────
function HexInput({
  value,
  onChange,
  onCommit,
  placeholder,
  currentColor,
  valid,
  applyLabel,
  swatchTextColor,
}: {
  value: string;
  onChange: (v: string) => void;
  onCommit: (hex: string) => void;
  placeholder: string;
  currentColor: string;
  valid: boolean;
  applyLabel: string;
  swatchTextColor: string;
}) {
  const normalised = normaliseHex(value);
  const canApply = valid && normalised.toLowerCase() !== currentColor.toLowerCase();
  return (
    <div className="flex items-center gap-2">
      <div
        className="w-8 h-8 rounded-md border border-border/40 flex-shrink-0 flex items-center justify-center text-[10px] font-bold"
        style={{ backgroundColor: valid ? normalised : "transparent", color: swatchTextColor }}
      >
        {!valid && <span className="text-muted-foreground">?</span>}
      </div>
      <input
        type="text"
        value={value}
        onChange={e => onChange(e.target.value)}
        onKeyDown={e => { if (e.key === "Enter" && canApply) onCommit(normalised); }}
        placeholder={placeholder}
        maxLength={7}
        spellCheck={false}
        className={`flex-1 min-w-0 px-3 py-2 rounded-lg text-[12px] font-mono bg-muted/40 border outline-none transition-colors ${
          value && !valid
            ? "border-destructive/60 text-destructive focus:border-destructive"
            : "border-border/40 text-foreground focus:border-primary/60"
        }`}
      />
      <button
        type="button"
        disabled={!canApply}
        onClick={() => canApply && onCommit(normalised)}
        className={`px-3 py-2 rounded-lg text-[11px] font-semibold border transition-all ${
          canApply
            ? "border-primary bg-primary text-primary-foreground hover:opacity-90"
            : "border-border/40 text-muted-foreground cursor-not-allowed opacity-60"
        }`}
      >
        {applyLabel}
      </button>
    </div>
  );
}
