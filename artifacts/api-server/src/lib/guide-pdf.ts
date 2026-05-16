import PDFDocument from "pdfkit";
import type { Writable } from "node:stream";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { readFileSync, existsSync } from "node:fs";

/**
 * Plotzy Writing Guide -> branded, watermarked PDF.
 *
 * Same proven pdfkit + bundled Cairo TTF (Latin + Arabic) pipeline as
 * data-export-pdf.ts. The endpoint that calls this is auth-gated, so a
 * logged-out user can never reach it. Every page carries a faint diagonal
 * "PLOTZY" watermark and a copyright footer, plus an explicit intellectual
 * property notice, so the rights stay with Plotzy.
 */

const __dirname = dirname(fileURLToPath(import.meta.url));
const ASSETS_DIR = (() => {
  const bundled = resolve(__dirname, "assets");
  return existsSync(bundled) ? bundled : resolve(__dirname, "../assets");
})();
const CAIRO_PATH = resolve(ASSETS_DIR, "fonts", "Cairo.ttf");

const COLOR_TITLE = "#0a0a0a";
const COLOR_HEADER = "#111111";
const COLOR_BODY = "#333333";
const COLOR_LABEL = "#888888";
const COLOR_DIVIDER = "#e5e5e5";
const COLOR_ACCENT = "#7c6af7";
const PAGE_MARGIN = 56;

export interface GuidePdfBlock {
  title?: string;
  body?: string;
  bullets?: string[];
}
export interface GuidePdfSection {
  heading: string;
  blocks: GuidePdfBlock[];
}
export interface GuidePdfPayload {
  title: string;
  subtitle?: string;
  sections: GuidePdfSection[];
}

