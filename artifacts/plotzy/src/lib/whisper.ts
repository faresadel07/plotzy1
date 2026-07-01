// Browser-side speech-to-text using OpenAI Whisper (MIT license).
//
// The model runs entirely on the writer's device via Transformers.js
// (WebAssembly + WebGPU when available). No audio is uploaded to our
// servers, no API keys, no per-request cost.
//
// Model choice: `Xenova/whisper-small` quantised to int8. That size
// (~250 MB unquantised, ~130 MB q8) is the sweet spot between:
//   - Multilingual quality (whisper-tiny/base drop Arabic quality
//     noticeably; small matches human transcription closely enough
//     for dictation into a manuscript).
//   - First-time download budget (users won't tolerate 3 GB for
//     large-v3, and it wouldn't fit in browser memory anyway).
//
// After the first successful load the model is cached by the browser
// in the OPFS-backed cache Transformers.js manages, so subsequent
// dictations start instantly.

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

const MODEL_ID = "Xenova/whisper-small";
// int8 dynamic quantisation keeps quality within ~1% of fp32 on
// speech tasks while halving both download size and memory usage.
const DTYPE = "q8" as const;

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

// Convert a browser-recorded audio Blob (webm/opus, mp4, wav, ...)
// into a mono Float32Array at 16 kHz — Whisper's required input.
// Uses OfflineAudioContext so we can pick the target sample rate
// directly and skip a manual resample pass.
export async function blobToWhisperAudio(blob: Blob): Promise<Float32Array> {
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
  } finally {
    await decodeCtx.close();
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
