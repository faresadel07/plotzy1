import { useState, useEffect, useRef } from "react";
import { useLocation } from "wouter";
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
    description: "Stories driven by love, longing, and emotional connection. The central promise: two people will find happiness together: even if the journey is painful.",
    subgenres: ["Contemporary", "Historical", "Paranormal", "Romantic Suspense"],
    conventions: ["Happily Ever After (HEA) or Happy For Now (HFN) ending", "Emotional tension between leads", "Obstacles keeping them apart"],
    tip: "The push-pull dynamic is everything. Give readers reasons to root for the couple: then give the couple reasons to push each other away.",
    examples: ["Pride and Prejudice", "The Notebook", "Outlander"],
  },
  {
    icon: Search, name: "Mystery / Thriller", accent: "#7c8cff",
    description: "Suspenseful stories built around a crime, hidden truth, or race against time. Readers are hooked by unanswered questions and the promise of resolution.",
    subgenres: ["Cozy Mystery", "Psychological Thriller", "Legal Thriller", "Crime Noir"],
    conventions: ["A central question (whodunit?)", "Clues planted early", "Escalating stakes and reveals"],
    tip: "Plant your clues fairly: the reader should be able to solve it, but not too easily. Every red herring must still feel meaningful in hindsight.",
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
    tip: "The technology is never the real story: the human response to it is. Ask: how does this change what people want, fear, and love?",
    examples: ["Dune", "The Martian", "Ender's Game"],
  },
  {
    icon: Ghost, name: "Horror", accent: "#f87171",
    description: "Stories designed to frighten and unsettle. Horror explores our deepest fears: from supernatural threats to the terror of losing one's mind.",
    subgenres: ["Supernatural Horror", "Psychological Horror", "Body Horror", "Gothic"],
    conventions: ["A slow build of dread", "Characters in genuine danger", "Something truly threatening at the core"],
    tip: "The scariest thing is what the reader imagines. Describe enough to set the scene: then let their imagination fill the gaps with their own worst fears.",
    examples: ["It", "The Shining", "Dracula"],
  },
  {
    icon: Zap, name: "Action / Adventure", accent: "#fbbf24",
    description: "Fast-paced stories where heroes face physical danger, impossible odds, and exciting quests. Every page should feel like it's moving.",
    subgenres: ["Espionage", "Survival", "Heist", "Quest"],
    conventions: ["High physical stakes", "Constant forward momentum", "A hero who acts rather than waits"],
    tip: "Vary your action sequences. A relentless sprint is exhausting: alternate intense action scenes with quieter moments of character development or planning.",
    examples: ["Indiana Jones", "The Hunger Games", "Robinson Crusoe"],
  },
  {
    icon: Drama, name: "Literary / Drama", accent: "#34d399",
    description: "Character-driven stories exploring the full range of human experience. Less about plot events, more about inner lives, relationships, and what it means to be human.",
    subgenres: ["Domestic Drama", "Coming-of-Age", "Social Commentary", "Memoir-Style"],
    conventions: ["Deep interiority and character psychology", "Prose that rewards re-reading", "Ambiguous or earned endings"],
    tip: "Let your characters be contradictory. Real people contain multitudes: a character who is always consistent feels flat. Let their choices surprise even you.",
    examples: ["The Kite Runner", "A Little Life", "Normal People"],
  },
  {
    icon: Clock, name: "Historical Fiction", accent: "#fb923c",
    description: "Stories set in real historical periods, blending fictional characters with authentic settings, events, and atmosphere. The past becomes a living world.",
    subgenres: ["War Fiction", "Ancient World", "Victorian Era", "20th Century"],
    conventions: ["Authentic historical detail", "The tension between historical constraints and modern sensibilities", "Real events as backdrop"],
    tip: "Research until the era lives in your bones: then stop showing it off. Great historical fiction feels lived-in, not like a textbook with characters inserted.",
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
        label: "Act I: Setup (25%)",
        points: ["Introduce your protagonist in their ordinary world", "Establish what they want and what's at stake", "The Inciting Incident: an event that disrupts everything", "End with the protagonist committing to a new direction"],
      },
      {
        label: "Act II: Confrontation (50%)",
        points: ["Protagonist pursues their goal but faces escalating obstacles", "Midpoint twist changes direction or raises the stakes dramatically", "All seems lost: the darkest moment before the climax", "Protagonist discovers what they truly need (vs. what they wanted)"],
      },
      {
        label: "Act III: Resolution (25%)",
        points: ["The climax: the ultimate confrontation or challenge", "The protagonist applies everything they've learned", "Resolution: the new equilibrium after the conflict", "Show how the character (and world) has changed"],
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
        points: ["Ordinary World: hero's life before the adventure", "Call to Adventure: something disrupts the status quo", "Refusal of the Call: hero hesitates (shows stakes)", "Crossing the Threshold: hero commits and enters the new world"],
      },
      {
        label: "Initiation (The Middle)",
        points: ["Tests, Allies, Enemies: the new world challenges the hero", "The Ordeal: a major crisis, the hero faces death (literal or symbolic)", "The Reward: hero gains something valuable from surviving", "The Road Back: hero must return, often pursued by consequences"],
      },
      {
        label: "Return (The End)",
        points: ["The Resurrection: one final, greatest test using all lessons learned", "Return with the Elixir: hero comes home changed, bringing something of value"],
      },
    ],
  },
  {
    name: "Save the Cat! Beat Sheet",
    icon: Square,
    tag: "Most Detailed",
    color: "text-emerald-400",
    bg: "bg-emerald-500/10 border-emerald-500/20",
    description: "Created by screenwriter Blake Snyder, this 15-beat framework gives you a precise structural map. It's highly prescriptive: ideal for beginners who want exact targets for when things should happen.",
    acts: [
      {
        label: "Opening through Break into Two",
        points: ["Opening Image: a snapshot of the hero's flawed world", "Theme Stated: someone states what the story is really about", "Set-Up: establish the status quo and introduce key characters", "Catalyst (p.12/10%): the inciting incident", "Debate (p.12–25%): hero wrestles with the decision", "Break into Two (p.25%): hero enters the upside-down world"],
      },
      {
        label: "Fun and Games through Dark Night",
        points: ["B Story (p.30%): introduce the relationship that carries the theme", "Fun and Games (p.30–55%): the promise of the premise is delivered", "Midpoint (p.55%): a false victory or false defeat", "Bad Guys Close In (p.55–75%): pressure mounts", "All Is Lost (p.75%): the hero's lowest point", "Dark Night of the Soul (p.75–85%): reflection, despair"],
      },
      {
        label: "Break into Three through Final Image",
        points: ["Break into Three (p.85%): hero finds the solution using A+B stories", "Finale (p.85–99%): execute the new plan, defeat antagonist", "Final Image (p.99%): mirror of the Opening Image, shows transformation"],
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
    description: "What does your character consciously want? This is their external goal: the thing they're actively chasing throughout the story.",
    examples: ["Solve the murder", "Win the championship", "Get home safely", "Find true love"],
  },
  {
    icon: Heart,
    title: "The Need",
    color: "text-rose-400",
    bg: "bg-rose-500/10 border-rose-500/20",
    description: "What does your character actually need: the internal truth they must accept to grow? The tension between want and need is what creates a character arc.",
    examples: ["Learn to trust others", "Accept their past", "Forgive themselves", "Choose love over ambition"],
  },
  {
    icon: Ghost,
    title: "The Wound",
    color: "text-purple-400",
    bg: "bg-purple-500/10 border-purple-500/20",
    description: "A defining trauma or formative experience from the past. The wound explains why the character behaves the way they do: and creates the gap between want and need.",
    examples: ["Abandoned as a child", "Failed publicly and catastrophically", "Lost someone they loved", "Betrayed by someone they trusted"],
  },
  {
    icon: Mountain,
    title: "The Flaw",
    color: "text-amber-400",
    bg: "bg-amber-500/10 border-amber-500/20",
    description: "A genuine weakness that creates problems. Not a 'cute' flaw: a real one that costs them something. The flaw is how the wound manifests in behavior.",
    examples: ["Arrogance that alienates allies", "Fear of vulnerability", "Obsessive need for control", "Inability to ask for help"],
  },
  {
    icon: Sparkles,
    title: "The Strength",
    color: "text-emerald-400",
    bg: "bg-emerald-500/10 border-emerald-500/20",
    description: "What makes readers root for your character? They need genuine qualities worth admiring: courage, wit, loyalty, compassion. This is what lets them ultimately overcome.",
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
    example: "Ebenezer Scrooge (A Christmas Carol): goes from miserly and bitter to generous and joyful.",
  },
  {
    name: "The Negative Arc",
    description: "The character starts with potential for growth but ultimately fails to overcome their flaw, descending into corruption, tragedy, or death.",
    icon: Mountain,
    color: "text-rose-400",
    example: "Walter White (Breaking Bad): starts as sympathetic, ends as villain. Macbeth. Anakin Skywalker.",
  },
  {
    name: "The Flat Arc",
    description: "The character doesn't change: they already hold the Truth, and they use it to change the world around them. Common in action/adventure and thrillers.",
    icon: ArrowRight,
    color: "text-blue-400",
    example: "James Bond, Sherlock Holmes, Atticus Finch: their unshakeable principles reshape everyone around them.",
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
    description: "Before you write a word of your actual book, spend time developing the core idea. Most abandoned books die here: not from lack of talent, but from starting before the idea was strong enough.",
    actions: [
      "Write your premise in one sentence: 'A [protagonist] must [goal] before [stakes] happen'",
      "Answer: what is this story really about? (the theme)",
      "Know your ending before you begin: or at least the emotional destination",
      "Research any unfamiliar settings, time periods, or subjects you'll need",
      "Let the idea breathe for a week: see if you're still excited",
    ],
  },
  {
    phase: "02",
    icon: Map,
    title: "Planning & Outlining",
    color: "text-blue-400",
    border: "border-blue-500/30",
    bg: "bg-blue-500/5",
    description: "You don't need a detailed outline: but you need something. Even a rough roadmap of major turning points will prevent the most common cause of stalled manuscripts: not knowing what happens next.",
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
    description: "The first draft's only job is to exist. It will be messy, inconsistent, and full of placeholder scenes. That's not a failure: that's exactly how first drafts are supposed to work.",
    actions: [
      "Write forward, never backward: resist the urge to edit as you go",
      "Set a daily word count goal (500–1,500 words is realistic for most people)",
      "Leave [PLACEHOLDER] notes for research you need to do later",
      "If you're stuck, skip ahead to a scene you're excited to write",
      "Finish the draft: a finished imperfect draft beats a perfect abandoned one",
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
      "Pass 1: Big picture: does the structure work? Does the character arc land?",
      "Pass 2: Scene-level: does every scene earn its place? Cut anything that doesn't serve the story",
      "Pass 3: Line-level: sharpen prose, vary sentence rhythm, cut redundancy",
      "Pass 4: Dialogue: read every line aloud. If it sounds unnatural, fix it",
    ],
  },
  {
    phase: "05",
    icon: Eye,
    title: "Beta Readers & Feedback",
    color: "text-cyan-400",
    border: "border-cyan-500/30",
    bg: "bg-cyan-500/5",
    description: "You cannot objectively read your own work. You know what you intended: not what you actually wrote. Beta readers reveal the gap between your intention and the reader's experience.",
    actions: [
      "Find 3–5 readers who are honest (not just supportive)",
      "Choose beta readers who read in your genre",
      "Ask specific questions: 'Where did you put the book down?' 'What confused you?' 'Which character felt flat?'",
      "Look for patterns: if one reader mentions something, consider it. If three do, fix it",
      "Don't defend your work: just listen, take notes, and decide later",
    ],
  },
  {
    phase: "06",
    icon: Send,
    title: "Publishing & Sharing",
    color: "text-rose-400",
    border: "border-rose-500/30",
    bg: "bg-rose-500/5",
    description: "Once your manuscript is polished, you have two main publishing paths. Each has real advantages: and neither is the 'wrong' choice.",
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
  { category: "Structure", icon: Layers, color: "text-blue-400", items: ["Every scene has a clear beginning, middle, and end", "Each scene changes something: status, knowledge, or relationship", "The three-act turning points land at approximately the right story positions", "The midpoint raises stakes or changes direction meaningfully", "The climax is the largest, most emotionally charged event"] },
  { category: "Characters", icon: Users, color: "text-purple-400", items: ["The protagonist has a clear goal, flaw, and arc", "The antagonist has understandable (even if wrong) motivations", "Supporting characters each have a distinct voice and purpose", "Characters behave consistently with their established traits", "Reactions to events feel emotionally true"] },
  { category: "Prose", icon: Feather, color: "text-emerald-400", items: ["Sentences vary in length and rhythm: not monotonous", "Show the character's experience, not just the facts", "Cut words that add length without adding meaning", "Use active verbs rather than passive constructions", "Sensory details anchor the reader in each scene"] },
  { category: "Pacing", icon: Zap, color: "text-amber-400", items: ["Action/tension scenes use shorter sentences and paragraphs", "Reflective moments use longer, slower prose", "No scene drags: every paragraph earns its place", "Chapter endings create enough momentum to turn the page", "The story never stops moving for more than necessary"] },
];

const beginnerMistakes = [
  { mistake: "Starting too early", fix: "Most first chapters begin 10–15 pages before the story actually starts. Find where the tension begins: start there.", icon: "01" },
  { mistake: "Telling instead of showing", fix: "Don't tell us a character is angry. Show us clenched fists, clipped sentences, a door closed too hard. Trust the reader.", icon: "02" },
  { mistake: "Passive characters", fix: "Your protagonist should drive the story: not react to it. At every turning point, they should make a choice that has consequences.", icon: "03" },
  { mistake: "Over-explaining and over-describing", fix: "Readers don't need to know everything. Give them enough to anchor in the scene and let their imagination do the rest.", icon: "04" },
  { mistake: "Skipping the conflict in dialogue", fix: "Characters who agree, share information politely, and never misunderstand each other create zero tension. Let them talk past each other.", icon: "05" },
  { mistake: "The perfect protagonist", fix: "Likeable ≠ perfect. We root for flawed people who try anyway. Give your hero real weaknesses that cost them real things.", icon: "06" },
  { mistake: "Ending too quickly", fix: "The climax should feel earned by everything before it. If your ending doesn't feel inevitable in retrospect, the groundwork wasn't laid.", icon: "07" },
  { mistake: "Stopping the first draft to revise", fix: "You cannot edit a blank page. Finish the draft. Every page: even bad ones: is momentum. Revision is a separate phase.", icon: "08" },
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
    <div className="mb-8 text-center px-2 sm:px-0" style={{ fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Display', 'Helvetica Neue', sans-serif" }}>
      <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-muted-foreground/70 mb-3">{label}</p>
      <h2 className="text-[1.5rem] sm:text-[1.75rem] md:text-[2.25rem] font-bold text-foreground mb-3 leading-[1.15] md:leading-[1.1] tracking-[-0.02em] md:tracking-[-0.025em]">{title}</h2>
      <p className="text-muted-foreground text-[13px] sm:text-[14px] md:text-[15px] max-w-xl leading-[1.65] mx-auto">{subtitle}</p>
    </div>
  );
}

function Divider() {
  return (
    <div className="my-12 flex items-center justify-center gap-2" aria-hidden>
      <span className="w-8 h-px bg-border" />
      <span className="w-0.5 h-0.5 rounded-full bg-muted-foreground/30" />
      <span className="w-0.5 h-0.5 rounded-full bg-muted-foreground/30" />
      <span className="w-0.5 h-0.5 rounded-full bg-muted-foreground/30" />
      <span className="w-8 h-px bg-border" />
    </div>
  );
}

/* ─── MAIN PAGE ─── */

export default function WritingGuide() {
  const [, navigate] = useLocation();
  const [activeSection, setActiveSection] = useState("genres");
  const [expandedGenre, setExpandedGenre] = useState<string | null>(null);
  const [activeStructure, setActiveStructure] = useState(0);
  const [expandedAct, setExpandedAct] = useState<number | null>(null);
  const [expandedChecklist, setExpandedChecklist] = useState<number | null>(0);
  const [scrollProgress, setScrollProgress] = useState(0);
  const [readSections, setReadSections] = useState<Set<string>>(new Set());

  const isScrollingRef = useRef(false);
  const scrollTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Scroll progress bar
  useEffect(() => {
    const handleScroll = () => {
      const scrollTop = window.scrollY;
      const docHeight = document.documentElement.scrollHeight - window.innerHeight;
      const progress = docHeight > 0 ? Math.min((scrollTop / docHeight) * 100, 100) : 0;
      setScrollProgress(progress);
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    const sectionIds = ["genres", "structure", "characters", "dialogue", "process", "editing", "mistakes"];
    const observers: IntersectionObserver[] = [];

    sectionIds.forEach(id => {
      const el = document.getElementById(id);
      if (!el) return;
      const obs = new IntersectionObserver(
        ([entry]) => {
          if (entry.isIntersecting) {
            if (!isScrollingRef.current) {
              setActiveSection(id);
            }
            setReadSections(prev => {
              if (prev.has(id)) return prev;
              const next = new Set(prev);
              next.add(id);
              return next;
            });
          }
        },
        { rootMargin: "-30% 0px -60% 0px", threshold: 0 }
      );
      obs.observe(el);
      observers.push(obs);
    });

    return () => observers.forEach(o => o.disconnect());
  }, []);

  const scrollTo = (id: string) => {
    setActiveSection(id);
    isScrollingRef.current = true;
    if (scrollTimerRef.current) clearTimeout(scrollTimerRef.current);
    scrollTimerRef.current = setTimeout(() => { isScrollingRef.current = false; }, 1000);
    const el = document.getElementById(id);
    if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <Layout isFullDark lightNav>
      {/* ── Progress Bar ── */}
      <div style={{
        position: "fixed", top: 0, left: 0, width: `${scrollProgress}%`, height: 3,
        background: "#fff", zIndex: 50, transition: "width 0.1s linear",
      }} />

      <div className="dark px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
      {/* ── Hero ── */}
      <motion.header
        initial="hidden" animate="visible" variants={fadeUp}
        className="relative pt-10 pb-8 md:pt-14 md:pb-10 border-b border-border/40"
        style={{ fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Display', 'Helvetica Neue', sans-serif" }}
      >
        <div className="relative z-10 max-w-3xl mx-auto text-center">
          <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-muted-foreground/70 mb-4">
            The Plotzy Writing Guide
          </p>
          <h1 className="text-[1.875rem] sm:text-[2.25rem] md:text-[3.5rem] font-bold text-foreground mb-4 leading-[1.1] md:leading-[1.05] tracking-[-0.03em] md:tracking-[-0.035em] px-2 sm:px-0">
            From blank page to <span className="bg-gradient-to-br from-white to-white/55 bg-clip-text text-transparent">finished book</span>.
          </h1>
          <p className="text-foreground/60 text-[13px] sm:text-[14px] md:text-[15px] max-w-xl mx-auto leading-[1.65] px-2 sm:px-0">
            A professional, end-to-end handbook for the craft of writing. Seven sections distilled from decades of published work: genre, structure, character, dialogue, process, revision, and the mistakes that kill first drafts.
          </p>
          <div className="mt-5 inline-flex items-center flex-wrap justify-center gap-x-2.5 gap-y-1 text-[10px] text-muted-foreground/70 px-4">
            <span className="font-mono">20 min read</span>
            <span className="w-0.5 h-0.5 rounded-full bg-muted-foreground/40" />
            <span>7 sections</span>
            <span className="w-0.5 h-0.5 rounded-full bg-muted-foreground/40" />
            <span>For writers at every level</span>
          </div>
        </div>
      </motion.header>

      {/* ── Sticky Nav ── */}
      <div
        className="sticky top-[44px] z-20 mb-8 md:mb-10 -mx-4 sm:-mx-6 lg:-mx-8 px-3 sm:px-6 lg:px-8 py-2 md:py-2.5 bg-background/90 backdrop-blur-md border-b border-border/50"
        style={{ fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Display', 'Helvetica Neue', sans-serif" }}
      >
        <div className="flex items-center gap-1 overflow-x-auto max-w-5xl mx-auto" style={{ scrollbarWidth: "none", msOverflowStyle: "none" as any }}>
          {sections.map(({ id, label }) => (
            <button
              key={id}
              onClick={() => scrollTo(id)}
              className={`flex-shrink-0 px-3 md:px-3.5 py-1.5 rounded-lg text-[11px] md:text-xs font-semibold whitespace-nowrap transition-all ${
                activeSection === id
                  ? "bg-foreground text-background"
                  : "text-muted-foreground hover:text-foreground hover:bg-foreground/[0.06]"
              }`}
            >
              {label}
            </button>
          ))}
          <span className="hidden sm:inline-flex flex-shrink-0 ml-2 px-3 py-1.5 rounded-lg text-xs font-semibold text-muted-foreground bg-foreground/[0.04] border border-border/50 whitespace-nowrap">
            {readSections.size}/7 sections read
          </span>
        </div>
      </div>

      {/* ── Flex wrapper for sidebar + content ── */}
      <div className="flex gap-0 lg:gap-8">
        {/* ── Fixed Sidebar TOC (Desktop Only) — locked to viewport, always visible ── */}
        <aside className="hidden lg:block flex-shrink-0" style={{ width: 200 }} aria-hidden>
          {/* Placeholder to reserve grid space */}
        </aside>
        <aside className="hidden lg:block" style={{ position: "fixed", top: 120, left: "max(24px, calc((100vw - 1280px) / 2 + 24px))", width: 200, zIndex: 30 }}>
          <div style={{ width: 200 }}>
            <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-muted-foreground mb-4">Table of Contents</p>
            <nav className="space-y-1">
              {sections.map((sec, i) => {
                const isActive = activeSection === sec.id;
                const isRead = readSections.has(sec.id);
                return (
                  <button
                    key={sec.id}
                    onClick={() => scrollTo(sec.id)}
                    className="w-full flex items-center gap-2.5 py-1.5 text-left transition-all group"
                  >
                    <span className={`flex-shrink-0 w-1.5 h-1.5 rounded-full transition-all ${isActive ? "bg-white scale-125" : "bg-transparent"}`} />
                    <span className={`text-xs font-mono ${isActive ? "text-white font-bold" : "text-muted-foreground group-hover:text-foreground/70"}`}>
                      {String(i + 1).padStart(2, "0")}
                    </span>
                    <span className={`text-xs flex-1 truncate transition-colors ${isActive ? "text-white font-semibold" : "text-muted-foreground group-hover:text-foreground/70"}`}>
                      {sec.label}
                    </span>
                    {isRead && !isActive && (
                      <svg className="w-3 h-3 text-emerald-400 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
                    )}
                  </button>
                );
              })}
            </nav>
          </div>
        </aside>

        {/* ── Main content area ── */}
        <div className="flex-1 min-w-0">

      {/* ══════════════════════════════════════════════ */}
      {/* SECTION 1: GENRES */}
      {/* ══════════════════════════════════════════════ */}
      <section id="genres" className="scroll-mt-20">
        <SectionHeader
          icon={BookOpen} label="01. Genres"
          title="Find your genre."
          subtitle="Every story belongs to a genre. It's a promise to the reader about what kind of experience to expect, and it shapes your characters, your pacing, your voice, and even who will read you."
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
                            <div style={{
                              borderLeft: "3px solid " + genre.accent,
                              paddingLeft: 16,
                              margin: "12px 0",
                              fontStyle: "italic",
                              color: "rgba(255,255,255,0.6)",
                              fontSize: 14,
                              lineHeight: 1.7,
                            }}>
                              {genre.tip}
                            </div>
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
        <p className="text-center text-xs text-muted-foreground/60 mt-6 italic">
          Click any genre to reveal its conventions, writing tips, and notable examples.
        </p>
      </section>

      <Divider />

      {/* ══════════════════════════════════════════════ */}
      {/* SECTION 2: STRUCTURE */}
      {/* ══════════════════════════════════════════════ */}
      <section id="structure" className="scroll-mt-20">
        <SectionHeader
          icon={Layers} label="02. Structure"
          title="Shape the story."
          subtitle="Professional authors don't write in straight lines. They follow frameworks that readers are unconsciously wired to find satisfying. Learn all three, then choose the one that fits the story you're actually telling."
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
          icon={Users} label="03. Character"
          title="Write people, not placeholders."
          subtitle="Plot is what happens. Character is why we care. The stories that live longest in memory aren't remembered for their events. They're remembered for the people who lived through them, flawed and changing."
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
          <p className="text-muted-foreground text-sm mb-6">A character arc is the internal journey your protagonist takes alongside the external story. Choose your arc type before you write: it shapes every scene.</p>

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
          icon={Mic2} label="04. Dialogue"
          title="Make them talk like people."
          subtitle="Dialogue is the fastest way to reveal character, create conflict, and advance plot, all in the same breath. These four principles separate amateur dialogue from the kind that carries a scene."
        />

        <div className="space-y-5">
          {dialoguePrinciples.map((principle, i) => {
            const Icon = principle.icon;
            return (
              <motion.div
                key={principle.title} custom={i} initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp}
                className="border border-border rounded-2xl bg-card overflow-hidden"
              >
                <div className="p-4 sm:p-6">
                  <div className="flex items-start gap-3 sm:gap-4 mb-4">
                    <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-foreground/6 flex items-center justify-center flex-shrink-0">
                      <Icon className="w-4 h-4 sm:w-5 sm:h-5 text-foreground/70" />
                    </div>
                    <div className="min-w-0">
                      <h3 className="font-bold text-foreground mb-1 text-[15px] sm:text-base">{principle.title}</h3>
                      <p className="text-[13px] sm:text-sm text-muted-foreground leading-relaxed">{principle.description}</p>
                    </div>
                  </div>

                  <div className="grid sm:grid-cols-2 gap-3">
                    <div className="rounded-xl border border-red-500/20 bg-red-500/5 p-3 sm:p-4">
                      <p className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-red-400 mb-2">✗ Weak</p>
                      <p className="text-[12px] sm:text-sm text-foreground/70 font-mono leading-relaxed whitespace-pre-line break-words">{principle.bad}</p>
                    </div>
                    <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-3 sm:p-4">
                      <p className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-emerald-400 mb-2">✓ Strong</p>
                      <p className="text-[12px] sm:text-sm text-foreground/70 font-mono leading-relaxed whitespace-pre-line break-words">{principle.good}</p>
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
          icon={Map} label="05. Process"
          title="From idea to published book."
          subtitle="Writing a book is a multi-phase project. Understanding which phase you're in, and what that phase actually demands of you, is the difference between writers who finish and writers who don't."
        />

        <div className="space-y-4">
          {writingProcess.map((phase, i) => {
            const Icon = phase.icon;
            return (
              <motion.div
                key={phase.phase} custom={i} initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp}
                className={`rounded-2xl border p-4 sm:p-6 ${phase.bg} ${phase.border}`}
              >
                <div className="flex items-start gap-3 sm:gap-5">
                  <div className="flex-shrink-0 text-center">
                    <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-2xl bg-background/60 border border-border flex items-center justify-center mb-1">
                      <Icon className={`w-4 h-4 sm:w-5 sm:h-5 ${phase.color}`} />
                    </div>
                    <span className={`text-[10px] sm:text-xs font-bold ${phase.color}`}>{phase.phase}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-bold text-base sm:text-lg text-foreground mb-2">{phase.title}</h3>
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
          icon={Scissors} label="06. Editing"
          title="Writing is rewriting."
          subtitle="Published authors revise three to seven times before a manuscript is ready. Each pass focuses on a different layer: structure, character, prose, pacing. Use this checklist as your map through the work."
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
          icon={Lightbulb} label="07. Pitfalls"
          title="The eight mistakes every beginner makes."
          subtitle="These are the most predictable traps new writers fall into, and the easiest to fix once you know to look for them. Most aren't talent problems. They're awareness problems."
        />

        <div className="grid sm:grid-cols-2 gap-4">
          {beginnerMistakes.map((item, i) => (
            <motion.div
              key={item.mistake} custom={i} initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp}
              className="border border-border rounded-2xl bg-card p-4 sm:p-5 flex gap-3 sm:gap-4"
            >
              <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-foreground/6 flex items-center justify-center flex-shrink-0 text-xs sm:text-sm font-bold text-muted-foreground">
                {item.icon}
              </div>
              <div className="min-w-0">
                <h4 className="font-bold text-foreground mb-1.5 text-sm">"{item.mistake}"</h4>
                <p className="text-[13px] sm:text-sm text-muted-foreground leading-relaxed">{item.fix}</p>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Author Wisdom */}
        <motion.div
          initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp}
          className="mt-12 mb-4"
          style={{ fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Display', 'Helvetica Neue', sans-serif" }}
        >
          <div className="text-center mb-8">
            <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-muted-foreground/70 mb-3">From the Masters</p>
            <h2 className="text-[1.75rem] md:text-[2.25rem] font-bold text-foreground mb-3 leading-[1.1] tracking-[-0.025em]">
              What the greats learned.
            </h2>
            <p className="text-muted-foreground text-[14px] md:text-[15px] max-w-xl leading-[1.65] mx-auto">
              Eight writers whose books have shaped how we read and write, each with a single piece of advice and a concrete way to apply it.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {[
              {
                quote: "It is impossible to live without failing at something, unless you live so cautiously that you might as well not have lived at all: in which case, you fail by default.",
                author: "J.K. Rowling",
                work: "Harvard Commencement Speech, 2008",
                tip: "Embrace failure as part of the creative process. Every rejected manuscript, every abandoned draft, is a step toward your finished book.",
                accent: "#a78bfa",
                initials: "JKR",
              },
              {
                quote: "If you don't have time to read, you don't have the time (or the tools) to write. Simple as that.",
                author: "Stephen King",
                work: "On Writing: A Memoir of the Craft",
                tip: "Read voraciously in your genre and outside it. Every book you read is a masterclass in how story, voice, and structure work.",
                accent: "#f87171",
                initials: "SK",
              },
              {
                quote: "You don't write because you want to say something; you write because you have something to say.",
                author: "F. Scott Fitzgerald",
                work: "The Crack-Up, 1936",
                tip: "Before you begin, ask yourself: what is the one thing this story must say? That core truth will guide every scene you write.",
                accent: "#38bdf8",
                initials: "FSF",
              },
              {
                quote: "There is no greater agony than bearing an untold story inside you.",
                author: "Maya Angelou",
                work: "I Know Why the Caged Bird Sings",
                tip: "The story already exists inside you. Your job as a writer is not to invent it: it is to find the courage to tell it honestly.",
                accent: "#fb923c",
                initials: "MA",
              },
              {
                quote: "A reader lives a thousand lives before he dies. The man who never reads lives only one.",
                author: "George R.R. Martin",
                work: "A Dance with Dragons",
                tip: "Remember why stories matter: they expand empathy. Write characters so real that readers feel they have truly lived inside another life.",
                accent: "#4ade80",
                initials: "GRRM",
              },
              {
                quote: "The first draft is just you telling yourself the story.",
                author: "Terry Pratchett",
                work: "Advice on Writing",
                tip: "Give yourself permission to write badly at first. The magic of writing happens in revision: but only if there is a first draft to revise.",
                accent: "#facc15",
                initials: "TP",
              },
            ].map((item, i) => (
              <motion.div
                key={item.author}
                initial="hidden" whileInView="visible" viewport={{ once: true }}
                custom={i % 2}
                variants={fadeUp}
                className="rounded-2xl border border-border bg-card overflow-hidden"
              >
                <div className="p-6">
                  {/* Quote mark */}
                  <div
                    className="text-5xl font-serif leading-none mb-3 select-none"
                    style={{ color: item.accent, opacity: 0.6 }}
                  >"</div>

                  {/* Quote */}
                  <p className="text-foreground text-[15px] leading-relaxed font-medium italic mb-5">
                    {item.quote}
                  </p>

                  {/* Author */}
                  <div className="flex items-center gap-3 mb-5">
                    <div
                      className="w-9 h-9 rounded-full flex items-center justify-center text-[11px] font-bold flex-shrink-0"
                      style={{ backgroundColor: item.accent + "22", color: item.accent }}
                    >
                      {item.initials}
                    </div>
                    <div>
                      <p className="text-sm font-bold text-foreground">{item.author}</p>
                      <p className="text-xs text-muted-foreground">{item.work}</p>
                    </div>
                  </div>

                  {/* Practical tip */}
                  <div
                    className="rounded-xl p-4"
                    style={{ backgroundColor: item.accent + "0f", borderLeft: `3px solid ${item.accent}` }}
                  >
                    <p className="text-xs font-bold uppercase tracking-wider mb-1.5" style={{ color: item.accent }}>
                      Practical Takeaway
                    </p>
                    <p className="text-sm text-muted-foreground leading-relaxed">{item.tip}</p>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* Final CTA — Closing */}
        <motion.div
          initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp}
          className="mt-12 mb-4 text-center max-w-xl mx-auto"
          style={{ fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Display', 'Helvetica Neue', sans-serif" }}
        >
          <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-muted-foreground/70 mb-3">
            A Closing Note
          </p>
          <h3 className="text-[1.5rem] md:text-[1.875rem] font-bold text-foreground mb-4 leading-[1.2] tracking-[-0.02em]">
            The only way to write a book is to write it.
          </h3>
          <p className="text-muted-foreground leading-[1.65] text-[14px] md:text-[15px] mb-6">
            Every framework in this guide is secondary to one irreplaceable act: showing up at the page. Read this guide once. Come back to it when stuck. But don&apos;t mistake reading about writing for writing itself. The writers who finish books are the ones who write imperfectly, every day, until they&apos;re done.
          </p>
          <blockquote className="mt-6 py-4 px-5 rounded-xl border border-border/60 bg-foreground/[0.02] max-w-sm mx-auto">
            <p className="text-[14px] italic text-foreground/85 leading-relaxed mb-2">
              &ldquo;The first draft of anything is garbage.&rdquo;
            </p>
            <cite className="text-[10px] not-italic font-semibold tracking-[0.15em] uppercase text-muted-foreground/70">
              Ernest Hemingway
            </cite>
          </blockquote>
        </motion.div>
      </section>

        </div>{/* end main content area */}
      </div>{/* end flex wrapper */}

      </div>
    </Layout>
  );
}
