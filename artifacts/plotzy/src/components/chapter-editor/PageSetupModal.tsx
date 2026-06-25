// Apple-style Page Setup.
//
// Sidebar navigation on the left, focused content area on the right —
// the macOS System Preferences pattern. Single source of truth for
// every page-level preference: paper size, margins, header/footer, and
// page-number styling. All changes write through setPrefs and persist
// via handleSavePrefs, so anything tweaked here lands on the visible
// page the moment you let go.

import { useState } from "react";
import {
  X,
  FileText,
  Square as SquareIcon,
  Type,
  Hash,
  Check,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Minus,
} from "lucide-react";
import type { BookPreferences } from "@/shared/schema";

const SF =
  '-apple-system, BlinkMacSystemFont, "SF Pro Display", "SF Pro Text", "Helvetica Neue", "Inter", "Segoe UI", Arial, sans-serif';

const PAPER_SIZES: Record<
  string,
  { width: number; height: number; widthCm: number; heightCm: number; label: string; labelAr: string }
> = {
  a5:     { width: 559,  height: 794,  widthCm: 14.8, heightCm: 21.0, label: "Classic Novel",      labelAr: "رواية كلاسيكية" },
  pocket: { width: 416,  height: 680,  widthCm: 11.0, heightCm: 18.0, label: "Pocket Book",        labelAr: "كتاب جيب" },
  trade:  { width: 576,  height: 864,  widthCm: 15.2, heightCm: 22.9, label: "Professional Trade", labelAr: "تجاري احترافي" },
  a4:     { width: 794,  height: 1123, widthCm: 21.0, heightCm: 29.7, label: "Standard A4",        labelAr: "A4 قياسي" },
};

const DEFAULT_MARGIN = 72;

const FONT_OPTIONS: Array<{ value: string; label: string }> = [
  { value: "", label: "Same as body" },
  { value: "'EB Garamond', serif", label: "EB Garamond" },
  { value: "'Playfair Display', serif", label: "Playfair Display" },
  { value: "'Lora', serif", label: "Lora" },
  { value: "'Merriweather', serif", label: "Merriweather" },
  { value: "'Cormorant Garamond', serif", label: "Cormorant Garamond" },
  { value: "Georgia, serif", label: "Georgia" },
  { value: "'Times New Roman', serif", label: "Times New Roman" },
  { value: "Arial, sans-serif", label: "Arial" },
  { value: "'Courier New', monospace", label: "Courier New" },
];

// Restrained Apple-style colour palette. One row, 14 colours plus an
// auto/reset chip. Drawn from the SF Symbols / macOS Accent colour set.
const PAGE_NUM_COLORS = [
  "#ffffff", "#9ca3af", "#000000",
  "#ef4444", "#f97316", "#eab308", "#22c55e",
  "#10b981", "#06b6d4", "#3b82f6", "#6366f1",
  "#a855f7", "#ec4899", "#a16207",
];

interface PageSetupModalProps {
  prefs: BookPreferences;
  setPrefs: React.Dispatch<React.SetStateAction<BookPreferences>>;
  handleSavePrefs: (newPrefs: BookPreferences) => Promise<void>;
  isDark: boolean;
  ar: boolean;
  onClose: () => void;
}

type Tab = "paper" | "headerFooter" | "pageNumber";

