import { useState, useRef } from "react";
import { useLocation } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/contexts/auth-context";
import { useToast } from "@/hooks/use-toast";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area } from "recharts";
import { Users, BookOpen, Globe, FileText, Ticket, Settings, ArrowLeft, ChevronDown, Shield } from "lucide-react";
import { SEO } from "@/components/SEO";
import { adminFetch, adminFetchList, adminErrorText } from "@/lib/admin-api";
import { TabBoundary } from "@/components/admin/TabBoundary";
import { useIsPhone } from "@/hooks/use-is-phone";

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

// ─── Tokens ─────────────────────────────────────────────────────────────────
// The panel used to be pure #000 with two dozen ad-hoc white alphas while
// the rest of Plotzy is warm paper. One scale, used everywhere.
const T = {
  bg: "#f4efe2",            // page
  card: "#fffdf7",          // raised card
  cardStrong: "#f1ead9",    // active / pressed
  cardSoft: "rgba(66,53,33,0.04)",
  border: "rgba(66,53,33,0.14)",
  borderStrong: "rgba(66,53,33,0.28)",
  text: "#2f2618",          // headings + primary
  body: "#4a4132",          // table text
  muted: "#6d6354",         // secondary
  dim: "#9a9181",           // labels, axes
  espresso: "#292115",      // primary button
  paper: "#f4efe2",         // text on espresso
  danger: "#a13c2c",
  dangerWash: "rgba(161,60,44,0.10)",
  dangerBorder: "rgba(161,60,44,0.28)",
  success: "#3f7d4e",
  successWash: "rgba(63,125,78,0.12)",
  warn: "#a6761d",
};

// ─── Styles ──────────────────────────────────────────────────────────────────

