import { useState, useMemo } from "react";
import { useRoute, Link } from "wouter";
import { useBook } from "@/hooks/use-books";
import { useChapters } from "@/hooks/use-chapters";
import { Layout } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/contexts/language-context";
import { PUBLISHERS, REGIONS, ALL_GENRES, type Publisher } from "@/shared/publishers";
import {
  ArrowLeft, Search, Globe, BookOpen, Mail, ExternalLink, Wand2, Copy,
  Check, Loader2, BookMarked, MapPin, Users, CheckCircle2, Send,
  FileDown, Lightbulb, ChevronRight, ClipboardList, PenLine, Star,
  Award, BookCheck, Sparkles, Info
} from "lucide-react";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription
} from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";

const REGION_FLAGS: Record<string, string> = {
  "North America": "🌎",
  "Europe": "🌍",
  "Middle East & North Africa": "🌙",
  "South Asia": "🌏",
  "East Asia": "🌏",
  "Latin America": "🌎",
  "Oceania": "🌏",
  "Africa": "🌍",
};

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
  publisher, isSelected, onSelect, ar,
}: { publisher: Publisher; isSelected: boolean; onSelect: () => void; ar: boolean }) {
  return (
    <button
      onClick={onSelect}
      className={`w-full text-left rounded-2xl border-2 p-5 transition-all duration-200 hover:shadow-md hover:-translate-y-0.5 ${
        isSelected
          ? "border-black dark:border-white bg-black/5 dark:bg-white/5 shadow-md"
          : "border-border bg-card hover:border-black/30 dark:hover:border-white/30"
      }`}
      data-testid={`card-publisher-${publisher.id}`}
    >
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex-1 min-w-0">
          <h3 className="font-bold text-sm text-foreground leading-tight mb-1">{publisher.name}</h3>
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <MapPin className="w-3 h-3 shrink-0" />
            <span>{publisher.country}</span>
            {publisher.founded && <span className="opacity-50">· est. {publisher.founded}</span>}
          </div>
        </div>
        <span className={`shrink-0 text-xs font-semibold px-2 py-1 rounded-full ${
          publisher.acceptsUnsolicited
            ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
            : "bg-black/8 text-foreground/70 dark:bg-white/8"
        }`}>
          {publisher.acceptsUnsolicited ? (ar ? "مباشر" : "Direct") : (ar ? "وكيل" : "Agent")}
        </span>
      </div>
      <p className="text-xs text-muted-foreground line-clamp-2 mb-3 leading-relaxed">{publisher.description}</p>
      <div className="flex flex-wrap gap-1">
        {publisher.genres.slice(0, 3).map(g => (
          <Badge key={g} variant="secondary" className="text-xs px-2 py-0.5 rounded-full">{g}</Badge>
        ))}
        {publisher.genres.length > 3 && (
          <Badge variant="outline" className="text-xs px-2 py-0.5 rounded-full">+{publisher.genres.length - 3}</Badge>
        )}
      </div>
    </button>
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

  const [activeTab, setActiveTab] = useState<"guide" | "publishers">("publishers");
  const [completedSteps, setCompletedSteps] = useState<Set<number>>(new Set());
  const [expandedStep, setExpandedStep] = useState<number | null>(1);

  const [search, setSearch] = useState("");
  const [selectedRegion, setSelectedRegion] = useState("All Regions");
  const [selectedGenre, setSelectedGenre] = useState("All Genres");
  const [onlyUnsolicited, setOnlyUnsolicited] = useState(false);
  const [selectedPublisher, setSelectedPublisher] = useState<Publisher | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [proposal, setProposal] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const totalWords = chapters?.reduce((acc, ch) => {
    const content = ch.content || "";
    let text = content;
    try { const pages = JSON.parse(content); if (Array.isArray(pages)) text = pages.join(" "); } catch {}
    return acc + text.split(/\s+/).filter(Boolean).length;
  }, 0) ?? 0;

  const filteredPublishers = useMemo(() => {
    return PUBLISHERS.filter(p => {
      const q = search.toLowerCase();
      const matchSearch = !q || p.name.toLowerCase().includes(q) || p.country.toLowerCase().includes(q) || p.genres.some(g => g.toLowerCase().includes(q));
      const matchRegion = selectedRegion === "All Regions" || p.region === selectedRegion;
      const matchGenre = selectedGenre === "All Genres" || p.genres.includes(selectedGenre);
      const matchUnsolicited = !onlyUnsolicited || p.acceptsUnsolicited;
      return matchSearch && matchRegion && matchGenre && matchUnsolicited;
    });
  }, [search, selectedRegion, selectedGenre, onlyUnsolicited]);

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

  const handleCopy = async () => {
    if (!proposal) return;
    await navigator.clipboard.writeText(proposal);
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

  const tabs = [
    { id: "publishers" as const, label: ar ? "دليل الناشرين" : "Publisher Directory", icon: BookMarked },
    { id: "guide" as const, label: ar ? "دليل النشر" : "Publishing Guide", icon: Lightbulb },
  ];

  return (
    <Layout>
      <div className="max-w-5xl mx-auto" dir={isRTL ? "rtl" : "ltr"}>

        {/* ── Page Header ─────────────────────────────────────────── */}
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-8">
          <div>
            <Link
              href={`/books/${bookId}`}
              className="inline-flex items-center text-sm font-medium text-muted-foreground hover:text-foreground transition-colors mb-4 group"
            >
              <ArrowLeft className="w-4 h-4 mr-1.5 group-hover:-translate-x-0.5 transition-transform rtl-flip" />
              {ar ? "العودة إلى الكتاب" : "Back to book"}
            </Link>
            <h1 className="text-3xl font-extrabold text-foreground leading-tight">
              {ar ? "النشر والتواصل مع الناشرين" : "Publish & Connect"}
            </h1>
            <p className="text-muted-foreground mt-1.5 text-base max-w-xl">
              {ar
                ? "دليلك الشامل لإتمام كتابك ونشره والتواصل مع الناشرين حول العالم"
                : "Your complete guide to finishing, preparing, and submitting your manuscript to publishers worldwide"}
            </p>
          </div>

          {/* Book card + Download */}
          {book && (
            <div className="flex flex-col gap-3 sm:items-end shrink-0">
              <div className="bg-card rounded-2xl border border-border p-4 flex items-center gap-3 shadow-sm w-full sm:w-auto">
                {book.coverImage ? (
                  <img src={book.coverImage} alt="" className="w-10 h-14 object-cover rounded-lg shadow-sm" />
                ) : (
                  <div className="w-10 h-14 rounded-lg bg-black/5 dark:bg-white/5 flex items-center justify-center shrink-0">
                    <BookOpen className="w-4 h-4 text-foreground/50" />
                  </div>
                )}
                <div className="min-w-0">
                  <p className="font-bold text-sm text-foreground truncate max-w-[180px]">{book.title}</p>
                  {book.authorName && <p className="text-xs text-muted-foreground truncate">{book.authorName}</p>}
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {totalWords > 0 ? `${totalWords.toLocaleString()} ${ar ? "كلمة" : "words"}` : (ar ? "لا توجد كلمات بعد" : "No words yet")}
                  </p>
                </div>
              </div>
              <Link href={`/books/${bookId}`}>
                <Button variant="outline" size="sm" className="rounded-xl border-border hover:border-black/40 dark:hover:border-white/40 font-semibold w-full sm:w-auto">
                  <FileDown className="w-4 h-4 mr-2" />
                  {ar ? "تحميل المخطوطة" : "Download Manuscript"}
                </Button>
              </Link>
            </div>
          )}
        </div>

        {/* ── Progress bar ────────────────────────────────────────── */}
        {activeTab === "guide" && (
          <div className="mb-6 bg-card rounded-2xl border border-border p-4">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-semibold text-foreground">
                {ar ? "تقدم دليل النشر" : "Publishing Roadmap Progress"}
              </p>
              <span className="text-sm font-bold text-foreground">
                {completedSteps.size}/{PUBLISHING_STEPS.length}
              </span>
            </div>
            <div className="w-full h-2 bg-foreground/10 rounded-full overflow-hidden">
              <div
                className="h-full bg-black dark:bg-white rounded-full transition-all duration-500"
                style={{ width: `${(completedSteps.size / PUBLISHING_STEPS.length) * 100}%` }}
              />
            </div>
            {completedSteps.size === PUBLISHING_STEPS.length && (
              <p className="text-xs text-green-600 dark:text-green-400 font-semibold mt-2 flex items-center gap-1">
                <Sparkles className="w-3.5 h-3.5" />
                {ar ? "أحسنت! أنت جاهز لتقديم مخطوطتك." : "Excellent! You're ready to submit your manuscript."}
              </p>
            )}
          </div>
        )}

        {/* ── Tabs ────────────────────────────────────────────────── */}
        <div className="flex gap-1 p-1 bg-muted/60 rounded-xl mb-8 w-full sm:w-fit">
          {tabs.map(tab => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold transition-all flex-1 sm:flex-none ${
                  activeTab === tab.id
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <Icon className="w-4 h-4" />
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* ═══════════════════════════════════════════════════════════
            PUBLISHING GUIDE TAB
        ═══════════════════════════════════════════════════════════ */}
        {activeTab === "guide" && (
          <div className="space-y-4">

            {/* Export reminder banner */}
            <div className="flex items-start gap-3 bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-2xl p-4 mb-6">
              <Info className="w-5 h-5 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-semibold text-blue-800 dark:text-blue-300">
                  {ar ? "نصيحة: احفظ مخطوطتك" : "Tip: Save your manuscript"}
                </p>
                <p className="text-xs text-blue-700/80 dark:text-blue-400/80 mt-0.5">
                  {ar
                    ? "قبل التقديم، تأكد من تحميل نسخة PDF أو Word من مخطوطتك من صفحة تفاصيل الكتاب."
                    : "Before submitting, make sure to download a PDF or Word copy of your manuscript from the book details page."}
                </p>
                <Link href={`/books/${bookId}`}>
                  <button className="text-xs font-semibold text-blue-700 dark:text-blue-300 underline underline-offset-2 mt-1">
                    {ar ? "اذهب إلى تفاصيل الكتاب ←" : "Go to Book Details →"}
                  </button>
                </Link>
              </div>
            </div>

            {PUBLISHING_STEPS.map((step) => {
              const Icon = step.icon;
              const isCompleted = completedSteps.has(step.id);
              const isExpanded = expandedStep === step.id;
              return (
                <div
                  key={step.id}
                  className={`rounded-2xl border-2 transition-all duration-200 overflow-hidden ${
                    isCompleted
                      ? "border-green-200 dark:border-green-800 bg-green-50/50 dark:bg-green-950/20"
                      : isExpanded
                        ? "border-black/20 dark:border-white/20 bg-card shadow-sm"
                        : "border-border bg-card hover:border-black/20 dark:hover:border-white/20"
                  }`}
                >
                  {/* Step header */}
                  <div className="flex items-center gap-4 p-5">
                    {/* Completion toggle */}
                    <button
                      onClick={() => toggleStep(step.id)}
                      className={`w-8 h-8 rounded-full border-2 flex items-center justify-center shrink-0 transition-all ${
                        isCompleted
                          ? "bg-green-500 border-green-500 text-white"
                          : "border-border hover:border-black/40 dark:hover:border-white/40"
                      }`}
                    >
                      {isCompleted ? <Check className="w-4 h-4" /> : <span className="text-xs font-bold text-muted-foreground">{step.id}</span>}
                    </button>

                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                      isCompleted ? "bg-green-100 dark:bg-green-900/30" : "bg-foreground/[0.06]"
                    }`}>
                      <Icon className={`w-4.5 h-4.5 ${isCompleted ? "text-green-600 dark:text-green-400" : "text-foreground/70"}`} />
                    </div>

                    <button
                      className="flex-1 min-w-0 text-left"
                      onClick={() => setExpandedStep(isExpanded ? null : step.id)}
                    >
                      <h3 className={`font-bold text-base leading-tight ${isCompleted ? "line-through text-muted-foreground" : "text-foreground"}`}>
                        {ar ? step.titleAr : step.title}
                      </h3>
                      {!isExpanded && (
                        <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">
                          {ar ? step.descAr : step.desc}
                        </p>
                      )}
                    </button>

                    <button onClick={() => setExpandedStep(isExpanded ? null : step.id)}>
                      <ChevronRight className={`w-4 h-4 text-muted-foreground shrink-0 transition-transform ${isExpanded ? "rotate-90" : ""}`} />
                    </button>
                  </div>

                  {/* Step body */}
                  {isExpanded && (
                    <div className="px-5 pb-5">
                      <div className="pl-[5rem] rtl:pl-0 rtl:pr-[5rem]">
                        <p className="text-sm text-muted-foreground leading-relaxed mb-4">
                          {ar ? step.descAr : step.desc}
                        </p>
                        <div className="bg-foreground/[0.03] rounded-xl p-4 border border-border/60">
                          <p className="text-xs font-bold text-foreground uppercase tracking-widest mb-3 flex items-center gap-1.5">
                            <Star className="w-3 h-3" />
                            {ar ? "نصائح مفيدة" : "Pro Tips"}
                          </p>
                          <ul className="space-y-2">
                            {(ar ? step.tipsAr : step.tips).map((tip, i) => (
                              <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
                                <CheckCircle2 className="w-3.5 h-3.5 text-green-500 shrink-0 mt-0.5" />
                                {tip}
                              </li>
                            ))}
                          </ul>
                        </div>
                        {step.id === 4 && (
                          <button
                            onClick={() => setActiveTab("publishers")}
                            className="mt-4 text-sm font-semibold text-foreground underline underline-offset-4 hover:no-underline flex items-center gap-1.5"
                          >
                            <BookMarked className="w-4 h-4" />
                            {ar ? "انتقل إلى دليل الناشرين ←" : "Browse Publisher Directory →"}
                          </button>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* ═══════════════════════════════════════════════════════════
            PUBLISHER DIRECTORY TAB
        ═══════════════════════════════════════════════════════════ */}
        {activeTab === "publishers" && (
          <div>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-3 mb-6">
              {[
                { label: ar ? "ناشر في القاعدة" : "Publishers", value: PUBLISHERS.length },
                { label: ar ? "قبول مباشر" : "Direct submissions", value: PUBLISHERS.filter(p => p.acceptsUnsolicited).length },
                { label: ar ? "منطقة عالمية" : "Global regions", value: REGIONS.length - 1 },
              ].map(stat => (
                <div key={stat.label} className="bg-card rounded-2xl border border-border p-4 text-center shadow-sm">
                  <div className="text-2xl font-extrabold text-foreground mb-0.5">{stat.value}</div>
                  <div className="text-xs text-muted-foreground leading-tight">{stat.label}</div>
                </div>
              ))}
            </div>

            {/* Search & Filters */}
            <div className="bg-card rounded-2xl border border-border p-4 mb-5 shadow-sm">
              <div className="flex flex-col sm:flex-row gap-3">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    placeholder={ar ? "ابحث بالاسم أو البلد أو النوع..." : "Search by name, country, or genre..."}
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    className="pl-9 rounded-xl border-border bg-background"
                    data-testid="input-publisher-search"
                  />
                </div>
                <Select value={selectedRegion} onValueChange={setSelectedRegion}>
                  <SelectTrigger className="w-full sm:w-48 rounded-xl border-border" data-testid="select-region">
                    <Globe className="w-4 h-4 mr-2 text-muted-foreground" />
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl">
                    {REGIONS.map(r => <SelectItem key={r} value={r}>{REGION_FLAGS[r] || "🌐"} {r}</SelectItem>)}
                  </SelectContent>
                </Select>
                <Select value={selectedGenre} onValueChange={setSelectedGenre}>
                  <SelectTrigger className="w-full sm:w-44 rounded-xl border-border" data-testid="select-genre">
                    <BookOpen className="w-4 h-4 mr-2 text-muted-foreground" />
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl">
                    {ALL_GENRES.map(g => <SelectItem key={g} value={g}>{g}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center gap-2 mt-3 pt-3 border-t border-border/40">
                <Switch id="unsolicited-toggle" checked={onlyUnsolicited} onCheckedChange={setOnlyUnsolicited} data-testid="switch-unsolicited" />
                <Label htmlFor="unsolicited-toggle" className="text-sm text-muted-foreground cursor-pointer">
                  {ar ? "يقبلون التقديم المباشر (بدون وكيل)" : "Only show publishers accepting direct submissions"}
                </Label>
              </div>
            </div>

            {/* Results bar */}
            <div className="flex items-center justify-between mb-4">
              <p className="text-sm text-muted-foreground">
                <span className="font-semibold text-foreground">{filteredPublishers.length}</span>{" "}
                {ar ? "ناشر" : `publisher${filteredPublishers.length !== 1 ? "s" : ""}`}
                {(search || selectedRegion !== "All Regions" || selectedGenre !== "All Genres" || onlyUnsolicited) && (
                  <span className="text-muted-foreground"> {ar ? "(مفلترة)" : "(filtered)"}</span>
                )}
              </p>
              {(search || selectedRegion !== "All Regions" || selectedGenre !== "All Genres" || onlyUnsolicited) && (
                <button
                  onClick={() => { setSearch(""); setSelectedRegion("All Regions"); setSelectedGenre("All Genres"); setOnlyUnsolicited(false); }}
                  className="text-xs font-medium text-foreground hover:underline"
                >
                  {ar ? "مسح الفلاتر" : "Clear filters"}
                </button>
              )}
            </div>

            {/* Publisher grid */}
            {filteredPublishers.length === 0 ? (
              <div className="text-center py-20 text-muted-foreground">
                <Search className="w-10 h-10 mx-auto mb-3 opacity-30" />
                <p className="font-semibold">{ar ? "لا توجد نتائج" : "No publishers found"}</p>
                <p className="text-sm mt-1">{ar ? "جرّب تغيير الفلاتر" : "Try adjusting your filters"}</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 pb-8">
                {filteredPublishers.map(pub => (
                  <PublisherCard
                    key={pub.id}
                    publisher={pub}
                    isSelected={selectedPublisher?.id === pub.id}
                    onSelect={() => setSelectedPublisher(pub)}
                    ar={ar}
                  />
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Publisher Detail Dialog ────────────────────────────────── */}
      <Dialog open={!!selectedPublisher} onOpenChange={(open) => !open && setSelectedPublisher(null)}>
        <DialogContent className="max-w-lg rounded-2xl max-h-[85vh] overflow-y-auto" dir={isRTL ? "rtl" : "ltr"}>
          {selectedPublisher && (
            <>
              <DialogHeader>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <DialogTitle className="text-xl font-bold text-foreground leading-tight">
                      {selectedPublisher.name}
                    </DialogTitle>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
                      <MapPin className="w-3.5 h-3.5" />
                      <span>{selectedPublisher.country}</span>
                      <span className="opacity-40">·</span>
                      <span>{REGION_FLAGS[selectedPublisher.region]} {selectedPublisher.region}</span>
                    </div>
                  </div>
                  <span className={`shrink-0 text-xs font-bold px-3 py-1.5 rounded-full flex items-center gap-1.5 ${
                    selectedPublisher.acceptsUnsolicited
                      ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                      : "bg-black/8 text-foreground/70 dark:bg-white/8"
                  }`}>
                    {selectedPublisher.acceptsUnsolicited
                      ? <><CheckCircle2 className="w-3.5 h-3.5" />{ar ? "يقبل مباشرة" : "Direct submissions"}</>
                      : <><Users className="w-3.5 h-3.5" />{ar ? "عبر وكيل" : "Agent required"}</>
                    }
                  </span>
                </div>
                <DialogDescription className="text-sm text-muted-foreground leading-relaxed mt-3">
                  {selectedPublisher.description}
                </DialogDescription>
              </DialogHeader>

              {selectedPublisher.notes && (
                <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-xl p-3 text-xs text-amber-800 dark:text-amber-300 mt-2">
                  <span className="font-semibold">{ar ? "ملاحظة: " : "Note: "}</span>
                  {selectedPublisher.notes}
                </div>
              )}

              <div className="space-y-4 mt-2">
                <div>
                  <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-2">{ar ? "الأجناس الأدبية" : "Genres"}</p>
                  <div className="flex flex-wrap gap-1.5">
                    {selectedPublisher.genres.map(g => <Badge key={g} variant="secondary" className="text-xs px-2.5 py-1 rounded-full">{g}</Badge>)}
                  </div>
                </div>
                <div>
                  <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-2">{ar ? "لغات النشر" : "Languages"}</p>
                  <div className="flex flex-wrap gap-1.5">
                    {selectedPublisher.languages.map(l => <Badge key={l} variant="outline" className="text-xs px-2.5 py-1 rounded-full">{l}</Badge>)}
                  </div>
                </div>
              </div>

              {/* Contact links */}
              <div className="flex flex-wrap gap-3 mt-4 pt-4 border-t border-border">
                <a href={selectedPublisher.website} target="_blank" rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-lg bg-foreground/[0.06] hover:bg-foreground/10 text-foreground transition-colors"
                  data-testid={`link-publisher-website-${selectedPublisher.id}`}
                >
                  <Globe className="w-3.5 h-3.5" />
                  {ar ? "الموقع الرسمي" : "Website"}
                  <ExternalLink className="w-3 h-3 opacity-60" />
                </a>
                {selectedPublisher.submissionUrl && (
                  <a href={selectedPublisher.submissionUrl} target="_blank" rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-lg bg-foreground/[0.06] hover:bg-foreground/10 text-foreground transition-colors"
                    data-testid={`link-publisher-submissions-${selectedPublisher.id}`}
                  >
                    <BookMarked className="w-3.5 h-3.5" />
                    {ar ? "إرشادات التقديم" : "Submit Guidelines"}
                    <ExternalLink className="w-3 h-3 opacity-60" />
                  </a>
                )}
                {selectedPublisher.submissionEmail && (
                  <a href={`mailto:${selectedPublisher.submissionEmail}`}
                    className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-lg bg-foreground/[0.06] hover:bg-foreground/10 text-foreground transition-colors"
                    data-testid={`link-publisher-email-${selectedPublisher.id}`}
                  >
                    <Mail className="w-3.5 h-3.5" />
                    {selectedPublisher.submissionEmail}
                  </a>
                )}
              </div>

              {/* Generate proposal */}
              <Button
                className="w-full rounded-xl font-bold py-5 text-[#FFFFF8] border-0 mt-2"
                style={{ background: "#111111", boxShadow: "0 4px 20px rgba(0,0,0,0.2)" }}
                onClick={() => handleGenerateProposal(selectedPublisher)}
                disabled={isGenerating}
                data-testid="button-generate-proposal"
              >
                {isGenerating
                  ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />{ar ? "جارٍ إنشاء الرسالة..." : "Generating proposal..."}</>
                  : <><Wand2 className="w-4 h-4 mr-2" />{ar ? "إنشاء رسالة تقديم بالذكاء الاصطناعي" : "Generate AI Submission Proposal"}</>
                }
              </Button>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* ── Proposal Dialog ────────────────────────────────────────── */}
      <Dialog open={!!proposal} onOpenChange={(open) => !open && setProposal(null)}>
        <DialogContent className="max-w-2xl rounded-2xl max-h-[85vh] overflow-y-auto" dir={isRTL ? "rtl" : "ltr"}>
          <DialogHeader>
            <DialogTitle className="text-xl font-bold flex items-center gap-2">
              <Send className="w-5 h-5" />
              {ar ? "رسالة التقديم" : "Submission Proposal"}
            </DialogTitle>
            <DialogDescription>
              {ar
                ? `رسالة احترافية جاهزة للإرسال إلى ${selectedPublisher?.name}`
                : `Ready to send to ${selectedPublisher?.name}`}
            </DialogDescription>
          </DialogHeader>
          <div className="mt-2 mb-4 bg-muted/40 rounded-xl p-5 text-sm leading-relaxed whitespace-pre-wrap text-foreground font-serif border border-border">
            {proposal}
          </div>
          <div className="flex flex-col sm:flex-row gap-3">
            <Button onClick={handleCopy} variant="outline" className="flex-1 rounded-xl border-2" data-testid="button-copy-proposal">
              {copied
                ? <><Check className="w-4 h-4 mr-2 text-green-500" />{ar ? "تم النسخ!" : "Copied!"}</>
                : <><Copy className="w-4 h-4 mr-2" />{ar ? "نسخ الرسالة" : "Copy to Clipboard"}</>
              }
            </Button>
            {selectedPublisher?.submissionEmail && (
              <a href={`mailto:${selectedPublisher.submissionEmail}?subject=${encodeURIComponent(`Manuscript Submission: ${book?.title || "My Book"}`)}&body=${encodeURIComponent(proposal || "")}`} className="flex-1" data-testid="link-send-email">
                <Button className="w-full rounded-xl font-bold border-0 text-[#FFFFF8]" style={{ background: "#111111" }}>
                  <Mail className="w-4 h-4 mr-2" />{ar ? "إرسال بالبريد الإلكتروني" : "Send via Email"}
                </Button>
              </a>
            )}
            {selectedPublisher?.submissionUrl && (
              <a href={selectedPublisher.submissionUrl} target="_blank" rel="noopener noreferrer" className="flex-1" data-testid="link-submit-online">
                <Button variant="outline" className="w-full rounded-xl border-2 font-bold">
                  <ExternalLink className="w-4 h-4 mr-2" />{ar ? "التقديم عبر الموقع" : "Submit Online"}
                </Button>
              </a>
            )}
          </div>
          <p className="text-xs text-muted-foreground mt-2 text-center">
            {ar
              ? "راجع الرسالة وعدّلها قبل الإرسال."
              : "Review and personalise before sending. Always follow each publisher's specific guidelines."}
          </p>
        </DialogContent>
      </Dialog>
    </Layout>
  );
}
