import { useState, useRef, useEffect } from "react";
import { Link } from "wouter";
import { useAuth } from "@/contexts/auth-context";
import { useToast } from "@/hooks/use-toast";
import { Layout } from "@/components/layout";
import { SEO } from "@/components/SEO";
import { NiceSelect } from "@/components/ui/nice-select";
import { useLanguage } from "@/contexts/language-context";
import type { TranslationKey } from "@/lib/i18n";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AuthModal } from "@/components/auth-modal";
import {
  ChevronDown, Send, CheckCircle2, Clock,
  MessageSquare, FileText, Sparkles,
  Lock, Circle, ArrowRight,
} from "lucide-react";

const SF = "-apple-system, BlinkMacSystemFont, 'SF Pro Text', 'Helvetica Neue', sans-serif";

/* ─── FAQ source-of-truth note ─────────────────────────────────
 * The 26 question/answer pairs that previously lived here contained
 * nine provably-false claims (Stripe as processor, 85/15 marketplace
 * split, 7-day refund guarantee, self-service Delete Account UI,
 * student/non-profit discount programs, SOC 2 backup intervals, and
 * others). They were removed in feat/faq-page.
 *
 * The single source of truth for FAQ content is now
 * src/data/faq-data.ts, rendered at /faq. The Support page keeps
 * its contact form, ticket history, and system status and points
 * product-question traffic to the FAQ via the banner below.
 * ─── */
const SYSTEM_COMPONENTS: { nameKey: TranslationKey; status: string }[] = [
  { nameKey: "spSysEditor",      status: "operational" },
  { nameKey: "spSysAI",          status: "operational" },
  { nameKey: "spSysExports",     status: "operational" },
  { nameKey: "spSysMarketplace", status: "operational" },
  { nameKey: "spSysLibrary",     status: "operational" },
  { nameKey: "spSysAuth",        status: "operational" },
];

const CONTACT_CATEGORIES: { value: string; labelKey: TranslationKey }[] = [
  { value: "general",  labelKey: "spCatGeneral" },
  { value: "bug",      labelKey: "spCatBug" },
  { value: "billing",  labelKey: "spCatBilling" },
  { value: "account",  labelKey: "spCatAccount" },
  { value: "feature",  labelKey: "spCatFeature" },
  { value: "privacy",  labelKey: "spCatPrivacy" },
  { value: "other",    labelKey: "spCatOther" },
];

const CONTACT_PRIORITIES: { value: string; labelKey: TranslationKey; descKey: TranslationKey; time: string }[] = [
  { value: "low",    labelKey: "spPrioLow",    descKey: "spPrioLowDesc",    time: "< 48h" },
  { value: "normal", labelKey: "spPrioNormal", descKey: "spPrioNormalDesc", time: "< 24h" },
  { value: "high",   labelKey: "spPrioHigh",   descKey: "spPrioHighDesc",   time: "< 8h"  },
  { value: "urgent", labelKey: "spPrioUrgent", descKey: "spPrioUrgentDesc", time: "< 2h"  },
];

/* ─── Sub-components ─── */

type Tab = "contact" | "tickets";

const TABS: { id: Tab; labelKey: TranslationKey; icon: typeof MessageSquare }[] = [
  { id: "contact", labelKey: "spTabContact", icon: MessageSquare },
  { id: "tickets", labelKey: "spTabTickets", icon: FileText },
];

const PRIORITY_COLORS: Record<string, string> = {
  low: "#6b7280",
  normal: "#3b82f6",
  high: "#f59e0b",
  urgent: "#ef4444",
};

const STATUS_COLORS: Record<string, string> = {
  open: "#4ade80",
  closed: "#6b7280",
  pending: "#f59e0b",
  replied: "#60a5fa",
};

interface ThreadReply {
  id: number;
  ticketId: number;
  senderType: "admin" | "user";
  senderName: string | null;
  body: string;
  createdAt: string | null;
}

