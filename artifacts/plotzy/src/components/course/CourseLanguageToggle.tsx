import { Languages } from "lucide-react";
import { useCourseLanguage, type CourseLang } from "@/hooks/use-course-language";

/**
 * Tiny EN / AR toggle that flips the language of the course content
 * (and the immediate course UI chrome) WITHOUT touching the global
 * site language. Sits in /course, /learn, and the lesson / module /
 * quiz pages. Clicking the inactive option switches.
 *
 * Persists to localStorage via useCourseLanguage; the change
 * cascades to the API (?lang=) and the dir attribute on the page's
 * course container.
 */
interface Option { code: CourseLang; label: string; }
const OPTIONS: Option[] = [
  { code: "en", label: "EN" },
  { code: "ar", label: "العربية" },
];

interface CourseLanguageToggleProps {
  className?: string;
}

export function CourseLanguageToggle({ className = "" }: CourseLanguageToggleProps) {
  const { courseLang, setCourseLang } = useCourseLanguage();

  return (
    <div
      className={`inline-flex items-center gap-1 rounded-full border bg-card p-0.5 ${className}`}
      role="group"
      aria-label="Course language"
      dir="ltr"
    >
      <Languages className="h-3.5 w-3.5 text-muted-foreground ms-1.5 me-0.5" aria-hidden />
      {OPTIONS.map((opt) => {
        const active = opt.code === courseLang;
        return (
          <button
            key={opt.code}
            type="button"
            onClick={() => setCourseLang(opt.code)}
            aria-pressed={active}
            className={
              "px-2.5 py-1 text-xs font-medium rounded-full transition-colors " +
              (active
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:bg-secondary")
            }
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}
