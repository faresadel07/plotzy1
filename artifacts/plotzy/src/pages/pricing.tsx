// Plotzy pricing page. Plotzy is free for every writer, forever.
// The page is built around a single donation card so the people who
// already want to support the project do not have to scroll. The
// donor picks an amount (preset tiles or a custom value) and then
// chooses how to pay: PayPal, debit/credit card, or Apple Pay on
// devices that support it. All three buttons land on the same
// server endpoints, so a card or Apple Pay supporter still produces
// the same PayPal order on the backend and the same thank-you flow.
//
// Visual: pure black background end-to-end, white text, white card
// rim. No em-dashes, no emojis. Bilingual.

import { useEffect, useMemo, useState } from "react";
import { Layout } from "@/components/layout";
import { useLanguage } from "@/contexts/language-context";
import { useToast } from "@/hooks/use-toast";
import { SEO } from "@/components/SEO";
import { PayPalScriptProvider, PayPalButtons } from "@paypal/react-paypal-js";

const SF =
  '-apple-system, BlinkMacSystemFont, "SF Pro Display", "SF Pro Text", "Helvetica Neue", "Segoe UI", Arial, sans-serif';

const TEXT = {
  en: {
    pageTitle: "Pricing, Plotzy",
    pageDescription:
      "Plotzy is free for every writer. Support the project if you would like to.",
    title: "Support Plotzy",
    presets: ["5", "10", "25", "50", "100", "250"],
    currency: "USD",
    amountAria: "Enter a custom amount in US dollars",
    placeholder: "Amount",
    invalid: "Invalid amount",
    minNote: "The minimum donation is one dollar.",
    methodLabel: "Choose how to pay",
    sandboxNote: "PayPal sandbox mode is active. No real money will move.",
    payPalUnavailable:
      "PayPal is not configured on this server right now, the donation buttons cannot load. We will fix this shortly.",
    safeNote:
      "Processed by PayPal. A receipt is emailed to you by PayPal. We do not store your card.",

    introHeading: "Everything Plotzy offers is free",
    introBody:
      "Every Plotzy feature is available to every writer at no cost. There is no paid plan, no trial, and no feature we are saving for a paid tier later. If we build it, it ships free.",

    listHeading: "Included for everyone",
    list: [
      { title: "Unlimited writing", body: "Unlimited books, unlimited chapters, unlimited words. Save as often as you like, in Arabic or English." },
      { title: "AI writing assistant", body: "A patient companion for plotting, character work, dialogue, and revision, available inside every chapter." },
      { title: "Public-domain library", body: "Tens of thousands of Arabic and English public-domain books, ready to read inside Plotzy or download as PDF." },
      { title: "The writing course", body: "Six modules, twenty-seven lessons, six quizzes, a final project, and a verified certificate. Free." },
      { title: "Audiobook narration", body: "Turn your finished chapters into a full audiobook in a single click, in your preferred voice." },
      { title: "Professional exports", body: "Download your book as a PDF, EPUB, or Word file. Arabic books export with the right typography by default." },
      { title: "Community library", body: "Publish for the public, gather readers, gather feedback. No gatekeeping, no algorithm pushing you down." },
    ],

    aiHeading: "About the AI we use",
    aiBody:
      "The writing assistant, the marketplace tools, the audiobook narration, and the AI cover generator all sit on top of paid third-party services. We pay those bills ourselves so you do not have to. On most days the AI works for everyone. If a service hits a daily limit, or if the cost ever grows past what we can cover from our own pocket, the AI features may pause until we recover. The writing tool itself, the editor, the chapter manager, the exports, the library, the course, never stops. It is not built on a paid service and it does not need one.",

    closingHeading: "If it helped you, and you can spare a little",
    closingBody:
      "Every dollar contributed goes to keeping the servers on and paying the AI bill. That is it. There are no perks, no badges, no tiers. The same Plotzy stays free for the next writer who finds it.",

    toastCancelTitle: "Donation cancelled",
    toastCancelBody: "Nothing was charged. You can try again any time.",
    toastErrTitle: "Payment failed",
    toastSuccessTitle: "Thank you",
    toastSuccessBody: "Your donation was received.",
  },
  ar: {
    pageTitle: "الأسعار, بلوتزي",
    pageDescription: "بلوتزي مجاني لكل كاتب. ادعم المشروع إذا أردت.",
    title: "ادعم بلوتزي",
    presets: ["5", "10", "25", "50", "100", "250"],
    currency: "USD",
    amountAria: "اكتب مبلغاً مخصّصاً بالدولار الأمريكي",
    placeholder: "المبلغ",
    invalid: "مبلغ غير صالح",
    minNote: "الحد الأدنى للتبرّع دولار واحد.",
    methodLabel: "اختار طريقه الدفع",
    sandboxNote: "وضع تجريبي لـ PayPal مفعّل، لن يتم خصم أي مبلغ حقيقي.",
    payPalUnavailable:
      "إعدادات PayPal غير مكتمله على السيرفر, أزرار التبرّع لا تستطيع التحميل الآن. سنُصلح هذا قريباً.",
    safeNote:
      "الدفع يتم عبر PayPal، وتصلك من PayPal فاتوره على بريدك الإلكتروني. لا نحفظ أي بيانات بطاقه.",

    introHeading: "كل ما يقدّمه بلوتزي مجّاني",
    introBody:
      "كل ميزه في بلوتزي متاحه لكل كاتب دون أي مقابل. لا توجد خطه مدفوعه، ولا فتره تجريبيه، ولا ميزه نحتفظ بها لخطه مدفوعه لاحقاً. ما نبنيه نُطلقه مجّاناً.",

    listHeading: "متاح للجميع",
    list: [
      { title: "كتابه بلا حدود", body: "كتب غير محدوده، فصول غير محدوده، كلمات غير محدوده. احفظ كلما شئت، بالعربيه أو الإنجليزيه." },
      { title: "مساعد كتابه ذكي", body: "رفيق صبور لتطوير الحبكه والشخصيات والحوار والمراجعه، متاح داخل كل فصل." },
      { title: "مكتبه الملك العام", body: "عشرات الآلاف من الكتب العربيه والإنجليزيه ضمن الملك العام، جاهزه للقراءه داخل بلوتزي أو للتنزيل بصيغه PDF." },
      { title: "دوره كتابه الروايه", body: "ست وحدات، سبعه وعشرون درساً، ستّه اختبارات، مشروع نهائي، وشهاده موثّقه. كل هذا مجّاناً." },
      { title: "تحويل الكتاب إلى صوت", body: "حوّل فصولك إلى كتاب صوتي كامل بضغطه واحده، بصوت تختاره أنت." },
      { title: "تصدير احترافي", body: "نزّل كتابك بصيغه PDF أو EPUB أو Word. الكتب العربيه تخرج بتنسيق صحيح للحرف العربي تلقائياً." },
      { title: "المكتبه المجتمعيه", body: "انشر للقرّاء، اجمع جمهوراً، استقبل ملاحظات. بلا بوّابات، ولا خوارزميات تُخفي عملك." },
    ],

    aiHeading: "حول الذكاء الاصطناعي الذي نستخدمه",
    aiBody:
      "مساعد الكتابه، وأدوات السوق، وتحويل الفصول إلى صوت، ومولّد الغلاف، جميعها تعتمد على خدمات ذكاء اصطناعي مدفوعه من طرف ثالث. نحن نتحمّل تلك الفواتير حتى لا تتحمّلها أنت. في معظم الأيام يعمل الذكاء الاصطناعي للجميع. إذا بلغت إحدى الخدمات حصّتها اليوميه، أو لو تخطّت التكلفه في يومٍ ما ما نقدر على تحمّله من جيبنا، فقد تتوقّف ميزات الذكاء الاصطناعي لفتره قصيره. أمّا أداه الكتابه نفسها، أي المحرّر ومدير الفصول والتصدير والمكتبه والدوره، فلا تتوقّف. هي ليست مبنيه على خدمه مدفوعه ولا تحتاج إليها.",

    closingHeading: "إذا ساعدك بلوتزي وكنت تستطيع المساهمه",
    closingBody:
      "كل دولار يصلنا يذهب لتغطيه تكلفه السيرفر وفاتوره الذكاء الاصطناعي. هذا كل ما في الأمر. لا توجد مزايا، ولا شارات، ولا فئات. بلوتزي نفسه يبقى مجّانياً للكاتب القادم.",

    toastCancelTitle: "ألغيت العمليه",
    toastCancelBody: "لم نخصم أي شيء. يمكنك المحاوله مجدّداً في أي وقت.",
    toastErrTitle: "تعذّر إتمام الدفع",
    toastSuccessTitle: "شكراً لك",
    toastSuccessBody: "وصل تبرّعك بأمان.",
  },
};

