import React, { useState, useRef, useCallback, forwardRef } from "react";
import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// ─── Types ─────────────────────────────────────────────────────────────────

export interface FeatureCard {
  id: string;
  icon: string;
  headline: string;
  sub: string;
}

export interface FolderData {
  title: string;
  subtitle: string;
  cards: FeatureCard[];
}

// ─── Parchment palette ─────────────────────────────────────────────────────

const PARCH_FRONT  = "#F2ECD8";
const PARCH_BACK   = "#E6DFC5";
const PARCH_TAB    = "#DDD6BE";
const PARCH_TEXT   = "#5a4e3a";
const PARCH_FAINT  = "#9e8f79";
const PARCH_LINE   = "rgba(90,78,58,0.18)";
const PARCH_BORDER = "rgba(110,96,72,0.22)";

// ─── Text-lines mini card (fanned inside folder) ───────────────────────────

interface MiniCardProps {
  card: FeatureCard;
  index: number;
  total: number;
  isVisible: boolean;
  isSelected: boolean;
  onClick: () => void;
}

// Widths for each text line row — simulates written text on parchment
const LINE_ROWS = [
  [72],           // title line (full)
  [40, 26],       // two words
  [55, 18],
  [30, 42],
  [62],
  [20, 46],
  [38, 30],
  [50],
];

