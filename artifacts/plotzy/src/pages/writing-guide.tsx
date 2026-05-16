import { useState, useEffect, useRef } from "react";
import { useLocation } from "wouter";
import { Layout } from "@/components/layout";
import { SEO } from "@/components/SEO";
import { JsonLd } from "@/components/JsonLd";
import { buildBreadcrumbSchema } from "@/lib/seo-schema";
import { useLanguage } from "@/contexts/language-context";
import { motion, AnimatePresence, type Variants } from "framer-motion";
import {
  BookOpen, Layers, Map, AlignLeft, Lightbulb,
  Heart, Zap, Drama, Search, Wand2, Ghost, Clock,
  ChevronDown, ChevronRight, Star, ArrowRight,
  PenLine, Users, Globe, Mountain, List, Bookmark,
  CheckCircle2, Flame, Compass, Target, Mic2,
  Scissors, Send, RefreshCw, Eye, Brain, Sparkles,
  TrendingUp, MessageSquare, Feather, Award,
  Circle, Triangle, Square, Hexagon, Download, Loader2,
} from "lucide-react";
import { useAuth } from "@/contexts/auth-context";
import { AuthModal } from "@/components/auth-modal";
import { useToast } from "@/hooks/use-toast";

const GUIDE_API_BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

const fadeUp: Variants = {
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
    nameAr: "الرومانسية",
    description: "Stories driven by love, longing, and emotional connection. The central promise: two people will find happiness together, even if the journey is painful.",
    descriptionAr: "قصص يحرّكها الحب والشوق والرابطة العاطفية. الوعد المحوري: شخصان سيجدان السعادة معاً، حتى لو كان الطريق مؤلماً.",
    subgenres: ["Contemporary", "Historical", "Paranormal", "Romantic Suspense"],
    subgenresAr: ["معاصرة", "تاريخية", "ما وراء الطبيعة", "تشويق رومانسي"],
    conventions: ["Happily Ever After (HEA) or Happy For Now (HFN) ending", "Emotional tension between leads", "Obstacles keeping them apart"],
    conventionsAr: ["نهاية سعيدة دائمة أو سعيدة للآن", "توتر عاطفي بين البطلين", "عقبات تُبقيهما متباعدين"],
    tip: "The push-pull dynamic is everything. Give readers reasons to root for the couple, then give the couple reasons to push each other away.",
    tipAr: "ديناميكية الجذب والدفع هي كل شيء. امنح القرّاء أسباباً لتأييد الثنائي، ثم امنح الثنائي أسباباً لتنافرهما.",
    examples: ["Pride and Prejudice", "The Notebook", "Outlander"],
  },
  {
    icon: Search, name: "Mystery / Thriller", accent: "#7c8cff",
    nameAr: "الغموض / الإثارة",
    description: "Suspenseful stories built around a crime, hidden truth, or race against time. Readers are hooked by unanswered questions and the promise of resolution.",
    descriptionAr: "قصص مشوّقة مبنية حول جريمة أو حقيقة خفية أو سباق مع الزمن. يَعلَق القرّاء بالأسئلة المعلّقة ووعد الحلّ.",
    subgenres: ["Cozy Mystery", "Psychological Thriller", "Legal Thriller", "Crime Noir"],
    subgenresAr: ["غموض هادئ", "إثارة نفسية", "إثارة قانونية", "جريمة نوار"],
    conventions: ["A central question (whodunit?)", "Clues planted early", "Escalating stakes and reveals"],
    conventionsAr: ["سؤال محوري (من الفاعل؟)", "أدلّة مزروعة مبكراً", "رهانات وكشوفات متصاعدة"],
    tip: "Plant your clues fairly: the reader should be able to solve it, but not too easily. Every red herring must still feel meaningful in hindsight.",
    tipAr: "ازرع أدلّتك بإنصاف: ينبغي أن يقدر القارئ على الحلّ، لكن ليس بسهولة مفرطة. وكل دليل مضلِّل يجب أن يظلّ ذا معنى عند المراجعة.",
    examples: ["Gone Girl", "The Girl with the Dragon Tattoo", "Big Little Lies"],
  },
  {
    icon: Wand2, name: "Fantasy", accent: "#a78bfa",
    nameAr: "الفانتازيا",
    description: "Worlds beyond reality filled with magic, mythical creatures, and epic struggles. Fantasy asks 'what if' and then builds an entire universe around the answer.",
    descriptionAr: "عوالم تتجاوز الواقع مليئة بالسحر والمخلوقات الأسطورية والصراعات الملحمية. تسأل الفانتازيا «ماذا لو» ثم تبني كوناً كاملاً حول الجواب.",
    subgenres: ["Epic Fantasy", "Urban Fantasy", "Dark Fantasy", "Portal Fantasy"],
    subgenresAr: ["فانتازيا ملحمية", "فانتازيا حضرية", "فانتازيا مظلمة", "فانتازيا البوابات"],
    conventions: ["A consistent magic system with rules and costs", "World-building depth", "A clash of powerful forces"],
    conventionsAr: ["نظام سحري متّسق بقواعد وأثمان", "عمق في بناء العالم", "صدام بين قوى عظيمة"],
    tip: "Magic must have limits. A hero who can do anything creates no tension. Define what magic cannot do as carefully as what it can.",
    tipAr: "للسحر حدود لا بدّ منها. البطل الذي يقدر على كل شيء لا يخلق أي توتر. حدِّد ما لا يستطيع السحر فعله بالعناية نفسها التي تحدّد بها ما يستطيعه.",
    examples: ["Harry Potter", "The Lord of the Rings", "A Song of Ice and Fire"],
  },
  {
    icon: Globe, name: "Science Fiction", accent: "#38bdf8",
    nameAr: "الخيال العلمي",
    description: "Speculative stories exploring future technology, space, AI, and the human condition in a changed world. The best sci-fi uses technology to illuminate human nature.",
    descriptionAr: "قصص تأمّلية تستكشف تقنيات المستقبل والفضاء والذكاء الاصطناعي والحالة الإنسانية في عالم متغيّر. أفضل الخيال العلمي يستخدم التقنية لإضاءة الطبيعة البشرية.",
    subgenres: ["Space Opera", "Dystopian", "Cyberpunk", "Hard Sci-Fi"],
    subgenresAr: ["أوبرا فضائية", "ديستوبيا", "سايبربانك", "خيال علمي صلب"],
    conventions: ["A 'what if?' premise grounded in science", "Technology with social consequences", "Big ideas wrapped in personal stories"],
    conventionsAr: ["فرضية «ماذا لو؟» مؤسَّسة على العلم", "تقنية ذات عواقب اجتماعية", "أفكار كبيرة مغلّفة بقصص شخصية"],
    tip: "The technology is never the real story: the human response to it is. Ask: how does this change what people want, fear, and love?",
    tipAr: "التقنية ليست القصة الحقيقية أبداً؛ بل استجابة الإنسان لها. اسأل: كيف يغيّر هذا ما يريده الناس ويخافونه ويحبّونه؟",
    examples: ["Dune", "The Martian", "Ender's Game"],
  },
  {
    icon: Ghost, name: "Horror", accent: "#f87171",
    nameAr: "الرعب",
    description: "Stories designed to frighten and unsettle. Horror explores our deepest fears, from supernatural threats to the terror of losing one's mind.",
    descriptionAr: "قصص مصمّمة لتُخيف وتُقلق. يستكشف الرعب أعمق مخاوفنا، من التهديدات الخارقة إلى رعب فقدان العقل.",
    subgenres: ["Supernatural Horror", "Psychological Horror", "Body Horror", "Gothic"],
    subgenresAr: ["رعب خارق للطبيعة", "رعب نفسي", "رعب جسدي", "قوطي"],
    conventions: ["A slow build of dread", "Characters in genuine danger", "Something truly threatening at the core"],
    conventionsAr: ["تصاعد بطيء للخوف", "شخصيات في خطر حقيقي", "شيء مهدِّد فعلاً في الجوهر"],
    tip: "The scariest thing is what the reader imagines. Describe enough to set the scene, then let their imagination fill the gaps with their own worst fears.",
    tipAr: "أكثر ما يُخيف هو ما يتخيّله القارئ. صِف ما يكفي لرسم المشهد، ثم دع خياله يملأ الفراغات بأسوأ مخاوفه.",
    examples: ["It", "The Shining", "Dracula"],
  },
  {
    icon: Zap, name: "Action / Adventure", accent: "#fbbf24",
    nameAr: "الأكشن / المغامرة",
    description: "Fast-paced stories where heroes face physical danger, impossible odds, and exciting quests. Every page should feel like it's moving.",
    descriptionAr: "قصص سريعة الإيقاع يواجه فيها الأبطال خطراً جسدياً واحتمالات مستحيلة ومهام مثيرة. ينبغي أن تشعر كل صفحة وكأنها تتحرّك.",
    subgenres: ["Espionage", "Survival", "Heist", "Quest"],
    subgenresAr: ["تجسّس", "نجاة", "سطو", "بحث وسعي"],
    conventions: ["High physical stakes", "Constant forward momentum", "A hero who acts rather than waits"],
    conventionsAr: ["رهانات جسدية عالية", "زخم متواصل إلى الأمام", "بطل يتصرّف بدل أن ينتظر"],
    tip: "Vary your action sequences. A relentless sprint is exhausting: alternate intense action scenes with quieter moments of character development or planning.",
    tipAr: "نوِّع مشاهد الأكشن لديك. العَدْو المتواصل مُنهِك؛ ناوِب بين مشاهد الأكشن المكثّفة ولحظات أهدأ لتطوير الشخصية أو التخطيط.",
    examples: ["Indiana Jones", "The Hunger Games", "Robinson Crusoe"],
  },
  {
    icon: Drama, name: "Literary / Drama", accent: "#34d399",
    nameAr: "الأدبي / الدراما",
    description: "Character-driven stories exploring the full range of human experience. Less about plot events, more about inner lives, relationships, and what it means to be human.",
    descriptionAr: "قصص تحرّكها الشخصيات وتستكشف المدى الكامل للتجربة الإنسانية. أقلّ اهتماماً بأحداث الحبكة، وأكثر بالحياة الداخلية والعلاقات ومعنى أن تكون إنساناً.",
    subgenres: ["Domestic Drama", "Coming-of-Age", "Social Commentary", "Memoir-Style"],
    subgenresAr: ["دراما عائلية", "بلوغ ونضج", "نقد اجتماعي", "بأسلوب المذكّرات"],
    conventions: ["Deep interiority and character psychology", "Prose that rewards re-reading", "Ambiguous or earned endings"],
    conventionsAr: ["عمق داخلي وعلم نفس للشخصية", "نثر يكافئ إعادة القراءة", "نهايات غامضة أو مستحَقّة"],
    tip: "Let your characters be contradictory. Real people contain multitudes: a character who is always consistent feels flat. Let their choices surprise even you.",
    tipAr: "دع شخصياتك متناقضة. البشر الحقيقيون يحملون أوجهاً كثيرة؛ والشخصية المتّسقة دائماً تبدو مسطّحة. دع خياراتها تفاجئك أنت أيضاً.",
    examples: ["The Kite Runner", "A Little Life", "Normal People"],
  },
  {
    icon: Clock, name: "Historical Fiction", accent: "#fb923c",
    nameAr: "الخيال التاريخي",
    description: "Stories set in real historical periods, blending fictional characters with authentic settings, events, and atmosphere. The past becomes a living world.",
    descriptionAr: "قصص تدور في حقب تاريخية حقيقية، تمزج شخصيات خيالية بأماكن وأحداث وأجواء أصيلة. يصبح الماضي عالماً حيّاً.",
    subgenres: ["War Fiction", "Ancient World", "Victorian Era", "20th Century"],
    subgenresAr: ["خيال الحروب", "العالم القديم", "العصر الفيكتوري", "القرن العشرون"],
    conventions: ["Authentic historical detail", "The tension between historical constraints and modern sensibilities", "Real events as backdrop"],
    conventionsAr: ["تفصيل تاريخي أصيل", "التوتر بين القيود التاريخية والحساسيات الحديثة", "أحداث حقيقية كخلفية"],
    tip: "Research until the era lives in your bones: then stop showing it off. Great historical fiction feels lived-in, not like a textbook with characters inserted.",
    tipAr: "ابحث حتى يسكن العصر في عظامك، ثم توقّف عن التباهي به. الخيال التاريخي العظيم يبدو معاشاً، لا ككتاب مدرسي أُقحمت فيه شخصيات.",
    examples: ["The Bronze Horseman", "All the Light We Cannot See", "Wolf Hall"],
  },
];

