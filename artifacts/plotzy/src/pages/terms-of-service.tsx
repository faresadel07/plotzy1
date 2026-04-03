import { useEffect, useState } from "react";
import { Link } from "wouter";
import { ArrowLeft, ChevronRight } from "lucide-react";

const SECTIONS = [
  { id: "acceptance",       label: "Acceptance of Terms" },
  { id: "service",          label: "Description of Service" },
  { id: "eligibility",      label: "Eligibility & Accounts" },
  { id: "your-content",     label: "Your Content & Ownership" },
  { id: "prohibited",       label: "Prohibited Conduct" },
  { id: "subscriptions",    label: "Subscriptions & Payments" },
  { id: "ai-features",      label: "AI Writing Features" },
  { id: "library",          label: "Public Domain Library" },
  { id: "marketplace",      label: "Marketplace & Community" },
  { id: "plotzy-ip",        label: "Plotzy Intellectual Property" },
  { id: "dmca",             label: "Copyright & DMCA" },
  { id: "disclaimer",       label: "Disclaimers" },
  { id: "liability",        label: "Limitation of Liability" },
  { id: "indemnification",  label: "Indemnification" },
  { id: "termination",      label: "Termination" },
  { id: "governing-law",    label: "Governing Law" },
  { id: "changes",          label: "Changes to Terms" },
  { id: "contact",          label: "Contact" },
];

