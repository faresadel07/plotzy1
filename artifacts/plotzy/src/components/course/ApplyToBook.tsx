import { Link } from "wouter";
import { PenLine, ArrowRight, ArrowLeft } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useBooks } from "@/hooks/use-books";
import { useAuth } from "@/contexts/auth-context";
import { useLanguage } from "@/contexts/language-context";

/**
 * The course's golden thread: every lesson ends with a bridge from
 * theory into the writer's actual manuscript. If the user has books,
 * link straight into the most recently touched one; otherwise invite
 * them to start their first book. This is what turns the course from
 * "knowledge" into "a finished draft": the single strongest pattern
 * found in the world-class-course research (Reedsy's 101-day model,
 * Holly Lisle's write-inside-the-class model).
 */
export function ApplyToBook() {
  const { isRTL } = useLanguage();
  const { user } = useAuth();
  const booksQ = useBooks();
  const ArrowIcon = isRTL ? ArrowLeft : ArrowRight;

  const books = Array.isArray(booksQ.data) ? booksQ.data : [];
  const latest = books
    .slice()
    .sort((a: any, b: any) =>
      String(b.updatedAt ?? b.createdAt ?? "").localeCompare(String(a.updatedAt ?? a.createdAt ?? "")),
    )[0] as { id: number; title?: string | null } | undefined;

  // Anonymous visitors already get a sign-in prompt next to the
  // completion CTA; stacking a second auth-gated card reads pushy.
  if (!user && !latest) return null;

  return (
    <Card className="p-5 border-primary/25 bg-primary/[0.04]">
      <div className="flex flex-wrap items-center gap-4 justify-between">
        <div className="flex items-start gap-3 min-w-0">
          <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/15 text-primary">
            <PenLine className="h-4 w-4" aria-hidden />
          </span>
          <div className="min-w-0">
            <div className="font-semibold text-sm">
              {isRTL ? "طبّق على كتابك" : "Apply it to your book"}
            </div>
            <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
              {isRTL
                ? "الدرس الذي لا يلمس مخطوطتك يُنسى. افتح كتابك وطبّق ما تعلمته الآن."
                : "A lesson that never touches your manuscript fades. Open your book and use this now."}
            </p>
          </div>
        </div>
        <Button asChild size="sm" className="gap-2 shrink-0">
          <Link href={latest ? `/books/${latest.id}` : "/"}>
            {latest
              ? isRTL
                ? `افتح ${latest.title || "كتابك"}`
                : `Open ${latest.title || "your book"}`
              : isRTL
                ? "أنشئ كتابك الأول"
                : "Start your first book"}
            <ArrowIcon className="h-3.5 w-3.5" aria-hidden />
          </Link>
        </Button>
      </div>
    </Card>
  );
}
