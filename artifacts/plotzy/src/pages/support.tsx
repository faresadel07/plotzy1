import { useState, useMemo, useRef, useEffect } from "react";
import { useAuth } from "@/contexts/auth-context";
import { useToast } from "@/hooks/use-toast";
import { Layout } from "@/components/layout";
import { useMutation, useQuery } from "@tanstack/react-query";
import {
  ChevronDown, Search, Send, CheckCircle2, Clock, Zap,
  BookOpen, CreditCard, Shield, Cpu, Settings, Users,
  HelpCircle, MessageSquare, FileText,
  Globe, Lock, ChevronRight, Circle,
} from "lucide-react";

const SF = "-apple-system, BlinkMacSystemFont, 'SF Pro Text', 'Helvetica Neue', sans-serif";

/* ─── FAQ Data ─── */
const FAQ_CATEGORIES = [
  {
    id: "getting-started",
    label: "Getting Started",
    icon: BookOpen,
    questions: [
      { q: "How do I create my first book on Plotzy?", a: "Click the '+' button on your Library page and choose whether you want to write a Book or an Article. Give it a title, pick a genre, and your writing workspace opens immediately. Your work is saved automatically every few seconds: you never have to worry about losing progress." },
      { q: "Is Plotzy free to use?", a: "Yes: Plotzy's core writing tools are completely free with no time limit. You can create books, chapters, and articles, use the in-app reader, and access the Public Domain Library at no cost. Our Pro plan unlocks advanced AI features, the 3D Cover Designer, priority support, and more." },
      { q: "Do I need to create an account to start writing?", a: "You can browse the platform without an account, but to save your writing, access all features, and sync across devices you'll need a free Plotzy account. Sign-up takes under 30 seconds: just an email and password." },
      { q: "Can I import an existing manuscript from Word or Google Docs?", a: "Yes. Inside any book's settings you'll find an Import option that accepts .docx and .txt files. The system automatically splits your document into chapters based on your headings. We're actively building PDF import as well." },
      { q: "How do I organize my chapters?", a: "Your Chapter Manager uses a Scrivener-style drag-and-drop board. You can reorder chapters by dragging, set a status (Draft / Revised / Final) for each, add private author notes, and see a live word count per chapter." },
    ],
  },
  {
    id: "writing-ai",
    label: "AI Writing Assistant",
    icon: Cpu,
    questions: [
      { q: "What can the AI Writing Assistant do?", a: "The AI is embedded directly in your chapter editor and can: detect plot holes and logical inconsistencies, coach your dialogue for natural flow, analyze your pacing and suggest improvements, check character voice consistency across chapters, generate scene outlines, and suggest next-paragraph continuations: all without leaving your editor." },
      { q: "How many AI requests do I get per month?", a: "Free accounts receive 20 AI requests per month. Pro subscribers get 500 monthly requests, and annual Pro subscribers get unlimited AI usage. Requests reset on the 1st of each month." },
      { q: "Does the AI have access to my full book, or just the current chapter?", a: "For context-aware features like character consistency and plot hole detection, the AI reads your full book outline and chapter summaries (not raw text) to give smarter, more accurate feedback. For inline suggestions, it reads the current chapter only." },
      { q: "Can the AI write content for me?", a: "The AI can suggest continuations and generate scene starters, but it's designed as a co-pilot, not a ghost-writer. It's tuned to amplify your voice rather than replace it. All suggestions are marked clearly and require your approval before they're added to your manuscript." },
      { q: "Is my writing data used to train AI models?", a: "Never. Your manuscripts are processed in real-time for the feature you're using and are never stored by our AI provider or used for model training. We have a strict zero-retention agreement in place." },
    ],
  },
  {
    id: "cover-publishing",
    label: "Cover & Publishing",
    icon: FileText,
    questions: [
      { q: "How does the 3D Cover Designer work?", a: "The Cover Designer is a browser-based studio where you can upload a background image or choose a gradient, add titles and author name with live typography controls, edit the spine text, and preview your cover as a fully rotatable 3D book. You can export your cover as a high-resolution PNG ready for print or digital distribution." },
      { q: "Can I generate a book cover using AI?", a: "Yes: there's an 'AI Generate' button in the Cover Designer. You describe the mood, genre, and key elements of your cover and Plotzy produces a unique cover image. Pro users get 10 AI cover generations per month." },
      { q: "How do I publish my book to the Plotzy Marketplace?", a: "Open your book, go to the Publish tab, fill in your book description, set a price (or mark it Free), upload your cover, add genre tags, and click Publish. Your book goes live in the Marketplace immediately after a quick automated content check." },
      { q: "What percentage of sales do I keep?", a: "Authors keep 85% of every sale. Plotzy retains a 15% platform fee which covers payment processing, hosting, and ongoing platform development. There are no listing fees or upfront costs." },
      { q: "Can I set my book as 'Free' in the Marketplace?", a: "Absolutely. Setting a price of $0 lists your book as free for all readers. Many authors use this to build their audience before releasing paid sequels." },
    ],
  },
  {
    id: "billing",
    label: "Billing & Subscription",
    icon: CreditCard,
    questions: [
      { q: "What does Plotzy Pro include?", a: "Pro includes: 500 monthly AI requests (unlimited on annual plan), AI cover generation (10/month), priority 2-hour support response, advanced export formats (EPUB, MOBI, PDF), writing streak analytics, early access to new features, and a Pro badge on your author profile." },
      { q: "Can I cancel my Pro subscription at any time?", a: "Yes: cancel from Account Settings > Subscription with one click. You keep Pro access until the end of your current billing period. We don't charge cancellation fees and there's no lock-in." },
      { q: "Do you offer refunds?", a: "We offer a full refund within 7 days of any purchase if you're not satisfied. For annual subscriptions, we'll prorate the unused months if you cancel after the 7-day window. Contact support with your order details and we'll process it within 24 hours." },
      { q: "Is my payment information secure?", a: "All payments are processed by Stripe: we never store your card number on our servers. Stripe is PCI-DSS Level 1 certified, the highest level of payment security available." },
      { q: "Do you offer student or non-profit discounts?", a: "Yes: we offer 50% off for verified students and 30% off for registered non-profit organizations. Email us from your institutional address with a brief description and we'll set up your discounted account within 24 hours." },
    ],
  },
  {
    id: "account",
    label: "Account & Privacy",
    icon: Shield,
    questions: [
      { q: "How is my writing data stored and protected?", a: "All your data is stored in encrypted PostgreSQL databases hosted on infrastructure with SOC 2 Type II certification. Data is backed up every 6 hours with 30-day retention. All data in transit uses TLS 1.3." },
      { q: "Can I export all my data and writing?", a: "Yes: go to Account Settings > Data & Privacy > Export My Data. You'll receive a downloadable archive (ZIP) containing all your books in EPUB and plain text format, your profile data, and a full activity log. Export is processed within minutes." },
      { q: "How do I delete my account?", a: "Account Settings > Danger Zone > Delete Account. This permanently removes all your writing, profile data, and purchase history from our systems. Published marketplace books will be delisted. This action cannot be undone: we recommend exporting your data first." },
      { q: "Can I change my email address or username?", a: "Yes: Account Settings > Profile. Email changes require verification from both the old and new address. Display name changes take effect immediately and can be changed once every 30 days." },
      { q: "Who can see my books and writing?", a: "Your books are private by default: only you can see them. Books you publish to the Marketplace become publicly visible. You can toggle any book's visibility at any time from its settings." },
    ],
  },
  {
    id: "technical",
    label: "Technical Issues",
    icon: Settings,
    questions: [
      { q: "Which browsers does Plotzy support?", a: "Plotzy works best on Chrome 90+, Safari 15+, Firefox 88+, and Edge 90+. The 3D Cover Designer requires WebGL support (enabled by default in all modern browsers). Internet Explorer is not supported." },
      { q: "Does Plotzy work offline?", a: "The editor has a local draft buffer: if you lose internet while writing, your changes are saved locally and synced when your connection returns. Full offline mode (browsing your library without internet) is on our roadmap for Q3 2025." },
      { q: "My chapter isn't saving. What should I do?", a: "First check your internet connection. The editor shows a green 'Saved' indicator when synced and an orange 'Saving…' when a sync is in progress. If you see a red 'Save failed' indicator, try refreshing the page: unsaved content will be recovered from the local buffer. If the problem persists, contact support with your book and chapter ID." },
      { q: "The page is loading slowly or freezing. What can I do?", a: "Try: (1) Hard refresh (Ctrl+Shift+R / Cmd+Shift+R), (2) Clearing your browser cache, (3) Disabling browser extensions one by one, (4) Switching to a different browser. If your book has 50+ chapters, the chapter list may render slowly: we're actively optimizing this." },
      { q: "How do I report a bug?", a: "Use the contact form on this page and select 'Bug Report' as the category. Please include: what you were trying to do, what happened instead, your browser and OS, and if possible a screenshot. We triage bug reports within 4 hours." },
    ],
  },
  {
    id: "community",
    label: "Community & Marketplace",
    icon: Users,
    questions: [
      { q: "What is the Plotzy Community?", a: "The Community page is a social reading and discovery space where authors share their work, readers leave reviews, and writing groups connect. You can follow authors, add books to your reading list, and see what people in your network are writing." },
      { q: "How do reader reviews and ratings work?", a: "Readers who have purchased or downloaded a book can leave a 1–5 star rating and a written review. Authors can respond to reviews publicly. Reviews are moderated for spam and hate speech within 24 hours of submission." },
      { q: "Can I request a feature or suggest improvements?", a: "Yes: we have a public feature request board linked from the Community page where you can submit, vote on, and comment on feature ideas. Our product team reviews the top-voted requests every two weeks." },
    ],
  },
];

