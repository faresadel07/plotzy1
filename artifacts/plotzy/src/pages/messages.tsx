import { useState, useRef, useEffect, useCallback } from "react";
import { useRoute, useLocation } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/contexts/auth-context";
import { Layout } from "@/components/layout";
import { Send, MessageCircle, ArrowLeft } from "lucide-react";
import { Link } from "wouter";

function useIsMobile(breakpoint = 768) {
  const [isMobile, setIsMobile] = useState(() => typeof window !== "undefined" && window.innerWidth < breakpoint);
  useEffect(() => {
    const handler = () => setIsMobile(window.innerWidth < breakpoint);
    window.addEventListener("resize", handler);
    return () => window.removeEventListener("resize", handler);
  }, [breakpoint]);
  return isMobile;
}

const SF = "-apple-system,BlinkMacSystemFont,'SF Pro Text','Helvetica Neue',sans-serif";
const BG = "#0a0a0a";
const BG2 = "#111";
const BG3 = "#161616";
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
  isRead: boolean;
}

function UserAvatar({ url, name, size = 40 }: { url: string | null; name: string | null; size?: number }) {
  const initial = (name || "?")[0].toUpperCase();
  if (url) {
    return (
      <img
        src={url}
        alt={name || "User"}
        style={{
          width: size, height: size, borderRadius: "50%",
          objectFit: "cover", flexShrink: 0,
        }}
      />
    );
  }
  return (
    <div style={{
      width: size, height: size, borderRadius: "50%",
      background: "linear-gradient(135deg, #7c6af7 0%, #a78bfa 100%)",
      display: "flex", alignItems: "center", justifyContent: "center",
      color: "#fff", fontFamily: SF, fontSize: size * 0.4, fontWeight: 700,
      flexShrink: 0,
    }}>
      {initial}
    </div>
  );
}

