// Quick AI actions bubble for the chapter editor.
//
// When the writer selects 2 or more words in the editor, a small
// floating menu appears with five quick actions: Polish, Show,
// Describe, Continue, Shorten. One click streams the rewrite from
// the Studio backend (default Cerebras) and shows it in a result
// card with Replace / Insert After / Copy / Discard.
//
// The single-word selection path is reserved for the dictionary
// popover (see DictionaryPopover.tsx); this bubble only renders when
// the selection is two words or longer, so the two features never
// fight for the same screen real estate.

import { useEffect, useMemo, useRef, useState } from "react";
import type { Editor as TipTapEditor } from "@tiptap/react";
import {
  Wand2,
  Eye,
  Paintbrush,
  ArrowDown,
  Scissors,
  X,
  Loader2,
  Copy,
  Check,
} from "lucide-react";

interface QuickAIBubbleProps {
  editor: TipTapEditor | null;
  bookId: number;
  chapterId: number | undefined;
  /** When true, all features are hidden (used while the Studio panel
   *  is open so the bubble does not stack over the Studio chat). */
  suppressed?: boolean;
}

type QuickAction = "polish" | "show" | "describe" | "continue" | "shorten";

const ACTION_LABELS: Record<QuickAction, { en: string; ar: string }> = {
  polish: { en: "Polish", ar: "تحسين" },
  show: { en: "Show", ar: "أَظهِر" },
  describe: { en: "Describe", ar: "صِف" },
  continue: { en: "Continue", ar: "تابِع" },
  shorten: { en: "Shorten", ar: "اختصر" },
};

const ACTION_ICONS: Record<QuickAction, React.ComponentType<{ size?: number }>> = {
  polish: Wand2,
  show: Eye,
  describe: Paintbrush,
  continue: ArrowDown,
  shorten: Scissors,
};

const SF =
  '-apple-system, BlinkMacSystemFont, "SF Pro Display", "SF Pro Text", "Helvetica Neue", sans-serif';

interface SelectionInfo {
  text: string;
  from: number;
  to: number;
  rect: { top: number; left: number; width: number; height: number };
}

export function QuickAIBubble({
  editor,
  bookId,
  chapterId,
  suppressed,
}: QuickAIBubbleProps) {
  const [selection, setSelection] = useState<SelectionInfo | null>(null);
  const [resultState, setResultState] = useState<{
    action: QuickAction;
    selection: SelectionInfo;
    text: string;
    streaming: boolean;
    error: string | null;
  } | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  // Track the editor's selection. We open the bubble only when:
  //   - text is selected (from < to)
  //   - the selection has 2+ visible words (single-word reserved for
  //     the dictionary popover)
  //   - the panel is not suppressed
  useEffect(() => {
    if (!editor || suppressed) {
      setSelection(null);
      return;
    }

    const update = () => {
      const { from, to, empty } = editor.state.selection;
      if (empty) {
        setSelection(null);
        return;
      }
      const text = editor.state.doc.textBetween(from, to, " ").trim();
      const wordCount = text.split(/\s+/).filter(Boolean).length;
      if (wordCount < 2 || text.length === 0) {
        setSelection(null);
        return;
      }
      // Compute selection rectangle from the DOM. coordsAtPos gives a
      // pixel box for the start and end of the selection; the bubble
      // anchors against the top of the start, horizontally centred on
      // the start-to-end span.
      const view = editor.view;
      const startCoords = view.coordsAtPos(from);
      const endCoords = view.coordsAtPos(to);
      const top = startCoords.top;
      const left = Math.min(startCoords.left, endCoords.left);
      const width = Math.max(endCoords.right, startCoords.right) - left;
      const height = endCoords.bottom - startCoords.top;
      setSelection({
        text,
        from,
        to,
        rect: { top, left, width, height },
      });
    };

    editor.on("selectionUpdate", update);
    editor.on("transaction", update);
    return () => {
      editor.off("selectionUpdate", update);
      editor.off("transaction", update);
    };
  }, [editor, suppressed]);

  // Close the result on Escape.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (abortRef.current) abortRef.current.abort();
        setResultState(null);
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  async function runAction(action: QuickAction) {
    if (!selection) return;
    const sel = selection;
    setSelection(null); // dismiss the bubble while the result streams
    setResultState({
      action,
      selection: sel,
      text: "",
      streaming: true,
      error: null,
    });

    const abortController = new AbortController();
    abortRef.current = abortController;

    try {
      const r = await fetch("/api/studio/quick-action", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action,
          text: sel.text,
          bookId,
          chapterId: chapterId || undefined,
        }),
        signal: abortController.signal,
      });

      if (!r.ok) {
        const body = await r.json().catch(() => ({}));
        throw new Error(body?.message || "Quick action failed");
      }

      const reader = r.body!.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let assembled = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        let eventEnd: number;
        while ((eventEnd = buffer.indexOf("\n\n")) >= 0) {
          const block = buffer.slice(0, eventEnd);
          buffer = buffer.slice(eventEnd + 2);
          const evt = parseSseEvent(block);
          if (!evt) continue;
          if (evt.event === "chunk" && typeof evt.data?.text === "string") {
            assembled += evt.data.text;
            setResultState((prev) =>
              prev ? { ...prev, text: assembled } : prev,
            );
          } else if (evt.event === "error") {
            throw new Error(
              (typeof evt.data?.message === "string" && evt.data.message) ||
                "Stream error",
            );
          }
        }
      }

      setResultState((prev) =>
        prev ? { ...prev, streaming: false } : prev,
      );
    } catch (e) {
      const err = e as Error;
      if (err.name === "AbortError") return;
      setResultState((prev) =>
        prev
          ? { ...prev, streaming: false, error: err.message }
          : prev,
      );
    } finally {
      abortRef.current = null;
    }
  }

  function applyReplace() {
    if (!editor || !resultState) return;
    const { selection: sel, text } = resultState;
    editor
      .chain()
      .focus()
      .insertContentAt({ from: sel.from, to: sel.to }, text)
      .run();
    setResultState(null);
  }

  function applyInsertAfter() {
    if (!editor || !resultState) return;
    const { selection: sel, text } = resultState;
    editor
      .chain()
      .focus()
      .setTextSelection(sel.to)
      .insertContent(" " + text)
      .run();
    setResultState(null);
  }

  function dismiss() {
    if (abortRef.current) abortRef.current.abort();
    setResultState(null);
  }

  return (
    <>
      {selection && !resultState && (
        <ActionsBar
          selection={selection}
          onAction={runAction}
        />
      )}
      {resultState && (
        <ResultCard
          state={resultState}
          onReplace={applyReplace}
          onInsertAfter={applyInsertAfter}
          onDismiss={dismiss}
        />
      )}
    </>
  );
}

