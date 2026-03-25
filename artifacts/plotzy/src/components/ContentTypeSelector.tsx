import { useState } from "react";
import { createPortal } from "react-dom";
import {
  BookOpen, FileText, ChevronRight, Loader2, X,
  Layers, Tag, Image as ImageIcon, AlignLeft, ArrowLeft, PenLine,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { BOOK_LANGUAGES } from "@/lib/i18n";

interface ContentTypeSelectorProps {
  open: boolean;
  onClose: () => void;
  lang: string;
  isRTL: boolean;
  onCreateBook: (data: { title: string; summary: string; authorName: string; language: string; genre?: string }) => Promise<void>;
  onCreateArticle: (data: { title: string; authorName: string; language: string; category: string }) => Promise<void>;
  isCreating: boolean;
}

const BLOG_CATEGORIES = [
  "Writing Tips", "Craft & Technique", "Publishing", "Reading", "Inspiration",
  "Author Interviews", "Book Reviews", "Self-Publishing", "Marketing", "Other",
];

const BOOK_GENRES = [
  "Fantasy", "Romance", "Mystery", "Thriller", "Science Fiction",
  "Historical Fiction", "Horror", "Literary Fiction", "Adventure",
  "Biography", "Self-Help", "Young Adult", "Children's", "Other",
];

const BOOK_FEATURES = [
  { icon: Layers, text: "Chapter-by-chapter workspace" },
  { icon: ImageIcon, text: "Full cover designer" },
  { icon: AlignLeft, text: "Lore & outline tools" },
];

const BLOG_FEATURES = [
  { icon: FileText, text: "Single-page rich editor" },
  { icon: ImageIcon, text: "Featured cover image" },
  { icon: Tag, text: "Tags & categories for SEO" },
];

export function ContentTypeSelector({
  open, onClose, lang, isRTL,
  onCreateBook, onCreateArticle, isCreating,
}: ContentTypeSelectorProps) {
  const [step, setStep] = useState<"choose" | "book" | "blog">("choose");
  const [title, setTitle] = useState("");
  const [summary, setSummary] = useState("");
  const [authorName, setAuthorName] = useState("");
  const [bookLang, setBookLang] = useState(lang);
  const [genre, setGenre] = useState("");
  const [blogCategory, setBlogCategory] = useState("");
  const [error, setError] = useState<string | null>(null);

  const reset = () => {
    setStep("choose");
    setTitle(""); setSummary(""); setAuthorName(""); setBookLang(lang); setGenre(""); setBlogCategory("");
    setError(null);
  };

  const handleClose = () => { reset(); onClose(); };

  const handleCreateBook = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    setError(null);
    try {
      await onCreateBook({ title, summary, authorName, language: bookLang, genre: genre || undefined });
      reset();
    } catch (err: any) {
      setError(err?.message || "Failed to create book. Please try again.");
    }
  };

  const handleCreateBlog = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    setError(null);
    try {
      await onCreateArticle({ title, authorName, language: bookLang, category: blogCategory });
      reset();
    } catch (err: any) {
      setError(err?.message || "Failed to create article. Please try again.");
    }
  };

  if (!open) return null;

  const inputStyle = "rounded-xl bg-white/5 border-white/10 text-white focus:border-white/30 focus:ring-0 placeholder:text-white/20";
  const labelStyle: React.CSSProperties = { display: "block", fontSize: 10, fontWeight: 700, letterSpacing: "0.15em", textTransform: "uppercase", color: "rgba(255,255,255,0.4)", marginBottom: 5 };

  const modal = (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 9999,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "16px",
        backgroundColor: "rgba(0, 0, 0, 0.92)",
        isolation: "isolate",
      }}
      onClick={handleClose}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          position: "relative",
          width: "100%",
          maxWidth: 520,
          borderRadius: 24,
          backgroundColor: "#111008",
          border: "1px solid rgba(255,255,255,0.10)",
          boxShadow: "0 40px 100px rgba(0,0,0,0.95), 0 0 0 1px rgba(255,255,255,0.04) inset",
          overflow: "hidden",
          zIndex: 10000,
        }}
      >
        <div style={{ height: 1, background: "linear-gradient(90deg,transparent,rgba(255,255,255,0.15) 40%,rgba(255,255,255,0.15) 60%,transparent)" }} />

        {/* Header */}
        <div style={{ padding: "22px 26px 14px", display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
          <div>
            {step === "choose" && (
              <>
                <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.18em", textTransform: "uppercase", color: "rgba(255,255,255,0.45)", marginBottom: 5 }}>New Project</p>
                <h2 style={{ fontSize: 21, fontWeight: 800, color: "#fff", margin: 0 }}>What are you creating?</h2>
                <p style={{ fontSize: 13, color: "rgba(255,255,255,0.38)", marginTop: 3 }}>Choose a format to get started</p>
              </>
            )}
            {step === "book" && (
              <>
                <button onClick={() => { setStep("choose"); setError(null); }} style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 11, color: "rgba(255,255,255,0.35)", background: "none", border: "none", cursor: "pointer", padding: 0, marginBottom: 7 }}>
                  <ArrowLeft size={12} /> Back
                </button>
                <h2 style={{ fontSize: 21, fontWeight: 800, color: "#fff", margin: 0 }}>New Book</h2>
                <p style={{ fontSize: 13, color: "rgba(255,255,255,0.38)", marginTop: 3 }}>Chapter-based writing project</p>
              </>
            )}
            {step === "blog" && (
              <>
                <button onClick={() => { setStep("choose"); setError(null); }} style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 11, color: "rgba(255,255,255,0.35)", background: "none", border: "none", cursor: "pointer", padding: 0, marginBottom: 7 }}>
                  <ArrowLeft size={12} /> Back
                </button>
                <h2 style={{ fontSize: 21, fontWeight: 800, color: "#fff", margin: 0 }}>New Blog Post</h2>
                <p style={{ fontSize: 13, color: "rgba(255,255,255,0.38)", marginTop: 3 }}>Single-page article with SEO tools</p>
              </>
            )}
          </div>
          <button
            onClick={handleClose}
            style={{ width: 30, height: 30, borderRadius: "50%", background: "rgba(255,255,255,0.07)", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: "rgba(255,255,255,0.5)", flexShrink: 0, marginTop: 2 }}
          >
            <X size={14} />
          </button>
        </div>

        {/* ── Step 1: Choose ── */}
        {step === "choose" && (
          <div style={{ padding: "0 26px 26px", display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            <button
              onClick={() => setStep("book")}
              style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.09)", borderRadius: 14, padding: "18px 16px", textAlign: "left", cursor: "pointer" }}
              onMouseEnter={e => (e.currentTarget.style.borderColor = "rgba(255,255,255,0.35)")}
              onMouseLeave={e => (e.currentTarget.style.borderColor = "rgba(255,255,255,0.09)")}
            >
              <div style={{ width: 38, height: 38, borderRadius: 9, background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.12)", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 12 }}>
                <BookOpen size={17} color="#EFEFEF" />
              </div>
              <p style={{ color: "#fff", fontWeight: 700, fontSize: 14, margin: "0 0 9px" }}>Book</p>
              <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: 5 }}>
                {BOOK_FEATURES.map(({ icon: Icon, text }) => (
                  <li key={text} style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 11, color: "rgba(255,255,255,0.38)" }}>
                    <Icon size={10} color="rgba(255,255,255,0.4)" />
                    {text}
                  </li>
                ))}
              </ul>
              <div style={{ display: "flex", alignItems: "center", gap: 3, marginTop: 12, fontSize: 11, fontWeight: 600, color: "#EFEFEF" }}>
                Get started <ChevronRight size={12} />
              </div>
            </button>

            <button
              onClick={() => setStep("blog")}
              style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.09)", borderRadius: 14, padding: "18px 16px", textAlign: "left", cursor: "pointer" }}
              onMouseEnter={e => (e.currentTarget.style.borderColor = "rgba(255,255,255,0.35)")}
              onMouseLeave={e => (e.currentTarget.style.borderColor = "rgba(255,255,255,0.09)")}
            >
              <div style={{ width: 38, height: 38, borderRadius: 9, background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.12)", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 12 }}>
                <PenLine size={17} color="#EFEFEF" />
              </div>
              <p style={{ color: "#fff", fontWeight: 700, fontSize: 14, margin: "0 0 9px" }}>Blog / Article</p>
              <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: 5 }}>
                {BLOG_FEATURES.map(({ icon: Icon, text }) => (
                  <li key={text} style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 11, color: "rgba(255,255,255,0.38)" }}>
                    <Icon size={10} color="rgba(255,255,255,0.4)" />
                    {text}
                  </li>
                ))}
              </ul>
              <div style={{ display: "flex", alignItems: "center", gap: 3, marginTop: 12, fontSize: 11, fontWeight: 600, color: "#EFEFEF" }}>
                Get started <ChevronRight size={12} />
              </div>
            </button>
          </div>
        )}

        {/* ── Step 2a: Book form ── */}
        {step === "book" && (
          <form onSubmit={handleCreateBook} style={{ padding: "0 26px 26px", display: "flex", flexDirection: "column", gap: 13 }}>
            {error && (
              <div style={{ padding: "10px 14px", borderRadius: 10, background: "rgba(220,38,38,0.18)", border: "1px solid rgba(220,38,38,0.4)", color: "#fca5a5", fontSize: 13 }}>
                {error}
              </div>
            )}

            {/* Title */}
            <div>
              <label style={labelStyle}>Book Title</label>
              <Input
                placeholder="e.g. The Last Kingdom"
                value={title}
                onChange={e => setTitle(e.target.value)}
                className={inputStyle}
                autoFocus
                dir={isRTL ? "rtl" : "ltr"}
              />
            </div>

            {/* Author */}
            <div>
              <label style={labelStyle}>Author Name</label>
              <Input
                placeholder="Your name"
                value={authorName}
                onChange={e => setAuthorName(e.target.value)}
                className={inputStyle}
                dir={isRTL ? "rtl" : "ltr"}
              />
            </div>

            {/* Summary */}
            <div>
              <label style={labelStyle}>Brief Summary</label>
              <Textarea
                placeholder="A short description of your story…"
                value={summary}
                onChange={e => setSummary(e.target.value)}
                className={`${inputStyle} resize-none`}
                rows={2}
                dir={isRTL ? "rtl" : "ltr"}
              />
            </div>

            {/* Genre */}
            <div>
              <label style={labelStyle}>Genre <span style={{ color: "rgba(255,255,255,0.2)", fontWeight: 400, textTransform: "none", letterSpacing: 0 }}>— optional</span></label>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                {BOOK_GENRES.map(g => (
                  <button
                    key={g}
                    type="button"
                    onClick={() => setGenre(genre === g ? "" : g)}
                    style={{
                      padding: "5px 12px",
                      borderRadius: 20,
                      fontSize: 11,
                      fontWeight: 600,
                      letterSpacing: "0.03em",
                      border: genre === g ? "1px solid rgba(255,255,255,0.55)" : "1px solid rgba(255,255,255,0.1)",
                      background: genre === g ? "rgba(255,255,255,0.12)" : "rgba(255,255,255,0.04)",
                      color: genre === g ? "#fff" : "rgba(255,255,255,0.38)",
                      cursor: "pointer",
                      transition: "all 0.15s",
                    }}
                    onMouseEnter={e => { if (genre !== g) { e.currentTarget.style.borderColor = "rgba(255,255,255,0.25)"; e.currentTarget.style.color = "rgba(255,255,255,0.7)"; }}}
                    onMouseLeave={e => { if (genre !== g) { e.currentTarget.style.borderColor = "rgba(255,255,255,0.1)"; e.currentTarget.style.color = "rgba(255,255,255,0.38)"; }}}
                  >
                    {g}
                  </button>
                ))}
              </div>
            </div>

            {/* Language */}
            <div>
              <label style={labelStyle}>Language</label>
              <Select value={bookLang} onValueChange={setBookLang}>
                <SelectTrigger className={`${inputStyle} focus:ring-0`}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent
                  className="bg-[#1a1a1a] border-white/10 text-white max-h-56 overflow-y-auto"
                  style={{ zIndex: 99999 }}
                  position="popper"
                >
                  {BOOK_LANGUAGES.map(l => (
                    <SelectItem key={l.code} value={l.code} className="focus:bg-white/10 text-white">
                      {l.nativeName} <span style={{ color: "rgba(255,255,255,0.35)", fontSize: 11 }}>({l.name})</span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={isCreating || !title.trim()}
              style={{ padding: "12px 0", borderRadius: 12, fontWeight: 700, fontSize: 14, cursor: isCreating || !title.trim() ? "not-allowed" : "pointer", opacity: isCreating || !title.trim() ? 0.5 : 1, background: "#EFEFEF", color: "#111111", border: "none", display: "flex", alignItems: "center", justifyContent: "center", gap: 7 }}
            >
              {isCreating ? <><Loader2 size={15} className="animate-spin" /> Creating…</> : "Create Book"}
            </button>
          </form>
        )}

        {/* ── Step 2b: Blog form ── */}
        {step === "blog" && (
          <form onSubmit={handleCreateBlog} style={{ padding: "0 26px 26px", display: "flex", flexDirection: "column", gap: 13 }}>
            {error && (
              <div style={{ padding: "10px 14px", borderRadius: 10, background: "rgba(220,38,38,0.18)", border: "1px solid rgba(220,38,38,0.4)", color: "#fca5a5", fontSize: 13 }}>
                {error}
              </div>
            )}
            <div style={{ padding: "11px 13px", borderRadius: 11, background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.12)", display: "flex", gap: 9, alignItems: "flex-start" }}>
              <ImageIcon size={14} color="#EFEFEF" style={{ marginTop: 1, flexShrink: 0 }} />
              <div>
                <p style={{ fontSize: 11, fontWeight: 700, color: "#EFEFEF", margin: "0 0 2px" }}>Blog Editor includes</p>
                <p style={{ fontSize: 11, color: "rgba(255,255,255,0.4)", margin: 0, lineHeight: 1.5 }}>Featured cover · Tags & categories · AI generation · Live preview · Auto-save</p>
              </div>
            </div>
            <div>
              <label style={labelStyle}>Post Title</label>
              <Input
                placeholder="e.g. 10 Tips for Better Dialogue"
                value={title}
                onChange={e => setTitle(e.target.value)}
                className={inputStyle}
                autoFocus
                dir={isRTL ? "rtl" : "ltr"}
              />
            </div>
            <div>
              <label style={labelStyle}>Author Name</label>
              <Input
                placeholder="Your name"
                value={authorName}
                onChange={e => setAuthorName(e.target.value)}
                className={inputStyle}
                dir={isRTL ? "rtl" : "ltr"}
              />
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              <div>
                <label style={labelStyle}>Category</label>
                <Select value={blogCategory} onValueChange={setBlogCategory}>
                  <SelectTrigger className={`${inputStyle} focus:ring-0 text-sm`}>
                    <SelectValue placeholder="Pick one" />
                  </SelectTrigger>
                  <SelectContent
                    className="bg-[#1a1a1a] border-white/10 text-white max-h-48 overflow-y-auto"
                    style={{ zIndex: 99999 }}
                    position="popper"
                  >
                    {BLOG_CATEGORIES.map(cat => (
                      <SelectItem key={cat} value={cat} className="focus:bg-white/10 text-white text-sm">{cat}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label style={labelStyle}>Language</label>
                <Select value={bookLang} onValueChange={setBookLang}>
                  <SelectTrigger className={`${inputStyle} focus:ring-0 text-sm`}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent
                    className="bg-[#1a1a1a] border-white/10 text-white max-h-56 overflow-y-auto"
                    style={{ zIndex: 99999 }}
                    position="popper"
                  >
                    {BOOK_LANGUAGES.map(l => (
                      <SelectItem key={l.code} value={l.code} className="focus:bg-white/10 text-white text-sm">{l.nativeName}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <button
              type="submit"
              disabled={isCreating || !title.trim()}
              style={{ padding: "12px 0", borderRadius: 12, fontWeight: 700, fontSize: 14, cursor: isCreating || !title.trim() ? "not-allowed" : "pointer", opacity: isCreating || !title.trim() ? 0.5 : 1, background: "#EFEFEF", color: "#111111", border: "none", display: "flex", alignItems: "center", justifyContent: "center", gap: 7 }}
            >
              {isCreating ? <><Loader2 size={15} className="animate-spin" /> Creating…</> : <><PenLine size={15} /> Create Blog Post</>}
            </button>
          </form>
        )}

        <div style={{ height: 1, background: "linear-gradient(90deg,transparent,rgba(255,255,255,0.06) 50%,transparent)" }} />
      </div>
    </div>
  );

  return createPortal(modal, document.body);
}
