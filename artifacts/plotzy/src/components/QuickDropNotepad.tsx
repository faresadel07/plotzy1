import { useState, useEffect, useRef } from "react";
import { PenLine, X, Check } from "lucide-react";

const SF = "-apple-system, BlinkMacSystemFont, 'SF Pro Text', 'Helvetica Neue', sans-serif";

export default function QuickDropNotepad() {
  const [isOpen, setIsOpen] = useState(false);
  const [note, setNote] = useState("");
  const [saved, setSaved] = useState(true);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const saved = localStorage.getItem("plotzy-quick-note");
    if (saved) setNote(saved);
  }, []);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => textareaRef.current?.focus(), 320);
    }
  }, [isOpen]);

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    setNote(val);
    setSaved(false);
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      localStorage.setItem("plotzy-quick-note", val);
      setSaved(true);
    }, 600);
  };

  return (
    <>
      <style>{`
        @keyframes qdSlideIn {
          from { transform: translateX(100%); opacity: 0; }
          to   { transform: translateX(0);    opacity: 1; }
        }
        @keyframes qdSlideOut {
          from { transform: translateX(0);    opacity: 1; }
          to   { transform: translateX(100%); opacity: 0; }
        }
        .qd-panel-open  { animation: qdSlideIn  0.28s cubic-bezier(0.22,1,0.36,1) forwards; }
        .qd-panel-close { animation: qdSlideOut 0.22s cubic-bezier(0.55,0,1,0.45) forwards; }
        .qd-textarea::-webkit-scrollbar { width: 4px; }
        .qd-textarea::-webkit-scrollbar-track { background: transparent; }
        .qd-textarea::-webkit-scrollbar-thumb { background: rgba(0,0,0,0.1); border-radius: 99px; }
      `}</style>

      {/* ── Trigger tab ── */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          title="Quick Notes"
          style={{
            position: "fixed",
            right: 0,
            top: "50%",
            transform: "translateY(-50%)",
            zIndex: 40,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            width: 36,
            height: 36,
            borderRadius: "8px 0 0 8px",
            background: "#fff",
            border: "1px solid rgba(0,0,0,0.1)",
            borderRight: "none",
            boxShadow: "-4px 0 12px rgba(0,0,0,0.06)",
            cursor: "pointer",
            transition: "box-shadow 0.15s, background 0.15s",
          }}
          onMouseEnter={e => {
            (e.currentTarget as HTMLButtonElement).style.background = "#f5f5f7";
            (e.currentTarget as HTMLButtonElement).style.boxShadow = "-6px 0 18px rgba(0,0,0,0.1)";
          }}
          onMouseLeave={e => {
            (e.currentTarget as HTMLButtonElement).style.background = "#fff";
            (e.currentTarget as HTMLButtonElement).style.boxShadow = "-4px 0 12px rgba(0,0,0,0.06)";
          }}
        >
          <PenLine size={15} style={{ color: "#3d3d3f" }} />
        </button>
      )}

      {/* ── Panel ── */}
      {isOpen && (
        <>
          {/* Backdrop */}
          <div
            onClick={() => setIsOpen(false)}
            style={{
              position: "fixed", inset: 0, zIndex: 50,
              background: "rgba(0,0,0,0.08)",
              animation: "fadeIn 0.2s ease",
            }}
          />

          {/* Panel */}
          <div
            className="qd-panel-open"
            style={{
              position: "fixed",
              right: 0, top: 0, bottom: 0,
              width: 320,
              zIndex: 60,
              background: "#fff",
              borderLeft: "1px solid rgba(0,0,0,0.09)",
              boxShadow: "-20px 0 60px rgba(0,0,0,0.08)",
              display: "flex",
              flexDirection: "column",
            }}
          >
            {/* Header */}
            <div style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "16px 20px",
              borderBottom: "1px solid rgba(0,0,0,0.07)",
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <PenLine size={14} style={{ color: "#6e6e73" }} />
                <span style={{
                  fontFamily: SF,
                  fontSize: 14,
                  fontWeight: 600,
                  color: "#1d1d1f",
                  letterSpacing: "-0.01em",
                }}>
                  Notes
                </span>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                style={{
                  display: "flex", alignItems: "center", justifyContent: "center",
                  width: 28, height: 28, borderRadius: 8,
                  border: "none", background: "transparent", cursor: "pointer",
                  color: "#6e6e73", transition: "background 0.12s",
                }}
                onMouseEnter={e => (e.currentTarget.style.background = "rgba(0,0,0,0.06)")}
                onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
              >
                <X size={14} />
              </button>
            </div>

            {/* Textarea */}
            <textarea
              ref={textareaRef}
              value={note}
              onChange={handleChange}
              placeholder="Write anything — ideas, quotes, scenes, reminders…"
              className="qd-textarea"
              spellCheck={false}
              style={{
                flex: 1,
                width: "100%",
                padding: "20px",
                background: "transparent",
                resize: "none",
                outline: "none",
                border: "none",
                fontFamily: SF,
                fontSize: 14,
                lineHeight: 1.75,
                color: "#1d1d1f",
                boxSizing: "border-box",
              }}
            />

            {/* Footer */}
            <div style={{
              padding: "10px 20px",
              borderTop: "1px solid rgba(0,0,0,0.06)",
              display: "flex",
              alignItems: "center",
              justifyContent: "flex-end",
              gap: 5,
            }}>
              {saved ? (
                <>
                  <Check size={11} style={{ color: "#34c759" }} />
                  <span style={{ fontFamily: SF, fontSize: 11, color: "#aaa" }}>Saved</span>
                </>
              ) : (
                <span style={{ fontFamily: SF, fontSize: 11, color: "#aaa" }}>Saving…</span>
              )}
            </div>
          </div>
        </>
      )}
    </>
  );
}