export function PageSetupModal({
  prefs,
  setPrefs,
  handleSavePrefs,
  isDark,
  ar,
  onClose,
}: PageSetupModalProps) {
  const [tab, setTab] = useState<Tab>("paper");

  // Palette ─────────────────────────────────────────────────────────
  const bg = isDark ? "#1a1a1c" : "#ffffff";
  const subtleBg = isDark ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.025)";
  const inputBg = isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.04)";
  const inputBgStrong = isDark ? "rgba(255,255,255,0.09)" : "rgba(0,0,0,0.06)";
  const border = isDark ? "rgba(255,255,255,0.07)" : "rgba(0,0,0,0.06)";
  const borderStrong = isDark ? "rgba(255,255,255,0.13)" : "rgba(0,0,0,0.12)";
  const text = isDark ? "#f4f4f5" : "#0c0c0e";
  const textDim = isDark ? "rgba(255,255,255,0.62)" : "rgba(0,0,0,0.60)";
  const textMute = isDark ? "rgba(255,255,255,0.40)" : "rgba(0,0,0,0.42)";
  const accent = "hsl(var(--primary))";

  // ── Helpers ──────────────────────────────────────────────────────
  function update<K extends keyof BookPreferences>(key: K, value: BookPreferences[K]) {
    const next = { ...prefs, [key]: value };
    setPrefs(next);
    handleSavePrefs(next);
  }

  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 90,
        background: "rgba(0,0,0,0.55)",
        backdropFilter: "blur(8px)",
        WebkitBackdropFilter: "blur(8px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 16,
        fontFamily: SF,
        animation: "psm-fade 160ms ease-out",
      }}
    >
      <style>{`
        @keyframes psm-fade { from { opacity: 0 } to { opacity: 1 } }
        @keyframes psm-zoom {
          from { opacity: 0; transform: scale(0.97); }
          to   { opacity: 1; transform: scale(1); }
        }
        .psm-scroll::-webkit-scrollbar { width: 8px; }
        .psm-scroll::-webkit-scrollbar-thumb {
          background: ${isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.1)"};
          border-radius: 999px;
        }
        .psm-input:focus-visible {
          outline: none !important;
          border-color: ${accent} !important;
          box-shadow: 0 0 0 3px ${isDark ? "rgba(124,108,247,0.18)" : "rgba(124,108,247,0.18)"};
        }
        .psm-tab:hover {
          background: ${inputBg};
        }
      `}</style>

      <div
        onClick={(e) => e.stopPropagation()}
        dir={ar ? "rtl" : "ltr"}
        style={{
          background: bg,
          color: text,
          borderRadius: 22,
          border: `1px solid ${border}`,
          width: "100%",
          maxWidth: 940,
          maxHeight: "calc(100vh - 32px)",
          display: "grid",
          gridTemplateRows: "auto 1fr auto",
          boxShadow:
            "0 24px 80px rgba(0,0,0,0.55), 0 1px 0 rgba(255,255,255,0.04) inset",
          overflow: "hidden",
          animation: "psm-zoom 200ms cubic-bezier(0.22, 1, 0.36, 1)",
        }}
      >
        {/* ── Header ─────────────────────────────────────────── */}
        <div
          style={{
            padding: "20px 24px 18px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            borderBottom: `1px solid ${border}`,
          }}
        >
          <div>
            <div
              style={{
                fontSize: 18,
                fontWeight: 700,
                letterSpacing: "-0.02em",
                lineHeight: 1.15,
              }}
            >
              {ar ? "إعداد الصفحة" : "Page Setup"}
            </div>
            <div
              style={{
                fontSize: 12.5,
                color: textDim,
                marginTop: 4,
                letterSpacing: "-0.005em",
              }}
            >
              {ar
                ? "حجم الورق، الهوامش، الرأس والتذييل، وأرقام الصفحات."
                : "Paper, margins, header & footer, page numbers."}
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label={ar ? "إغلاق" : "Close"}
            style={{
              width: 30,
              height: 30,
              borderRadius: 10,
              border: "none",
              background: "transparent",
              color: textDim,
              cursor: "pointer",
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              transition: "background 120ms",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.background = inputBg)}
            onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
          >
            <X size={16} />
          </button>
        </div>

        {/* ── Body: sidebar + content ────────────────────────── */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "200px 1fr",
            minHeight: 0,
          }}
        >
          {/* Sidebar */}
          <nav
            style={{
              padding: "16px 12px",
              borderInlineEnd: `1px solid ${border}`,
              background: subtleBg,
              display: "flex",
              flexDirection: "column",
              gap: 2,
              overflowY: "auto",
            }}
            className="psm-scroll"
          >
            <SidebarTab
              icon={<FileText size={14} />}
              label={ar ? "الورق والهوامش" : "Paper & Margins"}
              active={tab === "paper"}
              onClick={() => setTab("paper")}
              accent={accent}
              text={text}
              textDim={textDim}
              inputBgStrong={inputBgStrong}
              border={border}
            />
            <SidebarTab
              icon={<Type size={14} />}
              label={ar ? "الرأس والتذييل" : "Header & Footer"}
              active={tab === "headerFooter"}
              onClick={() => setTab("headerFooter")}
              accent={accent}
              text={text}
              textDim={textDim}
              inputBgStrong={inputBgStrong}
              border={border}
            />
            <SidebarTab
              icon={<Hash size={14} />}
              label={ar ? "أرقام الصفحات" : "Page Numbers"}
              active={tab === "pageNumber"}
              onClick={() => setTab("pageNumber")}
              accent={accent}
              text={text}
              textDim={textDim}
              inputBgStrong={inputBgStrong}
              border={border}
            />
          </nav>

          {/* Content */}
          <div
            className="psm-scroll"
            style={{
              padding: "24px 28px 28px",
              overflowY: "auto",
              minHeight: 0,
            }}
          >
            {tab === "paper" && (
              <PaperTab
                prefs={prefs}
                update={update}
                ar={ar}
                text={text}
                textDim={textDim}
                textMute={textMute}
                inputBg={inputBg}
                inputBgStrong={inputBgStrong}
                border={border}
                borderStrong={borderStrong}
                accent={accent}
                isDark={isDark}
              />
            )}

            {tab === "headerFooter" && (
              <HeaderFooterTab
                prefs={prefs}
                update={update}
                setPrefs={setPrefs}
                handleSavePrefs={handleSavePrefs}
                ar={ar}
                text={text}
                textDim={textDim}
                textMute={textMute}
                inputBg={inputBg}
                border={border}
                borderStrong={borderStrong}
                accent={accent}
                isDark={isDark}
              />
            )}

            {tab === "pageNumber" && (
              <PageNumberTab
                prefs={prefs}
                update={update}
                ar={ar}
                text={text}
                textDim={textDim}
                textMute={textMute}
                inputBg={inputBg}
                inputBgStrong={inputBgStrong}
                border={border}
                borderStrong={borderStrong}
                accent={accent}
                isDark={isDark}
              />
            )}
          </div>
        </div>

        {/* ── Footer ─────────────────────────────────────────── */}
        <div
          style={{
            padding: "14px 20px",
            borderTop: `1px solid ${border}`,
            display: "flex",
            justifyContent: "flex-end",
            background: subtleBg,
          }}
        >
          <button
            onClick={onClose}
            style={{
              padding: "8px 22px",
              borderRadius: 10,
              background: text,
              color: bg,
              border: "none",
              cursor: "pointer",
              fontFamily: "inherit",
              fontSize: 13,
              fontWeight: 600,
              letterSpacing: "-0.005em",
              transition: "transform 120ms ease, opacity 120ms ease",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.opacity = "0.88")}
            onMouseLeave={(e) => (e.currentTarget.style.opacity = "1")}
          >
            {ar ? "تم" : "Done"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Sidebar tab ────────────────────────────────────────────────────

function SidebarTab({
  icon,
  label,
  active,
  onClick,
  accent,
  text,
  textDim,
  inputBgStrong,
  border,
}: {
  icon: React.ReactNode;
  label: string;
  active: boolean;
  onClick: () => void;
  accent: string;
  text: string;
  textDim: string;
  inputBgStrong: string;
  border: string;
}) {
  return (
    <button
      className="psm-tab"
      onClick={onClick}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 10,
        padding: "9px 11px",
        borderRadius: 8,
        background: active ? inputBgStrong : "transparent",
        border: `1px solid ${active ? border : "transparent"}`,
        cursor: "pointer",
        color: active ? text : textDim,
        fontFamily: "inherit",
        fontSize: 13,
        fontWeight: active ? 600 : 500,
        letterSpacing: "-0.005em",
        textAlign: "start",
        transition: "all 140ms ease",
      }}
    >
      <span
        style={{
          color: active ? accent : textDim,
          display: "inline-flex",
        }}
      >
        {icon}
      </span>
      {label}
    </button>
  );
}

