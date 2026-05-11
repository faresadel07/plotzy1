import PDFDocument from "pdfkit";
import { readFileSync, existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import type { Writable } from "node:stream";
import type { UserDataExport } from "./data-export";

/**
 * Human-readable PDF summary for the GDPR Article 15 / 20 export.
 *
 * Companion to the technical JSON dump (lib/data-export.ts). The JSON is
 * complete but unreadable — opening it in Notepad shows arrays of bytes.
 * This PDF presents the same data in a form a non-technical writer can
 * actually read: account info, the books they've written, writing
 * activity, engagement counts, payment history, course progress, and
 * a clear IP-ownership statement.
 *
 * Library choice: pdfkit (not pdf-lib). pdf-lib is the right tool for
 * stamping fields onto a fixed template (see services/certificate-pdf.ts);
 * pdfkit is the right tool for a flowing report with headings,
 * paragraphs, lists, and automatic page breaks across hundreds of book
 * rows. We use both — they don't conflict.
 *
 * Font: bundled Cairo TTF (variable axis, Latin + Arabic glyphs in a
 * single file). One font choice covers both languages, no per-language
 * fallback dance. Visual hierarchy comes from font size and color, not
 * weight, so the variable-axis "default weight" instance is fine.
 *
 * RTL handling for Arabic: section headers and labels are right-aligned
 * via PDFKit's `align: "right"`. Cairo's OpenType shaping handles the
 * letter forms; we don't need to enable any extra features.
 */

const __dirname = dirname(fileURLToPath(import.meta.url));
// In dev (tsx) __dirname is src/lib/, assets are one up at src/assets/.
// In production (esbuild bundled) __dirname is dist/, assets are at
// dist/assets/ (build.mjs copies them there). Try the bundled layout
// first; fall back to the source layout for local dev.
const ASSETS_DIR = (() => {
  const bundled = resolve(__dirname, "assets");
  return existsSync(bundled) ? bundled : resolve(__dirname, "../assets");
})();
const CAIRO_PATH = resolve(ASSETS_DIR, "fonts", "Cairo.ttf");

type Lang = "en" | "ar";

interface Labels {
  yourDataSummary: string;
  forUser: string;
  exportedOn: string;
  account: string;
  displayName: string;
  email: string;
  memberSince: string;
  plan: string;
  status: string;
  renewsOn: string;
  yourBooks: string;
  noBooksYet: string;
  bookTitle: string;
  chapters: string;
  words: string;
  draft: string;
  published: string;
  created: string;
  lastEdited: string;
  writingActivity: string;
  totalChapters: string;
  totalWords: string;
  totalSnapshots: string;
  engagement: string;
  commentsYouHaveWritten: string;
  likesYouHaveGiven: string;
  ratingsYouHaveGiven: string;
  following: string;
  followers: string;
  paymentHistory: string;
  noPayments: string;
  totalSpent: string;
  amount: string;
  date: string;
  courseProgress: string;
  noCourseActivity: string;
  enrolledLessons: string;
  quizzesCompleted: string;
  certificateEarned: string;
  finalProjectSubmitted: string;
  yes: string;
  no: string;
  ipStatement: string;
  ipBody: string;
  ipReference: string;
  footerJsonNote: string;
  footerSupport: string;
  footerGeneratedBy: string;
  none: string;
  // Full-content section
  yourCreativeWork: string;
  yourCreativeWorkSubtitle: string;
  noBooksToInclude: string;
  bookByAuthor: string;
  chapterLabel: string;
  endOfBook: string;
  contentTruncatedNotice: string;
}

const LABELS_EN: Labels = {
  yourDataSummary: "Your Data Summary",
  forUser: "For",
  exportedOn: "Exported",
  account: "Account",
  displayName: "Display name",
  email: "Email",
  memberSince: "Member since",
  plan: "Plan",
  status: "Status",
  renewsOn: "Renews on",
  yourBooks: "Your books",
  noBooksYet: "You haven't created any books yet.",
  bookTitle: "Title",
  chapters: "Chapters",
  words: "words",
  draft: "Draft",
  published: "Published",
  created: "Created",
  lastEdited: "Last edited",
  writingActivity: "Your writing activity",
  totalChapters: "Total chapters written",
  totalWords: "Total words across all books",
  totalSnapshots: "Revision snapshots saved",
  engagement: "Engagement",
  commentsYouHaveWritten: "Comments you have written",
  likesYouHaveGiven: "Likes you have given",
  ratingsYouHaveGiven: "Ratings you have given",
  following: "People you follow",
  followers: "People who follow you",
  paymentHistory: "Payment history",
  noPayments: "No payments on file. You have only used the free tier.",
  totalSpent: "Total spent on Plotzy",
  amount: "Amount",
  date: "Date",
  courseProgress: "Writing course progress",
  noCourseActivity: "You have not started the writing course yet.",
  enrolledLessons: "Lessons completed",
  quizzesCompleted: "Quizzes completed",
  certificateEarned: "Certificate earned",
  finalProjectSubmitted: "Final project submitted",
  yes: "Yes",
  no: "No",
  ipStatement: "Your intellectual property",
  ipBody:
    "All content listed above belongs to you. Plotzy makes no ownership claim on your creative work. We hold a limited license only to host and display your content while the Service operates. We cannot sell it, republish it, train AI on it, or claim authorship. The full terms are in section 4 of the Terms of Service: \"Your Content & Ownership\".",
  ipReference: "Reference: plotzy.co/terms#your-content",
  footerJsonNote:
    "The accompanying file plotzy-export-{date}.json contains the same data in machine-readable form. Use it for migration to another platform, programmatic processing, or as a complete archive of every database row tied to your account.",
  footerSupport: "Questions? Email support@plotzy.co",
  footerGeneratedBy: "Generated by Plotzy on {date}",
  none: "None",
  yourCreativeWork: "Your creative work",
  yourCreativeWorkSubtitle: "The full text of every book and chapter you have written on Plotzy. Each book starts on a new page so you can print or share individual works.",
  noBooksToInclude: "You have not written any chapter content yet.",
  bookByAuthor: "by {author}",
  chapterLabel: "Chapter",
  endOfBook: "End of book",
  contentTruncatedNotice: "Showing the first {count} books. The rest are available in the JSON export.",
};

const LABELS_AR: Labels = {
  yourDataSummary: "ملخص بياناتك",
  forUser: "لـ",
  exportedOn: "تم التصدير",
  account: "الحساب",
  displayName: "اسم العرض",
  email: "البريد الإلكتروني",
  memberSince: "عضو منذ",
  plan: "الخطة",
  status: "الحالة",
  renewsOn: "يتجدد في",
  yourBooks: "كتبك",
  noBooksYet: "لم تنشئ أي كتب بعد.",
  bookTitle: "العنوان",
  chapters: "الفصول",
  words: "كلمة",
  draft: "مسودة",
  published: "منشور",
  created: "أُنشئ",
  lastEdited: "آخر تعديل",
  writingActivity: "نشاط الكتابة",
  totalChapters: "إجمالي الفصول المكتوبة",
  totalWords: "إجمالي الكلمات في جميع الكتب",
  totalSnapshots: "نسخ المراجعة المحفوظة",
  engagement: "التفاعل",
  commentsYouHaveWritten: "التعليقات التي كتبتها",
  likesYouHaveGiven: "الإعجابات التي أعطيتها",
  ratingsYouHaveGiven: "التقييمات التي أعطيتها",
  following: "من تتابع",
  followers: "من يتابعك",
  paymentHistory: "سجل المدفوعات",
  noPayments: "لا توجد مدفوعات. لقد استخدمت الإصدار المجاني فقط.",
  totalSpent: "إجمالي ما أنفقته على Plotzy",
  amount: "المبلغ",
  date: "التاريخ",
  courseProgress: "تقدم دورة الكتابة",
  noCourseActivity: "لم تبدأ دورة الكتابة بعد.",
  enrolledLessons: "الدروس المكتملة",
  quizzesCompleted: "الاختبارات المكتملة",
  certificateEarned: "حصلت على الشهادة",
  finalProjectSubmitted: "أرسلت المشروع النهائي",
  yes: "نعم",
  no: "لا",
  ipStatement: "ملكيتك الفكرية",
  ipBody:
    "جميع المحتويات المذكورة أعلاه ملك لك. Plotzy لا تدّعي ملكية أي من أعمالك الإبداعية. لدينا ترخيص محدود فقط لاستضافة وعرض محتواك أثناء تشغيل الخدمة. لا يمكننا بيعه أو إعادة نشره أو تدريب الذكاء الاصطناعي عليه أو ادعاء التأليف. الشروط الكاملة في القسم الرابع من شروط الخدمة: \"محتواك وملكيتك\".",
  ipReference: "المرجع: plotzy.co/terms#your-content",
  footerJsonNote:
    "الملف المرفق plotzy-export-{date}.json يحتوي على نفس البيانات بصيغة قابلة للقراءة الآلية. استخدمه للانتقال إلى منصة أخرى، أو للمعالجة البرمجية، أو كأرشيف كامل لكل صف في قاعدة البيانات مرتبط بحسابك.",
  footerSupport: "أي استفسار؟ راسلنا على support@plotzy.co",
  footerGeneratedBy: "تم الإنشاء بواسطة Plotzy في {date}",
  none: "لا يوجد",
  yourCreativeWork: "أعمالك الإبداعية",
  yourCreativeWorkSubtitle: "النص الكامل لكل كتاب وفصل كتبته على Plotzy. يبدأ كل كتاب في صفحة جديدة لتتمكن من طباعته أو مشاركته بشكل منفصل.",
  noBooksToInclude: "لم تكتب أي محتوى للفصول بعد.",
  bookByAuthor: "بقلم {author}",
  chapterLabel: "الفصل",
  endOfBook: "نهاية الكتاب",
  contentTruncatedNotice: "تعرض أول {count} كتب. الباقي متوفر في ملف JSON.",
};

// ── Layout constants ────────────────────────────────────────────────
const PAGE_MARGIN = 56;
const SIZE_TITLE = 26;
const SIZE_SECTION_HEADER = 16;
const SIZE_LABEL = 9;
const SIZE_VALUE = 11;
const SIZE_BODY = 10;
const SIZE_SMALL = 9;

// Plotzy palette — kept consistent with the dark frontend's accent.
const COLOR_TITLE = "#0a0a0a";
const COLOR_HEADER = "#111111";
const COLOR_BODY = "#333333";
const COLOR_LABEL = "#888888";
const COLOR_DIVIDER = "#e5e5e5";
const COLOR_ACCENT = "#7c6af7";

export interface DataExportPdfOptions {
  language?: Lang;
}

// Hard cap on full-content rendering. Once the running word count
// crosses this threshold, remaining books are dropped and a closing
// notice is emitted pointing the user at the JSON export. Tuned so a
// typical novelist (six full-length novels of ~80K each) fits without
// truncation, but a power user with hundreds of books doesn't blow up
// the response. The JSON export is unbounded and always available as
// the source of truth.
const FULL_CONTENT_WORD_BUDGET = 500_000;

/**
 * Stream the data-export PDF to the given writable. Returns when the
 * document is fully written. Passing `output = res` from the route
 * handler avoids buffering the entire PDF in memory — critical for
 * users with hundreds of books.
 *
 * Caller is responsible for setting Content-Type / Content-Disposition
 * headers BEFORE calling this — once pdfkit starts writing to the
 * stream, headers are committed.
 */
export async function streamDataExportPdf(
  data: UserDataExport,
  output: Writable,
  opts: DataExportPdfOptions = {},
): Promise<void> {
  const lang: Lang = opts.language === "ar" ? "ar" : "en";
  const L = lang === "ar" ? LABELS_AR : LABELS_EN;
  const align = lang === "ar" ? "right" : "left";

  const doc = new PDFDocument({
    size: "A4",
    margin: PAGE_MARGIN,
    autoFirstPage: true,
    info: {
      Title: lang === "ar" ? "ملخص بيانات Plotzy" : "Plotzy Data Summary",
      Author: "Plotzy",
      Creator: "Plotzy",
      Producer: "pdfkit + Plotzy data-export",
      CreationDate: new Date(),
    },
  });

  // Single TTF (Cairo, variable axis) covers Latin + Arabic. Registered
  // as the default font for the whole document.
  const cairoBytes = readFileSync(CAIRO_PATH);
  doc.registerFont("body", cairoBytes);
  doc.font("body");

  // Pipe straight through. pdfkit emits chunks as it writes; archiver
  // (or the response stream) consumes them without us holding the
  // full PDF in memory.
  doc.pipe(output);
  const done = new Promise<void>((res, rej) => {
    output.on("finish", () => res());
    output.on("error", rej);
  });

  // ── Render ─────────────────────────────────────────────────────────
  renderHeader(doc, data, L, align, lang);
  renderAccount(doc, data, L, align, lang);
  renderBooks(doc, data, L, align, lang);
  renderWritingActivity(doc, data, L, align);
  renderEngagement(doc, data, L, align);
  renderPaymentHistory(doc, data, L, align, lang);
  renderCourseProgress(doc, data, L, align);
  renderIpStatement(doc, L, align);
  renderFullBookContent(doc, data, L, align, lang);
  renderFooter(doc, L, align, lang);

  doc.end();
  await done;
}

// ── Section renderers ────────────────────────────────────────────────

function renderHeader(doc: PDFKit.PDFDocument, data: UserDataExport, L: Labels, align: "left" | "right", lang: Lang) {
  // Plotzy wordmark
  doc
    .fontSize(11)
    .fillColor(COLOR_ACCENT)
    .text("PLOTZY", { align, characterSpacing: 2 });

  doc.moveDown(0.6);
  doc.fontSize(SIZE_TITLE).fillColor(COLOR_TITLE).text(L.yourDataSummary, { align });

  doc.moveDown(0.3);
  doc.fontSize(SIZE_BODY).fillColor(COLOR_LABEL);
  const email = (data.user as any).email || "";
  if (email) doc.text(`${L.forUser} ${email}`, { align });

  doc.moveDown(0.1);
  doc.text(`${L.exportedOn} ${formatDate(data.exportedAt, lang)}`, { align });

  doc.moveDown(1.2);
  drawDivider(doc);
  doc.moveDown(0.8);
}

function renderAccount(doc: PDFKit.PDFDocument, data: UserDataExport, L: Labels, align: "left" | "right", lang: Lang) {
  sectionHeader(doc, L.account, align);
  const u = data.user as any;

  const rows: [string, string][] = [
    [L.displayName, u.displayName || L.none],
    [L.email, u.email || L.none],
    [L.memberSince, u.createdAt ? formatDate(u.createdAt, lang) : L.none],
    [L.plan, formatPlan(u.subscriptionPlan, u.subscriptionTier, lang)],
    [L.status, u.subscriptionStatus || (lang === "ar" ? "مجاني" : "Free")],
  ];
  if (u.subscriptionEndDate) {
    rows.push([L.renewsOn, formatDate(u.subscriptionEndDate, lang)]);
  }
  drawKeyValueGrid(doc, rows, align);

  doc.moveDown(1.2);
}

function renderBooks(doc: PDFKit.PDFDocument, data: UserDataExport, L: Labels, align: "left" | "right", lang: Lang) {
  sectionHeader(doc, L.yourBooks, align);
  const books = (data.writing as any).books as any[];
  if (!books || books.length === 0) {
    doc.fontSize(SIZE_BODY).fillColor(COLOR_LABEL).text(L.noBooksYet, { align });
    doc.moveDown(1.2);
    return;
  }

  for (const b of books) {
    if (doc.y > doc.page.height - 140) doc.addPage();

    // Title
    doc.fontSize(SIZE_VALUE).fillColor(COLOR_HEADER).text(b.title || "(untitled)", { align });

    // Stat line
    const chapters = (b.chapters || []) as any[];
    const totalWords = chapters.reduce((sum: number, c: any) => sum + countWords(c.content || ""), 0);
    const status = b.isPublished ? L.published : L.draft;
    const created = b.createdAt ? formatDate(b.createdAt, lang) : L.none;
    const updated = lastChapterUpdate(chapters, lang) || created;

    doc.fontSize(SIZE_SMALL).fillColor(COLOR_LABEL);
    const stat = `${chapters.length} ${L.chapters}  ·  ${formatNumber(totalWords, lang)} ${L.words}  ·  ${status}`;
    doc.text(stat, { align });
    doc.text(`${L.created}: ${created}  ·  ${L.lastEdited}: ${updated}`, { align });

    doc.moveDown(0.6);
  }

  doc.moveDown(0.6);
}

function renderWritingActivity(doc: PDFKit.PDFDocument, data: UserDataExport, L: Labels, align: "left" | "right") {
  sectionHeader(doc, L.writingActivity, align);
  const books = ((data.writing as any).books || []) as any[];
  let totalChapters = 0;
  let totalWords = 0;
  let totalSnapshots = 0;
  for (const b of books) {
    const chapters = (b.chapters || []) as any[];
    totalChapters += chapters.length;
    for (const c of chapters) {
      totalWords += countWords(c.content || "");
      totalSnapshots += ((c.snapshots || []) as any[]).length;
    }
  }

  drawKeyValueGrid(doc, [
    [L.totalChapters, String(totalChapters)],
    [L.totalWords, String(totalWords)],
    [L.totalSnapshots, String(totalSnapshots)],
  ], align);
  doc.moveDown(1.2);
}

function renderEngagement(doc: PDFKit.PDFDocument, data: UserDataExport, L: Labels, align: "left" | "right") {
  sectionHeader(doc, L.engagement, align);
  const w = data.writing as any;
  const s = data.social as any;
  drawKeyValueGrid(doc, [
    [L.commentsYouHaveWritten, String((w.bookComments || []).length + (w.inlineComments || []).length)],
    [L.likesYouHaveGiven, String((w.bookLikes || []).length)],
    [L.ratingsYouHaveGiven, String((w.bookRatings || []).length)],
    [L.following, String((s.following || []).length)],
    [L.followers, String((s.followers || []).length)],
  ], align);
  doc.moveDown(1.2);
}

function renderPaymentHistory(doc: PDFKit.PDFDocument, data: UserDataExport, L: Labels, align: "left" | "right", lang: Lang) {
  sectionHeader(doc, L.paymentHistory, align);
  const payments = (data.subscription as any).payments as any[];
  if (!payments || payments.length === 0) {
    doc.fontSize(SIZE_BODY).fillColor(COLOR_LABEL).text(L.noPayments, { align });
    doc.moveDown(1.2);
    return;
  }

  let totalCents = 0;
  for (const p of payments) {
    if (doc.y > doc.page.height - 100) doc.addPage();
    const date = p.createdAt ? formatDate(p.createdAt, lang) : L.none;
    const amount = formatMoney(p.amountCents ?? 0, p.currency ?? "USD");
    const tier = p.tier || "";
    const cycle = p.cycle || "";
    doc.fontSize(SIZE_VALUE).fillColor(COLOR_HEADER).text(`${amount}  ·  ${tier} ${cycle}`.trim(), { align });
    doc.fontSize(SIZE_SMALL).fillColor(COLOR_LABEL).text(date, { align });
    doc.moveDown(0.5);
    if (typeof p.amountCents === "number") totalCents += p.amountCents;
  }

  doc.moveDown(0.4);
  drawDivider(doc);
  doc.moveDown(0.4);
  drawKeyValueGrid(doc, [
    [L.totalSpent, formatMoney(totalCents, payments[0]?.currency ?? "USD")],
  ], align);

  doc.moveDown(1.2);
}

function renderCourseProgress(doc: PDFKit.PDFDocument, data: UserDataExport, L: Labels, align: "left" | "right") {
  sectionHeader(doc, L.courseProgress, align);
  const c = data.course as any;
  const lessons = (c.progress || []) as any[];
  const attempts = (c.quizAttempts || []) as any[];
  const cert = c.certificate;
  const finalProj = c.finalProject;

  if (lessons.length === 0 && attempts.length === 0 && !cert && !finalProj) {
    doc.fontSize(SIZE_BODY).fillColor(COLOR_LABEL).text(L.noCourseActivity, { align });
    doc.moveDown(1.2);
    return;
  }

  drawKeyValueGrid(doc, [
    [L.enrolledLessons, String(lessons.length)],
    [L.quizzesCompleted, String(attempts.length)],
    [L.certificateEarned, cert ? L.yes : L.no],
    [L.finalProjectSubmitted, finalProj ? L.yes : L.no],
  ], align);
  doc.moveDown(1.2);
}

function renderIpStatement(doc: PDFKit.PDFDocument, L: Labels, align: "left" | "right") {
  if (doc.y > doc.page.height - 220) doc.addPage();
  // IP statement gets a soft accent panel to anchor the page visually.
  const startY = doc.y;
  const padding = 16;
  const innerWidth = doc.page.width - 2 * PAGE_MARGIN - 2 * padding;

  // Measure the body height first so we can draw the background behind it.
  const headerHeight = 22;
  const bodyHeight = doc.heightOfString(L.ipBody, { width: innerWidth, align });
  const refHeight = 14;
  const totalHeight = padding + headerHeight + 6 + bodyHeight + 8 + refHeight + padding;

  doc
    .save()
    .roundedRect(PAGE_MARGIN, startY, doc.page.width - 2 * PAGE_MARGIN, totalHeight, 8)
    .fillColor("#f6f5ff")
    .fill()
    .restore();

  doc.y = startY + padding;
  doc.x = PAGE_MARGIN + padding;
  doc.fontSize(SIZE_SECTION_HEADER).fillColor(COLOR_ACCENT).text(L.ipStatement, { align, width: innerWidth });
  doc.moveDown(0.3);
  doc.fontSize(SIZE_BODY).fillColor(COLOR_BODY).text(L.ipBody, { align, width: innerWidth, lineGap: 2 });
  doc.moveDown(0.4);
  doc.fontSize(SIZE_SMALL).fillColor(COLOR_LABEL).text(L.ipReference, { align, width: innerWidth });

  doc.x = PAGE_MARGIN;
  doc.y = startY + totalHeight + 16;
}

/**
 * Full book content section. One book per "title spread" (centered
 * title page, then chapter content with chapter-titled headings).
 * Streams page-by-page, so a 10-novel user doesn't blow up memory.
 *
 * Per-book layout:
 *   - Page break (every book starts on its own page)
 *   - "Book N of M" eyebrow label, dimmed
 *   - Centered title (large, ~32pt)
 *   - Centered "by Author" line, smaller
 *   - Centered status + creation date, small
 *   - Page break (chapter content starts fresh)
 *   - For each non-empty chapter:
 *       * "Chapter N: Title" heading
 *       * Body text rendered as paragraphs (paragraph-gap, line-gap
 *         tuned for readability, not density)
 *       * Page break (between chapters; not after the last one)
 *   - Centered "End of book" footer
 *
 * Word-budget cap (FULL_CONTENT_WORD_BUDGET = 500K): once cumulative
 * rendered words exceed the budget, remaining books are skipped and a
 * closing notice tells the reader to use the JSON export for the
 * complete dump.
 *
 * Content direction: each book's `language` field determines
 * paragraph alignment for that book's chapter bodies. The section
 * header itself uses the UI label alignment (so an Arabic UI gets a
 * right-aligned section header even when reviewing English-language
 * book bodies).
 */
function renderFullBookContent(doc: PDFKit.PDFDocument, data: UserDataExport, L: Labels, align: "left" | "right", lang: Lang) {
  const allBooks = ((data.writing as any).books || []) as any[];
  // Filter to books with at least one chapter that has any content.
  // Empty drafts shouldn't get a "title page" in the printed book.
  const candidates = allBooks.filter(b => {
    const chs = (b.chapters || []) as any[];
    return chs.some(c => extractParagraphs(c.content || "").length > 0);
  });

  doc.addPage();
  sectionHeader(doc, L.yourCreativeWork, align);
  doc.fontSize(SIZE_BODY).fillColor(COLOR_LABEL).text(L.yourCreativeWorkSubtitle, { align, lineGap: 2 });
  doc.moveDown(1.0);

  if (candidates.length === 0) {
    doc.fontSize(SIZE_BODY).fillColor(COLOR_LABEL).text(L.noBooksToInclude, { align });
    doc.moveDown(1.0);
    return;
  }

  let cumulativeWords = 0;
  let booksRendered = 0;

  for (let i = 0; i < candidates.length; i++) {
    const b = candidates[i];

    // Word-budget gate. We check BEFORE adding the title page so a
    // partially-rendered book never appears in the PDF.
    if (cumulativeWords >= FULL_CONTENT_WORD_BUDGET) break;

    renderBookTitlePage(doc, b, L, lang, i + 1, candidates.length);

    const bookLang: Lang = (b.language || "en") === "ar" ? "ar" : "en";
    const bodyAlign: "left" | "right" = bookLang === "ar" ? "right" : "left";

    const chapters = (b.chapters || []) as any[];
    const nonEmptyChapters = chapters
      .map((c, idx) => ({ chapter: c, paragraphs: extractParagraphs(c.content || ""), originalIdx: idx }))
      .filter(x => x.paragraphs.length > 0);

    for (let j = 0; j < nonEmptyChapters.length; j++) {
      const { chapter, paragraphs, originalIdx } = nonEmptyChapters[j];
      doc.addPage();
      // Chapter heading
      doc.fontSize(SIZE_SECTION_HEADER).fillColor(COLOR_HEADER).text(
        `${L.chapterLabel} ${originalIdx + 1}: ${chapter.title || ""}`.trim(),
        { align: bodyAlign },
      );
      doc.moveDown(0.6);

      // Chapter body — paragraphs flow with comfortable spacing.
      doc.fontSize(SIZE_BODY).fillColor(COLOR_BODY);
      for (const para of paragraphs) {
        doc.text(para, { align: bodyAlign, lineGap: 3, paragraphGap: 8 });
      }

      cumulativeWords += paragraphs.reduce((sum, p) => sum + p.split(/\s+/).filter(Boolean).length, 0);
    }

    // End-of-book footer (centered, regardless of UI direction)
    doc.moveDown(1.0);
    doc.fontSize(SIZE_SMALL).fillColor(COLOR_LABEL).text(`* ${L.endOfBook} *`, { align: "center" });

    booksRendered = i + 1;
  }

  // Truncation notice (only if we actually skipped books)
  if (booksRendered < candidates.length) {
    doc.addPage();
    doc.moveDown(2);
    doc.fontSize(SIZE_BODY).fillColor(COLOR_LABEL).text(
      L.contentTruncatedNotice.replace("{count}", String(booksRendered)),
      { align: "center", lineGap: 2 },
    );
  }
}

function renderBookTitlePage(doc: PDFKit.PDFDocument, b: any, L: Labels, lang: Lang, index: number, total: number) {
  doc.addPage();

  // Eyebrow: "Book N of M"
  doc.moveDown(8);
  const eyebrow = lang === "ar"
    ? `الكتاب ${index} من ${total}`
    : `Book ${index} of ${total}`;
  doc.fontSize(SIZE_LABEL).fillColor(COLOR_LABEL).text(eyebrow, { align: "center", characterSpacing: 1 });

  doc.moveDown(1.5);

  // Title — large and centered. Use slightly smaller than the cover
  // SIZE_TITLE so a long title fits without wrap-then-wrap chaos.
  doc.fontSize(30).fillColor(COLOR_TITLE).text(b.title || "(untitled)", { align: "center" });

  doc.moveDown(1.0);

  if (b.authorName) {
    doc.fontSize(14).fillColor(COLOR_BODY).text(L.bookByAuthor.replace("{author}", b.authorName), { align: "center" });
    doc.moveDown(0.6);
  }

  // Status + date footer
  const status = b.isPublished ? L.published : L.draft;
  const created = b.createdAt ? formatDate(b.createdAt, lang) : "";
  const meta = [status, created].filter(Boolean).join("  ·  ");
  doc.fontSize(SIZE_SMALL).fillColor(COLOR_LABEL).text(meta, { align: "center" });
}

/**
 * Turn raw chapter content into an array of plain-text paragraphs.
 *
 * Source format from the editor is one of:
 *   1. Plain HTML: "<p>...</p><p>...</p>"
 *   2. JSON-encoded paginated array: '["<p>...</p>", "<p>...</p>"]'
 *      or '[{ "content": "<p>...</p>" }, ...]'
 *   3. Plain text fallback (legacy)
 *
 * We split on </p>, </h*>, <br>, and double newlines to get paragraph
 * units, then strip remaining tags + decode entities. Empty paragraphs
 * are dropped so the renderer doesn't draw bare spacing on a fresh
 * page.
 */
function extractParagraphs(content: string): string[] {
  if (!content) return [];

  // Pre-flatten paginated tiptap JSON into one HTML stream.
  let html = content;
  try {
    const parsed = JSON.parse(content);
    if (Array.isArray(parsed)) {
      html = parsed
        .map((p: any) => (typeof p === "string" ? p : (p?.content ?? "")))
        .join("");
    }
  } catch { /* not JSON, treat as raw HTML */ }

  // Normalise paragraph break markers to a single token so we can
  // split on it cleanly.
  const BREAK = "";
  const broken = html
    .replace(/<\/p>/gi, BREAK)
    .replace(/<\/h[1-6]>/gi, BREAK)
    .replace(/<\/li>/gi, BREAK)
    .replace(/<\/blockquote>/gi, BREAK)
    .replace(/<br\s*\/?>(?!\s*<\/)/gi, BREAK)
    .replace(/\n\n+/g, BREAK);

  return broken
    .split(BREAK)
    .map(stripAndDecode)
    .map(s => s.replace(/\s+/g, " ").trim())
    .filter(Boolean);
}

function stripAndDecode(s: string): string {
  return s
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&hellip;/g, "…")
    .replace(/&[lr]squo;/g, "'")
    .replace(/&[lr]dquo;/g, '"');
}

