// The Studio v3
//
// Refined right-rail panel. Goals over v2:
//   - Bigger, calmer header that reads like a product name, not a chip.
//   - The five model pills collapse into one dropdown that lives in the
//     header. Most users pick a model once a session, so the row was
//     pure clutter the rest of the time.
//   - Conversation list moves into a slide-in drawer; the chat area now
//     owns the full width of the panel by default.
//   - Empty state is rewritten as a single line plus three quick-action
//     chips, so the first thing a writer sees is what they can do, not
//     three sentences about what the Studio knows.
//   - Composer is rounded, more generous, and the send button only
//     becomes white when the input is non-empty.

import { useEffect, useRef, useState } from "react";
import type { Editor as TipTapEditor } from "@tiptap/react";
import {
  X,
  Plus,
  Pin,
  Archive,
  Trash2,
  Send,
  Square,
  ChevronDown,
  PanelLeft,
  Check,
  Sparkles,
  ArrowRight,
  Lightbulb,
} from "lucide-react";
import { useLanguage } from "@/contexts/language-context";
import { useStudio } from "./useStudio";
import type { ProviderId, ProviderMeta, StudioMessage } from "./types";
import { ProviderIcon, StudioIcon } from "./icons";

const SF =
  '-apple-system, BlinkMacSystemFont, "SF Pro Display", "SF Pro Text", "Helvetica Neue", "Segoe UI", Arial, sans-serif';

// Plotzy palette constants. Inlined so the panel feels native without
// depending on the global CSS variable layer.
const PANEL_BG = "#000";
const CARD_BG = "rgba(255,255,255,0.04)";
const CARD_BG_STRONG = "rgba(255,255,255,0.07)";
const CARD_BG_HOVER = "rgba(255,255,255,0.06)";
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
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [modelMenuOpen, setModelMenuOpen] = useState(false);
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const [isMobile, setIsMobile] = useState(
    typeof window !== "undefined" ? window.innerWidth < 720 : false,
  );

  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth < 720);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  useEffect(() => {
    if (!scrollRef.current) return;
    scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages.length, streamingText]);

  // Close transient overlays on Escape.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      if (modelMenuOpen) {
        setModelMenuOpen(false);
        return;
      }
      if (drawerOpen) {
        setDrawerOpen(false);
        return;
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, modelMenuOpen, drawerOpen]);

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

  function handleQuickAction(prompt: string) {
    setInput(prompt);
  }

  if (!open) return null;

  const activeProvider = providers.find((p) => p.id === selectedProviderId);

  return (
    <div
      dir={isRTL ? "rtl" : "ltr"}
      style={{
        position: "fixed",
        top: 0,
        bottom: 0,
        insetInlineEnd: 0,
        zIndex: 60,
        width: isMobile ? "100vw" : 440,
        background: PANEL_BG,
        borderInlineStart: `1px solid ${BORDER}`,
        boxShadow: "-12px 0 60px rgba(0,0,0,0.5)",
        display: "grid",
        gridTemplateRows: "auto 1fr auto",
        fontFamily: SF,
        pointerEvents: "auto",
      }}
    >
      {/* ── Header ──────────────────────────────────────────────── */}
      <Header
        ar={ar}
        activeProvider={activeProvider}
        quota={activeProvider ? quotas.get(activeProvider.id) : undefined}
        modelMenuOpen={modelMenuOpen}
        onToggleModelMenu={() => setModelMenuOpen((v) => !v)}
        onToggleDrawer={() => setDrawerOpen((v) => !v)}
        onNew={newConversation}
        onClose={onClose}
        activeTitle={activeConversation?.title ?? null}
      />

      {/* ── Model dropdown (positioned absolute under header) ── */}
      {modelMenuOpen && (
        <ModelMenu
          ar={ar}
          providers={providers}
          quotas={quotas}
          activeId={selectedProviderId}
          onSelect={(id) => {
            selectProvider(id);
            setModelMenuOpen(false);
          }}
          onClose={() => setModelMenuOpen(false)}
        />
      )}

      {/* ── Drawer (absolute overlay) ─────────────────────────── */}
      {drawerOpen && (
        <Drawer
          ar={ar}
          conversations={conversations}
          activeId={activeConversation?.id ?? null}
          onSelect={(id) => {
            selectConversation(id);
            setDrawerOpen(false);
          }}
          onPin={pinConversation}
          onArchive={archiveConversation}
          onDelete={deleteConversation}
          onClose={() => setDrawerOpen(false)}
          onNew={() => {
            newConversation();
            setDrawerOpen(false);
          }}
        />
      )}

      {/* ── Chat scroll area ─────────────────────────────────── */}
      <div
        ref={scrollRef}
        style={{
          overflowY: "auto",
          padding: "20px 22px 12px",
          display: "flex",
          flexDirection: "column",
          gap: 16,
          minHeight: 0,
        }}
      >
        {messages.length === 0 && !streamingText && (
          <EmptyState ar={ar} onQuickAction={handleQuickAction} />
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
              padding: "12px 14px",
              background: "rgba(239,68,68,0.10)",
              border: "1px solid rgba(239,68,68,0.30)",
              borderRadius: 12,
              color: "#fca5a5",
              fontSize: 13,
            }}
          >
            {error}
          </div>
        )}
      </div>

      {/* ── Composer ─────────────────────────────────────────── */}
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

