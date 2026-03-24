import { useState } from "react";
import { Layout } from "@/components/layout";
import { motion, AnimatePresence } from "framer-motion";
import {
  BookOpen, Layers, Map, AlignLeft, Lightbulb,
  Heart, Zap, Drama, Search, Wand2, Ghost, Clock,
  ChevronDown, ChevronRight, Star, ArrowRight,
  PenLine, Users, Globe, Mountain, List, Bookmark,
  CheckCircle2, Flame, Compass, Target, Mic2,
  Scissors, Send, RefreshCw, Eye, Brain, Sparkles,
  TrendingUp, MessageSquare, Feather, Award,
  Circle, Triangle, Square, Hexagon,
} from "lucide-react";

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  visible: (i = 0) => ({
    opacity: 1, y: 0,
    transition: { delay: i * 0.07, duration: 0.5, ease: "easeOut" },
  }),
};

/* ─── DATA ─── */

const genres = [
  {
    icon: Heart, name: "Romance", accent: "#e05c7e",
    description: "Stories driven by love, longing, and emotional connection. The central promise: two people will find happiness together — even if the journey is painful.",
    subgenres: ["Contemporary", "Historical", "Paranormal", "Romantic Suspense"],
    conventions: ["Happily Ever After (HEA) or Happy For Now (HFN) ending", "Emotional tension between leads", "Obstacles keeping them apart"],
    tip: "The push-pull dynamic is everything. Give readers reasons to root for the couple — then give the couple reasons to push each other away.",
    examples: ["Pride and Prejudice", "The Notebook", "Outlander"],
  },
  {
    icon: Search, name: "Mystery / Thriller", accent: "#7c8cff",
    description: "Suspenseful stories built around a crime, hidden truth, or race against time. Readers are hooked by unanswered questions and the promise of resolution.",
    subgenres: ["Cozy Mystery", "Psychological Thriller", "Legal Thriller", "Crime Noir"],
    conventions: ["A central question (whodunit?)", "Clues planted early", "Escalating stakes and reveals"],
    tip: "Plant your clues fairly — the reader should be able to solve it, but not too easily. Every red herring must still feel meaningful in hindsight.",
    examples: ["Gone Girl", "The Girl with the Dragon Tattoo", "Big Little Lies"],
  },
  {
    icon: Wand2, name: "Fantasy", accent: "#a78bfa",
    description: "Worlds beyond reality filled with magic, mythical creatures, and epic struggles. Fantasy asks 'what if' and then builds an entire universe around the answer.",
    subgenres: ["Epic Fantasy", "Urban Fantasy", "Dark Fantasy", "Portal Fantasy"],
    conventions: ["A consistent magic system with rules and costs", "World-building depth", "A clash of powerful forces"],
    tip: "Magic must have limits. A hero who can do anything creates no tension. Define what magic cannot do as carefully as what it can.",
    examples: ["Harry Potter", "The Lord of the Rings", "A Song of Ice and Fire"],
  },
  {
    icon: Globe, name: "Science Fiction", accent: "#38bdf8",
    description: "Speculative stories exploring future technology, space, AI, and the human condition in a changed world. The best sci-fi uses technology to illuminate human nature.",
    subgenres: ["Space Opera", "Dystopian", "Cyberpunk", "Hard Sci-Fi"],
    conventions: ["A 'what if?' premise grounded in science", "Technology with social consequences", "Big ideas wrapped in personal stories"],
    tip: "The technology is never the real story — the human response to it is. Ask: how does this change what people want, fear, and love?",
    examples: ["Dune", "The Martian", "Ender's Game"],
  },
  {
    icon: Ghost, name: "Horror", accent: "#f87171",
    description: "Stories designed to frighten and unsettle. Horror explores our deepest fears — from supernatural threats to the terror of losing one's mind.",
    subgenres: ["Supernatural Horror", "Psychological Horror", "Body Horror", "Gothic"],
    conventions: ["A slow build of dread", "Characters in genuine danger", "Something truly threatening at the core"],
    tip: "The scariest thing is what the reader imagines. Describe enough to set the scene — then let their imagination fill the gaps with their own worst fears.",
    examples: ["It", "The Shining", "Dracula"],
  },
  {
    icon: Zap, name: "Action / Adventure", accent: "#fbbf24",
    description: "Fast-paced stories where heroes face physical danger, impossible odds, and exciting quests. Every page should feel like it's moving.",
    subgenres: ["Espionage", "Survival", "Heist", "Quest"],
    conventions: ["High physical stakes", "Constant forward momentum", "A hero who acts rather than waits"],
    tip: "Vary your action sequences. A relentless sprint is exhausting — alternate intense action scenes with quieter moments of character development or planning.",
    examples: ["Indiana Jones", "The Hunger Games", "Robinson Crusoe"],
  },
  {
    icon: Drama, name: "Literary / Drama", accent: "#34d399",
    description: "Character-driven stories exploring the full range of human experience. Less about plot events, more about inner lives, relationships, and what it means to be human.",
    subgenres: ["Domestic Drama", "Coming-of-Age", "Social Commentary", "Memoir-Style"],
    conventions: ["Deep interiority and character psychology", "Prose that rewards re-reading", "Ambiguous or earned endings"],
    tip: "Let your characters be contradictory. Real people contain multitudes — a character who is always consistent feels flat. Let their choices surprise even you.",
    examples: ["The Kite Runner", "A Little Life", "Normal People"],
  },
  {
    icon: Clock, name: "Historical Fiction", accent: "#fb923c",
    description: "Stories set in real historical periods, blending fictional characters with authentic settings, events, and atmosphere. The past becomes a living world.",
    subgenres: ["War Fiction", "Ancient World", "Victorian Era", "20th Century"],
    conventions: ["Authentic historical detail", "The tension between historical constraints and modern sensibilities", "Real events as backdrop"],
    tip: "Research until the era lives in your bones — then stop showing it off. Great historical fiction feels lived-in, not like a textbook with characters inserted.",
    examples: ["The Bronze Horseman", "All the Light We Cannot See", "Wolf Hall"],
  },
];

