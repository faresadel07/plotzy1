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
    /**
     * Project-local namespace for our custom FontSize extension.
     *
     * NOT named `fontSize` because @tiptap/extension-text-style@3.22+
     * also declares Commands<R>['fontSize'] with its own inline object
     * type ({ setFontSize: (string) => R, unsetFontSize: () => R }).
     * TypeScript treats two same-key declarations of object-type values
     * as a silent conflict (one wins, no merge), and the library's wins.
     * Using a distinct key (`fontSizePx`) sidesteps the conflict and
     * keeps both type sets visible.
     *
     * The runtime command our local extension registers IS named
     * `setFontSizePx` (also renamed from `setFontSize` for the same
     * reason — we don't want users of `editor.chain()` to think they're
     * calling the library's string-typed command).
     */
    fontSizePx: {
      /** Set the inline font-size (in px) on the current selection. */
      setFontSizePx: (size: number) => ReturnType;
      /** Remove any inline font-size attribute on the current selection. */
      unsetFontSizePx: () => ReturnType;
    };
  }
}
