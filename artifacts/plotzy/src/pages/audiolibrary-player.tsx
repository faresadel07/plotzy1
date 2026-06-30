// /audiolibrary/:id — the player page for one audiobook.
//
// Custom HTML5 audio player that streams chapter MP3s directly from
// the source CDN (LibriVox or Internet Archive). No file lives on
// Plotzy servers.
//
// Features:
//   - Play / pause, seek, volume, playback rate (0.75x to 2x)
//   - Sleep timer (5, 15, 30, 60 minutes)
//   - Cross-device resume via /api/audiolibrary/progress/:bookId
//   - Skip back 15s / forward 30s (industry standard)
//   - Chapter list with current chapter highlighted
//   - Keyboard shortcuts: Space play/pause, J back 15s, L forward 30s

import { useEffect, useRef, useState, useCallback } from "react";
import { useRoute, Link } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Layout } from "@/components/layout";
import { SEO } from "@/components/SEO";
import { useLanguage } from "@/contexts/language-context";
import {
  ArrowLeft, ArrowRight, Play, Pause, SkipBack, SkipForward,
  Volume2, VolumeX, Moon, ChevronUp, ChevronDown, BookAudio,
  Loader2, ExternalLink, Gauge,
} from "lucide-react";

const SF = '-apple-system, BlinkMacSystemFont, "SF Pro Display", "SF Pro Text", "Helvetica Neue", sans-serif';
const BG = "#0a0a0a";
const CARD = "rgba(255,255,255,0.04)";
const CARD_HOVER = "rgba(255,255,255,0.07)";
const BORDER = "rgba(255,255,255,0.08)";
const BORDER_STRONG = "rgba(255,255,255,0.18)";
const TEXT = "#f0efe8";
const MUTED = "rgba(255,255,255,0.55)";
const MUTED2 = "rgba(255,255,255,0.35)";
const ACCENT = "#7c6af7";

interface Chapter {
  title: string;
  audioUrl: string;
  duration: number;
  sectionNumber: number;
}

interface AudioBookDetail {
  id: number;
  source: "librivox" | "archive";
  externalId: string;
  title: string;
  author: string | null;
  language: string | null;
  description: string | null;
  coverUrl: string | null;
  totalDuration: number | null;
  chapters: Chapter[];
  sourceUrl: string | null;
  genres: string[];
}

interface Progress {
  chapterIndex: number;
  positionSeconds: number;
  playbackRate: number;
}

const PLAYBACK_RATES = [0.75, 1, 1.25, 1.5, 1.75, 2];
const SLEEP_OPTIONS = [5, 15, 30, 45, 60];

