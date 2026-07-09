// Plotzy Terms of Service. Matches the layout language of the Privacy
// Policy page: dark theme via CSS variables, a sticky table-of-contents
// rail on desktop, sectioned content in the main column, and the
// minimal header / footer chrome. Eleven sections covering the
// free-for-everyone model. No em-dashes, no emojis.

import { useEffect, useMemo, useState } from "react";
import { Link } from "wouter";
import { ArrowLeft, ChevronRight } from "lucide-react";
import { SEO } from "@/components/SEO";
import { JsonLd } from "@/components/JsonLd";
import { buildBreadcrumbSchema } from "@/lib/seo-schema";
import { useLanguage } from "@/contexts/language-context";

const LAST_UPDATED_ISO = "2026-05-22";

interface SectionDef {
  id: string;
  label: string;
  labelAr: string;
  title: string;
  titleAr: string;
  body: string;
  bodyAr: string;
}

const SECTIONS: SectionDef[] = [
  {
    id: "what",
    label: "What Plotzy is",
    labelAr: "ما هو بلوتزي",
    title: "1. What Plotzy is",
    titleAr: "1. ما هو بلوتزي",
    body:
      "Plotzy is a writing platform that provides an editor, an AI writing assistant, an export service, a public-domain library, a writing course, and an audiobook narration feature. Every feature is available at no cost.",
    bodyAr:
      "بلوتزي منصّه كتابه تقدّم محرّراً للنص, ومساعداً ذكياً للكتابه, وأداه تصدير, ومكتبه ضمن الملك العام, ودوره كتابه, وميزه تحويل الفصول إلى صوت. كل هذه الميزات متاحه بدون أي مقابل.",
  },
  {
    id: "account",
    label: "Your account",
    labelAr: "حسابك",
    title: "2. Your account",
    titleAr: "2. حسابك",
    body:
      "You may create an account using email or a supported sign-in provider such as Google. You are responsible for keeping your sign-in details safe. You may delete your account at any time from your settings, in which case your manuscripts and personal data are removed from active databases within thirty days.",
    bodyAr:
      "يمكنك إنشاء حساب عبر البريد الإلكتروني أو عبر مزوّد دخول مدعوم مثل Google. أنت المسؤول عن الحفاظ على بيانات الدخول. يمكنك حذف حسابك في أي وقت من الإعدادات, وعندها نحذف مخطوطاتك وبياناتك الشخصيه من قواعد البيانات النشطه خلال ثلاثين يوماً.",
  },
  {
    id: "ownership",
    label: "What you write belongs to you",
    labelAr: "ملكيه ما تكتب",
    title: "3. What you write belongs to you",
    titleAr: "3. ما تكتبه ملكك",
    body:
      "You retain full ownership of every word you write inside Plotzy. We do not claim any rights to your manuscripts, your covers, or your published works. Drafts are stored on our servers only so we can serve them back to you across devices. If you delete a draft, it is removed from active databases within thirty days.",
    bodyAr:
      "تحتفظ بحقوق كل كلمه تكتبها داخل بلوتزي. لا نطالب بأي حق على مخطوطاتك أو أغلفتك أو أعمالك المنشوره. نخزّن المسوّدات على سيرفرنا فقط لنعيدها لك عبر أجهزتك. إذا حذفت مسوّده فإنّها تُمحى من قواعد البيانات النشطه خلال ثلاثين يوماً.",
  },
  {
    id: "prohibited",
    label: "What you must not do",
    labelAr: "ما لا يجوز فعله",
    title: "4. What you must not do",
    titleAr: "4. ما لا يجوز فعله",
    body:
      "You agree not to use Plotzy to publish content that is illegal, harasses or endangers another person, infringes someone else's copyright, attempts to break the platform, or abuses the AI features to generate large amounts of unrelated content. We may remove content or suspend accounts that violate this section.",
    bodyAr:
      "توافق على ألا تستخدم بلوتزي لنشر محتوى مخالف للقانون, أو يضايق أو يعرّض أحداً للخطر, أو ينتهك حقوق ملكيه فكريه لطرف آخر, أو يحاول إيذاء المنصّه, أو يسيء استخدام ميزات الذكاء الاصطناعي لإنتاج كميات هائله من المحتوى غير ذي الصله. قد نزيل أي محتوى أو نوقف أي حساب يخالف هذا البند.",
  },
  {
    id: "ai",
    label: "The AI services we use",
    labelAr: "خدمات الذكاء الاصطناعي",
    title: "5. The AI services we use",
    titleAr: "5. خدمات الذكاء الاصطناعي التي نستخدمها",
    body:
      "Plotzy uses paid third-party AI services to power the writing assistant, audiobook narration, and cover generator. We pay those bills from our own pocket and from voluntary supporters. If a service hits a daily limit, or if the cost grows beyond what we can cover, the AI features may pause temporarily. The editor, exports, library, and course do not depend on those services and continue to work.",
    bodyAr:
      "يستخدم بلوتزي خدمات ذكاء اصطناعي مدفوعه من طرف ثالث لتشغيل المساعد وتحويل الصوت ومولّد الغلاف. نتحمّل تكلفه تلك الخدمات من جيبنا ومن دعم المتبرّعين. إذا بلغت إحدى الخدمات حصّتها اليوميه, أو لو تخطّت التكلفه ما نقدر على تحمّله, فقد تتوقّف ميزات الذكاء الاصطناعي مؤقّتاً. أمّا المحرّر والتصدير والمكتبه والدوره فلا تعتمد على هذه الخدمات وتستمر بالعمل.",
  },
  {
    id: "donations",
    label: "Donations",
    labelAr: "التبرّعات",
    title: "6. Donations",
    titleAr: "6. التبرّعات",
    body:
      "Plotzy is free. The donation flow on the pricing page is voluntary and one-time. Donations do not buy any feature, badge, or tier; they go to keeping the servers on and paying the AI bill. Donations are non-refundable except where required by law. If you donated by mistake or believe you were charged in error, write to support and we will refund it.",
    bodyAr:
      "بلوتزي مجّاني. التبرّع من صفحه الأسعار طوعي ويتمّ لمرّه واحده. لا يشتري التبرّع أي ميزه أو شاره أو فئه, وإنّما يذهب لتغطيه تكلفه السيرفر وفاتوره الذكاء الاصطناعي. التبرّعات غير قابله للاسترداد إلا في الحالات التي يفرض فيها القانون ذلك. لو تبرّعت عن طريق الخطأ أو ظننت أنّك خُصمت بشكل غير سليم, راسلنا وسنردّ المبلغ.",
  },
  {
    id: "library",
    label: "Public library and community",
    labelAr: "المكتبه المجتمعيه",
    title: "7. Public library and community",
    titleAr: "7. المكتبه العامّه والمجتمع",
    body:
      "If you choose to publish a manuscript to the community library, you grant other Plotzy readers the right to read and rate it inside Plotzy. You can unpublish at any time. We may remove published content that violates the section on what you must not do.",
    bodyAr:
      "إذا اخترت نشر مخطوطه في المكتبه المجتمعيه فأنت تمنح بقيّه قرّاء بلوتزي الحق في قراءتها وتقييمها داخل بلوتزي. يمكنك إلغاء النشر في أي وقت. قد نزيل أي محتوى منشور يخالف بند ما لا يجوز فعله.",
  },
  {
    id: "availability",
    label: "Service availability",
    labelAr: "توفّر الخدمه",
    title: "8. Service availability",
    titleAr: "8. توفّر الخدمه",
    body:
      "We try to keep Plotzy available at all times, but we cannot promise it. The site may be unavailable during maintenance, upgrades, or events outside our control. Because Plotzy is provided free of charge, the service is offered on an as-is basis without warranties.",
    bodyAr:
      "نحرص على إبقاء بلوتزي متاحاً دائماً, لكنّنا لا نستطيع أن نضمن ذلك. قد يكون الموقع غير متاح خلال أعمال الصيانه أو التحديث أو لأسباب خارجه عن إرادتنا. ولأنّ الخدمه تُقدَّم مجّاناً, فهي مقدَّمه كما هي دون أي ضمانات.",
  },
  {
    id: "liability",
    label: "Limit of liability",
    labelAr: "حدود المسؤوليه",
    title: "9. Limit of liability",
    titleAr: "9. حدود المسؤوليه",
    body:
      "To the extent permitted by law, Plotzy is not liable for indirect, incidental, or consequential damages arising from your use of the site, including loss of data or lost profits. Always keep your own copy of important manuscripts.",
    bodyAr:
      "إلى الحدّ الذي يسمح به القانون, لا يكون بلوتزي مسؤولاً عن أي أضرار غير مباشره أو عرضيه أو تبعيه تنجم عن استخدام الموقع, بما في ذلك فقدان البيانات أو الأرباح الضائعه. احفظ دائماً نسختك الخاصّه من مخطوطاتك المهمّه.",
  },
  {
    id: "changes",
    label: "Changes to these terms",
    labelAr: "تعديلات الشروط",
    title: "10. Changes to these terms",
    titleAr: "10. تعديلات الشروط",
    body:
      "We may update these terms when the product changes. When we do, we update the date at the top of this page. Significant changes are announced inside Plotzy and on the pricing page. Continued use of Plotzy after a change means you accept the updated terms.",
    bodyAr:
      "قد نُحدّث هذه الشروط عندما يتغيّر المنتج. في كل مرّه نُحدّث التاريخ في أعلى الصفحه. التعديلات الجوهريه يُعلَن عنها داخل بلوتزي وفي صفحه الأسعار. استمرارك في استخدام بلوتزي بعد التعديل يعني قبولك للشروط الجديده.",
  },
  {
    id: "contact",
    label: "Contact",
    labelAr: "التواصل",
    title: "11. Contact",
    titleAr: "11. التواصل",
    body:
      "Questions, complaints, or requests can be sent to support@plotzy.co. We read every message and respond as quickly as we reasonably can.",
    bodyAr:
      "للأسئله والشكاوى والطلبات: support@plotzy.co. نقرأ كل رساله ونردّ بأسرع ما نستطيع.",
  },
];

