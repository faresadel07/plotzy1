// Book Creation Wizard, full version.
//
// Replaces the old 3-step onboarding-wizard.tsx with a researched
// 10-question flow that gives the AI Studio enough context to actually
// be useful from page 1, and gives the writer a real plan instead of
// a blank cursor.
//
// Question set was drawn from what literary agents, professional
// editors, and the major writing tools (Sudowrite Story Bible,
// Reedsy Book Editor, NaNoWriMo planner) ask before a writer commits
// to a project. Order is sequential: each step needs the previous
// answer to render correctly (length defaults change with format +
// audience; setting only appears for fiction; etc.).
//
// Design rules (per user feedback):
//   - No em-dashes or en-dashes anywhere in user-facing copy
//   - No emoji
//   - Bilingual EN + AR for every label, helper, and option
//   - One question per screen; cannot advance until answered (where
//     required); back button always available
//   - Smart defaults so the writer can fly through if they want

import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence, type Variants } from "framer-motion";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  BookOpen, ArrowRight, ArrowLeft, Loader2, Wand2, Check,
  Feather, Newspaper, User, Baby, Globe2, Calendar,
  Target, Eye, Lightbulb, Pencil,
} from "lucide-react";
import { useLanguage } from "@/contexts/language-context";
import { useToast } from "@/hooks/use-toast";

// ─── Answer shape ────────────────────────────────────────────────────

export type BookFormat = "novel" | "novella" | "short_story" | "nonfiction" | "memoir" | "children";
export type BookAudience = "children" | "middle_grade" | "ya" | "new_adult" | "adult";

export interface WizardAnswers {
  format: BookFormat;
  title: string;
  authorName: string;
  genre: string;
  audience: BookAudience;
  targetWords: number;
  setting?: string;
  topic?: string;
  daysPerWeek: number;
  dailyWordGoal: number;
}

interface BookCreationWizardProps {
  open: boolean;
  onClose: () => void;
  onCreate: (answers: WizardAnswers) => Promise<void>;
}

// ─── Static data ─────────────────────────────────────────────────────

const FORMATS: Array<{ id: BookFormat; label: string; labelAr: string; tagline: string; taglineAr: string; icon: React.ReactNode; defaultWords: number }> = [
  { id: "novel",       label: "Novel",            labelAr: "رواية",         tagline: "40,000 words or more, 160 pages and up",  taglineAr: "40,000 كلمة فأكثر، 160 صفحة فأكثر",   icon: <BookOpen size={20} />,   defaultWords: 80_000 },
  { id: "novella",     label: "Novella",          labelAr: "رواية قصيرة",   tagline: "17,500 to 40,000 words, 70 to 160 pages", taglineAr: "17,500 إلى 40,000 كلمة، 70 إلى 160 صفحة", icon: <Feather size={20} />,    defaultWords: 25_000 },
  { id: "short_story", label: "Short Story",      labelAr: "قصّة قصيرة",    tagline: "Under 17,500 words, under 70 pages",      taglineAr: "أقل من 17,500 كلمة، أقل من 70 صفحة",   icon: <Pencil size={20} />,     defaultWords: 7_500 },
  { id: "nonfiction",  label: "Non Fiction",      labelAr: "كتاب فكري",      tagline: "Guide, essay, how to",                    taglineAr: "دليل، مقالة، شرح",                      icon: <Newspaper size={20} />,  defaultWords: 60_000 },
  { id: "memoir",      label: "Memoir",           labelAr: "سيرة ذاتية",     tagline: "Your story in your voice",                taglineAr: "حكايتك بصوتك",                          icon: <User size={20} />,       defaultWords: 70_000 },
  { id: "children",    label: "Children's Book",  labelAr: "كتاب أطفال",     tagline: "Under 12,000 words, under 48 pages",      taglineAr: "أقل من 12,000 كلمة، أقل من 48 صفحة",   icon: <Baby size={20} />,       defaultWords: 8_000 },
];

