import { useEffect, useState } from "react";
import { Link } from "wouter";
import { ArrowLeft, ChevronRight } from "lucide-react";
import { SEO } from "@/components/SEO";
import { JsonLd } from "@/components/JsonLd";
import { buildBreadcrumbSchema } from "@/lib/seo-schema";
import { useLanguage } from "@/contexts/language-context";

const SECTIONS = [
  { id: "acceptance",       label: "Acceptance of Terms",          labelAr: "قبول الشروط" },
  { id: "service",          label: "Description of Service",        labelAr: "وصف الخدمة" },
  { id: "eligibility",      label: "Eligibility & Accounts",        labelAr: "الأهلية والحسابات" },
  { id: "your-content",     label: "Your Content & Ownership",      labelAr: "محتواك وملكيته" },
  { id: "prohibited",       label: "Prohibited Conduct",            labelAr: "السلوك المحظور" },
  { id: "subscriptions",    label: "Subscriptions & Payments",      labelAr: "الاشتراكات والمدفوعات" },
  { id: "ai-features",      label: "AI Writing Features",           labelAr: "ميزات الكتابة بالذكاء الاصطناعي" },
  { id: "library",          label: "Public Domain Library",         labelAr: "مكتبة الملك العام" },
  { id: "marketplace",      label: "Marketplace & Community",       labelAr: "المتجر والمجتمع" },
  { id: "plotzy-ip",        label: "Plotzy Intellectual Property",  labelAr: "الملكية الفكرية لبلوتزي" },
  { id: "dmca",             label: "Copyright & DMCA",              labelAr: "حقوق النشر وقانون DMCA" },
  { id: "disclaimer",       label: "Disclaimers",                   labelAr: "إخلاء المسؤولية" },
  { id: "liability",        label: "Limitation of Liability",       labelAr: "حدود المسؤولية" },
  { id: "indemnification",  label: "Indemnification",               labelAr: "التعويض" },
  { id: "termination",      label: "Termination",                   labelAr: "الإنهاء" },
  { id: "governing-law",    label: "Governing Law",                 labelAr: "القانون الحاكم" },
  { id: "changes",          label: "Changes to Terms",              labelAr: "التغييرات على الشروط" },
  { id: "contact",          label: "Contact",                       labelAr: "تواصل" },
];

