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
      "I write in airports, on my phone, wherever. It is all there on my laptop when I get home. Nothing ever gets lost.",
    quoteAr:
      "بكتب بالمطار، على تلفوني، بأي مكان. وبلاقي كل شي موجود على اللابتوب لما أرجع. ولا مرة ضاع مني اشي.",
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
    photo: "/images/testimonials/margaret-wilson.jpg",
    pos: "32% 40%",
    accent: "#e0b088",
  },
];
