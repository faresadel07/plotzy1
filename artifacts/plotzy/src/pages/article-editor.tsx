import { useState, useRef, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import { useRoute, Link } from "wouter";
import { sanitizeHtml } from "@/lib/sanitize";
import { Layout } from "@/components/layout";
import { useBook, useUpdateBook } from "@/hooks/use-books";
import { useEditor, EditorContent, ReactNodeViewRenderer, NodeViewWrapper } from "@tiptap/react";
import type { NodeViewProps } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Underline from "@tiptap/extension-underline";
import TextAlign from "@tiptap/extension-text-align";
import { TextStyle } from "@tiptap/extension-text-style";
import Color from "@tiptap/extension-color";
import FontFamily from "@tiptap/extension-font-family";
import Highlight from "@tiptap/extension-highlight";
import Link2 from "@tiptap/extension-link";
import Placeholder from "@tiptap/extension-placeholder";
import { Extension } from "@tiptap/core";
import TiptapImage from "@tiptap/extension-image";
import type { Editor } from "@tiptap/react";
import {
  ArrowLeft, ImageIcon, Loader2, Save, Eye, X, Plus, Upload,
  CheckCircle2, Hash, BarChart2, AlignLeft, AlignCenter, AlignRight, AlignJustify,
  Maximize2, Minimize2, FileText, Sparkles, Target,
  Bold, Italic, Underline as UIcon, Strikethrough,
  List, ListOrdered, Quote, Code, Minus,
  Link as LinkIcon, Undo2, Redo2, ChevronDown,
  Highlighter, Type, Indent, Outdent, Mic, Square, GripVertical, Search, Globe, Send as SendIcon,
  Share2, Copy, Check, Download,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { queryClient } from "@/lib/queryClient";
import { useLanguage } from "@/contexts/language-context";
import { AIAssistant } from "@/components/ai-assistant";
import { FloatingImageOverlay, type FloatingImage } from "@/components/FloatingImageOverlay";
import { AmbientSoundscape } from "@/components/AmbientSoundscape";

/* ── FontSize extension ─────────────────────────────────────────────── */
const FontSize = Extension.create({
  name: "fontSize",
  addGlobalAttributes() {
    return [{ types: ["textStyle"], attributes: {
      fontSize: {
        default: null,
        parseHTML: el => el.style.fontSize?.replace("px", "") || null,
        renderHTML: attrs => attrs.fontSize ? { style: `font-size:${attrs.fontSize}px` } : {},
      },
    }}];
  },
  addCommands() {
    return {
      setFontSize: (size: number) => ({ chain }: any) =>
        chain().setMark("textStyle", { fontSize: size }).run(),
    } as any;
  },
});

/* ── Design tokens ──────────────────────────────────────────────────── */
const SF  = "-apple-system,BlinkMacSystemFont,'SF Pro Text','Helvetica Neue',sans-serif";
const BG  = "#0a0a0a";
const C1  = "#111111";
const C2  = "#161616";
const B   = "rgba(255,255,255,0.07)";
const B2  = "rgba(255,255,255,0.04)";
const T   = "rgba(255,255,255,0.88)";
const TS  = "rgba(255,255,255,0.45)";
const TD  = "rgba(255,255,255,0.20)";
const ACC = "#7c6af7";

/* ── Fonts ──────────────────────────────────────────────────────────── */
const FONTS = [
  { id:"georgia",        label:"Georgia",            ff:"Georgia, serif",                        cat:"Serif" },
  { id:"lora",           label:"Lora",               ff:"'Lora', serif",                         cat:"Serif" },
  { id:"merriweather",   label:"Merriweather",        ff:"'Merriweather', serif",                 cat:"Serif" },
  { id:"playfair",       label:"Playfair Display",    ff:"'Playfair Display', serif",             cat:"Serif" },
  { id:"eb-garamond",    label:"EB Garamond",         ff:"'EB Garamond', serif",                  cat:"Serif" },
  { id:"cormorant",      label:"Cormorant Garamond",  ff:"'Cormorant Garamond', serif",           cat:"Serif" },
  { id:"libre",          label:"Libre Baskerville",   ff:"'Libre Baskerville', serif",            cat:"Serif" },
  { id:"source-serif",   label:"Source Serif 4",      ff:"'Source Serif 4', serif",               cat:"Serif" },
  { id:"crimson",        label:"Crimson Text",        ff:"'Crimson Text', serif",                 cat:"Serif" },
  { id:"inter",          label:"Inter",               ff:"'Inter', sans-serif",                   cat:"Sans" },
  { id:"open-sans",      label:"Open Sans",           ff:"'Open Sans', sans-serif",               cat:"Sans" },
  { id:"poppins",        label:"Poppins",             ff:"'Poppins', sans-serif",                 cat:"Sans" },
  { id:"dm-sans",        label:"DM Sans",             ff:"'DM Sans', sans-serif",                 cat:"Sans" },
  { id:"space-grotesk",  label:"Space Grotesk",       ff:"'Space Grotesk', sans-serif",           cat:"Sans" },
  { id:"montserrat",     label:"Montserrat",          ff:"'Montserrat', sans-serif",              cat:"Sans" },
  { id:"raleway",        label:"Raleway",             ff:"'Raleway', sans-serif",                 cat:"Sans" },
  { id:"nunito",         label:"Nunito",              ff:"'Nunito', sans-serif",                  cat:"Sans" },
  { id:"lexend",         label:"Lexend",              ff:"'Lexend', sans-serif",                  cat:"Sans" },
  { id:"caveat",         label:"Caveat",              ff:"'Caveat', cursive",                     cat:"Handwriting" },
  { id:"special-elite",  label:"Special Elite",       ff:"'Special Elite', cursive",              cat:"Handwriting" },
  { id:"courier-prime",  label:"Courier Prime",       ff:"'Courier Prime', monospace",            cat:"Mono" },
  { id:"roboto-mono",    label:"Roboto Mono",         ff:"'Roboto Mono', monospace",              cat:"Mono" },
  { id:"arabic-sans",    label:"Cairo (Arabic)",      ff:"'Cairo', sans-serif",                   cat:"Arabic" },
  { id:"arabic-serif",   label:"Amiri (Arabic)",      ff:"'Amiri', serif",                        cat:"Arabic" },
  { id:"arabic-naskh",   label:"Noto Naskh Arabic",   ff:"'Noto Naskh Arabic', serif",            cat:"Arabic" },
];

const FONT_SIZES = [11,12,13,14,15,16,17,18,20,22,24,28,32,36,40,48];

const TEXT_STYLES = [
  { label:"Normal text", value:"p" },
  { label:"Title",       value:"title" },
  { label:"Heading 1",   value:"h1" },
  { label:"Heading 2",   value:"h2" },
  { label:"Heading 3",   value:"h3" },
  { label:"Heading 4",   value:"h4" },
  { label:"Blockquote",  value:"blockquote" },
];

const CATEGORIES = [
  { label:"Writing Tips",       color:"#818cf8" },
  { label:"Craft & Technique",  color:"#a78bfa" },
  { label:"Publishing",         color:"#f472b6" },
  { label:"Reading",            color:"#fbbf24" },
  { label:"Inspiration",        color:"#34d399" },
  { label:"Author Interviews",  color:"#60a5fa" },
  { label:"Book Reviews",       color:"#2dd4bf" },
  { label:"Industry News",      color:"#fb923c" },
  { label:"Self-Publishing",    color:"#c084fc" },
  { label:"Marketing",          color:"#f87171" },
  { label:"Grammar & Style",    color:"#38bdf8" },
  { label:"Research",           color:"#86efac" },
  { label:"Other",              color:"#94a3b8" },
];

const WORD_GOALS = [
  { value:300,  label:"Quick take · 300 words" },
  { value:500,  label:"Blog post · 500 words" },
  { value:1000, label:"Long read · 1,000 words" },
  { value:2000, label:"Deep dive · 2,000 words" },
  { value:5000, label:"Essay · 5,000 words" },
];

const TEXT_COLORS = [
  "#ffffff","#e2e8f0","#94a3b8","#f87171","#fb923c",
  "#fbbf24","#34d399","#60a5fa","#818cf8","#f472b6",
  "#2dd4bf","#a78bfa","#ff6b6b","#ffd93d",
];

/* ── Helpers ────────────────────────────────────────────────────────── */
const stripHtml = (h: string) => h.replace(/<[^>]+>/g," ").replace(/\s+/g," ").trim();
const wc  = (t: string) => t.trim().split(/\s+/).filter(Boolean).length;
const rtm = (t: string) => Math.max(1, Math.ceil(wc(t)/200));

function readingLevel(text: string) {
  const words = text.trim().split(/\s+/).filter(Boolean);
  if (words.length < 20) return { label:"—", color: TD };
  const avg = words.reduce((s,w) => s + w.replace(/[^a-z]/gi,"").length, 0) / words.length;
  if (avg < 4.5) return { label:"Easy",     color:"#34d399" };
  if (avg < 6.2) return { label:"Medium",   color:"#fbbf24" };
  return            { label:"Advanced",  color:"#f472b6" };
}

/* ── Toolbar primitives ─────────────────────────────────────────────── */
function Btn({ onClick, active, title, children }: {
  onClick: () => void; active?: boolean; title?: string; children: React.ReactNode;
}) {
  const [hov, setHov] = useState(false);
  return (
    <button
      onMouseDown={e => { e.preventDefault(); onClick(); }}
      title={title}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        display:"flex", alignItems:"center", justifyContent:"center",
        width:28, height:26, borderRadius:4, border:"none", cursor:"pointer",
        background: active ? "rgba(255,255,255,0.15)" : hov ? "rgba(255,255,255,0.07)" : "transparent",
        color: active ? "#fff" : TS, flexShrink:0, transition:"background 0.1s",
      }}
    >{children}</button>
  );
}

function Sep() {
  return <div style={{ width:1, height:18, background:B, margin:"0 3px", flexShrink:0 }} />;
}

/* ── Dropdown positioning hook ──────────────────────────────────────── */
function useDropPos(isOpen: boolean, btnRef: React.RefObject<HTMLButtonElement>) {
  const [pos, setPos] = useState<{top:number; left:number} | null>(null);
  useEffect(() => {
    if (isOpen && btnRef.current) {
      const r = btnRef.current.getBoundingClientRect();
      setPos({ top: r.bottom + 4, left: r.left });
    } else {
      setPos(null);
    }
  }, [isOpen]);
  return pos;
}

/* ── Close dropdowns on outside click ──────────────────────────────── */
function useCloseOnOutside(isOpen: boolean, close: () => void) {
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: MouseEvent) => {
      const el = e.target as HTMLElement;
      if (!el.closest("[data-dropdown]")) close();
    };
    setTimeout(() => document.addEventListener("mousedown", handler), 0);
    return () => document.removeEventListener("mousedown", handler);
  }, [isOpen, close]);
}

/* ── Resizable Image NodeView — full 8-handle system ────────────── */
const _SF  = `-apple-system,BlinkMacSystemFont,'SF Pro Text',sans-serif`;
const _ACC = `#7c6af7`;

type HDir = { id:string; cursor:string; top?:number|string; bottom?:number|string; left?:number|string; right?:number|string; tx?:string; ty?:string; corner:boolean; dx:number; dy:number; };
const HANDLES: HDir[] = [
  { id:"nw", cursor:"nw-resize", top:-5,    left:-5,    corner:true,  dx:-1, dy:-1 },
  { id:"n",  cursor:"n-resize",  top:-5,    left:"50%", tx:"-50%", corner:false, dx:0,  dy:-1 },
  { id:"ne", cursor:"ne-resize", top:-5,    right:-5,   corner:true,  dx:1,  dy:-1 },
  { id:"e",  cursor:"e-resize",  top:"50%", right:-5,   ty:"-50%", corner:false, dx:1,  dy:0  },
  { id:"se", cursor:"se-resize", bottom:-5, right:-5,   corner:true,  dx:1,  dy:1  },
  { id:"s",  cursor:"s-resize",  bottom:-5, left:"50%", tx:"-50%", corner:false, dx:0,  dy:1  },
  { id:"sw", cursor:"sw-resize", bottom:-5, left:-5,    corner:true,  dx:-1, dy:1  },
  { id:"w",  cursor:"w-resize",  top:"50%", left:-5,    ty:"-50%", corner:false, dx:-1, dy:0  },
];
const HS = 10;

