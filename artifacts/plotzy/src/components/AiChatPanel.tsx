// AI assistant side panel for the chapter editor. Slides in from the
// edge of the screen so the writer can chat without leaving their work.
// Stateless on purpose for now: messages live in this component only.
// When the database is wired we will persist per-user-per-book history.

import { useEffect, useRef, useState } from "react";
import { Loader2, Send, X, Copy, Check } from "lucide-react";
import { useLanguage } from "@/contexts/language-context";

interface Message {
  role: "user" | "assistant";
  content: string;
}

interface Props {
  open: boolean;
  onClose: () => void;
  /** Optional. Pre-seed the conversation. Only used by the design
   *  preview page so the layout can be reviewed without a live API. */
  initialMessages?: Message[];
}

const APPLE_FONT =
  '-apple-system, BlinkMacSystemFont, "SF Pro Display", "SF Pro Text", "Helvetica Neue", "Segoe UI", Arial, sans-serif';

export function AiChatPanel({ open, onClose, initialMessages }: Props) {
  const { lang, isRTL } = useLanguage();
  const ar = lang === "ar";
  const [messages, setMessages] = useState<Message[]>(initialMessages ?? []);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const scrollerRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLTextAreaElement | null>(null);

  // Auto-scroll to the latest message as it streams in.
  useEffect(() => {
    const el = scrollerRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages]);

  // Focus the input when the panel opens.
  useEffect(() => {
    if (!open || !inputRef.current) return;
    const id = window.setTimeout(() => inputRef.current?.focus(), 250);
    return () => window.clearTimeout(id);
  }, [open]);

  // Esc closes the panel.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  async function send() {
    const text = input.trim();
    if (!text || streaming) return;
    setError(null);
    const next: Message[] = [...messages, { role: "user", content: text }, { role: "assistant", content: "" }];
    setMessages(next);
    setInput("");
    setStreaming(true);
    try {
      const res = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ messages: next.slice(0, -1) }),
      });
      if (!res.ok || !res.body) {
        const info = await res.json().catch(() => ({}));
        throw new Error(info?.message || "Chat failed");
      }
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let acc = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        acc += decoder.decode(value, { stream: true });
        setMessages((prev) => {
          const out = [...prev];
          out[out.length - 1] = { role: "assistant", content: acc };
          return out;
        });
      }
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Chat failed";
      setError(ar ? "تعذّر الاتصال بالمساعد. حاول مجدّدًا." : "Could not reach the assistant. Try again.");
      setMessages((prev) => {
        const out = [...prev];
        if (out.length && out[out.length - 1].role === "assistant" && out[out.length - 1].content === "") {
          out.pop();
        }
        return out;
      });
      console.warn("[AiChatPanel]", msg);
    } finally {
      setStreaming(false);
    }
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  }

  async function copyMessage(idx: number, content: string) {
    try {
      await navigator.clipboard.writeText(content);
      setCopiedIndex(idx);
      window.setTimeout(() => setCopiedIndex(null), 1400);
    } catch {
      /* ignore */
    }
  }

  // Side of the screen the panel docks on. In RTL the writer is reading
  // right to left, so the panel sits on the left and the writing stays
  // on the right. In LTR it is the mirror.
  const dockSide = isRTL ? "left" : "right";

  return (
    <>
      {/* Local keyframes for the message entrance animation. Scoped to
          this component so we are not relying on a global CSS edit. */}
      <style>{`
        @keyframes plotzyMsgIn {
          from { opacity: 0; transform: translateY(6px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>

      {/* Backdrop (subtle, dismiss on click) */}
      <div
        onClick={onClose}
        aria-hidden
        style={{
          position: "fixed",
          inset: 0,
          background: "rgba(0,0,0,0.35)",
          opacity: open ? 1 : 0,
          pointerEvents: open ? "auto" : "none",
          transition: "opacity 200ms ease",
          zIndex: 60,
        }}
      />

      {/* Panel */}
      <aside
        role="dialog"
        aria-label={ar ? "مساعد الكتابة الذكي" : "AI writing assistant"}
        dir={isRTL ? "rtl" : "ltr"}
        style={{
          position: "fixed",
          top: 0,
          bottom: 0,
          [dockSide]: 0,
          width: "min(100vw, 420px)",
          background:
            "linear-gradient(180deg, rgba(18,18,22,0.78) 0%, rgba(10,10,13,0.86) 100%)",
          color: "rgba(255,255,255,0.94)",
          backdropFilter: "blur(28px) saturate(180%)",
          WebkitBackdropFilter: "blur(28px) saturate(180%)",
          borderInlineStart: "1px solid rgba(255,255,255,0.06)",
          boxShadow:
            "0 20px 60px rgba(0,0,0,0.55), inset 0 1px 0 rgba(255,255,255,0.04)",
          transform: open
            ? "translateX(0)"
            : isRTL ? "translateX(-100%)" : "translateX(100%)",
          transition: "transform 280ms cubic-bezier(0.22, 0.61, 0.36, 1)",
          display: "flex",
          flexDirection: "column",
          fontFamily: APPLE_FONT,
          zIndex: 61,
        }}
      >
        {/* Header. Deliberately no logo, no avatar, no decorative chip.
            Just title, a subtle live dot, and the close button. */}
        <header
          style={{
            display: "flex",
            alignItems: "center",
            gap: 12,
            padding: "18px 20px",
            borderBottom: "1px solid rgba(255,255,255,0.06)",
            flexShrink: 0,
          }}
        >
          <div style={{ flex: 1, minWidth: 0 }}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                fontWeight: 600,
                fontSize: 15,
                letterSpacing: "-0.015em",
              }}
            >
              <span
                aria-hidden
                style={{
                  width: 6,
                  height: 6,
                  borderRadius: "50%",
                  background: "#34d399",
                  boxShadow: "0 0 8px rgba(52,211,153,0.7)",
                  flexShrink: 0,
                }}
              />
              {ar ? "مساعد الكتابة" : "Writing Assistant"}
            </div>
            <div
              style={{
                fontSize: 12,
                color: "rgba(255,255,255,0.42)",
                marginTop: 2,
                marginInlineStart: 14,
              }}
            >
              {ar ? "اسأله أي شيء عن قصتك" : "Ask anything about your story"}
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label={ar ? "إغلاق" : "Close"}
            style={{
              background: "transparent",
              border: "none",
              color: "rgba(255,255,255,0.55)",
              padding: 8,
              borderRadius: 10,
              cursor: "pointer",
              transition: "background 120ms ease, color 120ms ease",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = "rgba(255,255,255,0.06)";
              e.currentTarget.style.color = "rgba(255,255,255,0.85)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "transparent";
              e.currentTarget.style.color = "rgba(255,255,255,0.55)";
            }}
          >
            <X size={18} />
          </button>
        </header>

        {/* Messages */}
        <div
          ref={scrollerRef}
          style={{
            flex: 1,
            overflowY: "auto",
            padding: "22px 20px 16px",
            display: "flex",
            flexDirection: "column",
            gap: 14,
            scrollBehavior: "smooth",
          }}
        >
          {messages.length === 0 && (
            <div
              style={{
                color: "rgba(255,255,255,0.55)",
                fontSize: 14,
                lineHeight: 1.75,
                padding: "28px 4px",
                textAlign: "center",
              }}
            >
              <div
                style={{
                  fontSize: 17,
                  fontWeight: 500,
                  color: "rgba(255,255,255,0.85)",
                  marginBottom: 10,
                  letterSpacing: "-0.01em",
                }}
              >
                {ar ? "كيف أساعدك اليوم؟" : "How can I help today?"}
              </div>
              <div style={{ maxWidth: 320, margin: "0 auto" }}>
                {ar
                  ? "اقترح طرقاً لتطوير شخصية، أو راجع مشهداً، أو أعطني فكرة لافتتاح الفصل القادم."
                  : "Suggest ways to develop a character, review a scene, or give me an opening for the next chapter."}
              </div>
            </div>
          )}

          {messages.map((m, i) => {
            const isUser = m.role === "user";
            return (
              <div
                key={i}
                style={{
                  display: "flex",
                  justifyContent: isUser ? "flex-end" : "flex-start",
                  alignItems: "flex-end",
                  gap: 6,
                  animation: "plotzyMsgIn 220ms ease-out both",
                }}
              >
                <div
                  style={{
                    maxWidth: "86%",
                    background: isUser
                      ? "linear-gradient(135deg, rgba(124,106,247,0.85) 0%, rgba(139,121,251,0.85) 100%)"
                      : "rgba(255,255,255,0.045)",
                    color: isUser ? "#ffffff" : "rgba(255,255,255,0.94)",
                    padding: "11px 15px",
                    borderRadius: 18,
                    borderEndStartRadius: isUser ? 18 : 6,
                    borderEndEndRadius: isUser ? 6 : 18,
                    fontSize: 14.5,
                    lineHeight: 1.65,
                    whiteSpace: "pre-wrap",
                    wordBreak: "break-word",
                    boxShadow: isUser
                      ? "0 6px 20px rgba(124,106,247,0.25)"
                      : "0 2px 12px rgba(0,0,0,0.18)",
                  }}
                >
                  {m.content || (streaming && !isUser ? (
                    <span style={{ display: "inline-flex", alignItems: "center", gap: 8, opacity: 0.7 }}>
                      <Loader2 size={13} className="animate-spin" />
                      {ar ? "يكتب..." : "Thinking..."}
                    </span>
                  ) : null)}
                </div>
                {!isUser && m.content && (
                  <button
                    onClick={() => copyMessage(i, m.content)}
                    aria-label={ar ? "نسخ" : "Copy"}
                    title={ar ? "نسخ" : "Copy"}
                    style={{
                      background: "transparent",
                      border: "none",
                      color: copiedIndex === i ? "#7c6af7" : "rgba(255,255,255,0.30)",
                      padding: 6,
                      borderRadius: 8,
                      cursor: "pointer",
                      transition: "color 120ms ease",
                      flexShrink: 0,
                    }}
                    onMouseEnter={(e) => copiedIndex !== i && (e.currentTarget.style.color = "rgba(255,255,255,0.75)")}
                    onMouseLeave={(e) => copiedIndex !== i && (e.currentTarget.style.color = "rgba(255,255,255,0.30)")}
                  >
                    {copiedIndex === i ? <Check size={14} /> : <Copy size={14} />}
                  </button>
                )}
              </div>
            );
          })}

          {error && (
            <div
              style={{
                color: "#fca5a5",
                fontSize: 12.5,
                padding: "8px 12px",
                background: "rgba(239,68,68,0.06)",
                border: "1px solid rgba(239,68,68,0.18)",
                borderRadius: 12,
                textAlign: "center",
              }}
            >
              {error}
            </div>
          )}
        </div>

        {/* Composer */}
        <div
          style={{
            padding: "14px 16px 18px",
            borderTop: "1px solid rgba(255,255,255,0.06)",
            display: "flex",
            gap: 10,
            alignItems: "flex-end",
            flexShrink: 0,
            background: "rgba(255,255,255,0.015)",
          }}
        >
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={onKeyDown}
            rows={1}
            placeholder={ar ? "اكتب رسالتك..." : "Type your message..."}
            disabled={streaming}
            style={{
              flex: 1,
              minHeight: 42,
              maxHeight: 140,
              resize: "none",
              background: "rgba(255,255,255,0.05)",
              color: "rgba(255,255,255,0.94)",
              border: "1px solid rgba(255,255,255,0.08)",
              borderRadius: 14,
              padding: "11px 14px",
              outline: "none",
              fontSize: 14.5,
              lineHeight: 1.5,
              fontFamily: "inherit",
              direction: isRTL ? "rtl" : "ltr",
              transition: "border-color 120ms ease, background 120ms ease",
            }}
            onFocus={(e) => {
              e.currentTarget.style.borderColor = "rgba(124,106,247,0.55)";
              e.currentTarget.style.background = "rgba(255,255,255,0.07)";
            }}
            onBlur={(e) => {
              e.currentTarget.style.borderColor = "rgba(255,255,255,0.08)";
              e.currentTarget.style.background = "rgba(255,255,255,0.05)";
            }}
          />
          <button
            onClick={send}
            disabled={!input.trim() || streaming}
            aria-label={ar ? "إرسال" : "Send"}
            style={{
              background: !input.trim() || streaming
                ? "rgba(255,255,255,0.05)"
                : "linear-gradient(135deg, #7c6af7 0%, #9b8dfb 100%)",
              color: !input.trim() || streaming ? "rgba(255,255,255,0.30)" : "#fff",
              border: "none",
              borderRadius: 14,
              padding: "0 14px",
              height: 42,
              cursor: !input.trim() || streaming ? "not-allowed" : "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              transition: "background 120ms ease, transform 120ms ease",
              flexShrink: 0,
              boxShadow: !input.trim() || streaming
                ? "none"
                : "0 6px 18px rgba(124,106,247,0.35)",
            }}
            onMouseDown={(e) => {
              if (input.trim() && !streaming) e.currentTarget.style.transform = "scale(0.96)";
            }}
            onMouseUp={(e) => (e.currentTarget.style.transform = "scale(1)")}
            onMouseLeave={(e) => (e.currentTarget.style.transform = "scale(1)")}
          >
            {streaming ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
          </button>
        </div>
      </aside>
    </>
  );
}
