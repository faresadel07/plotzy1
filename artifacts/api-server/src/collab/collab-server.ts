// Live co-writing (Yjs) — server side.
//
// A Hocuspocus instance handles the Yjs sync protocol for one document
// per chapter (documentName "chapter:<id>"). It is mounted on the main
// HTTP server via a WebSocket upgrade on /collab (see mountCollab), so
// no extra service or port is needed on Railway.
//
// AUTH: the SPA runs on a different origin (Vercel) than this API
// (Railway), so the session cookie cannot ride along on the WebSocket.
// Instead the client first calls GET /api/collab/token/:chapterId with
// its normal session; that endpoint verifies book access and returns a
// short-lived HMAC token binding (userId, chapterId, role, name, exp).
// Hocuspocus' onAuthenticate verifies the token, checks it matches the
// requested document, and marks viewer connections read-only.
//
// PERSISTENCE: the official Database extension loads/stores the encoded
// Yjs document in chapter_collab_docs, debounced (2s, max 10s) so a busy
// session doesn't hammer Postgres. chapters.content stays the render
// source of truth for readers and exports; the client bridge keeps it
// fresh through the normal chapter save path during a session.

import { createHmac, timingSafeEqual } from "node:crypto";
import { Hocuspocus } from "@hocuspocus/server";
import { Database } from "@hocuspocus/extension-database";
import { and, eq } from "drizzle-orm";
import { db } from "../db";
import { chapterCollabDocs, chapters, books, bookCollaborators } from "../../../../lib/db/src/schema";
import { logger } from "../lib/logger";

export type CollabRole = "owner" | "editor" | "viewer";

const TOKEN_TTL_SECONDS = 120;

function secret(): string {
  const s = process.env.SESSION_SECRET;
  if (!s) throw new Error("SESSION_SECRET is required for collab tokens");
  return s;
}

export function collabEnabled(): boolean {
  return process.env.COLLAB_ENABLED !== "false";
}

// ── Token format ──────────────────────────────────────────────────────
// base64url(json payload) + "." + hex hmac-sha256 over the payload part.
// Payload carries everything onAuthenticate needs so no DB round-trip is
// required to accept the socket (the role was checked at issue time, and
// tokens live for two minutes).

interface CollabTokenPayload {
  userId: number;
  chapterId: number;
  role: CollabRole;
  /** Display name shown on the remote cursor. */
  name: string;
  exp: number; // unix seconds
}

function sign(payloadB64: string): string {
  return createHmac("sha256", secret()).update(payloadB64).digest("hex");
}

export function issueCollabToken(payload: Omit<CollabTokenPayload, "exp">): string {
  const full: CollabTokenPayload = {
    ...payload,
    exp: Math.floor(Date.now() / 1000) + TOKEN_TTL_SECONDS,
  };
  const b64 = Buffer.from(JSON.stringify(full)).toString("base64url");
  return `${b64}.${sign(b64)}`;
}

export function verifyCollabToken(token: string): CollabTokenPayload | null {
  const dot = token.lastIndexOf(".");
  if (dot <= 0) return null;
  const b64 = token.slice(0, dot);
  const mac = token.slice(dot + 1);
  const expected = sign(b64);
  if (mac.length !== expected.length) return null;
  try {
    if (!timingSafeEqual(Buffer.from(mac, "hex"), Buffer.from(expected, "hex"))) return null;
    const payload = JSON.parse(Buffer.from(b64, "base64url").toString()) as CollabTokenPayload;
    if (typeof payload.userId !== "number" || typeof payload.chapterId !== "number") return null;
    if (payload.role !== "owner" && payload.role !== "editor" && payload.role !== "viewer") return null;
    if (typeof payload.exp !== "number" || payload.exp * 1000 < Date.now()) return null;
    return payload;
  } catch {
    return null;
  }
}

// ── Access resolution (used by the token endpoint) ────────────────────
// Owner of the book → "owner". Collaborator row → its role. Otherwise null.
export async function resolveChapterRole(
  chapterId: number,
  userId: number,
): Promise<CollabRole | null> {
  const [ch] = await db
    .select({ bookId: chapters.bookId })
    .from(chapters)
    .where(eq(chapters.id, chapterId));
  if (!ch) return null;

  const [book] = await db
    .select({ userId: books.userId })
    .from(books)
    .where(eq(books.id, ch.bookId));
  if (!book) return null;
  if (book.userId === userId) return "owner";

  const [collab] = await db
    .select({ role: bookCollaborators.role })
    .from(bookCollaborators)
    .where(and(eq(bookCollaborators.bookId, ch.bookId), eq(bookCollaborators.userId, userId)));
  if (!collab) return null;
  return collab.role === "viewer" ? "viewer" : "editor";
}

// ── Document name helpers ─────────────────────────────────────────────

export function chapterDocName(chapterId: number): string {
  return `chapter:${chapterId}`;
}

function parseDocName(documentName: string): number | null {
  const m = /^chapter:(\d+)$/.exec(documentName);
  if (!m) return null;
  const id = Number(m[1]);
  return Number.isSafeInteger(id) && id > 0 ? id : null;
}

// ── The Hocuspocus instance ───────────────────────────────────────────

export interface CollabContext {
  userId: number;
  role: CollabRole;
  name: string;
}

export function createCollabServer(): Hocuspocus<CollabContext> {
  return new Hocuspocus<CollabContext>({
    // Quiet the default console banner; we log through pino below.
    quiet: true,

    // Debounce writes: store at most every 2s per document, flush by 10s.
    debounce: 2000,
    maxDebounce: 10_000,

    async onAuthenticate({ token, documentName, connectionConfig }) {
      const payload = verifyCollabToken(token);
      if (!payload) {
        throw new Error("invalid or expired collab token");
      }
      const chapterId = parseDocName(documentName);
      if (chapterId === null || chapterId !== payload.chapterId) {
        throw new Error("token does not grant access to this document");
      }
      if (payload.role === "viewer") {
        connectionConfig.readOnly = true;
      }
      const context: CollabContext = {
        userId: payload.userId,
        role: payload.role,
        name: payload.name,
      };
      return context;
    },

    extensions: [
      new Database({
        fetch: async ({ documentName }) => {
          const chapterId = parseDocName(documentName);
          if (chapterId === null) return null;
          const [row] = await db
            .select({ state: chapterCollabDocs.state })
            .from(chapterCollabDocs)
            .where(eq(chapterCollabDocs.chapterId, chapterId));
          return row ? new Uint8Array(row.state) : null;
        },
        store: async ({ documentName, state }) => {
          const chapterId = parseDocName(documentName);
          if (chapterId === null) return;
          await db
            .insert(chapterCollabDocs)
            .values({ chapterId, state, updatedAt: new Date() })
            .onConflictDoUpdate({
              target: chapterCollabDocs.chapterId,
              set: { state, updatedAt: new Date() },
            });
        },
      }),
    ],

    async onDisconnect({ documentName, clientsCount }) {
      if (clientsCount === 0) {
        logger.info({ documentName }, "collab: last client left, document unloading");
      }
    },
  });
}
