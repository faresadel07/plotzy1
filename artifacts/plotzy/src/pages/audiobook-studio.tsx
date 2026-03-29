import { useState, useRef, useEffect } from "react";
import { useRoute, Link } from "wouter";
import { useBook } from "@/hooks/use-books";
import { useChapters } from "@/hooks/use-chapters";
import { useLanguage } from "@/contexts/language-context";
import { useToast } from "@/hooks/use-toast";
import {
  ArrowLeft, Play, Pause, Download, Loader2, Mic2, Music2,
  Volume2, VolumeX, CheckCircle2, Circle, ChevronDown, ChevronUp,
  Headphones, Sparkles, Radio, Gauge, Layers, BookOpen,
} from "lucide-react";

// ── Voice definitions ────────────────────────────────────────────────────────

interface VoiceOption {
  id: string;
  name: string;
  nameAr: string;
  gender: "Male" | "Female" | "Neutral";
  accent: string;
  accentAr: string;
  tone: string;
  toneAr: string;
  emoji: string;
}

const VOICES: VoiceOption[] = [
  { id: "nova",    name: "Nova",    nameAr: "نوفا",    gender: "Female",  accent: "American",  accentAr: "أمريكي",  tone: "Warm & Upbeat",        toneAr: "دافئ ومشرق",      emoji: "🌟" },
  { id: "alloy",   name: "Alloy",   nameAr: "ألوي",   gender: "Neutral", accent: "American",  accentAr: "أمريكي",  tone: "Versatile & Clear",    toneAr: "متعدد الاستخدام", emoji: "⚡" },
  { id: "shimmer", name: "Shimmer", nameAr: "شيمر",  gender: "Female",  accent: "American",  accentAr: "أمريكي",  tone: "Light & Feminine",     toneAr: "خفيف وأنثوي",     emoji: "✨" },
  { id: "onyx",    name: "Onyx",    nameAr: "أونيكس", gender: "Male",    accent: "American",  accentAr: "أمريكي",  tone: "Deep & Authoritative", toneAr: "عميق وموثوق",     emoji: "🔮" },
  { id: "echo",    name: "Echo",    nameAr: "إيكو",   gender: "Male",    accent: "American",  accentAr: "أمريكي",  tone: "Resonant & Clear",     toneAr: "رنان وواضح",      emoji: "🔊" },
  { id: "fable",   name: "Fable",   nameAr: "فيبل",   gender: "Neutral", accent: "British",   accentAr: "بريطاني", tone: "Storytelling",          toneAr: "حكاية وسرد",      emoji: "📖" },
  { id: "coral",   name: "Coral",   nameAr: "كورال",  gender: "Female",  accent: "American",  accentAr: "أمريكي",  tone: "Clear & Warm",         toneAr: "واضح ودافئ",      emoji: "🪸" },
  { id: "ash",     name: "Ash",     nameAr: "آش",     gender: "Neutral", accent: "American",  accentAr: "أمريكي",  tone: "Warm & Engaging",      toneAr: "دافئ وجذاب",      emoji: "🌿" },
  { id: "ballad",  name: "Ballad",  nameAr: "بالاد",  gender: "Neutral", accent: "American",  accentAr: "أمريكي",  tone: "Expressive",           toneAr: "معبر",             emoji: "🎵" },
  { id: "sage",    name: "Sage",    nameAr: "سيج",    gender: "Neutral", accent: "American",  accentAr: "أمريكي",  tone: "Calm & Thoughtful",    toneAr: "هادئ ومتأمل",     emoji: "🌿" },
];

// ── Helpers ──────────────────────────────────────────────────────────────────

function extractChapterText(content: string): string {
  try {
    const blocks = JSON.parse(content);
    if (Array.isArray(blocks)) {
      return blocks.map((b: unknown) => {
        if (typeof b === "string") return b;
        if (b && typeof b === "object" && "content" in b) return (b as { content: string }).content;
        return "";
      }).join(" ").trim();
    }
  } catch { }
  return content.trim();
}

