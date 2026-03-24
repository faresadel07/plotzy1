import { useState } from "react";
import { Button } from "@/components/ui/button";
import { X, Palette, Type, Check } from "lucide-react";
import { useLanguage } from "@/contexts/language-context";
import type { BookPreferences } from "@/shared/schema";

interface BookCustomizerProps {
  preferences: BookPreferences;
  onSave: (prefs: BookPreferences) => void;
  onClose: () => void;
}

const FONTS = [
  { id: "serif", label: "Literary", labelAr: "أدبي", font: "font-serif", sample: "The forest breathed..." },
  { id: "sans", label: "Modern", labelAr: "عصري", font: "font-sans", sample: "The forest breathed..." },
  { id: "mono", label: "Typewriter", labelAr: "آلة كاتبة", font: "font-mono", sample: "The forest breathed..." },
  { id: "arabic-sans", label: "Arabic Modern", labelAr: "عربي عصري", font: "", style: { fontFamily: "'Cairo', sans-serif" }, sample: "تنفست الغابة بهدوء..." },
  { id: "arabic-serif", label: "Arabic Classic", labelAr: "عربي كلاسيكي", font: "", style: { fontFamily: "'Amiri', serif" }, sample: "تنفست الغابة بهدوء..." },
];

const BG_COLORS = [
  { id: "#ffffff", label: "White", labelAr: "أبيض" },
  { id: "#fefce8", label: "Cream", labelAr: "كريمي" },
  { id: "#fdf6e3", label: "Parchment", labelAr: "رق" },
  { id: "#f0f4ff", label: "Sky", labelAr: "سماوي" },
  { id: "#f0fdf4", label: "Mint", labelAr: "نعناعي" },
  { id: "#1a1a2e", label: "Dark", labelAr: "داكن" },
  { id: "#0f172a", label: "Night", labelAr: "ليلي" },
];

const TEXT_COLORS = [
  { id: "#1a1a2e", label: "Dark", labelAr: "داكن" },
  { id: "#374151", label: "Gray", labelAr: "رمادي" },
  { id: "#1e3a5f", label: "Navy", labelAr: "كحلي" },
  { id: "#f9fafb", label: "Light", labelAr: "فاتح" },
  { id: "#f3e8d2", label: "Warm", labelAr: "دافئ" },
];

const FONT_SIZES = [
  { id: "text-base", label: "Normal", labelAr: "عادي" },
  { id: "text-lg", label: "Large", labelAr: "كبير" },
  { id: "text-xl", label: "X-Large", labelAr: "كبير جداً" },
];

const PAGE_STYLES = [
  { id: "minimal", label: "Minimal", labelAr: "بسيط" },
  { id: "classic", label: "Classic", labelAr: "كلاسيكي" },
  { id: "modern", label: "Modern", labelAr: "عصري" },
];

