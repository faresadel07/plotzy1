// Piper TTS — self-hosted, free, neural-quality text-to-speech.
// Replaces the previous Edge TTS path. We spawn `python -m piper`
// once per synthesis call (B.1 design — see follow-up batches for the
// long-lived-worker optimization).
//
// Audio pipeline:
//   text → Python piper (stdin) → WAV (stdout) → ffmpeg → MP3 (stdout)
//
// Voice models live in artifacts/api-server/voices/. They are NOT
// committed to git (see voices/.gitignore + voices/README.md). For
// local dev, run the curl loop in voices/README.md to fetch them.
// In production, the Dockerfile fetches them at build time (deferred
// to the Docker batch).

import { spawn } from "child_process";
import { existsSync } from "fs";
import path from "path";
import { fileURLToPath } from "url";
import ffmpegStatic from "ffmpeg-static";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// voices/ lives at artifacts/api-server/voices/. The relative path
// from this file changes between dev (tsx) and production (esbuild
// bundled to dist/index.mjs):
//   - dev:  __dirname = src/lib/ → ../../voices ✓
//   - prod: __dirname = dist/    → ../voices    ✓
// Try the bundled (prod) layout first; fall back to the source layout
// for local dev. Same pattern as services/certificate-pdf.ts and
// lib/data-export-pdf.ts.
const VOICES_DIR = (() => {
  const bundled = path.resolve(__dirname, "..", "voices");
  return existsSync(bundled) ? bundled : path.resolve(__dirname, "..", "..", "voices");
})();

const PYTHON_CMD = process.env.PYTHON_BIN || (process.platform === "win32" ? "python" : "python3");

const FFMPEG_PATH = ffmpegStatic;
if (!FFMPEG_PATH) {
  throw new Error("ffmpeg-static did not provide a binary path; reinstall the package");
}

/* ── Voice catalogue ──────────────────────────────────────────────── */

export interface PiperVoice {
  /** Stable ID used in API requests and on disk. */
  id: string;
  /** User-facing display name. */
  displayName: string;
  /** ISO language tag (e.g. "en-US", "ar-JO"). */
  language: string;
  /** "male" | "female" — drives any UI gender filter. */
  gender: "male" | "female" | "neutral";
  /** One-line description shown next to the name in the picker. */
  description: string;
  /** Filename of the .onnx model in voices/ (without extension). */
  modelFile: string;
}

export const PIPER_VOICES: PiperVoice[] = [
  {
    id: "ryan",
    displayName: "Ryan",
    language: "en-US",
    gender: "male",
    description: "American · Warm",
    modelFile: "en_US-lessac-high",
  },
  {
    id: "sophie",
    displayName: "Sophie",
    language: "en-US",
    gender: "female",
    description: "American · Clear",
    modelFile: "en_US-hfc_female-medium",
  },
  {
    id: "jenny",
    displayName: "Jenny",
    language: "en-GB",
    gender: "female",
    description: "British · Storytelling",
    modelFile: "en_GB-jenny_dioco-medium",
  },
  {
    id: "james",
    displayName: "James",
    language: "en-GB",
    gender: "male",
    description: "British · Northern",
    modelFile: "en_GB-northern_english_male-medium",
  },
  {
    id: "kareem",
    displayName: "Kareem",
    language: "ar-JO",
    gender: "male",
    description: "Arabic · Jordanian",
    modelFile: "ar_JO-kareem-medium",
  },
];

const DEFAULT_VOICE_ID = "ryan";

function resolveVoice(voiceId: string | undefined): PiperVoice {
  if (!voiceId) return PIPER_VOICES[0];
  return PIPER_VOICES.find((v) => v.id === voiceId) ?? PIPER_VOICES[0];
}

export interface SynthesizeOptions {
  text: string;
  /** A PiperVoice id. Falls back to "ryan" when unknown. */
  voice?: string;
  /** Multiplier on speech rate. 1.0 = default. Range 0.5–2.0 enforced. */
  speed?: number;
}

/* ── Python piper invocation ─────────────────────────────────────── */

