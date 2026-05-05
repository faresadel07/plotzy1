import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { useLanguage } from "@/contexts/language-context";

/**
 * 4-section accordion for AI-generated final-project feedback. Each
 * section maps to one of the analyses returned by
 * `POST /api/course/final-project/feedback`:
 *   - plotHoles  → list of issues with severity tags
 *   - dialogue   → score + suggestions
 *   - pacing     → overall + per-chapter
 *   - voice      → score + per-character
 *
 * All sections are collapsed by default (DP6/F1 — accordion). Click
 * to expand. Each shape is rendered with a small dedicated function
 * so the JSON contract is explicit at the call site.
 *
 * Reuses: existing <Accordion> primitives, <Badge>, useLanguage().
 * Non-goals: print-friendly view (future), section-level export.
 */

interface PlotHoleIssue {
  severity: "high" | "medium" | "low";
  title: string;
  description: string;
}
interface DialogueSuggestion {
  issue: string;
  example: string;
  fix: string;
}
interface PacingChapter {
  title: string;
  pacing: "Fast" | "Medium" | "Slow";
  note: string;
}
interface VoiceCharacter {
  name: string;
  consistencyScore: number;
  issues: string[];
}

export interface CourseFeedback {
  plotHoles: { issues: PlotHoleIssue[] };
  dialogue: {
    score: number;
    feedback: string;
    suggestions: DialogueSuggestion[];
  };
  pacing: {
    overallPacing: "Fast" | "Medium" | "Slow" | "N/A";
    score: number;
    summary: string;
    chapters: PacingChapter[];
    recommendations: string[];
  };
  voice: {
    score: number;
    characters: VoiceCharacter[];
    recommendation: string;
  };
  generatedAt?: string;
}

interface FeedbackPanelProps {
  feedback: CourseFeedback;
  className?: string;
}

export function FeedbackPanel({ feedback, className = "" }: FeedbackPanelProps) {
  const { t } = useLanguage();
  return (
    <Accordion type="multiple" className={`w-full rounded-lg border ${className}`}>
      <AccordionItem value="plot-holes" className="px-4 border-b">
        <AccordionTrigger>
          <span className="flex items-center gap-2">
            <span>{t("courseFeedbackPlot")}</span>
            <Badge variant="secondary">{feedback.plotHoles.issues.length}</Badge>
          </span>
        </AccordionTrigger>
        <AccordionContent className="space-y-3">
          {feedback.plotHoles.issues.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              {t("courseFeedbackNoIssues")}
            </p>
          ) : (
            feedback.plotHoles.issues.map((issue, i) => (
              <div key={i} className="rounded-md border p-3 space-y-1">
                <div className="flex items-center gap-2">
                  <Badge variant={issue.severity === "high" ? "destructive" : "secondary"}>
                    {issue.severity}
                  </Badge>
                  <span className="font-medium text-sm">{issue.title}</span>
                </div>
                <p className="text-sm text-muted-foreground">{issue.description}</p>
              </div>
            ))
          )}
        </AccordionContent>
      </AccordionItem>

      <AccordionItem value="dialogue" className="px-4 border-b">
        <AccordionTrigger>
          <span className="flex items-center gap-2">
            <span>{t("courseFeedbackDialogue")}</span>
            <Badge variant="secondary">{feedback.dialogue.score}/100</Badge>
          </span>
        </AccordionTrigger>
        <AccordionContent className="space-y-3">
          <p className="text-sm">{feedback.dialogue.feedback}</p>
          {feedback.dialogue.suggestions.map((s, i) => (
            <div key={i} className="rounded-md border p-3 space-y-2 text-sm">
              <div>
                <span className="font-medium">{t("courseFeedbackIssue")}:</span> {s.issue}
              </div>
              <div className="text-muted-foreground italic">"{s.example}"</div>
              <div>
                <span className="font-medium">{t("courseFeedbackFix")}:</span> {s.fix}
              </div>
            </div>
          ))}
        </AccordionContent>
      </AccordionItem>

      <AccordionItem value="pacing" className="px-4 border-b">
        <AccordionTrigger>
          <span className="flex items-center gap-2">
            <span>{t("courseFeedbackPacing")}</span>
            <Badge variant="secondary">{feedback.pacing.overallPacing}</Badge>
          </span>
        </AccordionTrigger>
        <AccordionContent className="space-y-3 text-sm">
          <p>{feedback.pacing.summary}</p>
          {feedback.pacing.chapters.length > 0 && (
            <div className="space-y-1">
              {feedback.pacing.chapters.map((ch, i) => (
                <div key={i} className="flex items-baseline gap-2">
                  <Badge variant="outline">{ch.pacing}</Badge>
                  <span className="font-medium">{ch.title}</span>
                  <span className="text-muted-foreground">— {ch.note}</span>
                </div>
              ))}
            </div>
          )}
          {feedback.pacing.recommendations.length > 0 && (
            <ul className="list-disc list-inside space-y-1">
              {feedback.pacing.recommendations.map((r, i) => (
                <li key={i}>{r}</li>
              ))}
            </ul>
          )}
        </AccordionContent>
      </AccordionItem>

      <AccordionItem value="voice" className="px-4">
        <AccordionTrigger>
          <span className="flex items-center gap-2">
            <span>{t("courseFeedbackVoice")}</span>
            <Badge variant="secondary">{feedback.voice.score}/100</Badge>
          </span>
        </AccordionTrigger>
        <AccordionContent className="space-y-3 text-sm">
          {feedback.voice.characters.map((c, i) => (
            <div key={i} className="rounded-md border p-3 space-y-1">
              <div className="flex items-center gap-2">
                <span className="font-medium">{c.name}</span>
                <Badge variant="secondary">{c.consistencyScore}/100</Badge>
              </div>
              {c.issues.length > 0 && (
                <ul className="list-disc list-inside text-muted-foreground space-y-0.5">
                  {c.issues.map((iss, k) => (
                    <li key={k}>{iss}</li>
                  ))}
                </ul>
              )}
            </div>
          ))}
          {feedback.voice.recommendation && (
            <p className="text-muted-foreground">{feedback.voice.recommendation}</p>
          )}
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  );
}
