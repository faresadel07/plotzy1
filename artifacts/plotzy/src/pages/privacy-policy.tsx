import { useEffect, useState } from "react";
import { Link } from "wouter";
import { Layout } from "@/components/layout";
import { ArrowLeft, ChevronRight } from "lucide-react";

const SECTIONS = [
  { id: "overview",      label: "Overview" },
  { id: "data-collect",  label: "Data We Collect" },
  { id: "how-we-use",    label: "How We Use Your Data" },
  { id: "sharing",       label: "Sharing & Third Parties" },
  { id: "retention",     label: "Data Retention" },
  { id: "your-rights",   label: "Your Rights" },
  { id: "cookies",       label: "Cookies & Tracking" },
  { id: "security",      label: "Security" },
  { id: "children",      label: "Children's Privacy" },
  { id: "transfers",     label: "International Transfers" },
  { id: "changes",       label: "Changes to This Policy" },
  { id: "contact",       label: "Contact Us" },
];

export default function PrivacyPolicy() {
  const [active, setActive] = useState("overview");

  useEffect(() => {
    const handler = () => {
      for (const s of [...SECTIONS].reverse()) {
        const el = document.getElementById(s.id);
        if (el && el.getBoundingClientRect().top <= 120) {
          setActive(s.id);
          return;
        }
      }
    };
    window.addEventListener("scroll", handler, { passive: true });
    return () => window.removeEventListener("scroll", handler);
  }, []);

  const scrollTo = (id: string) => {
    const el = document.getElementById(id);
    if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <Layout>
      <div style={{ minHeight: "100vh", paddingTop: 32, paddingBottom: 120 }}>
        <div style={{ maxWidth: 1120, margin: "0 auto", padding: "0 24px" }}>

          <Link href="/" style={{ textDecoration: "none" }}>
            <div style={{ display: "inline-flex", alignItems: "center", gap: 6, marginBottom: 40, cursor: "pointer", color: "var(--muted-foreground)", fontSize: 13 }}>
              <ArrowLeft style={{ width: 14, height: 14 }} />
              Back to Plotzy
            </div>
          </Link>

          <div style={{ display: "grid", gridTemplateColumns: "220px 1fr", gap: 64, alignItems: "start" }}>

            <aside style={{ position: "sticky", top: 88 }}>
              <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--muted-foreground)", marginBottom: 16 }}>
                Contents
              </p>
              <nav style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                {SECTIONS.map(s => (
                  <button key={s.id} onClick={() => scrollTo(s.id)}
                    style={{
                      display: "flex", alignItems: "center", gap: 6,
                      padding: "5px 8px", borderRadius: 6, border: "none", cursor: "pointer",
                      background: active === s.id ? "var(--accent)" : "transparent",
                      color: active === s.id ? "var(--accent-foreground)" : "var(--muted-foreground)",
                      fontSize: 12, textAlign: "left", fontWeight: active === s.id ? 600 : 400,
                      transition: "all 0.15s",
                    }}>
                    {active === s.id && <ChevronRight style={{ width: 10, height: 10, flexShrink: 0 }} />}
                    {s.label}
                  </button>
                ))}
              </nav>

              <div style={{ marginTop: 32, padding: "16px", borderRadius: 10, background: "var(--muted)", fontSize: 12, lineHeight: 1.6, color: "var(--muted-foreground)" }}>
                <p style={{ fontWeight: 600, color: "var(--foreground)", marginBottom: 4 }}>Privacy questions?</p>
                <a href="mailto:privacy@plotzy.app" style={{ color: "var(--muted-foreground)" }}>privacy@plotzy.app</a>
              </div>
            </aside>

            <main>
              <div style={{ marginBottom: 56 }}>
                <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--muted-foreground)", marginBottom: 12 }}>
                  Legal
                </p>
                <h1 style={{ fontSize: 42, fontWeight: 800, letterSpacing: "-0.03em", lineHeight: 1.1, margin: "0 0 16px" }}>
                  Privacy Policy
                </h1>
                <div style={{ display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
                  <span style={{ fontSize: 14, color: "var(--muted-foreground)" }}>Effective: April 3, 2026</span>
                  <span style={{ fontSize: 14, color: "var(--muted-foreground)" }}>·</span>
                  <Link href="/terms" style={{ fontSize: 14, color: "var(--muted-foreground)", textDecoration: "underline" }}>
                    Terms of Service
                  </Link>
                </div>
                <p style={{ fontSize: 15, lineHeight: 1.8, color: "var(--muted-foreground)", marginTop: 24, padding: "16px 20px", borderRadius: 10, background: "var(--muted)", borderLeft: "3px solid var(--border)" }}>
                  Your privacy matters to us. This policy explains exactly what data Plotzy collects, why we collect it, how we protect it, and what rights you have over it — in plain language.
                </p>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: 48 }}>

                <S id="overview" title="1. Overview">
                  <P>
                    Plotzy ("we," "our," "us") is a creative writing platform. When you use Plotzy, you trust us with your personal information and your creative work. We take that trust seriously.
                  </P>
                  <P>
                    This Privacy Policy applies to all information collected through our website, applications, and any related services (collectively, the "Service"). By using Plotzy, you agree to the collection and use of information in accordance with this policy.
                  </P>
                  <P>
                    <strong>Our commitments to you:</strong>
                  </P>
                  <ul>
                    <li>We will never sell your personal data to third parties</li>
                    <li>We will never use your private writing to train AI models</li>
                    <li>We will be transparent about what data we collect and why</li>
                    <li>We will give you meaningful control over your data</li>
                    <li>We will protect your data with industry-standard security measures</li>
                  </ul>
                </S>

                <S id="data-collect" title="2. Data We Collect">
                  <H2>Information You Provide Directly</H2>
                  <ul>
                    <li>
                      <strong>Account information:</strong> display name, email address, and profile picture when you register or connect via Google, Apple, LinkedIn, or Facebook OAuth.
                    </li>
                    <li>
                      <strong>Your creative content:</strong> books, chapters, articles, cover images, lore notes, and any other writing you create and store on Plotzy. This content belongs to you.
                    </li>
                    <li>
                      <strong>Profile information:</strong> biography, website, social media handles, and other details you add to your public profile.
                    </li>
                    <li>
                      <strong>Communications:</strong> messages you send to our support team and any feedback or reports you submit.
                    </li>
                    <li>
                      <strong>Payment information:</strong> billing address and payment method details. We do not store your full card number — all payment processing is handled securely by Stripe and PayPal.
                    </li>
                  </ul>

                  <H2>Information Collected Automatically</H2>
                  <ul>
                    <li>
                      <strong>Usage data:</strong> pages visited, features used, buttons clicked, time spent on various parts of the platform, and writing session metadata (e.g., word count milestones).
                    </li>
                    <li>
                      <strong>Device & technical data:</strong> IP address, browser type and version, operating system, device identifiers, screen resolution, and referring URLs.
                    </li>
                    <li>
                      <strong>Session data:</strong> authentication tokens, session duration, and login timestamps used to maintain your secure session.
                    </li>
                    <li>
                      <strong>Error logs:</strong> crash reports and error logs that help us debug and improve the Service.
                    </li>
                  </ul>

                  <H2>Information from Third Parties</H2>
                  <ul>
                    <li>
                      <strong>OAuth providers:</strong> when you sign in via Google, Apple, LinkedIn, or Facebook, we receive your name, email address, and profile picture from that provider, as permitted by your settings on that platform.
                    </li>
                    <li>
                      <strong>Payment processors:</strong> Stripe and PayPal may share transaction status and billing information with us to confirm successful payments.
                    </li>
                  </ul>
                </S>

                <S id="how-we-use" title="3. How We Use Your Data">
                  <P>We use the information we collect for the following purposes:</P>
                  <H2>To Provide and Operate the Service</H2>
                  <ul>
                    <li>Authenticate your identity and maintain your account</li>
                    <li>Store, sync, and display your books, chapters, and articles</li>
                    <li>Process subscription payments and manage billing</li>
                    <li>Enable sharing, publishing, and marketplace features</li>
                    <li>Deliver AI writing assistance features in real time</li>
                  </ul>
                  <H2>To Improve and Personalize</H2>
                  <ul>
                    <li>Analyze how users interact with features to guide product development</li>
                    <li>Remember your preferences (theme, language, font settings)</li>
                    <li>Identify bugs, errors, and performance bottlenecks</li>
                    <li>Develop new features and improve existing ones</li>
                  </ul>
                  <H2>To Communicate with You</H2>
                  <ul>
                    <li>Send transactional emails: account confirmation, password reset, billing receipts</li>
                    <li>Notify you of significant changes to our Terms or Privacy Policy</li>
                    <li>Respond to your support requests and inquiries</li>
                    <li>Send product updates or newsletters (only with your explicit consent, and you can unsubscribe at any time)</li>
                  </ul>
                  <H2>To Maintain Safety and Integrity</H2>
                  <ul>
                    <li>Detect, investigate, and prevent fraud, abuse, and security incidents</li>
                    <li>Enforce our Terms of Service and content policies</li>
                    <li>Comply with legal obligations and respond to lawful requests</li>
                  </ul>
                </S>

                <S id="sharing" title="4. Sharing & Third Parties">
                  <P>
                    <strong>We do not sell your personal information.</strong> We only share your data in the following limited circumstances:
                  </P>
                  <H2>Service Providers</H2>
                  <P>
                    We share data with trusted third-party vendors who help us operate the Service. These providers are contractually bound to use your data only to perform services for us and to protect your information:
                  </P>
                  <ul>
                    <li><strong>Stripe / PayPal</strong> — payment processing</li>
                    <li><strong>OpenAI</strong> — AI writing assistance features (prompts only; no private content stored)</li>
                    <li><strong>Cloud infrastructure providers</strong> — database hosting and storage</li>
                  </ul>
                  <H2>Public Content</H2>
                  <P>
                    Content you explicitly publish to the Community Library, Marketplace, or your public author profile is visible to other Plotzy users and potentially to the public. This includes your display name, profile picture, bio, and published works.
                  </P>
                  <H2>Legal Requirements</H2>
                  <P>
                    We may disclose your information if required to do so by law, regulation, legal process, or governmental request, or to protect the rights, property, or safety of Plotzy, our users, or the public.
                  </P>
                  <H2>Business Transfers</H2>
                  <P>
                    If Plotzy is involved in a merger, acquisition, or sale of all or a portion of its assets, your information may be transferred as part of that transaction. We will notify you via email and/or a prominent notice on the Service prior to the transfer and give you the option to delete your account if you choose not to consent.
                  </P>
                  <H2>With Your Consent</H2>
                  <P>
                    We may share your data with third parties for any other purpose with your explicit consent.
                  </P>
                </S>

                <S id="retention" title="5. Data Retention">
                  <P>
                    We retain your personal information and content for as long as your account is active or as needed to provide you with the Service. You may delete your account at any time through your account settings.
                  </P>
                  <P>
                    Upon account deletion:
                  </P>
                  <ul>
                    <li>Your personal information and private content will be permanently deleted within <strong>30 days</strong></li>
                    <li>Published works that have been purchased by other users may be retained in their libraries</li>
                    <li>Anonymized usage data and aggregated analytics may be retained indefinitely</li>
                    <li>Information required for legal, tax, or audit purposes may be retained for up to 7 years as required by law</li>
                  </ul>
                  <P>
                    To request deletion of your data, contact us at <a href="mailto:privacy@plotzy.app">privacy@plotzy.app</a> or use the account deletion option in Settings.
                  </P>
                </S>

                <S id="your-rights" title="6. Your Rights">
                  <P>
                    Depending on where you are located, you may have the following rights regarding your personal data. We honor these rights regardless of your location.
                  </P>

                  <H2>For All Users</H2>
                  <ul>
                    <li><strong>Access:</strong> Request a copy of the personal data we hold about you</li>
                    <li><strong>Correction:</strong> Update or correct inaccurate or incomplete information (most data can be updated directly in Settings)</li>
                    <li><strong>Deletion:</strong> Request erasure of your account and personal data</li>
                    <li><strong>Portability:</strong> Request your content in a machine-readable format (e.g., export your books as plain text or PDF)</li>
                    <li><strong>Opt-out:</strong> Unsubscribe from marketing emails at any time via the unsubscribe link in any email</li>
                  </ul>

                  <H2>For Users in the European Union (GDPR)</H2>
                  <ul>
                    <li><strong>Right to restriction:</strong> Request that we limit how we process your data in certain circumstances</li>
                    <li><strong>Right to object:</strong> Object to the processing of your data for direct marketing or legitimate interest purposes</li>
                    <li><strong>Right to withdraw consent:</strong> Where processing is based on consent, withdraw it at any time without affecting the lawfulness of prior processing</li>
                    <li><strong>Right to lodge a complaint:</strong> File a complaint with your local data protection authority</li>
                  </ul>

                  <H2>For California Residents (CCPA / CPRA)</H2>
                  <ul>
                    <li>The right to know what personal information is collected, used, shared, or sold</li>
                    <li>The right to delete personal information collected from you</li>
                    <li>The right to opt-out of the sale of personal information (we do not sell personal information)</li>
                    <li>The right to non-discrimination for exercising your privacy rights</li>
                  </ul>

                  <P>
                    To exercise any of these rights, contact us at <a href="mailto:privacy@plotzy.app">privacy@plotzy.app</a>. We will respond to all requests within 30 days.
                  </P>
                </S>

                <S id="cookies" title="7. Cookies & Tracking">
                  <P>
                    We use cookies and similar tracking technologies to operate the Service effectively. Here is exactly what we use:
                  </P>

                  <H2>Essential Cookies (Required)</H2>
                  <P>
                    These cookies are necessary for the Service to function. They cannot be disabled.
                  </P>
                  <ul>
                    <li><strong>Session cookie:</strong> maintains your authenticated session so you don't have to log in on every page</li>
                    <li><strong>CSRF protection:</strong> prevents cross-site request forgery attacks</li>
                  </ul>

                  <H2>Preference Cookies</H2>
                  <P>
                    These remember your settings to improve your experience.
                  </P>
                  <ul>
                    <li>Language preference (Arabic / English)</li>
                    <li>Reading theme (light / dark mode in the book reader)</li>
                    <li>Font size and other editor preferences</li>
                  </ul>

                  <H2>Analytics (Optional)</H2>
                  <P>
                    We use privacy-respecting analytics to understand how the platform is used. No personal identifiers are shared with analytics providers.
                  </P>

                  <H2>Managing Cookies</H2>
                  <P>
                    You can control and delete cookies through your browser settings. Disabling essential cookies will prevent you from logging in and using the Service. Disabling preference cookies will reset your settings to defaults each visit.
                  </P>
                </S>

                <S id="security" title="8. Security">
                  <P>
                    We implement industry-standard security practices to protect your information:
                  </P>
                  <ul>
                    <li><strong>Encryption in transit:</strong> all data is transmitted over HTTPS / TLS</li>
                    <li><strong>Password security:</strong> passwords are hashed using bcrypt — we never store plaintext passwords</li>
                    <li><strong>Access controls:</strong> strict role-based access ensures only authorized staff can access production data</li>
                    <li><strong>Database security:</strong> databases are not publicly accessible and are protected by firewall rules</li>
                    <li><strong>Regular audits:</strong> we regularly review our security practices and update them as needed</li>
                  </ul>
                  <P>
                    However, no method of transmission over the Internet or method of electronic storage is 100% secure. While we strive to protect your personal information, we cannot guarantee its absolute security.
                  </P>
                  <P>
                    If you believe your account has been compromised or you discover a security vulnerability, please contact us immediately at <a href="mailto:security@plotzy.app">security@plotzy.app</a>.
                  </P>
                </S>

                <S id="children" title="9. Children's Privacy">
                  <P>
                    The Service is not directed to children under 13 years of age. We do not knowingly collect personal information from children under 13. If you are a parent or guardian and believe your child has provided us with personal information, please contact us at <a href="mailto:privacy@plotzy.app">privacy@plotzy.app</a> and we will delete the information promptly.
                  </P>
                  <P>
                    Users between 13 and 18 years old must have a parent or guardian review and agree to these policies on their behalf. We encourage parents to supervise their children's use of online services.
                  </P>
                </S>

                <S id="transfers" title="10. International Data Transfers">
                  <P>
                    Plotzy is based in the United States. If you are accessing the Service from outside the United States, please be aware that your information may be transferred to, stored, and processed in the United States and other countries where our service providers operate.
                  </P>
                  <P>
                    For users in the European Economic Area (EEA), United Kingdom, or Switzerland, we ensure that any international transfers of your data are protected by appropriate safeguards, including Standard Contractual Clauses (SCCs) approved by the European Commission.
                  </P>
                </S>

                <S id="changes" title="11. Changes to This Policy">
                  <P>
                    We may update this Privacy Policy from time to time. When we make material changes, we will:
                  </P>
                  <ul>
                    <li>Update the "Effective" date at the top of this page</li>
                    <li>Send an email notification to your registered email address</li>
                    <li>Display a prominent in-app notice upon your next login</li>
                  </ul>
                  <P>
                    We encourage you to review this policy periodically. Your continued use of the Service after any changes become effective constitutes your acceptance of the updated policy.
                  </P>
                </S>

                <S id="contact" title="12. Contact Us">
                  <P>
                    If you have any questions, concerns, or requests regarding this Privacy Policy or how we handle your data, please contact us:
                  </P>
                  <div style={{ borderRadius: 12, padding: "24px", marginTop: 8, background: "var(--muted)", display: "flex", flexDirection: "column", gap: 8 }}>
                    <p style={{ margin: 0, fontWeight: 700, fontSize: 16 }}>Plotzy — Privacy Team</p>
                    <Row label="Privacy requests" value="privacy@plotzy.app" href="mailto:privacy@plotzy.app" />
                    <Row label="Security issues" value="security@plotzy.app" href="mailto:security@plotzy.app" />
                    <Row label="General support" value="support@plotzy.app" href="mailto:support@plotzy.app" />
                  </div>
                  <P style={{ fontSize: 13, marginTop: 24 }}>
                    Response time: We aim to respond to all privacy requests within <strong>5 business days</strong> and complete them within <strong>30 days</strong>.
                  </P>
                  <P style={{ fontSize: 13 }}>
                    Also see: <Link href="/terms" style={{ color: "var(--muted-foreground)", textDecoration: "underline" }}>Terms of Service</Link>
                  </P>
                </S>

              </div>
            </main>
          </div>
        </div>
      </div>
    </Layout>
  );
}

