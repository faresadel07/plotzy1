import { useState, useCallback, useEffect, useRef } from "react";
import { Link, useLocation } from "wouter";
import { Layout } from "@/components/layout";
import { SEO } from "@/components/SEO";
import { AuthModal } from "@/components/auth-modal";
import { useBooks, useCreateBook, useGenerateCover, useTrashBook, useDuplicateBook, useUpdateBook } from "@/hooks/use-books";
import { SeriesSection } from "@/components/SeriesSection";
import { BookCreationWizard, type WizardAnswers } from "@/components/BookCreationWizard";
import { ContentTypeSelector } from "@/components/ContentTypeSelector";
import { BookOpen, Plus, Trash2, Users, UserPlus, Search, X } from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { motion } from "framer-motion";
import { useLanguage } from "@/contexts/language-context";
import { useAuth } from "@/contexts/auth-context";
import { useIsPhone } from "@/hooks/use-is-phone";
import { MobileHome } from "@/components/mobile/MobileHome";
import { BOOK_LANGUAGES } from "@/lib/i18n";
import { useToast } from "@/hooks/use-toast";
import { BookCoverShader } from "@/components/ui/book-cover-shader";
import { PerspectiveBook } from "@/components/ui/perspective-book";
import { ConfirmModal } from "@/components/confirm-modal";
import { DesktopHero, DesktopSections } from "@/components/desktop/DesktopLanding";
import { PAPER, SPECKLE } from "@/components/mobile/palette";


const BOOKS_PER_SHELF = 4;

