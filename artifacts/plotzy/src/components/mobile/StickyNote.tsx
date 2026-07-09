// A small yellow sticky note (Faris's photo, keyed to transparency)
// pinned at the site's edges with one very short handwritten line.
// Decorative: it never captures taps and never covers real copy.

import { HAND_EN, HAND_AR } from "./fonts";

export function StickyNote({
  ar, text, size = 96, rot = 0, style,
}: { ar: boolean; text: string; size?: number; rot?: number; style?: React.CSSProperties }) {
  return (
    <div
      aria-hidden
      style={{
        width: size,
        height: size * 1.12,
        backgroundImage: "url(/images/sticky-note.png)",
        backgroundSize: "100% 100%",
        backgroundRepeat: "no-repeat",
        transform: `rotate(${rot}deg)`,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        // Pixel padding on purpose: percentage padding on an absolutely
        // positioned note resolves against the page container, not the
        // note itself, and blows the note up.
        padding: `${size * 0.2}px ${size * 0.1}px ${size * 0.08}px`,
        filter: "drop-shadow(0 5px 9px rgba(41,33,21,0.16))",
        pointerEvents: "none",
        userSelect: "none",
        ...style,
      }}
    >
      <span
        style={{
          fontFamily: ar ? HAND_AR : HAND_EN,
          fontSize: ar ? size * 0.16 : size * 0.2,
          fontWeight: 700,
          color: "#5f4d1c",
          textAlign: "center",
          lineHeight: 1.35,
          transform: "rotate(-1.5deg)",
        }}
      >
        {text}
      </span>
    </div>
  );
}
