// Book Creation Wizard.
//
// Six questions, every one a tap, asked before a writer commits to a
// project. The answers seed the AI Studio's context and the book's own
// word goal, so a wrong answer here follows the writer for months. That
// is why each step constrains the next: the format decides which genres
// and reader ages are even offered, and the length slider can never be
// dragged outside what that format actually means.
//
// Question set was drawn from what literary agents, professional
// editors, and the major writing tools (Sudowrite Story Bible, Reedsy
// Book Editor, NaNoWriMo planner) ask before a writer starts.
//
// House rules for the copy in this file:
//   - No em-dashes or en-dashes anywhere in user-facing copy
//   - No emoji
//   - Bilingual EN + AR for every label, helper, and option
//   - Western digits in both languages, matching the rest of Plotzy
//   - One question per screen, back always available, smart defaults so
//     a writer who does not care can tap through in seconds

import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence, type Variants } from "framer-motion";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  BookOpen, ArrowRight, ArrowLeft, Loader2, Wand2, Check,
  Feather, Newspaper, User, Baby, Globe2, Calendar,
  Target, Users, Lightbulb, Pencil, Tag,
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

// ─── Formats ─────────────────────────────────────────────────────────
//
// `words` is the whole contract for the length step: the slider's own
// bounds and its three presets come from here, so the tagline a writer
// reads on step 1 and the range they get on step 4 can never disagree.
// `audiences` is the same idea for the reader step.

interface FormatDef {
  id: BookFormat;
  label: string; labelAr: string;
  tagline: string; taglineAr: string;
  icon: React.ReactNode;
  words: { min: number; max: number; default: number; short: number; medium: number; long: number };
  audiences: BookAudience[];
  /** Fiction branch asks for a setting; the rest are asked their purpose. */
  narrative: boolean;
}

const ADULT_AUDIENCES: BookAudience[] = ["middle_grade", "ya", "new_adult", "adult"];

const FORMATS: FormatDef[] = [
  {
    id: "novel", label: "Novel", labelAr: "رواية",
    tagline: "40,000 words and up", taglineAr: "40,000 كلمة فأكثر",
    icon: <BookOpen size={20} />, narrative: true, audiences: ADULT_AUDIENCES,
    words: { min: 40_000, max: 150_000, default: 80_000, short: 50_000, medium: 80_000, long: 120_000 },
  },
  {
    id: "novella", label: "Novella", labelAr: "رواية قصيرة",
    tagline: "17,500 to 40,000 words", taglineAr: "من 17,500 إلى 40,000 كلمة",
    icon: <Feather size={20} />, narrative: true, audiences: ADULT_AUDIENCES,
    words: { min: 17_500, max: 40_000, default: 25_000, short: 20_000, medium: 28_000, long: 38_000 },
  },
  {
    id: "short_story", label: "Short Story", labelAr: "قصّة قصيرة",
    tagline: "Up to 17,500 words", taglineAr: "حتى 17,500 كلمة",
    icon: <Pencil size={20} />, narrative: true, audiences: ADULT_AUDIENCES,
    words: { min: 1_000, max: 17_500, default: 7_500, short: 3_000, medium: 7_500, long: 15_000 },
  },
  {
    id: "nonfiction", label: "Non Fiction", labelAr: "كتاب فكري",
    tagline: "A guide, a study, or an argument", taglineAr: "دليل أو دراسة أو طرح فكرة",
    icon: <Newspaper size={20} />, narrative: false, audiences: ADULT_AUDIENCES,
    words: { min: 15_000, max: 150_000, default: 60_000, short: 30_000, medium: 60_000, long: 100_000 },
  },
  {
    id: "memoir", label: "Memoir", labelAr: "سيرة ذاتية",
    tagline: "Your own story in your own voice", taglineAr: "حكايتك بصوتك أنت",
    icon: <User size={20} />, narrative: false, audiences: ["ya", "new_adult", "adult"],
    words: { min: 20_000, max: 150_000, default: 70_000, short: 40_000, medium: 70_000, long: 110_000 },
  },
  {
    id: "children", label: "Children's Book", labelAr: "كتاب أطفال",
    tagline: "From a picture book to a first chapter book", taglineAr: "من كتاب مصوّر إلى أول كتاب فصول",
    icon: <Baby size={20} />, narrative: true, audiences: ["children", "middle_grade"],
    words: { min: 200, max: 12_000, default: 1_000, short: 600, medium: 1_500, long: 8_000 },
  },
];

const formatDef = (id: BookFormat) => FORMATS.find((f) => f.id === id)!;

// ─── Genres, one vocabulary per branch ───────────────────────────────

interface Option { id: string; label: string; labelAr: string; sub?: string; subAr?: string }