const structures = [
  {
    name: "The Three-Act Structure",
    nameAr: "بنية الفصول الثلاثة",
    icon: Triangle,
    tag: "Most Universal",
    tagAr: "الأكثر شمولاً",
    color: "text-blue-400",
    bg: "bg-blue-500/10 border-blue-500/20",
    description: "The oldest and most widely used story framework. Every successful Hollywood film and the majority of published novels follow some version of this structure. It divides your story into three distinct acts with clear turning points.",
    descriptionAr: "أقدم أطر القصة وأوسعها استخداماً. كل فيلم هوليودي ناجح وأغلب الروايات المنشورة يتبع نسخة ما من هذه البنية. تقسّم قصتك إلى ثلاثة فصول متمايزة بنقاط تحوّل واضحة.",
    acts: [
      {
        label: "Act I: Setup (25%)",
        labelAr: "الفصل الأول: التأسيس (25%)",
        points: ["Introduce your protagonist in their ordinary world", "Establish what they want and what's at stake", "The Inciting Incident: an event that disrupts everything", "End with the protagonist committing to a new direction"],
        pointsAr: ["قدّم بطلك في عالمه العادي", "أرسِ ما يريده وما هو على المحكّ", "الحادثة المحرّكة: حدث يقلب كل شيء", "اختم بالتزام البطل باتجاه جديد"],
      },
      {
        label: "Act II: Confrontation (50%)",
        labelAr: "الفصل الثاني: المواجهة (50%)",
        points: ["Protagonist pursues their goal but faces escalating obstacles", "Midpoint twist changes direction or raises the stakes dramatically", "All seems lost: the darkest moment before the climax", "Protagonist discovers what they truly need (vs. what they wanted)"],
        pointsAr: ["يسعى البطل لهدفه لكنه يواجه عقبات متصاعدة", "انعطافة منتصف القصة تغيّر الاتجاه أو ترفع الرهانات بشدّة", "يبدو كل شيء ضائعاً: أحلك لحظة قبل الذروة", "يكتشف البطل ما يحتاجه حقاً (مقابل ما كان يريده)"],
      },
      {
        label: "Act III: Resolution (25%)",
        labelAr: "الفصل الثالث: الحلّ (25%)",
        points: ["The climax: the ultimate confrontation or challenge", "The protagonist applies everything they've learned", "Resolution: the new equilibrium after the conflict", "Show how the character (and world) has changed"],
        pointsAr: ["الذروة: المواجهة أو التحدّي النهائي", "يطبّق البطل كل ما تعلّمه", "الحلّ: التوازن الجديد بعد الصراع", "أظهِر كيف تغيّرت الشخصية (والعالم)"],
      },
    ],
  },
  {
    name: "The Hero's Journey",
    nameAr: "رحلة البطل",
    icon: Circle,
    tag: "Myth & Epic",
    tagAr: "الأسطورة والملحمة",
    color: "text-purple-400",
    bg: "bg-purple-500/10 border-purple-500/20",
    description: "Identified by Joseph Campbell across myths from every culture, the Hero's Journey is a 12-stage circular story structure. It's particularly powerful for fantasy, adventure, and coming-of-age stories.",
    descriptionAr: "حدّدها جوزيف كامبل عبر أساطير كل الثقافات، ورحلة البطل بنية قصصية دائرية من 12 مرحلة. وهي قوية بوجه خاص لقصص الفانتازيا والمغامرة والنضج.",
    acts: [
      {
        label: "Departure (The Beginning)",
        labelAr: "الرحيل (البداية)",
        points: ["Ordinary World: hero's life before the adventure", "Call to Adventure: something disrupts the status quo", "Refusal of the Call: hero hesitates (shows stakes)", "Crossing the Threshold: hero commits and enters the new world"],
        pointsAr: ["العالم العادي: حياة البطل قبل المغامرة", "نداء المغامرة: شيء يقلب الوضع القائم", "رفض النداء: يتردّد البطل (يُظهر حجم الرهان)", "عبور العتبة: يلتزم البطل ويدخل العالم الجديد"],
      },
      {
        label: "Initiation (The Middle)",
        labelAr: "التشرّف (المنتصف)",
        points: ["Tests, Allies, Enemies: the new world challenges the hero", "The Ordeal: a major crisis, the hero faces death (literal or symbolic)", "The Reward: hero gains something valuable from surviving", "The Road Back: hero must return, often pursued by consequences"],
        pointsAr: ["الاختبارات والحلفاء والأعداء: العالم الجديد يتحدّى البطل", "المحنة: أزمة كبرى، يواجه فيها البطل الموت (حرفياً أو رمزياً)", "المكافأة: ينال البطل شيئاً ثميناً لنجاته", "طريق العودة: على البطل أن يعود، وغالباً تطارده العواقب"],
      },
      {
        label: "Return (The End)",
        labelAr: "العودة (النهاية)",
        points: ["The Resurrection: one final, greatest test using all lessons learned", "Return with the Elixir: hero comes home changed, bringing something of value"],
        pointsAr: ["البعث: اختبار أخير وأعظم باستخدام كل الدروس المتعلَّمة", "العودة بالإكسير: يعود البطل إلى دياره متغيّراً، حاملاً شيئاً ذا قيمة"],
      },
    ],
  },
  {
    name: "Save the Cat! Beat Sheet",
    nameAr: "ورقة مَطبّات «أنقذ القطّة!»",
    icon: Square,
    tag: "Most Detailed",
    tagAr: "الأكثر تفصيلاً",
    color: "text-emerald-400",
    bg: "bg-emerald-500/10 border-emerald-500/20",
    description: "Created by screenwriter Blake Snyder, this 15-beat framework gives you a precise structural map. It's highly prescriptive: ideal for beginners who want exact targets for when things should happen.",
    descriptionAr: "ابتكره كاتب السيناريو بليك سنايدر، وهذا الإطار المؤلَّف من 15 مطبّاً يمنحك خريطة بنيوية دقيقة. وهو إرشادي بشدّة: مثالي للمبتدئين الذين يريدون أهدافاً محدّدة لتوقيت وقوع الأحداث.",
    acts: [
      {
        label: "Opening through Break into Two",
        labelAr: "من الافتتاح إلى الانعطاف للفصل الثاني",
        points: ["Opening Image: a snapshot of the hero's flawed world", "Theme Stated: someone states what the story is really about", "Set-Up: establish the status quo and introduce key characters", "Catalyst (p.12/10%): the inciting incident", "Debate (p.12-25%): hero wrestles with the decision", "Break into Two (p.25%): hero enters the upside-down world"],
        pointsAr: ["صورة الافتتاح: لقطة لعالم البطل المعيب", "تصريح الفكرة: أحدهم يقول عمّا تدور القصة فعلاً", "التأسيس: أرسِ الوضع القائم وقدّم الشخصيات الرئيسية", "المحفّز (ص.12/10%): الحادثة المحرّكة", "الجدال (ص.12-25%): يصارع البطل القرار", "الانعطاف للفصل الثاني (ص.25%): يدخل البطل العالم المقلوب"],
      },
      {
        label: "Fun and Games through Dark Night",
        labelAr: "من المرح واللعب إلى الليلة المظلمة",
        points: ["B Story (p.30%): introduce the relationship that carries the theme", "Fun and Games (p.30-55%): the promise of the premise is delivered", "Midpoint (p.55%): a false victory or false defeat", "Bad Guys Close In (p.55-75%): pressure mounts", "All Is Lost (p.75%): the hero's lowest point", "Dark Night of the Soul (p.75-85%): reflection, despair"],
        pointsAr: ["القصة الثانوية (ص.30%): قدّم العلاقة التي تحمل الفكرة", "المرح واللعب (ص.30-55%): يتحقّق وعد الفرضية", "منتصف القصة (ص.55%): انتصار زائف أو هزيمة زائفة", "اقتراب الأشرار (ص.55-75%): يتصاعد الضغط", "كل شيء ضاع (ص.75%): أدنى نقطة للبطل", "ليلة الروح المظلمة (ص.75-85%): تأمّل ويأس"],
      },
      {
        label: "Break into Three through Final Image",
        labelAr: "من الانعطاف للفصل الثالث إلى الصورة الأخيرة",
        points: ["Break into Three (p.85%): hero finds the solution using A+B stories", "Finale (p.85-99%): execute the new plan, defeat antagonist", "Final Image (p.99%): mirror of the Opening Image, shows transformation"],
        pointsAr: ["الانعطاف للفصل الثالث (ص.85%): يجد البطل الحلّ بدمج القصتين الأولى والثانية", "الخاتمة (ص.85-99%): تنفيذ الخطة الجديدة وهزيمة الخصم", "الصورة الأخيرة (ص.99%): مرآة لصورة الافتتاح، تُظهر التحوّل"],
      },
    ],
  },
];

