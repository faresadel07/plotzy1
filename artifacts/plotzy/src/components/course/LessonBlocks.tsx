import { useEffect, useMemo, useState, type ReactNode } from "react";
import { Play, Lightbulb, CheckCircle2, XCircle, PenLine, ListChecks } from "lucide-react";
import { useLanguage } from "@/contexts/language-context";
import { cn } from "@/lib/utils";

// Rich lesson blocks rendered from `:::` directives in course markdown
// (parsed by components/course/Markdown.tsx). Everything here must be
// phone-first: full-width, touch-friendly targets, no hover-only
// affordances. Chrome copy is bilingual inline (the lesson BODY is
// English until the Arabic content phase; the buttons around it should
// already speak the UI language).

// ── VideoEmbed ────────────────────────────────────────────────────────
// Click-to-load facade: shows the YouTube thumbnail + play button and
// only injects the iframe after a tap. Keeps lesson pages fast (no
// third-party JS on load) and uses the privacy-enhanced nocookie host.
// If the thumbnail 404s (deleted/private video) we degrade to a plain
// "watch on YouTube" card instead of a dead box.

interface VideoEmbedProps {
  videoId: string;
  title: string;
  channel?: string;
  duration?: string;
}

export function VideoEmbed({ videoId, title, channel, duration }: VideoEmbedProps) {
  const { isRTL } = useLanguage();
  const [playing, setPlaying] = useState(false);
  const [thumbFailed, setThumbFailed] = useState(false);
  // hqdefault always exists for public videos; maxres often doesn't.
  const thumb = `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`;
  const watchUrl = `https://www.youtube.com/watch?v=${videoId}`;

  const meta = [channel, duration].filter(Boolean).join(" · ");

  if (thumbFailed) {
    return (
      <a
        href={watchUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="not-prose my-6 flex items-center gap-3 rounded-xl border bg-card p-4 no-underline hover:bg-muted/50 transition-colors"
      >
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground">
          <Play className="h-4 w-4" aria-hidden />
        </span>
        <span className="min-w-0">
          <span className="block text-sm font-semibold text-foreground truncate">{title}</span>
          <span className="block text-xs text-muted-foreground">
            {isRTL ? "شاهد على يوتيوب" : "Watch on YouTube"}
            {meta ? ` · ${meta}` : ""}
          </span>
        </span>
      </a>
    );
  }

  return (
    <figure className="not-prose my-6 overflow-hidden rounded-xl border bg-card shadow-sm">
      <div className="relative aspect-video bg-black">
        {playing ? (
          <iframe
            src={`https://www.youtube-nocookie.com/embed/${videoId}?autoplay=1&rel=0`}
            title={title}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            allowFullScreen
            className="absolute inset-0 h-full w-full border-0"
          />
        ) : (
          <button
            type="button"
            onClick={() => setPlaying(true)}
            aria-label={isRTL ? `شغّل الفيديو: ${title}` : `Play video: ${title}`}
            className="group absolute inset-0 h-full w-full cursor-pointer"
          >
            <img
              src={thumb}
              alt=""
              loading="lazy"
              decoding="async"
              onError={() => setThumbFailed(true)}
              onLoad={(e) => {
                // YouTube serves a 120x90 grey placeholder for missing
                // videos instead of a 404. Treat it as a failure.
                const img = e.currentTarget;
                if (img.naturalWidth <= 120) setThumbFailed(true);
              }}
              className="h-full w-full object-cover opacity-90 transition-opacity group-hover:opacity-100"
            />
            <span className="absolute inset-0 flex items-center justify-center">
              <span className="flex h-14 w-14 items-center justify-center rounded-full bg-black/60 backdrop-blur-sm ring-1 ring-white/30 transition-transform group-hover:scale-105 group-active:scale-95">
                <Play className="h-6 w-6 text-white translate-x-[1px]" fill="currentColor" aria-hidden />
              </span>
            </span>
          </button>
        )}
      </div>
      <figcaption className="flex items-baseline justify-between gap-3 px-4 py-3">
        <span className="min-w-0">
          <span className="block text-sm font-semibold leading-snug">{title}</span>
          {meta && <span className="block text-xs text-muted-foreground mt-0.5">{meta}</span>}
        </span>
        <a
          href={watchUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="shrink-0 text-xs text-muted-foreground underline-offset-2 hover:underline"
        >
          YouTube
        </a>
      </figcaption>
    </figure>
  );
}

// ── TakeawayCard ──────────────────────────────────────────────────────
// End-of-section or end-of-lesson summary card. Children are the
// already-rendered list items from the markdown parser.

export function TakeawayCard({ children }: { children: ReactNode }) {
  const { isRTL } = useLanguage();
  return (
    <aside className="not-prose my-8 rounded-xl border border-primary/25 bg-primary/[0.04] p-5">
      <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-primary">
        <Lightbulb className="h-4 w-4" aria-hidden />
        {isRTL ? "الخلاصة" : "Key takeaways"}
      </div>
      <div className="space-y-2 text-[0.95rem] leading-relaxed [&_ul]:list-disc [&_ul]:ps-5 [&_ul]:space-y-1.5 [&_ol]:list-decimal [&_ol]:ps-5 [&_ol]:space-y-1.5">
        {children}
      </div>
    </aside>
  );
}

// ── QuickCheck ────────────────────────────────────────────────────────
// One inline multiple-choice question inside the reading flow. Tap an
// option: correct turns green, a wrong pick turns red and the correct
// one is revealed, then the explanation appears. Local state only; this
// is a comprehension nudge, not a graded quiz.

export interface QuickCheckData {
  question: string;
  options: string[];
  correctIndex: number;
  explanation?: string;
}

export function QuickCheck({ question, options, correctIndex, explanation }: QuickCheckData) {
  const { isRTL } = useLanguage();
  const [picked, setPicked] = useState<number | null>(null);
  const revealed = picked !== null;

  return (
    <div className="not-prose my-8 rounded-xl border bg-card p-5">
      <div className="mb-1 text-[0.7rem] font-semibold uppercase tracking-wide text-muted-foreground">
        {isRTL ? "سؤال سريع" : "Quick check"}
      </div>
      <div className="mb-4 text-[0.95rem] font-semibold leading-snug">{question}</div>
      <div className="space-y-2">
        {options.map((opt, i) => {
          const isCorrect = i === correctIndex;
          const isPicked = i === picked;
          return (
            <button
              key={i}
              type="button"
              disabled={revealed}
              onClick={() => setPicked(i)}
              className={cn(
                "flex w-full items-start gap-2.5 rounded-lg border px-3.5 py-2.5 text-start text-sm leading-snug transition-colors",
                !revealed && "hover:bg-muted/60 active:bg-muted cursor-pointer",
                revealed && isCorrect && "border-green-600/50 bg-green-500/10",
                revealed && isPicked && !isCorrect && "border-red-600/50 bg-red-500/10",
                revealed && !isPicked && !isCorrect && "opacity-50",
              )}
            >
              {revealed && isCorrect && (
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-green-600" aria-hidden />
              )}
              {revealed && isPicked && !isCorrect && (
                <XCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-600" aria-hidden />
              )}
              <span>{opt}</span>
            </button>
          );
        })}
      </div>
      {revealed && explanation && (
        <div className="mt-4 rounded-lg bg-muted/60 px-3.5 py-3 text-sm leading-relaxed text-muted-foreground">
          {explanation}
        </div>
      )}
    </div>
  );
}

// ── ExerciseBox ───────────────────────────────────────────────────────
// The lesson's practice moment, upgraded from a passive blockquote to a
// real writing surface. Drafts persist to localStorage per (lesson,
// exercise index) so nothing is lost between visits. Server-side saving
// arrives with the accountability phase.

interface ExerciseBoxProps {
  prompt: ReactNode;
  storageKey: string;
}

export function ExerciseBox({ prompt, storageKey }: ExerciseBoxProps) {
  const { isRTL } = useLanguage();
  const [value, setValue] = useState("");
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) setValue(saved);
    } catch {
      // Private mode / storage denied: the box still works, it just won't persist.
    }
    setLoaded(true);
  }, [storageKey]);

  useEffect(() => {
    if (!loaded) return;
    const id = setTimeout(() => {
      try {
        if (value) localStorage.setItem(storageKey, value);
        else localStorage.removeItem(storageKey);
      } catch {
        // ignore
      }
    }, 400);
    return () => clearTimeout(id);
  }, [value, loaded, storageKey]);

  const words = useMemo(() => (value.trim() ? value.trim().split(/\s+/).length : 0), [value]);

  return (
    <section className="not-prose my-8 rounded-xl border border-amber-500/30 bg-amber-500/[0.05] p-5">
      <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-amber-700 dark:text-amber-400">
        <PenLine className="h-4 w-4" aria-hidden />
        {isRTL ? "تمرين" : "Exercise"}
      </div>
      <div className="mb-4 space-y-2 text-[0.95rem] leading-relaxed">{prompt}</div>
      <textarea
        value={value}
        onChange={(e) => setValue(e.target.value)}
        rows={6}
        placeholder={isRTL ? "اكتب هنا. كتابتك تُحفظ تلقائياً على هذا الجهاز" : "Write here. Your work is saved automatically on this device"}
        className="w-full resize-y rounded-lg border bg-background px-3.5 py-3 text-[0.95rem] leading-relaxed outline-none focus-visible:ring-2 focus-visible:ring-ring"
      />
      <div className="mt-2 flex items-center justify-between text-xs text-muted-foreground">
        <span>
          {words} {isRTL ? "كلمة" : words === 1 ? "word" : "words"}
        </span>
        {value && <span>{isRTL ? "محفوظ" : "Saved"}</span>}
      </div>
    </section>
  );
}

