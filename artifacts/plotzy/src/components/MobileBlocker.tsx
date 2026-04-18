import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { BookOpen, Laptop, Tablet, Smartphone, Sparkles } from "lucide-react";
import { useLanguage } from "@/contexts/language-context";

const BREAKPOINT = 700;

const COPY: Record<string, {
  brand: string;
  tag: string;
  headline: string;
  sub: string;
  workingOn: string;
  devices: string;
  comingSoon: string;
  dir: "ltr" | "rtl";
}> = {
  ar: {
    brand: "Plotzy",
    tag: "منصة الكاتب",
    headline: "افتح من جهاز أكبر",
    sub: "تجربة الكتابة في Plotzy مصممة حاليًا للّابتوب والآيباد. كتابة كتاب تستحق مساحة أوسع.",
    workingOn: "نحن نعمل حاليًا على تحسين تجربة الهاتف",
    devices: "لابتوب  ·  آيباد  ·  تابلت",
    comingSoon: "قريبًا على الهاتف",
    dir: "rtl",
  },
  en: {
    brand: "Plotzy",
    tag: "The Writer's Platform",
    headline: "Open on a larger device",
    sub: "The Plotzy writing experience is currently crafted for laptops and iPads. Writing a book deserves more space.",
    workingOn: "We are actively working on the phone experience",
    devices: "Laptop  ·  iPad  ·  Tablet",
    comingSoon: "Coming soon on mobile",
    dir: "ltr",
  },
};

