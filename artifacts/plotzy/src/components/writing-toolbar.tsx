import { useRef, useState } from "react";
import { Bold, Italic, Underline, AlignLeft, AlignCenter, AlignRight, AlignJustify, Settings2, Ruler, Minus, Plus, ChevronDown, SlidersHorizontal, X } from "lucide-react";
import { useIsPhone } from "@/hooks/use-is-phone";
import type { BookPreferences } from "@/shared/schema";

const FONT_OPTIONS = [
  { id: "eb-garamond",       label: "EB Garamond",          labelAr: "جارامون",        fontFamily: "'EB Garamond', serif" },
  { id: "cormorant",         label: "Cormorant Garamond",   labelAr: "كورمورانت",       fontFamily: "'Cormorant Garamond', serif" },
  { id: "playfair",          label: "Playfair Display",     labelAr: "بلايفير",        fontFamily: "'Playfair Display', serif" },
  { id: "lora",              label: "Lora",                 labelAr: "لورا",           fontFamily: "'Lora', serif" },
  { id: "crimson",           label: "Crimson Text",         labelAr: "كريمسون",        fontFamily: "'Crimson Text', serif" },
  { id: "merriweather",      label: "Merriweather",         labelAr: "ميريويذر",       fontFamily: "'Merriweather', serif" },
  { id: "libre-baskerville", label: "Libre Baskerville",    labelAr: "باسكيرفيل",      fontFamily: "'Libre Baskerville', serif" },
  { id: "source-serif",      label: "Source Serif 4",       labelAr: "سورس سيريف",     fontFamily: "'Source Serif 4', serif" },
  { id: "inter",             label: "Inter",                labelAr: "إنتر",           fontFamily: "'Inter', sans-serif" },
  { id: "open-sans",         label: "Open Sans",            labelAr: "أوبن سانس",      fontFamily: "'Open Sans', sans-serif" },
  { id: "poppins",           label: "Poppins",              labelAr: "بوبينز",         fontFamily: "'Poppins', sans-serif" },
  { id: "montserrat",        label: "Montserrat",           labelAr: "مونتسيرات",      fontFamily: "'Montserrat', sans-serif" },
  { id: "courier-prime",     label: "Courier Prime",        labelAr: "كورير برايم",    fontFamily: "'Courier Prime', monospace" },
  { id: "special-elite",     label: "Special Elite",        labelAr: "سبيشل إليت",     fontFamily: "'Special Elite', cursive" },
  { id: "arabic-sans",       label: "Cairo",                labelAr: "القاهرة",        fontFamily: "'Cairo', sans-serif" },
  { id: "arabic-serif",      label: "Amiri",                labelAr: "أميري",          fontFamily: "'Amiri', serif" },
  { id: "arabic-naskh",      label: "Noto Naskh Arabic",    labelAr: "نوتو نسخ",       fontFamily: "'Noto Naskh Arabic', serif" },
];

const FONT_SIZE_STEPS = [10, 11, 12, 13, 14, 15, 16, 17, 18, 20, 22, 24, 26, 28, 32, 36, 42, 48];

const TAILWIND_TO_PX: Record<string, number> = {
  "text-sm":   14,
  "text-base": 16,
  "text-lg":   18,
  "text-xl":   20,
  "text-2xl":  24,
};
const PX_TO_TAILWIND: Record<number, string> = {
  14: "text-sm",
  16: "text-base",
  18: "text-lg",
  20: "text-xl",
  24: "text-2xl",
};

const LINE_SPACING_OPTIONS = [
  { value: "tight",    label: "1.5",  labelAr: "١٫٥" },
  { value: "normal",   label: "1.85", labelAr: "١٫٨٥" },
  { value: "relaxed",  label: "2.15", labelAr: "٢٫١٥" },
  { value: "spacious", label: "2.5",  labelAr: "٢٫٥" },
];

const PAGE_THEMES = [
  { id: "white",  label: "White",  labelAr: "أبيض",  bg: "#ffffff", text: "#18181b", border: "#d4d4d8" },
  { id: "ivory",  label: "Ivory",  labelAr: "عاجي",  bg: "#fffef0", text: "#292524", border: "#d6d3c4" },
  { id: "sepia",  label: "Sepia",  labelAr: "بني",   bg: "#f5ede0", text: "#3c2a1a", border: "#c4a882" },
  { id: "dark",   label: "Dark",   labelAr: "داكن",  bg: "#1a1a1f", text: "#e4e4e7", border: "#3f3f46" },
];

