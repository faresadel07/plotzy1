import { Award, ShieldCheck } from "lucide-react";
import { useLanguage } from "@/contexts/language-context";

/**
 * The visual certificate. Used both inline on /learn after issuance
 * and as the centerpiece of the public /certificates/:uuid page.
 *
 * Layout is presentational only — no API calls. The page using it
 * fetches data and passes the four fields. Designed to read well at
 * a wide desktop width AND when screenshotted for sharing on social.
 *
 * RTL: text alignment uses logical text-center (no flip needed); the
 * Award/ShieldCheck icons are symmetric and don't need mirroring.
 *
 * Reuses: lucide-react icons, useLanguage(). Pure CSS / Tailwind for
 * the frame.
 *
 * Non-goals: PDF render (deferred to Batch 3 per D3); per-cert custom
 * imagery (one canonical layout for v1); language-specific cert text
 * (the holder's display language is not necessarily their cert
 * language — using the viewer's language is the right call).
 */

interface CertificateDisplayProps {
  holderName: string;
  finalExamScore: number;
  issuedAt: string; // ISO
  certUuid: string;
  /** Course title — currently fixed for v1 ("How to Write Your First Book"). */
  courseTitle?: string;
  className?: string;
}

export function CertificateDisplay({
  holderName,
  finalExamScore,
  issuedAt,
  certUuid,
  courseTitle = "How to Write Your First Book",
  className = "",
}: CertificateDisplayProps) {
  const { t, lang } = useLanguage();
  const issuedDate = new Date(issuedAt);
  const dateLabel = Number.isNaN(issuedDate.getTime())
    ? issuedAt
    : issuedDate.toLocaleDateString(lang, {
        year: "numeric",
        month: "long",
        day: "numeric",
      });

  return (
    <div
      className={`relative overflow-hidden rounded-2xl border-2 border-primary/30 bg-card text-card-foreground p-10 sm:p-14 text-center shadow-xl ${className}`}
    >
      {/* Decorative corner ornaments */}
      <div
        aria-hidden
        className="absolute top-0 start-0 h-16 w-16 border-s-4 border-t-4 border-primary/40 rounded-tl-2xl"
      />
      <div
        aria-hidden
        className="absolute bottom-0 end-0 h-16 w-16 border-e-4 border-b-4 border-primary/40 rounded-br-2xl"
      />

      <div className="space-y-6">
        <div className="inline-flex items-center justify-center h-16 w-16 rounded-full bg-primary/10 text-primary">
          <Award className="h-9 w-9" aria-hidden />
        </div>

        <div>
          <div className="text-xs tracking-[0.3em] uppercase text-muted-foreground mb-2">
            {t("courseCertSubhead")}
          </div>
          <h1 className="text-3xl sm:text-4xl font-serif tracking-tight">
            {t("courseCertTitle")}
          </h1>
        </div>

        <div className="space-y-2">
          <div className="text-sm text-muted-foreground">{t("courseCertAwarded")}</div>
          <div className="text-2xl sm:text-3xl font-semibold">{holderName}</div>
        </div>

        <div className="text-sm text-muted-foreground max-w-xl mx-auto">
          {t("courseCertCompletionLine")}{" "}
          <span className="font-medium text-foreground">{courseTitle}</span>.
        </div>

        <div className="flex items-center justify-center gap-6 text-xs text-muted-foreground pt-4 border-t border-border/60">
          <div>
            <div className="uppercase tracking-wider">{t("courseCertScore")}</div>
            <div className="text-foreground text-base mt-1">{finalExamScore}%</div>
          </div>
          <div>
            <div className="uppercase tracking-wider">{t("courseCertIssued")}</div>
            <div className="text-foreground text-base mt-1">{dateLabel}</div>
          </div>
        </div>

        <div className="inline-flex items-center gap-1.5 text-xs text-muted-foreground pt-2">
          <ShieldCheck className="h-3.5 w-3.5" aria-hidden />
          <span className="font-mono">{certUuid}</span>
        </div>
      </div>
    </div>
  );
}
