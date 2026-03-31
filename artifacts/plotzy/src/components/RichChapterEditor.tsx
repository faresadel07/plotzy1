import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Underline from "@tiptap/extension-underline";
import TextAlign from "@tiptap/extension-text-align";
import { TextStyle } from "@tiptap/extension-text-style";
import Color from "@tiptap/extension-color";
import FontFamily from "@tiptap/extension-font-family";
import Highlight from "@tiptap/extension-highlight";
import Link from "@tiptap/extension-link";
import { Extension } from "@tiptap/core";
import { useEffect, useRef, forwardRef, useImperativeHandle } from "react";
import type { Editor } from "@tiptap/react";

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
      setFontSize: (size: number) => ({ chain }: { chain: any }) =>
        chain().setMark("textStyle", { fontSize: size }).run(),
      unsetFontSize: () => ({ chain }: { chain: any }) =>
        chain().setMark("textStyle", { fontSize: null }).run(),
    } as any;
  },
});

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
      overflowStarted = true;
      overflowNodes.push(child.outerHTML);
    }
  }

  if (overflowNodes.length === 0) return null;

  return {
    fitsHtml: fitsNodes.length > 0 ? fitsNodes.join("") : "<p></p>",
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
}, ref) => {
  const resolvedFont = FONT_FAMILY_MAP[fontFamily] || "'EB Garamond', serif";

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
      } as any),
      Underline,
      TextAlign.configure({ types: ["heading", "paragraph"] }),
      TextStyle,
      Color,
      FontFamily,
      FontSize,
      Highlight.configure({ multicolor: true }),
      Link.configure({ openOnClick: false, HTMLAttributes: { class: "tiptap-link" } }),
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
        // Available text height = fixedHeight minus the 48px top + 48px bottom padding
        const available = fh - 96;
        const contentH = proseMirror.scrollHeight;

        onHeightChangeRef.current?.(contentH);

        if (contentH > available + 2) {
          const split = splitAtOverflow(proseMirror, available);
          if (split) {
            onSplitNeededRef.current?.(split.fitsHtml, split.overflowHtml);
          }
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
        editor.commands.setContent(initialContent, false);
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
        .tiptap-editor p {
          margin: 0 0 0.6em;
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
          float: left;
          height: 0;
        }
        .tiptap-editor:focus { outline: none; }
        .tiptap-editor .ProseMirror { position: relative; }
      `}</style>
      <EditorContent
        editor={editor}
        data-placeholder={placeholder}
      />
    </div>
  );
});

RichChapterEditor.displayName = "RichChapterEditor";
