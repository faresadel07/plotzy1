import { useState, useRef, useCallback } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Link } from "wouter";
import { Layout } from "@/components/layout";
import {
  BookOpen, Pen, CheckCircle, Palette, Megaphone, Brain,
  Zap, Clock, FileText, MessageSquare, Globe, Search, X,
  ArrowLeft, Upload, ChevronRight, ChevronLeft, Sparkles, Check, ArrowRight, Library,
} from "lucide-react";
import { useBooks } from "@/hooks/use-books";

/* ─── Types & static data ─────────────────────────────────── */

type Category = "all" | "editing" | "design" | "marketing" | "analysis";

interface AIService {
  id: string;
  category: Category;
  icon: React.ReactNode;
  name: string;
  tagline: string;
  description: string;
  features: string[];
  delivery: string;
  badge?: string;
}

const SERVICES: AIService[] = [
  {
    id: "dev-editor", category: "editing",
    icon: <BookOpen className="w-5 h-5" />,
    name: "AI Developmental Editor",
    tagline: "Full manuscript structure analysis",
    description: "Reads your entire manuscript and delivers a professional editorial report covering story arc, pacing, character development, and plot holes.",
    features: ["Chapter-by-chapter pacing analysis", "Character arc & motivation review", "Plot hole detection report"],
    delivery: "~3 min", badge: "Most Used",
  },
  {
    id: "copy-editor", category: "editing",
    icon: <Pen className="w-5 h-5" />,
    name: "AI Copy Editor",
    tagline: "Grammar, style & voice consistency",
    description: "Deep grammar, style, and voice consistency pass that preserves your unique voice while eliminating repetition and awkward phrasing.",
    features: ["Grammar & punctuation correction", "Voice consistency analysis", "Repetition & redundancy flagging"],
    delivery: "~2 min",
  },
  {
    id: "proofreader", category: "editing",
    icon: <CheckCircle className="w-5 h-5" />,
    name: "AI Proofreader",
    tagline: "Final polish before publishing",
    description: "Final-pass proofreading that catches spelling errors, punctuation issues, and typos that slip past grammar checkers.",
    features: ["Spelling & typo detection", "Punctuation consistency check", "Formatting error scan"],
    delivery: "~1 min",
  },
  {
    id: "cover-generator", category: "design",
    icon: <Palette className="w-5 h-5" />,
    name: "AI Cover Generator",
    tagline: "Professional covers from your blurb",
    description: "Generates 4 professionally composed book covers based on your genre, title, and synopsis — following publishing industry standards.",
    features: ["4 unique cover concepts", "Genre-appropriate styling", "High-res export (3000×4500 px)"],
    delivery: "~45 sec", badge: "Popular",
  },
  {
    id: "blurb-writer", category: "marketing",
    icon: <FileText className="w-5 h-5" />,
    name: "AI Book Blurb Writer",
    tagline: "Back cover copy that sells",
    description: "Crafts compelling back-cover blurbs and Amazon descriptions optimized for your genre's conventions and reader expectations.",
    features: ["3 blurb variations", "Genre-specific tone & hooks", "Amazon & back-cover formats"],
    delivery: "~30 sec",
  },
  {
    id: "query-letter", category: "marketing",
    icon: <Megaphone className="w-5 h-5" />,
    name: "AI Query Letter",
    tagline: "Pitch agents & publishers",
    description: "Writes a professional query letter tailored to literary agents following industry-standard format with a compelling hook and synopsis.",
    features: ["Agent-ready query format", "Personalized hook paragraph", "Comp titles suggestions"],
    delivery: "~45 sec",
  },
  {
    id: "beta-reader", category: "analysis",
    icon: <MessageSquare className="w-5 h-5" />,
    name: "AI Beta Reader",
    tagline: "Simulated reader feedback",
    description: "Simulates 5 different reader personas going through your manuscript and provides detailed feedback on what resonated and what confused.",
    features: ["5 reader persona perspectives", "Emotional impact mapping", "Page-turn prediction score"],
    delivery: "~5 min", badge: "New",
  },
  {
    id: "social-kit", category: "marketing",
    icon: <Globe className="w-5 h-5" />,
    name: "AI Social Media Kit",
    tagline: "Launch your book online",
    description: "Generates a complete social media launch package: Instagram captions, Twitter/X threads, BookTok hooks, and a launch email.",
    features: ["30 ready-to-post captions", "Launch email sequence", "Hashtag research report"],
    delivery: "~1 min",
  },
  {
    id: "sensitivity-reader", category: "analysis",
    icon: <Brain className="w-5 h-5" />,
    name: "AI Sensitivity Reader",
    tagline: "Inclusive & respectful storytelling",
    description: "Reviews your manuscript for cultural representation issues, stereotype patterns, and potentially harmful language with suggested rewrites.",
    features: ["Flagged passages with context", "Suggested rewrites", "Representation score report"],
    delivery: "~4 min",
  },
];

