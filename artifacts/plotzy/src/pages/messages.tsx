import { useState, useRef, useEffect, useCallback } from "react";
import { useRoute, useLocation, Link } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/contexts/auth-context";
import { Layout } from "@/components/layout";
import { Send, MessageCircle, ArrowLeft, Check, CheckCheck, Image as ImageIcon, Paperclip, Search, FileText, Download, X } from "lucide-react";

/* ── Responsive ───────────────────────────────────────────── */
function useIsMobile(bp = 768) {
  const [m, setM] = useState(() => typeof window !== "undefined" && window.innerWidth < bp);
  useEffect(() => { const h = () => setM(window.innerWidth < bp); window.addEventListener("resize", h); return () => window.removeEventListener("resize", h); }, [bp]);
  return m;
}

/* ── Design tokens ────────────────────────────────────────── */
const SF = "-apple-system,BlinkMacSystemFont,'SF Pro Text','Helvetica Neue',sans-serif";
const BG = "#000";
const SIDEBAR = "#0a0a0a";
const CARD = "#111";
const B = "rgba(255,255,255,0.06)";
const T = "#fff";
const TS = "rgba(255,255,255,0.55)";
const TD = "rgba(255,255,255,0.25)";
const SENT_BG = "#fff";
const SENT_TEXT = "#000";
const RECV_BG = "#1a1a1a";
const RECV_TEXT = "rgba(255,255,255,0.88)";

/* ── Time helpers ─────────────────────────────────────────── */
function formatTime(d: string) { return new Date(d).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }); }
function formatDate(d: string) {
  const dt = new Date(d), now = new Date();
  if (dt.toDateString() === now.toDateString()) return "Today";
  const y = new Date(now); y.setDate(y.getDate() - 1);
  if (dt.toDateString() === y.toDateString()) return "Yesterday";
  return dt.toLocaleDateString([], { month: "short", day: "numeric" });
}
function sidebarTime(d: string | null) {
  if (!d) return "";
  const dt = new Date(d), now = new Date();
  if (dt.toDateString() === now.toDateString()) return formatTime(d);
  const y = new Date(now); y.setDate(y.getDate() - 1);
  if (dt.toDateString() === y.toDateString()) return "Yesterday";
  return dt.toLocaleDateString([], { month: "short", day: "numeric" });
}

/* ── Types ────────────────────────────────────────────────── */
interface Conversation { partnerId: number; partnerDisplayName: string | null; partnerAvatarUrl: string | null; content: string | null; createdAt: string | null; unreadCount: number; }
interface Message { id: number; senderId: number; receiverId: number; content: string; createdAt: string; read: boolean; }

/* ── Parse special content (images/files) ─────────────────── */
function parseContent(content: string): { type: "text" | "image" | "file"; text: string; mime?: string; name?: string; data?: string } {
  const imgMatch = content.match(/^\[IMG:([^:]+):([^:]+):(.+)\]$/s);
  if (imgMatch) return { type: "image", text: imgMatch[2], mime: imgMatch[1], name: imgMatch[2], data: imgMatch[3] };
  const fileMatch = content.match(/^\[FILE:([^:]+):([^:]+):(.+)\]$/s);
  if (fileMatch) return { type: "file", text: fileMatch[2], mime: fileMatch[1], name: fileMatch[2], data: fileMatch[3] };
  return { type: "text", text: content };
}

/* ── Avatar ───────────────────────────────────────────────── */
function Avatar({ url, name, size = 40 }: { url: string | null; name: string | null; size?: number }) {
  const initial = (name || "?")[0].toUpperCase();
  if (url) return <img src={url} alt={name || ""} style={{ width: size, height: size, borderRadius: "50%", objectFit: "cover", flexShrink: 0 }} />;
  return (
    <div style={{ width: size, height: size, borderRadius: "50%", background: "linear-gradient(135deg, #333 0%, #222 100%)", display: "flex", alignItems: "center", justifyContent: "center", color: "rgba(255,255,255,0.6)", fontFamily: SF, fontSize: size * 0.38, fontWeight: 600, flexShrink: 0 }}>
      {initial}
    </div>
  );
}

