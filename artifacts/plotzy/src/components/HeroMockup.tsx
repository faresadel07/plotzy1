import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

const SCENES = ["write", "ai", "publish", "stats"] as const;
type Scene = typeof SCENES[number];

/* ── Typewriter ─────────────────────────────── */
function TW({ text, speed = 30 }: { text: string; speed?: number }) {
  const [d, setD] = useState("");
  useEffect(() => { setD(""); }, [text]);
  useEffect(() => {
    if (d.length >= text.length) return;
    const t = setTimeout(() => setD(text.slice(0, d.length + 1)), speed);
    return () => clearTimeout(t);
  }, [d, text, speed]);
  return <>{d}</>;
}

/* ── Animated number ────────────────────────── */
function N({ to, dur = 900, pre = "", suf = "" }: { to: number; dur?: number; pre?: string; suf?: string }) {
  const [v, setV] = useState(0);
  useEffect(() => {
    setV(0);
    const s = performance.now();
    const f = (now: number) => {
      const p = Math.min((now - s) / dur, 1);
      setV(Math.floor((1 - Math.pow(1 - p, 3)) * to));
      if (p < 1) requestAnimationFrame(f);
    };
    requestAnimationFrame(f);
  }, [to, dur]);
  return <>{pre}{v.toLocaleString()}{suf}</>;
}

/* ── Shimmer bar ─────────────────────────────── */
function Bar({ pct, color, delay = 0, h = 3 }: { pct: number; color: string; delay?: number; h?: number }) {
  return (
    <div style={{ height: h, background: "rgba(255,255,255,0.04)", borderRadius: 99, overflow: "hidden" }}>
      <motion.div initial={{ width: 0 }} animate={{ width: `${pct}%` }} transition={{ duration: 0.9, delay, ease: "easeOut" }}
        style={{ height: "100%", borderRadius: 99, background: `linear-gradient(90deg, ${color}66, ${color})`, position: "relative" }}>
        <motion.div animate={{ x: ["-100%", "200%"] }} transition={{ duration: 0.95, repeat: Infinity, delay: delay + 0.2 }}
          style={{ position: "absolute", inset: 0, background: "linear-gradient(90deg, transparent, rgba(255,255,255,0.45), transparent)" }} />
      </motion.div>
    </div>
  );
}

/* ── Pulse dot ───────────────────────────────── */
function Dot({ color, size = 6 }: { color: string; size?: number }) {
  return (
    <motion.div animate={{ scale: [1, 1.7, 1], opacity: [0.6, 1, 0.6] }} transition={{ duration: 0.8, repeat: Infinity }}
      style={{ width: size, height: size, borderRadius: "50%", background: color, flexShrink: 0 }} />
  );
}

/* ══════════════════════════════════════════════
   SCENE 1 — WRITE
══════════════════════════════════════════════ */
const ANNS = [
  { t: "💡 Stronger opening?", c: "#a78bfa" },
  { t: "🔎 Passive voice here", c: "#f59e0b" },
  { t: "✦ AI rephrase ready", c: "#60a5fa" },
  { t: "📖 Show, don't tell", c: "#34d399" },
  { t: "⚡ Great pacing!", c: "#f472b6" },
  { t: "🎯 Voice consistent ✓", c: "#34d399" },
];
const CHAPTERS = [
  { n: "I. The Beginning", w: 3420, done: true },
  { n: "II. Her Return", w: 2810, done: true },
  { n: "III. The Secret", w: 3190, done: true },
  { n: "IV. Old Wounds", w: 2950, done: false },
  { n: "V. Reckoning", w: 870, done: false },
];
const TAGS = ["Literary Fiction", "Mystery", "Draft 2", "Prize Entry"];
const GOALS = [
  { label: "Daily Goal", val: 1240, max: 2000, c: "#a78bfa" },
  { label: "Chapter", val: 71, max: 100, c: "#60a5fa", pct: true },
  { label: "Draft", val: 58, max: 100, c: "#34d399", pct: true },
];

