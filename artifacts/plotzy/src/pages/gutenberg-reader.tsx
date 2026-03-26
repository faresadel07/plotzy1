import { useState, useEffect, useRef, useMemo } from "react";
import { useRoute, Link } from "wouter";
import { useLanguage } from "@/contexts/language-context";
import {
  ArrowLeft, BookOpen, Loader2, Sun, Moon, Minus, Plus,
  List, X, ChevronUp,
} from "lucide-react";
import { Button } from "@/components/ui/button";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

interface BookMeta {
  id: number;
  title: string;
  authors: { name: string }[];
  coverUrl: string | null;
}

function formatAuthor(a: { name: string }): string {
  const parts = a.name.split(",").map(s => s.trim());
  return parts.length === 2 ? `${parts[1]} ${parts[0]}` : a.name;
}

/** Split raw text into named sections/chapters */
function parseChapters(text: string): { title: string; content: string }[] {
  const chapterRe = /^(chapter\s+[ivxlcdm\d]+[\.\:]?.*|part\s+[ivxlcdm\d]+[\.\:]?.*)$/im;
  const lines = text.split("\n");
  const sections: { title: string; content: string }[] = [];
  let current = { title: "Beginning", lines: [] as string[] };

  for (const line of lines) {
    if (chapterRe.test(line.trim()) && line.trim().length < 80) {
      if (current.lines.join("").trim()) {
        sections.push({ title: current.title, content: current.lines.join("\n").trim() });
      }
      current = { title: line.trim(), lines: [] };
    } else {
      current.lines.push(line);
    }
  }
  if (current.lines.join("").trim()) {
    sections.push({ title: current.title, content: current.lines.join("\n").trim() });
  }
  return sections.length > 0 ? sections : [{ title: "Full Text", content: text }];
}

/** Render a section's text into readable paragraphs */
function renderSection(text: string) {
  const paras = text.split(/\n{2,}/).filter(p => p.trim());
  return paras.map((p, i) => {
    const trimmed = p.trim();
    if (!trimmed) return null;
    return (
      <p key={i} className="mb-5 last:mb-0 text-justify leading-[1.9]" style={{ textIndent: "1.5em" }}>
        {trimmed.replace(/\n/g, " ")}
      </p>
    );
  });
}

