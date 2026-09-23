// The shared pieces of the live feedback wall: one posted comment, the
// write box, and the avatar. Both the laptop wall and the phone wall use
// these so a comment looks and behaves the same everywhere.

import { useEffect, useRef, useState } from "react";
import { useLocation } from "wouter";
import { Pin, Loader2, PenLine } from "lucide-react";
import { useAuth } from "@/contexts/auth-context";
import { usePostComment, timeAgo, type CommunityComment } from "./use-community-comments";

const SF = '-apple-system, BlinkMacSystemFont, "SF Pro Display", "SF Pro Text", "Helvetica Neue", sans-serif';
const INK = "#2f2618";
const BODY = "#4a4132";
const MUTED = "#7b7366";
const DIM = "#9a9181";
const CARD = "#fffdf7";
const BORDER = "rgba(66,53,33,0.13)";
const ESPRESSO = "#292115";
const MAX_LEN = 600;

/** The collapsed one-line invitation that stands in for the write box. */
const triggerStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  gap: 9,
  width: "100%",
  minHeight: 46,
  padding: "12px 18px",
  background: "transparent",
  border: `1px dashed ${BORDER}`,
  borderRadius: 999,
  color: MUTED,
  fontFamily: SF,
  fontSize: 14,
  fontWeight: 600,
  textAlign: "center",
};

/** The commenter's own profile picture, with their initial as the
 *  fallback — provider avatar URLs expire and would otherwise leave a
 *  broken-image box on the landing page. */
