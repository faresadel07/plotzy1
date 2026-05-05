import type { ReactNode } from "react";
import { Link } from "wouter";

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
}

export function Markdown({ content, className = "" }: MarkdownProps) {
  const blocks = parseBlocks(content);
  return (
    <div className={`prose prose-sm sm:prose-base dark:prose-invert max-w-none ${className}`}>
      {blocks}
    </div>
  );
}

// ── Block-level parser ───────────────────────────────────────────────────
function parseBlocks(content: string): ReactNode[] {
  const lines = content.split("\n");
  const out: ReactNode[] = [];
  let i = 0;
  let key = 0;

  while (i < lines.length) {
    const line = lines[i];

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
