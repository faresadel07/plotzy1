// Plotzy Terms of Service. Rewritten for the free-for-everyone model:
// short, plain, bilingual, with the same Mozilla-style visual language
// as the new pricing and about pages. No em-dashes, no emojis.

import { useMemo } from "react";
import { Link } from "wouter";
import { Layout } from "@/components/layout";
import { SEO } from "@/components/SEO";
import { useLanguage } from "@/contexts/language-context";

const SF =
  '-apple-system, BlinkMacSystemFont, "SF Pro Display", "SF Pro Text", "Helvetica Neue", "Segoe UI", Arial, sans-serif';

// Last-revised date (UTC). Bump whenever the text below changes.
const LAST_UPDATED_ISO = "2026-05-22";

const TEXT = {
  en: {
    seoTitle: "Terms of Service, Plotzy",
    seoDesc: "The terms of service for Plotzy, a free writing platform.",
    eyebrow: "Legal",
    title: "Terms of Service",
    updated: "Last updated",
    intro:
      "These terms describe the agreement between you and Plotzy. Plotzy is provided free of charge to every writer. By using the site, you agree to the terms below. If you do not agree, please do not use Plotzy.",
    sections: [
      {
        title: "What Plotzy is",
        body:
          "Plotzy is a writing platform that provides an editor, an AI writing assistant, an export service, a public-domain library, a writing course, and an audiobook narration feature. Every feature is available at no cost.",
      },
      {
        title: "Your account",
        body:
          "You may create an account using email or a supported sign-in provider such as Google. You are responsible for keeping your sign-in details safe. You may delete your account at any time from your settings, in which case your manuscripts and personal data are removed from active databases within thirty days.",
      },
      {
        title: "What you write belongs to you",
        body:
          "You retain full ownership of every word you write inside Plotzy. We do not claim any rights to your manuscripts, your covers, or your published works. Drafts are stored on our servers only so we can serve them back to you across devices. If you delete a draft, it is removed from active databases within thirty days.",
      },
      {
        title: "What you must not do",
        body:
          "You agree not to use Plotzy to publish content that is illegal, harasses or endangers another person, infringes someone else's copyright, attempts to break the platform, or abuses the AI features to generate large amounts of unrelated content. We may remove content or suspend accounts that violate this section.",
      },
      {
        title: "The AI services we use",
        body:
          "Plotzy uses paid third-party AI services to power the writing assistant, audiobook narration, and cover generator. We pay those bills from our own pocket and from voluntary supporters. If a service hits a daily limit, or if the cost grows beyond what we can cover, the AI features may pause temporarily. The editor, exports, library, and course do not depend on those services and continue to work.",
      },
      {
        title: "Donations",
        body:
          "Plotzy is free. The donation flow on the pricing page is voluntary and one-time. Donations do not buy any feature, badge, or tier; they go to keeping the servers on and paying the AI bill. Donations are non-refundable except where required by law. If you donated by mistake or believe you were charged in error, write to support and we will refund it.",
      },
      {
        title: "Public library and community",
        body:
          "If you choose to publish a manuscript to the community library, you grant other Plotzy readers the right to read and rate it inside Plotzy. You can unpublish at any time. We may remove published content that violates the section on what you must not do.",
      },
      {
        title: "Service availability",
        body:
          "We try to keep Plotzy available at all times, but we cannot promise it. The site may be unavailable during maintenance, upgrades, or events outside our control. Because Plotzy is provided free of charge, the service is offered on an as-is basis without warranties.",
      },
      {
        title: "Limit of liability",
        body:
          "To the extent permitted by law, Plotzy is not liable for indirect, incidental, or consequential damages arising from your use of the site, including loss of data or lost profits. Always keep your own copy of important manuscripts.",
      },
      {
        title: "Changes to these terms",
        body:
          "We may update these terms when the product changes. When we do, we update the date at the top of this page. Significant changes are announced inside Plotzy and on the pricing page. Continued use of Plotzy after a change means you accept the updated terms.",
      },
      {
        title: "Contact",
        body:
          "Questions, complaints, or requests can be sent to support@plotzy.co. We read every message and respond as quickly as we reasonably can.",
      },
    ],
    accept: "Back to home",
  },
  ar: {
    seoTitle: "شروط الخدمه, بلوتزي",
    seoDesc: "شروط استخدام منصّه بلوتزي المجّانيه للكتابه.",
    eyebrow: "قانوني",
    title: "شروط الخدمه",
    updated: "آخر تحديث",
    intro:
      "هذه الشروط تحدّد الاتّفاق بينك وبين بلوتزي. بلوتزي مجّاني لكل كاتب. باستخدامك للموقع فأنت توافق على البنود أدناه. إن لم توافق, فلا تستخدم بلوتزي.",
    sections: [
      {
        title: "ما هو بلوتزي",
        body:
          "بلوتزي منصّه كتابه تقدّم محرّراً للنص, ومساعداً ذكياً للكتابه, وأداه تصدير, ومكتبه ضمن الملك العام, ودوره كتابه, وميزه تحويل الفصول إلى صوت. كل هذه الميزات متاحه بدون أي مقابل.",
      },
      {
        title: "حسابك",
        body:
          "يمكنك إنشاء حساب عبر البريد الإلكتروني أو عبر مزوّد دخول مدعوم مثل Google. أنت المسؤول عن الحفاظ على بيانات الدخول. يمكنك حذف حسابك في أي وقت من الإعدادات, وعندها نحذف مخطوطاتك وبياناتك الشخصيه من قواعد البيانات النشطه خلال ثلاثين يوماً.",
      },
      {
        title: "ما تكتبه ملكك",
        body:
          "تحتفظ بحقوق كل كلمه تكتبها داخل بلوتزي. لا نطالب بأي حق على مخطوطاتك أو أغلفتك أو أعمالك المنشوره. نخزّن المسوّدات على سيرفرنا فقط لنعيدها لك عبر أجهزتك. إذا حذفت مسوّده فإنّها تُمحى من قواعد البيانات النشطه خلال ثلاثين يوماً.",
      },
      {
        title: "ما لا يجوز فعله",
        body:
          "توافق على ألا تستخدم بلوتزي لنشر محتوى مخالف للقانون, أو يضايق أو يعرّض أحداً للخطر, أو ينتهك حقوق ملكيه فكريه لطرف آخر, أو يحاول إيذاء المنصّه, أو يسيء استخدام ميزات الذكاء الاصطناعي لإنتاج كميات هائله من المحتوى غير ذي الصله. قد نزيل أي محتوى أو نوقف أي حساب يخالف هذا البند.",
      },
      {
        title: "خدمات الذكاء الاصطناعي التي نستخدمها",
        body:
          "يستخدم بلوتزي خدمات ذكاء اصطناعي مدفوعه من طرف ثالث لتشغيل المساعد وتحويل الصوت ومولّد الغلاف. نتحمّل تكلفه تلك الخدمات من جيبنا ومن دعم المتبرّعين. إذا بلغت إحدى الخدمات حصّتها اليوميه, أو لو تخطّت التكلفه ما نقدر على تحمّله, فقد تتوقّف ميزات الذكاء الاصطناعي مؤقّتاً. أمّا المحرّر والتصدير والمكتبه والدوره فلا تعتمد على هذه الخدمات وتستمر بالعمل.",
      },
      {
        title: "التبرّعات",
        body:
          "بلوتزي مجّاني. التبرّع من صفحه الأسعار طوعي ويتمّ لمرّه واحده. لا يشتري التبرّع أي ميزه أو شاره أو فئه, وإنّما يذهب لتغطيه تكلفه السيرفر وفاتوره الذكاء الاصطناعي. التبرّعات غير قابله للاسترداد إلا في الحالات التي يفرض فيها القانون ذلك. لو تبرّعت عن طريق الخطأ أو ظننت أنّك خُصمت بشكل غير سليم, راسلنا وسنردّ المبلغ.",
      },
      {
        title: "المكتبه العامّه والمجتمع",
        body:
          "إذا اخترت نشر مخطوطه في المكتبه المجتمعيه فأنت تمنح بقيّه قرّاء بلوتزي الحق في قراءتها وتقييمها داخل بلوتزي. يمكنك إلغاء النشر في أي وقت. قد نزيل أي محتوى منشور يخالف بند ما لا يجوز فعله.",
      },
      {
        title: "توفّر الخدمه",
        body:
          "نحرص على إبقاء بلوتزي متاحاً دائماً, لكنّنا لا نستطيع أن نضمن ذلك. قد يكون الموقع غير متاح خلال أعمال الصيانه أو التحديث أو لأسباب خارجه عن إرادتنا. ولأنّ الخدمه تُقدَّم مجّاناً, فهي مقدَّمه كما هي دون أي ضمانات.",
      },
      {
        title: "حدود المسؤوليه",
        body:
          "إلى الحدّ الذي يسمح به القانون, لا يكون بلوتزي مسؤولاً عن أي أضرار غير مباشره أو عرضيه أو تبعيه تنجم عن استخدام الموقع, بما في ذلك فقدان البيانات أو الأرباح الضائعه. احفظ دائماً نسختك الخاصّه من مخطوطاتك المهمّه.",
      },
      {
        title: "تعديلات الشروط",
        body:
          "قد نُحدّث هذه الشروط عندما يتغيّر المنتج. في كل مرّه نُحدّث التاريخ في أعلى الصفحه. التعديلات الجوهريه يُعلَن عنها داخل بلوتزي وفي صفحه الأسعار. استمرارك في استخدام بلوتزي بعد التعديل يعني قبولك للشروط الجديده.",
      },
      {
        title: "التواصل",
        body:
          "للأسئله والشكاوى والطلبات: support@plotzy.co. نقرأ كل رساله ونردّ بأسرع ما نستطيع.",
      },
    ],
    accept: "العوده إلى الصفحه الرئيسيه",
  },
};

