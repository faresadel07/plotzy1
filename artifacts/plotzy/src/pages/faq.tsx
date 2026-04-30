import { useEffect, useMemo } from "react";
import { Layout } from "@/components/layout";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  Sparkles, BookOpen, Cpu, CreditCard, Globe,
  Headphones, Shield, Settings, Mail,
} from "lucide-react";
import { FAQ_CATEGORIES, type FaqCategory } from "@/data/faq-data";

const SF = "-apple-system, BlinkMacSystemFont, 'SF Pro Text', 'Helvetica Neue', sans-serif";

const BG = "#000";
const C2 = "#0a0a0a";
const C3 = "#111";
const B = "rgba(255,255,255,0.07)";
const T = "rgba(255,255,255,0.92)";
const TS = "rgba(255,255,255,0.55)";
const TD = "rgba(255,255,255,0.30)";

type IconCmp = typeof BookOpen;

// Lucide icon per category. Kept here (not in faq-data.ts) so the data
// file stays free of React/UI imports — it can be consumed by any
// surface that wants to render the same Q/A.
const CATEGORY_ICONS: Record<string, IconCmp> = {
  "getting-started": Sparkles,
  "writing-and-books": BookOpen,
  "ai-assistant": Cpu,
  pricing: CreditCard,
  "publishing-and-marketplace": Globe,
  "audiobook-studio": Headphones,
  "privacy-and-data": Shield,
  "account-and-technical": Settings,
};

export default function FaqPage() {
  // Scroll to the hash target on first mount (e.g. /faq#pricing). Run
  // after a tick so the lazy-loaded section has actually rendered.
  useEffect(() => {
    if (typeof window === "undefined") return;
    const hash = window.location.hash?.slice(1);
    if (!hash) return;
    const id = setTimeout(() => {
      const el = document.getElementById(hash);
      if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 80);
    return () => clearTimeout(id);
  }, []);

  const allCategories = useMemo(() => FAQ_CATEGORIES, []);

  return (
    <Layout darkNav>
      <div style={{ background: BG, color: T, fontFamily: SF, minHeight: "100vh" }}>
        {/* ── Hero ── */}
        <section style={{ borderBottom: `1px solid ${B}` }}>
          <div style={{ maxWidth: 980, margin: "0 auto", padding: "72px 24px 56px" }}>
            <div style={{ fontSize: 11, letterSpacing: "0.18em", textTransform: "uppercase", color: TD, fontWeight: 600, marginBottom: 18 }}>
              FAQ
            </div>
            <h1 style={{ fontSize: "clamp(34px, 5vw, 52px)", fontWeight: 700, letterSpacing: "-0.025em", lineHeight: 1.05, color: T, margin: 0, marginBottom: 18 }}>
              Frequently asked questions.
            </h1>
            <p style={{ fontSize: 16, lineHeight: 1.6, color: TS, maxWidth: 640, margin: 0 }}>
              Honest answers about how Plotzy works today, what's on the
              roadmap, and what we don't do. Every answer here corresponds to
              actual product behaviour. If you find one that doesn't match what
              you see in the app, that's a bug we want to know about.
            </p>
          </div>
        </section>

        {/* ── Quick-jump navigation ── */}
        <section style={{ borderBottom: `1px solid ${B}`, background: C2 }}>
          <div style={{ maxWidth: 980, margin: "0 auto", padding: "20px 24px" }}>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {allCategories.map((cat) => {
                const Icon = CATEGORY_ICONS[cat.id] ?? BookOpen;
                return (
                  <a
                    key={cat.id}
                    href={`#${cat.id}`}
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 8,
                      padding: "8px 14px",
                      borderRadius: 999,
                      border: `1px solid ${B}`,
                      fontSize: 12,
                      fontWeight: 500,
                      color: T,
                      background: C3,
                      textDecoration: "none",
                      transition: "background 0.15s, border-color 0.15s",
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = "#1a1a1a";
                      e.currentTarget.style.borderColor = "rgba(255,255,255,0.12)";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = C3;
                      e.currentTarget.style.borderColor = B;
                    }}
                  >
                    <Icon size={13} style={{ color: TS }} />
                    {cat.title}
                  </a>
                );
              })}
            </div>
          </div>
        </section>

        {/* ── Category sections ── */}
        <div style={{ maxWidth: 980, margin: "0 auto", padding: "48px 24px" }}>
          {allCategories.map((cat) => (
            <CategorySection key={cat.id} category={cat} />
          ))}
        </div>

        {/* ── Bottom CTA ── */}
        <section style={{ borderTop: `1px solid ${B}`, background: C2 }}>
          <div style={{ maxWidth: 980, margin: "0 auto", padding: "56px 24px", textAlign: "center" }}>
            <Mail size={28} style={{ color: TS, margin: "0 auto 16px", display: "block" }} />
            <h2 style={{ fontSize: 22, fontWeight: 700, color: T, marginBottom: 10, letterSpacing: "-0.01em" }}>
              Still have questions?
            </h2>
            <p style={{ fontSize: 14, color: TS, marginBottom: 22, maxWidth: 480, margin: "0 auto 22px" }}>
              We read every email. Premium subscribers get priority response;
              everyone else hears back within a business day.
            </p>
            <a
              href="mailto:faresadel@gmail.com"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
                padding: "12px 22px",
                borderRadius: 10,
                background: "#fff",
                color: "#000",
                fontSize: 13,
                fontWeight: 600,
                textDecoration: "none",
                letterSpacing: "-0.01em",
              }}
            >
              <Mail size={14} />
              faresadel@gmail.com
            </a>
          </div>
        </section>
      </div>
    </Layout>
  );
}

function CategorySection({ category }: { category: FaqCategory }) {
  const Icon = CATEGORY_ICONS[category.id] ?? BookOpen;
  return (
    <section id={category.id} style={{ marginBottom: 56, scrollMarginTop: 96 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 8 }}>
        <div
          style={{
            width: 32,
            height: 32,
            borderRadius: 8,
            background: "rgba(255,255,255,0.04)",
            border: `1px solid ${B}`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Icon size={16} style={{ color: T }} />
        </div>
        <h2 style={{ fontSize: 22, fontWeight: 700, color: T, margin: 0, letterSpacing: "-0.015em" }}>
          {category.title}
        </h2>
      </div>
      <p style={{ fontSize: 13, color: TS, marginBottom: 18, marginLeft: 44 }}>
        {category.description}
      </p>

      <Accordion
        type="multiple"
        style={{
          background: C2,
          border: `1px solid ${B}`,
          borderRadius: 12,
          overflow: "hidden",
        }}
      >
        {category.items.map((item, idx) => (
          <AccordionItem
            key={item.id}
            value={item.id}
            className="border-b-0"
            style={{
              borderBottom: idx === category.items.length - 1 ? "none" : `1px solid ${B}`,
            }}
          >
            <AccordionTrigger
              className="px-5 hover:no-underline text-left"
              style={{ color: T, fontWeight: 500, fontSize: 14.5 }}
            >
              {item.question}
            </AccordionTrigger>
            <AccordionContent
              className="px-5"
              style={{ color: TS, fontSize: 14, lineHeight: 1.65, paddingBottom: 18 }}
            >
              {item.answer}
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
    </section>
  );
}
