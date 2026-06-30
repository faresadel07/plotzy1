import { useState, useMemo, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import { useRoute, Link } from "wouter";
import { useBook } from "@/hooks/use-books";
import { useChapters } from "@/hooks/use-chapters";
import { Layout } from "@/components/layout";
import { SEO } from "@/components/SEO";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/contexts/language-context";
import { PUBLISHERS, REGIONS, ALL_GENRES, type Publisher } from "@/shared/publishers";
import { AGENTS, type LiteraryAgent } from "@/shared/agents";
import { scorePublisher, scoreAgent, topMatches, type BookContext, type MatchResult } from "@/shared/match-scoring";
import { SubmissionTracker } from "@/components/publisher/SubmissionTracker";
import { TrackSubmissionButton, SavePublisherButton } from "@/components/publisher/TrackSubmissionButton";
import { SelfPublishingTab } from "@/components/publisher/SelfPublishingTab";
import { useSavedPublishers } from "@/hooks/use-submissions";
import {
  ArrowLeft, Search, Globe, BookOpen, Mail, ExternalLink, Wand2, Copy,
  Check, Loader2, BookMarked, MapPin, Users, CheckCircle2, Send,
  FileDown, Lightbulb, ChevronRight, ClipboardList, PenLine, Star,
  Award, BookCheck, Sparkles, Info, X, TrendingUp, Filter,
  UserCheck, Briefcase, ArrowUpDown,
} from "lucide-react";

const BG = "#0a0909";
const CARD = "rgba(255,255,255,0.04)";
const CARD_HOVER = "rgba(255,255,255,0.07)";
const BORDER = "rgba(255,255,255,0.09)";
const BORDER_STRONG = "rgba(255,255,255,0.18)";
const TEXT = "#f0efe8";
const MUTED = "rgba(255,255,255,0.45)";
const MUTED2 = "rgba(255,255,255,0.28)";
const GREEN_BG = "rgba(34,197,94,0.12)";
const GREEN = "#4ade80";
const AMBER_BG = "rgba(251,191,36,0.10)";
const AMBER = "#fbbf24";
const BLUE_BG = "rgba(96,165,250,0.10)";
const BLUE = "#93c5fd";
const ACCENT = "rgba(255,255,255,0.10)";

const SF = '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';

const PUBLISHING_STEPS = [
  {
    id: 1,
    icon: PenLine,
    title: "Finish Your Manuscript",
    titleAr: "أكمل مخطوطتك",
    desc: "Complete your first draft. Aim for a word count appropriate for your genre (novels: 70,000–100,000 words).",
    descAr: "أكمل المسودة الأولى. استهدف عدد الكلمات المناسب لنوعك الأدبي (الروايات: 70,000–100,000 كلمة).",
    tips: ["Save your work often", "Don't edit while writing the first draft", "Set daily word count goals"],
    tipsAr: ["احفظ عملك بانتظام", "لا تحرّر أثناء كتابة المسودة الأولى", "حدد أهداف يومية لعدد الكلمات"],
  },
  {
    id: 2,
    icon: BookCheck,
    title: "Edit & Revise",
    titleAr: "التحرير والمراجعة",
    desc: "Self-edit your manuscript, then get beta readers. Consider hiring a professional editor.",
    descAr: "راجع مخطوطتك بنفسك، ثم احصل على قراء تجريبيين. فكر في تعيين محرر محترف.",
    tips: ["Read aloud to catch awkward phrasing", "Check for consistency in characters and plot", "Take breaks between editing sessions"],
    tipsAr: ["اقرأ بصوت عالٍ لاكتشاف الصياغة الغريبة", "تحقق من اتساق الشخصيات والحبكة", "خذ استراحات بين جلسات التحرير"],
  },
  {
    id: 3,
    icon: ClipboardList,
    title: "Write a Query Letter",
    titleAr: "اكتب رسالة استفسار",
    desc: "A query letter is a one-page pitch to literary agents or publishers. It should hook them in the first sentence.",
    descAr: "رسالة الاستفسار عرض من صفحة واحدة للوكلاء الأدبيين أو الناشرين. يجب أن تجذبهم من الجملة الأولى.",
    tips: ["Keep it under 300 words", "Include genre, word count, and a brief bio", "Personalize each letter to the agent/publisher"],
    tipsAr: ["اجعلها أقل من 300 كلمة", "أدرج النوع الأدبي وعدد الكلمات وسيرة ذاتية موجزة", "خصص كل رسالة للوكيل أو الناشر"],
  },
  {
    id: 4,
    icon: Search,
    title: "Research Publishers",
    titleAr: "ابحث عن الناشرين",
    desc: "Find the right publishers for your genre and style. Check submission guidelines carefully for each.",
    descAr: "ابحث عن الناشرين المناسبين لنوعك وأسلوبك. تحقق بعناية من إرشادات التقديم لكل واحد.",
    tips: ["Use the Publisher Directory below", "Check if they accept unsolicited manuscripts", "Look at their recent publications"],
    tipsAr: ["استخدم دليل الناشرين أدناه", "تحقق مما إذا كانوا يقبلون المخطوطات غير المُطلوبة", "انظر إلى منشوراتهم الأخيرة"],
  },
  {
    id: 5,
    icon: Send,
    title: "Submit Your Manuscript",
    titleAr: "قدّم مخطوطتك",
    desc: "Follow each publisher's submission guidelines exactly. Prepare a synopsis, sample chapters, and cover letter.",
    descAr: "اتبع إرشادات التقديم لكل ناشر بدقة. أعد ملخصاً وفصولاً نموذجية ورسالة تغطية.",
    tips: ["Submit to multiple publishers simultaneously (if allowed)", "Keep a spreadsheet tracking submissions", "Expect to wait 3–6 months for a response"],
    tipsAr: ["قدم إلى ناشرين متعددين في آنٍ واحد (إذا كان مسموحاً)", "احتفظ بجدول بيانات لتتبع التقديمات", "توقع الانتظار 3–6 أشهر للحصول على رد"],
  },
  {
    id: 6,
    icon: Award,
    title: "Review & Sign a Contract",
    titleAr: "مراجعة وتوقيع العقد",
    desc: "If you receive an offer, have a literary attorney review the contract before signing. Understand your rights.",
    descAr: "إذا تلقيت عرضاً، اطلب من محامٍ أدبي مراجعة العقد قبل التوقيع. افهم حقوقك.",
    tips: ["Never pay to be published (vanity press warning)", "Retain your digital rights if possible", "Understand royalty percentages and advances"],
    tipsAr: ["لا تدفع أبداً مقابل النشر (تحذير من النشر الوهمي)", "احتفظ بحقوقك الرقمية إن أمكن", "افهم نسب الإتاوات والمدفوعات المقدمة"],
  },
];

function PublisherCard({
  publisher, isSelected, onSelect, ar, matchScore, bookId,
}: {
  publisher: Publisher;
  isSelected: boolean;
  onSelect: () => void;
  ar: boolean;
  matchScore?: number;
  bookId?: number;
}) {
  const [hovered, setHovered] = useState(false);
  // Match-score colour ramp — green (great), amber (decent), grey (low).
  const scoreColor =
    matchScore == null ? null
    : matchScore >= 70 ? { bg: "rgba(74,222,128,0.12)", fg: "#86efac", border: "rgba(74,222,128,0.30)" }
    : matchScore >= 40 ? { bg: "rgba(251,191,36,0.10)", fg: "#fcd34d", border: "rgba(251,191,36,0.25)" }
    : { bg: ACCENT, fg: MUTED, border: BORDER };
  return (
    <div
      style={{ position: "relative" }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* Save bookmark sits in the corner so it doesn't trigger the card click. */}
      <div style={{ position: "absolute", top: 10, insetInlineEnd: 10, zIndex: 2 }}>
        <SavePublisherButton recipientKey={`pub:${publisher.id}`} ar={ar} compact />
      </div>
    <button
      onClick={onSelect}
      style={{
        fontFamily: SF,
        width: "100%",
        textAlign: ar ? "right" : "left",
        borderRadius: 16,
        border: `1px solid ${isSelected ? "rgba(255,255,255,0.30)" : hovered ? BORDER_STRONG : BORDER}`,
        background: isSelected ? "rgba(255,255,255,0.08)" : hovered ? CARD_HOVER : CARD,
        padding: "16px",
        transition: "all 0.15s ease",
        cursor: "pointer",
        outline: "none",
        transform: hovered && !isSelected ? "translateY(-1px)" : "translateY(0)",
        boxShadow: isSelected ? "0 0 0 1px rgba(255,255,255,0.12), 0 8px 24px rgba(0,0,0,0.4)" : hovered ? "0 4px 16px rgba(0,0,0,0.35)" : "none",
      }}
      data-testid={`card-publisher-${publisher.id}`}
    >
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 10, marginBottom: 10 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ fontWeight: 700, fontSize: 13, color: TEXT, lineHeight: 1.35, marginBottom: 3, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
            {publisher.name}
          </p>
          <div style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 11, color: MUTED }}>
            <MapPin size={10} />
            <span>{publisher.country}</span>
            {publisher.founded && <span style={{ opacity: 0.5 }}>· {publisher.founded}</span>}
          </div>
        </div>
        <span style={{
          flexShrink: 0,
          fontSize: 10,
          fontWeight: 700,
          letterSpacing: "0.03em",
          padding: "3px 8px",
          borderRadius: 20,
          background: publisher.acceptsUnsolicited ? GREEN_BG : ACCENT,
          color: publisher.acceptsUnsolicited ? GREEN : MUTED,
          border: `1px solid ${publisher.acceptsUnsolicited ? "rgba(74,222,128,0.25)" : BORDER}`,
        }}>
          {publisher.acceptsUnsolicited ? (ar ? "مباشر" : "Direct") : (ar ? "وكيل" : "Agent")}
        </span>
      </div>
      <p style={{ fontSize: 11, color: MUTED, lineHeight: 1.55, marginBottom: 10, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
        {publisher.description}
      </p>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 5, marginBottom: 12 }}>
        {publisher.genres.slice(0, 3).map(g => (
          <span key={g} style={{ fontSize: 10, padding: "2px 8px", borderRadius: 20, background: ACCENT, color: MUTED, border: `1px solid ${BORDER}` }}>{g}</span>
        ))}
        {publisher.genres.length > 3 && (
          <span style={{ fontSize: 10, padding: "2px 8px", borderRadius: 20, background: "transparent", color: MUTED2, border: `1px solid ${BORDER}` }}>+{publisher.genres.length - 3}</span>
        )}
      </div>
      {/* Match score + Track Submission CTA row */}
      <div
        onClick={(e) => e.stopPropagation()}
        style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, paddingTop: 10, borderTop: `1px solid ${BORDER}` }}
      >
        {scoreColor && matchScore != null && matchScore > 0 ? (
          <div
            title={ar ? "نتيجة المطابقة مع كتابك" : "How well this publisher matches your book"}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 5,
              padding: "3px 9px",
              borderRadius: 999,
              background: scoreColor.bg,
              color: scoreColor.fg,
              border: `1px solid ${scoreColor.border}`,
              fontSize: 11,
              fontWeight: 700,
              fontVariantNumeric: "tabular-nums",
            }}
          >
            <TrendingUp size={10} />
            {matchScore}% {ar ? "تطابق" : "match"}
          </div>
        ) : <span />}
        <TrackSubmissionButton
          bookId={bookId}
          recipientKey={`pub:${publisher.id}`}
          recipientName={publisher.name}
          ar={ar}
          compact
        />
      </div>
    </button>
    </div>
  );
}

