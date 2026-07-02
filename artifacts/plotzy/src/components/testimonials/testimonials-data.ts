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
      "I started a chapter in a Paris departure lounge and finished it on my laptop that night without losing a single word. Plotzy follows me across every device, so my story never has to wait for me to sit down.",
    quoteAr:
      "بلّشت فصل وأنا بصالة المغادرة بباريس، وخلّصته على اللابتوب بالليل بدون ما تضيع ولا كلمة. بلوتزي بينتقل معي على كل جهاز، فقصّتي أبداً ما بتنتظرني لحد ما أقعد.",
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
      "The cover designer alone made my book look like it came straight off a bookstore shelf. I sent the final version to my friends and not one of them believed I made it myself.",
    quoteAr:
      "مصمّم الغلاف لحاله خلّى كتابي يبيّن كأنه منزّل من رفّ مكتبة. بعتّ النسخة النهائيّة لأصحابي، وولا واحد فيهم صدّق إني أنا يلي عملتها.",
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
      "I always had ideas, but the blank page beat me every time. The AI studio helped me outline the entire plot and draft my first chapter in one evening, and every line still sounded like me.",
    quoteAr:
      "دايماً كان عندي أفكار، بس الصفحة الفاضية تغلبني كل مرّة. استوديو الذكاء ساعدني أرتّب الحبكة كاملة وأكتب أول فصل بسهرة وحدة، وكل سطر ظلّ يشبهني أنا.",
    photo: "/images/testimonials/mohammad.jpg",
    pos: "50% 28%",
    accent: "#7c9cff",
  },
  {
    id: "saif",
    name: "Saif",
    nameAr: "سيف",
    role: "Adventurer who dictates everything",
    roleAr: "مغامر يملي كل شي بصوته",
    quote:
      "I do not sit still long enough to type a whole novel. So I talk, and Plotzy turns my voice into clean text. Half of my book was written from the back of a quad bike, and honestly it reads better that way.",
    quoteAr:
      "أنا ما بقعد بمكان كفاية عشان أكتب رواية كاملة. فأنا بحكي، وبلوتزي بيحوّل صوتي لنصّ نظيف. نص كتابي انكتب وأنا على ظهر دبّابة صحراويّة، وبصراحة طلع أحلى هيك.",
    photo: "/images/testimonials/saif.jpg",
    pos: "50% 42%",
    accent: "#ff8a4c",
  },
  {
    id: "fuad",
    name: "Fuad Guname",
    nameAr: "فؤاد غنيمة",
    role: "Lifelong storyteller",
    roleAr: "حكواتي من زمان",
    quote:
      "I am not a technology person at all, and I still finished a whole book without asking anyone for help. Everything sits exactly where you expect it, and it did not cost me a single dinar.",
    quoteAr:
      "أنا مالي أي خبرة بالتكنولوجيا، ومع هيك خلّصت كتاب كامل بدون ما أطلب مساعدة من حدا. كل شي بمكانه يلي بتتوقّعه بالضبط، وما كلّفني ولا دينار.",
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
      "The free course taught me how to actually build a story instead of just dreaming about one. I went through it chapter by chapter, and by the end I had a finished draft, not just a folder of notes.",
    quoteAr:
      "الدورة المجّانيّة علّمتني كيف أبني القصّة فعلاً، مش بس أحلم فيها. مشيت فيها فصل فصل، وبالآخر طلعت بمسوّدة كاملة، مش بس مجلّد ملاحظات.",
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
      "I came to read other people's stories and stayed to write my own. Sharing my first short story with the community and watching people actually read it was the moment I finally felt like a real writer.",
    quoteAr:
      "إجيت أقرا قصص غيري، وقعدت أكتب قصّتي. لمّا شاركت أول قصّة قصيرة مع المجتمع وشفت الناس فعلاً عم تقراها، هاي كانت اللحظة يلي حسّيت فيها أخيراً إني كاتبة حقيقيّة.",
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
      "I am writing down our family story so my grandchildren will always have it. Plotzy even turned my chapters into an audiobook, so my husband can listen along while I keep writing the next one.",
    quoteAr:
      "عم بكتب قصّة عيلتنا عشان يضلّ عند أحفادي إياها دايماً. بلوتزي كمان حوّل فصولي لكتاب صوتي، عشان جوزي يسمع معي وأنا كمّل بالفصل الي بعده.",
    photo: "/images/testimonials/margaret-wilson.jpg",
    pos: "32% 40%",
    accent: "#e0b088",
  },
];
