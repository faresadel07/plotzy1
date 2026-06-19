// Brand icons for the four model chips, plus the Plotzy Studio mark
// used by the floating button. Hand-drawn inline SVG, no external icon
// library. Each component accepts size and color; defaults are tuned
// for the 16px chip slot.

import type { CSSProperties } from "react";
import * as React from "react";

interface IconProps {
  size?: number;
  color?: string;
  style?: CSSProperties;
}

/** Claude (Anthropic). Inspired by Anthropic's visual vocabulary:
 *  a stylised 4-petal mark with curved blades meeting at the centre.
 *  Drawn from scratch as a recognisable family-resemblance mark, not
 *  a pixel copy of the trademarked logo. */
export function ClaudeIcon({ size = 16, color = "#D97757", style }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      style={style}
      aria-hidden
    >
      {/* Four curved petals/blades meeting at center, the
          characteristic Anthropic vocabulary. Each blade is a single
          smooth path with concave inner curves. */}
      <path
        d="M12 2.5C12.4 8 13 9.2 14.6 10.4C16.2 11.6 17.6 12 21.5 12.5C17.6 13 16.2 13.4 14.6 14.6C13 15.8 12.4 17 12 22.5C11.6 17 11 15.8 9.4 14.6C7.8 13.4 6.4 13 2.5 12.5C6.4 12 7.8 11.6 9.4 10.4C11 9.2 11.6 8 12 2.5Z"
        fill={color}
      />
    </svg>
  );
}

/** OpenAI GPT. The hexagonal petal mandala. Six interlocking petals
 *  around a centre, the unmistakable OpenAI mark. */
export function GPTIcon({ size = 16, color = "#10A37F", style }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      style={style}
      aria-hidden
    >
      <path
        d="M22.3 9.86c.54-1.61.36-3.37-.5-4.85a5.31 5.31 0 0 0-5.71-2.55A5.32 5.32 0 0 0 7.3 4.78a5.31 5.31 0 0 0-3.55 2.57 5.32 5.32 0 0 0 .65 6.24 5.31 5.31 0 0 0 .5 4.85 5.32 5.32 0 0 0 5.71 2.55 5.31 5.31 0 0 0 8.79-1.32 5.31 5.31 0 0 0 3.55-2.57 5.32 5.32 0 0 0-.65-6.24Zm-7.92 11.07a3.94 3.94 0 0 1-2.53-.92l.13-.07 4.2-2.42a.68.68 0 0 0 .35-.6v-5.92l1.78 1.03a.06.06 0 0 1 .03.05v4.9a3.96 3.96 0 0 1-3.96 3.95Zm-8.5-3.63a3.93 3.93 0 0 1-.47-2.65l.13.08 4.2 2.42a.68.68 0 0 0 .69 0l5.13-2.96v2.05a.06.06 0 0 1-.03.05L11.31 18.7a3.96 3.96 0 0 1-5.43-1.4ZM4.77 8.51a3.95 3.95 0 0 1 2.06-1.73v4.99a.68.68 0 0 0 .34.6l5.1 2.95-1.77 1.02a.06.06 0 0 1-.06 0L6.2 13.9a3.96 3.96 0 0 1-1.44-5.39Zm14.62 3.4-5.13-2.97 1.77-1.02a.06.06 0 0 1 .06 0l4.24 2.45a3.95 3.95 0 0 1-.6 7.13v-4.99a.69.69 0 0 0-.35-.6Zm1.77-2.66-.13-.08-4.2-2.42a.68.68 0 0 0-.69 0L11.01 9.7V7.66a.06.06 0 0 1 .03-.05L15.27 5.16a3.96 3.96 0 0 1 5.89 4.09Zm-11.14 3.65L8.24 11.87a.06.06 0 0 1-.03-.05V6.93a3.96 3.96 0 0 1 6.49-3.04l-.13.07-4.2 2.42a.68.68 0 0 0-.35.6Zm.97-2.09 2.28-1.32 2.29 1.32v2.64L13.27 14.5l-2.29-1.32Z"
        fill={color}
      />
    </svg>
  );
}

/** Gemini (Google). Inspired by the Gemini visual vocabulary: a
 *  4-pointed star/spark with sharper, more elegant tapered points
 *  and the signature blue-to-violet-to-pink gradient. Distinct from
 *  Claude's softer 4-petal mark. */
