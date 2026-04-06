import { useState } from "react";
import { useLocation } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/contexts/auth-context";
import { useToast } from "@/hooks/use-toast";

// ─── Types ──────────────────────────────────────────────────────────────────

interface AdminStats {
  totalUsers: number;
  totalBooks: number;
  publishedBooks: number;
  totalChapters: number;
  openSupportTickets: number;
}

interface AdminUser {
  id: number;
  email: string | null;
  displayName: string | null;
  avatarUrl: string | null;
  subscriptionStatus: string | null;
  subscriptionPlan: string | null;
  subscriptionEndDate: string | null;
  googleId: string | null;
  appleId: string | null;
  createdAt: string | null;
}

interface AdminBook {
  id: number;
  title: string;
  authorDisplayName: string | null;
  genre: string | null;
  viewCount: number;
  isPublished: boolean;
  createdAt: string | null;
}

interface SupportMessage {
  id: number;
  name: string;
  email: string;
  subject: string;
  message: string;
  category: string | null;
  priority: string | null;
  status: string | null;
  userId: number | null;
  read: boolean | null;
  createdAt: string | null;
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const S = {
  page: {
    minHeight: "100vh",
    background: "#000",
    color: "#fff",
    fontFamily: "'Inter', sans-serif",
    padding: "0 0 80px",
  } as React.CSSProperties,

  header: {
    borderBottom: "1px solid rgba(255,255,255,0.08)",
    padding: "24px 40px",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 16,
  } as React.CSSProperties,

  title: {
    fontSize: 22,
    fontWeight: 700,
    letterSpacing: "-0.5px",
    color: "#fff",
    display: "flex",
    alignItems: "center",
    gap: 10,
  } as React.CSSProperties,

  badge: {
    background: "rgba(255,255,255,0.08)",
    border: "1px solid rgba(255,255,255,0.12)",
    borderRadius: 6,
    padding: "2px 10px",
    fontSize: 11,
    fontWeight: 600,
    color: "rgba(255,255,255,0.5)",
    letterSpacing: "0.05em",
    textTransform: "uppercase" as const,
  },

  body: {
    maxWidth: 1200,
    margin: "0 auto",
    padding: "32px 40px",
  } as React.CSSProperties,

  tabs: {
    display: "flex",
    gap: 4,
    marginBottom: 32,
    borderBottom: "1px solid rgba(255,255,255,0.08)",
    paddingBottom: 0,
  } as React.CSSProperties,

  statsGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(5, 1fr)",
    gap: 16,
    marginBottom: 40,
  } as React.CSSProperties,

  statCard: {
    background: "rgba(255,255,255,0.04)",
    border: "1px solid rgba(255,255,255,0.08)",
    borderRadius: 12,
    padding: "20px 24px",
  } as React.CSSProperties,

  table: {
    width: "100%",
    borderCollapse: "collapse" as const,
  },

  th: {
    textAlign: "left" as const,
    padding: "10px 16px",
    fontSize: 11,
    fontWeight: 600,
    color: "rgba(255,255,255,0.35)",
    letterSpacing: "0.06em",
    textTransform: "uppercase" as const,
    borderBottom: "1px solid rgba(255,255,255,0.08)",
  },

  td: {
    padding: "14px 16px",
    fontSize: 13.5,
    color: "rgba(255,255,255,0.8)",
    borderBottom: "1px solid rgba(255,255,255,0.05)",
    verticalAlign: "top" as const,
  },

  btn: (variant: "danger" | "default" | "success" | "ghost") => ({
    borderRadius: 7,
    padding: "6px 14px",
    fontSize: 12,
    fontWeight: 600,
    cursor: "pointer",
    transition: "opacity .15s",
    background:
      variant === "danger"  ? "rgba(239,68,68,0.18)"  :
      variant === "success" ? "rgba(34,197,94,0.18)"  :
      variant === "ghost"   ? "transparent"            :
                              "rgba(255,255,255,0.1)",
    color:
      variant === "danger"  ? "#f87171" :
      variant === "success" ? "#4ade80" :
      variant === "ghost"   ? "rgba(255,255,255,0.45)" :
                              "#fff",
    border: variant === "ghost" ? "1px solid rgba(255,255,255,0.1)" : "none",
  } as React.CSSProperties),
};

// ─── Tab Button ──────────────────────────────────────────────────────────────

