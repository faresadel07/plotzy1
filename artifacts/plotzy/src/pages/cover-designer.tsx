import { useState, useRef, useCallback, useEffect } from "react";
import { useRoute, Link } from "wouter";
import { useBook, useUpdateBook, useGenerateCover, useGenerateBlurb } from "@/hooks/use-books";
import { loadEditorFonts } from "@/lib/load-editor-fonts";
import { useToast } from "@/hooks/use-toast";
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

/* ─── Types ─────────────────────────────────── */
type Face = "front" | "back" | "spine";
type ElementType = "text" | "image" | "shape";
type ShapeType = "rect" | "circle" | "triangle" | "star" | "line";
type Align = "left" | "center" | "right";

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

const FONTS = ["Inter", "Playfair Display", "Merriweather", "Oswald", "Lato", "Montserrat", "Georgia", "Times New Roman", "Courier New", "Impact"];

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

/* ─── Drag state ────────────────────────────── */
type DragState = { id: string; startMX: number; startMY: number; origX: number; origY: number } | null;
type ResizeState = { id: string; handle: string; startMX: number; startMY: number; origX: number; origY: number; origW: number; origH: number } | null;

export default function CoverDesigner() {
  const [, params] = useRoute("/books/:id/cover-designer");
  const bookId = params?.id ? parseInt(params.id) : 0;
  const { toast } = useToast();
  const { data: book, isLoading } = useBook(bookId);
  const updateBook = useUpdateBook();

  useEffect(() => { loadEditorFonts(); }, []);

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
  const [historyIdx, setHistoryIdx] = useState(0);
  const [aiCoverPrompt, setAiCoverPrompt] = useState("");
  const [aiCoverSide, setAiCoverSide] = useState<"front" | "back">("front");
  const [aiCoverLoading, setAiCoverLoading] = useState(false);
  const [aiBlurbLoading, setAiBlurbLoading] = useState(false);

  const generateCover = useGenerateCover();
  const generateBlurb = useGenerateBlurb();

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
      if (saved.settings) setCoverSettings({ spineSync: true, ...saved.settings });
      if (saved.spineWidth) setSpineWidth(saved.spineWidth);
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
  // re-run when book ID, saved data status, or AI-generated images change
  }, [book?.id, !!(book as any)?.coverData, (book as any)?.coverImage, (book as any)?.backCoverImage]);

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
      setElements((els) =>
        els.map((el) => {
          if (el.id !== id) return el;
          const faceW = FACE_W[el.face];
          const newX = Math.max(-el.width / 2, Math.min(faceW - el.width / 2, origX + dx));
          const newY = Math.max(-el.height / 2, Math.min(FACE_H - el.height / 2, origY + dy));
          return { ...el, x: newX, y: newY };
        })
      );
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
  }, [zoom]);

  const onMouseUp = useCallback(() => {
    if (dragRef.current || resizeRef.current) {
      dragRef.current = null;
      resizeRef.current = null;
      setElements((els) => {
        pushHistory(els);
        return els;
      });
    }
  }, [pushHistory]);

  useEffect(() => {
    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
    return () => {
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
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

  /* ─── Export ─── */
  const handleExport = async () => {
    if (!bookRef.current) return;
    const prevSelected = selectedId;
    setSelectedId(null); // hide selection outlines before capture
    setExporting(true);
    // Wait one frame for React to remove outlines
    await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));
    try {
      const canvas = await html2canvas(bookRef.current, {
        scale: 3,
        useCORS: true,
        allowTaint: true,
        backgroundColor: null,
      });
      const url = canvas.toDataURL("image/png");
      const a = document.createElement("a");
      a.href = url;
      a.download = `${book?.title || "cover"}-design.png`;
      a.click();
      toast({ title: "Cover exported as PNG!" });
    } catch {
      toast({ title: "Export failed", variant: "destructive" });
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
    await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));
    try {
      // Capture front face thumbnail by data attribute (safe, no magic index)
      let coverImage: string | undefined;
      const frontEl = bookRef.current?.querySelector('[data-face="front"]') as HTMLElement | undefined;
      if (frontEl) {
        try {
          const thumbCanvas = await html2canvas(frontEl, { scale: 1.5, useCORS: true, allowTaint: true, backgroundColor: null });
          coverImage = thumbCanvas.toDataURL("image/jpeg", 0.85);
        } catch { /* thumbnail failure is non-fatal */ }
      }

      await updateBook.mutateAsync({
        id: bookId,
        spineColor: coverSettings.spine.background,
        coverData: { elements, settings: coverSettings, spineWidth },
        ...(coverImage ? { coverImage } : {}),
      } as any);
      toast({ title: "Design saved!" });
    } catch {
      toast({ title: "Save failed", variant: "destructive" });
    } finally {
      setSaving(false);
      setSelectedId(prevSelected);
    }
  };

  /* ─── AI: Generate Cover Image ─── */
  const handleAiGenerateCover = async () => {
    if (!aiCoverPrompt.trim()) {
      toast({ title: "Please enter a cover description", variant: "destructive" });
      return;
    }
    setAiCoverLoading(true);
    try {
      const result = await generateCover.mutateAsync({ id: bookId, prompt: aiCoverPrompt, side: aiCoverSide });
      const imgUrl = (result as any).url;
      if (imgUrl) {
        const el: CoverElement = {
          id: nanoid(), type: "image", face: aiCoverSide,
          x: 0, y: 0, width: FACE_W[aiCoverSide], height: FACE_H,
          zIndex: 1, visible: true, locked: false,
          src: imgUrl, objectFit: "cover", opacity: 1, borderRadius: 0,
        };
        const newEls = [...elements, el];
        updateElements(newEls);
        setSelectedId(el.id);
        setActiveFace(aiCoverSide);
        // Auto-save coverData so the design persists on next open
        try {
          await updateBook.mutateAsync({
            id: bookId,
            coverData: { elements: newEls, settings: coverSettings, spineWidth },
          } as any);
        } catch { /* auto-save failure is non-fatal */ }
        toast({ title: `✨ ${aiCoverSide === "front" ? "Front" : "Back"} cover generated!` });
      } else {
        toast({ title: "Cover generated — refresh to see the image" });
      }
    } catch {
      toast({ title: "Failed to generate cover", variant: "destructive" });
    } finally {
      setAiCoverLoading(false);
    }
  };

  /* ─── AI: Generate Blurb (back cover summary) ─── */
  const handleAiGenerateBlurb = async () => {
    setAiBlurbLoading(true);
    try {
      const result = await generateBlurb.mutateAsync({ id: bookId, language: book?.language || "en" });
      const blurb = (result as any).blurb as string;
      if (blurb) {
        const el: CoverElement = {
          id: nanoid(), type: "text", face: "back",
          x: 20, y: 80, width: FACE_W.back - 40, height: 260,
          zIndex: 10, visible: true, locked: false,
          content: blurb, fontSize: 9, fontFamily: "Inter",
          fontWeight: "normal", color: "#ffffff", textAlign: "center",
          lineHeight: 1.6, letterSpacing: 0,
        };
        updateElements([...elements, el]);
        setSelectedId(el.id);
        setActiveFace("back");
        toast({ title: "✨ Back cover summary generated!" });
      }
    } catch {
      toast({ title: "Failed to generate summary", variant: "destructive" });
    } finally {
      setAiBlurbLoading(false);
    }
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

    const handleMouseDown = (e: React.MouseEvent) => {
      if (el.locked) return;
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
        }}
        onMouseDown={handleMouseDown}
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
              onClick={(e) => e.stopPropagation()}
            />
          ) : (
            <div style={{ width: "100%", height: "100%", color: el.color, fontSize: el.fontSize, fontFamily: el.fontFamily, fontWeight: el.fontWeight, fontStyle: el.fontStyle, textAlign: el.textAlign, lineHeight: el.lineHeight, letterSpacing: `${el.letterSpacing}px`, overflow: "hidden", wordBreak: "break-word", whiteSpace: "pre-wrap" }}>
              {el.content}
            </div>
          )
        )}
        {el.type === "image" && (
          <img src={el.src} alt="" style={{ width: "100%", height: "100%", objectFit: el.objectFit, borderRadius: el.borderRadius, opacity: el.opacity, display: "block", pointerEvents: "none" }} />
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
            const top = h.includes("n") ? -4 : h.includes("s") ? "calc(100% - 4px)" : "calc(50% - 4px)";
            const left = h.includes("w") ? -4 : h.includes("e") ? "calc(100% - 4px)" : "calc(50% - 4px)";
            return (
              <div
                key={h}
                style={{ position: "absolute", top, left, width: 8, height: 8, background: "#3b82f6", border: "1.5px solid white", borderRadius: 2, cursor: handleCursor[h], zIndex: 9999 }}
                onMouseDown={(e) => {
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
        {/* Spine blend overlays — subtle gradient edges to connect with front/back */}
        {isSpine && (
          <>
            <div style={{ position: "absolute", inset: 0, background: spineEdgeLeft, pointerEvents: "none", zIndex: 0 }} />
            <div style={{ position: "absolute", inset: 0, background: spineEdgeRight, pointerEvents: "none", zIndex: 0 }} />
            {/* Subtle inner shadow for book crease feel */}
            <div style={{ position: "absolute", inset: 0, boxShadow: "inset 2px 0 6px rgba(0,0,0,0.3), inset -2px 0 6px rgba(0,0,0,0.3)", pointerEvents: "none", zIndex: 1 }} />
          </>
        )}
        {/* Edge shadow on cover sides adjacent to spine */}
        {face === "back" && (
          <div style={{ position: "absolute", top: 0, right: 0, width: 12, height: "100%", background: "linear-gradient(to left, rgba(0,0,0,0.25), transparent)", pointerEvents: "none", zIndex: 9990 }} />
        )}
        {face === "front" && (
          <div style={{ position: "absolute", top: 0, left: 0, width: 12, height: "100%", background: "linear-gradient(to right, rgba(0,0,0,0.25), transparent)", pointerEvents: "none", zIndex: 9990 }} />
        )}

        {/* Spine text is rotated */}
        {faceElements.map((el) =>
          face === "spine" ? (
            <div
              key={el.id}
              style={{ position: "absolute", left: el.x, top: el.y, width: el.width, height: el.height, zIndex: el.zIndex + 2, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", outline: selectedId === el.id ? "2px solid #3b82f6" : "none", outlineOffset: 1, boxSizing: "border-box" }}
              onMouseDown={(e) => { e.stopPropagation(); setSelectedId(el.id); }}
              onClick={(e) => e.stopPropagation()}
            >
              {el.type === "text" && (
                <div style={{ writingMode: "vertical-rl", transform: "rotate(180deg)", color: el.color, fontSize: el.fontSize, fontFamily: el.fontFamily, fontWeight: el.fontWeight, textAlign: "center", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", letterSpacing: `${el.letterSpacing || 0}px` }}>
                  {el.content}
                </div>
              )}
            </div>
          ) : renderElement(el)
        )}
        {/* Active face indicator */}
        {activeFace === face && (
          <div style={{ position: "absolute", inset: 0, border: "2px solid rgba(59,130,246,0.5)", pointerEvents: "none", zIndex: 9998 }} />
        )}
        {/* Label */}
        <div style={{ position: "absolute", top: 6, ...(isSpine ? { left: "50%", transform: "translateX(-50%)" } : { left: 8 }), fontSize: 9, color: "rgba(255,255,255,0.3)", letterSpacing: 2, textTransform: "uppercase", fontFamily: "Inter", pointerEvents: "none", zIndex: 9999, writingMode: isSpine ? "vertical-rl" : "horizontal-tb" }}>
          {face}
        </div>
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
          <div className="space-y-1.5">
            {[{ label: "Large Title", size: 40, weight: "bold", family: "Playfair Display" }, { label: "Subtitle", size: 20, weight: "600", family: "Merriweather" }, { label: "Author Name", size: 14, weight: "normal", family: "Inter" }, { label: "Body Text", size: 12, weight: "normal", family: "Inter" }].map((preset) => (
              <button key={preset.label} onClick={() => {
                const el: CoverElement = { id: nanoid(), type: "text", face: activeFace, x: 20, y: 180, width: FACE_W[activeFace] - 40, height: 80, zIndex: elements.length + 1, visible: true, locked: false, content: preset.label, fontSize: preset.size, fontFamily: preset.family, fontWeight: preset.weight, color: "#ffffff", textAlign: "center", lineHeight: 1.2, letterSpacing: 0 };
                updateElements([...elements, el]); setSelectedId(el.id);
              }} className="w-full text-left px-3 py-2 rounded-xl bg-white/5 hover:bg-white/10 transition-colors text-sm text-white/80" style={{ fontFamily: preset.family, fontWeight: preset.weight, fontSize: 13 }}>
                {preset.label}
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
              <button key={c} style={{ background: c }} className="w-7 h-7 rounded-lg border border-white/10 hover:scale-110 transition-transform" onClick={() => { if (selected?.type === "shape") commitUpdate(selected.id, { fill: c }); }} />
            ))}
          </div>
        </div>
      );

      case "layers": return (
        <div className="p-4 space-y-2">
          <p className="text-xs text-white/40 uppercase tracking-widest font-semibold mb-3">Layers</p>
          {[...elements].reverse().map((el) => (
            <div key={el.id} onClick={() => setSelectedId(el.id)} className={`flex items-center gap-2 px-3 py-2 rounded-xl cursor-pointer transition-colors ${selectedId === el.id ? "bg-blue-600/30 border border-blue-500/40" : "bg-white/5 hover:bg-white/10"}`}>
              <span className="text-xs text-white/30 w-5 flex-shrink-0">{el.type === "text" ? "T" : el.type === "image" ? "I" : "S"}</span>
              <span className="text-xs text-white/70 flex-1 truncate">{el.type === "text" ? (el.content?.slice(0, 20) || "Text") : el.type === "image" ? "Image" : el.shapeType || "Shape"}</span>
              <span className="text-xs text-white/30 flex-shrink-0">{el.face[0].toUpperCase()}</span>
              <button onClick={(e) => { e.stopPropagation(); updateElement(el.id, { visible: !el.visible }); }} className="flex-shrink-0 opacity-60 hover:opacity-100">
                {el.visible ? <Eye className="w-3.5 h-3.5 text-white/60" /> : <EyeOff className="w-3.5 h-3.5 text-white/30" />}
              </button>
              <button onClick={(e) => { e.stopPropagation(); updateElement(el.id, { locked: !el.locked }); }} className="flex-shrink-0 opacity-60 hover:opacity-100">
                {el.locked ? <Lock className="w-3.5 h-3.5 text-amber-400/70" /> : <Unlock className="w-3.5 h-3.5 text-white/30" />}
              </button>
              <div className="flex flex-col gap-0.5">
                <button onClick={(e) => { e.stopPropagation(); moveLayer(el.id, "up"); }}><ChevronUp className="w-3 h-3 text-white/40 hover:text-white" /></button>
                <button onClick={(e) => { e.stopPropagation(); moveLayer(el.id, "down"); }}><ChevronDown className="w-3 h-3 text-white/40 hover:text-white" /></button>
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
            <p className="text-[10px] text-white/20 mt-1">Adjust based on page count — thin for novellas, wide for thick novels</p>
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
          {/* AI Cover Image */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Wand2 className="w-4 h-4 text-violet-400" />
              <p className="text-xs text-white/70 font-semibold uppercase tracking-widest">Generate Cover Image</p>
            </div>
            <p className="text-xs text-white/35 leading-relaxed">Describe the cover you want and AI will generate a professional image for it.</p>

            {/* Side selector */}
            <div className="flex gap-1.5 bg-white/5 rounded-xl p-1">
              <button onClick={() => setAiCoverSide("front")} className={`flex-1 text-xs py-1.5 rounded-lg font-semibold transition-colors ${aiCoverSide === "front" ? "bg-violet-600 text-white" : "text-white/40 hover:text-white"}`}>
                Front Cover
              </button>
              <button onClick={() => setAiCoverSide("back")} className={`flex-1 text-xs py-1.5 rounded-lg font-semibold transition-colors ${aiCoverSide === "back" ? "bg-violet-600 text-white" : "text-white/40 hover:text-white"}`}>
                Back Cover
              </button>
            </div>

            {/* Prompt input */}
            <textarea
              rows={4}
              value={aiCoverPrompt}
              onChange={(e) => setAiCoverPrompt(e.target.value)}
              placeholder={aiCoverSide === "front"
                ? "e.g. Sci-fi cover with a glowing city under a starry sky, dark purple and blue tones..."
                : "e.g. Soft geometric patterns on a dark gradient background, minimal and elegant..."}
              className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-xs text-white/80 placeholder:text-white/25 resize-none outline-none focus:border-violet-500/60 transition-colors leading-relaxed"
            />

            {/* Quick prompt suggestions */}
            <div className="space-y-1">
              <p className="text-xs text-white/25">Quick suggestions:</p>
              <div className="flex flex-wrap gap-1">
                {[
                  "Sci-fi futuristic",
                  "Warm romance",
                  "Mystery & thriller",
                  "Classic literature",
                  "Action adventure",
                ].map((s) => (
                  <button key={s} onClick={() => setAiCoverPrompt((p) => p ? p + ", " + s : s)}
                    className="text-xs px-2 py-1 bg-white/5 hover:bg-violet-600/30 border border-white/8 hover:border-violet-500/40 rounded-lg text-white/50 hover:text-violet-300 transition-all">
                    {s}
                  </button>
                ))}
              </div>
            </div>

            <button
              onClick={handleAiGenerateCover}
              disabled={aiCoverLoading || !aiCoverPrompt.trim()}
              className="w-full flex items-center justify-center gap-2 bg-violet-600 hover:bg-violet-500 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-semibold rounded-xl px-4 py-2.5 transition-colors"
            >
              {aiCoverLoading
                ? <><Loader2 className="w-4 h-4 animate-spin" /> Generating...</>
                : <><Sparkles className="w-4 h-4" /> Generate Cover with AI</>}
            </button>
          </div>

          {/* Divider */}
          <div className="border-t border-white/8" />

          {/* AI Back Cover Summary */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <FileText className="w-4 h-4 text-emerald-400" />
              <p className="text-xs text-white/70 font-semibold uppercase tracking-widest">Back Cover Summary</p>
            </div>
            <p className="text-xs text-white/35 leading-relaxed">
              AI reads your chapters and writes a compelling back-cover blurb, placed automatically on the back face.
            </p>

            <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-3">
              <p className="text-xs text-emerald-300/80 leading-relaxed">
                📖 Will analyze <span className="font-semibold text-emerald-300">"{book?.title}"</span> and craft a reader-hook blurb without spoiling the ending.
              </p>
            </div>

            <button
              onClick={handleAiGenerateBlurb}
              disabled={aiBlurbLoading}
              className="w-full flex items-center justify-center gap-2 bg-emerald-700 hover:bg-emerald-600 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-semibold rounded-xl px-4 py-2.5 transition-colors"
            >
              {aiBlurbLoading
                ? <><Loader2 className="w-4 h-4 animate-spin" /> Writing blurb...</>
                : <><Sparkles className="w-4 h-4" /> Generate Back Summary</>}
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
                }} />
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
            <button onClick={duplicateSelected} className="p-1.5 rounded-lg hover:bg-white/10 text-white/50 hover:text-white transition-colors"><Copy className="w-3.5 h-3.5" /></button>
            <button onClick={deleteSelected} className="p-1.5 rounded-lg hover:bg-red-500/20 text-white/50 hover:text-red-400 transition-colors"><Trash2 className="w-3.5 h-3.5" /></button>
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
                value={selected.fontFamily} onChange={(e) => commitUpdate(selected.id, { fontFamily: e.target.value })}>
                {FONTS.map((f) => <option key={f} value={f} style={{ background: "#1a1a2e" }}>{f}</option>)}
              </select>
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
                <button onClick={() => commitUpdate(selected.id, { fontWeight: selected.fontWeight === "bold" ? "normal" : "bold" })} className={`flex-1 flex items-center justify-center py-2 rounded-lg text-xs font-bold transition-colors ${selected.fontWeight === "bold" ? "bg-blue-600 text-white" : "bg-white/5 text-white/50 hover:bg-white/10"}`}><Bold className="w-3.5 h-3.5" /></button>
                <button onClick={() => commitUpdate(selected.id, { fontStyle: selected.fontStyle === "italic" ? "normal" : "italic" })} className={`flex-1 flex items-center justify-center py-2 rounded-lg text-xs font-bold transition-colors ${selected.fontStyle === "italic" ? "bg-blue-600 text-white" : "bg-white/5 text-white/50 hover:bg-white/10"}`}><Italic className="w-3.5 h-3.5" /></button>
                {(["left","center","right"] as Align[]).map((a) => (
                  <button key={a} onClick={() => commitUpdate(selected.id, { textAlign: a })} className={`flex-1 flex items-center justify-center py-2 rounded-lg transition-colors ${selected.textAlign === a ? "bg-blue-600 text-white" : "bg-white/5 text-white/50 hover:bg-white/10"}`}>
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
                  <button key={c} style={{ background: c }} className="w-6 h-6 rounded-md border border-white/10 hover:scale-110 transition-transform" onClick={() => commitUpdate(selected.id, { color: c })} />
                ))}
              </div>
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
    {/* Mobile warning — cover designer needs desktop */}
    <div className="md:hidden flex flex-col items-center justify-center h-screen p-8 text-center bg-[#111] text-white" style={{ fontFamily: "Inter, sans-serif" }}>
      <div style={{ fontSize: 48, marginBottom: 16 }}>🖥️</div>
      <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 8 }}>Desktop Required</h2>
      <p style={{ fontSize: 14, color: "rgba(255,255,255,0.5)", lineHeight: 1.6, maxWidth: 320 }}>
        The Cover Designer needs more screen space. Please open this page on a tablet or desktop for the best experience.
      </p>
      <Link href={`/books/${bookId}`}>
        <button style={{ marginTop: 24, padding: "10px 20px", borderRadius: 10, background: "#fff", color: "#000", border: "none", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
          Back to Book
        </button>
      </Link>
    </div>
    <div className="hidden md:flex flex-col h-screen bg-[#111] text-white overflow-hidden" style={{ fontFamily: "Inter, sans-serif" }}>

      {/* ── Top Bar ── */}
      <div className="flex items-center gap-3 px-4 h-12 bg-[#1a1a1a] border-b border-white/8 flex-shrink-0 z-50">
        <Link href={`/books/${bookId}`}>
          <button className="flex items-center gap-1.5 text-white/50 hover:text-white text-sm transition-colors">
            <ArrowLeft className="w-4 h-4" />
            <span className="hidden sm:inline">Back</span>
          </button>
        </Link>
        <div className="h-4 w-px bg-white/10" />
        <h1 className="text-sm font-semibold text-white/80 flex-1 truncate">{book?.title || "Book Cover Designer"}</h1>

        {/* Face selector */}
        <div className="flex gap-1 bg-white/5 rounded-lg p-1">
          {(["front","back","spine"] as Face[]).map((f) => (
            <button key={f} onClick={() => setActiveFace(f)} className={`text-xs px-3 py-1 rounded-md font-medium transition-colors ${activeFace === f ? "bg-white/20 text-white" : "text-white/40 hover:text-white"}`}>
              {f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          ))}
        </div>

        <div className="h-4 w-px bg-white/10" />

        {/* Undo/Redo */}
        <button onClick={undo} disabled={historyIdx <= 0} className="p-1.5 rounded-lg hover:bg-white/10 text-white/40 hover:text-white disabled:opacity-25 transition-colors" title="Undo"><RotateCcw className="w-4 h-4" /></button>
        <button onClick={redo} disabled={historyIdx >= history.length - 1} className="p-1.5 rounded-lg hover:bg-white/10 text-white/40 hover:text-white disabled:opacity-25 transition-colors rotate-180" title="Redo"><RotateCcw className="w-4 h-4" /></button>

        {/* Zoom */}
        <div className="flex items-center gap-1 bg-white/5 rounded-lg px-2 py-1">
          <button onClick={() => setZoom((z) => Math.max(0.4, z - 0.1))} className="text-white/40 hover:text-white text-sm w-4 text-center">−</button>
          <span className="text-xs text-white/60 w-10 text-center">{Math.round(zoom * 100)}%</span>
          <button onClick={() => setZoom((z) => Math.min(2, z + 0.1))} className="text-white/40 hover:text-white text-sm w-4 text-center">+</button>
        </div>

        <div className="h-4 w-px bg-white/10" />
        <button onClick={handleExport} disabled={exporting} className="flex items-center gap-1.5 bg-white/8 hover:bg-white/15 border border-white/10 text-white/80 text-xs font-medium rounded-lg px-3 py-1.5 transition-colors">
          {exporting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
          Export PNG
        </button>
        <button onClick={handleSave} disabled={saving} className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold rounded-lg px-3 py-1.5 transition-colors">
          {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
          Save
        </button>
      </div>

      {/* ── Main Layout ── */}
      <div className="flex flex-1 overflow-hidden min-h-0">

        {/* ── Left Panel ── */}
        <div className="w-[260px] bg-[#161616] border-r border-white/8 flex flex-col flex-shrink-0 overflow-hidden">
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
          className="flex-1 overflow-auto flex items-center justify-center bg-[#111] relative"
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
          {/* Book */}
          <div style={{ transform: `scale(${zoom})`, transformOrigin: "center center", transition: "transform 0.15s ease" }}>
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

        {/* ── Right Properties Panel ── */}
        <div className="w-[220px] bg-[#161616] border-l border-white/8 flex flex-col flex-shrink-0 overflow-hidden min-h-0">
          <div className="px-4 py-3 border-b border-white/8 flex-shrink-0">
            <p className="text-xs font-semibold text-white/50 uppercase tracking-widest">Properties</p>
          </div>
          {renderProperties()}
        </div>
      </div>

      {/* keyboard shortcut: Delete */}
      <input type="text" className="sr-only" onKeyDown={(e) => { if (e.key === "Delete" || e.key === "Backspace") deleteSelected(); }} />
    </div>
    </>
  );
}
