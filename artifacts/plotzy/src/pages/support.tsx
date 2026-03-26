import { useState, useMemo, useRef } from "react";
import { useAuth } from "@/contexts/auth-context";
import { useToast } from "@/hooks/use-toast";
import { Layout } from "@/components/layout";
import { useMutation } from "@tanstack/react-query";
import {
  ChevronDown, Search, Send, CheckCircle2, Clock, Zap,
  BookOpen, CreditCard, Shield, Cpu, Settings, Users,
  HelpCircle, MessageSquare, FileText,
  Globe, Lock, ChevronRight, Circle,
} from "lucide-react";

const SF = "-apple-system, BlinkMacSystemFont, 'SF Pro Display', 'Helvetica Neue', sans-serif";

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

const QUICK_LINKS = [
  { icon: BookOpen,   label: "Getting Started Guide",  href: "/writing-guide", desc: "Your first steps with Plotzy"    },
  { icon: Cpu,        label: "AI Assistant Docs",       href: "/writing-guide", desc: "Make the most of AI features"   },
  { icon: FileText,   label: "Cover Designer Help",     href: "/writing-guide", desc: "Create stunning book covers"    },
  { icon: CreditCard, label: "Billing & Plans",         href: "/pricing",       desc: "Pricing, refunds, and upgrades" },
  { icon: Globe,      label: "Public Domain Library",   href: "/gutenberg",     desc: "3.6M+ free books to read"       },
  { icon: Users,      label: "Community Hub",           href: "/library",       desc: "Connect with other authors"     },
];

/* ─── Sub-components ─── */
function FAQItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div
      style={{ borderBottom: "1px solid rgba(255,255,255,0.06)", cursor: "pointer" }}
      onClick={() => setOpen(o => !o)}
    >
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 0", gap: 16 }}>
        <span style={{ fontFamily: SF, fontSize: 14, fontWeight: 500, color: "rgba(255,255,255,0.88)", lineHeight: 1.5, flex: 1 }}>{q}</span>
        <ChevronDown
          size={16}
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
          paddingBottom: 18, paddingRight: 28,
        }}>
          {a}
        </div>
      )}
    </div>
  );
}

