import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, buildUrl } from "@/shared/routes";
import { type InsertBook } from "@/shared/schema";
import { parseWithLogging } from "./use-zod-logger";

// ── Guest book localStorage persistence ─────────────────────────────────────
const LS_KEY = "plotzy_guest_book_ids";

export function getGuestBookIds(): number[] {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((id: unknown) => typeof id === "number" && id > 0);
  } catch {
    return [];
  }
}

function addGuestBookId(id: number): void {
  const ids = getGuestBookIds();
  if (!ids.includes(id)) {
    localStorage.setItem(LS_KEY, JSON.stringify([...ids, id]));
  }
}

function removeGuestBookId(id: number): void {
  const ids = getGuestBookIds().filter((i) => i !== id);
  localStorage.setItem(LS_KEY, JSON.stringify(ids));
}

// Only seed IDs of actual guest books (userId === null). Seeding a signed-in
// user's book IDs used to leak them across sessions: after logout the IDs
// lingered in localStorage and the backend would happily return the books to
// the next visitor.
function seedGuestBookIds(books: { id: number; userId?: number | null }[]): void {
  const guestOnly = books.filter((b) => b.userId == null).map((b) => b.id);
  if (guestOnly.length === 0) return;
  const existing = getGuestBookIds();
  const merged = [...new Set([...existing, ...guestOnly])];
  localStorage.setItem(LS_KEY, JSON.stringify(merged));
}

export function clearGuestBookIds(): void {
  try {
    localStorage.removeItem(LS_KEY);
  } catch {}
}

// ── Hooks ────────────────────────────────────────────────────────────────────

export function useBooks() {
  return useQuery({
    queryKey: [api.books.list.path],
    queryFn: async () => {
      const guestIds = getGuestBookIds();
      const url =
        guestIds.length > 0
          ? `${api.books.list.path}?guestIds=${guestIds.join(",")}`
          : api.books.list.path;
      const res = await fetch(url, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch books");
      const data = await res.json();
      const parsed = parseWithLogging(api.books.list.responses?.[200], data, "books.list");
      // Seed localStorage with any books returned (handles first-visit bootstrap)
      if (parsed && parsed.length > 0) {
        seedGuestBookIds(parsed);
      }
      return parsed;
    },
  });
}

export function useTrashedBooks() {
  return useQuery({
    queryKey: [api.books.trashList.path],
    queryFn: async () => {
      const res = await fetch(api.books.trashList.path, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch trashed books");
      const data = await res.json();
      return parseWithLogging(api.books.trashList.responses?.[200], data, "books.trashList");
    },
  });
}

export function useBook(id: number) {
  return useQuery({
    queryKey: [api.books.get.path, id],
    queryFn: async () => {
      if (!id) return null;
      const url = buildUrl(api.books.get.path, { id });
      const res = await fetch(url, { credentials: "include" });
      if (res.status === 404) return null;
      if (!res.ok) throw new Error("Failed to fetch book");
      const data = await res.json();
      return parseWithLogging(api.books.get.responses?.[200], data, "books.get");
    },
    enabled: !!id,
  });
}

export function useCreateBook() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: InsertBook) => {
      const res = await fetch(api.books.create.path, {
        method: api.books.create.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
        credentials: "include",
      });
      if (!res.ok) {
        let msg = `Error ${res.status}`;
        try {
          const errData = await res.json();
          if (errData?.message) msg = errData.message;
        } catch {}
        throw new Error(msg);
      }
      const data = await res.json();
      return parseWithLogging(api.books.create.responses?.[201], data, "books.create");
    },
    onSuccess: (book) => {
      // Always persist to localStorage so the book survives page reloads
      addGuestBookId(book.id);
      queryClient.invalidateQueries({ queryKey: [api.books.list.path] });
    },
  });
}

export function useUpdateBook() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: { id: number } & Partial<InsertBook>) => {
      const url = buildUrl(api.books.update.path, { id });
      const res = await fetch(url, {
        method: api.books.update.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to update book");
      const data = await res.json();
      return parseWithLogging(api.books.update.responses?.[200], data, "books.update");
    },
    onSuccess: (updatedBook) => {
      queryClient.invalidateQueries({ queryKey: [api.books.list.path] });
      queryClient.invalidateQueries({ queryKey: [api.books.get.path, updatedBook.id] });
    },
  });
}

export function useTrashBook() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => {
      const url = buildUrl(api.books.trash.path, { id });
      const res = await fetch(url, {
        method: api.books.trash.method,
        headers: { "Content-Type": "application/json" },
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to trash book");
      const data = await res.json();
      return parseWithLogging(api.books.trash.responses?.[200], data, "books.trash");
    },
    onSuccess: (_, id) => {
      removeGuestBookId(id);
      queryClient.invalidateQueries({ queryKey: [api.books.list.path] });
      queryClient.invalidateQueries({ queryKey: [api.books.trashList.path] });
      queryClient.invalidateQueries({ queryKey: [api.books.get.path, id] });
    },
  });
}

export function useRestoreBook() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => {
      const url = buildUrl(api.books.restore.path, { id });
      const res = await fetch(url, {
        method: api.books.restore.method,
        headers: { "Content-Type": "application/json" },
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to restore book");
      const data = await res.json();
      return parseWithLogging(api.books.restore.responses?.[200], data, "books.restore");
    },
    onSuccess: (book, id) => {
      addGuestBookId(id);
      queryClient.invalidateQueries({ queryKey: [api.books.list.path] });
      queryClient.invalidateQueries({ queryKey: [api.books.trashList.path] });
      queryClient.invalidateQueries({ queryKey: [api.books.get.path, id] });
    },
  });
}

export function useDeleteBook() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => {
      const url = buildUrl(api.books.delete.path, { id });
      const res = await fetch(url, {
        method: api.books.delete.method,
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to delete book");
    },
    onSuccess: (_, id) => {
      removeGuestBookId(id);
      queryClient.invalidateQueries({ queryKey: [api.books.list.path] });
      queryClient.invalidateQueries({ queryKey: [api.books.trashList.path] });
      queryClient.removeQueries({ queryKey: [api.books.get.path, id] });
    },
  });
}

export function useDuplicateBook() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => {
      const res = await fetch(`/api/books/${id}/duplicate`, {
        method: "POST",
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to duplicate book");
      return res.json() as Promise<import("@/shared/schema").Book>;
    },
    onSuccess: (book) => {
      addGuestBookId(book.id);
      queryClient.invalidateQueries({ queryKey: [api.books.list.path] });
    },
  });
}

export function useGenerateCover() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, prompt, side = "front" }: { id: number; prompt: string; side?: "front" | "back" }) => {
      const url = buildUrl(api.books.generateCover.path, { id });
      const res = await fetch(url, {
        method: api.books.generateCover.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt, side }),
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to generate cover");
      const data = await res.json();
      return parseWithLogging(api.books.generateCover.responses?.[200], data, "books.generateCover");
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: [api.books.get.path, variables.id] });
      queryClient.invalidateQueries({ queryKey: [api.books.list.path] });
    },
  });
}

export function useGenerateBlurb() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, language }: { id: number; language?: string }) => {
      const url = buildUrl(api.books.generateBlurb.path, { id });
      const res = await fetch(url, {
        method: api.books.generateBlurb.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ language }),
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to generate blurb");
      const data = await res.json();
      return parseWithLogging(api.books.generateBlurb.responses?.[200], data, "books.generateBlurb");
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: [api.books.get.path, variables.id] });
      queryClient.invalidateQueries({ queryKey: [api.books.list.path] });
    },
  });
}