// ─── Paper & Margins tab ───────────────────────────────────────────

function PaperTab({
  prefs,
  update,
  ar,
  text,
  textDim,
  textMute,
  inputBg,
  inputBgStrong,
  border,
  borderStrong,
  accent,
  isDark,
}: {
  prefs: BookPreferences;
  update: <K extends keyof BookPreferences>(k: K, v: BookPreferences[K]) => void;
  ar: boolean;
  text: string;
  textDim: string;
  textMute: string;
  inputBg: string;
  inputBgStrong: string;
  border: string;
  borderStrong: string;
  accent: string;
  isDark: boolean;
}) {
  const current = prefs.paperSize || "trade";
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      <Section
        title={ar ? "حجم الصفحة" : "Page Size"}
        textDim={textDim}
      >
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(2, 1fr)",
            gap: 10,
          }}
        >
          {Object.entries(PAPER_SIZES).map(([id, ps]) => {
            const active = current === id;
            const ratio = ps.widthCm / ps.heightCm;
            const previewH = 56;
            const previewW = Math.round(previewH * ratio);
            return (
              <button
                key={id}
                onClick={() => update("paperSize", id)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 14,
                  padding: "12px 14px",
                  background: active ? inputBgStrong : inputBg,
                  border: `1.5px solid ${active ? accent : border}`,
                  borderRadius: 14,
                  cursor: "pointer",
                  fontFamily: "inherit",
                  color: text,
                  textAlign: "start",
                  transition: "all 140ms ease",
                }}
              >
                <div
                  style={{
                    width: previewW,
                    height: previewH,
                    background: isDark ? "rgba(255,255,255,0.12)" : "#fff",
                    border: `1px solid ${
                      active ? accent : isDark ? "rgba(255,255,255,0.2)" : "rgba(0,0,0,0.15)"
                    }`,
                    borderRadius: 3,
                    boxShadow: "0 1px 4px rgba(0,0,0,0.18)",
                    flexShrink: 0,
                  }}
                />
                <div style={{ minWidth: 0 }}>
                  <div
                    style={{
                      fontSize: 13,
                      fontWeight: 600,
                      letterSpacing: "-0.005em",
                      marginBottom: 2,
                    }}
                  >
                    {ar ? ps.labelAr : ps.label}
                  </div>
                  <div
                    style={{
                      fontSize: 11,
                      color: textMute,
                      fontVariantNumeric: "tabular-nums",
                    }}
                  >
                    {ps.widthCm} × {ps.heightCm} cm
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </Section>

      <Section title={ar ? "الهوامش" : "Margins"} textDim={textDim} subtitle={ar ? "بالبكسل" : "In pixels"}>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: 12,
          }}
        >
          {(
            [
              { key: "marginTop", ar: "أعلى", en: "Top" },
              { key: "marginBottom", ar: "أسفل", en: "Bottom" },
              { key: "marginLeft", ar: "يسار", en: "Left" },
              { key: "marginRight", ar: "يمين", en: "Right" },
            ] as const
          ).map((m) => (
            <NumberInput
              key={m.key}
              label={ar ? m.ar : m.en}
              value={
                ((prefs as unknown as Record<string, number | undefined>)[m.key] ??
                  DEFAULT_MARGIN) as number
              }
              min={20}
              max={200}
              step={4}
              onChange={(v) =>
                update(
                  m.key as keyof BookPreferences,
                  v as BookPreferences[keyof BookPreferences],
                )
              }
              text={text}
              textDim={textDim}
              inputBg={inputBg}
              border={border}
              borderStrong={borderStrong}
            />
          ))}
        </div>
      </Section>
    </div>
  );
}

