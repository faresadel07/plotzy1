// Genre cover templates for the cover designer.
//
// Every template is data: a background per face plus positioned slots
// for the title, the author, and decorative shapes, with separate font
// choices for Arabic and Latin titles. buildTemplateDesign() turns a
// template + the writer's real title/author into ready CoverElements,
// which is also how the gallery renders LIVE thumbnails carrying the
// user's own book title (the feature none of the big tools have).
//
// Layout space: front/back faces are 300x450, spine is ~48 wide.
// Research-driven rules baked in: Arabic text never receives
// letter-spacing (joining breaks); Arabic titles get their own font
// pairing per genre; spine text is seeded from the template so the
// whole wrap stays coherent.

export type TemplateGenre =
  | "thriller"
  | "romance"
  | "fantasy"
  | "scifi"
  | "literary"
  | "nonfiction"
  | "poetry"
  | "children";

export const TEMPLATE_GENRES: { id: TemplateGenre; label: string; labelAr: string }[] = [
  { id: "thriller", label: "Thriller", labelAr: "إثارة" },
  { id: "romance", label: "Romance", labelAr: "رومانسي" },
  { id: "fantasy", label: "Fantasy", labelAr: "فانتازيا" },
  { id: "scifi", label: "Sci-Fi", labelAr: "خيال علمي" },
  { id: "literary", label: "Literary", labelAr: "أدبي" },
  { id: "nonfiction", label: "Non-fiction", labelAr: "غير روائي" },
  { id: "poetry", label: "Poetry", labelAr: "شعر" },
  { id: "children", label: "Children", labelAr: "أطفال" },
];

interface ShapeSlot {
  shapeType: "rect" | "circle" | "line";
  x: number; y: number; width: number; height: number;
  fill: string;
  opacity?: number;
  borderRadius?: number;
}

interface TextSlot {
  y: number;
  height: number;
  fontSize: number;
  /** Arabic titles are often wider glyphs; optional size override. */
  fontSizeAr?: number;
  font: string;
  fontAr: string;
  weight?: string;
  color: string;
  letterSpacing?: number; // Latin only; stripped for Arabic automatically
  lineHeight?: number;
  transform?: "uppercase" | "none";
}

export interface CoverTemplate {
  id: string;
  genre: TemplateGenre;
  name: string;
  nameAr: string;
  frontBackground: string;
  backBackground: string;
  spineBackground: string;
  spineColor: string;
  shapes: ShapeSlot[];
  title: TextSlot;
  author: TextSlot;
}

const T = (t: CoverTemplate) => t;