// ─── Header ────────────────────────────────────────────────────────

function Header({
  ar,
  activeProvider,
  quota,
  modelMenuOpen,
  onToggleModelMenu,
  onToggleDrawer,
  onNew,
  onClose,
  activeTitle,
}: {
  ar: boolean;
  activeProvider: ProviderMeta | undefined;
  quota: { used: number; limit: number | null; remaining: number | null } | undefined;
  modelMenuOpen: boolean;
  onToggleModelMenu: () => void;
  onToggleDrawer: () => void;
  onNew: () => void;
  onClose: () => void;
  activeTitle: string | null;
}) {
  return (
    <header
      style={{
        position: "relative",
        padding: "16px 18px 14px",
        borderBottom: `1px solid ${BORDER}`,
        background: PANEL_BG,
      }}
    >
      {/* Row 1: brand mark + right action cluster */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 10,
          marginBottom: 12,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
          <StudioIcon size={22} color={TEXT} />
          <div
            style={{
              fontSize: 17,
              fontWeight: 700,
              color: TEXT,
              letterSpacing: "-0.018em",
              lineHeight: 1.1,
            }}
          >
            {ar ? "الاستوديو" : "The Studio"}
          </div>
        </div>
        <div style={{ display: "flex", gap: 4 }}>
          <IconButton
            onClick={onToggleDrawer}
            title={ar ? "المحادثات" : "Conversations"}
          >
            <PanelLeft size={14} />
          </IconButton>
          <IconButton
            onClick={onNew}
            title={ar ? "محادثة جديدة" : "New chat"}
          >
            <Plus size={14} />
          </IconButton>
          <IconButton onClick={onClose} title={ar ? "إغلاق" : "Close"}>
            <X size={14} />
          </IconButton>
        </div>
      </div>

      {/* Row 2: model picker */}
      <button
        onClick={onToggleModelMenu}
        aria-expanded={modelMenuOpen}
        aria-haspopup="menu"
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 9,
          padding: "7px 11px 7px 9px",
          background: modelMenuOpen ? CARD_BG_STRONG : CARD_BG,
          border: `1px solid ${modelMenuOpen ? BORDER_ACTIVE : BORDER}`,
          borderRadius: 999,
          cursor: "pointer",
          color: TEXT,
          transition: "all 140ms ease",
          fontFamily: "inherit",
        }}
      >
        {activeProvider && (
          <ProviderIcon
            providerId={activeProvider.id}
            size={14}
            color={activeProvider.color}
          />
        )}
        <span
          style={{
            fontSize: 12.5,
            fontWeight: 600,
            letterSpacing: "-0.005em",
          }}
        >
          {activeProvider?.displayName ?? "—"}
        </span>
        {quota && quota.limit !== null && (
          <span
            style={{
              fontSize: 10.5,
              color: quota.remaining === 0 ? "#fca5a5" : TEXT_MUTE,
              fontVariantNumeric: "tabular-nums",
              fontWeight: 500,
            }}
          >
            {quota.used}/{quota.limit}
          </span>
        )}
        <ChevronDown
          size={13}
          color={TEXT_DIM}
          style={{
            transition: "transform 160ms ease",
            transform: modelMenuOpen ? "rotate(180deg)" : "rotate(0deg)",
          }}
        />
      </button>

      {/* Row 3: subtle conversation breadcrumb */}
      {activeTitle && (
        <div
          style={{
            marginTop: 10,
            fontSize: 11,
            color: TEXT_MUTE,
            letterSpacing: "0.02em",
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
          }}
        >
          {activeTitle}
        </div>
      )}
    </header>
  );
}

