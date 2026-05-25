// About Plotzy. Rewritten for the free-for-everyone era: short,
// straightforward, no em-dashes, no emojis. Dark theme to match the
// rest of the site (Terms, Privacy, Pricing) — black background,
// white text, soft white-tinted rules between sections.

import { useMemo } from "react";
import { Link } from "wouter";
import { Layout } from "@/components/layout";
import { SEO } from "@/components/SEO";
import { useLanguage } from "@/contexts/language-context";

const SF =
  '-apple-system, BlinkMacSystemFont, "SF Pro Display", "SF Pro Text", "Helvetica Neue", "Segoe UI", Arial, sans-serif';

const TEXT = {
  en: {
    seoTitle: "About Plotzy",
    seoDesc: "Plotzy is a free writing platform for serious writers.",
    eyebrow: "About",
    title: "A writing tool, not a business.",
    leadParagraphs: [
      "Plotzy is a platform for serious writers. It was built so a person sitting down to write a book has every tool they need in one place, in their own language, without a paywall in the way.",
      "We chose a different model on purpose. Plotzy is free for every writer, forever. There is no trial, no paid plan, no feature we are saving for a paid tier later. The whole product is available to everyone the moment they sign in.",
    ],
    sectionsHeading: "What we believe",
    sections: [
      {
        title: "A tool for writers, not a sales funnel.",
        body:
          "Paywalls turn a writer's tool into a sales funnel, and that changes how the tool gets designed. The free model keeps the work honest. The thing in front of the writer is the actual product, not the trailer.",
      },
      {
        title: "Bilingual from the first line of code.",
        body:
          "Plotzy is built for Arabic and English equally. The editor knows where to break a line, the PDF export knows which font to use, the AI assistant answers in the language the writer is writing in. Arabic is not an afterthought; it is the default for a lot of our work.",
      },
      {
        title: "Free now, free later.",
        body:
          "The features here are the features. We do not introduce a feature and then move it behind a paywall. The only way the product changes is to get better for everyone at the same time.",
      },
      {
        title: "Honest about the AI.",
        body:
          "The writing assistant, the audiobook narration, and the cover generator sit on top of paid third-party services. We pay those bills ourselves. On most days they work for everyone. If a service hits its daily limit or the cost grows past what we can cover, the AI features can pause for a while. The editor and the rest of the tool never stop.",
      },
      {
        title: "Supported by people who can.",
        body:
          "The servers and the AI cost real money. The people who can spare a little to support the project make it possible for the people who cannot to keep writing. Support is voluntary, and it does not unlock anything; the same Plotzy stays free for everyone.",
      },
    ],
    closing: {
      heading: "If you write, this is for you.",
      body:
        "Plotzy is small, opinionated, and still growing. If something does not work for you, write to us. We read everything.",
      cta: "Start writing",
    },
  },
  ar: {
    seoTitle: "حول بلوتزي",
    seoDesc: "بلوتزي منصّه كتابه مجّانيه للكتّاب الجادّين.",
    eyebrow: "حول بلوتزي",
    title: "أداه كتابه، لا شركه.",
    leadParagraphs: [
      "بلوتزي منصّه للكتّاب الجادّين. صُمّمت كي يجد الكاتب أمامه, لحظه يجلس ليكتب كتاباً, كل ما يحتاجه في مكان واحد, بلغته, وبدون أي جدار مدفوع يقف في الطريق.",
      "اخترنا نموذجاً مختلفاً عن قصد. بلوتزي مجّاني لكل كاتب, إلى الأبد. لا توجد فتره تجريبيه ولا خطه مدفوعه ولا ميزه نحتفظ بها لخطه قادمه. المنتج كاملاً متاح للجميع منذ أول تسجيل دخول.",
    ],
    sectionsHeading: "ما نؤمن به",
    sections: [
      {
        title: "أداه للكتّاب، لا قمع مبيعات.",
        body:
          "الجدران المدفوعه تحوّل أداه الكاتب إلى قمع مبيعات, وهذا يغيّر كيفيه تصميم الأداه. النموذج المجّاني يبقي العمل أميناً, فما يراه الكاتب أمامه هو المنتج فعلاً, لا إعلان عنه.",
      },
      {
        title: "ثنائي اللغه منذ السطر الأول.",
        body:
          "بُني بلوتزي للعربيه والإنجليزيه بالتساوي. المحرّر يعرف أين يكسر السطر, والـ PDF يعرف أي خط يستخدم, والمساعد الذكي يجيب باللغه التي يكتب بها الكاتب. العربيه ليست إضافه لاحقه, بل لغه أساسيه في الكثير من عملنا.",
      },
      {
        title: "مجّاني الآن، مجّاني لاحقاً.",
        body:
          "ما ترونه هنا هو ما يبقى. لا نُطلق ميزه ثم ننقلها خلف جدار مدفوع. السبيل الوحيد لتطوّر المنتج هو أن يصبح أفضل للجميع في الوقت ذاته.",
      },
      {
        title: "صادقون في موضوع الذكاء الاصطناعي.",
        body:
          "مساعد الكتابه وتحويل الفصول إلى صوت ومولّد الغلاف, جميعها تستند إلى خدمات ذكاء اصطناعي مدفوعه من طرف ثالث. نحن نتكفّل بفواتيرها. في معظم الأيام تعمل للجميع. إذا بلغت إحداها حصّتها اليوميه أو لو تخطّت التكلفه ما نقدر على تحمّله, فقد تتوقّف ميزات الذكاء الاصطناعي لفتره. أمّا المحرّر وبقيه الأداه فلا تتوقّف.",
      },
      {
        title: "مدعوم ممّن يستطيع.",
        body:
          "للسيرفر ولفواتير الذكاء الاصطناعي تكلفه فعليه. من يستطيعون المساهمه يجعلون من لا يستطيعون قادرين على متابعه الكتابه. الدعم تطوّعي ولا يفتح أي ميزه إضافيه, فبلوتزي نفسه يبقى مجّانياً للجميع.",
      },
    ],
    closing: {
      heading: "إذا كنت تكتب، فهذا لك.",
      body:
        "بلوتزي صغير, له رأيه, وما يزال يكبر. لو لم يعمل شيءٌ معك كما يجب, راسلنا. نقرأ كل ما يصلنا.",
      cta: "ابدأ الكتابه",
    },
  },
};

