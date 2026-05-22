// Plotzy pricing page. The product is free for every writer, forever.
// The page is shaped so the donation card sits at the very top (so
// people who already know they want to support do not have to scroll
// to find a button), and the explanation of what Plotzy offers and
// the honest caveat about the AI lives directly below it. The visual
// language is the Mozilla donation card: a single white card, dark
// text, six rounded amount tiles, a custom-amount field, and one
// solid black call-to-action. No em-dashes, no emojis.

import { useEffect, useMemo, useState } from "react";
import { Layout } from "@/components/layout";
import { useLanguage } from "@/contexts/language-context";
import { useToast } from "@/hooks/use-toast";
import { SEO } from "@/components/SEO";

const SF =
  '-apple-system, BlinkMacSystemFont, "SF Pro Display", "SF Pro Text", "Helvetica Neue", "Segoe UI", Arial, sans-serif';

const TEXT = {
  en: {
    pageTitle: "Pricing, Plotzy",
    pageDescription: "Plotzy is free for every writer. Support the project if you would like to.",
    title: "Support Plotzy",
    presets: ["5", "10", "25", "50", "100", "250"],
    currency: "USD",
    amountAria: "Enter a custom amount in US dollars",
    placeholder: "Amount",
    button: "Support and donate",
    buttonBusy: "Opening PayPal...",
    safeNote:
      "Processed by PayPal. A receipt is emailed to you by PayPal. We do not store your card.",
    minNote: "The minimum donation is one dollar.",
    invalid: "Invalid amount",

    introHeading: "Everything Plotzy offers is free",
    introBody:
      "Every Plotzy feature is available to every writer at no cost. There is no paid plan, no trial, and no feature we are saving for a paid tier later. If we build it, it ships free.",

    listHeading: "Included for everyone",
    list: [
      {
        title: "Unlimited writing",
        body:
          "Unlimited books, unlimited chapters, unlimited words. Save as often as you like, in Arabic or English.",
      },
      {
        title: "AI writing assistant",
        body:
          "A patient companion for plotting, character work, dialogue, and revision, available inside every chapter.",
      },
      {
        title: "Public-domain library",
        body:
          "Tens of thousands of Arabic and English public-domain books, ready to read inside Plotzy or download as PDF.",
      },
      {
        title: "The writing course",
        body:
          "Six modules, twenty-seven lessons, six quizzes, a final project, and a verified certificate. Free.",
      },
      {
        title: "Audiobook narration",
        body:
          "Turn your finished chapters into a full audiobook in a single click, in your preferred voice.",
      },
      {
        title: "Professional exports",
        body:
          "Download your book as a PDF, EPUB, or Word file. Arabic books export with the right typography by default.",
      },
      {
        title: "Community library",
        body:
          "Publish for the public, gather readers, gather feedback. No gatekeeping, no algorithm pushing you down.",
      },
    ],

    aiHeading: "About the AI we use",
    aiBody:
      "The writing assistant, the marketplace tools, the audiobook narration, and the AI cover generator all sit on top of paid third-party services. We pay those bills ourselves so you do not have to. On most days the AI works for everyone. If a service hits a daily limit, or if the cost ever grows past what we can cover from our own pocket, the AI features can pause for a while. The writing tool itself, the editor, the chapter manager, the exports, the library, the course, never stops. It is not built on a paid service and it does not need one.",

    closingHeading: "If it helped you, and you can spare a little",
    closingBody:
      "Every dollar contributed goes to keeping the servers on and paying the AI bill. That is it. There are no perks, no badges, no tiers. The same Plotzy stays free for the next writer who finds it.",
  },
  ar: {
    pageTitle: "الأسعار, بلوتزي",
    pageDescription: "بلوتزي مجاني لكل كاتب. ادعم المشروع إذا أردت.",
    title: "ادعم بلوتزي",
    presets: ["5", "10", "25", "50", "100", "250"],
    currency: "USD",
    amountAria: "اكتب مبلغاً مخصّصاً بالدولار الأمريكي",
    placeholder: "المبلغ",
    button: "ادعم وتبرّع",
    buttonBusy: "جارٍ فتح PayPal...",
    safeNote:
      "الدفع يتم عبر PayPal، وتصلك من PayPal فاتوره على بريدك الإلكتروني. لا نحفظ أي بيانات بطاقه.",
    minNote: "الحد الأدنى للتبرّع دولار واحد.",
    invalid: "مبلغ غير صالح",

    introHeading: "كل ما يقدّمه بلوتزي مجّاني",
    introBody:
      "كل ميزه في بلوتزي متاحه لكل كاتب دون أي مقابل. لا توجد خطه مدفوعه، ولا فتره تجريبيه، ولا ميزه نحتفظ بها لخطه مدفوعه لاحقاً. ما نبنيه نُطلقه مجّاناً.",

    listHeading: "متاح للجميع",
    list: [
      {
        title: "كتابه بلا حدود",
        body:
          "كتب غير محدوده، فصول غير محدوده، كلمات غير محدوده. احفظ كلما شئت، بالعربيه أو الإنجليزيه.",
      },
      {
        title: "مساعد كتابه ذكي",
        body:
          "رفيق صبور لتطوير الحبكه والشخصيات والحوار والمراجعه، متاح داخل كل فصل.",
      },
      {
        title: "مكتبه الملك العام",
        body:
          "عشرات الآلاف من الكتب العربيه والإنجليزيه ضمن الملك العام، جاهزه للقراءه داخل بلوتزي أو للتنزيل بصيغه PDF.",
      },
      {
        title: "دوره كتابه الروايه",
        body:
          "ست وحدات، سبعه وعشرون درساً، ستّه اختبارات، مشروع نهائي، وشهاده موثّقه. كل هذا مجّاناً.",
      },
      {
        title: "تحويل الكتاب إلى صوت",
        body:
          "حوّل فصولك إلى كتاب صوتي كامل بضغطه واحده، بصوت تختاره أنت.",
      },
      {
        title: "تصدير احترافي",
        body:
          "نزّل كتابك بصيغه PDF أو EPUB أو Word. الكتب العربيه تخرج بتنسيق صحيح للحرف العربي تلقائياً.",
      },
      {
        title: "المكتبه المجتمعيه",
        body:
          "انشر للقرّاء، اجمع جمهوراً، استقبل ملاحظات. بلا بوّابات، ولا خوارزميات تُخفي عملك.",
      },
    ],

    aiHeading: "حول الذكاء الاصطناعي الذي نستخدمه",
    aiBody:
      "مساعد الكتابه، وأدوات السوق، وتحويل الفصول إلى صوت، ومولّد الغلاف، جميعها تعتمد على خدمات ذكاء اصطناعي مدفوعه من طرف ثالث. نحن نتحمّل تلك الفواتير حتى لا تتحمّلها أنت. في معظم الأيام يعمل الذكاء الاصطناعي للجميع. إذا بلغت إحدى الخدمات حصّتها اليوميه، أو لو تخطّت التكلفه في يومٍ ما ما نقدر على تحمّله من جيبنا، فقد تتوقّف ميزات الذكاء الاصطناعي لفتره قصيره. أمّا أداه الكتابه نفسها، أي المحرّر ومدير الفصول والتصدير والمكتبه والدوره، فلا تتوقّف. هي ليست مبنيه على خدمه مدفوعه ولا تحتاج إليها.",

    closingHeading: "إذا ساعدك بلوتزي وكنت تستطيع المساهمه",
    closingBody:
      "كل دولار يصلنا يذهب لتغطيه تكلفه السيرفر وفاتوره الذكاء الاصطناعي. هذا كل ما في الأمر. لا توجد مزايا، ولا شارات، ولا فئات. بلوتزي نفسه يبقى مجّانياً للكاتب القادم.",
  },
};

