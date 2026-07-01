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
  Loader2, ExternalLink, Gauge, Bookmark, BookmarkPlus, Trash2,
  BookOpen, X,
  Star, Download, Rss, Users, Calendar, Info, Smartphone,
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
const ACCENT = "#ffffff";
// Soft tinted washes derived from ACCENT — kept as vars so we don't
// scatter the same `rgba(255,255,255,...)` literals across the file.
const ACCENT_WASH_STRONG = "rgba(255,255,255,0.12)";
const ACCENT_WASH_MEDIUM = "rgba(255,255,255,0.08)";
const ACCENT_WASH_SOFT   = "rgba(255,255,255,0.06)";
const ACCENT_WASH_FAINT  = "rgba(255,255,255,0.04)";

interface Chapter {
  title: string;
  audioUrl: string;
  duration: number;
  sectionNumber: number;
  readers?: { id: string; name: string }[];
}

interface Reader { id: string; name: string; count: number }
interface Translator { name: string }
interface Review {
  stars: number;
  title: string;
  author: string;
  body: string;
  date: string | null;
}

interface AudioBookDetail {
  source: "librivox" | "archive";
  externalId: string;
  bookKey: string;
  title: string;
  author: string | null;
  language: string | null;
  description: string | null;
  coverUrl: string | null;
  totalDuration: number | null;
  chapters: Chapter[];
  sourceUrl: string | null;
  genres: string[];
  // Extras surfaced from LibriVox + Archive.org — all optional so the
  // page still renders if any field is missing on an older recording.
  wikipediaUrl?: string | null;
  archiveUrl?: string | null;
  zipDownloadUrl?: string | null;
  rssUrl?: string | null;
  textSourceUrl?: string | null;
  copyrightYear?: string | null;
  translators?: Translator[];
  readers?: Reader[];
  avgRating?: number | null;
  downloadCount?: number | null;
  numReviews?: number | null;
  reviews?: Review[];
}

interface Progress {
  chapterIndex: number;
  positionSeconds: number;
  playbackRate: number;
}

interface BookmarkRow {
  id: number;
  chapterIndex: number;
  positionSeconds: number;
  label: string | null;
  createdAt: string;
}

interface TextMatch {
  match: { gutenbergId: number; title: string } | null;
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
  const [, params] = useRoute("/audiolibrary/:source/:externalId");
  const source = params?.source as "librivox" | "archive" | undefined;
  const externalId = params?.externalId ? decodeURIComponent(params.externalId) : "";
  const bookKey = source && externalId ? `${source}:${externalId}` : "";
  const apiPath = source && externalId ? `${source}/${encodeURIComponent(externalId)}` : "";