// ─── Header & Footer tab ───────────────────────────────────────────

function HeaderFooterTab({
  prefs,
  update,
  setPrefs,
  handleSavePrefs,
  ar,
  text,
  textDim,
  textMute,
  inputBg,
  border,
  borderStrong,
  accent,
  isDark,
}: {
  prefs: BookPreferences;
  update: <K extends keyof BookPreferences>(k: K, v: BookPreferences[K]) => void;
  setPrefs: React.Dispatch<React.SetStateAction<BookPreferences>>;
  handleSavePrefs: (newPrefs: BookPreferences) => Promise<void>;
  ar: boolean;
  text: string;
  textDim: string;
  textMute: string;
  inputBg: string;
  border: string;
  borderStrong: string;
  accent: string;
  isDark: boolean;
}) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      <Section title={ar ? "نص الرأس" : "Header Text"} textDim={textDim} subtitle={ar ? "يظهر أعلى كل صفحة" : "Appears at the top of every page"}>
        <input
          type="text"
          className="psm-input"
          placeholder={ar ? "اسم الكتاب أو الفصل…" : "Book or chapter title…"}
          value={prefs.headerText || ""}
          onChange={(e) => {
            const v = e.target.value;
            setPrefs({ ...prefs, headerText: v });
          }}
          onBlur={(e) => handleSavePrefs({ ...prefs, headerText: e.target.value })}
          style={{
            width: "100%",
            padding: "11px 14px",
            borderRadius: 12,
            background: inputBg,
            border: `1px solid ${border}`,
            color: text,
            fontFamily: "inherit",
            fontSize: 13.5,
            letterSpacing: "-0.005em",
            outline: "none",
            transition: "all 140ms ease",
          }}
        />
      </Section>

      <Section title={ar ? "نص التذييل" : "Footer Text"} textDim={textDim} subtitle={ar ? "يظهر أسفل كل صفحة، بديل عن عدد الكلمات" : "Appears at the bottom of every page, replaces the word count"}>
        <input
          type="text"
          className="psm-input"
          placeholder={ar ? "نصّ مخصّص…" : "Custom text…"}
          value={prefs.footerText || ""}
          onChange={(e) => {
            const v = e.target.value;
            setPrefs({ ...prefs, footerText: v });
          }}
          onBlur={(e) => handleSavePrefs({ ...prefs, footerText: e.target.value })}
          style={{
            width: "100%",
            padding: "11px 14px",
            borderRadius: 12,
            background: inputBg,
            border: `1px solid ${border}`,
            color: text,
            fontFamily: "inherit",
            fontSize: 13.5,
            letterSpacing: "-0.005em",
            outline: "none",
            transition: "all 140ms ease",
          }}
        />
      </Section>

      <div
        style={{
          padding: "14px 16px",
          borderRadius: 14,
          background: inputBg,
          border: `1px solid ${border}`,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <div>
          <div
            style={{
              fontSize: 13.5,
              fontWeight: 600,
              letterSpacing: "-0.005em",
            }}
          >
            {ar ? "إظهار أرقام الصفحات" : "Show Page Numbers"}
          </div>
          <div style={{ fontSize: 11.5, color: textMute, marginTop: 2 }}>
            {ar
              ? "ستظهر أسفل كل صفحة بالشكل الذي تختاره."
              : "Render the page number at the bottom of every page."}
          </div>
        </div>
        <ToggleSwitch
          checked={prefs.showPageNumbers !== false}
          onChange={(v) => update("showPageNumbers", v)}
          accent={accent}
          inputBgStrong={isDark ? "rgba(255,255,255,0.15)" : "rgba(0,0,0,0.18)"}
        />
      </div>
    </div>
  );
}

