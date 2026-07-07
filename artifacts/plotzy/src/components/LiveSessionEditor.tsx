// The live co-writing session: a full-screen continuous editor bound to
// the chapter's shared Yjs document. Everyone in the room sees each
// other's cursors and keystrokes in real time.
//
// Design decisions (see the collab plan):
// - CONTINUOUS document, not the paged view: page splits move content
//   between per-page editors, which fights CRDT merging. Page breaks
//   come back on exit: the parent re-splits the final HTML through its
//   existing pagination and the normal save path persists it.
// - SEEDING: the first writer in an empty room replaces the doc with the
//   chapter's current HTML, so a session always starts from the latest
//   saved content. If others are already present, their doc wins.
// - SAVE BRIDGE: while the session runs, the content autosaves through
//   the normal chapter save endpoint (debounced), so readers, exports
//   and the version history never lag behind the live text.
// - Rendered through a portal: ancestors in the editor carry CSS
//   transforms, which would break position:fixed (same lesson as the
//   publisher Track dialog).

import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useEditor, EditorContent } from "@tiptap/react";
import Collaboration from "@tiptap/extension-collaboration";
import CollaborationCaret from "@tiptap/extension-collaboration-caret";
import { Loader2, X, Wifi, WifiOff, Bold, Italic, UnderlineIcon, Eye, Link2, Check } from "lucide-react";
import { buildChapterExtensions } from "@/components/RichChapterEditor";
import { useCollabSession, type CollabPeer } from "@/hooks/use-collab-session";

const SF = '-apple-system, BlinkMacSystemFont, "SF Pro Display", "SF Pro Text", "Helvetica Neue", sans-serif';
const AUTOSAVE_MS = 4000;

interface LiveSessionEditorProps {
  chapterId: number;
  chapterTitle: string;
  /** Latest saved chapter HTML (page-break markers already stripped). */
  initialHtml: string;
  userName: string;
  ar: boolean;
  /** Link that opens this chapter straight into the live session.
   *  Shown to writers only; the invitee must already be a collaborator. */
  inviteUrl?: string;
  /** Persist HTML through the normal chapter save path. */
  onPersist: (html: string) => Promise<void>;
  /** Leave the session; parent re-paginates with this final HTML.
   *  canEdit=false means a viewer left: nothing to save or re-split. */
  onExit: (finalHtml: string, canEdit: boolean) => void;
}

