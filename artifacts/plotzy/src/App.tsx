import { useState, useEffect, lazy, Suspense } from "react";
import { Switch, Route, useLocation, useRoute } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { useToast } from "@/hooks/use-toast";
import { TooltipProvider } from "@/components/ui/tooltip";
import { LanguageProvider } from "@/contexts/language-context";
import { AuthProvider } from "@/contexts/auth-context";
import { ThemeProvider } from "@/components/theme-provider";
import { ProtectedRoute, AdminRoute } from "@/components/protected-route";
import { ErrorBoundary } from "@/components/error-boundary";
import NotFound from "@/pages/not-found";
import QuickDropNotepad from "@/components/QuickDropNotepad";
import MobileBlocker from "@/components/MobileBlocker";
import GoogleOneTap from "@/components/GoogleOneTap";

/* Eager: landing page (must load instantly) */
import Home from "@/pages/home";

/* Lazy: everything else (loaded on demand) */
const DashboardDemo = lazy(() => import("@/pages/dashboard-demo"));
const BookDetails = lazy(() => import("@/pages/book-details"));
const ChapterEditor = lazy(() => import("@/pages/chapter-editor"));
const CoverDesigner = lazy(() => import("@/pages/cover-designer"));
const PublishBook = lazy(() => import("@/pages/publish-book"));
const AudiobookStudio = lazy(() => import("@/pages/audiobook-studio"));
const ArticleEditor = lazy(() => import("@/pages/article-editor"));
const Trash = lazy(() => import("@/pages/trash"));
const WritingGuide = lazy(() => import("@/pages/writing-guide"));
const Pricing = lazy(() => import("@/pages/pricing"));
const SubscriptionSuccess = lazy(() => import("@/pages/subscription-success"));
const Marketplace = lazy(() => import("@/pages/marketplace"));
const Library = lazy(() => import("@/pages/library"));
const ReadBook = lazy(() => import("@/pages/read-book"));
const AuthorProfile = lazy(() => import("@/pages/author-profile"));
const SupportPage = lazy(() => import("@/pages/support"));
const AdminPage = lazy(() => import("@/pages/admin"));
const TutorialPage = lazy(() => import("@/pages/tutorial"));
const DiscoverPage = lazy(() => import("@/pages/discover"));
const GutenbergReader = lazy(() => import("@/pages/gutenberg-reader"));
const PrivacyPolicy = lazy(() => import("@/pages/privacy-policy"));
const TermsOfService = lazy(() => import("@/pages/terms-of-service"));
const Messages = lazy(() => import("@/pages/messages"));
const Blog = lazy(() => import("@/pages/blog"));
const ArticleView = lazy(() => import("@/pages/article-view"));
const SeriesView = lazy(() => import("@/pages/series-view"));
const Checkout = lazy(() => import("@/pages/checkout"));
const AccountSubscription = lazy(() => import("@/pages/account-subscription"));
const FaqPage = lazy(() => import("@/pages/faq"));

function EmailVerifyHandler() {
  const { toast } = useToast();
  const [token] = useState(() => new URLSearchParams(window.location.search).get("verify"));
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");

  useEffect(() => {
    if (!token) return;
    fetch("/api/auth/verify-email", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ token }) })
      .then(r => r.json())
      .then(d => { if (d.success) setStatus("success"); else setStatus("error"); })
      .catch(() => setStatus("error"));
  }, [token]);

  if (!token) return null;

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 99999, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(0,0,0,0.8)", padding: 24 }}>
      <div style={{ background: "#111", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 20, padding: 28, width: "100%", maxWidth: 400, textAlign: "center" }}>
        {status === "loading" && <p style={{ color: "rgba(255,255,255,0.5)" }}>Verifying...</p>}
        {status === "success" && (
          <>
            <div style={{ fontSize: 32, marginBottom: 12 }}>✓</div>
            <h3 style={{ fontSize: 18, fontWeight: 700, color: "#fff", marginBottom: 8 }}>Email verified!</h3>
            <p style={{ fontSize: 13, color: "rgba(255,255,255,0.4)", marginBottom: 20 }}>Your account is now fully activated.</p>
            <button onClick={() => { window.history.replaceState({}, "", "/"); window.location.reload(); }}
              style={{ padding: "12px 32px", borderRadius: 10, background: "#fff", color: "#000", fontSize: 14, fontWeight: 600, border: "none", cursor: "pointer" }}>Continue</button>
          </>
        )}
        {status === "error" && (
          <>
            <h3 style={{ fontSize: 18, fontWeight: 700, color: "#fff", marginBottom: 8 }}>Verification failed</h3>
            <p style={{ fontSize: 13, color: "rgba(255,255,255,0.4)", marginBottom: 20 }}>This link may have expired. Try signing in again.</p>
            <button onClick={() => { window.history.replaceState({}, "", "/"); window.location.reload(); }}
              style={{ padding: "12px 32px", borderRadius: 10, background: "#fff", color: "#000", fontSize: 14, fontWeight: 600, border: "none", cursor: "pointer" }}>Go Home</button>
          </>
        )}
      </div>
    </div>
  );
}