function renderFooter(doc: PDFKit.PDFDocument, L: Labels, align: "left" | "right", lang: Lang) {
  if (doc.y > doc.page.height - 140) doc.addPage();
  drawDivider(doc);
  doc.moveDown(0.6);
  const dateStr = formatDate(new Date().toISOString(), lang);
  const jsonNote = L.footerJsonNote.replace("{date}", dateStr);
  const generated = L.footerGeneratedBy.replace("{date}", dateStr);

  doc.fontSize(SIZE_SMALL).fillColor(COLOR_LABEL).text(jsonNote, { align, lineGap: 1.5 });
  doc.moveDown(0.4);
  doc.text(L.footerSupport, { align });
  doc.moveDown(0.2);
  doc.fillColor("#bbb").text(generated, { align });
}

// ── Drawing helpers ──────────────────────────────────────────────────

function sectionHeader(doc: PDFKit.PDFDocument, text: string, align: "left" | "right") {
  if (doc.y > doc.page.height - 120) doc.addPage();
  doc
    .fontSize(SIZE_SECTION_HEADER)
    .fillColor(COLOR_HEADER)
    .text(text, { align });
  doc.moveDown(0.5);
}

function drawDivider(doc: PDFKit.PDFDocument) {
  doc
    .save()
    .moveTo(PAGE_MARGIN, doc.y)
    .lineTo(doc.page.width - PAGE_MARGIN, doc.y)
    .strokeColor(COLOR_DIVIDER)
    .lineWidth(0.5)
    .stroke()
    .restore();
}