async function runPiper(text: string, voice: PiperVoice, speed: number): Promise<Buffer> {
  // Piper expresses speech rate as `length_scale` where lower = faster.
  // Frontend sends `speed` where higher = faster. Inverse mapping:
  //   speed 2.0 → length_scale 0.5  (faster)
  //   speed 1.0 → length_scale 1.0  (default)
  //   speed 0.5 → length_scale 2.0  (slower)
  const safeSpeed = Math.max(0.5, Math.min(2.0, Number(speed) || 1.0));
  const lengthScale = 1.0 / safeSpeed;

  const modelPath = path.join(VOICES_DIR, `${voice.modelFile}.onnx`);
  const configPath = `${modelPath}.json`;

  // Fail fast with an actionable error if the voice files are missing.
  // Piper otherwise dies with `exited with code null` (signal) and no
  // stderr because onnxruntime / piper-tts segfaults inside __init__
  // before getting a chance to print, which is exactly what happened
  // on the audiobook preview crash we hit on 2026-05-23.
  const fs = await import("fs/promises");
  const fsSync = await import("fs");
  for (const p of [modelPath, configPath]) {
    if (!fsSync.existsSync(p)) {
      throw new Error(
        `piper voice file missing at ${p} (voice id "${voice.id}", model "${voice.modelFile}"). ` +
        `Check the Dockerfile voice download step.`,
      );
    }
  }

  // Piper CLI does not accept text from stdin and "-f -" stdout-streaming
  // crashes the Python wrapper. The only reliable mode is temp files for
  // both input and output, so that's what we do. Files are unique per
  // call (random hex) and removed in finally{}.
  const os = await import("os");
  const crypto = await import("crypto");
  const tmpId = crypto.randomBytes(8).toString("hex");
  const inputPath = path.join(os.tmpdir(), `piper-${tmpId}-in.txt`);
  const outputPath = path.join(os.tmpdir(), `piper-${tmpId}-out.wav`);

  try {
    await fs.writeFile(inputPath, text, "utf-8");

    await new Promise<void>((resolve, reject) => {
      const proc = spawn(
        PYTHON_CMD,
        [
          "-m", "piper",
          "--model", modelPath,
          "--length-scale", lengthScale.toFixed(3),
          "-i", inputPath,
          "-f", outputPath,
        ],
        { stdio: ["ignore", "ignore", "pipe"] },
      );

      const stderrChunks: Buffer[] = [];
      proc.stderr.on("data", (chunk: Buffer) => stderrChunks.push(chunk));
      proc.on("error", (err) => reject(new Error(`Failed to spawn ${PYTHON_CMD} -m piper: ${err.message}`)));
      // Both `code` and `signal` come from Node's child_process callback.
      // When the OS kills the process (SIGKILL from the cgroup OOM-killer
      // is the textbook case on Railway), `code` is null and `signal` is
      // the signal name; without capturing it the error message degrades
      // to "piper exited with code null" and the operator has nothing to
      // act on. Capture both so the next time this fails the cause is
      // obvious from the response toast.
      proc.on("close", (code, signal) => {
        if (code !== 0) {
          const stderr = Buffer.concat(stderrChunks).toString("utf-8").trim();
          const cause = signal
            ? `killed by signal ${signal}`
            : `exited with code ${code}`;
          const hint =
            signal === "SIGKILL"
              ? " (likely OOM — Piper's onnxruntime needs ~250MB; raise the Railway memory plan or use a smaller voice model)"
              : "";
          const detail = stderr ? `: ${stderr.slice(0, 500)}` : "";
          reject(new Error(`piper ${cause}${hint}${detail}`));
          return;
        }
        resolve();
      });
    });

    return await fs.readFile(outputPath);
  } finally {
    // Best-effort cleanup; never block on this.
    fs.unlink(inputPath).catch(() => {});
    fs.unlink(outputPath).catch(() => {});
  }
}

/* ── ffmpeg WAV → MP3 ────────────────────────────────────────────── */

async function wavToMp3(wav: Buffer): Promise<Buffer> {
  return new Promise<Buffer>((resolve, reject) => {
    const args = [
      "-hide_banner",
      "-loglevel", "error",
      "-f", "wav",
      "-i", "pipe:0",
      "-c:a", "libmp3lame",
      "-b:a", "96k",
      "-f", "mp3",
      "pipe:1",
    ];
    const proc = spawn(FFMPEG_PATH!, args, { stdio: ["pipe", "pipe", "pipe"] });
    const out: Buffer[] = [];
    const err: Buffer[] = [];
    proc.stdout.on("data", (c: Buffer) => out.push(c));
    proc.stderr.on("data", (c: Buffer) => err.push(c));
    proc.on("error", (e) => reject(new Error(`ffmpeg spawn error: ${e.message}`)));
    proc.on("close", (code) => {
      if (code !== 0) {
        reject(new Error(`ffmpeg WAV→MP3 exit ${code}: ${Buffer.concat(err).toString().slice(0, 500)}`));
        return;
      }
      resolve(Buffer.concat(out));
    });
    proc.stdin.write(wav);
    proc.stdin.end();
  });
}

/* ── Public API: single-segment synthesis ─────────────────────────── */

/**
 * Synthesize one chunk of text → MP3 buffer.
 * The function does WAV synthesis via Piper, then ffmpeg to MP3 in one
 * pipeline. Caller gets a self-contained MP3.
 *
 * Throws on synthesis failure (invalid model, empty input, Piper crash,
 * etc.). Does NOT silently return zero bytes.
 */
// Audiobook narration pace. Piper's neutral 1.0 reads noticeably
// rushed for long-form listening; audiobook narrators sit ~10-15%
// slower. Arabic needs a touch more room than English.
export function narrationSpeedFor(voiceId?: string): number {
  return voiceId === "kareem" ? 0.82 : 0.88;
}