export const COVER_TEMPLATES: CoverTemplate[] = [
  // ── THRILLER ────────────────────────────────────────────────────────
  T({
    id: "thriller-noir",
    genre: "thriller",
    name: "Noir",
    nameAr: "نوار",
    frontBackground: "linear-gradient(180deg, #0b0b0d 0%, #1a1a1f 70%, #0b0b0d 100%)",
    backBackground: "#0e0e11",
    spineBackground: "#0b0b0d",
    spineColor: "#e63946",
    shapes: [
      { shapeType: "rect", x: 30, y: 236, width: 240, height: 4, fill: "#e63946" },
    ],
    title: { y: 120, height: 110, fontSize: 44, fontSizeAr: 46, font: "Bebas Neue", fontAr: "Lalezar", color: "#ffffff", letterSpacing: 3, transform: "uppercase", lineHeight: 1.05 },
    author: { y: 386, height: 30, fontSize: 14, font: "Oswald", fontAr: "Cairo", color: "rgba(255,255,255,0.72)", letterSpacing: 4, transform: "uppercase" },
  }),
  T({
    id: "thriller-blood",
    genre: "thriller",
    name: "Crimson",
    nameAr: "قرمزي",
    frontBackground: "linear-gradient(160deg, #33060a 0%, #14040a 60%, #050505 100%)",
    backBackground: "#140408",
    spineBackground: "#1d050a",
    spineColor: "#f1e9e9",
    shapes: [
      { shapeType: "rect", x: 0, y: 300, width: 300, height: 150, fill: "#000000", opacity: 0.45 },
    ],
    title: { y: 60, height: 140, fontSize: 42, fontSizeAr: 44, font: "Oswald", fontAr: "Rakkas", color: "#f4ecec", lineHeight: 1.08 },
    author: { y: 400, height: 28, fontSize: 13, font: "Montserrat", fontAr: "Tajawal", color: "rgba(244,236,236,0.65)", letterSpacing: 3, transform: "uppercase" },
  }),

  // ── ROMANCE ─────────────────────────────────────────────────────────
  T({
    id: "romance-blush",
    genre: "romance",
    name: "Blush",
    nameAr: "خدود",
    frontBackground: "linear-gradient(170deg, #fdeef0 0%, #f6d5db 55%, #e8b7c2 100%)",
    backBackground: "#f8e3e7",
    spineBackground: "#eec3cc",
    spineColor: "#7a3346",
    shapes: [
      { shapeType: "line", x: 90, y: 250, width: 120, height: 2, fill: "#b06378" },
    ],
    title: { y: 130, height: 120, fontSize: 40, fontSizeAr: 46, font: "Abril Fatface", fontAr: "Katibeh", color: "#75283d", lineHeight: 1.12 },
    author: { y: 300, height: 30, fontSize: 15, font: "Cormorant Garamond", fontAr: "Amiri", color: "#9a5468" },
  }),
  T({
    id: "romance-dusk",
    genre: "romance",
    name: "Dusk",
    nameAr: "غسق",
    frontBackground: "linear-gradient(185deg, #2a1631 0%, #59243f 55%, #a34a52 100%)",
    backBackground: "#33192f",
    spineBackground: "#47203a",
    spineColor: "#f5d9c8",
    shapes: [
      { shapeType: "circle", x: 105, y: 60, width: 90, height: 90, fill: "#f5d9c8", opacity: 0.9 },
    ],
    title: { y: 200, height: 120, fontSize: 38, fontSizeAr: 44, font: "Playfair Display", fontAr: "Aref Ruqaa", color: "#fbeadf", lineHeight: 1.12 },
    author: { y: 392, height: 28, fontSize: 14, font: "Montserrat", fontAr: "Tajawal", color: "rgba(251,234,223,0.7)", letterSpacing: 2 },
  }),

  // ── FANTASY ─────────────────────────────────────────────────────────
  T({
    id: "fantasy-epic",
    genre: "fantasy",
    name: "Epic",
    nameAr: "ملحمي",
    frontBackground: "linear-gradient(180deg, #0c1226 0%, #16224a 55%, #0c1226 100%)",
    backBackground: "#0d1330",
    spineBackground: "#101a3d",
    spineColor: "#d8b45a",
    shapes: [
      { shapeType: "line", x: 40, y: 96, width: 220, height: 2, fill: "#d8b45a" },
      { shapeType: "line", x: 40, y: 352, width: 220, height: 2, fill: "#d8b45a" },
    ],
    title: { y: 150, height: 150, fontSize: 38, fontSizeAr: 42, font: "Cinzel", fontAr: "Aref Ruqaa", color: "#e9d8a6", lineHeight: 1.15 },
    author: { y: 380, height: 30, fontSize: 14, font: "Cinzel", fontAr: "Amiri", color: "rgba(233,216,166,0.75)", letterSpacing: 2 },
  }),
  T({
    id: "fantasy-emerald",
    genre: "fantasy",
    name: "Emerald",
    nameAr: "زمرد",
    frontBackground: "linear-gradient(200deg, #04150f 0%, #0a2a1e 60%, #05130d 100%)",
    backBackground: "#061a12",
    spineBackground: "#082018",
    spineColor: "#7fd8a8",
    shapes: [
      { shapeType: "circle", x: 60, y: 90, width: 180, height: 180, fill: "#124d33", opacity: 0.55 },
    ],
    title: { y: 250, height: 130, fontSize: 40, fontSizeAr: 44, font: "Cormorant Garamond", fontAr: "El Messiri", weight: "bold", color: "#c9f2da", lineHeight: 1.1 },
    author: { y: 398, height: 28, fontSize: 13, font: "Montserrat", fontAr: "Cairo", color: "rgba(201,242,218,0.65)", letterSpacing: 3, transform: "uppercase" },
  }),

  // ── SCI-FI ──────────────────────────────────────────────────────────
  T({
    id: "scifi-neon",
    genre: "scifi",
    name: "Neon",
    nameAr: "نيون",
    frontBackground: "linear-gradient(180deg, #030712 0%, #071426 70%, #030712 100%)",
    backBackground: "#050b18",
    spineBackground: "#040d1d",
    spineColor: "#31e1f7",
    shapes: [
      { shapeType: "rect", x: 24, y: 226, width: 252, height: 2, fill: "#31e1f7", opacity: 0.9 },
      { shapeType: "rect", x: 24, y: 234, width: 130, height: 2, fill: "#31e1f7", opacity: 0.45 },
    ],
    title: { y: 96, height: 110, fontSize: 40, fontSizeAr: 42, font: "Space Grotesk", fontAr: "Noto Kufi Arabic", weight: "bold", color: "#e6fbff", letterSpacing: 1, lineHeight: 1.08 },
    author: { y: 396, height: 28, fontSize: 13, font: "Space Grotesk", fontAr: "Tajawal", color: "rgba(49,225,247,0.85)", letterSpacing: 4, transform: "uppercase" },
  }),
  T({
    id: "scifi-orbit",
    genre: "scifi",
    name: "Orbit",
    nameAr: "مدار",
    frontBackground: "linear-gradient(215deg, #150a33 0%, #2a1266 45%, #0b0a2e 100%)",
    backBackground: "#140b30",
    spineBackground: "#1b0f42",
    spineColor: "#c4b5fd",
    shapes: [
      { shapeType: "circle", x: 85, y: 74, width: 130, height: 130, fill: "#7c5cff", opacity: 0.8 },
      { shapeType: "circle", x: 70, y: 60, width: 160, height: 160, fill: "transparent" },
    ],
    title: { y: 244, height: 120, fontSize: 38, fontSizeAr: 42, font: "Space Grotesk", fontAr: "El Messiri", weight: "bold", color: "#efeaff", lineHeight: 1.1 },
    author: { y: 396, height: 28, fontSize: 13, font: "Montserrat", fontAr: "Cairo", color: "rgba(239,234,255,0.65)", letterSpacing: 3, transform: "uppercase" },
  }),

  // ── LITERARY ────────────────────────────────────────────────────────
  T({
    id: "literary-cream",
    genre: "literary",
    name: "Cream",
    nameAr: "كريمي",
    frontBackground: "#f4efe6",
    backBackground: "#efe9dd",
    spineBackground: "#ece5d6",
    spineColor: "#21201d",
    shapes: [
      { shapeType: "line", x: 120, y: 330, width: 60, height: 2, fill: "#8a2b2b" },
    ],
    title: { y: 140, height: 140, fontSize: 38, fontSizeAr: 42, font: "Cormorant Garamond", fontAr: "Amiri", weight: "bold", color: "#21201d", lineHeight: 1.15 },
    author: { y: 60, height: 28, fontSize: 14, font: "Montserrat", fontAr: "Cairo", color: "#6d675c", letterSpacing: 3, transform: "uppercase" },
  }),
  T({
    id: "literary-split",
    genre: "literary",
    name: "Split",
    nameAr: "مشطور",
    frontBackground: "#101014",
    backBackground: "#14141a",
    spineBackground: "#101014",
    spineColor: "#f4efe6",
    shapes: [
      { shapeType: "rect", x: 0, y: 0, width: 300, height: 210, fill: "#c75146" },
    ],
    title: { y: 240, height: 130, fontSize: 38, fontSizeAr: 42, font: "Playfair Display", fontAr: "Markazi Text", weight: "bold", color: "#f4efe6", lineHeight: 1.12 },
    author: { y: 96, height: 30, fontSize: 14, font: "Montserrat", fontAr: "Tajawal", color: "#fbe8e4", letterSpacing: 3, transform: "uppercase" },
  }),

  // ── NON-FICTION ─────────────────────────────────────────────────────
  T({
    id: "nonfiction-clean",
    genre: "nonfiction",
    name: "Clean",
    nameAr: "نظيف",
    frontBackground: "#ffffff",
    backBackground: "#f6f6f4",
    spineBackground: "#ffffff",
    spineColor: "#111111",
    shapes: [
      { shapeType: "rect", x: 30, y: 258, width: 84, height: 8, fill: "#2563eb" },
    ],
    title: { y: 110, height: 140, fontSize: 40, fontSizeAr: 42, font: "Inter", fontAr: "Noto Kufi Arabic", weight: "bold", color: "#0d0d0f", lineHeight: 1.08 },
    author: { y: 392, height: 28, fontSize: 14, font: "Inter", fontAr: "Cairo", color: "#585858" },
  }),
  T({
    id: "nonfiction-impact",
    genre: "nonfiction",
    name: "Impact",
    nameAr: "صادم",
    frontBackground: "#f9c80e",
    backBackground: "#f4c30d",
    spineBackground: "#efbe0a",
    spineColor: "#101010",
    shapes: [
      { shapeType: "rect", x: 0, y: 356, width: 300, height: 94, fill: "#101010" },
    ],
    title: { y: 90, height: 190, fontSize: 46, fontSizeAr: 48, font: "Bebas Neue", fontAr: "Lalezar", color: "#101010", letterSpacing: 1, transform: "uppercase", lineHeight: 1.02 },
    author: { y: 388, height: 30, fontSize: 15, font: "Montserrat", fontAr: "Cairo", weight: "bold", color: "#f9c80e" },
  }),

  // ── POETRY ──────────────────────────────────────────────────────────
  T({
    id: "poetry-mist",
    genre: "poetry",
    name: "Mist",
    nameAr: "ضباب",
    frontBackground: "linear-gradient(180deg, #eef1f4 0%, #dfe5ec 100%)",
    backBackground: "#e9edf2",
    spineBackground: "#e4e9ef",
    spineColor: "#39414d",
    shapes: [
      { shapeType: "rect", x: 24, y: 24, width: 252, height: 402, fill: "transparent" },
      { shapeType: "line", x: 118, y: 258, width: 64, height: 1, fill: "#7c8797" },
    ],
    title: { y: 160, height: 110, fontSize: 34, fontSizeAr: 42, font: "Cormorant Garamond", fontAr: "Markazi Text", color: "#2c333d", lineHeight: 1.2 },
    author: { y: 282, height: 28, fontSize: 14, font: "Cormorant Garamond", fontAr: "Amiri", color: "#66707e" },
  }),
  T({
    id: "poetry-night",
    genre: "poetry",
    name: "Night ink",
    nameAr: "حبر الليل",
    frontBackground: "linear-gradient(180deg, #10141c 0%, #1c2433 100%)",
    backBackground: "#131824",
    spineBackground: "#151b28",
    spineColor: "#d9c8a9",
    shapes: [
      { shapeType: "circle", x: 122, y: 84, width: 56, height: 56, fill: "#d9c8a9", opacity: 0.9 },
    ],
    title: { y: 190, height: 120, fontSize: 36, fontSizeAr: 44, font: "Playfair Display", fontAr: "Katibeh", color: "#efe6d5", lineHeight: 1.18 },
    author: { y: 396, height: 28, fontSize: 13, font: "Montserrat", fontAr: "Tajawal", color: "rgba(239,230,213,0.6)", letterSpacing: 3 },
  }),

  // ── CHILDREN ────────────────────────────────────────────────────────
  T({
    id: "children-sunny",
    genre: "children",
    name: "Sunny",
    nameAr: "مشمس",
    frontBackground: "linear-gradient(180deg, #ffd93d 0%, #ff9f1c 100%)",
    backBackground: "#ffd23e",
    spineBackground: "#ffc93c",
    spineColor: "#173753",
    shapes: [
      { shapeType: "circle", x: 40, y: 56, width: 70, height: 70, fill: "#ffffff", opacity: 0.85 },
      { shapeType: "circle", x: 200, y: 96, width: 44, height: 44, fill: "#ffffff", opacity: 0.7 },
    ],
    title: { y: 180, height: 140, fontSize: 42, fontSizeAr: 48, font: "Baloo Bhaijaan 2", fontAr: "Baloo Bhaijaan 2", weight: "bold", color: "#173753", lineHeight: 1.08 },
    author: { y: 388, height: 30, fontSize: 16, font: "Baloo Bhaijaan 2", fontAr: "Baloo Bhaijaan 2", weight: "bold", color: "#3f5e82" },
  }),
  T({
    id: "children-sea",
    genre: "children",
    name: "Deep sea",
    nameAr: "أعماق",
    frontBackground: "linear-gradient(180deg, #4cc9f0 0%, #4361ee 100%)",
    backBackground: "#48b8e6",
    spineBackground: "#469fdd",
    spineColor: "#ffffff",
    shapes: [
      { shapeType: "circle", x: 36, y: 330, width: 26, height: 26, fill: "#ffffff", opacity: 0.55 },
      { shapeType: "circle", x: 70, y: 300, width: 16, height: 16, fill: "#ffffff", opacity: 0.45 },
      { shapeType: "circle", x: 244, y: 70, width: 34, height: 34, fill: "#ffffff", opacity: 0.5 },
    ],
    title: { y: 120, height: 150, fontSize: 44, fontSizeAr: 48, font: "Baloo Bhaijaan 2", fontAr: "Jomhuria", weight: "bold", color: "#ffffff", lineHeight: 1.06 },
    author: { y: 392, height: 30, fontSize: 16, font: "Baloo Bhaijaan 2", fontAr: "Cairo", weight: "bold", color: "rgba(255,255,255,0.9)" },
  }),
];

