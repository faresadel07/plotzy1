// AI assistant side panel for the chapter editor. Slides in from the
// edge of the screen so the writer can chat without leaving their work.
// Stateless on purpose for now: messages live in this component only.
// When the database is wired we will persist per-user-per-book history.

import { useEffect, useRef, useState } from "react";
import { Loader2, Send, Sparkles, X, Copy, Check } from "lucide-react";
import { useLanguage } from "@/contexts/language-context";

interface Message {
  role: "user" | "assistant";
  content: string;
}

interface Props {
  open: boolean;
  onClose: () => void;
}

const APPLE_FONT =
  '-apple-system, BlinkMacSystemFont, "SF Pro Display", "SF Pro Text", "Helvetica Neue", "Segoe UI", Arial, sans-serif';

export function AiChatPanel({ open, onClose }: Props) {
  const { lang, isRTL } = useLanguage();
  const ar = lang === "ar";
  const [messages, setMessages] = useState<Message[]>([]);
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
          width: "min(100vw, 440px)",
          background: "rgba(10,10,11,0.96)",
          color: "rgba(255,255,255,0.92)",
          backdropFilter: "blur(14px)",
          WebkitBackdropFilter: "blur(14px)",
          borderInlineStart: "1px solid rgba(255,255,255,0.08)",
          boxShadow: "0 12px 48px rgba(0,0,0,0.5)",
          transform: open
            ? "translateX(0)"
            : isRTL ? "translateX(-100%)" : "translateX(100%)",
          transition: "transform 240ms cubic-bezier(0.22, 0.61, 0.36, 1)",
          display: "flex",
          flexDirection: "column",
          fontFamily: APPLE_FONT,
          zIndex: 61,
        }}
      >
        {/* Header */}
        <header
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            padding: "16px 18px",
            borderBottom: "1px solid rgba(255,255,255,0.08)",
            flexShrink: 0,
          }}
        >
          <div
            style={{
              width: 30,
              height: 30,
              borderRadius: 9,
              background: "linear-gradient(135deg, #7c6af7 0%, #9b8dfb 100%)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}
          >
            <Sparkles size={15} color="#fff" />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontWeight: 600, fontSize: 14, letterSpacing: "-0.01em" }}>
              {ar ? "مساعد الكتابة" : "Writing Assistant"}
            </div>
            <div style={{ fontSize: 11, color: "rgba(255,255,255,0.45)" }}>
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
              borderRadius: 8,
              cursor: "pointer",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(255,255,255,0.08)")}
            onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
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
            padding: "18px 18px 12px",
            display: "flex",
            flexDirection: "column",
            gap: 12,
            scrollBehavior: "smooth",
          }}
        >
          {messages.length === 0 && (
            <div
              style={{
                color: "rgba(255,255,255,0.45)",
                fontSize: 13,
                lineHeight: 1.7,
                padding: "24px 4px",
              }}
            >
              {ar
                ? "ابدأ المحادثة. مثلًا: اقترح ثلاث طرق لتطوير شخصية البطل، أو راجع هذا المشهد، أو أعطني فكرة لافتتاح الفصل القادم."
                : "Start the conversation. For example: suggest three ways to develop my protagonist, or review this scene, or give me an idea for the next chapter's opening."}
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
                }}
              >
                <div
                  style={{
                    maxWidth: "88%",
                    background: isUser ? "rgba(124,106,247,0.18)" : "rgba(255,255,255,0.05)",
                    border: isUser ? "1px solid rgba(124,106,247,0.30)" : "1px solid rgba(255,255,255,0.08)",
                    color: "rgba(255,255,255,0.94)",
                    padding: "10px 14px",
                    borderRadius: 16,
                    fontSize: 14,
                    lineHeight: 1.65,
                    whiteSpace: "pre-wrap",
                    wordBreak: "break-word",
                  }}
                >
                  {m.content || (streaming && !isUser ? (
                    <span style={{ display: "inline-flex", alignItems: "center", gap: 6, opacity: 0.6 }}>
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
                      color: copiedIndex === i ? "#7c6af7" : "rgba(255,255,255,0.35)",
                      padding: 6,
                      borderRadius: 8,
                      cursor: "pointer",
                      transition: "color 120ms ease",
                      flexShrink: 0,
                    }}
                    onMouseEnter={(e) => copiedIndex !== i && (e.currentTarget.style.color = "rgba(255,255,255,0.75)")}
                    onMouseLeave={(e) => copiedIndex !== i && (e.currentTarget.style.color = "rgba(255,255,255,0.35)")}
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
                fontSize: 12,
                padding: "6px 10px",
                background: "rgba(239,68,68,0.08)",
                border: "1px solid rgba(239,68,68,0.25)",
                borderRadius: 10,
              }}
            >
              {error}
            </div>
          )}
        </div>

        {/* Composer */}
        <div
          style={{
            padding: "12px 14px 16px",
            borderTop: "1px solid rgba(255,255,255,0.08)",
            display: "flex",
            gap: 8,
            alignItems: "flex-end",
            flexShrink: 0,
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
              minHeight: 40,
              maxHeight: 140,
              resize: "vertical",
              background: "rgba(255,255,255,0.04)",
              color: "rgba(255,255,255,0.92)",
              border: "1px solid rgba(255,255,255,0.10)",
              borderRadius: 12,
              padding: "10px 12px",
              outline: "none",
              fontSize: 14,
              lineHeight: 1.5,
              fontFamily: "inherit",
              direction: isRTL ? "rtl" : "ltr",
            }}
          />
          <button
            onClick={send}
            disabled={!input.trim() || streaming}
            aria-label={ar ? "إرسال" : "Send"}
            style={{
              background: !input.trim() || streaming ? "rgba(255,255,255,0.06)" : "#7c6af7",
              color: !input.trim() || streaming ? "rgba(255,255,255,0.35)" : "#fff",
              border: "none",
              borderRadius: 12,
              padding: "0 14px",
              height: 40,
              cursor: !input.trim() || streaming ? "not-allowed" : "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              transition: "background 120ms ease",
              flexShrink: 0,
            }}
          >
            {streaming ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
          </button>
        </div>
      </aside>
    </>
  );
}