  // ── Audio state ──
  const audioRef = useRef<HTMLAudioElement>(null);
  const [chapterIndex, setChapterIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [rate, setRate] = useState(1);
  const [showChapters, setShowChapters] = useState(true);
  const [showRateMenu, setShowRateMenu] = useState(false);
  const [showSleepMenu, setShowSleepMenu] = useState(false);
  const [sleepUntil, setSleepUntil] = useState<number | null>(null); // epoch ms
  const [loadedProgress, setLoadedProgress] = useState(false);
  const [showBookmarks, setShowBookmarks] = useState(false);
  const [showText, setShowText] = useState(false);
  const [bookmarkLabelDraft, setBookmarkLabelDraft] = useState("");
  const [showAddBookmark, setShowAddBookmark] = useState(false);

  // ── Data ──
  const { data: book, isLoading } = useQuery<AudioBookDetail>({
    queryKey: [`/api/audiolibrary/book/${apiPath}`],
    queryFn: async () => {
      const r = await fetch(`/api/audiolibrary/book/${apiPath}`, { credentials: "include" });
      if (!r.ok) throw new Error("Failed to load audiobook");
      return r.json();
    },
    enabled: !!apiPath,
  });
  const { data: progress } = useQuery<Progress>({
    queryKey: [`/api/audiolibrary/progress/${apiPath}`],
    queryFn: async () => {
      const r = await fetch(`/api/audiolibrary/progress/${apiPath}`, { credentials: "include" });
      if (!r.ok) return { chapterIndex: 0, positionSeconds: 0, playbackRate: 1 };
      return r.json();
    },
    enabled: !!apiPath,
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
      await fetch(`/api/audiolibrary/progress/${apiPath}`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      });
    },
  });

  // ── Bookmarks ──
  const bookmarksQuery = useQuery<{ bookmarks: BookmarkRow[] }>({
    queryKey: [`/api/audiolibrary/bookmarks/${apiPath}`],
    queryFn: async () => {
      const r = await fetch(`/api/audiolibrary/bookmarks/${apiPath}`, { credentials: "include" });
      if (!r.ok) return { bookmarks: [] };
      return r.json();
    },
    enabled: !!apiPath,
  });
  const createBookmark = useMutation({
    mutationFn: async (input: { chapterIndex: number; positionSeconds: number; label: string | null }) => {
      const r = await fetch(`/api/audiolibrary/bookmarks`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bookKey, ...input }),
      });
      if (!r.ok) throw new Error(`Failed (${r.status})`);
      return r.json();
    },
    onSuccess: () => bookmarksQuery.refetch(),
  });
  const deleteBookmark = useMutation({
    mutationFn: async (id: number) => {
      const r = await fetch(`/api/audiolibrary/bookmarks/${id}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (!r.ok && r.status !== 204) throw new Error(`Failed (${r.status})`);
    },
    onSuccess: () => bookmarksQuery.refetch(),
  });

  // ── Read + Listen: find a matching Gutenberg text ──
  const textMatchQuery = useQuery<TextMatch>({
    queryKey: [`/api/audiolibrary/text-match/${apiPath}`],
    queryFn: async () => {
      const r = await fetch(`/api/audiolibrary/text-match/${apiPath}`, { credentials: "include" });
      if (!r.ok) return { match: null };
      return r.json();
    },
    enabled: !!apiPath,
  });
  const textBodyQuery = useQuery<{ content: string }>({
    queryKey: [`/api/gutenberg/books/${textMatchQuery.data?.match?.gutenbergId ?? 0}/content`],
    queryFn: async () => {
      const r = await fetch(`/api/gutenberg/books/${textMatchQuery.data!.match!.gutenbergId}/content`, { credentials: "include" });
      if (!r.ok) throw new Error("Failed to load text");
      return r.json();
    },
    enabled: !!textMatchQuery.data?.match?.gutenbergId && showText,
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
  }, [isPlaying, chapterIndex, currentTime, rate, book?.bookKey]);

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

  // Media Session API — tells the OS what's playing so that:
  //   1. The audiobook shows up on the phone's lock screen with title,
  //      author, cover, and play/pause/next/prev controls.
  //   2. iOS + Android don't kill the audio when the screen locks
  //      (they otherwise assume a random <audio> tag is a fire-and-
  //      forget sound effect).
  //   3. Bluetooth headphones and car head units can control playback
  //      (play/pause button, next-track button).
  // Without this the audiobook stops the moment the writer's phone
  // locks, which is the single most-asked-for background-audio bug.
  useEffect(() => {
    if (typeof navigator === "undefined" || !("mediaSession" in navigator)) return;
    if (!book) return;
    const currentChapter = book.chapters[chapterIndex];
    if (!currentChapter) return;
    const nav = navigator as Navigator & { mediaSession: MediaSession };

    // 1. Metadata (lock screen card).
    try {
      nav.mediaSession.metadata = new MediaMetadata({
        title: currentChapter.title || book.title,
        artist: book.author ?? "Unknown",
        album: book.title,
        artwork: book.coverUrl
          ? [
              { src: book.coverUrl, sizes: "96x96",   type: "image/jpeg" },
              { src: book.coverUrl, sizes: "192x192", type: "image/jpeg" },
              { src: book.coverUrl, sizes: "512x512", type: "image/jpeg" },
            ]
          : [],
      });
    } catch { /* older browsers reject certain artwork sizes silently */ }

    // 2. Action handlers (lock screen + bluetooth buttons).
    const handlers: Array<[MediaSessionAction, MediaSessionActionHandler]> = [
      ["play",           () => { audioRef.current?.play().catch(() => {}); }],
      ["pause",          () => { audioRef.current?.pause(); }],
      ["seekbackward",   (d) => { seekBy(-(d.seekOffset ?? 15)); }],
      ["seekforward",    (d) => { seekBy(d.seekOffset ?? 30); }],
      ["previoustrack",  () => { goToChapter(chapterIndex - 1); requestAnimationFrame(() => audioRef.current?.play().catch(() => {})); }],
      ["nexttrack",      () => { goToChapter(chapterIndex + 1); requestAnimationFrame(() => audioRef.current?.play().catch(() => {})); }],
      ["seekto",         (d) => { const a = audioRef.current; if (a && typeof d.seekTime === "number") a.currentTime = d.seekTime; }],
    ];
    for (const [action, handler] of handlers) {
      try { nav.mediaSession.setActionHandler(action, handler); }
      catch { /* browsers reject actions they don't support */ }
    }
    return () => {
      for (const [action] of handlers) {
        try { nav.mediaSession.setActionHandler(action, null); } catch { /* noop */ }
      }
    };
  }, [book, chapterIndex, seekBy, goToChapter]);

  // 3. Playback state — flips the lock-screen icon between play/pause
  // and, on Chrome, sets the position/duration so the seekbar renders.
  useEffect(() => {
    if (typeof navigator === "undefined" || !("mediaSession" in navigator)) return;
    const nav = navigator as Navigator & { mediaSession: MediaSession };
    try { nav.mediaSession.playbackState = isPlaying ? "playing" : "paused"; } catch { /* noop */ }
    const a = audioRef.current;
    if (a && Number.isFinite(a.duration) && a.duration > 0) {
      try {
        nav.mediaSession.setPositionState?.({
          duration: a.duration,
          position: Math.min(a.currentTime, a.duration),
          playbackRate: a.playbackRate || 1,
        });
      } catch { /* older Safari throws on setPositionState */ }
    }
  }, [isPlaying, currentTime, chapterIndex, rate]);

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
  if (!apiPath) {
    return (
      <Layout>
        <div style={{ padding: 40, textAlign: "center", color: MUTED, fontFamily: SF }}>Invalid audiobook URL</div>
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
            style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 12.5, color: MUTED, textDecoration: "none", marginBottom: 18 }}
          >
            {isRTL ? <ArrowRight size={13} /> : <ArrowLeft size={13} />}
            {ar ? "المكتبة الصوتيّة" : "Audio Library"}
          </Link>

          {/* Lockscreen-audio hint — centered on its own line so it
              doesn't collide with the back link, and wraps cleanly on
              narrow phones. Subtle CARD/BORDER treatment reads as a
              helpful footnote instead of an urgent banner. */}
          <div style={{ display: "flex", justifyContent: "center", marginBottom: 22 }}>
            <div
              style={{
                display: "inline-flex", alignItems: "center", gap: 10,
                padding: "8px 14px", borderRadius: 999,
                background: CARD, border: `1px solid ${BORDER}`,
                color: MUTED, fontSize: 12,
                textAlign: "center", lineHeight: 1.4,
                maxWidth: "100%",
              }}
            >
              <Smartphone size={13} color={MUTED} style={{ flexShrink: 0 }} />
              <span>
                {ar
                  ? "بتقدر تقفل تلفونك أو تخفّض الشاشة والصوت بيضلّ شغّال. تحكّم بالتشغيل من شاشة القفل."
                  : "You can lock your phone while listening. Playback controls stay on your lock screen."}
              </span>
            </div>
          </div>

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
                background: "linear-gradient(135deg, rgba(255,255,255,0.08), rgba(255,255,255,0.03))",
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

              {/* Transport row — flexWrap so it re-flows into 2 rows
                  on narrow phones (5 buttons + volume + rate + sleep
                  exceeds ~570px total, iPhone SE is 375). */}
              <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
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

          {/* ── Action chips: Bookmark / Read along / Ask AI ── */}
          <div
            style={{
              display: "flex",
              gap: 10,
              flexWrap: "wrap",
              marginBottom: 30,
            }}
          >
            <ActionChip
              icon={<BookmarkPlus size={14} />}
              label={ar ? "أضف علامة" : "Bookmark this moment"}
              onClick={() => setShowAddBookmark(true)}
            />
            {(bookmarksQuery.data?.bookmarks?.length ?? 0) > 0 && (
              <ActionChip
                icon={<Bookmark size={14} />}
                label={ar
                  ? `العلامات (${bookmarksQuery.data!.bookmarks.length})`
                  : `Bookmarks (${bookmarksQuery.data!.bookmarks.length})`}
                onClick={() => setShowBookmarks((v) => !v)}
                active={showBookmarks}
              />
            )}
            {textMatchQuery.data?.match && (
              <ActionChip
                icon={<BookOpen size={14} />}
                label={ar ? "اقرأ مع الاستماع" : "Read along"}
                onClick={() => setShowText((v) => !v)}
                active={showText}
              />
            )}
          </div>

          {/* Bookmark add inline dialog */}
          {showAddBookmark && (
            <div
              style={{
                background: CARD,
                border: `1px solid ${BORDER_STRONG}`,
                borderRadius: 14,
                padding: "14px 16px",
                marginBottom: 22,
                display: "flex",
                gap: 10,
                alignItems: "center",
                flexWrap: "wrap",
              }}
            >
              <Bookmark size={14} color={ACCENT} style={{ flexShrink: 0 }} />
              <span style={{ fontSize: 12, color: MUTED, fontVariantNumeric: "tabular-nums" }}>
                {ar ? "الفصل" : "Chapter"} {chapterIndex + 1}, {fmtTime(currentTime)}
              </span>
              <input
                type="text"
                value={bookmarkLabelDraft}
                onChange={(e) => setBookmarkLabelDraft(e.target.value)}
                placeholder={ar ? "تسمية اختياريّة" : "Optional label"}
                style={{
                  fontFamily: SF,
                  flex: 1,
                  minWidth: 180,
                  padding: "8px 12px",
                  borderRadius: 10,
                  background: "rgba(255,255,255,0.05)",
                  border: `1px solid ${BORDER}`,
                  color: TEXT,
                  fontSize: 13,
                  outline: "none",
                }}
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    createBookmark.mutate({ chapterIndex, positionSeconds: Math.floor(currentTime), label: bookmarkLabelDraft.trim() || null });
                    setBookmarkLabelDraft("");
                    setShowAddBookmark(false);
                  } else if (e.key === "Escape") {
                    setBookmarkLabelDraft("");
                    setShowAddBookmark(false);
                  }
                }}
              />
              <button
                onClick={() => {
                  createBookmark.mutate({ chapterIndex, positionSeconds: Math.floor(currentTime), label: bookmarkLabelDraft.trim() || null });
                  setBookmarkLabelDraft("");
                  setShowAddBookmark(false);
                }}
                style={{
                  fontFamily: SF, padding: "8px 18px", borderRadius: 10,
                  background: TEXT, color: "#000", border: "none",
                  fontSize: 12.5, fontWeight: 700, cursor: "pointer",
                }}
              >
                {ar ? "احفظ" : "Save"}
              </button>
              <button
                onClick={() => { setShowAddBookmark(false); setBookmarkLabelDraft(""); }}
                style={{
                  width: 32, height: 32, borderRadius: 8,
                  background: "transparent", border: "none",
                  color: MUTED, cursor: "pointer",
                  display: "inline-flex", alignItems: "center", justifyContent: "center",
                }}
                aria-label="Cancel"
              >
                <X size={14} />
              </button>
            </div>
          )}

          {/* Bookmarks list */}
          {showBookmarks && bookmarksQuery.data && bookmarksQuery.data.bookmarks.length > 0 && (
            <section
              style={{
                background: CARD,
                border: `1px solid ${BORDER}`,
                borderRadius: 14,
                padding: 0,
                marginBottom: 26,
                overflow: "hidden",
              }}
            >
              {bookmarksQuery.data.bookmarks.map((bm) => (
                <div
                  key={bm.id}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 12,
                    padding: "12px 16px",
                    borderBottom: `1px solid ${BORDER}`,
                  }}
                >
                  <Bookmark size={14} color={ACCENT} style={{ flexShrink: 0 }} />
                  <button
                    onClick={() => {
                      goToChapter(bm.chapterIndex);
                      requestAnimationFrame(() => {
                        const a = audioRef.current;
                        if (a) a.currentTime = bm.positionSeconds;
                        a?.play().catch(() => {});
                      });
                    }}
                    style={{
                      flex: 1,
                      textAlign: isRTL ? "right" : "left",
                      background: "transparent",
                      border: "none",
                      color: TEXT,
                      cursor: "pointer",
                      fontFamily: SF,
                      minWidth: 0,
                    }}
                  >
                    <div style={{ fontSize: 13.5, fontWeight: 600, marginBottom: 2 }}>
                      {bm.label || (ar ? "علامة" : "Bookmark")}
                    </div>
                    <div style={{ fontSize: 11, color: MUTED, fontVariantNumeric: "tabular-nums" }}>
                      {ar ? "الفصل" : "Chapter"} {bm.chapterIndex + 1} · {fmtTime(bm.positionSeconds)}
                    </div>
                  </button>
                  <button
                    onClick={() => deleteBookmark.mutate(bm.id)}
                    aria-label="Delete"
                    style={{
                      width: 30, height: 30, borderRadius: 8,
                      background: "transparent", border: "none",
                      color: MUTED2, cursor: "pointer",
                      display: "inline-flex", alignItems: "center", justifyContent: "center",
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.color = "#fca5a5")}
                    onMouseLeave={(e) => (e.currentTarget.style.color = MUTED2)}
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              ))}
            </section>
          )}

          {/* Read+Listen split — text panel below transport */}
          {showText && textMatchQuery.data?.match && (
            <section
              style={{
                background: CARD,
                border: `1px solid ${BORDER}`,
                borderRadius: 14,
                padding: "20px 24px",
                marginBottom: 26,
                maxHeight: 460,
                overflowY: "auto",
              }}
            >
              <div style={{ fontSize: 10.5, fontWeight: 700, color: MUTED2, letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 8 }}>
                {ar ? "النصّ من Project Gutenberg" : "Text from Project Gutenberg"}
              </div>
              <div style={{ fontSize: 13, fontWeight: 700, color: TEXT, marginBottom: 12 }}>
                {textMatchQuery.data.match.title}
              </div>
              {textBodyQuery.isFetching ? (
                <div style={{ display: "flex", alignItems: "center", gap: 10, color: MUTED }}>
                  <Loader2 size={14} className="animate-spin" />
                  {ar ? "جارٍ تحميل النصّ..." : "Loading the text..."}
                </div>
              ) : textBodyQuery.data ? (
                <pre
                  style={{
                    fontSize: 14,
                    lineHeight: 1.85,
                    color: TEXT,
                    opacity: 0.92,
                    whiteSpace: "pre-wrap",
                    fontFamily: "Georgia, 'Times New Roman', serif",
                    margin: 0,
                  }}
                >
                  {textBodyQuery.data.content?.slice(0, 12_000)}
                  {textBodyQuery.data.content && textBodyQuery.data.content.length > 12_000 && (
                    <>{"\n\n…"}</>
                  )}
                </pre>
              ) : (
                <div style={{ fontSize: 13, color: MUTED }}>
                  {ar ? "تعذّر تحميل النصّ." : "Couldn't load the text."}
                </div>
              )}
            </section>
          )}

          {/* ── Chapter list ── (moved to the top of the metadata stack;
               it is the single most useful control on the page for
               someone who has already picked a book to listen to). */}
          <section style={{ marginBottom: 30 }}>
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
                        background: active ? ACCENT_WASH_MEDIUM : "transparent",
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

          {/* ── Description ── */}
          {book.description && (
            <section style={{ marginBottom: 30 }}>
              <h2 style={{ fontSize: 13, fontWeight: 700, color: MUTED, textTransform: "uppercase", letterSpacing: "0.1em", margin: "0 0 10px" }}>
                {ar ? "عن الكتاب" : "About this audiobook"}
              </h2>
              <p style={{ fontSize: 14.5, color: TEXT, lineHeight: 1.75, opacity: 0.85, margin: 0, maxWidth: 760 }} dangerouslySetInnerHTML={{ __html: sanitizeDescription(book.description) }} />
            </section>
          )}

          {/* ── Rating + stats badge row ── */}
          {(book.avgRating || book.downloadCount || book.copyrightYear) && (
            <section style={{ marginBottom: 30 }}>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
                {book.avgRating ? (
                  <StatChip
                    icon={<Star size={12} color="#f5c76b" fill="#f5c76b" />}
                    label={`${book.avgRating.toFixed(2)} ★`}
                    sub={book.numReviews ? `${book.numReviews} ${ar ? "تقييم" : book.numReviews === 1 ? "review" : "reviews"}` : (ar ? "التقييم" : "Rating")}
                  />
                ) : null}
                {book.downloadCount ? (
                  <StatChip
                    icon={<Download size={12} color={MUTED} />}
                    label={fmtCompact(book.downloadCount)}
                    sub={ar ? "تحميلاً" : "downloads"}
                  />
                ) : null}
                {book.copyrightYear ? (
                  <StatChip
                    icon={<Calendar size={12} color={MUTED} />}
                    label={book.copyrightYear}
                    sub={ar ? "تاريخ النشر" : "published"}
                  />
                ) : null}
                {book.readers && book.readers.length > 0 ? (
                  <StatChip
                    icon={<Users size={12} color={MUTED} />}
                    label={String(book.readers.length)}
                    sub={ar ? "من قرأ" : book.readers.length === 1 ? "narrator" : "narrators"}
                  />
                ) : null}
              </div>
            </section>
          )}

          {/* ── Extras: RSS, ZIP, Wikipedia, Gutenberg text, Archive.org, LibriVox page ── */}
          {(book.rssUrl || book.zipDownloadUrl || book.wikipediaUrl || book.textSourceUrl || book.archiveUrl || book.sourceUrl) && (
            <section style={{ marginBottom: 30 }}>
              <h2 style={{ fontSize: 13, fontWeight: 700, color: MUTED, textTransform: "uppercase", letterSpacing: "0.1em", margin: "0 0 12px" }}>
                {ar ? "خدمات وروابط" : "Services and links"}
              </h2>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(min(200px, 100%), 1fr))", gap: 10, maxWidth: 900 }}>
                {book.rssUrl ? (
                  <ExtraLink
                    href={book.rssUrl}
                    icon={<Rss size={14} color="#f5a623" />}
                    title={ar ? "اشترك بالبودكاست" : "Subscribe as podcast"}
                    sub={ar ? "افتح في تطبيق البودكاست" : "Open in your podcast app"}
                  />
                ) : null}
                {book.zipDownloadUrl ? (
                  <ExtraLink
                    href={book.zipDownloadUrl}
                    icon={<Download size={14} color="#7cd9a8" />}
                    title={ar ? "تحميل كامل" : "Download all as ZIP"}
                    sub={ar ? "لسماع الكتاب دون إنترنت" : "For offline listening"}
                  />
                ) : null}
                {book.wikipediaUrl ? (
                  <ExtraLink
                    href={book.wikipediaUrl}
                    icon={<Info size={14} color="#5eb3ff" />}
                    title={ar ? "اقرأ على ويكيبيديا" : "Read on Wikipedia"}
                    sub={ar ? "خلفية عن الكتاب" : "Background on the book"}
                  />
                ) : null}
                {book.textSourceUrl ? (
                  <ExtraLink
                    href={book.textSourceUrl}
                    icon={<BookOpen size={14} color="#c9a96e" />}
                    title={ar ? "النصّ المصدر" : "Original text"}
                    sub={ar ? "على مشروع غوتنبرغ" : "On Project Gutenberg"}
                  />
                ) : null}
                {book.archiveUrl ? (
                  <ExtraLink
                    href={book.archiveUrl}
                    icon={<ExternalLink size={14} color={MUTED} />}
                    title={ar ? "على أرشيف الإنترنت" : "On Internet Archive"}
                    sub={ar ? "الصفحة الأصليّة" : "Original archive page"}
                  />
                ) : null}
                {book.sourceUrl ? (
                  <ExtraLink
                    href={book.sourceUrl}
                    icon={<ExternalLink size={14} color={MUTED} />}
                    title={ar ? "على LibriVox" : "On LibriVox"}
                    sub={ar ? "المصدر الأصلي" : "Source page"}
                  />
                ) : null}
              </div>
            </section>
          )}

          {/* ── Narrators (cast list) ── */}
          {book.readers && book.readers.length > 0 && (
            <section style={{ marginBottom: 30 }}>
              <h2 style={{ fontSize: 13, fontWeight: 700, color: MUTED, textTransform: "uppercase", letterSpacing: "0.1em", margin: "0 0 12px" }}>
                {ar ? `القرّاء المتطوّعون (${book.readers.length})` : `Volunteer narrators (${book.readers.length})`}
              </h2>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6, maxWidth: 900 }}>
                {book.readers.slice(0, 40).map((r) => (
                  <div
                    key={r.id + r.name}
                    style={{
                      display: "inline-flex", alignItems: "center", gap: 6,
                      padding: "6px 10px", borderRadius: 999,
                      background: CARD, border: `1px solid ${BORDER}`,
                      fontSize: 12, color: TEXT,
                    }}
                  >
                    <span>{r.name}</span>
                    <span style={{ fontSize: 10, color: MUTED2, fontVariantNumeric: "tabular-nums" }}>
                      · {r.count}
                    </span>
                  </div>
                ))}
                {book.readers.length > 40 && (
                  <div style={{ padding: "6px 10px", fontSize: 12, color: MUTED }}>
                    {ar ? `+${book.readers.length - 40} آخرون` : `+${book.readers.length - 40} more`}
                  </div>
                )}
              </div>
            </section>
          )}

          {/* ── Translators ── */}
          {book.translators && book.translators.length > 0 && (
            <section style={{ marginBottom: 30 }}>
              <h2 style={{ fontSize: 13, fontWeight: 700, color: MUTED, textTransform: "uppercase", letterSpacing: "0.1em", margin: "0 0 10px" }}>
                {ar ? "المترجمون" : "Translators"}
              </h2>
              <p style={{ fontSize: 14, color: TEXT, opacity: 0.85, margin: 0 }}>
                {book.translators.map((t) => t.name).join(", ")}
              </p>
            </section>
          )}

          {/* ── Reviews from Archive.org ── */}
          {book.reviews && book.reviews.length > 0 && (
            <section style={{ marginBottom: 30 }}>
              <h2 style={{ fontSize: 13, fontWeight: 700, color: MUTED, textTransform: "uppercase", letterSpacing: "0.1em", margin: "0 0 12px" }}>
                {ar ? "ماذا يقول المستمعون" : "What listeners are saying"}
              </h2>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(min(260px, 100%), 1fr))", gap: 12, maxWidth: 900 }}>
                {book.reviews.slice(0, 6).map((r, i) => (
                  <div
                    key={i}
                    style={{
                      background: CARD, border: `1px solid ${BORDER}`,
                      borderRadius: 12, padding: "14px 16px",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 6 }}>
                      {Array.from({ length: 5 }).map((_, s) => (
                        <Star key={s} size={11} color={s < r.stars ? "#f5c76b" : "rgba(255,255,255,0.15)"} fill={s < r.stars ? "#f5c76b" : "transparent"} />
                      ))}
                    </div>
                    {r.title && (
                      <div style={{ fontSize: 13.5, fontWeight: 700, color: TEXT, marginBottom: 4, lineHeight: 1.35 }}>
                        {r.title}
                      </div>
                    )}
                    <div style={{ fontSize: 12.5, color: MUTED, lineHeight: 1.55, marginBottom: 8, whiteSpace: "pre-wrap" }}>
                      {(r.body || "").length > 260 ? `${r.body.slice(0, 260)}...` : r.body}
                    </div>
                    <div style={{ fontSize: 11, color: MUTED2 }}>
                      {ar ? "بقلم" : "— "}{r.author}
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

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

// Reusable action chip used by the row above the Description section
// (Bookmark / Read along).
function ActionChip({
  icon, label, onClick, active,
}: {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  active?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 8,
        padding: "9px 14px",
        borderRadius: 999,
        background: active ? ACCENT_WASH_STRONG : CARD,
        border: `1px solid ${active ? "rgba(255,255,255,0.32)" : BORDER}`,
        color: active ? ACCENT : TEXT,
        fontFamily: SF,
        fontSize: 12.5,
        fontWeight: 600,
        cursor: "pointer",
        transition: "all 140ms",
      }}
      onMouseEnter={(e) => {
        if (!active) {
          e.currentTarget.style.background = CARD_HOVER;
          e.currentTarget.style.borderColor = BORDER_STRONG;
        }
      }}
      onMouseLeave={(e) => {
        if (!active) {
          e.currentTarget.style.background = CARD;
          e.currentTarget.style.borderColor = BORDER;
        }
      }}
    >
      {icon}
      {label}
    </button>
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

// ─── Small chip for rating / downloads / year ──────────────────────
function StatChip({ icon, label, sub }: { icon: React.ReactNode; label: string; sub: string }) {
  return (
    <div
      style={{
        display: "inline-flex", alignItems: "center", gap: 8,
        padding: "8px 14px", borderRadius: 12,
        background: CARD, border: `1px solid ${BORDER}`,
      }}
    >
      {icon}
      <div style={{ display: "flex", flexDirection: "column", lineHeight: 1.1 }}>
        <span style={{ fontSize: 13, fontWeight: 700, color: TEXT, fontVariantNumeric: "tabular-nums" }}>{label}</span>
        <span style={{ fontSize: 10.5, color: MUTED2, textTransform: "uppercase", letterSpacing: "0.05em" }}>{sub}</span>
      </div>
    </div>
  );
}

// ─── One clickable card in the "Services and links" grid ───────────
function ExtraLink({ href, icon, title, sub }: { href: string; icon: React.ReactNode; title: string; sub: string }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      style={{
        display: "flex", alignItems: "center", gap: 12,
        padding: "12px 14px", borderRadius: 12,
        background: CARD, border: `1px solid ${BORDER}`,
        color: TEXT, textDecoration: "none",
        transition: "all 140ms ease",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.background = CARD_HOVER;
        e.currentTarget.style.borderColor = BORDER_STRONG;
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = CARD;
        e.currentTarget.style.borderColor = BORDER;
      }}
    >
      <div
        style={{
          width: 32, height: 32, borderRadius: 8,
          background: "rgba(255,255,255,0.05)",
          display: "grid", placeItems: "center",
          flexShrink: 0,
        }}
      >
        {icon}
      </div>
      <div style={{ minWidth: 0, flex: 1 }}>
        <div style={{ fontSize: 13, fontWeight: 700, letterSpacing: "-0.005em" }}>{title}</div>
        <div style={{ fontSize: 11.5, color: MUTED, marginTop: 1 }}>{sub}</div>
      </div>
      <ExternalLink size={12} color={MUTED2} />
    </a>
  );
}

// Compact number formatter — 10_253_329 -> "10.3M", 3508 -> "3.5K"
function fmtCompact(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}

// LibriVox descriptions contain a limited HTML subset (<em>, <i>,
// <p>, <br>). We keep those tags and strip anything scripty. This
// is a whitelist approach: only tags we recognise pass through.
const ALLOWED_TAGS = /^<\/?(em|i|b|strong|p|br|a\s[^>]*)>$/i;
function sanitizeDescription(html: string): string {
  return String(html || "").replace(/<[^>]+>/g, (tag) => (ALLOWED_TAGS.test(tag) ? tag : ""));
}
