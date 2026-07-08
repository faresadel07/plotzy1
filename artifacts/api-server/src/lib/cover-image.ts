// Cover image generation engine.
//
// Provider chain, cheapest capable first:
//   1. Replicate FLUX.1 schnell — flat ~$0.003/image, Apache 2.0
//      license (clean commercial use), native 2:3 portrait, up to 4
//      outputs in one call. Enabled by REPLICATE_API_TOKEN.
//   2. Gemini image model — rides the existing GEMINI_API_KEY. One
//      image per request, so variant counts fan out in parallel.
//      Model id is env-overridable (GEMINI_IMAGE_MODEL) because
//      Google retires image models on short notice.
//
// gpt-image-1 was deliberately removed: it costs ~80x more per image
// and OpenAI has scheduled its deprecation.
//
// No image model renders Arabic type (and even English type comes out
// mangled), so every prompt demands textless artwork. The title and
// author are overlaid in the designer with real fonts.

import { logger } from "./logger";

export interface CoverImageResult {
  /** data: URIs, ready to store or send to the client. */
  images: string[];
  provider: "replicate" | "gemini";
}

const REPLICATE_MODEL = "black-forest-labs/flux-schnell";

export function hasCoverImageProvider(): boolean {
  return !!(
    process.env.REPLICATE_API_TOKEN ||
    process.env.GEMINI_API_KEY ||
    process.env.GOOGLE_GENERATIVE_AI_API_KEY
  );
}

/**
 * Build the final prompt sent to the image model. User-controlled
 * fields (title, description) are defanged before they reach the
 * model: quotes/newlines stripped and length clamped, so a hostile
 * book title cannot steer the generation.
 */
