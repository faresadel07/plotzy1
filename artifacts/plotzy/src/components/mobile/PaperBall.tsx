// The crumpled paper ball sticker Faris sent, scattered around the
// home as a quiet running joke (drafts happen). Decorative only.

export function PaperBall({ size = 56, rot = 0, style }: { size?: number; rot?: number; style?: React.CSSProperties }) {
  return (
    <img
      src="/images/paper-ball.png"
      alt=""
      aria-hidden
      loading="lazy"
      style={{
        width: size,
        height: "auto",
        transform: `rotate(${rot}deg)`,
        filter: "drop-shadow(0 6px 10px rgba(41,33,21,0.28))",
        pointerEvents: "none",
        userSelect: "none",
        ...style,
      }}
    />
  );
}
