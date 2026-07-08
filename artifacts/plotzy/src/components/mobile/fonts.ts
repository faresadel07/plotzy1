// Shared display fonts for the warm home sections.
//
// Lora and Amiri already ship in the global stylesheet; this adds the
// two handwriting faces used for the margin annotations (the Sudowrite
// touch Faris asked for): Caveat for Latin, Aref Ruqaa for Arabic
// (ruqaa IS the everyday Arabic handwriting style).

export const SERIF_EN = "'Lora', Georgia, serif";
export const SERIF_AR = "'Amiri', 'Noto Naskh Arabic', serif";
export const HAND_EN = "'Caveat', 'Segoe Script', cursive";
export const HAND_AR = "'Aref Ruqaa', 'Amiri', serif";

const LINK_ID = "plotzy-home-fonts";

export function ensureHomeFonts(): void {
  if (typeof document === "undefined" || document.getElementById(LINK_ID)) return;
  const link = document.createElement("link");
  link.id = LINK_ID;
  link.rel = "stylesheet";
  link.href =
    "https://fonts.googleapis.com/css2?family=Caveat:wght@500;700&family=Aref+Ruqaa:wght@400;700&display=swap";
  document.head.appendChild(link);
}
