// The Studio's provider abstraction. Every AI model (Claude, GPT,
// Gemini, Llama) is wrapped in the same `AiProvider` interface so the
// route handler can call `getProvider(id).streamChat(messages, opts)`
// without caring which model is on the other end.
//
// Adding a new model is a one-file change: implement the interface,
// register the new id in PROVIDER_REGISTRY below, and the rest of the
// Studio picks it up automatically (chip in the model selector, daily
// quota slot, cost dashboard).
//
// Streaming is uniform: every provider returns an AsyncIterable<string>
// of plain text chunks. The route handler pipes those into a
// Server-Sent Events response without parsing them.

import type { Response } from "express";

// ─── Public types ──────────────────────────────────────────────────

/** Discriminator for which model is being talked to. */
export type ProviderId = "claude" | "gpt" | "gemini" | "llama";

/** The four shipping providers in launch order. */
export const PROVIDER_IDS: readonly ProviderId[] = [
  "claude",
  "gpt",
  "gemini",
  "llama",
] as const;

/** A single message in a conversation. role/content shape matches the
 *  OpenAI chat format because all four providers normalise to or from
 *  it. */
export interface AiMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

/** Streaming options forwarded to every provider. The Studio always
 *  asks for streaming so the writer sees tokens as they arrive. */
export interface StreamOptions {
  /** Hard cap on output tokens. Used to bound cost per turn. */
  maxOutputTokens?: number;
  /** Sampling temperature, 0.0 to 2.0. Defaults to the model's
   *  recommended value, currently 0.8 for Claude/GPT, 1.0 for Gemini,
   *  0.7 for Llama. */
  temperature?: number;
  /** Abort signal so the writer's "stop generating" click cleanly
   *  cancels the request. */
  signal?: AbortSignal;
}

/** What the route handler stores against the assistant message after
 *  streaming completes. Cost is computed by the provider using its
 *  published per-million-token rates. */
export interface StreamUsage {
  inputTokens: number;
  outputTokens: number;
  costCents: number;
}

/** The contract every model wrapper implements. */
export interface AiProvider {
  /** Provider id used everywhere: DB rows, API responses, frontend. */
  id: ProviderId;
  /** Human-friendly label for the model selector, e.g. "Claude 4.5". */
  displayName: string;
  /** Whether the provider is configured (its env var is set). Models
   *  without a key show greyed-out in the UI rather than throw on
   *  click. */
  enabled: boolean;
  /** Stream a chat completion. Returns the final usage stats on the
   *  same promise so the caller can persist them in one place. */
  streamChat(
    messages: AiMessage[],
    onChunk: (text: string) => void | Promise<void>,
    opts?: StreamOptions,
  ): Promise<StreamUsage>;
}

// ─── Shared helpers ────────────────────────────────────────────────

/** Cost math for OpenAI-shaped pricing. Per-million-token rates from
 *  the provider's pricing page; cents to keep integers everywhere. */
function costFromTokens(
  inputTokens: number,
  outputTokens: number,
  /** dollars per 1M input tokens */
  inputPriceUSD: number,
  /** dollars per 1M output tokens */
  outputPriceUSD: number,
): number {
  const inputCost = (inputTokens / 1_000_000) * inputPriceUSD;
  const outputCost = (outputTokens / 1_000_000) * outputPriceUSD;
  return Math.round((inputCost + outputCost) * 100);
}

// ─── 1. Claude (Anthropic) ─────────────────────────────────────────

