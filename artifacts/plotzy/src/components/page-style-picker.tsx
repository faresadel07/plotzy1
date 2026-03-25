import { useRef, useEffect } from "react";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

export type PageStyleId =
  | "blank" | "lined" | "dotted" | "graph" | "manuscript"
  | "sepia" | "night_paper" | "kraft" | "blueprint" | "dark_academia" | "grid_fine";

export interface PageStyleOption {
  id: PageStyleId;
  label: string;
  labelAr?: string;
  description: string;
  descriptionAr?: string;
  preview: (isDark: boolean) => React.CSSProperties;
  background: (isDark: boolean) => React.CSSProperties;
}

export interface PageStyleCategory {
  label: string;
  labelAr?: string;
  styles: PageStyleOption[];
}

const CLASSIC: PageStyleOption[] = [
  {
    id: "blank",
    label: "Classic Blank",
    labelAr: "صفحة بيضاء",
    description: "Clean, distraction-free",
    descriptionAr: "صفحة نظيفة خالية",
    preview: () => ({}),
    background: () => ({}),
  },
  {
    id: "lined",
    label: "Lined Paper",
    labelAr: "ورق مسطّر",
    description: "Notebook horizontal rules",
    descriptionAr: "خطوط أفقية كالدفتر",
    preview: (isDark) => ({
      backgroundImage: isDark
        ? "repeating-linear-gradient(transparent 0px,transparent 12px,rgba(212,175,55,0.22) 12px,rgba(212,175,55,0.22) 13px)"
        : "repeating-linear-gradient(transparent 0px,transparent 12px,rgba(100,140,200,0.28) 12px,rgba(100,140,200,0.28) 13px)",
    }),
    background: (isDark) => ({
      backgroundImage: isDark
        ? "repeating-linear-gradient(transparent 0px,transparent 31px,rgba(212,175,55,0.10) 31px,rgba(212,175,55,0.10) 32px)"
        : "repeating-linear-gradient(transparent 0px,transparent 31px,rgba(100,140,200,0.18) 31px,rgba(100,140,200,0.18) 32px)",
    }),
  },
  {
    id: "dotted",
    label: "Dotted Grid",
    labelAr: "شبكة نقطية",
    description: "Subtle structure dots",
    descriptionAr: "نقاط هيكلية خفيفة",
    preview: (isDark) => ({
      backgroundImage: isDark
        ? "radial-gradient(circle, rgba(212,175,55,0.35) 1.5px, transparent 1.5px)"
        : "radial-gradient(circle, rgba(80,100,160,0.35) 1.5px, transparent 1.5px)",
      backgroundSize: "11px 11px",
    }),
    background: (isDark) => ({
      backgroundImage: isDark
        ? "radial-gradient(circle, rgba(212,175,55,0.18) 1.5px, transparent 1.5px)"
        : "radial-gradient(circle, rgba(80,100,160,0.20) 1.5px, transparent 1.5px)",
      backgroundSize: "28px 28px",
    }),
  },
];

