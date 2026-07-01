// Browser-side speech-to-text using OpenAI Whisper (MIT license).
//
// The model runs entirely on the writer's device via Transformers.js
// (WebAssembly + WebGPU when available). No audio is uploaded to our
// servers, no API keys, no per-request cost.
//
// Model choice: `onnx-community/whisper-base` with per-part dtypes.
//
// History:
//   1. Started on Xenova/whisper-small q8. Failed with ERROR_CODE 1 —
//      "TransposeDQWeightsForMatMulNBits Missing required scale". The
//      quantised .onnx was exported without the per-channel scale
//      tensor its MatMulNBits kernel needs.
//   2. Fell back to Xenova/whisper-base at a global fp32 dtype. Still
//      failed with the SAME error, because passing dtype as a bare
//      string doesn't cover every sub-file: Transformers.js pattern-
//      matches "decoder_model_merged" separately and can still land
//      on the buggy quantised export.
//
// Fix that actually works: switch to the onnx-community re-exports
// (Xenova's models are being deprecated in favour of these) and
// specify dtype per sub-module. The community docs explicitly warn
// that decoder_model_merged fp16 is broken; q4 and fp32 are the
// blessed options. q4 loads cleanly and is much smaller than fp32
// for the decoder.

import {
  pipeline,
  env,
  type AutomaticSpeechRecognitionPipeline,
  type ProgressCallback as HfProgressCallback,
} from "@huggingface/transformers";

// Transformers.js defaults to loading from Hugging Face's CDN and
// caching in IndexedDB. Explicit here so nobody wonders where the
// models come from.
env.allowLocalModels = false;

const MODEL_ID = "onnx-community/whisper-base";
// Per-module dtype. Encoder in fp32 (small; fp16 wobbly on some
// Chromium versions), decoder in q4 (the recommended quantisation
// that has clean per-channel scales, unlike q8). Combined download
// is ~85 MB, actually smaller than the Xenova/whisper-small q8 we
// started with.
const DTYPE = {
  encoder_model: "fp32",
  decoder_model_merged: "q4",
} as const;

// UI language codes -> Whisper language names.
const LANGUAGE_MAP: Record<string, string> = {
  ar: "arabic",
  en: "english",
  fr: "french",
  es: "spanish",
  de: "german",
  it: "italian",
  pt: "portuguese",
  nl: "dutch",
  ru: "russian",
  ja: "japanese",
  zh: "chinese",
  ko: "korean",
  tr: "turkish",
  hi: "hindi",
  ur: "urdu",
  fa: "persian",
  he: "hebrew",
};

function whisperLanguage(uiLang: string): string {
  const key = (uiLang || "").split(/[-_]/)[0].toLowerCase();
  return LANGUAGE_MAP[key] ?? "english";
}

// The pipeline is expensive to construct, so we cache the promise
// module-wide. Callers get the same instance and Transformers.js
// dedupes concurrent loads.
let pipelinePromise: Promise<AutomaticSpeechRecognitionPipeline> | null = null;

export interface WhisperProgress {
  status: "downloading" | "loading" | "ready" | "progress";
  loaded?: number;
  total?: number;
  progress?: number; // 0..1
  file?: string;
}

export function loadWhisper(
  onProgress?: (p: WhisperProgress) => void,
): Promise<AutomaticSpeechRecognitionPipeline> {
  if (!pipelinePromise) {
    const hfCallback: HfProgressCallback = (info) => {
      if (!onProgress) return;
      const anyInfo = info as unknown as {
        status: string;
        file?: string;
        loaded?: number;
        total?: number;
        progress?: number;
      };
      if (anyInfo.status === "progress") {
        onProgress({
          status: "downloading",
          file: anyInfo.file,
          loaded: anyInfo.loaded,
          total: anyInfo.total,
          progress: anyInfo.total ? (anyInfo.loaded ?? 0) / anyInfo.total : anyInfo.progress,
        });
      } else if (anyInfo.status === "download" || anyInfo.status === "initiate") {
        onProgress({ status: "downloading", file: anyInfo.file, progress: 0 });
      } else if (anyInfo.status === "done" || anyInfo.status === "ready") {
        onProgress({ status: "loading", progress: 1 });
      }
    };

    pipelinePromise = pipeline("automatic-speech-recognition", MODEL_ID, {
      dtype: DTYPE,
      progress_callback: hfCallback,
    }).then((p) => {
      onProgress?.({ status: "ready", progress: 1 });
      return p as AutomaticSpeechRecognitionPipeline;
    }).catch((err) => {
      // Reset so the next attempt re-tries the download.
      pipelinePromise = null;
      throw err;
    });
  }
  return pipelinePromise;
}

