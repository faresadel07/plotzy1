// Plotzy pricing page. As of May 2026 Plotzy is free for everyone,
// forever. This page exists to make that commitment explicit, list
// what every writer gets at no cost, and offer a clean way for the
// people who can to support the running costs of the project. It is
// the most read marketing page on the site, so it is designed to
// feel like an Apple keynote slide: a lot of empty space, one big
// claim, one quiet call to action. No em-dashes, no emojis.

import { useEffect, useMemo, useState } from "react";
import { Heart, Check, Sparkles, BookOpen, GraduationCap, Library, Mic, FileDown, Users } from "lucide-react";
import { Link } from "wouter";
import { Layout } from "@/components/layout";
import { useLanguage } from "@/contexts/language-context";
import { useAuth } from "@/contexts/auth-context";
import { useToast } from "@/hooks/use-toast";
import { SEO } from "@/components/SEO";

const SF =
  '-apple-system, BlinkMacSystemFont, "SF Pro Display", "SF Pro Text", "Helvetica Neue", "Segoe UI", Arial, sans-serif';

const TEXT = {
  en: {
    hero: "Plotzy is free.",
    heroAccent: "Forever.",
    sub: "Every feature, for every writer. Always. No tiers, no paywalls, no upsell prompts. Just a tool we built so writers can write.",
    whatYouGet: "What you get",
    whatYouGetSub: "Everything we have ever built, included.",
    features: [
      { icon: BookOpen, title: "Unlimited writing", body: "Unlimited books, unlimited chapters, unlimited words. Save as often as you like." },
      { icon: Sparkles, title: "AI writing assistant", body: "A patient writing partner for plotting, character work, prose, and revision, in every chapter." },
      { icon: Library, title: "World classics library", body: "Tens of thousands of Arabic and English public-domain books, ready to read or download in any format." },
      { icon: GraduationCap, title: "The writing course", body: "Six modules, twenty-seven lessons, quizzes, a final project, and a verified certificate. Free." },
      { icon: Mic, title: "Audiobook narration", body: "Turn your finished chapters into a complete audiobook with a single click, in your preferred voice." },
      { icon: FileDown, title: "Professional exports", body: "PDF, EPUB, and Word, in the original language with the right typography for Arabic or English." },
      { icon: Users, title: "Community library", body: "Publish for the public, gather readers, gather feedback. No gatekeeping, no algorithm." },
    ],
    supportTitle: "Support the project",
    supportSub:
      "Plotzy is free and always will be. If it helped you write, and you can spare a little, it keeps the servers on for the next writer.",
    presetLabel: "Quick amount",
    customLabel: "Or any amount you like",
    placeholder: "Amount in USD",
    button: "Support with PayPal",
    buttonBusy: "Opening PayPal...",
    quietNote: "One time only, no subscription, no PayPal account required.",
    minNote: "Minimum 1 dollar.",
    faqHeading: "Common questions",
    faq: [
      {
        q: "Really, every feature is free?",
        a: "Yes. Writing, the AI assistant, exports, the library, the course, audiobooks. There is no paid plan and no plan we are saving for a paid tier later.",
      },
      {
        q: "Why are you not charging?",
        a: "Plotzy started as a tool for writers, not a business. Paywalls turn a writer's tool into a sales funnel, and that changes how the tool gets designed. Free keeps the tool honest.",
      },
      {
        q: "How is this paid for?",
        a: "Out of pocket today, and from the supporters who choose to chip in. If you can spare a little to keep the servers running, it is the only thing that helps.",
      },
      {
        q: "What do supporters get?",
        a: "Our thanks. There are no perks, no hidden features, no badge requirements. The whole point is that everyone gets the same Plotzy.",
      },
      {
        q: "Can I cancel a donation?",
        a: "There is nothing to cancel. Donations are one-time. PayPal handles the transaction and a receipt is sent to your email by them.",
      },
    ],
  },
  ar: {
    hero: "بلوتزي مجّاني.",
    heroAccent: "إلى الأبد.",
    sub: "كل ميزة، لكل كاتب، دائماً. لا فئات، لا جدار مدفوع، لا إعلانات ترقيه. مجرد أداه بنيناها كي يكتب الكتّاب.",
    whatYouGet: "كل ما ستحصل عليه",
    whatYouGetSub: "كل ما بنيناه حتى الآن، متاح لك.",
    features: [
      { icon: BookOpen, title: "كتابه بلا حدود", body: "كتب غير محدوده، فصول غير محدوده، كلمات غير محدوده. احفظ كما تشاء." },
      { icon: Sparkles, title: "مساعد كتابه ذكي", body: "شريك صبور لتطوير الحبكه والشخصيات وصقل النثر والمراجعه، داخل كل فصل." },
      { icon: Library, title: "مكتبه الكلاسيكيات العالميه", body: "عشرات الآلاف من الكتب العربيه والإنجليزيه ضمن الملك العام، جاهزه للقراءه والتنزيل بأي صيغه." },
      { icon: GraduationCap, title: "دوره كتابه الروايه", body: "ست وحدات، سبعه وعشرون درساً، اختبارات، مشروع نهائي، وشهاده موثّقه. كل هذا مجّاناً." },
      { icon: Mic, title: "تحويل الكتاب إلى صوت", body: "حوّل فصولك إلى كتاب صوتي كامل بضغطه واحده، بصوت تختاره أنت." },
      { icon: FileDown, title: "تصدير احترافي", body: "PDF و EPUB و Word، باللغه الأصليه وبتنسيق صحيح للعربيه أو الإنجليزيه." },
      { icon: Users, title: "المكتبه المجتمعيه", body: "انشر للقرّاء، اجمع جمهوراً، استقبل ملاحظات. بلا بوّابات، بلا خوارزميات." },
    ],
    supportTitle: "ادعم المشروع",
    supportSub:
      "بلوتزي مجاني وسيظل كذلك. إذا ساعدك أن تكتب وكنت تستطيع المساهمه بمبلغ ولو بسيط، فهذا ما يبقي السيرفر يعمل لكاتب آخر بعدك.",
    presetLabel: "مبلغ سريع",
    customLabel: "أو أي مبلغ تختاره",
    placeholder: "المبلغ بالدولار",
    button: "ادعم عبر PayPal",
    buttonBusy: "جارٍ فتح PayPal...",
    quietNote: "مرّه واحده فقط، بدون اشتراك، ولا تحتاج حساب PayPal.",
    minNote: "الحد الأدنى دولار واحد.",
    faqHeading: "أسئله شائعه",
    faq: [
      {
        q: "هل فعلاً كل ميزه مجّانيه؟",
        a: "نعم. الكتابه والمساعد الذكي والتصدير والمكتبه والدوره والكتاب الصوتي. لا توجد خطه مدفوعه، ولا ميزه نخبّئها لتصبح مدفوعه لاحقاً.",
      },
      {
        q: "لماذا لا تحاسبون على شيء؟",
        a: "بلوتزي بدأ كأداه للكتّاب لا كشركه. الجدران المدفوعه تحوّل أداه الكاتب إلى قمع مبيعات، وهذا يغيّر كيف تصمَّم الأداه. المجانيه تبقيها أمينه.",
      },
      {
        q: "كيف تتحمّلون التكلفه؟",
        a: "اليوم من جيبنا الخاص، ومن الداعمين الذين يختارون المساهمه. لو استطعت تخصيص مبلغ بسيط ليستمر السيرفر، فهذا الشيء الوحيد الذي يساعد فعلاً.",
      },
      {
        q: "ماذا يحصل عليه الداعمون؟",
        a: "شكرنا. لا توجد مزايا إضافيه ولا ميزات مخفيه ولا شارات إلزاميه. الفكره أن يحصل الجميع على نفس بلوتزي.",
      },
      {
        q: "هل يمكنني إلغاء التبرّع؟",
        a: "لا يوجد شيء لإلغائه. التبرّعات تتم لمرّه واحده. تتولّى PayPal العمليه ويصلك إيصال عبر بريدك الإلكتروني منها.",
      },
    ],
  },
};

