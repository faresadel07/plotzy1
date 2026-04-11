import { useState, useRef, useCallback, useEffect } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Link } from "wouter";
import { Layout } from "@/components/layout";
import {
  BookOpen, Pen, Palette, Megaphone, MessageSquare,
  Zap, Clock, FileText, Search, X,
  ArrowLeft, Upload, ChevronRight, ChevronLeft, Sparkles, Check, Library,
  Copy, AlertCircle, Lock, BarChart3,
} from "lucide-react";
import { useBooks } from "@/hooks/use-books";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

/* ─── Design tokens ──────────────────────────────────────── */

const SF = "-apple-system,BlinkMacSystemFont,'SF Pro Text','Helvetica Neue',sans-serif";
const BG = "#000"; const C2 = "#111"; const C3 = "#1a1a1a";
const B = "rgba(255,255,255,0.07)";
const T = "#fff"; const TS = "rgba(255,255,255,0.55)"; const TD = "rgba(255,255,255,0.25)";

const ACCENT: Record<string, string> = {
  "dev-editor": "#818cf8",
  "copy-editor": "#34d399",
  "beta-reader": "#fb923c",
  "cover-generator": "#f472b6",
  "blurb-writer": "#60a5fa",
};

/* ─── Helpers ────────────────────────────────────────────── */

/** Read a text file as a string */
async function readFileText(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsText(file);
  });
}

/** Fetch all chapters for a book and return their text joined together */
async function fetchBookText(bookId: number): Promise<string> {
  const res = await fetch(`${BASE}/api/books/${bookId}/chapters`, { credentials: "include" });
  if (!res.ok) throw new Error("Failed to fetch chapters");
  const chapters: { title: string; content: string; order: number }[] = await res.json();
  const sorted = [...chapters].sort((a, b) => a.order - b.order);
  return sorted.map(c => `# ${c.title || "Untitled Chapter"}\n\n${c.content || ""}`).join("\n\n---\n\n");
}

/** Very simple markdown -> styled JSX renderer (no dependency needed) */
function SimpleMarkdown({ text }: { text: string }) {
  const lines = text.split("\n");
  const elements: React.ReactNode[] = [];
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    if (line.startsWith("## ")) {
      elements.push(<h2 key={i} style={{ fontSize: 16, fontWeight: 700, color: T, margin: "20px 0 8px", borderBottom: `1px solid ${B}`, paddingBottom: 6 }}>{line.slice(3)}</h2>);
    } else if (line.startsWith("# ")) {
      elements.push(<h1 key={i} style={{ fontSize: 18, fontWeight: 700, color: T, margin: "12px 0 10px" }}>{line.slice(2)}</h1>);
    } else if (line.startsWith("### ")) {
      elements.push(<h3 key={i} style={{ fontSize: 14, fontWeight: 600, color: "#ddd", margin: "14px 0 6px" }}>{line.slice(4)}</h3>);
    } else if (line.startsWith("> ")) {
      elements.push(<blockquote key={i} style={{ borderLeft: `3px solid ${TD}`, paddingLeft: 12, margin: "8px 0", color: "#888", fontStyle: "italic", fontSize: 13 }}>{line.slice(2)}</blockquote>);
    } else if (/^[-*] /.test(line)) {
      elements.push(<div key={i} style={{ display: "flex", gap: 8, marginBottom: 4 }}><span style={{ color: "#666", flexShrink: 0 }}>•</span><span style={{ fontSize: 13, color: "#aaa", lineHeight: 1.6 }}>{applyInline(line.slice(2))}</span></div>);
    } else if (/^\d+\. /.test(line)) {
      const num = line.match(/^(\d+)\. /)?.[1];
      elements.push(<div key={i} style={{ display: "flex", gap: 8, marginBottom: 4 }}><span style={{ color: "#666", flexShrink: 0, minWidth: 18 }}>{num}.</span><span style={{ fontSize: 13, color: "#aaa", lineHeight: 1.6 }}>{applyInline(line.replace(/^\d+\. /, ""))}</span></div>);
    } else if (line.trim() === "" || line === "---") {
      elements.push(<div key={i} style={{ height: 8 }} />);
    } else {
      elements.push(<p key={i} style={{ fontSize: 13, color: "#aaa", lineHeight: 1.7, margin: "4px 0" }}>{applyInline(line)}</p>);
    }
    i++;
  }
  return <div>{elements}</div>;
}

function applyInline(text: string): React.ReactNode {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((p, i) =>
    p.startsWith("**") && p.endsWith("**")
      ? <strong key={i} style={{ color: "#ddd", fontWeight: 600 }}>{p.slice(2, -2)}</strong>
      : p
  );
}

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

interface Scores {
  overall: number;
  structure: number;
  characters: number;
  pacing: number;
  quality: number;
}

interface UsageInfo {
  tier: string;
  allowed: boolean;
  remaining: number;
  limit: number;
  used: number;
  canUse: boolean;
}

interface HistoryEntry {
  serviceId: string;
  serviceName: string;
  date: string;
  overallScore?: number;
  bookTitle?: string;
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
    id: "beta-reader", category: "analysis",
    icon: <MessageSquare className="w-5 h-5" />,
    name: "AI Beta Reader",
    tagline: "Simulated reader feedback",
    description: "Simulates 5 different reader personas going through your manuscript and provides detailed feedback on what resonated and what confused.",
    features: ["5 reader persona perspectives", "Emotional impact mapping", "Page-turn prediction score"],
    delivery: "~5 min", badge: "New",
  },
  {
    id: "cover-generator", category: "design",
    icon: <Palette className="w-5 h-5" />,
    name: "AI Cover Generator",
    tagline: "Professional covers from your blurb",
    description: "Generates 4 professionally composed book covers based on your genre, title, and synopsis -- following publishing industry standards.",
    features: ["4 unique cover concepts", "Genre-appropriate styling", "High-res export (3000x4500 px)"],
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
];

