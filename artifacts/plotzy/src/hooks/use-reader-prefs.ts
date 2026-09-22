// Reading preferences and reading position, remembered per reader.
//
// The community reader had none of this: no font control, no theme, and
// closing the tab always sent you back to page one of a 300-page book.
// The Gutenberg reader already remembered position; this brings the same
// courtesy to books written by Plotzy's own writers.

import { useCallback, useEffect, useState } from "react";

export type ReaderTheme = "paper" | "sepia" | "night";

export interface ReaderPrefs {
  /** Body size in px for the book text. */
  fontSize: number;
  theme: ReaderTheme;
}

const PREFS_KEY = "plotzy-reader-prefs";
export const FONT_MIN = 13;
export const FONT_MAX = 24;
const DEFAULT_PREFS: ReaderPrefs = { fontSize: 16, theme: "paper" };

function readPrefs(): ReaderPrefs {
  try {
    const raw = localStorage.getItem(PREFS_KEY);
    if (!raw) return DEFAULT_PREFS;
    const parsed = JSON.parse(raw);
    const size = Number(parsed?.fontSize);
    return {
      fontSize: Number.isFinite(size) ? Math.min(FONT_MAX, Math.max(FONT_MIN, size)) : DEFAULT_PREFS.fontSize,
      theme: parsed?.theme === "sepia" || parsed?.theme === "night" ? parsed.theme : "paper",
    };
  } catch {
    return DEFAULT_PREFS;
  }
}

export function useReaderPrefs() {
  const [prefs, setPrefs] = useState<ReaderPrefs>(readPrefs);

  useEffect(() => {
    try { localStorage.setItem(PREFS_KEY, JSON.stringify(prefs)); } catch { /* private mode */ }
  }, [prefs]);

  const setFontSize = useCallback((next: number) => {
    setPrefs((p) => ({ ...p, fontSize: Math.min(FONT_MAX, Math.max(FONT_MIN, next)) }));
  }, []);
  const setTheme = useCallback((theme: ReaderTheme) => {
    setPrefs((p) => ({ ...p, theme }));
  }, []);

  return { prefs, setFontSize, setTheme };
}

/** The page colours for each theme. The chrome around the book stays
 *  dark in every theme — only the page itself changes. */
export const THEME_COLORS: Record<ReaderTheme, { page: string; pageAlt: string; ink: string; muted: string }> = {
  paper: { page: "#faf7f2", pageAlt: "#f5f1ea", ink: "#1c1410", muted: "#b0a898" },
  sepia: { page: "#f4e8d5", pageAlt: "#eadfc9", ink: "#3a2c18", muted: "#a89a7c" },
  night: { page: "#1e1c1a", pageAlt: "#191715", ink: "#ddd5c8", muted: "#6b645a" },
};

/** Remember where a reader stopped, per book. */
export function useReadingPosition(bookId: number) {
  const key = `plotzy-reading-pos-${bookId}`;

  const load = useCallback((): { spread?: number; unit?: number; page?: number } | null => {
    if (!Number.isFinite(bookId) || bookId <= 0) return null;
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  }, [key, bookId]);

  const save = useCallback((pos: { spread?: number; unit?: number; page?: number }) => {
    if (!Number.isFinite(bookId) || bookId <= 0) return;
    try { localStorage.setItem(key, JSON.stringify(pos)); } catch { /* private mode */ }
  }, [key, bookId]);

  return { load, save };
}