const structures = [
  {
    name: "The Three-Act Structure",
    icon: Triangle,
    tag: "Most Universal",
    color: "text-blue-400",
    bg: "bg-blue-500/10 border-blue-500/20",
    description: "The oldest and most widely used story framework. Every successful Hollywood film and the majority of published novels follow some version of this structure. It divides your story into three distinct acts with clear turning points.",
    acts: [
      {
        label: "Act I — Setup (25%)",
        points: ["Introduce your protagonist in their ordinary world", "Establish what they want and what's at stake", "The Inciting Incident — an event that disrupts everything", "End with the protagonist committing to a new direction"],
      },
      {
        label: "Act II — Confrontation (50%)",
        points: ["Protagonist pursues their goal but faces escalating obstacles", "Midpoint twist changes direction or raises the stakes dramatically", "All seems lost — the darkest moment before the climax", "Protagonist discovers what they truly need (vs. what they wanted)"],
      },
      {
        label: "Act III — Resolution (25%)",
        points: ["The climax — the ultimate confrontation or challenge", "The protagonist applies everything they've learned", "Resolution — the new equilibrium after the conflict", "Show how the character (and world) has changed"],
      },
    ],
  },
  {
    name: "The Hero's Journey",
    icon: Circle,
    tag: "Myth & Epic",
    color: "text-purple-400",
    bg: "bg-purple-500/10 border-purple-500/20",
    description: "Identified by Joseph Campbell across myths from every culture, the Hero's Journey is a 12-stage circular story structure. It's particularly powerful for fantasy, adventure, and coming-of-age stories.",
    acts: [
      {
        label: "Departure (The Beginning)",
        points: ["Ordinary World — hero's life before the adventure", "Call to Adventure — something disrupts the status quo", "Refusal of the Call — hero hesitates (shows stakes)", "Crossing the Threshold — hero commits and enters the new world"],
      },
      {
        label: "Initiation (The Middle)",
        points: ["Tests, Allies, Enemies — the new world challenges the hero", "The Ordeal — a major crisis, the hero faces death (literal or symbolic)", "The Reward — hero gains something valuable from surviving", "The Road Back — hero must return, often pursued by consequences"],
      },
      {
        label: "Return (The End)",
        points: ["The Resurrection — one final, greatest test using all lessons learned", "Return with the Elixir — hero comes home changed, bringing something of value"],
      },
    ],
  },
  {
    name: "Save the Cat! Beat Sheet",
    icon: Square,
    tag: "Most Detailed",
    color: "text-emerald-400",
    bg: "bg-emerald-500/10 border-emerald-500/20",
    description: "Created by screenwriter Blake Snyder, this 15-beat framework gives you a precise structural map. It's highly prescriptive — ideal for beginners who want exact targets for when things should happen.",
    acts: [
      {
        label: "Opening through Break into Two",
        points: ["Opening Image — a snapshot of the hero's flawed world", "Theme Stated — someone states what the story is really about", "Set-Up — establish the status quo and introduce key characters", "Catalyst (p.12/10%) — the inciting incident", "Debate (p.12–25%) — hero wrestles with the decision", "Break into Two (p.25%) — hero enters the upside-down world"],
      },
      {
        label: "Fun and Games through Dark Night",
        points: ["B Story (p.30%) — introduce the relationship that carries the theme", "Fun and Games (p.30–55%) — the promise of the premise is delivered", "Midpoint (p.55%) — a false victory or false defeat", "Bad Guys Close In (p.55–75%) — pressure mounts", "All Is Lost (p.75%) — the hero's lowest point", "Dark Night of the Soul (p.75–85%) — reflection, despair"],
      },
      {
        label: "Break into Three through Final Image",
        points: ["Break into Three (p.85%) — hero finds the solution using A+B stories", "Finale (p.85–99%) — execute the new plan, defeat antagonist", "Final Image (p.99%) — mirror of the Opening Image, shows transformation"],
      },
    ],
  },
];