const claudeProvider: AiProvider = {
  id: "claude",
  displayName: "Claude 4.5",
  get enabled() {
    return !!process.env.ANTHROPIC_API_KEY;
  },
  async streamChat(messages, onChunk, opts) {
    const Anthropic = (await import("@anthropic-ai/sdk")).default;
    const client = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY!,
    });

    // Anthropic splits system from the conversation rather than
    // mixing it inline. Pull all 'system' messages out, join, send
    // separately. The rest stays in the messages array.
    const systemParts = messages
      .filter((m) => m.role === "system")
      .map((m) => m.content);
    const convo = messages
      .filter((m) => m.role !== "system")
      .map((m) => ({
        role: m.role as "user" | "assistant",
        content: m.content,
      }));

    let inputTokens = 0;
    let outputTokens = 0;

    const stream = await client.messages.stream(
      {
        model: "claude-sonnet-4-5",
        max_tokens: opts?.maxOutputTokens ?? 1500,
        temperature: opts?.temperature ?? 0.8,
        system: systemParts.length > 0 ? systemParts.join("\n\n") : undefined,
        messages: convo,
      },
      { signal: opts?.signal },
    );

    for await (const event of stream) {
      if (
        event.type === "content_block_delta" &&
        event.delta.type === "text_delta"
      ) {
        await onChunk(event.delta.text);
      }
    }

    const finalMessage = await stream.finalMessage();
    inputTokens = finalMessage.usage.input_tokens ?? 0;
    outputTokens = finalMessage.usage.output_tokens ?? 0;

    return {
      inputTokens,
      outputTokens,
      // Claude Sonnet 4.5: $3 per million input, $15 per million output.
      costCents: costFromTokens(inputTokens, outputTokens, 3, 15),
    };
  },
};

// ─── 2. GPT (OpenAI) ───────────────────────────────────────────────

const gptProvider: AiProvider = {
  id: "gpt",
  displayName: "GPT-5",
  get enabled() {
    return !!process.env.OPENAI_API_KEY;
  },
  async streamChat(messages, onChunk, opts) {
    const OpenAI = (await import("openai")).default;
    const client = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY!,
    });

    let inputTokens = 0;
    let outputTokens = 0;

    const stream = await client.chat.completions.create(
      {
        model: "gpt-5",
        messages: messages.map((m) => ({
          role: m.role,
          content: m.content,
        })),
        max_tokens: opts?.maxOutputTokens ?? 1500,
        temperature: opts?.temperature ?? 0.8,
        stream: true,
        // OpenAI returns token usage in the final chunk when this is on.
        stream_options: { include_usage: true },
      },
      { signal: opts?.signal },
    );

    for await (const chunk of stream) {
      const text = chunk.choices?.[0]?.delta?.content;
      if (text) await onChunk(text);
      if (chunk.usage) {
        inputTokens = chunk.usage.prompt_tokens ?? 0;
        outputTokens = chunk.usage.completion_tokens ?? 0;
      }
    }

    return {
      inputTokens,
      outputTokens,
      // GPT-5: $5 per million input, $20 per million output.
      costCents: costFromTokens(inputTokens, outputTokens, 5, 20),
    };
  },
};

// ─── 3. Gemini (Google AI) ─────────────────────────────────────────

const geminiProvider: AiProvider = {
  id: "gemini",
  displayName: "Gemini 2.5 Pro",
  get enabled() {
    return !!process.env.GOOGLE_AI_API_KEY;
  },
  async streamChat(messages, onChunk, opts) {
    const { GoogleGenerativeAI } = await import("@google/generative-ai");
    const client = new GoogleGenerativeAI(process.env.GOOGLE_AI_API_KEY!);

    // Gemini's chat API uses a slightly different shape: system goes
    // into a separate systemInstruction field, the rest is a
    // `contents` array of { role: "user" | "model", parts: [{text}] }.
    const systemParts = messages
      .filter((m) => m.role === "system")
      .map((m) => m.content);
    const contents = messages
      .filter((m) => m.role !== "system")
      .map((m) => ({
        role: m.role === "assistant" ? "model" : "user",
        parts: [{ text: m.content }],
      }));

    const model = client.getGenerativeModel({
      model: "gemini-2.5-pro",
      systemInstruction:
        systemParts.length > 0 ? systemParts.join("\n\n") : undefined,
      generationConfig: {
        maxOutputTokens: opts?.maxOutputTokens ?? 1500,
        temperature: opts?.temperature ?? 1.0,
      },
    });

    let inputTokens = 0;
    let outputTokens = 0;

    const result = await model.generateContentStream({ contents });
    for await (const chunk of result.stream) {
      const text = chunk.text();
      if (text) await onChunk(text);
    }

    const finalResponse = await result.response;
    inputTokens = finalResponse.usageMetadata?.promptTokenCount ?? 0;
    outputTokens = finalResponse.usageMetadata?.candidatesTokenCount ?? 0;

    return {
      inputTokens,
      outputTokens,
      // Gemini 2.5 Pro: $2.50 per million input, $10 per million output.
      costCents: costFromTokens(inputTokens, outputTokens, 2.5, 10),
    };
  },
};