function LazyFallback() {
  return (
    <div style={{ minHeight: "60vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ width: 24, height: 24, border: "2px solid rgba(255,255,255,0.1)", borderTopColor: "rgba(255,255,255,0.4)", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

function ScrollToTop() {
  const [location] = useLocation();
  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: "instant" });
  }, [location]);
  return null;
}

function OAuthCallbackHandler() {
  const { toast } = useToast();
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const auth = params.get("auth");
    if (!auth) return;
    if (auth === "success") {
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
      toast({ title: "Signed in successfully", description: "Welcome to Plotzy!" });
    } else if (auth === "error") {
      toast({ title: "Sign in failed", description: "Something went wrong. Please try again.", variant: "destructive" });
    }
    const clean = new URL(window.location.href);
    clean.searchParams.delete("auth");
    clean.searchParams.delete("msg");
    window.history.replaceState({}, "", clean.pathname + (clean.search || ""));
  }, []);
  return null;
}

/** Password reset page — reached via /reset-password/:token (POST-based, token not in query string) */
function ResetPasswordPage() {
  const { toast } = useToast();
  const [, params] = useRoute("/reset-password/:token");
  const token = params?.token || "";
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [tokenValid, setTokenValid] = useState<boolean | null>(null); // null = checking
  const [, navigate] = useLocation();

  // Verify token via POST on mount (token never stays in browser history as query param)
  useEffect(() => {
    if (!token) { setTokenValid(false); return; }
    fetch("/api/auth/verify-reset-token", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ token }) })
      .then(r => r.json()).then(d => setTokenValid(!!d.valid)).catch(() => setTokenValid(false));
  }, [token]);

  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#0a0a0a", padding: 24 }}>
      <div style={{ background: "#111", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 20, padding: 28, width: "100%", maxWidth: 400 }}>
        {tokenValid === null ? (
          <div style={{ textAlign: "center", padding: "24px 0", color: "rgba(255,255,255,0.4)", fontSize: 14 }}>Verifying link...</div>
        ) : tokenValid === false ? (
          <div style={{ textAlign: "center", padding: "20px 0" }}>
            <div style={{ fontSize: 32, marginBottom: 12 }}>&#10007;</div>
            <h3 style={{ fontSize: 18, fontWeight: 700, color: "#fff", marginBottom: 8 }}>Invalid or expired link</h3>
            <p style={{ fontSize: 13, color: "rgba(255,255,255,0.4)", marginBottom: 20 }}>This password reset link has expired or already been used. Please request a new one.</p>
            <button onClick={() => navigate("/")} style={{ padding: "12px 32px", borderRadius: 10, background: "#fff", color: "#000", fontSize: 14, fontWeight: 600, border: "none", cursor: "pointer" }}>
              Back to Home
            </button>
          </div>
        ) : done ? (
          <div style={{ textAlign: "center", padding: "20px 0" }}>
            <div style={{ fontSize: 32, marginBottom: 12 }}>&#10003;</div>
            <h3 style={{ fontSize: 18, fontWeight: 700, color: "#fff", marginBottom: 8 }}>Password updated!</h3>
            <p style={{ fontSize: 13, color: "rgba(255,255,255,0.4)", marginBottom: 20 }}>You can now sign in with your new password.</p>
            <button onClick={() => navigate("/")} style={{ padding: "12px 32px", borderRadius: 10, background: "#fff", color: "#000", fontSize: 14, fontWeight: 600, border: "none", cursor: "pointer" }}>
              Sign In
            </button>
          </div>
        ) : (
          <>
            <h3 style={{ fontSize: 18, fontWeight: 700, color: "#fff", marginBottom: 6 }}>Set new password</h3>
            <p style={{ fontSize: 13, color: "rgba(255,255,255,0.4)", marginBottom: 20 }}>Enter your new password below.</p>
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="New password (min 8 characters)"
                style={{ padding: "12px 14px", borderRadius: 10, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)", color: "#fff", fontSize: 14, outline: "none" }} />
              <input type="password" value={confirm} onChange={e => setConfirm(e.target.value)} placeholder="Confirm password"
                style={{ padding: "12px 14px", borderRadius: 10, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)", color: "#fff", fontSize: 14, outline: "none" }} />
              {password && confirm && password !== confirm && <p style={{ fontSize: 12, color: "#f87171" }}>Passwords don't match</p>}
              <button disabled={loading || password.length < 8 || password !== confirm}
                onClick={async () => {
                  setLoading(true);
                  try {
                    const res = await fetch("/api/auth/reset-password", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ token, password }) });
                    const data = await res.json();
                    if (data.success) { setDone(true); }
                    else toast({ title: data.message || "Reset failed", variant: "destructive" });
                  } catch { toast({ title: "Connection error", variant: "destructive" }); }
                  finally { setLoading(false); }
                }}
                style={{ padding: "12px 0", borderRadius: 10, background: password.length >= 8 && password === confirm ? "#fff" : "rgba(255,255,255,0.06)", color: password.length >= 8 && password === confirm ? "#000" : "rgba(255,255,255,0.3)", fontSize: 14, fontWeight: 600, border: "none", cursor: "pointer", opacity: loading ? 0.5 : 1 }}>
                {loading ? "Updating..." : "Update Password"}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function Router() {
  const [location] = useLocation();
  const isFullscreen = location.startsWith("/discover/");

  return (
    <div key={location} className={isFullscreen ? "" : "page-turn-enter"}>
      <Suspense fallback={<LazyFallback />}>
      <Switch>
        {/* ── Public routes ── */}
        <Route path="/" component={Home} />
        <Route path="/reset-password/:token" component={ResetPasswordPage} />
        <Route path="/pricing" component={Pricing} />
        <Route path="/blog" component={Blog} />
        <Route path="/blog/:id" component={ArticleView} />
        <Route path="/series/:id" component={SeriesView} />
        <Route path="/library" component={Library} />
        <Route path="/read/:id" component={ReadBook} />
        <Route path="/discover" component={DiscoverPage} />
        <Route path="/discover/:id" component={GutenbergReader} />
        <Route path="/authors/:userId" component={AuthorProfile} />
        <Route path="/writing-guide" component={WritingGuide} />
        <Route path="/tutorial" component={TutorialPage} />
        <Route path="/privacy" component={PrivacyPolicy} />
        <Route path="/terms" component={TermsOfService} />
        <Route path="/faq" component={FaqPage} />
        <Route path="/marketplace" component={Marketplace} />

        {/* ── Auth-required routes ── */}
        <Route path="/dashboard" component={ProtectedRoute(DashboardDemo)} />
        <Route path="/trash" component={ProtectedRoute(Trash)} />
        <Route path="/books/:id" component={ProtectedRoute(BookDetails)} />
        <Route path="/articles/:id" component={ProtectedRoute(ArticleEditor)} />
        <Route path="/books/:bookId/chapters/:chapterId" component={ProtectedRoute(ChapterEditor)} />
        <Route path="/books/:id/cover-designer" component={ProtectedRoute(CoverDesigner)} />
        <Route path="/books/:id/find-publishers" component={ProtectedRoute(PublishBook)} />
        <Route path="/books/:id/audiobook" component={ProtectedRoute(AudiobookStudio)} />
        <Route path="/subscription/success" component={ProtectedRoute(SubscriptionSuccess)} />
        <Route path="/checkout" component={ProtectedRoute(Checkout)} />
        <Route path="/account/subscription" component={ProtectedRoute(AccountSubscription)} />
        <Route path="/support" component={ProtectedRoute(SupportPage)} />

        {/* ── Messages ── */}
        <Route path="/messages/:userId" component={ProtectedRoute(Messages)} />
        <Route path="/messages" component={ProtectedRoute(Messages)} />

        {/* ── Admin-only route ── */}
        <Route path="/admin" component={AdminRoute(AdminPage)} />

        <Route component={NotFound} />
      </Switch>
      </Suspense>
    </div>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <ThemeProvider defaultTheme="dark" attribute="class">
          <LanguageProvider>
            <AuthProvider>
              <TooltipProvider>
                <ScrollToTop />
                <OAuthCallbackHandler />
                <EmailVerifyHandler />
                <GoogleOneTap />
                <Router />
                <QuickDropNotepad />
                <Toaster />
                <MobileBlocker />
              </TooltipProvider>
            </AuthProvider>
          </LanguageProvider>
        </ThemeProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}

export default App;