export default function Messages() {
  const { user } = useAuth();
  const [, params] = useRoute("/messages/:userId");
  const selectedUserId = params?.userId ? Number(params.userId) : null;
  const [, navigate] = useLocation();
  const [input, setInput] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const qc = useQueryClient();
  const isMobile = useIsMobile();

  // Conversations list
  const { data: conversations } = useQuery<Conversation[]>({
    queryKey: ["/api/messages/conversations"],
    queryFn: () => fetch("/api/messages/conversations", { credentials: "include" }).then(r => r.ok ? r.json() : []),
    enabled: !!user,
    refetchInterval: 30000,
  });

  // Messages for selected user
  const { data: messages } = useQuery<Message[]>({
    queryKey: ["/api/messages", selectedUserId],
    queryFn: () => fetch(`/api/messages/${selectedUserId}`, { credentials: "include" }).then(r => r.ok ? r.json() : []),
    enabled: !!user && !!selectedUserId,
    refetchInterval: 10000,
  });

  // Send message
  const sendMut = useMutation({
    mutationFn: (content: string) =>
      fetch(`/api/messages/${selectedUserId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ content }),
      }),
    onSuccess: () => {
      setInput("");
      qc.invalidateQueries({ queryKey: ["/api/messages", selectedUserId] });
      qc.invalidateQueries({ queryKey: ["/api/messages/conversations"] });
      qc.invalidateQueries({ queryKey: ["/api/messages/unread-count"] });
    },
  });

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = useCallback(() => {
    const trimmed = input.trim();
    if (!trimmed || !selectedUserId) return;
    sendMut.mutate(trimmed);
  }, [input, selectedUserId, sendMut]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }, [handleSend]);

  const selectedConvo = conversations?.find(c => c.userId === selectedUserId);

  return (
    <Layout isFullDark darkNav noScroll>
      <div style={{
        display: "flex",
        height: "calc(100vh - 44px)",
        fontFamily: SF,
        background: BG,
      }}>
        {/* Left sidebar - conversations */}
        <div style={{
          width: isMobile ? "100%" : 300,
          borderRight: isMobile ? "none" : `1px solid ${B}`,
          display: isMobile && selectedUserId ? "none" : "flex",
          flexDirection: "column",
          background: BG2,
          flexShrink: 0,
        }}>
          {/* Header */}
          <div style={{
            padding: "16px 16px 12px",
            borderBottom: `1px solid ${B}`,
          }}>
            <h2 style={{
              fontFamily: SF,
              fontSize: 16,
              fontWeight: 700,
              color: T,
              margin: 0,
            }}>
              Messages
            </h2>
          </div>

          {/* Conversation list */}
          <div style={{ flex: 1, overflowY: "auto" }}>
            {(!conversations || conversations.length === 0) ? (
              <div style={{
                padding: "40px 20px",
                textAlign: "center",
              }}>
                <MessageCircle style={{ width: 32, height: 32, color: TD, margin: "0 auto 12px" }} />
                <div style={{ fontSize: 13, color: TS }}>No conversations yet</div>
                <div style={{ fontSize: 11.5, color: TD, marginTop: 4 }}>
                  Visit an author's profile to send a message
                </div>
              </div>
            ) : (
              conversations.map(convo => (
                <button
                  key={convo.userId}
                  onClick={() => navigate(`/messages/${convo.userId}`)}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    padding: "12px 16px",
                    width: "100%",
                    textAlign: "left",
                    background: selectedUserId === convo.userId ? "rgba(124,106,247,0.1)" : "transparent",
                    border: "none",
                    borderBottom: `1px solid ${B}`,
                    cursor: "pointer",
                    transition: "background 0.15s",
                  }}
                  onMouseEnter={e => {
                    if (selectedUserId !== convo.userId) e.currentTarget.style.background = "rgba(255,255,255,0.03)";
                  }}
                  onMouseLeave={e => {
                    if (selectedUserId !== convo.userId) e.currentTarget.style.background = "transparent";
                  }}
                >
                  <UserAvatar url={convo.avatarUrl} name={convo.displayName} size={40} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
                      <span style={{
                        fontSize: 13,
                        fontWeight: convo.unreadCount > 0 ? 600 : 400,
                        color: T,
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}>
                        {convo.displayName || "User"}
                      </span>
                      {convo.lastMessageAt && (
                        <span style={{ fontSize: 10.5, color: TD, flexShrink: 0 }}>
                          {timeAgo(convo.lastMessageAt)}
                        </span>
                      )}
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 2 }}>
                      <span style={{
                        fontSize: 12,
                        color: convo.unreadCount > 0 ? TS : TD,
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                        flex: 1,
                      }}>
                        {convo.lastMessage || "No messages yet"}
                      </span>
                      {convo.unreadCount > 0 && (
                        <span style={{
                          minWidth: 18, height: 18, borderRadius: 9,
                          background: ACC, color: "#fff",
                          fontSize: 10, fontWeight: 700,
                          display: "flex", alignItems: "center", justifyContent: "center",
                          padding: "0 5px", flexShrink: 0,
                        }}>
                          {convo.unreadCount > 99 ? "99+" : convo.unreadCount}
                        </span>
                      )}
                    </div>
                  </div>
                </button>
              ))
            )}
          </div>
        </div>

        {/* Right panel - message thread */}
        <div style={{
          flex: 1,
          display: isMobile && !selectedUserId ? "none" : "flex",
          flexDirection: "column",
          background: BG,
          minWidth: 0,
        }}>
          {!selectedUserId ? (
            /* No conversation selected */
            <div style={{
              flex: 1,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              gap: 12,
            }}>
              <MessageCircle style={{ width: 48, height: 48, color: TD }} />
              <div style={{ fontSize: 15, color: TS, fontWeight: 500 }}>Select a conversation</div>
              <div style={{ fontSize: 12.5, color: TD }}>Choose from your existing conversations or start a new one</div>
            </div>
          ) : (
            <>
              {/* Thread header */}
              <div style={{
                padding: "12px 20px",
                borderBottom: `1px solid ${B}`,
                display: "flex",
                alignItems: "center",
                gap: 12,
                background: BG2,
                flexShrink: 0,
              }}>
                <button
                  onClick={() => navigate("/messages")}
                  style={{
                    display: "flex", alignItems: "center", justifyContent: "center",
                    width: 28, height: 28, borderRadius: 6,
                    border: "none", background: "transparent", cursor: "pointer",
                    color: TS, transition: "color 0.15s",
                  }}
                  onMouseEnter={e => e.currentTarget.style.color = T}
                  onMouseLeave={e => e.currentTarget.style.color = TS}
                >
                  <ArrowLeft style={{ width: 16, height: 16 }} />
                </button>
                <UserAvatar url={selectedConvo?.avatarUrl ?? null} name={selectedConvo?.displayName ?? null} size={32} />
                <div>
                  <Link
                    href={`/authors/${selectedUserId}`}
                    style={{
                      fontSize: 13.5,
                      fontWeight: 600,
                      color: T,
                      textDecoration: "none",
                      transition: "color 0.15s",
                    }}
                  >
                    {selectedConvo?.displayName || "User"}
                  </Link>
                </div>
              </div>

              {/* Messages area */}
              <div style={{
                flex: 1,
                overflowY: "auto",
                padding: "20px",
                display: "flex",
                flexDirection: "column",
                gap: 6,
              }}>
                {(!messages || messages.length === 0) ? (
                  <div style={{
                    flex: 1,
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 8,
                  }}>
                    <div style={{ fontSize: 13, color: TS }}>No messages yet</div>
                    <div style={{ fontSize: 12, color: TD }}>Send a message to start the conversation</div>
                  </div>
                ) : (
                  messages.map(msg => {
                    const isMine = msg.senderId === user?.id;
                    return (
                      <div
                        key={msg.id}
                        style={{
                          display: "flex",
                          justifyContent: isMine ? "flex-end" : "flex-start",
                          marginBottom: 2,
                        }}
                      >
                        <div style={{
                          maxWidth: "70%",
                          padding: "8px 14px",
                          borderRadius: 14,
                          borderBottomRightRadius: isMine ? 4 : 14,
                          borderBottomLeftRadius: isMine ? 14 : 4,
                          background: isMine ? ACC : BG3,
                          color: isMine ? "#fff" : T,
                          fontSize: 13,
                          lineHeight: 1.45,
                          fontFamily: SF,
                          wordBreak: "break-word",
                        }}>
                          <div>{msg.content}</div>
                          <div style={{
                            fontSize: 10,
                            color: isMine ? "rgba(255,255,255,0.55)" : TD,
                            marginTop: 4,
                            textAlign: isMine ? "right" : "left",
                          }}>
                            {timeAgo(msg.createdAt)}
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Input */}
              <div style={{
                padding: "12px 20px",
                borderTop: `1px solid ${B}`,
                background: BG2,
                flexShrink: 0,
              }}>
                <div style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  background: BG3,
                  borderRadius: 12,
                  padding: "6px 6px 6px 14px",
                  border: `1px solid ${B}`,
                }}>
                  <textarea
                    value={input}
                    onChange={e => setInput(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Type a message..."
                    rows={1}
                    style={{
                      flex: 1,
                      background: "transparent",
                      border: "none",
                      outline: "none",
                      color: T,
                      fontFamily: SF,
                      fontSize: 13,
                      resize: "none",
                      lineHeight: 1.4,
                      maxHeight: 100,
                      padding: "4px 0",
                    }}
                  />
                  <button
                    onClick={handleSend}
                    disabled={!input.trim() || sendMut.isPending}
                    style={{
                      width: 34,
                      height: 34,
                      borderRadius: 8,
                      background: input.trim() ? ACC : "rgba(255,255,255,0.06)",
                      border: "none",
                      cursor: input.trim() ? "pointer" : "default",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      transition: "background 0.15s, opacity 0.15s",
                      opacity: input.trim() ? 1 : 0.4,
                      flexShrink: 0,
                    }}
                  >
                    <Send style={{ width: 15, height: 15, color: "#fff" }} />
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </Layout>
  );
}
