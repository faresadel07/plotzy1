// The single hook that backs the entire Studio panel.
//
// What it owns:
//   - the list of providers (fetched once on mount)
//   - the per-day quota per provider (refreshed after every send)
//   - the list of conversations for the current chapter (and book-
//     level conversations with chapterId = null)
//   - the active conversation id + its messages
//   - the in-flight streaming state (a partial assistant message
//     being typed by the AI right now)
//   - the user's selected provider id
//
// What it exposes (via the return value):
//   - state: providers, conversations, activeConversation, messages,
//     streamingText, isSending, quotas, error
//   - actions: selectConversation, newConversation, renameConversation,
//     pinConversation, archiveConversation, deleteConversation,
//     selectProvider, sendMessage, cancelSend, refreshAll
//
// The hook is deliberately a "fat" hook so the components stay
// presentational. Everything the UI needs is on the return object;
// nothing is hidden behind a context.

import { useCallback, useEffect, useRef, useState } from "react";
import type {
  ProviderId,
  ProviderMeta,
  QuotaInfo,
  StreamEvent,
  StudioConversation,
  StudioMessage,
} from "./types";

interface UseStudioArgs {
  bookId: number;
  /** May be 0 / undefined when the panel is opened from a book-level
   *  page; the hook treats 0 as "no chapter filter". */
  chapterId: number | undefined;
}

interface UseStudioReturn {
  // State
  providers: ProviderMeta[];
  conversations: StudioConversation[];
  activeConversation: StudioConversation | null;
  messages: StudioMessage[];
  streamingText: string;
  isSending: boolean;
  selectedProviderId: ProviderId;
  quotas: Map<ProviderId, QuotaInfo>;
  error: string | null;

  // Actions
  selectConversation: (id: number) => Promise<void>;
  newConversation: () => Promise<void>;
  renameConversation: (id: number, title: string) => Promise<void>;
  pinConversation: (id: number, pinned: boolean) => Promise<void>;
  archiveConversation: (id: number, archived: boolean) => Promise<void>;
  deleteConversation: (id: number) => Promise<void>;
  selectProvider: (id: ProviderId) => void;
  sendMessage: (content: string) => Promise<void>;
  cancelSend: () => void;
  refreshAll: () => Promise<void>;
}