function ActionsBar({
  selection,
  onAction,
}: {
  selection: SelectionInfo;
  onAction: (a: QuickAction) => void;
}) {
  const BAR_W = 320;
  const BAR_H = 38;
  const placement = useMemo(() => {
    // Sit above the selection, fall back below when too close to top.
    const spaceAbove = selection.rect.top;
    const above = spaceAbove > BAR_H + 24;
    let left =
      selection.rect.left + selection.rect.width / 2 - BAR_W / 2;
    left = Math.max(
      10,
      Math.min(left, window.innerWidth - BAR_W - 10),
    );
    const top = above
      ? selection.rect.top - BAR_H - 12
      : selection.rect.top + selection.rect.height + 12;
    return { top, left };
  }, [selection]);

  const actions: QuickAction[] = ["polish", "show", "describe", "continue", "shorten"];

  return (
    <div
      role="toolbar"
      aria-label="Quick AI actions"
      style={{
        position: "fixed",
        top: placement.top,
        left: placement.left,
        width: BAR_W,
        height: BAR_H,
        background: "#0a0a0a",
        border: "1px solid rgba(255,255,255,0.12)",
        borderRadius: 999,
        boxShadow: "0 14px 36px rgba(0,0,0,0.55)",
        zIndex: 70,
        display: "flex",
        alignItems: "center",
        justifyContent: "space-around",
        padding: "0 6px",
        fontFamily: SF,
      }}
    >
      {actions.map((a) => {
        const Icon = ACTION_ICONS[a];
        return (
          <button
            key={a}
            onMouseDown={(e) => {
              // Prevent the editor from losing its selection while
              // the action starts.
              e.preventDefault();
            }}
            onClick={() => onAction(a)}
            title={ACTION_LABELS[a].en}
            style={{
              flex: 1,
              height: 30,
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 5,
              background: "transparent",
              border: "none",
              color: "rgba(255,255,255,0.85)",
              cursor: "pointer",
              fontSize: 11.5,
              fontWeight: 600,
              borderRadius: 999,
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = "rgba(255,255,255,0.06)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "transparent";
            }}
          >
            <Icon size={13} />
            <span>{ACTION_LABELS[a].en}</span>
          </button>
        );
      })}
    </div>
  );
}

