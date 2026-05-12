import { Link } from "wouter";
import { ArrowRight, ArrowLeft } from "lucide-react";
import { Layout } from "@/components/layout";
import { SEO } from "@/components/SEO";

const SF = "-apple-system, BlinkMacSystemFont, 'SF Pro Display', 'SF Pro Text', 'Helvetica Neue', sans-serif";

interface Pillar {
  title: string;
  desc: string;
}

const PILLARS: Pillar[] = [
  {
    title: "Write without distraction",
    desc: "A full-screen editor designed for the way real writers think. No banners, no clutter, just the page and your words.",
  },
  {
    title: "AI that respects your work",
    desc: "Polish, expand, continue, translate. Every AI feature runs on your terms and never trains on your manuscripts.",
  },
  {
    title: "Design your own cover",
    desc: "A complete cover designer built into the platform. Generate AI artwork or upload your own. Export print-ready files in minutes.",
  },
  {
    title: "Turn your book into audio",
    desc: "Pick from ten AI voices, preview every chapter, and export professional audiobook files ready for distribution.",
  },
  {
    title: "Reach a real audience",
    desc: "A community library where writers publish, readers discover, and conversations begin. Built into the platform from day one.",
  },
  {
    title: "Track your story bible",
    desc: "Characters, locations, timelines, and lore in one structured place. Linked to your chapters so the world stays consistent.",
  },
  {
    title: "See your book printed",
    desc: "A two-page print preview with real margins and chapter breaks. Know exactly how your book will feel before you publish.",
  },
  {
    title: "Write in your language",
    desc: "Full support for thirteen languages including Arabic, with right-to-left layouts handled correctly throughout the platform.",
  },
];

