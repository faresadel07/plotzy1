// React-Query hooks for the Submission Tracker.
//
// Two surfaces consume these:
//   - The "My Submissions" tab in the Find Publishers page (full
//     dashboard with sort, status filter, follow-up reminders).
//   - The per-publisher / per-agent detail card ("Track this
//     submission" button + status badge if already tracked).

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

// ── Types (shape mirrors the API responses) ────────────────────────

export type SubmissionStatus =
  | "draft"
  | "submitted"
  | "rejected"
  | "accepted"
  | "withdrawn"
  | "no_response";

export interface SubmissionMaterials {
  queryLetter?: string;
  synopsis?: string;
  samplePages?: string;
  bio?: string;
}

export interface Submission {
  id: number;
  userId: number;
  bookId: number;
  recipientKey: string;
  recipientName: string;
  status: SubmissionStatus;
  submittedAt: string | null;
  respondedAt: string | null;
  followUpAt: string | null;
  notes: string | null;
  materials: SubmissionMaterials | null;
  createdAt: string;
  updatedAt: string;
}

export interface SubmissionStats {
  total: number;
  drafts: number;
  pending: number;
  rejected: number;
  accepted: number;
  withdrawn: number;
  noResponse: number;
  avgResponseDays: number | null;
}

export interface SavedPublisher {
  id: number;
  userId: number;
  recipientKey: string;
  notes: string | null;
  createdAt: string;
}

// ── Submissions ────────────────────────────────────────────────────

export function useSubmissions(bookId?: number) {
  return useQuery<Submission[]>({
    queryKey: ["/api/submissions", bookId ?? null],
    queryFn: async () => {
      const url = bookId ? `/api/submissions?bookId=${bookId}` : "/api/submissions";
      const r = await fetch(url, { credentials: "include" });
      if (!r.ok) throw new Error("Failed to load submissions");
      return r.json();
    },
    staleTime: 30 * 1000,
  });
}

export function useSubmissionStats() {
  return useQuery<SubmissionStats>({
    queryKey: ["/api/submissions/stats"],
    queryFn: async () => {
      const r = await fetch("/api/submissions/stats", { credentials: "include" });
      if (!r.ok) throw new Error("Failed to load stats");
      return r.json();
    },
    staleTime: 60 * 1000,
  });
}

export interface CreateSubmissionInput {
  bookId: number;
  recipientKey: string;
  recipientName: string;
  status?: SubmissionStatus;
  submittedAt?: string | null;
  followUpAt?: string | null;
  notes?: string | null;
  materials?: SubmissionMaterials;
}

export function useCreateSubmission() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: CreateSubmissionInput) => {
      const r = await fetch("/api/submissions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(input),
      });
      if (!r.ok) throw new Error(`Failed to create submission (${r.status})`);
      return r.json() as Promise<Submission>;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/submissions"] });
      qc.invalidateQueries({ queryKey: ["/api/submissions/stats"] });
    },
  });
}

export interface UpdateSubmissionInput {
  id: number;
  recipientName?: string;
  status?: SubmissionStatus;
  submittedAt?: string | null;
  respondedAt?: string | null;
  followUpAt?: string | null;
  notes?: string | null;
  materials?: SubmissionMaterials;
}

export function useUpdateSubmission() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...rest }: UpdateSubmissionInput) => {
      const r = await fetch(`/api/submissions/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(rest),
      });
      if (!r.ok) throw new Error(`Failed to update submission (${r.status})`);
      return r.json() as Promise<Submission>;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/submissions"] });
      qc.invalidateQueries({ queryKey: ["/api/submissions/stats"] });
    },
  });
}

export function useDeleteSubmission() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => {
      const r = await fetch(`/api/submissions/${id}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (!r.ok) throw new Error(`Failed to delete submission (${r.status})`);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/submissions"] });
      qc.invalidateQueries({ queryKey: ["/api/submissions/stats"] });
    },
  });
}

// ── Saved publishers (bookmarks) ───────────────────────────────────

export function useSavedPublishers() {
  return useQuery<SavedPublisher[]>({
    queryKey: ["/api/saved-publishers"],
    queryFn: async () => {
      const r = await fetch("/api/saved-publishers", { credentials: "include" });
      if (!r.ok) throw new Error("Failed to load saved publishers");
      return r.json();
    },
    staleTime: 60 * 1000,
  });
}

export function useSavePublisher() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { recipientKey: string; notes?: string | null }) => {
      const r = await fetch("/api/saved-publishers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(input),
      });
      if (!r.ok) throw new Error(`Failed to save publisher (${r.status})`);
      return r.json() as Promise<SavedPublisher>;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/saved-publishers"] });
    },
  });
}

export function useUnsavePublisher() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (recipientKey: string) => {
      const r = await fetch(`/api/saved-publishers/${encodeURIComponent(recipientKey)}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (!r.ok) throw new Error(`Failed to unsave (${r.status})`);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/saved-publishers"] });
    },
  });
}

// ── Helpers ────────────────────────────────────────────────────────

/** Pretty-print status for badges. */
export function statusLabel(status: SubmissionStatus, ar = false): string {
  if (ar) {
    return ({
      draft: "مسوّدة",
      submitted: "في الانتظار",
      rejected: "مرفوض",
      accepted: "مقبول",
      withdrawn: "مسحوب",
      no_response: "بلا ردّ",
    } as const)[status];
  }
  return ({
    draft: "Draft",
    submitted: "Pending",
    rejected: "Rejected",
    accepted: "Accepted",
    withdrawn: "Withdrawn",
    no_response: "No Response",
  } as const)[status];
}

/** Tailwind-like colour pair for each status badge. */
export function statusColors(status: SubmissionStatus): { bg: string; fg: string; border: string } {
  switch (status) {
    case "draft":
      return { bg: "rgba(255,255,255,0.06)", fg: "rgba(255,255,255,0.55)", border: "rgba(255,255,255,0.12)" };
    case "submitted":
      return { bg: "rgba(96,165,250,0.10)", fg: "#60a5fa", border: "rgba(96,165,250,0.25)" };
    case "rejected":
      return { bg: "rgba(248,113,113,0.10)", fg: "#fca5a5", border: "rgba(248,113,113,0.25)" };
    case "accepted":
      return { bg: "rgba(74,222,128,0.10)", fg: "#86efac", border: "rgba(74,222,128,0.25)" };
    case "withdrawn":
      return { bg: "rgba(168,162,158,0.10)", fg: "#a8a29e", border: "rgba(168,162,158,0.25)" };
    case "no_response":
      return { bg: "rgba(251,191,36,0.10)", fg: "#fcd34d", border: "rgba(251,191,36,0.25)" };
  }
}

/** Number of days between two ISO timestamps (rounded). */
export function daysBetween(a: string | null, b: string | null): number | null {
  if (!a || !b) return null;
  const ms = new Date(b).getTime() - new Date(a).getTime();
  if (Number.isNaN(ms)) return null;
  return Math.round(ms / 86_400_000);
}