const characterPillars = [
  {
    icon: Target,
    title: "The Goal (Want)",
    titleAr: "الهدف (الرغبة)",
    color: "text-blue-400",
    bg: "bg-blue-500/10 border-blue-500/20",
    description: "What does your character consciously want? This is their external goal: the thing they're actively chasing throughout the story.",
    descriptionAr: "ماذا تريد شخصيتك بوعيٍ منها؟ هذا هدفها الخارجي: الشيء الذي تطارده بنشاط طوال القصة.",
    examples: ["Solve the murder", "Win the championship", "Get home safely", "Find true love"],
    examplesAr: ["حلّ الجريمة", "الفوز بالبطولة", "العودة إلى الديار بأمان", "إيجاد الحب الحقيقي"],
  },
  {
    icon: Heart,
    title: "The Need",
    titleAr: "الحاجة",
    color: "text-rose-400",
    bg: "bg-rose-500/10 border-rose-500/20",
    description: "What does your character actually need: the internal truth they must accept to grow? The tension between want and need is what creates a character arc.",
    descriptionAr: "ماذا تحتاج شخصيتك فعلاً: الحقيقة الداخلية التي عليها قبولها لتنمو؟ التوتر بين الرغبة والحاجة هو ما يصنع قوس الشخصية.",
    examples: ["Learn to trust others", "Accept their past", "Forgive themselves", "Choose love over ambition"],
    examplesAr: ["تعلّم الثقة بالآخرين", "تقبّل ماضيها", "مسامحة نفسها", "اختيار الحب على الطموح"],
  },
  {
    icon: Ghost,
    title: "The Wound",
    titleAr: "الجرح",
    color: "text-purple-400",
    bg: "bg-purple-500/10 border-purple-500/20",
    description: "A defining trauma or formative experience from the past. The wound explains why the character behaves the way they do: and creates the gap between want and need.",
    descriptionAr: "صدمة فارقة أو تجربة مكوِّنة من الماضي. يفسّر الجرح لماذا تتصرّف الشخصية كما تتصرّف، ويخلق الفجوة بين الرغبة والحاجة.",
    examples: ["Abandoned as a child", "Failed publicly and catastrophically", "Lost someone they loved", "Betrayed by someone they trusted"],
    examplesAr: ["هُجِرت في الطفولة", "فشلت علناً وبشكل كارثي", "فقدت شخصاً تحبّه", "خانها شخص وثقت به"],
  },
  {
    icon: Mountain,
    title: "The Flaw",
    titleAr: "العيب",
    color: "text-amber-400",
    bg: "bg-amber-500/10 border-amber-500/20",
    description: "A genuine weakness that creates problems. Not a 'cute' flaw: a real one that costs them something. The flaw is how the wound manifests in behavior.",
    descriptionAr: "ضعف حقيقي يخلق مشكلات. ليس عيباً «لطيفاً»، بل عيباً فعلياً يكلّفها شيئاً. العيب هو كيف يتجلّى الجرح في السلوك.",
    examples: ["Arrogance that alienates allies", "Fear of vulnerability", "Obsessive need for control", "Inability to ask for help"],
    examplesAr: ["غطرسة تُنفّر الحلفاء", "الخوف من إظهار الضعف", "حاجة قهرية للسيطرة", "العجز عن طلب المساعدة"],
  },
  {
    icon: Sparkles,
    title: "The Strength",
    titleAr: "القوة",
    color: "text-emerald-400",
    bg: "bg-emerald-500/10 border-emerald-500/20",
    description: "What makes readers root for your character? They need genuine qualities worth admiring: courage, wit, loyalty, compassion. This is what lets them ultimately overcome.",
    descriptionAr: "ما الذي يجعل القرّاء يؤيّدون شخصيتك؟ تحتاج إلى صفات حقيقية تستحق الإعجاب: الشجاعة، والفطنة، والوفاء، والرحمة. هذا ما يمكّنها من الانتصار في النهاية.",
    examples: ["Unstoppable resilience", "Brilliant problem-solving", "Deep empathy for others", "Fierce protective instinct"],
    examplesAr: ["صلابة لا تُوقَف", "حلّ بارع للمشكلات", "تعاطف عميق مع الآخرين", "غريزة حماية شرسة"],
  },
  {
    icon: Eye,
    title: "The Voice",
    titleAr: "الصوت",
    color: "text-cyan-400",
    bg: "bg-cyan-500/10 border-cyan-500/20",
    description: "How your character speaks, thinks, and sees the world. Voice is the fingerprint that makes one character immediately distinguishable from another.",
    descriptionAr: "كيف تتكلّم شخصيتك وتفكّر وترى العالم. الصوت هو البصمة التي تجعل شخصيةً متميّزة فوراً عن أخرى.",
    examples: ["Darkly humorous observations", "Precise technical thinking", "Naive wonder at everything", "Cynical deflection with wit"],
    examplesAr: ["ملاحظات ساخرة قاتمة", "تفكير تقني دقيق", "دهشة ساذجة من كل شيء", "تملّص ساخر بذكاء"],
  },
];

const arcTypes = [
  {
    name: "The Positive Arc",
    nameAr: "القوس الإيجابي",
    description: "The character starts with a flawed worldview (the Lie) and, through the story's events, overcomes it to embrace the Truth. The most common arc in fiction.",
    descriptionAr: "تبدأ الشخصية برؤية معيبة للعالم (الكذبة)، وعبر أحداث القصة تتجاوزها لتعتنق الحقيقة. وهو أكثر الأقواس شيوعاً في الأدب.",
    icon: TrendingUp,
    color: "text-emerald-400",
    example: "Ebenezer Scrooge (A Christmas Carol): goes from miserly and bitter to generous and joyful.",
    exampleAr: "إبنيزر سكروج (في «أنشودة عيد الميلاد»): ينتقل من البخل والمرارة إلى الكرم والبهجة.",
  },
  {
    name: "The Negative Arc",
    nameAr: "القوس السلبي",
    description: "The character starts with potential for growth but ultimately fails to overcome their flaw, descending into corruption, tragedy, or death.",
    descriptionAr: "تبدأ الشخصية وفيها إمكان للنمو لكنها تفشل في النهاية في تجاوز عيبها، فتنحدر إلى الفساد أو المأساة أو الموت.",
    icon: Mountain,
    color: "text-rose-400",
    example: "Walter White (Breaking Bad): starts as sympathetic, ends as villain. Macbeth. Anakin Skywalker.",
    exampleAr: "والتر وايت (في «بريكينغ باد»): يبدأ مثيراً للتعاطف وينتهي شريراً. وكذلك ماكبث وأناكين سكايووكر.",
  },
  {
    name: "The Flat Arc",
    nameAr: "القوس المسطّح",
    description: "The character doesn't change: they already hold the Truth, and they use it to change the world around them. Common in action/adventure and thrillers.",
    descriptionAr: "لا تتغيّر الشخصية: فهي تحمل الحقيقة أصلاً، وتستخدمها لتغيير العالم من حولها. شائع في الأكشن والمغامرة والإثارة.",
    icon: ArrowRight,
    color: "text-blue-400",
    example: "James Bond, Sherlock Holmes, Atticus Finch: their unshakeable principles reshape everyone around them.",
    exampleAr: "جيمس بوند، وشرلوك هولمز، وأتيكوس فينش: مبادئهم التي لا تتزعزع تعيد تشكيل كل من حولهم.",
  },
];