export default function About() {
  return (
    <Layout>
      <SEO
        title="About"
        description="Plotzy is built by Faris Adel, a solo founder from Jordan, on a mission to give writers one complete platform for their entire journey."
      />

      <div style={{ minHeight: "100vh", background: "#0A0A0A", color: "#fff", fontFamily: SF }}>

        {/* ===== BACK BUTTON (fixed, top-left) ===== */}
        <button
          type="button"
          onClick={() => {
            if (window.history.length > 1) window.history.back();
            else window.location.href = "/";
          }}
          aria-label="Go back"
          style={{
            position: "fixed",
            top: 76,
            left: 20,
            zIndex: 50,
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
            padding: "10px 16px",
            borderRadius: 999,
            background: "rgba(20,20,20,0.85)",
            backdropFilter: "blur(12px)",
            WebkitBackdropFilter: "blur(12px)",
            border: "1px solid rgba(255,255,255,0.1)",
            color: "rgba(255,255,255,0.85)",
            fontWeight: 600,
            fontSize: 13,
            cursor: "pointer",
            transition: "all 0.2s",
            fontFamily: SF,
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = "rgba(35,35,35,0.95)";
            e.currentTarget.style.borderColor = "rgba(255,255,255,0.2)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = "rgba(20,20,20,0.85)";
            e.currentTarget.style.borderColor = "rgba(255,255,255,0.1)";
          }}
        >
          <ArrowLeft style={{ width: 14, height: 14 }} />
          Back
        </button>

        {/* ===== HERO ===== */}
        <section style={{ padding: "80px 24px 40px", textAlign: "center", maxWidth: 880, margin: "0 auto" }}>
          <p style={{
            fontSize: 13,
            fontWeight: 600,
            letterSpacing: "0.18em",
            textTransform: "uppercase",
            color: "rgba(255,255,255,0.45)",
            marginBottom: 20,
          }}>
            About Plotzy
          </p>
          <h1 style={{
            fontSize: "clamp(2.4rem, 5.5vw, 4rem)",
            fontWeight: 800,
            lineHeight: 1.05,
            letterSpacing: "-0.04em",
            color: "#fff",
            marginBottom: 24,
          }}>
            We are building the writing platform writers wish existed.
          </h1>
          <p style={{
            fontSize: "clamp(1rem, 1.5vw, 1.25rem)",
            fontWeight: 400,
            lineHeight: 1.6,
            color: "rgba(255,255,255,0.55)",
            maxWidth: 640,
            margin: "0 auto",
          }}>
            One platform for the entire writer's journey: write, design, narrate, publish, and connect with readers. No more juggling five tools to ship one book.
          </p>
        </section>

        {/* ===== THE STORY ===== */}
        <section style={{ padding: "32px 24px 60px", maxWidth: 760, margin: "0 auto" }}>
          <p style={{
            fontSize: 12,
            fontWeight: 600,
            letterSpacing: "0.18em",
            textTransform: "uppercase",
            color: "rgba(255,255,255,0.4)",
            marginBottom: 16,
            textAlign: "center",
          }}>
            The Story
          </p>
          <h2 style={{
            fontSize: "clamp(1.8rem, 3.4vw, 2.6rem)",
            fontWeight: 800,
            color: "#fff",
            letterSpacing: "-0.03em",
            lineHeight: 1.15,
            marginBottom: 28,
            textAlign: "center",
          }}>
            Why Plotzy exists
          </h2>
          <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
            <p style={{ fontSize: 17, lineHeight: 1.7, color: "rgba(255,255,255,0.7)", margin: 0 }}>
              I had a million ideas. Plotzy was the one I chose to build first.
            </p>
            <p style={{ fontSize: 17, lineHeight: 1.7, color: "rgba(255,255,255,0.7)", margin: 0 }}>
              The reason is simple. There is no platform in the world that puts every part of the writing journey in one place. Writers today bounce between Word for drafting, Canva for covers, separate tools for audiobook generation, marketplaces for selling, and scattered communities for feedback. Each tool solves a slice. None of them solve the whole.
            </p>
            <p style={{ fontSize: 17, lineHeight: 1.7, color: "rgba(255,255,255,0.7)", margin: 0 }}>
              Plotzy is the answer to that fragmentation. Write, design, narrate, publish, and find your readers without ever leaving the platform.
            </p>
          </div>
        </section>

        {/* ===== WHAT MAKES PLOTZY DIFFERENT ===== */}
        <section style={{ padding: "60px 24px", background: "#0A0A0A" }}>
          <div style={{ maxWidth: 1200, margin: "0 auto" }}>
            <div style={{ textAlign: "center", marginBottom: 40 }}>
              <p style={{
                fontSize: 12,
                fontWeight: 600,
                letterSpacing: "0.18em",
                textTransform: "uppercase",
                color: "rgba(255,255,255,0.4)",
                marginBottom: 16,
              }}>
                What Makes Plotzy Different
              </p>
              <h2 style={{
                fontSize: "clamp(1.8rem, 3.4vw, 2.6rem)",
                fontWeight: 800,
                color: "#fff",
                letterSpacing: "-0.03em",
                lineHeight: 1.15,
                marginBottom: 16,
              }}>
                Every step of the journey, in one place
              </h2>
              <p style={{
                fontSize: 16,
                color: "rgba(255,255,255,0.5)",
                lineHeight: 1.6,
                maxWidth: 560,
                margin: "0 auto",
              }}>
                These are the things you would otherwise need five separate subscriptions for.
              </p>
            </div>

            <div style={{
              display: "flex",
              flexWrap: "wrap",
              justifyContent: "center",
              gap: 20,
            }}>
              {PILLARS.map((pillar, i) => (
                <div key={i} style={{
                  flex: "1 1 280px",
                  maxWidth: 360,
                  background: "rgba(255,255,255,0.03)",
                  border: "1px solid rgba(255,255,255,0.08)",
                  borderRadius: 20,
                  padding: "28px 24px",
                  transition: "all 0.3s ease",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = "rgba(255,255,255,0.05)";
                  e.currentTarget.style.borderColor = "rgba(255,255,255,0.14)";
                  e.currentTarget.style.transform = "translateY(-2px)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = "rgba(255,255,255,0.03)";
                  e.currentTarget.style.borderColor = "rgba(255,255,255,0.08)";
                  e.currentTarget.style.transform = "translateY(0)";
                }}
                >
                  <h3 style={{
                    fontSize: 17,
                    fontWeight: 700,
                    color: "#fff",
                    marginBottom: 10,
                    letterSpacing: "-0.01em",
                    lineHeight: 1.3,
                  }}>
                    {pillar.title}
                  </h3>
                  <p style={{
                    fontSize: 14,
                    fontWeight: 400,
                    color: "rgba(255,255,255,0.55)",
                    lineHeight: 1.6,
                    margin: 0,
                  }}>
                    {pillar.desc}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ===== THE VISION ===== */}
        <section style={{ padding: "60px 24px", maxWidth: 760, margin: "0 auto" }}>
          <p style={{
            fontSize: 12,
            fontWeight: 600,
            letterSpacing: "0.18em",
            textTransform: "uppercase",
            color: "rgba(140,180,255,0.6)",
            marginBottom: 16,
            textAlign: "center",
          }}>
            The Vision
          </p>
          <h2 style={{
            fontSize: "clamp(1.8rem, 3.4vw, 2.6rem)",
            fontWeight: 800,
            color: "#fff",
            letterSpacing: "-0.03em",
            lineHeight: 1.15,
            marginBottom: 28,
            textAlign: "center",
          }}>
            Where we are headed
          </h2>
          <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
            <p style={{ fontSize: 17, lineHeight: 1.7, color: "rgba(255,255,255,0.7)", margin: 0 }}>
              The first goal is concrete: ten thousand writers publishing their first book through Plotzy.
            </p>
            <p style={{ fontSize: 17, lineHeight: 1.7, color: "rgba(255,255,255,0.7)", margin: 0 }}>
              The bigger goal is the largest writing platform in the world. Not the noisiest, not the loudest. The one writers actually choose when they decide to take their craft seriously.
            </p>
            <p style={{ fontSize: 17, lineHeight: 1.7, color: "rgba(255,255,255,0.7)", margin: 0 }}>
              Every great novel starts with a writer who almost gave up. Plotzy exists to be the reason they did not.
            </p>
          </div>
        </section>

        {/* ===== THE FOUNDER ===== */}
        <section style={{ padding: "60px 24px", background: "#0A0A0A" }}>
          <div style={{ maxWidth: 760, margin: "0 auto" }}>
            <p style={{
              fontSize: 12,
              fontWeight: 600,
              letterSpacing: "0.18em",
              textTransform: "uppercase",
              color: "rgba(255,255,255,0.4)",
              marginBottom: 16,
              textAlign: "center",
            }}>
              The Founder
            </p>
            <h2 style={{
              fontSize: "clamp(1.8rem, 3.4vw, 2.6rem)",
              fontWeight: 800,
              color: "#fff",
              letterSpacing: "-0.03em",
              lineHeight: 1.15,
              marginBottom: 28,
              textAlign: "center",
            }}>
              Faris Adel
            </h2>
            <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
              <p style={{ fontSize: 17, lineHeight: 1.7, color: "rgba(255,255,255,0.7)", margin: 0 }}>
                Plotzy is built solo by Faris Adel, from Jordan. Full-stack engineer, painter on the side, and the person reading every email that comes through the platform.
              </p>
              <p style={{ fontSize: 17, lineHeight: 1.7, color: "rgba(255,255,255,0.7)", margin: 0 }}>
                If you have feedback, ideas, a bug to report, or simply want to talk about writing, write to me at {" "}
                <a href="mailto:hello@plotzy.co" style={{ color: "#fff", textDecoration: "underline", textDecorationColor: "rgba(255,255,255,0.3)", textUnderlineOffset: 4 }}>
                  hello@plotzy.co
                </a>
                . The reply comes from a human, not a queue.
              </p>
            </div>
          </div>
        </section>

        {/* ===== THE LOGO ===== */}
        <section style={{ padding: "60px 24px", maxWidth: 760, margin: "0 auto" }}>
          <p style={{
            fontSize: 12,
            fontWeight: 600,
            letterSpacing: "0.18em",
            textTransform: "uppercase",
            color: "rgba(255,255,255,0.4)",
            marginBottom: 16,
            textAlign: "center",
          }}>
            The Logo
          </p>
          <h2 style={{
            fontSize: "clamp(1.8rem, 3.4vw, 2.6rem)",
            fontWeight: 800,
            color: "#fff",
            letterSpacing: "-0.03em",
            lineHeight: 1.15,
            marginBottom: 28,
            textAlign: "center",
          }}>
            A drawing from my mother
          </h2>
          <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
            <p style={{ fontSize: 17, lineHeight: 1.7, color: "rgba(255,255,255,0.7)", margin: 0 }}>
              This part is personal.
            </p>
            <p style={{ fontSize: 17, lineHeight: 1.7, color: "rgba(255,255,255,0.7)", margin: 0 }}>
              I am a painter, but logos are a different kind of patience, and while building Plotzy I could not settle on one. So one evening I handed my mother, Ghadeer, a pen and a sheet of paper, and asked her to draw anything she wanted. Whatever she drew, I would make the logo.
            </p>
            <p style={{ fontSize: 17, lineHeight: 1.7, color: "rgba(255,255,255,0.7)", margin: 0 }}>
              She drew a pen writing the letter G, for Ghadeer.
            </p>
            <p style={{ fontSize: 17, lineHeight: 1.7, color: "rgba(255,255,255,0.7)", margin: 0 }}>
              That drawing is the mark you see on every Plotzy page. The platform is built on the writer's tools, but the symbol of it came from someone who simply trusted her son with a blank page.
            </p>
            <p style={{ fontSize: 17, lineHeight: 1.7, color: "rgba(255,255,255,0.7)", margin: 0, fontStyle: "italic" }}>
              Every writer should have someone like that.
            </p>
          </div>
        </section>

        {/* ===== CTA FOOTER ===== */}
        <section style={{ padding: "60px 24px 80px", textAlign: "center", maxWidth: 720, margin: "0 auto" }}>
          <h2 style={{
            fontSize: "clamp(1.8rem, 3.5vw, 2.5rem)",
            fontWeight: 800,
            color: "#fff",
            letterSpacing: "-0.03em",
            lineHeight: 1.15,
            marginBottom: 16,
          }}>
            Start your first book
          </h2>
          <p style={{
            fontSize: 16,
            color: "rgba(255,255,255,0.55)",
            lineHeight: 1.65,
            marginBottom: 28,
          }}>
            Now you know who built this and why. The blank page is waiting.
          </p>
          <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
            <Link href="/" style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              padding: "14px 28px",
              borderRadius: 999,
              background: "#fff",
              color: "#000",
              fontWeight: 700,
              fontSize: 14,
              textDecoration: "none",
            }}>
              Start Writing <ArrowRight style={{ width: 16, height: 16 }} />
            </Link>
            <Link href="/protection" style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              padding: "14px 28px",
              borderRadius: 999,
              background: "rgba(255,255,255,0.05)",
              border: "1px solid rgba(255,255,255,0.12)",
              color: "rgba(255,255,255,0.85)",
              fontWeight: 600,
              fontSize: 14,
              textDecoration: "none",
            }}>
              Read About Writer Protection
            </Link>
          </div>
        </section>

      </div>
    </Layout>
  );
}