function TabBtn({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      style={{
        background: "none",
        border: "none",
        cursor: "pointer",
        padding: "10px 20px",
        fontSize: 14,
        fontWeight: active ? 600 : 400,
        color: active ? "#fff" : "rgba(255,255,255,0.4)",
        borderBottom: active ? "2px solid #fff" : "2px solid transparent",
        marginBottom: -1,
        transition: "all .15s",
      }}
    >
      {label}
    </button>
  );
}

// ─── Stat Card ───────────────────────────────────────────────────────────────

function StatCard({ label, value, icon }: { label: string; value: number; icon: string }) {
  return (
    <div style={S.statCard}>
      <div style={{ fontSize: 22, marginBottom: 8 }}>{icon}</div>
      <div style={{ fontSize: 28, fontWeight: 700, letterSpacing: "-1px", marginBottom: 4 }}>
        {value.toLocaleString()}
      </div>
      <div style={{ fontSize: 12, color: "rgba(255,255,255,0.4)", fontWeight: 500 }}>{label}</div>
    </div>
  );
}

// ─── Users Tab ───────────────────────────────────────────────────────────────

function UsersTab() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [grantModal, setGrantModal] = useState<AdminUser | null>(null);
  const [plan, setPlan] = useState("pro");
  const [months, setMonths] = useState(1);

  const { data: users = [], isLoading } = useQuery<AdminUser[]>({
    queryKey: ["/api/admin/users"],
    queryFn: () => fetch("/api/admin/users").then(r => r.json()),
  });

  const deleteUser = useMutation({
    mutationFn: (id: number) => fetch(`/api/admin/users/${id}`, { method: "DELETE" }).then(r => r.json()),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/admin/users"] }); qc.invalidateQueries({ queryKey: ["/api/admin/stats"] }); toast({ title: "User deleted" }); },
  });

  const grantSub = useMutation({
    mutationFn: ({ id, plan, months }: { id: number; plan: string; months: number }) => {
      const end = new Date();
      end.setMonth(end.getMonth() + months);
      return fetch(`/api/admin/users/${id}/subscription`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subscriptionStatus: "active", subscriptionPlan: plan, subscriptionEndDate: end.toISOString() }),
      }).then(r => r.json());
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/admin/users"] }); setGrantModal(null); toast({ title: "Subscription granted" }); },
  });

  const revokeSub = useMutation({
    mutationFn: (id: number) => fetch(`/api/admin/users/${id}/subscription`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ subscriptionStatus: null, subscriptionPlan: null, subscriptionEndDate: null }),
    }).then(r => r.json()),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/admin/users"] }); toast({ title: "Subscription revoked" }); },
  });

  if (isLoading) return <Spinner />;

  return (
    <>
      <div style={{ overflowX: "auto" }}>
        <table style={S.table}>
          <thead>
            <tr>
              <th style={S.th}>User</th>
              <th style={S.th}>Email</th>
              <th style={S.th}>Subscription</th>
              <th style={S.th}>Providers</th>
              <th style={S.th}>Joined</th>
              <th style={S.th}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {users.map(u => (
              <tr key={u.id}>
                <td style={S.td}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    {u.avatarUrl
                      ? <img src={u.avatarUrl} style={{ width: 30, height: 30, borderRadius: "50%", objectFit: "cover" }} />
                      : <div style={{ width: 30, height: 30, borderRadius: "50%", background: "rgba(255,255,255,0.1)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 700 }}>{(u.displayName || u.email || "?")[0].toUpperCase()}</div>
                    }
                    <span style={{ fontWeight: 500 }}>{u.displayName || "—"}</span>
                  </div>
                </td>
                <td style={{ ...S.td, color: "rgba(255,255,255,0.5)", fontSize: 12 }}>{u.email || "—"}</td>
                <td style={S.td}>
                  {u.subscriptionStatus === "active"
                    ? <span style={{ background: "rgba(34,197,94,0.15)", color: "#4ade80", borderRadius: 5, padding: "2px 8px", fontSize: 11, fontWeight: 600 }}>{u.subscriptionPlan?.toUpperCase() || "PRO"}</span>
                    : <span style={{ color: "rgba(255,255,255,0.25)", fontSize: 12 }}>Free</span>
                  }
                </td>
                <td style={{ ...S.td, fontSize: 12 }}>
                  {[u.googleId && "Google", u.appleId && "Apple"].filter(Boolean).join(", ") || "Email"}
                </td>
                <td style={{ ...S.td, fontSize: 12, color: "rgba(255,255,255,0.4)" }}>
                  {u.createdAt ? new Date(u.createdAt).toLocaleDateString() : "—"}
                </td>
                <td style={S.td}>
                  <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                    {u.subscriptionStatus === "active"
                      ? <button style={S.btn("ghost")} onClick={() => revokeSub.mutate(u.id)}>Revoke Sub</button>
                      : <button style={S.btn("success")} onClick={() => { setGrantModal(u); setPlan("pro"); setMonths(1); }}>Grant Sub</button>
                    }
                    <button
                      style={S.btn("danger")}
                      onClick={() => { if (confirm(`Delete user ${u.email}?`)) deleteUser.mutate(u.id); }}
                    >Delete</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {grantModal && (
        <Modal title={`Grant Subscription — ${grantModal.displayName || grantModal.email}`} onClose={() => setGrantModal(null)}>
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <label style={{ fontSize: 13, color: "rgba(255,255,255,0.6)" }}>
              Plan
              <select value={plan} onChange={e => setPlan(e.target.value)} style={inputStyle}>
                <option value="pro">Pro</option>
                <option value="premium">Premium</option>
              </select>
            </label>
            <label style={{ fontSize: 13, color: "rgba(255,255,255,0.6)" }}>
              Duration (months)
              <input type="number" min={1} max={120} value={months} onChange={e => setMonths(Number(e.target.value))} style={inputStyle} />
            </label>
            <button
              style={{ ...S.btn("success"), padding: "10px", fontSize: 14, width: "100%" }}
              onClick={() => grantSub.mutate({ id: grantModal.id, plan, months })}
              disabled={grantSub.isPending}
            >
              {grantSub.isPending ? "Saving…" : "Grant Subscription"}
            </button>
          </div>
        </Modal>
      )}
    </>
  );
}

// ─── Books Tab ───────────────────────────────────────────────────────────────

function BooksTab() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [, setLocation] = useLocation();

  const { data: books = [], isLoading } = useQuery<AdminBook[]>({
    queryKey: ["/api/public/books"],
    queryFn: () => fetch("/api/public/books").then(r => r.json()),
  });

  const deleteBook = useMutation({
    mutationFn: (id: number) => fetch(`/api/admin/books/${id}`, { method: "DELETE" }).then(r => r.json()),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/public/books"] }); qc.invalidateQueries({ queryKey: ["/api/admin/stats"] }); toast({ title: "Book deleted" }); },
  });

  if (isLoading) return <Spinner />;

  return (
    <div style={{ overflowX: "auto" }}>
      <table style={S.table}>
        <thead>
          <tr>
            <th style={S.th}>Title</th>
            <th style={S.th}>Author</th>
            <th style={S.th}>Genre</th>
            <th style={S.th}>Views</th>
            <th style={S.th}>Actions</th>
          </tr>
        </thead>
        <tbody>
          {books.map((b: any) => (
            <tr key={b.id}>
              <td style={{ ...S.td, fontWeight: 500 }}>
                <span
                  onClick={() => setLocation(`/read/${b.id}`)}
                  style={{ cursor: "pointer", textDecoration: "underline", textDecorationColor: "rgba(255,255,255,0.2)" }}
                >{b.title}</span>
              </td>
              <td style={{ ...S.td, color: "rgba(255,255,255,0.5)", fontSize: 12 }}>{b.authorDisplayName || "—"}</td>
              <td style={{ ...S.td, color: "rgba(255,255,255,0.4)", fontSize: 12 }}>{b.genre || "—"}</td>
              <td style={{ ...S.td, color: "rgba(255,255,255,0.5)", fontSize: 12 }}>{(b.viewCount ?? 0).toLocaleString()}</td>
              <td style={S.td}>
                <button
                  style={S.btn("danger")}
                  onClick={() => { if (confirm(`Delete "${b.title}"?`)) deleteBook.mutate(b.id); }}
                >Delete</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ─── Support Tab ─────────────────────────────────────────────────────────────

function SupportTab() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [expanded, setExpanded] = useState<number | null>(null);
  const [filter, setFilter] = useState<"all" | "open" | "closed">("all");

  const { data: messages = [], isLoading } = useQuery<SupportMessage[]>({
    queryKey: ["/api/admin/support"],
    queryFn: () => fetch("/api/admin/support").then(r => r.json()),
  });

  const update = useMutation({
    mutationFn: ({ id, ...updates }: { id: number; read?: boolean; status?: string }) =>
      fetch(`/api/admin/support/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
      }).then(r => r.json()),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["/api/admin/support"] }),
  });

  const filtered = messages.filter(m =>
    filter === "all" ? true : filter === "open" ? m.status === "open" : m.status !== "open"
  );

  if (isLoading) return <Spinner />;

  const priorityColor = (p: string | null) =>
    p === "urgent" ? "#f87171" : p === "high" ? "#fb923c" : "rgba(255,255,255,0.3)";

  return (
    <div>
      <div style={{ display: "flex", gap: 8, marginBottom: 20 }}>
        {(["all", "open", "closed"] as const).map(f => (
          <button key={f} onClick={() => setFilter(f)} style={{
            ...S.btn(filter === f ? "default" : "ghost"),
            padding: "6px 16px",
            fontSize: 12,
            textTransform: "capitalize",
          }}>{f}</button>
        ))}
        <span style={{ marginLeft: "auto", color: "rgba(255,255,255,0.3)", fontSize: 13, alignSelf: "center" }}>
          {filtered.length} ticket{filtered.length !== 1 ? "s" : ""}
        </span>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {filtered.map(m => (
          <div
            key={m.id}
            style={{
              background: m.read ? "rgba(255,255,255,0.03)" : "rgba(255,255,255,0.06)",
              border: `1px solid ${m.read ? "rgba(255,255,255,0.06)" : "rgba(255,255,255,0.12)"}`,
              borderRadius: 10,
              overflow: "hidden",
            }}
          >
            <div
              style={{ padding: "14px 18px", cursor: "pointer", display: "flex", alignItems: "flex-start", gap: 14 }}
              onClick={() => {
                setExpanded(expanded === m.id ? null : m.id);
                if (!m.read) update.mutate({ id: m.id, read: true });
              }}
            >
              {!m.read && (
                <div style={{ width: 7, height: 7, borderRadius: "50%", background: "#fff", marginTop: 5, flexShrink: 0 }} />
              )}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", marginBottom: 4 }}>
                  <span style={{ fontWeight: 600, fontSize: 14 }}>{m.subject}</span>
                  {m.priority && m.priority !== "normal" && (
                    <span style={{ fontSize: 10, fontWeight: 700, color: priorityColor(m.priority), textTransform: "uppercase", letterSpacing: "0.05em" }}>
                      {m.priority}
                    </span>
                  )}
                  <span style={{
                    fontSize: 10, fontWeight: 600, borderRadius: 4, padding: "1px 7px",
                    background: m.status === "open" ? "rgba(34,197,94,0.12)" : "rgba(255,255,255,0.06)",
                    color: m.status === "open" ? "#4ade80" : "rgba(255,255,255,0.3)",
                    textTransform: "uppercase", letterSpacing: "0.05em",
                  }}>{m.status || "open"}</span>
                  {m.category && <span style={{ fontSize: 11, color: "rgba(255,255,255,0.3)" }}>{m.category}</span>}
                </div>
                <div style={{ fontSize: 12, color: "rgba(255,255,255,0.4)" }}>
                  From: <b style={{ color: "rgba(255,255,255,0.6)" }}>{m.name}</b> &lt;{m.email}&gt;
                  {m.createdAt && <span style={{ marginLeft: 10 }}>{new Date(m.createdAt).toLocaleString()}</span>}
                </div>
              </div>
              <span style={{ color: "rgba(255,255,255,0.2)", fontSize: 18, flexShrink: 0, marginTop: 2 }}>
                {expanded === m.id ? "▲" : "▼"}
              </span>
            </div>

            {expanded === m.id && (
              <div style={{ borderTop: "1px solid rgba(255,255,255,0.06)", padding: "16px 18px" }}>
                <p style={{ fontSize: 14, lineHeight: 1.7, color: "rgba(255,255,255,0.75)", whiteSpace: "pre-wrap", margin: "0 0 16px" }}>
                  {m.message}
                </p>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  {m.status === "open" && (
                    <button style={S.btn("ghost")} onClick={() => update.mutate({ id: m.id, status: "closed" })}>
                      Mark Closed
                    </button>
                  )}
                  {m.status !== "open" && (
                    <button style={S.btn("ghost")} onClick={() => update.mutate({ id: m.id, status: "open" })}>
                      Reopen
                    </button>
                  )}
                  <a
                    href={`mailto:${m.email}?subject=Re: ${encodeURIComponent(m.subject)}`}
                    style={{ ...S.btn("default"), textDecoration: "none", display: "inline-flex", alignItems: "center" }}
                  >Reply via Email</a>
                </div>
              </div>
            )}
          </div>
        ))}

        {filtered.length === 0 && (
          <div style={{ textAlign: "center", padding: "60px 0", color: "rgba(255,255,255,0.25)", fontSize: 14 }}>
            No tickets found
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Shared helpers ───────────────────────────────────────────────────────────

function Spinner() {
  return (
    <div style={{ textAlign: "center", padding: "60px 0", color: "rgba(255,255,255,0.25)" }}>
      Loading…
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  display: "block",
  width: "100%",
  marginTop: 6,
  background: "rgba(255,255,255,0.06)",
  border: "1px solid rgba(255,255,255,0.12)",
  borderRadius: 8,
  padding: "9px 12px",
  color: "#fff",
  fontSize: 14,
  outline: "none",
  boxSizing: "border-box",
};

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div
      style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div style={{ background: "#111", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 14, padding: 28, width: "100%", maxWidth: 400 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
          <span style={{ fontWeight: 700, fontSize: 16 }}>{title}</span>
          <button onClick={onClose} style={{ background: "none", border: "none", color: "rgba(255,255,255,0.4)", cursor: "pointer", fontSize: 20 }}>×</button>
        </div>
        {children}
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

type Tab = "overview" | "users" | "books" | "support";

export default function AdminPage() {
  const { user, isLoading: authLoading } = useAuth();
  const [, setLocation] = useLocation();
  const [tab, setTab] = useState<Tab>("overview");

  const { data: stats } = useQuery<AdminStats>({
    queryKey: ["/api/admin/stats"],
    queryFn: () => fetch("/api/admin/stats").then(r => r.json()),
    enabled: !!(user?.isAdmin),
  });

  if (authLoading) {
    return (
      <div style={{ ...S.page, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <span style={{ color: "rgba(255,255,255,0.3)" }}>Loading…</span>
      </div>
    );
  }

  if (!user?.isAdmin) {
    return (
      <div style={{ ...S.page, display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 16 }}>
        <div style={{ fontSize: 48 }}>🔒</div>
        <div style={{ fontSize: 18, fontWeight: 600 }}>Access Denied</div>
        <div style={{ fontSize: 14, color: "rgba(255,255,255,0.4)" }}>You don't have permission to view this page.</div>
        <button onClick={() => setLocation("/")} style={{ ...S.btn("default"), marginTop: 8, padding: "10px 24px" }}>Go Home</button>
      </div>
    );
  }

  return (
    <div style={S.page}>
      <div style={S.header}>
        <div style={S.title}>
          <span>⚙️ Admin Panel</span>
          <span style={S.badge}>Plotzy</span>
        </div>
        <button onClick={() => setLocation("/")} style={{ ...S.btn("ghost"), fontSize: 13 }}>← Back to App</button>
      </div>

      <div style={S.body}>
        {stats && (
          <div style={S.statsGrid}>
            <StatCard label="Total Users" value={stats.totalUsers} icon="👤" />
            <StatCard label="Total Books" value={stats.totalBooks} icon="📚" />
            <StatCard label="Published" value={stats.publishedBooks} icon="🌐" />
            <StatCard label="Chapters" value={stats.totalChapters} icon="📄" />
            <StatCard label="Open Tickets" value={stats.openSupportTickets} icon="🎫" />
          </div>
        )}

        <div style={S.tabs}>
          <TabBtn label="Overview" active={tab === "overview"} onClick={() => setTab("overview")} />
          <TabBtn label={`Users${stats ? ` (${stats.totalUsers})` : ""}`} active={tab === "users"} onClick={() => setTab("users")} />
          <TabBtn label={`Published Books${stats ? ` (${stats.publishedBooks})` : ""}`} active={tab === "books"} onClick={() => setTab("books")} />
          <TabBtn label={`Support${stats && stats.openSupportTickets > 0 ? ` (${stats.openSupportTickets})` : ""}`} active={tab === "support"} onClick={() => setTab("support")} />
        </div>

        {tab === "overview" && (
          <div style={{ color: "rgba(255,255,255,0.5)", fontSize: 14, lineHeight: 2 }}>
            <p>Welcome to the Plotzy admin panel. Use the tabs above to manage the platform:</p>
            <ul style={{ paddingLeft: 20 }}>
              <li><b style={{ color: "#fff" }}>Users</b> — view all accounts, grant or revoke subscriptions, delete users</li>
              <li><b style={{ color: "#fff" }}>Published Books</b> — manage any publicly published book, delete if needed</li>
              <li><b style={{ color: "#fff" }}>Support</b> — read and manage support tickets submitted by users</li>
            </ul>
          </div>
        )}

        {tab === "users"   && <UsersTab />}
        {tab === "books"   && <BooksTab />}
        {tab === "support" && <SupportTab />}
      </div>
    </div>
  );
}
