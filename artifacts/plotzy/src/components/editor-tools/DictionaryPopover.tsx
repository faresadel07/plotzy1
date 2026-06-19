// Inline dictionary lookup for the chapter editor.
//
// When the writer presses Cmd/Ctrl+D (or clicks the dictionary button
// in the bubble menu), this popover opens against the selected word
// and fetches three things in parallel from three free APIs:
//
//   - Definitions, phonetic, part of speech — Free Dictionary API
//     (https://api.dictionaryapi.dev), unlimited, no key.
//   - Synonyms via Datamuse (?ml=word), 100K queries/day no key.
//   - Rhymes via Datamuse (?rel_rhy=word).
//
// All three are CORS-friendly so the requests go straight from the
// browser. No backend involvement, no API quota on Plotzy's side.
//
// The popover floats next to the selection rectangle and disappears
// on Escape, outside-click, or selection change.

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { BookOpen, X, Volume2, Loader2 } from "lucide-react";

interface DictionaryPopoverProps {
  word: string;
  /** Pixel coordinates to anchor against (typically the top-left of
   *  the editor selection rectangle). */
  anchorRect: { top: number; left: number; width: number; height: number };
  onClose: () => void;
  /** Whether the page is in RTL mode (Arabic). Decides which Datamuse
   *  endpoint to call and whether to show phonetic/rhymes. */
  isRTL?: boolean;
}

interface DefinitionEntry {
  partOfSpeech: string;
  definitions: { definition: string; example?: string }[];
}

interface DictionaryData {
  word: string;
  phonetic?: string;
  audioUrl?: string;
  entries: DefinitionEntry[];
}

const SF =
  '-apple-system, BlinkMacSystemFont, "SF Pro Display", "SF Pro Text", "Helvetica Neue", sans-serif';