const CATEGORIES: { id: Category; label: string }[] = [
  { id: "all", label: "All" },
  { id: "editing", label: "Editing" },
  { id: "design", label: "Design" },
  { id: "marketing", label: "Marketing" },
  { id: "analysis", label: "Analysis" },
];

/* ─── Score Card Component ───────────────────────────────── */

function CircularGauge({ score, size = 120 }: { score: number; size?: number }) {
  const color = score > 75 ? "#34d399" : score > 50 ? "#fbbf24" : "#f87171";
  const deg = (score / 100) * 360;
  return (
    <div style={{
      width: size, height: size, borderRadius: "50%",
      background: `conic-gradient(${color} 0deg, ${color} ${deg}deg, rgba(255,255,255,0.08) ${deg}deg, rgba(255,255,255,0.08) 360deg)`,
      display: "flex", alignItems: "center", justifyContent: "center",
      position: "relative",
    }}>
      <div style={{
        width: size - 16, height: size - 16, borderRadius: "50%",
        background: C2,
        display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
      }}>
        <span style={{ fontSize: size * 0.3, fontWeight: 800, color: T, fontFamily: SF, lineHeight: 1 }}>{score}</span>
        <span style={{ fontSize: 10, color: TS, marginTop: 2 }}>/100</span>
      </div>
    </div>
  );
}

