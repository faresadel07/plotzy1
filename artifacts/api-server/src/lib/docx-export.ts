import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  HeadingLevel,
  AlignmentType,
  PageBreak,
  TableOfContents,
} from "docx";

/**
 * Build a .docx Buffer for a book.
 *
 * Why an in-process generator and not a CLI like Pandoc:
 *   - one fewer system dep on the deploy host
 *   - the docx npm package writes straight to a Buffer, no temp file dance
 *   - the per-tag mapping below preserves the only formatting our editor
 *     actually emits (tiptap's output is a small, well-known set of tags),
 *     so a 700-line full HTML parser would be overkill
 *
 * Front matter shipped in the file:
 *   - title page with title + author + copyright
 *   - auto-updating Word table of contents
 *     (Word/LibreOffice fill it in on first open; we only emit the field
 *     definition, not a baked snapshot, so the TOC stays correct after
 *     the user edits the file)
 *   - one chapter per Heading 1, page-break separated
 *
 * What is preserved from the source HTML:
 *   - block tags: <p>, <h1>-<h3> (h4+ collapse to h3), <ul>/<ol>, <blockquote>,
 *     <hr>, <pre>
 *   - inline tags: <strong>/<b>, <em>/<i>, <u>, <br>, <a> (href dropped —
 *     docx supports hyperlinks but they require a separate package
 *     concept and few writers care for the editor-handoff use case)
 *
 * What is NOT preserved (deliberate v1 scope):
 *   - <img> tags become a "[Image]" text placeholder. Real embedding
 *     would need ImageRun + binary fetch + size measurement and
 *     significantly enlarge the binary; can be added later.
 *   - colors, fonts, custom styles. The recipient's editor/agent will
 *     re-style anyway.
 */

interface ChapterInput {
  title: string;
  /** Raw HTML from the editor (already pre-joined across paginated chunks). */
  html: string;
}

interface BookInput {
  title: string;
  authorName: string | null;
  copyrightYear: number;
}

export async function generateBookDocx(book: BookInput, chapters: ChapterInput[]): Promise<Buffer> {
  const doc = new Document({
    creator: "Plotzy",
    title: book.title,
    description: book.authorName ? `By ${book.authorName}` : undefined,
    features: {
      // Word ignores TableOfContents fields unless the document is
      // marked as needing field-update on open.
      updateFields: true,
    },
    styles: {
      // Override the default heading sizes to be a bit tighter and
      // more book-like (Word's defaults shout).
      paragraphStyles: [
        {
          id: "Heading1",
          name: "Heading 1",
          basedOn: "Normal",
          next: "Normal",
          quickFormat: true,
          run: { size: 32, bold: true },
          paragraph: { spacing: { before: 480, after: 240 } },
        },
        {
          id: "Heading2",
          name: "Heading 2",
          basedOn: "Normal",
          next: "Normal",
          quickFormat: true,
          run: { size: 26, bold: true },
          paragraph: { spacing: { before: 320, after: 160 } },
        },
        {
          id: "Heading3",
          name: "Heading 3",
          basedOn: "Normal",
          next: "Normal",
          quickFormat: true,
          run: { size: 22, bold: true },
          paragraph: { spacing: { before: 240, after: 120 } },
        },
      ],
    },
    sections: [
      {
        children: [
          ...buildTitlePage(book),
          ...buildTableOfContents(),
          ...buildChapters(chapters),
        ],
      },
    ],
  });

  return await Packer.toBuffer(doc);
}

function buildTitlePage(book: BookInput): Paragraph[] {
  const out: Paragraph[] = [];

  // Vertical breathing room above the title.
  out.push(new Paragraph({ children: [new TextRun(" ")], spacing: { before: 2400 } }));

  out.push(
    new Paragraph({
      alignment: AlignmentType.CENTER,
      children: [new TextRun({ text: book.title, bold: true, size: 56 })],
    }),
  );

  if (book.authorName) {
    out.push(
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { before: 480 },
        children: [new TextRun({ text: `by ${book.authorName}`, italics: true, size: 28 })],
      }),
    );
  }

  out.push(
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { before: 4800 },
      children: [
        new TextRun({
          text: `© ${book.copyrightYear} ${book.authorName || ""}`.trim(),
          size: 18,
        }),
      ],
    }),
  );

  out.push(new Paragraph({ children: [new PageBreak()] }));
  return out;
}