function fmtTime(seconds: number): string {
  if (!isFinite(seconds) || seconds < 0) return "0:00";
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  if (h > 0) return `${h}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export default function AudiolibraryPlayerPage() {
  const { lang, isRTL } = useLanguage();
  const ar = lang === "ar";
  const [, params] = useRoute("/audiolibrary/:id");
  const bookId = params?.id ? Number(params.id) : 0;

  // ── Audio state ──
  const audioRef = useRef<HTMLAudioElement>(null);
  const [chapterIndex, setChapterIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [rate, setRate] = useState(1);
  const [showChapters, setShowChapters] = useState(false);
  const [showRateMenu, setShowRateMenu] = useState(false);
  const [showSleepMenu, setShowSleepMenu] = useState(false);
  const [sleepUntil, setSleepUntil] = useState<number | null>(null); // epoch ms
  const [loadedProgress, setLoadedProgress] = useState(false);

  // ── Data ──
  const { data: book, isLoading } = useQuery<AudioBookDetail>({
    queryKey: [`/api/audiolibrary/${bookId}`],
    queryFn: async () => {
      const r = await fetch(`/api/audiolibrary/${bookId}`, { credentials: "include" });
      if (!r.ok) throw new Error("Failed to load audiobook");
      return r.json();
    },
    enabled: bookId > 0,
  });
  const { data: progress } = useQuery<Progress>({
    queryKey: [`/api/audiolibrary/progress/${bookId}`],
    queryFn: async () => {
      const r = await fetch(`/api/audiolibrary/progress/${bookId}`, { credentials: "include" });
      if (!r.ok) return { chapterIndex: 0, positionSeconds: 0, playbackRate: 1 };
      return r.json();
    },
    enabled: bookId > 0,
  });

  // Restore listening position once both book + progress have arrived.
  useEffect(() => {
    if (!book || !progress || loadedProgress) return;
    const idx = Math.min(progress.chapterIndex, book.chapters.length - 1);
    setChapterIndex(Math.max(0, idx));
    setRate(progress.playbackRate || 1);
    // Wait one tick so the <audio> element has the right src before
    // we set its currentTime.
    requestAnimationFrame(() => {
      const a = audioRef.current;
      if (a) {
        a.currentTime = progress.positionSeconds || 0;
        setCurrentTime(progress.positionSeconds || 0);
      }
      setLoadedProgress(true);
    });
  }, [book, progress, loadedProgress]);

  const saveProgress = useMutation({
    mutationFn: async (input: { chapterIndex: number; positionSeconds: number; playbackRate: number }) => {
      await fetch(`/api/audiolibrary/progress/${bookId}`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      });
    },
  });

  // Persist progress every 10 seconds while playing. Cheap to do
  // from the front-end since the endpoint silently no-ops for
  // unauthenticated users.
  useEffect(() => {
    if (!isPlaying || !book) return;
    const id = setInterval(() => {
      saveProgress.mutate({
        chapterIndex,
        positionSeconds: Math.floor(currentTime),
        playbackRate: rate,
      });
    }, 10_000);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isPlaying, chapterIndex, currentTime, rate, book?.id]);

  // ── Player handlers ──
  const togglePlay = useCallback(() => {
    const a = audioRef.current;
    if (!a) return;
    if (a.paused) {
      a.play().catch(() => setIsPlaying(false));
    } else {
      a.pause();
    }
  }, []);
  const seekBy = useCallback((delta: number) => {
    const a = audioRef.current;
    if (!a) return;
    a.currentTime = Math.max(0, Math.min(a.duration || Infinity, a.currentTime + delta));
  }, []);
  const goToChapter = useCallback((i: number) => {
    if (!book) return;
    setChapterIndex(Math.max(0, Math.min(book.chapters.length - 1, i)));
    setCurrentTime(0);
  }, [book]);

  // Auto-advance to the next chapter on end-of-track.
  const handleEnded = useCallback(() => {
    if (!book) return;
    if (chapterIndex < book.chapters.length - 1) {
      goToChapter(chapterIndex + 1);
      // Let the new src load, then resume playback.
      requestAnimationFrame(() => audioRef.current?.play().catch(() => {}));
    } else {
      setIsPlaying(false);
    }
  }, [book, chapterIndex, goToChapter]);

  // Keyboard shortcuts.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement)?.tagName === "INPUT") return;
      if (e.code === "Space")  { e.preventDefault(); togglePlay(); }
      else if (e.key === "j")  { seekBy(-15); }
      else if (e.key === "l")  { seekBy(30); }
      else if (e.key === "k")  { e.preventDefault(); togglePlay(); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [togglePlay, seekBy]);

  // Sleep timer tick.
  useEffect(() => {
    if (!sleepUntil) return;
    const id = setInterval(() => {
      if (Date.now() >= sleepUntil) {
        audioRef.current?.pause();
        setSleepUntil(null);
      }
    }, 1_000);
    return () => clearInterval(id);
  }, [sleepUntil]);

  // ── Render ──
  if (!bookId) {
    return (
      <Layout>
        <div style={{ padding: 40, textAlign: "center", color: MUTED, fontFamily: SF }}>Invalid book id</div>
      </Layout>
    );
  }
  if (isLoading || !book) {
    return (
      <Layout>
        <div style={{ background: BG, color: TEXT, minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: SF }}>
          <Loader2 size={28} className="animate-spin" style={{ color: MUTED }} />
        </div>
      </Layout>
    );
  }

  const chapter = book.chapters[chapterIndex];
  const progressPct = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <Layout>
      <SEO title={`${book.title} | ${ar ? "المكتبة الصوتيّة" : "Audio Library"}`} description={book.description ?? undefined} />
      <div dir={isRTL ? "rtl" : "ltr"} style={{ background: BG, color: TEXT, fontFamily: SF, minHeight: "100vh" }}>
        <audio
          ref={audioRef}
          src={chapter?.audioUrl}
          preload="metadata"
          onPlay={() => setIsPlaying(true)}
          onPause={() => setIsPlaying(false)}
          onTimeUpdate={(e) => setCurrentTime((e.target as HTMLAudioElement).currentTime)}
          onLoadedMetadata={(e) => setDuration((e.target as HTMLAudioElement).duration)}
          onEnded={handleEnded}
          onVolumeChange={(e) => {
            const a = e.target as HTMLAudioElement;
            setVolume(a.volume);
            setIsMuted(a.muted);
          }}
        />

        <div style={{ maxWidth: 1100, margin: "0 auto", padding: "24px 20px 80px" }}>
          {/* Back link */}
          <Link
            href="/audiolibrary"
            style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 12.5, color: MUTED, textDecoration: "none", marginBottom: 22 }}
          >
            {isRTL ? <ArrowRight size={13} /> : <ArrowLeft size={13} />}
            {ar ? "المكتبة الصوتيّة" : "Audio Library"}
          </Link>

          {/* ── Top: cover + meta + transport ── */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "260px 1fr",
              gap: 28,
              marginBottom: 32,
              alignItems: "start",
            }}
            className="audio-player-top"
          >
            <style>{`
              @media (max-width: 720px) {
                .audio-player-top {
                  grid-template-columns: 1fr !important;
                  justify-items: center;
                  text-align: center;
                }
                .audio-player-top > div:first-child {
                  max-width: 260px;
                }
              }
            `}</style>
            {/* Cover */}
            <div
              style={{
                width: "100%",
                aspectRatio: "1 / 1",
                borderRadius: 16,
                overflow: "hidden",
                background: "linear-gradient(135deg, rgba(124,108,247,0.18), rgba(56,132,255,0.12))",
                boxShadow: "0 18px 60px rgba(0,0,0,0.55)",
                border: `1px solid ${BORDER}`,
                position: "relative",
              }}
            >
              {book.coverUrl ? (
                <img
                  src={book.coverUrl}
                  alt={book.title}
                  style={{ width: "100%", height: "100%", objectFit: "cover" }}
                  onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }}
                />
              ) : (
                <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <BookAudio size={64} color="rgba(255,255,255,0.4)" />
                </div>
              )}
            </div>

            {/* Meta + transport */}
            <div>
              <div
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6,
                  fontSize: 10.5,
                  fontWeight: 700,
                  color: ACCENT,
                  letterSpacing: "0.1em",
                  textTransform: "uppercase",
                  marginBottom: 8,
                }}
              >
                <BookAudio size={11} />
                {book.source}
              </div>
              <h1
                style={{
                  fontSize: "clamp(24px, 3.5vw, 36px)",
                  fontWeight: 800,
                  letterSpacing: "-0.025em",
                  lineHeight: 1.15,
                  margin: "0 0 8px",
                }}
              >
                {book.title}
              </h1>
              <div style={{ fontSize: 14, color: MUTED, marginBottom: 22 }}>
                {book.author || (ar ? "مؤلّف مجهول" : "Unknown author")}
                {book.totalDuration ? (
                  <>
                    <span style={{ margin: "0 8px", opacity: 0.4 }}>·</span>
                    <span style={{ fontVariantNumeric: "tabular-nums" }}>
                      {fmtTime(book.totalDuration)}
                    </span>
                  </>
                ) : null}
              </div>

              {/* Now playing chapter */}
              <div
                style={{
                  background: CARD,
                  border: `1px solid ${BORDER}`,
                  borderRadius: 14,
                  padding: "14px 16px",
                  marginBottom: 14,
                }}
              >
                <div style={{ fontSize: 10.5, fontWeight: 700, color: MUTED2, letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 4 }}>
                  {ar ? "الآن" : "Now Playing"}
                </div>
                <div
                  style={{
                    fontSize: 14,
                    fontWeight: 600,
                    color: TEXT,
                    letterSpacing: "-0.005em",
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                  }}
                >
                  {chapter?.title || "—"}
                </div>
                <div style={{ fontSize: 11.5, color: MUTED, marginTop: 2 }}>
                  {ar ? "الفصل" : "Chapter"} {chapterIndex + 1} / {book.chapters.length}
                </div>
              </div>

              {/* Progress bar */}
              <div style={{ marginBottom: 12 }}>
                <input
                  type="range"
                  min={0}
                  max={duration || 0}
                  value={currentTime}
                  step={1}
                  onChange={(e) => {
                    const a = audioRef.current;
                    if (a) a.currentTime = Number(e.target.value);
                  }}
                  style={{
                    width: "100%",
                    height: 6,
                    appearance: "none",
                    background: `linear-gradient(to right, ${ACCENT} 0%, ${ACCENT} ${progressPct}%, rgba(255,255,255,0.10) ${progressPct}%, rgba(255,255,255,0.10) 100%)`,
                    borderRadius: 999,
                    cursor: "pointer",
                    outline: "none",
                  }}
                />
                <div style={{ display: "flex", justifyContent: "space-between", marginTop: 6, fontSize: 11, color: MUTED, fontVariantNumeric: "tabular-nums" }}>
                  <span>{fmtTime(currentTime)}</span>
                  <span>{fmtTime(duration)}</span>
                </div>
              </div>

              {/* Transport row */}
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <IconBtn onClick={() => goToChapter(chapterIndex - 1)} disabled={chapterIndex === 0} title={ar ? "الفصل السابق" : "Previous chapter"} icon={<SkipBack size={15} />} />
                <IconBtn onClick={() => seekBy(-15)} title={ar ? "خلف 15 ثانية" : "Back 15s"} icon={<RewindIcon />} />
                <PlayBtn onClick={togglePlay} isPlaying={isPlaying} />
                <IconBtn onClick={() => seekBy(30)} title={ar ? "أمام 30 ثانية" : "Forward 30s"} icon={<FastForwardIcon />} />
                <IconBtn onClick={() => goToChapter(chapterIndex + 1)} disabled={chapterIndex >= book.chapters.length - 1} title={ar ? "الفصل التالي" : "Next chapter"} icon={<SkipForward size={15} />} />

                <div style={{ width: 1, height: 28, background: BORDER, margin: "0 6px" }} />

                {/* Volume */}
                <IconBtn
                  onClick={() => {
                    const a = audioRef.current;
                    if (a) a.muted = !a.muted;
                  }}
                  title={ar ? "كتم الصوت" : "Mute"}
                  icon={isMuted || volume === 0 ? <VolumeX size={15} /> : <Volume2 size={15} />}
                />
                <input
                  type="range"
                  min={0}
                  max={1}
                  step={0.05}
                  value={isMuted ? 0 : volume}
                  onChange={(e) => {
                    const a = audioRef.current;
                    if (a) { a.volume = Number(e.target.value); a.muted = false; }
                  }}
                  style={{ width: 90, accentColor: ACCENT }}
                />

                <div style={{ flex: 1 }} />

                {/* Playback rate */}
                <div style={{ position: "relative" }}>
                  <button
                    onClick={() => { setShowRateMenu((v) => !v); setShowSleepMenu(false); }}
                    style={menuBtn}
                  >
                    <Gauge size={13} />
                    {rate}x
                  </button>
                  {showRateMenu && (
                    <Menu onClose={() => setShowRateMenu(false)}>
                      {PLAYBACK_RATES.map((r) => (
                        <MenuItem
                          key={r}
                          active={rate === r}
                          onClick={() => {
                            const a = audioRef.current;
                            if (a) a.playbackRate = r;
                            setRate(r);
                            setShowRateMenu(false);
                          }}
                          label={`${r}x`}
                        />
                      ))}
                    </Menu>
                  )}
                </div>

                {/* Sleep timer */}
                <div style={{ position: "relative" }}>
                  <button
                    onClick={() => { setShowSleepMenu((v) => !v); setShowRateMenu(false); }}
                    style={menuBtn}
                  >
                    <Moon size={13} />
                    {sleepUntil
                      ? `${Math.max(0, Math.ceil((sleepUntil - Date.now()) / 60_000))}m`
                      : (ar ? "نوم" : "Sleep")}
                  </button>
                  {showSleepMenu && (
                    <Menu onClose={() => setShowSleepMenu(false)}>
                      <MenuItem
                        active={!sleepUntil}
                        onClick={() => { setSleepUntil(null); setShowSleepMenu(false); }}
                        label={ar ? "إيقاف" : "Off"}
                      />
                      {SLEEP_OPTIONS.map((min) => (
                        <MenuItem
                          key={min}
                          active={false}
                          onClick={() => { setSleepUntil(Date.now() + min * 60_000); setShowSleepMenu(false); }}
                          label={ar ? `${min} د` : `${min}m`}
                        />
                      ))}
                    </Menu>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* ── Description ── */}
          {book.description && (
            <section style={{ marginBottom: 30 }}>
              <h2 style={{ fontSize: 13, fontWeight: 700, color: MUTED, textTransform: "uppercase", letterSpacing: "0.1em", margin: "0 0 10px" }}>
                {ar ? "عن الكتاب" : "About this audiobook"}
              </h2>
              <p style={{ fontSize: 14.5, color: TEXT, lineHeight: 1.75, opacity: 0.85, margin: 0, maxWidth: 760 }}>
                {book.description}
              </p>
              {book.sourceUrl && (
                <a
                  href={book.sourceUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ display: "inline-flex", alignItems: "center", gap: 5, marginTop: 12, fontSize: 12, color: MUTED, textDecoration: "underline" }}
                >
                  {ar ? "افتح على المصدر" : "View at source"} <ExternalLink size={11} />
                </a>
              )}
            </section>
          )}

          {/* ── Chapter list ── */}
          <section>
            <button
              onClick={() => setShowChapters((v) => !v)}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                width: "100%",
                background: "transparent",
                border: "none",
                padding: 0,
                cursor: "pointer",
                color: TEXT,
                marginBottom: 14,
              }}
            >
              <h2 style={{ fontSize: 13, fontWeight: 700, color: MUTED, textTransform: "uppercase", letterSpacing: "0.1em", margin: 0 }}>
                {ar ? `الفصول (${book.chapters.length})` : `Chapters (${book.chapters.length})`}
              </h2>
              {showChapters ? <ChevronUp size={16} color={MUTED} /> : <ChevronDown size={16} color={MUTED} />}
            </button>
            {showChapters && (
              <div
                style={{
                  background: CARD,
                  border: `1px solid ${BORDER}`,
                  borderRadius: 14,
                  overflow: "hidden",
                  maxHeight: 420,
                  overflowY: "auto",
                }}
              >
                {book.chapters.map((c, i) => {
                  const active = i === chapterIndex;
                  return (
                    <button
                      key={i}
                      onClick={() => {
                        goToChapter(i);
                        requestAnimationFrame(() => audioRef.current?.play().catch(() => {}));
                      }}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 14,
                        width: "100%",
                        padding: "12px 18px",
                        background: active ? "rgba(124,108,247,0.08)" : "transparent",
                        border: "none",
                        borderInlineStart: active ? `3px solid ${ACCENT}` : `3px solid transparent`,
                        cursor: "pointer",
                        color: active ? TEXT : MUTED,
                        textAlign: isRTL ? "right" : "left",
                        fontFamily: SF,
                        transition: "background 140ms",
                        borderBottom: `1px solid ${BORDER}`,
                      }}
                      onMouseEnter={(e) => { if (!active) (e.currentTarget as HTMLButtonElement).style.background = CARD_HOVER; }}
                      onMouseLeave={(e) => { if (!active) (e.currentTarget as HTMLButtonElement).style.background = "transparent"; }}
                    >
                      <span style={{ minWidth: 22, fontSize: 11.5, color: MUTED2, fontVariantNumeric: "tabular-nums" }}>
                        {String(i + 1).padStart(2, "0")}
                      </span>
                      <span style={{ flex: 1, fontSize: 13, fontWeight: active ? 700 : 500, lineHeight: 1.4 }}>
                        {c.title}
                      </span>
                      <span style={{ fontSize: 11, color: MUTED, fontVariantNumeric: "tabular-nums" }}>
                        {fmtTime(c.duration)}
                      </span>
                      {active && isPlaying && (
                        <div style={{ display: "flex", gap: 2 }}>
                          <Bar /><Bar delay={0.15} /><Bar delay={0.3} />
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </section>
        </div>

        <style>{`
          @keyframes audiobar {
            0%, 100% { height: 3px; }
            50% { height: 12px; }
          }
          input[type="range"]::-webkit-slider-thumb {
            -webkit-appearance: none;
            appearance: none;
            width: 14px; height: 14px; border-radius: 50%;
            background: #fff; cursor: pointer;
            box-shadow: 0 1px 3px rgba(0,0,0,0.35);
          }
          input[type="range"]::-moz-range-thumb {
            width: 14px; height: 14px; border-radius: 50%;
            background: #fff; cursor: pointer; border: none;
            box-shadow: 0 1px 3px rgba(0,0,0,0.35);
          }
        `}</style>
      </div>
    </Layout>
  );
}

// ─── Atoms ─────────────────────────────────────────────────────────

function IconBtn({ onClick, disabled, title, icon }: { onClick: () => void; disabled?: boolean; title: string; icon: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      aria-label={title}
      title={title}
      style={{
        width: 36, height: 36, borderRadius: 10,
        background: "transparent",
        border: `1px solid ${BORDER}`,
        color: disabled ? MUTED2 : TEXT,
        cursor: disabled ? "not-allowed" : "pointer",
        opacity: disabled ? 0.4 : 1,
        display: "inline-flex", alignItems: "center", justifyContent: "center",
        fontFamily: SF,
        transition: "all 140ms",
      }}
      onMouseEnter={(e) => { if (!disabled) e.currentTarget.style.background = CARD_HOVER; }}
      onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
    >
      {icon}
    </button>
  );
}

function PlayBtn({ onClick, isPlaying }: { onClick: () => void; isPlaying: boolean }) {
  return (
    <button
      onClick={onClick}
      aria-label={isPlaying ? "Pause" : "Play"}
      style={{
        width: 50, height: 50, borderRadius: "50%",
        background: TEXT,
        border: "none",
        color: "#000",
        cursor: "pointer",
        display: "inline-flex", alignItems: "center", justifyContent: "center",
        boxShadow: "0 4px 18px rgba(255,255,255,0.18)",
        transition: "transform 140ms",
      }}
      onMouseEnter={(e) => (e.currentTarget.style.transform = "scale(1.05)")}
      onMouseLeave={(e) => (e.currentTarget.style.transform = "scale(1)")}
    >
      {isPlaying ? <Pause size={20} fill="#000" /> : <Play size={20} fill="#000" style={{ marginInlineStart: 2 }} />}
    </button>
  );
}

const menuBtn: React.CSSProperties = {
  display: "inline-flex", alignItems: "center", gap: 5,
  padding: "7px 10px", borderRadius: 9,
  background: CARD, border: `1px solid ${BORDER}`,
  color: MUTED, fontFamily: SF, fontSize: 12, fontWeight: 600,
  cursor: "pointer",
  fontVariantNumeric: "tabular-nums",
};

function Menu({ children, onClose }: { children: React.ReactNode; onClose: () => void }) {
  return (
    <>
      <div onClick={onClose} style={{ position: "fixed", inset: 0, zIndex: 40 }} />
      <div
        style={{
          position: "absolute",
          top: "calc(100% + 4px)",
          insetInlineEnd: 0,
          minWidth: 110,
          background: "#1a1a1c",
          border: `1px solid ${BORDER_STRONG}`,
          borderRadius: 10,
          padding: 4,
          zIndex: 50,
          boxShadow: "0 16px 40px rgba(0,0,0,0.55)",
        }}
      >
        {children}
      </div>
    </>
  );
}

function MenuItem({ active, onClick, label }: { active: boolean; onClick: () => void; label: string }) {
  return (
    <button
      onClick={onClick}
      style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        width: "100%", padding: "8px 12px",
        background: active ? "rgba(255,255,255,0.06)" : "transparent",
        border: "none", borderRadius: 6,
        color: TEXT,
        cursor: "pointer", fontFamily: SF, fontSize: 12.5, fontWeight: 600,
        fontVariantNumeric: "tabular-nums",
      }}
      onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(255,255,255,0.08)")}
      onMouseLeave={(e) => (e.currentTarget.style.background = active ? "rgba(255,255,255,0.06)" : "transparent")}
    >
      {label}
    </button>
  );
}

function Bar({ delay = 0 }: { delay?: number }) {
  return (
    <span
      style={{
        display: "inline-block",
        width: 2,
        background: ACCENT,
        borderRadius: 1,
        animation: `audiobar 0.9s ease-in-out ${delay}s infinite`,
      }}
    />
  );
}

// Custom skip glyphs that show "15" / "30" inside the SVG so the
// writer can see exactly how far each button jumps without learning a
// shortcut.
function RewindIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 12a9 9 0 1 0 3-6.7L3 8" />
      <path d="M3 3v5h5" />
      <text x="12" y="15" textAnchor="middle" fontSize="6" fill="currentColor" stroke="none" fontWeight="700">15</text>
    </svg>
  );
}
function FastForwardIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 12a9 9 0 1 1-3-6.7L21 8" />
      <path d="M21 3v5h-5" />
      <text x="12" y="15" textAnchor="middle" fontSize="6" fill="currentColor" stroke="none" fontWeight="700">30</text>
    </svg>
  );
}
