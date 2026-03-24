import { useState, useRef, useEffect, useCallback } from "react";
import { useRoute, Link, useLocation } from "wouter";
import { Layout } from "@/components/layout";
import { useBook, useUpdateBook } from "@/hooks/use-books";
import { Input } from "@/components/ui/input";
import {
  ArrowLeft, Image as ImageIcon, Tag, Loader2, Save,
  Clock, Eye, BookOpen, X, Plus, Upload, Wand2, Globe,
  CheckCircle2, Hash, BarChart2, AlignLeft, Maximize2, Minimize2,
  FileText, Sparkles, EyeOff,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/contexts/language-context";

const ARTICLE_CATEGORIES = [
  { label: "Writing Tips", color: "#6366f1" },
  { label: "Craft & Technique", color: "#8b5cf6" },
  { label: "Publishing", color: "#ec4899" },
  { label: "Reading", color: "#f59e0b" },
  { label: "Inspiration", color: "#10b981" },
  { label: "Author Interviews", color: "#3b82f6" },
  { label: "Book Reviews", color: "#14b8a6" },
  { label: "Industry News", color: "#f97316" },
  { label: "Self-Publishing", color: "#a855f7" },
  { label: "Marketing", color: "#ef4444" },
  { label: "Grammar & Style", color: "#0ea5e9" },
  { label: "Research", color: "#84cc16" },
  { label: "Other", color: "#6b7280" },
];

function estimateReadTime(text: string): number {
  const words = text.trim().split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.ceil(words / 200));
}

