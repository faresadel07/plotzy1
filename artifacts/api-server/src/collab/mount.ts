// Wires live collaboration into the existing HTTP server + Express app:
//
//   GET /api/collab/token/:chapterId   (session-authed) → short-lived
//       HMAC token binding user, chapter and role, for the socket below.
//
//   ws(s)://<api-host>/collab          WebSocket upgrade handled by
//       Hocuspocus; authenticated with the token above, NOT the cookie
//       (the SPA lives on another origin, so cookies don't ride along).
//
// Everything is behind COLLAB_ENABLED (default on; set "false" to kill
// the feature without a code change). With the flag off the upgrade
// listener still destroys /collab sockets so nothing hangs.

import type { Server as HttpServer } from "http";
import type { Express, Request, Response } from "express";
import { WebSocketServer } from "ws";
import { requireAuth } from "../middleware/auth";
import { generalLimiter } from "../middleware/rate-limit";
import { logger } from "../lib/logger";
import {
  collabEnabled,
  createCollabServer,
  issueCollabToken,
  resolveChapterRole,
  chapterDocName,
} from "./collab-server";

export function mountCollab(httpServer: HttpServer, app: Express): void {
  // ── Token endpoint ─────────────────────────────────────────────────
  app.get(
    "/api/collab/token/:chapterId",
    requireAuth,
    generalLimiter,
    async (req: Request, res: Response) => {
      try {
        if (!collabEnabled()) {
          return res.status(503).json({ message: "Live collaboration is disabled" });
        }
        const chapterId = parseInt(String(req.params.chapterId), 10);
        if (!Number.isSafeInteger(chapterId) || chapterId <= 0) {
          return res.status(400).json({ message: "Invalid chapter id" });
        }
        const user = req.user as any;
        const role = await resolveChapterRole(chapterId, user.id);
        if (!role) {
          return res.status(403).json({ message: "No access to this chapter" });
        }
        const token = issueCollabToken({
          userId: user.id,
          chapterId,
          role,
          name: String(user.displayName || user.email || "Writer").slice(0, 60),
        });
        return res.json({
          token,
          docName: chapterDocName(chapterId),
          path: "/collab",
          role,
        });
      } catch (err) {
        logger.error({ err }, "collab token issue failed");
        return res.status(500).json({ message: "Internal error" });
      }
    },
  );

  // ── WebSocket upgrade ──────────────────────────────────────────────
  const hocuspocus = createCollabServer();
  const wss = new WebSocketServer({ noServer: true });

  wss.on("connection", (ws, request) => {
    // Hocuspocus v4 takes a fetch-style Request (Headers/URLSearchParams)
    // and, crucially, does NOT subscribe to socket events itself: the
    // integration owns the socket and forwards inbound messages and the
    // close event into the ClientConnection. Without this forwarding the
    // protocol handshake never advances (verified against 4.3.0).
    const headers = new Headers();
    for (const [key, value] of Object.entries(request.headers)) {
      if (typeof value === "string") headers.set(key, value);
      else if (Array.isArray(value)) headers.set(key, value.join(", "));
    }
    const fetchRequest = new Request(
      `http://collab.internal${request.url ?? "/collab"}`,
      { headers },
    );

    const connection = hocuspocus.handleConnection(ws as any, fetchRequest);
    ws.on("message", (data: Buffer) => {
      try {
        connection.handleMessage(new Uint8Array(data));
      } catch (err) {
        logger.warn({ err }, "collab: message handling failed");
      }
    });
    ws.on("close", () => connection.handleClose());
    ws.on("error", (err) => {
      logger.warn({ err }, "collab: socket error");
      connection.handleClose();
    });
  });

  httpServer.on("upgrade", (request, socket, head) => {
    let pathname = "";
    try {
      pathname = new URL(request.url ?? "", "http://localhost").pathname;
    } catch {
      socket.destroy();
      return;
    }
    if (pathname !== "/collab") {
      // No other WebSocket endpoints exist on this server; anything else
      // is unexpected and gets dropped instead of left hanging.
      socket.destroy();
      return;
    }
    if (!collabEnabled()) {
      socket.destroy();
      return;
    }
    wss.handleUpgrade(request, socket, head, (ws) => {
      wss.emit("connection", ws, request);
    });
  });

  logger.info(
    { enabled: collabEnabled() },
    "collab: token route + /collab websocket mounted",
  );
}