const TEXTURED: PageStyleOption[] = [
  {
    id: "manuscript",
    label: "Manuscript",
    labelAr: "مخطوطة",
    description: "Classic parchment feel",
    descriptionAr: "ملمس الرق الكلاسيكي",
    preview: (isDark) => ({
      backgroundColor: isDark ? "#1a1508" : "#fdf6e3",
      backgroundImage: isDark
        ? "repeating-linear-gradient(transparent 0px,transparent 12px,rgba(180,140,50,0.22) 12px,rgba(180,140,50,0.22) 13px)"
        : "repeating-linear-gradient(transparent 0px,transparent 12px,rgba(150,110,30,0.18) 12px,rgba(150,110,30,0.18) 13px)",
    }),
    background: (isDark) => ({
      backgroundColor: isDark ? "#120f07" : "#fdf6e3",
      backgroundImage: isDark
        ? "repeating-linear-gradient(transparent 0px,transparent 31px,rgba(180,140,50,0.12) 31px,rgba(180,140,50,0.12) 32px)"
        : "repeating-linear-gradient(transparent 0px,transparent 31px,rgba(150,110,30,0.14) 31px,rgba(150,110,30,0.14) 32px)",
    }),
  },
  {
    id: "sepia",
    label: "Sepia",
    labelAr: "بني كلاسيكي",
    description: "Warm aged paper tone",
    descriptionAr: "لون الورق العتيق الدافئ",
    preview: () => ({
      backgroundColor: "#f5ead0",
      backgroundImage: "radial-gradient(ellipse at 60% 40%, rgba(200,160,80,0.15) 0%, transparent 70%)",
    }),
    background: () => ({
      backgroundColor: "#f5ead0",
    }),
  },
  {
    id: "kraft",
    label: "Kraft Paper",
    labelAr: "ورق كرافت",
    description: "Recycled brown surface",
    descriptionAr: "سطح بني مُعاد تدويره",
    preview: () => ({
      backgroundColor: "#c9a96e",
      backgroundImage:
        "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='60' height='60'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='60' height='60' filter='url(%23n)' opacity='0.08'/%3E%3C/svg%3E\")",
    }),
    background: () => ({
      backgroundColor: "#c9a96e",
    }),
  },
  {
    id: "night_paper",
    label: "Night Paper",
    labelAr: "ورق الليل",
    description: "Dark surface for night writing",
    descriptionAr: "سطح داكن للكتابة ليلاً",
    preview: () => ({
      backgroundColor: "#111827",
      backgroundImage: "repeating-linear-gradient(transparent 0px,transparent 12px,rgba(100,130,200,0.12) 12px,rgba(100,130,200,0.12) 13px)",
    }),
    background: () => ({
      backgroundColor: "#111827",
      backgroundImage: "repeating-linear-gradient(transparent 0px,transparent 31px,rgba(100,130,200,0.07) 31px,rgba(100,130,200,0.07) 32px)",
    }),
  },
];

const SPECIALTY: PageStyleOption[] = [
  {
    id: "graph",
    label: "Graph Paper",
    labelAr: "ورق مربعات",
    description: "Square engineering grid",
    descriptionAr: "شبكة مربعات هندسية",
    preview: (isDark) => ({
      backgroundImage: isDark
        ? "linear-gradient(rgba(212,175,55,0.20) 1px,transparent 1px),linear-gradient(90deg,rgba(212,175,55,0.20) 1px,transparent 1px)"
        : "linear-gradient(rgba(80,100,180,0.22) 1px,transparent 1px),linear-gradient(90deg,rgba(80,100,180,0.22) 1px,transparent 1px)",
      backgroundSize: "11px 11px",
    }),
    background: (isDark) => ({
      backgroundImage: isDark
        ? "linear-gradient(rgba(212,175,55,0.08) 1px,transparent 1px),linear-gradient(90deg,rgba(212,175,55,0.08) 1px,transparent 1px)"
        : "linear-gradient(rgba(80,100,180,0.13) 1px,transparent 1px),linear-gradient(90deg,rgba(80,100,180,0.13) 1px,transparent 1px)",
      backgroundSize: "24px 24px",
    }),
  },
  {
    id: "grid_fine",
    label: "Fine Grid",
    labelAr: "شبكة دقيقة",
    description: "Ultra-thin precision grid",
    descriptionAr: "شبكة رفيعة جداً",
    preview: (isDark) => ({
      backgroundImage: isDark
        ? "linear-gradient(rgba(255,255,255,0.08) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,0.08) 1px,transparent 1px)"
        : "linear-gradient(rgba(0,0,0,0.10) 1px,transparent 1px),linear-gradient(90deg,rgba(0,0,0,0.10) 1px,transparent 1px)",
      backgroundSize: "8px 8px",
    }),
    background: (isDark) => ({
      backgroundImage: isDark
        ? "linear-gradient(rgba(255,255,255,0.04) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,0.04) 1px,transparent 1px)"
        : "linear-gradient(rgba(0,0,0,0.06) 1px,transparent 1px),linear-gradient(90deg,rgba(0,0,0,0.06) 1px,transparent 1px)",
      backgroundSize: "18px 18px",
    }),
  },
  {
    id: "blueprint",
    label: "Blueprint",
    labelAr: "مخطط هندسي",
    description: "Engineer's dark blue grid",
    descriptionAr: "شبكة المهندس الزرقاء",
    preview: () => ({
      backgroundColor: "#0c2340",
      backgroundImage:
        "linear-gradient(rgba(100,180,255,0.25) 1px,transparent 1px),linear-gradient(90deg,rgba(100,180,255,0.25) 1px,transparent 1px)",
      backgroundSize: "11px 11px",
    }),
    background: () => ({
      backgroundColor: "#0c2340",
      backgroundImage:
        "linear-gradient(rgba(100,180,255,0.12) 1px,transparent 1px),linear-gradient(90deg,rgba(100,180,255,0.12) 1px,transparent 1px)",
      backgroundSize: "28px 28px",
    }),
  },
  {
    id: "dark_academia",
    label: "Dark Academia",
    labelAr: "أكاديمية داكنة",
    description: "Forest green scholarly feel",
    descriptionAr: "جو أكاديمي داكن بالأخضر",
    preview: () => ({
      backgroundColor: "#0f1a10",
      backgroundImage: "repeating-linear-gradient(transparent 0px,transparent 12px,rgba(120,180,80,0.14) 12px,rgba(120,180,80,0.14) 13px)",
    }),
    background: () => ({
      backgroundColor: "#0f1a10",
      backgroundImage: "repeating-linear-gradient(transparent 0px,transparent 31px,rgba(120,180,80,0.08) 31px,rgba(120,180,80,0.08) 32px)",
    }),
  },
];