function wordCount(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length;
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
        id,
        title,
        articleContent: content,
        articleCategory: category,
        tags,
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
    reader.onload = (ev) => setFeaturedImage(ev.target?.result as string);
    reader.readAsDataURL(file);
  };

  const handleFeaturedImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleImageFile(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file && file.type.startsWith("image/")) handleImageFile(file);
  };

  const addTag = () => {
    const t = tagInput.trim().toLowerCase();
    if (t && !tags.includes(t) && tags.length < 10) setTags(prev => [...prev, t]);
    setTagInput("");
  };

  const removeTag = (tag: string) => setTags(prev => prev.filter(x => x !== tag));

  const handleTagKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" || e.key === ",") { e.preventDefault(); addTag(); }
    if (e.key === "Backspace" && !tagInput && tags.length) setTags(prev => prev.slice(0, -1));
  };

  const generateAiContent = async () => {
    if (!title.trim()) {
      toast({ variant: "destructive", title: "Add a title first", description: "AI needs a title to generate content." });
      return;
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
      const generated = data.content || "";
      setContent(prev => prev ? `${prev}\n\n${generated}` : generated);
      toast({ title: "AI content added!" });
    } catch (err: any) {
      toast({ variant: "destructive", title: "AI Error", description: err?.message || "Could not generate content" });
    } finally {
      setAiLoading(false);
    }
  };

  const wc = wordCount(content);
  const readTime = estimateReadTime(content);
  const selectedCat = ARTICLE_CATEGORIES.find(c => c.label === category);

  if (isLoading) return (
    <Layout>
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-foreground/40" />
      </div>
    </Layout>
  );

  if (!article) return (
    <Layout>
      <div className="text-center py-20 text-foreground/40">Article not found.</div>
    </Layout>
  );

  /* ── PREVIEW MODE ── */
  if (showPreview) return (
    <Layout>
      <div className="min-h-screen bg-[#fafaf8]">
        <div className="sticky top-0 z-30 bg-white/90 backdrop-blur border-b border-black/5 px-6 py-3 flex items-center justify-between">
          <button onClick={() => setShowPreview(false)} className="flex items-center gap-2 text-sm text-foreground/60 hover:text-foreground transition-colors font-medium">
            <ArrowLeft className="w-4 h-4" /> Back to editor
          </button>
          <span className="text-xs text-foreground/40 font-medium uppercase tracking-widest">Preview</span>
          <div className="w-24" />
        </div>
        <article className="max-w-2xl mx-auto px-6 py-16">
          {featuredImage && (
            <img src={featuredImage} alt="Featured" className="w-full h-72 object-cover rounded-3xl mb-10 shadow-lg" />
          )}
          <div className="flex items-center gap-3 mb-5">
            {selectedCat && (
              <span className="text-xs font-bold uppercase tracking-widest px-3 py-1 rounded-full" style={{ background: selectedCat.color + "20", color: selectedCat.color }}>
                {category}
              </span>
            )}
            <span className="text-xs text-foreground/35 flex items-center gap-1">
              <Clock className="w-3 h-3" /> {readTime} min read
            </span>
            <span className="text-xs text-foreground/35">{wc.toLocaleString()} words</span>
          </div>
          <h1 className="text-4xl sm:text-5xl font-bold text-foreground leading-[1.15] mb-6" style={{ fontFamily: "Georgia, serif" }}>
            {title || "Untitled Blog Post"}
          </h1>
          {article.authorName && (
            <div className="flex items-center gap-3 mb-10 pb-8 border-b border-black/8">
              <div className="w-10 h-10 rounded-full bg-foreground/10 flex items-center justify-center font-bold text-sm text-foreground/60">
                {article.authorName[0].toUpperCase()}
              </div>
              <div>
                <p className="text-sm font-semibold text-foreground/80">{article.authorName}</p>
                <p className="text-xs text-foreground/40">Author</p>
              </div>
            </div>
          )}
          <div className="prose prose-lg max-w-none leading-[1.9] text-foreground/80 whitespace-pre-wrap" dir={isRTL ? "rtl" : "ltr"}
            style={{ fontFamily: "Georgia, 'Times New Roman', serif", fontSize: "1.1rem" }}>
            {content || <span className="text-foreground/30 italic">No content yet.</span>}
          </div>
          {tags.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-14 pt-8 border-t border-black/6">
              {tags.map(tag => (
                <span key={tag} className="px-3 py-1.5 rounded-full bg-foreground/5 text-xs font-medium text-foreground/50">
                  #{tag}
                </span>
              ))}
            </div>
          )}
        </article>
      </div>
    </Layout>
  );

  /* ── EDITOR ── */
  return (
    <Layout>
      <div className="min-h-screen" style={{ background: "hsl(var(--background))" }}>

        {/* ── Top Bar ── */}
        <div className="sticky top-0 z-30 border-b border-border/50 px-5 py-2.5 flex items-center justify-between"
          style={{ background: "hsl(var(--background) / 0.97)", backdropFilter: "blur(12px)" }}>
          <div className="flex items-center gap-3">
            <Link href="/">
              <button className="flex items-center gap-1.5 text-sm text-foreground/50 hover:text-foreground transition-colors">
                <ArrowLeft className="w-4 h-4" /> Dashboard
              </button>
            </Link>
            <div className="w-px h-4 bg-border" />
            <span className="text-xs font-bold uppercase tracking-widest text-foreground/50 flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5" /> Blog Post
            </span>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs text-foreground/35 hidden sm:block">
              {wc.toLocaleString()} words · {readTime} min read
            </span>

            <button
              onClick={() => setFocusMode(f => !f)}
              className="p-2 rounded-lg text-foreground/40 hover:text-foreground hover:bg-foreground/5 transition-all"
              title={focusMode ? "Exit focus mode" : "Focus mode"}
            >
              {focusMode ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            </button>

            <button
              onClick={() => setShowPreview(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border text-sm text-foreground/60 hover:text-foreground hover:bg-foreground/5 transition-all"
            >
              <Eye className="w-4 h-4" /> Preview
            </button>

            <button
              onClick={() => save()}
              disabled={saving}
              style={justSaved
                ? { background: "#10b981", color: "#fff", border: "none", borderRadius: "10px", fontWeight: 600, padding: "7px 16px", display: "flex", alignItems: "center", gap: "6px", fontSize: "13px", cursor: "default", transition: "all 0.2s" }
                : { background: "hsl(var(--primary))", color: "#fff", border: "none", borderRadius: "10px", fontWeight: 600, padding: "7px 16px", display: "flex", alignItems: "center", gap: "6px", fontSize: "13px", cursor: "pointer", transition: "all 0.2s" }
              }
            >
              {saving
                ? <><Loader2 className="w-4 h-4 animate-spin" /> Saving…</>
                : justSaved
                  ? <><CheckCircle2 className="w-4 h-4" /> Saved</>
                  : <><Save className="w-4 h-4" /> Save</>
              }
            </button>
          </div>
        </div>

        {/* ── Content ── */}
        <div className={`mx-auto px-4 py-8 transition-all duration-300 ${focusMode ? "max-w-2xl" : "max-w-5xl"}`}>
          <div className={`grid gap-7 ${focusMode ? "grid-cols-1" : "grid-cols-1 lg:grid-cols-[1fr_268px]"}`}>

            {/* ── Main Column ── */}
            <div className="space-y-5">

              {/* Featured Image */}
              <div
                onClick={() => fileInputRef.current?.click()}
                onDragOver={e => { e.preventDefault(); setDragOver(true); }}
                onDragLeave={() => setDragOver(false)}
                onDrop={handleDrop}
                className="relative rounded-2xl overflow-hidden cursor-pointer group transition-all duration-200"
                style={{
                  minHeight: 200,
                  border: dragOver ? "2px dashed hsl(var(--primary))" : "2px dashed hsl(var(--border))",
                  background: featuredImage ? undefined : dragOver ? "hsl(var(--primary) / 0.05)" : "hsl(var(--muted) / 0.4)",
                }}
              >
                {featuredImage ? (
                  <>
                    <img src={featuredImage} alt="Featured" className="w-full object-cover" style={{ maxHeight: 300 }} />
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3">
                      <span className="text-white text-sm font-semibold bg-black/30 backdrop-blur px-4 py-2 rounded-xl flex items-center gap-2">
                        <Upload className="w-4 h-4" /> Change image
                      </span>
                    </div>
                    <button
                      onClick={e => { e.stopPropagation(); setFeaturedImage(null); }}
                      className="absolute top-3 right-3 w-8 h-8 rounded-full bg-black/60 text-white flex items-center justify-center hover:bg-black/80 transition-colors shadow-lg"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </>
                ) : (
                  <div className="flex flex-col items-center justify-center h-[200px] gap-3">
                    <div className="w-12 h-12 rounded-2xl bg-foreground/8 flex items-center justify-center group-hover:scale-110 transition-transform">
                      <ImageIcon className="w-6 h-6 text-foreground/30" />
                    </div>
                    <div className="text-center">
                      <p className="font-semibold text-foreground/40 text-sm">Add a featured image</p>
                      <p className="text-xs text-foreground/25 mt-0.5">Click or drag & drop · JPG, PNG, WebP</p>
                    </div>
                  </div>
                )}
                <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleFeaturedImageUpload} />
              </div>

              {/* Category badge (quick view) */}
              {category && selectedCat && (
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold uppercase tracking-widest px-3 py-1 rounded-full" style={{ background: selectedCat.color + "18", color: selectedCat.color }}>
                    {category}
                  </span>
                  <button onClick={() => setCategory("")} className="text-foreground/30 hover:text-foreground/60 transition-colors">
                    <X className="w-3 h-3" />
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
                className="w-full resize-none bg-transparent border-none outline-none leading-tight placeholder:text-foreground/20"
                style={{ fontFamily: "Georgia, 'Times New Roman', serif", fontSize: "clamp(1.8rem, 4vw, 2.8rem)", fontWeight: 800, color: "hsl(var(--foreground))" }}
              />

              {/* Divider with AI button */}
              <div className="flex items-center gap-3">
                <div className="flex-1 h-px bg-border/60" />
                <button
                  onClick={generateAiContent}
                  disabled={aiLoading}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all hover:scale-[1.02]"
                  style={{ background: aiLoading ? "hsl(var(--muted))" : "hsl(var(--primary) / 0.1)", color: aiLoading ? "hsl(var(--foreground) / 0.4)" : "hsl(var(--primary))", border: "1px solid hsl(var(--primary) / 0.2)" }}
                >
                  {aiLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
                  {aiLoading ? "Generating…" : "Write with AI"}
                </button>
                <div className="flex-1 h-px bg-border/60" />
              </div>

              {/* Content Editor */}
              <div className="relative">
                <textarea
                  ref={contentRef}
                  value={content}
                  onChange={e => setContent(e.target.value)}
                  dir={isRTL ? "rtl" : "ltr"}
                  placeholder={"Start writing your blog post…\n\nShare your ideas, tell your story, or explain a concept. Your readers are waiting."}
                  className="w-full resize-none outline-none text-foreground/80 leading-[1.9] placeholder:text-foreground/20 bg-transparent border-none"
                  style={{ fontFamily: "Georgia, 'Times New Roman', serif", fontSize: "1.05rem", minHeight: "520px" }}
                />
                {/* Word count badge */}
                {wc > 0 && (
                  <div className="absolute bottom-3 right-3 text-[10px] text-foreground/25 font-medium tabular-nums">
                    {wc.toLocaleString()} words
                  </div>
                )}
              </div>

              {/* Tags inline */}
              {tags.length > 0 && (
                <div className="flex flex-wrap gap-1.5 pt-4 border-t border-border/40">
                  {tags.map(tag => (
                    <span key={tag} className="flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium text-foreground/50 bg-foreground/5">
                      #{tag}
                      <button onClick={() => removeTag(tag)} className="text-foreground/30 hover:text-foreground/60 ml-0.5 transition-colors">
                        <X className="w-2.5 h-2.5" />
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* ── Sidebar ── */}
            {!focusMode && (
              <aside className="space-y-4">

                {/* Stats */}
                <div className="rounded-2xl border border-border/50 p-4 space-y-3" style={{ background: "hsl(var(--card))" }}>
                  <h3 className="text-[10px] font-bold uppercase tracking-widest text-foreground/35 flex items-center gap-1.5">
                    <BarChart2 className="w-3 h-3" /> Stats
                  </h3>
                  <div className="grid grid-cols-3 gap-3 text-center">
                    <div className="rounded-xl bg-foreground/4 py-3">
                      <p className="text-lg font-bold text-foreground">{wc.toLocaleString()}</p>
                      <p className="text-[10px] text-foreground/40 font-medium mt-0.5">Words</p>
                    </div>
                    <div className="rounded-xl bg-foreground/4 py-3">
                      <p className="text-lg font-bold text-foreground">{readTime}</p>
                      <p className="text-[10px] text-foreground/40 font-medium mt-0.5">Min read</p>
                    </div>
                    <div className="rounded-xl bg-foreground/4 py-3">
                      <p className="text-lg font-bold text-foreground uppercase">{article.language || "EN"}</p>
                      <p className="text-[10px] text-foreground/40 font-medium mt-0.5">Lang</p>
                    </div>
                  </div>
                  {/* Progress bar for target */}
                  <div>
                    <div className="flex justify-between text-[10px] text-foreground/35 mb-1">
                      <span>Progress to 1,000 words</span>
                      <span>{Math.min(100, Math.round(wc / 10))}%</span>
                    </div>
                    <div className="h-1.5 rounded-full bg-foreground/8 overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{ width: `${Math.min(100, wc / 10)}%`, background: "hsl(var(--primary))" }}
                      />
                    </div>
                  </div>
                </div>

                {/* Category */}
                <div className="rounded-2xl border border-border/50 p-4" style={{ background: "hsl(var(--card))" }}>
                  <h3 className="text-[10px] font-bold uppercase tracking-widest text-foreground/35 mb-3 flex items-center gap-1.5">
                    <AlignLeft className="w-3 h-3" /> Category
                  </h3>
                  <div className="flex flex-wrap gap-1.5">
                    {ARTICLE_CATEGORIES.map(({ label, color }) => (
                      <button
                        key={label}
                        onClick={() => setCategory(prev => prev === label ? "" : label)}
                        className="px-2.5 py-1 rounded-full text-[11px] font-semibold transition-all duration-150 hover:scale-[1.03]"
                        style={
                          category === label
                            ? { background: color, color: "#fff", border: `1.5px solid ${color}` }
                            : { background: color + "12", color: color, border: `1.5px solid ${color}30` }
                        }
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Tags */}
                <div className="rounded-2xl border border-border/50 p-4" style={{ background: "hsl(var(--card))" }}>
                  <h3 className="text-[10px] font-bold uppercase tracking-widest text-foreground/35 mb-3 flex items-center gap-1.5">
                    <Hash className="w-3 h-3" /> Tags
                    <span className="ml-auto text-foreground/25">{tags.length}/10</span>
                  </h3>
                  <div className="flex flex-wrap gap-1.5 mb-3 min-h-[24px]">
                    {tags.map(tag => (
                      <span key={tag} className="flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-medium text-foreground/60 bg-foreground/6 border border-border/40">
                        #{tag}
                        <button onClick={() => removeTag(tag)} className="text-foreground/35 hover:text-foreground/70 transition-colors">
                          <X className="w-2.5 h-2.5" />
                        </button>
                      </span>
                    ))}
                    {tags.length === 0 && <span className="text-[11px] text-foreground/25 italic">No tags yet</span>}
                  </div>
                  <div className="flex gap-2">
                    <input
                      value={tagInput}
                      onChange={e => setTagInput(e.target.value)}
                      onKeyDown={handleTagKeyDown}
                      placeholder="Add a tag…"
                      className="flex-1 text-xs h-8 rounded-lg border border-border/50 bg-foreground/4 px-3 outline-none text-foreground/70 placeholder:text-foreground/25 focus:border-primary/40 transition-colors"
                    />
                    <button
                      onClick={addTag}
                      className="w-8 h-8 rounded-lg bg-foreground/8 hover:bg-foreground/12 text-foreground/50 hover:text-foreground/80 flex items-center justify-center flex-shrink-0 transition-all"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>
                  <p className="text-[10px] text-foreground/25 mt-1.5">Press Enter or comma to add</p>
                </div>

                {/* Writing tips */}
                <div className="rounded-2xl border border-primary/15 p-4" style={{ background: "hsl(var(--primary) / 0.04)" }}>
                  <h3 className="text-[10px] font-bold uppercase tracking-widest text-primary/60 mb-3 flex items-center gap-1.5">
                    <Sparkles className="w-3 h-3" /> Quick Tips
                  </h3>
                  <ul className="space-y-1.5 text-[11px] text-foreground/50 leading-relaxed">
                    <li>• Start with a strong hook in the first sentence</li>
                    <li>• Keep paragraphs short — 3 to 5 sentences</li>
                    <li>• Use the AI to expand or continue your writing</li>
                    <li>• Add a featured image to boost engagement</li>
                    <li>• Preview before publishing to catch any issues</li>
                  </ul>
                </div>

                {isRTL && (
                  <div className="rounded-xl border border-border/40 p-3 text-xs text-foreground/50 flex items-start gap-2">
                    <Globe className="w-4 h-4 mt-0.5 text-foreground/30 flex-shrink-0" />
                    Right-to-left layout is active for your language.
                  </div>
                )}
              </aside>
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
}
