import { createContext, useContext, ReactNode, useCallback, useMemo, useRef } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { getQueryFn } from "@/lib/queryClient";
import { clearGuestBookIds } from "@/hooks/use-books";

interface AuthUser {
  id: number;
  email?: string | null;
  displayName?: string | null;
  avatarUrl?: string | null;
  // Boolean flags only — the raw OAuth subject IDs are deliberately never
  // shipped to the browser. The UI just needs to know "is the provider
  // connected?" so it can render the right Connect/Disconnect button.
  hasGoogle?: boolean;
  hasApple?: boolean;
  subscriptionStatus?: string | null;
  subscriptionTier?: string | null;
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
        // ORDERING MATTERS. Update the auth observer FIRST while it is still
        // attached to its query, so AuthProvider re-renders with `user = null`
        // synchronously and every consumer (navbar, dropdown, …) flips to the
        // signed-out UI immediately, no F5 required. THEN scope the nuke to
        // every OTHER cached query — the predicate excludes the auth key so
        // the observer notification we just fired is not undone by the
        // removal that follows.
        //
        // The previous order (`removeQueries()` then `setQueryData`) detached
        // the observer for one tick, which silently dropped the update and
        // left the navbar showing the old user state until the next manual
        // refresh.
        //
        // SECURITY intent preserved: every user-scoped query
        // (/api/users/me/stats, /api/notifications, lore, chapter snapshots,
        // marketplace usage, admin data, …) is still off-limits to the next
        // visitor on this browser. Whitelisting caches is a guaranteed source
        // of leaks whenever a new query is added; the predicate keeps the
        // sweep nuclear except for the single auth row we just set to null.
        queryClient.setQueryData(["/api/auth/user"], null);
        queryClient.removeQueries({
          predicate: (q) => q.queryKey[0] !== "/api/auth/user",
        });
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