export default function TermsOfService() {
  const { lang } = useLanguage();
  const ar = lang === "ar";
  const [active, setActive] = useState<string>(SECTIONS[0].id);

  // Track which section is in view so the sidebar's active marker
  // follows the writer as they scroll. Same pattern as the Privacy
  // Policy page so the two read consistently.
  useEffect(() => {
    const handler = () => {
      const halfway = window.innerHeight / 2;
      let current = SECTIONS[0].id;
      for (const s of SECTIONS) {
        const el = document.getElementById(s.id);
        if (!el) continue;
        const r = el.getBoundingClientRect();
        if (r.top - halfway <= 0) current = s.id;
      }
      setActive(current);
    };
    window.addEventListener("scroll", handler, { passive: true });
    handler();
    return () => window.removeEventListener("scroll", handler);
  }, []);

  const scrollTo = (id: string) => {
    const el = document.getElementById(id);
    if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const dateLabel = useMemo(() => {
    try {
      const d = new Date(`${LAST_UPDATED_ISO}T00:00:00Z`);
      return new Intl.DateTimeFormat(ar ? "ar" : "en", {
        year: "numeric",
        month: "long",
        day: "numeric",
      }).format(d);
    } catch {
      return LAST_UPDATED_ISO;
    }
  }, [ar]);

  return (
    <div
      dir={ar ? "rtl" : "ltr"}
      className={"plotzy-legal" + (ar ? " is-ar" : "")}
      style={{
        minHeight: "100vh",
        background: "var(--background)",
        color: "var(--foreground)",
      }}
    >
      <SEO
        title={ar ? "شروط الخدمه, بلوتزي" : "Terms of Service, Plotzy"}
        description={
          ar
            ? "شروط استخدام منصّه بلوتزي المجّانيه للكتابه."
            : "The terms of service for Plotzy, a free writing platform."
        }
      />
      <JsonLd
        data={buildBreadcrumbSchema([
          { name: ar ? "شروط الخدمه" : "Terms of Service", path: "/terms" },
        ])}
      />

      {/* Minimal header — mirrors Privacy Policy so the two pages
          look like one product instead of two designers. */}
      <header
        style={{
          borderBottom: "1px solid var(--border)",
          position: "sticky",
          top: 0,
          background: "var(--background)",
          zIndex: 50,
          backdropFilter: "blur(12px)",
        }}
      >
        <div
          style={{
            maxWidth: 1120,
            margin: "0 auto",
            padding: "0 clamp(14px, 4vw, 24px)",
            height: 52,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <Link
            href="/"
            style={{
              textDecoration: "none",
              display: "flex",
              alignItems: "center",
              gap: 8,
            }}
          >
            <img
              src={`${import.meta.env.BASE_URL}plotzy-logo.png`}
              alt="Plotzy"
              style={{
                width: 22,
                height: 22,
                objectFit: "contain",
                borderRadius: 5,
              }}
            />
            <span style={{ fontWeight: 800, fontSize: 13.5, letterSpacing: "-0.05em" }}>
              PLOTZY
            </span>
          </Link>
          <Link href="/" style={{ textDecoration: "none" }}>
            <div
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 5,
                color: "var(--muted-foreground)",
                fontSize: 13,
                cursor: "pointer",
              }}
            >
              <ArrowLeft style={{ width: 13, height: 13 }} />
              {ar ? "رجوع" : "Back"}
            </div>
          </Link>
        </div>
      </header>

      <div style={{ paddingTop: 40, paddingBottom: 120 }}>
        <div
          style={{
            maxWidth: 1120,
            margin: "0 auto",
            padding: "0 clamp(14px, 4vw, 24px)",
          }}
        >
          {/* Phone: collapse the sidebar nav and shrink the title.
              Same breakpoint and rules as the Privacy Policy page. */}
          <style>{`
            @media (max-width: 699px) {
              .tos-grid { grid-template-columns: 1fr !important; gap: 24px !important; }
              .tos-grid > aside { display: none !important; }
              .tos-grid h1 { font-size: 32px !important; }
            }
          `}</style>

          <div
            className="tos-grid"
            style={{
              display: "grid",
              gridTemplateColumns: "220px 1fr",
              gap: 64,
              alignItems: "start",
            }}
          >
            <aside style={{ position: "sticky", top: 88 }}>
              <p
                style={{
                  fontSize: 11,
                  fontWeight: 700,
                  letterSpacing: "0.1em",
                  textTransform: "uppercase",
                  color: "var(--muted-foreground)",
                  marginBottom: 16,
                }}
              >
                {ar ? "المحتويات" : "Contents"}
              </p>
              <nav style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                {SECTIONS.map((s) => (
                  <button
                    key={s.id}
                    onClick={() => scrollTo(s.id)}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 6,
                      padding: "5px 8px",
                      borderRadius: 6,
                      border: "none",
                      cursor: "pointer",
                      background:
                        active === s.id ? "var(--accent)" : "transparent",
                      color:
                        active === s.id
                          ? "var(--accent-foreground)"
                          : "var(--muted-foreground)",
                      fontSize: 12,
                      textAlign: ar ? "right" : "left",
                      fontWeight: active === s.id ? 600 : 400,
                      transition: "all 0.15s",
                    }}
                  >
                    {active === s.id && (
                      <ChevronRight
                        style={{
                          width: 10,
                          height: 10,
                          flexShrink: 0,
                          transform: ar ? "scaleX(-1)" : undefined,
                        }}
                      />
                    )}
                    {ar ? s.labelAr : s.label}
                  </button>
                ))}
              </nav>

              <div
                style={{
                  marginTop: 32,
                  padding: "16px",
                  borderRadius: 10,
                  background: "var(--muted)",
                  fontSize: 12,
                  lineHeight: 1.6,
                  color: "var(--muted-foreground)",
                }}
              >
                <p
                  style={{
                    fontWeight: 600,
                    color: "var(--foreground)",
                    marginBottom: 4,
                  }}
                >
                  {ar ? "أسئله عن الشروط؟" : "Questions about the terms?"}
                </p>
                <a
                  href="mailto:support@plotzy.co"
                  style={{ color: "var(--muted-foreground)" }}
                >
                  support@plotzy.co
                </a>
              </div>
            </aside>

            <main>
              <div style={{ marginBottom: 56 }}>
                <p
                  style={{
                    fontSize: 11,
                    fontWeight: 700,
                    letterSpacing: "0.1em",
                    textTransform: "uppercase",
                    color: "var(--muted-foreground)",
                    marginBottom: 12,
                  }}
                >
                  {ar ? "قانوني" : "Legal"}
                </p>
                <h1
                  style={{
                    fontSize: 42,
                    fontWeight: 800,
                    letterSpacing: "-0.03em",
                    lineHeight: 1.1,
                    margin: "0 0 16px",
                  }}
                >
                  {ar ? "شروط الخدمه" : "Terms of Service"}
                </h1>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 16,
                    flexWrap: "wrap",
                  }}
                >
                  <span
                    style={{ fontSize: 14, color: "var(--muted-foreground)" }}
                  >
                    {ar ? "آخر تحديث: " : "Last updated: "}
                    {dateLabel}
                  </span>
                  <span
                    style={{ fontSize: 14, color: "var(--muted-foreground)" }}
                  >
                    ·
                  </span>
                  <Link
                    href="/privacy"
                    style={{
                      fontSize: 14,
                      color: "var(--muted-foreground)",
                      textDecoration: "underline",
                    }}
                  >
                    {ar ? "سياسه الخصوصيه" : "Privacy Policy"}
                  </Link>
                </div>
                <p
                  style={{
                    fontSize: 15,
                    lineHeight: 1.8,
                    color: "var(--muted-foreground)",
                    marginTop: 24,
                    padding: "16px 20px",
                    borderRadius: 10,
                    background: "var(--muted)",
                    borderInlineStart: "3px solid var(--border)",
                  }}
                >
                  {ar
                    ? "هذه الشروط تحدّد الاتّفاق بينك وبين بلوتزي. بلوتزي مجّاني لكل كاتب. باستخدامك للموقع فأنت توافق على البنود أدناه. إن لم توافق, فلا تستخدم بلوتزي."
                    : "These terms describe the agreement between you and Plotzy. Plotzy is provided free of charge to every writer. By using the site, you agree to the terms below. If you do not agree, please do not use Plotzy."}
                </p>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: 48 }}>
                {SECTIONS.map((s) => (
                  <section
                    key={s.id}
                    id={s.id}
                    style={{ scrollMarginTop: 80 }}
                  >
                    <h2
                      style={{
                        fontSize: 22,
                        fontWeight: 700,
                        letterSpacing: "-0.02em",
                        margin: 0,
                        marginBottom: 14,
                        color: "var(--foreground)",
                      }}
                    >
                      {ar ? s.titleAr : s.title}
                    </h2>
                    <p
                      style={{
                        margin: 0,
                        fontSize: 15.5,
                        lineHeight: 1.85,
                        color: "var(--muted-foreground)",
                      }}
                    >
                      {ar ? s.bodyAr : s.body}
                    </p>
                  </section>
                ))}
              </div>
            </main>
          </div>
        </div>
      </div>
    </div>
  );
}