export function CommentAvatar({ url, name, size = 44 }: { url: string | null; name: string; size?: number }) {
  const [broken, setBroken] = useState(false);
  const initial = (name || "?").trim().charAt(0).toUpperCase() || "?";
  const base: React.CSSProperties = {
    width: size, height: size, borderRadius: 12, flexShrink: 0,
  };
  if (!url || broken) {
    return (
      <div style={{
        ...base, background: "rgba(66,53,33,0.10)", border: `1px solid ${BORDER}`,
        display: "flex", alignItems: "center", justifyContent: "center",
        fontSize: size * 0.4, fontWeight: 700, color: MUTED,
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
      style={{ ...base, objectFit: "cover", border: `1px solid ${BORDER}` }}
    />
  );
}

/** One posted comment, styled to sit beside the curated testimonial
 *  cards on either wall. */
export function CommentCard({
  comment, ar, breakInside = true,
}: {
  comment: CommunityComment;
  ar: boolean;
  /** CSS-columns walls need break-inside: avoid; flex walls do not. */
  breakInside?: boolean;
}) {
  const name = comment.authorName || (ar ? "كاتب في بلوتزي" : "A Plotzy writer");
  return (
    <article
      dir={ar ? "rtl" : "ltr"}
      style={{
        breakInside: breakInside ? ("avoid" as const) : undefined,
        background: CARD,
        border: comment.pinned ? "1px solid rgba(123,94,59,0.38)" : `1px solid ${BORDER}`,
        borderRadius: 16,
        padding: "18px 20px",
        marginBottom: 16,
        boxShadow: "0 10px 26px -20px rgba(41,33,21,0.4)",
        fontFamily: SF,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12 }}>
        <CommentAvatar url={comment.authorAvatar} name={name} />
        <div style={{ minWidth: 0, flex: 1 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
            <span style={{ fontSize: 15, fontWeight: 700, color: INK }}>{name}</span>
            {comment.pinned && (
              <span style={{
                display: "inline-flex", alignItems: "center", gap: 4,
                fontSize: 10.5, fontWeight: 700, color: "#7b5e3b",
                background: "rgba(123,94,59,0.12)", border: "1px solid rgba(123,94,59,0.25)",
                borderRadius: 999, padding: "2px 8px",
              }}>
                <Pin size={10} /> {ar ? "مثبّت" : "Pinned"}
              </span>
            )}
          </div>
          <div style={{ fontSize: 12.5, color: DIM, marginTop: 2 }}>
            {timeAgo(comment.createdAt, ar)}
          </div>
        </div>
      </div>
      {/* Plain text on purpose — never dangerouslySetInnerHTML here. */}
      <p style={{ fontSize: 15, lineHeight: 1.75, color: BODY, margin: 0, whiteSpace: "pre-wrap", wordBreak: "break-word" }}>
        {comment.body}
      </p>
    </article>
  );
}

/**
 * The write box, collapsed to a single line until it is wanted.
 *
 * It used to sit open at the top of the wall, so the first thing anyone
 * saw was an empty form and a Post button rather than what other writers
 * had said. Now it lives under the wall as one quiet line, and only
 * becomes a form when somebody taps it.
 */
export function CommentComposer({ ar }: { ar: boolean }) {
  const { user } = useAuth();
  const [, navigate] = useLocation();
  const post = usePostComment();
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const boxRef = useRef<HTMLTextAreaElement>(null);

  const trimmed = text.trim();
  const canPost = trimmed.length >= 4 && trimmed.length <= MAX_LEN && !post.isPending;

  // Focus the box on the frame after it appears, so the keyboard opens
  // in the same gesture that opened the form.
  useEffect(() => {
    if (open) boxRef.current?.focus();
  }, [open]);

  if (!user) {
    return (
      <button
        onClick={() => navigate("/")}
        dir={ar ? "rtl" : "ltr"}
        style={{ ...triggerStyle, cursor: "pointer" }}
      >
        <PenLine size={15} style={{ flexShrink: 0, opacity: 0.55 }} />
        <span>{ar ? "سجّل دخولك لتشارك رأيك" : "Sign in to share what you think"}</span>
      </button>
    );
  }

  const submit = async () => {
    setError(null);
    try {
      await post.mutateAsync(trimmed);
      setText("");
      setDone(true);
      setOpen(false);
      setTimeout(() => setDone(false), 4000);
    } catch (e) {
      setError(e instanceof Error ? e.message : (ar ? "تعذّر النشر." : "Could not post."));
    }
  };

  if (!open) {
    return (
      <div dir={ar ? "rtl" : "ltr"}>
        <button onClick={() => setOpen(true)} style={{ ...triggerStyle, cursor: "pointer" }}>
          <PenLine size={15} style={{ flexShrink: 0, opacity: 0.55 }} />
          <span>{ar ? "شاركنا رأيك بالموقع" : "Share what you think of Plotzy"}</span>
        </button>
        {done && (
          <div style={{ marginTop: 8, fontSize: 13, color: "#3f7d4e", textAlign: "center", fontFamily: SF }}>
            {ar ? "تم النشر، شكراً لك." : "Posted. Thank you."}
          </div>
        )}
      </div>
    );
  }

  return (
    <div
      dir={ar ? "rtl" : "ltr"}
      style={{
        background: CARD, border: `1px solid ${BORDER}`, borderRadius: 16,
        padding: "16px 18px", fontFamily: SF,
        boxShadow: "0 10px 26px -20px rgba(41,33,21,0.4)",
      }}
    >
      <div style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
        <CommentAvatar url={user.avatarUrl ?? null} name={user.displayName || user.email || "?"} size={40} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <textarea
            ref={boxRef}
            value={text}
            onChange={(e) => setText(e.target.value.slice(0, MAX_LEN))}
            placeholder={ar ? "اكتب رأيك عن بلوتزي…" : "Share what Plotzy has been like for you…"}
            rows={3}
            style={{
              width: "100%", boxSizing: "border-box", resize: "vertical",
              background: "rgba(66,53,33,0.04)", border: `1px solid ${BORDER}`,
              borderRadius: 12, padding: "10px 12px",
              fontFamily: SF, fontSize: 14.5, lineHeight: 1.6, color: INK, outline: "none",
            }}
          />
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, marginTop: 10, flexWrap: "wrap" }}>
            <span style={{ fontSize: 12, color: DIM, fontVariantNumeric: "tabular-nums" }}>
              {trimmed.length}/{MAX_LEN}
            </span>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              {/* A form that opens on a tap needs a way back out of it. */}
              <button
                onClick={() => { setOpen(false); setText(""); setError(null); }}
                style={{
                  background: "transparent", color: MUTED, border: "none",
                  borderRadius: 999, padding: "9px 14px",
                  fontSize: 14, fontWeight: 600, fontFamily: SF, cursor: "pointer",
                }}
              >
                {ar ? "إلغاء" : "Cancel"}
              </button>
              <button
                onClick={submit}
                disabled={!canPost}
                style={{
                  display: "inline-flex", alignItems: "center", gap: 7,
                  background: canPost ? ESPRESSO : "rgba(66,53,33,0.12)",
                  color: canPost ? "#f4efe2" : MUTED,
                  border: "none", borderRadius: 999, padding: "9px 22px",
                  fontSize: 14, fontWeight: 700, fontFamily: SF,
                  cursor: canPost ? "pointer" : "not-allowed",
                }}
              >
                {post.isPending && <Loader2 size={14} className="animate-spin" />}
                {ar ? "انشر" : "Post"}
              </button>
            </div>
          </div>
          {error && (
            <div style={{ marginTop: 8, fontSize: 13, color: "#a13c2c", lineHeight: 1.5 }}>{error}</div>
          )}
        </div>
      </div>
    </div>
  );
}