function WriteScene() {
  const [wc, setWc] = useState(24318);
  const [streak, setStreak] = useState(7);
  const [annIdx, setAnnIdx] = useState(0);
  const [showAnn, setShowAnn] = useState(false);
  const [hlLine, setHlLine] = useState(0);
  const [tagIdx, setTagIdx] = useState(0);
  const [pulse, setPulse] = useState(false);
  const [saved, setSaved] = useState(false);
  const [goalVal, setGoalVal] = useState(1240);

  useEffect(() => {
    const t = setInterval(() => {
      setWc(w => w + Math.floor(Math.random() * 7) + 2);
      setPulse(true); setTimeout(() => setPulse(false), 280);
      setGoalVal(g => Math.min(2000, g + Math.floor(Math.random() * 8) + 2));
    }, 550);
    return () => clearInterval(t);
  }, []);
  useEffect(() => {
    const t = setInterval(() => { setSaved(true); setTimeout(() => setSaved(false), 900); }, 2500);
    return () => clearInterval(t);
  }, []);
  useEffect(() => {
    const t = setInterval(() => {
      setShowAnn(true);
      setTimeout(() => { setShowAnn(false); setAnnIdx(i => (i + 1) % ANNS.length); }, 1500);
    }, 2200);
    return () => clearInterval(t);
  }, []);
  useEffect(() => {
    const t = setInterval(() => setHlLine(l => (l + 1) % 3), 1100);
    return () => clearInterval(t);
  }, []);
  useEffect(() => {
    const t = setInterval(() => setTagIdx(i => (i + 1) % TAGS.length), 1700);
    return () => clearInterval(t);
  }, []);

  const ann = ANNS[annIdx];
  const tw = "The night was darker than she remembered, and the letter had been sitting unopened on the kitchen table for three long days.";

  return (
    <motion.div key="write" initial={{ opacity: 0, x: -22 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 22 }}
      transition={{ duration: 0.28, ease: "easeOut" }}
      style={{ position: "absolute", inset: 0, display: "flex" }}>

      {/* LEFT SIDEBAR — chapters */}
      <div style={{ width: 110, borderRight: "1px solid rgba(255,255,255,0.05)", padding: "14px 10px", display: "flex", flexDirection: "column", gap: 6, flexShrink: 0 }}>
        <div style={{ fontSize: 8, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.18em", color: "#232323", marginBottom: 4 }}>Chapters</div>
        {CHAPTERS.map((ch, i) => (
          <motion.div key={ch.n} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.06, type: "spring", stiffness: 180 }}
            style={{ padding: "5px 8px", borderRadius: 6, background: i === 3 ? "rgba(167,139,250,0.1)" : "rgba(255,255,255,0.02)", border: i === 3 ? "1px solid rgba(167,139,250,0.25)" : "1px solid rgba(255,255,255,0.04)", cursor: "pointer" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 4, marginBottom: 2 }}>
              <div style={{ width: 5, height: 5, borderRadius: "50%", background: ch.done ? "#34d399" : i === 3 ? "#a78bfa" : "#2a2a2a", flexShrink: 0 }} />
              <div style={{ fontSize: 8.5, fontWeight: 600, color: i === 3 ? "#c4b5fd" : ch.done ? "#3a3a3a" : "#2a2a2a", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{ch.n}</div>
            </div>
            <div style={{ fontSize: 7.5, color: "#252525", paddingLeft: 9 }}>{ch.w.toLocaleString()}w</div>
          </motion.div>
        ))}
        {/* new chapter btn */}
        <motion.div animate={{ opacity: [0.4, 0.8, 0.4] }} transition={{ duration: 2, repeat: Infinity }}
          style={{ padding: "5px 8px", borderRadius: 6, border: "1px dashed rgba(167,139,250,0.25)", textAlign: "center", cursor: "pointer", marginTop: 2 }}>
          <span style={{ fontSize: 8.5, color: "#a78bfa" }}>+ Chapter</span>
        </motion.div>
      </div>

      {/* MAIN EDITOR */}
      <div style={{ flex: 1, padding: "14px 16px", display: "flex", flexDirection: "column", gap: 0, overflow: "hidden" }}>
        {/* topbar */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
          <div style={{ display: "flex", gap: 5, alignItems: "center" }}>
            <AnimatePresence mode="wait">
              <motion.span key={tagIdx} initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }} transition={{ duration: 0.18 }}
                style={{ fontSize: 8.5, padding: "1px 7px", borderRadius: 99, background: "rgba(167,139,250,0.1)", color: "#a78bfa", border: "1px solid rgba(167,139,250,0.2)", fontWeight: 600 }}>
                {TAGS[tagIdx]}
              </motion.span>
            </AnimatePresence>
            <AnimatePresence>
              {saved && (
                <motion.span initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.8 }}
                  style={{ fontSize: 8.5, color: "#34d399", fontWeight: 600 }}>✓ Saved</motion.span>
              )}
            </AnimatePresence>
          </div>
          <div style={{ display: "flex", gap: 5, alignItems: "center" }}>
            <motion.div animate={{ scale: pulse ? [1, 1.15, 1] : 1 }} transition={{ duration: 0.25 }}
              style={{ display: "flex", alignItems: "center", gap: 3, padding: "2px 7px", borderRadius: 99, background: "rgba(245,158,11,0.1)", border: "1px solid rgba(245,158,11,0.2)" }}>
              <span style={{ fontSize: 9 }}>🔥</span>
              <span style={{ fontSize: 9, fontWeight: 700, color: "#f59e0b" }}>{streak}d</span>
            </motion.div>
            <motion.span animate={{ color: pulse ? "#e8e8e8" : "#555" }} transition={{ duration: 0.25 }} style={{ fontSize: 10, fontWeight: 700 }}>
              {wc.toLocaleString()} w
            </motion.span>
            <div style={{ padding: "2px 8px", borderRadius: 5, fontSize: 9, fontWeight: 600, background: "rgba(167,139,250,0.18)", color: "#a78bfa", border: "1px solid rgba(167,139,250,0.3)" }}>AI ✦</div>
          </div>
        </div>

        {/* chapter heading */}
        <div style={{ fontSize: 8, fontWeight: 700, letterSpacing: "0.22em", color: "#252525", textTransform: "uppercase", marginBottom: 4 }}>Chapter XII</div>
        <div style={{ fontSize: 17, fontWeight: 700, letterSpacing: "-0.025em", color: "#e8e8e8", marginBottom: 10, display: "flex", alignItems: "center", gap: 8 }}>
          The Last Letter
          <motion.div animate={{ opacity: [0, 1, 0] }} transition={{ duration: 1.4, repeat: Infinity }} style={{ width: 5, height: 5, borderRadius: "50%", background: "#34d399" }} />
        </div>

        {/* lines with highlight */}
        <div style={{ fontSize: 10.5, lineHeight: 1.85, color: "#474747", marginBottom: 8, position: "relative" }}>
          {["The envelope had been sitting on the kitchen table for three days.", "Maria knew what was inside — she had written it herself six years ago.", "She reached for it, then pulled her hand back."].map((line, i) => (
            <motion.div key={line} animate={{ background: hlLine === i ? "rgba(167,139,250,0.08)" : "rgba(0,0,0,0)" }} transition={{ duration: 0.25 }}
              style={{ borderRadius: 3, paddingLeft: 3, marginLeft: -3 }}>{line}</motion.div>
          ))}
          <AnimatePresence>
            {showAnn && (
              <motion.div initial={{ opacity: 0, x: 12, scale: 0.88 }} animate={{ opacity: 1, x: 0, scale: 1 }} exit={{ opacity: 0, x: -12, scale: 0.88 }}
                transition={{ duration: 0.2 }}
                style={{ position: "absolute", right: 0, top: 0, padding: "3px 9px", borderRadius: 6, background: `${ann.c}1a`, border: `1px solid ${ann.c}40`, fontSize: 9, color: ann.c, fontWeight: 600, whiteSpace: "nowrap" }}>
                {ann.t}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* typewriter */}
        <div style={{ fontSize: 10.5, lineHeight: 1.85, color: "#888", marginBottom: 8 }}>
          <TW text={tw} speed={28} />
          <motion.span animate={{ opacity: [1, 0] }} transition={{ duration: 0.48, repeat: Infinity }}
            style={{ display: "inline-block", width: 1.5, height: 11, background: "#a78bfa", marginLeft: 2, borderRadius: 1, verticalAlign: "middle" }} />
        </div>

        {/* ghost lines */}
        <div style={{ display: "flex", flexDirection: "column", gap: 4, marginBottom: 10 }}>
          {[0.88, 0.65, 0.44].map((w, i) => (
            <motion.div key={i} animate={{ opacity: [0.04, 0.16, 0.04] }} transition={{ duration: 1.6 + i * 0.3, repeat: Infinity, delay: i * 0.35 }}
              style={{ height: 1.5, background: "rgba(255,255,255,0.14)", borderRadius: 99, width: `${w * 100}%` }} />
          ))}
        </div>

        {/* goals grid */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 6, marginTop: "auto" }}>
          {GOALS.map((g, i) => (
            <div key={g.label} style={{ padding: "7px 9px", borderRadius: 8, background: `${g.c}0a`, border: `1px solid ${g.c}1a` }}>
              <div style={{ fontSize: 8, color: "#2a2a2a", marginBottom: 4 }}>{g.label}</div>
              <Bar pct={g.pct ? g.val : (goalVal / g.max) * 100} color={g.c} delay={i * 0.1} h={2.5} />
              <motion.div animate={{ color: [g.c + "88", g.c, g.c + "88"] }} transition={{ duration: 1.5, repeat: Infinity }}
                style={{ fontSize: 9.5, fontWeight: 700, marginTop: 3 }}>
                {g.pct ? `${g.val}%` : `${goalVal.toLocaleString()} / ${g.max.toLocaleString()}`}
              </motion.div>
            </div>
          ))}
        </div>
      </div>
    </motion.div>
  );
}