export default function TermsOfService() {
  const { lang } = useLanguage();
  const ar = lang === "ar";
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
    <div dir={ar ? "rtl" : "ltr"} style={{ minHeight: "100vh", background: "var(--background)", color: "var(--foreground)" }}>
      <SEO
        title={ar ? "شروط الخدمة" : "Terms of Service"}
        description={ar ? "الاتفاق بينك وبين بلوتزي: استخدام الحساب، وحقوق المحتوى، والمدفوعات، والأمور القانونية." : "The agreement between you and Plotzy: account use, content rights, payments, and legal."}
      />
      <JsonLd data={buildBreadcrumbSchema([{ name: ar ? "شروط الخدمة" : "Terms of Service", path: "/terms" }])} />
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
                <p style={{ fontWeight: 600, color: "var(--foreground)", marginBottom: 4 }}>{ar ? "لديك أسئلة؟" : "Have questions?"}</p>
                <a href="mailto:legal@plotzy.co" style={{ color: "var(--muted-foreground)" }}>legal@plotzy.co</a>
              </div>
            </aside>

            <main>
              <div style={{ marginBottom: 56 }}>
                <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--muted-foreground)", marginBottom: 12 }}>
                  {ar ? "قانوني" : "Legal"}
                </p>
                <h1 style={{ fontSize: 42, fontWeight: 800, letterSpacing: "-0.03em", lineHeight: 1.1, margin: "0 0 16px" }}>
                  {ar ? "شروط الخدمة" : "Terms of Service"}
                </h1>
                <div style={{ display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
                  <span style={{ fontSize: 14, color: "var(--muted-foreground)" }}>{ar ? "سارية اعتباراً من: 3 أبريل 2026" : "Effective: April 3, 2026"}</span>
                  <span style={{ fontSize: 14, color: "var(--muted-foreground)" }}>·</span>
                  <Link href="/privacy" style={{ fontSize: 14, color: "var(--muted-foreground)", textDecoration: "underline" }}>
                    {ar ? "سياسة الخصوصية" : "Privacy Policy"}
                  </Link>
                </div>
                <p style={{ fontSize: 15, lineHeight: 1.8, color: "var(--muted-foreground)", marginTop: 24, padding: "16px 20px", borderRadius: 10, background: "var(--muted)", borderLeft: "3px solid var(--border)" }}>
                  {ar
                    ? "يرجى قراءة هذه الشروط بعناية قبل استخدام بلوتزي. بإنشائك حساباً أو وصولك إلى أي جزء من الخدمة، فإنك تؤكّد أنك قرأت هذه الشروط وفهمتها وتوافق على الالتزام بها."
                    : "Please read these Terms carefully before using Plotzy. By creating an account or accessing any part of the Service, you confirm that you have read, understood, and agree to be bound by these Terms."}
                </p>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: 48 }}>

                <S id="acceptance" title={ar ? "1. قبول الشروط" : "1. Acceptance of Terms"}>
                  <P>
                    {ar
                      ? 'تشكّل شروط الخدمة هذه («الشروط») اتفاقاً ملزِماً قانونياً بينك («المستخدم»، «أنت») وبين بلوتزي («الشركة»، «نحن»، «لنا») يحكم وصولك إلى منصة بلوتزي وموقعها وتطبيقاتها للجوال وكل الخدمات ذات الصلة (يُشار إليها مجتمعةً بـ«الخدمة») واستخدامك لها.'
                      : 'These Terms of Service ("Terms") constitute a legally binding agreement between you ("User," "you") and Plotzy ("Company," "we," "us," "our") governing your access to and use of the Plotzy platform, website, mobile applications, and all related services (collectively, the "Service").'}
                  </P>
                  <P>
                    {ar
                      ? 'بتسجيلك لحساب، أو ضغطك «أوافق»، أو وصولك إلى الخدمة أو استخدامها بأي شكل آخر، فإنك تقرّ بأنك قرأت هذه الشروط وسياسة الخصوصية لدينا وفهمتهما وتوافق على الالتزام بهما، وسياسة الخصوصية مُدمَجة هنا بالإشارة.'
                      : 'By registering for an account, clicking "I Agree," or otherwise accessing or using the Service, you acknowledge that you have read, understood, and agree to be bound by these Terms and our Privacy Policy, which is incorporated herein by reference.'}
                  </P>
                  <P>
                    {ar
                      ? 'إذا كنت تستخدم الخدمة نيابةً عن مؤسسة، فإنك تقرّ وتضمن أن لديك الصلاحية لإلزام تلك المؤسسة بهذه الشروط، وتشير كلمة «أنت» إليك فردياً وإلى المؤسسة معاً.'
                      : 'If you are using the Service on behalf of an organization, you represent and warrant that you have the authority to bind that organization to these Terms, and "you" refers to both you individually and the organization.'}
                  </P>
                </S>

                <S id="service" title={ar ? "2. وصف الخدمة" : "2. Description of Service"}>
                  <P>
                    {ar
                      ? "بلوتزي منصة كتابة ونشر إبداعية تزوّد المستخدمين بأدوات للكتابة وتنظيم الكتب والفصول والمقالات وتحريرها ونشرها. وتشمل الخدمة، على سبيل المثال لا الحصر:"
                      : "Plotzy is a creative writing and publishing platform that provides users with tools to write, organize, edit, and publish books, chapters, and articles. The Service includes, but is not limited to:"}
                  </P>
                  <ul>
                    <li>{ar ? "محرّر كتب وفصول بنص منسّق مع مساعدة كتابة بالذكاء الاصطناعي" : "A rich-text book and chapter editor with AI writing assistance"}</li>
                    <li>{ar ? "مكتبة مجتمع لنشر أعمالك ومشاركتها" : "A community library for publishing and sharing your works"}</li>
                    <li>{ar ? "متجر لبيع كتبك لمستخدمين آخرين" : "A marketplace for selling your books to other users"}</li>
                    <li>{ar ? "مكتبة قراءة من الملك العام مدعومة بمشروع جوتنبرج" : "A public-domain reading library powered by Project Gutenberg"}</li>
                    <li>{ar ? "أدلّة كتابة ودروس وموارد تعليمية" : "Writing guides, tutorials, and educational resources"}</li>
                    <li>{ar ? "أدوات إدارة الموسوعة وبناء العالم" : "Lore and worldbuilding management tools"}</li>
                    <li>{ar ? "ميزات تصميم الغلاف وتنسيق الكتاب" : "Cover design and book formatting features"}</li>
                    <li>{ar ? "الإملاء الصوتي وأدوات كتابة مدعومة بالذكاء الاصطناعي" : "Voice dictation and AI-powered writing tools"}</li>
                  </ul>
                  <P>
                    {ar
                      ? "نحتفظ بالحق في تعديل أي ميزة من الخدمة أو تعليقها أو إيقافها في أي وقت، بإشعار أو دونه. ولن نكون مسؤولين تجاهك أو تجاه أي طرف ثالث عن أي تعديل أو تعليق أو إيقاف للخدمة."
                      : "We reserve the right to modify, suspend, or discontinue any feature of the Service at any time, with or without notice. We will not be liable to you or any third party for any modification, suspension, or discontinuation of the Service."}
                  </P>
                </S>

                <S id="eligibility" title={ar ? "3. الأهلية والحسابات" : "3. Eligibility & Accounts"}>
                  <H2>{ar ? "متطلّبات العمر" : "Age Requirements"}</H2>
                  <P>
                    {ar
                      ? "يجب أن يكون عمرك 13 عاماً على الأقل لاستخدام الخدمة. وإذا كنت دون 18، فإنك تقرّ بأن والدك أو وصيك القانوني راجع هذه الشروط ووافق عليها نيابةً عنك. ولا نجمع عن قصد معلومات من أطفال دون 13."
                      : "You must be at least 13 years of age to use the Service. If you are under 18, you represent that your parent or legal guardian has reviewed and agreed to these Terms on your behalf. We do not knowingly collect information from children under 13."}
                  </P>
                  <H2>{ar ? "تسجيل الحساب" : "Account Registration"}</H2>
                  <P>
                    {ar
                      ? "للوصول إلى أغلب الميزات، يجب أن تنشئ حساباً بتقديم معلومات دقيقة وكاملة. وتوافق على إبقاء معلومات حسابك محدّثة والحفاظ على أمان بيانات تسجيل دخولك وسرّيتها."
                      : "To access most features, you must create an account by providing accurate and complete information. You agree to keep your account information up to date and to maintain the security and confidentiality of your login credentials."}
                  </P>
                  <P>
                    {ar
                      ? <>أنت وحدك مسؤول عن كل الأنشطة التي تحدث تحت حسابك. وتوافق على إخطارنا فوراً على <a href="mailto:support@plotzy.co">support@plotzy.co</a> بأي استخدام غير مصرّح به لحسابك أو أي خرق أمني آخر.</>
                      : <>You are solely responsible for all activities that occur under your account. You agree to immediately notify us at <a href="mailto:support@plotzy.co">support@plotzy.co</a> of any unauthorized use of your account or any other security breach.</>}
                  </P>
                  <H2>{ar ? "حساب واحد لكل شخص" : "One Account Per Person"}</H2>
                  <P>
                    {ar
                      ? "لا يجوز لك إنشاء حسابات متعدّدة بغرض التحايل على القيود أو إساءة استغلال التجارب المجانية أو أي غرض احتيالي آخر. ونحتفظ بالحق في دمج الحسابات المكرّرة أو إنهائها."
                      : "You may not create multiple accounts for the purpose of circumventing restrictions, abusing free trials, or any other fraudulent purpose. We reserve the right to merge or terminate duplicate accounts."}
                  </P>
                </S>

                <S id="your-content" title={ar ? "4. محتواك وملكيته" : "4. Your Content & Ownership"}>
                  <H2>{ar ? "أنت تملك عملك" : "You Own Your Work"}</H2>
                  <P>
                    <strong>{ar ? "أعمالك الإبداعية، من كتب وفصول ومقالات وأي محتوى آخر تكتبه على بلوتزي، تبقى ملكك بالكامل." : "Your creative works, books, chapters, articles, and any other content you write on Plotzy, remain entirely yours."}</strong> {ar ? "ولا ندّعي أي ملكية لمحتواك الإبداعي الأصلي." : "We make no claim of ownership over your original creative content."}
                  </P>
                  <H2>{ar ? "الترخيص الذي تمنحنا إياه" : "License You Grant Us"}</H2>
                  <P>
                    {ar
                      ? "برفعك أو تقديمك محتوى إلى الخدمة، فإنك تمنح بلوتزي ترخيصاً محدوداً وعالمياً وغير حصري ومجانياً وقابلاً للترخيص من الباطن لاستضافة محتواك وتخزينه ونسخه ونقله وعرضه وتوزيعه، وذلك حصراً لغرض تشغيل الخدمة وتقديمها وتحسينها."
                      : "By uploading or submitting content to the Service, you grant Plotzy a limited, worldwide, non-exclusive, royalty-free, sublicensable license to host, store, copy, transmit, display, and distribute your content solely for the purpose of operating, providing, and improving the Service."}
                  </P>
                  <P>
                    {ar
                      ? <>هذا الترخيص <strong>لا</strong> يمنحنا الحق في بيع محتواك، أو نشره لأطراف ثالثة دون موافقتك، أو استخدامه في الإعلانات، أو ادّعاء تأليفه.</>
                      : <>This license does <strong>not</strong> grant us the right to sell your content, publish it to third parties without your consent, use it for advertising, or claim authorship.</>}
                  </P>
                  <H2>{ar ? "المحتوى المنشور والعام" : "Published & Public Content"}</H2>
                  <P>
                    {ar
                      ? "عند نشرك كتاباً أو مقالاً في مكتبة المجتمع أو المتجر، فإنك تمنح مستخدمي الخدمة الآخرين الحق في قراءة ذلك المحتوى والوصول إليه عبر المنصة. ويمكنك إلغاء نشر المحتوى في أي وقت، وبعدها لن يعود متاحاً لقرّاء جدد (مع أن النسخ التي سبق تنزيلها أو شراؤها قد تظلّ موجودة وفق حقوق أولئك المستخدمين)."
                      : "When you publish a book or article to the Community Library or Marketplace, you grant other users of the Service the right to read and access that content through the platform. You may unpublish content at any time, after which it will no longer be accessible to new readers (though copies previously downloaded or purchased may still exist per those users' rights)."}
                  </P>
                  <H2>{ar ? "إقراراتك" : "Your Representations"}</H2>
                  <P>{ar ? "بتقديمك محتوى، فإنك تقرّ وتضمن ما يلي:" : "By submitting content, you represent and warrant that:"}</P>
                  <ul>
                    <li>{ar ? "أنك تملك المحتوى الذي ترفعه أو لديك كل الحقوق اللازمة له" : "You own or have all necessary rights to the content you upload"}</li>
                    <li>{ar ? "أن محتواك لا ينتهك الملكية الفكرية أو الخصوصية أو حق الدعاية أو أي حقوق أخرى لأي طرف ثالث" : "Your content does not infringe the intellectual property, privacy, publicity, or other rights of any third party"}</li>
                    <li>{ar ? "أن محتواك يمتثل لكل القوانين واللوائح المعمول بها" : "Your content complies with all applicable laws and regulations"}</li>
                    <li>{ar ? "أنك حصلت على كل الأذونات اللازمة لأي مادة من طرف ثالث مُضمَّنة في محتواك" : "You have obtained all necessary permissions for any third-party material included in your content"}</li>
                  </ul>
                </S>

                <S id="prohibited" title={ar ? "5. السلوك المحظور" : "5. Prohibited Conduct"}>
                  <P>{ar ? "توافق على ألّا تستخدم الخدمة لإنشاء أو رفع أو نشر أو نقل أو إتاحة محتوى:" : "You agree not to use the Service to create, upload, publish, transmit, or otherwise make available content that:"}</P>
                  <ul>
                    <li>{ar ? "غير قانوني أو ضارّ أو مهدِّد أو مسيء أو متحرّش أو تشهيري أو قذفي" : "Is illegal, harmful, threatening, abusive, harassing, defamatory, or libelous"}</li>
                    <li>{ar ? "يحرّض على العنف أو الكراهية أو التمييز على أساس العِرق أو الإثنية أو الدين أو الجنس أو الميل الجنسي أو الإعاقة أو الأصل القومي" : "Incites violence, hatred, or discrimination based on race, ethnicity, religion, gender, sexual orientation, disability, or national origin"}</li>
                    <li>{ar ? "يحتوي مواد جنسية صريحة تتضمّن قُصّراً، أو ذا طبيعة إباحية حيث يحظره القانون المعمول به" : "Contains sexually explicit material involving minors (CSAM), or is pornographic in nature where prohibited by applicable law"}</li>
                    <li>{ar ? "يشكّل بريداً مزعجاً أو ترويجاً غير مرغوب أو استدراجاً تجارياً" : "Constitutes spam, unsolicited promotions, or commercial solicitation"}</li>
                    <li>{ar ? "ينتهك أي براءة اختراع أو علامة تجارية أو سرّاً تجارياً أو حق نشر أو أي حق ملكية فكرية آخر" : "Infringes any patent, trademark, trade secret, copyright, or other intellectual property right"}</li>
                    <li>{ar ? "ينتهك خصوصية الآخرين، بما في ذلك نشر معلومات شخصية دون موافقة" : "Violates the privacy of others, including publishing personal information without consent"}</li>
                    <li>{ar ? "ينتحل شخصية أي شخص أو كيان، أو يصرّح زوراً بانتمائك إلى شخص أو كيان أو يحرّفه" : "Impersonates any person or entity, or falsely states or misrepresents your affiliation with a person or entity"}</li>
                    <li>{ar ? "يحتوي برمجيات خبيثة أو فيروسات أو أي شيفرة ضارّة" : "Contains malware, viruses, or any malicious code"}</li>
                  </ul>
                  <P>{ar ? "كما توافق على ألّا:" : "You also agree not to:"}</P>
                  <ul>
                    <li>{ar ? "تحاول الهندسة العكسية للخدمة أو فكّ ترجمتها أو استخراج شيفرتها المصدرية" : "Attempt to reverse-engineer, decompile, or extract the source code of the Service"}</li>
                    <li>{ar ? "تستخدم روبوتات أو كاشطات أو زواحف آلية للوصول إلى الخدمة دون تصريح كتابي" : "Use automated bots, scrapers, or crawlers to access the Service without written authorization"}</li>
                    <li>{ar ? "تتحايل على أي ضوابط وصول أو حدود معدّل أو ميزات أمان" : "Circumvent any access controls, rate limits, or security features"}</li>
                    <li>{ar ? "تعيد بيع الخدمة أو ترخّصها من الباطن أو تستغلّها تجارياً دون موافقتنا الكتابية" : "Resell, sublicense, or commercially exploit the Service without our written consent"}</li>
                    <li>{ar ? "تتدخّل في نزاهة الخدمة أو بنيتها التحتية أو أدائها أو تعطّلها" : "Interfere with or disrupt the integrity or performance of the Service or its infrastructure"}</li>
                    <li>{ar ? "تستخدم الخدمة بأي شكل ينتهك أي قانون أو لائحة محلية أو وطنية أو دولية معمول بها" : "Use the Service in any way that violates applicable local, national, or international law or regulation"}</li>
                  </ul>
                  <P>
                    {ar
                      ? "قد يؤدّي انتهاك هذه المحظورات إلى تعليق الحساب أو إنهائه فوراً، وإزالة المحتوى، وقد يعرّضك لمسؤولية مدنية أو جنائية."
                      : "Violation of these prohibitions may result in immediate account suspension or termination, removal of content, and may expose you to civil or criminal liability."}
                  </P>
                </S>

                <S id="subscriptions" title={ar ? "6. الاشتراكات والمدفوعات" : "6. Subscriptions & Payments"}>
                  <H2>{ar ? "الخطط" : "Plans"}</H2>
                  <P>
                    {ar
                      ? "تقدّم بلوتزي فئة مجانية وخطط اشتراك مدفوعة (Plotzy Pro)، تُفوتَر شهرياً أو سنوياً. والميزات المشمولة في كل خطة موصوفة في صفحة الأسعار لدينا وقد تُحدَّث من وقت لآخر."
                      : "Plotzy offers a free tier and paid subscription plans (Plotzy Pro), billed monthly or annually. The features included in each plan are described on our Pricing page and may be updated from time to time."}
                  </P>
                  <H2>{ar ? "الفوترة" : "Billing"}</H2>
                  <P>
                    {ar
                      ? "تُفوتَر الاشتراكات المدفوعة مقدّماً في بداية كل دورة فوترة. وتُعالَج كل المدفوعات بأمان عبر PayPal. وباشتراكك، فإنك تفوّضنا بخصم المبلغ من طريقة الدفع المحدّدة بشكل متكرّر حتى تلغي."
                      : "Paid subscriptions are billed in advance at the beginning of each billing cycle. All payments are processed securely through PayPal. By subscribing, you authorize us to charge your designated payment method on a recurring basis until you cancel."}
                  </P>
                  <H2>{ar ? "التجربة المجانية" : "Free Trial"}</H2>
                  <P>
                    {ar
                      ? "قد يكون المستخدمون الجدد مؤهّلين لفترة تجربة مجانية. وما لم تلغِ قبل انتهاء التجربة، سيتحوّل اشتراكك تلقائياً إلى خطة مدفوعة وسيُخصَم من طريقة دفعك."
                      : "New users may be eligible for a free trial period. Unless you cancel before the trial ends, your subscription will automatically convert to a paid plan and your payment method will be charged."}
                  </P>
                  <H2>{ar ? "الإلغاء" : "Cancellation"}</H2>
                  <P>
                    {ar
                      ? "يمكنك إلغاء اشتراكك في أي وقت من إعدادات حسابك. ويسري الإلغاء في نهاية فترة الفوترة الحالية. وستظلّ لديك إمكانية الوصول إلى ميزات Pro حتى نهاية الفترة التي دفعت عنها."
                      : "You may cancel your subscription at any time through your account settings. Cancellation takes effect at the end of the current billing period. You will continue to have access to Pro features until the end of the period you have paid for."}
                  </P>
                  <H2>{ar ? "الاسترداد" : "Refunds"}</H2>
                  <P>
                    {ar
                      ? <>كل مدفوعات الاشتراك غير قابلة للاسترداد، إلا حيث يقتضي القانون المعمول به. وإذا كنت تعتقد أن خصماً تمّ بالخطأ، يرجى التواصل معنا على <a href="mailto:billing@plotzy.co">billing@plotzy.co</a> خلال 7 أيام من الخصم.</>
                      : <>All subscription payments are non-refundable, except where required by applicable law. If you believe a charge was made in error, please contact us at <a href="mailto:billing@plotzy.co">billing@plotzy.co</a> within 7 days of the charge.</>}
                  </P>
                  <H2>{ar ? "تغييرات الأسعار" : "Price Changes"}</H2>
                  <P>
                    {ar
                      ? "نحتفظ بالحق في تغيير أسعار الاشتراك. وسنقدّم إشعاراً كتابياً قبل 30 يوماً على الأقل للمشتركين النشطين قبل سريان أي زيادة في السعر. واستمرارك في استخدام الخدمة بعد تغيير السعر يشكّل قبولاً للتسعير الجديد."
                      : "We reserve the right to change subscription prices. We will provide at least 30 days' written notice to active subscribers before any price increase takes effect. Your continued use of the Service after the price change constitutes acceptance of the new pricing."}
                  </P>
                  <H2>{ar ? "معاملات المتجر" : "Marketplace Transactions"}</H2>
                  <P>
                    {ar
                      ? "يوافق المؤلّفون الذين يبيعون كتباً عبر متجر بلوتزي على شروط المتجر لدينا. وقد تحتفظ بلوتزي بنسبة من كل عملية بيع كرسم منصّة، حسبما يُفصَح عند الإدراج. والمدفوعات خاضعة لجداول معالجة الدفع لدينا والحدود الدنيا."
                      : "Authors who sell books through the Plotzy Marketplace agree to our Marketplace Terms. Plotzy may retain a percentage of each sale as a platform fee, as disclosed at the time of listing. Payouts are subject to our payment processing timelines and minimum thresholds."}
                  </P>
                </S>

                <S id="ai-features" title={ar ? "7. ميزات الكتابة بالذكاء الاصطناعي" : "7. AI Writing Features"}>
                  <P>
                    {ar
                      ? "تدمج بلوتزي أدوات ذكاء اصطناعي (بما في ذلك ميزات مدعومة بمزوّدين من أطراف ثالثة مثل OpenAI) لمساعدتك في كتابتك. وهذه الأدوات مصمّمة لدعم إبداعك وتعزيزه، لا لاستبداله."
                      : "Plotzy incorporates artificial intelligence tools (including features powered by third-party providers such as OpenAI) to assist with your writing. These tools are designed to support and enhance your creativity, not replace it."}
                  </P>
                  <H2>{ar ? "مسؤوليتك" : "Your Responsibility"}</H2>
                  <P>
                    {ar
                      ? "أنت وحدك مسؤول عن مراجعة كل المحتوى المولَّد بالذكاء الاصطناعي وتحريره وتبنّيه قبل النشر. وقد يكون الناتج المولَّد بالذكاء الاصطناعي غير دقيق أو ناقصاً أو متحيّزاً أو غير مناسب لأغراضك. ولا نضمن دقّة المحتوى المولَّد بالذكاء الاصطناعي ولا ملاءمته لأي استخدام معيّن."
                      : "You are solely responsible for reviewing, editing, and taking ownership of all AI-generated content before publishing. AI-generated output may be inaccurate, incomplete, biased, or unsuitable for your purposes. We do not warrant the accuracy or fitness of AI-generated content for any particular use."}
                  </P>
                  <H2>{ar ? "لا تدريب للذكاء الاصطناعي على محتواك الخاص" : "No AI Training on Your Private Content"}</H2>
                  <P>
                    {ar
                      ? "لا نستخدم كتبك أو فصولك الخاصة غير المنشورة لتدريب نماذج الذكاء الاصطناعي. تعالج ميزات الذكاء الاصطناعي محتواك في الوقت الفعلي لتقديم المساعدة ولا تحتفظ بكتابتك بعد الجلسة المباشرة."
                      : "We do not use your private, unpublished books or chapters to train AI models. AI features process your content in real time to provide assistance and do not retain your writing beyond the immediate session."}
                  </P>
                  <H2>{ar ? "مزوّدو الذكاء الاصطناعي من أطراف ثالثة" : "Third-Party AI Providers"}</H2>
                  <P>
                    {ar
                      ? "عند استخدام ميزات الذكاء الاصطناعي، قد تُنقَل موجّهاتك والسياق ذو الصلة إلى مزوّدي ذكاء اصطناعي من أطراف ثالثة بموجب سياسات الخصوصية الخاصة بكلٍّ منهم. وباستخدامك ميزات الذكاء الاصطناعي، فإنك توافق على هذه المعالجة."
                      : "When AI features are used, your prompts and relevant context may be transmitted to third-party AI providers under their respective privacy policies. By using AI features, you consent to this processing."}
                  </P>
                </S>

                <S id="library" title={ar ? "8. مكتبة الملك العام" : "8. Public Domain Library"}>
                  <P>
                    {ar
                      ? "توفّر بلوتزي وصولاً إلى مجموعة منتقاة من الأعمال الأدبية في الملك العام مصدرها مشروع جوتنبرج ومستودعات الملك العام الأخرى. هذه الأعمال مجانية القراءة وليست ملكاً لبلوتزي."
                      : "Plotzy provides access to a curated collection of public-domain literary works sourced from Project Gutenberg and other public-domain repositories. These works are free to read and are not owned by Plotzy."}
                  </P>
                  <P>
                    {ar
                      ? "قد يتغيّر توفّر عناوين معيّنة دون إشعار. ولا تقدّم بلوتزي أي ضمانات بشأن اكتمال هذه الأعمال أو دقّتها أو تنسيقها. وقراءة كتب الملك العام عبر بلوتزي مقدّمة كميزة لتسهيل الاستخدام."
                      : "The availability of specific titles may change without notice. Plotzy makes no warranties regarding the completeness, accuracy, or formatting of these works. Reading public-domain books through Plotzy is provided as a convenience feature."}
                  </P>
                  <P>
                    {ar
                      ? "الكتب التي يُوصَل إليها عبر هذه المكتبة للقراءة الشخصية فقط. ولا يجوز لك إعادة توزيع المحتوى الذي تصل إليه عبر المكتبة أو بيعه أو استغلاله تجارياً."
                      : "Books accessed through this library are for personal reading only. You may not redistribute, sell, or commercially exploit the content accessed through the library."}
                  </P>
                </S>

                <S id="marketplace" title={ar ? "9. المتجر والمجتمع" : "9. Marketplace & Community"}>
                  <H2>{ar ? "مكتبة المجتمع" : "Community Library"}</H2>
                  <P>
                    {ar
                      ? "تتيح مكتبة المجتمع للمستخدمين نشر أعمالهم الأصلية ومشاركتها مع مجتمع بلوتزي. وبنشرك عملاً علناً، فإنك تقرّ بأنك تملك كل الحقوق اللازمة لذلك العمل وأنه يمتثل لهذه الشروط."
                      : "The Community Library allows users to publish and share their original works with the Plotzy community. By publishing a work publicly, you represent that you hold all necessary rights to that work and that it complies with these Terms."}
                  </P>
                  <H2>{ar ? "الإشراف على المحتوى" : "Content Moderation"}</H2>
                  <P>
                    {ar
                      ? <>نحتفظ بالحق في إزالة أي محتوى من مكتبة المجتمع أو المتجر ينتهك هذه الشروط، دون إشعار أو مسؤولية. وإذا كنت تعتقد أن محتوى نشره مستخدم آخر ينتهك حقوقك أو هذه الشروط، يرجى الإبلاغ عنه إلى <a href="mailto:support@plotzy.co">support@plotzy.co</a>.</>
                      : <>We reserve the right to remove any content from the Community Library or Marketplace that violates these Terms, without notice or liability. If you believe content posted by another user violates your rights or these Terms, please report it to <a href="mailto:support@plotzy.co">support@plotzy.co</a>.</>}
                  </P>
                  <H2>{ar ? "تفاعلات المستخدمين" : "User Interactions"}</H2>
                  <P>
                    {ar
                      ? "بلوتزي ليست مسؤولة عن محتوى مستخدميها أو آرائهم أو أفعالهم. وأي نزاعات بين المستخدمين هي مسؤولية الأطراف المعنية وحدها. ونشجّع على تفاعل محترم وبنّاء داخل المجتمع."
                      : "Plotzy is not responsible for the content, opinions, or actions of its users. Any disputes between users are the sole responsibility of the parties involved. We encourage respectful, constructive engagement within the community."}
                  </P>
                </S>

                <S id="plotzy-ip" title={ar ? "10. الملكية الفكرية لبلوتزي" : "10. Plotzy Intellectual Property"}>
                  <P>
                    {ar
                      ? "منصة بلوتزي، بما في ذلك اسمها وشعارها وهويتها وتصميم واجهة المستخدم والشيفرة المصدرية وقواعد البيانات والبرمجيات والعلامات التجارية وكل المحتوى الذي تنشئه بلوتزي، هي ملك حصري لبلوتزي ومرخّصيها، وهي محميّة بقوانين حقوق النشر والعلامات التجارية وغيرها من قوانين الملكية الفكرية."
                      : "The Plotzy platform, including its name, logo, branding, user interface design, source code, databases, software, trademarks, and all content created by Plotzy, is the exclusive property of Plotzy and its licensors, and is protected by copyright, trademark, and other intellectual property laws."}
                  </P>
                  <P>
                    {ar
                      ? "لا تمنحك هذه الشروط أي حق أو ملكية أو مصلحة في منصة بلوتزي أو ملكيتها الفكرية. ولا يجوز لك نسخ المنصة أو أي من مكوّناتها أو تعديلها أو توزيعها أو بيعها أو ترخيصها من الباطن أو إجراء هندسة عكسية لها أو إنشاء أعمال مشتقّة منها دون موافقتنا الكتابية الصريحة."
                      : "These Terms do not grant you any right, title, or interest in or to the Plotzy platform or its intellectual property. You may not copy, modify, distribute, sell, sublicense, reverse-engineer, or create derivative works of the platform or any of its components without our express written consent."}
                  </P>
                </S>

                <S id="dmca" title={ar ? "11. حقوق النشر وقانون DMCA" : "11. Copyright & DMCA"}>
                  <P>
                    {ar
                      ? "نحترم حقوق الملكية الفكرية للآخرين ونتوقّع من مستخدمينا الشيء نفسه. ونمتثل لقانون الألفية للملكية الرقمية (DMCA) والقوانين المماثلة."
                      : "We respect the intellectual property rights of others and expect our users to do the same. We comply with the Digital Millennium Copyright Act (DMCA) and similar laws."}
                  </P>
                  <H2>{ar ? "الإبلاغ عن الانتهاك" : "Reporting Infringement"}</H2>
                  <P>
                    {ar
                      ? <>إذا كنت تعتقد أن محتوى على بلوتزي ينتهك حقوق نشرك، يرجى إرسال إشعار كتابي («إشعار إزالة DMCA») إلى وكيلنا المعيَّن على <a href="mailto:legal@plotzy.co">legal@plotzy.co</a> يتضمّن:</>
                      : <>If you believe that content on Plotzy infringes your copyright, please send a written notice ("DMCA Takedown Notice") to our designated agent at <a href="mailto:legal@plotzy.co">legal@plotzy.co</a> containing:</>}
                  </P>
                  <ul>
                    <li>{ar ? "اسمك وعنوانك ومعلومات الاتصال بك" : "Your name, address, and contact information"}</li>
                    <li>{ar ? "وصف للعمل المحمي بحقوق نشر الذي تعتقد أنه انتُهك" : "A description of the copyrighted work you believe has been infringed"}</li>
                    <li>{ar ? "عنوان URL أو موقع المحتوى المخالف المزعوم على منصتنا" : "The URL or location of the allegedly infringing content on our platform"}</li>
                    <li>{ar ? "بيان بأن لديك اعتقاداً بحسن نيّة أن الاستخدام غير مصرّح به" : "A statement that you have a good faith belief that the use is not authorized"}</li>
                    <li>{ar ? "بيان بأن المعلومات في الإشعار دقيقة، تحت طائلة عقوبة شهادة الزور" : "A statement that the information in the notice is accurate, under penalty of perjury"}</li>
                    <li>{ar ? "توقيعك المادي أو الإلكتروني" : "Your physical or electronic signature"}</li>
                  </ul>
                  <P>
                    {ar
                      ? "سنردّ على إشعارات DMCA الصحيحة في أقرب وقت ممكن، عادةً خلال 72 ساعة. ونحتفظ بالحق في إنهاء حسابات المنتهِكين المتكرّرين."
                      : "We will respond to valid DMCA notices as soon as possible, typically within 72 hours. We reserve the right to terminate the accounts of repeat infringers."}
                  </P>
                </S>

                <S id="disclaimer" title={ar ? "12. إخلاء المسؤولية" : "12. Disclaimers"}>
                  <P>
                    {ar
                      ? "تُقدَّم الخدمة على أساس «كما هي» و«كما هي متاحة»، دون ضمانات من أي نوع، صريحة أو ضمنية، بما في ذلك على سبيل المثال لا الحصر الضمانات الضمنية للرواج التجاري والملاءمة لغرض معيّن والملكية وعدم الانتهاك."
                      : 'THE SERVICE IS PROVIDED ON AN "AS IS" AND "AS AVAILABLE" BASIS, WITHOUT WARRANTIES OF ANY KIND, EITHER EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO IMPLIED WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, TITLE, AND NON-INFRINGEMENT.'}
                  </P>
                  <P>
                    {ar
                      ? "لا نضمن أن الخدمة ستكون دون انقطاع أو في الوقت المناسب أو آمنة أو خالية من الأخطاء، أو أن العيوب ستُصحَّح. ولا نضمن دقّة أو موثوقية أي محتوى يُحصَّل عبر الخدمة."
                      : "We do not warrant that the Service will be uninterrupted, timely, secure, error-free, or that defects will be corrected. We do not warrant the accuracy or reliability of any content obtained through the Service."}
                  </P>
                  <P>
                    {ar
                      ? "بعض الولايات القضائية لا تسمح باستبعاد الضمانات الضمنية، لذا قد لا تنطبق عليك بعض الاستبعادات أعلاه."
                      : "Some jurisdictions do not allow the exclusion of implied warranties, so some of the above exclusions may not apply to you."}
                  </P>
                </S>

                <S id="liability" title={ar ? "13. حدود المسؤولية" : "13. Limitation of Liability"}>
                  <P>
                    {ar
                      ? "إلى أقصى حدّ يسمح به القانون المعمول به، لن تكون بلوتزي ولا مديروها ولا موظّفوها ولا وكلاؤها ولا شركاؤها ولا موردوها ولا مرخّصوها في أي حال مسؤولين عن أي أضرار غير مباشرة أو عرضية أو خاصة أو تبعية أو عقابية أو رادعة، بما في ذلك على سبيل المثال لا الحصر خسارة الأرباح أو البيانات أو السمعة التجارية أو غيرها من الخسائر غير الملموسة، الناشئة عن استخدامك للخدمة أو عدم قدرتك على استخدامها أو المتعلّقة بذلك."
                      : "TO THE MAXIMUM EXTENT PERMITTED BY APPLICABLE LAW, IN NO EVENT SHALL PLOTZY, ITS DIRECTORS, EMPLOYEES, AGENTS, PARTNERS, SUPPLIERS, OR LICENSORS BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, PUNITIVE, OR EXEMPLARY DAMAGES, INCLUDING BUT NOT LIMITED TO LOSS OF PROFITS, DATA, GOODWILL, OR OTHER INTANGIBLE LOSSES, ARISING OUT OF OR IN CONNECTION WITH YOUR USE OF OR INABILITY TO USE THE SERVICE."}
                  </P>
                  <P>
                    {ar
                      ? "لن تتجاوز مسؤولية بلوتزي الإجمالية الكلّية تجاهك عن كل المطالبات الناشئة عن الخدمة أو المتعلّقة بها، في أي حال، أكبر مبلغ من: (أ) إجمالي المبلغ الذي دفعته لبلوتزي في الاثني عشر (12) شهراً السابقة للمطالبة، أو (ب) مئة دولار أمريكي (100 دولار)."
                      : "IN NO EVENT SHALL PLOTZY'S TOTAL AGGREGATE LIABILITY TO YOU FOR ALL CLAIMS ARISING OUT OF OR RELATED TO THE SERVICE EXCEED THE GREATER OF: (A) THE TOTAL AMOUNT YOU PAID TO PLOTZY IN THE TWELVE (12) MONTHS PRECEDING THE CLAIM, OR (B) ONE HUNDRED U.S. DOLLARS ($100)."}
                  </P>
                  <P>
                    {ar
                      ? "بعض الولايات القضائية لا تسمح بتحديد المسؤولية عن الأضرار العرضية أو التبعية، لذا قد لا ينطبق عليك التحديد أعلاه."
                      : "Some jurisdictions do not allow the limitation of liability for incidental or consequential damages, so the above limitation may not apply to you."}
                  </P>
                </S>

                <S id="indemnification" title={ar ? "14. التعويض" : "14. Indemnification"}>
                  <P>
                    {ar
                      ? "توافق على الدفاع عن بلوتزي ومسؤوليها ومديريها وموظّفيها ووكلائها ومرخّصيها وتعويضهم وحمايتهم من وضدّ أي وكل المطالبات والأضرار والخسائر والمسؤوليات والتكاليف والنفقات (بما في ذلك أتعاب المحاماة المعقولة) الناشئة عن أو المتعلّقة بـ:"
                      : "You agree to defend, indemnify, and hold harmless Plotzy and its officers, directors, employees, agents, and licensors from and against any and all claims, damages, losses, liabilities, costs, and expenses (including reasonable attorneys' fees) arising from or related to:"}
                  </P>
                  <ul>
                    <li>{ar ? "استخدامك للخدمة" : "Your use of the Service"}</li>
                    <li>{ar ? "انتهاكك لهذه الشروط" : "Your violation of these Terms"}</li>
                    <li>{ar ? "انتهاكك لأي قانون معمول به أو لحقوق أي طرف ثالث" : "Your violation of any applicable law or the rights of any third party"}</li>
                    <li>{ar ? "أي محتوى تقدّمه أو تنشره أو تنقله عبر الخدمة" : "Any content you submit, post, or transmit through the Service"}</li>
                  </ul>
                </S>

                <S id="termination" title={ar ? "15. الإنهاء" : "15. Termination"}>
                  <H2>{ar ? "من جانبك" : "By You"}</H2>
                  <P>
                    {ar
                      ? "يمكنك التوقّف عن استخدام الخدمة وإغلاق حسابك في أي وقت بزيارة إعدادات حسابك. وعند حذف الحساب، سيُزال محتواك من المنصة خلال 30 يوماً، مع مراعاة التزاماتنا بالاحتفاظ بالبيانات."
                      : "You may stop using the Service and close your account at any time by visiting your account settings. Upon account deletion, your content will be removed from the platform within 30 days, subject to our data retention obligations."}
                  </P>
                  <H2>{ar ? "من جانبنا" : "By Us"}</H2>
                  <P>
                    {ar
                      ? "نحتفظ بالحق في تعليق حسابك أو إنهائه وإنهاء وصولك إلى الخدمة في أي وقت، بإشعار أو دونه، لأي سبب، بما في ذلك على سبيل المثال لا الحصر: انتهاك هذه الشروط، أو نشاط احتيالي، أو خمول مطوّل، أو إذا اقتضى القانون ذلك."
                      : "We reserve the right to suspend or terminate your account and access to the Service at any time, with or without notice, for any reason, including but not limited to: violation of these Terms, fraudulent activity, extended inactivity, or if required by law."}
                  </P>
                  <P>
                    {ar
                      ? "عند الإنهاء، يتوقّف حقك في استخدام الخدمة فوراً. وتظلّ كل أحكام هذه الشروط التي ينبغي بطبيعتها أن تبقى بعد الإنهاء سارية، بما في ذلك أحكام الملكية، وإخلاء المسؤولية عن الضمانات، والتعويض، وحدود المسؤولية."
                      : "Upon termination, your right to use the Service ceases immediately. All provisions of these Terms that by their nature should survive termination shall survive, including ownership provisions, warranty disclaimers, indemnity, and limitations of liability."}
                  </P>
                </S>

                <S id="governing-law" title={ar ? "16. القانون الحاكم والنزاعات" : "16. Governing Law & Disputes"}>
                  <P>
                    {ar
                      ? "تخضع هذه الشروط لقوانين ولاية ديلاوير بالولايات المتحدة وتُفسَّر وفقاً لها، دون اعتبار لمبادئ تنازع القوانين فيها."
                      : "These Terms are governed by and construed in accordance with the laws of the State of Delaware, United States, without regard to its conflict of law principles."}
                  </P>
                  <H2>{ar ? "التسوية غير الرسمية" : "Informal Resolution"}</H2>
                  <P>
                    {ar
                      ? <>قبل رفع أي مطالبة قانونية رسمية، توافق على محاولة حلّ النزاع ودّياً بالتواصل معنا على <a href="mailto:legal@plotzy.co">legal@plotzy.co</a>. وسنحاول حلّ النزاع ودّياً خلال 30 يوماً.</>
                      : <>Before filing any formal legal claim, you agree to attempt to resolve the dispute informally by contacting us at <a href="mailto:legal@plotzy.co">legal@plotzy.co</a>. We will try to resolve the dispute informally within 30 days.</>}
                  </P>
                  <H2>{ar ? "التحكيم المُلزِم" : "Binding Arbitration"}</H2>
                  <P>
                    {ar
                      ? "إذا فشلت التسوية غير الرسمية، فإن أي نزاع ناشئ عن هذه الشروط أو الخدمة أو متعلّق بهما يُحلّ نهائياً بتحكيم مُلزِم وفق قواعد جمعية التحكيم الأمريكية (AAA). ويُجرى التحكيم بالإنجليزية على أساس سرّي. وأنت تتنازل عن حقك في محاكمة أمام هيئة محلّفين وفي المشاركة في دعاوى جماعية."
                      : "If informal resolution fails, any dispute arising from or relating to these Terms or the Service shall be finally resolved by binding arbitration under the rules of the American Arbitration Association (AAA). The arbitration will be conducted in English on a confidential basis. You waive your right to a jury trial and to participate in class-action lawsuits."}
                  </P>
                  <H2>{ar ? "الاستثناء" : "Exception"}</H2>
                  <P>
                    {ar
                      ? "يجوز لأي طرف طلب إنصاف زجري طارئ من محكمة مختصّة لمنع ضرر لا يمكن إصلاحه ريثما يتمّ التحكيم."
                      : "Either party may seek emergency injunctive relief in a court of competent jurisdiction to prevent irreparable harm pending arbitration."}
                  </P>
                </S>

                <S id="changes" title={ar ? "17. التغييرات على الشروط" : "17. Changes to Terms"}>
                  <P>
                    {ar ? "نحتفظ بالحق في تعديل هذه الشروط في أي وقت. وسنقدّم إشعاراً بالتغييرات الجوهرية عبر:" : "We reserve the right to modify these Terms at any time. We will provide notice of material changes by:"}
                  </P>
                  <ul>
                    <li>{ar ? "نشر الشروط المحدَّثة في هذه الصفحة بتاريخ «سريان» جديد" : 'Posting the updated Terms on this page with a new "Effective" date'}</li>
                    <li>{ar ? "إرسال إشعار بالبريد الإلكتروني إلى عنوانك المسجّل (للتغييرات المهمة)" : "Sending an email notification to your registered email address (for significant changes)"}</li>
                    <li>{ar ? "عرض إشعار داخل التطبيق عند تسجيل دخولك التالي" : "Displaying an in-app notification upon your next login"}</li>
                  </ul>
                  <P>
                    {ar
                      ? "استمرارك في استخدام الخدمة بعد تاريخ سريان أي تغييرات يشكّل قبولاً منك للشروط المحدَّثة. وإذا لم توافق على الشروط المحدَّثة، فيجب أن تتوقّف عن استخدام الخدمة."
                      : "Your continued use of the Service after the effective date of any changes constitutes your acceptance of the updated Terms. If you do not agree to the updated Terms, you must stop using the Service."}
                  </P>
                </S>

                <S id="contact" title={ar ? "18. تواصل" : "18. Contact"}>
                  <P>{ar ? "إذا كانت لديك أي أسئلة أو مخاوف أو طلبات بخصوص هذه الشروط، يرجى التواصل معنا:" : "If you have any questions, concerns, or requests regarding these Terms, please reach out to us:"}</P>
                  <div style={{ borderRadius: 12, padding: "24px", marginTop: 8, background: "var(--muted)", display: "flex", flexDirection: "column", gap: 8 }}>
                    <p style={{ margin: 0, fontWeight: 700, fontSize: 16 }}>Plotzy</p>
                    <Row label={ar ? "استفسارات عامة" : "General inquiries"} value="support@plotzy.co" href="mailto:support@plotzy.co" />
                    <Row label={ar ? "القانوني وDMCA" : "Legal & DMCA"} value="legal@plotzy.co" href="mailto:legal@plotzy.co" />
                    <Row label={ar ? "الفوترة والمدفوعات" : "Billing & payments"} value="billing@plotzy.co" href="mailto:billing@plotzy.co" />
                    <Row label={ar ? "طلبات الخصوصية" : "Privacy requests"} value="privacy@plotzy.co" href="mailto:privacy@plotzy.co" />
                  </div>
                  <P style={{ fontSize: 13, marginTop: 24 }}>
                    {ar
                      ? <>انظر أيضاً: <Link href="/privacy" style={{ color: "var(--muted-foreground)", textDecoration: "underline" }}>سياسة الخصوصية</Link></>
                      : <>Also see: <Link href="/privacy" style={{ color: "var(--muted-foreground)", textDecoration: "underline" }}>Privacy Policy</Link></>}
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