const FICTION_GENRES: Option[] = [
  { id: "fantasy",      label: "Fantasy",         labelAr: "خيال" },
  { id: "scifi",        label: "Science Fiction", labelAr: "خيال علمي" },
  { id: "romance",      label: "Romance",         labelAr: "رومانسي" },
  { id: "mystery",      label: "Mystery",         labelAr: "غموض" },
  { id: "thriller",     label: "Thriller",        labelAr: "إثارة" },
  { id: "literary",     label: "Literary",        labelAr: "أدبي" },
  { id: "historical",   label: "Historical",      labelAr: "تاريخي" },
  { id: "horror",       label: "Horror",          labelAr: "رعب" },
  { id: "contemporary", label: "Contemporary",    labelAr: "معاصر" },
  { id: "adventure",    label: "Adventure",       labelAr: "مغامرة" },
  { id: "dystopian",    label: "Dystopian",       labelAr: "ديستوبيا" },
  { id: "other",        label: "Something else",  labelAr: "شيء آخر" },
];

const NONFICTION_GENRES: Option[] = [
  { id: "self_help",  label: "Self Help",       labelAr: "تطوير ذاتي" },
  { id: "business",   label: "Business",        labelAr: "أعمال" },
  { id: "biography",  label: "Biography",       labelAr: "سيرة" },
  { id: "history",    label: "History",         labelAr: "تاريخ" },
  { id: "science",    label: "Science",         labelAr: "علوم" },
  { id: "philosophy", label: "Philosophy",      labelAr: "فلسفة" },
  { id: "religion",   label: "Religion",        labelAr: "دين" },
  { id: "psychology", label: "Psychology",      labelAr: "علم نفس" },
  { id: "essay",      label: "Essays",          labelAr: "مقالات" },
  { id: "travel",     label: "Travel",          labelAr: "رحلات" },
  { id: "cooking",    label: "Cooking",         labelAr: "طبخ" },
  { id: "other",      label: "Something else",  labelAr: "شيء آخر" },
];

// A children's book is a narrative, but none of the adult fiction
// genres describe one. Offering Horror and Dystopian to someone writing
// a picture book was the clearest sign the old branch was wrong.
const CHILDREN_GENRES: Option[] = [
  { id: "picture_book", label: "Picture Book",        labelAr: "كتاب مصوّر" },
  { id: "bedtime",      label: "Bedtime Story",       labelAr: "قصّة ما قبل النوم" },
  { id: "adventure",    label: "Adventure",           labelAr: "مغامرة" },
  { id: "animals",      label: "Animals",             labelAr: "حيوانات" },
  { id: "fable",        label: "Fable with a Lesson", labelAr: "حكاية بمغزى" },
  { id: "fantasy",      label: "Fantasy",             labelAr: "خيال" },
  { id: "educational",  label: "Learning Concepts",   labelAr: "تعليم ومفاهيم" },
  { id: "family",       label: "Family and Friends",  labelAr: "عائلة وأصدقاء" },
  { id: "humour",       label: "Funny Story",         labelAr: "قصّة مضحكة" },
  { id: "rhyme",        label: "Rhyming Story",       labelAr: "قصّة بقافية" },
  { id: "heroes",       label: "History and Heroes",  labelAr: "تاريخ وأبطال" },
  { id: "other",        label: "Something else",      labelAr: "شيء آخر" },
];

function genresFor(format: BookFormat): Option[] {
  if (format === "children") return CHILDREN_GENRES;
  return formatDef(format).narrative ? FICTION_GENRES : NONFICTION_GENRES;
}

// ─── Readers ─────────────────────────────────────────────────────────

const AUDIENCES: Array<Option & { id: BookAudience }> = [
  { id: "children",     label: "Children",     labelAr: "أطفال",           sub: "Ages 5 to 8",    subAr: "من 5 إلى 8 سنوات" },
  { id: "middle_grade", label: "Middle Grade", labelAr: "ما قبل المراهقة", sub: "Ages 8 to 12",   subAr: "من 8 إلى 12 سنة" },
  { id: "ya",           label: "Young Adult",  labelAr: "يافعون",          sub: "Ages 13 to 18",  subAr: "من 13 إلى 18 سنة" },
  { id: "new_adult",    label: "New Adult",    labelAr: "شباب",            sub: "Ages 18 to 25",  subAr: "من 18 إلى 25 سنة" },
  { id: "adult",        label: "Adult",        labelAr: "كبار",            sub: "Ages 18 and up", subAr: "18 سنة فأكثر" },
];

// ─── Story world / purpose ───────────────────────────────────────────

