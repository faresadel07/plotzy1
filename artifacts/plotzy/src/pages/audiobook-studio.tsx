import { useState, useRef, useEffect } from "react";
import { useRoute, Link } from "wouter";
import { useBook } from "@/hooks/use-books";
import { useChapters } from "@/hooks/use-chapters";
import { useLanguage } from "@/contexts/language-context";
import { useToast } from "@/hooks/use-toast";
import { SEO } from "@/components/SEO";
import {
  ArrowLeft, Play, Pause, Download, Loader2, Mic2, Music2,
  Volume2, VolumeX, CheckCircle2, Circle, ChevronDown, ChevronUp,
  Headphones, Sparkles, Radio, Layers, BookOpen,
} from "lucide-react";
import { Mark } from "@/components/mobile/Marker";
import { StickyNote } from "@/components/mobile/StickyNote";
import { PaperBall } from "@/components/mobile/PaperBall";

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

// Piper TTS voice catalogue. Backed by self-hosted Piper neural
// voices on the api-server. English (American + British) plus an
// Arabic Jordanian voice. Voice IDs map to the entries in
// artifacts/api-server/src/lib/piper-tts.ts > PIPER_VOICES.
const VOICES: VoiceOption[] = [
  { id: "ryan",    name: "Ryan",    nameAr: "رايان",  gender: "Male",   accent: "American",  accentAr: "أمريكي",  tone: "Warm",         toneAr: "دافئ",         emoji: "" },
  { id: "sophie",  name: "Sophie",  nameAr: "صوفي",  gender: "Female", accent: "American",  accentAr: "أمريكي",  tone: "Clear",        toneAr: "واضح",         emoji: "" },
  { id: "jenny",   name: "Jenny",   nameAr: "جيني",  gender: "Female", accent: "British",   accentAr: "بريطاني", tone: "Storytelling", toneAr: "حكاية وسرد",  emoji: "" },
  { id: "james",   name: "James",   nameAr: "جيمس",  gender: "Male",   accent: "British",   accentAr: "بريطاني", tone: "Northern",     toneAr: "بريطاني شمالي", emoji: "" },
  { id: "kareem",  name: "Kareem",  nameAr: "كريم",  gender: "Male",   accent: "Jordanian", accentAr: "أردني",   tone: "Clear",        toneAr: "واضح",         emoji: "" },
];

// ── Helpers ──────────────────────────────────────────────────────────────────

function htmlToPlain(html: string): string {
  const div = document.createElement("div");
  div.innerHTML = html;
  return (div.textContent || "").replace(/\s+/g, " ").trim();
}

function extractChapterText(content: string): string {
  try {
    const parsed = JSON.parse(content);
    // v2 format: { v: 2, pages: "<p>html…<!-- PAGE_BREAK -->…" } — one
    // HTML string. Without this branch the studio narrated raw JSON.
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed) && typeof (parsed as any).pages === "string") {
      return htmlToPlain((parsed as any).pages.split("<!-- PAGE_BREAK -->").join(" "));
    }
    if (Array.isArray(parsed)) {
      return parsed.map((b: unknown) => {
        if (typeof b === "string") return b;
        if (b && typeof b === "object" && "content" in b) return (b as { content: string }).content;
        return "";
      }).join(" ").trim();
    }
  } catch { }
  // Plain text or legacy HTML
  return content.includes("<") ? htmlToPlain(content) : content.trim();
}