function ResultCard({
  state,
  onReplace,
  onInsertAfter,
  onDismiss,
}: {
  state: {
    action: QuickAction;
    selection: SelectionInfo;
    text: string;
    streaming: boolean;
    error: string | null;
  };
  onReplace: () => void;
  onInsertAfter: () => void;
  onDismiss: () => void;
}) {
  const [copied, setCopied] = useState(false);
  const CARD_W = 420;
  const CARD_MAX_H = 360;
  const placement = useMemo(() => {
    const spaceAbove = state.selection.rect.top;
    const above = spaceAbove > CARD_MAX_H + 24;
    let left =
      state.selection.rect.left +
      state.selection.rect.width / 2 -
      CARD_W / 2;
    left = Math.max(10, Math.min(left, window.innerWidth - CARD_W - 10));
    const top = above
      ? state.selection.rect.top - CARD_MAX_H - 12
      : state.selection.rect.top + state.selection.rect.height + 12;
    return { top, left };
  }, [state.selection]);

  return (
    <div
      role="dialog"
      aria-label="AI result"
      style={{
        position: "fixed",
        top: placement.top,
        left: placement.left,
        width: CARD_W,
        maxHeight: CARD_MAX_H,
        background: "#0a0a0a",
        border: "1px solid rgba(255,255,255,0.12)",
        borderRadius: 14,
        boxShadow: "0 22px 54px rgba(0,0,0,0.55)",
        zIndex: 75,
        display: "flex",
        flexDirection: "column",
        fontFamily: SF,
        color: "#fff",
        overflow: "hidden",
      }}
    >
      {/* Header */}
      <div
        style={{
          padding: "10px 12px 8px",
          display: "flex",
          alignItems: "center",
          gap: 8,
          borderBottom: "1px solid rgba(255,255,255,0.06)",
        }}
      >
        <span
          style={{
            fontSize: 10.5,
            fontWeight: 700,
            color: "rgba(255,255,255,0.55)",
            textTransform: "uppercase",
            letterSpacing: "0.08em",
            flex: 1,
          }}
        >
          {ACTION_LABELS[state.action].en}
        </span>
        {state.streaming && (
          <Loader2
            size={12}
            className="animate-spin"
            style={{ color: "rgba(255,255,255,0.6)" }}
          />
        )}
        <button onClick={onDismiss} aria-label="Close" style={iconButtonStyle()}>
          <X size={11} />
        </button>
      </div>

      {/* Body */}
      <div
        style={{
          padding: "10px 14px 12px",
          overflowY: "auto",
          flex: 1,
          fontSize: 13.5,
          lineHeight: 1.65,
          whiteSpace: "pre-wrap",
          userSelect: "text",
        }}
      >
        {state.error ? (
          <span style={{ color: "#fca5a5" }}>{state.error}</span>
        ) : state.text ? (
          <span>{state.text}</span>
        ) : (
          <span style={{ color: "rgba(255,255,255,0.4)", fontStyle: "italic" }}>
            Thinking…
          </span>
        )}
      </div>

      {/* Footer with action buttons */}
      {!state.error && state.text && (
        <div
          style={{
            padding: "8px 10px",
            borderTop: "1px solid rgba(255,255,255,0.06)",
            display: "flex",
            gap: 6,
          }}
        >
          <ResultBtn primary onClick={onReplace} disabled={state.streaming}>
            Replace
          </ResultBtn>
          <ResultBtn onClick={onInsertAfter} disabled={state.streaming}>
            Insert after
          </ResultBtn>
          <ResultBtn
            onClick={() => {
              navigator.clipboard?.writeText(state.text);
              setCopied(true);
              setTimeout(() => setCopied(false), 1200);
            }}
            disabled={state.streaming}
          >
            {copied ? (
              <>
                <Check size={11} /> Copied
              </>
            ) : (
              <>
                <Copy size={11} /> Copy
              </>
            )}
          </ResultBtn>
          <ResultBtn onClick={onDismiss}>Discard</ResultBtn>
        </div>
      )}
    </div>
  );
}

function ResultBtn({
  children,
  onClick,
  primary,
  disabled,
}: {
  children: React.ReactNode;
  onClick: () => void;
  primary?: boolean;
  disabled?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        flex: 1,
        height: 30,
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        gap: 4,
        background: primary ? "#fff" : "rgba(255,255,255,0.04)",
        border: `1px solid ${primary ? "#fff" : "rgba(255,255,255,0.10)"}`,
        color: primary ? "#000" : "rgba(255,255,255,0.85)",
        borderRadius: 8,
        fontSize: 11.5,
        fontWeight: 600,
        cursor: disabled ? "default" : "pointer",
        opacity: disabled ? 0.5 : 1,
      }}
    >
      {children}
    </button>
  );
}

function iconButtonStyle(): React.CSSProperties {
  return {
    width: 22,
    height: 22,
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    background: "rgba(255,255,255,0.04)",
    border: "1px solid rgba(255,255,255,0.08)",
    borderRadius: 6,
    color: "rgba(255,255,255,0.75)",
    cursor: "pointer",
  };
}

// ─── SSE parsing helper ──────────────────────────────────────────────

function parseSseEvent(block: string): { event: string; data: Record<string, unknown> } | null {
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
    return { event, data: parsed };
  } catch {
    return null;
  }
}
