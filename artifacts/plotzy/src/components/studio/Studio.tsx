// The Studio v2
//
// Side-panel redesign with pure-black Plotzy palette and brand logos
// in every model chip. Fixed to the right edge of the screen, leaves
// the chapter editor visible to the left so the writer can highlight,
// copy, paste between page and chat freely.
//
// What changed from v1:
//   - No backdrop overlay. The panel is a 420px right sidebar.
//   - Pure #000 background, white borders, zero purple.
//   - Per-model brand SVG icons replace the colour dot in each chip.
//   - Brand colour stays inside the chip only; the rest of the panel
//     is monochrome black + white.
//   - White streaming cursor, white send button accent.
//   - Empty state rewritten in Plotzy voice.

import { useEffect, useRef, useState } from "react";
import type { Editor as TipTapEditor } from "@tiptap/react";
import { X, Plus, Pin, Archive, Trash2, Send, Square } from "lucide-react";
import { useLanguage } from "@/contexts/language-context";
import { useStudio } from "./useStudio";
import type { ProviderId, ProviderMeta, StudioMessage } from "./types";
import { ProviderIcon, StudioIcon } from "./icons";

const SF =
  '-apple-system, BlinkMacSystemFont, "SF Pro Display", "SF Pro Text", "Helvetica Neue", "Segoe UI", Arial, sans-serif';

// Plotzy palette constants. Kept inline so the panel feels native
// without depending on a CSS variable file that other parts of the
// site already use.
const PANEL_BG = "#000";
const CARD_BG = "rgba(255,255,255,0.04)";
const CARD_BG_STRONG = "rgba(255,255,255,0.07)";
const BORDER = "rgba(255,255,255,0.08)";
const BORDER_STRONG = "rgba(255,255,255,0.16)";
const BORDER_ACTIVE = "rgba(255,255,255,0.32)";
const TEXT = "#fff";
const TEXT_DIM = "rgba(255,255,255,0.65)";
const TEXT_MUTE = "rgba(255,255,255,0.42)";

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
  const [sidebarVisible, setSidebarVisible] = useState(true);
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const [isMobile, setIsMobile] = useState(
    typeof window !== "undefined" ? window.innerWidth < 720 : false,
  );

  // Track viewport width so the panel switches to fullscreen when the
  // editor would not fit beside it anyway.
  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth < 720);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  // Auto-scroll to the bottom as new chunks stream in.
  useEffect(() => {
    if (!scrollRef.current) return;
    scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages.length, streamingText]);

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
        top: 0,
        bottom: 0,
        insetInlineEnd: 0,
        zIndex: 60,
        // 420px on desktop, full-screen on phone-sized viewports.
        width: isMobile ? "100vw" : 420,
        background: PANEL_BG,
        borderInlineStart: `1px solid ${BORDER}`,
        boxShadow: "0 0 60px rgba(0,0,0,0.5)",
        display: "grid",
        gridTemplateRows: "auto auto auto 1fr auto",
        fontFamily: SF,
        // Pointer events stay inside the panel only, so clicks on the
        // chapter editor pass through normally.
        pointerEvents: "auto",
      }}
    >
      {/* Header */}
      <header
        style={{
          padding: "16px 18px 12px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 12,
          borderBottom: `1px solid ${BORDER}`,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
          <StudioIcon size={18} color={TEXT} />
          <div style={{ minWidth: 0 }}>
            <div
              style={{
                fontSize: 14,
                fontWeight: 700,
                color: TEXT,
                letterSpacing: "-0.01em",
                lineHeight: 1.2,
              }}
            >
              {ar ? "الاستوديو" : "The Studio"}
            </div>
            <div
              style={{
                fontSize: 11.5,
                color: TEXT_MUTE,
                marginTop: 2,
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
              }}
            >
              {activeConversation?.title ??
                (ar ? "محادثة جديدة" : "New conversation")}
            </div>
          </div>
        </div>
        <button
          onClick={onClose}
          aria-label={ar ? "إغلاق" : "Close"}
          style={iconButtonStyle()}
        >
          <X size={15} />
        </button>
      </header>

      {/* Model selector chips */}
      <ModelSelector
        providers={providers}
        quotas={quotas}
        activeId={selectedProviderId}
        onSelect={selectProvider}
      />

      {/* Conversation tabs row (compact) */}
      <ConversationTabs
        conversations={conversations}
        activeId={activeConversation?.id ?? null}
        sidebarVisible={sidebarVisible}
        onToggleSidebar={() => setSidebarVisible((v) => !v)}
        onSelect={selectConversation}
        onNew={newConversation}
        ar={ar}
      />

      {/* Conversation sidebar drawer + chat area */}
      <div
        style={{
          minHeight: 0,
          position: "relative",
          display: "grid",
          gridTemplateColumns: sidebarVisible && !isMobile ? "180px 1fr" : "1fr",
        }}
      >
        {sidebarVisible && !isMobile && (
          <Sidebar
            conversations={conversations}
            activeId={activeConversation?.id ?? null}
            onSelect={selectConversation}
            onPin={pinConversation}
            onArchive={archiveConversation}
            onDelete={deleteConversation}
            ar={ar}
          />
        )}

        {/* Chat scroll area */}
        <div
          ref={scrollRef}
          style={{
            overflowY: "auto",
            padding: "12px 18px 16px",
            display: "flex",
            flexDirection: "column",
            gap: 14,
            minHeight: 0,
          }}
        >
          {messages.length === 0 && !streamingText && <EmptyState ar={ar} />}

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
                border: "1px solid rgba(239,68,68,0.30)",
                borderRadius: 10,
                color: "#fca5a5",
                fontSize: 13,
              }}
            >
              {error}
            </div>
          )}
        </div>
      </div>

      {/* Composer */}
      <Composer
        value={input}
        onChange={setInput}
        onSend={handleSend}
        onCancel={cancelSend}
        isSending={isSending}
        ar={ar}
      />
    </div>
  );
}

