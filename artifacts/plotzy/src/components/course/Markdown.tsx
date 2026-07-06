import { useState, type ReactNode } from "react";
import { Link } from "wouter";
import { QuoteCard } from "@/components/course/visuals/QuoteCard";
import { InteractiveExample } from "@/components/course/visuals/InteractiveExample";
import { InlineImage } from "@/components/course/visuals/InlineImage";
import {
  VideoEmbed,
  TakeawayCard,
  QuickCheck,
  ExerciseBox,
  LessonChecklist,
  FlashCards,
  ResourceCard,
  type QuickCheckData,
  type FlashCardItem,
} from "@/components/course/LessonBlocks";
import { CourseDiagram } from "@/components/course/DiagramLibrary";

// Project Gutenberg references in the lessons (e.g.
// https://www.gutenberg.org/ebooks/1342) are shown as a tidy, clickable
// book cover instead of a raw URL. Clicking opens the book inside
// Plotzy's own reader (/discover/<id>) so the reader never leaves.
const GUTENBERG_RE = /gutenberg\.org\/(?:ebooks|cache\/epub)\/(\d+)/i;

function GutenbergCover({ id, label }: { id: string; label: string }) {
  const [failed, setFailed] = useState(false);
  const cover = `https://www.gutenberg.org/cache/epub/${id}/pg${id}.cover.medium.jpg`;
  if (failed) {
    return (
      <Link
        href={`/discover/${id}`}
        className="inline-flex items-center gap-1 align-middle mx-1 px-2 py-0.5 rounded-md border border-border bg-muted/50 text-xs no-underline hover:bg-muted transition-colors"
        title={label}
      >
        Read this book
      </Link>
    );
  }
  return (
    <Link href={`/discover/${id}`} className="inline-block align-middle mx-1.5 my-0.5" title={label}>
      <img
        src={cover}
        alt={label}
        loading="lazy"
        onError={() => setFailed(true)}
        className="inline-block h-12 w-auto rounded-[3px] border border-border shadow-sm hover:opacity-80 transition-opacity"
      />
    </Link>
  );
}

/**
 * Renders course-flavored markdown to JSX without any external
 * dependency. Generalized from the inline parser at
 * `pages/marketplace.tsx:56-93` (DP2 / B1).
 *
 * Supports:
 *   - `#` / `##` / `###` / `####` headings
 *   - paragraphs (consecutive non-block lines are joined into one)
 *   - blockquotes (`> ` lines, consecutive lines merged)
 *   - unordered lists (`- ` / `* `)
 *   - ordered lists (`1. ` etc.)
 *   - **bold**, *italic*, `inline code`
 *   - ```fenced code blocks```
 *   - [link text](url) — internal links use wouter's <Link> for SPA nav
 *   - `---` horizontal rule
 *   - blank lines as paragraph separators
 *
 * Wrapped in Tailwind's `prose` typography classes (the `@tailwindcss/typography`
 * plugin is registered in `index.css`) so headings, paragraphs, lists, and
 * blockquotes pick up the site's typography tokens automatically. Adapts to
 * dark/light theme via `dark:prose-invert`. RTL is handled by the parent
 * `<html dir="rtl">` set by `LanguageProvider`.
 *
 * Not supported: tables, footnotes, task lists, raw HTML embeds. If course
 * content needs those (review during Batch 2), swap to react-markdown then.
 * Nested inline syntax (e.g. `**[link](url)**`) is also intentionally not
 * supported — supporting it correctly without a full parser invites bugs.
 */

interface MarkdownProps {
  content: string;
  className?: string;
  /**
   * Base key for blocks that persist state on the device (exercise
   * drafts, checklist ticks). Pass the lesson slug. Omitting it still
   * renders everything; persistence keys just share a generic bucket.
   */
  storageBase?: string;
}

export function Markdown({ content, className = "", storageBase = "" }: MarkdownProps) {
  const blocks = parseBlocks(content, { storageBase, exercise: 0, checklist: 0 });
  return (
    <div className={`prose prose-sm sm:prose-base dark:prose-invert max-w-none ${className}`}>
      {blocks}
    </div>
  );
}

// Mutable parse context threaded through recursion so persistent
// blocks get stable, ordered storage keys within one lesson.
interface ParseCtx {
  storageBase: string;
  exercise: number;
  checklist: number;
}

