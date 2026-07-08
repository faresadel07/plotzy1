import { useState, useCallback, useEffect, useRef, lazy, Suspense } from "react";
import { Link, useLocation } from "wouter";
import { Layout } from "@/components/layout";
import { SEO } from "@/components/SEO";
import { AuthModal } from "@/components/auth-modal";
import { FeatureVideo } from "@/components/FeatureVideo";
import { WritingAnimation } from "@/components/WritingAnimation";
import { AIAssistantAnimation } from "@/components/AIAssistantAnimation";
import { MarketplaceMockup } from "@/components/MarketplaceMockup";
import { AudiobookMockup } from "@/components/AudiobookMockup";
import { AnimatedFolder } from "@/components/ui/3d-folder";
import { CardStack } from "@/components/ui/card-stack";
import { BookCarousel, ArabicBookCarousel, AudioBookCarousel } from "@/components/BookCarousel";
import { LibraryBookshelf, type ShelfBookData } from "@/components/LibraryBookshelf";
// Lazy: BookViewerOverlay pulls in three.js + react-three (~880 kB
// of vendor code). The landing page mounts it eagerly only when the
// user actually clicks a book on the shelf, so we defer the import
// until that moment to keep the initial paint lean.
const BookViewerOverlay = lazy(() =>
  import("@/components/BookViewerOverlay").then((m) => ({ default: m.BookViewerOverlay })),
);
import { useBooks, useCreateBook, useGenerateCover, useTrashBook, useDuplicateBook, useUpdateBook } from "@/hooks/use-books";
import { SeriesSection } from "@/components/SeriesSection";
import { BookCreationWizard, type WizardAnswers } from "@/components/BookCreationWizard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { ContentTypeSelector } from "@/components/ContentTypeSelector";
import { BookOpen, Loader2, Sparkles, Library, Zap, ChevronDown, ChevronRight, CheckCircle, PenLine, Grid, Activity, Shield, Globe, FileText, Plus, Trash2, Users, UserPlus, Search, ArrowRight } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { ContainerScroll } from "@/components/ui/container-scroll-animation";
import { HeroMockup } from "@/components/HeroMockup";
import { format } from "date-fns";
import { motion, useMotionValue, useTransform, useSpring, AnimatePresence, useInView } from "framer-motion";
import { useLanguage } from "@/contexts/language-context";
import { useAuth } from "@/contexts/auth-context";
import { useIsPhone } from "@/hooks/use-is-phone";
import { MobileHome } from "@/components/mobile/MobileHome";
import { BOOK_LANGUAGES } from "@/lib/i18n";
import { useToast } from "@/hooks/use-toast";
import { LandingCanvas } from "@/components/landing/LandingCanvas";
import { DevicesShowcase } from "@/components/landing/DevicesShowcase";
import { ComicsShowcase } from "@/components/landing/ComicsShowcase";
import { TestimonialsDesktop } from "@/components/testimonials/TestimonialsDesktop";
import { TextShimmer } from "@/components/ui/text-shimmer";
import { GlowingEffect } from "@/components/ui/glowing-effect";
import { BookCoverShader } from "@/components/ui/book-cover-shader";
import { PerspectiveBook } from "@/components/ui/perspective-book";
import { ConfirmModal } from "@/components/confirm-modal";


const BOOKS_PER_SHELF = 4;

function StatCounter({ to, suffix = "", label }: { to: number; suffix?: string; label: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-80px" });
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (!inView) return;
    let start = 0;
    const duration = 1800;
    const step = 16;
    const increment = to / (duration / step);
    const timer = setInterval(() => {
      start += increment;
      if (start >= to) { setCount(to); clearInterval(timer); }
      else setCount(Math.floor(start));
    }, step);
    return () => clearInterval(timer);
  }, [inView, to]);

  return (
    <div ref={ref} style={{ textAlign: "center" }}>
      <div style={{
        fontFamily: "-apple-system,'SF Pro Display',sans-serif",
        fontSize: "clamp(2.2rem,4vw,3rem)", fontWeight: 800,
        letterSpacing: "-0.04em", color: "#f7f2e4", lineHeight: 1,
      }}>
        {count.toLocaleString()}{suffix}
      </div>
      <div style={{
        fontFamily: "-apple-system,'SF Pro Display',sans-serif",
        fontSize: "0.78rem", fontWeight: 500,
        color: "rgba(244,239,226,0.5)", marginTop: 8, letterSpacing: "0.01em",
      }}>
        {label}
      </div>
    </div>
  );
}

const COVER_PALETTES = [
  { bg: 'linear-gradient(150deg,#0f0c29,#302b63,#24243e)', accent: '#a78bfa' },
  { bg: 'linear-gradient(150deg,#1a0800,#6b2d00,#c2410c)', accent: '#fb923c' },
  { bg: 'linear-gradient(150deg,#001c2e,#003d5b,#0369a1)', accent: '#38bdf8' },
  { bg: 'linear-gradient(150deg,#12001a,#2a003a,#7e22ce)', accent: '#e879f9' },
  { bg: 'linear-gradient(150deg,#052010,#0f4a20,#15803d)', accent: '#4ade80' },
  { bg: 'linear-gradient(150deg,#1a0505,#5c1010,#991b1b)', accent: '#f87171' },
  { bg: 'linear-gradient(150deg,#0a0a1a,#1e1b4b,#3730a3)', accent: '#818cf8' },
];

/* ── Book pages ────────────────────────────────────────────── */
const BOOK_FONT  = "'Merriweather', 'Lora', Georgia, serif";
const PAGE_BG    = "#F2ECD8";
const PAGE_TEXT  = "#1a1209";
const PAGE_FAINT = "#7a6a55";

const LEFT_PARAGRAPHS = [
  "Every great book begins not with a plot or a character, but with a single decision: to sit down and write. Plotzy was built around that moment: the fragile instant before the first word appears on the page.",
  "The editor is a full-screen canvas that silences every distraction. No notifications, no banners, no menus competing for attention. When you open a chapter in Plotzy, the only thing that exists is the story.",
  "Beneath that simplicity lies a complete manuscript management system. Chapters can be reordered with a single drag. Word counts update with every keystroke. Status labels (drafted, revised, final) give writers a clear picture of where their book stands at any moment.",
  "The AI Smart Editor reads as you write. It suggests stronger verbs, flags passive constructions, and offers alternative phrasings, not to replace your voice, but to sharpen it. Think of it as an invisible co-author, always present, never intrusive.",
  "Cover Art Studio translates your story's mood into a professional jacket within seconds. Describe the tone, the era, the feeling you want to evoke, and Plotzy generates gallery-quality artwork ready for the shelf.",
];

const RIGHT_PARAGRAPHS = [
  "World Publish turns the complex world of distribution into a single button. Your manuscript reaches every major platform, digital and print, while Plotzy handles formatting, rights management, and royalty tracking.",
  "The analytics dashboard goes far beyond download counts. You can see exactly where readers slow down, where they accelerate, and where they quietly close the book. Armed with that data, revision becomes a precise science rather than a guessing game.",
  "Multi-language support means Plotzy adapts to you, not the other way around. Whether you write in Arabic, English, French, or Spanish, the editor adjusts its direction, spacing, and typography to honour your language's natural rhythm.",
  "Version History saves every keystroke. Nothing is ever truly deleted. You can roll back to any point in your manuscript's life, from yesterday's draft to the very first sentence you typed in Plotzy.",
  "Collaboration Mode lets you invite editors and co-authors into your workspace. They can annotate, suggest, and comment without disturbing your flow, keeping every voice in the conversation without confusion.",
];

const LEFT_PARAGRAPHS_AR = [
  "كل كتاب عظيم لا يبدأ بحبكة ولا بشخصية، بل بقرار واحد: أن تجلس وتكتب. وُلد Plotzy حول تلك اللحظة بالذات، اللحظة الهشّة التي تسبق ظهور أول كلمة على الصفحة.",
  "المحرّر مساحة تملأ الشاشة بأكملها وتُسكِت كل ما يشتّت. لا إشعارات، ولا لافتات، ولا قوائم تتنازع انتباهك. حين تفتح فصلًا في Plotzy لا يبقى شيء سوى الحكاية.",
  "وتحت هذه البساطة يكمن نظام متكامل لإدارة المخطوطة. تُعاد الفصول ترتيبًا بسحبة واحدة. ويتحدّث عدد الكلمات مع كل ضغطة مفتاح. وتمنح حالات النص (مسودّة، مُراجَع، نهائي) الكاتب صورة واضحة عن موضع كتابه في أي لحظة.",
  "ويقرأ المحرّر الذكي بالذكاء الاصطناعي ما تكتبه أولًا بأول. يقترح أفعالًا أقوى، وينبّه إلى الصياغات المبنية للمجهول، ويعرض صياغات بديلة، لا ليحلّ محلّ صوتك بل ليصقله. اعتبره مؤلفًا خفيًّا، حاضرًا دائمًا، دون أن يكون متطفّلًا.",
  "ويحوّل استوديو فنّ الغلاف مزاج قصتك إلى غلاف احترافي في ثوانٍ. صِف النبرة والحقبة والإحساس الذي تريد إيقاظه، فيولّد Plotzy عملًا فنيًّا بجودة المعارض جاهزًا للرفّ.",
  "ولا يضيع شيء من جهدك مهما طال الطريق. يحفظ Plotzy عملك أولًا بأول، ويزامنه بهدوء عبر كل أجهزتك، فتفتح الفصل نفسه على حاسوبك صباحًا وتكمله على جهازك اللوحي مساءً دون أن تفقد فاصلة واحدة.",
  "وبين السطور تعمل أدوات هادئة لا تُرى: تدقيق لغوي يلتقط ما يفوتك، وبحث فوري في المخطوطة كلها، وملاحظات جانبية تبقى معك ولا يراها القارئ. كل ذلك ليبقى تركيزك على ما يهمّ وحده: الكلمة التالية.",
];

const RIGHT_PARAGRAPHS_AR = [
  "ويحوّل النشر العالمي عالم التوزيع المعقّد إلى زرّ واحد. تصل مخطوطتك إلى كل منصّة كبرى، رقميًّا وورقيًّا، بينما يتولّى Plotzy التنسيق وإدارة الحقوق وتتبّع العوائد.",
  "وتذهب لوحة التحليلات إلى أبعد من عدد التنزيلات بكثير. ترى بالضبط أين يتباطأ القرّاء، وأين يتسارعون، وأين يغلقون الكتاب بهدوء. وبهذه البيانات تصير المراجعة علمًا دقيقًا لا تخمينًا.",
  "ودعم تعدّد اللغات يعني أن Plotzy يتكيّف معك لا العكس. سواء كتبت بالعربية أو الإنجليزية أو الفرنسية أو الإسبانية، يضبط المحرّر اتجاهه وتباعده وطباعته ليحترم الإيقاع الطبيعي للغتك.",
  "ويحفظ سجلّ الإصدارات كل ضغطة مفتاح. لا شيء يُحذف فعليًّا أبدًا. يمكنك العودة إلى أي نقطة في عمر مخطوطتك، من مسودّة الأمس إلى أول جملة كتبتها في Plotzy.",
  "ويتيح وضع التعاون دعوة المحرّرين والمؤلفين المشاركين إلى مساحتك. يمكنهم التعليق والاقتراح والتدوين دون أن يعكّروا انسيابك، فتبقى كل الأصوات في الحوار دون ارتباك.",
];

