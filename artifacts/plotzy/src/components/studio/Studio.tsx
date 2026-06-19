// The Studio
//
// The premium replacement for the old single-model Writing Assistant.
// Three-column glass panel on desktop:
//
//   ┌────────────┬─────────────────────────────────────────┐
//   │ Conv list  │  Model selector chips                   │
//   │            │  Context header                         │
//   │ + New      │  ────────────────────────────────────── │
//   │            │  Chat stream                            │
//   │ - Sarah    │  ┌──────────────────────────────────┐   │
//   │ - Plot     │  │ assistant message                │   │
//   │   ...      │  │ [insert] [retry] [copy]          │   │
//   │            │  └──────────────────────────────────┘   │
//   │            │  Quick actions                          │
//   │            │  Input ────────────────────────────  →  │
//   └────────────┴─────────────────────────────────────────┘
//
// On mobile (under 720px), the conversations sidebar collapses behind
// a hamburger drawer.

import { useEffect, useMemo, useRef, useState } from "react";
import type { Editor as TipTapEditor } from "@tiptap/react";
import { X, Plus, Pin, Archive, Trash2, Send, Square, Wand2 } from "lucide-react";
import { useLanguage } from "@/contexts/language-context";
import { useStudio } from "./useStudio";
import type { ProviderId, ProviderMeta, StudioMessage } from "./types";

const SF =
  '-apple-system, BlinkMacSystemFont, "SF Pro Display", "SF Pro Text", "Helvetica Neue", "Segoe UI", Arial, sans-serif';

interface StudioProps {
  open: boolean;
  onClose: () => void;
  bookId: number;
  chapterId: number | undefined;
  /** TipTap editor ref so the "Insert at cursor" button can call
   *  editor.chain().focus().insertContent(text).run() directly. */
  editorRef: React.RefObject<TipTapEditor | null>;
}

