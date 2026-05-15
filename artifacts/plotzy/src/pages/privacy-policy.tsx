import { useEffect, useState } from "react";
import { Link } from "wouter";
import { ArrowLeft, ChevronRight } from "lucide-react";
import { SEO } from "@/components/SEO";
import { JsonLd } from "@/components/JsonLd";
import { buildBreadcrumbSchema } from "@/lib/seo-schema";
import { useLanguage } from "@/contexts/language-context";

const SECTIONS = [
  { id: "overview",      label: "Overview",                 labelAr: "نظرة عامة" },
  { id: "data-collect",  label: "Data We Collect",          labelAr: "البيانات التي نجمعها" },
  { id: "how-we-use",    label: "How We Use Your Data",     labelAr: "كيف نستخدم بياناتك" },
  { id: "sharing",       label: "Sharing & Third Parties",  labelAr: "المشاركة والأطراف الثالثة" },
  { id: "retention",     label: "Data Retention",           labelAr: "الاحتفاظ بالبيانات" },
  { id: "your-rights",   label: "Your Rights",              labelAr: "حقوقك" },
  { id: "cookies",       label: "Cookies & Tracking",       labelAr: "ملفات الكوكيز والتتبّع" },
  { id: "security",      label: "Security",                 labelAr: "الأمان" },
  { id: "children",      label: "Children's Privacy",       labelAr: "خصوصية الأطفال" },
  { id: "transfers",     label: "International Transfers",   labelAr: "النقل الدولي للبيانات" },
  { id: "changes",       label: "Changes to This Policy",   labelAr: "التغييرات على هذه السياسة" },
  { id: "contact",       label: "Contact Us",               labelAr: "تواصل معنا" },
];

