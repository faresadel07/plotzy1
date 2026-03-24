import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { ResearchItem } from "@/shared/schema";

const KEY = (bookId: number) => ["research", bookId];

export function useResearchItems(bookId: number) {
  return useQuery<ResearchItem[]>({
    queryKey: KEY(bookId),
    queryFn: async () => {
      const res = await fetch(`/api/books/${bookId}/research`);
      if (!res.ok) throw new Error("Failed to fetch research items");
      return res.json();
    },
    staleTime: 30_000,
  });
}

export function useCreateResearchItem(bookId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: {
      type: string;
      title?: string;
      content?: string;
      previewImageUrl?: string;
      description?: string;
      color?: string;
    }) => {
      const res = await fetch(`/api/books/${bookId}/research`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed to create item");
      return res.json() as Promise<ResearchItem>;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY(bookId) }),
  });
}

export function useUpdateResearchItem(bookId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...data }: { id: number; title?: string; content?: string; color?: string }) => {
      const res = await fetch(`/api/books/${bookId}/research/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed to update item");
      return res.json() as Promise<ResearchItem>;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY(bookId) }),
  });
}

export function useDeleteResearchItem(bookId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => {
      const res = await fetch(`/api/books/${bookId}/research/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete item");
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY(bookId) }),
  });
}

export async function fetchUrlPreview(url: string) {
  const res = await fetch("/api/fetch-url-preview", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ url }),
  });
  if (!res.ok) throw new Error("Failed to fetch preview");
  return res.json() as Promise<{ title: string; description: string; image: string; favicon: string; url: string }>;
}
