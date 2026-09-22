import { type ComponentType, useCallback, useEffect, useRef, useState } from "react";
import { Redirect } from "wouter";
import { useAuth } from "@/contexts/auth-context";
import { Loader2 } from "lucide-react";

// ---------------------------------------------------------------------------
// ProtectedRoute — wraps a page component so it is only rendered when the
// user is authenticated.  While the auth query is in flight a centered
// spinner is shown.  Once resolved, unauthenticated users are redirected to
// the home page (where the AuthModal can be opened).
//
// Usage:
//   <Route path="/dashboard" component={ProtectedRoute(DashboardPage)} />
//
// For admin-only pages, pass { admin: true }:
//   <Route path="/admin" component={AdminRoute(AdminPage)} />
// ---------------------------------------------------------------------------

interface Options {
  /** When true the user must also be an admin */
  admin?: boolean;
}

/** Tiny re-render trigger used to close the auth grace window on time. */
function useReducerTick(): [number, () => void] {
  const [n, setN] = useState(0);
  const tick = useCallback(() => setN((v) => v + 1), []);
  return [n, tick];
}

export function ProtectedRoute<P extends object>(
  Component: ComponentType<P>,
  opts?: Options,
) {
  function Wrapper(props: P) {
    const { user, isLoading } = useAuth();

    // A transient 401 (a DB hiccup, a connection-pool timeout, a refetch
    // on window focus) used to null the cached user for a moment, and this
    // guard fired instantly — the page threw the writer back home mid-work.
    // Once a session has been seen we grant a short grace period and show a
    // spinner while the auth query settles, instead of redirecting on the
    // first blip. A real sign-out still lands on home after the grace.
    const hadSession = useRef(false);
    const graceUntil = useRef(0);
    if (user) {
      hadSession.current = true;
      graceUntil.current = Date.now() + 8000;
    }
    const inGrace = !user && hadSession.current && Date.now() < graceUntil.current;

    // Keep re-rendering while the grace window is open so the redirect
    // happens the moment it lapses rather than waiting for other state.
    const [, force] = useReducerTick();
    useEffect(() => {
      if (!inGrace) return;
      const id = setTimeout(force, 500);
      return () => clearTimeout(id);
    }, [inGrace, force]);

    if (isLoading || inGrace) {
      return (
        <div className="flex items-center justify-center min-h-screen">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      );
    }

    if (!user) {
      return <Redirect to="/" />;
    }

    if (opts?.admin && !user.isAdmin) {
      return <Redirect to="/" />;
    }

    return <Component {...props} />;
  }

  Wrapper.displayName = `ProtectedRoute(${Component.displayName || Component.name || "Component"})`;
  return Wrapper;
}

/** Shorthand for admin-only routes */
export function AdminRoute<P extends object>(Component: ComponentType<P>) {
  return ProtectedRoute(Component, { admin: true });
}
