import { useState, useRef, useCallback, useEffect } from "react";
import { useRoute, Link } from "wouter";
import { useBook, useUpdateBook, useCoverVariants } from "@/hooks/use-books";
import { useChapters } from "@/hooks/use-chapters";
import { loadEditorFonts } from "@/lib/load-editor-fonts";
import { useLanguage } from "@/contexts/language-context";
import { useToast } from "@/hooks/use-toast";
import { SEO } from "@/components/SEO";
import {
  ArrowLeft, Type, ImageIcon, Square, Layers, Palette,
  Download, Save, Plus, Trash2, ChevronUp, ChevronDown,
  AlignLeft, AlignCenter, AlignRight, Bold, Italic,
  Move, Loader2, Eye, EyeOff, Lock, Unlock, RotateCcw,
  Circle, Triangle, Star, Minus, Copy, Check, Sparkles,
  Wand2, FileText,
} from "lucide-react";
import html2canvas from "html2canvas";
import { nanoid } from "nanoid";
import { LayoutTemplate } from "lucide-react";
import { TemplateGallery } from "@/components/cover/TemplateGallery";
import PerspectiveBook from "@/components/ui/perspective-book";
import { type BuiltTemplateDesign } from "@/lib/cover-templates";
import { COVER_FONTS, ensureCoverFontsLoaded, waitForCoverFonts, isArabicText } from "@/lib/cover-fonts";

/* ─── Types ─────────────────────────────────── */
type Face = "front" | "back" | "spine";
type ElementType = "text" | "image" | "shape";
type ShapeType = "rect" | "circle" | "triangle" | "star" | "line";
type Align = "left" | "center" | "right";
type TextEffect = "none" | "shadow" | "lift" | "hollow" | "neon" | "background";

interface CoverElement {
  id: string;
  type: ElementType;
  face: Face;
  x: number;
  y: number;
  width: number;
  height: number;
  zIndex: number;
  visible: boolean;
  locked: boolean;
  // Text
  content?: string;
  fontSize?: number;
  fontFamily?: string;
  fontWeight?: string;
  fontStyle?: string;
  color?: string;
  textAlign?: Align;
  lineHeight?: number;
  letterSpacing?: number;
  // Text effect (Canva taxonomy, Arabic-shaping-aware)
  effect?: TextEffect;
  effectColor?: string;
  effectIntensity?: number; // 0..100
  curve?: number; // -100..100, Latin text only (per-letter arc breaks Arabic joining)
  // Image
  src?: string;
  objectFit?: "cover" | "contain" | "fill";
  borderRadius?: number;
  opacity?: number;
  // Shape
  shapeType?: ShapeType;
  fill?: string;
  stroke?: string;
  strokeWidth?: number;
}

interface CoverSettings {
  front: { background: string };
  back: { background: string };
  spine: { background: string };
  spineSync: boolean; // auto-sync spine color with front/back
}

// Fonts come from the cover registry (lib/cover-fonts): every family
// listed there is genuinely loaded on this page and grouped for the
// picker (Arabic first). The old hardcoded list included Google
// families that were never loaded and silently fell back to system
// fonts (Oswald, Lato, Montserrat, Merriweather).
const ARABIC_FONTS = COVER_FONTS.filter((f) => f.script !== "latin");
const LATIN_FONTS = COVER_FONTS.filter((f) => f.script !== "arabic");

const SPINE_MIN = 32;
const SPINE_MAX = 72;
const SPINE_DEFAULT = 48;
const FACE_H = 450;

