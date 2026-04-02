import { useState } from "react";
import { Layout } from "@/components/layout";
import { motion } from "framer-motion";
import {
  BookOpen, PenLine, Sparkles, Upload, Star, ChevronDown,
  Play, Library, Wand2, BarChart2, Palette, Headphones,
  Users, ShoppingBag, BookMarked, CheckCircle2, ArrowRight,
  Lightbulb, FileText, MessageSquare,
} from "lucide-react";

const SF = "-apple-system, BlinkMacSystemFont, 'SF Pro Text', 'Helvetica Neue', sans-serif";

const fadeUp = {
  hidden: { opacity: 0, y: 28 },
  visible: (i = 0) => ({
    opacity: 1, y: 0,
    transition: { delay: i * 0.08, duration: 0.5, ease: "easeOut" },
  }),
};

/* ─── VIDEO PLACEHOLDER ─── */
function VideoCard({ title, duration }: { title: string; duration: string }) {
  return (
    <div style={{
      borderRadius: 16,
      background: "linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)",
      aspectRatio: "16/9",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      gap: 12,
      position: "relative",
      overflow: "hidden",
      cursor: "pointer",
      border: "1px solid rgba(255,255,255,0.08)",
    }}>
      <div style={{
        position: "absolute", inset: 0,
        background: "radial-gradient(circle at 30% 50%, rgba(99,102,241,0.15) 0%, transparent 60%)",
      }} />
      <div style={{
        width: 56, height: 56,
        borderRadius: "50%",
        background: "rgba(255,255,255,0.12)",
        backdropFilter: "blur(8px)",
        display: "flex", alignItems: "center", justifyContent: "center",
        border: "1px solid rgba(255,255,255,0.2)",
      }}>
        <Play size={22} color="#fff" fill="#fff" style={{ marginLeft: 3 }} />
      </div>
      <div style={{ textAlign: "center", zIndex: 1 }}>
        <div style={{
          fontFamily: SF, fontSize: 13, fontWeight: 600,
          color: "rgba(255,255,255,0.9)", marginBottom: 4,
        }}>{title}</div>
        <div style={{
          display: "inline-flex", alignItems: "center", gap: 6,
          background: "rgba(255,255,255,0.08)",
          borderRadius: 20, padding: "3px 10px",
        }}>
          <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#f59e0b" }} />
          <span style={{ fontFamily: SF, fontSize: 11, color: "rgba(255,255,255,0.6)" }}>
            Coming soon · {duration}
          </span>
        </div>
      </div>
    </div>
  );
}

/* ─── STEP CARD ─── */
function StepCard({
  number, icon: Icon, title, description, color, delay,
}: {
  number: number; icon: React.ElementType; title: string;
  description: string; color: string; delay: number;
}) {
  return (
    <motion.div
      variants={fadeUp} custom={delay} initial="hidden" whileInView="visible" viewport={{ once: true }}
      style={{
        display: "flex", gap: 20, padding: "24px 28px",
        background: "#fff", borderRadius: 16,
        border: "1px solid rgba(0,0,0,0.07)",
        boxShadow: "0 2px 12px rgba(0,0,0,0.04)",
        alignItems: "flex-start",
      }}
    >
      <div style={{
        flexShrink: 0, width: 44, height: 44, borderRadius: 12,
        background: color + "14",
        display: "flex", alignItems: "center", justifyContent: "center",
        position: "relative",
      }}>
        <Icon size={20} color={color} />
        <div style={{
          position: "absolute", top: -6, right: -6,
          width: 20, height: 20, borderRadius: "50%",
          background: color, display: "flex", alignItems: "center", justifyContent: "center",
          fontFamily: SF, fontSize: 10, fontWeight: 700, color: "#fff",
        }}>{number}</div>
      </div>
      <div>
        <div style={{ fontFamily: SF, fontSize: 15, fontWeight: 600, color: "#111", marginBottom: 4 }}>{title}</div>
        <div style={{ fontFamily: SF, fontSize: 13, color: "#666", lineHeight: 1.6 }}>{description}</div>
      </div>
    </motion.div>
  );
}