// Tap-only replacement for the old free-text "topic" question: what is
// the book trying to do for its reader? The English label is what the
// AI summary stores (prompts stay compact in English).
const NONFICTION_GOALS: Array<{ id: string; label: string; labelAr: string; sub: string; subAr: string }> = [
  { id: "teach",    label: "Teach a practical skill",      labelAr: "تعليم مهارة عمليّة",   sub: "Step by step, hands on",            subAr: "خطوة بخطوة وبشكل تطبيقي" },
  { id: "guide",    label: "Guide through a process",      labelAr: "دليل يشرح طريقاً",      sub: "From starting point to result",     subAr: "من نقطة البداية حتى النتيجة" },
  { id: "share",    label: "Share experience and lessons", labelAr: "مشاركة تجربة ودروس",   sub: "What worked and what did not",      subAr: "ما نجح وما لم ينجح" },
  { id: "inspire",  label: "Inspire and motivate",         labelAr: "إلهام وتحفيز",          sub: "Change how the reader thinks",      subAr: "تغيير طريقة تفكير القارئ" },
  { id: "document", label: "Document knowledge",           labelAr: "توثيق معرفة",           sub: "Organize a field or a story",       subAr: "تنظيم مجال أو حكاية" },
  { id: "life",     label: "Tell a life story",            labelAr: "سرد قصّة حياة",         sub: "Memoir and personal history",       subAr: "سيرة وذكريات شخصيّة" },
];

const FICTION_GENRES = [
  { id: "fantasy",          label: "Fantasy",          labelAr: "خيال" },
  { id: "scifi",            label: "Science Fiction",  labelAr: "خيال علمي" },
  { id: "romance",          label: "Romance",          labelAr: "رومانسي" },
  { id: "mystery",          label: "Mystery",          labelAr: "غموض" },
  { id: "thriller",         label: "Thriller",         labelAr: "إثارة" },
  { id: "literary",         label: "Literary",         labelAr: "أدبي" },
  { id: "historical",       label: "Historical",       labelAr: "تاريخي" },
  { id: "horror",           label: "Horror",           labelAr: "رعب" },
  { id: "contemporary",     label: "Contemporary",     labelAr: "معاصر" },
  { id: "adventure",        label: "Adventure",        labelAr: "مغامرة" },
  { id: "dystopian",        label: "Dystopian",        labelAr: "ديستوبيا" },
  { id: "other",            label: "Other",            labelAr: "أخرى" },
];
const NONFICTION_GENRES = [
  { id: "self_help",        label: "Self Help",        labelAr: "تطوير ذاتي" },
  { id: "business",         label: "Business",         labelAr: "أعمال" },
  { id: "biography",        label: "Biography",        labelAr: "سيرة" },
  { id: "history",          label: "History",          labelAr: "تاريخ" },
  { id: "science",          label: "Science",          labelAr: "علوم" },
  { id: "philosophy",       label: "Philosophy",       labelAr: "فلسفة" },
  { id: "religion",         label: "Religion",         labelAr: "دين" },
  { id: "psychology",       label: "Psychology",       labelAr: "علم نفس" },
  { id: "essay",            label: "Essays",           labelAr: "مقالات" },
  { id: "travel",           label: "Travel",           labelAr: "رحلات" },
  { id: "cooking",          label: "Cooking",          labelAr: "طبخ" },
  { id: "other",            label: "Other",            labelAr: "أخرى" },
];

const AUDIENCES: Array<{ id: BookAudience; label: string; labelAr: string; age: string; ageAr: string }> = [
  { id: "children",     label: "Children",     labelAr: "أطفال",      age: "Ages 5 to 8",    ageAr: "من 5 إلى 8" },
  { id: "middle_grade", label: "Middle Grade", labelAr: "ما قبل المراهقة", age: "Ages 8 to 12",   ageAr: "من 8 إلى 12" },
  { id: "ya",           label: "Young Adult",  labelAr: "يافعين",      age: "Ages 13 to 18",  ageAr: "من 13 إلى 18" },
  { id: "new_adult",    label: "New Adult",    labelAr: "شباب",        age: "Ages 18 to 25",  ageAr: "من 18 إلى 25" },
  { id: "adult",        label: "Adult",        labelAr: "كبار",        age: "Ages 18 and up", ageAr: "18 فأكثر" },
];