export function BookCustomizer({ preferences, onSave, onClose }: BookCustomizerProps) {
  const { t, lang } = useLanguage();
  const [prefs, setPrefs] = useState<BookPreferences>({
    fontFamily: preferences.fontFamily || "serif",
    fontSize: preferences.fontSize || "text-lg",
    bgColor: preferences.bgColor || "#ffffff",
    textColor: preferences.textColor || "#1a1a2e",
    pageStyle: preferences.pageStyle || "minimal",
  });

  const currentFont = FONTS.find(f => f.id === prefs.fontFamily);
  const sampleStyle: React.CSSProperties = {
    backgroundColor: prefs.bgColor,
    color: prefs.textColor,
    fontFamily: currentFont?.style?.fontFamily,
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-end bg-black/30 backdrop-blur-sm">
      <div className="bg-card h-full w-full max-w-sm shadow-2xl border-l-2 border-primary/20 flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-border/40 bg-gradient-to-r from-primary/10 to-secondary/10">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary to-secondary flex items-center justify-center">
              <Palette className="w-4 h-4 text-white" />
            </div>
            <h3 className="font-bold gradient-text">{t("settings")}</h3>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose} className="rounded-xl">
            <X className="w-5 h-5" />
          </Button>
        </div>

        {/* Preview */}
        <div className="p-4 border-b border-border/40">
          <div
            className={`rounded-xl p-5 shadow-inner text-base leading-relaxed border transition-all ${prefs.pageStyle === "classic" ? "border-2" : "border"}`}
            style={sampleStyle}
          >
            <p className={currentFont?.font || ""} style={currentFont?.style}>
              {lang === "ar" ? "تنفست الغابة بهدوء تحت ضوء القمر..." : "The forest breathed quietly under moonlight..."}
            </p>
          </div>
        </div>

        {/* Options */}
        <div className="flex-1 overflow-y-auto p-4 space-y-6">
          {/* Font Family */}
          <div>
            <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2 mb-3">
              <Type className="w-3.5 h-3.5" />
              {t("fontFamily")}
            </label>
            <div className="space-y-2">
              {FONTS.map((font) => (
                <button
                  key={font.id}
                  onClick={() => setPrefs(p => ({ ...p, fontFamily: font.id }))}
                  className={`w-full text-left px-4 py-3 rounded-xl border-2 transition-all flex items-center justify-between ${
                    prefs.fontFamily === font.id
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border/50 hover:border-primary/30 hover:bg-muted/30"
                  }`}
                >
                  <span className={`${font.font} text-sm`} style={font.style}>
                    {lang === "ar" ? font.labelAr : font.label}
                  </span>
                  {prefs.fontFamily === font.id && <Check className="w-4 h-4 text-primary" />}
                </button>
              ))}
            </div>
          </div>

          {/* Font Size */}
          <div>
            <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-3 block">
              {t("fontSize")}
            </label>
            <div className="flex gap-2">
              {FONT_SIZES.map((size) => (
                <button
                  key={size.id}
                  onClick={() => setPrefs(p => ({ ...p, fontSize: size.id }))}
                  className={`flex-1 py-2.5 rounded-xl text-sm font-semibold border-2 transition-all ${
                    prefs.fontSize === size.id
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border/50 hover:border-primary/30"
                  }`}
                >
                  {lang === "ar" ? size.labelAr : size.label}
                </button>
              ))}
            </div>
          </div>

          {/* Background Color */}
          <div>
            <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-3 block">
              {t("bgColor")}
            </label>
            <div className="flex flex-wrap gap-2">
              {BG_COLORS.map((color) => (
                <button
                  key={color.id}
                  onClick={() => setPrefs(p => ({ ...p, bgColor: color.id }))}
                  title={lang === "ar" ? color.labelAr : color.label}
                  className={`w-10 h-10 rounded-xl border-2 transition-all flex items-center justify-center ${
                    prefs.bgColor === color.id ? "border-primary scale-110" : "border-border/50 hover:scale-105"
                  }`}
                  style={{ backgroundColor: color.id }}
                >
                  {prefs.bgColor === color.id && (
                    <Check className="w-4 h-4" style={{ color: color.id === "#ffffff" || color.id.startsWith("#fe") || color.id.startsWith("#fd") || color.id.startsWith("#f0") ? "#333" : "#fff" }} />
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Text Color */}
          <div>
            <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-3 block">
              {t("textColor")}
            </label>
            <div className="flex flex-wrap gap-2">
              {TEXT_COLORS.map((color) => (
                <button
                  key={color.id}
                  onClick={() => setPrefs(p => ({ ...p, textColor: color.id }))}
                  title={lang === "ar" ? color.labelAr : color.label}
                  className={`w-10 h-10 rounded-xl border-2 transition-all flex items-center justify-center ${
                    prefs.textColor === color.id ? "border-primary scale-110" : "border-border/50 hover:scale-105"
                  }`}
                  style={{ backgroundColor: color.id }}
                >
                  {prefs.textColor === color.id && (
                    <Check className="w-4 h-4 text-white/80" />
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Page Style */}
          <div>
            <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-3 block">
              {t("pageStyle")}
            </label>
            <div className="flex gap-2">
              {PAGE_STYLES.map((style) => (
                <button
                  key={style.id}
                  onClick={() => setPrefs(p => ({ ...p, pageStyle: style.id }))}
                  className={`flex-1 py-2.5 rounded-xl text-sm font-semibold border-2 transition-all ${
                    prefs.pageStyle === style.id
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border/50 hover:border-primary/30"
                  }`}
                >
                  {lang === "ar" ? style.labelAr : style.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Save */}
        <div className="p-4 border-t border-border/40">
          <Button
            onClick={() => { onSave(prefs); onClose(); }}
            className="w-full rounded-xl font-semibold bg-gradient-to-r from-primary to-secondary text-white hover:shadow-lg hover:shadow-primary/20 transition-all"
          >
            <Check className="w-4 h-4 mr-2" />
            {lang === "ar" ? "حفظ التخصيص" : "Apply Customization"}
          </Button>
        </div>
      </div>
    </div>
  );
}
