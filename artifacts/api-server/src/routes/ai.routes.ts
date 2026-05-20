// AI chat endpoint — streams responses from Google Gemini back to the
// writer's chat panel. Stateless on purpose: messages live in the
// browser only until the DB is wired (next phase). This keeps the
// feature shippable while Neon is over its monthly transfer cap.

import { Router } from "express";
import { streamText } from "ai";
import { google } from "@ai-sdk/google";
import { aiLimiter } from "../middleware/rate-limit";
import { logger } from "../lib/logger";

const router = Router();

interface ClientMessage {
  role: "user" | "assistant" | "system";
  content: string;
}

const SYSTEM_PROMPT = `You are a warm, knowledgeable writing assistant inside Plotzy, a platform for serious writers. You help authors develop their stories: plotting, character work, dialogue, structure, revision, prose craft, and overcoming creative blocks.

Style:
- Speak the language the writer is writing in (if they write in Arabic, reply in Arabic; if English, reply in English).
- Be concise, concrete, and practical. Give examples and small exercises when useful.
- When asked for ideas, offer two or three distinct angles rather than one generic answer.
- Never use em-dashes or em-dash-style hyphens; prefer commas, full stops, or rephrasing.
- Never use emojis.

You are talking to a working writer. Treat them with respect; never be condescending.`;

// Auth is intentionally OFF here: login currently requires the DB,
// and the DB is over its monthly Neon transfer cap. We still protect
// the endpoint with the same aiLimiter that gates the rest of the AI
// surface so an anonymous abuser cannot drain the Gemini quota.
// When auth is back online, swap aiLimiter for requireAuth.
router.post("/api/ai/chat", aiLimiter, async (req, res) => {
  try {
    const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_GENERATIVE_AI_API_KEY;
    if (!apiKey) {
      return res.status(503).json({ message: "AI assistant is not configured." });
    }
    // The provider auto-reads GOOGLE_GENERATIVE_AI_API_KEY; mirror our
    // GEMINI_API_KEY env name into it on the fly so either works.
    if (!process.env.GOOGLE_GENERATIVE_AI_API_KEY) {
      process.env.GOOGLE_GENERATIVE_AI_API_KEY = apiKey;
    }

    const raw = (req.body?.messages ?? []) as ClientMessage[];
    const messages = Array.isArray(raw)
      ? raw
          .filter((m) => m && typeof m.content === "string" && m.content.trim().length > 0)
          .map((m) => ({
            role: m.role === "assistant" ? ("assistant" as const) : ("user" as const),
            content: m.content.slice(0, 8000),
          }))
          .slice(-30)
      : [];
    if (messages.length === 0) {
      return res.status(400).json({ message: "Messages required" });
    }

    res.setHeader("Content-Type", "text/plain; charset=utf-8");
    res.setHeader("Cache-Control", "no-store");
    res.setHeader("X-Accel-Buffering", "no");

    // gemini-2.0-flash-lite has the highest free-tier RPM of the Gemini
    // 2 family, which matters because we are intentionally allowing
    // anonymous traffic on this endpoint while DB-backed auth is down.
    const result = streamText({
      model: google("gemini-2.0-flash-lite"),
      system: SYSTEM_PROMPT,
      messages,
    });

    let bytesWritten = 0;
    let upstreamErr: unknown = null;
    try {
      for await (const chunk of result.textStream) {
        res.write(chunk);
        bytesWritten += chunk.length;
      }
    } catch (streamErr: unknown) {
      upstreamErr = streamErr;
    }
    // The SDK sometimes swallows upstream errors and just closes the
    // stream early — so a fully empty response also signals failure.
    if (bytesWritten === 0) {
      try {
        await result.finishReason; // surface a stored error if there is one
      } catch (err) {
        upstreamErr = err;
      }
      const msg = upstreamErr instanceof Error
        ? upstreamErr.message
        : upstreamErr ? String(upstreamErr) : "empty response";
      logger.error({ err: msg }, "Gemini chat empty/failed");
      const friendly = /quota|rate|429|too many|exhausted/i.test(msg)
        ? "The AI is taking a short break, the free-tier limit was hit. Please try again in a few seconds."
        : "Sorry, the AI could not respond just now. Please try again.";
      try { res.write(friendly); } catch { /* connection gone */ }
    }
    res.end();
    return;
  } catch (err) {
    logger.error({ err }, "AI chat error");
    if (!res.headersSent) {
      return res.status(500).json({ message: "AI chat failed" });
    }
    res.end();
    return;
  }
});

export default router;
