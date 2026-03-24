import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { ChapterSnapshot } from "@/shared/schema";

export function useChapterVersions(chapterId: number | null) {
  return useQuery<ChapterSnapshot[]>({
    queryKey: ["chapter-snapshots", chapterId],
    queryFn: async () => {
      if (!chapterId) return [];
      const res = await fetch(`/api/chapters/${chapterId}/snapshots`);
      if (!res.ok) throw new Error("Failed to fetch versions");
      return res.json();
    },
    enabled: !!chapterId,
    staleTime: 30_000,
  });
}

export function useSaveVersion(chapterId: number | null) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ content, label }: { content: string; label?: string }) => {
      if (!chapterId) throw new Error("No chapter");
      const res = await fetch(`/api/chapters/${chapterId}/snapshots`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content, label }),
      });
      if (!res.ok) throw new Error("Failed to save version");
      return res.json() as Promise<ChapterSnapshot>;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["chapter-snapshots", chapterId] });
    },
  });
}

export function useRestoreVersion(chapterId: number | null) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (snapId: number) => {
      if (!chapterId) throw new Error("No chapter");
      const res = await fetch(`/api/chapters/${chapterId}/snapshots/${snapId}/restore`, {
        method: "POST",
      });
      if (!res.ok) throw new Error("Failed to restore version");
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["chapters"] });
      qc.invalidateQueries({ queryKey: ["chapter-snapshots", chapterId] });
    },
  });
}

export function useDeleteVersion(chapterId: number | null) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (snapId: number) => {
      if (!chapterId) throw new Error("No chapter");
      const res = await fetch(`/api/chapters/${chapterId}/snapshots/${snapId}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Failed to delete version");
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["chapter-snapshots", chapterId] });
    },
  });
}
