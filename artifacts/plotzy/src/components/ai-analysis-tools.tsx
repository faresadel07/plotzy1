import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/contexts/language-context";
import {
  Search, MessageSquare, Activity, Users,
  Loader2, ChevronDown, ChevronUp, AlertTriangle,
  AlertCircle, Info, Sparkles, CheckCircle2
} from "lucide-react";

type ToolKey = "plot-holes" | "dialogue" | "pacing" | "voice";

interface PlotIssue { severity: "high" | "medium" | "low"; title: string; description: string; }
interface DialogueSuggestion { issue: string; example: string; fix: string; }
interface PacingChapter { title: string; pacing: "Fast" | "Medium" | "Slow"; note: string; }
interface VoiceCharacter { name: string; consistencyScore: number; issues: string[]; }

type AnalysisResult =
  | { type: "plot-holes"; issues: PlotIssue[] }
  | { type: "dialogue"; score: number; feedback: string; suggestions: DialogueSuggestion[] }
  | { type: "pacing"; overallPacing: string; score: number; summary: string; chapters: PacingChapter[]; recommendations: string[] }
  | { type: "voice"; score: number; characters: VoiceCharacter[]; recommendation: string };

function ScoreBadge({ score }: { score: number }) {
  const color = score >= 75 ? "text-green-600 bg-green-50 dark:bg-green-950/40 border-green-200 dark:border-green-800"
    : score >= 50 ? "text-amber-600 bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-800"
    : "text-red-600 bg-red-50 dark:bg-red-950/40 border-red-200 dark:border-red-800";
  return (
    <span className={`inline-flex items-center gap-1 text-sm font-bold px-2.5 py-0.5 rounded-full border ${color}`}>
      {score}/100
    </span>
  );
}

function SeverityBadge({ severity }: { severity: string }) {
  const map = {
    high:   { color: "text-red-600 bg-red-50 dark:bg-red-950/40 border-red-200",    icon: AlertTriangle, label: "High"   },
    medium: { color: "text-amber-600 bg-amber-50 dark:bg-amber-950/40 border-amber-200", icon: AlertCircle,  label: "Medium" },
    low:    { color: "text-blue-600 bg-blue-50 dark:bg-blue-950/40 border-blue-200",  icon: Info,          label: "Low"    },
  } as const;
  const { color, icon: Icon, label } = map[severity as keyof typeof map] || map.low;
  return (
    <span className={`inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full border ${color}`}>
      <Icon className="w-3 h-3" />{label}
    </span>
  );
}

