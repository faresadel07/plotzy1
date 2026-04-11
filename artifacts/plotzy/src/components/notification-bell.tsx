import { useState, useRef, useEffect, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Bell, Heart, UserPlus, MessageSquare, BookOpen, Star, Check, Mail } from "lucide-react";
import { useAuth } from "@/contexts/auth-context";

const SF = "-apple-system,BlinkMacSystemFont,'SF Pro Text','Helvetica Neue',sans-serif";
const BG = "#0e0e12";
const B = "rgba(255,255,255,0.07)";
const T = "rgba(255,255,255,0.88)";
const TS = "rgba(255,255,255,0.45)";
const TD = "rgba(255,255,255,0.20)";
const ACC = "#7c6af7";

function timeAgo(date: string) {
  const s = Math.floor((Date.now() - new Date(date).getTime()) / 1000);
  if (s < 60) return "just now";
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
}

interface Notification {
  id: number;
  type: string;
  title: string;
  body: string | null;
  linkUrl: string | null;
  isRead: boolean;
  createdAt: string;
}

const ICON_MAP: Record<string, typeof Heart> = {
  like: Heart,
  follow: UserPlus,
  comment: MessageSquare,
  book: BookOpen,
  review: Star,
  message: Mail,
};

function NotificationIcon({ type }: { type: string }) {
  const Icon = ICON_MAP[type] || Bell;
  return <Icon style={{ width: 16, height: 16, color: "#fff", flexShrink: 0 }} />;
}