// One Piper at a time. onnxruntime holds ~250MB per child process;
// two concurrent previews on Railway's small instance OOM the box and
// the edge reports "Application failed to respond". A promise chain
// serializes every synthesis regardless of who asked.
let synthQueue: Promise<unknown> = Promise.resolve();
function enqueue<T>(job: () => Promise<T>): Promise<T> {
  const run = synthQueue.then(job, job);
  synthQueue = run.catch(() => {});
  return run;
}

export async function synthesizeToMp3(opts: SynthesizeOptions): Promise<Buffer> {
  const text = (opts.text ?? "").trim();
  if (!text) {
    throw new Error("synthesizeToMp3: text is empty after trim");
  }
  const voice = resolveVoice(opts.voice ?? DEFAULT_VOICE_ID);
  const wav = await enqueue(() => runPiper(text, voice, opts.speed ?? 1.0));
  if (wav.length < 100) {
    // Piper should always produce at least a WAV header (44 bytes) +
    // some samples. < 100 bytes means something went wrong silently.
    throw new Error(`synthesizeToMp3: piper returned ${wav.length} bytes (truncated or empty WAV)`);
  }
  return wavToMp3(wav);
}

/* ── Public API: long-form chunker ────────────────────────────────── */

const SEGMENT_TARGET = 6000;

/**
 * Split long text into segments at sentence boundaries near
 * SEGMENT_TARGET chars. Used by the export endpoint to keep each
 * Piper invocation bounded.
 */
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

/* ── Public API: ffmpeg concat (replaces broken Buffer.concat) ─── */

/**
 * Merge multiple MP3 buffers into a single playable MP3 file using
 * ffmpeg's concat demuxer. This is the proper way to concatenate
 * MP3s — Buffer.concat() produces a "frankenstein" file that strict
 * players (Windows Media Player, iOS Files) reject.
 *
 * The implementation writes each MP3 as a temp file, builds an ffmpeg
 * concat list, runs `ffmpeg -f concat -safe 0 -i list.txt -c copy out.mp3`,
 * then reads the result back. Stream-only concat without temp files is
 * possible with the `concat` protocol but doesn't work reliably across
 * MP3 streams from independent encoder runs.
 */
export async function concatMp3Buffers(buffers: Buffer[]): Promise<Buffer> {
  if (buffers.length === 0) {
    throw new Error("concatMp3Buffers: no input buffers");
  }
  if (buffers.length === 1) return buffers[0];

  const fs = await import("fs/promises");
  const os = await import("os");
  const crypto = await import("crypto");

  const tmpId = crypto.randomBytes(8).toString("hex");
  const tmpDir = path.join(os.tmpdir(), `plotzy-piper-${tmpId}`);
  await fs.mkdir(tmpDir, { recursive: true });

  try {
    const partFiles: string[] = [];
    for (let i = 0; i < buffers.length; i++) {
      const partPath = path.join(tmpDir, `part-${String(i).padStart(4, "0")}.mp3`);
      await fs.writeFile(partPath, buffers[i]);
      partFiles.push(partPath);
    }

    // ffmpeg concat list format: each line is `file '<absolute-path>'`
    // The `-safe 0` flag allows absolute paths in the list.
    const listPath = path.join(tmpDir, "concat.txt");
    const listContent = partFiles
      .map((p) => `file '${p.replace(/'/g, "'\\''")}'`)
      .join("\n");
    await fs.writeFile(listPath, listContent, "utf-8");

    const outPath = path.join(tmpDir, "merged.mp3");
    await new Promise<void>((resolve, reject) => {
      const proc = spawn(
        FFMPEG_PATH!,
        [
          "-hide_banner",
          "-loglevel", "error",
          "-f", "concat",
          "-safe", "0",
          "-i", listPath,
          "-c", "copy",
          "-y",
          outPath,
        ],
        { stdio: ["ignore", "ignore", "pipe"] },
      );
      const errChunks: Buffer[] = [];
      proc.stderr.on("data", (c: Buffer) => errChunks.push(c));
      proc.on("error", (err) => reject(new Error(`ffmpeg concat spawn: ${err.message}`)));
      proc.on("close", (code) => {
        if (code !== 0) {
          reject(new Error(`ffmpeg concat exit ${code}: ${Buffer.concat(errChunks).toString().slice(0, 500)}`));
          return;
        }
        resolve();
      });
    });

    return await fs.readFile(outPath);
  } finally {
    // Best-effort cleanup; never block on this.
    fs.rm(tmpDir, { recursive: true, force: true }).catch(() => {});
  }
}

/* ── Public API: voice catalogue exposed to /api/voices route ──── */

export function getPiperVoices(): PiperVoice[] {
  return PIPER_VOICES;
}