function countWords(text: string) {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

function estimateMinutes(words: number) {
  const wpm = 150;
  return Math.max(0.5, words / wpm);
}

function fmtMin(min: number, ar = false) {
  if (min < 1) return ar ? "أقل من دقيقة" : "< 1 min";
  const h = Math.floor(min / 60);
  const m = Math.round(min % 60);
  if (ar) return h > 0 ? `${h} س ${m} د` : `${m} دقيقة`;
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
            background: "#7b5e3b",
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
  ryan:   { pitch: 0.95, rateOffset:  0.00, preferName: "david" },    // warm American
  sophie: { pitch: 1.20, rateOffset:  0.00, preferName: "samantha" }, // clear American
  jenny:  { pitch: 1.10, rateOffset: -0.10, preferName: "karen" },    // British storyteller
  james:  { pitch: 0.80, rateOffset: -0.05, preferName: "daniel" },   // Northern British
  kareem: { pitch: 0.92, rateOffset: -0.05 },                         // Jordanian, clear
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
    // Surface decode failures: Edge TTS occasionally produces a valid-
    // looking MP3 that the browser can't open (e.g. when the chosen
    // English voice reads pure Arabic — the audio comes back near-
    // silent and some Chromium versions reject it). Without this
    // handler the play button just toggles state with no sound and
    // no clue why.
    const onError = () => {
      const err = el.error;
      console.error("[audio] playback error", { code: err?.code, message: err?.message, src: el.currentSrc?.slice(0, 80) });
      setPlaying(false);
    };
    el.addEventListener("ended", onEnded);
    el.addEventListener("timeupdate", onTime);
    el.addEventListener("error", onError);
    return () => {
      el.removeEventListener("ended", onEnded);
      el.removeEventListener("timeupdate", onTime);
      el.removeEventListener("error", onError);
    };
  }, [isMock]);

  // Click or drag on the progress bar to seek to that position. We
  // resolve the bar's bounding rect from a real DOM ref (not the
  // React synthetic event's currentTarget, which gets nulled when
  // the event is recycled — that was the bug in the previous pass:
  // mousemove handlers fired AFTER the event pool reuse and read
  // null currentTarget, silently no-op'ing every drag).
  const seekBarRef = useRef<HTMLDivElement>(null);
  const seekToClientX = (clientX: number) => {
    const el = audioRef.current;
    const bar = seekBarRef.current;
    if (!el || !bar) return;
    if (!Number.isFinite(el.duration) || el.duration <= 0) return;
    const rect = bar.getBoundingClientRect();
    const pct = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
    el.currentTime = pct * el.duration;
    setProgress(pct * 100);
  };

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
    <div className="flex items-center gap-3 mt-2 p-3 rounded-xl" style={{ background: "#f7f1e2", border: "1px solid rgba(66,53,33,0.12)" }}>
      {!isMock && <audio ref={audioRef} src={dataUrl} preload="auto" muted={muted} />}
      <button
        onClick={toggle}
        className="w-8 h-8 rounded-full flex items-center justify-center transition-all hover:scale-110"
        style={{ background: "#292115", border: "none", cursor: "pointer", flexShrink: 0 }}
      >
        {playing ? <Pause className="w-3.5 h-3.5" style={{ color: "#f4efe2" }} /> : <Play className="w-3.5 h-3.5" style={{ color: "#f4efe2", marginLeft: 1 }} />}
      </button>

      <WaveformBars playing={playing} />

      <div className="flex-1 min-w-0">
        {/* Scrubbable progress bar. Click anywhere to seek; held-down
            drag scrubs continuously. Hit-target padded vertically so
            users don't have to click the 3px-tall track exactly. The
            visible track stays thin so the player still looks subtle.
            Disabled (no cursor change) for browser TTS / mock mode
            because SpeechSynthesis can't seek to a position. */}
        {isMock ? (
          <div className="w-full rounded-full overflow-hidden" style={{ height: 3, background: "rgba(66,53,33,0.15)" }}>
            <div className="h-full rounded-full transition-all" style={{ width: `${progress}%`, background: "#7b5e3b" }} />
          </div>
        ) : (
          <div
            ref={seekBarRef}
            role="slider"
            aria-label="Seek"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={Math.round(progress)}
            tabIndex={0}
            onMouseDown={(e) => {
              // Initial seek on click + attach window-level listeners
              // for drag scrubbing. Window listeners survive the user
              // moving the cursor outside the bar mid-drag, which the
              // previous element-scoped handlers did not.
              seekToClientX(e.clientX);
              const onMove = (mv: MouseEvent) => {
                mv.preventDefault();
                seekToClientX(mv.clientX);
              };
              const onUp = () => {
                window.removeEventListener("mousemove", onMove);
                window.removeEventListener("mouseup", onUp);
              };
              window.addEventListener("mousemove", onMove);
              window.addEventListener("mouseup", onUp);
            }}
            onTouchStart={(e) => {
              const t = e.touches[0];
              if (!t) return;
              seekToClientX(t.clientX);
            }}
            onTouchMove={(e) => {
              const t = e.touches[0];
              if (!t) return;
              seekToClientX(t.clientX);
            }}
            className="w-full rounded-full"
            style={{ height: 14, padding: "5.5px 0", cursor: "pointer", touchAction: "none", userSelect: "none" }}
          >
            <div className="w-full rounded-full overflow-hidden relative" style={{ height: 3, background: "rgba(66,53,33,0.15)" }}>
              <div className="h-full rounded-full" style={{ width: `${progress}%`, background: "#7b5e3b", transition: playing ? "width 0.1s linear" : "none" }} />
            </div>
          </div>
        )}
        {isMock && (
          <p className="text-[10px] mt-1" style={{ color: "#8a8070" }}>{"Quick browser preview"}</p>
        )}
      </div>

      {!isMock && (
        <button
          onClick={() => { setMuted(m => !m); if (audioRef.current) audioRef.current.muted = !muted; }}
          className="w-7 h-7 rounded-lg flex items-center justify-center transition-opacity hover:opacity-50"
          style={{ background: "transparent", border: "none", cursor: "pointer", color: "#6d6354", flexShrink: 0 }}
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

  const [selectedVoice, setSelectedVoice] = useState("ryan");
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
  const estMinutes = estimateMinutes(activeWords);

  const toggleChapter = (id: number) => {
    setSelectedChapterIds(prev => {
      // Leaving "select all" seeds the set with every chapter first, so
      // unticking one keeps the rest selected instead of dropping them.
      const next = selectAll ? new Set(chapterList.map(c => c.id)) : new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
    setSelectAll(false);
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
        body: JSON.stringify({ chapterId, voice: selectedVoice }),
      });
      if (!res.ok) {
        // For admins, the server includes a `debug.error` field with the
        // actual Piper / ffmpeg stderr. Surface it in the toast so we can
        // see what's wrong without ssh-ing into Railway logs.
        let detail = "";
        try {
          const body = await res.json() as {
            message?: string;
            debug?: { error?: string };
          };
          detail = body?.debug?.error || body?.message || "";
        } catch {
          /* response not JSON; leave detail blank */
        }
        throw new Error(detail || "Preview failed");
      }
      const data = await res.json() as { audio: string; mimeType: string; isMock?: boolean };
      const chapterText = chapterList.find(c => c.id === chapterId)?.text;
      setPreviews(p => ({ ...p, [chapterId]: { ...data, text: chapterText, voice: selectedVoice } }));
      setExpandedChapters(prev => new Set([...prev, chapterId]));
    } catch (err) {
      const detail = err instanceof Error ? err.message : "";
      toast({
        title: ar ? "فشل المعاينة" : "Preview failed",
        description: detail && detail !== "Preview failed"
          ? detail
          : (ar ? "حدث خطأ أثناء توليد الصوت" : "Could not generate audio preview"),
        variant: "destructive",
      });
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
        body: JSON.stringify({ voice: selectedVoice, chapterIds: [chapterId] }),
      });
      if (res.status === 402) {
        const data = await res.json();
        if (data.isMock) {
          toast({
            title: ar ? "محرك الصوت غير مفعل" : "Voice engine not enabled",
            description: ar
              ? "خدمة توليد الصوت غير مفعلة على الخادم حالياً"
              : "The audio engine is not enabled on the server right now",
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
        body: JSON.stringify({ voice: selectedVoice, chapterIds: chapIds }),
      });
      if (res.status === 402) {
        const data = await res.json();
        if (data.isMock) {
          toast({
            title: ar ? "محرك الصوت غير مفعل" : "Voice engine not enabled",
            description: ar
              ? "خدمة توليد الصوت غير مفعلة على الخادم حالياً"
              : "The audio engine is not enabled on the server right now",
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
      <SEO title="Audiobook Studio" noindex />
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
        .chapter-row:hover { background: #f7f1e2 !important; }
      `}</style>

      <div className="min-h-screen" style={{ background: "#f4efe2", color: "#2f2618" }}>


        {/* ── Header ── */}
        <div className="sticky top-0 z-30 backdrop-blur-xl" style={{ borderBottom: "1px solid rgba(66,53,33,0.14)", background: "rgba(244,239,226,0.94)" }}>
          <div className="max-w-6xl mx-auto px-3 sm:px-6 h-14 flex items-center gap-2 sm:gap-4">
            <Link href={`/books/${bookId}`}>
              <button className="flex items-center gap-1.5 text-sm transition-opacity hover:opacity-50 font-medium" style={{ background: "none", border: "none", cursor: "pointer", color: "#5c5142" }}>
                <ArrowLeft className="w-4 h-4" />
                <span className="hidden sm:inline">{ar ? "العودة للكتاب" : "Back to Book"}</span>
              </button>
            </Link>
            <div className="flex-1" />
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: "#292115" }}>
                <Headphones className="w-3.5 h-3.5" style={{ color: "#f4efe2" }} />
              </div>
              <span className="font-bold text-xs sm:text-sm" style={{ color: "#2f2618", fontFamily: "'Lora', 'Amiri', Georgia, serif" }}>{ar ? "استوديو الكتاب الصوتي" : "Audiobook Studio"}</span>
            </div>
            <div className="flex-1" />
          </div>
        </div>

        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 sm:py-10 relative z-10">

          {/* ── Hero ── */}
          <div className="text-center mb-12 anim-fade-up">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full mb-4 text-[11px] font-bold tracking-widest uppercase"
              style={{ background: "rgba(66,53,33,0.07)", border: "1px solid rgba(66,53,33,0.16)", color: "#6d6354", fontFamily: "'Courier New', 'Noto Naskh Arabic', monospace" }}>
              <Sparkles className="w-3 h-3" />
              {ar ? "مدعوم بالذكاء الاصطناعي" : "AI-Powered"}
            </div>
            <h1 className="text-2xl sm:text-4xl md:text-5xl font-bold mb-3 leading-tight" style={{
              color: "#2f2618",
              letterSpacing: "-0.01em",
              fontFamily: "'Lora', 'Amiri', Georgia, serif",
            }}>
              {book?.title || (ar ? "كتابك" : "Your Book")} · <Mark ar={ar}>{ar ? "مسموع" : "Audiobook"}</Mark>
            </h1>
            <p className="text-sm max-w-xl mx-auto" style={{ color: "#6d6354" }}>
              {ar
                ? "حوّل مخطوطتك إلى كتاب صوتي احترافي بأصوات ذكاء اصطناعي عالية الجودة"
                : "Transform your manuscript into a professional audiobook with high quality AI voices"}
            </p>
            <p className="mt-1" style={{ fontFamily: "'Caveat', 'Aref Ruqaa', cursive", fontSize: ar ? 14.5 : 17, color: "#8a8070", transform: "rotate(-0.5deg)", display: "inline-block" }}>
              {ar ? "(اكتب كتابك، وخليه هو يحكيلك ياه)" : "(you wrote it, now let it read itself to you)"}
            </p>

            {/* Stats */}
            <div className="inline-flex flex-wrap items-center justify-center gap-3 sm:gap-6 mt-6 px-4 sm:px-6 py-3 rounded-2xl max-w-full" style={{ background: "#fffdf7", border: "1px solid rgba(66,53,33,0.14)", boxShadow: "0 10px 26px -18px rgba(41,33,21,0.35)" }}>
              <div className="text-center">
                <p className="text-2xl font-bold" style={{ color: "#2f2618", fontFamily: "'Lora', 'Amiri', Georgia, serif" }}>{chapters.length}</p>
                <p className="text-[11px]" style={{ color: "#7b7366" }}>{ar ? "فصل" : "Chapters"}</p>
              </div>
              <div className="w-px h-8" style={{ background: "rgba(66,53,33,0.15)" }} />
              <div className="text-center">
                <p className="text-2xl font-bold" style={{ color: "#2f2618", fontFamily: "'Lora', 'Amiri', Georgia, serif" }}>{totalWords.toLocaleString()}</p>
                <p className="text-[11px]" style={{ color: "#7b7366" }}>{ar ? "كلمة" : "Words"}</p>
              </div>
              <div className="w-px h-8" style={{ background: "rgba(66,53,33,0.15)" }} />
              <div className="text-center">
                <p className="text-2xl font-bold" style={{ color: "#2f2618", fontFamily: "'Lora', 'Amiri', Georgia, serif" }}>{fmtMin(estMinutes, ar)}</p>
                <p className="text-[11px]" style={{ color: "#7b7366" }}>{ar ? "مدة تقديرية" : "Est. Duration"}</p>
              </div>
            </div>
          </div>

          {/* Desk clutter between hero and the working area: normal
              flow, pointer-transparent, physically cannot cover copy */}
          <div aria-hidden className="flex items-end justify-between -mt-6 mb-2" style={{ pointerEvents: "none" }}>
            <PaperBall size={30} rot={-16} />
            <StickyNote ar={ar} size={92} rot={4} text={ar ? "جرب صوت كريم بالعربي" : "try Kareem for Arabic"} />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">

            {/* ── Left: Settings ── */}
            <div className="lg:col-span-2 space-y-4">

              {/* Voice Selection */}
              <div className="rounded-2xl p-5 anim-fade-up-1" style={{ background: "#fffdf7", border: "1px solid rgba(66,53,33,0.14)" }}>
                <div className="flex items-center gap-2 mb-2">
                  <Mic2 className="w-4 h-4" style={{ color: "#7b5e3b" }} />
                  <h3 className="text-sm font-bold" style={{ fontFamily: "'Lora', 'Amiri', Georgia, serif" }}>{ar ? "اختر الصوت" : "Choose Voice"}</h3>
                </div>

                {/* Gender filter tabs */}
                <div className="flex gap-1 mb-3 p-1 rounded-xl" style={{ background: "rgba(66,53,33,0.07)" }}>
                  {(["all", "female", "male"] as const).map(tab => {
                    const labels: Record<string, string> = { all: ar ? "الكل" : "All", female: ar ? "أنثى" : "Female", male: ar ? "ذكر" : "Male" };
                    return (
                      <button key={tab} onClick={() => setVoiceTab(tab)}
                        className="flex-1 py-1 rounded-lg text-xs font-semibold transition-all"
                        style={{
                          background: voiceTab === tab ? "#292115" : "transparent",
                          color: voiceTab === tab ? "#f7f2e4" : "#6d6354",
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
                          background: isSelected ? "#292115" : "#f7f1e2",
                          border: isSelected ? "1.5px solid #292115" : "1.5px solid rgba(66,53,33,0.14)",
                          cursor: "pointer",
                          boxShadow: isSelected ? "0 6px 18px -6px rgba(41,33,21,0.45)" : "none",
                        }}>
                        <div className="flex items-center gap-2 mb-0.5">
                          <span className="text-sm">{v.emoji}</span>
                          <span className="text-xs font-bold" style={{ color: isSelected ? "#f7f2e4" : "#423521" }}>{ar ? v.nameAr : v.name}</span>
                          {isSelected && <CheckCircle2 className="w-3 h-3 ml-auto" style={{ flexShrink: 0, color: "#f4efe2" }} />}
                        </div>
                        <p className="text-[10px] leading-tight" style={{ color: isSelected ? "rgba(244,239,226,0.75)" : "#8a8070" }}>
                          {ar ? v.accentAr : v.accent} · {ar ? v.toneAr : v.tone}
                        </p>
                      </button>
                    );
                  })}
                </div>

                {/* Selected voice badge */}
                <div className="mt-3 flex items-center gap-2 px-3 py-2 rounded-xl" style={{ background: "rgba(66,53,33,0.05)", border: "1px solid rgba(66,53,33,0.12)" }}>
                  <Radio className="w-3 h-3" style={{ color: "#a06a2f" }} />
                  <span className="text-xs font-semibold" style={{ color: "#2f2618" }}>{ar ? voice.nameAr : voice.name}</span>
                  <span className="text-[10px] ml-auto" style={{ color: "#8a8070", fontFamily: "'Caveat', 'Aref Ruqaa', cursive", fontSize: 13 }}>{ar ? voice.toneAr : voice.tone}</span>
                </div>
              </div>

              {/* Export button */}
              <div className="rounded-2xl p-5 anim-fade-up-3" style={{ background: "#fffdf7", border: "1px solid rgba(66,53,33,0.14)" }}>
                <div className="flex items-center gap-2 mb-3">
                  <Music2 className="w-4 h-4" style={{ color: "#7b5e3b" }} />
                  <h3 className="text-sm font-bold" style={{ fontFamily: "'Lora', 'Amiri', Georgia, serif" }}>{ar ? "التصدير النهائي" : "Final Export"}</h3>
                </div>

                <div className="space-y-1.5 mb-4 text-xs" style={{ color: "#7b7366" }}>
                  <div className="flex justify-between"><span>{ar ? "الفصول" : "Chapters"}</span><span className="font-semibold" style={{ color: "#2f2618" }}>{activeChapters.length}</span></div>
                  <div className="flex justify-between"><span>{ar ? "الكلمات" : "Words"}</span><span className="font-semibold" style={{ color: "#2f2618" }}>{activeWords.toLocaleString()}</span></div>
                  <div className="flex justify-between"><span>{ar ? "المدة التقديرية" : "Est. Duration"}</span><span className="font-bold" style={{ color: "#2f2618" }}>{fmtMin(estMinutes, ar)}</span></div>
                  <div className="flex justify-between"><span>{ar ? "الصوت" : "Voice"}</span><span className="font-semibold" style={{ color: "#2f2618" }}>{ar ? voice.nameAr : voice.name}</span></div>
                  <div className="flex justify-between"><span>{ar ? "الصيغة" : "Format"}</span><span className="font-semibold" style={{ color: "#2f2618" }}>MP3</span></div>
                </div>

                {isExporting && exportProgress && (
                  <div className="mb-3">
                    <div className="flex justify-between text-xs mb-1" style={{ color: "#7b7366" }}>
                      <span>{ar ? "جاري المعالجة..." : "Processing..."}</span>
                      <span>{exportProgress.done}/{exportProgress.total}</span>
                    </div>
                    <div className="w-full rounded-full overflow-hidden" style={{ height: 5, background: "rgba(66,53,33,0.12)" }}>
                      <div className="h-full rounded-full transition-all" style={{ width: `${exportProgress.total > 0 ? (exportProgress.done / exportProgress.total) * 100 : 10}%`, background: "#7b5e3b", animation: "pulse 1.5s ease-in-out infinite" }} />
                    </div>
                  </div>
                )}

                <button
                  onClick={handleExport}
                  disabled={isExporting || activeChapters.length === 0}
                  className="w-full py-3 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-all hover:opacity-85"
                  style={{
                    background: isExporting ? "rgba(66,53,33,0.15)" : "#292115",
                    color: isExporting ? "#8a8070" : "#f4efe2",
                    border: "none", cursor: isExporting ? "not-allowed" : "pointer",
                    boxShadow: isExporting ? "none" : "0 6px 20px -8px rgba(41,33,21,0.5)",
                  }}
                >
                  {isExporting
                    ? <><Loader2 className="w-4 h-4 animate-spin" />{ar ? "جاري التصدير..." : "Exporting..."}</>
                    : <><Download className="w-4 h-4" />{ar ? "تحميل الكتاب الصوتي كاملاً" : "Download Full Audiobook"}</>}
                </button>
                <p className="text-[10px] text-center mt-2" style={{ color: "#8a8070" }}>
                  {ar ? "ملف MP3 مع بيانات وصفية احترافية" : "MP3 file with professional metadata"}
                </p>
              </div>
            </div>

            {/* ── Right: Chapter List ── */}
            <div className="lg:col-span-3 anim-fade-up-4">
              <div className="rounded-2xl overflow-hidden" style={{ border: "1px solid rgba(66,53,33,0.14)", background: "#fffdf7" }}>
                {/* Header */}
                <div className="flex items-center gap-3 px-5 py-3.5" style={{ background: "#fffdf7", borderBottom: "1px solid rgba(66,53,33,0.12)" }}>
                  <Layers className="w-4 h-4" style={{ color: "#7b5e3b" }} />
                  <h3 className="text-sm font-bold" style={{ color: "#2f2618", fontFamily: "'Lora', 'Amiri', Georgia, serif" }}>{ar ? "الفصول" : "Chapters"}</h3>
                  <span className="text-xs px-2 py-0.5 rounded-full font-semibold" style={{ background: "rgba(66,53,33,0.08)", color: "#5c5142" }}>{chapters.length}</span>
                  <div className="flex-1" />
                  <button
                    onClick={handleSelectAll}
                    className="text-xs px-3 py-1.5 rounded-lg transition-all font-semibold"
                    style={{
                      background: selectAll ? "#292115" : "rgba(66,53,33,0.08)",
                      color: selectAll ? "#f7f2e4" : "#5c5142",
                      border: "none", cursor: "pointer",
                    }}
                  >
                    {ar ? "تحديد الكل" : "Select All"}
                  </button>
                </div>

                {/* Rows */}
                {chapterList.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-16">
                    <BookOpen className="w-10 h-10 mb-3" style={{ color: "#b9ad99" }} />
                    <p className="text-sm" style={{ color: "#8a8070", fontFamily: "'Caveat', 'Aref Ruqaa', cursive", fontSize: ar ? 15 : 18 }}>
                      {ar ? "(لا فصول بعد، اكتب أول فصل وارجع)" : "(no chapters yet, write one and come back)"}
                    </p>
                  </div>
                ) : (
                  <div>
                    {chapterList.map((chapter, idx) => {
                      const isSelected = selectAll || selectedChapterIds.has(chapter.id);
                      const isExpanded = expandedChapters.has(chapter.id);
                      const words = countWords(chapter.text);
                      const dur = fmtMin(estimateMinutes(words), ar);
                      const preview = previews[chapter.id];
                      const isLoadingPreview = previewLoading[chapter.id];
                      const isDownloading = downloadingChapter[chapter.id];
                      const stale = preview && preview.voice !== selectedVoice;

                      return (
                        <div key={chapter.id} style={{ borderBottom: "1px solid rgba(66,53,33,0.09)" }}>
                          <div
                            className="chapter-row flex items-center gap-3 px-5 py-3.5 transition-colors"
                            style={{ background: isSelected ? "rgba(122,94,59,0.06)" : "#fffdf7" }}
                          >
                            {/* Checkbox */}
                            <button
                              onClick={() => toggleChapter(chapter.id)}
                              className="flex-shrink-0 transition-all hover:scale-110"
                              style={{ background: "none", border: "none", cursor: "pointer" }}
                            >
                              {isSelected
                                ? <CheckCircle2 className="w-5 h-5" style={{ color: "#7b5e3b" }} />
                                : <Circle className="w-5 h-5" style={{ color: "#b9ad99" }} />}
                            </button>

                            {/* Index */}
                            <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 text-xs font-bold"
                              style={{ background: isSelected ? "#292115" : "rgba(66,53,33,0.08)", color: isSelected ? "#f7f2e4" : "#6d6354", fontFamily: "'Lora', 'Amiri', Georgia, serif" }}>
                              {idx + 1}
                            </div>

                            {/* Title + meta */}
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-semibold truncate" style={{ color: isSelected ? "#2f2618" : "#8a8070" }}>
                                {chapter.title || `Chapter ${idx + 1}`}
                              </p>
                              <p className="text-[11px] mt-0.5" style={{ color: "#8a8070" }}>
                                {words.toLocaleString()} {ar ? "كلمة" : "words"} · {dur}
                              </p>
                            </div>

                            {/* Preview button */}
                            <button
                              onClick={() => handlePreview(chapter.id)}
                              disabled={isLoadingPreview}
                              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all flex-shrink-0"
                              style={{
                                background: stale ? "rgba(160,106,47,0.12)" : "rgba(66,53,33,0.06)",
                                color: stale ? "#a06a2f" : preview ? "#423521" : "#6d6354",
                                border: stale ? "1px solid rgba(160,106,47,0.4)" : "1px solid rgba(66,53,33,0.14)",
                                cursor: isLoadingPreview ? "not-allowed" : "pointer",
                              }}
                              title={stale ? (ar ? "الصوت تغير، أعد المعاينة" : "Voice changed. Regenerate preview") : undefined}
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
                              className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 transition-all hover:bg-[#f0e9d8]"
                              style={{
                                background: "transparent",
                                border: "1px solid rgba(66,53,33,0.16)",
                                cursor: isDownloading ? "not-allowed" : "pointer",
                                color: "#5c5142",
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
                                className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 transition-all hover:bg-[#f0e9d8]"
                                style={{ background: "transparent", border: "1px solid rgba(66,53,33,0.16)", cursor: "pointer", color: "#6d6354" }}
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
              <div aria-hidden className="flex justify-start mt-3 -mb-1" style={{ pointerEvents: "none" }}>
                <PaperBall size={22} rot={24} />
              </div>
              <div className="mt-4 grid grid-cols-3 gap-3">
                {[
                  { icon: "", title: ar ? "أصوات احترافية" : "Pro Voices",        desc: ar ? "خمسة أصوات بشرية الطابع" : "Five human-sounding voices" },
                  { icon: "", title: ar ? "تحميل فصل بفصل" : "Chapter Downloads", desc: ar ? "شارك فصلاً واحداً مستقلاً" : "Share any single chapter" },
                  { icon: "", title: ar ? "تصدير MP3" : "MP3 Export",             desc: ar ? "جودة عالية مع بيانات وصفية" : "High quality with metadata" },
                ].map(tip => (
                  <div key={tip.title} className="p-4 rounded-xl transition-all hover:shadow-sm" style={{ background: "#fffdf7", border: "1px solid rgba(66,53,33,0.14)" }}>
                    <p className="text-xs font-bold" style={{ color: "#2f2618", fontFamily: "'Lora', 'Amiri', Georgia, serif" }}>{tip.title}</p>
                    <p className="text-[11px] mt-1" style={{ color: "#7b7366", fontFamily: "'Caveat', 'Aref Ruqaa', cursive", fontSize: ar ? 12.5 : 14.5 }}>{tip.desc}</p>
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
