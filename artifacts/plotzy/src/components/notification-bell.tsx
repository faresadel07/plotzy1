import { useState, useRef, useEffect, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Bell, Heart, UserPlus, MessageSquare, BookOpen, Star, Check, Mail } from "lucide-react";
import { useAuth } from "@/contexts/auth-context";
import { useLanguage } from "@/contexts/language-context";
import { useToast } from "@/hooks/use-toast";

const SF = "-apple-system,BlinkMacSystemFont,'SF Pro Text','Helvetica Neue',sans-serif";
const BG = "#fffdf7";
const B = "rgba(66,53,33,0.13)";
const T = "#2f2618";
const TS = "#7b7366";
const TD = "#9a9181";
const ACC = "#7b5e3b";

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
  return <Icon style={{ width: 16, height: 16, color: "#5a4a33", flexShrink: 0 }} />;
}

export function NotificationBell({ darkNav = false }: { darkNav?: boolean }) {
  const { user } = useAuth();
  const { lang } = useLanguage();
  const ar = lang === "ar";
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<"notifications" | "messages">("notifications");
  const ref = useRef<HTMLDivElement>(null);
  const [, navigate] = useLocation();
  const qc = useQueryClient();
  const { toast } = useToast();

  // Unread notification count
  const { data: notifCount } = useQuery<{ count: number }>({
    queryKey: ["/api/notifications/unread-count"],
    queryFn: () => fetch("/api/notifications/unread-count", { credentials: "include" }).then(r => r.ok ? r.json() : { count: 0 }),
    enabled: !!user,
    refetchInterval: 30000,
    staleTime: 30000,
  });

  // Unread message count
  const { data: msgCount } = useQuery<{ count: number }>({
    queryKey: ["/api/messages/unread-count"],
    queryFn: () => fetch("/api/messages/unread-count", { credentials: "include" }).then(r => r.ok ? r.json() : { count: 0 }),
    enabled: !!user,
    refetchInterval: 30000,
    staleTime: 30000,
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

  // Mark all as read. The backend route is /read-all (matches the
  // singular /:id/read sibling); the previous /mark-all-read URL did
  // not exist and the POST 404'd silently because the mutation had
  // no onError. Now the URL is correct AND a failure toast surfaces
  // so the next regression of this kind is visible within seconds.
  const markAllMut = useMutation({
    mutationFn: () =>
      fetch("/api/notifications/read-all", { method: "POST", credentials: "include" }).then(r => { if (!r.ok) throw new Error("Mark-all-read failed"); }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/notifications"] });
      qc.invalidateQueries({ queryKey: ["/api/notifications/unread-count"] });
    },
    onError: () => {
      toast({
        title: "Couldn't mark notifications as read",
        variant: "destructive",
      });
    },
  });

  // Mark all messages as read — same shape as the notifications mutation
  // above. Clears the red badge in the Messages tab without forcing the
  // user to open every conversation. Optimistically zeros the cached
  // unread count on success so the badge disappears immediately.
  const markAllMessagesMut = useMutation({
    mutationFn: () =>
      fetch("/api/messages/read-all", { method: "POST", credentials: "include" })
        .then(r => { if (!r.ok) throw new Error("Mark-all-messages-read failed"); }),
    onSuccess: () => {
      qc.setQueryData(["/api/messages/unread-count"], { count: 0 });
      qc.invalidateQueries({ queryKey: ["/api/messages/unread-count"] });
      qc.invalidateQueries({ queryKey: ["/api/messages/conversations"] });
    },
    onError: () => {
      toast({
        title: "Couldn't mark messages as read",
        variant: "destructive",
      });
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
        aria-label={totalUnread > 0 ? `Notifications, ${totalUnread} unread` : "Notifications"}
        aria-expanded={open}
        aria-haspopup="menu"
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
        <img
          src="/images/bell-sketch.png"
          alt=""
          aria-hidden
          draggable={false}
          style={{ width: 21, height: 21, display: "block", pointerEvents: "none", userSelect: "none", filter: darkNav ? "invert(1) brightness(1.7)" : "none" }}
        />
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
            border: "2px solid #f4efe2",
          }}>
            {totalUnread > 99 ? "99+" : totalUnread}
          </span>
        )}
      </button>

      {/* Dropdown */}
      {open && (
        <div className="notif-panel" dir={ar ? "rtl" : "ltr"} style={{
          position: "absolute",
          top: "calc(100% + 8px)",
          insetInlineEnd: 0,
          width: "min(360px, calc(100vw - 24px))",
          maxHeight: 480,
          background: BG,
          border: `1px solid ${B}`,
          borderRadius: 14,
          boxShadow: "0 18px 44px -12px rgba(41,33,21,0.35)",
          zIndex: 200,
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
        }}>
          <style>{`
            @media (max-width: 699px) {
              .notif-panel {
                position: fixed !important;
                top: calc(env(safe-area-inset-top, 0px) + 58px) !important;
                left: 10px !important;
                right: 10px !important;
                width: auto !important;
                max-height: 65vh !important;
              }
            }
          `}</style>
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
                  borderBottom: tab === t ? `2px solid #2f2618` : "2px solid transparent",
                  cursor: "pointer",
                  transition: "color 0.15s",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 6,
                }}
              >
                {t === "notifications" ? (ar ? "الإشعارات" : "Notifications") : (ar ? "الرسائل" : "Messages")}
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
                      onMouseEnter={e => e.currentTarget.style.background = "rgba(122,94,59,0.1)"}
                      onMouseLeave={e => e.currentTarget.style.background = "transparent"}
                    >
                      <Check style={{ width: 12, height: 12 }} />
                      {ar ? "تحديد الكل كمقروء" : "Mark all read"}
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
                    <img src="/images/bell-sketch.png" alt="" aria-hidden draggable={false} style={{ width: 46, height: 46, display: "block", margin: "0 auto 10px", opacity: 0.85, pointerEvents: "none", userSelect: "none" }} />
                    <div style={{ fontFamily: ar ? "'Aref Ruqaa', 'Amiri', serif" : "'Caveat', cursive", fontSize: ar ? 14.5 : 17, color: "#8a8070" }}>{ar ? "(ما في إشعارات بعد، اكتب شوي)" : "(no notifications yet, go write)"}</div>
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
                        textAlign: "start",
                        background: n.isRead ? "transparent" : "rgba(122,94,59,0.08)",
                        border: "none",
                        borderBottom: `1px solid ${B}`,
                        cursor: "pointer",
                        transition: "background 0.15s",
                      }}
                      onMouseEnter={e => e.currentTarget.style.background = "rgba(66,53,33,0.05)"}
                      onMouseLeave={e => e.currentTarget.style.background = n.isRead ? "transparent" : "rgba(122,94,59,0.08)"}
                    >
                      <div style={{
                        width: 32, height: 32, borderRadius: 8,
                        background: "rgba(122,94,59,0.12)",
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
                          background: "#7b5e3b", flexShrink: 0, marginTop: 6,
                        }} />
                      )}
                    </button>
                  ))
                )}
              </>
            ) : (
              /* Messages tab */
              <>
                {/* Mark all read header — mirrors the Notifications tab.
                    Only shown when there is at least one unread message so
                    the row doesn't add noise on a clean inbox. */}
                {(msgCount?.count || 0) > 0 && (
                  <div style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "flex-end",
                    padding: "8px 12px 4px",
                  }}>
                    <button
                      onClick={() => markAllMessagesMut.mutate()}
                      disabled={markAllMessagesMut.isPending}
                      style={{
                        fontFamily: SF,
                        fontSize: 11,
                        fontWeight: 500,
                        color: TS,
                        background: "transparent",
                        border: "none",
                        cursor: markAllMessagesMut.isPending ? "default" : "pointer",
                        display: "flex",
                        alignItems: "center",
                        gap: 4,
                        padding: "2px 6px",
                        borderRadius: 4,
                        transition: "background 0.15s",
                        opacity: markAllMessagesMut.isPending ? 0.5 : 1,
                      }}
                      onMouseEnter={e => e.currentTarget.style.background = "rgba(122,94,59,0.1)"}
                      onMouseLeave={e => e.currentTarget.style.background = "transparent"}
                    >
                      <Check style={{ width: 12, height: 12 }} />
                      {ar ? "تحديد الكل كمقروء" : "Mark all read"}
                    </button>
                  </div>
                )}
                <div style={{
                  padding: "32px 20px",
                  textAlign: "center",
                  fontFamily: SF,
                }}>
                  <Mail style={{ width: 28, height: 28, color: TD, margin: "0 auto 12px" }} />
                  {(msgCount?.count || 0) > 0 ? (
                    <div style={{ fontSize: 13, color: T, marginBottom: 4 }}>
                      {ar
                        ? <>عندك <span style={{ fontWeight: 700 }}>{msgCount!.count}</span> {msgCount!.count === 1 ? "رسالة غير مقروءة" : "رسائل غير مقروءة"}</>
                        : <>You have <span style={{ fontWeight: 700 }}>{msgCount!.count}</span> unread message{msgCount!.count !== 1 ? "s" : ""}</>}
                    </div>
                  ) : (
                    <div style={{ fontSize: 13, color: TS, marginBottom: 4 }}>
                      {ar ? "ما في رسائل غير مقروءة" : "No unread messages"}
                    </div>
                  )}
                  <button
                    onClick={() => { navigate("/messages"); setOpen(false); }}
                    style={{
                      marginTop: 12,
                      padding: "8px 20px",
                      borderRadius: 8,
                      background: "#292115",
                      color: "#f7f2e4",
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
                    {ar ? "عرض الرسائل" : "View Messages"}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
