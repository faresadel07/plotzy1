// The cover designer's new front door: a genre template gallery whose
// thumbnails are LIVE mini-covers rendered with the writer's actual
// title and author (no design tool does this — they all show fake
// titles until you commit). Because templates are data + DOM, the
// "thumbnail" IS the template at 42% scale, so what you pick is exactly
// what you get.
//
// Rendered through a portal (fixed overlay; the designer page has
// transformed ancestors).

import { useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { X, PenLine, Sparkles } from "lucide-react";
import {
  COVER_TEMPLATES,
  TEMPLATE_GENRES,
  buildTemplateDesign,
  type CoverTemplate,
  type TemplateGenre,
} from "@/lib/cover-templates";

const SF = '-apple-system, BlinkMacSystemFont, "SF Pro Display", "SF Pro Text", "Helvetica Neue", sans-serif';
const FACE_W = 300;
const FACE_H = 450;

interface TemplateGalleryProps {
  bookTitle: string;
  bookAuthor: string;
  ar: boolean;
  /** Apply a template's built design (elements + face settings). */
  onPick: (design: ReturnType<typeof buildTemplateDesign>) => void;
  onStartBlank: () => void;
  onClose: () => void;
  /** Hide the close X when this is the forced first-open experience. */
  dismissable?: boolean;
}

export function TemplateGallery({
  bookTitle,
  bookAuthor,
  ar,
  onPick,
  onStartBlank,
  onClose,
  dismissable = true,
}: TemplateGalleryProps) {
  const [genre, setGenre] = useState<TemplateGenre | "all">("all");

  const templates = useMemo(
    () => (genre === "all" ? COVER_TEMPLATES : COVER_TEMPLATES.filter((t) => t.genre === genre)),
    [genre],
  );

  return createPortal(
    <div
      dir={ar ? "rtl" : "ltr"}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 130,
        background: "rgba(8,8,10,0.92)",
        backdropFilter: "blur(14px)",
        display: "flex",
        flexDirection: "column",
        fontFamily: SF,
      }}
    >
      {/* header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 12,
          padding: "16px 18px 10px",
          flexWrap: "wrap",
        }}
      >
        <div style={{ minWidth: 0, flex: 1 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, color: "#fff", fontSize: 17, fontWeight: 800, letterSpacing: "-0.02em" }}>
            <Sparkles size={16} style={{ color: "#d8b45a" }} />
            {ar ? "اختر نقطة انطلاق غلافك" : "Pick your cover's starting point"}
          </div>
          <div style={{ fontSize: 12.5, color: "rgba(255,255,255,0.55)", marginTop: 3 }}>
            {ar
              ? "كل قالب معروض باسم كتابك فعلاً، وكل عنصر فيه يبقى قابلاً للتعديل"
              : "Every template is shown with your actual book title, and every element stays editable"}
          </div>
        </div>
        {dismissable && (
          <button
            onClick={onClose}
            aria-label={ar ? "إغلاق" : "Close"}
            style={{
              width: 34,
              height: 34,
              borderRadius: 10,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              background: "rgba(255,255,255,0.07)",
              border: "1px solid rgba(255,255,255,0.14)",
              color: "#fff",
              cursor: "pointer",
            }}
          >
            <X size={16} />
          </button>
        )}
      </div>

      {/* genre chips */}
      <div
        style={{
          display: "flex",
          gap: 8,
          overflowX: "auto",
          padding: "6px 18px 14px",
          scrollbarWidth: "none",
        }}
      >
        {[{ id: "all" as const, label: ar ? "الكل" : "All" }, ...TEMPLATE_GENRES.map((g) => ({ id: g.id, label: ar ? g.labelAr : g.label }))].map(
          (g) => (
            <button
              key={g.id}
              onClick={() => setGenre(g.id as TemplateGenre | "all")}
              style={{
                flex: "0 0 auto",
                padding: "7px 14px",
                borderRadius: 999,
                fontSize: 12.5,
                fontWeight: 700,
                fontFamily: SF,
                cursor: "pointer",
                background: genre === g.id ? "#fff" : "rgba(255,255,255,0.06)",
                color: genre === g.id ? "#000" : "rgba(255,255,255,0.75)",
                border: `1px solid ${genre === g.id ? "#fff" : "rgba(255,255,255,0.14)"}`,
                transition: "all 130ms",
              }}
            >
              {g.label}
            </button>
          ),
        )}
      </div>

      {/* grid */}
      <div style={{ flex: 1, overflowY: "auto", WebkitOverflowScrolling: "touch", padding: "4px 18px 28px" }}>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(138px, 1fr))",
            gap: 16,
            maxWidth: 1060,
            margin: "0 auto",
          }}
        >
          {/* start blank card */}
          <button
            onClick={onStartBlank}
            style={{
              aspectRatio: "2 / 3",
              borderRadius: 10,
              border: "1.5px dashed rgba(255,255,255,0.28)",
              background: "rgba(255,255,255,0.03)",
              color: "rgba(255,255,255,0.7)",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              gap: 10,
              cursor: "pointer",
              fontFamily: SF,
              fontSize: 12.5,
              fontWeight: 700,
            }}
          >
            <PenLine size={20} />
            {ar ? "ابدأ من فراغ" : "Start blank"}
          </button>

          {templates.map((t) => (
            <TemplateCard
              key={t.id}
              template={t}
              title={bookTitle}
              author={bookAuthor}
              ar={ar}
              onPick={() => onPick(buildTemplateDesign(t, { title: bookTitle, author: bookAuthor }, ar))}
            />
          ))}
        </div>
      </div>
    </div>,
    document.body,
  );
}

