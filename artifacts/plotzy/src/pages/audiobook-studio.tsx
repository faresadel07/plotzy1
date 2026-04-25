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

// Voice catalogue. The 10 OpenAI personality slots stay verbatim — the
// backend now maps them to Microsoft Edge neural voices, but to the
// frontend they look identical so the UI labels keep their meaning.
// Six Arabic neural voices appended below cover Saudi/Egyptian/Jordanian
// dialects so books written in Arabic finally have native narrators.
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
  // Arabic neural voices
  { id: "ar-zariyah", name: "Zariyah", nameAr: "زاريا", gender: "Female", accent: "Saudi",     accentAr: "سعودي",   tone: "Warm Standard Arabic", toneAr: "فصحى دافئة",      emoji: "🌙" },
  { id: "ar-hamed",   name: "Hamed",   nameAr: "حامد",  gender: "Male",   accent: "Saudi",     accentAr: "سعودي",   tone: "Clear Standard Arabic",toneAr: "فصحى واضحة",      emoji: "🕋" },
  { id: "ar-salma",   name: "Salma",   nameAr: "سلمى",  gender: "Female", accent: "Egyptian",  accentAr: "مصري",    tone: "Egyptian Warm",        toneAr: "مصري دافئ",       emoji: "🌅" },
  { id: "ar-shakir",  name: "Shakir",  nameAr: "شاكر",  gender: "Male",   accent: "Egyptian",  accentAr: "مصري",    tone: "Egyptian Resonant",    toneAr: "مصري رنان",       emoji: "🐪" },
  { id: "ar-sana",    name: "Sana",    nameAr: "سناء",  gender: "Female", accent: "Jordanian", accentAr: "أردني",    tone: "Levantine Female",     toneAr: "أردنية شامية",    emoji: "🌷" },
  { id: "ar-taim",    name: "Taim",    nameAr: "تيم",   gender: "Male",   accent: "Jordanian", accentAr: "أردني",    tone: "Levantine Male",       toneAr: "أردني شامي",      emoji: "⛰️" },
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
            background: "#e0e0e0",
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

// ── Per-voice TTS settings (pitch + rate offset) for mock/browser mode ────────
const VOICE_TTS_SETTINGS: Record<string, { pitch: number; rateOffset: number; preferName?: string }> = {
  nova:    { pitch: 1.20, rateOffset:  0.00 },                         // warm, upbeat
  shimmer: { pitch: 1.45, rateOffset: -0.08 },                         // light, breathy
  coral:   { pitch: 1.15, rateOffset:  0.05 },                         // clear, warm
  alloy:   { pitch: 1.00, rateOffset:  0.00 },                         // neutral baseline
  ash:     { pitch: 0.95, rateOffset:  0.05 },                         // calm, warm
  ballad:  { pitch: 1.10, rateOffset: -0.15, preferName: "samantha" }, // expressive, musical
  fable:   { pitch: 1.05, rateOffset: -0.10, preferName: "daniel" },   // storytelling, British
  sage:    { pitch: 0.88, rateOffset: -0.05 },                         // thoughtful, slow
  onyx:    { pitch: 0.68, rateOffset: -0.08, preferName: "david" },    // deep, authoritative
  echo:    { pitch: 0.85, rateOffset:  0.05, preferName: "mark" },     // resonant, clear
};

// ── Mini audio player component ───────────────────────────────────────────────

