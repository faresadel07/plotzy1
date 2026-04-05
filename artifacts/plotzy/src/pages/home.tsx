import { useState, useCallback, useEffect, useRef } from "react";
import { Link, useLocation } from "wouter";
import { Layout } from "@/components/layout";
import { AuthModal } from "@/components/auth-modal";
import { FeatureVideo } from "@/components/FeatureVideo";
import { WritingAnimation } from "@/components/WritingAnimation";
import { AIAssistantAnimation } from "@/components/AIAssistantAnimation";
import { MarketplaceMockup } from "@/components/MarketplaceMockup";
import { AudiobookMockup } from "@/components/AudiobookMockup";
import { AnimatedFolder } from "@/components/ui/3d-folder";
import { CardStack } from "@/components/ui/card-stack";
import { BookCarousel } from "@/components/BookCarousel";
import { LibraryBookshelf, type ShelfBookData } from "@/components/LibraryBookshelf";
import { BookViewerOverlay } from "@/components/BookViewerOverlay";
import { useBooks, useCreateBook, useGenerateCover, useTrashBook, useDuplicateBook, useUpdateBook } from "@/hooks/use-books";
import { OnboardingWizard } from "@/components/onboarding-wizard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { ContentTypeSelector } from "@/components/ContentTypeSelector";
import { BookOpen, Loader2, Sparkles, Library, Zap, ChevronDown, CheckCircle, PenLine, Grid, Activity, Shield, Globe, FileText, Plus, Trash2 } from "lucide-react";
import { ContainerScroll } from "@/components/ui/container-scroll-animation";
import { HeroMockup } from "@/components/HeroMockup";
import { format } from "date-fns";
import { motion, useMotionValue, useTransform, useSpring, AnimatePresence, useScroll, useInView } from "framer-motion";
import { useLanguage } from "@/contexts/language-context";
import { useAuth } from "@/contexts/auth-context";
import { BOOK_LANGUAGES } from "@/lib/i18n";
import { useToast } from "@/hooks/use-toast";
import { LandingCanvas } from "@/components/landing/LandingCanvas";
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
        letterSpacing: "-0.04em", color: "#111", lineHeight: 1,
      }}>
        {count.toLocaleString()}{suffix}
      </div>
      <div style={{
        fontFamily: "-apple-system,'SF Pro Display',sans-serif",
        fontSize: "0.78rem", fontWeight: 500,
        color: "#888", marginTop: 8, letterSpacing: "0.01em",
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

function BookPages() {
  const [paraIdx, setParaIdx] = useState(0);
  const [typed, setTyped]     = useState("");
  const [charIdx, setCharIdx] = useState(0);
  const SPEED = 14;
  const TYPED_OFFSET = 2;
  const TYPED_COUNT  = RIGHT_PARAGRAPHS.length - TYPED_OFFSET;

  useEffect(() => { setTyped(""); setCharIdx(0); }, [paraIdx]);
  useEffect(() => {
    const para = RIGHT_PARAGRAPHS[TYPED_OFFSET + paraIdx];
    if (charIdx >= para.length) {
      const t = setTimeout(() => setParaIdx(i => (i + 1) % TYPED_COUNT), 2600);
      return () => clearTimeout(t);
    }
    const t = setTimeout(() => { setTyped(para.slice(0, charIdx + 1)); setCharIdx(c => c + 1); }, SPEED);
    return () => clearTimeout(t);
  }, [charIdx, paraIdx]);

  const page: React.CSSProperties = {
    flex: 1, height: "100%",
    background: `linear-gradient(180deg, ${PAGE_BG} 0%, #EDE5CC 100%)`,
    position: "relative", overflow: "hidden",
    display: "flex", flexDirection: "column",
    padding: "20px 56px 42px", boxSizing: "border-box",
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
    fontSize: "1.32rem",
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
    fontSize: "0.82rem",
    lineHeight: 1.9,
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

  /* page number with em-dash decoration */
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
        <p style={runHeader}>Plotzy · The Writer's Platform</p>

        <p style={chapterNum}>Chapter 1</p>
        <h2 style={chapterHeading}>An Introduction to Plotzy</h2>

        <div style={{ flex: 1, overflow: "hidden", marginTop: 18 }}>
          {LEFT_PARAGRAPHS.map((p, i) => {
            if (i === 0) {
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
          <span style={pageNumDash}>—</span>
          <span style={pageNumText}>5</span>
          <span style={pageNumDash}>—</span>
        </div>
      </div>


      {/* ── RIGHT PAGE ── */}
      <div style={{ ...page, boxShadow: rightPageShadow }}>
        <p style={runHeader}>Plotzy · The Writer's Platform</p>

        <div style={{ flex: 1, overflow: "hidden" }}>
          {RIGHT_PARAGRAPHS.slice(0, TYPED_OFFSET).map((p, i) => (
            <p key={i} style={para}>{p}</p>
          ))}
          <p style={para}>
            {typed}
            <motion.span
              animate={{ opacity: [1, 0] }}
              transition={{ duration: 0.55, repeat: Infinity }}
              style={{ display: "inline-block", width: 1.5, height: "0.78em", background: PAGE_TEXT, marginLeft: 1, verticalAlign: "middle" }}
            />
          </p>
        </div>

        {/* Page number */}
        <div style={pageNumRow}>
          <span style={pageNumDash}>—</span>
          <span style={pageNumText}>6</span>
          <span style={pageNumDash}>—</span>
        </div>
      </div>

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
  const [summary, setSummary] = useState("");
  const [authorName, setAuthorName] = useState("");
  const [bookLang, setBookLang] = useState(lang);
  const [selectedShelfBook, setSelectedShelfBook] = useState<ShelfBookData | null>(null);
  const [confirmTrashId, setConfirmTrashId] = useState<number | null>(null);
  const [renamingId, setRenamingId] = useState<number | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const { toast } = useToast();

  const commitRename = (e: React.MouseEvent | React.FormEvent, id: number) => {
    e.preventDefault(); e.stopPropagation();
    const v = renameValue.trim();
    if (v && v !== "") {
      updateBook.mutate({ id, title: v }, {
        onSuccess: () => { toast({ title: "Renamed successfully" }); setRenamingId(null); },
        onError: () => toast({ title: "Rename failed", variant: "destructive" }),
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

  const handleCreateWizardBook = async (data: { title: string; summary: string; authorName: string; genre: string; protagonist: string }) => {
    try {
      const newBook = await createBook.mutateAsync({
        title: data.title,
        summary: data.summary,
        authorName: data.authorName,
        language: lang,
      });

      if (data.protagonist) {
        generateCover.mutate({ id: newBook.id, prompt: `A ${data.genre} book cover featuring ${data.protagonist}` });
      }

      setLocation(`/books/${newBook.id}`);
    } catch (err: any) {
      toast({ variant: "destructive", title: "Failed to create book", description: err?.message || String(err) });
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
      toast({ variant: "destructive", title: "Could not create book", description: err?.message || String(err) });
    }
  };

  const handleSelectorCreateBook = async (data: { title: string; summary: string; authorName: string; language: string; genre?: string }) => {
    const newBook = await createBook.mutateAsync({ ...data, contentType: "book" } as any);
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
    } as any);
    setIsOpen(false);
    setLocation(`/articles/${newArticle.id}`);
  };

  const { user } = useAuth();
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

  const { scrollYProgress } = useScroll();
  const progressScaleX = useSpring(scrollYProgress, { stiffness: 200, damping: 30, restDelta: 0.001 });

  return (
    <>
      {/* ── Scroll Progress Bar ── */}
      <motion.div
        style={{
          position: "fixed", top: 0, left: 0, right: 0, height: 2, zIndex: 99999,
          background: "linear-gradient(90deg, #a78bfa, #818cf8)",
          transformOrigin: "0%",
          scaleX: progressScaleX,
        }}
      />

      <BookViewerOverlay isOpen={!!selectedShelfBook} onClose={() => setSelectedShelfBook(null)} bookData={selectedShelfBook} />

      <ConfirmModal
        isOpen={confirmTrashId !== null}
        onClose={() => setConfirmTrashId(null)}
        onConfirm={() => { if (confirmTrashId !== null) trashBook.mutate(confirmTrashId); }}
        title="Move to Recycle Bin"
        message="This project will be moved to the Recycle Bin. You can restore it at any time."
        confirmLabel="Move to Trash"
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
      />

      {/* 
        Pass isLanding=true so Layout removes margins 
        and allows Edge-to-Edge hero canvas 
      */}
      <Layout isLanding>

        {/* ===== HERO SECTION — ContainerScroll 3D ===== */}
        <div className="bg-[#080808]">
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
                    color: "rgba(255,255,255,0.88)",
                    margin: 0,
                    textAlign: "center",
                  }}
                >
                  write your first book with
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
              style={{ textAlign: "center", fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Display", "SF Pro Text", sans-serif', fontSize: "clamp(1.4rem, 2.4vw, 2rem)", fontWeight: 400, letterSpacing: "-0.02em", color: "#ffffff", marginBottom: 56, lineHeight: 1.3 }}
            >
              The world's first platform built to help you write your first book, even if you've never written a word before.
            </motion.p>
            <div style={{ display: "flex", justifyContent: "center", gap: 0 }}>
              {[
                {
                  title: "Write & Refine",
                  subtitle: "3 features · hover to explore",
                  cards: [
                    { id: "w1", icon: "✦", headline: "The world's first platform of its kind", sub: "Plotzy is uniquely built for authors — a distraction-free editor that combines manuscript management, AI tools, and publishing all in one workspace." },
                    { id: "w2", icon: "📖", headline: "A proven guide to start writing", sub: "Crafted with real authors, our step-by-step writing guide helps you outline, draft, and refine your story from first chapter to last." },
                    { id: "w3", icon: "🤖", headline: "AI Writing Assistant that knows your story", sub: "Plotzy's AI reads your entire manuscript and suggests continuations, rewrites, and ideas that match your unique voice — not just the current paragraph." },
                  ],
                },
                {
                  title: "Publish & Distribute",
                  subtitle: "3 features · hover to explore",
                  cards: [
                    { id: "p1", icon: "🚀", headline: "An AI-powered marketplace that perfects your book", sub: "From developmental editing to cover design and blurb writing — 9 AI services available on demand, each completed in minutes with no waitlists." },
                    { id: "p2", icon: "🌍", headline: "From your first word to your cover", sub: "Generate professional AI book covers, format your manuscript for every platform, and distribute to every major digital and print retailer with one click." },
                    { id: "p3", icon: "📊", headline: "World Publish — distribute everywhere", sub: "Your manuscript reaches every major platform while Plotzy handles formatting, rights management, and royalty tracking automatically." },
                  ],
                },
                {
                  title: "Listen & Discover",
                  subtitle: "3 features · hover to explore",
                  cards: [
                    { id: "l1", icon: "🎙️", headline: "AI Audiobook Studio — 10 distinct voices", sub: "With one click, Plotzy's AI narrates your entire book in your chosen voice. Preview each chapter, adjust quality, and export HD audio instantly." },
                    { id: "l2", icon: "🌐", headline: "A powerful community of readers", sub: "Connect with readers who rate, review, and elevate your book. Build a following before your book is even finished." },
                    { id: "l3", icon: "📚", headline: "Access hundreds of thousands of free books", sub: "Browse a vast library of free books across every genre to spark your creativity, study the craft, and find your writing style." },
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
                    Welcome back
                  </p>
                  <h1 className="text-3xl sm:text-4xl font-bold text-white leading-tight">
                    Hello, <span className="text-white">{firstName}!</span>
                  </h1>
                </motion.div>
              )}

              {/* Library Header */}
              <div id="workspace" className="flex items-center justify-between gap-4 mb-10">
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-white/25 mb-1.5">Workspace</p>
                  <h2 className="text-2xl font-bold text-white tracking-tight leading-none">Your Projects</h2>
                </div>
                <div className="flex items-center gap-3">
                  {books && books.length > 0 && (
                    <span className="text-[11px] font-semibold text-white/20 uppercase tracking-widest hidden sm:block">
                      {books.length} {books.length === 1 ? "Project" : "Projects"}
                    </span>
                  )}
                  <Link href="/trash">
                    <button
                      className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium transition-all duration-200 hover:scale-[1.03] active:scale-[0.97]"
                      style={{ background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.45)', border: '1px solid rgba(255,255,255,0.08)' }}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      Trash
                    </button>
                  </Link>
                  {user && (
                    <button
                      onClick={() => setIsOpen(true)}
                      className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold tracking-wide transition-all duration-200 hover:scale-[1.03] active:scale-[0.97]"
                      style={{ background: '#ffffff', color: '#111111' }}
                    >
                      <Plus className="w-3.5 h-3.5" />
                      New Project
                    </button>
                  )}
                </div>
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
                      border: '1.5px dashed rgba(255,255,255,0.1)',
                      background: 'rgba(255,255,255,0.015)',
                      transition: 'border-color 0.25s, background 0.25s, box-shadow 0.25s',
                    }}
                    whileHover={{
                      borderColor: 'rgba(255,255,255,0.22)',
                      background: 'rgba(255,255,255,0.04)',
                      boxShadow: '0 0 40px rgba(255,255,255,0.04)',
                    }}
                  >
                    <motion.div
                      className="flex items-center justify-center rounded-full mb-3"
                      style={{
                        width: 40,
                        height: 40,
                        border: '1.5px solid rgba(255,255,255,0.15)',
                      }}
                      whileHover={{ scale: 1.15, borderColor: 'rgba(255,255,255,0.4)' }}
                      whileTap={{ scale: 0.9 }}
                    >
                      <Plus className="w-4 h-4 text-white/40 group-hover:text-white/70 transition-colors duration-200" />
                    </motion.div>
                    <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-white/25 group-hover:text-white/50 transition-colors duration-200">
                      New Project
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
                        Trash
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
                    style={{ aspectRatio: '2/3', background: 'rgba(255,255,255,0.02)', borderColor: 'rgba(255,255,255,0.12)' }}
                    onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.borderColor = 'rgba(255,255,255,0.25)'; (e.currentTarget as HTMLDivElement).style.background = 'rgba(255,255,255,0.04)'; }}
                    onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.borderColor = 'rgba(255,255,255,0.12)'; (e.currentTarget as HTMLDivElement).style.background = 'rgba(255,255,255,0.02)'; }}
                  >
                    <div className="w-9 h-9 rounded-full border border-white/15 flex items-center justify-center group-hover:border-white/30 transition-colors">
                      <Plus className="w-4 h-4 text-white/30 group-hover:text-white/60 transition-colors" />
                    </div>
                    <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-white/20 group-hover:text-white/40 transition-colors">New Project</p>
                  </div>
                  <div className="mt-2.5 px-0.5 h-7" />
                </motion.div>

                {books.map((book, bookIndex) => {
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
                          <Link href={isArticle ? `/articles/${book.id}` : `/books/${book.id}`} className="block outline-none focus:outline-none">

                            {isArticle ? (
                              /* ── Blog / Article Card ── */
                              <div
                                className="group relative w-full overflow-hidden transition-all duration-300 ease-out"
                                style={{
                                  aspectRatio: '2/3',
                                  borderRadius: 10,
                                  background: 'linear-gradient(160deg, #1c1c28 0%, #141420 60%, #0f0f1a 100%)',
                                  border: '1px solid rgba(255,255,255,0.08)',
                                  boxShadow: '0 4px 20px rgba(0,0,0,0.4), 0 1px 3px rgba(0,0,0,0.3)',
                                }}
                              >
                                {/* Colored accent bar at top */}
                                <div
                                  style={{
                                    position: 'absolute', top: 0, left: 0, right: 0, height: 4,
                                    background: coverPalette.accent,
                                    borderRadius: '10px 10px 0 0',
                                    opacity: 0.85,
                                  }}
                                />

                                {/* Cover image if set */}
                                {book.coverImage && (
                                  <div style={{ position: 'absolute', inset: 0, zIndex: 0 }}>
                                    <img src={book.coverImage} alt={book.title} style={{ width: '100%', height: '100%', objectFit: 'cover', opacity: 0.18 }} />
                                    <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(160deg, #1c1c28cc 0%, #0f0f1aee 100%)' }} />
                                  </div>
                                )}

                                {/* Paper lines decoration */}
                                <div style={{ position: 'absolute', top: 44, left: 14, right: 14, zIndex: 1 }}>
                                  {[0,1,2,3,4,5].map(i => (
                                    <div key={i} style={{ height: 1, background: 'rgba(255,255,255,0.045)', marginBottom: 10, borderRadius: 1, width: i === 5 ? '55%' : '100%' }} />
                                  ))}
                                </div>

                                {/* Main content */}
                                <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', padding: '16px 14px 14px', zIndex: 2 }}>
                                  {/* BLOG badge + date */}
                                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                                    <span style={{
                                      fontSize: 8, fontWeight: 700, letterSpacing: '0.18em',
                                      textTransform: 'uppercase', color: coverPalette.accent,
                                      background: `${coverPalette.accent}22`,
                                      border: `1px solid ${coverPalette.accent}55`,
                                      borderRadius: 4, padding: '2px 6px',
                                    }}>
                                      Blog
                                    </span>
                                    {langInfo && langInfo.code !== 'en' && (
                                      <span style={{ fontSize: 8, color: 'rgba(255,255,255,0.3)', fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase' }}>
                                        {langInfo.nativeName.slice(0, 3)}
                                      </span>
                                    )}
                                  </div>

                                  {/* Article icon */}
                                  <div style={{ marginBottom: 8 }}>
                                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" style={{ opacity: 0.25 }}>
                                      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                                      <polyline points="14 2 14 8 20 8" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                                      <line x1="16" y1="13" x2="8" y2="13" stroke="white" strokeWidth="1.5" strokeLinecap="round"/>
                                      <line x1="16" y1="17" x2="8" y2="17" stroke="white" strokeWidth="1.5" strokeLinecap="round"/>
                                    </svg>
                                  </div>

                                  {/* Title */}
                                  <h3 style={{
                                    fontSize: titleFontSize, fontWeight: 700, color: 'rgba(255,255,255,0.9)',
                                    lineHeight: 1.35, display: '-webkit-box', WebkitLineClamp: 4,
                                    WebkitBoxOrient: 'vertical', overflow: 'hidden',
                                    fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Display', sans-serif",
                                    marginBottom: 8, flex: 1,
                                  }}>
                                    {book.title}
                                  </h3>

                                  {/* Category */}
                                  {book.articleCategory && (
                                    <div style={{ fontSize: 8, color: 'rgba(255,255,255,0.35)', letterSpacing: '0.14em', textTransform: 'uppercase', fontWeight: 600, marginBottom: 10 }}>
                                      {book.articleCategory}
                                    </div>
                                  )}

                                  {/* Bottom simulated lines */}
                                  <div style={{ marginTop: 'auto' }}>
                                    {[100, 88, 72].map((w, i) => (
                                      <div key={i} style={{ height: 2, background: 'rgba(255,255,255,0.08)', borderRadius: 2, marginBottom: 5, width: `${w}%` }} />
                                    ))}
                                  </div>
                                </div>

                                {/* Hover overlay — stopPropagation on the whole div so clicks never reach the <Link> */}
                                <div
                                  className={`absolute inset-0 z-10 flex flex-col items-center justify-center gap-2 transition-all duration-300 ${renamingId === book.id ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}
                                  style={{ background: 'rgba(10,10,20,0.78)', backdropFilter: 'blur(8px)', borderRadius: 10 }}
                                  onClick={(e) => { e.preventDefault(); e.stopPropagation(); }}
                                >
                                  {renamingId === book.id ? (
                                    /* ── Rename form ── */
                                    <form onSubmit={(e) => commitRename(e, book.id)} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, padding: '0 14px', width: '100%' }}>
                                      <span style={{ fontSize: 8, fontWeight: 700, letterSpacing: '0.2em', color: 'rgba(255,255,255,0.45)', textTransform: 'uppercase' }}>Rename</span>
                                      <input
                                        autoFocus
                                        value={renameValue}
                                        onChange={e => setRenameValue(e.target.value)}
                                        onKeyDown={e => { if (e.key === 'Escape') { setRenamingId(null); } }}
                                        style={{
                                          width: '100%', padding: '6px 10px', borderRadius: 8, fontSize: 12, textAlign: 'center',
                                          background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)',
                                          color: '#fff', outline: 'none', fontFamily: 'inherit',
                                        }}
                                        maxLength={120}
                                      />
                                      <div style={{ display: 'flex', gap: 6 }}>
                                        <button type="submit" disabled={updateBook.isPending}
                                          className="text-white text-[8px] font-semibold tracking-[0.2em] uppercase px-3 py-1.5 rounded-full border border-white/20 bg-white/10 hover:bg-white/20 transition-colors disabled:opacity-40">
                                          {updateBook.isPending ? '…' : 'Save'}
                                        </button>
                                        <button type="button" onClick={() => setRenamingId(null)}
                                          className="text-white/50 text-[8px] font-semibold tracking-[0.2em] uppercase px-3 py-1.5 rounded-full border border-white/10 bg-transparent hover:bg-white/10 transition-colors">
                                          Cancel
                                        </button>
                                      </div>
                                    </form>
                                  ) : (
                                    /* ── Normal action buttons ── */
                                    <>
                                      <button
                                        onClick={() => setLocation(isArticle ? `/articles/${book.id}` : `/books/${book.id}`)}
                                        className="text-white text-[9px] font-semibold tracking-[0.2em] uppercase px-4 py-2 rounded-full border border-white/20 bg-white/10 hover:bg-white/20 transition-all translate-y-2 group-hover:translate-y-0 duration-300"
                                      >
                                        Continue Writing
                                      </button>
                                      <button
                                        onClick={() => duplicateBook.mutate(book.id)}
                                        disabled={duplicateBook.isPending}
                                        className="text-white/60 text-[8px] font-semibold tracking-[0.2em] uppercase px-3 py-1.5 rounded-full border border-white/15 bg-white/8 hover:bg-white/15 transition-colors translate-y-2 group-hover:translate-y-0 duration-300 delay-[40ms] disabled:opacity-40"
                                      >
                                        {duplicateBook.isPending ? "Duplicating…" : "Duplicate"}
                                      </button>
                                      <button
                                        onClick={() => { setRenamingId(book.id); setRenameValue(book.title); }}
                                        className="text-white/60 text-[8px] font-semibold tracking-[0.2em] uppercase px-3 py-1.5 rounded-full border border-white/15 bg-white/8 hover:bg-white/15 transition-colors translate-y-2 group-hover:translate-y-0 duration-300 delay-[60ms]"
                                      >
                                        Rename
                                      </button>
                                      <button
                                        onClick={() => setConfirmTrashId(book.id)}
                                        className="text-red-300/75 text-[8px] font-semibold tracking-[0.2em] uppercase px-3 py-1.5 rounded-full border border-red-400/18 bg-red-500/8 hover:bg-red-500/20 transition-colors translate-y-2 group-hover:translate-y-0 duration-300 delay-75"
                                      >
                                        Delete
                                      </button>
                                    </>
                                  )}
                                </div>
                              </div>
                            ) : (
                              /* ── 3D Perspective Book ── */
                              <PerspectiveBook spineColor={book.spineColor || coverPalette.accent}>
                                {/* Animated shader background (no custom cover) */}
                                {!book.coverImage && (
                                  <div className="absolute inset-0">
                                    <BookCoverShader bookId={book.id} speed={0.5} />
                                  </div>
                                )}

                                {/* Cover image (if exists) */}
                                {book.coverImage && (
                                  <img
                                    src={book.coverImage}
                                    alt={book.title}
                                    className="absolute inset-0 w-full h-full object-cover object-center"
                                  />
                                )}

                                {/* Top-half lighting sheen */}
                                <div
                                  className="absolute top-0 inset-x-0 h-1/2 pointer-events-none z-20"
                                  style={{ background: 'linear-gradient(to bottom, rgba(255,255,255,0.04), transparent)' }}
                                />

                                {/* Bottom gradient + title block */}
                                <div
                                  className="absolute bottom-0 inset-x-0 p-3 flex flex-col justify-end z-20"
                                  style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.85) 0%, rgba(0,0,0,0.5) 55%, transparent 100%)' }}
                                >
                                  <h3
                                    className="text-white font-bold leading-tight line-clamp-2"
                                    style={{
                                      fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Display', 'Helvetica Neue', sans-serif",
                                      fontSize: titleFontSize,
                                      textShadow: '0 1px 8px rgba(0,0,0,0.7)',
                                    }}
                                  >
                                    {book.title}
                                  </h3>
                                  <div
                                    className="mt-0.5 tracking-[0.18em] uppercase"
                                    style={{ fontSize: '8px', color: 'rgba(255,255,255,0.35)' }}
                                  >
                                    {book.genre ? book.genre : 'Book'}
                                  </div>
                                </div>

                                {/* Lang badge */}
                                {langInfo && langInfo.code !== 'en' && (
                                  <div className="absolute top-2 left-2 z-30 bg-black/60 backdrop-blur-md text-white/65 rounded-md px-1.5 py-0.5 text-[8px] uppercase tracking-wider font-semibold border border-white/10">
                                    {langInfo.nativeName.slice(0, 3)}
                                  </div>
                                )}

                                {/* Hover overlay — stopPropagation on the whole div so clicks never reach the <Link> */}
                                <div
                                  className={`absolute inset-0 z-40 flex flex-col items-center justify-center gap-2 transition-all duration-300 ${renamingId === book.id ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}
                                  style={{ background: 'rgba(0,0,0,0.62)', backdropFilter: 'blur(8px)' }}
                                  onClick={(e) => { e.preventDefault(); e.stopPropagation(); }}
                                >
                                  {renamingId === book.id ? (
                                    /* ── Rename form ── */
                                    <form onSubmit={(e) => commitRename(e, book.id)} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, padding: '0 14px', width: '100%' }}>
                                      <span style={{ fontSize: 8, fontWeight: 700, letterSpacing: '0.2em', color: 'rgba(255,255,255,0.45)', textTransform: 'uppercase' }}>Rename</span>
                                      <input
                                        autoFocus
                                        value={renameValue}
                                        onChange={e => setRenameValue(e.target.value)}
                                        onKeyDown={e => { if (e.key === 'Escape') { setRenamingId(null); } }}
                                        style={{
                                          width: '100%', padding: '6px 10px', borderRadius: 8, fontSize: 12, textAlign: 'center',
                                          background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)',
                                          color: '#fff', outline: 'none', fontFamily: 'inherit',
                                        }}
                                        maxLength={120}
                                      />
                                      <div style={{ display: 'flex', gap: 6 }}>
                                        <button type="submit" disabled={updateBook.isPending}
                                          className="text-white text-[8px] font-semibold tracking-[0.2em] uppercase px-3 py-1.5 rounded-full border border-white/20 bg-white/10 hover:bg-white/20 transition-colors disabled:opacity-40">
                                          {updateBook.isPending ? '…' : 'Save'}
                                        </button>
                                        <button type="button" onClick={() => setRenamingId(null)}
                                          className="text-white/50 text-[8px] font-semibold tracking-[0.2em] uppercase px-3 py-1.5 rounded-full border border-white/10 bg-transparent hover:bg-white/10 transition-colors">
                                          Cancel
                                        </button>
                                      </div>
                                    </form>
                                  ) : (
                                    /* ── Normal action buttons ── */
                                    <>
                                      <button
                                        onClick={() => setLocation(`/books/${book.id}`)}
                                        className="text-white text-[9px] font-semibold tracking-[0.2em] uppercase px-4 py-2 rounded-full border border-white/20 bg-white/10 hover:bg-white/20 transition-all translate-y-2 group-hover:translate-y-0 duration-300"
                                      >
                                        Continue Writing
                                      </button>
                                      <button
                                        onClick={() => duplicateBook.mutate(book.id)}
                                        disabled={duplicateBook.isPending}
                                        className="text-white/60 text-[8px] font-semibold tracking-[0.2em] uppercase px-3 py-1.5 rounded-full border border-white/15 bg-white/8 hover:bg-white/15 transition-colors translate-y-2 group-hover:translate-y-0 duration-300 delay-[40ms] disabled:opacity-40"
                                      >
                                        {duplicateBook.isPending ? "Duplicating…" : "Duplicate"}
                                      </button>
                                      <button
                                        onClick={() => { setRenamingId(book.id); setRenameValue(book.title); }}
                                        className="text-white/60 text-[8px] font-semibold tracking-[0.2em] uppercase px-3 py-1.5 rounded-full border border-white/15 bg-white/8 hover:bg-white/15 transition-colors translate-y-2 group-hover:translate-y-0 duration-300 delay-[60ms]"
                                      >
                                        Rename
                                      </button>
                                      <button
                                        onClick={() => setConfirmTrashId(book.id)}
                                        className="text-red-300/75 text-[8px] font-semibold tracking-[0.2em] uppercase px-3 py-1.5 rounded-full border border-red-400/18 bg-red-500/8 hover:bg-red-500/20 transition-colors translate-y-2 group-hover:translate-y-0 duration-300 delay-75"
                                      >
                                        Delete
                                      </button>
                                    </>
                                  )}
                                </div>
                              </PerspectiveBook>
                            )}

                            {/* ── Label below card ── */}
                            <div className="mt-2.5 px-0.5">
                              <p className="text-[12px] font-semibold text-white/75 truncate leading-snug">{book.title}</p>
                              <p className="text-[10px] text-white/28 mt-0.5">
                                {book.createdAt ? format(new Date(book.createdAt), 'MMM d, yyyy') : ''}
                              </p>
                            </div>
                          </Link>
                        </motion.div>
                      );
                    })}
              </div>
              )}
            </div>
          </section>
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
              <p className="text-xs font-bold uppercase tracking-[0.22em] text-[#bbb] mb-4">How it works</p>
              <h2 className="text-4xl sm:text-5xl font-bold text-[#111] leading-[1.1] mb-4">
                The first platform built<br className="hidden sm:block" /> for the full author journey
              </h2>
              <p className="text-lg text-[#666] leading-[1.75] max-w-2xl mx-auto">
                From your first idea to a published, distributed book, every step is covered in one unified workspace.
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
                    <div className="w-6 h-6 rounded-full bg-[#111] flex items-center justify-center text-white text-[10px] font-bold">1</div>
                    <span className="text-[10px] font-bold uppercase tracking-[0.25em] text-[#aaa]">Write</span>
                  </div>
                  <h3 className="text-2xl font-bold text-[#111] leading-snug mb-2">Write your story, your way</h3>
                  <p className="text-sm text-[#666] leading-relaxed">
                    A distraction-free editor for serious authors. Outline chapters, structure your plot, and write in Arabic or English with full RTL support.
                  </p>
                </div>
                <div className="rounded-2xl overflow-hidden" style={{ border: "1px solid #e4e4e4" }}>
                  <WritingAnimation />
                </div>
                <ul className="space-y-2">
                  {['Chapter-by-chapter with drag-to-reorder', 'Auto-save & version history', 'Ghost text AI as you type'].map(item => (
                    <li key={item} className="flex items-center gap-2.5 text-[#444] text-sm">
                      <span className="w-4 h-4 rounded-full bg-black/5 border border-black/10 flex items-center justify-center flex-shrink-0">
                        <svg width="8" height="6" viewBox="0 0 10 8" fill="none"><path d="M1 4L3.5 6.5L9 1" stroke="#111" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
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
                    <div className="w-6 h-6 rounded-full bg-[#111] flex items-center justify-center text-white text-[10px] font-bold">2</div>
                    <span className="text-[10px] font-bold uppercase tracking-[0.25em] text-[#aaa]">Refine</span>
                  </div>
                  <h3 className="text-2xl font-bold text-[#111] leading-snug mb-2">AI that knows your story</h3>
                  <p className="text-sm text-[#666] leading-relaxed">
                    Plotzy's AI reads your entire manuscript and suggests continuations, rewrites, and ideas that match your unique voice.
                  </p>
                </div>
                <div className="rounded-2xl overflow-hidden" style={{ border: "1px solid #e4e4e4" }}>
                  <AIAssistantAnimation />
                </div>
                <ul className="space-y-2">
                  {['Context from all chapters, not just the current one', 'Plot hole detection & pacing analysis', 'Dialogue coaching & voice consistency'].map(item => (
                    <li key={item} className="flex items-center gap-2.5 text-[#444] text-sm">
                      <span className="w-4 h-4 rounded-full bg-black/5 border border-black/10 flex items-center justify-center flex-shrink-0">
                        <svg width="8" height="6" viewBox="0 0 10 8" fill="none"><path d="M1 4L3.5 6.5L9 1" stroke="#111" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
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
                    <div className="w-6 h-6 rounded-full bg-[#111] flex items-center justify-center text-white text-[10px] font-bold">3</div>
                    <span className="text-[10px] font-bold uppercase tracking-[0.25em] text-[#aaa]">Publish</span>
                  </div>
                  <h3 className="text-2xl font-bold text-[#111] leading-snug mb-2">From manuscript to published book</h3>
                  <p className="text-sm text-[#666] leading-relaxed">
                    Cover design, formatting, and distribution: Plotzy's professional tools take your story to the finish line.
                  </p>
                </div>
                <div className="rounded-2xl overflow-hidden" style={{ border: "1px solid #e4e4e4" }}>
                  <MarketplaceMockup />
                </div>
                <ul className="space-y-2">
                  {['AI-generated professional book covers', 'One-click export to PDF & EPUB', '9 AI editorial services in the marketplace'].map(item => (
                    <li key={item} className="flex items-center gap-2.5 text-[#444] text-sm">
                      <span className="w-4 h-4 rounded-full bg-black/5 border border-black/10 flex items-center justify-center flex-shrink-0">
                        <svg width="8" height="6" viewBox="0 0 10 8" fill="none"><path d="M1 4L3.5 6.5L9 1" stroke="#111" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
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
                    <div className="w-6 h-6 rounded-full bg-[#111] flex items-center justify-center text-white text-[10px] font-bold">4</div>
                    <span className="text-[10px] font-bold uppercase tracking-[0.25em] text-[#aaa]">Listen</span>
                  </div>
                  <h3 className="text-2xl font-bold text-[#111] leading-snug mb-2">Turn your book into an audiobook</h3>
                  <p className="text-sm text-[#666] leading-relaxed">
                    With one click, Plotzy's AI narrates your entire book. Choose from 10 distinct voices, preview each chapter, and export.
                  </p>
                </div>
                <div className="rounded-2xl overflow-hidden" style={{ border: "1px solid #e4e4e4" }}>
                  <AudiobookMockup />
                </div>
                <ul className="space-y-2">
                  {['10 distinct AI voices with unique pitch & tone', 'Chapter-by-chapter narration with live preview', 'Real-time waveform & export-ready audio'].map(item => (
                    <li key={item} className="flex items-center gap-2.5 text-[#444] text-sm">
                      <span className="w-4 h-4 rounded-full bg-black/5 border border-black/10 flex items-center justify-center flex-shrink-0">
                        <svg width="8" height="6" viewBox="0 0 10 8" fill="none"><path d="M1 4L3.5 6.5L9 1" stroke="#111" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                      </span>
                      {item}
                    </li>
                  ))}
                </ul>
              </motion.div>

            </div>
          </div>
        </section>

        {/* ===== CARD STACK FEATURES ===== */}
        <div id="platform-features" style={{ background: "#080808", padding: "80px 0 100px" }}>
          <div style={{ maxWidth: 860, margin: "0 auto", padding: "0 24px" }}>
            <div style={{ textAlign: "center", marginBottom: 60 }}>
              <p style={{
                fontSize: "0.7rem", fontWeight: 700, letterSpacing: "0.14em",
                color: "rgba(255,255,255,0.3)", textTransform: "uppercase",
                marginBottom: 16, fontFamily: '-apple-system,"SF Pro Display",sans-serif',
              }}>
                What Plotzy offers
              </p>
              <h2 style={{
                fontSize: "clamp(2rem,4vw,3.2rem)", fontWeight: 700,
                color: "#fff", letterSpacing: "-0.03em", lineHeight: 1.1,
                fontFamily: '-apple-system,"SF Pro Display",sans-serif',
              }}>
                Everything a writer needs,<br />in a single place.
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
                  tag: "Writing",
                  title: "A distraction-free editor built for long-form writing",
                  description: "Full-screen chapters, live word count, drag-to-reorder, and status labels. The page stays out of your way so the story stays in focus.",
                  accent: "linear-gradient(90deg,#fff 0%,#ccc 100%)",
                },
                {
                  id: 2,
                  tag: "AI",
                  title: "An AI that reads as you write, never as you wait",
                  description: "Stronger verbs, passive-voice flags, alternative phrasings offered quietly, so your voice stays yours. Think of it as an invisible co-author.",
                  accent: "linear-gradient(90deg,#fff 0%,#ccc 100%)",
                },
                {
                  id: 3,
                  tag: "Publishing",
                  title: "One button to reach every major platform",
                  description: "Your manuscript lands on every digital and print platform simultaneously. Formatting, rights management, and royalty tracking handled automatically.",
                  accent: "linear-gradient(90deg,#fff 0%,#ccc 100%)",
                },
                {
                  id: 4,
                  tag: "Cover Design",
                  title: "Professional covers generated in seconds",
                  description: "Describe your story's tone, era, and feeling. Plotzy generates gallery-quality artwork ready for the shelf, no design skills required.",
                  accent: "linear-gradient(90deg,#fff 0%,#ccc 100%)",
                },
                {
                  id: 5,
                  tag: "Analytics",
                  title: "Know exactly where readers slow down or stop",
                  description: "See where readers accelerate, where they drift, and where they quietly close the book. Revision becomes a precise science rather than a guessing game.",
                  accent: "linear-gradient(90deg,#fff 0%,#ccc 100%)",
                },
                {
                  id: 6,
                  tag: "Audiobook Studio",
                  title: "Turn your book into a full audiobook with one click",
                  description: "Choose from 10 distinct AI voices, preview each chapter, and export high-quality audio ready for any platform. Your words, narrated exactly the way you imagined.",
                  accent: "linear-gradient(90deg,#fff 0%,#ccc 100%)",
                },
              ]}
            />
          </div>
        </div>

        {/* ===== BOOK CAROUSEL ===== */}
        <BookCarousel />

        {/* ===== CTA SECTION ===== */}
        <section className="relative bg-[#080808] text-center py-10 px-6 sm:px-8 overflow-hidden">

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
              Ready to Claim Your Legacy?
            </TextShimmer>

            <p className="text-base font-light mb-10 leading-[1.8] max-w-xl mx-auto" style={{ color: 'rgba(255,255,255,0.42)' }}>
              The platform. The tools. The community.<br />Everything you need to transform your vision into reality.
            </p>

            <div className="flex flex-wrap items-center justify-center gap-4">
              <button
                onClick={openCreateBook}
                className="group inline-flex items-center gap-2.5 px-8 py-3 rounded-full font-bold text-sm tracking-wide transition-all duration-300 hover:scale-[1.04] active:scale-[0.97]"
                style={{ background: '#EFEFEF', boxShadow: '0 4px 24px rgba(0,0,0,0.5)', color: '#111111' }}
              >
                Begin Your Journey
              </button>
              <button
                onClick={scrollToFeatures}
                className="inline-flex items-center gap-2 px-8 py-3 rounded-full font-semibold text-sm tracking-wide border transition-all duration-300 hover:border-white/30 hover:bg-white/[0.06] hover:scale-[1.03] active:scale-[0.97]"
                style={{ color: 'rgba(255,255,255,0.55)', borderColor: 'rgba(255,255,255,0.12)', background: 'rgba(255,255,255,0.03)' }}
              >
                View Full Features
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

      </Layout>

      <OnboardingWizard open={showWizard} onClose={() => setShowWizard(false)} onCreateBook={handleCreateWizardBook} />
      <AuthModal open={showAuthModal} onClose={() => setShowAuthModal(false)} />
    </>
  );
}