export default function TermsOfService() {
  const [active, setActive] = useState("acceptance");

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
    <div style={{ minHeight: "100vh", background: "var(--background)", color: "var(--foreground)" }}>
      {/* Minimal header */}
      <header style={{ borderBottom: "1px solid var(--border)", position: "sticky", top: 0, background: "var(--background)", zIndex: 50, backdropFilter: "blur(12px)" }}>
        <div style={{ maxWidth: 1120, margin: "0 auto", padding: "0 24px", height: 52, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <Link href="/" style={{ textDecoration: "none", display: "flex", alignItems: "center", gap: 8 }}>
            <img src={`${import.meta.env.BASE_URL}plotzy-logo.png`} alt="Plotzy" style={{ width: 22, height: 22, objectFit: "contain", borderRadius: 5 }} />
            <span style={{ fontWeight: 800, fontSize: 13.5, letterSpacing: "-0.05em" }}>PLOTZY</span>
          </Link>
          <Link href="/" style={{ textDecoration: "none" }}>
            <div style={{ display: "inline-flex", alignItems: "center", gap: 5, color: "var(--muted-foreground)", fontSize: 13, cursor: "pointer" }}>
              <ArrowLeft style={{ width: 13, height: 13 }} />
              Back
            </div>
          </Link>
        </div>
      </header>

      <div style={{ paddingTop: 40, paddingBottom: 120 }}>
        <div style={{ maxWidth: 1120, margin: "0 auto", padding: "0 24px" }}>

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
                <p style={{ fontWeight: 600, color: "var(--foreground)", marginBottom: 4 }}>Have questions?</p>
                <a href="mailto:legal@plotzy.app" style={{ color: "var(--muted-foreground)" }}>legal@plotzy.app</a>
              </div>
            </aside>

            <main>
              <div style={{ marginBottom: 56 }}>
                <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--muted-foreground)", marginBottom: 12 }}>
                  Legal
                </p>
                <h1 style={{ fontSize: 42, fontWeight: 800, letterSpacing: "-0.03em", lineHeight: 1.1, margin: "0 0 16px" }}>
                  Terms of Service
                </h1>
                <div style={{ display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
                  <span style={{ fontSize: 14, color: "var(--muted-foreground)" }}>Effective: April 3, 2026</span>
                  <span style={{ fontSize: 14, color: "var(--muted-foreground)" }}>·</span>
                  <Link href="/privacy" style={{ fontSize: 14, color: "var(--muted-foreground)", textDecoration: "underline" }}>
                    Privacy Policy
                  </Link>
                </div>
                <p style={{ fontSize: 15, lineHeight: 1.8, color: "var(--muted-foreground)", marginTop: 24, padding: "16px 20px", borderRadius: 10, background: "var(--muted)", borderLeft: "3px solid var(--border)" }}>
                  Please read these Terms carefully before using Plotzy. By creating an account or accessing any part of the Service, you confirm that you have read, understood, and agree to be bound by these Terms.
                </p>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: 48 }}>

                <S id="acceptance" title="1. Acceptance of Terms">
                  <P>
                    These Terms of Service ("Terms") constitute a legally binding agreement between you ("User," "you") and Plotzy ("Company," "we," "us," "our") governing your access to and use of the Plotzy platform, website, mobile applications, and all related services (collectively, the "Service").
                  </P>
                  <P>
                    By registering for an account, clicking "I Agree," or otherwise accessing or using the Service, you acknowledge that you have read, understood, and agree to be bound by these Terms and our Privacy Policy, which is incorporated herein by reference.
                  </P>
                  <P>
                    If you are using the Service on behalf of an organization, you represent and warrant that you have the authority to bind that organization to these Terms, and "you" refers to both you individually and the organization.
                  </P>
                </S>

                <S id="service" title="2. Description of Service">
                  <P>
                    Plotzy is a creative writing and publishing platform that provides users with tools to write, organize, edit, and publish books, chapters, and articles. The Service includes, but is not limited to:
                  </P>
                  <ul>
                    <li>A rich-text book and chapter editor with AI writing assistance</li>
                    <li>A community library for publishing and sharing your works</li>
                    <li>A marketplace for selling your books to other users</li>
                    <li>A public-domain reading library powered by Project Gutenberg</li>
                    <li>Writing guides, tutorials, and educational resources</li>
                    <li>Lore and worldbuilding management tools</li>
                    <li>Cover design and book formatting features</li>
                    <li>Voice dictation and AI-powered writing tools</li>
                  </ul>
                  <P>
                    We reserve the right to modify, suspend, or discontinue any feature of the Service at any time, with or without notice. We will not be liable to you or any third party for any modification, suspension, or discontinuation of the Service.
                  </P>
                </S>

                <S id="eligibility" title="3. Eligibility & Accounts">
                  <H2>Age Requirements</H2>
                  <P>
                    You must be at least 13 years of age to use the Service. If you are under 18, you represent that your parent or legal guardian has reviewed and agreed to these Terms on your behalf. We do not knowingly collect information from children under 13.
                  </P>
                  <H2>Account Registration</H2>
                  <P>
                    To access most features, you must create an account by providing accurate and complete information. You agree to keep your account information up to date and to maintain the security and confidentiality of your login credentials.
                  </P>
                  <P>
                    You are solely responsible for all activities that occur under your account. You agree to immediately notify us at <a href="mailto:support@plotzy.app">support@plotzy.app</a> of any unauthorized use of your account or any other security breach.
                  </P>
                  <H2>One Account Per Person</H2>
                  <P>
                    You may not create multiple accounts for the purpose of circumventing restrictions, abusing free trials, or any other fraudulent purpose. We reserve the right to merge or terminate duplicate accounts.
                  </P>
                </S>

                <S id="your-content" title="4. Your Content & Ownership">
                  <H2>You Own Your Work</H2>
                  <P>
                    <strong>Your creative works — books, chapters, articles, and any other content you write on Plotzy — remain entirely yours.</strong> We make no claim of ownership over your original creative content.
                  </P>
                  <H2>License You Grant Us</H2>
                  <P>
                    By uploading or submitting content to the Service, you grant Plotzy a limited, worldwide, non-exclusive, royalty-free, sublicensable license to host, store, copy, transmit, display, and distribute your content solely for the purpose of operating, providing, and improving the Service.
                  </P>
                  <P>
                    This license does <strong>not</strong> grant us the right to sell your content, publish it to third parties without your consent, use it for advertising, or claim authorship.
                  </P>
                  <H2>Published & Public Content</H2>
                  <P>
                    When you publish a book or article to the Community Library or Marketplace, you grant other users of the Service the right to read and access that content through the platform. You may unpublish content at any time, after which it will no longer be accessible to new readers (though copies previously downloaded or purchased may still exist per those users' rights).
                  </P>
                  <H2>Your Representations</H2>
                  <P>By submitting content, you represent and warrant that:</P>
                  <ul>
                    <li>You own or have all necessary rights to the content you upload</li>
                    <li>Your content does not infringe the intellectual property, privacy, publicity, or other rights of any third party</li>
                    <li>Your content complies with all applicable laws and regulations</li>
                    <li>You have obtained all necessary permissions for any third-party material included in your content</li>
                  </ul>
                </S>

                <S id="prohibited" title="5. Prohibited Conduct">
                  <P>You agree not to use the Service to create, upload, publish, transmit, or otherwise make available content that:</P>
                  <ul>
                    <li>Is illegal, harmful, threatening, abusive, harassing, defamatory, or libelous</li>
                    <li>Incites violence, hatred, or discrimination based on race, ethnicity, religion, gender, sexual orientation, disability, or national origin</li>
                    <li>Contains sexually explicit material involving minors (CSAM), or is pornographic in nature where prohibited by applicable law</li>
                    <li>Constitutes spam, unsolicited promotions, or commercial solicitation</li>
                    <li>Infringes any patent, trademark, trade secret, copyright, or other intellectual property right</li>
                    <li>Violates the privacy of others, including publishing personal information without consent</li>
                    <li>Impersonates any person or entity, or falsely states or misrepresents your affiliation with a person or entity</li>
                    <li>Contains malware, viruses, or any malicious code</li>
                  </ul>
                  <P>You also agree not to:</P>
                  <ul>
                    <li>Attempt to reverse-engineer, decompile, or extract the source code of the Service</li>
                    <li>Use automated bots, scrapers, or crawlers to access the Service without written authorization</li>
                    <li>Circumvent any access controls, rate limits, or security features</li>
                    <li>Resell, sublicense, or commercially exploit the Service without our written consent</li>
                    <li>Interfere with or disrupt the integrity or performance of the Service or its infrastructure</li>
                    <li>Use the Service in any way that violates applicable local, national, or international law or regulation</li>
                  </ul>
                  <P>
                    Violation of these prohibitions may result in immediate account suspension or termination, removal of content, and may expose you to civil or criminal liability.
                  </P>
                </S>

                <S id="subscriptions" title="6. Subscriptions & Payments">
                  <H2>Plans</H2>
                  <P>
                    Plotzy offers a free tier and paid subscription plans (Plotzy Pro), billed monthly or annually. The features included in each plan are described on our Pricing page and may be updated from time to time.
                  </P>
                  <H2>Billing</H2>
                  <P>
                    Paid subscriptions are billed in advance at the beginning of each billing cycle. All payments are processed securely through Stripe or PayPal. By subscribing, you authorize us to charge your designated payment method on a recurring basis until you cancel.
                  </P>
                  <H2>Free Trial</H2>
                  <P>
                    New users may be eligible for a free trial period. Unless you cancel before the trial ends, your subscription will automatically convert to a paid plan and your payment method will be charged.
                  </P>
                  <H2>Cancellation</H2>
                  <P>
                    You may cancel your subscription at any time through your account settings. Cancellation takes effect at the end of the current billing period. You will continue to have access to Pro features until the end of the period you have paid for.
                  </P>
                  <H2>Refunds</H2>
                  <P>
                    All subscription payments are non-refundable, except where required by applicable law. If you believe a charge was made in error, please contact us at <a href="mailto:billing@plotzy.app">billing@plotzy.app</a> within 7 days of the charge.
                  </P>
                  <H2>Price Changes</H2>
                  <P>
                    We reserve the right to change subscription prices. We will provide at least 30 days' written notice to active subscribers before any price increase takes effect. Your continued use of the Service after the price change constitutes acceptance of the new pricing.
                  </P>
                  <H2>Marketplace Transactions</H2>
                  <P>
                    Authors who sell books through the Plotzy Marketplace agree to our Marketplace Terms. Plotzy may retain a percentage of each sale as a platform fee, as disclosed at the time of listing. Payouts are subject to our payment processing timelines and minimum thresholds.
                  </P>
                </S>

                <S id="ai-features" title="7. AI Writing Features">
                  <P>
                    Plotzy incorporates artificial intelligence tools (including features powered by third-party providers such as OpenAI) to assist with your writing. These tools are designed to support and enhance your creativity, not replace it.
                  </P>
                  <H2>Your Responsibility</H2>
                  <P>
                    You are solely responsible for reviewing, editing, and taking ownership of all AI-generated content before publishing. AI-generated output may be inaccurate, incomplete, biased, or unsuitable for your purposes. We do not warrant the accuracy or fitness of AI-generated content for any particular use.
                  </P>
                  <H2>No AI Training on Your Private Content</H2>
                  <P>
                    We do not use your private, unpublished books or chapters to train AI models. AI features process your content in real time to provide assistance and do not retain your writing beyond the immediate session.
                  </P>
                  <H2>Third-Party AI Providers</H2>
                  <P>
                    When AI features are used, your prompts and relevant context may be transmitted to third-party AI providers under their respective privacy policies. By using AI features, you consent to this processing.
                  </P>
                </S>

                <S id="library" title="8. Public Domain Library">
                  <P>
                    Plotzy provides access to a curated collection of public-domain literary works sourced from Project Gutenberg and other public-domain repositories. These works are free to read and are not owned by Plotzy.
                  </P>
                  <P>
                    The availability of specific titles may change without notice. Plotzy makes no warranties regarding the completeness, accuracy, or formatting of these works. Reading public-domain books through Plotzy is provided as a convenience feature.
                  </P>
                  <P>
                    Books accessed through this library are for personal reading only. You may not redistribute, sell, or commercially exploit the content accessed through the library.
                  </P>
                </S>

                <S id="marketplace" title="9. Marketplace & Community">
                  <H2>Community Library</H2>
                  <P>
                    The Community Library allows users to publish and share their original works with the Plotzy community. By publishing a work publicly, you represent that you hold all necessary rights to that work and that it complies with these Terms.
                  </P>
                  <H2>Content Moderation</H2>
                  <P>
                    We reserve the right to remove any content from the Community Library or Marketplace that violates these Terms, without notice or liability. If you believe content posted by another user violates your rights or these Terms, please report it to <a href="mailto:support@plotzy.app">support@plotzy.app</a>.
                  </P>
                  <H2>User Interactions</H2>
                  <P>
                    Plotzy is not responsible for the content, opinions, or actions of its users. Any disputes between users are the sole responsibility of the parties involved. We encourage respectful, constructive engagement within the community.
                  </P>
                </S>

                <S id="plotzy-ip" title="10. Plotzy Intellectual Property">
                  <P>
                    The Plotzy platform — including its name, logo, branding, user interface design, source code, databases, software, trademarks, and all content created by Plotzy — is the exclusive property of Plotzy and its licensors, and is protected by copyright, trademark, and other intellectual property laws.
                  </P>
                  <P>
                    These Terms do not grant you any right, title, or interest in or to the Plotzy platform or its intellectual property. You may not copy, modify, distribute, sell, sublicense, reverse-engineer, or create derivative works of the platform or any of its components without our express written consent.
                  </P>
                </S>

                <S id="dmca" title="11. Copyright & DMCA">
                  <P>
                    We respect the intellectual property rights of others and expect our users to do the same. We comply with the Digital Millennium Copyright Act (DMCA) and similar laws.
                  </P>
                  <H2>Reporting Infringement</H2>
                  <P>
                    If you believe that content on Plotzy infringes your copyright, please send a written notice ("DMCA Takedown Notice") to our designated agent at <a href="mailto:legal@plotzy.app">legal@plotzy.app</a> containing:
                  </P>
                  <ul>
                    <li>Your name, address, and contact information</li>
                    <li>A description of the copyrighted work you believe has been infringed</li>
                    <li>The URL or location of the allegedly infringing content on our platform</li>
                    <li>A statement that you have a good faith belief that the use is not authorized</li>
                    <li>A statement that the information in the notice is accurate, under penalty of perjury</li>
                    <li>Your physical or electronic signature</li>
                  </ul>
                  <P>
                    We will respond to valid DMCA notices promptly, typically within 72 hours. We reserve the right to terminate the accounts of repeat infringers.
                  </P>
                </S>

                <S id="disclaimer" title="12. Disclaimers">
                  <P>
                    THE SERVICE IS PROVIDED ON AN "AS IS" AND "AS AVAILABLE" BASIS, WITHOUT WARRANTIES OF ANY KIND, EITHER EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO IMPLIED WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, TITLE, AND NON-INFRINGEMENT.
                  </P>
                  <P>
                    We do not warrant that the Service will be uninterrupted, timely, secure, error-free, or that defects will be corrected. We do not warrant the accuracy or reliability of any content obtained through the Service.
                  </P>
                  <P>
                    Some jurisdictions do not allow the exclusion of implied warranties, so some of the above exclusions may not apply to you.
                  </P>
                </S>

                <S id="liability" title="13. Limitation of Liability">
                  <P>
                    TO THE MAXIMUM EXTENT PERMITTED BY APPLICABLE LAW, IN NO EVENT SHALL PLOTZY, ITS DIRECTORS, EMPLOYEES, AGENTS, PARTNERS, SUPPLIERS, OR LICENSORS BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, PUNITIVE, OR EXEMPLARY DAMAGES, INCLUDING BUT NOT LIMITED TO LOSS OF PROFITS, DATA, GOODWILL, OR OTHER INTANGIBLE LOSSES, ARISING OUT OF OR IN CONNECTION WITH YOUR USE OF OR INABILITY TO USE THE SERVICE.
                  </P>
                  <P>
                    IN NO EVENT SHALL PLOTZY'S TOTAL AGGREGATE LIABILITY TO YOU FOR ALL CLAIMS ARISING OUT OF OR RELATED TO THE SERVICE EXCEED THE GREATER OF: (A) THE TOTAL AMOUNT YOU PAID TO PLOTZY IN THE TWELVE (12) MONTHS PRECEDING THE CLAIM, OR (B) ONE HUNDRED U.S. DOLLARS ($100).
                  </P>
                  <P>
                    Some jurisdictions do not allow the limitation of liability for incidental or consequential damages, so the above limitation may not apply to you.
                  </P>
                </S>

                <S id="indemnification" title="14. Indemnification">
                  <P>
                    You agree to defend, indemnify, and hold harmless Plotzy and its officers, directors, employees, agents, and licensors from and against any and all claims, damages, losses, liabilities, costs, and expenses (including reasonable attorneys' fees) arising from or related to:
                  </P>
                  <ul>
                    <li>Your use of the Service</li>
                    <li>Your violation of these Terms</li>
                    <li>Your violation of any applicable law or the rights of any third party</li>
                    <li>Any content you submit, post, or transmit through the Service</li>
                  </ul>
                </S>

                <S id="termination" title="15. Termination">
                  <H2>By You</H2>
                  <P>
                    You may stop using the Service and close your account at any time by visiting your account settings. Upon account deletion, your content will be removed from the platform within 30 days, subject to our data retention obligations.
                  </P>
                  <H2>By Us</H2>
                  <P>
                    We reserve the right to suspend or terminate your account and access to the Service at any time, with or without notice, for any reason, including but not limited to: violation of these Terms, fraudulent activity, extended inactivity, or if required by law.
                  </P>
                  <P>
                    Upon termination, your right to use the Service ceases immediately. All provisions of these Terms that by their nature should survive termination shall survive, including ownership provisions, warranty disclaimers, indemnity, and limitations of liability.
                  </P>
                </S>

                <S id="governing-law" title="16. Governing Law & Disputes">
                  <P>
                    These Terms are governed by and construed in accordance with the laws of the State of Delaware, United States, without regard to its conflict of law principles.
                  </P>
                  <H2>Informal Resolution</H2>
                  <P>
                    Before filing any formal legal claim, you agree to attempt to resolve the dispute informally by contacting us at <a href="mailto:legal@plotzy.app">legal@plotzy.app</a>. We will try to resolve the dispute informally within 30 days.
                  </P>
                  <H2>Binding Arbitration</H2>
                  <P>
                    If informal resolution fails, any dispute arising from or relating to these Terms or the Service shall be finally resolved by binding arbitration under the rules of the American Arbitration Association (AAA). The arbitration will be conducted in English on a confidential basis. You waive your right to a jury trial and to participate in class-action lawsuits.
                  </P>
                  <H2>Exception</H2>
                  <P>
                    Either party may seek emergency injunctive relief in a court of competent jurisdiction to prevent irreparable harm pending arbitration.
                  </P>
                </S>

                <S id="changes" title="17. Changes to Terms">
                  <P>
                    We reserve the right to modify these Terms at any time. We will provide notice of material changes by:
                  </P>
                  <ul>
                    <li>Posting the updated Terms on this page with a new "Effective" date</li>
                    <li>Sending an email notification to your registered email address (for significant changes)</li>
                    <li>Displaying an in-app notification upon your next login</li>
                  </ul>
                  <P>
                    Your continued use of the Service after the effective date of any changes constitutes your acceptance of the updated Terms. If you do not agree to the updated Terms, you must stop using the Service.
                  </P>
                </S>

                <S id="contact" title="18. Contact">
                  <P>If you have any questions, concerns, or requests regarding these Terms, please reach out to us:</P>
                  <div style={{ borderRadius: 12, padding: "24px", marginTop: 8, background: "var(--muted)", display: "flex", flexDirection: "column", gap: 8 }}>
                    <p style={{ margin: 0, fontWeight: 700, fontSize: 16 }}>Plotzy</p>
                    <Row label="General inquiries" value="support@plotzy.app" href="mailto:support@plotzy.app" />
                    <Row label="Legal & DMCA" value="legal@plotzy.app" href="mailto:legal@plotzy.app" />
                    <Row label="Billing & payments" value="billing@plotzy.app" href="mailto:billing@plotzy.app" />
                    <Row label="Privacy requests" value="privacy@plotzy.app" href="mailto:privacy@plotzy.app" />
                  </div>
                  <P style={{ fontSize: 13, marginTop: 24 }}>
                    Also see: <Link href="/privacy" style={{ color: "var(--muted-foreground)", textDecoration: "underline" }}>Privacy Policy</Link>
                  </P>
                </S>

              </div>
            </main>
          </div>
        </div>
      </div>

      {/* Minimal footer */}
      <div style={{ borderTop: "1px solid var(--border)", padding: "20px 24px", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 8 }}>
        <p style={{ margin: 0, fontSize: 12, color: "var(--muted-foreground)" }}>
          &copy; {new Date().getFullYear()} Plotzy, Inc. All rights reserved.
        </p>
        <div style={{ display: "flex", gap: 20, fontSize: 12 }}>
          <Link href="/privacy" style={{ color: "var(--muted-foreground)", textDecoration: "none" }}>Privacy Policy</Link>
          <Link href="/terms" style={{ color: "var(--muted-foreground)", textDecoration: "none" }}>Terms of Service</Link>
        </div>
      </div>
    </div>
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
