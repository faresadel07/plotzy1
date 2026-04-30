import { useState, useRef, useEffect } from "react";
import { Link } from "wouter";
import { useAuth } from "@/contexts/auth-context";
import { useToast } from "@/hooks/use-toast";
import { Layout } from "@/components/layout";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
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
const SYSTEM_COMPONENTS = [
  { name: "Writing Editor",        status: "operational" },
  { name: "AI Assistant",          status: "operational" },
  { name: "File Exports",          status: "operational" },
  { name: "Marketplace",           status: "operational" },
  { name: "Public Domain Library", status: "operational" },
  { name: "Authentication",        status: "operational" },
];

const CONTACT_CATEGORIES = [
  { value: "general",  label: "General Question" },
  { value: "bug",      label: "Bug Report" },
  { value: "billing",  label: "Billing & Subscription" },
  { value: "account",  label: "Account Issue" },
  { value: "feature",  label: "Feature Request" },
  { value: "privacy",  label: "Privacy & Data" },
  { value: "other",    label: "Other" },
];

const CONTACT_PRIORITIES = [
  { value: "low",    label: "Low",    desc: "General question",      time: "< 48h" },
  { value: "normal", label: "Normal", desc: "Need help soon",        time: "< 24h" },
  { value: "high",   label: "High",   desc: "Blocking my work",      time: "< 8h"  },
  { value: "urgent", label: "Urgent", desc: "Complete data loss",    time: "< 2h"  },
];

/* ─── Sub-components ─── */

type Tab = "contact" | "tickets";