/* ─── Color helpers ─── */
/** Parse a CSS color (#hex or rgb) to {r,g,b}. Gradients return the first color. */
function parseColor(css: string): { r: number; g: number; b: number } {
  // Extract first hex color from any string (gradient or solid)
  const hexMatch = css.match(/#([0-9a-fA-F]{6}|[0-9a-fA-F]{3})/);
  if (hexMatch) {
    let hex = hexMatch[1];
    if (hex.length === 3) hex = hex[0]+hex[0]+hex[1]+hex[1]+hex[2]+hex[2];
    return { r: parseInt(hex.slice(0,2),16), g: parseInt(hex.slice(2,4),16), b: parseInt(hex.slice(4,6),16) };
  }
  return { r: 26, g: 26, b: 46 }; // fallback dark
}

/** Blend two colors by a ratio (0=a, 1=b) and return hex string */
function blendColors(a: string, b: string, ratio = 0.5): string {
  const ca = parseColor(a), cb = parseColor(b);
  const r = Math.round(ca.r + (cb.r - ca.r) * ratio);
  const g = Math.round(ca.g + (cb.g - ca.g) * ratio);
  const bl = Math.round(ca.b + (cb.b - ca.b) * ratio);
  return `#${r.toString(16).padStart(2,"0")}${g.toString(16).padStart(2,"0")}${bl.toString(16).padStart(2,"0")}`;
}

/** Darken a color by a factor (0=black, 1=unchanged) */
function darkenColor(css: string, factor: number): string {
  const c = parseColor(css);
  const r = Math.round(c.r * factor), g = Math.round(c.g * factor), b = Math.round(c.b * factor);
  return `#${r.toString(16).padStart(2,"0")}${g.toString(16).padStart(2,"0")}${b.toString(16).padStart(2,"0")}`;
}

/* ─── Text effects (Canva taxonomy, all export-safe via html-to-image) ─── */
/** Outer style for a text element's effect. Hollow uses text-stroke, so
    it applies alongside; background is handled by an inner span. */
function textEffectStyle(el: CoverElement): React.CSSProperties {
  const i = el.effectIntensity ?? 50;
  const c = el.effectColor || "#000000";
  switch (el.effect) {
    case "shadow": {
      const o = 1 + (i / 100) * 5;
      const blur = (i / 100) * 10;
      return { textShadow: `${o}px ${o}px ${blur}px ${c}` };
    }
    case "lift":
      // Soft ambient drop regardless of color — the "float off the page" look
      return { textShadow: `0 ${1 + i * 0.05}px ${4 + i * 0.2}px rgba(0,0,0,${0.3 + i * 0.005})` };
    case "hollow":
      return { WebkitTextStroke: `${Math.max(0.5, 0.5 + i * 0.03)}px ${c}`, color: "transparent" };
    case "neon":
      return {
        textShadow: `0 0 ${1 + i * 0.05}px ${c}, 0 0 ${4 + i * 0.15}px ${c}, 0 0 ${10 + i * 0.35}px ${c}`,
      };
    default:
      return {};
  }
}

/** Inner-span style for the "background" (highlight) effect. */
function textEffectSpanStyle(el: CoverElement): React.CSSProperties {
  if (el.effect !== "background") return {};
  const i = el.effectIntensity ?? 50;
  return {
    background: el.effectColor || "#000000",
    padding: `${2 + i * 0.06}px ${6 + i * 0.1}px`,
    borderRadius: 4,
    boxDecorationBreak: "clone",
    WebkitBoxDecorationBreak: "clone",
  } as React.CSSProperties;
}

/** Per-character arc for Latin text. Arabic joining would break, so the
    control is hidden for Arabic content and this is never called for it. */
function renderCurvedText(el: CoverElement): React.ReactNode {
  const text = el.content || "";
  const curve = el.curve || 0;
  const chars = [...text];
  const n = chars.length;
  if (n < 2 || !curve) return text;
  // Map curve (-100..100) to a total arc sweep up to ~110 degrees.
  const sweep = (curve / 100) * 110;
  const fontSize = el.fontSize || 24;
  // Radius from sweep: wider sweep = tighter circle.
  const radius = Math.abs(sweep) > 1 ? (180 * (n * fontSize * 0.6)) / (Math.PI * Math.abs(sweep)) : 0;
  return (
    <span style={{ display: "inline-flex", verticalAlign: "middle" }}>
      {chars.map((ch, idx) => {
        const t = n === 1 ? 0 : idx / (n - 1) - 0.5; // -0.5..0.5
        const angle = t * sweep;
        const lift = radius ? (1 - Math.cos((angle * Math.PI) / 180)) * radius : 0;
        return (
          <span
            key={idx}
            style={{
              display: "inline-block",
              transform: `translateY(${curve > 0 ? lift : -lift}px) rotate(${curve > 0 ? angle : -angle}deg)`,
              whiteSpace: "pre",
            }}
          >
            {ch}
          </span>
        );
      })}
    </span>
  );
}

const GRADIENTS = [
  "linear-gradient(135deg,#0f0c29,#302b63,#24243e)",
  "linear-gradient(135deg,#1a1a2e,#16213e,#0f3460)",
  "linear-gradient(135deg,#2d1b69,#11998e,#38ef7d)",
  "linear-gradient(135deg,#232526,#414345)",
  "linear-gradient(135deg,#4a1942,#c74b50)",
  "linear-gradient(135deg,#0f2027,#203a43,#2c5364)",
  "linear-gradient(135deg,#3a1c71,#d76d77,#ffaf7b)",
  "linear-gradient(135deg,#093028,#237a57)",
];

const SHAPE_COLORS = ["#ffffff","#000000","#e74c3c","#3498db","#2ecc71","#f39c12","#9b59b6","#1abc9c","#e67e22","#34495e"];

/* ─── One-tap style shuffle (Adobe Express pattern) ───
   Curated font + color pairings; each has an Arabic twin so shuffling
   a bilingual design keeps every script in a face designed for it. */
const STYLE_COMBOS = [
  { name: "Literary",  title: "Playfair Display",   titleAr: "Amiri",            body: "Inter",              bodyAr: "Cairo",   titleColor: "#ffffff", bodyColor: "rgba(255,255,255,0.75)" },
  { name: "Impact",    title: "Bebas Neue",         titleAr: "Lalezar",          body: "Montserrat",         bodyAr: "Tajawal", titleColor: "#f9c80e", bodyColor: "#ffffff" },
  { name: "Epic",      title: "Cinzel",             titleAr: "Aref Ruqaa",       body: "Cormorant Garamond", bodyAr: "Amiri",   titleColor: "#e9d8a6", bodyColor: "rgba(233,216,166,0.8)" },
  { name: "Tech",      title: "Space Grotesk",      titleAr: "Noto Kufi Arabic", body: "Inter",              bodyAr: "Cairo",   titleColor: "#e6fbff", bodyColor: "#7dd3fc" },
  { name: "Dramatic",  title: "Abril Fatface",      titleAr: "Katibeh",          body: "Montserrat",         bodyAr: "Tajawal", titleColor: "#fbeadf", bodyColor: "rgba(251,234,223,0.75)" },
  { name: "Classic",   title: "Cormorant Garamond", titleAr: "Markazi Text",     body: "Inter",              bodyAr: "Cairo",   titleColor: "#f4efe6", bodyColor: "rgba(244,239,230,0.7)" },
  { name: "Bold",      title: "Oswald",             titleAr: "Reem Kufi",        body: "Inter",              bodyAr: "Tajawal", titleColor: "#ffffff", bodyColor: "#fca5a5" },
  { name: "Playful",   title: "Baloo Bhaijaan 2",   titleAr: "Baloo Bhaijaan 2", body: "Baloo Bhaijaan 2",   bodyAr: "Baloo Bhaijaan 2", titleColor: "#ffffff", bodyColor: "rgba(255,255,255,0.85)" },
];

/* ─── Drag state ────────────────────────────── */
type DragState = { id: string; startMX: number; startMY: number; origX: number; origY: number } | null;
type ResizeState = { id: string; handle: string; startMX: number; startMY: number; origX: number; origY: number; origW: number; origH: number } | null;

export default function CoverDesigner() {
  const [, params] = useRoute("/books/:id/cover-designer");
  const bookId = params?.id ? parseInt(params.id) : 0;
  const { t, lang } = useLanguage();
  const ar = lang === "ar";
  const { toast } = useToast();
  const { data: book, isLoading } = useBook(bookId);
  const updateBook = useUpdateBook();

  useEffect(() => { loadEditorFonts(); ensureCoverFontsLoaded(); }, []);

  const canvasRef = useRef<HTMLDivElement>(null);
  const bookRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dragRef = useRef<DragState>(null);
  const resizeRef = useRef<ResizeState>(null);
  const savedAppliedRef = useRef<number | null>(null);   // book ID for which saved data was applied
  const defaultAppliedRef = useRef<string | null>(null); // "bookId:imgKey" for which defaults were applied

  const [elements, setElements] = useState<CoverElement[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [activeFace, setActiveFace] = useState<Face>("front");
  const [activePanel, setActivePanel] = useState<"text" | "images" | "shapes" | "layers" | "background" | "ai">("text");
  const [spineWidth, setSpineWidth] = useState(SPINE_DEFAULT);
  const [coverSettings, setCoverSettings] = useState<CoverSettings>({
    front: { background: "linear-gradient(135deg,#1a1a2e,#16213e,#0f3460)" },
    back: { background: "linear-gradient(135deg,#232526,#414345)" },
    spine: { background: "#1a1a2e" },
    spineSync: true,
  });

  // Dynamic face widths/offsets based on spineWidth
  const FACE_W = { front: 300, back: 300, spine: spineWidth };
  const FACE_OFFSET = { back: 0, spine: 300, front: 300 + spineWidth };
  const TOTAL_BOOK_W = 300 + spineWidth + 300;
  const [exporting, setExporting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [history, setHistory] = useState<CoverElement[][]>([[]]);

  // ── Template gallery ─────────────────────────────────────────────
  // Opens automatically the first time a book with no saved cover
  // design lands here (template-first entry, like every world-class
  // cover tool); reopenable any time from the header button.
  const [showGallery, setShowGallery] = useState(false);
  const galleryAutoOpenedRef = useRef<number | null>(null);

  const applyTemplate = useCallback((design: BuiltTemplateDesign) => {
    const els = design.elements as unknown as CoverElement[];
    setElements(els);
    setHistory([els]);
    setCoverSettings((prev) => ({ ...prev, ...design.settings }));
    setSelectedId(null);
    setShowGallery(false);
  }, []);
  const [historyIdx, setHistoryIdx] = useState(0);
  const [aiCoverPrompt, setAiCoverPrompt] = useState("");
  const [aiCoverSide, setAiCoverSide] = useState<"front" | "back">("front");
  const [aiCoverLoading, setAiCoverLoading] = useState(false);
  const [aiVariants, setAiVariants] = useState<string[]>([]);
  const [backCoverText, setBackCoverText] = useState("");

  const coverVariants = useCoverVariants();

  const selected = elements.find((e) => e.id === selectedId) ?? null;

  /* ─── History ─── */
  const pushHistory = useCallback((els: CoverElement[]) => {
    setHistory((h) => {
      const next = h.slice(0, historyIdx + 1);
      next.push(els.map((e) => ({ ...e })));
      return next.slice(-30);
    });
    setHistoryIdx((i) => Math.min(i + 1, 29));
  }, [historyIdx]);

  const undo = () => {
    if (historyIdx <= 0) return;
    const idx = historyIdx - 1;
    setElements(history[idx].map((e) => ({ ...e })));
    setHistoryIdx(idx);
  };
  const redo = () => {
    if (historyIdx >= history.length - 1) return;
    const idx = historyIdx + 1;
    setElements(history[idx].map((e) => ({ ...e })));
    setHistoryIdx(idx);
  };

  const updateElements = (els: CoverElement[]) => {
    setElements(els);
    pushHistory(els);
  };

  /* ─── Auto-sync spine color when front/back change ─── */
  useEffect(() => {
    if (!coverSettings.spineSync) return;
    const blended = blendColors(coverSettings.front.background, coverSettings.back.background, 0.5);
    // Slightly darken the blend to give a subtle spine crease feel
    const spineColor = darkenColor(blended, 0.85);
    setCoverSettings((s) => {
      if (s.spine.background === spineColor) return s;
      return { ...s, spine: { background: spineColor } };
    });
  }, [coverSettings.front.background, coverSettings.back.background, coverSettings.spineSync]);

  /* ─── Init elements — restore saved design or use defaults ─── */
  useEffect(() => {
    if (!book) return;
    const saved = (book as any).coverData as { elements?: CoverElement[]; settings?: CoverSettings; spineWidth?: number } | null | undefined;

    if (saved?.elements && saved.elements.length > 0) {
      // Saved data found — apply it once
      if (savedAppliedRef.current === book.id) return;
      savedAppliedRef.current = book.id;
      defaultAppliedRef.current = `${book.id}:saved`;
      setElements(saved.elements);
      setHistory([saved.elements]);
      if (saved.settings) setCoverSettings({ ...saved.settings, spineSync: saved.settings.spineSync ?? true });
      if (saved.spineWidth) setSpineWidth(saved.spineWidth);
      autosaveReadyRef.current = true;
      return;
    }

    // No saved coverData — build defaults, including any AI-generated images already on the book
    const frontImg = (book as any).coverImage as string | null | undefined;
    const backImg = (book as any).backCoverImage as string | null | undefined;
    const imgKey = `${frontImg ? "f" : ""}${backImg ? "b" : ""}`;
    const stateKey = `${book.id}:${imgKey}`;
    if (defaultAppliedRef.current === stateKey) return;
    defaultAppliedRef.current = stateKey;

    const initialEls: CoverElement[] = [
      // Front cover AI image (if previously generated)
      ...(frontImg ? [{
        id: nanoid(), type: "image" as const, face: "front" as const,
        x: 0, y: 0, width: FACE_W.front, height: FACE_H,
        zIndex: 1, visible: true, locked: false,
        src: frontImg, objectFit: "cover" as const, opacity: 1, borderRadius: 0,
      }] : []),
      // Back cover AI image (if previously generated)
      ...(backImg ? [{
        id: nanoid(), type: "image" as const, face: "back" as const,
        x: 0, y: 0, width: FACE_W.back, height: FACE_H,
        zIndex: 1, visible: true, locked: false,
        src: backImg, objectFit: "cover" as const, opacity: 1, borderRadius: 0,
      }] : []),
      // Title text on front
      { id: nanoid(), type: "text", face: "front", x: 20, y: 280, width: 260, height: 80, zIndex: 10, visible: true, locked: false, content: book.title || "Book Title", fontSize: 32, fontFamily: "Playfair Display", fontWeight: "bold", color: "#ffffff", textAlign: "center", lineHeight: 1.2, letterSpacing: 0 },
      // Author text on front
      { id: nanoid(), type: "text", face: "front", x: 20, y: 380, width: 260, height: 40, zIndex: 11, visible: true, locked: false, content: book.authorName || "Author Name", fontSize: 16, fontFamily: "Inter", fontWeight: "normal", color: "rgba(255,255,255,0.75)", textAlign: "center", lineHeight: 1.4, letterSpacing: 2 },
      // Spine title
      { id: nanoid(), type: "text", face: "spine", x: 4, y: 30, width: 40, height: 390, zIndex: 10, visible: true, locked: false, content: book.title || "Book Title", fontSize: 13, fontFamily: "Playfair Display", fontWeight: "bold", color: "#ffffff", textAlign: "center", lineHeight: 1.2, letterSpacing: 0 },
    ];
    setElements(initialEls);
    setHistory([initialEls]);
    autosaveReadyRef.current = true;

    // Fresh design (nothing saved yet): open with the template gallery
    // once per book visit instead of a blank canvas.
    if (galleryAutoOpenedRef.current !== book.id) {
      galleryAutoOpenedRef.current = book.id;
      setShowGallery(true);
    }
  // re-run when book ID, saved data status, or AI-generated images change
  }, [book?.id, !!(book as any)?.coverData, (book as any)?.coverImage, (book as any)?.backCoverImage]);

  /* ─── Snap guides (constrained freedom: Canva-style alignment) ───
     While dragging, the element magnetizes to the face center, face
     edges, and the edges/centers of every sibling on the same face.
     Active snap lines render as thin blue guides on the face. */
  const SNAP = 5;
  const [snapGuides, setSnapGuides] = useState<{ face: Face; xs: number[]; ys: number[] } | null>(null);

  const applySnap = useCallback((el: CoverElement, nx: number, ny: number, all: CoverElement[]) => {
    const faceW = FACE_W[el.face];
    // Candidate target lines on this face
    const xTargets = [0, faceW / 2, faceW];
    const yTargets = [0, FACE_H / 2, FACE_H];
    for (const o of all) {
      if (o.id === el.id || o.face !== el.face || !o.visible) continue;
      xTargets.push(o.x, o.x + o.width / 2, o.x + o.width);
      yTargets.push(o.y, o.y + o.height / 2, o.y + o.height);
    }
    let bestX: { d: number; nx: number; line: number } | null = null;
    let bestY: { d: number; ny: number; line: number } | null = null;
    // The dragged element's own snap points: left/center/right, top/middle/bottom
    for (const [own, offset] of [[nx, 0], [nx + el.width / 2, el.width / 2], [nx + el.width, el.width]] as [number, number][]) {
      for (const target of xTargets) {
        const d = Math.abs(own - target);
        if (d < SNAP && (!bestX || d < bestX.d)) bestX = { d, nx: target - offset, line: target };
      }
    }
    for (const [own, offset] of [[ny, 0], [ny + el.height / 2, el.height / 2], [ny + el.height, el.height]] as [number, number][]) {
      for (const target of yTargets) {
        const d = Math.abs(own - target);
        if (d < SNAP && (!bestY || d < bestY.d)) bestY = { d, ny: target - offset, line: target };
      }
    }
    return {
      x: bestX ? bestX.nx : nx,
      y: bestY ? bestY.ny : ny,
      guides: { face: el.face, xs: bestX ? [bestX.line] : [], ys: bestY ? [bestY.line] : [] },
    };
  }, [spineWidth]);

  /* ─── Mouse handlers for drag/resize ─── */
  const getRelativePos = (e: React.MouseEvent, face: Face): { x: number; y: number } => {
    const bookEl = bookRef.current;
    if (!bookEl) return { x: 0, y: 0 };
    const rect = bookEl.getBoundingClientRect();
    const faceLeft = FACE_OFFSET[face] * zoom;
    const x = (e.clientX - rect.left - faceLeft) / zoom;
    const y = (e.clientY - rect.top) / zoom;
    return { x, y };
  };

  const onMouseMove = useCallback((e: MouseEvent) => {
    // Drag
    if (dragRef.current) {
      const { id, startMX, startMY, origX, origY } = dragRef.current;
      const dx = (e.clientX - startMX) / zoom;
      const dy = (e.clientY - startMY) / zoom;
      setElements((els) => {
        let guides: { face: Face; xs: number[]; ys: number[] } | null = null;
        const next = els.map((el) => {
          if (el.id !== id) return el;
          const faceW = FACE_W[el.face];
          const rawX = Math.max(-el.width / 2, Math.min(faceW - el.width / 2, origX + dx));
          const rawY = Math.max(-el.height / 2, Math.min(FACE_H - el.height / 2, origY + dy));
          const snapped = applySnap(el, rawX, rawY, els);
          guides = snapped.guides.xs.length || snapped.guides.ys.length ? snapped.guides : null;
          return { ...el, x: snapped.x, y: snapped.y };
        });
        setSnapGuides(guides);
        return next;
      });
    }
    // Resize
    if (resizeRef.current) {
      const { id, handle, startMX, startMY, origX, origY, origW, origH } = resizeRef.current;
      const dx = (e.clientX - startMX) / zoom;
      const dy = (e.clientY - startMY) / zoom;
      setElements((els) =>
        els.map((el) => {
          if (el.id !== id) return el;
          const faceW = FACE_W[el.face];
          let { x, y, width, height } = el;
          if (handle.includes("e")) width = Math.min(faceW - x, Math.max(20, origW + dx));
          if (handle.includes("s")) height = Math.min(FACE_H - y, Math.max(20, origH + dy));
          if (handle.includes("w")) { x = Math.max(0, origX + dx); width = Math.max(20, origW - dx); }
          if (handle.includes("n")) { y = Math.max(0, origY + dy); height = Math.max(20, origH - dy); }
          return { ...el, x, y, width, height };
        })
      );
    }
  }, [zoom, applySnap]);

  const onMouseUp = useCallback(() => {
    if (dragRef.current || resizeRef.current) {
      dragRef.current = null;
      resizeRef.current = null;
      setSnapGuides(null);
      setElements((els) => {
        pushHistory(els);
        return els;
      });
    }
  }, [pushHistory]);

  useEffect(() => {
    // Pointer events cover mouse AND touch: the same drag/resize logic
    // drives desktop and phone.
    window.addEventListener("pointermove", onMouseMove);
    window.addEventListener("pointerup", onMouseUp);
    window.addEventListener("pointercancel", onMouseUp);
    return () => {
      window.removeEventListener("pointermove", onMouseMove);
      window.removeEventListener("pointerup", onMouseUp);
      window.removeEventListener("pointercancel", onMouseUp);
    };
  }, [onMouseMove, onMouseUp]);

  /* ─── Element actions ─── */
  const addText = () => {
    const el: CoverElement = {
      id: nanoid(), type: "text", face: activeFace,
      x: 20, y: 150, width: FACE_W[activeFace] - 40, height: 60,
      zIndex: elements.length + 1, visible: true, locked: false,
      content: "Double-click to edit", fontSize: 24, fontFamily: "Inter",
      fontWeight: "normal", color: "#ffffff", textAlign: "center", lineHeight: 1.4, letterSpacing: 0,
    };
    updateElements([...elements, el]);
    setSelectedId(el.id);
  };

  const addShape = (shapeType: ShapeType) => {
    const el: CoverElement = {
      id: nanoid(), type: "shape", face: activeFace,
      x: 80, y: 150, width: 120, height: 120,
      zIndex: elements.length + 1, visible: true, locked: false,
      shapeType, fill: "#ffffff", stroke: "transparent", strokeWidth: 0,
    };
    updateElements([...elements, el]);
    setSelectedId(el.id);
  };

  const deleteSelected = () => {
    if (!selectedId) return;
    updateElements(elements.filter((e) => e.id !== selectedId));
    setSelectedId(null);
  };

  const duplicateSelected = () => {
    if (!selected) return;
    const copy: CoverElement = { ...selected, id: nanoid(), x: selected.x + 16, y: selected.y + 16, zIndex: elements.length + 1 };
    updateElements([...elements, copy]);
    setSelectedId(copy.id);
  };

  const updateElement = (id: string, patch: Partial<CoverElement>) => {
    setElements((els) => els.map((e) => e.id === id ? { ...e, ...patch } : e));
  };

  const commitUpdate = (id: string, patch: Partial<CoverElement>) => {
    updateElements(elements.map((e) => e.id === id ? { ...e, ...patch } : e));
  };

  /* ─── One-tap style shuffle ─── */
  const styleIdxRef = useRef(0);
  const shuffleStyles = () => {
    const texts = elements.filter((e) => e.type === "text");
    if (!texts.length) return;
    const combo = STYLE_COMBOS[styleIdxRef.current % STYLE_COMBOS.length];
    styleIdxRef.current += 1;
    // Largest front-face text = the title; spine follows the title look.
    const titleEl = [...texts].filter((e) => e.face === "front").sort((a, b) => (b.fontSize || 0) - (a.fontSize || 0))[0] || texts[0];
    updateElements(elements.map((e) => {
      if (e.type !== "text") return e;
      const arText = isArabicText(e.content);
      const isTitle = e.id === titleEl.id || e.face === "spine";
      return {
        ...e,
        fontFamily: isTitle ? (arText ? combo.titleAr : combo.title) : (arText ? combo.bodyAr : combo.body),
        color: isTitle ? combo.titleColor : combo.bodyColor,
        letterSpacing: arText ? 0 : e.letterSpacing,
      };
    }));
    toast({ title: (ar ? "ستايل " : "Style: ") + combo.name });
  };

  /* ─── Spine width auto-calc from the real manuscript ───
     KDP's #1 cover rejection cause is a wrong spine width. We have the
     manuscript, so: words -> pages (275 words/page paperback estimate)
     -> KDP white-paper formula (pages x 0.002252 in). The canvas is
     50 px/inch (300 px face = 6 in), so px = inches x 50. */
  const { data: spineChapters } = useChapters(bookId);
  const spineCalc = (() => {
    if (!spineChapters?.length) return null;
    const words = spineChapters.reduce((sum: number, c: any) => {
      const text = typeof c.content === "string" ? c.content.replace(/<[^>]+>/g, " ") : "";
      const n = text.trim() ? text.trim().split(/\s+/).filter(Boolean).length : 0;
      return sum + n;
    }, 0);
    if (words < 100) return null;
    const pages = Math.max(24, Math.ceil(words / 275));
    const inches = pages * 0.002252;
    return { words, pages, inches, px: Math.max(SPINE_MIN, Math.min(SPINE_MAX, Math.round(inches * 50))) };
  })();

  /* ─── Layer drag-reorder (layers panel) ─── */
  const layerDragIdRef = useRef<string | null>(null);
  const [layerDropId, setLayerDropId] = useState<string | null>(null);

  /** Move dragged layer to the dropped row's position, then reassign
      zIndexes from the new visual order (top row = highest z). */
  const reorderLayer = (fromId: string | null, toId: string) => {
    if (!fromId || fromId === toId) return;
    const displayOrder = [...elements].sort((a, b) => b.zIndex - a.zIndex);
    const fromIdx = displayOrder.findIndex((e) => e.id === fromId);
    const toIdx = displayOrder.findIndex((e) => e.id === toId);
    if (fromIdx < 0 || toIdx < 0) return;
    const [moved] = displayOrder.splice(fromIdx, 1);
    displayOrder.splice(toIdx, 0, moved);
    const n = displayOrder.length;
    const withZ = new Map(displayOrder.map((e, i) => [e.id, n - i]));
    updateElements(elements.map((e) => ({ ...e, zIndex: withZ.get(e.id) ?? e.zIndex })));
  };

  const moveLayer = (id: string, dir: "up" | "down") => {
    const el = elements.find((e) => e.id === id);
    if (!el) return;
    const sorted = [...elements].sort((a, b) => a.zIndex - b.zIndex);
    const idx = sorted.findIndex((e) => e.id === id);
    const swap = dir === "up" ? sorted[idx + 1] : sorted[idx - 1];
    if (!swap) return;
    const newEls = elements.map((e) => {
      if (e.id === id) return { ...e, zIndex: swap.zIndex };
      if (e.id === swap.id) return { ...e, zIndex: el.zIndex };
      return e;
    });
    updateElements(newEls);
  };

  /* ─── Image: shared processor (used by file input AND drag-drop) ─── */
  const addImageFile = useCallback((file: File, targetFace?: Face) => {
    if (!file.type.startsWith("image/")) return;
    const face = targetFace ?? activeFace;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const src = ev.target?.result as string;
      const img = new Image();
      img.onload = () => {
        const faceW = FACE_W[face];
        const faceH = FACE_H;
        const naturalW = img.naturalWidth;
        const naturalH = img.naturalHeight;
        const scale = Math.min(faceW / naturalW, faceH / naturalH, 1);
        const displayW = Math.round(naturalW * scale);
        const displayH = Math.round(naturalH * scale);
        const x = Math.round((faceW - displayW) / 2);
        const y = Math.round((faceH - displayH) / 2);
        const el: CoverElement = {
          id: nanoid(), type: "image", face,
          x, y, width: displayW, height: displayH,
          zIndex: elements.length + 1, visible: true, locked: false,
          src, objectFit: "fill", opacity: 1, borderRadius: 0,
        };
        updateElements([...elements, el]);
        setSelectedId(el.id);
        setActiveFace(face);
      };
      img.src = src;
    };
    reader.readAsDataURL(file);
  }, [activeFace, elements, spineWidth, updateElements]);

  /* ─── Image upload (file input) ─── */
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    addImageFile(file);
    e.target.value = "";
  };

  /* ─── Drag & Drop ─── */
  const [isDraggingOver, setIsDraggingOver] = useState(false);
  const dragCounterRef = useRef(0);

  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounterRef.current++;
    if (e.dataTransfer.types.includes("Files")) {
      setIsDraggingOver(true);
    }
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounterRef.current--;
    if (dragCounterRef.current === 0) {
      setIsDraggingOver(false);
    }
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    e.dataTransfer.dropEffect = "copy";
  }, []);

  /** Detect which face the drop landed on by checking cursor position against face rects */
  const detectFaceFromDrop = useCallback((e: React.DragEvent): Face => {
    const bookEl = bookRef.current;
    if (!bookEl) return activeFace;
    const rect = bookEl.getBoundingClientRect();
    const relX = (e.clientX - rect.left) / zoom;
    // back: 0..300, spine: 300..300+spineWidth, front: 300+spineWidth..600+spineWidth
    if (relX < 300) return "back";
    if (relX < 300 + spineWidth) return "spine";
    return "front";
  }, [activeFace, zoom, spineWidth]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingOver(false);
    dragCounterRef.current = 0;

    const files = Array.from(e.dataTransfer.files);
    const imageFiles = files.filter((f) => f.type.startsWith("image/"));
    if (imageFiles.length === 0) return;

    const targetFace = detectFaceFromDrop(e);
    // Add first image (multiple images would overlap — just take the first)
    addImageFile(imageFiles[0], targetFace);
  }, [detectFaceFromDrop, addImageFile]);

  /* ─── Inline text editing ─── */
  const [editingId, setEditingId] = useState<string | null>(null);

  /* ─── Keyboard shortcuts ───
     Delete removes, arrows nudge 1px (Shift = 10px), Ctrl+D duplicates,
     Ctrl+Z / Ctrl+Shift+Z (or Ctrl+Y) undo/redo, Escape deselects.
     All skipped while typing in any input/textarea/select. */
  const nudgeCommitTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const typing = !!target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.tagName === "SELECT" || target.isContentEditable);
      if (typing || editingId) return;

      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "z") {
        e.preventDefault();
        if (e.shiftKey) redo(); else undo();
        return;
      }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "y") { e.preventDefault(); redo(); return; }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "d") {
        if (selectedId) { e.preventDefault(); duplicateSelected(); }
        return;
      }
      if (e.key === "Escape") { setSelectedId(null); return; }
      if (!selectedId) return;
      const sel = elements.find((el) => el.id === selectedId);
      if (!sel || sel.locked) return;

      if (e.key === "Delete" || e.key === "Backspace") { e.preventDefault(); deleteSelected(); return; }

      const step = e.shiftKey ? 10 : 1;
      let dx = 0, dy = 0;
      if (e.key === "ArrowLeft") dx = -step;
      else if (e.key === "ArrowRight") dx = step;
      else if (e.key === "ArrowUp") dy = -step;
      else if (e.key === "ArrowDown") dy = step;
      else return;
      e.preventDefault();
      setElements((els) => els.map((el) => el.id === selectedId ? { ...el, x: el.x + dx, y: el.y + dy } : el));
      // Batch rapid nudges into one history entry
      if (nudgeCommitTimer.current) clearTimeout(nudgeCommitTimer.current);
      nudgeCommitTimer.current = setTimeout(() => {
        setElements((els) => { pushHistory(els); return els; });
      }, 450);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [selectedId, editingId, elements, undo, redo, duplicateSelected, deleteSelected, pushHistory]);

  /* ─── Autosave ───
     Debounced silent save of the design JSON (no thumbnail capture,
     that stays on manual Save). Armed only after the initial design is
     applied so loading a book never writes back what it just read. */
  const autosaveReadyRef = useRef(false);
  useEffect(() => {
    if (!autosaveReadyRef.current || !bookId) return;
    const timer = setTimeout(() => {
      if (dragRef.current || resizeRef.current) return; // mid-gesture, next change will save
      updateBook.mutateAsync({
        id: bookId,
        coverData: { elements, settings: coverSettings, spineWidth },
      } as any).catch(() => { /* silent: manual Save surfaces errors */ });
    }, 6000);
    return () => clearTimeout(timer);
  }, [elements, coverSettings, spineWidth, bookId]);

  /* ─── 3D mockup moment (after save) ─── */
  const [mockupUrl, setMockupUrl] = useState<string | null>(null);

  /* ─── Phone: pinch zoom, fit-to-width, bottom sheets ─── */
  const [mobileSheet, setMobileSheet] = useState<null | "panel" | "props">(null);
  const isNarrowRef = useRef(typeof window !== "undefined" && window.innerWidth < 768);
  const zoomRef = useRef(zoom);
  useEffect(() => { zoomRef.current = zoom; }, [zoom]);

  // Fit the whole wrap to the phone width once on mount.
  useEffect(() => {
    if (isNarrowRef.current) {
      setZoom(Math.max(0.3, Math.min(1, (window.innerWidth - 24) / (300 + SPINE_DEFAULT + 300))));
    }
  }, []);

  // Two-finger pinch on the canvas adjusts zoom (native listeners so we
  // can preventDefault browser page-zoom).
  useEffect(() => {
    const node = canvasRef.current;
    if (!node) return;
    let startDist = 0;
    let startZoom = 1;
    const dist = (e: TouchEvent) => Math.hypot(
      e.touches[0].clientX - e.touches[1].clientX,
      e.touches[0].clientY - e.touches[1].clientY,
    );
    const onTouchStart = (e: TouchEvent) => {
      if (e.touches.length === 2) { startDist = dist(e); startZoom = zoomRef.current; }
    };
    const onTouchMove = (e: TouchEvent) => {
      if (e.touches.length === 2 && startDist > 0) {
        e.preventDefault();
        setZoom(Math.max(0.3, Math.min(2.5, startZoom * (dist(e) / startDist))));
      }
    };
    const onTouchEnd = () => { startDist = 0; };
    node.addEventListener("touchstart", onTouchStart, { passive: true });
    node.addEventListener("touchmove", onTouchMove, { passive: false });
    node.addEventListener("touchend", onTouchEnd, { passive: true });
    node.addEventListener("touchcancel", onTouchEnd, { passive: true });
    return () => {
      node.removeEventListener("touchstart", onTouchStart);
      node.removeEventListener("touchmove", onTouchMove);
      node.removeEventListener("touchend", onTouchEnd);
      node.removeEventListener("touchcancel", onTouchEnd);
    };
  }, []);

  /* ─── Lock body scroll when designer is open ─── */
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.documentElement.style.overflow = "hidden";
    document.body.style.overflow = "hidden";
    window.scrollTo(0, 0);
    return () => {
      document.documentElement.style.overflow = prev;
      document.body.style.overflow = prev;
    };
  }, []);

  /* ─── Export ───
     Rasterizes with html-to-image (SVG foreignObject: the browser's own
     text engine paints, so Arabic shaping, text effects, and curves all
     export exactly as seen — html2canvas mangles all three; it remains
     only as a fallback). While `exporting` is true the canvas hides all
     non-design chrome (labels, active border, edge shadows, guides). */
  const [exportMenuOpen, setExportMenuOpen] = useState(false);
  const PRINT_RATIO = 1600 / 300; // 300px face -> 1600px wide (KDP print quality)

  const doExport = async (preset: "screen" | "print-front" | "print-wrap") => {
    setExportMenuOpen(false);
    const node = preset === "print-front"
      ? (bookRef.current?.querySelector('[data-face="front"]') as HTMLElement | null)
      : bookRef.current;
    if (!node) return;
    const prevSelected = selectedId;
    setSelectedId(null); // hide selection outlines before capture
    setExporting(true);
    // Make sure every font used in the design is actually loaded, or
    // titles rasterize in a fallback face (worst for Arabic display fonts).
    await waitForCoverFonts(elements.map((el) => el.fontFamily || "").filter(Boolean));
    // Wait two frames for React to remove outlines and export chrome
    await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));
    const pixelRatio = preset === "screen" ? 3 : PRINT_RATIO;
    const suffix = preset === "screen" ? "design" : preset === "print-front" ? "front-print" : "wrap-print";
    try {
      let url: string;
      try {
        const { toPng } = await import("html-to-image");
        url = await toPng(node, { pixelRatio, cacheBust: true });
      } catch {
        const canvas = await html2canvas(node, { scale: pixelRatio, useCORS: true, allowTaint: true, backgroundColor: null });
        url = canvas.toDataURL("image/png");
      }
      const a = document.createElement("a");
      a.href = url;
      a.download = `${book?.title || "cover"}-${suffix}.png`;
      a.click();
      toast({ title: t("cdExportedPng") });
    } catch {
      toast({ title: t("cdExportFailed"), variant: "destructive" });
    } finally {
      setExporting(false);
      setSelectedId(prevSelected);
    }
  };

  /* ─── Save ─── */
  const handleSave = async () => {
    const prevSelected = selectedId;
    setSelectedId(null); // hide selection outlines before thumbnail capture
    setSaving(true);
    setExporting(true); // hides canvas chrome (labels, borders) from the thumbnail
    await waitForCoverFonts(elements.map((el) => el.fontFamily || "").filter(Boolean));
    await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));
    try {
      // Capture front face thumbnail by data attribute (safe, no magic index)
      let coverImage: string | undefined;
      const frontEl = bookRef.current?.querySelector('[data-face="front"]') as HTMLElement | undefined;
      if (frontEl) {
        try {
          const { toJpeg } = await import("html-to-image");
          coverImage = await toJpeg(frontEl, { pixelRatio: 1.5, quality: 0.85, cacheBust: true });
        } catch {
          try {
            const thumbCanvas = await html2canvas(frontEl, { scale: 1.5, useCORS: true, allowTaint: true, backgroundColor: null });
            coverImage = thumbCanvas.toDataURL("image/jpeg", 0.85);
          } catch { /* thumbnail failure is non-fatal */ }
        }
      }

      await updateBook.mutateAsync({
        id: bookId,
        spineColor: coverSettings.spine.background,
        coverData: { elements, settings: coverSettings, spineWidth },
        ...(coverImage ? { coverImage } : {}),
      } as any);
      toast({ title: t("cdSaved") });
      // The reveal: the freshly saved front cover on a 3D book.
      if (coverImage) setMockupUrl(coverImage);
    } catch {
      toast({ title: t("cdSaveFailed"), variant: "destructive" });
    } finally {
      setSaving(false);
      setExporting(false);
      setSelectedId(prevSelected);
    }
  };

  /* ─── AI: Generate 4 textless artwork variants ─── */
  const handleAiVariants = async () => {
    if (!aiCoverPrompt.trim()) {
      toast({ title: t("cdEnterDesc"), variant: "destructive" });
      return;
    }
    setAiVariants([]);
    setAiCoverLoading(true);
    try {
      const result = await coverVariants.mutateAsync({ id: bookId, prompt: aiCoverPrompt, side: aiCoverSide, count: 4 });
      if (!result.images.length) throw new Error("empty");
      setAiVariants(result.images);
    } catch {
      toast({ title: t("cdGenFailed"), variant: "destructive" });
    } finally {
      setAiCoverLoading(false);
    }
  };

  /* Place a picked variant as a full-bleed image element on the active
     AI side. Nothing was saved server-side; the artwork persists with
     the design when the cover saves. */
  const applyAiVariant = (src: string) => {
    const el: CoverElement = {
      id: nanoid(), type: "image", face: aiCoverSide,
      x: 0, y: 0, width: FACE_W[aiCoverSide], height: FACE_H,
      zIndex: 1, visible: true, locked: false,
      src, objectFit: "cover", opacity: 1, borderRadius: 0,
    };
    const newEls = [...elements, el];
    updateElements(newEls);
    setSelectedId(el.id);
    setActiveFace(aiCoverSide);
    toast({ title: aiCoverSide === "front" ? t("cdFrontGen") : t("cdBackGen") });
  };

  /* ─── AI: Generate Blurb (back cover summary) ─── */
  // Place the manually written back-cover text as a text element on the
  // back face. Mirrors the previous AI placement (position, size, style)
  // so the result drops in exactly where the blurb used to, ready to
  // reposition or restyle like any other text block.
  const handlePlaceBackCoverText = () => {
    const text = backCoverText.trim();
    if (!text) return;
    const el: CoverElement = {
      id: nanoid(), type: "text", face: "back",
      x: 20, y: 80, width: FACE_W.back - 40, height: 260,
      zIndex: 10, visible: true, locked: false,
      content: text, fontSize: 9, fontFamily: "Inter",
      fontWeight: "normal", color: "#ffffff",
      textAlign: ar ? "right" : "center",
      lineHeight: 1.6, letterSpacing: 0,
    };
    updateElements([...elements, el]);
    setSelectedId(el.id);
    setActiveFace("back");
    setBackCoverText("");
    toast({ title: ar ? "تمت إضافة النص إلى الغلاف الخلفي" : "Text added to the back cover" });
  };

  if (isLoading) return (
    <div className="min-h-screen flex items-center justify-center bg-[#111]">
      <Loader2 className="w-8 h-8 animate-spin text-white/40" />
    </div>
  );

  const sortedElements = [...elements].sort((a, b) => a.zIndex - b.zIndex);

  /* ─── Render element on canvas ─── */
  const renderElement = (el: CoverElement) => {
    const isSelected = el.id === selectedId;
    const isEditing = el.id === editingId;

    const handlePointerDown = (e: React.PointerEvent) => {
      if (el.locked) return;
      // While this text element is being edited, a pointerdown is the user
      // clicking inside the textarea (to place the caret or select text).
      // Do NOT exit edit mode or start a drag — just keep the event from
      // bubbling to the face/canvas handlers.
      if (isEditing) { e.stopPropagation(); return; }
      e.stopPropagation();
      setSelectedId(el.id);
      setEditingId(null);
      dragRef.current = { id: el.id, startMX: e.clientX, startMY: e.clientY, origX: el.x, origY: el.y };
    };

    const handleDoubleClick = (e: React.MouseEvent) => {
      if (el.type === "text") { e.stopPropagation(); setEditingId(el.id); }
    };

    const HANDLES = ["nw","n","ne","e","se","s","sw","w"];
    const handleCursor: Record<string, string> = { nw: "nw-resize", n: "n-resize", ne: "ne-resize", e: "e-resize", se: "se-resize", s: "s-resize", sw: "sw-resize", w: "w-resize" };

    return (
      <div
        key={el.id}
        style={{
          position: "absolute",
          left: el.x, top: el.y,
          width: el.width, height: el.height,
          zIndex: el.zIndex,
          opacity: el.visible ? 1 : 0.2,
          cursor: el.locked ? "not-allowed" : "move",
          userSelect: "none",
          boxSizing: "border-box",
          outline: isSelected ? "2px solid #3b82f6" : "none",
          outlineOffset: "1px",
          touchAction: isEditing ? "auto" : "none", // touch drags must not scroll the page
        }}
        onPointerDown={handlePointerDown}
        onDoubleClick={handleDoubleClick}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Content */}
        {el.type === "text" && (
          isEditing ? (
            <textarea
              autoFocus
              style={{ width: "100%", height: "100%", background: "transparent", border: "none", outline: "none", resize: "none", color: el.color, fontSize: el.fontSize, fontFamily: el.fontFamily, fontWeight: el.fontWeight, fontStyle: el.fontStyle, textAlign: el.textAlign, lineHeight: el.lineHeight, letterSpacing: `${el.letterSpacing}px`, overflow: "hidden" }}
              value={el.content}
              onChange={(e) => updateElement(el.id, { content: e.target.value })}
              onBlur={() => { setEditingId(null); commitUpdate(el.id, {}); }}
              onMouseDown={(e) => e.stopPropagation()}
              onClick={(e) => e.stopPropagation()}
            />
          ) : (
            <div style={{ width: "100%", height: "100%", color: el.color, fontSize: el.fontSize, fontFamily: el.fontFamily, fontWeight: el.fontWeight, fontStyle: el.fontStyle, textAlign: el.textAlign, lineHeight: el.lineHeight, letterSpacing: `${el.letterSpacing}px`, overflow: "hidden", wordBreak: "break-word", whiteSpace: "pre-wrap", ...textEffectStyle(el) }}>
              {el.effect === "background"
                ? <span style={textEffectSpanStyle(el)}>{el.content}</span>
                : (el.curve && !isArabicText(el.content) ? renderCurvedText(el) : el.content)}
            </div>
          )
        )}
        {el.type === "image" && (
          <img src={el.src} alt="" role="presentation" style={{ width: "100%", height: "100%", objectFit: el.objectFit, borderRadius: el.borderRadius, opacity: el.opacity, display: "block", pointerEvents: "none" }} />
        )}
        {el.type === "shape" && (
          <svg width="100%" height="100%" viewBox="0 0 100 100" preserveAspectRatio="none" style={{ pointerEvents: "none" }}>
            {el.shapeType === "rect" && <rect x="0" y="0" width="100" height="100" fill={el.fill} stroke={el.stroke} strokeWidth={el.strokeWidth} />}
            {el.shapeType === "circle" && <ellipse cx="50" cy="50" rx="50" ry="50" fill={el.fill} stroke={el.stroke} strokeWidth={el.strokeWidth} />}
            {el.shapeType === "triangle" && <polygon points="50,0 100,100 0,100" fill={el.fill} stroke={el.stroke} strokeWidth={el.strokeWidth} />}
            {el.shapeType === "star" && <polygon points="50,0 61,35 98,35 68,57 79,91 50,70 21,91 32,57 2,35 39,35" fill={el.fill} stroke={el.stroke} strokeWidth={el.strokeWidth} />}
            {el.shapeType === "line" && <line x1="0" y1="50" x2="100" y2="50" stroke={el.fill} strokeWidth="4" />}
          </svg>
        )}

        {/* Resize handles */}
        {isSelected && !el.locked && (
          HANDLES.map((h) => {
            const top = h.includes("n") ? -6 : h.includes("s") ? "calc(100% - 6px)" : "calc(50% - 6px)";
            const left = h.includes("w") ? -6 : h.includes("e") ? "calc(100% - 6px)" : "calc(50% - 6px)";
            return (
              <div
                key={h}
                style={{ position: "absolute", top, left, width: 12, height: 12, background: "#3b82f6", border: "1.5px solid white", borderRadius: 3, cursor: handleCursor[h], zIndex: 9999, touchAction: "none" }}
                onPointerDown={(e) => {
                  e.stopPropagation();
                  resizeRef.current = { id: el.id, handle: h, startMX: e.clientX, startMY: e.clientY, origX: el.x, origY: el.y, origW: el.width, origH: el.height };
                  dragRef.current = null;
                }}
              />
            );
          })
        )}
      </div>
    );
  };

  /* ─── Face canvas ─── */
  const FaceCanvas = ({ face }: { face: Face }) => {
    const w = FACE_W[face];
    const faceElements = sortedElements.filter((e) => e.face === face);
    const bg = coverSettings[face].background;
    const isSpine = face === "spine";

    // Build gradient edge overlays for visual blending between spine and covers
    const spineEdgeLeft = isSpine ? `linear-gradient(to right, ${darkenColor(coverSettings.back.background, 0.6)}33 0%, transparent 40%)` : undefined;
    const spineEdgeRight = isSpine ? `linear-gradient(to left, ${darkenColor(coverSettings.front.background, 0.6)}33 0%, transparent 40%)` : undefined;

    return (
      <div
        data-face={face}
        style={{ position: "relative", width: w, height: FACE_H, background: bg, overflow: "hidden", flexShrink: 0 }}
        onClick={() => { setActiveFace(face); setSelectedId(null); }}
      >
        {/* Spine blend overlays — subtle gradient edges to connect with
            front/back (screen-only lighting, hidden from print exports) */}
        {!exporting && isSpine && (
          <>
            <div style={{ position: "absolute", inset: 0, background: spineEdgeLeft, pointerEvents: "none", zIndex: 0 }} />
            <div style={{ position: "absolute", inset: 0, background: spineEdgeRight, pointerEvents: "none", zIndex: 0 }} />
            {/* Subtle inner shadow for book crease feel */}
            <div style={{ position: "absolute", inset: 0, boxShadow: "inset 2px 0 6px rgba(0,0,0,0.3), inset -2px 0 6px rgba(0,0,0,0.3)", pointerEvents: "none", zIndex: 1 }} />
          </>
        )}
        {/* Edge shadow on cover sides adjacent to spine (screen-only:
            hidden while exporting so print files stay clean) */}
        {!exporting && face === "back" && (
          <div style={{ position: "absolute", top: 0, right: 0, width: 12, height: "100%", background: "linear-gradient(to left, rgba(0,0,0,0.25), transparent)", pointerEvents: "none", zIndex: 9990 }} />
        )}
        {!exporting && face === "front" && (
          <div style={{ position: "absolute", top: 0, left: 0, width: 12, height: "100%", background: "linear-gradient(to right, rgba(0,0,0,0.25), transparent)", pointerEvents: "none", zIndex: 9990 }} />
        )}

        {/* Spine text is rotated */}
        {faceElements.map((el) =>
          face === "spine" ? (
            <div
              key={el.id}
              style={{ position: "absolute", left: el.x, top: el.y, width: el.width, height: el.height, zIndex: el.zIndex + 2, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", outline: selectedId === el.id ? "2px solid #3b82f6" : "none", outlineOffset: 1, boxSizing: "border-box" }}
              onPointerDown={(e) => { e.stopPropagation(); setSelectedId(el.id); }}
              onClick={(e) => e.stopPropagation()}
            >
              {el.type === "text" && (
                <div style={{ writingMode: "vertical-rl", transform: "rotate(180deg)", color: el.color, fontSize: el.fontSize, fontFamily: el.fontFamily, fontWeight: el.fontWeight, textAlign: "center", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", letterSpacing: `${el.letterSpacing || 0}px`, ...textEffectStyle(el) }}>
                  {el.content}
                </div>
              )}
            </div>
          ) : renderElement(el)
        )}
        {/* Snap guides while dragging */}
        {snapGuides && snapGuides.face === face && (
          <>
            {snapGuides.xs.map((gx) => (
              <div key={`gx${gx}`} style={{ position: "absolute", left: gx, top: 0, width: 1, height: "100%", background: "#38bdf8", pointerEvents: "none", zIndex: 9997 }} />
            ))}
            {snapGuides.ys.map((gy) => (
              <div key={`gy${gy}`} style={{ position: "absolute", top: gy, left: 0, height: 1, width: "100%", background: "#38bdf8", pointerEvents: "none", zIndex: 9997 }} />
            ))}
          </>
        )}
        {/* Active face indicator */}
        {!exporting && activeFace === face && (
          <div style={{ position: "absolute", inset: 0, border: "2px solid rgba(59,130,246,0.5)", pointerEvents: "none", zIndex: 9998 }} />
        )}
        {/* Label */}
        {!exporting && (
          <div style={{ position: "absolute", top: 6, ...(isSpine ? { left: "50%", transform: "translateX(-50%)" } : { left: 8 }), fontSize: 9, color: "rgba(255,255,255,0.3)", letterSpacing: 2, textTransform: "uppercase", fontFamily: "Inter", pointerEvents: "none", zIndex: 9999, writingMode: isSpine ? "vertical-rl" : "horizontal-tb" }}>
            {face}
          </div>
        )}
      </div>
    );
  };

  /* ─── Left panel content ─── */
  const renderPanel = () => {
    switch (activePanel) {
      case "text": return (
        <div className="p-4 space-y-3">
          <p className="text-xs text-white/40 uppercase tracking-widest font-semibold">Add Text</p>
          <button onClick={addText} className="w-full flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white text-sm font-semibold rounded-xl px-4 py-2.5 transition-colors">
            <Plus className="w-4 h-4" /> Add Text Block
          </button>
          <button
            onClick={shuffleStyles}
            disabled={!elements.some((e) => e.type === "text")}
            title={ar ? "يبدّل خطوط وألوان كل النصوص دفعة واحدة" : "Swaps every text's font and color in one tap"}
            className="w-full flex items-center gap-2 bg-white/8 hover:bg-white/15 border border-white/10 disabled:opacity-40 text-white text-sm font-medium rounded-xl px-4 py-2.5 transition-colors"
          >
            <Sparkles className="w-4 h-4 text-amber-300" /> {ar ? "بدّل الستايل" : "Shuffle style"}
          </button>
          <div className="space-y-1.5">
            {[{ labelKey: "cdPresetLargeTitle" as const, size: 40, weight: "bold", family: "Playfair Display" }, { labelKey: "cdPresetSubtitle" as const, size: 20, weight: "600", family: "Merriweather" }, { labelKey: "cdPresetAuthor" as const, size: 14, weight: "normal", family: "Inter" }, { labelKey: "cdPresetBody" as const, size: 12, weight: "normal", family: "Inter" }].map((preset) => (
              <button key={preset.labelKey} onClick={() => {
                const el: CoverElement = { id: nanoid(), type: "text", face: activeFace, x: 20, y: 180, width: FACE_W[activeFace] - 40, height: 80, zIndex: elements.length + 1, visible: true, locked: false, content: t(preset.labelKey), fontSize: preset.size, fontFamily: preset.family, fontWeight: preset.weight, color: "#ffffff", textAlign: "center", lineHeight: 1.2, letterSpacing: 0 };
                updateElements([...elements, el]); setSelectedId(el.id);
              }} className="w-full text-left px-3 py-2 rounded-xl bg-white/5 hover:bg-white/10 transition-colors text-sm text-white/80" style={{ fontFamily: preset.family, fontWeight: preset.weight, fontSize: 13 }}>
                {t(preset.labelKey)}
              </button>
            ))}
          </div>
        </div>
      );

      case "images": return (
        <div className="p-4 space-y-3">
          <p className="text-xs text-white/40 uppercase tracking-widest font-semibold">Upload Image</p>
          <button onClick={() => fileInputRef.current?.click()} className="w-full flex items-center gap-2 bg-white/8 hover:bg-white/15 border border-white/10 text-white text-sm font-medium rounded-xl px-4 py-2.5 transition-colors">
            <ImageIcon className="w-4 h-4" /> Upload from device
          </button>
          <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
          <p className="text-xs text-white/30 mt-2">Images will be placed on the <span className="text-blue-400 font-semibold">{activeFace}</span> cover face. Drag to reposition.</p>
        </div>
      );

      case "shapes": return (
        <div className="p-4 space-y-3">
          <p className="text-xs text-white/40 uppercase tracking-widest font-semibold">Shapes & Graphics</p>
          <div className="grid grid-cols-3 gap-2">
            {([["rect","Rectangle",Square],["circle","Circle",Circle],["triangle","Triangle",Triangle],["star","Star",Star],["line","Line",Minus]] as [ShapeType, string, any][]).map(([type, label, Icon]) => (
              <button key={type} onClick={() => addShape(type)} className="flex flex-col items-center gap-1.5 p-3 bg-white/5 hover:bg-white/12 rounded-xl transition-colors">
                <Icon className="w-5 h-5 text-white/70" />
                <span className="text-xs text-white/50">{label}</span>
              </button>
            ))}
          </div>
          <p className="text-xs text-white/40 uppercase tracking-widest font-semibold mt-3">Colors</p>
          <div className="flex flex-wrap gap-2">
            {SHAPE_COLORS.map((c) => (
              <button key={c} style={{ background: c }} className="w-7 h-7 rounded-lg border border-white/10 hover:scale-110 transition-transform" onClick={() => { if (selected?.type === "shape") commitUpdate(selected.id, { fill: c }); }} aria-label={`Set shape color to ${c}`} />
            ))}
          </div>
        </div>
      );

      case "layers": return (
        <div className="p-4 space-y-2">
          <p className="text-xs text-white/40 uppercase tracking-widest font-semibold mb-1">Layers</p>
          <p className="text-[10px] text-white/25 mb-2">{ar ? "اسحب لإعادة الترتيب" : "Drag to reorder"}</p>
          {[...elements].sort((a, b) => b.zIndex - a.zIndex).map((el) => (
            <div key={el.id} onClick={() => setSelectedId(el.id)}
              draggable
              onDragStart={(e) => { layerDragIdRef.current = el.id; e.dataTransfer.effectAllowed = "move"; }}
              onDragOver={(e) => { e.preventDefault(); e.dataTransfer.dropEffect = "move"; setLayerDropId(el.id); }}
              onDragLeave={() => setLayerDropId((cur) => (cur === el.id ? null : cur))}
              onDrop={(e) => { e.preventDefault(); reorderLayer(layerDragIdRef.current, el.id); layerDragIdRef.current = null; setLayerDropId(null); }}
              onDragEnd={() => { layerDragIdRef.current = null; setLayerDropId(null); }}
              className={`flex items-center gap-2 px-3 py-2 rounded-xl cursor-pointer transition-colors ${selectedId === el.id ? "bg-blue-600/30 border border-blue-500/40" : "bg-white/5 hover:bg-white/10"} ${layerDropId === el.id ? "ring-1 ring-blue-400/70" : ""}`}>
              <span className="text-xs text-white/30 w-5 flex-shrink-0">{el.type === "text" ? "T" : el.type === "image" ? "I" : "S"}</span>
              <span className="text-xs text-white/70 flex-1 truncate">{el.type === "text" ? (el.content?.slice(0, 20) || "Text") : el.type === "image" ? "Image" : el.shapeType || "Shape"}</span>
              <span className="text-xs text-white/30 flex-shrink-0">{el.face[0].toUpperCase()}</span>
              <button onClick={(e) => { e.stopPropagation(); updateElement(el.id, { visible: !el.visible }); }} aria-label={el.visible ? "Hide layer" : "Show layer"} className="flex-shrink-0 opacity-60 hover:opacity-100">
                {el.visible ? <Eye className="w-3.5 h-3.5 text-white/60" /> : <EyeOff className="w-3.5 h-3.5 text-white/30" />}
              </button>
              <button onClick={(e) => { e.stopPropagation(); updateElement(el.id, { locked: !el.locked }); }} aria-label={el.locked ? "Unlock layer" : "Lock layer"} className="flex-shrink-0 opacity-60 hover:opacity-100">
                {el.locked ? <Lock className="w-3.5 h-3.5 text-amber-400/70" /> : <Unlock className="w-3.5 h-3.5 text-white/30" />}
              </button>
              <div className="flex flex-col gap-0.5">
                <button onClick={(e) => { e.stopPropagation(); moveLayer(el.id, "up"); }} aria-label="Move layer up"><ChevronUp className="w-3 h-3 text-white/40 hover:text-white" /></button>
                <button onClick={(e) => { e.stopPropagation(); moveLayer(el.id, "down"); }} aria-label="Move layer down"><ChevronDown className="w-3 h-3 text-white/40 hover:text-white" /></button>
              </div>
            </div>
          ))}
          {elements.length === 0 && <p className="text-xs text-white/25 text-center py-8">No elements yet.<br />Add text, images, or shapes.</p>}
        </div>
      );

      case "background": return (
        <div className="p-4 space-y-4">
          <p className="text-xs text-white/40 uppercase tracking-widest font-semibold">Background</p>
          <div className="flex gap-2 mb-2">
            {(["front","back","spine"] as Face[]).map((f) => (
              <button key={f} onClick={() => setActiveFace(f)} className={`flex-1 text-xs py-1.5 rounded-lg font-medium transition-colors ${activeFace === f ? "bg-blue-600 text-white" : "bg-white/8 text-white/50 hover:text-white"}`}>
                {f.charAt(0).toUpperCase() + f.slice(1)}
              </button>
            ))}
          </div>

          {/* Spine sync toggle */}
          <div className="flex items-center justify-between bg-white/5 rounded-xl px-3 py-2.5 border border-white/8">
            <div>
              <p className="text-xs text-white/70 font-medium">Auto-sync spine</p>
              <p className="text-[10px] text-white/30 mt-0.5">Blend front & back colors</p>
            </div>
            <button
              onClick={() => setCoverSettings((s) => ({ ...s, spineSync: !s.spineSync }))}
              className={`relative w-9 h-5 rounded-full transition-colors ${coverSettings.spineSync ? "bg-blue-600" : "bg-white/15"}`}
            >
              <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${coverSettings.spineSync ? "left-[18px]" : "left-0.5"}`} />
            </button>
          </div>

          {/* Spine width slider */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <p className="text-xs text-white/30">Spine Width</p>
              <span className="text-xs text-white/50 font-mono">{spineWidth}px</span>
            </div>
            <input type="range" min={SPINE_MIN} max={SPINE_MAX} value={spineWidth} className="w-full accent-blue-500"
              onChange={(e) => setSpineWidth(parseInt(e.target.value))} />
            {spineCalc ? (
              <button
                onClick={() => { setSpineWidth(spineCalc.px); toast({ title: ar ? `عرض الكعب ضُبط على ${spineCalc.pages} صفحة` : `Spine set for ${spineCalc.pages} pages` }); }}
                className="mt-2 w-full flex items-center justify-between bg-emerald-600/15 hover:bg-emerald-600/25 border border-emerald-500/30 rounded-xl px-3 py-2 transition-colors text-left"
              >
                <span className="text-[11px] text-emerald-300 font-semibold">{ar ? "احسب من كتابك" : "Calculate from your book"}</span>
                <span className="text-[10px] text-white/45 font-mono">{spineCalc.pages}p · {spineCalc.inches.toFixed(2)}in</span>
              </button>
            ) : (
              <p className="text-[10px] text-white/20 mt-1">{ar ? "اضبطه حسب عدد الصفحات، رفيع للقصير وعريض للطويل" : "Adjust by page count, thin for novellas and wide for thick novels"}</p>
            )}
          </div>

          <div className="border-t border-white/8" />

          <p className="text-xs text-white/30">Solid Color</p>
          <input type="color" className="w-full h-10 rounded-xl border-0 cursor-pointer bg-transparent"
            value={coverSettings[activeFace].background.startsWith("#") ? coverSettings[activeFace].background : "#1a1a2e"}
            onChange={(e) => {
              setCoverSettings((s) => ({ ...s, [activeFace]: { ...s[activeFace], background: e.target.value } }));
              // If manually editing spine, turn off sync
              if (activeFace === "spine") setCoverSettings((s) => ({ ...s, spineSync: false }));
            }}
          />
          <p className="text-xs text-white/30 mt-2">Gradient Presets</p>
          <div className="grid grid-cols-2 gap-2">
            {GRADIENTS.map((g, i) => (
              <button key={i} style={{ background: g }} className="h-12 rounded-xl border border-white/10 hover:scale-105 transition-transform"
                onClick={() => {
                  setCoverSettings((s) => ({ ...s, [activeFace]: { ...s[activeFace], background: g } }));
                  if (activeFace === "spine") setCoverSettings((s) => ({ ...s, spineSync: false }));
                }} />
            ))}
          </div>

          {/* Quick match spine button (when sync is off) */}
          {!coverSettings.spineSync && activeFace === "spine" && (
            <button
              onClick={() => setCoverSettings((s) => ({ ...s, spineSync: true }))}
              className="w-full flex items-center justify-center gap-2 bg-white/8 hover:bg-white/15 border border-white/10 text-white/70 text-xs font-medium rounded-xl px-3 py-2.5 transition-colors"
            >
              <Palette className="w-3.5 h-3.5" /> Match spine to covers
            </button>
          )}
        </div>
      );

      case "ai": return (
        <div className="p-4 space-y-5">
          {/* AI Cover Artwork: FLUX schnell (Replicate) with Gemini
             fallback on the server. Always generates TEXTLESS art;
             the title/author stay real, editable text elements. */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Wand2 className="w-4 h-4 text-violet-400" />
              <p className="text-xs text-white/70 font-semibold uppercase tracking-widest">
                {ar ? "توليد لوحة الغلاف" : "Generate Cover Artwork"}
              </p>
            </div>
            <p className="text-xs text-white/35 leading-relaxed">
              {ar
                ? "صف الأجواء والألوان وسنولّد لك 4 لوحات فنية بدون أي نصوص. العنوان واسم المؤلف يبقيان نصاً حقيقياً فوق اللوحة."
                : "Describe the mood and colors and we will generate 4 textless artwork options. Title and author stay real text on top."}
            </p>

            {/* Side selector */}
            <div className="flex gap-1.5 bg-white/5 rounded-xl p-1">
              <button
                onClick={() => setAiCoverSide("front")}
                className={`flex-1 text-xs py-1.5 rounded-lg font-semibold transition-colors ${aiCoverSide === "front" ? "bg-violet-600 text-white" : "text-white/40 hover:text-white/70"}`}>
                {ar ? "الوجه الأمامي" : "Front Cover"}
              </button>
              <button
                onClick={() => setAiCoverSide("back")}
                className={`flex-1 text-xs py-1.5 rounded-lg font-semibold transition-colors ${aiCoverSide === "back" ? "bg-violet-600 text-white" : "text-white/40 hover:text-white/70"}`}>
                {ar ? "الوجه الخلفي" : "Back Cover"}
              </button>
            </div>

            {/* Prompt input */}
            <textarea
              rows={4}
              value={aiCoverPrompt}
              onChange={(e) => setAiCoverPrompt(e.target.value)}
              dir="auto"
              placeholder={aiCoverSide === "front"
                ? (ar ? "مثلاً: مدينة متوهجة تحت سماء مليئة بالنجوم، درجات بنفسجي وأزرق داكنة..." : "e.g. A glowing city under a starry sky, dark purple and blue tones...")
                : (ar ? "مثلاً: تدرج داكن هادئ بأنماط هندسية ناعمة، بسيط وأنيق..." : "e.g. Soft geometric patterns on a dark gradient background, minimal and elegant...")}
              className="w-full bg-white/5 border border-white/10 focus:border-violet-500/50 rounded-xl px-3 py-2.5 text-xs text-white/80 placeholder:text-white/25 resize-none outline-none leading-relaxed"
            />

            {/* Quick prompt suggestions (English prompts: image models
               follow English direction far more reliably) */}
            <div className="space-y-1">
              <p className="text-xs text-white/25">{ar ? "اقتراحات سريعة:" : "Quick suggestions:"}</p>
              <div className="flex flex-wrap gap-1">
                {([
                  [ar ? "خيال علمي" : "Sci-fi futuristic", "Futuristic sci-fi scene, glowing structures, deep space palette"],
                  [ar ? "رومانسي دافئ" : "Warm romance", "Warm romantic scene, golden hour light, soft dreamy atmosphere"],
                  [ar ? "غموض وإثارة" : "Mystery thriller", "Dark moody thriller scene, fog, dramatic shadows, high contrast"],
                  [ar ? "أدب كلاسيكي" : "Classic literature", "Elegant painterly scene, muted classic tones, timeless literary mood"],
                  [ar ? "مغامرة" : "Action adventure", "Epic adventure landscape, dramatic sky, cinematic scale"],
                ] as [string, string][]).map(([label, promptText]) => (
                  <button
                    key={label}
                    onClick={() => setAiCoverPrompt(promptText)}
                    className="text-xs px-2 py-1 bg-white/5 hover:bg-white/12 border border-white/8 rounded-lg text-white/50 hover:text-white/80 transition-colors"
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            <button
              onClick={handleAiVariants}
              disabled={aiCoverLoading || !aiCoverPrompt.trim()}
              className="w-full flex items-center justify-center gap-2 bg-violet-600 hover:bg-violet-500 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-semibold rounded-xl px-4 py-2.5 transition-colors"
            >
              {aiCoverLoading
                ? (<><Loader2 className="w-4 h-4 animate-spin" /> {ar ? "جاري التوليد..." : "Generating..."}</>)
                : (<><Sparkles className="w-4 h-4" /> {ar ? "ولّد 4 خيارات" : "Generate 4 options"}</>)}
            </button>

            {/* Variants grid */}
            {(aiCoverLoading || aiVariants.length > 0) && (
              <div className="grid grid-cols-2 gap-2">
                {aiCoverLoading
                  ? Array.from({ length: 4 }, (_, i) => (
                      <div key={i} className="aspect-[2/3] rounded-xl bg-white/5 border border-white/10 animate-pulse" />
                    ))
                  : aiVariants.map((src, i) => (
                      <button
                        key={i}
                        onClick={() => applyAiVariant(src)}
                        title={ar ? "استخدم هذه اللوحة" : "Use this artwork"}
                        className="group relative aspect-[2/3] rounded-xl overflow-hidden border border-white/10 hover:border-violet-400/70 transition-colors"
                      >
                        <img src={src} alt="" className="w-full h-full object-cover" />
                        <span className="absolute inset-0 flex items-end justify-center pb-2 bg-gradient-to-t from-black/70 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity text-[11px] font-semibold text-white">
                          {ar ? "استخدم هذه" : "Use this"}
                        </span>
                      </button>
                    ))}
              </div>
            )}
            {aiVariants.length > 0 && !aiCoverLoading && (
              <p className="text-[11px] text-white/30 leading-relaxed">
                {ar ? "اضغط على لوحة لوضعها على الغلاف. تقدر تعيد التوليد بوصف مختلف في أي وقت." : "Tap an artwork to place it on the cover. Regenerate with a different description anytime."}
              </p>
            )}
          </div>

          {/* Divider */}
          <div className="border-t border-white/8" />

          {/* Back Cover Text — manual entry */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <FileText className="w-4 h-4 text-emerald-400" />
              <p className="text-xs text-white/70 font-semibold uppercase tracking-widest">
                {ar ? "نص الغلاف الخلفي" : "Back Cover Text"}
              </p>
            </div>
            <p className="text-xs text-white/35 leading-relaxed">
              {ar
                ? "اكتب ملخّص الكتاب أو نصّ الغلاف الخلفي هنا، ثم أضِفه ليُوضع على الوجه الخلفي. تقدر تحرّكه وتنسّقه بعدها مثل أي نص."
                : "Write your book summary or back-cover text here, then add it to place it on the back face. You can reposition and restyle it afterwards like any text block."}
            </p>

            <textarea
              value={backCoverText}
              onChange={(e) => setBackCoverText(e.target.value)}
              dir={ar ? "rtl" : "ltr"}
              rows={7}
              placeholder={ar ? "اكتب نصّ الغلاف الخلفي هنا..." : "Type your back-cover text here..."}
              className="w-full bg-white/5 border border-white/10 focus:border-emerald-500/50 rounded-xl px-3 py-2.5 text-sm text-white placeholder-white/25 outline-none resize-y leading-relaxed"
            />

            <button
              onClick={handlePlaceBackCoverText}
              disabled={!backCoverText.trim()}
              className="w-full flex items-center justify-center gap-2 bg-emerald-700 hover:bg-emerald-600 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-semibold rounded-xl px-4 py-2.5 transition-colors"
            >
              <FileText className="w-4 h-4" />
              {ar ? "أضِف إلى الغلاف الخلفي" : "Add to back cover"}
            </button>
          </div>
        </div>
      );

      default: return null;
    }
  };

  /* ─── Properties panel (right) ─── */
  const renderProperties = () => {
    if (!selected) return (
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Face background color */}
        <div>
          <p className="text-xs text-white/40 uppercase tracking-widest font-semibold mb-2 capitalize">{activeFace} Background</p>
          {activeFace === "spine" && coverSettings.spineSync && (
            <p className="text-[10px] text-blue-400/60 mb-2">Auto-synced — change from Background panel to override</p>
          )}
          <input
            type="color"
            className="w-full h-10 rounded-xl border-0 cursor-pointer bg-transparent"
            value={coverSettings[activeFace].background.startsWith("#") ? coverSettings[activeFace].background : "#1a1a2e"}
            onChange={(e) => {
              if (activeFace === "spine") setCoverSettings((s) => ({ ...s, spineSync: false }));
              setCoverSettings((s) => ({ ...s, [activeFace]: { ...s[activeFace], background: e.target.value } }));
            }}
          />
          <div className="flex flex-wrap gap-1.5 mt-2">
            {["#1a1a2e","#0f172a","#111827","#16213e","#0f3460","#1e1b4b","#3b0764","#164e63","#14532d","#7f1d1d","#000000","#ffffff"].map((c) => (
              <button key={c} style={{ background: c }} className="w-6 h-6 rounded-md border border-white/10 hover:scale-110 transition-transform"
                onClick={() => {
                  if (activeFace === "spine") setCoverSettings((s) => ({ ...s, spineSync: false }));
                  setCoverSettings((s) => ({ ...s, [activeFace]: { ...s[activeFace], background: c } }));
                }}
                aria-label={`Set background color to ${c}`} />
            ))}
          </div>
        </div>
        <p className="text-xs text-white/20 text-center pt-2">Click an element<br />to edit its properties</p>
      </div>
    );

    return (
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Element type badge + actions */}
        <div className="flex items-center justify-between">
          <span className="text-xs bg-blue-600/30 text-blue-300 px-2 py-1 rounded-lg font-semibold capitalize">{selected.type}</span>
          <div className="flex gap-1">
            <button onClick={duplicateSelected} aria-label="Duplicate element" className="p-1.5 rounded-lg hover:bg-white/10 text-white/50 hover:text-white transition-colors"><Copy className="w-3.5 h-3.5" /></button>
            <button onClick={deleteSelected} aria-label="Delete element" className="p-1.5 rounded-lg hover:bg-red-500/20 text-white/50 hover:text-red-400 transition-colors"><Trash2 className="w-3.5 h-3.5" /></button>
          </div>
        </div>

        {/* Position & Size */}
        <div>
          <p className="text-xs text-white/40 uppercase tracking-widest font-semibold mb-2">Position & Size</p>
          <div className="grid grid-cols-2 gap-2">
            {[["X", "x"], ["Y", "y"], ["W", "width"], ["H", "height"]].map(([label, key]) => (
              <div key={key} className="flex items-center gap-1.5 bg-white/5 rounded-lg px-2 py-1.5">
                <span className="text-xs text-white/30 w-4">{label}</span>
                <input type="number" className="flex-1 bg-transparent text-xs text-white/80 outline-none w-0" value={Math.round((selected as any)[key])}
                  onChange={(e) => updateElement(selected.id, { [key]: parseFloat(e.target.value) || 0 })}
                  onBlur={() => commitUpdate(selected.id, {})}
                />
              </div>
            ))}
          </div>
        </div>

        {/* Text properties */}
        {selected.type === "text" && (
          <>
            <div>
              <p className="text-xs text-white/40 uppercase tracking-widest font-semibold mb-2">Font</p>
              <select className="w-full bg-white/5 text-white/80 text-xs rounded-lg px-3 py-2 border border-white/10 outline-none mb-2"
                style={{ fontFamily: selected.fontFamily ? `"${selected.fontFamily}", sans-serif` : undefined }}
                value={selected.fontFamily} onChange={(e) => commitUpdate(selected.id, { fontFamily: e.target.value })}>
                <optgroup label={ar ? "خطوط عربية" : "Arabic fonts"}>
                  {ARABIC_FONTS.map((f) => (
                    <option key={f.family} value={f.family} style={{ background: "#1a1a2e", fontFamily: `"${f.family}"` }}>
                      {ar ? f.labelAr : f.label}
                    </option>
                  ))}
                </optgroup>
                <optgroup label={ar ? "خطوط لاتينية" : "Latin fonts"}>
                  {LATIN_FONTS.map((f) => (
                    <option key={f.family} value={f.family} style={{ background: "#1a1a2e", fontFamily: `"${f.family}"` }}>
                      {f.label}
                    </option>
                  ))}
                </optgroup>
              </select>
              {/* live preview of the chosen font with the element's text */}
              <div
                dir="auto"
                className="mb-2 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-white/85 truncate"
                style={{ fontFamily: `"${selected.fontFamily}", sans-serif`, fontSize: 17 }}
              >
                {selected.content || (ar ? "معاينة الخط" : "Font preview")}
              </div>
              {isArabicText(selected.content) && (selected.letterSpacing ?? 0) !== 0 && (
                <p className="text-[10px] leading-relaxed text-amber-400/90 mb-2">
                  {ar
                    ? "تباعد الأحرف يفصل الحروف العربية عن بعضها، أعده إلى صفر لنص عربي سليم"
                    : "Letter spacing disconnects Arabic letters; set it to zero for correct Arabic"}
                </p>
              )}
              <div className="grid grid-cols-2 gap-2">
                <div className="flex items-center gap-1.5 bg-white/5 rounded-lg px-2 py-1.5">
                  <span className="text-xs text-white/30">Sz</span>
                  <input type="number" className="flex-1 bg-transparent text-xs text-white/80 outline-none w-0" value={selected.fontSize}
                    onChange={(e) => commitUpdate(selected.id, { fontSize: parseInt(e.target.value) || 12 })} />
                </div>
                <div className="flex items-center gap-1.5 bg-white/5 rounded-lg px-2 py-1.5">
                  <span className="text-xs text-white/30">Ls</span>
                  <input type="number" className="flex-1 bg-transparent text-xs text-white/80 outline-none w-0" value={selected.letterSpacing || 0}
                    onChange={(e) => commitUpdate(selected.id, { letterSpacing: parseFloat(e.target.value) || 0 })} />
                </div>
              </div>
            </div>
            <div>
              <p className="text-xs text-white/40 uppercase tracking-widest font-semibold mb-2">Style</p>
              <div className="flex gap-1.5">
                <button onClick={() => commitUpdate(selected.id, { fontWeight: selected.fontWeight === "bold" ? "normal" : "bold" })} aria-label="Bold" className={`flex-1 flex items-center justify-center py-2 rounded-lg text-xs font-bold transition-colors ${selected.fontWeight === "bold" ? "bg-blue-600 text-white" : "bg-white/5 text-white/50 hover:bg-white/10"}`}><Bold className="w-3.5 h-3.5" /></button>
                <button onClick={() => commitUpdate(selected.id, { fontStyle: selected.fontStyle === "italic" ? "normal" : "italic" })} aria-label="Italic" className={`flex-1 flex items-center justify-center py-2 rounded-lg text-xs font-bold transition-colors ${selected.fontStyle === "italic" ? "bg-blue-600 text-white" : "bg-white/5 text-white/50 hover:bg-white/10"}`}><Italic className="w-3.5 h-3.5" /></button>
                {(["left","center","right"] as Align[]).map((a) => (
                  <button key={a} onClick={() => commitUpdate(selected.id, { textAlign: a })} aria-label={`Align ${a}`} className={`flex-1 flex items-center justify-center py-2 rounded-lg transition-colors ${selected.textAlign === a ? "bg-blue-600 text-white" : "bg-white/5 text-white/50 hover:bg-white/10"}`}>
                    {a === "left" ? <AlignLeft className="w-3.5 h-3.5" /> : a === "center" ? <AlignCenter className="w-3.5 h-3.5" /> : <AlignRight className="w-3.5 h-3.5" />}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <p className="text-xs text-white/40 uppercase tracking-widest font-semibold mb-2">Color</p>
              <input type="color" className="w-full h-10 rounded-xl border-0 cursor-pointer bg-transparent"
                value={selected.color || "#ffffff"}
                onChange={(e) => commitUpdate(selected.id, { color: e.target.value })}
              />
              <div className="flex flex-wrap gap-1.5 mt-2">
                {["#ffffff","#000000","#f1f5f9","#94a3b8","#f97316","#eab308","#22c55e","#3b82f6","#a855f7","#ec4899"].map((c) => (
                  <button key={c} style={{ background: c }} className="w-6 h-6 rounded-md border border-white/10 hover:scale-110 transition-transform" onClick={() => commitUpdate(selected.id, { color: c })} aria-label={`Set text color to ${c}`} />
                ))}
              </div>
            </div>

            {/* Text effects: preset row, then contextual sliders (the
               Kittl pattern: pick a look, refine with controls) */}
            <div>
              <p className="text-xs text-white/40 uppercase tracking-widest font-semibold mb-2">{ar ? "تأثيرات" : "Effects"}</p>
              <div className="grid grid-cols-3 gap-1.5">
                {([
                  ["none", ar ? "بدون" : "None"],
                  ["shadow", ar ? "ظل" : "Shadow"],
                  ["lift", ar ? "رفع" : "Lift"],
                  ["hollow", ar ? "مفرغ" : "Hollow"],
                  ["neon", ar ? "نيون" : "Neon"],
                  ["background", ar ? "خلفية" : "Highlight"],
                ] as [TextEffect, string][]).map(([fx, label]) => {
                  const active = (selected.effect || "none") === fx;
                  const previewEl: CoverElement = { ...selected, effect: fx, effectIntensity: 60, effectColor: fx === "hollow" || fx === "neon" ? (selected.effectColor || "#3b82f6") : (selected.effectColor || "#000000"), fontSize: 15 };
                  return (
                    <button
                      key={fx}
                      onClick={() => commitUpdate(selected.id, fx === "none"
                        ? { effect: "none" }
                        : { effect: fx, effectIntensity: selected.effectIntensity ?? 50, effectColor: selected.effectColor || (fx === "neon" ? "#38bdf8" : fx === "hollow" ? "#ffffff" : "#000000") })}
                      className={`flex flex-col items-center gap-1 py-2 rounded-lg border transition-colors ${active ? "bg-blue-600/25 border-blue-500/60" : "bg-white/5 border-white/8 hover:bg-white/10"}`}
                    >
                      <span style={{ fontSize: 15, fontWeight: 700, color: fx === "hollow" ? "transparent" : "#fff", lineHeight: 1, ...textEffectStyle(previewEl) }}>
                        {fx === "background" ? <span style={{ ...textEffectSpanStyle(previewEl), padding: "1px 5px" }}>Ag</span> : "Ag"}
                      </span>
                      <span className="text-[9px] text-white/50">{label}</span>
                    </button>
                  );
                })}
              </div>
              {selected.effect && selected.effect !== "none" && (
                <div className="mt-2 space-y-2">
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[10px] text-white/40">{ar ? "الشدة" : "Intensity"}</span>
                      <span className="text-[10px] text-white/50 font-mono">{selected.effectIntensity ?? 50}</span>
                    </div>
                    <input type="range" min="0" max="100" value={selected.effectIntensity ?? 50} className="w-full accent-blue-500"
                      onChange={(e) => updateElement(selected.id, { effectIntensity: parseInt(e.target.value) })}
                      onMouseUp={() => commitUpdate(selected.id, {})} />
                  </div>
                  {selected.effect !== "lift" && (
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] text-white/40 flex-shrink-0">{ar ? "لون التأثير" : "Effect color"}</span>
                      <input type="color" className="flex-1 h-7 rounded-lg border-0 cursor-pointer bg-transparent"
                        value={selected.effectColor || "#000000"}
                        onChange={(e) => commitUpdate(selected.id, { effectColor: e.target.value })} />
                    </div>
                  )}
                </div>
              )}
              {/* Curve: per-letter arc, Latin only (breaks Arabic joining) */}
              {!isArabicText(selected.content) ? (
                <div className="mt-2">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[10px] text-white/40">{ar ? "انحناء" : "Curve"}</span>
                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px] text-white/50 font-mono">{selected.curve || 0}</span>
                      {(selected.curve || 0) !== 0 && (
                        <button onClick={() => commitUpdate(selected.id, { curve: 0 })} className="text-[9px] text-white/40 hover:text-white underline">{ar ? "صفر" : "reset"}</button>
                      )}
                    </div>
                  </div>
                  <input type="range" min="-100" max="100" value={selected.curve || 0} className="w-full accent-blue-500"
                    onChange={(e) => updateElement(selected.id, { curve: parseInt(e.target.value) })}
                    onMouseUp={() => commitUpdate(selected.id, {})} />
                </div>
              ) : (
                <p className="text-[10px] text-white/25 mt-2 leading-relaxed">
                  {ar ? "الانحناء غير متاح للنص العربي حفاظاً على اتصال الحروف" : "Curve is unavailable for Arabic text to keep letters joined"}
                </p>
              )}
            </div>
          </>
        )}

        {/* Image properties */}
        {selected.type === "image" && (
          <>
            <div>
              <p className="text-xs text-white/40 uppercase tracking-widest font-semibold mb-2">Fit</p>
              <div className="flex gap-1.5">
                {(["cover","contain","fill"] as const).map((fit) => (
                  <button key={fit} onClick={() => commitUpdate(selected.id, { objectFit: fit })} className={`flex-1 text-xs py-2 rounded-lg transition-colors ${selected.objectFit === fit ? "bg-blue-600 text-white" : "bg-white/5 text-white/50 hover:bg-white/10"}`}>{fit}</button>
                ))}
              </div>
            </div>
            <div>
              <p className="text-xs text-white/40 uppercase tracking-widest font-semibold mb-2">Opacity: {Math.round((selected.opacity ?? 1) * 100)}%</p>
              <input type="range" min="0" max="1" step="0.01" value={selected.opacity ?? 1} className="w-full accent-blue-500"
                onChange={(e) => commitUpdate(selected.id, { opacity: parseFloat(e.target.value) })} />
            </div>
            <div>
              <p className="text-xs text-white/40 uppercase tracking-widest font-semibold mb-2">Border Radius: {selected.borderRadius ?? 0}px</p>
              <input type="range" min="0" max="48" value={selected.borderRadius ?? 0} className="w-full accent-blue-500"
                onChange={(e) => commitUpdate(selected.id, { borderRadius: parseInt(e.target.value) })} />
            </div>
          </>
        )}

        {/* Shape properties */}
        {selected.type === "shape" && (
          <>
            <div>
              <p className="text-xs text-white/40 uppercase tracking-widest font-semibold mb-2">Fill Color</p>
              <input type="color" className="w-full h-10 rounded-xl border-0 cursor-pointer bg-transparent"
                value={selected.fill || "#ffffff"}
                onChange={(e) => commitUpdate(selected.id, { fill: e.target.value })}
              />
            </div>
            <div>
              <p className="text-xs text-white/40 uppercase tracking-widest font-semibold mb-2">Stroke Color</p>
              <input type="color" className="w-full h-10 rounded-xl border-0 cursor-pointer bg-transparent"
                value={selected.stroke || "#ffffff"}
                onChange={(e) => commitUpdate(selected.id, { stroke: e.target.value })}
              />
            </div>
            <div>
              <p className="text-xs text-white/40 uppercase tracking-widest font-semibold mb-2">Stroke Width: {selected.strokeWidth ?? 0}</p>
              <input type="range" min="0" max="10" value={selected.strokeWidth ?? 0} className="w-full accent-blue-500"
                onChange={(e) => commitUpdate(selected.id, { strokeWidth: parseInt(e.target.value) })} />
            </div>
          </>
        )}

        {/* Layer controls */}
        <div>
          <p className="text-xs text-white/40 uppercase tracking-widest font-semibold mb-2">Layer</p>
          <div className="flex gap-1.5">
            <button onClick={() => moveLayer(selected.id, "up")} className="flex-1 flex items-center justify-center gap-1 py-2 bg-white/5 hover:bg-white/12 rounded-lg text-xs text-white/60 transition-colors"><ChevronUp className="w-3.5 h-3.5" />Bring Up</button>
            <button onClick={() => moveLayer(selected.id, "down")} className="flex-1 flex items-center justify-center gap-1 py-2 bg-white/5 hover:bg-white/12 rounded-lg text-xs text-white/60 transition-colors"><ChevronDown className="w-3.5 h-3.5" />Send Down</button>
          </div>
        </div>
      </div>
    );
  };

  const scaledW = TOTAL_BOOK_W * zoom;
  const scaledH = FACE_H * zoom;

  /* ─── Render ─── */
  return (
    <>
    <SEO title={t("cdSeo")} noindex />
    <div className="flex flex-col h-[100dvh] md:h-screen bg-[#111] text-white overflow-hidden" style={{ fontFamily: "Inter, sans-serif" }}>

      {/* ── Top Bar ── */}
      <div className="flex items-center gap-3 px-4 h-12 bg-[#1a1a1a] border-b border-white/8 flex-shrink-0 z-50">
        <Link href={`/books/${bookId}`}>
          <button className="flex items-center gap-1.5 text-white/50 hover:text-white text-sm transition-colors">
            <ArrowLeft className="w-4 h-4" />
            <span className="hidden sm:inline">{t("cdBack")}</span>
          </button>
        </Link>
        <div className="h-4 w-px bg-white/10" />
        <h1 className="text-sm font-semibold text-white/80 flex-1 truncate">{book?.title || t("cdTitleFallback")}</h1>

        {/* Face selector (desktop; phones get the chips row below) */}
        <div className="hidden md:flex gap-1 bg-white/5 rounded-lg p-1">
          {(["front","back","spine"] as Face[]).map((f) => (
            <button key={f} onClick={() => setActiveFace(f)} className={`text-xs px-3 py-1 rounded-md font-medium transition-colors ${activeFace === f ? "bg-white/20 text-white" : "text-white/40 hover:text-white"}`}>
              {f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          ))}
        </div>

        <div className="hidden md:block h-4 w-px bg-white/10" />

        {/* Undo/Redo */}
        <button onClick={undo} disabled={historyIdx <= 0} className="p-1.5 rounded-lg hover:bg-white/10 text-white/40 hover:text-white disabled:opacity-25 transition-colors" title="Undo" aria-label="Undo"><RotateCcw className="w-4 h-4" /></button>
        <button onClick={redo} disabled={historyIdx >= history.length - 1} className="p-1.5 rounded-lg hover:bg-white/10 text-white/40 hover:text-white disabled:opacity-25 transition-colors rotate-180" title="Redo" aria-label="Redo"><RotateCcw className="w-4 h-4" /></button>

        {/* Zoom (desktop; phones pinch) */}
        <div className="hidden md:flex items-center gap-1 bg-white/5 rounded-lg px-2 py-1">
          <button onClick={() => setZoom((z) => Math.max(0.4, z - 0.1))} aria-label="Zoom out" className="text-white/40 hover:text-white text-sm w-4 text-center">−</button>
          <span className="text-xs text-white/60 w-10 text-center">{Math.round(zoom * 100)}%</span>
          <button onClick={() => setZoom((z) => Math.min(2, z + 0.1))} aria-label="Zoom in" className="text-white/40 hover:text-white text-sm w-4 text-center">+</button>
        </div>

        <div className="hidden md:block h-4 w-px bg-white/10" />
        <button
          onClick={() => setShowGallery(true)}
          className="flex items-center gap-1.5 bg-white/8 hover:bg-white/15 border border-white/10 text-white/80 text-xs font-medium rounded-lg px-3 py-1.5 transition-colors"
          title={ar ? "معرض القوالب" : "Template gallery"}
        >
          <LayoutTemplate className="w-3.5 h-3.5" />
          <span className="hidden md:inline">{ar ? "قوالب" : "Templates"}</span>
        </button>
        <div className="relative">
          <button onClick={() => setExportMenuOpen((v) => !v)} disabled={exporting} className="flex items-center gap-1.5 bg-white/8 hover:bg-white/15 border border-white/10 text-white/80 text-xs font-medium rounded-lg px-3 py-1.5 transition-colors">
            {exporting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
            <span className="hidden md:inline">{ar ? "تصدير" : "Export"}</span>
            <ChevronDown className="w-3 h-3 opacity-60" />
          </button>
          {exportMenuOpen && (
            <>
              <div className="fixed inset-0 z-[120]" onClick={() => setExportMenuOpen(false)} />
              <div className="absolute top-full mt-1.5 right-0 z-[121] w-60 bg-[#1e1e22] border border-white/12 rounded-xl shadow-2xl overflow-hidden py-1" dir={ar ? "rtl" : "ltr"}>
                {([
                  ["screen", ar ? "غلاف كامل للشاشة" : "Full wrap for screen", ar ? "PNG بدقة العرض" : "Screen-resolution PNG"],
                  ["print-front", ar ? "الوجه الأمامي للطباعة" : "Front cover for print", "1600 × 2400"],
                  ["print-wrap", ar ? "غلاف كامل للطباعة" : "Full wrap for print", ar ? "دقة KDP كاملة" : "Full KDP resolution"],
                ] as ["screen" | "print-front" | "print-wrap", string, string][]).map(([preset, label, note]) => (
                  <button key={preset} onClick={() => doExport(preset)}
                    className="w-full flex items-center justify-between gap-3 px-3.5 py-2.5 hover:bg-white/8 transition-colors text-start">
                    <span className="text-xs text-white/85 font-medium">{label}</span>
                    <span className="text-[10px] text-white/35 font-mono flex-shrink-0">{note}</span>
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
        <button onClick={handleSave} disabled={saving} className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold rounded-lg px-3 py-1.5 transition-colors">
          {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
          <span className="hidden md:inline">Save</span>
        </button>
      </div>

      {/* ── Mobile face chips ── */}
      <div className="md:hidden flex items-center justify-center gap-1.5 px-3 py-2 bg-[#141414] border-b border-white/8 flex-shrink-0">
        {(["front","spine","back"] as Face[]).map((f) => (
          <button key={f} onClick={() => setActiveFace(f)}
            className={`flex-1 max-w-[110px] text-xs py-2.5 rounded-lg font-semibold transition-colors ${activeFace === f ? "bg-white/20 text-white" : "bg-white/5 text-white/40"}`}>
            {ar ? (f === "front" ? "أمامي" : f === "spine" ? "كعب" : "خلفي") : f.charAt(0).toUpperCase() + f.slice(1)}
          </button>
        ))}
      </div>

      {/* ── Main Layout ── */}
      <div className="flex flex-1 overflow-hidden min-h-0">

        {/* ── Left Panel ── */}
        <div className="w-[260px] bg-[#161616] border-r border-white/8 hidden md:flex flex-col flex-shrink-0 overflow-hidden">
          {/* Panel tabs */}
          <div className="flex border-b border-white/8 flex-shrink-0">
            {([["text","T", Type],["images","I", ImageIcon],["shapes","S", Square],["layers","L", Layers],["background","B", Palette],["ai","AI", Sparkles]] as [typeof activePanel, string, any][]).map(([panel, short, Icon]) => (
              <button key={panel} onClick={() => setActivePanel(panel)}
                className={`flex-1 flex flex-col items-center gap-0.5 py-2.5 text-xs transition-colors ${activePanel === panel ? (panel === "ai" ? "text-violet-400 border-b-2 border-violet-500" : "text-blue-400 border-b-2 border-blue-500") : "text-white/30 hover:text-white/60"}`}>
                <Icon className={`w-4 h-4 ${panel === "ai" && activePanel !== "ai" ? "text-violet-400/50" : ""}`} />
                <span className="text-[9px] capitalize">{panel}</span>
              </button>
            ))}
          </div>
          {/* Panel content */}
          <div className="flex-1 overflow-y-auto">
            {renderPanel()}
          </div>
        </div>

        {/* ── Canvas (drop zone) ── */}
        <div
          ref={canvasRef}
          className="flex-1 overflow-auto flex bg-[#111] relative p-3 md:p-6"
          style={{ backgroundImage: "radial-gradient(circle, #1e1e1e 1px, transparent 1px)", backgroundSize: "24px 24px" }}
          onClick={() => setSelectedId(null)}
          onDragEnter={handleDragEnter}
          onDragLeave={handleDragLeave}
          onDragOver={handleDragOver}
          onDrop={handleDrop}
        >
          {/* Drag overlay */}
          {isDraggingOver && (
            <div className="absolute inset-0 z-[9999] flex items-center justify-center pointer-events-none" style={{ background: "rgba(59,130,246,0.12)", backdropFilter: "blur(2px)" }}>
              <div className="flex flex-col items-center gap-3 bg-[#1a1a2e]/90 border-2 border-dashed border-blue-500/60 rounded-2xl px-10 py-8">
                <ImageIcon className="w-10 h-10 text-blue-400 animate-bounce" />
                <p className="text-sm text-blue-300 font-semibold">Drop image here</p>
                <p className="text-xs text-white/40">Image will be added to the cover face under your cursor</p>
              </div>
            </div>
          )}
          {/* Book. The sizing wrapper reserves the SCALED footprint so
              the scroll container's bounds follow the zoom (a bare CSS
              transform never affects scroll size — zoomed-in edges were
              unreachable before). margin:auto centers when it fits. */}
          <div style={{ width: scaledW, height: scaledH, margin: "auto", flexShrink: 0, padding: 0 }}>
            <div style={{ transform: `scale(${zoom})`, transformOrigin: "top left", transition: "transform 0.15s ease" }}>
              <div
                ref={bookRef}
                style={{ display: "flex", width: TOTAL_BOOK_W, height: FACE_H, boxShadow: "0 30px 80px rgba(0,0,0,0.8), 0 10px 30px rgba(0,0,0,0.5)", borderRadius: 4, overflow: "hidden", cursor: "default" }}
              >
                {/* Back */}
                <FaceCanvas face="back" />
                {/* Spine */}
                <FaceCanvas face="spine" />
                {/* Front */}
                <FaceCanvas face="front" />
              </div>
            </div>
          </div>
        </div>

        {/* ── Right Properties Panel ── */}
        <div className="w-[220px] bg-[#161616] border-l border-white/8 hidden md:flex flex-col flex-shrink-0 overflow-hidden min-h-0">
          <div className="px-4 py-3 border-b border-white/8 flex-shrink-0">
            <p className="text-xs font-semibold text-white/50 uppercase tracking-widest">Properties</p>
          </div>
          {renderProperties()}
        </div>
      </div>

      {/* ── Mobile: selection context bar ── */}
      {selected && !mobileSheet && (
        <div className="md:hidden flex items-center gap-1 px-2 py-1.5 bg-[#161616] border-t border-white/8 flex-shrink-0" dir={ar ? "rtl" : "ltr"}>
          {selected.type === "text" && (
            <button onClick={() => setEditingId(selected.id)} className="flex items-center gap-1.5 px-3 py-2.5 rounded-lg bg-white/8 text-xs font-semibold text-white/85">
              <Type className="w-4 h-4" /> {ar ? "تحرير" : "Edit"}
            </button>
          )}
          <button onClick={() => setMobileSheet("props")} className="flex items-center gap-1.5 px-3 py-2.5 rounded-lg bg-white/8 text-xs font-semibold text-white/85">
            <Palette className="w-4 h-4" /> {ar ? "خصائص" : "Style"}
          </button>
          <div className="flex-1" />
          <button onClick={duplicateSelected} aria-label="Duplicate" className="p-2.5 rounded-lg text-white/60"><Copy className="w-[18px] h-[18px]" /></button>
          <button onClick={() => moveLayer(selected.id, "up")} aria-label="Layer up" className="p-2.5 rounded-lg text-white/60"><ChevronUp className="w-[18px] h-[18px]" /></button>
          <button onClick={() => moveLayer(selected.id, "down")} aria-label="Layer down" className="p-2.5 rounded-lg text-white/60"><ChevronDown className="w-[18px] h-[18px]" /></button>
          <button onClick={deleteSelected} aria-label="Delete" className="p-2.5 rounded-lg text-red-400/90"><Trash2 className="w-[18px] h-[18px]" /></button>
        </div>
      )}

      {/* ── Mobile: bottom panel tabs ── */}
      <div className="md:hidden flex bg-[#161616] border-t border-white/8 flex-shrink-0" style={{ paddingBottom: "env(safe-area-inset-bottom)" }}>
        {([["text", Type],["images", ImageIcon],["shapes", Square],["layers", Layers],["background", Palette],["ai", Sparkles]] as [typeof activePanel, any][]).map(([panel, Icon]) => (
          <button key={panel} onClick={() => { setActivePanel(panel); setMobileSheet("panel"); }}
            className={`flex-1 flex flex-col items-center gap-0.5 py-2.5 min-h-[52px] transition-colors ${mobileSheet === "panel" && activePanel === panel ? (panel === "ai" ? "text-violet-400" : "text-blue-400") : "text-white/35"}`}>
            <Icon className="w-5 h-5" />
            <span className="text-[9px] capitalize">{panel === "background" ? (ar ? "خلفية" : "BG") : panel}</span>
          </button>
        ))}
      </div>

      {/* ── Mobile: bottom sheet (panels + properties) ── */}
      {mobileSheet && (
        <div className="md:hidden fixed inset-0 z-[110]" onClick={() => setMobileSheet(null)}>
          <div className="absolute inset-0 bg-black/50" />
          <div
            className="absolute bottom-0 left-0 right-0 max-h-[62dvh] bg-[#181818] rounded-t-2xl border-t border-white/12 flex flex-col shadow-2xl"
            style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-center pt-2"><div className="w-9 h-1 rounded-full bg-white/20" /></div>
            <div className="flex items-center justify-between px-4 pt-1 pb-1" dir={ar ? "rtl" : "ltr"}>
              <p className="text-xs font-semibold text-white/50 uppercase tracking-widest">
                {mobileSheet === "props" ? (ar ? "خصائص العنصر" : "Properties") : activePanel}
              </p>
              <button onClick={() => setMobileSheet(null)} aria-label={ar ? "إغلاق" : "Close"} className="p-2 -m-1 text-white/50 text-base leading-none">✕</button>
            </div>
            <div className="flex-1 overflow-y-auto overscroll-contain min-h-0">
              {mobileSheet === "props" ? renderProperties() : renderPanel()}
            </div>
          </div>
        </div>
      )}

    </div>

    {/* ── 3D mockup moment (after save) ── */}
    {mockupUrl && (
      <div
        className="fixed inset-0 z-[140] flex flex-col items-center justify-center gap-8 p-6"
        style={{ background: "rgba(8,8,10,0.94)", backdropFilter: "blur(16px)" }}
        onClick={() => setMockupUrl(null)}
        dir={ar ? "rtl" : "ltr"}
      >
        <div className="text-center">
          <p className="text-lg font-bold text-white" style={{ letterSpacing: "-0.01em" }}>
            {ar ? "غلافك جاهز" : "Your cover is ready"}
          </p>
          <p className="text-xs text-white/45 mt-1.5">
            {ar ? "مرر فوق الكتاب لتراه من زاوية حقيقية" : "Hover the book to see it from a real angle"}
          </p>
        </div>
        <div className="w-56 sm:w-64" onClick={(e) => e.stopPropagation()}>
          <PerspectiveBook spineColor={coverSettings.spine.background.startsWith("#") ? coverSettings.spine.background : "#1a1a2e"}>
            <img src={mockupUrl} alt="" className="w-full h-full object-cover" />
          </PerspectiveBook>
        </div>
        <button
          onClick={() => setMockupUrl(null)}
          className="px-6 py-2.5 rounded-xl bg-white text-black text-sm font-semibold hover:bg-white/90 transition-colors"
        >
          {ar ? "متابعة التصميم" : "Keep designing"}
        </button>
      </div>
    )}

    {/* ── Template gallery ── */}
    {showGallery && (
      <TemplateGallery
        bookTitle={(book as any)?.title || ""}
        bookAuthor={(book as any)?.authorName || ""}
        ar={ar}
        onPick={applyTemplate}
        onStartBlank={() => setShowGallery(false)}
        onClose={() => setShowGallery(false)}
      />
    )}
    </>
  );
}
