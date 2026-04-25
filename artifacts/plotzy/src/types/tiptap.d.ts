// Module augmentation that teaches TipTap about the custom commands we
// register via Extension.create — primarily the FontSize extension
// declared inside RichChapterEditor.tsx and article-editor.tsx. Without
// this, every call site ends up as `(editor.chain() as any).setFontSize(…)`
// which silently breaks if a TipTap upgrade ever renames or removes the
// underlying chain method. With the augmentation, those calls type-
// check end-to-end.

import "@tiptap/core";

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    fontSize: {
      /** Set the inline font-size (in px) on the current selection. */
      setFontSize: (size: number) => ReturnType;
      /** Remove any inline font-size attribute on the current selection. */
      unsetFontSize: () => ReturnType;
    };
  }
}