export function NotificationBell({ darkNav = false }: { darkNav?: boolean }) {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<"notifications" | "messages">("notifications");
  const ref = useRef<HTMLDivElement>(null);
  const [, navigate] = useLocation();
  const qc = useQueryClient();

  // Unread notification count
  const { data: notifCount } = useQuery<{ count: number }>({
    queryKey: ["/api/notifications/unread-count"],
    queryFn: () => fetch("/api/notifications/unread-count", { credentials: "include" }).then(r => r.ok ? r.json() : { count: 0 }),
    enabled: !!user,
    refetchInterval: 30000,
  });

  // Unread message count
  const { data: msgCount } = useQuery<{ count: number }>({
    queryKey: ["/api/messages/unread-count"],
    queryFn: () => fetch("/api/messages/unread-count", { credentials: "include" }).then(r => r.ok ? r.json() : { count: 0 }),
    enabled: !!user,
    refetchInterval: 30000,
  });

  // Notifications list (only when dropdown open)
  const { data: notifications } = useQuery<Notification[]>({
    queryKey: ["/api/notifications"],
    queryFn: () => fetch("/api/notifications?limit=20", { credentials: "include" }).then(r => r.ok ? r.json() : []),
    enabled: !!user && open && tab === "notifications",
  });

  // Mark single as read
  const markReadMut = useMutation({
    mutationFn: (id: number) =>
      fetch(`/api/notifications/${id}/read`, { method: "PATCH", credentials: "include" }).then(r => { if (!r.ok) throw new Error(); }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/notifications"] });
      qc.invalidateQueries({ queryKey: ["/api/notifications/unread-count"] });
    },
  });

  // Mark all as read
  const markAllMut = useMutation({
    mutationFn: () =>
      fetch("/api/notifications/mark-all-read", { method: "POST", credentials: "include" }).then(r => { if (!r.ok) throw new Error(); }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/notifications"] });
      qc.invalidateQueries({ queryKey: ["/api/notifications/unread-count"] });
    },
  });

  // Click outside to close
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  const totalUnread = (notifCount?.count || 0) + (msgCount?.count || 0);

  const handleNotificationClick = useCallback((n: Notification) => {
    if (!n.isRead) markReadMut.mutate(n.id);
    if (n.linkUrl) {
      navigate(n.linkUrl);
    }
    setOpen(false);
  }, [markReadMut, navigate]);

  if (!user) return null;

  return (
    <div ref={ref} style={{ position: "relative", display: "flex", alignItems: "center" }}>
      {/* Bell button */}
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          position: "relative",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          width: 34,
          height: 34,
          borderRadius: 9,
          border: darkNav
            ? (open ? "1px solid rgba(255,255,255,0.2)" : "1px solid rgba(255,255,255,0.1)")
            : (open ? "1px solid rgba(0,0,0,0.2)" : "1px solid rgba(0,0,0,0.1)"),
          background: darkNav
            ? (open ? "rgba(255,255,255,0.12)" : "rgba(255,255,255,0.06)")
            : (open ? "rgba(0,0,0,0.08)" : "rgba(0,0,0,0.04)"),
          cursor: "pointer",
          transition: "all 0.15s",
        }}
        onMouseEnter={e => {
          e.currentTarget.style.background = darkNav ? "rgba(255,255,255,0.14)" : "rgba(0,0,0,0.1)";
          e.currentTarget.style.borderColor = darkNav ? "rgba(255,255,255,0.25)" : "rgba(0,0,0,0.2)";
        }}
        onMouseLeave={e => {
          if (!open) {
            e.currentTarget.style.background = darkNav ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.04)";
            e.currentTarget.style.borderColor = darkNav ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.1)";
          }
        }}
      >
        <Bell style={{ width: 17, height: 17, color: darkNav ? "#fff" : "#111" }} />
        {totalUnread > 0 && (
          <span style={{
            position: "absolute",
            top: 4,
            right: 4,
            minWidth: 16,
            height: 16,
            borderRadius: 8,
            background: "#ef4444",
            color: "#fff",
            fontSize: 9,
            fontWeight: 700,
            fontFamily: SF,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "0 4px",
            lineHeight: 1,
            border: "2px solid #080808",
          }}>
            {totalUnread > 99 ? "99+" : totalUnread}
          </span>
        )}
      </button>

      {/* Dropdown */}
      {open && (
        <div style={{
          position: "absolute",
          top: "calc(100% + 8px)",
          right: 0,
          width: "min(360px, calc(100vw - 24px))",
          maxHeight: 480,
          background: BG,
          border: `1px solid ${B}`,
          borderRadius: 12,
          boxShadow: "0 16px 48px rgba(0,0,0,0.5)",
          zIndex: 200,
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
        }}>
          {/* Tabs */}
          <div style={{
            display: "flex",
            borderBottom: `1px solid ${B}`,
            flexShrink: 0,
          }}>
            {(["notifications", "messages"] as const).map(t => (
              <button
                key={t}
                onClick={() => setTab(t)}
                style={{
                  flex: 1,
                  padding: "10px 0",
                  fontFamily: SF,
                  fontSize: 12.5,
                  fontWeight: tab === t ? 600 : 400,
                  color: tab === t ? T : TS,
                  background: "transparent",
                  border: "none",
                  borderBottom: tab === t ? `2px solid #fff` : "2px solid transparent",
                  cursor: "pointer",
                  transition: "color 0.15s",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 6,
                }}
              >
                {t === "notifications" ? "Notifications" : "Messages"}
                {t === "notifications" && (notifCount?.count || 0) > 0 && (
                  <span style={{
                    minWidth: 16, height: 16, borderRadius: 8,
                    background: "#ef4444", color: "#fff",
                    fontSize: 9, fontWeight: 700,
                    display: "inline-flex", alignItems: "center", justifyContent: "center",
                    padding: "0 4px",
                  }}>
                    {notifCount!.count > 99 ? "99+" : notifCount!.count}
                  </span>
                )}
                {t === "messages" && (msgCount?.count || 0) > 0 && (
                  <span style={{
                    minWidth: 16, height: 16, borderRadius: 8,
                    background: "#ef4444", color: "#fff",
                    fontSize: 9, fontWeight: 700,
                    display: "inline-flex", alignItems: "center", justifyContent: "center",
                    padding: "0 4px",
                  }}>
                    {msgCount!.count > 99 ? "99+" : msgCount!.count}
                  </span>
                )}
              </button>
            ))}
          </div>

          {/* Content */}
          <div style={{ flex: 1, overflowY: "auto" }}>
            {tab === "notifications" ? (
              <>
                {/* Mark all read header */}
                {notifications && notifications.length > 0 && (
                  <div style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "flex-end",
                    padding: "8px 12px 4px",
                  }}>
                    <button
                      onClick={() => markAllMut.mutate()}
                      disabled={markAllMut.isPending}
                      style={{
                        fontFamily: SF,
                        fontSize: 11,
                        fontWeight: 500,
                        color: TS,
                        background: "transparent",
                        border: "none",
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        gap: 4,
                        padding: "2px 6px",
                        borderRadius: 4,
                        transition: "background 0.15s",
                      }}
                      onMouseEnter={e => e.currentTarget.style.background = "rgba(124,106,247,0.1)"}
                      onMouseLeave={e => e.currentTarget.style.background = "transparent"}
                    >
                      <Check style={{ width: 12, height: 12 }} />
                      Mark all read
                    </button>
                  </div>
                )}

                {/* Notification items */}
                {(!notifications || notifications.length === 0) ? (
                  <div style={{
                    padding: "40px 20px",
                    textAlign: "center",
                    fontFamily: SF,
                    fontSize: 13,
                    color: TS,
                  }}>
                    <Bell style={{ width: 28, height: 28, color: TD, margin: "0 auto 12px" }} />
                    <div>No notifications yet</div>
                  </div>
                ) : (
                  notifications.map(n => (
                    <button
                      key={n.id}
                      onClick={() => handleNotificationClick(n)}
                      style={{
                        display: "flex",
                        alignItems: "flex-start",
                        gap: 10,
                        padding: "10px 14px",
                        width: "100%",
                        textAlign: "left",
                        background: n.isRead ? "transparent" : "rgba(124,106,247,0.05)",
                        border: "none",
                        borderBottom: `1px solid ${B}`,
                        cursor: "pointer",
                        transition: "background 0.15s",
                      }}
                      onMouseEnter={e => e.currentTarget.style.background = "rgba(255,255,255,0.04)"}
                      onMouseLeave={e => e.currentTarget.style.background = n.isRead ? "transparent" : "rgba(124,106,247,0.05)"}
                    >
                      <div style={{
                        width: 32, height: 32, borderRadius: 8,
                        background: "rgba(124,106,247,0.12)",
                        display: "flex", alignItems: "center", justifyContent: "center",
                        flexShrink: 0, marginTop: 2,
                      }}>
                        <NotificationIcon type={n.type} />
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{
                          fontFamily: SF,
                          fontSize: 12.5,
                          fontWeight: n.isRead ? 400 : 600,
                          color: T,
                          lineHeight: 1.35,
                          marginBottom: 2,
                        }}>
                          {n.title}
                        </div>
                        {n.body && (
                          <div style={{
                            fontFamily: SF,
                            fontSize: 11.5,
                            color: TS,
                            lineHeight: 1.4,
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                          }}>
                            {n.body}
                          </div>
                        )}
                        <div style={{
                          fontFamily: SF,
                          fontSize: 10.5,
                          color: TD,
                          marginTop: 3,
                        }}>
                          {timeAgo(n.createdAt)}
                        </div>
                      </div>
                      {!n.isRead && (
                        <div style={{
                          width: 7, height: 7, borderRadius: "50%",
                          background: "#fff", flexShrink: 0, marginTop: 6,
                        }} />
                      )}
                    </button>
                  ))
                )}
              </>
            ) : (
              /* Messages tab */
              <div style={{
                padding: "32px 20px",
                textAlign: "center",
                fontFamily: SF,
              }}>
                <Mail style={{ width: 28, height: 28, color: TD, margin: "0 auto 12px" }} />
                {(msgCount?.count || 0) > 0 ? (
                  <div style={{ fontSize: 13, color: T, marginBottom: 4 }}>
                    You have <span style={{ fontWeight: 700, color: "#fff" }}>{msgCount!.count}</span> unread message{msgCount!.count !== 1 ? "s" : ""}
                  </div>
                ) : (
                  <div style={{ fontSize: 13, color: TS, marginBottom: 4 }}>
                    No unread messages
                  </div>
                )}
                <button
                  onClick={() => { navigate("/messages"); setOpen(false); }}
                  style={{
                    marginTop: 12,
                    padding: "8px 20px",
                    borderRadius: 8,
                    background: "#fff",
                    color: "#000",
                    fontFamily: SF,
                    fontSize: 12.5,
                    fontWeight: 600,
                    border: "none",
                    cursor: "pointer",
                    transition: "opacity 0.15s",
                  }}
                  onMouseEnter={e => e.currentTarget.style.opacity = "0.85"}
                  onMouseLeave={e => e.currentTarget.style.opacity = "1"}
                >
                  View Messages
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