function MiniPlayer({
  src, mimeType, isMock, text, speed = 1, voiceGender = "Neutral", voiceId = "alloy",
}: {
  src: string; mimeType: string; isMock?: boolean;
  text?: string; speed?: number; voiceGender?: "Male" | "Female" | "Neutral"; voiceId?: string;
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

    // Use per-voice settings so every voice sounds distinctly different
    const vtts = VOICE_TTS_SETTINGS[voiceId] ?? { pitch: 1.0, rateOffset: 0 };
    utterance.pitch = vtts.pitch;
    utterance.rate = Math.max(0.25, Math.min(2, speed + vtts.rateOffset));

    // Try to pick a browser voice that matches
    const doAssign = () => {
      const browserVoices = synth.getVoices();
      if (browserVoices.length === 0) return;
      const en = browserVoices.filter(v => v.lang.startsWith("en"));
      // 1. Try preferred name (e.g. "david", "samantha")
      if (vtts.preferName) {
        const pref = en.find(v => v.name.toLowerCase().includes(vtts.preferName!));
        if (pref) { utterance.voice = pref; return; }
      }
      // 2. Fall back to gender match
      if (voiceGender === "Male") {
        const mv = en.find(v => /male|man|david|mark|daniel/i.test(v.name));
        if (mv) { utterance.voice = mv; return; }
      } else if (voiceGender === "Female") {
        const fv = en.find(v => /female|woman|samantha|victoria|karen|moira/i.test(v.name));
        if (fv) { utterance.voice = fv; return; }
      }
      if (en[0]) utterance.voice = en[0];
    };

    // Chrome loads voices async
    if (synth.getVoices().length > 0) {
      doAssign();
    } else {
      synth.onvoiceschanged = () => { doAssign(); synth.onvoiceschanged = null; };
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
    <div className="flex items-center gap-3 mt-2 p-3 rounded-xl" style={{ background: "#1a1a1a", border: "1px solid #252525" }}>
      {!isMock && <audio ref={audioRef} src={dataUrl} preload="auto" muted={muted} />}
      <button
        onClick={toggle}
        className="w-8 h-8 rounded-full flex items-center justify-center transition-all hover:scale-110"
        style={{ background: "#fff", border: "none", cursor: "pointer", flexShrink: 0 }}
      >
        {playing ? <Pause className="w-3.5 h-3.5 text-black" /> : <Play className="w-3.5 h-3.5 text-black" style={{ marginLeft: 1 }} />}
      </button>

      <WaveformBars playing={playing} />

      <div className="flex-1 min-w-0">
        <div className="w-full rounded-full overflow-hidden" style={{ height: 3, background: "#2a2a2a" }}>
          <div className="h-full rounded-full transition-all" style={{ width: `${progress}%`, background: "#fff" }} />
        </div>
        {isMock && (
          <p className="text-[10px] mt-1 text-gray-400">Browser preview · Add OpenAI key for AI voices</p>
        )}
      </div>

      {!isMock && (
        <button
          onClick={() => { setMuted(m => !m); if (audioRef.current) audioRef.current.muted = !muted; }}
          className="w-7 h-7 rounded-lg flex items-center justify-center transition-opacity hover:opacity-50"
          style={{ background: "transparent", border: "none", cursor: "pointer", color: "#888", flexShrink: 0 }}
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
      if (res.status === 402) {
        const data = await res.json();
        if (data.isMock) {
          toast({
            title: ar ? "مفتاح OpenAI مطلوب" : "OpenAI API key required",
            description: ar
              ? "أضف OPENAI_API_KEY في الإعدادات لتفعيل تنزيل الكتب الصوتية"
              : "Add your OPENAI_API_KEY in secrets to enable audiobook downloads",
            variant: "destructive",
          });
          return;
        }
      }
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
      if (res.status === 402) {
        const data = await res.json();
        if (data.isMock) {
          toast({
            title: ar ? "مفتاح OpenAI مطلوب" : "OpenAI API key required",
            description: ar
              ? "أضف OPENAI_API_KEY في الإعدادات لتفعيل تصدير الكتب الصوتية"
              : "Add your OPENAI_API_KEY in secrets to enable audiobook export",
            variant: "destructive",
          });
          return;
        }
      }
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
        .chapter-row:hover { background: #222 !important; }
      `}</style>

      <div className="min-h-screen" style={{ background: "#0a0a0a", color: "#f5f5f5" }}>


        {/* ── Header ── */}
        <div className="sticky top-0 z-30 backdrop-blur-xl" style={{ borderBottom: "1px solid #252525", background: "rgba(10,10,10,0.92)" }}>
          <div className="max-w-6xl mx-auto px-3 sm:px-6 h-14 flex items-center gap-2 sm:gap-4">
            <Link href={`/books/${bookId}`}>
              <button className="flex items-center gap-1.5 text-sm transition-opacity hover:opacity-50 font-medium" style={{ background: "none", border: "none", cursor: "pointer", color: "#888" }}>
                <ArrowLeft className="w-4 h-4" />
                <span className="hidden sm:inline">{ar ? "العودة للكتاب" : "Back to Book"}</span>
              </button>
            </Link>
            <div className="flex-1" />
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: "#fff" }}>
                <Headphones className="w-3.5 h-3.5 text-black" />
              </div>
              <span className="font-bold text-xs sm:text-sm" style={{ color: "#fff" }}>{ar ? "استوديو الكتاب الصوتي" : "Audiobook Studio"}</span>
            </div>
            <div className="flex-1" />
          </div>
        </div>

        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 sm:py-10 relative z-10">

          {/* ── Hero ── */}
          <div className="text-center mb-12 anim-fade-up">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full mb-4 text-[11px] font-bold tracking-widest uppercase"
              style={{ background: "#222222", border: "1px solid #222", color: "#888" }}>
              <Sparkles className="w-3 h-3" />
              {ar ? "مدعوم بالذكاء الاصطناعي" : "AI-Powered"}
            </div>
            <h1 className="text-2xl sm:text-4xl md:text-5xl font-black mb-3 leading-tight" style={{
              color: "#fff",
              letterSpacing: "-0.03em",
            }}>
              {ar ? `${book?.title || "..."} — استوديو` : `${book?.title || "Your Book"} — Audiobook`}
            </h1>
            <p className="text-sm max-w-xl mx-auto" style={{ color: "#666" }}>
              {ar
                ? "حوّل مخطوطتك إلى كتاب صوتي احترافي باستخدام أصوات ذكاء اصطناعي عالية الجودة"
                : "Transform your manuscript into a professional audiobook with high-quality AI voices"}
            </p>

            {/* Stats */}
            <div className="inline-flex flex-wrap items-center justify-center gap-3 sm:gap-6 mt-6 px-4 sm:px-6 py-3 rounded-2xl max-w-full" style={{ background: "#1a1a1a", border: "1px solid #252525" }}>
              <div className="text-center">
                <p className="text-2xl font-black" style={{ color: "#fff" }}>{chapters.length}</p>
                <p className="text-[11px] text-gray-400">{ar ? "فصل" : "Chapters"}</p>
              </div>
              <div className="w-px h-8" style={{ background: "#2a2a2a" }} />
              <div className="text-center">
                <p className="text-2xl font-black" style={{ color: "#fff" }}>{totalWords.toLocaleString()}</p>
                <p className="text-[11px] text-gray-400">{ar ? "كلمة" : "Words"}</p>
              </div>
              <div className="w-px h-8" style={{ background: "#2a2a2a" }} />
              <div className="text-center">
                <p className="text-2xl font-black" style={{ color: "#fff" }}>{fmtMin(estMinutes)}</p>
                <p className="text-[11px] text-gray-400">{ar ? "مدة تقديرية" : "Est. Duration"}</p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">

            {/* ── Left: Settings ── */}
            <div className="lg:col-span-2 space-y-4">

              {/* Voice Selection */}
              <div className="rounded-2xl p-5 anim-fade-up-1" style={{ background: "#111111", border: "1px solid #252525" }}>
                <div className="flex items-center gap-2 mb-4">
                  <Mic2 className="w-4 h-4" style={{ color: "#fff" }} />
                  <h3 className="text-sm font-bold">{ar ? "اختر الصوت" : "Choose Voice"}</h3>
                </div>

                {/* Gender filter tabs */}
                <div className="flex gap-1 mb-3 p-1 rounded-xl" style={{ background: "#1c1c1c" }}>
                  {(["all", "female", "male", "neutral"] as const).map(tab => {
                    const labels: Record<string, string> = { all: ar ? "الكل" : "All", female: ar ? "أنثى" : "Female", male: ar ? "ذكر" : "Male", neutral: ar ? "محايد" : "Neutral" };
                    return (
                      <button key={tab} onClick={() => setVoiceTab(tab)}
                        className="flex-1 py-1 rounded-lg text-xs font-semibold transition-all"
                        style={{
                          background: voiceTab === tab ? "#fff" : "transparent",
                          color: voiceTab === tab ? "#111" : "#666",
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
                          background: isSelected ? "#fff" : "#1a1a1a",
                          border: isSelected ? "1.5px solid #fff" : "1.5px solid #252525",
                          cursor: "pointer",
                          boxShadow: isSelected ? "0 4px 20px rgba(255,255,255,0.15)" : "none",
                        }}>
                        <div className="flex items-center gap-2 mb-0.5">
                          <span className="text-sm">{v.emoji}</span>
                          <span className="text-xs font-bold" style={{ color: isSelected ? "#111" : "#ccc" }}>{ar ? v.nameAr : v.name}</span>
                          {isSelected && <CheckCircle2 className="w-3 h-3 ml-auto text-black" style={{ flexShrink: 0 }} />}
                        </div>
                        <p className="text-[10px] leading-tight" style={{ color: isSelected ? "rgba(0,0,0,0.5)" : "#555" }}>
                          {ar ? v.accentAr : v.accent} · {ar ? v.toneAr : v.tone}
                        </p>
                      </button>
                    );
                  })}
                </div>

                {/* Selected voice badge */}
                <div className="mt-3 flex items-center gap-2 px-3 py-2 rounded-xl" style={{ background: "#1a1a1a", border: "1px solid #2a2a2a" }}>
                  <Radio className="w-3 h-3 text-gray-500" />
                  <span className="text-xs font-semibold text-gray-200">{ar ? voice.nameAr : voice.name}</span>
                  <span className="text-[10px] text-gray-500 ml-auto">{ar ? voice.toneAr : voice.tone}</span>
                </div>
              </div>

              {/* Quality & Speed */}
              <div className="rounded-2xl p-5 anim-fade-up-2" style={{ background: "#111111", border: "1px solid #252525" }}>
                <div className="flex items-center gap-2 mb-4">
                  <Gauge className="w-4 h-4 text-gray-300" />
                  <h3 className="text-sm font-bold">{ar ? "الجودة والسرعة" : "Quality & Speed"}</h3>
                </div>

                <div className="mb-4">
                  <label className="block text-[11px] font-bold mb-2 text-gray-400 uppercase tracking-wider">{ar ? "جودة الصوت" : "Audio Quality"}</label>
                  <div className="flex gap-2">
                    {(["tts-1", "tts-1-hd"] as const).map(q => (
                      <button key={q} onClick={() => setQuality(q)}
                        className="flex-1 py-2.5 rounded-xl text-xs font-bold transition-all"
                        style={{
                          background: quality === q ? "#fff" : "#1a1a1a",
                          color: quality === q ? "#111" : "#666",
                          border: quality === q ? "1px solid #fff" : "1px solid #252525",
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
              <div className="rounded-2xl p-5 anim-fade-up-3" style={{ background: "#111111", border: "1px solid #252525" }}>
                <div className="flex items-center gap-2 mb-3">
                  <Music2 className="w-4 h-4 text-gray-300" />
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
                    <div className="w-full rounded-full overflow-hidden" style={{ height: 5, background: "#222" }}>
                      <div className="h-full rounded-full transition-all" style={{ width: `${exportProgress.total > 0 ? (exportProgress.done / exportProgress.total) * 100 : 10}%`, background: "#fff", animation: "pulse 1.5s ease-in-out infinite" }} />
                    </div>
                  </div>
                )}

                <button
                  onClick={handleExport}
                  disabled={isExporting || activeChapters.length === 0}
                  className="w-full py-3 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-all hover:opacity-85"
                  style={{
                    background: isExporting ? "#333" : "#fff",
                    color: isExporting ? "#777" : "#111",
                    border: "none", cursor: isExporting ? "not-allowed" : "pointer",
                    boxShadow: isExporting ? "none" : "0 4px 24px rgba(255,255,255,0.15)",
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
              <div className="rounded-2xl overflow-hidden" style={{ border: "1px solid #252525" }}>
                {/* Header */}
                <div className="flex items-center gap-3 px-5 py-3.5" style={{ background: "#111111", borderBottom: "1px solid #252525" }}>
                  <Layers className="w-4 h-4 text-gray-500" />
                  <h3 className="text-sm font-bold text-gray-100">{ar ? "الفصول" : "Chapters"}</h3>
                  <span className="text-xs px-2 py-0.5 rounded-full font-semibold" style={{ background: "#222222", color: "#888" }}>{chapters.length}</span>
                  <div className="flex-1" />
                  <button
                    onClick={handleSelectAll}
                    className="text-xs px-3 py-1.5 rounded-lg transition-all font-semibold"
                    style={{
                      background: selectAll ? "#fff" : "#222",
                      color: selectAll ? "#111" : "#777",
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
                        <div key={chapter.id} style={{ borderBottom: "1px solid #1e1e1e" }}>
                          <div
                            className="chapter-row flex items-center gap-3 px-5 py-3.5 transition-colors"
                            style={{ background: isSelected ? "#181818" : "#111111" }}
                          >
                            {/* Checkbox */}
                            <button
                              onClick={() => toggleChapter(chapter.id)}
                              className="flex-shrink-0 transition-all hover:scale-110"
                              style={{ background: "none", border: "none", cursor: "pointer" }}
                            >
                              {isSelected
                                ? <CheckCircle2 className="w-5 h-5" style={{ color: "#fff" }} />
                                : <Circle className="w-5 h-5 text-gray-300" />}
                            </button>

                            {/* Index */}
                            <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 text-xs font-bold"
                              style={{ background: isSelected ? "#fff" : "#2a2a2a", color: isSelected ? "#111" : "#666" }}>
                              {idx + 1}
                            </div>

                            {/* Title + meta */}
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-semibold truncate" style={{ color: isSelected ? "#f5f5f5" : "#555" }}>
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
                                background: stale ? "#2a2000" : preview ? "#1a1a1a" : "#1a1a1a",
                                color: stale ? "#e6b800" : preview ? "#ddd" : "#666",
                                border: stale ? "1px solid #7a5c00" : preview ? "1px solid #333" : "1px solid #2a2a2a",
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
                              className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 transition-all hover:bg-gray-800"
                              style={{
                                background: "transparent",
                                border: "1px solid #252525",
                                cursor: isDownloading ? "not-allowed" : "pointer",
                                color: "#888",
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
                                className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 transition-all hover:bg-gray-800"
                                style={{ background: "transparent", border: "1px solid #252525", cursor: "pointer", color: "#666" }}
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
                                voiceId={selectedVoice}
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
                  <div key={tip.title} className="p-4 rounded-xl transition-all hover:shadow-sm" style={{ background: "#111111", border: "1px solid #252525" }}>
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