export async function buildGuidePdf(
  output: Writable,
  payload: GuidePdfPayload,
  lang: "en" | "ar",
): Promise<void> {
  const ar = lang === "ar";
  const align: "left" | "right" = ar ? "right" : "left";
  const year = new Date().getFullYear();

  const doc = new PDFDocument({
    size: "A4",
    margin: PAGE_MARGIN,
    autoFirstPage: true,
    bufferPages: true,
    info: {
      Title: payload.title,
      Author: "Plotzy",
      Creator: "Plotzy",
      Producer: "Plotzy",
      Subject: ar ? "دليل الكتابة من Plotzy" : "The Plotzy Writing Guide",
      Keywords: "Plotzy, writing guide, plotzy.co",
      CreationDate: new Date(),
    },
  });

  doc.registerFont("body", readFileSync(CAIRO_PATH));
  doc.font("body");
  doc.pipe(output);
  const done = new Promise<void>((res, rej) => {
    output.on("finish", () => res());
    output.on("error", rej);
  });

  const pageW = doc.page.width;
  const pageH = doc.page.height;
  const contentW = pageW - PAGE_MARGIN * 2;

  // Faint diagonal PLOTZY watermark — drawn on every page, never moves the
  // text cursor (save/restore graphics + restore x/y explicitly).
  const watermark = () => {
    const sx = doc.x;
    const sy = doc.y;
    doc.save();
    doc.rotate(-32, { origin: [pageW / 2, pageH / 2] });
    doc
      .fontSize(78)
      .fillColor(COLOR_ACCENT)
      .opacity(0.06)
      .text("PLOTZY", 0, pageH / 2 - 52, {
        width: pageW,
        align: "center",
        characterSpacing: 8,
      });
    doc.opacity(1);
    doc.restore();
    doc.x = sx;
    doc.y = sy;
  };
  watermark(); // first (auto-created) page
  doc.on("pageAdded", watermark);

  const drawDivider = () => {
    doc.moveDown(0.5);
    const yy = doc.y;
    doc
      .save()
      .strokeColor(COLOR_DIVIDER)
      .lineWidth(1)
      .moveTo(PAGE_MARGIN, yy)
      .lineTo(pageW - PAGE_MARGIN, yy)
      .stroke()
      .restore();
    doc.moveDown(0.6);
  };
  const ensureSpace = (h: number) => {
    if (doc.y + h > pageH - PAGE_MARGIN - 24) doc.addPage();
  };

  // ── Header ────────────────────────────────────────────────────────────
  doc.fontSize(11).fillColor(COLOR_ACCENT).text("PLOTZY", { align, characterSpacing: 2 });
  doc.moveDown(0.5);
  doc.fontSize(26).fillColor(COLOR_TITLE).text(payload.title, { align });
  if (payload.subtitle) {
    doc.moveDown(0.2);
    doc.fontSize(13).fillColor(COLOR_LABEL).text(payload.subtitle, { align });
  }
  doc.moveDown(0.35);
  doc
    .fontSize(9)
    .fillColor(COLOR_LABEL)
    .text(
      ar
        ? `© ${year} مؤسسة Plotzy — جميع الحقوق محفوظة`
        : `© ${year} Plotzy — All rights reserved`,
      { align },
    );
  drawDivider();

  // ── Sections ──────────────────────────────────────────────────────────
  for (const section of payload.sections) {
    ensureSpace(80);
    doc.moveDown(0.4);
    doc.fontSize(15).fillColor(COLOR_ACCENT).text(section.heading, { align, characterSpacing: 1 });
    const uy = doc.y + 2;
    doc
      .save()
      .strokeColor(COLOR_ACCENT)
      .lineWidth(2)
      .moveTo(align === "right" ? pageW - PAGE_MARGIN - 46 : PAGE_MARGIN, uy)
      .lineTo(align === "right" ? pageW - PAGE_MARGIN : PAGE_MARGIN + 46, uy)
      .stroke()
      .restore();
    doc.moveDown(0.7);

    for (const b of section.blocks) {
      ensureSpace(54);
      if (b.title) {
        doc.fontSize(12).fillColor(COLOR_HEADER).text(b.title, { align });
        doc.moveDown(0.15);
      }
      if (b.body) {
        doc.fontSize(10.5).fillColor(COLOR_BODY).text(b.body, { align, lineGap: 2 });
        doc.moveDown(0.15);
      }
      if (b.bullets && b.bullets.length > 0) {
        for (const it of b.bullets) {
          ensureSpace(20);
          doc
            .fontSize(10)
            .fillColor(COLOR_BODY)
            .text(ar ? `${it} •` : `• ${it}`, { align, lineGap: 1.5 });
        }
        doc.moveDown(0.1);
      }
      doc.moveDown(0.45);
    }
    drawDivider();
  }

  // ── Intellectual-property notice ──────────────────────────────────────
  ensureSpace(140);
  doc.moveDown(0.4);
  doc
    .fontSize(13)
    .fillColor(COLOR_ACCENT)
    .text(ar ? "إشعار حقوق الملكية الفكرية" : "Copyright & Intellectual Property", { align });
  doc.moveDown(0.35);
  doc
    .fontSize(9.5)
    .fillColor(COLOR_BODY)
    .text(
      ar
        ? `هذا الدليل وكامل محتواه مملوكان حصرياً لمنصة Plotzy ومحميان بموجب حقوق الملكية الفكرية. يُمنع منعاً باتاً نسخه أو إعادة توزيعه أو نشره أو استخدامه تجارياً أو إزالة العلامة المائية منه دون إذن خطّي مُسبق من Plotzy. © ${year} Plotzy. جميع الحقوق محفوظة.`
        : `This guide and all of its contents are the exclusive intellectual property of Plotzy and are protected by copyright law. Reproduction, redistribution, publication, commercial use, or removal of the watermark without prior written permission from Plotzy is strictly prohibited. © ${year} Plotzy. All rights reserved.`,
      { align, lineGap: 2.5 },
    );

  // ── Per-page footer + numbers ─────────────────────────────────────────
  const range = doc.bufferedPageRange();
  for (let i = range.start; i < range.start + range.count; i++) {
    doc.switchToPage(i);
    const fy = pageH - PAGE_MARGIN + 16;
    doc.fontSize(8).fillColor(COLOR_LABEL);
    doc.text(`© ${year} Plotzy · plotzy.co`, PAGE_MARGIN, fy, { lineBreak: false });
    doc.text(`${i - range.start + 1} / ${range.count}`, PAGE_MARGIN, fy, {
      width: contentW,
      align: "right",
      lineBreak: false,
    });
  }

  doc.end();
  await done;
}
