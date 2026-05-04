import { useState, useEffect } from "react";
import { useRoute, Link } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { sanitizeHtml } from "@/lib/sanitize";
import { ArrowLeft, Calendar, Clock, Eye, Heart, BookOpen, User } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { SEO } from "@/components/SEO";

const SF = "-apple-system,BlinkMacSystemFont,'SF Pro Text','Helvetica Neue',sans-serif";

function stripHtml(h: string) { return h.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim(); }
function wordCount(t: string) { return t.trim().split(/\s+/).filter(Boolean).length; }
function readTime(t: string) { return Math.max(1, Math.ceil(wordCount(t) / 200)); }

function parseArticleHtml(raw: string | null): string {
  if (!raw) return "";
  try {
    const parsed = JSON.parse(raw);
    if (parsed?.v === 2 && parsed.html) return parsed.html;
    if (typeof parsed === "string") return parsed;
  } catch {}
  return raw;
}

export default function ArticleView() {
  const [, params] = useRoute("/blog/:id");
  const articleId = Number(params?.id);
  const { toast } = useToast();

  const { data: article, isLoading } = useQuery<any>({
    queryKey: ["public-article", articleId],
    queryFn: async () => {
      const res = await fetch(`/api/public/books/${articleId}`);
      if (!res.ok) return null;
      return res.json();
    },
    enabled: !!articleId,
  });

  // Track view
  const incrementView = useMutation({
    mutationFn: () => fetch(`/api/public/books/${articleId}/view`, { method: "POST", credentials: "include" }),
  });
  const [viewed, setViewed] = useState(false);
  useEffect(() => {
    if (article && !viewed) { incrementView.mutate(); setViewed(true); }
  }, [article, viewed]);

  const html = parseArticleHtml(article?.articleContent);
  const plain = stripHtml(html);
  const wc = wordCount(plain);
  const rt = readTime(plain);
  const authorName = article?.authorName || article?.authorDisplayName || "Anonymous";
  const publishDate = article?.publishedAt ? new Date(article.publishedAt).toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" }) : "";
  const category = article?.articleCategory;
  const tags: string[] = article?.tags || [];
  const featuredImg = article?.featuredImage || article?.coverImage;

  if (isLoading) {
    return (
      <div style={{ minHeight: "100vh", background: "#080808", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ width: 24, height: 24, border: "2px solid rgba(255,255,255,0.1)", borderTopColor: "#fff", borderRadius: "50%", animation: "spin 0.6s linear infinite" }} />
      </div>
    );
  }

  if (!article || !article.isPublished) {
    return (
      <div style={{ minHeight: "100vh", background: "#080808", color: "#888", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 16, fontFamily: SF }}>
        <SEO title="Article not found" noindex />
        <BookOpen style={{ width: 48, height: 48, opacity: 0.3 }} />
        <p style={{ fontSize: 18, fontWeight: 600 }}>Article not found</p>
        <Link href="/blog"><button style={{ padding: "8px 20px", borderRadius: 8, border: "1px solid rgba(255,255,255,0.1)", background: "none", color: "#888", cursor: "pointer", fontSize: 13 }}>Back to Blog</button></Link>
      </div>
    );
  }

  const articleExcerpt = (() => {
    const raw = article.articleContent || article.summary || "";
    const text = stripHtml(raw).slice(0, 160).trim();
    return text || `An article by ${article.authorName || article.authorDisplayName || "a Plotzy author"}.`;
  })();

  return (
    <div style={{ minHeight: "100vh", background: "#080808", fontFamily: SF }}>
      <SEO
        title={article.title}
        description={articleExcerpt}
        ogType="article"
      />
      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>

      {/* Nav */}
      <header style={{ position: "sticky", top: 0, zIndex: 50, background: "rgba(8,8,8,0.95)", backdropFilter: "blur(20px)", borderBottom: "1px solid rgba(255,255,255,0.06)", padding: "0 16px", height: 48, display: "flex", alignItems: "center", gap: 10 }}>
        <Link href="/blog">
          <button style={{ display: "flex", alignItems: "center", gap: 5, background: "none", border: "none", cursor: "pointer", color: "rgba(255,255,255,0.5)", fontSize: 13, padding: "4px 6px", borderRadius: 6, flexShrink: 0 }}>
            <ArrowLeft size={15} /> <span className="hidden sm:inline">Blog</span>
          </button>
        </Link>
        <div style={{ width: 1, height: 14, background: "rgba(255,255,255,0.08)", flexShrink: 0 }} />
        <span style={{ fontSize: 13, color: "rgba(255,255,255,0.7)", fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", flex: 1, minWidth: 0 }}>
          {article.title}
        </span>
        <span style={{ fontSize: 11, color: "rgba(255,255,255,0.2)", flexShrink: 0 }}>{article.viewCount || 0} views</span>
      </header>

      {/* Featured Image */}
      {featuredImg && (
        <div style={{ maxWidth: 800, margin: "0 auto", padding: "32px 20px 0" }}>
          <img src={featuredImg} alt={article?.title || "Featured image"} className="article-featured-img" style={{ width: "100%", borderRadius: 12, objectFit: "cover", maxHeight: 400 }} />
        </div>
      )}

      {/* Article Header */}
      <div style={{ maxWidth: 700, margin: "0 auto", padding: "40px 20px 0" }}>
        {/* Category */}
        {category && (
          <span style={{ display: "inline-block", fontSize: 11, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: "#7c6af7", marginBottom: 16 }}>
            {category}
          </span>
        )}

        {/* Title */}
        <h1 style={{ fontSize: "clamp(2rem, 5vw, 3rem)", fontWeight: 800, color: "#fff", lineHeight: 1.15, letterSpacing: "-0.02em", marginBottom: 20 }}>
          {article.title}
        </h1>

        {/* Meta */}
        <div style={{ display: "flex", alignItems: "center", flexWrap: "wrap", gap: 16, marginBottom: 32, paddingBottom: 24, borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
          {/* Author */}
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            {article.authorAvatarUrl ? (
              <img src={article.authorAvatarUrl} alt={authorName} style={{ width: 32, height: 32, borderRadius: "50%", objectFit: "cover" }} />
            ) : (
              <div style={{ width: 32, height: 32, borderRadius: "50%", background: "rgba(124,106,247,0.15)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <User size={14} style={{ color: "#7c6af7" }} />
              </div>
            )}
            <span style={{ fontSize: 14, fontWeight: 600, color: "rgba(255,255,255,0.8)" }}>{authorName}</span>
          </div>

          <span style={{ color: "rgba(255,255,255,0.1)" }}>|</span>

          <div style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 12, color: "rgba(255,255,255,0.3)" }}>
            <Calendar size={12} /> {publishDate}
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 12, color: "rgba(255,255,255,0.3)" }}>
            <Clock size={12} /> {rt} min read
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 12, color: "rgba(255,255,255,0.3)" }}>
            <Eye size={12} /> {article.viewCount || 0} views
          </div>
        </div>
      </div>

      {/* Article Content */}
      <article style={{ maxWidth: 700, margin: "0 auto", padding: "0 20px 48px" }}>
        <div
          className="article-content"
          style={{ fontSize: 17, lineHeight: 1.85, color: "rgba(255,255,255,0.82)", fontFamily: "Georgia, 'Palatino Linotype', serif" }}
          dangerouslySetInnerHTML={{ __html: sanitizeHtml(html) }}
        />
      </article>

      {/* Tags */}
      {tags.length > 0 && (
        <div style={{ maxWidth: 700, margin: "0 auto", padding: "0 20px 32px", display: "flex", flexWrap: "wrap", gap: 8 }}>
          {tags.map((tag: string) => (
            <span key={tag} style={{ padding: "4px 12px", borderRadius: 20, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", fontSize: 12, color: "rgba(255,255,255,0.4)" }}>
              #{tag}
            </span>
          ))}
        </div>
      )}

      {/* Article content styles */}
      <style>{`
        .article-content p { margin: 0 0 1.4em; }
        .article-content h1 { font-size: 1.8em; font-weight: 800; margin: 1.5em 0 0.6em; color: #fff; }
        .article-content h2 { font-size: 1.5em; font-weight: 700; margin: 1.4em 0 0.5em; color: #fff; }
        .article-content h3 { font-size: 1.25em; font-weight: 700; margin: 1.3em 0 0.4em; color: rgba(255,255,255,0.9); }
        .article-content blockquote { border-left: 3px solid #7c6af7; margin: 1.5em 0; padding: 0.5em 0 0.5em 1.5em; color: rgba(255,255,255,0.6); font-style: italic; }
        .article-content ul { list-style: disc; padding-left: 1.8em; margin: 1em 0; }
        .article-content ol { list-style: decimal; padding-left: 1.8em; margin: 1em 0; }
        .article-content li { margin: 0.3em 0; }
        .article-content strong { font-weight: 700; color: #fff; }
        .article-content em { font-style: italic; }
        .article-content code { background: rgba(255,255,255,0.06); border-radius: 4px; padding: 2px 6px; font-family: 'Courier Prime', monospace; font-size: 0.9em; }
        .article-content pre { background: rgba(255,255,255,0.04); border-radius: 8px; padding: 16px; margin: 1.2em 0; overflow-x: auto; }
        .article-content hr { border: none; border-top: 1px solid rgba(255,255,255,0.08); margin: 2.5em 0; }
        .article-content a { color: #7c6af7; text-decoration: underline; }
        .article-content img { max-width: 100%; height: auto; border-radius: 8px; margin: 1.5em 0; }
      `}</style>
    </div>
  );
}
