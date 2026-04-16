/**
 * Lazy-load editor fonts. Called once when the chapter editor mounts.
 * Keeps 40+ fonts out of the critical path so every other page loads fast
 * and avoids layout shift from font-display: swap.
 */

let loaded = false;

const EDITOR_FONTS_URL =
  "https://fonts.googleapis.com/css2?" +
  [
    "family=Architects+Daughter",
    "family=Amiri:ital,wght@0,400;0,700;1,400;1,700",
    "family=Caveat:wght@400..700",
    "family=Comfortaa:wght@300..700",
    "family=Cormorant+Garamond:ital,wght@0,300;0,400;0,500;0,600;0,700;1,300;1,400;1,500;1,600;1,700",
    "family=Courier+Prime:ital,wght@0,400;0,700;1,400;1,700",
    "family=Crimson+Text:ital,wght@0,400;0,600;0,700;1,400;1,600;1,700",
    "family=DM+Sans:ital,opsz,wght@0,9..40,100..1000;1,9..40,100..1000",
    "family=EB+Garamond:ital,wght@0,400..800;1,400..800",
    "family=Fira+Code:wght@300..700",
    "family=Geist+Mono:wght@100..900",
    "family=Geist:wght@100..900",
    "family=IBM+Plex+Mono:ital,wght@0,100;0,200;0,300;0,400;0,500;0,600;0,700;1,100;1,200;1,300;1,400;1,500;1,600;1,700",
    "family=IBM+Plex+Sans:ital,wght@0,100..700;1,100..700",
    "family=JetBrains+Mono:ital,wght@0,100..800;1,100..800",
    "family=Lexend:wght@100..900",
    "family=Libre+Baskerville:ital,wght@0,400;0,700;1,400",
    "family=Lobster",
    "family=Lora:ital,wght@0,400..700;1,400..700",
    "family=Merriweather:ital,opsz,wght@0,18..144,300..900;1,18..144,300..900",
    "family=Montserrat:ital,wght@0,100..900;1,100..900",
    "family=Noto+Naskh+Arabic:wght@400..700",
    "family=Nunito:ital,wght@0,200..1000;1,200..1000",
    "family=Open+Sans:ital,wght@0,300..800;1,300..800",
    "family=Oswald:wght@200..700",
    "family=Outfit:wght@100..900",
    "family=Oxanium:wght@200..800",
    "family=Pacifico",
    "family=Plus+Jakarta+Sans:ital,wght@0,200..800;1,200..800",
    "family=Poppins:ital,wght@0,100;0,200;0,300;0,400;0,500;0,600;0,700;0,800;0,900;1,100;1,200;1,300;1,400;1,500;1,600;1,700;1,800;1,900",
    "family=Raleway:ital,wght@0,100..900;1,100..900",
    "family=Roboto+Mono:ital,wght@0,100..700;1,100..700",
    "family=Roboto:ital,wght@0,100..900;1,100..900",
    "family=Source+Code+Pro:ital,wght@0,200..900;1,200..900",
    "family=Source+Serif+4:ital,opsz,wght@0,8..60,200..900;1,8..60,200..900",
    "family=Space+Grotesk:wght@300..700",
    "family=Space+Mono:ital,wght@0,400;0,700;1,400;1,700",
    "family=Special+Elite",
  ].join("&") +
  "&display=swap";

export function loadEditorFonts(): void {
  if (loaded) return;
  loaded = true;

  const link = document.createElement("link");
  link.rel = "stylesheet";
  link.href = EDITOR_FONTS_URL;
  document.head.appendChild(link);
}