// Standalone-line image: ![alt](src) or ![alt](src "caption")
const IMAGE_LINE_RE = /^!\[([^\]]*)\]\(([^)\s]+)(?:\s+"([^"]*)")?\)$/;

// ── Block-level parser ───────────────────────────────────────────────────
function parseBlocks(content: string, ctx: ParseCtx): ReactNode[] {
  const lines = content.split("\n");
  const out: ReactNode[] = [];
  let i = 0;
  let key = 0;

  while (i < lines.length) {
    const line = lines[i];

    // ::: directives — the rich lesson blocks (video, takeaway, quick
    // check, exercise, checklist, interactive example, pull quote).
    if (line.startsWith(":::")) {
      const header = line.slice(3).trim();

      // :::video ID | Title | Channel | Duration — single line, no fence.
      if (header.startsWith("video")) {
        const parts = header.slice(5).split("|").map((p) => p.trim());
        const videoId = parts[0];
        if (videoId) {
          out.push(
            <VideoEmbed
              key={key++}
              videoId={videoId}
              title={parts[1] || "Video"}
              channel={parts[2] || undefined}
              duration={parts[3] || undefined}
            />,
          );
        }
        i++;
        continue;
      }

      // :::diagram <name> [| caption] — single line, no fence. Renders a
      // named SVG from the diagram library.
      if (header.startsWith("diagram")) {
        const parts = header.slice(7).split("|").map((p) => p.trim());
        if (parts[0]) {
          out.push(<CourseDiagram key={key++} name={parts[0]} caption={parts[1] || undefined} />);
        }
        i++;
        continue;
      }

      // :::resource file.pdf | Label | note — single line, no fence.
      if (header.startsWith("resource")) {
        const parts = header.slice(8).split("|").map((p) => p.trim());
        if (parts[0]) {
          out.push(
            <ResourceCard key={key++} file={parts[0]} label={parts[1] || parts[0]} note={parts[2] || undefined} />,
          );
        }
        i++;
        continue;
      }

      // Every other directive is fenced: collect body until a bare :::
      const body: string[] = [];
      i++;
      while (i < lines.length && lines[i].trim() !== ":::") {
        body.push(lines[i]);
        i++;
      }
      i++; // skip the closing :::
      const node = renderDirective(header, body.join("\n"), ctx, key++);
      if (node) out.push(node);
      continue;
    }

    // Standalone image line → InlineImage (lazy, captioned figure).
    const img = line.trim().match(IMAGE_LINE_RE);
    if (img) {
      out.push(
        <InlineImage key={key++} src={img[2]} alt={img[1]} caption={img[3] || undefined} />,
      );
      i++;
      continue;
    }

    // Fenced code block ```lang? ... ```
    if (line.startsWith("```")) {
      const lang = line.slice(3).trim();
      const codeLines: string[] = [];
      i++;
      while (i < lines.length && !lines[i].startsWith("```")) {
        codeLines.push(lines[i]);
        i++;
      }
      out.push(
        <pre key={key++}>
          <code className={lang ? `language-${lang}` : undefined}>
            {codeLines.join("\n")}
          </code>
        </pre>,
      );
      i++; // skip the closing fence
      continue;
    }

    // Headings — order matters: longest prefix first so `### x` doesn't
    // get caught by `## ` (it doesn't, since startsWith is exact, but
    // checking longest-first matches the convention).
    if (line.startsWith("#### ")) {
      out.push(<h4 key={key++}>{renderInline(line.slice(5))}</h4>);
      i++;
      continue;
    }
    if (line.startsWith("### ")) {
      out.push(<h3 key={key++}>{renderInline(line.slice(4))}</h3>);
      i++;
      continue;
    }
    if (line.startsWith("## ")) {
      out.push(<h2 key={key++}>{renderInline(line.slice(3))}</h2>);
      i++;
      continue;
    }
    if (line.startsWith("# ")) {
      out.push(<h1 key={key++}>{renderInline(line.slice(2))}</h1>);
      i++;
      continue;
    }

    // Horizontal rule
    if (line.trim() === "---") {
      out.push(<hr key={key++} />);
      i++;
      continue;
    }

    // Blockquote — collect consecutive `> ` lines into one quote.
    if (line.startsWith("> ")) {
      const quoteLines: string[] = [line.slice(2)];
      i++;
      while (i < lines.length && lines[i].startsWith("> ")) {
        quoteLines.push(lines[i].slice(2));
        i++;
      }
      out.push(
        <blockquote key={key++}>{renderInline(quoteLines.join(" "))}</blockquote>,
      );
      continue;
    }

    // Unordered list — collect consecutive `- ` / `* ` lines.
    if (/^[-*] /.test(line)) {
      const items: string[] = [line.slice(2)];
      i++;
      while (i < lines.length && /^[-*] /.test(lines[i])) {
        items.push(lines[i].slice(2));
        i++;
      }
      out.push(
        <ul key={key++}>
          {items.map((item, idx) => (
            <li key={idx}>{renderInline(item)}</li>
          ))}
        </ul>,
      );
      continue;
    }

    // Ordered list — collect consecutive `N. ` lines.
    if (/^\d+\. /.test(line)) {
      const items: string[] = [line.replace(/^\d+\. /, "")];
      i++;
      while (i < lines.length && /^\d+\. /.test(lines[i])) {
        items.push(lines[i].replace(/^\d+\. /, ""));
        i++;
      }
      out.push(
        <ol key={key++}>
          {items.map((item, idx) => (
            <li key={idx}>{renderInline(item)}</li>
          ))}
        </ol>,
      );
      continue;
    }

    // Blank line — `prose` handles paragraph spacing; just skip.
    if (line.trim() === "") {
      i++;
      continue;
    }

    // Paragraph — collect consecutive non-block lines, join with a space.
    // (Standard markdown: single newline = same paragraph.)
    const paraLines: string[] = [line];
    i++;
    while (
      i < lines.length &&
      lines[i].trim() !== "" &&
      !lines[i].startsWith("#") &&
      !lines[i].startsWith("> ") &&
      !lines[i].startsWith("```") &&
      !lines[i].startsWith(":::") &&
      !IMAGE_LINE_RE.test(lines[i].trim()) &&
      !/^[-*] /.test(lines[i]) &&
      !/^\d+\. /.test(lines[i]) &&
      lines[i].trim() !== "---"
    ) {
      paraLines.push(lines[i]);
      i++;
    }
    out.push(<p key={key++}>{renderInline(paraLines.join(" "))}</p>);
  }

  return out;
}