/* ══════════════════════════════════════════════
   SCENE 2 — COMMUNITY
══════════════════════════════════════════════ */
const REVIEWS = [
  { name: "Sarah K.", stars: 5, text: "Couldn't put it down. The prose is stunning.", avatar: "SK" },
  { name: "James W.", stars: 5, text: "A new voice in literary fiction. Remarkable.", avatar: "JW" },
  { name: "Mia L.", stars: 4, text: "Beautiful storytelling. Highly recommend.", avatar: "ML" },
  { name: "Omar T.", stars: 5, text: "The character depth is extraordinary.", avatar: "OT" },
];
const READER_NOTIFS = [
  "📖 @chen added to reading list",
  "⭐ New 5-star review just in",
  "🔖 @sara shared your excerpt",
  "💬 @james left a comment",
  "🌍 Reader joined from Tokyo",
  "📚 Added to community picks",
];

function AIScene() {
  const [reviewIdx, setReviewIdx] = useState(0);
  const [notifIdx, setNotifIdx] = useState(0);
  const [showNotif, setShowNotif] = useState(false);
  const [readers, setReaders] = useState(2411);

  useEffect(() => {
    const t = setInterval(() => {
      setReviewIdx(i => (i + 1) % REVIEWS.length);
    }, 2500);
    return () => clearInterval(t);
  }, []);
  useEffect(() => {
    const t = setInterval(() => {
      setShowNotif(true);
      setReaders(r => r + Math.floor(Math.random() * 8) + 2);
      setTimeout(() => { setShowNotif(false); setNotifIdx(i => (i + 1) % READER_NOTIFS.length); }, 1900);
    }, 2400);
    return () => clearInterval(t);
  }, []);

  const review = REVIEWS[reviewIdx];

  return (
    <motion.div key="community" initial={{ opacity: 0, x: -22 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 22 }}
      transition={{ duration: 0.28, ease: "easeOut" }}
      style={{ position: "absolute", inset: 0, padding: "14px 18px", display: "flex", gap: 14 }}>

      {/* LEFT — book cover + stats */}
      <div style={{ width: 108, display: "flex", flexDirection: "column", gap: 10, flexShrink: 0 }}>
        {/* Book cover */}
        <div style={{ width: "100%", aspectRatio: "2/3", borderRadius: 10, background: "linear-gradient(155deg, #7c1d1d, #1a0a0a)", border: "1px solid rgba(255,255,255,0.08)", position: "relative", overflow: "hidden" }}>
          <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to bottom, transparent 40%, rgba(0,0,0,0.75))" }} />
          <div style={{ position: "absolute", top: 10, left: 9, right: 9 }}>
            <div style={{ fontSize: 6.5, fontWeight: 700, color: "rgba(255,255,255,0.25)", letterSpacing: "0.2em", textTransform: "uppercase" }}>Literary Fiction</div>
          </div>
          <div style={{ position: "absolute", bottom: 10, left: 10, right: 10 }}>
            <div style={{ width: "80%", height: 1.5, background: "rgba(255,255,255,0.4)", marginBottom: 5, borderRadius: 1 }} />
            <div style={{ fontSize: 10, fontWeight: 800, color: "#fff", lineHeight: 1.2, marginBottom: 3 }}>The Last Letter</div>
            <div style={{ fontSize: 7, color: "rgba(255,255,255,0.35)", letterSpacing: "0.1em", textTransform: "uppercase" }}>Maria Al-Hassan</div>
          </div>
        </div>

        {/* Quick stats */}
        <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
          <div style={{ padding: "6px 8px", borderRadius: 8, background: "rgba(250,204,21,0.06)", border: "1px solid rgba(250,204,21,0.15)" }}>
            <div style={{ fontSize: 7.5, color: "#555", marginBottom: 2 }}>Community Rating</div>
            <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
              <span style={{ fontSize: 12, fontWeight: 800, color: "#fbbf24" }}>4.8</span>
              <div style={{ display: "flex", gap: 1 }}>
                {[0,1,2,3,4].map(i => <span key={i} style={{ fontSize: 7, color: "#fbbf24" }}>★</span>)}
              </div>
            </div>
          </div>
          <div style={{ padding: "6px 8px", borderRadius: 8, background: "rgba(96,165,250,0.06)", border: "1px solid rgba(96,165,250,0.15)" }}>
            <div style={{ fontSize: 7.5, color: "#555", marginBottom: 2 }}>Active Readers</div>
            <motion.div animate={{ color: ["#3a88d8", "#60a5fa", "#3a88d8"] }} transition={{ duration: 1.5, repeat: Infinity }}
              style={{ fontSize: 12, fontWeight: 800 }}>{readers.toLocaleString()}</motion.div>
          </div>
        </div>
      </div>

      {/* RIGHT — reviews + activity */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 9 }}>
        <div style={{ fontSize: 9, fontWeight: 700, color: "#323232", textTransform: "uppercase", letterSpacing: "0.2em" }}>Community Reads</div>

        {/* Live notification */}
        <div style={{ height: 28, position: "relative", overflow: "hidden" }}>
          <AnimatePresence>
            {showNotif && (
              <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.2 }}
                style={{ position: "absolute", inset: 0, padding: "5px 10px", borderRadius: 7, background: "rgba(52,211,153,0.07)", border: "1px solid rgba(52,211,153,0.2)", fontSize: 9, color: "#34d399", fontWeight: 600, display: "flex", alignItems: "center", gap: 5 }}>
                <Dot color="#34d399" size={5} />
                {READER_NOTIFS[notifIdx]}
              </motion.div>
            )}
          </AnimatePresence>
          {!showNotif && (
            <div style={{ position: "absolute", inset: 0, padding: "5px 10px", borderRadius: 7, background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.04)", fontSize: 9, color: "#252525", display: "flex", alignItems: "center", gap: 5 }}>
              <span style={{ width: 5, height: 5, borderRadius: "50%", background: "#1e1e1e", flexShrink: 0, display: "inline-block" }} />
              Watching for activity…
            </div>
          )}
        </div>

        {/* Animated review */}
        <AnimatePresence mode="wait">
          <motion.div key={reviewIdx}
            initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.3 }}
            style={{ padding: "10px 12px", borderRadius: 10, background: "rgba(255,255,255,0.025)", border: "1px solid rgba(255,255,255,0.07)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 7 }}>
              <div style={{ width: 26, height: 26, borderRadius: "50%", background: "linear-gradient(135deg, #7c3aed, #2563eb)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 8, fontWeight: 700, color: "#fff", flexShrink: 0 }}>{review.avatar}</div>
              <div>
                <div style={{ fontSize: 9.5, fontWeight: 700, color: "#ccc" }}>{review.name}</div>
                <div style={{ display: "flex", gap: 1 }}>
                  {[0,1,2,3,4].map(i => <span key={i} style={{ fontSize: 8, color: i < review.stars ? "#fbbf24" : "#2a2a2a" }}>★</span>)}
                </div>
              </div>
            </div>
            <p style={{ fontSize: 9.5, color: "#666", lineHeight: 1.6, fontStyle: "italic", margin: 0 }}>"{review.text}"</p>
          </motion.div>
        </AnimatePresence>

        {/* Older reviews faded */}
        <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
          {REVIEWS.filter((_, i) => i !== reviewIdx).slice(0, 2).map((r) => (
            <div key={r.name} style={{ display: "flex", alignItems: "center", gap: 7, padding: "6px 10px", borderRadius: 8, background: "rgba(255,255,255,0.015)", border: "1px solid rgba(255,255,255,0.04)", opacity: 0.4 }}>
              <div style={{ width: 18, height: 18, borderRadius: "50%", background: "rgba(255,255,255,0.06)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 7, fontWeight: 700, color: "#555", flexShrink: 0 }}>{r.avatar}</div>
              <div style={{ flex: 1, overflow: "hidden" }}>
                <div style={{ fontSize: 8.5, color: "#333", fontStyle: "italic", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>"{r.text}"</div>
              </div>
            </div>
          ))}
        </div>

        {/* Highlighted excerpt */}
        <div style={{ padding: "9px 11px", borderRadius: 9, background: "rgba(167,139,250,0.05)", border: "1px solid rgba(167,139,250,0.14)", marginTop: "auto" }}>
          <div style={{ fontSize: 8, color: "#3a3a3a", marginBottom: 5, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.1em" }}>Highlighted by 28 readers</div>
          <motion.p animate={{ color: ["rgba(200,180,255,0.5)", "rgba(200,180,255,0.85)", "rgba(200,180,255,0.5)"] }} transition={{ duration: 3, repeat: Infinity }}
            style={{ fontSize: 9.5, lineHeight: 1.6, fontStyle: "italic", margin: 0 }}>
            "She reached for it, then pulled her hand back — some letters are better left unread."
          </motion.p>
        </div>
      </div>
    </motion.div>
  );
}

/* ══════════════════════════════════════════════
   SCENE 3 — PUBLISH
══════════════════════════════════════════════ */
const CHECKLIST = [
  { label: "Title & Subtitle", done: true },
  { label: "Book Cover", done: true },
  { label: "Back Cover Summary", done: true },
  { label: "Chapter Review", done: true },
  { label: "Final Proofread", done: false },
  { label: "Select Formats", done: false },
];
const FORMAT_OPTIONS = [
  { label: "PDF", icon: "📄", active: true },
  { label: "ePub", icon: "📱", active: true },
  { label: "Hardcover", icon: "📚", active: false },
  { label: "Audiobook", icon: "🎧", active: false },
];
const PUB_STEPS = [
  { label: "Formatting your manuscript…", color: "#60a5fa" },
  { label: "Generating cover assets…", color: "#a78bfa" },
  { label: "Preparing digital files…", color: "#34d399" },
  { label: "Ready to publish!", color: "#fbbf24" },
];

function PublishScene() {
  const [checkIdx, setCheckIdx] = useState(3);
  const [pubStep, setPubStep] = useState(0);
  const [formatIdx, setFormatIdx] = useState(0);
  const [published, setPublished] = useState(false);
  const [wc] = useState(24318);

  useEffect(() => {
    const t = setInterval(() => {
      setCheckIdx(i => Math.min(i + 1, CHECKLIST.length - 1));
    }, 1800);
    return () => clearInterval(t);
  }, []);
  useEffect(() => {
    const t = setInterval(() => {
      setPubStep(s => (s + 1) % PUB_STEPS.length);
    }, 1600);
    return () => clearInterval(t);
  }, []);
  useEffect(() => {
    const t = setInterval(() => setFormatIdx(i => (i + 1) % FORMAT_OPTIONS.length), 1400);
    return () => clearInterval(t);
  }, []);

  const step = PUB_STEPS[pubStep];

  return (
    <motion.div key="publish" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.28, ease: "easeOut" }}
      style={{ position: "absolute", inset: 0, padding: "14px 18px", display: "flex", gap: 14 }}>

      {/* LEFT — book preview + checklist */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 10 }}>
        <div style={{ fontSize: 9, fontWeight: 700, color: "#323232", textTransform: "uppercase", letterSpacing: "0.2em" }}>Publish Your Book</div>

        {/* Book preview card */}
        <div style={{ display: "flex", gap: 12, alignItems: "flex-start", padding: "10px 12px", borderRadius: 10, background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)" }}>
          {/* mini cover */}
          <div style={{ width: 48, height: 66, borderRadius: 7, background: "linear-gradient(155deg, #7c1d1d, #1a0a0a)", border: "1px solid rgba(255,255,255,0.08)", flexShrink: 0, position: "relative", overflow: "hidden" }}>
            <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to bottom, transparent 50%, rgba(0,0,0,0.7))" }} />
            <div style={{ position: "absolute", bottom: 5, left: 4, right: 4 }}>
              <div style={{ width: "85%", height: 1, background: "rgba(255,255,255,0.4)", marginBottom: 3, borderRadius: 1 }} />
              <div style={{ fontSize: 5.5, fontWeight: 800, color: "#fff", lineHeight: 1.2 }}>The Last Letter</div>
            </div>
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 12, fontWeight: 800, color: "#e0e0e0", letterSpacing: "-0.02em", marginBottom: 2 }}>The Last Letter</div>
            <div style={{ fontSize: 9, color: "#444", marginBottom: 8 }}>Maria Al-Hassan · Literary Fiction</div>
            <div style={{ display: "flex", gap: 10 }}>
              {[{ l: "Words", v: wc.toLocaleString() }, { l: "Chapters", v: "18" }, { l: "Pages", v: "~312" }].map(s => (
                <div key={s.l}>
                  <div style={{ fontSize: 7.5, color: "#333" }}>{s.l}</div>
                  <div style={{ fontSize: 10, fontWeight: 700, color: "#888" }}>{s.v}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Publishing checklist */}
        <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
          <div style={{ fontSize: 8, fontWeight: 700, color: "#2a2a2a", textTransform: "uppercase", letterSpacing: "0.14em", marginBottom: 2 }}>Pre-publish Checklist</div>
          {CHECKLIST.map((item, i) => {
            const done = i <= checkIdx;
            return (
              <motion.div key={item.label}
                animate={{ opacity: done ? 1 : 0.35 }}
                style={{ display: "flex", alignItems: "center", gap: 7, padding: "5px 8px", borderRadius: 7, background: done ? "rgba(52,211,153,0.05)" : "rgba(255,255,255,0.015)", border: `1px solid ${done ? "rgba(52,211,153,0.18)" : "rgba(255,255,255,0.04)"}` }}>
                <motion.div
                  animate={{ background: done ? "#34d399" : "rgba(255,255,255,0.05)", borderColor: done ? "#34d399" : "rgba(255,255,255,0.1)" }}
                  style={{ width: 13, height: 13, borderRadius: "50%", border: "1.5px solid", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  {done && <span style={{ fontSize: 7, color: "#000", fontWeight: 900 }}>✓</span>}
                </motion.div>
                <span style={{ fontSize: 9, color: done ? "#aaa" : "#2e2e2e", fontWeight: done ? 400 : 600 }}>{item.label}</span>
              </motion.div>
            );
          })}
        </div>

        {/* Publishing progress */}
        <div style={{ padding: "9px 11px", borderRadius: 9, background: `${step.color}08`, border: `1px solid ${step.color}25`, marginTop: "auto" }}>
          <AnimatePresence mode="wait">
            <motion.div key={pubStep} initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -10 }} transition={{ duration: 0.2 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 5 }}>
                <Dot color={step.color} size={5} />
                <span style={{ fontSize: 9, color: step.color, fontWeight: 600 }}>{step.label}</span>
              </div>
              <Bar pct={pubStep === 3 ? 100 : 35 + pubStep * 20} color={step.color} h={2.5} />
            </motion.div>
          </AnimatePresence>
        </div>
      </div>

      {/* RIGHT — formats + publish button */}
      <div style={{ width: 118, display: "flex", flexDirection: "column", gap: 9 }}>
        <div style={{ fontSize: 8.5, fontWeight: 600, color: "#232323", textTransform: "uppercase", letterSpacing: "0.14em" }}>Export Formats</div>

        {/* Format grid */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 5 }}>
          {FORMAT_OPTIONS.map((f, i) => (
            <motion.div key={f.label}
              animate={{ background: formatIdx === i ? "rgba(167,139,250,0.12)" : "rgba(255,255,255,0.025)", borderColor: formatIdx === i ? "rgba(167,139,250,0.35)" : "rgba(255,255,255,0.06)" }}
              transition={{ duration: 0.25 }}
              style={{ padding: "8px 6px", borderRadius: 9, border: "1px solid", textAlign: "center", cursor: "pointer" }}>
              <div style={{ fontSize: 16, marginBottom: 3 }}>{f.icon}</div>
              <div style={{ fontSize: 8.5, fontWeight: 600, color: formatIdx === i ? "#c4b5fd" : "#2a2a2a" }}>{f.label}</div>
            </motion.div>
          ))}
        </div>

        {/* Royalty info */}
        <div style={{ padding: "9px 10px", borderRadius: 9, background: "rgba(251,191,36,0.06)", border: "1px solid rgba(251,191,36,0.18)" }}>
          <div style={{ fontSize: 8, color: "#555", marginBottom: 4 }}>Your Royalty Rate</div>
          <div style={{ fontSize: 20, fontWeight: 800, color: "#fbbf24" }}>70%</div>
          <div style={{ fontSize: 8, color: "#3a3a3a", marginTop: 2 }}>on every sale</div>
          <Bar pct={70} color="#fbbf24" delay={0.2} h={2.5} />
        </div>

        {/* Audience estimate */}
        <div style={{ padding: "8px 10px", borderRadius: 9, background: "rgba(96,165,250,0.05)", border: "1px solid rgba(96,165,250,0.15)" }}>
          <div style={{ fontSize: 8, color: "#555", marginBottom: 3 }}>Est. Audience Reach</div>
          <motion.div animate={{ color: ["#3a88d8", "#60a5fa", "#3a88d8"] }} transition={{ duration: 1.8, repeat: Infinity }}
            style={{ fontSize: 16, fontWeight: 800 }}>48K+</motion.div>
          <div style={{ fontSize: 8, color: "#2a2a2a", marginTop: 1 }}>literary fiction readers</div>
        </div>

        {/* Publish button */}
        <motion.div
          whileTap={{ scale: 0.96 }}
          onClick={() => setPublished(p => !p)}
          style={{ padding: "10px", borderRadius: 9, background: published ? "rgba(52,211,153,0.09)" : "linear-gradient(135deg, rgba(167,139,250,0.18), rgba(96,165,250,0.08))", border: `1px solid ${published ? "rgba(52,211,153,0.3)" : "rgba(167,139,250,0.3)"}`, textAlign: "center", cursor: "pointer", position: "relative", overflow: "hidden", marginTop: "auto" }}>
          <motion.div animate={{ x: ["-100%", "200%"] }} transition={{ duration: 1.8, repeat: Infinity }}
            style={{ position: "absolute", inset: 0, background: "linear-gradient(90deg, transparent, rgba(255,255,255,0.04), transparent)", pointerEvents: "none" }} />
          <span style={{ fontSize: 10, fontWeight: 700, color: published ? "#34d399" : "#c4b5fd" }}>
            {published ? "✓ Published!" : "Publish Now ✦"}
          </span>
        </motion.div>
      </div>
    </motion.div>
  );
}

/* ══════════════════════════════════════════════
   SCENE 4 — STATS
══════════════════════════════════════════════ */
const STATS4 = [
  { v: 142800, l: "Books Written", c: "#a78bfa", suf: "+" },
  { v: 3200000, l: "Words Published", c: "#60a5fa", suf: "+" },
  { v: 98, l: "Countries", c: "#34d399", suf: "" },
  { v: 47000, l: "Authors", c: "#f472b6", suf: "+" },
];
const FEAT6 = [
  { i: "✦", n: "AI Cover Art", c: "#a78bfa" },
  { i: "◆", n: "Smart Editor", c: "#60a5fa" },
  { i: "★", n: "World Publish", c: "#f59e0b" },
  { i: "●", n: "Plot Detect", c: "#34d399" },
  { i: "▲", n: "Writing Coach", c: "#f472b6" },
  { i: "◉", n: "PDF & EPUB", c: "#fb923c" },
];
const SPARK_A = [9, 14, 11, 19, 16, 24, 20, 29, 24, 34, 30, 39];
const SPARK_B = [5, 9, 13, 8, 16, 12, 20, 15, 24, 19, 28, 24];
const maxA = Math.max(...SPARK_A), maxB = Math.max(...SPARK_B);
const FEED = ["📖 @sara finished Ch. 7", "🌟 @james published a novel", "✦ @ali ran AI analysis", "🎉 @chen: 500 readers!", "📚 @mia exported EPUB", "🏆 @leo won top prize"];
const LEADERBOARD = [
  { name: "sara_k", words: 312800, c: "#f59e0b" },
  { name: "james_w", words: 284200, c: "#60a5fa" },
  { name: "ali_m", words: 241700, c: "#a78bfa" },
];

function StatsScene() {
  const [live, setLive] = useState(0);
  const [feedIdx, setFeedIdx] = useState(0);
  const [showFeed, setShowFeed] = useState(false);
  const [liveBooks, setLiveBooks] = useState(142800);
  const [achievement, setAchievement] = useState(false);

  useEffect(() => {
    const t = setInterval(() => setLive(l => l + Math.floor(Math.random() * 5) + 1), 350);
    return () => clearInterval(t);
  }, []);
  useEffect(() => {
    const t = setInterval(() => setLiveBooks(v => v + Math.floor(Math.random() * 3) + 1), 650);
    return () => clearInterval(t);
  }, []);
  useEffect(() => {
    const t = setInterval(() => {
      setShowFeed(true);
      setAchievement(true);
      setTimeout(() => { setShowFeed(false); setFeedIdx(i => (i + 1) % FEED.length); setAchievement(false); }, 1600);
    }, 2000);
    return () => clearInterval(t);
  }, []);

  return (
    <motion.div key="stats" initial={{ opacity: 0, scale: 0.93 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.93 }}
      transition={{ duration: 0.28 }}
      style={{ position: "absolute", inset: 0, padding: "14px 18px", display: "flex", gap: 14 }}>

      {/* LEFT */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 9 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ fontSize: 9, fontWeight: 700, color: "#323232", textTransform: "uppercase", letterSpacing: "0.2em" }}>Platform at a Glance</div>
          <motion.div animate={{ color: ["#252525", "#34d399", "#252525"] }} transition={{ duration: 0.7, repeat: Infinity }}
            style={{ fontSize: 9, fontWeight: 600 }}>● {live.toLocaleString()} live</motion.div>
        </div>

        {/* stats grid */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
          {STATS4.map((s, i) => (
            <motion.div key={s.l} initial={{ opacity: 0, y: 7 }} animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.07, type: "spring", stiffness: 230 }}
              style={{ padding: "9px 11px", borderRadius: 9, background: `${s.c}0b`, border: `1px solid ${s.c}1c`, position: "relative", overflow: "hidden" }}>
              <motion.div animate={{ x: ["-100%", "200%"] }} transition={{ duration: 1.8, repeat: Infinity, delay: i * 0.4 }}
                style={{ position: "absolute", inset: 0, background: `linear-gradient(90deg, transparent, ${s.c}18, transparent)`, pointerEvents: "none" }} />
              <div style={{ fontSize: i === 0 ? 15 : 17, fontWeight: 800, color: s.c, lineHeight: 1 }}>
                {i === 0 ? <>{liveBooks.toLocaleString()}+</> : <N to={s.v} dur={950} suf={s.suf} />}
              </div>
              <div style={{ fontSize: 8.5, color: "#2e2e2e", marginTop: 4 }}>{s.l}</div>
            </motion.div>
          ))}
        </div>

        {/* dual sparklines */}
        <div style={{ display: "flex", gap: 6 }}>
          {[{ data: SPARK_A, max: maxA, label: "Words/Day", c: "#a78bfa" }, { data: SPARK_B, max: maxB, label: "Books Started", c: "#60a5fa" }].map((sp, si) => (
            <div key={si} style={{ flex: 1, background: "rgba(255,255,255,0.02)", borderRadius: 8, padding: "7px 9px", border: "1px solid rgba(255,255,255,0.04)" }}>
              <div style={{ fontSize: 8, fontWeight: 600, color: "#252525", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 5 }}>{sp.label}</div>
              <div style={{ display: "flex", alignItems: "flex-end", gap: 2, height: 26 }}>
                {sp.data.map((v, i) => (
                  <motion.div key={i} initial={{ height: 0 }} animate={{ height: `${(v / sp.max) * 100}%` }}
                    transition={{ delay: 0.04 * i, duration: 0.45, ease: "easeOut" }}
                    style={{ flex: 1, borderRadius: 2, background: `linear-gradient(to top, ${sp.c}44, ${sp.c})`, position: "relative", overflow: "hidden" }}>
                    <motion.div animate={{ y: ["100%", "-200%"] }} transition={{ duration: 1.0, repeat: Infinity, delay: i * 0.08 }}
                      style={{ position: "absolute", left: 0, right: 0, height: "50%", background: `linear-gradient(to top, transparent, ${sp.c}bb)` }} />
                  </motion.div>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* feed + achievement */}
        <div style={{ height: 24, position: "relative", overflow: "hidden" }}>
          <AnimatePresence>
            {showFeed && (
              <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.18 }}
                style={{ position: "absolute", inset: 0, fontSize: 9, color: "#3a3a3a", display: "flex", alignItems: "center", gap: 6 }}>
                {FEED[feedIdx]}
                <AnimatePresence>
                  {achievement && (
                    <motion.span initial={{ opacity: 0, scale: 0.6 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.6 }}
                      style={{ fontSize: 9, padding: "1px 6px", borderRadius: 99, background: "rgba(167,139,250,0.12)", color: "#a78bfa", fontWeight: 600 }}>+XP</motion.span>
                  )}
                </AnimatePresence>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* feature pills */}
        <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
          {FEAT6.map((f, i) => (
            <motion.div key={f.n} initial={{ opacity: 0, scale: 0.72 }} animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.4 + i * 0.05, type: "spring", stiffness: 230 }}
              whileHover={{ scale: 1.08, y: -2 }}
              style={{ display: "flex", alignItems: "center", gap: 3, padding: "3px 8px", borderRadius: 99, background: `${f.c}0e`, border: `1px solid ${f.c}22`, fontSize: 9, fontWeight: 600, color: f.c, cursor: "pointer" }}>
              <span style={{ fontSize: 7.5 }}>{f.i}</span>{f.n}
            </motion.div>
          ))}
        </div>
      </div>

      {/* RIGHT — leaderboard + rings */}
      <div style={{ width: 118, display: "flex", flexDirection: "column", gap: 8 }}>
        <div style={{ fontSize: 8.5, fontWeight: 600, color: "#232323", textTransform: "uppercase", letterSpacing: "0.14em" }}>Top Authors</div>
        {LEADERBOARD.map((lb, i) => (
          <motion.div key={lb.name} initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.08, type: "spring" }}
            style={{ padding: "7px 9px", borderRadius: 8, background: `${lb.c}0a`, border: `1px solid ${lb.c}1c` }}>
            <div style={{ display: "flex", alignItems: "center", gap: 5, marginBottom: 4 }}>
              <span style={{ fontSize: 9, fontWeight: 800, color: lb.c }}>#{i + 1}</span>
              <span style={{ fontSize: 9, color: "#aaa", fontWeight: 600 }}>{lb.name}</span>
            </div>
            <Bar pct={(lb.words / 312800) * 100} color={lb.c} h={2.5} />
            <motion.div animate={{ color: [lb.c + "88", lb.c, lb.c + "88"] }} transition={{ duration: 1.6, repeat: Infinity, delay: i * 0.3 }}
              style={{ fontSize: 8.5, fontWeight: 700, marginTop: 3 }}>{lb.words.toLocaleString()} words</motion.div>
          </motion.div>
        ))}

        {/* goal rings */}
        <div style={{ padding: "8px 10px", borderRadius: 8, background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.05)" }}>
          <div style={{ fontSize: 8, color: "#252525", marginBottom: 6 }}>Platform Goals</div>
          {[{ l: "Books Published", pct: 78, c: "#a78bfa" }, { l: "Authors Active", pct: 91, c: "#34d399" }, { l: "AI Analyses", pct: 64, c: "#60a5fa" }].map((g, i) => (
            <div key={g.l} style={{ marginBottom: i < 2 ? 5 : 0 }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 2 }}>
                <span style={{ fontSize: 7.5, color: "#282828" }}>{g.l}</span>
                <motion.span animate={{ color: [g.c + "88", g.c, g.c + "88"] }} transition={{ duration: 2, repeat: Infinity, delay: i * 0.4 }}
                  style={{ fontSize: 7.5, fontWeight: 700 }}>{g.pct}%</motion.span>
              </div>
              <Bar pct={g.pct} color={g.c} delay={0.2 + i * 0.12} h={2} />
            </div>
          ))}
        </div>

        {/* live metric */}
        <motion.div animate={{ borderColor: ["rgba(167,139,250,0.1)", "rgba(167,139,250,0.45)", "rgba(167,139,250,0.1)"] }}
          transition={{ duration: 1.4, repeat: Infinity }}
          style={{ padding: "9px 10px", borderRadius: 8, background: "rgba(167,139,250,0.05)", border: "1px solid rgba(167,139,250,0.1)" }}>
          <div style={{ fontSize: 8, color: "#3a3a3a", marginBottom: 3 }}>Words Written Today</div>
          <motion.div animate={{ color: ["#a78bfa88", "#a78bfa", "#a78bfa88"] }} transition={{ duration: 1, repeat: Infinity }}
            style={{ fontSize: 20, fontWeight: 800, color: "#a78bfa" }}>
            <N to={1842940} dur={1200} />
          </motion.div>
        </motion.div>
      </div>
    </motion.div>
  );
}

/* ══════════════════════════════════════════════
   MAIN
══════════════════════════════════════════════ */
export function HeroMockup() {
  const [scene, setScene] = useState<Scene>("write");
  const [tick, setTick] = useState(0);

  useEffect(() => {
    const t = setInterval(() => {
      setTick(n => n + 1);
      setScene(s => SCENES[(SCENES.indexOf(s) + 1) % SCENES.length]);
    }, 3000);
    return () => clearInterval(t);
  }, []);

  const LABELS: Record<Scene, string> = { write: "✍ Write", ai: "👥 Readers", publish: "📘 Publish", stats: "📊 Stats" };

  const sparks = [
    { x: "4%", y: "15%", c: "#a78bfa55", d: 0, s: 4 },
    { x: "92%", y: "10%", c: "#60a5fa55", d: 0.7, s: 3 },
    { x: "10%", y: "85%", c: "#34d39955", d: 1.3, s: 5 },
    { x: "82%", y: "78%", c: "#f472b655", d: 0.5, s: 3 },
    { x: "55%", y: "6%", c: "#f59e0b55", d: 1.9, s: 2 },
    { x: "96%", y: "50%", c: "#a78bfa44", d: 1.0, s: 4 },
    { x: "30%", y: "94%", c: "#60a5fa44", d: 1.6, s: 3 },
    { x: "64%", y: "26%", c: "#34d39933", d: 0.3, s: 2 },
    { x: "46%", y: "62%", c: "#f472b633", d: 2.3, s: 2 },
  ];

  return (
    <div style={{ width: "100%", height: "100%", background: "#060606", position: "relative", overflow: "hidden", fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Text', sans-serif" }}>
      <motion.div animate={{ opacity: [0.3, 0.65, 0.3] }} transition={{ duration: 3.5, repeat: Infinity }}
        style={{ position: "absolute", inset: 0, background: "radial-gradient(ellipse at 20% 25%, rgba(124,58,237,0.1) 0%, transparent 52%)", pointerEvents: "none" }} />
      <motion.div animate={{ opacity: [0.2, 0.5, 0.2] }} transition={{ duration: 4.5, repeat: Infinity, delay: 1.8 }}
        style={{ position: "absolute", inset: 0, background: "radial-gradient(ellipse at 82% 75%, rgba(96,165,250,0.07) 0%, transparent 52%)", pointerEvents: "none" }} />

      {sparks.map((p, i) => (
        <motion.div key={i} style={{ position: "absolute", left: p.x, top: p.y, width: p.s, height: p.s, borderRadius: "50%", background: p.c, pointerEvents: "none", zIndex: 1 }}
          animate={{ y: [0, -22, 0], opacity: [0.08, 0.6, 0.08], scale: [1, 1.8, 1] }}
          transition={{ duration: 2.4 + p.d, repeat: Infinity, delay: p.d, ease: "easeInOut" }} />
      ))}

      {/* header */}
      <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 38, borderBottom: "1px solid rgba(255,255,255,0.055)", background: "rgba(6,6,6,0.94)", backdropFilter: "blur(14px)", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 14px", zIndex: 20 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <div style={{ fontWeight: 800, fontSize: 12, letterSpacing: "-0.04em", color: "#fff" }}>PLOTZY</div>
          <div style={{ width: 1, height: 8, background: "rgba(255,255,255,0.09)" }} />
          <div style={{ fontSize: 8.5, color: "#242424" }}>Writing Platform</div>
        </div>
        <div style={{ display: "flex", gap: 2 }}>
          {SCENES.map(s => (
            <motion.button key={s} onClick={() => setScene(s)}
              animate={{ background: scene === s ? "rgba(255,255,255,0.1)" : "rgba(255,255,255,0)", color: scene === s ? "#fff" : "#2e2e2e" }}
              transition={{ duration: 0.16 }}
              style={{ padding: "2px 7px", borderRadius: 5, fontSize: 8.5, fontWeight: 600, border: "none", cursor: "pointer" }}>
              {LABELS[s]}
            </motion.button>
          ))}
        </div>
      </div>

      {/* scenes */}
      <div style={{ position: "absolute", top: 38, left: 0, right: 0, bottom: 44, overflow: "hidden" }}>
        <AnimatePresence mode="wait">
          {scene === "write" && <WriteScene key="write" />}
          {scene === "ai" && <AIScene key="ai" />}
          {scene === "publish" && <PublishScene key="publish" />}
          {scene === "stats" && <StatsScene key="stats" />}
        </AnimatePresence>
      </div>

      {/* footer */}
      <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: 44, borderTop: "1px solid rgba(255,255,255,0.04)", background: "rgba(6,6,6,0.96)", backdropFilter: "blur(14px)", display: "flex", alignItems: "center", justifyContent: "center", gap: 10, zIndex: 20 }}>
        <div style={{ display: "flex", gap: 4 }}>
          {SCENES.map(s => (
            <motion.div key={s} onClick={() => setScene(s)}
              animate={{ width: scene === s ? 18 : 3.5, background: scene === s ? "#a78bfa" : "rgba(255,255,255,0.1)" }}
              transition={{ duration: 0.22 }}
              style={{ height: 3.5, borderRadius: 99, cursor: "pointer" }} />
          ))}
        </div>
        <motion.div key={tick} initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.32 }}
          style={{ fontSize: 9.5, fontWeight: 300, color: "rgba(239,239,239,0.3)", letterSpacing: "0.01em" }}>
          From the first word to the final published page.
        </motion.div>
      </div>

      {/* scan line */}
      <motion.div animate={{ y: ["-5%", "110%"] }} transition={{ duration: 3.2, repeat: Infinity, ease: "linear" }}
        style={{ position: "absolute", left: 0, right: 0, height: 1, background: "linear-gradient(90deg, transparent, rgba(167,139,250,0.1), transparent)", pointerEvents: "none", zIndex: 5 }} />
    </div>
  );
}