function UserTicketCard({ ticket }: { ticket: any }) {
  const [expanded, setExpanded] = useState(false);
  const [replyBody, setReplyBody] = useState("");
  const qc = useQueryClient();
  const { toast } = useToast();
  const { t } = useLanguage();

  const thread = useQuery<{ ticket: any; replies: ThreadReply[] }>({
    queryKey: [`/api/support/tickets/${ticket.id}/thread`],
    queryFn: () => fetch(`/api/support/tickets/${ticket.id}/thread`, { credentials: "include" }).then(r => r.json()),
    enabled: expanded,
    staleTime: 5_000,
  });

  const send = useMutation({
    mutationFn: async (text: string) => {
      const res = await fetch(`/api/support/tickets/${ticket.id}/reply`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body: text }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.message || t("spFailedReply"));
      }
      return res.json();
    },
    onSuccess: () => {
      setReplyBody("");
      toast({ title: t("spReplySent"), description: t("spReplySentBody") });
      qc.invalidateQueries({ queryKey: [`/api/support/tickets/${ticket.id}/thread`] });
      qc.invalidateQueries({ queryKey: ["my-tickets"] });
    },
    onError: (err: Error) => toast({ title: t("spReplyFailed"), description: err.message, variant: "destructive" }),
  });

  const isClosed = ticket.status === "closed";

  return (
    <div style={{
      background: "#fffdf7", border: "1px solid rgba(66,53,33,0.1)",
      borderRadius: 10, padding: "16px 20px",
    }}>
      <div
        style={{ cursor: "pointer" }}
        onClick={() => setExpanded(e => !e)}
      >
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, marginBottom: 8 }}>
          <span style={{ fontFamily: SF, fontSize: 14, fontWeight: 600, color: "#2f2618", flex: 1 }}>
            {ticket.subject}
          </span>
          <span style={{
            fontFamily: SF, fontSize: 11, fontWeight: 600,
            color: STATUS_COLORS[ticket.status] || "#6b7280",
            background: `${STATUS_COLORS[ticket.status] || "#6b7280"}18`,
            padding: "3px 10px", borderRadius: 12,
            textTransform: "capitalize",
          }}>
            {ticket.status}
          </span>
          <ChevronDown
            size={14}
            style={{
              color: "#7b7366",
              transform: expanded ? "rotate(180deg)" : "rotate(0deg)",
              transition: "transform 0.2s ease",
            }}
          />
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
          {ticket.category && (
            <span style={{ fontFamily: SF, fontSize: 11, color: "#7b7366" }}>
              {ticket.category}
            </span>
          )}
          {ticket.priority && (
            <span style={{
              fontFamily: SF, fontSize: 11, fontWeight: 500,
              color: PRIORITY_COLORS[ticket.priority] || "#7b7366",
            }}>
              {ticket.priority} {t("spPriorityWord")}
            </span>
          )}
          {ticket.createdAt && (
            <span style={{ fontFamily: SF, fontSize: 11, color: "#8a8070" }}>
              {new Date(ticket.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
            </span>
          )}
        </div>
      </div>

      {expanded && (
        <div style={{ marginTop: 16, paddingTop: 14, borderTop: "1px solid rgba(66,53,33,0.08)" }}>
          {/* Original message */}
          <div style={{ marginBottom: 12 }}>
            <div style={{ fontFamily: SF, fontSize: 10, fontWeight: 700, letterSpacing: "0.15em", textTransform: "uppercase", color: "#7b7366", marginBottom: 6 }}>
              {t("spYou")}  ·  {ticket.createdAt ? new Date(ticket.createdAt).toLocaleString() : ""}
            </div>
            <p style={{ fontFamily: SF, fontSize: 13, lineHeight: 1.65, color: "#423521", whiteSpace: "pre-wrap", margin: 0 }}>
              {ticket.message}
            </p>
          </div>

          {/* Replies thread */}
          {thread.isLoading && (
            <div style={{ fontFamily: SF, fontSize: 12, color: "#7b7366", padding: "4px 0" }}>{t("spLoadingConvo")}</div>
          )}
          {thread.data && thread.data.replies.length > 0 && (
            <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 12, paddingTop: 12, borderTop: "1px solid rgba(66,53,33,0.07)" }}>
              {thread.data.replies.map(r => {
                const isYou = r.senderType === "user";
                return (
                  <div
                    key={r.id}
                    style={{
                      alignSelf: isYou ? "flex-end" : "flex-start",
                      maxWidth: "90%",
                      background: isYou ? "rgba(66,53,33,0.07)" : "rgba(74,158,255,0.1)",
                      border: `1px solid ${isYou ? "rgba(66,53,33,0.1)" : "rgba(74,158,255,0.22)"}`,
                      borderRadius: 12,
                      padding: "10px 14px",
                    }}
                  >
                    <div style={{ fontFamily: SF, fontSize: 10, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: isYou ? "#6d6354" : "#7db5ff", marginBottom: 4 }}>
                      {isYou ? t("spYou") : r.senderName || t("spPlotzySupport")}  ·  {r.createdAt ? new Date(r.createdAt).toLocaleString() : ""}
                    </div>
                    <p style={{ fontFamily: SF, fontSize: 13, lineHeight: 1.6, color: "#2f2618", whiteSpace: "pre-wrap", margin: 0 }}>
                      {r.body}
                    </p>
                  </div>
                );
              })}
            </div>
          )}

          {/* Reply composer */}
          {isClosed ? (
            <p style={{ fontFamily: SF, fontSize: 12, color: "#7b7366", fontStyle: "italic", marginTop: 14, marginBottom: 0 }}>
              {t("spTicketClosed")}
            </p>
          ) : (
            <div style={{ marginTop: 14, paddingTop: 14, borderTop: "1px solid rgba(66,53,33,0.07)" }}>
              <textarea
                value={replyBody}
                onChange={e => setReplyBody(e.target.value)}
                placeholder={t("spReplyPlaceholder")}
                rows={3}
                style={{
                  width: "100%",
                  background: "rgba(66,53,33,0.05)",
                  border: "1px solid rgba(66,53,33,0.13)",
                  borderRadius: 10,
                  padding: "10px 12px",
                  color: "#2f2618",
                  fontFamily: SF,
                  fontSize: 13,
                  lineHeight: 1.6,
                  resize: "vertical",
                  outline: "none",
                  boxSizing: "border-box",
                }}
              />
              <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 8 }}>
                <button
                  onClick={() => {
                    const t = replyBody.trim();
                    if (!t) return;
                    send.mutate(t);
                  }}
                  disabled={send.isPending || !replyBody.trim()}
                  style={{
                    fontFamily: SF,
                    fontSize: 12,
                    fontWeight: 600,
                    padding: "8px 20px",
                    borderRadius: 8,
                    background: replyBody.trim() && !send.isPending ? "#2f2618" : "rgba(66,53,33,0.13)",
                    color: replyBody.trim() && !send.isPending ? "#f4efe2" : "#6d6354",
                    border: "none",
                    cursor: replyBody.trim() && !send.isPending ? "pointer" : "not-allowed",
                  }}
                >
                  {send.isPending ? t("spSendingShort") : t("spSendReply")}
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/* ─── Main ─── */
export default function SupportPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const { t, lang } = useLanguage();
  const formRef = useRef<HTMLFormElement>(null);

  const [activeTab, setActiveTab] = useState<Tab>("contact");
  const [submitted, setSubmitted] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);

  const [form, setForm] = useState({
    name:     (user as any)?.displayName || (user as any)?.username || "",
    email:    (user as any)?.email || "",
    subject:  "",
    message:  "",
    category: "general",
    priority: "normal",
  });

  // Auto-fill when user loads
  useEffect(() => {
    if (user) {
      setForm(f => ({
        ...f,
        name: (user as any)?.displayName || (user as any)?.username || f.name,
        email: (user as any)?.email || f.email,
      }));
    }
  }, [user]);

  const submitMutation = useMutation({
    mutationFn: async (data: typeof form) => {
      const res = await fetch("/api/support/messages", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data), credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to submit");
      return res.json();
    },
    onSuccess: () => {
      setSubmitted(true);
      setForm({ name: "", email: "", subject: "", message: "", category: "general", priority: "normal" });
    },
    onError: () => {
      toast({ title: t("spSomethingWrong"), description: t("spTryAgainEmail"), variant: "destructive" });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim() || !form.email.trim() || !form.subject.trim() || !form.message.trim()) {
      toast({ title: t("spFillAll"), variant: "destructive" });
      return;
    }
    submitMutation.mutate(form);
  };

  // Tickets query
  const ticketsQuery = useQuery({
    queryKey: ["my-tickets"],
    queryFn: async () => {
      const res = await fetch("/api/support/my-tickets", { credentials: "include" });
      if (res.status === 404) return [];
      if (!res.ok) throw new Error("Failed to fetch tickets");
      return res.json();
    },
    enabled: activeTab === "tickets",
    retry: false,
  });

  const allOperational = SYSTEM_COMPONENTS.every(c => c.status === "operational");

  return (
    <Layout isLanding>
      <SEO title={t("spSeo")} noindex />
      <div style={{ background: "#f4efe2", minHeight: "100vh" }}>
      <style>{`
        @keyframes fadeIn  { from { opacity:0; transform:translateY(-4px); } to { opacity:1; transform:translateY(0); } }
        @keyframes slideUp { from { opacity:0; transform:translateY(12px); } to { opacity:1; transform:translateY(0); } }
        @keyframes spin { to { transform:rotate(360deg); } }
        .s-input {
          width:100%; font-family:${SF}; font-size:14px; color:#2f2618;
          background:#fffdf7; border:1px solid rgba(66,53,33,0.1); border-radius:8px;
          padding:10px 14px; outline:none; transition:border-color 0.15s; box-sizing:border-box;
        }
        .s-input::placeholder { color:#9a9181; }
        .s-input:focus { border-color:#9a9181; }
        .s-select { appearance:none; background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%23888' stroke-width='2'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E"); background-repeat:no-repeat; background-position:right 12px center; padding-right:32px !important; cursor:pointer; }
        .s-select option { background:#fffdf7; color:#2f2618; }
        .cat-pill { transition:all 0.15s ease; cursor:pointer; border:none; outline:none; }
        .cat-pill:hover { background:rgba(66,53,33,0.1) !important; }
        .tab-btn { transition:all 0.15s ease; cursor:pointer; border:none; outline:none; }
        .tab-btn:hover { color:#3a3020 !important; }
      `}</style>

      {/* ── Compact Hero ── */}
      <div style={{
        background: "#f4efe2",
        borderBottom: "1px solid rgba(66,53,33,0.1)",
        padding: "48px 24px 40px",
        textAlign: "center",
      }}>
        {/* Status badge */}
        <div style={{
          display: "inline-flex", alignItems: "center", gap: 6,
          background: "rgba(66,53,33,0.05)", border: "1px solid rgba(66,53,33,0.1)",
          borderRadius: 20, padding: "4px 12px", marginBottom: 20,
        }}>
          <Circle size={5} fill={allOperational ? "#4ade80" : "#fb923c"} color="transparent" />
          <span style={{ fontFamily: SF, fontSize: 11, fontWeight: 500, color: "#6d6354", letterSpacing: "0.02em" }}>
            {allOperational ? t("spAllOperational") : t("spPartialOutage")}
          </span>
        </div>

        <h1 style={{
          fontFamily: SF, fontSize: 40, fontWeight: 700, color: "#2f2618",
          margin: "0 0 10px", letterSpacing: "-0.03em", lineHeight: 1.1,
        }}>
          {t("spHelpCenter")}
        </h1>
        <p style={{
          fontFamily: SF, fontSize: 15, color: "#7b7366",
          margin: "0 auto 28px", maxWidth: 460, lineHeight: 1.6,
        }}>
          {t("spHeroSub")}
        </p>
        <p style={{
          fontFamily: lang === "ar" ? "'Aref Ruqaa', 'Amiri', serif" : "'Caveat', cursive",
          fontSize: lang === "ar" ? 15 : 19, color: "#5c5142",
          margin: "-16px auto 24px", transform: "rotate(-1deg)",
        }}>
          {lang === "ar" ? "(احكيلنا، بنرد فعلاً)" : "(talk to us, we actually reply)"}
        </p>
      </div>

      {/* ── See-FAQ banner — visible on every tab so product
          questions get directed to the FAQ source of truth before
          the user composes a ticket. ── */}
      <div style={{ background: "#f4efe2", borderBottom: "1px solid rgba(66,53,33,0.1)" }}>
        <div style={{
          maxWidth: 900, margin: "0 auto", padding: "16px 24px",
          display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap",
        }}>
          <img src="/images/paper-ball.png" alt="" aria-hidden style={{ width: 34, flexShrink: 0, transform: "rotate(-14deg)", filter: "drop-shadow(0 4px 7px rgba(41,33,21,0.25))" }} />
          <div style={{ flex: 1, minWidth: 220 }}>
            <div style={{ fontFamily: "'Lora', 'Amiri', Georgia, serif", fontSize: 14.5, fontWeight: 700, color: "#2f2618", marginBottom: 2 }}>
              {t("spLookingAnswers")}
            </div>
            <div style={{ fontFamily: "'Caveat', 'Aref Ruqaa', cursive", fontSize: 15.5, color: "#6d6354", lineHeight: 1.45, transform: "rotate(-0.4deg)", transformOrigin: "0 50%" }}>
              {t("spFaqBannerBody")}
            </div>
          </div>
          <Link
            href="/faq"
            style={{
              display: "inline-flex", alignItems: "center", gap: 6,
              fontFamily: SF, fontSize: 13, fontWeight: 600,
              padding: "8px 14px", borderRadius: 8,
              background: "#2f2618", color: "#f4efe2",
              textDecoration: "none", whiteSpace: "nowrap",
            }}
          >
            {t("spBrowseFaq")}
            <ArrowRight size={13} />
          </Link>
        </div>
      </div>

      {/* ── Tab Navigation ── */}
      <div style={{
        borderBottom: "1px solid rgba(66,53,33,0.1)",
        background: "#f4efe2",
      }}>
        <div style={{
          maxWidth: 900, margin: "0 auto", padding: "0 24px",
          display: "flex", gap: 0,
        }}>
          {TABS.map(tab => {
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                className="tab-btn"
                onClick={() => setActiveTab(tab.id)}
                style={{
                  fontFamily: SF, fontSize: 13, fontWeight: 500,
                  color: active ? "#2f2618" : "#7b7366",
                  background: "transparent",
                  padding: "14px 20px",
                  borderBottom: active ? "2px solid #2f2618" : "2px solid transparent",
                  display: "flex", alignItems: "center", gap: 7,
                  marginBottom: -1,
                }}
              >
                <tab.icon size={14} />
                {t(tab.labelKey)}
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Content ── */}
      <div style={{ maxWidth: 900, margin: "0 auto", padding: "24px clamp(14px, 4vw, 24px) 48px" }}>

        {/* ========== CONTACT TAB ========== */}
        {activeTab === "contact" && !user && (
          /* Guests can now REACH this page (the route used to bounce
             them home silently); tickets still need an account, so
             they get a clear sign-in card instead of a failing form. */
          <div style={{ maxWidth: 560, margin: "0 auto", animation: "fadeIn 0.2s ease" }}>
            <div style={{
              background: "#fffdf7", border: "1px solid rgba(66,53,33,0.1)",
              borderRadius: 14, padding: "44px 32px", textAlign: "center",
            }}>
              <MessageSquare size={36} color="#5c5142" style={{ marginBottom: 14 }} />
              <h3 style={{ fontFamily: SF, fontSize: 18, fontWeight: 700, color: "#2f2618", margin: "0 0 8px" }}>
                {lang === "ar" ? "سجّل دخولك للتواصل مع الدعم" : "Sign in to contact support"}
              </h3>
              <p style={{ fontFamily: SF, fontSize: 13.5, color: "#6d6354", margin: "0 0 24px", lineHeight: 1.65 }}>
                {lang === "ar"
                  ? "حتى نربط رسالتك بحسابك ونرد عليك داخل المنصة، تحتاج حساباً مجانياً."
                  : "A free account lets us attach your message to you and reply inside the platform."}
              </p>
              <button
                onClick={() => setShowAuthModal(true)}
                style={{
                  fontFamily: SF, fontSize: 14, fontWeight: 700,
                  color: "#f4efe2", background: "#2f2618",
                  border: "none", borderRadius: 10,
                  padding: "12px 28px", cursor: "pointer",
                }}
              >
                {lang === "ar" ? "تسجيل الدخول" : "Sign in"}
              </button>
            </div>
          </div>
        )}
        {activeTab === "contact" && user && (
          <div style={{ maxWidth: 560, margin: "0 auto", animation: "fadeIn 0.2s ease" }}>
            {submitted ? (
              <div style={{
                background: "#fffdf7", border: "1px solid rgba(66,53,33,0.1)",
                borderRadius: 14, padding: "48px 36px", textAlign: "center",
                animation: "slideUp 0.3s ease",
              }}>
                <CheckCircle2 size={40} color="#4ade80" style={{ marginBottom: 14 }} />
                <h3 style={{ fontFamily: SF, fontSize: 18, fontWeight: 700, color: "#2f2618", margin: "0 0 8px" }}>
                  {t("spMessageSent")}
                </h3>
                <p style={{ fontFamily: SF, fontSize: 13.5, color: "#6d6354", margin: "0 0 24px", lineHeight: 1.65 }}>
                  {t("spMessageSentBody")}
                </p>
                <button
                  onClick={() => setSubmitted(false)}
                  style={{
                    fontFamily: SF, fontSize: 13, fontWeight: 500,
                    color: "#5c5142", background: "rgba(66,53,33,0.08)",
                    border: "1px solid rgba(66,53,33,0.1)", borderRadius: 8,
                    padding: "8px 18px", cursor: "pointer",
                  }}
                >
                  {t("spSendAnother")}
                </button>
              </div>
            ) : (
              <>
                <div style={{ marginBottom: 24 }}>
                  <h2 style={{
                    fontFamily: SF, fontSize: 22, fontWeight: 700,
                    color: "#2f2618", margin: "0 0 6px",
                    letterSpacing: "-0.02em",
                  }}>
                    {t("spContactSupport")}
                  </h2>
                  <p style={{ fontFamily: SF, fontSize: 14, color: "#7b7366", margin: 0, lineHeight: 1.6 }}>
                    {t("spContactSub")}
                  </p>
                </div>

                <form ref={formRef} onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                  <div className="support-two-col" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                    <div>
                      <label style={{ fontFamily: SF, fontSize: 12, fontWeight: 500, color: "#6d6354", display: "block", marginBottom: 6 }}>{t("spName")}</label>
                      <input className="s-input" type="text" placeholder={t("spNamePlaceholder")} value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} required />
                    </div>
                    <div>
                      <label style={{ fontFamily: SF, fontSize: 12, fontWeight: 500, color: "#6d6354", display: "block", marginBottom: 6 }}>{t("spEmail")}</label>
                      <input className="s-input" type="email" placeholder="you@example.com" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} required />
                    </div>
                  </div>
                  <div>
                    <label style={{ fontFamily: SF, fontSize: 12, fontWeight: 500, color: "#6d6354", display: "block", marginBottom: 6 }}>{t("spSubject")}</label>
                    <input className="s-input" type="text" placeholder={t("spSubjectPlaceholder")} value={form.subject} onChange={e => setForm(f => ({ ...f, subject: e.target.value }))} required />
                  </div>
                  <div className="support-two-col" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                    <div>
                      <label style={{ fontFamily: SF, fontSize: 12, fontWeight: 500, color: "#6d6354", display: "block", marginBottom: 6 }}>{t("spCategory")}</label>
                      <NiceSelect
                        value={form.category}
                        onChange={(v) => setForm(f => ({ ...f, category: v }))}
                        menuWidth={240}
                        options={CONTACT_CATEGORIES.map(c => ({ value: c.value, label: t(c.labelKey) }))}
                        triggerStyle={{ width: "100%", justifyContent: "space-between", fontFamily: SF, fontSize: 14, fontWeight: 450, color: "#2f2618", background: "#fffdf7", border: "1px solid rgba(66,53,33,0.1)", borderRadius: 8, padding: "10px 14px" }}
                      />
                    </div>
                    <div>
                      <label style={{ fontFamily: SF, fontSize: 12, fontWeight: 500, color: "#6d6354", display: "block", marginBottom: 6 }}>{t("spPriority")}</label>
                      <NiceSelect
                        value={form.priority}
                        onChange={(v) => setForm(f => ({ ...f, priority: v }))}
                        menuWidth={260}
                        options={CONTACT_PRIORITIES.map(p => ({ value: p.value, label: `${t(p.labelKey)}: ${t(p.descKey)}` }))}
                        triggerStyle={{ width: "100%", justifyContent: "space-between", fontFamily: SF, fontSize: 14, fontWeight: 450, color: "#2f2618", background: "#fffdf7", border: "1px solid rgba(66,53,33,0.1)", borderRadius: 8, padding: "10px 14px" }}
                      />
                    </div>
                  </div>
                  <div>
                    <label style={{ fontFamily: SF, fontSize: 12, fontWeight: 500, color: "#6d6354", display: "block", marginBottom: 6 }}>{t("spMessageLabel")}</label>
                    <textarea
                      className="s-input"
                      placeholder={t("spMessagePlaceholder")}
                      value={form.message}
                      onChange={e => setForm(f => ({ ...f, message: e.target.value }))}
                      rows={5}
                      required
                      style={{ resize: "vertical", minHeight: 120 }}
                    />
                  </div>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, marginTop: 4 }}>
                    <p style={{ fontFamily: SF, fontSize: 11, color: "#8a8070", margin: 0, display: "flex", alignItems: "center", gap: 5 }}>
                      <Lock size={10} />
                      {t("spEncrypted")}
                    </p>
                    <button
                      type="submit"
                      disabled={submitMutation.isPending}
                      style={{
                        fontFamily: SF, fontSize: 13, fontWeight: 600,
                        color: submitMutation.isPending ? "#6d6354" : "#f4efe2",
                        background: submitMutation.isPending ? "rgba(66,53,33,0.1)" : "#2f2618",
                        border: "none", borderRadius: 8, padding: "10px 22px",
                        cursor: submitMutation.isPending ? "not-allowed" : "pointer",
                        display: "flex", alignItems: "center", gap: 7,
                        transition: "opacity 0.15s",
                      }}
                    >
                      {submitMutation.isPending ? (
                        <><div style={{ width: 12, height: 12, border: "2px solid #8a8070", borderTopColor: "#4a4132", borderRadius: "50%", animation: "spin 0.6s linear infinite" }} /> {t("spSending")}</>
                      ) : (
                        <><Send size={12} /> {t("spSendMessage")}</>
                      )}
                    </button>
                  </div>
                </form>
              </>
            )}
          </div>
        )}

        {/* ========== MY TICKETS TAB ========== */}
        {activeTab === "tickets" && !user && (
          <div style={{ maxWidth: 560, margin: "0 auto", animation: "fadeIn 0.2s ease" }}>
            <div style={{
              background: "#fffdf7", border: "1px solid rgba(66,53,33,0.1)",
              borderRadius: 14, padding: "44px 32px", textAlign: "center",
            }}>
              <FileText size={36} color="#5c5142" style={{ marginBottom: 14 }} />
              <h3 style={{ fontFamily: SF, fontSize: 18, fontWeight: 700, color: "#2f2618", margin: "0 0 8px" }}>
                {lang === "ar" ? "تذاكرك تعيش داخل حسابك" : "Your tickets live in your account"}
              </h3>
              <p style={{ fontFamily: SF, fontSize: 13.5, color: "#6d6354", margin: "0 0 24px", lineHeight: 1.65 }}>
                {lang === "ar" ? "سجّل دخولك لعرض تذاكرك ومتابعة الردود." : "Sign in to view your tickets and follow the replies."}
              </p>
              <button
                onClick={() => setShowAuthModal(true)}
                style={{
                  fontFamily: SF, fontSize: 14, fontWeight: 700,
                  color: "#f4efe2", background: "#2f2618",
                  border: "none", borderRadius: 10,
                  padding: "12px 28px", cursor: "pointer",
                }}
              >
                {lang === "ar" ? "تسجيل الدخول" : "Sign in"}
              </button>
            </div>
          </div>
        )}
        {activeTab === "tickets" && user && (
          <div style={{ maxWidth: 640, margin: "0 auto", animation: "fadeIn 0.2s ease" }}>
            <div style={{ marginBottom: 24 }}>
              <h2 style={{
                fontFamily: SF, fontSize: 22, fontWeight: 700,
                color: "#2f2618", margin: "0 0 6px",
                letterSpacing: "-0.02em",
              }}>
                {t("spMyTickets")}
              </h2>
              <p style={{ fontFamily: SF, fontSize: 14, color: "#7b7366", margin: 0, lineHeight: 1.6 }}>
                {t("spTrackRequests")}
              </p>
            </div>

            {ticketsQuery.isLoading && (
              <div style={{ textAlign: "center", padding: "48px 0" }}>
                <div style={{
                  width: 20, height: 20,
                  border: "2px solid rgba(66,53,33,0.13)",
                  borderTopColor: "#6d6354",
                  borderRadius: "50%", animation: "spin 0.6s linear infinite",
                  margin: "0 auto 12px",
                }} />
                <p style={{ fontFamily: SF, fontSize: 13, color: "#7b7366" }}>{t("spLoadingTickets")}</p>
              </div>
            )}

            {ticketsQuery.isError || (ticketsQuery.data && ticketsQuery.data.length === 0) ? (
              <div style={{
                background: "#fffdf7", border: "1px solid rgba(66,53,33,0.1)",
                borderRadius: 12, padding: "48px 24px", textAlign: "center",
              }}>
                <MessageSquare size={28} style={{ color: "rgba(66,53,33,0.16)", marginBottom: 12 }} />
                <p style={{ fontFamily: SF, fontSize: 15, fontWeight: 500, color: "#6d6354", margin: "0 0 6px" }}>
                  {t("spNoTickets")}
                </p>
                <p style={{ fontFamily: SF, fontSize: 13, color: "#9a9181", margin: "0 0 20px" }}>
                  {t("spNoTicketsBody")}
                </p>
                <button
                  onClick={() => setActiveTab("contact")}
                  style={{
                    fontFamily: SF, fontSize: 13, fontWeight: 500,
                    color: "#423521", background: "rgba(66,53,33,0.08)",
                    border: "1px solid rgba(66,53,33,0.1)", borderRadius: 8,
                    padding: "8px 18px", cursor: "pointer",
                  }}
                >
                  {t("spContactSupport")}
                </button>
              </div>
            ) : null}

            {ticketsQuery.data && ticketsQuery.data.length > 0 && (
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {ticketsQuery.data.map((ticket: any) => (
                  <UserTicketCard key={ticket.id || ticket._id} ticket={ticket} />
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Compact System Status Bar ── */}
      <div style={{
        borderTop: "1px solid rgba(66,53,33,0.1)",
        background: "#f4efe2",
        padding: "16px 24px",
      }}>
        <div style={{
          maxWidth: 900, margin: "0 auto",
          display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <Circle size={5} fill={allOperational ? "#4ade80" : "#fb923c"} color="transparent" />
            <span style={{ fontFamily: SF, fontSize: 12, fontWeight: 600, color: "#6d6354" }}>
              {allOperational ? t("spAllOperational") : t("spPartialOutage")}
            </span>
          </div>
          <div style={{ width: 1, height: 14, background: "rgba(66,53,33,0.1)" }} />
          {SYSTEM_COMPONENTS.map(comp => (
            <div key={comp.nameKey} style={{ display: "flex", alignItems: "center", gap: 5 }}>
              <Circle size={4} fill={comp.status === "operational" ? "#4ade80" : "#fb923c"} color="transparent" />
              <span style={{ fontFamily: SF, fontSize: 11, color: "#7b7366" }}>
                {t(comp.nameKey)}
              </span>
            </div>
          ))}
        </div>
      </div>

      </div>
      <AuthModal open={showAuthModal} onClose={() => setShowAuthModal(false)} />
    </Layout>
  );
}
