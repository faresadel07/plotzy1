// Real early testers of Plotzy, with their permission. Each quote is
// written to spotlight a different pillar of the product (write
// anywhere, cover design, the AI studio, dictation, ease of use, the
// free course, the community, and audiobooks) so the wall reads as a
// tour of the platform, not eight versions of "it is great".
//
// Photos live in public/images/testimonials. `pos` is the CSS
// object-position that keeps each person's face centred inside a round
// avatar (some shots are full-body or off-centre selfies).

export interface Testimonial {
  id: string;
  name: string;
  nameAr: string;
  role: string;
  roleAr: string;
  quote: string;
  quoteAr: string;
  /** Longer chat-style version for the feedback wall (falls back to quote). */
  quoteLong?: string;
  quoteLongAr?: string;
  /** Chat-card dressing for the feedback wall. */
  reactions?: [string, number][];
  replies?: number;
  time?: string;
  photo: string;
  pos: string;
  accent: string;
}

export const TESTIMONIALS: Testimonial[] = [
  {
    id: "claire",
    name: "Claire Bennett",
    nameAr: "كلير بينيت",
    role: "Writes between flights",
    roleAr: "تكتب بين الرحلات",
    quote:
      "I write in airports, on my phone, wherever. It is all there on my laptop when I get home. Nothing ever gets lost.",
    quoteAr:
      "بكتب بالمطار، على تلفوني، بأي مكان. وبلاقي كل شي موجود على اللابتوب لما أرجع. ولا مرة ضاع مني اشي.",
    quoteLong:
      "I write in airports, on my phone, in the back seat of taxis. It is all there on my laptop when I get home, every word exactly where I left it. I used to email drafts to myself and lose half of them between devices. Nothing ever gets lost now, and honestly that changed how often I write.",
    quoteLongAr:
      "بكتب بالمطار، على تلفوني، بكراسي التاكسي الخلفية. وبلاقي كل شي على اللابتوب لما أرجع، كل كلمة بمكانها بالضبط. قبل كنت أبعت المسودات لإيميلي وأضيّع نصها بين الأجهزة. هلأ ولا مرة ضاع مني إشي، وبصراحة هاد غيّر عدد المرات اللي بكتب فيها.",
    reactions: [["❤️", 6], ["✍️", 3]],
    replies: 5,
    time: "2:01 AM",
    photo: "/images/testimonials/claire-bennett.jpg",
    pos: "50% 38%",
    accent: "#5eb3ff",
  },
  {
    id: "hani",
    name: "Hani",
    nameAr: "هاني",
    role: "Independent author",
    roleAr: "ناشر مستقلّ",
    quote:
      "The cover I made looked so good my friends thought I paid a designer. I did not.",
    quoteAr:
      "الغلاف اللي عملته طلع حلو لدرجة أصحابي فكروا إني دفعت لمصمم. وأنا ما دفعت ولا شي.",
    quoteLong:
      "The cover I made looked so good my friends thought I paid a designer. I did not. I picked a template, it already had my title sitting on it, moved two things around and exported it print ready. The cover of my last book cost me eighty dollars and looked worse than this one.",
    quoteLongAr:
      "الغلاف اللي عملته طلع حلو لدرجة أصحابي فكروا إني دافع لمصمم. وأنا ما دفعت ولا شي. اخترت قالب لقيته جاهز وعليه اسم كتابي، حركت شغلتين وصدّرته بجودة الطباعة. غلاف كتابي الماضي كلفني ثمانين دولار وطلع أبشع من هاد.",
    reactions: [["💯", 4], ["🔥", 2]],
    replies: 6,
    time: "11:43 AM",
    photo: "/images/testimonials/hani.jpg",
    pos: "50% 20%",
    accent: "#d9a441",
  },
  {
    id: "mohammad",
    name: "Mohammad",
    nameAr: "محمد",
    role: "Computer science student",
    roleAr: "طالب علم حاسوب",
    quote:
      "I always froze at the blank page. The AI helped me get an outline and a first chapter down in one night, and it still sounded like me.",
    quoteAr:
      "دايماً كنت أتجمّد قدام الصفحة الفاضية. الذكاء ساعدني أطلع مخطط وأول فصل بليلة وحدة، وظل الكلام يشبهني.",
    quoteLong:
      "I always froze at the blank page. Every semester I told myself I would finally write something and every semester I did not. The AI helped me get an outline and a first chapter down in one night, and the strange part is it still sounded like me. Not like a robot wrote it, like me on a good day.",
    quoteLongAr:
      "دايماً كنت أتجمد قدام الصفحة الفاضية. كل فصل جامعي أحكي لحالي خلص رح أكتب إشي، وولا مرة كتبت. الذكاء الاصطناعي ساعدني أطلع مخطط وأول فصل بليلة وحدة، والغريب إنه الكلام ظل يشبهني أنا. مش روبوت كاتبه، أنا بس بيوم رايق.",
    reactions: [["👏", 6], ["❤️", 4], ["💯", 2]],
    replies: 5,
    time: "2:01 AM",
    photo: "/images/testimonials/mohammad.jpg",
    pos: "50% 28%",
    accent: "#7c9cff",
  },
  {
    id: "saif",
    name: "Saif",
    nameAr: "سيف",
    role: "Always on the move",
    roleAr: "ما بيقعد بمكان",
    quote:
      "I cannot sit and type for hours. So I just talk and it writes it down. Wrote half my book on a road trip.",
    quoteAr:
      "ما بقدر أقعد أكتب ساعات. فأنا بحكي وهو بيكتب. نص كتابي كتبته وأنا بطلعة برا.",
    quoteLong:
      "I cannot sit and type for hours, my back gives up long before my ideas do. So I just talk and it writes everything down, punctuation and all. Half my book got written on a road trip to Aqaba with the phone sitting on the dashboard. My friends thought I was on a very long phone call.",
    quoteLongAr:
      "ما بقدر أقعد أكتب ساعات، ظهري بيستسلم قبل أفكاري بكثير. فأنا بس بحكي وهو بيكتب كل شي، بالفواصل وكل التفاصيل. نص كتابي انكتب بطريق العقبة والتلفون محطوط على طبلون السيارة. أصحابي فكروني بمكالمة طويلة جداً.",
    reactions: [["🔥", 5], ["👏", 2]],
    replies: 3,
    time: "6:20 PM",
    photo: "/images/testimonials/saif.jpg",
    pos: "50% 42%",
    accent: "#ff8a4c",
  },
  {
    id: "fuad",
    name: "Fuad Guname",
    nameAr: "فؤاد غنيمة",
    role: "Storyteller",
    roleAr: "حكواتي",
    quote:
      "I am terrible with tech and I still finished a book on my own. And it was free, which honestly surprised me.",
    quoteAr:
      "أنا زفت بالتكنولوجيا ومع هيك خلّصت كتاب لحالي. وكان مجاني، وهاد صراحة فاجأني.",
    quoteLong:
      "I am terrible with tech. My daughter set up my account and I was sure that was the last time I would ever open it. Three months later I finished a whole book on my own, cover and everything. And it was free, which honestly I still do not understand.",
    quoteLongAr:
      "أنا زفت بالتكنولوجيا. بنتي عملتلي الحساب وكنت متأكد إنها آخر مرة رح أفتحه فيها. بعد ثلاث شهور خلصت كتاب كامل لحالي، بغلافه وكل شي. وكان مجاني، وهاد لليوم مش قادر أستوعبه.",
    reactions: [["❤️", 8], ["🤗", 3]],
    replies: 7,
    time: "8:14 AM",
    photo: "/images/testimonials/fuad-guname.jpg",
    pos: "50% 38%",
    accent: "#5fcf8e",
  },
  {
    id: "fadelallah",
    name: "Fadelallah Al Salem",
    nameAr: "فضل الله السالم",
    role: "Literature student",
    roleAr: "طالب أدب",
    quote:
      "The free course actually walked me through it. By the end I had a real draft, not just a page of ideas.",
    quoteAr:
      "الدورة المجانية فعلاً مشّتني خطوة خطوة. وبالآخر صار عندي مسوّدة حقيقية، مش بس صفحة أفكار.",
    quoteLong:
      "The free course actually walked me through it, lesson by lesson, with exercises that made me write instead of just watch. By the end I had a real draft with a beginning, a middle and an ending that lands. Not a page of scattered ideas like every other time I tried.",
    quoteLongAr:
      "الدورة المجانية فعلاً مشتني خطوة خطوة، درس ورا درس، بتمارين خلتني أكتب مش بس أتفرج. بالآخر صار معي مسودة حقيقية إلها بداية ووسط ونهاية بتوصل. مش صفحة أفكار مبعثرة زي كل مرة جربت فيها.",
    reactions: [["💯", 5], ["✍️", 2]],
    replies: 4,
    time: "9:37 PM",
    photo: "/images/testimonials/fadelallah-al-salem.jpg",
    pos: "50% 20%",
    accent: "#a78bfa",
  },
  {
    id: "leena",
    name: "Leena Hassan",
    nameAr: "لينا حسن",
    role: "Reader turned writer",
    roleAr: "قارئة صارت كاتبة",
    quote:
      "I came just to read. Then I posted my own story and people actually read it. That got me hooked.",
    quoteAr:
      "إجيت بس أقرا. وبعدين نشرت قصتي وفعلاً في ناس قرأتها. من هون تعلّقت.",
    quoteLong:
      "I came just to read the free classics on my commute. Then one night I posted a short story that had been hiding in my notes app for a year. People actually read it and left comments, real ones, about specific lines. That got me hooked, and now I am four chapters into a novel I never planned to write.",
    quoteLongAr:
      "إجيت بس أقرا الكلاسيكيات المجانية بطريق الجامعة. وبليلة من الليالي نشرت قصة قصيرة كانت مخبية عندي بالنوتس من سنة. في ناس فعلاً قرأتها وحطت تعليقات، تعليقات حقيقية عن جمل بعينها. من هون تعلقت، وهلأ أنا بالفصل الرابع من رواية ولا مرة خططت أكتبها.",
    reactions: [["❤️", 7], ["👏", 3], ["🔥", 1]],
    replies: 8,
    time: "1:12 AM",
    photo: "/images/testimonials/leena-hassan.jpg",
    pos: "50% 38%",
    accent: "#f472b6",
  },
  {
    id: "margaret",
    name: "Margaret Wilson",
    nameAr: "مارغريت ويلسون",
    role: "Writing her family memoir",
    roleAr: "تكتب مذكّرات عائلتها",
    quote:
      "I am writing our family story for the grandkids. It even made an audiobook so my husband can listen while I write.",
    quoteAr:
      "عم بكتب قصة عيلتنا للأحفاد. وكمان عمل منها كتاب صوتي عشان جوزي يسمع وأنا بكتب.",
    quoteLong:
      "I am writing our family story for the grandkids, seventy years of it. The dictation is kind to my hands and the pages look like a real printed book, which makes an old woman feel like a real author. It even made an audiobook of the first chapters so my husband can listen in his chair while I write the next part.",
    quoteLongAr:
      "عم بكتب قصة عيلتنا للأحفاد، سبعين سنة منها. الإملاء الصوتي بيرحم إيديي، والصفحات شكلها كتاب مطبوع حقيقي، وهاد بيخلي مرة كبيرة بالعمر تحس حالها كاتبة حقيقية. وكمان عمل من أول الفصول كتاب صوتي عشان جوزي يسمع على كرسيه وأنا بكتب الجزء الجاي.",
    reactions: [["❤️", 11], ["🤗", 4]],
    replies: 9,
    time: "4:45 PM",
    photo: "/images/testimonials/margaret-wilson.jpg",
    pos: "32% 40%",
    accent: "#e0b088",
  },
];
