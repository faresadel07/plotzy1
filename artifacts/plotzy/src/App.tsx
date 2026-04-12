import { useEffect, lazy, Suspense } from "react";
import { Switch, Route, useLocation } from "wouter";
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

function Router() {
  const [location] = useLocation();
  const isFullscreen = location.startsWith("/discover/");

  return (
    <div key={location} className={isFullscreen ? "" : "page-turn-enter"}>
      <Suspense fallback={<LazyFallback />}>
      <Switch>
        {/* ── Public routes ── */}
        <Route path="/" component={Home} />
        <Route path="/pricing" component={Pricing} />
        <Route path="/library" component={Library} />
        <Route path="/read/:id" component={ReadBook} />
        <Route path="/discover" component={DiscoverPage} />
        <Route path="/discover/:id" component={GutenbergReader} />
        <Route path="/authors/:userId" component={AuthorProfile} />
        <Route path="/writing-guide" component={WritingGuide} />
        <Route path="/tutorial" component={TutorialPage} />
        <Route path="/privacy" component={PrivacyPolicy} />
        <Route path="/terms" component={TermsOfService} />
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
                <Router />
                <QuickDropNotepad />
                <Toaster />
              </TooltipProvider>
            </AuthProvider>
          </LanguageProvider>
        </ThemeProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}

export default App;