function buildTableOfContents(): Paragraph[] {
  return [
    new Paragraph({
      heading: HeadingLevel.HEADING_1,
      children: [new TextRun("Contents")],
    }),
    // \o "1-3" — include heading levels 1 through 3
    // \h         — make TOC entries hyperlinks
    // \z         — hide tab leaders in web view
    // \u         — use heading style outline numbers
    new Paragraph({
      children: [
        new TableOfContents("Contents", { hyperlink: true, headingStyleRange: "1-3" }),
      ],
    }),
    new Paragraph({ children: [new PageBreak()] }),
  ];
}

function buildChapters(chapters: ChapterInput[]): Paragraph[] {
  const out: Paragraph[] = [];

  chapters.forEach((ch, i) => {
    out.push(
      new Paragraph({
        heading: HeadingLevel.HEADING_1,
        children: [new TextRun(`Chapter ${i + 1}: ${ch.title}`)],
      }),
    );

    const body = htmlToParagraphs(ch.html || "");
    if (body.length === 0) {
      // Empty chapter — keep the heading but emit a placeholder so the
      // page break still has something to belong to.
      out.push(new Paragraph({ children: [new TextRun({ text: "[empty]", italics: true })] }));
    } else {
      out.push(...body);
    }

    // Page break between chapters (but not after the very last).
    if (i < chapters.length - 1) {
      out.push(new Paragraph({ children: [new PageBreak()] }));
    }
  });

  return out;
}

/* ─── HTML → Paragraph[] ──────────────────────────────────────────
 *
 * Splits source HTML on the block-level tags we care about, then for
 * each block produces a Paragraph with the appropriate heading level,
 * list marker, or quote indent. Inline tags inside each block become
 * TextRun children with the right formatting flags.
 *
 * Anything we don't recognise (e.g. <table>, <iframe>) is rendered as
 * its plain-text content via stripTags.
 */

const BLOCK_RE = /<(h[1-6]|p|ul|ol|blockquote|pre|hr)([^>]*)>([\s\S]*?)<\/\1>|<hr\s*\/?>/gi;

function htmlToParagraphs(html: string): Paragraph[] {
  if (!html.trim()) return [];

  const out: Paragraph[] = [];
  let lastIndex = 0;
  let m: RegExpExecArray | null;

  // Reset state — the regex is module-scoped with /g, so re-running
  // against fresh input requires resetting lastIndex on the regex
  // itself. We use exec() in a loop so this matters per chapter call.
  BLOCK_RE.lastIndex = 0;

  while ((m = BLOCK_RE.exec(html)) !== null) {
    // Capture any loose text/inline content between blocks as a paragraph.
    if (m.index > lastIndex) {
      const between = html.slice(lastIndex, m.index).trim();
      if (between) {
        out.push(new Paragraph({ children: htmlToTextRuns(between) }));
      }
    }

    const tag = (m[1] || (m[0]?.startsWith("<hr") ? "hr" : "")).toLowerCase();
    const inner = m[3] ?? "";

    switch (tag) {
      case "h1":
      case "h2":
      case "h3":
        out.push(
          new Paragraph({
            heading: tag === "h1" ? HeadingLevel.HEADING_2 // h1 inside chapter -> h2 (chapter title is h1)
                   : tag === "h2" ? HeadingLevel.HEADING_2
                   : HeadingLevel.HEADING_3,
            children: htmlToTextRuns(inner),
          }),
        );
        break;
      case "h4":
      case "h5":
      case "h6":
        out.push(
          new Paragraph({
            heading: HeadingLevel.HEADING_3,
            children: htmlToTextRuns(inner),
          }),
        );
        break;
      case "p":
        out.push(new Paragraph({ children: htmlToTextRuns(inner) }));
        break;
      case "blockquote":
        // Force italics on the whole quote for visual distinction.
        out.push(
          new Paragraph({
            indent: { left: 720 },
            children: htmlToTextRuns(inner, { italics: true }),
          }),
        );
        break;
      case "pre":
        // Preserve whitespace as best we can — line breaks become real
        // line breaks in the run.
        out.push(
          new Paragraph({
            children: stripTags(inner)
              .split("\n")
              .flatMap((line, idx, arr) => {
                const runs: TextRun[] = [new TextRun({ text: line, font: "Courier New" })];
                if (idx < arr.length - 1) runs.push(new TextRun({ break: 1 }));
                return runs;
              }),
          }),
        );
        break;
      case "ul":
      case "ol":
        out.push(...listItemsToParagraphs(inner, tag === "ol"));
        break;
      case "hr":
        out.push(
          new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [new TextRun({ text: "* * *" })],
          }),
        );
        break;
    }

    lastIndex = m.index + m[0].length;
  }

  // Trailing inline content after the last block.
  if (lastIndex < html.length) {
    const tail = html.slice(lastIndex).trim();
    if (tail) {
      out.push(new Paragraph({ children: htmlToTextRuns(tail) }));
    }
  }

  // No blocks matched at all? Treat the whole thing as one paragraph.
  if (out.length === 0) {
    out.push(new Paragraph({ children: htmlToTextRuns(html) }));
  }

  return out;
}

