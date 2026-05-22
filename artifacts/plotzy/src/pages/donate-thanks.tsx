// Landing page PayPal redirects the donor to after the order is
// approved. Captures the order on the server, then shows a quiet
// thank-you. Lives at /donate/thanks. Public route; donations do
// not require an account.

import { useEffect, useState } from "react";
import { Link } from "wouter";
import { Heart, ArrowRight, Loader2 } from "lucide-react";
import { Layout } from "@/components/layout";
import { useLanguage } from "@/contexts/language-context";
import { SEO } from "@/components/SEO";

const SF =
  '-apple-system, BlinkMacSystemFont, "SF Pro Display", "SF Pro Text", "Helvetica Neue", "Segoe UI", Arial, sans-serif';

type State =
  | { kind: "loading" }
  | { kind: "success"; amount: string; currency: string }
  | { kind: "error"; message: string };

export default function DonateThanks() {
  const { lang, isRTL } = useLanguage();
  const ar = lang === "ar";
  const [state, setState] = useState<State>({ kind: "loading" });

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    // PayPal passes the orderId back as either `token` or `orderId`
    // depending on which flow returned it; check both.
    const orderId = params.get("token") || params.get("orderId");

    // The SDK button flow passes the captured amount in the URL so we
    // can skip the (already-completed) capture call here. Without
    // this, calling capture again returns alreadyProcessed=true with
    // no amount and the success screen renders blank.
    const presetAmount = params.get("amount");
    const presetCurrency = params.get("currency");
    if (orderId && presetAmount) {
      setState({
        kind: "success",
        amount: presetAmount,
        currency: presetCurrency || "USD",
      });
      return;
    }

    if (!orderId) {
      setState({
        kind: "error",
        message: ar
          ? "تعذّر التحقّق من التبرّع. لم يصلنا معرّف العمليه من PayPal."
          : "We could not verify the donation. PayPal did not send a token back.",
      });
      return;
    }
    (async () => {
      try {
        const res = await fetch("/api/paypal/capture-donation", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ orderId }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok || !data?.success) {
          throw new Error(data?.message || "Capture failed");
        }
        setState({
          kind: "success",
          amount: String(data.amount ?? ""),
          currency: String(data.currency ?? "USD"),
        });
      } catch (err) {
        setState({
          kind: "error",
          message: err instanceof Error ? err.message : "Capture failed",
        });
      }
    })();
  }, [ar]);

  return (
    <Layout>
      <SEO
        title={ar ? "شكراً, بلوتزي" : "Thank you, Plotzy"}
        description={ar ? "صفحه شكر بعد التبرّع" : "Thank-you page after a donation"}
      />
      <div
        dir={isRTL ? "rtl" : "ltr"}
        style={{
          minHeight: "100vh",
          background: "#000",
          color: "#fff",
          fontFamily: SF,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "60px 24px",
        }}
      >
        <div style={{ maxWidth: 520, width: "100%", textAlign: "center" }}>
          <div
            style={{
              width: 64,
              height: 64,
              borderRadius: 18,
              background: "linear-gradient(135deg, #7c6af7 0%, #9b8dfb 100%)",
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              boxShadow: "0 14px 40px rgba(124,106,247,0.45)",
              marginBottom: 28,
            }}
          >
            {state.kind === "loading" ? (
              <Loader2 size={28} color="#fff" className="animate-spin" />
            ) : (
              <Heart size={28} color="#fff" />
            )}
          </div>

          {state.kind === "loading" && (
            <>
              <h1
                style={{
                  fontSize: 32,
                  fontWeight: 600,
                  letterSpacing: "-0.02em",
                  margin: 0,
                  marginBottom: 10,
                }}
              >
                {ar ? "نتحقّق من تبرّعك..." : "Finalising your donation..."}
              </h1>
              <p style={{ color: "rgba(255,255,255,0.55)", fontSize: 15.5, margin: 0 }}>
                {ar
                  ? "أمهلنا لحظه واحده."
                  : "One moment, this only takes a second."}
              </p>
            </>
          )}

          {state.kind === "success" && (
            <>
              <h1
                style={{
                  fontSize: "clamp(36px, 5vw, 48px)",
                  fontWeight: 700,
                  letterSpacing: "-0.025em",
                  margin: 0,
                  marginBottom: 18,
                }}
              >
                {ar ? "شكراً." : "Thank you."}
              </h1>
              <p
                style={{
                  color: "rgba(255,255,255,0.7)",
                  fontSize: 17,
                  lineHeight: 1.6,
                  margin: 0,
                  marginBottom: 8,
                }}
              >
                {ar
                  ? `وصلت مساهمتك ${state.currency} ${state.amount} وستذهب مباشره لتغطيه تكلفه السيرفر.`
                  : `Your ${state.currency} ${state.amount} arrived safely and goes straight to keeping the servers on.`}
              </p>
              <p
                style={{
                  color: "rgba(255,255,255,0.45)",
                  fontSize: 14,
                  margin: 0,
                  marginTop: 8,
                }}
              >
                {ar
                  ? "أرسلت PayPal إيصالك على بريدك الإلكتروني."
                  : "PayPal has emailed your receipt."}
              </p>
              <div
                style={{
                  display: "flex",
                  gap: 12,
                  justifyContent: "center",
                  marginTop: 36,
                  flexWrap: "wrap",
                }}
              >
                <Link
                  href="/"
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 8,
                    padding: "12px 22px",
                    borderRadius: 12,
                    background: "#fff",
                    color: "#000",
                    fontFamily: "inherit",
                    fontSize: 14.5,
                    fontWeight: 600,
                    textDecoration: "none",
                    letterSpacing: "-0.005em",
                  }}
                >
                  {ar ? "ابدأ الكتابه" : "Start writing"}
                  <ArrowRight size={16} />
                </Link>
                <Link
                  href="/pricing"
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
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
                  }}
                >
                  {ar ? "عودة إلى صفحه الأسعار" : "Back to pricing"}
                </Link>
              </div>
            </>
          )}

          {state.kind === "error" && (
            <>
              <h1
                style={{
                  fontSize: 30,
                  fontWeight: 600,
                  letterSpacing: "-0.02em",
                  margin: 0,
                  marginBottom: 12,
                }}
              >
                {ar ? "لم يكتمل التبرّع" : "Donation did not complete"}
              </h1>
              <p
                style={{
                  color: "rgba(255,255,255,0.6)",
                  fontSize: 15,
                  lineHeight: 1.6,
                  margin: 0,
                  marginBottom: 22,
                }}
              >
                {ar
                  ? "إذا تمّ خصم المبلغ من حسابك, راسلنا في الدعم ونردّه إليك مباشره. التفاصيل: "
                  : "If your account was charged, contact support and we will refund it right away. Details: "}
                <span style={{ color: "rgba(255,255,255,0.4)" }}>{state.message}</span>
              </p>
              <Link
                href="/pricing"
                style={{
                  display: "inline-flex",
                  padding: "12px 22px",
                  borderRadius: 12,
                  border: "1px solid rgba(255,255,255,0.12)",
                  background: "rgba(255,255,255,0.03)",
                  color: "#fff",
                  fontFamily: "inherit",
                  fontSize: 14.5,
                  fontWeight: 500,
                  textDecoration: "none",
                }}
              >
                {ar ? "عودة إلى صفحه الأسعار" : "Back to pricing"}
              </Link>
            </>
          )}
        </div>
      </div>
    </Layout>
  );
}
