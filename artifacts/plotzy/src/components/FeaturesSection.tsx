import { useEffect, useRef, useState } from "react";
import { motion, useInView, AnimatePresence } from "framer-motion";

const SF = `-apple-system, BlinkMacSystemFont, "SF Pro Display", "SF Pro Text", "Helvetica Neue", sans-serif`;

function Cursor() {
  return (
    <span style={{
      display: "inline-block", width: 2, height: "0.85em",
      background: "rgba(255,255,255,0.8)", verticalAlign: "text-bottom",
      marginLeft: 2, borderRadius: 1, animation: "fBlink 0.9s step-end infinite",
    }} />
  );
}

/* ════════════════════════════════════════
   CARD 1 — Chapter Editor
════════════════════════════════════════ */
const CH_LINES = [
  { t: "title", text: "Chapter 7 — The Return" },
  { t: "blank", text: "" },
  { t: "prose", text: "The village looked exactly the same, and that was the worst part." },
  { t: "prose", text: "Elena had expected something to have changed in three years —" },
  { t: "prose", text: "a new face, a demolished wall. But nothing moved." },
];

function ChapterEditorCard() {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-60px" });
  const [chars, setChars] = useState(0);
  const full = CH_LINES.map(l => l.text).join("\n");
  const started = useRef(false);

  useEffect(() => {
    if (!inView || started.current) return;
    started.current = true;
    let i = 0;
    const tick = () => {
      i++;
      setChars(i);
      if (i < full.length) setTimeout(tick, full[i - 1] === " " ? 45 : full[i - 1] === "," ? 110 : 24);
    };
    setTimeout(tick, 400);
  }, [inView, full]);

  let rem = chars;
  const rows = CH_LINES.map((line, idx) => {
    const content = full.slice(0, rem).split("\n")[idx] ?? "";
    rem -= line.text.length + 1;
    return { ...line, content };
  });
  const activeIdx = rows.findIndex((_, i) => {
    let used = 0;
    for (let j = 0; j <= i; j++) used += CH_LINES[j].text.length + 1;
    return chars < used;
  });

  const words = rows.reduce((s, r) => s + r.content.split(" ").filter(Boolean).length, 0);

  return (
    <div ref={ref} className="h-full flex flex-col">
      <div className="flex items-center gap-3 mb-3 pb-3 border-b border-white/6">
        <div className="flex gap-1.5">
          {["#ff5f57","#febc2e","#28c840"].map(c => <div key={c} style={{ width: 11, height: 11, borderRadius: "50%", background: c }} />)}
        </div>
        <div className="flex gap-1.5 mx-3">
          {["B","I","U","¶","H1","H2"].map(b => (
            <div key={b} className="h-5 px-1.5 rounded bg-white/6 flex items-center justify-center text-white/40 text-[10px] font-bold" style={{ fontFamily: SF }}>{b}</div>
          ))}
        </div>
        <div className="ml-auto text-white/25 text-[10px]" style={{ fontFamily: SF }}>{words > 0 ? `${words} words` : ""}</div>
      </div>
      <div className="flex-1 flex gap-3 overflow-hidden">
        <div className="flex flex-col gap-0.5 pt-0.5 flex-shrink-0">
          {CH_LINES.map((_, i) => (
            <div key={i} className="text-white/15 text-[9px] w-3 text-right leading-[2]" style={{ fontFamily: "monospace" }}>{i + 1}</div>
          ))}
        </div>
        <div className="flex-1 space-y-1.5">
          {rows.map((row, i) => (
            <p key={i} className={`leading-relaxed ${row.t === "title" ? "text-white font-semibold text-sm" : row.t === "blank" ? "h-2.5" : "text-white/55 text-xs font-light"}`}
              style={{ fontFamily: row.t === "title" ? SF : `Georgia, "Times New Roman", serif` }}>
              {row.content}
              {(i === (activeIdx === -1 ? CH_LINES.length - 1 : activeIdx)) && chars < full.length && <Cursor />}
              {chars >= full.length && i === CH_LINES.length - 1 && <Cursor />}
            </p>
          ))}
        </div>
      </div>
      <div className="mt-3 pt-2.5 border-t border-white/6 flex gap-2">
        {["Ch. 1", "Ch. 2", "Ch. 3", "… Ch. 7"].map((c, i) => (
          <span key={i} className={`text-[10px] px-2 py-0.5 rounded-full ${i === 3 ? "bg-white/14 text-white/65" : "text-white/25"}`} style={{ fontFamily: SF }}>{c}</span>
        ))}
      </div>
    </div>
  );
}