export default function About() {
  const { lang, isRTL } = useLanguage();
  const t = useMemo(() => TEXT[lang === "ar" ? "ar" : "en"], [lang]);

  return (
    <Layout>
      <SEO title={t.seoTitle} description={t.seoDesc} />

      <div
        dir={isRTL ? "rtl" : "ltr"}
        style={{
          minHeight: "100vh",
          background: "var(--background)",
          color: "#fff",
          fontFamily: SF,
          padding: "80px 24px 120px",
        }}
      >
        <div style={{ maxWidth: 720, margin: "0 auto" }}>
          {/* eyebrow */}
          <div
            style={{
              fontSize: 12.5,
              letterSpacing: "0.16em",
              textTransform: "uppercase",
              color: "rgba(255,255,255,0.50)",
              fontWeight: 600,
              marginBottom: 18,
            }}
          >
            {t.eyebrow}
          </div>

          {/* title */}
          <h1
            style={{
              fontSize: "clamp(36px, 5.5vw, 56px)",
              fontWeight: 700,
              letterSpacing: "-0.025em",
              lineHeight: 1.08,
              margin: 0,
              color: "#fff",
            }}
          >
            {t.title}
          </h1>

          {/* lead */}
          <div style={{ marginTop: 32 }}>
            {t.leadParagraphs.map((p, i) => (
              <p
                key={i}
                style={{
                  margin: 0,
                  marginTop: i === 0 ? 0 : 16,
                  fontSize: 17,
                  lineHeight: 1.7,
                  color: "rgba(255,255,255,0.72)",
                }}
              >
                {p}
              </p>
            ))}
          </div>

          {/* sections */}
          <div style={{ marginTop: 64 }}>
            <h2
              style={{
                fontSize: 13,
                letterSpacing: "0.14em",
                textTransform: "uppercase",
                color: "rgba(255,255,255,0.55)",
                fontWeight: 600,
                margin: 0,
                marginBottom: 24,
              }}
            >
              {t.sectionsHeading}
            </h2>
            <ul style={{ listStyle: "none", margin: 0, padding: 0 }}>
              {t.sections.map((s) => (
                <li
                  key={s.title}
                  style={{
                    padding: "22px 0",
                    borderTop: "1px solid rgba(255,255,255,0.10)",
                  }}
                >
                  <h3
                    style={{
                      fontSize: 18,
                      fontWeight: 700,
                      letterSpacing: "-0.015em",
                      margin: 0,
                      marginBottom: 8,
                      color: "#fff",
                    }}
                  >
                    {s.title}
                  </h3>
                  <p
                    style={{
                      margin: 0,
                      fontSize: 15.5,
                      lineHeight: 1.7,
                      color: "rgba(255,255,255,0.68)",
                    }}
                  >
                    {s.body}
                  </p>
                </li>
              ))}
              <li style={{ borderTop: "1px solid rgba(255,255,255,0.10)" }} />
            </ul>
          </div>

          {/* closing */}
          <div style={{ marginTop: 56, textAlign: "center" }}>
            <h2
              style={{
                fontSize: "clamp(24px, 3vw, 30px)",
                fontWeight: 700,
                letterSpacing: "-0.02em",
                margin: 0,
                marginBottom: 12,
                color: "#fff",
              }}
            >
              {t.closing.heading}
            </h2>
            <p
              style={{
                margin: 0,
                fontSize: 15.5,
                lineHeight: 1.7,
                color: "rgba(255,255,255,0.65)",
                maxWidth: 520,
                marginInline: "auto",
              }}
            >
              {t.closing.body}
            </p>
            <Link
              href="/"
              style={{
                display: "inline-block",
                marginTop: 26,
                padding: "13px 24px",
                borderRadius: 12,
                background: "#fff",
                color: "#0a0a0a",
                fontFamily: "inherit",
                fontSize: 14.5,
                fontWeight: 600,
                textDecoration: "none",
                letterSpacing: "-0.005em",
              }}
            >
              {t.closing.cta}
            </Link>
          </div>
        </div>
      </div>
    </Layout>
  );
}
