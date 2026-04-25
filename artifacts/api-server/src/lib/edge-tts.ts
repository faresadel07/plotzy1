// Edge TTS — free, unlimited Microsoft Neural voices via the same
// internal API the Edge browser uses. Replaces the OpenAI TTS path
// because the user's OpenAI-compatible key is actually a Groq key, and
// Groq does not offer TTS at all (the model "tts-1" returns 404).
//
// Edge TTS:
//   - No account, no API key, no quota
//   - Neural voice quality (same as Microsoft 365's read-aloud)
//   - 70+ languages, multiple Arabic dialects (Saudi/Egyptian/Jordanian/etc.)
//   - Returns audio/mpeg (MP3) — directly streamable / saveable
//   - Unofficial library; works because it impersonates Edge browser
//     traffic. Microsoft has not blocked it for 2+ years.
//
// We expose the SAME 10 voice names the OpenAI integration used (nova,
// alloy, echo, etc.) plus 6 Arabic neural voices. Each maps to a real
// Edge voice id. Frontend voice picker keeps working unchanged.

// `msedge-tts` is the maintained Node port. Use a relaxed import shape
// because the package ships both default and named exports across
// versions; this works with either.
// @ts-ignore — package types lag the runtime API in some versions
import { MsEdgeTTS, OUTPUT_FORMAT } from "msedge-tts";
import { Readable } from "stream";

/* ── Voice catalogue ──────────────────────────────────────────────── */

// Personality → Edge neural voice id. Picks lean toward the closest
// vocal feel of each OpenAI counterpart so the existing UI labels
// ("Warm & Upbeat", "Deep & Authoritative", …) still describe them
// truthfully.
const VOICE_MAP: Record<string, string> = {
  // OpenAI personality slots
  nova:    "en-US-AriaNeural",     // Warm & upbeat young female
  alloy:   "en-US-GuyNeural",      // Versatile male
  ash:     "en-US-DavisNeural",    // Warm engaging male
  ballad:  "en-US-JennyNeural",    // Expressive female
  coral:   "en-US-SaraNeural",     // Clear & warm female
  echo:    "en-US-RogerNeural",    // Resonant clear male
  fable:   "en-GB-RyanNeural",     // British storyteller male
  onyx:    "en-US-AndrewNeural",   // Deep authoritative male
  sage:    "en-US-EmmaNeural",     // Calm thoughtful female
  shimmer: "en-US-MichelleNeural", // Light feminine

  // Curated Arabic voices (added — UI now shows them too)
  "ar-zariyah": "ar-SA-ZariyahNeural", // Saudi female
  "ar-hamed":   "ar-SA-HamedNeural",   // Saudi male
  "ar-salma":   "ar-EG-SalmaNeural",   // Egyptian female
  "ar-shakir":  "ar-EG-ShakirNeural",  // Egyptian male
  "ar-sana":    "ar-JO-SanaNeural",    // Jordanian female
  "ar-taim":    "ar-JO-TaimNeural",    // Jordanian male
};

export const SUPPORTED_VOICES = Object.keys(VOICE_MAP);

export interface SynthesizeOptions {
  text: string;
  /** A key from VOICE_MAP. Falls back to "nova" when unknown. */
  voice?: string;
  /** Multiplier on speech rate. 1.0 = default, 0.5 = half speed, 2.0 = double. */
  speed?: number;
}

/* ── Synthesis primitive ──────────────────────────────────────────── */

// Synthesize one chunk of text → MP3 buffer. Edge TTS opens a websocket,
// streams audio back, closes when the message ends. We collect the
// chunks into a single buffer.
export async function synthesizeToMp3(opts: SynthesizeOptions): Promise<Buffer> {
  const voiceId = VOICE_MAP[opts.voice ?? "nova"] ?? VOICE_MAP.nova;
  const safeSpeed = Math.max(0.5, Math.min(2.0, Number(opts.speed) || 1.0));

  // Edge TTS expresses rate as a percentage delta (e.g. +25% / -10%).
  // Convert multiplier → SSML rate string the library accepts.
  const ratePct = Math.round((safeSpeed - 1) * 100);
  const rate = (ratePct >= 0 ? `+${ratePct}` : `${ratePct}`) + "%";

  const tts = new MsEdgeTTS();
  await tts.setMetadata(voiceId, OUTPUT_FORMAT.AUDIO_24KHZ_48KBITRATE_MONO_MP3);

  const stream: Readable = tts.toStream(opts.text, { rate }).audioStream;
  const chunks: Buffer[] = [];
  for await (const chunk of stream) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  return Buffer.concat(chunks);
}

/* ── Long-form helper ─────────────────────────────────────────────── */

// Edge accepts much longer inputs than OpenAI (no documented hard cap)
// but very long prompts hold the websocket open for a long time and any
// dropped frame cascades. Splitting at sentence boundaries every ~3000
// chars matches the rhythm we used for OpenAI and stays under any
// silent server-side timeout.
const SEGMENT_TARGET = 3000;

export function splitForTts(text: string): string[] {
  const segments: string[] = [];
  let remaining = text.trim();
  while (remaining.length > 0) {
    if (remaining.length <= SEGMENT_TARGET) {
      segments.push(remaining);
      break;
    }
    let splitAt = remaining.lastIndexOf(". ", SEGMENT_TARGET);
    if (splitAt < SEGMENT_TARGET / 2) splitAt = SEGMENT_TARGET;
    segments.push(remaining.slice(0, splitAt + 1).trim());
    remaining = remaining.slice(splitAt + 1).trim();
  }
  return segments;
}
