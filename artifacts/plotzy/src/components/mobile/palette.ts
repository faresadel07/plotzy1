// The warm literary palette for the mobile home (Faris approved the
// COLORS of the Sudowrite study, not its layout: same shelves, new
// skin). Light paper page, espresso-brown dark surfaces, ink text.
// One place so every mobile component stays in tune.

export const PAPER = "#f4efe2";        // page background
export const PAPER_CARD = "#fffdf7";   // raised light card
export const INK = "#2f2618";          // headings
export const INK_SOFT = "#423521";     // body text
export const MUTED = "#7b7366";        // secondary text on paper
export const ESPRESSO = "#292115";     // dark banners and sheets
export const PAPER_ON_DARK = "#f7f2e4";            // headings on espresso
export const PAPER_ON_DARK_SOFT = "rgba(244,239,226,0.62)"; // body on espresso
export const BORDER_INK = "rgba(66,53,33,0.15)";   // hairlines on paper
export const BORDER_PAPER = "rgba(244,239,226,0.14)"; // hairlines on espresso

/* Barely-there ink-dust dot grid, the paper texture. */
export const SPECKLE: React.CSSProperties = {
  backgroundImage:
    "radial-gradient(rgba(66,53,33,0.06) 1px, transparent 1.3px), radial-gradient(rgba(66,53,33,0.04) 1px, transparent 1.2px)",
  backgroundSize: "26px 26px, 34px 34px",
  backgroundPosition: "0 0, 13px 17px",
};
