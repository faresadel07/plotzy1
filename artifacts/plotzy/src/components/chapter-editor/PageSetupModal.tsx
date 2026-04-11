import { X, Pencil } from "lucide-react";
import type { BookPreferences } from "@/shared/schema";

const PAPER_SIZES: Record<string, { width: number; height: number; widthCm: number; heightCm: number; label: string; labelAr: string; icon: string }> = {
  "a5":     { width: 559,  height: 794,  widthCm: 14.8, heightCm: 21.0, label: "Classic Novel",       labelAr: "رواية كلاسيكية",  icon: "📖" },
  "pocket": { width: 416,  height: 680,  widthCm: 11.0, heightCm: 18.0, label: "Pocket Book",         labelAr: "كتاب جيب",        icon: "✋" },
  "trade":  { width: 576,  height: 864,  widthCm: 15.2, heightCm: 22.9, label: "Professional Trade",  labelAr: "تجاري احترافي",   icon: "📚" },
  "a4":     { width: 794,  height: 1123, widthCm: 21.0, heightCm: 29.7, label: "Standard A4",         labelAr: "A4 قياسي",        icon: "📄" },
};

const DEFAULT_MARGIN = 72;

interface PageSetupModalProps {
  prefs: BookPreferences;
  setPrefs: React.Dispatch<React.SetStateAction<BookPreferences>>;
  handleSavePrefs: (newPrefs: BookPreferences) => Promise<void>;
  isDark: boolean;
  ar: boolean;
  onClose: () => void;
}

