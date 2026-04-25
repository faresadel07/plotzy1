"use client";
import React from "react";
import { Link, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/contexts/auth-context";
import { useLanguage } from "@/contexts/language-context";
import { Layout } from "@/components/layout";
import {
  BookOpen, Bell, Mail, PenTool, Send, Library, Plus, Users,
  FileText, Loader2, Clock,
} from "lucide-react";
import type { Book } from "@/shared/schema";

/* ── Design tokens ─────────────────────────────────────────── */
const SF = "-apple-system,BlinkMacSystemFont,'SF Pro Text','Helvetica Neue',sans-serif";
const BG = "#000";
const C1 = "#0a0a0a";
const C2 = "#111";
const B = "rgba(255,255,255,0.07)";
const T = "#fff";
const TS = "rgba(255,255,255,0.55)";
const TD = "rgba(255,255,255,0.25)";

/* ── Helpers ───────────────────────────────────────────────── */
function formatDate(d: string | Date | null | undefined): string {
  if (!d) return "";
  const date = new Date(d);
  if (isNaN(date.getTime())) return "";
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function countWords(text: string | null | undefined): number {
  if (!text) return 0;
  // Strip HTML tags for word count
  const plain = text.replace(/<[^>]*>/g, " ").replace(/&nbsp;/g, " ");
  const words = plain.trim().split(/\s+/).filter(Boolean);
  return words.length;
}

function formatNumber(n: number): string {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1).replace(/\.0$/, "") + "M";
  if (n >= 1_000) return (n / 1_000).toFixed(1).replace(/\.0$/, "") + "K";
  return n.toLocaleString();
}

/* ── Main Component ────────────────────────────────────────── */
export default function DashboardDemo() {
  const { user } = useAuth();
  const [, navigate] = useLocation();

  // Fetch user's books
  const { data: books, isLoading: booksLoading } = useQuery<Book[]>({
    queryKey: ["/api/books"],
    queryFn: () => fetch("/api/books", { credentials: "include" }).then(r => r.ok ? r.json() : []),
    enabled: !!user,
  });

  // Fetch unread notifications count
  const { data: notifData } = useQuery<{ count: number }>({
    queryKey: ["/api/notifications/unread-count"],
    queryFn: () => fetch("/api/notifications/unread-count", { credentials: "include" }).then(r => r.ok ? r.json() : { count: 0 }),
    enabled: !!user,
    refetchInterval: 30000,
  });

  // Fetch unread messages count
  const { data: msgData } = useQuery<{ count: number }>({
    queryKey: ["/api/messages/unread-count"],
    queryFn: () => fetch("/api/messages/unread-count", { credentials: "include" }).then(r => r.ok ? r.json() : { count: 0 }),
    enabled: !!user,
    refetchInterval: 30000,
  });

  const totalBooks = books?.length ?? 0;
  const totalWords = (books ?? []).reduce((sum, b) => sum + countWords(b.articleContent), 0);
  const unreadNotifs = notifData?.count ?? 0;
  const unreadMsgs = msgData?.count ?? 0;

  // Sort books by createdAt desc, take last 6
  const recentBooks = [...(books ?? [])]
    .sort((a, b) => {
      const da = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const db = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return db - da;
    })
    .slice(0, 6);

  const today = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  // Translate the subscription label rather than blindly capitalising
  // the English-only enum value. The DB stores raw enum strings
  // (free/pro/premium/free_trial/active/canceled/expired); render
  // them through a per-locale map so Arabic users see Arabic words
  // and unknown values fall back to a sensible capitalised default.
  const { lang } = useLanguage();
  const ar = lang === "ar";
  const rawSub = user?.subscriptionPlan || user?.subscriptionStatus || "free";
  const SUB_LABELS: Record<string, { en: string; ar: string }> = {
    free:        { en: "Free",        ar: "مجاني" },
    pro:         { en: "Pro",         ar: "احترافي" },
    premium:     { en: "Premium",     ar: "بريميوم" },
    free_trial:  { en: "Free Trial",  ar: "تجربة مجانية" },
    active:      { en: "Active",      ar: "مفعّل" },
    canceled:    { en: "Canceled",    ar: "ملغى" },
    expired:     { en: "Expired",     ar: "منتهٍ" },
    monthly:     { en: "Monthly",     ar: "شهري" },
    yearly:      { en: "Yearly",      ar: "سنوي" },
  };
  const subEntry = SUB_LABELS[rawSub];
  const subLabel = subEntry
    ? (ar ? subEntry.ar : subEntry.en)
    : rawSub.charAt(0).toUpperCase() + rawSub.slice(1);

  return (
    <Layout isLanding darkNav>
      <div style={{
        minHeight: "100vh",
        background: BG,
        fontFamily: SF,
        color: T,
      }}>
        <div style={{ maxWidth: 1100, margin: "0 auto", padding: "24px clamp(14px, 4vw, 24px) 48px" }}>

          {/* ── Welcome Header ──────────────────────────────── */}
          <div style={{ marginBottom: 32 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
              <h1 style={{ fontSize: 28, fontWeight: 700, letterSpacing: "-0.03em", margin: 0 }}>
                Welcome back, {user?.displayName || user?.email?.split("@")[0] || "Writer"}
              </h1>
              <span style={{
                fontSize: 10,
                fontWeight: 700,
                letterSpacing: "0.06em",
                textTransform: "uppercase",
                background: subLabel === "Free" ? "rgba(255,255,255,0.1)" : "linear-gradient(135deg, #f59e0b, #f97316)",
                color: subLabel === "Free" ? TS : "#fff",
                borderRadius: 6,
                padding: "3px 8px",
                lineHeight: 1.6,
              }}>
                {subLabel}
              </span>
            </div>
            <p style={{ fontSize: 14, color: TS, marginTop: 4 }}>{today}</p>
          </div>

          {/* ── Quick Stats Row ─────────────────────────────── */}
          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
            gap: 14,
            marginBottom: 36,
          }}>
            <StatCard
              icon={<BookOpen style={{ width: 18, height: 18 }} />}
              label="Total Books"
              value={booksLoading ? "..." : formatNumber(totalBooks)}
              color="#8b5cf6"
            />
            <StatCard
              icon={<FileText style={{ width: 18, height: 18 }} />}
              label="Total Words Written"
              value={booksLoading ? "..." : formatNumber(totalWords)}
              color="#3b82f6"
            />
            <StatCard
              icon={<Bell style={{ width: 18, height: 18 }} />}
              label="Unread Notifications"
              value={formatNumber(unreadNotifs)}
              color="#f59e0b"
              highlight={unreadNotifs > 0}
            />
            <StatCard
              icon={<Mail style={{ width: 18, height: 18 }} />}
              label="Unread Messages"
              value={formatNumber(unreadMsgs)}
              color="#10b981"
              highlight={unreadMsgs > 0}
            />
          </div>

          {/* ── Recent Books ────────────────────────────────── */}
          <div style={{ marginBottom: 36 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <h2 style={{ fontSize: 18, fontWeight: 600, letterSpacing: "-0.02em", margin: 0, display: "flex", alignItems: "center", gap: 8 }}>
                <Clock style={{ width: 18, height: 18, color: TS }} />
                Recent Books
              </h2>
              {totalBooks > 6 && (
                <Link href="/" style={{ fontSize: 13, color: TS, textDecoration: "none" }}>
                  View all
                </Link>
              )}
            </div>

            {booksLoading ? (
              <div style={{ display: "flex", justifyContent: "center", padding: 48 }}>
                <Loader2 style={{ width: 24, height: 24, color: TS, animation: "spin 1s linear infinite" }} />
              </div>
            ) : (
              <div style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))",
                gap: 14,
              }}>
                {recentBooks.map(book => (
                  <BookCard key={book.id} book={book} />
                ))}
                {/* Create New Book card */}
                <div
                  onClick={() => navigate("/")}
                  style={{
                    background: C1,
                    border: `1px dashed ${B}`,
                    borderRadius: 12,
                    padding: 20,
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "center",
                    minHeight: 240,
                    cursor: "pointer",
                    transition: "border-color 0.2s, background 0.2s",
                  }}
                  onMouseEnter={e => {
                    e.currentTarget.style.borderColor = "rgba(255,255,255,0.2)";
                    e.currentTarget.style.background = C2;
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.borderColor = B;
                    e.currentTarget.style.background = C1;
                  }}
                >
                  <div style={{
                    width: 48,
                    height: 48,
                    borderRadius: 12,
                    background: "rgba(255,255,255,0.06)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    marginBottom: 12,
                  }}>
                    <Plus style={{ width: 22, height: 22, color: TS }} />
                  </div>
                  <span style={{ fontSize: 13, fontWeight: 600, color: TS }}>Create New Book</span>
                </div>

                {/* Join Book card */}
                <div
                  onClick={() => {
                    const code = prompt("Enter invite code:");
                    if (!code?.trim()) return;
                    fetch("/api/books/join", { method: "POST", headers: { "Content-Type": "application/json" }, credentials: "include", body: JSON.stringify({ code: code.trim() }) })
                      .then(r => r.json())
                      .then(data => {
                        if (data.success) { alert(`Joined "${data.bookTitle}" as ${data.role}!`); window.location.reload(); }
                        else alert(data.message || "Failed to join");
                      }).catch(() => alert("Failed to join book"));
                  }}
                  style={{
                    background: C1, border: `1px dashed ${B}`, borderRadius: 12, padding: 20,
                    display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
                    minHeight: 240, cursor: "pointer", transition: "border-color 0.2s, background 0.2s",
                  }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = "rgba(255,255,255,0.2)"; e.currentTarget.style.background = C2; }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = B; e.currentTarget.style.background = C1; }}
                >
                  <div style={{ width: 48, height: 48, borderRadius: 12, background: "rgba(255,255,255,0.06)", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 12 }}>
                    <Users style={{ width: 22, height: 22, color: TS }} />
                  </div>
                  <span style={{ fontSize: 13, fontWeight: 600, color: TS }}>Join a Book</span>
                  <span style={{ fontSize: 11, color: TD, marginTop: 4 }}>Enter invite code</span>
                </div>
              </div>
            )}

            {!booksLoading && totalBooks === 0 && (
              <p style={{ fontSize: 14, color: TD, textAlign: "center", padding: "20px 0" }}>
                You haven't created any books yet. Start your first one!
              </p>
            )}
          </div>

          {/* ── Quick Actions ───────────────────────────────── */}
          <div>
            <h2 style={{ fontSize: 18, fontWeight: 600, letterSpacing: "-0.02em", margin: "0 0 16px", display: "flex", alignItems: "center", gap: 8 }}>
              Quick Actions
            </h2>
            <div style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
              gap: 12,
            }}>
              <ActionButton
                icon={<PenTool style={{ width: 16, height: 16 }} />}
                label="Write a new chapter"
                onClick={() => {
                  const latest = books?.[0];
                  navigate(latest ? `/books/${latest.id}` : "/");
                }}
              />
              <ActionButton
                icon={<Send style={{ width: 16, height: 16 }} />}
                label="Publish a book"
                onClick={() => {
                  const latest = books?.[0];
                  navigate(latest ? `/books/${latest.id}` : "/");
                }}
              />
              <ActionButton
                icon={<Library style={{ width: 16, height: 16 }} />}
                label="Visit Community Library"
                onClick={() => navigate("/library")}
              />
              <ActionButton
                icon={<Mail style={{ width: 16, height: 16 }} />}
                label="View Messages"
                onClick={() => navigate("/messages")}
              />
            </div>
          </div>

        </div>
      </div>

      {/* Spinner keyframe for loading state */}
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </Layout>
  );
}

