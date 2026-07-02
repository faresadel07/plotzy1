// Large full-width promotional cards for the mobile home, in the
// spirit of Apple TV's "Explore MLS" banner.
//
//   AiWriteBanner  — pitches AI-assisted writing, showing the official
//                    provider marks (Claude, GPT, Gemini) so writers
//                    see exactly which models power the studio.
//   DonateBanner   — a warm, low-pressure nudge toward the donate page.

import { useLocation } from "wouter";
import { ClaudeIcon, GPTIcon, GeminiIcon, StudioIcon } from "@/components/studio/icons";
import { Heart, ArrowRight, ArrowLeft, GraduationCap } from "lucide-react";

const SF = '-apple-system, BlinkMacSystemFont, "SF Pro Display", "SF Pro Text", "Helvetica Neue", sans-serif';

export function AiWriteBanner({ ar, onStart }: { ar: boolean; onStart: () => void }) {
  const Arrow = ar ? ArrowLeft : ArrowRight;
  return (
    <div style={{ padding: "0 16px", marginBottom: 26 }}>
      <button
        onClick={onStart}
        dir={ar ? "rtl" : "ltr"}
        style={{
          width: "100%",
          border: "1px solid rgba(255,255,255,0.10)",
          borderRadius: 20,
          padding: "24px 22px",
          cursor: "pointer",
          fontFamily: SF,
          textAlign: ar ? "right" : "left",
          background:
            "radial-gradient(120% 120% at 0% 0%, rgba(217,119,87,0.22), transparent 45%)," +
            "radial-gradient(120% 120% at 100% 100%, rgba(66,133,244,0.20), transparent 45%)," +
            "#0d0d10",
          position: "relative",
          overflow: "hidden",
        }}
      >
        {/* Provider marks */}
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
          <div style={badgeStyle}><StudioIcon size={18} /></div>
          <div style={{ width: 1, height: 20, background: "rgba(255,255,255,0.14)" }} />
          <div style={badgeStyle}><ClaudeIcon size={18} /></div>
          <div style={badgeStyle}><GPTIcon size={18} /></div>
          <div style={badgeStyle}><GeminiIcon size={18} /></div>
        </div>

        <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: "rgba(255,255,255,0.55)", marginBottom: 8 }}>
          {ar ? "استوديو الكتابة بالذكاء" : "AI Writing Studio"}
        </div>
        <div style={{ fontSize: 22, fontWeight: 800, letterSpacing: "-0.02em", color: "#fff", lineHeight: 1.2, marginBottom: 8, maxWidth: 300 }}>
          {ar ? "اكتب كتابك بمساعدة أقوى نماذج الذكاء" : "Write your book with the best AI models"}
        </div>
        <div style={{ fontSize: 13.5, color: "rgba(255,255,255,0.6)", lineHeight: 1.5, marginBottom: 16, maxWidth: 320 }}>
          {ar
            ? "يخطّط، يسوّد، ويحرّر إلى جانبك. أنت تملك كل كلمة تكتبها."
            : "It plots, drafts, and edits beside you. You own every word you write."}
        </div>
        <span style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 14, fontWeight: 700, color: "#fff" }}>
          {ar ? "ابدأ الكتابة" : "Start writing"} <Arrow size={16} />
        </span>
      </button>
    </div>
  );
}

export function DonateBanner({ ar }: { ar: boolean }) {
  const [, navigate] = useLocation();
  const Arrow = ar ? ArrowLeft : ArrowRight;
  return (
    <div style={{ padding: "0 16px", marginBottom: 26 }}>
      <button
        onClick={() => navigate("/pricing")}
        dir={ar ? "rtl" : "ltr"}
        style={{
          width: "100%",
          border: "1px solid rgba(255,255,255,0.10)",
          borderRadius: 20,
          padding: "22px",
          cursor: "pointer",
          fontFamily: SF,
          textAlign: ar ? "right" : "left",
          background:
            "radial-gradient(120% 120% at 100% 0%, rgba(244,63,94,0.18), transparent 50%),#0d0d10",
          display: "flex",
          alignItems: "center",
          gap: 16,
          flexDirection: ar ? "row-reverse" : "row",
        }}
      >
        <div
          style={{
            width: 48, height: 48, borderRadius: 14, flexShrink: 0,
            background: "rgba(244,63,94,0.16)", border: "1px solid rgba(244,63,94,0.3)",
            display: "grid", placeItems: "center",
          }}
        >
          <Heart size={22} color="#fb7185" fill="#fb7185" />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 16, fontWeight: 800, color: "#fff", marginBottom: 3 }}>
            {ar ? "بلوتزي مجاني للجميع" : "Plotzy is free for everyone"}
          </div>
          <div style={{ fontSize: 12.5, color: "rgba(255,255,255,0.6)", lineHeight: 1.45 }}>
            {ar ? "لو أعجبك، تبرّعك يبقيه مجّاناً للكتّاب الآخرين." : "If it helps you, a donation keeps it free for other writers."}
          </div>
        </div>
        <Arrow size={18} color="rgba(255,255,255,0.5)" style={{ flexShrink: 0 }} />
      </button>
    </div>
  );
}

