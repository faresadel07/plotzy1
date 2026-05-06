/**
 * Certificate PDF generation (Batch 3.2 / B2).
 *
 * Strategy: load Faris's designed PDF template from src/assets/, overlay
 * the 4 dynamic text fields (holder name, score, date, UUID), return as
 * a Buffer. Pure function — same inputs → same output (modulo PDF
 * metadata creation timestamp). No DB. No network. No file I/O for the
 * result.
 *
 * Library: pdf-lib (loads + modifies PDFs) + @pdf-lib/fontkit (custom
 * font embedding). Replaced an earlier pdfkit-primitive-drawing
 * implementation once Faris produced a designed template — the template
 * carries all the visual identity (logo, decorative borders, side
 * ribbon, medal seal, signature, "FOUNDER, PLOTZY" attribution), so
 * this module only positions the per-cert text on top.
 *
 * Throws on template load failure, font embed failure, or pdf-lib save
 * failure. Caller (the route in B3) catches → logs → returns 500. The
 * cert row's pdf_data stays NULL so the next download retries; no
 * fallback PDF is cached because that would lie to the user about
 * whether generation succeeded.
 *
 * Coordinate system: the template is US Letter landscape (792 × 612pt;
 * Faris's design tool default). pdf-lib's y axis is from the BOTTOM of
 * the page; this module accepts coords as `fromTopY` for human
 * readability and converts via `height - fromTopY` at draw time.
 *
 * v1 limitation: English-only fonts. Non-Latin holder names render as
 * missing-glyph boxes. Logged in discovered-issues.md as the i18n
 * font-bundle gap (Batch 3.2 DP3).
 */
import { PDFDocument, rgb, StandardFonts, type PDFFont } from "pdf-lib";
import fontkit from "@pdf-lib/fontkit";
import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ASSETS_DIR = resolve(__dirname, "../assets");
const TEMPLATE_PATH = resolve(ASSETS_DIR, "certificate-template.pdf");
const LORA_SEMIBOLD_PATH = resolve(ASSETS_DIR, "fonts", "Lora-SemiBold.ttf");
const INTER_SEMIBOLD_PATH = resolve(ASSETS_DIR, "fonts", "Inter-SemiBold.ttf");

// ── Locked overlay coordinates (Phase A visual sign-off, iter 3) ──
//
// All coords are in PDF points (1pt = 1/72"). Page is 792 × 612.
// `fromTopY` is the distance from the page's top edge; pdf-lib's draw
// API takes y-from-bottom, so we subtract from page height at draw time.
//
// `centerX` is the horizontal centerline for the text. We compute the
// text's pixel width via `font.widthOfTextAtSize()` and shift left by
// half so the text lands centered on the named point.
//
// Final navy color matches the "CERTIFICATE" title in the template.
const NAVY = rgb(0.1, 0.16, 0.31);
const MEDIUM_GRAY = rgb(0.4, 0.4, 0.4);

const HOLDER_FROM_TOP_Y = 325;
const HOLDER_FONT_SIZE = 28;

const SCORE_FROM_TOP_Y = 480;
const SCORE_CENTER_X = 297; // ≈ 37.5% across, between left edge and medal
const SCORE_FONT_SIZE = 18;

const DATE_FROM_TOP_Y = 480;
const DATE_CENTER_X = 564; // ≈ 71% across, between medal and signature
const DATE_FONT_SIZE = 14;

const UUID_FROM_TOP_Y = 568;
const UUID_FONT_SIZE = 9;

export interface CertificateRenderInputs {
  /** Cap to ~60 chars upstream; longer names risk wrapping or clipping
   *  against the side ribbon. */
  holderName: string;
  /** Integer 0-100. Rendered as "{N}%". */
  finalExamScore: number;
  /** Issued-at date; the function formats as US-style "May 6, 2026". */
  issuedAt: Date;
  /** Public verification slug; rendered in mono at the bottom. */
  certUuid: string;
}