function PacingBadge({ pacing }: { pacing: string }) {
  const map = {
    Fast:   "text-green-600 bg-green-50 dark:bg-green-950/40 border-green-200",
    Medium: "text-amber-600 bg-amber-50 dark:bg-amber-950/40 border-amber-200",
    Slow:   "text-blue-600 bg-blue-50 dark:bg-blue-950/40 border-blue-200",
  } as const;
  const color = map[pacing as keyof typeof map] || map.Medium;
  return <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full border ${color}`}>{pacing}</span>;
}

function ResultView({ result, ar }: { result: AnalysisResult; ar: boolean }) {
  const [expanded, setExpanded] = useState<number | null>(null);

  if (result.type === "plot-holes") {
    return (
      <div className="space-y-2.5">
        {result.issues.length === 0 ? (
          <div className="flex items-center gap-2 text-green-600 text-sm font-medium py-3">
            <CheckCircle2 className="w-5 h-5" />
            {ar ? "لا توجد ثغرات منطقية مكتشفة!" : "No plot holes detected!"}
          </div>
        ) : result.issues.map((issue, i) => (
          <div key={i} className="p-3.5 rounded-xl border border-border/30 bg-muted/20">
            <div className="flex items-start justify-between gap-2 mb-1.5">
              <span className="font-semibold text-sm">{issue.title}</span>
              <SeverityBadge severity={issue.severity} />
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">{issue.description}</p>
          </div>
        ))}
      </div>
    );
  }

  if (result.type === "dialogue") {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-3 p-3.5 rounded-xl bg-muted/30 border border-border/30">
          <div className="text-center">
            <ScoreBadge score={result.score} />
            <p className="text-[10px] text-muted-foreground mt-1">{ar ? "درجة الطبيعية" : "Naturalness"}</p>
          </div>
          <p className="text-sm text-muted-foreground leading-relaxed flex-1">{result.feedback}</p>
        </div>
        {result.suggestions.map((s, i) => (
          <div key={i} className="p-3.5 rounded-xl border border-border/30 bg-muted/20 space-y-2">
            <p className="font-semibold text-sm text-amber-600 dark:text-amber-400">{s.issue}</p>
            <div className="space-y-1.5">
              <div className="flex gap-2">
                <span className="text-[10px] font-bold text-red-500 uppercase mt-0.5 flex-shrink-0">{ar ? "قبل" : "Before"}</span>
                <p className="text-xs text-muted-foreground italic bg-red-50/50 dark:bg-red-950/20 rounded px-2 py-1 flex-1">{s.example}</p>
              </div>
              <div className="flex gap-2">
                <span className="text-[10px] font-bold text-green-500 uppercase mt-0.5 flex-shrink-0">{ar ? "بعد" : "After"}</span>
                <p className="text-xs text-muted-foreground italic bg-green-50/50 dark:bg-green-950/20 rounded px-2 py-1 flex-1">{s.fix}</p>
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (result.type === "pacing") {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-3 p-3.5 rounded-xl bg-muted/30 border border-border/30">
          <div className="text-center flex-shrink-0">
            <ScoreBadge score={result.score} />
            <p className="text-[10px] text-muted-foreground mt-1">{result.overallPacing}</p>
          </div>
          <p className="text-sm text-muted-foreground leading-relaxed">{result.summary}</p>
        </div>
        {result.chapters.length > 0 && (
          <div className="space-y-1.5">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">{ar ? "إيقاع الفصول" : "Chapter Pacing"}</p>
            {result.chapters.map((c, i) => (
              <div key={i} className="flex items-center gap-2 p-2.5 rounded-lg border border-border/20 bg-muted/10">
                <span className="text-xs text-muted-foreground flex-shrink-0 w-20 truncate">{c.title}</span>
                <PacingBadge pacing={c.pacing} />
                <p className="text-xs text-muted-foreground flex-1 truncate">{c.note}</p>
              </div>
            ))}
          </div>
        )}
        {result.recommendations.length > 0 && (
          <div className="p-3.5 rounded-xl border border-amber-200/60 bg-amber-50/40 dark:bg-amber-950/20 space-y-2">
            <p className="text-xs font-bold text-amber-600 uppercase tracking-wide">{ar ? "توصيات" : "Recommendations"}</p>
            {result.recommendations.map((r, i) => (
              <p key={i} className="text-xs text-muted-foreground leading-relaxed flex gap-2"><span className="text-amber-500 flex-shrink-0">•</span>{r}</p>
            ))}
          </div>
        )}
      </div>
    );
  }

  if (result.type === "voice") {
    return (
      <div className="space-y-3">
        <div className="flex items-center gap-3 p-3.5 rounded-xl bg-muted/30 border border-border/30">
          <ScoreBadge score={result.score} />
          <p className="text-sm text-muted-foreground leading-relaxed">{result.recommendation}</p>
        </div>
        {result.characters.map((ch, i) => (
          <div key={i} className="p-3.5 rounded-xl border border-border/30 bg-muted/20">
            <div className="flex items-center justify-between mb-2">
              <span className="font-semibold text-sm">{ch.name}</span>
              <ScoreBadge score={ch.consistencyScore} />
            </div>
            {ch.issues.length > 0 && (
              <ul className="space-y-1">
                {ch.issues.map((issue, j) => (
                  <li key={j} className="text-xs text-muted-foreground flex gap-2">
                    <span className="text-amber-500 flex-shrink-0">•</span>{issue}
                  </li>
                ))}
              </ul>
            )}
          </div>
        ))}
      </div>
    );
  }

  return null;
}

export function AIAnalysisTools({ bookId }: { bookId: number }) {
  const { lang } = useLanguage();
  const ar = lang === "ar";
  const [results, setResults] = useState<Partial<Record<ToolKey, AnalysisResult>>>({});
  const [loading, setLoading] = useState<Partial<Record<ToolKey, boolean>>>({});
  const [expanded, setExpanded] = useState<ToolKey | null>(null);

  const tools: { key: ToolKey; icon: typeof Search; title: string; titleAr: string; desc: string; descAr: string; color: string }[] = [
    {
      key: "plot-holes",
      icon: Search,
      title: "Plot Hole Detector",
      titleAr: "كاشف الثغرات المنطقية",
      desc: "Scans your manuscript for logical inconsistencies and timeline errors.",
      descAr: "يفحص روايتك ويكتشف التناقضات المنطقية وأخطاء الترتيب الزمني.",
      color: "text-red-500",
    },
    {
      key: "dialogue",
      icon: MessageSquare,
      title: "Dialogue Coach",
      titleAr: "مدرب الحوار",
      desc: "Rates your dialogue naturalness and suggests improvements.",
      descAr: "يقيّم مدى طبيعية الحوار ويقترح تحسينات محددة.",
      color: "text-blue-500",
    },
    {
      key: "pacing",
      icon: Activity,
      title: "Pacing Analyzer",
      titleAr: "محلل إيقاع القصة",
      desc: "Analyzes the story's pace and flags slow or rushed sections.",
      descAr: "يحلل إيقاع القصة ويُنبّه للأقسام البطيئة أو المتسارعة.",
      color: "text-green-500",
    },
    {
      key: "voice",
      icon: Users,
      title: "Character Voice",
      titleAr: "اتساق صوت الشخصيات",
      desc: "Checks if each character speaks consistently throughout the story.",
      descAr: "يتحقق من ثبات أسلوب كل شخصية طوال القصة.",
      color: "text-violet-500",
    },
  ];

  const runAnalysis = async (key: ToolKey) => {
    setLoading(p => ({ ...p, [key]: true }));
    const endpointMap: Record<ToolKey, string> = {
      "plot-holes": "plot-holes",
      "dialogue": "dialogue-coach",
      "pacing": "pacing",
      "voice": "voice-consistency",
    };
    try {
      const res = await fetch(`/api/books/${bookId}/ai/${endpointMap[key]}`, { method: "POST" });
      const data = await res.json();
      setResults(p => ({ ...p, [key]: { type: key, ...data } }));
      setExpanded(key);
    } catch {
      // ignore
    } finally {
      setLoading(p => ({ ...p, [key]: false }));
    }
  };

  return (
    <div className="space-y-3">
      <div className="mb-4">
        <h3 className="font-bold text-base flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-primary" />
          {ar ? "أدوات التحليل الذكي" : "AI Analysis Tools"}
        </h3>
        <p className="text-xs text-muted-foreground mt-0.5">
          {ar ? "ذكاء اصطناعي يحلل روايتك بعمق ويقدم تقريراً شاملاً" : "Deep AI analysis of your manuscript with detailed reports"}
        </p>
      </div>

      {tools.map(({ key, icon: Icon, title, titleAr, desc, descAr, color }) => {
        const result = results[key];
        const isLoading = loading[key];
        const isOpen = expanded === key;

        return (
          <div key={key} className="border border-border/30 rounded-2xl overflow-hidden bg-card">
            <div className="p-4 flex items-start gap-3">
              <div className={`w-9 h-9 rounded-xl bg-muted/40 flex items-center justify-center flex-shrink-0 ${color}`}>
                <Icon className="w-4.5 h-4.5" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-sm">{ar ? titleAr : title}</p>
                <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{ar ? descAr : desc}</p>
              </div>
              <Button
                size="sm"
                variant={result ? "outline" : "default"}
                className="rounded-xl text-xs flex-shrink-0"
                onClick={() => runAnalysis(key)}
                disabled={isLoading}
              >
                {isLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : result ? (ar ? "إعادة تشغيل" : "Re-run") : (ar ? "تحليل" : "Analyze")}
              </Button>
            </div>

            {result && (
              <>
                <button
                  className="w-full px-4 py-2 flex items-center justify-between text-xs text-muted-foreground hover:text-foreground border-t border-border/20 transition-colors hover:bg-muted/20"
                  onClick={() => setExpanded(isOpen ? null : key)}
                >
                  <span className="font-medium">{ar ? "عرض النتائج" : "View Results"}</span>
                  {isOpen ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                </button>

                {isOpen && (
                  <div className="p-4 border-t border-border/20 bg-muted/10">
                    <ResultView result={result as AnalysisResult} ar={ar} />
                  </div>
                )}
              </>
            )}
          </div>
        );
      })}
    </div>
  );
}