const SETTINGS_FICTION: Option[] = [
  { id: "contemporary", label: "Today, the real world",   labelAr: "اليوم، في العالم الواقعي" },
  { id: "historical",   label: "A real period in history", labelAr: "حقبة حقيقية من التاريخ" },
  { id: "future",       label: "The future",              labelAr: "المستقبل" },
  { id: "fantasy",      label: "An invented world",       labelAr: "عالم من ابتكارك" },
  { id: "alt_reality",  label: "Our world, changed",      labelAr: "عالمنا لكن مختلفاً" },
  { id: "undecided",    label: "Not decided yet",         labelAr: "لم أقرّر بعد" },
];

const SETTINGS_CHILDREN: Option[] = [
  { id: "home_school", label: "Home and school",     labelAr: "البيت والمدرسة" },
  { id: "nature",      label: "Forest, sea or farm", labelAr: "الغابة أو البحر أو المزرعة" },
  { id: "imaginary",   label: "An imaginary world",  labelAr: "عالم خيالي" },
  { id: "city",        label: "A town or a city",    labelAr: "بلدة أو مدينة" },
  { id: "space",       label: "Space and the stars", labelAr: "الفضاء والنجوم" },
  { id: "long_ago",    label: "Long ago",            labelAr: "قديم الزمان" },
];

const PURPOSES: Option[] = [
  { id: "teach",    label: "Teach a practical skill",      labelAr: "تعليم مهارة عمليّة",  sub: "Step by step, hands on",        subAr: "خطوة بخطوة وبشكل تطبيقي" },
  { id: "guide",    label: "Guide through a process",      labelAr: "دليل يشرح طريقاً",     sub: "From starting point to result", subAr: "من نقطة البداية حتى النتيجة" },
  { id: "share",    label: "Share experience and lessons", labelAr: "مشاركة تجربة ودروس",  sub: "What worked and what did not",  subAr: "ما نجح وما لم ينجح" },
  { id: "inspire",  label: "Inspire and motivate",         labelAr: "إلهام وتحفيز",         sub: "Change how the reader thinks",  subAr: "تغيير طريقة تفكير القارئ" },
  { id: "document", label: "Document knowledge",           labelAr: "توثيق معرفة",          sub: "Organise a field or a story",   subAr: "تنظيم مجال أو حكاية" },
  { id: "life",     label: "Tell a life story",            labelAr: "سرد قصّة حياة",        sub: "Memoir and personal history",   subAr: "سيرة وذكريات شخصيّة" },
];

// ─── Length maths ────────────────────────────────────────────────────

/**
 * Printed pages for a word count.
 *
 * A single 250 words per page figure is right for an adult trade
 * paperback and badly wrong for children: it told a writer their
 * 800 word picture book was three pages long. Picture books carry very
 * little text per page and print in eight page signatures; a first
 * chapter book sits in between.
 */
export function estimatePages(format: BookFormat, words: number): number {
  if (format === "children") {
    if (words <= 1_500) return Math.max(16, Math.round(words / 30 / 8) * 8);
    return Math.max(24, Math.round(words / 150));
  }
  return Math.max(1, Math.round(words / 250));
}

/** "80,000 words (about 320 pages)" in either language, Western digits. */
function fmtLength(format: BookFormat, words: number, ar: boolean): string {
  const w = words.toLocaleString("en-US");
  const p = estimatePages(format, words).toLocaleString("en-US");
  return ar ? `${w} كلمة (حوالي ${p} صفحة)` : `${w} words (about ${p} pages)`;
}

/** Slider step that stays usable across a 200 word and a 150,000 word range. */
function sliderStep(max: number): number {
  if (max <= 12_000) return 100;
  if (max <= 40_000) return 500;
  return 1_000;
}

// ─── Component ───────────────────────────────────────────────────────

