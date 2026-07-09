// First-open ritual, Faris's idea from the Sudowrite crumpled balls:
// the home loads under a pile of overlapping paper slips, each holding
// one line that matters (why read, why write, what Plotzy is). The
// visitor drags each slip away with a finger; flinging the last one
// reveals the tidy page beneath. Happens once, then a localStorage
// flag keeps the page clean on every later visit.

import { useEffect, useRef, useState } from "react";
import { SERIF_EN, SERIF_AR, HAND_EN, HAND_AR } from "./fonts";

const DONE_KEY = "plotzy-pile-cleared";

interface Slip {
  id: number;
  text: string;
  top: string;
  side: number; // % from inline-start
  rot: number;
  w: number;
  texture?: boolean;
}

const LINES_AR = [
  "لماذا نقرأ؟ لأن حياة واحدة لا تكفي.",
  "ولماذا نكتب؟ لأن في داخلك قصة لن يرويها أحد غيرك.",
  "بلوتزي استوديو كتابة كامل: محرر، مساعد ذكي، غلاف، ونشر.",
  "19 ألف كتاب مسموع ومكتبة عربية كاملة، ببلاش.",
  "كورس من 32 درساً يمشي معك من الفكرة حتى الكتاب.",
  "اسحب هذه الأوراق، وابدأ صفحتك النظيفة.",
];

const LINES_EN = [
  "Why do we read? Because one life is not enough.",
  "And why write? Because you carry a story no one else can tell.",
  "Plotzy is a full writing studio: editor, AI partner, covers, publishing.",
  "19,000 audiobooks and a full Arabic library, free.",
  "A 32 lesson course walks you from idea to book.",
  "Drag these papers away and start your clean page.",
];

const LAYOUT: Omit<Slip, "id" | "text">[] = [
  { top: "6%", side: -6, rot: -7, w: 78 },
  { top: "17%", side: 24, rot: 5, w: 74, texture: true },
  { top: "31%", side: -2, rot: -3, w: 82 },
  { top: "45%", side: 18, rot: 6, w: 76 },
  { top: "59%", side: -8, rot: -5, w: 80, texture: true },
  { top: "72%", side: 12, rot: 3, w: 78 },
];

export function PaperPile({ ar }: { ar: boolean }) {
  const [slips, setSlips] = useState<Slip[] | null>(null);
  const [flung, setFlung] = useState<Record<number, { dx: number; dy: number }>>({});
  const dragRef = useRef<{ id: number; sx: number; sy: number; el: HTMLElement } | null>(null);

  useEffect(() => {
    try {
      if (localStorage.getItem(DONE_KEY)) return;
    } catch { return; }
    const lines = ar ? LINES_AR : LINES_EN;
    setSlips(LAYOUT.map((l, i) => ({ ...l, id: i, text: lines[i] })));
    // Freeze the page behind the ritual.
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = prev; };
  }, [ar]);

  if (!slips) return null;

  const remaining = slips.filter((s) => !(s.id in flung));

  const finish = () => {
    try { localStorage.setItem(DONE_KEY, "1"); } catch { /* private mode */ }
    document.body.style.overflow = "";
    setSlips(null);
  };

  const fling = (id: number, dx: number, dy: number) => {
    // Normalize to a strong off-screen throw in the drag direction.
    const mag = Math.max(1, Math.hypot(dx, dy));
    const fx = (dx / mag) * 720;
    const fy = (dy / mag) * 720;
    setFlung((f) => {
      const next = { ...f, [id]: { dx: fx, dy: fy } };
      if (Object.keys(next).length >= slips.length) setTimeout(finish, 380);
      return next;
    });
  };

  const onPointerDown = (e: React.PointerEvent, id: number) => {
    const el = e.currentTarget as HTMLElement;
    el.setPointerCapture?.(e.pointerId);
    dragRef.current = { id, sx: e.clientX, sy: e.clientY, el };
    el.style.transition = "none";
    el.style.cursor = "grabbing";
  };

  const onPointerMove = (e: React.PointerEvent) => {
    const d = dragRef.current;
    if (!d) return;
    const dx = e.clientX - d.sx;
    const dy = e.clientY - d.sy;
    d.el.style.translate = `${dx}px ${dy}px`;
  };

  const onPointerUp = (e: React.PointerEvent) => {
    const d = dragRef.current;
    if (!d) return;
    dragRef.current = null;
    const dx = e.clientX - d.sx;
    const dy = e.clientY - d.sy;
    d.el.style.transition = "";
    d.el.style.cursor = "";
    if (Math.hypot(dx, dy) > 56) {
      fling(d.id, dx, dy);
    } else {
      d.el.style.translate = "0px 0px";
    }
  };

  return (
    <div
      dir={ar ? "rtl" : "ltr"}
      style={{ position: "fixed", inset: 0, zIndex: 95, overflow: "hidden", touchAction: "none" }}
      aria-label={ar ? "أوراق ترحيبية، اسحبها لتبدأ" : "Welcome papers, drag them away to begin"}
    >
      {/* A whisper of dimming so the slips read as ON TOP of the page */}
      <div aria-hidden style={{ position: "absolute", inset: 0, background: "rgba(41,33,21,0.14)", backdropFilter: "blur(1.5px)" }} />

      {slips.map((s, i) => {
        const gone = flung[s.id];
        return (
          <div
            key={s.id}
            onPointerDown={(e) => onPointerDown(e, s.id)}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerCancel={onPointerUp}
            style={{
              position: "absolute",
              top: s.top,
              insetInlineStart: `${s.side}%`,
              width: `${s.w}%`,
              maxWidth: 360,
              padding: "20px 22px",
              background: s.texture ? "url(/images/crumpled-paper.jpg) center / cover" : "#fffdf7",
              border: "1px solid rgba(66,53,33,0.16)",
              borderRadius: 6,
              boxShadow: "0 18px 40px -12px rgba(41,33,21,0.45)",
              rotate: `${s.rot}deg`,
              zIndex: 10 + i,
              cursor: "grab",
              userSelect: "none",
              fontFamily: ar ? SERIF_AR : SERIF_EN,
              fontSize: ar ? 16.5 : 17,
              lineHeight: 1.7,
              color: "#2f2618",
              transition: "translate 340ms cubic-bezier(0.22, 1, 0.36, 1), opacity 300ms ease",
              translate: gone ? `${gone.dx}px ${gone.dy}px` : "0px 0px",
              opacity: gone ? 0 : 1,
              pointerEvents: gone ? "none" : "auto",
            }}
          >
            {s.text}
            {/* Drag hint on the topmost remaining slip */}
            {remaining[remaining.length - 1]?.id === s.id && (
              <div style={{ fontFamily: ar ? HAND_AR : HAND_EN, fontSize: ar ? 13 : 16, color: "#8a8070", marginTop: 8, textAlign: ar ? "left" : "right" }}>
                {ar ? "(اسحبني بإصبعك)" : "(drag me away)"}
              </div>
            )}
          </div>
        );
      })}

      {/* Quiet escape hatch */}
      <button
        onClick={finish}
        style={{
          position: "absolute",
          bottom: "calc(env(safe-area-inset-bottom, 0px) + 14px)",
          insetInlineEnd: 16,
          background: "rgba(41,33,21,0.7)",
          color: "#f7f2e4",
          border: "1px solid rgba(244,239,226,0.2)",
          borderRadius: 999,
          padding: "8px 16px",
          fontSize: 12.5,
          fontWeight: 600,
          cursor: "pointer",
          fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Text", sans-serif',
        }}
      >
        {ar ? "تخطّي" : "Skip"}
      </button>
    </div>
  );
}
