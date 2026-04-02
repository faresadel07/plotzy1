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
      borderRadius: 14,
      background: "#161616",
      aspectRatio: "16/9",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      gap: 12,
      position: "relative",
      overflow: "hidden",
      cursor: "pointer",
      border: "1px solid rgba(255,255,255,0.07)",
    }}>
      <div style={{
        width: 50, height: 50,
        borderRadius: "50%",
        background: "rgba(255,255,255,0.07)",
        border: "1px solid rgba(255,255,255,0.12)",
        display: "flex", alignItems: "center", justifyContent: "center",
      }}>
        <Play size={18} color="rgba(255,255,255,0.5)" fill="rgba(255,255,255,0.5)" style={{ marginLeft: 3 }} />
      </div>
      <div style={{ textAlign: "center" }}>
        <div style={{ fontFamily: SF, fontSize: 12, fontWeight: 500, color: "rgba(255,255,255,0.5)", marginBottom: 6 }}>
          {title}
        </div>
        <div style={{
          display: "inline-flex", alignItems: "center", gap: 6,
          background: "rgba(255,255,255,0.05)",
          border: "1px solid rgba(255,255,255,0.08)",
          borderRadius: 20, padding: "3px 10px",
        }}>
          <div style={{ width: 5, height: 5, borderRadius: "50%", background: "rgba(255,255,255,0.25)" }} />
          <span style={{ fontFamily: SF, fontSize: 11, color: "rgba(255,255,255,0.3)" }}>
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
        display: "flex", gap: 18, padding: "22px 24px",
        background: "#111", borderRadius: 14,
        border: "1px solid rgba(255,255,255,0.07)",
        alignItems: "flex-start",
      }}
    >
      <div style={{
        flexShrink: 0, width: 42, height: 42, borderRadius: 11,
        background: "rgba(255,255,255,0.05)",
        border: "1px solid rgba(255,255,255,0.08)",
        display: "flex", alignItems: "center", justifyContent: "center",
        position: "relative",
      }}>
        <Icon size={18} color={color} />
        <div style={{
          position: "absolute", top: -7, right: -7,
          width: 18, height: 18, borderRadius: "50%",
          background: color,
          display: "flex", alignItems: "center", justifyContent: "center",
          fontFamily: SF, fontSize: 10, fontWeight: 700, color: "#fff",
        }}>{number}</div>
      </div>
      <div>
        <div style={{ fontFamily: SF, fontSize: 14, fontWeight: 600, color: "rgba(255,255,255,0.88)", marginBottom: 4 }}>
          {title}
        </div>
        <div style={{ fontFamily: SF, fontSize: 13, color: "rgba(255,255,255,0.4)", lineHeight: 1.6 }}>
          {description}
        </div>
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
        background: "#111", borderRadius: 18,
        border: "1px solid rgba(255,255,255,0.07)",
        overflow: "hidden",
      }}
    >
      <div style={{ padding: "22px 22px 18px" }}>
        <div style={{
          width: 38, height: 38, borderRadius: 9,
          background: "rgba(255,255,255,0.05)",
          border: "1px solid rgba(255,255,255,0.08)",
          display: "flex", alignItems: "center", justifyContent: "center",
          marginBottom: 14,
        }}>
          <Icon size={17} color={color} />
        </div>
        <div style={{ fontFamily: SF, fontSize: 14, fontWeight: 600, color: "rgba(255,255,255,0.88)", marginBottom: 6 }}>
          {title}
        </div>
        <div style={{ fontFamily: SF, fontSize: 12.5, color: "rgba(255,255,255,0.4)", lineHeight: 1.6 }}>
          {description}
        </div>
      </div>
      <div style={{ padding: "0 22px 22px" }}>
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
        background: "#111", borderRadius: 13,
        border: "1px solid rgba(255,255,255,0.07)",
        overflow: "hidden",
      }}
    >
      <button
        onClick={() => setOpen(!open)}
        style={{
          width: "100%", display: "flex", alignItems: "center",
          justifyContent: "space-between", padding: "18px 22px",
          background: "none", border: "none", cursor: "pointer",
          fontFamily: SF, fontSize: 13.5, fontWeight: 600,
          color: "rgba(255,255,255,0.88)", textAlign: "left",
          gap: 12,
        }}
      >
        <span>{q}</span>
        <ChevronDown
          size={15} color="rgba(255,255,255,0.3)"
          style={{ transform: open ? "rotate(180deg)" : "rotate(0deg)", transition: "0.2s", flexShrink: 0 }}
        />
      </button>
      {open && (
        <div style={{
          padding: "0 22px 18px",
          fontFamily: SF, fontSize: 13, color: "rgba(255,255,255,0.45)", lineHeight: 1.7,
          borderTop: "1px solid rgba(255,255,255,0.05)",
          paddingTop: 14,
        }}>
          {a}
        </div>
      )}
    </motion.div>
  );
}