export function DictionaryPopover({
  word,
  anchorRect,
  onClose,
  isRTL,
}: DictionaryPopoverProps) {
  const [dict, setDict] = useState<DictionaryData | null>(null);
  const [synonyms, setSynonyms] = useState<string[]>([]);
  const [rhymes, setRhymes] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const popoverRef = useRef<HTMLDivElement | null>(null);

  // Normalize the word: strip punctuation, lowercase, trim.
  const cleanWord = useMemo(
    () => word.replace(/[^\p{L}\p{N}'-]/gu, "").trim().toLowerCase(),
    [word],
  );

  useEffect(() => {
    if (!cleanWord) {
      setError("No word selected.");
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(null);

    (async () => {
      try {
        // Three calls in parallel. Datamuse is English-only so we skip
        // synonyms and rhymes for Arabic words, but the Free Dictionary
        // API also works only for English; for Arabic words we just
        // surface a "no entry found" graceful message.
        const [defRes, synRes, rhyRes] = await Promise.allSettled([
          fetch(
            `https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(cleanWord)}`,
          ),
          isRTL
            ? Promise.resolve(null)
            : fetch(
                `https://api.datamuse.com/words?ml=${encodeURIComponent(cleanWord)}&max=8`,
              ),
          isRTL
            ? Promise.resolve(null)
            : fetch(
                `https://api.datamuse.com/words?rel_rhy=${encodeURIComponent(cleanWord)}&max=8`,
              ),
        ]);

        if (cancelled) return;

        // Dictionary parsing
        if (
          defRes.status === "fulfilled" &&
          defRes.value &&
          defRes.value.ok
        ) {
          const data = await defRes.value.json();
          const entry = Array.isArray(data) ? data[0] : null;
          if (entry) {
            const phoneticObj = entry.phonetics?.find(
              (p: { audio?: string; text?: string }) => p.text,
            );
            const audioObj = entry.phonetics?.find(
              (p: { audio?: string }) => p.audio,
            );
            setDict({
              word: entry.word ?? cleanWord,
              phonetic: phoneticObj?.text,
              audioUrl: audioObj?.audio,
              entries: (entry.meanings ?? []).slice(0, 3).map((m: {
                partOfSpeech: string;
                definitions: { definition: string; example?: string }[];
              }) => ({
                partOfSpeech: m.partOfSpeech,
                definitions: (m.definitions ?? [])
                  .slice(0, 2)
                  .map((d) => ({
                    definition: d.definition,
                    example: d.example,
                  })),
              })),
            });
          } else {
            setDict(null);
          }
        }

        // Synonyms
        if (synRes.status === "fulfilled" && synRes.value && synRes.value.ok) {
          const list = (await synRes.value.json()) as { word: string }[];
          setSynonyms(list.slice(0, 8).map((w) => w.word));
        }

        // Rhymes
        if (rhyRes.status === "fulfilled" && rhyRes.value && rhyRes.value.ok) {
          const list = (await rhyRes.value.json()) as { word: string }[];
          setRhymes(list.slice(0, 8).map((w) => w.word));
        }
      } catch (err) {
        if (!cancelled) setError("Lookup failed.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [cleanWord, isRTL]);

  // Close on Escape or outside click.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    const onClick = (e: MouseEvent) => {
      if (
        popoverRef.current &&
        !popoverRef.current.contains(e.target as Node)
      ) {
        onClose();
      }
    };
    document.addEventListener("keydown", onKey);
    document.addEventListener("mousedown", onClick);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("mousedown", onClick);
    };
  }, [onClose]);

  // Position math: try to sit above the selection; if not enough room,
  // sit below.
  const POPOVER_W = 320;
  const POPOVER_MAX_H = 380;
  const VIEWPORT_PAD = 14;
  const placement = useMemo(() => {
    const spaceAbove = anchorRect.top;
    const above = spaceAbove > POPOVER_MAX_H + VIEWPORT_PAD;
    let left = anchorRect.left + anchorRect.width / 2 - POPOVER_W / 2;
    left = Math.max(VIEWPORT_PAD, Math.min(left, window.innerWidth - POPOVER_W - VIEWPORT_PAD));
    const top = above
      ? anchorRect.top - 10 - POPOVER_MAX_H
      : anchorRect.top + anchorRect.height + 10;
    return { top, left };
  }, [anchorRect]);

  const playAudio = useCallback(() => {
    if (!dict?.audioUrl) return;
    const audio = new Audio(dict.audioUrl);
    audio.play().catch(() => {});
  }, [dict]);

  return (
    <div
      ref={popoverRef}
      role="dialog"
      aria-label="Dictionary"
      style={{
        position: "fixed",
        top: placement.top,
        left: placement.left,
        width: POPOVER_W,
        maxHeight: POPOVER_MAX_H,
        overflow: "auto",
        zIndex: 80,
        background: "#0a0a0a",
        border: "1px solid rgba(255,255,255,0.10)",
        borderRadius: 14,
        boxShadow: "0 18px 50px rgba(0,0,0,0.55)",
        fontFamily: SF,
        color: "#fff",
        padding: 0,
      }}
    >
      {/* Header */}
      <div
        style={{
          padding: "10px 12px 8px",
          display: "flex",
          alignItems: "center",
          gap: 10,
          borderBottom: "1px solid rgba(255,255,255,0.06)",
        }}
      >
        <BookOpen size={14} style={{ color: "rgba(255,255,255,0.55)" }} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div
            style={{
              fontSize: 15,
              fontWeight: 700,
              lineHeight: 1.2,
              letterSpacing: "-0.01em",
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
            }}
          >
            {dict?.word ?? cleanWord}
          </div>
          {dict?.phonetic && (
            <div style={{ fontSize: 11, color: "rgba(255,255,255,0.45)", marginTop: 1 }}>
              {dict.phonetic}
            </div>
          )}
        </div>
        {dict?.audioUrl && (
          <button
            onClick={playAudio}
            aria-label="Play pronunciation"
            style={iconButtonStyle()}
          >
            <Volume2 size={12} />
          </button>
        )}
        <button onClick={onClose} aria-label="Close" style={iconButtonStyle()}>
          <X size={12} />
        </button>
      </div>

      {/* Body */}
      <div style={{ padding: "10px 12px 12px" }}>
        {loading && (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              padding: "16px 0",
              color: "rgba(255,255,255,0.5)",
              fontSize: 12,
            }}
          >
            <Loader2 size={13} className="animate-spin" />
            <span>Looking up…</span>
          </div>
        )}

        {!loading && error && (
          <div style={{ fontSize: 12, color: "rgba(255,255,255,0.5)", padding: "8px 0" }}>
            {error}
          </div>
        )}

        {!loading && !error && !dict && synonyms.length === 0 && rhymes.length === 0 && (
          <div style={{ fontSize: 12, color: "rgba(255,255,255,0.5)", padding: "8px 0" }}>
            No entry found.
          </div>
        )}

        {/* Definitions */}
        {dict?.entries.map((entry, i) => (
          <div key={i} style={{ marginBottom: 12 }}>
            <div
              style={{
                fontSize: 10.5,
                color: "rgba(255,255,255,0.42)",
                textTransform: "uppercase",
                letterSpacing: "0.08em",
                marginBottom: 4,
                fontWeight: 600,
              }}
            >
              {entry.partOfSpeech}
            </div>
            {entry.definitions.map((d, j) => (
              <div key={j} style={{ marginBottom: 6 }}>
                <div style={{ fontSize: 12.5, lineHeight: 1.5, color: "rgba(255,255,255,0.85)" }}>
                  {j + 1}. {d.definition}
                </div>
                {d.example && (
                  <div
                    style={{
                      fontSize: 11.5,
                      lineHeight: 1.5,
                      color: "rgba(255,255,255,0.45)",
                      fontStyle: "italic",
                      marginTop: 2,
                      paddingInlineStart: 12,
                    }}
                  >
                    {`"${d.example}"`}
                  </div>
                )}
              </div>
            ))}
          </div>
        ))}

        {/* Synonyms */}
        {synonyms.length > 0 && (
          <Section title="Synonyms" items={synonyms} />
        )}

        {/* Rhymes */}
        {rhymes.length > 0 && (
          <Section title="Rhymes" items={rhymes} />
        )}
      </div>
    </div>
  );
}

function Section({ title, items }: { title: string; items: string[] }) {
  return (
    <div style={{ marginTop: 8 }}>
      <div
        style={{
          fontSize: 10.5,
          color: "rgba(255,255,255,0.42)",
          textTransform: "uppercase",
          letterSpacing: "0.08em",
          marginBottom: 6,
          fontWeight: 600,
        }}
      >
        {title}
      </div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
        {items.map((w) => (
          <span
            key={w}
            style={{
              padding: "3px 9px",
              fontSize: 11.5,
              color: "rgba(255,255,255,0.78)",
              background: "rgba(255,255,255,0.04)",
              border: "1px solid rgba(255,255,255,0.08)",
              borderRadius: 999,
            }}
          >
            {w}
          </span>
        ))}
      </div>
    </div>
  );
}

function iconButtonStyle(): React.CSSProperties {
  return {
    width: 24,
    height: 24,
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
