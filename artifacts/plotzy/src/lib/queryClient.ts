import { QueryClient, QueryFunction } from "@tanstack/react-query";

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    if (res.status === 429) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data.message || "Too many requests. Please wait a moment and try again.");
    }
    const text = (await res.text()) || res.statusText;
    throw new Error(`${res.status}: ${text}`);
  }
}

export async function apiRequest(
  method: string,
  url: string,
  data?: unknown | undefined,
): Promise<Response> {
  const res = await fetch(url, {
    method,
    headers: data ? { "Content-Type": "application/json" } : {},
    body: data ? JSON.stringify(data) : undefined,
    credentials: "include",
  });

  await throwIfResNotOk(res);
  return res;
}

type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    const res = await fetch(queryKey.join("/") as string, {
      credentials: "include",
    });

    if (unauthorizedBehavior === "returnNull" && res.status === 401) {
      return null;
    }

    await throwIfResNotOk(res);
    return await res.json();
  };

/**
 * useQuery options builder for course endpoints that support `?lang=`.
 * Adds `{ lang }` to the queryKey for per-language cache separation
 * (so toggling language auto-refetches), and a custom queryFn that
 * appends the `?lang=` query string when the user is on a non-English
 * UI. Invalidation by the path prefix still works:
 *   queryClient.invalidateQueries({ queryKey: ["/api/course/lessons", slug] })
 * matches both `[path, slug, { lang: "en" }]` and `[path, slug, { lang: "ar" }]`.
 */
export function courseQueryOpts(pathParts: (string | number)[], lang: string) {
  const path = pathParts.join("/");
  const url = lang && lang !== "en" ? `${path}?lang=${lang}` : path;
  return {
    queryKey: [...pathParts, { lang }] as const,
    queryFn: async () => {
      const res = await fetch(url, { credentials: "include" });
      await throwIfResNotOk(res);
      return res.json();
    },
  };
}

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "throw" }),
      refetchInterval: false,
      refetchOnWindowFocus: true,
      staleTime: 5 * 60 * 1000,
      gcTime: 10 * 60 * 1000,
      retry: 2,
    },
    mutations: {
      retry: 1,
    },
  },
});