const COVER_PALETTES = [
  { bg: 'linear-gradient(150deg,#0f0c29,#302b63,#24243e)', accent: '#a78bfa' },
  { bg: 'linear-gradient(150deg,#1a0800,#6b2d00,#c2410c)', accent: '#fb923c' },
  { bg: 'linear-gradient(150deg,#001c2e,#003d5b,#0369a1)', accent: '#38bdf8' },
  { bg: 'linear-gradient(150deg,#12001a,#2a003a,#7e22ce)', accent: '#e879f9' },
  { bg: 'linear-gradient(150deg,#052010,#0f4a20,#15803d)', accent: '#4ade80' },
  { bg: 'linear-gradient(150deg,#1a0505,#5c1010,#991b1b)', accent: '#f87171' },
  { bg: 'linear-gradient(150deg,#0a0a1a,#1e1b4b,#3730a3)', accent: '#818cf8' },
];

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

  // ── Revoke a collaborator's access (You shared section) ──────────
  // Two-tap confirm; the shared-by-me payload has no collaborator row
  // id, so we resolve it from the owner-only collaborators list first.
  const [confirmRemove, setConfirmRemove] = useState<{ bookId: number; userId: number } | null>(null);
  const [removingCollab, setRemovingCollab] = useState(false);
  const qcHome = useQueryClient();
  const handleRemoveCollaborator = async (sharedBookId: number, collabUserId: number) => {
    if (!confirmRemove || confirmRemove.bookId !== sharedBookId || confirmRemove.userId !== collabUserId) {
      setConfirmRemove({ bookId: sharedBookId, userId: collabUserId });
      return;
    }
    setRemovingCollab(true);
    try {
      const listRes = await fetch(`/api/books/${sharedBookId}/collaborators`, { credentials: "include" });
      if (!listRes.ok) throw new Error();
      const data = await listRes.json();
      const row = (data.collaborators || []).find((c: any) => c.userId === collabUserId);
      if (!row) throw new Error();
      const delRes = await fetch(`/api/books/${sharedBookId}/collaborators/${row.id}`, { method: "DELETE", credentials: "include" });
      if (!delRes.ok) throw new Error();
      qcHome.invalidateQueries({ queryKey: ["/api/books/shared-by-me"] });
      toast({ title: lang === "ar" ? "تمت إزالة المتعاون" : "Collaborator removed" });
    } catch {
      toast({ title: lang === "ar" ? "تعذّرت الإزالة، حاول مجدداً" : "Could not remove, try again", variant: "destructive" });
    } finally {
      setRemovingCollab(false);
      setConfirmRemove(null);
    }
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

        {/* The whole desktop home lives on the warm paper surface. */}
        <div style={{ background: PAPER, minHeight: "100vh", ...SPECKLE }}>

        {/* ===== HERO: headline + the messy papers stack ===== */}
        <DesktopHero ar={lang === "ar"} onStartWriting={openCreateBook} onOpenCourse={() => setLocation("/course")} />

        {/* ===== EXISTING ACTIVE LIBRARY SECTION (SLEEK INTEGRATION) ===== */}
        {user && !isLoading && (
          <section className="bg-[#221b11] border-t border-b border-white/10 py-24 px-4 sm:px-6 lg:px-8">
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





        {/* ===== SHARED SECTIONS (warm paper, with collaborator control) ===== */}
        <div>

        {/* ===== SHARED WITH ME ===== */}
        {user && sharedBooks.length > 0 && (
          <section className="max-w-7xl mx-auto px-6 pt-10 pb-4">
            <div className="flex items-center gap-3 mb-1">
              <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: "rgba(122,94,59,0.1)", border: "1px solid rgba(122,94,59,0.25)" }}>
                <Users className="w-4 h-4" style={{ color: "#7b5e3b" }} />
              </div>
              <h3 className="text-xl font-bold" style={{ color: "#2f2618", fontFamily: "'Lora', 'Amiri', Georgia, serif" }}>{t("hmSharedWithYou")}</h3>
            </div>
            <p className="mb-5" style={{ color: "#8a8070", fontFamily: "'Caveat', 'Aref Ruqaa', cursive", fontSize: lang === "ar" ? 14.5 : 17, transform: "rotate(-0.6deg)", display: "inline-block" }}>
              ({t("hmSharedWithYouDesc")})
            </p>
            <div className="grid gap-3" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))" }}>
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
                  className="flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-all hover:scale-[1.02] text-start border-0 w-full"
                  style={{ background: "#fffdf7", border: "1px solid rgba(66,53,33,0.13)", boxShadow: "0 4px 14px -8px rgba(41,33,21,0.2)" }}>
                  {/* Mini cover */}
                  <div className="w-10 h-14 rounded-lg flex-shrink-0 flex items-center justify-center overflow-hidden" style={{ background: "rgba(122,94,59,0.08)" }}>
                    {sb.coverImage ? (
                      <img src={sb.coverImage} alt={sb.title || ""} className="w-full h-full object-cover rounded-lg" />
                    ) : (
                      <BookOpen className="w-4 h-4" style={{ color: "#a08a6a" }} />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold truncate" style={{ color: "#2f2618" }}>{sb.title}</p>
                    <p className="text-[11px] truncate" style={{ color: "#8a8070" }}>
                      {t("hmBy")} {sb.ownerName || t("hmUnknown")} · {sb.role === "editor" ? t("hmCanEdit") : t("hmViewOnly")}
                    </p>
                  </div>
                  <span className="text-[9px] font-bold px-2 py-0.5 rounded-full flex-shrink-0" style={{ background: sb.role === "editor" ? "rgba(122,94,59,0.14)" : "rgba(66,53,33,0.07)", color: sb.role === "editor" ? "#7b5e3b" : "#7b7366" }}>
                    {sb.role === "editor" ? t("hmEditor") : t("hmViewer")}
                  </span>
                </button>
              ))}
            </div>
          </section>
        )}

        {/* ===== SHARED BY ME ===== */}
        {user && sharedByMe.length > 0 && (
          <section className="max-w-7xl mx-auto px-6 pt-10 pb-4">
            <div className="flex items-center gap-3 mb-1">
              <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: "rgba(122,94,59,0.1)", border: "1px solid rgba(122,94,59,0.25)" }}>
                <UserPlus className="w-4 h-4" style={{ color: "#7b5e3b" }} />
              </div>
              <h3 className="text-xl font-bold" style={{ color: "#2f2618", fontFamily: "'Lora', 'Amiri', Georgia, serif" }}>{t("hmYouShared")}</h3>
            </div>
            <p className="mb-5" style={{ color: "#8a8070", fontFamily: "'Caveat', 'Aref Ruqaa', cursive", fontSize: lang === "ar" ? 14.5 : 17, transform: "rotate(-0.6deg)", display: "inline-block" }}>
              ({t("hmYouSharedDesc")})
            </p>
            <div className="grid gap-3" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))" }}>
              {sharedByMe.map(book => (
                <div key={book.id} className="p-3 rounded-xl transition-all w-full"
                  style={{ background: "#fffdf7", border: "1px solid rgba(66,53,33,0.13)", boxShadow: "0 4px 14px -8px rgba(41,33,21,0.2)" }}>
                  {/* Book header (click opens the book) */}
                  <button type="button" onClick={() => setLocation(`/books/${book.id}`)} className="flex items-center gap-3 mb-3 w-full text-start cursor-pointer bg-transparent border-0 p-0">
                    <div className="w-10 h-14 rounded-lg flex-shrink-0 flex items-center justify-center overflow-hidden" style={{ background: "rgba(122,94,59,0.08)" }}>
                      {book.coverImage ? (
                        <img src={book.coverImage} alt={book.title || ""} className="w-full h-full object-cover" />
                      ) : (
                        <BookOpen className="w-4 h-4" style={{ color: "#a08a6a" }} />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold truncate" style={{ color: "#2f2618" }}>{book.title}</p>
                      <p className="text-[11px]" style={{ color: "#8a8070" }}>
                        {book.collaborators.length} {book.collaborators.length === 1 ? t("hmCollaborator") : t("hmCollaborators")}
                      </p>
                    </div>
                  </button>

                  {/* Every collaborator, with a revoke control */}
                  <div className="flex flex-col gap-1.5">
                    {book.collaborators.map((c) => {
                      const isConfirming = confirmRemove?.bookId === book.id && confirmRemove?.userId === c.userId;
                      return (
                        <div key={c.userId} className="flex items-center gap-2 px-2 py-1.5 rounded-lg" style={{ background: "rgba(66,53,33,0.04)", border: "1px solid rgba(66,53,33,0.07)" }}>
                          {c.avatarUrl ? (
                            <img src={c.avatarUrl} alt={c.name || ""} className="w-6 h-6 rounded-full object-cover" />
                          ) : (
                            <div className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold" style={{ background: "rgba(122,94,59,0.15)", color: "#7b5e3b" }}>
                              {(c.name || "?")[0]?.toUpperCase()}
                            </div>
                          )}
                          <span className="text-[12px] flex-1 truncate font-medium" style={{ color: "#423521" }}>{c.name || t("hmUnknown")}</span>
                          <span className="text-[8px] font-bold px-1.5 py-0.5 rounded-full" style={{ background: c.role === "editor" ? "rgba(122,94,59,0.14)" : "rgba(66,53,33,0.06)", color: c.role === "editor" ? "#7b5e3b" : "#7b7366", border: "1px solid", borderColor: c.role === "editor" ? "rgba(122,94,59,0.3)" : "rgba(66,53,33,0.12)" }}>
                            {c.role === "editor" ? t("hmEditor") : t("hmViewer")}
                          </span>
                          <button
                            type="button"
                            disabled={removingCollab && isConfirming}
                            onClick={(e) => { e.stopPropagation(); handleRemoveCollaborator(book.id, c.userId); }}
                            onMouseLeave={() => { if (isConfirming && !removingCollab) setConfirmRemove(null); }}
                            className="flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[10px] font-semibold transition-all flex-shrink-0"
                            style={isConfirming
                              ? { background: "rgba(179,64,46,0.12)", color: "#b3402e", border: "1px solid rgba(179,64,46,0.35)" }
                              : { background: "transparent", color: "#9a9181", border: "1px solid transparent" }}
                            title={lang === "ar" ? "إزالة المتعاون" : "Remove collaborator"}
                          >
                            <X className="w-3 h-3" />
                            {isConfirming && (removingCollab ? (lang === "ar" ? "يزيل..." : "Removing...") : (lang === "ar" ? "تأكيد الإزالة؟" : "Confirm remove?"))}
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
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

        {/* ===== The warm literary sections (same as the phone, scaled up) ===== */}
        <DesktopSections ar={lang === "ar"} onStartWriting={openCreateBook} />

        </div>
        {/* ===== END PAPER SURFACE ===== */}

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

      </Layout>

      <BookCreationWizard open={showWizard} onClose={() => setShowWizard(false)} onCreate={handleCreateFromWizard} />
      <AuthModal open={showAuthModal} onClose={() => setShowAuthModal(false)} />
    </>
  );
}