/* ── Message bubble content ───────────────────────────────── */
function BubbleContent({ content, isMine }: { content: string; isMine: boolean }) {
  const parsed = parseContent(content);
  if (parsed.type === "image" && parsed.data) {
    return (
      <div>
        <img src={`data:${parsed.mime};base64,${parsed.data}`} alt={parsed.name}
          style={{ maxWidth: 260, maxHeight: 300, borderRadius: 8, display: "block", cursor: "pointer" }}
          onClick={() => {
            const w = window.open(); if (w) { w.document.write(`<img src="data:${parsed.mime};base64,${parsed.data}" style="max-width:100%;max-height:100vh;margin:auto;display:block" />`); w.document.title = parsed.name || "Image"; }
          }}
        />
        <div style={{ fontSize: 10.5, color: isMine ? "rgba(0,0,0,0.4)" : TD, marginTop: 4 }}>{parsed.name}</div>
      </div>
    );
  }
  if (parsed.type === "file" && parsed.data) {
    const downloadFile = () => {
      const a = document.createElement("a");
      a.href = `data:${parsed.mime};base64,${parsed.data}`;
      a.download = parsed.name || "file";
      a.click();
    };
    return (
      <div onClick={downloadFile} style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer", padding: "4px 0" }}>
        <div style={{ width: 40, height: 40, borderRadius: 8, background: isMine ? "rgba(0,0,0,0.08)" : "rgba(255,255,255,0.06)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
          <FileText style={{ width: 20, height: 20, color: isMine ? "rgba(0,0,0,0.5)" : TS }} />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 12.5, fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{parsed.name}</div>
          <div style={{ fontSize: 10.5, color: isMine ? "rgba(0,0,0,0.35)" : TD, marginTop: 1 }}>Tap to download</div>
        </div>
        <Download style={{ width: 16, height: 16, color: isMine ? "rgba(0,0,0,0.3)" : TD, flexShrink: 0 }} />
      </div>
    );
  }
  return <div style={{ whiteSpace: "pre-wrap" }}>{parsed.text}</div>;
}

/* ═══════════════════════════════════════════════════════════════
   MAIN
   ═══════════════════════════════════════════════════════════════ */
export default function Messages() {
  const { user } = useAuth();
  const [, params] = useRoute("/messages/:userId");
  const selectedUserId = params?.userId ? Number(params.userId) : null;
  const [, navigate] = useLocation();
  const [input, setInput] = useState("");
  const [search, setSearch] = useState("");
  const [previewFile, setPreviewFile] = useState<{ file: File; url: string } | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const qc = useQueryClient();
  const isMobile = useIsMobile();

  const { data: conversations = [] } = useQuery<Conversation[]>({
    queryKey: ["/api/messages/conversations"],
    queryFn: async () => {
      const r = await fetch("/api/messages/conversations", { credentials: "include" });
      if (!r.ok) return [];
      const rows = await r.json();
      // Map backend field names
      return rows.map((c: any) => ({ partnerId: c.partnerId, partnerDisplayName: c.partnerDisplayName, partnerAvatarUrl: c.partnerAvatarUrl, content: c.content, createdAt: c.createdAt, unreadCount: c.unreadCount }));
    },
    enabled: !!user, refetchInterval: 15000,
  });

  const { data: messages = [] } = useQuery<Message[]>({
    queryKey: ["/api/messages", selectedUserId],
    queryFn: () => fetch(`/api/messages/${selectedUserId}`, { credentials: "include" }).then(r => r.ok ? r.json() : []),
    enabled: !!user && !!selectedUserId, refetchInterval: 5000,
  });

  const sendMut = useMutation({
    mutationFn: (content: string) =>
      fetch(`/api/messages/${selectedUserId}`, { method: "POST", headers: { "Content-Type": "application/json" }, credentials: "include", body: JSON.stringify({ content }) }),
    onSuccess: () => { setInput(""); qc.invalidateQueries({ queryKey: ["/api/messages", selectedUserId] }); qc.invalidateQueries({ queryKey: ["/api/messages/conversations"] }); },
  });

  const uploadMut = useMutation({
    mutationFn: (file: File) => {
      const fd = new FormData(); fd.append("file", file);
      return fetch(`/api/messages/${selectedUserId}/attachment`, { method: "POST", credentials: "include", body: fd });
    },
    onSuccess: () => { setPreviewFile(null); qc.invalidateQueries({ queryKey: ["/api/messages", selectedUserId] }); qc.invalidateQueries({ queryKey: ["/api/messages/conversations"] }); },
  });

  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);
  useEffect(() => { if (selectedUserId) setTimeout(() => inputRef.current?.focus(), 100); }, [selectedUserId]);

  const handleSend = useCallback(() => {
    if (previewFile) { uploadMut.mutate(previewFile.file); return; }
    const trimmed = input.trim();
    if (!trimmed || !selectedUserId) return;
    sendMut.mutate(trimmed);
  }, [input, selectedUserId, sendMut, previewFile, uploadMut]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); }
  }, [handleSend]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) { alert("File too large (max 10MB)"); return; }
    const url = file.type.startsWith("image/") ? URL.createObjectURL(file) : "";
    setPreviewFile({ file, url });
    e.target.value = "";
  };

  const selectedConvo = conversations.find(c => c.partnerId === selectedUserId);
  const filteredConvos = conversations.filter(c => !search.trim() || (c.partnerDisplayName || "").toLowerCase().includes(search.toLowerCase()));

  // Group messages by date
  const grouped: { date: string; msgs: Message[] }[] = [];
  messages.forEach(msg => {
    const ds = new Date(msg.createdAt).toDateString();
    const last = grouped[grouped.length - 1];
    if (last && last.date === ds) last.msgs.push(msg);
    else grouped.push({ date: ds, msgs: [msg] });
  });

  // Sidebar last message display (strip file markers)
  const lastMsgPreview = (c: Conversation) => {
    if (!c.content) return "Start a conversation";
    if (c.content.startsWith("[IMG:")) return "📷 Photo";
    if (c.content.startsWith("[FILE:")) return "📎 File";
    return c.content.length > 40 ? c.content.slice(0, 40) + "…" : c.content;
  };

  return (
    <Layout isFullDark darkNav noScroll>
      <div style={{ display: "flex", height: "calc(100vh - 44px)", fontFamily: SF, background: BG }}>

        {/* ═══ SIDEBAR ═══════════════════════════════════ */}
        <div style={{ width: isMobile ? "100%" : 340, borderRight: isMobile ? "none" : `1px solid ${B}`, display: isMobile && selectedUserId ? "none" : "flex", flexDirection: "column", background: SIDEBAR, flexShrink: 0 }}>
          <div style={{ padding: "20px 20px 16px" }}>
            <h2 style={{ fontSize: 20, fontWeight: 700, color: T, margin: "0 0 14px", letterSpacing: "-0.02em" }}>Messages</h2>
            <div style={{ display: "flex", alignItems: "center", gap: 8, background: CARD, borderRadius: 10, padding: "8px 12px", border: `1px solid ${B}` }}>
              <Search style={{ width: 14, height: 14, color: TD, flexShrink: 0 }} />
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search conversations..." style={{ flex: 1, background: "transparent", border: "none", outline: "none", color: T, fontFamily: SF, fontSize: 13 }} />
            </div>
          </div>

          <div style={{ flex: 1, overflowY: "auto" }}>
            {filteredConvos.length === 0 ? (
              <div style={{ padding: "48px 24px", textAlign: "center" }}>
                <MessageCircle style={{ width: 36, height: 36, color: TD, margin: "0 auto 14px", opacity: 0.5 }} />
                <div style={{ fontSize: 14, color: TS, fontWeight: 500 }}>No conversations yet</div>
                <div style={{ fontSize: 12, color: TD, marginTop: 6, lineHeight: 1.5 }}>Visit an author's profile to start a conversation</div>
              </div>
            ) : filteredConvos.map(convo => {
              const active = selectedUserId === convo.partnerId;
              return (
                <button key={convo.partnerId} onClick={() => navigate(`/messages/${convo.partnerId}`)}
                  style={{ display: "flex", alignItems: "center", gap: 12, padding: "14px 20px", width: "100%", textAlign: "left", background: active ? "rgba(255,255,255,0.04)" : "transparent", border: "none", borderLeft: active ? "2px solid #fff" : "2px solid transparent", cursor: "pointer", transition: "all 0.15s" }}
                  onMouseEnter={e => { if (!active) e.currentTarget.style.background = "rgba(255,255,255,0.02)"; }}
                  onMouseLeave={e => { if (!active) e.currentTarget.style.background = "transparent"; }}
                >
                  <Avatar url={convo.partnerAvatarUrl} name={convo.partnerDisplayName} size={44} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
                      <span style={{ fontSize: 13.5, fontWeight: convo.unreadCount > 0 ? 600 : 400, color: T, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{convo.partnerDisplayName || "User"}</span>
                      <span style={{ fontSize: 11, color: convo.unreadCount > 0 ? TS : TD, flexShrink: 0 }}>{sidebarTime(convo.createdAt)}</span>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 3 }}>
                      <span style={{ fontSize: 12.5, color: convo.unreadCount > 0 ? TS : TD, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", flex: 1 }}>{lastMsgPreview(convo)}</span>
                      {convo.unreadCount > 0 && (
                        <span style={{ minWidth: 20, height: 20, borderRadius: 10, background: "#fff", color: "#000", fontSize: 10, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center", padding: "0 6px", flexShrink: 0 }}>{convo.unreadCount > 99 ? "99+" : convo.unreadCount}</span>
                      )}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* ═══ CHAT PANEL ════════════════════════════════ */}
        <div style={{ flex: 1, display: isMobile && !selectedUserId ? "none" : "flex", flexDirection: "column", background: BG, minWidth: 0 }}>
          {!selectedUserId ? (
            <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 16, padding: 40 }}>
              <div style={{ width: 80, height: 80, borderRadius: 20, background: "rgba(255,255,255,0.03)", border: `1px solid ${B}`, display: "flex", alignItems: "center", justifyContent: "center" }}>
                <MessageCircle style={{ width: 36, height: 36, color: "rgba(255,255,255,0.15)" }} />
              </div>
              <h3 style={{ fontSize: 20, fontWeight: 700, color: T, margin: 0, letterSpacing: "-0.02em" }}>Welcome to Plotzy Messages</h3>
              <p style={{ fontSize: 14, color: TD, margin: 0, textAlign: "center", maxWidth: 360, lineHeight: 1.6 }}>Connect with fellow writers, share ideas, and collaborate. Select a conversation to get started.</p>
            </div>
          ) : (
            <>
              {/* Header */}
              <div style={{ padding: "12px 20px", borderBottom: `1px solid ${B}`, display: "flex", alignItems: "center", gap: 12, background: SIDEBAR, flexShrink: 0 }}>
                {isMobile && (
                  <button onClick={() => navigate("/messages")} style={{ display: "flex", alignItems: "center", justifyContent: "center", width: 32, height: 32, borderRadius: 8, border: "none", background: "transparent", cursor: "pointer", color: TS }}>
                    <ArrowLeft style={{ width: 18, height: 18 }} />
                  </button>
                )}
                <Avatar url={selectedConvo?.partnerAvatarUrl ?? null} name={selectedConvo?.partnerDisplayName ?? null} size={36} />
                <Link href={`/authors/${selectedUserId}`} style={{ fontSize: 14, fontWeight: 600, color: T, textDecoration: "none" }}>
                  {selectedConvo?.partnerDisplayName || "User"}
                </Link>
              </div>

              {/* Messages */}
              <div style={{ flex: 1, overflowY: "auto", padding: "8px 0" }}>
                {messages.length === 0 ? (
                  <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 8, height: "100%" }}>
                    <div style={{ fontSize: 13, color: TS }}>No messages yet</div>
                    <div style={{ fontSize: 12, color: TD }}>Say hello to start the conversation</div>
                  </div>
                ) : grouped.map((group, gi) => (
                  <div key={gi}>
                    {/* Date separator */}
                    <div style={{ display: "flex", alignItems: "center", gap: 12, margin: "16px 0", padding: "0 20px" }}>
                      <div style={{ flex: 1, height: 1, background: B }} />
                      <span style={{ fontSize: 11, color: TD, fontWeight: 500 }}>{formatDate(group.msgs[0].createdAt)}</span>
                      <div style={{ flex: 1, height: 1, background: B }} />
                    </div>
                    {group.msgs.map((msg, mi) => {
                      const isMine = msg.senderId === user?.id;
                      const showAvatar = !isMine && (mi === 0 || group.msgs[mi - 1].senderId !== msg.senderId);
                      return (
                        <div key={msg.id} style={{ display: "flex", justifyContent: isMine ? "flex-end" : "flex-start", padding: "2px 20px", gap: 8, alignItems: "flex-end" }}>
                          {!isMine && <div style={{ width: 28, flexShrink: 0 }}>{showAvatar && <Avatar url={selectedConvo?.partnerAvatarUrl ?? null} name={selectedConvo?.partnerDisplayName ?? null} size={28} />}</div>}
                          <div style={{
                            maxWidth: "65%", padding: "10px 14px", borderRadius: 16,
                            borderBottomRightRadius: isMine ? 4 : 16, borderBottomLeftRadius: isMine ? 16 : 4,
                            background: isMine ? SENT_BG : RECV_BG, color: isMine ? SENT_TEXT : RECV_TEXT,
                            fontSize: 14, lineHeight: 1.55, fontFamily: SF, wordBreak: "break-word",
                          }}>
                            <BubbleContent content={msg.content} isMine={isMine} />
                            <div style={{ display: "flex", alignItems: "center", justifyContent: isMine ? "flex-end" : "flex-start", gap: 4, marginTop: 4 }}>
                              <span style={{ fontSize: 10, color: isMine ? "rgba(0,0,0,0.4)" : TD }}>{formatTime(msg.createdAt)}</span>
                              {isMine && (msg.read ? <CheckCheck style={{ width: 14, height: 14, color: "#60a5fa" }} /> : <Check style={{ width: 14, height: 14, color: "rgba(0,0,0,0.35)" }} />)}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ))}
                <div ref={messagesEndRef} />
              </div>

              {/* File preview */}
              {previewFile && (
                <div style={{ padding: "8px 20px", borderTop: `1px solid ${B}`, background: SIDEBAR, display: "flex", alignItems: "center", gap: 10 }}>
                  {previewFile.url ? (
                    <img src={previewFile.url} alt="" style={{ width: 48, height: 48, borderRadius: 8, objectFit: "cover" }} />
                  ) : (
                    <div style={{ width: 48, height: 48, borderRadius: 8, background: "rgba(255,255,255,0.06)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                      <FileText style={{ width: 22, height: 22, color: TS }} />
                    </div>
                  )}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 12.5, color: T, fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{previewFile.file.name}</div>
                    <div style={{ fontSize: 11, color: TD }}>{(previewFile.file.size / 1024).toFixed(0)} KB</div>
                  </div>
                  <button onClick={() => setPreviewFile(null)} style={{ width: 28, height: 28, borderRadius: 6, border: "none", background: "rgba(255,255,255,0.06)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: TS }}>
                    <X style={{ width: 14, height: 14 }} />
                  </button>
                </div>
              )}

              {/* Input */}
              <div style={{ padding: "12px 20px", borderTop: `1px solid ${B}`, background: SIDEBAR, flexShrink: 0 }}>
                <input ref={imageInputRef} type="file" accept="image/*" hidden onChange={handleFileSelect} />
                <input ref={fileInputRef} type="file" accept=".pdf,.doc,.docx,.txt,.epub,.rtf" hidden onChange={handleFileSelect} />
                <div style={{ display: "flex", alignItems: "flex-end", gap: 8, background: CARD, borderRadius: 14, padding: "8px 8px 8px 4px", border: `1px solid ${B}` }}>
                  <button onClick={() => fileInputRef.current?.click()} style={{ width: 36, height: 36, borderRadius: 8, border: "none", background: "transparent", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: TD, transition: "color 0.15s", flexShrink: 0 }} onMouseEnter={e => e.currentTarget.style.color = TS} onMouseLeave={e => e.currentTarget.style.color = TD}>
                    <Paperclip style={{ width: 18, height: 18 }} />
                  </button>
                  <button onClick={() => imageInputRef.current?.click()} style={{ width: 36, height: 36, borderRadius: 8, border: "none", background: "transparent", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: TD, transition: "color 0.15s", flexShrink: 0 }} onMouseEnter={e => e.currentTarget.style.color = TS} onMouseLeave={e => e.currentTarget.style.color = TD}>
                    <ImageIcon style={{ width: 18, height: 18 }} />
                  </button>
                  <textarea ref={inputRef} value={input} onChange={e => setInput(e.target.value)} onKeyDown={handleKeyDown} placeholder={previewFile ? "Add a caption..." : "Type a message..."} rows={1}
                    style={{ flex: 1, background: "transparent", border: "none", outline: "none", color: T, fontFamily: SF, fontSize: 14, resize: "none", lineHeight: 1.45, maxHeight: 100, padding: "6px 0", minHeight: 24 }}
                  />
                  <button onClick={handleSend} disabled={(!input.trim() && !previewFile) || sendMut.isPending || uploadMut.isPending}
                    style={{ width: 36, height: 36, borderRadius: 10, background: (input.trim() || previewFile) ? "#fff" : "rgba(255,255,255,0.06)", border: "none", cursor: (input.trim() || previewFile) ? "pointer" : "default", display: "flex", alignItems: "center", justifyContent: "center", transition: "all 0.15s", opacity: (input.trim() || previewFile) ? 1 : 0.3, flexShrink: 0 }}>
                    <Send style={{ width: 16, height: 16, color: (input.trim() || previewFile) ? "#000" : "#fff" }} />
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
