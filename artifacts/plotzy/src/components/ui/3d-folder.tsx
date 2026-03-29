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
const PARCH_BORDER = "rgba(110,96,72,0.22)";

// ─── Mini feature card (fanned inside folder) ──────────────────────────────

interface MiniCardProps {
  card: FeatureCard;
  index: number;
  total: number;
  isVisible: boolean;
  isSelected: boolean;
  onClick: () => void;
}

const MiniCard = forwardRef<HTMLDivElement, MiniCardProps>(
  ({ card, index, total, isVisible, isSelected, onClick }, ref) => {
    const mid    = (total - 1) / 2;
    const factor = total > 1 ? (index - mid) / mid : 0;

    const rotation    = factor * 22;
    const translationX = factor * 72;
    const translationY = Math.abs(factor) * 10;

    return (
      <div
        ref={ref}
        onClick={(e) => { e.stopPropagation(); onClick(); }}
        className="absolute cursor-pointer group/mini"
        style={{
          width: 68, height: 88,
          left: -34, top: -44,
          zIndex: 10 + index,
          transform: isVisible
            ? `translateY(calc(-88px + ${translationY}px)) translateX(${translationX}px) rotate(${rotation}deg) scale(1)`
            : "translateY(0) translateX(0) rotate(0deg) scale(0.4)",
          opacity: isSelected ? 0 : isVisible ? 1 : 0,
          transition: `all 700ms cubic-bezier(0.16, 1, 0.3, 1) ${index * 60}ms`,
        }}
      >
        <div
          className="w-full h-full rounded-xl shadow-lg relative overflow-hidden border transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover/mini:-translate-y-5 group-hover/mini:shadow-2xl group-hover/mini:scale-[1.22] group-hover/mini:ring-2"
          style={{
            background: `linear-gradient(150deg, ${PARCH_FRONT}, ${PARCH_BACK})`,
            borderColor: PARCH_BORDER,
          }}
        >
          <div className="absolute inset-0" style={{ background: "linear-gradient(135deg, rgba(255,255,255,0.25) 0%, transparent 55%)" }} />
          <div className="absolute inset-0 flex flex-col items-center justify-center px-2 text-center gap-1">
            <span style={{ fontSize: 18, lineHeight: 1 }}>{card.icon}</span>
            <p style={{ fontFamily: "Georgia, serif", fontSize: "6.5px", fontWeight: 700, color: PARCH_TEXT, lineHeight: 1.25, letterSpacing: "0.01em" }}>
              {card.headline}
            </p>
          </div>
        </div>
      </div>
    );
  }
);
MiniCard.displayName = "MiniCard";

