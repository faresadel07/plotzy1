// Shared types for The Studio.

export type ProviderId = "claude" | "gpt" | "gemini" | "llama";

export const PROVIDER_IDS: readonly ProviderId[] = [
  "claude",
  "gpt",
  "gemini",
  "llama",
] as const;

/** Backend-provided metadata about a provider chip. */
export interface ProviderMeta {
  id: ProviderId;
  displayName: string;
  enabled: boolean;
  color: string;
  strength: string;
  /** null = unlimited (Llama). */
  dailyLimit: number | null;
}

/** Per-provider per-day quota. null fields = unlimited. */
export interface QuotaInfo {
  providerId: ProviderId;
  used: number;
  limit: number | null;
  remaining: number | null;
}

/** A single message row from the API. */
export interface StudioMessage {
  id: number;
  conversationId: number;
  role: "user" | "assistant" | "system";
  providerId: ProviderId | null;
  content: string;
  tokenCount: number | null;
  costCents: number | null;
  createdAt: string;
}

/** A conversation row from the sidebar list endpoint. */
export interface StudioConversation {
  id: number;
  bookId: number;
  chapterId: number | null;
  title: string | null;
  pinned: boolean;
  archived: boolean;
  parentConversationId: number | null;
  lastProviderId: ProviderId;
  messageCount: number;
  createdAt: string;
  updatedAt: string;
}

/** Messages on the wire during streaming. */
export type StreamEvent =
  | { type: "start"; conversationId: number; userMessageId: number; providerId: ProviderId }
  | { type: "chunk"; text: string }
  | { type: "done"; conversationId: number; assistantMessageId: number; usage: { inputTokens: number; outputTokens: number; costCents: number } }
  | { type: "cancelled" }
  | { type: "error"; message: string };
