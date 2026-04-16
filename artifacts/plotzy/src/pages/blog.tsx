import { useState } from "react";
import { Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { BookOpen, Calendar, Clock, Eye, ArrowLeft, Search, User } from "lucide-react";

const SF = "-apple-system,BlinkMacSystemFont,'SF Pro Text','Helvetica Neue',sans-serif";
const ACC = "#7c6af7";

const CATEGORIES = [
  "All", "Writing Tips", "Craft & Technique", "Publishing", "Reading",
  "Inspiration", "Author Interviews", "Book Reviews", "Industry News",
  "Self-Publishing", "Marketing", "Grammar & Style", "Research", "Other",
];

function stripHtml(h: string) { return h.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim(); }
function wordCount(t: string) { return t.trim().split(/\s+/).filter(Boolean).length; }
function readTime(t: string) { return Math.max(1, Math.ceil(wordCount(t) / 200)); }

function parseArticleText(raw: string | null): string {
  if (!raw) return "";
  try {
    const parsed = JSON.parse(raw);
    if (parsed?.v === 2 && parsed.html) return stripHtml(parsed.html);
    if (typeof parsed === "string") return stripHtml(parsed);
  } catch {}
  return stripHtml(raw);
}

export default function Blog() {
  const [category, setCategory] = useState("All");
  const [search, setSearch] = useState("");

  const { data: articles = [], isLoading } = useQuery<any[]>({
    queryKey: ["published-articles"],
    queryFn: async () => {
      const res = await fetch("/api/public/articles");
      if (!res.ok) return [];
      return res.json();
    },
  });

  const filtered = articles.filter(a => {
    if (category !== "All" && a.articleCategory !== category) return false;
    if (search) {
      const q = search.toLowerCase();
      return a.title?.toLowerCase().includes(q) || a.articleCategory?.toLowerCase().includes(q) ||
        (a.tags || []).some((t: string) => t.toLowerCase().includes(q));
    }
    return true;
  });

  return (
    <div style={{ minHeight: "100vh", background: "#080808", fontFamily: SF }}>

      {/* Header */}
      <header style={{ borderBottom: "1px solid rgba(255,255,255,0.06)", padding: "48px 20px 40px", textAlign: "center" }}>
        <Link href="/">
          <button style={{ position: "absolute", top: 16, left: 20, display: "flex", alignItems: "center", gap: 5, background: "none", border: "none", cursor: "pointer", color: "rgba(255,255,255,0.4)", fontSize: 13 }}>
            <ArrowLeft size={15} /> Home
          </button>
        </Link>
        <h1 style={{ fontSize: "clamp(2rem, 5vw, 3rem)", fontWeight: 800, color: "#fff", letterSpacing: "-0.03em", marginBottom: 8 }}>
          Blog
        </h1>
        <p style={{ fontSize: 15, color: "rgba(255,255,255,0.4)", maxWidth: 500, margin: "0 auto" }}>
          Writing tips, craft techniques, and stories from the Plotzy community
        </p>
      </header>

      {/* Filters */}
      <div style={{ maxWidth: 900, margin: "0 auto", padding: "24px 20px 0" }}>
        {/* Search */}
        <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 16px", background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 10, marginBottom: 20 }}>
          <Search size={15} style={{ color: "rgba(255,255,255,0.2)", flexShrink: 0 }} />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search articles..."
            style={{ flex: 1, background: "none", border: "none", outline: "none", color: "#fff", fontSize: 14, fontFamily: SF }} />
        </div>

        {/* Categories */}
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 32 }}>
          {CATEGORIES.map(cat => (
            <button key={cat} onClick={() => setCategory(cat)}
              style={{
                padding: "5px 14px", borderRadius: 20, fontSize: 12, fontWeight: 500, cursor: "pointer",
                background: category === cat ? ACC : "rgba(255,255,255,0.04)",
                color: category === cat ? "#fff" : "rgba(255,255,255,0.4)",
                border: category === cat ? "none" : "1px solid rgba(255,255,255,0.06)",
                transition: "all 0.15s",
              }}>
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Articles Grid */}
      <div style={{ maxWidth: 900, margin: "0 auto", padding: "0 20px 60px" }}>
        {isLoading ? (
          <div style={{ textAlign: "center", padding: 60 }}>
            <div style={{ width: 24, height: 24, border: "2px solid rgba(255,255,255,0.1)", borderTopColor: "#fff", borderRadius: "50%", animation: "spin 0.6s linear infinite", margin: "0 auto" }} />
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ textAlign: "center", padding: "80px 20px", color: "rgba(255,255,255,0.3)" }}>
            <BookOpen style={{ width: 40, height: 40, margin: "0 auto 12px", opacity: 0.3 }} />
            <p style={{ fontSize: 15 }}>{search ? "No articles match your search" : "No articles published yet"}</p>
          </div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 20 }}>
            {filtered.map((a: any) => {
              const plain = parseArticleText(a.articleContent);
              const excerpt = plain.length > 150 ? plain.slice(0, 150) + "..." : plain;
              const rt = readTime(plain);
              const img = a.featuredImage || a.coverImage;
              const authorName = a.authorName || a.authorDisplayName || "Anonymous";
              const date = a.publishedAt ? new Date(a.publishedAt).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" }) : "";

              return (
                <Link key={a.id} href={`/blog/${a.id}`}>
                  <div style={{
                    background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)",
                    borderRadius: 14, overflow: "hidden", cursor: "pointer",
                    transition: "border-color 0.2s, transform 0.2s",
                  }}
                    onMouseEnter={e => { e.currentTarget.style.borderColor = "rgba(124,106,247,0.3)"; e.currentTarget.style.transform = "translateY(-2px)"; }}
                    onMouseLeave={e => { e.currentTarget.style.borderColor = "rgba(255,255,255,0.06)"; e.currentTarget.style.transform = "translateY(0)"; }}
                  >
                    {/* Image */}
                    {img ? (
                      <div style={{ height: 160, overflow: "hidden" }}>
                        <img src={img} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                      </div>
                    ) : (
                      <div style={{ height: 100, background: "linear-gradient(135deg, rgba(124,106,247,0.08), rgba(124,106,247,0.02))", display: "flex", alignItems: "center", justifyContent: "center" }}>
                        <BookOpen size={24} style={{ color: "rgba(255,255,255,0.08)" }} />
                      </div>
                    )}

                    {/* Content */}
                    <div style={{ padding: "16px 18px 18px" }}>
                      {/* Category */}
                      {a.articleCategory && (
                        <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: ACC, marginBottom: 8, display: "block" }}>
                          {a.articleCategory}
                        </span>
                      )}

                      {/* Title */}
                      <h3 style={{ fontSize: 16, fontWeight: 700, color: "#fff", lineHeight: 1.3, marginBottom: 8, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
                        {a.title}
                      </h3>

                      {/* Excerpt */}
                      <p style={{ fontSize: 13, color: "rgba(255,255,255,0.35)", lineHeight: 1.5, marginBottom: 14, display: "-webkit-box", WebkitLineClamp: 3, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
                        {excerpt}
                      </p>

                      {/* Footer */}
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                          {a.authorAvatarUrl ? (
                            <img src={a.authorAvatarUrl} alt="" style={{ width: 20, height: 20, borderRadius: "50%", objectFit: "cover" }} />
                          ) : (
                            <div style={{ width: 20, height: 20, borderRadius: "50%", background: "rgba(124,106,247,0.12)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                              <User size={10} style={{ color: ACC }} />
                            </div>
                          )}
                          <span style={{ fontSize: 11, color: "rgba(255,255,255,0.4)", fontWeight: 500 }}>{authorName}</span>
                        </div>
                        <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 10, color: "rgba(255,255,255,0.2)" }}>
                          <span>{date}</span>
                          <span>{rt} min</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>

      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
