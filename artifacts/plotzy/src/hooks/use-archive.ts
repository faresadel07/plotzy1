import { useInfiniteQuery } from "@tanstack/react-query";
import { GutenbergBook } from "./use-gutenberg";

export interface ArchiveFilters {
  search?: string;
  subject?: string;
  language?: string;
  sort?: string;
}

interface ArchivePage {
  count: number;
  page: number;
  hasNext: boolean;
  books: GutenbergBook[];
}

async function fetchArchiveBooks(page: number, filters: ArchiveFilters): Promise<ArchivePage> {
  const params = new URLSearchParams({ page: String(page) });
  if (filters.search)   params.set("search",   filters.search);
  if (filters.subject)  params.set("subject",  filters.subject);
  if (filters.language) params.set("language", filters.language);
  if (filters.sort)     params.set("sort",     filters.sort);

  const res = await fetch(`/api/archive/books?${params.toString()}`, {
    headers: { "Accept": "application/json" },
  });
  if (!res.ok) throw new Error(`Archive API responded with ${res.status}`);
  return res.json();
}

export function useArchiveBooks(filters: ArchiveFilters) {
  return useInfiniteQuery<ArchivePage>({
    queryKey: ["archive", filters],
    queryFn: ({ pageParam }) => fetchArchiveBooks(pageParam as number, filters),
    initialPageParam: 1,
    getNextPageParam: (last) => last.hasNext ? last.page + 1 : undefined,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });
}
