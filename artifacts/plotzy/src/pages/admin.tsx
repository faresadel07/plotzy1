import { useState, useRef } from "react";
import { useLocation } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/contexts/auth-context";
import { useToast } from "@/hooks/use-toast";
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, AreaChart, Area } from "recharts";

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
  suspended: boolean | null;
}

interface ActivityEvent {
  type: string;
  title: string;
  subtitle: string;
  time: string;
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
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 25;

  const { data: users = [], isLoading } = useQuery<AdminUser[]>({
    queryKey: ["/api/admin/users"],
    queryFn: () => fetch("/api/admin/users", { credentials: "include" }).then(r => r.json()),
  });

  const deleteUser = useMutation({
    mutationFn: (id: number) => fetch(`/api/admin/users/${id}`, { method: "DELETE", credentials: "include" }).then(r => r.json()),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/admin/users"] }); qc.invalidateQueries({ queryKey: ["/api/admin/stats"] }); toast({ title: "User deleted" }); },
    onError: () => toast({ title: "Failed to delete user", variant: "destructive" }),
  });

  const suspendUser = useMutation({
    mutationFn: ({ id, suspended }: { id: number; suspended: boolean }) =>
      fetch(`/api/admin/users/${id}/suspend`, {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ suspended }),
      }).then(r => r.json()),
    onSuccess: (_, v) => { qc.invalidateQueries({ queryKey: ["/api/admin/users"] }); toast({ title: v.suspended ? "User suspended" : "User unsuspended" }); },
    onError: () => toast({ title: "Failed to update user", variant: "destructive" }),
  });

  const grantSub = useMutation({
    mutationFn: ({ id, plan, months }: { id: number; plan: string; months: number }) => {
      const end = new Date();
      end.setMonth(end.getMonth() + months);
      return fetch(`/api/admin/users/${id}/subscription`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ subscriptionStatus: "active", subscriptionPlan: plan, subscriptionEndDate: end.toISOString() }),
      }).then(r => r.json());
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/admin/users"] }); setGrantModal(null); toast({ title: "Subscription granted" }); },
    onError: () => toast({ title: "Failed to grant subscription", variant: "destructive" }),
  });

  const revokeSub = useMutation({
    mutationFn: (id: number) => fetch(`/api/admin/users/${id}/subscription`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ subscriptionStatus: null, subscriptionPlan: null, subscriptionEndDate: null }),
    }).then(r => r.json()),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/admin/users"] }); toast({ title: "Subscription revoked" }); },
    onError: () => toast({ title: "Failed to revoke subscription", variant: "destructive" }),
  });

  const bulkSuspend = useMutation({
    mutationFn: ({ userIds, suspended }: { userIds: number[]; suspended: boolean }) =>
      fetch("/api/admin/users/bulk-suspend", { method: "POST", headers: { "Content-Type": "application/json" }, credentials: "include", body: JSON.stringify({ userIds, suspended }) }).then(r => r.json()),
    onSuccess: (d) => { qc.invalidateQueries({ queryKey: ["/api/admin/users"] }); setSelected(new Set()); toast({ title: `${d.count} users updated` }); },
  });

  const bulkDelete = useMutation({
    mutationFn: (userIds: number[]) =>
      fetch("/api/admin/users/bulk-delete", { method: "POST", headers: { "Content-Type": "application/json" }, credentials: "include", body: JSON.stringify({ userIds }) }).then(r => r.json()),
    onSuccess: (d) => { qc.invalidateQueries({ queryKey: ["/api/admin/users"] }); qc.invalidateQueries({ queryKey: ["/api/admin/stats"] }); setSelected(new Set()); toast({ title: `${d.count} users deleted` }); },
  });

  const toggleSelect = (id: number) => {
    const next = new Set(selected);
    next.has(id) ? next.delete(id) : next.add(id);
    setSelected(next);
  };
  const toggleAll = () => {
    if (selected.size === paged.length) setSelected(new Set());
    else setSelected(new Set(paged.map(u => u.id)));
  };

  const filtered = users.filter(u => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (u.displayName || "").toLowerCase().includes(q) || (u.email || "").toLowerCase().includes(q);
  });
  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const paged = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  if (isLoading) return <Spinner />;

  return (
    <>
      {/* Toolbar: Search + Bulk actions + Export */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: 10, marginBottom: 16, alignItems: "center" }}>
        <input
          value={search}
          onChange={e => { setSearch(e.target.value); setPage(1); }}
          placeholder="Search by name or email…"
          style={{ ...inputStyle, width: 280, display: "inline-block" }}
        />
        {search && (
          <span style={{ fontSize: 12, color: "rgba(255,255,255,0.35)" }}>
            {filtered.length} of {users.length}
          </span>
        )}

        {/* Bulk actions — show only when items are selected */}
        {selected.size > 0 && (
          <div style={{ display: "flex", gap: 6, alignItems: "center", marginLeft: 8, padding: "4px 12px", background: "rgba(255,255,255,0.04)", borderRadius: 8, border: "1px solid rgba(255,255,255,0.08)" }}>
            <span style={{ fontSize: 12, color: "rgba(255,255,255,0.5)", marginRight: 4 }}>{selected.size} selected</span>
            <button style={S.btn("ghost")} onClick={() => bulkSuspend.mutate({ userIds: [...selected], suspended: true })}>Suspend All</button>
            <button style={S.btn("ghost")} onClick={() => bulkSuspend.mutate({ userIds: [...selected], suspended: false })}>Unsuspend All</button>
            <button style={S.btn("danger")} onClick={() => { if (confirm(`Delete ${selected.size} users?`)) bulkDelete.mutate([...selected]); }}>Delete All</button>
            <button style={{ ...S.btn("ghost"), color: "rgba(255,255,255,0.3)" }} onClick={() => setSelected(new Set())}>✕</button>
          </div>
        )}

        {/* CSV export */}
        <a href="/api/admin/export/users.csv" download style={{ marginLeft: "auto", ...S.btn("ghost"), textDecoration: "none", display: "inline-flex", alignItems: "center", gap: 4 }}>
          ↓ Export CSV
        </a>
      </div>

      <div style={{ overflowX: "auto" }}>
        <table style={S.table}>
          <thead>
            <tr>
              <th style={{ ...S.th, width: 36 }}><input type="checkbox" checked={selected.size === paged.length && paged.length > 0} onChange={toggleAll} style={{ accentColor: "#fff" }} /></th>
              <th style={S.th}>User</th>
              <th style={S.th}>Email</th>
              <th style={S.th}>Status</th>
              <th style={S.th}>Subscription</th>
              <th style={S.th}>Joined</th>
              <th style={S.th}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {paged.map(u => (
              <tr key={u.id} style={{ opacity: u.suspended ? 0.55 : 1 }}>
                <td style={{ ...S.td, width: 36 }}><input type="checkbox" checked={selected.has(u.id)} onChange={() => toggleSelect(u.id)} style={{ accentColor: "#fff" }} /></td>
                <td style={S.td}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    {u.avatarUrl
                      ? <img src={u.avatarUrl} loading="lazy" style={{ width: 30, height: 30, borderRadius: "50%", objectFit: "cover" }} />
                      : <div style={{ width: 30, height: 30, borderRadius: "50%", background: "rgba(255,255,255,0.1)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 700 }}>{(u.displayName || u.email || "?")[0].toUpperCase()}</div>
                    }
                    <span style={{ fontWeight: 500 }}>{u.displayName || "—"}</span>
                  </div>
                </td>
                <td style={{ ...S.td, color: "rgba(255,255,255,0.5)", fontSize: 12 }}>{u.email || "—"}</td>
                <td style={S.td}>
                  {u.suspended
                    ? <span style={{ background: "rgba(239,68,68,0.15)", color: "#f87171", borderRadius: 5, padding: "2px 8px", fontSize: 11, fontWeight: 600 }}>SUSPENDED</span>
                    : <span style={{ background: "rgba(34,197,94,0.1)", color: "#4ade80", borderRadius: 5, padding: "2px 8px", fontSize: 11, fontWeight: 600 }}>ACTIVE</span>
                  }
                </td>
                <td style={S.td}>
                  {u.subscriptionStatus === "active"
                    ? <span style={{ background: "rgba(34,197,94,0.15)", color: "#4ade80", borderRadius: 5, padding: "2px 8px", fontSize: 11, fontWeight: 600 }}>{u.subscriptionPlan?.toUpperCase() || "PRO"}</span>
                    : <span style={{ color: "rgba(255,255,255,0.25)", fontSize: 12 }}>Free</span>
                  }
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
                      style={S.btn(u.suspended ? "success" : "ghost")}
                      onClick={() => suspendUser.mutate({ id: u.id, suspended: !u.suspended })}
                      disabled={suspendUser.isPending}
                    >{u.suspended ? "Unsuspend" : "Suspend"}</button>
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

      {/* Pagination */}
      {totalPages > 1 && (
        <div style={{ display: "flex", justifyContent: "center", gap: 6, marginTop: 16, alignItems: "center" }}>
          <button style={S.btn("ghost")} disabled={page === 1} onClick={() => setPage(p => p - 1)}>← Prev</button>
          <span style={{ fontSize: 12, color: "rgba(255,255,255,0.4)", padding: "0 10px" }}>Page {page} of {totalPages}</span>
          <button style={S.btn("ghost")} disabled={page === totalPages} onClick={() => setPage(p => p + 1)}>Next →</button>
        </div>
      )}

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

// ─── Activity Tab ─────────────────────────────────────────────────────────────

const EVENT_ICONS: Record<string, string> = { user: "👤", book: "📖", support: "🎫" };
const EVENT_COLORS: Record<string, string> = { user: "#818cf8", book: "#34d399", support: "#fb923c" };

function ActivityTab() {
  const { data: events = [], isLoading } = useQuery<ActivityEvent[]>({
    queryKey: ["/api/admin/activity"],
    queryFn: () => fetch("/api/admin/activity", { credentials: "include" }).then(r => r.json()),
    refetchInterval: 60000,
  });

  if (isLoading) return <Spinner />;
  if (!events.length) return (
    <div style={{ textAlign: "center", padding: "60px 0", color: "rgba(255,255,255,0.3)", fontSize: 14 }}>
      No activity yet.
    </div>
  );

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
      {events.map((e, i) => (
        <div key={i} style={{
          display: "flex", alignItems: "flex-start", gap: 16,
          padding: "14px 0", borderBottom: "1px solid rgba(255,255,255,0.05)",
        }}>
          <div style={{
            width: 36, height: 36, borderRadius: "50%", flexShrink: 0,
            background: `${EVENT_COLORS[e.type] || "#fff"}18`,
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 16, marginTop: 2,
          }}>{EVENT_ICONS[e.type] || "•"}</div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: "#fff", marginBottom: 2 }}>{e.title}</div>
            <div style={{ fontSize: 12, color: "rgba(255,255,255,0.4)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{e.subtitle}</div>
          </div>
          <div style={{ fontSize: 11, color: "rgba(255,255,255,0.25)", flexShrink: 0, marginTop: 3 }}>
            {e.time ? new Date(e.time).toLocaleString() : "—"}
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Banner Tab ───────────────────────────────────────────────────────────────

function BannerTab() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [message, setMessage] = useState("");
  const [color, setColor] = useState("default");

  const { data: current } = useQuery<{ message: string | null; color: string | null }>({
    queryKey: ["/api/banner"],
    queryFn: () => fetch("/api/banner").then(r => r.json()),
  });

  const setBanner = useMutation({
    mutationFn: () => fetch("/api/admin/banner", {
      method: "POST", headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ message, color }),
    }).then(r => r.json()),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/banner"] }); toast({ title: "Banner published!" }); setMessage(""); },
    onError: () => toast({ title: "Failed to publish banner", variant: "destructive" }),
  });

  const removeBanner = useMutation({
    mutationFn: () => fetch("/api/admin/banner", { method: "DELETE", credentials: "include" }).then(r => r.json()),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/banner"] }); toast({ title: "Banner removed" }); },
    onError: () => toast({ title: "Failed to remove banner", variant: "destructive" }),
  });

  const COLORS = [
    { value: "default", label: "Dark (default)", bg: "#1a1a1a", fg: "#fff" },
    { value: "info",    label: "Blue",            bg: "#1e40af", fg: "#fff" },
    { value: "success", label: "Green",           bg: "#166534", fg: "#fff" },
    { value: "warning", label: "Yellow",          bg: "#92400e", fg: "#fef08a" },
    { value: "danger",  label: "Red",             bg: "#991b1b", fg: "#fff" },
  ];

  const selectedColor = COLORS.find(c => c.value === color) || COLORS[0];

  return (
    <div style={{ maxWidth: 600 }}>
      {/* Current banner status */}
      <div style={{ marginBottom: 28, padding: 20, background: "rgba(255,255,255,0.04)", borderRadius: 12, border: "1px solid rgba(255,255,255,0.08)" }}>
        <p style={{ fontSize: 12, color: "rgba(255,255,255,0.4)", marginBottom: 10, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em" }}>Current Banner</p>
        {current?.message ? (
          <div>
            <div style={{
              padding: "10px 16px", borderRadius: 8, marginBottom: 12,
              background: selectedColor.bg, color: selectedColor.fg,
              fontSize: 13, fontWeight: 500,
            }}>{current.message}</div>
            <button style={{ ...S.btn("danger"), fontSize: 12 }} onClick={() => removeBanner.mutate()} disabled={removeBanner.isPending}>
              {removeBanner.isPending ? "Removing…" : "Remove Banner"}
            </button>
          </div>
        ) : (
          <p style={{ color: "rgba(255,255,255,0.25)", fontSize: 13 }}>No active banner</p>
        )}
      </div>

      {/* New banner form */}
      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        <div>
          <p style={{ fontSize: 12, color: "rgba(255,255,255,0.4)", marginBottom: 8, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em" }}>New Banner</p>
          <textarea
            value={message}
            onChange={e => setMessage(e.target.value)}
            placeholder="Enter announcement message for all users…"
            rows={3}
            style={{ ...inputStyle, resize: "vertical" }}
          />
        </div>

        <div>
          <p style={{ fontSize: 12, color: "rgba(255,255,255,0.4)", marginBottom: 8, fontWeight: 600 }}>Color</p>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {COLORS.map(c => (
              <button
                key={c.value}
                onClick={() => setColor(c.value)}
                style={{
                  padding: "6px 14px", borderRadius: 8, fontSize: 12, cursor: "pointer",
                  background: c.bg, color: c.fg,
                  border: color === c.value ? "2px solid #fff" : "2px solid transparent",
                  fontWeight: color === c.value ? 700 : 400,
                }}
              >{c.label}</button>
            ))}
          </div>
        </div>

        {/* Preview */}
        {message && (
          <div style={{
            padding: "10px 16px", borderRadius: 8, fontSize: 13, fontWeight: 500,
            background: selectedColor.bg, color: selectedColor.fg,
          }}>
            📢 {message}
          </div>
        )}

        <button
          style={{ ...S.btn("default"), padding: "10px 24px", fontSize: 14, alignSelf: "flex-start" }}
          onClick={() => setBanner.mutate()}
          disabled={!message.trim() || setBanner.isPending}
        >
          {setBanner.isPending ? "Publishing…" : "Publish Banner"}
        </button>
      </div>
    </div>
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
    onError: () => toast({ title: "Failed to delete book", variant: "destructive" }),
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

// ─── Chart Colors ─────────────────────────────────────────────────────────────

const COLORS = ["#818cf8", "#34d399", "#fbbf24", "#f87171", "#60a5fa", "#a78bfa"];
const chartTooltipStyle = { backgroundColor: "#1a1a2e", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, color: "#fff", fontSize: 12 };

function ChartCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 14, padding: "20px 24px", marginBottom: 20 }}>
      <div style={{ fontSize: 14, fontWeight: 600, color: "rgba(255,255,255,0.7)", marginBottom: 16 }}>{title}</div>
      {children}
    </div>
  );
}

function MiniStat({ label, value, sub }: { label: string; value: string | number; sub?: string }) {
  return (
    <div style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 10, padding: "16px 20px", flex: 1 }}>
      <div style={{ fontSize: 11, color: "rgba(255,255,255,0.4)", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 6 }}>{label}</div>
      <div style={{ fontSize: 24, fontWeight: 700, letterSpacing: "-0.5px" }}>{typeof value === "number" ? value.toLocaleString() : value}</div>
      {sub && <div style={{ fontSize: 11, color: "rgba(255,255,255,0.3)", marginTop: 4 }}>{sub}</div>}
    </div>
  );
}

// ─── 1. ANALYTICS TAB ─────────────────────────────────────────────────────────

function AnalyticsTab() {
  const [days, setDays] = useState(30);
  const { data: overview } = useQuery<any>({
    queryKey: ["/api/admin/analytics/overview"],
    queryFn: () => fetch("/api/admin/analytics/overview", { credentials: "include" }).then(r => r.json()),
  });
  const { data: signups = [] } = useQuery<any[]>({
    queryKey: ["/api/admin/analytics/signups", days],
    queryFn: () => fetch(`/api/admin/analytics/signups?days=${days}`, { credentials: "include" }).then(r => r.json()),
  });
  const { data: writing = [] } = useQuery<any[]>({
    queryKey: ["/api/admin/analytics/writing-activity", days],
    queryFn: () => fetch(`/api/admin/analytics/writing-activity?days=${days}`, { credentials: "include" }).then(r => r.json()),
  });

  if (!overview) return <Spinner />;

  return (
    <div>
      <div style={{ display: "flex", gap: 12, marginBottom: 24, flexWrap: "wrap" }}>
        <MiniStat label="DAU" value={overview.dau} sub="Active today" />
        <MiniStat label="WAU" value={overview.wau} sub="Active this week" />
        <MiniStat label="MAU" value={overview.mau} sub="Active this month" />
        <MiniStat label="New Users (30d)" value={overview.newUsersMonth} />
        <MiniStat label="Words Written (30d)" value={overview.wordsWrittenMonth.toLocaleString()} />
      </div>

      {/* Date range selector */}
      <div style={{ display: "flex", gap: 6, marginBottom: 20, alignItems: "center" }}>
        <span style={{ fontSize: 12, color: "rgba(255,255,255,0.4)", marginRight: 4 }}>Range:</span>
        {[7, 30, 60, 90].map(d => (
          <button key={d} onClick={() => setDays(d)}
            style={{ padding: "4px 12px", borderRadius: 6, fontSize: 11, fontWeight: 600, cursor: "pointer", border: days === d ? "none" : "1px solid rgba(255,255,255,0.08)", background: days === d ? "#fff" : "transparent", color: days === d ? "#000" : "rgba(255,255,255,0.4)", transition: "all 0.15s" }}
          >{d}d</button>
        ))}
        <a href={`/api/admin/export/analytics.csv?days=${days}`} download style={{ marginLeft: "auto", ...S.btn("ghost"), textDecoration: "none", display: "inline-flex", alignItems: "center", gap: 4, fontSize: 11 }}>
          ↓ Export CSV
        </a>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
        <ChartCard title={`Daily Sign-ups (${days}d)`}>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={signups.map((r: any) => ({ day: r.day?.slice(5, 10), count: Number(r.count) }))}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
              <XAxis dataKey="day" tick={{ fill: "rgba(255,255,255,0.3)", fontSize: 10 }} />
              <YAxis tick={{ fill: "rgba(255,255,255,0.3)", fontSize: 10 }} />
              <Tooltip contentStyle={chartTooltipStyle} />
              <Bar dataKey="count" fill="#818cf8" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title={`Daily Writing Activity (${days}d)`}>
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={writing.map((r: any) => ({ day: r.day?.slice(5, 10), words: Number(r.words) }))}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
              <XAxis dataKey="day" tick={{ fill: "rgba(255,255,255,0.3)", fontSize: 10 }} />
              <YAxis tick={{ fill: "rgba(255,255,255,0.3)", fontSize: 10 }} />
              <Tooltip contentStyle={chartTooltipStyle} />
              <Area type="monotone" dataKey="words" stroke="#34d399" fill="rgba(52,211,153,0.15)" />
            </AreaChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>
    </div>
  );
}

// ─── 2. REVENUE TAB ───────────────────────────────────────────────────────────

function RevenueTab() {
  const { data } = useQuery<any>({
    queryKey: ["/api/admin/analytics/revenue"],
    queryFn: () => fetch("/api/admin/analytics/revenue", { credentials: "include" }).then(r => r.json()),
  });

  if (!data) return <Spinner />;

  const pieData = (data.tiers || []).map((t: any, i: number) => ({
    name: `${t.tier}/${t.plan}`,
    value: Number(t.count),
    color: COLORS[i % COLORS.length],
  }));

  return (
    <div>
      <div style={{ display: "flex", gap: 12, marginBottom: 24, flexWrap: "wrap" }}>
        <MiniStat label="MRR" value={`$${data.mrrDollars}`} sub="Monthly Recurring Revenue" />
        <MiniStat label="Active Subscribers" value={data.activeSubscribers} />
        <MiniStat label="Monthly Plans" value={data.monthlySubs} sub="@ $13/mo" />
        <MiniStat label="Yearly Plans" value={data.yearlySubs} sub="@ $99.99/yr" />
        <MiniStat label="Churned (30d)" value={data.churnedLast30Days} sub="Cancelled recently" />
      </div>

      <ChartCard title="Subscription Tier Breakdown">
        <div style={{ display: "flex", alignItems: "center", gap: 32 }}>
          <ResponsiveContainer width="50%" height={250}>
            <PieChart>
              <Pie data={pieData} cx="50%" cy="50%" innerRadius={60} outerRadius={100} paddingAngle={3} dataKey="value">
                {pieData.map((entry: any, i: number) => <Cell key={i} fill={entry.color} />)}
              </Pie>
              <Tooltip contentStyle={chartTooltipStyle} />
            </PieChart>
          </ResponsiveContainer>
          <div style={{ flex: 1 }}>
            {pieData.map((t: any, i: number) => (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
                <div style={{ width: 12, height: 12, borderRadius: 3, background: t.color }} />
                <span style={{ fontSize: 13, color: "rgba(255,255,255,0.7)" }}>{t.name}</span>
                <span style={{ marginLeft: "auto", fontWeight: 700 }}>{t.value}</span>
              </div>
            ))}
          </div>
        </div>
      </ChartCard>
    </div>
  );
}

// ─── 3. MODERATION TAB ────────────────────────────────────────────────────────

function ModerationTab() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [filter, setFilter] = useState<"pending" | "approved" | "rejected">("pending");
  const [flagBookId, setFlagBookId] = useState("");
  const [flagReason, setFlagReason] = useState("");

  const { data: flags = [] } = useQuery<any[]>({
    queryKey: ["/api/admin/flags", filter],
    queryFn: () => fetch(`/api/admin/flags?status=${filter}`, { credentials: "include" }).then(r => r.json()),
  });

  const createFlag = useMutation({
    mutationFn: () => fetch("/api/admin/flags", {
      method: "POST", headers: { "Content-Type": "application/json" }, credentials: "include",
      body: JSON.stringify({ bookId: Number(flagBookId), reason: flagReason }),
    }).then(r => r.json()),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/admin/flags"] }); toast({ title: "Book flagged" }); setFlagBookId(""); setFlagReason(""); },
  });

  const reviewFlag = useMutation({
    mutationFn: ({ id, status, reviewNote }: { id: number; status: string; reviewNote?: string }) =>
      fetch(`/api/admin/flags/${id}`, {
        method: "PATCH", headers: { "Content-Type": "application/json" }, credentials: "include",
        body: JSON.stringify({ status, reviewNote }),
      }).then(r => r.json()),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/admin/flags"] }); toast({ title: "Flag reviewed" }); },
  });

  return (
    <div>
      {/* Flag a book form */}
      <div style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 12, padding: 20, marginBottom: 24, display: "flex", gap: 12, alignItems: "flex-end" }}>
        <div style={{ flex: "0 0 100px" }}>
          <label style={{ fontSize: 11, color: "rgba(255,255,255,0.4)", fontWeight: 600 }}>Book ID</label>
          <input value={flagBookId} onChange={e => setFlagBookId(e.target.value)} style={inputStyle} placeholder="123" />
        </div>
        <div style={{ flex: 1 }}>
          <label style={{ fontSize: 11, color: "rgba(255,255,255,0.4)", fontWeight: 600 }}>Reason</label>
          <input value={flagReason} onChange={e => setFlagReason(e.target.value)} style={inputStyle} placeholder="Inappropriate content, copyright claim..." />
        </div>
        <button onClick={() => createFlag.mutate()} disabled={!flagBookId || !flagReason} style={{ ...S.btn("danger"), padding: "10px 20px", opacity: (!flagBookId || !flagReason) ? 0.4 : 1 }}>Flag Book</button>
      </div>

      {/* Filter */}
      <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
        {(["pending", "approved", "rejected"] as const).map(s => (
          <button key={s} onClick={() => setFilter(s)} style={{ ...S.btn(filter === s ? "default" : "ghost"), textTransform: "capitalize" }}>{s}</button>
        ))}
      </div>

      {/* Flag list */}
      <table style={S.table}>
        <thead><tr>
          <th style={S.th}>Book</th><th style={S.th}>Author</th><th style={S.th}>Reason</th><th style={S.th}>Flagged</th><th style={S.th}>Actions</th>
        </tr></thead>
        <tbody>
          {flags.map((f: any) => (
            <tr key={f.id}>
              <td style={S.td}>{f.book_title || `#${f.book_id}`}</td>
              <td style={S.td}>{f.author_name || "—"}</td>
              <td style={S.td}>{f.reason}</td>
              <td style={S.td}>{f.created_at ? new Date(f.created_at).toLocaleDateString() : "—"}</td>
              <td style={S.td}>
                {f.status === "pending" && (
                  <div style={{ display: "flex", gap: 6 }}>
                    <button onClick={() => reviewFlag.mutate({ id: f.id, status: "approved", reviewNote: "Content approved" })} style={S.btn("success")}>Approve</button>
                    <button onClick={() => reviewFlag.mutate({ id: f.id, status: "rejected", reviewNote: "Unpublished for policy violation" })} style={S.btn("danger")}>Reject & Unpublish</button>
                  </div>
                )}
                {f.status !== "pending" && <span style={{ fontSize: 12, color: "rgba(255,255,255,0.3)", textTransform: "capitalize" }}>{f.status}</span>}
              </td>
            </tr>
          ))}
          {flags.length === 0 && (
            <tr><td colSpan={5} style={{ ...S.td, textAlign: "center", color: "rgba(255,255,255,0.2)", padding: 40 }}>No {filter} flags</td></tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

// ─── 4. ENGAGEMENT TAB ────────────────────────────────────────────────────────

function EngagementTab() {
  const [view, setView] = useState<"leaderboard" | "inactive" | "ai">("leaderboard");

  const { data: leaderboard = [] } = useQuery<any[]>({
    queryKey: ["/api/admin/analytics/leaderboard"],
    queryFn: () => fetch("/api/admin/analytics/leaderboard", { credentials: "include" }).then(r => r.json()),
    enabled: view === "leaderboard",
  });

  const { data: inactive = [] } = useQuery<any[]>({
    queryKey: ["/api/admin/analytics/inactive-users"],
    queryFn: () => fetch("/api/admin/analytics/inactive-users", { credentials: "include" }).then(r => r.json()),
    enabled: view === "inactive",
  });

  const { data: ai } = useQuery<any>({
    queryKey: ["/api/admin/analytics/ai-usage"],
    queryFn: () => fetch("/api/admin/analytics/ai-usage", { credentials: "include" }).then(r => r.json()),
    enabled: view === "ai",
  });

  return (
    <div>
      <div style={{ display: "flex", gap: 8, marginBottom: 20 }}>
        <button onClick={() => setView("leaderboard")} style={S.btn(view === "leaderboard" ? "default" : "ghost")}>Leaderboard</button>
        <button onClick={() => setView("inactive")} style={S.btn(view === "inactive" ? "default" : "ghost")}>Inactive Users</button>
        <button onClick={() => setView("ai")} style={S.btn(view === "ai" ? "default" : "ghost")}>AI Usage</button>
      </div>

      {view === "leaderboard" && (
        <table style={S.table}>
          <thead><tr>
            <th style={S.th}>#</th><th style={S.th}>User</th><th style={S.th}>Words Written</th><th style={S.th}>Streak</th><th style={S.th}>Published</th><th style={S.th}>Views</th>
          </tr></thead>
          <tbody>
            {leaderboard.map((u: any, i: number) => (
              <tr key={u.user_id}>
                <td style={S.td}>{i + 1}</td>
                <td style={S.td}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    {u.avatar_url && <img src={u.avatar_url} alt="" style={{ width: 24, height: 24, borderRadius: "50%" }} />}
                    <span>{u.display_name || u.email || "—"}</span>
                  </div>
                </td>
                <td style={{ ...S.td, fontWeight: 700, color: "#818cf8" }}>{Number(u.total_words_written || 0).toLocaleString()}</td>
                <td style={S.td}>{u.streak_days}d (best: {u.longest_streak}d)</td>
                <td style={S.td}>{u.total_books_published}</td>
                <td style={S.td}>{Number(u.total_views_received || 0).toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {view === "inactive" && (
        <table style={S.table}>
          <thead><tr>
            <th style={S.th}>User</th><th style={S.th}>Last Wrote</th><th style={S.th}>Words Total</th><th style={S.th}>Subscription</th><th style={S.th}>Joined</th>
          </tr></thead>
          <tbody>
            {inactive.map((u: any) => (
              <tr key={u.id}>
                <td style={S.td}>{u.display_name || u.email || "—"}</td>
                <td style={{ ...S.td, color: "#f87171" }}>{u.last_writing_date ? new Date(u.last_writing_date).toLocaleDateString() : "Never"}</td>
                <td style={S.td}>{Number(u.total_words_written || 0).toLocaleString()}</td>
                <td style={S.td}>{u.subscription_status || "free"}</td>
                <td style={S.td}>{u.created_at ? new Date(u.created_at).toLocaleDateString() : "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {view === "ai" && ai && (
        <div>
          <div style={{ display: "flex", gap: 12, marginBottom: 24, flexWrap: "wrap" }}>
            <MiniStat label="Total AI Calls" value={ai.totals.calls} />
            <MiniStat label="Total Cost" value={`$${ai.totals.costDollars}`} sub="Estimated" />
            <MiniStat label="Prompt Tokens" value={ai.totals.promptTokens.toLocaleString()} />
            <MiniStat label="Completion Tokens" value={ai.totals.completionTokens.toLocaleString()} />
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, marginBottom: 20 }}>
            <ChartCard title="Daily AI Cost (30d)">
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={(ai.dailyCost || []).map((r: any) => ({ day: r.day?.slice(5, 10), cost: (Number(r.cost_cents) / 100) }))}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                  <XAxis dataKey="day" tick={{ fill: "rgba(255,255,255,0.3)", fontSize: 10 }} />
                  <YAxis tick={{ fill: "rgba(255,255,255,0.3)", fontSize: 10 }} tickFormatter={v => `$${v}`} />
                  <Tooltip contentStyle={chartTooltipStyle} formatter={(v: any) => [`$${Number(v).toFixed(2)}`, "Cost"]} />
                  <Bar dataKey="cost" fill="#fbbf24" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </ChartCard>

            <ChartCard title="Cost by Model">
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie data={(ai.byModel || []).map((m: any, i: number) => ({ name: m.model, value: Number(m.cost_cents), color: COLORS[i % COLORS.length] }))} cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={3} dataKey="value">
                    {(ai.byModel || []).map((_: any, i: number) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Pie>
                  <Tooltip contentStyle={chartTooltipStyle} formatter={(v: any) => [`$${(Number(v) / 100).toFixed(2)}`, "Cost"]} />
                </PieChart>
              </ResponsiveContainer>
              <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginTop: 8, justifyContent: "center" }}>
                {(ai.byModel || []).map((m: any, i: number) => (
                  <span key={i} style={{ fontSize: 11, color: "rgba(255,255,255,0.5)", display: "flex", alignItems: "center", gap: 4 }}>
                    <span style={{ width: 8, height: 8, borderRadius: 2, background: COLORS[i % COLORS.length], display: "inline-block" }} />
                    {m.model} ({m.calls} calls)
                  </span>
                ))}
              </div>
            </ChartCard>
          </div>

          <ChartCard title="Top AI Consumers">
            <table style={S.table}>
              <thead><tr>
                <th style={S.th}>User</th><th style={S.th}>Calls</th><th style={S.th}>Tokens</th><th style={S.th}>Est. Cost</th>
              </tr></thead>
              <tbody>
                {(ai.perUser || []).map((u: any) => (
                  <tr key={u.user_id}>
                    <td style={S.td}>{u.display_name || u.email || `User #${u.user_id}`}</td>
                    <td style={S.td}>{Number(u.total_calls).toLocaleString()}</td>
                    <td style={S.td}>{(Number(u.total_prompt_tokens) + Number(u.total_completion_tokens)).toLocaleString()}</td>
                    <td style={{ ...S.td, fontWeight: 700, color: "#fbbf24" }}>${(Number(u.total_cost_cents) / 100).toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </ChartCard>
        </div>
      )}
    </div>
  );
}

// ─── 5. SYSTEM HEALTH TAB ─────────────────────────────────────────────────────

function SystemHealthTab() {
  const { data } = useQuery<any>({
    queryKey: ["/api/admin/analytics/system-health"],
    queryFn: () => fetch("/api/admin/analytics/system-health", { credentials: "include" }).then(r => r.json()),
    refetchInterval: 30000, // Auto-refresh every 30s
  });

  if (!data) return <Spinner />;

  const lat = data.latency || {};

  return (
    <div>
      <div style={{ display: "flex", gap: 12, marginBottom: 24, flexWrap: "wrap" }}>
        <MiniStat label="Total Requests (24h)" value={data.totalRequests} />
        <MiniStat label="Error Rate" value={`${data.errorRate}%`} sub={`${data.errorCount} errors`} />
        <MiniStat label="Avg Latency" value={`${Math.round(lat.avg_ms || 0)}ms`} />
        <MiniStat label="P95 Latency" value={`${Math.round(lat.p95_ms || 0)}ms`} />
        <MiniStat label="P99 Latency" value={`${Math.round(lat.p99_ms || 0)}ms`} />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, marginBottom: 20 }}>
        <ChartCard title="Requests Per Hour (24h)">
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={(data.hourlyTraffic || []).map((r: any) => ({
              hour: new Date(r.hour).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
              requests: Number(r.requests),
              errors: Number(r.errors),
            }))}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
              <XAxis dataKey="hour" tick={{ fill: "rgba(255,255,255,0.3)", fontSize: 10 }} />
              <YAxis tick={{ fill: "rgba(255,255,255,0.3)", fontSize: 10 }} />
              <Tooltip contentStyle={chartTooltipStyle} />
              <Area type="monotone" dataKey="requests" stroke="#60a5fa" fill="rgba(96,165,250,0.15)" />
              <Area type="monotone" dataKey="errors" stroke="#f87171" fill="rgba(248,113,113,0.15)" />
            </AreaChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Status Code Breakdown">
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={(data.statusBreakdown || []).map((r: any) => ({ code: String(r.status_code), count: Number(r.count) }))}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
              <XAxis dataKey="code" tick={{ fill: "rgba(255,255,255,0.3)", fontSize: 10 }} />
              <YAxis tick={{ fill: "rgba(255,255,255,0.3)", fontSize: 10 }} />
              <Tooltip contentStyle={chartTooltipStyle} />
              <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                {(data.statusBreakdown || []).map((r: any, i: number) => (
                  <Cell key={i} fill={Number(r.status_code) >= 500 ? "#f87171" : Number(r.status_code) >= 400 ? "#fbbf24" : "#34d399"} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      <ChartCard title="Slowest Endpoints (24h)">
        <table style={S.table}>
          <thead><tr>
            <th style={S.th}>Endpoint</th><th style={S.th}>Method</th><th style={S.th}>Hits</th><th style={S.th}>Avg (ms)</th><th style={S.th}>Max (ms)</th>
          </tr></thead>
          <tbody>
            {(data.slowestEndpoints || []).map((ep: any, i: number) => (
              <tr key={i}>
                <td style={{ ...S.td, fontFamily: "monospace", fontSize: 12 }}>{ep.path}</td>
                <td style={S.td}>{ep.method}</td>
                <td style={S.td}>{Number(ep.hits).toLocaleString()}</td>
                <td style={{ ...S.td, color: Number(ep.avg_ms) > 500 ? "#f87171" : Number(ep.avg_ms) > 200 ? "#fbbf24" : "#34d399", fontWeight: 600 }}>{ep.avg_ms}ms</td>
                <td style={S.td}>{ep.max_ms}ms</td>
              </tr>
            ))}
          </tbody>
        </table>
      </ChartCard>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

// ─── Tutorials Tab ──────────────────────────────────────────────────────────

interface AdminTutorial {
  id: number;
  title: string;
  description: string;
  videoUrl: string;
  thumbnailUrl: string | null;
  category: string;
  duration: string;
  sortOrder: number;
  published: boolean;
  createdAt: string | null;
}

const TUTORIAL_CATEGORIES = [
  "getting-started",
  "writing",
  "ai-tools",
  "publishing",
  "cover-design",
  "community",
  "advanced",
] as const;

const emptyTutorialForm = {
  title: "",
  description: "",
  videoUrl: "",
  thumbnailUrl: "",
  category: "getting-started" as string,
  duration: "",
  sortOrder: 0,
  published: true,
};

const CATEGORY_LABELS: Record<string, string> = {
  "getting-started": "Getting Started",
  "writing": "Writing",
  "ai-tools": "AI Tools",
  "publishing": "Publishing",
  "cover-design": "Cover Design",
  "community": "Community",
  "advanced": "Advanced",
};

function TutorialsTab() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState({ ...emptyTutorialForm });
  const [dragOver, setDragOver] = useState(false);
  const thumbInputRef = useRef<HTMLInputElement>(null);

  const { data: tutorials = [], isLoading } = useQuery<AdminTutorial[]>({
    queryKey: ["/api/admin/tutorials"],
    queryFn: () => fetch("/api/admin/tutorials", { credentials: "include" }).then(r => r.json()),
  });

  const createTutorial = useMutation({
    mutationFn: (data: typeof emptyTutorialForm) =>
      fetch("/api/admin/tutorials", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(data),
      }).then(r => { if (!r.ok) throw new Error("Failed"); return r.json(); }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/admin/tutorials"] });
      toast({ title: "Tutorial created" });
      setForm({ ...emptyTutorialForm });
      setShowForm(false);
    },
    onError: () => toast({ title: "Failed to create tutorial", variant: "destructive" }),
  });

  const updateTutorial = useMutation({
    mutationFn: ({ id, ...data }: Partial<AdminTutorial> & { id: number }) =>
      fetch(`/api/admin/tutorials/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(data),
      }).then(r => { if (!r.ok) throw new Error("Failed"); return r.json(); }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/admin/tutorials"] });
      toast({ title: "Tutorial updated" });
      setEditingId(null);
      setForm({ ...emptyTutorialForm });
    },
    onError: () => toast({ title: "Failed to update tutorial", variant: "destructive" }),
  });

  const deleteTutorial = useMutation({
    mutationFn: (id: number) =>
      fetch(`/api/admin/tutorials/${id}`, { method: "DELETE", credentials: "include" }).then(r => { if (!r.ok) throw new Error("Failed"); return r.json(); }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/admin/tutorials"] });
      toast({ title: "Tutorial deleted" });
    },
    onError: () => toast({ title: "Failed to delete tutorial", variant: "destructive" }),
  });

  const togglePublished = useMutation({
    mutationFn: ({ id, published }: { id: number; published: boolean }) =>
      fetch(`/api/admin/tutorials/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ published }),
      }).then(r => { if (!r.ok) throw new Error("Failed"); return r.json(); }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/admin/tutorials"] });
      toast({ title: "Tutorial updated" });
    },
    onError: () => toast({ title: "Failed to toggle published", variant: "destructive" }),
  });

  const startEdit = (t: AdminTutorial) => {
    setEditingId(t.id);
    setForm({
      title: t.title,
      description: t.description,
      videoUrl: t.videoUrl,
      thumbnailUrl: t.thumbnailUrl || "",
      category: t.category,
      duration: t.duration,
      sortOrder: t.sortOrder,
      published: t.published,
    });
    setShowForm(true);
  };

  const cancelForm = () => {
    setShowForm(false);
    setEditingId(null);
    setForm({ ...emptyTutorialForm });
  };

  const handleSubmit = () => {
    if (!form.title.trim() || !form.videoUrl.trim() || !form.duration.trim()) {
      toast({ title: "Title, Video URL, and Duration are required", variant: "destructive" });
      return;
    }
    if (editingId) {
      updateTutorial.mutate({ id: editingId, ...form });
    } else {
      createTutorial.mutate(form);
    }
  };

  /* Handle thumbnail file upload */
  const handleThumbFile = (file: File) => {
    if (!file.type.startsWith("image/")) { toast({ title: "Please select an image file", variant: "destructive" }); return; }
    const reader = new FileReader();
    reader.onload = (ev) => setForm(f => ({ ...f, thumbnailUrl: ev.target?.result as string }));
    reader.readAsDataURL(file);
  };

  /* Auto-extract YouTube thumbnail */
  const autoThumbnail = (url: string) => {
    const m = url.match(/(?:youtube\.com\/(?:watch\?v=|shorts\/|live\/)|youtu\.be\/)([A-Za-z0-9_-]+)/);
    if (m && !form.thumbnailUrl) {
      setForm(f => ({ ...f, thumbnailUrl: `https://img.youtube.com/vi/${m[1]}/hqdefault.jpg` }));
    }
  };

  if (isLoading) return <Spinner />;

  const lbl: React.CSSProperties = { fontSize: 11, color: "rgba(255,255,255,0.4)", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 5, display: "block" };

  return (
    <>
      {/* ── Header ── */}
      <div style={{ marginBottom: 20, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ fontSize: 13, color: "rgba(255,255,255,0.4)" }}>
          {tutorials.length} tutorial{tutorials.length !== 1 ? "s" : ""} · {tutorials.filter(t => t.published).length} published
        </div>
        {!showForm && (
          <button style={{ ...S.btn("default"), padding: "8px 18px", background: "#fff", color: "#000" }} onClick={() => { setEditingId(null); setForm({ ...emptyTutorialForm }); setShowForm(true); }}>
            + Add Tutorial
          </button>
        )}
      </div>

      {/* ── Add/Edit Form ── */}
      {showForm && (
        <div style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 14, padding: 24, marginBottom: 24 }}>
          <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 20, color: "#fff" }}>
            {editingId ? "Edit Tutorial" : "Add New Tutorial"}
          </div>

          {/* Drag & drop zone for video URL */}
          <div
            onDragOver={e => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={e => {
              e.preventDefault(); setDragOver(false);
              const text = e.dataTransfer.getData("text/plain") || e.dataTransfer.getData("text/uri-list");
              if (text && (text.includes("youtube") || text.includes("youtu.be") || text.includes("vimeo"))) {
                setForm(f => ({ ...f, videoUrl: text }));
                autoThumbnail(text);
                toast({ title: "Video URL added!" });
              } else {
                toast({ title: "Drop a YouTube or Vimeo link here", variant: "destructive" });
              }
            }}
            style={{
              border: `2px dashed ${dragOver ? "#fff" : "rgba(255,255,255,0.12)"}`,
              borderRadius: 12, padding: "20px 24px", marginBottom: 16,
              background: dragOver ? "rgba(255,255,255,0.04)" : "transparent",
              transition: "all 0.15s", textAlign: "center",
            }}
          >
            {form.videoUrl ? (
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <div style={{ flex: 1, textAlign: "left" }}>
                  <div style={{ fontSize: 11, color: "rgba(255,255,255,0.3)", marginBottom: 4 }}>VIDEO URL</div>
                  <input
                    style={{ ...inputStyle, borderColor: "rgba(255,255,255,0.15)" }}
                    value={form.videoUrl}
                    onChange={e => { setForm(f => ({ ...f, videoUrl: e.target.value })); autoThumbnail(e.target.value); }}
                    placeholder="https://youtube.com/watch?v=..."
                  />
                </div>
                <button onClick={() => setForm(f => ({ ...f, videoUrl: "", thumbnailUrl: "" }))} style={{ ...S.btn("ghost"), padding: "6px 10px", fontSize: 11 }}>Clear</button>
              </div>
            ) : (
              <div>
                <div style={{ fontSize: 28, marginBottom: 8, opacity: 0.3 }}>🎬</div>
                <div style={{ fontSize: 13, color: "rgba(255,255,255,0.5)", marginBottom: 4 }}>Drag & drop a YouTube or Vimeo link here</div>
                <div style={{ fontSize: 11, color: "rgba(255,255,255,0.25)" }}>or paste the URL below</div>
                <input
                  style={{ ...inputStyle, marginTop: 12, maxWidth: 400, margin: "12px auto 0", display: "block", textAlign: "center" }}
                  value={form.videoUrl}
                  onChange={e => { setForm(f => ({ ...f, videoUrl: e.target.value })); autoThumbnail(e.target.value); }}
                  placeholder="https://youtube.com/watch?v=..."
                />
              </div>
            )}
          </div>

          {/* Form fields */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
            <div>
              <label style={lbl}>Title *</label>
              <input style={inputStyle} value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="e.g. How to Write Your First Chapter" />
            </div>
            <div>
              <label style={lbl}>Category</label>
              <select style={{ ...inputStyle, appearance: "auto" as any }} value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))}>
                {TUTORIAL_CATEGORIES.map(c => <option key={c} value={c}>{CATEGORY_LABELS[c] || c}</option>)}
              </select>
            </div>
            <div>
              <label style={lbl}>Duration *</label>
              <input style={inputStyle} value={form.duration} onChange={e => setForm(f => ({ ...f, duration: e.target.value }))} placeholder="e.g. 5:30" />
            </div>
            <div>
              <label style={lbl}>Sort Order</label>
              <input style={inputStyle} type="number" value={form.sortOrder} onChange={e => setForm(f => ({ ...f, sortOrder: parseInt(e.target.value) || 0 }))} />
            </div>
          </div>

          {/* Thumbnail */}
          <div style={{ marginTop: 14 }}>
            <label style={lbl}>Thumbnail</label>
            <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
              {form.thumbnailUrl && (
                <img src={form.thumbnailUrl} alt="" style={{ width: 120, height: 68, objectFit: "cover", borderRadius: 8, border: "1px solid rgba(255,255,255,0.1)" }} />
              )}
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                <button onClick={() => thumbInputRef.current?.click()} style={{ ...S.btn("ghost"), padding: "6px 14px", fontSize: 11 }}>
                  Upload Image
                </button>
                {form.thumbnailUrl && (
                  <button onClick={() => setForm(f => ({ ...f, thumbnailUrl: "" }))} style={{ ...S.btn("ghost"), padding: "6px 14px", fontSize: 11, color: "#f87171" }}>
                    Remove
                  </button>
                )}
                <span style={{ fontSize: 11, color: "rgba(255,255,255,0.2)", alignSelf: "center" }}>
                  {form.thumbnailUrl ? "" : "Auto-detected from YouTube"}
                </span>
              </div>
              <input ref={thumbInputRef} type="file" accept="image/*" style={{ display: "none" }} onChange={e => { const f = e.target.files?.[0]; if (f) handleThumbFile(f); }} />
            </div>
          </div>

          {/* Description */}
          <div style={{ marginTop: 14 }}>
            <label style={lbl}>Description</label>
            <textarea
              style={{ ...inputStyle, minHeight: 70, resize: "vertical", fontFamily: "inherit" }}
              value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
              placeholder="Brief description of what this tutorial covers..."
            />
          </div>

          {/* Published toggle + actions */}
          <div style={{ marginTop: 18, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <input type="checkbox" checked={form.published} onChange={e => setForm(f => ({ ...f, published: e.target.checked }))} id="tut-pub" style={{ accentColor: "#4ade80" }} />
              <label htmlFor="tut-pub" style={{ fontSize: 13, color: "rgba(255,255,255,0.6)", cursor: "pointer" }}>Publish immediately</label>
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <button style={{ ...S.btn("ghost"), padding: "8px 18px" }} onClick={cancelForm}>Cancel</button>
              <button style={{ ...S.btn("default"), padding: "8px 20px", background: "#fff", color: "#000", fontWeight: 700 }} onClick={handleSubmit}>
                {editingId ? "Save Changes" : "Add Tutorial"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Tutorial Cards Grid ── */}
      {tutorials.length === 0 && !showForm ? (
        <div style={{ textAlign: "center", padding: "60px 0", color: "rgba(255,255,255,0.25)" }}>
          <div style={{ fontSize: 32, marginBottom: 12, opacity: 0.4 }}>🎬</div>
          <p style={{ fontSize: 14 }}>No tutorials yet</p>
          <p style={{ fontSize: 12, color: "rgba(255,255,255,0.15)", marginTop: 4 }}>Click "Add Tutorial" to create your first video guide</p>
        </div>
      ) : tutorials.length > 0 && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: 16 }}>
          {tutorials.map(t => (
            <div key={t.id} style={{
              background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)",
              borderRadius: 12, overflow: "hidden", opacity: t.published ? 1 : 0.5,
            }}>
              {/* Thumbnail */}
              <div style={{ aspectRatio: "16/9", background: "#1a1a2e", display: "flex", alignItems: "center", justifyContent: "center", position: "relative" }}>
                {t.thumbnailUrl ? (
                  <img src={t.thumbnailUrl} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                ) : (
                  <span style={{ fontSize: 24, opacity: 0.3 }}>🎬</span>
                )}
                {t.duration && (
                  <span style={{ position: "absolute", bottom: 6, right: 6, background: "rgba(0,0,0,0.75)", borderRadius: 4, padding: "2px 6px", fontSize: 10, fontWeight: 600, color: "#fff" }}>{t.duration}</span>
                )}
                {!t.published && (
                  <span style={{ position: "absolute", top: 6, left: 6, background: "rgba(251,191,36,0.9)", borderRadius: 4, padding: "2px 8px", fontSize: 9, fontWeight: 700, color: "#000", textTransform: "uppercase" }}>Draft</span>
                )}
              </div>
              {/* Info */}
              <div style={{ padding: "12px 14px" }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: "#fff", marginBottom: 4, lineHeight: 1.3 }}>{t.title}</div>
                <span style={{ fontSize: 10, color: "rgba(255,255,255,0.35)", background: "rgba(255,255,255,0.05)", borderRadius: 10, padding: "1px 8px" }}>{CATEGORY_LABELS[t.category] || t.category}</span>
                {/* Actions */}
                <div style={{ display: "flex", gap: 6, marginTop: 10 }}>
                  <button style={{ ...S.btn("ghost"), padding: "4px 10px", fontSize: 11 }} onClick={() => startEdit(t)}>Edit</button>
                  <button style={{ ...S.btn(t.published ? "ghost" : "success"), padding: "4px 10px", fontSize: 11 }} onClick={() => togglePublished.mutate({ id: t.id, published: !t.published })}>
                    {t.published ? "Unpublish" : "Publish"}
                  </button>
                  <button style={{ ...S.btn("danger"), padding: "4px 10px", fontSize: 11 }} onClick={() => { if (confirm(`Delete "${t.title}"?`)) deleteTutorial.mutate(t.id); }}>Delete</button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  );
}

// ─── Audit Log Tab ───────────────────────────────────────────────────────────

const ACTION_LABELS: Record<string, string> = {
  user_suspend: "Suspended user",
  user_unsuspend: "Unsuspended user",
  user_delete: "Deleted user",
  user_grant_subscription: "Granted subscription",
  bulk_suspend: "Bulk suspended users",
  bulk_unsuspend: "Bulk unsuspended users",
  bulk_delete: "Bulk deleted users",
  book_delete: "Deleted book",
  banner_update: "Updated banner",
  flag_review: "Reviewed flag",
};

const ACTION_COLORS: Record<string, string> = {
  user_delete: "#f87171",
  bulk_delete: "#f87171",
  user_suspend: "#fbbf24",
  bulk_suspend: "#fbbf24",
  user_grant_subscription: "#4ade80",
  banner_update: "#60a5fa",
};

function AuditLogTab() {
  const [page, setPage] = useState(1);
  const { data, isLoading } = useQuery<{ logs: any[]; total: number; totalPages: number }>({
    queryKey: ["/api/admin/audit-logs", page],
    queryFn: () => fetch(`/api/admin/audit-logs?page=${page}&limit=30`, { credentials: "include" }).then(r => r.json()),
  });

  if (isLoading) return <Spinner />;
  if (!data?.logs?.length) return <div style={{ color: "rgba(255,255,255,0.4)", padding: 40, textAlign: "center" }}>No admin actions recorded yet.</div>;

  return (
    <div>
      <div style={{ fontSize: 12, color: "rgba(255,255,255,0.35)", marginBottom: 12 }}>
        {data.total} total actions — Page {page} of {data.totalPages}
      </div>
      <div style={{ overflowX: "auto" }}>
        <table style={S.table}>
          <thead>
            <tr>
              <th style={S.th}>When</th>
              <th style={S.th}>Action</th>
              <th style={S.th}>Target</th>
              <th style={S.th}>Details</th>
            </tr>
          </thead>
          <tbody>
            {data.logs.map((log: any) => {
              const details = log.details ? JSON.parse(log.details) : null;
              return (
                <tr key={log.id}>
                  <td style={{ ...S.td, fontSize: 11, color: "rgba(255,255,255,0.4)", whiteSpace: "nowrap" }}>
                    {log.createdAt ? new Date(log.createdAt).toLocaleString() : "—"}
                  </td>
                  <td style={S.td}>
                    <span style={{ color: ACTION_COLORS[log.action] || "#fff", fontWeight: 600, fontSize: 12 }}>
                      {ACTION_LABELS[log.action] || log.action}
                    </span>
                  </td>
                  <td style={{ ...S.td, fontSize: 12, color: "rgba(255,255,255,0.5)" }}>
                    {log.targetType} {log.targetId ? `#${log.targetId}` : ""}
                  </td>
                  <td style={{ ...S.td, fontSize: 11, color: "rgba(255,255,255,0.35)", maxWidth: 300, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {details ? JSON.stringify(details) : "—"}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {data.totalPages > 1 && (
        <div style={{ display: "flex", justifyContent: "center", gap: 6, marginTop: 16, alignItems: "center" }}>
          <button style={S.btn("ghost")} disabled={page === 1} onClick={() => setPage(p => p - 1)}>← Prev</button>
          <span style={{ fontSize: 12, color: "rgba(255,255,255,0.4)", padding: "0 10px" }}>Page {page} of {data.totalPages}</span>
          <button style={S.btn("ghost")} disabled={page === data.totalPages} onClick={() => setPage(p => p + 1)}>Next →</button>
        </div>
      )}
    </div>
  );
}

// ─── Social Links Tab ────────────────────────────────────────────────────────

function SocialLinksTab() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [form, setForm] = useState({ instagram: "", linkedin: "", youtube: "", twitter: "", tiktok: "" });
  const [loaded, setLoaded] = useState(false);

  const { data } = useQuery<Record<string, string>>({
    queryKey: ["/api/social-links"],
    queryFn: () => fetch("/api/social-links", { credentials: "include" }).then(r => r.json()),
  });

  // Load current values once
  if (data && !loaded) {
    setForm({ instagram: data.instagram || "", linkedin: data.linkedin || "", youtube: data.youtube || "", twitter: data.twitter || "", tiktok: data.tiktok || "" });
    setLoaded(true);
  }

  const save = useMutation({
    mutationFn: () => fetch("/api/admin/social-links", { method: "POST", headers: { "Content-Type": "application/json" }, credentials: "include", body: JSON.stringify(form) }).then(r => r.json()),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/social-links"] }); toast({ title: "Social links saved" }); },
  });

  const lbl: React.CSSProperties = { fontSize: 12, color: "rgba(255,255,255,0.5)", display: "block", marginBottom: 6, fontWeight: 500 };
  const fields = [
    { key: "instagram", label: "Instagram URL", placeholder: "https://instagram.com/plotzy" },
    { key: "linkedin", label: "LinkedIn URL", placeholder: "https://linkedin.com/company/plotzy" },
    { key: "youtube", label: "YouTube URL", placeholder: "https://youtube.com/@plotzy" },
    { key: "twitter", label: "X (Twitter) URL", placeholder: "https://x.com/plotzy" },
    { key: "tiktok", label: "TikTok URL", placeholder: "https://tiktok.com/@plotzy" },
  ] as const;

  return (
    <div style={{ maxWidth: 500 }}>
      <p style={{ fontSize: 13, color: "rgba(255,255,255,0.4)", marginBottom: 20, lineHeight: 1.6 }}>
        Set your social media links. These will appear as icons in the site footer. Leave a field empty to hide that icon.
      </p>
      {fields.map(f => (
        <div key={f.key} style={{ marginBottom: 16 }}>
          <label style={lbl}>{f.label}</label>
          <input
            value={form[f.key]} onChange={e => setForm(prev => ({ ...prev, [f.key]: e.target.value }))}
            placeholder={f.placeholder}
            style={inputStyle}
          />
        </div>
      ))}
      <button onClick={() => save.mutate()} disabled={save.isPending}
        style={{ ...S.btn("default"), padding: "10px 24px", background: "#fff", color: "#000", fontWeight: 700, fontSize: 13, marginTop: 8 }}>
        {save.isPending ? "Saving..." : "Save Social Links"}
      </button>
    </div>
  );
}

type Tab = "overview" | "analytics" | "revenue" | "moderation" | "engagement" | "system" | "users" | "books" | "support" | "activity" | "banner" | "tutorials" | "audit" | "social";

export default function AdminPage() {
  const { user, isLoading: authLoading } = useAuth();
  const [, setLocation] = useLocation();
  const [tab, setTab] = useState<Tab>("analytics");

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
          <div className="admin-stats-grid" style={S.statsGrid}>
            <StatCard label="Total Users" value={stats.totalUsers} icon="👤" />
            <StatCard label="Total Books" value={stats.totalBooks} icon="📚" />
            <StatCard label="Published" value={stats.publishedBooks} icon="🌐" />
            <StatCard label="Chapters" value={stats.totalChapters} icon="📄" />
            <StatCard label="Open Tickets" value={stats.openSupportTickets} icon="🎫" />
          </div>
        )}

        <div style={{ ...S.tabs, flexWrap: "wrap", overflowX: "auto", WebkitOverflowScrolling: "touch" }}>
          <TabBtn label="Analytics" active={tab === "analytics"} onClick={() => setTab("analytics")} />
          <TabBtn label="Revenue" active={tab === "revenue"} onClick={() => setTab("revenue")} />
          <TabBtn label="Moderation" active={tab === "moderation"} onClick={() => setTab("moderation")} />
          <TabBtn label="Engagement" active={tab === "engagement"} onClick={() => setTab("engagement")} />
          <TabBtn label="System" active={tab === "system"} onClick={() => setTab("system")} />
          <span style={{ width: 1, background: "rgba(255,255,255,0.1)", margin: "4px 4px" }} />
          <TabBtn label={`Users${stats ? ` (${stats.totalUsers})` : ""}`} active={tab === "users"} onClick={() => setTab("users")} />
          <TabBtn label={`Books${stats ? ` (${stats.publishedBooks})` : ""}`} active={tab === "books"} onClick={() => setTab("books")} />
          <TabBtn label={`Support${stats && stats.openSupportTickets > 0 ? ` (${stats.openSupportTickets})` : ""}`} active={tab === "support"} onClick={() => setTab("support")} />
          <TabBtn label="Activity" active={tab === "activity"} onClick={() => setTab("activity")} />
          <TabBtn label="Banner" active={tab === "banner"} onClick={() => setTab("banner")} />
          <TabBtn label="Overview" active={tab === "overview"} onClick={() => setTab("overview")} />
          <TabBtn label="Tutorials" active={tab === "tutorials"} onClick={() => setTab("tutorials")} />
          <TabBtn label="Audit Log" active={tab === "audit"} onClick={() => setTab("audit")} />
          <TabBtn label="Social Links" active={tab === "social"} onClick={() => setTab("social")} />
        </div>

        {tab === "analytics"  && <AnalyticsTab />}
        {tab === "revenue"    && <RevenueTab />}
        {tab === "moderation" && <ModerationTab />}
        {tab === "engagement" && <EngagementTab />}
        {tab === "system"     && <SystemHealthTab />}

        {tab === "overview" && (
          <div style={{ color: "rgba(255,255,255,0.5)", fontSize: 14, lineHeight: 2 }}>
            <p>Welcome to the Plotzy admin panel. Use the tabs above to manage the platform:</p>
            <ul style={{ paddingLeft: 20 }}>
              <li><b style={{ color: "#818cf8" }}>Analytics</b> — DAU/WAU/MAU, sign-up trends, writing activity charts</li>
              <li><b style={{ color: "#34d399" }}>Revenue</b> — MRR, subscription tiers, churn tracking</li>
              <li><b style={{ color: "#f87171" }}>Moderation</b> — flag books, approve/reject, auto-unpublish</li>
              <li><b style={{ color: "#fbbf24" }}>Engagement</b> — writing leaderboard, inactive users, AI usage/cost per user</li>
              <li><b style={{ color: "#60a5fa" }}>System</b> — API latency (p50/p95/p99), error rates, slowest endpoints, traffic charts</li>
              <li><b style={{ color: "#fff" }}>Users</b> — manage accounts, suspend, grant subscriptions</li>
              <li><b style={{ color: "#fff" }}>Books</b> — manage published books</li>
              <li><b style={{ color: "#fff" }}>Support</b> — read and manage support tickets</li>
              <li><b style={{ color: "#fff" }}>Activity</b> — recent platform events</li>
              <li><b style={{ color: "#fff" }}>Banner</b> — site-wide announcements</li>
              <li><b style={{ color: "#fff" }}>Tutorials</b> — manage video tutorials for the Learning Center</li>
              <li><b style={{ color: "#fff" }}>Audit Log</b> — track all admin actions (who did what, when)</li>
            </ul>
          </div>
        )}

        {tab === "users"    && <UsersTab />}
        {tab === "books"    && <BooksTab />}
        {tab === "support"  && <SupportTab />}
        {tab === "activity" && <ActivityTab />}
        {tab === "banner"   && <BannerTab />}
        {tab === "tutorials" && <TutorialsTab />}
        {tab === "audit" && <AuditLogTab />}
        {tab === "social" && <SocialLinksTab />}
      </div>
    </div>
  );
}