export default function TermsOfService() {
  const { lang, isRTL } = useLanguage();
  const ar = lang === "ar";
  const t = useMemo(() => TEXT[ar ? "ar" : "en"], [ar]);

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
    <Layout>
      <SEO title={t.seoTitle} description={t.seoDesc} />

      <div
        dir={isRTL ? "rtl" : "ltr"}
        style={{
          minHeight: "100vh",
          background: "#fff",
          color: "#0a0a0a",
          fontFamily: SF,
          padding: "80px 24px 120px",
        }}
      >
        <div style={{ maxWidth: 720, margin: "0 auto" }}>
          <div
            style={{
              fontSize: 12.5,
              letterSpacing: "0.16em",
              textTransform: "uppercase",
              color: "rgba(0,0,0,0.50)",
              fontWeight: 600,
              marginBottom: 18,
            }}
          >
            {t.eyebrow}
          </div>
          <h1
            style={{
              fontSize: "clamp(34px, 5vw, 50px)",
              fontWeight: 700,
              letterSpacing: "-0.025em",
              lineHeight: 1.08,
              margin: 0,
              color: "#0a0a0a",
            }}
          >
            {t.title}
          </h1>
          <p
            style={{
              marginTop: 18,
              fontSize: 13.5,
              color: "rgba(0,0,0,0.55)",
              fontWeight: 500,
            }}
          >
            {t.updated}: {dateLabel}
          </p>

          <p
            style={{
              marginTop: 28,
              fontSize: 16.5,
              lineHeight: 1.7,
              color: "rgba(0,0,0,0.72)",
            }}
          >
            {t.intro}
          </p>

          <ol
            style={{
              listStyle: "none",
              padding: 0,
              margin: 0,
              marginTop: 44,
              counterReset: "section",
            }}
          >
            {t.sections.map((s, i) => (
              <li
                key={s.title}
                style={{
                  padding: "26px 0",
                  borderTop: "1px solid rgba(0,0,0,0.08)",
                }}
              >
                <div style={{ display: "flex", gap: 14, alignItems: "baseline" }}>
                  <span
                    style={{
                      fontSize: 13,
                      color: "rgba(0,0,0,0.45)",
                      fontWeight: 600,
                      minWidth: 28,
                      fontVariantNumeric: "tabular-nums",
                    }}
                  >
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <h2
                      style={{
                        fontSize: 19,
                        fontWeight: 700,
                        letterSpacing: "-0.015em",
                        margin: 0,
                        marginBottom: 8,
                        color: "#0a0a0a",
                      }}
                    >
                      {s.title}
                    </h2>
                    <p
                      style={{
                        margin: 0,
                        fontSize: 15.5,
                        lineHeight: 1.7,
                        color: "rgba(0,0,0,0.68)",
                      }}
                    >
                      {s.body}
                    </p>
                  </div>
                </div>
              </li>
            ))}
            <li style={{ borderTop: "1px solid rgba(0,0,0,0.08)" }} />
          </ol>

          <div style={{ marginTop: 48, textAlign: "center" }}>
            <Link
              href="/"
              style={{
                display: "inline-block",
                padding: "13px 24px",
                borderRadius: 12,
                background: "#0a0a0a",
                color: "#fff",
                fontFamily: "inherit",
                fontSize: 14.5,
                fontWeight: 600,
                textDecoration: "none",
                letterSpacing: "-0.005em",
              }}
            >
              {t.accept}
            </Link>
          </div>
        </div>
      </div>
    </Layout>
  );
}