// ── Literary Agent card (mirrors PublisherCard) ────────────────────
function AgentCard({
  agent, isSelected, onSelect, ar, matchScore, bookId,
}: {
  agent: LiteraryAgent;
  isSelected: boolean;
  onSelect: () => void;
  ar: boolean;
  matchScore?: number;
  bookId?: number;
}) {
  const [hovered, setHovered] = useState(false);
  const scoreColor =
    matchScore == null ? null
    : matchScore >= 70 ? { bg: "rgba(74,222,128,0.12)", fg: "#86efac", border: "rgba(74,222,128,0.30)" }
    : matchScore >= 40 ? { bg: "rgba(251,191,36,0.10)", fg: "#fcd34d", border: "rgba(251,191,36,0.25)" }
    : { bg: ACCENT, fg: MUTED, border: BORDER };
  return (
    <div
      style={{ position: "relative" }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <div style={{ position: "absolute", top: 10, insetInlineEnd: 10, zIndex: 2 }}>
        <SavePublisherButton recipientKey={`agent:${agent.id}`} ar={ar} compact />
      </div>
      <button
        onClick={onSelect}
        style={{
          fontFamily: SF,
          width: "100%",
          textAlign: ar ? "right" : "left",
          borderRadius: 16,
          border: `1px solid ${isSelected ? "rgba(255,255,255,0.30)" : hovered ? BORDER_STRONG : BORDER}`,
          background: isSelected ? "rgba(255,255,255,0.08)" : hovered ? CARD_HOVER : CARD,
          padding: "16px",
          transition: "all 0.15s ease",
          cursor: "pointer",
          outline: "none",
          transform: hovered && !isSelected ? "translateY(-1px)" : "translateY(0)",
        }}
      >
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 10, marginBottom: 4, paddingInlineEnd: 28 }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{ fontWeight: 700, fontSize: 13, color: TEXT, lineHeight: 1.3, marginBottom: 2 }}>{agent.name}</p>
            <p style={{ fontSize: 11, color: MUTED, marginBottom: 4 }}>{agent.agency}</p>
            <div style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 10.5, color: MUTED2 }}>
              <MapPin size={10} />
              <span>{agent.country}</span>
              {agent.responseTimeWeeks != null && <span style={{ opacity: 0.7 }}>· {agent.responseTimeWeeks}w reply</span>}
            </div>
          </div>
        </div>
        <p style={{ fontSize: 11, color: MUTED, lineHeight: 1.55, margin: "8px 0 10px", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
          {agent.description}
        </p>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 5, marginBottom: 12 }}>
          {agent.genres.slice(0, 3).map(g => (
            <span key={g} style={{ fontSize: 10, padding: "2px 8px", borderRadius: 20, background: ACCENT, color: MUTED, border: `1px solid ${BORDER}` }}>{g}</span>
          ))}
          {agent.genres.length > 3 && (
            <span style={{ fontSize: 10, padding: "2px 8px", borderRadius: 20, color: MUTED2, border: `1px solid ${BORDER}` }}>+{agent.genres.length - 3}</span>
          )}
        </div>
        <div
          onClick={(e) => e.stopPropagation()}
          style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, paddingTop: 10, borderTop: `1px solid ${BORDER}` }}
        >
          {scoreColor && matchScore != null && matchScore > 0 ? (
            <div
              style={{
                display: "inline-flex", alignItems: "center", gap: 5,
                padding: "3px 9px", borderRadius: 999,
                background: scoreColor.bg, color: scoreColor.fg,
                border: `1px solid ${scoreColor.border}`,
                fontSize: 11, fontWeight: 700, fontVariantNumeric: "tabular-nums",
              }}
            >
              <TrendingUp size={10} />
              {matchScore}% {ar ? "تطابق" : "match"}
            </div>
          ) : <span />}
          <TrackSubmissionButton
            bookId={bookId}
            recipientKey={`agent:${agent.id}`}
            recipientName={`${agent.name}, ${agent.agency}`}
            ar={ar}
            compact
          />
        </div>
      </button>
    </div>
  );
}

