import { Layout } from "@/components/layout";

export default function TermsOfService() {
  return (
    <Layout>
      <div style={{ maxWidth: 760, margin: "0 auto", padding: "40px 0 80px" }}>
        <div style={{ marginBottom: 48 }}>
          <p style={{ fontSize: 12, fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--muted-foreground)", marginBottom: 12 }}>
            Legal
          </p>
          <h1 style={{ fontSize: 38, fontWeight: 800, letterSpacing: "-0.03em", lineHeight: 1.1, margin: "0 0 16px" }}>
            Terms of Service
          </h1>
          <p style={{ fontSize: 15, color: "var(--muted-foreground)", lineHeight: 1.7, margin: 0 }}>
            Last updated: March 27, 2026
          </p>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 36 }}>
          <Section title="Agreement to Terms">
            <p>
              By accessing or using Plotzy ("the Service"), you agree to be bound by these Terms of Service ("Terms").
              If you do not agree to all of these Terms, do not access or use the Service. These Terms apply to all
              visitors, users, and others who access the Service.
            </p>
          </Section>

          <Section title="Use of the Service">
            <p>Plotzy grants you a limited, non-exclusive, non-transferable, revocable license to use the Service for your personal,
              non-commercial writing and publishing activities, subject to these Terms.</p>
            <SubHeading>You agree not to:</SubHeading>
            <ul>
              <li>Use the Service for any unlawful purpose or in violation of any regulations.</li>
              <li>Upload or transmit content that is illegal, harmful, threatening, abusive, harassing, defamatory, or otherwise objectionable.</li>
              <li>Infringe upon the intellectual property rights of others.</li>
              <li>Attempt to gain unauthorized access to any part of the Service or its related systems.</li>
              <li>Use automated scripts, bots, or scrapers to interact with the Service without our written consent.</li>
              <li>Interfere with or disrupt the integrity or performance of the Service.</li>
            </ul>
          </Section>

          <Section title="User Accounts">
            <p>
              To access certain features, you must register for an account. You are responsible for maintaining the
              confidentiality of your account credentials and for all activities that occur under your account.
              You agree to notify us immediately of any unauthorized use of your account.
            </p>
            <p>
              We reserve the right to terminate or suspend accounts that violate these Terms, with or without notice.
            </p>
          </Section>

          <Section title="Your Content">
            <p>
              You retain full ownership of all content you create on Plotzy — your books, chapters, articles, and other
              creative works are yours.
            </p>
            <p>
              By submitting content to the Service, you grant Plotzy a limited, worldwide, royalty-free license to store,
              display, and reproduce your content solely for the purpose of operating and improving the Service. This license
              does not grant us rights to sell or distribute your content to third parties.
            </p>
            <p>
              You are solely responsible for the content you publish. By publishing content publicly, you represent that
              you have all necessary rights and permissions to do so.
            </p>
          </Section>

          <Section title="Public Domain Library">
            <p>
              Plotzy provides access to public domain books sourced from Project Gutenberg. These works are free to read
              and are not owned by Plotzy. The availability of these books is provided as a convenience and may change
              without notice. Plotzy makes no warranties regarding the accuracy or completeness of these works.
            </p>
          </Section>

          <Section title="Subscriptions and Payments">
            <p>
              Plotzy offers both free and paid subscription plans. Paid subscriptions are billed in advance on a
              monthly or annual basis and are non-refundable, except where required by law.
            </p>
            <ul>
              <li>You may cancel your subscription at any time. Cancellation takes effect at the end of the current billing period.</li>
              <li>We reserve the right to modify pricing with 30 days notice to active subscribers.</li>
              <li>All payments are processed securely through Stripe. By subscribing, you agree to Stripe's terms of service.</li>
            </ul>
          </Section>

          <Section title="AI Features">
            <p>
              Plotzy uses artificial intelligence features (powered by OpenAI) to assist your writing. These features
              are provided as creative tools only. You are responsible for reviewing and editing all AI-generated content
              before publishing. AI-generated content may be inaccurate, incomplete, or not suitable for your purposes.
            </p>
          </Section>

          <Section title="Intellectual Property">
            <p>
              The Plotzy platform, including its design, logos, trademarks, and software, is owned by Plotzy, Inc. and
              is protected by intellectual property laws. You may not copy, modify, distribute, or create derivative works
              based on the platform without our express written consent.
            </p>
          </Section>

          <Section title="Disclaimer of Warranties">
            <p>
              The Service is provided "as is" and "as available" without warranties of any kind, either express or implied,
              including but not limited to implied warranties of merchantability, fitness for a particular purpose, or
              non-infringement. We do not warrant that the Service will be uninterrupted, error-free, or secure.
            </p>
          </Section>

          <Section title="Limitation of Liability">
            <p>
              To the maximum extent permitted by applicable law, Plotzy shall not be liable for any indirect, incidental,
              special, consequential, or punitive damages arising from your use of the Service, even if we have been
              advised of the possibility of such damages. Our total liability to you shall not exceed the amount you
              paid us in the twelve months prior to the claim.
            </p>
          </Section>

          <Section title="Governing Law">
            <p>
              These Terms shall be governed by and construed in accordance with the laws of the State of Delaware,
              United States, without regard to conflict of law principles. Any disputes arising under these Terms
              shall be subject to the exclusive jurisdiction of the courts located in Delaware.
            </p>
          </Section>

          <Section title="Changes to Terms">
            <p>
              We reserve the right to modify these Terms at any time. We will notify you of material changes by
              posting the updated Terms on this page and updating the "Last updated" date. Continued use of the
              Service after changes constitutes acceptance of the new Terms.
            </p>
          </Section>

          <Section title="Contact Us">
            <p>
              If you have questions about these Terms, please contact us at:
            </p>
            <div style={{ background: "var(--muted)", borderRadius: 12, padding: "20px 24px", marginTop: 8 }}>
              <p style={{ margin: 0, fontWeight: 600 }}>Plotzy, Inc.</p>
              <p style={{ margin: "4px 0 0" }}>
                <a href="mailto:legal@plotzy.app" style={{ color: "inherit" }}>legal@plotzy.app</a>
              </p>
            </div>
          </Section>
        </div>
      </div>
    </Layout>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 style={{ fontSize: 20, fontWeight: 700, letterSpacing: "-0.02em", margin: "0 0 14px", paddingBottom: 10, borderBottom: "1px solid var(--border)" }}>
        {title}
      </h2>
      <div style={{ fontSize: 15, lineHeight: 1.8, color: "var(--muted-foreground)", display: "flex", flexDirection: "column", gap: 10 }}>
        {children}
      </div>
    </section>
  );
}

function SubHeading({ children }: { children: React.ReactNode }) {
  return (
    <p style={{ fontWeight: 600, color: "var(--foreground)", margin: "8px 0 4px", fontSize: 14 }}>
      {children}
    </p>
  );
}