// ── Directive dispatcher ─────────────────────────────────────────────────
// Fenced ::: blocks map to the rich components. Unknown directives are
// dropped silently so future content never crashes an older client.
function renderDirective(header: string, body: string, ctx: ParseCtx, key: number): ReactNode {
  const name = header.split(/[\s|]/)[0];
  const rest = header.slice(name.length).trim();

  switch (name) {
    case "takeaway":
      return <TakeawayCard key={key}>{parseBlocks(body, ctx)}</TakeawayCard>;

    case "quote": {
      // :::quote [standalone] [| attribution]
      const pipeIdx = rest.indexOf("|");
      const flags = pipeIdx === -1 ? rest : rest.slice(0, pipeIdx);
      const attribution = pipeIdx === -1 ? undefined : rest.slice(pipeIdx + 1).trim() || undefined;
      return (
        <QuoteCard
          key={key}
          variant={flags.includes("standalone") ? "standalone" : "inline"}
          attribution={attribution}
        >
          {renderInline(body.trim().split("\n").filter(Boolean).join(" "))}
        </QuoteCard>
      );
    }

    case "check": {
      const q = parseQuickCheck(body);
      return q ? <QuickCheck key={key} {...q} /> : null;
    }

    case "cards": {
      // One card per line: front | back
      const cards: FlashCardItem[] = body
        .split("\n")
        .map((l) => l.trim())
        .filter((l) => l.includes("|"))
        .map((l) => {
          const idx = l.indexOf("|");
          return { front: l.slice(0, idx).trim(), back: l.slice(idx + 1).trim() };
        })
        .filter((c) => c.front && c.back);
      if (cards.length === 0) return null;
      return <FlashCards key={key} cards={cards} />;
    }

    case "exercise": {
      const idx = ctx.exercise++;
      return (
        <ExerciseBox
          key={key}
          storageKey={`plotzy-course-ex-${ctx.storageBase}-${idx}`}
          prompt={parseBlocks(body, ctx)}
        />
      );
    }

    case "checklist": {
      const idx = ctx.checklist++;
      const items = body
        .split("\n")
        .filter((l) => /^[-*] /.test(l.trim()))
        .map((l) => renderInline(l.trim().slice(2)));
      if (items.length === 0) return null;
      return (
        <LessonChecklist
          key={key}
          storageKey={`plotzy-course-cl-${ctx.storageBase}-${idx}`}
          items={items}
        />
      );
    }

    case "example": {
      // :::example side-by-side | caption   …   [Label] sections in body
      const parts = rest.split("|");
      const mode = parts[0].trim() === "click-toggle" ? ("click-toggle" as const) : ("side-by-side" as const);
      const caption = parts.slice(1).join("|").trim() || undefined;
      const options: { label: string; content: ReactNode }[] = [];
      let label: string | null = null;
      let buf: string[] = [];
      const flush = () => {
        if (label !== null) options.push({ label, content: parseBlocks(buf.join("\n"), ctx) });
        buf = [];
      };
      for (const l of body.split("\n")) {
        const m = l.trim().match(/^\[(.+)\]$/);
        if (m) {
          flush();
          label = m[1];
        } else {
          buf.push(l);
        }
      }
      flush();
      if (options.length === 0) return null;
      return <InteractiveExample key={key} mode={mode} options={options} caption={caption} />;
    }

    default:
      return null;
  }
}