const SYSTEM_COMPONENTS = [
  { name: "Writing Editor",        status: "operational" },
  { name: "AI Assistant",          status: "operational" },
  { name: "File Exports",          status: "operational" },
  { name: "Marketplace",           status: "operational" },
  { name: "Public Domain Library", status: "operational" },
  { name: "Authentication",        status: "operational" },
];

const CONTACT_CATEGORIES = [
  { value: "general",  label: "General Question" },
  { value: "bug",      label: "Bug Report" },
  { value: "billing",  label: "Billing & Subscription" },
  { value: "account",  label: "Account Issue" },
  { value: "feature",  label: "Feature Request" },
  { value: "privacy",  label: "Privacy & Data" },
  { value: "other",    label: "Other" },
];

const CONTACT_PRIORITIES = [
  { value: "low",    label: "Low",    desc: "General question",      time: "< 48h" },
  { value: "normal", label: "Normal", desc: "Need help soon",        time: "< 24h" },
  { value: "high",   label: "High",   desc: "Blocking my work",      time: "< 8h"  },
  { value: "urgent", label: "Urgent", desc: "Complete data loss",    time: "< 2h"  },
];

/* ─── Sub-components ─── */

function FAQItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div
      style={{ borderBottom: "1px solid rgba(255,255,255,0.06)", cursor: "pointer" }}
      onClick={() => setOpen(o => !o)}
    >
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 0", gap: 16 }}>
        <span style={{ fontFamily: SF, fontSize: 14, fontWeight: 500, color: "rgba(255,255,255,0.88)", lineHeight: 1.5, flex: 1 }}>{q}</span>
        <ChevronDown
          size={15}
          style={{
            color: "rgba(255,255,255,0.3)",
            flexShrink: 0,
            transform: open ? "rotate(180deg)" : "rotate(0deg)",
            transition: "transform 0.2s ease",
          }}
        />
      </div>
      {open && (
        <div style={{
          fontFamily: SF, fontSize: 13.5, color: "rgba(255,255,255,0.5)", lineHeight: 1.8,
          paddingBottom: 16, paddingRight: 28,
        }}>
          {a}
        </div>
      )}
    </div>
  );
}

