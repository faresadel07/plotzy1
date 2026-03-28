import { useEffect } from "react";
import { Switch, Route, useLocation } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { useToast } from "@/hooks/use-toast";
import { TooltipProvider } from "@/components/ui/tooltip";
import { LanguageProvider } from "@/contexts/language-context";
import { AuthProvider } from "@/contexts/auth-context";
import { ThemeProvider } from "@/components/theme-provider";
import NotFound from "@/pages/not-found";

import Home from "@/pages/home";
import DashboardDemo from "@/pages/dashboard-demo";
import BookDetails from "@/pages/book-details";
import ChapterEditor from "@/pages/chapter-editor";
import CoverDesigner from "@/pages/cover-designer";
import PublishBook from "@/pages/publish-book";
import AudiobookStudio from "@/pages/audiobook-studio";
import ArticleEditor from "@/pages/article-editor";
import QuickDropNotepad from "@/components/QuickDropNotepad";
import Trash from "@/pages/trash";
import WritingGuide from "@/pages/writing-guide";
import Pricing from "@/pages/pricing";
import SubscriptionSuccess from "@/pages/subscription-success";
import Marketplace from "@/pages/marketplace";
import Library from "@/pages/library";
import ReadBook from "@/pages/read-book";
import AuthorProfile from "@/pages/author-profile";
import SupportPage from "@/pages/support";
import DiscoverPage from "@/pages/discover";
import GutenbergReader from "@/pages/gutenberg-reader";
import PrivacyPolicy from "@/pages/privacy-policy";
import TermsOfService from "@/pages/terms-of-service";

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
      <Switch>
        <Route path="/" component={Home} />
        <Route path="/trash" component={Trash} />
        <Route path="/dashboard" component={DashboardDemo} />
        <Route path="/books/:id" component={BookDetails} />
        <Route path="/articles/:id" component={ArticleEditor} />
        <Route path="/books/:bookId/chapters/:chapterId" component={ChapterEditor} />
        <Route path="/books/:id/cover-designer" component={CoverDesigner} />
        <Route path="/books/:id/find-publishers" component={PublishBook} />
        <Route path="/books/:id/audiobook" component={AudiobookStudio} />
        <Route path="/writing-guide" component={WritingGuide} />
        <Route path="/pricing" component={Pricing} />
        <Route path="/subscription/success" component={SubscriptionSuccess} />
        <Route path="/marketplace" component={Marketplace} />
        <Route path="/library" component={Library} />
        <Route path="/read/:id" component={ReadBook} />
        <Route path="/discover" component={DiscoverPage} />
        <Route path="/discover/:id" component={GutenbergReader} />
        <Route path="/authors/:userId" component={AuthorProfile} />
        <Route path="/support" component={SupportPage} />
        <Route path="/privacy" component={PrivacyPolicy} />
        <Route path="/terms" component={TermsOfService} />
        <Route component={NotFound} />
      </Switch>
    </div>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider defaultTheme="light" attribute="class">
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
  );
}

export default App;