// ─── 4. Llama (Groq, free tier) ────────────────────────────────────

const llamaProvider: AiProvider = {
  id: "llama",
  displayName: "Llama 3.3 70B",
  get enabled() {
    return !!process.env.GROQ_API_KEY || !!process.env.AI_INTEGRATIONS_OPENAI_API_KEY;
  },
  async streamChat(messages, onChunk, opts) {
    // Groq is OpenAI-compatible so we use the openai SDK with a
    // different baseURL. Same shape, same streaming protocol.
    const OpenAI = (await import("openai")).default;
    const client = new OpenAI({
      apiKey:
        process.env.GROQ_API_KEY ||
        process.env.AI_INTEGRATIONS_OPENAI_API_KEY!,
      baseURL: process.env.GROQ_BASE_URL || "https://api.groq.com/openai/v1",
    });

    let inputTokens = 0;
    let outputTokens = 0;

    const stream = await client.chat.completions.create(
      {
        model: "llama-3.3-70b-versatile",
        messages: messages.map((m) => ({
          role: m.role,
          content: m.content,
        })),
        max_tokens: opts?.maxOutputTokens ?? 1500,
        temperature: opts?.temperature ?? 0.7,
        stream: true,
        stream_options: { include_usage: true },
      },
      { signal: opts?.signal },
    );

    for await (const chunk of stream) {
      const text = chunk.choices?.[0]?.delta?.content;
      if (text) await onChunk(text);
      if (chunk.usage) {
        inputTokens = chunk.usage.prompt_tokens ?? 0;
        outputTokens = chunk.usage.completion_tokens ?? 0;
      }
    }

    return {
      inputTokens,
      outputTokens,
      // Groq's Llama is free in the donation-funded model. Track tokens
      // for analytics but charge zero so the cost dashboard shows the
      // truth.
      costCents: 0,
    };
  },
};

// ─── Registry ──────────────────────────────────────────────────────

const PROVIDER_REGISTRY: Record<ProviderId, AiProvider> = {
  claude: claudeProvider,
  gpt: gptProvider,
  gemini: geminiProvider,
  llama: llamaProvider,
};

/** Look up a provider by id. Throws if the id is unknown so a typo in
 *  the route handler fails loudly during dev. */
export function getProvider(id: string): AiProvider {
  const p = PROVIDER_REGISTRY[id as ProviderId];
  if (!p) throw new Error(`unknown provider id: ${id}`);
  return p;
}

/** All providers, used by the /api/studio/providers endpoint to tell
 *  the frontend which chips to render and which are enabled. */
export function listProviders(): AiProvider[] {
  return PROVIDER_IDS.map((id) => PROVIDER_REGISTRY[id]);
}

/** Daily quota per provider for non-admin users. Llama is unlimited
 *  (Number.POSITIVE_INFINITY) so the UI hides the quota ring for it. */
export const DAILY_QUOTAS: Record<ProviderId, number> = {
  claude: 20,
  gpt: 15,
  gemini: 25,
  llama: Number.POSITIVE_INFINITY,
};

// ─── SSE writer helper ────────────────────────────────────────────

/** Write a Server-Sent Events chunk. The Studio frontend consumes the
 *  `event: chunk` lines and appends to the streaming message; the
 *  `event: done` line carries the final stats and conversation id so
 *  the React state can finalise.
 *
 *  Call openSse() once at the start of the response, then writeSse()
 *  for each chunk, then closeSse() at the end. The handler decides
 *  what event names to send. */
export function openSse(res: Response): void {
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache, no-transform");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("X-Accel-Buffering", "no"); // Disable nginx/Railway buffering
  res.flushHeaders();
}

export function writeSse(
  res: Response,
  event: string,
  data: Record<string, unknown> | string,
): void {
  const payload = typeof data === "string" ? data : JSON.stringify(data);
  res.write(`event: ${event}\n`);
  res.write(`data: ${payload}\n\n`);
}

export function closeSse(res: Response): void {
  res.end();
}