/* ─── FEATURE CARD ─── */
function FeatureCard({
  icon: Icon, title, description, videoTitle, videoDuration, color, delay,
}: {
  icon: React.ElementType; title: string; description: string;
  videoTitle: string; videoDuration: string; color: string; delay: number;
}) {
  return (
    <motion.div
      variants={fadeUp} custom={delay} initial="hidden" whileInView="visible" viewport={{ once: true }}
      style={{
        background: "#fff", borderRadius: 20,
        border: "1px solid rgba(0,0,0,0.07)",
        overflow: "hidden",
        boxShadow: "0 4px 20px rgba(0,0,0,0.05)",
      }}
    >
      <div style={{ padding: "24px 24px 20px" }}>
        <div style={{
          width: 42, height: 42, borderRadius: 10,
          background: color + "14",
          display: "flex", alignItems: "center", justifyContent: "center",
          marginBottom: 14,
        }}>
          <Icon size={20} color={color} />
        </div>
        <div style={{ fontFamily: SF, fontSize: 16, fontWeight: 600, color: "#111", marginBottom: 8 }}>{title}</div>
        <div style={{ fontFamily: SF, fontSize: 13, color: "#666", lineHeight: 1.6 }}>{description}</div>
      </div>
      <div style={{ padding: "0 24px 24px" }}>
        <VideoCard title={videoTitle} duration={videoDuration} />
      </div>
    </motion.div>
  );
}

/* ─── FAQ ITEM ─── */
function FaqItem({ q, a, delay }: { q: string; a: string; delay: number }) {
  const [open, setOpen] = useState(false);
  return (
    <motion.div
      variants={fadeUp} custom={delay} initial="hidden" whileInView="visible" viewport={{ once: true }}
      style={{
        background: "#fff", borderRadius: 14,
        border: "1px solid rgba(0,0,0,0.07)",
        overflow: "hidden",
        boxShadow: "0 2px 8px rgba(0,0,0,0.03)",
      }}
    >
      <button
        onClick={() => setOpen(!open)}
        style={{
          width: "100%", display: "flex", alignItems: "center",
          justifyContent: "space-between", padding: "18px 22px",
          background: "none", border: "none", cursor: "pointer",
          fontFamily: SF, fontSize: 14, fontWeight: 600, color: "#111",
          textAlign: "left",
        }}
      >
        {q}
        <ChevronDown
          size={16} color="#888"
          style={{ transform: open ? "rotate(180deg)" : "rotate(0deg)", transition: "0.2s" }}
        />
      </button>
      {open && (
        <div style={{ padding: "0 22px 18px", fontFamily: SF, fontSize: 13, color: "#555", lineHeight: 1.7 }}>
          {a}
        </div>
      )}
    </motion.div>
  );
}

