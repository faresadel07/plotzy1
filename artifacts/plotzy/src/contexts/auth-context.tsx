import { createContext, useContext, ReactNode, useCallback, useMemo, useRef } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { getQueryFn } from "@/lib/queryClient";
import { clearGuestBookIds } from "@/hooks/use-books";

interface AuthUser {
  id: number;
  email?: string | null;
  displayName?: string | null;
  avatarUrl?: string | null;
  googleId?: string | null;
  appleId?: string | null;
  subscriptionStatus?: string | null;
  subscriptionPlan?: string | null;
  subscriptionEndDate?: string | null;
  isAdmin?: boolean;
  // The /api/auth/user response includes `suspended: boolean` — we expose
  // it here so UI gates (e.g. read-only banners, locked account dialogs)
  // can check it without casting through `as any`.
  suspended?: boolean;
}

interface AuthContextValue {
  user: AuthUser | null;
  isLoading: boolean;
  refetch: () => void;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue>({
  user: null,
  isLoading: true,
  refetch: () => {},
  logout: async () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();

  const { data: user = null, isLoading, refetch } = useQuery<AuthUser | null>({
    queryKey: ["/api/auth/user"],
    queryFn: getQueryFn({ on401: "returnNull" }),
    retry: false,
    staleTime: 1000 * 60 * 5,
  });

  // Single-flight guard: rapid double-clicks on "Sign out" used to fire two
  // /api/auth/logout requests and two Google-One-Tap teardowns in parallel,
  // which interleaved with React Query cache eviction in unpredictable ways.
  // Holding the same Promise for the duration of the in-flight logout makes
  // every concurrent caller observe one consistent teardown.
  const logoutInFlightRef = useRef<Promise<void> | null>(null);
  const logout = useCallback(async () => {
    if (logoutInFlightRef.current) return logoutInFlightRef.current;
    logoutInFlightRef.current = (async () => {
      try {
        await fetch("/api/auth/logout", { method: "POST", credentials: "include" });
        // Prevent Google One Tap from silently re-authenticating the user
        // they just logged out from.
        try {
          window.google?.accounts?.id?.disableAutoSelect?.();
        } catch {}
        // SECURITY: purge any book IDs the previous session left behind so the
        // next (unauthenticated) visitor cannot request them from the backend.
        clearGuestBookIds();
        // SECURITY: nuke every cached query, not just a hand-picked list. Any
        // user-scoped query (/api/users/me/stats, /api/notifications, lore,
        // chapter snapshots, marketplace usage, admin data, …) is off-limits to
        // the next visitor on this browser — whitelisting caches is a
        // guaranteed source of leaks whenever a new query is added.
        queryClient.removeQueries();
        queryClient.setQueryData(["/api/auth/user"], null);
      } finally {
        logoutInFlightRef.current = null;
      }
    })();
    return logoutInFlightRef.current;
  }, [queryClient]);

  // Memoise the context value so every consumer only re-renders when user /
  // isLoading actually change, not on every AuthProvider re-render. Without
  // this, the `value` object was a fresh reference on every render, forcing
  // every consumer (layouts, nav, editors, dialogs…) to re-render too.
  const value = useMemo(
    () => ({ user, isLoading, refetch, logout }),
    [user, isLoading, refetch, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}
