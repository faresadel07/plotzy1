import { db } from "../db";
import { aiUsageLogs } from "../../../../lib/db/src/schema";

// ---------------------------------------------------------------------------
// AI Usage Tracker
//
// Wraps OpenAI calls to log token usage, estimated cost, and which user
// triggered the request.  The admin dashboard reads from ai_usage_logs.
//
// Cost estimates per 1M tokens (approximate, as of early 2026):
//   gpt-4o:       input $2.50, output $10.00
//   gpt-5.1:      input $5.00, output $15.00
//   gpt-image-1:  ~$0.04 per image (flat)
//   gpt-4o-mini-transcribe: ~$0.005 per minute
// ---------------------------------------------------------------------------

const COST_PER_1M_TOKENS: Record<string, { input: number; output: number }> = {
  "gpt-4o":                  { input: 250, output: 1000 },  // cents per 1M
  "gpt-4o-mini":             { input: 15,  output: 60 },
  "gpt-5.1":                 { input: 500, output: 1500 },
  "gpt-image-1":             { input: 0,   output: 0 },     // flat rate
  "gpt-4o-mini-transcribe":  { input: 0,   output: 0 },     // flat rate
};

function estimateCostCents(
  model: string,
  promptTokens: number,
  completionTokens: number,
): number {
  // Image generation is ~4 cents per call
  if (model === "gpt-image-1") return 4;
  // Transcription is ~0.5 cents per call
  if (model === "gpt-4o-mini-transcribe") return 1;

  const rates = COST_PER_1M_TOKENS[model] || COST_PER_1M_TOKENS["gpt-4o"];
  const inputCost = (promptTokens / 1_000_000) * rates.input;
  const outputCost = (completionTokens / 1_000_000) * rates.output;
  return Math.round(inputCost + outputCost);
}

export interface TrackAIParams {
  userId?: number | null;
  endpoint: string;
  model: string;
  promptTokens?: number;
  completionTokens?: number;
}

/**
 * Log an AI API call.  Call this after every OpenAI response.
 * Fire-and-forget — never throws.
 */
export function trackAIUsage(params: TrackAIParams): void {
  const promptTokens = params.promptTokens ?? 0;
  const completionTokens = params.completionTokens ?? 0;
  const cost = estimateCostCents(params.model, promptTokens, completionTokens);

  db.insert(aiUsageLogs)
    .values({
      userId: params.userId ?? null,
      endpoint: params.endpoint,
      model: params.model,
      promptTokens,
      completionTokens,
      estimatedCostCents: cost,
    })
    .catch((err) => { /* non-blocking */ if (process.env.NODE_ENV !== "production") console.warn("AI tracker insert failed:", err?.message); });
}