/* ─── MAIN PAGE ─── */
export default function TutorialPage() {
  const steps = [
    {
      number: 1, icon: BookOpen, color: "#6366f1",
      title: "Create Your Account",
      description: "Sign up for free and get instant access to the writing workspace. No credit card required to get started.",
    },
    {
      number: 2, icon: PenLine, color: "#10b981",
      title: "Start a New Book",
      description: "Click 'New Book' from your library, add a title, genre, and short summary. Your project is created in seconds.",
    },
    {
      number: 3, icon: FileText, color: "#f59e0b",
      title: "Write Your Chapters",
      description: "Use the full-featured writing editor to craft your chapters. Format text, organize your story, and write at your own pace.",
    },
    {
      number: 4, icon: Sparkles, color: "#ec4899",
      title: "Use AI Writing Tools",
      description: "Activate the AI assistant to help expand ideas, improve your prose, detect plot holes, or analyze your pacing.",
    },
    {
      number: 5, icon: Upload, color: "#3b82f6",
      title: "Publish & Share",
      description: "When you're ready, design your cover, export to PDF or ePub, and share your book with readers.",
    },
  ];

  const features = [
    {
      icon: PenLine, color: "#6366f1",
      title: "The Writing Editor",
      description: "A distraction-free, Google Docs-style rich text editor with formatting, auto-save, and voice recording built in.",
      videoTitle: "Writing editor walkthrough",
      videoDuration: "~4 min",
    },
    {
      icon: Sparkles, color: "#ec4899",
      title: "AI Writing Assistant",
      description: "Get help expanding scenes, polishing sentences, continuing your draft, or translating passages — all inside the editor.",
      videoTitle: "AI tools in action",
      videoDuration: "~5 min",
    },
    {
      icon: Wand2, color: "#f59e0b",
      title: "AI Analysis Tools",
      description: "Run a plot-hole detector, dialogue coach, pacing analyzer, or character voice check across your entire manuscript.",
      videoTitle: "Analyzing your manuscript",
      videoDuration: "~6 min",
    },
    {
      icon: Palette, color: "#10b981",
      title: "Cover Designer",
      description: "Generate stunning AI-powered book covers, customize colors and fonts, and download print-ready files.",
      videoTitle: "Designing your cover",
      videoDuration: "~4 min",
    },
    {
      icon: Headphones, color: "#3b82f6",
      title: "Audiobook Studio",
      description: "Convert your manuscript to audio using text-to-speech voices. Preview, edit, and export your audiobook.",
      videoTitle: "Creating an audiobook",
      videoDuration: "~5 min",
    },
    {
      icon: ShoppingBag, color: "#8b5cf6",
      title: "Publishing Marketplace",
      description: "Access professional editing, proofreading, marketing, and cover services powered by AI and human professionals.",
      videoTitle: "Using the marketplace",
      videoDuration: "~3 min",
    },
    {
      icon: BookMarked, color: "#14b8a6",
      title: "Story Planning Tools",
      description: "Build your world with lore entries, story beats, and character profiles — all organized alongside your chapters.",
      videoTitle: "Story planning & lore",
      videoDuration: "~4 min",
    },
    {
      icon: Users, color: "#f97316",
      title: "Community Library",
      description: "Discover books written by other authors, leave reviews, follow writers, and build your reader audience.",
      videoTitle: "Exploring the community",
      videoDuration: "~3 min",
    },
  ];

  const faqs = [
    {
      q: "Is Plotzy free to use?",
      a: "Yes — you can create an account, write chapters, and use the core editor completely free. Some advanced AI features and publishing tools require a Pro subscription or a one-time payment.",
    },
    {
      q: "Do I need writing experience to use Plotzy?",
      a: "Not at all. Plotzy is designed for writers of all levels. The AI tools are especially helpful for beginners — they can help you get unstuck, improve your writing, and guide you through the story structure.",
    },
    {
      q: "Can I export my book?",
      a: "Yes. You can download your book as a PDF or ePub file, ready for self-publishing on platforms like Amazon KDP or your own website.",
    },
    {
      q: "How does the AI writing assistant work?",
      a: "The AI assistant is integrated directly into the writing editor. Highlight any text or position your cursor and choose from options like 'Continue writing', 'Polish text', 'Expand idea', or 'Translate'. It works on your existing prose and respects your voice.",
    },
    {
      q: "Is my writing private?",
      a: "Yes — all your books are private by default. You choose when and what to share with the community. Only books you explicitly publish appear in the Community Library.",
    },
    {
      q: "What languages does Plotzy support?",
      a: "Plotzy's interface is available in 14 languages including English, Arabic, French, Spanish, German, Portuguese, Russian, Chinese, Japanese, Korean, Hindi, Turkish, Hebrew, and Persian. You can also write your book in any language.",
    },
  ];

  return (
    <Layout>
      <div style={{ fontFamily: SF, background: "#f9f9f9", minHeight: "100vh" }}>

        {/* ─── HERO ─── */}
        <div style={{
          background: "linear-gradient(160deg, #1a1a2e 0%, #16213e 40%, #0f3460 100%)",
          paddingTop: 120, paddingBottom: 80, paddingLeft: 24, paddingRight: 24,
          textAlign: "center",
        }}>
          <motion.div variants={fadeUp} custom={0} initial="hidden" animate="visible">
            <div style={{
              display: "inline-flex", alignItems: "center", gap: 8,
              background: "rgba(99,102,241,0.2)", borderRadius: 20,
              padding: "6px 16px", marginBottom: 24,
              border: "1px solid rgba(99,102,241,0.3)",
            }}>
              <Star size={13} color="#a5b4fc" fill="#a5b4fc" />
              <span style={{ fontSize: 12, color: "#a5b4fc", fontWeight: 500 }}>Learn Plotzy</span>
            </div>
          </motion.div>

          <motion.h1 variants={fadeUp} custom={1} initial="hidden" animate="visible"
            style={{
              fontSize: "clamp(32px, 5vw, 52px)", fontWeight: 700,
              color: "#fff", letterSpacing: "-0.03em", lineHeight: 1.15,
              maxWidth: 680, margin: "0 auto 20px",
            }}>
            Everything you need to<br />
            <span style={{ color: "#818cf8" }}>write your story</span>
          </motion.h1>

          <motion.p variants={fadeUp} custom={2} initial="hidden" animate="visible"
            style={{
              fontSize: 17, color: "rgba(255,255,255,0.6)", maxWidth: 520,
              margin: "0 auto 48px", lineHeight: 1.7,
            }}>
            New to Plotzy? This guide walks you through every feature — from your first chapter to publishing your finished book.
          </motion.p>

          {/* overview stats */}
          <motion.div variants={fadeUp} custom={3} initial="hidden" animate="visible"
            style={{
              display: "flex", flexWrap: "wrap", justifyContent: "center",
              gap: 32, maxWidth: 540, margin: "0 auto",
            }}>
            {[
              { value: "5", label: "Easy steps to start" },
              { value: "8", label: "Feature walkthroughs" },
              { value: "Free", label: "To get started" },
            ].map(({ value, label }) => (
              <div key={label} style={{ textAlign: "center" }}>
                <div style={{ fontSize: 28, fontWeight: 700, color: "#fff", letterSpacing: "-0.02em" }}>{value}</div>
                <div style={{ fontSize: 12, color: "rgba(255,255,255,0.5)", marginTop: 2 }}>{label}</div>
              </div>
            ))}
          </motion.div>
        </div>

        <div style={{ maxWidth: 1000, margin: "0 auto", padding: "60px 24px 100px" }}>

          {/* ─── GETTING STARTED ─── */}
          <motion.div variants={fadeUp} custom={0} initial="hidden" whileInView="visible" viewport={{ once: true }}
            style={{ marginBottom: 12 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
              <CheckCircle2 size={18} color="#6366f1" />
              <span style={{ fontSize: 12, fontWeight: 600, color: "#6366f1", letterSpacing: "0.05em", textTransform: "uppercase" }}>
                Getting Started
              </span>
            </div>
            <h2 style={{
              fontSize: "clamp(22px, 3vw, 30px)", fontWeight: 700,
              color: "#111", letterSpacing: "-0.02em", marginBottom: 6,
            }}>
              Five steps to your first book
            </h2>
            <p style={{ fontSize: 14, color: "#777", lineHeight: 1.6, maxWidth: 540, marginBottom: 32 }}>
              Follow these steps to go from a blank page to a published book. Each step takes just a few minutes.
            </p>
          </motion.div>

          <div style={{ display: "flex", flexDirection: "column", gap: 14, marginBottom: 72 }}>
            {steps.map((step, i) => (
              <StepCard key={step.title} {...step} delay={i * 0.5} />
            ))}
          </div>

          {/* ─── PLATFORM OVERVIEW VIDEO ─── */}
          <motion.div
            variants={fadeUp} custom={0} initial="hidden" whileInView="visible" viewport={{ once: true }}
            style={{
              background: "linear-gradient(135deg, #1a1a2e, #0f3460)",
              borderRadius: 24, padding: 36, marginBottom: 72,
              display: "grid", gridTemplateColumns: "1fr 1fr", gap: 32,
              alignItems: "center",
            }}
          >
            <div>
              <div style={{
                display: "inline-flex", alignItems: "center", gap: 8,
                background: "rgba(99,102,241,0.2)", borderRadius: 20,
                padding: "5px 14px", marginBottom: 16,
                border: "1px solid rgba(99,102,241,0.3)",
              }}>
                <Play size={11} color="#a5b4fc" fill="#a5b4fc" />
                <span style={{ fontSize: 11, color: "#a5b4fc", fontWeight: 500 }}>Platform Overview</span>
              </div>
              <h3 style={{ fontSize: 22, fontWeight: 700, color: "#fff", letterSpacing: "-0.02em", marginBottom: 12 }}>
                See the full platform<br />in one video
              </h3>
              <p style={{ fontSize: 13, color: "rgba(255,255,255,0.55)", lineHeight: 1.7, marginBottom: 20 }}>
                A complete walkthrough of Plotzy — covering the editor, AI tools, cover designer, marketplace, and community features.
              </p>
              <div style={{
                display: "inline-flex", alignItems: "center", gap: 8,
                background: "rgba(255,255,255,0.08)",
                border: "1px solid rgba(255,255,255,0.12)",
                borderRadius: 20, padding: "6px 16px",
              }}>
                <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#f59e0b" }} />
                <span style={{ fontSize: 12, color: "rgba(255,255,255,0.5)" }}>Video coming soon · ~10 min</span>
              </div>
            </div>
            <VideoCard title="Complete Plotzy walkthrough" duration="~10 min" />
          </motion.div>

          {/* ─── FEATURE WALKTHROUGHS ─── */}
          <motion.div variants={fadeUp} custom={0} initial="hidden" whileInView="visible" viewport={{ once: true }}
            style={{ marginBottom: 12 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
              <Lightbulb size={18} color="#f59e0b" />
              <span style={{ fontSize: 12, fontWeight: 600, color: "#f59e0b", letterSpacing: "0.05em", textTransform: "uppercase" }}>
                Feature Walkthroughs
              </span>
            </div>
            <h2 style={{
              fontSize: "clamp(22px, 3vw, 30px)", fontWeight: 700,
              color: "#111", letterSpacing: "-0.02em", marginBottom: 6,
            }}>
              Deep dive into every tool
            </h2>
            <p style={{ fontSize: 14, color: "#777", lineHeight: 1.6, maxWidth: 540, marginBottom: 32 }}>
              Short videos explaining each feature in detail. Tutorial videos will be added once the platform is complete.
            </p>
          </motion.div>

          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
            gap: 20, marginBottom: 72,
          }}>
            {features.map((f, i) => (
              <FeatureCard key={f.title} {...f} delay={i * 0.3} />
            ))}
          </div>

          {/* ─── QUICK TIPS ─── */}
          <motion.div
            variants={fadeUp} custom={0} initial="hidden" whileInView="visible" viewport={{ once: true }}
            style={{
              background: "linear-gradient(135deg, #ecfdf5, #d1fae5)",
              borderRadius: 20, padding: "36px 40px", marginBottom: 72,
              border: "1px solid rgba(16,185,129,0.15)",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 20 }}>
              <div style={{
                width: 36, height: 36, borderRadius: 9,
                background: "rgba(16,185,129,0.15)",
                display: "flex", alignItems: "center", justifyContent: "center",
              }}>
                <MessageSquare size={18} color="#10b981" />
              </div>
              <span style={{ fontSize: 15, fontWeight: 600, color: "#065f46" }}>Pro Tips</span>
            </div>
            <div style={{
              display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 16,
            }}>
              {[
                { tip: "Use keyboard shortcuts in the editor: Ctrl+B for bold, Ctrl+I for italic." },
                { tip: "Save often by pressing Ctrl+S — or let auto-save handle it every 30 seconds." },
                { tip: "Use the AI assistant on a highlighted paragraph for the best results." },
                { tip: "Set your book language early — it affects AI suggestions and text direction." },
                { tip: "Try the Plot Hole Detector after finishing every 3–5 chapters." },
                { tip: "Design your cover last — the AI works best with a complete manuscript summary." },
              ].map(({ tip }, i) => (
                <div key={i} style={{
                  display: "flex", gap: 10, alignItems: "flex-start",
                  background: "rgba(255,255,255,0.6)", borderRadius: 12,
                  padding: "14px 16px",
                }}>
                  <ArrowRight size={14} color="#10b981" style={{ flexShrink: 0, marginTop: 2 }} />
                  <span style={{ fontSize: 13, color: "#065f46", lineHeight: 1.6 }}>{tip}</span>
                </div>
              ))}
            </div>
          </motion.div>

          {/* ─── FAQ ─── */}
          <motion.div variants={fadeUp} custom={0} initial="hidden" whileInView="visible" viewport={{ once: true }}
            style={{ marginBottom: 12 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
              <BarChart2 size={18} color="#3b82f6" />
              <span style={{ fontSize: 12, fontWeight: 600, color: "#3b82f6", letterSpacing: "0.05em", textTransform: "uppercase" }}>
                FAQ
              </span>
            </div>
            <h2 style={{
              fontSize: "clamp(22px, 3vw, 30px)", fontWeight: 700,
              color: "#111", letterSpacing: "-0.02em", marginBottom: 6,
            }}>
              Common questions
            </h2>
            <p style={{ fontSize: 14, color: "#777", lineHeight: 1.6, maxWidth: 540, marginBottom: 32 }}>
              Quick answers to the things people ask most when they first try Plotzy.
            </p>
          </motion.div>

          <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 72 }}>
            {faqs.map((faq, i) => (
              <FaqItem key={faq.q} {...faq} delay={i * 0.3} />
            ))}
          </div>

          {/* ─── CTA ─── */}
          <motion.div
            variants={fadeUp} custom={0} initial="hidden" whileInView="visible" viewport={{ once: true }}
            style={{
              textAlign: "center",
              background: "linear-gradient(135deg, #6366f1, #8b5cf6)",
              borderRadius: 24, padding: "56px 40px",
            }}
          >
            <div style={{
              width: 56, height: 56, borderRadius: 14,
              background: "rgba(255,255,255,0.15)",
              display: "flex", alignItems: "center", justifyContent: "center",
              margin: "0 auto 20px",
            }}>
              <Library size={26} color="#fff" />
            </div>
            <h3 style={{
              fontSize: 26, fontWeight: 700, color: "#fff",
              letterSpacing: "-0.02em", marginBottom: 12,
            }}>
              Ready to write your story?
            </h3>
            <p style={{ fontSize: 14, color: "rgba(255,255,255,0.7)", marginBottom: 28, lineHeight: 1.6 }}>
              Everything you need is already here. Start free — no credit card required.
            </p>
            <a href="/" style={{ textDecoration: "none" }}>
              <button style={{
                background: "#fff", color: "#6366f1",
                border: "none", borderRadius: 12,
                padding: "13px 32px", fontFamily: SF,
                fontSize: 14, fontWeight: 600, cursor: "pointer",
                display: "inline-flex", alignItems: "center", gap: 8,
              }}>
                <BookOpen size={16} color="#6366f1" />
                Go to My Library
              </button>
            </a>
          </motion.div>

        </div>
      </div>
    </Layout>
  );
}