export default function MobileBlocker() {
  const { lang } = useLanguage();
  const [blocked, setBlocked] = useState<boolean>(() =>
    typeof window !== "undefined" ? window.innerWidth < BREAKPOINT : false
  );

  useEffect(() => {
    const onResize = () => setBlocked(window.innerWidth < BREAKPOINT);
    window.addEventListener("resize", onResize);
    window.addEventListener("orientationchange", onResize);
    return () => {
      window.removeEventListener("resize", onResize);
      window.removeEventListener("orientationchange", onResize);
    };
  }, []);

  const copy = COPY[lang === "ar" ? "ar" : "en"];

  return (
    <AnimatePresence>
      {blocked && (
        <motion.div
          key="mobile-blocker"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
          dir={copy.dir}
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 2147483647,
            backgroundColor: "#0a0a08",
            backgroundImage:
              "radial-gradient(ellipse 80% 50% at 50% 30%, rgba(255,255,255,0.05) 0%, transparent 70%)",
            color: "#EFEFEF",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "32px 22px",
            fontFamily:
              "-apple-system, BlinkMacSystemFont, 'SF Pro Display', 'Helvetica Neue', 'Segoe UI', Arial, sans-serif",
            overflow: "hidden",
          }}
        >
          {/* Subtle grain/vignette */}
          <div
            style={{
              position: "absolute",
              inset: 0,
              background:
                "radial-gradient(circle at 50% 100%, rgba(0,0,0,0.6) 0%, transparent 60%)",
              pointerEvents: "none",
            }}
          />

          {/* ── Brand ── */}
          <motion.div
            initial={{ opacity: 0, y: -12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              opacity: 0.72,
              zIndex: 1,
            }}
          >
            <BookOpen style={{ width: 18, height: 18, color: "#EFEFEF" }} />
            <span
              style={{
                fontSize: 13,
                fontWeight: 600,
                letterSpacing: "0.22em",
                textTransform: "uppercase",
                color: "#EFEFEF",
              }}
            >
              {copy.brand}
            </span>
          </motion.div>

          {/* ── Center content ── */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              textAlign: "center",
              maxWidth: 420,
              zIndex: 1,
            }}
          >
            {/* Device icons illustration */}
            <motion.div
              initial={{ opacity: 0, y: 20, scale: 0.92 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ duration: 0.9, delay: 0.25, ease: [0.16, 1, 0.3, 1] }}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 18,
                marginBottom: 36,
                opacity: 0.9,
              }}
            >
              <div
                style={{
                  width: 58,
                  height: 58,
                  borderRadius: 14,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  background: "rgba(255,255,255,0.03)",
                  border: "1px solid rgba(255,255,255,0.08)",
                }}
              >
                <Smartphone
                  style={{ width: 22, height: 22, color: "rgba(255,255,255,0.3)" }}
                  strokeWidth={1.6}
                />
              </div>
              <div
                style={{
                  fontSize: 18,
                  color: "rgba(255,255,255,0.25)",
                  letterSpacing: "0.2em",
                }}
              >
                →
              </div>
              <div
                style={{
                  width: 58,
                  height: 58,
                  borderRadius: 14,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  background: "rgba(255,255,255,0.06)",
                  border: "1px solid rgba(255,255,255,0.18)",
                  boxShadow: "0 0 30px rgba(255,255,255,0.05)",
                }}
              >
                <Tablet
                  style={{ width: 22, height: 22, color: "#EFEFEF" }}
                  strokeWidth={1.6}
                />
              </div>
              <div
                style={{
                  width: 58,
                  height: 58,
                  borderRadius: 14,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  background: "rgba(255,255,255,0.06)",
                  border: "1px solid rgba(255,255,255,0.18)",
                  boxShadow: "0 0 30px rgba(255,255,255,0.05)",
                }}
              >
                <Laptop
                  style={{ width: 22, height: 22, color: "#EFEFEF" }}
                  strokeWidth={1.6}
                />
              </div>
            </motion.div>

            {/* Headline */}
            <motion.h1
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.9, delay: 0.4, ease: [0.16, 1, 0.3, 1] }}
              style={{
                fontSize: "clamp(1.75rem, 8vw, 2.2rem)",
                fontWeight: 700,
                letterSpacing: "-0.02em",
                lineHeight: 1.15,
                margin: 0,
                marginBottom: 14,
                color: "#EFEFEF",
              }}
            >
              {copy.headline}
            </motion.h1>

            {/* Subheading */}
            <motion.p
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.9, delay: 0.55, ease: [0.16, 1, 0.3, 1] }}
              style={{
                fontSize: "clamp(0.95rem, 4vw, 1.05rem)",
                fontWeight: 400,
                lineHeight: 1.6,
                color: "rgba(255,255,255,0.55)",
                margin: 0,
                marginBottom: 24,
                maxWidth: 340,
              }}
            >
              {copy.sub}
            </motion.p>

            {/* Device list */}
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.9, delay: 0.7, ease: [0.16, 1, 0.3, 1] }}
              style={{
                fontSize: 11,
                fontWeight: 600,
                letterSpacing: "0.24em",
                textTransform: "uppercase",
                color: "rgba(255,255,255,0.35)",
                margin: 0,
              }}
            >
              {copy.devices}
            </motion.p>
          </div>

          {/* ── Footer: working-on notice ── */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.9, delay: 0.85, ease: [0.16, 1, 0.3, 1] }}
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 8,
              zIndex: 1,
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                padding: "8px 16px",
                borderRadius: 999,
                background: "rgba(255,255,255,0.04)",
                border: "1px solid rgba(255,255,255,0.08)",
              }}
            >
              <Sparkles
                style={{ width: 13, height: 13, color: "rgba(255,255,255,0.55)" }}
                strokeWidth={1.8}
              />
              <span
                style={{
                  fontSize: 12,
                  color: "rgba(255,255,255,0.7)",
                  fontWeight: 500,
                }}
              >
                {copy.workingOn}
              </span>
            </div>
            <span
              style={{
                fontSize: 10,
                fontWeight: 600,
                letterSpacing: "0.28em",
                textTransform: "uppercase",
                color: "rgba(255,255,255,0.25)",
              }}
            >
              {copy.comingSoon}
            </span>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
