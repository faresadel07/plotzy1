// In-memory attachment cache for the Studio chat endpoint.
//
// The composer uploads files via POST /api/studio/upload and receives
// short opaque ids. When the writer sends a chat message they pass the
// list of ids alongside the text content; the chat endpoint loads the
// bytes from this cache, hands them to the provider in the right
// multi-modal shape, then evicts the rows once the request finishes.
//
// Production note: this lives in process memory so an attached file
// only survives until the next deploy. That is the right tradeoff for
// the chat use case (the file is only needed for the in-flight turn).
// If we ever need persistence across deploys, swap this for an S3
// bucket — the rest of the studio code reads through the same
// helpers below and doesn't care where the bytes live.

import { randomBytes } from "crypto";

/** What the composer uploaded, before any provider-specific
 *  translation. */
export interface StudioAttachmentRecord {
  id: string;
  ownerId: number;
  filename: string;
  mimeType: string;
  size: number;
  kind: "image" | "pdf" | "doc" | "text" | "other";
  data: Buffer;
  /** Plain-text content for non-image, non-PDF docs that we extracted
   *  at upload time (DOCX, TXT, MD). Cached so the chat handler does
   *  not need to re-parse for every turn the writer references this
   *  attachment. */
  extractedText?: string;
  createdAt: number;
}

const TTL_MS = 60 * 60 * 1000; // 1 hour — generous for slow typists
const MAX_BYTES_PER_USER = 80 * 1024 * 1024; // 80 MB outstanding cap

const store = new Map<string, StudioAttachmentRecord>();

/** Sweep records older than TTL_MS. Called from every read/write so
 *  the cache doesn't grow unboundedly across long-running deploys. */
function sweepExpired(): void {
  const cutoff = Date.now() - TTL_MS;
  for (const [id, rec] of store) {
    if (rec.createdAt < cutoff) store.delete(id);
  }
}

/** Total bytes still cached for a given user. Used to enforce the
 *  per-user outstanding-bytes cap so a single writer cannot park 1 GB
 *  in memory by uploading then never sending. */
function bytesForUser(ownerId: number): number {
  let total = 0;
  for (const rec of store.values()) if (rec.ownerId === ownerId) total += rec.size;
  return total;
}

export function detectKind(mimeType: string): StudioAttachmentRecord["kind"] {
  if (mimeType.startsWith("image/")) return "image";
  if (mimeType === "application/pdf") return "pdf";
  if (
    mimeType === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
    mimeType === "application/msword"
  ) {
    return "doc";
  }
  if (mimeType === "text/plain" || mimeType === "text/markdown" || mimeType.startsWith("text/")) {
    return "text";
  }
  return "other";
}

/** Pull the readable text out of a DOCX / TXT / MD / PDF so the chat
 *  handler can offer a text-only fallback for providers without
 *  native PDF support (currently OpenAI in the chat completions API).
 *  Images are skipped — those have to round-trip as binary anyway. */
export async function extractText(
  data: Buffer,
  kind: StudioAttachmentRecord["kind"],
  mimeType: string,
): Promise<string | undefined> {
  if (kind === "text") {
    return data.toString("utf-8").slice(0, 60_000);
  }
  if (kind === "doc") {
    const mammoth = await import("mammoth");
    const result = await mammoth.extractRawText({ buffer: data });
    return (result.value ?? "").slice(0, 60_000);
  }
  if (kind === "pdf") {
    try {
      // pdf-parse exports a default function on Node; calling it on the
      // raw Buffer returns { text, numpages, ... }.
      const mod = await import("pdf-parse");
      const pdfParse = (mod as any).default ?? mod;
      const result = await pdfParse(data);
      return (result.text ?? "").slice(0, 60_000);
    } catch {
      return undefined;
    }
  }
  void mimeType;
  return undefined;
}

export interface StoreAttachmentInput {
  ownerId: number;
  filename: string;
  mimeType: string;
  data: Buffer;
}

export async function storeAttachment(
  input: StoreAttachmentInput,
): Promise<StudioAttachmentRecord> {
  sweepExpired();
  if (bytesForUser(input.ownerId) + input.data.length > MAX_BYTES_PER_USER) {
    const err = new Error(`Attachment cap exceeded for user (${MAX_BYTES_PER_USER} bytes)`);
    (err as Error & { code?: string }).code = "STUDIO_UPLOAD_QUOTA";
    throw err;
  }
  const kind = detectKind(input.mimeType);
  const extractedText = await extractText(input.data, kind, input.mimeType);
  const rec: StudioAttachmentRecord = {
    id: randomBytes(12).toString("hex"),
    ownerId: input.ownerId,
    filename: input.filename,
    mimeType: input.mimeType,
    size: input.data.length,
    kind,
    data: input.data,
    extractedText,
    createdAt: Date.now(),
  };
  store.set(rec.id, rec);
  return rec;
}

export function getAttachment(id: string, ownerId: number): StudioAttachmentRecord | undefined {
  sweepExpired();
  const rec = store.get(id);
  if (!rec) return undefined;
  if (rec.ownerId !== ownerId) return undefined;
  return rec;
}

export function deleteAttachment(id: string, ownerId: number): boolean {
  const rec = store.get(id);
  if (!rec || rec.ownerId !== ownerId) return false;
  store.delete(id);
  return true;
}