// ── Live thumbnail ────────────────────────────────────────────────────

function TemplateCard({
  template,
  title,
  author,
  ar,
  onPick,
}: {
  template: CoverTemplate;
  title: string;
  author: string;
  ar: boolean;
  onPick: () => void;
}) {
  const design = useMemo(
    () => buildTemplateDesign(template, { title, author }, ar),
    [template, title, author, ar],
  );
  const frontEls = design.elements.filter((e) => e.face === "front");

  return (
    <button
      onClick={onPick}
      title={ar ? template.nameAr : template.name}
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 7,
        background: "transparent",
        border: "none",
        cursor: "pointer",
        padding: 0,
        fontFamily: SF,
      }}
      className="group"
    >
      <div
        style={{
          width: "100%",
          aspectRatio: "2 / 3",
          borderRadius: 10,
          overflow: "hidden",
          border: "1px solid rgba(255,255,255,0.12)",
          boxShadow: "0 10px 26px -12px rgba(0,0,0,0.6)",
          position: "relative",
          transition: "transform 150ms ease, border-color 150ms",
        }}
        className="group-hover:scale-[1.025] group-hover:!border-white/40"
      >
        {/* scaled live face */}
        <div style={{ position: "absolute", inset: 0 }}>
          <div
            style={{
              width: FACE_W,
              height: FACE_H,
              transform: "scale(var(--tpl-scale, 0.5))",
              transformOrigin: "top left",
              background: design.settings.front.background,
              // Absolute left:0 pins the oversized face physically;
              // in RTL a static block starts from the right and the
              // scaled content lands outside the card.
              position: "absolute",
              left: 0,
              top: 0,
              // Scale to fit whatever width the card gets.
            }}
            ref={(node) => {
              if (!node || !node.parentElement) return;
              const w = node.parentElement.clientWidth;
              node.style.setProperty("--tpl-scale", String(w / FACE_W));
            }}
          >
            {frontEls.map((el: any) => {
              if (el.type === "shape") {
                return (
                  <div
                    key={el.id}
                    style={{
                      position: "absolute",
                      left: el.x,
                      top: el.y,
                      width: el.width,
                      height: el.height,
                      background: el.fill,
                      opacity: el.opacity ?? 1,
                      borderRadius: el.borderRadius ?? 0,
                    }}
                  />
                );
              }
              if (el.type === "text") {
                return (
                  <div
                    key={el.id}
                    dir="auto"
                    style={{
                      position: "absolute",
                      left: el.x,
                      top: el.y,
                      width: el.width,
                      height: el.height,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      textAlign: "center",
                      fontSize: el.fontSize,
                      fontFamily: `"${el.fontFamily}", sans-serif`,
                      fontWeight: el.fontWeight as any,
                      color: el.color,
                      lineHeight: el.lineHeight,
                      letterSpacing: el.letterSpacing ? `${el.letterSpacing}px` : undefined,
                      overflow: "hidden",
                      pointerEvents: "none",
                    }}
                  >
                    <span style={{ width: "100%" }}>{el.content}</span>
                  </div>
                );
              }
              return null;
            })}
          </div>
        </div>
      </div>
      <span style={{ fontSize: 11.5, fontWeight: 700, color: "rgba(255,255,255,0.72)" }}>
        {ar ? template.nameAr : template.name}
      </span>
    </button>
  );
}
