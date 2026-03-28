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
  color: string;
  emoji: string;
}

const VOICES: VoiceOption[] = [
  { id: "nova",    name: "Nova",    nameAr: "نوفا",    gender: "Female",  accent: "American",  accentAr: "أمريكي",  tone: "Warm & Upbeat",      toneAr: "دافئ ومشرق",      color: "#8b5cf6", emoji: "🌟" },
  { id: "alloy",   name: "Alloy",   nameAr: "ألوي",   gender: "Neutral", accent: "American",  accentAr: "أمريكي",  tone: "Versatile & Clear",  toneAr: "متعدد الاستخدام", color: "#3b82f6", emoji: "⚡" },
  { id: "shimmer", name: "Shimmer", nameAr: "شيمر",  gender: "Female",  accent: "American",  accentAr: "أمريكي",  tone: "Light & Feminine",   toneAr: "خفيف وأنثوي",     color: "#ec4899", emoji: "✨" },
  { id: "onyx",    name: "Onyx",    nameAr: "أونيكس", gender: "Male",    accent: "American",  accentAr: "أمريكي",  tone: "Deep & Authoritative", toneAr: "عميق وموثوق",   color: "#1e1b4b", emoji: "🔮" },
  { id: "echo",    name: "Echo",    nameAr: "إيكو",   gender: "Male",    accent: "American",  accentAr: "أمريكي",  tone: "Resonant & Clear",   toneAr: "رنان وواضح",      color: "#0ea5e9", emoji: "🔊" },
  { id: "fable",   name: "Fable",   nameAr: "فيبل",   gender: "Neutral", accent: "British",   accentAr: "بريطاني", tone: "Storytelling",        toneAr: "حكاية وسرد",      color: "#10b981", emoji: "📖" },
  { id: "coral",   name: "Coral",   nameAr: "كورال",  gender: "Female",  accent: "American",  accentAr: "أمريكي",  tone: "Clear & Warm",       toneAr: "واضح ودافئ",      color: "#f97316", emoji: "🪸" },
  { id: "ash",     name: "Ash",     nameAr: "آش",     gender: "Neutral", accent: "American",  accentAr: "أمريكي",  tone: "Warm & Engaging",    toneAr: "دافئ وجذاب",      color: "#6b7280", emoji: "🌿" },
  { id: "ballad",  name: "Ballad",  nameAr: "بالاد",  gender: "Neutral", accent: "American",  accentAr: "أمريكي",  tone: "Expressive",         toneAr: "معبر",             color: "#a855f7", emoji: "🎵" },
  { id: "sage",    name: "Sage",    nameAr: "سيج",    gender: "Neutral", accent: "American",  accentAr: "أمريكي",  tone: "Calm & Thoughtful",  toneAr: "هادئ ومتأمل",     color: "#84cc16", emoji: "🌿" },
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
  // For speechSynthesis progress simulation
  const ttsTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const ttsStartRef = useRef<number>(0);
  const ttsDurRef = useRef<number>(0);

  // Stop any TTS on unmount
  useEffect(() => {
    return () => {
      if (isMock) {
        window.speechSynthesis?.cancel();
        if (ttsTimerRef.current) clearInterval(ttsTimerRef.current);
      }
    };
  }, [isMock]);

  // Real audio events
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

    // Pick a matching browser voice
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

    // Estimate duration: ~150 wpm * speed → chars/min ≈ words*5/min
    const words = fullText.split(/\s+/).length;
    const estimatedMs = (words / (150 * utterance.rate)) * 60 * 1000;

    utterance.onend = () => {
      setPlaying(false);
      setProgress(100);
      if (ttsTimerRef.current) { clearInterval(ttsTimerRef.current); ttsTimerRef.current = null; }
    };
    utterance.onerror = () => {
      setPlaying(false);
      if (ttsTimerRef.current) { clearInterval(ttsTimerRef.current); ttsTimerRef.current = null; }
    };

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
    <div className="flex items-center gap-3 mt-3 p-3 rounded-xl" style={{ background: "rgba(139,92,246,0.08)", border: "1px solid rgba(139,92,246,0.15)" }}>
      {!isMock && <audio ref={audioRef} src={dataUrl} preload="auto" muted={muted} />}
      <button
        onClick={toggle}
        className="w-9 h-9 rounded-full flex items-center justify-center transition-all"
        style={{ background: "linear-gradient(135deg, #8b5cf6, #a855f7)", border: "none", cursor: "pointer", flexShrink: 0 }}
      >
        {playing ? <Pause className="w-4 h-4 text-white" /> : <Play className="w-4 h-4 text-white" style={{ marginLeft: 2 }} />}
      </button>

      <div className="flex-1 min-w-0">
        <div className="w-full rounded-full overflow-hidden" style={{ height: 4, background: "rgba(139,92,246,0.2)" }}>
          <div className="h-full rounded-full transition-all" style={{ width: `${progress}%`, background: "linear-gradient(90deg, #8b5cf6, #a855f7)" }} />
        </div>
        {isMock && (
          <p className="text-[10px] mt-1 opacity-40">Browser voice preview · Add OpenAI key for AI voices</p>
        )}
      </div>

      {!isMock && (
        <button
          onClick={() => { setMuted(m => !m); if (audioRef.current) audioRef.current.muted = !muted; }}
          className="w-7 h-7 rounded-lg flex items-center justify-center transition-opacity hover:opacity-70"
          style={{ background: "transparent", border: "none", cursor: "pointer", color: "rgba(139,92,246,0.8)", flexShrink: 0 }}
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

  // Settings
  const [selectedVoice, setSelectedVoice] = useState("nova");
  const [quality, setQuality] = useState<"tts-1" | "tts-1-hd">("tts-1");
  const [speed, setSpeed] = useState(1.0);
  const [selectedChapterIds, setSelectedChapterIds] = useState<Set<number>>(new Set());
  const [selectAll, setSelectAll] = useState(true);

  // Preview state: chapterId -> base64 audio
  const [previews, setPreviews] = useState<Record<number, { audio: string; mimeType: string; isMock?: boolean; text?: string }>>({});
  const [previewLoading, setPreviewLoading] = useState<Record<number, boolean>>({});

  // Export state
  const [isExporting, setIsExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState<{ done: number; total: number } | null>(null);

  // UI
  const [expandedChapters, setExpandedChapters] = useState<Set<number>>(new Set());
  const [voiceTab, setVoiceTab] = useState<"all" | "female" | "male" | "neutral">("all");

  const voice = VOICES.find(v => v.id === selectedVoice) || VOICES[0];

  // Compute total words and estimated duration
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

  // Preview a single chapter
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
      setPreviews(p => ({ ...p, [chapterId]: { ...data, text: chapterText } }));
      setExpandedChapters(prev => new Set([...prev, chapterId]));
    } catch {
      toast({ title: ar ? "فشل المعاينة" : "Preview failed", description: ar ? "حدث خطأ أثناء توليد الصوت" : "Could not generate audio preview", variant: "destructive" });
    } finally {
      setPreviewLoading(p => ({ ...p, [chapterId]: false }));
    }
  };

  // Full export
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
      const safeTitle = (book?.title || "audiobook").replace(/[^a-z0-9]/gi, "_").slice(0, 50);
      a.href = url;
      a.download = `${safeTitle}_audiobook.mp3`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast({ title: ar ? "تم التصدير!" : "Audiobook exported!", description: ar ? "تم تنزيل الكتاب الصوتي بنجاح" : "Your audiobook has been downloaded" });
    } catch {
      toast({ title: ar ? "فشل التصدير" : "Export failed", description: ar ? "حدث خطأ أثناء إنشاء الكتاب الصوتي" : "Something went wrong during export", variant: "destructive" });
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
    <div className="min-h-screen" style={{ background: "linear-gradient(135deg, #0f0a1e 0%, #1a0a2e 40%, #0a1628 100%)" }}>
      {/* ── Header ── */}
      <div className="sticky top-0 z-30 backdrop-blur-xl" style={{ borderBottom: "1px solid rgba(139,92,246,0.15)", background: "rgba(15,10,30,0.85)" }}>
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center gap-4">
          <Link href={`/books/${bookId}`}>
            <button className="flex items-center gap-2 text-sm transition-opacity hover:opacity-70" style={{ background: "none", border: "none", cursor: "pointer", color: "rgba(255,255,255,0.6)" }}>
              <ArrowLeft className="w-4 h-4" />
              {ar ? "العودة للكتاب" : "Back to Book"}
            </button>
          </Link>
          <div className="flex-1" />
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: "linear-gradient(135deg, #8b5cf6, #a855f7)" }}>
              <Headphones className="w-3.5 h-3.5 text-white" />
            </div>
            <span className="text-white font-bold text-base">{ar ? "استوديو الكتاب الصوتي" : "Audiobook Studio"}</span>
          </div>
          <div className="flex-1" />
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-6 py-10">
        {/* ── Hero ── */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full mb-4 text-xs font-semibold tracking-widest uppercase" style={{ background: "rgba(139,92,246,0.15)", border: "1px solid rgba(139,92,246,0.25)", color: "#a855f7" }}>
            <Sparkles className="w-3 h-3" />
            {ar ? "مدعوم بالذكاء الاصطناعي" : "AI-Powered"}
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold mb-3" style={{ color: "rgba(255,255,255,0.95)", letterSpacing: "-0.02em" }}>
            {ar ? `استوديو: ${book?.title || "..."}` : `${book?.title || "Your Book"} — Audiobook`}
          </h1>
          <p className="text-base max-w-xl mx-auto" style={{ color: "rgba(255,255,255,0.45)" }}>
            {ar
              ? "حوّل مخطوطتك إلى كتاب صوتي احترافي باستخدام أصوات ذكاء اصطناعي عالية الجودة"
              : "Transform your manuscript into a professional audiobook with high-quality AI voices"}
          </p>

          {/* Stats row */}
          <div className="inline-flex items-center gap-6 mt-6 px-6 py-3 rounded-2xl" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)" }}>
            <div className="text-center">
              <p className="text-xl font-bold text-white">{chapters.length}</p>
              <p className="text-xs opacity-40">{ar ? "فصل" : "Chapters"}</p>
            </div>
            <div className="w-px h-8" style={{ background: "rgba(255,255,255,0.1)" }} />
            <div className="text-center">
              <p className="text-xl font-bold text-white">{totalWords.toLocaleString()}</p>
              <p className="text-xs opacity-40">{ar ? "كلمة" : "Words"}</p>
            </div>
            <div className="w-px h-8" style={{ background: "rgba(255,255,255,0.1)" }} />
            <div className="text-center">
              <p className="text-xl font-bold" style={{ color: "#a855f7" }}>{fmtMin(estMinutes)}</p>
              <p className="text-xs opacity-40">{ar ? "مدة تقديرية" : "Est. Duration"}</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
          {/* ── Left: Settings Panel ── */}
          <div className="lg:col-span-2 space-y-5">

            {/* Voice Selection */}
            <div className="rounded-2xl p-5" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)" }}>
              <div className="flex items-center gap-2 mb-4">
                <Mic2 className="w-4 h-4" style={{ color: "#a855f7" }} />
                <h3 className="text-sm font-semibold text-white">{ar ? "اختر الصوت" : "Choose Voice"}</h3>
              </div>

              {/* Gender filter tabs */}
              <div className="flex gap-1 mb-3 p-1 rounded-lg" style={{ background: "rgba(0,0,0,0.3)" }}>
                {(["all", "female", "male", "neutral"] as const).map(tab => {
                  const labels: Record<string, string> = { all: ar ? "الكل" : "All", female: ar ? "أنثى" : "Female", male: ar ? "ذكر" : "Male", neutral: ar ? "محايد" : "Neutral" };
                  return (
                    <button key={tab} onClick={() => setVoiceTab(tab)}
                      className="flex-1 py-1 rounded-md text-xs font-medium transition-all"
                      style={{
                        background: voiceTab === tab ? "rgba(139,92,246,0.4)" : "transparent",
                        color: voiceTab === tab ? "#fff" : "rgba(255,255,255,0.4)",
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
                    <button key={v.id} onClick={() => setSelectedVoice(v.id)}
                      className="p-3 rounded-xl text-left transition-all"
                      style={{
                        background: isSelected ? `${v.color}22` : "rgba(255,255,255,0.03)",
                        border: isSelected ? `1.5px solid ${v.color}66` : "1.5px solid rgba(255,255,255,0.06)",
                        cursor: "pointer",
                      }}>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-base">{v.emoji}</span>
                        <span className="text-xs font-bold text-white">{ar ? v.nameAr : v.name}</span>
                        {isSelected && <CheckCircle2 className="w-3 h-3 ml-auto" style={{ color: v.color, flexShrink: 0 }} />}
                      </div>
                      <p className="text-[10px] leading-tight" style={{ color: "rgba(255,255,255,0.35)" }}>
                        {ar ? v.accentAr : v.accent} · {ar ? v.toneAr : v.tone}
                      </p>
                    </button>
                  );
                })}
              </div>

              {/* Selected voice badge */}
              <div className="mt-3 flex items-center gap-2 px-3 py-2 rounded-xl" style={{ background: `${voice.color}15`, border: `1px solid ${voice.color}30` }}>
                <Radio className="w-3 h-3" style={{ color: voice.color }} />
                <span className="text-xs font-medium text-white">{ar ? voice.nameAr : voice.name}</span>
                <span className="text-[10px] opacity-50 ml-auto">{ar ? voice.toneAr : voice.tone}</span>
              </div>
            </div>

            {/* Quality & Speed */}
            <div className="rounded-2xl p-5" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)" }}>
              <div className="flex items-center gap-2 mb-4">
                <Gauge className="w-4 h-4" style={{ color: "#a855f7" }} />
                <h3 className="text-sm font-semibold text-white">{ar ? "الجودة والسرعة" : "Quality & Speed"}</h3>
              </div>

              {/* Quality toggle */}
              <div className="mb-4">
                <label className="block text-xs font-semibold mb-2 opacity-50 uppercase tracking-wider">{ar ? "جودة الصوت" : "Audio Quality"}</label>
                <div className="flex gap-2">
                  {(["tts-1", "tts-1-hd"] as const).map(q => (
                    <button key={q} onClick={() => setQuality(q)}
                      className="flex-1 py-2.5 rounded-xl text-xs font-semibold transition-all"
                      style={{
                        background: quality === q ? "linear-gradient(135deg, #8b5cf6, #a855f7)" : "rgba(255,255,255,0.05)",
                        color: quality === q ? "#fff" : "rgba(255,255,255,0.45)",
                        border: "none", cursor: "pointer",
                      }}>
                      {q === "tts-1" ? (ar ? "⚡ قياسي" : "⚡ Standard") : (ar ? "💎 HD" : "💎 HD")}
                    </button>
                  ))}
                </div>
                <p className="text-[10px] mt-2 opacity-40">
                  {quality === "tts-1-hd" ? (ar ? "جودة أعلى، معالجة أبطأ" : "Higher quality, slower processing") : (ar ? "سريع ومناسب للمعاينة" : "Fast, great for preview & export")}
                </p>
              </div>

              {/* Speed slider */}
              <div>
                <label className="flex items-center justify-between text-xs font-semibold mb-2 opacity-50 uppercase tracking-wider">
                  <span>{ar ? "سرعة القراءة" : "Reading Speed"}</span>
                  <span className="font-bold text-white opacity-80">{speed.toFixed(2)}×</span>
                </label>
                <input type="range" min={0.25} max={4.0} step={0.05} value={speed}
                  onChange={e => setSpeed(parseFloat(e.target.value))}
                  className="w-full accent-violet-500"
                  style={{ height: 4 }}
                />
                <div className="flex justify-between text-[10px] mt-1 opacity-30">
                  <span>0.25×</span>
                  <span>{ar ? "طبيعي" : "Normal"} 1.0×</span>
                  <span>4.0×</span>
                </div>
              </div>
            </div>

            {/* Export Button */}
            <div className="rounded-2xl p-5" style={{ background: "rgba(139,92,246,0.08)", border: "1px solid rgba(139,92,246,0.2)" }}>
              <div className="flex items-center gap-2 mb-3">
                <Music2 className="w-4 h-4" style={{ color: "#a855f7" }} />
                <h3 className="text-sm font-semibold text-white">{ar ? "التصدير النهائي" : "Final Export"}</h3>
              </div>

              <div className="space-y-1.5 mb-4 text-xs" style={{ color: "rgba(255,255,255,0.5)" }}>
                <div className="flex justify-between"><span>{ar ? "الفصول" : "Chapters"}</span><span className="text-white font-medium">{activeChapters.length}</span></div>
                <div className="flex justify-between"><span>{ar ? "الكلمات" : "Words"}</span><span className="text-white font-medium">{activeWords.toLocaleString()}</span></div>
                <div className="flex justify-between"><span>{ar ? "المدة التقديرية" : "Est. Duration"}</span><span className="font-bold" style={{ color: "#a855f7" }}>{fmtMin(estMinutes)}</span></div>
                <div className="flex justify-between"><span>{ar ? "الصوت" : "Voice"}</span><span className="text-white font-medium">{ar ? voice.nameAr : voice.name} {voice.emoji}</span></div>
                <div className="flex justify-between"><span>{ar ? "الصيغة" : "Format"}</span><span className="text-white font-medium">MP3</span></div>
              </div>

              {isExporting && exportProgress && (
                <div className="mb-3">
                  <div className="flex justify-between text-xs mb-1" style={{ color: "rgba(255,255,255,0.5)" }}>
                    <span>{ar ? "جاري المعالجة..." : "Processing..."}</span>
                    <span>{exportProgress.done}/{exportProgress.total}</span>
                  </div>
                  <div className="w-full rounded-full overflow-hidden" style={{ height: 6, background: "rgba(139,92,246,0.15)" }}>
                    <div className="h-full rounded-full transition-all" style={{ width: `${exportProgress.total > 0 ? (exportProgress.done / exportProgress.total) * 100 : 10}%`, background: "linear-gradient(90deg, #8b5cf6, #a855f7)", animation: "pulse 1.5s ease-in-out infinite" }} />
                  </div>
                </div>
              )}

              <button
                onClick={handleExport}
                disabled={isExporting || activeChapters.length === 0}
                className="w-full py-3 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-all"
                style={{
                  background: isExporting ? "rgba(139,92,246,0.3)" : "linear-gradient(135deg, #7c3aed, #a855f7)",
                  color: "#fff", border: "none", cursor: isExporting ? "not-allowed" : "pointer",
                  boxShadow: isExporting ? "none" : "0 0 30px rgba(139,92,246,0.4)",
                }}
              >
                {isExporting
                  ? <><Loader2 className="w-4 h-4 animate-spin" />{ar ? "جاري التصدير..." : "Exporting..."}</>
                  : <><Download className="w-4 h-4" />{ar ? "تحميل الكتاب الصوتي" : "Download Audiobook"}</>}
              </button>
              <p className="text-[10px] text-center mt-2 opacity-30">
                {ar ? "ملف MP3 مع بيانات وصفية احترافية" : "MP3 file with professional metadata"}
              </p>
            </div>
          </div>

          {/* ── Right: Chapter List ── */}
          <div className="lg:col-span-3">
            <div className="rounded-2xl overflow-hidden" style={{ border: "1px solid rgba(255,255,255,0.07)" }}>
              {/* Chapter list header */}
              <div className="flex items-center gap-3 px-5 py-4" style={{ background: "rgba(255,255,255,0.04)", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
                <div className="flex items-center gap-2">
                  <Layers className="w-4 h-4" style={{ color: "#a855f7" }} />
                  <h3 className="text-sm font-semibold text-white">{ar ? "الفصول" : "Chapters"}</h3>
                  <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: "rgba(139,92,246,0.2)", color: "#a855f7" }}>{chapters.length}</span>
                </div>
                <div className="flex-1" />
                <button
                  onClick={handleSelectAll}
                  className="text-xs px-3 py-1.5 rounded-lg transition-all"
                  style={{
                    background: selectAll ? "rgba(139,92,246,0.25)" : "rgba(255,255,255,0.05)",
                    color: selectAll ? "#a855f7" : "rgba(255,255,255,0.45)",
                    border: selectAll ? "1px solid rgba(139,92,246,0.3)" : "1px solid rgba(255,255,255,0.08)",
                    cursor: "pointer",
                  }}
                >
                  {ar ? "تحديد الكل" : "Select All"}
                </button>
              </div>

              {/* Chapter rows */}
              {chapterList.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 opacity-40">
                  <BookOpen className="w-12 h-12 mb-3" style={{ color: "rgba(255,255,255,0.3)" }} />
                  <p className="text-sm text-white">{ar ? "لا توجد فصول بعد" : "No chapters yet"}</p>
                </div>
              ) : (
                <div className="divide-y" style={{ divideColor: "rgba(255,255,255,0.04)" }}>
                  {chapterList.map((chapter, idx) => {
                    const isSelected = selectAll || selectedChapterIds.has(chapter.id);
                    const isExpanded = expandedChapters.has(chapter.id);
                    const words = countWords(chapter.text);
                    const dur = fmtMin(estimateMinutes(words, speed));
                    const preview = previews[chapter.id];
                    const isLoadingPreview = previewLoading[chapter.id];

                    return (
                      <div key={chapter.id} style={{ borderColor: "rgba(255,255,255,0.04)" }}>
                        <div
                          className="flex items-center gap-3 px-5 py-4 cursor-pointer transition-colors"
                          style={{ background: isSelected ? "rgba(139,92,246,0.04)" : "rgba(0,0,0,0)" }}
                        >
                          {/* Selection toggle */}
                          <button
                            onClick={() => toggleChapter(chapter.id)}
                            className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 transition-all"
                            style={{ background: "none", border: "none", cursor: "pointer" }}
                          >
                            {isSelected
                              ? <CheckCircle2 className="w-5 h-5" style={{ color: "#a855f7" }} />
                              : <Circle className="w-5 h-5" style={{ color: "rgba(255,255,255,0.2)" }} />}
                          </button>

                          {/* Chapter number */}
                          <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 text-xs font-bold" style={{ background: isSelected ? "rgba(139,92,246,0.2)" : "rgba(255,255,255,0.06)", color: isSelected ? "#a855f7" : "rgba(255,255,255,0.4)" }}>
                            {idx + 1}
                          </div>

                          {/* Title + meta */}
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate" style={{ color: isSelected ? "rgba(255,255,255,0.9)" : "rgba(255,255,255,0.5)" }}>
                              {chapter.title || `Chapter ${idx + 1}`}
                            </p>
                            <p className="text-[11px] mt-0.5" style={{ color: "rgba(255,255,255,0.25)" }}>
                              {words.toLocaleString()} {ar ? "كلمة" : "words"} · {dur}
                            </p>
                          </div>

                          {/* Preview button */}
                          <button
                            onClick={() => handlePreview(chapter.id)}
                            disabled={isLoadingPreview}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all flex-shrink-0"
                            style={{
                              background: preview ? "rgba(139,92,246,0.25)" : "rgba(255,255,255,0.06)",
                              color: preview ? "#a855f7" : "rgba(255,255,255,0.45)",
                              border: preview ? "1px solid rgba(139,92,246,0.3)" : "1px solid rgba(255,255,255,0.08)",
                              cursor: isLoadingPreview ? "not-allowed" : "pointer",
                            }}
                          >
                            {isLoadingPreview
                              ? <Loader2 className="w-3 h-3 animate-spin" />
                              : preview ? <Volume2 className="w-3 h-3" /> : <Play className="w-3 h-3" />}
                            {preview ? (ar ? "إعادة" : "Replay") : (ar ? "معاينة" : "Preview")}
                          </button>

                          {/* Expand toggle (if preview exists) */}
                          {preview && (
                            <button
                              onClick={() => setExpandedChapters(prev => {
                                const next = new Set(prev);
                                if (next.has(chapter.id)) next.delete(chapter.id); else next.add(chapter.id);
                                return next;
                              })}
                              className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 transition-opacity hover:opacity-70"
                              style={{ background: "rgba(255,255,255,0.05)", border: "none", cursor: "pointer", color: "rgba(255,255,255,0.4)" }}
                            >
                              {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                            </button>
                          )}
                        </div>

                        {/* Expanded audio player */}
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
            <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-3">
              {[
                { icon: "🎙️", title: ar ? "أصوات احترافية" : "Pro Voices", desc: ar ? "10 أصوات ذكاء اصطناعي بنبرات مختلفة" : "10 AI voices with distinct tones" },
                { icon: "⚡", title: ar ? "معالجة دُفعية" : "Batch Processing", desc: ar ? "جميع الفصول في ملف واحد" : "All chapters in a single file" },
                { icon: "💾", title: ar ? "تصدير MP3" : "MP3 Export", desc: ar ? "جودة عالية مع بيانات وصفية" : "High quality with metadata" },
              ].map(tip => (
                <div key={tip.title} className="p-4 rounded-xl" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}>
                  <span className="text-xl">{tip.icon}</span>
                  <p className="text-xs font-semibold text-white mt-2">{tip.title}</p>
                  <p className="text-[11px] mt-0.5 opacity-40">{tip.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
