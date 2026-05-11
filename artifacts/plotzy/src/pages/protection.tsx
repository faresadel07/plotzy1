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
    title: "You own 100% of your work",
    desc: "Every word you write on Plotzy belongs to you. We never claim copyright, royalties, or any rights to your manuscripts.",
  },
  {
    title: "AI never trains on your writing",
    desc: "Your text is sent to AI models (like OpenAI) only to fulfill your immediate request. It is never stored, logged, or used to train any model.",
  },
  {
    title: "Private by default",
    desc: "Every book you create is private until you explicitly choose to publish it. Nothing leaks, nothing surfaces, nothing gets shared without your consent.",
  },
  {
    title: "Encrypted in transit and at rest",
    desc: "All your data travels over TLS 1.3 and sits in encrypted databases hosted by trusted providers. Industry-standard security at every layer.",
  },
  {
    title: "Delete anytime, no questions asked",
    desc: "Want out? One click in Settings deletes your account and every byte of your data. We do not keep hidden backups or shadow profiles.",
  },
  {
    title: "Copyright protection on your side",
    desc: "If someone copies your published work without permission, we honor DMCA takedown requests within 48 hours. Your IP, our enforcement.",
  },
  {
    title: "Export freely, no lock-in",
    desc: "Your manuscript is yours to take anywhere. Export to PDF, EPUB, or plain text at any time, on any plan. Your work is never held hostage.",
  },
  {
    title: "We will never sell your data",
    desc: "No data brokers, no advertising networks, no shadowy partnerships. We make money from subscriptions, not from selling you out.",
  },
];

const NEVER_LIST = [
  "Sell, share, or license your manuscripts to third parties",
  "Use your writing as training data for AI models",
  "Read your private books or analyze them without your permission",
  "Lock your exports behind premium tiers",
  "Hide what data we collect or how we use it",
  "Make it difficult to delete your account or your data",
  "Run advertising on top of your work",
  "Send your data to advertising or analytics brokers",
];