/* ── Stat Card ─────────────────────────────────────────────── */
function StatCard({ icon, label, value, color, highlight }: {
  icon: React.ReactNode;
  label: string;
  value: string;
  color: string;
  highlight?: boolean;
}) {
  return (
    <div style={{
      background: C2,
      border: `1px solid ${highlight ? color + "44" : B}`,
      borderRadius: 12,
      padding: "18px 20px",
      transition: "border-color 0.2s",
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div>
          <p style={{ fontSize: 12, fontWeight: 500, color: TS, margin: 0, marginBottom: 6 }}>{label}</p>
          <p style={{ fontSize: 26, fontWeight: 700, margin: 0, letterSpacing: "-0.03em", color: highlight ? color : T }}>{value}</p>
        </div>
        <div style={{
          width: 36,
          height: 36,
          borderRadius: 10,
          background: color + "18",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color,
        }}>
          {icon}
        </div>
      </div>
    </div>
  );
}

/* ── Book Card ─────────────────────────────────────────────── */
function BookCard({ book }: { book: Book }) {
  return (
    <Link href={`/books/${book.id}`} style={{ textDecoration: "none", color: "inherit" }}>
      <div
        style={{
          background: C2,
          border: `1px solid ${B}`,
          borderRadius: 12,
          overflow: "hidden",
          cursor: "pointer",
          transition: "border-color 0.2s, transform 0.15s",
        }}
        onMouseEnter={e => {
          e.currentTarget.style.borderColor = "rgba(255,255,255,0.15)";
          e.currentTarget.style.transform = "translateY(-2px)";
        }}
        onMouseLeave={e => {
          e.currentTarget.style.borderColor = B;
          e.currentTarget.style.transform = "translateY(0)";
        }}
      >
        {/* Cover */}
        <div style={{
          width: "100%",
          height: 160,
          background: book.coverImage
            ? `url(${book.coverImage}) center/cover no-repeat`
            : `linear-gradient(135deg, ${book.spineColor || "#333"}, #111)`,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}>
          {!book.coverImage && (
            <BookOpen style={{ width: 32, height: 32, color: "rgba(255,255,255,0.2)" }} />
          )}
        </div>

        {/* Info */}
        <div style={{ padding: "12px 14px 14px" }}>
          <p style={{
            fontSize: 13,
            fontWeight: 600,
            margin: 0,
            color: T,
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
          }}>
            {book.title}
          </p>
          <p style={{ fontSize: 11, color: TD, margin: "4px 0 0" }}>
            {formatDate(book.createdAt)}
          </p>
        </div>
      </div>
    </Link>
  );
}

/* ── Action Button ─────────────────────────────────────────── */
function ActionButton({ icon, label, onClick }: {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 10,
        background: C2,
        border: `1px solid ${B}`,
        borderRadius: 10,
        padding: "14px 18px",
        color: T,
        fontSize: 13,
        fontWeight: 500,
        fontFamily: SF,
        cursor: "pointer",
        transition: "background 0.2s, border-color 0.2s",
      }}
      onMouseEnter={e => {
        e.currentTarget.style.background = "#1a1a1a";
        e.currentTarget.style.borderColor = "rgba(255,255,255,0.15)";
      }}
      onMouseLeave={e => {
        e.currentTarget.style.background = C2;
        e.currentTarget.style.borderColor = B;
      }}
    >
      <span style={{ color: TS }}>{icon}</span>
      {label}
    </button>
  );
}
