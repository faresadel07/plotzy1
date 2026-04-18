import { useState, useEffect, useMemo } from "react";
import { Layout } from "@/components/layout";
import { Play, X } from "lucide-react";

const SF = "-apple-system,BlinkMacSystemFont,'SF Pro Text','Helvetica Neue',sans-serif";
const BG = "#000";
const C2 = "#111";
const C3 = "#1a1a1a";
const B = "rgba(255,255,255,0.07)";
const T = "#fff";
const TS = "rgba(255,255,255,0.55)";
const TD = "rgba(255,255,255,0.25)";

const CATEGORIES = [
  { id: "all", label: "All" },
  { id: "getting-started", label: "Getting Started" },
  { id: "writing", label: "Writing" },
  { id: "ai-tools", label: "AI Tools" },
  { id: "publishing", label: "Publishing" },
  { id: "cover-design", label: "Cover Design" },
  { id: "community", label: "Community" },
  { id: "advanced", label: "Advanced" },
];

interface Tutorial {
  id: number;
  title: string;
  description: string;
  videoUrl: string;
  thumbnailUrl: string | null;
  category: string;
  duration: string;
  sortOrder: number;
  published: boolean;
}

function toEmbedUrl(url: string): string {
  // YouTube: watch?v=ID, youtu.be/ID, shorts/ID, live/ID
  let m = url.match(/(?:youtube\.com\/(?:watch\?v=|shorts\/|live\/)|youtu\.be\/)([A-Za-z0-9_-]+)/);
  if (m) return `https://www.youtube.com/embed/${m[1]}`;
  // YouTube: already embed
  if (url.includes("youtube.com/embed/")) return url;
  // Vimeo
  m = url.match(/vimeo\.com\/(\d+)/);
  if (m) return `https://player.vimeo.com/video/${m[1]}`;
  // Vimeo: already player
  if (url.includes("player.vimeo.com/video/")) return url;
  return url;
}

/* ─── Thumbnail component ─── */
function ThumbnailPlaceholder({ duration }: { duration: string }) {
  return (
    <div style={{
      width: "100%",
      aspectRatio: "16/9",
      borderRadius: "12px 12px 0 0",
      background: "linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      position: "relative",
      overflow: "hidden",
    }}>
      <div style={{
        width: 52,
        height: 52,
        borderRadius: "50%",
        background: "rgba(255,255,255,0.1)",
        border: "1px solid rgba(255,255,255,0.15)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        backdropFilter: "blur(4px)",
      }}>
        <Play size={20} color="rgba(255,255,255,0.7)" fill="rgba(255,255,255,0.7)" style={{ marginLeft: 3 }} />
      </div>
      {/* Duration badge */}
      <span style={{
        position: "absolute",
        top: 10,
        right: 10,
        background: "rgba(0,0,0,0.7)",
        backdropFilter: "blur(4px)",
        borderRadius: 6,
        padding: "3px 8px",
        fontSize: 11,
        fontWeight: 600,
        fontFamily: SF,
        color: T,
        letterSpacing: "0.02em",
      }}>
        {duration}
      </span>
    </div>
  );
}