export function CourseBanner({ ar }: { ar: boolean }) {
  const [, navigate] = useLocation();
  const Arrow = ar ? ArrowLeft : ArrowRight;
  return (
    <div style={{ padding: "0 16px", marginBottom: 26 }}>
      <button
        onClick={() => navigate("/course")}
        dir={ar ? "rtl" : "ltr"}
        style={{
          width: "100%",
          border: "1px solid rgba(255,255,255,0.10)",
          borderRadius: 20,
          padding: "22px",
          cursor: "pointer",
          fontFamily: SF,
          textAlign: ar ? "right" : "left",
          background:
            "radial-gradient(120% 120% at 0% 0%, rgba(56,132,255,0.20), transparent 50%),#0d0d10",
          display: "flex",
          alignItems: "center",
          gap: 16,
          flexDirection: ar ? "row-reverse" : "row",
        }}
      >
        <div
          style={{
            width: 48, height: 48, borderRadius: 14, flexShrink: 0,
            background: "rgba(56,132,255,0.16)", border: "1px solid rgba(56,132,255,0.3)",
            display: "grid", placeItems: "center",
          }}
        >
          <GraduationCap size={22} color="#5eb3ff" />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 16, fontWeight: 800, color: "#fff", marginBottom: 3 }}>
            {ar ? "دورة الكتابة المجانيّة" : "Free Writing Course"}
          </div>
          <div style={{ fontSize: 12.5, color: "rgba(255,255,255,0.6)", lineHeight: 1.45 }}>
            {ar ? "تعلّم كيف تخطّط وتكتب وتنشر كتابك خطوة بخطوة." : "Learn to plot, write, and publish your book, step by step."}
          </div>
        </div>
        <Arrow size={18} color="rgba(255,255,255,0.5)" style={{ flexShrink: 0 }} />
      </button>
    </div>
  );
}

// "Write anywhere" showcase — the same iPad + laptop image the desktop
// landing uses, framed for the phone. Purely visual (no CTA); it sits
// near the bottom of the mobile home as a closing beat.
export function DevicesBanner({ ar }: { ar: boolean }) {
  return (
    <div style={{ padding: "8px 16px 0", marginBottom: 8 }}>
      <div style={{ textAlign: "center", marginBottom: 18 }}>
        <div style={{ fontSize: 22, fontWeight: 800, letterSpacing: "-0.02em", color: "#fff", lineHeight: 1.2, marginBottom: 8 }}>
          {ar ? "اكتب من أي مكان. قصّتك معك دائماً." : "Write anywhere. Your story comes with you."}
        </div>
        <div style={{ fontSize: 13.5, color: "rgba(255,255,255,0.6)", lineHeight: 1.5, maxWidth: 340, margin: "0 auto" }}>
          {ar
            ? "على مكتبك أو على جهازك اللوحي، بلوتزي يتبعك. مزامنة سحابيّة وحفظ لحظي."
            : "At your desk or on your iPad, Plotzy follows you. Cloud sync and instant saving."}
        </div>
      </div>
      <img
        src="/images/devices-showcase.png"
        alt={ar ? "بلوتزي على الآيباد والحاسوب" : "Plotzy on iPad and laptop"}
        loading="lazy"
        style={{ width: "100%", height: "auto", display: "block", borderRadius: 14 }}
      />
    </div>
  );
}

const badgeStyle: React.CSSProperties = {
  width: 34, height: 34, borderRadius: 10,
  background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.10)",
  display: "grid", placeItems: "center",
};