export default function PrivacyPolicy() {
  const { lang } = useLanguage();
  const ar = lang === "ar";
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
    <div dir={ar ? "rtl" : "ltr"} style={{ minHeight: "100vh", background: "var(--background)", color: "var(--foreground)" }}>
      <SEO
        title={ar ? "سياسة الخصوصية" : "Privacy Policy"}
        description={ar ? "كيف تتعامل بلوتزي مع بياناتك وخياراتك المتعلّقة بالخصوصية." : "How Plotzy handles your data and your privacy choices."}
      />
      <JsonLd data={buildBreadcrumbSchema([{ name: ar ? "سياسة الخصوصية" : "Privacy Policy", path: "/privacy" }])} />
      {/* Minimal header */}
      <header style={{ borderBottom: "1px solid var(--border)", position: "sticky", top: 0, background: "var(--background)", zIndex: 50, backdropFilter: "blur(12px)" }}>
        <div style={{ maxWidth: 1120, margin: "0 auto", padding: "0 clamp(14px, 4vw, 24px)", height: 52, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <Link href="/" style={{ textDecoration: "none", display: "flex", alignItems: "center", gap: 8 }}>
            <img src={`${import.meta.env.BASE_URL}plotzy-logo.png`} alt="Plotzy" style={{ width: 22, height: 22, objectFit: "contain", borderRadius: 5 }} />
            <span style={{ fontWeight: 800, fontSize: 13.5, letterSpacing: "-0.05em" }}>PLOTZY</span>
          </Link>
          <Link href="/" style={{ textDecoration: "none" }}>
            <div style={{ display: "inline-flex", alignItems: "center", gap: 5, color: "var(--muted-foreground)", fontSize: 13, cursor: "pointer" }}>
              <ArrowLeft style={{ width: 13, height: 13 }} />
              {ar ? "رجوع" : "Back"}
            </div>
          </Link>
        </div>
      </header>

      <div style={{ paddingTop: 40, paddingBottom: 120 }}>
        <div style={{ maxWidth: 1120, margin: "0 auto", padding: "0 clamp(14px, 4vw, 24px)" }}>

          <style>{`
            @media (max-width: 699px) {
              .terms-grid { grid-template-columns: 1fr !important; gap: 24px !important; }
              .terms-grid > aside { display: none !important; }
              .terms-grid h1 { font-size: 32px !important; }
            }
          `}</style>
          <div className="terms-grid" style={{ display: "grid", gridTemplateColumns: "220px 1fr", gap: 64, alignItems: "start" }}>

            <aside style={{ position: "sticky", top: 88 }}>
              <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--muted-foreground)", marginBottom: 16 }}>
                {ar ? "المحتويات" : "Contents"}
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
                    {ar ? s.labelAr : s.label}
                  </button>
                ))}
              </nav>

              <div style={{ marginTop: 32, padding: "16px", borderRadius: 10, background: "var(--muted)", fontSize: 12, lineHeight: 1.6, color: "var(--muted-foreground)" }}>
                <p style={{ fontWeight: 600, color: "var(--foreground)", marginBottom: 4 }}>{ar ? "أسئلة عن الخصوصية؟" : "Privacy questions?"}</p>
                <a href="mailto:privacy@plotzy.co" style={{ color: "var(--muted-foreground)" }}>privacy@plotzy.co</a>
              </div>
            </aside>

            <main>
              <div style={{ marginBottom: 56 }}>
                <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--muted-foreground)", marginBottom: 12 }}>
                  {ar ? "قانوني" : "Legal"}
                </p>
                <h1 style={{ fontSize: 42, fontWeight: 800, letterSpacing: "-0.03em", lineHeight: 1.1, margin: "0 0 16px" }}>
                  {ar ? "سياسة الخصوصية" : "Privacy Policy"}
                </h1>
                <div style={{ display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
                  <span style={{ fontSize: 14, color: "var(--muted-foreground)" }}>{ar ? "سارية اعتباراً من: 11 مايو 2026" : "Effective: May 11, 2026"}</span>
                  <span style={{ fontSize: 14, color: "var(--muted-foreground)" }}>·</span>
                  <Link href="/terms" style={{ fontSize: 14, color: "var(--muted-foreground)", textDecoration: "underline" }}>
                    {ar ? "شروط الخدمة" : "Terms of Service"}
                  </Link>
                </div>
                <p style={{ fontSize: 15, lineHeight: 1.8, color: "var(--muted-foreground)", marginTop: 24, padding: "16px 20px", borderRadius: 10, background: "var(--muted)", borderLeft: "3px solid var(--border)" }}>
                  {ar
                    ? "خصوصيتك تهمّنا. توضّح هذه السياسة بالضبط ما البيانات التي تجمعها بلوتزي، ولماذا نجمعها، وكيف نحميها، وما الحقوق التي تملكها عليها، بلغة واضحة."
                    : "Your privacy matters to us. This policy explains exactly what data Plotzy collects, why we collect it, how we protect it, and what rights you have over it, in plain language."}
                </p>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: 48 }}>

                <S id="overview" title={ar ? "1. نظرة عامة" : "1. Overview"}>
                  <P>
                    {ar
                      ? "بلوتزي («نحن»، «لنا»، «الخاصة بنا») منصة كتابة إبداعية. عند استخدامك بلوتزي، فإنك تأتمننا على معلوماتك الشخصية وعملك الإبداعي. ونحن نأخذ هذه الأمانة على محمل الجدّ."
                      : 'Plotzy ("we," "our," "us") is a creative writing platform. When you use Plotzy, you trust us with your personal information and your creative work. We take that trust seriously.'}
                  </P>
                  <P>
                    {ar
                      ? "تنطبق سياسة الخصوصية هذه على كل المعلومات المجموعة عبر موقعنا وتطبيقاتنا وأي خدمات ذات صلة (يُشار إليها مجتمعةً بـ«الخدمة»). وباستخدامك بلوتزي، فإنك توافق على جمع المعلومات واستخدامها وفقاً لهذه السياسة."
                      : 'This Privacy Policy applies to all information collected through our website, applications, and any related services (collectively, the "Service"). By using Plotzy, you agree to the collection and use of information in accordance with this policy.'}
                  </P>
                  <P>
                    <strong>{ar ? "التزاماتنا تجاهك:" : "Our commitments to you:"}</strong>
                  </P>
                  <ul>
                    <li>{ar ? "لن نبيع بياناتك الشخصية لأطراف ثالثة أبداً" : "We will never sell your personal data to third parties"}</li>
                    <li>{ar ? "لن نستخدم كتابتك الخاصة لتدريب نماذج الذكاء الاصطناعي أبداً" : "We will never use your private writing to train AI models"}</li>
                    <li>{ar ? "سنكون شفّافين بشأن البيانات التي نجمعها ولماذا" : "We will be transparent about what data we collect and why"}</li>
                    <li>{ar ? "سنمنحك تحكّماً فعلياً في بياناتك" : "We will give you meaningful control over your data"}</li>
                    <li>{ar ? "سنحمي بياناتك بإجراءات أمان بمعايير الصناعة" : "We will protect your data with industry-standard security measures"}</li>
                  </ul>
                </S>

                <S id="data-collect" title={ar ? "2. البيانات التي نجمعها" : "2. Data We Collect"}>
                  <H2>{ar ? "معلومات تقدّمها مباشرةً" : "Information You Provide Directly"}</H2>
                  <ul>
                    <li>
                      <strong>{ar ? "معلومات الحساب:" : "Account information:"}</strong> {ar ? "اسم العرض، والبريد الإلكتروني، وصورة الملف الشخصي عند تسجيلك أو ربطك عبر Google أو Apple أو LinkedIn (OAuth)." : "display name, email address, and profile picture when you register or connect via Google, Apple, or LinkedIn OAuth."}
                    </li>
                    <li>
                      <strong>{ar ? "محتواك الإبداعي:" : "Your creative content:"}</strong> {ar ? "الكتب، والفصول، والمقالات، وصور الأغلفة، وملاحظات الموسوعة، وأي كتابة أخرى تنشئها وتخزّنها على بلوتزي. هذا المحتوى ملك لك." : "books, chapters, articles, cover images, lore notes, and any other writing you create and store on Plotzy. This content belongs to you."}
                    </li>
                    <li>
                      <strong>{ar ? "معلومات الملف الشخصي:" : "Profile information:"}</strong> {ar ? "السيرة الذاتية، والموقع الإلكتروني، ومعرّفات وسائل التواصل، وتفاصيل أخرى تضيفها إلى ملفك العام." : "biography, website, social media handles, and other details you add to your public profile."}
                    </li>
                    <li>
                      <strong>{ar ? "المراسلات:" : "Communications:"}</strong> {ar ? "الرسائل التي ترسلها إلى فريق الدعم وأي ملاحظات أو بلاغات تقدّمها." : "messages you send to our support team and any feedback or reports you submit."}
                    </li>
                    <li>
                      <strong>{ar ? "معلومات الدفع:" : "Payment information:"}</strong> {ar ? "عنوان الفوترة وتفاصيل طريقة الدفع. لا نخزّن رقم بطاقتك كاملاً؛ تُعالَج كل المدفوعات بأمان بواسطة PayPal." : "billing address and payment method details. We do not store your full card number, and all payment processing is handled securely by PayPal."}
                    </li>
                  </ul>

                  <H2>{ar ? "معلومات تُجمَع تلقائياً" : "Information Collected Automatically"}</H2>
                  <ul>
                    <li>
                      <strong>{ar ? "بيانات الاستخدام:" : "Usage data:"}</strong> {ar ? "الصفحات المزارة، والميزات المستخدمة، والأزرار المضغوطة، والوقت المقضيّ في أجزاء مختلفة من المنصة، وبيانات وصفية لجلسة الكتابة (مثل محطّات عدد الكلمات)." : "pages visited, features used, buttons clicked, time spent on various parts of the platform, and writing session metadata (e.g., word count milestones)."}
                    </li>
                    <li>
                      <strong>{ar ? "بيانات الجهاز والبيانات التقنية:" : "Device & technical data:"}</strong> {ar ? "عنوان IP، ونوع المتصفّح وإصداره، ونظام التشغيل، ومعرّفات الجهاز، ودقّة الشاشة، وعناوين URL المُحيلة." : "IP address, browser type and version, operating system, device identifiers, screen resolution, and referring URLs."}
                    </li>
                    <li>
                      <strong>{ar ? "بيانات الجلسة:" : "Session data:"}</strong> {ar ? "رموز المصادقة، ومدّة الجلسة، وطوابع وقت تسجيل الدخول المستخدمة للحفاظ على جلستك الآمنة." : "authentication tokens, session duration, and login timestamps used to maintain your secure session."}
                    </li>
                    <li>
                      <strong>{ar ? "سجلات الأخطاء:" : "Error logs:"}</strong> {ar ? "تقارير الأعطال وسجلات الأخطاء التي تساعدنا على تصحيح الخدمة وتحسينها." : "crash reports and error logs that help us debug and improve the Service."}
                    </li>
                  </ul>

                  <H2>{ar ? "معلومات من أطراف ثالثة" : "Information from Third Parties"}</H2>
                  <ul>
                    <li>
                      <strong>{ar ? "مزوّدو OAuth:" : "OAuth providers:"}</strong> {ar ? "عند تسجيل دخولك عبر Google أو Apple أو LinkedIn، نتلقّى اسمك وبريدك الإلكتروني وصورة ملفك الشخصي من ذلك المزوّد، وفق ما تسمح به إعداداتك على تلك المنصة." : "when you sign in via Google, Apple, or LinkedIn, we receive your name, email address, and profile picture from that provider, as permitted by your settings on that platform."}
                    </li>
                    <li>
                      <strong>{ar ? "معالج الدفع:" : "Payment processor:"}</strong> {ar ? "يشارك PayPal معنا حالة المعاملة ومعلومات الفوترة لتأكيد المدفوعات الناجحة." : "PayPal shares transaction status and billing information with us to confirm successful payments."}
                    </li>
                  </ul>
                </S>

                <S id="how-we-use" title={ar ? "3. كيف نستخدم بياناتك" : "3. How We Use Your Data"}>
                  <P>{ar ? "نستخدم المعلومات التي نجمعها للأغراض التالية:" : "We use the information we collect for the following purposes:"}</P>
                  <H2>{ar ? "لتقديم الخدمة وتشغيلها" : "To Provide and Operate the Service"}</H2>
                  <ul>
                    <li>{ar ? "التحقّق من هويتك والحفاظ على حسابك" : "Authenticate your identity and maintain your account"}</li>
                    <li>{ar ? "تخزين كتبك وفصولك ومقالاتك ومزامنتها وعرضها" : "Store, sync, and display your books, chapters, and articles"}</li>
                    <li>{ar ? "معالجة مدفوعات الاشتراك وإدارة الفوترة" : "Process subscription payments and manage billing"}</li>
                    <li>{ar ? "تمكين ميزات المشاركة والنشر والمتجر" : "Enable sharing, publishing, and marketplace features"}</li>
                    <li>{ar ? "تقديم ميزات المساعدة بالذكاء الاصطناعي في الوقت الفعلي" : "Deliver AI writing assistance features in real time"}</li>
                  </ul>
                  <H2>{ar ? "للتحسين والتخصيص" : "To Improve and Personalize"}</H2>
                  <ul>
                    <li>{ar ? "تحليل كيفية تفاعل المستخدمين مع الميزات لتوجيه تطوير المنتج" : "Analyze how users interact with features to guide product development"}</li>
                    <li>{ar ? "تذكّر تفضيلاتك (السمة، واللغة, وإعدادات الخط)" : "Remember your preferences (theme, language, font settings)"}</li>
                    <li>{ar ? "تحديد العلل والأخطاء واختناقات الأداء" : "Identify bugs, errors, and performance bottlenecks"}</li>
                    <li>{ar ? "تطوير ميزات جديدة وتحسين الموجودة" : "Develop new features and improve existing ones"}</li>
                  </ul>
                  <H2>{ar ? "للتواصل معك" : "To Communicate with You"}</H2>
                  <ul>
                    <li>{ar ? "إرسال رسائل المعاملات: تأكيد الحساب، وإعادة تعيين كلمة المرور، وإيصالات الفوترة" : "Send transactional emails: account confirmation, password reset, billing receipts"}</li>
                    <li>{ar ? "إخطارك بالتغييرات المهمة في شروطنا أو سياسة الخصوصية" : "Notify you of significant changes to our Terms or Privacy Policy"}</li>
                    <li>{ar ? "الردّ على طلبات الدعم واستفساراتك" : "Respond to your support requests and inquiries"}</li>
                    <li>{ar ? "إرسال تحديثات المنتج أو النشرات (فقط بموافقتك الصريحة، ويمكنك إلغاء الاشتراك في أي وقت)" : "Send product updates or newsletters (only with your explicit consent, and you can unsubscribe at any time)"}</li>
                  </ul>
                  <H2>{ar ? "للحفاظ على السلامة والنزاهة" : "To Maintain Safety and Integrity"}</H2>
                  <ul>
                    <li>{ar ? "كشف الاحتيال وإساءة الاستخدام والحوادث الأمنية والتحقيق فيها ومنعها" : "Detect, investigate, and prevent fraud, abuse, and security incidents"}</li>
                    <li>{ar ? "إنفاذ شروط الخدمة وسياسات المحتوى لدينا" : "Enforce our Terms of Service and content policies"}</li>
                    <li>{ar ? "الامتثال للالتزامات القانونية والاستجابة للطلبات المشروعة" : "Comply with legal obligations and respond to lawful requests"}</li>
                  </ul>
                </S>

                <S id="sharing" title={ar ? "4. المشاركة والأطراف الثالثة" : "4. Sharing & Third Parties"}>
                  <P>
                    <strong>{ar ? "نحن لا نبيع معلوماتك الشخصية." : "We do not sell your personal information."}</strong> {ar ? "نشارك بياناتك فقط في الحالات المحدودة التالية:" : "We only share your data in the following limited circumstances:"}
                  </P>
                  <H2>{ar ? "مزوّدو الخدمة (المعالِجون الفرعيون)" : "Service Providers (Subprocessors)"}</H2>
                  <P>
                    {ar
                      ? "نشارك البيانات مع موردين موثوقين من أطراف ثالثة يساعدوننا في تشغيل الخدمة. هؤلاء المزوّدون ملزَمون تعاقدياً باستخدام بياناتك فقط لأداء خدمات لنا وحماية معلوماتك. القائمة الكاملة أدناه؛ وكل بند يرتبط بسياسة خصوصية المزوّد نفسه:"
                      : "We share data with trusted third-party vendors who help us operate the Service. These providers are contractually bound to use your data only to perform services for us and to protect your information. The complete list is below; each entry links to the provider's own privacy policy:"}
                  </P>
                  <ul>
                    <li>
                      <strong>PayPal</strong>: {ar ? "معالجة المدفوعات للاشتراكات ومعاملات المتجر." : "payment processing for subscriptions and Marketplace transactions."}{" "}
                      <a href="https://www.paypal.com/us/legalhub/privacy-full" target="_blank" rel="noopener noreferrer">{ar ? "سياسة الخصوصية" : "Privacy policy"}</a>
                    </li>
                    <li>
                      <strong>OpenAI</strong>: {ar ? "ميزات المساعدة في الكتابة بالذكاء الاصطناعي. تُرسَل موجّهاتك والسياق ذو الصلة إلى OpenAI فقط عند تشغيلك ميزة ذكاء اصطناعي؛ ولا نرسل كتبك أو فصولك الخاصة لأي معالجة في الخلفية." : "AI writing assistance features. Your prompts and the relevant context are sent to OpenAI only when you trigger an AI feature; we do not send your private books or chapters for any background processing."}{" "}
                      <a href="https://openai.com/policies/privacy-policy" target="_blank" rel="noopener noreferrer">{ar ? "سياسة الخصوصية" : "Privacy policy"}</a>
                    </li>
                    <li>
                      <strong>Resend</strong>: {ar ? "تسليم رسائل المعاملات (تحقّق الحساب، وإعادة تعيين كلمة المرور، وإيصالات الاشتراك، وإشعارات التعليقات والإعجابات)." : "transactional email delivery (account verification, password resets, subscription receipts, comment and like notifications)."}{" "}
                      <a href="https://resend.com/legal/privacy-policy" target="_blank" rel="noopener noreferrer">{ar ? "سياسة الخصوصية" : "Privacy policy"}</a>
                    </li>
                    <li>
                      <strong>Sentry</strong>: {ar ? "تتبّع الأخطاء. عند حدوث عطل، يتلقّى Sentry تتبّع المكدّس، والعنوان الذي كنت فيه، ومعرّفك الرقمي كي نتمكّن من التصحيح؛ ولا يتلقّى محتوى كتابك أو فصلك." : "error tracking. When something crashes, Sentry receives the stack trace, the URL you were on, and your numeric user ID so we can debug; it does not receive your book or chapter content."}{" "}
                      <a href="https://sentry.io/privacy/" target="_blank" rel="noopener noreferrer">{ar ? "سياسة الخصوصية" : "Privacy policy"}</a>
                    </li>
                    <li>
                      <strong>Neon</strong>: {ar ? "استضافة PostgreSQL المُدارة. تُخزَّن بيانات حسابك وكتاباتك على عناقيد Postgres التي يديرها Neon في الولايات المتحدة." : "managed PostgreSQL hosting. Your account data and writing are stored on Neon-managed Postgres clusters in the United States."}{" "}
                      <a href="https://neon.tech/privacy-policy" target="_blank" rel="noopener noreferrer">{ar ? "سياسة الخصوصية" : "Privacy policy"}</a>
                    </li>
                    <li>
                      <strong>Google</strong>: {ar ? "تسجيل الدخول عبر Google (OAuth). يُستخدم فقط عند اختيارك تسجيل الدخول عبر Google؛ ونتلقّى اسمك وبريدك وصورة ملفك من Google." : "Sign in with Google (OAuth). Used only when you choose to sign in via Google; we receive your name, email, and profile picture from Google."}{" "}
                      <a href="https://policies.google.com/privacy" target="_blank" rel="noopener noreferrer">{ar ? "سياسة الخصوصية" : "Privacy policy"}</a>
                    </li>
                    <li>
                      <strong>Apple</strong>: {ar ? "تسجيل الدخول عبر Apple (OAuth). يُستخدم فقط عند اختيارك تسجيل الدخول عبر Apple؛ ونتلقّى اسمك وعنوان بريد إلكتروني (قد يكون مُحوَّلاً) من Apple." : "Sign in with Apple (OAuth). Used only when you choose to sign in via Apple; we receive your name and a (possibly relayed) email address from Apple."}{" "}
                      <a href="https://www.apple.com/legal/privacy/en-ww/" target="_blank" rel="noopener noreferrer">{ar ? "سياسة الخصوصية" : "Privacy policy"}</a>
                    </li>
                    <li>
                      <strong>LinkedIn</strong>: {ar ? "تسجيل الدخول عبر LinkedIn (OAuth). يُستخدم فقط عند اختيارك تسجيل الدخول عبر LinkedIn؛ ونتلقّى اسمك وبريدك وصورة ملفك من LinkedIn." : "Sign in with LinkedIn (OAuth). Used only when you choose to sign in via LinkedIn; we receive your name, email, and profile picture from LinkedIn."}{" "}
                      <a href="https://www.linkedin.com/legal/privacy-policy" target="_blank" rel="noopener noreferrer">{ar ? "سياسة الخصوصية" : "Privacy policy"}</a>
                    </li>
                  </ul>
                  <P>
                    {ar
                      ? <>سنحدّث هذه القائمة عند إضافة معالج فرعي أو إزالته. وإذا أردت أن تُخطَر بالتغييرات مسبقاً، راسلنا على <a href="mailto:privacy@plotzy.co">privacy@plotzy.co</a>.</>
                      : <>We will update this list when we add or remove a subprocessor. If you'd like to be notified of changes in advance, email us at <a href="mailto:privacy@plotzy.co">privacy@plotzy.co</a>.</>}
                  </P>
                  <H2>{ar ? "المحتوى العام" : "Public Content"}</H2>
                  <P>
                    {ar
                      ? "المحتوى الذي تنشره صراحةً في مكتبة المجتمع أو المتجر أو ملف المؤلف العام الخاص بك يكون مرئياً لمستخدمي بلوتزي الآخرين، وربما للعامّة. ويشمل ذلك اسم العرض وصورة الملف الشخصي والسيرة الذاتية والأعمال المنشورة."
                      : "Content you explicitly publish to the Community Library, Marketplace, or your public author profile is visible to other Plotzy users and potentially to the public. This includes your display name, profile picture, bio, and published works."}
                  </P>
                  <H2>{ar ? "المتطلّبات القانونية" : "Legal Requirements"}</H2>
                  <P>
                    {ar
                      ? "قد نفصح عن معلوماتك إذا كان ذلك مطلوباً بموجب القانون أو اللوائح أو الإجراءات القانونية أو طلب حكومي، أو لحماية حقوق بلوتزي أو ممتلكاتها أو سلامتها، أو حقوق مستخدمينا أو العامّة وسلامتهم."
                      : "We may disclose your information if required to do so by law, regulation, legal process, or governmental request, or to protect the rights, property, or safety of Plotzy, our users, or the public."}
                  </P>
                  <H2>{ar ? "عمليات نقل الأعمال" : "Business Transfers"}</H2>
                  <P>
                    {ar
                      ? "إذا كانت بلوتزي طرفاً في اندماج أو استحواذ أو بيع لكل أصولها أو جزء منها، فقد تُنقَل معلوماتك كجزء من تلك المعاملة. وسنُخطرك عبر البريد الإلكتروني و/أو إشعار بارز على الخدمة قبل النقل، ونمنحك خيار حذف حسابك إن اخترت ألّا توافق."
                      : "If Plotzy is involved in a merger, acquisition, or sale of all or a portion of its assets, your information may be transferred as part of that transaction. We will notify you via email and/or a prominent notice on the Service prior to the transfer and give you the option to delete your account if you choose not to consent."}
                  </P>
                  <H2>{ar ? "بموافقتك" : "With Your Consent"}</H2>
                  <P>
                    {ar
                      ? "قد نشارك بياناتك مع أطراف ثالثة لأي غرض آخر بموافقتك الصريحة."
                      : "We may share your data with third parties for any other purpose with your explicit consent."}
                  </P>
                </S>

                <S id="retention" title={ar ? "5. الاحتفاظ بالبيانات" : "5. Data Retention"}>
                  <P>
                    {ar
                      ? "نحتفظ بمعلوماتك الشخصية ومحتواك طالما كان حسابك نشطاً أو حسب الحاجة لتقديم الخدمة لك. ويمكنك حذف حسابك في أي وقت من إعدادات حسابك."
                      : "We retain your personal information and content for as long as your account is active or as needed to provide you with the Service. You may delete your account at any time through your account settings."}
                  </P>
                  <P>
                    {ar ? "عند حذف الحساب:" : "Upon account deletion:"}
                  </P>
                  <ul>
                    <li>{ar ? <>تُحذف معلوماتك الشخصية ومحتواك الخاص نهائياً خلال <strong>30 يوماً</strong></> : <>Your personal information and private content will be permanently deleted within <strong>30 days</strong></>}</li>
                    <li>{ar ? "الأعمال المنشورة التي اشتراها مستخدمون آخرون قد تبقى في مكتباتهم" : "Published works that have been purchased by other users may be retained in their libraries"}</li>
                    <li>{ar ? "بيانات الاستخدام مجهولة الهوية والتحليلات المجمّعة قد تبقى إلى أجل غير مسمّى" : "Anonymized usage data and aggregated analytics may be retained indefinitely"}</li>
                    <li>{ar ? "المعلومات المطلوبة لأغراض قانونية أو ضريبية أو تدقيقية قد تبقى حتى 7 سنوات حسبما يقتضي القانون" : "Information required for legal, tax, or audit purposes may be retained for up to 7 years as required by law"}</li>
                  </ul>

                  <H2>{ar ? "النسخ الاحتياطية" : "Backups"}</H2>
                  <P>
                    {ar
                      ? <>نأخذ نسخاً احتياطية مشفّرة لقاعدة البيانات للتعافي من الكوارث. تُحفظ النسخ الاحتياطية لمدة تصل إلى <strong>30 يوماً</strong> ضمن نافذة متجدّدة. وبعد تلك المدّة، تُزال أي بيانات حذفتها نهائياً من أنظمة النسخ الاحتياطي أيضاً؛ ولا يمكننا استرجاعها لك، ولا يمكن لأحد غيرنا ذلك. وهذه ممارسة معيارية في الصناعة تمنحنا شبكة أمان قصيرة للحوادث الكارثية (مثل تلف قاعدة البيانات) دون إبقاء البيانات المحذوفة إلى أجل غير مسمّى.</>
                      : <>We take encrypted database backups for disaster recovery. Backups are kept for up to <strong>30 days</strong> on a rolling window. After that period, any data you've deleted is permanently removed from our backup systems too, and we cannot retrieve it for you, and no one else can either. This is a standard industry practice that gives us a short safety net for catastrophic incidents (e.g., a corrupt database) without keeping deleted data around indefinitely.</>}
                  </P>
                  <P>
                    {ar
                      ? "خلال نافذة الـ30 يوماً، تظلّ البيانات المحذوفة موجودة في لقطات نسخ احتياطي غير قابلة للتعديل. ولا نستعلم عن النسخ الاحتياطية أو نتصفّحها أو نعمل عليها إلا في سيناريو تعافٍ حقيقي، وأي وصول يُسجَّل."
                      : "During the 30-day window, deleted data continues to exist in immutable backup snapshots. We do not query, browse, or operate against backups except in a genuine recovery scenario, and any access is logged."}
                  </P>

                  <P>
                    {ar
                      ? <>لطلب حذف بياناتك، تواصل معنا على <a href="mailto:privacy@plotzy.co">privacy@plotzy.co</a> أو استخدم خيار حذف الحساب في الإعدادات.</>
                      : <>To request deletion of your data, contact us at <a href="mailto:privacy@plotzy.co">privacy@plotzy.co</a> or use the account deletion option in Settings.</>}
                  </P>
                </S>

                <S id="your-rights" title={ar ? "6. حقوقك" : "6. Your Rights"}>
                  <P>
                    {ar
                      ? "تبعاً لمكان وجودك، قد تكون لك الحقوق التالية بشأن بياناتك الشخصية. ونحن نحترم هذه الحقوق بغضّ النظر عن موقعك."
                      : "Depending on where you are located, you may have the following rights regarding your personal data. We honor these rights regardless of your location."}
                  </P>

                  <H2>{ar ? "لكل المستخدمين" : "For All Users"}</H2>
                  <ul>
                    <li><strong>{ar ? "الوصول:" : "Access:"}</strong> {ar ? "طلب نسخة من البيانات الشخصية التي نحتفظ بها عنك" : "Request a copy of the personal data we hold about you"}</li>
                    <li><strong>{ar ? "التصحيح:" : "Correction:"}</strong> {ar ? "تحديث أو تصحيح المعلومات غير الدقيقة أو الناقصة (يمكن تحديث أغلب البيانات مباشرةً من الإعدادات)" : "Update or correct inaccurate or incomplete information (most data can be updated directly in Settings)"}</li>
                    <li><strong>{ar ? "الحذف:" : "Deletion:"}</strong> {ar ? "طلب محو حسابك وبياناتك الشخصية" : "Request erasure of your account and personal data"}</li>
                    <li>
                      <strong>{ar ? "قابلية النقل:" : "Portability:"}</strong> {ar ? "أخذ محتواك معك بصيغ قابلة للقراءة آلياً. توجد واجهتان مدمجتان في المنتج:" : "Take your content with you in machine-readable formats. Two surfaces are built into the product:"}
                      <ul style={{ marginTop: 6, marginBottom: 0 }}>
                        <li><strong>{ar ? "تصدير كل كتاب على حدة:" : "Per-book export:"}</strong> {ar ? "تنزيل أي كتاب مفرد بصيغة PDF أو EPUB أو TXT أو DOCX (مايكروسوفت وورد) من صفحة الكتاب." : "download any individual book as PDF, EPUB, TXT, or DOCX (Microsoft Word) from the book's page."}</li>
                        <li><strong>{ar ? "تصدير الحساب كاملاً:" : "Complete account export:"}</strong> {ar ? <>تنزيل ملف JSON واحد يحتوي كل قطعة من بياناتك الشخصية التي نحتفظ بها عنك (الكتب، والفصول، واللقطات، والتعليقات، والتقييمات، وسجل الاشتراك، وتقدّم الدورة، والرسم البياني الاجتماعي، وسجل التدقيق، وملف الحساب) من <a href="/account/settings">/account/settings</a> ثم «بياناتك» ثم «تنزيل كل بياناتي».</> : <>download a single JSON file containing every piece of personal data we hold about you (books, chapters, snapshots, comments, ratings, subscription history, course progress, social graph, audit log, and account profile) from <a href="/account/settings">/account/settings</a> then "Your data" then "Download all my data".</>}</li>
                      </ul>
                    </li>
                    <li><strong>{ar ? "إلغاء الاشتراك:" : "Opt-out:"}</strong> {ar ? "إلغاء الاشتراك من رسائل التسويق في أي وقت عبر رابط إلغاء الاشتراك في أي رسالة" : "Unsubscribe from marketing emails at any time via the unsubscribe link in any email"}</li>
                  </ul>

                  <H2>{ar ? "للمستخدمين في الاتحاد الأوروبي (GDPR)" : "For Users in the European Union (GDPR)"}</H2>
                  <ul>
                    <li><strong>{ar ? "حق التقييد:" : "Right to restriction:"}</strong> {ar ? "طلب أن نحدّ من كيفية معالجتنا لبياناتك في ظروف معيّنة" : "Request that we limit how we process your data in certain circumstances"}</li>
                    <li><strong>{ar ? "حق الاعتراض:" : "Right to object:"}</strong> {ar ? "الاعتراض على معالجة بياناتك لأغراض التسويق المباشر أو المصلحة المشروعة" : "Object to the processing of your data for direct marketing or legitimate interest purposes"}</li>
                    <li><strong>{ar ? "حق سحب الموافقة:" : "Right to withdraw consent:"}</strong> {ar ? "حين تستند المعالجة إلى الموافقة، سحبها في أي وقت دون التأثير على مشروعية المعالجة السابقة" : "Where processing is based on consent, withdraw it at any time without affecting the lawfulness of prior processing"}</li>
                    <li><strong>{ar ? "حق تقديم شكوى:" : "Right to lodge a complaint:"}</strong> {ar ? "تقديم شكوى إلى هيئة حماية البيانات المحلية لديك" : "File a complaint with your local data protection authority"}</li>
                  </ul>

                  <H2>{ar ? "لسكّان كاليفورنيا (CCPA / CPRA)" : "For California Residents (CCPA / CPRA)"}</H2>
                  <ul>
                    <li>{ar ? "حق معرفة المعلومات الشخصية التي تُجمَع أو تُستخدَم أو تُشارَك أو تُباع" : "The right to know what personal information is collected, used, shared, or sold"}</li>
                    <li>{ar ? "حق حذف المعلومات الشخصية المجموعة منك" : "The right to delete personal information collected from you"}</li>
                    <li>{ar ? "حق رفض بيع المعلومات الشخصية (نحن لا نبيع المعلومات الشخصية)" : "The right to opt-out of the sale of personal information (we do not sell personal information)"}</li>
                    <li>{ar ? "حق عدم التمييز ضدّك لممارستك حقوق الخصوصية" : "The right to non-discrimination for exercising your privacy rights"}</li>
                  </ul>

                  <P>
                    {ar
                      ? <>لممارسة أيٍّ من هذه الحقوق، تواصل معنا على <a href="mailto:privacy@plotzy.co">privacy@plotzy.co</a>. سنردّ على كل الطلبات خلال 30 يوماً.</>
                      : <>To exercise any of these rights, contact us at <a href="mailto:privacy@plotzy.co">privacy@plotzy.co</a>. We will respond to all requests within 30 days.</>}
                  </P>
                </S>

                <S id="cookies" title={ar ? "7. ملفات الكوكيز والتتبّع" : "7. Cookies & Tracking"}>
                  <P>
                    {ar
                      ? "نستخدم ملفات الكوكيز وتقنيات تتبّع مماثلة لتشغيل الخدمة بفعالية. وهذا بالضبط ما نستخدمه:"
                      : "We use cookies and similar tracking technologies to operate the Service effectively. Here is exactly what we use:"}
                  </P>

                  <H2>{ar ? "كوكيز أساسية (مطلوبة)" : "Essential Cookies (Required)"}</H2>
                  <P>
                    {ar ? "هذه الكوكيز ضرورية لعمل الخدمة. ولا يمكن تعطيلها." : "These cookies are necessary for the Service to function. They cannot be disabled."}
                  </P>
                  <ul>
                    <li><strong>{ar ? "كوكي الجلسة:" : "Session cookie:"}</strong> {ar ? "يحافظ على جلستك المصادَق عليها كي لا تضطر لتسجيل الدخول في كل صفحة" : "maintains your authenticated session so you don't have to log in on every page"}</li>
                    <li><strong>{ar ? "حماية CSRF:" : "CSRF protection:"}</strong> {ar ? "تمنع هجمات تزوير الطلبات عبر المواقع" : "prevents cross-site request forgery attacks"}</li>
                  </ul>

                  <H2>{ar ? "كوكيز التفضيلات" : "Preference Cookies"}</H2>
                  <P>
                    {ar ? "تتذكّر إعداداتك لتحسين تجربتك." : "These remember your settings to improve your experience."}
                  </P>
                  <ul>
                    <li>{ar ? "تفضيل اللغة (العربية / الإنجليزية)" : "Language preference (Arabic / English)"}</li>
                    <li>{ar ? "سمة القراءة (الوضع الفاتح / الداكن في قارئ الكتب)" : "Reading theme (light / dark mode in the book reader)"}</li>
                    <li>{ar ? "حجم الخط وتفضيلات المحرّر الأخرى" : "Font size and other editor preferences"}</li>
                  </ul>

                  <H2>{ar ? "التحليلات (اختيارية)" : "Analytics (Optional)"}</H2>
                  <P>
                    {ar
                      ? "نستخدم تحليلات تحترم الخصوصية لفهم كيفية استخدام المنصة. ولا تُشارَك أي معرّفات شخصية مع مزوّدي التحليلات."
                      : "We use privacy-respecting analytics to understand how the platform is used. No personal identifiers are shared with analytics providers."}
                  </P>

                  <H2>{ar ? "إدارة الكوكيز" : "Managing Cookies"}</H2>
                  <P>
                    {ar
                      ? "يمكنك التحكّم في الكوكيز وحذفها من إعدادات متصفّحك. تعطيل الكوكيز الأساسية سيمنعك من تسجيل الدخول واستخدام الخدمة. وتعطيل كوكيز التفضيلات سيعيد إعداداتك إلى الافتراضية في كل زيارة."
                      : "You can control and delete cookies through your browser settings. Disabling essential cookies will prevent you from logging in and using the Service. Disabling preference cookies will reset your settings to defaults each visit."}
                  </P>
                </S>

                <S id="security" title={ar ? "8. الأمان" : "8. Security"}>
                  <P>
                    {ar ? "نطبّق ممارسات أمان بمعايير الصناعة لحماية معلوماتك:" : "We implement industry-standard security practices to protect your information:"}
                  </P>
                  <ul>
                    <li><strong>{ar ? "التشفير أثناء النقل:" : "Encryption in transit:"}</strong> {ar ? "تُنقَل كل البيانات عبر HTTPS / TLS" : "all data is transmitted over HTTPS / TLS"}</li>
                    <li><strong>{ar ? "أمان كلمة المرور:" : "Password security:"}</strong> {ar ? "تُجزَّأ كلمات المرور باستخدام bcrypt؛ ولا نخزّن كلمات مرور بنصّ صريح أبداً" : "passwords are hashed using bcrypt, and we never store plaintext passwords"}</li>
                    <li><strong>{ar ? "ضوابط الوصول:" : "Access controls:"}</strong> {ar ? "وصول صارم قائم على الأدوار يضمن أن الموظّفين المخوّلين فقط يمكنهم الوصول إلى بيانات الإنتاج" : "strict role-based access ensures only authorized staff can access production data"}</li>
                    <li><strong>{ar ? "أمان قاعدة البيانات:" : "Database security:"}</strong> {ar ? "قواعد البيانات غير متاحة للعامّة ومحميّة بقواعد جدار الحماية" : "databases are not publicly accessible and are protected by firewall rules"}</li>
                    <li><strong>{ar ? "تدقيقات منتظمة:" : "Regular audits:"}</strong> {ar ? "نراجع ممارساتنا الأمنية بانتظام ونحدّثها حسب الحاجة" : "we regularly review our security practices and update them as needed"}</li>
                  </ul>
                  <P>
                    {ar
                      ? "ومع ذلك، لا توجد طريقة نقل عبر الإنترنت أو طريقة تخزين إلكتروني آمنة بنسبة 100%. ومع سعينا لحماية معلوماتك الشخصية، لا يمكننا ضمان أمانها المطلق."
                      : "However, no method of transmission over the Internet or method of electronic storage is 100% secure. While we strive to protect your personal information, we cannot guarantee its absolute security."}
                  </P>
                  <P>
                    {ar
                      ? <>إذا كنت تعتقد أن حسابك قد اختُرق أو اكتشفت ثغرة أمنية، يرجى التواصل معنا فوراً على <a href="mailto:security@plotzy.co">security@plotzy.co</a>.</>
                      : <>If you believe your account has been compromised or you discover a security vulnerability, please contact us immediately at <a href="mailto:security@plotzy.co">security@plotzy.co</a>.</>}
                  </P>
                </S>

                <S id="children" title={ar ? "9. خصوصية الأطفال" : "9. Children's Privacy"}>
                  <P>
                    {ar
                      ? <>الخدمة غير موجّهة للأطفال دون 13 عاماً. ولا نجمع عن قصد معلومات شخصية من أطفال دون 13. وإذا كنت والداً أو وصياً وتعتقد أن طفلك قدّم لنا معلومات شخصية، يرجى التواصل معنا على <a href="mailto:privacy@plotzy.co">privacy@plotzy.co</a> وسنحذف المعلومات فوراً.</>
                      : <>The Service is not directed to children under 13 years of age. We do not knowingly collect personal information from children under 13. If you are a parent or guardian and believe your child has provided us with personal information, please contact us at <a href="mailto:privacy@plotzy.co">privacy@plotzy.co</a> and we will delete the information promptly.</>}
                  </P>
                  <P>
                    {ar
                      ? "على المستخدمين بين 13 و18 عاماً أن يجعلوا والداً أو وصياً يراجع هذه السياسات ويوافق عليها نيابةً عنهم. ونشجّع الآباء على الإشراف على استخدام أطفالهم للخدمات عبر الإنترنت."
                      : "Users between 13 and 18 years old must have a parent or guardian review and agree to these policies on their behalf. We encourage parents to supervise their children's use of online services."}
                  </P>
                </S>

                <S id="transfers" title={ar ? "10. النقل الدولي للبيانات" : "10. International Data Transfers"}>
                  <P>
                    {ar
                      ? "مقرّ بلوتزي في الولايات المتحدة. إذا كنت تصل إلى الخدمة من خارج الولايات المتحدة، فيرجى العلم أن معلوماتك قد تُنقَل إلى الولايات المتحدة ودول أخرى يعمل فيها مزوّدو خدماتنا، وتُخزَّن وتُعالَج فيها."
                      : "Plotzy is based in the United States. If you are accessing the Service from outside the United States, please be aware that your information may be transferred to, stored, and processed in the United States and other countries where our service providers operate."}
                  </P>
                  <P>
                    {ar
                      ? "للمستخدمين في المنطقة الاقتصادية الأوروبية أو المملكة المتحدة أو سويسرا، نضمن أن أي نقل دولي لبياناتك محميّ بضمانات مناسبة، بما في ذلك البنود التعاقدية المعيارية (SCCs) المعتمَدة من المفوّضية الأوروبية."
                      : "For users in the European Economic Area (EEA), United Kingdom, or Switzerland, we ensure that any international transfers of your data are protected by appropriate safeguards, including Standard Contractual Clauses (SCCs) approved by the European Commission."}
                  </P>
                </S>

                <S id="changes" title={ar ? "11. التغييرات على هذه السياسة" : "11. Changes to This Policy"}>
                  <P>
                    {ar ? "قد نحدّث سياسة الخصوصية هذه من وقت لآخر. وعند إجراء تغييرات جوهرية، سنقوم بـ:" : "We may update this Privacy Policy from time to time. When we make material changes, we will:"}
                  </P>
                  <ul>
                    <li>{ar ? "تحديث تاريخ «سارية» في أعلى هذه الصفحة" : 'Update the "Effective" date at the top of this page'}</li>
                    <li>{ar ? "إرسال إشعار بالبريد الإلكتروني إلى عنوانك المسجّل" : "Send an email notification to your registered email address"}</li>
                    <li>{ar ? "عرض إشعار بارز داخل التطبيق عند تسجيل دخولك التالي" : "Display a prominent in-app notice upon your next login"}</li>
                  </ul>
                  <P>
                    {ar
                      ? "نشجّعك على مراجعة هذه السياسة دورياً. واستمرارك في استخدام الخدمة بعد سريان أي تغييرات يشكّل قبولاً منك للسياسة المحدَّثة."
                      : "We encourage you to review this policy periodically. Your continued use of the Service after any changes become effective constitutes your acceptance of the updated policy."}
                  </P>
                </S>

                <S id="contact" title={ar ? "12. تواصل معنا" : "12. Contact Us"}>
                  <P>
                    {ar
                      ? "إذا كانت لديك أي أسئلة أو مخاوف أو طلبات بخصوص سياسة الخصوصية هذه أو كيفية تعاملنا مع بياناتك، يرجى التواصل معنا:"
                      : "If you have any questions, concerns, or requests regarding this Privacy Policy or how we handle your data, please contact us:"}
                  </P>
                  <div style={{ borderRadius: 12, padding: "24px", marginTop: 8, background: "var(--muted)", display: "flex", flexDirection: "column", gap: 8 }}>
                    <p style={{ margin: 0, fontWeight: 700, fontSize: 16 }}>{ar ? "بلوتزي · فريق الخصوصية" : "Plotzy · Privacy Team"}</p>
                    <Row label={ar ? "طلبات الخصوصية" : "Privacy requests"} value="privacy@plotzy.co" href="mailto:privacy@plotzy.co" />
                    <Row label={ar ? "مشكلات الأمان" : "Security issues"} value="security@plotzy.co" href="mailto:security@plotzy.co" />
                    <Row label={ar ? "الدعم العام" : "General support"} value="support@plotzy.co" href="mailto:support@plotzy.co" />
                  </div>
                  <P style={{ fontSize: 13, marginTop: 24 }}>
                    {ar
                      ? <>وقت الاستجابة: نهدف إلى الردّ على كل طلبات الخصوصية خلال <strong>5 أيام عمل</strong> وإتمامها خلال <strong>30 يوماً</strong>.</>
                      : <>Response time: We aim to respond to all privacy requests within <strong>5 business days</strong> and complete them within <strong>30 days</strong>.</>}
                  </P>
                  <P style={{ fontSize: 13 }}>
                    {ar
                      ? <>انظر أيضاً: <Link href="/terms" style={{ color: "var(--muted-foreground)", textDecoration: "underline" }}>شروط الخدمة</Link></>
                      : <>Also see: <Link href="/terms" style={{ color: "var(--muted-foreground)", textDecoration: "underline" }}>Terms of Service</Link></>}
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
          &copy; {new Date().getFullYear()} Plotzy, Inc. {ar ? "كل الحقوق محفوظة." : "All rights reserved."}
        </p>
        <div style={{ display: "flex", gap: 20, fontSize: 12 }}>
          <Link href="/privacy" style={{ color: "var(--muted-foreground)", textDecoration: "none" }}>{ar ? "سياسة الخصوصية" : "Privacy Policy"}</Link>
          <Link href="/terms" style={{ color: "var(--muted-foreground)", textDecoration: "none" }}>{ar ? "شروط الخدمة" : "Terms of Service"}</Link>
        </div>
      </div>
    </div>
  );
}

function S({ id, title, children }: { id: string; title: string; children: React.ReactNode }) {
  return (
    <section id={id} style={{ scrollMarginTop: 96 }}>
      <h2 style={{ fontSize: 22, fontWeight: 700, letterSpacing: "-0.02em", margin: "0 0 16px" }}>
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