function ImageNodeView({ node, updateAttributes, selected, deleteNode }: NodeViewProps) {
  const containerRef  = useRef<HTMLDivElement>(null);
  const imgRef        = useRef<HTMLImageElement>(null);
  const [hovered, setHovered]   = useState(false);
  const [dragging, setDragging] = useState(false);
  const [live, setLive]         = useState({ w:0, h:0 });
  const natRef = useRef({ w:0, h:0 });

  const storedW  = node.attrs.imgW  as number | null;
  const storedH  = node.attrs.imgH  as number | null;
  const align    = (node.attrs.align as string) || "center";
  const justifyMap: Record<string,string> = { left:"flex-start", center:"center", right:"flex-end" };

  const handleLoad = (e: React.SyntheticEvent<HTMLImageElement>) => {
    const img = e.currentTarget;
    natRef.current = { w: img.naturalWidth, h: img.naturalHeight };
    if (!node.attrs.natW) updateAttributes({ natW: img.naturalWidth, natH: img.naturalHeight });
  };

  const startResize = (e: React.MouseEvent, h: HDir) => {
    e.preventDefault(); e.stopPropagation();
    const img = imgRef.current;
    const cont = containerRef.current;
    if (!img || !cont) return;
    const startX = e.clientX, startY = e.clientY;
    const startW = cont.offsetWidth, startH = img.offsetHeight;
    const natW   = natRef.current.w  || (node.attrs.natW as number) || startW;
    const natH   = natRef.current.h  || (node.attrs.natH as number) || startH;
    const ratio  = natW / natH;
    setDragging(true);
    setLive({ w: startW, h: startH });

    const calc = (me: MouseEvent): { w:number; h:number } => {
      const dx = (me.clientX - startX) * h.dx;
      const dy = (me.clientY - startY) * h.dy;
      if (h.corner) {
        const delta = Math.abs(dx) > Math.abs(dy) ? dx : dy;
        const newW  = Math.max(60, Math.round(startW + delta));
        return { w: newW, h: Math.round(newW / ratio) };
      }
      return {
        w: h.dx !== 0 ? Math.max(60, Math.round(startW + dx)) : startW,
        h: h.dy !== 0 ? Math.max(40, Math.round(startH + dy)) : startH,
      };
    };

    const onMove = (me: MouseEvent) => { const d = calc(me); setLive(d); };
    const onUp   = (me: MouseEvent) => {
      const d = calc(me);
      updateAttributes({ imgW: d.w, imgH: d.h });
      setDragging(false);
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup",   onUp);
    };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup",   onUp);
  };

  const showUI = selected || hovered;

  return (
    <NodeViewWrapper as="div" style={{ display:"flex", justifyContent:justifyMap[align]||"center", margin:"1.4em 0", userSelect:"none" }}>
      <div
        ref={containerRef}
        contentEditable={false}
        style={{ position:"relative", display:"inline-block", maxWidth:"100%",
          outline: selected ? `2px solid ${_ACC}` : "none", outlineOffset:3, borderRadius:10 }}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => { if (!dragging) setHovered(false); }}
      >
        <img
          ref={imgRef}
          src={node.attrs.src as string}
          alt={(node.attrs.alt as string) || ""}
          draggable={false}
          onLoad={handleLoad}
          style={{
            display:"block", borderRadius:10, maxWidth:"100%",
            width:  dragging ? `${live.w}px`  : storedW ? `${storedW}px`  : undefined,
            height: dragging ? `${live.h}px`  : storedH ? `${storedH}px`  : undefined,
            objectFit:"cover",
          }}
        />

        {/* Drag handle — grip to reposition the image anywhere */}
        {showUI && !dragging && (
          <div
            data-drag-handle
            title="Drag to move"
            style={{ position:"absolute", top:8, left:8, width:28, height:28, borderRadius:7,
              background:"rgba(0,0,0,0.72)", backdropFilter:"blur(8px)",
              border:"1px solid rgba(255,255,255,0.18)", cursor:"grab",
              display:"flex", alignItems:"center", justifyContent:"center", zIndex:50 }}>
            <GripVertical size={14} color="rgba(255,255,255,0.8)"/>
          </div>
        )}

        {/* Floating toolbar */}
        {showUI && !dragging && (
          <div style={{ position:"absolute", top:-46, left:"50%", transform:"translateX(-50%)",
            display:"flex", alignItems:"center", gap:4,
            background:"rgba(0,0,0,0.88)", backdropFilter:"blur(14px)",
            border:"1px solid rgba(255,255,255,0.14)", borderRadius:10,
            padding:"5px 8px", zIndex:50, whiteSpace:"nowrap" }}>
            {(["left","center","right"] as const).map(a => (
              <button key={a} onMouseDown={e=>{e.preventDefault();updateAttributes({align:a});}}
                style={{ width:26,height:24,borderRadius:5,border:"none",cursor:"pointer",
                  display:"flex",alignItems:"center",justifyContent:"center",
                  background:align===a?"rgba(124,106,247,0.4)":"transparent", color:"#fff" }}>
                {a==="left"?<AlignLeft size={11}/>:a==="center"?<AlignCenter size={11}/>:<AlignRight size={11}/>}
              </button>
            ))}
            <div style={{width:1,height:14,background:"rgba(255,255,255,0.15)",margin:"0 2px"}}/>
            <button onMouseDown={e=>{e.preventDefault();updateAttributes({imgW:null,imgH:null});}}
              title="Reset size"
              style={{ height:24,padding:"0 9px",borderRadius:5,border:"none",cursor:"pointer",
                background:"transparent",fontFamily:_SF,fontSize:10,fontWeight:600,
                color:"rgba(255,255,255,0.75)",whiteSpace:"nowrap" }}>
              Reset
            </button>
            <div style={{width:1,height:14,background:"rgba(255,255,255,0.15)",margin:"0 2px"}}/>
            <button onMouseDown={e=>{e.preventDefault();deleteNode();}}
              title="Delete image"
              style={{ width:24,height:24,borderRadius:5,border:"none",cursor:"pointer",
                background:"transparent",color:"#f87171",display:"flex",alignItems:"center",justifyContent:"center" }}>
              <X size={12}/>
            </button>
          </div>
        )}

        {/* 8 resize handles */}
        {showUI && HANDLES.map(h => (
          <div key={h.id}
            style={{
              position:"absolute",
              top:h.top, bottom:h.bottom, left:h.left, right:h.right,
              transform: [h.tx&&`translateX(${h.tx})`,h.ty&&`translateY(${h.ty})`].filter(Boolean).join(" ") || undefined,
              width:HS, height:HS,
              background:"#fff", border:`2px solid ${_ACC}`,
              borderRadius:2, cursor:h.cursor, zIndex:50,
            }}
            onMouseDown={e => startResize(e, h)}
          />
        ))}

        {/* Real-time dimension badge */}
        {dragging && (
          <div style={{ position:"absolute", bottom:-30, left:"50%", transform:"translateX(-50%)",
            background:"rgba(0,0,0,0.88)", color:"#fff", fontFamily:_SF, fontSize:11, fontWeight:600,
            padding:"3px 10px", borderRadius:7, whiteSpace:"nowrap", zIndex:60, pointerEvents:"none" }}>
            {live.w} × {live.h} px
          </div>
        )}
      </div>
    </NodeViewWrapper>
  );
}

const ResizableImage = TiptapImage.extend({
  draggable: true,
  addAttributes() {
    return {
      ...this.parent?.(),
      imgW:  { default:null, parseHTML: el=>el.getAttribute("data-imgw")?Number(el.getAttribute("data-imgw")):null, renderHTML: a=>a.imgW?{"data-imgw":a.imgW}:{} },
      imgH:  { default:null, parseHTML: el=>el.getAttribute("data-imgh")?Number(el.getAttribute("data-imgh")):null, renderHTML: a=>a.imgH?{"data-imgh":a.imgH}:{} },
      natW:  { default:null },
      natH:  { default:null },
      align: { default:"center", parseHTML: el=>el.getAttribute("data-align")||"center", renderHTML: a=>({ "data-align":a.align }) },
    };
  },
  addNodeView() { return ReactNodeViewRenderer(ImageNodeView); },
}).configure({ inline:false, allowBase64:true });