const TABS: { id: Tab; label: string; icon: typeof MessageSquare }[] = [
  { id: "contact", label: "Contact", icon: MessageSquare },
  { id: "tickets", label: "My Tickets", icon: FileText },
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
        throw new Error(data?.message || "Failed to send reply");
      }
      return res.json();
    },
    onSuccess: () => {
      setReplyBody("");
      toast({ title: "Reply sent", description: "The support team has been notified." });
      qc.invalidateQueries({ queryKey: [`/api/support/tickets/${ticket.id}/thread`] });
      qc.invalidateQueries({ queryKey: ["my-tickets"] });
    },
    onError: (err: Error) => toast({ title: "Reply failed", description: err.message, variant: "destructive" }),
  });

  const isClosed = ticket.status === "closed";

  return (
    <div style={{
      background: "#111", border: "1px solid rgba(255,255,255,0.07)",
      borderRadius: 10, padding: "16px 20px",
    }}>
      <div
        style={{ cursor: "pointer" }}
        onClick={() => setExpanded(e => !e)}
      >
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, marginBottom: 8 }}>
          <span style={{ fontFamily: SF, fontSize: 14, fontWeight: 600, color: "rgba(255,255,255,0.88)", flex: 1 }}>
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
              color: "rgba(255,255,255,0.3)",
              transform: expanded ? "rotate(180deg)" : "rotate(0deg)",
              transition: "transform 0.2s ease",
            }}
          />
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
          {ticket.category && (
            <span style={{ fontFamily: SF, fontSize: 11, color: "rgba(255,255,255,0.35)" }}>
              {ticket.category}
            </span>
          )}
          {ticket.priority && (
            <span style={{
              fontFamily: SF, fontSize: 11, fontWeight: 500,
              color: PRIORITY_COLORS[ticket.priority] || "rgba(255,255,255,0.35)",
            }}>
              {ticket.priority} priority
            </span>
          )}
          {ticket.createdAt && (
            <span style={{ fontFamily: SF, fontSize: 11, color: "rgba(255,255,255,0.2)" }}>
              {new Date(ticket.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
            </span>
          )}
        </div>
      </div>

      {expanded && (
        <div style={{ marginTop: 16, paddingTop: 14, borderTop: "1px solid rgba(255,255,255,0.06)" }}>
          {/* Original message */}
          <div style={{ marginBottom: 12 }}>
            <div style={{ fontFamily: SF, fontSize: 10, fontWeight: 700, letterSpacing: "0.15em", textTransform: "uppercase", color: "rgba(255,255,255,0.3)", marginBottom: 6 }}>
              You  ·  {ticket.createdAt ? new Date(ticket.createdAt).toLocaleString() : ""}
            </div>
            <p style={{ fontFamily: SF, fontSize: 13, lineHeight: 1.65, color: "rgba(255,255,255,0.75)", whiteSpace: "pre-wrap", margin: 0 }}>
              {ticket.message}
            </p>
          </div>

          {/* Replies thread */}
          {thread.isLoading && (
            <div style={{ fontFamily: SF, fontSize: 12, color: "rgba(255,255,255,0.3)", padding: "4px 0" }}>Loading conversation…</div>
          )}
          {thread.data && thread.data.replies.length > 0 && (
            <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 12, paddingTop: 12, borderTop: "1px solid rgba(255,255,255,0.05)" }}>
              {thread.data.replies.map(r => {
                const isYou = r.senderType === "user";
                return (
                  <div
                    key={r.id}
                    style={{
                      alignSelf: isYou ? "flex-end" : "flex-start",
                      maxWidth: "90%",
                      background: isYou ? "rgba(255,255,255,0.05)" : "rgba(74,158,255,0.1)",
                      border: `1px solid ${isYou ? "rgba(255,255,255,0.08)" : "rgba(74,158,255,0.22)"}`,
                      borderRadius: 12,
                      padding: "10px 14px",
                    }}
                  >
                    <div style={{ fontFamily: SF, fontSize: 10, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: isYou ? "rgba(255,255,255,0.45)" : "#7db5ff", marginBottom: 4 }}>
                      {isYou ? "You" : r.senderName || "Plotzy Support"}  ·  {r.createdAt ? new Date(r.createdAt).toLocaleString() : ""}
                    </div>
                    <p style={{ fontFamily: SF, fontSize: 13, lineHeight: 1.6, color: "rgba(255,255,255,0.85)", whiteSpace: "pre-wrap", margin: 0 }}>
                      {r.body}
                    </p>
                  </div>
                );
              })}
            </div>
          )}

          {/* Reply composer */}
          {isClosed ? (
            <p style={{ fontFamily: SF, fontSize: 12, color: "rgba(255,255,255,0.35)", fontStyle: "italic", marginTop: 14, marginBottom: 0 }}>
              This ticket is closed. If you need further help, please open a new ticket.
            </p>
          ) : (
            <div style={{ marginTop: 14, paddingTop: 14, borderTop: "1px solid rgba(255,255,255,0.05)" }}>
              <textarea
                value={replyBody}
                onChange={e => setReplyBody(e.target.value)}
                placeholder="Write a reply to the support team…"
                rows={3}
                style={{
                  width: "100%",
                  background: "rgba(255,255,255,0.04)",
                  border: "1px solid rgba(255,255,255,0.1)",
                  borderRadius: 10,
                  padding: "10px 12px",
                  color: "#fff",
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
                    background: replyBody.trim() && !send.isPending ? "#fff" : "rgba(255,255,255,0.1)",
                    color: replyBody.trim() && !send.isPending ? "#000" : "rgba(255,255,255,0.4)",
                    border: "none",
                    cursor: replyBody.trim() && !send.isPending ? "pointer" : "not-allowed",
                  }}
                >
                  {send.isPending ? "Sending…" : "Send reply"}
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
  const formRef = useRef<HTMLFormElement>(null);

  const [activeTab, setActiveTab] = useState<Tab>("contact");
  const [submitted, setSubmitted] = useState(false);

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
      toast({ title: "Something went wrong", description: "Please try again or email us directly.", variant: "destructive" });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim() || !form.email.trim() || !form.subject.trim() || !form.message.trim()) {
      toast({ title: "Please fill in all fields", variant: "destructive" });
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
    <Layout isLanding darkNav>
      <div style={{ background: "#000", minHeight: "100vh" }}>
      <style>{`
        @keyframes fadeIn  { from { opacity:0; transform:translateY(-4px); } to { opacity:1; transform:translateY(0); } }
        @keyframes slideUp { from { opacity:0; transform:translateY(12px); } to { opacity:1; transform:translateY(0); } }
        @keyframes spin { to { transform:rotate(360deg); } }
        .s-input {
          width:100%; font-family:${SF}; font-size:14px; color:rgba(255,255,255,0.88);
          background:#111; border:1px solid rgba(255,255,255,0.07); border-radius:8px;
          padding:10px 14px; outline:none; transition:border-color 0.15s; box-sizing:border-box;
        }
        .s-input::placeholder { color:rgba(255,255,255,0.25); }
        .s-input:focus { border-color:rgba(255,255,255,0.25); }
        .s-select { appearance:none; background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%23888' stroke-width='2'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E"); background-repeat:no-repeat; background-position:right 12px center; padding-right:32px !important; cursor:pointer; }
        .s-select option { background:#111; color:rgba(255,255,255,0.88); }
        .cat-pill { transition:all 0.15s ease; cursor:pointer; border:none; outline:none; }
        .cat-pill:hover { background:rgba(255,255,255,0.08) !important; }
        .tab-btn { transition:all 0.15s ease; cursor:pointer; border:none; outline:none; }
        .tab-btn:hover { color:rgba(255,255,255,0.8) !important; }
      `}</style>

      {/* ── Compact Hero ── */}
      <div style={{
        background: "#000",
        borderBottom: "1px solid rgba(255,255,255,0.07)",
        padding: "48px 24px 40px",
        textAlign: "center",
      }}>
        {/* Status badge */}
        <div style={{
          display: "inline-flex", alignItems: "center", gap: 6,
          background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)",
          borderRadius: 20, padding: "4px 12px", marginBottom: 20,
        }}>
          <Circle size={5} fill={allOperational ? "#4ade80" : "#fb923c"} color="transparent" />
          <span style={{ fontFamily: SF, fontSize: 11, fontWeight: 500, color: "rgba(255,255,255,0.45)", letterSpacing: "0.02em" }}>
            {allOperational ? "All Systems Operational" : "Partial Outage"}
          </span>
        </div>

        <h1 style={{
          fontFamily: SF, fontSize: 40, fontWeight: 700, color: "#fff",
          margin: "0 0 10px", letterSpacing: "-0.03em", lineHeight: 1.1,
        }}>
          Help Center
        </h1>
        <p style={{
          fontFamily: SF, fontSize: 15, color: "rgba(255,255,255,0.35)",
          margin: "0 auto 28px", maxWidth: 460, lineHeight: 1.6,
        }}>
          Get in touch with our team or check the status of an existing ticket.
        </p>
      </div>

      {/* ── See-FAQ banner — visible on every tab so product
          questions get directed to the FAQ source of truth before
          the user composes a ticket. ── */}
      <div style={{ background: "#000", borderBottom: "1px solid rgba(255,255,255,0.07)" }}>
        <div style={{
          maxWidth: 900, margin: "0 auto", padding: "16px 24px",
          display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap",
        }}>
          <div style={{
            width: 36, height: 36, borderRadius: 8, flexShrink: 0,
            background: "rgba(124,106,247,0.10)",
            border: "1px solid rgba(124,106,247,0.18)",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            <Sparkles size={16} style={{ color: "#a99ef7" }} />
          </div>
          <div style={{ flex: 1, minWidth: 220 }}>
            <div style={{ fontFamily: SF, fontSize: 13.5, fontWeight: 600, color: "rgba(255,255,255,0.9)", marginBottom: 2 }}>
              Looking for answers?
            </div>
            <div style={{ fontFamily: SF, fontSize: 12.5, color: "rgba(255,255,255,0.45)", lineHeight: 1.5 }}>
              Browse our FAQ for instant answers about plans, AI features, and account questions.
            </div>
          </div>
          <Link
            href="/faq"
            style={{
              display: "inline-flex", alignItems: "center", gap: 6,
              fontFamily: SF, fontSize: 13, fontWeight: 600,
              padding: "8px 14px", borderRadius: 8,
              background: "#fff", color: "#000",
              textDecoration: "none", whiteSpace: "nowrap",
            }}
          >
            Browse FAQ
            <ArrowRight size={13} />
          </Link>
        </div>
      </div>

      {/* ── Tab Navigation ── */}
      <div style={{
        borderBottom: "1px solid rgba(255,255,255,0.07)",
        background: "#000",
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
                  color: active ? "rgba(255,255,255,0.9)" : "rgba(255,255,255,0.35)",
                  background: "transparent",
                  padding: "14px 20px",
                  borderBottom: active ? "2px solid #fff" : "2px solid transparent",
                  display: "flex", alignItems: "center", gap: 7,
                  marginBottom: -1,
                }}
              >
                <tab.icon size={14} />
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Content ── */}
      <div style={{ maxWidth: 900, margin: "0 auto", padding: "24px clamp(14px, 4vw, 24px) 48px" }}>

        {/* ========== CONTACT TAB ========== */}
        {activeTab === "contact" && (
          <div style={{ maxWidth: 560, margin: "0 auto", animation: "fadeIn 0.2s ease" }}>
            {submitted ? (
              <div style={{
                background: "#111", border: "1px solid rgba(255,255,255,0.07)",
                borderRadius: 14, padding: "48px 36px", textAlign: "center",
                animation: "slideUp 0.3s ease",
              }}>
                <CheckCircle2 size={40} color="#4ade80" style={{ marginBottom: 14 }} />
                <h3 style={{ fontFamily: SF, fontSize: 18, fontWeight: 700, color: "rgba(255,255,255,0.9)", margin: "0 0 8px" }}>
                  Message sent
                </h3>
                <p style={{ fontFamily: SF, fontSize: 13.5, color: "rgba(255,255,255,0.4)", margin: "0 0 24px", lineHeight: 1.65 }}>
                  We have received your message and will respond as soon as possible. Check your email for a confirmation.
                </p>
                <button
                  onClick={() => setSubmitted(false)}
                  style={{
                    fontFamily: SF, fontSize: 13, fontWeight: 500,
                    color: "rgba(255,255,255,0.55)", background: "rgba(255,255,255,0.06)",
                    border: "1px solid rgba(255,255,255,0.07)", borderRadius: 8,
                    padding: "8px 18px", cursor: "pointer",
                  }}
                >
                  Send another message
                </button>
              </div>
            ) : (
              <>
                <div style={{ marginBottom: 24 }}>
                  <h2 style={{
                    fontFamily: SF, fontSize: 22, fontWeight: 700,
                    color: "rgba(255,255,255,0.9)", margin: "0 0 6px",
                    letterSpacing: "-0.02em",
                  }}>
                    Contact Support
                  </h2>
                  <p style={{ fontFamily: SF, fontSize: 14, color: "rgba(255,255,255,0.35)", margin: 0, lineHeight: 1.6 }}>
                    Our team reads every message and typically responds within 24 hours.
                  </p>
                </div>

                <form ref={formRef} onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                  <div className="support-two-col" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                    <div>
                      <label style={{ fontFamily: SF, fontSize: 12, fontWeight: 500, color: "rgba(255,255,255,0.4)", display: "block", marginBottom: 6 }}>Name</label>
                      <input className="s-input" type="text" placeholder="Your name" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} required />
                    </div>
                    <div>
                      <label style={{ fontFamily: SF, fontSize: 12, fontWeight: 500, color: "rgba(255,255,255,0.4)", display: "block", marginBottom: 6 }}>Email</label>
                      <input className="s-input" type="email" placeholder="you@example.com" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} required />
                    </div>
                  </div>
                  <div>
                    <label style={{ fontFamily: SF, fontSize: 12, fontWeight: 500, color: "rgba(255,255,255,0.4)", display: "block", marginBottom: 6 }}>Subject</label>
                    <input className="s-input" type="text" placeholder="Brief description of your issue" value={form.subject} onChange={e => setForm(f => ({ ...f, subject: e.target.value }))} required />
                  </div>
                  <div className="support-two-col" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                    <div>
                      <label style={{ fontFamily: SF, fontSize: 12, fontWeight: 500, color: "rgba(255,255,255,0.4)", display: "block", marginBottom: 6 }}>Category</label>
                      <select className="s-input s-select" value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))}>
                        {CONTACT_CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                      </select>
                    </div>
                    <div>
                      <label style={{ fontFamily: SF, fontSize: 12, fontWeight: 500, color: "rgba(255,255,255,0.4)", display: "block", marginBottom: 6 }}>Priority</label>
                      <select className="s-input s-select" value={form.priority} onChange={e => setForm(f => ({ ...f, priority: e.target.value }))}>
                        {CONTACT_PRIORITIES.map(p => <option key={p.value} value={p.value}>{p.label}: {p.desc}</option>)}
                      </select>
                    </div>
                  </div>
                  <div>
                    <label style={{ fontFamily: SF, fontSize: 12, fontWeight: 500, color: "rgba(255,255,255,0.4)", display: "block", marginBottom: 6 }}>Message</label>
                    <textarea
                      className="s-input"
                      placeholder="Describe what happened, what you expected, and any steps to reproduce..."
                      value={form.message}
                      onChange={e => setForm(f => ({ ...f, message: e.target.value }))}
                      rows={5}
                      required
                      style={{ resize: "vertical", minHeight: 120 }}
                    />
                  </div>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, marginTop: 4 }}>
                    <p style={{ fontFamily: SF, fontSize: 11, color: "rgba(255,255,255,0.2)", margin: 0, display: "flex", alignItems: "center", gap: 5 }}>
                      <Lock size={10} />
                      Encrypted and stored securely.
                    </p>
                    <button
                      type="submit"
                      disabled={submitMutation.isPending}
                      style={{
                        fontFamily: SF, fontSize: 13, fontWeight: 600,
                        color: submitMutation.isPending ? "rgba(255,255,255,0.4)" : "#000",
                        background: submitMutation.isPending ? "rgba(255,255,255,0.08)" : "#fff",
                        border: "none", borderRadius: 8, padding: "10px 22px",
                        cursor: submitMutation.isPending ? "not-allowed" : "pointer",
                        display: "flex", alignItems: "center", gap: 7,
                        transition: "opacity 0.15s",
                      }}
                    >
                      {submitMutation.isPending ? (
                        <><div style={{ width: 12, height: 12, border: "2px solid rgba(255,255,255,0.2)", borderTopColor: "rgba(255,255,255,0.6)", borderRadius: "50%", animation: "spin 0.6s linear infinite" }} /> Sending...</>
                      ) : (
                        <><Send size={12} /> Send Message</>
                      )}
                    </button>
                  </div>
                </form>
              </>
            )}
          </div>
        )}

        {/* ========== MY TICKETS TAB ========== */}
        {activeTab === "tickets" && (
          <div style={{ maxWidth: 640, margin: "0 auto", animation: "fadeIn 0.2s ease" }}>
            <div style={{ marginBottom: 24 }}>
              <h2 style={{
                fontFamily: SF, fontSize: 22, fontWeight: 700,
                color: "rgba(255,255,255,0.9)", margin: "0 0 6px",
                letterSpacing: "-0.02em",
              }}>
                My Tickets
              </h2>
              <p style={{ fontFamily: SF, fontSize: 14, color: "rgba(255,255,255,0.35)", margin: 0, lineHeight: 1.6 }}>
                Track the status of your support requests.
              </p>
            </div>

            {ticketsQuery.isLoading && (
              <div style={{ textAlign: "center", padding: "48px 0" }}>
                <div style={{
                  width: 20, height: 20,
                  border: "2px solid rgba(255,255,255,0.1)",
                  borderTopColor: "rgba(255,255,255,0.4)",
                  borderRadius: "50%", animation: "spin 0.6s linear infinite",
                  margin: "0 auto 12px",
                }} />
                <p style={{ fontFamily: SF, fontSize: 13, color: "rgba(255,255,255,0.3)" }}>Loading tickets...</p>
              </div>
            )}

            {ticketsQuery.isError || (ticketsQuery.data && ticketsQuery.data.length === 0) ? (
              <div style={{
                background: "#111", border: "1px solid rgba(255,255,255,0.07)",
                borderRadius: 12, padding: "48px 24px", textAlign: "center",
              }}>
                <MessageSquare size={28} style={{ color: "rgba(255,255,255,0.12)", marginBottom: 12 }} />
                <p style={{ fontFamily: SF, fontSize: 15, fontWeight: 500, color: "rgba(255,255,255,0.45)", margin: "0 0 6px" }}>
                  No tickets yet
                </p>
                <p style={{ fontFamily: SF, fontSize: 13, color: "rgba(255,255,255,0.25)", margin: "0 0 20px" }}>
                  When you contact support, your tickets will appear here.
                </p>
                <button
                  onClick={() => setActiveTab("contact")}
                  style={{
                    fontFamily: SF, fontSize: 13, fontWeight: 500,
                    color: "rgba(255,255,255,0.7)", background: "rgba(255,255,255,0.06)",
                    border: "1px solid rgba(255,255,255,0.07)", borderRadius: 8,
                    padding: "8px 18px", cursor: "pointer",
                  }}
                >
                  Contact Support
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
        borderTop: "1px solid rgba(255,255,255,0.07)",
        background: "#000",
        padding: "16px 24px",
      }}>
        <div style={{
          maxWidth: 900, margin: "0 auto",
          display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <Circle size={5} fill={allOperational ? "#4ade80" : "#fb923c"} color="transparent" />
            <span style={{ fontFamily: SF, fontSize: 12, fontWeight: 600, color: "rgba(255,255,255,0.4)" }}>
              {allOperational ? "All Systems Operational" : "Partial Outage"}
            </span>
          </div>
          <div style={{ width: 1, height: 14, background: "rgba(255,255,255,0.07)" }} />
          {SYSTEM_COMPONENTS.map(comp => (
            <div key={comp.name} style={{ display: "flex", alignItems: "center", gap: 5 }}>
              <Circle size={4} fill={comp.status === "operational" ? "#4ade80" : "#fb923c"} color="transparent" />
              <span style={{ fontFamily: SF, fontSize: 11, color: "rgba(255,255,255,0.3)" }}>
                {comp.name}
              </span>
            </div>
          ))}
        </div>
      </div>

      </div>
    </Layout>
  );
}