export function BookCreationWizard({ open, onClose, onCreate }: BookCreationWizardProps) {
  const { lang, isRTL } = useLanguage();
  const ar = lang === "ar";
  const { toast } = useToast();

  // Every answer is a tap: no free-text questions anywhere. The book
  // starts untitled (renaming lives in the editor and the long-press
  // sheet) and the author name falls back to the account server-side.
  const [step, setStep] = useState(1);
  const [format, setFormat] = useState<BookFormat | null>(null);
  const [genre, setGenre] = useState("");
  const [audience, setAudience] = useState<BookAudience | null>(null);
  const [targetWords, setTargetWords] = useState(80_000);
  const [lengthTouched, setLengthTouched] = useState(false);
  const [setting, setSetting] = useState("");
  const [purpose, setPurpose] = useState("");
  const [daysPerWeek, setDaysPerWeek] = useState(5);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const def = format ? formatDef(format) : null;
  const isNarrative = !!def?.narrative;
  const totalSteps = 6;

  // Tapping a card on a pure-choice step moves to the next question
  // after a beat, so the selection registers visually first.
  const advance = (apply: () => void) => {
    apply();
    window.setTimeout(() => setStep((s) => (s < totalSteps ? s + 1 : s)), 240);
  };

  // Reset when the dialog opens fresh.
  useEffect(() => {
    if (!open) return;
    setStep(1);
    setFormat(null);
    setGenre("");
    setAudience(null);
    setTargetWords(80_000);
    setLengthTouched(false);
    setSetting("");
    setPurpose("");
    setDaysPerWeek(5);
  }, [open]);

  // Changing the format resets the answers that depend on it, because a
  // genre or a reader age from the previous branch may not exist in the
  // new one. Without this, switching Novel to Children's Book kept a
  // "Dystopian, adult" answer that its own option list never offers.
  useEffect(() => {
    if (!format) return;
    const d = formatDef(format);
    setGenre((g) => (genresFor(format).some((x) => x.id === g) ? g : ""));
    setAudience((a) => (a && d.audiences.includes(a) ? a : null));
    setSetting((s) => {
      const list = format === "children" ? SETTINGS_CHILDREN : SETTINGS_FICTION;
      return list.some((x) => x.id === s) ? s : "";
    });
    // A length the writer chose by hand is theirs to keep, but it still
    // has to be legal for the new format.
    setTargetWords((w) =>
      lengthTouched ? Math.min(d.words.max, Math.max(d.words.min, w)) : d.words.default,
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [format]);

  // The reader's age nudges the suggested length, but never overrides a
  // length the writer set themselves.
  useEffect(() => {
    if (!format || !audience || lengthTouched) return;
    const d = formatDef(format);
    let suggested = d.words.default;
    if (format === "novel" && audience === "ya") suggested = 70_000;
    if (format === "novel" && audience === "middle_grade") suggested = 40_000;
    setTargetWords(Math.min(d.words.max, Math.max(d.words.min, suggested)));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [audience]);

  const setLength = (v: number) => {
    setLengthTouched(true);
    setTargetWords(v);
  };

  // 26 weeks is six months; daysPerWeek is the writer's real commitment.
  const dailyWordGoal = useMemo(() => {
    if (!targetWords || !daysPerWeek) return 0;
    return Math.max(50, Math.round(targetWords / (26 * daysPerWeek)));
  }, [targetWords, daysPerWeek]);

  const canAdvance = useMemo(() => {
    switch (step) {
      case 1: return !!format;
      case 2: return !!genre;
      case 3: return !!audience;
      case 4: return targetWords > 0;
      case 5: return isNarrative ? !!setting : !!purpose;
      case 6: return daysPerWeek > 0;
      default: return true;
    }
  }, [step, format, genre, audience, targetWords, setting, purpose, daysPerWeek, isNarrative]);

  const next = () => {
    if (!canAdvance) return;
    if (step >= totalSteps) { void submit(); return; }
    setStep((s) => s + 1);
  };
  const back = () => setStep((s) => (s > 1 ? s - 1 : s));

  const submit = async () => {
    if (!format || !genre || !audience || (isNarrative ? !setting : !purpose)) {
      toast({
        variant: "destructive",
        title: ar ? "معلومات ناقصة" : "Some answers are missing",
        description: ar
          ? "ارجع وتأكّد أن كل سؤال فيه جواب."
          : "Go back and make sure every question has an answer.",
      });
      return;
    }
    setIsSubmitting(true);
    try {
      const purposeDef = PURPOSES.find((p) => p.id === purpose);
      const settingList = format === "children" ? SETTINGS_CHILDREN : SETTINGS_FICTION;
      const settingDef = settingList.find((s) => s.id === setting);
      await onCreate({
        format,
        title: "",
        authorName: "",
        genre,
        audience,
        targetWords,
        // English labels, not raw ids: the Studio reads these straight
        // into its prompt, where "alt_reality" means nothing.
        setting: isNarrative ? settingDef?.label : undefined,
        topic: !isNarrative ? purposeDef?.label : undefined,
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
    hidden:  { opacity: 0, x: isRTL ? -20 : 20 },
    visible: { opacity: 1, x: 0, transition: { duration: 0.32, ease: [0.16, 1, 0.3, 1] } },
    exit:    { opacity: 0, x: isRTL ? 20 : -20, transition: { duration: 0.15 } },
  };

  const audienceOptions = AUDIENCES.filter((a) => !def || def.audiences.includes(a.id));
  const settingOptions = format === "children" ? SETTINGS_CHILDREN : SETTINGS_FICTION;
  const L = def?.words;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent
        // Radix focuses the first focusable child on open. On a grid of
        // option cards that painted a ring around the first one, which
        // reads as a selection that was never made.
        onOpenAutoFocus={(e) => e.preventDefault()}
        // Phone (<640px): a true full-screen sheet, pinned to the
        // viewport with no centering transform, dynamic-viewport height
        // so a short screen can never clip the footer.
        className="sm:max-w-3xl sm:rounded-3xl p-0 border-0 shadow-2xl overflow-hidden bg-card max-sm:left-0 max-sm:top-0 max-sm:translate-x-0 max-sm:translate-y-0 max-sm:h-[100dvh] max-sm:max-w-none max-sm:rounded-none"
        dir={isRTL ? "rtl" : "ltr"}
      >
        <div className="flex flex-col sm:min-h-[600px] max-sm:h-full">
          {/* Header: step counter and progress */}
          <header className="px-5 sm:px-8 pb-4 border-b border-border/40 pt-6 max-sm:pt-[calc(env(safe-area-inset-top)+14px)]">
            {/* The dialog's own close button is pinned to the physical
                right (`absolute right-4`), which does not mirror in RTL.
                So the padding that keeps that corner clear is physical
                too: in English it protects the step counter, in Arabic it
                protects the title. */}
            <div className="flex items-center justify-between gap-3 mb-3 pr-7">
              <div className="text-[11px] font-bold tracking-[0.18em] uppercase text-muted-foreground">
                {ar ? "إنشاء كتاب" : "Create a Book"}
              </div>
              <div className="text-[11px] text-muted-foreground tabular-nums shrink-0">
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

          {/* Body: one question per screen, scrolls inside the sheet. */}
          <div className="flex-1 min-h-0 overflow-y-auto px-5 py-6 sm:px-8 sm:py-9 flex flex-col">
            <AnimatePresence mode="wait">

              {step === 1 && (
                <motion.section key="format" variants={stepVariants} initial="hidden" animate="visible" exit="exit" className="flex flex-col gap-6 flex-1">
                  <Q
                    eyebrow={ar ? "النوع" : "Format"}
                    icon={<BookOpen size={14} />}
                    title={ar ? "ما نوع الكتاب الذي تكتبه؟" : "What kind of book are you writing?"}
                    sub={ar ? "يحدّد هذا طول الكتاب والأسئلة التي ستليه." : "This sets your length target and the questions that follow."}
                  />
                  <OptionGrid cols={2}>
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
                  </OptionGrid>
                </motion.section>
              )}

              {step === 2 && (
                <motion.section key="genre" variants={stepVariants} initial="hidden" animate="visible" exit="exit" className="flex flex-col gap-6 flex-1">
                  <Q
                    eyebrow={ar ? "التصنيف" : "Genre"}
                    icon={<Tag size={14} />}
                    title={ar ? "أيّ تصنيف يناسب كتابك؟" : "Which genre fits your book?"}
                    sub={ar ? "اختر الأقرب. يمكنك تغييره في أي وقت." : "Pick the closest one. You can change it any time."}
                  />
                  <OptionGrid cols={3}>
                    {genresFor(format!).map((g) => (
                      <Chip
                        key={g.id}
                        active={genre === g.id}
                        onClick={() => advance(() => setGenre(g.id))}
                        label={ar ? g.labelAr : g.label}
                      />
                    ))}
                  </OptionGrid>
                </motion.section>
              )}

              {step === 3 && (
                <motion.section key="audience" variants={stepVariants} initial="hidden" animate="visible" exit="exit" className="flex flex-col gap-6 flex-1">
                  <Q
                    eyebrow={ar ? "القارئ" : "Reader"}
                    icon={<Users size={14} />}
                    title={ar ? "لمن هذا الكتاب؟" : "Who is this book for?"}
                    sub={ar
                      ? "الفئة العمريّة المستهدفة. تحدّد الطول واللغة المناسبة."
                      : "The age you are writing for. It shapes length and tone."}
                  />
                  <OptionGrid cols={2}>
                    {audienceOptions.map((a) => (
                      <Choice
                        key={a.id}
                        active={audience === a.id}
                        onClick={() => advance(() => setAudience(a.id))}
                        title={ar ? a.labelAr : a.label}
                        sub={ar ? a.subAr : a.sub}
                      />
                    ))}
                  </OptionGrid>
                </motion.section>
              )}

              {step === 4 && L && (
                <motion.section key="length" variants={stepVariants} initial="hidden" animate="visible" exit="exit" className="flex flex-col gap-6 flex-1">
                  <Q
                    eyebrow={ar ? "الطول" : "Length"}
                    icon={<Target size={14} />}
                    title={ar ? "ما الطول الذي تستهدفه؟" : "What length are you aiming for?"}
                    sub={ar
                      ? "اخترنا لك طولاً معتاداً لنوعك. عدّله كما تريد."
                      : "We picked a typical length for your format. Adjust it however you like."}
                  />

                  <div className="max-w-xl w-full space-y-6">
                    {/* Current value, large and unmistakable */}
                    <div className="rounded-2xl border border-border bg-muted/30 px-5 py-4">
                      <div className="text-[11px] font-bold tracking-[0.16em] uppercase text-muted-foreground mb-1">
                        {ar ? "الهدف" : "Target"}
                      </div>
                      <div className="text-[32px] leading-none font-bold tabular-nums text-foreground">
                        {targetWords.toLocaleString("en-US")}
                      </div>
                      <div className="text-sm text-muted-foreground mt-1.5">
                        {ar
                          ? `كلمة، حوالي ${estimatePages(format!, targetWords).toLocaleString("en-US")} صفحة مطبوعة`
                          : `words, about ${estimatePages(format!, targetWords).toLocaleString("en-US")} printed pages`}
                      </div>
                    </div>

                    <div>
                      <input
                        type="range"
                        aria-label={ar ? "عدد الكلمات المستهدف" : "Target word count"}
                        min={L.min}
                        max={L.max}
                        step={sliderStep(L.max)}
                        value={targetWords}
                        onChange={(e) => setLength(Number(e.target.value))}
                        className="w-full accent-foreground h-6"
                      />
                      <div className="flex justify-between text-[11px] text-muted-foreground tabular-nums mt-1">
                        <span>{L.min.toLocaleString("en-US")}</span>
                        <span>{L.max.toLocaleString("en-US")}</span>
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-2.5">
                      {([
                        { key: "short",  label: ar ? "قصير"   : "Short",  v: L.short },
                        { key: "medium", label: ar ? "متوسّط" : "Medium", v: L.medium },
                        { key: "long",   label: ar ? "طويل"   : "Long",   v: L.long },
                      ] as const).map((p) => {
                        const on = Math.abs(targetWords - p.v) < sliderStep(L.max);
                        return (
                          <button
                            key={p.key}
                            onClick={() => setLength(p.v)}
                            aria-pressed={on}
                            className={`min-h-[68px] px-3 py-3 rounded-xl border text-center transition-colors duration-150 ${
                              on
                                ? "bg-foreground text-background border-foreground"
                                : "bg-card border-border hover:border-muted-foreground/50 active:bg-muted/50"
                            }`}
                          >
                            <span className="block text-[13px] font-semibold leading-none">{p.label}</span>
                            <span className="block text-[11px] tabular-nums opacity-65 mt-1.5 leading-none">
                              {p.v.toLocaleString("en-US")}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </motion.section>
              )}

              {step === 5 && isNarrative && (
                <motion.section key="setting" variants={stepVariants} initial="hidden" animate="visible" exit="exit" className="flex flex-col gap-6 flex-1">
                  <Q
                    eyebrow={ar ? "العالم" : "World"}
                    icon={<Globe2 size={14} />}
                    title={format === "children"
                      ? (ar ? "أين تدور الحكاية؟" : "Where does the story happen?")
                      : (ar ? "أين ومتى تدور القصّة؟" : "Where and when is your story set?")}
                    sub={ar ? "الإطار الذي تعيش فيه الأحداث." : "The world the events live in."}
                  />
                  <OptionGrid cols={2}>
                    {settingOptions.map((s) => (
                      <Choice
                        key={s.id}
                        active={setting === s.id}
                        onClick={() => advance(() => setSetting(s.id))}
                        title={ar ? s.labelAr : s.label}
                      />
                    ))}
                  </OptionGrid>
                </motion.section>
              )}

              {step === 5 && !isNarrative && (
                <motion.section key="purpose" variants={stepVariants} initial="hidden" animate="visible" exit="exit" className="flex flex-col gap-6 flex-1">
                  <Q
                    eyebrow={ar ? "الهدف" : "Purpose"}
                    icon={<Lightbulb size={14} />}
                    title={ar ? "ما الذي يقدّمه كتابك لقارئه؟" : "What should your book do for the reader?"}
                    sub={ar ? "اختر الأقرب. يستخدمه الذكاء ليخصّص كل اقتراح لك." : "Pick the closest. The AI uses this to tailor every suggestion."}
                  />
                  <OptionGrid cols={2}>
                    {PURPOSES.map((p) => (
                      <Choice
                        key={p.id}
                        active={purpose === p.id}
                        onClick={() => advance(() => setPurpose(p.id))}
                        title={ar ? p.labelAr : p.label}
                        sub={ar ? p.subAr : p.sub}
                      />
                    ))}
                  </OptionGrid>
                </motion.section>
              )}

              {step === 6 && (
                <motion.section key="schedule" variants={stepVariants} initial="hidden" animate="visible" exit="exit" className="flex flex-col gap-6 flex-1">
                  <Q
                    eyebrow={ar ? "الجدول" : "Schedule"}
                    icon={<Calendar size={14} />}
                    title={ar ? "كم يوماً في الأسبوع ستكتب؟" : "How many days a week will you write?"}
                    sub={ar
                      ? "نحسب لك هدفاً يوميّاً يوصلك إلى مسوّدة كاملة خلال ستة أشهر."
                      : "We turn that into a daily goal that reaches a full draft in six months."}
                  />

                  <div className="max-w-xl w-full space-y-6">
                    <div className="grid grid-cols-7 gap-1.5">
                      {[1, 2, 3, 4, 5, 6, 7].map((d) => (
                        <button
                          key={d}
                          onClick={() => setDaysPerWeek(d)}
                          aria-pressed={daysPerWeek === d}
                          aria-label={ar ? `${d} أيام في الأسبوع` : `${d} days per week`}
                          className={`h-12 rounded-xl border text-sm font-bold tabular-nums transition-colors duration-150 ${
                            daysPerWeek === d
                              ? "bg-foreground text-background border-foreground"
                              : "bg-card border-border text-foreground hover:border-muted-foreground/50 active:bg-muted/50"
                          }`}
                        >
                          {d}
                        </button>
                      ))}
                    </div>

                    <div className="rounded-2xl border border-border bg-muted/30 px-5 py-4">
                      <div className="text-[11px] font-bold tracking-[0.16em] uppercase text-muted-foreground mb-1">
                        {ar ? "هدفك اليومي" : "Your daily goal"}
                      </div>
                      <div className="text-[32px] leading-none font-bold tabular-nums text-foreground">
                        {dailyWordGoal.toLocaleString("en-US")}
                      </div>
                      <div className="text-sm text-muted-foreground mt-1.5">
                        {ar
                          ? `كلمة في اليوم، ${daysPerWeek} أيام في الأسبوع.`
                          : `words a day, ${daysPerWeek} days a week.`}
                      </div>
                    </div>

                    {/* A last look at every answer, so a wrong tap is caught
                        here rather than six months into the draft. */}
                    <div className="rounded-2xl border border-border overflow-hidden">
                      <div className="px-4 py-2.5 bg-muted/40 text-[11px] font-bold tracking-[0.16em] uppercase text-muted-foreground border-b border-border">
                        {ar ? "ملخّص كتابك" : "Your book"}
                      </div>
                      <dl className="divide-y divide-border/60">
                        <SummaryRow
                          label={ar ? "النوع" : "Format"}
                          value={ar ? def!.labelAr : def!.label}
                          onEdit={() => setStep(1)} editLabel={ar ? "تغيير" : "Change"}
                        />
                        <SummaryRow
                          label={ar ? "التصنيف" : "Genre"}
                          value={(() => { const g = genresFor(format!).find((x) => x.id === genre); return ar ? g?.labelAr ?? "" : g?.label ?? ""; })()}
                          onEdit={() => setStep(2)} editLabel={ar ? "تغيير" : "Change"}
                        />
                        <SummaryRow
                          label={ar ? "القارئ" : "Reader"}
                          value={(() => { const a = AUDIENCES.find((x) => x.id === audience); return ar ? a?.labelAr ?? "" : a?.label ?? ""; })()}
                          onEdit={() => setStep(3)} editLabel={ar ? "تغيير" : "Change"}
                        />
                        <SummaryRow
                          label={ar ? "الطول" : "Length"}
                          value={fmtLength(format!, targetWords, ar)}
                          onEdit={() => setStep(4)} editLabel={ar ? "تغيير" : "Change"}
                        />
                        <SummaryRow
                          label={isNarrative ? (ar ? "العالم" : "World") : (ar ? "الهدف" : "Purpose")}
                          value={(() => {
                            if (isNarrative) { const s = settingOptions.find((x) => x.id === setting); return ar ? s?.labelAr ?? "" : s?.label ?? ""; }
                            const p = PURPOSES.find((x) => x.id === purpose); return ar ? p?.labelAr ?? "" : p?.label ?? "";
                          })()}
                          onEdit={() => setStep(5)} editLabel={ar ? "تغيير" : "Change"}
                        />
                      </dl>
                    </div>
                  </div>
                </motion.section>
              )}

            </AnimatePresence>
          </div>

          {/* Footer: back and forward */}
          <footer className="px-5 sm:px-8 py-4 sm:py-5 max-sm:pb-[calc(env(safe-area-inset-bottom)+14px)] border-t border-border/40 flex items-center justify-between gap-3 bg-card">
            {step > 1 ? (
              <Button variant="ghost" onClick={back} className="rounded-xl h-11 px-4">
                {isRTL ? <ArrowRight className="w-4 h-4 ms-0 me-1.5" /> : <ArrowLeft className="w-4 h-4 me-1.5" />}
                {ar ? "رجوع" : "Back"}
              </Button>
            ) : (
              <span aria-hidden="true" />
            )}
            {step < totalSteps ? (
              <Button
                onClick={next}
                disabled={!canAdvance}
                className="rounded-xl h-11 px-7 bg-foreground hover:bg-foreground/90 text-background font-semibold"
              >
                {ar ? "التالي" : "Continue"}
                {isRTL ? <ArrowLeft className="w-4 h-4 ms-1.5" /> : <ArrowRight className="w-4 h-4 ms-1.5" />}
              </Button>
            ) : (
              <Button
                onClick={submit}
                disabled={!canAdvance || isSubmitting}
                className="rounded-xl h-11 px-7 bg-foreground hover:bg-foreground/90 text-background font-semibold"
              >
                {isSubmitting
                  ? <><Loader2 className="w-4 h-4 me-1.5 animate-spin" />{ar ? "جارٍ الإنشاء..." : "Creating..."}</>
                  : <><Wand2 className="w-4 h-4 me-1.5" />{ar ? "أنشئ الكتاب" : "Create Book"}</>}
              </Button>
            )}
          </footer>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ─── Sub-components ──────────────────────────────────────────────────

function Q({ eyebrow, title, sub, icon }: { eyebrow: string; title: string; sub?: string; icon?: React.ReactNode }) {
  return (
    <div>
      <div className="flex items-center gap-1.5 mb-2.5 text-muted-foreground text-[11px] font-bold tracking-[0.18em] uppercase">
        {icon}
        <span>{eyebrow}</span>
      </div>
      <h2 className="text-[22px] sm:text-[27px] font-bold leading-[1.25] text-foreground tracking-tight text-balance">
        {title}
      </h2>
      {sub && <p className="text-sm text-muted-foreground mt-2 leading-relaxed max-w-xl">{sub}</p>}
    </div>
  );
}

/**
 * One grid for every option step so card widths, gaps and column counts
 * never drift between questions. Two columns for cards, three for chips,
 * both collapsing to a comfortable phone layout.
 */
function OptionGrid({ cols, children }: { cols: 2 | 3; children: React.ReactNode }) {
  return (
    <div className={cols === 2 ? "grid grid-cols-1 sm:grid-cols-2 gap-2.5" : "grid grid-cols-2 sm:grid-cols-3 gap-2.5"}>
      {children}
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
      aria-pressed={active}
      // min-height keeps a card with a subtitle and one without the same
      // size, so a row never looks ragged.
      className={`relative min-h-[64px] w-full ps-4 pe-10 py-3.5 rounded-xl border text-start flex items-center gap-3 transition-colors duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ${
        active
          ? "border-foreground bg-foreground/[0.04] ring-1 ring-foreground/20"
          : "border-border hover:border-muted-foreground/45 hover:bg-muted/25 active:bg-muted/40"
      }`}
    >
      {icon && (
        <span className={`shrink-0 w-9 h-9 rounded-lg grid place-items-center transition-colors ${
          active ? "bg-foreground text-background" : "bg-muted text-muted-foreground"
        }`}>
          {icon}
        </span>
      )}
      <span className="flex-1 min-w-0">
        <span className="block font-semibold text-foreground text-[14.5px] leading-snug">{title}</span>
        {sub && <span className="block text-[12.5px] text-muted-foreground mt-0.5 leading-snug">{sub}</span>}
      </span>
      {active && (
        <span className="absolute top-1/2 -translate-y-1/2 end-3 w-5 h-5 rounded-full bg-foreground grid place-items-center">
          <Check className="w-3 h-3 text-background" strokeWidth={3} />
        </span>
      )}
    </button>
  );
}

/** Genre chips. Equal height and full cell width so the grid stays even. */
function Chip({ active, onClick, label }: { active: boolean; onClick: () => void; label: string }) {
  return (
    <button
      onClick={onClick}
      aria-pressed={active}
      className={`min-h-[48px] w-full px-3 py-2.5 rounded-xl border text-[13.5px] font-semibold leading-snug transition-colors duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ${
        active
          ? "bg-foreground text-background border-foreground"
          : "bg-card text-foreground border-border hover:border-muted-foreground/50 active:bg-muted/40"
      }`}
    >
      {label}
    </button>
  );
}

function SummaryRow({ label, value, onEdit, editLabel }: { label: string; value: string; onEdit: () => void; editLabel: string }) {
  return (
    <div className="flex items-center gap-3 px-4 py-2.5">
      <dt className="text-xs text-muted-foreground w-20 shrink-0">{label}</dt>
      <dd className="text-[13px] font-medium text-foreground flex-1 min-w-0 truncate">{value}</dd>
      <button
        onClick={onEdit}
        className="text-xs font-semibold text-muted-foreground hover:text-foreground shrink-0 px-2 py-1 rounded-md hover:bg-muted/60 active:bg-muted transition-colors"
      >
        {editLabel}
      </button>
    </div>
  );
}