export function PageSetupModal({
  prefs,
  setPrefs,
  handleSavePrefs,
  isDark,
  ar,
  onClose,
}: PageSetupModalProps) {
  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.55)", backdropFilter: "blur(6px)" }}>
      <div
        className="rounded-2xl shadow-2xl w-full animate-in fade-in zoom-in-95 duration-200 flex flex-col"
        style={{
          background: isDark ? "#1a1a1f" : "#ffffff",
          color: isDark ? "#e4e4e7" : "#18181b",
          border: `1px solid ${isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.08)"}`,
          maxWidth: 1160,
          maxHeight: "calc(100vh - 32px)",
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-3.5 border-b shrink-0" style={{ borderColor: isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.07)" }}>
          <h2 className="text-base font-semibold">{ar ? "إعداد الصفحة" : "Page Setup"}</h2>
          <button onClick={onClose} className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ border: "none", background: "transparent", cursor: "pointer", color: isDark ? "#a1a1aa" : "#71717a" }}>
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* 3-column body */}
        <div className="grid grid-cols-3 gap-0 flex-1 min-h-0">

          {/* Col 1: Paper + Margins */}
          <div className="p-6 space-y-5 overflow-y-auto" style={{ borderRight: `1px solid ${isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.07)"}` }}>
            <p className="text-[10px] font-bold uppercase tracking-widest opacity-40">{ar ? "الورق والهوامش" : "Paper & Margins"}</p>

            {/* Paper Size */}
            <div>
              <label className="block text-xs font-semibold mb-2 opacity-60 uppercase tracking-wider">{ar ? "حجم الصفحة" : "Page Size"}</label>

              {/* Dropdown */}
              <div className="relative mb-3">
                <select
                  value={prefs.paperSize || "trade"}
                  onChange={e => { const np = { ...prefs, paperSize: e.target.value }; setPrefs(np); handleSavePrefs(np); }}
                  className="w-full rounded-xl px-3 py-2.5 text-sm font-medium appearance-none cursor-pointer pr-8"
                  style={{
                    background: isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.05)",
                    border: `1px solid ${isDark ? "rgba(255,255,255,0.12)" : "rgba(0,0,0,0.1)"}`,
                    color: "inherit", outline: "none",
                  }}
                >
                  {Object.entries(PAPER_SIZES).map(([id, ps]) => (
                    <option key={id} value={id}>
                      {ps.icon} {ar ? ps.labelAr : ps.label} — {ps.widthCm} × {ps.heightCm} cm
                    </option>
                  ))}
                </select>
                <span className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 opacity-40 text-xs">&#9662;</span>
              </div>

              {/* Visual previews */}
              <div className="grid grid-cols-4 gap-2">
                {Object.entries(PAPER_SIZES).map(([id, ps]) => {
                  const active = (prefs.paperSize || "trade") === id;
                  const ratio = ps.widthCm / ps.heightCm;
                  const previewH = 52;
                  const previewW = Math.round(previewH * ratio);
                  return (
                    <button
                      key={id}
                      onClick={() => { const np = { ...prefs, paperSize: id }; setPrefs(np); handleSavePrefs(np); }}
                      className="flex flex-col items-center gap-1.5 py-2 rounded-xl transition-all"
                      style={{
                        background: active ? "hsl(var(--primary)/10%)" : (isDark ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.03)"),
                        border: `1.5px solid ${active ? "hsl(var(--primary))" : (isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.08)")}`,
                        cursor: "pointer",
                      }}
                      title={`${ps.widthCm} × ${ps.heightCm} cm`}
                    >
                      <div style={{
                        width: previewW, height: previewH,
                        background: isDark ? "rgba(255,255,255,0.12)" : "#fff",
                        border: `1px solid ${active ? "hsl(var(--primary)/60%)" : "rgba(0,0,0,0.15)"}`,
                        borderRadius: 2,
                        boxShadow: "0 1px 3px rgba(0,0,0,0.15)",
                        flexShrink: 0,
                      }} />
                      <span className="text-[9px] font-semibold leading-tight text-center opacity-70" style={{ color: active ? "hsl(var(--primary))" : undefined }}>
                        {ar ? ps.labelAr : ps.label}
                      </span>
                      <span className="text-[8px] opacity-40 leading-none">{ps.widthCm}x{ps.heightCm}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Margins */}
            <div>
              <label className="block text-xs font-semibold mb-2 opacity-60 uppercase tracking-wider">{ar ? "الهوامش (بكسل)" : "Margins (px)"}</label>
              <div className="grid grid-cols-2 gap-3">
                {(["marginTop", "marginBottom", "marginLeft", "marginRight"] as const).map(field => {
                  const labels: Record<string, { en: string; ar: string }> = {
                    marginTop: { en: "Top", ar: "أعلى" },
                    marginBottom: { en: "Bottom", ar: "أسفل" },
                    marginLeft: { en: "Left", ar: "يسار" },
                    marginRight: { en: "Right", ar: "يمين" },
                  };
                  return (
                    <div key={field}>
                      <label className="block text-[11px] opacity-50 mb-1">{ar ? labels[field].ar : labels[field].en}</label>
                      <input
                        type="number"
                        min={20} max={200} step={4}
                        value={prefs[field] ?? DEFAULT_MARGIN}
                        onChange={e => { const np = { ...prefs, [field]: Number(e.target.value) }; setPrefs(np); handleSavePrefs(np); }}
                        className="w-full rounded-lg px-3 py-1.5 text-sm"
                        style={{ background: isDark ? "rgba(255,255,255,0.07)" : "rgba(0,0,0,0.05)", border: `1px solid ${isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.1)"}`, color: "inherit", outline: "none" }}
                      />
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Col 2: Header / Footer / Page Numbers toggle */}
          <div className="p-6 space-y-5 overflow-y-auto" style={{ borderRight: `1px solid ${isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.07)"}` }}>
            <p className="text-[10px] font-bold uppercase tracking-widest opacity-40">{ar ? "الرأس والتذييل" : "Header & Footer"}</p>

            {/* Header Text */}
            <div>
              <label className="block text-xs font-semibold mb-2 opacity-60 uppercase tracking-wider">{ar ? "نص الرأس" : "Header Text"}</label>
              <input
                type="text"
                placeholder={ar ? "مثال: اسم الكتاب..." : "e.g. Book Title..."}
                value={prefs.headerText || ""}
                onChange={e => { const np = { ...prefs, headerText: e.target.value }; setPrefs(np); }}
                onBlur={e => handleSavePrefs({ ...prefs, headerText: e.target.value })}
                className="w-full rounded-lg px-3 py-2 text-sm"
                style={{ background: isDark ? "rgba(255,255,255,0.07)" : "rgba(0,0,0,0.05)", border: `1px solid ${isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.1)"}`, color: "inherit", outline: "none" }}
              />
            </div>

            {/* Footer Text */}
            <div>
              <label className="block text-xs font-semibold mb-2 opacity-60 uppercase tracking-wider">{ar ? "نص التذييل" : "Footer Text"}</label>
              <input
                type="text"
                placeholder={ar ? "يظهر بدلاً من عدد الكلمات..." : "Replaces word count display..."}
                value={prefs.footerText || ""}
                onChange={e => { const np = { ...prefs, footerText: e.target.value }; setPrefs(np); }}
                onBlur={e => handleSavePrefs({ ...prefs, footerText: e.target.value })}
                className="w-full rounded-lg px-3 py-2 text-sm"
                style={{ background: isDark ? "rgba(255,255,255,0.07)" : "rgba(0,0,0,0.05)", border: `1px solid ${isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.1)"}`, color: "inherit", outline: "none" }}
              />
            </div>

            {/* Show Page Numbers toggle */}
            <div className="flex items-center justify-between pt-1">
              <label className="text-sm font-medium">{ar ? "إظهار أرقام الصفحات" : "Show Page Numbers"}</label>
              <button
                onClick={() => { const np = { ...prefs, showPageNumbers: !(prefs.showPageNumbers !== false) }; setPrefs(np); handleSavePrefs(np); }}
                className="w-11 h-6 rounded-full transition-colors relative flex-shrink-0"
                style={{
                  background: (prefs.showPageNumbers !== false) ? "hsl(var(--primary))" : (isDark ? "rgba(255,255,255,0.15)" : "rgba(0,0,0,0.15)"),
                  border: "none", cursor: "pointer",
                }}
              >
                <span className="absolute top-0.5 rounded-full" style={{ width: 20, height: 20, background: "#fff", left: (prefs.showPageNumbers !== false) ? "calc(100% - 22px)" : 2, transition: "left 0.2s" }} />
              </button>
            </div>
          </div>

          {/* Col 3: Page Number Style */}
          <div className="p-6 space-y-4 overflow-y-auto">
            <p className="text-[10px] font-bold uppercase tracking-widest opacity-40">{ar ? "مظهر رقم الصفحة" : "Page Number Style"}</p>

            {(prefs.showPageNumbers !== false) ? (
              <>
                {/* Live preview */}
                {(() => {
                  const fmt = prefs.pageNumFormat || "dashes";
                  const previewLabel =
                    fmt === "plain"    ? "1" :
                    fmt === "dots"     ? "\u00B7 1 \u00B7" :
                    fmt === "brackets" ? "[ 1 ]" :
                    fmt === "word"     ? "Page 1" :
                    fmt === "slash"    ? "1 / 12" :
                    "\u2014 1 \u2014";
                  const pos = prefs.pageNumPosition || "center";
                  const justifyPreview = pos === "left" || pos === "outer" ? "flex-start" : pos === "right" ? "flex-end" : "center";
                  return (
                    <div className="rounded-xl px-4 py-3" style={{ background: isDark ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.03)", border: `1px solid ${isDark ? "rgba(255,255,255,0.07)" : "rgba(0,0,0,0.07)"}` }}>
                      <div style={{ display: "flex", justifyContent: justifyPreview }}>
                        <span style={{
                          fontFamily: prefs.pageNumFont || "inherit",
                          fontSize: `${prefs.pageNumSize || 11}px`,
                          color: prefs.pageNumColor || (isDark ? "rgba(255,255,255,0.55)" : "rgba(0,0,0,0.55)"),
                          letterSpacing: "0.2em",
                          fontWeight: prefs.pageNumBold ? 700 : 400,
                          fontStyle: prefs.pageNumItalic ? "italic" : "normal",
                          fontVariant: prefs.pageNumSmallCaps ? "small-caps" : "normal",
                          opacity: prefs.pageNumOpacity ?? 1,
                        }}>
                          {previewLabel}
                        </span>
                      </div>
                    </div>
                  );
                })()}

                {/* Format */}
                <div>
                  <label className="block text-xs font-semibold mb-2 opacity-60 uppercase tracking-wider">{ar ? "صيغة الرقم" : "Format"}</label>
                  <div className="grid grid-cols-3 gap-1.5">
                    {[
                      { v: "dashes",   label: "\u2014 1 \u2014" },
                      { v: "dots",     label: "\u00B7 1 \u00B7" },
                      { v: "plain",    label: "1" },
                      { v: "brackets", label: "[ 1 ]" },
                      { v: "word",     label: "Page 1" },
                      { v: "slash",    label: "1 / n" },
                    ].map(({ v, label }) => {
                      const active = (prefs.pageNumFormat || "dashes") === v;
                      return (
                        <button key={v} onClick={() => { const np = { ...prefs, pageNumFormat: v }; setPrefs(np); handleSavePrefs(np); }}
                          className="py-1.5 px-1 rounded-lg text-xs font-mono transition-all"
                          style={{
                            background: active ? "hsl(var(--primary))" : isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.05)",
                            border: `1px solid ${active ? "hsl(var(--primary))" : isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.1)"}`,
                            color: active ? "#fff" : "inherit",
                            cursor: "pointer",
                          }}>
                          {label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Position */}
                <div>
                  <label className="block text-xs font-semibold mb-2 opacity-60 uppercase tracking-wider">{ar ? "الموقع" : "Position"}</label>
                  <div className="grid grid-cols-2 gap-1.5">
                    {[
                      { v: "center", label: ar ? "وسط" : "Center", icon: "\u2299" },
                      { v: "left",   label: ar ? "يسار" : "Left",   icon: "\u22A2" },
                      { v: "right",  label: ar ? "يمين" : "Right",  icon: "\u22A3" },
                      { v: "outer",  label: ar ? "خارجي" : "Outer", icon: "\u22A3\u22A2" },
                    ].map(({ v, label, icon }) => {
                      const active = (prefs.pageNumPosition || "center") === v;
                      return (
                        <button key={v} onClick={() => { const np = { ...prefs, pageNumPosition: v }; setPrefs(np); handleSavePrefs(np); }}
                          className="flex items-center gap-1.5 py-1.5 px-2 rounded-lg text-xs transition-all"
                          style={{
                            background: active ? "hsl(var(--primary))" : isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.05)",
                            border: `1px solid ${active ? "hsl(var(--primary))" : isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.1)"}`,
                            color: active ? "#fff" : "inherit",
                            cursor: "pointer",
                          }}>
                          <span className="font-mono text-[10px] opacity-60">{icon}</span>
                          <span>{label}</span>
                        </button>
                      );
                    })}
                  </div>
                  <p className="text-[10px] opacity-30 mt-1">{ar ? "الخارجي: فردي يسار، زوجي يمين (كالكتب الحقيقية)" : "Outer: odd pages left, even right — book-style"}</p>
                </div>

                {/* Font */}
                <div>
                  <label className="block text-xs font-semibold mb-1.5 opacity-60 uppercase tracking-wider">{ar ? "الخط" : "Font"}</label>
                  <select
                    value={prefs.pageNumFont || ""}
                    onChange={e => { const np = { ...prefs, pageNumFont: e.target.value || undefined }; setPrefs(np); handleSavePrefs(np); }}
                    className="w-full rounded-lg px-3 py-1.5 text-sm"
                    style={{ background: isDark ? "rgba(255,255,255,0.07)" : "rgba(0,0,0,0.05)", border: `1px solid ${isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.1)"}`, color: "inherit", outline: "none" }}
                  >
                    <option value="">{ar ? "مثل نص الكتاب" : "Same as body"}</option>
                    <option value="'EB Garamond', serif">EB Garamond</option>
                    <option value="'Playfair Display', serif">Playfair Display</option>
                    <option value="'Lora', serif">Lora</option>
                    <option value="'Merriweather', serif">Merriweather</option>
                    <option value="'Cormorant Garamond', serif">Cormorant Garamond</option>
                    <option value="Georgia, serif">Georgia</option>
                    <option value="'Times New Roman', serif">Times New Roman</option>
                    <option value="Arial, sans-serif">Arial</option>
                    <option value="'Courier New', monospace">Courier New</option>
                  </select>
                </div>

                {/* Size + Opacity row */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-xs font-semibold opacity-60 uppercase tracking-wider">{ar ? "الحجم" : "Size"}</label>
                      <span className="text-[10px] font-mono opacity-40">{prefs.pageNumSize || 11}px</span>
                    </div>
                    <input type="range" min={7} max={22} step={1}
                      value={prefs.pageNumSize || 11}
                      onChange={e => { const np = { ...prefs, pageNumSize: Number(e.target.value) }; setPrefs(np); handleSavePrefs(np); }}
                      className="w-full" style={{ accentColor: "hsl(var(--primary))" }} />
                    <div className="flex justify-between text-[9px] opacity-25 mt-0.5"><span>7</span><span>22</span></div>
                  </div>
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-xs font-semibold opacity-60 uppercase tracking-wider">{ar ? "الشفافية" : "Opacity"}</label>
                      <span className="text-[10px] font-mono opacity-40">{Math.round((prefs.pageNumOpacity ?? 0.55) * 100)}%</span>
                    </div>
                    <input type="range" min={10} max={100} step={5}
                      value={Math.round((prefs.pageNumOpacity ?? 0.55) * 100)}
                      onChange={e => { const np = { ...prefs, pageNumOpacity: Number(e.target.value) / 100 }; setPrefs(np); handleSavePrefs(np); }}
                      className="w-full" style={{ accentColor: "hsl(var(--primary))" }} />
                    <div className="flex justify-between text-[9px] opacity-25 mt-0.5"><span>10%</span><span>100%</span></div>
                  </div>
                </div>

                {/* Style toggles */}
                <div>
                  <label className="block text-xs font-semibold mb-2 opacity-60 uppercase tracking-wider">{ar ? "النمط" : "Style"}</label>
                  <div className="flex gap-2">
                    {[
                      { key: "pageNumBold",      label: "B",  title: ar ? "عريض" : "Bold",        style: { fontWeight: 700 } },
                      { key: "pageNumItalic",    label: "I",  title: ar ? "مائل" : "Italic",       style: { fontStyle: "italic" } },
                      { key: "pageNumSmallCaps", label: "SC", title: ar ? "كابيتال صغير" : "Small Caps", style: { fontVariant: "small-caps", fontSize: 10 } },
                    ].map(({ key, label, title, style: btnStyle }) => {
                      const active = !!(prefs as any)[key];
                      return (
                        <button key={key}
                          title={title}
                          onClick={() => { const np = { ...prefs, [key]: !active }; setPrefs(np); handleSavePrefs(np); }}
                          className="w-9 h-9 rounded-lg flex items-center justify-center text-xs transition-all"
                          style={{
                            ...(btnStyle as any),
                            background: active ? "hsl(var(--primary))" : isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.06)",
                            border: `1.5px solid ${active ? "hsl(var(--primary))" : isDark ? "rgba(255,255,255,0.12)" : "rgba(0,0,0,0.1)"}`,
                            color: active ? "#fff" : "inherit",
                            cursor: "pointer",
                          }}>
                          {label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Color */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-xs font-semibold opacity-60 uppercase tracking-wider">{ar ? "اللون" : "Color"}</label>
                    {prefs.pageNumColor && (
                      <button onClick={() => { const np = { ...prefs, pageNumColor: undefined }; setPrefs(np); handleSavePrefs(np); }}
                        className="text-[10px] opacity-40 hover:opacity-70 transition-opacity"
                        style={{ background: "none", border: "none", cursor: "pointer", color: "inherit" }}>
                        {ar ? "إعادة تعيين" : "Reset"}
                      </button>
                    )}
                  </div>
                  <div className="flex items-center gap-2 mb-2">
                    <input type="color"
                      value={prefs.pageNumColor || (isDark ? "#ffffff" : "#000000")}
                      onChange={e => { const np = { ...prefs, pageNumColor: e.target.value }; setPrefs(np); handleSavePrefs(np); }}
                      style={{ width: 34, height: 34, borderRadius: 8, border: `1px solid ${isDark ? "rgba(255,255,255,0.15)" : "rgba(0,0,0,0.15)"}`, padding: 2, background: "transparent", cursor: "pointer" }}
                    />
                    <span className="text-xs opacity-40 font-mono">{prefs.pageNumColor || (ar ? "تلقائي" : "auto")}</span>
                  </div>
                  {/* Color swatches */}
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(26px, 1fr))", gap: 6 }}>
                    {[
                      "#000000", "#1a1a1a", "#333333", "#555555", "#777777", "#999999", "#bbbbbb", "#dddddd", "#ffffff",
                      "#8b0000", "#c62828", "#e53935", "#ef9a9a",
                      "#1a237e", "#283593", "#3949ab", "#9fa8da",
                      "#1b5e20", "#2e7d32", "#43a047", "#a5d6a7",
                      "#4a148c", "#6a1b9a", "#8e24aa", "#ce93d8",
                      "#e65100", "#ef6c00", "#f57c00", "#ffcc02",
                      "#006064", "#00838f", "#00acc1", "#80deea",
                      "#795548", "#a1887f", "#bf360c", "#6d4c41",
                    ].map(c => (
                      <button key={c} onClick={() => { const np = { ...prefs, pageNumColor: c }; setPrefs(np); handleSavePrefs(np); }}
                        title={c}
                        style={{
                          width: 26, height: 26, borderRadius: 7, background: c,
                          border: `2.5px solid ${prefs.pageNumColor === c ? "hsl(var(--primary))" : "transparent"}`,
                          cursor: "pointer", outline: "none",
                          boxShadow: c === "#ffffff" ? `inset 0 0 0 1px ${isDark ? "rgba(255,255,255,0.2)" : "rgba(0,0,0,0.2)"}` : "none",
                          transition: "transform 0.1s",
                        }}
                        onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.transform = "scale(1.2)"; }}
                        onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.transform = "scale(1)"; }}
                      />
                    ))}
                  </div>
                </div>
              </>
            ) : (
              <div className="flex flex-col items-center justify-center h-40 opacity-30 gap-2">
                <span className="text-3xl">&mdash;</span>
                <p className="text-xs text-center">{ar ? "فعّل أرقام الصفحات من العمود الأوسط" : "Enable page numbers in the middle column"}</p>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 pb-4 pt-3.5 border-t flex justify-end shrink-0" style={{ borderColor: isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.07)" }}>
          <button
            onClick={onClose}
            className="px-8 py-2.5 rounded-xl text-sm font-semibold transition-all hover:opacity-90"
            style={{ background: "hsl(var(--primary))", color: "#fff", border: "none", cursor: "pointer" }}
          >
            {ar ? "تم" : "Done"}
          </button>
        </div>
      </div>
    </div>
  );
}