export default function Protection() {
  return (
    <Layout>
      <SEO
        title="Writer Protection"
        description="Your words, your rights, always yours. Learn how Plotzy protects your intellectual property, privacy, and creative work."
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
        <section style={{ padding: "100px 24px 60px", textAlign: "center", maxWidth: 880, margin: "0 auto" }}>
          <p style={{
            fontSize: 13,
            fontWeight: 600,
            letterSpacing: "0.18em",
            textTransform: "uppercase",
            color: "rgba(255,255,255,0.45)",
            marginBottom: 20,
          }}>
            Writer Protection
          </p>
          <h1 style={{
            fontSize: "clamp(2.5rem, 6vw, 4.5rem)",
            fontWeight: 800,
            lineHeight: 1.05,
            letterSpacing: "-0.04em",
            color: "#fff",
            marginBottom: 24,
          }}>
            Your words. Your rights. Always.
          </h1>
          <p style={{
            fontSize: "clamp(1rem, 1.5vw, 1.25rem)",
            fontWeight: 400,
            lineHeight: 1.6,
            color: "rgba(255,255,255,0.55)",
            maxWidth: 620,
            margin: "0 auto",
          }}>
            We built Plotzy for writers who take their craft seriously. That means real protection for your work, your data, and your creative ownership.
          </p>
        </section>

        {/* ===== PILLARS GRID ===== */}
        <section style={{ padding: "40px 24px 80px", maxWidth: 1200, margin: "0 auto" }}>
          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
            gap: 20,
          }}>
            {PILLARS.map((pillar, i) => (
              <div key={i} style={{
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
        </section>

        {/* ===== WHAT WE NEVER DO ===== */}
        <section style={{
          padding: "80px 24px",
          background: "#0A0A0A",
        }}>
          <div style={{ maxWidth: 880, margin: "0 auto" }}>
            <div style={{ textAlign: "center", marginBottom: 48 }}>
              <p style={{
                fontSize: 13,
                fontWeight: 600,
                letterSpacing: "0.18em",
                textTransform: "uppercase",
                color: "rgba(255,80,80,0.55)",
                marginBottom: 16,
              }}>
                The Promises We Keep
              </p>
              <h2 style={{
                fontSize: "clamp(2rem, 4vw, 3rem)",
                fontWeight: 800,
                color: "#fff",
                letterSpacing: "-0.03em",
                lineHeight: 1.1,
                marginBottom: 16,
              }}>
                What we will never do
              </h2>
              <p style={{
                fontSize: 16,
                color: "rgba(255,255,255,0.5)",
                lineHeight: 1.6,
                maxWidth: 520,
                margin: "0 auto",
              }}>
                Sometimes what we don't do matters as much as what we do. These are the lines we will never cross.
              </p>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {NEVER_LIST.map((item, i) => (
                <div key={i} style={{
                  display: "flex",
                  alignItems: "flex-start",
                  gap: 14,
                  padding: "16px 20px",
                  background: "rgba(255,255,255,0.02)",
                  border: "1px solid rgba(255,80,80,0.12)",
                  borderRadius: 14,
                }}>
                  <span style={{
                    flexShrink: 0,
                    marginTop: 6,
                    width: 6,
                    height: 6,
                    borderRadius: "50%",
                    background: "rgba(255,80,80,0.6)",
                  }} />
                  <p style={{
                    fontSize: 15,
                    color: "rgba(255,255,255,0.78)",
                    lineHeight: 1.55,
                    margin: 0,
                    fontWeight: 400,
                  }}>
                    {item}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ===== TECHNICAL TRANSPARENCY ===== */}
        <section style={{ padding: "80px 24px", maxWidth: 880, margin: "0 auto" }}>
          <div style={{ textAlign: "center", marginBottom: 48 }}>
            <p style={{
              fontSize: 13,
              fontWeight: 600,
              letterSpacing: "0.18em",
              textTransform: "uppercase",
              color: "rgba(140,180,255,0.6)",
              marginBottom: 16,
            }}>
              Full Transparency
            </p>
            <h2 style={{
              fontSize: "clamp(2rem, 4vw, 3rem)",
              fontWeight: 800,
              color: "#fff",
              letterSpacing: "-0.03em",
              lineHeight: 1.1,
              marginBottom: 16,
            }}>
              How it actually works
            </h2>
            <p style={{
              fontSize: 16,
              color: "rgba(255,255,255,0.5)",
              lineHeight: 1.6,
              maxWidth: 520,
              margin: "0 auto",
            }}>
              No legal jargon, no marketing fluff. Here is the real picture, in plain English.
            </p>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 28 }}>
            <TechBlock
              title="When you use AI features"
              text="Your selected text is sent over an encrypted connection to our AI provider (currently OpenAI). They process the request and send the result back. Per the OpenAI API terms, your text is not stored beyond a short safety review window, and it is never used to train future models. We log only metadata (which feature, how many tokens, response time), never the content itself."
            />
            <TechBlock
              title="Where your books live"
              text="Your manuscripts are stored in a managed PostgreSQL database hosted on Neon, with encryption at rest (AES-256) and automatic daily backups retained for 7 days. Backups are also encrypted and never accessible to humans on our team without an explicit security incident."
            />
            <TechBlock
              title="Authentication and sessions"
              text="Passwords are hashed with bcrypt (never stored in plain text). Sessions use HTTP-only secure cookies and rotate on login. We support sign-in with Google, Apple, and LinkedIn for added security, and we never see your provider passwords."
            />
            <TechBlock
              title="What we collect for analytics"
              text="We track anonymous page views, device types, and feature usage so we can improve the product. We do not track you across other websites, we do not use third-party advertising trackers, and you can disable analytics cookies anytime from the cookie banner."
            />
            <TechBlock
              title="Data location and transfers"
              text="Your data is stored in data centers within the European Union and the United States. When required by international laws (such as GDPR), we apply standard contractual clauses to keep your data protected wherever it travels."
            />
          </div>
        </section>

        {/* ===== DMCA / COPYRIGHT ===== */}
        <section style={{
          padding: "80px 24px",
          background: "#0A0A0A",
        }}>
          <div style={{ maxWidth: 720, margin: "0 auto", textAlign: "center" }}>
            <h2 style={{
              fontSize: "clamp(1.8rem, 3.5vw, 2.5rem)",
              fontWeight: 800,
              color: "#fff",
              letterSpacing: "-0.03em",
              lineHeight: 1.15,
              marginBottom: 16,
            }}>
              Found someone copying your work?
            </h2>
            <p style={{
              fontSize: 16,
              color: "rgba(255,255,255,0.55)",
              lineHeight: 1.65,
              marginBottom: 28,
            }}>
              If a published book on Plotzy infringes your copyright, we take it seriously. Send us a DMCA notice with proof of ownership and the infringing URL, and we will review and act within 48 hours.
            </p>
            <a
              href="mailto:legal@plotzy.co?subject=DMCA%20Takedown%20Request"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 10,
                padding: "14px 28px",
                borderRadius: 999,
                background: "#fff",
                color: "#000",
                fontWeight: 700,
                fontSize: 14,
                textDecoration: "none",
                transition: "transform 0.2s",
              }}
              onMouseEnter={(e) => e.currentTarget.style.transform = "scale(1.04)"}
              onMouseLeave={(e) => e.currentTarget.style.transform = "scale(1)"}
            >
              Send DMCA Notice
            </a>
          </div>
        </section>

        {/* ===== CTA FOOTER ===== */}
        <section style={{ padding: "80px 24px", textAlign: "center", maxWidth: 720, margin: "0 auto" }}>
          <h2 style={{
            fontSize: "clamp(1.8rem, 3.5vw, 2.5rem)",
            fontWeight: 800,
            color: "#fff",
            letterSpacing: "-0.03em",
            lineHeight: 1.15,
            marginBottom: 16,
          }}>
            Write with confidence
          </h2>
          <p style={{
            fontSize: 16,
            color: "rgba(255,255,255,0.55)",
            lineHeight: 1.65,
            marginBottom: 32,
          }}>
            Now you know exactly how we treat your work. Ready to start your next book?
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
            <Link href="/privacy" style={{
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
              Read Privacy Policy
            </Link>
            <Link href="/terms" style={{
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
              Read Terms of Service
            </Link>
          </div>
        </section>

      </div>
    </Layout>
  );
}

function TechBlock({ title, text }: { title: string; text: string }) {
  return (
    <div style={{
      padding: "24px 24px",
      background: "rgba(255,255,255,0.02)",
      border: "1px solid rgba(255,255,255,0.07)",
      borderRadius: 16,
    }}>
      <h3 style={{
        fontSize: 17,
        fontWeight: 700,
        color: "#fff",
        marginBottom: 8,
        letterSpacing: "-0.01em",
      }}>
        {title}
      </h3>
      <p style={{
        fontSize: 14.5,
        color: "rgba(255,255,255,0.6)",
        lineHeight: 1.65,
        margin: 0,
      }}>
        {text}
      </p>
    </div>
  );
}