function BookPages() {
  const { lang } = useLanguage();
  const ar = lang === "ar";
  const leftParas  = ar ? LEFT_PARAGRAPHS_AR  : LEFT_PARAGRAPHS;
  const rightParas = ar ? RIGHT_PARAGRAPHS_AR : RIGHT_PARAGRAPHS;

  const [paraIdx, setParaIdx] = useState(0);
  const [typed, setTyped]     = useState("");
  const [charIdx, setCharIdx] = useState(0);
  const SPEED = 14;
  const TYPED_OFFSET = 2;
  const TYPED_COUNT  = rightParas.length - TYPED_OFFSET;

  // Restart the typing animation when the language flips so we never slice
  // into a paragraph that belongs to the other language's array.
  useEffect(() => { setParaIdx(0); setTyped(""); setCharIdx(0); }, [ar]);
  useEffect(() => { setTyped(""); setCharIdx(0); }, [paraIdx]);
  useEffect(() => {
    const para = rightParas[TYPED_OFFSET + paraIdx];
    if (charIdx >= para.length) {
      const t = setTimeout(() => setParaIdx(i => (i + 1) % TYPED_COUNT), 2600);
      return () => clearTimeout(t);
    }
    const t = setTimeout(() => { setTyped(para.slice(0, charIdx + 1)); setCharIdx(c => c + 1); }, SPEED);
    return () => clearTimeout(t);
  }, [charIdx, paraIdx, rightParas]);

  const page: React.CSSProperties = {
    flex: 1, height: "100%",
    direction: ar ? "rtl" : "ltr",
    background: `linear-gradient(180deg, ${PAGE_BG} 0%, #EDE5CC 100%)`,
    position: "relative", overflow: "hidden",
    display: "flex", flexDirection: "column",
    padding: "clamp(10px, 2vw, 20px) clamp(16px, 5vw, 56px) clamp(20px, 4vw, 42px)",
    boxSizing: "border-box",
  };

  /* small-caps running header */
  const runHeader: React.CSSProperties = {
    fontFamily: BOOK_FONT,
    fontSize: "0.5rem",
    fontStyle: "normal",
    color: PAGE_FAINT,
    textAlign: "center",
    letterSpacing: "0.18em",
    textTransform: "uppercase",
    marginBottom: 10,
  };

  /* thin rule under running header */
  const headerRule: React.CSSProperties = {
    border: "none",
    borderTop: `0.5px solid ${PAGE_FAINT}44`,
    margin: "0 0 14px",
  };

  /* Roman chapter numeral */
  const chapterNum: React.CSSProperties = {
    fontFamily: BOOK_FONT,
    fontSize: "0.82rem",
    fontWeight: "normal",
    fontStyle: "italic",
    color: PAGE_FAINT,
    textAlign: "center",
    letterSpacing: "0.08em",
    marginBottom: 4,
  };

  const chapterHeading: React.CSSProperties = {
    fontFamily: BOOK_FONT,
    fontSize: "clamp(0.8rem, 2.4vw, 1.32rem)",
    fontWeight: "bold",
    fontStyle: "normal",
    color: PAGE_TEXT,
    textAlign: "center",
    marginBottom: 5,
    lineHeight: 1.25,
    letterSpacing: "0.03em",
  };

  /* ornamental divider */
  const ornamentRow: React.CSSProperties = {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    marginBottom: 8,
  };
  const ornamentLine: React.CSSProperties = {
    flex: 1, height: 0.5,
    background: `linear-gradient(90deg, transparent, ${PAGE_FAINT}66, transparent)`,
  };
  const ornamentDiamond: React.CSSProperties = {
    width: 5, height: 5,
    background: PAGE_FAINT,
    transform: "rotate(45deg)",
    opacity: 0.55,
    flexShrink: 0,
  };

  const chapterSubtitle: React.CSSProperties = {
    fontFamily: BOOK_FONT,
    fontSize: "0.66rem",
    fontStyle: "italic",
    color: PAGE_FAINT,
    textAlign: "center",
    marginBottom: 18,
    letterSpacing: "0.05em",
  };

  const para: React.CSSProperties = {
    fontFamily: BOOK_FONT,
    fontSize: "clamp(0.72rem, 1.6vw, 0.82rem)",
    lineHeight: 1.85,
    fontStyle: "normal",
    fontWeight: "normal",
    color: PAGE_TEXT,
    textAlign: "justify",
    textIndent: "2.2em",
    margin: "0 0 2px",
  };

  /* drop-cap first letter */
  const dropCapStyle: React.CSSProperties = {
    float: "left",
    fontFamily: BOOK_FONT,
    fontSize: "3.4em",
    lineHeight: "0.76",
    fontWeight: "bold",
    color: PAGE_TEXT,
    paddingRight: "0.06em",
    paddingTop: "0.1em",
    marginBottom: "-0.05em",
  };

  /* page number with center-dot decoration */
  const pageNumRow: React.CSSProperties = {
    position: "absolute", bottom: 9, left: 0, right: 0,
    display: "flex", alignItems: "center", justifyContent: "center", gap: 5,
  };
  const pageNumDash: React.CSSProperties = {
    fontFamily: BOOK_FONT, fontSize: "0.54rem",
    color: PAGE_FAINT, letterSpacing: "0.05em",
  };
  const pageNumText: React.CSSProperties = {
    fontFamily: BOOK_FONT, fontSize: "0.62rem",
    color: PAGE_TEXT, fontWeight: 500, letterSpacing: "0.04em",
  };

  const leftPageShadow  = "inset -60px 0 70px rgba(0,0,0,0.14), inset -2px 0 6px rgba(0,0,0,0.18)";
  const rightPageShadow = "inset 60px 0 70px rgba(0,0,0,0.14), inset 2px 0 6px rgba(0,0,0,0.18)";

  return (
    <div style={{ width: "100%", height: "100%", display: "flex", position: "relative" }}>

      {/* ── LEFT PAGE ── */}
      <div style={{ ...page, boxShadow: leftPageShadow }}>
        <p style={runHeader}>{ar ? "Plotzy · منصة الكُتّاب" : "Plotzy · The Writer's Platform"}</p>

        <p style={chapterNum}>{ar ? "الفصل الأول" : "Chapter 1"}</p>
        <h2 style={chapterHeading}>{ar ? "مدخل إلى Plotzy" : "An Introduction to Plotzy"}</h2>

        <div style={{ flex: 1, overflow: "hidden", marginTop: 18 }}>
          {leftParas.map((p, i) => {
            if (i === 0 && !ar) {
              const [first, ...rest] = p.split("");
              return (
                <p key={i} style={{ ...para, textIndent: 0 }}>
                  <span style={dropCapStyle}>{first}</span>
                  {rest.join("")}
                </p>
              );
            }
            return <p key={i} style={para}>{p}</p>;
          })}
        </div>

        {/* Page number */}
        <div style={pageNumRow}>
          <span style={pageNumDash}>·</span>
          <span style={pageNumText}>5</span>
          <span style={pageNumDash}>·</span>
        </div>
      </div>


      {/* ── RIGHT PAGE ── */}
      <div style={{ ...page, boxShadow: rightPageShadow }}>
        <p style={runHeader}>{ar ? "Plotzy · منصة الكُتّاب" : "Plotzy · The Writer's Platform"}</p>

        <div style={{ flex: 1, overflow: "hidden" }}>
          {rightParas.slice(0, TYPED_OFFSET).map((p, i) => (
            <p key={i} style={para}>{p}</p>
          ))}
          <p style={para}>
            {typed}
            <motion.span
              animate={{ opacity: [1, 0] }}
              transition={{ duration: 0.55, repeat: Infinity }}
              style={{ display: "inline-block", width: 1.5, height: "0.78em", background: PAGE_TEXT, marginInlineStart: 1, verticalAlign: "middle" }}
            />
          </p>
        </div>

        {/* Page number */}
        <div style={pageNumRow}>
          <span style={pageNumDash}>·</span>
          <span style={pageNumText}>6</span>
          <span style={pageNumDash}>·</span>
        </div>
      </div>

      {/* ── CENTER SPINE ── perfectly centered fold line */}
      <div
        style={{
          position: "absolute",
          left: "50%",
          top: 0,
          bottom: 0,
          width: 1,
          transform: "translateX(-50%)",
          background:
            "linear-gradient(to bottom, rgba(0,0,0,0) 0%, rgba(0,0,0,0.18) 20%, rgba(0,0,0,0.22) 50%, rgba(0,0,0,0.18) 80%, rgba(0,0,0,0) 100%)",
          pointerEvents: "none",
          zIndex: 2,
        }}
      />

    </div>
  );
}




