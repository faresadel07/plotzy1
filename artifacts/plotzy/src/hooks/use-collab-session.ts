// Live co-writing session hook: owns the Yjs document and the
// Hocuspocus connection for one chapter.
//
// - Tokens are short-lived (2 min server-side), so the provider gets an
//   async token FUNCTION: every (re)connect fetches a fresh token with
//   the user's session. A dropped connection therefore reauthenticates
//   cleanly even hours later.
// - The WebSocket goes DIRECTLY to the API host: the SPA's /api rewrite
//   through Vercel cannot proxy WebSockets.
// - Peers come from Yjs awareness; each client announces { name, color }
//   which the CollaborationCaret extension also renders inside the text.

import { useEffect, useMemo, useRef, useState } from "react";
import * as Y from "yjs";
import { HocuspocusProvider } from "@hocuspocus/provider";

export type CollabStatus =
  | "connecting"
  | "active"
  | "denied"
  | "offline";

export interface CollabPeer {
  clientId: number;
  name: string;
  color: string;
  isSelf: boolean;
}

// Stable per-user cursor colors, readable on the dark editor surface.
const CURSOR_COLORS = [
  "#5eb3ff", "#ff8a4c", "#5fcf8e", "#f472b6",
  "#a78bfa", "#d9a441", "#7c9cff", "#e0b088",
];

export function pickCursorColor(seed: string): string {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) | 0;
  return CURSOR_COLORS[Math.abs(h) % CURSOR_COLORS.length];
}

function wsUrl(): string {
  const configured = import.meta.env.VITE_COLLAB_WS_URL as string | undefined;
  if (configured) return configured;
  if (import.meta.env.DEV) return "ws://localhost:8080/collab";
  return "wss://workspaceapi-server-production-14b0.up.railway.app/collab";
}

async function fetchToken(chapterId: number): Promise<string> {
  const res = await fetch(`/api/collab/token/${chapterId}`, {
    credentials: "same-origin",
  });
  if (!res.ok) throw new Error(`collab token: ${res.status}`);
  const data = (await res.json()) as { token: string };
  return data.token;
}

export function useCollabSession(opts: {
  chapterId: number;
  enabled: boolean;
  userName: string;
}) {
  const { chapterId, enabled, userName } = opts;
  const [status, setStatus] = useState<CollabStatus>("connecting");
  const [peers, setPeers] = useState<CollabPeer[]>([]);
  const [synced, setSynced] = useState(false);

  // One Y.Doc + provider per (chapterId, enabled) lifecycle.
  const docRef = useRef<Y.Doc | null>(null);
  const providerRef = useRef<HocuspocusProvider | null>(null);
  const [, force] = useState(0);

  const color = useMemo(() => pickCursorColor(userName || "writer"), [userName]);

  useEffect(() => {
    if (!enabled || !chapterId) return;

    const doc = new Y.Doc();
    docRef.current = doc;
    setStatus("connecting");
    setSynced(false);

    const provider = new HocuspocusProvider({
      url: wsUrl(),
      name: `chapter:${chapterId}`,
      document: doc,
      token: () => fetchToken(chapterId),
      onAuthenticated() {
        setStatus("active");
      },
      onAuthenticationFailed() {
        setStatus("denied");
      },
      onSynced() {
        setSynced(true);
      },
      onStatus({ status: s }) {
        if (s === "disconnected") setStatus((cur) => (cur === "denied" ? cur : "offline"));
      },
    });
    providerRef.current = provider;

    provider.setAwarenessField("user", { name: userName || "Writer", color });

    const readPeers = () => {
      const states = provider.awareness?.getStates();
      if (!states) return;
      const self = provider.awareness?.clientID;
      const list: CollabPeer[] = [];
      states.forEach((state, clientId) => {
        const u = (state as any)?.user;
        if (!u) return;
        list.push({
          clientId,
          name: String(u.name || "Writer"),
          color: String(u.color || CURSOR_COLORS[0]),
          isSelf: clientId === self,
        });
      });
      list.sort((a, b) => (a.isSelf === b.isSelf ? a.clientId - b.clientId : a.isSelf ? -1 : 1));
      setPeers(list);
    };
    provider.awareness?.on("change", readPeers);
    readPeers();
    force((n) => n + 1); // expose refs to the consumer after creation

    return () => {
      provider.awareness?.off("change", readPeers);
      try { provider.destroy(); } catch { /* already closed */ }
      try { doc.destroy(); } catch { /* already destroyed */ }
      providerRef.current = null;
      docRef.current = null;
    };
    // userName/color changes mid-session are pushed via awareness below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chapterId, enabled]);

  // Keep the awareness identity fresh if the display name loads late.
  useEffect(() => {
    providerRef.current?.setAwarenessField("user", { name: userName || "Writer", color });
  }, [userName, color]);

  return {
    doc: docRef.current,
    provider: providerRef.current,
    status,
    synced,
    peers,
    othersCount: peers.filter((p) => !p.isSelf).length,
    color,
  };
}
