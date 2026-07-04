// NiceSelect — the app-wide replacement for raw <select> elements.
//
// Native selects render the OS dropdown, which can't be styled and
// looks jarring inside Plotzy's dark, Apple-flavored surfaces. This
// renders a styled trigger and a fixed-position glass menu with a
// check on the active row, entrance animation, outside-click and
// Escape to close, and viewport clamping so it never opens off-screen.
//
// It is deliberately dependency-free (no Radix) so it can live inside
// horizontally-scrolling toolbars where popover clipping is an issue —
// the menu is position:fixed and escapes any overflow container.

import { useEffect, useRef, useState } from "react";
import { ChevronDown, Check } from "lucide-react";

const SF =
  '-apple-system, BlinkMacSystemFont, "SF Pro Display", "SF Pro Text", "Helvetica Neue", "Segoe UI", Arial, sans-serif';

export interface NiceSelectOption {
  value: string;
  label: string;
  /** Optional style for the row label (e.g. render a font option in
   *  its own typeface). */
  labelStyle?: React.CSSProperties;
}

export function NiceSelect({
  value,
  onChange,
  options,
  ariaLabel,
  triggerStyle,
  menuWidth = 220,
  align = "start",
  hideChevron = false,
  renderTriggerLabel,
}: {
  value: string;
  onChange: (v: string) => void;
  options: NiceSelectOption[];
  ariaLabel?: string;
  /** Merged over the default trigger pill so each surface can match
   *  its local design (padding, colors, radius). */
  triggerStyle?: React.CSSProperties;
  menuWidth?: number;
  /** Horizontal alignment of the menu relative to the trigger. */
  align?: "start" | "end";
  hideChevron?: boolean;
  /** Custom trigger text (defaults to the active option's label). */
  renderTriggerLabel?: (active: NiceSelectOption | undefined) => React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const [rect, setRect] = useState<{ top: number; left: number } | null>(null);
  const btnRef = useRef<HTMLButtonElement>(null);

  const active = options.find((o) => o.value === value);

  const openMenu = () => {
    const r = btnRef.current?.getBoundingClientRect();
    if (!r) return;
    // Clamp inside the viewport with a 10px gutter on both axes.
    const left = Math.max(
      10,
      Math.min(
        align === "end" ? r.right - menuWidth : r.left,
        window.innerWidth - menuWidth - 10,
      ),
    );
    const estHeight = Math.min(options.length * 40 + 12, 320);
    const top =
      r.bottom + 6 + estHeight > window.innerHeight - 10
        ? Math.max(10, r.top - estHeight - 6)
        : r.bottom + 6;
    setRect({ top, left });
    setOpen(true);
  };

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <>
      <button
        ref={btnRef}
        type="button"
        aria-label={ariaLabel}
        aria-expanded={open}
        aria-haspopup="listbox"
        onClick={() => (open ? setOpen(false) : openMenu())}
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 6,
          padding: "8px 12px",
          borderRadius: 10,
          background: "rgba(255,255,255,0.05)",
          border: "1px solid rgba(255,255,255,0.10)",
          color: "#e8e8ea",
          fontFamily: SF,
          fontSize: 12.5,
          fontWeight: 600,
          cursor: "pointer",
          whiteSpace: "nowrap",
          transition: "background 130ms ease, border-color 130ms ease",
          ...triggerStyle,
        }}
      >
        <span style={{ overflow: "hidden", textOverflow: "ellipsis" }}>
          {renderTriggerLabel ? renderTriggerLabel(active) : (active?.label ?? value)}
        </span>
        {!hideChevron && (
          <ChevronDown
            size={12}
            style={{
              opacity: 0.55,
              flexShrink: 0,
              transition: "transform 160ms ease",
              transform: open ? "rotate(180deg)" : "none",
            }}
          />
        )}
      </button>

      {open && rect && (
        <>
          <div
            style={{ position: "fixed", inset: 0, zIndex: 9998 }}
            onClick={() => setOpen(false)}
          />
          <div
            role="listbox"
            style={{
              position: "fixed",
              top: rect.top,
              left: rect.left,
              width: menuWidth,
              maxHeight: 320,
              overflowY: "auto",
              zIndex: 9999,
              background: "rgba(18,18,22,0.98)",
              backdropFilter: "blur(20px)",
              WebkitBackdropFilter: "blur(20px)",
              border: "1px solid rgba(255,255,255,0.14)",
              borderRadius: 14,
              boxShadow: "0 18px 50px rgba(0,0,0,0.55)",
              padding: 5,
              fontFamily: SF,
              animation: "niceSelectIn 150ms cubic-bezier(0.22, 1, 0.36, 1)",
            }}
          >
            <style>{`
              @keyframes niceSelectIn {
                from { opacity: 0; transform: translateY(-4px) scale(0.98); }
                to   { opacity: 1; transform: translateY(0) scale(1); }
              }
            `}</style>
            {options.map((o) => {
              const isActive = o.value === value;
              return (
                <button
                  key={o.value}
                  type="button"
                  role="option"
                  aria-selected={isActive}
                  onClick={() => {
                    onChange(o.value);
                    setOpen(false);
                  }}
                  style={{
                    width: "100%",
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    padding: "9px 11px",
                    borderRadius: 9,
                    border: "none",
                    cursor: "pointer",
                    background: isActive ? "rgba(255,255,255,0.10)" : "transparent",
                    color: "#f2f2f4",
                    fontSize: 13,
                    fontWeight: isActive ? 650 : 450,
                    textAlign: "start",
                    transition: "background 110ms ease",
                  }}
                  onMouseEnter={(e) => {
                    if (!isActive) e.currentTarget.style.background = "rgba(255,255,255,0.06)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = isActive
                      ? "rgba(255,255,255,0.10)"
                      : "transparent";
                  }}
                >
                  <span style={{ flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", ...o.labelStyle }}>
                    {o.label}
                  </span>
                  {isActive && <Check size={13} style={{ flexShrink: 0, opacity: 0.85 }} />}
                </button>
              );
            })}
          </div>
        </>
      )}
    </>
  );
}