const CATEGORIES: { id: Category; label: string }[] = [
  { id: "all", label: "All" },
  { id: "editing", label: "Editing" },
  { id: "design", label: "Design" },
  { id: "marketing", label: "Marketing" },
  { id: "analysis", label: "Analysis" },
];

/* ─── Launch Modal ────────────────────────────────────────── */

type ModalStep = "service" | "upload" | "processing" | "done";

function LaunchModal({
  initialService,
  onClose,
}: {
  initialService: AIService | null;
  onClose: () => void;
}) {
  const [step, setStep] = useState<ModalStep>(initialService ? "upload" : "service");
  const [service, setService] = useState<AIService | null>(initialService);
  const [file, setFile] = useState<File | null>(null);
  const [text, setText] = useState("");
  const [dragging, setDragging] = useState(false);
  const [sourceTab, setSourceTab] = useState<"upload" | "book" | "paste">("upload");
  const [selectedBookId, setSelectedBookId] = useState<number | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const { data: myBooks } = useBooks();

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const f = e.dataTransfer.files[0];
    if (f) setFile(f);
  }, []);

  const canRun =
    (sourceTab === "upload" && file !== null) ||
    (sourceTab === "book" && selectedBookId !== null) ||
    (sourceTab === "paste" && text.trim().length > 30);

  function runService() {
    setStep("processing");
    setTimeout(() => setStep("done"), 3500);
  }

  const STEP_FLOW: ModalStep[] = initialService
    ? ["upload", "processing", "done"]
    : ["service", "upload", "processing", "done"];

  const STEP_LABEL: Record<ModalStep, string> = {
    service: "Choose Service",
    upload: "Upload Manuscript",
    processing: "Processing",
    done: "Complete",
  };

  const stepIdx = STEP_FLOW.indexOf(step);

  return createPortal(
    <div
      style={{
        position: "fixed", inset: 0, zIndex: 99999,
        background: "rgba(0,0,0,0.88)",
        backdropFilter: "blur(6px)",
        display: "flex", alignItems: "center", justifyContent: "center",
        padding: "16px",
      }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <motion.div
        initial={{ opacity: 0, y: 32, scale: 0.96 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 16, scale: 0.97 }}
        transition={{ type: "spring", stiffness: 260, damping: 24 }}
        style={{
          width: "100%", maxWidth: 600,
          background: "#111111",
          border: "1px solid rgba(255,255,255,0.12)",
          borderRadius: 20,
          overflow: "hidden",
          display: "flex",
          flexDirection: "column",
          maxHeight: "92vh",
          boxShadow: "0 40px 100px rgba(0,0,0,0.8)",
        }}
        onClick={e => e.stopPropagation()}
      >

        {/* ── Header ── */}
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "18px 24px",
          borderBottom: "1px solid rgba(255,255,255,0.08)",
          background: "#161616",
          flexShrink: 0,
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            {service && (
              <div style={{
                width: 34, height: 34, borderRadius: 10,
                background: "rgba(255,255,255,0.08)",
                display: "flex", alignItems: "center", justifyContent: "center",
                color: "#ccc",
              }}>
                {service.icon}
              </div>
            )}
            <div>
              <p style={{ fontWeight: 700, fontSize: 15, color: "#fff", lineHeight: 1.2 }}>
                {service ? service.name : "AI Publishing Suite"}
              </p>
              <p style={{ fontSize: 12, color: "#555", marginTop: 2 }}>
                {STEP_LABEL[step]}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              width: 30, height: 30, borderRadius: 8,
              border: "1px solid rgba(255,255,255,0.10)",
              background: "rgba(255,255,255,0.05)",
              display: "flex", alignItems: "center", justifyContent: "center",
              cursor: "pointer", color: "#666",
            }}
          >
            <X style={{ width: 15, height: 15 }} />
          </button>
        </div>

        {/* ── Step indicator ── */}
        <div style={{
          display: "flex", alignItems: "center",
          padding: "14px 24px",
          borderBottom: "1px solid rgba(255,255,255,0.05)",
          gap: 0, flexShrink: 0,
        }}>
          {STEP_FLOW.map((s, i) => {
            const done = i < stepIdx;
            const active = s === step;
            return (
              <div key={s} style={{ display: "flex", alignItems: "center", flex: 1 }}>
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4, flex: 1 }}>
                  <div style={{
                    width: 22, height: 22, borderRadius: "50%",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: 10, fontWeight: 700,
                    background: done ? "#fff" : active ? "rgba(255,255,255,0.12)" : "rgba(255,255,255,0.04)",
                    color: done ? "#111" : active ? "#fff" : "#333",
                    border: active ? "1px solid rgba(255,255,255,0.25)" : "none",
                    transition: "all .3s",
                  }}>
                    {done ? <Check style={{ width: 10, height: 10 }} /> : i + 1}
                  </div>
                  <p style={{ fontSize: 10, color: active ? "#999" : "#333" }}>{STEP_LABEL[s]}</p>
                </div>
                {i < STEP_FLOW.length - 1 && (
                  <div style={{
                    height: 1, width: 32, flexShrink: 0, marginBottom: 14,
                    background: done ? "rgba(255,255,255,0.2)" : "rgba(255,255,255,0.06)",
                  }} />
                )}
              </div>
            );
          })}
        </div>

        {/* ── Body ── */}
        <div style={{ flex: 1, overflowY: "auto" }}>
          <AnimatePresence mode="wait">

            {/* Step: Service picker */}
            {step === "service" && (
              <motion.div
                key="service"
                initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}
                style={{ padding: "20px 24px", display: "flex", flexDirection: "column", gap: 8 }}
              >
                <p style={{ fontSize: 13, color: "#666", marginBottom: 4 }}>
                  Which AI service would you like to run on your manuscript?
                </p>
                {SERVICES.map(s => (
                  <button
                    key={s.id}
                    onClick={() => { setService(s); setStep("upload"); }}
                    style={{
                      display: "flex", alignItems: "center", gap: 12,
                      padding: "12px 14px", borderRadius: 12, textAlign: "left",
                      background: "rgba(255,255,255,0.03)",
                      border: "1px solid rgba(255,255,255,0.07)",
                      cursor: "pointer", width: "100%",
                      transition: "background .15s, border-color .15s",
                    }}
                    onMouseEnter={e => {
                      const el = e.currentTarget as HTMLElement;
                      el.style.background = "rgba(255,255,255,0.07)";
                      el.style.borderColor = "rgba(255,255,255,0.13)";
                    }}
                    onMouseLeave={e => {
                      const el = e.currentTarget as HTMLElement;
                      el.style.background = "rgba(255,255,255,0.03)";
                      el.style.borderColor = "rgba(255,255,255,0.07)";
                    }}
                  >
                    <div style={{
                      width: 34, height: 34, borderRadius: 10, flexShrink: 0,
                      background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.09)",
                      display: "flex", alignItems: "center", justifyContent: "center", color: "#aaa",
                    }}>
                      {s.icon}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ fontWeight: 600, fontSize: 13, color: "#fff" }}>{s.name}</p>
                      <p style={{ fontSize: 11, color: "#555", marginTop: 2 }}>{s.tagline}</p>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 4, color: "#444", flexShrink: 0 }}>
                      <Clock style={{ width: 11, height: 11 }} />
                      <span style={{ fontSize: 11 }}>{s.delivery}</span>
                      <ChevronRight style={{ width: 13, height: 13, marginLeft: 2 }} />
                    </div>
                  </button>
                ))}
              </motion.div>
            )}

            {/* Step: Upload */}
            {step === "upload" && (
              <motion.div
                key="upload"
                initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}
                style={{ padding: "24px", display: "flex", flexDirection: "column", gap: 18 }}
              >
                <p style={{ fontSize: 13, color: "#666", lineHeight: 1.6, margin: 0 }}>
                  Choose your manuscript source. The AI will analyze it using{" "}
                  <span style={{ color: "#ddd", fontWeight: 600 }}>{service?.name}</span>.
                </p>

                {/* Source tabs */}
                <div style={{
                  display: "flex", gap: 6,
                  background: "rgba(255,255,255,0.04)",
                  border: "1px solid rgba(255,255,255,0.08)",
                  borderRadius: 12, padding: 5,
                }}>
                  {([
                    { id: "upload" as const, icon: <Upload style={{ width: 13, height: 13 }} />, label: "Upload File" },
                    { id: "book"   as const, icon: <Library style={{ width: 13, height: 13 }} />, label: "My Books" },
                    { id: "paste"  as const, icon: <FileText style={{ width: 13, height: 13 }} />, label: "Paste Text" },
                  ] as const).map(tab => (
                    <button
                      key={tab.id}
                      onClick={() => setSourceTab(tab.id)}
                      style={{
                        flex: 1,
                        display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
                        padding: "8px 10px", borderRadius: 8,
                        border: "none",
                        background: sourceTab === tab.id ? "rgba(255,255,255,0.12)" : "transparent",
                        color: sourceTab === tab.id ? "#fff" : "#555",
                        fontSize: 12, fontWeight: sourceTab === tab.id ? 600 : 400,
                        cursor: "pointer", transition: "all .15s",
                      }}
                    >
                      {tab.icon}
                      {tab.label}
                    </button>
                  ))}
                </div>

                {/* Tab: Upload file */}
                {sourceTab === "upload" && (
                  <div
                    onDragEnter={() => setDragging(true)}
                    onDragLeave={() => setDragging(false)}
                    onDragOver={e => e.preventDefault()}
                    onDrop={onDrop}
                    onClick={() => fileRef.current?.click()}
                    style={{
                      border: dragging
                        ? "2px dashed rgba(255,255,255,0.4)"
                        : file
                        ? "2px dashed rgba(255,255,255,0.2)"
                        : "2px dashed rgba(255,255,255,0.10)",
                      borderRadius: 14,
                      padding: "36px 24px",
                      display: "flex", flexDirection: "column", alignItems: "center", gap: 12,
                      cursor: "pointer",
                      background: dragging
                        ? "rgba(255,255,255,0.05)"
                        : file
                        ? "rgba(255,255,255,0.03)"
                        : "rgba(255,255,255,0.02)",
                      transition: "all .2s",
                    }}
                  >
                    <input
                      ref={fileRef}
                      type="file"
                      accept=".pdf,.docx,.txt,.doc"
                      style={{ display: "none" }}
                      onChange={e => { if (e.target.files?.[0]) setFile(e.target.files[0]); }}
                    />
                    <div style={{
                      width: 52, height: 52, borderRadius: 14,
                      background: "rgba(255,255,255,0.06)",
                      border: "1px solid rgba(255,255,255,0.10)",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      color: file ? "#fff" : "#555",
                    }}>
                      {file ? <Check style={{ width: 22, height: 22 }} /> : <Upload style={{ width: 22, height: 22 }} />}
                    </div>
                    {file ? (
                      <div style={{ textAlign: "center" }}>
                        <p style={{ fontSize: 14, fontWeight: 600, color: "#fff" }}>{file.name}</p>
                        <p style={{ fontSize: 12, color: "#555", marginTop: 4 }}>
                          {(file.size / 1024).toFixed(1)} KB ·{" "}
                          <span style={{ color: "#888", textDecoration: "underline", cursor: "pointer" }}>
                            Click to change
                          </span>
                        </p>
                      </div>
                    ) : (
                      <div style={{ textAlign: "center" }}>
                        <p style={{ fontSize: 14, color: "#ccc", fontWeight: 500 }}>
                          Drop your manuscript here
                        </p>
                        <p style={{ fontSize: 12, color: "#555", marginTop: 4 }}>
                          Supports PDF, DOCX, TXT — or click to browse
                        </p>
                      </div>
                    )}
                  </div>
                )}

                {/* Tab: My Books */}
                {sourceTab === "book" && (
                  <div style={{
                    border: "1px solid rgba(255,255,255,0.08)",
                    borderRadius: 14,
                    overflow: "hidden",
                    maxHeight: 280,
                    overflowY: "auto",
                  }}>
                    {!myBooks || myBooks.length === 0 ? (
                      <div style={{
                        padding: "40px 24px",
                        display: "flex", flexDirection: "column", alignItems: "center", gap: 10,
                        color: "#444",
                      }}>
                        <Library style={{ width: 32, height: 32, opacity: 0.4 }} />
                        <p style={{ fontSize: 13, textAlign: "center" }}>No books found. Write something first!</p>
                      </div>
                    ) : (
                      myBooks.map((book, idx) => {
                        const isSelected = selectedBookId === book.id;
                        return (
                          <div
                            key={book.id}
                            onClick={() => setSelectedBookId(book.id)}
                            style={{
                              display: "flex", alignItems: "center", gap: 14,
                              padding: "12px 16px",
                              cursor: "pointer",
                              borderBottom: idx < myBooks.length - 1 ? "1px solid rgba(255,255,255,0.05)" : "none",
                              background: isSelected ? "rgba(255,255,255,0.08)" : "transparent",
                              transition: "background .15s",
                            }}
                          >
                            {/* Mini cover */}
                            <div style={{
                              width: 36, height: 48,
                              borderRadius: 4,
                              flexShrink: 0,
                              overflow: "hidden",
                              background: book.spineColor ? `${book.spineColor}33` : "rgba(255,255,255,0.07)",
                              border: isSelected ? `1px solid ${book.spineColor || "#fff"}88` : "1px solid rgba(255,255,255,0.10)",
                              display: "flex", alignItems: "center", justifyContent: "center",
                            }}>
                              {book.coverImage ? (
                                <img src={book.coverImage} alt={book.title} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                              ) : (
                                <BookOpen style={{ width: 16, height: 16, color: book.spineColor || "#555" }} />
                              )}
                            </div>
                            {/* Info */}
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <p style={{ fontSize: 13, fontWeight: 600, color: isSelected ? "#fff" : "#ccc", margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                                {book.title}
                              </p>
                              {book.genre && (
                                <p style={{ fontSize: 11, color: "#555", margin: "2px 0 0" }}>{book.genre}</p>
                              )}
                            </div>
                            {/* Check */}
                            {isSelected && (
                              <div style={{
                                width: 20, height: 20, borderRadius: "50%",
                                background: "#fff",
                                display: "flex", alignItems: "center", justifyContent: "center",
                                flexShrink: 0,
                              }}>
                                <Check style={{ width: 11, height: 11, color: "#111" }} />
                              </div>
                            )}
                          </div>
                        );
                      })
                    )}
                  </div>
                )}

                {/* Tab: Paste text */}
                {sourceTab === "paste" && (
                  <textarea
                    placeholder="Paste your manuscript, chapter, or any portion of your text here…"
                    value={text}
                    onChange={e => setText(e.target.value)}
                    style={{
                      width: "100%",
                      minHeight: 200,
                      padding: "14px 16px",
                      borderRadius: 12,
                      border: "1px solid rgba(255,255,255,0.09)",
                      background: "rgba(255,255,255,0.04)",
                      color: "#f0f0f0",
                      fontSize: 13,
                      lineHeight: 1.65,
                      resize: "vertical",
                      outline: "none",
                      fontFamily: "inherit",
                      boxSizing: "border-box",
                    }}
                  />
                )}

                {/* Actions */}
                <div style={{ display: "flex", gap: 10, paddingTop: 4 }}>
                  {!initialService && (
                    <button
                      onClick={() => { setStep("service"); }}
                      style={{
                        display: "flex", alignItems: "center", gap: 6,
                        padding: "11px 18px", borderRadius: 12,
                        border: "1px solid rgba(255,255,255,0.09)",
                        background: "rgba(255,255,255,0.05)",
                        color: "#777", fontSize: 13, fontWeight: 500, cursor: "pointer",
                      }}
                    >
                      <ChevronLeft style={{ width: 14, height: 14 }} />
                      Back
                    </button>
                  )}
                  <button
                    onClick={runService}
                    disabled={!canRun}
                    style={{
                      flex: 1,
                      display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                      padding: "13px 24px", borderRadius: 12,
                      background: canRun ? "#ffffff" : "rgba(255,255,255,0.07)",
                      color: canRun ? "#111111" : "#333",
                      fontSize: 14, fontWeight: 700,
                      cursor: canRun ? "pointer" : "not-allowed",
                      border: "none",
                      transition: "all .2s",
                    }}
                  >
                    <Zap style={{ width: 15, height: 15 }} />
                    Run {service?.name}
                  </button>
                </div>
              </motion.div>
            )}

            {/* Step: Processing */}
            {step === "processing" && (
              <motion.div
                key="processing"
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                style={{
                  padding: "60px 24px",
                  display: "flex", flexDirection: "column", alignItems: "center", gap: 24,
                }}
              >
                <div style={{ position: "relative", width: 72, height: 72 }}>
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1.8, repeat: Infinity, ease: "linear" }}
                    style={{
                      position: "absolute", inset: 0, borderRadius: "50%",
                      border: "2px solid rgba(255,255,255,0.07)",
                      borderTopColor: "#fff",
                    }}
                  />
                  <div style={{
                    position: "absolute", inset: 0,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    color: "#888",
                  }}>
                    <Sparkles style={{ width: 22, height: 22 }} />
                  </div>
                </div>
                <div style={{ textAlign: "center" }}>
                  <p style={{ fontSize: 18, fontWeight: 700, color: "#fff", marginBottom: 8 }}>
                    Analyzing your manuscript…
                  </p>
                  <p style={{ fontSize: 13, color: "#555", lineHeight: 1.6 }}>
                    {service?.name} is working through your content.<br />
                    Estimated time: {service?.delivery}
                  </p>
                </div>
                {/* Progress bar */}
                <div style={{ width: 200, height: 3, borderRadius: 99, background: "rgba(255,255,255,0.06)", overflow: "hidden" }}>
                  <motion.div
                    style={{ height: "100%", background: "#fff", borderRadius: 99 }}
                    initial={{ width: "0%" }}
                    animate={{ width: "100%" }}
                    transition={{ duration: 3.5, ease: "easeInOut" }}
                  />
                </div>
              </motion.div>
            )}

            {/* Step: Done */}
            {step === "done" && (
              <motion.div
                key="done"
                initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}
                style={{
                  padding: "60px 24px",
                  display: "flex", flexDirection: "column", alignItems: "center", gap: 20,
                  textAlign: "center",
                }}
              >
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: "spring", stiffness: 260, damping: 18, delay: 0.1 }}
                  style={{
                    width: 60, height: 60, borderRadius: "50%",
                    background: "rgba(255,255,255,0.08)",
                    border: "1px solid rgba(255,255,255,0.18)",
                    display: "flex", alignItems: "center", justifyContent: "center",
                  }}
                >
                  <Check style={{ width: 26, height: 26, color: "#fff" }} />
                </motion.div>
                <div>
                  <p style={{ fontSize: 20, fontWeight: 700, color: "#fff", marginBottom: 8 }}>Analysis complete!</p>
                  <p style={{ fontSize: 13, color: "#555", lineHeight: 1.7, maxWidth: 340, margin: "0 auto" }}>
                    Your <strong style={{ color: "#ccc" }}>{service?.name}</strong> report is ready.
                    Full results will appear in your dashboard shortly.
                  </p>
                </div>
                <div style={{ display: "flex", gap: 10, marginTop: 8 }}>
                  <button
                    onClick={onClose}
                    style={{
                      padding: "11px 22px", borderRadius: 12, fontSize: 13, fontWeight: 500, cursor: "pointer",
                      background: "rgba(255,255,255,0.06)", color: "#888",
                      border: "1px solid rgba(255,255,255,0.09)",
                    }}
                  >
                    Close
                  </button>
                  <button
                    onClick={() => { setStep(initialService ? "upload" : "service"); setFile(null); setText(""); if (!initialService) setService(null); }}
                    style={{
                      display: "flex", alignItems: "center", gap: 6,
                      padding: "11px 22px", borderRadius: 12, fontSize: 13, fontWeight: 700, cursor: "pointer",
                      background: "#fff", color: "#111", border: "none",
                    }}
                  >
                    <Zap style={{ width: 13, height: 13 }} />
                    Run another service
                  </button>
                </div>
              </motion.div>
            )}

          </AnimatePresence>
        </div>
      </motion.div>
    </div>,
    document.body
  );
}