interface WritingToolbarProps {
  prefs: BookPreferences;
  effectivePrefs: BookPreferences;
  onPrefsChange: (p: BookPreferences) => void;
  onSavePrefs: (p: BookPreferences) => void;
  isFocusMode: boolean;
  ar: boolean;
  isRTL: boolean;
  onOpenPageSetup: () => void;
  zoom: number;
  onZoomChange: (z: number) => void;
}

function Sep() {
  return <div className="w-px self-stretch bg-current opacity-10 mx-1" />;
}

export function WritingToolbar({
  prefs,
  effectivePrefs,
  onPrefsChange,
  onSavePrefs,
  isFocusMode,
  ar,
  isRTL,
  onOpenPageSetup,
  zoom,
  onZoomChange,
}: WritingToolbarProps) {
  const [fontDropOpen, setFontDropOpen] = useState(false);
  const [lineDropOpen, setLineDropOpen] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const fontDropRef = useRef<HTMLDivElement>(null);
  const lineDropRef = useRef<HTMLDivElement>(null);
  const isPhone = useIsPhone();

  const currentFontId = effectivePrefs.fontFamily || "eb-garamond";
  const currentFont = FONT_OPTIONS.find(f => f.id === currentFontId);

  const currentSizePx = TAILWIND_TO_PX[effectivePrefs.fontSize || "text-lg"] ?? 18;

  const changeSize = (delta: number) => {
    const idx = FONT_SIZE_STEPS.indexOf(currentSizePx);
    const nextIdx = Math.max(0, Math.min(FONT_SIZE_STEPS.length - 1, idx + delta));
    const nextPx = FONT_SIZE_STEPS[nextIdx];
    const nextClass = PX_TO_TAILWIND[nextPx] ?? `text-[${nextPx}px]`;
    const np = { ...prefs, fontSize: nextClass };
    onPrefsChange(np);
    onSavePrefs(np);
  };

  const toggle = (field: keyof BookPreferences) => {
    const np = { ...prefs, [field]: !effectivePrefs[field] };
    onPrefsChange(np);
    onSavePrefs(np);
  };

  const setAlign = (a: string) => {
    const np = { ...prefs, textAlign: a };
    onPrefsChange(np);
    onSavePrefs(np);
  };

  const setFont = (id: string) => {
    const np = { ...prefs, fontFamily: id };
    onPrefsChange(np);
    onSavePrefs(np);
    setFontDropOpen(false);
  };

  const setLineSpacing = (v: string) => {
    const np = { ...prefs, lineHeight: v };
    onPrefsChange(np);
    onSavePrefs(np);
    setLineDropOpen(false);
  };

  const setTheme = (t: typeof PAGE_THEMES[number]) => {
    const np = { ...prefs, pageTheme: t.id, bgColor: t.bg, textColor: t.text };
    onPrefsChange(np);
    onSavePrefs(np);
  };

  const setRuler = () => {
    const np = { ...prefs, showRuler: !effectivePrefs.showRuler };
    onPrefsChange(np);
    onSavePrefs(np);
  };

  const isDark = isFocusMode || effectivePrefs.pageTheme === "dark";
  const toolbarBg = isFocusMode
    ? "rgba(18,18,22,0.95)"
    : isDark
      ? "rgba(26,26,31,0.97)"
      : "rgba(255,255,255,0.96)";
  const toolbarColor = isDark ? "#d4d4d8" : "#3f3f46";
  const activeBg = isDark ? "rgba(255,255,255,0.12)" : "rgba(0,0,0,0.08)";
  const hoverBg  = isDark ? "rgba(255,255,255,0.07)" : "rgba(0,0,0,0.05)";

  const btnBase: React.CSSProperties = {
    display: "flex", alignItems: "center", justifyContent: "center",
    width: 30, height: 28, borderRadius: 6, border: "none",
    background: "transparent", cursor: "pointer", color: toolbarColor,
    transition: "background 0.12s",
    fontSize: 12, fontWeight: 600,
  };
  const btn = (active?: boolean): React.CSSProperties => ({
    ...btnBase,
    background: active ? activeBg : "transparent",
    color: active ? (isDark ? "#fff" : "#18181b") : toolbarColor,
  });

  const currentAlign = effectivePrefs.textAlign || (isRTL ? "right" : "left");
  const currentLineSpacing = effectivePrefs.lineHeight || "normal";

  // ─────────────────────────────────────────────────────────────
  // PHONE LAYOUT
  // A clean, uncluttered bar with only the tools writers reach for
  // constantly (bold / italic / underline + text size). Everything
  // else lives one tap away in a "More" bottom sheet, ordered from
  // most to least used. Desktop is left completely untouched below.
  // ─────────────────────────────────────────────────────────────
  if (isPhone) {
    const sheetBg = isDark ? "#17171c" : "#ffffff";
    const sheetText = isDark ? "#e4e4e7" : "#18181b";
    const sheetSub = isDark ? "rgba(255,255,255,0.5)" : "rgba(0,0,0,0.5)";
    const chipIdle = isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.05)";
    const chipActiveBg = isDark ? "#ffffff" : "#18181b";
    const chipActiveFg = isDark ? "#000000" : "#ffffff";

    const mBtn = (active?: boolean): React.CSSProperties => ({
      display: "flex", alignItems: "center", justifyContent: "center",
      width: 40, height: 34, borderRadius: 9, border: "none",
      background: active ? activeBg : "transparent",
      color: active ? (isDark ? "#fff" : "#18181b") : toolbarColor,
      cursor: "pointer", transition: "background 0.12s", flexShrink: 0,
    });
    const seg = (active: boolean): React.CSSProperties => ({
      flex: 1, height: 42, borderRadius: 11, border: "none", cursor: "pointer",
      display: "flex", alignItems: "center", justifyContent: "center", gap: 5,
      fontSize: 13.5, fontWeight: 600,
      background: active ? chipActiveBg : chipIdle,
      color: active ? chipActiveFg : sheetText,
      transition: "background 0.12s",
    });
    const sectionLabel: React.CSSProperties = {
      fontSize: 11, fontWeight: 700, letterSpacing: "0.09em", textTransform: "uppercase",
      color: sheetSub, marginBottom: 11,
    };
    const rowGap: React.CSSProperties = { display: "flex", gap: 8 };

    return (
      <>
        {/* Compact sticky bar */}
        <div
          className="sticky top-12 z-40 border-b shrink-0"
          style={{
            background: toolbarBg,
            borderColor: isDark ? "rgba(255,255,255,0.07)" : "rgba(0,0,0,0.07)",
            backdropFilter: "blur(12px)",
            opacity: isFocusMode ? 0.12 : 1,
          }}
        >
          <div className="px-2 h-11 flex items-center gap-1" style={{ color: toolbarColor }} dir="ltr">
            <button onClick={() => toggle("isBold")} style={mBtn(effectivePrefs.isBold)} aria-label="Bold"><Bold className="w-4 h-4" /></button>
            <button onClick={() => toggle("isItalic")} style={mBtn(effectivePrefs.isItalic)} aria-label="Italic"><Italic className="w-4 h-4" /></button>
            <button onClick={() => toggle("isUnderline")} style={mBtn(effectivePrefs.isUnderline)} aria-label="Underline"><Underline className="w-4 h-4" /></button>

            <div className="w-px self-stretch my-2 bg-current opacity-10 mx-1" />

            <button onClick={() => changeSize(-1)} style={mBtn()} aria-label="Decrease size"><Minus className="w-4 h-4" /></button>
            <span className="text-sm font-semibold tabular-nums w-6 text-center" style={{ color: toolbarColor }}>{currentSizePx}</span>
            <button onClick={() => changeSize(1)} style={mBtn()} aria-label="Increase size"><Plus className="w-4 h-4" /></button>

            <div style={{ flex: 1 }} />

            <button
              onClick={() => setMoreOpen(true)}
              className="flex items-center gap-1.5 px-3 h-8 rounded-full"
              style={{ background: activeBg, color: isDark ? "#fff" : "#18181b", border: "none", cursor: "pointer", fontSize: 13, fontWeight: 600, flexShrink: 0 }}
            >
              <SlidersHorizontal className="w-3.5 h-3.5" />
              {ar ? "المزيد" : "More"}
            </button>
          </div>
        </div>

        {/* More bottom sheet */}
        {moreOpen && (
          <div className="fixed inset-0 z-[60]" dir={isRTL ? "rtl" : "ltr"}>
            <div className="absolute inset-0" style={{ background: "rgba(0,0,0,0.5)" }} onClick={() => setMoreOpen(false)} />
            <div
              className="absolute left-0 right-0 bottom-0 rounded-t-3xl"
              style={{
                background: sheetBg, color: sheetText,
                maxHeight: "82vh", overflowY: "auto",
                padding: "10px 20px calc(env(safe-area-inset-bottom, 0px) + 24px)",
                boxShadow: "0 -20px 60px rgba(0,0,0,0.5)",
                fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Text", sans-serif',
              }}
            >
              {/* Grip + header */}
              <div style={{ display: "flex", justifyContent: "center", paddingTop: 4, paddingBottom: 10 }}>
                <div style={{ width: 40, height: 5, borderRadius: 999, background: isDark ? "rgba(255,255,255,0.18)" : "rgba(0,0,0,0.15)" }} />
              </div>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
                <span style={{ fontSize: 18, fontWeight: 800, letterSpacing: "-0.02em" }}>{ar ? "التنسيق" : "Formatting"}</span>
                <button onClick={() => setMoreOpen(false)} aria-label="Close" style={{ width: 32, height: 32, borderRadius: 999, border: "none", cursor: "pointer", background: chipIdle, color: sheetText, display: "grid", placeItems: "center" }}>
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* 1. Font */}
              <div style={{ marginBottom: 22 }}>
                <div style={sectionLabel}>{ar ? "الخط" : "Font"}</div>
                <div style={{ display: "flex", gap: 8, overflowX: "auto", paddingBottom: 4, scrollbarWidth: "none" }}>
                  {FONT_OPTIONS.map(f => (
                    <button
                      key={f.id}
                      onClick={() => setFont(f.id)}
                      style={{
                        flex: "0 0 auto", padding: "10px 16px", borderRadius: 11, border: "none", cursor: "pointer",
                        whiteSpace: "nowrap", fontFamily: f.fontFamily, fontSize: 15,
                        background: f.id === currentFontId ? chipActiveBg : chipIdle,
                        color: f.id === currentFontId ? chipActiveFg : sheetText,
                      }}
                    >
                      {ar ? f.labelAr : f.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* 2. Alignment */}
              <div style={{ marginBottom: 22 }}>
                <div style={sectionLabel}>{ar ? "المحاذاة" : "Alignment"}</div>
                <div style={rowGap}>
                  {(["left", "center", "right", "justify"] as const).map(a => {
                    const Icon = a === "left" ? AlignLeft : a === "center" ? AlignCenter : a === "right" ? AlignRight : AlignJustify;
                    return (
                      <button key={a} onClick={() => setAlign(a)} style={seg(currentAlign === a)} aria-label={a}>
                        <Icon className="w-4 h-4" />
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* 3. Line spacing */}
              <div style={{ marginBottom: 22 }}>
                <div style={sectionLabel}>{ar ? "تباعد الأسطر" : "Line spacing"}</div>
                <div style={rowGap}>
                  {LINE_SPACING_OPTIONS.map(opt => (
                    <button key={opt.value} onClick={() => setLineSpacing(opt.value)} style={seg(opt.value === currentLineSpacing)}>
                      {ar ? opt.labelAr : opt.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* 4. Colors */}
              <div style={{ marginBottom: 22 }}>
                <div style={sectionLabel}>{ar ? "الألوان" : "Colors"}</div>
                <div style={rowGap}>
                  <button
                    onClick={() => document.getElementById("tb-text-color-m")?.click()}
                    style={{ flex: 1, height: 54, borderRadius: 12, border: "none", cursor: "pointer", background: chipIdle, color: sheetText, display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 16px" }}
                  >
                    <span style={{ fontSize: 13.5, fontWeight: 600 }}>{ar ? "لون النص" : "Text"}</span>
                    <span style={{ width: 26, height: 26, borderRadius: 8, background: effectivePrefs.textColor || (isDark ? "#e4e4e7" : "#18181b"), border: "2px solid rgba(128,128,128,0.4)" }} />
                  </button>
                  <button
                    onClick={() => document.getElementById("tb-highlight-color-m")?.click()}
                    style={{ flex: 1, height: 54, borderRadius: 12, border: "none", cursor: "pointer", background: chipIdle, color: sheetText, display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 16px" }}
                  >
                    <span style={{ fontSize: 13.5, fontWeight: 600 }}>{ar ? "تمييز" : "Highlight"}</span>
                    <span style={{ width: 26, height: 26, borderRadius: 8, background: effectivePrefs.highlightColor || "#fef08a", border: "2px solid rgba(128,128,128,0.4)" }} />
                  </button>
                  <input id="tb-text-color-m" type="color" value={effectivePrefs.textColor || (isDark ? "#e4e4e7" : "#18181b")} onChange={e => { const np = { ...prefs, textColor: e.target.value }; onPrefsChange(np); }} onBlur={e => { const np = { ...prefs, textColor: e.target.value }; onSavePrefs(np); }} style={{ position: "absolute", opacity: 0, width: 1, height: 1, pointerEvents: "none" }} />
                  <input id="tb-highlight-color-m" type="color" value={effectivePrefs.highlightColor || "#fef08a"} onChange={e => { const np = { ...prefs, highlightColor: e.target.value }; onPrefsChange(np); }} onBlur={e => { const np = { ...prefs, highlightColor: e.target.value }; onSavePrefs(np); }} style={{ position: "absolute", opacity: 0, width: 1, height: 1, pointerEvents: "none" }} />
                </div>
              </div>

              {/* 5. Page theme */}
              <div style={{ marginBottom: 22 }}>
                <div style={sectionLabel}>{ar ? "نسق الصفحة" : "Page theme"}</div>
                <div style={rowGap}>
                  {PAGE_THEMES.map(t => {
                    const active = (effectivePrefs.pageTheme || "white") === t.id;
                    return (
                      <button
                        key={t.id}
                        onClick={() => setTheme(t)}
                        style={{
                          flex: 1, height: 52, borderRadius: 12, cursor: "pointer",
                          background: t.bg, color: t.text,
                          border: active ? `2px solid ${isDark ? "#fff" : "#18181b"}` : `1px solid ${t.border}`,
                          fontSize: 12.5, fontWeight: 700,
                          display: "flex", alignItems: "center", justifyContent: "center",
                        }}
                      >
                        {ar ? t.labelAr : t.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* 6. Zoom */}
              <div style={{ marginBottom: 22 }}>
                <div style={sectionLabel}>{ar ? "التكبير" : "Zoom"}</div>
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <button onClick={() => onZoomChange(Math.max(50, zoom - 10))} style={{ ...seg(false), flex: "0 0 46px", height: 44 }} aria-label="Zoom out"><Minus className="w-4 h-4" /></button>
                  <input type="range" min={50} max={200} step={5} value={zoom} onChange={e => onZoomChange(Number(e.target.value))} style={{ flex: 1, accentColor: isDark ? "#fff" : "#18181b" }} />
                  <span className="tabular-nums" style={{ fontSize: 13, fontWeight: 700, width: 44, textAlign: "center" }}>{zoom}%</span>
                  <button onClick={() => onZoomChange(Math.min(200, zoom + 10))} style={{ ...seg(false), flex: "0 0 46px", height: 44 }} aria-label="Zoom in"><Plus className="w-4 h-4" /></button>
                </div>
              </div>

              {/* 7. Ruler + Page setup */}
              <div style={rowGap}>
                <button onClick={setRuler} style={seg(!!effectivePrefs.showRuler)}>
                  <Ruler className="w-4 h-4" /> {ar ? "مسطرة" : "Ruler"}
                </button>
                <button onClick={() => { onOpenPageSetup(); setMoreOpen(false); }} style={seg(false)}>
                  <Settings2 className="w-4 h-4" /> {ar ? "إعداد الصفحة" : "Page setup"}
                </button>
              </div>
            </div>
          </div>
        )}
      </>
    );
  }

  return (
    <div
      className="sticky top-12 z-40 border-b transition-all duration-500 shrink-0"
      style={{
        background: toolbarBg,
        borderColor: isDark ? "rgba(255,255,255,0.07)" : "rgba(0,0,0,0.07)",
        backdropFilter: "blur(12px)",
        opacity: isFocusMode ? 0.12 : 1,
      }}
      onMouseEnter={e => { if (isFocusMode) (e.currentTarget as HTMLDivElement).style.opacity = "1"; }}
      onMouseLeave={e => { if (isFocusMode) (e.currentTarget as HTMLDivElement).style.opacity = "0.12"; }}
    >
      <div
        className="max-w-5xl mx-auto px-3 h-10 flex items-center gap-0.5 overflow-x-auto"
        style={{ color: toolbarColor, scrollbarWidth: "none" }}
        dir="ltr"
      >
        {/* ── Font Family ── */}
        <div className="relative flex-shrink-0" ref={fontDropRef}>
          <button
            onClick={() => setFontDropOpen(v => !v)}
            className="flex items-center gap-1 px-2 h-7 rounded-md text-xs font-medium transition-colors hover:bg-black/5 dark:hover:bg-white/5 whitespace-nowrap"
            style={{ background: fontDropOpen ? activeBg : "transparent", color: toolbarColor, maxWidth: 130, minWidth: 100 }}
          >
            <span
              className="truncate"
              style={{ fontFamily: currentFont?.fontFamily || "'EB Garamond', serif", maxWidth: 90 }}
            >
              {ar ? (currentFont?.labelAr || currentFont?.label || "Font") : (currentFont?.label || "Font")}
            </span>
            <ChevronDown className="w-3 h-3 flex-shrink-0 opacity-50" />
          </button>
          {fontDropOpen && (
            <div
              className="absolute top-full left-0 mt-1 rounded-xl shadow-2xl overflow-y-auto z-50"
              style={{
                width: 200, maxHeight: 320,
                background: isDark ? "#1c1c24" : "#ffffff",
                border: `1px solid ${isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.1)"}`,
              }}
            >
              {FONT_OPTIONS.map(f => (
                <button
                  key={f.id}
                  onClick={() => setFont(f.id)}
                  className="w-full px-3 py-2 text-left flex items-center gap-2 transition-colors"
                  style={{
                    fontSize: 13, color: isDark ? "#e4e4e7" : "#18181b",
                    background: f.id === currentFontId ? (isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.05)") : "transparent",
                    fontFamily: f.fontFamily,
                  }}
                  onMouseEnter={e => (e.currentTarget.style.background = isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.04)")}
                  onMouseLeave={e => (e.currentTarget.style.background = f.id === currentFontId ? (isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.05)") : "transparent")}
                >
                  <span style={{ flex: 1 }}>{ar ? f.labelAr : f.label}</span>
                  {f.id === currentFontId && <span style={{ fontSize: 9, opacity: 0.5 }}>✓</span>}
                </button>
              ))}
            </div>
          )}
        </div>

        <Sep />

        {/* ── Font Size ── */}
        <div className="flex items-center gap-0.5 flex-shrink-0">
          <button onClick={() => changeSize(-1)} style={btn()} title={ar ? "تصغير" : "Decrease size"} onMouseEnter={e => (e.currentTarget.style.background = hoverBg)} onMouseLeave={e => (e.currentTarget.style.background = "transparent")}>
            <Minus className="w-3 h-3" />
          </button>
          <span className="text-xs font-semibold tabular-nums w-7 text-center" style={{ color: toolbarColor }}>
            {currentSizePx}
          </span>
          <button onClick={() => changeSize(1)} style={btn()} title={ar ? "تكبير" : "Increase size"} onMouseEnter={e => (e.currentTarget.style.background = hoverBg)} onMouseLeave={e => (e.currentTarget.style.background = "transparent")}>
            <Plus className="w-3 h-3" />
          </button>
        </div>

        <Sep />

        {/* ── Bold / Italic / Underline ── */}
        <button
          onClick={() => toggle("isBold")}
          style={btn(effectivePrefs.isBold)}
          title={ar ? "غامق (Ctrl+B)" : "Bold (Ctrl+B)"}
          onMouseEnter={e => (e.currentTarget.style.background = effectivePrefs.isBold ? activeBg : hoverBg)}
          onMouseLeave={e => (e.currentTarget.style.background = effectivePrefs.isBold ? activeBg : "transparent")}
        >
          <Bold className="w-3.5 h-3.5" />
        </button>
        <button
          onClick={() => toggle("isItalic")}
          style={btn(effectivePrefs.isItalic)}
          title={ar ? "مائل (Ctrl+I)" : "Italic (Ctrl+I)"}
          onMouseEnter={e => (e.currentTarget.style.background = effectivePrefs.isItalic ? activeBg : hoverBg)}
          onMouseLeave={e => (e.currentTarget.style.background = effectivePrefs.isItalic ? activeBg : "transparent")}
        >
          <Italic className="w-3.5 h-3.5" />
        </button>
        <button
          onClick={() => toggle("isUnderline")}
          style={btn(effectivePrefs.isUnderline)}
          title={ar ? "تسطير (Ctrl+U)" : "Underline (Ctrl+U)"}
          onMouseEnter={e => (e.currentTarget.style.background = effectivePrefs.isUnderline ? activeBg : hoverBg)}
          onMouseLeave={e => (e.currentTarget.style.background = effectivePrefs.isUnderline ? activeBg : "transparent")}
        >
          <Underline className="w-3.5 h-3.5" />
        </button>

        <Sep />

        {/* ── Text Alignment ── */}
        {(["left", "center", "right", "justify"] as const).map(a => {
          const Icon = a === "left" ? AlignLeft : a === "center" ? AlignCenter : a === "right" ? AlignRight : AlignJustify;
          const labels: Record<string, string> = { left: ar ? "يسار" : "Left", center: ar ? "وسط" : "Center", right: ar ? "يمين" : "Right", justify: ar ? "ضبط" : "Justify" };
          return (
            <button
              key={a}
              onClick={() => setAlign(a)}
              style={btn(currentAlign === a)}
              title={labels[a]}
              onMouseEnter={e => (e.currentTarget.style.background = currentAlign === a ? activeBg : hoverBg)}
              onMouseLeave={e => (e.currentTarget.style.background = currentAlign === a ? activeBg : "transparent")}
            >
              <Icon className="w-3.5 h-3.5" />
            </button>
          );
        })}

        <Sep />

        {/* ── Text Color ── */}
        <div className="flex items-center gap-1 flex-shrink-0">
          <div className="relative flex-shrink-0" title={ar ? "لون النص" : "Text Color"}>
            <button
              className="w-7 h-7 rounded-md flex items-center justify-center transition-colors"
              style={{ background: "transparent", border: "none", cursor: "pointer", padding: 0 }}
              onClick={() => document.getElementById("tb-text-color")?.click()}
              onMouseEnter={e => (e.currentTarget.style.background = hoverBg)}
              onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
            >
              <div className="flex flex-col items-center gap-px">
                <span className="text-xs font-bold leading-none" style={{ color: toolbarColor }}>A</span>
                <div className="w-4 h-1 rounded-sm" style={{ background: effectivePrefs.textColor || (isDark ? "#e4e4e7" : "#18181b") }} />
              </div>
            </button>
            <input
              id="tb-text-color"
              type="color"
              value={effectivePrefs.textColor || (isDark ? "#e4e4e7" : "#18181b")}
              onChange={e => { const np = { ...prefs, textColor: e.target.value }; onPrefsChange(np); }}
              onBlur={e => { const np = { ...prefs, textColor: e.target.value }; onSavePrefs(np); }}
              className="sr-only"
              style={{ position: "absolute", opacity: 0, width: 1, height: 1 }}
            />
          </div>

          {/* Highlight Color */}
          <div className="relative flex-shrink-0" title={ar ? "لون التمييز" : "Highlight Color"}>
            <button
              className="w-7 h-7 rounded-md flex items-center justify-center transition-colors"
              style={{ background: "transparent", border: "none", cursor: "pointer", padding: 0 }}
              onClick={() => document.getElementById("tb-highlight-color")?.click()}
              onMouseEnter={e => (e.currentTarget.style.background = hoverBg)}
              onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
            >
              <div className="flex flex-col items-center gap-px">
                <span className="text-[11px] leading-none" style={{ color: toolbarColor }}>⌐</span>
                <div className="w-4 h-1 rounded-sm" style={{ background: effectivePrefs.highlightColor || "#fef08a" }} />
              </div>
            </button>
            <input
              id="tb-highlight-color"
              type="color"
              value={effectivePrefs.highlightColor || "#fef08a"}
              onChange={e => { const np = { ...prefs, highlightColor: e.target.value }; onPrefsChange(np); }}
              onBlur={e => { const np = { ...prefs, highlightColor: e.target.value }; onSavePrefs(np); }}
              className="sr-only"
              style={{ position: "absolute", opacity: 0, width: 1, height: 1 }}
            />
          </div>
        </div>

        <Sep />

        {/* ── Line Spacing ── */}
        <div className="relative flex-shrink-0" ref={lineDropRef}>
          <button
            onClick={() => setLineDropOpen(v => !v)}
            className="flex items-center gap-1 px-2 h-7 rounded-md text-xs font-medium"
            style={{ background: lineDropOpen ? activeBg : "transparent", color: toolbarColor, border: "none", cursor: "pointer" }}
            title={ar ? "تباعد الأسطر" : "Line Spacing"}
            onMouseEnter={e => (e.currentTarget.style.background = lineDropOpen ? activeBg : hoverBg)}
            onMouseLeave={e => (e.currentTarget.style.background = lineDropOpen ? activeBg : "transparent")}
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="currentColor" style={{ flexShrink: 0 }}>
              <rect x="3" y="1" width="8" height="1.5" rx="0.75"/>
              <rect x="3" y="4.5" width="8" height="1.5" rx="0.75"/>
              <rect x="3" y="8" width="8" height="1.5" rx="0.75"/>
              <rect x="3" y="11.5" width="8" height="1.5" rx="0.75"/>
              <path d="M1 1.5L0 2.75L1 4V1.5Z"/>
              <path d="M1 9.5L0 10.75L1 12V9.5Z"/>
            </svg>
            <span>{LINE_SPACING_OPTIONS.find(l => l.value === currentLineSpacing)?.[ar ? "labelAr" : "label"] ?? "1.85"}</span>
            <ChevronDown className="w-3 h-3 opacity-50" />
          </button>
          {lineDropOpen && (
            <div
              className="absolute top-full left-0 mt-1 rounded-xl shadow-xl overflow-hidden z-50"
              style={{
                width: 100,
                background: isDark ? "#1c1c24" : "#ffffff",
                border: `1px solid ${isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.1)"}`,
              }}
            >
              {LINE_SPACING_OPTIONS.map(opt => (
                <button
                  key={opt.value}
                  onClick={() => setLineSpacing(opt.value)}
                  className="w-full px-3 py-2 text-left text-xs font-medium transition-colors"
                  style={{
                    color: isDark ? "#e4e4e7" : "#18181b",
                    background: opt.value === currentLineSpacing ? (isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.05)") : "transparent",
                    border: "none", cursor: "pointer", display: "block",
                  }}
                  onMouseEnter={e => (e.currentTarget.style.background = isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.04)")}
                  onMouseLeave={e => (e.currentTarget.style.background = opt.value === currentLineSpacing ? (isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.05)") : "transparent")}
                >
                  {ar ? opt.labelAr : opt.label}
                </button>
              ))}
            </div>
          )}
        </div>

        <Sep />

        {/* ── Page Themes ── */}
        <div className="flex items-center gap-1 flex-shrink-0" title={ar ? "نسق الصفحة" : "Page Theme"}>
          {PAGE_THEMES.map(t => (
            <button
              key={t.id}
              onClick={() => setTheme(t)}
              title={ar ? t.labelAr : t.label}
              style={{
                width: 16, height: 16, borderRadius: "50%", border: "none",
                background: t.bg, cursor: "pointer", transition: "all 0.15s",
                boxShadow: (effectivePrefs.pageTheme || "white") === t.id
                  ? `0 0 0 2px ${isDark ? "#a1a1aa" : "#3f3f46"}`
                  : `0 0 0 1px ${t.border}`,
                transform: (effectivePrefs.pageTheme || "white") === t.id ? "scale(1.2)" : "scale(1)",
              }}
            />
          ))}
        </div>

        <Sep />

        {/* ── Zoom ── */}
        <div className="flex items-center gap-1 flex-shrink-0">
          <button
            onClick={() => onZoomChange(Math.max(50, zoom - 10))}
            style={btn()}
            title={ar ? "تصغير العرض" : "Zoom out"}
            onMouseEnter={e => (e.currentTarget.style.background = hoverBg)}
            onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
          >
            <Minus className="w-3 h-3" />
          </button>
          <input
            type="range" min={50} max={200} step={5} value={zoom}
            onChange={e => onZoomChange(Number(e.target.value))}
            className="w-16 h-1 accent-current cursor-pointer"
            title={`${zoom}%`}
            style={{ accentColor: isDark ? "#a1a1aa" : "#52525b" }}
          />
          <button
            onClick={() => onZoomChange(Math.min(200, zoom + 10))}
            style={btn()}
            title={ar ? "تكبير العرض" : "Zoom in"}
            onMouseEnter={e => (e.currentTarget.style.background = hoverBg)}
            onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
          >
            <Plus className="w-3 h-3" />
          </button>
          <span className="text-[10px] tabular-nums w-8 font-medium" style={{ color: isDark ? "rgba(255,255,255,0.4)" : "rgba(0,0,0,0.4)" }}>
            {zoom}%
          </span>
        </div>

        <Sep />

        {/* ── Ruler Toggle ── */}
        <button
          onClick={setRuler}
          style={btn(effectivePrefs.showRuler)}
          title={ar ? "مسطرة" : "Toggle Ruler"}
          onMouseEnter={e => (e.currentTarget.style.background = effectivePrefs.showRuler ? activeBg : hoverBg)}
          onMouseLeave={e => (e.currentTarget.style.background = effectivePrefs.showRuler ? activeBg : "transparent")}
        >
          <Ruler className="w-3.5 h-3.5" />
        </button>

        {/* ── Page Setup ── */}
        <button
          onClick={onOpenPageSetup}
          style={btn()}
          title={ar ? "إعداد الصفحة" : "Page Setup"}
          onMouseEnter={e => (e.currentTarget.style.background = hoverBg)}
          onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
        >
          <Settings2 className="w-3.5 h-3.5" />
        </button>

      </div>
    </div>
  );
}

export { PAGE_THEMES };