export default function Pricing() {
  const { lang, isRTL } = useLanguage();
  const { toast } = useToast();
  const t = useMemo(() => TEXT[lang === "ar" ? "ar" : "en"], [lang]);

  const [amount, setAmount] = useState<string>("25");
  const [busy, setBusy] = useState(false);

  // PayPal cancel flow lands the donor back here with ?donation=cancelled
  // so they understand nothing was charged.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("donation") === "cancelled") {
      toast({
        title: lang === "ar" ? "ألغيت العمليه" : "Donation cancelled",
        description:
          lang === "ar"
            ? "لم نخصم أي شيء. يمكنك المحاوله مجدّداً في أي وقت."
            : "Nothing was charged. You can try again any time.",
      });
      const url = new URL(window.location.href);
      url.searchParams.delete("donation");
      window.history.replaceState({}, "", url.toString());
    }
  }, [lang, toast]);

  async function donate() {
    const value = parseFloat(amount);
    if (!Number.isFinite(value) || value < 1) {
      toast({
        title: t.invalid,
        description: t.minNote,
        variant: "destructive",
      });
      return;
    }
    setBusy(true);
    try {
      const res = await fetch("/api/paypal/create-donation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount: value.toFixed(2) }),
        credentials: "include",
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data?.approveUrl) {
        throw new Error(data?.message || "Failed to start donation");
      }
      window.location.href = data.approveUrl as string;
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to start donation";
      toast({
        title: lang === "ar" ? "تعذّر فتح PayPal" : "Could not open PayPal",
        description: message,
        variant: "destructive",
      });
      setBusy(false);
    }
  }

  return (
    <Layout>
      <SEO title={t.pageTitle} description={t.pageDescription} />

      <div
        dir={isRTL ? "rtl" : "ltr"}
        style={{
          minHeight: "100vh",
          background: "#fff",
          color: "#0a0a0a",
          fontFamily: SF,
          padding: "72px 24px 120px",
        }}
      >
        <div style={{ maxWidth: 720, margin: "0 auto" }}>
          {/* ── DONATION CARD ───────────────────────────────────── */}
          <section
            aria-labelledby="donate-heading"
            style={{
              border: "1px solid rgba(0,0,0,0.10)",
              borderRadius: 18,
              padding: "36px clamp(20px, 4vw, 44px) 32px",
              background: "#fff",
              boxShadow:
                "0 1px 0 rgba(0,0,0,0.02), 0 24px 60px rgba(15,15,20,0.06)",
            }}
          >
            <h1
              id="donate-heading"
              style={{
                fontSize: "clamp(28px, 4vw, 34px)",
                fontWeight: 700,
                letterSpacing: "-0.02em",
                lineHeight: 1.15,
                margin: 0,
                marginBottom: 24,
                color: "#0a0a0a",
              }}
            >
              {t.title}
            </h1>

            <div
              role="group"
              aria-label={t.title}
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(3, 1fr)",
                gap: 10,
              }}
            >
              {t.presets.map((p) => {
                const selected = amount === p;
                return (
                  <button
                    key={p}
                    type="button"
                    onClick={() => setAmount(p)}
                    aria-pressed={selected}
                    style={{
                      padding: "16px 0",
                      borderRadius: 12,
                      border: selected ? "1.5px solid #0a0a0a" : "1px solid rgba(0,0,0,0.14)",
                      background: selected ? "#0a0a0a" : "#fff",
                      color: selected ? "#fff" : "#0a0a0a",
                      fontFamily: "inherit",
                      fontSize: 16,
                      fontWeight: 600,
                      letterSpacing: "-0.005em",
                      cursor: "pointer",
                      transition: "background 120ms ease, border-color 120ms ease, color 120ms ease",
                    }}
                  >
                    ${p}
                  </button>
                );
              })}
            </div>

            <div style={{ position: "relative", marginTop: 12 }}>
              <span
                aria-hidden
                style={{
                  position: "absolute",
                  top: 0,
                  bottom: 0,
                  [isRTL ? "right" : "left"]: 18,
                  display: "flex",
                  alignItems: "center",
                  color: "rgba(0,0,0,0.55)",
                  fontSize: 18,
                  fontWeight: 600,
                  pointerEvents: "none",
                }}
              >
                $
              </span>
              <span
                aria-hidden
                style={{
                  position: "absolute",
                  top: 0,
                  bottom: 0,
                  [isRTL ? "left" : "right"]: 18,
                  display: "flex",
                  alignItems: "center",
                  color: "rgba(0,0,0,0.45)",
                  fontSize: 13,
                  fontWeight: 600,
                  letterSpacing: "0.06em",
                  pointerEvents: "none",
                }}
              >
                {t.currency}
              </span>
              <input
                type="number"
                inputMode="decimal"
                min={1}
                step="0.01"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                aria-label={t.amountAria}
                placeholder={t.placeholder}
                disabled={busy}
                style={{
                  width: "100%",
                  background: "#fff",
                  border: "1px solid rgba(0,0,0,0.14)",
                  borderRadius: 12,
                  padding: isRTL ? "16px 38px 16px 64px" : "16px 64px 16px 38px",
                  color: "#0a0a0a",
                  fontSize: 22,
                  fontWeight: 700,
                  letterSpacing: "-0.01em",
                  fontFamily: "inherit",
                  outline: "none",
                  transition: "border-color 120ms ease, box-shadow 120ms ease",
                }}
                onFocus={(e) => {
                  e.currentTarget.style.borderColor = "#0a0a0a";
                  e.currentTarget.style.boxShadow = "0 0 0 3px rgba(10,10,10,0.10)";
                }}
                onBlur={(e) => {
                  e.currentTarget.style.borderColor = "rgba(0,0,0,0.14)";
                  e.currentTarget.style.boxShadow = "none";
                }}
              />
            </div>

            <button
              type="button"
              onClick={donate}
              disabled={busy || !amount}
              style={{
                marginTop: 16,
                width: "100%",
                padding: "16px 22px",
                borderRadius: 12,
                background: busy || !amount ? "rgba(0,0,0,0.12)" : "#0a0a0a",
                color: busy || !amount ? "rgba(255,255,255,0.7)" : "#fff",
                border: "none",
                fontSize: 16,
                fontWeight: 600,
                letterSpacing: "-0.005em",
                fontFamily: "inherit",
                cursor: busy || !amount ? "not-allowed" : "pointer",
                transition: "transform 120ms ease, background 120ms ease",
              }}
              onMouseDown={(e) => {
                if (!busy && amount) e.currentTarget.style.transform = "scale(0.99)";
              }}
              onMouseUp={(e) => (e.currentTarget.style.transform = "scale(1)")}
              onMouseLeave={(e) => (e.currentTarget.style.transform = "scale(1)")}
            >
              {busy ? t.buttonBusy : t.button}
            </button>

            <p
              style={{
                marginTop: 14,
                fontSize: 12.5,
                color: "rgba(0,0,0,0.55)",
                lineHeight: 1.55,
                textAlign: "center",
              }}
            >
              {t.safeNote}
            </p>
          </section>

          {/* ── EVERYTHING IS FREE ──────────────────────────────── */}
          <section
            style={{
              marginTop: 64,
              maxWidth: 620,
              marginInline: "auto",
            }}
          >
            <h2
              style={{
                fontSize: "clamp(24px, 3vw, 28px)",
                fontWeight: 700,
                letterSpacing: "-0.02em",
                margin: 0,
                marginBottom: 12,
              }}
            >
              {t.introHeading}
            </h2>
            <p
              style={{
                margin: 0,
                fontSize: 16.5,
                lineHeight: 1.7,
                color: "rgba(0,0,0,0.72)",
              }}
            >
              {t.introBody}
            </p>
          </section>

          {/* ── FEATURE LIST ────────────────────────────────────── */}
          <section
            style={{
              marginTop: 40,
              maxWidth: 620,
              marginInline: "auto",
            }}
          >
            <h3
              style={{
                fontSize: 14,
                letterSpacing: "0.10em",
                textTransform: "uppercase",
                color: "rgba(0,0,0,0.55)",
                fontWeight: 600,
                margin: 0,
                marginBottom: 18,
              }}
            >
              {t.listHeading}
            </h3>
            <ul style={{ listStyle: "none", margin: 0, padding: 0 }}>
              {t.list.map((item) => (
                <li
                  key={item.title}
                  style={{
                    padding: "16px 0",
                    borderTop: "1px solid rgba(0,0,0,0.08)",
                  }}
                >
                  <div
                    style={{
                      fontSize: 16,
                      fontWeight: 600,
                      letterSpacing: "-0.01em",
                      marginBottom: 4,
                      color: "#0a0a0a",
                    }}
                  >
                    {item.title}
                  </div>
                  <div
                    style={{
                      fontSize: 14.5,
                      lineHeight: 1.65,
                      color: "rgba(0,0,0,0.68)",
                    }}
                  >
                    {item.body}
                  </div>
                </li>
              ))}
              <li style={{ borderTop: "1px solid rgba(0,0,0,0.08)" }} />
            </ul>
          </section>

          {/* ── HONEST AI NOTE ──────────────────────────────────── */}
          <section
            style={{
              marginTop: 56,
              maxWidth: 620,
              marginInline: "auto",
              background: "#fafafa",
              border: "1px solid rgba(0,0,0,0.08)",
              borderRadius: 14,
              padding: "26px 28px",
            }}
          >
            <h2
              style={{
                fontSize: 18,
                fontWeight: 700,
                letterSpacing: "-0.015em",
                margin: 0,
                marginBottom: 10,
              }}
            >
              {t.aiHeading}
            </h2>
            <p
              style={{
                margin: 0,
                fontSize: 15,
                lineHeight: 1.7,
                color: "rgba(0,0,0,0.72)",
              }}
            >
              {t.aiBody}
            </p>
          </section>

          {/* ── CLOSING ─────────────────────────────────────────── */}
          <section
            style={{
              marginTop: 56,
              maxWidth: 620,
              marginInline: "auto",
              textAlign: "center",
            }}
          >
            <h2
              style={{
                fontSize: "clamp(22px, 2.8vw, 26px)",
                fontWeight: 700,
                letterSpacing: "-0.02em",
                margin: 0,
                marginBottom: 12,
              }}
            >
              {t.closingHeading}
            </h2>
            <p
              style={{
                margin: 0,
                fontSize: 15,
                lineHeight: 1.7,
                color: "rgba(0,0,0,0.65)",
              }}
            >
              {t.closingBody}
            </p>
          </section>
        </div>
      </div>
    </Layout>
  );
}