export default function Home() {
  const [, setLocation] = useLocation();
  const { data: books, isLoading } = useBooks();
  const createBook = useCreateBook();
  const generateCover = useGenerateCover();
  const trashBook = useTrashBook();
  const duplicateBook = useDuplicateBook();
  const updateBook = useUpdateBook();
  const { t, lang, isRTL } = useLanguage();
  const [isOpen, setIsOpen] = useState(false);
  const [showWizard, setShowWizard] = useState(false);
  const [title, setTitle] = useState("");
  const [bookSearch, setBookSearch] = useState("");
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [joinCode, setJoinCode] = useState("");
  const [joinLoading, setJoinLoading] = useState(false);
  const [joinError, setJoinError] = useState("");
  const [summary, setSummary] = useState("");
  const [authorName, setAuthorName] = useState("");
  const [bookLang, setBookLang] = useState(lang);
  const [selectedShelfBook, setSelectedShelfBook] = useState<ShelfBookData | null>(null);
  const [confirmTrashId, setConfirmTrashId] = useState<number | null>(null);
  const [renamingId, setRenamingId] = useState<number | null>(null);
  const [renameValue, setRenameValue] = useState("");
  // openMenuId is which book card is currently showing its action overlay
  // on TOUCH devices. On desktop the overlay stays hover-driven and this
  // stays null. Populated on tap so the writer sees Continue/Duplicate/
  // Rename/Delete instead of jumping straight into the editor.
  const [openMenuId, setOpenMenuId] = useState<number | null>(null);
  // Cache the "no fine pointer" (touch device) check on mount. matchMedia
  // is cheap but a state read is cheaper and we branch on it inside every
  // book card's click handler.
  const [isTouchDevice, setIsTouchDevice] = useState(false);
  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return;
    const mq = window.matchMedia("(hover: none), (pointer: coarse)");
    const update = () => setIsTouchDevice(mq.matches);
    update();
    mq.addEventListener?.("change", update);
    return () => mq.removeEventListener?.("change", update);
  }, []);
  // Close the touch menu when tapping outside a card (documented touch
  // pattern — otherwise there is no way to dismiss the overlay short of
  // opening another card).
  useEffect(() => {
    if (openMenuId === null) return;
    const onDown = (e: PointerEvent | MouseEvent) => {
      const target = e.target as HTMLElement | null;
      if (!target) return;
      if (target.closest("[data-book-card]")) return;
      setOpenMenuId(null);
    };
    document.addEventListener("pointerdown", onDown, true);
    return () => document.removeEventListener("pointerdown", onDown, true);
  }, [openMenuId]);
  const { toast } = useToast();

  const commitRename = (e: React.MouseEvent | React.FormEvent, id: number) => {
    e.preventDefault(); e.stopPropagation();
    const v = renameValue.trim();
    if (v && v !== "") {
      updateBook.mutate({ id, title: v }, {
        onSuccess: () => { toast({ title: t("hmRenamed") }); setRenamingId(null); },
        onError: () => toast({ title: t("hmRenameFailed"), variant: "destructive" }),
      });
    } else {
      setRenamingId(null);
    }
  };

  // ── Mouse-parallax for hero ──────────────────────────────
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);
  const parallaxX = useTransform(mouseX, [-1, 1], [-18, 18]);
  const parallaxY = useTransform(mouseY, [-1, 1], [-10, 10]);
  const smoothX = useSpring(parallaxX, { stiffness: 50, damping: 20 });
  const smoothY = useSpring(parallaxY, { stiffness: 50, damping: 20 });
  const handleHeroMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    mouseX.set(((e.clientX - rect.left) / rect.width - 0.5) * 2);
    mouseY.set(((e.clientY - rect.top) / rect.height - 0.5) * 2);
  }, [mouseX, mouseY]);
  const handleHeroMouseLeave = useCallback(() => {
    mouseX.set(0);
    mouseY.set(0);
  }, [mouseX, mouseY]);

  // New comprehensive 10-question wizard. Builds a structured summary
  // that the AI Studio can lean on from the first chapter, and writes
  // the writer-chosen genre + word goal into the dedicated columns so
  // the rest of the platform (dashboard, marketplace match score,
  // publisher recommendations) can use them too.
  const handleCreateFromWizard = async (answers: WizardAnswers) => {
    try {
      const ar = lang === "ar";
      const ageLabelEn: Record<string, string> = {
        children: "ages 5 to 8", middle_grade: "ages 8 to 12", ya: "young adult (13 to 18)",
        new_adult: "new adult (18 to 25)", adult: "adult",
      };
      const formatLabelEn: Record<string, string> = {
        novel: "Novel", novella: "Novella", short_story: "Short story",
        nonfiction: "Non-fiction", memoir: "Memoir", children: "Children's book",
      };

      // Build a structured summary the Studio injects into every
      // system prompt. Plain English (the LLMs handle Arabic metadata
      // fine but English keys keep the prompt compact).
      const lines: string[] = [];
      lines.push(`Format: ${formatLabelEn[answers.format] || answers.format}`);
      lines.push(`Genre: ${answers.genre}`);
      lines.push(`Audience: ${ageLabelEn[answers.audience] || answers.audience}`);
      lines.push(`Target length: ${answers.targetWords.toLocaleString("en-US")} words (about ${Math.round(answers.targetWords / 250)} pages)`);
      if (answers.setting) lines.push(`Setting: ${answers.setting}`);
      if (answers.topic) lines.push(`Topic: ${answers.topic}`);
      lines.push(`Schedule: ${answers.daysPerWeek} days/week, daily goal ${answers.dailyWordGoal.toLocaleString("en-US")} words`);
      const summary = lines.join("\n");

      const newBook = await createBook.mutateAsync({
        title: answers.title || (ar ? "كتاب بلا عنوان" : "Untitled book"),
        summary,
        authorName: answers.authorName,
        language: lang,
        genre: answers.genre,
        wordGoal: answers.targetWords,
      } as any);
      setLocation(`/books/${newBook.id}`);
    } catch (err: any) {
      toast({ variant: "destructive", title: t("hmCreateFailed"), description: err?.message || String(err) });
      throw err;
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    try {
      await createBook.mutateAsync({ title, summary, authorName, language: bookLang });
      setIsOpen(false);
      setTitle("");
      setSummary("");
      setAuthorName("");
      setBookLang(lang);
    } catch (err: any) {
      toast({ variant: "destructive", title: t("hmCreateFailed2"), description: err?.message || String(err) });
    }
  };

  const handleSelectorCreateBook = async (data: { title: string; summary: string; authorName: string; language: string; genre?: string }) => {
    const newBook = await createBook.mutateAsync({ ...data, contentType: "book" });
    setIsOpen(false);
    setLocation(`/books/${newBook.id}`);
  };

  const handleSelectorCreateArticle = async (data: { title: string; authorName: string; language: string; category: string }) => {
    const newArticle = await createBook.mutateAsync({
      title: data.title,
      authorName: data.authorName,
      language: data.language,
      contentType: "article",
      articleCategory: data.category,
    });
    setIsOpen(false);
    setLocation(`/articles/${newArticle.id}`);
  };

  const { user } = useAuth();
  // Phones get an entirely separate Apple-TV-style home (see the early
  // return below). Desktop/tablet fall through to the existing landing
  // page, 100% untouched.
  const isPhone = useIsPhone();
  const { data: sharedBooks = [] } = useQuery<{ id: number; title: string; coverImage: string | null; role: string; ownerName: string | null }[]>({
    queryKey: ["/api/books/shared-with-me"],
    queryFn: () => fetch("/api/books/shared-with-me", { credentials: "include" }).then(r => r.ok ? r.json() : []),
    enabled: !!user,
    staleTime: 0,
  });
  const { data: sharedByMe = [] } = useQuery<{ id: number; title: string; coverImage: string | null; collaborators: { userId: number; name: string | null; avatarUrl: string | null; role: string; joinedAt: string }[] }[]>({
    queryKey: ["/api/books/shared-by-me"],
    queryFn: () => fetch("/api/books/shared-by-me", { credentials: "include" }).then(r => r.ok ? r.json() : []),
    enabled: !!user,
    staleTime: 0,
  });
  const firstName = user?.displayName ? user.displayName.trim().split(/\s+/)[0] : null;
  const [showAuthModal, setShowAuthModal] = useState(false);

  const openCreateBook = () => {
    if (!user) { setShowAuthModal(true); return; }
    setIsOpen(true);
  };

  const shelfRows = books ? Array.from({ length: Math.ceil(books.length / BOOKS_PER_SHELF) }, (_, i) => books.slice(i * BOOKS_PER_SHELF, (i + 1) * BOOKS_PER_SHELF)) : [];
  const getBookLangInfo = (code: string) => BOOK_LANGUAGES.find(l => l.code === code);

  // ── Shelf auto-scroll on mouse edge proximity ──
  const shelfRef = useRef<HTMLDivElement>(null);
  const scrollRafRef = useRef<number | null>(null);

  const handleShelfMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const el = shelfRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const w = rect.width;
    const ZONE = 120; // px from edge that triggers scroll
    const MAX_SPEED = 14;

    let speed = 0;
    if (x < ZONE) speed = -MAX_SPEED * (1 - x / ZONE);
    else if (x > w - ZONE) speed = MAX_SPEED * (1 - (w - x) / ZONE);

    if (scrollRafRef.current) cancelAnimationFrame(scrollRafRef.current);
    if (speed === 0) return;

    const tick = () => {
      el.scrollLeft += speed;
      scrollRafRef.current = requestAnimationFrame(tick);
    };
    scrollRafRef.current = requestAnimationFrame(tick);
  }, []);

  const handleShelfMouseLeave = useCallback(() => {
    if (scrollRafRef.current) {
      cancelAnimationFrame(scrollRafRef.current);
      scrollRafRef.current = null;
    }
  }, []);

  // Smooth scroll helper
  const scrollToFeatures = () => {
    document.getElementById('platform-features')?.scrollIntoView({ behavior: 'smooth' });
  };

  // ── Phone: Apple-TV-style home ──────────────────────────────────
  // All hooks above have run (React rules satisfied). Phones render a
  // dedicated home inside the normal Layout chrome; everything below
  // this block is the desktop/tablet landing page, unchanged.
  //
  // "Start writing" (hero + AI banner) opens the book-creation wizard
  // directly — the 7 guided questions — creating the book and dropping
  // the writer into the editor. Requires sign-in first.
  if (isPhone) {
    const startWriting = () => {
      if (!user) { setShowAuthModal(true); return; }
      setShowWizard(true);
    };
    return (
      <>
        <SEO titleOverride="Plotzy" />
        {/* Light nav: the hero is now a paper surface, so the chrome
            stays light and blends with it. */}
        <Layout isLanding>
          <MobileHome onStartWriting={startWriting} />
        </Layout>
        <BookCreationWizard open={showWizard} onClose={() => setShowWizard(false)} onCreate={handleCreateFromWizard} />
        <AuthModal open={showAuthModal} onClose={() => setShowAuthModal(false)} />
      </>
    );
  }

  return (
    <>
      <SEO titleOverride="Plotzy" />

      {selectedShelfBook && (
        <Suspense fallback={null}>
          <BookViewerOverlay isOpen={!!selectedShelfBook} onClose={() => setSelectedShelfBook(null)} bookData={selectedShelfBook} />
        </Suspense>
      )}

      <ConfirmModal
        isOpen={confirmTrashId !== null}
        onClose={() => setConfirmTrashId(null)}
        onConfirm={() => { if (confirmTrashId !== null) trashBook.mutate(confirmTrashId); }}
        title={t("hmTrashTitle")}
        message={t("hmTrashMsg")}
        confirmLabel={t("hmTrashConfirm")}
        variant="warning"
      />

      <ContentTypeSelector
        open={isOpen}
        onClose={() => setIsOpen(false)}
        lang={lang}
        isRTL={isRTL}
        onCreateBook={handleSelectorCreateBook}
        onCreateArticle={handleSelectorCreateArticle}
        isCreating={createBook.isPending}
        // Route the Book card straight to the 10-question wizard.
        // ContentTypeSelector closes itself on this callback and we
        // open the wizard next paint.
        onChooseBookWizard={() => {
          setIsOpen(false);
          setShowWizard(true);
        }}
      />

      {/* 
        Pass isLanding=true so Layout removes margins 
        and allows Edge-to-Edge hero canvas 
      */}
      <Layout isLanding>

        {/* ===== MOBILE HERO (< 700px only) ===== */}
        {/* Phones get a static, lightweight hero. The 3D ContainerScroll
            below is heavy and looks cramped on a 5" screen. iPad and
            laptop are unaffected: this section is hidden via the
            media query in the <style> block below. !important is
            required because the inline display:flex would otherwise
            beat any class-based hiding. */}
        <style>{`
          @media (min-width: 700px) {
            .plotzy-mobile-hero { display: none !important; }
          }
          @media (max-width: 699px) {
            .plotzy-desktop-hero { display: none !important; }
          }
        `}</style>
        <section
          className="plotzy-mobile-hero"
          style={{
            position: "relative",
            // 100dvh keeps the section the EXACT height of the visible
            // viewport, even when the browser's address bar expands
            // or collapses mid-scroll. Supported in every browser
            // released since 2022.
            minHeight: "100dvh",
            background: "#221b11",
            overflow: "hidden",
          }}
        >
          {/* Hero illustration as a full-bleed backdrop. The image's
              black background is the same #221b11 as the page so the
              edges blend without a visible card boundary. object-fit:
              cover scales it to fill the section; object-position
              biases the crop toward the top half so the pen and the
              first cascade of pages stay in view on every viewport. */}
          <img
            src={`${import.meta.env.BASE_URL}hero-mobile.jpg`}
            alt={t("heroTagline")}
            decoding="async"
            fetchPriority="high"
            draggable={false}
            style={{
              position: "absolute",
              inset: 0,
              width: "100%",
              height: "100%",
              objectFit: "cover",
              objectPosition: "center top",
              userSelect: "none",
              pointerEvents: "none",
              zIndex: 0,
            }}
          />
          {/* Gradient veil from transparent at the top of the image to
              solid page black at the bottom so the wordmark, the
              subtitle, and the CTA sit on a clean dark canvas. No hard
              edge anywhere — the image bleeds into the page. */}
          <div
            aria-hidden
            style={{
              position: "absolute",
              inset: 0,
              background: "linear-gradient(to bottom, rgba(8,8,8,0) 0%, rgba(8,8,8,0) 38%, rgba(8,8,8,0.55) 60%, rgba(8,8,8,0.92) 82%, #221b11 100%)",
              pointerEvents: "none",
              zIndex: 1,
            }}
          />
          {/* Foreground content — the wordmark cluster floats over the
              illustration. justify-content: flex-end pins it to the
              bottom third where the gradient is darkest. */}
          <div
            style={{
              position: "relative",
              zIndex: 2,
              minHeight: "100dvh",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "flex-end",
              padding: "40px 24px 64px",
              textAlign: "center",
            }}
          >
            <p style={{
              fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Display', 'Helvetica Neue', Arial, sans-serif",
              fontSize: 18,
              fontWeight: 400,
              color: "rgba(244,239,226,0.78)",
              marginBottom: 10,
              letterSpacing: "0.01em",
              textShadow: "0 2px 18px rgba(0,0,0,0.85)",
            }}>
              {t("heroTagline")}
            </p>
            <h1 style={{
              fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Display', 'Helvetica Neue', Arial, sans-serif",
              fontSize: "clamp(3.5rem, 18vw, 5rem)",
              fontWeight: 800,
              lineHeight: 1,
              letterSpacing: "-0.05em",
              color: "#F3F3F3",
              margin: "0 0 20px",
              userSelect: "none",
              textShadow: "0 4px 28px rgba(0,0,0,0.75)",
            }}>
              PLOTZY
            </h1>
            <p style={{
              fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Display', 'Helvetica Neue', Arial, sans-serif",
              fontSize: 15,
              color: "rgba(244,239,226,0.58)",
              maxWidth: 320,
              margin: "0 0 28px",
              lineHeight: 1.5,
              textShadow: "0 2px 14px rgba(0,0,0,0.85)",
            }}>
              {t("heroSubtitle")}
            </p>
            <button
              onClick={openCreateBook}
              style={{
                padding: "14px 36px",
                borderRadius: 999,
                background: "#EFEFEF",
                color: "#332a1b",
                fontWeight: 700,
                fontSize: 14,
                letterSpacing: "0.01em",
                border: "none",
                cursor: "pointer",
                fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Display', 'Helvetica Neue', Arial, sans-serif",
                boxShadow: "0 8px 32px rgba(0,0,0,0.65)",
              }}
            >
              {t("heroStartWriting")}
            </button>
          </div>
        </section>

        {/* ===== HERO SECTION — ContainerScroll 3D (>= 700px only) ===== */}
        <div className="plotzy-desktop-hero bg-[#221b11]">
          <ContainerScroll
            titleComponent={
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "0.6rem" }}>
                <motion.p
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1], delay: 0.15 }}
                  style={{
                    fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Display', 'Helvetica Neue', Arial, sans-serif",
                    fontSize: "clamp(1.5rem, 3vw, 2rem)",
                    fontWeight: 400,
                    letterSpacing: "0.01em",
                    color: "rgba(244,239,226,0.88)",
                    margin: 0,
                    textAlign: "center",
                  }}
                >
                  {t("heroTagline")}
                </motion.p>
                <motion.h1
                  initial={{ opacity: 0, y: 32 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 1.1, ease: [0.16, 1, 0.3, 1] }}
                  style={{
                    fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Display', 'Helvetica Neue', Arial, sans-serif",
                    fontSize: "clamp(5rem, 13vw, 10rem)",
                    fontWeight: 800,
                    lineHeight: 1,
                    letterSpacing: "-0.055em",
                    color: "#EFEFEF",
                    margin: 0,
                    userSelect: "none",
                    textAlign: "center",
                  }}
                >
                  PLOTZY
                </motion.h1>
              </div>
            }
          >
            <BookPages />
          </ContainerScroll>
        </div>

        {/* ===== 3D FEATURE FOLDERS ===== */}
        <div style={{ background: "#060606", overflow: "visible", padding: "40px 6% 48px", marginTop: "-40px" }}>
          <div style={{ maxWidth: 1100, margin: "0 auto" }}>
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
              style={{ textAlign: "center", fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Display", "SF Pro Text", sans-serif', fontSize: "clamp(1.4rem, 2.4vw, 2rem)", fontWeight: 400, letterSpacing: "-0.02em", color: "#f7f2e4", marginBottom: 56, lineHeight: 1.3 }}
            >
              {t("fldIntro")}
            </motion.p>
            <div style={{ display: "flex", justifyContent: "center", gap: 0 }}>
              {[
                {
                  title: t("fldWriteTitle"),
                  subtitle: t("fldFeaturesHint"),
                  cards: [
                    { id: "w1", icon: "", headline: t("fldW1H"), sub: t("fldW1S") },
                    { id: "w2", icon: "", headline: t("fldW2H"), sub: t("fldW2S") },
                    { id: "w3", icon: "", headline: t("fldW3H"), sub: t("fldW3S") },
                  ],
                },
                {
                  title: t("fldPublishTitle"),
                  subtitle: t("fldFeaturesHint"),
                  cards: [
                    { id: "p1", icon: "", headline: t("fldP1H"), sub: t("fldP1S") },
                    { id: "p2", icon: "", headline: t("fldP2H"), sub: t("fldP2S") },
                    { id: "p3", icon: "", headline: t("fldP3H"), sub: t("fldP3S") },
                  ],
                },
                {
                  title: t("fldListenTitle"),
                  subtitle: t("fldFeaturesHint"),
                  cards: [
                    { id: "l1", icon: "", headline: t("fldL1H"), sub: t("fldL1S") },
                    { id: "l2", icon: "", headline: t("fldL2H"), sub: t("fldL2S") },
                    { id: "l3", icon: "", headline: t("fldL3H"), sub: t("fldL3S") },
                  ],
                },
              ].map((folder, i) => (
                <motion.div
                  key={folder.title}
                  initial={{ opacity: 0, y: 40 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, amount: 0.2 }}
                  transition={{ duration: 0.7, delay: i * 0.12, ease: [0.16, 1, 0.3, 1] }}
                >
                  <AnimatedFolder folder={folder} className="w-full" />
                </motion.div>
              ))}
            </div>
          </div>
        </div>

        {/* ===== EXISTING ACTIVE LIBRARY SECTION (SLEEK INTEGRATION) ===== */}
        {!isLoading && (
          <section className="bg-[#050505] border-t border-b border-white/10 py-24 px-4 sm:px-6 lg:px-8">
            <div className="max-w-7xl mx-auto">

              {/* ── Personalized Greeting ── */}
              {firstName && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.55, ease: "easeOut" }}
                  className="mb-10"
                >
                  <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-white/30 mb-1">
                    {t("hmWelcomeBack")}
                  </p>
                  <h1 className="text-3xl sm:text-4xl font-bold text-white leading-tight">
                    {t("hmHello")} <span className="text-white">{firstName}!</span>
                  </h1>
                </motion.div>
              )}

              {/* Library Header */}
              <div id="workspace" className="flex items-center justify-between gap-4 mb-10">
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-white/25 mb-1.5">{t("hmWorkspace")}</p>
                  <h2 className="text-2xl font-bold text-white tracking-tight leading-none">{t("hmYourProjects")}</h2>
                  {books && books.length > 3 && (
                    <div className="mt-2 flex items-center gap-2 rounded-lg px-3 py-1.5" style={{ background: "rgba(244,239,226,0.04)", border: "1px solid rgba(244,239,226,0.06)", maxWidth: 240 }}>
                      <Search className="w-3.5 h-3.5" style={{ color: "rgba(244,239,226,0.25)" }} />
                      <input value={bookSearch} onChange={e => setBookSearch(e.target.value)} placeholder={t("hmSearchBooks")}
                        className="bg-transparent border-none outline-none text-xs w-full" style={{ color: "#f7f2e4" }} />
                    </div>
                  )}
                </div>
                <div className="workspace-actions flex items-center gap-3">
                  {books && books.length > 0 && (
                    <span className="text-[11px] font-semibold text-white/20 uppercase tracking-widest hidden sm:block">
                      {books.length} {books.length === 1 ? t("hmProject") : t("hmProjects")}
                    </span>
                  )}
                  <Link href="/trash">
                    <button
                      className="workspace-btn flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium transition-all duration-200 hover:scale-[1.03] active:scale-[0.97]"
                      style={{ background: 'rgba(244,239,226,0.06)', color: 'rgba(244,239,226,0.45)', border: '1px solid rgba(244,239,226,0.08)' }}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      {t("hmTrash")}
                    </button>
                  </Link>
                  {user && (
                    <>
                      <button
                        onClick={() => { setShowJoinModal(true); setJoinCode(""); setJoinError(""); }}
                        className="workspace-btn flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold tracking-wide transition-all duration-200 hover:scale-[1.03] active:scale-[0.97]"
                        style={{ background: 'rgba(244,239,226,0.06)', color: 'rgba(244,239,226,0.6)', border: '1px solid rgba(244,239,226,0.1)' }}
                      >
                        <Users className="w-3.5 h-3.5" />
                        {t("hmJoinABook")}
                      </button>
                      <button
                        onClick={() => setIsOpen(true)}
                        className="workspace-btn flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold tracking-wide transition-all duration-200 hover:scale-[1.03] active:scale-[0.97]"
                        style={{ background: '#f7f2e4', color: '#332a1b' }}
                      >
                        <Plus className="w-3.5 h-3.5" />
                        {t("hmNewProject")}
                      </button>
                    </>
                  )}
                </div>
                <style>{`
                  @media (max-width: 699px) {
                    .workspace-actions {
                      flex-wrap: wrap !important;
                      gap: 8px !important;
                      justify-content: flex-start !important;
                    }
                    .workspace-btn {
                      padding: 6px 12px !important;
                      font-size: 12px !important;
                      gap: 6px !important;
                    }
                  }
                `}</style>
              </div>

              {/* Shelf display */}
              {(!books || books.length === 0) ? (
                /* ── Empty State: New Project Card ── */
                <>
                <motion.div
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.97 }}
                  transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
                  onClick={openCreateBook}
                  className="cursor-pointer mx-auto group"
                  style={{ maxWidth: 260 }}
                >
                  <motion.div
                    className="flex flex-col items-center justify-center rounded-2xl"
                    style={{
                      height: 360,
                      border: '1.5px dashed rgba(244,239,226,0.1)',
                      background: 'rgba(244,239,226,0.015)',
                      transition: 'border-color 0.25s, background 0.25s, box-shadow 0.25s',
                    }}
                    whileHover={{
                      borderColor: 'rgba(244,239,226,0.22)',
                      background: 'rgba(244,239,226,0.04)',
                      boxShadow: '0 0 40px rgba(244,239,226,0.04)',
                    }}
                  >
                    <motion.div
                      className="flex items-center justify-center rounded-full mb-3"
                      style={{
                        width: 40,
                        height: 40,
                        border: '1.5px solid rgba(244,239,226,0.15)',
                      }}
                      whileHover={{ scale: 1.15, borderColor: 'rgba(244,239,226,0.4)' }}
                      whileTap={{ scale: 0.9 }}
                    >
                      <Plus className="w-4 h-4 text-white/40 group-hover:text-white/70 transition-colors duration-200" />
                    </motion.div>
                    <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-white/25 group-hover:text-white/50 transition-colors duration-200">
                      {t("hmNewProject")}
                    </p>
                  </motion.div>
                </motion.div>
                {user && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.3 }}
                    className="flex justify-center mt-4"
                  >
                    <Link href="/trash">
                      <button
                        className="flex items-center gap-1.5 text-[11px] font-medium text-white/25 hover:text-white/50 transition-colors duration-200"
                      >
                        <Trash2 className="w-3 h-3" />
                        {t("hmTrash")}
                      </button>
                    </Link>
                  </motion.div>
                )}
                </>
              ) : (
              <div
                ref={shelfRef}
                className="flex gap-5 pb-4"
                style={{ overflowX: 'auto', overflowY: 'visible', scrollbarWidth: 'none' }}
                onMouseMove={handleShelfMouseMove}
                onMouseLeave={handleShelfMouseLeave}
              >
                {/* Always-visible "Add New" card */}
                <motion.div
                  initial={{ opacity: 0, y: 24 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: 0.1 }}
                  onClick={openCreateBook}
                  className="cursor-pointer group flex-shrink-0"
                  style={{ width: 180 }}
                >
                  <div
                    className="relative rounded-xl overflow-hidden flex flex-col items-center justify-center gap-3 border border-dashed transition-all duration-300"
                    style={{ aspectRatio: '2/3', background: 'rgba(244,239,226,0.02)', borderColor: 'rgba(244,239,226,0.12)' }}
                    onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.borderColor = 'rgba(244,239,226,0.25)'; (e.currentTarget as HTMLDivElement).style.background = 'rgba(244,239,226,0.04)'; }}
                    onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.borderColor = 'rgba(244,239,226,0.12)'; (e.currentTarget as HTMLDivElement).style.background = 'rgba(244,239,226,0.02)'; }}
                  >
                    <div className="w-9 h-9 rounded-full border border-white/15 flex items-center justify-center group-hover:border-white/30 transition-colors">
                      <Plus className="w-4 h-4 text-white/30 group-hover:text-white/60 transition-colors" />
                    </div>
                    <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-white/20 group-hover:text-white/40 transition-colors">{t("hmNewProject")}</p>
                  </div>
                  <div className="mt-2.5 px-0.5 h-7" />
                </motion.div>

                {[...books].sort((a, b) => {
                  // Sort by last accessed (stored in localStorage), then by createdAt
                  const getLastAccessed = (id: number) => { try { return Number(localStorage.getItem(`plotzy_book_accessed_${id}`) || 0); } catch { return 0; } };
                  const aTime = getLastAccessed(a.id);
                  const bTime = getLastAccessed(b.id);
                  if (aTime !== bTime) return bTime - aTime;
                  return new Date(b.createdAt ?? 0).getTime() - new Date(a.createdAt ?? 0).getTime();
                }).filter(b => !bookSearch.trim() || b.title.toLowerCase().includes(bookSearch.toLowerCase())).map((book, bookIndex) => {
                      const langInfo = getBookLangInfo(book.language || "en");
                      const coverPalette = COVER_PALETTES[book.id % COVER_PALETTES.length];
                      const titleLen = book.title.length;
                      const titleFontSize = titleLen > 30 ? '0.67rem' : titleLen > 20 ? '0.78rem' : titleLen > 12 ? '0.9rem' : '1.05rem';
                      const isArticle = book.contentType === 'article';
                      return (
                        <motion.div
                          key={book.id}
                          initial={{ opacity: 0, y: 24, scale: 0.96 }}
                          whileInView={{ opacity: 1, y: 0, scale: 1 }}
                          viewport={{ once: true, margin: "-50px" }}
                          transition={{ duration: 0.5, delay: bookIndex * 0.06, ease: [0.22, 1, 0.36, 1] }}
                          style={{ flexShrink: 0, width: 180 }}
                        >
                          {/* ── Card wrapper: plain div navigates on click; overlay uses stopPropagation ── */}
                          <div
                            data-book-card
                            className="group cursor-pointer"
                            onClick={(e) => {
                              // On touch devices the first tap OPENS the
                              // menu overlay so the writer can pick
                              // Continue / Duplicate / Rename / Delete
                              // rather than being teleported straight
                              // into the editor. A second tap on the
                              // background of the same card closes it.
                              // Desktop mice keep the direct-navigate
                              // behaviour because hover already shows
                              // the overlay.
                              if (isTouchDevice) {
                                e.stopPropagation();
                                setOpenMenuId((cur) => (cur === book.id ? null : book.id));
                                return;
                              }
                              setLocation(isArticle ? `/articles/${book.id}` : `/books/${book.id}`);
                            }}
                          >
                            {isArticle ? (
                              /* ── Blog / Article Card ── */
                              <div
                                className="relative w-full overflow-hidden transition-all duration-300 ease-out"
                                style={{
                                  aspectRatio: '2/3',
                                  borderRadius: 10,
                                  background: 'linear-gradient(160deg, #1c1c28 0%, #141420 60%, #0f0f1a 100%)',
                                  border: '1px solid rgba(244,239,226,0.08)',
                                  boxShadow: '0 4px 20px rgba(0,0,0,0.4), 0 1px 3px rgba(0,0,0,0.3)',
                                }}
                              >
                                <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 4, background: coverPalette.accent, borderRadius: '10px 10px 0 0', opacity: 0.85 }} />
                                {book.coverImage && (
                                  <div style={{ position: 'absolute', inset: 0, zIndex: 0 }}>
                                    <img src={book.coverImage} alt={book.title} style={{ width: '100%', height: '100%', objectFit: 'cover', opacity: 0.18 }} />
                                    <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(160deg, #1c1c28cc 0%, #0f0f1aee 100%)' }} />
                                  </div>
                                )}
                                <div style={{ position: 'absolute', top: 44, left: 14, right: 14, zIndex: 1 }}>
                                  {[0,1,2,3,4,5].map(i => (
                                    <div key={i} style={{ height: 1, background: 'rgba(244,239,226,0.045)', marginBottom: 10, borderRadius: 1, width: i === 5 ? '55%' : '100%' }} />
                                  ))}
                                </div>
                                <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', padding: '16px 14px 14px', zIndex: 2 }}>
                                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                                    <span style={{ fontSize: 8, fontWeight: 700, letterSpacing: '0.18em', textTransform: 'uppercase', color: coverPalette.accent, background: `${coverPalette.accent}22`, border: `1px solid ${coverPalette.accent}55`, borderRadius: 4, padding: '2px 6px' }}>Blog</span>
                                    {langInfo && langInfo.code !== 'en' && (
                                      <span style={{ fontSize: 8, color: 'rgba(244,239,226,0.3)', fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase' }}>{langInfo.nativeName.slice(0, 3)}</span>
                                    )}
                                  </div>
                                  <div style={{ marginBottom: 8 }}>
                                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" style={{ opacity: 0.25 }}>
                                      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                                      <polyline points="14 2 14 8 20 8" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                                      <line x1="16" y1="13" x2="8" y2="13" stroke="white" strokeWidth="1.5" strokeLinecap="round"/>
                                      <line x1="16" y1="17" x2="8" y2="17" stroke="white" strokeWidth="1.5" strokeLinecap="round"/>
                                    </svg>
                                  </div>
                                  <h3 style={{ fontSize: titleFontSize, fontWeight: 700, color: 'rgba(244,239,226,0.9)', lineHeight: 1.35, display: '-webkit-box', WebkitLineClamp: 4, WebkitBoxOrient: 'vertical', overflow: 'hidden', fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Display', sans-serif", marginBottom: 8, flex: 1 }}>{book.title}</h3>
                                  {book.articleCategory && (
                                    <div style={{ fontSize: 8, color: 'rgba(244,239,226,0.35)', letterSpacing: '0.14em', textTransform: 'uppercase', fontWeight: 600, marginBottom: 10 }}>{book.articleCategory}</div>
                                  )}
                                  <div style={{ marginTop: 'auto' }}>
                                    {[100, 88, 72].map((w, i) => (
                                      <div key={i} style={{ height: 2, background: 'rgba(244,239,226,0.08)', borderRadius: 2, marginBottom: 5, width: `${w}%` }} />
                                    ))}
                                  </div>
                                </div>
                                {/* Hover overlay — no backdropFilter to avoid 3D-ancestor full-page blur bug */}
                                <div
                                  className={`absolute inset-0 z-10 flex flex-col items-center justify-center gap-2 transition-all duration-300 ${renamingId === book.id || openMenuId === book.id ? 'opacity-100 pointer-events-auto' : 'opacity-0 group-hover:opacity-100 pointer-events-none group-hover:pointer-events-auto'}`}
                                  style={{ background: 'rgba(8,8,18,0.88)', borderRadius: 10 }}
                                >
                                  {renamingId === book.id ? (
                                    <form onSubmit={(e) => { e.stopPropagation(); commitRename(e, book.id); }} onClick={(e) => e.stopPropagation()} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, padding: '0 14px', width: '100%' }}>
                                      <span style={{ fontSize: 8, fontWeight: 700, letterSpacing: '0.2em', color: 'rgba(244,239,226,0.45)', textTransform: 'uppercase' }}>{t("hmRename")}</span>
                                      <input autoFocus value={renameValue} onChange={e => setRenameValue(e.target.value)} onKeyDown={e => { if (e.key === 'Escape') setRenamingId(null); }} style={{ width: '100%', padding: '6px 10px', borderRadius: 8, fontSize: 12, textAlign: 'center', background: 'rgba(244,239,226,0.1)', border: '1px solid rgba(244,239,226,0.2)', color: '#f7f2e4', outline: 'none', fontFamily: 'inherit' }} maxLength={120} />
                                      <div style={{ display: 'flex', gap: 6 }}>
                                        <button type="submit" disabled={updateBook.isPending} className="text-white text-[8px] font-semibold tracking-[0.2em] uppercase px-3 py-1.5 rounded-full border border-white/20 bg-white/10 hover:bg-white/20 transition-colors disabled:opacity-40">{updateBook.isPending ? '…' : t("hmSave")}</button>
                                        <button type="button" onClick={(e) => { e.stopPropagation(); setRenamingId(null); }} className="text-white/50 text-[8px] font-semibold tracking-[0.2em] uppercase px-3 py-1.5 rounded-full border border-white/10 bg-transparent hover:bg-white/10 transition-colors">{t("hmCancel")}</button>
                                      </div>
                                    </form>
                                  ) : (
                                    <>
                                      <button onClick={(e) => { e.stopPropagation(); setLocation(`/articles/${book.id}`); }} className="text-white text-[11px] md:text-[9px] font-semibold tracking-[0.2em] uppercase px-5 py-2.5 md:px-4 md:py-2 rounded-full border border-white/20 bg-white/10 hover:bg-white/20 active:bg-white/25 transition-all duration-300">{t("hmContinueWriting")}</button>
                                      <button onClick={(e) => { e.stopPropagation(); duplicateBook.mutate(book.id); }} disabled={duplicateBook.isPending} className="text-white/70 text-[10px] md:text-[8px] font-semibold tracking-[0.2em] uppercase px-4 py-2 md:px-3 md:py-1.5 rounded-full border border-white/15 bg-white/8 hover:bg-white/15 active:bg-white/20 transition-colors disabled:opacity-40">{duplicateBook.isPending ? t("hmDuplicating") : t("hmDuplicate")}</button>
                                      <button onClick={(e) => { e.stopPropagation(); setRenamingId(book.id); setRenameValue(book.title); }} className="text-white/70 text-[10px] md:text-[8px] font-semibold tracking-[0.2em] uppercase px-4 py-2 md:px-3 md:py-1.5 rounded-full border border-white/15 bg-white/8 hover:bg-white/15 active:bg-white/20 transition-colors">{t("hmRename")}</button>
                                      <button onClick={(e) => { e.stopPropagation(); setConfirmTrashId(book.id); }} className="text-red-300/80 text-[10px] md:text-[8px] font-semibold tracking-[0.2em] uppercase px-4 py-2 md:px-3 md:py-1.5 rounded-full border border-red-400/18 bg-red-500/8 hover:bg-red-500/20 active:bg-red-500/30 transition-colors">{t("hmDelete")}</button>
                                    </>
                                  )}
                                </div>
                              </div>
                            ) : (
                              /* ── 3D Perspective Book ── */
                              <PerspectiveBook spineColor={book.spineColor || coverPalette.accent}>
                                {!book.coverImage && (<div className="absolute inset-0"><BookCoverShader bookId={book.id} speed={0.5} /></div>)}
                                {book.coverImage && (<img src={book.coverImage} alt={book.title} className="absolute inset-0 w-full h-full object-cover object-center" />)}
                                <div className="absolute top-0 inset-x-0 h-1/2 pointer-events-none z-20" style={{ background: 'linear-gradient(to bottom, rgba(244,239,226,0.04), transparent)' }} />
                                <div className="absolute bottom-0 inset-x-0 p-3 flex flex-col justify-end z-20" style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.85) 0%, rgba(0,0,0,0.5) 55%, transparent 100%)' }}>
                                  <h3 className="text-white font-bold leading-tight line-clamp-2" style={{ fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Display', 'Helvetica Neue', sans-serif", fontSize: titleFontSize, textShadow: '0 1px 8px rgba(0,0,0,0.7)' }}>{book.title}</h3>
                                  <div className="mt-0.5 tracking-[0.18em] uppercase" style={{ fontSize: '8px', color: 'rgba(244,239,226,0.35)' }}>{book.genre ? book.genre : t("hmBookGenre")}</div>
                                </div>
                                {langInfo && langInfo.code !== 'en' && (
                                  <div className="absolute top-2 left-2 z-30 text-white/65 rounded-md px-1.5 py-0.5 text-[8px] uppercase tracking-wider font-semibold border border-white/10" style={{ background: 'rgba(0,0,0,0.75)' }}>{langInfo.nativeName.slice(0, 3)}</div>
                                )}
                                {/* Hover overlay — inside PerspectiveBook so it gets the 3D transform */}
                                {/* NOTE: no backdropFilter here — backdrop-filter inside CSS 3D transform blurs the entire page */}
                                <div
                                  className={`absolute inset-0 z-40 flex flex-col items-center justify-center gap-2 transition-all duration-300 ${renamingId === book.id || openMenuId === book.id ? 'opacity-100 pointer-events-auto' : 'opacity-0 group-hover:opacity-100 pointer-events-none group-hover:pointer-events-auto'}`}
                                  style={{ background: 'rgba(0,0,0,0.82)', borderRadius: '6px 4px 4px 6px' }}
                                >
                                  {renamingId === book.id ? (
                                    <form onSubmit={(e) => { e.stopPropagation(); commitRename(e, book.id); }} onClick={(e) => e.stopPropagation()} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, padding: '0 14px', width: '100%' }}>
                                      <span style={{ fontSize: 8, fontWeight: 700, letterSpacing: '0.2em', color: 'rgba(244,239,226,0.45)', textTransform: 'uppercase' }}>{t("hmRename")}</span>
                                      <input autoFocus value={renameValue} onChange={e => setRenameValue(e.target.value)} onKeyDown={e => { if (e.key === 'Escape') setRenamingId(null); }} style={{ width: '100%', padding: '6px 10px', borderRadius: 8, fontSize: 12, textAlign: 'center', background: 'rgba(244,239,226,0.1)', border: '1px solid rgba(244,239,226,0.2)', color: '#f7f2e4', outline: 'none', fontFamily: 'inherit' }} maxLength={120} />
                                      <div style={{ display: 'flex', gap: 6 }}>
                                        <button type="submit" disabled={updateBook.isPending} className="text-white text-[8px] font-semibold tracking-[0.2em] uppercase px-3 py-1.5 rounded-full border border-white/20 bg-white/10 hover:bg-white/20 transition-colors disabled:opacity-40">{updateBook.isPending ? '…' : t("hmSave")}</button>
                                        <button type="button" onClick={(e) => { e.stopPropagation(); setRenamingId(null); }} className="text-white/50 text-[8px] font-semibold tracking-[0.2em] uppercase px-3 py-1.5 rounded-full border border-white/10 bg-transparent hover:bg-white/10 transition-colors">{t("hmCancel")}</button>
                                      </div>
                                    </form>
                                  ) : (
                                    <>
                                      <button onClick={(e) => { e.stopPropagation(); setLocation(`/books/${book.id}`); }} className="text-white text-[11px] md:text-[9px] font-semibold tracking-[0.2em] uppercase px-5 py-2.5 md:px-4 md:py-2 rounded-full border border-white/20 bg-white/10 hover:bg-white/20 active:bg-white/25 transition-all duration-300">{t("hmContinueWriting")}</button>
                                      <button onClick={(e) => { e.stopPropagation(); duplicateBook.mutate(book.id); }} disabled={duplicateBook.isPending} className="text-white/70 text-[10px] md:text-[8px] font-semibold tracking-[0.2em] uppercase px-4 py-2 md:px-3 md:py-1.5 rounded-full border border-white/15 bg-white/8 hover:bg-white/15 active:bg-white/20 transition-colors disabled:opacity-40">{duplicateBook.isPending ? t("hmDuplicating") : t("hmDuplicate")}</button>
                                      <button onClick={(e) => { e.stopPropagation(); setRenamingId(book.id); setRenameValue(book.title); }} className="text-white/70 text-[10px] md:text-[8px] font-semibold tracking-[0.2em] uppercase px-4 py-2 md:px-3 md:py-1.5 rounded-full border border-white/15 bg-white/8 hover:bg-white/15 active:bg-white/20 transition-colors">{t("hmRename")}</button>
                                      <button onClick={(e) => { e.stopPropagation(); setConfirmTrashId(book.id); }} className="text-red-300/80 text-[10px] md:text-[8px] font-semibold tracking-[0.2em] uppercase px-4 py-2 md:px-3 md:py-1.5 rounded-full border border-red-400/18 bg-red-500/8 hover:bg-red-500/20 active:bg-red-500/30 transition-colors">{t("hmDelete")}</button>
                                    </>
                                  )}
                                </div>
                              </PerspectiveBook>
                            )}
                          </div>

                          {/* ── Label below card ── */}
                          <div className="mt-2.5 px-0.5">
                            <p className="text-[12px] font-semibold text-white/75 truncate leading-snug">{book.title}</p>
                            <p className="text-[10px] text-white/28 mt-0.5">
                              {book.createdAt ? format(new Date(book.createdAt), 'MMM d, yyyy') : ''}
                            </p>
                          </div>
                        </motion.div>
                      );
                    })}
              </div>
              )}
            </div>
          </section>
        )}





        {/* ===== SHARED SECTIONS WRAPPER (dark bg matches Your Projects above) ===== */}
        <div className="bg-[#050505]">

        {/* ===== SHARED WITH ME ===== */}
        {user && sharedBooks.length > 0 && (
          <section className="max-w-7xl mx-auto px-6 pt-8 pb-4">
            <div className="flex items-center gap-3 mb-5">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: "rgba(96,165,250,0.1)", border: "1px solid rgba(96,165,250,0.2)" }}>
                <Users className="w-4 h-4" style={{ color: "#60a5fa" }} />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white">{t("hmSharedWithYou")}</h3>
                <p className="text-xs" style={{ color: "rgba(244,239,226,0.3)" }}>{t("hmSharedWithYouDesc")}</p>
              </div>
            </div>
            <div className="grid gap-3" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))" }}>
              {sharedBooks.map(sb => (
                <button key={sb.id} type="button" onClick={async () => {
                  // Go directly to first chapter (writing page)
                  try {
                    const res = await fetch(`/api/books/${sb.id}/chapters`, { credentials: "include" });
                    const chapters = await res.json();
                    if (chapters && chapters.length > 0) {
                      const sorted = chapters.sort((a: any, b: any) => a.order - b.order);
                      setLocation(`/books/${sb.id}/chapters/${sorted[0].id}`);
                    } else {
                      setLocation(`/books/${sb.id}`);
                    }
                  } catch { setLocation(`/books/${sb.id}`); }
                }}
                  className="flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-all hover:scale-[1.02] text-left bg-transparent border-0 w-full"
                  style={{ background: "rgba(96,165,250,0.04)", border: "1px solid rgba(96,165,250,0.1)" }}>
                  {/* Mini cover */}
                  <div className="w-10 h-14 rounded-lg flex-shrink-0 flex items-center justify-center" style={{ background: "rgba(96,165,250,0.08)" }}>
                    {sb.coverImage ? (
                      <img src={sb.coverImage} alt={sb.title || ""} className="w-full h-full object-cover rounded-lg" />
                    ) : (
                      <BookOpen className="w-4 h-4" style={{ color: "rgba(96,165,250,0.5)" }} />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-white truncate">{sb.title}</p>
                    <p className="text-[11px] truncate" style={{ color: "rgba(244,239,226,0.35)" }}>
                      {t("hmBy")} {sb.ownerName || t("hmUnknown")} · {sb.role === "editor" ? t("hmCanEdit") : t("hmViewOnly")}
                    </p>
                  </div>
                  <span className="text-[9px] font-bold px-2 py-0.5 rounded-full flex-shrink-0" style={{ background: sb.role === "editor" ? "rgba(74,222,128,0.12)" : "rgba(96,165,250,0.12)", color: sb.role === "editor" ? "#4ade80" : "#60a5fa" }}>
                    {sb.role === "editor" ? t("hmEditor") : t("hmViewer")}
                  </span>
                </button>
              ))}
            </div>
          </section>
        )}

        {/* ===== SHARED BY ME ===== */}
        {user && sharedByMe.length > 0 && (
          <section className="max-w-7xl mx-auto px-6 pt-8 pb-4">
            <div className="flex items-center gap-3 mb-5">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: "rgba(244,239,226,0.06)", border: "1px solid rgba(244,239,226,0.12)" }}>
                <UserPlus className="w-4 h-4" style={{ color: "#f7f2e4" }} />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white">{t("hmYouShared")}</h3>
                <p className="text-xs" style={{ color: "rgba(244,239,226,0.3)" }}>{t("hmYouSharedDesc")}</p>
              </div>
            </div>
            <div className="grid gap-3" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))" }}>
              {sharedByMe.map(book => (
                <button key={book.id} type="button" onClick={() => setLocation(`/books/${book.id}`)}
                  className="p-3 rounded-xl cursor-pointer transition-all hover:scale-[1.01] text-left bg-transparent border-0 w-full"
                  style={{ background: "rgba(167,139,250,0.04)", border: "1px solid rgba(167,139,250,0.1)" }}>
                  {/* Book header */}
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-10 h-14 rounded-lg flex-shrink-0 flex items-center justify-center overflow-hidden" style={{ background: "rgba(167,139,250,0.08)" }}>
                      {book.coverImage ? (
                        <img src={book.coverImage} alt={book.title || ""} className="w-full h-full object-cover" />
                      ) : (
                        <BookOpen className="w-4 h-4" style={{ color: "rgba(167,139,250,0.5)" }} />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-white truncate">{book.title}</p>
                      <p className="text-[11px]" style={{ color: "rgba(244,239,226,0.35)" }}>
                        {book.collaborators.length} {book.collaborators.length === 1 ? t("hmCollaborator") : t("hmCollaborators")}
                      </p>
                    </div>
                  </div>

                  {/* Collaborators list */}
                  <div className="flex flex-col gap-1.5">
                    {book.collaborators.slice(0, 3).map((c) => (
                      <div key={c.userId} className="flex items-center gap-2 px-2 py-1 rounded-md" style={{ background: "rgba(244,239,226,0.02)" }}>
                        {c.avatarUrl ? (
                          <img src={c.avatarUrl} alt={c.name || ""} className="w-5 h-5 rounded-full object-cover" />
                        ) : (
                          <div className="w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold" style={{ background: "rgba(167,139,250,0.15)", color: "#a78bfa" }}>
                            {(c.name || "?")[0]?.toUpperCase()}
                          </div>
                        )}
                        <span className="text-[11px] flex-1 truncate" style={{ color: "rgba(244,239,226,0.7)" }}>{c.name || t("hmUnknown")}</span>
                        <span className="text-[8px] font-bold px-1.5 py-0.5 rounded-full" style={{ background: c.role === "editor" ? "rgba(167,139,250,0.15)" : "rgba(244,239,226,0.06)", color: c.role === "editor" ? "#a78bfa" : "rgba(244,239,226,0.55)", border: "1px solid", borderColor: c.role === "editor" ? "rgba(167,139,250,0.25)" : "rgba(244,239,226,0.10)" }}>
                          {c.role === "editor" ? t("hmEditor") : t("hmViewer")}
                        </span>
                      </div>
                    ))}
                    {book.collaborators.length > 3 && (
                      <span className="text-[10px] text-center" style={{ color: "rgba(244,239,226,0.3)" }}>+ {book.collaborators.length - 3} {t("hmMore")}</span>
                    )}
                  </div>
                </button>
              ))}
            </div>
          </section>
        )}

        </div>
        {/* ===== END SHARED SECTIONS WRAPPER ===== */}

        {/* ===== BOOK SERIES ===== */}
        {user && !isLoading && (
          <SeriesSection books={books} />
        )}

        {/* ===== HOW IT WORKS ===== */}
        <section className="bg-white overflow-hidden border-b border-[#f0f0f0]">

          {/* Section intro */}
          <div className="max-w-6xl mx-auto px-6 sm:px-8 pt-16 pb-8 text-center">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.7 }}
            >
              <p className="text-xs font-bold uppercase tracking-[0.22em] text-[#bbb] mb-4">{t("hiwEyebrow")}</p>
              <h2 className="text-4xl sm:text-5xl font-bold text-[#332a1b] leading-[1.1] mb-4">
                {t("hiwTitle1")}<br className="hidden sm:block" /> {t("hiwTitle2")}
              </h2>
              <p className="text-lg text-[#666] leading-[1.75] max-w-2xl mx-auto">
                {t("hiwSubtitle")}
              </p>
            </motion.div>
          </div>

          <div className="max-w-6xl mx-auto px-6 sm:px-8 pb-16">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

              {/* ── Card 1: Write ── */}
              <motion.div
                initial={{ opacity: 0, x: -60 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true, amount: 0.2 }}
                transition={{ duration: 0.65, ease: "easeOut" }}
                className="rounded-3xl p-8 flex flex-col gap-6"
                style={{ background: "#f7f7f7", border: "1px solid #ececec" }}
              >
                <div>
                  <div className="flex items-center gap-2.5 mb-4">
                    <div className="w-6 h-6 rounded-full bg-[#332a1b] flex items-center justify-center text-white text-[10px] font-bold">1</div>
                    <span className="text-[10px] font-bold uppercase tracking-[0.25em] text-[#aaa]">{t("hiwWriteTag")}</span>
                  </div>
                  <h3 className="text-2xl font-bold text-[#332a1b] leading-snug mb-2">{t("hiwWriteTitle")}</h3>
                  <p className="text-sm text-[#666] leading-relaxed">
                    {t("hiwWriteDesc")}
                  </p>
                </div>
                <div className="rounded-2xl overflow-hidden" style={{ border: "1px solid #e4e4e4", height: 320 }}>
                  <WritingAnimation />
                </div>
                <ul className="space-y-2">
                  {[t("hiwWriteLi1"), t("hiwWriteLi2"), t("hiwWriteLi3")].map(item => (
                    <li key={item} className="flex items-center gap-2.5 text-[#444] text-sm">
                      <span className="w-4 h-4 rounded-full bg-[#221b11]/5 border border-black/10 flex items-center justify-center flex-shrink-0">
                        <svg width="8" height="6" viewBox="0 0 10 8" fill="none"><path d="M1 4L3.5 6.5L9 1" stroke="#332a1b" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                      </span>
                      {item}
                    </li>
                  ))}
                </ul>
              </motion.div>

              {/* ── Card 2: Refine ── */}
              <motion.div
                initial={{ opacity: 0, x: 60 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true, amount: 0.2 }}
                transition={{ duration: 0.65, ease: "easeOut" }}
                className="rounded-3xl p-8 flex flex-col gap-6"
                style={{ background: "#f7f7f7", border: "1px solid #ececec" }}
              >
                <div>
                  <div className="flex items-center gap-2.5 mb-4">
                    <div className="w-6 h-6 rounded-full bg-[#332a1b] flex items-center justify-center text-white text-[10px] font-bold">2</div>
                    <span className="text-[10px] font-bold uppercase tracking-[0.25em] text-[#aaa]">{t("hiwRefineTag")}</span>
                  </div>
                  <h3 className="text-2xl font-bold text-[#332a1b] leading-snug mb-2">{t("hiwRefineTitle")}</h3>
                  <p className="text-sm text-[#666] leading-relaxed">
                    {t("hiwRefineDesc")}
                  </p>
                </div>
                <div className="rounded-2xl overflow-hidden" style={{ border: "1px solid #e4e4e4", height: 320 }}>
                  <AIAssistantAnimation />
                </div>
                <ul className="space-y-2">
                  {[t("hiwRefineLi1"), t("hiwRefineLi2"), t("hiwRefineLi3")].map(item => (
                    <li key={item} className="flex items-center gap-2.5 text-[#444] text-sm">
                      <span className="w-4 h-4 rounded-full bg-[#221b11]/5 border border-black/10 flex items-center justify-center flex-shrink-0">
                        <svg width="8" height="6" viewBox="0 0 10 8" fill="none"><path d="M1 4L3.5 6.5L9 1" stroke="#332a1b" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                      </span>
                      {item}
                    </li>
                  ))}
                </ul>
              </motion.div>

              {/* ── Card 3: Publish ── */}
              <motion.div
                initial={{ opacity: 0, x: -60 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true, amount: 0.2 }}
                transition={{ duration: 0.65, ease: "easeOut" }}
                className="rounded-3xl p-8 flex flex-col gap-6"
                style={{ background: "#f7f7f7", border: "1px solid #ececec" }}
              >
                <div>
                  <div className="flex items-center gap-2.5 mb-4">
                    <div className="w-6 h-6 rounded-full bg-[#332a1b] flex items-center justify-center text-white text-[10px] font-bold">3</div>
                    <span className="text-[10px] font-bold uppercase tracking-[0.25em] text-[#aaa]">{t("hiwPublishTag")}</span>
                  </div>
                  <h3 className="text-2xl font-bold text-[#332a1b] leading-snug mb-2">{t("hiwPublishTitle")}</h3>
                  <p className="text-sm text-[#666] leading-relaxed">
                    {t("hiwPublishDesc")}
                  </p>
                </div>
                <div className="rounded-2xl overflow-hidden" style={{ border: "1px solid #e4e4e4", height: 320 }}>
                  <MarketplaceMockup />
                </div>
                <ul className="space-y-2">
                  {[t("hiwPublishLi1"), t("hiwPublishLi2"), t("hiwPublishLi3")].map(item => (
                    <li key={item} className="flex items-center gap-2.5 text-[#444] text-sm">
                      <span className="w-4 h-4 rounded-full bg-[#221b11]/5 border border-black/10 flex items-center justify-center flex-shrink-0">
                        <svg width="8" height="6" viewBox="0 0 10 8" fill="none"><path d="M1 4L3.5 6.5L9 1" stroke="#332a1b" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                      </span>
                      {item}
                    </li>
                  ))}
                </ul>
              </motion.div>

              {/* ── Card 4: Audiobook ── */}
              <motion.div
                initial={{ opacity: 0, x: 60 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true, amount: 0.2 }}
                transition={{ duration: 0.65, ease: "easeOut" }}
                className="rounded-3xl p-8 flex flex-col gap-6"
                style={{ background: "#f7f7f7", border: "1px solid #ececec" }}
              >
                <div>
                  <div className="flex items-center gap-2.5 mb-4">
                    <div className="w-6 h-6 rounded-full bg-[#332a1b] flex items-center justify-center text-white text-[10px] font-bold">4</div>
                    <span className="text-[10px] font-bold uppercase tracking-[0.25em] text-[#aaa]">{t("hiwListenTag")}</span>
                  </div>
                  <h3 className="text-2xl font-bold text-[#332a1b] leading-snug mb-2">{t("hiwListenTitle")}</h3>
                  <p className="text-sm text-[#666] leading-relaxed">
                    {t("hiwListenDesc")}
                  </p>
                </div>
                <div className="rounded-2xl overflow-hidden" style={{ border: "1px solid #e4e4e4", height: 320 }}>
                  <AudiobookMockup />
                </div>
                <ul className="space-y-2">
                  {[t("hiwListenLi1"), t("hiwListenLi2"), t("hiwListenLi3")].map(item => (
                    <li key={item} className="flex items-center gap-2.5 text-[#444] text-sm">
                      <span className="w-4 h-4 rounded-full bg-[#221b11]/5 border border-black/10 flex items-center justify-center flex-shrink-0">
                        <svg width="8" height="6" viewBox="0 0 10 8" fill="none"><path d="M1 4L3.5 6.5L9 1" stroke="#332a1b" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                      </span>
                      {item}
                    </li>
                  ))}
                </ul>
              </motion.div>

            </div>
          </div>
        </section>

        {/* ===== DEVICES SHOWCASE ===== */}
        <DevicesShowcase onCtaClick={openCreateBook} />

        {/* ===== FREE COURSE VIDEO ===== */}
        <section
          aria-labelledby="course-section-heading"
          className="bg-gradient-to-b from-[#fafafa] to-white border-b border-[#f0f0f0] px-6 py-16 md:py-24"
        >
          <div className="max-w-7xl mx-auto">
            <div className="grid grid-cols-1 md:grid-cols-12 gap-8 md:gap-10 items-center">
              <div className="md:col-span-7 aspect-video rounded-2xl overflow-hidden ring-1 ring-black/5 shadow-[0_8px_24px_-8px_rgba(0,0,0,0.12),0_2px_4px_-2px_rgba(0,0,0,0.06)] relative">
                <video
                  src="/course-intro-video.mp4"
                  autoPlay
                  loop
                  muted
                  playsInline
                  className="w-full h-full object-cover"
                  preload="auto"
                >
                  Your browser does not support video playback.
                </video>
                <div className="absolute bottom-3 right-3 bg-[#221b11]/85 backdrop-blur-sm text-white text-[11px] font-medium px-3.5 py-1.5 rounded-full ring-1 ring-white/10 flex items-center gap-1.5">
                  <Sparkles className="w-3 h-3 text-amber-400" />
                  <span>{t("madeWithPlotzy")}</span>
                </div>
              </div>

              <div className="md:col-span-5">
                <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-[#888] mb-4">
                  {t("courseHomeEyebrow")}
                </p>
                <h2
                  id="course-section-heading"
                  className="text-3xl sm:text-4xl md:text-5xl font-bold text-[#332a1b] tracking-[-0.03em] leading-[1.1] mb-5"
                >
                  {t("courseHomeTitle")}
                </h2>
                <p className="text-base text-[#555] leading-relaxed mb-6">
                  {t("courseHomeBody")}
                </p>
                <ul className="space-y-3">
                  <li className="flex items-start gap-3 text-sm sm:text-base text-[#333]">
                    <CheckCircle className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" />
                    <span>{t("courseHomeFeature1")}</span>
                  </li>
                  <li className="flex items-start gap-3 text-sm sm:text-base text-[#333]">
                    <CheckCircle className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" />
                    <span>{t("courseHomeFeature2")}</span>
                  </li>
                  <li className="flex items-start gap-3 text-sm sm:text-base text-[#333]">
                    <CheckCircle className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" />
                    <span>{t("courseHomeFeature3")}</span>
                  </li>
                  <li className="flex items-start gap-3 text-sm sm:text-base text-[#333]">
                    <CheckCircle className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" />
                    <span>{t("courseHomeFeature4")}</span>
                  </li>
                </ul>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4 mt-12 md:mt-16">
              <div className="aspect-[16/10] rounded-2xl overflow-hidden ring-1 ring-black/5 shadow-[0_8px_24px_-8px_rgba(0,0,0,0.12),0_2px_4px_-2px_rgba(0,0,0,0.06)]">
                <img
                  src="/course-section-curriculum.webp"
                  alt="How to Write Your First Book, course curriculum"
                  className="w-full h-full object-cover"
                  loading="lazy"
                />
              </div>
              <div className="aspect-[16/10] rounded-2xl overflow-hidden ring-1 ring-black/5 shadow-[0_8px_24px_-8px_rgba(0,0,0,0.12),0_2px_4px_-2px_rgba(0,0,0,0.06)]">
                <img
                  src="/course-section-certificate.webp"
                  alt="Earn your verified completion certificate"
                  className="w-full h-full object-cover"
                  loading="lazy"
                />
              </div>
            </div>

            <div className="text-center mt-12 md:mt-14">
              <Button
                asChild
                size="lg"
                className="bg-[#332a1b] hover:bg-[#221b11] text-white px-8 py-6 text-base font-semibold rounded-full shadow-[0_4px_14px_rgba(0,0,0,0.15)] transition-all"
              >
                <Link href="/course" className="flex items-center gap-2">
                  {t("courseHomeCta")}
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </Button>
            </div>
          </div>
        </section>

        {/* ===== CARD STACK FEATURES ===== */}
        <div id="platform-features" style={{ background: "#221b11", padding: "80px 0 100px" }}>
          <div style={{ maxWidth: 860, margin: "0 auto", padding: "0 24px" }}>
            <div style={{ textAlign: "center", marginBottom: 60 }}>
              <p style={{
                fontSize: "0.7rem", fontWeight: 700, letterSpacing: "0.14em",
                color: "rgba(244,239,226,0.3)", textTransform: "uppercase",
                marginBottom: 16, fontFamily: '-apple-system,"SF Pro Display",sans-serif',
              }}>
                What Plotzy offers
              </p>
              <h2 style={{
                fontSize: "clamp(2rem,4vw,3.2rem)", fontWeight: 700,
                color: "#f7f2e4", letterSpacing: "-0.03em", lineHeight: 1.1,
                fontFamily: '-apple-system,"SF Pro Display",sans-serif',
              }}>
                {t("csHeading1")}<br />{t("csHeading2")}
              </h2>
            </div>

            <CardStack
              cardWidth={480}
              cardHeight={280}
              overlap={0.46}
              spreadDeg={40}
              autoAdvance
              intervalMs={3200}
              pauseOnHover
              items={[
                {
                  id: 1,
                  tag: t("cs1Tag"),
                  title: t("cs1Title"),
                  description: t("cs1Desc"),
                  accent: "linear-gradient(90deg,#f7f2e4 0%,#ccc 100%)",
                },
                {
                  id: 2,
                  tag: t("cs2Tag"),
                  title: t("cs2Title"),
                  description: t("cs2Desc"),
                  accent: "linear-gradient(90deg,#f7f2e4 0%,#ccc 100%)",
                },
                {
                  id: 3,
                  tag: t("cs3Tag"),
                  title: t("cs3Title"),
                  description: t("cs3Desc"),
                  accent: "linear-gradient(90deg,#f7f2e4 0%,#ccc 100%)",
                },
                {
                  id: 4,
                  tag: t("cs4Tag"),
                  title: t("cs4Title"),
                  description: t("cs4Desc"),
                  accent: "linear-gradient(90deg,#f7f2e4 0%,#ccc 100%)",
                },
                {
                  id: 5,
                  tag: t("cs5Tag"),
                  title: t("cs5Title"),
                  description: t("cs5Desc"),
                  accent: "linear-gradient(90deg,#f7f2e4 0%,#ccc 100%)",
                },
                {
                  id: 6,
                  tag: t("cs6Tag"),
                  title: t("cs6Title"),
                  description: t("cs6Desc"),
                  accent: "linear-gradient(90deg,#f7f2e4 0%,#ccc 100%)",
                },
              ]}
            />
          </div>
        </div>

        {/* ===== BOOK CAROUSEL ===== */}
        <BookCarousel />

        {/* ===== ARABIC (HINDAWI) BOOK CAROUSEL ===== */}
        <ArabicBookCarousel />

        {/* ===== AUDIO LIBRARY (LIBRIVOX) CAROUSEL ===== */}
        <AudioBookCarousel />

        {/* ===== CLASSIC COMICS (public domain, Internet Archive) ===== */}
        <ComicsShowcase />

        {/* ===== TESTIMONIALS WALL (social proof) ===== */}
        <TestimonialsDesktop />

        {/* ===== WRITER PROTECTION TEASER ===== */}
        <section className="relative bg-[#221b11] py-20 px-6 sm:px-8 overflow-hidden">
          <div className="max-w-6xl mx-auto">

            {/* Image LEFT + Text RIGHT */}
            <div className="protection-split" style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: 48,
              alignItems: "center",
              marginBottom: 48,
            }}>
              {/* LEFT: Image */}
              <div>
                <img
                  src={`${import.meta.env.BASE_URL}protection-hero.jpg`}
                  alt="A writer's desk showing how Plotzy protects creative work"
                  style={{
                    width: "100%",
                    height: "auto",
                    display: "block",
                    borderRadius: 16,
                    border: "1px solid rgba(244,239,226,0.06)",
                  }}
                />
              </div>

              {/* RIGHT: Text */}
              <div>
                <p style={{
                  fontSize: 12,
                  fontWeight: 600,
                  letterSpacing: "0.18em",
                  textTransform: "uppercase",
                  color: "rgba(244,239,226,0.4)",
                  marginBottom: 16,
                }}>
                  {t("wpEyebrow")}
                </p>
                <h2 style={{
                  fontSize: "clamp(1.7rem, 3.2vw, 2.6rem)",
                  fontWeight: 800,
                  color: "#f7f2e4",
                  lineHeight: 1.1,
                  letterSpacing: "-0.035em",
                  marginBottom: 16,
                }}>
                  {t("wpHeading")}
                </h2>
                <p style={{
                  fontSize: 16,
                  color: "rgba(244,239,226,0.5)",
                  lineHeight: 1.6,
                  marginBottom: 28,
                }}>
                  {t("wpSubtitle")}
                </p>
                <Link href="/protection">
                  <a style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 10,
                    padding: "14px 30px",
                    borderRadius: 999,
                    background: "rgba(244,239,226,0.06)",
                    border: "1px solid rgba(244,239,226,0.14)",
                    color: "#f7f2e4",
                    fontWeight: 600,
                    fontSize: 14,
                    textDecoration: "none",
                    transition: "all 0.25s",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = "rgba(244,239,226,0.12)";
                    e.currentTarget.style.borderColor = "rgba(244,239,226,0.25)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = "rgba(244,239,226,0.06)";
                    e.currentTarget.style.borderColor = "rgba(244,239,226,0.14)";
                  }}
                  >
                    {t("wpCta")}
                    <ChevronRight className="w-4 h-4 opacity-70" />
                  </a>
                </Link>
              </div>
            </div>

            {/* 4 pillar cards below the split */}
            <div style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
              gap: 16,
            }}>
              {[
                { title: t("wpP1T"), desc: t("wpP1D") },
                { title: t("wpP2T"), desc: t("wpP2D") },
                { title: t("wpP3T"), desc: t("wpP3D") },
                { title: t("wpP4T"), desc: t("wpP4D") },
              ].map((item, i) => (
                <div key={i} style={{
                  background: "rgba(244,239,226,0.025)",
                  border: "1px solid rgba(244,239,226,0.07)",
                  borderRadius: 16,
                  padding: "22px 20px",
                  textAlign: "left",
                }}>
                  <h3 style={{
                    fontSize: 15,
                    fontWeight: 700,
                    color: "#f7f2e4",
                    marginBottom: 6,
                    letterSpacing: "-0.005em",
                  }}>
                    {item.title}
                  </h3>
                  <p style={{
                    fontSize: 13,
                    color: "rgba(244,239,226,0.55)",
                    lineHeight: 1.55,
                    margin: 0,
                  }}>
                    {item.desc}
                  </p>
                </div>
              ))}
            </div>
          </div>

          <style>{`
            @media (max-width: 768px) {
              .protection-split {
                grid-template-columns: 1fr !important;
                gap: 28px !important;
              }
            }
          `}</style>
        </section>

        {/* ===== CTA SECTION ===== */}
        <section className="relative bg-[#221b11] text-center py-10 px-6 sm:px-8 overflow-hidden">

          {/* Corner dots */}
          <div className="absolute top-8 left-8 w-1 h-1 rounded-full bg-white/10" />
          <div className="absolute top-8 right-8 w-1 h-1 rounded-full bg-white/10" />
          <div className="absolute bottom-8 left-8 w-1 h-1 rounded-full bg-white/10" />
          <div className="absolute bottom-8 right-8 w-1 h-1 rounded-full bg-white/10" />

          <div className="max-w-3xl mx-auto relative">
            <TextShimmer
              as="h2"
              duration={3}
              spread={3}
              className="text-[clamp(2rem,4.5vw,3.2rem)] font-bold mb-5 leading-[1.1] block text-white"
            >
              {t("lcTitle")}
            </TextShimmer>

            <p className="text-base font-light mb-10 leading-[1.8] max-w-xl mx-auto" style={{ color: 'rgba(244,239,226,0.42)' }}>
              {t("lcBody1")}<br />{t("lcBody2")}
            </p>

            <div className="flex flex-wrap items-center justify-center gap-4">
              <button
                onClick={openCreateBook}
                className="group inline-flex items-center gap-2.5 px-8 py-3 rounded-full font-bold text-sm tracking-wide transition-all duration-300 hover:scale-[1.04] active:scale-[0.97]"
                style={{ background: '#EFEFEF', boxShadow: '0 4px 24px rgba(0,0,0,0.5)', color: '#332a1b' }}
              >
                {t("lcBeginJourney")}
              </button>
              <button
                onClick={scrollToFeatures}
                className="inline-flex items-center gap-2 px-8 py-3 rounded-full font-semibold text-sm tracking-wide border transition-all duration-300 hover:border-white/30 hover:bg-white/[0.06] hover:scale-[1.03] active:scale-[0.97]"
                style={{ color: 'rgba(244,239,226,0.55)', borderColor: 'rgba(244,239,226,0.12)', background: 'rgba(244,239,226,0.03)' }}
              >
                {t("lcViewFeatures")}
                <ChevronDown className="w-3.5 h-3.5 opacity-60" />
              </button>
            </div>
          </div>

          <style>{`
            @keyframes ctaGlowPulse {
              0%, 100% { opacity: 1; transform: scale(1); }
              50% { opacity: 0.6; transform: scale(1.08); }
            }
          `}</style>
        </section>

      {/* ── Join a Book Modal ── */}
      {showJoinModal && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.65)" }}
          onClick={e => { if (e.target === e.currentTarget) setShowJoinModal(false); }}>
          <div className="w-full max-w-sm rounded-2xl p-6" style={{ background: "#332a1b", border: "1px solid rgba(244,239,226,0.1)" }}
            onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-lg font-bold flex items-center gap-2" style={{ color: "#f7f2e4" }}>
                <Users className="w-5 h-5" /> {t("hmJoinABook")}
              </h3>
              <button onClick={() => setShowJoinModal(false)} className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ color: "rgba(244,239,226,0.4)" }}>✕</button>
            </div>
            <p className="text-sm mb-4" style={{ color: "rgba(244,239,226,0.4)" }}>
              {t("hmJoinDesc")}
            </p>
            <input
              autoFocus value={joinCode} onChange={e => { setJoinCode(e.target.value.toUpperCase()); setJoinError(""); }}
              placeholder="PLOT-XXXXXX"
              className="w-full text-center text-xl font-mono font-bold tracking-[0.2em] py-3 rounded-xl mb-3 outline-none"
              style={{ background: "rgba(244,239,226,0.04)", border: "1px solid rgba(244,239,226,0.1)", color: "#f7f2e4", letterSpacing: "0.15em" }}
              onKeyDown={e => { if (e.key === "Enter" && joinCode.trim()) document.getElementById("join-btn")?.click(); }}
            />
            {joinError && <p className="text-xs mb-3" style={{ color: "#f87171" }}>{joinError}</p>}
            <button id="join-btn" disabled={!joinCode.trim() || joinLoading}
              onClick={async () => {
                setJoinLoading(true); setJoinError("");
                try {
                  const res = await fetch("/api/books/join", { method: "POST", headers: { "Content-Type": "application/json" }, credentials: "include", body: JSON.stringify({ code: joinCode.trim() }) });
                  const data = await res.json();
                  if (data.success) { setShowJoinModal(false); window.location.href = `/books/${data.bookId}`; }
                  else setJoinError(data.message || t("hmInvalidCode"));
                } catch { setJoinError(t("hmConnError")); }
                finally { setJoinLoading(false); }
              }}
              className="w-full py-3 rounded-xl text-sm font-semibold transition-all"
              style={{ background: joinCode.trim() ? "#f7f2e4" : "rgba(244,239,226,0.06)", color: joinCode.trim() ? "#221b11" : "rgba(244,239,226,0.3)", opacity: joinLoading ? 0.5 : 1 }}>
              {joinLoading ? t("hmJoining") : t("hmJoinBook")}
            </button>
          </div>
        </div>
      )}

      {/* ── Global responsive overrides ── */}
      <style>{`
        @media (max-width: 768px) {
          /* Hero section */
          .home-hero-title { font-size: clamp(2rem, 8vw, 3.5rem) !important; }
          .home-hero-subtitle { font-size: 14px !important; padding: 0 16px !important; }
          .home-hero-buttons { flex-direction: column !important; gap: 10px !important; width: 100% !important; padding: 0 20px !important; }
          .home-hero-buttons button, .home-hero-buttons a { width: 100% !important; justify-content: center !important; }

          /* Feature cards grid */
          #platform-features > div { padding: 0 16px !important; }
          #platform-features .grid { grid-template-columns: 1fr !important; }

          /* Stats section */
          .home-stats-grid { grid-template-columns: repeat(2, 1fr) !important; gap: 16px !important; }

          /* CTA section */
          .home-cta-title { font-size: clamp(1.5rem, 6vw, 2.5rem) !important; }
          .home-cta-buttons { flex-direction: column !important; gap: 10px !important; width: 100% !important; padding: 0 20px !important; }
          .home-cta-buttons button, .home-cta-buttons a { width: 100% !important; }

          /* Book cards */
          .home-book-grid { grid-template-columns: repeat(auto-fill, minmax(140px, 1fr)) !important; }

          /* General containers */
          .home-section-container { padding-left: 16px !important; padding-right: 16px !important; }

          /* Shared books row */
          .home-shared-books { flex-wrap: wrap !important; }
        }

        @media (max-width: 480px) {
          .home-stats-grid { grid-template-columns: 1fr !important; }
          .home-book-grid { grid-template-columns: repeat(2, 1fr) !important; }
        }
      `}</style>

      </Layout>

      <BookCreationWizard open={showWizard} onClose={() => setShowWizard(false)} onCreate={handleCreateFromWizard} />
      <AuthModal open={showAuthModal} onClose={() => setShowAuthModal(false)} />
    </>
  );
}
