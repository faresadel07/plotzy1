import { useEffect, useRef, useState } from "react";
import { Clock, AlertCircle } from "lucide-react";
import { useLanguage } from "@/contexts/language-context";

/**
 * Countdown timer for time-limited quizzes (final exam: 60 min). The
 * server is the authoritative time-keeper — this component only
 * provides the visible UX. When time runs out client-side, onExpire
 * fires; the consumer should auto-submit to surface a structured
 * TIME_EXPIRED response from the server (with a 30s grace baked in).
 *
 * Visual states:
 *   - normal (>5 min remaining): muted text
 *   - warning (≤5 min): amber tint + "5 minutes left" badge once
 *   - critical (≤1 min): red tint
 *
 * Interval: 500ms tick (avoids drift relative to startedAt by always
 * reading wall-clock).
 *
 * Reuses: lucide-react Clock + AlertCircle, useLanguage().
 * Non-goals: pause/resume (no spec); per-question time tracking.
 */

interface QuizTimerProps {
  /** ISO timestamp recorded when the user opened the quiz. */
  startedAt: string;
  /** Limit in minutes (must be > 0; the consumer should not mount this for unlimited quizzes). */
  limitMinutes: number;
  /** Called once when the displayed countdown reaches 0. */
  onExpire?: () => void;
  className?: string;
}

export function QuizTimer({ startedAt, limitMinutes, onExpire, className = "" }: QuizTimerProps) {
  const { t } = useLanguage();
  const [remainingMs, setRemainingMs] = useState(() => computeRemaining(startedAt, limitMinutes));
  const [warned, setWarned] = useState(false);
  const expiredRef = useRef(false);

  useEffect(() => {
    const tick = () => {
      const ms = computeRemaining(startedAt, limitMinutes);
      setRemainingMs(ms);
      if (ms <= 0 && !expiredRef.current) {
        expiredRef.current = true;
        onExpire?.();
      }
    };
    tick();
    const id = window.setInterval(tick, 500);
    return () => window.clearInterval(id);
  }, [startedAt, limitMinutes, onExpire]);

  // Warn once when crossing into the last 5 minutes.
  useEffect(() => {
    if (!warned && remainingMs > 0 && remainingMs <= 5 * 60_000) {
      setWarned(true);
    }
  }, [remainingMs, warned]);

  const totalSeconds = Math.max(0, Math.floor(remainingMs / 1000));
  const mm = String(Math.floor(totalSeconds / 60)).padStart(2, "0");
  const ss = String(totalSeconds % 60).padStart(2, "0");

  const critical = remainingMs > 0 && remainingMs <= 60_000;
  const warning = remainingMs > 60_000 && remainingMs <= 5 * 60_000;
  const expired = remainingMs <= 0;

  const tone = expired
    ? "text-red-600"
    : critical
    ? "text-red-600"
    : warning
    ? "text-amber-600"
    : "text-muted-foreground";

  return (
    <div
      className={`inline-flex items-center gap-2 rounded-md border px-3 py-1.5 text-sm font-mono ${tone} ${className}`}
      aria-live="polite"
    >
      <Clock className="h-4 w-4" aria-hidden />
      <span aria-label={t("courseQuizTimeRemaining")}>
        {mm}:{ss}
      </span>
      {warned && !expired && warning && (
        <span className="ms-1 inline-flex items-center gap-1 text-xs">
          <AlertCircle className="h-3 w-3" aria-hidden />
          {t("courseQuizTimeWarning")}
        </span>
      )}
      {expired && (
        <span className="ms-1 inline-flex items-center gap-1 text-xs font-sans">
          {t("courseQuizTimeExpired")}
        </span>
      )}
    </div>
  );
}

function computeRemaining(startedAt: string, limitMinutes: number): number {
  const start = new Date(startedAt).getTime();
  if (Number.isNaN(start)) return 0;
  const limitMs = limitMinutes * 60_000;
  return Math.max(0, start + limitMs - Date.now());
}
