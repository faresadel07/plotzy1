import { useState, useRef, useEffect, useCallback } from "react";
import { useRoute, Link, useLocation } from "wouter";
import { Layout } from "@/components/layout";
import { useBook, useUpdateBook } from "@/hooks/use-books";
import {
  ArrowLeft, Image as ImageIcon, Loader2, Save,
  Eye, X, Plus, Upload, Globe,
  CheckCircle2, Hash, BarChart2, AlignLeft, Maximize2, Minimize2,
  FileText, Sparkles, Target, Bold, Italic, Heading1, Heading2,
  Quote, Code, List, Minus, ChevronDown,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/contexts/language-context";

const SF = "-apple-system, BlinkMacSystemFont, 'SF Pro Text', 'Helvetica Neue', sans-serif";
const SERIF = "Georgia, 'Times New Roman', serif";
const BG = "#0a0a0a";
const CARD = "#111111";
const CARD2 = "#161616";
const BORDER = "rgba(255,255,255,0.07)";
const BORDER2 = "rgba(255,255,255,0.04)";
const TEXT = "rgba(255,255,255,0.88)";
const TEXT_SEC = "rgba(255,255,255,0.4)";
const TEXT_DIM = "rgba(255,255,255,0.22)";
const ACCENT = "#7c6af7";

const ARTICLE_CATEGORIES = [
  { label: "Writing Tips", color: "#818cf8" },
  { label: "Craft & Technique", color: "#a78bfa" },
  { label: "Publishing", color: "#f472b6" },
  { label: "Reading", color: "#fbbf24" },
  { label: "Inspiration", color: "#34d399" },
  { label: "Author Interviews", color: "#60a5fa" },
  { label: "Book Reviews", color: "#2dd4bf" },
  { label: "Industry News", color: "#fb923c" },
  { label: "Self-Publishing", color: "#c084fc" },
  { label: "Marketing", color: "#f87171" },
  { label: "Grammar & Style", color: "#38bdf8" },
  { label: "Research", color: "#86efac" },
  { label: "Other", color: "#94a3b8" },
];

const WORD_GOALS = [
  { value: 300, label: "Quick take · 300" },
  { value: 500, label: "Blog post · 500" },
  { value: 1000, label: "Long read · 1,000" },
  { value: 2000, label: "Deep dive · 2,000" },
  { value: 5000, label: "Essay · 5,000" },
];

function wordCount(text: string) {
  return text.trim().split(/\s+/).filter(Boolean).length;
}
function charCount(text: string) {
  return text.replace(/\s/g, "").length;
}
function sentenceCount(text: string) {
  return text.split(/[.!?]+/).filter(s => s.trim().length > 2).length;
}
function paragraphCount(text: string) {
  return text.split(/\n\s*\n/).filter(p => p.trim().length > 0).length;
}
function estimateReadTime(text: string) {
  return Math.max(1, Math.ceil(wordCount(text) / 200));
}
function readingLevel(text: string): { label: string; color: string } {
  const words = text.trim().split(/\s+/).filter(Boolean);
  if (words.length < 20) return { label: "—", color: TEXT_DIM };
  const avgLen = words.reduce((s, w) => s + w.replace(/[^a-zA-Z]/g, "").length, 0) / words.length;
  if (avgLen < 4.5) return { label: "Easy", color: "#34d399" };
  if (avgLen < 6) return { label: "Medium", color: "#fbbf24" };
  return { label: "Advanced", color: "#f472b6" };
}

export default function ArticleEditor() {
  const [, params] = useRoute("/articles/:id");
  const [, navigate] = useLocation();
  const id = Number(params?.id);
  const { data: article, isLoading } = useBook(id);
  const updateArticle = useUpdateBook();
  const { toast } = useToast();
  const { isRTL } = useLanguage();

  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [category, setCategory] = useState("");
  const [tagInput, setTagInput] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [featuredImage, setFeaturedImage] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [justSaved, setJustSaved] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [focusMode, setFocusMode] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [wordGoal, setWordGoal] = useState(1000);
  const [showGoalPicker, setShowGoalPicker] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const autoSaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const contentRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (!article) return;
    setTitle(article.title || "");
    setContent(article.articleContent || "");
    setCategory(article.articleCategory || "");
    setTags((article.tags as string[]) || []);
    setFeaturedImage(article.featuredImage || null);
  }, [article]);

  const save = useCallback(async (silent = false) => {
    if (!article) return;
    setSaving(true);
    try {
      await (updateArticle.mutateAsync as any)({
        id, title, articleContent: content,
        articleCategory: category, tags,
        featuredImage: featuredImage ?? undefined,
      });
      setJustSaved(true);
      setTimeout(() => setJustSaved(false), 2000);
    } catch {
      if (!silent) toast({ variant: "destructive", title: "Save failed" });
    } finally {
      setSaving(false);
    }
  }, [article, id, title, content, category, tags, featuredImage, updateArticle, toast]);

  useEffect(() => {
    if (!article) return;
    if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current);
    autoSaveTimer.current = setTimeout(() => save(true), 2000);
    return () => { if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current); };
  }, [title, content, category, tags, featuredImage]);

  const handleImageFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = ev => setFeaturedImage(ev.target?.result as string);
    reader.readAsDataURL(file);
  };
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault(); setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file?.type.startsWith("image/")) handleImageFile(file);
  };

  const insertFormat = (prefix: string, suffix = "", placeholder = "text") => {
    const ta = contentRef.current;
    if (!ta) return;
    const start = ta.selectionStart, end = ta.selectionEnd;
    const selected = content.slice(start, end) || placeholder;
    const before = content.slice(0, start);
    const after = content.slice(end);
    const newContent = before + prefix + selected + suffix + after;
    setContent(newContent);
    setTimeout(() => {
      ta.focus();
      const newPos = start + prefix.length + selected.length + suffix.length;
      ta.setSelectionRange(newPos, newPos);
    }, 0);
  };

  const addTag = () => {
    const t = tagInput.trim().toLowerCase();
    if (t && !tags.includes(t) && tags.length < 10) setTags(p => [...p, t]);
    setTagInput("");
  };
  const removeTag = (tag: string) => setTags(p => p.filter(x => x !== tag));
  const handleTagKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" || e.key === ",") { e.preventDefault(); addTag(); }
    if (e.key === "Backspace" && !tagInput && tags.length) setTags(p => p.slice(0, -1));
  };

  const generateAiContent = async () => {
    if (!title.trim()) {
      toast({ variant: "destructive", title: "Add a title first" }); return;
    }
    setAiLoading(true);
    try {
      const res = await fetch(`/api/books/${id}/generate-chapter`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          chapterTitle: title,
          bookSummary: `A blog article about: ${title}. Category: ${category || "General"}`,
          authorName: article?.authorName || "the author",
          language: article?.language || "en",
          previousContent: content || "",
        }),
      });
      if (!res.ok) throw new Error("AI request failed");
      const data = await res.json();
      setContent(p => p ? `${p}\n\n${data.content || ""}` : (data.content || ""));
      toast({ title: "AI content added!" });
    } catch (err: any) {
      toast({ variant: "destructive", title: "AI Error", description: err?.message });
    } finally {
      setAiLoading(false);
    }
  };

  const wc = wordCount(content);
  const cc = charCount(content);
  const sc = sentenceCount(content);
  const pc = paragraphCount(content);
  const readTime = estimateReadTime(content);
  const level = readingLevel(content);
  const progress = Math.min(100, Math.round((wc / wordGoal) * 100));
  const selectedCat = ARTICLE_CATEGORIES.find(c => c.label === category);

  /* ── Loading ── */
  if (isLoading) return (
    <Layout isLanding darkNav>
      <div style={{ background: BG, minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <Loader2 size={28} color={TEXT_DIM} style={{ animation: "spin 1s linear infinite" }} />
      </div>
    </Layout>
  );

  if (!article) return (
    <Layout isLanding darkNav>
      <div style={{ background: BG, minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <p style={{ fontFamily: SF, color: TEXT_DIM, fontSize: 14 }}>Article not found.</p>
      </div>
    </Layout>
  );

  /* ── PREVIEW MODE ── */
  if (showPreview) return (
    <Layout isLanding darkNav>
      <div style={{ background: BG, minHeight: "100vh" }}>
        {/* Preview bar */}
        <div style={{
          position: "sticky", top: 0, zIndex: 40,
          background: "rgba(10,10,10,0.95)", backdropFilter: "blur(20px)",
          borderBottom: `1px solid ${BORDER}`,
          padding: "0 24px", height: 44,
          display: "flex", alignItems: "center", justifyContent: "space-between",
        }}>
          <button onClick={() => setShowPreview(false)} style={{
            display: "flex", alignItems: "center", gap: 6,
            background: "none", border: "none", cursor: "pointer",
            fontFamily: SF, fontSize: 13, color: TEXT_SEC,
          }}>
            <ArrowLeft size={14} /> Back to editor
          </button>
          <span style={{ fontFamily: SF, fontSize: 10, fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase", color: TEXT_DIM }}>
            Preview
          </span>
          <div style={{ width: 100 }} />
        </div>

        <article style={{ maxWidth: 680, margin: "0 auto", padding: "72px 24px 120px" }}>
          {featuredImage && (
            <img src={featuredImage} alt="Featured" style={{ width: "100%", height: 340, objectFit: "cover", borderRadius: 16, marginBottom: 48 }} />
          )}
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 24 }}>
            {selectedCat && (
              <span style={{
                fontFamily: SF, fontSize: 11, fontWeight: 700, letterSpacing: "0.06em",
                textTransform: "uppercase", padding: "4px 12px", borderRadius: 20,
                background: selectedCat.color + "22", color: selectedCat.color,
              }}>{category}</span>
            )}
            <span style={{ fontFamily: SF, fontSize: 12, color: TEXT_DIM }}>{readTime} min read</span>
            <span style={{ fontFamily: SF, fontSize: 12, color: TEXT_DIM }}>{wc.toLocaleString()} words</span>
          </div>
          <h1 style={{ fontFamily: SERIF, fontSize: "clamp(28px,5vw,42px)", fontWeight: 800, color: TEXT, lineHeight: 1.2, marginBottom: 28 }}>
            {title || "Untitled"}
          </h1>
          {article.authorName && (
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 40, paddingBottom: 32, borderBottom: `1px solid ${BORDER}` }}>
              <div style={{
                width: 36, height: 36, borderRadius: "50%", background: CARD2,
                border: `1px solid ${BORDER}`, display: "flex", alignItems: "center", justifyContent: "center",
                fontFamily: SF, fontSize: 13, fontWeight: 700, color: TEXT_SEC,
              }}>{article.authorName[0].toUpperCase()}</div>
              <div>
                <p style={{ fontFamily: SF, fontSize: 13, fontWeight: 600, color: TEXT, margin: 0 }}>{article.authorName}</p>
                <p style={{ fontFamily: SF, fontSize: 11, color: TEXT_DIM, margin: 0 }}>Author</p>
              </div>
            </div>
          )}
          <div style={{
            fontFamily: SERIF, fontSize: "1.08rem", lineHeight: 1.95,
            color: TEXT_SEC, whiteSpace: "pre-wrap",
          }} dir={isRTL ? "rtl" : "ltr"}>
            {content || <span style={{ fontStyle: "italic", color: TEXT_DIM }}>No content yet.</span>}
          </div>
          {tags.length > 0 && (
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 56, paddingTop: 32, borderTop: `1px solid ${BORDER}` }}>
              {tags.map(tag => (
                <span key={tag} style={{
                  fontFamily: SF, fontSize: 12, color: TEXT_DIM,
                  padding: "5px 12px", borderRadius: 20,
                  background: CARD2, border: `1px solid ${BORDER}`,
                }}>#{tag}</span>
              ))}
            </div>
          )}
        </article>
      </div>
    </Layout>
  );

  /* ── EDITOR ── */
  return (
    <Layout isLanding darkNav>
      <div style={{ background: BG, minHeight: "100vh", fontFamily: SF }}>

        {/* ── TOP BAR ── */}
        <div style={{
          position: "sticky", top: 0, zIndex: 40,
          background: "rgba(10,10,10,0.96)", backdropFilter: "blur(20px)",
          borderBottom: `1px solid ${BORDER}`,
          padding: "0 20px", height: 48,
          display: "flex", alignItems: "center", justifyContent: "space-between",
        }}>
          {/* Left */}
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <Link href="/">
              <button style={{
                display: "flex", alignItems: "center", gap: 6,
                background: "none", border: "none", cursor: "pointer",
                fontFamily: SF, fontSize: 13, color: TEXT_SEC,
                padding: "4px 0",
              }}>
                <ArrowLeft size={14} /> Dashboard
              </button>
            </Link>
            <div style={{ width: 1, height: 16, background: BORDER }} />
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <FileText size={12} color={TEXT_DIM} />
              <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: TEXT_DIM }}>
                Blog Post
              </span>
            </div>
          </div>

          {/* Center — auto-save */}
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            {saving ? (
              <><Loader2 size={11} color={TEXT_DIM} style={{ animation: "spin 1s linear infinite" }} />
              <span style={{ fontSize: 11, color: TEXT_DIM }}>Saving…</span></>
            ) : justSaved ? (
              <><CheckCircle2 size={11} color="#34d399" />
              <span style={{ fontSize: 11, color: "#34d399" }}>Saved</span></>
            ) : (
              <span style={{ fontSize: 11, color: TEXT_DIM }}>{wc.toLocaleString()} words · {readTime} min read</span>
            )}
          </div>

          {/* Right */}
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <button onClick={() => setFocusMode(f => !f)} title={focusMode ? "Exit focus" : "Focus mode"} style={{
              display: "flex", alignItems: "center", justifyContent: "center",
              width: 32, height: 32, borderRadius: 8,
              background: "none", border: `1px solid ${BORDER}`, cursor: "pointer", color: TEXT_SEC,
            }}>
              {focusMode ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
            </button>

            <button onClick={() => setShowPreview(true)} style={{
              display: "flex", alignItems: "center", gap: 6,
              padding: "6px 14px", borderRadius: 8,
              background: "none", border: `1px solid ${BORDER}`, cursor: "pointer",
              fontFamily: SF, fontSize: 13, fontWeight: 500, color: TEXT_SEC,
            }}>
              <Eye size={13} /> Preview
            </button>

            <button onClick={() => save()} disabled={saving} style={{
              display: "flex", alignItems: "center", gap: 6,
              padding: "6px 16px", borderRadius: 8, cursor: "pointer",
              background: justSaved ? "#34d399" : "#fff",
              border: "none",
              fontFamily: SF, fontSize: 13, fontWeight: 600,
              color: justSaved ? "#fff" : "#000",
              transition: "all 0.2s",
            }}>
              {saving ? <><Loader2 size={13} style={{ animation: "spin 1s linear infinite" }} /> Saving…</>
                : justSaved ? <><CheckCircle2 size={13} /> Saved</>
                : <><Save size={13} /> Save</>}
            </button>
          </div>
        </div>

        {/* ── FORMAT TOOLBAR ── */}
        <div style={{
          borderBottom: `1px solid ${BORDER2}`,
          padding: "0 20px", height: 38,
          display: "flex", alignItems: "center", gap: 2,
          background: CARD2,
        }}>
          {[
            { icon: Bold, action: () => insertFormat("**", "**", "bold text"), title: "Bold (Ctrl+B)" },
            { icon: Italic, action: () => insertFormat("_", "_", "italic text"), title: "Italic (Ctrl+I)" },
            { icon: Heading1, action: () => insertFormat("\n# ", "", "Heading 1"), title: "Heading 1" },
            { icon: Heading2, action: () => insertFormat("\n## ", "", "Heading 2"), title: "Heading 2" },
          ].map(({ icon: Icon, action, title }) => (
            <button key={title} onClick={action} title={title} style={{
              display: "flex", alignItems: "center", justifyContent: "center",
              width: 30, height: 30, borderRadius: 6, cursor: "pointer",
              background: "none", border: "none", color: TEXT_SEC,
              transition: "background 0.15s",
            }}
              onMouseEnter={e => (e.currentTarget.style.background = CARD)}
              onMouseLeave={e => (e.currentTarget.style.background = "none")}
            >
              <Icon size={14} />
            </button>
          ))}
          <div style={{ width: 1, height: 18, background: BORDER, margin: "0 4px" }} />
          {[
            { icon: Quote, action: () => insertFormat("\n> ", "", "quote"), title: "Blockquote" },
            { icon: Code, action: () => insertFormat("`", "`", "code"), title: "Inline code" },
            { icon: List, action: () => insertFormat("\n- ", "", "list item"), title: "Bullet list" },
            { icon: Minus, action: () => insertFormat("\n---\n", "", ""), title: "Divider" },
          ].map(({ icon: Icon, action, title }) => (
            <button key={title} onClick={action} title={title} style={{
              display: "flex", alignItems: "center", justifyContent: "center",
              width: 30, height: 30, borderRadius: 6, cursor: "pointer",
              background: "none", border: "none", color: TEXT_SEC,
              transition: "background 0.15s",
            }}
              onMouseEnter={e => (e.currentTarget.style.background = CARD)}
              onMouseLeave={e => (e.currentTarget.style.background = "none")}
            >
              <Icon size={14} />
            </button>
          ))}
          <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 4 }}>
            <Sparkles size={11} color={ACCENT} />
            <span style={{ fontSize: 10, color: TEXT_DIM, letterSpacing: "0.04em" }}>Markdown supported</span>
          </div>
        </div>

        {/* ── MAIN CONTENT ── */}
        <div style={{
          maxWidth: focusMode ? 740 : 1160,
          margin: "0 auto", padding: "32px 20px 80px",
          display: "grid",
          gridTemplateColumns: focusMode ? "1fr" : "1fr 280px",
          gap: 28,
          transition: "all 0.3s ease",
        }}>

          {/* ── WRITING COLUMN ── */}
          <div>

            {/* Featured Image */}
            <div
              onClick={() => fileInputRef.current?.click()}
              onDragOver={e => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={handleDrop}
              style={{
                borderRadius: 14,
                border: dragOver
                  ? `2px dashed ${ACCENT}`
                  : featuredImage ? "none" : `2px dashed ${BORDER}`,
                background: featuredImage ? "transparent"
                  : dragOver ? `${ACCENT}08` : CARD2,
                minHeight: featuredImage ? "auto" : 180,
                cursor: "pointer",
                overflow: "hidden",
                marginBottom: 24,
                position: "relative",
                display: "flex", alignItems: "center", justifyContent: "center",
              }}
            >
              {featuredImage ? (
                <>
                  <img src={featuredImage} alt="Featured" style={{ width: "100%", maxHeight: 320, objectFit: "cover", display: "block" }} />
                  <div style={{
                    position: "absolute", inset: 0, background: "rgba(0,0,0,0.45)",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    opacity: 0, transition: "opacity 0.2s",
                  }}
                    onMouseEnter={e => (e.currentTarget.style.opacity = "1")}
                    onMouseLeave={e => (e.currentTarget.style.opacity = "0")}
                  >
                    <span style={{
                      fontFamily: SF, fontSize: 13, fontWeight: 600, color: "#fff",
                      background: "rgba(0,0,0,0.5)", padding: "8px 18px", borderRadius: 10,
                      display: "flex", alignItems: "center", gap: 8,
                    }}>
                      <Upload size={14} /> Change image
                    </span>
                  </div>
                  <button onClick={e => { e.stopPropagation(); setFeaturedImage(null); }} style={{
                    position: "absolute", top: 10, right: 10,
                    width: 28, height: 28, borderRadius: "50%",
                    background: "rgba(0,0,0,0.65)", border: "none", cursor: "pointer",
                    display: "flex", alignItems: "center", justifyContent: "center", color: "#fff",
                  }}><X size={12} /></button>
                </>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 10, padding: 32 }}>
                  <div style={{
                    width: 44, height: 44, borderRadius: 12,
                    background: CARD, border: `1px solid ${BORDER}`,
                    display: "flex", alignItems: "center", justifyContent: "center",
                  }}>
                    <ImageIcon size={20} color={TEXT_DIM} />
                  </div>
                  <div style={{ textAlign: "center" }}>
                    <p style={{ fontFamily: SF, fontSize: 13, fontWeight: 600, color: TEXT_SEC, margin: 0 }}>Add a featured image</p>
                    <p style={{ fontFamily: SF, fontSize: 11, color: TEXT_DIM, marginTop: 4 }}>Click or drag · JPG, PNG, WebP</p>
                  </div>
                </div>
              )}
              <input ref={fileInputRef} type="file" accept="image/*" style={{ display: "none" }} onChange={e => { const f = e.target.files?.[0]; if (f) handleImageFile(f); }} />
            </div>

            {/* Category badge */}
            {category && selectedCat && (
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
                <span style={{
                  fontFamily: SF, fontSize: 11, fontWeight: 700, letterSpacing: "0.06em",
                  textTransform: "uppercase", padding: "4px 12px", borderRadius: 20,
                  background: selectedCat.color + "22", color: selectedCat.color,
                }}>{category}</span>
                <button onClick={() => setCategory("")} style={{ background: "none", border: "none", cursor: "pointer", color: TEXT_DIM, display: "flex", alignItems: "center" }}>
                  <X size={12} />
                </button>
              </div>
            )}

            {/* Title */}
            <textarea
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="Your article title…"
              rows={2}
              dir={isRTL ? "rtl" : "ltr"}
              style={{
                width: "100%", resize: "none", background: "transparent",
                border: "none", outline: "none",
                fontFamily: SERIF, fontWeight: 800,
                fontSize: "clamp(1.8rem, 4vw, 2.6rem)",
                color: TEXT, lineHeight: 1.2,
                marginBottom: 8,
              }}
              className="placeholder:text-[rgba(255,255,255,0.12)]"
            />

            {/* Subtitle / excerpt hint */}
            <p style={{ fontFamily: SF, fontSize: 12, color: TEXT_DIM, marginBottom: 28 }}>
              {title.length > 0 ? `${title.length} chars · Aim for 60–80 for best SEO` : "Add a compelling title to hook your readers"}
            </p>

            {/* AI Button */}
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 24 }}>
              <div style={{ flex: 1, height: 1, background: BORDER }} />
              <button
                onClick={generateAiContent}
                disabled={aiLoading}
                style={{
                  display: "flex", alignItems: "center", gap: 8,
                  padding: "8px 18px", borderRadius: 10, cursor: aiLoading ? "default" : "pointer",
                  background: aiLoading ? CARD2 : `${ACCENT}18`,
                  border: `1px solid ${aiLoading ? BORDER : ACCENT + "40"}`,
                  fontFamily: SF, fontSize: 12, fontWeight: 600,
                  color: aiLoading ? TEXT_DIM : ACCENT,
                  transition: "all 0.2s",
                }}
              >
                {aiLoading
                  ? <><Loader2 size={13} style={{ animation: "spin 1s linear infinite" }} /> Generating…</>
                  : <><Sparkles size={13} /> Write with AI</>}
              </button>
              <div style={{ flex: 1, height: 1, background: BORDER }} />
            </div>

            {/* Content area */}
            <div style={{ position: "relative" }}>
              <textarea
                ref={contentRef}
                value={content}
                onChange={e => setContent(e.target.value)}
                dir={isRTL ? "rtl" : "ltr"}
                placeholder={"Start writing your blog post…\n\nShare your ideas, tell your story, or explain a concept. Your readers are waiting.\n\nTip: Use the toolbar above for formatting, or type Markdown directly."}
                style={{
                  width: "100%", resize: "none", outline: "none",
                  background: "transparent", border: "none",
                  fontFamily: SERIF, fontSize: "1.07rem",
                  color: TEXT_SEC, lineHeight: 1.95,
                  minHeight: 560,
                }}
                className="placeholder:text-[rgba(255,255,255,0.1)]"
                onKeyDown={e => {
                  if ((e.ctrlKey || e.metaKey) && e.key === "s") { e.preventDefault(); save(); }
                  if ((e.ctrlKey || e.metaKey) && e.key === "b") { e.preventDefault(); insertFormat("**", "**", "bold"); }
                  if ((e.ctrlKey || e.metaKey) && e.key === "i") { e.preventDefault(); insertFormat("_", "_", "italic"); }
                }}
              />
              {wc > 0 && (
                <div style={{
                  position: "absolute", bottom: 8, right: 0,
                  fontFamily: SF, fontSize: 10, color: TEXT_DIM, fontVariantNumeric: "tabular-nums",
                }}>
                  {wc.toLocaleString()} / {wordGoal.toLocaleString()} words
                </div>
              )}
            </div>

            {/* Inline tags */}
            {tags.length > 0 && (
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6, paddingTop: 20, borderTop: `1px solid ${BORDER}`, marginTop: 8 }}>
                {tags.map(tag => (
                  <span key={tag} style={{
                    display: "inline-flex", alignItems: "center", gap: 4,
                    fontFamily: SF, fontSize: 11, fontWeight: 500, color: TEXT_DIM,
                    padding: "4px 10px", borderRadius: 20,
                    background: CARD2, border: `1px solid ${BORDER}`,
                  }}>
                    #{tag}
                    <button onClick={() => removeTag(tag)} style={{ background: "none", border: "none", cursor: "pointer", color: TEXT_DIM, display: "flex", alignItems: "center", padding: 0, marginLeft: 2 }}>
                      <X size={10} />
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* ── SIDEBAR ── */}
          {!focusMode && (
            <aside style={{ display: "flex", flexDirection: "column", gap: 12 }}>

              {/* Stats */}
              <div style={{ background: CARD, borderRadius: 14, border: `1px solid ${BORDER}`, padding: 16 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 14 }}>
                  <BarChart2 size={11} color={TEXT_DIM} />
                  <span style={{ fontFamily: SF, fontSize: 10, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: TEXT_DIM }}>
                    Stats
                  </span>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, marginBottom: 14 }}>
                  {[
                    { value: wc.toLocaleString(), label: "Words" },
                    { value: readTime.toString(), label: "Min read" },
                    { value: (article.language || "EN").toUpperCase(), label: "Lang" },
                  ].map(({ value, label }) => (
                    <div key={label} style={{
                      background: CARD2, borderRadius: 10, padding: "10px 4px",
                      textAlign: "center", border: `1px solid ${BORDER2}`,
                    }}>
                      <div style={{ fontFamily: SF, fontSize: 16, fontWeight: 700, color: TEXT }}>{value}</div>
                      <div style={{ fontFamily: SF, fontSize: 9, color: TEXT_DIM, marginTop: 2, fontWeight: 500, letterSpacing: "0.04em", textTransform: "uppercase" }}>{label}</div>
                    </div>
                  ))}
                </div>

                {/* Extra stats row */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 14 }}>
                  {[
                    { value: cc.toLocaleString(), label: "Characters" },
                    { value: sc > 0 ? sc.toString() : "0", label: "Sentences" },
                    { value: pc > 0 ? pc.toString() : "0", label: "Paragraphs" },
                    { value: level.label, label: "Reading level", valueColor: level.color },
                  ].map(({ value, label, valueColor }) => (
                    <div key={label} style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <span style={{ fontFamily: SF, fontSize: 11, color: TEXT_DIM }}>{label}</span>
                      <span style={{ fontFamily: SF, fontSize: 11, fontWeight: 600, color: valueColor || TEXT_SEC }}>{value}</span>
                    </div>
                  ))}
                </div>

                {/* Progress bar */}
                <div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                    <button
                      onClick={() => setShowGoalPicker(p => !p)}
                      style={{
                        display: "flex", alignItems: "center", gap: 4,
                        background: "none", border: "none", cursor: "pointer",
                        fontFamily: SF, fontSize: 10, color: TEXT_DIM, padding: 0,
                      }}
                    >
                      <Target size={9} /> Goal: {wordGoal.toLocaleString()} words
                      <ChevronDown size={9} style={{ transform: showGoalPicker ? "rotate(180deg)" : "none", transition: "0.2s" }} />
                    </button>
                    <span style={{ fontFamily: SF, fontSize: 10, color: progress >= 100 ? "#34d399" : TEXT_DIM }}>{progress}%</span>
                  </div>
                  {showGoalPicker && (
                    <div style={{
                      background: "#1a1a1a", border: `1px solid ${BORDER}`,
                      borderRadius: 10, overflow: "hidden", marginBottom: 8,
                    }}>
                      {WORD_GOALS.map(g => (
                        <button key={g.value} onClick={() => { setWordGoal(g.value); setShowGoalPicker(false); }} style={{
                          width: "100%", padding: "8px 12px", background: wordGoal === g.value ? `${ACCENT}18` : "none",
                          border: "none", cursor: "pointer", textAlign: "left",
                          fontFamily: SF, fontSize: 11, color: wordGoal === g.value ? ACCENT : TEXT_SEC,
                          borderBottom: `1px solid ${BORDER2}`,
                        }}>{g.label}</button>
                      ))}
                    </div>
                  )}
                  <div style={{ height: 4, borderRadius: 4, background: CARD2, overflow: "hidden" }}>
                    <div style={{
                      height: "100%", borderRadius: 4,
                      background: progress >= 100 ? "#34d399" : ACCENT,
                      width: `${progress}%`, transition: "width 0.5s ease",
                    }} />
                  </div>
                </div>
              </div>

              {/* Category */}
              <div style={{ background: CARD, borderRadius: 14, border: `1px solid ${BORDER}`, padding: 16 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 12 }}>
                  <AlignLeft size={11} color={TEXT_DIM} />
                  <span style={{ fontFamily: SF, fontSize: 10, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: TEXT_DIM }}>
                    Category
                  </span>
                </div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                  {ARTICLE_CATEGORIES.map(({ label, color }) => (
                    <button
                      key={label}
                      onClick={() => setCategory(p => p === label ? "" : label)}
                      style={{
                        padding: "4px 10px", borderRadius: 20,
                        fontFamily: SF, fontSize: 10, fontWeight: 600,
                        cursor: "pointer", transition: "all 0.15s",
                        background: category === label ? color : color + "14",
                        color: category === label ? "#fff" : color,
                        border: `1px solid ${category === label ? color : color + "30"}`,
                      }}
                    >{label}</button>
                  ))}
                </div>
              </div>

              {/* Tags */}
              <div style={{ background: CARD, borderRadius: 14, border: `1px solid ${BORDER}`, padding: 16 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 12 }}>
                  <Hash size={11} color={TEXT_DIM} />
                  <span style={{ fontFamily: SF, fontSize: 10, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: TEXT_DIM }}>
                    Tags
                  </span>
                  <span style={{ marginLeft: "auto", fontFamily: SF, fontSize: 10, color: TEXT_DIM }}>{tags.length}/10</span>
                </div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6, minHeight: 24, marginBottom: 10 }}>
                  {tags.map(tag => (
                    <span key={tag} style={{
                      display: "inline-flex", alignItems: "center", gap: 4,
                      fontFamily: SF, fontSize: 10, fontWeight: 500, color: TEXT_SEC,
                      padding: "4px 9px", borderRadius: 20,
                      background: CARD2, border: `1px solid ${BORDER}`,
                    }}>
                      #{tag}
                      <button onClick={() => removeTag(tag)} style={{ background: "none", border: "none", cursor: "pointer", color: TEXT_DIM, display: "flex", alignItems: "center", padding: 0 }}>
                        <X size={9} />
                      </button>
                    </span>
                  ))}
                  {tags.length === 0 && <span style={{ fontFamily: SF, fontSize: 10, color: TEXT_DIM, fontStyle: "italic" }}>No tags yet</span>}
                </div>
                <div style={{ display: "flex", gap: 6 }}>
                  <input
                    value={tagInput}
                    onChange={e => setTagInput(e.target.value)}
                    onKeyDown={handleTagKeyDown}
                    placeholder="Add a tag…"
                    style={{
                      flex: 1, height: 32, borderRadius: 8, padding: "0 10px",
                      background: CARD2, border: `1px solid ${BORDER}`, outline: "none",
                      fontFamily: SF, fontSize: 11, color: TEXT_SEC,
                    }}
                  />
                  <button onClick={addTag} style={{
                    width: 32, height: 32, borderRadius: 8,
                    background: CARD2, border: `1px solid ${BORDER}`,
                    cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
                    color: TEXT_SEC,
                  }}><Plus size={14} /></button>
                </div>
                <p style={{ fontFamily: SF, fontSize: 10, color: TEXT_DIM, marginTop: 6 }}>Enter or comma to add</p>
              </div>

              {/* Writing tips */}
              <div style={{
                background: `${ACCENT}0d`, borderRadius: 14,
                border: `1px solid ${ACCENT}22`, padding: 16,
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 10 }}>
                  <Sparkles size={11} color={ACCENT} />
                  <span style={{ fontFamily: SF, fontSize: 10, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: ACCENT + "bb" }}>
                    Writing Tips
                  </span>
                </div>
                <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: 7 }}>
                  {[
                    "Hook your reader in the first sentence",
                    "Keep paragraphs to 2–3 sentences max",
                    "Use subheadings to break up long sections",
                    "Add a featured image to increase engagement",
                    "End with a clear call-to-action or question",
                  ].map((tip, i) => (
                    <li key={i} style={{ display: "flex", alignItems: "flex-start", gap: 7 }}>
                      <span style={{ fontFamily: SF, fontSize: 13, color: ACCENT, flexShrink: 0, marginTop: -1 }}>·</span>
                      <span style={{ fontFamily: SF, fontSize: 11, color: TEXT_DIM, lineHeight: 1.6 }}>{tip}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* RTL notice */}
              {isRTL && (
                <div style={{
                  background: CARD2, borderRadius: 12, border: `1px solid ${BORDER}`,
                  padding: "10px 12px", display: "flex", alignItems: "flex-start", gap: 8,
                }}>
                  <Globe size={13} color={TEXT_DIM} style={{ flexShrink: 0, marginTop: 1 }} />
                  <span style={{ fontFamily: SF, fontSize: 11, color: TEXT_DIM, lineHeight: 1.5 }}>
                    Right-to-left layout active for your language.
                  </span>
                </div>
              )}
            </aside>
          )}
        </div>
      </div>

      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        textarea::placeholder { color: rgba(255,255,255,0.1); }
        input::placeholder { color: rgba(255,255,255,0.2); }
        input { color: rgba(255,255,255,0.7); }
      `}</style>
    </Layout>
  );
}