/* ─── SECTION LABEL ─── */
function SectionLabel({ icon: Icon, text, color }: { icon: React.ElementType; text: string; color: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
      <Icon size={14} color={color} />
      <span style={{
        fontFamily: SF, fontSize: 11, fontWeight: 600,
        color: "rgba(255,255,255,0.3)", letterSpacing: "0.08em", textTransform: "uppercase",
      }}>{text}</span>
    </div>
  );
}

/* ─── MAIN PAGE ─── */
export default function TutorialPage() {
  const steps = [
    {
      number: 1, icon: BookOpen, color: "#818cf8",
      title: "Create Your Account",
      description: "Sign up for free and get instant access to the writing workspace. No credit card required to get started.",
    },
    {
      number: 2, icon: PenLine, color: "#34d399",
      title: "Start a New Book",
      description: "Click 'New Book' from your library, add a title, genre, and short summary. Your project is created in seconds.",
    },
    {
      number: 3, icon: FileText, color: "#fbbf24",
      title: "Write Your Chapters",
      description: "Use the full-featured writing editor to craft your chapters. Format text, organize your story, and write at your own pace.",
    },
    {
      number: 4, icon: Sparkles, color: "#f472b6",
      title: "Use AI Writing Tools",
      description: "Activate the AI assistant to help expand ideas, improve your prose, detect plot holes, or analyze your pacing.",
    },
    {
      number: 5, icon: Upload, color: "#60a5fa",
      title: "Publish & Share",
      description: "When you're ready, design your cover, export to PDF or ePub, and share your book with readers.",
    },
  ];

  const features = [
    {
      icon: PenLine, color: "#818cf8",
      title: "The Writing Editor",
      description: "A distraction-free rich text editor with formatting, auto-save, and voice recording built in.",
      videoTitle: "Writing editor walkthrough",
      videoDuration: "~4 min",
    },
    {
      icon: Sparkles, color: "#f472b6",
      title: "AI Writing Assistant",
      description: "Expand scenes, polish sentences, continue your draft, or translate passages — all inside the editor.",
      videoTitle: "AI tools in action",
      videoDuration: "~5 min",
    },
    {
      icon: Wand2, color: "#fbbf24",
      title: "AI Analysis Tools",
      description: "Run a plot-hole detector, dialogue coach, pacing analyzer, or character voice check on your manuscript.",
      videoTitle: "Analyzing your manuscript",
      videoDuration: "~6 min",
    },
    {
      icon: Palette, color: "#34d399",
      title: "Cover Designer",
      description: "Generate AI-powered book covers, customize colors and fonts, and download print-ready files.",
      videoTitle: "Designing your cover",
      videoDuration: "~4 min",
    },
    {
      icon: Headphones, color: "#60a5fa",
      title: "Audiobook Studio",
      description: "Convert your manuscript to audio using text-to-speech voices. Preview, edit, and export your audiobook.",
      videoTitle: "Creating an audiobook",
      videoDuration: "~5 min",
    },
    {
      icon: ShoppingBag, color: "#a78bfa",
      title: "Publishing Marketplace",
      description: "Access professional editing, proofreading, marketing, and cover services powered by AI.",
      videoTitle: "Using the marketplace",
      videoDuration: "~3 min",
    },
    {
      icon: BookMarked, color: "#2dd4bf",
      title: "Story Planning Tools",
      description: "Build your world with lore entries, story beats, and character profiles alongside your chapters.",
      videoTitle: "Story planning & lore",
      videoDuration: "~4 min",
    },
    {
      icon: Users, color: "#fb923c",
      title: "Community Library",
      description: "Discover books by other authors, leave reviews, follow writers, and grow your reader audience.",
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
      a: "Not at all. Plotzy is designed for writers of all levels. The AI tools are especially helpful for beginners — they can help you get unstuck, improve your writing, and guide you through story structure.",
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
      a: "Plotzy's interface is available in 14 languages including English, Arabic, French, Spanish, German, Portuguese, Russian, Chinese, Japanese, Korean, Hindi, Turkish, Hebrew, and Persian.",
    },
  ];

  return (
    <Layout>
      <div style={{ fontFamily: SF, background: "#0a0a0a", minHeight: "100vh" }}>

        {/* ─── HERO ─── */}
        <div style={{
          borderBottom: "1px solid rgba(255,255,255,0.07)",
          padding: "100px 24px 72px",
          textAlign: "center",
        }}>
          <motion.div variants={fadeUp} custom={0} initial="hidden" animate="visible">
            <div style={{
              display: "inline-flex", alignItems: "center", gap: 7,
              background: "rgba(255,255,255,0.05)",
              border: "1px solid rgba(255,255,255,0.08)",
              borderRadius: 20, padding: "5px 14px", marginBottom: 28,
            }}>
              <Star size={11} color="rgba(255,255,255,0.4)" fill="rgba(255,255,255,0.4)" />
              <span style={{ fontSize: 11, color: "rgba(255,255,255,0.4)", fontWeight: 500 }}>Learn Plotzy</span>
            </div>
          </motion.div>

          <motion.h1 variants={fadeUp} custom={1} initial="hidden" animate="visible"
            style={{
              fontSize: "clamp(30px, 5vw, 48px)", fontWeight: 700,
              color: "rgba(255,255,255,0.92)", letterSpacing: "-0.03em",
              lineHeight: 1.15, maxWidth: 620, margin: "0 auto 16px",
            }}>
            Everything you need to<br />write your story
          </motion.h1>

          <motion.p variants={fadeUp} custom={2} initial="hidden" animate="visible"
            style={{
              fontSize: 15, color: "rgba(255,255,255,0.38)",
              maxWidth: 480, margin: "0 auto 52px", lineHeight: 1.7,
            }}>
            New to Plotzy? This guide walks you through every feature — from your first chapter to publishing your finished book.
          </motion.p>

          <motion.div variants={fadeUp} custom={3} initial="hidden" animate="visible"
            style={{
              display: "flex", flexWrap: "wrap", justifyContent: "center",
              gap: 48, maxWidth: 500, margin: "0 auto",
            }}>
            {[
              { value: "5", label: "Steps to start" },
              { value: "8", label: "Feature walkthroughs" },
              { value: "Free", label: "To get started" },
            ].map(({ value, label }) => (
              <div key={label} style={{ textAlign: "center" }}>
                <div style={{
                  fontSize: 26, fontWeight: 700,
                  color: "rgba(255,255,255,0.88)", letterSpacing: "-0.02em",
                }}>{value}</div>
                <div style={{ fontSize: 12, color: "rgba(255,255,255,0.28)", marginTop: 3 }}>{label}</div>
              </div>
            ))}
          </motion.div>
        </div>

        <div style={{ maxWidth: 980, margin: "0 auto", padding: "60px 24px 100px" }}>

          {/* ─── GETTING STARTED ─── */}
          <motion.div variants={fadeUp} custom={0} initial="hidden" whileInView="visible" viewport={{ once: true }}
            style={{ marginBottom: 28 }}>
            <SectionLabel icon={CheckCircle2} text="Getting Started" color="rgba(255,255,255,0.3)" />
            <h2 style={{
              fontSize: "clamp(20px, 3vw, 26px)", fontWeight: 700,
              color: "rgba(255,255,255,0.88)", letterSpacing: "-0.02em", marginBottom: 6,
            }}>
              Five steps to your first book
            </h2>
            <p style={{ fontSize: 13, color: "rgba(255,255,255,0.35)", lineHeight: 1.6, maxWidth: 480 }}>
              Follow these steps to go from a blank page to a published book.
            </p>
          </motion.div>

          <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 72 }}>
            {steps.map((step, i) => (
              <StepCard key={step.title} {...step} delay={i * 0.4} />
            ))}
          </div>

          {/* ─── PLATFORM OVERVIEW VIDEO ─── */}
          <motion.div
            variants={fadeUp} custom={0} initial="hidden" whileInView="visible" viewport={{ once: true }}
            style={{
              background: "#111",
              border: "1px solid rgba(255,255,255,0.07)",
              borderRadius: 20, padding: 32, marginBottom: 72,
              display: "grid", gridTemplateColumns: "1fr 1fr", gap: 28,
              alignItems: "center",
            }}
          >
            <div>
              <p style={{
                fontFamily: SF, fontSize: 11, fontWeight: 600,
                color: "rgba(255,255,255,0.25)", letterSpacing: "0.08em",
                textTransform: "uppercase", marginBottom: 16,
              }}>
                Platform Overview
              </p>
              <h3 style={{
                fontSize: 20, fontWeight: 700,
                color: "rgba(255,255,255,0.88)", letterSpacing: "-0.02em", marginBottom: 10,
              }}>
                See the full platform<br />in one video
              </h3>
              <p style={{ fontSize: 13, color: "rgba(255,255,255,0.38)", lineHeight: 1.7, marginBottom: 20 }}>
                A complete walkthrough covering the editor, AI tools, cover designer, marketplace, and community.
              </p>
              <div style={{
                display: "inline-flex", alignItems: "center", gap: 7,
                background: "rgba(255,255,255,0.04)",
                border: "1px solid rgba(255,255,255,0.08)",
                borderRadius: 20, padding: "5px 14px",
              }}>
                <div style={{ width: 5, height: 5, borderRadius: "50%", background: "rgba(255,255,255,0.2)" }} />
                <span style={{ fontSize: 11.5, color: "rgba(255,255,255,0.3)" }}>Coming soon · ~10 min</span>
              </div>
            </div>
            <VideoCard title="Complete Plotzy walkthrough" duration="~10 min" />
          </motion.div>

          {/* ─── FEATURE WALKTHROUGHS ─── */}
          <motion.div variants={fadeUp} custom={0} initial="hidden" whileInView="visible" viewport={{ once: true }}
            style={{ marginBottom: 28 }}>
            <SectionLabel icon={Lightbulb} text="Feature Walkthroughs" color="rgba(255,255,255,0.3)" />
            <h2 style={{
              fontSize: "clamp(20px, 3vw, 26px)", fontWeight: 700,
              color: "rgba(255,255,255,0.88)", letterSpacing: "-0.02em", marginBottom: 6,
            }}>
              Deep dive into every tool
            </h2>
            <p style={{ fontSize: 13, color: "rgba(255,255,255,0.35)", lineHeight: 1.6, maxWidth: 480 }}>
              Short videos for each feature. Tutorial videos will be added once the platform is complete.
            </p>
          </motion.div>

          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(270px, 1fr))",
            gap: 16, marginBottom: 72,
          }}>
            {features.map((f, i) => (
              <FeatureCard key={f.title} {...f} delay={i * 0.25} />
            ))}
          </div>

          {/* ─── QUICK TIPS ─── */}
          <motion.div
            variants={fadeUp} custom={0} initial="hidden" whileInView="visible" viewport={{ once: true }}
            style={{
              background: "#111",
              border: "1px solid rgba(255,255,255,0.07)",
              borderRadius: 18, padding: "32px 36px", marginBottom: 72,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 22 }}>
              <div style={{
                width: 34, height: 34, borderRadius: 9,
                background: "rgba(255,255,255,0.05)",
                border: "1px solid rgba(255,255,255,0.08)",
                display: "flex", alignItems: "center", justifyContent: "center",
              }}>
                <MessageSquare size={15} color="rgba(255,255,255,0.4)" />
              </div>
              <p style={{
                fontFamily: SF, fontSize: 11, fontWeight: 600,
                color: "rgba(255,255,255,0.3)", letterSpacing: "0.08em",
                textTransform: "uppercase", margin: 0,
              }}>Pro Tips</p>
            </div>
            <div style={{
              display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 12,
            }}>
              {[
                "Use keyboard shortcuts in the editor: Ctrl+B for bold, Ctrl+I for italic.",
                "Let auto-save handle it, or press Ctrl+S to save manually at any time.",
                "Use the AI assistant on a highlighted paragraph for the best results.",
                "Set your book language early — it affects AI suggestions and text direction.",
                "Run the Plot Hole Detector after finishing every 3–5 chapters.",
                "Design your cover last — the AI works best with a complete manuscript summary.",
              ].map((tip, i) => (
                <div key={i} style={{
                  display: "flex", gap: 10, alignItems: "flex-start",
                  background: "rgba(255,255,255,0.03)",
                  border: "1px solid rgba(255,255,255,0.06)",
                  borderRadius: 11, padding: "12px 14px",
                }}>
                  <ArrowRight size={12} color="rgba(255,255,255,0.25)" style={{ flexShrink: 0, marginTop: 3 }} />
                  <span style={{ fontFamily: SF, fontSize: 12.5, color: "rgba(255,255,255,0.45)", lineHeight: 1.6 }}>{tip}</span>
                </div>
              ))}
            </div>
          </motion.div>

          {/* ─── FAQ ─── */}
          <motion.div variants={fadeUp} custom={0} initial="hidden" whileInView="visible" viewport={{ once: true }}
            style={{ marginBottom: 28 }}>
            <SectionLabel icon={BarChart2} text="FAQ" color="rgba(255,255,255,0.3)" />
            <h2 style={{
              fontSize: "clamp(20px, 3vw, 26px)", fontWeight: 700,
              color: "rgba(255,255,255,0.88)", letterSpacing: "-0.02em", marginBottom: 6,
            }}>
              Common questions
            </h2>
            <p style={{ fontSize: 13, color: "rgba(255,255,255,0.35)", lineHeight: 1.6, maxWidth: 480 }}>
              Quick answers to things people ask most when they first try Plotzy.
            </p>
          </motion.div>

          <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 72 }}>
            {faqs.map((faq, i) => (
              <FaqItem key={faq.q} {...faq} delay={i * 0.25} />
            ))}
          </div>

          {/* ─── CTA ─── */}
          <motion.div
            variants={fadeUp} custom={0} initial="hidden" whileInView="visible" viewport={{ once: true }}
            style={{
              textAlign: "center",
              background: "#111",
              border: "1px solid rgba(255,255,255,0.09)",
              borderRadius: 20, padding: "52px 40px",
            }}
          >
            <div style={{
              width: 48, height: 48, borderRadius: 12,
              background: "rgba(255,255,255,0.06)",
              border: "1px solid rgba(255,255,255,0.09)",
              display: "flex", alignItems: "center", justifyContent: "center",
              margin: "0 auto 18px",
            }}>
              <Library size={22} color="rgba(255,255,255,0.55)" />
            </div>
            <h3 style={{
              fontSize: 22, fontWeight: 700,
              color: "rgba(255,255,255,0.88)", letterSpacing: "-0.02em", marginBottom: 10,
            }}>
              Ready to write your story?
            </h3>
            <p style={{ fontSize: 13, color: "rgba(255,255,255,0.38)", marginBottom: 26, lineHeight: 1.6 }}>
              Everything you need is already here. Start free — no credit card required.
            </p>
            <a href="/" style={{ textDecoration: "none" }}>
              <button style={{
                background: "rgba(255,255,255,0.92)", color: "#0a0a0a",
                border: "none", borderRadius: 10,
                padding: "11px 28px", fontFamily: SF,
                fontSize: 13, fontWeight: 600, cursor: "pointer",
                display: "inline-flex", alignItems: "center", gap: 7,
              }}>
                <BookOpen size={14} color="#0a0a0a" />
                Go to My Library
              </button>
            </a>
          </motion.div>

        </div>
      </div>
    </Layout>
  );
}