interface PayPalConfig {
  enabled: boolean;
  clientId?: string;
  sandbox?: boolean;
}

export default function Pricing() {
  const { lang, isRTL } = useLanguage();
  const { toast } = useToast();
  const t = useMemo(() => TEXT[lang === "ar" ? "ar" : "en"], [lang]);

  const [amount, setAmount] = useState<string>("25");
  const [config, setConfig] = useState<PayPalConfig | null>(null);

  // Load the PayPal client ID once. If PayPal is not configured on
  // the server (no PAYPAL_CLIENT_ID env var), we still render the
  // card UI but show a friendly note instead of the buttons.
  useEffect(() => {
    let cancelled = false;
    fetch("/api/paypal/config")
      .then((r) => r.json())
      .then((c) => {
        if (!cancelled) setConfig(c as PayPalConfig);
      })
      .catch(() => {
        if (!cancelled) setConfig({ enabled: false });
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // PayPal cancel flow used to redirect back to /pricing with
  // ?donation=cancelled. The SDK button flow stays on-page, but
  // older redirect-flow links may still hit us. Keep the toast.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("donation") === "cancelled") {
      toast({
        title: t.toastCancelTitle,
        description: t.toastCancelBody,
      });
      const url = new URL(window.location.href);
      url.searchParams.delete("donation");
      window.history.replaceState({}, "", url.toString());
    }
  }, [toast, t]);

  return (
    <Layout>
      <SEO title={t.pageTitle} description={t.pageDescription} />

      <div
        dir={isRTL ? "rtl" : "ltr"}
        style={{
          minHeight: "100vh",
          background: "#000",
          color: "#fff",
          fontFamily: SF,
          padding: "72px 24px 120px",
        }}
      >
        <div style={{ maxWidth: 720, margin: "0 auto" }}>
          {/* ── DONATION CARD ───────────────────────────────────── */}
          <section
            aria-labelledby="donate-heading"
            style={{
              border: "1px solid rgba(255,255,255,0.12)",
              borderRadius: 18,
              padding: "36px clamp(20px, 4vw, 44px) 32px",
              background: "#0a0a0a",
              boxShadow:
                "0 1px 0 rgba(255,255,255,0.02), 0 24px 60px rgba(0,0,0,0.45)",
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
                color: "#fff",
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
                      border: selected
                        ? "1.5px solid #fff"
                        : "1px solid rgba(255,255,255,0.18)",
                      background: selected ? "#fff" : "transparent",
                      color: selected ? "#000" : "#fff",
                      fontFamily: "inherit",
                      fontSize: 16,
                      fontWeight: 600,
                      letterSpacing: "-0.005em",
                      cursor: "pointer",
                      transition:
                        "background 120ms ease, border-color 120ms ease, color 120ms ease",
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
                  color: "rgba(255,255,255,0.55)",
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
                  color: "rgba(255,255,255,0.45)",
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
                style={{
                  width: "100%",
                  background: "rgba(255,255,255,0.04)",
                  border: "1px solid rgba(255,255,255,0.14)",
                  borderRadius: 12,
                  padding: isRTL ? "16px 38px 16px 64px" : "16px 64px 16px 38px",
                  color: "#fff",
                  fontSize: 22,
                  fontWeight: 700,
                  letterSpacing: "-0.01em",
                  fontFamily: "inherit",
                  outline: "none",
                  transition: "border-color 120ms ease, box-shadow 120ms ease",
                }}
                onFocus={(e) => {
                  e.currentTarget.style.borderColor = "#fff";
                  e.currentTarget.style.boxShadow =
                    "0 0 0 3px rgba(255,255,255,0.10)";
                }}
                onBlur={(e) => {
                  e.currentTarget.style.borderColor = "rgba(255,255,255,0.14)";
                  e.currentTarget.style.boxShadow = "none";
                }}
              />
            </div>

            {/* Sandbox banner (only renders when PAYPAL_SANDBOX=true on the
                server). Real production deployments will never see it. */}
            {config?.sandbox && (
              <div
                style={{
                  marginTop: 14,
                  padding: "8px 12px",
                  borderRadius: 10,
                  background: "rgba(250,204,21,0.10)",
                  border: "1px solid rgba(250,204,21,0.30)",
                  color: "#fde68a",
                  fontSize: 12,
                  textAlign: "center",
                  letterSpacing: "0.02em",
                }}
              >
                {t.sandboxNote}
              </div>
            )}

            {/* ── PAYMENT METHOD BUTTONS ────────────────────── */}
            <div
              style={{
                marginTop: 22,
                fontSize: 12,
                letterSpacing: "0.12em",
                textTransform: "uppercase",
                color: "rgba(255,255,255,0.50)",
                fontWeight: 600,
              }}
            >
              {t.methodLabel}
            </div>

            {config === null ? (
              <ButtonsSkeleton />
            ) : !config.enabled || !config.clientId ? (
              <p
                style={{
                  marginTop: 14,
                  fontSize: 13,
                  lineHeight: 1.6,
                  color: "rgba(255,255,255,0.55)",
                  padding: "12px 14px",
                  borderRadius: 10,
                  background: "rgba(239,68,68,0.08)",
                  border: "1px solid rgba(239,68,68,0.22)",
                }}
              >
                {t.payPalUnavailable}
              </p>
            ) : (
              <DonationButtons
                clientId={config.clientId}
                amount={amount}
                ar={lang === "ar"}
                onCancel={() =>
                  toast({
                    title: t.toastCancelTitle,
                    description: t.toastCancelBody,
                  })
                }
                onError={(message) =>
                  toast({
                    title: t.toastErrTitle,
                    description: message,
                    variant: "destructive",
                  })
                }
                onInvalid={() =>
                  toast({
                    title: t.invalid,
                    description: t.minNote,
                    variant: "destructive",
                  })
                }
              />
            )}

            <p
              style={{
                marginTop: 14,
                fontSize: 12.5,
                color: "rgba(255,255,255,0.50)",
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
                color: "#fff",
              }}
            >
              {t.introHeading}
            </h2>
            <p
              style={{
                margin: 0,
                fontSize: 16.5,
                lineHeight: 1.7,
                color: "rgba(255,255,255,0.72)",
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
                color: "rgba(255,255,255,0.55)",
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
                    borderTop: "1px solid rgba(255,255,255,0.10)",
                  }}
                >
                  <div
                    style={{
                      fontSize: 16,
                      fontWeight: 600,
                      letterSpacing: "-0.01em",
                      marginBottom: 4,
                      color: "#fff",
                    }}
                  >
                    {item.title}
                  </div>
                  <div
                    style={{
                      fontSize: 14.5,
                      lineHeight: 1.65,
                      color: "rgba(255,255,255,0.68)",
                    }}
                  >
                    {item.body}
                  </div>
                </li>
              ))}
              <li style={{ borderTop: "1px solid rgba(255,255,255,0.10)" }} />
            </ul>
          </section>

          {/* ── HONEST AI NOTE ──────────────────────────────────── */}
          <section
            style={{
              marginTop: 56,
              maxWidth: 620,
              marginInline: "auto",
              background: "#0d0d0d",
              border: "1px solid rgba(255,255,255,0.10)",
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
                color: "#fff",
              }}
            >
              {t.aiHeading}
            </h2>
            <p
              style={{
                margin: 0,
                fontSize: 15,
                lineHeight: 1.7,
                color: "rgba(255,255,255,0.72)",
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
                color: "#fff",
              }}
            >
              {t.closingHeading}
            </h2>
            <p
              style={{
                margin: 0,
                fontSize: 15,
                lineHeight: 1.7,
                color: "rgba(255,255,255,0.65)",
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

// ── PayPal Smart Buttons (PayPal, Card, Apple Pay) ─────────────────
//
// All three buttons hit the same /api/paypal/create-donation endpoint
// and the same /api/paypal/capture-donation endpoint. Apple Pay
// renders only when the SDK detects an Apple device with a
// provisioned card; we hide its wrapper if the SDK chooses not to
// render. The "key" prop on the provider forces a remount whenever
// the amount changes, because the SDK reads createOrder once and
// would otherwise reuse a stale amount.
function DonationButtons({
  clientId,
  amount,
  ar,
  onCancel,
  onError,
  onInvalid,
}: {
  clientId: string;
  amount: string;
  ar: boolean;
  onCancel: () => void;
  onError: (message: string) => void;
  onInvalid: () => void;
}) {
  // The SDK reads createOrder once when the buttons mount and caches
  // it. Force a remount whenever the amount changes so the new value
  // actually flows through. Cheaper than juggling a ref.
  return (
    <PayPalScriptProvider
      key={`donate-${amount}`}
      options={{
        clientId,
        currency: "USD",
        intent: "capture",
        components: "buttons,applepay",
      }}
    >
      <div
        style={{
          marginTop: 12,
          display: "grid",
          gridTemplateColumns: "1fr",
          gap: 10,
        }}
      >
        {/* PayPal button (gold, the most recognisable) */}
        <PayPalButtons
          fundingSource="paypal"
          style={{
            layout: "vertical",
            shape: "rect",
            color: "gold",
            label: "paypal",
            height: 48,
          }}
          createOrder={() =>
            createDonationOrder({ amount, onError, onInvalid })
          }
          onApprove={(data) =>
            captureDonationOrder({ orderID: data.orderID, onError })
          }
          onCancel={onCancel}
          onError={(err) => onError(extractMessage(err))}
        />

        {/* Card button (white on black, sits beneath the PayPal one) */}
        <PayPalButtons
          fundingSource="card"
          style={{
            layout: "vertical",
            shape: "rect",
            color: "white",
            label: "pay",
            height: 48,
          }}
          createOrder={() =>
            createDonationOrder({ amount, onError, onInvalid })
          }
          onApprove={(data) =>
            captureDonationOrder({ orderID: data.orderID, onError })
          }
          onCancel={onCancel}
          onError={(err) => onError(extractMessage(err))}
        />

        {/* Apple Pay button (the SDK chooses to render only when the
            visitor is on an Apple device with a provisioned card). */}
        <PayPalButtons
          fundingSource="applepay"
          style={{
            layout: "vertical",
            shape: "rect",
            color: "black",
            label: "checkout",
            height: 48,
          }}
          createOrder={() =>
            createDonationOrder({ amount, onError, onInvalid })
          }
          onApprove={(data) =>
            captureDonationOrder({ orderID: data.orderID, onError })
          }
          onCancel={onCancel}
          onError={(err) => onError(extractMessage(err))}
        />
      </div>
      <p
        style={{
          marginTop: 8,
          fontSize: 11.5,
          color: "rgba(255,255,255,0.40)",
          textAlign: "center",
          letterSpacing: "0.02em",
        }}
      >
        {ar
          ? "Apple Pay يظهر تلقائياً على أجهزه Apple فقط."
          : "Apple Pay appears only on Apple devices."}
      </p>
    </PayPalScriptProvider>
  );
}

async function createDonationOrder({
  amount,
  onError,
  onInvalid,
}: {
  amount: string;
  onError: (message: string) => void;
  onInvalid: () => void;
}): Promise<string> {
  const value = parseFloat(amount);
  if (!Number.isFinite(value) || value < 1) {
    onInvalid();
    throw new Error("Invalid amount");
  }
  const res = await fetch("/api/paypal/create-donation", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ amount: value.toFixed(2) }),
    credentials: "include",
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data?.orderId) {
    const msg = data?.message || "Failed to start donation";
    onError(msg);
    throw new Error(msg);
  }
  return data.orderId as string;
}

async function captureDonationOrder({
  orderID,
  onError,
}: {
  orderID: string;
  onError: (message: string) => void;
}): Promise<void> {
  const res = await fetch("/api/paypal/capture-donation", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ orderId: orderID }),
    credentials: "include",
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data?.success) {
    const msg = data?.message || "Could not confirm the donation";
    onError(msg);
    throw new Error(msg);
  }
  // Route to the in-app thank-you screen so the supporter sees the
  // captured amount in the same UI language they were already in.
  // We pass the captured amount through the URL so the thank-you page
  // does not have to call capture again (capture is idempotent on the
  // backend, but a second call returns alreadyProcessed without the
  // amount, which would render an empty amount on the success screen).
  const amount = encodeURIComponent(String(data.amount ?? ""));
  const currency = encodeURIComponent(String(data.currency ?? "USD"));
  window.location.href =
    `/donate/thanks?token=${encodeURIComponent(orderID)}&amount=${amount}&currency=${currency}`;
}

function extractMessage(err: unknown): string {
  if (err instanceof Error) return err.message;
  if (typeof err === "string") return err;
  return "Payment failed";
}

function ButtonsSkeleton() {
  return (
    <div style={{ marginTop: 12, display: "flex", flexDirection: "column", gap: 10 }}>
      {[0, 1].map((i) => (
        <div
          key={i}
          aria-hidden
          style={{
            height: 48,
            borderRadius: 8,
            background:
              "linear-gradient(90deg, rgba(255,255,255,0.05) 0%, rgba(255,255,255,0.10) 50%, rgba(255,255,255,0.05) 100%)",
            backgroundSize: "200% 100%",
            animation: "plotzy-shimmer 1.6s linear infinite",
          }}
        />
      ))}
      <style>{`
        @keyframes plotzy-shimmer {
          0% { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }
      `}</style>
    </div>
  );
}