const SETTINGS_FICTION: Array<{ id: string; label: string; labelAr: string }> = [
  { id: "contemporary", label: "Contemporary, today",         labelAr: "معاصرة، اليوم" },
  { id: "historical",   label: "Historical, real past period", labelAr: "تاريخية، حقبة حقيقية" },
  { id: "future",       label: "Future or sci fi",            labelAr: "المستقبل أو خيال علمي" },
  { id: "fantasy",      label: "Invented fantasy world",      labelAr: "عالم خيالي مبتكر" },
  { id: "alt_reality",  label: "Alternate reality",           labelAr: "واقع موازٍ" },
];

// Words per printed trade-paperback page. Used everywhere length is
// shown in pages alongside word count.
const WORDS_PER_PAGE = 250;

// Helper: words to readable "X,XXX words (~Y pages)"
function fmtLength(words: number, ar: boolean): string {
  const pages = Math.round(words / WORDS_PER_PAGE);
  return ar
    ? `${words.toLocaleString("ar-EG")} كلمة (حوالي ${pages.toLocaleString("ar-EG")} صفحة)`
    : `${words.toLocaleString("en-US")} words (about ${pages.toLocaleString("en-US")} pages)`;
}

// ─── Component ───────────────────────────────────────────────────────

export function BookCreationWizard({ open, onClose, onCreate }: BookCreationWizardProps) {
  const { lang, isRTL } = useLanguage();
  const ar = lang === "ar";
  const { toast } = useToast();

  // ── Form state ──
  // Every answer is a TAP: no free-text questions anywhere in the
  // wizard. The book starts untitled (renaming lives in the editor and
  // the long-press sheet) and the author name defaults to the account.
  const [step, setStep] = useState<number>(1);
  const [format, setFormat] = useState<BookFormat | null>(null);
  const [genre, setGenre] = useState<string>("");
  const [audience, setAudience] = useState<BookAudience | null>(null);
  const [targetWords, setTargetWords] = useState<number>(80_000);
  const [setting, setSetting] = useState<string>("");
  const [topic, setTopic] = useState("");
  const [daysPerWeek, setDaysPerWeek] = useState<number>(5);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // ── Derived ──
  const isFiction = format && !["nonfiction", "memoir"].includes(format);
  const isChildren = format === "children";

  // Six steps total. Setting (fiction) and Goal (non-fiction) share
  // the same slot; both branches advance to the schedule step after.
  const totalSteps = 6;

  // Auto-advance: tapping a card on a pure-choice step moves straight
  // to the next question after a beat, so the selection registers
  // visually first. Sliders and multi-input steps keep the button.
  const advance = (apply: () => void) => {
    apply();
    window.setTimeout(() => {
      setStep((s) => (s < totalSteps ? s + 1 : s));
    }, 240);
  };

  // Default word goal as the writer crosses through the first three
  // steps; only nudges if they haven't manually touched it.
  useEffect(() => {
    if (!format) return;
    const base = FORMATS.find((f) => f.id === format)?.defaultWords ?? 80_000;
    let adjusted = base;
    if (audience === "ya" && isFiction && format === "novel") adjusted = 70_000;
    if (audience === "middle_grade" && isFiction) adjusted = 35_000;
    if (audience === "children") adjusted = isChildren ? 800 : 5_000;
    setTargetWords(adjusted);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [format, audience]);

  // Reset everything when the dialog opens fresh.
  useEffect(() => {
    if (!open) return;
    setStep(1);
    setFormat(null);
    setGenre("");
    setAudience(null);
    setTargetWords(80_000);
    setSetting("");
    setTopic("");
    setDaysPerWeek(5);
  }, [open]);

  // Daily word goal recomputes as the writer changes Q5 / Q10.
  const dailyWordGoal = useMemo(() => {
    if (!targetWords || !daysPerWeek) return 0;
    // 6-month target by default; the writer adjusts via daysPerWeek
    // and the implied weeks-per-target. 26 weeks * daysPerWeek = the
    // total writing days they're committing.
    const totalDays = 26 * daysPerWeek;
    return Math.max(50, Math.round(targetWords / totalDays));
  }, [targetWords, daysPerWeek]);

  // ── Navigation ──

  /** Steps the writer must answer to be allowed to advance. */
  const canAdvance = useMemo(() => {
    switch (step) {
      case 1: return !!format;
      case 2: return !!genre;
      case 3: return !!audience;
      case 4: return targetWords > 0;
      case 5: return isFiction ? !!setting : !!topic;
      case 6: return daysPerWeek > 0;
      default: return true;
    }
  }, [step, format, genre, audience, targetWords, setting, topic, daysPerWeek, isFiction]);

  const next = () => {
    if (!canAdvance) return;
    if (step >= totalSteps) {
      void submit();
      return;
    }
    setStep((s) => s + 1);
  };
  const back = () => {
    if (step <= 1) return;
    setStep((s) => s - 1);
  };

  const submit = async () => {
    if (!format || !genre || !audience) {
      toast({
        variant: "destructive",
        title: ar ? "معلومات ناقصة" : "Some answers are missing",
        description: ar
          ? "ارجع وتأكّد أن كل الأسئلة المطلوبة فيها جواب."
          : "Go back and make sure every required question has an answer.",
      });
      return;
    }
    setIsSubmitting(true);
    try {
      await onCreate({
        format,
        // No typing anywhere in the wizard: the book starts untitled
        // (named later in the editor) and the author name falls back
        // to the account's display name server-side.
        title: "",
        authorName: "",
        genre,
        audience,
        targetWords,
        setting: isFiction ? setting : undefined,
        topic: !isFiction ? topic : undefined,
        daysPerWeek,
        dailyWordGoal,
      });
      onClose();
    } finally {
      setIsSubmitting(false);
    }
  };

  // ── Render ──

  const stepVariants: Variants = {
    hidden: { opacity: 0, x: isRTL ? -20 : 20 },
    visible: { opacity: 1, x: 0, transition: { duration: 0.32, ease: [0.16, 1, 0.3, 1] } },
    exit:    { opacity: 0, x: isRTL ? 20 : -20, transition: { duration: 0.15 } },
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent
        // Phone (<640px): a true full-screen sheet — pinned to the
        // viewport, no centering transform, dynamic-viewport height so
        // the soft keyboard and short screens can never clip the
        // Continue/Create footer (the body scrolls instead).
        className="sm:max-w-3xl sm:rounded-3xl p-0 border-0 shadow-2xl overflow-hidden bg-card max-sm:left-0 max-sm:top-0 max-sm:translate-x-0 max-sm:translate-y-0 max-sm:h-[100dvh] max-sm:max-w-none max-sm:rounded-none"
        dir={isRTL ? "rtl" : "ltr"}
      >
        <div className="flex flex-col sm:min-h-[560px] max-sm:h-full">
          {/* Header strip with step counter + progress */}
          <header className="px-5 sm:px-8 pb-4 border-b border-border/40 pt-6 max-sm:pt-[calc(env(safe-area-inset-top)+14px)]">
            <div className="flex items-center justify-between mb-3">
              <div className="text-xs font-bold tracking-widest uppercase text-muted-foreground">
                {ar ? "إنشاء كتاب" : "Create a Book"}
              </div>
              <div className="text-xs text-muted-foreground tabular-nums">
                {ar ? `الخطوة ${step} من ${totalSteps}` : `Step ${step} of ${totalSteps}`}
              </div>
            </div>
            <div className="h-1 rounded-full bg-muted overflow-hidden">
              <div
                className="h-full bg-foreground transition-all duration-500 ease-out"
                style={{ width: `${(step / totalSteps) * 100}%` }}
              />
            </div>
          </header>

          {/* Body: one question per screen. min-h-0 + overflow lets it
              scroll inside the sheet instead of pushing the footer off. */}
          <div className="flex-1 min-h-0 overflow-y-auto px-5 py-6 sm:px-8 sm:py-10 flex flex-col">
            <AnimatePresence mode="wait">
              {step === 1 && (
                <motion.section key="s1" variants={stepVariants} initial="hidden" animate="visible" exit="exit" className="flex flex-col gap-6 flex-1">
                  <Q
                    title={ar ? "ما نوع الكتاب الذي تكتبه؟" : "What kind of book are you writing?"}
                    sub={ar ? "هذا يحدّد طول الكتاب ونوع الأسئلة التي ستليها." : "This sets your length target and the questions that follow."}
                  />
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {FORMATS.map((f) => (
                      <Choice
                        key={f.id}
                        active={format === f.id}
                        onClick={() => advance(() => setFormat(f.id))}
                        title={ar ? f.labelAr : f.label}
                        sub={ar ? f.taglineAr : f.tagline}
                        icon={f.icon}
                      />
                    ))}
                  </div>
                </motion.section>
              )}

              {step === 2 && (
                <motion.section key="s3" variants={stepVariants} initial="hidden" animate="visible" exit="exit" className="flex flex-col gap-6 flex-1">
                  <Q
                    title={ar ? "أيّ نوع أدبي يناسب؟" : "Which genre fits best?"}
                    sub={ar ? "اختر الأقرب. يمكنك إضافة نوع فرعي لاحقاً." : "Pick the closest one. You can add a subgenre later."}
                  />
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {(isFiction ? FICTION_GENRES : NONFICTION_GENRES).map((g) => (
                      <Pill
                        key={g.id}
                        active={genre === g.id}
                        onClick={() => advance(() => setGenre(g.id))}
                        label={ar ? g.labelAr : g.label}
                      />
                    ))}
                  </div>
                </motion.section>
              )}

              {step === 3 && (
                <motion.section key="s4" variants={stepVariants} initial="hidden" animate="visible" exit="exit" className="flex flex-col gap-6 flex-1">
                  <Q
                    title={ar ? "لمن هذا الكتاب؟" : "Who is this book for?"}
                    sub={ar ? "الفئة العمريّة المستهدفة. تحدّد الطول واللغة المناسبة." : "Target age range. This shapes length and tone defaults."}
                    icon={<Eye size={16} />}
                  />
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {AUDIENCES.map((a) => (
                      <Choice
                        key={a.id}
                        active={audience === a.id}
                        onClick={() => advance(() => setAudience(a.id))}
                        title={ar ? a.labelAr : a.label}
                        sub={ar ? a.ageAr : a.age}
                      />
                    ))}
                  </div>
                </motion.section>
              )}

              {step === 4 && (
                <motion.section key="s5" variants={stepVariants} initial="hidden" animate="visible" exit="exit" className="flex flex-col gap-6 flex-1">
                  <Q
                    title={ar ? "ما الطول الذي تستهدفه؟" : "What length are you aiming for?"}
                    sub={ar ? "اقتراحنا مناسب لنوعك. عدّله إن أردت." : "We pre-filled a typical length for your format. Adjust if you want."}
                    icon={<Target size={16} />}
                  />
                  <div className="max-w-xl space-y-5">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">{ar ? "عدد الكلمات" : "Word count"}</span>
                      <span className="font-semibold tabular-nums">{fmtLength(targetWords, ar)}</span>
                    </div>
                    <input
                      type="range"
                      min={isChildren ? 500 : 5_000}
                      max={150_000}
                      step={1_000}
                      value={targetWords}
                      onChange={(e) => setTargetWords(Number(e.target.value))}
                      className="w-full accent-foreground"
                    />
                    <div className="grid grid-cols-3 gap-2">
                      {[
                        { label: ar ? "قصير" : "Short",  v: isChildren ? 1_500  : 30_000 },
                        { label: ar ? "متوسّط" : "Medium", v: isChildren ? 8_000  : 80_000 },
                        { label: ar ? "طويل" : "Long",   v: isChildren ? 12_000 : 120_000 },
                      ].map((p) => (
                        <button
                          key={p.label}
                          onClick={() => setTargetWords(p.v)}
                          className={`px-3 py-2 rounded-lg text-xs font-semibold border transition-all ${
                            Math.abs(targetWords - p.v) < 1000
                              ? "bg-foreground text-background border-foreground"
                              : "bg-card border-border hover:border-muted-foreground"
                          }`}
                        >
                          {p.label}
                          <span className="block opacity-60 text-[10px] font-normal mt-0.5">
                            {p.v.toLocaleString(ar ? "ar-EG" : "en-US")} {ar ? "كلمة" : "words"}
                          </span>
                          <span className="block opacity-60 text-[10px] font-normal">
                            {ar
                              ? `حوالي ${Math.round(p.v / WORDS_PER_PAGE).toLocaleString("ar-EG")} صفحة`
                              : `about ${Math.round(p.v / WORDS_PER_PAGE).toLocaleString("en-US")} pages`}
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>
                </motion.section>
              )}

              {step === 5 && isFiction && (
                <motion.section key="s5-f" variants={stepVariants} initial="hidden" animate="visible" exit="exit" className="flex flex-col gap-6 flex-1">
                  <Q
                    title={ar ? "أين ومتى تدور القصّة؟" : "Where and when is your story set?"}
                    sub={ar ? "الإطار الزماني والمكاني." : "Time and place that frame the story."}
                    icon={<Globe2 size={16} />}
                  />
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {SETTINGS_FICTION.map((s) => (
                      <Choice
                        key={s.id}
                        active={setting === s.id}
                        onClick={() => advance(() => setSetting(s.id))}
                        title={ar ? s.labelAr : s.label}
                      />
                    ))}
                  </div>
                </motion.section>
              )}

              {step === 5 && !isFiction && (
                <motion.section key="s5-nf" variants={stepVariants} initial="hidden" animate="visible" exit="exit" className="flex flex-col gap-6 flex-1">
                  <Q
                    title={ar ? "ما هدف كتابك؟" : "What should your book do for the reader?"}
                    sub={ar ? "اختر الأقرب. الذكاء يستخدمه ليخصّص كل اقتراح لك." : "Pick the closest. The AI uses this to tailor every suggestion."}
                    icon={<Lightbulb size={16} />}
                  />
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {NONFICTION_GOALS.map((g) => (
                      <Choice
                        key={g.id}
                        active={topic === g.label}
                        onClick={() => advance(() => setTopic(g.label))}
                        title={ar ? g.labelAr : g.label}
                        sub={ar ? g.subAr : g.sub}
                      />
                    ))}
                  </div>
                </motion.section>
              )}

              {step === 6 && (
                <motion.section key="s7" variants={stepVariants} initial="hidden" animate="visible" exit="exit" className="flex flex-col gap-6 flex-1">
                  <Q
                    title={ar ? "ما هو جدول الكتابة؟" : "What's your writing schedule?"}
                    sub={ar ? "نحسب لك هدف الكلمات اليومي بناءً على هدف 6 أشهر." : "We'll calculate a daily word goal based on a 6 month target."}
                    icon={<Calendar size={16} />}
                  />
                  <div className="max-w-xl space-y-5">
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm text-muted-foreground">{ar ? "أيام الكتابة في الأسبوع" : "Writing days per week"}</span>
                        <span className="font-semibold tabular-nums">{daysPerWeek}</span>
                      </div>
                      <input
                        type="range"
                        min={1}
                        max={7}
                        step={1}
                        value={daysPerWeek}
                        onChange={(e) => setDaysPerWeek(Number(e.target.value))}
                        className="w-full accent-foreground"
                      />
                      <div className="flex justify-between text-[10px] text-muted-foreground tabular-nums mt-1">
                        <span>1</span><span>2</span><span>3</span><span>4</span><span>5</span><span>6</span><span>7</span>
                      </div>
                    </div>
                    <div className="rounded-xl p-4 bg-muted/40 border border-border">
                      <div className="text-xs text-muted-foreground mb-1">
                        {ar ? "هدف يومي" : "Daily goal"}
                      </div>
                      <div className="text-3xl font-bold tabular-nums">
                        {dailyWordGoal.toLocaleString(ar ? "ar-EG" : "en-US")}
                      </div>
                      <div className="text-xs text-muted-foreground mt-1">
                        {ar
                          ? `كلمة في اليوم. مسوّدة كاملة في 6 أشهر تقريباً (${targetWords.toLocaleString("ar-EG")} كلمة).`
                          : `words per day. Full draft in about 6 months (${targetWords.toLocaleString("en-US")} words).`}
                      </div>
                    </div>
                  </div>
                </motion.section>
              )}
            </AnimatePresence>
          </div>

          {/* Footer: Back / Next */}
          <footer className="px-5 sm:px-8 py-4 sm:py-5 max-sm:pb-[calc(env(safe-area-inset-bottom)+14px)] border-t border-border/40 flex items-center justify-between bg-card">
            {step > 1 ? (
              <Button variant="ghost" onClick={back} className="rounded-xl">
                {isRTL ? <ArrowRight className="w-4 h-4 mr-1.5" /> : <ArrowLeft className="w-4 h-4 mr-1.5" />}
                {ar ? "رجوع" : "Back"}
              </Button>
            ) : (
              <Button variant="ghost" className="rounded-xl opacity-0 pointer-events-none">Back</Button>
            )}
            {step < totalSteps ? (
              <Button onClick={next} disabled={!canAdvance} className="rounded-xl px-8 py-5 bg-foreground hover:bg-foreground/90 text-background font-semibold">
                {ar ? "التالي" : "Continue"}
                {isRTL ? <ArrowLeft className="w-4 h-4 ml-1.5" /> : <ArrowRight className="w-4 h-4 ml-1.5" />}
              </Button>
            ) : (
              <Button onClick={submit} disabled={!canAdvance || isSubmitting} className="rounded-xl px-8 py-5 bg-foreground hover:bg-foreground/90 text-background font-semibold">
                {isSubmitting
                  ? <><Loader2 className="w-4 h-4 mr-1.5 animate-spin" />{ar ? "جارٍ الإنشاء..." : "Creating..."}</>
                  : <><Wand2 className="w-4 h-4 mr-1.5" />{ar ? "أنشئ الكتاب" : "Create Book"}</>}
              </Button>
            )}
          </footer>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ─── Sub-components ──────────────────────────────────────────────────

function Q({ title, sub, icon }: { title: string; sub?: string; icon?: React.ReactNode }) {
  return (
    <div>
      <div className="flex items-center gap-2 mb-2 text-muted-foreground text-xs font-bold tracking-wider uppercase">
        {icon && icon}
        <span>{}</span>
      </div>
      <h2 className="text-2xl md:text-[28px] font-bold leading-tight text-foreground tracking-tight">{title}</h2>
      {sub && <p className="text-sm text-muted-foreground mt-2 leading-relaxed max-w-2xl">{sub}</p>}
    </div>
  );
}

function Choice({
  active, onClick, title, sub, icon,
}: {
  active: boolean;
  onClick: () => void;
  title: string;
  sub?: string;
  icon?: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`group p-4 rounded-xl border text-left transition-all duration-150 cursor-pointer flex items-start gap-3 ${
        active
          ? "border-foreground bg-foreground/[0.03] ring-2 ring-foreground/15"
          : "border-border hover:border-muted-foreground/40 hover:bg-muted/30"
      }`}
    >
      {icon && (
        <div className={`shrink-0 p-2 rounded-lg ${active ? "bg-foreground text-background" : "bg-muted text-muted-foreground"}`}>
          {icon}
        </div>
      )}
      <div className="flex-1 min-w-0">
        <div className="font-semibold text-foreground text-sm leading-snug">{title}</div>
        {sub && <div className="text-xs text-muted-foreground mt-0.5">{sub}</div>}
      </div>
      {active && <Check className="w-4 h-4 text-foreground shrink-0 mt-1" />}
    </button>
  );
}

function Pill({ active, onClick, label }: { active: boolean; onClick: () => void; label: string }) {
  return (
    <button
      onClick={onClick}
      className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-all ${
        active
          ? "bg-foreground text-background border-foreground"
          : "bg-transparent text-foreground border-border hover:border-muted-foreground/60"
      }`}
    >
      {label}
    </button>
  );
}

// Touch unused icon so tree-shake doesn't complain in dev. The icon
// is kept around for future use (a User-flagged "author" shortcut).
void User;
