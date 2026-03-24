import { useInfiniteQuery, useQuery } from "@tanstack/react-query";

export interface GutenbergBook {
  id: number;
  title: string;
  authors: string[];
  subjects: string[];
  bookshelves: string[];
  languages: string[];
  coverImage: string | null;
  readUrl: string | null;
  downloadUrl: string | null;
  pdfUrl: string | null;
  txtUrl: string | null;
  downloadCount: number;
}

interface GutenbergPage {
  count: number;
  page: number;
  hasNext: boolean;
  books: GutenbergBook[];
}

export interface GutenbergFilters {
  search?: string;
  topic?: string;
  languages?: string;
  sort?: string;
}

function transformBook(b: any): GutenbergBook {
  const formats = b.formats || {};
  const coverImage = formats["image/jpeg"] || null;
  const readUrl = formats["text/html"] || formats["text/html; charset=utf-8"] || null;
  const downloadUrl = formats["application/epub+zip"] || null;
  const pdfUrl = formats["application/pdf"] || null;
  const txtUrl = formats["text/plain"] || formats["text/plain; charset=utf-8"] || formats["text/plain; charset=us-ascii"] || null;
  const authors = (b.authors || []).map((a: any) => {
    const parts = (a.name || "").split(", ");
    return parts.length === 2 ? `${parts[1]} ${parts[0]}` : a.name;
  });
  return {
    id: b.id,
    title: b.title,
    authors,
    subjects: (b.subjects || []).slice(0, 6),
    bookshelves: (b.bookshelves || []).slice(0, 4),
    languages: b.languages || [],
    coverImage,
    readUrl,
    downloadUrl,
    pdfUrl,
    txtUrl,
    downloadCount: b.download_count || 0,
  };
}

async function fetchGutenbergBooks(page: number, filters: GutenbergFilters): Promise<GutenbergPage> {
  const params = new URLSearchParams({ page: String(page) });
  if (filters.languages) params.set("languages", filters.languages);
  if (filters.search) params.set("search", filters.search);
  if (filters.topic) params.set("topic", filters.topic);
  if (filters.sort) params.set("sort", filters.sort);

  const res = await fetch(`/api/gutenberg/books?${params.toString()}`, {
    headers: { "Accept": "application/json" },
  });
  if (!res.ok) throw new Error(`Gutenberg API responded with ${res.status}`);
  const raw = await res.json();

  return {
    count: raw.count,
    page,
    hasNext: raw.hasNext,
    books: (raw.books || []).map((b: any) => ({
      id: b.id,
      title: b.title,
      authors: b.authors || [],
      subjects: b.subjects || [],
      bookshelves: b.bookshelves || [],
      languages: b.languages || [],
      coverImage: b.coverImage || null,
      readUrl: b.readUrl || null,
      downloadUrl: b.downloadUrl || null,
      pdfUrl: b.pdfUrl || null,
      txtUrl: b.txtUrl || null,
      downloadCount: b.downloadCount || 0,
    })),
  };
}

export function useGutenbergBooks(filters: GutenbergFilters) {
  return useInfiniteQuery<GutenbergPage>({
    queryKey: ["gutenberg", filters],
    queryFn: ({ pageParam }) => fetchGutenbergBooks(pageParam as number, filters),
    initialPageParam: 1,
    getNextPageParam: (lastPage) => lastPage.hasNext ? lastPage.page + 1 : undefined,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });
}

export function useGutenbergBook(id: number | null) {
  return useQuery({
    queryKey: ["gutenberg-book", id],
    queryFn: async () => {
      const res = await fetch(`/api/gutenberg/books/${id}`, {
        headers: { "Accept": "application/json" },
      });
      if (!res.ok) throw new Error("Book not found");
      return res.json();
    },
    enabled: !!id,
    staleTime: 10 * 60 * 1000,
  });
}
