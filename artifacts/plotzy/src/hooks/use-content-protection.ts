import { useEffect } from "react";

/**
 * Friction-grade content protection for rendered prose.
 *
 * Attaches document-level listeners that fire only when the event
 * target is inside any element matching `selector`. While the listeners
 * are mounted:
 *   - the right-click context menu is blocked (no Inspect Element
 *     shortcut on the protected text)
 *   - copy and cut events are blocked (Ctrl+C / Ctrl+X / edit-menu Copy)
 *   - drag-out is blocked (no easy "drag this image to my desktop")
 *   - any native selection that does form is cleared (defense in depth —
 *     the page already sets user-select:none, but bookmarklets and
 *     OS-level touch selection can bypass the CSS rule)
 *
 * NOT DRM. A determined user can still scrape the content via DevTools,
 * the browser's Reader Mode, view-source, or simply by screenshotting
 * the page. The point of these handlers is to make casual copying
 * inconvenient enough that opportunistic scrapers move on. Honest
 * positioning matters here — don't claim more than this delivers.
 *
 * Document-level listeners (rather than React props on the wrapping
 * div) so the same hook trivially covers a page that renders multiple
 * content blocks (e.g. the paginated reader has one block per page).
 */
export function useContentProtection(selector: string): void {
  useEffect(() => {
    const isInside = (target: EventTarget | null): boolean => {
      if (!(target instanceof Element)) return false;
      return !!target.closest(selector);
    };

    const block = (e: Event) => {
      if (isInside(e.target)) e.preventDefault();
    };

    // Most native selections never form because the CSS rule sets
    // user-select:none on the same selector. This handles the
    // bookmarklet / iOS-Safari long-press cases that slip through.
    const nukeSelection = () => {
      const sel = window.getSelection();
      if (!sel || sel.rangeCount === 0) return;
      const anchorEl =
        sel.anchorNode instanceof Element
          ? sel.anchorNode
          : sel.anchorNode?.parentElement ?? null;
      const focusEl =
        sel.focusNode instanceof Element
          ? sel.focusNode
          : sel.focusNode?.parentElement ?? null;
      if (anchorEl?.closest(selector) || focusEl?.closest(selector)) {
        sel.removeAllRanges();
      }
    };

    document.addEventListener("contextmenu", block);
    document.addEventListener("copy", block);
    document.addEventListener("cut", block);
    document.addEventListener("dragstart", block);
    document.addEventListener("selectionchange", nukeSelection);

    return () => {
      document.removeEventListener("contextmenu", block);
      document.removeEventListener("copy", block);
      document.removeEventListener("cut", block);
      document.removeEventListener("dragstart", block);
      document.removeEventListener("selectionchange", nukeSelection);
    };
  }, [selector]);
}