export function buildCoverImagePrompt(opts: {
  title: string | null | undefined;
  userPrompt: string | null | undefined;
  side: "front" | "back";
}): string {
  const safeTitle =
    String(opts.title || "Novel").replace(/"/g, "").replace(/[\r\n]+/g, " ").slice(0, 120).trim() || "Novel";
  const safePrompt = String(opts.userPrompt || "")
    .replace(/["\r\n]/g, " ")
    .slice(0, 600)
    .trim();

  const noText =
    "Absolutely no text, no words, no letters, no numbers, no typography, no captions, no watermarks, no logos anywhere in the image.";

  return opts.side === "back"
    ? `Book back cover background artwork for a book titled "${safeTitle}" (do not write the title). ${safePrompt}. Portrait orientation, simple and elegant, subtle and calm, designed to sit behind overlaid text. ${noText}`
    : `Book front cover artwork for a book titled "${safeTitle}" (do not write the title). ${safePrompt}. Portrait orientation, publication quality, cinematic and visually striking, strong focal composition with breathing room near the top for a title. ${noText}`;
}

async function fetchAsDataUri(url: string): Promise<string> {
  const res = await fetch(url, { signal: AbortSignal.timeout(30_000) });
  if (!res.ok) throw new Error(`image download failed (${res.status})`);
  const mime = res.headers.get("content-type") || "image/jpeg";
  const buf = Buffer.from(await res.arrayBuffer());
  return `data:${mime};base64,${buf.toString("base64")}`;
}

// ── Replicate (FLUX.1 schnell) ────────────────────────────────────────

async function generateWithReplicate(prompt: string, count: number): Promise<string[]> {
  const res = await fetch(
    `https://api.replicate.com/v1/models/${REPLICATE_MODEL}/predictions`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.REPLICATE_API_TOKEN}`,
        "Content-Type": "application/json",
        // Hold the connection until the prediction finishes (schnell
        // takes ~1-2s) instead of polling.
        Prefer: "wait",
      },
      body: JSON.stringify({
        input: {
          prompt,
          num_outputs: count,
          aspect_ratio: "2:3",
          output_format: "jpg",
          output_quality: 90,
          megapixels: "1",
        },
      }),
      signal: AbortSignal.timeout(90_000),
    },
  );
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`replicate ${res.status}: ${body.slice(0, 300)}`);
  }
  const pred = (await res.json()) as any;
  const output: string[] = Array.isArray(pred?.output)
    ? pred.output
    : pred?.output
      ? [pred.output]
      : [];
  if (pred?.status === "failed" || output.length === 0) {
    throw new Error(`replicate prediction ${pred?.status || "empty"}: ${pred?.error || "no output"}`);
  }
  return Promise.all(output.slice(0, count).map(fetchAsDataUri));
}

// ── Gemini image model ───────────────────────────────────────────────

async function geminiOnce(
  prompt: string,
  model: string,
  apiKey: string,
  withAspect: boolean,
): Promise<string> {
  const generationConfig: any = { responseModalities: ["IMAGE"] };
  if (withAspect) generationConfig.imageConfig = { aspectRatio: "2:3" };
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-goog-api-key": apiKey },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig,
      }),
      signal: AbortSignal.timeout(60_000),
    },
  );
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    const err: any = new Error(`gemini ${res.status}: ${body.slice(0, 300)}`);
    err.status = res.status;
    throw err;
  }
  const data = (await res.json()) as any;
  const part = data?.candidates?.[0]?.content?.parts?.find((p: any) => p?.inlineData?.data);
  if (!part) throw new Error("gemini returned no image data");
  return `data:${part.inlineData.mimeType || "image/png"};base64,${part.inlineData.data}`;
}

async function generateWithGemini(prompt: string, count: number): Promise<string[]> {
  const apiKey = (process.env.GEMINI_API_KEY || process.env.GOOGLE_GENERATIVE_AI_API_KEY)!;
  const model = process.env.GEMINI_IMAGE_MODEL || "gemini-3.1-flash-image";
  const one = async (): Promise<string> => {
    try {
      return await geminiOnce(prompt, model, apiKey, true);
    } catch (err: any) {
      // Older image models reject imageConfig; retry once without it.
      if (err?.status === 400) return geminiOnce(prompt, model, apiKey, false);
      throw err;
    }
  };
  const settled = await Promise.allSettled(Array.from({ length: count }, one));
  const images = settled
    .filter((r): r is PromiseFulfilledResult<string> => r.status === "fulfilled")
    .map((r) => r.value);
  if (images.length === 0) {
    const firstErr = settled[0] as PromiseRejectedResult;
    throw new Error(String(firstErr?.reason?.message || firstErr?.reason || "gemini failed"));
  }
  return images;
}

// ── Public entry point ───────────────────────────────────────────────

/**
 * Generate 1-4 cover images. Tries Replicate first, falls back to
 * Gemini, throws only when every configured provider failed (or none
 * is configured — gate calls with hasCoverImageProvider()).
 */
export async function generateCoverImages(prompt: string, count = 1): Promise<CoverImageResult> {
  const n = Math.max(1, Math.min(4, Math.floor(count)));
  const errors: string[] = [];

  if (process.env.REPLICATE_API_TOKEN) {
    try {
      return { images: await generateWithReplicate(prompt, n), provider: "replicate" };
    } catch (err: any) {
      errors.push(`replicate: ${err?.message || err}`);
      logger.warn({ err }, "Replicate cover generation failed, trying fallback");
    }
  }

  if (process.env.GEMINI_API_KEY || process.env.GOOGLE_GENERATIVE_AI_API_KEY) {
    try {
      return { images: await generateWithGemini(prompt, n), provider: "gemini" };
    } catch (err: any) {
      errors.push(`gemini: ${err?.message || err}`);
      logger.warn({ err }, "Gemini cover generation failed");
    }
  }

  throw new Error(
    errors.length
      ? `Cover generation failed: ${errors.join(" | ")}`
      : "No image provider configured (set REPLICATE_API_TOKEN or GEMINI_API_KEY)",
  );
}