const MiniCard = forwardRef<HTMLDivElement, MiniCardProps>(
  ({ card, index, total, isVisible, isSelected, onClick }, ref) => {
    const mid      = (total - 1) / 2;
    const factor   = total > 1 ? (index - mid) / mid : 0;
    const rotation = factor * 24;
    const txX      = factor * 90;
    const txY      = Math.abs(factor) * 12;

    return (
      <div
        ref={ref}
        onClick={(e) => { e.stopPropagation(); onClick(); }}
        className="absolute cursor-pointer group/mini"
        style={{
          width: 88, height: 114,
          left: -44, top: -57,
          zIndex: 10 + index,
          transform: isVisible
            ? `translateY(calc(-114px + ${txY}px)) translateX(${txX}px) rotate(${rotation}deg) scale(1)`
            : "translateY(0) translateX(0) rotate(0deg) scale(0.4)",
          opacity: isSelected ? 0 : isVisible ? 1 : 0,
          transition: `all 700ms cubic-bezier(0.16, 1, 0.3, 1) ${index * 60}ms`,
        }}
      >
        {/* Card face */}
        <div
          className="w-full h-full rounded-lg shadow-lg border relative overflow-hidden transition-all duration-500 group-hover/mini:-translate-y-5 group-hover/mini:shadow-2xl group-hover/mini:scale-[1.2] group-hover/mini:ring-2"
          style={{
            background: `linear-gradient(160deg, ${PARCH_FRONT} 0%, ${PARCH_BACK} 100%)`,
            borderColor: PARCH_BORDER,
          }}
        >
          {/* Top gloss */}
          <div className="absolute inset-0 pointer-events-none" style={{ background: "linear-gradient(135deg, rgba(255,255,255,0.3) 0%, transparent 55%)" }} />

          {/* Ruled lines area */}
          <div className="absolute inset-0 flex flex-col justify-start px-[8px] pt-[10px] gap-[5px]">
            {LINE_ROWS.map((segs, row) => (
              <div key={row} className="flex gap-[4px] items-center">
                {segs.map((pct, s) => (
                  <div
                    key={s}
                    style={{
                      height: row === 0 ? 4 : 2.5,
                      width: `${pct}%`,
                      borderRadius: 2,
                      background: row === 0
                        ? PARCH_TEXT + "bb"
                        : PARCH_LINE,
                      flexShrink: 0,
                    }}
                  />
                ))}
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }
);
MiniCard.displayName = "MiniCard";

// ─── Detail overlay panel ───────────────────────────────────────────────────

interface DetailPanelProps {
  folder: FolderData;
  cardIndex: number;
  isOpen: boolean;
  onClose: () => void;
  onNavigate: (i: number) => void;
}

const DetailPanel: React.FC<DetailPanelProps> = ({ folder, cardIndex, isOpen, onClose, onNavigate }) => {
  if (!isOpen) return null;
  const card = folder.cards[cardIndex];
  if (!card) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-6"
      onClick={onClose}
      style={{ background: "rgba(0,0,0,0.72)", backdropFilter: "blur(14px)", animation: "dp-fade 0.3s ease" }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative rounded-3xl shadow-2xl max-w-md w-full"
        style={{
          background: `linear-gradient(150deg, ${PARCH_FRONT}, ${PARCH_BACK})`,
          border: `1px solid ${PARCH_BORDER}`,
          padding: "44px 40px",
          animation: "dp-up 0.4s cubic-bezier(0.16,1,0.3,1)",
        }}
      >
        <div className="absolute inset-0 rounded-3xl pointer-events-none" style={{ background: "linear-gradient(135deg, rgba(255,255,255,0.28) 0%, transparent 50%)" }} />

        <div className="text-center mb-6 relative z-10">
          <h3 style={{ fontFamily: "Georgia, 'Times New Roman', serif", fontSize: "1.35rem", fontWeight: 700, color: PARCH_TEXT, lineHeight: 1.25, letterSpacing: "-0.01em", marginBottom: 14 }}>
            {card.headline}
          </h3>
          <div style={{ width: 40, height: 1.5, background: PARCH_FAINT + "66", margin: "0 auto 14px" }} />
          <p style={{ fontFamily: "Georgia, serif", fontSize: "0.92rem", color: PARCH_FAINT, lineHeight: 1.7 }}>
            {card.sub}
          </p>
        </div>

        {/* Navigation dots */}
        <div className="flex items-center justify-center gap-2 mt-6 relative z-10">
          {folder.cards.map((_, i) => (
            <button
              key={i}
              onClick={() => onNavigate(i)}
              style={{
                width: i === cardIndex ? 22 : 7, height: 7,
                borderRadius: 4,
                background: i === cardIndex ? PARCH_TEXT : PARCH_FAINT + "44",
                border: "none",
                transition: "all 0.3s",
                cursor: "pointer",
              }}
            />
          ))}
        </div>

        <button
          onClick={onClose}
          style={{ position: "absolute", top: 16, right: 16, width: 32, height: 32, borderRadius: "50%", background: PARCH_BACK, border: `1px solid ${PARCH_BORDER}`, cursor: "pointer", fontSize: 13, color: PARCH_FAINT, display: "flex", alignItems: "center", justifyContent: "center" }}
        >
          ✕
        </button>
      </div>
      <style>{`
        @keyframes dp-fade { from{opacity:0} to{opacity:1} }
        @keyframes dp-up   { from{opacity:0;transform:scale(0.88) translateY(24px)} to{opacity:1;transform:scale(1) translateY(0)} }
      `}</style>
    </div>
  );
};

// ─── Animated Folder ────────────────────────────────────────────────────────

interface AnimatedFolderProps {
  folder: FolderData;
  className?: string;
}

export const AnimatedFolder: React.FC<AnimatedFolderProps> = ({ folder, className }) => {
  const [hovered, setHovered]         = useState(false);
  const [selectedIdx, setSelectedIdx] = useState<number | null>(null);
  const [hiddenId, setHiddenId]       = useState<string | null>(null);
  const cardRefs = useRef<(HTMLDivElement | null)[]>([]);

  const handleCardClick = useCallback((idx: number) => {
    setSelectedIdx(idx);
    setHiddenId(folder.cards[idx].id);
  }, [folder.cards]);

  const handleClose = useCallback(() => {
    setSelectedIdx(null);
    setHiddenId(null);
  }, []);

  const handleNavigate = useCallback((i: number) => {
    setSelectedIdx(i);
    setHiddenId(folder.cards[i].id);
  }, [folder.cards]);

  // Folder panel dimensions — larger than before
  const FW = 200; // front/back width  (px)
  const FH = 154; // front/back height (px)
  const tabW = 70;
  const tabH = 22;

  return (
    <>
      {/* No box — just the folder + label floating on the dark bg */}
      <div
        className={cn("relative flex flex-col items-center justify-center cursor-pointer", className)}
        style={{
          padding: "48px 32px 32px",
          perspective: "1200px",
          transform: hovered ? "scale(1.06) translateY(-6px)" : "scale(1) translateY(0)",
          transition: "transform 700ms cubic-bezier(0.16,1,0.3,1)",
        }}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
      >
        {/* Soft parchment glow under folder */}
        <div
          className="absolute pointer-events-none transition-opacity duration-700"
          style={{
            width: FW + 80, height: FH + 40,
            bottom: 90,
            left: "50%",
            transform: "translateX(-50%)",
            background: `radial-gradient(ellipse at 50% 100%, ${PARCH_BACK}55 0%, transparent 70%)`,
            opacity: hovered ? 1 : 0,
            filter: "blur(12px)",
          }}
        />

        {/* ── Folder body ── */}
        <div
          className="relative flex items-center justify-center mb-8"
          style={{ height: FH + 60, width: FW + 80 }}
        >
          {/* Tab */}
          <div
            style={{
              position: "absolute",
              width: tabW, height: tabH,
              borderRadius: "6px 6px 0 0",
              background: PARCH_TAB,
              border: `1px solid ${PARCH_BORDER}`,
              borderBottom: "none",
              top: `calc(50% - ${FH / 2}px - ${tabH}px + 2px)`,
              left: `calc(50% - ${FW / 2}px + 18px)`,
              transformOrigin: "bottom center",
              transform: hovered ? "rotateX(-28deg) translateY(-2px)" : "rotateX(0deg)",
              transition: "transform 700ms cubic-bezier(0.16,1,0.3,1)",
              zIndex: 8,
            }}
          />

          {/* Back panel */}
          <div
            style={{
              position: "absolute",
              width: FW, height: FH,
              borderRadius: 14,
              background: `linear-gradient(140deg, ${PARCH_BACK}, ${PARCH_TAB})`,
              border: `1px solid ${PARCH_BORDER}`,
              boxShadow: "0 6px 24px rgba(0,0,0,0.28)",
              transformOrigin: "bottom center",
              transform: hovered ? "rotateX(-20deg) scaleY(1.06)" : "rotateX(0deg) scaleY(1)",
              transition: "transform 700ms cubic-bezier(0.16,1,0.3,1)",
              zIndex: 10,
            }}
          />

          {/* Mini cards — fanned out on hover */}
          <div style={{ position: "absolute", top: "50%", left: "50%", zIndex: 20 }}>
            {folder.cards.map((card, i) => (
              <MiniCard
                key={card.id}
                ref={(el) => { cardRefs.current[i] = el; }}
                card={card}
                index={i}
                total={folder.cards.length}
                isVisible={hovered}
                isSelected={hiddenId === card.id}
                onClick={() => handleCardClick(i)}
              />
            ))}
          </div>

          {/* Front panel */}
          <div
            style={{
              position: "absolute",
              width: FW, height: FH,
              borderRadius: 14,
              background: `linear-gradient(140deg, ${PARCH_FRONT}, ${PARCH_BACK})`,
              border: `1px solid ${PARCH_BORDER}`,
              boxShadow: "0 12px 32px rgba(0,0,0,0.35)",
              top: `calc(50% - ${FH / 2}px + 4px)`,
              transformOrigin: "bottom center",
              transform: hovered ? "rotateX(34deg) translateY(14px)" : "rotateX(0deg) translateY(0)",
              transition: "transform 700ms cubic-bezier(0.16,1,0.3,1)",
              zIndex: 30,
            }}
          />

          {/* Gloss on front */}
          <div
            style={{
              position: "absolute",
              width: FW, height: FH,
              borderRadius: 14,
              background: "linear-gradient(135deg, rgba(255,255,255,0.36) 0%, transparent 52%)",
              top: `calc(50% - ${FH / 2}px + 4px)`,
              transformOrigin: "bottom center",
              transform: hovered ? "rotateX(34deg) translateY(14px)" : "rotateX(0deg) translateY(0)",
              transition: "transform 700ms cubic-bezier(0.16,1,0.3,1)",
              zIndex: 31,
              pointerEvents: "none",
            }}
          />
        </div>

        {/* ── Label ── */}
        <div className="text-center z-10">
          <h3
            style={{
              fontFamily: "Georgia, 'Times New Roman', serif",
              fontSize: "1.2rem", fontWeight: 700,
              color: "rgba(255,255,255,0.9)",
              letterSpacing: "-0.01em",
              marginBottom: 5,
              transition: "transform 500ms",
              transform: hovered ? "translateY(3px)" : "translateY(0)",
            }}
          >
            {folder.title}
          </h3>
          <p style={{ fontSize: "0.78rem", color: "rgba(255,255,255,0.32)", fontFamily: "-apple-system, sans-serif" }}>
            {folder.subtitle}
          </p>
        </div>
      </div>

      <DetailPanel
        folder={folder}
        cardIndex={selectedIdx ?? 0}
        isOpen={selectedIdx !== null}
        onClose={handleClose}
        onNavigate={handleNavigate}
      />
    </>
  );
};