// ─── Page Number tab ───────────────────────────────────────────────

function PageNumberTab({
  prefs,
  update,
  ar,
  text,
  textDim,
  textMute,
  inputBg,
  inputBgStrong,
  border,
  borderStrong,
  accent,
  isDark,
}: {
  prefs: BookPreferences;
  update: <K extends keyof BookPreferences>(k: K, v: BookPreferences[K]) => void;
  ar: boolean;
  text: string;
  textDim: string;
  textMute: string;
  inputBg: string;
  inputBgStrong: string;
  border: string;
  borderStrong: string;
  accent: string;
  isDark: boolean;
}) {
  if (prefs.showPageNumbers === false) {
    return (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          padding: "60px 20px",
          color: textMute,
          gap: 14,
          textAlign: "center",
        }}
      >
        <div
          style={{
            width: 48,
            height: 48,
            borderRadius: 14,
            background: inputBg,
            border: `1px solid ${border}`,
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Hash size={20} />
        </div>
        <div style={{ fontSize: 14, fontWeight: 600, color: textDim }}>
          {ar ? "أرقام الصفحات معطّلة" : "Page numbers are off"}
        </div>
        <div style={{ fontSize: 12.5, lineHeight: 1.55, maxWidth: 280 }}>
          {ar
            ? "فعّلها من تبويب الرأس والتذييل لتظهر هنا خيارات التنسيق."
            : "Enable them in Header & Footer to unlock the styling options."}
        </div>
      </div>
    );
  }

  const fmt = prefs.pageNumFormat || "dashes";
  const previewLabel =
    fmt === "plain"    ? "6" :
    fmt === "dots"     ? "· 6 ·" :
    fmt === "brackets" ? "[ 6 ]" :
    fmt === "word"     ? "Page 6" :
    fmt === "slash"    ? "6 / 12" :
    "— 6 —";

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 22 }}>
      {/* Live preview card */}
      <div
        style={{
          padding: "26px 18px",
          borderRadius: 16,
          background: inputBg,
          border: `1px solid ${border}`,
          textAlign: "center",
          position: "relative",
        }}
      >
        <div
          style={{
            position: "absolute",
            top: 10,
            insetInlineStart: 14,
            fontSize: 10,
            color: textMute,
            fontWeight: 600,
            letterSpacing: "0.06em",
            textTransform: "uppercase",
          }}
        >
          {ar ? "معاينة" : "Preview"}
        </div>
        <span
          style={{
            fontFamily: prefs.pageNumFont || "inherit",
            fontSize: `${(prefs.pageNumSize || 11) * 1.6}px`,
            color: prefs.pageNumColor || text,
            letterSpacing: "0.2em",
            fontWeight: prefs.pageNumBold ? 700 : 400,
            fontStyle: prefs.pageNumItalic ? "italic" : "normal",
            fontVariant: prefs.pageNumSmallCaps ? "small-caps" : "normal",
            opacity: prefs.pageNumOpacity ?? 0.55,
          }}
        >
          {previewLabel}
        </span>
      </div>

      {/* Format */}
      <Section title={ar ? "الصيغة" : "Format"} textDim={textDim}>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(3, 1fr)",
            gap: 8,
          }}
        >
          {[
            { v: "dashes",   label: "— 1 —" },
            { v: "dots",     label: "· 1 ·" },
            { v: "brackets", label: "[ 1 ]" },
            { v: "word",     label: "Page 1" },
            { v: "slash",    label: "1 / n" },
            { v: "plain",    label: "1" },
          ].map(({ v, label }) => {
            const active = fmt === v;
            return (
              <button
                key={v}
                onClick={() => update("pageNumFormat", v)}
                style={{
                  padding: "11px 8px",
                  borderRadius: 11,
                  background: active ? text : inputBg,
                  border: `1.5px solid ${active ? text : border}`,
                  color: active ? (isDark ? "#000" : "#fff") : textDim,
                  cursor: "pointer",
                  fontFamily: "inherit",
                  fontSize: 12,
                  fontWeight: 500,
                  fontVariantNumeric: "tabular-nums",
                  letterSpacing: "0.05em",
                  transition: "all 140ms ease",
                }}
              >
                {label}
              </button>
            );
          })}
        </div>
      </Section>

      {/* Position */}
      <Section title={ar ? "الموقع" : "Position"} textDim={textDim} subtitle={ar ? "خارجي: فردي يسار، زوجي يمين" : "Outer: odd pages on the leading edge, even on the trailing"}>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(4, 1fr)",
            gap: 8,
          }}
        >
          {[
            { v: "center", label: ar ? "وسط" : "Center", icon: <AlignCenter size={13} /> },
            { v: "left",   label: ar ? "يسار" : "Left",   icon: <AlignLeft size={13} /> },
            { v: "right",  label: ar ? "يمين" : "Right",  icon: <AlignRight size={13} /> },
            { v: "outer",  label: ar ? "خارجي" : "Outer", icon: <SquareIcon size={12} /> },
          ].map(({ v, label, icon }) => {
            const active = (prefs.pageNumPosition || "center") === v;
            return (
              <button
                key={v}
                onClick={() => update("pageNumPosition", v)}
                style={{
                  padding: "10px 6px",
                  borderRadius: 11,
                  background: active ? text : inputBg,
                  border: `1.5px solid ${active ? text : border}`,
                  color: active ? (isDark ? "#000" : "#fff") : textDim,
                  cursor: "pointer",
                  fontFamily: "inherit",
                  fontSize: 12,
                  fontWeight: 500,
                  letterSpacing: "-0.005em",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: 5,
                  transition: "all 140ms ease",
                }}
              >
                {icon}
                {label}
              </button>
            );
          })}
        </div>
      </Section>

      {/* Font */}
      <Section title={ar ? "الخط" : "Font"} textDim={textDim}>
        <div style={{ position: "relative" }}>
          <select
            value={prefs.pageNumFont || ""}
            onChange={(e) => update("pageNumFont", e.target.value || undefined)}
            className="psm-input"
            style={{
              width: "100%",
              padding: "11px 36px 11px 14px",
              borderRadius: 12,
              background: inputBg,
              border: `1px solid ${border}`,
              color: text,
              fontFamily: "inherit",
              fontSize: 13.5,
              letterSpacing: "-0.005em",
              outline: "none",
              appearance: "none",
              WebkitAppearance: "none",
              cursor: "pointer",
            }}
          >
            {FONT_OPTIONS.map((f) => (
              <option key={f.value} value={f.value}>
                {f.label}
              </option>
            ))}
          </select>
          <Minus
            size={14}
            style={{
              position: "absolute",
              insetInlineEnd: 12,
              top: "50%",
              transform: "translateY(-50%) rotate(90deg)",
              color: textMute,
              pointerEvents: "none",
            }}
          />
        </div>
      </Section>

      {/* Size + Opacity */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: 16,
        }}
      >
        <Slider
          label={ar ? "الحجم" : "Size"}
          value={prefs.pageNumSize || 11}
          min={7}
          max={22}
          step={1}
          suffix="px"
          onChange={(v) => update("pageNumSize", v)}
          text={text}
          textDim={textDim}
          textMute={textMute}
          inputBg={inputBg}
          accent={accent}
        />
        <Slider
          label={ar ? "الشفافية" : "Opacity"}
          value={Math.round((prefs.pageNumOpacity ?? 0.55) * 100)}
          min={10}
          max={100}
          step={5}
          suffix="%"
          onChange={(v) => update("pageNumOpacity", v / 100)}
          text={text}
          textDim={textDim}
          textMute={textMute}
          inputBg={inputBg}
          accent={accent}
        />
      </div>

      {/* Style toggles */}
      <Section title={ar ? "النمط" : "Style"} textDim={textDim}>
        <div style={{ display: "flex", gap: 8 }}>
          {(
            [
              { key: "pageNumBold",      label: "B",  title: ar ? "عريض" : "Bold",         fw: 700, fs: "normal" as const, fv: "normal" },
              { key: "pageNumItalic",    label: "I",  title: ar ? "مائل" : "Italic",       fw: 400, fs: "italic" as const, fv: "normal" },
              { key: "pageNumSmallCaps", label: "Aa", title: ar ? "كابيتال صغير" : "Small Caps", fw: 500, fs: "normal" as const, fv: "small-caps" },
            ] as const
          ).map(({ key, label, title, fw, fs, fv }) => {
            const active = !!(prefs as unknown as Record<string, boolean | undefined>)[key];
            return (
              <button
                key={key}
                title={title}
                onClick={() =>
                  update(
                    key as keyof BookPreferences,
                    !active as BookPreferences[keyof BookPreferences],
                  )
                }
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: 11,
                  background: active ? text : inputBg,
                  border: `1.5px solid ${active ? text : border}`,
                  color: active ? (isDark ? "#000" : "#fff") : textDim,
                  cursor: "pointer",
                  fontFamily: "inherit",
                  fontSize: 13,
                  fontWeight: fw,
                  fontStyle: fs,
                  fontVariant: fv,
                  letterSpacing: "0.02em",
                  transition: "all 140ms ease",
                }}
              >
                {label}
              </button>
            );
          })}
        </div>
      </Section>

      {/* Color */}
      <Section
        title={ar ? "اللون" : "Color"}
        textDim={textDim}
        right={
          prefs.pageNumColor ? (
            <button
              onClick={() => update("pageNumColor", undefined)}
              style={{
                fontSize: 11.5,
                color: textDim,
                background: "transparent",
                border: "none",
                cursor: "pointer",
                fontFamily: "inherit",
                fontWeight: 500,
              }}
            >
              {ar ? "إعادة تعيين" : "Reset"}
            </button>
          ) : null
        }
      >
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(7, 1fr)",
            gap: 8,
          }}
        >
          {PAGE_NUM_COLORS.map((c) => {
            const active = prefs.pageNumColor === c;
            return (
              <button
                key={c}
                onClick={() => update("pageNumColor", c)}
                title={c}
                style={{
                  position: "relative",
                  width: "100%",
                  aspectRatio: "1 / 1",
                  borderRadius: 10,
                  background: c,
                  border: `2px solid ${active ? accent : "transparent"}`,
                  cursor: "pointer",
                  outline: "none",
                  boxShadow:
                    c === "#ffffff"
                      ? `inset 0 0 0 1px ${borderStrong}`
                      : "none",
                  transition: "transform 100ms ease",
                }}
                onMouseEnter={(e) =>
                  ((e.currentTarget as HTMLButtonElement).style.transform = "scale(1.08)")
                }
                onMouseLeave={(e) =>
                  ((e.currentTarget as HTMLButtonElement).style.transform = "scale(1)")
                }
              >
                {active && (
                  <span
                    style={{
                      position: "absolute",
                      top: "50%",
                      left: "50%",
                      transform: "translate(-50%, -50%)",
                      color:
                        c === "#ffffff" || c === "#eab308" || c === "#a16207"
                          ? "#000"
                          : "#fff",
                    }}
                  >
                    <Check size={14} strokeWidth={3} />
                  </span>
                )}
              </button>
            );
          })}
        </div>
        <div
          style={{
            marginTop: 12,
            display: "flex",
            alignItems: "center",
            gap: 10,
          }}
        >
          <input
            type="color"
            value={prefs.pageNumColor || (isDark ? "#ffffff" : "#000000")}
            onChange={(e) => update("pageNumColor", e.target.value)}
            style={{
              width: 36,
              height: 36,
              borderRadius: 10,
              border: `1px solid ${border}`,
              padding: 2,
              background: "transparent",
              cursor: "pointer",
            }}
          />
          <div style={{ minWidth: 0 }}>
            <div
              style={{
                fontSize: 12,
                fontFamily:
                  "ui-monospace, SFMono-Regular, Menlo, Consolas, monospace",
                color: textDim,
              }}
            >
              {prefs.pageNumColor || (ar ? "تلقائي" : "Auto")}
            </div>
            <div style={{ fontSize: 11, color: textMute, marginTop: 1 }}>
              {ar ? "أو اختر لوناً مخصّصاً" : "Or pick a custom one"}
            </div>
          </div>
        </div>
      </Section>
    </div>
  );
}

