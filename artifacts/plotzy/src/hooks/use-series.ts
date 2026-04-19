import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

export type SeriesBook = {
  id: number;
  title: string;
  coverImage?: string | null;
  spineColor?: string | null;
  genre?: string | null;
  seriesOrder?: number | null;
  contentType?: string | null;
};

export type BookSeriesWithBooks = {
  id: number;
  userId: number;
  name: string;
  description?: string | null;
  coverImage?: string | null;
  isPublished?: boolean;
  publishedAt?: string | null;
  createdAt?: string | null;
  books: SeriesBook[];
  stats?: {
    totalChapters: number;
    totalWords: number;
    totalWordGoal: number;
  };
};

const SERIES_KEY = "/api/series";

export function useSeries() {
  return useQuery<BookSeriesWithBooks[]>({
    queryKey: [SERIES_KEY],
    queryFn: async () => {
      const res = await fetch(SERIES_KEY, { credentials: "include" });
      if (res.status === 401) return [];
      if (!res.ok) throw new Error("Failed to fetch series");
      return res.json();
    },
  });
}

export function useCreateSeries() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: { name: string; description?: string }) => {
      const res = await fetch(SERIES_KEY, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to create series");
      return res.json() as Promise<BookSeriesWithBooks>;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: [SERIES_KEY] }),
  });
}

export function useUpdateSeries() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...data }: { id: number; name?: string; description?: string }) => {
      const res = await fetch(`${SERIES_KEY}/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to update series");
      return res.json();
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: [SERIES_KEY] }),
  });
}

export function useDeleteSeries() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => {
      const res = await fetch(`${SERIES_KEY}/${id}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to delete series");
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [SERIES_KEY] });
      qc.invalidateQueries({ queryKey: ["/api/books"] });
    },
  });
}

export function useAddBookToSeries() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ seriesId, bookId }: { seriesId: number; bookId: number }) => {
      const res = await fetch(`${SERIES_KEY}/${seriesId}/books/${bookId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to add book to series");
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [SERIES_KEY] });
      qc.invalidateQueries({ queryKey: ["/api/books"] });
    },
  });
}

export function useRemoveBookFromSeries() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ seriesId, bookId }: { seriesId: number; bookId: number }) => {
      const res = await fetch(`${SERIES_KEY}/${seriesId}/books/${bookId}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to remove book from series");
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [SERIES_KEY] });
      qc.invalidateQueries({ queryKey: ["/api/books"] });
    },
  });
}

export function usePublishSeries() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, publish }: { id: number; publish: boolean }) => {
      const res = await fetch(`${SERIES_KEY}/${id}/publish`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ publish }),
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to publish");
      return res.json();
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: [SERIES_KEY] }),
  });
}

export function useReorderSeriesBooks() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ seriesId, order }: { seriesId: number; order: number[] }) => {
      const res = await fetch(`${SERIES_KEY}/${seriesId}/reorder`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ order }),
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to reorder");
      return res.json();
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: [SERIES_KEY] }),
  });
}
