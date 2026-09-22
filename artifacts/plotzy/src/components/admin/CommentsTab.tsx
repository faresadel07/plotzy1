// Admin moderation for the landing page's live feedback wall.
//
// Pin  — the only way a writer's comment is allowed ABOVE the curated
//        testimonials. Unpinned comments always sit underneath them.
// Hide — soft removal: gone from the public wall, still here, restorable.
// Delete — permanent, for spam. Audit-logged with a copy of the text.

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Pin, PinOff, EyeOff, Eye, Trash2, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { adminFetch, adminErrorText } from "@/lib/admin-api";
import { CommentAvatar } from "@/components/community/CommentPieces";
import { timeAgo, type CommunityComment } from "@/components/community/use-community-comments";

const KEY = ["/api/admin/community/comments"] as const;

const T = {
  card: "#fffdf7",
  border: "rgba(66,53,33,0.14)",
  text: "#2f2618",
  body: "#4a4132",
  muted: "#6d6354",
  dim: "#9a9181",
  espresso: "#292115",
  danger: "#a13c2c",
};

export function CommentsTab() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [filter, setFilter] = useState<"visible" | "pinned" | "hidden">("visible");
  const [confirmId, setConfirmId] = useState<number | null>(null);

  const { data, isLoading, error } = useQuery<{ comments: CommunityComment[] }>({
    queryKey: KEY,
    queryFn: () => adminFetch("/api/admin/community/comments"),
  });

  const patch = useMutation({
    mutationFn: ({ id, ...body }: { id: number; pinned?: boolean; hidden?: boolean }) =>
      adminFetch(`/api/admin/community/comments/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEY });
      qc.invalidateQueries({ queryKey: ["/api/community/comments"] });
    },
    onError: (e) => toast({ title: adminErrorText(e, false), variant: "destructive" }),
  });

  const remove = useMutation({
    mutationFn: (id: number) => adminFetch(`/api/admin/community/comments/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      setConfirmId(null);
      qc.invalidateQueries({ queryKey: KEY });
      qc.invalidateQueries({ queryKey: ["/api/community/comments"] });
      toast({ title: "Comment deleted" });
    },
    onError: (e) => toast({ title: adminErrorText(e, false), variant: "destructive" }),
  });

  if (isLoading) {
    return (
      <div style={{ padding: 40, textAlign: "center", color: T.dim }}>
        <Loader2 size={20} className="animate-spin" style={{ display: "inline" }} />
      </div>
    );
  }
  if (error) {
    return (
      <div style={{ background: T.card, border: `1px solid rgba(161,60,44,0.28)`, borderRadius: 12, padding: "18px 20px", maxWidth: 520 }}>
        <div style={{ fontSize: 14, fontWeight: 700, color: T.text, marginBottom: 6 }}>Could not load comments</div>
        <div style={{ fontSize: 13, color: T.muted }}>{adminErrorText(error, false)}</div>
      </div>
    );
  }

  const all = Array.isArray(data?.comments) ? data!.comments : [];
  const counts = {
    visible: all.filter((c) => !c.hidden).length,
    pinned: all.filter((c) => c.pinned && !c.hidden).length,
    hidden: all.filter((c) => c.hidden).length,
  };
  const list = all.filter((c) =>
    filter === "hidden" ? c.hidden :
    filter === "pinned" ? (c.pinned && !c.hidden) :
    !c.hidden
  );

  return (
    <div>
      <p style={{ fontSize: 13, color: T.muted, lineHeight: 1.7, margin: "0 0 16px", maxWidth: 620 }}>
        These are comments writers posted on the landing page. Pinning is the only way a comment
        appears <b>above</b> the original testimonials — everything else stays below them. Hiding
        removes a comment from the public wall but keeps it here, so you can bring it back.
      </p>

      <div style={{ display: "flex", gap: 8, marginBottom: 18, flexWrap: "wrap" }}>
        {([
          ["visible", `Visible (${counts.visible})`],
          ["pinned", `Pinned (${counts.pinned})`],
          ["hidden", `Hidden (${counts.hidden})`],
        ] as const).map(([id, label]) => (
          <button
            key={id}
            onClick={() => setFilter(id)}
            style={{
              padding: "7px 14px", borderRadius: 999, cursor: "pointer",
              fontFamily: "inherit", fontSize: 12.5, fontWeight: 600,
              background: filter === id ? T.espresso : "transparent",
              color: filter === id ? "#f4efe2" : T.muted,
              border: `1px solid ${filter === id ? T.espresso : T.border}`,
            }}
          >
            {label}
          </button>
        ))}
      </div>

      {list.length === 0 ? (
        <div style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 12, padding: "28px 22px", textAlign: "center", color: T.dim, fontSize: 13.5 }}>
          Nothing here yet.
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {list.map((c) => (
            <div
              key={c.id}
              style={{
                background: T.card,
                border: `1px solid ${c.pinned ? "rgba(123,94,59,0.38)" : T.border}`,
                borderRadius: 14,
                padding: "14px 16px",
                opacity: c.hidden ? 0.65 : 1,
              }}
            >
              <div style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
                <CommentAvatar url={c.authorAvatar} name={c.authorName || c.authorEmail || "?"} size={38} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginBottom: 2 }}>
                    <span style={{ fontSize: 14, fontWeight: 700, color: T.text }}>
                      {c.authorName || "—"}
                    </span>
                    <span style={{ fontSize: 11.5, color: T.dim }}>{c.authorEmail}</span>
                    <span style={{ fontSize: 11.5, color: T.dim }}>· {timeAgo(c.createdAt, false)}</span>
                    {c.pinned && (
                      <span style={{ fontSize: 10.5, fontWeight: 700, color: "#7b5e3b", background: "rgba(123,94,59,0.12)", borderRadius: 999, padding: "2px 8px" }}>
                        PINNED
                      </span>
                    )}
                    {c.hidden && (
                      <span style={{ fontSize: 10.5, fontWeight: 700, color: T.danger, background: "rgba(161,60,44,0.10)", borderRadius: 999, padding: "2px 8px" }}>
                        HIDDEN
                      </span>
                    )}
                  </div>
                  <p style={{ fontSize: 13.5, lineHeight: 1.65, color: T.body, margin: "6px 0 12px", whiteSpace: "pre-wrap", wordBreak: "break-word" }}>
                    {c.body}
                  </p>

                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                    <ActionBtn
                      onClick={() => patch.mutate({ id: c.id, pinned: !c.pinned })}
                      icon={c.pinned ? <PinOff size={13} /> : <Pin size={13} />}
                      label={c.pinned ? "Unpin" : "Pin above testimonials"}
                    />
                    <ActionBtn
                      onClick={() => patch.mutate({ id: c.id, hidden: !c.hidden })}
                      icon={c.hidden ? <Eye size={13} /> : <EyeOff size={13} />}
                      label={c.hidden ? "Restore" : "Hide"}
                    />
                    {confirmId === c.id ? (
                      <ActionBtn
                        danger
                        onClick={() => remove.mutate(c.id)}
                        icon={<Trash2 size={13} />}
                        label="Click again to delete forever"
                      />
                    ) : (
                      <ActionBtn
                        danger
                        onClick={() => setConfirmId(c.id)}
                        icon={<Trash2 size={13} />}
                        label="Delete"
                      />
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function ActionBtn({
  onClick, icon, label, danger,
}: {
  onClick: () => void; icon: React.ReactNode; label: string; danger?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      style={{
        display: "inline-flex", alignItems: "center", gap: 6,
        padding: "6px 12px", borderRadius: 8, cursor: "pointer",
        fontFamily: "inherit", fontSize: 12, fontWeight: 600,
        background: danger ? "rgba(161,60,44,0.10)" : "rgba(66,53,33,0.06)",
        color: danger ? T.danger : T.muted,
        border: `1px solid ${danger ? "rgba(161,60,44,0.28)" : T.border}`,
      }}
    >
      {icon} {label}
    </button>
  );
}