/* ─── Tutorial Card ─── */
function TutorialCard({ tutorial, onClick }: { tutorial: Tutorial; onClick: () => void }) {
  const [hovered, setHovered] = useState(false);

  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background: C2,
        borderRadius: 12,
        border: `1px solid ${hovered ? "rgba(255,255,255,0.15)" : B}`,
        overflow: "hidden",
        cursor: "pointer",
        transition: "border-color 0.2s, transform 0.2s",
        transform: hovered ? "translateY(-2px)" : "none",
      }}
    >
      {/* Thumbnail */}
      {tutorial.thumbnailUrl ? (
        <div style={{ position: "relative", width: "100%", aspectRatio: "16/9", overflow: "hidden", borderRadius: "12px 12px 0 0" }}>
          <img
            src={tutorial.thumbnailUrl}
            alt={tutorial.title}
            style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
          />
          {/* Play overlay on hover */}
          <div style={{
            position: "absolute",
            inset: 0,
            background: hovered ? "rgba(0,0,0,0.4)" : "rgba(0,0,0,0)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            transition: "background 0.2s",
          }}>
            {hovered && (
              <div style={{
                width: 48,
                height: 48,
                borderRadius: "50%",
                background: "rgba(255,255,255,0.15)",
                border: "1px solid rgba(255,255,255,0.2)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                backdropFilter: "blur(4px)",
              }}>
                <Play size={18} color={T} fill={T} style={{ marginLeft: 2 }} />
              </div>
            )}
          </div>
          {/* Duration badge */}
          <span style={{
            position: "absolute",
            top: 10,
            right: 10,
            background: "rgba(0,0,0,0.7)",
            backdropFilter: "blur(4px)",
            borderRadius: 6,
            padding: "3px 8px",
            fontSize: 11,
            fontWeight: 600,
            fontFamily: SF,
            color: T,
          }}>
            {tutorial.duration}
          </span>
        </div>
      ) : (
        <ThumbnailPlaceholder duration={tutorial.duration} />
      )}

      {/* Info */}
      <div style={{ padding: "14px 16px 16px" }}>
        <div style={{
          fontFamily: SF,
          fontSize: 14,
          fontWeight: 600,
          color: T,
          marginBottom: 8,
          lineHeight: 1.3,
        }}>
          {tutorial.title}
        </div>
        {/* Category pill */}
        <span style={{
          display: "inline-block",
          background: "rgba(255,255,255,0.06)",
          border: `1px solid ${B}`,
          borderRadius: 20,
          padding: "2px 10px",
          fontSize: 11,
          fontWeight: 500,
          fontFamily: SF,
          color: TS,
          marginBottom: 8,
        }}>
          {CATEGORIES.find(c => c.id === tutorial.category)?.label || tutorial.category}
        </span>
        {tutorial.description && (
          <div style={{
            fontFamily: SF,
            fontSize: 12.5,
            color: TD,
            lineHeight: 1.55,
            display: "-webkit-box",
            WebkitLineClamp: 2,
            WebkitBoxOrient: "vertical" as any,
            overflow: "hidden",
          }}>
            {tutorial.description}
          </div>
        )}
      </div>
    </div>
  );
}

