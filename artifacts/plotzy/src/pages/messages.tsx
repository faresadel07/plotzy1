import { useState, useRef, useEffect, useCallback } from "react";
import { useRoute, useLocation, Link } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/contexts/auth-context";
import { Layout } from "@/components/layout";
import { Send, MessageCircle, ArrowLeft, Check, CheckCheck, Image, Paperclip, Search, Smile } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

/* ── Responsive hook ──────────────────────────────────────── */
function useIsMobile(bp = 768) {
  const [m, setM] = useState(() => typeof window !== "undefined" && window.innerWidth < bp);
  useEffect(() => {
    const h = () => setM(window.innerWidth < bp);
    window.addEventListener("resize", h);
    return () => window.removeEventListener("resize", h);
  }, [bp]);
  return m;
}

/* ── Design tokens ────────────────────────────────────────── */
const SF = "-apple-system,BlinkMacSystemFont,'SF Pro Text','Helvetica Neue',sans-serif";
const BG = "#000";
const SIDEBAR = "#0a0a0a";
const CARD = "#111";
const CARD2 = "#161616";
const B = "rgba(255,255,255,0.06)";
const T = "#fff";
const TS = "rgba(255,255,255,0.55)";
const TD = "rgba(255,255,255,0.25)";
const SENT_BG = "#fff";
const SENT_TEXT = "#000";
const RECV_BG = "#1a1a1a";
const RECV_TEXT = "rgba(255,255,255,0.88)";
const ONLINE = "#22c55e";

/* ── Time formatters ──────────────────────────────────────── */
function formatTime(date: string) {
  const d = new Date(date);
  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function formatDate(date: string) {
  const d = new Date(date);
  const now = new Date();
  const diff = now.getTime() - d.getTime();
  if (diff < 86400000 && d.getDate() === now.getDate()) return "Today";
  if (diff < 172800000) return "Yesterday";
  return d.toLocaleDateString([], { month: "short", day: "numeric" });
}

function sidebarTime(date: string | null) {
  if (!date) return "";
  const d = new Date(date);
  const now = new Date();
  const diff = now.getTime() - d.getTime();
  if (diff < 86400000 && d.getDate() === now.getDate()) return formatTime(date);
  if (diff < 172800000) return "Yesterday";
  return d.toLocaleDateString([], { month: "short", day: "numeric" });
}

/* ── Types ────────────────────────────────────────────────── */
interface Conversation {
  userId: number;
  displayName: string | null;
  avatarUrl: string | null;
  lastMessage: string | null;
  lastMessageAt: string | null;
  unreadCount: number;
}
interface Message {
  id: number;
  senderId: number;
  receiverId: number;
  content: string;
  createdAt: string;
  read: boolean;
}

/* ── Avatar ───────────────────────────────────────────────── */
function Avatar({ url, name, size = 40, online }: { url: string | null; name: string | null; size?: number; online?: boolean }) {
  const initial = (name || "?")[0].toUpperCase();
  return (
    <div style={{ position: "relative", flexShrink: 0, width: size, height: size }}>
      {url ? (
        <img src={url} alt={name || ""} style={{ width: size, height: size, borderRadius: "50%", objectFit: "cover" }} />
      ) : (
        <div style={{
          width: size, height: size, borderRadius: "50%",
          background: "linear-gradient(135deg, #333 0%, #222 100%)",
          display: "flex", alignItems: "center", justifyContent: "center",
          color: "rgba(255,255,255,0.6)", fontFamily: SF, fontSize: size * 0.38, fontWeight: 600,
        }}>
          {initial}
        </div>
      )}
      {online !== undefined && (
        <div style={{
          position: "absolute", bottom: 0, right: 0,
          width: size * 0.28, height: size * 0.28, borderRadius: "50%",
          background: online ? ONLINE : "rgba(255,255,255,0.2)",
          border: `2px solid ${SIDEBAR}`,
        }} />
      )}
    </div>
  );
}

/* ── Date separator ───────────────────────────────────────── */
function DateSeparator({ date }: { date: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 12, margin: "16px 0", padding: "0 20px" }}>
      <div style={{ flex: 1, height: 1, background: B }} />
      <span style={{ fontSize: 11, color: TD, fontFamily: SF, fontWeight: 500, letterSpacing: "0.02em" }}>{formatDate(date)}</span>
      <div style={{ flex: 1, height: 1, background: B }} />
    </div>
  );
}