const characterPillars = [
  {
    icon: Target,
    title: "The Goal (Want)",
    color: "text-blue-400",
    bg: "bg-blue-500/10 border-blue-500/20",
    description: "What does your character consciously want? This is their external goal — the thing they're actively chasing throughout the story.",
    examples: ["Solve the murder", "Win the championship", "Get home safely", "Find true love"],
  },
  {
    icon: Heart,
    title: "The Need",
    color: "text-rose-400",
    bg: "bg-rose-500/10 border-rose-500/20",
    description: "What does your character actually need — the internal truth they must accept to grow? The tension between want and need is what creates a character arc.",
    examples: ["Learn to trust others", "Accept their past", "Forgive themselves", "Choose love over ambition"],
  },
  {
    icon: Ghost,
    title: "The Wound",
    color: "text-purple-400",
    bg: "bg-purple-500/10 border-purple-500/20",
    description: "A defining trauma or formative experience from the past. The wound explains why the character behaves the way they do — and creates the gap between want and need.",
    examples: ["Abandoned as a child", "Failed publicly and catastrophically", "Lost someone they loved", "Betrayed by someone they trusted"],
  },
  {
    icon: Mountain,
    title: "The Flaw",
    color: "text-amber-400",
    bg: "bg-amber-500/10 border-amber-500/20",
    description: "A genuine weakness that creates problems. Not a 'cute' flaw — a real one that costs them something. The flaw is how the wound manifests in behavior.",
    examples: ["Arrogance that alienates allies", "Fear of vulnerability", "Obsessive need for control", "Inability to ask for help"],
  },
  {
    icon: Sparkles,
    title: "The Strength",
    color: "text-emerald-400",
    bg: "bg-emerald-500/10 border-emerald-500/20",
    description: "What makes readers root for your character? They need genuine qualities worth admiring — courage, wit, loyalty, compassion. This is what lets them ultimately overcome.",
    examples: ["Unstoppable resilience", "Brilliant problem-solving", "Deep empathy for others", "Fierce protective instinct"],
  },
  {
    icon: Eye,
    title: "The Voice",
    color: "text-cyan-400",
    bg: "bg-cyan-500/10 border-cyan-500/20",
    description: "How your character speaks, thinks, and sees the world. Voice is the fingerprint that makes one character immediately distinguishable from another.",
    examples: ["Darkly humorous observations", "Precise technical thinking", "Naive wonder at everything", "Cynical deflection with wit"],
  },
];

const arcTypes = [
  {
    name: "The Positive Arc",
    description: "The character starts with a flawed worldview (the Lie) and, through the story's events, overcomes it to embrace the Truth. The most common arc in fiction.",
    icon: TrendingUp,
    color: "text-emerald-400",
    example: "Ebenezer Scrooge (A Christmas Carol) — goes from miserly and bitter to generous and joyful.",
  },
  {
    name: "The Negative Arc",
    description: "The character starts with potential for growth but ultimately fails to overcome their flaw, descending into corruption, tragedy, or death.",
    icon: Mountain,
    color: "text-rose-400",
    example: "Walter White (Breaking Bad) — starts as sympathetic, ends as villain. Macbeth. Anakin Skywalker.",
  },
  {
    name: "The Flat Arc",
    description: "The character doesn't change — they already hold the Truth, and they use it to change the world around them. Common in action/adventure and thrillers.",
    icon: ArrowRight,
    color: "text-blue-400",
    example: "James Bond, Sherlock Holmes, Atticus Finch — their unshakeable principles reshape everyone around them.",
  },
];

const dialoguePrinciples = [
  {
    icon: MessageSquare,
    title: "Every Line Does Double Duty",
    description: "Strong dialogue accomplishes at least two things at once: advances the plot AND reveals character, OR creates conflict AND delivers information. Lines that only do one thing often get cut in editing.",
    bad: '"The weather is nice today," said John.\n"Yes, it is," Mary replied.',
    good: '"Nice day," John said, not looking up from his phone.\n"You haven\'t noticed a single thing about me in three weeks," Mary said quietly.',
  },
  {
    icon: Brain,
    title: "Subtext is Everything",
    description: "Real people rarely say exactly what they mean. Characters should talk around their true feelings, especially in emotional scenes. The gap between what's said and what's meant is where tension lives.",
    bad: '"I love you and I\'m afraid of losing you," he admitted.',
    good: '"You don\'t have to come back, you know." He paused. "If you find something better."',
  },
  {
    icon: Users,
    title: "Every Character Sounds Different",
    description: "Cover up the dialogue tags and read a conversation aloud. Could you tell who's speaking from the words alone? Each character should have distinct vocabulary, rhythm, and verbal habits.",
    bad: 'All characters use complete, grammatically correct sentences of similar length.',
    good: 'One character speaks in short clipped sentences. Another rambles. A third speaks in metaphors. A fourth is painfully literal.',
  },
  {
    icon: Scissors,
    title: "Cut the Small Talk",
    description: "Realistic conversation is boring. 'Hello, how are you, fine thanks' has no place in fiction unless something subversive is happening beneath it. Start dialogue mid-conversation, just before something matters.",
    bad: '"Hey, how are you doing?" / "Good, good. You?" / "Not bad. So anyway—"',
    good: 'Start at the moment the conversation becomes charged. Skip the pleasantries.',
  },
];