type Tab = "faq" | "contact" | "tickets";

const TABS: { id: Tab; label: string; icon: typeof HelpCircle }[] = [
  { id: "faq", label: "FAQ", icon: HelpCircle },
  { id: "contact", label: "Contact", icon: MessageSquare },
  { id: "tickets", label: "My Tickets", icon: FileText },
];

const PRIORITY_COLORS: Record<string, string> = {
  low: "#6b7280",
  normal: "#3b82f6",
  high: "#f59e0b",
  urgent: "#ef4444",
};

const STATUS_COLORS: Record<string, string> = {
  open: "#4ade80",
  closed: "#6b7280",
  pending: "#f59e0b",
};

/* ─── Main ─── */
export default function SupportPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const formRef = useRef<HTMLFormElement>(null);

  const [activeTab, setActiveTab] = useState<Tab>("faq");
  const [searchQuery, setSearchQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState("getting-started");
  const [submitted, setSubmitted] = useState(false);

  const [form, setForm] = useState({
    name:     (user as any)?.displayName || (user as any)?.username || "",
    email:    (user as any)?.email || "",
    subject:  "",
    message:  "",
    category: "general",
    priority: "normal",
  });

  // Auto-fill when user loads
  useEffect(() => {
    if (user) {
      setForm(f => ({
        ...f,
        name: (user as any)?.displayName || (user as any)?.username || f.name,
        email: (user as any)?.email || f.email,
      }));
    }
  }, [user]);

  const filteredCategories = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    if (!q && !activeCategory) return FAQ_CATEGORIES;
    return FAQ_CATEGORIES
      .filter(cat => !activeCategory || cat.id === activeCategory)
      .map(cat => ({
        ...cat,
        questions: q
          ? cat.questions.filter(faq => faq.q.toLowerCase().includes(q) || faq.a.toLowerCase().includes(q))
          : cat.questions,
      }))
      .filter(cat => cat.questions.length > 0);
  }, [searchQuery, activeCategory]);

  // When searching, show across all categories
  const searchResults = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return null;
    return FAQ_CATEGORIES
      .map(cat => ({
        ...cat,
        questions: cat.questions.filter(faq => faq.q.toLowerCase().includes(q) || faq.a.toLowerCase().includes(q)),
      }))
      .filter(cat => cat.questions.length > 0);
  }, [searchQuery]);

  const totalResults = searchResults
    ? searchResults.reduce((acc, c) => acc + c.questions.length, 0)
    : 0;

  const submitMutation = useMutation({
    mutationFn: async (data: typeof form) => {
      const res = await fetch("/api/support/messages", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data), credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to submit");
      return res.json();
    },
    onSuccess: () => {
      setSubmitted(true);
      setForm({ name: "", email: "", subject: "", message: "", category: "general", priority: "normal" });
    },
    onError: () => {
      toast({ title: "Something went wrong", description: "Please try again or email us directly.", variant: "destructive" });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim() || !form.email.trim() || !form.subject.trim() || !form.message.trim()) {
      toast({ title: "Please fill in all fields", variant: "destructive" });
      return;
    }
    submitMutation.mutate(form);
  };

  // Tickets query
  const ticketsQuery = useQuery({
    queryKey: ["my-tickets"],
    queryFn: async () => {
      const res = await fetch("/api/support/my-tickets", { credentials: "include" });
      if (res.status === 404) return [];
      if (!res.ok) throw new Error("Failed to fetch tickets");
      return res.json();
    },
    enabled: activeTab === "tickets",
    retry: false,
  });

  const allOperational = SYSTEM_COMPONENTS.every(c => c.status === "operational");

  return (
    <Layout isLanding darkNav>
      <div style={{ background: "#000", minHeight: "100vh" }}>
      <style>{`
        @keyframes fadeIn  { from { opacity:0; transform:translateY(-4px); } to { opacity:1; transform:translateY(0); } }
        @keyframes slideUp { from { opacity:0; transform:translateY(12px); } to { opacity:1; transform:translateY(0); } }
        @keyframes spin { to { transform:rotate(360deg); } }
        .s-input {
          width:100%; font-family:${SF}; font-size:14px; color:rgba(255,255,255,0.88);
          background:#111; border:1px solid rgba(255,255,255,0.07); border-radius:8px;
          padding:10px 14px; outline:none; transition:border-color 0.15s; box-sizing:border-box;
        }
        .s-input::placeholder { color:rgba(255,255,255,0.25); }
        .s-input:focus { border-color:rgba(255,255,255,0.25); }
        .s-select { appearance:none; background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%23888' stroke-width='2'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E"); background-repeat:no-repeat; background-position:right 12px center; padding-right:32px !important; cursor:pointer; }
        .s-select option { background:#111; color:rgba(255,255,255,0.88); }
        .cat-pill { transition:all 0.15s ease; cursor:pointer; border:none; outline:none; }
        .cat-pill:hover { background:rgba(255,255,255,0.08) !important; }
        .tab-btn { transition:all 0.15s ease; cursor:pointer; border:none; outline:none; }
        .tab-btn:hover { color:rgba(255,255,255,0.8) !important; }
      `}</style>

      {/* ── Compact Hero ── */}
      <div style={{
        background: "#000",
        borderBottom: "1px solid rgba(255,255,255,0.07)",
        padding: "48px 24px 40px",
        textAlign: "center",
      }}>
        {/* Status badge */}
        <div style={{
          display: "inline-flex", alignItems: "center", gap: 6,
          background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)",
          borderRadius: 20, padding: "4px 12px", marginBottom: 20,
        }}>
          <Circle size={5} fill={allOperational ? "#4ade80" : "#fb923c"} color="transparent" />
          <span style={{ fontFamily: SF, fontSize: 11, fontWeight: 500, color: "rgba(255,255,255,0.45)", letterSpacing: "0.02em" }}>
            {allOperational ? "All Systems Operational" : "Partial Outage"}
          </span>
        </div>

        <h1 style={{
          fontFamily: SF, fontSize: 40, fontWeight: 700, color: "#fff",
          margin: "0 0 10px", letterSpacing: "-0.03em", lineHeight: 1.1,
        }}>
          Help Center
        </h1>
        <p style={{
          fontFamily: SF, fontSize: 15, color: "rgba(255,255,255,0.35)",
          margin: "0 auto 28px", maxWidth: 420, lineHeight: 1.6,
        }}>
          Search our knowledge base, browse by topic, or reach out directly.
        </p>

        {/* Search bar */}
        <div style={{ maxWidth: 480, margin: "0 auto", position: "relative" }}>
          <Search size={16} style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", color: "rgba(255,255,255,0.25)", pointerEvents: "none" }} />
          <input
            type="text"
            placeholder="Search questions..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            style={{
              width: "100%", fontFamily: SF, fontSize: 14, color: "rgba(255,255,255,0.88)",
              background: "#111", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 10,
              padding: "12px 16px 12px 40px", outline: "none", boxSizing: "border-box",
              transition: "border-color 0.15s",
            }}
            onFocus={e => { e.target.style.borderColor = "rgba(255,255,255,0.2)"; }}
            onBlur={e => { e.target.style.borderColor = "rgba(255,255,255,0.07)"; }}
          />
          {searchQuery && (
            <button onClick={() => setSearchQuery("")} style={{
              position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)",
              background: "none", border: "none", cursor: "pointer",
              color: "rgba(255,255,255,0.3)", padding: 4, fontSize: 16, lineHeight: 1,
            }}>
              x
            </button>
          )}
        </div>

        {searchQuery && (
          <p style={{ fontFamily: SF, fontSize: 12, color: "rgba(255,255,255,0.3)", marginTop: 8 }}>
            {totalResults === 0 ? "No results found. Try different keywords or contact us." : `${totalResults} result${totalResults !== 1 ? "s" : ""} found`}
          </p>
        )}
      </div>

      {/* ── Tab Navigation ── */}
      <div style={{
        borderBottom: "1px solid rgba(255,255,255,0.07)",
        background: "#000",
      }}>
        <div style={{
          maxWidth: 900, margin: "0 auto", padding: "0 24px",
          display: "flex", gap: 0,
        }}>
          {TABS.map(tab => {
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                className="tab-btn"
                onClick={() => { setActiveTab(tab.id); setSearchQuery(""); }}
                style={{
                  fontFamily: SF, fontSize: 13, fontWeight: 500,
                  color: active ? "rgba(255,255,255,0.9)" : "rgba(255,255,255,0.35)",
                  background: "transparent",
                  padding: "14px 20px",
                  borderBottom: active ? "2px solid #fff" : "2px solid transparent",
                  display: "flex", alignItems: "center", gap: 7,
                  marginBottom: -1,
                }}
              >
                <tab.icon size={14} />
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Content ── */}
      <div style={{ maxWidth: 900, margin: "0 auto", padding: "24px clamp(14px, 4vw, 24px) 48px" }}>

        {/* ========== FAQ TAB ========== */}
        {activeTab === "faq" && (
          <div style={{ display: "flex", gap: 32, animation: "fadeIn 0.2s ease" }}>
            {/* Left sidebar: category pills */}
            {!searchQuery && (
              <div style={{
                width: 200, flexShrink: 0,
                display: "flex", flexDirection: "column", gap: 2,
                position: "sticky", top: 80, alignSelf: "flex-start",
              }}>
                {FAQ_CATEGORIES.map(cat => {
                  const active = activeCategory === cat.id;
                  return (
                    <button
                      key={cat.id}
                      className="cat-pill"
                      onClick={() => setActiveCategory(cat.id)}
                      style={{
                        fontFamily: SF, fontSize: 13, fontWeight: active ? 600 : 400,
                        color: active ? "rgba(255,255,255,0.95)" : "rgba(255,255,255,0.4)",
                        background: active ? "rgba(255,255,255,0.08)" : "transparent",
                        borderRadius: 8, padding: "9px 14px",
                        textAlign: "left",
                        display: "flex", alignItems: "center", gap: 10,
                      }}
                    >
                      <cat.icon size={14} style={{ opacity: active ? 0.9 : 0.4, flexShrink: 0 }} />
                      {cat.label}
                    </button>
                  );
                })}
              </div>
            )}

            {/* Right side: questions */}
            <div style={{ flex: 1, minWidth: 0 }}>
              {searchQuery && searchResults ? (
                // Search mode: show results across all categories
                searchResults.length === 0 ? (
                  <div style={{ textAlign: "center", padding: "48px 0" }}>
                    <HelpCircle size={32} style={{ color: "rgba(255,255,255,0.12)", marginBottom: 12 }} />
                    <p style={{ fontFamily: SF, fontSize: 15, color: "rgba(255,255,255,0.4)", margin: "0 0 6px" }}>
                      No results for "{searchQuery}"
                    </p>
                    <p style={{ fontFamily: SF, fontSize: 13, color: "rgba(255,255,255,0.25)" }}>
                      Try different keywords or use the Contact tab.
                    </p>
                  </div>
                ) : (
                  searchResults.map(cat => (
                    <div key={cat.id} style={{ marginBottom: 24 }}>
                      <div style={{
                        display: "flex", alignItems: "center", gap: 8,
                        marginBottom: 8, padding: "0 0 8px",
                        borderBottom: "1px solid rgba(255,255,255,0.06)",
                      }}>
                        <cat.icon size={13} color="rgba(255,255,255,0.35)" />
                        <span style={{ fontFamily: SF, fontSize: 12, fontWeight: 600, color: "rgba(255,255,255,0.45)", letterSpacing: "0.02em" }}>
                          {cat.label}
                        </span>
                      </div>
                      {cat.questions.map((faq, i) => <FAQItem key={i} q={faq.q} a={faq.a} />)}
                    </div>
                  ))
                )
              ) : (
                // Category mode
                filteredCategories.map(cat => (
                  <div key={cat.id}>
                    <div style={{
                      display: "flex", alignItems: "center", gap: 8,
                      marginBottom: 4,
                    }}>
                      <span style={{
                        fontFamily: SF, fontSize: 11, fontWeight: 600,
                        color: "rgba(255,255,255,0.3)", letterSpacing: "0.06em",
                        textTransform: "uppercase",
                      }}>
                        {cat.label}
                      </span>
                      <span style={{ fontFamily: SF, fontSize: 11, color: "rgba(255,255,255,0.18)" }}>
                        {cat.questions.length} questions
                      </span>
                    </div>
                    {cat.questions.map((faq, i) => <FAQItem key={i} q={faq.q} a={faq.a} />)}
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* ========== CONTACT TAB ========== */}
        {activeTab === "contact" && (
          <div style={{ maxWidth: 560, margin: "0 auto", animation: "fadeIn 0.2s ease" }}>
            {submitted ? (
              <div style={{
                background: "#111", border: "1px solid rgba(255,255,255,0.07)",
                borderRadius: 14, padding: "48px 36px", textAlign: "center",
                animation: "slideUp 0.3s ease",
              }}>
                <CheckCircle2 size={40} color="#4ade80" style={{ marginBottom: 14 }} />
                <h3 style={{ fontFamily: SF, fontSize: 18, fontWeight: 700, color: "rgba(255,255,255,0.9)", margin: "0 0 8px" }}>
                  Message sent
                </h3>
                <p style={{ fontFamily: SF, fontSize: 13.5, color: "rgba(255,255,255,0.4)", margin: "0 0 24px", lineHeight: 1.65 }}>
                  We have received your message and will respond as soon as possible. Check your email for a confirmation.
                </p>
                <button
                  onClick={() => setSubmitted(false)}
                  style={{
                    fontFamily: SF, fontSize: 13, fontWeight: 500,
                    color: "rgba(255,255,255,0.55)", background: "rgba(255,255,255,0.06)",
                    border: "1px solid rgba(255,255,255,0.07)", borderRadius: 8,
                    padding: "8px 18px", cursor: "pointer",
                  }}
                >
                  Send another message
                </button>
              </div>
            ) : (
              <>
                <div style={{ marginBottom: 24 }}>
                  <h2 style={{
                    fontFamily: SF, fontSize: 22, fontWeight: 700,
                    color: "rgba(255,255,255,0.9)", margin: "0 0 6px",
                    letterSpacing: "-0.02em",
                  }}>
                    Contact Support
                  </h2>
                  <p style={{ fontFamily: SF, fontSize: 14, color: "rgba(255,255,255,0.35)", margin: 0, lineHeight: 1.6 }}>
                    Our team reads every message and typically responds within 24 hours.
                  </p>
                </div>

                <form ref={formRef} onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                  <div className="support-two-col" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                    <div>
                      <label style={{ fontFamily: SF, fontSize: 12, fontWeight: 500, color: "rgba(255,255,255,0.4)", display: "block", marginBottom: 6 }}>Name</label>
                      <input className="s-input" type="text" placeholder="Your name" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} required />
                    </div>
                    <div>
                      <label style={{ fontFamily: SF, fontSize: 12, fontWeight: 500, color: "rgba(255,255,255,0.4)", display: "block", marginBottom: 6 }}>Email</label>
                      <input className="s-input" type="email" placeholder="you@example.com" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} required />
                    </div>
                  </div>
                  <div>
                    <label style={{ fontFamily: SF, fontSize: 12, fontWeight: 500, color: "rgba(255,255,255,0.4)", display: "block", marginBottom: 6 }}>Subject</label>
                    <input className="s-input" type="text" placeholder="Brief description of your issue" value={form.subject} onChange={e => setForm(f => ({ ...f, subject: e.target.value }))} required />
                  </div>
                  <div className="support-two-col" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                    <div>
                      <label style={{ fontFamily: SF, fontSize: 12, fontWeight: 500, color: "rgba(255,255,255,0.4)", display: "block", marginBottom: 6 }}>Category</label>
                      <select className="s-input s-select" value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))}>
                        {CONTACT_CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                      </select>
                    </div>
                    <div>
                      <label style={{ fontFamily: SF, fontSize: 12, fontWeight: 500, color: "rgba(255,255,255,0.4)", display: "block", marginBottom: 6 }}>Priority</label>
                      <select className="s-input s-select" value={form.priority} onChange={e => setForm(f => ({ ...f, priority: e.target.value }))}>
                        {CONTACT_PRIORITIES.map(p => <option key={p.value} value={p.value}>{p.label}: {p.desc}</option>)}
                      </select>
                    </div>
                  </div>
                  <div>
                    <label style={{ fontFamily: SF, fontSize: 12, fontWeight: 500, color: "rgba(255,255,255,0.4)", display: "block", marginBottom: 6 }}>Message</label>
                    <textarea
                      className="s-input"
                      placeholder="Describe what happened, what you expected, and any steps to reproduce..."
                      value={form.message}
                      onChange={e => setForm(f => ({ ...f, message: e.target.value }))}
                      rows={5}
                      required
                      style={{ resize: "vertical", minHeight: 120 }}
                    />
                  </div>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, marginTop: 4 }}>
                    <p style={{ fontFamily: SF, fontSize: 11, color: "rgba(255,255,255,0.2)", margin: 0, display: "flex", alignItems: "center", gap: 5 }}>
                      <Lock size={10} />
                      Encrypted and stored securely.
                    </p>
                    <button
                      type="submit"
                      disabled={submitMutation.isPending}
                      style={{
                        fontFamily: SF, fontSize: 13, fontWeight: 600,
                        color: submitMutation.isPending ? "rgba(255,255,255,0.4)" : "#000",
                        background: submitMutation.isPending ? "rgba(255,255,255,0.08)" : "#fff",
                        border: "none", borderRadius: 8, padding: "10px 22px",
                        cursor: submitMutation.isPending ? "not-allowed" : "pointer",
                        display: "flex", alignItems: "center", gap: 7,
                        transition: "opacity 0.15s",
                      }}
                    >
                      {submitMutation.isPending ? (
                        <><div style={{ width: 12, height: 12, border: "2px solid rgba(255,255,255,0.2)", borderTopColor: "rgba(255,255,255,0.6)", borderRadius: "50%", animation: "spin 0.6s linear infinite" }} /> Sending...</>
                      ) : (
                        <><Send size={12} /> Send Message</>
                      )}
                    </button>
                  </div>
                </form>
              </>
            )}
          </div>
        )}

        {/* ========== MY TICKETS TAB ========== */}
        {activeTab === "tickets" && (
          <div style={{ maxWidth: 640, margin: "0 auto", animation: "fadeIn 0.2s ease" }}>
            <div style={{ marginBottom: 24 }}>
              <h2 style={{
                fontFamily: SF, fontSize: 22, fontWeight: 700,
                color: "rgba(255,255,255,0.9)", margin: "0 0 6px",
                letterSpacing: "-0.02em",
              }}>
                My Tickets
              </h2>
              <p style={{ fontFamily: SF, fontSize: 14, color: "rgba(255,255,255,0.35)", margin: 0, lineHeight: 1.6 }}>
                Track the status of your support requests.
              </p>
            </div>

            {ticketsQuery.isLoading && (
              <div style={{ textAlign: "center", padding: "48px 0" }}>
                <div style={{
                  width: 20, height: 20,
                  border: "2px solid rgba(255,255,255,0.1)",
                  borderTopColor: "rgba(255,255,255,0.4)",
                  borderRadius: "50%", animation: "spin 0.6s linear infinite",
                  margin: "0 auto 12px",
                }} />
                <p style={{ fontFamily: SF, fontSize: 13, color: "rgba(255,255,255,0.3)" }}>Loading tickets...</p>
              </div>
            )}

            {ticketsQuery.isError || (ticketsQuery.data && ticketsQuery.data.length === 0) ? (
              <div style={{
                background: "#111", border: "1px solid rgba(255,255,255,0.07)",
                borderRadius: 12, padding: "48px 24px", textAlign: "center",
              }}>
                <MessageSquare size={28} style={{ color: "rgba(255,255,255,0.12)", marginBottom: 12 }} />
                <p style={{ fontFamily: SF, fontSize: 15, fontWeight: 500, color: "rgba(255,255,255,0.45)", margin: "0 0 6px" }}>
                  No tickets yet
                </p>
                <p style={{ fontFamily: SF, fontSize: 13, color: "rgba(255,255,255,0.25)", margin: "0 0 20px" }}>
                  When you contact support, your tickets will appear here.
                </p>
                <button
                  onClick={() => setActiveTab("contact")}
                  style={{
                    fontFamily: SF, fontSize: 13, fontWeight: 500,
                    color: "rgba(255,255,255,0.7)", background: "rgba(255,255,255,0.06)",
                    border: "1px solid rgba(255,255,255,0.07)", borderRadius: 8,
                    padding: "8px 18px", cursor: "pointer",
                  }}
                >
                  Contact Support
                </button>
              </div>
            ) : null}

            {ticketsQuery.data && ticketsQuery.data.length > 0 && (
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {ticketsQuery.data.map((ticket: any) => (
                  <div key={ticket.id || ticket._id} style={{
                    background: "#111", border: "1px solid rgba(255,255,255,0.07)",
                    borderRadius: 10, padding: "16px 20px",
                  }}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, marginBottom: 8 }}>
                      <span style={{ fontFamily: SF, fontSize: 14, fontWeight: 600, color: "rgba(255,255,255,0.88)", flex: 1 }}>
                        {ticket.subject}
                      </span>
                      <span style={{
                        fontFamily: SF, fontSize: 11, fontWeight: 600,
                        color: STATUS_COLORS[ticket.status] || "#6b7280",
                        background: `${STATUS_COLORS[ticket.status] || "#6b7280"}18`,
                        padding: "3px 10px", borderRadius: 12,
                        textTransform: "capitalize",
                      }}>
                        {ticket.status}
                      </span>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
                      {ticket.category && (
                        <span style={{ fontFamily: SF, fontSize: 11, color: "rgba(255,255,255,0.35)" }}>
                          {ticket.category}
                        </span>
                      )}
                      {ticket.priority && (
                        <span style={{
                          fontFamily: SF, fontSize: 11, fontWeight: 500,
                          color: PRIORITY_COLORS[ticket.priority] || "rgba(255,255,255,0.35)",
                        }}>
                          {ticket.priority} priority
                        </span>
                      )}
                      {ticket.createdAt && (
                        <span style={{ fontFamily: SF, fontSize: 11, color: "rgba(255,255,255,0.2)" }}>
                          {new Date(ticket.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                        </span>
                      )}
                    </div>
                    {ticket.reply && (
                      <div style={{
                        marginTop: 12, paddingTop: 12,
                        borderTop: "1px solid rgba(255,255,255,0.06)",
                      }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 6 }}>
                          <MessageSquare size={11} color="rgba(255,255,255,0.3)" />
                          <span style={{ fontFamily: SF, fontSize: 11, fontWeight: 600, color: "rgba(255,255,255,0.35)" }}>
                            Admin Reply
                          </span>
                        </div>
                        <p style={{ fontFamily: SF, fontSize: 13, color: "rgba(255,255,255,0.55)", margin: 0, lineHeight: 1.6 }}>
                          {ticket.reply}
                        </p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Compact System Status Bar ── */}
      <div style={{
        borderTop: "1px solid rgba(255,255,255,0.07)",
        background: "#000",
        padding: "16px 24px",
      }}>
        <div style={{
          maxWidth: 900, margin: "0 auto",
          display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <Circle size={5} fill={allOperational ? "#4ade80" : "#fb923c"} color="transparent" />
            <span style={{ fontFamily: SF, fontSize: 12, fontWeight: 600, color: "rgba(255,255,255,0.4)" }}>
              {allOperational ? "All Systems Operational" : "Partial Outage"}
            </span>
          </div>
          <div style={{ width: 1, height: 14, background: "rgba(255,255,255,0.07)" }} />
          {SYSTEM_COMPONENTS.map(comp => (
            <div key={comp.name} style={{ display: "flex", alignItems: "center", gap: 5 }}>
              <Circle size={4} fill={comp.status === "operational" ? "#4ade80" : "#fb923c"} color="transparent" />
              <span style={{ fontFamily: SF, fontSize: 11, color: "rgba(255,255,255,0.3)" }}>
                {comp.name}
              </span>
            </div>
          ))}
        </div>
      </div>

      </div>
    </Layout>
  );
}