export function Studio({ open, onClose, bookId, chapterId, editorRef }: StudioProps) {
  const { lang, isRTL } = useLanguage();
  const ar = lang === "ar";

  const {
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
    pinConversation,
    archiveConversation,
    deleteConversation,
    selectProvider,
    sendMessage,
    cancelSend,
  } = useStudio({ bookId, chapterId });

  const [input, setInput] = useState("");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const scrollRef = useRef<HTMLDivElement | null>(null);

  // Auto-scroll to the bottom as new chunks stream in.
  useEffect(() => {
    if (!scrollRef.current) return;
    scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages.length, streamingText]);

  const activeProvider = providers.find((p) => p.id === selectedProviderId);
  const accent = activeProvider?.color ?? "#7C3AED";

  function insertAtCursor(text: string) {
    const editor = editorRef.current;
    if (!editor) return;
    editor.chain().focus().insertContent(text).run();
  }

  async function handleSend() {
    const value = input.trim();
    if (!value) return;
    setInput("");
    await sendMessage(value);
  }

  if (!open) return null;

  return (
    <div
      dir={isRTL ? "rtl" : "ltr"}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 60,
        fontFamily: SF,
        background:
          "linear-gradient(180deg, rgba(8,8,12,0.72) 0%, rgba(8,8,12,0.92) 100%)",
        backdropFilter: "blur(8px)",
        display: "flex",
        alignItems: "stretch",
        justifyContent: "flex-end",
        // Tap outside to close.
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      {/* Panel */}
      <div
        style={{
          width: "min(960px, 100vw)",
          height: "100vh",
          background:
            "linear-gradient(180deg, rgba(18,18,24,0.92) 0%, rgba(13,13,18,0.96) 100%)",
          borderInlineStart: "1px solid rgba(255,255,255,0.08)",
          boxShadow: "-20px 0 60px rgba(0,0,0,0.40)",
          display: "grid",
          gridTemplateColumns: sidebarOpen
            ? "280px 1fr"
            : "minmax(220px, 280px) 1fr",
          position: "relative",
        }}
      >
        {/* Sidebar */}
        <Sidebar
          conversations={conversations}
          activeId={activeConversation?.id ?? null}
          providers={providers}
          onSelect={selectConversation}
          onNew={newConversation}
          onPin={pinConversation}
          onArchive={archiveConversation}
          onDelete={deleteConversation}
          ar={ar}
        />

        {/* Main chat area */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            minWidth: 0,
            position: "relative",
          }}
        >
          {/* Aurora glow tinted by the active model */}
          <div
            aria-hidden
            style={{
              position: "absolute",
              top: 0,
              insetInlineStart: 0,
              insetInlineEnd: 0,
              height: 240,
              pointerEvents: "none",
              background: `radial-gradient(ellipse at 50% 0%, ${accent}22 0%, transparent 65%)`,
              transition: "background 400ms ease",
            }}
          />

          {/* Header */}
          <header
            style={{
              padding: "14px 20px 10px",
              borderBlockEnd: "1px solid rgba(255,255,255,0.06)",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 12,
              position: "relative",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <Pulse color={accent} />
              <div>
                <div style={{ fontSize: 14, fontWeight: 700, color: "#fff", letterSpacing: "-0.01em" }}>
                  {ar ? "الاستوديو" : "The Studio"}
                </div>
                <div style={{ fontSize: 11.5, color: "rgba(255,255,255,0.5)" }}>
                  {ar
                    ? "اسأل أي شي عن قصتك"
                    : "Ask anything about your story"}
                </div>
              </div>
            </div>
            <button
              onClick={onClose}
              aria-label={ar ? "إغلاق" : "Close"}
              style={{
                width: 32,
                height: 32,
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                background: "rgba(255,255,255,0.04)",
                border: "1px solid rgba(255,255,255,0.08)",
                borderRadius: 8,
                color: "rgba(255,255,255,0.78)",
                cursor: "pointer",
              }}
            >
              <X size={16} />
            </button>
          </header>

          {/* Model selector */}
          <ModelSelector
            providers={providers}
            quotas={quotas}
            activeId={selectedProviderId}
            onSelect={selectProvider}
            ar={ar}
          />

          {/* Chat scroll area */}
          <div
            ref={scrollRef}
            style={{
              flex: 1,
              overflowY: "auto",
              padding: "8px 20px 12px",
              display: "flex",
              flexDirection: "column",
              gap: 14,
            }}
          >
            {messages.length === 0 && !streamingText && (
              <EmptyState ar={ar} providerColor={accent} />
            )}

            {messages.map((m) => (
              <MessageBubble
                key={m.id}
                message={m}
                providers={providers}
                onInsert={insertAtCursor}
                ar={ar}
              />
            ))}

            {streamingText && (
              <MessageBubble
                key="streaming"
                message={{
                  id: -1,
                  conversationId: activeConversation?.id ?? 0,
                  role: "assistant",
                  providerId: selectedProviderId,
                  content: streamingText,
                  tokenCount: null,
                  costCents: null,
                  createdAt: new Date().toISOString(),
                }}
                providers={providers}
                onInsert={insertAtCursor}
                ar={ar}
                streaming
              />
            )}

            {error && (
              <div
                role="alert"
                style={{
                  margin: "8px 0",
                  padding: "10px 12px",
                  background: "rgba(239,68,68,0.10)",
                  border: "1px solid rgba(239,68,68,0.35)",
                  borderRadius: 10,
                  color: "#fca5a5",
                  fontSize: 13,
                }}
              >
                {error}
              </div>
            )}
          </div>

          {/* Composer */}
          <Composer
            value={input}
            onChange={setInput}
            onSend={handleSend}
            onCancel={cancelSend}
            isSending={isSending}
            accent={accent}
            ar={ar}
          />
        </div>
      </div>
    </div>
  );
}

// ─── Subcomponents ──────────────────────────────────────────────────

function Pulse({ color }: { color: string }) {
  return (
    <div
      aria-hidden
      style={{
        width: 9,
        height: 9,
        borderRadius: 999,
        background: color,
        boxShadow: `0 0 0 0 ${color}88`,
        animation: "studio-pulse 1.8s ease-out infinite",
      }}
    >
      <style>{`
        @keyframes studio-pulse {
          0% { box-shadow: 0 0 0 0 ${color}80; }
          70% { box-shadow: 0 0 0 8px transparent; }
          100% { box-shadow: 0 0 0 0 transparent; }
        }
      `}</style>
    </div>
  );
}

function Sidebar({
  conversations,
  activeId,
  providers,
  onSelect,
  onNew,
  onPin,
  onArchive,
  onDelete,
  ar,
}: {
  conversations: ReturnType<typeof useStudio>["conversations"];
  activeId: number | null;
  providers: ProviderMeta[];
  onSelect: (id: number) => void;
  onNew: () => void;
  onPin: (id: number, pinned: boolean) => void;
  onArchive: (id: number, archived: boolean) => void;
  onDelete: (id: number) => void;
  ar: boolean;
}) {
  return (
    <aside
      style={{
        borderInlineEnd: "1px solid rgba(255,255,255,0.06)",
        background: "rgba(0,0,0,0.18)",
        display: "flex",
        flexDirection: "column",
        minHeight: 0,
      }}
    >
      <div
        style={{
          padding: "14px 14px 10px",
          borderBlockEnd: "1px solid rgba(255,255,255,0.06)",
          display: "flex",
          alignItems: "center",
          gap: 8,
        }}
      >
        <div
          style={{
            fontSize: 11,
            fontWeight: 700,
            color: "rgba(255,255,255,0.5)",
            letterSpacing: "0.08em",
            textTransform: "uppercase",
            flex: 1,
          }}
        >
          {ar ? "المحادثات" : "Conversations"}
        </div>
        <button
          onClick={onNew}
          title={ar ? "محادثة جديدة" : "New conversation"}
          aria-label={ar ? "محادثة جديدة" : "New conversation"}
          style={{
            width: 28,
            height: 28,
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            background: "rgba(124,106,247,0.16)",
            border: "1px solid rgba(124,106,247,0.32)",
            borderRadius: 8,
            color: "#c7b6ff",
            cursor: "pointer",
          }}
        >
          <Plus size={14} />
        </button>
      </div>

      <div style={{ flex: 1, overflowY: "auto", padding: "8px 8px" }}>
        {conversations.length === 0 && (
          <div
            style={{
              padding: "20px 12px",
              fontSize: 12,
              color: "rgba(255,255,255,0.4)",
              lineHeight: 1.6,
              textAlign: "center",
            }}
          >
            {ar
              ? "لا توجد محادثات بعد. اضغط زر «+» لتبدأ."
              : "No conversations yet. Press + to start."}
          </div>
        )}
        {conversations.map((c) => {
          const isActive = c.id === activeId;
          const provider = providers.find((p) => p.id === c.lastProviderId);
          return (
            <div
              key={c.id}
              onClick={() => onSelect(c.id)}
              style={{
                position: "relative",
                padding: "10px 10px 10px 12px",
                borderRadius: 10,
                marginBlockEnd: 4,
                background: isActive
                  ? "linear-gradient(180deg, rgba(124,106,247,0.18) 0%, rgba(124,106,247,0.08) 100%)"
                  : "transparent",
                border: `1px solid ${isActive ? "rgba(124,106,247,0.35)" : "transparent"}`,
                cursor: "pointer",
                transition: "background 140ms",
              }}
            >
              <div
                style={{
                  fontSize: 13,
                  color: "#fff",
                  fontWeight: 600,
                  lineHeight: 1.3,
                  display: "-webkit-box",
                  WebkitLineClamp: 2,
                  WebkitBoxOrient: "vertical",
                  overflow: "hidden",
                }}
              >
                {c.title ?? (ar ? "محادثة بلا عنوان" : "Untitled chat")}
              </div>
              <div
                style={{
                  marginTop: 4,
                  fontSize: 10.5,
                  color: "rgba(255,255,255,0.45)",
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                }}
              >
                <span
                  aria-hidden
                  style={{
                    width: 7,
                    height: 7,
                    borderRadius: 999,
                    background: provider?.color ?? "#7C3AED",
                    boxShadow: `0 0 0 2px ${(provider?.color ?? "#7C3AED")}22`,
                  }}
                />
                <span style={{ flex: 1 }}>
                  {c.messageCount}{" "}
                  {ar
                    ? c.messageCount === 1
                      ? "رسالة"
                      : "رسائل"
                    : c.messageCount === 1
                      ? "msg"
                      : "msgs"}
                </span>
                {c.pinned && <Pin size={10} />}
              </div>
              {/* Hover actions */}
              <div
                style={{
                  position: "absolute",
                  top: 6,
                  insetInlineEnd: 6,
                  display: "flex",
                  gap: 2,
                  opacity: isActive ? 1 : 0,
                  transition: "opacity 120ms",
                }}
                onClick={(e) => e.stopPropagation()}
              >
                <IconBtn
                  title={c.pinned ? (ar ? "إلغاء التثبيت" : "Unpin") : ar ? "تثبيت" : "Pin"}
                  onClick={() => onPin(c.id, !c.pinned)}
                >
                  <Pin size={11} />
                </IconBtn>
                <IconBtn
                  title={ar ? "أرشفة" : "Archive"}
                  onClick={() => onArchive(c.id, true)}
                >
                  <Archive size={11} />
                </IconBtn>
                <IconBtn
                  title={ar ? "حذف" : "Delete"}
                  onClick={() => {
                    if (confirm(ar ? "حذف هذه المحادثة؟" : "Delete this conversation?")) {
                      onDelete(c.id);
                    }
                  }}
                >
                  <Trash2 size={11} />
                </IconBtn>
              </div>
            </div>
          );
        })}
      </div>
    </aside>
  );
}

function IconBtn({
  children,
  onClick,
  title,
}: {
  children: React.ReactNode;
  onClick: () => void;
  title: string;
}) {
  return (
    <button
      onClick={onClick}
      title={title}
      aria-label={title}
      style={{
        width: 22,
        height: 22,
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        background: "rgba(255,255,255,0.06)",
        border: "1px solid rgba(255,255,255,0.10)",
        borderRadius: 6,
        color: "rgba(255,255,255,0.7)",
        cursor: "pointer",
      }}
    >
      {children}
    </button>
  );
}

function ModelSelector({
  providers,
  quotas,
  activeId,
  onSelect,
  ar,
}: {
  providers: ProviderMeta[];
  quotas: Map<ProviderId, { used: number; limit: number | null; remaining: number | null }>;
  activeId: ProviderId;
  onSelect: (id: ProviderId) => void;
  ar: boolean;
}) {
  return (
    <div
      style={{
        padding: "10px 20px 12px",
        display: "flex",
        gap: 8,
        flexWrap: "wrap",
        borderBlockEnd: "1px solid rgba(255,255,255,0.04)",
        position: "relative",
      }}
    >
      {providers.map((p) => {
        const active = p.id === activeId;
        const q = quotas.get(p.id);
        const overLimit = q?.remaining === 0;
        const dim = !p.enabled || overLimit;
        return (
          <button
            key={p.id}
            onClick={() => p.enabled && !overLimit && onSelect(p.id)}
            disabled={dim}
            style={{
              position: "relative",
              padding: "8px 14px",
              borderRadius: 999,
              background: active
                ? `linear-gradient(180deg, ${p.color}22 0%, ${p.color}11 100%)`
                : "rgba(255,255,255,0.03)",
              border: active
                ? `1px solid ${p.color}88`
                : "1px solid rgba(255,255,255,0.08)",
              cursor: dim ? "not-allowed" : "pointer",
              opacity: dim ? 0.45 : 1,
              transition: "all 160ms",
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              minHeight: 36,
            }}
            title={p.strength}
          >
            <span
              aria-hidden
              style={{
                width: 8,
                height: 8,
                borderRadius: 999,
                background: p.color,
                boxShadow: active ? `0 0 0 3px ${p.color}33` : "none",
                transition: "box-shadow 160ms",
              }}
            />
            <span
              style={{
                fontSize: 12.5,
                fontWeight: 600,
                color: active ? "#fff" : "rgba(255,255,255,0.78)",
                letterSpacing: "-0.005em",
              }}
            >
              {p.displayName}
            </span>
            {q && q.limit !== null && (
              <span
                style={{
                  fontSize: 10.5,
                  color: overLimit ? "#fca5a5" : "rgba(255,255,255,0.55)",
                  marginInlineStart: 2,
                }}
              >
                {q.used}/{q.limit}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

function EmptyState({ ar, providerColor }: { ar: boolean; providerColor: string }) {
  const examples = ar
    ? [
        "اقترح طريقة لتطوير الشخصية الرئيسية",
        "راجع المشهد الذي كتبته للتو",
        "اقترح افتتاحية للفصل القادم",
        "ماذا سيقول البطل لو رأى هذا الباب؟",
      ]
    : [
        "Suggest ways to develop the main character",
        "Review the scene I just wrote",
        "Give me an opening for the next chapter",
        "What would my hero say if they saw this door?",
      ];
  return (
    <div
      style={{
        margin: "40px auto",
        maxWidth: 460,
        textAlign: "center",
        color: "rgba(255,255,255,0.62)",
        fontSize: 13.5,
        lineHeight: 1.7,
      }}
    >
      <div
        aria-hidden
        style={{
          width: 56,
          height: 56,
          margin: "0 auto 16px",
          borderRadius: "50%",
          background: `radial-gradient(circle, ${providerColor}33 0%, transparent 70%)`,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Wand2 size={22} color={providerColor} />
      </div>
      <div style={{ fontSize: 17, fontWeight: 700, color: "#fff", marginBottom: 8 }}>
        {ar ? "كيف يمكنني المساعدة اليوم؟" : "How can I help today?"}
      </div>
      <div style={{ marginBottom: 16 }}>
        {ar
          ? "اختر نموذجاً من الأعلى، ثم اسأل أو اطلب من الـ AI أن يساعدك في كتابتك."
          : "Pick a model above, then ask or request anything related to your writing."}
      </div>
      <div style={{ display: "grid", gap: 8 }}>
        {examples.map((s) => (
          <div
            key={s}
            style={{
              padding: "9px 12px",
              borderRadius: 10,
              background: "rgba(255,255,255,0.03)",
              border: "1px solid rgba(255,255,255,0.06)",
              color: "rgba(255,255,255,0.78)",
              fontSize: 12.5,
            }}
          >
            {s}
          </div>
        ))}
      </div>
    </div>
  );
}

function MessageBubble({
  message,
  providers,
  onInsert,
  ar,
  streaming = false,
}: {
  message: StudioMessage;
  providers: ProviderMeta[];
  onInsert: (text: string) => void;
  ar: boolean;
  streaming?: boolean;
}) {
  const isUser = message.role === "user";
  const provider = providers.find((p) => p.id === message.providerId);
  const accent = provider?.color ?? "#7C3AED";

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: isUser ? "flex-end" : "flex-start",
        gap: 6,
      }}
    >
      {!isUser && provider && (
        <div
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            fontSize: 11,
            color: "rgba(255,255,255,0.55)",
            paddingInlineStart: 2,
          }}
        >
          <span
            aria-hidden
            style={{
              width: 6,
              height: 6,
              borderRadius: 999,
              background: accent,
            }}
          />
          <span style={{ fontWeight: 600 }}>{provider.displayName}</span>
          {streaming && (
            <span style={{ color: "rgba(255,255,255,0.4)", fontStyle: "italic" }}>
              {ar ? "يكتب…" : "writing…"}
            </span>
          )}
        </div>
      )}
      <div
        style={{
          maxWidth: "85%",
          padding: "11px 14px",
          borderRadius: 14,
          background: isUser
            ? "linear-gradient(180deg, rgba(124,106,247,0.18) 0%, rgba(124,106,247,0.10) 100%)"
            : "rgba(255,255,255,0.04)",
          border: isUser
            ? "1px solid rgba(124,106,247,0.32)"
            : `1px solid ${accent}22`,
          color: "#fff",
          fontSize: 13.5,
          lineHeight: 1.65,
          whiteSpace: "pre-wrap",
          wordBreak: "break-word",
        }}
      >
        {message.content || (streaming ? "…" : "")}
        {streaming && (
          <span
            aria-hidden
            style={{
              display: "inline-block",
              width: 7,
              height: 14,
              marginInlineStart: 4,
              background: accent,
              borderRadius: 2,
              verticalAlign: "middle",
              animation: "studio-cursor 1s steps(1) infinite",
            }}
          >
            <style>{`@keyframes studio-cursor { 50% { opacity: 0; } }`}</style>
          </span>
        )}
      </div>
      {!isUser && !streaming && message.content && (
        <div style={{ display: "flex", gap: 6, paddingInlineStart: 2 }}>
          <SmallChip
            onClick={() => onInsert(message.content)}
            title={ar ? "أدرج في الفصل" : "Insert at cursor"}
          >
            {ar ? "أدرج" : "Insert"}
          </SmallChip>
          <SmallChip
            onClick={() => navigator.clipboard?.writeText(message.content)}
            title={ar ? "نسخ" : "Copy"}
          >
            {ar ? "نسخ" : "Copy"}
          </SmallChip>
        </div>
      )}
    </div>
  );
}

function SmallChip({
  children,
  onClick,
  title,
}: {
  children: React.ReactNode;
  onClick: () => void;
  title?: string;
}) {
  return (
    <button
      onClick={onClick}
      title={title}
      style={{
        padding: "3px 9px",
        fontSize: 11,
        fontWeight: 500,
        color: "rgba(255,255,255,0.72)",
        background: "rgba(255,255,255,0.04)",
        border: "1px solid rgba(255,255,255,0.08)",
        borderRadius: 999,
        cursor: "pointer",
      }}
    >
      {children}
    </button>
  );
}

function Composer({
  value,
  onChange,
  onSend,
  onCancel,
  isSending,
  accent,
  ar,
}: {
  value: string;
  onChange: (v: string) => void;
  onSend: () => void;
  onCancel: () => void;
  isSending: boolean;
  accent: string;
  ar: boolean;
}) {
  return (
    <div
      style={{
        padding: "12px 20px 18px",
        borderBlockStart: "1px solid rgba(255,255,255,0.06)",
        background: "rgba(0,0,0,0.20)",
      }}
    >
      <div
        style={{
          display: "flex",
          gap: 10,
          alignItems: "flex-end",
          background: "rgba(255,255,255,0.04)",
          border: `1px solid ${accent}33`,
          borderRadius: 14,
          padding: "8px 8px 8px 12px",
        }}
      >
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              if (!isSending) onSend();
            }
          }}
          placeholder={ar ? "اكتب رسالتك…" : "Type your message…"}
          rows={1}
          style={{
            flex: 1,
            background: "transparent",
            border: "none",
            outline: "none",
            resize: "none",
            color: "#fff",
            fontFamily: "inherit",
            fontSize: 13.5,
            lineHeight: 1.5,
            minHeight: 36,
            maxHeight: 200,
          }}
        />
        {isSending ? (
          <button
            onClick={onCancel}
            aria-label={ar ? "إيقاف" : "Stop"}
            style={{
              width: 36,
              height: 36,
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              borderRadius: 10,
              background: "rgba(239,68,68,0.18)",
              border: "1px solid rgba(239,68,68,0.4)",
              color: "#fca5a5",
              cursor: "pointer",
            }}
          >
            <Square size={14} />
          </button>
        ) : (
          <button
            onClick={onSend}
            disabled={!value.trim()}
            aria-label={ar ? "إرسال" : "Send"}
            style={{
              width: 36,
              height: 36,
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              borderRadius: 10,
              background: value.trim()
                ? `linear-gradient(180deg, ${accent} 0%, ${accent}cc 100%)`
                : "rgba(255,255,255,0.06)",
              border: "1px solid rgba(255,255,255,0.10)",
              color: value.trim() ? "#fff" : "rgba(255,255,255,0.35)",
              cursor: value.trim() ? "pointer" : "default",
              transition: "background 160ms",
            }}
          >
            <Send size={14} />
          </button>
        )}
      </div>
    </div>
  );
}