// ─── Subcomponents ──────────────────────────────────────────────────

function iconButtonStyle(): React.CSSProperties {
  return {
    width: 30,
    height: 30,
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    background: CARD_BG,
    border: `1px solid ${BORDER}`,
    borderRadius: 8,
    color: TEXT_DIM,
    cursor: "pointer",
    transition: "all 140ms ease",
  };
}

function ModelSelector({
  providers,
  quotas,
  activeId,
  onSelect,
}: {
  providers: ProviderMeta[];
  quotas: Map<ProviderId, { used: number; limit: number | null; remaining: number | null }>;
  activeId: ProviderId;
  onSelect: (id: ProviderId) => void;
}) {
  return (
    <div
      style={{
        padding: "10px 14px",
        display: "flex",
        gap: 6,
        flexWrap: "wrap",
        borderBottom: `1px solid ${BORDER}`,
        background: PANEL_BG,
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
            title={p.strength}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              padding: "6px 10px",
              borderRadius: 999,
              background: active ? CARD_BG_STRONG : "transparent",
              border: `1px solid ${active ? BORDER_ACTIVE : BORDER}`,
              cursor: dim ? "not-allowed" : "pointer",
              opacity: dim ? 0.4 : 1,
              transition: "all 140ms ease",
              minHeight: 32,
              outline: "none",
            }}
          >
            <ProviderIcon
              providerId={p.id}
              size={13}
              color={p.color}
            />
            <span
              style={{
                fontSize: 12,
                fontWeight: 600,
                color: active ? TEXT : TEXT_DIM,
                letterSpacing: "-0.005em",
              }}
            >
              {p.displayName}
            </span>
            {q && q.limit !== null && (
              <span
                style={{
                  fontSize: 10.5,
                  color: overLimit ? "#fca5a5" : TEXT_MUTE,
                  marginInlineStart: 2,
                  fontVariantNumeric: "tabular-nums",
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

function ConversationTabs({
  conversations,
  activeId,
  sidebarVisible,
  onToggleSidebar,
  onSelect: _onSelect,
  onNew,
  ar,
}: {
  conversations: ReturnType<typeof useStudio>["conversations"];
  activeId: number | null;
  sidebarVisible: boolean;
  onToggleSidebar: () => void;
  onSelect: (id: number) => void;
  onNew: () => void;
  ar: boolean;
}) {
  const active = conversations.find((c) => c.id === activeId);
  return (
    <div
      style={{
        padding: "8px 14px",
        display: "flex",
        alignItems: "center",
        gap: 8,
        borderBottom: `1px solid ${BORDER}`,
        background: PANEL_BG,
      }}
    >
      <button
        onClick={onToggleSidebar}
        title={ar ? (sidebarVisible ? "إخفاء" : "إظهار") : sidebarVisible ? "Hide list" : "Show list"}
        style={{
          ...iconButtonStyle(),
          width: 28,
          height: 28,
        }}
      >
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
          <line x1="3" y1="6" x2="21" y2="6" />
          <line x1="3" y1="12" x2="21" y2="12" />
          <line x1="3" y1="18" x2="21" y2="18" />
        </svg>
      </button>
      <div
        style={{
          flex: 1,
          minWidth: 0,
          fontSize: 11.5,
          color: TEXT_DIM,
          fontWeight: 500,
          letterSpacing: "0.02em",
          whiteSpace: "nowrap",
          overflow: "hidden",
          textOverflow: "ellipsis",
        }}
      >
        {active?.title ??
          (conversations.length === 0
            ? ar
              ? "لا توجد محادثات"
              : "No conversations"
            : ar
              ? "محادثة بلا عنوان"
              : "Untitled")}
      </div>
      <button
        onClick={onNew}
        title={ar ? "محادثة جديدة" : "New conversation"}
        style={{
          ...iconButtonStyle(),
          width: 28,
          height: 28,
        }}
      >
        <Plus size={13} />
      </button>
    </div>
  );
}

function Sidebar({
  conversations,
  activeId,
  onSelect,
  onPin,
  onArchive,
  onDelete,
  ar,
}: {
  conversations: ReturnType<typeof useStudio>["conversations"];
  activeId: number | null;
  onSelect: (id: number) => void;
  onPin: (id: number, pinned: boolean) => void;
  onArchive: (id: number, archived: boolean) => void;
  onDelete: (id: number) => void;
  ar: boolean;
}) {
  return (
    <aside
      style={{
        borderInlineEnd: `1px solid ${BORDER}`,
        background: PANEL_BG,
        display: "flex",
        flexDirection: "column",
        minHeight: 0,
        overflowY: "auto",
        padding: "8px 6px",
      }}
    >
      {conversations.length === 0 && (
        <div
          style={{
            padding: "16px 10px",
            fontSize: 11.5,
            color: TEXT_MUTE,
            lineHeight: 1.6,
            textAlign: "center",
          }}
        >
          {ar ? "لا محادثات" : "Empty"}
        </div>
      )}
      {conversations.map((c) => {
        const isActive = c.id === activeId;
        return (
          <div
            key={c.id}
            onClick={() => onSelect(c.id)}
            style={{
              position: "relative",
              padding: "8px 8px 8px 10px",
              borderRadius: 8,
              marginBottom: 3,
              background: isActive ? CARD_BG_STRONG : "transparent",
              border: `1px solid ${isActive ? BORDER_STRONG : "transparent"}`,
              cursor: "pointer",
              transition: "background 120ms",
            }}
          >
            <div
              style={{
                fontSize: 12,
                color: TEXT,
                fontWeight: 500,
                lineHeight: 1.3,
                display: "-webkit-box",
                WebkitLineClamp: 2,
                WebkitBoxOrient: "vertical",
                overflow: "hidden",
              }}
            >
              {c.title ?? (ar ? "بلا عنوان" : "Untitled")}
            </div>
            <div
              style={{
                marginTop: 3,
                fontSize: 10,
                color: TEXT_MUTE,
                display: "flex",
                alignItems: "center",
                gap: 4,
              }}
            >
              <span style={{ flex: 1 }}>
                {c.messageCount}
                {ar
                  ? c.messageCount === 1
                    ? " رسالة"
                    : " رسائل"
                  : c.messageCount === 1
                    ? " msg"
                    : " msgs"}
              </span>
              {c.pinned && <Pin size={9} />}
            </div>
            {isActive && (
              <div
                style={{
                  marginTop: 6,
                  display: "flex",
                  gap: 4,
                }}
                onClick={(e) => e.stopPropagation()}
              >
                <SidebarIconBtn
                  onClick={() => onPin(c.id, !c.pinned)}
                  title={c.pinned ? (ar ? "إلغاء" : "Unpin") : ar ? "تثبيت" : "Pin"}
                >
                  <Pin size={10} />
                </SidebarIconBtn>
                <SidebarIconBtn
                  onClick={() => onArchive(c.id, true)}
                  title={ar ? "أرشفة" : "Archive"}
                >
                  <Archive size={10} />
                </SidebarIconBtn>
                <SidebarIconBtn
                  onClick={() => {
                    if (
                      confirm(ar ? "حذف هذه المحادثة؟" : "Delete this conversation?")
                    ) {
                      onDelete(c.id);
                    }
                  }}
                  title={ar ? "حذف" : "Delete"}
                >
                  <Trash2 size={10} />
                </SidebarIconBtn>
              </div>
            )}
          </div>
        );
      })}
    </aside>
  );
}

function SidebarIconBtn({
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
        flex: 1,
        height: 22,
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        background: CARD_BG,
        border: `1px solid ${BORDER}`,
        borderRadius: 6,
        color: TEXT_DIM,
        cursor: "pointer",
      }}
    >
      {children}
    </button>
  );
}

function EmptyState({ ar }: { ar: boolean }) {
  return (
    <div
      style={{
        margin: "44px auto",
        maxWidth: 320,
        textAlign: "center",
        color: TEXT_DIM,
        fontSize: 13,
        lineHeight: 1.75,
      }}
    >
      <div style={{ display: "flex", justifyContent: "center", marginBottom: 18 }}>
        <StudioIcon size={28} color={TEXT} style={{ opacity: 0.85 }} />
      </div>
      <div
        style={{
          fontSize: 15,
          fontWeight: 600,
          color: TEXT,
          marginBottom: 10,
          letterSpacing: "-0.01em",
        }}
      >
        {ar ? "الاستوديو يستمع." : "The Studio is listening."}
      </div>
      <div style={{ marginBottom: 4 }}>
        {ar
          ? "ظلّل فقرة واطلب مني تحسينها."
          : "Highlight a paragraph and ask me to polish it."}
      </div>
      <div style={{ marginBottom: 4 }}>
        {ar
          ? "قلّي شو رح تقول شخصيّتك بعدين."
          : "Tell me what your character should say next."}
      </div>
      <div style={{ color: TEXT_MUTE, fontSize: 12, marginTop: 16 }}>
        {ar ? "أو اكتب فقط. أنا أعرف الكتاب." : "Or just type. I know the book."}
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

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: isUser ? "flex-end" : "flex-start",
        gap: 5,
      }}
    >
      {!isUser && provider && (
        <div
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            fontSize: 10.5,
            color: TEXT_MUTE,
            paddingInlineStart: 2,
          }}
        >
          <ProviderIcon
            providerId={provider.id}
            size={11}
            color={provider.color}
          />
          <span style={{ fontWeight: 600, color: TEXT_DIM }}>
            {provider.displayName}
          </span>
          {streaming && (
            <span style={{ color: TEXT_MUTE, fontStyle: "italic" }}>
              {ar ? "يكتب…" : "writing…"}
            </span>
          )}
        </div>
      )}
      <div
        style={{
          maxWidth: "88%",
          padding: "10px 13px",
          borderRadius: 12,
          background: isUser ? CARD_BG_STRONG : CARD_BG,
          border: `1px solid ${isUser ? BORDER_STRONG : BORDER}`,
          color: TEXT,
          fontSize: 13,
          lineHeight: 1.65,
          whiteSpace: "pre-wrap",
          wordBreak: "break-word",
          // Allow text inside the bubble to be selected for copy/paste
          // between page and chat in either direction.
          userSelect: "text",
        }}
      >
        {message.content || (streaming ? "…" : "")}
        {streaming && (
          <span
            aria-hidden
            style={{
              display: "inline-block",
              width: 6,
              height: 13,
              marginInlineStart: 3,
              background: TEXT,
              borderRadius: 1,
              verticalAlign: "middle",
              animation: "studio-cursor 1s steps(1) infinite",
            }}
          >
            <style>{`@keyframes studio-cursor { 50% { opacity: 0; } }`}</style>
          </span>
        )}
      </div>
      {!isUser && !streaming && message.content && (
        <div style={{ display: "flex", gap: 5, paddingInlineStart: 2 }}>
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
        padding: "3px 8px",
        fontSize: 10.5,
        fontWeight: 500,
        color: TEXT_DIM,
        background: CARD_BG,
        border: `1px solid ${BORDER}`,
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
  ar,
}: {
  value: string;
  onChange: (v: string) => void;
  onSend: () => void;
  onCancel: () => void;
  isSending: boolean;
  ar: boolean;
}) {
  const hasText = value.trim().length > 0;
  return (
    <div
      style={{
        padding: "10px 14px 16px",
        borderTop: `1px solid ${BORDER}`,
        background: PANEL_BG,
      }}
    >
      <div
        style={{
          display: "flex",
          gap: 8,
          alignItems: "flex-end",
          background: CARD_BG,
          border: `1px solid ${BORDER}`,
          borderRadius: 12,
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
            color: TEXT,
            fontFamily: "inherit",
            fontSize: 13,
            lineHeight: 1.5,
            minHeight: 32,
            maxHeight: 200,
          }}
        />
        {isSending ? (
          <button
            onClick={onCancel}
            aria-label={ar ? "إيقاف" : "Stop"}
            style={{
              width: 32,
              height: 32,
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              borderRadius: 9,
              background: "rgba(239,68,68,0.14)",
              border: "1px solid rgba(239,68,68,0.34)",
              color: "#fca5a5",
              cursor: "pointer",
            }}
          >
            <Square size={12} />
          </button>
        ) : (
          <button
            onClick={onSend}
            disabled={!hasText}
            aria-label={ar ? "إرسال" : "Send"}
            style={{
              width: 32,
              height: 32,
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              borderRadius: 9,
              background: hasText ? TEXT : CARD_BG,
              border: `1px solid ${hasText ? TEXT : BORDER}`,
              color: hasText ? "#000" : TEXT_MUTE,
              cursor: hasText ? "pointer" : "default",
              transition: "all 140ms ease",
            }}
          >
            <Send size={12} />
          </button>
        )}
      </div>
    </div>
  );
}
