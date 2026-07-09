// One small sticky note per course page (Faris's ask): pinned at the
// top end of the content column, takes no layout height, never covers
// copy. Reads the language itself so pages don't need lang plumbing.

import { useLanguage } from "@/contexts/language-context";
import { StickyNote } from "@/components/mobile/StickyNote";

export function CourseSticky({ text, textAr, rot = 6 }: { text: string; textAr: string; rot?: number }) {
  const { lang } = useLanguage();
  const ar = lang === "ar";
  return (
    <div aria-hidden style={{ display: "flex", justifyContent: "flex-end", height: 0, overflow: "visible", position: "relative", zIndex: 5 }}>
      <StickyNote ar={ar} size={88} rot={rot} text={ar ? textAr : text} style={{ transform: `translateY(-10px) rotate(${rot}deg)` }} />
    </div>
  );
}