const dialoguePrinciples = [
  {
    icon: MessageSquare,
    title: "Every Line Does Double Duty",
    titleAr: "كل سطر يؤدّي مهمّتين",
    description: "Strong dialogue accomplishes at least two things at once: advances the plot AND reveals character, OR creates conflict AND delivers information. Lines that only do one thing often get cut in editing.",
    descriptionAr: "الحوار القوي ينجز شيئين على الأقل في آنٍ واحد: يدفع الحبكة ويكشف الشخصية، أو يخلق صراعاً ويوصل معلومة. والسطور التي تؤدّي شيئاً واحداً فقط غالباً ما تُحذف عند التحرير.",
    bad: '"The weather is nice today," said John.\n"Yes, it is," Mary replied.',
    badAr: '«الطقس جميل اليوم»، قال جون.\n«نعم، إنه كذلك»، ردّت ماري.',
    good: '"Nice day," John said, not looking up from his phone.\n"You haven\'t noticed a single thing about me in three weeks," Mary said quietly.',
    goodAr: '«يوم جميل»، قال جون دون أن يرفع عينيه عن هاتفه.\n«لم تلاحظ عنّي شيئاً واحداً منذ ثلاثة أسابيع»، قالت ماري بهدوء.',
  },
  {
    icon: Brain,
    title: "Subtext is Everything",
    titleAr: "ما تحت السطور هو كل شيء",
    description: "Real people rarely say exactly what they mean. Characters should talk around their true feelings, especially in emotional scenes. The gap between what's said and what's meant is where tension lives.",
    descriptionAr: "نادراً ما يقول الناس الحقيقيون ما يقصدونه بالضبط. ينبغي للشخصيات أن تدور حول مشاعرها الحقيقية، خصوصاً في المشاهد العاطفية. والفجوة بين ما يُقال وما يُقصَد هي حيث يعيش التوتر.",
    bad: '"I love you and I\'m afraid of losing you," he admitted.',
    badAr: '«أحبّك وأخاف أن أفقدك»، اعترف.',
    good: '"You don\'t have to come back, you know." He paused. "If you find something better."',
    goodAr: '«لست مضطراً للعودة، أتعلم». توقّف. «إن وجدت ما هو أفضل».',
  },
  {
    icon: Users,
    title: "Every Character Sounds Different",
    titleAr: "كل شخصية لها صوت مختلف",
    description: "Cover up the dialogue tags and read a conversation aloud. Could you tell who's speaking from the words alone? Each character should have distinct vocabulary, rhythm, and verbal habits.",
    descriptionAr: "غطِّ أسماء المتحدّثين واقرأ محادثة بصوت عالٍ. أتعرف من المتكلّم من الكلمات وحدها؟ ينبغي لكل شخصية مفردات وإيقاع وعادات لفظية مميّزة.",
    bad: 'All characters use complete, grammatically correct sentences of similar length.',
    badAr: 'كل الشخصيات تستخدم جملاً كاملة وصحيحة نحوياً وبطول متقارب.',
    good: 'One character speaks in short clipped sentences. Another rambles. A third speaks in metaphors. A fourth is painfully literal.',
    goodAr: 'شخصية تتكلّم بجمل قصيرة مقتضبة. أخرى تُطيل الكلام. وثالثة تتكلّم بالاستعارات. ورابعة حرفية إلى حدّ مؤلم.',
  },
  {
    icon: Scissors,
    title: "Cut the Small Talk",
    titleAr: "احذف كلام المجاملة",
    description: "Realistic conversation is boring. 'Hello, how are you, fine thanks' has no place in fiction unless something subversive is happening beneath it. Start dialogue mid-conversation, just before something matters.",
    descriptionAr: "المحادثة الواقعية مملّة. عبارة «مرحباً، كيف حالك، بخير شكراً» لا مكان لها في الأدب إلا إذا كان تحتها شيء مُربك. ابدأ الحوار في منتصف المحادثة، قُبيل أن يصبح لشيء أهمية.",
    bad: '"Hey, how are you doing?" / "Good, good. You?" / "Not bad. So anyway..."',
    badAr: '«أهلاً، كيف حالك؟» / «بخير، بخير. وأنت؟» / «لا بأس. على كل حال...»',
    good: 'Start at the moment the conversation becomes charged. Skip the pleasantries.',
    goodAr: 'ابدأ من اللحظة التي تصبح فيها المحادثة مشحونة. تجاوز المجاملات.',
  },
];

const writingProcess = [
  {
    phase: "01",
    icon: Lightbulb,
    title: "The Idea & Development Phase",
    titleAr: "مرحلة الفكرة والتطوير",
    color: "text-amber-400",
    border: "border-amber-500/30",
    bg: "bg-amber-500/5",
    description: "Before you write a word of your actual book, spend time developing the core idea. Most abandoned books die here: not from lack of talent, but from starting before the idea was strong enough.",
    descriptionAr: "قبل أن تكتب كلمة من كتابك الفعلي، اقضِ وقتاً في تطوير الفكرة الجوهرية. أغلب الكتب المهجورة تموت هنا: لا من قلّة الموهبة، بل من البدء قبل أن تكون الفكرة قوية بما يكفي.",
    actions: [
      "Write your premise in one sentence: 'A [protagonist] must [goal] before [stakes] happen'",
      "Answer: what is this story really about? (the theme)",
      "Know your ending before you begin: or at least the emotional destination",
      "Research any unfamiliar settings, time periods, or subjects you'll need",
      "Let the idea breathe for a week: see if you're still excited",
    ],
    actionsAr: [
      "اكتب فرضيتك في جملة واحدة: «على [البطل] أن [يحقّق الهدف] قبل أن [يقع الرهان]»",
      "أجِب: عمّا تدور هذه القصة حقاً؟ (الفكرة)",
      "اعرف نهايتك قبل أن تبدأ: أو على الأقل وجهتها العاطفية",
      "ابحث في أي أماكن أو حقب أو مواضيع غير مألوفة ستحتاجها",
      "دع الفكرة تتنفّس أسبوعاً: انظر إن كنت لا تزال متحمّساً",
    ],
  },
  {
    phase: "02",
    icon: Map,
    title: "Planning & Outlining",
    titleAr: "التخطيط ووضع المخطّط",
    color: "text-blue-400",
    border: "border-blue-500/30",
    bg: "bg-blue-500/5",
    description: "You don't need a detailed outline: but you need something. Even a rough roadmap of major turning points will prevent the most common cause of stalled manuscripts: not knowing what happens next.",
    descriptionAr: "لست بحاجة إلى مخطّط مفصّل، لكنك بحاجة إلى شيء ما. حتى خريطة طريق تقريبية لنقاط التحوّل الكبرى ستمنع أشيع أسباب تعثّر المخطوطات: عدم معرفة ما سيحدث تالياً.",
    actions: [
      "Choose your story structure framework (3-Act, Hero's Journey, etc.)",
      "Write a one-paragraph description of each major act",
      "Identify your 5-7 key scenes (the turning points your story hinges on)",
      "Create character profiles for your main characters",
      "Build a chapter-by-chapter outline (even just one sentence per chapter)",
    ],
    actionsAr: [
      "اختر إطار بنية قصتك (الفصول الثلاثة، رحلة البطل، إلخ)",
      "اكتب وصفاً من فقرة واحدة لكل فصل رئيسي",
      "حدّد مشاهدك المفتاحية الـ5 إلى 7 (نقاط التحوّل التي ترتكز عليها قصتك)",
      "أنشئ ملفات تعريف لشخصياتك الرئيسية",
      "ابنِ مخطّطاً فصلاً بفصل (ولو جملة واحدة لكل فصل)",
    ],
  },
  {
    phase: "03",
    icon: Feather,
    title: "The First Draft",
    titleAr: "المسودّة الأولى",
    color: "text-purple-400",
    border: "border-purple-500/30",
    bg: "bg-purple-500/5",
    description: "The first draft's only job is to exist. It will be messy, inconsistent, and full of placeholder scenes. That's not a failure: that's exactly how first drafts are supposed to work.",
    descriptionAr: "وظيفة المسودّة الأولى الوحيدة هي أن توجد. ستكون فوضوية وغير متّسقة ومليئة بمشاهد مؤقّتة. هذا ليس فشلاً: هكذا تماماً يُفترض أن تعمل المسودّات الأولى.",
    actions: [
      "Write forward, never backward: resist the urge to edit as you go",
      "Set a daily word count goal (500-1,500 words is realistic for most people)",
      "Leave [PLACEHOLDER] notes for research you need to do later",
      "If you're stuck, skip ahead to a scene you're excited to write",
      "Finish the draft: a finished imperfect draft beats a perfect abandoned one",
    ],
    actionsAr: [
      "اكتب إلى الأمام لا إلى الخلف: قاوِم رغبة التحرير أثناء الكتابة",
      "ضع هدف عدد كلمات يومي (500 إلى 1,500 كلمة واقعي لأغلب الناس)",
      "اترك ملاحظات [مؤقّت] للأبحاث التي عليك إنجازها لاحقاً",
      "إن تعثّرت، تخطَّ إلى مشهد متحمّس لكتابته",
      "أنهِ المسودّة: مسودّة منجَزة غير مكتملة خير من مسودّة مثالية مهجورة",
    ],
  },
  {
    phase: "04",
    icon: RefreshCw,
    title: "Revision & Editing",
    titleAr: "المراجعة والتحرير",
    color: "text-emerald-400",
    border: "border-emerald-500/30",
    bg: "bg-emerald-500/5",
    description: "Writing is rewriting. Most published authors do 3-7 full revision passes before a manuscript is ready. Each pass focuses on a different layer of the story.",
    descriptionAr: "الكتابة إعادة كتابة. أغلب المؤلّفين المنشورين يجرون من 3 إلى 7 جولات مراجعة كاملة قبل أن تصبح المخطوطة جاهزة. وكل جولة تركّز على طبقة مختلفة من القصة.",
    actions: [
      "Let the first draft sit for at least 2 weeks before re-reading",
      "Pass 1: Big picture: does the structure work? Does the character arc land?",
      "Pass 2: Scene-level: does every scene earn its place? Cut anything that doesn't serve the story",
      "Pass 3: Line-level: sharpen prose, vary sentence rhythm, cut redundancy",
      "Pass 4: Dialogue: read every line aloud. If it sounds unnatural, fix it",
    ],
    actionsAr: [
      "دع المسودّة الأولى تستقرّ أسبوعين على الأقل قبل إعادة قراءتها",
      "الجولة 1: الصورة الكبرى: هل تعمل البنية؟ هل يصل قوس الشخصية؟",
      "الجولة 2: مستوى المشهد: هل يستحقّ كل مشهد مكانه؟ احذف ما لا يخدم القصة",
      "الجولة 3: مستوى السطر: اشحذ النثر، ونوّع إيقاع الجمل، واحذف الحشو",
      "الجولة 4: الحوار: اقرأ كل سطر بصوت عالٍ. إن بدا غير طبيعي فأصلِحه",
    ],
  },
  {
    phase: "05",
    icon: Eye,
    title: "Beta Readers & Feedback",
    titleAr: "القرّاء التجريبيون والملاحظات",
    color: "text-cyan-400",
    border: "border-cyan-500/30",
    bg: "bg-cyan-500/5",
    description: "You cannot objectively read your own work. You know what you intended: not what you actually wrote. Beta readers reveal the gap between your intention and the reader's experience.",
    descriptionAr: "لا تستطيع قراءة عملك بموضوعية. أنت تعرف ما قصدته، لا ما كتبته فعلاً. القرّاء التجريبيون يكشفون الفجوة بين قصدك وتجربة القارئ.",
    actions: [
      "Find 3-5 readers who are honest (not just supportive)",
      "Choose beta readers who read in your genre",
      "Ask specific questions: 'Where did you put the book down?' 'What confused you?' 'Which character felt flat?'",
      "Look for patterns: if one reader mentions something, consider it. If three do, fix it",
      "Don't defend your work: just listen, take notes, and decide later",
    ],
    actionsAr: [
      "اعثر على 3 إلى 5 قرّاء صادقين (لا داعمين فقط)",
      "اختر قرّاءً تجريبيين يقرؤون في نوعك الأدبي",
      "اطرح أسئلة محدّدة: «أين وضعت الكتاب جانباً؟» «ما الذي أربكك؟» «أي شخصية بدت مسطّحة؟»",
      "ابحث عن الأنماط: إن ذكر قارئ واحد شيئاً ففكّر فيه؛ وإن ذكره ثلاثة فأصلِحه",
      "لا تدافع عن عملك: استمع فقط، ودوّن، وقرّر لاحقاً",
    ],
  },
  {
    phase: "06",
    icon: Send,
    title: "Publishing & Sharing",
    titleAr: "النشر والمشاركة",
    color: "text-rose-400",
    border: "border-rose-500/30",
    bg: "bg-rose-500/5",
    description: "Once your manuscript is polished, you have two main publishing paths. Each has real advantages: and neither is the 'wrong' choice.",
    descriptionAr: "بعد صقل مخطوطتك، أمامك مساران رئيسيان للنشر. لكلٍّ مزايا حقيقية، وليس أيّهما الخيار «الخاطئ».",
    actions: [
      "Traditional: Submit to literary agents, then a publisher deal, then editorial team, distribution, prestige",
      "Self-publishing: Full creative control, higher royalties, faster to market, you handle marketing",
      "For traditional: research agents who represent your genre, follow query letter guidelines exactly",
      "For self-publishing: invest in professional editing, cover design, and formatting",
      "Either way: build an author platform (newsletter, social presence) before your release",
    ],
    actionsAr: [
      "النشر التقليدي: التقديم لوكلاء أدبيين، ثم اتفاق مع ناشر، ثم فريق تحرير وتوزيع ومكانة",
      "النشر الذاتي: تحكّم إبداعي كامل، وعوائد أعلى، ووصول أسرع للسوق، وأنت تتولّى التسويق",
      "للتقليدي: ابحث عن وكلاء يمثّلون نوعك، واتّبع إرشادات خطاب الاستعلام بدقّة",
      "للنشر الذاتي: استثمر في التحرير الاحترافي وتصميم الغلاف والتنسيق",
      "في الحالتين: ابنِ منصّة كاتب (نشرة بريدية، حضور اجتماعي) قبل إصدارك",
    ],
  },
];