export function GeminiIcon({ size = 16, color, style }: IconProps) {
  // Generate a unique gradient id per instance so multiple Gemini
  // icons on the page don't collide with one another.
  const gradId = React.useId();
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      style={style}
      aria-hidden
    >
      <defs>
        <linearGradient id={gradId} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#4796E3" />
          <stop offset="45%" stopColor="#7C5BC9" />
          <stop offset="100%" stopColor="#E1547D" />
        </linearGradient>
      </defs>
      {/* Sharp 4-pointed spark with tapered points, the Gemini
          vocabulary. Pointier than the Claude mark by design. */}
      <path
        d="M12 1L13.4 9.2C13.6 10.2 14.4 11 15.4 11.2L23 12L15.4 12.8C14.4 13 13.6 13.8 13.4 14.8L12 23L10.6 14.8C10.4 13.8 9.6 13 8.6 12.8L1 12L8.6 11.2C9.6 11 10.4 10.2 10.6 9.2L12 1Z"
        fill={color ?? `url(#${gradId})`}
      />
    </svg>
  );
}

/** Cerebras. Inspired by Cerebras's chip-design vocabulary: a
 *  concentric hexagonal mark that hints at a wafer-scale processor.
 *  Drawn from scratch, not a copy of the trademarked logo. */
export function CerebrasIcon({ size = 16, color = "#F87171", style }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      style={style}
      aria-hidden
    >
      {/* Outer hexagon outline */}
      <path
        d="M12 2L20.5 7V17L12 22L3.5 17V7L12 2Z"
        stroke={color}
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
      {/* Inner core dot */}
      <circle cx="12" cy="12" r="3" fill={color} />
    </svg>
  );
}

/** Meta Llama. The Meta infinity ribbon, stylised as a single
 *  continuous curve. */
export function LlamaIcon({ size = 16, color = "#1877F2", style }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      style={style}
      aria-hidden
    >
      <path
        d="M3.5 12c0-2.6 2.1-4.5 4.5-4.5 1.8 0 3 .9 4 2.1 1-1.2 2.2-2.1 4-2.1 2.4 0 4.5 1.9 4.5 4.5 0 1.4-.5 2.5-1.3 3.3-.8.8-1.9 1.2-3.2 1.2-1.8 0-3-1-4-2.2-1 1.2-2.2 2.2-4 2.2-1.3 0-2.4-.4-3.2-1.2C4 14.5 3.5 13.4 3.5 12Zm6.5 2.5c1.2 0 1.8-.9 2.4-2-.6-1.1-1.2-2-2.4-2-.7 0-1.4.3-1.8.7-.4.4-.7.9-.7 1.8 0 .8.3 1.4.7 1.8.4.4 1 .7 1.8.7Zm5.8 0c.8 0 1.4-.3 1.8-.7.4-.4.7-1 .7-1.8 0-.9-.3-1.4-.7-1.8-.4-.4-1.1-.7-1.8-.7-1.2 0-1.8.9-2.4 2 .6 1.1 1.2 2 2.4 2Z"
        fill={color}
      />
    </svg>
  );
}

/** The Plotzy Studio mark. Used in the floating action button and as
 *  the empty-state hero. A simple two-stroke spark, hand-drawn so the
 *  brand stays distinct from any single AI provider's mark. */
export function StudioIcon({ size = 18, color = "#fff", style }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      style={style}
      aria-hidden
    >
      {/* Main 4-point spark */}
      <path
        d="M12 2.5L13.2 10.8L21.5 12L13.2 13.2L12 21.5L10.8 13.2L2.5 12L10.8 10.8L12 2.5Z"
        fill={color}
      />
      {/* Smaller secondary spark, top right, gives the mark its
          two-stroke character */}
      <path
        d="M18 4L18.5 6.5L21 7L18.5 7.5L18 10L17.5 7.5L15 7L17.5 6.5L18 4Z"
        fill={color}
        opacity={0.65}
      />
    </svg>
  );
}

/** Map a provider id to its icon component. Used by the model chips
 *  and per-message attribution headers. */
import type { ProviderId } from "./types";

const ICON_MAP: Record<ProviderId, (props: IconProps) => React.JSX.Element> = {
  claude: ClaudeIcon,
  gpt: GPTIcon,
  gemini: GeminiIcon,
  cerebras: CerebrasIcon,
  llama: LlamaIcon,
};

export function ProviderIcon({
  providerId,
  size = 16,
  color,
  style,
}: { providerId: ProviderId } & IconProps) {
  const Cmp = ICON_MAP[providerId];
  if (!Cmp) return null;
  return <Cmp size={size} color={color} style={style} />;
}