export async function renderCertificatePdf(
  inputs: CertificateRenderInputs,
): Promise<Buffer> {
  const { holderName, finalExamScore, issuedAt, certUuid } = inputs;

  if (!holderName || holderName.trim().length === 0) {
    throw new Error("renderCertificatePdf: holderName is required");
  }
  if (!certUuid || certUuid.trim().length === 0) {
    throw new Error("renderCertificatePdf: certUuid is required");
  }
  if (!Number.isInteger(finalExamScore) || finalExamScore < 0 || finalExamScore > 100) {
    throw new Error(
      `renderCertificatePdf: finalExamScore must be 0-100 integer, got ${finalExamScore}`,
    );
  }

  // Load Faris's designed template.
  const templateBytes = readFileSync(TEMPLATE_PATH);
  const doc = await PDFDocument.load(templateBytes, { updateMetadata: false });
  doc.registerFontkit(fontkit);

  // Set our own metadata over the template's. Issued-at moves into the
  // PDF metadata too, so a viewer's "document properties" matches what
  // the certificate body shows.
  doc.setTitle(`Plotzy Certificate of Completion — ${holderName}`);
  doc.setAuthor("Plotzy");
  doc.setSubject("Plotzy Writing Course — Certificate of Completion");
  doc.setCreator("Plotzy");
  doc.setProducer("pdf-lib");
  doc.setCreationDate(new Date());
  doc.setModificationDate(issuedAt);

  // Embed the two custom fonts. Courier (StandardFonts) is built into
  // every PDF reader and doesn't need an asset file.
  const loraSemiBoldBytes = readFileSync(LORA_SEMIBOLD_PATH);
  const interSemiBoldBytes = readFileSync(INTER_SEMIBOLD_PATH);
  const loraSemiBold = await doc.embedFont(loraSemiBoldBytes, { subset: true });
  const interSemiBold = await doc.embedFont(interSemiBoldBytes, { subset: true });
  const courier = await doc.embedFont(StandardFonts.Courier);

  const page = doc.getPage(0);
  const { width, height } = page.getSize();

  // ── Draw helpers ────────────────────────────────────────────────────
  // Center the text horizontally on `centerX` by computing its pixel
  // width at the chosen font + size and shifting left by half.
  const drawCentered = (
    text: string,
    centerX: number,
    fromTopY: number,
    font: PDFFont,
    size: number,
    color: ReturnType<typeof rgb>,
  ) => {
    const textWidth = font.widthOfTextAtSize(text, size);
    page.drawText(text, {
      x: centerX - textWidth / 2,
      y: height - fromTopY,
      size,
      font,
      color,
    });
  };

  // ── 4 dynamic overlays at locked coordinates ────────────────────────
  drawCentered(
    holderName,
    width / 2,
    HOLDER_FROM_TOP_Y,
    loraSemiBold,
    HOLDER_FONT_SIZE,
    NAVY,
  );

  drawCentered(
    `${finalExamScore}%`,
    SCORE_CENTER_X,
    SCORE_FROM_TOP_Y,
    interSemiBold,
    SCORE_FONT_SIZE,
    NAVY,
  );

  const dateStr = new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(issuedAt);
  drawCentered(
    dateStr,
    DATE_CENTER_X,
    DATE_FROM_TOP_Y,
    interSemiBold,
    DATE_FONT_SIZE,
    NAVY,
  );

  drawCentered(
    certUuid,
    width / 2,
    UUID_FROM_TOP_Y,
    courier,
    UUID_FONT_SIZE,
    MEDIUM_GRAY,
  );

  // Save and return as Node Buffer (pdf-lib gives us a Uint8Array).
  const pdfBytes = await doc.save();
  return Buffer.from(pdfBytes);
}

/**
 * Eagerly read the template + fonts at module init to fail fast on a
 * misconfigured deploy (missing assets dir) rather than on the first
 * request. Throws here = startup failure visible in deploy logs;
 * throws on first request = silent prod outage.
 *
 * Call this from the api-server's startup sequence.
 */
export function verifyCertificatePdfAssets(): void {
  for (const path of [TEMPLATE_PATH, LORA_SEMIBOLD_PATH, INTER_SEMIBOLD_PATH]) {
    try {
      readFileSync(path);
    } catch (err) {
      throw new Error(
        `certificate-pdf: missing asset at startup: ${path} (${(err as Error).message})`,
      );
    }
  }
}
