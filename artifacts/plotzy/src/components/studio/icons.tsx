// Brand icons for the five model chips, plus the Plotzy Studio mark.
//
// These are visual approximations of widely-known company marks,
// rendered in our own SVG. Used to identify which provider a model
// belongs to (nominative use). No copy of the underlying vector
// artwork is shipped here; each path is drawn from scratch to match
// the recognised silhouette of the brand at small UI sizes.

import type { CSSProperties } from "react";
import * as React from "react";

interface IconProps {
  size?: number;
  color?: string;
  style?: CSSProperties;
}

/** Anthropic Claude. The 4-bladed asterisk used on claude.ai: four
 *  curved petals tapering to sharp points at top, bottom, left, and
 *  right, meeting at a soft centre. Terracotta by default. */
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
        d="M12 1.5 C12.5 7.5 13.2 9.3 14.9 10.6 C16.6 11.9 18.1 12.2 22.5 12 C18.1 11.8 16.6 12.1 14.9 13.4 C13.2 14.7 12.5 16.5 12 22.5 C11.5 16.5 10.8 14.7 9.1 13.4 C7.4 12.1 5.9 11.8 1.5 12 C5.9 12.2 7.4 11.9 9.1 10.6 C10.8 9.3 11.5 7.5 12 1.5 Z"
        fill={color}
      />
    </svg>
  );
}

/** OpenAI GPT. The six-petal blossom / knot used as the OpenAI logo:
 *  six elongated petals rotated around a central axis, each
 *  interlocking with its neighbours. Monochrome by default; many
 *  product contexts tint it the ChatGPT teal. */
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

/** Google Gemini. The four-point sparkle: a sharp 4-point star with
 *  the signature blue-to-purple-to-pink gradient. Distinct from
 *  Claude's softer 4-petal mark by being sharper and gradient-filled. */
export function GeminiIcon({ size = 16, color, style }: IconProps) {
  // Unique gradient id per instance so multiple Gemini icons on the
  // page don't collide.
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
      {/* Sharp 4-point spark, concave between points. The Gemini
          spark vocabulary. */}
      <path
        d="M12 0 C12.6 6.8 13.3 8.7 14.9 10.4 C16.5 12.1 18.5 12 24 12 C18.5 12 16.5 11.9 14.9 13.6 C13.3 15.3 12.6 17.2 12 24 C11.4 17.2 10.7 15.3 9.1 13.6 C7.5 11.9 5.5 12 0 12 C5.5 12 7.5 12.1 9.1 10.4 C10.7 8.7 11.4 6.8 12 0 Z"
        fill={color ?? `url(#${gradId})`}
      />
    </svg>
  );
}

/** Cerebras. A hexagonal wafer outline with four chip dies arranged
 *  inside it: the visual vocabulary Cerebras uses for its wafer-scale
 *  AI processors. */
export function CerebrasIcon({ size = 16, color = "#FF5C35", style }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      style={style}
      aria-hidden
    >
      {/* Outer hexagon (wafer outline) */}
      <path
        d="M12 1.8 L20.6 6.9 L20.6 17.1 L12 22.2 L3.4 17.1 L3.4 6.9 Z"
        stroke={color}
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      {/* Four chip dies, suggesting the wafer-scale grid */}
      <rect x="7.5" y="8.5" width="3.4" height="3" rx="0.4" fill={color} />
      <rect x="13.1" y="8.5" width="3.4" height="3" rx="0.4" fill={color} />
      <rect x="7.5" y="12.5" width="3.4" height="3" rx="0.4" fill={color} />
      <rect x="13.1" y="12.5" width="3.4" height="3" rx="0.4" fill={color} />
    </svg>
  );
}

/** Meta Llama. The Meta infinity ribbon: a single continuous band
 *  that traces a horizontal infinity loop, in Meta's signature blue.
 *  Llama is shipped under the Meta brand. */
export function LlamaIcon({ size = 16, color = "#0866FF", style }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      style={style}
      aria-hidden
    >
      {/* Infinity ribbon — left loop and right loop sharing a centre
          crossing, drawn as a single closed band. */}
      <path
        d="M 6 7.5 C 2.5 7.5 2.5 16.5 6 16.5 C 9 16.5 11 12 12 12 C 13 12 15 7.5 18 7.5 C 21.5 7.5 21.5 16.5 18 16.5 C 15 16.5 13 12 12 12 C 11 12 9 16.5 6 16.5 Z"
        stroke={color}
        strokeWidth="2"
        strokeLinejoin="round"
        fill="none"
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
      <path
        d="M12 2.5L13.2 10.8L21.5 12L13.2 13.2L12 21.5L10.8 13.2L2.5 12L10.8 10.8L12 2.5Z"
        fill={color}
      />
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