/* ── Read receipts ────────────────────────────────────────── */
function ReadReceipt({ read }: { read: boolean }) {
  return read
    ? <CheckCheck style={{ width: 14, height: 14, color: "#60a5fa" }} />
    : <Check style={{ width: 14, height: 14, color: "rgba(0,0,0,0.35)" }} />;
}

/* ── Typing indicator ─────────────────────────────────────── */
function TypingDots() {
  return (
    <div style={{ display: "flex", gap: 4, padding: "8px 14px", background: RECV_BG, borderRadius: 14, borderBottomLeftRadius: 4, width: "fit-content" }}>
      {[0, 1, 2].map(i => (
        <div key={i} style={{
          width: 6, height: 6, borderRadius: "50%", background: "rgba(255,255,255,0.35)",
          animation: `typingDot 1.4s ease-in-out ${i * 0.2}s infinite`,
        }} />
      ))}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   MAIN COMPONENT
   ═══════════════════════════════════════════════════════════════ */
export default function Messages() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [, params] = useRoute("/messages/:userId");
  const selectedUserId = params?.userId ? Number(params.userId) : null;
  const [, navigate] = useLocation();
  const [input, setInput] = useState("");
  const [search, setSearch] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const qc = useQueryClient();
  const isMobile = useIsMobile();

  /* ── Data fetching ───────────────────────────────── */
  const { data: conversations = [] } = useQuery<Conversation[]>({
    queryKey: ["/api/messages/conversations"],
    queryFn: () => fetch("/api/messages/conversations", { credentials: "include" }).then(r => r.ok ? r.json() : []),
    enabled: !!user,
    refetchInterval: 15000,
  });

  const { data: messages = [] } = useQuery<Message[]>({
    queryKey: ["/api/messages", selectedUserId],
    queryFn: () => fetch(`/api/messages/${selectedUserId}`, { credentials: "include" }).then(r => r.ok ? r.json() : []),
    enabled: !!user && !!selectedUserId,
    refetchInterval: 5000,
  });

  const sendMut = useMutation({
    mutationFn: (content: string) =>
      fetch(`/api/messages/${selectedUserId}`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        credentials: "include", body: JSON.stringify({ content }),
      }),
    onSuccess: () => {
      setInput("");
      qc.invalidateQueries({ queryKey: ["/api/messages", selectedUserId] });
      qc.invalidateQueries({ queryKey: ["/api/messages/conversations"] });
    },
  });

  /* ── Auto-scroll ─────────────────────────────────── */
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  /* ── Focus input on conversation change ──────────── */
  useEffect(() => {
    if (selectedUserId) setTimeout(() => inputRef.current?.focus(), 100);
  }, [selectedUserId]);

  const handleSend = useCallback(() => {
    const trimmed = input.trim();
    if (!trimmed || !selectedUserId) return;
    sendMut.mutate(trimmed);
  }, [input, selectedUserId, sendMut]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); }
  }, [handleSend]);

  const selectedConvo = conversations.find(c => c.userId === selectedUserId);
  const filteredConvos = conversations.filter(c => {
    if (!search.trim()) return true;
    return (c.displayName || "").toLowerCase().includes(search.toLowerCase());
  });

  /* ── Group messages by date ──────────────────────── */
  const groupedMessages: { date: string; msgs: Message[] }[] = [];
  messages.forEach(msg => {
    const dateStr = new Date(msg.createdAt).toDateString();
    const last = groupedMessages[groupedMessages.length - 1];
    if (last && last.date === dateStr) last.msgs.push(msg);
    else groupedMessages.push({ date: dateStr, msgs: [msg] });
  });

  return (
    <Layout isFullDark darkNav noScroll>
      <div style={{ display: "flex", height: "calc(100vh - 44px)", fontFamily: SF, background: BG }}>

        {/* ═══ LEFT SIDEBAR ═══════════════════════════════ */}
        <div style={{
          width: isMobile ? "100%" : 340, borderRight: isMobile ? "none" : `1px solid ${B}`,
          display: isMobile && selectedUserId ? "none" : "flex", flexDirection: "column",
          background: SIDEBAR, flexShrink: 0,
        }}>
          {/* Sidebar header */}
          <div style={{ padding: "20px 20px 16px" }}>
            <h2 style={{ fontSize: 20, fontWeight: 700, color: T, margin: "0 0 14px", letterSpacing: "-0.02em" }}>Messages</h2>
            <div style={{
              display: "flex", alignItems: "center", gap: 8,
              background: CARD, borderRadius: 10, padding: "8px 12px",
              border: `1px solid ${B}`,
            }}>
              <Search style={{ width: 14, height: 14, color: TD, flexShrink: 0 }} />
              <input
                value={search} onChange={e => setSearch(e.target.value)}
                placeholder="Search conversations..."
                style={{ flex: 1, background: "transparent", border: "none", outline: "none", color: T, fontFamily: SF, fontSize: 13 }}
              />
            </div>
          </div>

          {/* Conversation list */}
          <div style={{ flex: 1, overflowY: "auto" }}>
            {filteredConvos.length === 0 ? (
              <div style={{ padding: "48px 24px", textAlign: "center" }}>
                <MessageCircle style={{ width: 36, height: 36, color: TD, margin: "0 auto 14px", opacity: 0.5 }} />
                <div style={{ fontSize: 14, color: TS, fontWeight: 500 }}>No conversations yet</div>
                <div style={{ fontSize: 12, color: TD, marginTop: 6, lineHeight: 1.5 }}>
                  Visit an author's profile to start a conversation
                </div>
              </div>
            ) : (
              filteredConvos.map(convo => {
                const active = selectedUserId === convo.userId;
                return (
                  <button key={convo.userId} onClick={() => navigate(`/messages/${convo.userId}`)}
                    style={{
                      display: "flex", alignItems: "center", gap: 12, padding: "14px 20px", width: "100%",
                      textAlign: "left", background: active ? "rgba(255,255,255,0.04)" : "transparent",
                      border: "none", borderLeft: active ? "2px solid #fff" : "2px solid transparent",
                      cursor: "pointer", transition: "all 0.15s",
                    }}
                    onMouseEnter={e => { if (!active) e.currentTarget.style.background = "rgba(255,255,255,0.02)"; }}
                    onMouseLeave={e => { if (!active) e.currentTarget.style.background = "transparent"; }}
                  >
                    <Avatar url={convo.avatarUrl} name={convo.displayName} size={44} online={Math.random() > 0.5} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
                        <span style={{ fontSize: 13.5, fontWeight: convo.unreadCount > 0 ? 600 : 400, color: T, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {convo.displayName || "User"}
                        </span>
                        <span style={{ fontSize: 11, color: convo.unreadCount > 0 ? "rgba(255,255,255,0.6)" : TD, flexShrink: 0 }}>
                          {sidebarTime(convo.lastMessageAt)}
                        </span>
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 3 }}>
                        <span style={{
                          fontSize: 12.5, color: convo.unreadCount > 0 ? TS : TD, overflow: "hidden",
                          textOverflow: "ellipsis", whiteSpace: "nowrap", flex: 1,
                        }}>
                          {convo.lastMessage || "Start a conversation"}
                        </span>
                        {convo.unreadCount > 0 && (
                          <span style={{
                            minWidth: 20, height: 20, borderRadius: 10,
                            background: "#fff", color: "#000",
                            fontSize: 10, fontWeight: 700,
                            display: "flex", alignItems: "center", justifyContent: "center",
                            padding: "0 6px", flexShrink: 0,
                          }}>
                            {convo.unreadCount > 99 ? "99+" : convo.unreadCount}
                          </span>
                        )}
                      </div>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* ═══ RIGHT PANEL — CHAT ═════════════════════════ */}
        <div style={{
          flex: 1, display: isMobile && !selectedUserId ? "none" : "flex",
          flexDirection: "column", background: BG, minWidth: 0,
        }}>
          {!selectedUserId ? (
            /* ── Welcome empty state ── */
            <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 16, padding: 40 }}>
              <div style={{
                width: 80, height: 80, borderRadius: 20,
                background: "rgba(255,255,255,0.03)", border: `1px solid ${B}`,
                display: "flex", alignItems: "center", justifyContent: "center",
              }}>
                <MessageCircle style={{ width: 36, height: 36, color: "rgba(255,255,255,0.15)" }} />
              </div>
              <h3 style={{ fontSize: 20, fontWeight: 700, color: T, margin: 0, letterSpacing: "-0.02em" }}>
                Welcome to Plotzy Messages
              </h3>
              <p style={{ fontSize: 14, color: TD, margin: 0, textAlign: "center", maxWidth: 360, lineHeight: 1.6 }}>
                Connect with fellow writers, share ideas, and collaborate on your next great story. Select a conversation to get started.
              </p>
            </div>
          ) : (
            <>
              {/* ── Chat header ── */}
              <div style={{
                padding: "12px 20px", borderBottom: `1px solid ${B}`,
                display: "flex", alignItems: "center", gap: 12,
                background: SIDEBAR, flexShrink: 0,
              }}>
                {isMobile && (
                  <button onClick={() => navigate("/messages")}
                    style={{ display: "flex", alignItems: "center", justifyContent: "center", width: 32, height: 32, borderRadius: 8, border: "none", background: "transparent", cursor: "pointer", color: TS }}>
                    <ArrowLeft style={{ width: 18, height: 18 }} />
                  </button>
                )}
                <Avatar url={selectedConvo?.avatarUrl ?? null} name={selectedConvo?.displayName ?? null} size={36} online />
                <div style={{ flex: 1 }}>
                  <Link href={`/authors/${selectedUserId}`} style={{ fontSize: 14, fontWeight: 600, color: T, textDecoration: "none" }}>
                    {selectedConvo?.displayName || "User"}
                  </Link>
                  <div style={{ fontSize: 11, color: ONLINE, marginTop: 1 }}>Online</div>
                </div>
              </div>

              {/* ── Messages area ── */}
              <div style={{ flex: 1, overflowY: "auto", padding: "8px 0" }}>
                {messages.length === 0 ? (
                  <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 8, height: "100%" }}>
                    <div style={{ fontSize: 13, color: TS }}>No messages yet</div>
                    <div style={{ fontSize: 12, color: TD }}>Say hello to start the conversation</div>
                  </div>
                ) : (
                  groupedMessages.map((group, gi) => (
                    <div key={gi}>
                      <DateSeparator date={group.msgs[0].createdAt} />
                      {group.msgs.map((msg, mi) => {
                        const isMine = msg.senderId === user?.id;
                        const showAvatar = !isMine && (mi === 0 || group.msgs[mi - 1].senderId !== msg.senderId);
                        return (
                          <div key={msg.id} style={{
                            display: "flex", justifyContent: isMine ? "flex-end" : "flex-start",
                            padding: "2px 20px", gap: 8, alignItems: "flex-end",
                          }}>
                            {/* Receiver avatar */}
                            {!isMine && (
                              <div style={{ width: 28, flexShrink: 0 }}>
                                {showAvatar && <Avatar url={selectedConvo?.avatarUrl ?? null} name={selectedConvo?.displayName ?? null} size={28} />}
                              </div>
                            )}

                            {/* Bubble */}
                            <div style={{
                              maxWidth: "65%", padding: "10px 14px",
                              borderRadius: 16,
                              borderBottomRightRadius: isMine ? 4 : 16,
                              borderBottomLeftRadius: isMine ? 16 : 4,
                              background: isMine ? SENT_BG : RECV_BG,
                              color: isMine ? SENT_TEXT : RECV_TEXT,
                              fontSize: 13.5, lineHeight: 1.5, fontFamily: SF,
                              wordBreak: "break-word",
                            }}>
                              <div>{msg.content}</div>
                              <div style={{
                                display: "flex", alignItems: "center", justifyContent: isMine ? "flex-end" : "flex-start",
                                gap: 4, marginTop: 4,
                              }}>
                                <span style={{ fontSize: 10, color: isMine ? "rgba(0,0,0,0.4)" : TD }}>
                                  {formatTime(msg.createdAt)}
                                </span>
                                {isMine && <ReadReceipt read={msg.read} />}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ))
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* ── Input bar ── */}
              <div style={{ padding: "12px 20px", borderTop: `1px solid ${B}`, background: SIDEBAR, flexShrink: 0 }}>
                <div style={{
                  display: "flex", alignItems: "flex-end", gap: 8,
                  background: CARD, borderRadius: 14, padding: "8px 8px 8px 4px",
                  border: `1px solid ${B}`,
                }}>
                  {/* Attachment buttons */}
                  <button onClick={() => toast({ title: "Coming soon", description: "File attachments will be available in the next update." })}
                    style={{ width: 36, height: 36, borderRadius: 8, border: "none", background: "transparent", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: TD, transition: "color 0.15s", flexShrink: 0 }}
                    onMouseEnter={e => e.currentTarget.style.color = TS} onMouseLeave={e => e.currentTarget.style.color = TD}>
                    <Paperclip style={{ width: 18, height: 18 }} />
                  </button>
                  <button onClick={() => toast({ title: "Coming soon", description: "Image sharing will be available in the next update." })}
                    style={{ width: 36, height: 36, borderRadius: 8, border: "none", background: "transparent", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: TD, transition: "color 0.15s", flexShrink: 0 }}
                    onMouseEnter={e => e.currentTarget.style.color = TS} onMouseLeave={e => e.currentTarget.style.color = TD}>
                    <Image style={{ width: 18, height: 18 }} />
                  </button>

                  {/* Text input */}
                  <textarea ref={inputRef} value={input} onChange={e => setInput(e.target.value)} onKeyDown={handleKeyDown}
                    placeholder="Type a message..." rows={1}
                    style={{
                      flex: 1, background: "transparent", border: "none", outline: "none",
                      color: T, fontFamily: SF, fontSize: 13.5, resize: "none", lineHeight: 1.4,
                      maxHeight: 100, padding: "6px 0", minHeight: 24,
                    }}
                  />

                  {/* Send button */}
                  <button onClick={handleSend} disabled={!input.trim() || sendMut.isPending}
                    style={{
                      width: 36, height: 36, borderRadius: 10,
                      background: input.trim() ? "#fff" : "rgba(255,255,255,0.06)",
                      border: "none", cursor: input.trim() ? "pointer" : "default",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      transition: "all 0.15s", opacity: input.trim() ? 1 : 0.3, flexShrink: 0,
                    }}>
                    <Send style={{ width: 16, height: 16, color: input.trim() ? "#000" : "#fff" }} />
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      <style>{`
        @keyframes typingDot {
          0%, 60%, 100% { opacity: 0.3; transform: translateY(0); }
          30% { opacity: 1; transform: translateY(-3px); }
        }
      `}</style>
    </Layout>
  );
}