export function LiveSessionEditor({
  chapterId,
  chapterTitle,
  initialHtml,
  userName,
  ar,
  inviteUrl,
  onPersist,
  onExit,
}: LiveSessionEditorProps) {
  const [inviteCopied, setInviteCopied] = useState(false);
  const session = useCollabSession({ chapterId, enabled: true, userName });
  const { doc, provider, status, synced, peers, othersCount, canEdit, role } = session;

  const editor = useEditor(
    {
      extensions: doc && provider
        ? [
            ...buildChapterExtensions({ collab: true }),
            Collaboration.configure({ document: doc }),
            CollaborationCaret.configure({
              provider,
              user: { name: userName || "Writer", color: session.color },
            }),
          ]
        : buildChapterExtensions({ collab: true }),
      // Viewers get a genuinely read-only surface. The server already
      // drops their writes (readOnly connection); without this the
      // browser would fake-accept keystrokes that never sync.
      editable: canEdit,
      // Content comes from the Yjs document; never set initial content
      // here or it would duplicate on every join.
      content: "",
    },
    [doc, provider],
  );

  // Role can resolve after the editor mounts; keep editability in step.
  useEffect(() => {
    if (editor && !editor.isDestroyed) editor.setEditable(canEdit);
  }, [editor, canEdit]);

  // ── Seeding ─────────────────────────────────────────────────────────
  // After first sync: if the shared doc is empty (or we are alone in the
  // room), start the session from the latest saved chapter HTML. Alone
  // means nobody else can lose work; the latest save is authoritative.
  const seededRef = useRef(false);
  useEffect(() => {
    // Only writers seed; a viewer must never inject content.
    if (!editor || !synced || seededRef.current || !canEdit) return;
    seededRef.current = true;
    const aloneInRoom = othersCount === 0;
    const docLooksEmpty = editor.getText().trim().length === 0;
    if (!(aloneInRoom || docLooksEmpty) || !initialHtml.trim()) return;
    // Small random delay + re-check narrows the race where two writers
    // join a brand-new room in the same instant and would both seed
    // (Yjs would merge both inserts into duplicated text).
    const wait = 120 + Math.floor(Math.random() * 350);
    const t = setTimeout(() => {
      if (editor.isDestroyed) return;
      const stillEmpty = editor.getText().trim().length === 0;
      if (stillEmpty || othersCount === 0) {
        if (stillEmpty) {
          editor.commands.setContent(initialHtml);
        } else if (othersCount === 0) {
          // Alone with stale content: the latest save wins.
          editor.commands.setContent(initialHtml);
        }
      }
    }, wait);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editor, synced, canEdit]);

  // ── Save bridge (writers only: a viewer's PUT would just 403) ──────
  const dirtyRef = useRef(false);
  const savingRef = useRef(false);
  useEffect(() => {
    if (!editor || !canEdit) return;
    const markDirty = () => { dirtyRef.current = true; };
    editor.on("update", markDirty);
    const timer = setInterval(async () => {
      if (!dirtyRef.current || savingRef.current) return;
      dirtyRef.current = false;
      savingRef.current = true;
      try {
        await onPersist(editor.getHTML());
      } catch {
        dirtyRef.current = true; // retry on the next tick
      } finally {
        savingRef.current = false;
      }
    }, AUTOSAVE_MS);
    return () => {
      editor.off("update", markDirty);
      clearInterval(timer);
    };
  }, [editor, onPersist, canEdit]);

  // Closing the tab mid-session with unsaved bridge changes: the Yjs doc
  // itself is safe on the server, but chapters.content may lag a few
  // seconds. Warn so the writer leaves through the button when possible.
  useEffect(() => {
    const guard = (e: BeforeUnloadEvent) => {
      if (!dirtyRef.current) return;
      e.preventDefault();
    };
    window.addEventListener("beforeunload", guard);
    return () => window.removeEventListener("beforeunload", guard);
  }, []);

  const leave = useCallback(async () => {
    const html = editor?.getHTML() ?? initialHtml;
    if (canEdit && dirtyRef.current && editor) {
      try { await onPersist(html); dirtyRef.current = false; } catch { /* parent will save after re-split */ }
    }
    onExit(html, canEdit);
  }, [editor, initialHtml, onPersist, onExit, canEdit]);

  const statusLabel =
    status === "denied"
      ? ar ? "لا تملك صلاحية لهذه الجلسة" : "You do not have access to this session"
      : status === "disabled"
        ? ar ? "الجلسات الحية معطلة حالياً" : "Live sessions are currently disabled"
        : status === "offline"
          ? ar ? "انقطع الاتصال، إعادة المحاولة جارية. كتابتك محفوظة وستتزامن عند عودة الاتصال" : "Connection lost, retrying. Your writing is kept and will sync when you are back"
          : !synced
            ? ar ? "جارٍ الاتصال بالجلسة" : "Joining the session"
            : null;

  return createPortal(
    <div
      dir={ar ? "rtl" : "ltr"}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 150,
        background: "#0b0b0d",
        display: "flex",
        flexDirection: "column",
        fontFamily: SF,
      }}
    >
      {/* ── Session header ─────────────────────────────────────────── */}
      <header
        style={{
          display: "flex",
          alignItems: "center",
          gap: 12,
          padding: "10px 14px",
          borderBottom: "1px solid rgba(255,255,255,0.09)",
          background: "rgba(255,255,255,0.02)",
          flexWrap: "wrap",
        }}
      >
        <span
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 7,
            padding: "5px 12px",
            borderRadius: 999,
            background: status === "active" && synced ? "rgba(95,207,142,0.12)" : "rgba(255,255,255,0.06)",
            border: `1px solid ${status === "active" && synced ? "rgba(95,207,142,0.35)" : "rgba(255,255,255,0.14)"}`,
            color: status === "active" && synced ? "#5fcf8e" : "rgba(255,255,255,0.7)",
            fontSize: 12,
            fontWeight: 700,
          }}
        >
          {status === "offline" ? <WifiOff size={13} /> : <Wifi size={13} />}
          {ar ? "جلسة حية" : "Live session"}
        </span>

        <div style={{ minWidth: 0, flex: 1 }}>
          <div
            style={{
              color: "#fff",
              fontSize: 14,
              fontWeight: 700,
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
            }}
          >
            {chapterTitle}
          </div>
        </div>

        {/* presence avatars */}
        <PresenceRow peers={peers} ar={ar} />

        {/* viewer badge: watching, not writing */}
        {role === "viewer" && (
          <span
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              padding: "5px 11px",
              borderRadius: 999,
              background: "rgba(96,165,250,0.10)",
              border: "1px solid rgba(96,165,250,0.35)",
              color: "#60a5fa",
              fontSize: 11.5,
              fontWeight: 700,
            }}
          >
            <Eye size={12} />
            {ar ? "قراءة فقط" : "Read only"}
          </span>
        )}

        {/* light formatting (writers only) */}
        {editor && canEdit && (
          <div style={{ display: "flex", gap: 4 }}>
            {[
              { Icon: Bold, on: () => editor.chain().focus().toggleBold().run(), active: editor.isActive("bold") },
              { Icon: Italic, on: () => editor.chain().focus().toggleItalic().run(), active: editor.isActive("italic") },
              { Icon: UnderlineIcon, on: () => editor.chain().focus().toggleUnderline().run(), active: editor.isActive("underline") },
            ].map(({ Icon, on, active }, i) => (
              <button
                key={i}
                onMouseDown={(e) => e.preventDefault()}
                onClick={on}
                style={{
                  width: 32,
                  height: 32,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  borderRadius: 8,
                  background: active ? "rgba(255,255,255,0.16)" : "transparent",
                  border: "1px solid rgba(255,255,255,0.12)",
                  color: "#fff",
                  cursor: "pointer",
                }}
              >
                <Icon size={14} />
              </button>
            ))}
          </div>
        )}

        {/* one-tap invite: copies a link that lands straight in this session */}
        {canEdit && inviteUrl && (
          <button
            onClick={async () => {
              try {
                await navigator.clipboard.writeText(inviteUrl);
                setInviteCopied(true);
                setTimeout(() => setInviteCopied(false), 2200);
              } catch { /* clipboard denied: nothing to do */ }
            }}
            title={ar ? "انسخ رابط الجلسة لمتعاون على هذا الكتاب" : "Copy the session link for a collaborator on this book"}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              padding: "7px 12px",
              borderRadius: 10,
              background: inviteCopied ? "rgba(95,207,142,0.15)" : "rgba(255,255,255,0.06)",
              color: inviteCopied ? "#5fcf8e" : "rgba(255,255,255,0.85)",
              border: `1px solid ${inviteCopied ? "rgba(95,207,142,0.4)" : "rgba(255,255,255,0.14)"}`,
              fontSize: 12.5,
              fontWeight: 700,
              cursor: "pointer",
            }}
          >
            {inviteCopied ? <Check size={13} /> : <Link2 size={13} />}
            {inviteCopied ? (ar ? "انتسخ" : "Copied") : ar ? "دعوة" : "Invite"}
          </button>
        )}

        <button
          onClick={leave}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            padding: "7px 14px",
            borderRadius: 10,
            background: "#fff",
            color: "#000",
            border: "none",
            fontSize: 12.5,
            fontWeight: 700,
            cursor: "pointer",
          }}
        >
          <X size={13} />
          {ar ? "إنهاء الجلسة" : "Leave session"}
        </button>
      </header>

      {/* ── Status strip ───────────────────────────────────────────── */}
      {statusLabel && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            justifyContent: "center",
            padding: "8px 14px",
            color: status === "denied" ? "#f87171" : "rgba(255,255,255,0.6)",
            fontSize: 12.5,
            background: "rgba(255,255,255,0.02)",
            borderBottom: "1px solid rgba(255,255,255,0.06)",
          }}
        >
          {status !== "denied" && <Loader2 size={13} className="animate-spin" />}
          {statusLabel}
        </div>
      )}

      {/* ── The shared document ────────────────────────────────────── */}
      <div style={{ flex: 1, overflowY: "auto", WebkitOverflowScrolling: "touch" }}>
        <div
          style={{
            maxWidth: 720,
            margin: "0 auto",
            padding: "28px 18px 120px",
          }}
        >
          <div className="live-session-doc" style={{ color: "#eceae4" }}>
            <EditorContent editor={editor} />
          </div>
        </div>
      </div>

      {/* Caret + editor styles for the dark continuous surface */}
      <style>{`
        .live-session-doc .ProseMirror {
          outline: none;
          min-height: 60vh;
          font-size: 17px;
          line-height: 1.85;
        }
        .live-session-doc .ProseMirror p { margin: 0 0 1em; }
        .live-session-doc .ProseMirror h1,
        .live-session-doc .ProseMirror h2,
        .live-session-doc .ProseMirror h3 { color: #fff; }
        /* Remote carets (CollaborationCaret) */
        .live-session-doc .collaboration-carets__caret {
          border-left: 1px solid;
          border-right: 1px solid;
          margin-left: -1px;
          margin-right: -1px;
          pointer-events: none;
          position: relative;
          word-break: normal;
        }
        .live-session-doc .collaboration-carets__label {
          border-radius: 4px 4px 4px 0;
          color: #0b0b0d;
          font-size: 10px;
          font-weight: 700;
          left: -1px;
          line-height: 1;
          padding: 2px 5px;
          position: absolute;
          top: -1.35em;
          user-select: none;
          white-space: nowrap;
        }
      `}</style>
    </div>,
    document.body,
  );
}

function PresenceRow({ peers, ar }: { peers: CollabPeer[]; ar: boolean }) {
  const shown = peers.slice(0, 5);
  return (
    <div style={{ display: "flex", alignItems: "center" }} title={peers.map((p) => p.name).join(", ")}>
      {shown.map((p, i) => (
        <span
          key={p.clientId}
          style={{
            width: 28,
            height: 28,
            borderRadius: "50%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 11,
            fontWeight: 800,
            color: "#0b0b0d",
            background: p.color,
            border: "2px solid #0b0b0d",
            marginInlineStart: i === 0 ? 0 : -8,
            zIndex: 10 - i,
          }}
        >
          {(p.name || "?").trim().charAt(0).toUpperCase()}
        </span>
      ))}
      {peers.length > 5 && (
        <span style={{ marginInlineStart: 6, fontSize: 11, color: "rgba(255,255,255,0.55)" }}>
          +{peers.length - 5}
        </span>
      )}
      <span style={{ marginInlineStart: 8, fontSize: 11.5, color: "rgba(255,255,255,0.5)" }}>
        {ar ? `${peers.length} في الجلسة` : `${peers.length} in session`}
      </span>
    </div>
  );
}