const S = {
  page: {
    minHeight: "100vh",
    background: T.bg,
    backgroundImage: "radial-gradient(circle, rgba(66,53,33,0.05) 1px, transparent 1px)",
    backgroundSize: "22px 22px",
    color: T.text,
    fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Text', 'Helvetica Neue', sans-serif",
    padding: "0 0 80px",
  } as React.CSSProperties,

  header: {
    borderBottom: "1px solid " + T.border,
    background: T.card,
    padding: "16px clamp(14px, 4vw, 40px)",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 16,
    flexWrap: "wrap" as any,
    position: "sticky" as const,
    top: 0,
    zIndex: 20,
  } as React.CSSProperties,

  title: {
    fontSize: 19,
    fontWeight: 800,
    letterSpacing: "-0.01em",
    color: T.text,
    display: "flex",
    alignItems: "center",
    gap: 10,
  } as React.CSSProperties,

  badge: {
    background: T.cardStrong,
    border: "1px solid " + T.border,
    borderRadius: 6,
    padding: "2px 10px",
    fontSize: 10.5,
    fontWeight: 700,
    color: T.muted,
    letterSpacing: "0.1em",
    textTransform: "uppercase" as const,
  },

  body: {
    maxWidth: 1240,
    margin: "0 auto",
    padding: "22px clamp(14px, 4vw, 40px) 48px",
  } as React.CSSProperties,

  tabs: {
    display: "flex",
    gap: 4,
    marginBottom: 28,
    borderBottom: "1px solid " + T.border,
    overflowX: "auto" as any,
    scrollbarWidth: "none" as any,
  } as React.CSSProperties,

  statsGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))",
    gap: 12,
    marginBottom: 26,
  } as React.CSSProperties,

  statCard: {
    background: T.card,
    border: "1px solid " + T.border,
    borderRadius: 12,
    padding: "16px 18px",
  } as React.CSSProperties,

  table: {
    width: "100%",
    borderCollapse: "collapse" as const,
  },

  th: {
    textAlign: "left" as const,
    padding: "10px 14px",
    fontSize: 10.5,
    fontWeight: 700,
    color: T.dim,
    letterSpacing: "0.08em",
    textTransform: "uppercase" as const,
    borderBottom: "1px solid " + T.border,
    whiteSpace: "nowrap" as const,
  },

  td: {
    padding: "13px 14px",
    fontSize: 13.5,
    color: T.body,
    borderBottom: "1px solid " + T.cardSoft,
    verticalAlign: "top" as const,
  },

  btn: (variant: "danger" | "default" | "success" | "ghost") => ({
    borderRadius: 8,
    padding: "7px 14px",
    fontSize: 12.5,
    fontWeight: 600,
    cursor: "pointer",
    fontFamily: "inherit",
    transition: "opacity .15s",
    background:
      variant === "danger"  ? T.dangerWash :
      variant === "success" ? T.successWash :
      variant === "ghost"   ? "transparent" :
                              T.espresso,
    color:
      variant === "danger"  ? T.danger :
      variant === "success" ? T.success :
      variant === "ghost"   ? T.muted :
                              T.paper,
    border:
      variant === "danger"  ? "1px solid " + T.dangerBorder :
      variant === "ghost"   ? "1px solid " + T.border :
      variant === "success" ? "1px solid rgba(63,125,78,0.28)" :
                              "1px solid transparent",
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
        color: active ? "#2f2618" : "#8a8070",
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

function StatCard({ label, value, icon: Icon }: { label: string; value: number; icon: React.ComponentType<{ className?: string; style?: React.CSSProperties }> }) {
  return (
    <div style={S.statCard}>
      <Icon className="w-5 h-5" style={{ color: "#9a9181", marginBottom: 8 }} />
      <div style={{ fontSize: 28, fontWeight: 700, letterSpacing: "-1px", marginBottom: 4 }}>
        {Number.isFinite(value) ? Number(value).toLocaleString() : "—"}
      </div>
      <div style={{ fontSize: 12, color: "#8a8070", fontWeight: 500 }}>{label}</div>
    </div>
  );
}

// ─── Avatar ──────────────────────────────────────────────────────────────────
// Google/Apple avatar URLs expire and get rate-limited, so a plain <img>
// left broken-image boxes all down the users table. Falls back to the
// writer's initial the moment the image fails.
function Avatar({ url, name }: { url: string | null; name: string }) {
  const [broken, setBroken] = useState(false);
  const initial = (name || "?").trim().charAt(0).toUpperCase() || "?";
  const box: React.CSSProperties = {
    width: 30, height: 30, borderRadius: "50%", flexShrink: 0,
  };
  if (!url || broken) {
    return (
      <div style={{
        ...box, background: "rgba(66,53,33,0.12)", display: "flex",
        alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 700, color: T.muted,
      }}>
        {initial}
      </div>
    );
  }
  return (
    <img
      src={url}
      alt=""
      loading="lazy"
      referrerPolicy="no-referrer"
      onError={() => setBroken(true)}
      style={{ ...box, objectFit: "cover" }}
    />
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

  const { data: users = [], isLoading, error } = useQuery<AdminUser[]>({
    queryKey: ["/api/admin/users"],
    queryFn: () => adminFetchList("/api/admin/users"),
  });

  const deleteUser = useMutation({
    mutationFn: (id: number) => adminFetch(`/api/admin/users/${id}`, { method: "DELETE" }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/admin/users"] }); qc.invalidateQueries({ queryKey: ["/api/admin/stats"] }); toast({ title: "User deleted" }); },
    onError: () => toast({ title: "Failed to delete user", variant: "destructive" }),
  });

  const suspendUser = useMutation({
    mutationFn: ({ id, suspended }: { id: number; suspended: boolean }) =>
      adminFetch(`/api/admin/users/${id}/suspend`, {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        
        body: JSON.stringify({ suspended }),
      }),
    onSuccess: (_, v) => { qc.invalidateQueries({ queryKey: ["/api/admin/users"] }); toast({ title: v.suspended ? "User suspended" : "User unsuspended" }); },
    onError: () => toast({ title: "Failed to update user", variant: "destructive" }),
  });

  const grantSub = useMutation({
    mutationFn: ({ id, plan, months }: { id: number; plan: string; months: number }) => {
      const end = new Date();
      end.setMonth(end.getMonth() + months);
      return adminFetch(`/api/admin/users/${id}/subscription`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        
        body: JSON.stringify({ subscriptionStatus: "active", subscriptionPlan: plan, subscriptionEndDate: end.toISOString() }),
      });
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/admin/users"] }); setGrantModal(null); toast({ title: "Subscription granted" }); },
    onError: () => toast({ title: "Failed to grant subscription", variant: "destructive" }),
  });

  const revokeSub = useMutation({
    mutationFn: (id: number) => adminFetch(`/api/admin/users/${id}/subscription`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      
      body: JSON.stringify({ subscriptionStatus: null, subscriptionPlan: null, subscriptionEndDate: null }),
    }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/admin/users"] }); toast({ title: "Subscription revoked" }); },
    onError: () => toast({ title: "Failed to revoke subscription", variant: "destructive" }),
  });

  const bulkSuspend = useMutation({
    mutationFn: ({ userIds, suspended }: { userIds: number[]; suspended: boolean }) =>
      adminFetch("/api/admin/users/bulk-suspend", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ userIds, suspended }) }),
    onSuccess: (d) => { qc.invalidateQueries({ queryKey: ["/api/admin/users"] }); setSelected(new Set()); toast({ title: `${d.count} users updated` }); },
  });

  const bulkDelete = useMutation({
    mutationFn: (userIds: number[]) =>
      adminFetch("/api/admin/users/bulk-delete", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ userIds }) }),
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

  const safeUsers = Array.isArray(users) ? users : [];
  const filtered = safeUsers.filter(u => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (u.displayName || "").toLowerCase().includes(q) || (u.email || "").toLowerCase().includes(q);
  });
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paged = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  if (isLoading) return <Spinner />;
  if (error) return <LoadError error={error} onRetry={() => qc.invalidateQueries({ queryKey: ["/api/admin/users"] })} />;

  return (
    <>
      {/* Toolbar: Search + Bulk actions + Export */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: 10, marginBottom: 16, alignItems: "center" }}>
        <input
          value={search}
          onChange={e => { setSearch(e.target.value); setPage(1); }}
          placeholder="Search by name or email…"
          style={{ ...inputStyle, width: "100%", maxWidth: 280, display: "block" }}
        />
        {search && (
          <span style={{ fontSize: 12, color: "#9a9181" }}>
            {filtered.length} of {users.length}
          </span>
        )}

        {/* Bulk actions — show only when items are selected */}
        {selected.size > 0 && (
          <div style={{ display: "flex", gap: 6, alignItems: "center", marginLeft: 8, padding: "4px 12px", background: "rgba(66,53,33,0.05)", borderRadius: 8, border: "1px solid rgba(66,53,33,0.12)" }}>
            <span style={{ fontSize: 12, color: "#6d6354", marginRight: 4 }}>{selected.size} selected</span>
            <button style={S.btn("ghost")} onClick={() => bulkSuspend.mutate({ userIds: [...selected], suspended: true })}>Suspend All</button>
            <button style={S.btn("ghost")} onClick={() => bulkSuspend.mutate({ userIds: [...selected], suspended: false })}>Unsuspend All</button>
            <button style={S.btn("danger")} onClick={() => { if (confirm(`Delete ${selected.size} users?`)) bulkDelete.mutate([...selected]); }}>Delete All</button>
            <button style={{ ...S.btn("ghost"), color: "#9a9181" }} onClick={() => setSelected(new Set())}>✕</button>
          </div>
        )}

        {/* CSV export */}
        <a href="/api/admin/export/users.csv" download style={{ marginLeft: "auto", ...S.btn("ghost"), textDecoration: "none", display: "inline-flex", alignItems: "center", gap: 4 }}>
          ↓ Export CSV
        </a>
      </div>

      <div style={{ overflowX: "auto" }}>
        <table style={S.table}>
          <caption className="sr-only">User management</caption>
          <thead>
            <tr>
              <th scope="col" style={{ ...S.th, width: 36 }}>
                <input
                  type="checkbox"
                  checked={selected.size === paged.length && paged.length > 0}
                  onChange={toggleAll}
                  aria-label="Select all users on this page"
                  style={{ accentColor: "#2f2618" }}
                />
              </th>
              <th scope="col" style={S.th}>User</th>
              <th scope="col" style={S.th}>Email</th>
              <th scope="col" style={S.th}>Status</th>
              <th scope="col" style={S.th}>Subscription</th>
              <th scope="col" style={S.th}>Joined</th>
              <th scope="col" style={S.th}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {paged.map(u => (
              <tr key={u.id} style={{ opacity: u.suspended ? 0.55 : 1 }}>
                <td style={{ ...S.td, width: 36 }}>
                  <input
                    type="checkbox"
                    checked={selected.has(u.id)}
                    onChange={() => toggleSelect(u.id)}
                    aria-label={`Select user ${u.displayName || u.email || u.id}`}
                    style={{ accentColor: "#2f2618" }}
                  />
                </td>
                <td style={S.td}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <Avatar url={u.avatarUrl} name={u.displayName || u.email || "?"} />
                    <span style={{ fontWeight: 500 }}>{u.displayName || "—"}</span>
                  </div>
                </td>
                <td style={{ ...S.td, color: "#6d6354", fontSize: 12 }}>{u.email || "—"}</td>
                <td style={S.td}>
                  {u.suspended
                    ? <span style={{ background: "rgba(161,60,44,0.15)", color: "#a13c2c", borderRadius: 5, padding: "2px 8px", fontSize: 11, fontWeight: 600 }}>SUSPENDED</span>
                    : <span style={{ background: "rgba(63,125,78,0.1)", color: "#3f7d4e", borderRadius: 5, padding: "2px 8px", fontSize: 11, fontWeight: 600 }}>ACTIVE</span>
                  }
                </td>
                <td style={S.td}>
                  {u.subscriptionStatus === "active"
                    ? <span style={{ background: "rgba(63,125,78,0.15)", color: "#3f7d4e", borderRadius: 5, padding: "2px 8px", fontSize: 11, fontWeight: 600 }}>{u.subscriptionPlan?.toUpperCase() || "PRO"}</span>
                    : <span style={{ color: "rgba(66,53,33,0.26)", fontSize: 12 }}>Free</span>
                  }
                </td>
                <td style={{ ...S.td, fontSize: 12, color: "#8a8070" }}>
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
          <span style={{ fontSize: 12, color: "#8a8070", padding: "0 10px" }}>Page {page} of {totalPages}</span>
          <button style={S.btn("ghost")} disabled={page === totalPages} onClick={() => setPage(p => p + 1)}>Next →</button>
        </div>
      )}

      {grantModal && (
        <Modal title={`Grant Subscription — ${grantModal.displayName || grantModal.email}`} onClose={() => setGrantModal(null)}>
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <label style={{ fontSize: 13, color: "#5c5142" }}>
              Plan
              <select value={plan} onChange={e => setPlan(e.target.value)} style={inputStyle}>
                <option value="pro">Pro</option>
                <option value="premium">Premium</option>
              </select>
            </label>
            <label style={{ fontSize: 13, color: "#5c5142" }}>
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

const EVENT_COLORS: Record<string, string> = { user: "#7b5e3b", book: "#3f7d4e", support: "#b4632a", payment: "#3f7d4e" };

function ActivityTab() {
  const { data: events = [], isLoading } = useQuery<ActivityEvent[]>({
    queryKey: ["/api/admin/activity"],
    queryFn: () => adminFetchList("/api/admin/activity"),
    refetchInterval: 60000,
    staleTime: 60000,
  });

  if (isLoading) return <Spinner />;
  if (!events.length) return (
    <div style={{ textAlign: "center", padding: "60px 0", color: "#9a9181", fontSize: 14 }}>
      No activity yet.
    </div>
  );

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
      {events.map((e, i) => (
        <div key={i} style={{
          display: "flex", alignItems: "flex-start", gap: 16,
          padding: "14px 0", borderBottom: "1px solid rgba(66,53,33,0.07)",
        }}>
          <div style={{
            width: 36, height: 36, borderRadius: "50%", flexShrink: 0,
            background: `${EVENT_COLORS[e.type] || "#2f2618"}18`,
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 16, marginTop: 2,
          }}>{"•"}</div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: "#2f2618", marginBottom: 2 }}>{e.title}</div>
            <div style={{ fontSize: 12, color: "#8a8070", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{e.subtitle}</div>
          </div>
          <div style={{ fontSize: 11, color: "rgba(66,53,33,0.26)", flexShrink: 0, marginTop: 3 }}>
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
    queryFn: () => adminFetch("/api/banner"),
  });

  const setBanner = useMutation({
    mutationFn: () => adminFetch("/api/admin/banner", {
      method: "POST", headers: { "Content-Type": "application/json" },
      
      body: JSON.stringify({ message, color }),
    }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/banner"] }); toast({ title: "Banner published!" }); setMessage(""); },
    onError: () => toast({ title: "Failed to publish banner", variant: "destructive" }),
  });

  const removeBanner = useMutation({
    mutationFn: () => adminFetch("/api/admin/banner", { method: "DELETE" }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/banner"] }); toast({ title: "Banner removed" }); },
    onError: () => toast({ title: "Failed to remove banner", variant: "destructive" }),
  });

  // The live banner's own palette — these are the colours visitors see on
  // the site, so they stay as-is regardless of the panel's own theme.
  const BANNER_COLORS = [
    { value: "default", label: "Espresso (default)", bg: "#292115", fg: "#f4efe2" },
    { value: "info",    label: "Blue",               bg: "#1e40af", fg: "#ffffff" },
    { value: "success", label: "Green",              bg: "#166534", fg: "#ffffff" },
    { value: "warning", label: "Amber",              bg: "#92400e", fg: "#fef08a" },
    { value: "danger",  label: "Red",                bg: "#991b1b", fg: "#ffffff" },
  ];

  const selectedColor = BANNER_COLORS.find(c => c.value === color) || BANNER_COLORS[0];

  return (
    <div style={{ maxWidth: 600 }}>
      {/* Current banner status */}
      <div style={{ marginBottom: 28, padding: 20, background: "rgba(66,53,33,0.05)", borderRadius: 12, border: "1px solid rgba(66,53,33,0.12)" }}>
        <p style={{ fontSize: 12, color: "#8a8070", marginBottom: 10, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em" }}>Current Banner</p>
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
          <p style={{ color: "rgba(66,53,33,0.26)", fontSize: 13 }}>No active banner</p>
        )}
      </div>

      {/* New banner form */}
      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        <div>
          <p style={{ fontSize: 12, color: "#8a8070", marginBottom: 8, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em" }}>New Banner</p>
          <textarea
            value={message}
            onChange={e => setMessage(e.target.value)}
            placeholder="Enter announcement message for all users…"
            rows={3}
            style={{ ...inputStyle, resize: "vertical" }}
          />
        </div>

        <div>
          <p style={{ fontSize: 12, color: "#8a8070", marginBottom: 8, fontWeight: 600 }}>Color</p>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {BANNER_COLORS.map(c => (
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
            {message}
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
    queryFn: () => adminFetchList("/api/public/books"),
  });

  const deleteBook = useMutation({
    mutationFn: (id: number) => adminFetch(`/api/admin/books/${id}`, { method: "DELETE" }),
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
                  style={{ cursor: "pointer", textDecoration: "underline", textDecorationColor: "rgba(66,53,33,0.22)" }}
                >{b.title}</span>
              </td>
              <td style={{ ...S.td, color: "#6d6354", fontSize: 12 }}>{b.authorDisplayName || "—"}</td>
              <td style={{ ...S.td, color: "#8a8070", fontSize: 12 }}>{b.genre || "—"}</td>
              <td style={{ ...S.td, color: "#6d6354", fontSize: 12 }}>{(b.viewCount ?? 0).toLocaleString()}</td>
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
  const [search, setSearch] = useState("");

  const { data: messages = [], isLoading, error } = useQuery<SupportMessage[]>({
    queryKey: ["/api/admin/support"],
    queryFn: () => adminFetchList("/api/admin/support"),
  });

  const update = useMutation({
    mutationFn: ({ id, ...updates }: { id: number; read?: boolean; status?: string }) =>
      adminFetch(`/api/admin/support/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["/api/admin/support"] }),
  });

  const q = search.trim().toLowerCase();
  const safeMessages = Array.isArray(messages) ? messages : [];
  const filtered = safeMessages.filter(m => {
    const statusOk = filter === "all" ? true : filter === "open" ? m.status === "open" : m.status !== "open";
    if (!statusOk) return false;
    if (!q) return true;
    const hay = `${m.name || ""} ${m.email || ""} ${m.subject || ""}`.toLowerCase();
    return hay.includes(q);
  });

  if (isLoading) return <Spinner />;
  if (error) return <LoadError error={error} onRetry={() => qc.invalidateQueries({ queryKey: ["/api/admin/support"] })} />;

  const priorityColor = (p: string | null) =>
    p === "urgent" ? "#a13c2c" : p === "high" ? "#b4632a" : "#9a9181";

  return (
    <div>
      {/* Search bar */}
      <div style={{ position: "relative", marginBottom: 12 }}>
        <svg
          width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
          style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "#9a9181", pointerEvents: "none" }}
        >
          <circle cx="11" cy="11" r="8" />
          <line x1="21" y1="21" x2="16.65" y2="16.65" />
        </svg>
        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search by name, email, or subject…"
          style={{
            width: "100%",
            padding: "10px 36px 10px 36px",
            background: "rgba(66,53,33,0.05)",
            border: "1px solid rgba(66,53,33,0.12)",
            borderRadius: 10,
            color: "#2f2618",
            fontSize: 13,
            fontFamily: "inherit",
            outline: "none",
            boxSizing: "border-box",
          }}
          onFocus={e => (e.currentTarget.style.borderColor = "#9a9181")}
          onBlur={e => (e.currentTarget.style.borderColor = "rgba(66,53,33,0.12)")}
        />
        {search && (
          <button
            onClick={() => setSearch("")}
            aria-label="Clear search"
            style={{
              position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)",
              background: "transparent", border: "none", color: "#8a8070",
              cursor: "pointer", fontSize: 16, padding: 6, lineHeight: 1,
            }}
          >×</button>
        )}
      </div>

      <div style={{ display: "flex", gap: 8, marginBottom: 20 }}>
        {(["all", "open", "closed"] as const).map(f => (
          <button key={f} onClick={() => setFilter(f)} style={{
            ...S.btn(filter === f ? "default" : "ghost"),
            padding: "6px 16px",
            fontSize: 12,
            textTransform: "capitalize",
          }}>{f}</button>
        ))}
        <span style={{ marginLeft: "auto", color: "#9a9181", fontSize: 13, alignSelf: "center" }}>
          {filtered.length} ticket{filtered.length !== 1 ? "s" : ""}
          {q && <span style={{ color: "rgba(66,53,33,0.22)", marginLeft: 6 }}>matching "{search}"</span>}
        </span>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {filtered.map(m => (
          <div
            key={m.id}
            style={{
              background: m.read ? "rgba(66,53,33,0.05)" : "rgba(66,53,33,0.07)",
              border: `1px solid ${m.read ? "rgba(66,53,33,0.07)" : "rgba(66,53,33,0.16)"}`,
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
                <div style={{ width: 7, height: 7, borderRadius: "50%", background: "#2f2618", marginTop: 5, flexShrink: 0 }} />
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
                    background: m.status === "open" ? "rgba(63,125,78,0.12)" : "rgba(66,53,33,0.07)",
                    color: m.status === "open" ? "#3f7d4e" : "#9a9181",
                    textTransform: "uppercase", letterSpacing: "0.05em",
                  }}>{m.status || "open"}</span>
                  {m.category && <span style={{ fontSize: 11, color: "#9a9181" }}>{m.category}</span>}
                </div>
                <div style={{ fontSize: 12, color: "#8a8070" }}>
                  From: <b style={{ color: "#5c5142" }}>{m.name}</b> &lt;{m.email}&gt;
                  {m.createdAt && <span style={{ marginLeft: 10 }}>{new Date(m.createdAt).toLocaleString()}</span>}
                </div>
              </div>
              <span style={{ color: "rgba(66,53,33,0.22)", fontSize: 18, flexShrink: 0, marginTop: 2 }}>
                {expanded === m.id ? "▲" : "▼"}
              </span>
            </div>

            {expanded === m.id && (
              <div style={{ borderTop: "1px solid rgba(66,53,33,0.07)", padding: "16px 18px" }}>
                {/* Original message */}
                <div style={{ marginBottom: 16 }}>
                  <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.15em", textTransform: "uppercase", color: "#9a9181", marginBottom: 6 }}>
                    {m.name}  ·  {m.createdAt ? new Date(m.createdAt).toLocaleString() : ""}
                  </div>
                  <p style={{ fontSize: 14, lineHeight: 1.7, color: "#4a4132", whiteSpace: "pre-wrap", margin: 0 }}>
                    {m.message}
                  </p>
                </div>

                <AdminSupportThread ticketId={m.id} />

                <AdminReplyBox ticketId={m.id} ticketStatus={m.status} />

                <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 16, paddingTop: 14, borderTop: "1px solid rgba(66,53,33,0.07)" }}>
                  {m.status !== "closed" ? (
                    <button style={S.btn("ghost")} onClick={() => update.mutate({ id: m.id, status: "closed" })}>
                      Mark Closed
                    </button>
                  ) : (
                    <button style={S.btn("ghost")} onClick={() => update.mutate({ id: m.id, status: "open" })}>
                      Reopen
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        ))}

        {filtered.length === 0 && (
          <div style={{ textAlign: "center", padding: "60px 0", color: "rgba(66,53,33,0.26)", fontSize: 14 }}>
            No tickets found
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Shared helpers ───────────────────────────────────────────────────────────

// ─── Support reply thread + composer (admin) ───────────────────────────────

interface SupportReply {
  id: number;
  ticketId: number;
  senderType: "admin" | "user";
  senderUserId: number | null;
  senderName: string | null;
  body: string;
  createdAt: string | null;
}

function AdminSupportThread({ ticketId }: { ticketId: number }) {
  const { data, isLoading } = useQuery<{ ticket: SupportMessage; replies: SupportReply[] }>({
    queryKey: [`/api/support/tickets/${ticketId}/thread`],
    queryFn: () => adminFetch(`/api/support/tickets/${ticketId}/thread`),
    staleTime: 5_000,
  });

  if (isLoading) {
    return <div style={{ fontSize: 12, color: "#9a9181", padding: "8px 0" }}>Loading conversation…</div>;
  }
  const replies = data?.replies || [];
  if (replies.length === 0) return null;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 16, paddingTop: 14, borderTop: "1px solid rgba(66,53,33,0.07)" }}>
      {replies.map(r => {
        const isAdmin = r.senderType === "admin";
        return (
          <div
            key={r.id}
            style={{
              alignSelf: isAdmin ? "flex-end" : "flex-start",
              maxWidth: "85%",
              background: isAdmin ? "rgba(74,111,165,0.12)" : "rgba(66,53,33,0.05)",
              border: `1px solid ${isAdmin ? "rgba(74,111,165,0.25)" : "rgba(66,53,33,0.12)"}`,
              borderRadius: 12,
              padding: "10px 14px",
            }}
          >
            <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: isAdmin ? "#4a6fa5" : "#6d6354", marginBottom: 4 }}>
              {isAdmin ? "You" : r.senderName || "User"}  ·  {r.createdAt ? new Date(r.createdAt).toLocaleString() : ""}
            </div>
            <p style={{ fontSize: 13, lineHeight: 1.6, color: "#3a3020", whiteSpace: "pre-wrap", margin: 0 }}>
              {r.body}
            </p>
          </div>
        );
      })}
    </div>
  );
}

const QUICK_REPLIES = [
  { label: "Thanks", body: "Thanks for reaching out — we appreciate the feedback. Is there anything else we can help you with?" },
  { label: "Investigating", body: "Thanks for flagging this. We're looking into it now and will follow up as soon as we have more information." },
  { label: "Resolved", body: "This should now be resolved on our end. Please let us know if you run into it again and we'll dig in further." },
  { label: "Need more info", body: "Could you share a few more details — ideally a screenshot and the steps you took right before this happened? That'll help us reproduce it." },
];

function AdminReplyBox({ ticketId, ticketStatus }: { ticketId: number; ticketStatus: string | null }) {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [body, setBody] = useState("");

  const send = useMutation({
    mutationFn: async (text: string) => {
      const res = await fetch(`/api/admin/support/${ticketId}/reply`, {
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
      setBody("");
      toast({ title: "Reply sent", description: "The user has been emailed and notified in-app." });
      qc.invalidateQueries({ queryKey: [`/api/support/tickets/${ticketId}/thread`] });
      qc.invalidateQueries({ queryKey: ["/api/admin/support"] });
    },
    onError: (err: Error) => toast({ title: "Reply failed", description: err.message, variant: "destructive" }),
  });

  if (ticketStatus === "closed") {
    return (
      <p style={{ fontSize: 12, color: "#9a9181", fontStyle: "italic", paddingTop: 14, borderTop: "1px solid rgba(66,53,33,0.07)", margin: 0 }}>
        Ticket is closed. Reopen it to reply.
      </p>
    );
  }

  return (
    <div style={{ paddingTop: 14, borderTop: "1px solid rgba(66,53,33,0.07)" }}>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 10 }}>
        <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.15em", textTransform: "uppercase", color: "#9a9181", marginRight: 6, alignSelf: "center" }}>
          Quick reply:
        </span>
        {QUICK_REPLIES.map(q => (
          <button
            key={q.label}
            type="button"
            onClick={() => setBody(prev => (prev ? prev + "\n\n" : "") + q.body)}
            style={{
              fontSize: 11,
              fontWeight: 600,
              padding: "4px 10px",
              borderRadius: 999,
              background: "rgba(66,53,33,0.05)",
              border: "1px solid rgba(66,53,33,0.12)",
              color: "#4a4132",
              cursor: "pointer",
            }}
          >
            {q.label}
          </button>
        ))}
      </div>

      <textarea
        value={body}
        onChange={e => setBody(e.target.value)}
        placeholder="Write a reply — will be emailed to the user and saved to the thread."
        rows={4}
        style={{
          width: "100%",
          background: "rgba(66,53,33,0.05)",
          border: "1px solid rgba(66,53,33,0.12)",
          borderRadius: 10,
          padding: "10px 12px",
          color: "#2f2618",
          fontFamily: "inherit",
          fontSize: 13,
          lineHeight: 1.6,
          resize: "vertical",
          outline: "none",
          boxSizing: "border-box",
        }}
      />
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 8 }}>
        <span style={{ fontSize: 11, color: "#9a9181" }}>
          {body.length} / 5000
        </span>
        <button
          onClick={() => {
            const t = body.trim();
            if (!t) return;
            send.mutate(t);
          }}
          disabled={send.isPending || !body.trim()}
          style={{
            fontSize: 12,
            fontWeight: 600,
            padding: "8px 20px",
            borderRadius: 8,
            background: body.trim() && !send.isPending ? "#2f2618" : "rgba(66,53,33,0.12)",
            color: body.trim() && !send.isPending ? "#000" : "#8a8070",
            border: "none",
            cursor: body.trim() && !send.isPending ? "pointer" : "not-allowed",
          }}
        >
          {send.isPending ? "Sending…" : "Send reply"}
        </button>
      </div>
    </div>
  );
}

// Shown when a section's data genuinely failed to load. The panel used to
// render an empty table in this case, which read as "no users" rather than
// "could not reach the server".
function LoadError({ error, onRetry }: { error: unknown; onRetry?: () => void }) {
  return (
    <div style={{
      background: T.card, border: "1px solid " + T.dangerBorder, borderRadius: 12,
      padding: "18px 20px", maxWidth: 520,
    }}>
      <div style={{ fontSize: 14, fontWeight: 700, color: T.text, marginBottom: 6 }}>
        Could not load this section
      </div>
      <div style={{ fontSize: 13, color: T.muted, lineHeight: 1.6, marginBottom: onRetry ? 14 : 0 }}>
        {adminErrorText(error, false)}
      </div>
      {onRetry && (
        <button onClick={onRetry} style={{ ...S.btn("default"), padding: "8px 16px" }}>Retry</button>
      )}
    </div>
  );
}

function Spinner() {
  return (
    <div style={{ textAlign: "center", padding: "60px 0", color: "rgba(66,53,33,0.26)" }}>
      Loading…
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  display: "block",
  width: "100%",
  marginTop: 6,
  background: "rgba(66,53,33,0.07)",
  border: "1px solid rgba(66,53,33,0.16)",
  borderRadius: 8,
  padding: "9px 12px",
  color: "#2f2618",
  fontSize: 14,
  outline: "none",
  boxSizing: "border-box",
};

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div
      style={{ position: "fixed", inset: 0, background: "rgba(41,33,21,0.45)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div style={{ background: "#fffdf7", border: "1px solid rgba(66,53,33,0.12)", borderRadius: 14, padding: 28, width: "100%", maxWidth: 400 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
          <span style={{ fontWeight: 700, fontSize: 16 }}>{title}</span>
          <button onClick={onClose} style={{ background: "none", border: "none", color: "#8a8070", cursor: "pointer", fontSize: 20 }}>×</button>
        </div>
        {children}
      </div>
    </div>
  );
}

// ─── Chart Colors ─────────────────────────────────────────────────────────────

const COLORS = ["#7b5e3b", "#3f7d4e", "#a6761d", "#a13c2c", "#4a6fa5", "#7d5ba6"];
const chartTooltipStyle = { backgroundColor: "#fffdf7", border: "1px solid rgba(66,53,33,0.12)", borderRadius: 8, color: "#2f2618", fontSize: 12 };

function ChartCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ background: "rgba(66,53,33,0.05)", border: "1px solid rgba(66,53,33,0.12)", borderRadius: 14, padding: "20px 24px", marginBottom: 20 }}>
      <div style={{ fontSize: 14, fontWeight: 600, color: "#4a4132", marginBottom: 16 }}>{title}</div>
      {children}
    </div>
  );
}

function MiniStat({ label, value, sub }: { label: string; value: string | number; sub?: string }) {
  return (
    <div style={{ background: "rgba(66,53,33,0.05)", border: "1px solid rgba(66,53,33,0.12)", borderRadius: 10, padding: "16px 20px", flex: 1 }}>
      <div style={{ fontSize: 11, color: "#8a8070", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 6 }}>{label}</div>
      <div style={{ fontSize: 24, fontWeight: 700, letterSpacing: "-0.5px" }}>{typeof value === "number" ? value.toLocaleString() : value}</div>
      {sub && <div style={{ fontSize: 11, color: "#9a9181", marginTop: 4 }}>{sub}</div>}
    </div>
  );
}

// ─── 1. ANALYTICS TAB ─────────────────────────────────────────────────────────

function AnalyticsTab() {
  const [days, setDays] = useState(30);
  const { data: overview } = useQuery<any>({
    queryKey: ["/api/admin/analytics/overview"],
    queryFn: () => adminFetch("/api/admin/analytics/overview"),
  });
  const { data: signups = [] } = useQuery<any[]>({
    queryKey: ["/api/admin/analytics/signups", days],
    queryFn: () => adminFetchList(`/api/admin/analytics/signups?days=${days}`),
  });
  const { data: writing = [] } = useQuery<any[]>({
    queryKey: ["/api/admin/analytics/writing-activity", days],
    queryFn: () => adminFetchList(`/api/admin/analytics/writing-activity?days=${days}`),
  });

  if (!overview) return <Spinner />;

  return (
    <div>
      <div style={{ display: "flex", gap: 12, marginBottom: 24, flexWrap: "wrap" }}>
        <MiniStat label="DAU" value={overview.dau ?? 0} sub="Active today" />
        <MiniStat label="WAU" value={overview.wau ?? 0} sub="Active this week" />
        <MiniStat label="MAU" value={overview.mau ?? 0} sub="Active this month" />
        <MiniStat label="New Users (30d)" value={overview.newUsersMonth ?? 0} />
        <MiniStat label="Words Written (30d)" value={Number(overview.wordsWrittenMonth || 0).toLocaleString()} />
      </div>

      {/* Date range selector */}
      <div style={{ display: "flex", gap: 6, marginBottom: 20, alignItems: "center" }}>
        <span style={{ fontSize: 12, color: "#8a8070", marginRight: 4 }}>Range:</span>
        {[7, 30, 60, 90].map(d => (
          <button key={d} onClick={() => setDays(d)}
            style={{ padding: "4px 12px", borderRadius: 6, fontSize: 11, fontWeight: 600, cursor: "pointer", border: days === d ? "none" : "1px solid rgba(66,53,33,0.12)", background: days === d ? "#2f2618" : "transparent", color: days === d ? "#000" : "#8a8070", transition: "all 0.15s" }}
          >{d}d</button>
        ))}
        <a href={`/api/admin/export/analytics.csv?days=${days}`} download style={{ marginLeft: "auto", ...S.btn("ghost"), textDecoration: "none", display: "inline-flex", alignItems: "center", gap: 4, fontSize: 11 }}>
          ↓ Export CSV
        </a>
      </div>

      <div className="admin-two-col" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
        <ChartCard title={`Daily Sign-ups (${days}d)`}>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={signups.map((r: any) => ({ day: r.day?.slice(5, 10), count: Number(r.count) }))}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(66,53,33,0.07)" />
              <XAxis dataKey="day" tick={{ fill: "#9a9181", fontSize: 10 }} />
              <YAxis tick={{ fill: "#9a9181", fontSize: 10 }} />
              <Tooltip contentStyle={chartTooltipStyle} />
              <Bar dataKey="count" fill="#7b5e3b" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title={`Daily Writing Activity (${days}d)`}>
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={writing.map((r: any) => ({ day: r.day?.slice(5, 10), words: Number(r.words) }))}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(66,53,33,0.07)" />
              <XAxis dataKey="day" tick={{ fill: "#9a9181", fontSize: 10 }} />
              <YAxis tick={{ fill: "#9a9181", fontSize: 10 }} />
              <Tooltip contentStyle={chartTooltipStyle} />
              <Area type="monotone" dataKey="words" stroke="#3f7d4e" fill="rgba(52,211,153,0.15)" />
            </AreaChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>
    </div>
  );
}

// ─── 1b. DEVICES / TRAFFIC TAB ─────────────────────────────────────────────
// Shows unique-device counts, device/browser/OS breakdowns, top pages,
// and a daily traffic chart. Bots are filtered out server-side so the
// numbers reflect real humans.

const DEVICE_COLORS: Record<string, string> = {
  desktop: "#7b5e3b",
  mobile:  "#3f7d4e",
  tablet:  "#a6761d",
  bot:     "#a13c2c",
  unknown: "#9a9181",
};

function deviceColor(label: string): string {
  return DEVICE_COLORS[(label || "").toLowerCase()] || "#6d6354";
}

function DevicesTab() {
  const [days, setDays] = useState(30);

  const { data: overview } = useQuery<any>({
    queryKey: ["/api/admin/analytics/devices"],
    queryFn: () => adminFetch("/api/admin/analytics/devices"),
    refetchInterval: 60_000, // live refresh every minute
    staleTime: 60_000,
  });

  const { data: breakdown } = useQuery<any>({
    queryKey: ["/api/admin/analytics/devices/breakdown", days],
    queryFn: () => adminFetch(`/api/admin/analytics/devices/breakdown?days=${days}`),
  });

  const { data: topPages } = useQuery<any>({
    queryKey: ["/api/admin/analytics/top-pages", days],
    queryFn: () => adminFetch(`/api/admin/analytics/top-pages?days=${days}&limit=15`),
  });

  const { data: daily } = useQuery<any>({
    queryKey: ["/api/admin/analytics/daily-traffic", days],
    queryFn: () => adminFetch(`/api/admin/analytics/daily-traffic?days=${days}`),
  });

  if (!overview) return <Spinner />;

  const byType    = (breakdown?.deviceType as Array<{ label: string; count: number }>) || [];
  const byBrowser = (breakdown?.browser    as Array<{ label: string; count: number }>) || [];
  const byOs      = (breakdown?.os         as Array<{ label: string; count: number }>) || [];
  const dailyRows = (daily?.rows           as Array<{ day: string; views: number; unique_devices: number }>) || [];
  const topRows   = (topPages?.rows        as Array<{ path: string; views: number; unique_devices: number }>) || [];

  return (
    <div>
      {/* Hero stats — unique devices. These are what the user asked for:
          "how many devices have accessed the site". */}
      <div style={{ display: "flex", gap: 12, marginBottom: 18, flexWrap: "wrap" }}>
        <MiniStat label="Devices today"      value={(overview.uniqueDevices?.day ?? 0)}   sub="Last 24h" />
        <MiniStat label="Devices this week"  value={(overview.uniqueDevices?.week ?? 0)}  sub="Last 7d" />
        <MiniStat label="Devices this month" value={(overview.uniqueDevices?.month ?? 0)} sub="Last 30d" />
      </div>

      <div style={{ display: "flex", gap: 12, marginBottom: 24, flexWrap: "wrap" }}>
        <MiniStat label="Page views today"   value={Number((overview.pageViews?.day ?? 0)  ).toLocaleString()} />
        <MiniStat label="Page views 7d"      value={Number((overview.pageViews?.week ?? 0) ).toLocaleString()} />
        <MiniStat label="Page views 30d"     value={Number((overview.pageViews?.month ?? 0)).toLocaleString()} />
        <MiniStat label="Page views (all)"   value={Number((overview.pageViews?.total ?? 0)).toLocaleString()} sub="All time" />
      </div>

      {/* Range selector shared by breakdown + top pages + daily chart */}
      <div style={{ display: "flex", gap: 6, marginBottom: 20, alignItems: "center" }}>
        <span style={{ fontSize: 12, color: "#8a8070", marginRight: 4 }}>Range:</span>
        {[7, 30, 60, 90].map(d => (
          <button key={d} onClick={() => setDays(d)}
            style={{ padding: "4px 12px", borderRadius: 6, fontSize: 11, fontWeight: 600, cursor: "pointer", border: days === d ? "none" : "1px solid rgba(66,53,33,0.12)", background: days === d ? "#2f2618" : "transparent", color: days === d ? "#000" : "#8a8070", transition: "all 0.15s" }}
          >{d}d</button>
        ))}
      </div>

      {/* Daily traffic chart */}
      <ChartCard title={`Daily traffic (${days}d)`}>
        <ResponsiveContainer width="100%" height={220}>
          <AreaChart data={dailyRows.map(r => ({
            day: r.day ? String(r.day).slice(5, 10) : "",
            views: Number(r.views),
            devices: Number(r.unique_devices),
          }))}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(66,53,33,0.07)" />
            <XAxis dataKey="day" tick={{ fill: "#9a9181", fontSize: 10 }} />
            <YAxis tick={{ fill: "#9a9181", fontSize: 10 }} />
            <Tooltip contentStyle={chartTooltipStyle} />
            <Area type="monotone" dataKey="views" name="Page views" stroke="#7b5e3b" fill="rgba(129,140,248,0.18)" strokeWidth={2} />
            <Area type="monotone" dataKey="devices" name="Unique devices" stroke="#3f7d4e" fill="rgba(52,211,153,0.18)" strokeWidth={2} />
          </AreaChart>
        </ResponsiveContainer>
      </ChartCard>

      {/* Breakdown: device type / browser / OS side-by-side */}
      <div className="admin-two-col" style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 20, marginTop: 20 }}>
        <ChartCard title={`Device type (${days}d)`}>
          {byType.length === 0 ? (
            <EmptyNote />
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {byType.map((r: any, i: number) => (
                <div key={i} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <span style={{ width: 9, height: 9, borderRadius: 3, background: deviceColor(r.label), flexShrink: 0 }} />
                  <span style={{ flex: 1, fontSize: 13, color: T.body, textTransform: "capitalize" }}>{r.label || "unknown"}</span>
                  <span style={{ fontSize: 15, fontWeight: 700, color: T.text, fontVariantNumeric: "tabular-nums" }}>
                    {Number(r.count || 0).toLocaleString()}
                  </span>
                </div>
              ))}
            </div>
          )}
        </ChartCard>

        <ChartCard title={`Top browsers (${days}d)`}>
          {byBrowser.length === 0 ? <EmptyNote /> : <HorizontalBars rows={byBrowser} accent="#4a6fa5" />}
        </ChartCard>

        <ChartCard title={`Top OS (${days}d)`}>
          {byOs.length === 0 ? <EmptyNote /> : <HorizontalBars rows={byOs} accent="#7d5ba6" />}
        </ChartCard>
      </div>

      {/* Top pages */}
      <div style={{ marginTop: 20 }}>
        <ChartCard title={`Most visited pages (${days}d)`}>
          {topRows.length === 0 ? <EmptyNote /> : (
            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              {topRows.map((row, i) => {
                const maxViews = Math.max(...topRows.map(r => Number(r.views) || 0));
                const pct = maxViews > 0 ? (Number(row.views) / maxViews) * 100 : 0;
                return (
                  <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, padding: "6px 8px", borderRadius: 6, background: i % 2 === 0 ? "rgba(66,53,33,0.03)" : "transparent" }}>
                    <span style={{ flex: 1, minWidth: 0, fontSize: 12, color: "#4a4132", fontFamily: "ui-monospace, SFMono-Regular, monospace", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                      {row.path || "/"}
                    </span>
                    <div style={{ flex: "0 0 160px", height: 6, borderRadius: 3, background: "rgba(66,53,33,0.07)", overflow: "hidden" }}>
                      <div style={{ width: `${pct}%`, height: "100%", background: "#7b5e3b" }} />
                    </div>
                    <span style={{ width: 60, textAlign: "right", fontSize: 11, fontWeight: 600, color: "#3a3020" }}>
                      {Number(row.views).toLocaleString()}
                    </span>
                    <span title="Unique devices" style={{ width: 50, textAlign: "right", fontSize: 10, color: "#8a8070" }}>
                      {Number(row.unique_devices).toLocaleString()}
                    </span>
                  </div>
                );
              })}
              <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "4px 8px", fontSize: 10, color: "#9a9181", borderTop: "1px solid rgba(66,53,33,0.07)", marginTop: 4 }}>
                <span style={{ flex: 1 }}>path</span>
                <span style={{ flex: "0 0 160px" }}/>
                <span style={{ width: 60, textAlign: "right" }}>views</span>
                <span style={{ width: 50, textAlign: "right" }}>devices</span>
              </div>
            </div>
          )}
        </ChartCard>
      </div>
    </div>
  );
}

function EmptyNote() {
  return (
    <div style={{ height: 220, display: "flex", alignItems: "center", justifyContent: "center", color: "#9a9181", fontSize: 12 }}>
      Not enough data yet
    </div>
  );
}

function HorizontalBars({ rows, accent }: { rows: Array<{ label: string; count: number }>; accent: string }) {
  const max = Math.max(...rows.map(r => Number(r.count) || 0));
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6, paddingTop: 4 }}>
      {rows.slice(0, 8).map((r, i) => {
        const pct = max > 0 ? (Number(r.count) / max) * 100 : 0;
        return (
          <div key={i} style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ flex: "0 0 90px", fontSize: 12, color: "#4a4132", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
              {r.label}
            </span>
            <div style={{ flex: 1, height: 8, borderRadius: 4, background: "rgba(66,53,33,0.07)", overflow: "hidden" }}>
              <div style={{ width: `${pct}%`, height: "100%", background: accent }} />
            </div>
            <span style={{ width: 38, textAlign: "right", fontSize: 11, fontWeight: 600, color: "#3a3020" }}>
              {Number(r.count).toLocaleString()}
            </span>
          </div>
        );
      })}
    </div>
  );
}

// ─── 2. REVENUE TAB ───────────────────────────────────────────────────────────

// Format plan codes from subscription_payments ("premium_yearly") into a
// human-readable string ("Premium Yearly"). Mirrors the formatter on the
// backend in storage.getActivityFeed for consistency.
function formatPlanDisplay(plan: string): string {
  return plan.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

// Render an arrow + colored % for a delta. null means we don't have the
// data to compute a comparison (typically: prior month had zero revenue).
function DeltaBadge({ pct }: { pct: number | null }) {
  if (pct === null || !isFinite(pct)) {
    return <span style={{ color: "#9a9181", fontWeight: 600, fontSize: 12 }}>—</span>;
  }
  const positive = pct >= 0;
  return (
    <span style={{ color: positive ? "#3f7d4e" : "#a13c2c", fontWeight: 600, fontSize: 12 }}>
      {positive ? "▲" : "▼"} {Math.abs(pct).toFixed(1)}%
    </span>
  );
}

interface RecentPayment {
  id: number;
  userId: number;
  userEmail: string | null;
  userDisplayName: string | null;
  amountCents: number;
  currency: string;
  plan: string;
  tier: string;
  cycle: string;
  paymentMethod: string;
  status: string;
  createdAt: string;
}

interface RevenueData {
  tiers: Array<{ tier: string; plan: string; count: number | string }>;
  activeSubscribers: number;
  monthlySubs: number;
  yearlySubs: number;
  mrrCents: number;
  mrrDollars: string;
  churnedLast30Days: number;
  // From subscription_payments
  mrrCurrentMonthCents: number;
  mrrPriorMonthCents: number;
  mrrDeltaPct: number | null;
  conversionRateAllTimePct: number | null;
  conversionRateLast30dPct: number | null;
  churnRateLast30dPct: number | null;
  paidUsersAllTime: number;
  verifiedSignupsAllTime: number;
  paidUsersLast30d: number;
  verifiedSignupsLast30d: number;
  recentPayments: RecentPayment[];
}

function RevenueTab() {
  const { data } = useQuery<RevenueData>({
    queryKey: ["/api/admin/analytics/revenue"],
    queryFn: () => adminFetch("/api/admin/analytics/revenue"),
  });

  // Monthly revenue from subscription_payments table — separate endpoint so
  // it can be re-fetched / windowed independently of the headline cards.
  const { data: monthly } = useQuery<{ months: Array<{ month: string; revenueCents: number; paymentCount: number; uniquePayers: number }> }>({
    queryKey: ["/api/admin/analytics/revenue/monthly"],
    queryFn: () => adminFetch("/api/admin/analytics/revenue/monthly?months=12"),
  });

  if (!data) return <Spinner />;

  const pieData = (data.tiers || []).map((t: any, i: number) => ({
    name: `${t.tier}/${t.plan}`,
    value: Number(t.count),
    color: COLORS[i % COLORS.length],
  }));

  // Backend returns DESC (newest first); reverse for a chart that reads
  // chronologically left-to-right. Map cents → dollars for the y-axis.
  const chartData = (monthly?.months || []).slice().reverse().map((m) => ({
    month: m.month,
    revenue: m.revenueCents / 100,
    paymentCount: m.paymentCount,
  }));

  const fmtPct = (p: number | null) => (p === null || !isFinite(p) ? "—" : `${p.toFixed(1)}%`);

  return (
    <div>
      {/* Headline cards — pre-existing estimated MRR snapshot */}
      <div style={{ display: "flex", gap: 12, marginBottom: 12, flexWrap: "wrap" }}>
        <MiniStat label="MRR (estimated)" value={`$${data.mrrDollars}`} sub="From active subs" />
        <MiniStat label="Active Subscribers" value={data.activeSubscribers} />
        <MiniStat label="Monthly Plans" value={data.monthlySubs} sub="Pro and Premium" />
        <MiniStat label="Yearly Plans" value={data.yearlySubs} sub="Pro and Premium" />
        <MiniStat label="Churned (30d)" value={data.churnedLast30Days} sub="Cancelled recently" />
      </div>

      {/* Real cash + funnel cards — sourced from subscription_payments */}
      <div style={{ display: "flex", gap: 12, marginBottom: 24, flexWrap: "wrap" }}>
        <div style={{ background: "rgba(63,125,78,0.06)", border: "1px solid rgba(63,125,78,0.2)", borderRadius: 10, padding: "16px 20px", flex: 1, minWidth: 200 }}>
          <div style={{ fontSize: 11, color: "#8a8070", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 6 }}>Revenue This Month</div>
          <div style={{ fontSize: 24, fontWeight: 700, letterSpacing: "-0.5px", display: "flex", alignItems: "baseline", gap: 8 }}>
            ${(data.mrrCurrentMonthCents / 100).toFixed(2)}
            <DeltaBadge pct={data.mrrDeltaPct} />
          </div>
          <div style={{ fontSize: 11, color: "#9a9181", marginTop: 4 }}>
            vs ${(data.mrrPriorMonthCents / 100).toFixed(2)} prior month
          </div>
        </div>
        <MiniStat
          label="Conversion Rate"
          value={fmtPct(data.conversionRateAllTimePct)}
          sub={`${data.paidUsersAllTime} paid / ${data.verifiedSignupsAllTime} verified — 30d: ${fmtPct(data.conversionRateLast30dPct)}`}
        />
        <MiniStat
          label="Churn Rate (30d)"
          value={fmtPct(data.churnRateLast30dPct)}
          sub={`${data.churnedLast30Days} churned of ${data.activeSubscribers + data.churnedLast30Days} active+churned`}
        />
      </div>

      <ChartCard title="Subscription tiers">
        {(data.tiers || []).length === 0 ? (
          <EmptyNote />
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {(data.tiers || []).map((t: any, i: number) => (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <span style={{ width: 9, height: 9, borderRadius: 3, background: COLORS[i % COLORS.length], flexShrink: 0 }} />
                <span style={{ flex: 1, fontSize: 13, color: T.body }}>
                  {t.tier || "free"}{t.plan ? " · " + t.plan : ""}
                </span>
                <span style={{ fontSize: 15, fontWeight: 700, color: T.text, fontVariantNumeric: "tabular-nums" }}>
                  {Number(t.count || 0).toLocaleString()}
                </span>
              </div>
            ))}
          </div>
        )}
      </ChartCard>

      <ChartCard title="Monthly Revenue (Last 12 Months)">
        {chartData.length === 0 ? (
          <div style={{ textAlign: "center", padding: "40px 0", color: "#8a8070", fontSize: 13 }}>
            No completed payments yet — chart will populate once real revenue lands.
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={chartData} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(66,53,33,0.07)" />
              <XAxis dataKey="month" tick={{ fill: "#8a8070", fontSize: 11 }} />
              <YAxis tick={{ fill: "#8a8070", fontSize: 11 }} tickFormatter={(v) => `$${v}`} />
              <Tooltip
                contentStyle={chartTooltipStyle}
                formatter={(value: any, name: string) => name === "revenue" ? [`$${Number(value).toFixed(2)}`, "Revenue"] : [value, name]}
              />
              <Bar dataKey="revenue" fill="#3f7d4e" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </ChartCard>

      <ChartCard title="Recent Payments">
        {(data.recentPayments || []).length === 0 ? (
          <div style={{ textAlign: "center", padding: "40px 0", color: "#8a8070", fontSize: 13 }}>
            No completed payments yet.
          </div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
              <thead>
                <tr style={{ borderBottom: "1px solid rgba(66,53,33,0.12)" }}>
                  <th style={{ textAlign: "left", padding: "10px 12px", color: "#8a8070", fontWeight: 600, fontSize: 11, textTransform: "uppercase", letterSpacing: "0.05em" }}>Date</th>
                  <th style={{ textAlign: "left", padding: "10px 12px", color: "#8a8070", fontWeight: 600, fontSize: 11, textTransform: "uppercase", letterSpacing: "0.05em" }}>User</th>
                  <th style={{ textAlign: "right", padding: "10px 12px", color: "#8a8070", fontWeight: 600, fontSize: 11, textTransform: "uppercase", letterSpacing: "0.05em" }}>Amount</th>
                  <th style={{ textAlign: "left", padding: "10px 12px", color: "#8a8070", fontWeight: 600, fontSize: 11, textTransform: "uppercase", letterSpacing: "0.05em" }}>Plan</th>
                  <th style={{ textAlign: "left", padding: "10px 12px", color: "#8a8070", fontWeight: 600, fontSize: 11, textTransform: "uppercase", letterSpacing: "0.05em" }}>Method</th>
                </tr>
              </thead>
              <tbody>
                {(data.recentPayments || []).map((p) => (
                  <tr key={p.id} style={{ borderBottom: "1px solid rgba(66,53,33,0.05)" }}>
                    <td style={{ padding: "12px", color: "#4a4132", whiteSpace: "nowrap" }}>
                      {new Date(p.createdAt).toLocaleString(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                    </td>
                    <td style={{ padding: "12px", color: "#3a3020", maxWidth: 220, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {p.userDisplayName || p.userEmail || <span style={{ color: "#9a9181", fontStyle: "italic" }}>deleted user</span>}
                    </td>
                    <td style={{ padding: "12px", textAlign: "right", color: "#3f7d4e", fontWeight: 600, whiteSpace: "nowrap" }}>
                      ${(p.amountCents / 100).toFixed(2)}
                    </td>
                    <td style={{ padding: "12px", color: "#4a4132", whiteSpace: "nowrap" }}>
                      {formatPlanDisplay(p.plan)}
                    </td>
                    <td style={{ padding: "12px", color: "#6d6354", fontSize: 12, whiteSpace: "nowrap" }}>
                      {p.paymentMethod === "paypal_card" ? "Card" : p.paymentMethod === "paypal_account" ? "PayPal" : p.paymentMethod}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </ChartCard>

      {/* Donations — Plotzy is free for everyone, so donations live in
          their own table. Headline cards + a recent-donations list. */}
      <DonationsPanel />
    </div>
  );
}

// ─── 2c. DONATIONS PANEL (inside Revenue tab) ────────────────────────────────

interface AdminDonation {
  id: number;
  userId: number | null;
  donorEmail: string | null;
  donorName: string | null;
  amountCents: number;
  currency: string;
  status: string;
  createdAt: string;
}

interface DonationsData {
  totalCents: number;
  totalDollars: string;
  monthCents: number;
  monthDollars: string;
  donationCount: number;
  uniqueDonors: number;
  donations: AdminDonation[];
}

function DonationsPanel() {
  const { data, isLoading } = useQuery<DonationsData>({
    queryKey: ["/api/admin/donations"],
    queryFn: () =>
      adminFetch("/api/admin/donations?limit=100"),
  });

  if (isLoading || !data) {
    return (
      <ChartCard title="Donations">
        <div style={{ textAlign: "center", padding: "40px 0", color: "#8a8070", fontSize: 13 }}>
          Loading donations…
        </div>
      </ChartCard>
    );
  }

  return (
    <>
      {/* Headline cards — total raised, this month, count, unique donors. */}
      <div style={{ display: "flex", gap: 12, marginTop: 8, marginBottom: 16, flexWrap: "wrap" }}>
        <div style={{ background: "rgba(125,91,166,0.06)", border: "1px solid rgba(125,91,166,0.2)", borderRadius: 10, padding: "16px 20px", flex: 1, minWidth: 200 }}>
          <div style={{ fontSize: 11, color: "#8a8070", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 6 }}>Donations (Lifetime)</div>
          <div style={{ fontSize: 24, fontWeight: 700, letterSpacing: "-0.5px" }}>
            ${data.totalDollars}
          </div>
          <div style={{ fontSize: 11, color: "#9a9181", marginTop: 4 }}>
            {data.donationCount} {data.donationCount === 1 ? "donation" : "donations"}
          </div>
        </div>
        <MiniStat label="Donations This Month" value={`$${data.monthDollars}`} sub="Calendar month to date" />
        <MiniStat label="Unique Donors" value={data.uniqueDonors} sub="By email or order" />
      </div>

      <ChartCard title="Recent Donations">
        {(data.donations || []).length === 0 ? (
          <div style={{ textAlign: "center", padding: "40px 0", color: "#8a8070", fontSize: 13 }}>
            No donations yet. Once supporters chip in, they will appear here.
          </div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
              <thead>
                <tr style={{ borderBottom: "1px solid rgba(66,53,33,0.12)" }}>
                  <th style={{ textAlign: "left", padding: "10px 12px", color: "#8a8070", fontWeight: 600, fontSize: 11, textTransform: "uppercase", letterSpacing: "0.05em" }}>Date</th>
                  <th style={{ textAlign: "left", padding: "10px 12px", color: "#8a8070", fontWeight: 600, fontSize: 11, textTransform: "uppercase", letterSpacing: "0.05em" }}>Donor</th>
                  <th style={{ textAlign: "left", padding: "10px 12px", color: "#8a8070", fontWeight: 600, fontSize: 11, textTransform: "uppercase", letterSpacing: "0.05em" }}>Email</th>
                  <th style={{ textAlign: "right", padding: "10px 12px", color: "#8a8070", fontWeight: 600, fontSize: 11, textTransform: "uppercase", letterSpacing: "0.05em" }}>Amount</th>
                  <th style={{ textAlign: "left", padding: "10px 12px", color: "#8a8070", fontWeight: 600, fontSize: 11, textTransform: "uppercase", letterSpacing: "0.05em" }}>Account</th>
                </tr>
              </thead>
              <tbody>
                {(data.donations || []).map((d) => (
                  <tr key={d.id} style={{ borderBottom: "1px solid rgba(66,53,33,0.05)" }}>
                    <td style={{ padding: "12px", color: "#4a4132", whiteSpace: "nowrap" }}>
                      {new Date(d.createdAt).toLocaleString(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                    </td>
                    <td style={{ padding: "12px", color: "#3a3020", maxWidth: 200, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {d.donorName || <span style={{ color: "#9a9181", fontStyle: "italic" }}>Anonymous</span>}
                    </td>
                    <td style={{ padding: "12px", color: "#5c5142", maxWidth: 240, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", fontSize: 12 }}>
                      {d.donorEmail || <span style={{ color: "#9a9181" }}>—</span>}
                    </td>
                    <td style={{ padding: "12px", textAlign: "right", color: "#7d5ba6", fontWeight: 600, whiteSpace: "nowrap" }}>
                      ${(d.amountCents / 100).toFixed(2)} {d.currency}
                    </td>
                    <td style={{ padding: "12px", color: "#6d6354", fontSize: 12, whiteSpace: "nowrap" }}>
                      {d.userId !== null ? (
                        <span style={{ background: "rgba(63,125,78,0.12)", color: "#3f7d4e", padding: "2px 8px", borderRadius: 5, fontSize: 11, fontWeight: 600 }}>Registered</span>
                      ) : (
                        <span style={{ background: "rgba(66,53,33,0.07)", color: "#6d6354", padding: "2px 8px", borderRadius: 5, fontSize: 11, fontWeight: 600 }}>Guest</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </ChartCard>
    </>
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
    queryFn: () => adminFetchList(`/api/admin/flags?status=${filter}`),
  });

  const createFlag = useMutation({
    mutationFn: () => adminFetch("/api/admin/flags", {
      method: "POST", headers: { "Content-Type": "application/json" }, 
      body: JSON.stringify({ bookId: Number(flagBookId), reason: flagReason }),
    }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/admin/flags"] }); toast({ title: "Book flagged" }); setFlagBookId(""); setFlagReason(""); },
  });

  const reviewFlag = useMutation({
    mutationFn: ({ id, status, reviewNote }: { id: number; status: string; reviewNote?: string }) =>
      adminFetch(`/api/admin/flags/${id}`, {
        method: "PATCH", headers: { "Content-Type": "application/json" }, 
        body: JSON.stringify({ status, reviewNote }),
      }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/admin/flags"] }); toast({ title: "Flag reviewed" }); },
  });

  return (
    <div>
      {/* Flag a book form */}
      <div style={{ background: "rgba(66,53,33,0.05)", border: "1px solid rgba(66,53,33,0.12)", borderRadius: 12, padding: 20, marginBottom: 24, display: "flex", gap: 12, alignItems: "flex-end", flexWrap: "wrap" }}>
        <div style={{ flex: "1 1 110px", minWidth: 100 }}>
          <label style={{ fontSize: 11, color: "#8a8070", fontWeight: 600 }}>Book ID</label>
          <input value={flagBookId} onChange={e => setFlagBookId(e.target.value)} style={inputStyle} placeholder="123" />
        </div>
        <div style={{ flex: "3 1 220px", minWidth: 180 }}>
          <label style={{ fontSize: 11, color: "#8a8070", fontWeight: 600 }}>Reason</label>
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
      <div style={{ overflowX: "auto", WebkitOverflowScrolling: "touch" }}>
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
                  {f.status !== "pending" && <span style={{ fontSize: 12, color: "#9a9181", textTransform: "capitalize" }}>{f.status}</span>}
                </td>
              </tr>
            ))}
            {flags.length === 0 && (
              <tr><td colSpan={5} style={{ ...S.td, textAlign: "center", color: "rgba(66,53,33,0.22)", padding: 40 }}>No {filter} flags</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─── 4. ENGAGEMENT TAB ────────────────────────────────────────────────────────

function EngagementTab() {
  const [view, setView] = useState<"leaderboard" | "inactive" | "ai">("leaderboard");

  const { data: leaderboard = [] } = useQuery<any[]>({
    queryKey: ["/api/admin/analytics/leaderboard"],
    queryFn: () => adminFetchList("/api/admin/analytics/leaderboard"),
    enabled: view === "leaderboard",
  });

  const { data: inactive = [] } = useQuery<any[]>({
    queryKey: ["/api/admin/analytics/inactive-users"],
    queryFn: () => adminFetchList("/api/admin/analytics/inactive-users"),
    enabled: view === "inactive",
  });

  const { data: ai } = useQuery<any>({
    queryKey: ["/api/admin/analytics/ai-usage"],
    queryFn: () => adminFetch("/api/admin/analytics/ai-usage"),
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
        <div style={{ overflowX: "auto", WebkitOverflowScrolling: "touch" }}>
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
                      {u.avatar_url && <img src={u.avatar_url} alt={u.display_name || u.email || ""} style={{ width: 24, height: 24, borderRadius: "50%" }} />}
                      <span>{u.display_name || u.email || "—"}</span>
                    </div>
                  </td>
                  <td style={{ ...S.td, fontWeight: 700, color: "#7b5e3b" }}>{Number(u.total_words_written || 0).toLocaleString()}</td>
                  <td style={S.td}>{u.streak_days}d (best: {u.longest_streak}d)</td>
                  <td style={S.td}>{u.total_books_published}</td>
                  <td style={S.td}>{Number(u.total_views_received || 0).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {view === "inactive" && (
        <div style={{ overflowX: "auto", WebkitOverflowScrolling: "touch" }}>
          <table style={S.table}>
            <thead><tr>
              <th style={S.th}>User</th><th style={S.th}>Last Wrote</th><th style={S.th}>Words Total</th><th style={S.th}>Subscription</th><th style={S.th}>Joined</th>
            </tr></thead>
            <tbody>
              {inactive.map((u: any) => (
                <tr key={u.id}>
                  <td style={S.td}>{u.display_name || u.email || "—"}</td>
                  <td style={{ ...S.td, color: "#a13c2c" }}>{u.last_writing_date ? new Date(u.last_writing_date).toLocaleDateString() : "Never"}</td>
                  <td style={S.td}>{Number(u.total_words_written || 0).toLocaleString()}</td>
                  <td style={S.td}>{u.subscription_status || "free"}</td>
                  <td style={S.td}>{u.created_at ? new Date(u.created_at).toLocaleDateString() : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {view === "ai" && ai && (
        <div>
          <div style={{ display: "flex", gap: 12, marginBottom: 24, flexWrap: "wrap" }}>
            <MiniStat label="Total AI Calls" value={(ai.totals?.calls ?? 0)} />
            <MiniStat label="Total Cost" value={`$${(ai.totals?.costDollars ?? 0)}`} sub="Estimated" />
            <MiniStat label="Prompt Tokens" value={Number(ai.totals?.promptTokens ?? 0).toLocaleString()} />
            <MiniStat label="Completion Tokens" value={Number(ai.totals?.completionTokens ?? 0).toLocaleString()} />
          </div>

          <div className="admin-two-col" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, marginBottom: 20 }}>
            <ChartCard title="Daily AI Cost (30d)">
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={(ai.dailyCost || []).map((r: any) => ({ day: r.day?.slice(5, 10), cost: (Number(r.cost_cents) / 100) }))}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(66,53,33,0.07)" />
                  <XAxis dataKey="day" tick={{ fill: "#9a9181", fontSize: 10 }} />
                  <YAxis tick={{ fill: "#9a9181", fontSize: 10 }} tickFormatter={v => `$${v}`} />
                  <Tooltip contentStyle={chartTooltipStyle} formatter={(v: any) => [`$${Number(v).toFixed(2)}`, "Cost"]} />
                  <Bar dataKey="cost" fill="#a6761d" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </ChartCard>

            <ChartCard title="Cost by model">
          {(ai.byModel || []).length === 0 ? (
            <EmptyNote />
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {(ai.byModel || []).map((m: any, i: number) => (
                <div key={i} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <span style={{ width: 9, height: 9, borderRadius: 3, background: COLORS[i % COLORS.length], flexShrink: 0 }} />
                  <span style={{ flex: 1, fontSize: 13, color: T.body, wordBreak: "break-all" }}>{m.model || "unknown"}</span>
                  <span style={{ fontSize: 12, color: T.dim, fontVariantNumeric: "tabular-nums" }}>
                    {Number(m.calls || 0).toLocaleString()} calls
                  </span>
                  <span style={{ fontSize: 14, fontWeight: 700, color: T.text, fontVariantNumeric: "tabular-nums" }}>
                    ${(Number(m.cost_cents || 0) / 100).toFixed(2)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </ChartCard>
          </div>

          <ChartCard title="Top AI Consumers">
            <div style={{ overflowX: "auto", WebkitOverflowScrolling: "touch" }}>
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
                      <td style={{ ...S.td, fontWeight: 700, color: "#a6761d" }}>${(Number(u.total_cost_cents) / 100).toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
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
    queryFn: () => adminFetch("/api/admin/analytics/system-health"),
    refetchInterval: 30000, // Auto-refresh every 30s
    staleTime: 30000,
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

      <div className="admin-two-col" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, marginBottom: 20 }}>
        <ChartCard title="Requests Per Hour (24h)">
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={(data.hourlyTraffic || []).map((r: any) => ({
              hour: new Date(r.hour).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
              requests: Number(r.requests),
              errors: Number(r.errors),
            }))}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(66,53,33,0.07)" />
              <XAxis dataKey="hour" tick={{ fill: "#9a9181", fontSize: 10 }} />
              <YAxis tick={{ fill: "#9a9181", fontSize: 10 }} />
              <Tooltip contentStyle={chartTooltipStyle} />
              <Area type="monotone" dataKey="requests" stroke="#4a6fa5" fill="rgba(96,165,250,0.15)" />
              <Area type="monotone" dataKey="errors" stroke="#a13c2c" fill="rgba(248,113,113,0.15)" />
            </AreaChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Status codes (24h)">
          {(data.statusBreakdown || []).length === 0 ? (
            <EmptyNote />
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 9 }}>
              {(data.statusBreakdown || []).map((r: any, i: number) => {
                const code = Number(r.status_code);
                const tone = code >= 500 ? T.danger : code >= 400 ? T.warn : T.success;
                return (
                  <div key={i} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <span style={{
                      minWidth: 42, textAlign: "center", padding: "3px 8px", borderRadius: 6,
                      fontSize: 12, fontWeight: 700, color: tone,
                      background: code >= 500 ? T.dangerWash : code >= 400 ? "rgba(166,118,29,0.12)" : T.successWash,
                      fontVariantNumeric: "tabular-nums",
                    }}>{r.status_code}</span>
                    <span style={{ flex: 1, fontSize: 12.5, color: T.muted }}>
                      {code >= 500 ? "Server error" : code >= 400 ? "Client error" : code >= 300 ? "Redirect" : "OK"}
                    </span>
                    <span style={{ fontSize: 14, fontWeight: 700, color: T.text, fontVariantNumeric: "tabular-nums" }}>
                      {Number(r.count || 0).toLocaleString()}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </ChartCard>
      </div>

      <ChartCard title="Slowest Endpoints (24h)">
        <div style={{ overflowX: "auto", WebkitOverflowScrolling: "touch" }}>
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
                  <td style={{ ...S.td, color: Number(ep.avg_ms) > 500 ? "#a13c2c" : Number(ep.avg_ms) > 200 ? "#a6761d" : "#3f7d4e", fontWeight: 600 }}>{ep.avg_ms}ms</td>
                  <td style={S.td}>{ep.max_ms}ms</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
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
    queryFn: () => adminFetchList("/api/admin/tutorials"),
  });

  const createTutorial = useMutation({
    mutationFn: (data: typeof emptyTutorialForm) =>
      adminFetch("/api/admin/tutorials", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        
        body: JSON.stringify(data),
      }),
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
      adminFetch(`/api/admin/tutorials/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        
        body: JSON.stringify(data),
      }),
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
      adminFetch(`/api/admin/tutorials/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/admin/tutorials"] });
      toast({ title: "Tutorial deleted" });
    },
    onError: () => toast({ title: "Failed to delete tutorial", variant: "destructive" }),
  });

  const togglePublished = useMutation({
    mutationFn: ({ id, published }: { id: number; published: boolean }) =>
      adminFetch(`/api/admin/tutorials/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        
        body: JSON.stringify({ published }),
      }),
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

  const lbl: React.CSSProperties = { fontSize: 11, color: "#8a8070", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 5, display: "block" };

  return (
    <>
      {/* ── Header ── */}
      <div style={{ marginBottom: 20, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ fontSize: 13, color: "#8a8070" }}>
          {tutorials.length} tutorial{tutorials.length !== 1 ? "s" : ""} · {tutorials.filter(t => t.published).length} published
        </div>
        {!showForm && (
          <button style={{ ...S.btn("default"), padding: "8px 18px", background: "#2f2618", color: "#000" }} onClick={() => { setEditingId(null); setForm({ ...emptyTutorialForm }); setShowForm(true); }}>
            + Add Tutorial
          </button>
        )}
      </div>

      {/* ── Add/Edit Form ── */}
      {showForm && (
        <div style={{ background: "rgba(66,53,33,0.05)", border: "1px solid rgba(66,53,33,0.12)", borderRadius: 14, padding: 24, marginBottom: 24 }}>
          <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 20, color: "#2f2618" }}>
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
              border: `2px dashed ${dragOver ? "#2f2618" : "rgba(66,53,33,0.16)"}`,
              borderRadius: 12, padding: "20px 24px", marginBottom: 16,
              background: dragOver ? "rgba(66,53,33,0.05)" : "transparent",
              transition: "all 0.15s", textAlign: "center",
            }}
          >
            {form.videoUrl ? (
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <div style={{ flex: 1, textAlign: "left" }}>
                  <div style={{ fontSize: 11, color: "#9a9181", marginBottom: 4 }}>VIDEO URL</div>
                  <input
                    style={{ ...inputStyle, borderColor: "rgba(66,53,33,0.18)" }}
                    value={form.videoUrl}
                    onChange={e => { setForm(f => ({ ...f, videoUrl: e.target.value })); autoThumbnail(e.target.value); }}
                    placeholder="https://youtube.com/watch?v=..."
                  />
                </div>
                <button onClick={() => setForm(f => ({ ...f, videoUrl: "", thumbnailUrl: "" }))} style={{ ...S.btn("ghost"), padding: "6px 10px", fontSize: 11 }}>Clear</button>
              </div>
            ) : (
              <div>
                <div style={{ fontSize: 13, color: "#6d6354", marginBottom: 4 }}>Drag & drop a YouTube or Vimeo link here</div>
                <div style={{ fontSize: 11, color: "rgba(66,53,33,0.26)" }}>or paste the URL below</div>
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
          <div className="admin-two-col" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
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
                <img src={form.thumbnailUrl} alt="Tutorial thumbnail preview" style={{ width: 120, height: 68, objectFit: "cover", borderRadius: 8, border: "1px solid rgba(66,53,33,0.12)" }} />
              )}
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                <button onClick={() => thumbInputRef.current?.click()} style={{ ...S.btn("ghost"), padding: "6px 14px", fontSize: 11 }}>
                  Upload Image
                </button>
                {form.thumbnailUrl && (
                  <button onClick={() => setForm(f => ({ ...f, thumbnailUrl: "" }))} style={{ ...S.btn("ghost"), padding: "6px 14px", fontSize: 11, color: "#a13c2c" }}>
                    Remove
                  </button>
                )}
                <span style={{ fontSize: 11, color: "rgba(66,53,33,0.22)", alignSelf: "center" }}>
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
              <input type="checkbox" checked={form.published} onChange={e => setForm(f => ({ ...f, published: e.target.checked }))} id="tut-pub" style={{ accentColor: "#3f7d4e" }} />
              <label htmlFor="tut-pub" style={{ fontSize: 13, color: "#5c5142", cursor: "pointer" }}>Publish immediately</label>
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <button style={{ ...S.btn("ghost"), padding: "8px 18px" }} onClick={cancelForm}>Cancel</button>
              <button style={{ ...S.btn("default"), padding: "8px 20px", background: "#2f2618", color: "#000", fontWeight: 700 }} onClick={handleSubmit}>
                {editingId ? "Save Changes" : "Add Tutorial"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Tutorial Cards Grid ── */}
      {tutorials.length === 0 && !showForm ? (
        <div style={{ textAlign: "center", padding: "60px 0", color: "rgba(66,53,33,0.26)" }}>
          <p style={{ fontSize: 14 }}>No tutorials yet</p>
          <p style={{ fontSize: 12, color: "rgba(66,53,33,0.18)", marginTop: 4 }}>Click "Add Tutorial" to create your first video guide</p>
        </div>
      ) : tutorials.length > 0 && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: 16 }}>
          {tutorials.map(t => (
            <div key={t.id} style={{
              background: "rgba(66,53,33,0.05)", border: "1px solid rgba(66,53,33,0.07)",
              borderRadius: 12, overflow: "hidden", opacity: t.published ? 1 : 0.5,
            }}>
              {/* Thumbnail */}
              <div style={{ aspectRatio: "16/9", background: "#fffdf7", display: "flex", alignItems: "center", justifyContent: "center", position: "relative" }}>
                {t.thumbnailUrl ? (
                  <img src={t.thumbnailUrl} alt={`${t.title} thumbnail`} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                ) : (
                  <BookOpen style={{ width: 26, height: 26, color: T.dim }} />
                )}
                {t.duration && (
                  <span style={{ position: "absolute", bottom: 6, right: 6, background: "rgba(41,33,21,0.75)", borderRadius: 4, padding: "2px 6px", fontSize: 10, fontWeight: 600, color: T.paper }}>{t.duration}</span>
                )}
                {!t.published && (
                  <span style={{ position: "absolute", top: 6, left: 6, background: "rgba(166,118,29,0.92)", borderRadius: 4, padding: "2px 8px", fontSize: 9, fontWeight: 700, color: T.paper, textTransform: "uppercase" }}>Draft</span>
                )}
              </div>
              {/* Info */}
              <div style={{ padding: "12px 14px" }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: "#2f2618", marginBottom: 4, lineHeight: 1.3 }}>{t.title}</div>
                <span style={{ fontSize: 10, color: "#9a9181", background: "rgba(66,53,33,0.07)", borderRadius: 10, padding: "1px 8px" }}>{CATEGORY_LABELS[t.category] || t.category}</span>
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
  user_delete: "#a13c2c",
  bulk_delete: "#a13c2c",
  user_suspend: "#a6761d",
  bulk_suspend: "#a6761d",
  user_grant_subscription: "#3f7d4e",
  banner_update: "#4a6fa5",
};

function AuditLogTab() {
  const [page, setPage] = useState(1);
  const { data, isLoading } = useQuery<{ logs: any[]; total: number; totalPages: number }>({
    queryKey: ["/api/admin/audit-logs", page],
    queryFn: () => adminFetch(`/api/admin/audit-logs?page=${page}&limit=30`),
  });

  if (isLoading) return <Spinner />;
  if (!data?.logs?.length) return <div style={{ color: "#8a8070", padding: 40, textAlign: "center" }}>No admin actions recorded yet.</div>;

  return (
    <div>
      <div style={{ fontSize: 12, color: "#9a9181", marginBottom: 12 }}>
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
              // One malformed audit-log row must not throw in render and
              // blank the whole admin dashboard via the top error boundary.
              let details: any = null;
              if (log.details) {
                try { details = JSON.parse(log.details); }
                catch { details = { raw: String(log.details) }; }
              }
              return (
                <tr key={log.id}>
                  <td style={{ ...S.td, fontSize: 11, color: "#8a8070", whiteSpace: "nowrap" }}>
                    {log.createdAt ? new Date(log.createdAt).toLocaleString() : "—"}
                  </td>
                  <td style={S.td}>
                    <span style={{ color: ACTION_COLORS[log.action] || "#2f2618", fontWeight: 600, fontSize: 12 }}>
                      {ACTION_LABELS[log.action] || log.action}
                    </span>
                  </td>
                  <td style={{ ...S.td, fontSize: 12, color: "#6d6354" }}>
                    {log.targetType} {log.targetId ? `#${log.targetId}` : ""}
                  </td>
                  <td style={{ ...S.td, fontSize: 11, color: "#9a9181", maxWidth: 300, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
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
          <span style={{ fontSize: 12, color: "#8a8070", padding: "0 10px" }}>Page {page} of {data.totalPages}</span>
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
    queryFn: () => adminFetch("/api/social-links"),
  });

  // Load current values once
  if (data && !loaded) {
    setForm({ instagram: data.instagram || "", linkedin: data.linkedin || "", youtube: data.youtube || "", twitter: data.twitter || "", tiktok: data.tiktok || "" });
    setLoaded(true);
  }

  const save = useMutation({
    mutationFn: () => adminFetch("/api/admin/social-links", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/social-links"] }); toast({ title: "Social links saved" }); },
  });

  const lbl: React.CSSProperties = { fontSize: 12, color: "#6d6354", display: "block", marginBottom: 6, fontWeight: 500 };
  const fields = [
    { key: "instagram", label: "Instagram URL", placeholder: "https://instagram.com/plotzy" },
    { key: "linkedin", label: "LinkedIn URL", placeholder: "https://linkedin.com/company/plotzy" },
    { key: "youtube", label: "YouTube URL", placeholder: "https://youtube.com/@plotzy" },
    { key: "twitter", label: "X (Twitter) URL", placeholder: "https://x.com/plotzy" },
    { key: "tiktok", label: "TikTok URL", placeholder: "https://tiktok.com/@plotzy" },
  ] as const;

  return (
    <div style={{ maxWidth: 500 }}>
      <p style={{ fontSize: 13, color: "#8a8070", marginBottom: 20, lineHeight: 1.6 }}>
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
        style={{ ...S.btn("default"), padding: "10px 24px", background: "#2f2618", color: "#000", fontWeight: 700, fontSize: 13, marginTop: 8 }}>
        {save.isPending ? "Saving..." : "Save Social Links"}
      </button>
    </div>
  );
}

type Tab =
  | "analytics" | "devices" | "engagement"
  | "revenue"
  | "users"
  | "books" | "moderation" | "tutorials"
  | "support"
  | "banner" | "social"
  | "system" | "audit" | "activity";

// The panel's map. Grouping fourteen flat tabs into seven named sections is
// what turns a wrapping five-row button soup into something navigable, and it
// gives phones a sane structure to collapse into.
const NAV: { group: string; items: { id: Tab; label: string }[] }[] = [
  { group: "Insights", items: [
    { id: "analytics",  label: "Analytics" },
    { id: "devices",    label: "Traffic & devices" },
    { id: "engagement", label: "Engagement" },
  ] },
  { group: "Money",   items: [{ id: "revenue", label: "Revenue & donations" }] },
  { group: "People",  items: [{ id: "users",   label: "Users" }] },
  { group: "Content", items: [
    { id: "books",      label: "Books" },
    { id: "moderation", label: "Moderation" },
    { id: "tutorials",  label: "Tutorials" },
  ] },
  { group: "Support", items: [{ id: "support", label: "Tickets" }] },
  { group: "Site",    items: [
    { id: "banner", label: "Banner" },
    { id: "social", label: "Social links" },
  ] },
  { group: "System",  items: [
    { id: "system",   label: "Health" },
    { id: "audit",    label: "Audit log" },
    { id: "activity", label: "Activity" },
  ] },
];

const TAB_LABEL: Record<Tab, string> = NAV.reduce((acc, g) => {
  g.items.forEach((i) => { acc[i.id] = i.label; });
  return acc;
}, {} as Record<Tab, string>);

function renderTab(tab: Tab) {
  switch (tab) {
    case "analytics":  return <AnalyticsTab />;
    case "devices":    return <DevicesTab />;
    case "engagement": return <EngagementTab />;
    case "revenue":    return <RevenueTab />;
    case "users":      return <UsersTab />;
    case "books":      return <BooksTab />;
    case "moderation": return <ModerationTab />;
    case "tutorials":  return <TutorialsTab />;
    case "support":    return <SupportTab />;
    case "banner":     return <BannerTab />;
    case "social":     return <SocialLinksTab />;
    case "system":     return <SystemHealthTab />;
    case "audit":      return <AuditLogTab />;
    case "activity":   return <ActivityTab />;
    default:           return null;
  }
}

export default function AdminPage() {
  const { user, isLoading: authLoading } = useAuth();
  const [, setLocation] = useLocation();
  const isPhone = useIsPhone();
  // The open section survives reloads, so a refresh puts the admin back
  // where they were instead of on Analytics every time.
  const [tab, setTab] = useState<Tab>(() => {
    try {
      const saved = localStorage.getItem("plotzy-admin-tab") as Tab | null;
      if (saved && saved in TAB_LABEL) return saved;
    } catch { /* private mode */ }
    return "analytics";
  });
  const [navOpen, setNavOpen] = useState(false);
  const selectTab = (t: Tab) => {
    setTab(t);
    setNavOpen(false);
    try { localStorage.setItem("plotzy-admin-tab", t); } catch { /* ignore */ }
  };

  const { data: stats, isError: statsFailed } = useQuery<AdminStats>({
    queryKey: ["/api/admin/stats"],
    queryFn: () => adminFetch("/api/admin/stats"),
    enabled: !!(user?.isAdmin),
  });

  if (authLoading) {
    return (
      <div style={{ ...S.page, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <span style={{ color: T.dim }}>Loading…</span>
      </div>
    );
  }

  if (!user?.isAdmin) {
    return (
      <div style={{ ...S.page, display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 12, textAlign: "center", padding: 24 }}>
        <Shield style={{ width: 34, height: 34, color: T.dim }} />
        <div style={{ fontSize: 18, fontWeight: 700 }}>Access denied</div>
        <div style={{ fontSize: 14, color: T.muted, maxWidth: 320 }}>
          This page is for Plotzy administrators.
        </div>
        <button onClick={() => setLocation("/")} style={{ ...S.btn("default"), marginTop: 8, padding: "10px 24px" }}>Go home</button>
      </div>
    );
  }

  const statCards = (
    <div className="admin-stats-grid" style={S.statsGrid}>
      <StatCard label="Total users" value={stats?.totalUsers as number} icon={Users} />
      <StatCard label="Total books" value={stats?.totalBooks as number} icon={BookOpen} />
      <StatCard label="Published" value={stats?.publishedBooks as number} icon={Globe} />
      <StatCard label="Chapters" value={stats?.totalChapters as number} icon={FileText} />
      <StatCard label="Open tickets" value={stats?.openSupportTickets as number} icon={Ticket} />
    </div>
  );

  const navList = (
    <nav style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      {NAV.map((g) => (
        <div key={g.group}>
          <div style={{
            fontSize: 10.5, fontWeight: 700, letterSpacing: "0.14em", textTransform: "uppercase",
            color: T.dim, padding: "0 10px", marginBottom: 6,
          }}>
            {g.group}
          </div>
          {g.items.map((item) => {
            const active = tab === item.id;
            const badge =
              item.id === "users" ? stats?.totalUsers :
              item.id === "support" ? stats?.openSupportTickets :
              undefined;
            return (
              <button
                key={item.id}
                onClick={() => selectTab(item.id)}
                style={{
                  display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8,
                  width: "100%", textAlign: "start",
                  padding: "9px 10px", marginBottom: 2,
                  borderRadius: 9, cursor: "pointer",
                  border: "1px solid " + (active ? T.borderStrong : "transparent"),
                  background: active ? T.cardStrong : "transparent",
                  color: active ? T.text : T.muted,
                  fontFamily: "inherit", fontSize: 13.5, fontWeight: active ? 700 : 500,
                }}
              >
                <span>{item.label}</span>
                {typeof badge === "number" && badge > 0 && (
                  <span style={{ fontSize: 11, fontWeight: 700, color: T.dim, fontVariantNumeric: "tabular-nums" }}>
                    {badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      ))}
    </nav>
  );

  return (
    <div style={S.page}>
      <SEO title="Admin" noindex />

      <header style={S.header}>
        <div style={S.title}>
          <Settings style={{ width: 18, height: 18, color: T.muted }} />
          <span>Admin</span>
          <span style={S.badge}>PLOTZY</span>
        </div>
        <button onClick={() => setLocation("/")} style={{ ...S.btn("ghost"), fontSize: 13, display: "flex", alignItems: "center", gap: 6 }}>
          <ArrowLeft style={{ width: 14, height: 14 }} /> Back to app
        </button>
      </header>

      <div style={S.body}>
        {statsFailed && (
          <div style={{
            background: "rgba(161,60,44,0.08)", border: "1px solid rgba(161,60,44,0.25)",
            color: "#a13c2c", borderRadius: 12, padding: "10px 14px", fontSize: 13, marginBottom: 18,
          }}>
            Live totals are unavailable right now. The sections below still work.
          </div>
        )}
        {statCards}

        {/* Phone: the section list drops down. Desktop: sticky sidebar. */}
        {isPhone ? (
          <>
            <button
              onClick={() => setNavOpen((v) => !v)}
              style={{
                width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between",
                padding: "12px 14px", marginBottom: navOpen ? 10 : 18,
                background: T.card, border: "1px solid " + T.border, borderRadius: 12,
                color: T.text, fontFamily: "inherit", fontSize: 14, fontWeight: 700, cursor: "pointer",
              }}
            >
              <span>{TAB_LABEL[tab]}</span>
              <ChevronDown style={{ width: 16, height: 16, transform: navOpen ? "rotate(180deg)" : "none", transition: "transform .2s" }} />
            </button>
            {navOpen && (
              <div style={{ background: T.card, border: "1px solid " + T.border, borderRadius: 12, padding: "14px 8px", marginBottom: 18 }}>
                {navList}
              </div>
            )}
            <TabBoundary resetKey={tab}>{renderTab(tab)}</TabBoundary>
          </>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "212px minmax(0, 1fr)", gap: 28, alignItems: "start" }}>
            <aside style={{ position: "sticky", top: 16 }}>{navList}</aside>
            <main style={{ minWidth: 0 }}>
              <h2 style={{ fontSize: 19, fontWeight: 700, color: T.text, margin: "0 0 18px" }}>
                {TAB_LABEL[tab]}
              </h2>
              <TabBoundary resetKey={tab}>{renderTab(tab)}</TabBoundary>
            </main>
          </div>
        )}
      </div>
    </div>
  );
}