const selfEditingChecklist = [
  { category: "Structure", categoryAr: "البنية", icon: Layers, color: "text-blue-400", items: ["Every scene has a clear beginning, middle, and end", "Each scene changes something: status, knowledge, or relationship", "The three-act turning points land at approximately the right story positions", "The midpoint raises stakes or changes direction meaningfully", "The climax is the largest, most emotionally charged event"], itemsAr: ["لكل مشهد بداية ووسط ونهاية واضحة", "كل مشهد يغيّر شيئاً: الحالة أو المعرفة أو العلاقة", "نقاط تحوّل الفصول الثلاثة تقع تقريباً في المواضع الصحيحة من القصة", "منتصف القصة يرفع الرهانات أو يغيّر الاتجاه بشكل ذي معنى", "الذروة هي أكبر الأحداث وأشدّها شحناً عاطفياً"] },
  { category: "Characters", categoryAr: "الشخصيات", icon: Users, color: "text-purple-400", items: ["The protagonist has a clear goal, flaw, and arc", "The antagonist has understandable (even if wrong) motivations", "Supporting characters each have a distinct voice and purpose", "Characters behave consistently with their established traits", "Reactions to events feel emotionally true"], itemsAr: ["للبطل هدف وعيب وقوس واضحة", "للخصم دوافع مفهومة (وإن كانت خاطئة)", "لكل شخصية مساندة صوت مميّز وغرض", "تتصرّف الشخصيات باتّساق مع سماتها المرسومة", "ردود الفعل على الأحداث تبدو صادقة عاطفياً"] },
  { category: "Prose", categoryAr: "النثر", icon: Feather, color: "text-emerald-400", items: ["Sentences vary in length and rhythm: not monotonous", "Show the character's experience, not just the facts", "Cut words that add length without adding meaning", "Use active verbs rather than passive constructions", "Sensory details anchor the reader in each scene"], itemsAr: ["تتنوّع الجمل طولاً وإيقاعاً: ليست رتيبة", "أظهِر تجربة الشخصية، لا الوقائع وحدها", "احذف الكلمات التي تزيد الطول دون المعنى", "استخدم أفعالاً مبنية للمعلوم بدل المبني للمجهول", "تفاصيل حسّية ترسّخ القارئ في كل مشهد"] },
  { category: "Pacing", categoryAr: "الإيقاع", icon: Zap, color: "text-amber-400", items: ["Action/tension scenes use shorter sentences and paragraphs", "Reflective moments use longer, slower prose", "No scene drags: every paragraph earns its place", "Chapter endings create enough momentum to turn the page", "The story never stops moving for more than necessary"], itemsAr: ["مشاهد الأكشن والتوتر تستخدم جملاً وفقرات أقصر", "اللحظات التأمّلية تستخدم نثراً أطول وأبطأ", "لا مشهد يتثاقل: كل فقرة تستحقّ مكانها", "نهايات الفصول تخلق زخماً كافياً لتقليب الصفحة", "لا تتوقّف القصة عن الحركة أكثر مما يلزم"] },
];

const beginnerMistakes = [
  { mistake: "Starting too early", mistakeAr: "البدء مبكراً جداً", fix: "Most first chapters begin 10-15 pages before the story actually starts. Find where the tension begins: start there.", fixAr: "أغلب الفصول الأولى تبدأ قبل 10 إلى 15 صفحة من بدء القصة فعلاً. اعثر على حيث يبدأ التوتر: ابدأ هناك.", icon: "01" },
  { mistake: "Telling instead of showing", mistakeAr: "السرد بدل الإظهار", fix: "Don't tell us a character is angry. Show us clenched fists, clipped sentences, a door closed too hard. Trust the reader.", fixAr: "لا تخبرنا أن شخصية غاضبة. أرِنا قبضتين مشدودتين، وجملاً مقتضبة، وباباً أُغلق بعنف. ثق بالقارئ.", icon: "02" },
  { mistake: "Passive characters", mistakeAr: "شخصيات سلبية", fix: "Your protagonist should drive the story: not react to it. At every turning point, they should make a choice that has consequences.", fixAr: "ينبغي لبطلك أن يقود القصة لا أن يردّ عليها. عند كل نقطة تحوّل، عليه أن يتّخذ خياراً له عواقب.", icon: "03" },
  { mistake: "Over-explaining and over-describing", mistakeAr: "الإفراط في الشرح والوصف", fix: "Readers don't need to know everything. Give them enough to anchor in the scene and let their imagination do the rest.", fixAr: "لا يحتاج القرّاء إلى معرفة كل شيء. امنحهم ما يكفي للترسّخ في المشهد ودع خيالهم يتمّ الباقي.", icon: "04" },
  { mistake: "Skipping the conflict in dialogue", mistakeAr: "تجاهل الصراع في الحوار", fix: "Characters who agree, share information politely, and never misunderstand each other create zero tension. Let them talk past each other.", fixAr: "الشخصيات التي تتّفق وتتبادل المعلومات بأدب ولا يسيء بعضها فهم بعض تخلق توتراً معدوماً. دعها تتحدّث في اتجاهات متباينة.", icon: "05" },
  { mistake: "The perfect protagonist", mistakeAr: "البطل المثالي", fix: "Likeable does not mean perfect. We root for flawed people who try anyway. Give your hero real weaknesses that cost them real things.", fixAr: "المحبوب لا يعني المثالي. نحن نؤيّد أناساً معيبين يحاولون رغم ذلك. امنح بطلك نقاط ضعف حقيقية تكلّفه أشياء حقيقية.", icon: "06" },
  { mistake: "Ending too quickly", mistakeAr: "إنهاء سريع جداً", fix: "The climax should feel earned by everything before it. If your ending doesn't feel inevitable in retrospect, the groundwork wasn't laid.", fixAr: "ينبغي أن تبدو الذروة مستحقّة بكل ما سبقها. إن لم تبدُ نهايتك حتمية عند المراجعة، فالأساس لم يُمَهَّد.", icon: "07" },
  { mistake: "Stopping the first draft to revise", mistakeAr: "إيقاف المسودّة الأولى للمراجعة", fix: "You cannot edit a blank page. Finish the draft. Every page: even bad ones: is momentum. Revision is a separate phase.", fixAr: "لا يمكنك تحرير صفحة فارغة. أنهِ المسودّة. كل صفحة، حتى السيّئة، زخم. والمراجعة مرحلة منفصلة.", icon: "08" },
];