/* ═══════════════════════════════════════════════════════════════════
   MAIN COMPONENT
═══════════════════════════════════════════════════════════════════ */
export default function ArticleEditor() {
  const [, params] = useRoute("/articles/:id");
  const id = Number(params?.id);
  const { data: article, isLoading } = useBook(id);
  const updateArticle = useUpdateBook();
  const { toast } = useToast();
  const { isRTL } = useLanguage();

  /* ── state ── */
  const [title, setTitle]         = useState("");
  const [content, setContent]     = useState("");
  const [category, setCategory]   = useState("");
  const [tagInput, setTagInput]   = useState("");
  const [tags, setTags]           = useState<string[]>([]);
  const [featuredImage, setFeaturedImage] = useState<string | null>(null);
  const [imgWidth, setImgWidth]   = useState<number|null>(null);  // pixels, null = 100%
  const [imgHeight, setImgHeight] = useState<number|null>(null);  // pixels, null = auto
  const [imgAlign, setImgAlign]   = useState<"left"|"center"|"right">("center");
  const [featDragging, setFeatDragging] = useState(false);
  const [featLive, setFeatLive]   = useState({ w:0, h:0 });
  const imgResizeRef              = useRef<{ startX: number; startW: number } | null>(null);
  const featImgRef                = useRef<HTMLImageElement>(null);
  const featContRef               = useRef<HTMLDivElement>(null);
  const featNatRef                = useRef({ w:0, h:0 });
  const [saving, setSaving]       = useState(false);
  const [justSaved, setJustSaved] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [showAI, setShowAI]           = useState(false);
  const [showArticleSearch, setShowArticleSearch] = useState(false);
  const [articleSearchQuery, setArticleSearchQuery] = useState("");
  const [articleSearchCount, setArticleSearchCount] = useState(0);
  const [focusMode, setFocusMode] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [showShareMenu, setShowShareMenu] = useState(false);
  const [shareCopied, setShareCopied] = useState(false);
  const [dragOver, setDragOver]   = useState(false);
  const [wordGoal, setWordGoal]   = useState(1000);
  const [showGoalPicker, setShowGoalPicker] = useState(false);
  const [fontSize, setFontSize]   = useState(16);
  const [fontSizeInput, setFontSizeInput] = useState("16");

  /* ── voice dictation ── */
  const [isRecording, setIsRecording]     = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef   = useRef<Blob[]>([]);
  const recTimerRef      = useRef<ReturnType<typeof setInterval>>();

  /* ── toolbar dropdowns ── */
  const [styleOpen, setStyleOpen] = useState(false);
  const [fontOpen, setFontOpen]   = useState(false);
  const [colorOpen, setColorOpen] = useState(false);
  const [linkOpen, setLinkOpen]   = useState(false);
  const [linkUrl, setLinkUrl]     = useState("");

  /* ── button refs for dropdown positioning ── */
  const styleBtnRef = useRef<HTMLButtonElement>(null);
  const fontBtnRef  = useRef<HTMLButtonElement>(null);
  const colorBtnRef = useRef<HTMLButtonElement>(null);
  const linkBtnRef  = useRef<HTMLButtonElement>(null);

  const stylePos = useDropPos(styleOpen, styleBtnRef);
  const fontPos  = useDropPos(fontOpen,  fontBtnRef);
  const colorPos = useDropPos(colorOpen, colorBtnRef);
  const linkPos  = useDropPos(linkOpen,  linkBtnRef);

  const closeAll = useCallback(() => {
    setStyleOpen(false); setFontOpen(false); setColorOpen(false); setLinkOpen(false);
  }, []);

  useCloseOnOutside(styleOpen, () => setStyleOpen(false));
  useCloseOnOutside(fontOpen,  () => setFontOpen(false));
  useCloseOnOutside(colorOpen, () => setColorOpen(false));
  useCloseOnOutside(linkOpen,  () => setLinkOpen(false));

  /* ── refs for avoiding stale closures ── */
  const titleRef    = useRef(title);
  const contentRef  = useRef(content);
  const categoryRef = useRef(category);
  const tagsRef     = useRef(tags);
  const imgRef      = useRef(featuredImage);
  const idRef       = useRef(id);
  const initialized = useRef(false);

  useEffect(() => { titleRef.current    = title;    }, [title]);
  useEffect(() => { contentRef.current  = content;  }, [content]);
  useEffect(() => { categoryRef.current = category; }, [category]);
  useEffect(() => { tagsRef.current     = tags;      }, [tags]);
  useEffect(() => { imgRef.current      = featuredImage; }, [featuredImage]);

  const fileInputRef       = useRef<HTMLInputElement>(null);
  const inlineImgInputRef  = useRef<HTMLInputElement>(null);
  const autoSaveTimer      = useRef<ReturnType<typeof setTimeout> | null>(null);

  /* ── Floating images ── */
  const [floatingImages, setFloatingImages] = useState<FloatingImage[]>([]);
  const floatingImagesRef = useRef<FloatingImage[]>([]);
  const editorContainerRef = useRef<HTMLDivElement>(null);
  const [containerW, setContainerW] = useState(620);

  /* ── AI image generation ── */
  const [showImgAI, setShowImgAI]     = useState(false);
  const [imgPrompt, setImgPrompt]     = useState("");
  const [imgGenLoading, setImgGenLoading] = useState(false);

  /* ── tiptap ── */
  const [, forceUpdate] = useState(0);
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [1,2,3,4] },
        bulletList: { keepMarks: true },
        orderedList: { keepMarks: true },
        underline: false, link: false, gapcursor: false,
      } as any),
      Underline,
      TextAlign.configure({ types: ["heading","paragraph"] }),
      TextStyle,
      Color,
      FontFamily,
      FontSize,
      Highlight.configure({ multicolor: true }),
      Link2.configure({ openOnClick: false }),
      Placeholder.configure({ placeholder: "Start writing your article…" }),
      ResizableImage,
    ],
    content: "<p></p>",
    onUpdate: ({ editor }) => { setContent(editor.getHTML()); },
    onTransaction: () => { forceUpdate(n => n+1); },
    editorProps: {
      handleDrop(_view, event) {
        const files = event.dataTransfer?.files;
        if (!files || !files.length) return false;
        const file = files[0];
        if (!file.type.startsWith("image/")) return false;
        event.preventDefault();
        const reader = new FileReader();
        reader.onload = ev => {
          const src = ev.target?.result as string;
          if (!src) return;
          const probe = new Image();
          probe.onload = () => {
            const contW = editorContainerRef.current?.clientWidth || 620;
            const maxW = contW * 0.5;
            const w = Math.round(Math.min(maxW, probe.naturalWidth));
            const h = Math.round((probe.naturalHeight / probe.naturalWidth) * w);
            setFloatingImages(prev => [...prev, {
              id: `fi-${Date.now()}-${Math.random().toString(36).slice(2)}`,
              src,
              x: Math.round((contW - w) / 2),
              y: 40,
              width: w,
              height: h,
              locked: false,
              aspectRatio: probe.naturalWidth / probe.naturalHeight,
            }]);
          };
          probe.src = src;
        };
        reader.readAsDataURL(file);
        return true;
      },
    },
  });

  /* ── load article (only once) ── */
  useEffect(() => {
    if (!article || !editor || initialized.current) return;
    initialized.current = true;
    setTitle(article.title || "");
    setCategory(article.articleCategory || "");
    setTags((article.tags as string[]) || []);
    setFeaturedImage(article.featuredImage || null);

    let rawContent = article.articleContent || "";
    let loadedFloatingImages: FloatingImage[] = [];
    try {
      const obj = JSON.parse(rawContent);
      if (obj && obj.v === 2 && typeof obj.html === "string") {
        rawContent = obj.html;
        loadedFloatingImages = Array.isArray(obj.floatingImages) ? obj.floatingImages : [];
      }
    } catch { /* fall through — treat rawContent as plain HTML */ }

    setFloatingImages(loadedFloatingImages);
    floatingImagesRef.current = loadedFloatingImages;

    const isHtml = rawContent.trimStart().startsWith("<");
    const html = isHtml ? rawContent
      : rawContent ? `<p>${rawContent.replace(/\n\n+/g,"</p><p>").replace(/\n/g,"<br>")}</p>`
      : "<p></p>";
    editor.commands.setContent(html, false);
    setContent(html);
  }, [article, editor]);

  /* ── save ── */
  const saveNow = useCallback(async (silent = false) => {
    if (!silent) setSaving(true);
    try {
      const serializedContent = JSON.stringify({
        v: 2,
        html: contentRef.current,
        floatingImages: floatingImagesRef.current,
      });
      await (updateArticle.mutateAsync as any)({
        id: idRef.current,
        title: titleRef.current,
        articleContent: serializedContent,
        articleCategory: categoryRef.current,
        tags: tagsRef.current,
        featuredImage: imgRef.current ?? undefined,
      });
      if (!silent) {
        setJustSaved(true);
        setTimeout(() => setJustSaved(false), 2000);
      }
    } catch {
      if (!silent) toast({ variant:"destructive", title:"Save failed" });
    } finally { setSaving(false); }
  }, [updateArticle, toast]);

  const [publishing, setPublishing] = useState(false);

  const handlePublish = useCallback(async () => {
    // Save first
    await saveNow(true);
    setPublishing(true);
    try {
      const isCurrentlyPublished = (article as any)?.isPublished;
      const res = await fetch(`/api/books/${idRef.current}/publish`, {
        method: "POST", credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ publish: !isCurrentlyPublished }),
      });
      if (!res.ok) {
        const err = await res.json();
        toast({ variant: "destructive", title: err.message || "Publish failed" });
        return;
      }
      queryClient.invalidateQueries({ queryKey: [`/api/books/${idRef.current}`] });
      toast({ title: isCurrentlyPublished ? "Article unpublished" : "Article published!" });
    } catch {
      toast({ variant: "destructive", title: "Publish failed" });
    } finally {
      setPublishing(false);
    }
  }, [saveNow, article, toast]);

  // Auto-save disabled — users save manually

  /* ── Ctrl+F search ── */
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "f") { e.preventDefault(); setShowArticleSearch(true); }
      if (e.key === "Escape" && showArticleSearch) {
        setShowArticleSearch(false); setArticleSearchQuery(""); setArticleSearchCount(0);
        document.querySelectorAll("mark[data-search-highlight]").forEach(el => { const p = el.parentNode; if (p) { p.replaceChild(document.createTextNode(el.textContent || ""), el); p.normalize(); } });
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [showArticleSearch]);

  useEffect(() => {
    document.querySelectorAll("mark[data-search-highlight]").forEach(el => { const p = el.parentNode; if (p) { p.replaceChild(document.createTextNode(el.textContent || ""), el); p.normalize(); } });
    if (!articleSearchQuery || articleSearchQuery.length < 2) { setArticleSearchCount(0); return; }
    const editorEl = document.querySelector(".ProseMirror");
    if (!editorEl) return;
    const walker = document.createTreeWalker(editorEl, NodeFilter.SHOW_TEXT);
    const nodes: Text[] = []; let n; while ((n = walker.nextNode())) nodes.push(n as Text);
    const q = articleSearchQuery.toLowerCase(); const isW = (c: string) => /\w/.test(c); let count = 0;
    nodes.forEach(node => {
      const text = node.textContent || ""; const lower = text.toLowerCase(); let idx = lower.indexOf(q); if (idx === -1) return;
      const frag = document.createDocumentFragment(); let last = 0;
      while (idx !== -1) {
        const cb = idx > 0 ? lower[idx-1] : " "; const ca = idx+q.length < lower.length ? lower[idx+q.length] : " ";
        if (!isW(cb) && !isW(ca)) {
        frag.appendChild(document.createTextNode(text.slice(last, idx)));
        const mark = document.createElement("mark"); mark.setAttribute("data-search-highlight", "true");
        mark.style.cssText = "background:rgba(250,204,21,0.4);color:inherit;border-radius:2px;padding:0 1px";
        mark.textContent = text.slice(idx, idx + q.length); frag.appendChild(mark); count++;
        last = idx + q.length;
        }
        idx = lower.indexOf(q, idx + 1);
      }
      frag.appendChild(document.createTextNode(text.slice(last)));
      node.parentNode?.replaceChild(frag, node);
    });
    setArticleSearchCount(count);
    if (count > 0) document.querySelector("mark[data-search-highlight]")?.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [articleSearchQuery]);

  /* ── keep floatingImagesRef in sync ── */
  useEffect(() => { floatingImagesRef.current = floatingImages; }, [floatingImages]);

  /* ── track editor container width ── */
  useEffect(() => {
    const el = editorContainerRef.current;
    if (!el) return;
    const obs = new ResizeObserver(entries => {
      const w = entries[0]?.contentRect.width;
      if (w) setContainerW(Math.round(w));
    });
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  /* ── image ── */
  const handleImageFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = ev => setFeaturedImage(ev.target?.result as string);
    reader.readAsDataURL(file);
  };

  /* ── tags ── */
  const addTag = () => {
    const t = tagInput.trim().toLowerCase();
    if (t && !tags.includes(t) && tags.length < 10) setTags(p => [...p, t]);
    setTagInput("");
  };

  /* ── Floating image helper ── */
  const insertFloatingImage = (src: string, natW: number, natH: number) => {
    const contW = editorContainerRef.current?.clientWidth || containerW;
    const maxW = contW * 0.5;
    const w = Math.round(Math.min(maxW, natW || contW * 0.5));
    const h = natW > 0 ? Math.round((natH / natW) * w) : Math.round(w * 0.75);
    setFloatingImages(prev => [...prev, {
      id: `fi-${Date.now()}-${Math.random().toString(36).slice(2)}`,
      src,
      x: Math.round((contW - w) / 2),
      y: 40,
      width: w,
      height: h,
      locked: false,
      aspectRatio: natW > 0 ? natW / natH : w / h,
    }]);
  };

  /* ── Inline image ── */
  const insertImageFromFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = ev => {
      const src = ev.target?.result as string;
      if (!src) return;
      const probe = new Image();
      probe.onload = () => insertFloatingImage(src, probe.naturalWidth, probe.naturalHeight);
      probe.src = src;
    };
    reader.readAsDataURL(file);
  };

  const generateInlineImage = async () => {
    if (!imgPrompt.trim()) return;
    setImgGenLoading(true);
    try {
      const res = await fetch("/api/generate-image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ prompt: imgPrompt }),
      });
      if (!res.ok) throw new Error("Failed");
      const { url } = await res.json();
      if (url) {
        const probe = new Image();
        probe.onload = () => insertFloatingImage(url, probe.naturalWidth, probe.naturalHeight);
        probe.src = url;
        setShowImgAI(false);
        setImgPrompt("");
        toast({ title: "Image added to article" });
      }
    } catch {
      toast({ title: "Image generation failed", variant: "destructive" });
    } finally {
      setImgGenLoading(false);
    }
  };

  /* ── Voice dictation ── */
  const formatTime = (s: number) => `${String(Math.floor(s/60)).padStart(2,"0")}:${String(s%60).padStart(2,"0")}`;

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream, { mimeType: "audio/webm" });
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];
      mediaRecorder.ondataavailable = e => { if (e.data.size > 0) audioChunksRef.current.push(e.data); };
      mediaRecorder.onstop = async () => {
        stream.getTracks().forEach(t => t.stop());
        setIsRecording(false);
        setRecordingTime(0);
        setIsTranscribing(true);
        try {
          const blob = new Blob(audioChunksRef.current, { type: "audio/webm" });
          const base64 = await new Promise<string>(resolve => {
            const reader = new FileReader();
            reader.readAsDataURL(blob);
            reader.onloadend = () => resolve((reader.result as string).split(",")[1]);
          });
          const res = await fetch("/api/transcribe", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
            body: JSON.stringify({ audio: base64 }),
          });
          if (!res.ok) throw new Error("Transcription failed");
          const { text } = await res.json();
          if (text?.trim() && editor) {
            editor.chain().focus().insertContent(" " + text.trim()).run();
            toast({ title: "Voice added to article" });
          }
        } catch {
          toast({ title: "Transcription failed", variant: "destructive" });
        } finally {
          setIsTranscribing(false);
        }
      };
      mediaRecorder.start();
      setIsRecording(true);
      setRecordingTime(0);
      recTimerRef.current = setInterval(() => setRecordingTime(t => t + 1), 1000);
    } catch {
      toast({ title: "Could not access microphone", variant: "destructive" });
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current?.state === "recording") mediaRecorderRef.current.stop();
    if (recTimerRef.current) clearInterval(recTimerRef.current);
  };

  /* ── AI ── */
  const generateAi = async () => {
    if (!title.trim()) { toast({ variant:"destructive", title:"Add a title first" }); return; }
    setAiLoading(true);
    try {
      const res = await fetch(`/api/books/${id}/generate-chapter`, {
        method:"POST", headers:{"Content-Type":"application/json"}, credentials:"include",
        body: JSON.stringify({
          chapterTitle: title,
          bookSummary: `Blog article: ${title}. Category: ${category || "General"}`,
          authorName: article?.authorName || "the author",
          language: article?.language || "en",
          previousContent: stripHtml(content),
        }),
      });
      if (!res.ok) throw new Error("AI request failed");
      const data = await res.json();
      if (editor && data.content) {
        editor.chain().focus().insertContent(
          `<p>${data.content.replace(/\n\n+/g,"</p><p>").replace(/\n/g,"<br>")}</p>`
        ).run();
      }
      toast({ title:"AI content added!" });
    } catch (err: any) {
      toast({ variant:"destructive", title:"AI Error", description: err?.message });
    } finally { setAiLoading(false); }
  };

  /* ── tiptap queries ── */
  const currentStyle = () => {
    if (!editor) return "Normal text";
    if (editor.isActive("heading",{level:1})) return "Heading 1";
    if (editor.isActive("heading",{level:2})) return "Heading 2";
    if (editor.isActive("heading",{level:3})) return "Heading 3";
    if (editor.isActive("heading",{level:4})) return "Heading 4";
    if (editor.isActive("blockquote"))        return "Blockquote";
    return "Normal text";
  };

  const currentFont = () => {
    const ff = editor?.getAttributes("textStyle")?.fontFamily || "";
    const clean = ff.replace(/['"]/g,"").split(",")[0].trim().toLowerCase();
    return FONTS.find(f => f.ff.toLowerCase().includes(clean)) || null;
  };

  const applyStyle = (v: string) => {
    if (!editor) return;
    setStyleOpen(false);
    if      (v === "p")          editor.chain().focus().setParagraph().run();
    else if (v === "title")      { editor.chain().focus().setParagraph().run(); (editor.chain().focus() as any).setFontSize(28).run(); editor.chain().focus().toggleBold().run(); }
    else if (v === "h1")         editor.chain().focus().toggleHeading({level:1}).run();
    else if (v === "h2")         editor.chain().focus().toggleHeading({level:2}).run();
    else if (v === "h3")         editor.chain().focus().toggleHeading({level:3}).run();
    else if (v === "h4")         editor.chain().focus().toggleHeading({level:4}).run();
    else if (v === "blockquote") editor.chain().focus().toggleBlockquote().run();
  };

  const applyFont = (f: typeof FONTS[0]) => {
    editor?.chain().focus().setFontFamily(f.ff).run();
    setFontOpen(false);
  };

  const changeSize = (delta: number) => {
    const idx = FONT_SIZES.indexOf(fontSize);
    const next = idx === -1
      ? Math.max(8, Math.min(96, fontSize + delta))
      : FONT_SIZES[Math.max(0, Math.min(FONT_SIZES.length-1, idx+delta))];
    setFontSize(next);
    setFontSizeInput(String(next));
    (editor?.chain().focus() as any)?.setFontSize(next)?.run();
  };

  const applyLink = () => {
    setLinkOpen(false);
    if (!linkUrl.trim()) { editor?.chain().focus().unsetLink().run(); }
    else {
      const href = linkUrl.startsWith("http") ? linkUrl : `https://${linkUrl}`;
      editor?.chain().focus().setLink({ href }).run();
    }
    setLinkUrl("");
  };

  /* ── computed ── */
  const plain    = stripHtml(content);
  const words    = wc(plain);
  const readTime = rtm(plain);
  const progress = Math.min(100, Math.round((words/wordGoal)*100));
  const level    = readingLevel(plain);
  const selCat   = CATEGORIES.find(c => c.label === category);

  /* ── dropdown shared styles ── */
  const dropStyle: React.CSSProperties = {
    position:"fixed", zIndex:9999,
    background:"#1a1a22", border:`1px solid ${B}`,
    borderRadius:10, boxShadow:"0 12px 40px rgba(0,0,0,0.8)",
    padding:4,
  };

  /* ═══════════════════════ LOADING ═══════════════════════ */
  if (isLoading) return (
    <Layout isLanding darkNav>
      <div style={{background:BG,minHeight:"100vh",display:"flex",alignItems:"center",justifyContent:"center"}}>
        <Loader2 size={28} color={TD} style={{animation:"spin 1s linear infinite"}} />
      </div>
    </Layout>
  );

  if (!article) return (
    <Layout isLanding darkNav>
      <div style={{background:BG,minHeight:"100vh",display:"flex",alignItems:"center",justifyContent:"center"}}>
        <p style={{fontFamily:SF,color:TD}}>Article not found.</p>
      </div>
    </Layout>
  );

  /* ═══════════════════════ PREVIEW ═══════════════════════ */
  if (showPreview) return (
    <Layout isLanding darkNav>
      <div style={{background:BG,minHeight:"100vh"}}>
        <div style={{
          position:"sticky",top:0,zIndex:50,background:"rgba(10,10,10,0.97)",
          backdropFilter:"blur(20px)",borderBottom:`1px solid ${B}`,
          padding:"0 24px",height:46,display:"flex",alignItems:"center",justifyContent:"space-between",
        }}>
          <button onClick={() => setShowPreview(false)} style={{display:"flex",alignItems:"center",gap:6,background:"none",border:"none",cursor:"pointer",fontFamily:SF,fontSize:13,color:TS}}>
            <ArrowLeft size={14}/> Back to editor
          </button>
          <span style={{fontFamily:SF,fontSize:10,fontWeight:700,letterSpacing:"0.1em",textTransform:"uppercase",color:TD}}>Preview</span>
          <div style={{width:120}}/>
        </div>
        <article style={{maxWidth:740,margin:"0 auto",padding:"64px 24px 120px"}}>
          {featuredImage && <img src={featuredImage} alt="Featured" style={{width:"100%",height:360,objectFit:"cover",borderRadius:16,marginBottom:48}}/>}
          <div style={{display:"flex",gap:10,alignItems:"center",marginBottom:20,flexWrap:"wrap"}}>
            {selCat && <span style={{fontFamily:SF,fontSize:11,fontWeight:700,letterSpacing:"0.06em",textTransform:"uppercase",padding:"4px 12px",borderRadius:20,background:selCat.color+"22",color:selCat.color}}>{category}</span>}
            <span style={{fontFamily:SF,fontSize:12,color:TD}}>{readTime} min read · {words.toLocaleString()} words</span>
          </div>
          <h1 style={{fontFamily:"Georgia, serif",fontSize:"clamp(28px,5vw,44px)",fontWeight:800,color:T,lineHeight:1.18,marginBottom:32}}>{title||"Untitled"}</h1>
          {article.authorName && (
            <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:40,paddingBottom:32,borderBottom:`1px solid ${B}`}}>
              <div style={{width:36,height:36,borderRadius:"50%",background:C2,border:`1px solid ${B}`,display:"flex",alignItems:"center",justifyContent:"center",fontFamily:SF,fontSize:13,fontWeight:700,color:TS}}>
                {article.authorName[0].toUpperCase()}
              </div>
              <div>
                <p style={{fontFamily:SF,fontSize:13,fontWeight:600,color:T,margin:0}}>{article.authorName}</p>
                <p style={{fontFamily:SF,fontSize:11,color:TD,margin:0}}>Author</p>
              </div>
            </div>
          )}
          <div className="article-preview-body" dir={isRTL?"rtl":"ltr"} dangerouslySetInnerHTML={{__html: sanitizeHtml(content||"<p><em>No content yet.</em></p>")}}/>
          {tags.length > 0 && (
            <div style={{display:"flex",flexWrap:"wrap",gap:8,marginTop:56,paddingTop:32,borderTop:`1px solid ${B}`}}>
              {tags.map(tag => <span key={tag} style={{fontFamily:SF,fontSize:12,color:TD,padding:"5px 12px",borderRadius:20,background:C2,border:`1px solid ${B}`}}>#{tag}</span>)}
            </div>
          )}
        </article>
      </div>
    </Layout>
  );


  /* ═══════════════════════ EDITOR ═══════════════════════ */
  return (
    <Layout isLanding darkNav>
      <div style={{background:BG,minHeight:"100vh",fontFamily:SF}}>

        {/* ── TOP BAR — fixed below Layout navbar (44px), always visible ── */}
        <div className="article-editor-topbar" style={{
          position:"fixed",top:44,left:0,right:0,zIndex:50,
          background:"rgba(10,10,10,0.98)",backdropFilter:"blur(20px)",
          borderBottom:`1px solid ${B}`,
          padding:"0 16px",height:48,
          display:"flex",alignItems:"center",justifyContent:"center",gap:6,
          overflowX:"auto" as any,
          scrollbarWidth:"none" as any,
        }}>
          {/* Back */}
          <Link href="/">
            <button style={{display:"flex",alignItems:"center",background:"none",border:"none",cursor:"pointer",color:TS,padding:4,borderRadius:6,flexShrink:0}}
              onMouseEnter={e=>(e.currentTarget.style.background="rgba(255,255,255,0.06)")}
              onMouseLeave={e=>(e.currentTarget.style.background="none")}>
              <ArrowLeft size={15}/>
            </button>
          </Link>

          <div className="topbar-hide-mobile" style={{width:1,height:14,background:B,flexShrink:0}}/>

          {/* Label — hidden on mobile */}
          <div className="topbar-hide-mobile" style={{display:"flex",alignItems:"center",gap:5,flexShrink:0}}>
            <FileText size={11} color={TD}/>
            <span style={{fontSize:10,fontWeight:700,letterSpacing:"0.08em",textTransform:"uppercase",color:TD}}>Blog Post</span>
          </div>

          <div className="topbar-hide-mobile" style={{width:1,height:14,background:B,flexShrink:0}}/>

          {/* Stats — hidden on mobile to save space */}
          <span className="topbar-hide-mobile" style={{fontSize:11,color:TD,fontVariantNumeric:"tabular-nums",flexShrink:0}}>{words.toLocaleString()} w</span>
          <span className="topbar-hide-mobile" style={{fontSize:9,color:"rgba(255,255,255,0.1)",flexShrink:0}}>·</span>
          <span className="topbar-hide-mobile" style={{fontSize:11,color:TD,flexShrink:0}}>{readTime} min</span>

          <div className="topbar-hide-mobile" style={{width:1,height:14,background:B,flexShrink:0}}/>

          {/* Soundscape — hidden on mobile */}
          <div className="topbar-hide-mobile"><AmbientSoundscape /></div>

          {/* Mic */}
          {isTranscribing ? (
            <div style={{display:"flex",alignItems:"center",gap:4,padding:"0 8px",height:30,borderRadius:7,background:`${ACC}15`,border:`1px solid ${ACC}35`,fontSize:11,color:ACC,flexShrink:0}}>
              <Loader2 size={11} style={{animation:"spin 1s linear infinite"}}/> Processing…
            </div>
          ) : isRecording ? (
            <button onClick={stopRecording}
              style={{display:"flex",alignItems:"center",gap:4,padding:"0 8px",height:30,borderRadius:7,background:"#ef444420",border:"1px solid #ef444455",cursor:"pointer",fontSize:11,fontWeight:600,color:"#ef4444",animation:"pulse 1.5s ease-in-out infinite",flexShrink:0}}>
              <Square size={10} style={{fill:"#ef4444"}}/> <span style={{fontFamily:"monospace",fontSize:10}}>{formatTime(recordingTime)}</span>
            </button>
          ) : (
            <button onClick={startRecording} title="Voice dictation"
              style={{display:"flex",alignItems:"center",justifyContent:"center",width:30,height:30,borderRadius:7,background:"none",border:`1px solid ${B}`,cursor:"pointer",color:TS,flexShrink:0}}>
              <Mic size={13}/>
            </button>
          )}

          {/* Focus */}
          <button className="topbar-hide-mobile" onClick={() => setFocusMode(f=>!f)} title="Focus mode"
            style={{display:"flex",alignItems:"center",justifyContent:"center",width:30,height:30,borderRadius:7,background:"none",border:`1px solid ${B}`,cursor:"pointer",color:TS,flexShrink:0}}>
            {focusMode ? <Minimize2 size={13}/> : <Maximize2 size={13}/>}
          </button>

          {/* Preview */}
          <button className="topbar-hide-mobile" onClick={() => setShowPreview(true)} title="Preview"
            style={{display:"flex",alignItems:"center",justifyContent:"center",width:30,height:30,borderRadius:7,background:"none",border:`1px solid ${B}`,cursor:"pointer",color:TS,flexShrink:0}}>
            <Eye size={13}/>
          </button>

          {/* Settings */}
          <button onClick={() => setDrawerOpen(true)} title="Settings"
            style={{display:"flex",alignItems:"center",justifyContent:"center",width:30,height:30,borderRadius:7,background:drawerOpen?"rgba(255,255,255,0.1)":"none",border:`1px solid ${B}`,cursor:"pointer",color:TS,flexShrink:0}}>
            <BarChart2 size={13}/>
          </button>

          <div style={{width:1,height:14,background:B,flexShrink:0}}/>

          {/* Save button (shows Save / Saving… / Saved in place) */}
          <button onClick={() => saveNow(false)} disabled={saving}
            style={{display:"flex",alignItems:"center",gap:5,padding:"6px 14px",borderRadius:7,cursor:"pointer",background:justSaved?"#34d399":"#fff",border:"none",fontFamily:SF,fontSize:12,fontWeight:600,color:justSaved?"#fff":"#000",transition:"all 0.2s",flexShrink:0}}>
            {saving ? <><Loader2 size={12} style={{animation:"spin 1s linear infinite"}}/> Saving…</>
              : justSaved ? <><CheckCircle2 size={12}/> Saved</>
              : <><Save size={12}/> Save</>}
          </button>

          {/* Publish button */}
          <button onClick={handlePublish} disabled={publishing}
            style={{display:"flex",alignItems:"center",gap:5,padding:"6px 14px",borderRadius:7,cursor:"pointer",
              background:(article as any)?.isPublished ? "rgba(239,68,68,0.15)" : `${ACC}`,
              border:(article as any)?.isPublished ? "1px solid rgba(239,68,68,0.3)" : "none",
              fontFamily:SF,fontSize:12,fontWeight:600,
              color:(article as any)?.isPublished ? "#f87171" : "#fff",
              transition:"all 0.2s",flexShrink:0,opacity:publishing?0.5:1}}>
            {publishing ? <Loader2 size={12} style={{animation:"spin 1s linear infinite"}}/>
              : (article as any)?.isPublished ? <><Globe size={12}/> Unpublish</>
              : <><SendIcon size={12}/> Publish</>}
          </button>

          {/* Share button — only when the article is actually published */}
          {(article as any)?.isPublished && (
            <ArticleShareButton
              articleId={id}
              article={article}
              canvasWidth={containerW}
              open={showShareMenu}
              onOpenChange={setShowShareMenu}
              copied={shareCopied}
              onCopiedChange={setShareCopied}
            />
          )}
        </div>
        {/* Spacer for fixed top bar */}
        <div style={{height:48}}/>

        {/* ── FORMATTING TOOLBAR — Fixed below the (also fixed) top bar so it
             stays visible regardless of scroll position or parent stacking
             contexts. Sticky occasionally failed here because of Layout's
             flex wrappers; fixed is the reliable fix. ── */}
        {!focusMode && (
        <div
          style={{
            position:"fixed",top:92,left:0,right:0,zIndex:49, /* 44px Layout nav + 48px top bar */
            scrollbarWidth:"none" as any,
            background:"rgba(16,16,20,0.98)",backdropFilter:"blur(20px)",
            borderBottom:`1px solid ${B2}`,
            padding:"0 14px",height:44,
            display:"flex",alignItems:"center",justifyContent:"center",gap:2,
            overflowX:"auto",scrollbarWidth:"none",
          }}
          onMouseDown={e => e.preventDefault()}
        >
          {/* Group 1: Undo/Redo */}
          <Btn onClick={() => editor?.chain().focus().undo().run()} title="Undo (Ctrl+Z)"><Undo2 size={14}/></Btn>
          <Btn onClick={() => editor?.chain().focus().redo().run()} title="Redo (Ctrl+Y)"><Redo2 size={14}/></Btn>
          <Sep/>

          {/* Group 2: Text Style + Font + Size */}
          <div data-dropdown>
            <button
              ref={styleBtnRef}
              onMouseDown={e => { e.preventDefault(); setStyleOpen(o=>!o); setFontOpen(false); setColorOpen(false); setLinkOpen(false); }}
              style={{
                display:"flex",alignItems:"center",gap:5,
                padding:"0 8px",height:28,borderRadius:5,border:"none",cursor:"pointer",
                background: styleOpen ? "rgba(255,255,255,0.12)" : "transparent",
                color:TS, fontFamily:SF, fontSize:12, minWidth:100, whiteSpace:"nowrap",
              }}
              onMouseEnter={e => { if(!styleOpen)(e.currentTarget as HTMLElement).style.background="rgba(255,255,255,0.07)"; }}
              onMouseLeave={e => { if(!styleOpen)(e.currentTarget as HTMLElement).style.background="transparent"; }}
            >
              <span style={{flex:1,textAlign:"left"}}>{currentStyle()}</span>
              <ChevronDown size={11}/>
            </button>
          </div>

          <div data-dropdown>
            <button
              ref={fontBtnRef}
              onMouseDown={e => { e.preventDefault(); setFontOpen(o=>!o); setStyleOpen(false); setColorOpen(false); setLinkOpen(false); }}
              style={{
                display:"flex",alignItems:"center",gap:5,
                padding:"0 8px",height:28,borderRadius:5,border:"none",cursor:"pointer",
                background: fontOpen ? "rgba(255,255,255,0.12)" : "transparent",
                color:TS, fontFamily: currentFont()?.ff || "Georgia, serif", fontSize:12,
                minWidth:120, maxWidth:155, overflow:"hidden",
              }}
              onMouseEnter={e => { if(!fontOpen)(e.currentTarget as HTMLElement).style.background="rgba(255,255,255,0.07)"; }}
              onMouseLeave={e => { if(!fontOpen)(e.currentTarget as HTMLElement).style.background="transparent"; }}
            >
              <span style={{flex:1,textAlign:"left",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{currentFont()?.label || "Georgia"}</span>
              <ChevronDown size={11} style={{flexShrink:0}}/>
            </button>
          </div>

          <div style={{display:"flex",alignItems:"center",gap:1,marginLeft:2}}>
            <button onMouseDown={e=>{e.preventDefault();changeSize(-1);}} style={{display:"flex",alignItems:"center",justifyContent:"center",width:18,height:26,background:"transparent",border:"none",cursor:"pointer",color:TS,borderRadius:3}} onMouseEnter={e=>(e.currentTarget.style.background="rgba(255,255,255,0.07)")} onMouseLeave={e=>(e.currentTarget.style.background="transparent")}><Minus size={10}/></button>
            <input
              value={fontSizeInput}
              onChange={e => setFontSizeInput(e.target.value)}
              onBlur={() => {
                const n = parseInt(fontSizeInput,10);
                if (!isNaN(n) && n>=8 && n<=96) {
                  setFontSize(n);
                  (editor?.chain().focus() as any)?.setFontSize(n)?.run();
                } else setFontSizeInput(String(fontSize));
              }}
              onKeyDown={e => { if(e.key==="Enter")(e.target as HTMLInputElement).blur(); }}
              style={{width:30,height:26,background:"rgba(255,255,255,0.05)",border:`1px solid ${B}`,borderRadius:4,textAlign:"center",fontFamily:SF,fontSize:12,color:T,outline:"none"}}
            />
            <button onMouseDown={e=>{e.preventDefault();changeSize(1);}} style={{display:"flex",alignItems:"center",justifyContent:"center",width:18,height:26,background:"transparent",border:"none",cursor:"pointer",color:TS,borderRadius:3}} onMouseEnter={e=>(e.currentTarget.style.background="rgba(255,255,255,0.07)")} onMouseLeave={e=>(e.currentTarget.style.background="transparent")}><Plus size={10}/></button>
          </div>
          <Sep/>

          {/* Group 3: B I U S */}
          <Btn onClick={() => editor?.chain().focus().toggleBold().run()} active={editor?.isActive("bold")} title="Bold (Ctrl+B)"><Bold size={13}/></Btn>
          <Btn onClick={() => editor?.chain().focus().toggleItalic().run()} active={editor?.isActive("italic")} title="Italic (Ctrl+I)"><Italic size={13}/></Btn>
          <Btn onClick={() => editor?.chain().focus().toggleUnderline().run()} active={editor?.isActive("underline")} title="Underline (Ctrl+U)"><UIcon size={13}/></Btn>
          <Btn onClick={() => editor?.chain().focus().toggleStrike().run()} active={editor?.isActive("strike")} title="Strikethrough"><Strikethrough size={13}/></Btn>
          <Sep/>

          {/* Group 4: Text Color + Highlight */}
          <div data-dropdown>
            <button
              ref={colorBtnRef}
              onMouseDown={e=>{e.preventDefault();setColorOpen(o=>!o);setStyleOpen(false);setFontOpen(false);setLinkOpen(false);}}
              title="Text color"
              style={{
                display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",
                width:28,height:26,borderRadius:4,border:"none",cursor:"pointer",
                background: colorOpen?"rgba(255,255,255,0.12)":"transparent",color:TS,gap:2,
              }}
              onMouseEnter={e=>{if(!colorOpen)(e.currentTarget as HTMLElement).style.background="rgba(255,255,255,0.07)";}}
              onMouseLeave={e=>{if(!colorOpen)(e.currentTarget as HTMLElement).style.background="transparent";}}
            >
              <Type size={12}/>
              <div style={{width:14,height:3,borderRadius:2,background:editor?.getAttributes("textStyle")?.color||"#fff"}}/>
            </button>
          </div>
          <Btn onClick={() => editor?.chain().focus().toggleHighlight({color:"rgba(124,106,247,0.25)"}).run()} active={editor?.isActive("highlight")} title="Highlight"><Highlighter size={13}/></Btn>
          <Sep/>

          {/* Group 5: Alignment */}
          <Btn onClick={() => editor?.chain().focus().setTextAlign("left").run()} active={editor?.isActive({textAlign:"left"})} title="Align left"><AlignLeft size={13}/></Btn>
          <Btn onClick={() => editor?.chain().focus().setTextAlign("center").run()} active={editor?.isActive({textAlign:"center"})} title="Align center"><AlignCenter size={13}/></Btn>
          <Btn onClick={() => editor?.chain().focus().setTextAlign("right").run()} active={editor?.isActive({textAlign:"right"})} title="Align right"><AlignRight size={13}/></Btn>
          <Btn onClick={() => editor?.chain().focus().setTextAlign("justify").run()} active={editor?.isActive({textAlign:"justify"})} title="Justify"><AlignJustify size={13}/></Btn>
          <Sep/>

          {/* Group 6: Lists + Indent/Outdent */}
          <Btn onClick={() => editor?.chain().focus().toggleBulletList().run()} active={editor?.isActive("bulletList")} title="Bullet list"><List size={13}/></Btn>
          <Btn onClick={() => editor?.chain().focus().toggleOrderedList().run()} active={editor?.isActive("orderedList")} title="Numbered list"><ListOrdered size={13}/></Btn>
          <Btn onClick={() => editor?.chain().focus().sinkListItem("listItem").run()} title="Indent"><Indent size={13}/></Btn>
          <Btn onClick={() => editor?.chain().focus().liftListItem("listItem").run()} title="Outdent"><Outdent size={13}/></Btn>
          <Sep/>

          {/* Group 7: Blockquote + Code + Divider */}
          <Btn onClick={() => editor?.chain().focus().toggleBlockquote().run()} active={editor?.isActive("blockquote")} title="Blockquote"><Quote size={13}/></Btn>
          <Btn onClick={() => editor?.chain().focus().toggleCodeBlock().run()} active={editor?.isActive("codeBlock")} title="Code block"><Code size={13}/></Btn>
          <Btn onClick={() => editor?.chain().focus().setHorizontalRule().run()} title="Divider"><Minus size={13}/></Btn>
          <Sep/>

          {/* Group 8: Link + Image + AI Image */}
          <div data-dropdown>
            <button
              ref={linkBtnRef}
              onMouseDown={e=>{e.preventDefault();setLinkUrl(editor?.getAttributes("link")?.href||"");setLinkOpen(o=>!o);setStyleOpen(false);setFontOpen(false);setColorOpen(false);}}
              title="Insert link"
              style={{
                display:"flex",alignItems:"center",justifyContent:"center",
                width:28,height:26,borderRadius:4,border:"none",cursor:"pointer",
                background: editor?.isActive("link") ? "rgba(255,255,255,0.15)" : linkOpen ? "rgba(255,255,255,0.12)" : "transparent",
                color: editor?.isActive("link") ? "#fff" : TS,
              }}
              onMouseEnter={e=>{if(!linkOpen&&!editor?.isActive("link"))(e.currentTarget as HTMLElement).style.background="rgba(255,255,255,0.07)";}}
              onMouseLeave={e=>{if(!linkOpen&&!editor?.isActive("link"))(e.currentTarget as HTMLElement).style.background="transparent";}}
            >
              <LinkIcon size={13}/>
            </button>
          </div>
          <div style={{display:"flex",alignItems:"center",gap:4,flexShrink:0,marginLeft:2}}>
            <button
              onMouseDown={e=>{e.preventDefault();inlineImgInputRef.current?.click();}}
              title="Upload image"
              style={{display:"flex",alignItems:"center",gap:5,padding:"3px 10px",height:26,borderRadius:6,background:"rgba(255,255,255,0.07)",border:"1px solid rgba(255,255,255,0.1)",cursor:"pointer",fontFamily:SF,fontSize:11,fontWeight:500,color:TS,whiteSpace:"nowrap"}}
              onMouseEnter={e=>{e.currentTarget.style.background="rgba(255,255,255,0.12)";}}
              onMouseLeave={e=>{e.currentTarget.style.background="rgba(255,255,255,0.07)";}}
            >
              <ImageIcon size={12}/> Image
            </button>
            <input ref={inlineImgInputRef} type="file" accept="image/*" style={{display:"none"}} onChange={e=>{const f=e.target.files?.[0];if(f)insertImageFromFile(f);e.target.value="";}}/>
          </div>

          <Sep/>
          {/* Search + AI Writing Assistant */}
          <div style={{flexShrink:0,display:"flex",alignItems:"center",gap:5}}>
            <button
              onMouseDown={e=>{e.preventDefault(); setShowArticleSearch(s => !s); if(showArticleSearch){setArticleSearchQuery("");setArticleSearchCount(0);document.querySelectorAll("mark[data-search-highlight]").forEach(el=>{const p=el.parentNode;if(p){p.replaceChild(document.createTextNode(el.textContent||""),el);p.normalize();}});}}}
              title="Search (Ctrl+F)"
              style={{display:"flex",alignItems:"center",padding:"5px 8px",borderRadius:7,background:showArticleSearch?"rgba(250,204,21,0.15)":"transparent",border:showArticleSearch?"1px solid rgba(250,204,21,0.3)":"1px solid transparent",color:showArticleSearch?"#fbbf24":"rgba(255,255,255,0.4)",cursor:"pointer"}}
            ><Search size={14}/></button>
            <button
              onMouseDown={e=>{e.preventDefault();setShowAI(true);}}
              style={{
                display:"flex",alignItems:"center",gap:6,
                padding:"5px 14px",borderRadius:7,
                background:showAI?`${ACC}2a`:`${ACC}1a`,border:`1px solid ${ACC}45`,
                cursor:"pointer",fontFamily:SF,fontSize:11,fontWeight:600,color:ACC,whiteSpace:"nowrap",
              }}
            >
              <Sparkles size={11}/> AI Writer
            </button>
          </div>
        </div>
        )}
        {/* Spacer so content below doesn't hide behind the now-fixed toolbar */}
        {!focusMode && <div style={{height:44}}/>}

        {/* ── DROPDOWNS (portaled into body via fixed positioning) ── */}

        {/* Style dropdown */}
        {styleOpen && stylePos && (
          <div data-dropdown style={{...dropStyle, top:stylePos.top, left:stylePos.left, minWidth:165}}>
            {TEXT_STYLES.map(s => (
              <button key={s.value}
                onMouseDown={e=>{e.preventDefault();applyStyle(s.value);}}
                style={{display:"block",width:"100%",padding:"7px 12px",textAlign:"left",background:"transparent",border:"none",cursor:"pointer",fontFamily:SF,fontSize:13,color:TS,borderRadius:6}}
                onMouseEnter={e=>(e.currentTarget.style.background="rgba(255,255,255,0.08)")}
                onMouseLeave={e=>(e.currentTarget.style.background="transparent")}
              >{s.label}</button>
            ))}
          </div>
        )}

        {/* Font dropdown */}
        {fontOpen && fontPos && (
          <div data-dropdown style={{...dropStyle, top:fontPos.top, left:fontPos.left, width:220, maxHeight:340, overflowY:"auto"}}>
            {["Serif","Sans","Handwriting","Mono","Arabic"].map(cat => {
              const group = FONTS.filter(f => f.cat === cat);
              return (
                <div key={cat}>
                  <div style={{fontFamily:SF,fontSize:9,fontWeight:700,color:TD,letterSpacing:"0.1em",textTransform:"uppercase",padding:"10px 12px 4px"}}>{cat}</div>
                  {group.map(f => (
                    <button key={f.id}
                      onMouseDown={e=>{e.preventDefault();applyFont(f);}}
                      style={{display:"block",width:"100%",padding:"6px 12px",textAlign:"left",background:"transparent",border:"none",cursor:"pointer",fontFamily:f.ff,fontSize:13,color:TS,borderRadius:6}}
                      onMouseEnter={e=>(e.currentTarget.style.background="rgba(255,255,255,0.08)")}
                      onMouseLeave={e=>(e.currentTarget.style.background="transparent")}
                    >{f.label}</button>
                  ))}
                </div>
              );
            })}
          </div>
        )}

        {/* Color dropdown */}
        {colorOpen && colorPos && (
          <div data-dropdown style={{...dropStyle, top:colorPos.top, left:colorPos.left, padding:12}}>
            <div style={{display:"grid",gridTemplateColumns:"repeat(7,1fr)",gap:5,marginBottom:8}}>
              {TEXT_COLORS.map(c => (
                <button key={c}
                  onMouseDown={e=>{e.preventDefault();editor?.chain().focus().setColor(c).run();setColorOpen(false);}}
                  title={c}
                  style={{
                    width:22,height:22,borderRadius:5,cursor:"pointer",
                    background:c,
                    border:`2px solid ${c==="#ffffff"?"rgba(255,255,255,0.25)":"transparent"}`,
                    outline:"none",
                  }}
                />
              ))}
            </div>
            <button
              onMouseDown={e=>{e.preventDefault();editor?.chain().focus().unsetColor().run();setColorOpen(false);}}
              style={{width:"100%",padding:"5px 8px",background:"rgba(255,255,255,0.05)",border:`1px solid ${B}`,borderRadius:6,cursor:"pointer",fontFamily:SF,fontSize:11,color:TD}}
            >Remove color</button>
          </div>
        )}

        {/* Link dropdown */}
        {linkOpen && linkPos && (
          <div data-dropdown style={{...dropStyle, top:linkPos.top, left:linkPos.left, padding:12, width:280}}>
            <div style={{fontFamily:SF,fontSize:11,color:TD,marginBottom:7}}>Insert Link</div>
            <input
              value={linkUrl}
              onChange={e => setLinkUrl(e.target.value)}
              onKeyDown={e => { if(e.key==="Enter") applyLink(); if(e.key==="Escape") setLinkOpen(false); }}
              placeholder="https://example.com"
              autoFocus
              style={{width:"100%",padding:"8px 10px",background:C2,border:`1px solid ${B}`,borderRadius:7,fontFamily:SF,fontSize:12,color:TS,outline:"none",boxSizing:"border-box"}}
            />
            <div style={{display:"flex",gap:6,marginTop:8}}>
              <button onMouseDown={e=>{e.preventDefault();applyLink();}} style={{flex:1,padding:"7px 0",background:ACC,border:"none",borderRadius:7,cursor:"pointer",fontFamily:SF,fontSize:12,color:"#fff",fontWeight:600}}>Apply</button>
              {editor?.isActive("link") && (
                <button onMouseDown={e=>{e.preventDefault();editor?.chain().focus().unsetLink().run();setLinkOpen(false);}} style={{padding:"7px 12px",background:"rgba(248,113,113,0.15)",border:"1px solid rgba(248,113,113,0.3)",borderRadius:7,cursor:"pointer",fontFamily:SF,fontSize:12,color:"#f87171"}}>Remove</button>
              )}
              <button onMouseDown={e=>{e.preventDefault();setLinkOpen(false);}} style={{padding:"7px 12px",background:"rgba(255,255,255,0.06)",border:`1px solid ${B}`,borderRadius:7,cursor:"pointer",fontFamily:SF,fontSize:12,color:TD}}>Cancel</button>
            </div>
          </div>
        )}

        {/* ── WRITING CANVAS — centered column, the star of the show ── */}
        <div style={{
          maxWidth:720,
          margin:"0 auto",
          padding: focusMode ? "36px 24px 120px" : "48px 24px 120px",
          transition:"all 0.3s ease",
        }}>
          {/* Featured Image — shown only when image exists */}
          {featuredImage && (
            <div
              style={{ marginBottom:32, display:"flex",
                justifyContent: imgAlign==="left" ? "flex-start" : imgAlign==="right" ? "flex-end" : "center" }}
              onDragOver={e=>e.preventDefault()}
            >
              <div
                ref={featContRef}
                style={{
                  position:"relative",
                  width: featDragging ? `${featLive.w}px` : imgWidth ? `${imgWidth}px` : "100%",
                  minWidth:120, maxWidth:"100%",
                  borderRadius:14, overflow:"visible", flexShrink:0, userSelect:"none",
                }}
              >
                <img
                  ref={featImgRef}
                  src={featuredImage!}
                  alt="Featured"
                  draggable={false}
                  onLoad={e=>{
                    const img=e.currentTarget;
                    featNatRef.current={w:img.naturalWidth,h:img.naturalHeight};
                  }}
                  style={{
                    width:"100%", display:"block", borderRadius:14, objectFit:"cover",
                    height: featDragging ? `${featLive.h}px` : imgHeight ? `${imgHeight}px` : undefined,
                    maxHeight: (!featDragging && !imgHeight) ? 420 : undefined,
                  }}
                />

                {/* Floating toolbar on hover */}
                {!featDragging && (
                  <div style={{ position:"absolute", top:-46, left:"50%", transform:"translateX(-50%)",
                    display:"flex", alignItems:"center", gap:4,
                    background:"rgba(0,0,0,0.88)", backdropFilter:"blur(14px)",
                    border:"1px solid rgba(255,255,255,0.14)", borderRadius:10,
                    padding:"5px 8px", zIndex:50, whiteSpace:"nowrap",
                    opacity:0, transition:"opacity 0.15s",
                  }}
                  className="feat-img-toolbar"
                  >
                    {(["left","center","right"] as const).map(a => (
                      <button key={a} onClick={()=>setImgAlign(a)} title={`Align ${a}`}
                        style={{ width:26,height:24,borderRadius:5,border:"none",cursor:"pointer",
                          display:"flex",alignItems:"center",justifyContent:"center",
                          background:imgAlign===a?"rgba(124,106,247,0.4)":"transparent",color:"#fff" }}>
                        {a==="left"?<AlignLeft size={11}/>:a==="center"?<AlignCenter size={11}/>:<AlignRight size={11}/>}
                      </button>
                    ))}
                    <div style={{width:1,height:14,background:"rgba(255,255,255,0.15)",margin:"0 2px"}}/>
                    <button onClick={()=>{setImgWidth(100);setImgHeight(null);}} title="Reset size"
                      style={{ height:24,padding:"0 9px",borderRadius:5,border:"none",cursor:"pointer",
                        background:"transparent",fontFamily:SF,fontSize:10,fontWeight:600,
                        color:"rgba(255,255,255,0.75)",whiteSpace:"nowrap" }}>
                      Reset
                    </button>
                    <div style={{width:1,height:14,background:"rgba(255,255,255,0.15)",margin:"0 2px"}}/>
                    <button onClick={()=>fileInputRef.current?.click()} title="Change image"
                      style={{ width:24,height:24,borderRadius:5,border:"none",cursor:"pointer",
                        background:"transparent",color:"#fff",display:"flex",alignItems:"center",justifyContent:"center" }}>
                      <Upload size={11}/>
                    </button>
                    <button onClick={()=>{setFeaturedImage(null);setImgWidth(100);setImgHeight(null);}} title="Remove image"
                      style={{ width:24,height:24,borderRadius:5,border:"none",cursor:"pointer",
                        background:"transparent",color:"#f87171",display:"flex",alignItems:"center",justifyContent:"center" }}>
                      <X size={11}/>
                    </button>
                  </div>
                )}

                {/* 8 Resize handles */}
                {HANDLES.map(h => (
                  <div key={h.id}
                    style={{
                      position:"absolute",
                      top:h.top, bottom:h.bottom, left:h.left, right:h.right,
                      transform:[h.tx&&`translateX(${h.tx})`,h.ty&&`translateY(${h.ty})`].filter(Boolean).join(" ")||undefined,
                      width:HS, height:HS,
                      background:"#fff", border:`2px solid ${_ACC}`,
                      borderRadius:2, cursor:h.cursor, zIndex:50,
                      opacity:0, transition:"opacity 0.15s",
                    }}
                    className="feat-img-handle"
                    onMouseDown={e=>{
                      e.preventDefault(); e.stopPropagation();
                      const img = featImgRef.current;
                      const cont = featContRef.current;
                      if (!img || !cont) return;
                      const startX=e.clientX, startY=e.clientY;
                      const startW=cont.offsetWidth;
                      const startH=img.offsetHeight;
                      const parentW=cont.parentElement?.offsetWidth||startW;
                      const natW=featNatRef.current.w||startW, natH=featNatRef.current.h||startH;
                      const ratio=natW/natH;
                      setFeatDragging(true);
                      setFeatLive({w:startW,h:startH});
                      const calc=(me:MouseEvent):{w:number;h:number}=>{
                        const dx=(me.clientX-startX)*h.dx;
                        const dy=(me.clientY-startY)*h.dy;
                        if(h.corner){
                          const delta=Math.abs(dx)>Math.abs(dy)?dx:dy;
                          const nw=Math.max(120,startW+delta);
                          return{w:nw,h:nw/ratio};
                        }
                        return{
                          w:h.dx!==0?Math.max(120,startW+dx):startW,
                          h:h.dy!==0?Math.max(60,startH+dy):startH,
                        };
                      };
                      const onMove=(me:MouseEvent)=>{const d=calc(me);setFeatLive({w:Math.round(d.w),h:Math.round(d.h)});};
                      const onUp=(me:MouseEvent)=>{
                        const d=calc(me);
                        setImgWidth(Math.min(Math.round(d.w), parentW));
                        if(h.dy!==0||h.corner) setImgHeight(Math.round(d.h));
                        setFeatDragging(false);
                        window.removeEventListener("mousemove",onMove);
                        window.removeEventListener("mouseup",onUp);
                      };
                      window.addEventListener("mousemove",onMove);
                      window.addEventListener("mouseup",onUp);
                    }}
                  />
                ))}

                {/* Real-time dimension badge */}
                {featDragging && (
                  <div style={{ position:"absolute", bottom:-30, left:"50%", transform:"translateX(-50%)",
                    background:"rgba(0,0,0,0.88)", color:"#fff", fontFamily:SF, fontSize:11, fontWeight:600,
                    padding:"3px 10px", borderRadius:7, whiteSpace:"nowrap", zIndex:60, pointerEvents:"none" }}>
                    {featLive.w} × {featLive.h} px
                  </div>
                )}
              </div>
              <input ref={fileInputRef} type="file" accept="image/*" style={{display:"none"}} onChange={e=>{const f=e.target.files?.[0];if(f)handleImageFile(f);}}/>
            </div>
          )}

          {/* Category badge inline */}
          {category && selCat && (
            <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:14}}>
              <span style={{fontFamily:SF,fontSize:10,fontWeight:700,letterSpacing:"0.06em",textTransform:"uppercase",padding:"4px 12px",borderRadius:20,background:selCat.color+"22",color:selCat.color}}>{category}</span>
              <button onClick={()=>setCategory("")} style={{background:"none",border:"none",cursor:"pointer",color:TD,display:"flex"}}><X size={11}/></button>
            </div>
          )}

          {/* Title — Large Georgia serif */}
          <textarea
            value={title}
            onChange={e => setTitle(e.target.value)}
            placeholder="Your article title…"
            rows={2}
            dir={isRTL?"rtl":"ltr"}
            style={{
              width:"100%",resize:"none",background:"transparent",
              border:"none",outline:"none",
              fontFamily:"Georgia,'Times New Roman',serif",
              fontWeight:800,fontSize:"2.8rem",
              color:T,lineHeight:1.15,marginBottom:6,
              letterSpacing:"-0.02em",
            }}
          />
          <p style={{fontFamily:SF,fontSize:11,color:TD,marginBottom:28,opacity:0.6}}>
            {title.length > 0 ? `${title.length} chars` : "Add a compelling title"}
          </p>

          {/* Search bar */}
          {showArticleSearch && (
            <div style={{display:"flex",alignItems:"center",gap:8,padding:"8px 16px",background:"rgba(0,0,0,0.6)",borderRadius:10,marginBottom:12,border:"1px solid rgba(255,255,255,0.08)"}}>
              <Search size={14} style={{color:"rgba(255,255,255,0.3)",flexShrink:0}}/>
              <input autoFocus value={articleSearchQuery} onChange={e=>setArticleSearchQuery(e.target.value)}
                placeholder="Search in article..." style={{flex:1,background:"transparent",border:"none",outline:"none",color:"#fff",fontSize:13,fontFamily:SF}}
                onKeyDown={e=>{if(e.key==="Escape"){setShowArticleSearch(false);setArticleSearchQuery("");}}}/>
              {articleSearchCount>0&&<span style={{fontSize:11,color:"rgba(250,204,21,0.8)",flexShrink:0}}>{articleSearchCount} found</span>}
              {articleSearchQuery&&articleSearchCount===0&&<span style={{fontSize:11,color:"rgba(255,255,255,0.3)",flexShrink:0}}>No results</span>}
              <button onClick={()=>{setShowArticleSearch(false);setArticleSearchQuery("");setArticleSearchCount(0);document.querySelectorAll("mark[data-search-highlight]").forEach(el=>{const p=el.parentNode;if(p){p.replaceChild(document.createTextNode(el.textContent||""),el);p.normalize();}});}} style={{color:"rgba(255,255,255,0.3)"}}><X size={14}/></button>
            </div>
          )}

          {/* TipTap editor with floating image overlay */}
          <div ref={editorContainerRef} style={{ position: "relative" }}>
            <EditorContent editor={editor} className="article-editor-content" dir={isRTL?"rtl":"ltr"}/>
            <FloatingImageOverlay
              images={floatingImages}
              pageWidth={containerW}
              pageHeight={999999}
              zoom={100}
              onUpdate={(imgs) => setFloatingImages(imgs)}
              ar={isRTL}
            />
          </div>

          {/* Tags shown inline below content as pills */}
          {tags.length > 0 && (
            <div style={{display:"flex",flexWrap:"wrap",gap:8,paddingTop:24,borderTop:`1px solid ${B}`,marginTop:32}}>
              {tags.map(tag => (
                <span key={tag} style={{display:"inline-flex",alignItems:"center",gap:5,fontFamily:SF,fontSize:11,fontWeight:500,color:TS,padding:"5px 12px",borderRadius:20,background:C2,border:`1px solid ${B}`}}>
                  #{tag}
                  <button onClick={()=>setTags(p=>p.filter(x=>x!==tag))} style={{background:"none",border:"none",cursor:"pointer",color:TD,display:"flex",padding:0,marginLeft:2}}><X size={9}/></button>
                </span>
              ))}
            </div>
          )}
        </div>

        {/* ── SETTINGS DRAWER — slides from right ── */}
        {/* Backdrop */}
        {drawerOpen && (
          <div
            onClick={() => setDrawerOpen(false)}
            style={{
              position:"fixed",inset:0,zIndex:998,
              background:"rgba(0,0,0,0.45)",
              backdropFilter:"blur(2px)",
              transition:"opacity 0.2s",
            }}
          />
        )}
        {/* Drawer panel */}
        <div style={{
          position:"fixed",top:0,right:0,bottom:0,
          width:340,zIndex:999,
          background:"#0e0e12",
          borderLeft:`1px solid ${B}`,
          boxShadow: drawerOpen ? "-8px 0 40px rgba(0,0,0,0.6)" : "none",
          transform: drawerOpen ? "translateX(0)" : "translateX(100%)",
          transition:"transform 0.28s cubic-bezier(0.4,0,0.2,1)",
          overflowY:"auto",scrollbarWidth:"none",
          display:"flex",flexDirection:"column",
        }}>
          {/* Drawer header */}
          <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"18px 20px 14px",borderBottom:`1px solid ${B}`,flexShrink:0}}>
            <span style={{fontFamily:SF,fontSize:13,fontWeight:700,color:T,letterSpacing:"-0.01em"}}>Settings</span>
            <button onClick={() => setDrawerOpen(false)} style={{background:"none",border:"none",cursor:"pointer",color:TD,display:"flex",padding:4}}>
              <X size={16}/>
            </button>
          </div>

          <div style={{padding:"16px 20px 32px",display:"flex",flexDirection:"column",gap:14}}>
            {/* AI Writing Assistant — prominent at top */}
            <button
              onClick={() => { setShowAI(true); setDrawerOpen(false); }}
              style={{
                width:"100%",display:"flex",alignItems:"center",gap:10,
                padding:"14px 16px",borderRadius:14,cursor:"pointer",
                background:`linear-gradient(135deg,${ACC}1a 0%,rgba(124,106,247,0.08) 100%)`,
                border:`1px solid ${ACC}35`,transition:"all 0.2s",
              }}
              onMouseEnter={e=>(e.currentTarget.style.background=`linear-gradient(135deg,${ACC}28 0%,rgba(124,106,247,0.14) 100%)`)}
              onMouseLeave={e=>(e.currentTarget.style.background=`linear-gradient(135deg,${ACC}1a 0%,rgba(124,106,247,0.08) 100%)`)}
            >
              <div style={{width:36,height:36,borderRadius:10,background:`${ACC}20`,border:`1px solid ${ACC}40`,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
                <Sparkles size={16} color={ACC}/>
              </div>
              <div style={{textAlign:"left"}}>
                <div style={{fontFamily:SF,fontSize:12,fontWeight:700,color:T,marginBottom:2}}>AI Writing Assistant</div>
                <div style={{fontFamily:SF,fontSize:10,color:TS}}>Polish · Expand · Translate · Rewrite</div>
              </div>
            </button>

            {/* Stats section */}
            <div style={{background:C1,borderRadius:14,border:`1px solid ${B}`,padding:16}}>
              <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:13}}>
                <BarChart2 size={11} color={TD}/>
                <span style={{fontFamily:SF,fontSize:9,fontWeight:700,letterSpacing:"0.09em",textTransform:"uppercase",color:TD}}>Stats</span>
              </div>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:7,marginBottom:11}}>
                {[
                  {v:words.toLocaleString(), l:"Words"},
                  {v:String(readTime),        l:"Min read"},
                  {v:(article.language||"EN").toUpperCase(), l:"Lang"},
                ].map(({v,l}) => (
                  <div key={l} style={{background:C2,borderRadius:10,padding:"9px 4px",textAlign:"center",border:`1px solid ${B2}`}}>
                    <div style={{fontFamily:SF,fontSize:15,fontWeight:700,color:T}}>{v}</div>
                    <div style={{fontFamily:SF,fontSize:8,color:TD,marginTop:2,fontWeight:600,letterSpacing:"0.05em",textTransform:"uppercase"}}>{l}</div>
                  </div>
                ))}
              </div>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:3,marginBottom:13}}>
                {[
                  {l:"Characters",    v:plain.replace(/\s/g,"").length.toLocaleString()},
                  {l:"Sentences",     v:String(plain.split(/[.!?]+/).filter(s=>s.trim().length>2).length)},
                  {l:"Paragraphs",    v:String(plain.split(/\n\s*\n/).filter(p=>p.trim().length>0).length||1)},
                  {l:"Reading level", v:level.label, vc:level.color},
                ].map(({l,v,vc}:any) => (
                  <div key={l} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"2px 0"}}>
                    <span style={{fontFamily:SF,fontSize:10,color:TD}}>{l}</span>
                    <span style={{fontFamily:SF,fontSize:10,fontWeight:600,color:vc||TS}}>{v}</span>
                  </div>
                ))}
              </div>

              {/* Word goal with progress bar */}
              <div>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:6}}>
                  <button onClick={()=>setShowGoalPicker(p=>!p)} style={{display:"flex",alignItems:"center",gap:4,background:"none",border:"none",cursor:"pointer",fontFamily:SF,fontSize:10,color:TD,padding:0}}>
                    <Target size={9}/> Goal: {wordGoal.toLocaleString()} words
                    <ChevronDown size={9} style={{transform:showGoalPicker?"rotate(180deg)":"none",transition:"0.2s"}}/>
                  </button>
                  <span style={{fontFamily:SF,fontSize:10,color:progress>=100?"#34d399":TD}}>{progress}%</span>
                </div>
                {showGoalPicker && (
                  <div style={{background:"#1a1a1a",border:`1px solid ${B}`,borderRadius:10,overflow:"hidden",marginBottom:8}}>
                    {WORD_GOALS.map(g => (
                      <button key={g.value} onClick={()=>{setWordGoal(g.value);setShowGoalPicker(false);}}
                        style={{width:"100%",padding:"7px 12px",background:wordGoal===g.value?`${ACC}18`:"none",border:"none",borderBottom:`1px solid ${B2}`,cursor:"pointer",textAlign:"left",fontFamily:SF,fontSize:11,color:wordGoal===g.value?ACC:TS}}
                      >{g.label}</button>
                    ))}
                  </div>
                )}
                <div style={{height:4,borderRadius:4,background:C2,overflow:"hidden"}}>
                  <div style={{height:"100%",borderRadius:4,background:progress>=100?"#34d399":ACC,width:`${progress}%`,transition:"width 0.5s ease"}}/>
                </div>
              </div>
            </div>

            {/* Category picker */}
            <div style={{background:C1,borderRadius:14,border:`1px solid ${B}`,padding:16}}>
              <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:11}}>
                <AlignLeft size={11} color={TD}/>
                <span style={{fontFamily:SF,fontSize:9,fontWeight:700,letterSpacing:"0.09em",textTransform:"uppercase",color:TD}}>Category</span>
              </div>
              <div style={{display:"flex",flexWrap:"wrap",gap:5}}>
                {CATEGORIES.map(({label,color}) => (
                  <button key={label} onClick={()=>setCategory(p=>p===label?"":label)}
                    style={{padding:"4px 9px",borderRadius:20,fontFamily:SF,fontSize:10,fontWeight:600,cursor:"pointer",transition:"all 0.15s",
                      background:category===label?color:color+"14",color:category===label?"#fff":color,
                      border:`1px solid ${category===label?color:color+"30"}`}}
                  >{label}</button>
                ))}
              </div>
            </div>

            {/* Tags section */}
            <div style={{background:C1,borderRadius:14,border:`1px solid ${B}`,padding:16}}>
              <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:11}}>
                <Hash size={11} color={TD}/>
                <span style={{fontFamily:SF,fontSize:9,fontWeight:700,letterSpacing:"0.09em",textTransform:"uppercase",color:TD}}>Tags</span>
                <span style={{marginLeft:"auto",fontFamily:SF,fontSize:10,color:TD}}>{tags.length}/10</span>
              </div>
              <div style={{display:"flex",flexWrap:"wrap",gap:5,minHeight:22,marginBottom:9}}>
                {tags.length
                  ? tags.map(tag => (
                      <span key={tag} style={{display:"inline-flex",alignItems:"center",gap:4,fontFamily:SF,fontSize:10,color:TS,padding:"4px 9px",borderRadius:20,background:C2,border:`1px solid ${B}`}}>
                        #{tag}
                        <button onClick={()=>setTags(p=>p.filter(x=>x!==tag))} style={{background:"none",border:"none",cursor:"pointer",color:TD,display:"flex",padding:0}}><X size={9}/></button>
                      </span>
                    ))
                  : <span style={{fontFamily:SF,fontSize:10,color:TD,fontStyle:"italic"}}>No tags yet</span>}
              </div>
              <div style={{display:"flex",gap:5}}>
                <input
                  value={tagInput} onChange={e=>setTagInput(e.target.value)}
                  onKeyDown={e=>{if(e.key==="Enter"||e.key===","){e.preventDefault();addTag();}if(e.key==="Backspace"&&!tagInput&&tags.length)setTags(p=>p.slice(0,-1));}}
                  placeholder="Add a tag…"
                  style={{flex:1,height:30,borderRadius:7,padding:"0 9px",background:C2,border:`1px solid ${B}`,outline:"none",fontFamily:SF,fontSize:11,color:TS}}
                />
                <button onClick={addTag} style={{width:30,height:30,borderRadius:7,background:C2,border:`1px solid ${B}`,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",color:TS}}>
                  <Plus size={13}/>
                </button>
              </div>
              <p style={{fontFamily:SF,fontSize:10,color:TD,marginTop:5}}>Enter or comma to add</p>
            </div>

            {/* Writing Tips */}
            <div style={{background:`${ACC}0d`,borderRadius:14,border:`1px solid ${ACC}22`,padding:16}}>
              <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:9}}>
                <Sparkles size={11} color={ACC}/>
                <span style={{fontFamily:SF,fontSize:9,fontWeight:700,letterSpacing:"0.09em",textTransform:"uppercase",color:ACC+"bb"}}>Writing Tips</span>
              </div>
              <ul style={{listStyle:"none",margin:0,padding:0,display:"flex",flexDirection:"column",gap:6}}>
                {[
                  "Hook your reader in the first sentence",
                  "Keep paragraphs short, 2-3 sentences",
                  "Use subheadings to break up long sections",
                  "Bold key phrases to improve scannability",
                  "End with a question or call-to-action",
                ].map((tip,i) => (
                  <li key={i} style={{display:"flex",alignItems:"flex-start",gap:7}}>
                    <span style={{fontFamily:SF,fontSize:13,color:ACC,flexShrink:0,marginTop:-1}}>·</span>
                    <span style={{fontFamily:SF,fontSize:10,color:TD,lineHeight:1.6}}>{tip}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>

        {/* ── Focus mode: floating save button ── */}
        {focusMode && (
          <div style={{
            position:"fixed",bottom:28,right:28,zIndex:60,
            display:"flex",alignItems:"center",gap:8,
          }}>
            <button onClick={() => setFocusMode(false)} title="Exit focus mode"
              style={{width:40,height:40,borderRadius:12,background:"rgba(20,20,24,0.9)",backdropFilter:"blur(12px)",border:`1px solid ${B}`,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",color:TS,boxShadow:"0 4px 20px rgba(0,0,0,0.5)"}}>
              <Minimize2 size={15}/>
            </button>
            <button onClick={() => saveNow(false)} disabled={saving}
              style={{height:40,padding:"0 20px",borderRadius:12,background:justSaved?"#34d399":"#fff",border:"none",cursor:"pointer",fontFamily:SF,fontSize:13,fontWeight:600,color:justSaved?"#fff":"#000",display:"flex",alignItems:"center",gap:6,boxShadow:"0 4px 20px rgba(0,0,0,0.5)",transition:"all 0.2s"}}>
              {saving ? <><Loader2 size={13} style={{animation:"spin 1s linear infinite"}}/> Saving…</>
                : justSaved ? <><CheckCircle2 size={13}/> Saved</>
                : <><Save size={13}/> Save</>}
            </button>
          </div>
        )}


        {/* ── AI ASSISTANT PANEL ── */}
        {showAI && (
          <AIAssistant
            bookId={id}
            currentContent={stripHtml(content)}
            onApply={text => {
              if (editor) {
                editor.chain().focus().insertContent(
                  `<p>${text.replace(/\n\n+/g,"</p><p>").replace(/\n/g,"<br>")}</p>`
                ).run();
              }
            }}
            onClose={() => setShowAI(false)}
          />
        )}

        {/* ── GLOBAL STYLES ── */}
        <style>{`
          @keyframes spin { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }
          @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.6} }

          .article-editor-content .ProseMirror {
            outline:none; min-height:520px; caret-color:rgba(255,255,255,0.8);
            font-family:Georgia,'Times New Roman',serif;
            font-size:1.08rem; line-height:2.0; color:rgba(255,255,255,0.65);
          }
          .article-editor-content .ProseMirror > * + * { margin-top:0.8em; }
          .article-editor-content .ProseMirror p { margin:0 0 0.9em; }
          .article-editor-content .ProseMirror h1 { font-size:2rem;font-weight:800;color:rgba(255,255,255,0.92);margin:1.4em 0 0.4em;line-height:1.2; }
          .article-editor-content .ProseMirror h2 { font-size:1.5rem;font-weight:700;color:rgba(255,255,255,0.88);margin:1.2em 0 0.35em;line-height:1.25; }
          .article-editor-content .ProseMirror h3 { font-size:1.2rem;font-weight:700;color:rgba(255,255,255,0.84);margin:1.1em 0 0.3em; }
          .article-editor-content .ProseMirror h4 { font-size:1.05rem;font-weight:700;color:rgba(255,255,255,0.78);margin:1em 0 0.3em; }
          .article-editor-content .ProseMirror blockquote {
            border-left:3px solid rgba(124,106,247,0.55);
            margin:1.5em 0;padding:0.5em 0 0.5em 1.3em;
            color:rgba(255,255,255,0.45);font-style:italic;
          }
          .article-editor-content .ProseMirror ul{list-style:disc;padding-left:1.6em;margin:0.7em 0;}
          .article-editor-content .ProseMirror ol{list-style:decimal;padding-left:1.6em;margin:0.7em 0;}
          .article-editor-content .ProseMirror li{margin:0.25em 0;color:rgba(255,255,255,0.6);}
          .article-editor-content .ProseMirror code{background:rgba(255,255,255,0.08);border-radius:4px;padding:2px 6px;font-family:'Courier Prime',monospace;font-size:0.88em;color:rgba(124,106,247,0.9);}
          .article-editor-content .ProseMirror pre{background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.07);border-radius:10px;padding:16px;margin:1em 0;overflow-x:auto;}
          .article-editor-content .ProseMirror pre code{background:none;padding:0;color:rgba(255,255,255,0.7);}
          .article-editor-content .ProseMirror hr{border:none;border-top:1px solid rgba(255,255,255,0.09);margin:2em 0;}
          .article-editor-content .ProseMirror a{color:#818cf8;text-decoration:underline;text-decoration-color:rgba(129,140,248,0.35);}
          .article-editor-content .ProseMirror mark{border-radius:3px;padding:1px 3px;}
          .article-editor-content .ProseMirror p.is-editor-empty:first-child::before{content:attr(data-placeholder);color:rgba(255,255,255,0.12);pointer-events:none;float:left;height:0;}

          /* Featured image: show toolbar & handles on hover */
          div:hover > .feat-img-toolbar { opacity:1 !important; }
          div:hover > .feat-img-handle { opacity:1 !important; }

          .article-preview-body{font-family:Georgia,serif;font-size:1.08rem;line-height:2;color:rgba(255,255,255,0.55);}
          .article-preview-body h1{font-size:2rem;font-weight:800;color:rgba(255,255,255,0.92);margin:1.4em 0 0.5em;}
          .article-preview-body h2{font-size:1.5rem;font-weight:700;color:rgba(255,255,255,0.88);margin:1.2em 0 0.4em;}
          .article-preview-body h3{font-size:1.2rem;font-weight:700;color:rgba(255,255,255,0.82);margin:1.1em 0 0.35em;}
          .article-preview-body blockquote{border-left:3px solid rgba(124,106,247,0.5);margin:1.5em 0;padding:0.5em 0 0.5em 1.3em;color:rgba(255,255,255,0.4);font-style:italic;}
          .article-preview-body ul,.article-preview-body ol{padding-left:1.6em;margin:0.7em 0;}
          .article-preview-body code{background:rgba(255,255,255,0.08);border-radius:4px;padding:2px 6px;font-family:monospace;font-size:0.9em;}
          .article-preview-body a{color:#818cf8;}
          .article-preview-body hr{border:none;border-top:1px solid rgba(255,255,255,0.09);margin:2em 0;}

          input::placeholder{color:rgba(255,255,255,0.18);}
          input{color:rgba(255,255,255,0.7);}
          textarea::placeholder{color:rgba(255,255,255,0.08);}
          textarea{color:rgba(255,255,255,0.88);}
          ::-webkit-scrollbar{width:5px;height:5px;}
          ::-webkit-scrollbar-track{background:transparent;}
          ::-webkit-scrollbar-thumb{background:rgba(255,255,255,0.1);border-radius:3px;}
        `}</style>
      </div>
    </Layout>
  );
}

// ── Share dropdown rendered next to the Publish button in the editor.
// Author-only affordance — Copy Link / X / WhatsApp / LinkedIn. The reader
// page intentionally does not have its own share bar; only the author sees
// this control.
function ArticleShareButton({
  articleId,
  article,
  canvasWidth,
  open,
  onOpenChange,
  copied,
  onCopiedChange,
}: {
  articleId: string;
  article: any;
  canvasWidth: number;
  open: boolean;
  onOpenChange: (v: boolean) => void;
  copied: boolean;
  onCopiedChange: (v: boolean) => void;
}) {
  const title = article?.title || "";
  const SF = "-apple-system,BlinkMacSystemFont,'SF Pro Display','SF Pro Text','Helvetica Neue',sans-serif";
  const B = "rgba(255,255,255,0.08)";

  const btnRef = useRef<HTMLButtonElement>(null);
  // The dropdown must render outside the toolbar — the toolbar uses
  // `overflow-x: auto` for horizontal scrolling, which implicitly clips the
  // y-axis and swallows any absolutely-positioned children. Portal to
  // document.body and pin coordinates to the button's bounding rect.
  const [coords, setCoords] = useState<{ top: number; right: number } | null>(null);

  useEffect(() => {
    if (!open) return;
    const compute = () => {
      const el = btnRef.current;
      if (!el) return;
      const r = el.getBoundingClientRect();
      setCoords({ top: r.bottom + 6, right: window.innerWidth - r.right });
    };
    compute();
    window.addEventListener("resize", compute);
    window.addEventListener("scroll", compute, true);
    return () => {
      window.removeEventListener("resize", compute);
      window.removeEventListener("scroll", compute, true);
    };
  }, [open]);

  const url = typeof window !== "undefined"
    ? `${window.location.origin}/blog/${articleId}`
    : "";

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(url);
      onCopiedChange(true);
      setTimeout(() => onCopiedChange(false), 2000);
    } catch {}
  };

  const openExternal = (href: string) => {
    window.open(href, "_blank", "noopener,noreferrer");
    onOpenChange(false);
  };

  const shareTo = {
    x: () => openExternal(`https://x.com/intent/tweet?text=${encodeURIComponent(title)}&url=${encodeURIComponent(url)}`),
    whatsapp: () => openExternal(`https://wa.me/?text=${encodeURIComponent((title || "") + " " + url)}`),
    linkedin: () => openExternal(`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`),
  };

  const downloadPdf = () => {
    onOpenChange(false);
    openArticleAsPdf(article, url, canvasWidth);
  };

  return (
    <>
      <button
        ref={btnRef}
        onClick={() => onOpenChange(!open)}
        title="Share this article"
        style={{
          display: "flex", alignItems: "center", gap: 5,
          padding: "6px 12px", borderRadius: 7, cursor: "pointer",
          background: "rgba(255,255,255,0.06)", border: `1px solid ${B}`,
          fontFamily: SF, fontSize: 12, fontWeight: 600, color: "rgba(255,255,255,0.8)",
          transition: "all 0.2s", flexShrink: 0,
        }}
      >
        <Share2 size={12} /> Share
      </button>

      {open && coords && createPortal(
        <>
          <div
            onClick={() => onOpenChange(false)}
            style={{ position: "fixed", inset: 0, zIndex: 10000, background: "transparent" }}
          />
          <div
            role="menu"
            style={{
              position: "fixed", top: coords.top, right: coords.right,
              minWidth: 240, zIndex: 10001,
              background: "#15151a", border: `1px solid ${B}`, borderRadius: 10,
              boxShadow: "0 12px 32px rgba(0,0,0,0.6)", padding: 6,
              fontFamily: SF,
            }}
          >
            <div style={{ padding: "8px 10px 6px", fontSize: 10, fontWeight: 700, letterSpacing: "0.16em", textTransform: "uppercase", color: "rgba(255,255,255,0.35)" }}>
              Share this article
            </div>

            <ShareItem onClick={copyLink}>
              {copied ? <Check size={13} color="#34d399" /> : <Copy size={13} color="rgba(255,255,255,0.6)" />}
              <span style={{ color: copied ? "#34d399" : "rgba(255,255,255,0.85)" }}>
                {copied ? "Link copied" : "Copy link"}
              </span>
            </ShareItem>

            <ShareItem onClick={downloadPdf}>
              <Download size={13} color="rgba(255,255,255,0.6)" />
              <span style={{ color: "rgba(255,255,255,0.85)" }}>Download as PDF</span>
            </ShareItem>

            <div style={{ height: 1, background: "rgba(255,255,255,0.06)", margin: "4px 6px" }} />

            <ShareItem onClick={shareTo.x}>
              <span style={{ width: 13, textAlign: "center", fontSize: 13, color: "rgba(255,255,255,0.6)" }}>𝕏</span>
              <span style={{ color: "rgba(255,255,255,0.85)" }}>Post on X</span>
            </ShareItem>

            <ShareItem onClick={shareTo.whatsapp}>
              <span style={{ width: 13, textAlign: "center", color: "#25d366", fontWeight: 700, fontSize: 12 }}>✓</span>
              <span style={{ color: "rgba(255,255,255,0.85)" }}>WhatsApp</span>
            </ShareItem>

            <ShareItem onClick={shareTo.linkedin}>
              <span style={{ width: 13, textAlign: "center", color: "#0a66c2", fontWeight: 700, fontSize: 12 }}>in</span>
              <span style={{ color: "rgba(255,255,255,0.85)" }}>LinkedIn</span>
            </ShareItem>

            <div style={{ padding: "8px 10px 4px", fontSize: 10, color: "rgba(255,255,255,0.3)", wordBreak: "break-all" }}>
              {url.replace(/^https?:\/\//, "")}
            </div>
          </div>
        </>,
        document.body
      )}
    </>
  );
}

// Opens the article in a popup styled for print and invokes the browser's
// native Print dialog, where "Save as PDF" is available as a destination.
// This keeps output text-based (searchable, selectable) and preserves inline
// images in order — far higher quality than rasterizing via html2canvas.
function openArticleAsPdf(article: any, publicUrl: string, editorCanvasWidth: number) {
  if (!article) return;

  // articleContent may be raw HTML or a JSON wrapper
  // ({ v: 2, html, floatingImages }). Extract both — the HTML covers inline
  // images inserted via the toolbar; floatingImages covers drag-and-drop
  // images that live on the canvas overlay.
  let html = "";
  type FloatingImg = { src: string; x?: number; y?: number; width?: number; height?: number };
  let floatingImages: FloatingImg[] = [];
  try {
    const raw = article.articleContent;
    if (typeof raw === "string") {
      if (raw.trim().startsWith("{")) {
        const parsed = JSON.parse(raw);
        html = parsed?.html || raw;
        if (Array.isArray(parsed?.floatingImages)) {
          floatingImages = parsed.floatingImages;
        }
      } else {
        html = raw;
      }
    }
  } catch {
    html = article.articleContent || "";
  }

  // Reconstruct the canvas layout: absolutely-positioned floating images at
  // their original (x, y) coordinates, overlaid on the natural text flow.
  // We receive the live canvas width from the editor so the PDF canvas
  // matches what the author currently sees — x/y are in pixels relative to
  // that width, so any mismatch would shift every image horizontally.
  const CANVAS_WIDTH = Math.max(320, Math.min(1040, Math.round(editorCanvasWidth || 620)));

  const escape = (s: string) =>
    s.replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!));

  // SECURITY: articleContent is stored HTML; an attacker with a prior write
  // path (TipTap bypass, stolen session, etc.) could plant <script> or event
  // handlers. document.write() into a new-window popup executes inline
  // scripts with full same-origin privileges — so sanitize before writing.
  const safeHtml = sanitizeHtml(html);

  // Only allow http(s) and data:image/ URLs for floating image src — blocks
  // javascript: URIs (harmless on <img> in modern browsers but still) and
  // avoids attribute-breakout via quotes, which the naive template literal
  // below did not escape at all.
  const safeImgSrc = (src: string): string | null => {
    const trimmed = src.trim();
    if (/^https?:\/\//i.test(trimmed) || /^data:image\//i.test(trimmed)) {
      return escape(trimmed);
    }
    return null;
  };
  const validFloating = floatingImages
    .filter(fi => fi && typeof fi.src === "string" && fi.src.length > 0)
    .map(fi => ({ ...fi, safeSrc: safeImgSrc(fi.src) }))
    .filter((fi): fi is FloatingImg & { safeSrc: string } => fi.safeSrc !== null);
  const maxBottom = validFloating.reduce((acc, fi) => {
    const bottom = (fi.y ?? 0) + (fi.height ?? 0);
    return bottom > acc ? bottom : acc;
  }, 0);
  const canvasMinHeight = maxBottom > 0 ? maxBottom + 32 : 0;
  const floatingHtml = validFloating.map(fi => {
    const x = Math.max(0, Math.round(fi.x ?? 0));
    const y = Math.max(0, Math.round(fi.y ?? 0));
    const w = fi.width && fi.width > 0 ? Math.round(fi.width) : 200;
    const h = fi.height && fi.height > 0 ? ` height:${Math.round(fi.height)}px;` : "";
    return `<img class="floating" src="${fi.safeSrc}" alt="" style="position:absolute;left:${x}px;top:${y}px;width:${w}px;${h}" />`;
  }).join("\n");

  const title = article.title || "Untitled";
  const author = article.authorName || article.authorDisplayName || "";
  const date = article.publishedAt
    ? new Date(article.publishedAt).toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" })
    : "";
  const featured = article.featuredImage || article.coverImage || "";

  const doc = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<title>${escape(title)}</title>
<style>
  @page { size: A4; margin: 20mm 18mm; }
  html, body { margin: 0; padding: 0; }
  body {
    font-family: "Georgia", "Iowan Old Style", "Times New Roman", serif;
    color: #1a1a1a;
    background: #fff;
    /* Match editor typography so the vertical flow (and therefore the
       relative position of floating images to the text) is preserved. */
    line-height: 2.0;
    font-size: 13pt;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
    color-adjust: exact;
  }
  /* Preserve original image colors in print — some browsers / printer drivers
     otherwise desaturate raster images unless we explicitly opt in. */
  img {
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
    color-adjust: exact;
    image-rendering: auto;
    filter: none !important;
  }
  .wrap {
    max-width: ${Math.max(680, CANVAS_WIDTH)}px;
    margin: 0 auto;
    padding: 24px 0;
  }
  header.meta {
    border-bottom: 1px solid #ddd;
    padding-bottom: 18px;
    margin-bottom: 24px;
  }
  header.meta .eyebrow {
    font-family: -apple-system, "SF Pro Display", "Helvetica Neue", Arial, sans-serif;
    font-size: 9pt;
    font-weight: 700;
    letter-spacing: 0.2em;
    text-transform: uppercase;
    color: #888;
    margin: 0 0 10px;
  }
  h1.title {
    font-family: -apple-system, "SF Pro Display", "Helvetica Neue", Arial, sans-serif;
    font-size: 28pt;
    font-weight: 800;
    line-height: 1.15;
    letter-spacing: -0.02em;
    color: #111;
    margin: 0 0 14px;
  }
  header.meta .byline {
    font-family: -apple-system, "SF Pro Text", "Helvetica Neue", Arial, sans-serif;
    font-size: 10pt;
    color: #666;
  }
  header.meta .byline strong { color: #222; font-weight: 600; }
  .featured {
    margin: 0 0 28px;
    text-align: center;
  }
  .featured img {
    max-width: 100%;
    max-height: 360px;
    height: auto;
    border-radius: 6px;
    object-fit: cover;
  }
  /* Editor uses Georgia 1.08rem (~17px), line-height 2.0, so these match.
     Paragraph margin is 0.9em to match .ProseMirror p in the editor. */
  .article-body h1 { font-size: 2rem; font-weight: 800; margin: 1.4em 0 0.4em; line-height: 1.2; color: #111; }
  .article-body h2 { font-size: 1.5rem; font-weight: 700; margin: 1.2em 0 0.35em; line-height: 1.25; color: #111; }
  .article-body h3 { font-size: 1.2rem; font-weight: 700; margin: 1.1em 0 0.3em; color: #222; }
  .article-body h4 { font-size: 1.05rem; font-weight: 700; margin: 1em 0 0.3em; color: #222; }
  .article-body p  { margin: 0 0 0.9em; orphans: 3; widows: 3; }
  .article-body > * + * { margin-top: 0.8em; }
  .article-body blockquote {
    border-left: 3px solid #111;
    margin: 1.3em 0;
    padding: 0.35em 0 0.35em 1.2em;
    color: #444;
    font-style: italic;
    page-break-inside: avoid;
  }
  .article-body ul, .article-body ol { margin: 0.8em 0 1.2em; padding-left: 1.8em; }
  .article-body li { margin-bottom: 0.4em; }
  .article-body img {
    max-width: 100%;
    height: auto;
    display: block;
    margin: 1.6em auto;
    border-radius: 4px;
    page-break-inside: avoid;
  }
  .article-body figure { page-break-inside: avoid; margin: 1.6em 0; text-align: center; }
  /* Canvas reconstruction: holds the natural text flow AND absolutely-
     positioned floating images at their original (x, y) from the editor. */
  .canvas {
    position: relative;
    width: ${CANVAS_WIDTH}px;
    max-width: 100%;
    margin: 0 auto;
  }
  .canvas img.floating {
    position: absolute;
    max-width: ${CANVAS_WIDTH}px;
    height: auto;
    border-radius: 4px;
    z-index: 1;
  }
  .article-body a { color: #1a5fc8; text-decoration: underline; }
  .article-body code {
    font-family: "SF Mono", "Menlo", "Consolas", monospace;
    font-size: 0.9em;
    background: #f3f3f3;
    padding: 1px 5px;
    border-radius: 3px;
  }
  .article-body pre {
    background: #f6f6f6;
    border: 1px solid #e3e3e3;
    border-radius: 6px;
    padding: 12px 14px;
    overflow: auto;
    page-break-inside: avoid;
  }
  .article-body pre code { background: transparent; padding: 0; }
  footer.src {
    margin-top: 36px;
    padding-top: 14px;
    border-top: 1px solid #ddd;
    font-family: -apple-system, "SF Pro Text", "Helvetica Neue", Arial, sans-serif;
    font-size: 9pt;
    color: #999;
    text-align: center;
  }
  footer.src a { color: inherit; text-decoration: none; }
  @media print {
    .no-print { display: none !important; }
    body { background: #fff !important; }
  }
  .no-print-banner {
    position: sticky; top: 0; z-index: 5;
    background: #111; color: #fff;
    padding: 10px 16px; text-align: center;
    font-family: -apple-system, "SF Pro Text", sans-serif; font-size: 13px;
  }
  .no-print-banner button {
    margin-left: 10px; padding: 5px 14px; font-size: 12px; font-weight: 600;
    background: #fff; color: #111; border: 0; border-radius: 6px; cursor: pointer;
  }
</style>
</head>
<body>
  <div class="no-print-banner no-print">
    Preparing your PDF… choose <b>"Save as PDF"</b> as destination and make sure <b>"Color"</b> is selected (not Black &amp; White).
    <button onclick="window.print()">Open print dialog</button>
  </div>
  <div class="wrap">
    <header class="meta">
      <p class="eyebrow">Plotzy${article.articleCategory ? " · " + escape(article.articleCategory) : ""}</p>
      <h1 class="title">${escape(title)}</h1>
      <p class="byline">
        ${author ? `By <strong>${escape(author)}</strong>` : ""}
        ${date ? `${author ? " · " : ""}${escape(date)}` : ""}
      </p>
    </header>
    ${featured && safeImgSrc(featured) ? `<div class="featured"><img src="${safeImgSrc(featured)}" alt="" /></div>` : ""}
    <div class="canvas"${canvasMinHeight > 0 ? ` style="min-height:${canvasMinHeight}px"` : ""}>
      <div class="article-body">${safeHtml}</div>
      ${floatingHtml}
    </div>
    <footer class="src">
      <a href="${escape(publicUrl)}">${escape(publicUrl)}</a>
    </footer>
  </div>
  <script>
    // Wait for images to load before triggering print so they render in the PDF.
    (function () {
      var imgs = Array.prototype.slice.call(document.images);
      var pending = imgs.filter(function (img) { return !img.complete; });
      if (pending.length === 0) return setTimeout(function () { window.print(); }, 200);
      var remaining = pending.length;
      pending.forEach(function (img) {
        img.addEventListener("load", done, { once: true });
        img.addEventListener("error", done, { once: true });
      });
      function done() { if (--remaining === 0) setTimeout(function () { window.print(); }, 200); }
    })();
  </script>
</body>
</html>`;

  const win = window.open("", "_blank");
  if (!win) {
    // Popup blocked — fallback: navigate the current tab. User can hit back.
    alert("Please allow popups for this site to download the PDF.");
    return;
  }
  win.document.open();
  win.document.write(doc);
  win.document.close();
}

function ShareItem({
  onClick, children, accent,
}: {
  onClick: () => void; children: React.ReactNode; accent?: string;
}) {
  const [hover, setHover] = useState(false);
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        display: "flex", alignItems: "center", gap: 10, width: "100%",
        padding: "8px 10px", borderRadius: 7, border: "none", cursor: "pointer",
        background: hover ? "rgba(255,255,255,0.05)" : "transparent",
        fontSize: 13, textAlign: "left", fontFamily: "inherit",
        transition: "background 0.15s",
        color: accent || "rgba(255,255,255,0.85)",
      }}
    >
      {children}
    </button>
  );
}
