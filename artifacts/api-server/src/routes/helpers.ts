import OpenAI from "openai";
import { logger } from "../lib/logger";

// ---------------------------------------------------------------------------
// OpenAI client (shared across route modules)
// ---------------------------------------------------------------------------
export const isMockOpenAI =
  !process.env.AI_INTEGRATIONS_OPENAI_API_KEY && !process.env.OPENAI_API_KEY;

if (isMockOpenAI) {
  logger.warn("No OpenAI API key found — AI endpoints will return mock responses. Set OPENAI_API_KEY to enable real AI features.");
}

export const openai = new OpenAI({
  apiKey:
    process.env.AI_INTEGRATIONS_OPENAI_API_KEY ||
    process.env.OPENAI_API_KEY ||
    "missing-openai-key",
  baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
});

// Default chat/completion model for AI features. Configurable via env so you
// can switch providers (OpenAI, Groq, Anthropic-via-OpenAI-compat, local LLM)
// without touching each route. Defaults to Groq's Llama 3.3 70B since we use
// a Groq-compatible base URL by default in dev.
export const AI_TEXT_MODEL = process.env.AI_TEXT_MODEL || "llama-3.3-70b-versatile";

// Speech-to-text model. Defaults to Groq's Whisper Large v3 Turbo (free, fast,
// 90+ languages) since the same Groq-compatible base URL is used for the chat
// model. Switch to "gpt-4o-mini-transcribe" by setting AI_TRANSCRIBE_MODEL if
// you point AI_INTEGRATIONS_OPENAI_BASE_URL at api.openai.com.
export const AI_TRANSCRIBE_MODEL = process.env.AI_TRANSCRIBE_MODEL || "whisper-large-v3-turbo";

/**
 * Guard middleware for AI endpoints — returns 503 with clear message
 * when OpenAI key is missing, instead of crashing with an auth error.
 */
export function requireOpenAI(req: any, res: any, next: any) {
  if (isMockOpenAI) {
    return res.status(503).json({
      message: "AI features are not available — OpenAI API key is not configured. Please contact the administrator.",
    });
  }
  next();
}

// ---------------------------------------------------------------------------
// Subscription helpers
// ---------------------------------------------------------------------------
export function isSubscriptionActive(user: Express.User): boolean {
  if (user.subscriptionStatus === "active") {
    if (
      user.subscriptionEndDate &&
      new Date(user.subscriptionEndDate) < new Date()
    ) {
      return false;
    }
    return true;
  }
  return false;
}

export function countWords(content: string): number {
  if (!content) return 0;
  let text = content;
  try {
    const parsed = JSON.parse(content);
    if (Array.isArray(parsed)) text = parsed.join(" ");
  } catch {}
  return text
    .trim()
    .split(/\s+/)
    .filter((w) => w.length > 0).length;
}

// ---------------------------------------------------------------------------
// Language helpers
// ---------------------------------------------------------------------------
export const LANGUAGE_NAMES: Record<string, string> = {
  en: "English",  ar: "Arabic",    fr: "French",     es: "Spanish",
  de: "German",   it: "Italian",   pt: "Portuguese", ru: "Russian",
  zh: "Chinese",  ja: "Japanese",  ko: "Korean",     tr: "Turkish",
  nl: "Dutch",    pl: "Polish",    sv: "Swedish",    da: "Danish",
  fi: "Finnish",  no: "Norwegian", he: "Hebrew",     fa: "Persian",
  hi: "Hindi",    bn: "Bengali",   ur: "Urdu",       id: "Indonesian",
  ms: "Malay",    th: "Thai",      vi: "Vietnamese", ro: "Romanian",
  hu: "Hungarian", cs: "Czech",    el: "Greek",      uk: "Ukrainian",
  sk: "Slovak",   hr: "Croatian",  bg: "Bulgarian",  sr: "Serbian",
  lt: "Lithuanian", lv: "Latvian", et: "Estonian",    sl: "Slovenian",
  ca: "Catalan",  sw: "Swahili",   af: "Afrikaans",  am: "Amharic",
  tl: "Filipino",
};

export function getLangName(code: string): string {
  return LANGUAGE_NAMES[code] || code;
}

export function isRTL(code: string): boolean {
  return ["ar", "he", "fa", "ur"].includes(code);
}

// ---------------------------------------------------------------------------
// Content parsing helpers
// ---------------------------------------------------------------------------
export function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export function getChapterText(content: string): string {
  if (!content) return "";
  try {
    const parsed = JSON.parse(content);
    if (Array.isArray(parsed)) return parsed.join("\n\n");
  } catch {}
  return content;
}

export function getChapterPages(content: string): string[] {
  if (!content) return [""];
  try {
    const parsed = JSON.parse(content);
    // v2 format: { v: 2, pages: string, floatingImages: ... }
    if (parsed && typeof parsed === "object" && parsed.v === 2) {
      return [parsed.pages || ""];
    }
    if (Array.isArray(parsed)) return parsed;
  } catch {}
  return [content];
}

export function stripHtml(html: string): string {
  return html
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n\n")
    .replace(/<[^>]*>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export function isHtmlContent(s: string): boolean {
  return /<[a-zA-Z]/.test(s);
}
