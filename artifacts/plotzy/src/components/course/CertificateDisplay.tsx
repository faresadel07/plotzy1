import { useLanguage } from "@/contexts/language-context";

/**
 * Visual certificate (web view of /certificates/:uuid). Designed to match
 * the downloadable PDF pixel-for-pixel: same template (rasterized to
 * /public/certificate-template.png from artifacts/api-server/src/assets/
 * certificate-template.pdf via lib/db/scripts/convert-cert-template.ts),
 * same 4 dynamic overlays (holder / score / date / UUID), same fonts
 * (Lora-SemiBold + Inter-SemiBold via @fontsource/* in main.tsx), same
 * navy + muted-gray colours.
 *
 * Layout strategy
 * - Outer wrapper holds the `aspect-ratio: 792/612` (US Letter
 *   landscape, matching the source PDF) so the cert scales fluidly to
 *   any viewport while preserving its proportions.
 * - `container-type: size` enables `cqw` (container-width) units on
 *   the children — font sizes scale with the cert, NOT with the
 *   viewport — so the relative typography stays correct at every
 *   render width.
 * - Background `<img>` fills the container; 4 `<div>` overlays sit
 *   absolutely at percentages computed from PDF point coordinates
 *   (PDF: 792×612pt → web: % of container).
 *
 * Coordinate translation (matches certificate-pdf.ts, locked Phase A)
 *   PDF point coord  →  CSS percentage of container
 *   ───────────────     ─────────────────────────────
 *   holder  fromTopY=325, centerX=396  →  top=53.10%, left=50%
 *   score   fromTopY=480, centerX=297  →  top=78.43%, left=37.50%
 *   date    fromTopY=480, centerX=564  →  top=78.43%, left=71.21%
 *   uuid    fromTopY=568, centerX=396  →  top=92.81%, left=50%
 *
 * Font sizes are also expressed as % of container width — the PDF
 * font size (in pt) divided by 792pt (the page width) gives the cqw
 * fraction. clamp() bounds keep the text legible at extreme container
 * sizes.
 *
 * Date locale: en-US fixed (the template's "ISSUED ON" label is
 * hardcoded English in the PNG; localizing just the date would create
 * "ISSUED ON 6 май 2026" mismatches). Matches the PDF's en-US Intl.
 *
 * Accessibility
 * - The PNG is decorative (aria-hidden). The overlays are real DOM
 *   text and are read by screen readers in source order.
 * - An sr-only mirror immediately after the visual block re-states
 *   the cert's identity in semantic HTML for assistive tech that
 *   prefers a single chunk over scattered overlay text.
 *
 * RTL: text alignment is centered everywhere via `transform`-based
 * centering; no logical-property direction concerns. The PNG itself
 * is a fixed visual artifact (no flipping). The Arabic-locale UI
 * pages around the cert remain RTL via the page-level direction.
 */

interface CertificateDisplayProps {
  holderName: string;
  finalExamScore: number;
  issuedAt: string; // ISO
  certUuid: string;
  /** Course title — currently fixed in the template PNG itself for v1.
   *  Prop is accepted for forward compatibility (multi-course) and used
   *  in the sr-only mirror. */
  courseTitle?: string;
  className?: string;
}

const NAVY = "#1A294F"; // matches PDF rgb(0.1, 0.16, 0.31)
const MUTED = "#6B6B6B"; // matches PDF rgb(0.4, 0.4, 0.4)

export function CertificateDisplay({
  holderName,
  finalExamScore,
  issuedAt,
  certUuid,
  courseTitle = "How to Write Your First Book",
  className = "",
}: CertificateDisplayProps) {
  const { t } = useLanguage();
  const issuedDate = new Date(issuedAt);
  // en-US fixed — see component header for rationale.
  const dateLabel = Number.isNaN(issuedDate.getTime())
    ? issuedAt
    : new Intl.DateTimeFormat("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
      }).format(issuedDate);

  // Common positioning style for centered overlays. Using transform
  // for X centering avoids needing to know the text width upfront.
  const overlayBase: React.CSSProperties = {
    position: "absolute",
    transform: "translate(-50%, -50%)",
    color: NAVY,
    fontWeight: 600,
    whiteSpace: "nowrap",
  };

  return (
    <>
      <div
        className={`relative w-full max-w-5xl mx-auto rounded-lg overflow-hidden shadow-xl ${className}`}
        style={{
          aspectRatio: "792 / 612",
          containerType: "size",
        }}
      >
        {/* Background: rasterized template (decorative — text is on overlays) */}
        <img
          src="/certificate-template.png"
          alt=""
          aria-hidden="true"
          className="absolute inset-0 w-full h-full object-cover"
          // Eager-load: the cert is the page's primary content; LCP optimization.
          loading="eager"
          decoding="async"
        />

        {/* HOLDER — top: 53.10%, centered. Lora SemiBold ≈ 28pt scaled. */}
        <div
          style={{
            ...overlayBase,
            top: "53.10%",
            left: "50%",
            fontFamily: '"Lora", serif',
            fontSize: "clamp(18px, 3.535cqw, 64px)",
          }}
        >
          {holderName}
        </div>

        {/* SCORE — top: 78.43%, x: 37.50%. Inter SemiBold ≈ 18pt scaled. */}
        <div
          style={{
            ...overlayBase,
            top: "78.43%",
            left: "37.50%",
            fontFamily: '"Inter", system-ui, sans-serif',
            fontSize: "clamp(14px, 2.273cqw, 40px)",
          }}
        >
          {finalExamScore}%
        </div>

        {/* DATE — top: 78.43%, x: 71.21%. Inter SemiBold ≈ 14pt scaled. */}
        <div
          style={{
            ...overlayBase,
            top: "78.43%",
            left: "71.21%",
            fontFamily: '"Inter", system-ui, sans-serif',
            fontSize: "clamp(11px, 1.768cqw, 32px)",
          }}
        >
          {dateLabel}
        </div>

        {/* UUID — top: 92.81%, centered. Mono ≈ 9pt scaled, muted gray. */}
        <div
          style={{
            ...overlayBase,
            top: "92.81%",
            left: "50%",
            color: MUTED,
            fontFamily: '"Courier New", ui-monospace, monospace',
            fontSize: "clamp(7px, 1.136cqw, 20px)",
            fontWeight: 400,
          }}
        >
          {certUuid}
        </div>
      </div>

      {/* Screen-reader mirror: structured text for assistive tech.
        * Repeats the cert's identity as a semantic h2 + paragraphs so
        * screen-reader users get a coherent description, even if the
        * scattered overlay text reads ambiguously in source order. */}
      <div className="sr-only">
        <h2>{t("courseCertTitle")}</h2>
        <p>
          {t("courseCertSubhead")}.
        </p>
        <p>
          {t("courseCertAwarded")} {holderName}.
        </p>
        <p>
          {t("courseCertCompletionLine")} {courseTitle}.
        </p>
        <p>
          {t("courseCertScore")}: {finalExamScore}%.
        </p>
        <p>
          {t("courseCertIssued")}: {dateLabel}.
        </p>
        <p>
          {t("courseCertVerifiedBadge")}. ID: {certUuid}.
        </p>
      </div>
    </>
  );
}