// ─── Model dropdown menu ───────────────────────────────────────────

function ModelMenu({
  ar,
  providers,
  quotas,
  activeId,
  onSelect,
  onClose,
}: {
  ar: boolean;
  providers: ProviderMeta[];
  quotas: Map<ProviderId, { used: number; limit: number | null; remaining: number | null }>;
  activeId: ProviderId;
  onSelect: (id: ProviderId) => void;
  onClose: () => void;
}) {
  return (
    <>
      {/* Backdrop catches outside clicks */}
      <div
        onClick={onClose}
        style={{
          position: "absolute",
          inset: 0,
          zIndex: 5,
        }}
      />
      <div
        role="menu"
        style={{
          position: "absolute",
          top: 96,
          insetInlineStart: 18,
          minWidth: 280,
          background: "#0a0a0a",
          border: `1px solid ${BORDER_STRONG}`,
          borderRadius: 14,
          boxShadow: "0 16px 40px rgba(0,0,0,0.6)",
          padding: 6,
          zIndex: 10,
          animation: "studio-menu-in 140ms ease-out",
        }}
      >
        <style>{`
          @keyframes studio-menu-in {
            from { opacity: 0; transform: translateY(-4px); }
            to   { opacity: 1; transform: translateY(0); }
          }
        `}</style>
        {providers.map((p) => {
          const active = p.id === activeId;
          const q = quotas.get(p.id);
          const overLimit = q?.remaining === 0;
          const dim = !p.enabled || overLimit;
          return (
            <button
              key={p.id}
              onClick={() => !dim && onSelect(p.id)}
              disabled={dim}
              role="menuitem"
              style={{
                width: "100%",
                display: "flex",
                alignItems: "center",
                gap: 10,
                padding: "10px 10px",
                background: active ? CARD_BG_STRONG : "transparent",
                border: "none",
                borderRadius: 9,
                cursor: dim ? "not-allowed" : "pointer",
                opacity: dim ? 0.4 : 1,
                color: TEXT,
                fontFamily: "inherit",
                textAlign: ar ? "right" : "left",
                transition: "background 120ms",
              }}
              onMouseEnter={(e) => {
                if (!dim && !active) e.currentTarget.style.background = CARD_BG_HOVER;
              }}
              onMouseLeave={(e) => {
                if (!active) e.currentTarget.style.background = "transparent";
              }}
            >
              <span
                style={{
                  width: 28,
                  height: 28,
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  background: CARD_BG,
                  border: `1px solid ${BORDER}`,
                  borderRadius: 8,
                  flexShrink: 0,
                }}
              >
                <ProviderIcon providerId={p.id} size={14} color={p.color} />
              </span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                  }}
                >
                  <span
                    style={{
                      fontSize: 13,
                      fontWeight: 600,
                      color: TEXT,
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
                        fontVariantNumeric: "tabular-nums",
                      }}
                    >
                      {q.used}/{q.limit}
                    </span>
                  )}
                </div>
                <div
                  style={{
                    fontSize: 11,
                    color: TEXT_MUTE,
                    marginTop: 2,
                    lineHeight: 1.4,
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                  }}
                >
                  {p.strength}
                </div>
              </div>
              {active && <Check size={14} color={TEXT} />}
            </button>
          );
        })}
      </div>
    </>
  );
}

// ─── Drawer (conversation list) ───────────────────────────────────