const writingProcess = [
  {
    phase: "01",
    icon: Lightbulb,
    title: "The Idea & Development Phase",
    color: "text-amber-400",
    border: "border-amber-500/30",
    bg: "bg-amber-500/5",
    description: "Before you write a word of your actual book, spend time developing the core idea. Most abandoned books die here — not from lack of talent, but from starting before the idea was strong enough.",
    actions: [
      "Write your premise in one sentence: 'A [protagonist] must [goal] before [stakes] happen'",
      "Answer: what is this story really about? (the theme)",
      "Know your ending before you begin — or at least the emotional destination",
      "Research any unfamiliar settings, time periods, or subjects you'll need",
      "Let the idea breathe for a week — see if you're still excited",
    ],
  },
  {
    phase: "02",
    icon: Map,
    title: "Planning & Outlining",
    color: "text-blue-400",
    border: "border-blue-500/30",
    bg: "bg-blue-500/5",
    description: "You don't need a detailed outline — but you need something. Even a rough roadmap of major turning points will prevent the most common cause of stalled manuscripts: not knowing what happens next.",
    actions: [
      "Choose your story structure framework (3-Act, Hero's Journey, etc.)",
      "Write a one-paragraph description of each major act",
      "Identify your 5–7 key scenes (the turning points your story hinges on)",
      "Create character profiles for your main characters",
      "Build a chapter-by-chapter outline (even just one sentence per chapter)",
    ],
  },
  {
    phase: "03",
    icon: Feather,
    title: "The First Draft",
    color: "text-purple-400",
    border: "border-purple-500/30",
    bg: "bg-purple-500/5",
    description: "The first draft's only job is to exist. It will be messy, inconsistent, and full of placeholder scenes. That's not a failure — that's exactly how first drafts are supposed to work.",
    actions: [
      "Write forward, never backward — resist the urge to edit as you go",
      "Set a daily word count goal (500–1,500 words is realistic for most people)",
      "Leave [PLACEHOLDER] notes for research you need to do later",
      "If you're stuck, skip ahead to a scene you're excited to write",
      "Finish the draft — a finished imperfect draft beats a perfect abandoned one",
    ],
  },
  {
    phase: "04",
    icon: RefreshCw,
    title: "Revision & Editing",
    color: "text-emerald-400",
    border: "border-emerald-500/30",
    bg: "bg-emerald-500/5",
    description: "Writing is rewriting. Most published authors do 3–7 full revision passes before a manuscript is ready. Each pass focuses on a different layer of the story.",
    actions: [
      "Let the first draft sit for at least 2 weeks before re-reading",
      "Pass 1: Big picture — does the structure work? Does the character arc land?",
      "Pass 2: Scene-level — does every scene earn its place? Cut anything that doesn't serve the story",
      "Pass 3: Line-level — sharpen prose, vary sentence rhythm, cut redundancy",
      "Pass 4: Dialogue — read every line aloud. If it sounds unnatural, fix it",
    ],
  },
  {
    phase: "05",
    icon: Eye,
    title: "Beta Readers & Feedback",
    color: "text-cyan-400",
    border: "border-cyan-500/30",
    bg: "bg-cyan-500/5",
    description: "You cannot objectively read your own work. You know what you intended — not what you actually wrote. Beta readers reveal the gap between your intention and the reader's experience.",
    actions: [
      "Find 3–5 readers who are honest (not just supportive)",
      "Choose beta readers who read in your genre",
      "Ask specific questions: 'Where did you put the book down?' 'What confused you?' 'Which character felt flat?'",
      "Look for patterns — if one reader mentions something, consider it. If three do, fix it",
      "Don't defend your work — just listen, take notes, and decide later",
    ],
  },
  {
    phase: "06",
    icon: Send,
    title: "Publishing & Sharing",
    color: "text-rose-400",
    border: "border-rose-500/30",
    bg: "bg-rose-500/5",
    description: "Once your manuscript is polished, you have two main publishing paths. Each has real advantages — and neither is the 'wrong' choice.",
    actions: [
      "Traditional: Submit to literary agents → publisher deal → editorial team, distribution, prestige",
      "Self-publishing: Full creative control, higher royalties, faster to market, you handle marketing",
      "For traditional: research agents who represent your genre, follow query letter guidelines exactly",
      "For self-publishing: invest in professional editing, cover design, and formatting",
      "Either way: build an author platform (newsletter, social presence) before your release",
    ],
  },
];

const selfEditingChecklist = [
  { category: "Structure", icon: Layers, color: "text-blue-400", items: ["Every scene has a clear beginning, middle, and end", "Each scene changes something — status, knowledge, or relationship", "The three-act turning points land at approximately the right story positions", "The midpoint raises stakes or changes direction meaningfully", "The climax is the largest, most emotionally charged event"] },
  { category: "Characters", icon: Users, color: "text-purple-400", items: ["The protagonist has a clear goal, flaw, and arc", "The antagonist has understandable (even if wrong) motivations", "Supporting characters each have a distinct voice and purpose", "Characters behave consistently with their established traits", "Reactions to events feel emotionally true"] },
  { category: "Prose", icon: Feather, color: "text-emerald-400", items: ["Sentences vary in length and rhythm — not monotonous", "Show the character's experience, not just the facts", "Cut words that add length without adding meaning", "Use active verbs rather than passive constructions", "Sensory details anchor the reader in each scene"] },
  { category: "Pacing", icon: Zap, color: "text-amber-400", items: ["Action/tension scenes use shorter sentences and paragraphs", "Reflective moments use longer, slower prose", "No scene drags — every paragraph earns its place", "Chapter endings create enough momentum to turn the page", "The story never stops moving for more than necessary"] },
];

const beginnerMistakes = [
  { mistake: "Starting too early", fix: "Most first chapters begin 10–15 pages before the story actually starts. Find where the tension begins — start there.", icon: "01" },
  { mistake: "Telling instead of showing", fix: "Don't tell us a character is angry. Show us clenched fists, clipped sentences, a door closed too hard. Trust the reader.", icon: "02" },
  { mistake: "Passive characters", fix: "Your protagonist should drive the story — not react to it. At every turning point, they should make a choice that has consequences.", icon: "03" },
  { mistake: "Over-explaining and over-describing", fix: "Readers don't need to know everything. Give them enough to anchor in the scene and let their imagination do the rest.", icon: "04" },
  { mistake: "Skipping the conflict in dialogue", fix: "Characters who agree, share information politely, and never misunderstand each other create zero tension. Let them talk past each other.", icon: "05" },
  { mistake: "The perfect protagonist", fix: "Likeable ≠ perfect. We root for flawed people who try anyway. Give your hero real weaknesses that cost them real things.", icon: "06" },
  { mistake: "Ending too quickly", fix: "The climax should feel earned by everything before it. If your ending doesn't feel inevitable in retrospect, the groundwork wasn't laid.", icon: "07" },
  { mistake: "Stopping the first draft to revise", fix: "You cannot edit a blank page. Finish the draft. Every page — even bad ones — is momentum. Revision is a separate phase.", icon: "08" },
];