/* ════════════════════════════════════════
   CARD 2 — AI Writing Assistant
════════════════════════════════════════ */
const AI_PROMPT = "Continue the scene. Elena just found the letter in the drawer.";
const AI_TEXT = `She didn't dare unfold it. Instead, she held it by the edges the way you hold something that might dissolve — or detonate. Her name was on the front in his handwriting: careful, deliberate.

She hadn't.`;

function AICard() {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-60px" });
  const [phase, setPhase] = useState(0);
  const [typed, setTyped] = useState("");
  const started = useRef(false);

  useEffect(() => {
    if (!inView || started.current) return;
    started.current = true;
    setTimeout(() => setPhase(1), 400);
    setTimeout(() => setPhase(2), 1800);
    setTimeout(() => setPhase(3), 3000);
  }, [inView]);

  useEffect(() => {
    if (phase !== 3) return;
    let i = 0;
    const tick = () => {
      i++;
      setTyped(AI_TEXT.slice(0, i));
      if (i < AI_TEXT.length) setTimeout(tick, AI_TEXT[i - 1] === "\n" ? 180 : AI_TEXT[i - 1] === "," ? 90 : 17);
    };
    setTimeout(tick, 80);
  }, [phase]);

  return (
    <div ref={ref} className="h-full flex flex-col gap-3">
      <div className="flex items-center gap-2 pb-2 border-b border-white/6">
        <div className="w-1.5 h-1.5 rounded-full bg-white/40 animate-pulse" />
        <span className="text-white/30 text-[10px] font-bold uppercase tracking-widest flex-1" style={{ fontFamily: SF }}>Plotzy AI</span>
        <span className="text-white/20 text-[10px]" style={{ fontFamily: SF }}>Context: Ch. 7</span>
      </div>
      <div className="flex-1 flex flex-col gap-3 overflow-hidden justify-end">
        <AnimatePresence>
          {phase >= 1 && (
            <motion.div key="u" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
              className="self-start bg-white/6 rounded-xl px-4 py-2.5 max-w-[85%]">
              <p className="text-white/55 text-xs leading-relaxed" style={{ fontFamily: SF }}>{AI_PROMPT}</p>
            </motion.div>
          )}
          {phase === 2 && (
            <motion.div key="dots" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="self-end flex items-center gap-2">
              <span className="text-white/25 text-[10px]" style={{ fontFamily: SF }}>Writing</span>
              <div className="flex gap-1">
                {[0,1,2].map(i => <div key={i} style={{ width: 4, height: 4, borderRadius: "50%", background: "rgba(255,255,255,0.3)", animation: `fBounce 0.9s ease ${i*0.15}s infinite` }} />)}
              </div>
            </motion.div>
          )}
          {phase >= 3 && (
            <motion.div key="ai" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
              className="self-end bg-white/8 border border-white/10 rounded-xl px-4 py-3 max-w-[95%]">
              <div className="flex items-center gap-1.5 mb-2">
                <div className="w-1.5 h-1.5 rounded-full bg-white/30" />
                <span className="text-white/30 text-[9px] font-bold uppercase tracking-widest" style={{ fontFamily: SF }}>Plotzy AI</span>
              </div>
              <p className="text-white/65 text-xs leading-[1.75] whitespace-pre-line" style={{ fontFamily: `Georgia, serif` }}>
                {typed}{typed.length < AI_TEXT.length && <Cursor />}
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
      <div className="flex items-center gap-2 bg-white/4 border border-white/8 rounded-xl px-3 py-2">
        <span className="flex-1 text-white/20 text-[11px]" style={{ fontFamily: SF }}>Ask anything about your story…</span>
        <div className="w-5 h-5 rounded-lg bg-white/10 flex items-center justify-center">
          <svg width="9" height="9" viewBox="0 0 9 9" fill="none"><path d="M1 4.5h7M4.5 1l3.5 3.5L4.5 8" stroke="rgba(255,255,255,0.35)" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/></svg>
        </div>
      </div>
    </div>
  );
}

/* ════════════════════════════════════════
   CARD 3 — Print Preview
════════════════════════════════════════ */
function PrintCard() {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-40px" });
  return (
    <div ref={ref} className="h-full flex flex-col justify-between">
      <p className="text-white/25 text-[10px] font-bold uppercase tracking-widest mb-4" style={{ fontFamily: SF }}>Print Preview</p>
      <div className="flex gap-3 items-end justify-center flex-1 mb-4">
        {[{ h: "VII", lines: [100,88,95,72,100] }, { h: null, pg: "3", lines: [100,90,85,78,60] }].map((page, pi) => (
          <motion.div key={pi}
            initial={{ opacity: 0, y: 16 }} animate={inView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.6, delay: pi * 0.14 }}
            className="bg-white rounded-lg shadow-[0_12px_40px_rgba(0,0,0,0.55)] overflow-hidden flex-shrink-0"
            style={{ width: 86, height: 116 }}>
            <div className="bg-[#f0ece4] border-b border-[#e0dbd0] px-2.5 py-1.5 flex justify-between items-center">
              <div className="w-5 h-px bg-[#ccc]" />
              <span className="text-[7px] text-[#aaa]" style={{ fontFamily: "Georgia, serif" }}>{page.h ?? page.pg}</span>
            </div>
            <div className="p-2.5">
              {page.h && <div className="text-center text-[7px] text-[#999] mb-2" style={{ fontFamily: "Georgia, serif" }}>{page.h}</div>}
              {page.lines.map((w, li) => <div key={li} className="h-[4.5px] rounded bg-[#ddd] mb-1.5" style={{ width: `${w}%` }} />)}
            </div>
          </motion.div>
        ))}
      </div>
      <div>
        <p className="text-white font-semibold text-sm mb-1.5 leading-snug" style={{ fontFamily: SF }}>See your book exactly as it will print</p>
        <p className="text-white/40 text-xs leading-relaxed" style={{ fontFamily: SF }}>Two-page spread with real margins, chapter breaks, and page numbers — export to PDF when ready.</p>
      </div>
    </div>
  );
}

/* ════════════════════════════════════════
   CARD 4 — AI Cover Generator
════════════════════════════════════════ */
const COVERS = [
  { bg: "linear-gradient(150deg,#0f0c29,#302b63,#24243e)", title: "Echoes", accent: "#a78bfa", sub: "A Novel" },
  { bg: "linear-gradient(150deg,#1a0800,#6b2d00,#f97316)", title: "Ember", accent: "#fb923c", sub: "Fiction" },
  { bg: "linear-gradient(150deg,#001c2e,#003d5b,#00b4d8)", title: "Tide", accent: "#38bdf8", sub: "A Story" },
  { bg: "linear-gradient(150deg,#12001a,#2a003a,#c026d3)", title: "Veil", accent: "#e879f9", sub: "Thriller" },
];

function CoverCard() {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-40px" });
  const [active, setActive] = useState(0);
  useEffect(() => {
    if (!inView) return;
    const id = setInterval(() => setActive(a => (a + 1) % COVERS.length), 2400);
    return () => clearInterval(id);
  }, [inView]);
  const c = COVERS[active];
  return (
    <div ref={ref} className="h-full flex flex-col gap-3">
      <p className="text-white/25 text-[10px] font-bold uppercase tracking-widest" style={{ fontFamily: SF }}>AI Cover Generator</p>
      <div className="flex-1 flex items-center justify-center">
        <AnimatePresence mode="wait">
          <motion.div key={active}
            initial={{ opacity: 0, scale: 0.84, rotateY: -15 }}
            animate={{ opacity: 1, scale: 1, rotateY: 0 }}
            exit={{ opacity: 0, scale: 0.9, rotateY: 12 }}
            transition={{ duration: 0.5, ease: [0.4, 0, 0.2, 1] }}
            className="rounded-xl overflow-hidden relative flex-shrink-0"
            style={{ width: 88, height: 126, background: c.bg, boxShadow: `0 20px 56px rgba(0,0,0,0.65), inset 0 0 0 1px rgba(255,255,255,0.07)` }}>
            <div className="absolute inset-0 flex flex-col justify-end p-3">
              <div className="w-full h-px mb-2" style={{ background: c.accent, opacity: 0.8 }} />
              <div className="text-white font-bold text-sm leading-tight" style={{ fontFamily: SF }}>{c.title}</div>
              <div className="text-white/40 text-[8px] tracking-[0.2em] uppercase mt-0.5" style={{ fontFamily: SF }}>{c.sub}</div>
            </div>
            <div className="absolute top-0 inset-x-0 h-1/2" style={{ background: "linear-gradient(to bottom,rgba(255,255,255,0.05),transparent)" }} />
          </motion.div>
        </AnimatePresence>
      </div>
      <p className="text-white font-semibold text-sm leading-snug" style={{ fontFamily: SF }}>Professional covers in seconds</p>
      <p className="text-white/40 text-xs leading-relaxed" style={{ fontFamily: SF }}>Describe your book's mood and Plotzy generates a unique cover — no design skills needed.</p>
    </div>
  );
}

/* ════════════════════════════════════════
   CARD 5 — Book Library
════════════════════════════════════════ */
const BOOKS = [
  { title: "Echoes of Rain", chapters: 12, color: "#302b63" },
  { title: "The Last Cartographer", chapters: 7, color: "#4a1a00" },
  { title: "Salt & Starlight", chapters: 19, color: "#001c2e" },
];
function LibraryCard() {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-40px" });
  return (
    <div ref={ref} className="h-full flex flex-col justify-between">
      <p className="text-white/25 text-[10px] font-bold uppercase tracking-widest mb-4" style={{ fontFamily: SF }}>Book Library</p>
      <div className="flex-1 flex flex-col gap-2">
        {BOOKS.map((b, i) => (
          <motion.div key={b.title}
            initial={{ opacity: 0, x: -14 }} animate={inView ? { opacity: 1, x: 0 } : {}}
            transition={{ duration: 0.4, delay: i * 0.1 + 0.15 }}
            className="flex items-center gap-3 bg-white/4 rounded-xl px-3 py-2.5 border border-white/6">
            <div className="w-7 h-9 rounded flex-shrink-0 shadow-[0_3px_10px_rgba(0,0,0,0.45)]" style={{ background: b.color }} />
            <div className="flex-1 min-w-0">
              <div className="text-white/65 text-xs font-medium truncate" style={{ fontFamily: SF }}>{b.title}</div>
              <div className="text-white/25 text-[10px]" style={{ fontFamily: SF }}>{b.chapters} chapters</div>
            </div>
            <svg width="6" height="10" viewBox="0 0 6 10" fill="none"><path d="M1 1l4 4-4 4" stroke="rgba(255,255,255,0.2)" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/></svg>
          </motion.div>
        ))}
      </div>
      <p className="text-white/35 text-xs leading-relaxed mt-3" style={{ fontFamily: SF }}>All your books in one place — organized and always ready to continue.</p>
    </div>
  );
}

/* ════════════════════════════════════════
   CARD 6 — Article / Blog Editor
════════════════════════════════════════ */
const ATAGS = ["Fiction", "Short Story", "Memoir", "Essay", "Review", "Interview"];
function ArticleCard() {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-40px" });
  return (
    <div ref={ref} className="h-full flex gap-6 items-center">
      <div className="flex-shrink-0 w-[190px]">
        <div className="bg-[#0d0d0d] rounded-xl border border-white/6 p-4">
          <div className="w-full h-14 rounded-lg bg-white/5 border border-white/6 mb-3 flex items-center justify-center">
            <svg width="20" height="14" viewBox="0 0 20 14" fill="none"><rect x="0.5" y="0.5" width="19" height="13" rx="1.5" stroke="rgba(255,255,255,0.15)"/><circle cx="6" cy="4.5" r="1.5" stroke="rgba(255,255,255,0.2)"/><path d="M0.5 9.5L5 6.5L8.5 9.5L13 7L19.5 10.5" stroke="rgba(255,255,255,0.2)" strokeWidth="0.8" strokeLinecap="round"/></svg>
          </div>
          <div className="inline-flex items-center gap-1.5 bg-white/8 rounded-full px-2 py-0.5 mb-2">
            <div className="w-1.5 h-1.5 rounded-full bg-violet-400" />
            <span className="text-white/45 text-[9px]" style={{ fontFamily: SF }}>Fiction</span>
          </div>
          <div className="space-y-1.5 mb-3">
            <div className="h-2.5 rounded bg-white/20 w-full" />
            <div className="h-2.5 rounded bg-white/12 w-3/4" />
          </div>
          {[100,88,95,72].map((w,i) => <div key={i} className="h-1.5 rounded bg-white/6 mb-1.5" style={{ width:`${w}%` }} />)}
          <div className="flex items-center gap-2 mt-3 pt-2 border-t border-white/6">
            <span className="text-white/25 text-[9px]" style={{ fontFamily: SF }}>540 words</span>
            <div className="flex-1 h-1 rounded bg-white/6 overflow-hidden">
              <motion.div className="h-full rounded bg-white/30"
                initial={{ width: 0 }} animate={inView ? { width: "54%" } : {}}
                transition={{ duration: 1.2, delay: 0.5, ease: "easeOut" }} />
            </div>
            <span className="text-white/20 text-[9px]" style={{ fontFamily: SF }}>1k goal</span>
          </div>
        </div>
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-white/25 text-[10px] font-bold uppercase tracking-widest mb-3" style={{ fontFamily: SF }}>Article & Blog Editor</p>
        <p className="text-white font-semibold text-sm mb-2 leading-snug" style={{ fontFamily: SF }}>Write beyond the book</p>
        <p className="text-white/40 text-xs leading-relaxed mb-3" style={{ fontFamily: SF }}>
          A dedicated editor for articles, essays, and blog posts — with featured images, categories, word-goal tracking, and a clean reading preview.
        </p>
        <div className="flex flex-wrap gap-1.5">
          {ATAGS.map((t, i) => (
            <motion.span key={t}
              initial={{ opacity: 0, scale: 0.85 }} animate={inView ? { opacity: 1, scale: 1 } : {}}
              transition={{ delay: i * 0.07 + 0.3 }}
              className="text-[10px] px-2.5 py-1 rounded-full border border-white/10 text-white/35" style={{ fontFamily: SF }}>
              {t}
            </motion.span>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ════════════════════════════════════════
   CARD 7 — Writing Calendar / Streak
════════════════════════════════════════ */
const DAYS = ["M","T","W","T","F","S","S"];
function makeHeatmap() {
  const pattern = [0, 0, 1, 2, 0, 3, 2, 1, 2, 3, 0, 2, 3, 2, 1, 3, 2, 3, 3, 2, 0, 3, 2, 3, 3, 2, 3, 2];
  return pattern; // 4 weeks × 7 days
}

function CalendarCard() {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-40px" });
  const [revealed, setRevealed] = useState(0);
  const [streakCount, setStreakCount] = useState(0);
  const cells = makeHeatmap();
  const STREAK = 14;

  useEffect(() => {
    if (!inView) return;
    let i = 0;
    const id = setInterval(() => {
      i++;
      setRevealed(i);
      if (i >= cells.length) clearInterval(id);
    }, 45);
    const sid = setInterval(() => {
      setStreakCount(c => { if (c >= STREAK) { clearInterval(sid); return c; } return c + 1; });
    }, 60);
    return () => { clearInterval(id); clearInterval(sid); };
  }, [inView]);

  const intensityColor = (v: number) => {
    if (v === 0) return "rgba(255,255,255,0.05)";
    if (v === 1) return "rgba(255,255,255,0.18)";
    if (v === 2) return "rgba(255,255,255,0.45)";
    return "rgba(255,255,255,0.85)";
  };

  return (
    <div ref={ref} className="h-full flex flex-col justify-between">
      <div>
        <p className="text-white/25 text-[10px] font-bold uppercase tracking-widest mb-4" style={{ fontFamily: SF }}>Writing Calendar</p>
        <div className="flex gap-1.5 mb-1.5">
          {DAYS.map((d, i) => (
            <div key={i} className="w-[28px] text-center text-[9px] text-white/25" style={{ fontFamily: SF }}>{d}</div>
          ))}
        </div>
        <div className="grid gap-1.5" style={{ gridTemplateColumns: "repeat(7, 28px)" }}>
          {cells.map((v, i) => (
            <motion.div key={i}
              initial={{ scale: 0, opacity: 0 }}
              animate={i < revealed ? { scale: 1, opacity: 1 } : {}}
              transition={{ duration: 0.25, ease: "backOut" }}
              className="w-[28px] h-[28px] rounded-md"
              style={{ background: intensityColor(v) }}
            />
          ))}
        </div>
      </div>
      <div className="mt-4 flex items-end justify-between">
        <div>
          <div className="flex items-baseline gap-1.5">
            <span className="text-white text-3xl font-bold tracking-tight" style={{ fontFamily: SF }}>{streakCount}</span>
            <span className="text-white/40 text-xs" style={{ fontFamily: SF }}>day streak</span>
            <span className="text-lg">🔥</span>
          </div>
          <p className="text-white/35 text-xs mt-1" style={{ fontFamily: SF }}>
            Track every writing session. Keep your momentum alive.
          </p>
        </div>
      </div>
    </div>
  );
}

/* ════════════════════════════════════════
   CARD 8 — Achievements
════════════════════════════════════════ */
const BADGES = [
  { icon: "🌱", name: "First Words",       desc: "Write your first chapter",          rarity: "common",    color: "#4ade80" },
  { icon: "✍️", name: "Apprentice Scribe",  desc: "Write your first 5,000 words",     rarity: "common",    color: "#60a5fa" },
  { icon: "🚀", name: "Published!",         desc: "Publish your first book",           rarity: "rare",      color: "#a78bfa" },
  { icon: "🔥", name: "Week of Words",      desc: "Maintain a 7-day writing streak",   rarity: "common",    color: "#fb923c" },
  { icon: "📖", name: "Novel Crafter",      desc: "Write 60,000 words",               rarity: "rare",      color: "#f472b6" },
  { icon: "💎", name: "Month of Mastery",   desc: "Maintain a 30-day writing streak",  rarity: "legendary", color: "#e879f9" },
];

const rarityLabel: Record<string, string> = { common: "Common", rare: "Rare", legendary: "Legendary" };

function AchievementsCard() {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-40px" });
  const [shown, setShown] = useState(0);

  useEffect(() => {
    if (!inView) return;
    let i = 0;
    const id = setInterval(() => {
      i++;
      setShown(i);
      if (i >= BADGES.length) clearInterval(id);
    }, 300);
    return () => clearInterval(id);
  }, [inView]);

  return (
    <div ref={ref} className="h-full flex flex-col">
      <p className="text-white/25 text-[10px] font-bold uppercase tracking-widest mb-4" style={{ fontFamily: SF }}>Achievements</p>
      <div className="flex-1 grid grid-cols-2 gap-2.5 content-start">
        {BADGES.map((b, i) => (
          <AnimatePresence key={b.name}>
            {i < shown && (
              <motion.div
                initial={{ opacity: 0, scale: 0.75, y: 10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                transition={{ type: "spring", stiffness: 300, damping: 20 }}
                className="bg-white/4 border border-white/8 rounded-xl p-2.5 flex items-start gap-2"
              >
                <div className="text-lg flex-shrink-0 leading-none mt-0.5">{b.icon}</div>
                <div className="min-w-0">
                  <div className="text-white/65 text-[10px] font-semibold leading-tight truncate" style={{ fontFamily: SF }}>{b.name}</div>
                  <div className="text-[9px] mt-0.5 font-medium" style={{ color: b.color, fontFamily: SF }}>{rarityLabel[b.rarity]}</div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        ))}
      </div>
      <p className="text-white/30 text-xs mt-3 leading-relaxed" style={{ fontFamily: SF }}>Unlock badges as you write, publish, and grow as an author.</p>
    </div>
  );
}

/* ════════════════════════════════════════
   CARD 9 — Outline Board
════════════════════════════════════════ */
const ACTS = [
  { label: "Act I — Setup", beats: ["The ordinary world", "Call to adventure"] },
  { label: "Act II — Conflict", beats: ["Crossing the threshold", "Tests & allies", "The ordeal"] },
  { label: "Act III — Resolution", beats: ["The road back", "Return transformed"] },
];

function OutlineCard() {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-40px" });

  return (
    <div ref={ref} className="h-full flex flex-col">
      <p className="text-white/25 text-[10px] font-bold uppercase tracking-widest mb-4" style={{ fontFamily: SF }}>Story Outline Board</p>
      <div className="flex gap-3 flex-1">
        {ACTS.map((act, ai) => (
          <div key={ai} className="flex-1 flex flex-col gap-2">
            <div className="text-white/30 text-[9px] font-semibold pb-1.5 border-b border-white/6" style={{ fontFamily: SF }}>{act.label}</div>
            {act.beats.map((beat, bi) => (
              <motion.div key={beat}
                initial={{ opacity: 0, y: 8 }}
                animate={inView ? { opacity: 1, y: 0 } : {}}
                transition={{ delay: ai * 0.1 + bi * 0.1 + 0.2, duration: 0.4 }}
                className="bg-white/5 border border-white/8 rounded-lg px-2.5 py-2">
                <p className="text-white/50 text-[10px] leading-snug" style={{ fontFamily: SF }}>{beat}</p>
              </motion.div>
            ))}
          </div>
        ))}
      </div>
      <p className="text-white/30 text-xs mt-4 leading-relaxed" style={{ fontFamily: SF }}>
        Map your entire story before writing a word — drag story beats across acts to restructure your narrative.
      </p>
    </div>
  );
}

/* ════════════════════════════════════════
   CARD 10 — Story Bible (Characters & Lore)
════════════════════════════════════════ */
const CHARS = [
  { name: "Elena Vasquez", role: "Protagonist", traits: ["Determined", "Secretive", "Loyal"], color: "#302b63" },
  { name: "Marcus Webb",   role: "Antagonist",  traits: ["Calculating", "Charming"],           color: "#4a1a00" },
];

function StoryBibleCard() {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-40px" });
  const [active, setActive] = useState(0);

  useEffect(() => {
    if (!inView) return;
    const id = setInterval(() => setActive(a => (a + 1) % CHARS.length), 3000);
    return () => clearInterval(id);
  }, [inView]);

  const tabs = ["Characters", "Locations", "Items", "Magic"];

  return (
    <div ref={ref} className="h-full flex flex-col">
      <p className="text-white/25 text-[10px] font-bold uppercase tracking-widest mb-3" style={{ fontFamily: SF }}>Story Bible</p>
      <div className="flex gap-1.5 mb-4">
        {tabs.map((t, i) => (
          <div key={t} className={`text-[9px] px-2.5 py-1 rounded-full ${i === 0 ? "bg-white/12 text-white/60" : "text-white/25"}`} style={{ fontFamily: SF }}>{t}</div>
        ))}
      </div>
      <div className="flex-1 relative overflow-hidden">
        <AnimatePresence mode="wait">
          <motion.div key={active}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.4 }}
            className="absolute inset-0 bg-white/4 border border-white/8 rounded-xl p-4">
            <div className="flex items-start gap-3 mb-3">
              <div className="w-9 h-9 rounded-full flex-shrink-0" style={{ background: CHARS[active].color, boxShadow: "0 2px 10px rgba(0,0,0,0.4)" }} />
              <div>
                <div className="text-white/70 text-xs font-semibold" style={{ fontFamily: SF }}>{CHARS[active].name}</div>
                <div className="text-white/30 text-[10px]" style={{ fontFamily: SF }}>{CHARS[active].role}</div>
              </div>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {CHARS[active].traits.map(trait => (
                <span key={trait} className="text-[9px] px-2 py-0.5 rounded-full bg-white/6 border border-white/10 text-white/40" style={{ fontFamily: SF }}>{trait}</span>
              ))}
            </div>
            <div className="mt-3 space-y-1.5">
              {[80, 60, 90].map((w, i) => <div key={i} className="h-1.5 rounded bg-white/6" style={{ width: `${w}%` }} />)}
            </div>
          </motion.div>
        </AnimatePresence>
      </div>
      <p className="text-white/30 text-xs mt-3 leading-relaxed" style={{ fontFamily: SF }}>Build rich character profiles, locations, items, and lore — all linked to your chapters.</p>
    </div>
  );
}

/* ════════════════════════════════════════
   CARD 11 — Ambient Soundscape
════════════════════════════════════════ */
const SOUNDS = [
  { name: "Rainstorm",    emoji: "🌧️", bars: [3,5,4,7,5,4,6,3,5,7,4,5,3,6,5] },
  { name: "Forest Birds", emoji: "🦜", bars: [2,4,6,3,5,7,4,2,5,3,6,4,5,3,7] },
  { name: "Coffee Shop",  emoji: "☕", bars: [5,3,4,6,3,5,4,7,3,5,6,4,3,5,4] },
  { name: "Soft Wind",    emoji: "🍃", bars: [2,3,5,4,3,2,4,5,3,4,2,5,3,4,2] },
];

function SoundCard() {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-40px" });
  const [active, setActive] = useState(0);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    if (!inView) return;
    const barId = setInterval(() => setTick(t => t + 1), 180);
    const switchId = setInterval(() => setActive(a => (a + 1) % SOUNDS.length), 3500);
    return () => { clearInterval(barId); clearInterval(switchId); };
  }, [inView]);

  const sound = SOUNDS[active];

  return (
    <div ref={ref} className="h-full flex flex-col justify-between">
      <div>
        <p className="text-white/25 text-[10px] font-bold uppercase tracking-widest mb-4" style={{ fontFamily: SF }}>Ambient Soundscapes</p>
        <div className="grid grid-cols-2 gap-2 mb-4">
          {SOUNDS.map((s, i) => (
            <div key={s.name}
              className={`flex items-center gap-2 px-3 py-2 rounded-xl border transition-all duration-300 cursor-default ${i === active ? "bg-white/10 border-white/15" : "bg-white/3 border-white/6"}`}>
              <span className="text-base">{s.emoji}</span>
              <span className={`text-[10px] ${i === active ? "text-white/65" : "text-white/25"}`} style={{ fontFamily: SF }}>{s.name}</span>
            </div>
          ))}
        </div>
      </div>
      <div>
        <div className="flex items-center gap-2 mb-3">
          <div className="w-1.5 h-1.5 rounded-full bg-white/50 animate-pulse" />
          <span className="text-white/40 text-[10px]" style={{ fontFamily: SF }}>Now playing: {sound.name}</span>
        </div>
        <div className="flex items-end gap-[3px] h-10">
          {sound.bars.map((h, i) => {
            const animated = Math.max(1, h + Math.sin((tick + i) * 0.7) * 2);
            return (
              <motion.div key={i}
                animate={{ height: `${(animated / 9) * 100}%`, opacity: 0.35 + (animated / 9) * 0.6 }}
                transition={{ duration: 0.18, ease: "easeInOut" }}
                className="flex-1 rounded-full bg-white" />
            );
          })}
        </div>
        <p className="text-white/30 text-xs mt-3 leading-relaxed" style={{ fontFamily: SF }}>
          Write to the sound of rain, birdsong, or a busy café — right inside the editor.
        </p>
      </div>
    </div>
  );
}

/* ════════════════════════════════════════
   CARD SHELL
════════════════════════════════════════ */
function Card({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`rounded-2xl border border-white/8 bg-white/[0.028] p-6 overflow-hidden relative transition-all duration-300 hover:border-white/14 hover:bg-white/[0.04] ${className}`}>
      {children}
    </div>
  );
}

/* ════════════════════════════════════════
   MAIN EXPORT
════════════════════════════════════════ */
export function FeaturesSection() {
  return (
    <section className="bg-[#080808] py-20 px-6 sm:px-8" style={{ fontFamily: SF }}>
      <div className="max-w-6xl mx-auto">

        {/* Header */}
        <motion.div className="text-center mb-20"
          initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }} transition={{ duration: 0.8 }}>
          <h2 className="text-[clamp(2.2rem,4.5vw,3.8rem)] font-bold text-white leading-[1.06] mb-5 tracking-tight" style={{ fontFamily: SF }}>
            Everything a writer needs,<br />
            <span className="text-white">in a single place.</span>
          </h2>
          <p className="text-white/80 text-lg font-light max-w-xl mx-auto leading-relaxed" style={{ fontFamily: SF }}>
            From the first draft to the finished book — built around how writers actually work.
          </p>
        </motion.div>

        {/* ── Row 1: Chapter Editor (2/3) + AI (1/3) ── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-4">
          <motion.div className="lg:col-span-2 min-h-[310px]"
            initial={{ opacity: 0, y: 28 }} whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }} transition={{ duration: 0.6 }}>
            <Card className="h-full">
              <div className="mb-4">
                <p className="text-white/25 text-[10px] font-bold uppercase tracking-widest mb-1" style={{ fontFamily: SF }}>Chapter Editor</p>
                <p className="text-white font-semibold text-sm leading-snug" style={{ fontFamily: SF }}>A focused space for your story</p>
                <p className="text-white/35 text-xs mt-1" style={{ fontFamily: SF }}>Rich formatting, chapter navigation, and live word count — all while staying out of your way.</p>
              </div>
              <div className="h-[210px]"><ChapterEditorCard /></div>
            </Card>
          </motion.div>
          <motion.div className="min-h-[310px]"
            initial={{ opacity: 0, y: 28 }} whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }} transition={{ duration: 0.6, delay: 0.08 }}>
            <Card className="h-full"><AICard /></Card>
          </motion.div>
        </div>

        {/* ── Row 2: Print + Cover + Library ── */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
          {[
            { delay: 0,    comp: <PrintCard /> },
            { delay: 0.07, comp: <CoverCard /> },
            { delay: 0.14, comp: <LibraryCard /> },
          ].map(({ delay, comp }, i) => (
            <motion.div key={i} className="min-h-[260px]"
              initial={{ opacity: 0, y: 28 }} whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }} transition={{ duration: 0.6, delay }}>
              <Card className="h-full">{comp}</Card>
            </motion.div>
          ))}
        </div>

        {/* ── Row 3: Article Editor (full) ── */}
        <motion.div className="mb-4 min-h-[180px]"
          initial={{ opacity: 0, y: 28 }} whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }} transition={{ duration: 0.6 }}>
          <Card className="h-full"><ArticleCard /></Card>
        </motion.div>

        {/* ── Row 4: Calendar + Achievements + Sound ── */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
          {[
            { delay: 0,    comp: <CalendarCard /> },
            { delay: 0.07, comp: <AchievementsCard /> },
            { delay: 0.14, comp: <SoundCard /> },
          ].map(({ delay, comp }, i) => (
            <motion.div key={i} className="min-h-[280px]"
              initial={{ opacity: 0, y: 28 }} whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }} transition={{ duration: 0.6, delay }}>
              <Card className="h-full">{comp}</Card>
            </motion.div>
          ))}
        </div>

        {/* ── Row 5: Outline Board (2/3) + Story Bible (1/3) ── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <motion.div className="lg:col-span-2 min-h-[250px]"
            initial={{ opacity: 0, y: 28 }} whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }} transition={{ duration: 0.6 }}>
            <Card className="h-full"><OutlineCard /></Card>
          </motion.div>
          <motion.div className="min-h-[250px]"
            initial={{ opacity: 0, y: 28 }} whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }} transition={{ duration: 0.6, delay: 0.08 }}>
            <Card className="h-full"><StoryBibleCard /></Card>
          </motion.div>
        </div>

      </div>

      <style>{`
        @keyframes fBlink  { 0%,100%{opacity:1} 50%{opacity:0} }
        @keyframes fBounce { 0%,80%,100%{transform:translateY(0)} 40%{transform:translateY(-5px)} }
      `}</style>
    </section>
  );
}