function Drawer({
  ar,
  conversations,
  activeId,
  onSelect,
  onPin,
  onArchive,
  onDelete,
  onClose,
  onNew,
}: {
  ar: boolean;
  conversations: ReturnType<typeof useStudio>["conversations"];
  activeId: number | null;
  onSelect: (id: number) => void;
  onPin: (id: number, pinned: boolean) => void;
  onArchive: (id: number, archived: boolean) => void;
  onDelete: (id: number) => void;
  onClose: () => void;
  onNew: () => void;
}) {
  return (
    <>
      <div
        onClick={onClose}
        style={{
          position: "absolute",
          inset: 0,
          background: "rgba(0,0,0,0.45)",
          zIndex: 20,
          animation: "studio-fade 160ms ease-out",
        }}
      />
      <aside
        style={{
          position: "absolute",
          top: 0,
          bottom: 0,
          insetInlineStart: 0,
          width: 280,
          background: "#070707",
          borderInlineEnd: `1px solid ${BORDER_STRONG}`,
          zIndex: 21,
          display: "flex",
          flexDirection: "column",
          animation: "studio-slide-in 200ms cubic-bezier(0.22, 1, 0.36, 1)",
        }}
      >
        <style>{`
          @keyframes studio-fade { from { opacity: 0 } to { opacity: 1 } }
          @keyframes studio-slide-in {
            from { transform: translateX(-12px); opacity: 0; }
            to   { transform: translateX(0); opacity: 1; }
          }
        `}</style>
        <div
          style={{
            padding: "16px 16px 12px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            borderBottom: `1px solid ${BORDER}`,
          }}
        >
          <div
            style={{
              fontSize: 13,
              fontWeight: 700,
              color: TEXT,
              letterSpacing: "-0.005em",
            }}
          >
            {ar ? "المحادثات" : "Conversations"}
          </div>
          <button
            onClick={onNew}
            title={ar ? "محادثة جديدة" : "New"}
            style={{
              ...iconButtonStyleBase(),
              width: 26,
              height: 26,
            }}
          >
            <Plus size={12} />
          </button>
        </div>

        <div style={{ flex: 1, overflowY: "auto", padding: "8px 8px 16px" }}>
          {conversations.length === 0 && (
            <div
              style={{
                padding: "28px 14px",
                fontSize: 12,
                color: TEXT_MUTE,
                textAlign: "center",
                lineHeight: 1.7,
              }}
            >
              {ar
                ? "ابدأ محادثة جديدة لتظهر هنا."
                : "Start a new chat. It lands here."}
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
                  padding: "10px 12px",
                  borderRadius: 10,
                  marginBottom: 4,
                  background: isActive ? CARD_BG_STRONG : "transparent",
                  border: `1px solid ${isActive ? BORDER_STRONG : "transparent"}`,
                  cursor: "pointer",
                  transition: "background 120ms",
                }}
                onMouseEnter={(e) => {
                  if (!isActive) e.currentTarget.style.background = CARD_BG;
                }}
                onMouseLeave={(e) => {
                  if (!isActive) e.currentTarget.style.background = "transparent";
                }}
              >
                <div
                  style={{
                    fontSize: 13,
                    color: TEXT,
                    fontWeight: 500,
                    lineHeight: 1.35,
                    display: "-webkit-box",
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: "vertical",
                    overflow: "hidden",
                    letterSpacing: "-0.005em",
                  }}
                >
                  {c.title ?? (ar ? "بلا عنوان" : "Untitled")}
                </div>
                <div
                  style={{
                    marginTop: 4,
                    fontSize: 10.5,
                    color: TEXT_MUTE,
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
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
                  {c.pinned && <Pin size={10} />}
                </div>
                {isActive && (
                  <div
                    style={{
                      marginTop: 8,
                      display: "flex",
                      gap: 4,
                    }}
                    onClick={(e) => e.stopPropagation()}
                  >
                    <DrawerIconBtn
                      onClick={() => onPin(c.id, !c.pinned)}
                      title={c.pinned ? (ar ? "إلغاء" : "Unpin") : ar ? "تثبيت" : "Pin"}
                    >
                      <Pin size={11} />
                    </DrawerIconBtn>
                    <DrawerIconBtn
                      onClick={() => onArchive(c.id, true)}
                      title={ar ? "أرشفة" : "Archive"}
                    >
                      <Archive size={11} />
                    </DrawerIconBtn>
                    <DrawerIconBtn
                      onClick={() => {
                        if (
                          confirm(
                            ar ? "حذف هذه المحادثة؟" : "Delete this conversation?",
                          )
                        ) {
                          onDelete(c.id);
                        }
                      }}
                      title={ar ? "حذف" : "Delete"}
                    >
                      <Trash2 size={11} />
                    </DrawerIconBtn>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </aside>
    </>
  );
}

function DrawerIconBtn({
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
        height: 26,
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        background: CARD_BG,
        border: `1px solid ${BORDER}`,
        borderRadius: 7,
        color: TEXT_DIM,
        cursor: "pointer",
        transition: "all 120ms",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.background = CARD_BG_STRONG;
        e.currentTarget.style.color = TEXT;
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = CARD_BG;
        e.currentTarget.style.color = TEXT_DIM;
      }}
    >
      {children}
    </button>
  );
}

// ─── Empty state ───────────────────────────────────────────────────

function EmptyState({
  ar,
  onQuickAction,
}: {
  ar: boolean;
  onQuickAction: (prompt: string) => void;
}) {
  const quickActions = ar
    ? [
        { icon: <Sparkles size={13} />, label: "حسّن هذه الفقرة", prompt: "حسّن النصّ المظلَّل، احتفظ بنبرة الكاتب وامسح التعابير المكرّرة." },
        { icon: <ArrowRight size={13} />, label: "أكمل من هنا", prompt: "أكمل المشهد من حيث وقفت، بنفس النبرة والأسلوب." },
        { icon: <Lightbulb size={13} />, label: "اقترح مشهداً", prompt: "اقترح ثلاث أفكار لمشهد قصير يصلح أن يدخل هنا." },
      ]
    : [
        { icon: <Sparkles size={13} />, label: "Polish this paragraph", prompt: "Polish the highlighted text. Keep my voice, cut anything repetitive, sharpen the rhythm." },
        { icon: <ArrowRight size={13} />, label: "Continue from here", prompt: "Continue the scene from where it stops. Same voice, same pacing." },
        { icon: <Lightbulb size={13} />, label: "Brainstorm a scene", prompt: "Give me three short scene ideas that could fit here." },
      ];

  return (
    <div
      style={{
        margin: "auto 0",
        padding: "20px 4px",
        textAlign: "center",
        color: TEXT_DIM,
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "center",
          marginBottom: 22,
          position: "relative",
        }}
      >
        <div
          style={{
            position: "absolute",
            width: 90,
            height: 90,
            top: "50%",
            insetInlineStart: "50%",
            transform: "translate(-50%, -50%)",
            background:
              "radial-gradient(circle, rgba(255,255,255,0.10) 0%, rgba(255,255,255,0) 65%)",
            pointerEvents: "none",
            animation: "studio-pulse 3.5s ease-in-out infinite",
          }}
        />
        <StudioIcon size={36} color={TEXT} style={{ opacity: 0.95 }} />
        <style>{`
          @keyframes studio-pulse {
            0%, 100% { opacity: 0.55; transform: translate(-50%, -50%) scale(1); }
            50%      { opacity: 0.85; transform: translate(-50%, -50%) scale(1.12); }
          }
        `}</style>
      </div>

      <div
        style={{
          fontSize: 20,
          fontWeight: 700,
          color: TEXT,
          marginBottom: 6,
          letterSpacing: "-0.02em",
        }}
      >
        {ar ? "اسأل أيّ شيء." : "Ask anything."}
      </div>
      <div
        style={{
          fontSize: 13,
          color: TEXT_MUTE,
          lineHeight: 1.55,
          maxWidth: 280,
          margin: "0 auto 22px",
        }}
      >
        {ar
          ? "أنا أعرف الكتاب. ظلّل فقرة، أو اطلب اقتراحاً مباشرةً."
          : "I know the book. Highlight a paragraph, or just ask."}
      </div>

      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 6,
          maxWidth: 300,
          margin: "0 auto",
        }}
      >
        {quickActions.map((a, i) => (
          <button
            key={i}
            onClick={() => onQuickAction(a.prompt)}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 9,
              padding: "10px 14px",
              background: CARD_BG,
              border: `1px solid ${BORDER}`,
              borderRadius: 10,
              color: TEXT,
              cursor: "pointer",
              fontFamily: "inherit",
              fontSize: 12.5,
              fontWeight: 500,
              textAlign: "start",
              letterSpacing: "-0.005em",
              transition: "all 140ms ease",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = CARD_BG_STRONG;
              e.currentTarget.style.borderColor = BORDER_STRONG;
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = CARD_BG;
              e.currentTarget.style.borderColor = BORDER;
            }}
          >
            <span style={{ color: TEXT_DIM, display: "inline-flex" }}>{a.icon}</span>
            {a.label}
          </button>
        ))}
      </div>
    </div>
  );
}