const sections = [
  { id: "genres",     label: "Genres",      icon: BookOpen },
  { id: "structure",  label: "Structure",   icon: Layers },
  { id: "characters", label: "Characters",  icon: Users },
  { id: "dialogue",   label: "Dialogue",    icon: Mic2 },
  { id: "process",    label: "Process",     icon: Map },
  { id: "editing",    label: "Editing",     icon: Scissors },
  { id: "mistakes",   label: "Mistakes",    icon: Lightbulb },
];

/* ─── COMPONENTS ─── */

function SectionHeader({ label, title, subtitle }: { icon?: any; label: string; title: string; subtitle: string; accent?: string }) {
  return (
    <div className="mb-14">
      <p className="text-xs font-bold uppercase tracking-[0.15em] text-muted-foreground mb-3">{label}</p>
      <h2 className="text-3xl md:text-[2.5rem] font-bold text-foreground mb-4 leading-[1.15] tracking-tight">{title}</h2>
      <div className="w-12 h-[2px] bg-foreground/15 mb-5" />
      <p className="text-muted-foreground text-base max-w-2xl leading-relaxed">{subtitle}</p>
    </div>
  );
}

function Divider() {
  return (
    <div className="flex items-center gap-4 my-24">
      <div className="flex-1 border-t border-border/40" />
      <div className="w-1.5 h-1.5 rounded-full bg-foreground/20" />
      <div className="flex-1 border-t border-border/40" />
    </div>
  );
}

/* ─── MAIN PAGE ─── */

