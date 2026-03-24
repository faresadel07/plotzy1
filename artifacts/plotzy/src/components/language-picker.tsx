import { useState, useRef, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import { Globe, Search, Check } from "lucide-react";
import { useLanguage, UI_LANGUAGES } from "@/contexts/language-context";
import type { Language } from "@/lib/i18n";

const SF = "-apple-system, BlinkMacSystemFont, 'SF Pro Display', 'Helvetica Neue', Arial, sans-serif";

export function LanguagePicker() {
  const { lang, setLang, t } = useLanguage();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [panelPos, setPanelPos] = useState<{ top: number; left: number } | null>(null);

  const filtered = UI_LANGUAGES.filter(
    (l) =>
      l.nativeName.toLowerCase().includes(query.toLowerCase()) ||
      l.name.toLowerCase().includes(query.toLowerCase())
  );

  const updatePos = useCallback(() => {
    if (!triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    setPanelPos({
      top: rect.bottom + 8,
      left: rect.left + rect.width / 2,
    });
  }, []);

  function openPanel() {
    updatePos();
    setOpen(true);
  }

  function closePanel() {
    setOpen(false);
    setQuery("");
  }

  useEffect(() => {
    if (!open) return;
    setTimeout(() => inputRef.current?.focus(), 60);
    window.addEventListener("resize", updatePos, { passive: true });
    return () => window.removeEventListener("resize", updatePos);
  }, [open, updatePos]);

  useEffect(() => {
    if (!open) return;
    function handlePointerDown(e: PointerEvent) {
      if (
        panelRef.current && !panelRef.current.contains(e.target as Node) &&
        triggerRef.current && !triggerRef.current.contains(e.target as Node)
      ) {
        closePanel();
      }
    }
    function handleEsc(e: KeyboardEvent) {
      if (e.key === "Escape") closePanel();
    }
    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleEsc);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleEsc);
    };
  }, [open]);

  const current = UI_LANGUAGES.find((l) => l.code === lang);

  return (
    <>
      <button
        ref={triggerRef}
        onClick={() => (open ? closePanel() : openPanel())}
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 2,
          padding: "4px 8px",
          borderRadius: 10,
          background: open ? "rgba(0,0,0,0.06)" : "transparent",
          border: "none",
          cursor: "pointer",
          transition: "background 0.15s",
        }}
        onMouseEnter={e => (e.currentTarget.style.background = "rgba(0,0,0,0.06)")}
        onMouseLeave={e => (e.currentTarget.style.background = open ? "rgba(0,0,0,0.06)" : "transparent")}
        aria-label={t("lang")}
        aria-expanded={open}
        data-testid="language-picker-trigger"
      >
        <Globe style={{ width: 16, height: 16, color: "#555" }} />
        <span style={{
          fontFamily: SF,
          fontSize: 10,
          fontWeight: 500,
          color: "#555",
          lineHeight: 1,
          maxWidth: 48,
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",
        }}>
          {current?.name ?? "Language"}
        </span>
      </button>

      {open && panelPos && createPortal(
        <div
          ref={panelRef}
          data-testid="language-picker-panel"
          style={{
            position: "fixed",
            top: panelPos.top,
            left: panelPos.left,
            transform: "translateX(-50%)",
            width: 220,
            borderRadius: 16,
            border: "1px solid rgba(0,0,0,0.08)",
            background: "rgba(255,255,255,0.98)",
            backdropFilter: "blur(20px)",
            WebkitBackdropFilter: "blur(20px)",
            boxShadow: "0 8px 40px rgba(0,0,0,0.14), 0 1px 4px rgba(0,0,0,0.06)",
            zIndex: 9999,
            overflow: "hidden",
            fontFamily: SF,
          }}
        >
          {/* Search bar */}
          <div style={{ padding: "10px 10px 8px", borderBottom: "1px solid rgba(0,0,0,0.06)" }}>
            <div style={{
              display: "flex", alignItems: "center", gap: 6,
              padding: "6px 10px",
              borderRadius: 10,
              background: "rgba(0,0,0,0.05)",
            }}>
              <Search style={{ width: 13, height: 13, color: "#888", flexShrink: 0 }} />
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search…"
                dir="ltr"
                data-testid="language-search-input"
                style={{
                  flex: 1, background: "transparent", border: "none", outline: "none",
                  fontSize: 12, color: "#111",
                  fontFamily: SF,
                }}
              />
            </div>
          </div>

          {/* List */}
          <div style={{ maxHeight: 220, overflowY: "auto", padding: "4px 0" }}>
            {filtered.length === 0 && (
              <p style={{ fontSize: 12, color: "#999", textAlign: "center", padding: "12px 0", fontFamily: SF }}>
                No results
              </p>
            )}
            {filtered.map((l) => {
              const active = lang === l.code;
              return (
                <button
                  key={l.code}
                  data-testid={`language-option-${l.code}`}
                  onClick={() => { setLang(l.code as Language); closePanel(); }}
                  style={{
                    width: "100%", display: "flex", alignItems: "center",
                    justifyContent: "space-between", gap: 8,
                    padding: "7px 14px",
                    background: active ? "rgba(0,0,0,0.04)" : "transparent",
                    border: "none", cursor: "pointer", textAlign: "start",
                    transition: "background 0.12s",
                    fontFamily: SF,
                  }}
                  onMouseEnter={e => { if (!active) (e.currentTarget as HTMLButtonElement).style.background = "rgba(0,0,0,0.04)"; }}
                  onMouseLeave={e => { if (!active) (e.currentTarget as HTMLButtonElement).style.background = "transparent"; }}
                >
                  <div style={{ display: "flex", flexDirection: "column", minWidth: 0 }}>
                    <span style={{ fontSize: 13, fontWeight: 500, color: "#111", lineHeight: 1.3, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {l.nativeName}
                    </span>
                    <span style={{ fontSize: 11, color: "#888", lineHeight: 1.2 }}>
                      {l.name}
                    </span>
                  </div>
                  {active && (
                    <Check style={{ width: 13, height: 13, color: "#111", flexShrink: 0 }} />
                  )}
                </button>
              );
            })}
          </div>
        </div>,
        document.body
      )}
    </>
  );
}
