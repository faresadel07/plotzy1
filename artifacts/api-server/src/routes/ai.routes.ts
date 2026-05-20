// AI chat endpoint — streams responses from Google Gemini back to the
// writer's chat panel. Stateless on purpose: messages live in the
// browser only until the DB is wired (next phase). This keeps the
// feature shippable while Neon is over its monthly transfer cap.

import { Router } from "express";
import { streamText } from "ai";
import { google } from "@ai-sdk/google";
import { requireAuth } from "../middleware/auth";
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

router.post("/api/ai/chat", requireAuth, async (req, res) => {
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

    const result = streamText({
      model: google("gemini-2.0-flash"),
      system: SYSTEM_PROMPT,
      messages,
    });

    for await (const chunk of result.textStream) {
      res.write(chunk);
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