// ─── Message bubble ────────────────────────────────────────────────

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
        gap: 6,
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
            paddingInlineStart: 4,
          }}
        >
          <ProviderIcon providerId={provider.id} size={11} color={provider.color} />
          <span style={{ fontWeight: 600, color: TEXT_DIM }}>{provider.displayName}</span>
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
          padding: "11px 14px",
          borderRadius: 14,
          background: isUser ? CARD_BG_STRONG : CARD_BG,
          border: `1px solid ${isUser ? BORDER_STRONG : BORDER}`,
          color: TEXT,
          fontSize: 13,
          lineHeight: 1.65,
          whiteSpace: "pre-wrap",
          wordBreak: "break-word",
          userSelect: "text",
          letterSpacing: "-0.003em",
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
        <div style={{ display: "flex", gap: 6, paddingInlineStart: 4 }}>
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
        padding: "4px 10px",
        fontSize: 10.5,
        fontWeight: 500,
        color: TEXT_DIM,
        background: CARD_BG,
        border: `1px solid ${BORDER}`,
        borderRadius: 999,
        cursor: "pointer",
        fontFamily: "inherit",
        transition: "all 120ms",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.background = CARD_BG_STRONG;
        e.currentTarget.style.color = TEXT;
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = CARD_BG;
        e.currentTarget.style.color = TEXT_DIM;
      }}
    >
      {children}
    </button>
  );
}

