import { useRef, useEffect } from "react";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

export type PageStyleId = "blank" | "lined" | "dotted" | "graph" | "manuscript";

export interface PageStyleOption {
  id: PageStyleId;
  label: string;
  description: string;
  preview: (isDark: boolean) => React.CSSProperties;
  background: (isDark: boolean) => React.CSSProperties;
}

export const PAGE_STYLES: PageStyleOption[] = [
  {
    id: "blank",
    label: "Classic Blank",
    description: "Clean, plain page",
    preview: () => ({}),
    background: () => ({}),
  },
  {
    id: "lined",
    label: "Lined Paper",
    description: "Notebook horizontal lines",
    preview: (isDark) => ({
      backgroundImage: isDark
        ? "repeating-linear-gradient(transparent 0px, transparent 12px, rgba(212,175,55,0.22) 12px, rgba(212,175,55,0.22) 13px)"
        : "repeating-linear-gradient(transparent 0px, transparent 12px, rgba(180,140,40,0.22) 12px, rgba(180,140,40,0.22) 13px)",
    }),
    background: (isDark) => ({
      backgroundImage: isDark
        ? "repeating-linear-gradient(transparent 0px, transparent 31px, rgba(212,175,55,0.10) 31px, rgba(212,175,55,0.10) 32px)"
        : "repeating-linear-gradient(transparent 0px, transparent 31px, rgba(180,140,40,0.16) 31px, rgba(180,140,40,0.16) 32px)",
    }),
  },
  {
    id: "dotted",
    label: "Dotted Grid",
    description: "Subtle dots for structure",
    preview: (isDark) => ({
      backgroundImage: isDark
        ? "radial-gradient(circle, rgba(212,175,55,0.35) 1.5px, transparent 1.5px)"
        : "radial-gradient(circle, rgba(180,140,40,0.35) 1.5px, transparent 1.5px)",
      backgroundSize: "11px 11px",
    }),
    background: (isDark) => ({
      backgroundImage: isDark
        ? "radial-gradient(circle, rgba(212,175,55,0.18) 1.5px, transparent 1.5px)"
        : "radial-gradient(circle, rgba(180,140,40,0.20) 1.5px, transparent 1.5px)",
      backgroundSize: "28px 28px",
    }),
  },
  {
    id: "graph",
    label: "Graph Paper",
    description: "Square grid layout",
    preview: (isDark) => ({
      backgroundImage: isDark
        ? "linear-gradient(rgba(212,175,55,0.20) 1px, transparent 1px), linear-gradient(90deg, rgba(212,175,55,0.20) 1px, transparent 1px)"
        : "linear-gradient(rgba(180,140,40,0.22) 1px, transparent 1px), linear-gradient(90deg, rgba(180,140,40,0.22) 1px, transparent 1px)",
      backgroundSize: "11px 11px",
    }),
    background: (isDark) => ({
      backgroundImage: isDark
        ? "linear-gradient(rgba(212,175,55,0.08) 1px, transparent 1px), linear-gradient(90deg, rgba(212,175,55,0.08) 1px, transparent 1px)"
        : "linear-gradient(rgba(180,140,40,0.13) 1px, transparent 1px), linear-gradient(90deg, rgba(180,140,40,0.13) 1px, transparent 1px)",
      backgroundSize: "24px 24px",
    }),
  },
  {
    id: "manuscript",
    label: "Manuscript",
    description: "Classic parchment feel",
    preview: (isDark) => ({
      backgroundColor: isDark ? "#120f07" : "#fdf6e3",
      backgroundImage: isDark
        ? "repeating-linear-gradient(transparent 0px, transparent 12px, rgba(180,140,50,0.22) 12px, rgba(180,140,50,0.22) 13px)"
        : "repeating-linear-gradient(transparent 0px, transparent 12px, rgba(150,110,30,0.18) 12px, rgba(150,110,30,0.18) 13px)",
    }),
    background: (isDark) => ({
      backgroundColor: isDark ? "#120f07" : "#fdf6e3",
      backgroundImage: isDark
        ? "repeating-linear-gradient(transparent 0px, transparent 31px, rgba(180,140,50,0.12) 31px, rgba(180,140,50,0.12) 32px)"
        : "repeating-linear-gradient(transparent 0px, transparent 31px, rgba(150,110,30,0.14) 31px, rgba(150,110,30,0.14) 32px)",
    }),
  },
];