// ─── Shared primitives ─────────────────────────────────────────────

function Section({
  title,
  subtitle,
  right,
  children,
  textDim,
}: {
  title: string;
  subtitle?: string;
  right?: React.ReactNode;
  children: React.ReactNode;
  textDim: string;
}) {
  return (
    <div>
      <div
        style={{
          display: "flex",
          alignItems: "baseline",
          justifyContent: "space-between",
          marginBottom: 10,
          gap: 12,
        }}
      >
        <div>
          <div
            style={{
              fontSize: 13,
              fontWeight: 700,
              letterSpacing: "-0.005em",
            }}
          >
            {title}
          </div>
          {subtitle && (
            <div
              style={{
                fontSize: 11.5,
                color: textDim,
                marginTop: 2,
                letterSpacing: "-0.005em",
              }}
            >
              {subtitle}
            </div>
          )}
        </div>
        {right}
      </div>
      {children}
    </div>
  );
}

function NumberInput({
  label,
  value,
  min,
  max,
  step,
  onChange,
  text,
  textDim,
  inputBg,
  border,
  borderStrong,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (v: number) => void;
  text: string;
  textDim: string;
  inputBg: string;
  border: string;
  borderStrong: string;
}) {
  return (
    <div>
      <div style={{ fontSize: 11.5, color: textDim, marginBottom: 6, fontWeight: 500 }}>
        {label}
      </div>
      <input
        type="number"
        className="psm-input"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        style={{
          width: "100%",
          padding: "10px 12px",
          borderRadius: 10,
          background: inputBg,
          border: `1px solid ${border}`,
          color: text,
          fontFamily: "inherit",
          fontSize: 13,
          fontVariantNumeric: "tabular-nums",
          outline: "none",
          transition: "all 140ms ease",
        }}
      />
    </div>
  );
}