function countWords(text: string) {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

function estimateMinutes(words: number, speed: number) {
  const wpm = 150 * speed;
  return Math.max(0.5, words / wpm);
}

function fmtMin(min: number) {
  if (min < 1) return "< 1 min";
  const h = Math.floor(min / 60);
  const m = Math.round(min % 60);
  return h > 0 ? `${h}h ${m}m` : `${m} min`;
}

// ── Waveform animation bars ───────────────────────────────────────────────────

function WaveformBars({ playing }: { playing: boolean }) {
  return (
    <div className="flex items-end gap-[3px]" style={{ height: 20 }}>
      {[0.4, 0.7, 1, 0.6, 0.85, 0.5, 0.9, 0.65, 0.75, 0.45].map((h, i) => (
        <div
          key={i}
          style={{
            width: 3,
            borderRadius: 2,
            background: "#111",
            height: playing ? `${h * 100}%` : "30%",
            animation: playing ? `waveBar 0.8s ease-in-out ${i * 0.08}s infinite alternate` : "none",
            transition: "height 0.3s ease",
            opacity: playing ? 1 : 0.25,
          }}
        />
      ))}
    </div>
  );
}

// ── Mini audio player component ───────────────────────────────────────────────

function MiniPlayer({
  src, mimeType, isMock, text, speed = 1, voiceGender = "Neutral",
}: {
  src: string; mimeType: string; isMock?: boolean;
  text?: string; speed?: number; voiceGender?: "Male" | "Female" | "Neutral";
}) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [muted, setMuted] = useState(false);
  const ttsTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const ttsStartRef = useRef<number>(0);
  const ttsDurRef = useRef<number>(0);

  useEffect(() => {
    return () => {
      if (isMock) {
        window.speechSynthesis?.cancel();
        if (ttsTimerRef.current) clearInterval(ttsTimerRef.current);
      }
    };
  }, [isMock]);

  useEffect(() => {
    if (isMock) return;
    const el = audioRef.current;
    if (!el) return;
    const onEnded = () => setPlaying(false);
    const onTime = () => setProgress(el.duration ? (el.currentTime / el.duration) * 100 : 0);
    el.addEventListener("ended", onEnded);
    el.addEventListener("timeupdate", onTime);
    return () => { el.removeEventListener("ended", onEnded); el.removeEventListener("timeupdate", onTime); };
  }, [isMock]);

  const startTtsProgress = (durationMs: number) => {
    ttsStartRef.current = Date.now();
    ttsDurRef.current = durationMs;
    setProgress(0);
    if (ttsTimerRef.current) clearInterval(ttsTimerRef.current);
    ttsTimerRef.current = setInterval(() => {
      const elapsed = Date.now() - ttsStartRef.current;
      const pct = Math.min(100, (elapsed / ttsDurRef.current) * 100);
      setProgress(pct);
      if (pct >= 100) {
        clearInterval(ttsTimerRef.current!);
        ttsTimerRef.current = null;
        setPlaying(false);
      }
    }, 200);
  };

  const toggleTts = () => {
    const synth = window.speechSynthesis;
    if (!synth) return;
    if (playing) {
      synth.cancel();
      if (ttsTimerRef.current) { clearInterval(ttsTimerRef.current); ttsTimerRef.current = null; }
      setPlaying(false);
      return;
    }
    const fullText = text || "No text available for this chapter.";
    const utterance = new SpeechSynthesisUtterance(fullText);
    utterance.rate = Math.max(0.5, Math.min(2, speed));
    utterance.pitch = voiceGender === "Male" ? 0.8 : voiceGender === "Female" ? 1.2 : 1.0;
    const voices = synth.getVoices();
    if (voices.length > 0) {
      const enVoices = voices.filter(v => v.lang.startsWith("en"));
      if (voiceGender === "Male") {
        const mv = enVoices.find(v => /male|man|david|mark|daniel/i.test(v.name));
        if (mv) utterance.voice = mv;
      } else if (voiceGender === "Female") {
        const fv = enVoices.find(v => /female|woman|samantha|victoria|karen|moira/i.test(v.name));
        if (fv) utterance.voice = fv;
      } else {
        if (enVoices[0]) utterance.voice = enVoices[0];
      }
    }
    const words = fullText.split(/\s+/).length;
    const estimatedMs = (words / (150 * utterance.rate)) * 60 * 1000;
    utterance.onend = () => { setPlaying(false); setProgress(100); if (ttsTimerRef.current) { clearInterval(ttsTimerRef.current); ttsTimerRef.current = null; } };
    utterance.onerror = () => { setPlaying(false); if (ttsTimerRef.current) { clearInterval(ttsTimerRef.current); ttsTimerRef.current = null; } };
    synth.cancel();
    synth.speak(utterance);
    setPlaying(true);
    startTtsProgress(estimatedMs);
  };

  const toggleReal = () => {
    const el = audioRef.current;
    if (!el) return;
    if (playing) { el.pause(); setPlaying(false); }
    else { el.play().catch(() => {}); setPlaying(true); }
  };

  const toggle = isMock ? toggleTts : toggleReal;
  const dataUrl = `data:${mimeType};base64,${src}`;

  return (
    <div className="flex items-center gap-3 mt-2 p-3 rounded-xl" style={{ background: "#f5f5f5", border: "1px solid #e5e5e5" }}>
      {!isMock && <audio ref={audioRef} src={dataUrl} preload="auto" muted={muted} />}
      <button
        onClick={toggle}
        className="w-8 h-8 rounded-full flex items-center justify-center transition-all hover:scale-110"
        style={{ background: "#111", border: "none", cursor: "pointer", flexShrink: 0 }}
      >
        {playing ? <Pause className="w-3.5 h-3.5 text-white" /> : <Play className="w-3.5 h-3.5 text-white" style={{ marginLeft: 1 }} />}
      </button>

      <WaveformBars playing={playing} />

      <div className="flex-1 min-w-0">
        <div className="w-full rounded-full overflow-hidden" style={{ height: 3, background: "#e0e0e0" }}>
          <div className="h-full rounded-full transition-all" style={{ width: `${progress}%`, background: "#111" }} />
        </div>
        {isMock && (
          <p className="text-[10px] mt-1 text-gray-400">Browser preview · Add OpenAI key for AI voices</p>
        )}
      </div>

      {!isMock && (
        <button
          onClick={() => { setMuted(m => !m); if (audioRef.current) audioRef.current.muted = !muted; }}
          className="w-7 h-7 rounded-lg flex items-center justify-center transition-opacity hover:opacity-50"
          style={{ background: "transparent", border: "none", cursor: "pointer", color: "#555", flexShrink: 0 }}
        >
          {muted ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
        </button>
      )}
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export default function AudiobookStudio() {
  const [, params] = useRoute("/books/:id/audiobook");
  const bookId = parseInt(params?.id || "0");
  const { data: book } = useBook(bookId);
  const { data: chapters = [] } = useChapters(bookId);
  const { lang } = useLanguage();
  const { toast } = useToast();
  const ar = lang === "ar";

  const [selectedVoice, setSelectedVoice] = useState("nova");
  const [quality, setQuality] = useState<"tts-1" | "tts-1-hd">("tts-1");
  const [speed, setSpeed] = useState(1.0);
  const [selectedChapterIds, setSelectedChapterIds] = useState<Set<number>>(new Set());
  const [selectAll, setSelectAll] = useState(true);

  const [previews, setPreviews] = useState<Record<number, { audio: string; mimeType: string; isMock?: boolean; text?: string; voice: string }>>({});
  const [previewLoading, setPreviewLoading] = useState<Record<number, boolean>>({});
  const [downloadingChapter, setDownloadingChapter] = useState<Record<number, boolean>>({});

  const [isExporting, setIsExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState<{ done: number; total: number } | null>(null);

  const [expandedChapters, setExpandedChapters] = useState<Set<number>>(new Set());
  const [voiceTab, setVoiceTab] = useState<"all" | "female" | "male" | "neutral">("all");

  const voice = VOICES.find(v => v.id === selectedVoice) || VOICES[0];

  // ── Clear stale previews when voice changes ──────────────────────────────
  const handleVoiceChange = (voiceId: string) => {
    setSelectedVoice(voiceId);
    // Invalidate any previews generated with a different voice
    setPreviews(prev => {
      const next: typeof prev = {};
      for (const [k, v] of Object.entries(prev)) {
        if (v.voice === voiceId) next[Number(k)] = v;
      }
      return next;
    });
    setExpandedChapters(new Set());
  };

  const chapterList = chapters.map(c => ({
    ...c,
    text: extractChapterText(c.content || ""),
  }));
  const totalWords = chapterList.reduce((s, c) => s + countWords(c.text), 0);
  const activeChapters = selectAll ? chapterList : chapterList.filter(c => selectedChapterIds.has(c.id));
  const activeWords = activeChapters.reduce((s, c) => s + countWords(c.text), 0);
  const estMinutes = estimateMinutes(activeWords, speed);

  const toggleChapter = (id: number) => {
    setSelectAll(false);
    setSelectedChapterIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const handleSelectAll = () => {
    setSelectAll(true);
    setSelectedChapterIds(new Set(chapterList.map(c => c.id)));
  };

  // ── Preview a single chapter ─────────────────────────────────────────────
  const handlePreview = async (chapterId: number) => {
    setPreviewLoading(p => ({ ...p, [chapterId]: true }));
    try {
      const res = await fetch(`/api/books/${bookId}/audiobook/preview`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chapterId, voice: selectedVoice, speed, model: quality }),
      });
      if (!res.ok) throw new Error("Preview failed");
      const data = await res.json() as { audio: string; mimeType: string; isMock?: boolean };
      const chapterText = chapterList.find(c => c.id === chapterId)?.text;
      setPreviews(p => ({ ...p, [chapterId]: { ...data, text: chapterText, voice: selectedVoice } }));
      setExpandedChapters(prev => new Set([...prev, chapterId]));
    } catch {
      toast({ title: ar ? "فشل المعاينة" : "Preview failed", description: ar ? "حدث خطأ أثناء توليد الصوت" : "Could not generate audio preview", variant: "destructive" });
    } finally {
      setPreviewLoading(p => ({ ...p, [chapterId]: false }));
    }
  };

  // ── Download a single chapter ────────────────────────────────────────────
  const handleDownloadChapter = async (chapterId: number, chapterTitle: string) => {
    setDownloadingChapter(p => ({ ...p, [chapterId]: true }));
    try {
      const res = await fetch(`/api/books/${bookId}/audiobook/export`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ voice: selectedVoice, speed, model: quality, chapterIds: [chapterId] }),
      });
      if (!res.ok) throw new Error("Export failed");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      const safeName = (chapterTitle || `chapter_${chapterId}`).replace(/[^a-z0-9\u0600-\u06FF]/gi, "_").slice(0, 50);
      a.href = url;
      a.download = `${safeName}.mp3`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast({ title: ar ? "تم التحميل!" : "Chapter downloaded!", description: ar ? `تم تحميل "${chapterTitle}" بنجاح` : `"${chapterTitle}" saved as MP3` });
    } catch {
      toast({ title: ar ? "فشل التحميل" : "Download failed", variant: "destructive" });
    } finally {
      setDownloadingChapter(p => ({ ...p, [chapterId]: false }));
    }
  };

  // ── Full export ──────────────────────────────────────────────────────────
  const handleExport = async () => {
    const chapIds = selectAll ? chapterList.map(c => c.id) : [...selectedChapterIds];
    if (chapIds.length === 0) {
      toast({ title: ar ? "لم تُحدد فصول" : "No chapters selected", variant: "destructive" });
      return;
    }
    setIsExporting(true);
    setExportProgress({ done: 0, total: chapIds.length });
    try {
      const res = await fetch(`/api/books/${bookId}/audiobook/export`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ voice: selectedVoice, speed, model: quality, chapterIds: chapIds }),
      });
      if (!res.ok) throw new Error("Export failed");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      const safeTitle = (book?.title || "audiobook").replace(/[^a-z0-9\u0600-\u06FF]/gi, "_").slice(0, 50);
      a.href = url;
      a.download = `${safeTitle}_audiobook.mp3`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast({ title: ar ? "تم التصدير!" : "Audiobook exported!", description: ar ? "تم تنزيل الكتاب الصوتي بنجاح" : "Your audiobook has been downloaded" });
    } catch {
      toast({ title: ar ? "فشل التصدير" : "Export failed", variant: "destructive" });
    } finally {
      setIsExporting(false);
      setExportProgress(null);
    }
  };

  const filteredVoices = VOICES.filter(v => {
    if (voiceTab === "all") return true;
    if (voiceTab === "female") return v.gender === "Female";
    if (voiceTab === "male") return v.gender === "Male";
    return v.gender === "Neutral";
  });

  return (
    <>
      {/* ── Global animations ── */}
      <style>{`
        @keyframes waveBar {
          from { transform: scaleY(0.4); }
          to   { transform: scaleY(1); }
        }
        @keyframes floatDot {
          0%   { transform: translateY(0px) scale(1);   opacity: 0.06; }
          50%  { transform: translateY(-18px) scale(1.1); opacity: 0.12; }
          100% { transform: translateY(0px) scale(1);   opacity: 0.06; }
        }
        @keyframes shimmerText {
          0%   { background-position: -200% center; }
          100% { background-position: 200% center; }
        }
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(16px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .anim-fade-up { animation: fadeUp 0.5s ease both; }
        .anim-fade-up-1 { animation: fadeUp 0.5s 0.05s ease both; }
        .anim-fade-up-2 { animation: fadeUp 0.5s 0.10s ease both; }
        .anim-fade-up-3 { animation: fadeUp 0.5s 0.15s ease both; }
        .anim-fade-up-4 { animation: fadeUp 0.5s 0.20s ease both; }
        .chapter-row:hover { background: #f7f7f7 !important; }
      `}</style>

      <div className="min-h-screen" style={{ background: "#ffffff", color: "#111111" }}>

        {/* ── Floating dots background ── */}
        <div className="fixed inset-0 pointer-events-none overflow-hidden" style={{ zIndex: 0 }}>
          {[...Array(14)].map((_, i) => (
            <div key={i} style={{
              position: "absolute",
              width: 6 + (i % 4) * 4,
              height: 6 + (i % 4) * 4,
              borderRadius: "50%",
              background: "#111",
              left: `${(i * 7.3) % 100}%`,
              top: `${(i * 13.1) % 100}%`,
              animation: `floatDot ${3 + (i % 3)}s ${i * 0.4}s ease-in-out infinite`,
            }} />
          ))}
        </div>

        {/* ── Header ── */}
        <div className="sticky top-0 z-30 backdrop-blur-xl" style={{ borderBottom: "1px solid #e5e5e5", background: "rgba(255,255,255,0.92)" }}>
          <div className="max-w-6xl mx-auto px-6 h-14 flex items-center gap-4">
            <Link href={`/books/${bookId}`}>
              <button className="flex items-center gap-1.5 text-sm transition-opacity hover:opacity-50 font-medium" style={{ background: "none", border: "none", cursor: "pointer", color: "#555" }}>
                <ArrowLeft className="w-4 h-4" />
                {ar ? "العودة للكتاب" : "Back to Book"}
              </button>
            </Link>
            <div className="flex-1" />
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: "#111" }}>
                <Headphones className="w-3.5 h-3.5 text-white" />
              </div>
              <span className="font-bold text-sm" style={{ color: "#111" }}>{ar ? "استوديو الكتاب الصوتي" : "Audiobook Studio"}</span>
            </div>
            <div className="flex-1" />
          </div>
        </div>

        <div className="max-w-6xl mx-auto px-6 py-10 relative z-10">

          {/* ── Hero ── */}
          <div className="text-center mb-12 anim-fade-up">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full mb-4 text-[11px] font-bold tracking-widest uppercase"
              style={{ background: "#f0f0f0", border: "1px solid #e0e0e0", color: "#555" }}>
              <Sparkles className="w-3 h-3" />
              {ar ? "مدعوم بالذكاء الاصطناعي" : "AI-Powered"}
            </div>
            <h1 className="text-4xl sm:text-5xl font-black mb-3 leading-tight" style={{
              background: "linear-gradient(90deg, #111 0%, #555 40%, #111 60%, #000 100%)",
              backgroundSize: "200% auto",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              animation: "shimmerText 4s linear infinite",
              letterSpacing: "-0.03em",
            }}>
              {ar ? `${book?.title || "..."} — استوديو` : `${book?.title || "Your Book"} — Audiobook`}
            </h1>
            <p className="text-sm max-w-xl mx-auto" style={{ color: "#888" }}>
              {ar
                ? "حوّل مخطوطتك إلى كتاب صوتي احترافي باستخدام أصوات ذكاء اصطناعي عالية الجودة"
                : "Transform your manuscript into a professional audiobook with high-quality AI voices"}
            </p>

            {/* Stats */}
            <div className="inline-flex items-center gap-6 mt-6 px-6 py-3 rounded-2xl" style={{ background: "#f5f5f5", border: "1px solid #e5e5e5" }}>
              <div className="text-center">
                <p className="text-2xl font-black" style={{ color: "#111" }}>{chapters.length}</p>
                <p className="text-[11px] text-gray-400">{ar ? "فصل" : "Chapters"}</p>
              </div>
              <div className="w-px h-8" style={{ background: "#e0e0e0" }} />
              <div className="text-center">
                <p className="text-2xl font-black" style={{ color: "#111" }}>{totalWords.toLocaleString()}</p>
                <p className="text-[11px] text-gray-400">{ar ? "كلمة" : "Words"}</p>
              </div>
              <div className="w-px h-8" style={{ background: "#e0e0e0" }} />
              <div className="text-center">
                <p className="text-2xl font-black" style={{ color: "#111" }}>{fmtMin(estMinutes)}</p>
                <p className="text-[11px] text-gray-400">{ar ? "مدة تقديرية" : "Est. Duration"}</p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">

            {/* ── Left: Settings ── */}
            <div className="lg:col-span-2 space-y-4">

              {/* Voice Selection */}
              <div className="rounded-2xl p-5 anim-fade-up-1" style={{ background: "#fafafa", border: "1px solid #e5e5e5" }}>
                <div className="flex items-center gap-2 mb-4">
                  <Mic2 className="w-4 h-4" style={{ color: "#111" }} />
                  <h3 className="text-sm font-bold">{ar ? "اختر الصوت" : "Choose Voice"}</h3>
                </div>

                {/* Gender filter tabs */}
                <div className="flex gap-1 mb-3 p-1 rounded-xl" style={{ background: "#efefef" }}>
                  {(["all", "female", "male", "neutral"] as const).map(tab => {
                    const labels: Record<string, string> = { all: ar ? "الكل" : "All", female: ar ? "أنثى" : "Female", male: ar ? "ذكر" : "Male", neutral: ar ? "محايد" : "Neutral" };
                    return (
                      <button key={tab} onClick={() => setVoiceTab(tab)}
                        className="flex-1 py-1 rounded-lg text-xs font-semibold transition-all"
                        style={{
                          background: voiceTab === tab ? "#111" : "transparent",
                          color: voiceTab === tab ? "#fff" : "#888",
                          border: "none", cursor: "pointer",
                        }}>
                        {labels[tab]}
                      </button>
                    );
                  })}
                </div>

                {/* Voice grid */}
                <div className="grid grid-cols-2 gap-2">
                  {filteredVoices.map(v => {
                    const isSelected = selectedVoice === v.id;
                    return (
                      <button key={v.id} onClick={() => handleVoiceChange(v.id)}
                        className="p-3 rounded-xl text-left transition-all hover:scale-[1.02]"
                        style={{
                          background: isSelected ? "#111" : "#fff",
                          border: isSelected ? "1.5px solid #111" : "1.5px solid #e5e5e5",
                          cursor: "pointer",
                          boxShadow: isSelected ? "0 4px 16px rgba(0,0,0,0.15)" : "none",
                        }}>
                        <div className="flex items-center gap-2 mb-0.5">
                          <span className="text-sm">{v.emoji}</span>
                          <span className="text-xs font-bold" style={{ color: isSelected ? "#fff" : "#111" }}>{ar ? v.nameAr : v.name}</span>
                          {isSelected && <CheckCircle2 className="w-3 h-3 ml-auto text-white" style={{ flexShrink: 0 }} />}
                        </div>
                        <p className="text-[10px] leading-tight" style={{ color: isSelected ? "rgba(255,255,255,0.55)" : "#aaa" }}>
                          {ar ? v.accentAr : v.accent} · {ar ? v.toneAr : v.tone}
                        </p>
                      </button>
                    );
                  })}
                </div>

                {/* Selected voice badge */}
                <div className="mt-3 flex items-center gap-2 px-3 py-2 rounded-xl" style={{ background: "#f0f0f0", border: "1px solid #e0e0e0" }}>
                  <Radio className="w-3 h-3 text-gray-500" />
                  <span className="text-xs font-semibold text-gray-700">{ar ? voice.nameAr : voice.name}</span>
                  <span className="text-[10px] text-gray-400 ml-auto">{ar ? voice.toneAr : voice.tone}</span>
                </div>
              </div>

              {/* Quality & Speed */}
              <div className="rounded-2xl p-5 anim-fade-up-2" style={{ background: "#fafafa", border: "1px solid #e5e5e5" }}>
                <div className="flex items-center gap-2 mb-4">
                  <Gauge className="w-4 h-4 text-gray-700" />
                  <h3 className="text-sm font-bold">{ar ? "الجودة والسرعة" : "Quality & Speed"}</h3>
                </div>

                <div className="mb-4">
                  <label className="block text-[11px] font-bold mb-2 text-gray-400 uppercase tracking-wider">{ar ? "جودة الصوت" : "Audio Quality"}</label>
                  <div className="flex gap-2">
                    {(["tts-1", "tts-1-hd"] as const).map(q => (
                      <button key={q} onClick={() => setQuality(q)}
                        className="flex-1 py-2.5 rounded-xl text-xs font-bold transition-all"
                        style={{
                          background: quality === q ? "#111" : "#fff",
                          color: quality === q ? "#fff" : "#888",
                          border: quality === q ? "1px solid #111" : "1px solid #e5e5e5",
                          cursor: "pointer",
                        }}>
                        {q === "tts-1" ? (ar ? "⚡ قياسي" : "⚡ Standard") : (ar ? "💎 HD" : "💎 HD")}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="flex items-center justify-between text-[11px] font-bold mb-2 text-gray-400 uppercase tracking-wider">
                    <span>{ar ? "سرعة القراءة" : "Reading Speed"}</span>
                    <span className="font-black text-gray-800">{speed.toFixed(2)}×</span>
                  </label>
                  <input type="range" min={0.25} max={4.0} step={0.05} value={speed}
                    onChange={e => setSpeed(parseFloat(e.target.value))}
                    className="w-full accent-gray-800"
                    style={{ height: 4 }}
                  />
                  <div className="flex justify-between text-[10px] mt-1 text-gray-300">
                    <span>0.25×</span>
                    <span>{ar ? "طبيعي" : "Normal"} 1.0×</span>
                    <span>4.0×</span>
                  </div>
                </div>
              </div>

              {/* Export button */}
              <div className="rounded-2xl p-5 anim-fade-up-3" style={{ background: "#fafafa", border: "1px solid #e5e5e5" }}>
                <div className="flex items-center gap-2 mb-3">
                  <Music2 className="w-4 h-4 text-gray-700" />
                  <h3 className="text-sm font-bold">{ar ? "التصدير النهائي" : "Final Export"}</h3>
                </div>

                <div className="space-y-1.5 mb-4 text-xs text-gray-400">
                  <div className="flex justify-between"><span>{ar ? "الفصول" : "Chapters"}</span><span className="text-gray-800 font-semibold">{activeChapters.length}</span></div>
                  <div className="flex justify-between"><span>{ar ? "الكلمات" : "Words"}</span><span className="text-gray-800 font-semibold">{activeWords.toLocaleString()}</span></div>
                  <div className="flex justify-between"><span>{ar ? "المدة التقديرية" : "Est. Duration"}</span><span className="text-gray-800 font-bold">{fmtMin(estMinutes)}</span></div>
                  <div className="flex justify-between"><span>{ar ? "الصوت" : "Voice"}</span><span className="text-gray-800 font-semibold">{ar ? voice.nameAr : voice.name} {voice.emoji}</span></div>
                  <div className="flex justify-between"><span>{ar ? "الصيغة" : "Format"}</span><span className="text-gray-800 font-semibold">MP3</span></div>
                </div>

                {isExporting && exportProgress && (
                  <div className="mb-3">
                    <div className="flex justify-between text-xs mb-1 text-gray-400">
                      <span>{ar ? "جاري المعالجة..." : "Processing..."}</span>
                      <span>{exportProgress.done}/{exportProgress.total}</span>
                    </div>
                    <div className="w-full rounded-full overflow-hidden" style={{ height: 5, background: "#e5e5e5" }}>
                      <div className="h-full rounded-full transition-all" style={{ width: `${exportProgress.total > 0 ? (exportProgress.done / exportProgress.total) * 100 : 10}%`, background: "#111", animation: "pulse 1.5s ease-in-out infinite" }} />
                    </div>
                  </div>
                )}

                <button
                  onClick={handleExport}
                  disabled={isExporting || activeChapters.length === 0}
                  className="w-full py-3 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-all hover:opacity-85"
                  style={{
                    background: isExporting ? "#e5e5e5" : "#111",
                    color: isExporting ? "#999" : "#fff",
                    border: "none", cursor: isExporting ? "not-allowed" : "pointer",
                    boxShadow: isExporting ? "none" : "0 4px 20px rgba(0,0,0,0.2)",
                  }}
                >
                  {isExporting
                    ? <><Loader2 className="w-4 h-4 animate-spin" />{ar ? "جاري التصدير..." : "Exporting..."}</>
                    : <><Download className="w-4 h-4" />{ar ? "تحميل الكتاب الصوتي كاملاً" : "Download Full Audiobook"}</>}
                </button>
                <p className="text-[10px] text-center mt-2 text-gray-300">
                  {ar ? "ملف MP3 مع بيانات وصفية احترافية" : "MP3 file with professional metadata"}
                </p>
              </div>
            </div>

            {/* ── Right: Chapter List ── */}
            <div className="lg:col-span-3 anim-fade-up-4">
              <div className="rounded-2xl overflow-hidden" style={{ border: "1px solid #e5e5e5" }}>
                {/* Header */}
                <div className="flex items-center gap-3 px-5 py-3.5" style={{ background: "#fafafa", borderBottom: "1px solid #e5e5e5" }}>
                  <Layers className="w-4 h-4 text-gray-500" />
                  <h3 className="text-sm font-bold text-gray-800">{ar ? "الفصول" : "Chapters"}</h3>
                  <span className="text-xs px-2 py-0.5 rounded-full font-semibold" style={{ background: "#f0f0f0", color: "#555" }}>{chapters.length}</span>
                  <div className="flex-1" />
                  <button
                    onClick={handleSelectAll}
                    className="text-xs px-3 py-1.5 rounded-lg transition-all font-semibold"
                    style={{
                      background: selectAll ? "#111" : "#f0f0f0",
                      color: selectAll ? "#fff" : "#555",
                      border: "none", cursor: "pointer",
                    }}
                  >
                    {ar ? "تحديد الكل" : "Select All"}
                  </button>
                </div>

                {/* Rows */}
                {chapterList.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-16 opacity-30">
                    <BookOpen className="w-10 h-10 mb-3" />
                    <p className="text-sm">{ar ? "لا توجد فصول بعد" : "No chapters yet"}</p>
                  </div>
                ) : (
                  <div>
                    {chapterList.map((chapter, idx) => {
                      const isSelected = selectAll || selectedChapterIds.has(chapter.id);
                      const isExpanded = expandedChapters.has(chapter.id);
                      const words = countWords(chapter.text);
                      const dur = fmtMin(estimateMinutes(words, speed));
                      const preview = previews[chapter.id];
                      const isLoadingPreview = previewLoading[chapter.id];
                      const isDownloading = downloadingChapter[chapter.id];
                      const stale = preview && preview.voice !== selectedVoice;

                      return (
                        <div key={chapter.id} style={{ borderBottom: "1px solid #f0f0f0" }}>
                          <div
                            className="chapter-row flex items-center gap-3 px-5 py-3.5 transition-colors"
                            style={{ background: isSelected ? "#fafafa" : "#fff" }}
                          >
                            {/* Checkbox */}
                            <button
                              onClick={() => toggleChapter(chapter.id)}
                              className="flex-shrink-0 transition-all hover:scale-110"
                              style={{ background: "none", border: "none", cursor: "pointer" }}
                            >
                              {isSelected
                                ? <CheckCircle2 className="w-5 h-5" style={{ color: "#111" }} />
                                : <Circle className="w-5 h-5 text-gray-300" />}
                            </button>

                            {/* Index */}
                            <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 text-xs font-bold"
                              style={{ background: isSelected ? "#111" : "#f0f0f0", color: isSelected ? "#fff" : "#888" }}>
                              {idx + 1}
                            </div>

                            {/* Title + meta */}
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-semibold truncate" style={{ color: isSelected ? "#111" : "#aaa" }}>
                                {chapter.title || `Chapter ${idx + 1}`}
                              </p>
                              <p className="text-[11px] mt-0.5 text-gray-400">
                                {words.toLocaleString()} {ar ? "كلمة" : "words"} · {dur}
                              </p>
                            </div>

                            {/* Preview button */}
                            <button
                              onClick={() => handlePreview(chapter.id)}
                              disabled={isLoadingPreview}
                              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all flex-shrink-0"
                              style={{
                                background: stale ? "#fff8e5" : preview ? "#f0f0f0" : "#f5f5f5",
                                color: stale ? "#c97c00" : preview ? "#111" : "#888",
                                border: stale ? "1px solid #f0c040" : preview ? "1px solid #ddd" : "1px solid #e5e5e5",
                                cursor: isLoadingPreview ? "not-allowed" : "pointer",
                              }}
                              title={stale ? (ar ? "الصوت تغير، أعد المعاينة" : "Voice changed — regenerate preview") : undefined}
                            >
                              {isLoadingPreview
                                ? <Loader2 className="w-3 h-3 animate-spin" />
                                : stale ? <Sparkles className="w-3 h-3" />
                                : preview ? <Volume2 className="w-3 h-3" /> : <Play className="w-3 h-3" />}
                              {stale ? (ar ? "تحديث" : "Refresh") : preview ? (ar ? "إعادة" : "Replay") : (ar ? "معاينة" : "Preview")}
                            </button>

                            {/* Per-chapter download button */}
                            <button
                              onClick={() => handleDownloadChapter(chapter.id, chapter.title || `Chapter ${idx + 1}`)}
                              disabled={isDownloading}
                              className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 transition-all hover:bg-gray-100"
                              style={{
                                background: "transparent",
                                border: "1px solid #e5e5e5",
                                cursor: isDownloading ? "not-allowed" : "pointer",
                                color: "#555",
                              }}
                              title={ar ? `تحميل "${chapter.title || `الفصل ${idx + 1}`}"` : `Download "${chapter.title || `Chapter ${idx + 1}`}"`}
                            >
                              {isDownloading
                                ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                : <Download className="w-3.5 h-3.5" />}
                            </button>

                            {/* Expand toggle */}
                            {preview && (
                              <button
                                onClick={() => setExpandedChapters(prev => {
                                  const next = new Set(prev);
                                  if (next.has(chapter.id)) next.delete(chapter.id); else next.add(chapter.id);
                                  return next;
                                })}
                                className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 transition-all hover:bg-gray-100"
                                style={{ background: "transparent", border: "1px solid #e5e5e5", cursor: "pointer", color: "#888" }}
                              >
                                {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                              </button>
                            )}
                          </div>

                          {/* Audio player (expanded) */}
                          {isExpanded && preview && (
                            <div className="px-5 pb-4">
                              <MiniPlayer
                                src={preview.audio}
                                mimeType={preview.mimeType}
                                isMock={preview.isMock}
                                text={preview.text}
                                speed={speed}
                                voiceGender={voice.gender}
                              />
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Tips */}
              <div className="mt-4 grid grid-cols-3 gap-3">
                {[
                  { icon: "🎙️", title: ar ? "أصوات احترافية" : "Pro Voices",        desc: ar ? "10 أصوات ذكاء اصطناعي" : "10 AI voices to choose from" },
                  { icon: "⬇️", title: ar ? "تحميل فصل بفصل" : "Chapter Downloads", desc: ar ? "شارك فصلاً واحداً مستقلاً" : "Share any single chapter" },
                  { icon: "💾", title: ar ? "تصدير MP3" : "MP3 Export",             desc: ar ? "جودة عالية مع بيانات وصفية" : "High quality with metadata" },
                ].map(tip => (
                  <div key={tip.title} className="p-4 rounded-xl transition-all hover:shadow-sm" style={{ background: "#fafafa", border: "1px solid #e5e5e5" }}>
                    <span className="text-xl">{tip.icon}</span>
                    <p className="text-xs font-bold mt-2 text-gray-800">{tip.title}</p>
                    <p className="text-[11px] mt-0.5 text-gray-400">{tip.desc}</p>
                  </div>
                ))}
              </div>
            </div>

          </div>
        </div>
      </div>
    </>
  );
}
