import { Layout } from "@/components/layout";

export default function PrivacyPolicy() {
  return (
    <Layout>
      <div style={{ maxWidth: 760, margin: "0 auto", padding: "40px 0 80px" }}>
        <div style={{ marginBottom: 48 }}>
          <p style={{ fontSize: 12, fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--muted-foreground)", marginBottom: 12 }}>
            Legal
          </p>
          <h1 style={{ fontSize: 38, fontWeight: 800, letterSpacing: "-0.03em", lineHeight: 1.1, margin: "0 0 16px" }}>
            Privacy Policy
          </h1>
          <p style={{ fontSize: 15, color: "var(--muted-foreground)", lineHeight: 1.7, margin: 0 }}>
            Last updated: March 27, 2026
          </p>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 36 }}>
          <Section title="Introduction">
            <p>
              Plotzy ("we," "our," or "us") is committed to protecting your privacy. This Privacy Policy explains how we collect,
              use, disclose, and safeguard your information when you use our platform at plotzy.app (the "Service").
            </p>
            <p>
              Please read this policy carefully. If you disagree with its terms, please discontinue use of the Service.
            </p>
          </Section>

          <Section title="Information We Collect">
            <SubHeading>Information you provide directly</SubHeading>
            <ul>
              <li><strong>Account information:</strong> display name, email address, profile picture.</li>
              <li><strong>Content:</strong> books, chapters, articles, and other creative writing you create on Plotzy.</li>
              <li><strong>Communications:</strong> messages you send to our support team.</li>
              <li><strong>Payment information:</strong> billing details processed securely through Stripe. We never store your full card number.</li>
            </ul>
            <SubHeading>Information collected automatically</SubHeading>
            <ul>
              <li><strong>Usage data:</strong> pages visited, features used, time spent on the platform.</li>
              <li><strong>Device data:</strong> browser type, operating system, IP address, and device identifiers.</li>
              <li><strong>Cookies:</strong> session cookies for authentication and preference cookies to remember your settings.</li>
            </ul>
          </Section>

          <Section title="How We Use Your Information">
            <p>We use the information we collect to:</p>
            <ul>
              <li>Provide, operate, and maintain the Service.</li>
              <li>Process transactions and manage your subscription.</li>
              <li>Send you service-related communications (account confirmations, billing receipts).</li>
              <li>Improve and personalize your experience.</li>
              <li>Analyze usage patterns to develop new features.</li>
              <li>Detect and prevent fraud or abuse.</li>
              <li>Comply with legal obligations.</li>
            </ul>
          </Section>

          <Section title="Sharing Your Information">
            <p>We do not sell your personal information. We may share it only in the following circumstances:</p>
            <ul>
              <li><strong>Service providers:</strong> trusted third-party vendors (e.g., Stripe for payments, OpenAI for AI features) who help us operate the Service under strict confidentiality agreements.</li>
              <li><strong>Public content:</strong> books or profiles you explicitly choose to publish are visible to other users.</li>
              <li><strong>Legal requirements:</strong> when required by law, court order, or governmental authority.</li>
              <li><strong>Business transfers:</strong> in connection with a merger, acquisition, or sale of assets, with advance notice to you.</li>
            </ul>
          </Section>

          <Section title="Data Retention">
            <p>
              We retain your personal information for as long as your account is active or as needed to provide the Service.
              You may request deletion of your account and associated data at any time by contacting us at{" "}
              <a href="mailto:privacy@plotzy.app" style={{ color: "inherit" }}>privacy@plotzy.app</a>.
              Deleted data is permanently removed within 30 days, except where retention is required by law.
            </p>
          </Section>

          <Section title="Cookies">
            <p>
              We use cookies and similar tracking technologies to maintain your session, remember your preferences (such as
              theme and language), and analyze usage. You can control cookies through your browser settings, though disabling
              them may affect certain features of the Service.
            </p>
          </Section>

          <Section title="Your Rights">
            <p>Depending on your location, you may have the following rights regarding your personal data:</p>
            <ul>
              <li><strong>Access:</strong> request a copy of the data we hold about you.</li>
              <li><strong>Correction:</strong> update inaccurate or incomplete information.</li>
              <li><strong>Deletion:</strong> request erasure of your personal data.</li>
              <li><strong>Portability:</strong> receive your data in a structured, machine-readable format.</li>
              <li><strong>Objection:</strong> opt out of certain processing activities.</li>
            </ul>
            <p>
              To exercise any of these rights, contact us at{" "}
              <a href="mailto:privacy@plotzy.app" style={{ color: "inherit" }}>privacy@plotzy.app</a>.
            </p>
          </Section>

          <Section title="Security">
            <p>
              We implement industry-standard security measures including encryption in transit (TLS), hashed passwords,
              and access controls to protect your information. However, no method of transmission over the internet is 100%
              secure, and we cannot guarantee absolute security.
            </p>
          </Section>

          <Section title="Children's Privacy">
            <p>
              The Service is not directed to children under 13 years of age. We do not knowingly collect personal information
              from children under 13. If you believe we have inadvertently collected such information, please contact us immediately.
            </p>
          </Section>

          <Section title="Changes to This Policy">
            <p>
              We may update this Privacy Policy from time to time. We will notify you of significant changes by posting
              the new policy on this page and updating the "Last updated" date. We encourage you to review this policy periodically.
            </p>
          </Section>

          <Section title="Contact Us">
            <p>
              If you have any questions or concerns about this Privacy Policy, please contact us at:
            </p>
            <div style={{ background: "var(--muted)", borderRadius: 12, padding: "20px 24px", marginTop: 8 }}>
              <p style={{ margin: 0, fontWeight: 600 }}>Plotzy, Inc.</p>
              <p style={{ margin: "4px 0 0" }}>
                <a href="mailto:privacy@plotzy.app" style={{ color: "inherit" }}>privacy@plotzy.app</a>
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
