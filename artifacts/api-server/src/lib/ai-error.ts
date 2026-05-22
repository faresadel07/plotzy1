// Centralised error handler for every server-side AI call. The
// per-route try/catch blocks used to log {err} and return a generic
// 500 ("Failed to improve text", "Failed to process voice", ...).
// When something went wrong end-to-end (provider down, wrong base
// URL, expired key, model deprecation) the operator could only see
// the generic message in the browser and a single-line error stack
// in Railway. This helper unpacks the OpenAI / Groq error shape,
// writes a richer log entry, and, for admins, surfaces the real
// reason into the HTTP response so we do not have to ping-pong
// through Railway logs to diagnose the next breakage.

import type { Response } from "express";
import { logger } from "./logger";
import { isAdminUser } from "./admin";

interface AiCallContext {
  route: string;
  user?: Express.User | null;
}

/** Pull every diagnostic field the openai SDK might attach to an error. */
function unpack(err: unknown): {
  message: string;
  status: number | null;
  code: string | null;
  type: string | null;
  providerMessage: string | null;
} {
  const e = err as {
    message?: unknown;
    status?: unknown;
    code?: unknown;
    type?: unknown;
    error?: { message?: unknown; type?: unknown; code?: unknown };
    response?: { data?: { error?: { message?: unknown } } };
  };
  const message =
    (typeof e?.message === "string" && e.message) ||
    (typeof e?.error?.message === "string" && e.error.message) ||
    "Unknown error";
  const status =
    typeof e?.status === "number"
      ? e.status
      : null;
  const code =
    (typeof e?.code === "string" && e.code) ||
    (typeof e?.error?.code === "string" && e.error.code) ||
    null;
  const type =
    (typeof e?.type === "string" && e.type) ||
    (typeof e?.error?.type === "string" && e.error.type) ||
    null;
  const providerMessage =
    (typeof e?.error?.message === "string" && e.error.message) ||
    (typeof e?.response?.data?.error?.message === "string" &&
      e.response.data.error.message) ||
    null;
  return { message, status, code, type, providerMessage };
}

/**
 * Log the error in a structured form and write a 500 (or the
 * upstream status, if 4xx) JSON response. Returns the response so
 * route handlers can `return handleAiError(...)`. For administrators,
 * the JSON response includes the actual provider message; everyone
 * else gets the same friendly fallback we have always returned.
 */
export function handleAiError(
  res: Response,
  err: unknown,
  ctx: AiCallContext,
  friendly: string,
): Response {
  const info = unpack(err);
  logger.error(
    {
      route: ctx.route,
      userId: ctx.user ? (ctx.user as any).id : null,
      ai: {
        status: info.status,
        code: info.code,
        type: info.type,
        message: info.message,
        provider: info.providerMessage,
      },
      // Always include the env we actually used so we never have to
      // wonder if Railway is on the right base URL or model. Keys
      // themselves are not logged.
      env: {
        baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL || "(default openai)",
        model: process.env.AI_TEXT_MODEL || "(default llama)",
        hasOpenAIKey:
          !!process.env.OPENAI_API_KEY ||
          !!process.env.AI_INTEGRATIONS_OPENAI_API_KEY,
      },
    },
    "AI route failure",
  );

  // Pass the upstream status through (auth, rate-limit) when the
  // provider returned a 4xx; otherwise our own 500.
  const httpStatus =
    info.status && info.status >= 400 && info.status < 500
      ? info.status
      : 500;

  // Admins see the actual reason, everyone else sees the friendly
  // message so we never leak provider internals to end users.
  const body: { message: string; debug?: Record<string, unknown> } = {
    message: friendly,
  };
  if (ctx.user && isAdminUser(ctx.user)) {
    body.debug = {
      status: info.status,
      code: info.code,
      type: info.type,
      providerMessage: info.providerMessage,
      message: info.message,
      baseURL:
        process.env.AI_INTEGRATIONS_OPENAI_BASE_URL || "(default openai)",
      model: process.env.AI_TEXT_MODEL || "(default llama)",
    };
  }
  return res.status(httpStatus).json(body);
}