// Compact iOS-style toggle used by the filter row.
function ToggleSwitch({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <div style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
      <button
        onClick={() => onChange(!checked)}
        style={{
          width: 36, height: 21, borderRadius: 999,
          background: checked ? "#22c55e" : "rgba(255,255,255,0.12)",
          border: "none", cursor: "pointer", position: "relative",
          transition: "background 0.18s", flexShrink: 0,
        }}
      >
        <span style={{
          position: "absolute", top: 2, left: checked ? 17 : 2, width: 17, height: 17,
          borderRadius: "50%", background: "#fff", transition: "left 0.18s", boxShadow: "0 1px 3px rgba(0,0,0,0.3)",
        }} />
      </button>
      <label onClick={() => onChange(!checked)} style={{ fontSize: 12, color: "rgba(255,255,255,0.55)", cursor: "pointer" }}>
        {label}
      </label>
    </div>
  );
}

export default function PublishBook() {
  const [, params] = useRoute("/books/:id/find-publishers");
  const bookId = params?.id ? parseInt(params.id) : 0;
  const { data: book } = useBook(bookId);
  const { data: chapters } = useChapters(bookId);
  const { toast } = useToast();
  const { lang, isRTL } = useLanguage();
  const ar = lang === "ar";

  type Tab = "publishers" | "agents" | "submissions" | "self" | "guide";
  const [activeTab, setActiveTab] = useState<Tab>("publishers");
  const [completedSteps, setCompletedSteps] = useState<Set<number>>(new Set());
  const [expandedStep, setExpandedStep] = useState<number | null>(1);

  const [search, setSearch] = useState("");
  const [selectedRegion, setSelectedRegion] = useState("All Regions");
  const [selectedGenre, setSelectedGenre] = useState("All Genres");
  const [onlyUnsolicited, setOnlyUnsolicited] = useState(false);
  const [onlySaved, setOnlySaved] = useState(false);
  const [sortBy, setSortBy] = useState<"match" | "name" | "rating">("match");
  const [selectedPublisher, setSelectedPublisher] = useState<Publisher | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [proposal, setProposal] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const detailRef = useRef<HTMLDivElement>(null);

  // Bookmarks (saved publishers) for the per-card heart icon + saved
  // filter chip. recipientKey scheme: 'pub:<id>' / 'agent:<id>'.
  const { data: savedRows = [] } = useSavedPublishers();
  const savedKeys = useMemo(() => new Set(savedRows.map((r) => r.recipientKey)), [savedRows]);

  const totalWords = chapters?.reduce((acc, ch) => {
    const content = ch.content || "";
    let text = content;
    try { const pages = JSON.parse(content); if (Array.isArray(pages)) text = pages.join(" "); } catch {}
    return acc + text.split(/\s+/).filter(Boolean).length;
  }, 0) ?? 0;

  // Book context fed into the match-scoring engine. Genres come from
  // the book's metadata; languages default to the book's UI language;
  // word count is the live total computed above.
  const bookCtx: BookContext = useMemo(() => ({
    genres: (book?.genre ? [book.genre] : []),
    languages: book?.language ? [book.language] : ["en"],
    wordCount: totalWords,
  }), [book?.genre, book?.language, totalWords]);

  // Per-publisher match score, memoised so a search/filter change
  // doesn't re-score every card.
  const publisherScores = useMemo(() => {
    const map = new Map<string, MatchResult>();
    for (const p of PUBLISHERS) map.set(p.id, scorePublisher(p, bookCtx));
    return map;
  }, [bookCtx]);

  const filteredPublishers = useMemo(() => {
    const rows = PUBLISHERS.filter(p => {
      const q = search.toLowerCase();
      const matchSearch = !q || p.name.toLowerCase().includes(q) || p.country.toLowerCase().includes(q) || p.genres.some(g => g.toLowerCase().includes(q));
      const matchRegion = selectedRegion === "All Regions" || p.region === selectedRegion;
      const matchGenre = selectedGenre === "All Genres" || p.genres.includes(selectedGenre);
      const matchUnsolicited = !onlyUnsolicited || p.acceptsUnsolicited;
      const matchSaved = !onlySaved || savedKeys.has(`pub:${p.id}`);
      return matchSearch && matchRegion && matchGenre && matchUnsolicited && matchSaved;
    });
    if (sortBy === "name") {
      rows.sort((a, b) => a.name.localeCompare(b.name));
    } else if (sortBy === "rating") {
      rows.sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0));
    } else {
      // sort by match score descending
      rows.sort((a, b) => (publisherScores.get(b.id)?.score ?? 0) - (publisherScores.get(a.id)?.score ?? 0));
    }
    return rows;
  }, [search, selectedRegion, selectedGenre, onlyUnsolicited, onlySaved, sortBy, savedKeys, publisherScores]);

  // Agent equivalents
  const agentScores = useMemo(() => {
    const map = new Map<string, MatchResult>();
    for (const a of AGENTS) map.set(a.id, scoreAgent(a, bookCtx));
    return map;
  }, [bookCtx]);

  const filteredAgents = useMemo(() => {
    const rows = AGENTS.filter(a => {
      const q = search.toLowerCase();
      const matchSearch = !q || a.name.toLowerCase().includes(q) || a.agency.toLowerCase().includes(q) || a.country.toLowerCase().includes(q) || a.genres.some(g => g.toLowerCase().includes(q));
      const matchRegion = selectedRegion === "All Regions" || a.region === selectedRegion;
      const matchGenre = selectedGenre === "All Genres" || a.genres.includes(selectedGenre);
      const matchSaved = !onlySaved || savedKeys.has(`agent:${a.id}`);
      return matchSearch && matchRegion && matchGenre && matchSaved;
    });
    if (sortBy === "name") {
      rows.sort((a, b) => a.name.localeCompare(b.name));
    } else {
      rows.sort((a, b) => (agentScores.get(b.id)?.score ?? 0) - (agentScores.get(a.id)?.score ?? 0));
    }
    return rows;
  }, [search, selectedRegion, selectedGenre, onlySaved, sortBy, savedKeys, agentScores]);

  // Top picks for the "Top matches" highlight strip at the top of the
  // publishers tab. Combines best-scoring publishers + agents.
  const topPicks = useMemo(() => {
    const pubs = topMatches(PUBLISHERS, bookCtx, scorePublisher, 5);
    return pubs.map((p) => ({ kind: "publisher" as const, item: p.item, match: p.match }));
  }, [bookCtx]);

  const hasFilter = search || selectedRegion !== "All Regions" || selectedGenre !== "All Genres" || onlyUnsolicited || onlySaved;

  const handleGenerateProposal = async (publisher: Publisher) => {
    setIsGenerating(true);
    setProposal(null);
    try {
      const res = await fetch(`/api/books/${bookId}/generate-proposal`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          publisherName: publisher.name,
          publisherCountry: publisher.country,
          publisherFocus: publisher.genres.join(", "),
          publisherWebsite: publisher.website,
          outputLanguage: book?.language || lang,
        }),
      });
      if (!res.ok) throw new Error("Failed");
      const data = await res.json();
      setProposal(data.proposal);
    } catch {
      toast({ title: ar ? "فشل إنشاء الرسالة" : "Failed to generate proposal", variant: "destructive" });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCopy = async (text: string) => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast({ title: ar ? "تم النسخ!" : "Copied to clipboard!" });
  };

  const toggleStep = (id: number) => {
    setCompletedSteps(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  useEffect(() => {
    if (selectedPublisher && detailRef.current) {
      detailRef.current.scrollTop = 0;
    }
  }, [selectedPublisher?.id]);

  const closeDetail = () => { setSelectedPublisher(null); setProposal(null); };

  const selectStyle: React.CSSProperties = {
    fontFamily: SF,
    fontSize: 12,
    color: TEXT,
    background: CARD,
    border: `1px solid ${BORDER}`,
    borderRadius: 10,
    padding: "8px 32px 8px 10px",
    outline: "none",
    cursor: "pointer",
    appearance: "none",
    WebkitAppearance: "none",
    minWidth: 130,
  };

  return (
    <Layout isFullDark>
      <SEO title="Find Publishers" noindex />
      <div style={{ background: BG, minHeight: "100vh", fontFamily: SF, color: TEXT }}>
        <div style={{ maxWidth: 1200, margin: "0 auto", padding: "20px 14px 48px" }} dir={isRTL ? "rtl" : "ltr"}>

          {/* ── Header ───────────────────────────────────────────────── */}
          <div style={{ marginBottom: 28 }}>
            <Link
              href={`/books/${bookId}`}
              style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 12, color: MUTED, textDecoration: "none", marginBottom: 16 }}
            >
              <ArrowLeft size={13} />
              {ar ? "العودة إلى الكتاب" : "Back to book"}
            </Link>

            <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 16, flexWrap: "wrap" }}>
              <div>
                <h1 style={{ fontSize: 26, fontWeight: 800, color: TEXT, margin: 0, lineHeight: 1.2 }}>
                  {ar ? "النشر والتواصل مع الناشرين" : "Publish & Connect"}
                </h1>
                <p style={{ fontSize: 13, color: MUTED, marginTop: 6, lineHeight: 1.6, maxWidth: 520 }}>
                  {ar
                    ? "دليلك الشامل لإتمام كتابك ونشره والتواصل مع الناشرين حول العالم"
                    : "Your complete guide to finishing, preparing, and submitting your manuscript to publishers worldwide"}
                </p>
              </div>

              {book && (
                <div style={{ display: "flex", flexDirection: "column", gap: 10, alignItems: "flex-end", flexShrink: 0 }}>
                  <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 14, padding: "12px 14px", display: "flex", alignItems: "center", gap: 12 }}>
                    {book.coverImage ? (
                      <img src={book.coverImage} alt={book.title || ""} style={{ width: 36, height: 50, objectFit: "cover", borderRadius: 6 }} />
                    ) : (
                      <div style={{ width: 36, height: 50, borderRadius: 6, background: ACCENT, display: "flex", alignItems: "center", justifyContent: "center" }}>
                        <BookOpen size={14} color={MUTED} />
                      </div>
                    )}
                    <div>
                      <p style={{ fontWeight: 700, fontSize: 13, color: TEXT, margin: 0, maxWidth: 160, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{book.title}</p>
                      {book.authorName && <p style={{ fontSize: 11, color: MUTED, margin: "2px 0 0" }}>{book.authorName}</p>}
                      <p style={{ fontSize: 11, color: MUTED2, margin: "2px 0 0" }}>
                        {totalWords > 0 ? `${totalWords.toLocaleString()} ${ar ? "كلمة" : "words"}` : (ar ? "لا توجد كلمات بعد" : "No words yet")}
                      </p>
                    </div>
                  </div>
                  <Link href={`/books/${bookId}`}>
                    <button style={{ fontFamily: SF, display: "inline-flex", alignItems: "center", gap: 6, fontSize: 12, fontWeight: 600, color: TEXT, background: CARD, border: `1px solid ${BORDER}`, borderRadius: 10, padding: "8px 14px", cursor: "pointer" }}>
                      <FileDown size={13} />
                      {ar ? "تحميل المخطوطة" : "Download Manuscript"}
                    </button>
                  </Link>
                </div>
              )}
            </div>
          </div>

          {/* ── Tabs ─────────────────────────────────────────────────── */}
          <div style={{ display: "flex", gap: 4, background: "rgba(255,255,255,0.05)", borderRadius: 12, padding: 4, marginBottom: 28, border: `1px solid ${BORDER}`, flexWrap: "wrap" }}>
            {([
              { id: "publishers" as const,  label: ar ? "الناشرون" : "Publishers",     icon: BookMarked },
              { id: "agents" as const,      label: ar ? "الوكلاء" : "Literary Agents", icon: UserCheck },
              { id: "submissions" as const, label: ar ? "تقديماتي" : "My Submissions", icon: Send },
              { id: "self" as const,        label: ar ? "النشر المستقلّ" : "Self-Publishing", icon: Briefcase },
              { id: "guide" as const,       label: ar ? "دليل النشر" : "Publishing Guide", icon: Lightbulb },
            ]).map(tab => {
              const Icon = tab.icon;
              const active = activeTab === tab.id;
              return (
                <button key={tab.id} onClick={() => setActiveTab(tab.id)} style={{
                  fontFamily: SF, display: "flex", alignItems: "center", gap: 7, padding: "8px 16px",
                  borderRadius: 9, fontSize: 13, fontWeight: 600, cursor: "pointer", border: "none",
                  background: active ? "rgba(255,255,255,0.10)" : "transparent",
                  color: active ? TEXT : MUTED,
                  transition: "all 0.15s",
                }}>
                  <Icon size={14} />
                  {tab.label}
                </button>
              );
            })}
          </div>

          {/* ═══════════════════════════════════════════════════════════
              PUBLISHING GUIDE TAB
          ═══════════════════════════════════════════════════════════ */}
          {activeTab === "guide" && (
            <div>
              {/* Progress bar */}
              <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 16, padding: "16px 20px", marginBottom: 20 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                  <p style={{ fontSize: 13, fontWeight: 600, color: TEXT, margin: 0 }}>
                    {ar ? "تقدم دليل النشر" : "Publishing Roadmap Progress"}
                  </p>
                  <span style={{ fontSize: 13, fontWeight: 700, color: TEXT }}>
                    {completedSteps.size}/{PUBLISHING_STEPS.length}
                  </span>
                </div>
                <div style={{ height: 4, borderRadius: 4, background: "rgba(255,255,255,0.08)", overflow: "hidden" }}>
                  <div style={{ height: "100%", borderRadius: 4, background: "linear-gradient(90deg, #4ade80, #22c55e)", transition: "width 0.5s ease", width: `${(completedSteps.size / PUBLISHING_STEPS.length) * 100}%` }} />
                </div>
                {completedSteps.size === PUBLISHING_STEPS.length && (
                  <p style={{ fontSize: 12, color: GREEN, fontWeight: 600, marginTop: 8, display: "flex", alignItems: "center", gap: 5 }}>
                    <Sparkles size={13} />
                    {ar ? "أحسنت! أنت جاهز لتقديم مخطوطتك." : "Excellent! You're ready to submit your manuscript."}
                  </p>
                )}
              </div>

              {/* Tip banner */}
              <div style={{ background: BLUE_BG, border: `1px solid rgba(147,197,253,0.20)`, borderRadius: 16, padding: "14px 16px", marginBottom: 20, display: "flex", gap: 12, alignItems: "flex-start" }}>
                <Info size={15} color={BLUE} style={{ flexShrink: 0, marginTop: 1 }} />
                <div>
                  <p style={{ fontSize: 13, fontWeight: 600, color: BLUE, margin: "0 0 3px" }}>
                    {ar ? "نصيحة: احفظ مخطوطتك" : "Tip: Save your manuscript"}
                  </p>
                  <p style={{ fontSize: 12, color: "rgba(147,197,253,0.75)", margin: 0, lineHeight: 1.55 }}>
                    {ar
                      ? "قبل التقديم، تأكد من تحميل نسخة PDF أو Word من مخطوطتك من صفحة تفاصيل الكتاب."
                      : "Before submitting, download a PDF or Word copy of your manuscript from the book details page."}
                  </p>
                  <Link href={`/books/${bookId}`}>
                    <button style={{ fontFamily: SF, fontSize: 12, fontWeight: 600, color: BLUE, background: "none", border: "none", padding: "4px 0 0", cursor: "pointer", textDecoration: "underline" }}>
                      {ar ? "اذهب إلى تفاصيل الكتاب ←" : "Go to Book Details →"}
                    </button>
                  </Link>
                </div>
              </div>

              {/* Steps */}
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {PUBLISHING_STEPS.map((step) => {
                  const Icon = step.icon;
                  const isCompleted = completedSteps.has(step.id);
                  const isExpanded = expandedStep === step.id;
                  return (
                    <div key={step.id} style={{
                      borderRadius: 16,
                      border: `1px solid ${isCompleted ? "rgba(74,222,128,0.25)" : isExpanded ? BORDER_STRONG : BORDER}`,
                      background: isCompleted ? "rgba(34,197,94,0.05)" : isExpanded ? "rgba(255,255,255,0.05)" : CARD,
                      overflow: "hidden",
                      transition: "all 0.2s",
                    }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 14, padding: "16px 18px" }}>
                        <button onClick={() => toggleStep(step.id)} style={{
                          fontFamily: SF, width: 30, height: 30, borderRadius: "50%", border: `2px solid ${isCompleted ? "#22c55e" : BORDER_STRONG}`,
                          background: isCompleted ? "#22c55e" : "transparent", display: "flex", alignItems: "center", justifyContent: "center",
                          flexShrink: 0, cursor: "pointer", transition: "all 0.2s",
                        }}>
                          {isCompleted ? <Check size={13} color="#fff" /> : <span style={{ fontSize: 11, fontWeight: 700, color: MUTED }}>{step.id}</span>}
                        </button>

                        <div style={{ width: 34, height: 34, borderRadius: 10, background: isCompleted ? GREEN_BG : ACCENT, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                          <Icon size={15} color={isCompleted ? GREEN : MUTED} />
                        </div>

                        <button onClick={() => setExpandedStep(isExpanded ? null : step.id)} style={{ flex: 1, minWidth: 0, textAlign: ar ? "right" : "left", background: "none", border: "none", cursor: "pointer", padding: 0 }}>
                          <p style={{ fontWeight: 700, fontSize: 14, color: isCompleted ? MUTED : TEXT, margin: 0, textDecoration: isCompleted ? "line-through" : "none" }}>
                            {ar ? step.titleAr : step.title}
                          </p>
                          {!isExpanded && (
                            <p style={{ fontSize: 11, color: MUTED2, margin: "3px 0 0", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                              {ar ? step.descAr : step.desc}
                            </p>
                          )}
                        </button>

                        <button onClick={() => setExpandedStep(isExpanded ? null : step.id)} style={{ background: "none", border: "none", cursor: "pointer", padding: 4 }}>
                          <ChevronRight size={14} color={MUTED} style={{ transition: "transform 0.2s", transform: isExpanded ? "rotate(90deg)" : "rotate(0deg)" }} />
                        </button>
                      </div>

                      {isExpanded && (
                        <div style={{ padding: "0 18px 18px", paddingLeft: ar ? 18 : 96, paddingRight: ar ? 96 : 18 }}>
                          <p style={{ fontSize: 13, color: MUTED, lineHeight: 1.65, marginBottom: 14 }}>
                            {ar ? step.descAr : step.desc}
                          </p>
                          <div style={{ background: "rgba(255,255,255,0.03)", borderRadius: 12, padding: "14px 16px", border: `1px solid ${BORDER}` }}>
                            <p style={{ fontSize: 10, fontWeight: 700, color: MUTED2, textTransform: "uppercase", letterSpacing: "0.1em", margin: "0 0 10px", display: "flex", alignItems: "center", gap: 5 }}>
                              <Star size={10} />
                              {ar ? "نصائح مفيدة" : "Pro Tips"}
                            </p>
                            <ul style={{ margin: 0, padding: 0, listStyle: "none", display: "flex", flexDirection: "column", gap: 7 }}>
                              {(ar ? step.tipsAr : step.tips).map((tip, i) => (
                                <li key={i} style={{ display: "flex", alignItems: "flex-start", gap: 8, fontSize: 12, color: MUTED, lineHeight: 1.5 }}>
                                  <CheckCircle2 size={12} color={GREEN} style={{ flexShrink: 0, marginTop: 1 }} />
                                  {tip}
                                </li>
                              ))}
                            </ul>
                          </div>
                          {step.id === 4 && (
                            <button onClick={() => setActiveTab("publishers")} style={{
                              fontFamily: SF, marginTop: 14, fontSize: 13, fontWeight: 600, color: TEXT,
                              background: "none", border: "none", cursor: "pointer", display: "flex", alignItems: "center", gap: 6, textDecoration: "underline",
                            }}>
                              <BookMarked size={14} />
                              {ar ? "انتقل إلى دليل الناشرين ←" : "Browse Publisher Directory →"}
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ═══════════════════════════════════════════════════════════
              MY SUBMISSIONS TAB
          ═══════════════════════════════════════════════════════════ */}
          {activeTab === "submissions" && (
            <SubmissionTracker ar={ar} bookId={bookId} />
          )}

          {/* ═══════════════════════════════════════════════════════════
              SELF-PUBLISHING TAB
          ═══════════════════════════════════════════════════════════ */}
          {activeTab === "self" && (
            <SelfPublishingTab ar={ar} />
          )}

          {/* ═══════════════════════════════════════════════════════════
              LITERARY AGENTS TAB
          ═══════════════════════════════════════════════════════════ */}
          {activeTab === "agents" && (
            <div>
              {/* Headline stats for agents */}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 10, marginBottom: 20 }}>
                {[
                  { label: ar ? "وكيل في القاعدة" : "Agents", value: AGENTS.length, icon: UserCheck },
                  { label: ar ? "متوسّط الرد" : "Avg response", value: `${Math.round((AGENTS.reduce((a, x) => a + (x.responseTimeWeeks ?? 8), 0) / AGENTS.length))}w`, icon: ClipboardList },
                  { label: ar ? "محفوظات" : "Saved", value: savedRows.filter(s => s.recipientKey.startsWith("agent:")).length, icon: BookMarked },
                ].map(stat => {
                  const Icon = stat.icon;
                  return (
                    <div key={stat.label} style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 14, padding: "16px 14px", textAlign: "center" }}>
                      <Icon size={16} color={MUTED} style={{ marginBottom: 6 }} />
                      <div style={{ fontSize: 22, fontWeight: 800, color: TEXT, lineHeight: 1 }}>{stat.value}</div>
                      <div style={{ fontSize: 11, color: MUTED, marginTop: 4, lineHeight: 1.3 }}>{stat.label}</div>
                    </div>
                  );
                })}
              </div>

              {/* Inline filter row */}
              <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 16, padding: "14px 16px", marginBottom: 16 }}>
                <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                  <div style={{ flex: 1, minWidth: 220, position: "relative" }}>
                    <Search size={14} color={MUTED} style={{ position: "absolute", left: 11, top: "50%", transform: "translateY(-50%)" }} />
                    <input
                      type="text"
                      placeholder={ar ? "ابحث باسم الوكيل أو الوكالة..." : "Search by agent or agency..."}
                      value={search}
                      onChange={e => setSearch(e.target.value)}
                      style={{
                        fontFamily: SF, width: "100%", padding: "9px 10px 9px 32px", fontSize: 12, color: TEXT,
                        background: "rgba(255,255,255,0.05)", border: `1px solid ${BORDER}`, borderRadius: 10,
                        outline: "none", boxSizing: "border-box",
                      }}
                    />
                  </div>
                  <div style={{ position: "relative" }}>
                    <BookOpen size={12} color={MUTED} style={{ position: "absolute", left: 9, top: "50%", transform: "translateY(-50%)", pointerEvents: "none" }} />
                    <select value={selectedGenre} onChange={e => setSelectedGenre(e.target.value)}
                      style={{ ...selectStyle, paddingLeft: 28, paddingRight: 28 }}>
                      {ALL_GENRES.map(g => <option key={g} value={g} style={{ background: "#1a1a1a" }}>{g}</option>)}
                    </select>
                  </div>
                  <div style={{ position: "relative" }}>
                    <ArrowUpDown size={12} color={MUTED} style={{ position: "absolute", left: 9, top: "50%", transform: "translateY(-50%)", pointerEvents: "none" }} />
                    <select value={sortBy} onChange={e => setSortBy(e.target.value as typeof sortBy)}
                      style={{ ...selectStyle, paddingLeft: 28, paddingRight: 28 }}>
                      <option value="match" style={{ background: "#1a1a1a" }}>{ar ? "ترتيب: المطابقة" : "Sort: Match score"}</option>
                      <option value="name" style={{ background: "#1a1a1a" }}>{ar ? "ترتيب: الاسم" : "Sort: Name"}</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Agent grid */}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(280px,1fr))", gap: 12, paddingBottom: 40 }}>
                {filteredAgents.map(agent => (
                  <AgentCard
                    key={agent.id}
                    agent={agent}
                    isSelected={false}
                    onSelect={() => {
                      // Just open the agent's website / submission page in a new tab — agent
                      // detail panel can be added in a follow-up commit. The "Track" button
                      // and "Save" bookmark already live on the card.
                      const url = agent.submissionUrl || agent.website;
                      if (url) window.open(url, "_blank", "noopener,noreferrer");
                    }}
                    ar={ar}
                    matchScore={agentScores.get(agent.id)?.score}
                    bookId={bookId || undefined}
                  />
                ))}
              </div>
            </div>
          )}

          {/* ═══════════════════════════════════════════════════════════
              PUBLISHER DIRECTORY TAB
          ═══════════════════════════════════════════════════════════ */}
          {activeTab === "publishers" && (
            <div>
              {/* Stats */}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 10, marginBottom: 20 }}>
                {[
                  { label: ar ? "ناشر في القاعدة" : "Publishers", value: PUBLISHERS.length, icon: BookOpen },
                  { label: ar ? "قبول مباشر" : "Direct submissions", value: PUBLISHERS.filter(p => p.acceptsUnsolicited).length, icon: CheckCircle2 },
                  { label: ar ? "منطقة عالمية" : "Global regions", value: REGIONS.length - 1, icon: Globe },
                ].map(stat => {
                  const Icon = stat.icon;
                  return (
                    <div key={stat.label} style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 14, padding: "16px 14px", textAlign: "center" }}>
                      <Icon size={16} color={MUTED} style={{ marginBottom: 6 }} />
                      <div style={{ fontSize: 22, fontWeight: 800, color: TEXT, lineHeight: 1 }}>{stat.value}</div>
                      <div style={{ fontSize: 11, color: MUTED, marginTop: 4, lineHeight: 1.3 }}>{stat.label}</div>
                    </div>
                  );
                })}
              </div>

              {/* Top picks for this book — when the writer has a real book
                  context (genre + word count), show a thin strip of the 5
                  best-matching publishers as starting points. */}
              {bookCtx.genres.length > 0 && topPicks[0]?.match.score > 0 && (
                <div
                  style={{
                    background: "linear-gradient(135deg, rgba(74,222,128,0.06), rgba(96,165,250,0.06))",
                    border: `1px solid rgba(74,222,128,0.20)`,
                    borderRadius: 16,
                    padding: "14px 16px",
                    marginBottom: 16,
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 10 }}>
                    <TrendingUp size={13} color={GREEN} />
                    <div style={{ fontSize: 11, fontWeight: 700, color: GREEN, letterSpacing: "0.06em", textTransform: "uppercase" }}>
                      {ar ? "أعلى مطابقة لكتابك" : "Best matches for your book"}
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: 8, overflowX: "auto", paddingBottom: 4 }}>
                    {topPicks.map(({ item: p, match }) => (
                      <button
                        key={p.id}
                        onClick={() => setSelectedPublisher(p)}
                        style={{
                          fontFamily: SF,
                          flexShrink: 0,
                          minWidth: 200,
                          padding: "10px 12px",
                          borderRadius: 12,
                          background: CARD_HOVER,
                          border: `1px solid ${BORDER}`,
                          color: TEXT,
                          textAlign: ar ? "right" : "left",
                          cursor: "pointer",
                        }}
                      >
                        <div style={{ fontWeight: 700, fontSize: 12.5, lineHeight: 1.3, marginBottom: 4, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{p.name}</div>
                        <div style={{ fontSize: 11, color: GREEN, fontWeight: 700, display: "flex", alignItems: "center", gap: 4 }}>
                          <TrendingUp size={10} /> {match.score}% match
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Search row */}
              <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 16, padding: "14px 16px", marginBottom: 16 }}>
                <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                  {/* Search input */}
                  <div style={{ flex: 1, minWidth: 220, position: "relative" }}>
                    <Search size={14} color={MUTED} style={{ position: "absolute", left: 11, top: "50%", transform: "translateY(-50%)" }} />
                    <input
                      type="text"
                      placeholder={ar ? "ابحث بالاسم أو البلد أو النوع..." : "Search by name, country, or genre..."}
                      value={search}
                      onChange={e => setSearch(e.target.value)}
                      data-testid="input-publisher-search"
                      style={{
                        fontFamily: SF, width: "100%", padding: "9px 10px 9px 32px", fontSize: 12, color: TEXT,
                        background: "rgba(255,255,255,0.05)", border: `1px solid ${BORDER}`, borderRadius: 10,
                        outline: "none", boxSizing: "border-box",
                      }}
                    />
                  </div>

                  {/* Region select */}
                  <div style={{ position: "relative" }}>
                    <Globe size={12} color={MUTED} style={{ position: "absolute", left: 9, top: "50%", transform: "translateY(-50%)", pointerEvents: "none" }} />
                    <ChevronRight size={11} color={MUTED2} style={{ position: "absolute", right: 9, top: "50%", transform: "translateY(-50%) rotate(90deg)", pointerEvents: "none" }} />
                    <select value={selectedRegion} onChange={e => setSelectedRegion(e.target.value)} data-testid="select-region"
                      style={{ ...selectStyle, paddingLeft: 28, paddingRight: 28 }}>
                      {REGIONS.map(r => <option key={r} value={r} style={{ background: "#1a1a1a" }}>{r}</option>)}
                    </select>
                  </div>

                  {/* Genre select */}
                  <div style={{ position: "relative" }}>
                    <BookOpen size={12} color={MUTED} style={{ position: "absolute", left: 9, top: "50%", transform: "translateY(-50%)", pointerEvents: "none" }} />
                    <ChevronRight size={11} color={MUTED2} style={{ position: "absolute", right: 9, top: "50%", transform: "translateY(-50%) rotate(90deg)", pointerEvents: "none" }} />
                    <select value={selectedGenre} onChange={e => setSelectedGenre(e.target.value)} data-testid="select-genre"
                      style={{ ...selectStyle, paddingLeft: 28, paddingRight: 28 }}>
                      {ALL_GENRES.map(g => <option key={g} value={g} style={{ background: "#1a1a1a" }}>{g}</option>)}
                    </select>
                  </div>

                  {/* Sort dropdown */}
                  <div style={{ position: "relative" }}>
                    <ArrowUpDown size={12} color={MUTED} style={{ position: "absolute", left: 9, top: "50%", transform: "translateY(-50%)", pointerEvents: "none" }} />
                    <ChevronRight size={11} color={MUTED2} style={{ position: "absolute", right: 9, top: "50%", transform: "translateY(-50%) rotate(90deg)", pointerEvents: "none" }} />
                    <select value={sortBy} onChange={e => setSortBy(e.target.value as typeof sortBy)}
                      style={{ ...selectStyle, paddingLeft: 28, paddingRight: 28 }}>
                      <option value="match" style={{ background: "#1a1a1a" }}>{ar ? "ترتيب: المطابقة" : "Sort: Match"}</option>
                      <option value="name" style={{ background: "#1a1a1a" }}>{ar ? "ترتيب: الاسم" : "Sort: Name"}</option>
                      <option value="rating" style={{ background: "#1a1a1a" }}>{ar ? "ترتيب: التقييم" : "Sort: Rating"}</option>
                    </select>
                  </div>
                </div>

                {/* Toggles */}
                <div style={{ display: "flex", alignItems: "center", gap: 18, marginTop: 12, paddingTop: 12, borderTop: `1px solid ${BORDER}`, flexWrap: "wrap" }}>
                  <ToggleSwitch
                    checked={onlyUnsolicited}
                    onChange={setOnlyUnsolicited}
                    label={ar ? "قبول مباشر فقط" : "Direct submissions only"}
                  />
                  <ToggleSwitch
                    checked={onlySaved}
                    onChange={setOnlySaved}
                    label={ar ? "محفوظات فقط" : "Saved only"}
                  />
                </div>
              </div>

              {/* Results bar */}
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
                <p style={{ fontSize: 12, color: MUTED, margin: 0 }}>
                  <span style={{ fontWeight: 700, color: TEXT }}>{filteredPublishers.length}</span>{" "}
                  {ar ? "ناشر" : `publisher${filteredPublishers.length !== 1 ? "s" : ""}`}
                  {hasFilter && <span style={{ color: MUTED2 }}> {ar ? "(مفلترة)" : "(filtered)"}</span>}
                </p>
                {hasFilter && (
                  <button onClick={() => { setSearch(""); setSelectedRegion("All Regions"); setSelectedGenre("All Genres"); setOnlyUnsolicited(false); }}
                    style={{ fontFamily: SF, fontSize: 12, color: MUTED, background: "none", border: "none", cursor: "pointer", textDecoration: "underline" }}>
                    {ar ? "مسح الفلاتر" : "Clear filters"}
                  </button>
                )}
              </div>

              {/* Publisher grid */}
              {filteredPublishers.length === 0 ? (
                <div style={{ textAlign: "center", padding: "60px 20px", color: MUTED }}>
                  <Search size={36} style={{ marginBottom: 12, opacity: 0.3 }} />
                  <p style={{ fontWeight: 600, fontSize: 14, margin: "0 0 6px" }}>{ar ? "لا توجد نتائج" : "No publishers found"}</p>
                  <p style={{ fontSize: 12, margin: 0 }}>{ar ? "جرّب تغيير الفلاتر" : "Try adjusting your filters"}</p>
                </div>
              ) : (
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(280px,1fr))", gap: 12, paddingBottom: 40 }}>
                  {filteredPublishers.map(pub => (
                    <PublisherCard
                      key={pub.id}
                      publisher={pub}
                      isSelected={selectedPublisher?.id === pub.id}
                      onSelect={() => setSelectedPublisher(selectedPublisher?.id === pub.id ? null : pub)}
                      ar={ar}
                      matchScore={publisherScores.get(pub.id)?.score}
                      bookId={bookId || undefined}
                    />
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ── Publisher Detail Modal (centered popup via portal) ───────── */}
      {selectedPublisher && createPortal(
        <div
          onClick={e => { if (e.target === e.currentTarget) closeDetail(); }}
          style={{
            position: "fixed", top: 0, left: 0, right: 0, bottom: 0, zIndex: 9999,
            display: "flex", alignItems: "center", justifyContent: "center",
            background: "rgba(0,0,0,0.65)", padding: "20px",
          }}
        >
          <div
            ref={detailRef}
            dir={isRTL ? "rtl" : "ltr"}
            style={{
              width: "100%", maxWidth: 520, maxHeight: "85vh", overflowY: "auto",
              background: "#1e1e1e", border: "1px solid rgba(255,255,255,0.18)", borderRadius: 18,
              boxShadow: "0 24px 80px rgba(0,0,0,0.9), 0 0 0 1px rgba(255,255,255,0.08)",
              fontFamily: SF, padding: "24px 22px", boxSizing: "border-box",
              animation: "popIn 0.2s ease",
            }}
          >
            <style>{`@keyframes popIn{from{transform:scale(0.95);opacity:0}to{transform:scale(1);opacity:1}}`}</style>

            {/* Close */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
              <span style={{ fontSize: 11, color: MUTED2, textTransform: "uppercase", letterSpacing: "0.08em" }}>
                {ar ? "تفاصيل الناشر" : "Publisher Details"}
              </span>
              <button onClick={closeDetail} style={{ background: ACCENT, border: `1px solid ${BORDER}`, borderRadius: 8, padding: 6, cursor: "pointer" }}>
                <X size={14} color={MUTED} />
              </button>
            </div>

            {/* Name & location */}
            <div style={{ marginBottom: 18 }}>
              <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12, marginBottom: 8 }}>
                <h2 style={{ fontSize: 20, fontWeight: 800, color: TEXT, margin: 0, lineHeight: 1.2 }}>
                  {selectedPublisher.name}
                </h2>
                <span style={{
                  flexShrink: 0, fontSize: 11, fontWeight: 700, padding: "4px 10px", borderRadius: 20,
                  background: selectedPublisher.acceptsUnsolicited ? GREEN_BG : ACCENT,
                  color: selectedPublisher.acceptsUnsolicited ? GREEN : MUTED,
                  border: `1px solid ${selectedPublisher.acceptsUnsolicited ? "rgba(74,222,128,0.25)" : BORDER}`,
                  display: "flex", alignItems: "center", gap: 5,
                }}>
                  {selectedPublisher.acceptsUnsolicited
                    ? <><CheckCircle2 size={11} />{ar ? "يقبل مباشرة" : "Direct"}</>
                    : <><Users size={11} />{ar ? "عبر وكيل" : "Agent"}</>
                  }
                </span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: MUTED }}>
                <MapPin size={11} />
                <span>{selectedPublisher.country}</span>
                <span style={{ opacity: 0.4 }}>·</span>
                <span>{selectedPublisher.region}</span>
                {selectedPublisher.founded && (
                  <><span style={{ opacity: 0.4 }}>·</span><span>est. {selectedPublisher.founded}</span></>
                )}
              </div>
            </div>

            {/* Description */}
            <p style={{ fontSize: 13, color: MUTED, lineHeight: 1.7, marginBottom: 18, borderBottom: `1px solid ${BORDER}`, paddingBottom: 18 }}>
              {selectedPublisher.description}
            </p>

            {/* Note */}
            {selectedPublisher.notes && (
              <div style={{ background: AMBER_BG, border: `1px solid rgba(251,191,36,0.2)`, borderRadius: 12, padding: "12px 14px", marginBottom: 18 }}>
                <p style={{ fontSize: 12, color: AMBER, margin: 0, lineHeight: 1.6 }}>
                  <span style={{ fontWeight: 700 }}>{ar ? "ملاحظة: " : "Note: "}</span>
                  {selectedPublisher.notes}
                </p>
              </div>
            )}

            {/* Genres */}
            <div style={{ marginBottom: 16 }}>
              <p style={{ fontSize: 10, fontWeight: 700, color: MUTED2, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 8 }}>
                {ar ? "الأجناس الأدبية" : "Genres"}
              </p>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                {selectedPublisher.genres.map(g => (
                  <span key={g} style={{ fontSize: 11, padding: "4px 10px", borderRadius: 20, background: ACCENT, color: MUTED, border: `1px solid ${BORDER}` }}>{g}</span>
                ))}
              </div>
            </div>

            {/* Languages */}
            <div style={{ marginBottom: 20 }}>
              <p style={{ fontSize: 10, fontWeight: 700, color: MUTED2, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 8 }}>
                {ar ? "لغات النشر" : "Languages"}
              </p>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                {selectedPublisher.languages.map(l => (
                  <span key={l} style={{ fontSize: 11, padding: "4px 10px", borderRadius: 20, background: "transparent", color: MUTED, border: `1px solid ${BORDER}` }}>{l}</span>
                ))}
              </div>
            </div>

            {/* Links */}
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8, paddingBottom: 18, borderBottom: `1px solid ${BORDER}`, marginBottom: 18 }}>
              <a href={selectedPublisher.website} target="_blank" rel="noopener noreferrer"
                data-testid={`link-publisher-website-${selectedPublisher.id}`}
                style={{ textDecoration: "none", display: "inline-flex", alignItems: "center", gap: 5, fontSize: 12, fontWeight: 600, padding: "7px 12px", borderRadius: 9, background: CARD_HOVER, color: TEXT, border: `1px solid ${BORDER}` }}>
                <Globe size={12} />{ar ? "الموقع الرسمي" : "Website"}<ExternalLink size={10} style={{ opacity: 0.5 }} />
              </a>
              {selectedPublisher.submissionUrl && (
                <a href={selectedPublisher.submissionUrl} target="_blank" rel="noopener noreferrer"
                  data-testid={`link-publisher-submissions-${selectedPublisher.id}`}
                  style={{ textDecoration: "none", display: "inline-flex", alignItems: "center", gap: 5, fontSize: 12, fontWeight: 600, padding: "7px 12px", borderRadius: 9, background: CARD_HOVER, color: TEXT, border: `1px solid ${BORDER}` }}>
                  <BookMarked size={12} />{ar ? "إرشادات التقديم" : "Submit Guidelines"}<ExternalLink size={10} style={{ opacity: 0.5 }} />
                </a>
              )}
              {selectedPublisher.submissionEmail && (
                <a href={`mailto:${selectedPublisher.submissionEmail}`}
                  data-testid={`link-publisher-email-${selectedPublisher.id}`}
                  style={{ textDecoration: "none", display: "inline-flex", alignItems: "center", gap: 5, fontSize: 12, fontWeight: 600, padding: "7px 12px", borderRadius: 9, background: CARD_HOVER, color: TEXT, border: `1px solid ${BORDER}` }}>
                  <Mail size={12} />{selectedPublisher.submissionEmail}
                </a>
              )}
            </div>

            {/* Generate proposal */}
            <button
              onClick={() => handleGenerateProposal(selectedPublisher)}
              disabled={isGenerating}
              data-testid="button-generate-proposal"
              style={{
                fontFamily: SF, width: "100%", padding: "13px 0", borderRadius: 12, fontSize: 14, fontWeight: 700,
                background: "linear-gradient(135deg, #1a1a1a 0%, #2a2a2a 100%)",
                color: isGenerating ? MUTED : TEXT, border: `1px solid rgba(255,255,255,0.15)`,
                cursor: isGenerating ? "not-allowed" : "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                boxShadow: "0 4px 16px rgba(0,0,0,0.4)",
                transition: "opacity 0.2s",
                opacity: isGenerating ? 0.7 : 1,
              }}
            >
              {isGenerating
                ? <><Loader2 size={15} style={{ animation: "spin 1s linear infinite" }} />{ar ? "جارٍ إنشاء الرسالة..." : "Generating proposal..."}</>
                : <><Wand2 size={15} />{ar ? "إنشاء رسالة تقديم بالذكاء الاصطناعي" : "Generate AI Submission Proposal"}</>
              }
            </button>

            {/* Proposal result */}
            {proposal && (
              <div style={{ marginTop: 20 }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
                  <p style={{ fontSize: 13, fontWeight: 700, color: TEXT, margin: 0, display: "flex", alignItems: "center", gap: 6 }}>
                    <Send size={13} />{ar ? "رسالة التقديم" : "Submission Proposal"}
                  </p>
                  <div style={{ display: "flex", gap: 8 }}>
                    <button onClick={() => handleCopy(proposal)} style={{
                      fontFamily: SF, display: "inline-flex", alignItems: "center", gap: 5, fontSize: 11, fontWeight: 600,
                      padding: "5px 10px", borderRadius: 8, background: ACCENT, color: TEXT, border: `1px solid ${BORDER}`, cursor: "pointer",
                    }} data-testid="button-copy-proposal">
                      {copied ? <><Check size={11} color={GREEN} />{ar ? "تم!" : "Copied!"}</> : <><Copy size={11} />{ar ? "نسخ" : "Copy"}</>}
                    </button>
                    {selectedPublisher.submissionEmail && (
                      <a href={`mailto:${selectedPublisher.submissionEmail}?subject=${encodeURIComponent(`Manuscript Submission: ${book?.title || "My Book"}`)}&body=${encodeURIComponent(proposal)}`}
                        style={{ textDecoration: "none", display: "inline-flex", alignItems: "center", gap: 5, fontSize: 11, fontWeight: 600, padding: "5px 10px", borderRadius: 8, background: GREEN_BG, color: GREEN, border: `1px solid rgba(74,222,128,0.25)`, cursor: "pointer" }}
                        data-testid="link-send-email">
                        <Mail size={11} />{ar ? "إرسال" : "Email"}
                      </a>
                    )}
                  </div>
                </div>
                <div style={{ background: "rgba(255,255,255,0.03)", border: `1px solid ${BORDER}`, borderRadius: 12, padding: "16px", fontSize: 13, lineHeight: 1.75, color: "rgba(255,255,255,0.75)", whiteSpace: "pre-wrap", fontFamily: "Georgia, serif", maxHeight: 400, overflowY: "auto" }}>
                  {proposal}
                </div>
                {selectedPublisher.submissionUrl && (
                  <a href={selectedPublisher.submissionUrl} target="_blank" rel="noopener noreferrer"
                    style={{ textDecoration: "none", display: "flex", alignItems: "center", justifyContent: "center", gap: 7, marginTop: 10, padding: "10px", borderRadius: 10, background: "transparent", color: MUTED, border: `1px solid ${BORDER}`, fontSize: 12, fontWeight: 600 }}
                    data-testid="link-submit-online">
                    <ExternalLink size={12} />{ar ? "التقديم عبر الموقع" : "Submit Online"}
                  </a>
                )}
                <p style={{ fontSize: 11, color: MUTED2, textAlign: "center", marginTop: 10, lineHeight: 1.5 }}>
                  {ar ? "راجع الرسالة وعدّلها قبل الإرسال." : "Review and personalise before sending. Always follow each publisher's specific guidelines."}
                </p>
              </div>
            )}
          </div>
        </div>
      , document.body)}
    </Layout>
  );
}
