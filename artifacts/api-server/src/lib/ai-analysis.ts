/**
 * Narrative-analysis helpers shared between the per-book AI endpoints
 * (`/api/books/:bookId/ai/{plot-holes,dialogue-coach,pacing,voice-consistency}`)
 * and the course final-project feedback endpoint that composes all four
 * into one structured report.
 *
 * Each helper takes the manuscript + book metadata and returns a typed
 * result. JSON-mode prompts produce structured output; the same default
 * fallbacks the inline route handlers used previously are applied here
 * so a malformed LLM response degrades gracefully instead of crashing.
 *
 * Out of scope: `/api/marketplace/analyze`. That endpoint serves a
 * different prompt family (editorial services like dev-editor,
 * copy-editor, blurb-writer) with its own usage-counter logic.
 */
import { openai, AI_TEXT_MODEL } from "../routes/helpers";
import { logger } from "./logger";

// ── Result shapes (mirror the JSON the LLM is asked to return) ────────────
export interface PlotHoleIssue {
  severity: "high" | "medium" | "low";
  title: string;
  description: string;
}
export interface PlotHolesResult {
  issues: PlotHoleIssue[];
}

export interface DialogueSuggestion {
  issue: string;
  example: string;
  fix: string;
}
export interface DialogueResult {
  score: number;
  feedback: string;
  suggestions: DialogueSuggestion[];
}

export interface PacingChapter {
  title: string;
  pacing: "Fast" | "Medium" | "Slow";
  note: string;
}
export interface PacingResult {
  overallPacing: "Fast" | "Medium" | "Slow" | "N/A";
  score: number;
  summary: string;
  chapters: PacingChapter[];
  recommendations: string[];
}

export interface VoiceCharacter {
  name: string;
  consistencyScore: number;
  issues: string[];
}
export interface VoiceConsistencyResult {
  score: number;
  characters: VoiceCharacter[];
  recommendation: string;
}

// LLMs in JSON mode usually return well-formed JSON, but a malformed
// response shouldn't 500 the request — fall back to the same default
// shape the inline handlers used.
function safeParse<T>(content: string | null | undefined, fallback: T): T {
  if (!content) return fallback;
  try {
    return JSON.parse(content) as T;
  } catch (err) {
    logger.warn({ err }, "ai-analysis: malformed JSON, using fallback");
    return fallback;
  }
}

// ── Plot Holes ────────────────────────────────────────────────────────────
export async function analyzePlotHoles(
  manuscript: string,
  bookTitle: string,
): Promise<PlotHolesResult> {
  if (!manuscript.trim()) return { issues: [] };

  const response = await openai.chat.completions.create({
    model: AI_TEXT_MODEL,
    response_format: { type: "json_object" },
    messages: [
      {
        role: "system",
        content: `You are a literary editor specializing in plot consistency. Analyze the manuscript for logical inconsistencies, timeline errors, character contradictions, and unresolved plot threads. Return JSON in this exact shape:
{"issues": [{"severity": "high"|"medium"|"low", "title": "short title", "description": "detailed explanation"}]}
Return an empty array if no issues found. Focus on real narrative problems, not style issues.`,
      },
      { role: "user", content: `Book: "${bookTitle}"\n\n${manuscript}` },
    ],
  });

  const data = safeParse<{ issues?: PlotHoleIssue[] }>(
    response.choices[0]?.message?.content,
    {},
  );
  return { issues: data.issues ?? [] };
}

// ── Dialogue Coach ────────────────────────────────────────────────────────
export async function analyzeDialogue(
  manuscript: string,
  bookTitle: string,
): Promise<DialogueResult> {
  if (!manuscript.trim()) {
    return { score: 0, feedback: "No content to analyze.", suggestions: [] };
  }

  const response = await openai.chat.completions.create({
    model: AI_TEXT_MODEL,
    response_format: { type: "json_object" },
    messages: [
      {
        role: "system",
        content: `You are a dialogue coach and literary editor. Analyze the dialogue in the manuscript for naturalness, character voice differentiation, and authenticity. Return JSON in this exact shape:
{"score": 0-100, "feedback": "overall feedback paragraph", "suggestions": [{"issue": "what is wrong", "example": "direct quote from text showing the problem", "fix": "rewritten version that fixes it"}]}
Provide 2-4 specific suggestions with real examples from the text.`,
      },
      { role: "user", content: `Book: "${bookTitle}"\n\n${manuscript}` },
    ],
  });

  const data = safeParse<Partial<DialogueResult>>(
    response.choices[0]?.message?.content,
    {},
  );
  return {
    score: data.score ?? 50,
    feedback: data.feedback ?? "",
    suggestions: data.suggestions ?? [],
  };
}

// ── Pacing ────────────────────────────────────────────────────────────────
export async function analyzePacing(
  manuscript: string,
  bookTitle: string,
  chapterTitles: string[],
): Promise<PacingResult> {
  if (!manuscript.trim()) {
    return {
      overallPacing: "N/A",
      score: 0,
      summary: "No content.",
      chapters: [],
      recommendations: [],
    };
  }

  const response = await openai.chat.completions.create({
    model: AI_TEXT_MODEL,
    response_format: { type: "json_object" },
    messages: [
      {
        role: "system",
        content: `You are a pacing analyst for fiction manuscripts. Evaluate the story's rhythm: action scenes, slow introspective passages, transitions, and chapter lengths. Return JSON in this exact shape:
{"overallPacing": "Fast"|"Medium"|"Slow", "score": 0-100, "summary": "1-2 sentence summary", "chapters": [{"title": "chapter title", "pacing": "Fast"|"Medium"|"Slow", "note": "brief note"}], "recommendations": ["actionable recommendation 1", "actionable recommendation 2"]}
Cover all chapters. Give 2-3 recommendations.`,
      },
      {
        role: "user",
        content: `Book: "${bookTitle}"\nChapters: ${chapterTitles.join(", ")}\n\n${manuscript}`,
      },
    ],
  });

  const data = safeParse<Partial<PacingResult>>(
    response.choices[0]?.message?.content,
    {},
  );
  return {
    overallPacing: data.overallPacing ?? "Medium",
    score: data.score ?? 50,
    summary: data.summary ?? "",
    chapters: data.chapters ?? [],
    recommendations: data.recommendations ?? [],
  };
}

// ── Voice Consistency ─────────────────────────────────────────────────────
export async function analyzeVoiceConsistency(
  manuscript: string,
  bookTitle: string,
): Promise<VoiceConsistencyResult> {
  if (!manuscript.trim()) {
    return { score: 0, characters: [], recommendation: "No content to analyze." };
  }

  const response = await openai.chat.completions.create({
    model: AI_TEXT_MODEL,
    response_format: { type: "json_object" },
    messages: [
      {
        role: "system",
        content: `You are a character voice analyst. Identify the main characters and evaluate whether each one speaks and behaves consistently throughout the manuscript. Return JSON in this exact shape:
{"score": 0-100, "characters": [{"name": "character name", "consistencyScore": 0-100, "issues": ["specific inconsistency description"]}], "recommendation": "overall actionable recommendation"}
List 2-5 main characters. Issues array can be empty if consistent.`,
      },
      { role: "user", content: `Book: "${bookTitle}"\n\n${manuscript}` },
    ],
  });

  const data = safeParse<Partial<VoiceConsistencyResult>>(
    response.choices[0]?.message?.content,
    {},
  );
  return {
    score: data.score ?? 50,
    characters: data.characters ?? [],
    recommendation: data.recommendation ?? "",
  };
}
