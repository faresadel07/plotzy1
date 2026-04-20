import { createContext, useContext, ReactNode } from "react";
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

  const logout = async () => {
    await fetch("/api/auth/logout", { method: "POST", credentials: "include" });
    // Prevent Google One Tap from silently re-authenticating the user they
    // just logged out from.
    try {
      (window as any).google?.accounts?.id?.disableAutoSelect?.();
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
  };

  return (
    <AuthContext.Provider value={{ user, isLoading, refetch, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