// ── Builder ───────────────────────────────────────────────────────────

export interface BuiltTemplateDesign {
  settings: {
    front: { background: string };
    back: { background: string };
    spine: { background: string };
    spineSync: boolean;
  };
  /** Elements typed loosely so the designer page can adopt them as CoverElement[]. */
  elements: Array<Record<string, unknown>>;
}

const ARABIC_RE = /[؀-ۿ]/;

let uid = 0;
function tid(): string {
  uid += 1;
  return `tpl-${Date.now().toString(36)}-${uid}`;
}

export function buildTemplateDesign(
  template: CoverTemplate,
  book: { title: string; author: string },
  ar: boolean,
): BuiltTemplateDesign {
  const title = book.title?.trim() || (ar ? "عنوان الكتاب" : "Book Title");
  const author = book.author?.trim() || (ar ? "اسم الكاتب" : "Author Name");
  const titleIsArabic = ARABIC_RE.test(title) || ar;
  const authorIsArabic = ARABIC_RE.test(author) || ar;

  const textEl = (slot: TextSlot, content: string, isArabic: boolean, z: number) => ({
    id: tid(),
    type: "text",
    face: "front",
    x: 20,
    y: slot.y,
    width: 260,
    height: slot.height,
    zIndex: z,
    visible: true,
    locked: false,
    content: slot.transform === "uppercase" && !isArabic ? content.toUpperCase() : content,
    fontSize: isArabic && slot.fontSizeAr ? slot.fontSizeAr : slot.fontSize,
    fontFamily: isArabic ? slot.fontAr : slot.font,
    fontWeight: slot.weight ?? "bold",
    color: slot.color,
    textAlign: "center",
    lineHeight: slot.lineHeight ?? 1.2,
    // Research rule: letter-spacing breaks Arabic joining. Never apply it.
    letterSpacing: isArabic ? 0 : slot.letterSpacing ?? 0,
  });

  const shapes = template.shapes.map((s, i) => ({
    id: tid(),
    type: "shape",
    face: "front",
    x: s.x,
    y: s.y,
    width: s.width,
    height: s.height,
    zIndex: 2 + i,
    visible: true,
    locked: false,
    shapeType: s.shapeType === "line" ? "rect" : s.shapeType,
    fill: s.fill,
    opacity: s.opacity ?? 1,
    borderRadius: s.borderRadius ?? (s.shapeType === "circle" ? 999 : 0),
    stroke: "transparent",
    strokeWidth: 0,
  }));

  // Spine: title runs down the spine in the template's palette.
  const spineTitle = {
    id: tid(),
    type: "text",
    face: "spine",
    x: 4,
    y: 30,
    width: 40,
    height: 390,
    zIndex: 10,
    visible: true,
    locked: false,
    content: title,
    fontSize: 13,
    fontFamily: titleIsArabic
      ? (template.title.fontAr === "Katibeh" || template.title.fontAr === "Jomhuria" ? "Cairo" : template.title.fontAr)
      : template.title.font,
    fontWeight: "bold",
    color: template.spineColor,
    textAlign: "center",
    lineHeight: 1.2,
    letterSpacing: 0,
  };

  return {
    settings: {
      front: { background: template.frontBackground },
      back: { background: template.backBackground },
      spine: { background: template.spineBackground },
      spineSync: false,
    },
    elements: [
      ...shapes,
      textEl(template.title, title, titleIsArabic, 10),
      textEl(template.author, author, authorIsArabic, 11),
      spineTitle,
    ],
  };
}
