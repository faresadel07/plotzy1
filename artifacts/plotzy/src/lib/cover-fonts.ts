// Cover designer font system.
//
// The old FONTS list mixed web-safe names with Google families that were
// never actually loaded (Oswald, Lato, Montserrat, Merriweather silently
// fell back to system fonts). This registry is the single source of
// truth: every family listed here is guaranteed loaded on the designer
// page via ensureCoverFontsLoaded(), grouped for the picker, and safe to
// use in templates.
//
// Arabic picks follow the typography research: Amiri/Markazi for
// literary, Reem Kufi/Noto Kufi/El Messiri for modern, Aref Ruqaa for
// heritage, Lalezar/Rakkas/Katibeh/Jomhuria for loud display, Cairo/
// Tajawal for supporting text, Baloo Bhaijaan 2 for playful children's
// covers. Letter-spacing must never be applied to Arabic (it breaks
// letter joining) — pickers and templates use isArabicSafeSpacing().

export interface CoverFont {
  /** CSS font-family name. */
  family: string;
  label: string;
  labelAr: string;
  script: "arabic" | "latin" | "both";
  /** Rough voice, used by templates and the picker's grouping. */
  vibe: "classic" | "modern" | "display" | "playful" | "text";
}

export const COVER_FONTS: CoverFont[] = [
  // ── Arabic ─────────────────────────────────────────────────────────
  { family: "Amiri", label: "Amiri", labelAr: "أميري", script: "arabic", vibe: "classic" },
  { family: "Markazi Text", label: "Markazi Text", labelAr: "مركزي", script: "arabic", vibe: "classic" },
  { family: "Aref Ruqaa", label: "Aref Ruqaa", labelAr: "عارف رقعة", script: "arabic", vibe: "display" },
  { family: "Reem Kufi", label: "Reem Kufi", labelAr: "ريم كوفي", script: "arabic", vibe: "modern" },
  { family: "Noto Kufi Arabic", label: "Noto Kufi", labelAr: "نوتو كوفي", script: "arabic", vibe: "modern" },
  { family: "El Messiri", label: "El Messiri", labelAr: "المسيري", script: "arabic", vibe: "modern" },
  { family: "Lalezar", label: "Lalezar", labelAr: "لالِزار", script: "arabic", vibe: "display" },
  { family: "Rakkas", label: "Rakkas", labelAr: "رقّاص", script: "arabic", vibe: "display" },
  { family: "Katibeh", label: "Katibeh", labelAr: "كاتبة", script: "arabic", vibe: "display" },
  { family: "Jomhuria", label: "Jomhuria", labelAr: "جمهورية", script: "arabic", vibe: "display" },
  { family: "Cairo", label: "Cairo", labelAr: "القاهرة", script: "both", vibe: "text" },
  { family: "Tajawal", label: "Tajawal", labelAr: "تجوّل", script: "arabic", vibe: "text" },
  { family: "Baloo Bhaijaan 2", label: "Baloo Bhaijaan", labelAr: "بالو بهيجان", script: "both", vibe: "playful" },

  // ── Latin ──────────────────────────────────────────────────────────
  { family: "Playfair Display", label: "Playfair Display", labelAr: "بلاي فير", script: "latin", vibe: "classic" },
  { family: "Cormorant Garamond", label: "Cormorant", labelAr: "كورمورانت", script: "latin", vibe: "classic" },
  { family: "Cinzel", label: "Cinzel", labelAr: "سينزل", script: "latin", vibe: "display" },
  { family: "Bebas Neue", label: "Bebas Neue", labelAr: "بيباس", script: "latin", vibe: "display" },
  { family: "Abril Fatface", label: "Abril Fatface", labelAr: "أبريل", script: "latin", vibe: "display" },
  { family: "Space Grotesk", label: "Space Grotesk", labelAr: "سبيس غروتيسك", script: "latin", vibe: "modern" },
  { family: "Oswald", label: "Oswald", labelAr: "أوزوالد", script: "latin", vibe: "modern" },
  { family: "Montserrat", label: "Montserrat", labelAr: "مونتسرات", script: "latin", vibe: "text" },
  { family: "Inter", label: "Inter", labelAr: "إنتر", script: "latin", vibe: "text" },
  { family: "Merriweather", label: "Merriweather", labelAr: "ميري ويذر", script: "latin", vibe: "text" },

  // ── Web-safe (always available, kept for existing designs) ─────────
  { family: "Georgia", label: "Georgia", labelAr: "جورجيا", script: "latin", vibe: "classic" },
  { family: "Times New Roman", label: "Times New Roman", labelAr: "تايمز", script: "latin", vibe: "classic" },
  { family: "Courier New", label: "Courier New", labelAr: "كوريير", script: "latin", vibe: "text" },
  { family: "Impact", label: "Impact", labelAr: "إمباكت", script: "latin", vibe: "display" },
];