export default function GutenbergReader() {
  const [, params] = useRoute("/discover/:id");
  const gutId = params?.id ? parseInt(params.id) : 0;
  const { lang } = useLanguage();
  const ar = lang === "ar";

  const [meta, setMeta] = useState<BookMeta | null>(null);
  const [content, setContent] = useState<string | null>(null);
  const [loadingMeta, setLoadingMeta] = useState(true);
  const [loadingContent, setLoadingContent] = useState(true);
  const [error, setError] = useState("");

  const [dark, setDark] = useState(true);
  const [fontSize, setFontSize] = useState(18);
  const [sectionIdx, setSectionIdx] = useState(0);
  const [showToc, setShowToc] = useState(false);
  const [showTop, setShowTop] = useState(false);

  const scrollRef = useRef<HTMLDivElement>(null);

  const sections = useMemo(() => content ? parseChapters(content) : [], [content]);
  const section = sections[sectionIdx];

  const bg = dark ? "#0f0e0d" : "#faf8f4";
  const fg = dark ? "rgba(245,240,230,0.88)" : "#2c2416";
  const fgMuted = dark ? "rgba(245,240,230,0.4)" : "rgba(44,36,22,0.5)";
  const panelBg = dark ? "rgba(20,19,18,0.97)" : "rgba(250,248,244,0.97)";
  const border = dark ? "rgba(255,255,255,0.07)" : "rgba(0,0,0,0.08)";

  useEffect(() => {
    if (!gutId) return;
    fetch(`${BASE}/api/gutenberg/books/${gutId}`)
      .then(r => r.json())
      .then(d => setMeta(d))
      .catch(() => setError("Failed to load book info"))
      .finally(() => setLoadingMeta(false));
  }, [gutId]);

  useEffect(() => {
    if (!gutId) return;
    setLoadingContent(true);
    fetch(`${BASE}/api/gutenberg/books/${gutId}/content`)
      .then(r => { if (!r.ok) throw new Error("no text"); return r.json(); })
      .then(d => setContent(d.content))
      .catch(() => setError("This book's text is not available."))
      .finally(() => setLoadingContent(false));
  }, [gutId]);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const handler = () => setShowTop(el.scrollTop > 400);
    el.addEventListener("scroll", handler);
    return () => el.removeEventListener("scroll", handler);
  }, []);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: 0, behavior: "smooth" });
  }, [sectionIdx]);

  const title = meta?.title || "Loading...";
  const author = meta?.authors[0] ? formatAuthor(meta.authors[0]) : "";

  if (loadingMeta && loadingContent) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4" style={{ background: bg }}>
        <Loader2 className="w-8 h-8 animate-spin" style={{ color: fgMuted }} />
        <p className="text-sm" style={{ color: fgMuted }}>Loading book…</p>
      </div>
    );
  }

  if (error && !content) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4" style={{ background: bg }}>
        <BookOpen className="w-12 h-12" style={{ color: fgMuted }} />
        <p className="text-base" style={{ color: fg }}>{error}</p>
        <Link href="/discover">
          <Button variant="outline" className="rounded-xl mt-2">
            <ArrowLeft className="w-4 h-4 mr-2" /> Back to Library
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div ref={scrollRef} className="h-screen overflow-y-auto" style={{ background: bg, color: fg }}>
      {/* ── Top Bar ── */}
      <div className="sticky top-0 z-50 flex items-center justify-between px-5 py-3"
        style={{ background: panelBg, borderBottom: `1px solid ${border}`, backdropFilter: "blur(12px)" }}>
        <div className="flex items-center gap-3 min-w-0">
          <Link href="/discover">
            <button className="flex items-center gap-1.5 text-sm transition-colors rounded-xl px-2 py-1"
              style={{ color: fgMuted }}>
              <ArrowLeft className="w-4 h-4 shrink-0" />
              <span className="hidden sm:block">{ar ? "المكتبة" : "Library"}</span>
            </button>
          </Link>
          <div className="w-px h-4" style={{ background: border }} />
          <div className="min-w-0">
            <p className="font-semibold text-sm truncate" style={{ color: fg }}>{title}</p>
            {author && <p className="text-xs truncate" style={{ color: fgMuted }}>{author}</p>}
          </div>
        </div>

        <div className="flex items-center gap-1 shrink-0">
          {/* Font size */}
          <button onClick={() => setFontSize(f => Math.max(13, f - 1))} className="w-8 h-8 rounded-lg flex items-center justify-center transition-colors hover:opacity-70" style={{ color: fgMuted }}>
            <Minus className="w-3.5 h-3.5" />
          </button>
          <span className="text-xs w-7 text-center" style={{ color: fgMuted }}>{fontSize}</span>
          <button onClick={() => setFontSize(f => Math.min(28, f + 1))} className="w-8 h-8 rounded-lg flex items-center justify-center transition-colors hover:opacity-70" style={{ color: fgMuted }}>
            <Plus className="w-3.5 h-3.5" />
          </button>

          {/* Dark/Light */}
          <button onClick={() => setDark(d => !d)} className="w-8 h-8 rounded-lg flex items-center justify-center transition-colors hover:opacity-70 ml-1" style={{ color: fgMuted }}>
            {dark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>

          {/* TOC */}
          {sections.length > 1 && (
            <button onClick={() => setShowToc(v => !v)} className="w-8 h-8 rounded-lg flex items-center justify-center ml-1 transition-colors hover:opacity-70" style={{ color: fgMuted }}>
              <List className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* ── Table of Contents Panel ── */}
      {showToc && (
        <div className="fixed inset-0 z-50 flex">
          <div className="absolute inset-0" style={{ background: "rgba(0,0,0,0.5)" }} onClick={() => setShowToc(false)} />
          <div className="relative ml-auto w-72 h-full flex flex-col overflow-hidden"
            style={{ background: panelBg, borderLeft: `1px solid ${border}` }}>
            <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: `1px solid ${border}` }}>
              <span className="font-semibold text-sm" style={{ color: fg }}>{ar ? "الفهرس" : "Table of Contents"}</span>
              <button onClick={() => setShowToc(false)} style={{ color: fgMuted }}>
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="overflow-y-auto flex-1 py-2">
              {sections.map((s, i) => (
                <button key={i} onClick={() => { setSectionIdx(i); setShowToc(false); }}
                  className="w-full text-left px-5 py-2.5 text-sm transition-colors"
                  style={{
                    color: i === sectionIdx ? fg : fgMuted,
                    background: i === sectionIdx ? (dark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.05)") : "transparent",
                    fontWeight: i === sectionIdx ? 600 : 400,
                  }}>
                  {s.title}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── Main Reading Area ── */}
      <div className="max-w-[680px] mx-auto px-6 pt-12 pb-24">
        {/* Section title */}
        {section && sections.length > 1 && (
          <h2 className="font-bold text-xl mb-8 tracking-tight" style={{ color: fg, fontFamily: "Georgia, serif" }}>
            {section.title}
          </h2>
        )}

        {/* Content */}
        {loadingContent ? (
          <div className="flex flex-col items-center gap-4 py-20">
            <Loader2 className="w-7 h-7 animate-spin" style={{ color: fgMuted }} />
            <p className="text-sm" style={{ color: fgMuted }}>
              {ar ? "جارٍ تحميل الكتاب للمرة الأولى وحفظه..." : "Loading and caching book text…"}
            </p>
            <p className="text-xs max-w-xs text-center" style={{ color: fgMuted }}>
              {ar ? "سيُحفظ في قاعدة البيانات حتى لا تحتاج لانتظار مرة أخرى" : "It will be saved to our database so you never wait again"}
            </p>
          </div>
        ) : section ? (
          <div style={{ fontFamily: "Georgia, 'Times New Roman', serif", fontSize, lineHeight: 1.9, color: fg }}>
            {renderSection(section.content)}
          </div>
        ) : null}

        {/* Navigation */}
        {sections.length > 1 && !loadingContent && (
          <div className="flex items-center justify-between mt-16 pt-8" style={{ borderTop: `1px solid ${border}` }}>
            <Button
              variant="outline"
              className="rounded-xl text-sm gap-2"
              disabled={sectionIdx === 0}
              onClick={() => setSectionIdx(i => i - 1)}
              style={{ color: fg, borderColor: border }}
            >
              <ArrowLeft className="w-4 h-4" />
              {ar ? "السابق" : "Previous"}
            </Button>
            <span className="text-xs" style={{ color: fgMuted }}>
              {sectionIdx + 1} / {sections.length}
            </span>
            <Button
              variant="outline"
              className="rounded-xl text-sm gap-2"
              disabled={sectionIdx === sections.length - 1}
              onClick={() => setSectionIdx(i => i + 1)}
              style={{ color: fg, borderColor: border }}
            >
              {ar ? "التالي" : "Next"}
              <ArrowLeft className="w-4 h-4 rotate-180" />
            </Button>
          </div>
        )}
      </div>

      {/* Back to top */}
      {showTop && (
        <button
          onClick={() => scrollRef.current?.scrollTo({ top: 0, behavior: "smooth" })}
          className="fixed bottom-8 right-8 w-10 h-10 rounded-full flex items-center justify-center shadow-lg transition-all"
          style={{ background: panelBg, border: `1px solid ${border}`, color: fgMuted }}
        >
          <ChevronUp className="w-4 h-4" />
        </button>
      )}
    </div>
  );
}
