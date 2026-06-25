import { useEditor, EditorContent, NodeViewWrapper, ReactNodeViewRenderer } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Underline from "@tiptap/extension-underline";
import TextAlign from "@tiptap/extension-text-align";
import { TextStyle } from "@tiptap/extension-text-style";
import Color from "@tiptap/extension-color";
import FontFamily from "@tiptap/extension-font-family";
import Highlight from "@tiptap/extension-highlight";
import Link from "@tiptap/extension-link";
import { Extension, Node } from "@tiptap/core";
import { useEffect, useRef, useState, useCallback, forwardRef, useImperativeHandle } from "react";
import type { Editor } from "@tiptap/react";
import type { NodeViewProps } from "@tiptap/react";

// ── Resizable Image NodeView ─────────────────────────────────────────────────
function ResizableImageView({ node, updateAttributes, selected }: NodeViewProps) {
  const [isResizing, setIsResizing] = useState(false);
  const startRef = useRef<{ x: number; w: number } | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  // Hold a reference to the active drag handlers so we can yank them off
  // window if the node is unmounted mid-drag (TipTap re-renders can swap
  // the NodeView without firing mouseup, leaving stale listeners forever).
  const activeListenersRef = useRef<{ move: (e: MouseEvent) => void; up: () => void } | null>(null);

  const widthPct: number = node.attrs.widthPct ?? 100;
  const align: string = node.attrs.align ?? "center";
  const src: string = node.attrs.src ?? "";

  const justifyMap: Record<string, string> = { left: "flex-start", center: "center", right: "flex-end" };

  const startResize = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const container = containerRef.current;
    if (!container) return;
    const containerW = container.parentElement?.offsetWidth ?? 508;
    startRef.current = { x: e.clientX, w: (widthPct / 100) * containerW };
    setIsResizing(true);

    const onMove = (ev: MouseEvent) => {
      if (!startRef.current) return;
      const dx = ev.clientX - startRef.current.x;
      const newW = Math.max(80, startRef.current.w + dx);
      const pct = Math.round(Math.min(100, (newW / containerW) * 100));
      updateAttributes({ widthPct: pct });
    };
    const onUp = () => {
      setIsResizing(false);
      startRef.current = null;
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
      activeListenersRef.current = null;
    };
    activeListenersRef.current = { move: onMove, up: onUp };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
  }, [widthPct, updateAttributes]);

  // Defensive unmount cleanup — if the resize was never released (component
  // unmounted mid-drag, TipTap swapped the NodeView, etc.) we'd otherwise
  // leak a pair of window listeners every time.
  useEffect(() => () => {
    const active = activeListenersRef.current;
    if (active) {
      window.removeEventListener("mousemove", active.move);
      window.removeEventListener("mouseup", active.up);
      activeListenersRef.current = null;
    }
  }, []);

  const AlignIcon = ({ a }: { a: string }) => (
    a === "left" ? <svg width="11" height="9" viewBox="0 0 11 9" fill="currentColor"><rect x="0" y="0" width="11" height="1.8" rx="0.9"/><rect x="0" y="3.6" width="7" height="1.8" rx="0.9"/><rect x="0" y="7.2" width="9" height="1.8" rx="0.9"/></svg>
    : a === "center" ? <svg width="11" height="9" viewBox="0 0 11 9" fill="currentColor"><rect x="0" y="0" width="11" height="1.8" rx="0.9"/><rect x="2" y="3.6" width="7" height="1.8" rx="0.9"/><rect x="1" y="7.2" width="9" height="1.8" rx="0.9"/></svg>
    : <svg width="11" height="9" viewBox="0 0 11 9" fill="currentColor"><rect x="0" y="0" width="11" height="1.8" rx="0.9"/><rect x="4" y="3.6" width="7" height="1.8" rx="0.9"/><rect x="2" y="7.2" width="9" height="1.8" rx="0.9"/></svg>
  );

  return (
    <NodeViewWrapper>
      <div
        style={{ display: "flex", justifyContent: justifyMap[align], padding: "8px 0", userSelect: "none", position: "relative" }}
        contentEditable={false}
      >
        {/* Floating toolbar — only when selected */}
        {selected && (
          <div
            style={{
              position: "absolute",
              top: "-8px",
              left: "50%",
              transform: "translate(-50%, -100%)",
              display: "flex",
              alignItems: "center",
              gap: "2px",
              padding: "4px 6px",
              background: "#1a1a1d",
              border: "1px solid rgba(255,255,255,0.12)",
              borderRadius: "10px",
              boxShadow: "0 4px 20px rgba(0,0,0,0.4)",
              zIndex: 50,
              whiteSpace: "nowrap",
            }}
            onMouseDown={e => e.preventDefault()}
          >
            {(["left", "center", "right"] as const).map(a => (
              <button
                key={a}
                onMouseDown={e => { e.preventDefault(); updateAttributes({ align: a }); }}
                style={{
                  width: 24, height: 24, borderRadius: 6, border: "none", cursor: "pointer",
                  background: align === a ? "rgba(255,255,255,0.18)" : "transparent",
                  color: align === a ? "#fff" : "rgba(255,255,255,0.45)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                }}
              ><AlignIcon a={a} /></button>
            ))}
            <div style={{ width: 1, height: 16, background: "rgba(255,255,255,0.12)", margin: "0 2px" }} />
            {([{ l: "S", p: 33 }, { l: "M", p: 55 }, { l: "L", p: 80 }, { l: "↔", p: 100 }]).map(({ l, p }) => (
              <button
                key={l}
                onMouseDown={e => { e.preventDefault(); updateAttributes({ widthPct: p }); }}
                style={{
                  width: 24, height: 24, borderRadius: 6, border: "none", cursor: "pointer",
                  background: Math.abs(widthPct - p) < 5 ? "rgba(255,255,255,0.18)" : "transparent",
                  color: Math.abs(widthPct - p) < 5 ? "#fff" : "rgba(255,255,255,0.45)",
                  fontSize: 10, fontWeight: 700,
                }}
              >{l}</button>
            ))}
            <div style={{ width: 1, height: 16, background: "rgba(255,255,255,0.12)", margin: "0 2px" }} />
            <span style={{ fontSize: 9, color: "rgba(255,255,255,0.4)", padding: "0 4px" }}>{widthPct}%</span>
          </div>
        )}

        {/* Image container */}
        <div
          ref={containerRef}
          style={{ position: "relative", width: `${widthPct}%`, minWidth: 60 }}
        >
          <img
            src={src}
            draggable={false}
            style={{
              width: "100%",
              height: "auto",
              display: "block",
              borderRadius: 4,
              outline: selected ? "2px solid #7c6af7" : "2px solid transparent",
              outlineOffset: 2,
              cursor: isResizing ? "ew-resize" : "default",
              transition: "outline-color 0.15s",
            }}
          />
          {/* Resize handle */}
          {selected && (
            <div
              onMouseDown={startResize}
              style={{
                position: "absolute",
                bottom: -6,
                right: -6,
                width: 14,
                height: 14,
                borderRadius: "50%",
                background: "#7c6af7",
                border: "2px solid #fff",
                boxShadow: "0 2px 6px rgba(0,0,0,0.3)",
                cursor: "ew-resize",
                zIndex: 10,
              }}
            />
          )}
        </div>
      </div>
    </NodeViewWrapper>
  );
}

// ── Custom ResizableImage TipTap Node ────────────────────────────────────────
const ResizableImage = Node.create({
  name: "resizableImage",
  group: "block",
  atom: true,
  draggable: true,

  addAttributes() {
    return {
      src: { default: null },
      alt: { default: null },
      title: { default: null },
      widthPct: { default: 100 },
      align: { default: "center" },
    };
  },

  parseHTML() {
    return [
      {
        tag: "img[src]",
        getAttrs: el => {
          const img = el as HTMLImageElement;
          const w = img.getAttribute("data-width-pct");
          const a = img.getAttribute("data-align");
          return {
            src: img.getAttribute("src"),
            alt: img.getAttribute("alt"),
            title: img.getAttribute("title"),
            widthPct: w ? Number(w) : 100,
            align: a ?? "center",
          };
        },
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      "img",
      {
        src: HTMLAttributes.src,
        alt: HTMLAttributes.alt ?? "",
        title: HTMLAttributes.title ?? "",
        "data-width-pct": HTMLAttributes.widthPct ?? 100,
        "data-align": HTMLAttributes.align ?? "center",
        style: `max-width:${HTMLAttributes.widthPct ?? 100}%;height:auto;display:block;border-radius:4px;margin:${HTMLAttributes.align === "left" ? "8px auto 8px 0" : HTMLAttributes.align === "right" ? "8px 0 8px auto" : "8px auto"};`,
      },
    ];
  },

  addNodeView() {
    return ReactNodeViewRenderer(ResizableImageView);
  },

  addCommands() {
    return {
      setResizableImage: (attrs: { src: string; alt?: string; title?: string }) => ({ commands }: any) =>
        commands.insertContent({ type: this.name, attrs }),
    } as any;
  },
});

// ── FontSize extension ──────────────────────────────────────────────────────
const FontSize = Extension.create({
  name: "fontSize",
  addGlobalAttributes() {
    return [{
      types: ["textStyle"],
      attributes: {
        fontSize: {
          default: null,
          parseHTML: el => el.style.fontSize?.replace("px", "") || null,
          renderHTML: attrs => attrs.fontSize ? { style: `font-size: ${attrs.fontSize}px` } : {},
        },
      },
    }];
  },
  addCommands() {
    return {
      setFontSizePx: (size: number) => ({ chain }: { chain: any }) =>
        chain().setMark("textStyle", { fontSize: size }).run(),
      unsetFontSizePx: () => ({ chain }: { chain: any }) =>
        chain().setMark("textStyle", { fontSize: null }).run(),
    } as any;
  },
});

// ── Word-level binary search split for a single oversized block ──────────────
// When one paragraph is taller than the whole page, we split its text at the
// word boundary that fills the page exactly, inserting a temporary clone into
// the DOM to measure rendered height without affecting the real content.
function splitBlockAtWords(
  proseMirror: HTMLElement,
  child: HTMLElement,
  availableHeight: number,
): { fitsHtml: string; overflowHtml: string } | null {
  const words = (child.textContent || "").split(/(\s+)/);
  if (words.length < 2) return null;

  // Temporary sibling for measurement — invisible but participates in layout
  const probe = child.cloneNode(false) as HTMLElement;
  probe.style.visibility = "hidden";
  probe.style.position = "absolute";
  probe.style.width = `${child.offsetWidth}px`;
  proseMirror.insertBefore(probe, child);

  let lo = 0;
  let hi = words.length;
  while (lo < hi - 1) {
    const mid = Math.floor((lo + hi) / 2);
    probe.textContent = words.slice(0, mid).join("");
    if (probe.offsetHeight <= availableHeight) lo = mid;
    else hi = mid;
  }

  proseMirror.removeChild(probe);

  if (lo === 0) return null; // Can't fit even one word — leave block as-is

  const fitsText = words.slice(0, lo).join("");
  const overflowText = words.slice(lo).join("").trim();
  if (!overflowText) return null;

  const fitsEl = child.cloneNode(false) as HTMLElement;
  fitsEl.textContent = fitsText;
  const overflowEl = child.cloneNode(false) as HTMLElement;
  overflowEl.textContent = overflowText;

  return { fitsHtml: fitsEl.outerHTML, overflowHtml: overflowEl.outerHTML };
}

// ── Split at the exact paragraph where content overflows the page ───────────
// NOTE: We use offsetTop/offsetHeight instead of getBoundingClientRect()
// because getBoundingClientRect() returns scaled viewport pixels when the
// page is zoomed with CSS transform:scale(), while offsetTop/offsetHeight
// always return unscaled CSS pixels — matching availableHeight correctly.
function splitAtOverflow(
  proseMirror: HTMLElement,
  availableHeight: number,
): { fitsHtml: string; overflowHtml: string } | null {
  const children = Array.from(proseMirror.children) as HTMLElement[];
  if (children.length === 0) return null;

  const fitsNodes: string[] = [];
  const overflowNodes: string[] = [];
  let overflowStarted = false;

  for (const child of children) {
    if (overflowStarted) {
      overflowNodes.push(child.outerHTML);
      continue;
    }
    // offsetTop is relative to the element's offsetParent.
    // Since ProseMirror has position:relative (set below in CSS), offsetTop
    // of every child is relative to ProseMirror's top — exactly what we need.
    const childBottom = child.offsetTop + child.offsetHeight;
    if (childBottom <= availableHeight + 4) {
      fitsNodes.push(child.outerHTML);
    } else {
      // This child straddles the page boundary.
      // If part of this child is still above the boundary, attempt a word-level
      // split so that the first portion stays on this page (filling it fully)
      // and only the remainder overflows. This eliminates the "empty space at
      // the bottom of page 1" artifact caused by whole-paragraph eviction.
      if (child.offsetTop < availableHeight) {
        const spaceForChild = availableHeight - child.offsetTop;
        const wordSplit = splitBlockAtWords(proseMirror, child, spaceForChild);
        if (wordSplit) {
          fitsNodes.push(wordSplit.fitsHtml);
          overflowNodes.push(wordSplit.overflowHtml);
          overflowStarted = true;
          continue;
        }
      }
      overflowStarted = true;
      overflowNodes.push(child.outerHTML);
    }
  }

  if (overflowNodes.length === 0) return null;

  // ── Special case: nothing fit on the current page ──────────────────────────
  // The word-level split above already tried to fill the page from the first
  // child. If we still end up here with fitsNodes empty, it means the very
  // first child's offsetTop is >= availableHeight (edge case with large
  // top-padding) or the word-split returned null (single-word paragraph).
  if (fitsNodes.length === 0) {
    const firstChild = children[0];

    // Case A: multiple children — keep the first on the page, overflow the rest
    if (children.length > 1) {
      fitsNodes.push(firstChild.outerHTML);
      overflowNodes.shift(); // remove firstChild from overflow
      if (overflowNodes.length === 0) return null;
      return { fitsHtml: fitsNodes.join(""), overflowHtml: overflowNodes.join("") };
    }

    // Case B: single child — can't split (e.g. single very long word)
    return null;
  }

  return {
    fitsHtml: fitsNodes.join(""),
    overflowHtml: overflowNodes.join(""),
  };
}

// ── Props ────────────────────────────────────────────────────────────────────
export interface RichEditorRef {
  editor: Editor | null;
}

interface RichChapterEditorProps {
  initialContent: string;
  onUpdate: (html: string) => void;
  onEditorReady?: (editor: Editor) => void;
  onFocus?: (editor: Editor) => void;
  onSplitNeeded?: (fitsHtml: string, overflowHtml: string) => void;
  onHeightChange?: (scrollHeight: number) => void;
  fontFamily?: string;
  fontSize?: number;
  lineHeight?: string;
  textColor?: string;
  bgColor?: string;
  textAlign?: string;
  direction?: "ltr" | "rtl";
  placeholder?: string;
  minHeight?: number;
  fixedHeight?: number;
  zoom?: number;
  checkOverflowOnMount?: boolean;
}

const FONT_FAMILY_MAP: Record<string, string> = {
  "eb-garamond":       "'EB Garamond', serif",
  "cormorant":         "'Cormorant Garamond', serif",
  "libre-baskerville": "'Libre Baskerville', serif",
  "lora":              "'Lora', serif",
  "merriweather":      "'Merriweather', serif",
  "source-serif":      "'Source Serif 4', serif",
  "playfair":          "'Playfair Display', serif",
  "crimson":           "'Crimson Text', serif",
  "inter":             "'Inter', sans-serif",
  "open-sans":         "'Open Sans', sans-serif",
  "poppins":           "'Poppins', sans-serif",
  "montserrat":        "'Montserrat', sans-serif",
  "courier-prime":     "'Courier Prime', monospace",
  "special-elite":     "'Special Elite', cursive",
  "arabic-sans":       "'Cairo', sans-serif",
  "arabic-serif":      "'Amiri', serif",
  "arabic-naskh":      "'Noto Naskh Arabic', serif",
};

export const RichChapterEditor = forwardRef<RichEditorRef, RichChapterEditorProps>(({
  initialContent,
  onUpdate,
  onEditorReady,
  onFocus,
  onSplitNeeded,
  onHeightChange,
  fontFamily = "eb-garamond",
  fontSize = 16,
  lineHeight = "1.45",
  textColor,
  bgColor,
  textAlign = "left",
  direction = "ltr",
  placeholder,
  minHeight = 800,
  fixedHeight,
  zoom = 100,
  checkOverflowOnMount = false,
}, ref) => {
  // The two Arabic fonts (Cairo, Amiri) are bundled on the server so the
  // PDF embeds whichever the user picks and renders identically here.
  // For a Latin pick on Arabic content, default the Arabic glyphs to
  // Cairo (matches the PDF's default).
  const arabicFallback = "'Cairo', 'Amiri', 'Noto Naskh Arabic', serif";
  const resolvedFont = `${FONT_FAMILY_MAP[fontFamily] || "'EB Garamond', serif"}, ${arabicFallback}`;
  // When the book's chosen font IS an Arabic font, the user expects the
  // whole chapter to switch to it. Stored content can carry inline
  // font-family marks (from the toolbar or earlier defaults) that beat
  // the container font, which is why "pick a font, nothing changes".
  // Force the chosen Arabic font on the content with !important so the
  // selection always takes effect (only for Arabic picks, so Latin
  // books keep any intentional per-word fonts).
  const isArabicPick = fontFamily.startsWith("arabic-");
  const forcedArabicFont = fontFamily === "arabic-serif"
    ? "'Amiri', 'Noto Naskh Arabic', serif"
    : "'Cairo', 'Noto Naskh Arabic', sans-serif";

  // Use refs for callbacks to avoid stale closures in the RAF
  const onSplitNeededRef = useRef(onSplitNeeded);
  const onHeightChangeRef = useRef(onHeightChange);
  const fixedHeightRef = useRef(fixedHeight);
  useEffect(() => { onSplitNeededRef.current = onSplitNeeded; }, [onSplitNeeded]);
  useEffect(() => { onHeightChangeRef.current = onHeightChange; }, [onHeightChange]);
  useEffect(() => { fixedHeightRef.current = fixedHeight; }, [fixedHeight]);

  const overflowRafRef = useRef<number>(0);
  // Guard: prevent split from firing immediately after we just received new initialContent
  const suppressOverflowRef = useRef(false);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3] },
        bulletList: { keepMarks: true },
        orderedList: { keepMarks: true },
        underline: false,
        link: false,
        gapcursor: false,
      } as any),
      Underline,
      TextAlign.configure({ types: ["heading", "paragraph"] }),
      TextStyle,
      Color,
      FontFamily,
      FontSize,
      Highlight.configure({ multicolor: true }),
      Link.configure({
        openOnClick: false,
        // Force every editor-emitted link to open in a sandboxed tab — without
        // this, `target="_blank"` paired with no `rel` exposes window.opener
        // (tabnabbing). The sanitize.ts pipeline guards already-stored HTML;
        // this guards the live editor output.
        HTMLAttributes: {
          class: "tiptap-link",
          target: "_blank",
          rel: "noopener noreferrer",
        },
      }),
      ResizableImage,
    ],
    content: initialContent || "<p></p>",
    onUpdate: ({ editor }) => {
      const html = editor.getHTML();
      onUpdate(html);

      // Schedule DOM-height-based overflow check after paint
      cancelAnimationFrame(overflowRafRef.current);
      overflowRafRef.current = requestAnimationFrame(() => {
        if (suppressOverflowRef.current) return;
        const fh = fixedHeightRef.current;
        if (!fh) return;

        const proseMirror = editor.view.dom as HTMLElement;

        // Read padding values live from computed style so the calculation stays
        // correct no matter what CSS changes (font size, page size, zoom, etc.)
        const cs = window.getComputedStyle(proseMirror);
        const paddingBottom = parseFloat(cs.paddingBottom) || 0;

        // scrollHeight includes top-padding + content + bottom-padding.
        // Real overflow only occurs when scrollHeight exceeds the element's
        // rendered height (= fixedHeight when box-sizing:border-box).
        const contentH = proseMirror.scrollHeight;

        onHeightChangeRef.current?.(contentH);

        // Trigger a split only when there is genuine overflow (> 2px buffer for
        // sub-pixel rounding).  Using fh directly (not fh-96) avoids the
        // 44-px-too-early split that caused visible blank space at the bottom.
        if (contentH > fh + 2) {
          // Children's offsetTop is measured from ProseMirror's border edge,
          // which includes the top padding.  A child "fits" if its bottom edge
          // is still above the bottom padding boundary  (fh - paddingBottom).
          const available = fh - paddingBottom;
          const split = splitAtOverflow(proseMirror, available);
          if (split) {
            onSplitNeededRef.current?.(split.fitsHtml, split.overflowHtml);
            // After dispatching the split, the parent will hand back
            // shorter content. Reset the editor's internal scroll
            // position right away so this page does not render with its
            // top lines clipped — ProseMirror scrolls itself up to keep
            // the caret visible while content is in mid-overflow, and
            // that scroll persists across the setContent that follows.
            proseMirror.scrollTop = 0;
          }
        } else if (proseMirror.scrollTop !== 0) {
          // Content already fits but a previous scroll position is
          // still pinning the view below the top of the page. Snap
          // back to the top so the first line is always visible.
          proseMirror.scrollTop = 0;
        }
      });
    },
    onFocus: ({ editor }) => {
      if (onFocus) onFocus(editor);
    },
    editorProps: {
      attributes: {
        class: "tiptap-editor",
        spellcheck: "true",
      },
    },
  });

  useImperativeHandle(ref, () => ({ editor: editor ?? null }));

  useEffect(() => {
    if (editor && onEditorReady) onEditorReady(editor);
  }, [editor]);

  // ── Pin the editor's internal scroll to the top ──────────────────────────
  // Every page renders with overflow:hidden, but ProseMirror still scrolls
  // its own DOM up to keep the caret visible when content briefly exceeds
  // the page during typing or pasting. That scroll position persists across
  // the pagination split that follows, leaving the page rendered with its
  // first lines hidden behind the clip. Resetting scrollTop on every scroll
  // event keeps the page anchored at the top regardless of what triggered
  // the scroll.
  useEffect(() => {
    if (!editor || editor.isDestroyed) return;
    const pmDom = editor.view.dom as HTMLElement;
    const reset = () => { if (pmDom.scrollTop !== 0) pmDom.scrollTop = 0; };
    pmDom.addEventListener("scroll", reset, { passive: true });
    return () => pmDom.removeEventListener("scroll", reset);
  }, [editor]);

  // ── Initial overflow check on mount ──────────────────────────────────────
  // Only fires for pages freshly created by a user split (checkOverflowOnMount=true).
  // Pages loaded from saved content are already correctly sized by splitHtmlIntoPages
  // and must NOT trigger this, otherwise every page would cascade-split on load.
  const initialOverflowCheckedRef = useRef(false);
  useEffect(() => {
    if (!checkOverflowOnMount) return;
    if (!editor || initialOverflowCheckedRef.current) return;
    initialOverflowCheckedRef.current = true;

    const raf1 = requestAnimationFrame(() => {
      const raf2 = requestAnimationFrame(() => {
        if (suppressOverflowRef.current) return;
        const fh = fixedHeightRef.current;
        if (!fh) return;
        const proseMirror = editor.view.dom as HTMLElement;
        // Always pin the freshly mounted page at the top so its first
        // line is visible; whatever scroll position the editor was
        // born with is irrelevant.
        proseMirror.scrollTop = 0;
        const contentH = proseMirror.scrollHeight;
        if (contentH <= fh + 2) return;
        const cs = window.getComputedStyle(proseMirror);
        const paddingBottom = parseFloat(cs.paddingBottom) || 0;
        const available = fh - paddingBottom;
        const split = splitAtOverflow(proseMirror, available);
        if (split) {
          onSplitNeededRef.current?.(split.fitsHtml, split.overflowHtml);
        }
      });
      void raf2;
    });
    return () => cancelAnimationFrame(raf1);
  }, [editor]);

  // Sync content when initialContent changes externally (e.g. after a split/merge)
  const lastSyncedRef = useRef<string>("");
  useEffect(() => {
    if (!editor || editor.isDestroyed) return;
    if (initialContent && initialContent !== lastSyncedRef.current) {
      const current = editor.getHTML();
      if (current !== initialContent) {
        // Suppress overflow check right after a programmatic content change
        suppressOverflowRef.current = true;
        lastSyncedRef.current = initialContent;
        editor.commands.setContent(initialContent, { emitUpdate: false });
        // Reset internal scroll. Without this, a page whose content was
        // just shrunk by a split keeps its old (non-zero) scrollTop and
        // renders with the first line(s) hidden behind overflow:hidden.
        const pmDom = editor.view.dom as HTMLElement;
        pmDom.scrollTop = 0;
        // Re-enable after the next frame
        requestAnimationFrame(() => { suppressOverflowRef.current = false; });
      } else {
        lastSyncedRef.current = initialContent;
      }
    }
  }, [initialContent]);

  const scale = zoom / 100;

  return (
    <div
      style={{
        transformOrigin: "top center",
        transform: `scale(${scale})`,
        width: scale !== 1 ? `${100 / scale}%` : "100%",
      }}
    >
      <style>{`
        .tiptap-editor {
          font-family: ${resolvedFont};
          font-size: ${fontSize}px;
          line-height: ${lineHeight};
          color: ${textColor || "inherit"};
          background: ${bgColor || "transparent"};
          text-align: ${textAlign};
          direction: ${direction};
          ${fixedHeight
            ? `height: ${fixedHeight}px; overflow: hidden;`
            : `min-height: ${minHeight}px;`
          }
          padding: 48px 72px;
          outline: none;
          caret-color: currentColor;
          box-sizing: border-box;
        }
        ${isArabicPick ? `
        /* The book uses an Arabic font: force it across all content so
           the selection actually takes effect even over inline marks,
           and so the editor matches the embedded PDF font exactly. */
        .tiptap-editor .ProseMirror,
        .tiptap-editor .ProseMirror * {
          font-family: ${forcedArabicFont} !important;
        }` : ""}
        .tiptap-editor p {
          margin: 0 0 0.6em;
        }
        /* Make every block compute its own base direction from its text
           (Unicode bidi paragraph algorithm). Without this, pasted Arabic
           paragraphs inherit an LTR base and render reversed — punctuation
           and numbers jump to the wrong side. With plaintext, each block
           auto-detects RTL/LTR from its first strong character. */
        .tiptap-editor p,
        .tiptap-editor h1,
        .tiptap-editor h2,
        .tiptap-editor h3,
        .tiptap-editor li,
        .tiptap-editor blockquote {
          unicode-bidi: plaintext;
        }
        .tiptap-editor h1 {
          font-size: 2em;
          font-weight: 700;
          margin: 0.8em 0 0.4em;
          line-height: 1.2;
        }
        .tiptap-editor h2 {
          font-size: 1.5em;
          font-weight: 700;
          margin: 0.75em 0 0.35em;
          line-height: 1.25;
        }
        .tiptap-editor h3 {
          font-size: 1.25em;
          font-weight: 600;
          margin: 0.7em 0 0.3em;
          line-height: 1.3;
        }
        .tiptap-editor ul, .tiptap-editor ol {
          padding-left: 1.5em;
          margin: 0.5em 0;
        }
        .tiptap-editor li { margin: 0.2em 0; }
        .tiptap-editor a.tiptap-link {
          color: #2563eb;
          text-decoration: underline;
          cursor: pointer;
        }
        .tiptap-editor mark {
          background: #fef08a;
          border-radius: 2px;
          padding: 0 1px;
        }
        .tiptap-editor blockquote {
          border-left: 3px solid #d1d5db;
          padding-left: 1em;
          margin-left: 0;
          color: #6b7280;
          font-style: italic;
        }
        .tiptap-editor code {
          font-family: 'Courier Prime', monospace;
          font-size: 0.9em;
          background: rgba(0,0,0,0.06);
          padding: 0 3px;
          border-radius: 3px;
        }
        .tiptap-editor p.is-empty::before {
          content: attr(data-placeholder);
          color: rgba(0,0,0,0.22);
          pointer-events: none;
          float: ${direction === "rtl" ? "right" : "left"};
          height: 0;
        }
        .tiptap-editor:focus { outline: none; }
        .tiptap-editor .ProseMirror { position: relative; }
        .tiptap-editor img {
          max-width: 100%;
          height: auto;
          border-radius: 4px;
          display: block;
          margin: 12px auto;
          cursor: default;
        }
        .tiptap-editor img.ProseMirror-selectednode {
          outline: 2px solid #7c6af7;
          outline-offset: 2px;
        }
      `}</style>
      <EditorContent
        editor={editor}
        data-placeholder={placeholder}
      />
    </div>
  );
});

RichChapterEditor.displayName = "RichChapterEditor";
