import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, buildUrl } from "@/shared/routes";
import { type InsertChapter } from "@/shared/schema";
import { parseWithLogging } from "./use-zod-logger";

export function useChapters(bookId: number) {
  return useQuery({
    queryKey: [api.chapters.list.path, bookId],
    queryFn: async () => {
      if (!bookId) return [];
      const url = buildUrl(api.chapters.list.path, { bookId });
      const res = await fetch(url, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch chapters");
      const data = await res.json();
      return parseWithLogging(api.chapters.list.responses[200], data, "chapters.list");
    },
    enabled: !!bookId,
  });
}

export function useCreateChapter() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ bookId, ...input }: Omit<InsertChapter, "bookId"> & { bookId: number }) => {
      const url = buildUrl(api.chapters.create.path, { bookId });
      const res = await fetch(url, {
        method: api.chapters.create.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to create chapter");
      const data = await res.json();
      return parseWithLogging(api.chapters.create.responses[201], data, "chapters.create");
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: [api.chapters.list.path, variables.bookId] });
    },
  });
}

export function useUpdateChapter() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, bookId, ...updates }: { id: number; bookId: number } & Partial<InsertChapter>) => {
      const url = buildUrl(api.chapters.update.path, { id });
      const res = await fetch(url, {
        method: api.chapters.update.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to update chapter");
      const data = await res.json();
      return parseWithLogging(api.chapters.update.responses[200], data, "chapters.update");
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: [api.chapters.list.path, variables.bookId] });
    },
  });
}

export function useDeleteChapter() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, bookId }: { id: number; bookId: number }) => {
      const url = buildUrl(api.chapters.delete.path, { id });
      const res = await fetch(url, {
        method: api.chapters.delete.method,
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to delete chapter");
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: [api.chapters.list.path, variables.bookId] });
    },
  });
}

export function useReorderChapters() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ bookId, updates }: { bookId: number; updates: { id: number; order: number }[] }) => {
      const url = buildUrl(api.chapters.reorder.path, { bookId });
      const res = await fetch(url, {
        method: api.chapters.reorder.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ updates }),
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to reorder chapters");
      return res.json();
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: [api.chapters.list.path, variables.bookId] });
    },
  });
}

export function useVoiceToChapter() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ bookId, audioBase64 }: { bookId: number; audioBase64: string }) => {
      const url = buildUrl(api.chapters.voice.path, { bookId });
      const res = await fetch(url, {
        method: api.chapters.voice.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ audio: audioBase64 }),
        credentials: "include",
      });
      if (!res.ok) throw new Error("Voice transcription failed");
      const data = await res.json();
      return parseWithLogging(api.chapters.voice.responses[200], data, "chapters.voice");
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: [api.chapters.list.path, variables.bookId] });
    },
  });
}
