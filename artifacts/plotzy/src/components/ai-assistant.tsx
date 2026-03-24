import { useState, useRef, useEffect } from "react";
import {
  Sparkles, X, Loader2, Wand2, ChevronRight, Languages,
  RotateCcw, Copy, Check, Feather, Lightbulb, ArrowRight,
} from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/contexts/language-context";
import { cn } from "@/lib/utils";

interface AIAssistantProps {
  bookId?: number;
  currentContent: string;
  onApply: (text: string) => void;
  onClose: () => void;
}

type Mode = "polish" | "expand" | "continue" | "rewrite" | "translate";

const MODES: { id: Mode; icon: React.ReactNode; labelEn: string; labelAr: string; descEn: string; descAr: string; color: string }[] = [
  {
    id: "polish",
    icon: <Wand2 className="w-4 h-4" />,
    labelEn: "Polish",
    labelAr: "تلميع",
    descEn: "Fix grammar & elevate style in any language",
    descAr: "صحّح القواعد وارتقِ بالأسلوب بأي لغة",
    color: "text-violet-500",
  },
  {
    id: "expand",
    icon: <Lightbulb className="w-4 h-4" />,
    labelEn: "Expand",
    labelAr: "توسيع",
    descEn: "Turn an idea into rich prose",
    descAr: "حوّل فكرة إلى نثر أدبي متكامل",
    color: "text-amber-500",
  },
  {
    id: "continue",
    icon: <ChevronRight className="w-4 h-4" />,
    labelEn: "Continue",
    labelAr: "متابعة",
    descEn: "Keep the story going naturally",
    descAr: "أكمل السرد بشكل طبيعي ومتناسق",
    color: "text-blue-500",
  },
  {
    id: "rewrite",
    icon: <RotateCcw className="w-4 h-4" />,
    labelEn: "Rewrite",
    labelAr: "إعادة صياغة",
    descEn: "New words, same meaning",
    descAr: "مفردات جديدة، معنى واحد",
    color: "text-emerald-500",
  },
  {
    id: "translate",
    icon: <Languages className="w-4 h-4" />,
    labelEn: "Translate",
    labelAr: "ترجمة",
    descEn: "Switch languages seamlessly",
    descAr: "انتقل بين اللغات بسلاسة",
    color: "text-rose-500",
  },
];

const TRANSLATE_LANGS = [
  { code: "ar", label: "العربية" },
  { code: "en", label: "English" },
  { code: "fr", label: "Français" },
  { code: "es", label: "Español" },
  { code: "de", label: "Deutsch" },
  { code: "it", label: "Italiano" },
  { code: "pt", label: "Português" },
  { code: "tr", label: "Türkçe" },
  { code: "ru", label: "Русский" },
  { code: "zh", label: "中文" },
  { code: "ja", label: "日本語" },
  { code: "ko", label: "한국어" },
];