export default function Pricing() {
  const { lang, isRTL } = useLanguage();
  const { user: _user } = useAuth();
  const { toast } = useToast();
  const t = useMemo(() => TEXT[lang === "ar" ? "ar" : "en"], [lang]);

  const [amount, setAmount] = useState<string>("10");
  const [busy, setBusy] = useState(false);

  // Pricing inherits the cancel-flow toast from PayPal's redirect, so
  // the user lands on the page with a soft, non-blaming notice instead
  // of nothing happening. Runs once on mount when ?donation=cancelled
  // is present, then strips the query so a refresh doesn't repeat it.
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
        title: lang === "ar" ? "مبلغ غير صالح" : "Invalid amount",
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

  const presets = ["5", "10", "25", "50"];

  return (
    <Layout>
      <SEO
        title={lang === "ar" ? "الأسعار, بلوتزي" : "Pricing, Plotzy"}
        description={
          lang === "ar"
            ? "بلوتزي مجاني للجميع إلى الأبد. ادعم المشروع إذا أردت."
            : "Plotzy is free for every writer, forever. Support the project if you like."
        }
      />
      <div
        dir={isRTL ? "rtl" : "ltr"}
        style={{
          minHeight: "100vh",
          background: "#000",
          color: "#fff",
          fontFamily: SF,
          paddingBottom: 120,
        }}
      >
        {/* HERO ───────────────────────────────────────────────── */}
        <section
          style={{
            padding: "120px 24px 96px",
            maxWidth: 980,
            margin: "0 auto",
            textAlign: "center",
          }}
        >
          <div
            style={{
              fontSize: 13,
              letterSpacing: "0.14em",
              textTransform: "uppercase",
              color: "rgba(255,255,255,0.4)",
              marginBottom: 28,
              fontWeight: 500,
            }}
          >
            {lang === "ar" ? "أسعار بلوتزي" : "Plotzy pricing"}
          </div>
          <h1
            style={{
              fontSize: "clamp(56px, 9vw, 112px)",
              fontWeight: 700,
              letterSpacing: "-0.04em",
              lineHeight: 0.98,
              margin: 0,
            }}
          >
            {t.hero}
            <span
              style={{
                display: "block",
                background: "linear-gradient(135deg, #9b8dfb 0%, #7c6af7 60%, #6e64f0 100%)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                backgroundClip: "text",
                color: "transparent",
              }}
            >
              {t.heroAccent}
            </span>
          </h1>
          <p
            style={{
              maxWidth: 620,
              margin: "36px auto 0",
              fontSize: 19,
              lineHeight: 1.55,
              color: "rgba(255,255,255,0.62)",
              fontWeight: 400,
            }}
          >
            {t.sub}
          </p>
        </section>

        {/* WHAT YOU GET ─────────────────────────────────────── */}
        <section
          style={{
            padding: "0 24px 120px",
            maxWidth: 1180,
            margin: "0 auto",
          }}
        >
          <div style={{ textAlign: "center", marginBottom: 56 }}>
            <h2
              style={{
                fontSize: "clamp(34px, 4.5vw, 52px)",
                fontWeight: 600,
                letterSpacing: "-0.025em",
                margin: 0,
              }}
            >
              {t.whatYouGet}
            </h2>
            <p
              style={{
                marginTop: 14,
                fontSize: 17,
                color: "rgba(255,255,255,0.5)",
                fontWeight: 400,
              }}
            >
              {t.whatYouGetSub}
            </p>
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
              gap: 16,
            }}
          >
            {t.features.map((f) => {
              const Icon = f.icon;
              return (
                <div
                  key={f.title}
                  style={{
                    background: "linear-gradient(180deg, rgba(255,255,255,0.04) 0%, rgba(255,255,255,0.015) 100%)",
                    border: "1px solid rgba(255,255,255,0.06)",
                    borderRadius: 20,
                    padding: "28px 26px",
                    transition: "background 200ms ease, border-color 200ms ease, transform 200ms ease",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = "rgba(255,255,255,0.12)";
                    e.currentTarget.style.transform = "translateY(-2px)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = "rgba(255,255,255,0.06)";
                    e.currentTarget.style.transform = "translateY(0)";
                  }}
                >
                  <div
                    style={{
                      width: 38,
                      height: 38,
                      borderRadius: 11,
                      background:
                        "linear-gradient(135deg, rgba(124,106,247,0.18) 0%, rgba(124,106,247,0.06) 100%)",
                      border: "1px solid rgba(124,106,247,0.25)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      marginBottom: 18,
                    }}
                  >
                    <Icon size={18} color="#b1a4ff" />
                  </div>
                  <h3
                    style={{
                      fontSize: 17,
                      fontWeight: 600,
                      letterSpacing: "-0.01em",
                      margin: 0,
                      marginBottom: 8,
                    }}
                  >
                    {f.title}
                  </h3>
                  <p
                    style={{
                      margin: 0,
                      fontSize: 14.5,
                      lineHeight: 1.65,
                      color: "rgba(255,255,255,0.55)",
                    }}
                  >
                    {f.body}
                  </p>
                </div>
              );
            })}
          </div>
        </section>

        {/* DONATION ─────────────────────────────────────────── */}
        <section
          style={{
            padding: "0 24px 120px",
            maxWidth: 720,
            margin: "0 auto",
          }}
        >
          <div
            style={{
              background:
                "linear-gradient(180deg, rgba(124,106,247,0.08) 0%, rgba(124,106,247,0.02) 100%)",
              border: "1px solid rgba(124,106,247,0.22)",
              borderRadius: 28,
              padding: "44px 36px 40px",
              boxShadow:
                "0 12px 60px rgba(124,106,247,0.10), inset 0 1px 0 rgba(255,255,255,0.05)",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 12, justifyContent: "center", marginBottom: 18 }}>
              <div
                style={{
                  width: 38,
                  height: 38,
                  borderRadius: 12,
                  background: "linear-gradient(135deg, #7c6af7 0%, #9b8dfb 100%)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Heart size={18} color="#fff" />
              </div>
            </div>
            <h2
              style={{
                fontSize: "clamp(28px, 3.5vw, 38px)",
                fontWeight: 600,
                letterSpacing: "-0.02em",
                textAlign: "center",
                margin: 0,
              }}
            >
              {t.supportTitle}
            </h2>
            <p
              style={{
                marginTop: 14,
                fontSize: 16,
                lineHeight: 1.65,
                color: "rgba(255,255,255,0.62)",
                textAlign: "center",
                maxWidth: 480,
                marginInline: "auto",
              }}
            >
              {t.supportSub}
            </p>

            <div
              style={{
                marginTop: 32,
                fontSize: 12,
                letterSpacing: "0.12em",
                textTransform: "uppercase",
                color: "rgba(255,255,255,0.4)",
                fontWeight: 500,
              }}
            >
              {t.presetLabel}
            </div>
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 10 }}>
              {presets.map((p) => {
                const selected = amount === p;
                return (
                  <button
                    key={p}
                    type="button"
                    onClick={() => setAmount(p)}
                    style={{
                      flex: 1,
                      minWidth: 64,
                      padding: "14px 0",
                      borderRadius: 14,
                      border: selected
                        ? "1px solid rgba(124,106,247,0.55)"
                        : "1px solid rgba(255,255,255,0.10)",
                      background: selected
                        ? "linear-gradient(180deg, rgba(124,106,247,0.18) 0%, rgba(124,106,247,0.08) 100%)"
                        : "rgba(255,255,255,0.03)",
                      color: "#fff",
                      fontFamily: "inherit",
                      fontSize: 16,
                      fontWeight: 600,
                      letterSpacing: "-0.01em",
                      cursor: "pointer",
                      transition: "background 120ms ease, border-color 120ms ease",
                    }}
                  >
                    ${p}
                  </button>
                );
              })}
            </div>

            <div
              style={{
                marginTop: 22,
                fontSize: 12,
                letterSpacing: "0.12em",
                textTransform: "uppercase",
                color: "rgba(255,255,255,0.4)",
                fontWeight: 500,
              }}
            >
              {t.customLabel}
            </div>
            <div style={{ position: "relative", marginTop: 10 }}>
              <span
                style={{
                  position: "absolute",
                  top: 0,
                  bottom: 0,
                  [isRTL ? "right" : "left"]: 18,
                  display: "flex",
                  alignItems: "center",
                  color: "rgba(255,255,255,0.5)",
                  fontSize: 17,
                  fontWeight: 500,
                  pointerEvents: "none",
                }}
              >
                $
              </span>
              <input
                type="number"
                inputMode="decimal"
                min={1}
                step="0.01"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder={t.placeholder}
                disabled={busy}
                style={{
                  width: "100%",
                  background: "rgba(255,255,255,0.04)",
                  border: "1px solid rgba(255,255,255,0.10)",
                  borderRadius: 14,
                  padding: isRTL ? "16px 38px 16px 18px" : "16px 18px 16px 38px",
                  color: "#fff",
                  fontSize: 17,
                  fontWeight: 500,
                  fontFamily: "inherit",
                  outline: "none",
                  transition: "border-color 120ms ease, background 120ms ease",
                }}
                onFocus={(e) => {
                  e.currentTarget.style.borderColor = "rgba(124,106,247,0.55)";
                  e.currentTarget.style.background = "rgba(255,255,255,0.07)";
                }}
                onBlur={(e) => {
                  e.currentTarget.style.borderColor = "rgba(255,255,255,0.10)";
                  e.currentTarget.style.background = "rgba(255,255,255,0.04)";
                }}
              />
            </div>

            <button
              type="button"
              onClick={donate}
              disabled={busy || !amount}
              style={{
                marginTop: 22,
                width: "100%",
                padding: "16px 22px",
                borderRadius: 14,
                background:
                  busy || !amount
                    ? "rgba(255,255,255,0.06)"
                    : "linear-gradient(135deg, #7c6af7 0%, #9b8dfb 100%)",
                color: busy || !amount ? "rgba(255,255,255,0.35)" : "#fff",
                border: "none",
                fontSize: 16.5,
                fontWeight: 600,
                letterSpacing: "-0.005em",
                fontFamily: "inherit",
                cursor: busy || !amount ? "not-allowed" : "pointer",
                boxShadow:
                  busy || !amount ? "none" : "0 10px 28px rgba(124,106,247,0.35)",
                transition: "transform 120ms ease, box-shadow 120ms ease",
              }}
              onMouseDown={(e) => {
                if (!busy && amount) e.currentTarget.style.transform = "scale(0.985)";
              }}
              onMouseUp={(e) => (e.currentTarget.style.transform = "scale(1)")}
              onMouseLeave={(e) => (e.currentTarget.style.transform = "scale(1)")}
            >
              {busy ? t.buttonBusy : t.button}
            </button>

            <p
              style={{
                marginTop: 18,
                fontSize: 12.5,
                color: "rgba(255,255,255,0.4)",
                textAlign: "center",
              }}
            >
              {t.quietNote}
            </p>
          </div>
        </section>

        {/* FAQ ────────────────────────────────────────────────── */}
        <section
          style={{
            padding: "0 24px 80px",
            maxWidth: 720,
            margin: "0 auto",
          }}
        >
          <h2
            style={{
              fontSize: "clamp(28px, 3.5vw, 36px)",
              fontWeight: 600,
              letterSpacing: "-0.02em",
              textAlign: "center",
              margin: 0,
              marginBottom: 36,
            }}
          >
            {t.faqHeading}
          </h2>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {t.faq.map((item) => (
              <details
                key={item.q}
                style={{
                  background: "rgba(255,255,255,0.025)",
                  border: "1px solid rgba(255,255,255,0.06)",
                  borderRadius: 16,
                  padding: "18px 22px",
                  cursor: "pointer",
                  transition: "border-color 200ms ease, background 200ms ease",
                }}
              >
                <summary
                  style={{
                    fontSize: 16,
                    fontWeight: 600,
                    letterSpacing: "-0.01em",
                    listStyle: "none",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                  }}
                >
                  <span>{item.q}</span>
                  <Check size={16} color="rgba(255,255,255,0.4)" />
                </summary>
                <p
                  style={{
                    margin: 0,
                    marginTop: 12,
                    fontSize: 14.5,
                    lineHeight: 1.7,
                    color: "rgba(255,255,255,0.58)",
                  }}
                >
                  {item.a}
                </p>
              </details>
            ))}
          </div>
        </section>

        {/* Quiet close ──────────────────────────────────────── */}
        <section
          style={{
            padding: "0 24px",
            maxWidth: 720,
            margin: "0 auto",
            textAlign: "center",
          }}
        >
          <p
            style={{
              fontSize: 14,
              color: "rgba(255,255,255,0.35)",
              margin: 0,
            }}
          >
            {lang === "ar"
              ? "إذا لم تكن جاهزاً للدعم، لا بأس. اكتب فقط."
              : "Not ready to support? That is fine. Just write."}
          </p>
          <Link
            href="/"
            style={{
              display: "inline-flex",
              marginTop: 22,
              padding: "12px 22px",
              borderRadius: 12,
              border: "1px solid rgba(255,255,255,0.12)",
              background: "rgba(255,255,255,0.03)",
              color: "#fff",
              fontFamily: "inherit",
              fontSize: 14.5,
              fontWeight: 500,
              textDecoration: "none",
              letterSpacing: "-0.005em",
              transition: "background 120ms ease, border-color 120ms ease",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = "rgba(255,255,255,0.07)";
              e.currentTarget.style.borderColor = "rgba(255,255,255,0.20)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "rgba(255,255,255,0.03)";
              e.currentTarget.style.borderColor = "rgba(255,255,255,0.12)";
            }}
          >
            {lang === "ar" ? "إلى صفحه البدايه" : "Back to home"}
          </Link>
        </section>
      </div>
    </Layout>
  );
}