// ── LessonChecklist ───────────────────────────────────────────────────
// Tappable checklist (self-editing checklists, revision passes). Ticks
// persist to localStorage so a writer can work through a checklist
// against their own draft across sessions.

interface LessonChecklistProps {
  items: ReactNode[];
  storageKey: string;
}

export function LessonChecklist({ items, storageKey }: LessonChecklistProps) {
  const { isRTL } = useLanguage();
  const [checked, setChecked] = useState<boolean[]>(() => items.map(() => false));

  useEffect(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        const arr = JSON.parse(saved) as boolean[];
        if (Array.isArray(arr)) setChecked(items.map((_, i) => !!arr[i]));
      }
    } catch {
      // ignore
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storageKey]);

  const toggle = (i: number) => {
    setChecked((prev) => {
      const next = prev.map((v, j) => (j === i ? !v : v));
      try {
        localStorage.setItem(storageKey, JSON.stringify(next));
      } catch {
        // ignore
      }
      return next;
    });
  };

  const done = checked.filter(Boolean).length;

  return (
    <div className="not-prose my-8 rounded-xl border bg-card p-5">
      <div className="mb-3 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-sm font-semibold">
          <ListChecks className="h-4 w-4 text-primary" aria-hidden />
          {isRTL ? "قائمة تحقق" : "Checklist"}
        </div>
        <span className="text-xs text-muted-foreground">
          {done}/{items.length}
        </span>
      </div>
      <div className="space-y-1">
        {items.map((item, i) => (
          <button
            key={i}
            type="button"
            onClick={() => toggle(i)}
            aria-pressed={checked[i]}
            className="flex w-full items-start gap-3 rounded-lg px-2 py-2 text-start text-sm leading-snug transition-colors hover:bg-muted/60"
          >
            <span
              className={cn(
                "mt-0.5 flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-[5px] border transition-colors",
                checked[i] ? "border-primary bg-primary text-primary-foreground" : "border-muted-foreground/40",
              )}
              aria-hidden
            >
              {checked[i] && <CheckCircle2 className="h-3 w-3" />}
            </span>
            <span className={cn(checked[i] && "text-muted-foreground line-through decoration-muted-foreground/50")}>
              {item}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