/* ─── Service Card ────────────────────────────────────────── */

function ServiceCard({
  s, i, onLaunch,
}: {
  s: AIService; i: number; onLaunch: (s: AIService) => void;
}) {
  const BADGE: Record<string, React.CSSProperties> = {
    "Most Used": { background: "rgba(255,255,255,0.07)", color: "#bbb", border: "1px solid rgba(255,255,255,0.12)" },
    "Popular":   { background: "rgba(255,255,255,0.07)", color: "#bbb", border: "1px solid rgba(255,255,255,0.12)" },
    "New":       { background: "rgba(255,255,255,0.07)", color: "#bbb", border: "1px solid rgba(255,255,255,0.12)" },
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: i * 0.04, duration: 0.4 }}
      style={{
        background: "rgba(255,255,255,0.025)",
        border: "1px solid rgba(255,255,255,0.07)",
        borderRadius: 16,
        display: "flex", flexDirection: "column",
        transition: "border-color .2s, box-shadow .2s",
        overflow: "hidden",
      }}
      onMouseEnter={e => {
        const el = e.currentTarget as HTMLElement;
        el.style.borderColor = "rgba(255,255,255,0.13)";
        el.style.boxShadow = "0 8px 32px rgba(0,0,0,0.4)";
      }}
      onMouseLeave={e => {
        const el = e.currentTarget as HTMLElement;
        el.style.borderColor = "rgba(255,255,255,0.07)";
        el.style.boxShadow = "none";
      }}
    >
      <div style={{ padding: "20px", display: "flex", flexDirection: "column", gap: 14, flex: 1 }}>
        {/* Header */}
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{
              width: 38, height: 38, borderRadius: 11,
              background: "rgba(255,255,255,0.07)",
              border: "1px solid rgba(255,255,255,0.09)",
              display: "flex", alignItems: "center", justifyContent: "center",
              color: "#bbb", flexShrink: 0,
            }}>
              {s.icon}
            </div>
            <div>
              <p style={{ fontWeight: 700, fontSize: 13, color: "#fff", lineHeight: 1.3 }}>{s.name}</p>
              <p style={{ fontSize: 11, color: "#555", marginTop: 3 }}>{s.tagline}</p>
            </div>
          </div>
          {s.badge && (
            <span style={{ fontSize: 10, fontWeight: 700, padding: "3px 8px", borderRadius: 99, flexShrink: 0, marginLeft: 8, ...BADGE[s.badge] }}>
              {s.badge}
            </span>
          )}
        </div>

        {/* Description */}
        <p style={{ fontSize: 12, color: "#5a5a5a", lineHeight: 1.7, flex: 1 }}>{s.description}</p>

        {/* Features */}
        <ul style={{ display: "flex", flexDirection: "column", gap: 5 }}>
          {s.features.map(f => (
            <li key={f} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 11, color: "#4a4a4a" }}>
              <span style={{ width: 4, height: 4, borderRadius: "50%", background: "#3a3a3a", flexShrink: 0 }} />
              {f}
            </li>
          ))}
        </ul>

        {/* Footer */}
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          paddingTop: 14, borderTop: "1px solid rgba(255,255,255,0.05)",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 11, color: "#444" }}>
            <Clock style={{ width: 11, height: 11 }} />
            {s.delivery}
          </div>
          <button
            onClick={() => onLaunch(s)}
            style={{
              display: "flex", alignItems: "center", gap: 6,
              padding: "7px 14px", borderRadius: 10, fontSize: 12, fontWeight: 700,
              background: "rgba(255,255,255,0.07)",
              border: "1px solid rgba(255,255,255,0.10)",
              color: "#ddd", cursor: "pointer",
              transition: "background .15s, color .15s",
            }}
            onMouseEnter={e => {
              const el = e.currentTarget as HTMLElement;
              el.style.background = "rgba(255,255,255,0.15)";
              el.style.color = "#fff";
            }}
            onMouseLeave={e => {
              const el = e.currentTarget as HTMLElement;
              el.style.background = "rgba(255,255,255,0.07)";
              el.style.color = "#ddd";
            }}
          >
            Launch
            <ArrowRight style={{ width: 12, height: 12 }} />
          </button>
        </div>
      </div>
    </motion.div>
  );
}