export default function WritingGuide() {
  const [activeSection, setActiveSection] = useState("genres");
  const [expandedGenre, setExpandedGenre] = useState<string | null>(null);
  const [activeStructure, setActiveStructure] = useState(0);
  const [expandedAct, setExpandedAct] = useState<number | null>(null);
  const [expandedChecklist, setExpandedChecklist] = useState<number | null>(0);

  const scrollTo = (id: string) => {
    setActiveSection(id);
    const el = document.getElementById(id);
    if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <Layout>
      {/* ── Hero ── */}
      <motion.div
        initial="hidden" animate="visible" variants={fadeUp}
        className="relative pt-12 pb-20 md:pt-16 md:pb-24 mb-4 overflow-hidden"
      >
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-0 left-1/3 w-[600px] h-[600px] bg-foreground/[0.03] rounded-full blur-[80px] -translate-y-1/2" />
        </div>
        <div className="relative z-10 max-w-3xl mx-auto text-center">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-muted-foreground mb-6">
            Complete Writing Guide
          </p>
          <h1 className="text-5xl md:text-[4.5rem] font-bold text-foreground mb-6 leading-[1.08] tracking-tight">
            From Blank Page<br />
            <span className="text-foreground">to Finished Book</span>
          </h1>
          <p className="text-foreground/55 text-lg max-w-xl mx-auto leading-relaxed mb-10">
            A professional, end-to-end guide covering everything a new writer needs to know — from choosing a genre to writing, revising, and publishing a complete book.
          </p>

          {/* Guide overview grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 max-w-2xl mx-auto text-left">
            {[
              { num: "01", label: "8 Genres Explained" },
              { num: "02", label: "3 Story Structures" },
              { num: "03", label: "Character Craft" },
              { num: "04", label: "Dialogue Mastery" },
              { num: "05", label: "Full Writing Process" },
              { num: "06", label: "Self-Editing System" },
            ].map(({ num, label }) => (
              <div key={num} className="flex items-center gap-3 px-4 py-3 rounded-xl border border-border bg-foreground/[0.025]">
                <span className="text-xs font-bold text-muted-foreground/60 tabular-nums">{num}</span>
                <span className="text-xs font-semibold text-foreground/80">{label}</span>
              </div>
            ))}
          </div>
        </div>
      </motion.div>

      {/* ── Sticky Nav ── */}
      <div className="sticky top-[44px] z-20 mb-20 -mx-4 sm:-mx-6 lg:-mx-8 px-4 sm:px-6 lg:px-8 py-2.5 bg-background/90 backdrop-blur-md border-b border-border/50">
        <div className="flex items-center gap-1 overflow-x-auto scrollbar-none max-w-5xl mx-auto">
          {sections.map(({ id, label }) => (
            <button
              key={id}
              onClick={() => scrollTo(id)}
              className={`flex-shrink-0 px-3.5 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
                activeSection === id
                  ? "bg-foreground text-background"
                  : "text-muted-foreground hover:text-foreground hover:bg-foreground/[0.06]"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* ══════════════════════════════════════════════ */}
      {/* SECTION 1: GENRES */}
      {/* ══════════════════════════════════════════════ */}
      <section id="genres" className="scroll-mt-20">
        <SectionHeader
          icon={BookOpen} label="Section 01 — Genres"
          title="Understanding Book Genres"
          subtitle="Every story belongs to a genre — a category that tells readers what kind of experience to expect. Choosing your genre is one of the most important decisions you'll make as a writer."
        />

        <div className="grid sm:grid-cols-2 gap-4 mb-4">
          {genres.map((genre, i) => {
            const Icon = genre.icon;
            const isExpanded = expandedGenre === genre.name;
            return (
              <motion.div
                key={genre.name} custom={i} initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp}
                className="border border-border rounded-2xl overflow-hidden cursor-pointer bg-card hover:border-foreground/20 transition-all"
                onClick={() => setExpandedGenre(isExpanded ? null : genre.name)}
              >
                <div className="p-5">
                  <div className="flex items-start gap-4">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ backgroundColor: genre.accent + "20" }}>
                      <Icon className="w-5 h-5" style={{ color: genre.accent }} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <h3 className="font-bold text-base text-foreground">{genre.name}</h3>
                        <ChevronDown className={`w-4 h-4 text-muted-foreground flex-shrink-0 transition-transform duration-200 ${isExpanded ? "rotate-180" : ""}`} />
                      </div>
                      <p className="text-sm text-muted-foreground leading-relaxed line-clamp-2">{genre.description}</p>
                    </div>
                  </div>

                  <AnimatePresence>
                    {isExpanded && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.25 }}
                        className="overflow-hidden"
                      >
                        <div className="mt-4 pt-4 border-t border-border space-y-4">
                          <div>
                            <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2">Subgenres</p>
                            <div className="flex flex-wrap gap-1.5">
                              {genre.subgenres.map((s) => (
                                <span key={s} className="text-xs rounded-full px-2.5 py-0.5 border border-border bg-background text-foreground/70">{s}</span>
                              ))}
                            </div>
                          </div>
                          <div>
                            <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2">Core Conventions</p>
                            <ul className="space-y-1">
                              {genre.conventions.map((c) => (
                                <li key={c} className="flex items-start gap-2 text-sm text-foreground/70">
                                  <ChevronRight className="w-3.5 h-3.5 mt-0.5 flex-shrink-0 text-muted-foreground" />
                                  {c}
                                </li>
                              ))}
                            </ul>
                          </div>
                          <div className="rounded-xl p-3 border border-border bg-foreground/4">
                            <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1">Writing Tip</p>
                            <p className="text-sm text-foreground/80 leading-relaxed">{genre.tip}</p>
                          </div>
                          <div>
                            <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2">Notable Examples</p>
                            <div className="flex flex-wrap gap-1.5">
                              {genre.examples.map((ex) => (
                                <span key={ex} className="text-xs rounded-full px-2.5 py-0.5 border border-border bg-background text-foreground/70 italic">{ex}</span>
                              ))}
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </motion.div>
            );
          })}
        </div>
        <p className="text-center text-sm text-muted-foreground">Tap any genre to expand its full breakdown.</p>
      </section>

      <Divider />

      {/* ══════════════════════════════════════════════ */}
      {/* SECTION 2: STRUCTURE */}
      {/* ══════════════════════════════════════════════ */}
      <section id="structure" className="scroll-mt-20">
        <SectionHeader
          icon={Layers} label="Section 02 — Structure"
          title="Three Proven Story Structures"
          subtitle="Professional authors don't write randomly — they follow proven frameworks that readers are unconsciously wired to find satisfying. Learn all three, then choose what fits your story."
        />

        {/* Structure tabs */}
        <div className="flex gap-2 mb-6 overflow-x-auto pb-1">
          {structures.map((s, i) => {
            const Icon = s.icon;
            return (
              <button
                key={s.name}
                onClick={() => { setActiveStructure(i); setExpandedAct(null); }}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold whitespace-nowrap border transition-all flex-shrink-0 ${
                  activeStructure === i
                    ? `bg-foreground text-background border-foreground`
                    : `bg-card border-border text-muted-foreground hover:text-foreground`
                }`}
              >
                <Icon className="w-4 h-4" />
                {s.name}
                <span className={`text-xs px-2 py-0.5 rounded-full ${activeStructure === i ? "bg-background/20" : "bg-foreground/8"}`}>{s.tag}</span>
              </button>
            );
          })}
        </div>

        <AnimatePresence mode="wait">
          <motion.div
            key={activeStructure}
            initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -16 }}
            transition={{ duration: 0.3 }}
          >
            {(() => {
              const s = structures[activeStructure];
              const Icon = s.icon;
              return (
                <div className="space-y-4">
                  <div className={`rounded-2xl border p-6 ${s.bg}`}>
                    <div className="flex items-start gap-4 mb-4">
                      <div className={`w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0 bg-background/50`}>
                        <Icon className={`w-6 h-6 ${s.color}`} />
                      </div>
                      <div>
                        <h3 className="font-bold text-xl text-foreground mb-1">{s.name}</h3>
                        <p className="text-muted-foreground text-sm leading-relaxed">{s.description}</p>
                      </div>
                    </div>
                  </div>

                  {s.acts.map((act, ai) => (
                    <div key={act.label} className="border border-border rounded-2xl bg-card overflow-hidden">
                      <button
                        className="w-full flex items-center justify-between p-5 text-left"
                        onClick={() => setExpandedAct(expandedAct === ai ? null : ai)}
                      >
                        <span className="font-semibold text-foreground text-sm md:text-base">{act.label}</span>
                        <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform ${expandedAct === ai ? "rotate-180" : ""}`} />
                      </button>
                      <AnimatePresence>
                        {expandedAct === ai && (
                          <motion.div initial={{ height: 0 }} animate={{ height: "auto" }} exit={{ height: 0 }} className="overflow-hidden">
                            <div className="px-5 pb-5 space-y-2 border-t border-border pt-4">
                              {act.points.map((pt) => (
                                <div key={pt} className="flex items-start gap-3 text-sm text-foreground/75">
                                  <CheckCircle2 className={`w-4 h-4 flex-shrink-0 mt-0.5 ${s.color}`} />
                                  {pt}
                                </div>
                              ))}
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  ))}
                </div>
              );
            })()}
          </motion.div>
        </AnimatePresence>
      </section>

      <Divider />

      {/* ══════════════════════════════════════════════ */}
      {/* SECTION 3: CHARACTERS */}
      {/* ══════════════════════════════════════════════ */}
      <section id="characters" className="scroll-mt-20">
        <SectionHeader
          icon={Users} label="Section 03 — Characters"
          title="Building Unforgettable Characters"
          subtitle="Plot is what happens. Character is why we care. The most memorable stories are remembered through the people in them — their flaws, their growth, and their choices under pressure."
        />

        <div className="mb-12">
          <h3 className="text-lg font-bold text-foreground mb-2">The Six Pillars of a Great Character</h3>
          <p className="text-muted-foreground text-sm mb-6">Every compelling character is built on these foundations. The more thoroughly you understand them before you write, the more naturally the character will come to life on the page.</p>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {characterPillars.map((pillar, i) => {
              const Icon = pillar.icon;
              return (
                <motion.div
                  key={pillar.title} custom={i} initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp}
                  className={`rounded-2xl border p-5 ${pillar.bg}`}
                >
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-9 h-9 rounded-xl bg-background/60 flex items-center justify-center">
                      <Icon className={`w-4.5 h-4.5 ${pillar.color}`} />
                    </div>
                    <h4 className="font-bold text-foreground text-sm">{pillar.title}</h4>
                  </div>
                  <p className="text-sm text-muted-foreground leading-relaxed mb-3">{pillar.description}</p>
                  <div className="space-y-1">
                    {pillar.examples.map((ex) => (
                      <div key={ex} className="flex items-center gap-2 text-xs text-foreground/60">
                        <ChevronRight className="w-3 h-3 flex-shrink-0" />
                        {ex}
                      </div>
                    ))}
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>

        <div>
          <h3 className="text-lg font-bold text-foreground mb-2">The Three Character Arc Types</h3>
          <p className="text-muted-foreground text-sm mb-6">A character arc is the internal journey your protagonist takes alongside the external story. Choose your arc type before you write — it shapes every scene.</p>

          <div className="space-y-4">
            {arcTypes.map((arc, i) => {
              const Icon = arc.icon;
              return (
                <motion.div
                  key={arc.name} custom={i} initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp}
                  className="border border-border rounded-2xl bg-card p-5 flex gap-4"
                >
                  <div className="w-10 h-10 rounded-xl bg-foreground/6 flex items-center justify-center flex-shrink-0">
                    <Icon className={`w-5 h-5 ${arc.color}`} />
                  </div>
                  <div>
                    <h4 className="font-bold text-foreground mb-1">{arc.name}</h4>
                    <p className="text-sm text-muted-foreground leading-relaxed mb-2">{arc.description}</p>
                    <p className="text-xs text-foreground/60 italic">{arc.example}</p>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>
      </section>

      <Divider />

      {/* ══════════════════════════════════════════════ */}
      {/* SECTION 4: DIALOGUE */}
      {/* ══════════════════════════════════════════════ */}
      <section id="dialogue" className="scroll-mt-20">
        <SectionHeader
          icon={Mic2} label="Section 04 — Dialogue"
          title="Writing Dialogue That Feels Real"
          subtitle="Dialogue is one of the fastest ways to reveal character, create conflict, and advance the plot — all at once. These principles separate amateur dialogue from professional-grade conversation."
        />

        <div className="space-y-5">
          {dialoguePrinciples.map((principle, i) => {
            const Icon = principle.icon;
            return (
              <motion.div
                key={principle.title} custom={i} initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp}
                className="border border-border rounded-2xl bg-card overflow-hidden"
              >
                <div className="p-6">
                  <div className="flex items-start gap-4 mb-4">
                    <div className="w-10 h-10 rounded-xl bg-foreground/6 flex items-center justify-center flex-shrink-0">
                      <Icon className="w-5 h-5 text-foreground/70" />
                    </div>
                    <div>
                      <h3 className="font-bold text-foreground mb-1">{principle.title}</h3>
                      <p className="text-sm text-muted-foreground leading-relaxed">{principle.description}</p>
                    </div>
                  </div>

                  <div className="grid sm:grid-cols-2 gap-3">
                    <div className="rounded-xl border border-red-500/20 bg-red-500/5 p-4">
                      <p className="text-xs font-bold uppercase tracking-wider text-red-400 mb-2">❌ Weak</p>
                      <p className="text-sm text-foreground/70 font-mono leading-relaxed whitespace-pre-line">{principle.bad}</p>
                    </div>
                    <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-4">
                      <p className="text-xs font-bold uppercase tracking-wider text-emerald-400 mb-2">✓ Strong</p>
                      <p className="text-sm text-foreground/70 font-mono leading-relaxed whitespace-pre-line">{principle.good}</p>
                    </div>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      </section>

      <Divider />

      {/* ══════════════════════════════════════════════ */}
      {/* SECTION 5: WRITING PROCESS */}
      {/* ══════════════════════════════════════════════ */}
      <section id="process" className="scroll-mt-20">
        <SectionHeader
          icon={Map} label="Section 05 — The Process"
          title="The Complete Writing Process"
          subtitle="Writing a book is a multi-phase project. Understanding what phase you're in — and what that phase demands of you — is the key to staying productive and finishing what you start."
        />

        <div className="space-y-4">
          {writingProcess.map((phase, i) => {
            const Icon = phase.icon;
            return (
              <motion.div
                key={phase.phase} custom={i} initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp}
                className={`rounded-2xl border p-6 ${phase.bg} ${phase.border}`}
              >
                <div className="flex items-start gap-5">
                  <div className="flex-shrink-0 text-center">
                    <div className="w-12 h-12 rounded-2xl bg-background/60 border border-border flex items-center justify-center mb-1">
                      <Icon className={`w-5 h-5 ${phase.color}`} />
                    </div>
                    <span className={`text-xs font-bold ${phase.color}`}>{phase.phase}</span>
                  </div>
                  <div className="flex-1">
                    <h3 className="font-bold text-lg text-foreground mb-2">{phase.title}</h3>
                    <p className="text-sm text-muted-foreground leading-relaxed mb-4">{phase.description}</p>
                    <div className="space-y-2">
                      {phase.actions.map((action) => (
                        <div key={action} className="flex items-start gap-2.5 text-sm text-foreground/75">
                          <CheckCircle2 className={`w-4 h-4 flex-shrink-0 mt-0.5 ${phase.color}`} />
                          {action}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      </section>

      <Divider />

      {/* ══════════════════════════════════════════════ */}
      {/* SECTION 6: SELF-EDITING */}
      {/* ══════════════════════════════════════════════ */}
      <section id="editing" className="scroll-mt-20">
        <SectionHeader
          icon={Scissors} label="Section 06 — Editing"
          title="The Self-Editing Checklist"
          subtitle="Professional authors revise 3–7 times before submitting. Each pass focuses on a different layer. Use this checklist to systematically strengthen your manuscript."
        />

        <div className="space-y-4">
          {selfEditingChecklist.map((cat, i) => {
            const Icon = cat.icon;
            const isOpen = expandedChecklist === i;
            return (
              <div key={cat.category} className="border border-border rounded-2xl bg-card overflow-hidden">
                <button
                  className="w-full flex items-center gap-4 p-5 text-left hover:bg-foreground/3 transition-colors"
                  onClick={() => setExpandedChecklist(isOpen ? null : i)}
                >
                  <div className="w-9 h-9 rounded-xl bg-foreground/6 flex items-center justify-center flex-shrink-0">
                    <Icon className={`w-4.5 h-4.5 ${cat.color}`} />
                  </div>
                  <span className="font-bold text-foreground flex-1">{cat.category} Checklist</span>
                  <span className="text-xs text-muted-foreground mr-2">{cat.items.length} checks</span>
                  <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform ${isOpen ? "rotate-180" : ""}`} />
                </button>
                <AnimatePresence>
                  {isOpen && (
                    <motion.div initial={{ height: 0 }} animate={{ height: "auto" }} exit={{ height: 0 }} className="overflow-hidden">
                      <div className="px-5 pb-5 border-t border-border pt-4 space-y-2.5">
                        {cat.items.map((item) => (
                          <div key={item} className="flex items-start gap-3 text-sm text-foreground/75">
                            <div className={`w-4 h-4 rounded border-2 flex-shrink-0 mt-0.5 ${cat.color} border-current`} />
                            {item}
                          </div>
                        ))}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })}
        </div>
      </section>

      <Divider />

      {/* ══════════════════════════════════════════════ */}
      {/* SECTION 7: COMMON MISTAKES */}
      {/* ══════════════════════════════════════════════ */}
      <section id="mistakes" className="scroll-mt-20 pb-20">
        <SectionHeader
          icon={Lightbulb} label="Section 07 — Common Mistakes"
          title="8 Mistakes Every Beginner Makes"
          subtitle="These are the most predictable traps new writers fall into — and the most straightforward to fix once you know to look for them."
        />

        <div className="grid sm:grid-cols-2 gap-4">
          {beginnerMistakes.map((item, i) => (
            <motion.div
              key={item.mistake} custom={i} initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp}
              className="border border-border rounded-2xl bg-card p-5 flex gap-4"
            >
              <div className="w-10 h-10 rounded-xl bg-foreground/6 flex items-center justify-center flex-shrink-0 text-sm font-bold text-muted-foreground">
                {item.icon}
              </div>
              <div>
                <h4 className="font-bold text-foreground mb-1.5 text-sm">"{item.mistake}"</h4>
                <p className="text-sm text-muted-foreground leading-relaxed">{item.fix}</p>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Final CTA */}
        <motion.div
          initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp}
          className="mt-16 rounded-3xl border border-border bg-card p-10 text-center"
        >
          <div className="w-14 h-14 rounded-2xl bg-foreground/6 flex items-center justify-center mx-auto mb-5">
            <Award className="w-7 h-7 text-foreground/70" />
          </div>
          <h3 className="text-2xl font-bold text-foreground mb-3">There's Only One Way to Learn to Write</h3>
          <p className="text-muted-foreground max-w-xl mx-auto leading-relaxed mb-6">
            Every framework, tip, and checklist in this guide is secondary to one irreplaceable activity: sitting down and writing. Knowledge without practice is just theory. The writers who finish books are the ones who show up, imperfectly, every day.
          </p>
          <p className="text-sm font-semibold text-foreground/50 italic">
            "The first draft of anything is garbage." — Ernest Hemingway
          </p>
        </motion.div>
      </section>
    </Layout>
  );
}