/* ─── Main ─── */
export default function SupportPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const formRef = useRef<HTMLFormElement>(null);

  const [searchQuery, setSearchQuery]   = useState("");
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [submitted, setSubmitted]       = useState(false);

  const [form, setForm] = useState({
    name:     (user as any)?.displayName || (user as any)?.username || "",
    email:    (user as any)?.email || "",
    subject:  "",
    message:  "",
    category: "general",
    priority: "normal",
  });

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

  const totalResults = filteredCategories.reduce((acc, c) => acc + c.questions.length, 0);

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

  const allOperational = SYSTEM_COMPONENTS.every(c => c.status === "operational");

  return (
    <Layout isLanding>
      <div style={{ background: "#0a0a0a", minHeight: "100vh" }}>
      <style>{`
        @keyframes fadeIn  { from { opacity:0; transform:translateY(-4px); } to { opacity:1; transform:translateY(0); } }
        @keyframes slideUp { from { opacity:0; transform:translateY(16px); } to { opacity:1; transform:translateY(0); } }
        .s-input {
          width:100%; font-family:${SF}; font-size:14px; color:rgba(255,255,255,0.88);
          background:#161616; border:1px solid rgba(255,255,255,0.1); border-radius:10px;
          padding:11px 14px; outline:none; transition:border-color 0.15s; box-sizing:border-box;
        }
        .s-input::placeholder { color:rgba(255,255,255,0.25); }
        .s-input:focus { border-color:rgba(255,255,255,0.35); }
        .s-select { appearance:none; background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%23888' stroke-width='2'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E"); background-repeat:no-repeat; background-position:right 12px center; padding-right:32px !important; cursor:pointer; }
        .s-select option { background:#1a1a1a; color:rgba(255,255,255,0.88); }
        .ql-card { transition:border-color 0.15s, transform 0.15s; }
        .ql-card:hover { border-color:rgba(255,255,255,0.2) !important; transform:translateY(-2px); }
        .cat-btn { transition:all 0.15s ease; cursor:pointer; }
        .cat-btn:hover { opacity:1 !important; }
      `}</style>

      {/* ── Hero ── */}
      <div style={{ background: "#0a0a0a", borderBottom: "1px solid rgba(255,255,255,0.07)", padding: "80px 24px 60px", textAlign: "center" }}>

        {/* Status badge */}
        <div style={{
          display: "inline-flex", alignItems: "center", gap: 7,
          background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)",
          borderRadius: 20, padding: "5px 14px", marginBottom: 28,
        }}>
          <Circle size={6} fill={allOperational ? "#4ade80" : "#fb923c"} color="transparent" />
          <span style={{ fontFamily: SF, fontSize: 12, fontWeight: 500, color: "rgba(255,255,255,0.55)", letterSpacing: "0.02em" }}>
            {allOperational ? "All Systems Operational" : "Partial Outage: We're On It"}
          </span>
        </div>

        <h1 style={{ fontFamily: SF, fontSize: 50, fontWeight: 700, color: "#fff", margin: "0 0 14px", letterSpacing: "-0.03em", lineHeight: 1.08 }}>
          How can we help?
        </h1>
        <p style={{ fontFamily: SF, fontSize: 17, color: "rgba(255,255,255,0.38)", margin: "0 auto 44px", maxWidth: 480, lineHeight: 1.65 }}>
          Search our knowledge base, browse by topic, or reach out to our support team: we're here 24/7.
        </p>

        {/* Search bar */}
        <div style={{ maxWidth: 540, margin: "0 auto", position: "relative" }}>
          <Search size={17} style={{ position: "absolute", left: 17, top: "50%", transform: "translateY(-50%)", color: "rgba(255,255,255,0.3)", pointerEvents: "none" }} />
          <input
            type="text"
            placeholder="Search questions: try 'cancel subscription' or 'AI credits'…"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            style={{
              width: "100%", fontFamily: SF, fontSize: 14.5, color: "rgba(255,255,255,0.88)",
              background: "#141414", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 13,
              padding: "14px 18px 14px 46px", outline: "none", boxSizing: "border-box",
              transition: "border-color 0.15s",
            }}
            onFocus={e => { e.target.style.borderColor = "rgba(255,255,255,0.3)"; }}
            onBlur={e => { e.target.style.borderColor = "rgba(255,255,255,0.1)"; }}
          />
          {searchQuery && (
            <button onClick={() => setSearchQuery("")} style={{ position: "absolute", right: 14, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: "rgba(255,255,255,0.3)", padding: 4, fontSize: 18, lineHeight: 1 }}>×</button>
          )}
        </div>

        {searchQuery && (
          <p style={{ fontFamily: SF, fontSize: 12.5, color: "rgba(255,255,255,0.35)", marginTop: 10 }}>
            {totalResults === 0 ? "No results: try different keywords or contact us below." : `${totalResults} result${totalResults !== 1 ? "s" : ""} found`}
          </p>
        )}
      </div>

      <div style={{ maxWidth: 1080, margin: "0 auto", padding: "0 24px 80px" }}>

        {/* ── Quick Links ── */}
        {!searchQuery && (
          <div style={{ paddingTop: 52 }}>
            <p style={{ fontFamily: SF, fontSize: 11, fontWeight: 600, color: "rgba(255,255,255,0.3)", letterSpacing: "0.08em", textTransform: "uppercase", margin: "0 0 18px" }}>Popular topics</p>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(210px, 1fr))", gap: 12 }}>
              {QUICK_LINKS.map(link => (
                <a key={link.label} href={link.href} style={{ textDecoration: "none" }}>
                  <div className="ql-card" style={{
                    background: "#111", border: "1px solid rgba(255,255,255,0.09)", borderRadius: 13,
                    padding: "18px 18px", display: "flex", alignItems: "flex-start", gap: 13,
                  }}>
                    <div style={{ width: 34, height: 34, borderRadius: 9, background: "rgba(255,255,255,0.07)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                      <link.icon size={16} color="rgba(255,255,255,0.55)" />
                    </div>
                    <div>
                      <div style={{ fontFamily: SF, fontSize: 13, fontWeight: 600, color: "rgba(255,255,255,0.88)", marginBottom: 3 }}>{link.label}</div>
                      <div style={{ fontFamily: SF, fontSize: 11.5, color: "rgba(255,255,255,0.35)", lineHeight: 1.5 }}>{link.desc}</div>
                    </div>
                  </div>
                </a>
              ))}
            </div>
          </div>
        )}

        {/* ── FAQ ── */}
        <div style={{ paddingTop: 52 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12, marginBottom: 24 }}>
            <p style={{ fontFamily: SF, fontSize: 11, fontWeight: 600, color: "rgba(255,255,255,0.3)", letterSpacing: "0.08em", textTransform: "uppercase", margin: 0 }}>Frequently Asked Questions</p>

            {!searchQuery && (
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                <button
                  className="cat-btn"
                  onClick={() => setActiveCategory(null)}
                  style={{
                    fontFamily: SF, fontSize: 12, fontWeight: 500, padding: "4px 12px", borderRadius: 20,
                    border: `1px solid ${!activeCategory ? "rgba(255,255,255,0.5)" : "rgba(255,255,255,0.1)"}`,
                    background: !activeCategory ? "rgba(255,255,255,0.1)" : "transparent",
                    color: !activeCategory ? "rgba(255,255,255,0.88)" : "rgba(255,255,255,0.4)",
                    cursor: "pointer",
                  }}
                >All</button>
                {FAQ_CATEGORIES.map(cat => (
                  <button
                    key={cat.id}
                    className="cat-btn"
                    onClick={() => setActiveCategory(activeCategory === cat.id ? null : cat.id)}
                    style={{
                      fontFamily: SF, fontSize: 12, fontWeight: 500, padding: "4px 12px", borderRadius: 20,
                      border: `1px solid ${activeCategory === cat.id ? "rgba(255,255,255,0.5)" : "rgba(255,255,255,0.1)"}`,
                      background: activeCategory === cat.id ? "rgba(255,255,255,0.1)" : "transparent",
                      color: activeCategory === cat.id ? "rgba(255,255,255,0.88)" : "rgba(255,255,255,0.4)",
                      cursor: "pointer",
                    }}
                  >{cat.label}</button>
                ))}
              </div>
            )}
          </div>

          {filteredCategories.length === 0 && searchQuery && (
            <div style={{ textAlign: "center", padding: "48px 0" }}>
              <HelpCircle size={36} style={{ color: "rgba(255,255,255,0.15)", marginBottom: 14 }} />
              <p style={{ fontFamily: SF, fontSize: 15, color: "rgba(255,255,255,0.4)", margin: "0 0 6px" }}>No results for "{searchQuery}"</p>
              <p style={{ fontFamily: SF, fontSize: 13, color: "rgba(255,255,255,0.25)" }}>Try different keywords or use the contact form below.</p>
            </div>
          )}

          <div style={{ display: "grid", gridTemplateColumns: filteredCategories.length === 1 ? "1fr" : "repeat(auto-fill, minmax(460px, 1fr))", gap: 16 }}>
            {filteredCategories.map(cat => (
              <div key={cat.id} style={{ background: "#111", border: "1px solid rgba(255,255,255,0.09)", borderRadius: 14, padding: "22px 24px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12, paddingBottom: 12, borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
                  <div style={{ width: 30, height: 30, borderRadius: 8, background: "rgba(255,255,255,0.07)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <cat.icon size={14} color="rgba(255,255,255,0.5)" />
                  </div>
                  <span style={{ fontFamily: SF, fontSize: 13, fontWeight: 600, color: "rgba(255,255,255,0.88)" }}>{cat.label}</span>
                  <span style={{ fontFamily: SF, fontSize: 11, color: "rgba(255,255,255,0.25)", marginLeft: "auto" }}>{cat.questions.length} questions</span>
                </div>
                <div>{cat.questions.map((faq, i) => <FAQItem key={i} q={faq.q} a={faq.a} />)}</div>
              </div>
            ))}
          </div>
        </div>

        {/* ── Support Promise ── */}
        <div style={{ marginTop: 48, background: "#111", border: "1px solid rgba(255,255,255,0.09)", borderRadius: 16, padding: "36px 32px" }}>
          <div style={{ marginBottom: 28 }}>
            <p style={{ fontFamily: SF, fontSize: 11, fontWeight: 600, color: "rgba(255,255,255,0.3)", letterSpacing: "0.08em", textTransform: "uppercase", margin: "0 0 6px" }}>Support Promise</p>
            <p style={{ fontFamily: SF, fontSize: 14, color: "rgba(255,255,255,0.35)", margin: 0 }}>Our commitment to response times.</p>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(190px, 1fr))", gap: 12 }}>
            {[
              { icon: Zap,          label: "Pro: Urgent", time: "< 2 hours",  desc: "Data or access issues" },
              { icon: Clock,        label: "Pro: Normal",  time: "< 8 hours",  desc: "Billing & account help" },
              { icon: MessageSquare,label: "Free: Urgent", time: "< 24 hours", desc: "Bugs and data issues"   },
              { icon: CheckCircle2, label: "Free: Normal", time: "< 48 hours", desc: "General how-to questions" },
            ].map(item => (
              <div key={item.label} style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 12, padding: "18px", textAlign: "center" }}>
                <div style={{ width: 38, height: 38, borderRadius: 10, background: "rgba(255,255,255,0.07)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 12px" }}>
                  <item.icon size={17} color="rgba(255,255,255,0.45)" />
                </div>
                <div style={{ fontFamily: SF, fontSize: 11, color: "rgba(255,255,255,0.35)", marginBottom: 4 }}>{item.label}</div>
                <div style={{ fontFamily: SF, fontSize: 20, fontWeight: 700, color: "rgba(255,255,255,0.88)", letterSpacing: "-0.02em", marginBottom: 4 }}>{item.time}</div>
                <div style={{ fontFamily: SF, fontSize: 11, color: "rgba(255,255,255,0.28)" }}>{item.desc}</div>
              </div>
            ))}
          </div>
        </div>

        {/* ── System Status ── */}
        <div style={{ marginTop: 20, background: "#111", border: "1px solid rgba(255,255,255,0.09)", borderRadius: 14, padding: "24px 28px" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 18, flexWrap: "wrap", gap: 10 }}>
            <div>
              <p style={{ fontFamily: SF, fontSize: 11, fontWeight: 600, color: "rgba(255,255,255,0.3)", letterSpacing: "0.08em", textTransform: "uppercase", margin: "0 0 3px" }}>System Status</p>
              <p style={{ fontFamily: SF, fontSize: 13, color: "rgba(255,255,255,0.3)", margin: 0 }}>Real-time status of all Plotzy services</p>
            </div>
            <div style={{ display: "inline-flex", alignItems: "center", gap: 7, background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 20, padding: "4px 12px" }}>
              <Circle size={6} fill={allOperational ? "#4ade80" : "#fb923c"} color="transparent" />
              <span style={{ fontFamily: SF, fontSize: 12, fontWeight: 500, color: "rgba(255,255,255,0.5)" }}>
                {allOperational ? "All Operational" : "Investigating"}
              </span>
            </div>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 8 }}>
            {SYSTEM_COMPONENTS.map(comp => (
              <div key={comp.name} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 12px", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 9 }}>
                <span style={{ fontFamily: SF, fontSize: 13, color: "rgba(255,255,255,0.65)" }}>{comp.name}</span>
                <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                  <Circle size={6} fill={comp.status === "operational" ? "#4ade80" : "#fb923c"} color="transparent" />
                  <span style={{ fontFamily: SF, fontSize: 11, color: "rgba(255,255,255,0.35)", fontWeight: 500, textTransform: "capitalize" }}>{comp.status}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ── Contact Form ── */}
        <div style={{ marginTop: 48, display: "grid", gridTemplateColumns: "1fr 340px", gap: 28, alignItems: "start" }}>

          {/* Form */}
          <div>
            <div style={{ marginBottom: 28 }}>
              <p style={{ fontFamily: SF, fontSize: 11, fontWeight: 600, color: "rgba(255,255,255,0.3)", letterSpacing: "0.08em", textTransform: "uppercase", margin: "0 0 8px" }}>Contact Support</p>
              <h2 style={{ fontFamily: SF, fontSize: 26, fontWeight: 700, color: "rgba(255,255,255,0.9)", margin: "0 0 8px", letterSpacing: "-0.025em" }}>Still need help?</h2>
              <p style={{ fontFamily: SF, fontSize: 14, color: "rgba(255,255,255,0.38)", margin: 0, lineHeight: 1.65 }}>
                Our support team reads every message personally. Tell us what's going on and we'll get back to you as quickly as possible.
              </p>
            </div>

            {submitted ? (
              <div style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 16, padding: "40px 36px", textAlign: "center", animation: "slideUp 0.3s ease" }}>
                <CheckCircle2 size={44} color="rgba(255,255,255,0.6)" style={{ marginBottom: 14 }} />
                <h3 style={{ fontFamily: SF, fontSize: 18, fontWeight: 700, color: "rgba(255,255,255,0.88)", margin: "0 0 8px" }}>Message sent</h3>
                <p style={{ fontFamily: SF, fontSize: 13.5, color: "rgba(255,255,255,0.4)", margin: "0 0 20px", lineHeight: 1.65 }}>
                  We've received your message and assigned it a support ticket. You'll get a confirmation email shortly.
                </p>
                <button onClick={() => setSubmitted(false)} style={{ fontFamily: SF, fontSize: 13, fontWeight: 500, color: "rgba(255,255,255,0.55)", background: "none", border: "none", cursor: "pointer" }}>
                  Send another message →
                </button>
              </div>
            ) : (
              <form ref={formRef} onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                  <div>
                    <label style={{ fontFamily: SF, fontSize: 11, fontWeight: 600, color: "rgba(255,255,255,0.3)", letterSpacing: "0.06em", textTransform: "uppercase", display: "block", marginBottom: 6 }}>Full Name</label>
                    <input className="s-input" type="text" placeholder="Your name" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} required />
                  </div>
                  <div>
                    <label style={{ fontFamily: SF, fontSize: 11, fontWeight: 600, color: "rgba(255,255,255,0.3)", letterSpacing: "0.06em", textTransform: "uppercase", display: "block", marginBottom: 6 }}>Email Address</label>
                    <input className="s-input" type="email" placeholder="you@example.com" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} required />
                  </div>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                  <div>
                    <label style={{ fontFamily: SF, fontSize: 11, fontWeight: 600, color: "rgba(255,255,255,0.3)", letterSpacing: "0.06em", textTransform: "uppercase", display: "block", marginBottom: 6 }}>Category</label>
                    <select className="s-input s-select" value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))}>
                      {CONTACT_CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                    </select>
                  </div>
                  <div>
                    <label style={{ fontFamily: SF, fontSize: 11, fontWeight: 600, color: "rgba(255,255,255,0.3)", letterSpacing: "0.06em", textTransform: "uppercase", display: "block", marginBottom: 6 }}>Priority</label>
                    <select className="s-input s-select" value={form.priority} onChange={e => setForm(f => ({ ...f, priority: e.target.value }))}>
                      {CONTACT_PRIORITIES.map(p => <option key={p.value} value={p.value}>{p.label}: {p.desc}</option>)}
                    </select>
                  </div>
                </div>
                <div>
                  <label style={{ fontFamily: SF, fontSize: 11, fontWeight: 600, color: "rgba(255,255,255,0.3)", letterSpacing: "0.06em", textTransform: "uppercase", display: "block", marginBottom: 6 }}>Subject</label>
                  <input className="s-input" type="text" placeholder="Brief description of your issue" value={form.subject} onChange={e => setForm(f => ({ ...f, subject: e.target.value }))} required />
                </div>
                <div>
                  <label style={{ fontFamily: SF, fontSize: 11, fontWeight: 600, color: "rgba(255,255,255,0.3)", letterSpacing: "0.06em", textTransform: "uppercase", display: "block", marginBottom: 6 }}>Message</label>
                  <textarea
                    className="s-input"
                    placeholder="Describe what happened, what you expected, and any steps to reproduce the issue. The more detail, the faster we can help."
                    value={form.message}
                    onChange={e => setForm(f => ({ ...f, message: e.target.value }))}
                    rows={6}
                    required
                    style={{ resize: "vertical", minHeight: 130 }}
                  />
                </div>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 10 }}>
                  <p style={{ fontFamily: SF, fontSize: 12, color: "rgba(255,255,255,0.25)", margin: 0, display: "flex", alignItems: "center", gap: 5 }}>
                    <Lock size={10} />
                    Your message is encrypted and stored securely.
                  </p>
                  <button
                    type="submit"
                    disabled={submitMutation.isPending}
                    style={{
                      fontFamily: SF, fontSize: 13.5, fontWeight: 600,
                      color: submitMutation.isPending ? "rgba(255,255,255,0.4)" : "#000",
                      background: submitMutation.isPending ? "rgba(255,255,255,0.08)" : "#fff",
                      border: "none", borderRadius: 10, padding: "11px 24px",
                      cursor: submitMutation.isPending ? "not-allowed" : "pointer",
                      display: "flex", alignItems: "center", gap: 7,
                      transition: "opacity 0.15s",
                    }}
                  >
                    {submitMutation.isPending ? (
                      <><div style={{ width: 13, height: 13, border: "2px solid rgba(255,255,255,0.2)", borderTopColor: "rgba(255,255,255,0.6)", borderRadius: "50%", animation: "spin 0.6s linear infinite" }} /> Sending…</>
                    ) : (
                      <><Send size={13} /> Send Message</>
                    )}
                  </button>
                </div>
              </form>
            )}
          </div>

          {/* Sidebar */}
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>

            {/* Response times */}
            <div style={{ background: "#111", border: "1px solid rgba(255,255,255,0.09)", borderRadius: 14, padding: "20px 22px" }}>
              <p style={{ fontFamily: SF, fontSize: 11, fontWeight: 600, color: "rgba(255,255,255,0.3)", letterSpacing: "0.07em", textTransform: "uppercase", margin: "0 0 14px" }}>Expected Response</p>
              {CONTACT_PRIORITIES.map(p => (
                <div key={p.value} style={{ display: "flex", alignItems: "center", gap: 10, padding: "9px 0", borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
                  <div style={{ width: 5, height: 5, borderRadius: "50%", background: form.priority === p.value ? "rgba(255,255,255,0.7)" : "rgba(255,255,255,0.18)", flexShrink: 0 }} />
                  <span style={{ fontFamily: SF, fontSize: 12.5, color: form.priority === p.value ? "rgba(255,255,255,0.85)" : "rgba(255,255,255,0.35)", fontWeight: form.priority === p.value ? 600 : 400, flex: 1 }}>{p.label}</span>
                  <span style={{ fontFamily: SF, fontSize: 12, fontWeight: 700, color: form.priority === p.value ? "rgba(255,255,255,0.85)" : "rgba(255,255,255,0.25)" }}>{p.time}</span>
                </div>
              ))}
            </div>

            {/* Other channels */}
            <div style={{ background: "#111", border: "1px solid rgba(255,255,255,0.09)", borderRadius: 14, padding: "20px 22px" }}>
              <p style={{ fontFamily: SF, fontSize: 11, fontWeight: 600, color: "rgba(255,255,255,0.3)", letterSpacing: "0.07em", textTransform: "uppercase", margin: "0 0 14px" }}>Other ways to get help</p>
              {[
                { icon: BookOpen, label: "Writing Guide",          desc: "Step-by-step tutorials",   href: "/writing-guide" },
                { icon: Users,    label: "Community Forum",        desc: "Ask other Plotzy authors", href: "/library"       },
                { icon: Globe,    label: "Public Domain Library",  desc: "3.6M+ free books",         href: "/gutenberg"     },
              ].map(item => (
                <a key={item.label} href={item.href} style={{ textDecoration: "none", display: "flex", alignItems: "center", gap: 12, padding: "10px 0", borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
                  <item.icon size={14} color="rgba(255,255,255,0.4)" />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontFamily: SF, fontSize: 13, fontWeight: 500, color: "rgba(255,255,255,0.75)" }}>{item.label}</div>
                    <div style={{ fontFamily: SF, fontSize: 11, color: "rgba(255,255,255,0.3)" }}>{item.desc}</div>
                  </div>
                  <ChevronRight size={13} color="rgba(255,255,255,0.2)" />
                </a>
              ))}
            </div>

            {/* Trust */}
            <div style={{ background: "#111", border: "1px solid rgba(255,255,255,0.09)", borderRadius: 14, padding: "20px 22px" }}>
              <Shield size={18} style={{ color: "rgba(255,255,255,0.45)", marginBottom: 10 }} />
              <p style={{ fontFamily: SF, fontSize: 13.5, fontWeight: 600, color: "rgba(255,255,255,0.8)", margin: "0 0 5px" }}>Your data is safe with us</p>
              <p style={{ fontFamily: SF, fontSize: 12, color: "rgba(255,255,255,0.35)", margin: 0, lineHeight: 1.65 }}>
                End-to-end encryption. SOC 2 Type II certified infrastructure. We never share your writing with anyone.
              </p>
            </div>
          </div>
        </div>

      </div>
      </div>
    </Layout>
  );
}