// ─── Full-detail overlay panel ──────────────────────────────────────────────

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
      style={{ background: "rgba(0,0,0,0.7)", backdropFilter: "blur(12px)", animation: "dp-fade 0.3s ease" }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative rounded-3xl shadow-2xl max-w-md w-full"
        style={{
          background: `linear-gradient(150deg, ${PARCH_FRONT}, ${PARCH_BACK})`,
          border: `1px solid ${PARCH_BORDER}`,
          padding: "40px 36px",
          animation: "dp-up 0.4s cubic-bezier(0.16,1,0.3,1)",
        }}
      >
        <div className="absolute inset-0 rounded-3xl" style={{ background: "linear-gradient(135deg, rgba(255,255,255,0.3) 0%, transparent 50%)", pointerEvents: "none" }} />
        <div className="text-center mb-6">
          <div style={{ fontSize: 40, marginBottom: 12 }}>{card.icon}</div>
          <h3 style={{ fontFamily: "Georgia, 'Times New Roman', serif", fontSize: "1.35rem", fontWeight: 700, color: PARCH_TEXT, lineHeight: 1.25, letterSpacing: "-0.01em" }}>
            {card.headline}
          </h3>
          <p style={{ fontFamily: "Georgia, serif", fontSize: "0.92rem", color: PARCH_FAINT, lineHeight: 1.65, marginTop: 12 }}>
            {card.sub}
          </p>
        </div>

        {/* Navigation dots */}
        <div className="flex items-center justify-center gap-2 mt-4">
          {folder.cards.map((_, i) => (
            <button
              key={i}
              onClick={() => onNavigate(i)}
              style={{
                width: i === cardIndex ? 20 : 7,
                height: 7,
                borderRadius: 4,
                background: i === cardIndex ? PARCH_TEXT : PARCH_FAINT + "55",
                border: "none",
                transition: "all 0.3s",
                cursor: "pointer",
              }}
            />
          ))}
        </div>

        <button
          onClick={onClose}
          style={{ position: "absolute", top: 16, right: 16, width: 32, height: 32, borderRadius: "50%", background: PARCH_BACK, border: `1px solid ${PARCH_BORDER}`, cursor: "pointer", fontSize: 14, color: PARCH_FAINT, display: "flex", alignItems: "center", justifyContent: "center" }}
        >
          ✕
        </button>
      </div>

      <style>{`
        @keyframes dp-fade { from{opacity:0} to{opacity:1} }
        @keyframes dp-up   { from{opacity:0;transform:scale(0.9) translateY(20px)} to{opacity:1;transform:scale(1) translateY(0)} }
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
  const [hovered, setHovered]          = useState(false);
  const [selectedIdx, setSelectedIdx]  = useState<number | null>(null);
  const [hiddenId, setHiddenId]        = useState<string | null>(null);
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

  return (
    <>
      <div
        className={cn("relative flex flex-col items-center justify-center p-10 rounded-3xl cursor-pointer border transition-all duration-700 ease-[cubic-bezier(0.16,1,0.3,1)]", className)}
        style={{
          minWidth: 300, minHeight: 360,
          perspective: "1200px",
          background: "rgba(255,255,255,0.025)",
          borderColor: hovered ? PARCH_BORDER : "rgba(255,255,255,0.06)",
          transform: hovered ? "scale(1.04) rotate(-1deg)" : "scale(1) rotate(0deg)",
          boxShadow: hovered ? `0 32px 64px -12px rgba(0,0,0,0.5), 0 0 0 1px ${PARCH_BORDER}` : "none",
        }}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
      >
        {/* Glow */}
        <div
          className="absolute inset-0 rounded-3xl pointer-events-none transition-opacity duration-700"
          style={{
            background: `radial-gradient(circle at 50% 80%, ${PARCH_BACK}44 0%, transparent 70%)`,
            opacity: hovered ? 1 : 0,
          }}
        />

        {/* Folder body */}
        <div className="relative flex items-center justify-center mb-6" style={{ height: 180, width: 220 }}>
          {/* Back panel */}
          <div
            className="absolute w-36 h-28 rounded-xl shadow-md border"
            style={{
              background: `linear-gradient(135deg, ${PARCH_BACK}, ${PARCH_TAB})`,
              borderColor: PARCH_BORDER,
              transformOrigin: "bottom center",
              transform: hovered ? "rotateX(-18deg) scaleY(1.04)" : "rotateX(0deg) scaleY(1)",
              transition: "transform 700ms cubic-bezier(0.16,1,0.3,1)",
              zIndex: 10,
            }}
          />
          {/* Tab */}
          <div
            className="absolute w-14 h-5 rounded-t-lg border-t border-x"
            style={{
              background: PARCH_TAB,
              borderColor: PARCH_BORDER,
              top: "calc(50% - 56px - 14px)",
              left: "calc(50% - 72px + 18px)",
              transformOrigin: "bottom center",
              transform: hovered ? "rotateX(-28deg) translateY(-2px)" : "rotateX(0deg)",
              transition: "transform 700ms cubic-bezier(0.16,1,0.3,1)",
              zIndex: 10,
            }}
          />
          {/* Mini cards */}
          <div className="absolute" style={{ top: "50%", left: "50%", zIndex: 20 }}>
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
            className="absolute w-36 h-28 rounded-xl shadow-xl border"
            style={{
              background: `linear-gradient(135deg, ${PARCH_FRONT}, ${PARCH_BACK})`,
              borderColor: PARCH_BORDER,
              top: "calc(50% - 56px + 4px)",
              transformOrigin: "bottom center",
              transform: hovered ? "rotateX(32deg) translateY(12px)" : "rotateX(0deg) translateY(0)",
              transition: "transform 700ms cubic-bezier(0.16,1,0.3,1)",
              zIndex: 30,
            }}
          />
          {/* Gloss */}
          <div
            className="absolute w-36 h-28 rounded-xl overflow-hidden pointer-events-none"
            style={{
              background: "linear-gradient(135deg, rgba(255,255,255,0.38) 0%, transparent 55%)",
              top: "calc(50% - 56px + 4px)",
              transformOrigin: "bottom center",
              transform: hovered ? "rotateX(32deg) translateY(12px)" : "rotateX(0deg) translateY(0)",
              transition: "transform 700ms cubic-bezier(0.16,1,0.3,1)",
              zIndex: 31,
            }}
          />
        </div>

        {/* Text */}
        <div className="text-center z-10">
          <h3
            style={{
              fontFamily: "Georgia, 'Times New Roman', serif",
              fontSize: "1.15rem", fontWeight: 700,
              color: "rgba(255,255,255,0.88)",
              transition: "transform 500ms",
              transform: hovered ? "translateY(2px)" : "translateY(0)",
              letterSpacing: "-0.01em",
              marginBottom: 4,
            }}
          >
            {folder.title}
          </h3>
          <p style={{ fontSize: "0.8rem", color: "rgba(255,255,255,0.38)", fontFamily: "-apple-system, sans-serif" }}>
            {folder.subtitle}
          </p>
        </div>

        {/* Hover hint */}
        <div
          className="absolute bottom-5 left-1/2 -translate-x-1/2 text-xs font-semibold uppercase tracking-widest transition-all duration-500"
          style={{
            color: "rgba(255,255,255,0.2)",
            opacity: hovered ? 0 : 1,
            transform: hovered ? "translateY(8px)" : "translateY(0)",
            fontFamily: "-apple-system, sans-serif",
            letterSpacing: "0.18em",
            fontSize: "0.6rem",
          }}
        >
          hover to explore
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