// ─── Composer ──────────────────────────────────────────────────────

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
        padding: "12px 18px 18px",
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
          border: `1px solid ${hasText ? BORDER_STRONG : BORDER}`,
          borderRadius: 18,
          padding: "10px 10px 10px 16px",
          transition: "border-color 140ms ease",
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
            fontSize: 13.5,
            lineHeight: 1.55,
            minHeight: 24,
            maxHeight: 200,
            padding: "4px 0",
          }}
        />
        {isSending ? (
          <button
            onClick={onCancel}
            aria-label={ar ? "إيقاف" : "Stop"}
            style={{
              width: 34,
              height: 34,
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              borderRadius: 11,
              background: "rgba(239,68,68,0.14)",
              border: "1px solid rgba(239,68,68,0.34)",
              color: "#fca5a5",
              cursor: "pointer",
              flexShrink: 0,
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
              width: 34,
              height: 34,
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              borderRadius: 11,
              background: hasText ? TEXT : "transparent",
              border: `1px solid ${hasText ? TEXT : BORDER}`,
              color: hasText ? "#000" : TEXT_MUTE,
              cursor: hasText ? "pointer" : "default",
              transition: "all 160ms ease",
              flexShrink: 0,
              transform: hasText ? "scale(1)" : "scale(0.96)",
            }}
          >
            <Send size={13} />
          </button>
        )}
      </div>
    </div>
  );
}

// ─── Shared utilities ──────────────────────────────────────────────

function iconButtonStyleBase(): React.CSSProperties {
  return {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    background: CARD_BG,
    border: `1px solid ${BORDER}`,
    borderRadius: 8,
    color: TEXT_DIM,
    cursor: "pointer",
    transition: "all 140ms ease",
    fontFamily: "inherit",
  };
}

function IconButton({
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
        ...iconButtonStyleBase(),
        width: 30,
        height: 30,
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.background = CARD_BG_STRONG;
        e.currentTarget.style.color = TEXT;
        e.currentTarget.style.borderColor = BORDER_STRONG;
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = CARD_BG;
        e.currentTarget.style.color = TEXT_DIM;
        e.currentTarget.style.borderColor = BORDER;
      }}
    >
      {children}
    </button>
  );
}