/* ─── Cinema Mode Modal ─── */
function CinemaModal({ tutorial, onClose }: { tutorial: Tutorial; onClose: () => void }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [onClose]);

  const embedUrl = toEmbedUrl(tutorial.videoUrl);

  return (
    <div
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 9999,
        background: "rgba(0,0,0,0.85)",
        backdropFilter: "blur(12px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 24,
      }}
    >
      <div style={{ width: "100%", maxWidth: 960, position: "relative" }}>
        {/* Close button */}
        <button
          onClick={onClose}
          style={{
            position: "absolute",
            top: -48,
            right: 0,
            background: "rgba(255,255,255,0.1)",
            border: "1px solid rgba(255,255,255,0.15)",
            borderRadius: "50%",
            width: 38,
            height: 38,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: "pointer",
            zIndex: 1,
            transition: "background 0.2s",
          }}
          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.2)"; }}
          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.1)"; }}
        >
          <X size={18} color={T} />
        </button>

        {/* Video */}
        <div style={{
          width: "100%",
          aspectRatio: "16/9",
          borderRadius: 14,
          overflow: "hidden",
          background: "#000",
          border: `1px solid ${B}`,
        }}>
          <iframe
            src={embedUrl}
            title={tutorial.title}
            style={{ width: "100%", height: "100%", border: "none" }}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            allowFullScreen
          />
        </div>

        {/* Info below video */}
        <div style={{ marginTop: 20 }}>
          <h2 style={{
            fontFamily: SF,
            fontSize: 20,
            fontWeight: 700,
            color: T,
            marginBottom: 8,
            letterSpacing: "-0.02em",
          }}>
            {tutorial.title}
          </h2>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
            <span style={{
              background: "rgba(255,255,255,0.06)",
              border: `1px solid ${B}`,
              borderRadius: 20,
              padding: "3px 12px",
              fontSize: 11,
              fontWeight: 500,
              fontFamily: SF,
              color: TS,
            }}>
              {CATEGORIES.find(c => c.id === tutorial.category)?.label || tutorial.category}
            </span>
            <span style={{ fontSize: 12, fontFamily: SF, color: TD }}>
              {tutorial.duration}
            </span>
          </div>
          {tutorial.description && (
            <p style={{
              fontFamily: SF,
              fontSize: 14,
              color: TS,
              lineHeight: 1.7,
              margin: 0,
              maxWidth: 700,
            }}>
              {tutorial.description}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

/* ─── Main Page ─── */
export default function TutorialPage() {
  const [tutorials, setTutorials] = useState<Tutorial[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState("all");
  const [selectedTutorial, setSelectedTutorial] = useState<Tutorial | null>(null);

  useEffect(() => {
    fetch("/api/tutorials")
      .then(r => r.json())
      .then((data: Tutorial[]) => {
        setTutorials(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const filtered = useMemo(() => {
    if (activeCategory === "all") return tutorials;
    return tutorials.filter(t => t.category === activeCategory);
  }, [tutorials, activeCategory]);

  return (
    <Layout isLanding darkNav>
      <div style={{ fontFamily: SF, background: BG, minHeight: "100vh" }}>

        {/* ─── Hero ─── */}
        <div style={{
          borderBottom: `1px solid ${B}`,
          padding: "56px 24px 36px",
          textAlign: "center",
        }}>
          <h1 style={{
            fontSize: "clamp(28px, 4vw, 42px)",
            fontWeight: 700,
            color: T,
            letterSpacing: "-0.03em",
            lineHeight: 1.15,
            margin: "0 auto 14px",
          }}>
            Learning Center
          </h1>
          <p style={{
            fontSize: 15,
            color: TS,
            maxWidth: 500,
            margin: "0 auto 28px",
            lineHeight: 1.7,
          }}>
            Master every feature of Plotzy with step-by-step video guides
          </p>

          {/* Category filter pills */}
          <div style={{
            display: "flex",
            flexWrap: "wrap",
            justifyContent: "center",
            gap: 8,
            maxWidth: 700,
            margin: "0 auto",
          }}>
            {CATEGORIES.map(cat => {
              const isActive = activeCategory === cat.id;
              return (
                <button
                  key={cat.id}
                  onClick={() => setActiveCategory(cat.id)}
                  style={{
                    fontFamily: SF,
                    fontSize: 13,
                    fontWeight: isActive ? 600 : 400,
                    color: isActive ? T : TS,
                    background: isActive ? "rgba(255,255,255,0.12)" : "rgba(255,255,255,0.04)",
                    border: `1px solid ${isActive ? "rgba(255,255,255,0.2)" : B}`,
                    borderRadius: 20,
                    padding: "6px 16px",
                    cursor: "pointer",
                    transition: "all 0.15s",
                  }}
                >
                  {cat.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* ─── Content ─── */}
        <div style={{ maxWidth: 1100, margin: "0 auto", padding: "28px clamp(14px, 4vw, 28px) 60px" }}>

          {loading ? (
            <div style={{ textAlign: "center", padding: "80px 0", color: TD }}>
              Loading tutorials...
            </div>
          ) : filtered.length === 0 && tutorials.length === 0 ? (
            /* Empty state */
            <div style={{
              textAlign: "center",
              padding: "80px 24px",
              background: C2,
              borderRadius: 16,
              border: `1px solid ${B}`,
            }}>
              <div style={{
                width: 56,
                height: 56,
                borderRadius: 14,
                background: C3,
                border: `1px solid ${B}`,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                margin: "0 auto 20px",
              }}>
                <Play size={24} color={TD} />
              </div>
              <h3 style={{
                fontFamily: SF,
                fontSize: 18,
                fontWeight: 600,
                color: T,
                marginBottom: 8,
              }}>
                No tutorials yet
              </h3>
              <p style={{
                fontFamily: SF,
                fontSize: 14,
                color: TS,
                lineHeight: 1.6,
                maxWidth: 400,
                margin: "0 auto",
              }}>
                Check back soon — we're creating guides to help you master Plotzy
              </p>
            </div>
          ) : filtered.length === 0 ? (
            /* No results for category filter */
            <div style={{
              textAlign: "center",
              padding: "60px 24px",
              color: TD,
              fontSize: 14,
            }}>
              No tutorials in this category yet.
            </div>
          ) : (
            /* Tutorial grid */
            <>
              <style>{`
                .plotzy-tutorial-grid {
                  display: grid;
                  grid-template-columns: repeat(3, 1fr);
                  gap: 20px;
                }
                @media (max-width: 900px) {
                  .plotzy-tutorial-grid { grid-template-columns: repeat(2, 1fr) !important; }
                }
                @media (max-width: 580px) {
                  .plotzy-tutorial-grid { grid-template-columns: 1fr !important; }
                }
              `}</style>
              <div className="plotzy-tutorial-grid">
                {filtered.map(t => (
                  <TutorialCard
                    key={t.id}
                    tutorial={t}
                    onClick={() => setSelectedTutorial(t)}
                  />
                ))}
              </div>
            </>
          )}
        </div>

        {/* Cinema modal */}
        {selectedTutorial && (
          <CinemaModal
            tutorial={selectedTutorial}
            onClose={() => setSelectedTutorial(null)}
          />
        )}
      </div>
    </Layout>
  );
}