function listItemsToParagraphs(html: string, ordered: boolean): Paragraph[] {
  const out: Paragraph[] = [];
  const liRe = /<li[^>]*>([\s\S]*?)<\/li>/gi;
  let m: RegExpExecArray | null;
  let i = 0;
  while ((m = liRe.exec(html)) !== null) {
    const itemRuns = htmlToTextRuns(m[1] ?? "");
    if (ordered) {
      // The docx library can render numbered lists via a registered
      // numbering definition, but that requires upfront boilerplate.
      // For the editor-handoff use case a manual "1. " prefix reads
      // identically and avoids the registration dance.
      out.push(
        new Paragraph({
          children: [new TextRun({ text: `${i + 1}. ` }), ...itemRuns],
          indent: { left: 360 },
        }),
      );
    } else {
      out.push(
        new Paragraph({
          children: itemRuns,
          bullet: { level: 0 },
        }),
      );
    }
    i++;
  }
  return out;
}

/* ─── Inline tag walker ───────────────────────────────────────────
 *
 * Walks an HTML fragment that contains only inline tags + text, and
 * emits a flat array of TextRun. Supports nested tags (e.g.
 * <strong><em>...</em></strong>) by tracking active formatting
 * flags on a stack.
 */

interface RunFlags {
  bold?: boolean;
  italics?: boolean;
  underline?: boolean;
}

function htmlToTextRuns(html: string, baseFlags: RunFlags = {}): TextRun[] {
  const runs: TextRun[] = [];
  const stack: RunFlags[] = [{ ...baseFlags }];
  const top = () => stack[stack.length - 1];

  const tokenRe = /<\/?\w+[^>]*\/?>|[^<]+/g;
  let m: RegExpExecArray | null;

  while ((m = tokenRe.exec(html)) !== null) {
    const tok = m[0];
    if (tok.startsWith("<")) {
      const isClose = tok.startsWith("</");
      const tagMatch = tok.match(/^<\/?(\w+)/);
      if (!tagMatch) continue;
      const tag = tagMatch[1].toLowerCase();

      if (tag === "br") {
        runs.push(new TextRun({ break: 1 }));
        continue;
      }
      if (tag === "img") {
        const altMatch = tok.match(/alt=["']([^"']*)["']/i);
        const alt = altMatch ? altMatch[1] : "";
        runs.push(new TextRun({ text: alt ? `[Image: ${alt}]` : "[Image]", italics: true }));
        continue;
      }
      if (tag === "a") {
        // We drop the href and render the link text inline. See the
        // header comment for why hyperlinks aren't preserved in v1.
        if (!isClose) stack.push({ ...top() });
        else if (stack.length > 1) stack.pop();
        continue;
      }

      const flag: keyof RunFlags | null =
        tag === "strong" || tag === "b" ? "bold" :
        tag === "em" || tag === "i" ? "italics" :
        tag === "u" ? "underline" : null;
      if (!flag) continue;

      if (isClose) {
        if (stack.length > 1) stack.pop();
      } else {
        stack.push({ ...top(), [flag]: true });
      }
    } else {
      const text = decodeEntities(tok);
      if (!text) continue;
      runs.push(new TextRun({
        text,
        bold: top().bold,
        italics: top().italics,
        underline: top().underline ? {} : undefined,
      }));
    }
  }

  if (runs.length === 0) runs.push(new TextRun(""));
  return runs;
}

function stripTags(html: string): string {
  return decodeEntities(html.replace(/<[^>]+>/g, ""));
}

function decodeEntities(s: string): string {
  return s
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&hellip;/g, "…")
    .replace(/&mdash;/g, "—")
    .replace(/&ndash;/g, "–")
    .replace(/&rsquo;/g, "'")
    .replace(/&lsquo;/g, "'")
    .replace(/&rdquo;/g, '"')
    .replace(/&ldquo;/g, '"');
}
