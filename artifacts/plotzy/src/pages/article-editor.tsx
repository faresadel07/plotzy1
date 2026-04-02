import { useState, useRef, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import { useRoute, Link } from "wouter";
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
  Highlighter, Type, Indent, Outdent, Mic, Square,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/contexts/language-context";
import { AIAssistant } from "@/components/ai-assistant";

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

/* ── Resizable Image NodeView ────────────────────────────────────── */
function ImageNodeView({ node, updateAttributes, selected }: NodeViewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [hovered, setHovered] = useState(false);
  const width  = (node.attrs.width  as string) || "100%";
  const align  = (node.attrs.align  as string) || "center";
  const justifyMap: Record<string,string> = { left:"flex-start", center:"center", right:"flex-end" };

  return (
    <NodeViewWrapper as="div" style={{display:"flex", justifyContent:justifyMap[align]||"center", margin:"1.2em 0", userSelect:"none"}}>
      <div
        ref={containerRef}
        contentEditable={false}
        style={{position:"relative", width, display:"inline-block", maxWidth:"100%", outline:selected?`2px solid ${ACC}`:"none", outlineOffset:2, borderRadius:10}}
        onMouseEnter={()=>setHovered(true)}
        onMouseLeave={()=>setHovered(false)}
      >
        <img
          src={node.attrs.src as string}
          alt={(node.attrs.alt as string)||""}
          draggable={false}
          style={{width:"100%", display:"block", borderRadius:10, objectFit:"cover", maxHeight:560}}
        />

        {/* Floating toolbar */}
        {(selected||hovered) && (
          <div style={{position:"absolute",top:10,left:"50%",transform:"translateX(-50%)",display:"flex",alignItems:"center",gap:4,background:"rgba(0,0,0,0.82)",backdropFilter:"blur(12px)",border:"1px solid rgba(255,255,255,0.13)",borderRadius:9,padding:"4px 7px",zIndex:30,whiteSpace:"nowrap"}}>
            {(["left","center","right"] as const).map(a=>(
              <button key={a} onMouseDown={e=>{e.preventDefault();updateAttributes({align:a});}}
                style={{width:24,height:24,borderRadius:5,border:"none",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",background:align===a?"rgba(255,255,255,0.22)":"transparent",color:"#fff"}}>
                {a==="left"?<AlignLeft size={11}/>:a==="center"?<AlignCenter size={11}/>:<AlignRight size={11}/>}
              </button>
            ))}
            <div style={{width:1,height:14,background:"rgba(255,255,255,0.15)",margin:"0 2px"}}/>
            {([["S","28%"],["M","58%"],["L","100%"]] as [string,string][]).map(([lbl,w])=>(
              <button key={lbl} onMouseDown={e=>{e.preventDefault();updateAttributes({width:w});}}
                style={{width:26,height:24,borderRadius:5,border:"none",cursor:"pointer",background:width===w?"rgba(255,255,255,0.22)":"transparent",fontFamily:`-apple-system,BlinkMacSystemFont,'SF Pro Text',sans-serif`,fontSize:10,fontWeight:700,color:"#fff"}}>
                {lbl}
              </button>
            ))}
          </div>
        )}

        {/* Resize handle — right edge */}
        {(selected||hovered) && (
          <div
            style={{position:"absolute",top:"50%",right:-9,transform:"translateY(-50%)",width:18,height:44,borderRadius:9,cursor:"ew-resize",background:"rgba(255,255,255,0.18)",backdropFilter:"blur(4px)",border:"1px solid rgba(255,255,255,0.28)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:30}}
            onMouseDown={e=>{
              e.preventDefault(); e.stopPropagation();
              const container = containerRef.current;
              if (!container) return;
              const parentW = container.parentElement?.getBoundingClientRect().width || 1;
              const startX  = e.clientX;
              const startWPx = container.getBoundingClientRect().width;
              const onMove = (me:MouseEvent) => {
                const delta   = me.clientX - startX;
                const newWPct = Math.min(100, Math.max(15, Math.round(((startWPx+delta)/parentW)*100)));
                updateAttributes({ width:`${newWPct}%` });
              };
              const onUp = () => { window.removeEventListener("mousemove",onMove); window.removeEventListener("mouseup",onUp); };
              window.addEventListener("mousemove",onMove);
              window.addEventListener("mouseup",onUp);
            }}
          >
            <div style={{width:2,height:18,borderRadius:2,background:"rgba(255,255,255,0.7)"}}/>
          </div>
        )}

        {/* Width badge */}
        {(selected||hovered) && (
          <div style={{position:"absolute",bottom:8,right:10,fontFamily:`-apple-system,sans-serif`,fontSize:10,fontWeight:600,color:"rgba(255,255,255,0.75)",background:"rgba(0,0,0,0.55)",padding:"2px 7px",borderRadius:5,pointerEvents:"none"}}>
            {width}
          </div>
        )}
      </div>
    </NodeViewWrapper>
  );
}

const ResizableImage = TiptapImage.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      width: { default:"100%", parseHTML: el=>el.getAttribute("data-width")||el.style.width||"100%", renderHTML: a=>({ "data-width":a.width, style:`width:${a.width}` }) },
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
  const [imgWidth, setImgWidth]   = useState(100);
  const [imgAlign, setImgAlign]   = useState<"left"|"center"|"right">("center");
  const imgResizeRef              = useRef<{ startX: number; startW: number } | null>(null);
  const [saving, setSaving]       = useState(false);
  const [justSaved, setJustSaved] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [showAI, setShowAI]           = useState(false);
  const [focusMode, setFocusMode] = useState(false);
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
  });

  /* ── load article (only once) ── */
  useEffect(() => {
    if (!article || !editor || initialized.current) return;
    initialized.current = true;
    setTitle(article.title || "");
    setCategory(article.articleCategory || "");
    setTags((article.tags as string[]) || []);
    setFeaturedImage(article.featuredImage || null);
    const raw = article.articleContent || "";
    const isHtml = raw.trimStart().startsWith("<");
    const html = isHtml ? raw
      : raw ? `<p>${raw.replace(/\n\n+/g,"</p><p>").replace(/\n/g,"<br>")}</p>`
      : "<p></p>";
    editor.commands.setContent(html, false);
    setContent(html);
  }, [article, editor]);

  /* ── save ── */
  const saveNow = useCallback(async (silent = false) => {
    setSaving(true);
    try {
      await (updateArticle.mutateAsync as any)({
        id: idRef.current,
        title: titleRef.current,
        articleContent: contentRef.current,
        articleCategory: categoryRef.current,
        tags: tagsRef.current,
        featuredImage: imgRef.current ?? undefined,
      });
      setJustSaved(true);
      setTimeout(() => setJustSaved(false), 2000);
    } catch {
      if (!silent) toast({ variant:"destructive", title:"Save failed" });
    } finally { setSaving(false); }
  }, [updateArticle, toast]);

  /* ── auto-save (debounced, does not cause re-render loops) ── */
  const scheduleAutoSave = useCallback(() => {
    if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current);
    autoSaveTimer.current = setTimeout(() => saveNow(true), 3000);
  }, [saveNow]);

  useEffect(() => {
    if (!initialized.current) return;
    scheduleAutoSave();
  }, [title, content, category, tags, featuredImage]);

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

  /* ── Inline image ── */
  const insertImageFromFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = ev => {
      const src = ev.target?.result as string;
      if (src && editor) {
        editor.chain().focus().setImage({ src } as any).run();
      }
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
      if (url && editor) {
        editor.chain().focus().setImage({ src: url } as any).run();
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
          <div className="article-preview-body" dir={isRTL?"rtl":"ltr"} dangerouslySetInnerHTML={{__html: content||"<p><em>No content yet.</em></p>"}}/>
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

        {/* ── TOP BAR ── */}
        <div style={{
          position:"sticky",top:0,zIndex:50,
          background:"rgba(10,10,10,0.98)",backdropFilter:"blur(20px)",
          borderBottom:`1px solid ${B}`,
          padding:"0 18px",height:46,
          display:"flex",alignItems:"center",justifyContent:"space-between",
        }}>
          <div style={{display:"flex",alignItems:"center",gap:14}}>
            <Link href="/">
              <button style={{display:"flex",alignItems:"center",gap:6,background:"none",border:"none",cursor:"pointer",fontFamily:SF,fontSize:13,color:TS,padding:"4px 0"}}>
                <ArrowLeft size={14}/> Dashboard
              </button>
            </Link>
            <div style={{width:1,height:16,background:B}}/>
            <div style={{display:"flex",alignItems:"center",gap:5}}>
              <FileText size={11} color={TD}/>
              <span style={{fontSize:10,fontWeight:700,letterSpacing:"0.09em",textTransform:"uppercase",color:TD}}>Blog Post</span>
            </div>
          </div>

          <div style={{display:"flex",alignItems:"center",gap:5}}>
            {saving
              ? <><Loader2 size={11} color={TD} style={{animation:"spin 1s linear infinite"}}/><span style={{fontSize:11,color:TD}}>Saving…</span></>
              : justSaved
                ? <><CheckCircle2 size={11} color="#34d399"/><span style={{fontSize:11,color:"#34d399"}}>Saved</span></>
                : <span style={{fontSize:11,color:TD}}>{words.toLocaleString()} words · {readTime} min read</span>
            }
          </div>

          <div style={{display:"flex",alignItems:"center",gap:8}}>
            <button onClick={() => setFocusMode(f=>!f)} title="Focus mode"
              style={{display:"flex",alignItems:"center",justifyContent:"center",width:32,height:32,borderRadius:8,background:"none",border:`1px solid ${B}`,cursor:"pointer",color:TS}}>
              {focusMode ? <Minimize2 size={14}/> : <Maximize2 size={14}/>}
            </button>

            {/* Mic / Recording button */}
            {isTranscribing ? (
              <div style={{display:"flex",alignItems:"center",gap:5,padding:"0 10px",height:32,borderRadius:8,background:`${ACC}15`,border:`1px solid ${ACC}35`,fontFamily:SF,fontSize:12,color:ACC}}>
                <Loader2 size={12} style={{animation:"spin 1s linear infinite"}}/> Processing…
              </div>
            ) : isRecording ? (
              <button onClick={stopRecording}
                style={{display:"flex",alignItems:"center",gap:5,padding:"0 10px",height:32,borderRadius:8,background:"#ef444420",border:"1px solid #ef444455",cursor:"pointer",fontFamily:SF,fontSize:12,fontWeight:600,color:"#ef4444",animation:"pulse 1.5s ease-in-out infinite"}}>
                <Square size={11} style={{fill:"#ef4444"}}/> <span style={{fontFamily:"monospace"}}>{formatTime(recordingTime)}</span>
              </button>
            ) : (
              <button onClick={startRecording} title="Voice dictation"
                style={{display:"flex",alignItems:"center",justifyContent:"center",width:32,height:32,borderRadius:8,background:"none",border:`1px solid ${B}`,cursor:"pointer",color:TS}}>
                <Mic size={14}/>
              </button>
            )}

            <button onClick={() => setShowPreview(true)}
              style={{display:"flex",alignItems:"center",gap:6,padding:"6px 14px",borderRadius:8,background:"none",border:`1px solid ${B}`,cursor:"pointer",fontFamily:SF,fontSize:13,fontWeight:500,color:TS}}>
              <Eye size={13}/> Preview
            </button>
            <button onClick={() => saveNow(false)} disabled={saving}
              style={{display:"flex",alignItems:"center",gap:6,padding:"6px 16px",borderRadius:8,cursor:"pointer",background:justSaved?"#34d399":"#fff",border:"none",fontFamily:SF,fontSize:13,fontWeight:600,color:justSaved?"#fff":"#000",transition:"all 0.2s"}}>
              {saving ? <><Loader2 size={13} style={{animation:"spin 1s linear infinite"}}/> Saving…</>
                : justSaved ? <><CheckCircle2 size={13}/> Saved</>
                : <><Save size={13}/> Save</>}
            </button>
          </div>
        </div>

        {/* ── FORMATTING TOOLBAR ── */}
        <div
          style={{
            position:"sticky",top:46,zIndex:49,
            background:"rgba(18,18,22,0.99)",backdropFilter:"blur(20px)",
            borderBottom:`1px solid ${B2}`,
            padding:"0 10px",height:42,
            display:"flex",alignItems:"center",gap:1,
            overflowX:"auto",scrollbarWidth:"none",
          }}
          onMouseDown={e => e.preventDefault()}
        >
          {/* Undo Redo */}
          <Btn onClick={() => editor?.chain().focus().undo().run()} title="Undo (Ctrl+Z)"><Undo2 size={14}/></Btn>
          <Btn onClick={() => editor?.chain().focus().redo().run()} title="Redo (Ctrl+Y)"><Redo2 size={14}/></Btn>
          <Sep/>

          {/* Text Style dropdown */}
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
          <Sep/>

          {/* Font Family dropdown */}
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

          {/* Font Size */}
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

          {/* Bold Italic Underline Strike */}
          <Btn onClick={() => editor?.chain().focus().toggleBold().run()} active={editor?.isActive("bold")} title="Bold (Ctrl+B)"><Bold size={13}/></Btn>
          <Btn onClick={() => editor?.chain().focus().toggleItalic().run()} active={editor?.isActive("italic")} title="Italic (Ctrl+I)"><Italic size={13}/></Btn>
          <Btn onClick={() => editor?.chain().focus().toggleUnderline().run()} active={editor?.isActive("underline")} title="Underline (Ctrl+U)"><UIcon size={13}/></Btn>
          <Btn onClick={() => editor?.chain().focus().toggleStrike().run()} active={editor?.isActive("strike")} title="Strikethrough"><Strikethrough size={13}/></Btn>
          <Sep/>

          {/* Text Color */}
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

          {/* Highlight */}
          <Btn onClick={() => editor?.chain().focus().toggleHighlight({color:"rgba(124,106,247,0.25)"}).run()} active={editor?.isActive("highlight")} title="Highlight"><Highlighter size={13}/></Btn>
          <Sep/>

          {/* Alignment */}
          <Btn onClick={() => editor?.chain().focus().setTextAlign("left").run()} active={editor?.isActive({textAlign:"left"})} title="Align left"><AlignLeft size={13}/></Btn>
          <Btn onClick={() => editor?.chain().focus().setTextAlign("center").run()} active={editor?.isActive({textAlign:"center"})} title="Align center"><AlignCenter size={13}/></Btn>
          <Btn onClick={() => editor?.chain().focus().setTextAlign("right").run()} active={editor?.isActive({textAlign:"right"})} title="Align right"><AlignRight size={13}/></Btn>
          <Btn onClick={() => editor?.chain().focus().setTextAlign("justify").run()} active={editor?.isActive({textAlign:"justify"})} title="Justify"><AlignJustify size={13}/></Btn>
          <Sep/>

          {/* Lists + Indent */}
          <Btn onClick={() => editor?.chain().focus().toggleBulletList().run()} active={editor?.isActive("bulletList")} title="Bullet list"><List size={13}/></Btn>
          <Btn onClick={() => editor?.chain().focus().toggleOrderedList().run()} active={editor?.isActive("orderedList")} title="Numbered list"><ListOrdered size={13}/></Btn>
          <Btn onClick={() => editor?.chain().focus().sinkListItem("listItem").run()} title="Indent"><Indent size={13}/></Btn>
          <Btn onClick={() => editor?.chain().focus().liftListItem("listItem").run()} title="Outdent"><Outdent size={13}/></Btn>
          <Sep/>

          {/* Block elements */}
          <Btn onClick={() => editor?.chain().focus().toggleBlockquote().run()} active={editor?.isActive("blockquote")} title="Blockquote"><Quote size={13}/></Btn>
          <Btn onClick={() => editor?.chain().focus().toggleCodeBlock().run()} active={editor?.isActive("codeBlock")} title="Code block"><Code size={13}/></Btn>
          <Btn onClick={() => editor?.chain().focus().setHorizontalRule().run()} title="Divider"><Minus size={13}/></Btn>
          <Sep/>

          {/* Link */}
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

          {/* Image buttons */}
          <Sep/>
          <div style={{display:"flex",alignItems:"center",gap:4,flexShrink:0}}>
            <button
              onMouseDown={e=>{e.preventDefault();inlineImgInputRef.current?.click();}}
              title="Upload image"
              style={{display:"flex",alignItems:"center",gap:5,padding:"3px 10px",height:26,borderRadius:6,background:"rgba(255,255,255,0.07)",border:"1px solid rgba(255,255,255,0.1)",cursor:"pointer",fontFamily:SF,fontSize:11,fontWeight:500,color:TS,whiteSpace:"nowrap"}}
              onMouseEnter={e=>{e.currentTarget.style.background="rgba(255,255,255,0.12)";}}
              onMouseLeave={e=>{e.currentTarget.style.background="rgba(255,255,255,0.07)";}}
            >
              <ImageIcon size={12}/> Image
            </button>
            <button
              onMouseDown={e=>{e.preventDefault();setShowImgAI(true);}}
              title="Generate image with AI"
              style={{display:"flex",alignItems:"center",gap:5,padding:"3px 10px",height:26,borderRadius:6,background:`${ACC}18`,border:`1px solid ${ACC}35`,cursor:"pointer",fontFamily:SF,fontSize:11,fontWeight:600,color:ACC,whiteSpace:"nowrap"}}
              onMouseEnter={e=>{e.currentTarget.style.background=`${ACC}28`;}}
              onMouseLeave={e=>{e.currentTarget.style.background=`${ACC}18`;}}
            >
              <Sparkles size={12}/> AI Image
            </button>
            <input ref={inlineImgInputRef} type="file" accept="image/*" style={{display:"none"}} onChange={e=>{const f=e.target.files?.[0];if(f)insertImageFromFile(f);e.target.value="";}}/>
          </div>

          {/* AI Writing Assistant button */}
          <div style={{marginLeft:"auto",flexShrink:0}}>
            <button
              onMouseDown={e=>{e.preventDefault();setShowAI(true);}}
              style={{
                display:"flex",alignItems:"center",gap:6,
                padding:"4px 13px",borderRadius:7,
                background:showAI?`${ACC}2a`:`${ACC}1a`,border:`1px solid ${ACC}45`,
                cursor:"pointer",fontFamily:SF,fontSize:11,fontWeight:600,color:ACC,whiteSpace:"nowrap",
              }}
            >
              <Sparkles size={11}/> AI Writing Assistant
            </button>
          </div>
        </div>

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

        {/* ── CONTENT AREA ── */}
        <div style={{
          maxWidth: focusMode ? 760 : 1180,
          margin:"0 auto", padding:"28px 20px 80px",
          display:"grid",
          gridTemplateColumns: focusMode ? "1fr" : "1fr 282px",
          gap:24, alignItems:"start",
          transition:"all 0.3s ease",
        }}>

          {/* ── WRITING COLUMN ── */}
          <div>
            {/* Featured Image */}
            {!featuredImage ? (
              /* ── No image: compact button ── */
              <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:18}}>
                <button
                  onClick={() => fileInputRef.current?.click()}
                  onDragOver={e=>{e.preventDefault();setDragOver(true);}}
                  onDragLeave={()=>setDragOver(false)}
                  onDrop={e=>{e.preventDefault();setDragOver(false);const f=e.dataTransfer.files?.[0];if(f?.type.startsWith("image/"))handleImageFile(f);}}
                  style={{
                    display:"flex",alignItems:"center",gap:6,
                    padding:"6px 14px",borderRadius:8,cursor:"pointer",
                    background: dragOver ? `${ACC}18` : C2,
                    border: dragOver ? `1px dashed ${ACC}` : `1px dashed ${B}`,
                    fontFamily:SF,fontSize:12,fontWeight:500,color:TD,
                    transition:"all 0.15s",
                  }}
                  onMouseEnter={e=>{e.currentTarget.style.borderColor=`${ACC}60`;e.currentTarget.style.color=TS;}}
                  onMouseLeave={e=>{e.currentTarget.style.borderColor=`${B}`;e.currentTarget.style.color=TD;}}
                >
                  <ImageIcon size={13}/> Add image
                </button>
                <input ref={fileInputRef} type="file" accept="image/*" style={{display:"none"}} onChange={e=>{const f=e.target.files?.[0];if(f)handleImageFile(f);}}/>
              </div>
            ) : (
              /* ── Has image: resizable + draggable block ── */
              <div
                style={{
                  marginBottom:22,
                  display:"flex",
                  justifyContent: imgAlign==="left" ? "flex-start" : imgAlign==="right" ? "flex-end" : "center",
                }}
                onDragOver={e=>e.preventDefault()}
              >
                <div
                  style={{
                    position:"relative",
                    width:`${imgWidth}%`,
                    minWidth:120,
                    maxWidth:"100%",
                    borderRadius:12,
                    overflow:"visible",
                    flexShrink:0,
                    userSelect:"none",
                  }}
                >
                  {/* Image */}
                  <img
                    src={featuredImage}
                    alt="Featured"
                    draggable={false}
                    style={{width:"100%",display:"block",borderRadius:12,objectFit:"cover",maxHeight:420}}
                  />

                  {/* Floating toolbar */}
                  <div style={{
                    position:"absolute",top:10,left:"50%",transform:"translateX(-50%)",
                    display:"flex",alignItems:"center",gap:4,
                    background:"rgba(0,0,0,0.75)",backdropFilter:"blur(10px)",
                    border:"1px solid rgba(255,255,255,0.12)",borderRadius:8,padding:"4px 6px",
                    zIndex:10,
                  }}>
                    {/* Alignment */}
                    {(["left","center","right"] as const).map(a => (
                      <button key={a} onClick={()=>setImgAlign(a)}
                        title={`Align ${a}`}
                        style={{
                          width:24,height:24,borderRadius:5,border:"none",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",
                          background: imgAlign===a ? "rgba(255,255,255,0.2)" : "transparent",color:"#fff",
                        }}>
                        {a==="left"?<AlignLeft size={11}/>:a==="center"?<AlignCenter size={11}/>:<AlignRight size={11}/>}
                      </button>
                    ))}
                    <div style={{width:1,height:16,background:"rgba(255,255,255,0.15)",margin:"0 2px"}}/>
                    {/* Size presets */}
                    {([["S",40],["M",65],["L",100]] as [string,number][]).map(([label,w])=>(
                      <button key={label} onClick={()=>setImgWidth(w)}
                        style={{
                          width:24,height:24,borderRadius:5,border:"none",cursor:"pointer",
                          background: imgWidth===w ? "rgba(255,255,255,0.2)" : "transparent",
                          fontFamily:SF,fontSize:10,fontWeight:700,color:"#fff",
                        }}>{label}</button>
                    ))}
                    <div style={{width:1,height:16,background:"rgba(255,255,255,0.15)",margin:"0 2px"}}/>
                    {/* Change */}
                    <button onClick={()=>fileInputRef.current?.click()}
                      title="Change image"
                      style={{width:24,height:24,borderRadius:5,border:"none",cursor:"pointer",background:"transparent",color:"#fff",display:"flex",alignItems:"center",justifyContent:"center"}}>
                      <Upload size={11}/>
                    </button>
                    {/* Remove */}
                    <button onClick={()=>{setFeaturedImage(null);setImgWidth(100);}}
                      title="Remove image"
                      style={{width:24,height:24,borderRadius:5,border:"none",cursor:"pointer",background:"transparent",color:"#f87171",display:"flex",alignItems:"center",justifyContent:"center"}}>
                      <X size={11}/>
                    </button>
                  </div>

                  {/* Right resize handle */}
                  <div
                    style={{
                      position:"absolute",top:"50%",right:-8,transform:"translateY(-50%)",
                      width:16,height:40,borderRadius:8,cursor:"ew-resize",
                      background:"rgba(255,255,255,0.18)",backdropFilter:"blur(4px)",
                      border:"1px solid rgba(255,255,255,0.25)",
                      display:"flex",alignItems:"center",justifyContent:"center",
                      userSelect:"none",
                    }}
                    onMouseDown={e=>{
                      e.preventDefault();
                      const container = e.currentTarget.parentElement?.parentElement;
                      if (!container) return;
                      const containerW = container.getBoundingClientRect().width;
                      imgResizeRef.current = { startX: e.clientX, startW: imgWidth };
                      const onMove = (me: MouseEvent) => {
                        if (!imgResizeRef.current) return;
                        const delta = me.clientX - imgResizeRef.current.startX;
                        const newW = Math.min(100, Math.max(20, imgResizeRef.current.startW + (delta / containerW) * 100));
                        setImgWidth(Math.round(newW));
                      };
                      const onUp = () => {
                        imgResizeRef.current = null;
                        window.removeEventListener("mousemove", onMove);
                        window.removeEventListener("mouseup", onUp);
                      };
                      window.addEventListener("mousemove", onMove);
                      window.addEventListener("mouseup", onUp);
                    }}
                  >
                    <div style={{width:2,height:16,borderRadius:2,background:"rgba(255,255,255,0.6)"}}/>
                  </div>

                  {/* Width label */}
                  <div style={{
                    position:"absolute",bottom:10,right:14,
                    fontFamily:SF,fontSize:10,fontWeight:600,color:"rgba(255,255,255,0.7)",
                    background:"rgba(0,0,0,0.5)",padding:"2px 7px",borderRadius:5,pointerEvents:"none",
                  }}>{imgWidth}%</div>
                </div>
                <input ref={fileInputRef} type="file" accept="image/*" style={{display:"none"}} onChange={e=>{const f=e.target.files?.[0];if(f)handleImageFile(f);}}/>
              </div>
            )}

            {/* Category badge inline */}
            {category && selCat && (
              <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:12}}>
                <span style={{fontFamily:SF,fontSize:10,fontWeight:700,letterSpacing:"0.06em",textTransform:"uppercase",padding:"4px 12px",borderRadius:20,background:selCat.color+"22",color:selCat.color}}>{category}</span>
                <button onClick={()=>setCategory("")} style={{background:"none",border:"none",cursor:"pointer",color:TD,display:"flex"}}><X size={11}/></button>
              </div>
            )}

            {/* Title */}
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
                fontWeight:800,fontSize:"clamp(1.7rem,4vw,2.5rem)",
                color:T,lineHeight:1.18,marginBottom:5,
              }}
            />
            <p style={{fontFamily:SF,fontSize:11,color:TD,marginBottom:20}}>
              {title.length > 0 ? `${title.length} chars · Aim for 60–80 for best SEO` : "Add a compelling title to hook your readers"}
            </p>

            {/* tiptap editor */}
            <EditorContent editor={editor} className="article-editor-content" dir={isRTL?"rtl":"ltr"}/>

            {/* Tags inline */}
            {tags.length > 0 && (
              <div style={{display:"flex",flexWrap:"wrap",gap:6,paddingTop:18,borderTop:`1px solid ${B}`,marginTop:16}}>
                {tags.map(tag => (
                  <span key={tag} style={{display:"inline-flex",alignItems:"center",gap:4,fontFamily:SF,fontSize:10,fontWeight:500,color:TD,padding:"4px 10px",borderRadius:20,background:C2,border:`1px solid ${B}`}}>
                    #{tag}
                    <button onClick={()=>setTags(p=>p.filter(x=>x!==tag))} style={{background:"none",border:"none",cursor:"pointer",color:TD,display:"flex",padding:0,marginLeft:2}}><X size={9}/></button>
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* ── SIDEBAR ── */}
          {!focusMode && (
            <aside style={{display:"flex",flexDirection:"column",gap:11,position:"sticky",top:94,maxHeight:"calc(100vh - 110px)",overflowY:"auto",scrollbarWidth:"none"}}>

              {/* AI Writing Assistant button */}
              <button
                onClick={() => setShowAI(true)}
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

              {/* Stats */}
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

                {/* Word goal */}
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

              {/* Category */}
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

              {/* Tags */}
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

              {/* Writing tips */}
              <div style={{background:`${ACC}0d`,borderRadius:14,border:`1px solid ${ACC}22`,padding:16}}>
                <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:9}}>
                  <Sparkles size={11} color={ACC}/>
                  <span style={{fontFamily:SF,fontSize:9,fontWeight:700,letterSpacing:"0.09em",textTransform:"uppercase",color:ACC+"bb"}}>Writing Tips</span>
                </div>
                <ul style={{listStyle:"none",margin:0,padding:0,display:"flex",flexDirection:"column",gap:6}}>
                  {[
                    "Hook your reader in the first sentence",
                    "Keep paragraphs short, 2–3 sentences",
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
            </aside>
          )}
        </div>

        {/* ── AI IMAGE GENERATION MODAL ── */}
        {showImgAI && createPortal(
          <div style={{position:"fixed",inset:0,zIndex:99999,display:"flex",alignItems:"center",justifyContent:"center",background:"rgba(0,0,0,0.78)",backdropFilter:"blur(8px)"}} onClick={()=>setShowImgAI(false)}>
            <div style={{background:"#111117",border:`1px solid rgba(124,106,247,0.3)`,borderRadius:18,padding:28,width:"min(480px,90vw)",boxShadow:"0 20px 60px rgba(0,0,0,0.8)"}} onClick={e=>e.stopPropagation()}>
              <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:20}}>
                <div style={{width:36,height:36,borderRadius:10,background:`${ACC}20`,border:`1px solid ${ACC}40`,display:"flex",alignItems:"center",justifyContent:"center"}}>
                  <Sparkles size={16} color={ACC}/>
                </div>
                <div>
                  <div style={{fontFamily:SF,fontSize:15,fontWeight:700,color:T}}>Generate Image with AI</div>
                  <div style={{fontFamily:SF,fontSize:11,color:TD}}>Describe what you want to see</div>
                </div>
                <button onClick={()=>setShowImgAI(false)} style={{marginLeft:"auto",background:"none",border:"none",cursor:"pointer",color:TD,display:"flex"}}><X size={16}/></button>
              </div>

              <textarea
                value={imgPrompt}
                onChange={e=>setImgPrompt(e.target.value)}
                placeholder="e.g. A cozy coffee shop at night, warm lighting, rain on windows, photorealistic..."
                rows={4}
                autoFocus
                onKeyDown={e=>{if(e.key==="Enter"&&(e.metaKey||e.ctrlKey))generateInlineImage();}}
                style={{width:"100%",resize:"none",background:"rgba(255,255,255,0.05)",border:`1px solid rgba(255,255,255,0.1)`,borderRadius:10,padding:14,fontFamily:SF,fontSize:13,color:T,outline:"none",lineHeight:1.6,boxSizing:"border-box"}}
              />

              {/* Quick prompts */}
              <div style={{display:"flex",flexWrap:"wrap",gap:6,margin:"12px 0"}}>
                {["Abstract art","Dark forest","City at night","Ocean waves","Mountain peak","Vintage library"].map(p=>(
                  <button key={p} onClick={()=>setImgPrompt(p)}
                    style={{fontFamily:SF,fontSize:11,padding:"4px 11px",borderRadius:20,background:`${ACC}12`,border:`1px solid ${ACC}30`,cursor:"pointer",color:ACC+"cc",transition:"all 0.15s"}}
                    onMouseEnter={e=>{e.currentTarget.style.background=`${ACC}22`;}}
                    onMouseLeave={e=>{e.currentTarget.style.background=`${ACC}12`;}}
                  >{p}</button>
                ))}
              </div>

              <div style={{display:"flex",gap:10,marginTop:4}}>
                <button onClick={()=>setShowImgAI(false)} style={{flex:1,padding:"10px 0",borderRadius:10,background:"transparent",border:`1px solid rgba(255,255,255,0.1)`,cursor:"pointer",fontFamily:SF,fontSize:13,fontWeight:500,color:TS}}>Cancel</button>
                <button onClick={generateInlineImage} disabled={!imgPrompt.trim()||imgGenLoading}
                  style={{flex:2,padding:"10px 0",borderRadius:10,background:(!imgPrompt.trim()||imgGenLoading)?`${ACC}40`:ACC,border:"none",cursor:(!imgPrompt.trim()||imgGenLoading)?"default":"pointer",fontFamily:SF,fontSize:13,fontWeight:700,color:"#fff",display:"flex",alignItems:"center",justifyContent:"center",gap:7,transition:"background 0.2s"}}>
                  {imgGenLoading?<><Loader2 size={14} style={{animation:"spin 1s linear infinite"}}/> Generating…</>:<><Sparkles size={14}/> Generate Image</>}
                </button>
              </div>
            </div>
          </div>
        , document.body)}

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
            font-size:1.06rem; line-height:2; color:rgba(255,255,255,0.65);
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