/* ─── Page ────────────────────────────────────────────────── */

export default function Marketplace() {
  const [cat, setCat] = useState<Category>("all");
  const [q, setQ] = useState("");
  // undefined = closed | null = service-picker first | AIService = direct to upload
  const [modal, setModal] = useState<AIService | null | undefined>(undefined);

  const filtered = SERVICES.filter(s => {
    const catOk = cat === "all" || s.category === cat;
    const qLow = q.toLowerCase();
    const qOk = !q || s.name.toLowerCase().includes(qLow) || s.tagline.toLowerCase().includes(qLow);
    return catOk && qOk;
  });

  return (
    <Layout isLanding>
    <div style={{ minHeight: "100vh", background: "#080808", color: "#f0f0f0" }}>

      {/* Top ambient glow */}
      <div style={{
        position: "fixed", top: 0, left: "50%", transform: "translateX(-50%)",
        width: 700, height: 300, pointerEvents: "none",
        background: "radial-gradient(ellipse at top, rgba(255,255,255,0.05) 0%, transparent 70%)",
        opacity: 0.6,
      }} />

      <div style={{ position: "relative", maxWidth: 1160, margin: "0 auto", padding: "56px 24px" }}>

        {/* Back */}
        <Link
          href="/"
          style={{
            display: "inline-flex", alignItems: "center", gap: 8,
            fontSize: 13, color: "#444", marginBottom: 48,
            textDecoration: "none", transition: "color .2s",
          }}
          onMouseEnter={(e: React.MouseEvent<HTMLAnchorElement>) => { e.currentTarget.style.color = "#fff"; }}
          onMouseLeave={(e: React.MouseEvent<HTMLAnchorElement>) => { e.currentTarget.style.color = "#444"; }}
        >
          <ArrowLeft style={{ width: 15, height: 15 }} />
          Back to Home
        </Link>

        {/* ── Hero ── */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 0, marginBottom: 48 }}
        >
          <div style={{ maxWidth: 640, textAlign: "center" }}>
            <h1 style={{ fontSize: 46, fontWeight: 800, lineHeight: 1.06, color: "#fff", margin: 0 }}>
              Every publishing service,<br />
              <span style={{ color: "#fff" }}>powered by AI.</span>
            </h1>
            <p style={{ marginTop: 16, fontSize: 15, color: "rgba(255,255,255,0.55)", lineHeight: 1.65 }}>
              Professional editorial, design, and marketing delivered in minutes. No waitlists. No humans.
            </p>
          </div>
        </motion.div>

        {/* ── Controls ── */}
        <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 12, marginBottom: 28 }}>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {CATEGORIES.map(c => (
              <button
                key={c.id}
                onClick={() => setCat(c.id)}
                style={{
                  padding: "7px 16px", borderRadius: 99, fontSize: 13, fontWeight: 500,
                  cursor: "pointer", transition: "all .15s",
                  background: cat === c.id ? "#fff" : "rgba(255,255,255,0.05)",
                  color: cat === c.id ? "#111" : "#666",
                  border: cat === c.id ? "none" : "1px solid rgba(255,255,255,0.08)",
                }}
              >
                {c.label}
              </button>
            ))}
          </div>

          <div style={{ position: "relative", marginLeft: "auto" }}>
            <Search style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", width: 14, height: 14, color: "#444", pointerEvents: "none" }} />
            <input
              placeholder="Search services…"
              value={q}
              onChange={e => setQ(e.target.value)}
              style={{
                paddingLeft: 36, paddingRight: q ? 32 : 14, paddingTop: 8, paddingBottom: 8,
                borderRadius: 12, fontSize: 13, outline: "none", width: 200,
                background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)",
                color: "#f0f0f0",
              }}
            />
            {q && (
              <button onClick={() => setQ("")} style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: "#444" }}>
                <X style={{ width: 13, height: 13 }} />
              </button>
            )}
          </div>
        </div>

        <p style={{ fontSize: 12, color: "#333", marginBottom: 20 }}>
          {filtered.length} service{filtered.length !== 1 ? "s" : ""} available
        </p>

        {/* ── Grid ── */}
        {filtered.length === 0 ? (
          <div style={{ textAlign: "center", padding: "80px 0", color: "#333" }}>
            <p style={{ fontSize: 14 }}>No services match your search</p>
          </div>
        ) : (
          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))",
            gap: 16,
          }}>
            {filtered.map((s, i) => (
              <ServiceCard key={s.id} s={s} i={i} onLaunch={sv => setModal(sv)} />
            ))}
          </div>
        )}

        {/* ── How it works ── */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.45 }}
          style={{
            marginTop: 64, borderRadius: 20, padding: "40px 32px",
            background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.05)",
          }}
        >
          <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.22em", textTransform: "uppercase", textAlign: "center", color: "#333", marginBottom: 8 }}>Process</p>
          <h2 style={{ fontSize: 22, fontWeight: 700, textAlign: "center", color: "#fff", marginBottom: 36, marginTop: 0 }}>Ready in three steps</h2>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 32 }}>
            {[
              { n: "01", icon: <Palette style={{ width: 20, height: 20 }} />, title: "Select a Service", desc: "Pick the AI service that fits where you are in the writing process." },
              { n: "02", icon: <Upload style={{ width: 20, height: 20 }} />, title: "Upload Manuscript", desc: "Drop your file or paste text. Supports PDF, DOCX, and TXT." },
              { n: "03", icon: <Zap style={{ width: 20, height: 20 }} />, title: "Get Results Instantly", desc: "Receive a professional-grade report in minutes, ready to apply." },
            ].map(step => (
              <div key={step.n} style={{ display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center", gap: 12 }}>
                <div style={{
                  width: 48, height: 48, borderRadius: 14,
                  background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)",
                  display: "flex", alignItems: "center", justifyContent: "center", color: "#666",
                }}>
                  {step.icon}
                </div>
                <div>
                  <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.2em", color: "#333", marginBottom: 6 }}>{step.n}</p>
                  <p style={{ fontWeight: 600, fontSize: 13, color: "#fff", marginBottom: 6 }}>{step.title}</p>
                  <p style={{ fontSize: 12, color: "#4a4a4a", lineHeight: 1.65 }}>{step.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </motion.div>

        <div style={{ height: 80 }} />
      </div>

      {/* Modal */}
      <AnimatePresence>
        {modal !== undefined && (
          <LaunchModal
            initialService={modal}
            onClose={() => setModal(undefined)}
          />
        )}
      </AnimatePresence>
    </div>
    </Layout>
  );
}
