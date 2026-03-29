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

// ── Props ────────────────────────────────────────────────────────────────────
export interface RichEditorRef {
  editor: Editor | null;
}

interface RichChapterEditorProps {
  initialContent: string;
  onUpdate: (html: string) => void;
  onEditorReady?: (editor: Editor) => void;
  fontFamily?: string;
  fontSize?: number;
  lineHeight?: string;
  textColor?: string;
  bgColor?: string;
  textAlign?: string;
  direction?: "ltr" | "rtl";
  placeholder?: string;
  minHeight?: number;
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
  fontFamily = "eb-garamond",
  fontSize = 18,
  lineHeight = "1.85",
  textColor,
  bgColor,
  textAlign = "left",
  direction = "ltr",
  placeholder,
  minHeight = 800,
  zoom = 100,
}, ref) => {
  const resolvedFont = FONT_FAMILY_MAP[fontFamily] || "'EB Garamond', serif";

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3] },
        bulletList: { keepMarks: true },
        orderedList: { keepMarks: true },
        // Prevent duplication with separately added extensions
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
      onUpdate(editor.getHTML());
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

  // Sync content only when the chapter changes externally (not on every keystroke)
  // We track the last initialContent we set to avoid resetting on normal typing
  const lastSyncedRef = useRef<string>("");
  useEffect(() => {
    if (!editor || editor.isDestroyed) return;
    // Only sync if the initialContent changed AND it's different from what we last set
    if (initialContent && initialContent !== lastSyncedRef.current) {
      const current = editor.getHTML();
      // If current matches what the editor produced natively, skip (it was a local change)
      if (current !== initialContent) {
        lastSyncedRef.current = initialContent;
        editor.commands.setContent(initialContent, false);
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
          min-height: ${minHeight}px;
          padding: 48px 72px;
          outline: none;
          caret-color: currentColor;
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
      `}</style>
      <EditorContent
        editor={editor}
        data-placeholder={placeholder}
      />
    </div>
  );
});

RichChapterEditor.displayName = "RichChapterEditor";
