import { useEffect } from "react";
import { Switch, Route, useLocation } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
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

function ScrollToTop() {
  const [location] = useLocation();
  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: "instant" });
  }, [location]);
  return null;
}

function Router() {
  const [location] = useLocation();

  return (
    <div key={location} className="page-turn-enter">
      <Switch>
        <Route path="/" component={Home} />
        <Route path="/trash" component={Trash} />
        <Route path="/dashboard" component={DashboardDemo} />
        <Route path="/books/:id" component={BookDetails} />
        <Route path="/articles/:id" component={ArticleEditor} />
        <Route path="/books/:bookId/chapters/:chapterId" component={ChapterEditor} />
        <Route path="/books/:id/cover-designer" component={CoverDesigner} />
        <Route path="/books/:id/find-publishers" component={PublishBook} />
        <Route path="/writing-guide" component={WritingGuide} />
        <Route path="/pricing" component={Pricing} />
        <Route path="/subscription/success" component={SubscriptionSuccess} />
        <Route path="/marketplace" component={Marketplace} />
        <Route path="/library" component={Library} />
        <Route path="/read/:id" component={ReadBook} />
        <Route path="/authors/:userId" component={AuthorProfile} />
        <Route path="/support" component={SupportPage} />
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