function drawKeyValueGrid(doc: PDFKit.PDFDocument, rows: Array<[string, string]>, align: "left" | "right") {
  for (const [k, v] of rows) {
    doc.fontSize(SIZE_LABEL).fillColor(COLOR_LABEL).text(k.toUpperCase(), { align, characterSpacing: 0.5 });
    doc.fontSize(SIZE_VALUE).fillColor(COLOR_BODY).text(v, { align });
    doc.moveDown(0.4);
  }
}

// ── Formatters ───────────────────────────────────────────────────────

function formatDate(iso: string | Date, lang: Lang): string {
  const d = iso instanceof Date ? iso : new Date(iso);
  if (Number.isNaN(d.getTime())) return lang === "ar" ? "لا يوجد" : "None";
  return d.toLocaleDateString(lang === "ar" ? "ar-SA-u-ca-gregory" : "en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

function formatNumber(n: number, lang: Lang): string {
  return n.toLocaleString(lang === "ar" ? "ar-SA" : "en-US");
}

function formatMoney(cents: number, currency: string): string {
  const amount = cents / 100;
  // Always render money in en-US format — payment-processor invoices
  // use Western digits universally and writers expect to recognise
  // the dollar amount they were charged.
  return new Intl.NumberFormat("en-US", { style: "currency", currency }).format(amount);
}

function formatPlan(plan: string | null | undefined, tier: string | null | undefined, lang: Lang): string {
  if (!tier && !plan) return lang === "ar" ? "مجاني" : "Free";
  const t = (tier || "").toLowerCase();
  const labels: Record<string, { en: string; ar: string }> = {
    pro: { en: "Pro", ar: "برو" },
    premium: { en: "Premium", ar: "بريميوم" },
  };
  const tierLabel = labels[t]?.[lang] ?? (tier || plan || (lang === "ar" ? "مجاني" : "Free"));
  return tierLabel;
}

function countWords(content: string): number {
  if (!content) return 0;
  // Strip HTML and JSON-encoded tiptap pages
  let text = content;
  try {
    const parsed = JSON.parse(content);
    if (Array.isArray(parsed)) {
      text = parsed.map((p: any) => (typeof p === "string" ? p : p?.content ?? "")).join(" ");
    }
  } catch { /* not json — use raw */ }
  return text
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .trim()
    .split(/\s+/)
    .filter(Boolean).length;
}

function lastChapterUpdate(chapters: any[], lang: Lang): string | null {
  let latest: number | null = null;
  for (const c of chapters) {
    for (const s of (c.snapshots || []) as any[]) {
      const t = new Date(s.createdAt).getTime();
      if (!Number.isNaN(t) && (latest === null || t > latest)) latest = t;
    }
    const t = c.createdAt ? new Date(c.createdAt).getTime() : NaN;
    if (!Number.isNaN(t) && (latest === null || t > latest)) latest = t;
  }
  return latest === null ? null : formatDate(new Date(latest), lang);
}