function wordCount(text: string) {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

export function AIAssistant({ bookId, currentContent, onApply, onClose }: AIAssistantProps) {
  const { lang } = useLanguage();
  const { toast } = useToast();
  const ar = lang === "ar";

  const [mode, setMode] = useState<Mode>("polish");
  const [inputText, setInputText] = useState(currentContent);
  const [output, setOutput] = useState("");
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [targetLang, setTargetLang] = useState(ar ? "en" : "ar");

  const activeMode = MODES.find(m => m.id === mode)!;
  const outputRef = useRef<HTMLDivElement>(null);

  const needsInput = mode === "expand";

  /* ─── When mode changes, pre-fill or clear input ─── */
  useEffect(() => {
    if (mode === "expand") {
      setInputText("");
    } else {
      setInputText(currentContent);
    }
    setOutput("");
  }, [mode, currentContent]);

  /* ─── Generate ─── */
  const generate = async () => {
    const text = inputText.trim();
    if (!text) {
      toast({ title: ar ? "أدخل نصاً أولاً" : "Please enter some text first", variant: "destructive" });
      return;
    }
    setLoading(true);
    setOutput("");
    try {
      if (mode === "polish") {
        const res = await apiRequest("POST", "/api/improve-text", { text, language: lang, bookId });
        const data = await res.json();
        setOutput(data.improvedText || "");
      } else if (mode === "expand") {
        const res = await apiRequest("POST", "/api/expand-idea", { idea: text, language: lang, bookId });
        const data = await res.json();
        setOutput(data.expandedText || "");
      } else if (mode === "continue") {
        const res = await apiRequest("POST", "/api/continue-text", { text, language: lang, bookId });
        const data = await res.json();
        setOutput(data.continuedText || "");
      } else if (mode === "rewrite") {
        const res = await apiRequest("POST", "/api/rewrite-text", { text, language: lang });
        const data = await res.json();
        setOutput(data.rewrittenText || "");
      } else if (mode === "translate") {
        const res = await apiRequest("POST", "/api/translate-text", { text, targetLanguage: targetLang, bookId });
        const data = await res.json();
        setOutput(data.translatedText || "");
      }
      setTimeout(() => outputRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" }), 100);
    } catch {
      toast({ title: ar ? "فشل الطلب — تحقق من مفتاح OpenAI" : "Request failed — check OpenAI key", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const copyOutput = () => {
    navigator.clipboard.writeText(output);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const applyOutput = () => {
    if (mode === "continue") {
      onApply(inputText + "\n\n" + output);
    } else {
      onApply(output);
    }
    toast({ title: ar ? "✓ تم تطبيق النص" : "✓ Applied to editor" });
    onClose();
  };

  const inputWc  = wordCount(inputText);
  const outputWc = wordCount(output);

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-16 p-4 bg-black/50 backdrop-blur-md" onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div
        className="relative w-full max-w-2xl max-h-[92vh] flex flex-col rounded-3xl shadow-2xl overflow-hidden"
        style={{
          background: "hsl(var(--card))",
          border: "1px solid hsl(var(--border))",
        }}
      >
        {/* ── Header ── */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border/40 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center">
              <Sparkles className="w-4.5 h-4.5 text-primary" />
            </div>
            <div>
              <p className="font-bold text-sm">{ar ? "مساعد الكتابة الذكي" : "AI Writing Assistant"}</p>
              <p className="text-[11px] text-muted-foreground">{ar ? activeMode.descAr : activeMode.descEn}</p>
            </div>
          </div>
          <button onClick={onClose} className="w-7 h-7 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* ── Mode Tabs ── */}
        <div className="flex items-center gap-1 px-5 py-3 border-b border-border/30 overflow-x-auto scrollbar-hide flex-shrink-0">
          {MODES.map(m => (
            <button
              key={m.id}
              onClick={() => setMode(m.id)}
              className={cn(
                "flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all",
                mode === m.id
                  ? "bg-foreground text-background shadow-sm"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/60"
              )}
            >
              <span className={mode === m.id ? "" : m.color}>{m.icon}</span>
              {ar ? m.labelAr : m.labelEn}
            </button>
          ))}
        </div>

        {/* ── Scrollable Body ── */}
        <div className="flex-1 overflow-y-auto">
          <div className="p-5 space-y-4">

            {/* Translate — language selector */}
            {mode === "translate" && (
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs text-muted-foreground font-medium">{ar ? "ترجمة إلى:" : "Translate to:"}</span>
                <div className="flex gap-1.5 flex-wrap">
                  {TRANSLATE_LANGS.map(l => (
                    <button
                      key={l.code}
                      onClick={() => setTargetLang(l.code)}
                      className={cn(
                        "text-xs px-2.5 py-1 rounded-lg border transition-all",
                        targetLang === l.code
                          ? "bg-foreground text-background border-transparent"
                          : "border-border/50 text-muted-foreground hover:border-foreground/30 hover:text-foreground"
                      )}
                    >
                      {l.label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* ── Input Area ── */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
                  {needsInput
                    ? (ar ? "الفكرة أو المسودة" : "Your idea or rough draft")
                    : (ar ? "النص" : "Text")}
                </label>
                {inputText && <span className="text-[10px] text-muted-foreground">{inputWc} {ar ? "كلمة" : "words"}</span>}
              </div>
              <div className="relative">
                <textarea
                  value={inputText}
                  onChange={e => setInputText(e.target.value)}
                  placeholder={needsInput
                    ? (ar ? "اكتب فكرتك هنا…" : "Write your idea here…")
                    : (ar ? "الصق نصك أو اكتب هنا…" : "Paste or type your text here…")}
                  rows={needsInput ? 5 : 6}
                  dir={ar ? "rtl" : "ltr"}
                  className="w-full rounded-2xl text-sm leading-relaxed resize-none p-4 border border-border/50 bg-muted/20 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/40 transition-all placeholder:text-muted-foreground/40"
                />
              </div>
            </div>

            {/* ── Generate Button ── */}
            <button
              onClick={generate}
              disabled={loading || !inputText.trim()}
              className={cn(
                "w-full flex items-center justify-center gap-2.5 py-3 rounded-2xl text-sm font-bold transition-all",
                loading || !inputText.trim()
                  ? "bg-muted text-muted-foreground cursor-not-allowed"
                  : "bg-foreground text-background hover:opacity-90 shadow-lg shadow-foreground/10 hover:-translate-y-0.5"
              )}
            >
              {loading ? (
                <><Loader2 className="w-4 h-4 animate-spin" />{ar ? "جارٍ المعالجة…" : "Processing…"}</>
              ) : (
                <>
                  <span className={activeMode.color}>{activeMode.icon}</span>
                  {ar ? `${activeMode.labelAr} الآن` : `${activeMode.labelEn} Now`}
                  <ArrowRight className="w-3.5 h-3.5 opacity-50" />
                </>
              )}
            </button>

            {/* ── Output ── */}
            {output && (
              <div ref={outputRef} className="space-y-2 animate-in fade-in slide-in-from-bottom-3 duration-300">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
                    <label className="text-[11px] font-semibold uppercase tracking-widest text-primary">
                      {ar ? "النتيجة" : "Result"}
                    </label>
                    <span className="text-[10px] text-muted-foreground">{outputWc} {ar ? "كلمة" : "words"}</span>
                    {mode === "polish" && inputWc > 0 && (
                      <span className={cn("text-[10px] font-medium px-1.5 py-0.5 rounded-full",
                        outputWc > inputWc ? "text-green-600 bg-green-50 dark:bg-green-950/30" : "text-blue-600 bg-blue-50 dark:bg-blue-950/30")}>
                        {outputWc > inputWc ? `+${outputWc - inputWc}` : `${outputWc - inputWc}`} {ar ? "كلمة" : "words"}
                      </span>
                    )}
                  </div>
                  <button
                    onClick={copyOutput}
                    className="flex items-center gap-1.5 text-[11px] text-muted-foreground hover:text-foreground transition-colors px-2 py-1 rounded-lg hover:bg-muted/50"
                  >
                    {copied ? <><Check className="w-3 h-3 text-green-500" />{ar ? "تم النسخ" : "Copied"}</> : <><Copy className="w-3 h-3" />{ar ? "نسخ" : "Copy"}</>}
                  </button>
                </div>

                <div
                  className="rounded-2xl p-4 text-sm leading-relaxed whitespace-pre-wrap max-h-72 overflow-y-auto border border-primary/15 bg-primary/[0.04]"
                  dir={mode === "translate" ? (targetLang === "ar" ? "rtl" : "ltr") : (ar ? "rtl" : "ltr")}
                >
                  {output}
                </div>

                <button
                  onClick={applyOutput}
                  className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold border-2 border-primary/25 text-primary hover:bg-primary hover:text-primary-foreground hover:border-primary transition-all"
                >
                  <Feather className="w-3.5 h-3.5" />
                  {ar ? "تطبيق في المحرر ✓" : "Apply to Editor ✓"}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