export function useStudio({ bookId, chapterId }: UseStudioArgs): UseStudioReturn {
  const [providers, setProviders] = useState<ProviderMeta[]>([]);
  const [quotas, setQuotas] = useState<Map<ProviderId, QuotaInfo>>(new Map());
  const [conversations, setConversations] = useState<StudioConversation[]>([]);
  const [activeId, setActiveId] = useState<number | null>(null);
  const [messages, setMessages] = useState<StudioMessage[]>([]);
  const [streamingText, setStreamingText] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [selectedProviderId, setSelectedProviderId] = useState<ProviderId>("llama");
  const [error, setError] = useState<string | null>(null);

  const abortRef = useRef<AbortController | null>(null);

  const activeConversation =
    conversations.find((c) => c.id === activeId) ?? null;

  // ─── Loaders ──────────────────────────────────────────────────────

  const loadProviders = useCallback(async () => {
    const r = await fetch("/api/studio/providers", { credentials: "include" });
    if (!r.ok) return;
    const data = await r.json();
    setProviders(data.providers as ProviderMeta[]);
  }, []);

  const loadQuotas = useCallback(async () => {
    const r = await fetch("/api/studio/quotas", { credentials: "include" });
    if (!r.ok) return;
    const data = await r.json();
    const next = new Map<ProviderId, QuotaInfo>();
    for (const q of data.quotas as QuotaInfo[]) {
      next.set(q.providerId, q);
    }
    setQuotas(next);
  }, []);

  const loadConversations = useCallback(async () => {
    const params = new URLSearchParams();
    if (bookId) params.set("bookId", String(bookId));
    if (chapterId) params.set("chapterId", String(chapterId));
    const r = await fetch(
      `/api/studio/conversations?${params.toString()}`,
      { credentials: "include" },
    );
    if (!r.ok) return;
    const data = await r.json();
    setConversations(data.conversations as StudioConversation[]);
    return data.conversations as StudioConversation[];
  }, [bookId, chapterId]);

  const loadMessages = useCallback(async (id: number) => {
    const r = await fetch(`/api/studio/conversations/${id}/messages`, {
      credentials: "include",
    });
    if (!r.ok) {
      setMessages([]);
      return;
    }
    const data = await r.json();
    setMessages(data.messages as StudioMessage[]);
  }, []);

  // ─── On mount: load everything ─────────────────────────────────────

  useEffect(() => {
    let cancelled = false;
    (async () => {
      await Promise.all([loadProviders(), loadQuotas()]);
      const convos = await loadConversations();
      if (cancelled) return;
      // Default to the most recently active conversation if there is one,
      // otherwise create a fresh empty conversation so the writer always
      // sees a usable Studio on open.
      if (convos && convos.length > 0) {
        const first = convos[0];
        setActiveId(first.id);
        setSelectedProviderId(first.lastProviderId);
        await loadMessages(first.id);
      } else if (bookId) {
        const r = await fetch("/api/studio/conversations", {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            bookId,
            chapterId: chapterId || undefined,
            providerId: "llama",
          }),
        });
        if (r.ok) {
          const data = await r.json();
          const conv = data.conversation as StudioConversation;
          setConversations([{ ...conv, messageCount: 0 }]);
          setActiveId(conv.id);
          setMessages([]);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bookId, chapterId]);

  // ─── Actions ──────────────────────────────────────────────────────

  const selectConversation = useCallback(
    async (id: number) => {
      const conv = conversations.find((c) => c.id === id);
      setActiveId(id);
      setStreamingText("");
      if (conv) setSelectedProviderId(conv.lastProviderId);
      await loadMessages(id);
    },
    [conversations, loadMessages],
  );

  const newConversation = useCallback(async () => {
    if (!bookId) return;
    const r = await fetch("/api/studio/conversations", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        bookId,
        chapterId: chapterId || undefined,
        providerId: selectedProviderId,
      }),
    });
    if (!r.ok) {
      setError("Could not create a new conversation.");
      return;
    }
    const data = await r.json();
    const conv = data.conversation as StudioConversation;
    setConversations((prev) => [{ ...conv, messageCount: 0 }, ...prev]);
    setActiveId(conv.id);
    setMessages([]);
    setStreamingText("");
  }, [bookId, chapterId, selectedProviderId]);

  const patchConversation = useCallback(
    async (id: number, patch: Record<string, unknown>) => {
      const r = await fetch(`/api/studio/conversations/${id}`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      });
      if (!r.ok) return;
      const data = await r.json();
      const updated = data.conversation as StudioConversation;
      setConversations((prev) =>
        prev.map((c) => (c.id === id ? { ...c, ...updated } : c)),
      );
    },
    [],
  );

  const renameConversation = useCallback(
    (id: number, title: string) => patchConversation(id, { title }),
    [patchConversation],
  );
  const pinConversation = useCallback(
    (id: number, pinned: boolean) => patchConversation(id, { pinned }),
    [patchConversation],
  );
  const archiveConversation = useCallback(
    (id: number, archived: boolean) => patchConversation(id, { archived }),
    [patchConversation],
  );

  const deleteConversation = useCallback(
    async (id: number) => {
      const r = await fetch(`/api/studio/conversations/${id}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (!r.ok) return;
      setConversations((prev) => prev.filter((c) => c.id !== id));
      if (activeId === id) {
        setActiveId(null);
        setMessages([]);
        setStreamingText("");
      }
    },
    [activeId],
  );

  const selectProvider = useCallback((id: ProviderId) => {
    setSelectedProviderId(id);
  }, []);

  const cancelSend = useCallback(() => {
    abortRef.current?.abort();
  }, []);

  const sendMessage = useCallback(
    async (content: string) => {
      if (!activeId || !content.trim() || isSending) return;
      setError(null);
      setIsSending(true);
      setStreamingText("");

      // Optimistically append the user's message so they see it instantly.
      const tempUserMsg: StudioMessage = {
        id: -Math.floor(Math.random() * 1e9),
        conversationId: activeId,
        role: "user",
        providerId: selectedProviderId,
        content,
        tokenCount: null,
        costCents: null,
        createdAt: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, tempUserMsg]);

      const abortController = new AbortController();
      abortRef.current = abortController;

      try {
        const r = await fetch("/api/studio/chat", {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            conversationId: activeId,
            providerId: selectedProviderId,
            content,
          }),
          signal: abortController.signal,
        });

        if (!r.ok) {
          const body = await r.json().catch(() => ({}));
          throw new Error(body?.message || "Studio request failed");
        }

        // Parse SSE stream by hand. Each event is two lines:
        //   event: chunk
        //   data: {"text": "..."}
        const reader = r.body!.getReader();
        const decoder = new TextDecoder();
        let buffer = "";
        let assembled = "";
        let finalAssistantId: number | null = null;

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });

          // Process complete events (separated by double newlines).
          let eventEnd: number;
          while ((eventEnd = buffer.indexOf("\n\n")) >= 0) {
            const block = buffer.slice(0, eventEnd);
            buffer = buffer.slice(eventEnd + 2);
            const evt = parseSseEvent(block);
            if (!evt) continue;
            if (evt.type === "chunk") {
              assembled += evt.text;
              setStreamingText(assembled);
            } else if (evt.type === "done") {
              finalAssistantId = evt.assistantMessageId;
            } else if (evt.type === "error") {
              throw new Error(evt.message);
            } else if (evt.type === "cancelled") {
              break;
            }
          }
        }

        // Commit the assistant message and clear the streaming buffer.
        if (assembled) {
          const finalMsg: StudioMessage = {
            id: finalAssistantId ?? -Math.floor(Math.random() * 1e9),
            conversationId: activeId,
            role: "assistant",
            providerId: selectedProviderId,
            content: assembled,
            tokenCount: null,
            costCents: null,
            createdAt: new Date().toISOString(),
          };
          setMessages((prev) => [...prev, finalMsg]);
        }
        setStreamingText("");

        // Refresh quotas + conversation order in the background.
        Promise.all([loadQuotas(), loadConversations()]).catch(() => {});
      } catch (e) {
        if ((e as Error).name === "AbortError") {
          // Save what we streamed so far as a (partial) assistant
          // message so the user has the half-result to read.
          if (streamingText) {
            const partial: StudioMessage = {
              id: -Math.floor(Math.random() * 1e9),
              conversationId: activeId,
              role: "assistant",
              providerId: selectedProviderId,
              content: streamingText + "\n\n_[cancelled]_",
              tokenCount: null,
              costCents: null,
              createdAt: new Date().toISOString(),
            };
            setMessages((prev) => [...prev, partial]);
          }
          setStreamingText("");
        } else {
          setError((e as Error).message);
          // Roll back the optimistic user message on hard failure.
          setMessages((prev) => prev.filter((m) => m.id !== tempUserMsg.id));
        }
      } finally {
        setIsSending(false);
        abortRef.current = null;
      }
    },
    [activeId, isSending, selectedProviderId, streamingText, loadQuotas, loadConversations],
  );

  const refreshAll = useCallback(async () => {
    await Promise.all([loadProviders(), loadQuotas(), loadConversations()]);
    if (activeId !== null) await loadMessages(activeId);
  }, [loadProviders, loadQuotas, loadConversations, loadMessages, activeId]);

  return {
    providers,
    conversations,
    activeConversation,
    messages,
    streamingText,
    isSending,
    selectedProviderId,
    quotas,
    error,
    selectConversation,
    newConversation,
    renameConversation,
    pinConversation,
    archiveConversation,
    deleteConversation,
    selectProvider,
    sendMessage,
    cancelSend,
    refreshAll,
  };
}

// ─── SSE parsing helper ─────────────────────────────────────────────

function parseSseEvent(block: string): StreamEvent | null {
  const lines = block.split("\n");
  let event = "";
  let data = "";
  for (const line of lines) {
    if (line.startsWith("event:")) event = line.slice(6).trim();
    else if (line.startsWith("data:")) data += line.slice(5).trim();
  }
  if (!event) return null;
  try {
    const parsed = data ? JSON.parse(data) : {};
    return { type: event as StreamEvent["type"], ...parsed } as StreamEvent;
  } catch {
    return null;
  }
}
