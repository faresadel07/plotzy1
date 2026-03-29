import { useState, useRef, useEffect } from "react";
import type { Editor } from "@tiptap/react";
import {
  Bold, Italic, Underline as UnderlineIcon, Strikethrough,
  AlignLeft, AlignCenter, AlignRight, AlignJustify,
  List, ListOrdered, Link as LinkIcon,
  Minus, Plus, Undo2, Redo2, ChevronDown,
  Highlighter, Printer, Indent, Outdent, Quote,
} from "lucide-react";

// ─── Helpers ────────────────────────────────────────────────────────────────

function Sep() {
  return <div className="w-px h-5 bg-black/10 mx-0.5 flex-shrink-0" />;
}

const FONT_OPTIONS = [
  { id: "eb-garamond",       label: "EB Garamond",       fontFamily: "'EB Garamond', serif" },
  { id: "cormorant",         label: "Cormorant Garamond", fontFamily: "'Cormorant Garamond', serif" },
  { id: "playfair",          label: "Playfair Display",   fontFamily: "'Playfair Display', serif" },
  { id: "lora",              label: "Lora",               fontFamily: "'Lora', serif" },
  { id: "crimson",           label: "Crimson Text",       fontFamily: "'Crimson Text', serif" },
  { id: "merriweather",      label: "Merriweather",       fontFamily: "'Merriweather', serif" },
  { id: "libre-baskerville", label: "Libre Baskerville",  fontFamily: "'Libre Baskerville', serif" },
  { id: "source-serif",      label: "Source Serif 4",     fontFamily: "'Source Serif 4', serif" },
  { id: "inter",             label: "Inter",              fontFamily: "'Inter', sans-serif" },
  { id: "open-sans",         label: "Open Sans",          fontFamily: "'Open Sans', sans-serif" },
  { id: "poppins",           label: "Poppins",            fontFamily: "'Poppins', sans-serif" },
  { id: "montserrat",        label: "Montserrat",         fontFamily: "'Montserrat', sans-serif" },
  { id: "courier-prime",     label: "Courier Prime",      fontFamily: "'Courier Prime', monospace" },
  { id: "special-elite",     label: "Special Elite",      fontFamily: "'Special Elite', cursive" },
  { id: "arabic-sans",       label: "Cairo",              fontFamily: "'Cairo', sans-serif" },
  { id: "arabic-serif",      label: "Amiri",              fontFamily: "'Amiri', serif" },
  { id: "arabic-naskh",      label: "Noto Naskh Arabic",  fontFamily: "'Noto Naskh Arabic', serif" },
];

const TEXT_STYLES = [
  { label: "Normal text",  value: "paragraph" },
  { label: "Title",        value: "title" },
  { label: "Heading 1",    value: "h1" },
  { label: "Heading 2",    value: "h2" },
  { label: "Heading 3",    value: "h3" },
  { label: "Blockquote",   value: "blockquote" },
];

const FONT_SIZES = [8, 9, 10, 11, 12, 14, 16, 18, 20, 22, 24, 26, 28, 32, 36, 42, 48, 60, 72];

// ─── Props ───────────────────────────────────────────────────────────────────

interface RichWritingToolbarProps {
  editor: Editor | null;
  zoom: number;
  onZoomChange: (z: number) => void;
  onPrint?: () => void;
  isFocusMode?: boolean;
  isDark?: boolean;
}

// ─── Component ───────────────────────────────────────────────────────────────

