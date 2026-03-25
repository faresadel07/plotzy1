import { useState } from "react";
import { Button } from "@/components/ui/button";
import { X, Check, ChevronLeft, ChevronRight } from "lucide-react";
import { useLanguage } from "@/contexts/language-context";
import type { BookPreferences } from "@/shared/schema";

interface BookCustomizerProps {
  preferences: BookPreferences;
  onSave: (prefs: BookPreferences) => void;
  onClose: () => void;
  onPreview?: (prefs: BookPreferences) => void;
}

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

const FONTS: FontDef[] = [
  // ── Serif ──────────────────────────────────────────────────────────────────
  {
    id: "eb-garamond", label: "EB Garamond", labelAr: "جارامون",
    desc: "Timeless • Literary", descAr: "كلاسيكي أدبي",
    category: "serif", fontFamily: "'EB Garamond', serif",
    sampleEn: "The forest breathed quietly under moonlight.",
    sampleAr: "تنفست الغابة بهدوء تحت ضوء القمر.",
  },
  {
    id: "cormorant", label: "Cormorant Garamond", labelAr: "كورمورانت",
    desc: "Elegant • Refined", descAr: "أنيق ورفيع",
    category: "serif", fontFamily: "'Cormorant Garamond', serif",
    sampleEn: "The forest breathed quietly under moonlight.",
    sampleAr: "تنفست الغابة بهدوء تحت ضوء القمر.",
  },
  {
    id: "playfair", label: "Playfair Display", labelAr: "بلايفير",
    desc: "Dramatic • Headlines", descAr: "درامي وجريء",
    category: "serif", fontFamily: "'Playfair Display', serif",
    sampleEn: "The forest breathed quietly under moonlight.",
    sampleAr: "تنفست الغابة بهدوء تحت ضوء القمر.",
  },
  {
    id: "lora", label: "Lora", labelAr: "لورا",
    desc: "Contemporary • Warm", descAr: "معاصر ودافئ",
    category: "serif", fontFamily: "'Lora', serif",
    sampleEn: "The forest breathed quietly under moonlight.",
    sampleAr: "تنفست الغابة بهدوء تحت ضوء القمر.",
  },
  {
    id: "crimson", label: "Crimson Text", labelAr: "كريمسون",
    desc: "Literary • Warm", descAr: "أدبي ودافئ",
    category: "serif", fontFamily: "'Crimson Text', serif",
    sampleEn: "The forest breathed quietly under moonlight.",
    sampleAr: "تنفست الغابة بهدوء تحت ضوء القمر.",
  },
  {
    id: "merriweather", label: "Merriweather", labelAr: "ميريويذر",
    desc: "Reader-Friendly • Crisp", descAr: "مريح للقراءة",
    category: "serif", fontFamily: "'Merriweather', serif",
    sampleEn: "The forest breathed quietly under moonlight.",
    sampleAr: "تنفست الغابة بهدوء تحت ضوء القمر.",
  },
  {
    id: "libre-baskerville", label: "Libre Baskerville", labelAr: "باسكرفيل",
    desc: "Academic • Sharp", descAr: "أكاديمي وحاد",
    category: "serif", fontFamily: "'Libre Baskerville', serif",
    sampleEn: "The forest breathed quietly under moonlight.",
    sampleAr: "تنفست الغابة بهدوء تحت ضوء القمر.",
  },
  {
    id: "source-serif", label: "Source Serif 4", labelAr: "سورس سيريف",
    desc: "Clear • Professional", descAr: "واضح ومهني",
    category: "serif", fontFamily: "'Source Serif 4', serif",
    sampleEn: "The forest breathed quietly under moonlight.",
    sampleAr: "تنفست الغابة بهدوء تحت ضوء القمر.",
  },

  // ── Sans-serif ─────────────────────────────────────────────────────────────
  {
    id: "inter", label: "Inter", labelAr: "إنتر",
    desc: "Modern • Neutral", descAr: "عصري ومحايد",
    category: "sans", fontFamily: "'Inter', sans-serif",
    sampleEn: "The forest breathed quietly under moonlight.",
    sampleAr: "تنفست الغابة بهدوء تحت ضوء القمر.",
  },
  {
    id: "open-sans", label: "Open Sans", labelAr: "أوبن سانس",
    desc: "Clean • Readable", descAr: "نظيف ومقروء",
    category: "sans", fontFamily: "'Open Sans', sans-serif",
    sampleEn: "The forest breathed quietly under moonlight.",
    sampleAr: "تنفست الغابة بهدوء تحت ضوء القمر.",
  },
  {
    id: "poppins", label: "Poppins", labelAr: "بوبينز",
    desc: "Rounded • Friendly", descAr: "مستدير وودي",
    category: "sans", fontFamily: "'Poppins', sans-serif",
    sampleEn: "The forest breathed quietly under moonlight.",
    sampleAr: "تنفست الغابة بهدوء تحت ضوء القمر.",
  },
  {
    id: "montserrat", label: "Montserrat", labelAr: "مونتسيرات",
    desc: "Geometric • Bold", descAr: "هندسي وجريء",
    category: "sans", fontFamily: "'Montserrat', sans-serif",
    sampleEn: "The forest breathed quietly under moonlight.",
    sampleAr: "تنفست الغابة بهدوء تحت ضوء القمر.",
  },
  {
    id: "plus-jakarta", label: "Plus Jakarta Sans", labelAr: "جاكرتا",
    desc: "Contemporary • Tech", descAr: "معاصر وتقني",
    category: "sans", fontFamily: "'Plus Jakarta Sans', sans-serif",
    sampleEn: "The forest breathed quietly under moonlight.",
    sampleAr: "تنفست الغابة بهدوء تحت ضوء القمر.",
  },
  {
    id: "space-grotesk", label: "Space Grotesk", labelAr: "سبيس",
    desc: "Quirky • Distinctive", descAr: "مميز وفريد",
    category: "sans", fontFamily: "'Space Grotesk', sans-serif",
    sampleEn: "The forest breathed quietly under moonlight.",
    sampleAr: "تنفست الغابة بهدوء تحت ضوء القمر.",
  },

  // ── Typewriter ─────────────────────────────────────────────────────────────
  {
    id: "courier-prime", label: "Courier Prime", labelAr: "كورير برايم",
    desc: "Screenplay • Classic", descAr: "سيناريو كلاسيكي",
    category: "typewriter", fontFamily: "'Courier Prime', monospace",
    sampleEn: "The forest breathed quietly...",
    sampleAr: "تنفست الغابة بهدوء...",
  },
  {
    id: "special-elite", label: "Special Elite", labelAr: "سبيشل إليت",
    desc: "Vintage • Gritty", descAr: "عتيق ومميز",
    category: "typewriter", fontFamily: "'Special Elite', cursive",
    sampleEn: "The forest breathed quietly...",
    sampleAr: "تنفست الغابة بهدوء...",
  },
  {
    id: "roboto-mono", label: "Roboto Mono", labelAr: "روبوتو مونو",
    desc: "Clean • Precise", descAr: "نظيف ودقيق",
    category: "typewriter", fontFamily: "'Roboto Mono', monospace",
    sampleEn: "The forest breathed quietly...",
    sampleAr: "تنفست الغابة بهدوء...",
  },
  {
    id: "space-mono", label: "Space Mono", labelAr: "سبيس مونو",
    desc: "Retro • Digital", descAr: "رقمي كلاسيكي",
    category: "typewriter", fontFamily: "'Space Mono', monospace",
    sampleEn: "The forest breathed...",
    sampleAr: "تنفست الغابة...",
  },

  // ── Arabic ─────────────────────────────────────────────────────────────────
  {
    id: "arabic-sans", label: "Cairo", labelAr: "القاهرة",
    desc: "Modern Arabic", descAr: "عربي عصري",
    category: "arabic", fontFamily: "'Cairo', sans-serif",
    sampleEn: "The forest breathed quietly.",
    sampleAr: "تنفست الغابة بهدوء تحت ضوء القمر.",
  },
  {
    id: "arabic-serif", label: "Amiri", labelAr: "أميري",
    desc: "Classic Arabic", descAr: "عربي كلاسيكي",
    category: "arabic", fontFamily: "'Amiri', serif",
    sampleEn: "The forest breathed quietly.",
    sampleAr: "تنفست الغابة بهدوء تحت ضوء القمر.",
  },
  {
    id: "arabic-naskh", label: "Noto Naskh Arabic", labelAr: "نوتو نسخ",
    desc: "Traditional Naskh", descAr: "نسخ تقليدي",
    category: "arabic", fontFamily: "'Noto Naskh Arabic', serif",
    sampleEn: "The forest breathed quietly.",
    sampleAr: "تنفست الغابة بهدوء تحت ضوء القمر.",
  },
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

// ── Component ─────────────────────────────────────────────────────────────────

export function BookCustomizer({ preferences, onSave, onClose, onPreview }: BookCustomizerProps) {
  const { lang } = useLanguage();
  const ar = lang === "ar";

  const [prefs, setPrefs] = useState<BookPreferences>({
    fontFamily:    preferences.fontFamily    || "eb-garamond",
    fontSize:      preferences.fontSize      || "text-lg",
    lineHeight:    preferences.lineHeight    || "normal",
    letterSpacing: preferences.letterSpacing || "normal",
    bgColor:       preferences.bgColor       || "#ffffff",
    textColor:     preferences.textColor     || "#111111",
    pageStyle:     preferences.pageStyle     || "blank",
  });

  // Live-preview helper — updates local state AND pushes to editor immediately
  const updatePrefs = (updater: (p: BookPreferences) => BookPreferences) => {
    setPrefs(prev => {
      const next = updater(prev);
      // Schedule onPreview outside the state updater to avoid React's
      // "cannot update while rendering another component" warning
      setTimeout(() => onPreview?.(next), 0);
      return next;
    });
  };

  const [activeTab, setActiveTab] = useState<FontCategoryId>(() => {
    const found = FONTS.find(f => f.id === (prefs.fontFamily || "eb-garamond"));
    return found?.category ?? "serif";
  });

  const currentFont = FONTS.find(f => f.id === prefs.fontFamily) ?? FONTS[0];

  const previewStyle: React.CSSProperties = {
    fontFamily:    currentFont.fontFamily,
    fontSize:      fontSizeToPx(prefs.fontSize || "text-lg"),
    lineHeight:    LINE_HEIGHT_VALUES[prefs.lineHeight  || "normal"],
    letterSpacing: LETTER_SPACING_VALUES[prefs.letterSpacing || "normal"],
    color:         prefs.textColor || "#111111",
    backgroundColor: prefs.bgColor || "#ffffff",
  };

  const filteredFonts = FONTS.filter(f => f.category === activeTab);

  return (
    <div className="fixed inset-0 z-50 flex items-stretch justify-end" onClick={onClose}>
      <div
        className="bg-[hsl(var(--background))] h-full w-full max-w-[360px] shadow-2xl border-l border-border/30 flex flex-col overflow-hidden"
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
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* ── Live Preview ────────────────────────────────────────────────── */}
        <div className="px-4 pt-4 pb-3 border-b border-border/30">
          <p className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground font-semibold mb-2">
            {ar ? "معاينة" : "Preview"}
          </p>
          <div
            className="rounded-lg p-4 border border-border/40 shadow-inner min-h-[72px] transition-all duration-300"
            style={{ backgroundColor: prefs.bgColor || "#ffffff" }}
          >
            <p className="transition-all duration-300 leading-[inherit]" style={previewStyle}>
              {ar ? currentFont.sampleAr : currentFont.sampleEn}
            </p>
          </div>
          <p className="text-[10px] text-muted-foreground mt-1.5 text-center">
            {currentFont.label}
            {" · "}
            {ar
              ? FONTS.find(f => f.id === prefs.fontFamily)?.descAr
              : FONTS.find(f => f.id === prefs.fontFamily)?.desc}
          </p>
        </div>

        {/* ── Scrollable Content ──────────────────────────────────────────── */}
        <div className="flex-1 overflow-y-auto">

          {/* ── Font Section ───────────────────────────────────────────────── */}
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

            {/* Font Cards */}
            <div className="space-y-1.5 max-h-[280px] overflow-y-auto pr-1">
              {filteredFonts.map(font => {
                const isSelected = prefs.fontFamily === font.id;
                const isArabicCat = font.category === "arabic";
                return (
                  <button
                    key={font.id}
                    onClick={() => updatePrefs(p => ({ ...p, fontFamily: font.id }))}
                    className={`w-full rounded-xl border transition-all text-left overflow-hidden ${
                      isSelected
                        ? "border-primary/60 bg-primary/5 ring-1 ring-primary/20"
                        : "border-border/40 hover:border-border/70 hover:bg-muted/30"
                    }`}
                  >
                    <div className="px-3.5 pt-3 pb-2.5">
                      {/* Sample text in actual font */}
                      <p
                        className="text-[15px] leading-snug mb-1.5 text-foreground"
                        style={{ fontFamily: font.fontFamily, direction: isArabicCat ? "rtl" : "ltr" }}
                      >
                        {isArabicCat
                          ? (ar ? font.sampleAr : font.sampleAr)
                          : (ar ? font.sampleAr : font.sampleEn.split(".")[0])}
                      </p>
                      {/* Font name + desc row */}
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

          {/* ── Font Size ──────────────────────────────────────────────────── */}
          <div className="px-4 pt-4 pb-3 border-b border-border/20">
            <p className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground font-semibold mb-3">
              {ar ? "حجم الخط" : "Font Size"}
            </p>
            <div className="flex gap-1">
              {FONT_SIZES.map(size => (
                <button
                  key={size.id}
                  onClick={() => updatePrefs(p => ({ ...p, fontSize: size.id }))}
                  className={`flex-1 py-2 rounded-lg text-[11px] font-bold border transition-all ${
                    prefs.fontSize === size.id
                      ? "border-primary bg-primary text-primary-foreground shadow-sm"
                      : "border-border/40 text-muted-foreground hover:border-border/70 hover:text-foreground"
                  }`}
                >
                  {ar ? size.labelAr : size.label}
                </button>
              ))}
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
            <div className="grid grid-cols-6 gap-2">
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
                    <Check
                      className="w-3 h-3"
                      style={{ color: color.dark ? "#fff" : "#111" }}
                    />
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* ── Text Color ─────────────────────────────────────────────────── */}
          <div className="px-4 pt-4 pb-5">
            <p className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground font-semibold mb-3">
              {ar ? "لون النص" : "Text Color"}
            </p>
            <div className="grid grid-cols-5 gap-2">
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
                    <Check
                      className="w-3 h-3"
                      style={{ color: color.dark ? "#fff" : "#eee" }}
                    />
                  )}
                </button>
              ))}
            </div>
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
