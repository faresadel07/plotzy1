// Shared types for The Studio.

export type ProviderId = "claude" | "gpt" | "gemini" | "cerebras" | "llama";

export const PROVIDER_IDS: readonly ProviderId[] = [
  "claude",
  "gpt",
  "gemini",
  "cerebras",
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
  /** Title of the book / blog post this conversation belongs to —
   *  the drawer lists conversations across all the writer's work, so
   *  each row is labelled with its source. */
  bookTitle?: string | null;
  /** "book" | "article" — which kind of work the conversation is
   *  scoped to (blog posts are books with contentType "article"). */
  bookContentType?: string | null;
}

/** Attachment uploaded by the writer alongside a message. The backend
 *  /api/studio/upload endpoint returns a row of this shape; the
 *  composer renders chips from this shape; sendMessage passes the
 *  list of IDs to the chat endpoint which loads the bytes from disk
 *  and feeds them to the provider as multi-modal input. */
export interface StudioAttachment {
  /** Server-generated id used in /api/studio/upload responses. */
  id: string;
  /** Original filename the writer chose (for the chip label). */
  filename: string;
  /** MIME type as detected on upload. */
  mimeType: string;
  /** Size in bytes for the chip's secondary text. */
  size: number;
  /** Bucketed type the UI uses to pick the right chip icon. */
  kind: "image" | "pdf" | "doc" | "text" | "other";
  /** Public-ish URL the composer uses to render image previews
   *  inline (signed/short-lived, scoped to the uploader). */
  url?: string;
}

/** Which providers can accept image / PDF inputs. Anything not in
 *  this set must reject attached files in the UI, since the backend
 *  will refuse the request. */
export const VISION_PROVIDERS: readonly ProviderId[] = ["claude", "gpt", "gemini"] as const;

export function providerAcceptsVision(id: ProviderId): boolean {
  return (VISION_PROVIDERS as readonly string[]).includes(id);
}

/** Messages on the wire during streaming. */
export type StreamEvent =
  | { type: "start"; conversationId: number; userMessageId: number; providerId: ProviderId }
  | { type: "chunk"; text: string }
  | { type: "done"; conversationId: number; assistantMessageId: number; usage: { inputTokens: number; outputTokens: number; costCents: number } }
  | { type: "cancelled" }
  | { type: "error"; message: string };