const sections = [
  { id: "genres",     label: "Genres",      labelAr: "الأنواع",     icon: BookOpen },
  { id: "structure",  label: "Structure",   labelAr: "البنية",      icon: Layers },
  { id: "characters", label: "Characters",  labelAr: "الشخصيات",    icon: Users },
  { id: "dialogue",   label: "Dialogue",    labelAr: "الحوار",      icon: Mic2 },
  { id: "process",    label: "Process",     labelAr: "العملية",     icon: Map },
  { id: "editing",    label: "Editing",     labelAr: "التحرير",     icon: Scissors },
  { id: "mistakes",   label: "Mistakes",    labelAr: "الأخطاء",     icon: Lightbulb },
];

/* ─── i18n: swap the *Ar fields into the canonical names when the
   active language is Arabic, so every render site stays unchanged. ─── */
function localizeGuide(lang: string) {
  const ar = lang === "ar";
  const pick = <T,>(en: T, arr: T | undefined): T => (ar && arr !== undefined ? arr : en);
  return {
    genres: genres.map((g) => ({
      ...g,
      name: pick(g.name, g.nameAr),
      description: pick(g.description, g.descriptionAr),
      subgenres: pick(g.subgenres, g.subgenresAr),
      conventions: pick(g.conventions, g.conventionsAr),
      tip: pick(g.tip, g.tipAr),
    })),
    structures: structures.map((s) => ({
      ...s,
      name: pick(s.name, s.nameAr),
      tag: pick(s.tag, s.tagAr),
      description: pick(s.description, s.descriptionAr),
      acts: s.acts.map((a) => ({
        ...a,
        label: pick(a.label, a.labelAr),
        points: pick(a.points, a.pointsAr),
      })),
    })),
    characterPillars: characterPillars.map((p) => ({
      ...p,
      title: pick(p.title, p.titleAr),
      description: pick(p.description, p.descriptionAr),
      examples: pick(p.examples, p.examplesAr),
    })),
    arcTypes: arcTypes.map((a) => ({
      ...a,
      name: pick(a.name, a.nameAr),
      description: pick(a.description, a.descriptionAr),
      example: pick(a.example, a.exampleAr),
    })),
    dialoguePrinciples: dialoguePrinciples.map((d) => ({
      ...d,
      title: pick(d.title, d.titleAr),
      description: pick(d.description, d.descriptionAr),
      bad: pick(d.bad, d.badAr),
      good: pick(d.good, d.goodAr),
    })),
    writingProcess: writingProcess.map((w) => ({
      ...w,
      title: pick(w.title, w.titleAr),
      description: pick(w.description, w.descriptionAr),
      actions: pick(w.actions, w.actionsAr),
    })),
    selfEditingChecklist: selfEditingChecklist.map((c) => ({
      ...c,
      category: pick(c.category, c.categoryAr),
      items: pick(c.items, c.itemsAr),
    })),
    beginnerMistakes: beginnerMistakes.map((m) => ({
      ...m,
      mistake: pick(m.mistake, m.mistakeAr),
      fix: pick(m.fix, m.fixAr),
    })),
    sections: sections.map((s) => ({ ...s, label: pick(s.label, s.labelAr) })),
  };
}

/* ─── COMPONENTS ─── */