function ScoreBar({ label, score }: { label: string; score: number }) {
  const color = score > 75 ? "#34d399" : score > 50 ? "#fbbf24" : "#f87171";
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
      <span style={{ fontSize: 12, color: TS, width: 100, flexShrink: 0, fontFamily: SF }}>{label}</span>
      <div style={{ flex: 1, height: 8, borderRadius: 99, background: "rgba(255,255,255,0.06)", overflow: "hidden" }}>
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${score}%` }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          style={{ height: "100%", borderRadius: 99, background: color }}
        />
      </div>
      <span style={{ fontSize: 12, fontWeight: 700, color: T, width: 28, textAlign: "right", fontFamily: SF }}>{score}</span>
    </div>
  );
}

function ScoreCard({ scores }: { scores: Scores }) {
  return (
    <div style={{
      padding: "24px",
      borderBottom: `1px solid ${B}`,
      display: "flex", flexDirection: "column", alignItems: "center", gap: 20,
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 24, width: "100%" }}>
        <CircularGauge score={scores.overall} />
        <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 10 }}>
          <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: TD, margin: 0 }}>Category Breakdown</p>
          <ScoreBar label="Structure" score={scores.structure} />
          <ScoreBar label="Characters" score={scores.characters} />
          <ScoreBar label="Pacing" score={scores.pacing} />
          <ScoreBar label="Writing Quality" score={scores.quality} />
        </div>
      </div>
    </div>
  );
}

/** Try to parse scores JSON from the first line of the AI response */
function parseScores(report: string): { scores: Scores | null; cleanReport: string } {
  const firstNewline = report.indexOf("\n");
  const firstLine = firstNewline > -1 ? report.slice(0, firstNewline).trim() : report.trim();
  try {
    const parsed = JSON.parse(firstLine);
    if (
      typeof parsed === "object" && parsed !== null &&
      typeof parsed.overall === "number" &&
      typeof parsed.structure === "number" &&
      typeof parsed.characters === "number" &&
      typeof parsed.pacing === "number" &&
      typeof parsed.quality === "number"
    ) {
      return {
        scores: parsed as Scores,
        cleanReport: firstNewline > -1 ? report.slice(firstNewline + 1) : "",
      };
    }
  } catch {
    // not JSON, that's fine
  }
  return { scores: null, cleanReport: report };
}

/* ─── Multi-step Processing Animation ────────────────────── */

function ProcessingSteps({ serviceName, delivery }: { serviceName: string; delivery: string }) {
  const [activeStep, setActiveStep] = useState(0);

  useEffect(() => {
    const t1 = setTimeout(() => setActiveStep(1), 2000);
    const t2 = setTimeout(() => setActiveStep(2), 5000);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, []);

  const steps = [
    "Reading your manuscript...",
    "Analyzing structure & characters...",
    "Generating editorial report...",
  ];

  return (
    <motion.div
      key="processing"
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      style={{
        padding: "48px 24px",
        display: "flex", flexDirection: "column", alignItems: "center", gap: 28,
      }}
    >
      {/* Spinner */}
      <div style={{ position: "relative", width: 72, height: 72 }}>
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1.8, repeat: Infinity, ease: "linear" }}
          style={{
            position: "absolute", inset: 0, borderRadius: "50%",
            border: `2px solid ${B}`,
            borderTopColor: T,
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

      {/* Steps list */}
      <div style={{ display: "flex", flexDirection: "column", gap: 12, width: "100%", maxWidth: 320 }}>
        {steps.map((label, idx) => {
          const done = idx < activeStep;
          const active = idx === activeStep;
          const pending = idx > activeStep;
          return (
            <div key={idx} style={{
              display: "flex", alignItems: "center", gap: 12,
              opacity: pending ? 0.3 : 1,
              transition: "opacity 0.3s",
            }}>
              <div style={{
                width: 24, height: 24, borderRadius: "50%", flexShrink: 0,
                display: "flex", alignItems: "center", justifyContent: "center",
                background: done ? "rgba(52,211,153,0.15)" : active ? "rgba(255,255,255,0.08)" : "rgba(255,255,255,0.04)",
                border: done ? "1px solid rgba(52,211,153,0.3)" : active ? `1px solid ${TD}` : `1px solid ${B}`,
              }}>
                {done ? (
                  <Check style={{ width: 12, height: 12, color: "#34d399" }} />
                ) : active ? (
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                    style={{
                      width: 12, height: 12, borderRadius: "50%",
                      border: "2px solid transparent",
                      borderTopColor: T,
                    }}
                  />
                ) : (
                  <div style={{ width: 6, height: 6, borderRadius: "50%", background: TD }} />
                )}
              </div>
              <span style={{
                fontSize: 13, fontFamily: SF,
                color: done ? "#34d399" : active ? T : TD,
                fontWeight: active ? 600 : 400,
              }}>
                {label}
              </span>
            </div>
          );
        })}
      </div>

      <div style={{ textAlign: "center", marginTop: 4 }}>
        <p style={{ fontSize: 12, color: TD }}>
          {serviceName} &middot; Estimated time: {delivery}
        </p>
      </div>
    </motion.div>
  );
}

/* ─── Launch Modal ────────────────────────────────────────── */

type ModalStep = "service" | "upload" | "processing" | "done";

function LaunchModal({
  initialService,
  onClose,
  usage,
  onAnalysisComplete,
}: {
  initialService: AIService | null;
  onClose: () => void;
  usage: UsageInfo | null;
  onAnalysisComplete: () => void;
}) {
  const [step, setStep] = useState<ModalStep>(initialService ? "upload" : "service");
  const [service, setService] = useState<AIService | null>(initialService);
  const [file, setFile] = useState<File | null>(null);
  const [text, setText] = useState("");
  const [dragging, setDragging] = useState(false);
  const [sourceTab, setSourceTab] = useState<"upload" | "book" | "paste">("upload");
  const [selectedBookId, setSelectedBookId] = useState<number | null>(null);
  const [reportText, setReportText] = useState<string | null>(null);
  const [reportScores, setReportScores] = useState<Scores | null>(null);
  const [apiError, setApiError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const { data: myBooks } = useBooks();

  // Check tier enforcement
  const blocked = usage && !usage.canUse;
  const limitReached = usage && !usage.allowed;

  // Auto-select first book when books load
  useEffect(() => {
    if (myBooks && myBooks.length > 0 && selectedBookId === null) {
      setSourceTab("book");
      setSelectedBookId(myBooks[0].id);
    }
  }, [myBooks]);

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const f = e.dataTransfer.files[0];
    if (f) setFile(f);
  }, []);

  const canRun =
    !blocked && !limitReached &&
    ((sourceTab === "upload" && file !== null) ||
    (sourceTab === "book" && selectedBookId !== null) ||
    (sourceTab === "paste" && text.trim().length > 30));

  async function runService() {
    if (!service) return;
    setApiError(null);
    setReportText(null);
    setReportScores(null);
    setStep("processing");
    try {
      let manuscriptText = "";
      if (sourceTab === "upload" && file) {
        if (file.type === "application/pdf" || file.name.endsWith(".docx") || file.name.endsWith(".doc")) {
          setApiError("PDF and DOCX parsing isn't supported yet -- please use the 'Paste Text' tab or a .txt file instead.");
          setStep("upload");
          return;
        }
        manuscriptText = await readFileText(file);
      } else if (sourceTab === "book" && selectedBookId !== null) {
        manuscriptText = await fetchBookText(selectedBookId);
      } else if (sourceTab === "paste") {
        manuscriptText = text;
      }

      if (manuscriptText.trim().length < 30) {
        setApiError("Not enough content to analyze. Please provide more text.");
        setStep("upload");
        return;
      }

      const res = await fetch(`${BASE}/api/marketplace/analyze`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ serviceId: service.id, text: manuscriptText }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({ message: "Analysis failed" }));
        throw new Error(err.message || "Analysis failed");
      }

      const { report } = await res.json();

      // Parse scores from first line
      const { scores, cleanReport } = parseScores(report);
      setReportScores(scores);
      setReportText(scores ? cleanReport : report);

      // Record usage
      try {
        await fetch(`${BASE}/api/marketplace/record`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({
            serviceId: service.id,
            bookId: selectedBookId,
          }),
        });
      } catch {
        // non-critical
      }

      onAnalysisComplete();
      setStep("done");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Something went wrong";
      setApiError(msg);
      setStep("upload");
    }
  }

  function handleCopyReport() {
    if (!reportText) return;
    navigator.clipboard.writeText(reportText).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
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
          width: "100%", maxWidth: 640,
          background: C2,
          border: `1px solid rgba(255,255,255,0.12)`,
          borderRadius: 20,
          overflow: "hidden",
          display: "flex",
          flexDirection: "column",
          maxHeight: "92vh",
          boxShadow: "0 40px 100px rgba(0,0,0,0.8)",
          fontFamily: SF,
        }}
        onClick={e => e.stopPropagation()}
      >

        {/* Header */}
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "18px 24px",
          borderBottom: `1px solid rgba(255,255,255,0.08)`,
          background: C3,
          flexShrink: 0,
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            {service && (
              <div style={{
                width: 34, height: 34, borderRadius: 10,
                background: `${ACCENT[service.id] || "#888"}22`,
                border: `1px solid ${ACCENT[service.id] || "#888"}44`,
                display: "flex", alignItems: "center", justifyContent: "center",
                color: ACCENT[service.id] || "#ccc",
              }}>
                {service.icon}
              </div>
            )}
            <div>
              <p style={{ fontWeight: 700, fontSize: 15, color: T, lineHeight: 1.2, margin: 0 }}>
                {service ? service.name : "AI Publishing Suite"}
              </p>
              <p style={{ fontSize: 12, color: TD, marginTop: 2 }}>
                {STEP_LABEL[step]}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              width: 30, height: 30, borderRadius: 8,
              border: `1px solid rgba(255,255,255,0.10)`,
              background: "rgba(255,255,255,0.05)",
              display: "flex", alignItems: "center", justifyContent: "center",
              cursor: "pointer", color: "#666",
            }}
          >
            <X style={{ width: 15, height: 15 }} />
          </button>
        </div>

        {/* Step indicator */}
        <div style={{
          display: "flex", alignItems: "center",
          padding: "14px 24px",
          borderBottom: `1px solid rgba(255,255,255,0.05)`,
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
                    background: done ? T : active ? "rgba(255,255,255,0.12)" : "rgba(255,255,255,0.04)",
                    color: done ? C2 : active ? T : "#333",
                    border: active ? `1px solid ${TD}` : "none",
                    transition: "all .3s",
                  }}>
                    {done ? <Check style={{ width: 10, height: 10 }} /> : i + 1}
                  </div>
                  <p style={{ fontSize: 10, color: active ? "#999" : "#333", margin: 0 }}>{STEP_LABEL[s]}</p>
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

        {/* Body */}
        <div style={{ flex: 1, overflowY: "auto" }}>
          <AnimatePresence mode="wait">

            {/* Step: Service picker */}
            {step === "service" && (
              <motion.div
                key="service"
                initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}
                style={{ padding: "20px 24px", display: "flex", flexDirection: "column", gap: 8 }}
              >
                <p style={{ fontSize: 13, color: TS, marginBottom: 4 }}>
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
                      border: `1px solid ${B}`,
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
                      el.style.borderColor = B;
                    }}
                  >
                    <div style={{
                      width: 34, height: 34, borderRadius: 10, flexShrink: 0,
                      background: `${ACCENT[s.id]}22`,
                      border: `1px solid ${ACCENT[s.id]}44`,
                      display: "flex", alignItems: "center", justifyContent: "center",
                      color: ACCENT[s.id],
                    }}>
                      {s.icon}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ fontWeight: 600, fontSize: 13, color: T, margin: 0 }}>{s.name}</p>
                      <p style={{ fontSize: 11, color: TS, marginTop: 2 }}>{s.tagline}</p>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 4, color: TD, flexShrink: 0 }}>
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
                {/* Tier: blocked (free tier, can't use) */}
                {blocked && (
                  <div style={{
                    padding: "32px 24px",
                    borderRadius: 16,
                    background: "rgba(255,255,255,0.03)",
                    border: `1px solid ${B}`,
                    display: "flex", flexDirection: "column", alignItems: "center", gap: 16,
                    textAlign: "center",
                  }}>
                    <div style={{
                      width: 52, height: 52, borderRadius: 14,
                      background: "rgba(251,191,36,0.1)",
                      border: "1px solid rgba(251,191,36,0.2)",
                      display: "flex", alignItems: "center", justifyContent: "center",
                    }}>
                      <Lock style={{ width: 22, height: 22, color: "#fbbf24" }} />
                    </div>
                    <div>
                      <p style={{ fontSize: 16, fontWeight: 700, color: T, margin: "0 0 6px" }}>Upgrade to Unlock</p>
                      <p style={{ fontSize: 13, color: TS, lineHeight: 1.6, margin: 0 }}>
                        AI Marketplace services are available on paid plans. Upgrade to start analyzing your manuscripts with AI.
                      </p>
                    </div>
                    <Link
                      href="/settings"
                      style={{
                        display: "inline-flex", alignItems: "center", gap: 6,
                        padding: "11px 24px", borderRadius: 10,
                        background: T, color: BG,
                        fontSize: 13, fontWeight: 700,
                        textDecoration: "none",
                      }}
                    >
                      <Zap style={{ width: 14, height: 14 }} />
                      Upgrade Now
                    </Link>
                  </div>
                )}

                {/* Tier: limit reached */}
                {!blocked && limitReached && usage && (
                  <div style={{
                    padding: "32px 24px",
                    borderRadius: 16,
                    background: "rgba(255,255,255,0.03)",
                    border: `1px solid ${B}`,
                    display: "flex", flexDirection: "column", alignItems: "center", gap: 16,
                    textAlign: "center",
                  }}>
                    <div style={{
                      width: 52, height: 52, borderRadius: 14,
                      background: "rgba(248,113,113,0.1)",
                      border: "1px solid rgba(248,113,113,0.2)",
                      display: "flex", alignItems: "center", justifyContent: "center",
                    }}>
                      <AlertCircle style={{ width: 22, height: 22, color: "#f87171" }} />
                    </div>
                    <div>
                      <p style={{ fontSize: 16, fontWeight: 700, color: T, margin: "0 0 6px" }}>Monthly Limit Reached</p>
                      <p style={{ fontSize: 13, color: TS, lineHeight: 1.6, margin: 0 }}>
                        {usage.used}/{usage.limit} analyses used this month. Upgrade for more.
                      </p>
                    </div>
                    <Link
                      href="/settings"
                      style={{
                        display: "inline-flex", alignItems: "center", gap: 6,
                        padding: "11px 24px", borderRadius: 10,
                        background: T, color: BG,
                        fontSize: 13, fontWeight: 700,
                        textDecoration: "none",
                      }}
                    >
                      <Zap style={{ width: 14, height: 14 }} />
                      Upgrade for More
                    </Link>
                  </div>
                )}

                {/* Normal upload form */}
                {!blocked && !limitReached && (
                  <>
                    <p style={{ fontSize: 13, color: TS, lineHeight: 1.6, margin: 0 }}>
                      Choose your manuscript source. The AI will analyze it using{" "}
                      <span style={{ color: "#ddd", fontWeight: 600 }}>{service?.name}</span>.
                    </p>

                    {/* Source tabs */}
                    <div style={{
                      display: "flex", gap: 6,
                      background: "rgba(255,255,255,0.04)",
                      border: `1px solid ${B}`,
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
                            color: sourceTab === tab.id ? T : TS,
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
                            ? `2px dashed rgba(255,255,255,0.4)`
                            : file
                            ? `2px dashed rgba(255,255,255,0.2)`
                            : `2px dashed rgba(255,255,255,0.10)`,
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
                          border: `1px solid rgba(255,255,255,0.10)`,
                          display: "flex", alignItems: "center", justifyContent: "center",
                          color: file ? T : TS,
                        }}>
                          {file ? <Check style={{ width: 22, height: 22 }} /> : <Upload style={{ width: 22, height: 22 }} />}
                        </div>
                        {file ? (
                          <div style={{ textAlign: "center" }}>
                            <p style={{ fontSize: 14, fontWeight: 600, color: T }}>{file.name}</p>
                            <p style={{ fontSize: 12, color: TS, marginTop: 4 }}>
                              {(file.size / 1024).toFixed(1)} KB &middot;{" "}
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
                            <p style={{ fontSize: 12, color: TS, marginTop: 4 }}>
                              Supports PDF, DOCX, TXT -- or click to browse
                            </p>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Tab: My Books */}
                    {sourceTab === "book" && (
                      <div style={{
                        border: `1px solid ${B}`,
                        borderRadius: 14,
                        overflow: "hidden",
                        maxHeight: 280,
                        overflowY: "auto",
                      }}>
                        {!myBooks || myBooks.length === 0 ? (
                          <div style={{
                            padding: "40px 24px",
                            display: "flex", flexDirection: "column", alignItems: "center", gap: 10,
                            color: TD,
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
                                  borderBottom: idx < myBooks.length - 1 ? `1px solid rgba(255,255,255,0.05)` : "none",
                                  background: isSelected ? "rgba(255,255,255,0.08)" : "transparent",
                                  transition: "background .15s",
                                }}
                              >
                                <div style={{
                                  width: 36, height: 48,
                                  borderRadius: 4,
                                  flexShrink: 0,
                                  overflow: "hidden",
                                  background: book.spineColor ? `${book.spineColor}33` : B,
                                  border: isSelected ? `1px solid ${book.spineColor || T}88` : `1px solid rgba(255,255,255,0.10)`,
                                  display: "flex", alignItems: "center", justifyContent: "center",
                                }}>
                                  {book.coverImage ? (
                                    <img src={book.coverImage} alt={book.title} loading="lazy" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                                  ) : (
                                    <BookOpen style={{ width: 16, height: 16, color: book.spineColor || TS }} />
                                  )}
                                </div>
                                <div style={{ flex: 1, minWidth: 0 }}>
                                  <p style={{ fontSize: 13, fontWeight: 600, color: isSelected ? T : "#ccc", margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                                    {book.title}
                                  </p>
                                  {book.genre && (
                                    <p style={{ fontSize: 11, color: TS, margin: "2px 0 0" }}>{book.genre}</p>
                                  )}
                                </div>
                                {isSelected && (
                                  <div style={{
                                    width: 20, height: 20, borderRadius: "50%",
                                    background: T,
                                    display: "flex", alignItems: "center", justifyContent: "center",
                                    flexShrink: 0,
                                  }}>
                                    <Check style={{ width: 11, height: 11, color: C2 }} />
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
                        placeholder="Paste your manuscript, chapter, or any portion of your text here..."
                        value={text}
                        onChange={e => setText(e.target.value)}
                        style={{
                          width: "100%",
                          minHeight: 200,
                          padding: "14px 16px",
                          borderRadius: 12,
                          border: `1px solid rgba(255,255,255,0.09)`,
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
                  </>
                )}

                {/* Error banner */}
                {apiError && (
                  <div style={{
                    display: "flex", alignItems: "flex-start", gap: 10,
                    padding: "12px 14px", borderRadius: 10,
                    background: "rgba(239,68,68,0.10)",
                    border: "1px solid rgba(239,68,68,0.25)",
                  }}>
                    <AlertCircle style={{ width: 15, height: 15, color: "#f87171", flexShrink: 0, marginTop: 1 }} />
                    <p style={{ fontSize: 12, color: "#f87171", margin: 0, lineHeight: 1.5 }}>{apiError}</p>
                  </div>
                )}

                {/* Actions */}
                {!blocked && !limitReached && (
                  <div style={{ display: "flex", gap: 10, paddingTop: 4 }}>
                    {!initialService && (
                      <button
                        onClick={() => { setStep("service"); }}
                        style={{
                          display: "flex", alignItems: "center", gap: 6,
                          padding: "11px 18px", borderRadius: 12,
                          border: `1px solid rgba(255,255,255,0.09)`,
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
                        background: canRun ? T : B,
                        color: canRun ? BG : "#333",
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
                )}
              </motion.div>
            )}

            {/* Step: Processing */}
            {step === "processing" && (
              <ProcessingSteps
                serviceName={service?.name || "Service"}
                delivery={service?.delivery || "~2 min"}
              />
            )}

            {/* Step: Done -- report viewer */}
            {step === "done" && (
              <motion.div
                key="done"
                initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                style={{ display: "flex", flexDirection: "column" }}
              >
                {/* Report header bar */}
                <div style={{
                  padding: "18px 24px 14px",
                  borderBottom: `1px solid ${B}`,
                  display: "flex", alignItems: "center", gap: 12,
                }}>
                  <div style={{
                    width: 32, height: 32, borderRadius: "50%", flexShrink: 0,
                    background: "rgba(52,211,153,0.12)", border: "1px solid rgba(52,211,153,0.25)",
                    display: "flex", alignItems: "center", justifyContent: "center",
                  }}>
                    <Check style={{ width: 14, height: 14, color: "#34d399" }} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontSize: 14, fontWeight: 700, color: T, margin: 0 }}>{service?.name} Report</p>
                    <p style={{ fontSize: 11, color: TS, margin: "2px 0 0" }}>Analysis complete</p>
                  </div>
                  <button
                    onClick={handleCopyReport}
                    style={{
                      display: "flex", alignItems: "center", gap: 5,
                      padding: "6px 12px", borderRadius: 8,
                      background: "rgba(255,255,255,0.06)", border: `1px solid rgba(255,255,255,0.09)`,
                      color: copied ? "#6ee7b7" : "#888", fontSize: 11, fontWeight: 500, cursor: "pointer",
                      transition: "color .2s",
                    }}
                  >
                    <Copy style={{ width: 11, height: 11 }} />
                    {copied ? "Copied!" : "Copy"}
                  </button>
                </div>

                {/* Score Card */}
                {reportScores && <ScoreCard scores={reportScores} />}

                {/* Report content */}
                <div style={{ padding: "20px 24px" }}>
                  {reportText
                    ? <SimpleMarkdown text={reportText} />
                    : <p style={{ fontSize: 13, color: TS }}>No report content.</p>}
                </div>

                {/* Actions */}
                <div style={{
                  padding: "0 24px 24px",
                  display: "flex", gap: 10,
                }}>
                  <button
                    onClick={onClose}
                    style={{
                      padding: "10px 20px", borderRadius: 10, fontSize: 13, fontWeight: 500, cursor: "pointer",
                      background: "rgba(255,255,255,0.06)", color: "#888",
                      border: `1px solid rgba(255,255,255,0.09)`,
                    }}
                  >
                    Close
                  </button>
                  <button
                    onClick={() => {
                      setStep(initialService ? "upload" : "service");
                      setFile(null); setText(""); setReportText(null); setReportScores(null); setApiError(null);
                      if (!initialService) setService(null);
                    }}
                    style={{
                      flex: 1,
                      display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
                      padding: "10px 20px", borderRadius: 10, fontSize: 13, fontWeight: 700, cursor: "pointer",
                      background: T, color: BG, border: "none",
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
  const accent = ACCENT[s.id] || "#888";

  const BADGE: Record<string, React.CSSProperties> = {
    "Most Used": { background: `${accent}18`, color: accent, border: `1px solid ${accent}33` },
    "Popular":   { background: `${accent}18`, color: accent, border: `1px solid ${accent}33` },
    "New":       { background: `${accent}18`, color: accent, border: `1px solid ${accent}33` },
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: i * 0.04, duration: 0.4 }}
      style={{
        background: "rgba(255,255,255,0.025)",
        border: `1px solid ${B}`,
        borderRadius: 16,
        display: "flex", flexDirection: "column",
        transition: "border-color .2s, box-shadow .2s",
        overflow: "hidden",
        fontFamily: SF,
      }}
      onMouseEnter={e => {
        const el = e.currentTarget as HTMLElement;
        el.style.borderColor = `${accent}44`;
        el.style.boxShadow = `0 8px 32px rgba(0,0,0,0.4), 0 0 0 1px ${accent}22`;
      }}
      onMouseLeave={e => {
        const el = e.currentTarget as HTMLElement;
        el.style.borderColor = B;
        el.style.boxShadow = "none";
      }}
    >
      <div style={{ padding: "20px", display: "flex", flexDirection: "column", gap: 14, flex: 1 }}>
        {/* Header */}
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{
              width: 38, height: 38, borderRadius: 11,
              background: `${accent}18`,
              border: `1px solid ${accent}33`,
              display: "flex", alignItems: "center", justifyContent: "center",
              color: accent, flexShrink: 0,
            }}>
              {s.icon}
            </div>
            <div>
              <p style={{ fontWeight: 700, fontSize: 13, color: T, lineHeight: 1.3, margin: 0 }}>{s.name}</p>
              <p style={{ fontSize: 11, color: TS, marginTop: 3 }}>{s.tagline}</p>
            </div>
          </div>
          {s.badge && (
            <span style={{ fontSize: 10, fontWeight: 700, padding: "3px 8px", borderRadius: 99, flexShrink: 0, marginLeft: 8, ...BADGE[s.badge] }}>
              {s.badge}
            </span>
          )}
        </div>

        {/* Description */}
        <p style={{ fontSize: 12, color: TS, lineHeight: 1.7, flex: 1, margin: 0 }}>{s.description}</p>

        {/* Features */}
        <ul style={{ display: "flex", flexDirection: "column", gap: 5, margin: 0, padding: 0, listStyle: "none" }}>
          {s.features.map(f => (
            <li key={f} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 11, color: TD }}>
              <span style={{ width: 4, height: 4, borderRadius: "50%", background: accent, flexShrink: 0, opacity: 0.6 }} />
              {f}
            </li>
          ))}
        </ul>

        {/* Footer */}
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          paddingTop: 14, borderTop: `1px solid rgba(255,255,255,0.05)`,
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 11, color: TD }}>
            <Clock style={{ width: 11, height: 11 }} />
            {s.delivery}
          </div>
          <button
            onClick={() => onLaunch(s)}
            style={{
              display: "flex", alignItems: "center", gap: 6,
              padding: "8px 16px", borderRadius: 10, fontSize: 12, fontWeight: 700,
              background: T,
              border: "none",
              color: BG, cursor: "pointer",
              transition: "opacity .15s",
            }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.opacity = "0.85"; }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.opacity = "1"; }}
          >
            <Zap style={{ width: 11, height: 11 }} />
            Analyze
          </button>
        </div>
      </div>
    </motion.div>
  );
}

/* ─── History Card ────────────────────────────────────────── */

function HistoryCard({ entry }: { entry: HistoryEntry }) {
  const accent = ACCENT[entry.serviceId] || "#888";
  const scoreColor = (entry.overallScore ?? 0) > 75 ? "#34d399" : (entry.overallScore ?? 0) > 50 ? "#fbbf24" : "#f87171";
  const dateStr = new Date(entry.date).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });

  return (
    <div style={{
      display: "flex", alignItems: "center", gap: 14,
      padding: "14px 18px",
      background: "rgba(255,255,255,0.025)",
      border: `1px solid ${B}`,
      borderRadius: 12,
      fontFamily: SF,
    }}>
      <div style={{
        width: 8, height: 8, borderRadius: "50%",
        background: accent, flexShrink: 0,
      }} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ fontSize: 13, fontWeight: 600, color: T, margin: 0 }}>{entry.serviceName}</p>
        <p style={{ fontSize: 11, color: TD, margin: "2px 0 0" }}>
          {dateStr}{entry.bookTitle ? ` \u00b7 ${entry.bookTitle}` : ""}
        </p>
      </div>
      {entry.overallScore != null && (
        <div style={{
          display: "flex", alignItems: "center", gap: 6,
          padding: "4px 10px", borderRadius: 8,
          background: `${scoreColor}15`,
          border: `1px solid ${scoreColor}30`,
        }}>
          <BarChart3 style={{ width: 12, height: 12, color: scoreColor }} />
          <span style={{ fontSize: 12, fontWeight: 700, color: scoreColor }}>{entry.overallScore}</span>
        </div>
      )}
    </div>
  );
}

/* ─── Page ────────────────────────────────────────────────── */

export default function Marketplace() {
  const [cat, setCat] = useState<Category>("all");
  const [q, setQ] = useState("");
  const [modal, setModal] = useState<AIService | null | undefined>(undefined);
  const [usage, setUsage] = useState<UsageInfo | null>(null);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [historyLoaded, setHistoryLoaded] = useState(false);

  // Fetch usage info
  const fetchUsage = useCallback(() => {
    fetch(`${BASE}/api/marketplace/usage`, { credentials: "include" })
      .then(r => r.ok ? r.json() : null)
      .then(data => { if (data) setUsage(data); })
      .catch(() => {});
  }, []);

  // Fetch history
  const fetchHistory = useCallback(() => {
    fetch(`${BASE}/api/marketplace/history`, { credentials: "include" })
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (Array.isArray(data)) {
          setHistory(data);
          setHistoryLoaded(true);
        }
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    fetchUsage();
    fetchHistory();
  }, [fetchUsage, fetchHistory]);

  const handleAnalysisComplete = useCallback(() => {
    fetchUsage();
    fetchHistory();
  }, [fetchUsage, fetchHistory]);

  const filtered = SERVICES.filter(s => {
    const catOk = cat === "all" || s.category === cat;
    const qLow = q.toLowerCase();
    const qOk = !q || s.name.toLowerCase().includes(qLow) || s.tagline.toLowerCase().includes(qLow);
    return catOk && qOk;
  });

  return (
    <Layout isLanding darkNav>
    <div style={{ minHeight: "100vh", background: BG, color: "#f0f0f0", fontFamily: SF }}>

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
            fontSize: 13, color: TD, marginBottom: 48,
            textDecoration: "none", transition: "color .2s",
          }}
          onMouseEnter={(e: React.MouseEvent<HTMLAnchorElement>) => { e.currentTarget.style.color = T; }}
          onMouseLeave={(e: React.MouseEvent<HTMLAnchorElement>) => { e.currentTarget.style.color = TD; }}
        >
          <ArrowLeft style={{ width: 15, height: 15 }} />
          Back to Home
        </Link>

        {/* Hero */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 0, marginBottom: 48 }}
        >
          <div style={{ maxWidth: 640, textAlign: "center" }}>
            <h1 style={{ fontSize: 46, fontWeight: 800, lineHeight: 1.06, color: T, margin: 0, fontFamily: SF }}>
              Every publishing service,<br />
              <span style={{ color: T }}>powered by AI.</span>
            </h1>
            <p style={{ marginTop: 16, fontSize: 15, color: TS, lineHeight: 1.65 }}>
              Professional editorial, design, and marketing delivered in minutes. No waitlists. No humans.
            </p>
          </div>

          {/* Usage badge */}
          {usage && usage.limit > 0 && (
            <div style={{
              marginTop: 20,
              display: "inline-flex", alignItems: "center", gap: 8,
              padding: "7px 16px", borderRadius: 99,
              background: "rgba(255,255,255,0.05)",
              border: `1px solid ${B}`,
            }}>
              <BarChart3 style={{ width: 13, height: 13, color: TS }} />
              <span style={{ fontSize: 12, color: TS }}>
                {usage.used} of {usage.limit} analyses used this month
              </span>
            </div>
          )}
        </motion.div>

        {/* Controls */}
        <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 12, marginBottom: 28 }}>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {CATEGORIES.map(c => (
              <button
                key={c.id}
                onClick={() => setCat(c.id)}
                style={{
                  padding: "7px 16px", borderRadius: 99, fontSize: 13, fontWeight: 500,
                  cursor: "pointer", transition: "all .15s", fontFamily: SF,
                  background: cat === c.id ? T : "rgba(255,255,255,0.05)",
                  color: cat === c.id ? BG : TS,
                  border: cat === c.id ? "none" : `1px solid ${B}`,
                }}
              >
                {c.label}
              </button>
            ))}
          </div>

          <div style={{ position: "relative", marginLeft: "auto" }}>
            <Search style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", width: 14, height: 14, color: TD, pointerEvents: "none" }} />
            <input
              placeholder="Search services..."
              value={q}
              onChange={e => setQ(e.target.value)}
              style={{
                paddingLeft: 36, paddingRight: q ? 32 : 14, paddingTop: 8, paddingBottom: 8,
                borderRadius: 12, fontSize: 13, outline: "none", width: 200,
                background: "rgba(255,255,255,0.05)", border: `1px solid ${B}`,
                color: "#f0f0f0", fontFamily: SF,
              }}
            />
            {q && (
              <button onClick={() => setQ("")} style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: TD }}>
                <X style={{ width: 13, height: 13 }} />
              </button>
            )}
          </div>
        </div>

        <p style={{ fontSize: 12, color: TD, marginBottom: 20 }}>
          {filtered.length} service{filtered.length !== 1 ? "s" : ""} available
        </p>

        {/* Grid */}
        {filtered.length === 0 ? (
          <div style={{ textAlign: "center", padding: "80px 0", color: TD }}>
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

        {/* Recent Analyses */}
        {historyLoaded && history.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            style={{ marginTop: 56 }}
          >
            <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.22em", textTransform: "uppercase", color: TD, marginBottom: 8 }}>History</p>
            <h2 style={{ fontSize: 22, fontWeight: 700, color: T, marginBottom: 20, marginTop: 0, fontFamily: SF }}>Recent Analyses</h2>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {history.slice(0, 10).map((entry, idx) => (
                <HistoryCard key={idx} entry={entry} />
              ))}
            </div>
          </motion.div>
        )}

        {/* How it works */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.45 }}
          style={{
            marginTop: 64, borderRadius: 20, padding: "40px 32px",
            background: "rgba(255,255,255,0.02)", border: `1px solid rgba(255,255,255,0.05)`,
          }}
        >
          <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.22em", textTransform: "uppercase", textAlign: "center", color: TD, marginBottom: 8 }}>Process</p>
          <h2 style={{ fontSize: 22, fontWeight: 700, textAlign: "center", color: T, marginBottom: 36, marginTop: 0, fontFamily: SF }}>Ready in three steps</h2>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 32 }}>
            {[
              { n: "01", icon: <Palette style={{ width: 20, height: 20 }} />, title: "Select a Service", desc: "Pick the AI service that fits where you are in the writing process." },
              { n: "02", icon: <Upload style={{ width: 20, height: 20 }} />, title: "Upload Manuscript", desc: "Drop your file or paste text. Supports PDF, DOCX, and TXT." },
              { n: "03", icon: <Zap style={{ width: 20, height: 20 }} />, title: "Get Results Instantly", desc: "Receive a professional-grade report in minutes, ready to apply." },
            ].map(st => (
              <div key={st.n} style={{ display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center", gap: 12 }}>
                <div style={{
                  width: 48, height: 48, borderRadius: 14,
                  background: "rgba(255,255,255,0.05)", border: `1px solid ${B}`,
                  display: "flex", alignItems: "center", justifyContent: "center", color: TS,
                }}>
                  {st.icon}
                </div>
                <div>
                  <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.2em", color: TD, marginBottom: 6 }}>{st.n}</p>
                  <p style={{ fontWeight: 600, fontSize: 13, color: T, marginBottom: 6 }}>{st.title}</p>
                  <p style={{ fontSize: 12, color: TS, lineHeight: 1.65 }}>{st.desc}</p>
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
            usage={usage}
            onAnalysisComplete={handleAnalysisComplete}
          />
        )}
      </AnimatePresence>
    </div>
    </Layout>
  );
}
