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

/** Anthropic Claude. A 4-armed starburst with smaller diagonal rays,
 *  the same vocabulary as the published Anthropic mark. */
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
      <path
        d="M12 1.5C12.6 6.4 13.1 7.6 15.1 8.9C17.1 10.2 18.4 10.7 22.5 11.4C18.4 12.1 17.1 12.7 15.1 14C13.1 15.3 12.6 16.5 12 22.5C11.4 16.5 10.9 15.3 8.9 14C6.9 12.7 5.6 12.1 1.5 11.4C5.6 10.7 6.9 10.2 8.9 8.9C10.9 7.6 11.4 6.4 12 1.5Z"
        fill={color}
      />
      <path
        d="M19.5 3.5C19.8 5.2 20 5.7 20.7 6.4C21.4 7.1 21.9 7.3 23.5 7.6C21.9 7.9 21.4 8.1 20.7 8.8C20 9.5 19.8 10 19.5 11.7C19.2 10 19 9.5 18.3 8.8C17.6 8.1 17.1 7.9 15.5 7.6C17.1 7.3 17.6 7.1 18.3 6.4C19 5.7 19.2 5.2 19.5 3.5Z"
        fill={color}
        opacity={0.7}
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

/** Google Gemini. The 4-pointed diamond gem with the signature blue
 *  and violet split. Two overlapping diamonds for the gradient feel. */
export function GeminiIcon({ size = 16, color, style }: IconProps) {
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
        <linearGradient id="gemini-grad" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#4285F4" />
          <stop offset="50%" stopColor="#9B72CB" />
          <stop offset="100%" stopColor="#D96570" />
        </linearGradient>
      </defs>
      <path
        d="M12 1.5C12.5 6 13.5 7.5 16 9C18.5 10.5 20 11 22.5 11.5C20 12 18.5 12.5 16 14C13.5 15.5 12.5 17 12 22.5C11.5 17 10.5 15.5 8 14C5.5 12.5 4 12 1.5 11.5C4 11 5.5 10.5 8 9C10.5 7.5 11.5 6 12 1.5Z"
        fill={color ?? "url(#gemini-grad)"}
      />
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