// :::check body format:
//   Q: the question
//   - wrong option
//   -* correct option
//   X: explanation shown after answering
function parseQuickCheck(body: string): QuickCheckData | null {
  let question = "";
  const options: string[] = [];
  let correctIndex = -1;
  let explanation: string | undefined;

  for (const raw of body.split("\n")) {
    const l = raw.trim();
    if (l.startsWith("Q:")) question = l.slice(2).trim();
    else if (l.startsWith("-*")) {
      correctIndex = options.length;
      options.push(l.slice(2).trim());
    } else if (l.startsWith("- ")) options.push(l.slice(2).trim());
    else if (l.startsWith("X:")) explanation = l.slice(2).trim();
  }

  if (!question || options.length < 2 || correctIndex === -1) return null;
  return { question, options, correctIndex, explanation };
}

// ── Inline parser ────────────────────────────────────────────────────────
// Tokens: `code`, **bold**, *italic*, [text](url). One regex with
// alternatives; matches are processed left-to-right.
const INLINE_RE = /(`[^`]+`)|(\*\*[^*]+\*\*)|(\*[^*]+\*)|(\[[^\]]+\]\([^)]+\))/g;

function renderInline(text: string): ReactNode {
  const parts: ReactNode[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  let key = 0;

  // Need to reset lastIndex on each call since INLINE_RE is module-scoped (g flag).
  INLINE_RE.lastIndex = 0;

  while ((match = INLINE_RE.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push(text.slice(lastIndex, match.index));
    }
    const token = match[0];
    if (token.startsWith("`")) {
      parts.push(<code key={key++}>{token.slice(1, -1)}</code>);
    } else if (token.startsWith("**")) {
      parts.push(<strong key={key++}>{token.slice(2, -2)}</strong>);
    } else if (token.startsWith("*")) {
      parts.push(<em key={key++}>{token.slice(1, -1)}</em>);
    } else if (token.startsWith("[")) {
      const m = token.match(/\[([^\]]+)\]\(([^)]+)\)/);
      if (m) {
        const [, label, href] = m;
        parts.push(renderLink(label, href, key++));
      } else {
        parts.push(token);
      }
    }
    lastIndex = INLINE_RE.lastIndex;
  }
  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex));
  }

  // Single unwrapped string is fine; React handles it. Multiple parts
  // need to be rendered as an array.
  return parts.length <= 1 ? parts[0] ?? "" : parts;
}

function renderLink(label: string, href: string, key: number): ReactNode {
  // A Project Gutenberg book reference becomes a clickable cover that
  // opens the book in Plotzy's reader instead of an external URL.
  const gut = href.match(GUTENBERG_RE) || label.match(GUTENBERG_RE);
  if (gut) {
    return <GutenbergCover key={key} id={gut[1]} label={label} />;
  }
  // Internal links go through wouter's <Link> so navigation stays in the SPA.
  // External links open in a new tab with the standard hardening attrs.
  if (href.startsWith("/")) {
    return (
      <Link key={key} href={href}>
        {label}
      </Link>
    );
  }
  const isExternal = /^https?:\/\//.test(href);
  return (
    <a
      key={key}
      href={href}
      {...(isExternal ? { target: "_blank", rel: "noopener noreferrer" } : {})}
    >
      {label}
    </a>
  );
}