function S({ id, title, children }: { id: string; title: string; children: React.ReactNode }) {
  return (
    <section id={id} style={{ scrollMarginTop: 96 }}>
      <h2 style={{ fontSize: 22, fontWeight: 700, letterSpacing: "-0.02em", margin: "0 0 20px", paddingBottom: 14, borderBottom: "1px solid var(--border)" }}>
        {title}
      </h2>
      <div style={{ fontSize: 15, lineHeight: 1.85, color: "var(--muted-foreground)", display: "flex", flexDirection: "column", gap: 12 }}>
        {children}
      </div>
    </section>
  );
}

function H2({ children }: { children: React.ReactNode }) {
  return (
    <p style={{ fontWeight: 600, color: "var(--foreground)", margin: "8px 0 2px", fontSize: 14 }}>
      {children}
    </p>
  );
}

function P({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return <p style={{ margin: 0, ...style }}>{children}</p>;
}

function Row({ label, value, href }: { label: string; value: string; href: string }) {
  return (
    <div style={{ display: "flex", gap: 8, fontSize: 14, flexWrap: "wrap" }}>
      <span style={{ color: "var(--muted-foreground)", minWidth: 140 }}>{label}:</span>
      <a href={href} style={{ color: "var(--foreground)", fontWeight: 500 }}>{value}</a>
    </div>
  );
}