function SectionHeader({ label, title, subtitle }: { icon?: any; label: string; title: string; subtitle: string; accent?: string }) {
  // The floating TOC on the right already shows the numbered list, so strip
  // the "01." prefix here — keep only the section name.
  const cleanLabel = label.replace(/^\d+\.\s*/, "");
  return (
    <div className="mb-8 text-center px-2 sm:px-0" style={{ fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Display', 'Helvetica Neue', sans-serif" }}>
      <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-muted-foreground/70 mb-3">{cleanLabel}</p>
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
  const { lang } = useLanguage();
  const ar = lang === "ar";
  const {
    genres, structures, characterPillars, arcTypes, dialoguePrinciples,
    writingProcess, selfEditingChecklist, beginnerMistakes, sections,
  } = localizeGuide(lang);

  const { user } = useAuth();
  const { toast } = useToast();
  const [authOpen, setAuthOpen] = useState(false);
  const [downloadingPdf, setDownloadingPdf] = useState(false);

  const labelFor = (id: string) => sections.find((s: any) => s.id === id)?.label || id;

  function buildGuidePayload() {
    const sec: { heading: string; blocks: { title?: string; body?: string; bullets?: string[] }[] }[] = [];
    sec.push({
      heading: labelFor("genres"),
      blocks: genres.map((g: any) => ({
        title: g.name,
        body: [
          g.description,
          g.subgenres?.length ? (ar ? `أنواع فرعية: ${g.subgenres.join("، ")}` : `Subgenres: ${g.subgenres.join(", ")}`) : "",
          g.tip ? (ar ? `نصيحة: ${g.tip}` : `Tip: ${g.tip}`) : "",
        ].filter(Boolean).join("\n\n"),
        bullets: g.conventions || [],
      })),
    });
    const structBlocks: { title?: string; body?: string; bullets?: string[] }[] = [];
    structures.forEach((s: any) => {
      structBlocks.push({ title: `${s.name} — ${s.tag}`, body: s.description });
      (s.acts || []).forEach((a: any) => structBlocks.push({ title: a.label, bullets: a.points || [] }));
    });
    sec.push({ heading: labelFor("structure"), blocks: structBlocks });
    const charBlocks: { title?: string; body?: string; bullets?: string[] }[] =
      characterPillars.map((p: any) => ({ title: p.title, body: p.description, bullets: p.examples || [] }));
    arcTypes.forEach((a: any) => charBlocks.push({
      title: a.name,
      body: [a.description, a.example ? (ar ? `مثال: ${a.example}` : `e.g. ${a.example}`) : ""].filter(Boolean).join("\n"),
    }));
    sec.push({ heading: labelFor("characters"), blocks: charBlocks });
    sec.push({
      heading: labelFor("dialogue"),
      blocks: dialoguePrinciples.map((d: any) => ({
        title: d.title,
        body: d.description,
        bullets: [ar ? `ضعيف: ${d.bad}` : `Weak: ${d.bad}`, ar ? `أفضل: ${d.good}` : `Better: ${d.good}`],
      })),
    });
    sec.push({
      heading: labelFor("process"),
      blocks: writingProcess.map((w: any) => ({ title: w.title, body: w.description, bullets: w.actions || [] })),
    });
    sec.push({
      heading: labelFor("editing"),
      blocks: selfEditingChecklist.map((c: any) => ({ title: c.category, bullets: c.items || [] })),
    });
    sec.push({
      heading: labelFor("mistakes"),
      blocks: beginnerMistakes.map((m: any) => ({ title: m.mistake, body: m.fix })),
    });
    return {
      lang: ar ? "ar" : "en",
      title: ar ? "دليل الكتابة من Plotzy" : "The Plotzy Writing Guide",
      subtitle: ar ? "من الصفحة البيضاء إلى كتاب مكتمل" : "From blank page to finished book",
      sections: sec,
    };
  }

  async function handleDownloadPdf() {
    if (!user) { setAuthOpen(true); return; }
    setDownloadingPdf(true);
    try {
      const res = await fetch(`${GUIDE_API_BASE}/api/guide/pdf`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(buildGuidePayload()),
      });
      if (res.status === 401) { setAuthOpen(true); return; }
      if (!res.ok) throw new Error("failed");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "Plotzy-Writing-Guide.pdf";
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch {
      toast({ title: ar ? "تعذّر إنشاء ملف الـ PDF" : "Couldn't generate the PDF", variant: "destructive" });
    } finally {
      setDownloadingPdf(false);
    }
  }
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
      <SEO
        title={ar ? "دليل الكتابة" : "Writing Guide"}
        description={ar
          ? "إرشاد عملي للكتابة: بنية القصة، والعمل على الشخصيات، وبناء العالم، وتكتيكات المراجعة."
          : "Practical writing guidance: story structure, character work, world-building, and revision tactics."}
      />
      <JsonLd data={buildBreadcrumbSchema([{ name: ar ? "دليل الكتابة" : "Writing Guide", path: "/writing-guide" }])} />
      {/* ── Progress Bar ── */}
      <div style={{
        position: "fixed", top: 0, left: 0, width: `${scrollProgress}%`, height: 3,
        background: "#fff", zIndex: 50, transition: "width 0.1s linear",
      }} />

      <div className="dark px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
      {/* ── Hero ── */}
      <motion.header
        initial="hidden" animate="visible" variants={fadeUp}
        className="relative pt-8 pb-6 md:pt-10 md:pb-8 border-b border-border/40"
        style={{ fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Display', 'Helvetica Neue', sans-serif" }}
      >
        <div className="relative z-10 max-w-3xl mx-auto text-center">
          <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-muted-foreground/70 mb-3">
            {ar ? "دليل الكتابة من بلوتزي" : "The Plotzy Writing Guide"}
          </p>
          <h1 className="text-[1.5rem] sm:text-[1.75rem] md:text-[2.5rem] font-bold text-foreground mb-3 leading-[1.15] md:leading-[1.1] tracking-[-0.025em] md:tracking-[-0.03em] px-2 sm:px-0">
            {ar ? <>من الصفحة البيضاء إلى <span className="bg-gradient-to-br from-white to-white/55 bg-clip-text text-transparent">كتاب مكتمل</span>.</> : <>From blank page to <span className="bg-gradient-to-br from-white to-white/55 bg-clip-text text-transparent">finished book</span>.</>}
          </h1>
          <p className="text-foreground/60 text-[12px] sm:text-[13px] md:text-[14px] max-w-xl mx-auto leading-[1.6] px-2 sm:px-0">
            {ar
              ? "كتيّب احترافي شامل لحرفة الكتابة. سبعة أقسام: النوع، والبنية، والشخصية، والحوار، والعملية، والمراجعة، والأخطاء التي تقتل المسودّات الأولى."
              : "A professional, end-to-end handbook for the craft of writing. Seven sections: genre, structure, character, dialogue, process, revision, and the mistakes that kill first drafts."}
          </p>
          <div className="mt-4 inline-flex items-center flex-wrap justify-center gap-x-2.5 gap-y-1 text-[10px] text-muted-foreground/70 px-4">
            <span className="font-mono">{ar ? "قراءة 20 دقيقة" : "20 min read"}</span>
            <span className="w-0.5 h-0.5 rounded-full bg-muted-foreground/40" />
            <span>{ar ? "7 أقسام" : "7 sections"}</span>
            <span className="w-0.5 h-0.5 rounded-full bg-muted-foreground/40" />
            <span>{ar ? "لكتّاب كل المستويات" : "For writers at every level"}</span>
          </div>

          <div className="mt-6">
            <button
              onClick={handleDownloadPdf}
              disabled={downloadingPdf}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all disabled:opacity-60"
              style={{ background: "#fff", color: "#0a0a0a" }}
            >
              {downloadingPdf
                ? <Loader2 className="w-4 h-4 animate-spin" />
                : <Download className="w-4 h-4" />}
              {downloadingPdf
                ? (ar ? "جارٍ التحضير…" : "Preparing…")
                : (ar ? "تنزيل الدليل PDF" : "Download Guide PDF")}
            </button>
            <p className="mt-2 text-[10px] text-muted-foreground/60">
              {ar
                ? "بعلامة مائية وحقوق محفوظة لـ Plotzy · يتطلب تسجيل الدخول"
                : "Watermarked, © Plotzy · sign-in required"}
            </p>
          </div>
        </div>
      </motion.header>

      {/* ── Floating TOC dots (Desktop Only) — vertical progress indicator
           on the right edge. Compact, non-blocking; expands on hover to show
           the section names. ── */}
      <nav
        aria-label={ar ? "أقسام الدليل" : "Guide sections"}
        className="hidden lg:block"
        style={{ position: "fixed", top: "50%", right: 24, transform: "translateY(-50%)", zIndex: 30 }}
      >
        <ul className="group/toc flex flex-col items-end gap-3">
          {sections.map((sec, i) => {
            const isActive = activeSection === sec.id;
            const isRead = readSections.has(sec.id);
            return (
              <li key={sec.id}>
                <button
                  onClick={() => scrollTo(sec.id)}
                  className="flex items-center gap-2.5"
                  aria-label={sec.label}
                  aria-current={isActive ? "true" : undefined}
                >
                  <span
                    className={`text-[11px] font-medium whitespace-nowrap transition-all duration-200 opacity-0 group-hover/toc:opacity-100 translate-x-2 group-hover/toc:translate-x-0 ${
                      isActive ? "text-white" : "text-muted-foreground"
                    }`}
                  >
                    {String(i + 1).padStart(2, "0")}  ·  {sec.label}
                  </span>
                  <span
                    className={`block rounded-full transition-all duration-200 ${
                      isActive
                        ? "w-2 h-2 bg-white"
                        : isRead
                        ? "w-1.5 h-1.5 bg-white/50"
                        : "w-1.5 h-1.5 bg-white/20 hover:bg-white/40"
                    }`}
                  />
                </button>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* ── Main content — centered column ── */}
      <div className="pt-8 md:pt-12 max-w-4xl mx-auto">
        <div className="flex-1 min-w-0">

      {/* ══════════════════════════════════════════════ */}
      {/* SECTION 1: GENRES */}
      {/* ══════════════════════════════════════════════ */}
      <section id="genres" className="scroll-mt-20">
        <SectionHeader
          icon={BookOpen} label={ar ? "01. الأنواع" : "01. Genres"}
          title={ar ? "اعثر على نوعك." : "Find your genre."}
          subtitle={ar
            ? "كل قصة تنتمي إلى نوع. إنه وعد للقارئ بنوع التجربة التي يتوقّعها، وهو يشكّل شخصياتك وإيقاعك وصوتك، بل ومن سيقرؤك."
            : "Every story belongs to a genre. It's a promise to the reader about what kind of experience to expect, and it shapes your characters, your pacing, your voice, and even who will read you."}
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
                            <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2">{ar ? "الأنواع الفرعية" : "Subgenres"}</p>
                            <div className="flex flex-wrap gap-1.5">
                              {genre.subgenres.map((s) => (
                                <span key={s} className="text-xs rounded-full px-2.5 py-0.5 border border-border bg-background text-foreground/70">{s}</span>
                              ))}
                            </div>
                          </div>
                          <div>
                            <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2">{ar ? "الأعراف الأساسية" : "Core Conventions"}</p>
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
                            <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1">{ar ? "نصيحة كتابة" : "Writing Tip"}</p>
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
                            <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2">{ar ? "أمثلة بارزة" : "Notable Examples"}</p>
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
          icon={Layers} label={ar ? "02. البنية" : "02. Structure"}
          title={ar ? "اصنع شكل القصة." : "Shape the story."}
          subtitle={ar
            ? "المؤلّفون المحترفون لا يكتبون بخطوط مستقيمة. إنهم يتّبعون أطراً مهيّأ القرّاء لا شعورياً لإيجادها مُرضية. تعلّم الثلاثة جميعاً، ثم اختر ما يناسب القصة التي ترويها فعلاً."
            : "Professional authors don't write in straight lines. They follow frameworks that readers are unconsciously wired to find satisfying. Learn all three, then choose the one that fits the story you're actually telling."}
        />

        {/* Structure tabs */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mb-6">
          {structures.map((s, i) => {
            const Icon = s.icon;
            return (
              <button
                key={s.name}
                onClick={() => { setActiveStructure(i); setExpandedAct(null); }}
                className={`flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm font-semibold border transition-all text-left ${
                  activeStructure === i
                    ? `bg-foreground text-background border-foreground`
                    : `bg-card border-border text-muted-foreground hover:text-foreground hover:border-foreground/30`
                }`}
              >
                <Icon className="w-4 h-4 flex-shrink-0" />
                <span className="truncate flex-1 min-w-0">{s.name}</span>
                <span className={`text-[10px] px-1.5 py-0.5 rounded-full flex-shrink-0 ${activeStructure === i ? "bg-background/20" : "bg-foreground/8"}`}>{s.tag}</span>
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
          icon={Users} label={ar ? "03. الشخصية" : "03. Character"}
          title={ar ? "اكتب بشراً، لا قوالب فارغة." : "Write people, not placeholders."}
          subtitle={ar
            ? "الحبكة هي ما يحدث. الشخصية هي لماذا نهتمّ. القصص الأطول بقاءً في الذاكرة لا تُذكَر بأحداثها، بل تُذكَر بالناس الذين عاشوها، معيبين ومتغيّرين."
            : "Plot is what happens. Character is why we care. The stories that live longest in memory aren't remembered for their events. They're remembered for the people who lived through them, flawed and changing."}
        />

        <div className="mb-12">
          <h3 className="text-lg font-bold text-foreground mb-2">{ar ? "الركائز الست للشخصية العظيمة" : "The Six Pillars of a Great Character"}</h3>
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
          <h3 className="text-lg font-bold text-foreground mb-2">{ar ? "أنواع أقواس الشخصية الثلاثة" : "The Three Character Arc Types"}</h3>
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
          icon={Mic2} label={ar ? "04. الحوار" : "04. Dialogue"}
          title={ar ? "اجعلهم يتكلّمون كالبشر." : "Make them talk like people."}
          subtitle={ar
            ? "الحوار أسرع طريقة لكشف الشخصية، وخلق الصراع، ودفع الحبكة، كل ذلك في نفَس واحد. هذه المبادئ الأربعة تفصل الحوار الهاوي عن النوع الذي يحمل المشهد."
            : "Dialogue is the fastest way to reveal character, create conflict, and advance plot, all in the same breath. These four principles separate amateur dialogue from the kind that carries a scene."}
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
                      <p className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-red-400 mb-2">{ar ? "ضعيف" : "Weak"}</p>
                      <p className="text-[12px] sm:text-sm text-foreground/70 font-mono leading-relaxed whitespace-pre-line break-words">{principle.bad}</p>
                    </div>
                    <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-3 sm:p-4">
                      <p className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-emerald-400 mb-2">{ar ? "قوي" : "Strong"}</p>
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
          icon={Map} label={ar ? "05. العملية" : "05. Process"}
          title={ar ? "من الفكرة إلى كتاب منشور." : "From idea to published book."}
          subtitle={ar
            ? "كتابة كتاب مشروع متعدّد المراحل. فهمُ المرحلة التي أنت فيها، وما تتطلّبه منك تلك المرحلة فعلاً، هو الفرق بين الكتّاب الذين يُنهون والذين لا يُنهون."
            : "Writing a book is a multi-phase project. Understanding which phase you're in, and what that phase actually demands of you, is the difference between writers who finish and writers who don't."}
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
          icon={Scissors} label={ar ? "06. التحرير" : "06. Editing"}
          title={ar ? "الكتابة إعادة كتابة." : "Writing is rewriting."}
          subtitle={ar
            ? "المؤلّفون المنشورون يراجعون من ثلاث إلى سبع مرّات قبل أن تصبح المخطوطة جاهزة. كل جولة تركّز على طبقة مختلفة: البنية، والشخصية، والنثر، والإيقاع. استخدم هذه القائمة كخريطتك خلال العمل."
            : "Published authors revise three to seven times before a manuscript is ready. Each pass focuses on a different layer: structure, character, prose, pacing. Use this checklist as your map through the work."}
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
          icon={Lightbulb} label={ar ? "07. المزالق" : "07. Pitfalls"}
          title={ar ? "الأخطاء الثمانية التي يقع فيها كل مبتدئ." : "The eight mistakes every beginner makes."}
          subtitle={ar
            ? "هذه أكثر الفخاخ التي يقع فيها الكتّاب الجدد قابليةً للتوقّع، وأسهلها إصلاحاً متى عرفت أن تبحث عنها. أغلبها ليست مشكلات موهبة، بل مشكلات وعي."
            : "These are the most predictable traps new writers fall into, and the easiest to fix once you know to look for them. Most aren't talent problems. They're awareness problems."}
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
            <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-muted-foreground/70 mb-3">{ar ? "من الكبار" : "From the Masters"}</p>
            <h2 className="text-[1.75rem] md:text-[2.25rem] font-bold text-foreground mb-3 leading-[1.1] tracking-[-0.025em]">
              {ar ? "ما تعلّمه العظماء." : "What the greats learned."}
            </h2>
            <p className="text-muted-foreground text-[14px] md:text-[15px] max-w-xl leading-[1.65] mx-auto">
              {ar
                ? "كتّاب شكّلت كتبهم طريقة قراءتنا وكتابتنا، لكلٍّ نصيحة واحدة وطريقة ملموسة لتطبيقها."
                : "Eight writers whose books have shaped how we read and write, each with a single piece of advice and a concrete way to apply it."}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {[
              {
                quote: "It is impossible to live without failing at something, unless you live so cautiously that you might as well not have lived at all: in which case, you fail by default.",
                quoteAr: "من المستحيل أن تعيش دون أن تفشل في شيء، إلا أن تعيش بحذر شديد حتى لكأنك لم تعش أصلاً؛ وفي هذه الحال تكون قد فشلت تلقائياً.",
                author: "J.K. Rowling",
                work: "Harvard Commencement Speech, 2008",
                tip: "Embrace failure as part of the creative process. Every rejected manuscript, every abandoned draft, is a step toward your finished book.",
                tipAr: "تقبّل الفشل كجزء من العملية الإبداعية. كل مخطوطة مرفوضة، وكل مسودّة مهجورة، خطوة نحو كتابك المكتمل.",
                accent: "#a78bfa",
                initials: "JKR",
              },
              {
                quote: "If you don't have time to read, you don't have the time (or the tools) to write. Simple as that.",
                quoteAr: "إن لم يكن لديك وقت للقراءة، فليس لديك الوقت (ولا الأدوات) للكتابة. بهذه البساطة.",
                author: "Stephen King",
                work: "On Writing: A Memoir of the Craft",
                tip: "Read voraciously in your genre and outside it. Every book you read is a masterclass in how story, voice, and structure work.",
                tipAr: "اقرأ بنهم في نوعك وخارجه. كل كتاب تقرؤه درس متقَن في كيفية عمل القصة والصوت والبنية.",
                accent: "#f87171",
                initials: "SK",
              },
              {
                quote: "You don't write because you want to say something; you write because you have something to say.",
                quoteAr: "أنت لا تكتب لأنك تريد أن تقول شيئاً؛ بل تكتب لأن لديك شيئاً لتقوله.",
                author: "F. Scott Fitzgerald",
                work: "The Crack-Up, 1936",
                tip: "Before you begin, ask yourself: what is the one thing this story must say? That core truth will guide every scene you write.",
                tipAr: "قبل أن تبدأ، اسأل نفسك: ما الشيء الوحيد الذي يجب أن تقوله هذه القصة؟ تلك الحقيقة الجوهرية ستوجّه كل مشهد تكتبه.",
                accent: "#38bdf8",
                initials: "FSF",
              },
              {
                quote: "There is no greater agony than bearing an untold story inside you.",
                quoteAr: "لا عذاب أعظم من حمل قصة لم تُروَ في داخلك.",
                author: "Maya Angelou",
                work: "I Know Why the Caged Bird Sings",
                tip: "The story already exists inside you. Your job as a writer is not to invent it: it is to find the courage to tell it honestly.",
                tipAr: "القصة موجودة فيك أصلاً. مهمّتك ككاتب ليست أن تخترعها، بل أن تجد الشجاعة لروايتها بصدق.",
                accent: "#fb923c",
                initials: "MA",
              },
              {
                quote: "A reader lives a thousand lives before he dies. The man who never reads lives only one.",
                quoteAr: "القارئ يعيش ألف حياة قبل أن يموت. والذي لا يقرأ أبداً يعيش حياة واحدة فقط.",
                author: "George R.R. Martin",
                work: "A Dance with Dragons",
                tip: "Remember why stories matter: they expand empathy. Write characters so real that readers feel they have truly lived inside another life.",
                tipAr: "تذكّر لماذا تهمّ القصص: إنها توسّع التعاطف. اكتب شخصيات حقيقية إلى حدّ يشعر فيه القرّاء أنهم عاشوا فعلاً داخل حياة أخرى.",
                accent: "#4ade80",
                initials: "GRRM",
              },
              {
                quote: "The first draft is just you telling yourself the story.",
                quoteAr: "المسودّة الأولى ليست إلا أنت تروي القصة لنفسك.",
                author: "Terry Pratchett",
                work: "Advice on Writing",
                tip: "Give yourself permission to write badly at first. The magic of writing happens in revision: but only if there is a first draft to revise.",
                tipAr: "امنح نفسك إذناً بأن تكتب بشكل سيّئ في البداية. سحر الكتابة يحدث في المراجعة، لكن فقط إذا كانت هناك مسودّة أولى لمراجعتها.",
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
                    {ar ? item.quoteAr : item.quote}
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
                      {ar ? "خلاصة عملية" : "Practical Takeaway"}
                    </p>
                    <p className="text-sm text-muted-foreground leading-relaxed">{ar ? item.tipAr : item.tip}</p>
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
            {ar ? "كلمة ختامية" : "A Closing Note"}
          </p>
          <h3 className="text-[1.5rem] md:text-[1.875rem] font-bold text-foreground mb-4 leading-[1.2] tracking-[-0.02em]">
            {ar ? "السبيل الوحيد لكتابة كتاب هو أن تكتبه." : "The only way to write a book is to write it."}
          </h3>
          <p className="text-muted-foreground leading-[1.65] text-[14px] md:text-[15px] mb-6">
            {ar
              ? "كل إطار في هذا الدليل ثانوي أمام فعل واحد لا بديل له: الحضور إلى الصفحة. اقرأ هذا الدليل مرة. عُد إليه حين تتعثّر. لكن لا تخلط بين القراءة عن الكتابة والكتابة نفسها. الكتّاب الذين يُنهون الكتب هم الذين يكتبون بشكل غير مثالي، كل يوم، حتى ينتهوا."
              : <>Every framework in this guide is secondary to one irreplaceable act: showing up at the page. Read this guide once. Come back to it when stuck. But don&apos;t mistake reading about writing for writing itself. The writers who finish books are the ones who write imperfectly, every day, until they&apos;re done.</>}
          </p>
          <blockquote className="mt-6 py-4 px-5 rounded-xl border border-border/60 bg-foreground/[0.02] max-w-sm mx-auto">
            <p className="text-[14px] italic text-foreground/85 leading-relaxed mb-2">
              {ar ? "«المسودّة الأولى لأي شيء نفاية.»" : <>&ldquo;The first draft of anything is garbage.&rdquo;</>}
            </p>
            <cite className="text-[10px] not-italic font-semibold tracking-[0.15em] uppercase text-muted-foreground/70">
              Ernest Hemingway
            </cite>
          </blockquote>
        </motion.div>
      </section>

        </div>{/* end main content area */}
      </div>{/* end centered column wrapper */}

      </div>
      <AuthModal open={authOpen} onClose={() => setAuthOpen(false)} />
    </Layout>
  );
}