export const PAGE_STYLES: PageStyleOption[] = [...CLASSIC, ...TEXTURED, ...SPECIALTY];

export const PAGE_STYLE_CATEGORIES: PageStyleCategory[] = [
  { label: "Classic", labelAr: "كلاسيكي", styles: CLASSIC },
  { label: "Textured", labelAr: "ملمسي", styles: TEXTURED },
  { label: "Specialty", labelAr: "متخصص", styles: SPECIALTY },
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

  const activeId = currentStyle || "blank";

  return (
    <div
      ref={panelRef}
      className="absolute top-full right-0 mt-2 w-[380px] z-[200] rounded-2xl border border-border/60 shadow-2xl overflow-hidden flex flex-col"
      style={{
        background: isDark
          ? "rgba(10,10,12,0.97)"
          : "rgba(255,255,255,0.98)",
        backdropFilter: "blur(24px)",
        maxHeight: "82vh",
      }}
    >
      {/* Header */}
      <div
        className="px-4 py-3 border-b border-border/50 flex items-center justify-between shrink-0"
        style={{ background: isDark ? "rgba(255,255,255,0.03)" : "rgba(0,0,0,0.02)" }}
      >
        <div className="flex items-center gap-2.5">
          <div
            className="w-7 h-7 rounded-lg flex items-center justify-center text-base"
            style={{ background: isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.06)" }}
          >
            🎨
          </div>
          <div>
            <p className="text-sm font-bold text-foreground leading-tight">Page Style</p>
            <p className="text-[10px] text-muted-foreground">Choose your writing surface</p>
          </div>
        </div>
        <button
          onClick={onClose}
          className="w-7 h-7 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-foreground/10 transition-colors text-lg leading-none"
        >
          ×
        </button>
      </div>

      {/* Scrollable content */}
      <div className="overflow-y-auto flex-1 px-3 py-3 space-y-4">
        {PAGE_STYLE_CATEGORIES.map((category) => (
          <div key={category.label}>
            {/* Category header */}
            <div className="flex items-center gap-2 mb-2 px-0.5">
              <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/70">
                {category.label}
              </span>
              <div className="flex-1 h-px" style={{ background: isDark ? "rgba(255,255,255,0.07)" : "rgba(0,0,0,0.07)" }} />
            </div>

            {/* Style grid */}
            <div className="grid grid-cols-3 gap-2">
              {category.styles.map((style) => {
                const isSelected = activeId === style.id;
                const previewCSS = style.preview(isDark);
                return (
                  <button
                    key={style.id}
                    onClick={() => { onSelect(style.id); onClose(); }}
                    className={cn(
                      "group relative text-left rounded-xl border-2 transition-all duration-200 overflow-hidden",
                      isSelected
                        ? "border-foreground shadow-lg"
                        : "border-transparent hover:border-foreground/25 hover:shadow-md"
                    )}
                    style={{
                      boxShadow: isSelected
                        ? `0 0 0 2px ${isDark ? "rgba(255,255,255,0.15)" : "rgba(0,0,0,0.12)"},0 4px 16px rgba(0,0,0,0.2)`
                        : undefined,
                    }}
                  >
                    {/* Preview box */}
                    <div
                      className="w-full h-[60px] overflow-hidden relative"
                      style={{
                        backgroundColor: (previewCSS as any).backgroundColor || (isDark ? "#1a1a1a" : "#ffffff"),
                        backgroundImage: (previewCSS as any).backgroundImage,
                        backgroundSize: (previewCSS as any).backgroundSize,
                      }}
                    >
                      {/* Simulated text inside preview */}
                      <div className="px-2 pt-2.5 space-y-[4px]">
                        <div
                          className="h-[4px] rounded-full"
                          style={{
                            width: "65%",
                            background: isDark || (previewCSS as any).backgroundColor?.startsWith("#0")
                              ? "rgba(255,255,255,0.25)"
                              : "rgba(0,0,0,0.18)",
                          }}
                        />
                        <div
                          className="h-[4px] rounded-full"
                          style={{
                            width: "88%",
                            background: isDark || (previewCSS as any).backgroundColor?.startsWith("#0")
                              ? "rgba(255,255,255,0.15)"
                              : "rgba(0,0,0,0.12)",
                          }}
                        />
                        <div
                          className="h-[4px] rounded-full"
                          style={{
                            width: "50%",
                            background: isDark || (previewCSS as any).backgroundColor?.startsWith("#0")
                              ? "rgba(255,255,255,0.20)"
                              : "rgba(0,0,0,0.15)",
                          }}
                        />
                        <div
                          className="h-[4px] rounded-full"
                          style={{
                            width: "76%",
                            background: isDark || (previewCSS as any).backgroundColor?.startsWith("#0")
                              ? "rgba(255,255,255,0.12)"
                              : "rgba(0,0,0,0.09)",
                          }}
                        />
                      </div>

                      {/* Hover overlay */}
                      <div
                        className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-200"
                        style={{ background: "rgba(255,255,255,0.05)" }}
                      />
                    </div>

                    {/* Label */}
                    <div
                      className="px-1.5 py-1.5"
                      style={{
                        background: isSelected
                          ? isDark ? "rgba(255,255,255,0.07)" : "rgba(0,0,0,0.05)"
                          : isDark ? "rgba(255,255,255,0.03)" : "rgba(0,0,0,0.02)",
                      }}
                    >
                      <p className="text-[10px] font-semibold text-foreground leading-tight truncate">
                        {style.label}
                      </p>
                    </div>

                    {/* Selected check */}
                    {isSelected && (
                      <div className="absolute top-1 right-1 w-4 h-4 rounded-full bg-foreground flex items-center justify-center shadow-sm">
                        <Check className="w-2 h-2 text-background" strokeWidth={3} />
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Footer */}
      <div
        className="px-4 py-2.5 border-t border-border/40 shrink-0 flex items-center justify-between"
        style={{ background: isDark ? "rgba(255,255,255,0.02)" : "rgba(0,0,0,0.02)" }}
      >
        <p className="text-[10px] text-muted-foreground/60">
          Styles auto-adapt to light &amp; dark mode
        </p>
        <span className="text-[10px] text-muted-foreground/40 font-mono">
          {PAGE_STYLES.length} styles
        </span>
      </div>
    </div>
  );
}