function Slider({
  label,
  value,
  min,
  max,
  step,
  suffix,
  onChange,
  text,
  textDim,
  textMute,
  inputBg,
  accent,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  suffix?: string;
  onChange: (v: number) => void;
  text: string;
  textDim: string;
  textMute: string;
  inputBg: string;
  accent: string;
}) {
  return (
    <div
      style={{
        padding: "12px 14px",
        borderRadius: 12,
        background: inputBg,
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "baseline",
          marginBottom: 8,
        }}
      >
        <span style={{ fontSize: 12, fontWeight: 600, color: text, letterSpacing: "-0.005em" }}>
          {label}
        </span>
        <span
          style={{
            fontSize: 11.5,
            color: textDim,
            fontFamily:
              "ui-monospace, SFMono-Regular, Menlo, Consolas, monospace",
            fontVariantNumeric: "tabular-nums",
          }}
        >
          {value}
          {suffix}
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        style={{
          width: "100%",
          accentColor: accent,
          display: "block",
        }}
      />
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          marginTop: 4,
          fontSize: 10,
          color: textMute,
          fontFamily:
            "ui-monospace, SFMono-Regular, Menlo, Consolas, monospace",
          fontVariantNumeric: "tabular-nums",
        }}
      >
        <span>
          {min}
          {suffix}
        </span>
        <span>
          {max}
          {suffix}
        </span>
      </div>
    </div>
  );
}

function ToggleSwitch({
  checked,
  onChange,
  accent,
  inputBgStrong,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  accent: string;
  inputBgStrong: string;
}) {
  return (
    <button
      onClick={() => onChange(!checked)}
      role="switch"
      aria-checked={checked}
      style={{
        position: "relative",
        width: 44,
        height: 26,
        borderRadius: 999,
        background: checked ? accent : inputBgStrong,
        border: "none",
        cursor: "pointer",
        transition: "background 180ms ease",
        flexShrink: 0,
      }}
    >
      <span
        style={{
          position: "absolute",
          top: 3,
          left: checked ? "calc(100% - 23px)" : 3,
          width: 20,
          height: 20,
          borderRadius: "50%",
          background: "#fff",
          boxShadow: "0 1px 3px rgba(0,0,0,0.25), 0 1px 2px rgba(0,0,0,0.18)",
          transition: "left 180ms cubic-bezier(0.22, 1, 0.36, 1)",
        }}
      />
    </button>
  );
}