// Families that need loading from Google Fonts (everything non-web-safe).
const GOOGLE_FAMILIES: Record<string, string> = {
  "Amiri": "Amiri:ital,wght@0,400;0,700;1,400",
  "Markazi Text": "Markazi+Text:wght@400..700",
  "Aref Ruqaa": "Aref+Ruqaa:wght@400;700",
  "Reem Kufi": "Reem+Kufi:wght@400..700",
  "Noto Kufi Arabic": "Noto+Kufi+Arabic:wght@300..800",
  "El Messiri": "El+Messiri:wght@400..700",
  "Lalezar": "Lalezar",
  "Rakkas": "Rakkas",
  "Katibeh": "Katibeh",
  "Jomhuria": "Jomhuria",
  "Cairo": "Cairo:wght@300..900",
  "Tajawal": "Tajawal:wght@400;700;900",
  "Baloo Bhaijaan 2": "Baloo+Bhaijaan+2:wght@400..800",
  "Playfair Display": "Playfair+Display:ital,wght@0,400..900;1,400..900",
  "Cormorant Garamond": "Cormorant+Garamond:ital,wght@0,400..700;1,400..700",
  "Cinzel": "Cinzel:wght@400..900",
  "Bebas Neue": "Bebas+Neue",
  "Abril Fatface": "Abril+Fatface",
  "Space Grotesk": "Space+Grotesk:wght@300..700",
  "Oswald": "Oswald:wght@300..700",
  "Montserrat": "Montserrat:ital,wght@0,300..900;1,300..900",
  "Inter": "Inter:wght@300..900",
  "Merriweather": "Merriweather:ital,wght@0,300;0,400;0,700;0,900;1,400",
};

const LINK_ID = "plotzy-cover-fonts";

/** Inject the cover font stylesheet once (lazy: designer page only). */
export function ensureCoverFontsLoaded(): void {
  if (typeof document === "undefined") return;
  if (document.getElementById(LINK_ID)) return;
  const families = Object.values(GOOGLE_FAMILIES)
    .map((f) => `family=${f}`)
    .join("&");
  const link = document.createElement("link");
  link.id = LINK_ID;
  link.rel = "stylesheet";
  link.href = `https://fonts.googleapis.com/css2?${families}&display=swap`;
  document.head.appendChild(link);
}

/**
 * Wait for the families used in a design to be ready before rasterizing
 * (html2canvas snapshots whatever is painted; an unloaded font exports
 * as its fallback). Times out quietly — export proceeds either way.
 */
export async function waitForCoverFonts(families: string[], timeoutMs = 4000): Promise<void> {
  if (typeof document === "undefined" || !("fonts" in document)) return;
  const unique = [...new Set(families.filter(Boolean))];
  const loads = unique.flatMap((f) => [
    document.fonts.load(`700 32px "${f}"`),
    document.fonts.load(`400 16px "${f}"`),
  ]);
  await Promise.race([
    Promise.allSettled(loads),
    new Promise((r) => setTimeout(r, timeoutMs)),
  ]);
}

const ARABIC_RE = /[؀-ۿݐ-ݿࢠ-ࣿ]/;

/** Arabic joining breaks under letter-spacing; suppress it for Arabic runs. */
export function isArabicText(text: string | undefined): boolean {
  return !!text && ARABIC_RE.test(text);
}