// Minimum viable recording payload. Anything smaller almost certainly
// means MediaRecorder never wrote container headers (writer released
// the mic button too fast) — decodeAudioData throws an opaque
// "Unable to decode" for those, which reads as "the app is broken"
// rather than "hold the button longer".
const MIN_RECORDING_BYTES = 2_000;

// Convert a browser-recorded audio Blob (webm/opus, mp4, wav, ...)
// into a mono Float32Array at 16 kHz — Whisper's required input.
// Uses OfflineAudioContext so we can pick the target sample rate
// directly and skip a manual resample pass.
export async function blobToWhisperAudio(blob: Blob): Promise<Float32Array> {
  if (!blob || blob.size === 0) {
    throw new Error("EMPTY_RECORDING: microphone captured no audio");
  }
  if (blob.size < MIN_RECORDING_BYTES) {
    throw new Error(`SHORT_RECORDING: only ${blob.size} bytes captured — hold the mic longer`);
  }

  const arrayBuffer = await blob.arrayBuffer();
  // We need a real (online) AudioContext to decode the codec, then an
  // OfflineAudioContext to resample to 16 kHz. Some browsers refuse
  // to instantiate an AudioContext with sampleRate = 16000 directly,
  // so we always resample.
  const AudioCtxCtor = (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext) as typeof AudioContext;
  const decodeCtx = new AudioCtxCtor();
  let decoded: AudioBuffer;
  try {
    decoded = await decodeCtx.decodeAudioData(arrayBuffer.slice(0));
  } catch (err) {
    // Wrap with the blob's mime + size so the outer toast can say
    // something more useful than "decode failed".
    const msg = err instanceof Error ? err.message : String(err);
    throw new Error(`DECODE_FAILED: type=${blob.type || "?"} size=${blob.size} — ${msg}`);
  } finally {
    try { await decodeCtx.close(); } catch { /* noop */ }
  }

  if (!decoded || decoded.duration < 0.15) {
    throw new Error(`SHORT_RECORDING: audio duration ${decoded?.duration ?? 0}s — hold the mic longer`);
  }

  const targetSampleRate = 16_000;
  const OfflineCtxCtor = (window.OfflineAudioContext || (window as unknown as { webkitOfflineAudioContext: typeof OfflineAudioContext }).webkitOfflineAudioContext) as typeof OfflineAudioContext;
  const offline = new OfflineCtxCtor(
    1,
    Math.ceil(decoded.duration * targetSampleRate),
    targetSampleRate,
  );
  const source = offline.createBufferSource();
  source.buffer = decoded;

  // Downmix multichannel to mono via a ChannelMerger fed by a
  // ChannelSplitter. Simpler: rely on the destination being mono —
  // Web Audio automatically averages channels when downmixing.
  source.connect(offline.destination);
  source.start(0);

  const rendered = await offline.startRendering();
  return rendered.getChannelData(0).slice();
}

export interface TranscribeOptions {
  language: string;
  onProgress?: (p: WhisperProgress) => void;
}

export async function transcribe(
  blob: Blob,
  { language, onProgress }: TranscribeOptions,
): Promise<string> {
  const pipe = await loadWhisper(onProgress);
  const audio = await blobToWhisperAudio(blob);
  // Chunk long recordings (> 30s) so Whisper can process them without
  // OOM. 30s window with 5s stride is the recommended default.
  const output = await pipe(audio, {
    language: whisperLanguage(language),
    task: "transcribe",
    chunk_length_s: 30,
    stride_length_s: 5,
    return_timestamps: false,
  } as unknown as Record<string, unknown>);
  if (Array.isArray(output)) {
    return output.map((o) => (o as { text?: string }).text ?? "").join(" ").trim();
  }
  return String((output as { text?: string }).text ?? "").trim();
}

// Whether the browser can plausibly run Whisper. Skip WebAssembly
// check — every mainstream browser has had WASM since 2017. Just
// make sure we're in a document context.
export function isWhisperSupported(): boolean {
  return typeof window !== "undefined"
    && typeof window.AudioContext !== "undefined"
    && typeof MediaRecorder !== "undefined";
}
