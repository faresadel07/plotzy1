import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/shared/routes";
import { getGuestBookIds } from "@/hooks/use-books";

export type PublishedBook = {
  id: number;
  userId: number | null;
  title: string;
  coverImage: string | null;
  spineColor: string | null;
  summary: string | null;
  authorName: string | null;
  genre: string | null;
  isPublished: boolean;
  publishedAt: string | null;
  viewCount: number;
  contentType: string | null;
  language: string | null;
  authorDisplayName: string | null;
  authorAvatarUrl: string | null;
  featured?: boolean;
};

export type PublishedChapter = {
  id: number;
  bookId: number;
  title: string;
  content: string;
  order: number;
  createdAt: string | null;
};

export type RatingStats = { avg: number; count: number };

export type BookComment = {
  id: number;
  bookId: number;
  userId: number | null;
  authorName: string;
  content: string;
  createdAt: string | null;
};

export function useFeaturedBook() {
  return useQuery<PublishedBook>({
    queryKey: ["/api/public/books/featured"],
    queryFn: async () => {
      const res = await fetch("/api/public/books/featured");
      if (!res.ok) throw new Error("No featured book");
      return res.json();
    },
    retry: false,
  });
}

export function useSetFeaturedBook() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ bookId, feature }: { bookId: number; feature: boolean }) => {
      const res = await fetch(`/api/admin/books/${bookId}/feature`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ feature }),
        credentials: "include",
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || "Failed to update featured status");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/public/books/featured"] });
      queryClient.invalidateQueries({ queryKey: ["/api/public/books"] });
    },
  });
}

export function useAdminDeleteBook() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (bookId: number) => {
      const res = await fetch(`/api/admin/books/${bookId}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || "Failed to delete book");
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/public/books"] });
      queryClient.invalidateQueries({ queryKey: ["/api/public/books/featured"] });
    },
  });
}

export function usePublishedBooks() {
  return useQuery<PublishedBook[]>({
    queryKey: ["/api/public/books"],
    queryFn: async () => {
      const res = await fetch("/api/public/books");
      if (!res.ok) throw new Error("Failed to fetch published books");
      return res.json();
    },
  });
}

export function usePublishedBook(id: number) {
  return useQuery<PublishedBook>({
    queryKey: ["/api/public/books", id],
    queryFn: async () => {
      const res = await fetch(`/api/public/books/${id}`);
      if (!res.ok) throw new Error("Book not found");
      return res.json();
    },
    enabled: !!id,
  });
}

export function usePublishedBookChapters(bookId: number) {
  return useQuery<PublishedChapter[]>({
    queryKey: ["/api/public/books", bookId, "chapters"],
    queryFn: async () => {
      const res = await fetch(`/api/public/books/${bookId}/chapters`);
      if (!res.ok) throw new Error("Failed to fetch chapters");
      return res.json();
    },
    enabled: !!bookId,
  });
}

export function useIncrementBookView() {
  return useMutation({
    mutationFn: async (bookId: number) => {
      await fetch(`/api/public/books/${bookId}/view`, { method: "POST" });
    },
  });
}

export function usePublishBook() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, publish }: { id: number; publish: boolean }) => {
      const guestIds = getGuestBookIds();
      const res = await fetch(`/api/books/${id}/publish`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ publish, guestIds }),
        credentials: "include",
      });
      if (!res.ok) {
        const err = await res.json();
        const error: any = new Error(err.message || "Failed to update publish status");
        error.status = res.status;
        throw error;
      }
      return res.json();
    },
    onSuccess: (_data, { id }) => {
      queryClient.invalidateQueries({ queryKey: ["/api/books"] });
      queryClient.invalidateQueries({ queryKey: [api.books.get.path, id] });
      queryClient.invalidateQueries({ queryKey: ["/api/public/books"] });
    },
  });
}

export function useBookRatingStats(bookId: number) {
  return useQuery<RatingStats>({
    queryKey: ["/api/public/books", bookId, "ratings"],
    queryFn: async () => {
      const res = await fetch(`/api/public/books/${bookId}/ratings`);
      if (!res.ok) return { avg: 0, count: 0 };
      return res.json();
    },
    enabled: !!bookId,
  });
}

export function useRateBook() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ bookId, rating }: { bookId: number; rating: number }) => {
      const res = await fetch(`/api/public/books/${bookId}/rate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rating }),
      });
      if (!res.ok) throw new Error("Failed to rate");
      return res.json();
    },
    onSuccess: (_data, { bookId }) => {
      queryClient.invalidateQueries({ queryKey: ["/api/public/books", bookId, "ratings"] });
    },
  });
}

export function useBookComments(bookId: number) {
  return useQuery<BookComment[]>({
    queryKey: ["/api/public/books", bookId, "comments"],
    queryFn: async () => {
      const res = await fetch(`/api/public/books/${bookId}/comments`);
      if (!res.ok) throw new Error("Failed to fetch comments");
      return res.json();
    },
    enabled: !!bookId,
  });
}

export function useAddBookComment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ bookId, content, authorName }: { bookId: number; content: string; authorName?: string }) => {
      const res = await fetch(`/api/public/books/${bookId}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content, authorName }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || "Failed to post comment");
      }
      return res.json();
    },
    onSuccess: (_data, { bookId }) => {
      queryClient.invalidateQueries({ queryKey: ["/api/public/books", bookId, "comments"] });
    },
  });
}
