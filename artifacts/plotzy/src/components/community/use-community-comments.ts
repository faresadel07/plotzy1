// Data layer for the live half of the feedback wall.
//
// The curated TESTIMONIALS are static and always render first. These are
// the comments writers post themselves: admin-pinned ones are allowed
// above the curated set, everything else sits underneath, newest first.

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

export interface CommunityComment {
  id: number;
  body: string;
  pinned: boolean;
  createdAt: string;
  authorId: number;
  authorName: string | null;
  authorAvatar: string | null;
  /** Admin list only. */
  hidden?: boolean;
  authorEmail?: string | null;
}

export const COMMENTS_KEY = ["/api/community/comments"] as const;

async function readJson(res: Response) {
  const text = await res.text();
  if (!text) return null;
  try { return JSON.parse(text); } catch { return null; }
}

export function useCommunityComments() {
  return useQuery<CommunityComment[]>({
    queryKey: COMMENTS_KEY,
    queryFn: async () => {
      const res = await fetch("/api/community/comments?limit=60", { credentials: "include" });
      const data = await readJson(res);
      // The wall must never break the landing page: on any failure the
      // live half is simply empty and the curated quotes still show.
      return Array.isArray(data?.comments) ? data.comments : [];
    },
    staleTime: 60_000,
  });
}

export function usePostComment() {
  const qc = useQueryClient();
  return useMutation<CommunityComment, Error, string>({
    mutationFn: async (body: string) => {
      const res = await fetch("/api/community/comments", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body }),
      });
      const data = await readJson(res);
      if (!res.ok) throw new Error(data?.message || "Could not post your comment.");
      return data.comment as CommunityComment;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: COMMENTS_KEY }); },
  });
}

/** Split a feed into the two halves the wall renders around the curated
 *  testimonials: pinned comments go above them, the rest below. */
export function splitComments(all: CommunityComment[] | undefined) {
  const list = Array.isArray(all) ? all : [];
  return {
    pinned: list.filter((c) => c.pinned),
    rest: list.filter((c) => !c.pinned),
  };
}

/** "2 days ago" / "منذ يومين" — no date library needed for this. */
export function timeAgo(iso: string, ar: boolean): string {
  const then = new Date(iso).getTime();
  if (!Number.isFinite(then)) return "";
  const secs = Math.max(0, (Date.now() - then) / 1000);
  const mins = secs / 60, hours = mins / 60, days = hours / 24;
  if (mins < 1) return ar ? "الآن" : "just now";
  if (hours < 1) {
    const n = Math.floor(mins);
    return ar ? `قبل ${n} دقيقة` : `${n}m ago`;
  }
  if (days < 1) {
    const n = Math.floor(hours);
    return ar ? `قبل ${n} ساعة` : `${n}h ago`;
  }
  if (days < 30) {
    const n = Math.floor(days);
    return ar ? `قبل ${n} يوم` : `${n}d ago`;
  }
  return new Date(iso).toLocaleDateString(ar ? "ar" : undefined, { month: "short", day: "numeric" });
}