interface PageStylePickerProps {
  currentStyle?: string;
  isDark: boolean;
  onSelect: (styleId: PageStyleId) => void;
  onClose: () => void;
}

export function PageStylePicker({ currentStyle, isDark, onSelect, onClose }: PageStylePickerProps) {
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    const timeout = setTimeout(() => document.addEventListener("mousedown", handler), 0);
    return () => {
      clearTimeout(timeout);
      document.removeEventListener("mousedown", handler);
    };
  }, [onClose]);

  return (
    <div
      ref={panelRef}
      className="absolute top-full right-0 mt-2 w-[340px] z-[200] rounded-2xl border border-border shadow-2xl overflow-hidden"
      style={{
        background: isDark ? "rgba(0,0,0,0.97)" : "rgba(255,255,255,0.98)",
        backdropFilter: "blur(20px)",
      }}
    >
      {/* Header */}
      <div className="px-4 py-3 border-b border-border flex items-center justify-between">
        <div>
          <p className="text-sm font-bold text-foreground">Page Style</p>
          <p className="text-[11px] text-muted-foreground mt-0.5">Choose your writing surface</p>
        </div>
        <button
          onClick={onClose}
          className="w-7 h-7 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-foreground/10 transition-colors text-xl leading-none"
        >
          ×
        </button>
      </div>

      {/* Style Grid — 2 columns, 3 in first row + 2 in second */}
      <div className="p-3 grid grid-cols-2 gap-2.5">
        {PAGE_STYLES.map((style) => {
          const isSelected = (currentStyle || "blank") === style.id;
          const previewCSS = style.preview(isDark);
          return (
            <button
              key={style.id}
              onClick={() => { onSelect(style.id); onClose(); }}
              className={cn(
                "group relative text-left rounded-xl border-2 transition-all duration-200 overflow-hidden",
                isSelected
                  ? "border-foreground shadow-lg shadow-foreground/10"
                  : "border-transparent hover:border-foreground/30 hover:shadow-md"
              )}
            >
              {/* Preview box */}
              <div
                className="w-full h-[58px] overflow-hidden"
                style={{
                  backgroundColor: (previewCSS as any).backgroundColor || (isDark ? "#111" : "#fff"),
                  backgroundImage: (previewCSS as any).backgroundImage,
                  backgroundSize: (previewCSS as any).backgroundSize,
                }}
              >
                {/* Simulated text lines inside the preview */}
                <div className="px-3 pt-3.5 space-y-[5px]">
                  <div
                    className="h-[5px] rounded-full"
                    style={{ width: "72%", background: isDark ? "rgba(255,255,255,0.18)" : "rgba(0,0,0,0.15)" }}
                  />
                  <div
                    className="h-[5px] rounded-full"
                    style={{ width: "90%", background: isDark ? "rgba(255,255,255,0.13)" : "rgba(0,0,0,0.10)" }}
                  />
                  <div
                    className="h-[5px] rounded-full"
                    style={{ width: "55%", background: isDark ? "rgba(255,255,255,0.18)" : "rgba(0,0,0,0.15)" }}
                  />
                </div>
              </div>

              {/* Label */}
              <div
                className={cn(
                  "px-2.5 py-2",
                  isSelected
                    ? "bg-foreground/10"
                    : isDark ? "bg-white/[0.04]" : "bg-black/[0.03]"
                )}
              >
                <p className="text-[11px] font-semibold text-foreground leading-snug">{style.label}</p>
                <p className="text-[10px] text-muted-foreground leading-snug">{style.description}</p>
              </div>

              {/* Selected checkmark badge */}
              {isSelected && (
                <div className="absolute top-1.5 right-1.5 w-5 h-5 rounded-full bg-foreground flex items-center justify-center shadow-sm">
                  <Check className="w-2.5 h-2.5 text-background" strokeWidth={3} />
                </div>
              )}
            </button>
          );
        })}
      </div>

      {/* Footer tip */}
      <div className="px-4 py-2.5 border-t border-border">
        <p className="text-[10px] text-muted-foreground text-center">
          Styles auto-adapt to light &amp; dark mode
        </p>
      </div>
    </div>
  );
}