export function RichWritingToolbar({
  editor,
  zoom,
  onZoomChange,
  onPrint,
  isFocusMode = false,
  isDark = false,
}: RichWritingToolbarProps) {
  // Force re-render on every editor transaction so active states update in real-time
  const [, forceUpdate] = useState(0);
  useEffect(() => {
    if (!editor) return;
    const handler = () => forceUpdate(n => n + 1);
    editor.on("transaction", handler);
    return () => { editor.off("transaction", handler); };
  }, [editor]);

  const [styleDropOpen, setStyleDropOpen] = useState(false);
  const [fontDropOpen, setFontDropOpen] = useState(false);
  const [sizeInput, setSizeInput] = useState<string | null>(null);
  const [linkDialogOpen, setLinkDialogOpen] = useState(false);
  const [linkUrl, setLinkUrl] = useState("");
  const sizeInputRef = useRef<HTMLInputElement>(null);

  const toolbarBg = isFocusMode
    ? "rgba(18,18,22,0.97)"
    : isDark
      ? "rgba(26,26,31,0.97)"
      : "rgba(255,255,255,0.98)";
  const fg  = isDark || isFocusMode ? "#d4d4d8" : "#3f3f46";
  const fgStrong = isDark || isFocusMode ? "#ffffff" : "#111111";
  const dividerColor = isDark || isFocusMode ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.1)";
  const hoverBg = isDark || isFocusMode ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.06)";
  const activeBg = isDark || isFocusMode ? "rgba(255,255,255,0.16)" : "rgba(0,0,0,0.10)";
  const dropBg = isDark || isFocusMode ? "#1c1c24" : "#ffffff";
  const dropBorder = isDark || isFocusMode ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.1)";

  // ── Current state queries ──
  const currentFontId = (editor?.getAttributes("textStyle")?.fontFamily || "")
    .replace(/['"]/g, "")
    .split(",")[0]
    .trim()
    .toLowerCase()
    .replace(/ /g, "-") || "eb-garamond";

  const currentFontObj = FONT_OPTIONS.find(f =>
    f.fontFamily.toLowerCase().includes(currentFontId.toLowerCase())
  ) || FONT_OPTIONS[0];

  const rawSize = editor?.getAttributes("textStyle")?.fontSize;
  const currentSize: number = rawSize ? Number(rawSize) : 18;

  const getActiveStyle = (): string => {
    if (!editor) return "Normal text";
    if (editor.isActive("heading", { level: 1 })) return "Heading 1";
    if (editor.isActive("heading", { level: 2 })) return "Heading 2";
    if (editor.isActive("heading", { level: 3 })) return "Heading 3";
    if (editor.isActive("blockquote"))            return "Blockquote";
    return "Normal text";
  };

  const applyTextStyle = (value: string) => {
    if (!editor) return;
    setStyleDropOpen(false);
    if (value === "paragraph" || value === "title") {
      editor.chain().focus().setParagraph().run();
      if (value === "title") editor.chain().focus().setMark("textStyle", { fontSize: 28 }).toggleBold().run();
    } else if (value === "h1") editor.chain().focus().toggleHeading({ level: 1 }).run();
    else if (value === "h2") editor.chain().focus().toggleHeading({ level: 2 }).run();
    else if (value === "h3") editor.chain().focus().toggleHeading({ level: 3 }).run();
    else if (value === "blockquote") editor.chain().focus().toggleBlockquote().run();
  };

  const applyFont = (font: typeof FONT_OPTIONS[number]) => {
    editor?.chain().focus().setFontFamily(font.fontFamily).run();
    setFontDropOpen(false);
  };

  const setSize = (size: number) => {
    const clamped = Math.max(8, Math.min(96, size));
    (editor?.chain().focus() as any).setFontSize(clamped).run();
  };

  const changeSize = (delta: number) => {
    const idx = FONT_SIZES.indexOf(currentSize);
    const next = idx === -1
      ? (delta > 0 ? currentSize + 1 : currentSize - 1)
      : FONT_SIZES[Math.max(0, Math.min(FONT_SIZES.length - 1, idx + delta))];
    setSize(next);
  };

  const applyLink = () => {
    setLinkDialogOpen(false);
    if (!linkUrl.trim()) {
      editor?.chain().focus().unsetLink().run();
    } else {
      const href = linkUrl.startsWith("http") ? linkUrl : `https://${linkUrl}`;
      editor?.chain().focus().setLink({ href }).run();
    }
    setLinkUrl("");
  };

  const btn = (active?: boolean): React.CSSProperties => ({
    display: "flex", alignItems: "center", justifyContent: "center",
    width: 28, height: 26, borderRadius: 4, border: "none", cursor: "pointer",
    background: active ? activeBg : "transparent",
    color: active ? fgStrong : fg,
    flexShrink: 0, transition: "background 0.1s",
  });

  const dropItemStyle: React.CSSProperties = {
    width: "100%", padding: "6px 12px", textAlign: "left", border: "none",
    background: "transparent", color: fg, cursor: "pointer", fontSize: 13,
    display: "block", transition: "background 0.1s",
  };

  return (
    <>
      <div
        className="sticky top-12 z-40 border-b flex-shrink-0 transition-all duration-500"
        style={{
          background: toolbarBg,
          borderColor: dividerColor,
          backdropFilter: "blur(12px)",
          opacity: isFocusMode ? 0.08 : 1,
        }}
        onMouseDown={e => e.preventDefault()}
        onMouseEnter={e => { if (isFocusMode) (e.currentTarget as HTMLDivElement).style.opacity = "1"; }}
        onMouseLeave={e => { if (isFocusMode) (e.currentTarget as HTMLDivElement).style.opacity = "0.08"; }}
      >
        <div
          className="h-10 px-2 flex items-center gap-0.5 overflow-x-auto"
          style={{ scrollbarWidth: "none", color: fg }}
          dir="ltr"
        >

          {/* ── Undo / Redo ── */}
          <button onClick={() => editor?.chain().focus().undo().run()} style={btn()} title="Undo (Ctrl+Z)"
            onMouseEnter={e => (e.currentTarget.style.background = hoverBg)}
            onMouseLeave={e => (e.currentTarget.style.background = "transparent")}>
            <Undo2 className="w-3.5 h-3.5" />
          </button>
          <button onClick={() => editor?.chain().focus().redo().run()} style={btn()} title="Redo (Ctrl+Y)"
            onMouseEnter={e => (e.currentTarget.style.background = hoverBg)}
            onMouseLeave={e => (e.currentTarget.style.background = "transparent")}>
            <Redo2 className="w-3.5 h-3.5" />
          </button>

          {/* ── Print ── */}
          {onPrint && (
            <button onClick={onPrint} style={btn()} title="Print"
              onMouseEnter={e => (e.currentTarget.style.background = hoverBg)}
              onMouseLeave={e => (e.currentTarget.style.background = "transparent")}>
              <Printer className="w-3.5 h-3.5" />
            </button>
          )}

          <Sep />

          {/* ── Zoom ── */}
          <div className="flex items-center gap-0.5 flex-shrink-0">
            <button onClick={() => onZoomChange(Math.max(50, zoom - 10))} style={btn()} title="Zoom out"
              onMouseEnter={e => (e.currentTarget.style.background = hoverBg)}
              onMouseLeave={e => (e.currentTarget.style.background = "transparent")}>
              <Minus className="w-3 h-3" />
            </button>
            <span
              className="text-xs tabular-nums w-10 text-center font-medium select-none"
              style={{ color: fg, cursor: "default" }}
            >
              {zoom}%
            </span>
            <button onClick={() => onZoomChange(Math.min(200, zoom + 10))} style={btn()} title="Zoom in"
              onMouseEnter={e => (e.currentTarget.style.background = hoverBg)}
              onMouseLeave={e => (e.currentTarget.style.background = "transparent")}>
              <Plus className="w-3 h-3" />
            </button>
          </div>

          <Sep />

          {/* ── Text Style ── */}
          <div className="relative flex-shrink-0">
            <button
              onClick={() => { setStyleDropOpen(v => !v); setFontDropOpen(false); }}
              className="flex items-center gap-1 px-2 h-7 rounded text-xs font-medium whitespace-nowrap"
              style={{ background: styleDropOpen ? activeBg : "transparent", color: fg, border: "none", cursor: "pointer", minWidth: 100 }}
              onMouseEnter={e => (e.currentTarget.style.background = styleDropOpen ? activeBg : hoverBg)}
              onMouseLeave={e => (e.currentTarget.style.background = styleDropOpen ? activeBg : "transparent")}
            >
              <span style={{ flex: 1 }}>{getActiveStyle()}</span>
              <ChevronDown className="w-3 h-3 opacity-50 flex-shrink-0" />
            </button>
            {styleDropOpen && (
              <div className="absolute top-full left-0 mt-1 rounded-xl shadow-2xl z-50 overflow-hidden"
                style={{ minWidth: 180, background: dropBg, border: `1px solid ${dropBorder}` }}>
                {TEXT_STYLES.map(s => (
                  <button
                    key={s.value}
                    onClick={() => applyTextStyle(s.value)}
                    style={{
                      ...dropItemStyle,
                      fontWeight: s.value.startsWith("h") || s.value === "title" ? 700 : 400,
                      fontSize: s.value === "h1" ? 20 : s.value === "h2" ? 16 : s.value === "title" ? 22 : 13,
                      color: isDark || isFocusMode ? "#e4e4e7" : "#18181b",
                    }}
                    onMouseEnter={e => (e.currentTarget.style.background = hoverBg)}
                    onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            )}
          </div>

          <Sep />

          {/* ── Font Family ── */}
          <div className="relative flex-shrink-0">
            <button
              onClick={() => { setFontDropOpen(v => !v); setStyleDropOpen(false); }}
              className="flex items-center gap-1 px-2 h-7 rounded text-xs font-medium"
              style={{ background: fontDropOpen ? activeBg : "transparent", color: fg, border: "none", cursor: "pointer", maxWidth: 140, minWidth: 110 }}
              onMouseEnter={e => (e.currentTarget.style.background = fontDropOpen ? activeBg : hoverBg)}
              onMouseLeave={e => (e.currentTarget.style.background = fontDropOpen ? activeBg : "transparent")}
            >
              <span className="truncate" style={{ fontFamily: currentFontObj.fontFamily, flex: 1 }}>
                {currentFontObj.label}
              </span>
              <ChevronDown className="w-3 h-3 opacity-50 flex-shrink-0" />
            </button>
            {fontDropOpen && (
              <div className="absolute top-full left-0 mt-1 rounded-xl shadow-2xl z-50 overflow-y-auto"
                style={{ width: 200, maxHeight: 320, background: dropBg, border: `1px solid ${dropBorder}` }}>
                {FONT_OPTIONS.map(f => (
                  <button key={f.id} onClick={() => applyFont(f)}
                    style={{
                      ...dropItemStyle,
                      fontFamily: f.fontFamily,
                      color: isDark || isFocusMode ? "#e4e4e7" : "#18181b",
                      background: f.id === currentFontObj.id ? (isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.05)") : "transparent",
                    }}
                    onMouseEnter={e => (e.currentTarget.style.background = hoverBg)}
                    onMouseLeave={e => (e.currentTarget.style.background = f.id === currentFontObj.id ? (isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.05)") : "transparent")}
                  >
                    {f.label}
                  </button>
                ))}
              </div>
            )}
          </div>

          <Sep />

          {/* ── Font Size ── */}
          <div className="flex items-center gap-0.5 flex-shrink-0">
            <button onClick={() => changeSize(-1)} style={btn()} title="Decrease size"
              onMouseEnter={e => (e.currentTarget.style.background = hoverBg)}
              onMouseLeave={e => (e.currentTarget.style.background = "transparent")}>
              <Minus className="w-3 h-3" />
            </button>
            {sizeInput !== null ? (
              <input
                ref={sizeInputRef}
                type="number" value={sizeInput} min={8} max={96}
                onChange={e => setSizeInput(e.target.value)}
                onBlur={() => { if (sizeInput) setSize(Number(sizeInput)); setSizeInput(null); }}
                onKeyDown={e => { if (e.key === "Enter") { if (sizeInput) setSize(Number(sizeInput)); setSizeInput(null); } if (e.key === "Escape") setSizeInput(null); }}
                className="w-9 text-center text-xs tabular-nums rounded border outline-none"
                style={{ height: 22, background: dropBg, color: fgStrong, borderColor: dividerColor, padding: "0 2px" }}
              />
            ) : (
              <span
                className="w-9 text-center text-xs tabular-nums font-medium cursor-text select-none rounded"
                style={{ color: fg, height: 22, lineHeight: "22px", display: "block" }}
                onClick={() => { setSizeInput(String(currentSize)); setTimeout(() => sizeInputRef.current?.select(), 10); }}
              >
                {currentSize}
              </span>
            )}
            <button onClick={() => changeSize(1)} style={btn()} title="Increase size"
              onMouseEnter={e => (e.currentTarget.style.background = hoverBg)}
              onMouseLeave={e => (e.currentTarget.style.background = "transparent")}>
              <Plus className="w-3 h-3" />
            </button>
          </div>

          <Sep />

          {/* ── Bold / Italic / Underline / Strike ── */}
          <button onClick={() => editor?.chain().focus().toggleBold().run()}
            style={btn(editor?.isActive("bold"))} title="Bold (Ctrl+B)"
            onMouseEnter={e => (e.currentTarget.style.background = editor?.isActive("bold") ? activeBg : hoverBg)}
            onMouseLeave={e => (e.currentTarget.style.background = editor?.isActive("bold") ? activeBg : "transparent")}>
            <Bold className="w-3.5 h-3.5" />
          </button>
          <button onClick={() => editor?.chain().focus().toggleItalic().run()}
            style={btn(editor?.isActive("italic"))} title="Italic (Ctrl+I)"
            onMouseEnter={e => (e.currentTarget.style.background = editor?.isActive("italic") ? activeBg : hoverBg)}
            onMouseLeave={e => (e.currentTarget.style.background = editor?.isActive("italic") ? activeBg : "transparent")}>
            <Italic className="w-3.5 h-3.5" />
          </button>
          <button onClick={() => editor?.chain().focus().toggleUnderline().run()}
            style={btn(editor?.isActive("underline"))} title="Underline (Ctrl+U)"
            onMouseEnter={e => (e.currentTarget.style.background = editor?.isActive("underline") ? activeBg : hoverBg)}
            onMouseLeave={e => (e.currentTarget.style.background = editor?.isActive("underline") ? activeBg : "transparent")}>
            <UnderlineIcon className="w-3.5 h-3.5" />
          </button>
          <button onClick={() => editor?.chain().focus().toggleStrike().run()}
            style={btn(editor?.isActive("strike"))} title="Strikethrough"
            onMouseEnter={e => (e.currentTarget.style.background = editor?.isActive("strike") ? activeBg : hoverBg)}
            onMouseLeave={e => (e.currentTarget.style.background = editor?.isActive("strike") ? activeBg : "transparent")}>
            <Strikethrough className="w-3.5 h-3.5" />
          </button>

          <Sep />

          {/* ── Text Color ── */}
          <div className="relative flex-shrink-0" title="Text Color">
            <button className="flex flex-col items-center justify-center w-7 h-7 rounded gap-[2px]"
              style={{ border: "none", cursor: "pointer", background: "transparent" }}
              onClick={() => document.getElementById("rich-text-color")?.click()}
              onMouseEnter={e => (e.currentTarget.style.background = hoverBg)}
              onMouseLeave={e => (e.currentTarget.style.background = "transparent")}>
              <span className="text-xs font-bold leading-none" style={{ color: fg }}>A</span>
              <div className="w-4 h-1 rounded-sm" style={{ background: editor?.getAttributes("textStyle")?.color || fgStrong }} />
            </button>
            <input id="rich-text-color" type="color"
              defaultValue="#111111"
              onChange={e => editor?.chain().focus().setColor(e.target.value).run()}
              style={{ position: "absolute", opacity: 0, width: 1, height: 1, pointerEvents: "none" }}
            />
          </div>

          {/* ── Highlight ── */}
          <div className="relative flex-shrink-0" title="Highlight">
            <button className="flex flex-col items-center justify-center w-7 h-7 rounded gap-[2px]"
              style={{ border: "none", cursor: "pointer", background: editor?.isActive("highlight") ? activeBg : "transparent" }}
              onClick={() => document.getElementById("rich-highlight-color")?.click()}
              onMouseEnter={e => (e.currentTarget.style.background = hoverBg)}
              onMouseLeave={e => (e.currentTarget.style.background = editor?.isActive("highlight") ? activeBg : "transparent")}>
              <Highlighter className="w-3 h-3" style={{ color: fg }} />
              <div className="w-4 h-1 rounded-sm" style={{ background: "#fef08a" }} />
            </button>
            <input id="rich-highlight-color" type="color"
              defaultValue="#fef08a"
              onChange={e => editor?.chain().focus().setHighlight({ color: e.target.value }).run()}
              style={{ position: "absolute", opacity: 0, width: 1, height: 1, pointerEvents: "none" }}
            />
          </div>

          <Sep />

          {/* ── Link ── */}
          <button
            onClick={() => {
              const existing = editor?.getAttributes("link")?.href || "";
              setLinkUrl(existing);
              setLinkDialogOpen(true);
            }}
            style={btn(editor?.isActive("link"))} title="Insert link (Ctrl+K)"
            onMouseEnter={e => (e.currentTarget.style.background = editor?.isActive("link") ? activeBg : hoverBg)}
            onMouseLeave={e => (e.currentTarget.style.background = editor?.isActive("link") ? activeBg : "transparent")}>
            <LinkIcon className="w-3.5 h-3.5" />
          </button>

          <Sep />

          {/* ── Alignment ── */}
          {(["left","center","right","justify"] as const).map(a => {
            const Icon = a === "left" ? AlignLeft : a === "center" ? AlignCenter : a === "right" ? AlignRight : AlignJustify;
            const labels = { left: "Left", center: "Center", right: "Right", justify: "Justify" };
            return (
              <button key={a} onClick={() => editor?.chain().focus().setTextAlign(a).run()}
                style={btn(editor?.isActive({ textAlign: a }))} title={labels[a]}
                onMouseEnter={e => (e.currentTarget.style.background = editor?.isActive({ textAlign: a }) ? activeBg : hoverBg)}
                onMouseLeave={e => (e.currentTarget.style.background = editor?.isActive({ textAlign: a }) ? activeBg : "transparent")}>
                <Icon className="w-3.5 h-3.5" />
              </button>
            );
          })}

          <Sep />

          {/* ── Lists ── */}
          <button onClick={() => editor?.chain().focus().toggleBulletList().run()}
            style={btn(editor?.isActive("bulletList"))} title="Bulleted list"
            onMouseEnter={e => (e.currentTarget.style.background = editor?.isActive("bulletList") ? activeBg : hoverBg)}
            onMouseLeave={e => (e.currentTarget.style.background = editor?.isActive("bulletList") ? activeBg : "transparent")}>
            <List className="w-3.5 h-3.5" />
          </button>
          <button onClick={() => editor?.chain().focus().toggleOrderedList().run()}
            style={btn(editor?.isActive("orderedList"))} title="Numbered list"
            onMouseEnter={e => (e.currentTarget.style.background = editor?.isActive("orderedList") ? activeBg : hoverBg)}
            onMouseLeave={e => (e.currentTarget.style.background = editor?.isActive("orderedList") ? activeBg : "transparent")}>
            <ListOrdered className="w-3.5 h-3.5" />
          </button>

          <Sep />

          {/* ── Blockquote ── */}
          <button onClick={() => editor?.chain().focus().toggleBlockquote().run()}
            style={btn(editor?.isActive("blockquote"))} title="Blockquote"
            onMouseEnter={e => (e.currentTarget.style.background = editor?.isActive("blockquote") ? activeBg : hoverBg)}
            onMouseLeave={e => (e.currentTarget.style.background = editor?.isActive("blockquote") ? activeBg : "transparent")}>
            <Quote className="w-3.5 h-3.5" />
          </button>

          {/* ── Indent ── */}
          <button onClick={() => editor?.chain().focus().indent?.().run?.()} style={btn()} title="Increase indent"
            onMouseEnter={e => (e.currentTarget.style.background = hoverBg)}
            onMouseLeave={e => (e.currentTarget.style.background = "transparent")}>
            <Indent className="w-3.5 h-3.5" />
          </button>
          <button onClick={() => (editor?.chain().focus() as any).outdent?.().run?.()} style={btn()} title="Decrease indent"
            onMouseEnter={e => (e.currentTarget.style.background = hoverBg)}
            onMouseLeave={e => (e.currentTarget.style.background = "transparent")}>
            <Outdent className="w-3.5 h-3.5" />
          </button>

        </div>
      </div>

      {/* ── Link dialog ── */}
      {linkDialogOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center"
          style={{ background: "rgba(0,0,0,0.4)", backdropFilter: "blur(8px)" }}
          onClick={() => setLinkDialogOpen(false)}>
          <div className="rounded-2xl shadow-2xl p-6 w-80"
            style={{ background: dropBg, border: `1px solid ${dropBorder}` }}
            onClick={e => e.stopPropagation()}>
            <h3 className="text-sm font-semibold mb-3" style={{ color: fgStrong }}>Insert Link</h3>
            <input
              autoFocus
              value={linkUrl}
              onChange={e => setLinkUrl(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter") applyLink(); if (e.key === "Escape") setLinkDialogOpen(false); }}
              placeholder="https://example.com"
              className="w-full px-3 py-2 rounded-lg text-sm mb-3 outline-none"
              style={{ background: isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.05)", color: fgStrong, border: `1px solid ${dropBorder}` }}
            />
            <div className="flex gap-2 justify-end">
              <button onClick={() => setLinkDialogOpen(false)}
                className="px-3 py-1.5 rounded-lg text-xs font-medium"
                style={{ background: hoverBg, color: fg, border: "none", cursor: "pointer" }}>
                Cancel
              </button>
              {editor?.isActive("link") && (
                <button onClick={() => { editor.chain().focus().unsetLink().run(); setLinkDialogOpen(false); }}
                  className="px-3 py-1.5 rounded-lg text-xs font-medium"
                  style={{ background: "rgba(239,68,68,0.15)", color: "#ef4444", border: "none", cursor: "pointer" }}>
                  Remove
                </button>
              )}
              <button onClick={applyLink}
                className="px-3 py-1.5 rounded-lg text-xs font-medium"
                style={{ background: "#2563eb", color: "#fff", border: "none", cursor: "pointer" }}>
                Apply
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
