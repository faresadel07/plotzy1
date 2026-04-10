import { type ComponentType } from "react";
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

export function ProtectedRoute<P extends object>(
  Component: ComponentType<P>,
  opts?: Options,
) {
  function Wrapper(props: P) {
    const { user, isLoading } = useAuth();

    if (isLoading) {
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
